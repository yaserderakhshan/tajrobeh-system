/* ═══════════════════════════════════════════════════════════════════
   هاب ساختمان پزشکان ونک (گاندی) · ماژول جدا در همان بات
   ───────────────────────────────────────────────────────────────────
   این فایل عمداً از بقیهٔ بات جداست. همهٔ نام‌ها با vk / VK_ شروع
   می‌شوند و هیچ داده‌ای در هاب تجربه، تب «افراد» یا «کاربران بات»
   نمی‌نشیند. نقاط اتصال به telegram.gs فقط هفت خط کوتاه است:
     tgHandle        ← vkSkipUser_ (اعضای ساختمان در کاربران بات نمی‌آیند)
     tgPrivate_      ← vkRoute_    (اولین خط، پیش از هر مسیریابی)
     tgOnCallback_   ← vkCb_       (پیشوند vk:)
     tgDeskMenu_ / tgOwnerMenu_ ← vkMenuRow_ (دکمهٔ ساختمان فقط برای مدیران)
     tgApiRoute_     ← vkApi_      (vk.open · vk.act · vk.say)
     tgApiBoot_      ← vkApiFlag_  (کارت ساختمان در مینی‌اپ)
     TG_SUITES       ← vkTests
   داده: دو گوگل‌شیت جدا که vkSetup می‌سازد.
     «هاب ساختمان پزشکان ونک (گاندی)»  برای همهٔ اعضا، فقط‌خواندنی
     «هاب ساختمان ونک · پشت‌صحنه»      فقط مدیر ساختمان و مسئول ساختمان
   ═══════════════════════════════════════════════════════════════════ */

var VK_TITLE = 'هاب ساختمان پزشکان ونک (گاندی)';
var VK_TITLE_PRIV = 'هاب ساختمان ونک · پشت‌صحنه (محرمانه)';
var VK_BTN = '🏢 ساختمان ونک';
var VK_START = 'vanak';
var VK_BOT = 'tajrobehlife_bot';
var VK_TZ = 'Asia/Tehran';

var VK_PAY_LINK = 'https://pay.paykan.ir/LJOii8';
/* v166.19: شمارهٔ کارت، شبا و نام صاحب حساب در کد نیست. از تب «افراد» هاب تجربه خوانده می‌شود: سطر فعالی که در
   «نقش‌ها» نقش «روان‌پزشکی» (مسئول روان‌پزشکی) را دارد، ستون‌های «شمارهٔ کارت»، «شبا» و «نام صاحب حساب».
   - هر بار از خود شیت (کش نمی‌شود؛ فقط در همان یک اجرا نگه داشته می‌شود)، پس پر یا عوض کردن خانه‌ها بی انتشار تازه دیده می‌شود.
   - چند کارت: هر کارت در یک خط همان خانه؛ شبا و نام صاحب حساب هم به همان ترتیب، هر کدام در یک خط.
   - خالی بود: بخش کارت نمایش داده نمی‌شود.
   - اگر این سه ستون در سطر اول تب نبودند، یک بار آخر سطر اول اضافه می‌شوند (به ستون‌های دیگر دست نمی‌خورد). */
var VK_PAY_ROLE = 'روان‌پزشکی';
var VK_PAY_COLS = { card: 'شمارهٔ کارت', sheba: 'شبا', holder: 'نام صاحب حساب' };
var VK_PAY_INFO_ = null;
function vkPayLines_(v) { return String(v == null ? '' : v).split(/\r?\n/).map(function (x) { return x.trim(); }); }
/* فهرست حساب‌ها: [{card, sheba, holder}]؛ خالی یعنی بخش کارت نمایش داده نشود */
function vkPayList_() {
  if (vkDry_()) return ((VK_DB && VK_DB._pay) || []).slice();
  if (VK_PAY_INFO_) return VK_PAY_INFO_;
  var out = [];
  try {
    var sh = tgPeopleSheet_(), lc = sh.getLastColumn(), last = sh.getLastRow();
    var hd = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
    var miss = [VK_PAY_COLS.card, VK_PAY_COLS.sheba, VK_PAY_COLS.holder].filter(function (h) { return hd.indexOf(h) < 0; });
    if (miss.length) {
      sh.getRange(1, lc + 1, 1, miss.length).setValues([miss]).setFontWeight('bold');
      hd = hd.concat(miss); lc += miss.length;
    }
    var cR = hd.indexOf('نقش‌ها'), cS = hd.indexOf('وضعیت'), cC = hd.indexOf(VK_PAY_COLS.card), cB = hd.indexOf(VK_PAY_COLS.sheba), cH = hd.indexOf(VK_PAY_COLS.holder);
    if (cR > -1 && last >= 2) {
      var v = sh.getRange(2, 1, last - 1, lc).getValues();
      for (var i = 0; i < v.length; i++) {
        var roles = String(v[i][cR] || '').split(/[,،;]+/).map(function (r) { return r.trim(); });
        if (roles.indexOf(VK_PAY_ROLE) < 0) continue;
        if (cS > -1 && String(v[i][cS] || '').trim() === 'غیرفعال') continue;
        var cards = vkPayLines_(v[i][cC]), shebas = vkPayLines_(v[i][cB]), holders = vkPayLines_(v[i][cH]);
        var n = Math.max(cards.length, shebas.length);
        for (var k = 0; k < n; k++) {
          if (!cards[k] && !shebas[k]) continue;
          out.push({ card: cards[k] || '', sheba: shebas[k] || '', holder: holders[k] || holders[0] || '' });
        }
        if (out.length) break;
      }
    }
  } catch (e) { try { tgErr_('vkPayList_', e); } catch (e2) {} }
  VK_PAY_INFO_ = out;
  return out;
}
/* متن بخش کارت برای بات (HTML) و برای راهنمای شیت (ساده)؛ خالی = '' */
function vkPayBlock_(plain) {
  return vkPayList_().map(function (a) {
    if (plain) return (a.card ? 'کارت به کارت: ' + a.card : '') + (a.sheba ? (a.card ? ' · ' : '') + 'شبا: ' + a.sheba : '') + (a.holder ? ' · به نام ' + a.holder : '');
    return (a.card ? 'کارت: <code>' + vkEsc_(a.card) + '</code>\n' : '') + (a.sheba ? 'شبا: <code>' + vkEsc_(a.sheba) + '</code>\n' : '') + (a.holder ? 'به نام ' + vkEsc_(a.holder) : '');
  }).join(plain ? ' | ' : '\n\n').replace(/\n+$/, '');
}

/* مدیران پایه. اگر تب «مدیران» پشت‌صحنه خالی یا در دسترس نبود، همین‌ها معتبرند. */
var VK_ADMIN_SEED = cfg_('VK_ADMIN_SEED', []);

var VK_GUARD = cfg_('VK_GUARD', '');
var VK_EXP_CATS = ['نگهبانی و سرایداری', 'برق و تأسیسات', 'آب و فاضلاب', 'گاز و موتورخانه', 'آسانسور', 'نظافت و بهداشت', 'تعمیرات ساختمان', 'قبوض مشاع', 'خرید ملزومات', 'اداری و متفرقه'];
var VK_REQ_CATS = ['تأسیسات و خرابی', 'نظافت', 'آسانسور', 'پارکینگ و ورودی', 'امنیت و نگهبانی', 'همسایگی و سروصدا', 'پیشنهاد', 'سایر'];
var VK_RELS = [
  { k: 'o', label: 'مالک واحد', short: 'مالک' },
  { k: 'r', label: 'ساکن یا مستأجر واحد', short: 'ساکن' },
  { k: 'c', label: 'همراه یا همکار واحد (همسر، منشی، دستیار)', short: 'همکار' }
];
var VK_METHODS = ['درگاه آنلاین', 'کارت به کارت', 'شبا', 'نقدی به مسئول ساختمان'];
var VK_FROM = ['تنخواه', 'حساب صندوق', 'هنوز پرداخت نشده'];
var VK_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
var VK_SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
var VK_FIRST_YEAR = 1405;

var VK_ST = {
  wait: 'در انتظار تأیید', ok: 'تأیید شد', no: 'رد شد',
  active: 'فعال', pending: 'در انتظار تأیید', off: 'غیرفعال',
  paid: 'پرداخت شد', unpaid: 'پرداخت نشده', void: 'باطل',
  rNew: 'تازه', rWork: 'در بررسی', rDone: 'انجام شد', rCant: 'فعلاً ممکن نیست'
};

/* ---------- تب‌ها و سرستون‌ها (ستون تازه فقط انتهای هر فهرست) ---------- */
var VK_T = {
  guide: 'راهنما', sum: 'خلاصه', units: 'واحدها', chg: 'شارژها', pay: 'پرداخت‌ها',
  exp: 'هزینه‌ها', pet: 'تنخواه', ann: 'اطلاعیه‌ها', req: 'درخواست‌ها',
  mem: 'اعضا', adm: 'مدیران', sheba: 'شبای دریافت‌کنندگان', log: 'رویدادها'
};
var VK_H = {
  units: ['واحد', 'طبقه', 'ساکن یا پزشک', 'مالک', 'شارژ فصلی (تومان)', 'وضعیت', 'کل شارژ', 'پرداخت‌شده', 'مانده بدهی', 'آخرین پرداخت', 'یادداشت'],
  chg: ['دوره', 'عنوان دوره', 'واحد', 'مبلغ', 'سررسید', 'تاریخ صدور', 'صادرکننده', 'یادداشت'],
  pay: ['کد', 'تاریخ ثبت', 'واحد', 'پرداخت‌کننده', 'نسبت با واحد', 'مبلغ', 'بابت', 'روش', 'فیش', 'کد پیگیری', 'وضعیت', 'تأییدکننده', 'تاریخ تأیید', 'ثبت‌کننده', 'یادداشت', 'اعلان', 'file_id'],
  exp: ['کد', 'ماه', 'تاریخ ثبت', 'موضوع', 'شرح', 'مبلغ', 'دریافت‌کننده', 'پرداخت از', 'فاکتور', 'فیش پرداخت', 'ثبت‌کننده', 'وضعیت', 'یادداشت'],
  pet: ['تاریخ', 'مبلغ', 'شرح', 'ثبت‌کننده'],
  ann: ['کد', 'تاریخ', 'عنوان', 'متن', 'مخاطب', 'فرستنده', 'تعداد گیرنده'],
  req: ['کد', 'تاریخ', 'واحد', 'نام', 'موضوع', 'متن', 'عکس', 'وضعیت', 'پاسخ', 'آخرین تغییر', 'اعلان', 'chat_id'],
  mem: ['کد', 'تاریخ عضویت', 'واحد', 'نام', 'نسبت با واحد', 'chat_id', 'یوزرنیم', 'ایمیل', 'وضعیت', 'دسترسی شیت', 'تأییدکننده', 'یادداشت'],
  adm: ['نام', 'نقش', 'chat_id', 'یوزرنیم', 'ایمیل', 'تأیید پرداخت؟', 'دسترسی شیت'],
  sheba: ['کد هزینه', 'دریافت‌کننده', 'شبا یا کارت', 'تاریخ'],
  log: ['زمان', 'کی', 'چه شد', 'کد', 'جزئیات']
};
/* کدام تب در کدام فایل */
var VK_PRIV_TABS = { mem: 1, adm: 1, sheba: 1, log: 1 };

/* نام‌ها و رجیستری مینی‌اپ: همین‌جا، تا telegram.gs دست نخورد */
try { TG_MEMO_KEYS.push('vkm', 'vkst'); } catch (eVk0) {}
try {
  TG_CAP.push(
    { key: 'vk_open', page: 'vk', label: 'هاب ساختمان ونک', roles: [], bot: true, api: 'vk.open', app: true },
    { key: 'vk_act', page: 'vk', label: 'کنش در هاب ساختمان', roles: [], bot: true, api: 'vk.act', app: true },
    { key: 'vk_say', page: 'vk', label: 'نوشتن در هاب ساختمان', roles: [], bot: true, api: 'vk.say', app: true },
    { key: 'vk_tick', label: 'یادآوری و اعلان تغییرات شیت ساختمان', roles: [], bot: true, api: '', app: false, appNa: 'کار زمان‌بندی‌شدهٔ سرور است' }
  );
} catch (eVk1) {}

/* ═══════════ کمکی‌ها ═══════════ */
var VK_DB = null;       // حالت خشک: شیت‌ها در حافظه
var VK_RC = {};         // کش خواندن در همین اجرا
var VK_CUR = '';        // chat جاری، برای منوی مدیران
var VK_PROPS_ = null;

function vkDry_() { return (typeof TG_DRY !== 'undefined') && TG_DRY; }
function vkEsc_(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function vkFa_(n) { return String(n).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(Number(d)); }); }
function vkEn_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
    .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
}
function vkNum_(n) {
  var x = Math.round(Number(n) || 0), neg = x < 0; x = Math.abs(x);
  var s = String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return (neg ? '−' : '') + vkFa_(s);
}
function vkToman_(n) { return vkNum_(n) + ' تومان'; }

/* «۵ میلیون»، «۲.۵ میلیون»، «۸۰۰ هزار»، «5,000,000»، «۵۰۰۰۰۰۰ تومان» */
function vkMoney_(text) {
  var s = vkEn_(text).replace(/تومان|تومن|ریال|ت\b/g, '').replace(/[,،٬\s]/g, '').replace(/\//g, '.');
  var mul = 1;
  if (/میلیارد/.test(s)) { mul = 1e9; s = s.replace(/میلیارد/g, ''); }
  else if (/میلیون|ملیون|م$/.test(s)) { mul = 1e6; s = s.replace(/میلیون|ملیون|م$/g, ''); }
  else if (/هزار|k$/i.test(s)) { mul = 1e3; s = s.replace(/هزار|k$/ig, ''); }
  if (!/^\d+(\.\d+)?$/.test(s)) return 0;
  var n = Math.round(parseFloat(s) * mul);
  return n >= 1000 ? n : 0;
}

/* تاریخ شمسی، مستقل از بقیهٔ بات */
function vkG2J_(gy, gm, gd) {
  var gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  var jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  var gy2 = (gm > 2) ? (gy + 1) : gy;
  var days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
  jy += 33 * Math.floor(days / 12053); days %= 12053;
  jy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  var jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}
function vkNowParts_() {
  var s = Utilities.formatDate(new Date(), VK_TZ, 'yyyy-MM-dd-HH-mm');
  var p = s.split('-').map(Number);
  var j = vkG2J_(p[0], p[1], p[2]);
  return { jy: j[0], jm: j[1], jd: j[2], hh: p[3], mi: p[4] };
}
function vkPad_(n) { return (n < 10 ? '0' : '') + n; }
function vkToday_() { var t = vkNowParts_(); return t.jy + '/' + vkPad_(t.jm) + '/' + vkPad_(t.jd); }
function vkStamp_() { var t = vkNowParts_(); return vkToday_() + ' ' + vkPad_(t.hh) + ':' + vkPad_(t.mi); }
function vkYm_(jy, jm) { return jy + '-' + vkPad_(jm); }
function vkYmLabel_(ym) { var p = String(ym).split('-'); var m = Number(p[1]); return (VK_MONTHS[m - 1] || ym) + ' ' + vkFa_(p[0]); }
function vkCurYm_() { var t = vkNowParts_(); return vkYm_(t.jy, t.jm); }
/* ماه‌های ثبت هزینه: از فروردین ۱۴۰۵ تا همین ماه، تازه‌ترین اول */
function vkMonthList_() {
  var t = vkNowParts_(), out = [];
  var y = t.jy, m = t.jm;
  while (y > VK_FIRST_YEAR || (y === VK_FIRST_YEAR && m >= 1)) {
    out.push(vkYm_(y, m));
    m--; if (m < 1) { m = 12; y--; }
    if (out.length >= 24) break;
  }
  return out;
}
function vkSeasonOf_(jm) { return Math.floor((jm - 1) / 3) + 1; }
function vkSeasonLabel_(key) { var p = String(key).split('-Q'); return VK_SEASONS[Number(p[1]) - 1] + ' ' + vkFa_(p[0]); }
/* فصل‌های قابل صدور: از بهار ۱۴۰۵ تا فصل بعدِ فصل جاری */
function vkSeasonList_() {
  var t = vkNowParts_(), out = [];
  var y = VK_FIRST_YEAR, q = 1;
  var endY = t.jy, endQ = vkSeasonOf_(t.jm) + 1;
  if (endQ > 4) { endQ = 1; endY++; }
  while (y < endY || (y === endY && q <= endQ)) {
    out.push(y + '-Q' + q);
    q++; if (q > 4) { q = 1; y++; }
  }
  return out;
}

/* ═══════════ حالت گفت‌وگو ═══════════ */
function vkState_(chat) { try { var r = tgGetVal_('vkst', chat); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function vkSetState_(chat, st) { tgSetVal_('vkst', chat, JSON.stringify(st)); }
function vkClear_(chat) { try { tgDel_('vkst', chat); } catch (e) { tgSetVal_('vkst', chat, ''); } }

/* ═══════════ پیام ═══════════ */
function vkSay_(chat, text, kb) { return tgSend_(chat, text, kb || null); }
function vkKb_(rows) { return { inline_keyboard: rows }; }
function vkB_(text, data) { return { text: text, callback_data: 'vk:' + data }; }
function vkU_(text, url) { return { text: text, url: url }; }
function vkLink_() { return 'https://t.me/' + VK_BOT + '?start=' + VK_START; }
function vkPhoto_(chat, fileId, caption, kb) {
  var body = { chat_id: chat, photo: fileId, caption: caption, parse_mode: 'HTML' };
  if (kb) body.reply_markup = kb;
  return tgApi_('sendPhoto', body);
}
function vkDoc_(chat, fileId, caption, kb) {
  var body = { chat_id: chat, document: fileId, caption: caption, parse_mode: 'HTML' };
  if (kb) body.reply_markup = kb;
  return tgApi_('sendDocument', body);
}
/* فایل پیوست را به همان شکلی که آمده برمی‌گرداند؛ اگر نشد، متن را بی‌پیوست می‌فرستد */
function vkSendFile_(chat, fid, caption, kb) {
  if (!fid) return vkSay_(chat, caption, kb);
  var kind = String(fid).split('|')[0], id = String(fid).split('|')[1] || fid;
  var r = kind === 'doc' ? vkDoc_(chat, id, caption, kb) : vkPhoto_(chat, id, caption, kb);
  try { if (r && r.getResponseCode && r.getResponseCode() !== 200) vkSay_(chat, caption, kb); } catch (e) {}
  return r;
}

/* ═══════════ لایهٔ داده ═══════════ */
function vkProp_(k) {
  if (vkDry_()) return (VK_DB && VK_DB._props && VK_DB._props[k]) || '';
  if (!VK_PROPS_) VK_PROPS_ = PropertiesService.getScriptProperties().getProperties();
  return VK_PROPS_[k] || '';
}
function vkSetProp_(k, v) {
  if (vkDry_()) { VK_DB._props = VK_DB._props || {}; VK_DB._props[k] = v; return; }
  PropertiesService.getScriptProperties().setProperty(k, v);
  VK_PROPS_ = null;
}
function vkBook_(key) {
  var id = vkProp_(VK_PRIV_TABS[key] ? 'VK_PRIV' : 'VK_SS');
  if (!id) throw new Error('هاب ساختمان هنوز ساخته نشده؛ vkSetup را یک بار اجرا کنید');
  var ck = '_ss' + id;
  if (!VK_RC[ck]) VK_RC[ck] = SpreadsheetApp.openById(id);
  return VK_RC[ck];
}
function vkSheet_(key) {
  var ss = vkBook_(key);
  var sh = ss.getSheetByName(VK_T[key]);
  if (!sh) throw new Error('تب «' + VK_T[key] + '» پیدا نشد');
  return sh;
}
function vkDryTab_(key) {
  VK_DB = VK_DB || {};
  if (!VK_DB[key]) VK_DB[key] = [];
  return VK_DB[key];
}
/* هر سطر: آرایهٔ مقدارها + ویژگی _r (شمارهٔ سطر در شیت) */
function vkRows_(key) {
  if (VK_RC['r' + key]) return VK_RC['r' + key];
  var out = [], n = VK_H[key].length;
  if (vkDry_()) {
    var t = vkDryTab_(key);
    for (var i = 0; i < t.length; i++) { var a = t[i].slice(); while (a.length < n) a.push(''); a._r = i + 2; out.push(a); }
  } else {
    var sh = vkSheet_(key), last = sh.getLastRow();
    if (last >= 2) {
      var vals = sh.getRange(2, 1, last - 1, n).getDisplayValues();
      for (var j = 0; j < vals.length; j++) { if (!String(vals[j].join('')).trim()) continue; vals[j]._r = j + 2; out.push(vals[j]); }
    }
  }
  VK_RC['r' + key] = out;
  return out;
}
function vkDrop_(key) { delete VK_RC['r' + key]; }
function vkAppend_(key, row) {
  var n = VK_H[key].length, a = row.slice(0, n);
  while (a.length < n) a.push('');
  a = a.map(function (x) { return x === null || x === undefined ? '' : x; });
  if (vkDry_()) { vkDryTab_(key).push(a); vkDrop_(key); return vkDryTab_(key).length + 1; }
  var sh = vkSheet_(key);
  var r = sh.getLastRow() + 1;
  if (key === 'units') {
    /* تب واحدها ستون‌های فرمولی دارد، پس getLastRow ته فرمول‌هاست؛ اولین سطر خالی ستون A را می‌گیریم */
    var colA = sh.getRange(2, 1, Math.max(sh.getLastRow(), 2), 1).getDisplayValues();
    for (var q = 0; q < colA.length; q++) if (!String(colA[q][0]).trim()) { r = q + 2; break; }
    sh.getRange(r, 1, 1, 6).setValues([a.slice(0, 6)]);
    vkDrop_(key);
    return r;
  }
  sh.getRange(r, 1, 1, n).setValues([a]);
  vkDrop_(key);
  return r;
}
function vkSet_(key, r, col, val) {
  if (vkDry_()) { var t = vkDryTab_(key); var row = t[r - 2]; if (!row) return; while (row.length < col) row.push(''); row[col - 1] = val; vkDrop_(key); return; }
  vkSheet_(key).getRange(r, col).setValue(val);
  vkDrop_(key);
}
function vkCol_(key, name) { return VK_H[key].indexOf(name) + 1; }
function vkGet_(row, key, name) { return row[VK_H[key].indexOf(name)]; }
function vkFind_(key, code) {
  var rows = vkRows_(key);
  for (var i = 0; i < rows.length; i++) if (String(rows[i][0]) === String(code)) return rows[i];
  return null;
}
function vkNextCode_(key, pre, start) {
  var rows = vkRows_(key), max = start - 1, re = new RegExp('^' + pre + '-(\\d+)$');
  for (var i = 0; i < rows.length; i++) { var m = String(rows[i][0]).match(re); if (m) max = Math.max(max, Number(m[1])); }
  return pre + '-' + (max + 1);
}
function vkLog_(who, what, code, detail) {
  try { vkAppend_('log', [vkStamp_(), String(who || ''), what, code || '', String(detail || '').slice(0, 500)]); } catch (e) {}
}
function vkUnitKey_(u) { return vkEn_(String(u || '')).trim().replace(/^واحد\s*/, ''); }
function vkUnitFa_(u) { return 'واحد ' + vkFa_(vkUnitKey_(u)); }

/* ═══════════ کیستی و دسترسی ═══════════ */
function vkChatIn_(cell, chat) {
  var parts = String(cell || '').split(/[\s,،;]+/);
  for (var i = 0; i < parts.length; i++) if (parts[i] && parts[i] === String(chat)) return true;
  return false;
}
function vkAdmins_() {
  var list = [];
  try {
    var rows = vkRows_('adm');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!String(r[0] || r[2]).trim()) continue;
      list.push({ name: r[0], role: r[1], chat: String(r[2]), user: String(r[3] || '').replace(/^@/, ''), email: r[4], approve: String(r[5]).indexOf('بله') > -1, row: r._r });
    }
  } catch (e) {}
  if (!list.length) list = VK_ADMIN_SEED.map(function (a) { return { name: a.name, role: a.role, chat: a.chat, user: a.user, email: '', approve: a.approve, row: 0 }; });
  return list;
}
function vkAdmin_(chat) {
  var list = vkAdmins_();
  for (var i = 0; i < list.length; i++) if (vkChatIn_(list[i].chat, chat)) return list[i];
  return null;
}
function vkApprovers_() { return vkAdmins_().filter(function (a) { return a.approve; }); }
function vkManagers_() { return vkAdmins_(); }
/* عضویت‌های این چت (یک نفر می‌تواند چند واحد داشته باشد) */
function vkMemberships_(chat) {
  var rows = vkRows_('mem'), out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!vkChatIn_(r[5], chat)) continue;
    var st = String(r[8] || '');
    if (st === VK_ST.off || st === VK_ST.no) continue;
    out.push({ code: r[0], unit: vkUnitKey_(r[2]), name: r[3], rel: String(r[4] || ''), chat: String(r[5]), user: r[6], email: r[7], status: st, row: r._r });
  }
  return out;
}
function vkActive_(ms) { return ms.filter(function (m) { return m.status === VK_ST.active; }); }
function vkIsOwnerRel_(rel) { return String(rel).indexOf('مالک') > -1; }

