/**
 * agents.gs · v170.23.33 · ۱۸ مهر ۱۴۰۵ · ایجنت‌های کنسول Claude، سمت بات (برد فرآیندها، کار ۵)
 *
 * تعریف ایجنت‌ها در پوشهٔ agents/ مخزن است (دستور کار، مدل، ابزار، سقف خرج) و با `ant apply` در کنسول ساخته می‌شود.
 * دو ایجنت زمان‌بندی خود کنسول را دارند (پایش امنیت شنبه ۸، گزارش هفتگی شنبه ۹)؛ ایجنت سئوی مجله را بات می‌سازد.
 * ایجنت‌ها فقط از رلهٔ ورکر (POST {ورکر}/agent، کلید دوم درگاه در گاوصندوق کنسول) با بات حرف می‌زنند. اکشن‌ها:
 *   agent_data    فقط عدد تجمیعی: uptime (روند زمان پاسخ از «پایش سایت»)، weekly (قیف هفتگی و بقیه)، security_state (فهرست قبلی مدیرها).
 *   agent_report  گزارش ایجنت: security با مشکل ← ناظر و تیم فنی؛ ok ← فقط برای گزارش هفتگی؛ weekly ← ناظر؛ mag_seo ← سردبیر.
 *   seo_log       هر تغییر سئو یک سطر در تب «تغییرات سئو» هاب محتوا.
 * خرج: روزی یک بار جلسه‌های تمام‌شدهٔ کنسول خوانده و در تب «هزینهٔ ایجنت‌ها» ثبت می‌شود (usage.list_cost، بی متن جلسه).
 * سقف ماه ۱۵ دلار: اگر رسید، زمان‌بندی‌ها pause می‌شوند، سئوی تازه ساخته نمی‌شود و ناظر خبر می‌گیرد.
 * کلید API کنسول فقط در Script Property «ANTHROPIC_API_KEY». شناسهٔ ایجنت سئو، محیط و گاوصندوقش در تنظیمات خصوصی بات
 * (AGENT_SEO_ID، AGENT_SEO_ENV، AGENT_SEO_VAULT) و روشن بودن با AGENT_SEO_ENABLED = بله.
 * هیچ نام، شماره یا دادهٔ بالینی به هیچ ایجنتی نمی‌رود. تست: agTests (مجموعهٔ «ایجنت‌های کنسول»).
 */
var AG_API = 'https://api.anthropic.com/v1';
var AG_BETA = 'managed-agents-2026-04-01';
var AG_MONTH_CAP_CENTS = 1500;
var AG_SEO_BUDGET_CENTS = '100';
var AG_COST_TAB = 'هزینهٔ ایجنت‌ها';
var AG_COST_HEAD = ['زمان', 'ایجنت', 'جلسه', 'توکن ورودی', 'توکن خروجی', 'خرج (سنت)', 'ماه'];
var AG_SEO_TAB = 'تغییرات سئو';
var AG_SEO_HEAD = ['زمان', 'شناسهٔ مطلب', 'نوع', 'هدف', 'قبل', 'بعد'];
var AG_ROLE_TECH = 'تیم فنی';

function agDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function agProp_(k, v) {
  if (agDry_()) { if (v !== undefined) TG_MEM['ag:' + k] = v; return TG_MEM['ag:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function agKey_() { return agDry_() ? 'dry' : (PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY') || ''); }
