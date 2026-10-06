/**
 * تجربه — دریافت‌کننده‌ی وبهوک (تلگرام + فرم‌های وردپرس + واتس‌اپ)
 * نسخهٔ شهریور ۱۴۰۵ — بازنویسی مسیریابی
 *
 * قاعدهٔ مهم: تشخیص تلگرام فقط با update_id است.
 * قبلاً با body.message تشخیص داده می‌شد و چون فرم‌های وردپرس هم فیلدی به نام
 * message دارند، لیدهای سایت وارد هندلر تلگرام می‌شدند و گم می‌شدند.
 */

// ─── تنظیمات خصوصی (v170.8) ─────────────────────────────────
/* شناسهٔ شیت‌ها، درایو، تقویم‌ها، chat مالک، سهم‌ها و بازهٔ نرخ دیگر در کد نمی‌مانند (پیش از عمومی شدن مخزن).
   منبع زمان اجرا: Script Property «TG_CFG» (یک JSON). منبع ویرایش: تب پنهان و قفل «تنظیمات خصوصی بات» در هاب، که هر ساعت
   (و بعد از هر ویرایش با tgCfgSync) در همان Property می‌نشیند. از v170.9 مقدار دوم cfg_ فقط پیش‌فرض خالی است؛ هیچ مقدار واقعی در کد نیست. */
var TG_CFG_ = null, TG_CFG_SEEN = {};
function cfgAll_() {
  if (TG_CFG_) return TG_CFG_;
  var o = {};
  try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty('TG_CFG') || '{}') || {}; } catch (e) { o = {}; }
  TG_CFG_ = o; return o;
}
function cfg_(k, dflt) {
  if (!(k in TG_CFG_SEEN)) TG_CFG_SEEN[k] = dflt;
  var v = cfgAll_()[k];
  return (v === undefined || v === null || v === '') ? dflt : v;
}
/* عدد پول با جداکنندهٔ هزارگان و رقم فارسی (برای متن بازهٔ نرخ) */
/* v170.14: نام همکاران در کد نیست (مخزن عمومی). منبع: کلید TG_NAMES (JSON) در «تنظیمات خصوصی بات»؛ رفتار همان است.
   کلیدها: reception، reception_lat، school، school_full، school_user، chief، chief_full، psy، desk3، psy_dr، ap_sup */
var TG_NAMES_ = cfg_('TG_NAMES', {});
function tgNm_(k) { var o = cfg_('TG_NAMES', {}) || {}; return String(o[k] == null ? '' : o[k]); }
function cfgFaMoney_(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '٬').replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }

// ─── تنظیمات ────────────────────────────────────────────────
var SHEET_ID   = cfg_('TG_SHEET_ID', '');
var TAB_LEADS  = 'لیدها';
var TAB_INBOX  = 'WhatsApp Inbox';
var TIMEZONE   = 'Asia/Tehran';

var AUTO_REPLY_ENABLED = true;
var AUTO_REPLY_TEXT =
  'سلام 🍓 به مرکز تجربه زندگی خوش آمدید.\n\n' +
  'پیام شما رسید. همکاران پذیرش در ساعت کاری (۹:۳۰ تا ۱۷:۳۰ به وقت تهران) پاسخ می‌دهند.\n\n' +
  'اگر می‌خواهید مسیر تراپی را شروع کنید، از این‌جا ثبت‌نام کنید:\n' +
  'https://tajrobeh.life\n\n' +
  'در کنار شما هستیم.';

// اولین تابع فایل تا در انتخابگر Run پیش‌فرض باشد و تست‌ها همیشه از همین‌جا اجرا شوند
function runAllTests() { tgRun(); }

// ─── ۱) تأیید وبهوک توسط متا (GET) ──────────────────────────
function doGet(e) {
  var p = (e && e.parameter) || {};
  var props = PropertiesService.getScriptProperties();
  if (p.api) return tgApiRoute_(p);
  if (p.vxp === 'ed' && typeof vxPage_ === 'function') return vxPage_(p);   /* v166: صفحهٔ بررسی اصلاحات بازبینی */
  if (p.rmfile) return tgRmFileOut_(p.rmfile);
  if (p['hub.mode'] === 'subscribe' && p['hub.verify_token'] === props.getProperty('VERIFY_TOKEN')) {
    return ContentService.createTextOutput(p['hub.challenge']);
  }
  return ContentService.createTextOutput('ok');
}