/* نشانهٔ سریع برای مسیریابی (نه برای دسترسی): a مدیر، m عضو، 0 هیچ. */
function vkIdsMap_() {
  if (!vkDry_()) {
    try { var c = CacheService.getScriptCache().get('vkids'); if (c) return JSON.parse(c); } catch (e) {}
  }
  var map = {};
  try {
    var rows = vkRows_('mem');
    for (var i = 0; i < rows.length; i++) {
      var st = String(rows[i][8] || '');
      if (st === VK_ST.off || st === VK_ST.no) continue;
      String(rows[i][5] || '').split(/[\s,،;]+/).forEach(function (id) { if (id) map[id] = 'm'; });
    }
  } catch (e2) {}
  vkAdmins_().forEach(function (a) { String(a.chat).split(/[\s,،;]+/).forEach(function (id) { if (id) map[id] = 'a'; }); });
  if (!vkDry_()) { try { CacheService.getScriptCache().put('vkids', JSON.stringify(map), 3600); } catch (e3) {} }
  return map;
}
function vkIdsDrop_() { if (!vkDry_()) { try { CacheService.getScriptCache().remove('vkids'); } catch (e) {} } }
function vkKnown_(chat) {
  var v = '';
  try { v = tgGetVal_('vkm', chat); } catch (e) {}
  if (v) return v === '0' ? '' : v;
  var k = '';
  for (var i = 0; i < VK_ADMIN_SEED.length; i++) if (VK_ADMIN_SEED[i].chat === String(chat)) k = 'a';
  if (!k) { try { k = vkIdsMap_()[String(chat)] || ''; } catch (e2) {} }
  try { tgSetVal_('vkm', chat, k || '0'); } catch (e3) {}
  return k;
}
function vkMark_(chat, k) { try { tgSetVal_('vkm', chat, k); } catch (e) {} vkIdsDrop_(); }

/* tgHandle: اعضای ساختمان در «کاربران بات» و پیام خوشامد مینی‌اپ نمی‌آیند */
function vkSkipUser_(chat, update) {
  try {
    var m = update && (update.message || update.edited_message);
    var t = String((m && m.text) || '');
    if (/^\/start(@\w+)?\s+(vanak|vk|gandi)\b/i.test(t)) return true;
    var st = vkState_(chat);
    if (st && st.f) return true;
    return vkKnown_(chat) === 'm';
  } catch (e) { return false; }
}

/* ═══════════ مسیریابی ═══════════ */
function vkIsStart_(t) { return /^\/start(@\w+)?\s+(vanak|vk|gandi)\b/i.test(String(t || '')); }
function vkCmdOf_(t) { var m = String(t || '').match(/^\/([a-zA-Z_]+)(@\w+)?/); return m ? '/' + m[1].toLowerCase() : ''; }
function vkBtnLike_(t) {
  try { if (typeof tgIsBtnLike_ === 'function') return tgIsBtnLike_(t); } catch (e) {}
  return /^[←-⯿\u{1F000}-\u{1FAFF}]/u.test(String(t || ''));
}
/* فایل پیوست پیام: عکس (بزرگ‌ترین اندازه) یا سند */
function vkFileOf_(m) {
  if (m && m.photo && m.photo.length) return { kind: 'photo', id: m.photo[m.photo.length - 1].file_id, name: 'photo.jpg' };
  if (m && m.document) return { kind: 'doc', id: m.document.file_id, name: m.document.file_name || 'file' };
  return null;
}

/* tgPrivate_ اولین خط: true یعنی پیام مال ساختمان بود */
function vkRoute_(m, chat, name, uname) {
  VK_CUR = String(chat);
  var text = String((m && m.text) || '').trim();
  try {
    if (vkIsStart_(text)) { vkClear_(chat); return vkEntry_(chat, name, uname), true; }
    var st = vkState_(chat);
    if (st && st.f) {
      if (text === '/cancel' || text === 'انصراف' || text === 'لغو') { vkClear_(chat); vkSay_(chat, 'باشد، کنار گذاشتیم.', vkKb_([[vkB_(VK_BTN, 'h')]])); return true; }
      var clean = (text === VK_BTN || vkCmdOf_(text) === '/vanak');
      var leave = !clean && text && (text.indexOf('/') === 0 || vkBtnLike_(text));
      if (clean) { vkClear_(chat); return vkHome_(chat, name, uname), true; }
      if (leave) { vkClear_(chat); }
      else {
        var file = vkFileOf_(m);
        if (text || file) { vkStep_(chat, name, uname, st, text, file, m); return true; }
      }
    }
    if (text === VK_BTN || vkCmdOf_(text) === '/vanak') { vkHome_(chat, name, uname); return true; }
    var k = vkKnown_(chat);
    if (k === 'm') {
      /* عضو ساختمان که در تجربه نقش دیگری ندارد: خانهٔ ساختمان خانهٔ اوست */
      if (vkCmdOf_(text) === '/start' && !/^\/start\s+\S/.test(text)) { vkHome_(chat, name, uname); return true; }
      if (text && text.indexOf('/') !== 0 && !vkBtnLike_(text)) { vkHome_(chat, name, uname); return true; }
    }
  } catch (e) {
    console.error('vkRoute_: ' + e + ' ' + (e && e.stack));
    vkSay_(chat, 'در بخش ساختمان خطایی پیش آمد و ثبت شد. یک بار دیگر «' + VK_BTN + '» را بزنید.');
    return true;
  }
  return false;
}

/* tgOnCallback_ برای پیشوند vk: */
function vkCb_(cq, d, chat, name, uname) {
  VK_CUR = String(chat);
  try { vkOnCb_(cq, String(d || ''), chat, name, uname); }
  catch (e) { console.error('vkCb_: ' + e + ' ' + (e && e.stack)); vkSay_(chat, 'در بخش ساختمان خطایی پیش آمد و ثبت شد. دوباره امتحان کنید.'); }
  return true;
}

/* منوی مدیران (پذیرش و ناظر): دکمهٔ ساختمان فقط برای مدیر و مسئول ساختمان */
function vkMenuRow_() {
  try { if (VK_CUR && vkKnown_(VK_CUR) === 'a') return [[VK_BTN]]; } catch (e) {}
  return [];
}

/* ═══════════ ورود با لینک ═══════════ */
function vkEntry_(chat, name, uname) {
  var adm = vkAdmin_(chat);
  var ms = vkMemberships_(chat);
  if (adm) return vkAdminHome_(chat, adm);
  if (ms.length) return vkHome_(chat, name, uname, '👋 شما قبلاً وصل شده‌اید. اگر برای واحد دیگری هم کار می‌کنید، «➕ واحد دیگر» را بزنید.');
  vkSetState_(chat, { f: 'join', s: 'name', user: uname || '' });
  vkSay_(chat,
    '🏢 <b>' + vkEsc_(VK_TITLE) + '</b>\nکوچهٔ بیستم گاندی\n\n' +
    'اینجا کارهای ساختمان یک‌جا انجام می‌شود: پرداخت شارژ، دیدن هزینه‌ها و فاکتورها، اطلاعیه‌ها، و گفتن هر مشکل یا خواسته‌ای دربارهٔ ساختمان.\n\n' +
    'این بخش از بقیهٔ کارهای مرکز تجربه جداست.\n\n' +
    '✍️ برای شروع، <b>نام و نام خانوادگی</b> خودتان را بنویسید.');
}

function vkUnitsList_() {
  var rows = [], seen = {};
  try {
    vkRows_('units').forEach(function (r) {
      var u = vkUnitKey_(r[0]);
      if (!u || seen[u]) return;
      seen[u] = 1;
      rows.push({ unit: u, floor: r[1], occ: r[2], owner: r[3], monthly: vkMoney_(r[4]) || Number(vkEn_(r[4]).replace(/[^\d]/g, '')) || 0, status: r[5], row: r._r });
    });
  } catch (e) {}
  rows.sort(function (a, b) { var x = Number(a.unit), y = Number(b.unit); if (!isNaN(x) && !isNaN(y)) return x - y; return String(a.unit) < String(b.unit) ? -1 : 1; });
  return rows;
}
function vkUnitGrid_(prefix, extra) {
  var list = vkUnitsList_(), rows = [], line = [];
  for (var i = 0; i < list.length; i++) {
    line.push(vkB_(vkFa_(list[i].unit), prefix + list[i].unit));
    if (line.length === 4) { rows.push(line); line = []; }
  }
  if (line.length) rows.push(line);
  (extra || []).forEach(function (r) { rows.push(r); });
  return { rows: rows, n: list.length };
}

/* ═══════════ گام‌های گفت‌وگو (متن یا فایل) ═══════════ */
function vkStep_(chat, name, uname, st, text, file, m) {
  var f = st.f, s = st.s;
  if (f === 'join') return vkJoinStep_(chat, name, uname, st, text);
  if (f === 'pay' || f === 'apay') return vkPayStep_(chat, name, st, text, file);
  if (f === 'exp') return vkExpStep_(chat, name, st, text, file);
  if (f === 'efix') return vkExpFix_(chat, name, st, file);
  if (f === 'req') return vkReqStep_(chat, name, st, text, file);
  if (f === 'rrep') return vkReqReply_(chat, name, st, text);
  if (f === 'ann') return vkAnnStep_(chat, name, st, text);
  if (f === 'pet') return vkPetStep_(chat, name, st, text);
  if (f === 'unit') return vkUnitStep_(chat, name, st, text);
  if (f === 'aem') return vkAdminEmail_(chat, st, text);
  if (f === 'mem') return vkEmailStep_(chat, st, text);
  if (f === 'pno') return vkPayRejectNote_(chat, name, st, text);
  vkClear_(chat);
}

/* ---------- عضویت ---------- */
function vkJoinStep_(chat, name, uname, st, text) {
  if (st.s === 'name') {
    var nm = String(text || '').trim().replace(/\s+/g, ' ');
    if (nm.length < 4 || nm.length > 60 || /\d|[۰-۹]/.test(nm)) return vkSay_(chat, 'لطفاً نام و نام خانوادگی را کامل بنویسید؛ مثل «مریم احمدی».');
    st.name = nm; st.s = 'unit'; vkSetState_(chat, st);
    return vkAskUnit_(chat, st);
  }
  if (st.s === 'unit') {
    var u = vkUnitKey_(text);
    if (!u || u.length > 8) return vkSay_(chat, 'شمارهٔ واحد را بنویسید؛ مثلاً ۳ یا ۱۲.');
    return vkJoinUnit_(chat, st, u);
  }
  if (st.s === 'email') return vkJoinEmail_(chat, st, text);
  vkSay_(chat, 'از دکمه‌های بالا یکی را بزنید.');
}
function vkAskUnit_(chat, st) {
  var g = vkUnitGrid_('u:', [[vkB_('واحد من در فهرست نیست', 'uo')]]);
  if (!g.n) return vkSay_(chat, 'ممنون ' + vkEsc_(st.name) + ' 🙏\n\n🔢 <b>شمارهٔ واحد</b> را بنویسید.');
  vkSay_(chat, 'ممنون ' + vkEsc_(st.name) + ' 🙏\n\n🔢 <b>کدام واحد؟</b>', vkKb_(g.rows));
}
function vkJoinUnit_(chat, st, u) {
  st.unit = u; st.s = 'rel'; vkSetState_(chat, st);
  vkSay_(chat, '✅ ' + vkUnitFa_(u) + '\n\nنسبت شما با این واحد چیست؟', vkKb_(VK_RELS.map(function (r) { return [vkB_(r.label, 'r:' + r.k)]; })));
}
function vkJoinRel_(chat, st, k) {
  var rel = null;
  VK_RELS.forEach(function (r) { if (r.k === k) rel = r; });
  if (!rel) return;
  st.rel = rel.short; st.s = 'email'; vkSetState_(chat, st);
  vkSay_(chat, '✅ ' + vkEsc_(rel.label) + '\n\n📧 برای اینکه گوگل‌شیت ساختمان و فاکتورها را هم ببینید، <b>ایمیل گوگل</b> خودتان را بنویسید.\n<i>اختیاری است؛ بعداً هم می‌شود.</i>', vkKb_([[vkB_('⏭ بعداً', 'es')]]));
}
function vkEmailOk_(t) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(t || '').trim()); }
function vkJoinEmail_(chat, st, text) {
  var em = String(text || '').trim().toLowerCase();
  if (em && !vkEmailOk_(em)) return vkSay_(chat, 'این ایمیل درست به نظر نمی‌رسد. دوباره بنویسید یا «⏭ بعداً» را بزنید.', vkKb_([[vkB_('⏭ بعداً', 'es')]]));
  st.email = em;
  return vkJoinDone_(chat, st);
}
function vkJoinDone_(chat, st) {
  vkClear_(chat);
  var code = vkNextCode_('mem', 'VM', 101);
  var known = vkUnitsList_().some(function (x) { return x.unit === st.unit; });
  vkAppend_('mem', [code, vkStamp_(), st.unit, st.name, st.rel, String(chat), st.user || '', st.email || '', VK_ST.pending, '', '', known ? '' : 'واحد در فهرست واحدها نیست']);
  vkLog_(st.name, 'درخواست عضویت', code, vkUnitFa_(st.unit) + ' · ' + st.rel);
  vkMark_(chat, 'm');
  vkSay_(chat,
    '🎉 <b>ثبت شد.</b>\n' + vkUnitFa_(st.unit) + ' · ' + vkEsc_(st.rel) + '\n\n' +
    'مسئول ساختمان به‌زودی عضویت شما را تأیید می‌کند و همین‌جا خبرتان می‌کنم. تا آن موقع اطلاعیه‌ها را می‌بینید و می‌توانید درخواست یا مشکلی را بگویید.\n\n' +
    '👥 <b>این لینک را به همسر، پزشک یا منشی واحد هم بدهید</b> تا هر کدام جدا وصل شوند:\n' + vkLink_(),
    { keyboard: [[VK_BTN]], resize_keyboard: true });
  vkHome_(chat, st.name, '');
  vkTellOps_('👤 <b>عضو تازه در انتظار تأیید</b>\n' + vkEsc_(st.name) + ' · ' + vkUnitFa_(st.unit) + ' · ' + vkEsc_(st.rel) +
    (st.email ? '\n📧 ' + vkEsc_(st.email) : '') + (known ? '' : '\n⚠️ این واحد هنوز در تب «واحدها» نیست.') + '\n<code>' + code + '</code>',
    vkKb_([[vkB_('✅ تأیید', 'mok:' + code), vkB_('❌ رد', 'mno:' + code)]]));
}

/* پیام به مدیران ساختمان. onlyApprovers برای کارهای تأیید پرداخت. */
function vkTellManagers_(text, kb, onlyApprovers, exceptChat) {
  var list = onlyApprovers ? vkApprovers_() : vkManagers_();
  var sent = {};
  list.forEach(function (a) {
    String(a.chat).split(/[\s,،;]+/).forEach(function (id) {
      if (!id || sent[id] || String(id) === String(exceptChat || '')) return;
      sent[id] = 1;
      try { vkSay_(id, text, kb); } catch (e) {}
    });
  });
}
/* کارهای روزمره (عضو تازه، درخواست‌ها) فقط برای مسئول ساختمان؛ اگر نبود، همهٔ مدیران */
function vkOps_() { var o = vkManagers_().filter(function (a) { return !a.approve; }); return o.length ? o : vkManagers_(); }
function vkTellOps_(text, kb, exceptChat) {
  var sent = {};
  vkOps_().forEach(function (a) {
    String(a.chat).split(/[\s,،;]+/).forEach(function (id) {
      if (!id || sent[id] || String(id) === String(exceptChat || '')) return;
      sent[id] = 1;
      try { vkSay_(id, text, kb); } catch (e) {}
    });
  });
}
function vkTellApproversFile_(fid, text, kb, exceptChat) {
  vkApprovers_().forEach(function (a) {
    String(a.chat).split(/[\s,،;]+/).forEach(function (id) {
      if (!id || String(id) === String(exceptChat || '')) return;
      try { vkSendFile_(id, fid, text, kb); } catch (e) {}
    });
  });
}

