/**
 * uptime.gs · v170.23.32 · ۱۸ مهر ۱۴۰۵ · پایش بالا بودن سایت، سمت بات (برد فرآیندها، کار ۴؛ بی هوش مصنوعی)
 *
 * خود سنجش هر ۵ دقیقه روی ورکر tj-assist است (edge/assist/src/uptime.js، بیرون از ایران) تا سهمیهٔ اجرای اپس‌اسکریپت نسوزد.
 * ورکر از درگاه انتشار (کلید دوم) دو اکشن صدا می‌زند:
 *   up_log   سطرها را در تب «پایش سایت» هاب تجربه می‌نویسد (هر ۳۰ دقیقه نمونه، و هر خطا). فقط ۳۰ روز آخر می‌ماند.
 *   up_alert down: دو خطای پشت سر هم · outside: از خارج نه، از داخل ایران بالا · up: برگشت با مدت قطعی.
 *            پیام به یاسر (TG_OWNER_CHAT) و هر کس نقش «تیم فنی» دارد (تب «افراد»).
 * تست: upTests (مجموعهٔ «پایش سایت»).
 */
var UP_TAB = 'پایش سایت';
var UP_HEAD = ['زمان', 'صفحه', 'کد', 'زمان پاسخ (میلی‌ثانیه)', 'سالم', 'خطا', 'ضربان داخل ایران (دقیقه پیش)'];
var UP_KEEP_DAYS = 30;
var UP_PAGES_FA = { 'home': 'صفحهٔ اصلی', 'get-therapy': 'شروع تراپی', 'mag': 'مطلب مجله' };
var UP_ROLE_TECH = 'تیم فنی';

function upDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function upSheet_() {
  var ss = tgSS_(), sh = ss.getSheetByName(UP_TAB);
  if (!sh) { sh = ss.insertSheet(UP_TAB); sh.getRange(1, 1, 1, UP_HEAD.length).setValues([UP_HEAD]).setFontWeight('bold'); sh.setFrozenRows(1); sh.setRightToLeft(true); }
  return sh;
}
function upRow_(x) {
  var t = Number(x.t) || Date.now();
  return [new Date(t), UP_PAGES_FA[String(x.key)] || String(x.key || '').slice(0, 20), Number(x.code) || 0, Math.max(0, Math.round(Number(x.ms) || 0)),
          x.ok === true ? 'بله' : 'نه', String(x.err || '').slice(0, 40), Number(x.beat) >= 0 ? Number(x.beat) : ''];
}
function upLog_(p, dry) {
  if (typeof ebiKey2Ok_ === 'function' && !ebiKey2Ok_(p && p.key)) return { ok: false, error: 'key2_only' };
  var L = Array.isArray(p.entries) ? p.entries.slice(0, 12) : [];
  if (dry) return { ok: true, data: { would: L.length } };
  var rows = L.map(upRow_);
  if (upDry_()) { (TG_MEM['up:rows'] = TG_MEM['up:rows'] || []).push.apply(TG_MEM['up:rows'], rows); upPrune_(); return { ok: true, data: { n: rows.length } }; }
  if (rows.length) { var sh = upSheet_(); sh.getRange(sh.getLastRow() + 1, 1, rows.length, UP_HEAD.length).setValues(rows); }
  upPrune_();
  return { ok: true, data: { n: rows.length } };
}
/* روزی یک بار: سطرهای قدیمی‌تر از ۳۰ روز پاک می‌شوند (سطرها به ترتیب زمان اضافه می‌شوند، پس از بالا) */
function upPrune_() {
  var cut = Date.now() - UP_KEEP_DAYS * 86400000;
  if (upDry_()) { TG_MEM['up:rows'] = (TG_MEM['up:rows'] || []).filter(function (r) { return r[0].getTime() >= cut; }); return; }
  var P = PropertiesService.getScriptProperties(), day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  if (P.getProperty('UP_PRUNE_DAY') === day) return;
  P.setProperty('UP_PRUNE_DAY', day);
  var sh = upSheet_(), n = sh.getLastRow(); if (n < 2) return;
  var v = sh.getRange(2, 1, n - 1, 1).getValues(), k = 0;
  while (k < v.length && v[k][0] instanceof Date && v[k][0].getTime() < cut) k++;
  if (k) sh.deleteRows(2, k);
}
function upRecipients_() {
  var out = []; if (TG_OWNER_CHAT) out.push(String(TG_OWNER_CHAT));
  try { tgPeopleList_().forEach(function (p) { if ((p.roles || []).indexOf(UP_ROLE_TECH) > -1 && p.chat && p.status !== 'غیرفعال') { var c = String(p.chat).split(/[,،;\s]+/)[0]; if (out.indexOf(c) < 0) out.push(c); } }); } catch (e) {}
  return out;
}
function upAlertText_(a) {
  var bad = (a.bad || []).map(function (b) { return '• ' + (UP_PAGES_FA[b.key] || tgEsc_(String(b.key))) + ' · ' + (b.code ? 'کد ' + tgFa_(String(b.code)) : (b.err === 'timeout' ? 'بی پاسخ در ۱۵ ثانیه' : 'خطای شبکه')) + (b.code === 200 && b.err ? ' · ' + tgEsc_(b.err) : ''); }).join('\n');
  if (a.kind === 'down') return '🔴 <b>سایت tajrobeh.life جواب درست نمی‌دهد</b>\nدو بار پشت سر هم (هر ۵ دقیقه یک سنجش):\n' + bad;
  if (a.kind === 'outside') return '🟠 <b>سایت از خارج ایران در دسترس نیست، ولی از داخل ایران بالاست</b>\nسرور سایت در ۱۵ دقیقهٔ اخیر از داخل ایران ضربان فرستاده، ولی سنجش از بیرون دو بار پشت سر هم ناموفق بود:\n' + bad;
  if (a.kind === 'up') return '🟢 <b>سایت برگشت</b>\nمدت قطعی: ' + tgFa_(String(Math.max(0, Number(a.mins) || 0))) + ' دقیقه';
  return '';
}
function upAlert_(p, dry) {
  if (typeof ebiKey2Ok_ === 'function' && !ebiKey2Ok_(p && p.key)) return { ok: false, error: 'key2_only' };
  var a = (p && p.alert) || {}, t = upAlertText_(a);
  if (!t) return { ok: false, error: 'kind' };
  var to = upRecipients_();
  if (dry) return { ok: true, data: { would: to.length } };
  to.forEach(function (c) { tgSend_(c, t); });
  try { upLog_({ key: p.key, entries: [{ t: Date.now(), key: 'هشدار ' + a.kind, code: 0, ms: 0, ok: a.kind === 'up', err: a.kind }] }, false); } catch (e) {}
  return { ok: true, data: { n: to.length } };
}
try {
  PB_ACTIONS.up_log = function (p, dry) { return upLog_(p, dry); };
  PB_ACTIONS.up_alert = function (p, dry) { return upAlert_(p, dry); };
  PB_RATE_BUCKET.up_log = ['upl', 'up_log_hourly_max', 60];
  PB_RATE_BUCKET.up_alert = ['upa', 'up_alert_hourly_max', 20];
  if (PB_WRITE.indexOf('up_log') < 0) PB_WRITE.push('up_log');
  if (PB_WRITE.indexOf('up_alert') < 0) PB_WRITE.push('up_alert');
} catch (eUp) {}

