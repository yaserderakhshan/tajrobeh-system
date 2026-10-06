/**
 * funnel.gs · v170.36 · درگاه‌های ورودی، بند ۵: اندازه‌گیری یکپارچه (چارچوب اسکیل tajrobeh-leadflow)
 *
 * یک طرح رویداد با شناسه‌های مشترک، هم در هاب آمار (تب «رویدادهای قیف») و هم آنالیتیکس:
 *   cta_click        ← کلیک دکمه یا لینک ورود (سایت؛ مرحلهٔ ۲ «اقدام»)
 *   lead_created     ← سطر تازه در «لیدها» (مرحلهٔ ۳ «لید»)
 *   intro_booked     ← وضعیت «معارفه رزرو شد» یا «معارفه هماهنگ شد؟» = بله (مرحلهٔ ۶ «معارفه»)
 *   intro_done       ← «معارفه برگزار شد»
 *   therapy_started  ← «شروع درمان» یا «شروع درمان؟» = بله (مرحلهٔ ۷)
 * سایت cta_click و lead_created را خودش به آنالیتیکس می‌فرستد (502069). سه رویداد بعدی در بات رخ می‌دهند و اگر GA4_MID
 * (تنظیمات) و Script Property «GA4_MP_SECRET» باشد، با Measurement Protocol (شناسهٔ بازدید یا کد لید) به آنالیتیکس هم می‌روند.
 * گزارش هفتگی قیف (شنبه ۹:۳۰): کلیک ← لید ← معارفه ← شروع درمان با نرخ هر مرحله، به تفکیک صفحه، دکمه، کمپین و منبع؛
 * در تب «قیف هفتگی» هاب آمار و پیام صبح یاسر. بیس‌لاین پیش از تغییر: یک‌بارهٔ tgV17036Funnel (تب «بیس‌لاین قیف»).
 * اسم مراجع هیچ‌جا نیست؛ فقط کد لید و شمار.
 */
var FNL_TAB = 'رویدادهای قیف';
var FNL_HEAD = ['زمان', 'رویداد', 'کد لید', 'منبع', 'صفحه', 'دکمه', 'کمپین', 'UTM', 'شناسهٔ بازدید', 'کد start'];
var FNL_WEEK_TAB = 'قیف هفتگی';
var FNL_BASE_TAB = 'بیس‌لاین قیف';
var FNL_EVENTS = ['cta_click', 'lead_created', 'intro_booked', 'intro_done', 'therapy_started'];
var FNL_DIMS = { page: 'صفحه', cta: 'دکمه', campaign: 'کمپین', src: 'منبع' };
cfg_('GA4_MID', '');   /* شناسهٔ اندازه‌گیری GA4 (G-…)؛ رمز Measurement Protocol فقط در Script Property «GA4_MP_SECRET» */

function fnlDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function fnlNow_() { return fnlDry_() && TG_MEM['fnl:now'] ? Number(TG_MEM['fnl:now']) : Date.now(); }
function fnlTab_(name, head) {
  var ss = tgStatSS_(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.setRightToLeft(true); sh.appendRow(head); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
/** یک رویداد قیف: o = {code, src, page, cta, campaign, utm, vid, start} */
function fnlEv_(ev, o) {
  if (FNL_EVENTS.indexOf(ev) < 0) return false;
  o = o || {};
  var row = [new Date(fnlNow_()), ev, o.code || '', String(o.src || '').slice(0, 120), String(o.page || '').slice(0, 200), o.cta || '', o.campaign || '', o.utm || '', o.vid || '', o.start || ''];
  if (fnlDry_()) { (TG_MEM['fnl:rows'] = TG_MEM['fnl:rows'] || []).push(row); return true; }
  try { fnlTab_(FNL_TAB, FNL_HEAD).appendRow(tgCellRow_(row)); } catch (e) { tgErr_('fnlEv_', e); return false; }
  if (['intro_booked', 'intro_done', 'therapy_started'].indexOf(ev) > -1) fnlGaQueue_(ev, o);
  return true;
}
/** از tgLeadEv_: تغییر وضعیت یا ستون‌های معارفه ← رویداد */
function fnlFromLeadEv_(o) {
  if (!o || !o.code) return '';
  var w = String(o.what || ''), to = String(o.to || '').trim(), ev = '';
  if (w === 'وضعیت') ev = to === TG_ST.BOOKED ? 'intro_booked' : to === TG_ST.HELD ? 'intro_done' : to === TG_ST.START ? 'therapy_started' : '';
  else if (w === 'معارفه هماهنگ شد؟' && to === 'بله') ev = 'intro_booked';
  else if (w === 'شروع درمان؟' && to === 'بله') ev = 'therapy_started';
  if (!ev) return '';
  /* یک بار برای هر لید و هر رویداد */
  var k = 'fnl:' + ev + ':' + o.code;
  if (fnlDry_()) { if (TG_MEM[k]) return ''; TG_MEM[k] = 1; }
  else { var P = PropertiesService.getScriptProperties(); if (P.getProperty(k)) return ''; P.setProperty(k, '1'); }
  fnlEv_(ev, { code: o.code });
  return ev;
}
/** از tgAppendLead_ بعد از نوشتن موفق */
function fnlLead_(o, code) {
  var x = (o && o.extra) || {};
  return fnlEv_('lead_created', { code: code || '', src: o.source || '', page: x['صفحهٔ ورود'] || '', cta: x['دکمه'] || '', campaign: x['کمپین'] || '', utm: x['UTM'] || '', vid: x['شناسهٔ بازدید'] || '' });
}

/* ───── GA4 Measurement Protocol (اختیاری) ───── */
function fnlGaQueue_(ev, o) {
  var mid = String(cfg_('GA4_MID', '') || '').trim(); if (!mid) return;
  try {
    var P = PropertiesService.getScriptProperties(), q = JSON.parse(P.getProperty('FNL_GA_Q') || '[]');
    q.push({ n: ev, c: o.vid || ('lead.' + (o.code || 'x')), p: { lead_code: o.code || '' }, t: fnlNow_() });
    P.setProperty('FNL_GA_Q', JSON.stringify(q.slice(-200)));
  } catch (e) { tgErr_('fnlGaQueue_', e); }
}
function fnlGaFlush_() {
  if (fnlDry_()) return 0;
  var mid = String(cfg_('GA4_MID', '') || '').trim(), P = PropertiesService.getScriptProperties(), sec = P.getProperty('GA4_MP_SECRET') || '';
  if (!mid || !sec) return 0;
  var q = []; try { q = JSON.parse(P.getProperty('FNL_GA_Q') || '[]'); } catch (e) { q = []; }
  if (!q.length) return 0;
  var sent = 0;
  q.slice(0, 25).forEach(function (x) {
    try {
      var r = UrlFetchApp.fetch('https://www.google-analytics.com/mp/collect?measurement_id=' + encodeURIComponent(mid) + '&api_secret=' + encodeURIComponent(sec),
        { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ client_id: x.c, timestamp_micros: x.t * 1000, events: [{ name: x.n, params: x.p }] }) });
      if (r.getResponseCode() < 300) sent++;
    } catch (e2) {}
  });
  P.setProperty('FNL_GA_Q', JSON.stringify(q.slice(25)));
  return sent;
}