function agFetch_(method, path, body) {
  if (agDry_()) { (TG_MEM['ag:calls'] = TG_MEM['ag:calls'] || []).push({ m: method, p: path, b: body || null }); var h = TG_MEM['ag:resp'] && TG_MEM['ag:resp'][method + ' ' + path.split('?')[0]]; return h || { ok: true, data: {} }; }
  var key = agKey_(); if (!key) return { ok: false, error: 'nokey' };
  var r = UrlFetchApp.fetch(AG_API + path, { method: method, muteHttpExceptions: true, contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-beta': AG_BETA }, payload: body ? JSON.stringify(body) : undefined });
  var code = r.getResponseCode(), j = {}; try { j = JSON.parse(r.getContentText() || '{}'); } catch (e) {}
  return code >= 200 && code < 300 ? { ok: true, data: j } : { ok: false, error: 'http' + code };
}
function agCell_(s, n) { return tgCell_(String(s == null ? '' : s).slice(0, n || 500)); }

/* ───── داده برای ایجنت‌ها (فقط عدد) ───── */
function agUptimeTrend_(rows, now) {
  var day = 86400000, cur = [], prev = [], errs = 0, errsPrev = 0;
  rows.forEach(function (r) {
    var t = r[0] instanceof Date ? r[0].getTime() : 0, age = now - t; if (!t || String(r[1]).indexOf('هشدار') === 0) return;
    var ms = Number(r[3]) || 0, ok = r[4] === 'بله';
    if (age <= 7 * day) { if (ok) cur.push(ms); else errs++; } else if (age <= 14 * day) { if (ok) prev.push(ms); else errsPrev++; }
  });
  var stat = function (a) { if (!a.length) return { n: 0, avg: null, p95: null }; var s = a.slice().sort(function (x, y) { return x - y; }); return { n: a.length, avg: Math.round(s.reduce(function (x, y) { return x + y; }, 0) / s.length), p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] }; };
  return { week: stat(cur), prev_week: stat(prev), errors: errs, errors_prev: errsPrev };
}
function agWeekly_(now) {
  var day = 86400000, out = { leads_by_channel: {}, leads_by_channel_prev: {}, rates: {}, rates_prev: {}, lost: 0, lost_prev: 0 };
  var leads = [];
  try {
    if (agDry_()) leads = TG_MEM['ag:leads'] || [];
    else {
      var sh = tgSS_().getSheetByName(TG_LEADS), last = sh.getLastRow(), hm = tgLeadHeadMap_(sh);
      var v = last > 1 ? sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues() : [];
      var g = function (r, h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : r[i]; };
      leads = v.map(function (r) {
        var st = String(g(r, 'وضعیت') || '').trim(), stN = tgStOf_(st) || st;
        return { t: r[0] instanceof Date ? r[0].getTime() : new Date(String(r[0]) + 'T12:00:00+03:30').getTime(), ch: tgSection_(String(r[2] || ''), '') || 'نامشخص',
          touched: !!String(r[10] || '').trim(), ref: !!String(g(r, 'درمانگر پیشنهادی ۱') || '').trim() || [TG_ST.REF, TG_ST.BOOKED, TG_ST.HELD, TG_ST.START].indexOf(stN) > -1,
          intro: String(g(r, 'معارفه هماهنگ شد؟') || '').trim() === 'بله' || [TG_ST.BOOKED, TG_ST.HELD, TG_ST.START].indexOf(stN) > -1,
          start: stN === TG_ST.START || /بله|شروع/.test(String(g(r, 'شروع درمان؟') || '')), lost: tgStClosed_(st) && stN !== TG_ST.START };
      });
    }
  } catch (e) { tgErr_('agWeekly_', e); }
  var agg = function (from, to, byCh) {
    var L = leads.filter(function (l) { return l.t && now - l.t > from && now - l.t <= to; }), n = L.length;
    L.forEach(function (l) { byCh[l.ch] = (byCh[l.ch] || 0) + 1; });
    var c = function (k) { return L.filter(function (l) { return l[k]; }).length; }, first = c('touched'), ref = c('ref'), intro = c('intro'), start = c('start');
    var pct = function (a, b) { return b ? Math.round(1000 * a / b) / 10 : null; };
    return { rates: { 'لید': n, 'نرخ تماس': pct(first, n), 'نرخ ارجاع': pct(ref, first), 'نرخ معارفه': pct(intro, ref), 'نرخ شروع': pct(start, intro) }, lost: c('lost') };
  };
  var a = agg(-1, 7 * day, out.leads_by_channel), b = agg(7 * day, 14 * day, out.leads_by_channel_prev);
  out.rates = a.rates; out.rates_prev = b.rates; out.lost = a.lost; out.lost_prev = b.lost;
  try { out.overdue_tasks = (typeof opsRows_ === 'function' && opsRows_().filter(opsOpen_).filter(function (t) { return t.dueAt && t.dueAt < now; }).length) || 0; } catch (e2) { out.overdue_tasks = null; }
  try { out.open_change_requests = typeof chgOpen_ === 'function' ? chgOpen_().length : null; } catch (e3) { out.open_change_requests = null; }
  try { out.unread_notices = typeof vnUnread_ === 'function' ? vnUnread_().length : null; } catch (e4) { out.unread_notices = null; }
  out.security_this_week = agProp_('AG_SEC_LAST') || 'گزارشی نرسیده';
  out.agent_cost_cents = agMonthCost_(agMonthKey_(now));
  return out;
}
function agData_(p, dry) {
  if (typeof ebiKey2Ok_ === 'function' && !ebiKey2Ok_(p && p.key)) return { ok: false, error: 'key2_only' };
  var now = Date.now(), kind = String((p && p.kind) || '');
  if (kind === 'uptime') {
    var rows = [];
    try { rows = agDry_() ? (TG_MEM['up:rows'] || []) : (function () { var sh = tgSS_().getSheetByName('پایش سایت'); return sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues() : []; })(); } catch (e) {}
    return { ok: true, data: agUptimeTrend_(rows, now) };
  }
  if (kind === 'weekly') return { ok: true, data: agWeekly_(now) };
  if (kind === 'security_state') return { ok: true, data: { admins: agProp_('AG_SEC_ADMINS') || '' } };
  return { ok: false, error: 'kind' };
}

/* ───── گزارش ایجنت‌ها ───── */
function agTechChats_() {
  var out = []; if (TG_OWNER_CHAT) out.push(String(TG_OWNER_CHAT));
  try { tgPeopleList_().forEach(function (x) { if ((x.roles || []).indexOf(AG_ROLE_TECH) > -1 && x.chat) { var c = String(x.chat).split(/[,،;\s]+/)[0]; if (out.indexOf(c) < 0) out.push(c); } }); } catch (e) {}
  return out;
}
function agReport_(p, dry) {
  if (typeof ebiKey2Ok_ === 'function' && !ebiKey2Ok_(p && p.key)) return { ok: false, error: 'key2_only' };
  var agent = String(p.agent || ''), sev = String(p.severity || 'ok'), text = String(p.text || '').slice(0, 3500);
  if (!text) return { ok: false, error: 'text' };
  if (dry) return { ok: true, data: { would: agent } };
  var esc = tgEsc_(text), n = 0;
  if (agent === 'security') {
    agProp_('AG_SEC_LAST', (sev === 'ok' ? 'سالم' : 'مشکل (' + sev + ')') + ' · ' + text.slice(0, 200));
    if (p.state) agProp_('AG_SEC_ADMINS', String(p.state).slice(0, 2000));
    if (sev !== 'ok') agTechChats_().forEach(function (c) { tgSend_(c, '🛡 <b>پایش امنیت هفتگی · ' + (sev === 'high' ? 'اولویت بالا' : 'اولویت پایین') + '</b>\n\n' + esc); n++; });
  } else if (agent === 'weekly') {
    if (TG_OWNER_CHAT) { tgSend_(TG_OWNER_CHAT, '📊 <b>گزارش هفتگی</b>\n\n' + esc); n++; }
  } else if (agent === 'mag_seo') {
    try { if (typeof pbNotifyEditors_ === 'function') { pbNotifyEditors_('🔎 <b>سئوی مطلب ' + tgEsc_(String(p.post_id || '')) + '</b>\n\n' + esc); n++; } } catch (e) { tgErr_('agReport_', e); }
  } else return { ok: false, error: 'agent' };
  return { ok: true, data: { n: n } };
}
function agSeoLog_(p, dry) {
  if (typeof ebiKey2Ok_ === 'function' && !ebiKey2Ok_(p && p.key)) return { ok: false, error: 'key2_only' };
  var row = [new Date(), agCell_(String(p.post_id || '').replace(/\D/g, ''), 12), agCell_(p.kind, 20), agCell_(p.target, 300), agCell_(p.before, 500), agCell_(p.after, 500)];
  if (dry) return { ok: true, data: { would: 1 } };
  if (agDry_()) { (TG_MEM['ag:seo'] = TG_MEM['ag:seo'] || []).push(row); return { ok: true, data: { n: 1 } }; }
  var ss = typeof pbSS_ === 'function' ? pbSS_('c') : null; if (!ss) return { ok: false, error: 'hub' };
  var sh = ss.getSheetByName(AG_SEO_TAB);
  if (!sh) { sh = ss.insertSheet(AG_SEO_TAB); sh.getRange(1, 1, 1, AG_SEO_HEAD.length).setValues([AG_SEO_HEAD]).setFontWeight('bold'); sh.setFrozenRows(1); sh.setRightToLeft(true); }
  sh.appendRow(row);
  return { ok: true, data: { n: 1 } };
}
/* کلیدهای تنظیمات اختیاری‌اند؛ خالی بودنشان نباید انتشار را متوقف کند (cfgMissing_) */
try { ['AGENT_SEO_ENABLED', 'AGENT_SEO_ID', 'AGENT_SEO_ENV', 'AGENT_SEO_VAULT'].forEach(function (k) { if (CFG_OPTIONAL.indexOf(k) < 0) CFG_OPTIONAL.push(k); }); } catch (eCo) {}
try {
  CFG_NOTE.AGENT_SEO_ENABLED = 'ایجنت سئوی مجله (کنسول Claude) برای هر مطلب تازه: «بله» روشن، خالی یا «خیر» خاموش';
  CFG_NOTE.AGENT_SEO_ID = 'شناسهٔ ایجنت سئوی مجله در کنسول (agent_…)، از claude-lock.json';
  CFG_NOTE.AGENT_SEO_ENV = 'شناسهٔ محیط ایجنت سئو (env_…)، از claude-lock.json';
  CFG_NOTE.AGENT_SEO_VAULT = 'شناسهٔ گاوصندوق ایجنت سئو (vlt_…)، از claude-lock.json';
} catch (eCn) {}
try {
  PB_ACTIONS.agent_data = function (p, dry) { return agData_(p, dry); };
  PB_ACTIONS.agent_report = function (p, dry) { return agReport_(p, dry); };
  PB_ACTIONS.seo_log = function (p, dry) { return agSeoLog_(p, dry); };
  PB_RATE_BUCKET.agent_data = ['agd', 'agent_data_hourly_max', 30];
  PB_RATE_BUCKET.agent_report = ['agr', 'agent_report_hourly_max', 20];
  PB_RATE_BUCKET.seo_log = ['ags', 'seo_log_hourly_max', 80];
  ['agent_report', 'seo_log'].forEach(function (a) { if (PB_WRITE.indexOf(a) < 0) PB_WRITE.push(a); });
} catch (eAg) {}

/* ───── خرج و سقف ماه ───── */
function agMonthKey_(ms) { return Utilities.formatDate(new Date(ms || Date.now()), TG_TZ, 'yyyy-MM'); }
function agCostRows_() {
  if (agDry_()) return TG_MEM['ag:cost'] = TG_MEM['ag:cost'] || [];
  var sh = tgSS_().getSheetByName(AG_COST_TAB); if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, AG_COST_HEAD.length).getValues();
}
function agMonthCost_(mk) { return agCostRows_().filter(function (r) { return String(r[6]) === mk; }).reduce(function (a, r) { return a + (Number(r[5]) || 0); }, 0); }
function agAddCost_(row) {
  if (agDry_()) { agCostRows_().push(row); return; }
  var ss = tgSS_(), sh = ss.getSheetByName(AG_COST_TAB);
  if (!sh) { sh = ss.insertSheet(AG_COST_TAB); sh.getRange(1, 1, 1, AG_COST_HEAD.length).setValues([AG_COST_HEAD]).setFontWeight('bold'); sh.setFrozenRows(1); sh.setRightToLeft(true); }
  sh.appendRow(row);
}
/* روزی یک بار (از tgWatchdog): جلسه‌های تمام‌شده که هنوز ثبت نشده‌اند ← یک سطر خرج؛ بعد سقف ماه */
function agCostTick_() {
  var day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  if (agProp_('AG_COST_DAY') === day || !agKey_()) return 0;
  agProp_('AG_COST_DAY', day);
  var r = agFetch_('get', '/sessions?limit=50');
  if (!r.ok) { tgErr_('agCostTick_', r.error); return 0; }
  var seen = {}; try { seen = JSON.parse(agProp_('AG_COST_SEEN') || '{}'); } catch (e) {}
  var names = {}; try { names = JSON.parse(agProp_('AG_NAMES') || '{}'); } catch (e2) {}
  var n = 0;
  ((r.data && r.data.data) || []).forEach(function (s) {
    if (!s || !s.id || seen[s.id] || s.status === 'running') return;
    var aid = (s.agent && (s.agent.id || s.agent)) || '';
    if (aid && !names[aid]) { var a = agFetch_('get', '/agents/' + aid); names[aid] = (a.ok && a.data && a.data.name) || aid; }
    var u = s.usage || {}, cents = Number((u.list_cost && u.list_cost.amount) || 0);
    agAddCost_([new Date(), String(names[aid] || aid).slice(0, 40), s.id, Number(u.input_tokens) || 0, Number(u.output_tokens) || 0, cents, agMonthKey_()]);
    seen[s.id] = 1; n++;
  });
  var keys = Object.keys(seen); if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(function (k) { delete seen[k]; });
  agProp_('AG_COST_SEEN', JSON.stringify(seen)); agProp_('AG_NAMES', JSON.stringify(names));
  agCapCheck_();
  return n;
}
function agCapCheck_() {
  var mk = agMonthKey_(), spent = agMonthCost_(mk);
  if (spent < AG_MONTH_CAP_CENTS || agProp_('AG_CAP_HIT') === mk) return false;
  agProp_('AG_CAP_HIT', mk);
  var d = agFetch_('get', '/deployments?limit=50'), paused = 0;
  ((d.ok && d.data && d.data.data) || []).forEach(function (x) { if (x.status === 'active' && /^tj-/.test(String(x.name || ''))) { if (agFetch_('post', '/deployments/' + x.id + '/pause', {}).ok) paused++; } });
  if (TG_OWNER_CHAT) tgSend_(TG_OWNER_CHAT, '💸 <b>سقف ماهانهٔ خرج ایجنت‌ها رسید</b>\nخرج این ماه: ' + tgFa_((spent / 100).toFixed(2)) + ' دلار (سقف ۱۵).\n' +
    tgFa_(String(paused)) + ' زمان‌بندی متوقف شد و سئوی خودکار مجله تا ماه بعد ساخته نمی‌شود. برای ادامه، زمان‌بندی‌ها را در کنسول از توقف دربیاورید.');
  return true;
}

