/**
 * migsms.gs · v170.41 · پیامک دعوت ورود به نسخهٔ ۲ برای یک موج مهاجرت (کار K05 اتاق نسخهٔ ۲؛ Issueهای ۸ و ۱۵ مخزن پل)
 *
 * همه‌چیز پشت MIG_ENABLED (تنظیمات خصوصی) که تا دروازهٔ ۳ خاموش می‌ماند. تا وقتی خاموش است هیچ پیامکی نمی‌رود و هیچ سطری
 * در هاب نوشته نمی‌شود؛ فقط گزارش «اگر روشن بود چه می‌رفت» (فقط کد M).
 * ۱) ورودی: برگهٔ «موج‌ها» در هاب مهاجرت؛ ردیف‌هایی که «کد مهاجرت» (یا «کد») و «موج» دارند. ردیف با «وضعیت» متوقف یا صبر رد می‌شود.
 *    شماره، نام و نام درمانگر فقط از برگهٔ «مراجعان» همان هاب و با همان کد خوانده می‌شود. مراجع باید «تأیید درمانگر» = فعال داشته باشد (D11).
 * ۲) MIG_TEST_PHONE: اگر پر بود، هر پیامک فقط به همین یک شماره می‌رود (حتی با کلید روشن) و نتیجه «آزمایشی» است؛ جلوی دعوت واقعی را نمی‌گیرد.
 * ۳) لینک ورود: migLoginLink_ از endpoint کار T10 (کلید V2DEV_LOGIN_LINK_URL). خالی یا بی‌پاسخ ← رد با «لینک نیست».
 * ۴) متن: پیامک دو بخشی C05 با نام درمانگر (تصمیم D37؛ حداکثر ۱۳۴ نویسه). بلندتر ← رد، تا سه بخشی نرود.
 * ۵) سقف روزانه: MIG_DAILY_CAP (پیش‌فرض ۵۰)؛ فرستاده و آزمایشی هر دو می‌شمارند. بقیه برای فردا می‌ماند.
 * ۶) هر ارسال یک سطر در برگهٔ «ارسال پیامک دعوت» هاب: کد مهاجرت، زمان، نتیجه، دلیل رد، موج، گیرنده (مراجع / شمارهٔ آزمایشی؛ بی شماره).
 * ۷) تکراری نه: کدی که «فرستاده شد» دارد دوباره نمی‌رود (و کدی که «آزمایشی» دارد دوباره به شمارهٔ آزمایشی نمی‌رود).
 * درگاه پیامک: هنوز انتخاب نشده (پرسش ۴ DATA-REQUEST مخزن پل). تا وصل شود migSmsGateway_ با «درگاه پیامک وصل نیست» رد می‌کند.
 * اجرا فقط دستی و فقط مالک: /migsms <موج>. هیچ کار زمان‌دار ندارد. در لاگ، خطا و گزارش فقط کد M می‌آید.
 */
MIG_TABS.s = 'ارسال پیامک دعوت';
var MIG_SMS_HEAD = ['کد مهاجرت', 'زمان', 'نتیجه', 'دلیل رد', 'موج', 'گیرنده'];
var MIG_SMS_R = { sent: 'فرستاده شد', test: 'آزمایشی', no: 'رد شد' };
var MIG_SMS_MAX = 134;
/* متن C05 (اتاق نسخهٔ ۲، کار C05؛ دو بخش با نام درمانگر طبق D37). فقط جاها پر می‌شود؛ متن عوض نمی‌شود. */
var MIG_SMS_TEXT = 'سلام {name}، جلسه‌های شما با {ther} محرمانه به نسخهٔ تازهٔ تجربه آمد. کیف پول هم همان‌جاست. ورود: {link}';
cfg_('MIG_TEST_PHONE', '');        /* فقط به همین شماره (آزمایش) */
cfg_('V2DEV_LOGIN_LINK_URL', '');  /* endpoint لینک ورود نسخهٔ ۲ (T10) */
cfg_('MIG_DAILY_CAP', '');         /* سقف روزانهٔ پیامک دعوت؛ خالی = ۵۰ */