// ─── ۲) دریافت رویداد (POST) ────────────────────────────────
function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    var body = null;
    try { body = JSON.parse(raw); } catch (x) { body = null; }

    // فرم‌های x-www-form-urlencoded (بعضی افزونه‌ها این‌طور می‌فرستند)
    if (!body && e && e.parameter && Object.keys(e.parameter).length) body = e.parameter;
    if (!body) return okJson_();

    if ((body.api === 1 || body.api === '1') && typeof tgApiGateway_ === 'function') return tgApiGateway_(body);   /* v167: درگاه انتشار (publish.gs) */
    if (body.api) return tgApiRoute_(body);
    if (body.ci && typeof ciRoute_ === 'function') return ciRoute_(body);   /* v166.7: مسیر دیپلوی خودکار (ci.gs) */
    if (body.vxkey && typeof vxKeyIn_ === 'function') { vxKeyIn_(body); return okJson_(); }   /* v166: کلید Auphonic، یک‌بار */

    if (body.update_id !== undefined) {
      // ↓ تلگرام
      var secret = tgHookSecret_(); // کش‌شده؛ PropertiesService در هر پیام کند است
      var given  = (e && e.parameter && e.parameter.t) || '';
      // رله رمز را به‌صورت ?t= می‌فرستد؛ بدون رمز یا با رمز غلط، آپدیت پذیرفته نمی‌شود
      /* v170.9 (امنیت): بسته در حالت خطا؛ بی رمز در Script Properties هیچ آپدیتی پذیرفته نمی‌شود، مقایسه زمان‌ثابت */
      if (!secret || !tgSafeEq_(given, secret)) { logError_('webhook secret mismatch', e); return okJson_(); }
      /* v166.29.1: پینگ سلامت از tgWatchdog که از همان مسیر رلهٔ کلادفلر آمده؛ آپدیت تلگرام نیست */
      if (body.tj_ping) { PropertiesService.getScriptProperties().setProperty('TG_RELAY_PONG', String(Date.now())); return okJson_(); }
      tgHandle(body);
    } else if (body.kind === 'wp_sec') {
      /* v170.12: هشدار ورود مدیر و کد ورود دومرحله‌ای از وردپرس؛ فقط با امضای درست (sitesec.gs) */
      if (typeof wpSecIn_ === 'function') wpSecIn_(e, raw, body);
    } else if (body.kind === 'click') {
      // کلیک روی واتساپ / تلگرام / تلفن در سایت
      if (typeof ssGate_ === 'function' && !ssGate_(e, raw)) return okJson_();   /* v170.9 (از PR #73): امضای ورودی سایت */
      if (typeof ssClean_ === 'function') body = ssClean_(body);
      handleContactClick_(body);
    } else if (body.object === 'whatsapp_business_account') {
      // فقط از مسیر رله، با همان رمز وبهوک
      var waSec = tgHookSecret_();
      var waGiven = (e && e.parameter && e.parameter.t) || '';
      if (!waSec || !tgSafeEq_(waGiven, waSec)) { logError_('whatsapp secret mismatch', e); return okJson_(); }
      if (typeof ssClean_ === 'function') body = ssClean_(body);   /* v170.9 (از PR #73): خنثی کردن فرمول */
      handleWhatsApp_(body);
    } else {
      if (typeof ssGate_ === 'function' && !ssGate_(e, raw)) return okJson_();   /* v170.9 (از PR #73): امضای ورودی سایت */
      if (typeof ssClean_ === 'function') body = ssClean_(body);
      handleWebForm_(body);
    }
  } catch (err) {
    logError_(err, e);
  }
  return okJson_();
}

// رمز وبهوک را ۶ ساعت در CacheService نگه می‌دارد تا هر پیام سراغ PropertiesService نرود
function tgHookSecret_() {
  if (typeof TG_DRY !== 'undefined' && TG_DRY && TG_MEM['hooksec'] !== undefined) return TG_MEM['hooksec'];
  var c = CacheService.getScriptCache();
  var s = c.get('hooksec');
  if (!s) {   /* v170.9: مقدار خالی کش نمی‌شود */
    s = PropertiesService.getScriptProperties().getProperty('TG_HOOK_SECRET') || '';
    if (s) c.put('hooksec', s, 21600);
  }
  return s;
}
/* v170.9: مقایسهٔ زمان‌ثابت دو رشته (روی هش SHA-256 هر دو، تا طول هم چیزی لو ندهد) */
function tgSafeEq_(a, b) {
  a = String(a == null ? '' : a); b = String(b == null ? '' : b);
  if (!a || !b) return false;
  var h = function (s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8); };
  var x = h(a), y = h(b), d = 0;
  for (var i = 0; i < x.length; i++) d |= (x[i] ^ y[i]);
  return d === 0;
}

