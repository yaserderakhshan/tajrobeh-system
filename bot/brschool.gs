/**
 * brschool.gs · v170.124 · ۲۰ آبان ۱۴۰۵ · خواندن امضاشدهٔ برنامهٔ مدرسه از پل (K390.3، ۱۵b، قرارداد D4 در INBOX-UI)
 *
 * GET /v2/school/bot/schedule?cohort=<کد گروه>&days=<۱..۳۶۶>؛ بی نشست؛ سرآیندهای Tajrobeh-Timestamp و Tajrobeh-Signature با پیشوند «school-bot-schedule.v1:»
 * روی رشتهٔ پرسمان خام (بی «?»)؛ هر امضا یک‌بارمصرف (برای هر خواندن، حتی شرطی، امضای تازه)؛ ETag و If-None-Match: ۳۰۴ یعنی بی‌تغییر. پاسخ:
 * {cohorts:[{code,title,sessions:[{id,kind,topic,startsAtUtc,endsAtUtc,timeZoneId,mode,meetingUrl,placeNote,hostName,status}]}]}؛ status: Scheduled، Held، Cancelled.
 * بات فقط Scheduled و آینده را نشان می‌دهد (لغوشده از برنامهٔ دانشجو برداشته می‌شود)؛ شناسهٔ کاربر در پاسخ نیست.
 * ⚠️ فرضیه (در قرارداد نبود، با خواندن اول تأیید می‌شود): متن امضاشده = «school-bot-schedule.v1:<ts>:<پرسمان>» مثل امضای خوراک اسلات (brFeedTick_)؛
 * و کد گروه پل = کد حلقهٔ شیت با رقم لاتین (CLIN-15/1). اگر ۴۰۱ یا ۴۰۴ آمد، مسیر شیت و تقویم گوگل (پشتیبان) کار می‌کند.
 * سوئیچ: BRIDGE_SCHOOL_READ=1 (پیش‌فرض خاموش) تا همهٔ طرف‌های پل با هم روشن شوند (E7). آدرس: BRIDGE_SCHOOL_URL (فقط bridge.tajrobeh.life).
 */