/* ───── سئوی مجله: یک جلسه برای هر مطلب تازه (از pbRegisterPost_) ───── */
function agSeoOn_() { return /^(بله|yes|1|true)$/i.test(String(cfg_('AGENT_SEO_ENABLED', '') || '').trim()); }
function agStartSeo_(postId) {
  var id = String(postId || '').replace(/\D/g, '');
  if (!id || !agSeoOn_() || !agKey_()) return '';
  if (agMonthCost_(agMonthKey_()) >= AG_MONTH_CAP_CENTS) return '';
  var aid = String(cfg_('AGENT_SEO_ID', '') || '').trim(), env = String(cfg_('AGENT_SEO_ENV', '') || '').trim(), vault = String(cfg_('AGENT_SEO_VAULT', '') || '').trim();
  if (!/^agent_\w+$/.test(aid) || !/^env_\w+$/.test(env) || !/^vlt_\w+$/.test(vault)) { tgErr_('agStartSeo_', 'شناسهٔ ایجنت، محیط یا گاوصندوق سئو در تنظیمات نیست'); return ''; }
  var s = agFetch_('post', '/sessions', { agent: aid, environment_id: env, vault_ids: [vault], title: 'سئوی مطلب ' + id,
    budget: { type: 'limit', max_list_cost: { amount: AG_SEO_BUDGET_CENTS, currency: 'USD' } } });
  if (!s.ok || !s.data || !s.data.id) { tgErr_('agStartSeo_', s.error || 'no id'); return ''; }
  agFetch_('post', '/sessions/' + s.data.id + '/events', { events: [{ type: 'user.message', content: [{ type: 'text', text: 'شناسهٔ مطلب تازه: ' + id }] }] });
  return s.data.id;
}