function okJson_() {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
                       .setMimeType(ContentService.MimeType.JSON);
}

// ─── ۳) پیام ورودی واتس‌اپ ──────────────────────────────────
function handleWhatsApp_(body) {
  // v92: پیام ورودی واتس‌اپ وارد همان چرخهٔ لید می‌شود (tgWaOn_ در telegram.gs)
  if (typeof tgWaOn_ === 'function') return tgWaOn_(body);
  logError_('tgWaOn_ در دسترس نیست؛ پیام واتس‌اپ پردازش نشد', null);
}

function extractText_(m) {
  if (m.text && m.text.body) return m.text.body;
  if (m.button && m.button.text) return m.button.text;
  if (m.interactive) {
    var it = m.interactive;
    if (it.button_reply) return it.button_reply.title;
    if (it.list_reply)   return it.list_reply.title;
  }
  return '[' + (m.type || 'unknown') + ']';
}

// ─── ۴) فرم وردپرس (Fluent Forms و مشابه) ───────────────────
function handleWebForm_(body) {
  var flat  = flatten_(body);
  var now   = new Date();

  var phone = String(pickKey_(flat, ['phone', 'mobile', 'tel', 'whatsapp', 'شماره', 'موبایل', 'number']) || '');
  var name  = String(pickKey_(flat, ['first_name', 'full_name', 'fullname', 'names', 'نام']) || '');
  if (!name) name = String(pickKey_(flat, ['name']) || '');
  var msg   = String(pickKey_(flat, ['message', 'note', 'توضیح', 'متن', 'best_time', 'time']) || '');
  var email = String(pickKey_(flat, ['email', 'ایمیل']) || '');
  // کانال ترجیحی که خود مراجع در فرم انتخاب می‌کند (تلگرام، واتس‌اپ، تماس تلفنی)
  var pref  = String(pickKey_(flat, ['pref_channel', 'preferred_channel', 'کانال ترجیحی', 'راه ارتباط']) || '').trim();
  // v168.9: «کشور محل زندگی» و «از کجا با ما آشنا شدید؟» (ستون‌های تازهٔ انتهای «لیدها»)
  var lf = typeof v1689WebFields_ === 'function' ? v1689WebFields_(flat) : null;

  // فرم آزمایشی را وارد کارتابل نکن: نه سطر، نه کارت، نه پیام (پیش از مسیر مدرسه و پرونده‌های تکراری، پس برای همهٔ فرم‌های سایت)
  if (isTestLead_(name, phone, email, flat)) { logError_('فرم تستی نادیده گرفته شد', null); return; }

  var page  = String(flat['source_page'] || flat['_wp_http_referer'] || flat['__fluent_form_embded_post_id'] || '');
  var form  = String(pickKey_(flat, ['form_title', 'form_name']) || '');

  // منبعی که وردپرس می‌فرستد مقدم است: الگوی «سایت › بخش › فرم» بخش و مسئول پیگیری را
  // در تب «کارتابل پیگیری» تعیین می‌کند. هرگز آن را بازنویسی نکن.
  var src   = String(flat['source'] || '').trim();
  if (!src) src = 'سایت' + (form ? ' — ' + form : (page ? ' — ' + page : ''));

  // پیلودی که نه نام دارد نه شماره لید نیست (پینگ، تست، فراخوانی اشتباه)
  if (!name && !phone && !email) return;

  // جلوگیری از ارسال دوبارهٔ همان فرم در ۶ ساعت. v166.12: کلید محتوای فرم را هم دارد، پس فرم اصلاح‌شده (نام یا پیام
  // دیگر) دور ریخته نمی‌شود و به پروندهٔ همان شماره یادداشت می‌شود. فقط بعد از نوشتن موفق علامت می‌خورد.
  var dupKey = phone ? 'web:' + digits_(phone) + ':' + src + ':' + formHash_(name + '|' + msg + '|' + email) : '';
  if (dupKey && CacheService.getScriptCache().get(dupKey)) return;

  // فرم‌های مدرسه (پیش‌ثبت‌نام، ثبت‌نام دوره، کامیونیتی) فقط در هاب مدرسه می‌نشینند، نه در لیدهای پذیرش (تصمیم یاسر، ۳ مهر ۱۴۰۵)
  var schoolForm = false;
  try { schoolForm = (typeof tgSchFormKind_ === 'function') && !!tgSchFormKind_({ form: form, src: src, page: page }); } catch (eKind) {}
  // v141: منبع «سایت › مدرسه › …» به‌تنهایی کافی است، حتی اگر نام فرم چیز دیگری باشد
  try { if (!schoolForm && typeof tgSchSrcIs_ === 'function' && tgSchSrcIs_(src)) schoolForm = true; } catch (eSrc) {}

  // v140: شماره‌ای که از قبل لید دارد سطر تازه نمی‌سازد؛ همان پرونده یادداشت و اقدام بعدی می‌گیرد (و اگر بسته بود باز می‌شود)
  var dupRow = -1;
  if (!schoolForm && (phone || email)) {
    try { if (typeof tgLeadByPhone_ === 'function') dupRow = tgLeadByPhone_(phone, email); } catch (eDup) { dupRow = -1; }   /* v170.18: با ایمیل هم */
    if (dupRow >= 2 && typeof tgLeadFormAgain_ === 'function') {
      try { tgLeadFormAgain_(dupRow, { src: src, msg: msg, page: page, email: email, pref: pref, phone: phone, name: name }); }
      catch (eAg) { logError_('tgLeadFormAgain_: ' + eAg, null); dupRow = -1; }
      if (dupRow >= 2 && lf && !(typeof TG_DRY !== 'undefined' && TG_DRY)) { try { v1689WebWrite_(tgSS_().getSheetByName(TG_LEADS), dupRow, lf); } catch (eLf) { logError_('v1689WebWrite_: ' + eLf, null); } }
    } else dupRow = -1;
  }

  // v166.13: سطر تازه، کانال ترجیحی و کد لید زیر یک قفل؛ پیش از این getLastRow() جدا گرفته می‌شد و اگر بات یا واتس‌اپ
  // همان لحظه سطری می‌افزود، کد و کانال روی لید دیگری می‌نشست.
  if (!schoolForm && dupRow < 2) {
    var rowL = [
      fmtDate_(now), fmtTime_(now),
      src,
      name,
      'فرم سایت',
      phone ? "'" + phone : '',
      tgRegion_(phone),
      msg,
      'جدید', '', '', '',
      (email ? 'ایمیل: ' + email + ' · ' : '') + 'صفحه: ' + page
    ];
    /* v166.29.1: حالت خشک (آزمون دود) و نگهبان نشت تست؛ هیچ سطر واقعی نوشته نمی‌شود */
    if (typeof TG_DRY !== 'undefined' && TG_DRY) { TG_OUTBOX.push({ kind: 'lead', o: { source: src, channel: 'فرم سایت', name: name, phone: phone, country: lf ? lf.ctry : '', heard: lf ? lf.heard : '' } }); return; }
    if (typeof tgTestLeak_ === 'function' && tgTestLeak_('فرم سایت')) return;
    var writeLead = function () {
      var shL = tgSS_().getSheetByName(TG_LEADS);
      shL.appendRow(tgCellRow_(rowL));
      var rwL = shL.getLastRow();
      try {
        if (pref) shL.getRange(rwL, tgLeadCol_('کانال ترجیحی')).setValue(pref);
        if (lf) v1689WebWrite_(shL, rwL, lf);
        tgLeadCode_(rwL);
      } catch (eLead) { logError_('چرخهٔ لید: ' + eLead, null); }
    };
    if (typeof tgLeadRowLock_ === 'function') tgLeadRowLock_(writeLead); else writeLead();
  }

  // فرم‌های مدرسه در هاب مدرسه هم می‌نشینند تا مسئول مدرسه همه‌چیز را یک‌جا ببیند. لید سر جایش می‌ماند.
  try {
    if (typeof tgSchFromForm_ === 'function') {
      tgSchFromForm_({ name: name, phone: phone, email: email, msg: msg, src: src, form: form, page: page });
    }
  } catch (eSch) { logError_('tgSchFromForm_: ' + eSch, { postData: { contents: JSON.stringify(body) } }); }   /* v166.12: دادهٔ فرم برای بازیابی می‌ماند؛ فرم مدرسه جای دیگری نوشته نمی‌شود */

  // فرم ۱۶ پرسشی ثبت‌نام دورهٔ EFT کامل و ستون‌به‌ستون هم ذخیره می‌شود (v128)
  try { if (typeof tgEftSave_ === 'function') tgEftSave_(flat, src); } catch (eEft) { logError_('tgEftSave_', eEft); }
  // v170.13: فرم ۱۷ «درخواست بورسیه و همکاری با تحریریه»: تب «بورسیه» هاب مدرسه، هر پاسخ در ستون خودش
  try { if (typeof v17013ScholarSave_ === 'function') v17013ScholarSave_(flat, src); } catch (eSc) { logError_('v17013ScholarSave_', eSc); }

  if (dupKey) CacheService.getScriptCache().put(dupKey, '1', 21600);
}