function migSmsCap_() {
  var n = parseInt(tgLatinDigits_(String(cfg_('MIG_DAILY_CAP', '') || '').trim()), 10);
  return isNaN(n) || n < 0 ? 50 : n;
}
function migSmsTestPhone_() { var p = String(cfg_('MIG_TEST_PHONE', '') || '').trim(); return p ? migE164_(p) : ''; }

/** لینک ورود یک‌بارمصرف نسخهٔ ۲ برای یک شماره (T10). {ok, link} یا {ok:false, why} */
function migLoginLink_(phone) {
  var url = String(cfg_('V2DEV_LOGIN_LINK_URL', '') || '').trim();
  if (!url || !phone) return { ok: false, why: 'لینک نیست' };
  var l = '';
  if (migDry_()) { var f = TG_MEM['mig:linkfn']; l = typeof f === 'function' ? String(f(phone) || '') : ''; }
  else {
    try {
      var r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ phone: phone }), muteHttpExceptions: true });
      if (r.getResponseCode() === 200) { var j = JSON.parse(r.getContentText() || '{}'); l = String(j.url || j.link || ''); }
    } catch (e) { l = ''; }
  }
  l = l.trim();
  return /^https?:\/\/|^[\w.-]+\.[a-z]{2,}\//i.test(l) ? { ok: true, link: l.replace(/^https?:\/\//i, '') } : { ok: false, why: 'لینک نیست' };
}

/** متن پیامک C05 یا null اگر از دو بخش (۱۳۴ نویسه) بیشتر شود */
function migSmsText_(name, ther, link) {
  var t = MIG_SMS_TEXT.replace('{name}', migFirst_(name)).replace('{ther}', String(ther || '').trim()).replace('{link}', link);
  return t.length <= MIG_SMS_MAX ? t : null;
}

/** درگاه پیامک. هنوز انتخاب نشده؛ تا وصل شود هیچ پیامکی نمی‌رود. */
function migSmsGateway_(to, text) {
  if (migDry_()) { (TG_MEM['mig:sms'] = TG_MEM['mig:sms'] || []).push({ to: to, text: text }); return { ok: true }; }
  return { ok: false, why: 'درگاه پیامک وصل نیست' };
}

function migSmsLog_() {
  if (!migDry_()) {
    var ss = migSS_();
    if (!ss.getSheetByName(MIG_TABS.s)) { var sh = ss.insertSheet(MIG_TABS.s); sh.getRange(1, 1, 1, MIG_SMS_HEAD.length).setValues([MIG_SMS_HEAD]); sh.setFrozenRows(1); }
  }
  return migTab_('s');
}