function upTests() {
  var pass = 0, fail = 0, text = [];
  function ok(name, c) { if (c) { pass++; text.push('✅ ' + name); } else { fail++; text.push('❌ ' + name); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, out: TG_OUTBOX, own: TG_OWNER_CHAT, k2: typeof ebiKey2Ok_ === 'function' ? ebiKey2Ok_ : null };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; TG_OWNER_CHAT = '900';
  ebiKey2Ok_ = function (k) { return k === 'K2'; };
  try {
    TG_MEM['people'] = [{ name: 'فنی نمونه', chat: '950', roles: [UP_ROLE_TECH] }, { name: 'پذیرش نمونه', chat: '951', roles: ['پذیرش'] }];
    ok('بی کلید دوم رد', upLog_({ key: 'x', entries: [] }).error === 'key2_only' && upAlert_({ key: 'x', alert: { kind: 'down' } }).error === 'key2_only');
    var now = Date.now();
    upLog_({ key: 'K2', entries: [{ t: now, key: 'home', code: 200, ms: 412, ok: true, beat: 3 }, { t: now, key: 'mag', code: 0, ms: 15000, ok: false, err: 'timeout', beat: -1 }] });
    var R = TG_MEM['up:rows'];
    ok('لاگ: صفحه، کد، زمان پاسخ، سالم', R.length === 2 && R[0][1] === 'صفحهٔ اصلی' && R[0][2] === 200 && R[0][3] === 412 && R[0][4] === 'بله' && R[1][4] === 'نه' && R[1][5] === 'timeout');
    TG_MEM['up:rows'].unshift([new Date(now - 31 * 86400000), 'صفحهٔ اصلی', 200, 300, 'بله', '', '']);
    upLog_({ key: 'K2', entries: [] });
    ok('فقط ۳۰ روز آخر می‌ماند', TG_MEM['up:rows'].length === 2);
    TG_OUTBOX = [];
    upAlert_({ key: 'K2', alert: { kind: 'down', bad: [{ key: 'home', code: 502 }] } });
    ok('قطعی: به یاسر و تیم فنی، نه بقیه', TG_OUTBOX.some(function (x) { return x.chat === '900'; }) && TG_OUTBOX.some(function (x) { return x.chat === '950'; }) && !TG_OUTBOX.some(function (x) { return x.chat === '951'; }));
    ok('متن قطعی: صفحه و کد', TG_OUTBOX[0].text.indexOf('صفحهٔ اصلی') > -1 && TG_OUTBOX[0].text.indexOf('۵۰۲') > -1);
    TG_OUTBOX = []; upAlert_({ key: 'K2', alert: { kind: 'outside', bad: [{ key: 'home', code: 0, err: 'timeout' }] } });
    ok('از خارج نه، از داخل بالا: صریح گفته می‌شود', TG_OUTBOX[0].text.indexOf('از خارج ایران در دسترس نیست') > -1 && TG_OUTBOX[0].text.indexOf('از داخل ایران بالاست') > -1);
    TG_OUTBOX = []; upAlert_({ key: 'K2', alert: { kind: 'up', mins: 25 } });
    ok('برگشت با مدت قطعی', TG_OUTBOX[0].text.indexOf('برگشت') > -1 && TG_OUTBOX[0].text.indexOf('۲۵') > -1);
    ok('هشدار هم در تب ثبت می‌شود', TG_MEM['up:rows'].some(function (r) { return r[1] === 'هشدار up'; }));
    ok('اکشن‌ها در درگاه ثبت شده‌اند', typeof PB_ACTIONS.up_log === 'function' && typeof PB_ACTIONS.up_alert === 'function' && PB_WRITE.indexOf('up_alert') > -1);
  } catch (e) { fail++; text.push('❌ خطا: ' + (e && e.message)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.out; TG_OWNER_CHAT = keep.own; if (keep.k2) ebiKey2Ok_ = keep.k2; }
  return { pass: pass, fail: fail, text: text.join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'upTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['پایش سایت', 'upTests']); } catch (eS) {}