function formHash_(s) {
  var h = 0; s = String(s || '');
  for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ─── ۴٫۵) کلیک روی راه‌های تماس در سایت (واتساپ، تلگرام، تلفن) ─
// این‌ها لید قابل تماس نیستند (شماره‌ای از کاربر نداریم)، پس در Sheet1 نمی‌نشینند؛
// در تب «کلیک‌های تماس» ثبت می‌شوند تا معلوم باشد هر کانال از کدام صفحه چقدر لید می‌آورد.
function handleContactClick_(body) {
  var now = new Date();
  var channel = String(body.channel || '').slice(0, 40);
  var page    = String(body.page || '').slice(0, 200);
  var src     = String(body.source || '').slice(0, 200);
  var ref     = String(body.ref || '').slice(0, 60);
  if (!channel) return;
  if (ref && seenRecently_('click:' + ref)) return;
  /* v170.14: سایت بخش را می‌فرستد (نام در کد سایت نیست)؛ نام مسئول همان قبلی، از TG_NAMES */
  var own = String(body.owner || ''), OWN = { 'پذیرش': 'reception', 'مدرسه': 'school', 'روانپزشکی': 'psy' };
  if (OWN[own]) own = tgNm_(OWN[own]) || own;
  appendRow_('کلیک‌های تماس', [
    fmtDate_(now), fmtTime_(now), channel, src, page,
    own, String(body.code || '')
  ]);
}