/** یک موج: فرستادن، یا (کلید خاموش) فقط پیش‌نمایش. {on, test, sent, rows: [{code, why}], left} */
function migSmsWave_(wave) {
  wave = tgLatinDigits_(String(wave || '').trim());
  var on = migOn_(), test = migSmsTestPhone_(), cap = migSmsCap_(), today = migFmt_().slice(0, 10);
  var out = { on: on, test: !!test, sent: 0, rows: [], left: 0 };
  if (!wave) return out;
  var lock = null;
  if (on && !migDry_()) { lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) { out.busy = true; return out; } }
  try {
    var W = migTab_('w').rows.filter(function (r) { return tgLatinDigits_(r['موج']) === wave && (r['کد مهاجرت'] || r['کد']); });
    var L = on ? migSmsLog_() : { rows: [] };
    var done = function (c, res) { return L.rows.some(function (x) { return x['کد مهاجرت'] === c && x['نتیجه'] === res; }); };
    var used = L.rows.filter(function (x) { return String(x['زمان']).slice(0, 10) === today && (x['نتیجه'] === MIG_SMS_R.sent || x['نتیجه'] === MIG_SMS_R.test); }).length;
    W.forEach(function (w) {
      var code = String(w['کد مهاجرت'] || w['کد']).trim(), o = migFind_(code), why = '';
      if (/متوقف|صبر/.test(w['وضعیت'] || '')) why = 'موج برای این کد متوقف است';
      else if (!o) why = 'کد در مراجعان نیست';
      else if (o['تأیید درمانگر'] !== MIG_ANS.a || [MIG_ST.stop, MIG_ST.follow].indexOf(o['وضعیت']) > -1) why = 'درمانگر تأیید نکرده یا متوقف';
      else if (!migE164_(o['شمارهٔ تماس (E.164)'])) why = 'شماره نیست';
      else if (done(code, MIG_SMS_R.sent) || (test && done(code, MIG_SMS_R.test))) { out.rows.push({ code: code, why: 'تکراری' }); return; }
      if (why) { out.rows.push({ code: code, why: why }); if (on) L.add({ 'کد مهاجرت': code, 'زمان': migFmt_(), 'نتیجه': MIG_SMS_R.no, 'دلیل رد': why, 'موج': wave, 'گیرنده': '' }); return; }
      if (used >= cap) { out.left++; out.rows.push({ code: code, why: 'سقف روزانه' }); return; }
      if (!on) {
        /* خاموش: endpoint لینک صدا زده نمی‌شود و چیزی نوشته نمی‌شود */
        why = String(cfg_('V2DEV_LOGIN_LINK_URL', '') || '').trim() ? '' : 'لینک نیست';
        out.rows.push({ code: code, why: why || ('می‌رفت' + (test ? ' (به شمارهٔ آزمایشی)' : '')) }); if (!why) used++;
        return;
      }
      var to = test || migE164_(o['شمارهٔ تماس (E.164)']);
      var lk = migLoginLink_(migE164_(o['شمارهٔ تماس (E.164)'])), txt = lk.ok ? migSmsText_(o['نام'], o['درمانگر'], lk.link) : null, g = null;
      if (!lk.ok) why = lk.why;
      else if (!txt) why = 'متن از دو بخش بلندتر است';
      else { try { g = migSmsGateway_(to, txt); } catch (e) { g = { ok: false, why: 'خطای درگاه' }; tgErr_('migSmsWave_', 'خطای درگاه پیامک', code); } if (!g.ok) why = g.why || 'خطای درگاه'; }
      var res = why ? MIG_SMS_R.no : test ? MIG_SMS_R.test : MIG_SMS_R.sent;
      L.add({ 'کد مهاجرت': code, 'زمان': migFmt_(), 'نتیجه': res, 'دلیل رد': why, 'موج': wave, 'گیرنده': test ? 'شمارهٔ آزمایشی' : 'مراجع' });
      if (!why) {
        used++; out.sent++;
        if (!test) migSet_(o, { 'وضعیت': MIG_ST.inv, 'مسیر دعوت': 'پیامک', 'تاریخ دعوت': migFmt_() });
      }
      out.rows.push({ code: code, why: why || res });
    });
  } finally { if (lock) lock.releaseLock(); }
  return out;
}

