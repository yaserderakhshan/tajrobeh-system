/**
 * sec.gs · v170.9 · ۱۲ مهر ۱۴۰۵ · تست درخواست‌های جعلی (پیش از عمومی شدن مخزن)
 * فرض: مهاجم همهٔ کد و نشانی /exec را دارد. هر درخواست جعلی باید رد شود:
 * - آپدیت تلگرام بی رمز رله، با رمز غلط، یا وقتی رمزی در Script Properties نیست (بسته در حالت خطا)
 * - initData مینی‌اپ با امضای غلط، بی auth_date، کهنه، یا بی کاربر؛ chat فقط از initData امضاشده
 * - یوزرنیم ردیفی که به chat دیگری وصل است (یوزرنیم قابل بازیافت است)
 * - کارهای مدیریتی (تأیید پرداخت، «✅ اجرا»، برگرداندن لیدها، صف ارسال، تأیید پروفایل) از chat غیرمالک
 * - فرم و کلیک سایت بی امضا (وقتی SITE_SIG_ENFORCE روشن است) و بازپخش امضا (ssTests)
 */
function secTests() {
  var out = [], pass = 0, fail = 0;
  var ok = function (t, c) { if (c) pass++; else { fail++; out.push('❌ ' + t); } };
  var was = TG_DRY, keepH = tgHandle; TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var handled = 0;
  try {
    /* ۱) وبهوک تلگرام */
    tgHandle = function () { handled++; };
    var upd = JSON.stringify({ update_id: 1, callback_query: { id: 'q', from: { id: Number(TG_OWNER_CHAT) || 1 }, message: { chat: { id: Number(TG_OWNER_CHAT) || 1 } }, data: 'lm:go' } });
    TG_MEM['hooksec'] = 'S'.repeat(32);
    doPost({ postData: { contents: upd }, parameter: {} });
    ok('آپدیت تلگرام بی رمز رله رد می‌شود (و ثبت می‌شود)', handled === 0 && (TG_MEM['errs'] || []).some(function (x) { return /webhook secret mismatch/.test(x); }));
    doPost({ postData: { contents: upd }, parameter: { t: 'S'.repeat(31) + 'x' } });
    ok('آپدیت تلگرام با رمز غلط رد می‌شود', handled === 0);
    TG_MEM['hooksec'] = '';
    doPost({ postData: { contents: upd }, parameter: { t: '' } });
    ok('بی رمز در Script Properties هیچ آپدیتی پذیرفته نمی‌شود (بسته در حالت خطا)', handled === 0);
    TG_MEM['hooksec'] = 'S'.repeat(32);
    doPost({ postData: { contents: upd }, parameter: { t: 'S'.repeat(32) } });
    ok('آپدیت با رمز درست پذیرفته می‌شود', handled === 1);
    doPost({ postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [] }) }, parameter: {} });
    ok('واتساپ بی رمز رله رد می‌شود', handled === 1);
    tgHandle = keepH;
    ok('مقایسهٔ زمان‌ثابت: برابر و نابرابر و خالی', tgSafeEq_('abc', 'abc') && !tgSafeEq_('abc', 'abd') && !tgSafeEq_('', '') && !tgSafeEq_('abc', ''));

    /* ۲) initData مینی‌اپ */
    var TOK = '123456:TEST-token-for-security-tests';
    var mk = function (fields, badHash) {
      var pairs = Object.keys(fields).map(function (k) { return k + '=' + fields[k]; }).sort();
      var secret = Utilities.computeHmacSha256Signature(Utilities.newBlob(TOK).getBytes(), Utilities.newBlob('WebAppData').getBytes());
      var sig = Utilities.computeHmacSha256Signature(Utilities.newBlob(pairs.join('\n')).getBytes(), secret);
      var hex = sig.map(function (b) { var h = ((b + 256) % 256).toString(16); return h.length < 2 ? '0' + h : h; }).join('');
      if (badHash) hex = hex.replace(/./g, '0');
      return Object.keys(fields).map(function (k) { return k + '=' + encodeURIComponent(fields[k]); }).join('&') + '&hash=' + hex;
    };
    var now = Math.floor(Date.now() / 1000), user = JSON.stringify({ id: 4242, first_name: 'x' });
    var good = tgVerifyInitData_(mk({ auth_date: String(now), user: user }), TOK);
    ok('initData درست، chat همان کاربر امضاشده است', good && good.id === 4242);
    ok('initData با امضای غلط رد می‌شود', tgVerifyInitData_(mk({ auth_date: String(now), user: user }, true), TOK) === null);
    ok('initData بی auth_date رد می‌شود', tgVerifyInitData_(mk({ user: user }), TOK) === null);
    ok('initData کهنه‌تر از ۲۴ ساعت رد می‌شود', tgVerifyInitData_(mk({ auth_date: String(now - 90000), user: user }), TOK) === null);
    ok('initData بی کاربر هویت نمی‌دهد', tgVerifyInitData_(mk({ auth_date: String(now) }), TOK) === null);
    var tampered = mk({ auth_date: String(now), user: user }).replace('4242', '9999');
    ok('دست‌بردن در chat داخل initData رد می‌شود', tgVerifyInitData_(tampered, TOK) === null);

    /* ۳) یوزرنیم ردیف وصل‌شده را نمی‌دزدد */
    var same = function (a, b) { return String(a) === String(b); };
    var L = [{ name: 'الف', user: 'staff_a', chat: '111' }, { name: 'ب', user: 'staff_b', chat: '' }];
    ok('یوزرنیم ردیفی که به chat دیگری وصل است، نقش نمی‌دهد', tgIdMatch_(L, '222', 'staff_a', same) === null);
    ok('chat درست نقش می‌دهد', tgIdMatch_(L, '111', '', same).row.name === 'الف');
    var mb = tgIdMatch_(L, '333', 'staff_b', same);
    ok('ردیف بی chat با یوزرنیم وصل می‌شود (bind)', mb && mb.row.name === 'ب' && mb.bind === true);

    /* ۴) کارهای مدیریتی فقط برای chat مالک */
    var STR = '7000099';
    TG_OUTBOX = []; tgCpPayDecide_(STR, 'P-1', true, 0);
    ok('تأیید پرداخت از chat غیرمالک رد می‌شود', JSON.stringify(TG_OUTBOX).indexOf('فقط با یاسر') > -1);
    TG_OUTBOX = []; lmCb_(STR, 'lm:go');
    ok('«✅ اجرا»ی مدل لید از chat غیرمالک رد می‌شود', !lmOn_());
    if (typeof lmRestore_ === 'function') {   /* از v170.6 */
      TG_MEM['stkp:LM_BAK'] = 'x'; TG_OUTBOX = []; TG_MEM['deskwho'] = { name: 'پذیرش', role: 'پذیرش', chat: STR }; lmCb_(STR, 'lm:rbok');
      ok('برگرداندن لیدها از کاربر پذیرش (غیرمالک) رد می‌شود', JSON.stringify(TG_OUTBOX).indexOf('فقط برای یاسر') > -1);
      TG_MEM['deskwho'] = null;
    }
    if (typeof pfCb_ === 'function') {   /* از v171.0 */
      TG_OUTBOX = []; pfCb_(STR, 'mp:ok:site:ther:x');
      ok('تأیید پروفایل از غریبه رد می‌شود', JSON.stringify(TG_OUTBOX).indexOf('برای تیم است') > -1);
    }
    if (typeof dqCb_ === 'function') {
      TG_OUTBOX = []; var dr = dqCb_(STR, 'dq:go:Q-1');
      ok('صف ارسال (پیام گروهی مدیریت) از chat غیرمالک کاری نمی‌کند', !JSON.stringify(TG_OUTBOX).match(/بفرست|فرستاده شد/) );
    }

    /* ۵) API عمومی داده‌ای غیرعمومی برنمی‌گرداند */
    var keepAnn = tgAnnRows_;
    tgAnnRows_ = function () { return [{ num: 1, status: 'منتشر', aud: 'همه', title: 'عمومی' }, { num: 2, status: 'منتشر', aud: 'درمانگران', title: 'داخلی' }]; };
    var an = tgApiAnn_({});
    tgAnnRows_ = keepAnn;
    ok('اطلاعیهٔ داخلی بی initData تیم برنمی‌گردد', an.items.length === 1 && an.items[0].title === 'عمومی');
    TG_MEM['thpub'] = [{ name: 'درمانگر منتشرشده' }];
    var th = tgApiTher_({ name: 'درمانگر منتشرنشده' }), tl = tgApiTher_({});
    ok('درمانگر منتشرنشده در API عمومی نیست', th.ok === false && tl.names.length === 1 && tl.names[0] === 'درمانگر منتشرشده');
    var keepPa = tgPaRows_;
    tgPaRows_ = function () { return [{ 'شناسه مکان': 'x1', 'وضعیت': 'فعال', 'مسئول': 'نام مسئول', 'شهر': 'تهران' }]; };
    var pa = null; try { pa = tgApiPartners_({}); } catch (eP) {}
    tgPaRows_ = keepPa;
    ok('API پارتنرها نام مسئول را برنمی‌گرداند', !pa || JSON.stringify(pa).indexOf('نام مسئول') < 0);
    var okN = 0; for (var v = 0; v < 35; v++) if (tgCvRate_()) okN++;
    ok('رأی شهر بیش از ۳۰ در دقیقه پذیرفته نمی‌شود', okN === 30);
  } catch (e) { fail++; out.push('❌ خطا: ' + e + (e.stack ? ' ' + String(e.stack).split('\n')[1] : '')); }
  tgHandle = keepH; TG_DRY = was; TG_MEM = {}; TG_OUTBOX = [];
  Logger.log('امنیت ورودی‌ها: ' + pass + ' قبول، ' + fail + ' مردود\n' + out.join('\n'));
  return { pass: pass, fail: fail, out: out };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'secTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['امنیت ورودی‌ها (v170.9)', 'secTests']); } catch (eSec) {}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'secReferTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['امنیت ارجاع لید (v170.23.37)', 'secReferTests']); } catch (eSr) {}