/* v170.7: تشخیص فرم آزمایشی، پیش از آن فقط «نام که با test یا تست شروع شود» یا شمارهٔ دقیقاً 09123456789 بود. (pii:ok ساختگی)
   حالا: «تست» یا «test» به‌شکل کلمهٔ جدا هرجای نام، شمارهٔ ساختگی با هر قالب (+98، 0098، رقم فارسی، فاصله)،
   ایمیل @example.invalid، یا برچسب TEST-<عدد> در هر فیلد. «آزمون دود» خود بات عمداً تست حساب نمی‌شود. */
var TEST_LEAD_PHONE = '9123456789';
function isTestLead_(name, phone, email, flat) {
  if (/(^|[\s\-_.(،])(test|تست)($|[\s\-_.)،\d])/i.test(String(name || ''))) return true;
  var d = digits_(phone).replace(/^(0098|98|0)/, '');
  if (d === TEST_LEAD_PHONE) return true;
  if (/@example\.invalid\s*$/i.test(String(email || ''))) return true;
  for (var k in (flat || {})) if (/(^|[^A-Za-z0-9])TEST-\d{6,}/.test(String(flat[k]))) return true;
  return false;
}

function pickKey_(flat, keys) {
  for (var i = 0; i < keys.length; i++) {
    for (var k in flat) {
      if (String(k).toLowerCase().indexOf(String(keys[i]).toLowerCase()) !== -1 && flat[k]) return flat[k];
    }
  }
  return '';
}

function seenRecently_(key) {
  var c = CacheService.getScriptCache();
  if (c.get(key)) return true;
  c.put(key, '1', 21600);
  return false;
}

// ─── ۵) ارسال پاسخ خودکار واتس‌اپ ───────────────────────────
function sendWhatsApp_(to, text) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('WHATSAPP_TOKEN');
  var phoneId = props.getProperty('WHATSAPP_PHONE_ID');
  if (!token || !phoneId) return;

  UrlFetchApp.fetch('https://graph.facebook.com/v21.0/' + phoneId + '/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { preview_url: false, body: text }
    })
  });
}