/* ═══════════ خانهٔ عضو ═══════════ */
function vkDebtOf_(unit) {
  var u = vkUnitKey_(unit), chg = 0, paid = 0, wait = 0, last = '';
  vkRows_('chg').forEach(function (r) { if (vkUnitKey_(r[2]) === u) chg += vkAmt_(r[3]); });
  vkRows_('pay').forEach(function (r) {
    if (vkUnitKey_(r[2]) !== u) return;
    if (r[10] === VK_ST.ok) { paid += vkAmt_(r[5]); last = r[1]; }
    else if (r[10] === VK_ST.wait) wait += vkAmt_(r[5]);
  });
  return { charged: chg, paid: paid, due: chg - paid, waiting: wait, last: last };
}
function vkAmt_(v) { var n = Number(vkEn_(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; }
function vkFund_() {
  var open = 0;
  try { open = vkOpenBal_(); } catch (e) {}
  var inc = 0, exp = 0, expPet = 0, pet = 0, unpaid = 0;
  vkRows_('pay').forEach(function (r) { if (r[10] === VK_ST.ok) inc += vkAmt_(r[5]); });
  vkRows_('exp').forEach(function (r) {
    if (r[11] === VK_ST.void) return;
    if (r[11] === VK_ST.unpaid) { unpaid += vkAmt_(r[5]); return; }
    exp += vkAmt_(r[5]);
    if (String(r[7]) === 'تنخواه') expPet += vkAmt_(r[5]);
  });
  vkRows_('pet').forEach(function (r) { pet += vkAmt_(r[1]); });
  var total = open + inc - exp;
  var petty = pet - expPet;
  return { open: open, income: inc, expense: exp, total: total, petty: petty, box: total - petty, unpaid: unpaid };
}
/* اطلاعیه‌هایی که به این آدم مربوط است (مالک‌ها / ساکنان و همکاران / همه) */
function vkAnnFor_(ms, isAdmin) {
  var own = ms.some(function (x) { return vkIsOwnerRel_(x.rel); });
  var res = ms.some(function (x) { return !vkIsOwnerRel_(x.rel); });
  return vkRows_('ann').filter(function (r) {
    if (isAdmin) return true;
    if (r[4] === VK_AUD[2]) return own;
    if (r[4] === VK_AUD[1]) return res;
    return true;
  });
}
function vkLastAnn_(ms) { var rows = vkAnnFor_(ms || [], false); return rows.length ? rows[rows.length - 1] : null; }

function vkHome_(chat, name, uname, note) {
  var adm = vkAdmin_(chat);
  if (adm) return vkAdminHome_(chat, adm, note);
  var ms = vkMemberships_(chat);
  if (!ms.length) return vkEntry_(chat, name, uname);
  var act = vkActive_(ms);
  var s = '🏢 <b>هاب ساختمان پزشکان ونک</b>\n';
  if (note) s += note + '\n';
  ms.forEach(function (x) {
    s += '\n<b>' + vkUnitFa_(x.unit) + '</b> · ' + vkEsc_(x.rel);
    if (x.status !== VK_ST.active) { s += '\n⏳ عضویت در انتظار تأیید مسئول ساختمان'; return; }
    var d = vkDebtOf_(x.unit);
    if (d.due > 0) s += '\n💳 مانده شارژ: <b>' + vkToman_(d.due) + '</b>';
    else if (d.charged > 0) s += '\n✅ شارژ واحد تسویه است';
    if (d.waiting > 0) s += '\n⏳ ' + vkToman_(d.waiting) + ' منتظر تأیید';
  });
  if (act.length) {
    var f = vkFund_();
    s += '\n\n💼 موجودی ساختمان: ' + vkToman_(f.total);
  }
  var la = vkLastAnn_(ms);
  if (la) s += '\n📣 آخرین اطلاعیه: ' + vkEsc_(la[2]) + ' <i>(' + vkEsc_(String(la[1]).split(' ')[0]) + ')</i>';
  var rows = [];
  if (act.length) {
    rows.push([vkB_('💳 پرداخت شارژ', 'pay'), vkB_('🧾 حساب واحد من', 'my')]);
    if (act.some(function (x) { return vkIsOwnerRel_(x.rel); })) rows.push([vkB_('📊 وضعیت همهٔ واحدها', 'all')]);
    rows.push([vkB_('🧮 هزینه‌های ساختمان', 'exl'), vkB_('📄 شیت و اسناد', 'doc')]);
  }
  rows.push([vkB_('📣 اطلاعیه‌ها', 'ann'), vkB_('💬 درخواست یا مشکل', 'rq')]);
  rows.push([vkB_('👥 دعوت همسر، منشی یا همکار', 'inv')]);
  rows.push([vkB_('➕ واحد دیگر', 'more'), vkB_('📧 ایمیل من', 'mail')]);
  vkSay_(chat, s, vkKb_(rows));
}

/* حساب یک واحد: شارژها و پرداخت‌ها */
function vkMyUnit_(chat, unitArg) {
  var act = vkActive_(vkMemberships_(chat));
  var adm = vkAdmin_(chat);
  if (!act.length && !adm) return vkSay_(chat, 'این بخش بعد از تأیید عضویت باز می‌شود.');
  if (!unitArg && act.length > 1) return vkSay_(chat, 'کدام واحد؟', vkKb_([act.map(function (x) { return vkB_(vkUnitFa_(x.unit), 'my:' + x.unit); })]));
  var u = vkUnitKey_(unitArg || act[0].unit);
  if (!adm && !act.some(function (x) { return x.unit === u; })) return vkSay_(chat, 'به حساب این واحد دسترسی ندارید.');
  var d = vkDebtOf_(u), s = '🧾 <b>حساب ' + vkUnitFa_(u) + '</b>\n';
  var ch = vkRows_('chg').filter(function (r) { return vkUnitKey_(r[2]) === u; });
  var py = vkRows_('pay').filter(function (r) { return vkUnitKey_(r[2]) === u && r[10] !== VK_ST.no; });
  s += '\n<b>شارژها</b>';
  if (!ch.length) s += '\n· هنوز شارژی ثبت نشده';
  ch.slice(-8).forEach(function (r) { s += '\n· ' + vkEsc_(r[1] || r[0]) + ': ' + vkToman_(vkAmt_(r[3])); });
  s += '\n\n<b>پرداخت‌ها</b>';
  if (!py.length) s += '\n· هنوز پرداختی ثبت نشده';
  py.slice(-8).forEach(function (r) { s += '\n· ' + vkEsc_(String(r[1]).split(' ')[0]) + ': ' + vkToman_(vkAmt_(r[5])) + (r[10] === VK_ST.ok ? ' ✅' : ' ⏳'); });
  s += '\n\n' + (d.due > 0 ? '💳 مانده: <b>' + vkToman_(d.due) + '</b>' : d.due < 0 ? '💚 بستانکار: ' + vkToman_(-d.due) : '✅ تسویه');
  var kb = [[vkB_('💳 پرداخت شارژ', 'pay:' + u)], [vkB_('↩️ خانهٔ ساختمان', 'h')]];
  vkSay_(chat, s, vkKb_(kb));
}

/* همهٔ واحدها: برای مالک‌ها و مدیران */
function vkAllUnits_(chat) {
  var adm = vkAdmin_(chat);
  var own = vkActive_(vkMemberships_(chat)).some(function (x) { return vkIsOwnerRel_(x.rel); });
  if (!adm && !own) return vkSay_(chat, 'این نما برای مالک‌ها و مدیر ساختمان است.');
  var list = vkUnitsList_();
  if (!list.length) return vkSay_(chat, 'فهرست واحدها هنوز در شیت پر نشده.');
  var s = '📊 <b>وضعیت واحدها</b>\n', tot = 0;
  list.forEach(function (x) {
    var d = vkDebtOf_(x.unit);
    tot += Math.max(0, d.due);
    s += '\n' + (d.due > 0 ? '🔴' : '🟢') + ' ' + vkUnitFa_(x.unit) + (x.occ ? ' · ' + vkEsc_(x.occ) : '') + ': ' + (d.due > 0 ? vkToman_(d.due) : 'تسویه');
  });
  s += '\n\n<b>جمع بدهی واحدها:</b> ' + vkToman_(tot);
  vkSay_(chat, s, vkKb_([[vkB_('↩️ بازگشت', 'h')]]));
}

/* فهرست هزینه‌ها برای اعضا: شفافیت */
function vkExpList_(chat) {
  var rows = vkRows_('exp').filter(function (r) { return r[11] !== VK_ST.void; });
  var f = vkFund_();
  var s = '🧮 <b>هزینه‌های ساختمان</b>\n';
  if (!rows.length) s += '\nهنوز هزینه‌ای ثبت نشده.';
  rows.slice(-10).reverse().forEach(function (r) {
    s += '\n· ' + vkEsc_(vkYmLabel_(r[1])) + ' · ' + vkEsc_(r[3]) + ': <b>' + vkToman_(vkAmt_(r[5])) + '</b>' + (r[4] ? '\n  <i>' + vkEsc_(String(r[4]).slice(0, 80)) + '</i>' : '');
  });
  s += '\n\n💼 موجودی ساختمان: <b>' + vkToman_(f.total) + '</b>';
  s += '\nفاکتور هر هزینه در شیت، ستون «فاکتور» لینک شده است.';
  vkSay_(chat, s, vkKb_([[vkB_('📄 شیت و اسناد', 'doc')], [vkB_('↩️ بازگشت', 'h')]]));
}

function vkDocs_(chat) {
  var ss = vkProp_('VK_SS'), docs = vkProp_('VK_DOCS');
  var ms = vkMemberships_(chat), adm = vkAdmin_(chat);
  var mail = adm ? adm.email : (ms[0] && ms[0].email);
  var s = '📄 <b>شیت و اسناد ساختمان</b>\n\nشیت زنده است: هر پرداخت، هزینه و اطلاعیه همان لحظه آنجا دیده می‌شود. فاکتورها و فیش هزینه‌ها در پوشهٔ اسناد است.';
  if (!mail) s += '\n\n📧 برای باز شدن لینک‌ها، ایمیل گوگل‌تان را ثبت کنید.';
  var rows = [];
  if (ss) rows.push([vkU_('📊 گوگل‌شیت ساختمان', 'https://docs.google.com/spreadsheets/d/' + ss + '/edit')]);
  if (docs) rows.push([vkU_('🗂 پوشهٔ فاکتورها', 'https://drive.google.com/drive/folders/' + docs)]);
  rows.push([vkB_('📧 ثبت یا تغییر ایمیل', 'mail')]);
  rows.push([vkB_('↩️ بازگشت', 'h')]);
  vkSay_(chat, s, vkKb_(rows));
}

function vkInvite_(chat) {
  vkSay_(chat,
    '👥 <b>لینک پیوستن به هاب ساختمان</b>\n\n' +
    'این پیام را برای همسر، پزشک، منشی یا همکار واحد بفرستید. هر کس با لینک خودش وصل می‌شود، واحد و اسمش را می‌گوید و مسئول ساختمان تأیید می‌کند:\n\n' + vkLink_());
}

/* ثبت ایمیل برای عضو: دسترسی خواندن به شیت و پوشهٔ اسناد */
function vkEmailAsk_(chat) {
  vkSetState_(chat, { f: 'mem', s: 'email' });
  vkSay_(chat, '📧 ایمیل گوگل (جیمیل) خودتان را بنویسید.');
}
function vkEmailStep_(chat, st, text) {
  var em = String(text || '').trim().toLowerCase();
  if (!vkEmailOk_(em)) return vkSay_(chat, 'این ایمیل درست به نظر نمی‌رسد. دوباره بنویسید.');
  vkClear_(chat);
  var ms = vkMemberships_(chat), shared = false;
  ms.forEach(function (x) { vkSet_('mem', x.row, 8, em); });
  if (vkActive_(ms).length) shared = vkShareView_(em);
  ms.forEach(function (x) { if (shared) vkSet_('mem', x.row, 10, 'داده شد'); });
  vkSay_(chat, shared ? '✅ ثبت شد و دسترسی شیت و پوشهٔ اسناد به همین ایمیل داده شد.' : '✅ ثبت شد. بعد از تأیید عضویت، دسترسی شیت به همین ایمیل داده می‌شود.', vkKb_([[vkB_('📄 شیت و اسناد', 'doc')]]));
}
/* دسترسی خواندن: فقط شیت عمومی و پوشهٔ اسناد هزینه‌ها، هرگز پشت‌صحنه */
function vkShareView_(email) {
  if (!email) return false;
  if (vkDry_()) { VK_DB._shared = (VK_DB._shared || []).concat([email]); return true; }
  var ok = false;
  try { DriveApp.getFileById(vkProp_('VK_SS')).addViewer(email); ok = true; } catch (e) { console.error('vkShareView_ ss: ' + e); }
  try { if (vkProp_('VK_DOCS')) DriveApp.getFolderById(vkProp_('VK_DOCS')).addViewer(email); } catch (e2) { console.error('vkShareView_ docs: ' + e2); }
  return ok;
}
/* دسترسی ویرایش: فقط مدیران ساختمان */
function vkShareEdit_(email) {
  if (!email) return false;
  if (vkDry_()) { VK_DB._editors = (VK_DB._editors || []).concat([email]); return true; }
  var ok = false;
  ['VK_SS', 'VK_PRIV'].forEach(function (k) { try { DriveApp.getFileById(vkProp_(k)).addEditor(email); ok = true; } catch (e) { console.error('vkShareEdit_ ' + k + ': ' + e); } });
  ['VK_DOCS', 'VK_PRIVF'].forEach(function (k) { try { if (vkProp_(k)) DriveApp.getFolderById(vkProp_(k)).addEditor(email); } catch (e) {} });
  return ok;
}

/* ═══════════ پرداخت شارژ ═══════════ */
function vkPayIntro_(chat, unitArg) {
  var act = vkActive_(vkMemberships_(chat));
  if (!act.length) return vkSay_(chat, 'پرداخت بعد از تأیید عضویت باز می‌شود. مسئول ساختمان به‌زودی تأیید می‌کند.');
  if (!unitArg && act.length > 1) return vkSay_(chat, 'برای کدام واحد؟', vkKb_([act.map(function (x) { return vkB_(vkUnitFa_(x.unit), 'pay:' + x.unit); })]));
  var me = act[0];
  if (unitArg) act.forEach(function (x) { if (x.unit === vkUnitKey_(unitArg)) me = x; });
  var d = vkDebtOf_(me.unit);
  var s = '💳 <b>پرداخت شارژ ' + vkUnitFa_(me.unit) + '</b>\n';
  s += d.due > 0 ? '\nمانده: <b>' + vkToman_(d.due) + '</b>\n' : '\nالان بدهی ثبت‌شده‌ای ندارید؛ پرداخت پیش‌پرداخت هم ثبت می‌شود.\n';
  s += '\n<b>۱. پرداخت آنلاین</b> با دکمهٔ زیر';
  var payBlk = vkPayBlock_(false);
  if (payBlk) s += '\n\n<b>۲. کارت به کارت یا شبا</b>\n' + payBlk;
  s += '\n\nبعد از پرداخت، «✅ پرداخت کردم» را بزنید و فیش را بفرستید. پرداخت بعد از تأیید مدیر ساختمان در حساب واحد می‌نشیند و همین‌جا خبرتان می‌کنم.';
  vkSay_(chat, s, vkKb_([[vkU_('🌐 پرداخت آنلاین', VK_PAY_LINK)], [vkB_('✅ پرداخت کردم، فیش را می‌فرستم', 'pd:' + me.unit)], [vkB_('↩️ بازگشت', 'h')]]));
}
/* شروع ثبت پرداخت. برای مدیر (apay) واحد و پرداخت‌کننده از قبل انتخاب شده است. */
function vkPayStart_(chat, name, unit, asAdmin) {
  var st = { f: asAdmin ? 'apay' : 'pay', s: 'amt', unit: vkUnitKey_(unit) };
  if (!asAdmin) {
    var me = null;
    vkActive_(vkMemberships_(chat)).forEach(function (x) { if (x.unit === st.unit) me = x; });
    if (!me) return vkSay_(chat, 'به این واحد دسترسی ندارید.');
    st.payer = me.name; st.rel = me.rel;
  }
  vkSetState_(chat, st);
  var d = vkDebtOf_(st.unit);
  var rows = [];
  if (d.due > 0) rows.push([vkB_('همان ' + vkToman_(d.due), 'pa:' + d.due)]);
  rows.push([vkB_('✖️ انصراف', 'x')]);
  vkSay_(chat, '💰 <b>مبلغ پرداخت</b> ' + vkUnitFa_(st.unit) + ' را به تومان بنویسید.\n<i>مثل ۱۲۰۰۰۰۰۰ یا «۱۲ میلیون»</i>', vkKb_(rows));
}
function vkPayAmount_(chat, st, amt) {
  st.amt = amt; st.s = 'method'; vkSetState_(chat, st);
  vkSay_(chat, '✅ ' + vkToman_(amt) + '\n\nاز چه راهی پرداخت شد؟', vkKb_(VK_METHODS.map(function (m, i) { return [vkB_(m, 'pm:' + i)]; })));
}
function vkPayMethod_(chat, st, i) {
  st.method = VK_METHODS[i] || VK_METHODS[1];
  if (st.f === 'apay') {
    st.s = 'for'; vkSetState_(chat, st);
    return vkSay_(chat, '✅ ' + vkEsc_(st.method) + '\n\n🗓 این پرداخت <b>بابت</b> چیست؟ مثلاً «شارژ بهار ۱۴۰۵» یا «پرداخت اردیبهشت». اگر تاریخ پرداخت با امروز فرق دارد همین‌جا بنویسید.', vkKb_([[vkB_('بابت شارژ جاری', 'pf')]]));
  }
  st.s = 'rcpt'; vkSetState_(chat, st);
  vkSay_(chat, '✅ ' + vkEsc_(st.method) + '\n\n🧾 حالا <b>عکس یا فایل فیش</b> را همین‌جا بفرستید.\n<i>اگر از مینی‌اپ آمده‌اید، عکس را در چت بات بفرستید.</i>', vkKb_([[vkB_('فیش ندارم؛ کد پیگیری می‌نویسم', 'pnr')]]));
}
function vkPayStep_(chat, name, st, text, file) {
  if (st.s === 'amt') {
    var a = vkMoney_(text);
    if (!a) return vkSay_(chat, 'مبلغ را به تومان و با عدد بنویسید؛ مثل ۱۲۰۰۰۰۰۰ یا «۱۲ میلیون».');
    return vkPayAmount_(chat, st, a);
  }
  if (st.s === 'for') {
    st.forText = String(text || '').slice(0, 200);
    st.s = 'rcpt'; vkSetState_(chat, st);
    return vkSay_(chat, '🧾 عکس یا فایل فیش را بفرستید.', vkKb_([[vkB_('فیش ندارم', 'pnr')]]));
  }
  if (st.s === 'rcpt') {
    if (file) { st.file = file; return vkPaySave_(chat, name, st); }
    if (text) { st.track = String(text).slice(0, 80); return vkPaySave_(chat, name, st); }
  }
  if (st.s === 'code') {
    st.track = String(text || '').slice(0, 80);
    return vkPaySave_(chat, name, st);
  }
  vkSay_(chat, 'از دکمه‌های بالا استفاده کنید یا «انصراف» بنویسید.');
}
function vkPaySave_(chat, name, st) {
  vkClear_(chat);
  var adm = vkAdmin_(chat);
  var code = vkNextCode_('pay', 'VP', 1001);
  var link = '', fid = '';
  if (st.file) { fid = st.file.kind + '|' + st.file.id; link = vkSaveFile_(st.file, code + ' فیش شارژ ' + vkUnitFa_(st.unit), 'VK_PRIVF'); }
  var selfApprove = st.f === 'apay' && adm && adm.approve;
  var forText = st.forText || vkChargeLabel_(st.unit);
  var payer = st.payer || (st.f === 'apay' ? vkUnitOcc_(st.unit) : name);
  vkAppend_('pay', [code, vkStamp_(), st.unit, payer, st.rel || (st.f === 'apay' ? 'ثبت مدیر' : ''), st.amt, forText, st.method, link, st.track || '',
    selfApprove ? VK_ST.ok : VK_ST.wait, selfApprove ? adm.name : '', selfApprove ? vkStamp_() : '', (adm ? adm.name : name) + ' (' + chat + ')', '', selfApprove ? VK_ST.ok : '', fid]);
  vkLog_(adm ? adm.name : name, 'ثبت پرداخت', code, vkUnitFa_(st.unit) + ' · ' + st.amt);
  if (selfApprove) {
    vkSay_(chat, '✅ پرداخت <code>' + code + '</code> ثبت و تأیید شد.\n' + vkUnitFa_(st.unit) + ' · ' + vkToman_(st.amt), vkKb_([[vkB_('↩️ میز ساختمان', 'ad')]]));
    vkAfterConfirm_(code, adm.name, chat);
    return;
  }
  vkSay_(chat,
    '🙏 <b>ثبت شد.</b>\n' + vkUnitFa_(st.unit) + ' · ' + vkToman_(st.amt) + ' · ' + vkEsc_(st.method) + '\n<code>' + code + '</code>\n\n' +
    'این پرداخت به‌زودی تأیید می‌شود و همین‌جا خبرتان می‌کنم.', vkKb_([[vkB_('↩️ خانهٔ ساختمان', adm ? 'ad' : 'h')]]));
  var card = vkPayCard_(vkFind_('pay', code));
  var kb = vkKb_([[vkB_('✅ تأیید', 'pok:' + code), vkB_('❌ رد', 'pno:' + code)]]);
  if (fid) vkTellApproversFile_(fid, card, kb, chat);
  else vkTellManagers_(card, kb, true, chat);
}
function vkPayCard_(r) {
  if (!r) return '';
  return '💳 <b>پرداخت منتظر تأیید</b>\n' + vkUnitFa_(r[2]) + ' · ' + vkEsc_(r[3]) + (r[4] ? ' (' + vkEsc_(r[4]) + ')' : '') +
    '\n<b>' + vkToman_(vkAmt_(r[5])) + '</b> · ' + vkEsc_(r[7]) + '\nبابت: ' + vkEsc_(r[6]) +
    (r[9] ? '\nکد پیگیری: <code>' + vkEsc_(r[9]) + '</code>' : '') + '\nثبت: ' + vkEsc_(r[1]) + '\n<code>' + vkEsc_(r[0]) + '</code>';
}
function vkUnitOcc_(unit) { var u = vkUnitKey_(unit), o = ''; vkUnitsList_().forEach(function (x) { if (x.unit === u) o = x.occ; }); return o || vkUnitFa_(u); }
function vkChargeLabel_(unit) {
  var u = vkUnitKey_(unit), last = '';
  vkRows_('chg').forEach(function (r) { if (vkUnitKey_(r[2]) === u) last = r[1] || r[0]; });
  return last ? 'شارژ ' + last : 'شارژ';
}
/* تأیید یا رد: فقط کسی که «تأیید پرداخت؟ = بله» دارد */
function vkPayDecide_(chat, code, ok) {
  var adm = vkAdmin_(chat);
  if (!adm || !adm.approve) return vkSay_(chat, 'تأیید پرداخت با مدیر ساختمان است.');
  var r = vkFind_('pay', code);
  if (!r) return vkSay_(chat, 'این پرداخت پیدا نشد.');
  if (r[10] !== VK_ST.wait) return vkSay_(chat, 'این پرداخت قبلاً «' + vkEsc_(r[10]) + '» شده است.');
  if (!ok) {
    vkSetState_(chat, { f: 'pno', s: 'why', code: code });
    return vkSay_(chat, '❌ دلیل کوتاه رد را بنویسید تا برای پرداخت‌کننده بفرستم.', vkKb_([[vkB_('بدون توضیح', 'pnx:' + code)]]));
  }
  vkSet_('pay', r._r, 11, VK_ST.ok);
  vkSet_('pay', r._r, 12, adm.name);
  vkSet_('pay', r._r, 13, vkStamp_());
  vkSet_('pay', r._r, 16, VK_ST.ok);
  vkLog_(adm.name, 'تأیید پرداخت', code, '');
  vkSay_(chat, '✅ تأیید شد: ' + vkUnitFa_(r[2]) + ' · ' + vkToman_(vkAmt_(r[5])));
  vkAfterConfirm_(code, adm.name, chat);
}
function vkPayRejectNote_(chat, name, st, text) { vkClear_(chat); vkPayReject_(chat, st.code, text); }
function vkPayReject_(chat, code, why) {
  var adm = vkAdmin_(chat);
  if (!adm || !adm.approve) return;
  var r = vkFind_('pay', code);
  if (!r || r[10] !== VK_ST.wait) return vkSay_(chat, 'این پرداخت دیگر منتظر تأیید نیست.');
  vkSet_('pay', r._r, 11, VK_ST.no);
  vkSet_('pay', r._r, 12, adm.name);
  vkSet_('pay', r._r, 13, vkStamp_());
  vkSet_('pay', r._r, 15, String(why || '').slice(0, 300));
  vkSet_('pay', r._r, 16, VK_ST.no);
  vkLog_(adm.name, 'رد پرداخت', code, why || '');
  vkSay_(chat, '❌ ثبت شد: پرداخت ' + code + ' تأیید نشد.');
  vkNotifyPayer_(r, '❌ <b>پرداخت شما تأیید نشد</b>\n' + vkUnitFa_(r[2]) + ' · ' + vkToman_(vkAmt_(r[5])) + (why ? '\n' + vkEsc_(why) : '') + '\n\nاگر فکر می‌کنید اشتباهی شده، «💬 درخواست یا مشکل» را بزنید تا مسئول ساختمان پیگیری کند.');
  vkTellManagers_('❌ پرداخت ' + vkUnitFa_(r[2]) + ' (' + vkEsc_(r[3]) + ') · ' + vkToman_(vkAmt_(r[5])) + ' تأیید نشد.' + (why ? '\n' + vkEsc_(why) : ''), null, false, chat);
}
function vkAfterConfirm_(code, byName, exceptChat) {
  var r = vkFind_('pay', code);
  if (!r) return;
  var d = vkDebtOf_(r[2]);
  vkNotifyPayer_(r, '✅ <b>پرداخت شما تأیید شد</b>\n' + vkUnitFa_(r[2]) + ' · ' + vkToman_(vkAmt_(r[5])) + '\n' + (d.due > 0 ? 'مانده: ' + vkToman_(d.due) : 'حساب واحد تسویه است 🌿') + '\n\nممنون از همراهی‌تان.');
  vkTellManagers_('✅ <b>پرداخت تأیید شد</b>\n' + vkUnitFa_(r[2]) + ' · ' + vkEsc_(r[3]) + ' · ' + vkToman_(vkAmt_(r[5])) + '\n' + (d.due > 0 ? 'مانده واحد: ' + vkToman_(d.due) : 'واحد تسویه است'), null, false, exceptChat);
}
/* خبر به ثبت‌کنندهٔ پرداخت (chat_id داخل «ثبت‌کننده») */
function vkNotifyPayer_(r, text) {
  var m = String(r[13] || '').match(/\((\d{4,})\)/);
  if (m && !vkAdmin_(m[1])) { try { vkSay_(m[1], text, vkKb_([[vkB_(VK_BTN, 'h')]])); } catch (e) {} return; }
  /* پرداختی که مدیر ثبت کرده: به اعضای فعال همان واحد (ساکن و همکار) */
  vkMembersOf_(r[2]).forEach(function (x) { if (!vkIsOwnerRel_(x.rel)) { try { vkSay_(x.chat, text, vkKb_([[vkB_(VK_BTN, 'h')]])); } catch (e) {} } });
}
function vkMembersOf_(unit) {
  var u = vkUnitKey_(unit);
  return vkRows_('mem').filter(function (r) { return vkUnitKey_(r[2]) === u && r[8] === VK_ST.active; })
    .map(function (r) { return { name: r[3], rel: r[4], chat: String(r[5]).split(/[\s,،;]+/)[0] }; });
}
function vkPendingPays_(chat) {
  var adm = vkAdmin_(chat);
  if (!adm) return;
  var list = vkRows_('pay').filter(function (r) { return r[10] === VK_ST.wait; });
  if (!list.length) return vkSay_(chat, '✅ پرداختی منتظر تأیید نیست.', vkKb_([[vkB_('↩️ میز ساختمان', 'ad')]]));
  vkSay_(chat, '💳 <b>' + vkFa_(list.length) + ' پرداخت منتظر تأیید</b>');
  list.slice(0, 10).forEach(function (r) {
    var kb = adm.approve ? vkKb_([[vkB_('✅ تأیید', 'pok:' + r[0]), vkB_('❌ رد', 'pno:' + r[0])]]) : null;
    vkSendFile_(chat, r[16], vkPayCard_(r) + (adm.approve ? '' : '\n<i>تأیید با مدیر ساختمان است.</i>'), kb);
  });
}

/* ذخیرهٔ فایل تلگرام در درایو؛ لینک برمی‌گرداند */
function vkSaveFile_(file, title, folderProp) {
  if (!file) return '';
  if (vkDry_()) return 'dry://' + file.id;
  try {
    var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
    var info = JSON.parse(tgFetchRetry_('https://api.telegram.org/bot' + token + '/getFile?file_id=' + encodeURIComponent(file.id), { muteHttpExceptions: true }).getContentText());
    if (!info.ok) return '';
    var path = info.result.file_path;
    var blob = tgFetchRetry_('https://api.telegram.org/file/bot' + token + '/' + path, { muteHttpExceptions: true }).getBlob();
    var ext = (String(path).match(/\.[a-z0-9]+$/i) || [''])[0] || (file.kind === 'photo' ? '.jpg' : '');
    blob.setName(String(title).replace(/[\/\\:*?"<>|]/g, ' ') + ext);
    var fid = vkProp_(folderProp) || vkProp_('VK_DOCS');
    var f = fid ? DriveApp.getFolderById(fid).createFile(blob) : DriveApp.createFile(blob);
    return f.getUrl();
  } catch (e) { console.error('vkSaveFile_: ' + e); return ''; }
}

/* ═══════════ میز مدیر و مسئول ساختمان ═══════════ */
function vkAdminHome_(chat, adm, note) {
  adm = adm || vkAdmin_(chat);
  var f = vkFund_();
  var wait = vkRows_('pay').filter(function (r) { return r[10] === VK_ST.wait; }).length;
  var pend = vkRows_('mem').filter(function (r) { return r[8] === VK_ST.pending; }).length;
  var reqOpen = vkRows_('req').filter(function (r) { return r[7] === VK_ST.rNew || r[7] === VK_ST.rWork; }).length;
  var units = vkUnitsList_();
  var debt = 0; units.forEach(function (x) { debt += Math.max(0, vkDebtOf_(x.unit).due); });
  var s = '🏢 <b>میز ساختمان پزشکان ونک</b> · ' + vkEsc_(adm.role) + '\n';
  if (note) s += note + '\n';
  s += '\n💼 موجودی کل: <b>' + vkToman_(f.total) + '</b>';
  s += '\n   صندوق ' + vkToman_(f.box) + ' · تنخواه ' + vkToman_(f.petty);
  if (f.unpaid) s += '\n   هزینهٔ پرداخت‌نشده: ' + vkToman_(f.unpaid);
  s += '\n🔴 جمع بدهی واحدها: ' + vkToman_(debt);
  s += '\n\n⏳ پرداخت منتظر تأیید: <b>' + vkFa_(wait) + '</b>';
  s += '\n👤 عضو منتظر تأیید: <b>' + vkFa_(pend) + '</b>';
  s += '\n💬 درخواست باز: <b>' + vkFa_(reqOpen) + '</b>';
  if (!units.length) s += '\n\n⚠️ <b>اول تب «واحدها» را پر کنید</b> (یا «🏷 تعریف واحد» را بزنید). بدهی‌ها از روی همین فهرست حساب می‌شود.';
  var rows = [
    [vkB_('⏳ پرداخت‌های منتظر (' + vkFa_(wait) + ')', 'pp'), vkB_('👤 اعضا (' + vkFa_(pend) + ')', 'mm')],
    [vkB_('🧾 ثبت هزینه', 'ex'), vkB_('💳 ثبت پرداخت واحد', 'ap')],
    [vkB_('📅 صدور شارژ دوره', 'ch'), vkB_('📣 اطلاعیهٔ تازه', 'an')],
    [vkB_('💬 درخواست‌ها (' + vkFa_(reqOpen) + ')', 'rl'), vkB_('📊 گزارش مالی', 'rep')],
    [vkB_('💼 واریز به تنخواه', 'pt'), vkB_('🏷 تعریف واحد', 'ut')],
    [vkB_('📊 وضعیت همهٔ واحدها', 'all'), vkB_('🧮 هزینه‌ها', 'exl')],
    [vkB_('🔗 لینک دعوت ساکنان', 'lk'), vkB_('📄 شیت و اسناد', 'doc')],
    [vkB_('📧 دسترسی ویرایش شیت برای من', 'ae')]
  ];
  vkSay_(chat, s, vkKb_(rows));
}

/* ---------- اعضا ---------- */
function vkMembersDesk_(chat) {
  var pend = vkRows_('mem').filter(function (r) { return r[8] === VK_ST.pending; });
  var act = vkRows_('mem').filter(function (r) { return r[8] === VK_ST.active; });
  vkSay_(chat, '👤 <b>اعضا</b>\nفعال: ' + vkFa_(act.length) + ' · منتظر تأیید: ' + vkFa_(pend.length) + '\n<i>غیرفعال‌کردن یا اصلاح واحد: ستون «وضعیت» و «واحد» در تب «اعضا» پشت‌صحنه.</i>');
  pend.slice(0, 12).forEach(function (r) {
    vkSay_(chat, '👤 ' + vkEsc_(r[3]) + ' · ' + vkUnitFa_(r[2]) + ' · ' + vkEsc_(r[4]) + (r[7] ? '\n📧 ' + vkEsc_(r[7]) : '') + (r[11] ? '\n⚠️ ' + vkEsc_(r[11]) : '') + '\n<code>' + vkEsc_(r[0]) + '</code>',
      vkKb_([[vkB_('✅ تأیید', 'mok:' + r[0]), vkB_('❌ رد', 'mno:' + r[0])]]));
  });
}
function vkMemberDecide_(chat, code, ok) {
  var adm = vkAdmin_(chat);
  if (!adm) return;
  var r = vkFind_('mem', code);
  if (!r) return vkSay_(chat, 'این عضو پیدا نشد.');
  if (r[8] !== VK_ST.pending) return vkSay_(chat, 'این عضویت قبلاً «' + vkEsc_(r[8]) + '» شده است.');
  var who = String(r[5]).split(/[\s,،;]+/)[0];
  vkSet_('mem', r._r, 9, ok ? VK_ST.active : VK_ST.no);
  vkSet_('mem', r._r, 11, adm.name + ' · ' + vkStamp_());
  vkLog_(adm.name, ok ? 'تأیید عضو' : 'رد عضو', code, r[3]);
  vkIdsDrop_();
  if (!ok) {
    try { tgSetVal_('vkm', who, '0'); } catch (e) {}
    vkSay_(chat, '❌ ثبت شد: ' + vkEsc_(r[3]) + ' تأیید نشد.');
    try { vkSay_(who, 'عضویت شما در هاب ساختمان تأیید نشد. اگر اشتباهی شده، با مسئول ساختمان هماهنگ کنید و دوباره با لینک وصل شوید.'); } catch (e2) {}
    return;
  }
  var shared = false;
  if (r[7]) { shared = vkShareView_(r[7]); if (shared) vkSet_('mem', r._r, 10, 'داده شد'); }
  vkSay_(chat, '✅ ' + vkEsc_(r[3]) + ' · ' + vkUnitFa_(r[2]) + ' فعال شد.' + (r[7] ? (shared ? '\n📧 دسترسی شیت داده شد.' : '\n⚠️ دسترسی شیت داده نشد؛ ایمیل را چک کنید.') : ''));
  vkTellOps_('✅ ' + vkEsc_(r[3]) + ' · ' + vkUnitFa_(r[2]) + ' عضو فعال شد.', null, chat);
  try {
    vkSay_(who, '🎉 <b>عضویت شما در هاب ساختمان تأیید شد.</b>\n' + vkUnitFa_(r[2]) + ' · ' + vkEsc_(r[4]) + (shared ? '\n📧 دسترسی گوگل‌شیت و اسناد هم به ایمیلتان داده شد.' : ''), vkKb_([[vkB_(VK_BTN, 'h')]]));
  } catch (e3) {}
}

/* ---------- ثبت هزینه ---------- */
function vkExpStart_(chat) {
  vkSetState_(chat, { f: 'exp', s: 'cat' });
  var rows = [[vkB_('💂 حقوق نگهبان و سرایدار (آقای ' + VK_GUARD + ')', 'eg')]];
  for (var i = 0; i < VK_EXP_CATS.length; i += 2) {
    var r = [vkB_(VK_EXP_CATS[i], 'ec:' + i)];
    if (VK_EXP_CATS[i + 1]) r.push(vkB_(VK_EXP_CATS[i + 1], 'ec:' + (i + 1)));
    rows.push(r);
  }
  rows.push([vkB_('✖️ انصراف', 'x')]);
  vkSay_(chat, '🧾 <b>ثبت هزینهٔ ساختمان</b>\nموضوع هزینه؟', vkKb_(rows));
}
function vkExpCat_(chat, st, i, guard) {
  st.cat = guard ? VK_EXP_CATS[0] : (VK_EXP_CATS[i] || VK_EXP_CATS[VK_EXP_CATS.length - 1]);
  if (guard) { st.payee = 'آقای ' + VK_GUARD; st.desc = 'حقوق نگهبان و سرایدار'; }
  st.s = 'month'; vkSetState_(chat, st);
  var ms = vkMonthList_(), rows = [], line = [];
  ms.forEach(function (ym, k) {
    line.push(vkB_((k === 0 ? 'این ماه · ' : '') + vkYmLabel_(ym), 'mo:' + ym));
    if (line.length === 2 || k === 0) { rows.push(line); line = []; }
  });
  if (line.length) rows.push(line);
  vkSay_(chat, '✅ ' + vkEsc_(st.cat) + '\n\n🗓 این هزینه <b>مال کدام ماه</b> است؟\n<i>برای هزینه‌های قبلی، ماه خودش را بزنید تا سر جایش بنشیند.</i>', vkKb_(rows));
}
function vkExpMonth_(chat, st, ym) {
  st.ym = ym; st.s = 'amt'; vkSetState_(chat, st);
  vkSay_(chat, '✅ ' + vkEsc_(vkYmLabel_(ym)) + '\n\n💰 <b>مبلغ</b> را به تومان بنویسید.\n<i>مثل ۵۰۰۰۰۰۰ یا «۵ میلیون»</i>');
}
function vkExpStep_(chat, name, st, text, file) {
  if (st.s === 'amt') {
    var a = vkMoney_(text);
    if (!a) return vkSay_(chat, 'مبلغ را به تومان و با عدد بنویسید؛ مثل ۵۰۰۰۰۰۰ یا «۵ میلیون».');
    st.amt = a;
    if (st.desc) { st.s = 'inv'; vkSetState_(chat, st); return vkExpAskInv_(chat, st); }
    st.s = 'desc'; vkSetState_(chat, st);
    return vkSay_(chat, '✅ ' + vkToman_(a) + '\n\n📝 <b>شرح کوتاه</b> بنویسید؛ مثلاً «تعویض کلید مهتابی راه‌پله».');
  }
  if (st.s === 'desc') {
    if (String(text || '').trim().length < 3) return vkSay_(chat, 'یک شرح کوتاه بنویسید.');
    st.desc = String(text).trim().slice(0, 300); st.s = 'payee'; vkSetState_(chat, st);
    return vkSay_(chat, '👷 <b>دریافت‌کننده</b> کیست؟ نام و در صورت امکان شغل؛ مثلاً «آقای رضایی، برق‌کار».');
  }
  if (st.s === 'payee') {
    st.payee = String(text || '').trim().slice(0, 120); st.s = 'inv'; vkSetState_(chat, st);
    return vkExpAskInv_(chat, st);
  }
  if (st.s === 'inv') {
    if (!file) return vkSay_(chat, 'عکس یا فایل فاکتور را بفرستید، یا «فاکتور ندارد» را بزنید.', vkKb_([[vkB_('فاکتور ندارد', 'eis')]]));
    st.inv = file; st.s = 'sheba'; vkSetState_(chat, st);
    return vkExpAskSheba_(chat);
  }
  if (st.s === 'sheba') {
    var sh = vkEn_(text).replace(/[\s-]/g, '').toUpperCase();
    if (!/^(IR\d{24}|\d{16})$/.test(sh)) return vkSay_(chat, 'شبا (IR و ۲۴ رقم) یا شمارهٔ کارت ۱۶ رقمی را درست بنویسید، یا «ندارد» را بزنید.', vkKb_([[vkB_('ندارد', 'ess')]]));
    st.sheba = sh; st.s = 'from'; vkSetState_(chat, st);
    return vkExpAskFrom_(chat);
  }
  if (st.s === 'rcpt') {
    if (!file) return vkSay_(chat, 'عکس یا فایل فیش پرداخت را بفرستید، یا «بعداً» را بزنید.', vkKb_([[vkB_('بعداً اضافه می‌کنم', 'ers')]]));
    st.rcpt = file; return vkExpReview_(chat, st);
  }
  if (st.s === 'note') { st.note = String(text || '').slice(0, 300); return vkExpReview_(chat, st); }
  vkSay_(chat, 'از دکمه‌های بالا استفاده کنید یا «انصراف» بنویسید.');
}
function vkExpAskInv_(chat, st) {
  vkSay_(chat, '✅ ' + vkToman_(st.amt) + '\n\n🧾 <b>عکس یا فایل فاکتور</b> را بفرستید.', vkKb_([[vkB_('فاکتور ندارد', 'eis')]]));
}
function vkExpAskSheba_(chat) {
  vkSay_(chat, '🏦 <b>شبا یا شمارهٔ کارت دریافت‌کننده</b> را بنویسید.\n<i>فقط در فایل پشت‌صحنه ذخیره می‌شود، نه در شیت اعضا.</i>', vkKb_([[vkB_('ندارد', 'ess')]]));
}
function vkExpAskFrom_(chat) {
  vkSay_(chat, '💼 <b>از کجا پرداخت شد؟</b>', vkKb_(VK_FROM.map(function (x, i) { return [vkB_(i === 0 ? 'از تنخواه مسئول ساختمان' : x, 'ef:' + i)]; })));
}
function vkExpFrom_(chat, st, i) {
  st.from = VK_FROM[i] || VK_FROM[0];
  if (st.from === VK_FROM[2]) { st.s = 'review'; return vkExpReview_(chat, st); }
  st.s = 'rcpt'; vkSetState_(chat, st);
  vkSay_(chat, '✅ ' + vkEsc_(st.from) + '\n\n🧾 <b>عکس فیش پرداخت</b> را بفرستید.', vkKb_([[vkB_('بعداً اضافه می‌کنم', 'ers')]]));
}
function vkExpReview_(chat, st) {
  st.s = 'review'; vkSetState_(chat, st);
  var s = '🔎 <b>مرور هزینه</b>\n' +
    '\nموضوع: ' + vkEsc_(st.cat) + '\nماه: ' + vkEsc_(vkYmLabel_(st.ym)) + '\nمبلغ: <b>' + vkToman_(st.amt) + '</b>' +
    '\nشرح: ' + vkEsc_(st.desc) + '\nدریافت‌کننده: ' + vkEsc_(st.payee || '') +
    '\nپرداخت از: ' + vkEsc_(st.from) + '\nفاکتور: ' + (st.inv ? 'دارد' : 'ندارد') + ' · فیش: ' + (st.rcpt ? 'دارد' : 'ندارد') + (st.sheba ? ' · شبا: دارد' : '');
  vkSay_(chat, s, vkKb_([[vkB_('✅ ثبت کن', 'eok')], [vkB_('✖️ انصراف', 'x')]]));
}
function vkExpSave_(chat, name, st) {
  vkClear_(chat);
  var adm = vkAdmin_(chat);
  var who = adm ? adm.name : name;
  var code = vkNextCode_('exp', 'VE', 101);
  var inv = st.inv ? vkSaveFile_(st.inv, code + ' فاکتور ' + st.cat + ' ' + st.ym, 'VK_DOCS') : '';
  var rc = st.rcpt ? vkSaveFile_(st.rcpt, code + ' فیش پرداخت ' + st.ym, 'VK_DOCS') : '';
  var status = st.from === VK_FROM[2] ? VK_ST.unpaid : VK_ST.paid;
  vkAppend_('exp', [code, st.ym, vkStamp_(), st.cat, st.desc, st.amt, st.payee || '', st.from === VK_FROM[2] ? '' : st.from, inv || (st.inv ? 'فایل در بات' : ''), rc || (st.rcpt ? 'فایل در بات' : ''), who, status, st.note || '']);
  if (st.sheba) vkAppend_('sheba', [code, st.payee || '', st.sheba, vkStamp_()]);
  vkLog_(who, 'ثبت هزینه', code, st.cat + ' · ' + st.amt);
  var f = vkFund_();
  var kb = [];
  if (status === VK_ST.unpaid || !st.rcpt) kb.push([vkB_('🧾 افزودن فیش پرداخت', 'exf:' + code)]);
  kb.push([vkB_('↩️ میز ساختمان', 'ad')]);
  vkSay_(chat, '✅ <b>هزینه ثبت شد</b> <code>' + code + '</code>\n' + vkEsc_(st.cat) + ' · ' + vkToman_(st.amt) + ' · ' + vkEsc_(vkYmLabel_(st.ym)) +
    '\n\n💼 موجودی کل: ' + vkToman_(f.total) + '\n   صندوق ' + vkToman_(f.box) + ' · تنخواه ' + vkToman_(f.petty), vkKb_(kb));
  vkTellManagers_('🧾 <b>هزینهٔ تازه</b> <code>' + code + '</code>\n' + vkEsc_(st.cat) + ' · <b>' + vkToman_(st.amt) + '</b> · ' + vkEsc_(vkYmLabel_(st.ym)) + '\n' + vkEsc_(st.desc) + (st.payee ? ' · ' + vkEsc_(st.payee) : '') + '\nپرداخت از: ' + vkEsc_(st.from) + '\nثبت: ' + vkEsc_(who), null, false, chat);
}
/* افزودن فیش به هزینهٔ ثبت‌شده */
function vkExpFixStart_(chat, code) {
  if (!vkFind_('exp', code)) return vkSay_(chat, 'این هزینه پیدا نشد.');
  vkSetState_(chat, { f: 'efix', s: 'file', code: code });
  vkSay_(chat, '🧾 عکس یا فایل فیش پرداخت <code>' + vkEsc_(code) + '</code> را بفرستید.\nبا ثبت فیش، هزینه «پرداخت شد» می‌شود.');
}
function vkExpFix_(chat, name, st, file) {
  if (!file) return vkSay_(chat, 'عکس یا فایل فیش را بفرستید، یا «انصراف» بنویسید.');
  vkClear_(chat);
  var r = vkFind_('exp', st.code);
  if (!r) return vkSay_(chat, 'این هزینه پیدا نشد.');
  var link = vkSaveFile_(file, st.code + ' فیش پرداخت ' + r[1], 'VK_DOCS');
  vkSet_('exp', r._r, 10, link || 'فایل در بات');
  if (r[11] === VK_ST.unpaid) {
    vkSet_('exp', r._r, 12, VK_ST.paid);
    if (!r[7]) vkSet_('exp', r._r, 8, 'تنخواه');
  }
  vkLog_(name, 'فیش هزینه', st.code, '');
  vkSay_(chat, '✅ فیش به هزینهٔ <code>' + vkEsc_(st.code) + '</code> اضافه شد.', vkKb_([[vkB_('↩️ میز ساختمان', 'ad')]]));
}

/* ---------- شارژ دوره ---------- */
function vkChgStart_(chat) {
  var qs = vkSeasonList_().slice(-6);
  var rows = qs.map(function (k) { return [vkB_(vkSeasonLabel_(k), 'cq:' + k)]; });
  rows.push([vkB_('✖️ انصراف', 'x')]);
  vkSay_(chat, '📅 <b>صدور شارژ</b>\nشارژ کدام فصل؟ برای هر واحد «شارژ فصلی» از تب «واحدها» ساخته می‌شود و بعد در شیت قابل اصلاح است.', vkKb_(rows));
}
function vkChgPreview_(chat, key) {
  var units = vkUnitsList_();
  if (!units.length) return vkSay_(chat, 'تب «واحدها» خالی است. اول واحدها و شارژ فصلی را وارد کنید.', vkKb_([[vkB_('🏷 تعریف واحد', 'ut')]]));
  var have = {};
  vkRows_('chg').forEach(function (r) { if (String(r[0]) === key) have[vkUnitKey_(r[2])] = 1; });
  var add = [], skip = [], tot = 0;
  units.forEach(function (x) {
    if (x.status && String(x.status).indexOf('خالی') > -1) { skip.push(vkUnitFa_(x.unit) + ' (خالی)'); return; }
    if (have[x.unit]) { skip.push(vkUnitFa_(x.unit) + ' (قبلاً صادر شده)'); return; }
    if (!x.monthly) { skip.push(vkUnitFa_(x.unit) + ' (شارژ فصلی ندارد)'); return; }
    add.push({ unit: x.unit, amt: x.monthly }); tot += x.monthly;
  });
  vkSetState_(chat, { f: 'chg', s: 'ok', key: key, add: add });
  var s = '📅 <b>شارژ ' + vkEsc_(vkSeasonLabel_(key)) + '</b>\n';
  add.forEach(function (a) { s += '\n· ' + vkUnitFa_(a.unit) + ': ' + vkToman_(a.amt); });
  if (!add.length) s += '\nواحدی برای صدور نمانده.';
  s += '\n\nجمع: <b>' + vkToman_(tot) + '</b>';
  if (skip.length) s += '\n\n<i>کنار گذاشته شد: ' + vkEsc_(skip.join('، ')) + '</i>';
  var kb = add.length ? [[vkB_('✅ صادر کن', 'cok')], [vkB_('✖️ انصراف', 'x')]] : [[vkB_('↩️ میز ساختمان', 'ad')]];
  vkSay_(chat, s, vkKb_(kb));
}
function vkChgDue_(key) {
  var p = String(key).split('-Q'), y = Number(p[0]), q = Number(p[1]);
  return y + '/' + vkPad_((q - 1) * 3 + 1) + '/10';
}
function vkChgIssue_(chat, st) {
  var adm = vkAdmin_(chat);
  vkClear_(chat);
  var label = vkSeasonLabel_(st.key), due = vkChgDue_(st.key);
  (st.add || []).forEach(function (a) { vkAppend_('chg', [st.key, label, a.unit, a.amt, due, vkStamp_(), adm ? adm.name : '', '']); });
  vkLog_(adm ? adm.name : '', 'صدور شارژ', st.key, (st.add || []).length + ' واحد');
  vkSay_(chat, '✅ شارژ ' + vkEsc_(label) + ' برای ' + vkFa_((st.add || []).length) + ' واحد صادر شد.\n\nبه ساکنان و همکاران واحدها خبر بدهم؟', vkKb_([[vkB_('📣 بله، خبر بده', 'cnt:' + st.key)], [vkB_('فعلاً نه', 'ad')]]));
}
function vkChgNotify_(chat, key) {
  var label = vkSeasonLabel_(key), n = 0, seen = {};
  vkRows_('chg').forEach(function (r) {
    if (String(r[0]) !== key) return;
    var d = vkDebtOf_(r[2]);
    vkMembersOf_(r[2]).forEach(function (m) {
      if (vkIsOwnerRel_(m.rel) || seen[m.chat]) return;
      seen[m.chat] = 1; n++;
      try { vkSay_(m.chat, '📅 <b>شارژ ' + vkEsc_(label) + '</b>\n' + vkUnitFa_(r[2]) + ': ' + vkToman_(vkAmt_(r[3])) + '\nمانده کل واحد: <b>' + vkToman_(d.due) + '</b>\nمهلت: ' + vkFa_(r[4]), vkKb_([[vkB_('💳 پرداخت شارژ', 'pay:' + vkUnitKey_(r[2]))]])); } catch (e) {}
    });
  });
  vkSay_(chat, '📣 به ' + vkFa_(n) + ' نفر خبر داده شد.', vkKb_([[vkB_('↩️ میز ساختمان', 'ad')]]));
}

/* ---------- اطلاعیه ---------- */
function vkAnnStart_(chat) {
  vkSetState_(chat, { f: 'ann', s: 'title' });
  vkSay_(chat, '📣 <b>اطلاعیهٔ تازه</b>\n<b>عنوان</b> کوتاه را بنویسید؛ مثلاً «قطعی آب پنج‌شنبه».', vkKb_([[vkB_('✖️ انصراف', 'x')]]));
}
function vkAnnStep_(chat, name, st, text) {
  if (st.s === 'title') { st.title = String(text || '').trim().slice(0, 80); st.s = 'body'; vkSetState_(chat, st); return vkSay_(chat, '✍️ حالا <b>متن اطلاعیه</b> را بنویسید.'); }
  if (st.s === 'body') {
    st.body = String(text || '').trim().slice(0, 3000); st.s = 'aud'; vkSetState_(chat, st);
    return vkSay_(chat, '👥 برای چه کسانی؟', vkKb_([[vkB_('همهٔ اعضا', 'aa:0')], [vkB_('ساکنان و همکاران واحدها', 'aa:1')], [vkB_('فقط مالک‌ها', 'aa:2')]]));
  }
  vkSay_(chat, 'از دکمه‌های بالا استفاده کنید.');
}
var VK_AUD = ['همهٔ اعضا', 'ساکنان و همکاران', 'مالک‌ها'];
function vkAnnAud_(chat, st, i) {
  st.aud = VK_AUD[i] || VK_AUD[0]; st.s = 'ok'; vkSetState_(chat, st);
  var n = vkAnnTargets_(st.aud).length;
  vkSay_(chat, '🔎 <b>پیش‌نمایش</b>\n\n📣 <b>' + vkEsc_(st.title) + '</b>\n\n' + vkEsc_(st.body) + '\n\n<i>برای ' + vkEsc_(st.aud) + ' · ' + vkFa_(n) + ' نفر</i>', vkKb_([[vkB_('✅ بفرست', 'aok')], [vkB_('✖️ انصراف', 'x')]]));
}
function vkAnnTargets_(aud) {
  var out = [], seen = {};
  vkRows_('mem').forEach(function (r) {
    if (r[8] !== VK_ST.active && r[8] !== VK_ST.pending) return;
    var own = vkIsOwnerRel_(r[4]);
    if (aud === VK_AUD[1] && own) return;
    if (aud === VK_AUD[2] && !own) return;
    var c = String(r[5]).split(/[\s,،;]+/)[0];
    if (c && !seen[c]) { seen[c] = 1; out.push(c); }
  });
  return out;
}
function vkAnnSend_(chat, st) {
  var adm = vkAdmin_(chat);
  vkClear_(chat);
  var n = vkRows_('ann').length + 1;
  var code = 'VK-ANN-' + ('00' + n).slice(-3);
  var targets = vkAnnTargets_(st.aud), sent = 0;
  var text = '📣 <b>' + vkEsc_(st.title) + '</b>\n<i>هاب ساختمان پزشکان ونک · ' + vkFa_(vkToday_()) + '</i>\n\n' + vkEsc_(st.body) + '\n\n<code>' + code + '</code>';
  targets.forEach(function (c) { try { vkSay_(c, text, vkKb_([[vkB_(VK_BTN, 'h')]])); sent++; } catch (e) {} });
  vkAppend_('ann', [code, vkStamp_(), st.title, st.body, st.aud, adm ? adm.name : '', sent]);
  vkLog_(adm ? adm.name : '', 'اطلاعیه', code, st.aud + ' · ' + sent);
  vkSay_(chat, '✅ اطلاعیهٔ <code>' + code + '</code> برای ' + vkFa_(sent) + ' نفر رفت و در تب «اطلاعیه‌ها» ثبت شد.', vkKb_([[vkB_('↩️ میز ساختمان', 'ad')]]));
  vkTellManagers_('📣 اطلاعیهٔ ' + code + ' فرستاده شد: ' + vkEsc_(st.title), null, false, chat);
}
function vkAnnList_(chat) {
  var rows = vkAnnFor_(vkMemberships_(chat), !!vkAdmin_(chat));
  if (!rows.length) return vkSay_(chat, '📣 هنوز اطلاعیه‌ای منتشر نشده.', vkKb_([[vkB_('↩️ بازگشت', 'h')]]));
  var s = '📣 <b>اطلاعیه‌های ساختمان</b>\n';
  rows.slice(-6).reverse().forEach(function (r) { s += '\n<b>' + vkEsc_(r[2]) + '</b> <i>' + vkEsc_(String(r[1]).split(' ')[0]) + ' · ' + vkEsc_(r[0]) + '</i>\n' + vkEsc_(String(r[3]).slice(0, 400)) + '\n'; });
  vkSay_(chat, s, vkKb_([[vkB_('↩️ بازگشت', 'h')]]));
}

/* ---------- درخواست‌ها و مشکلات ---------- */
var VK_REQ_ACK = 'ما مسئول رفع همه‌چیز نیستیم و امکاناتمان محدود است، اما می‌شنویم و تلاشمان را می‌کنیم. هر تغییری در پیگیری، همین‌جا خبرتان می‌کنم.';
function vkReqStart_(chat) {
  var ms = vkMemberships_(chat);
  if (!ms.length && !vkAdmin_(chat)) return vkEntry_(chat, '', '');
  var rows = [];
  for (var i = 0; i < VK_REQ_CATS.length; i += 2) {
    var r = [vkB_(VK_REQ_CATS[i], 'rc:' + i)];
    if (VK_REQ_CATS[i + 1]) r.push(vkB_(VK_REQ_CATS[i + 1], 'rc:' + (i + 1)));
    rows.push(r);
  }
  rows.push([vkB_('✖️ انصراف', 'x')]);
  vkSay_(chat, '💬 <b>درخواست یا مشکل</b>\nموضوعش چیست؟', vkKb_(rows));
}
function vkReqCat_(chat, i) {
  var ms = vkMemberships_(chat);
  vkSetState_(chat, { f: 'req', s: 'text', cat: VK_REQ_CATS[i] || VK_REQ_CATS[VK_REQ_CATS.length - 1], unit: ms.length ? ms[0].unit : '', name: ms.length ? ms[0].name : '' });
  vkSay_(chat, '✍️ ماجرا را کوتاه بنویسید. اگر عکس هم دارید، بعد از متن بفرستید.');
}
function vkReqStep_(chat, name, st, text, file) {
  if (st.s === 'text') {
    if (!text && file) { st.photo = file; st.text = '(عکس)'; return vkReqSave_(chat, name, st); }
    if (String(text || '').trim().length < 3) return vkSay_(chat, 'چند کلمه بنویسید تا بدانیم موضوع چیست.');
    st.text = String(text).trim().slice(0, 1500); st.s = 'photo'; vkSetState_(chat, st);
    return vkSay_(chat, '📷 عکسی دارید؟ بفرستید؛ وگرنه «ثبت بدون عکس».', vkKb_([[vkB_('ثبت بدون عکس', 'rqs')]]));
  }
  if (st.s === 'photo') {
    if (file) st.photo = file;
    else if (text) st.text += '\n' + String(text).slice(0, 500);
    return vkReqSave_(chat, name, st);
  }
}
function vkReqSave_(chat, name, st) {
  vkClear_(chat);
  var code = vkNextCode_('req', 'VR', 101);
  var link = st.photo ? vkSaveFile_(st.photo, code + ' ' + st.cat, 'VK_DOCS') : '';
  vkAppend_('req', [code, vkStamp_(), st.unit || '', st.name || name, st.cat, st.text, link || (st.photo ? 'عکس در بات' : ''), VK_ST.rNew, '', vkStamp_(), VK_ST.rNew + '|0', String(chat)]);
  vkLog_(st.name || name, 'درخواست', code, st.cat);
  vkSay_(chat, '🙏 <b>رسید.</b> <code>' + code + '</code>\n\n' + VK_REQ_ACK, vkKb_([[vkB_('↩️ خانهٔ ساختمان', 'h')]]));
  var card = vkReqCard_(vkFind_('req', code));
  var kb = vkReqKb_(code);
  vkOps_().forEach(function (a) {
    String(a.chat).split(/[\s,،;]+/).forEach(function (id) {
      if (!id || id === String(chat)) return;
      try { if (st.photo) vkSendFile_(id, st.photo.kind + '|' + st.photo.id, card, kb); else vkSay_(id, card, kb); } catch (e) {}
    });
  });
}
function vkReqCard_(r) {
  if (!r) return '';
  return '💬 <b>' + vkEsc_(r[4]) + '</b>' + (r[2] ? ' · ' + vkUnitFa_(r[2]) : '') + ' · ' + vkEsc_(r[3]) + '\n' + vkEsc_(String(r[5]).slice(0, 700)) +
    '\n<i>' + vkEsc_(r[1]) + ' · وضعیت: ' + vkEsc_(r[7]) + '</i>' + (r[8] ? '\n↩️ ' + vkEsc_(r[8]) : '') + '\n<code>' + vkEsc_(r[0]) + '</code>';
}
function vkReqKb_(code) {
  return vkKb_([[vkB_('🔄 در بررسی', 'rs:' + code + ':w'), vkB_('✅ انجام شد', 'rs:' + code + ':d')], [vkB_('🙏 فعلاً ممکن نیست', 'rs:' + code + ':c'), vkB_('✍️ پاسخ', 'rw:' + code)]]);
}
var VK_REQ_MAP = { w: 'rWork', d: 'rDone', c: 'rCant' };
function vkReqSet_(chat, code, k) {
  var adm = vkAdmin_(chat);
  if (!adm) return;
  var r = vkFind_('req', code);
  if (!r) return vkSay_(chat, 'این درخواست پیدا نشد.');
  var st = VK_ST[VK_REQ_MAP[k]] || VK_ST.rWork;
  vkSet_('req', r._r, 8, st);
  vkSet_('req', r._r, 10, vkStamp_());
  vkLog_(adm.name, 'وضعیت درخواست', code, st);
  vkReqNotify_(vkFind_('req', code));
  vkSay_(chat, '✅ ' + vkEsc_(code) + ': ' + vkEsc_(st));
}
function vkReqReplyStart_(chat, code) {
  if (!vkAdmin_(chat)) return;
  vkSetState_(chat, { f: 'rrep', s: 'text', code: code });
  vkSay_(chat, '✍️ پاسخ کوتاه به ' + vkEsc_(code) + ' را بنویسید. همین برای درخواست‌کننده می‌رود و در شیت می‌نشیند.');
}
function vkReqReply_(chat, name, st, text) {
  vkClear_(chat);
  var r = vkFind_('req', st.code);
  if (!r) return vkSay_(chat, 'این درخواست پیدا نشد.');
  vkSet_('req', r._r, 9, String(text || '').slice(0, 800));
  if (r[7] === VK_ST.rNew) vkSet_('req', r._r, 8, VK_ST.rWork);
  vkSet_('req', r._r, 10, vkStamp_());
  vkReqNotify_(vkFind_('req', st.code));
  vkSay_(chat, '✅ پاسخ فرستاده و ثبت شد.', vkKb_([[vkB_('💬 درخواست‌ها', 'rl')]]));
}
/* خبر به درخواست‌کننده؛ ستون «اعلان» آخرین چیزی است که به او گفته‌ایم */
function vkReqNotify_(r) {
  if (!r) return;
  var sig = r[7] + '|' + String(r[8] || '').length;
  if (String(r[10]) === sig) return;
  var who = String(r[11] || '').split(/[\s,،;]+/)[0];
  vkSet_('req', r._r, 11, sig);
  if (!who || vkAdmin_(who)) return;
  var icon = r[7] === VK_ST.rDone ? '✅' : r[7] === VK_ST.rCant ? '🙏' : '🔄';
  var s = icon + ' <b>درخواست شما: ' + vkEsc_(r[7]) + '</b>\n' + vkEsc_(r[4]) + ' <code>' + vkEsc_(r[0]) + '</code>';
  if (r[8]) s += '\n\n↩️ ' + vkEsc_(r[8]);
  if (r[7] === VK_ST.rCant) s += '\n\nشنیدیم و ممنونیم که گفتید. فعلاً امکانش را نداریم، ولی در فهرست می‌ماند.';
  try { vkSay_(who, s, vkKb_([[vkB_(VK_BTN, 'h')]])); } catch (e) {}
}
function vkReqList_(chat) {
  var open = vkRows_('req').filter(function (r) { return r[7] === VK_ST.rNew || r[7] === VK_ST.rWork; });
  if (!open.length) return vkSay_(chat, '✅ درخواست بازی نیست.', vkKb_([[vkB_('↩️ میز ساختمان', 'ad')]]));
  vkSay_(chat, '💬 <b>' + vkFa_(open.length) + ' درخواست باز</b>');
  open.slice(0, 12).forEach(function (r) { vkSay_(chat, vkReqCard_(r), vkReqKb_(r[0])); });
}

/* ---------- تنخواه ---------- */
function vkPetStart_(chat) {
  vkSetState_(chat, { f: 'pet', s: 'amt' });
  var f = vkFund_();
  vkSay_(chat, '💼 <b>واریز به تنخواه مسئول ساختمان</b>\nماندهٔ فعلی تنخواه: ' + vkToman_(f.petty) + '\n\nمبلغ واریزی را به تومان بنویسید. برای برگشت پول از تنخواه به صندوق، عدد را با منفی بنویسید.', vkKb_([[vkB_('✖️ انصراف', 'x')]]));
}
function vkPetStep_(chat, name, st, text) {
  if (st.s === 'amt') {
    var neg = /^\s*[-−]/.test(String(text || ''));
    var a = vkMoney_(String(text || '').replace(/^[\s\-−]+/, ''));
    if (!a) return vkSay_(chat, 'مبلغ را با عدد بنویسید.');
    st.amt = neg ? -a : a; st.s = 'note'; vkSetState_(chat, st);
    return vkSay_(chat, '📝 یک توضیح کوتاه؛ مثلاً «واریز مهر ۱۴۰۵».', vkKb_([[vkB_('بدون توضیح', 'pts')]]));
  }
  if (st.s === 'note') { st.note = String(text || '').slice(0, 200); return vkPetSave_(chat, name, st); }
}
function vkPetSave_(chat, name, st) {
  vkClear_(chat);
  var adm = vkAdmin_(chat);
  vkAppend_('pet', [vkStamp_(), st.amt, st.note || '', adm ? adm.name : name]);
  vkLog_(adm ? adm.name : name, 'تنخواه', '', st.amt);
  var f = vkFund_();
  vkSay_(chat, '✅ ثبت شد. ماندهٔ تنخواه: <b>' + vkToman_(f.petty) + '</b> · صندوق: ' + vkToman_(f.box), vkKb_([[vkB_('↩️ میز ساختمان', 'ad')]]));
  vkTellManagers_('💼 تنخواه: ' + vkToman_(st.amt) + (st.note ? ' · ' + vkEsc_(st.note) : '') + '\nماندهٔ تنخواه: ' + vkToman_(f.petty), null, false, chat);
}

/* ---------- تعریف واحد ---------- */
function vkUnitStart_(chat) {
  vkSetState_(chat, { f: 'unit', s: 'no' });
  vkSay_(chat, '🏷 <b>تعریف یا ویرایش واحد</b>\nشمارهٔ واحد را بنویسید. اگر از قبل باشد، اطلاعاتش به‌روز می‌شود.', vkKb_([[vkB_('✖️ انصراف', 'x')]]));
}
function vkUnitStep_(chat, name, st, text) {
  var t = String(text || '').trim();
  if (st.s === 'no') { st.unit = vkUnitKey_(t); if (!st.unit || st.unit.length > 8) return vkSay_(chat, 'شمارهٔ واحد را بنویسید.'); st.s = 'floor'; vkSetState_(chat, st); return vkSay_(chat, 'طبقه؟ (اگر مهم نیست «-» بنویسید)'); }
  if (st.s === 'floor') { st.floor = t === '-' ? '' : vkEn_(t); st.s = 'occ'; vkSetState_(chat, st); return vkSay_(chat, 'ساکن یا پزشک این واحد کیست؟ (نام، یا «خالی»)'); }
  if (st.s === 'occ') { st.occ = t; st.s = 'owner'; vkSetState_(chat, st); return vkSay_(chat, 'مالک واحد کیست؟ (اگر همان ساکن است «همان» بنویسید)'); }
  if (st.s === 'owner') { st.owner = t === 'همان' ? st.occ : t; st.s = 'monthly'; vkSetState_(chat, st); return vkSay_(chat, 'شارژ فصلی (هر سه ماه) به تومان؟ (مثلاً «۲۰ میلیون»)'); }
  if (st.s === 'monthly') {
    var a = vkMoney_(t);
    if (!a) return vkSay_(chat, 'مبلغ شارژ فصلی را با عدد بنویسید.');
    vkClear_(chat);
    var ex = null;
    vkRows_('units').forEach(function (r) { if (vkUnitKey_(r[0]) === st.unit) ex = r; });
    var empty = st.occ === 'خالی';
    if (ex) {
      vkSet_('units', ex._r, 2, st.floor); vkSet_('units', ex._r, 3, empty ? '' : st.occ); vkSet_('units', ex._r, 4, st.owner);
      vkSet_('units', ex._r, 5, a); vkSet_('units', ex._r, 6, empty ? 'خالی' : 'فعال');
    } else {
      vkAppend_('units', [st.unit, st.floor, empty ? '' : st.occ, st.owner, a, empty ? 'خالی' : 'فعال']);
      if (!vkDry_()) vkUnitFormulas_();
    }
    vkLog_(name, ex ? 'ویرایش واحد' : 'تعریف واحد', st.unit, a);
    vkSay_(chat, '✅ ' + vkUnitFa_(st.unit) + ' ' + (ex ? 'به‌روز شد' : 'تعریف شد') + ' · شارژ فصلی ' + vkToman_(a), vkKb_([[vkB_('🏷 واحد بعدی', 'ut')], [vkB_('↩️ میز ساختمان', 'ad')]]));
  }
}

/* ---------- گزارش مالی ---------- */
function vkReport_(chat) {
  var f = vkFund_();
  var s = '📊 <b>گزارش مالی ساختمان</b>\n<i>' + vkFa_(vkStamp_()) + '</i>\n';
  s += '\nموجودی اول دوره: ' + vkToman_(f.open);
  s += '\n+ پرداخت‌های تأییدشده: ' + vkToman_(f.income);
  s += '\n− هزینه‌های پرداخت‌شده: ' + vkToman_(f.expense);
  s += '\n= <b>موجودی کل: ' + vkToman_(f.total) + '</b>';
  s += '\n   صندوق (حساب): ' + vkToman_(f.box) + '\n   تنخواه مسئول ساختمان: ' + vkToman_(f.petty) + (f.petty < 0 ? ' (طلب مسئول ساختمان)' : '');
  if (f.unpaid) s += '\nهزینهٔ پرداخت‌نشده: ' + vkToman_(f.unpaid);
  var byM = {};
  vkRows_('exp').forEach(function (r) { if (r[11] === VK_ST.void) return; byM[r[1]] = (byM[r[1]] || 0) + vkAmt_(r[5]); });
  var ms = Object.keys(byM).sort().slice(-6);
  if (ms.length) { s += '\n\n<b>هزینه به تفکیک ماه</b>'; ms.forEach(function (m) { s += '\n· ' + vkEsc_(vkYmLabel_(m)) + ': ' + vkToman_(byM[m]); }); }
  var byC = {};
  vkRows_('exp').forEach(function (r) { if (r[11] === VK_ST.void) return; byC[r[3]] = (byC[r[3]] || 0) + vkAmt_(r[5]); });
  var cs = Object.keys(byC);
  if (cs.length) { s += '\n\n<b>به تفکیک موضوع</b>'; cs.sort(function (a, b) { return byC[b] - byC[a]; }).forEach(function (c) { s += '\n· ' + vkEsc_(c) + ': ' + vkToman_(byC[c]); }); }
  vkSay_(chat, s, vkKb_([[vkB_('📊 وضعیت همهٔ واحدها', 'all')], [vkB_('↩️ میز ساختمان', 'ad')]]));
}

/* ---------- ایمیل مدیر: دسترسی ویرایش هر دو شیت ---------- */
function vkAdminEmailStart_(chat) {
  if (!vkAdmin_(chat)) return;
  vkSetState_(chat, { f: 'aem', s: 'email' });
  vkSay_(chat, '📧 ایمیل گوگل خودتان را بنویسید تا دسترسی ویرایش هر دو شیت ساختمان و پوشهٔ اسناد به آن داده شود.');
}
function vkAdminEmail_(chat, st, text) {
  var em = String(text || '').trim().toLowerCase();
  if (!vkEmailOk_(em)) return vkSay_(chat, 'این ایمیل درست به نظر نمی‌رسد. دوباره بنویسید.');
  vkClear_(chat);
  var adm = vkAdmin_(chat);
  var ok = vkShareEdit_(em);
  if (adm && adm.row) { vkSet_('adm', adm.row, 5, em); if (ok) vkSet_('adm', adm.row, 7, 'ویرایش'); }
  vkLog_(adm ? adm.name : '', 'دسترسی ویرایش', '', em);
  vkSay_(chat, ok ? '✅ دسترسی ویرایش به ' + vkEsc_(em) + ' داده شد. لینک‌ها در «📄 شیت و اسناد».' : '⚠️ دسترسی داده نشد؛ دوباره امتحان کنید.', vkKb_([[vkB_('📄 شیت و اسناد', 'doc')], [vkB_('↩️ میز ساختمان', 'ad')]]));
}

/* ═══════════ کال‌بک‌ها ═══════════ */
function vkOnCb_(cq, d, chat, name, uname) {
  var p = d.split(':'), a = p[0], v = p.slice(1).join(':');
  var st = vkState_(chat) || {};
  var adm = vkAdmin_(chat);
  if (a === 'h') { vkClear_(chat); return vkHome_(chat, name, uname); }
  if (a === 'x') { vkClear_(chat); return adm ? vkAdminHome_(chat, adm) : vkHome_(chat, name, uname); }
  /* عضویت */
  if (a === 'u' && st.f === 'join') return vkJoinUnit_(chat, st, v);
  if (a === 'uo' && st.f === 'join') { st.s = 'unit'; vkSetState_(chat, st); return vkSay_(chat, 'شمارهٔ واحد را بنویسید.'); }
  if (a === 'r' && st.f === 'join') return vkJoinRel_(chat, st, v);
  if (a === 'es' && st.f === 'join') return vkJoinDone_(chat, st);
  if (a === 'more') { vkSetState_(chat, { f: 'join', s: 'unit', name: (vkMemberships_(chat)[0] || {}).name || name, user: uname || '' }); return vkAskUnit_(chat, { name: (vkMemberships_(chat)[0] || {}).name || name }); }
  /* عضو */
  if (a === 'pay') return vkPayIntro_(chat, v);
  if (a === 'pd') return vkPayStart_(chat, name, v, false);
  if (a === 'pa' && (st.f === 'pay' || st.f === 'apay')) return vkPayAmount_(chat, st, Number(v));
  if (a === 'pm' && (st.f === 'pay' || st.f === 'apay')) return vkPayMethod_(chat, st, Number(v));
  if (a === 'pf' && st.f === 'apay') { st.forText = vkChargeLabel_(st.unit); st.s = 'rcpt'; vkSetState_(chat, st); return vkSay_(chat, '🧾 عکس یا فایل فیش را بفرستید.', vkKb_([[vkB_('فیش ندارم', 'pnr')]])); }
  if (a === 'pnr' && (st.f === 'pay' || st.f === 'apay')) {
    if (st.f === 'apay') return vkPaySave_(chat, name, st);
    st.s = 'code'; vkSetState_(chat, st); return vkSay_(chat, 'کد پیگیری یا چهار رقم آخر کارت مبدأ را بنویسید.');
  }
  if (a === 'my') return vkMyUnit_(chat, v);
  if (a === 'all') return vkAllUnits_(chat);
  /* v166.8: هزینه‌ها، موجودی صندوق و لینک شیت و اسناد فقط برای مدیر یا عضو تأییدشده (همان قاعدهٔ vkMyUnit_) */
  if ((a === 'exl' || a === 'doc') && !adm && !vkActive_(vkMemberships_(chat)).length) return vkSay_(chat, 'این بخش بعد از تأیید عضویت باز می‌شود.');
  if (a === 'exl') return vkExpList_(chat);
  if (a === 'doc') return vkDocs_(chat);
  if (a === 'ann') return vkAnnList_(chat);
  if (a === 'inv' || a === 'lk') return vkInvite_(chat);
  if (a === 'mail') return vkEmailAsk_(chat);
  if (a === 'rq') return vkReqStart_(chat);
  if (a === 'rc') return vkReqCat_(chat, Number(v));
  if (a === 'rqs' && st.f === 'req') return vkReqSave_(chat, name, st);
  /* از اینجا به بعد فقط مدیران */
  if (!adm) return vkSay_(chat, 'این بخش مخصوص مدیر و مسئول ساختمان است.');
  if (a === 'ad') { vkClear_(chat); return vkAdminHome_(chat, adm); }
  if (a === 'pp') return vkPendingPays_(chat);
  if (a === 'pok') return vkPayDecide_(chat, v, true);
  if (a === 'pno') return vkPayDecide_(chat, v, false);
  if (a === 'pnx') { vkClear_(chat); return vkPayReject_(chat, v, ''); }
  if (a === 'mm') return vkMembersDesk_(chat);
  if (a === 'mok') return vkMemberDecide_(chat, v, true);
  if (a === 'mno') return vkMemberDecide_(chat, v, false);
  if (a === 'ex') return vkExpStart_(chat);
  if (a === 'eg' && st.f === 'exp') return vkExpCat_(chat, st, 0, true);
  if (a === 'ec' && st.f === 'exp') return vkExpCat_(chat, st, Number(v), false);
  if (a === 'mo' && st.f === 'exp') return vkExpMonth_(chat, st, v);
  if (a === 'eis' && st.f === 'exp') { st.s = 'sheba'; vkSetState_(chat, st); return vkExpAskSheba_(chat); }
  if (a === 'ess' && st.f === 'exp') { st.s = 'from'; vkSetState_(chat, st); return vkExpAskFrom_(chat); }
  if (a === 'ef' && st.f === 'exp') return vkExpFrom_(chat, st, Number(v));
  if (a === 'ers' && st.f === 'exp') return vkExpReview_(chat, st);
  if (a === 'eok' && st.f === 'exp' && st.amt) return vkExpSave_(chat, name, st);
  if (a === 'exf') return vkExpFixStart_(chat, v);
  if (a === 'ap') {
    var g = vkUnitGrid_('au:', [[vkB_('✖️ انصراف', 'x')]]);
    if (!g.n) return vkSay_(chat, 'اول واحدها را تعریف کنید.', vkKb_([[vkB_('🏷 تعریف واحد', 'ut')]]));
    return vkSay_(chat, '💳 <b>ثبت پرداخت برای یک واحد</b>\nبرای پرداخت‌های امروز یا گذشته. کدام واحد؟', vkKb_(g.rows));
  }
  if (a === 'au') return vkPayStart_(chat, name, v, true);
  if (a === 'ch') return vkChgStart_(chat);
  if (a === 'cq') return vkChgPreview_(chat, v);
  if (a === 'cok' && st.f === 'chg') return vkChgIssue_(chat, st);
  if (a === 'cnt') return vkChgNotify_(chat, v);
  if (a === 'an') return vkAnnStart_(chat);
  if (a === 'aa' && st.f === 'ann') return vkAnnAud_(chat, st, Number(v));
  if (a === 'aok' && st.f === 'ann' && st.body) return vkAnnSend_(chat, st);
  if (a === 'rl') return vkReqList_(chat);
  if (a === 'rs') { var q = v.split(':'); return vkReqSet_(chat, q[0], q[1]); }
  if (a === 'rw') return vkReqReplyStart_(chat, v);
  if (a === 'rep') return vkReport_(chat);
  if (a === 'pt') return vkPetStart_(chat);
  if (a === 'pts' && st.f === 'pet') return vkPetSave_(chat, name, st);
  if (a === 'ut') return vkUnitStart_(chat);
  if (a === 'ae') return vkAdminEmailStart_(chat);
  vkSay_(chat, 'این دکمه کهنه شده. از میز ساختمان دوباره شروع کنید.', vkKb_([[vkB_('↩️ میز ساختمان', 'ad')]]));
}

/* ═══════════ مینی‌اپ ═══════════ */
function vkApi_(p, api) {
  if (api === 'vk.open') return tgApiFn_(p, '', function (w) { vkHome_(w.chat, w.name, w.uname ? '@' + w.uname : ''); });
  if (api === 'vk.act') return tgApiC_(p, '', ['vk:']);
  if (api === 'vk.say') return tgApiT_(p, '', p.text);
  return { ok: false, error: 'unknown' };
}
/* boot: آیا کارت ساختمان در خانهٔ مینی‌اپ دیده شود؟ */
function vkApiFlag_(p) {
  try { var w = tgApiWho_(p); if (!w) return 0; return vkKnown_(w.chat) ? 1 : 0; } catch (e) { return 0; }
}

/* ═══════════ کار ساعتی: همگامی با ویرایش دستی شیت ═══════════
   یلدا یا یاسر در شیت وضعیت درخواست یا پرداخت را عوض کنند، بات همان را به صاحبش می‌گوید.
   یادآوری روزانهٔ پرداخت‌های منتظر تأیید، فقط یک بار در روز و فقط اگر چیزی مانده باشد. */
function vkTick(e) {
  if (ciPaused_(e, 'vkTick', 'skip')) return;
  var rs0 = Date.now(); try {   /* v166.18: سنجش زمان اجرا (بدنه بی‌تغییر) */
  var out = [];
  try {
    vkRows_('req').forEach(function (r) {
      if (!r[11]) return;
      var sig = r[7] + '|' + String(r[8] || '').length;
      if (String(r[10]) !== sig) { vkReqNotify_(r); out.push('درخواست ' + r[0]); }
    });
  } catch (e) { out.push('خطای درخواست‌ها: ' + e); }
  try {
    vkRows_('pay').forEach(function (r) {
      if ((r[10] === VK_ST.ok || r[10] === VK_ST.no) && String(r[15]) !== r[10]) {
        vkSet_('pay', r._r, 16, r[10]);
        if (!String(r[12] || '').trim()) return; /* سطر سابقه که دستی وارد شده: بی‌صدا */
        if (r[10] === VK_ST.ok) vkAfterConfirm_(r[0], r[11] || 'شیت', '');
        else vkNotifyPayer_(r, '❌ پرداخت ' + vkUnitFa_(r[2]) + ' · ' + vkToman_(vkAmt_(r[5])) + ' تأیید نشد. برای پیگیری «💬 درخواست یا مشکل» را بزنید.');
        out.push('پرداخت ' + r[0]);
      }
    });
  } catch (e2) { out.push('خطای پرداخت‌ها: ' + e2); }
  try {
    var t = vkNowParts_(), day = vkToday_();
    if (t.hh >= 10 && t.hh < 20 && vkProp_('VK_NUDGE') !== day) {
      var wait = vkRows_('pay').filter(function (r) { return r[10] === VK_ST.wait; });
      if (wait.length) {
        vkTellManagers_('⏳ <b>' + vkFa_(wait.length) + ' پرداخت ساختمان منتظر تأیید شماست</b>', vkKb_([[vkB_('دیدن و تأیید', 'pp')]]), true);
        out.push('یادآوری تأیید');
      }
      vkSetProp_('VK_NUDGE', day);
    }
  } catch (e3) { out.push('خطای یادآوری: ' + e3); }
  if (out.length) console.log('vkTick: ' + out.join(' · '));
  return out.join('\n');
  } finally { tgRunStat_('vkTick', rs0); }
}

/* موجودی اول دوره: خانهٔ B3 تب «خلاصه»، که مدیر دستی پر می‌کند */
function vkOpenBal_() {
  if (vkDry_()) return vkAmt_((VK_DB && VK_DB._open) || 0);
  if (VK_RC._open !== undefined) return VK_RC._open;
  var sh = vkBook_('units').getSheetByName(VK_T.sum);
  VK_RC._open = sh ? vkAmt_(sh.getRange('B3').getValue()) : 0;
  return VK_RC._open;
}

/* ═══════════ برپاسازی (یک بار؛ تکرارش بی‌خطر است) ═══════════ */
var VK_BRAND = '#c83f49', VK_BRAND_SOFT = '#faeced', VK_FONT = 'Vazirmatn';
function vkSetup() {
  var P = PropertiesService.getScriptProperties(), out = [];
  function folder(prop, name, parent) {
    var id = P.getProperty(prop);
    if (id) { try { var f0 = DriveApp.getFolderById(id); if (!f0.isTrashed()) return f0; } catch (e) {} }
    var f = parent ? parent.createFolder(name) : DriveApp.createFolder(name);
    P.setProperty(prop, f.getId()); out.push('پوشهٔ تازه: ' + name);
    return f;
  }
  var root = folder('VK_ROOT', VK_TITLE, null);
  folder('VK_DOCS', 'اسناد هزینه‌ها (فاکتور و فیش پرداخت)', root);
  var privF = folder('VK_PRIVF', 'محرمانه · فیش‌های شارژ و پشت‌صحنه', root);
  function book(prop, title, where) {
    var id = P.getProperty(prop);
    if (id) { try { var s0 = SpreadsheetApp.openById(id); if (!DriveApp.getFileById(id).isTrashed()) return s0; } catch (e) {} }
    var ss = SpreadsheetApp.create(title);
    try { DriveApp.getFileById(ss.getId()).moveTo(where); } catch (e2) {}
    P.setProperty(prop, ss.getId()); out.push('شیت تازه: ' + title);
    return ss;
  }
  var pub = book('VK_SS', VK_TITLE, root);
  var priv = book('VK_PRIV', VK_TITLE_PRIV, privF);
  VK_PROPS_ = null; VK_RC = {};
  try { pub.setSpreadsheetLocale('fa_IR'); pub.setSpreadsheetTimeZone(VK_TZ); priv.setSpreadsheetTimeZone(VK_TZ); } catch (e3) {}

  function tab(ss, key, title, head, widths) {
    var sh = ss.getSheetByName(title);
    if (!sh) {
      var first = ss.getSheets()[0];
      if (ss.getSheets().length === 1 && /^(Sheet1|Sheet 1|برگه۱|برگهٔ ۱)$/.test(first.getName()) && first.getLastRow() === 0) { sh = first; sh.setName(title); }
      else sh = ss.insertSheet(title);
      out.push('تب تازه: ' + title);
    }
    sh.setRightToLeft(true);
    if (head) {
      var cur = sh.getRange(1, 1, 1, head.length).getDisplayValues()[0];
      if (cur.join('|') !== head.join('|')) sh.getRange(1, 1, 1, head.length).setValues([head]);
      sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground(VK_BRAND).setFontColor('#ffffff').setFontFamily(VK_FONT).setVerticalAlignment('middle');
      sh.setFrozenRows(1);
      sh.setRowHeight(1, 34);
      sh.getRange(1, 1, Math.max(sh.getMaxRows(), 2), head.length).setFontFamily(VK_FONT);
      (widths || []).forEach(function (w, i) { if (w) sh.setColumnWidth(i + 1, w); });
    }
    return sh;
  }
  var W = {
    units: [70, 60, 170, 150, 140, 80, 120, 120, 120, 110, 180],
    chg: [90, 120, 60, 120, 100, 130, 110, 160],
    pay: [80, 130, 60, 150, 90, 120, 160, 120, 90, 110, 110, 100, 130, 150, 160, 80, 60],
    exp: [70, 80, 130, 150, 240, 120, 170, 100, 90, 90, 100, 100, 180],
    pet: [130, 120, 220, 110],
    ann: [110, 130, 200, 400, 120, 110, 90],
    req: [70, 130, 60, 140, 130, 320, 80, 110, 260, 130, 80, 90],
    mem: [70, 130, 60, 160, 110, 110, 110, 190, 110, 90, 150, 200],
    adm: [140, 130, 120, 110, 200, 100, 100],
    sheba: [90, 170, 260, 130],
    log: [140, 130, 140, 90, 300]
  };
  var guide = tab(pub, 'guide', VK_T.guide, null);
  var sum = tab(pub, 'sum', VK_T.sum, null);
  ['units', 'chg', 'pay', 'exp', 'pet', 'ann', 'req'].forEach(function (k) { tab(pub, k, VK_T[k], VK_H[k], W[k]); });
  ['mem', 'adm', 'sheba', 'log'].forEach(function (k) { tab(priv, k, VK_T[k], VK_H[k], W[k]); });

  /* ستون‌های متنی: شمارهٔ واحد همیشه متن بماند تا «۳» و 3 دو چیز نشوند */
  pub.getSheetByName(VK_T.units).getRange('A2:A200').setNumberFormat('@');
  pub.getSheetByName(VK_T.chg).getRange('C2:C2000').setNumberFormat('@');
  pub.getSheetByName(VK_T.pay).getRange('C2:C5000').setNumberFormat('@');
  pub.getSheetByName(VK_T.req).getRange('C2:C5000').setNumberFormat('@');
  priv.getSheetByName(VK_T.mem).getRange('C2:C2000').setNumberFormat('@');
  priv.getSheetByName(VK_T.mem).getRange('F2:F2000').setNumberFormat('@');
  priv.getSheetByName(VK_T.adm).getRange('C2:C50').setNumberFormat('@');
  [[VK_T.units, 'E2:I200'], [VK_T.chg, 'D2:D2000'], [VK_T.pay, 'F2:F5000'], [VK_T.exp, 'F2:F5000'], [VK_T.pet, 'B2:B2000']].forEach(function (x) {
    pub.getSheetByName(x[0]).getRange(x[1]).setNumberFormat('#,##0');
  });
  /* فهرست‌های کشویی، تا دست‌نویس‌ها یکدست بمانند */
  function dv(sh, a1, list) { sh.getRange(a1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build()); }
  dv(pub.getSheetByName(VK_T.pay), 'K2:K5000', [VK_ST.wait, VK_ST.ok, VK_ST.no]);
  dv(pub.getSheetByName(VK_T.exp), 'D2:D5000', VK_EXP_CATS);
  dv(pub.getSheetByName(VK_T.exp), 'H2:H5000', ['تنخواه', 'حساب صندوق']);
  dv(pub.getSheetByName(VK_T.exp), 'L2:L5000', [VK_ST.paid, VK_ST.unpaid, VK_ST.void]);
  dv(pub.getSheetByName(VK_T.req), 'H2:H5000', [VK_ST.rNew, VK_ST.rWork, VK_ST.rDone, VK_ST.rCant]);
  dv(pub.getSheetByName(VK_T.units), 'F2:F200', ['فعال', 'خالی']);
  dv(priv.getSheetByName(VK_T.mem), 'I2:I2000', [VK_ST.pending, VK_ST.active, VK_ST.off, VK_ST.no]);
  dv(priv.getSheetByName(VK_T.mem), 'E2:E2000', ['مالک', 'ساکن', 'همکار']);

  /* مدیران پایه */
  var admSh = priv.getSheetByName(VK_T.adm);
  if (admSh.getLastRow() < 2) {
    admSh.getRange(2, 1, VK_ADMIN_SEED.length, 7).setValues(VK_ADMIN_SEED.map(function (a) { return [a.name, a.role, a.chat, a.user, '', a.approve ? 'بله' : 'خیر', '']; }));
    out.push('مدیران پایه نوشته شد');
  }
  vkUnitFormulas_();
  vkSummary_(sum);
  vkGuide_(guide);
  /* ترتیب تب‌ها */
  var order = [VK_T.guide, VK_T.sum, VK_T.units, VK_T.pay, VK_T.exp, VK_T.chg, VK_T.pet, VK_T.ann, VK_T.req];
  order.forEach(function (t, i) { var sh = pub.getSheetByName(t); if (sh) { pub.setActiveSheet(sh); pub.moveActiveSheet(i + 1); } });
  var tabColor = { 'خلاصه': VK_BRAND, 'واحدها': '#e9a23b', 'پرداخت‌ها': '#3b8b5a', 'هزینه‌ها': '#b3453f', 'درخواست‌ها': '#4a6fa5' };
  for (var t in tabColor) { try { pub.getSheetByName(t).setTabColor(tabColor[t]); } catch (e4) {} }

  /* تریگر ساعتی جدا، تا با واچ‌داگ بات قاطی نشود */
  /* v169.1: vkTick تریگر جدا ندارد؛ هر ساعت از tgWatchdog صدا زده می‌شود (v1691Hourly_). تریگر نساز. */
  out.push('vkTick: ساعتی از tgWatchdog (v169.1)');
  vkIdsDrop_();
  out.push('شیت اعضا: https://docs.google.com/spreadsheets/d/' + pub.getId() + '/edit');
  out.push('پشت‌صحنه: https://docs.google.com/spreadsheets/d/' + priv.getId() + '/edit');
  out.push('پوشه: https://drive.google.com/drive/folders/' + root.getId());
  out.push('لینک اعضا: ' + vkLink_());
  Logger.log(out.join('\n'));
  return out.join('\n');
}

/* ستون‌های محاسبه‌ای تب «واحدها»: زنده، از روی شارژها و پرداخت‌های تأییدشده */
function vkUnitFormulas_() {
  var sh = vkBook_('units').getSheetByName(VK_T.units);
  var n = 120, f = [];
  for (var r = 2; r <= n + 1; r++) {
    f.push([
      '=IF($A' + r + '="","",SUMIF(\'' + VK_T.chg + '\'!$C:$C,$A' + r + ',\'' + VK_T.chg + '\'!$D:$D))',
      '=IF($A' + r + '="","",SUMIFS(\'' + VK_T.pay + '\'!$F:$F,\'' + VK_T.pay + '\'!$C:$C,$A' + r + ',\'' + VK_T.pay + '\'!$K:$K,"' + VK_ST.ok + '"))',
      '=IF($A' + r + '="","",G' + r + '-H' + r + ')',
      '=IF($A' + r + '="","",IFERROR(LOOKUP(2,1/((\'' + VK_T.pay + '\'!$C$2:$C$5000=$A' + r + ')*(\'' + VK_T.pay + '\'!$K$2:$K$5000="' + VK_ST.ok + '")),\'' + VK_T.pay + '\'!$B$2:$B$5000),""))'
    ]);
  }
  sh.getRange(2, 7, n, 4).setFormulas(f);
  sh.getRange(2, 7, n, 3).setNumberFormat('#,##0');
  var rule = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($I2<>"",$I2>0)').setBackground('#fbe3e4').setFontColor('#a3262f').setRanges([sh.getRange('I2:I200')]).build();
  var ok = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($A2<>"",$I2<=0)').setBackground('#e6f4ea').setFontColor('#2e7d4f').setRanges([sh.getRange('I2:I200')]).build();
  sh.setConditionalFormatRules([rule, ok]);
  sh.getRange('G1:J1').setBackground('#8c2c33').setNote('محاسبهٔ خودکار؛ دست نزنید');
}

function vkSummary_(sh) {
  var T = VK_T, S = VK_ST;
  var rows = [
    ['خلاصهٔ مالی ساختمان پزشکان ونک', ''],
    ['همه‌چیز خودکار از تب‌ها حساب می‌شود؛ فقط خانهٔ زرد را خودتان پر کنید.', ''],
    ['موجودی اول فروردین ۱۴۰۵ (تومان)', ''],
    ['جمع پرداخت‌های تأییدشدهٔ واحدها', '=SUMIF(\'' + T.pay + '\'!K:K,"' + S.ok + '",\'' + T.pay + '\'!F:F)'],
    ['جمع هزینه‌های پرداخت‌شده', '=SUMIF(\'' + T.exp + '\'!L:L,"' + S.paid + '",\'' + T.exp + '\'!F:F)'],
    ['موجودی کل ساختمان', '=N(B3)+B4-B5'],
    ['واریزی به تنخواه مسئول ساختمان', '=SUM(\'' + T.pet + '\'!B:B)'],
    ['هزینه‌های پرداخت‌شده از تنخواه', '=SUMIFS(\'' + T.exp + '\'!F:F,\'' + T.exp + '\'!H:H,"تنخواه",\'' + T.exp + '\'!L:L,"' + S.paid + '")'],
    ['ماندهٔ تنخواه (منفی یعنی طلب مسئول ساختمان)', '=B7-B8'],
    ['موجودی صندوق (حساب بانکی)', '=B6-B9'],
    ['هزینه‌های ثبت‌شدهٔ پرداخت‌نشده', '=SUMIF(\'' + T.exp + '\'!L:L,"' + S.unpaid + '",\'' + T.exp + '\'!F:F)'],
    ['جمع بدهی واحدها', '=SUMIF(\'' + T.units + '\'!I:I,">0")'],
    ['پرداخت‌های منتظر تأیید', '=COUNTIF(\'' + T.pay + '\'!K:K,"' + S.wait + '")'],
    ['درخواست‌های باز', '=COUNTIF(\'' + T.req + '\'!H:H,"' + S.rNew + '")+COUNTIF(\'' + T.req + '\'!H:H,"' + S.rWork + '")'],
    ['', ''],
    ['هزینه به تفکیک ماه', 'مبلغ']
  ];
  for (var m = 1; m <= 12; m++) {
    var ym = VK_FIRST_YEAR + '-' + vkPad_(m);
    rows.push([VK_MONTHS[m - 1] + ' ' + VK_FIRST_YEAR, '=SUMIFS(\'' + T.exp + '\'!F:F,\'' + T.exp + '\'!B:B,"' + ym + '",\'' + T.exp + '\'!L:L,"<>' + S.void + '")']);
  }
  rows.push(['', '']);
  rows.push(['هزینه به تفکیک موضوع', 'مبلغ']);
  VK_EXP_CATS.forEach(function (c) { rows.push([c, '=SUMIFS(\'' + T.exp + '\'!F:F,\'' + T.exp + '\'!D:D,"' + c + '",\'' + T.exp + '\'!L:L,"<>' + S.void + '")']); });
  var keep = sh.getRange('B3').getValue();
  sh.clear();
  sh.getRange(1, 1, rows.length, 2).setValues(rows.map(function (r) { return [r[0], r[1]]; }));
  if (keep !== '' && keep !== null) sh.getRange('B3').setValue(keep); else sh.getRange('B3').setValue(0);
  sh.getRange(1, 1, rows.length, 2).setFontFamily(VK_FONT).setVerticalAlignment('middle');
  sh.getRange('A1:B1').merge().setFontSize(15).setFontWeight('bold').setFontColor(VK_BRAND);
  sh.getRange('A2:B2').merge().setFontColor('#777777').setFontSize(10);
  sh.getRange('B3').setBackground('#fff4c2');
  sh.getRange('A6:B6').setFontWeight('bold').setBackground(VK_BRAND_SOFT);
  sh.getRange('A10:B10').setFontWeight('bold');
  sh.getRange('A12:B12').setFontColor('#a3262f');
  sh.getRange('B3:B' + rows.length).setNumberFormat('#,##0');
  sh.getRange('B13:B14').setNumberFormat('0');
  [16, 17 + 12 + 1].forEach(function (r) { sh.getRange(r, 1, 1, 2).setFontWeight('bold').setBackground(VK_BRAND).setFontColor('#ffffff'); });
  sh.setColumnWidth(1, 330); sh.setColumnWidth(2, 170);
  sh.setRightToLeft(true);
}

function vkGuide_(sh) {
  var L = [
    ['هاب ساختمان پزشکان ونک (گاندی)'],
    ['کوچهٔ بیستم گاندی · مدیریت ساختمان با بات تلگرام @' + VK_BOT],
    [''],
    ['این شیت زنده است. هر پرداخت، هزینه، اطلاعیه و درخواست همان لحظه که در بات ثبت شود اینجا دیده می‌شود، و اگر مسئول ساختمان اینجا چیزی را اصلاح کند بات همان را می‌خواند.'],
    [''],
    ['پیوستن اعضا'],
    ['لینک: ' + vkLink_()],
    ['هر کس با لینک وصل می‌شود، اسم، واحد و نسبتش با واحد را می‌گوید: مالک، ساکن یا همکار (همسر، منشی، دستیار). برای هر واحد چند نفر می‌توانند وصل شوند. مسئول ساختمان در بات با یک دکمه تأیید می‌کند.'],
    ['هزینهٔ شارژ با ساکن واحد است. مالک اطلاعیه‌ها، روند کارها، هزینه‌ها و بدهی واحدها را می‌بیند.'],
    [''],
    ['تب‌ها'],
    ['خلاصه: موجودی کل، صندوق، تنخواه، بدهی واحدها و هزینه به تفکیک ماه و موضوع. فقط خانهٔ زرد (موجودی اول فروردین ۱۴۰۵) دستی است.'],
    ['واحدها: فهرست واحدها و شارژ فصلی هر واحد (معمولاً شارژ فصلی گرفته می‌شود). ستون‌های «کل شارژ» تا «آخرین پرداخت» خودکارند. این تب را اول مسئول ساختمان کامل می‌کند.'],
    ['پرداخت‌ها: هر پرداخت شارژ. تا مدیر ساختمان تأیید نکند «در انتظار تأیید» است و در حساب واحد نمی‌آید.'],
    ['هزینه‌ها: هر هزینه با ماه، موضوع، مبلغ، دریافت‌کننده، فاکتور و فیش. هزینهٔ ماه‌های گذشته هم با انتخاب همان ماه سر جایش می‌نشیند.'],
    ['شارژها: شارژ هر واحد در هر دوره (معمولاً فصلی). از بات صادر می‌شود و اینجا قابل اصلاح است.'],
    ['تنخواه: پولی که از صندوق به مسئول ساختمان داده می‌شود تا هزینه‌های جاری را بپردازد.'],
    ['اطلاعیه‌ها و درخواست‌ها: همهٔ اطلاعیه‌ها با کد، و هر مشکل یا خواسته‌ای که اعضا گفته‌اند با وضعیت پیگیری.'],
    [''],
    ['پرداخت شارژ'],
    ['درگاه آنلاین: ' + VK_PAY_LINK],
    [vkPayBlock_(true)],
    ['بعد از پرداخت، فیش در بات فرستاده می‌شود و پس از تأیید مدیر ساختمان در حساب واحد می‌نشیند.'],
    [''],
    ['حریم خصوصی'],
    ['شمارهٔ تماس، ایمیل و شناسهٔ تلگرام اعضا و شبای دریافت‌کنندگان در این شیت نیست؛ در فایل جدای «پشت‌صحنه» است که فقط مدیر و مسئول ساختمان به آن دسترسی دارند. اطلاعات هر عضو فقط در اختیار مسئول ساختمان قرار می‌گیرد و بدون رضایت خودش منتشر یا با کسی به اشتراک گذاشته نمی‌شود.'],
    [''],
    ['درخواست‌ها'],
    ['ما مسئول رفع همه‌چیز نیستیم و امکاناتمان محدود است، اما می‌شنویم و تلاشمان را می‌کنیم.']
  ];
  sh.clear();
  sh.getRange(1, 1, L.length, 1).setValues(L).setFontFamily(VK_FONT).setWrap(true).setVerticalAlignment('top');
  sh.setColumnWidth(1, 760);
  sh.getRange('A1').setFontSize(18).setFontWeight('bold').setFontColor(VK_BRAND);
  sh.getRange('A2').setFontColor('#777777');
  [6, 11, 20, 25, 28].forEach(function (r) { sh.getRange(r, 1).setFontWeight('bold').setFontColor(VK_BRAND).setFontSize(12); });
  sh.setRightToLeft(true);
  sh.setTabColor('#555555');
}

/* ═══════════ تست (در TG_SUITES با نام «ساختمان ونک») ═══════════
   کاملاً خشک: شیت‌ها در حافظه (VK_DB)، پیام‌ها در TG_OUTBOX. به شیت واقعی دست نمی‌زند. */
function vkTests() {
  var out = [], pass = 0, fail = 0;
  function ok(n, c, extra) { if (c) pass++; else fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !extra ? '' : ' · ' + String(extra).slice(0, 200))); }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, db: VK_DB, rc: VK_RC, seed: VK_ADMIN_SEED, guard: VK_GUARD };
  /* v170.9: مدیران و نگهبان واقعی از TG_CFG می‌آیند؛ تست روی دیپلوی آزمایشی هم با مقدار ساختگی خودش اجرا می‌شود و بعد برمی‌گردد */
  VK_ADMIN_SEED = [{ name: 'مدیر ساختگی', role: 'مدیر ساختمان', chat: '7000001', user: 'fake_owner', approve: true },
                   { name: 'مسئول ساختگی', role: 'مسئول ساختمان', chat: '7000002', user: 'fake_manager', approve: false }];
  VK_GUARD = 'نگهبان ساختگی';
  var liveErr = '';   /* دادهٔ واقعی تب «افراد»، پیش از روشن شدن حالت خشک؛ خالی بودن قبول است */
  try { if (typeof ciGlobal_ === 'function' && ciGlobal_('CI_BUILD')) { vkPayList_(); VK_PAY_INFO_ = null; } } catch (eL) { liveErr = String(eL); }
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; VK_RC = {};
  VK_DB = { _props: { VK_SS: 'dry-ss', VK_DOCS: 'dry-docs' }, _pay: [{ card: '6037990000000000', sheba: 'IR000000000000000000000000', holder: 'دارندهٔ نمونه' }, { card: '6037990000000009', sheba: 'IR000000000000000000000009', holder: 'دارندهٔ نمونه' }], _open: 0,
    units: [['3', '1', 'دکتر الف', 'آقای ب', 6000000, 'فعال'], ['5', '2', 'دکتر ج', 'خانم د', 4500000, 'فعال'], ['7', '3', '', 'آقای ه', 3000000, 'خالی']],
    adm: VK_ADMIN_SEED.map(function (a) { return [a.name, a.role, a.chat, a.user, '', a.approve ? 'بله' : 'خیر', '']; }) };
  var YA = '7000001', SH = '7000002', M1 = '880001', M2 = '880002', X = '880009';
  function msg(chat, text, extra) { var m = { message_id: 1, chat: { id: Number(chat), type: 'private' }, from: { id: Number(chat), first_name: 'تست' }, text: text }; for (var k in (extra || {})) m[k] = extra[k]; return m; }
  function say(chat, text, extra) { TG_OUTBOX = []; VK_RC = {}; var h = vkRoute_(msg(chat, text, extra), Number(chat), 'تست', ''); return { handled: h, all: txt() }; }
  function cb(chat, data) { TG_OUTBOX = []; VK_RC = {}; vkCb_({ id: 'x', data: 'vk:' + data, from: { id: Number(chat) }, message: { chat: { id: Number(chat) } } }, data, Number(chat), 'تست', ''); return txt(); }
  function txt(to) { return TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && (!to || x.chat === String(to)); }).map(function (x) { return x.text; }).join('\n---\n'); }
  function photo(chat) { return say(chat, '', { photo: [{ file_id: 'small' }, { file_id: 'PH' + chat }] }); }
  try {
    /* پایه‌ها */
    ok('مبلغ: «۵ میلیون»', vkMoney_('۵ میلیون') === 5000000);
    ok('مبلغ: «2.5 میلیون»', vkMoney_('2.5 میلیون') === 2500000);
    ok('مبلغ: «۸۰۰ هزار»', vkMoney_('۸۰۰ هزار') === 800000);
    ok('مبلغ: «5,000,000 تومان»', vkMoney_('5,000,000 تومان') === 5000000);
    ok('مبلغ: متن بی‌عدد صفر است', vkMoney_('سلام') === 0);
    var j = vkG2J_(2026, 9, 19); ok('تاریخ: ۱۹ سپتامبر ۲۰۲۶ = ۲۸ شهریور ۱۴۰۵', j.join('/') === '1405/6/28', j.join('/'));
    var j2 = vkG2J_(2026, 3, 21); ok('تاریخ: ۲۱ مارس ۲۰۲۶ = ۱ فروردین ۱۴۰۵', j2.join('/') === '1405/1/1', j2.join('/'));
    ok('ماه‌های هزینه از فروردین ۱۴۰۵', vkMonthList_().slice(-1)[0] === '1405-01');
    ok('سرستون‌ها تکراری ندارند', Object.keys(VK_H).every(function (k) { var s = {}; return VK_H[k].every(function (h) { if (s[h]) return false; s[h] = 1; return true; }); }));
    ok('هیچ خط تیرهٔ بلند در متن‌های کاربر نیست', [vkEntry_, vkJoinDone_, vkHome_, vkPayIntro_, vkPaySave_, vkAdminHome_, vkGuide_, vkReqNotify_, vkInvite_, vkDocs_].every(function (f) { return String(f).indexOf(String.fromCharCode(8212)) < 0; }) && VK_REQ_ACK.indexOf(String.fromCharCode(8212)) < 0);

    /* عضویت */
    var r1 = say(M1, '/start vanak');
    ok('لینک: خوشامد و پرسیدن نام', r1.handled && r1.all.indexOf('نام و نام خانوادگی') > -1, r1.all);
    ok('نام کوتاه رد می‌شود', say(M1, 'ab').all.indexOf('کامل بنویسید') > -1);
    var r2 = say(M1, 'مریم احمدی');
    ok('بعد از نام، دکمه‌های واحد', TG_OUTBOX.some(function (x) { return x.markup && JSON.stringify(x.markup).indexOf('vk:u:3') > -1; }), r2.all);
    var r3 = cb(M1, 'u:3'); ok('انتخاب واحد، پرسش نسبت', r3.indexOf('نسبت شما') > -1, r3);
    var r4 = cb(M1, 'r:r'); ok('نسبت، پرسش ایمیل', r4.indexOf('ایمیل') > -1, r4);
    var r5 = say(M1, 'member@example.com');
    ok('پایان عضویت: پیام ثبت و لینک دعوت', r5.all.indexOf('ثبت شد') > -1 && r5.all.indexOf('start=' + VK_START) > -1, r5.all);
    ok('مسئول ساختمان خبر عضو تازه را گرفت', txt(SH).indexOf('عضو تازه') > -1);
    ok('عضو در پشت‌صحنه «در انتظار تأیید» است', VK_DB.mem && VK_DB.mem[0][8] === VK_ST.pending && VK_DB.mem[0][4] === 'ساکن');
    ok('پیش از تأیید، پرداخت بسته است', cb(M1, 'pay').indexOf('بعد از تأیید') > -1);
    ok('عضو ساده به میز مدیر راه ندارد', cb(M1, 'ex').indexOf('مخصوص مدیر') > -1);
    var r6 = cb(SH, 'mok:VM-101');
    ok('تأیید یک‌کلیکی مسئول ساختمان', VK_DB.mem[0][8] === VK_ST.active && r6.indexOf('فعال شد') > -1, r6);
    ok('عضو خبر تأیید را گرفت', txt(M1).indexOf('تأیید شد') > -1);
    ok('دسترسی شیت به ایمیل عضو داده شد', (VK_DB._shared || []).indexOf('member@example.com') > -1);
    /* مالک همان واحد */
    say(M2, '/start vanak'); say(M2, 'علی رضایی'); cb(M2, 'u:3'); cb(M2, 'r:o'); cb(M2, 'es'); cb(SH, 'mok:VM-102');
    ok('مالک جدا از ساکن ثبت شد', VK_DB.mem[1][4] === 'مالک' && VK_DB.mem[1][8] === VK_ST.active);

    /* شارژ */
    cb(SH, 'ch'); var c1 = cb(SH, 'cq:1405-Q3');
    ok('پیش‌نمایش شارژ: واحد خالی کنار می‌رود', c1.indexOf('خالی') > -1 && c1.indexOf('۶٬۰۰۰٬۰۰۰') > -1, c1);
    cb(SH, 'cok');
    ok('شارژ پاییز برای دو واحد صادر شد', (VK_DB.chg || []).length === 2);
    var c2 = cb(SH, 'cnt:1405-Q3');
    ok('خبر شارژ فقط به ساکن رفت، نه مالک', txt(M1).indexOf('شارژ پاییز') > -1 && txt(M2).indexOf('شارژ پاییز') < 0, c2);
    ok('بدهی واحد ۳ = ۶ میلیون', vkDebtOf_('3').due === 6000000);
    cb(SH, 'cq:1405-Q3');
    ok('صدور دوباره همان فصل تکراری نمی‌سازد', txt(SH).indexOf('قبلاً صادر شده') > -1);

    /* پرداخت عضو و تأیید یاسر */
    var p1 = cb(M1, 'pay');
    ok('صفحهٔ پرداخت: کارت، شبا و مانده', p1.indexOf(VK_DB._pay[0].card) > -1 && p1.indexOf(VK_DB._pay[1].sheba) > -1 && p1.indexOf('۶٬۰۰۰٬۰۰۰') > -1, p1);
    var keepPay = VK_DB._pay; VK_DB._pay = []; var p0 = cb(M1, 'pay'); VK_DB._pay = keepPay;
    ok('صفحهٔ پرداخت بی کارت: بخش کارت نیست و درگاه هست', p0.indexOf('کارت به کارت') < 0 && p0.indexOf('<code>') < 0 && p0.indexOf('پرداخت آنلاین') > -1, p0);
    ok('صفحهٔ پرداخت: لینک درگاه', TG_OUTBOX.some(function (x) { return JSON.stringify(x.markup || '').indexOf(VK_PAY_LINK) > -1; }));
    cb(M1, 'pd:3'); cb(M1, 'pa:6000000'); var p2 = cb(M1, 'pm:1');
    ok('بعد از روش پرداخت، فیش خواسته می‌شود', p2.indexOf('فیش') > -1, p2);
    var p3 = photo(M1);
    ok('فیش رسید: «به‌زودی تأیید می‌شود»', p3.all.indexOf('به‌زودی تأیید') > -1, p3.all);
    ok('پرداخت با وضعیت «در انتظار تأیید» ثبت شد', VK_DB.pay[0][10] === VK_ST.wait && VK_DB.pay[0][5] === 6000000);
    ok('عکس فیش برای مدیر ساختمان رفت', TG_OUTBOX.some(function (x) { return x.kind === 'api'; }));
    ok('تا تأیید، بدهی کم نشده', vkDebtOf_('3').due === 6000000);
    ok('مسئول ساختمان نمی‌تواند تأیید کند', cb(SH, 'pok:VP-1001').indexOf('با مدیر ساختمان') > -1 && VK_DB.pay[0][10] === VK_ST.wait);
    cb(YA, 'pok:VP-1001');
    ok('یاسر تأیید کرد', VK_DB.pay[0][10] === VK_ST.ok);
    ok('پرداخت‌کننده خبر تأیید گرفت', txt(M1).indexOf('پرداخت شما تأیید شد') > -1);
    ok('مسئول ساختمان هم دید', txt(SH).indexOf('پرداخت تأیید شد') > -1);
    ok('بدهی واحد صفر شد', vkDebtOf_('3').due === 0);

    /* پرداخت سابقه توسط مسئول ساختمان برای واحد ۵ */
    cb(SH, 'ap'); cb(SH, 'au:5'); say(SH, '۴۵۰۰۰۰۰'); cb(SH, 'pm:2'); say(SH, 'شارژ بهار ۱۴۰۵ · پرداخت ۱۰ اردیبهشت'); cb(SH, 'pnr');
    ok('پرداخت ثبت‌شده توسط مسئول ساختمان هم منتظر تأیید یاسر است', VK_DB.pay[1] && VK_DB.pay[1][10] === VK_ST.wait && VK_DB.pay[1][6].indexOf('بهار') > -1);
    cb(YA, 'pno:VP-1002'); cb(YA, 'pnx:VP-1002');
    ok('رد پرداخت ثبت شد', VK_DB.pay[1][10] === VK_ST.no);

    /* هزینه با فاکتور، ماه گذشته، از تنخواه */
    cb(SH, 'ex'); cb(SH, 'eg'); var e1 = cb(SH, 'mo:1405-02');
    ok('هزینهٔ ماه گذشته: ماه پذیرفته شد', e1.indexOf('اردیبهشت') > -1, e1);
    say(SH, '۱۵ میلیون'); photo(SH);
    say(SH, 'IR000000000000000000000001'); cb(SH, 'ef:0'); photo(SH);
    var e2 = cb(SH, 'eok');
    ok('هزینه ثبت شد', VK_DB.exp && VK_DB.exp[0][0] === 'VE-101' && VK_DB.exp[0][1] === '1405-02' && VK_DB.exp[0][5] === 15000000, e2);
    ok('حقوق نگهبان با نام دریافت‌کننده', VK_DB.exp[0][6].indexOf(VK_GUARD) > -1 && VK_DB.exp[0][3] === VK_EXP_CATS[0]);
    ok('شبا فقط در پشت‌صحنه', VK_DB.sheba && VK_DB.sheba[0][2] === 'IR000000000000000000000001' && VK_DB.exp[0].join('|').indexOf('IR0000') < 0);
    ok('فاکتور و فیش ضمیمه شد', String(VK_DB.exp[0][8]).indexOf('dry://') === 0 && String(VK_DB.exp[0][9]).indexOf('dry://') === 0);
    var f1 = vkFund_();
    ok('صندوق: موجودی کل = پرداخت‌ها منهای هزینه', f1.total === 6000000 - 15000000, JSON.stringify(f1));
    ok('تنخواه منفی یعنی طلب مسئول ساختمان', f1.petty === -15000000);
    ok('یاسر خبر هزینه را گرفت', txt(YA).indexOf('هزینهٔ تازه') > -1);
    cb(YA, 'pt'); say(YA, '۲۰ میلیون'); cb(YA, 'pts');
    ok('واریز تنخواه', vkFund_().petty === 5000000 && vkFund_().box === -14000000);
    /* هزینهٔ پرداخت‌نشده و افزودن فیش بعداً */
    cb(SH, 'ex'); cb(SH, 'ec:4'); cb(SH, 'mo:' + vkCurYm_()); say(SH, '۳ میلیون'); say(SH, 'سرویس ماهانه آسانسور'); say(SH, 'شرکت آسانسور'); cb(SH, 'eis'); cb(SH, 'ess'); cb(SH, 'ef:2'); cb(SH, 'eok');
    ok('هزینهٔ پرداخت‌نشده در صندوق کم نمی‌شود', VK_DB.exp[1][11] === VK_ST.unpaid && vkFund_().unpaid === 3000000 && vkFund_().expense === 15000000);
    cb(SH, 'exf:VE-102'); photo(SH);
    ok('با فیش بعدی، هزینه پرداخت‌شده می‌شود', VK_DB.exp[1][11] === VK_ST.paid && VK_DB.exp[1][7] === 'تنخواه');

    /* درخواست و پیگیری */
    cb(M1, 'rq'); cb(M1, 'rc:0'); say(M1, 'لامپ راه‌پلهٔ طبقهٔ دوم سوخته'); var q1 = cb(M1, 'rqs');
    ok('درخواست ثبت شد و پیام «می‌شنویم»', VK_DB.req && VK_DB.req[0][0] === 'VR-101' && q1.indexOf('می‌شنویم') > -1, q1);
    ok('مسئول ساختمان کارت درخواست گرفت', txt(SH).indexOf('لامپ') > -1);
    cb(SH, 'rs:VR-101:d');
    ok('وضعیت «انجام شد» به درخواست‌کننده رسید', txt(M1).indexOf('انجام شد') > -1 && VK_DB.req[0][7] === VK_ST.rDone);
    VK_DB.req[0][7] = VK_ST.rCant; TG_OUTBOX = []; VK_RC = {}; vkTick();
    ok('ویرایش دستی شیت با کار ساعتی به عضو رسید', txt(M1).indexOf('فعلاً ممکن نیست') > -1);
    TG_OUTBOX = []; VK_RC = {}; vkTick();
    ok('کار ساعتی تکرار نمی‌کند', txt(M1) === '');

    /* اطلاعیه */
    cb(SH, 'an'); say(SH, 'قطعی آب پنج‌شنبه'); say(SH, 'پنج‌شنبه ۹ تا ۱۲ آب قطع است.'); cb(SH, 'aa:0'); cb(SH, 'aok');
    ok('اطلاعیه با کد ثبت شد', VK_DB.ann && VK_DB.ann[0][0] === 'VK-ANN-001');
    ok('اطلاعیه به ساکن و مالک رسید', txt(M1).indexOf('قطعی آب') > -1 && txt(M2).indexOf('قطعی آب') > -1);
    cb(SH, 'an'); say(SH, 'جلسهٔ مالکان'); say(SH, 'جمعه ساعت ۱۰'); cb(SH, 'aa:2'); cb(SH, 'aok');
    ok('اطلاعیهٔ مالکان فقط به مالک', txt(M2).indexOf('جلسهٔ مالکان') > -1 && txt(M1).indexOf('جلسهٔ مالکان') < 0);

    /* نماها */
    ok('مالک وضعیت همهٔ واحدها را می‌بیند', cb(M2, 'all').indexOf('وضعیت واحدها') > -1);
    ok('ساکن وضعیت همهٔ واحدها را نمی‌بیند', cb(M1, 'all').indexOf('برای مالک‌ها') > -1);
    var h1 = say(M1, VK_BTN).all;
    ok('خانهٔ عضو: تسویه و آخرین اطلاعیه', h1.indexOf('تسویه') > -1 && h1.indexOf('جلسهٔ مالکان') < 0, h1);
    var ad = say(SH, VK_BTN).all;
    ok('میز مسئول ساختمان: موجودی و شمارنده‌ها', ad.indexOf('میز ساختمان') > -1 && ad.indexOf('موجودی کل') > -1, ad);
    var rep = cb(YA, 'rep');
    ok('گزارش مالی: تفکیک ماه و موضوع', rep.indexOf('اردیبهشت') > -1 && rep.indexOf('آسانسور') > -1, rep);
    /* تعریف واحد */
    cb(SH, 'ut'); say(SH, '۹'); say(SH, '۴'); say(SH, 'دکتر و'); say(SH, 'همان'); say(SH, '۱.۲ میلیون');
    ok('تعریف واحد تازه از بات', VK_DB.units.some(function (r) { return r[0] === '9' && r[4] === 1200000; }));

    /* جدا بودن از بقیهٔ بات */
    ok('عضو ساختمان از «کاربران بات» کنار می‌ماند', vkSkipUser_(M1, { message: msg(M1, 'سلام') }) === true);
    ok('کاربر عادی بات کنار نمی‌ماند', vkSkipUser_(X, { message: msg(X, 'سلام') }) === false);
    ok('لینک ساختمان برای کاربر تازه هم از دفتر کاربران کنار است', vkSkipUser_('880077', { message: msg('880077', '/start vanak') }) === true);
    var z = say(X, 'سلام');
    ok('پیام کاربر عادی به ساختمان نمی‌رود', z.handled === false && z.all === '');
    ok('دکمهٔ ساختمان در منوی مدیران', (VK_CUR = SH, JSON.stringify(vkMenuRow_()).indexOf(VK_BTN) > -1));
    ok('دکمهٔ ساختمان در منوی بقیه نیست', (VK_CUR = '7000004', vkMenuRow_().length === 0));
    ok('دکمهٔ میانی کلینیک، گفت‌وگوی ساختمان را می‌بندد', (function () { cb(M1, 'rq'); cb(M1, 'rc:1'); var r = say(M1, '🍓 شروع درمان'); return r.handled === false && !vkState_(M1); })());
    ok('/start ساده برای عضو، خانهٔ ساختمان است', say(M1, '/start').all.indexOf('هاب ساختمان') > -1);

    /* اتصال به بات زنده (اگر این فایل کنار telegram.gs است) */
    if (typeof tgHandle === 'function') {
      TG_OUTBOX = []; VK_RC = {};
      tgHandle({ update_id: 0, message: msg('880055', '/start vanak') });
      ok('tgHandle: لینک ساختمان به خوشامد ساختمان می‌رسد', txt('880055').indexOf('نام و نام خانوادگی') > -1, txt('880055'));
      ok('tgHandle: کاربر ساختمان در دفتر کاربران نمی‌نشیند', !TG_OUTBOX.some(function (x) { return x.kind === 'user'; }));
      TG_OUTBOX = []; VK_RC = {};
      tgHandle({ update_id: 0, callback_query: { id: 'x', data: 'vk:h', from: { id: Number(M1), first_name: 'تست' }, message: { message_id: 1, chat: { id: Number(M1), type: 'private' } } } });
      ok('tgHandle: کال‌بک vk: به ساختمان می‌رسد', txt(M1).indexOf('هاب ساختمان') > -1, txt(M1));
    }
    if (typeof TG_CAP !== 'undefined') {
      var caps = TG_CAP.filter(function (c) { return String(c.api).indexOf('vk.') === 0; }).length;
      ok('سه اندپوینت ساختمان در رجیستری مینی‌اپ', caps === 3, caps);
    }
    if (typeof tgApiCapture_ === 'function') {
      TG_MEM['apiwho'] = { chat: Number(M1), uname: '', first: 'تست', last: '', name: 'تست' };
      var ap = vkApi_({ initData: 'x' }, 'vk.open');
      ok('مینی‌اپ: vk.open همان خانهٔ ساختمان را برمی‌گرداند', ap && ap.ok && JSON.stringify(ap.out).indexOf('هاب ساختمان') > -1, JSON.stringify(ap).slice(0, 200));
      var ap2 = vkApi_({ initData: 'x', cb: 'vk:my' }, 'vk.act');
      ok('مینی‌اپ: vk.act دکمه‌های ساختمان را اجرا می‌کند', ap2 && ap2.ok && JSON.stringify(ap2.out).indexOf('حساب') > -1, JSON.stringify(ap2).slice(0, 200));
      var ap3 = vkApi_({ initData: 'x', cb: 'ld:close:L-1' }, 'vk.act');
      ok('مینی‌اپ: کال‌بک غیرساختمانی از vk.act رد می‌شود', ap3 && ap3.ok === false);
    }
  } catch (e) {
    ok('اجرای تست بدون خطا · ' + e + ' ' + (e && e.stack ? String(e.stack).slice(0, 300) : ''), false);
  }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; VK_DB = keep.db; VK_RC = keep.rc; VK_CUR = ''; VK_ADMIN_SEED = keep.seed; VK_GUARD = keep.guard;
  /* v166.19: روی دیپلوی (نه در بررسی محلی) خواندن تب «افراد» نباید خطا بدهد */
  if (typeof ciGlobal_ === 'function' && ciGlobal_('CI_BUILD')) ok('خواندن کارت ساختمان از تب «افراد» بی خطاست (خالی هم قبول است)', !liveErr, liveErr);
  var text = out.join('\n');
  Logger.log('ساختمان ونک: ' + pass + ' قبول · ' + fail + ' مردود\n' + text);
  return { pass: pass, fail: fail, text: out.filter(function (l) { return l.indexOf('❌') === 0; }).join('\n') || text.slice(-300) };
}
