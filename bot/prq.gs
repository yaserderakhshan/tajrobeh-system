/**
 * prq.gs · v170.124 · ۲۱ آبان ۱۴۰۵ · سمت بات صف بازبینی پروفایل در پل (K404.6، K406، E10/E11، K423)
 *
 * با BRIDGE_PROFILE_QUEUE=1 (پیش‌فرض خاموش) بات پروفایل را خودش منتشر نمی‌کند و فقط هر فیلد عوض‌شده را به پل می‌دهد؛ گارد، انتشار و دوباره‌تلاش با پل است (D6).
 * قرارداد پذیرفته‌شدهٔ A (E11): POST /v2/bot/profile-changes؛ امضا: «legacy-profile-changes.v1:<ts>:<بدنه>» با سرآیندهای Tajrobeh-Timestamp و Tajrobeh-Signature
 * (همان طرح خوراک اسلات)؛ بدنه {items:[{key, telegramChatId, fieldKey, oldValue, newValue, at}]}؛ key = هش chat|field|at (ایدمپوتنت)؛ پل درمانگر را از چت تلگرام می‌یابد.
 * موفق (۲xx): عکس‌فوری و ستون‌های «بازبینی شد» مثل انتشار به‌روز می‌شود تا دوباره نرود؛ شکست: هیچ‌چیز عوض نمی‌شود و تیک بعد با همان key دوباره می‌فرستد.
 * خوانش وضعیت (GET ?since=) و پیام ردشدن به خود درمانگر: وقتی پل فرمت پاسخ را نوشت (⛔ منتظر D6).
 */