// ─── ابزارهای کمکی ─────────────────────────────────────────
var SS_CACHE_ = null;
function ss_() {
  if (!SS_CACHE_) SS_CACHE_ = SpreadsheetApp.openById(SHEET_ID);
  return SS_CACHE_;
}

function sheet_(tabName) {
  var sh = ss_().getSheetByName(tabName);
  if (!sh) {
    sh = ss_().insertSheet(tabName);
    if (tabName === TAB_INBOX) {
      sh.appendRow(['تاریخ', 'زمان', 'شماره‌ی ما', 'نام', 'شماره‌ی فرستنده',
                    'نوع', 'متن', 'شناسه‌ی پیام']);
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function appendRow_(tabName, row) { sheet_(tabName).appendRow(tgCellRow_(row)); }
/* v170.9 (امنیت): متن کاربر که با = + - @ تب یا CR شروع شود، در شیت فرمول نمی‌شود (یک ' جلویش) */
function tgCell_(v) { return (typeof v === 'string' && /^[=+\-@\t\r]/.test(v)) ? "'" + v : v; }
function tgCellRow_(row) { return (row || []).map(tgCell_); }

function isNewContact_(phone) {
  var sh = sheet_(TAB_LEADS);
  var last = sh.getLastRow();
  if (last < 2) return true;
  var col = sh.getRange(2, 6, last - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (digits_(col[i][0]) === digits_(phone)) return false;
  }
  return true;
}

// v166.12: رقم فارسی و عربی هم (پیش از این «۰۹۱۲…» خالی می‌شد و منطقه و کلید تکرار از دست می‌رفت)
/* v170.19: یک تابع برای ارقام شماره و یک تابع برای کلید شماره، برای همهٔ فایل‌ها (پیش از این digits_ و tgWaDigits_ و
   cmDigits_ و tgPhoneKey_ و منطق داخل tgLeadByPhone_ هرکدام جدا بودند). رقم فارسی و عربی هم خوانده می‌شود. */
function phoneDigits_(s) {
  return String(s == null ? '' : s)
    .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
    .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
    .replace(/\D/g, '');
}
/* کلید یکتای شماره: ده رقم آخر، یا خالی اگر کمتر از ده رقم است */
function phoneKey_(s) { var d = phoneDigits_(s); return d.length >= 10 ? d.slice(-10) : ''; }
function digits_(s) { return phoneDigits_(s); }

/* v170.19: region_ حذف شد؛ «داخل یا خارج» فقط از tgRegion_ (telegram.gs). region_ شمارهٔ ۰۷… انگلیس را «داخل ایران» می‌دانست. */

function flatten_(obj, prefix, out) {
  out = out || {}; prefix = prefix || '';
  for (var k in obj) {
    var v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten_(v, prefix + k + '.', out);
    else out[prefix + k] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}

function fmtDate_(d) { return Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd'); }
function fmtTime_(d) { return Utilities.formatDate(d, TIMEZONE, 'HH:mm'); }

function logError_(err, e) {
  /* v170.9: در حالت خشک (تست‌ها، از جمله تست‌های امنیت روی دیپلوی آزمایشی) ردیف واقعی در Errors نوشته نمی‌شود */
  if (typeof TG_DRY !== 'undefined' && TG_DRY) { try { (TG_MEM['errs'] = TG_MEM['errs'] || []).push(String(err).slice(0, 200)); } catch (x0) {} return; }
  try {
    var mask = (typeof tgSecretMask_ === 'function') ? tgSecretMask_ : function (x) { return String(x); };
    appendRow_('Errors', [new Date(), mask(String(err)),
      mask((e && e.postData && e.postData.contents || '').slice(0, 900))]);
  } catch (x) {}
}

// ─── یک بار دستی اجرا کن ───────────────────────────────────
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('VERIFY_TOKEN')) {
    props.setProperty('VERIFY_TOKEN', 'tajrobeh-' + Utilities.getUuid().slice(0, 8));
  }
  sheet_(TAB_INBOX);
  Logger.log('VERIFY_TOKEN = ' + props.getProperty('VERIFY_TOKEN'));
}


/* شورتکات اجرای تست‌ها از همین فایل — ۲۵ شهریور ۱۴۰۵ */