/* ───── گزارش قیف ───── */
/** لیدها: کد ← {src, page, cta, campaign, at} */
function fnlLeads_() {
  if (fnlDry_()) return TG_MEM['fnl:leads'] || {};
  var sh = tgSS_().getSheetByName(TG_LEADS), n = sh ? sh.getLastRow() : 0, out = {};
  if (n < 2) return out;
  var hm = tgLeadHeadMap_(sh), v = sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues();
  v.forEach(function (r) {
    if (typeof itkInternal_ === 'function' && itkInternal_(r, hm)) return;
    var code = String(tgLeadHv_(r, hm, 'کد لید') || '').trim(); if (!code) return;
    var d = tgAsDate_(r[0], r[1]);
    out[code] = { src: String(r[2] || '').split(' — ')[0].trim(), page: String(tgLeadHv_(r, hm, 'صفحهٔ ورود') || ''), cta: String(tgLeadHv_(r, hm, 'دکمه') || ''), campaign: String(tgLeadHv_(r, hm, 'کمپین') || '') || String(tgLeadHv_(r, hm, 'کد کمپین') || ''),
      at: d ? d.getTime() : 0, st: tgStOf_(String(r[8] || '').trim()) || String(r[8] || '').trim(), booked: String(r[19] || '').trim() === 'بله', started: String(r[22] || '').trim() === 'بله' };
  });
  return out;
}
function fnlRows_() {
  if (fnlDry_()) return TG_MEM['fnl:rows'] || [];
  try { var sh = tgStatSS_().getSheetByName(FNL_TAB); if (!sh || sh.getLastRow() < 2) return []; return sh.getRange(2, 1, sh.getLastRow() - 1, FNL_HEAD.length).getValues(); } catch (e) { return []; }
}
/** جدول قیف یک بازه به تفکیک یک بعد: {کلید: {click, lead, booked, done, start}} */
function fnlTable_(fromMs, toMs, dim) {
  var leads = fnlLeads_(), T = {}, key = function (o) { return String((o && o[dim]) || '').trim() || '(نامعلوم)'; };
  var add = function (k, f) { var x = T[k] = T[k] || { click: 0, lead: 0, booked: 0, done: 0, start: 0 }; x[f]++; };
  fnlRows_().forEach(function (r) {
    var t = r[0] instanceof Date ? r[0].getTime() : Number(new Date(r[0])); if (!(t >= fromMs && t < toMs)) return;
    var ev = String(r[1]), code = String(r[2] || ''), L = leads[code] || { src: r[3], page: r[4], cta: r[5], campaign: r[6] };
    if (ev === 'cta_click') add(key({ src: r[3], page: r[4], cta: r[5], campaign: r[6] }), 'click');
    else if (ev === 'lead_created') add(key(L), 'lead');
    else if (ev === 'intro_booked') add(key(L), 'booked');
    else if (ev === 'intro_done') add(key(L), 'done');
    else if (ev === 'therapy_started') add(key(L), 'start');
  });
  return T;
}
function fnlPct_(a, b) { return b ? Math.round(100 * a / b) + '٪' : '–'; }
function fnlLines_(T, top) {
  return Object.keys(T).sort(function (a, b) { return (T[b].lead + T[b].click) - (T[a].lead + T[a].click); }).slice(0, top || 8).map(function (k) {
    var x = T[k];
    return '• ' + tgEsc_(k.slice(0, 50)) + ': کلیک ' + tgFa_(x.click) + ' ← لید ' + tgFa_(x.lead) + ' (' + fnlPct_(x.lead, x.click) + ') ← معارفه ' + tgFa_(x.booked) + ' (' + fnlPct_(x.booked, x.lead) + ') ← شروع ' + tgFa_(x.start) + ' (' + fnlPct_(x.start, x.booked) + ')';
  });
}
function fnlReport_(days) {
  var to = fnlNow_() + 1, from = to - (days || 7) * 86400000, out = { text: '', rows: [] };
  var T0 = fnlTable_(from, to, 'all'), tot = T0['(نامعلوم)'] || { click: 0, lead: 0, booked: 0, done: 0, start: 0 };
  var L = ['📈 <b>قیف هفتگی</b> · ' + tgFa_(days || 7) + ' روز گذشته',
    'کلیک ' + tgFa_(tot.click) + ' ← لید ' + tgFa_(tot.lead) + ' (نرخ لید ' + fnlPct_(tot.lead, tot.click) + ') ← معارفه ' + tgFa_(tot.booked) + ' (' + fnlPct_(tot.booked, tot.lead) + ') ← برگزار ' + tgFa_(tot.done) + ' ← شروع درمان ' + tgFa_(tot.start) + ' (نرخ شروع ' + fnlPct_(tot.start, tot.booked) + ')'];
  Object.keys(FNL_DIMS).forEach(function (d) {
    var T = fnlTable_(from, to, d);
    Object.keys(T).forEach(function (k) { out.rows.push([FNL_DIMS[d], k, T[k].click, T[k].lead, T[k].booked, T[k].done, T[k].start]); });
    if (d === 'cta' || d === 'campaign') return;   /* پیام کوتاه: فقط صفحه و منبع؛ همه در تب */
    L.push('', '<b>به تفکیک ' + FNL_DIMS[d] + '</b>'); L = L.concat(fnlLines_(T, 6));
  });
  L.push('', 'جزئیات دکمه و کمپین در تب «' + FNL_WEEK_TAB + '» هاب آمار.');
  out.text = L.join('\n'); out.tot = tot;
  return out;
}
function fnlWeekly_() {
  var d = new Date(fnlNow_()), dow = Utilities.formatDate(d, TG_TZ, 'u'), hm = Utilities.formatDate(d, TG_TZ, 'HHmm');
  if (dow !== '6' || hm < '0930') return false;
  var wk = Utilities.formatDate(d, TG_TZ, 'yyyy-ww');
  if (fnlDry_() ? TG_MEM['fnl:wk'] === wk : PropertiesService.getScriptProperties().getProperty('FNL_WK') === wk) return false;
  if (fnlDry_()) TG_MEM['fnl:wk'] = wk; else PropertiesService.getScriptProperties().setProperty('FNL_WK', wk);
  var r = fnlReport_(7);
  if (!fnlDry_()) {
    try { var sh = fnlTab_(FNL_WEEK_TAB, ['هفته', 'بعد', 'مقدار', 'کلیک', 'لید', 'معارفه رزرو', 'معارفه برگزار', 'شروع درمان']); if (r.rows.length) sh.getRange(sh.getLastRow() + 1, 1, r.rows.length, 8).setValues(r.rows.map(function (x) { return [wk].concat(x); })); } catch (e) { tgErr_('fnlWeekly_', e); }
  } else TG_MEM['fnl:week'] = r;
  if (TG_OWNER_CHAT) tgNotify_(String(TG_OWNER_CHAT), TG_NK.report, r.text, { ref: 'FUNNEL-WEEK' });
  return true;
}
function fnlHourly_() {
  try { fnlWeekly_(); } catch (e) { tgErr_('fnlWeekly_', e); }
  try { fnlGaFlush_(); } catch (e2) { tgErr_('fnlGaFlush_', e2); }
}