var PRQ_URL_DEF = 'https://bridge.tajrobeh.life/api/v2/legacy/bot-profile-changes';   /* قرارداد نهایی D6 ۰۴:۵۵: مسیرهای Legacy (نه /v2/bot) */
function prqDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function prqOn_() { return String(cfg_('BRIDGE_PROFILE_QUEUE', '')) === '1'; }
function prqUrl_() {
  var u = String(cfg_('BRIDGE_PROFILE_URL', '') || '').trim();
  if (/^(off|0|خاموش)$/i.test(u)) return '';
  if (!u) return PRQ_URL_DEF;
  return /^https:\/\/bridge\.tajrobeh\.life\//.test(u) ? u : '';
}
function prqKey_(chat, field, at) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(chat) + '|' + field + '|' + at, Utilities.Charset.UTF_8);
  return brHex_(d).slice(0, 32);
}
/* آیتم‌های تغییر: فقط فیلدهای عوض‌شده؛ old از عکس‌فوری قبلی، new از ردیف هاب */
function prqItems_(v, snap, changed, chat, atMs) {
  var at = new Date(Number(atMs) || Date.now()).toISOString();
  return changed.map(function (k) {
    return { key: prqKey_(chat, k, at), telegramChatId: String(chat), fieldKey: k, oldValue: praS_(snap && snap.raw ? snap.raw[k] : ''), newValue: praS_(v[k]), at: at };
  });
}
function prqHttp_(method, url, body, headers) {
  if (prqDry_()) { (TG_MEM['prq:reqs'] = TG_MEM['prq:reqs'] || []).push({ m: method, url: url, body: body, h: headers }); var r = TG_MEM[method === 'get' ? 'prq:getresp' : 'prq:resp'] || { code: 200, text: '{}' }; return typeof r === 'function' ? r(body) : r; }
  try {
    var o = { method: method, headers: headers, muteHttpExceptions: true, followRedirects: false };
    if (body) { o.contentType = 'application/json'; o.payload = body; }
    var x = UrlFetchApp.fetch(url, o); return { code: x.getResponseCode(), text: x.getContentText() };
  } catch (e) { return { code: 0, text: '' }; }
}
/* پیشوند POST: legacy-profile-changes.v1 و GET: legacy-profile-changes-read.v1 (D6 ۲۱ آبان؛ امضای یکی روی دیگری پذیرفته نیست) */
function prqSign_(text, read) {
  var sec = typeof brHandoffSecret_ === 'function' ? brHandoffSecret_() : '';
  if (!sec) return null;
  var ts = String(Math.floor((prqDry_() && TG_MEM['prq:now'] ? Number(TG_MEM['prq:now']) : Date.now()) / 1000));
  var msg = (read ? 'legacy-profile-changes-read.v1:' : 'legacy-profile-changes.v1:') + ts + ':' + text;
  if (prqDry_()) (TG_MEM['prq:signed'] = TG_MEM['prq:signed'] || []).push(msg);
  return { 'Tajrobeh-Timestamp': ts, 'Tajrobeh-Signature': brSign_(msg, sec) };
}
/* ← {state:'ok'|'skip'|'fail', by:{key:{result,reason}}}. ok = رسید ۲۰۰ و همهٔ key ها در رسید. تلاش دوباره فقط برای خطای انتقال (fail). */
function prqPost_(items) {
  if (!items.length) return { state: 'ok', by: {} };
  var url = prqUrl_(); if (!url) return { state: 'skip', by: {} };
  var by = {}, chunks = [], i;
  for (i = 0; i < items.length; i += 100) chunks.push(items.slice(i, i + 100));   /* سقف قرارداد ۲۰۰ آیتم و ۲۵۶ کیلوبایت */
  for (i = 0; i < chunks.length; i++) {
    var body = JSON.stringify({ items: chunks[i] }), h = prqSign_(body);
    if (!h) return { state: 'skip', by: by };
    var r = prqHttp_('post', url, body, h);
    if (r.code === 401) { try { tgErr_('prqPost_', 'امضا یا ساعت رد شد (۴۰۱)'); } catch (e0) {} return { state: 'fail', by: by }; }
    if (r.code !== 200) return { state: 'fail', by: by };
    var rec; try { rec = JSON.parse(r.text); } catch (e) { return { state: 'fail', by: by }; }
    (rec.items || []).forEach(function (x) { by[x.key] = { result: String(x.result || ''), reason: String(x.reason || '') }; });
    for (var k = 0; k < chunks[i].length; k++) if (!by[chunks[i][k].key]) return { state: 'fail', by: by };
  }
  return { state: 'ok', by: by };
}
function prqPendGet_() { try { return JSON.parse((prqDry_() ? TG_MEM['prq:pend'] : PropertiesService.getScriptProperties().getProperty('PRQ_PEND')) || '{}') || {}; } catch (e) { return {}; } }
function prqPendPut_(o) {
  var ks = Object.keys(o); while (ks.length > 300) { delete o[ks.sort(function (a, b) { return (o[a].t || 0) - (o[b].t || 0); })[0]]; ks = Object.keys(o); }
  var s = JSON.stringify(o); if (prqDry_()) TG_MEM['prq:pend'] = s; else PropertiesService.getScriptProperties().setProperty('PRQ_PEND', s);
}
/* جای praAutoOne_ وقتی کلید روشن است؛ همان شکل خروجی. Rejected با دلیل شناخته‌شده ← همان پیام و مقدار قبلیِ همیشگی به درمانگر. */
function prqOne_(r) {
  var v = r.v, now = praNow_(), id = String(v.id || '');
  if (/نمی‌رود/.test(String(v.status || ''))) { tgPqPut_(id, { rstamp: String(now) }); return { state: 'blocked', bad: {}, changed: [] }; }
  var chat = praMemberChat_(v);
  if (!chat) { tgPqPut_(id, { rstamp: String(now), review: tgPqNow_() + ' · بی چت؛ به پل نرفت' }); return { state: 'none', bad: {}, changed: [] }; }
  var snap = praJ_(v.pub_snap), g = praGuard_(v, snap), items = prqItems_(v, snap, g.changed, chat, tgPrStamp_(v) || now);
  var res = prqPost_(items);
  if (res.state !== 'ok') return { state: res.state === 'skip' ? 'none' : 'fail', ok: false, bad: {}, changed: g.changed };
  var put = {}, bad = {}, notes = [], pend = prqPendGet_(), keep = false;
  items.forEach(function (it) {
    var x = res.by[it.key] || {}, f = it.fieldKey;
    if (x.result === 'Rejected' && PRA_WHY[x.reason]) { bad[f] = x.reason; put[f] = it.oldValue; }
    else if (x.result === 'Rejected') notes.push(praLabel_(f) + ': پل ردش کرد (' + (x.reason || '-') + ')');
    else if (x.result === 'Unmatched') notes.push('چت به درمانگری وصل نیست');
    else if (x.result === 'Ambiguous') notes.push('چت به بیش از یک درمانگر وصل است');
    else if (x.result === 'Created') { pend[it.key] = { c: String(chat), f: f, t: now }; keep = true; }
  });
  if (keep) prqPendPut_(pend);
  put.pub_snap = JSON.stringify(praSnapOf_(Object.assign({}, v, put), now));
  put.rstamp = String(now); put.notified = String(tgPrStamp_(v));
  put.review = tgPqNow_() + ' · به صف پل رفت' + (notes.length ? ' · ' + notes.join(' · ') : '');
  put.guard_note = Object.keys(bad).map(function (k) { return praLabel_(k) + ': ' + (PRA_WHY[bad[k]] || bad[k]); }).join(' · ');
  tgPqPut_(id, put);
  if (Object.keys(bad).length) { try { tgSend_(chat, praBadText_(bad, items.length > Object.keys(bad).length), praBadKb_(bad)); } catch (eM) { tgErr_('prqOne_ پیام', eM); } }
  return { state: items.length ? 'pub' : 'none', ok: true, bad: bad, changed: g.changed };
}
/* هر ≥۳۰ دقیقه: وضعیت کلیدهای «در انتظار» از پل؛ Rejected دیرهنگام ← یک پیام به درمانگر؛ Published، RolledBack، Unknown، قدیمی‌تر از ۳ روز ← حذف */
function prqPoll_() {
  if (!prqOn_()) return 0;
  var now = praNow_(), last = Number((prqDry_() ? TG_MEM['prq:pollat'] : PropertiesService.getScriptProperties().getProperty('PRQ_POLL_AT')) || 0);
  if (now - last < 30 * 60000) return 0;
  var pend = prqPendGet_(), keys = Object.keys(pend).slice(0, 100); if (!keys.length) return 0;
  if (prqDry_()) TG_MEM['prq:pollat'] = String(now); else PropertiesService.getScriptProperties().setProperty('PRQ_POLL_AT', String(now));
  var url = prqUrl_(); if (!url) return 0;
  var q = 'keys=' + keys.join(','), h = prqSign_(q, true); if (!h) return 0;
  var r = prqHttp_('get', url + '?' + q, '', h);
  if (r.code !== 200) return 0;
  var rec; try { rec = JSON.parse(r.text); } catch (e) { return 0; }
  var n = 0;
  (rec.items || []).forEach(function (x) {
    var p = pend[x.key]; if (!p) return;
    if (x.status === 'Rejected') {
      try { var bad = {}; bad[p.f] = 'x'; tgSend_(p.c, '🙏 ممنون از به‌روزرسانی. بخش «' + praLabel_(p.f) + '» از پروفایل شما منتشر نشد و نسخهٔ قبلی همین بخش روی سایت ماند. با دکمهٔ زیر همان پرسش دوباره باز می‌شود.', praBadKb_(bad)); n++; } catch (eN) {}
      delete pend[x.key];
    } else if (x.status === 'Published' || x.status === 'RolledBack' || x.status === 'Unknown') delete pend[x.key];
    else if (now - (p.t || 0) > 3 * 86400000) delete pend[x.key];
  });
  prqPendPut_(pend);
  return n;
}
function prqTests() {
  var out = [], pass = 0, fail = 0;
  function ok(n, c) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n); }
  var kD = TG_DRY, kM = TG_MEM, kC = TG_CFG_, kO = TG_OUTBOX;
  TG_DRY = true; TG_MEM = { 'br:token': 'tok' }; TG_CFG_ = {}; TG_OUTBOX = [];
  var rec = function (by) { return function (body) { var its = JSON.parse(body).items; return { code: 200, text: JSON.stringify({ received: its.length, items: its.map(function (x) { return { key: x.key, result: (by && by[x.key]) || 'Created', reason: '' }; }) }) }; }; };
  try {
    var snap = { raw: { title: 'قدیم', headline: 'جمله', method: '' } }, v = { title: 'جدید', headline: 'جمله', method: 'روش تازه' };
    var it = prqItems_(v, snap, ['title', 'method'], 901, Date.UTC(2026, 10, 15, 6, 0));
    ok('صف پل: فقط فیلد عوض‌شده با قدیم و جدید و at ISO', it.length === 2 && it[0].fieldKey === 'title' && it[0].oldValue === 'قدیم' && it[0].newValue === 'جدید' && it[1].oldValue === '' && /^2026-11-15T06:00:00/.test(it[0].at) && it[0].telegramChatId === '901');
    ok('صف پل: key ایدمپوتنت و ثابت، هر فیلد جدا', it[0].key === prqItems_(v, snap, ['title'], 901, Date.UTC(2026, 10, 15, 6, 0))[0].key && it[0].key !== it[1].key && it[0].key.length === 32);
    ok('صف پل: کلید خاموش', prqOn_() === false);
    TG_CFG_ = { BRIDGE_PROFILE_QUEUE: '1' };
    TG_MEM['prq:now'] = Date.UTC(2026, 10, 15, 6, 0);
    TG_MEM['prq:resp'] = rec({});
    var r1 = prqPost_(it), q0 = TG_MEM['prq:reqs'][0];
    ok('صف پل: مسیر Legacy نهایی، امضای تازه، بدنهٔ items، رسید Created', r1.state === 'ok' && q0.url === 'https://bridge.tajrobeh.life/api/v2/legacy/bot-profile-changes' && q0.m === 'post' && /^v1=/.test(q0.h['Tajrobeh-Signature']) && r1.by[it[0].key].result === 'Created');
    TG_MEM['prq:resp'] = { code: 500, text: '' };
    ok('صف پل: ۵xx، ۴۰۱ یا ۴۰۴ (مسیر بسته تا روشن شدن کلید پل) یعنی fail و تیک بعد دوباره', prqPost_(it).state === 'fail' && (TG_MEM['prq:resp'] = { code: 401, text: '' }) && prqPost_(it).state === 'fail');
    TG_MEM['prq:resp'] = function (body) { var its = JSON.parse(body).items.slice(1); return { code: 200, text: JSON.stringify({ items: its.map(function (x) { return { key: x.key, result: 'Created' }; }) }) }; };
    ok('صف پل: رسیدی که یک key را ندارد یعنی fail', prqPost_(it).state === 'fail');
    TG_MEM['prq:resp'] = rec({}); TG_MEM['prq:reqs'] = [];
    var many = []; for (var i = 0; i < 250; i++) many.push({ key: 'k' + i, telegramChatId: '1', fieldKey: 'f', oldValue: '', newValue: 'x', at: 'a' });
    ok('صف پل: ۲۵۰ آیتم در ۳ فراخوانی (سقف ۲۰۰)', prqPost_(many).state === 'ok' && TG_MEM['prq:reqs'].length === 3);
    ok('صف پل: بی تغییر چیزی نمی‌فرستد', prqPost_([]).state === 'ok' && TG_MEM['prq:reqs'].length === 3);
    TG_CFG_ = { BRIDGE_PROFILE_QUEUE: '1', BRIDGE_PROFILE_URL: 'https://evil.example/x' };
    ok('صف پل: آدرس غیر bridge.tajrobeh.life رد می‌شود', prqUrl_() === '' && prqPost_(it).state === 'skip');
    TG_CFG_ = { BRIDGE_PROFILE_QUEUE: '1' };
    TG_MEM['prq:reqs'] = []; TG_OUTBOX = [];
    prqPendPut_({ A: { c: '901', f: 'title', t: TG_MEM['prq:now'] }, B: { c: '902', f: 'method', t: TG_MEM['prq:now'] }, C: { c: '903', f: 'title', t: TG_MEM['prq:now'] } });
    TG_MEM['prq:getresp'] = { code: 200, text: JSON.stringify({ items: [{ key: 'A', status: 'Rejected' }, { key: 'B', status: 'Published' }, { key: 'C', status: 'Failed' }] }) };
    var n = prqPoll_(), q1 = TG_MEM['prq:reqs'][0];
    ok('خوانش وضعیت: GET با keys امضاشده، Rejected یک پیام، Published حذف، Failed می‌ماند', n === 1 && q1.m === 'get' && /\?keys=A,B,C$/.test(q1.url) && Object.keys(prqPendGet_()).join() === 'C' && TG_OUTBOX.some(function (x) { return x.kind === 'msg' && String(x.chat) === '901' && /منتشر نشد/.test(x.text); }));
    ok('امضا: GET با پیشوند read جدا، POST با پیشوند خودش', (TG_MEM['prq:signed'] || []).some(function (m) { return /^legacy-profile-changes\.v1:\d+:\{/.test(m); }) && (TG_MEM['prq:signed'] || []).some(function (m) { return /^legacy-profile-changes-read\.v1:\d+:keys=A,B,C$/.test(m); }));
    ok('خوانش وضعیت: دو بار پشت سر هم نه (۳۰ دقیقه)', prqPoll_() === 0 && TG_MEM['prq:reqs'].length === 1);
    ok('خوانش وضعیت: متن پیام خط تیرهٔ وسط جمله ندارد', !/[—–]/.test(TG_OUTBOX.map(function (x) { return x.text || ''; }).join(' ')));
  } finally { TG_DRY = kD; TG_MEM = kM; TG_CFG_ = kC; TG_OUTBOX = kO; }
  Logger.log(out.join('\n'));
  return { pass: pass, fail: fail, text: out.filter(function (l) { return l.indexOf('❌') === 0; }).join('\n') };
}