/** گزارش کوتاه برای مالک؛ فقط کد M */
function migSmsReport_(wave, r) {
  var head = r.on ? (r.test ? '🧪 پیامک دعوت موج ' + tgFa_(wave) + ' (فقط شمارهٔ آزمایشی)' : '📨 پیامک دعوت موج ' + tgFa_(wave))
    : '⏸ پیامک دعوت موج ' + tgFa_(wave) + ': مهاجرت خاموش است (MIG_ENABLED). چیزی نرفت؛ اگر روشن بود:';
  if (r.busy) return 'اجرای دیگری در جریان است؛ کمی بعد دوباره.';
  if (!r.rows.length) return head + '\nردیفی با این موج در «موج‌ها» نیست.';
  return head + '\n' + r.rows.map(function (x) { return '• ' + tgEsc_(x.code) + ': ' + tgEsc_(x.why); }).join('\n') +
    (r.on ? '\nرفت: ' + tgFa_(r.sent) : '') + (r.left ? '\nماند برای فردا (سقف روزانه): ' + tgFa_(r.left) : '');
}
function migSmsCmd_(chat, t) {
  var m = String(t || '').match(/^\/migsms(?:@\w+)?(?:\s+(\S+))?$/); if (!m) return false;
  if (String(chat) !== String(TG_OWNER_CHAT)) return false;
  if (!m[1]) { tgSend_(chat, 'شمارهٔ موج را بنویسید: /migsms ۱'); return true; }
  try { tgSend_(chat, migSmsReport_(m[1], migSmsWave_(m[1]))); } catch (e) { tgErr_('migSmsCmd_', String(e && e.message || e).replace(/\+?\d{9,}/g, '…')); tgSend_(chat, 'خطا در پیامک دعوت؛ در برگهٔ خطاها ثبت شد.'); }
  return true;
}