function agTests() {
  var pass = 0, fail = 0, text = [];
  function ok(name, c) { if (c) { pass++; text.push('✅ ' + name); } else { fail++; text.push('❌ ' + name); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, out: TG_OUTBOX, own: TG_OWNER_CHAT, k2: typeof ebiKey2Ok_ === 'function' ? ebiKey2Ok_ : null, cfg: TG_CFG_, ed: typeof pbNotifyEditors_ === 'function' ? pbNotifyEditors_ : null };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; TG_OWNER_CHAT = '900';
  ebiKey2Ok_ = function (k) { return k === 'K2'; };
  pbNotifyEditors_ = function (t) { tgSend_('700', t); };
  try {
    TG_MEM['people'] = [{ name: 'فنی نمونه', chat: '950', roles: [AG_ROLE_TECH] }, { name: 'پذیرش نمونه', chat: '951', roles: ['پذیرش'] }];
    ok('بی کلید دوم رد', agData_({ key: 'x', kind: 'uptime' }).error === 'key2_only' && agReport_({ key: 'x', text: 'a' }).error === 'key2_only' && agSeoLog_({ key: 'x' }).error === 'key2_only');
    var now = Date.now(), d = 86400000;
    TG_MEM['up:rows'] = [[new Date(now - d), 'صفحهٔ اصلی', 200, 400, 'بله', '', ''], [new Date(now - 2 * d), 'صفحهٔ اصلی', 200, 600, 'بله', '', ''],
                         [new Date(now - 3 * d), 'شروع تراپی', 0, 15000, 'نه', 'timeout', ''], [new Date(now - 9 * d), 'صفحهٔ اصلی', 200, 300, 'بله', '', '']];
    var up = agData_({ key: 'K2', kind: 'uptime' }).data;
    ok('روند زمان پاسخ: میانگین، خطا و هفتهٔ قبل', up.week.avg === 500 && up.errors === 1 && up.prev_week.avg === 300);
    TG_MEM['ag:leads'] = [{ t: now - d, ch: 'پذیرش', touched: true, ref: true, intro: true, start: false, lost: false }, { t: now - 2 * d, ch: 'مدرسه', touched: false, ref: false, intro: false, start: false, lost: true },
                          { t: now - 8 * d, ch: 'پذیرش', touched: true, ref: false, intro: false, start: false, lost: false }];
    var wk = agData_({ key: 'K2', kind: 'weekly' }).data;
    ok('هفتگی: لید به تفکیک کانال و نرخ‌ها با اسم ثابت', wk.leads_by_channel['پذیرش'] === 1 && wk.leads_by_channel['مدرسه'] === 1 && wk.rates['نرخ تماس'] === 50 && wk.lost === 1 && wk.leads_by_channel_prev['پذیرش'] === 1);
    ok('هفتگی: هیچ نام یا شماره‌ای در داده نیست', JSON.stringify(wk).indexOf('نمونه') < 0);
    TG_OUTBOX = [];
    agReport_({ key: 'K2', agent: 'security', severity: 'ok', text: 'همهٔ چک‌ها سالم' });
    ok('امنیت سالم: پیامی نمی‌رود، برای گزارش هفتگی می‌ماند', !TG_OUTBOX.length && agProp_('AG_SEC_LAST').indexOf('سالم') === 0);
    agReport_({ key: 'K2', agent: 'security', severity: 'high', text: 'گواهی ۱۰ روز دیگر تمام می‌شود', state: '1,7' });
    ok('امنیت با مشکل: ناظر و تیم فنی، نه پذیرش', TG_OUTBOX.some(function (x) { return x.chat === '900'; }) && TG_OUTBOX.some(function (x) { return x.chat === '950'; }) && !TG_OUTBOX.some(function (x) { return x.chat === '951'; }) && agProp_('AG_SEC_ADMINS') === '1,7');
    TG_OUTBOX = []; agReport_({ key: 'K2', agent: 'weekly', text: 'لید: ۱۲' });
    ok('گزارش هفتگی فقط به ناظر', TG_OUTBOX.length === 1 && TG_OUTBOX[0].chat === '900');
    TG_OUTBOX = []; agReport_({ key: 'K2', agent: 'mag_seo', post_id: 55, text: 'سه لینک داخلی' });
    ok('خلاصهٔ سئو به سردبیر', TG_OUTBOX.length === 1 && TG_OUTBOX[0].chat === '700');
    agSeoLog_({ key: 'K2', post_id: '55', kind: 'meta', target: 'title', before: '=x', after: 'عنوان تازه' });
    ok('تغییر سئو ثبت و فرمول خنثی', TG_MEM['ag:seo'].length === 1 && TG_MEM['ag:seo'][0][4] === "'=x");
    /* خرج و سقف */
    TG_MEM['ag:resp'] = { 'get /sessions': { ok: true, data: { data: [{ id: 'sesn_1', status: 'idle', agent: { id: 'agent_a' }, usage: { input_tokens: 1000, output_tokens: 200, list_cost: { amount: '7' } } },
                                                                        { id: 'sesn_2', status: 'running', agent: { id: 'agent_a' }, usage: {} }] } },
                          'get /agents/agent_a': { ok: true, data: { name: 'tj-security-watch' } },
                          'get /deployments': { ok: true, data: { data: [{ id: 'depl_1', name: 'tj-security-watch-weekly', status: 'active' }, { id: 'depl_2', name: 'other', status: 'active' }] } } };
    ok('خرج: فقط جلسهٔ تمام‌شده، یک بار', agCostTick_() === 1 && agCostRows_().length === 1 && agCostRows_()[0][1] === 'tj-security-watch' && agCostRows_()[0][5] === 7);
    TG_MEM['ag:AG_COST_DAY'] = ''; ok('دوباره ثبت نمی‌شود', agCostTick_() === 0 && agCostRows_().length === 1);
    agCostRows_().push([new Date(), 'x', 'sesn_9', 0, 0, 1500, agMonthKey_()]);
    TG_OUTBOX = []; TG_MEM['ag:calls'] = [];
    ok('سقف ۱۵ دلار: فقط زمان‌بندی‌های tj- متوقف و ناظر خبر', agCapCheck_() === true && TG_MEM['ag:calls'].some(function (c) { return c.p === '/deployments/depl_1/pause'; }) && !TG_MEM['ag:calls'].some(function (c) { return c.p === '/deployments/depl_2/pause'; }) && TG_OUTBOX.some(function (x) { return x.chat === '900' && x.text.indexOf('سقف') > -1; }));
    ok('سقف یک بار در ماه خبر می‌دهد', agCapCheck_() === false);
    TG_CFG_ = { AGENT_SEO_ENABLED: 'بله', AGENT_SEO_ID: 'agent_seo1', AGENT_SEO_ENV: 'env_1', AGENT_SEO_VAULT: 'vlt_1' };
    ok('بالای سقف سئوی تازه ساخته نمی‌شود', agStartSeo_(55) === '');
    TG_MEM['ag:cost'] = [];
    TG_MEM['ag:resp']['post /sessions'] = { ok: true, data: { id: 'sesn_seo' } }; TG_MEM['ag:calls'] = [];
    ok('سئو: جلسه با سقف ۱ دلار و پیام شناسهٔ مطلب', agStartSeo_(55) === 'sesn_seo' && TG_MEM['ag:calls'][0].b.budget.max_list_cost.amount === '100' && TG_MEM['ag:calls'][1].p === '/sessions/sesn_seo/events' && JSON.stringify(TG_MEM['ag:calls'][1].b).indexOf('55') > -1);
    TG_CFG_ = { AGENT_SEO_ENABLED: 'خیر' }; ok('خاموش: هیچ', agStartSeo_(56) === '');
  } catch (e) { fail++; text.push('❌ خطا: ' + (e && e.message)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.out; TG_OWNER_CHAT = keep.own; if (keep.k2) ebiKey2Ok_ = keep.k2; TG_CFG_ = keep.cfg; if (keep.ed) pbNotifyEditors_ = keep.ed; }
  return { pass: pass, fail: fail, text: text.join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'agTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['ایجنت‌های کنسول', 'agTests']); } catch (eS) {}