/* یک‌بارهٔ خودکار v170.36: بیس‌لاین ۲۸ روز گذشته پیش از تغییرهای اندازه‌گیری، از لیدها و «کلیک‌های تماس». فقط شمار. */
function tgV17036Funnel() {
  var to = fnlNow_(), from = to - 28 * 86400000, L = fnlLeads_(), by = {};
  Object.keys(L).forEach(function (c) {
    var l = L[c]; if (!(l.at >= from && l.at < to)) return;
    var k = l.src || '(نامعلوم)', x = by[k] = by[k] || { lead: 0, booked: 0, start: 0 };
    x.lead++;
    if (l.booked || [TG_ST.BOOKED, TG_ST.HELD, TG_ST.START].indexOf(l.st) > -1) x.booked++;
    if (l.started || l.st === TG_ST.START) x.start++;
  });
  var clicks = 0;
  if (!fnlDry_()) { try { var cs = tgSS_().getSheetByName('کلیک‌های تماس'); if (cs && cs.getLastRow() > 1) cs.getRange(2, 1, cs.getLastRow() - 1, 1).getValues().forEach(function (r) { var d = r[0] instanceof Date ? r[0].getTime() : 0; if (d >= from) clicks++; }); } catch (e) {} }
  else clicks = TG_MEM['fnl:clicks'] || 0;
  var tot = { lead: 0, booked: 0, start: 0 }; Object.keys(by).forEach(function (k) { tot.lead += by[k].lead; tot.booked += by[k].booked; tot.start += by[k].start; });
  if (!fnlDry_()) {
    try {
      var sh = fnlTab_(FNL_BASE_TAB, ['تاریخ ثبت', 'بازه', 'منبع', 'کلیک', 'لید', 'معارفه', 'شروع درمان']), day = Utilities.formatDate(new Date(to), TG_TZ, 'yyyy-MM-dd');
      sh.appendRow([day, '۲۸ روز', 'همه', clicks, tot.lead, tot.booked, tot.start]);
      Object.keys(by).forEach(function (k) { sh.appendRow([day, '۲۸ روز', k, '', by[k].lead, by[k].booked, by[k].start]); });
    } catch (e2) { tgErr_('tgV17036Funnel', e2); }
  }
  return 'بیس‌لاین ۲۸ روز: کلیک ' + clicks + ' · لید ' + tot.lead + ' · معارفه ' + tot.booked + ' · شروع درمان ' + tot.start + ' · منبع‌ها ' + Object.keys(by).length;
}

function fnlTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'fnl:now': new Date('2026-10-10T10:00:00+03:30').getTime() };   /* شنبه */
  try {
    var t0 = TG_MEM['fnl:now'] - 3 * 86400000;
    TG_MEM['fnl:leads'] = { 'L-1': { src: 'سایت › پذیرش › فرم شروع تراپی', page: '/get-therapy/', cta: 'gt.form', campaign: '', at: t0, st: TG_ST.START, booked: true, started: true },
                            'L-2': { src: 'Telegram bot', page: '/', cta: 'home.hero', campaign: '', at: t0, st: TG_ST.NEW } };
    fnlEv_('cta_click', { page: '/', cta: 'home.hero', src: 'سایت' }); fnlEv_('cta_click', { page: '/', cta: 'home.hero', src: 'سایت' });
    fnlLead_({ source: 'Telegram bot', extra: { 'صفحهٔ ورود': '/', 'دکمه': 'home.hero' } }, 'L-2');
    fnlLead_({ source: 'سایت › پذیرش › فرم شروع تراپی', extra: { 'صفحهٔ ورود': '/get-therapy/', 'دکمه': 'gt.form' } }, 'L-1');
    ok('رویداد ناشناخته ثبت نمی‌شود', fnlEv_('x_y', {}) === false);
    ok('تغییر وضعیت ← معارفه و شروع، یک بار', fnlFromLeadEv_({ code: 'L-1', what: 'وضعیت', to: TG_ST.BOOKED }) === 'intro_booked' && fnlFromLeadEv_({ code: 'L-1', what: 'وضعیت', to: TG_ST.BOOKED }) === '' && fnlFromLeadEv_({ code: 'L-1', what: 'شروع درمان؟', to: 'بله' }) === 'therapy_started');
    ok('وضعیت بی‌ربط رویداد نمی‌سازد', fnlFromLeadEv_({ code: 'L-2', what: 'وضعیت', to: TG_ST.FOLLOW }) === '');
    var T = fnlTable_(0, TG_MEM['fnl:now'] + 1, 'cta');
    ok('جدول قیف به تفکیک دکمه', T['home.hero'].click === 2 && T['home.hero'].lead === 1 && T['gt.form'].lead === 1 && T['gt.form'].booked === 1 && T['gt.form'].start === 1, JSON.stringify(T));
    ok('گزارش هفتگی شنبه، یک بار، بی نام', fnlWeekly_() === true && fnlWeekly_() === false && /قیف هفتگی/.test(TG_MEM['fnl:week'].text) && TG_MEM['fnl:week'].tot.click === 2 && TG_MEM['fnl:week'].tot.lead === 2);
    TG_MEM['fnl:clicks'] = 9;
    ok('بیس‌لاین ۲۸ روز', /کلیک 9 · لید 2 · معارفه 1 · شروع درمان 1/.test(tgV17036Funnel()), tgV17036Funnel());
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'fnlTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['قیف و اندازه‌گیری یکپارچه (v170.36)', 'fnlTests']); } catch (eFnl) {}