/* ───── آزمون ───── */
function migSmsTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT };
  var day1 = new Date('2026-10-20T10:00:00+03:30').getTime();
  var seed = function () {
    TG_MEM = { 'mig:now': day1, 'mig:linkfn': function (p) { return 'https://t.example/' + p.slice(-3); } };
    TG_MEM['mig:c'] = ['1', '2', '3'].map(function (i) {
      return { 'کد مهاجرت': 'M-000' + i, 'وضعیت': MIG_ST.time, 'نام': 'مراجع' + i + ' نمونه', 'شمارهٔ تماس (E.164)': '+98900000000' + i, 'درمانگر': 'درمانگر نمونه', 'شناسهٔ درمانگر (P)': 'P-1', 'تأیید درمانگر': MIG_ANS.a };
    });
    TG_MEM['mig:w'] = [{ 'موج': '1', 'تاریخ شروع': '2026-10-20' }, { 'کد مهاجرت': 'M-0001', 'موج': '1', 'وضعیت': '' }, { 'کد مهاجرت': 'M-0002', 'موج': '۱', 'وضعیت': '' }, { 'کد مهاجرت': 'M-0003', 'موج': '1', 'وضعیت': '' }];
  };
  var sms = function () { return TG_MEM['mig:sms'] || []; }, log = function () { return TG_MEM['mig:s'] || []; };
  TG_DRY = true; TG_OUTBOX = []; TG_OWNER_CHAT = '7';
  try {
    /* کلید خاموش */
    seed(); TG_CFG_ = { MIG_ENABLED: '', V2DEV_LOGIN_LINK_URL: 'https://t.example/api', MIG_TEST_PHONE: '' };
    var r = migSmsWave_('1');
    ok('خاموش: هیچ پیامکی نمی‌رود و هاب نوشته نمی‌شود', !r.on && sms().length === 0 && log().length === 0 && r.rows.length === 3);
    ok('خاموش: گزارش «اگر روشن بود» فقط با کد M', r.rows.every(function (x) { return x.why === 'می‌رفت'; }) && (migSmsCmd_('7', '/migsms 1'), /خاموش/.test(TG_OUTBOX.pop().text)));
    ok('دستور فقط برای مالک', migSmsCmd_('8', '/migsms 1') === false);
    /* شمارهٔ آزمایشی، حتی با کلید روشن */
    seed(); TG_CFG_ = { MIG_ENABLED: 'بله', V2DEV_LOGIN_LINK_URL: 'https://t.example/api', MIG_TEST_PHONE: '0900' + '0000099' };   // pii:ok ساختگی
    r = migSmsWave_('1');
    ok('آزمایشی: همه فقط به شمارهٔ آزمایشی', sms().length === 3 && sms().every(function (x) { return x.to === '+98900' + '0000099'; }) && log().every(function (x) { return x['نتیجه'] === MIG_SMS_R.test; }));
    ok('آزمایشی: وضعیت مراجع «دعوت شد» نمی‌شود', TG_MEM['mig:c'].every(function (o) { return o['وضعیت'] === MIG_ST.time; }));
    ok('متن C05 دو بخشی با نام کوچک و نام درمانگر', /^سلام مراجع1، جلسه‌های شما با درمانگر نمونه .*ورود: t\.example\/001$/.test(sms()[0].text) && sms()[0].text.length <= 134, sms()[0] && sms()[0].text);
    ok('سطر هاب بی شماره و بی نام', JSON.stringify(log()).indexOf('9000') < 0 && JSON.stringify(log()).indexOf('مراجع1') < 0 && log()[0]['گیرنده'] === 'شمارهٔ آزمایشی');
    migSmsWave_('1');
    ok('آزمایشی تکراری دوباره نمی‌رود', sms().length === 3);
    /* سقف روزانه */
    seed(); TG_CFG_ = { MIG_ENABLED: 'بله', V2DEV_LOGIN_LINK_URL: 'https://t.example/api', MIG_DAILY_CAP: '۲' };
    r = migSmsWave_('1');
    ok('سقف روزانه: ۲ رفت، ۱ ماند', r.sent === 2 && r.left === 1 && sms().length === 2 && log().length === 2);
    ok('ارسال واقعی ← «۵ دعوت شد» با مسیر پیامک', TG_MEM['mig:c'][0]['وضعیت'] === MIG_ST.inv && TG_MEM['mig:c'][0]['مسیر دعوت'] === 'پیامک' && sms()[0].to === '+989000000001');
    TG_MEM['mig:now'] = day1 + 24 * 3600000; r = migSmsWave_('1');
    /* تکراری */
    ok('فردا: باقی‌مانده می‌رود و تکراری‌ها نه', r.sent === 1 && sms().length === 3 && r.rows.filter(function (x) { return x.why === 'تکراری'; }).length === 2);
    r = migSmsWave_('1');
    ok('تکراری: هیچ ارسالی دوباره نمی‌رود', r.sent === 0 && sms().length === 3 && r.rows.every(function (x) { return x.why === 'تکراری'; }));
    /* لینک خالی */
    seed(); TG_CFG_ = { MIG_ENABLED: 'بله', V2DEV_LOGIN_LINK_URL: '' };
    r = migSmsWave_('1');
    ok('لینک خالی: رد با «لینک نیست» و سطر هاب', r.sent === 0 && sms().length === 0 && log().length === 3 && log().every(function (x) { return x['نتیجه'] === MIG_SMS_R.no && x['دلیل رد'] === 'لینک نیست'; }));
    ok('تابع لینک بی کلید ← «لینک نیست»', migLoginLink_('+989000000001').why === 'لینک نیست');
    seed(); TG_CFG_ = { MIG_ENABLED: 'بله', V2DEV_LOGIN_LINK_URL: 'https://t.example/api' }; TG_MEM['mig:linkfn'] = function () { return ''; };
    ok('endpoint بی لینک ← «لینک نیست»', migSmsWave_('1').rows.every(function (x) { return x.why === 'لینک نیست'; }) && sms().length === 0);
    /* درمانگر تأیید نکرده و متن بلند */
    seed(); TG_CFG_ = { MIG_ENABLED: 'بله', V2DEV_LOGIN_LINK_URL: 'https://t.example/api' };
    TG_MEM['mig:c'][0]['تأیید درمانگر'] = ''; TG_MEM['mig:c'][1]['درمانگر'] = 'نام بسیار بسیار بلند درمانگر نمونه برای آزمون طول متن پیامک';
    r = migSmsWave_('1');
    ok('بی تأیید درمانگر و متن بلند رد می‌شوند', r.sent === 1 && /تأیید/.test(r.rows[0].why) && /بلندتر/.test(r.rows[1].why));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'migSmsTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['پیامک دعوت مهاجرت (K05، v170.41)', 'migSmsTests']); } catch (eMs) {}