var BRS_URL_DEF = 'https://bridge.tajrobeh.life/api/v2/school/bot/schedule';
var BRS_MAX_CACHE = 90000;
function brsDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function brsOn_() { return String(cfg_('BRIDGE_SCHOOL_READ', '')) === '1'; }
function brsUrl_() {
  var u = String(cfg_('BRIDGE_SCHOOL_URL', '') || '').trim();
  if (/^(off|0|خاموش)$/i.test(u)) return '';
  if (!u) return BRS_URL_DEF;
  return /^https:\/\/bridge\.tajrobeh\.life\//.test(u) ? u : '';
}
function brsCacheGet_(k) {
  try { var v = brsDry_() ? TG_MEM['brs:cache:' + k] : CacheService.getScriptCache().get('brs:' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function brsCachePut_(k, o) {
  try { var s = JSON.stringify(o); if (s.length > BRS_MAX_CACHE) return; if (brsDry_()) TG_MEM['brs:cache:' + k] = s; else CacheService.getScriptCache().put('brs:' + k, s, 21600); } catch (e) {}
}
function brsHttp_(url, headers) {
  if (brsDry_()) { (TG_MEM['brs:reqs'] = TG_MEM['brs:reqs'] || []).push({ url: url, h: headers }); return TG_MEM['brs:resp'] || { code: 0, etag: '', text: '' }; }
  try {
    var r = UrlFetchApp.fetch(url, { method: 'get', headers: headers, muteHttpExceptions: true, followRedirects: false });
    var hd = r.getHeaders() || {};
    return { code: r.getResponseCode(), etag: String(hd.ETag || hd.Etag || hd.etag || ''), text: r.getContentText() };
  } catch (e) { return { code: 0, etag: '', text: '' }; }
}
/* ← {code, body(object)} یا null (خاموش، بی راز، خطا، ۴۰۱، ۴۰۴)؛ ۳۰۴ همان نسخهٔ نهان را برمی‌گرداند */
function brsFetch_(cohort, days) {
  if (!brsOn_()) return null;
  var url = brsUrl_(), sec = typeof brHandoffSecret_ === 'function' ? brHandoffSecret_() : '';
  if (!url || !sec) return null;
  var q = (cohort ? 'cohort=' + encodeURIComponent(cohort) + '&' : '') + 'days=' + Math.max(1, Math.min(366, Number(days) || 120));
  var now = Math.floor((brsDry_() && TG_MEM['brs:now'] ? Number(TG_MEM['brs:now']) : Date.now()) / 1000), ts = String(now);
  var key = cohort || '_all', hit = brsCacheGet_(key);
  var h = { 'Tajrobeh-Timestamp': ts, 'Tajrobeh-Signature': brSign_('school-bot-schedule.v1:' + ts + ':' + q, sec) };
  if (hit && hit.e) h['If-None-Match'] = hit.e;
  var r = brsHttp_(url + '?' + q, h);
  if (r.code === 304 && hit) { try { return { code: 304, body: JSON.parse(hit.b) }; } catch (e) { return null; } }
  if (r.code !== 200) { try { Logger.log('brsFetch_: پل HTTP ' + r.code); } catch (eL) {} return null; }
  var body; try { body = JSON.parse(r.text); } catch (e2) { return null; }
  if (r.etag) brsCachePut_(key, { e: r.etag, b: r.text });
  return { code: 200, body: body };
}
function brsEsc_(s) { return typeof tgEsc_ === 'function' ? tgEsc_(s) : String(s); }
/* حلقهٔ شیت (یا ردیف حلقه) ← متن برنامه؛ null یعنی از پل نخوانده شد و مسیر شیت و تقویم برود */
function brsText_(circle, days) {
  if (!brsOn_() || !circle || !circle.code) return null;
  var code = tgSchCircNorm_(circle.code), r = brsFetch_(code, days || 14);
  if (!r || !r.body || !r.body.cohorts) return null;
  var co = null; r.body.cohorts.forEach(function (c) { if (tgSchCircNorm_(c.code) === code) co = c; });
  if (!co) return null;
  var now = brsDry_() && TG_MEM['brs:now'] ? Number(TG_MEM['brs:now']) : Date.now(), lim = now + (days || 14) * 86400000;
  var ev = (co.sessions || []).filter(function (x) {
    var t = Date.parse(x.startsAtUtc); return x.status === 'Scheduled' && t >= now && t <= lim;
  }).sort(function (a, b) { return Date.parse(a.startsAtUtc) - Date.parse(b.startsAtUtc); }).slice(0, 20);
  return ev.map(function (x) {
    var d = new Date(Date.parse(x.startsAtUtc));
    var tail = x.hostName ? ' · استاد ' + brsEsc_(x.hostName) : '';
    if (x.meetingUrl && /^https:\/\//.test(x.meetingUrl)) tail += ' · <a href="' + String(x.meetingUrl).replace(/"/g, '&quot;') + '">ورود به جلسه</a>';
    else if (x.placeNote) tail += ' · ' + brsEsc_(x.placeNote);
    return '• ' + tgJDateFull_(d, TG_TZ) + ' ساعت ' + Utilities.formatDate(d, TG_TZ, 'HH:mm') + '\n  ' + brsEsc_(x.topic || x.kind || 'جلسه') + tail;
  }).join('\n');
}
function brsTests() {
  var out = [], pass = 0, fail = 0;
  function ok(n, c) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n); }
  var kD = TG_DRY, kM = TG_MEM, kC = TG_CFG_;
  TG_DRY = true; TG_MEM = { 'br:token': 'tok' }; TG_CFG_ = {};
  var NOW = Date.UTC(2026, 10, 15, 6, 0) / 1000, circle = { code: 'CLIN-۱۵/۱' };
  var body = { cohorts: [{ code: 'CLIN-15/1', title: 'حلقه ۱۵/۱', sessions: [
    { id: 1, kind: 'Clinical', topic: 'کیس‌خوانی', startsAtUtc: new Date((NOW + 86400) * 1000).toISOString(), timeZoneId: 'Asia/Tehran', mode: 'Online', meetingUrl: 'https://meet.example/abc', hostName: 'استاد نمونه', status: 'Scheduled' },
    { id: 2, kind: 'Clinical', topic: 'لغو شده', startsAtUtc: new Date((NOW + 2 * 86400) * 1000).toISOString(), status: 'Cancelled' },
    { id: 3, kind: 'Clinical', topic: 'گذشته', startsAtUtc: new Date((NOW - 86400) * 1000).toISOString(), status: 'Held' },
    { id: 4, kind: 'Clinical', topic: 'حضوری', startsAtUtc: new Date((NOW + 3 * 86400) * 1000).toISOString(), mode: 'InPerson', placeNote: 'ونک', status: 'Scheduled' }] }] };
  try {
    TG_MEM['brs:now'] = NOW * 1000;   /* میلی‌ثانیه */
    ok('پل: کلید خاموش، هیچ درخواستی نمی‌رود و null', brsText_(circle, 14) === null && !(TG_MEM['brs:reqs'] || []).length);
    TG_CFG_ = { BRIDGE_SCHOOL_READ: '1' };
    TG_MEM['brs:resp'] = { code: 200, etag: 'W/"v1"', text: JSON.stringify(body) };
    var t = brsText_(circle, 14), rq = TG_MEM['brs:reqs'][0];
    ok('پل: درخواست امضاشده با پرسمان خام و سرآیندها', /\?cohort=CLIN-15%2F1&days=14$/.test(rq.url) && /^v1=/.test(rq.h['Tajrobeh-Signature']) && rq.h['Tajrobeh-Timestamp'] === String(NOW) && !rq.h['If-None-Match']);
    ok('پل: فقط Scheduled و آینده، لغو و گذشته نه', /کیس‌خوانی/.test(t) && /حضوری/.test(t) && !/لغو شده/.test(t) && !/گذشته/.test(t));
    ok('پل: لینک جلسه به‌صورت پیوند (نه نشانی خام) و استاد', /<a href="https:\/\/meet\.example\/abc">ورود به جلسه<\/a>/.test(t) && /استاد استاد نمونه/.test(t) && /ونک/.test(t));
    TG_MEM['brs:resp'] = { code: 304, etag: '', text: '' };
    var t2 = brsText_(circle, 14), rq2 = TG_MEM['brs:reqs'][1];
    ok('پل: ۳۰۴ با If-None-Match و امضای تازه، همان برنامه', rq2.h['If-None-Match'] === 'W/"v1"' && t2 === t);
    TG_MEM['brs:resp'] = { code: 401, etag: '', text: '{}' };
    ok('پل: ۴۰۱ یا ۴۰۴ یعنی null و مسیر پشتیبان', brsText_(circle, 14) === null);
    TG_MEM['brs:resp'] = { code: 200, etag: '', text: JSON.stringify({ cohorts: [{ code: 'CLIN-13', sessions: [] }] }) };
    ok('پل: گروهِ نیامده در پاسخ null', brsText_(circle, 14) === null);
    TG_MEM['brs:resp'] = { code: 200, etag: '', text: JSON.stringify({ cohorts: [{ code: 'CLIN-15/1', sessions: [] }] }) };
    ok('پل: گروه بی جلسه رشتهٔ خالی (نه null)', brsText_(circle, 14) === '');
    TG_CFG_ = { BRIDGE_SCHOOL_READ: '1', BRIDGE_SCHOOL_URL: 'https://evil.example/x' };
    ok('پل: آدرس غیر bridge.tajrobeh.life رد می‌شود', brsUrl_() === '');
  } finally { TG_DRY = kD; TG_MEM = kM; TG_CFG_ = kC; }
  Logger.log(out.join('\n'));
  return { pass: pass, fail: fail, text: out.filter(function (l) { return l.indexOf('❌') === 0; }).join('\n') };
}
