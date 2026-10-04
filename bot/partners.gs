/* ═══════════════════════════════════════════════════════════════════
   partners.gs · تجربه پارتنرز (v137، مهر ۱۴۰۵)
   ───────────────────────────────────────────────────────────────────
   چرا این فایل هست: یاسر گفت «الان مشخص و ساده نیست. معلوم نیست باید کجا بری
   چیکار کنی.» ماژول‌های قبلی (tgPn* ساخت پارتنر، tgPa* میز پارتنر، tgInp* حضوری)
   داده را درست نگه می‌داشتند ولی سه ایراد داشتند:
     ۱. دکمهٔ «🏢 میز پارتنر» و متن آزاد میز پارتنر در بات به هیچ مسیری وصل نبود
     ۲. هر فضا فقط یک نفر داشت (chat_id مسئول)؛ پذیرش پارتنر و مدیر دوم جا نداشت
     ۳. مدیر پارتنر نمی‌توانست خودش اتاق و ساعت تعریف کند، اتاق به درمانگر بدهد
        یا یک روز را ببندد و به درمانگرها خبر بدهد
   این فایل همان داده‌ها را می‌خواند و می‌نویسد (مکان‌ها، اتاق‌ها، ساعت‌های حضوری،
   درخواست‌های حضوری، صفحهٔ پارتنر) و فقط چهار تب کوچک اضافه می‌کند. همهٔ نام‌ها
   با pt / PT_ شروع می‌شوند.

   نقش‌ها
     مدیر فضا      همه‌چیز فضای خودش: اتاق، ساعت، واگذاری، تعطیلی، تیم، صفحه، مدارک
     پذیرش فضا     برنامه، تعطیلی، مراجعان (بی‌نام)، پیام به تجربه
     درمانگر فضا   درمانگر تجربه (از «ساعت‌های حضوری») یا «فقط همین فضا» (تب درمانگران پارتنر)
     مراجع         از مسیر حضوری بات و صفحه‌های سایت (start=inp-<کد>)
     پذیرش تجربه   نمای همهٔ فضاها، تأیید واگذاری اتاق، دیدن تعطیلی‌ها
     ناظر (یاسر)   تأیید درمانگر فقط‌پارتنر و ارجاع به مصاحبه، سهم هر پارتنر، مدارک

   زمان‌ها: هر ساعت اتاق و هر ساعت درمانگر «هفتگی» است: یک بار تعریف می‌شود و هر هفته
   تکرار می‌شود تا وقتی عوض شود. بسته‌بودن یک روز خاص یک «استثنا»ی تک‌روزه است.

   نقاط اتصال به telegram.gs (همه کوتاه، با typeof):
     tgPrivate_     ← ptRoute_       (بعد از tnkRoute_)
     tgOnCallback_  ← ptCb_          (پیشوند pt:)
     tgPaOn_        ← ptPaOverride_  (میز، تکمیل اطلاعات، فضا، هاب)
     tgMyRoles_     ← ptIsPartnerChat_ (نقش «پارتنر» برای تیم و درمانگر فضا)
     tgRoleRoute_   ← ptEntry_       (نقش «پارتنر»)
     tgPaPct_       ← ptFieldsFor_   (درصد تکمیل بر اساس ایران یا خارج)
     tgInpVCb_      ← ptOnInpDecision_ (خبر به مدیر پارتنر بعد از تأیید پذیرش)
     tgPnStart_     ← ptIntroPdf_    (PDF معرفی به کسی که می‌خواهد پارتنر شود)
     tgApiGuard_    ← ptApiOk_       (گیت مینی‌اپ برای نقش پارتنر)
   ═══════════════════════════════════════════════════════════════════ */

var PT_VER = 'v142';
var PT_CUR = '';   /* chat جاری؛ tgMyRoles_ می‌گذارد، برای دکمهٔ منوی درمانگر فضا */
var PT_BOT = 'tajrobehlife_bot';

var PT_T = {
  staff: 'تیم پارتنرها',
  ther: 'درمانگران پارتنر',
  off: 'تعطیلی‌های پارتنر'
};
var PT_H = {
  staff: ['شناسه مکان', 'نام', 'نقش', 'یوزرنیم', 'chat_id', 'وضعیت', 'تاریخ', 'دعوت‌کننده', 'یادداشت'],
  ther: ['کد', 'شناسه مکان', 'نام', 'یوزرنیم', 'chat_id', 'شمارهٔ تماس', 'رویکرد', 'مدرک و مجوز', 'توضیح مدیر فضا',
         'نوع', 'وضعیت', 'سوپروایزر مصاحبه', 'معرفی‌کننده', 'تاریخ', 'یادداشت ناظر'],
  off: ['کد', 'شناسه مکان', 'تاریخ', 'روز هفته', 'تاریخ میلادی', 'بخش', 'علت', 'ثبت‌کننده', 'زمان ثبت', 'خبر به', 'دیدند', 'وضعیت']
};
var PT_ROLE = { m: 'مدیر', p: 'پذیرش' };
var PT_TST = { wait: 'منتظر تأیید ناظر', iv: 'مصاحبهٔ بالینی', ivok: 'مصاحبه قبول شد', ok: 'تأیید شد', no: 'رد شد' };
var PT_KIND_ONLY = 'فقط همین فضا';
var PT_KIND_TJ = 'درمانگر تجربه';
var PT_OFF_ON = 'بسته', PT_OFF_X = 'لغو شد';
var PT_OFF_WHY = ['تعطیل رسمی', 'تعمیر یا مشکل فضا', 'مراسم یا رویداد', 'دلیل دیگر'];
var PT_PARTS = [['all', 'تمام روز', 0, 24], ['am', 'صبح', 9, 13], ['noon', 'ظهر', 13, 17], ['pm', 'عصر و شب', 17, 24]];
var PT_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
var PT_SHARES = cfg_('PT_SHARES', []);
var PT_SHARE_TAB = 'سهم پارتنرها';
var PT_SHARE_HEAD = ['شناسه مکان', 'نام فضا', 'درصد', 'از تاریخ', 'ثبت‌کننده', 'یادداشت'];
var PT_DOC_TAB = 'مدارک پارتنرها';
var PT_DOC_HEAD = ['زمان', 'شناسه مکان', 'نام فضا', 'نوع مدرک', 'نام فایل', 'لینک درایو', 'file_id', 'فرستنده', 'یادداشت'];
var PT_TH_BTN = '🏢 فضای حضوری من';
var PT_PDF_PROP = 'PT_PDF_ID';        /* شناسهٔ فایل PDF معرفی در درایو */
var PT_PDF_FID = 'PT_PDF_FILEID';     /* file_id تلگرام بعد از اولین ارسال */
var PT_DOC_DIR = 'PT_DOC_DIR';        /* پوشهٔ مدارک در درایو */

/* ───── فیلدهای صفحهٔ فضا، گروه‌بندی‌شده؛ w: * همه · ir فقط ایران · ab فقط خارج ───── */
var PT_GROUPS = [
  ['a', '📍 نشانی و راه رسیدن'],
  ['b', '🕰 روزها و ساعت'],
  ['c', '🚪 فضا و اتاق‌ها'],
  ['d', '👥 تماس و تیم'],
  ['e', '🌐 متن صفحهٔ سایت'],
  ['f', '🧾 مجوز و تسویه']
];
var PT_FIELDS = [
  { k: 'ad', g: 'a', w: '*', col: 'نشانی کامل', q: 'نشانی کامل مرکز: شهر، خیابان، پلاک، طبقه و واحد.', qab: 'نشانی کامل: کشور، شهر، خیابان و شماره، کد پستی.', why: 'روی سایت فقط محله می‌آید؛ نشانی دقیق بعد از قطعی شدن وقت به مراجع داده می‌شود.' },
  { k: 'pc', g: 'a', w: 'ir', col: 'کد پستی', q: 'کد پستی ده‌رقمی مرکز (اگر دارید).' },
  { k: 'mp', g: 'a', w: '*', col: 'لینک گوگل مپ', q: 'لینک گوگل مپ مرکز. در گوگل مپ روی مرکز بزنید، «اشتراک‌گذاری» و بعد «کپی لینک». نشان هم قبول است.', qab: 'لینک Google Maps مرکز. روی مرکز بزنید، Share و بعد Copy link.' },
  { k: 'lm', g: 'a', w: '*', col: 'نزدیک‌ترین نشانهٔ شهری', q: 'یک نشانهٔ آشنا نزدیک مرکز که همهٔ اهل شهر می‌شناسند. مثال: «دو کوچه بالاتر از میدان امام».', why: 'مراجع با همین جمله خیالش راحت می‌شود که پیدایتان می‌کند؛ گوگل هم محله را از همین می‌فهمد.' },
  { k: 'bs', g: 'a', w: '*', col: 'حمل‌ونقل عمومی', q: 'نزدیک‌ترین ایستگاه مترو یا اتوبوس چقدر فاصله دارد؟', qab: 'نزدیک‌ترین ایستگاه مترو، تراموا یا اتوبوس و چند دقیقه پیاده؟' },
  { k: 'pk', g: 'a', w: '*', col: 'پارکینگ', q: 'پارکینگ دارید؟ اگر نه، نزدیک‌ترین جای پارک کجاست؟' },
  { k: 'wc', g: 'a', w: '*', col: 'دسترسی صندلی چرخدار', q: 'مرکز برای صندلی چرخدار دسترس‌پذیر است؟ آسانسور یا رمپ دارید؟ طبقهٔ چندم است؟' },
  { k: 'nb', g: 'a', w: '*', col: 'شهرهای اطراف', q: 'از کدام شهرهای اطراف راحت می‌شود به شما رسید؟ مثال: «از شاندیز و طرقبه نیم ساعت».', qab: 'از کدام شهرها یا کشورهای همسایه راحت می‌شود به شما رسید؟ مثال: «از مونیخ دو ساعت با قطار».', why: 'مراجع شهرهای اطراف دنبال نزدیک‌ترین فضای حضوری می‌گردد؛ این جمله او را به شما می‌رساند.' },
  { k: 'hr', g: 'b', w: '*', col: 'ساعت کاری', q: 'روزها و ساعت کار مرکز. مثال: شنبه تا چهارشنبه ۹ تا ۲۰، پنجشنبه ۹ تا ۱۴.', qab: 'روزها و ساعت کار مرکز به وقت محلی. مثال: دوشنبه تا جمعه ۹ تا ۱۹.' },
  { k: 'hd', g: 'b', w: '*', col: 'در تعطیلات رسمی', q: 'در تعطیلات رسمی باز هستید؟ مثال: «نه، همهٔ تعطیلات رسمی بسته‌ایم» یا «فقط نوروز و عاشورا بسته‌ایم».', qab: 'در تعطیلات رسمی کشورتان باز هستید؟ مثال: «نه، تعطیلات رسمی اتریش بسته‌ایم».', why: 'اگر روزی بسته بودید، از «📅 بستن یک روز» در میز خودتان با یک دکمه به درمانگرها خبر می‌دهید.' },
  { k: 'tz', g: 'b', w: 'ab', col: 'منطقهٔ زمانی', q: 'منطقهٔ زمانی شما چیست؟ مثال: وین، برلین، تورنتو.' },
  { k: 'rm', g: 'c', w: '*', col: 'تعداد اتاق درمان', q: 'چند اتاق درمان دارید و هرکدام تقریباً چند متر است؟' },
  { k: 'wr', g: 'c', w: '*', col: 'اتاق انتظار و حریم', q: 'اتاق انتظار دارید؟ مراجع‌ها در انتظار همدیگر را می‌بینند؟ در اتاق‌ها عایق صدا دارد؟', why: 'حریم، اولین سؤال مراجعی است که بار اول حضوری می‌آید.' },
  { k: 'eq', g: 'c', w: '*', col: 'امکانات اتاق', q: 'در اتاق‌ها چه هست؟ مثلاً مبل راحت، کاناپه برای کار تحلیلی، اسباب‌بازی و میز بازی برای کودک، نور طبیعی، تهویه.' },
  { k: 'ph', g: 'c', w: '*', col: 'پوشهٔ عکس', q: 'عکس‌های فضا: همین‌جا چند عکس بفرستید، یا لینک پوشه‌اش را بنویسید. سه زاویه از داخل و یک نما از ورودی کافی است. در عکس هیچ آدمی نباشد.', why: 'صفحه‌ای که عکس دارد چند برابر بیشتر درخواست می‌گیرد. عکس‌ها را یکدست و هم‌رنگ برند می‌کنیم.' },
  { k: 'tl', g: 'd', w: '*', col: 'شمارهٔ تماس', q: 'تلفن ثابت مرکز.', why: 'روی سایت نمی‌آید؛ فقط پذیرش تجربه برای هماهنگی دارد.' },
  { k: 'cn', g: 'd', w: '*', col: 'نام و شمارهٔ رابط', q: 'نام و شمارهٔ همکاری که هماهنگی روزانه با تجربه با اوست.' },
  { k: 'em', g: 'd', w: '*', col: 'ایمیل', q: 'ایمیل برای گزارش ماهانه و فاکتور.' },
  { k: 'lg', g: 'd', w: 'ab', col: 'زبان‌های پذیرش', q: 'پذیرش یا منشی شما به چه زبان‌هایی حرف می‌زند؟ مثال: آلمانی، انگلیسی، فارسی.' },
  { k: 'ab', g: 'e', w: '*', col: 'معرفی کوتاه', q: 'در چند خط فضایتان را معرفی کنید، از زبان خودتان. مراجع دقیقاً همین را می‌خواند.', why: 'این مهم‌ترین متن صفحهٔ شماست. ما ویرایش می‌کنیم و پیش از انتشار به شما نشان می‌دهیم.' },
  { k: 'bf', g: 'e', w: '*', col: 'پیش از آمدن بدانید', q: 'مراجعی که بار اول می‌آید چه باید بداند؟ مثلاً زنگ کدام واحد، کجا منتظر بماند، چند دقیقه زودتر بیاید.' },
  { k: 'ft', g: 'e', w: '*', col: 'مراجعان مناسب این فضا', q: 'فضای شما برای چه کسانی مناسب‌تر است؟ مثلاً کودک و نوجوان، زوج، بزرگسال، گروه.' },
  { k: 'lc', g: 'f', w: '*', col: 'مجوز و نهاد صادرکننده', q: 'مرکز چه مجوزی دارد و از کدام نهاد؟ مثال: «مرکز مشاوره، مجوز بهزیستی خراسان رضوی» یا «مطب شخصی، پروانهٔ نظام روان‌شناسی».', qab: 'مرکز یا مطب با چه مجوزی کار می‌کند؟ مثال: «ثبت در فهرست روان‌درمانگران وزارت بهداشت اتریش».', why: 'روی سایت فقط یک نشان «فضای بررسی‌شده» می‌آید، نه شمارهٔ مجوز.' },
  { k: 'cu', g: 'f', w: 'ab', col: 'واحد پول تسویه', q: 'تسویه با شما به چه واحد پولی و به چه روشی راحت‌تر است؟ مثال: یورو، انتقال بانکی.' }
];
/* ستون‌های تازه فقط انتهای تب «صفحهٔ پارتنر» */
var PT_PN_EXTRA = ['کشور', 'منطقهٔ زمانی', 'کد پستی', 'نزدیک‌ترین نشانهٔ شهری', 'شهرهای اطراف', 'در تعطیلات رسمی',
  'اتاق انتظار و حریم', 'امکانات اتاق', 'زبان‌های پذیرش', 'پیش از آمدن بدانید', 'مراجعان مناسب این فضا',
  'مجوز و نهاد صادرکننده', 'واحد پول تسویه', 'آخرین یادآوری تکمیل'];
try { PT_PN_EXTRA.forEach(function (c) { if (TG_PN_HEAD.indexOf(c) < 0) TG_PN_HEAD.push(c); }); } catch (ePt0) {}

var PT_DOCS = {
  ir: ['مجوز فعالیت مرکز', 'پروانهٔ مسئول فنی یا کارت نظام روان‌شناسی', 'سند مالکیت یا اجاره‌نامه', 'عکس تابلو یا ورودی', 'مدرک دیگر'],
  ab: ['ثبت مطب یا مرکز (مثلاً Gewerbe یا ثبت انجمن حرفه‌ای)', 'مجوز حرفه‌ای مسئول فضا', 'اجاره‌نامه یا سند (Mietvertrag)', 'عکس ورودی', 'مدرک دیگر']
};

var PT_GUIDE = [
  ['میز پارتنر', 'همهٔ کارهای فضای شما از همین میز است؛ هم در بات («🏢 میز پارتنر» پایین صفحه) هم در مینی‌اپ تجربه.'],
  ['صفحهٔ سایت', 'صفحهٔ فضای شما در tajrobeh.life/partners/ از جواب‌های «🌐 تکمیل صفحه» ساخته می‌شود. هرچه کامل‌تر و دقیق‌تر، مراجع بیشتری پیدایتان می‌کند.'],
  ['اتاق‌ها', 'در «🚪 اتاق‌ها» هر اتاق را با روزها و ساعت باز بودنش تعریف می‌کنید.'],
  ['هفتگی است', 'هر ساعتی که تعریف می‌شود هر هفته تکرار می‌شود تا وقتی خودتان عوضش کنید. اگر این دوشنبه ساعت ۱۰ تا ۱۴ باز است، دوشنبهٔ بعد هم هست.'],
  ['دادن اتاق به درمانگر', 'در «🔑 دادن اتاق» درمانگر، اتاق، روز و ساعت را انتخاب می‌کنید. پذیرش تجربه تأیید می‌کند و درمانگر خبردار می‌شود؛ از آن به بعد هر هفته همان ساعت مال اوست.'],
  ['یک روز بسته', 'اگر روزی بسته‌اید (تعطیلی، تعمیر، مراسم) «📅 بستن یک روز» را بزنید. بات به درمانگرهایی که آن روز ساعت دارند و به پذیرش تجربه خبر می‌دهد.'],
  ['درمانگرها', 'درمانگرهای فضای شما دو گروه‌اند: درمانگرهای تجربه، و کسانی که فقط در فضای شما کار می‌کنند. دومی را از «🩺 درمانگرها» معرفی می‌کنید؛ تأییدش با تجربه است و اگر لازم باشد یک مصاحبهٔ بالینی با سوپروایزر دارد.'],
  ['مراجعان', 'مراجع همیشه از پذیرش تجربه می‌آید. در «🙋 مراجعان ما» تعداد و مرحلهٔ هر مراجع را با کد می‌بینید؛ نام مراجع برای حفظ حریم خصوصی فقط نزد تجربه می‌ماند.'],
  ['تیم', 'منشی یا همکار پذیرش خودتان را از «👥 تیم من» با یک لینک اضافه کنید.'],
  ['مدارک', 'مجوز، سند یا اجاره‌نامه اختیاری است. اگر بفرستید، در درایو محرمانهٔ تجربه نگه داشته می‌شود و فقط مدیر تجربه به آن دسترسی دارد.'],
  ['مالی', 'سهم شما در قرارداد نوشته می‌شود و فقط خودتان در میز می‌بینید. پرداخت مراجع و تسویه ماهانه با تجربه است.']
];

/* رجیستری مینی‌اپ و کلیدهای کش */
try { TG_MEMO_KEYS.push('ptw'); } catch (ePt1) {}
try {
  TG_CAP.push(
    { key: 'pa_say', page: 'pa', label: 'نوشتن در میز پارتنر', roles: ['پارتنر', 'پذیرش', 'ناظر', 'راهبر'], bot: true, api: 'pa.say', app: true },
    { key: 'pt_tick', label: 'یادآوری تعطیلی و تکمیل صفحهٔ پارتنرها', roles: [], bot: true, api: '', app: false, appNa: 'کار زمان‌بندی‌شدهٔ سرور است' }
  );
} catch (ePt2) {}
try { if (typeof TG_ROLE_BTN !== 'undefined' && !TG_ROLE_BTN['پارتنر']) TG_ROLE_BTN['پارتنر'] = '🏢 میز پارتنر'; } catch (ePt3) {}
try {
  ['مکان‌های حضوری', 'اتاق‌های حضوری', 'ساعت‌های حضوری', 'درخواست‌های حضوری', 'درخواست فضای پارتنر',
   PT_T.staff, PT_T.ther, PT_T.off].forEach(function (n) { if (TG_HUB_ORDER.indexOf(n) < 0) TG_HUB_ORDER.push(n); });
} catch (ePt4) {}

/* ═══════════ کمکی‌ها ═══════════ */
function ptTab_(k) { return tgInpTab_(PT_T[k], PT_H[k]); }
function ptObj_(head, r, i) { var o = { _row: i + 2 }; for (var c = 0; c < head.length; c++) o[head[c]] = String(r[c] === undefined || r[c] === null ? '' : r[c]).trim(); return o; }
function ptRows_(k) { return ptTab_(k).rows().map(function (r, i) { return ptObj_(PT_H[k], r, i); }); }
function ptSetCell_(k, row, col, val) { var i = PT_H[k].indexOf(col); if (i > -1) ptTab_(k).set(row, i + 1, val); }
function ptNow_() { return tgInpNow_(); }
function ptKb_(rows) { return { inline_keyboard: rows }; }
function ptB_(text, data) { return { text: text, callback_data: 'pt:' + data }; }
function ptBack_(to) { return [ptB_('↩️ میز', to || 'dk')]; }
function ptTok_(s) { return tgApTok_(String(s), 'ptinv'); }
function ptLink_(payload) { return 'https://t.me/' + PT_BOT + '?start=' + payload; }
function ptBar_(pct) { var n = Math.round(pct / 10); var s = ''; for (var i = 0; i < 10; i++) s += i < n ? '▰' : '▱'; return s; }
function ptChats_(cell) { return String(cell || '').split(/[,،;\s]+/).filter(String); }
function ptSame_(cell, chat) { return ptChats_(cell).indexOf(String(chat)) > -1; }
function ptClearCache_() { if (TG_DRY) return; try { CacheService.getScriptCache().removeAll(['ptchats', 'inpdata', 'plist']); } catch (e) {} try { tgInpMapReset_(); } catch (e2) {} }
function ptState_(chat) { try { return JSON.parse(tgGetVal_('ptw', chat) || 'null'); } catch (e) { return null; } }
function ptSetState_(chat, st) { tgSetVal_('ptw', chat, JSON.stringify(st)); }
function ptClear_(chat) { tgDel_('ptw', chat); }
function ptName_(o) { return (o && (o['نام نمایشی'] || o['شهر'])) || ''; }

/* ایران یا خارج: از ستون «کشور»، وگرنه از شهر */
function ptAbroad_(o) {
  if (!o) return false;
  var c = String(o['کشور'] || '').trim();
  if (c) return c !== 'ایران';
  try { return tgIsAbroadCity_(o['شهر']); } catch (e) { return false; }
}
function ptFieldsFor_(o) {
  var ab = ptAbroad_(o);
  return PT_FIELDS.filter(function (f) { return f.w === '*' || (ab ? f.w === 'ab' : f.w === 'ir'); });
}
function ptPct_(o) {
  var F = ptFieldsFor_(o), have = 0;
  F.forEach(function (f) { if (String(o[f.col] || '').trim()) have++; });
  return F.length ? Math.round(have * 100 / F.length) : 0;
}

/* ═══════════ چه کسی کدام فضا؟ ═══════════ */
/* نقشهٔ chat ← {code, role} برای تیم و درمانگر فضا؛ ده دقیقه در کش. ناظر و پذیرش تجربه اینجا نیستند. */
function ptChatMap_() {
  if (!TG_DRY) { try { var hit = CacheService.getScriptCache().get('ptchats'); if (hit) return JSON.parse(hit); } catch (e) {} }
  var map = {};
  var put = function (chats, code, role) { ptChats_(chats).forEach(function (c) { if (!map[c]) map[c] = { code: code, role: role }; }); };
  try { tgPaRows_().forEach(function (o) { if (o['chat_id مسئول']) put(o['chat_id مسئول'], o['شناسه مکان'], PT_ROLE.m); }); } catch (e1) {}
  try { ptRows_('staff').forEach(function (s) { if (s['وضعیت'] !== 'غیرفعال' && s['chat_id']) put(s['chat_id'], s['شناسه مکان'], s['نقش'] || PT_ROLE.p); }); } catch (e2) {}
  try { ptRows_('ther').forEach(function (t) { if (t['وضعیت'] === PT_TST.ok && t['chat_id']) put(t['chat_id'], t['شناسه مکان'], 'درمانگر'); }); } catch (e3) {}
  if (!TG_DRY) { try { CacheService.getScriptCache().put('ptchats', JSON.stringify(map), 600); } catch (e4) {} }
  return map;
}
function ptWho_(chat) { var m = ptChatMap_()[String(chat)]; return m ? { code: m.code, role: m.role } : null; }
function ptIsPartnerChat_(chat) { return !!ptWho_(chat); }
function ptIsBoss_(chat, uname) {
  try { var w = tgApWho_(chat, uname); if (w.watch || w.desk) return true; } catch (e) {}
  try { var p = tgWhoPerson_(chat, uname || ''); if (p && (p.roles.indexOf('راهبر') > -1 || p.roles.indexOf('ناظر') > -1 || p.roles.indexOf('پذیرش') > -1)) return true; } catch (e2) {}
  return false;
}
function ptIsOwner_(chat, uname) { try { return !!tgApWho_(chat, uname).watch; } catch (e) { return false; } }
function ptApiOk_(chat, uname) { return ptIsPartnerChat_(chat) || ptIsBoss_(chat, uname); }
function ptPlace_(code) { return tgPaByCode_(code); }

/* ═══════════ ورود ═══════════ */
function ptEntry_(chat, uname) {
  var w = ptWho_(chat);
  if (w && w.role === 'درمانگر') return ptTherHome_(chat);
  if (w) return ptDesk_(chat);
  if (ptIsBoss_(chat, uname)) return ptHub_(chat);
  return tgSend_(chat, '🏢 <b>تجربه پارتنرز</b>\n\nاین بخش برای فضاهای حضوری تجربه است. اگر مرکز یا مطبی دارید و می‌خواهید پارتنر شوید، از این لینک شروع کنید:\n' + TG_PN_URL);
}

/* ═══════════ میز پارتنر ═══════════ */
function ptDeskStats_(code) {
  var d = tgInpData_(), rooms = 0, hrs = 0, ther = {};
  (d.rooms || []).forEach(function (r) { if (r.p === code && r.status !== 'غیرفعال') rooms++; });
  (d.hours || []).forEach(function (h) { if (h.p === code) { hrs++; ther[tgInpNameKey_(h.who)] = 1; } });
  var soon = ptOffUpcoming_(code, 7).length;
  return { rooms: rooms, hours: hrs, ther: Object.keys(ther).length, soon: soon };
}
function ptNextStep_(o, st, role) {
  if (role !== PT_ROLE.m) return '';
  if (o['قواعد را پذیرفت'] !== 'بله') return 'قواعد همکاری را بخوانید و تأیید کنید.';
  if (!st.rooms) return 'اتاق‌هایتان را در «🚪 اتاق‌ها» تعریف کنید.';
  if (ptPct_(o) < 70) return 'صفحهٔ سایتتان را کامل کنید؛ هرچه کامل‌تر، درخواست بیشتر.';
  if (!st.hours) return 'به درمانگرهای فضا اتاق بدهید («🔑 دادن اتاق»).';
  return '';
}
function ptDesk_(chat) {
  ptClear_(chat);
  var w = ptWho_(chat);
  if (!w || w.role === 'درمانگر') return ptEntry_(chat, '');
  var o = ptPlace_(w.code);
  if (!o) return tgSend_(chat, 'فضای شما در هاب پیدا نشد. به پذیرش تجربه بگویید.');
  var st = ptDeskStats_(w.code), pct = ptPct_(o), mgr = w.role === PT_ROLE.m;
  var t = '🏢 <b>میز پارتنر تجربه</b>\n<b>' + tgEsc_(ptName_(o)) + '</b> · ' + tgEsc_(o['شهر']) + (mgr ? '' : ' · ' + tgEsc_(w.role)) + '\n\n';
  t += 'وضعیت: ' + tgEsc_(o['وضعیت'] || 'در انتظار تأیید') + '\n';
  t += '🌐 صفحهٔ سایت: ' + ptBar_(pct) + ' ' + tgFa_(pct) + '٪\n';
  t += '🗓 ' + tgFa_(st.rooms) + ' اتاق · ' + tgFa_(st.hours) + ' ساعت هفتگی · ' + tgFa_(st.ther) + ' درمانگر\n';
  if (st.soon) t += '📅 ' + tgFa_(st.soon) + ' روز بسته در هفت روز آینده\n';
  if (mgr) {
    var sh = ptShareOf_(w.code);
    if (sh) t += '💼 سهم شما طبق قرارداد: ' + tgFa_(sh) + '٪\n';
    var open = 0; try { open = tgPaOpenReqs_(w.code).length; } catch (e) {}
    var wait = ptRows_('ther').filter(function (x) { return x['شناسه مکان'] === w.code && (x['وضعیت'] === PT_TST.wait || x['وضعیت'] === PT_TST.iv); }).length;
    if (open) t += '🤝 ' + tgFa_(open) + ' درخواست درمانگر منتظر جواب شما\n';
    if (wait) t += '⏳ ' + tgFa_(wait) + ' درمانگر معرفی‌شده در حال بررسی تجربه\n';
  }
  var next = ptNextStep_(o, st, w.role);
  if (next) t += '\n👉 <b>قدم بعدی:</b> ' + next;
  var kb = [];
  kb.push([ptB_('🗓 برنامهٔ هفتگی', 'wk'), ptB_('📅 بستن یک روز', 'of')]);
  if (mgr) {
    kb.push([ptB_('🚪 اتاق‌ها', 'rm'), ptB_('🔑 دادن اتاق به درمانگر', 'gr')]);
    kb.push([ptB_('🩺 درمانگرهای فضا', 'th'), ptB_('🙋 مراجعان ما', 'cl')]);
    kb.push([ptB_('🌐 تکمیل صفحهٔ سایت · ' + tgFa_(pct) + '٪', 'fl'), ptB_('📁 مدارک (اختیاری)', 'dc')]);
    kb.push([ptB_('👥 تیم من', 'tm'), ptB_('📘 راهنما', 'gu')]);
    kb.push([{ text: o['قواعد را پذیرفت'] === 'بله' ? '📋 قواعد همکاری' : '📋 قواعد همکاری (منتظر تأیید شما)', callback_data: 'pa:ru' }, ptB_('💬 پیام به تجربه', 'sy')]);
  } else {
    kb.push([ptB_('🩺 درمانگرهای فضا', 'th'), ptB_('🙋 مراجعان ما', 'cl')]);
    kb.push([ptB_('📘 راهنما', 'gu'), ptB_('💬 پیام به تجربه', 'sy')]);
  }
  return tgSend_(chat, t, ptKb_(kb));
}

function ptGuide_(chat) {
  var t = '📘 <b>راهنمای کوتاه تجربه پارتنرز</b>\n\n';
  PT_GUIDE.forEach(function (g, i) { t += tgFa_(i + 1) + '. <b>' + g[0] + '</b>: ' + g[1] + '\n\n'; });
  t += 'راهنمای یک‌صفحه‌ای PDF را هم پایین همین پیام می‌فرستم.';
  tgSend_(chat, t, ptKb_([ptBack_()]));
  ptIntroPdf_(chat, true);
  return null;
}

/* ═══════════ PDF معرفی (برای کسی که می‌خواهد پارتنر شود) ═══════════ */
function ptIntroPdf_(chat, quiet) {
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'pdf', chat: String(chat) }); return true; }
  if (TG_API_CHAT && String(chat) === String(TG_API_CHAT)) return false; /* مینی‌اپ فایل نمی‌گیرد */
  try {
    var props = PropertiesService.getScriptProperties();
    var cap = '📎 <b>تجربه پارتنرز در یک صفحه</b>\nچطور کار می‌کند، نقش هر طرف و قدم‌های شروع.';
    var fid = props.getProperty(PT_PDF_FID);
    if (fid) {
      var r0 = tgApi_('sendDocument', { chat_id: chat, document: fid, caption: cap, parse_mode: 'HTML' });
      if (r0 && r0.getResponseCode() === 200) return true;
    }
    var id = props.getProperty(PT_PDF_PROP);
    if (!id) return false;
    var blob = DriveApp.getFileById(id).getBlob().setName('Tajrobeh-Partners.pdf');
    var token = props.getProperty('TELEGRAM_TOKEN');
    var res = tgFetchRetry_('https://api.telegram.org/bot' + token + '/sendDocument', {
      method: 'post', muteHttpExceptions: true,
      payload: { chat_id: String(chat), caption: cap, parse_mode: 'HTML', document: blob }
    });
    var j = JSON.parse(res.getContentText());
    if (j.ok && j.result && j.result.document) props.setProperty(PT_PDF_FID, j.result.document.file_id);
    return !!j.ok;
  } catch (e) { if (!quiet) console.error('ptIntroPdf_: ' + e); return false; }
}

/* ═══════════ برنامهٔ هفتگی ═══════════ */
function ptFree_(open, busy) {
  var out = [], cur = open[0];
  busy.slice().sort(function (a, b) { return a[0] - b[0]; }).forEach(function (b) {
    if (b[1] <= cur || b[0] >= open[1]) { if (b[1] > cur && b[0] < open[1]) cur = Math.max(cur, b[1]); return; }
    if (b[0] > cur) out.push([cur, Math.min(b[0], open[1])]);
    cur = Math.max(cur, b[1]);
  });
  if (cur < open[1]) out.push([cur, open[1]]);
  return out.filter(function (x) { return x[1] - x[0] >= 1; });
}
function ptRoomsOf_(code) {
  return (tgInpData_().rooms || []).filter(function (r) { return r.p === code && r.status !== 'غیرفعال'; });
}
function ptWeekText_(code) {
  var d = tgInpData_(), rooms = ptRoomsOf_(code), hrs = (d.hours || []).filter(function (h) { return h.p === code; });
  var t = '';
  if (!rooms.length && !hrs.length) return 'هنوز اتاق و ساعتی ثبت نشده.';
  TG_INP_DAYS.forEach(function (day) {
    var lines = [];
    rooms.forEach(function (r) {
      var days = []; try { days = tgInpDaysOf_(r.days); } catch (e) { days = TG_INP_DAYS; }
      if (days.indexOf(day) < 0) return;
      var a = tgInpH_(r.from) || 9, b = tgInpH_(r.to) || 21, rk = tgInpRoomKey_(r.room);
      var mine = hrs.filter(function (h) { return h.day === day && tgInpRoomKey_(h.room) === rk; })
        .sort(function (x, y) { return (tgInpH_(x.from) || 0) - (tgInpH_(y.from) || 0); });
      var busy = mine.map(function (h) { return [tgInpH_(h.from) || a, tgInpH_(h.to) || b]; });
      var parts = mine.map(function (h) { return tgInpHs_(tgInpH_(h.from) || a) + '–' + tgInpHs_(tgInpH_(h.to) || b) + ' ' + h.who; });
      ptFree_([a, b], busy).forEach(function (f) { parts.push(tgInpHs_(f[0]) + '–' + tgInpHs_(f[1]) + ' ▫️آزاد'); });
      lines.push('  ' + tgEsc_(r.room) + (r.kind && r.kind !== 'بزرگسال' ? ' (' + tgEsc_(r.kind) + ')' : '') + ': ' + tgEsc_(parts.join(' · ')));
    });
    hrs.filter(function (h) { return h.day === day && !rooms.some(function (r) { return tgInpRoomKey_(r.room) === tgInpRoomKey_(h.room); }); })
      .forEach(function (h) { lines.push('  ' + tgEsc_((h.room ? 'اتاق ' + h.room : 'بی‌اتاق') + ': ' + tgInpSlot_(h) + ' ' + h.who)); });
    if (lines.length) t += '<b>' + day + '</b>\n' + lines.join('\n') + '\n';
  });
  return t;
}
function ptWeek_(chat, code) {
  var w = ptWho_(chat); code = code || (w && w.code);
  if (!code) return null;
  var o = ptPlace_(code);
  var t = '🗓 <b>برنامهٔ هفتگی · ' + tgEsc_(ptName_(o) || code) + '</b>\n<i>هر ساعت هر هفته تکرار می‌شود تا وقتی عوض شود.</i>\n\n' + ptWeekText_(code);
  var off = ptOffUpcoming_(code, 21);
  if (off.length) t += '\n📅 <b>روزهای بسته</b>\n' + off.map(function (x) { return '  ' + tgEsc_(x['تاریخ'] + '، ' + x['روز هفته'] + ' · ' + x['بخش'] + ' · ' + x['علت']); }).join('\n');
  var kb = [];
  if (w && w.role === PT_ROLE.m && w.code === code) kb.push([ptB_('🔑 دادن اتاق', 'gr'), ptB_('➖ آزاد کردن یک ساعت', 'rl')]);
  kb.push(w && w.code === code ? ptBack_() : [ptB_('↩️ همهٔ فضاها', 'hb')]);
  return tgSend_(chat, t, ptKb_(kb));
}

/* ═══════════ اتاق‌ها (مدیر فضا) ═══════════ */
function ptMgr_(chat) { var w = ptWho_(chat); return (w && w.role === PT_ROLE.m) ? w : null; }
function ptRooms_(chat) {
  var w = ptMgr_(chat); if (!w) return ptDesk_(chat);
  ptClear_(chat);
  var rows = tgInpTab_(TG_INP_ROOMS, TG_INP_RHEAD).rows(), t = '🚪 <b>اتاق‌های فضا</b>\n<i>روز و ساعت باز بودن هر اتاق هفتگی است.</i>\n\n', kb = [], n = 0;
  rows.forEach(function (r, i) {
    if (String(r[0]).trim() !== w.code) return;
    n++;
    t += (r[6] === 'غیرفعال' ? '⏸ ' : '▫️ ') + '<b>' + tgEsc_(r[1]) + '</b> · ' + tgEsc_(r[2] || 'بزرگسال') + ' · ' + tgEsc_(r[3] || 'همه روزها') + ' · ' + tgFa_(r[4] || '') + ' تا ' + tgFa_(r[5] || '') + (r[6] ? ' · ' + tgEsc_(r[6]) : '') + '\n';
    kb.push([ptB_('✏️ ' + String(r[1]).slice(0, 20), 're:' + (i + 2)), ptB_(r[6] === 'غیرفعال' ? '▶️ فعال شود' : '⏸ غیرفعال', 'rp:' + (i + 2))]);
  });
  if (!n) t += 'هنوز اتاقی ثبت نشده.\n';
  kb.push([ptB_('➕ اتاق تازه', 'ra')]);
  kb.push(ptBack_());
  return tgSend_(chat, t, ptKb_(kb));
}
function ptDaysKb_(sel, pre) {
  var kb = [], row = [];
  TG_INP_DAYS.forEach(function (d, i) {
    row.push(ptB_((sel.indexOf(i) > -1 ? '✅ ' : '▫️ ') + d, pre + ':' + i));
    if (row.length === 4) { kb.push(row); row = []; }
  });
  if (row.length) kb.push(row);
  kb.push([ptB_('همهٔ روزها', pre + ':all'), ptB_('✅ همین‌ها', pre + ':ok')]);
  return kb;
}
function ptHoursKb_(pre, min) {
  var kb = [], row = [];
  PT_HOURS.concat([23, 24]).forEach(function (h) {
    if (min != null && h <= min) return;
    if (min == null && h > 22) return;
    row.push(ptB_(tgFa_(h), pre + ':' + h));
    if (row.length === 5) { kb.push(row); row = []; }
  });
  if (row.length) kb.push(row);
  return kb;
}
function ptDaysLabel_(sel) {
  if (sel.length === 7) return 'همه روزها';
  return sel.slice().sort().map(function (i) { return TG_INP_DAYS[i]; }).join('، ');
}
/* ویزارد اتاق: نام ← برای چه کسی ← روزها ← از ← تا */
function ptRoomStart_(chat, row) {
  var w = ptMgr_(chat); if (!w) return null;
  var v = { days: [] };
  if (row) {
    var r = tgInpTab_(TG_INP_ROOMS, TG_INP_RHEAD).rows()[row - 2];
    if (!r || String(r[0]).trim() !== w.code) return ptRooms_(chat);
    v.name = r[1]; v.kind = r[2]; v.row = row;
    try { var dd = tgInpDaysOf_(r[3]); v.days = dd.map(function (x) { return TG_INP_DAYS.indexOf(x); }).filter(function (x) { return x > -1; }); } catch (e) {}
    ptSetState_(chat, { f: 'room', s: 'kind', v: v });
    return ptRoomAskKind_(chat, v);
  }
  ptSetState_(chat, { f: 'room', s: 'name', v: v });
  return tgSend_(chat, '🚪 اسم اتاق را بنویسید. مثال: «اتاق ۱» یا «اتاق بازی».', ptKb_([[ptB_('انصراف', 'rm')]]));
}
function ptRoomAskKind_(chat, v) {
  return tgSend_(chat, '«' + tgEsc_(v.name) + '» برای چه مراجعانی است؟', ptKb_([[ptB_('بزرگسال', 'rk:بزرگسال'), ptB_('کودک', 'rk:کودک'), ptB_('هر دو', 'rk:هر دو')], [ptB_('انصراف', 'rm')]]));
}
function ptRoomCb_(chat, a, arg) {
  var st = ptState_(chat);
  if (!st || st.f !== 'room') return ptRooms_(chat);
  var v = st.v;
  if (a === 'rk') { v.kind = arg; st.s = 'days'; ptSetState_(chat, st); return tgSend_(chat, 'کدام روزهای هفته باز است؟ چند تا را بزنید و بعد «همین‌ها».', ptKb_(ptDaysKb_(v.days, 'rd'))); }
  if (a === 'rd') {
    if (arg === 'all') v.days = [0, 1, 2, 3, 4, 5, 6];
    else if (arg === 'ok') {
      if (!v.days.length) return tgSend_(chat, 'دست‌کم یک روز را انتخاب کنید.');
      st.s = 'from'; ptSetState_(chat, st);
      return tgSend_(chat, 'روزها: ' + ptDaysLabel_(v.days) + '\n\nاز ساعت چند باز است؟', ptKb_(ptHoursKb_('rf')));
    } else { var i = Number(arg), k = v.days.indexOf(i); if (k > -1) v.days.splice(k, 1); else v.days.push(i); }
    ptSetState_(chat, st);
    return tgSend_(chat, 'روزهای باز: ' + (v.days.length ? ptDaysLabel_(v.days) : '—'), ptKb_(ptDaysKb_(v.days, 'rd')));
  }
  if (a === 'rf') { v.from = Number(arg); st.s = 'to'; ptSetState_(chat, st); return tgSend_(chat, 'تا ساعت چند؟', ptKb_(ptHoursKb_('rt', v.from))); }
  if (a === 'rt') { v.to = Number(arg); ptSetState_(chat, st); return ptRoomSave_(chat, v); }
  return null;
}
function ptRoomSave_(chat, v) {
  var w = ptMgr_(chat); if (!w) return null;
  var o = ptPlace_(w.code), active = o && (o['وضعیت'] === 'فعال' || o['وضعیت'] === 'آمادهٔ انتشار');
  var t = tgInpTab_(TG_INP_ROOMS, TG_INP_RHEAD), days = ptDaysLabel_(v.days);
  if (v.row) {
    t.set(v.row, 3, v.kind); t.set(v.row, 4, days); t.set(v.row, 5, String(v.from)); t.set(v.row, 6, String(v.to));
    t.set(v.row, 8, 'ویرایش مدیر فضا · ' + ptNow_());
  } else {
    t.append([w.code, v.name, v.kind, days, String(v.from), String(v.to), active ? 'فعال' : 'بررسی', 'از میز پارتنر · ' + ptNow_()]);
  }
  ptClear_(chat); ptClearCache_();
  var line = tgEsc_(v.name) + ' · ' + tgEsc_(v.kind) + ' · ' + days + ' · ' + tgFa_(v.from) + ' تا ' + tgFa_(v.to);
  try { tgInpDeskSay_('🚪 <b>اتاق ' + (v.row ? 'ویرایش شد' : 'تازه') + '</b> · ' + tgEsc_(ptName_(o)) + '\n' + line); } catch (e) {}
  tgSend_(chat, '✅ ثبت شد: ' + line + '\n\nاین ساعت‌ها هر هفته تکرار می‌شود.');
  return ptRooms_(chat);
}
function ptRoomPause_(chat, row) {
  var w = ptMgr_(chat); if (!w) return null;
  var t = tgInpTab_(TG_INP_ROOMS, TG_INP_RHEAD), r = t.rows()[row - 2];
  if (!r || String(r[0]).trim() !== w.code) return ptRooms_(chat);
  var on = r[6] === 'غیرفعال';
  t.set(row, 7, on ? 'فعال' : 'غیرفعال');
  ptClearCache_();
  try { tgInpDeskSay_('🚪 ' + tgEsc_(r[1]) + ' در ' + tgEsc_(ptName_(ptPlace_(w.code))) + (on ? ' دوباره فعال شد.' : ' غیرفعال شد.')); } catch (e) {}
  return ptRooms_(chat);
}

/* ═══════════ درمانگرهای فضا ═══════════ */
/* درمانگرهای تجربه که در این فضا ساعت دارند یا درخواستشان را پارتنر تأیید کرده، به‌علاوهٔ «فقط همین فضا»ها */
function ptTherList_(code) {
  var seen = {}, out = [];
  var add = function (name, kind, chat, st) { var k = tgInpNameKey_(name); if (!k || seen[k]) return; seen[k] = 1; out.push({ name: name, kind: kind, chat: chat || '', st: st || '' }); };
  (tgInpData_().hours || []).forEach(function (h) { if (h.p === code) add(h.who, PT_KIND_TJ, '', 'ساعت دارد'); });
  try { tgPaReqRows_().forEach(function (r) { if (r['شناسه مکان'] === code && (r['وضعیت'] === TG_PA_RST.ok || r['وضعیت'] === TG_PA_RST.live)) add(r['نام درمانگر'], PT_KIND_TJ, r['chat_id'], 'تأیید شما'); }); } catch (e) {}
  ptRows_('ther').forEach(function (t) { if (t['شناسه مکان'] === code && t['وضعیت'] === PT_TST.ok) add(t['نام'], PT_KIND_ONLY, t['chat_id'], 'تأیید تجربه'); });
  return out;
}
function ptTher_(chat) {
  ptClear_(chat);
  var w = ptWho_(chat); if (!w) return null;
  var list = ptTherList_(w.code), t = '🩺 <b>درمانگرهای فضا</b>\n\n';
  var tj = list.filter(function (x) { return x.kind === PT_KIND_TJ; }), only = list.filter(function (x) { return x.kind === PT_KIND_ONLY; });
  t += '<b>درمانگرهای تجربه</b> (از کلینیک تجربه، اینجا هم حضوری می‌بینند)\n' + (tj.length ? tj.map(function (x) { return '  ▫️ ' + tgEsc_(x.name); }).join('\n') : '  هنوز کسی نیست') + '\n\n';
  t += '<b>فقط در همین فضا</b>\n' + (only.length ? only.map(function (x) { return '  ▫️ ' + tgEsc_(x.name); }).join('\n') : '  هنوز کسی نیست') + '\n';
  var pend = ptRows_('ther').filter(function (x) { return x['شناسه مکان'] === w.code && (x['وضعیت'] === PT_TST.wait || x['وضعیت'] === PT_TST.iv || x['وضعیت'] === PT_TST.ivok); });
  if (pend.length) t += '\n<b>در حال بررسی تجربه</b>\n' + pend.map(function (x) { return '  ⏳ ' + tgEsc_(x['نام']) + ' · ' + tgEsc_(x['وضعیت']); }).join('\n') + '\n';
  var kb = [];
  if (w.role === PT_ROLE.m) {
    kb.push([ptB_('➕ معرفی درمانگر تازه برای همین فضا', 'ta')]);
    kb.push([ptB_('📣 دعوت درمانگرهای تجربهٔ هم‌شهر', 'ti')]);
    try { if (tgPaOpenReqs_(w.code).length) kb.push([{ text: '🤝 درخواست‌های منتظر جواب شما', callback_data: 'pa:rq' }]); } catch (e) {}
  }
  kb.push(ptBack_());
  t += '\n<i>درمانگر «فقط همین فضا» فقط مراجعانی را می‌بیند که تجربه برای فضای شما ارجاع می‌دهد. تأییدش با تجربه است و اگر لازم باشد یک مصاحبهٔ بالینی کوتاه با سوپروایزر دارد.</i>';
  return tgSend_(chat, t, ptKb_(kb));
}
var PT_TQ = [
  { k: 'name', t: 'نام و نام خانوادگی درمانگر را بنویسید.' },
  { k: 'phone', t: 'شمارهٔ تماسش را بنویسید (برای هماهنگی مصاحبه؛ جایی منتشر نمی‌شود).', skip: true },
  { k: 'user', t: 'آی‌دی تلگرامش را بنویسید، مثل @name. اگر نمی‌دانید «⏭ رد کردن».', skip: true },
  { k: 'appr', t: 'رویکرد درمانی‌اش؟ مثال: روانکاوی، CBT، EFT، سیستمی.' },
  { k: 'deg', t: 'مدرک، دانشگاه و مجوز کارش؟ مثال: «ارشد روان‌شناسی بالینی دانشگاه فردوسی، پروانهٔ نظام».' },
  { k: 'note', t: 'چند خط دربارهٔ تجربه و کارش، و چرا فکر می‌کنید برای فضای شما مناسب است.', skip: true }
];
function ptTherAddAsk_(chat, st) {
  var q = PT_TQ[st.i];
  var kb = [];
  if (q.skip) kb.push([ptB_('⏭ رد کردن', 'tq:skip')]);
  kb.push([ptB_('انصراف', 'th')]);
  return tgSend_(chat, '➕ <b>معرفی درمانگر</b> · ' + tgFa_(st.i + 1) + ' از ' + tgFa_(PT_TQ.length) + '\n\n' + q.t, ptKb_(kb));
}
function ptTherAddStart_(chat) {
  var w = ptMgr_(chat); if (!w) return null;
  var st = { f: 'ther', i: 0, v: {} };
  ptSetState_(chat, st);
  return ptTherAddAsk_(chat, st);
}
function ptTherAddText_(chat, st, text) {
  var q = PT_TQ[st.i];
  if (text !== null) {
    if (q.k === 'name' && String(text).trim().split(/\s+/).length < 2) return tgSend_(chat, 'نام و نام خانوادگی را کامل بنویسید.');
    if (q.k === 'phone' && !tgLooksLikePhone_(text)) return tgSend_(chat, 'این شماره درست به نظر نمی‌رسد. دوباره بنویسید یا «⏭ رد کردن».');
    st.v[q.k] = String(text).trim();
  }
  st.i++;
  if (st.i < PT_TQ.length) { ptSetState_(chat, st); return ptTherAddAsk_(chat, st); }
  ptClear_(chat);
  return ptTherAddSave_(chat, st.v);
}
function ptTherNextCode_() {
  var n = 100; ptRows_('ther').forEach(function (r) { var m = String(r['کد']).match(/(\d+)/); if (m && Number(m[1]) > n) n = Number(m[1]); });
  return 'PT-' + (n + 1);
}
function ptTherAddSave_(chat, v) {
  var w = ptMgr_(chat); if (!w) return null;
  var o = ptPlace_(w.code), code = ptTherNextCode_(), who = '';
  try { var p = tgWhoPerson_(chat, ''); who = p ? p.name : ''; } catch (e) {}
  ptTab_('ther').append([code, w.code, v.name || '', v.user || '', '', v.phone || '', v.appr || '', v.deg || '', v.note || '',
    PT_KIND_ONLY, PT_TST.wait, '', who || ('مدیر ' + ptName_(o)), ptNow_(), '']);
  tgSend_(chat, '✅ معرفی <b>' + tgEsc_(v.name) + '</b> ثبت شد و برای بررسی به تجربه رفت.\n\nتجربه یا مستقیم تأیید می‌کند یا یک مصاحبهٔ بالینی کوتاه با سوپروایزر می‌گذارد. نتیجه را همین‌جا خبرتان می‌کنم.', ptKb_([ptBack_()]));
  ptTherToOwner_(code);
  return null;
}
function ptTherCard_(r) {
  var o = ptPlace_(r['شناسه مکان']);
  return '🩺 <b>درمانگر معرفی‌شده برای فضای پارتنر</b> · <code>' + tgEsc_(r['کد']) + '</code>\n' +
    '<b>' + tgEsc_(r['نام']) + '</b>\nفضا: ' + tgEsc_(ptName_(o) + ' · ' + (o ? o['شهر'] : '')) + '\n' +
    (r['رویکرد'] ? 'رویکرد: ' + tgEsc_(r['رویکرد']) + '\n' : '') +
    (r['مدرک و مجوز'] ? 'مدرک و مجوز: ' + tgEsc_(r['مدرک و مجوز']) + '\n' : '') +
    (r['یوزرنیم'] ? 'تلگرام: ' + tgEsc_(r['یوزرنیم']) + '\n' : '') +
    (r['شمارهٔ تماس'] ? 'شماره: ' + tgEsc_(r['شمارهٔ تماس']) + '\n' : '') +
    (r['توضیح مدیر فضا'] ? '\n<i>' + tgEsc_(r['توضیح مدیر فضا'].slice(0, 500)) + '</i>\n' : '') +
    '\nوضعیت: ' + tgEsc_(r['وضعیت']) + (r['سوپروایزر مصاحبه'] ? ' · ' + tgEsc_(r['سوپروایزر مصاحبه']) : '');
}
function ptTherOwnerKb_(code) {
  return ptKb_([[ptB_('✅ تأیید مستقیم', 'to:ok:' + code)], [ptB_('🎤 بفرست برای مصاحبهٔ بالینی', 'to:iv:' + code)], [ptB_('⛔ رد', 'to:no:' + code)]]);
}
function ptTherToOwner_(code) {
  var r = ptTherByCode_(code); if (!r) return;
  var ids = TG_DRY ? (TG_MEM['watchids'] || []) : tgWatchIds_();
  ids.forEach(function (c) { tgSend_(c, ptTherCard_(r), ptTherOwnerKb_(code)); });
}
function ptTherByCode_(code) { var rows = ptRows_('ther'); for (var i = 0; i < rows.length; i++) if (rows[i]['کد'] === code) return rows[i]; return null; }
function ptTherMgrSay_(r, text) {
  var o = ptPlace_(r['شناسه مکان']);
  if (o && o['chat_id مسئول']) ptChats_(o['chat_id مسئول']).slice(0, 1).forEach(function (c) { tgSend_(c, text, ptKb_([[ptB_('🩺 درمانگرهای فضا', 'th')]])); });
  ptRows_('staff').forEach(function (s) { if (s['شناسه مکان'] === r['شناسه مکان'] && s['نقش'] === PT_ROLE.m && s['chat_id']) tgSend_(ptChats_(s['chat_id'])[0], text); });
}
function ptTherOwnerCb_(chat, uname, what, code) {
  if (!ptIsOwner_(chat, uname)) return tgSend_(chat, 'تأیید درمانگر فضای پارتنر با مدیر تجربه است.');
  var r = ptTherByCode_(code); if (!r) return tgSend_(chat, 'پیدا نشد.');
  if (what === 'iv') {
    var sups = []; try { sups = tgApSupList_(r['رویکرد']).slice(0, 8); } catch (e) {}
    if (!sups.length) return tgSend_(chat, 'سوپروایزری با «سوپرویژن می‌پذیرد» پیدا نشد.');
    return tgSend_(chat, '🎤 مصاحبهٔ بالینی ' + tgEsc_(r['نام']) + ' با کدام سوپروایزر؟', ptKb_(sups.map(function (s, i) { return [ptB_((s.exact ? '⭐ ' : '') + s.name, 'tv:' + code + ':' + i)]; })));
  }
  if (what === 'ok' || what === 'no') {
    ptSetCell_('ther', r._row, 'وضعیت', what === 'ok' ? PT_TST.ok : PT_TST.no);
    ptSetCell_('ther', r._row, 'یادداشت ناظر', (what === 'ok' ? 'تأیید' : 'رد') + ' · ' + ptNow_());
    ptClearCache_();
    if (what === 'ok') {
      var link = ptLink_('ptt-' + code + '-' + ptTok_(code));
      ptTherMgrSay_(r, '✅ <b>' + tgEsc_(r['نام']) + '</b> برای فضای شما تأیید شد.\n\nاین لینک را برایش بفرستید تا به بات تجربه وصل شود و برنامه و روزهای بستهٔ فضا را ببیند:\n' + link + '\n\nبعد از وصل شدن، از «🔑 دادن اتاق» به او اتاق بدهید.');
      return tgSend_(chat, '✅ تأیید شد. لینک اتصال برای مدیر فضا رفت:\n' + link);
    }
    ptTherMgrSay_(r, 'دربارهٔ ' + tgEsc_(r['نام']) + ' این بار امکان همکاری فراهم نشد. اگر سؤالی دارید «💬 پیام به تجربه» را بزنید.');
    return tgSend_(chat, 'ثبت شد: رد.');
  }
  return null;
}
function ptTherSupPick_(chat, uname, code, i) {
  if (!ptIsOwner_(chat, uname)) return null;
  var r = ptTherByCode_(code); if (!r) return null;
  var s = (tgApSupList_(r['رویکرد']) || [])[Number(i)]; if (!s) return null;
  ptSetCell_('ther', r._row, 'وضعیت', PT_TST.iv);
  ptSetCell_('ther', r._row, 'سوپروایزر مصاحبه', s.name);
  if (s.chat) tgSend_(ptChats_(s.chat)[0], '🎤 <b>درخواست مصاحبهٔ بالینی</b>\n\nمدیر تجربه از شما خواهش کرده با این درمانگر یک مصاحبهٔ بالینی کوتاه داشته باشید. قرار است فقط در فضای پارتنر تجربه مراجع ببیند.\n\n' +
    ptTherCard_(ptTherByCode_(code)) + '\n\nپذیرش تجربه برای وقت مصاحبه با شما هماهنگ می‌کند. بعد از مصاحبه نتیجه را همین‌جا بزنید.',
    ptKb_([[ptB_('✅ مناسب است', 'ts:ok:' + code), ptB_('⛔ مناسب نیست', 'ts:no:' + code)]]));
  try { tgInpDeskSay_('🎤 مصاحبهٔ بالینی ' + tgEsc_(r['نام']) + ' (درمانگر فضای ' + tgEsc_(ptName_(ptPlace_(r['شناسه مکان']))) + ') با ' + tgEsc_(s.name) + '. لطفاً وقت مصاحبه را هماهنگ کنید' + (r['شمارهٔ تماس'] ? ' · ' + tgEsc_(r['شمارهٔ تماس']) : '') + '.'); } catch (e) {}
  ptTherMgrSay_(r, '🎤 برای ' + tgEsc_(r['نام']) + ' یک مصاحبهٔ بالینی کوتاه با یکی از سوپروایزرهای تجربه گذاشته شد. پذیرش تجربه وقتش را هماهنگ می‌کند.');
  return tgSend_(chat, '✅ به ' + tgEsc_(s.name) + ' سپرده شد و پذیرش برای هماهنگی وقت خبر گرفت.');
}
/* v166.8: نتیجه را فقط سوپروایزری که مصاحبه به او سپرده شده یا مدیر تجربه ثبت می‌کند (پیش از این هر کسی با کال‌بک ساختگی می‌توانست) */
function ptTherSupAllowed_(chat, uname, r) {
  if (ptIsOwner_(chat, uname)) return true;
  var name = String(r['سوپروایزر مصاحبه'] || '').trim(); if (!name) return false;
  var list = tgApSupList_(r['رویکرد']) || [];
  for (var i = 0; i < list.length; i++) if (list[i].name === name && list[i].chat && ptChats_(list[i].chat).map(String).indexOf(String(chat)) > -1) return true;
  return false;
}
function ptTherSupDone_(chat, what, code, uname) {
  var r = ptTherByCode_(code); if (!r || r['وضعیت'] !== PT_TST.iv) return tgSend_(chat, 'این مصاحبه قبلاً ثبت شده.');
  if (!ptTherSupAllowed_(chat, uname, r)) return null;
  ptSetCell_('ther', r._row, 'وضعیت', what === 'ok' ? PT_TST.ivok : PT_TST.no);
  ptSetCell_('ther', r._row, 'یادداشت ناظر', 'نتیجهٔ مصاحبه: ' + (what === 'ok' ? 'مناسب' : 'نامناسب') + ' · ' + ptNow_());
  var ids = TG_DRY ? (TG_MEM['watchids'] || []) : tgWatchIds_();
  ids.forEach(function (c) { tgSend_(c, '🎤 نتیجهٔ مصاحبهٔ ' + tgEsc_(r['نام']) + ': <b>' + (what === 'ok' ? 'مناسب است' : 'مناسب نیست') + '</b>\nتصمیم نهایی با شماست.', ptTherOwnerKb_(code)); });
  if (what !== 'ok') ptTherMgrSay_(r, 'مصاحبهٔ ' + tgEsc_(r['نام']) + ' انجام شد و این بار همکاری جلو نرفت.');
  return tgSend_(chat, '🙏 ممنون. ثبت شد.');
}
/* درمانگر «فقط همین فضا» با لینک وصل می‌شود */
function ptTherJoin_(chat, uname, arg) {
  var m = String(arg).match(/^ptt-(PT-\d+)-([0-9a-f]{6})$/i);
  if (!m || ptTok_(m[1]) !== m[2]) return tgSend_(chat, 'این لینک معتبر نیست. از مدیر فضا لینک تازه بخواهید.');
  var r = ptTherByCode_(m[1]);
  if (!r || r['وضعیت'] !== PT_TST.ok) return tgSend_(chat, 'این دعوت هنوز فعال نیست.');
  ptSetCell_('ther', r._row, 'chat_id', String(chat));
  if (uname && !r['یوزرنیم']) ptSetCell_('ther', r._row, 'یوزرنیم', uname);
  ptClearCache_();
  var o = ptPlace_(r['شناسه مکان']);
  ptTherMgrSay_(r, '🔗 ' + tgEsc_(r['نام']) + ' به بات وصل شد. حالا از «🔑 دادن اتاق» به او اتاق بدهید.');
  tgSend_(chat, '👋 <b>' + tgEsc_(r['نام']) + '، خوش آمدید.</b>\n\nشما حالا درمانگر فضای ' + tgEsc_(ptName_(o)) + ' در تجربه هستید. از دکمهٔ «' + PT_TH_BTN + '» برنامهٔ اتاقتان و روزهای بستهٔ فضا را می‌بینید. اگر فضا روزی بسته باشد، همین‌جا خبرتان می‌کنیم.');
  return ptTherHome_(chat);
}
function ptTherHome_(chat) {
  var rows = ptRows_('ther').filter(function (t) { return ptSame_(t['chat_id'], chat) && t['وضعیت'] === PT_TST.ok; });
  if (!rows.length) return tgSend_(chat, 'شما در فهرست درمانگرهای فضاهای پارتنر نیستید.');
  var r = rows[0], o = ptPlace_(r['شناسه مکان']);
  var mine = (tgInpData_().hours || []).filter(function (h) { return h.p === r['شناسه مکان'] && tgInpIsMe_(h.who, r['نام']); });
  var t = '🏢 <b>فضای حضوری من</b> · ' + tgEsc_(ptName_(o)) + '\n<i>هر ساعت هر هفته تکرار می‌شود.</i>\n\n';
  t += mine.length ? mine.map(function (h) { return '▫️ ' + tgEsc_(tgInpRowText_(h)); }).join('\n') : 'هنوز اتاق و ساعتی به شما داده نشده. مدیر فضا از میز خودش می‌دهد.';
  var off = ptOffUpcoming_(r['شناسه مکان'], 21);
  if (off.length) t += '\n\n📅 <b>روزهای بستهٔ فضا</b>\n' + off.map(function (x) { return '  ' + tgEsc_(x['تاریخ'] + '، ' + x['روز هفته'] + ' · ' + x['بخش']); }).join('\n');
  return tgSend_(chat, t, ptKb_([[ptB_('💬 پیام به تجربه', 'sy')]]));
}

/* دعوت درمانگرهای تجربهٔ هم‌شهر: پیش‌نمایش برای مدیر، ارسال با پذیرش تجربه */
function ptInviteAsk_(chat) {
  var w = ptMgr_(chat); if (!w) return null;
  var r = ''; try { r = tgPaInvite(w.code, false); } catch (e) { r = String(e); }
  try { tgInpDeskSay_('📣 پارتنر ' + tgEsc_(ptName_(ptPlace_(w.code))) + ' خواسته درمانگرهای تجربهٔ هم‌شهر برای حضوری دعوت شوند.\n' + tgEsc_(r), ptKb_([[ptB_('📨 دعوت را بفرست', 'tj:' + w.code)]])); } catch (e2) {}
  return tgSend_(chat, '📣 درخواست دعوت ثبت شد.\n\n' + tgEsc_(r) + '\n\nپذیرش تجربه فهرست را نگاه می‌کند و دعوت را می‌فرستد. هر کس بخواهد، درخواستش در «🩺 درمانگرهای فضا» برای تأیید شما می‌آید.', ptKb_([ptBack_()]));
}
function ptInviteSend_(chat, uname, code) {
  if (!ptIsBoss_(chat, uname)) return null;
  var r = tgPaInvite(code, true);
  return tgSend_(chat, '✅ ' + tgEsc_(r));
}

/* ═══════════ دادن اتاق به درمانگر (با تأیید پذیرش تجربه) ═══════════ */
function ptGrantStart_(chat) {
  var w = ptMgr_(chat); if (!w) return null;
  var list = ptTherList_(w.code), rooms = ptRoomsOf_(w.code);
  if (!rooms.length) return tgSend_(chat, 'اول در «🚪 اتاق‌ها» دست‌کم یک اتاق تعریف کنید.', ptKb_([[ptB_('🚪 اتاق‌ها', 'rm')], ptBack_()]));
  var st = { f: 'grant', s: 'who', v: { list: list.map(function (x) { return x.name; }) } };
  ptSetState_(chat, st);
  var kb = list.slice(0, 12).map(function (x, i) { return [ptB_((x.kind === PT_KIND_ONLY ? '🏠 ' : '🩺 ') + x.name, 'gw:' + i)]; });
  kb.push([ptB_('✍️ درمانگر دیگری از تجربه (نام را می‌نویسم)', 'gw:x')]);
  kb.push([ptB_('انصراف', 'dk')]);
  return tgSend_(chat, '🔑 <b>دادن اتاق به درمانگر</b>\n<i>اتاق و ساعتی که می‌دهید هر هفته تکرار می‌شود. بعد از تأیید پذیرش تجربه در برنامه می‌نشیند و درمانگر خبردار می‌شود.</i>\n\nبه کدام درمانگر؟', ptKb_(kb));
}
function ptGrantCb_(chat, a, arg) {
  var st = ptState_(chat), w = ptMgr_(chat);
  if (!st || st.f !== 'grant' || !w) return ptDesk_(chat);
  var v = st.v;
  if (a === 'gw') {
    if (arg === 'x') { st.s = 'name'; ptSetState_(chat, st); return tgSend_(chat, 'نام کامل درمانگر تجربه را بنویسید.'); }
    v.who = v.list[Number(arg)]; if (!v.who) return ptGrantStart_(chat);
    return ptGrantAskRoom_(chat, st);
  }
  if (a === 'gm') { var rooms = ptRoomsOf_(w.code); var r = rooms[Number(arg)]; if (!r) return null; v.room = r.room; v.rfrom = tgInpH_(r.from) || 9; v.rto = tgInpH_(r.to) || 21;
    try { v.rdays = tgInpDaysOf_(r.days); } catch (e) { v.rdays = TG_INP_DAYS; }
    st.s = 'day'; ptSetState_(chat, st);
    var kb = [], row = []; v.rdays.forEach(function (d) { row.push(ptB_(d, 'gd:' + TG_INP_DAYS.indexOf(d))); if (row.length === 4) { kb.push(row); row = []; } });
    if (row.length) kb.push(row); kb.push([ptB_('انصراف', 'dk')]);
    return tgSend_(chat, tgEsc_(v.who) + ' · ' + tgEsc_(v.room) + '\n\nکدام روز هفته؟', ptKb_(kb)); }
  if (a === 'gd') { v.day = TG_INP_DAYS[Number(arg)]; st.s = 'from'; ptSetState_(chat, st);
    var kb2 = ptHoursKb_('gf').map(function (row) { return row.filter(function (b) { var h = Number(String(b.callback_data).split(':').pop()); return h >= v.rfrom && h < v.rto; }); }).filter(function (r) { return r.length; });
    kb2.push([ptB_('انصراف', 'dk')]);
    return tgSend_(chat, tgEsc_(v.who) + ' · ' + tgEsc_(v.room) + ' · ' + v.day + '\n\nاز ساعت چند؟\n' + ptBusyLine_(w.code, v.room, v.day), ptKb_(kb2)); }
  if (a === 'gf') { v.from = Number(arg); st.s = 'to'; ptSetState_(chat, st);
    var kb3 = ptHoursKb_('gt', v.from).map(function (row) { return row.filter(function (b) { var h = Number(String(b.callback_data).split(':').pop()); return h <= v.rto; }); }).filter(function (r) { return r.length; });
    kb3.push([ptB_('انصراف', 'dk')]);
    return tgSend_(chat, 'تا ساعت چند؟', ptKb_(kb3)); }
  if (a === 'gt') { v.to = Number(arg); ptSetState_(chat, st);
    var clash = ptClash_(w.code, v.room, v.day, v.from, v.to);
    return tgSend_(chat, '🔑 <b>مرور</b>\n' + tgEsc_(v.who) + '\n' + tgEsc_(v.room) + ' · هر ' + v.day + ' · ' + tgInpHs_(v.from) + ' تا ' + tgInpHs_(v.to) + '\n' +
      (clash ? '\n⚠️ این بازه با ساعت ' + tgEsc_(clash) + ' هم‌پوشانی دارد.\n' : '') + '\nبرای تأیید به پذیرش تجربه بفرستم؟',
      ptKb_([[ptB_('📨 بفرست', 'gs')], [ptB_('انصراف', 'dk')]])); }
  if (a === 'gs') { ptClear_(chat); return ptGrantSend_(chat, w, v); }
  return null;
}
function ptGrantAskRoom_(chat, st) {
  var w = ptMgr_(chat), rooms = ptRoomsOf_(w.code);
  st.s = 'room'; ptSetState_(chat, st);
  var kb = rooms.map(function (r, i) { return [ptB_(r.room + ' · ' + (r.kind || 'بزرگسال') + ' · ' + tgFa_(r.from) + '–' + tgFa_(r.to), 'gm:' + i)]; });
  kb.push([ptB_('انصراف', 'dk')]);
  return tgSend_(chat, tgEsc_(st.v.who) + '\n\nکدام اتاق؟', ptKb_(kb));
}
function ptBusyLine_(code, room, day) {
  var rk = tgInpRoomKey_(room);
  var b = (tgInpData_().hours || []).filter(function (h) { return h.p === code && h.day === day && tgInpRoomKey_(h.room) === rk; });
  return b.length ? 'الان پر: ' + b.map(function (h) { return tgInpSlot_(h) + ' ' + h.who; }).join(' · ') : 'این روز این اتاق هنوز خالی است.';
}
function ptClash_(code, room, day, a, b) {
  var rk = tgInpRoomKey_(room), hit = '';
  (tgInpData_().hours || []).forEach(function (h) {
    if (hit || h.p !== code || h.day !== day || tgInpRoomKey_(h.room) !== rk) return;
    var x = tgInpH_(h.from), y = tgInpH_(h.to);
    if (x != null && y != null && x < b && y > a) hit = tgInpSlot_(h) + ' ' + h.who;
  });
  return hit;
}
/* درخواست در همان تب «درخواست‌های حضوری» می‌نشیند و با همان دکمه‌های iv: پذیرش تأیید می‌شود */
function ptGrantSend_(chat, w, v, del) {
  var o = ptPlace_(w.code), tchat = '';
  try { tchat = tgTherChatByName_(v.who); } catch (e) {}
  if (!tchat) ptRows_('ther').forEach(function (t) { if (!tchat && tgInpIsMe_(t['نام'], v.who) && t['chat_id']) tchat = ptChats_(t['chat_id'])[0]; });
  var id = 'Q' + (TG_DRY ? (TG_MEM['qn'] = (TG_MEM['qn'] || 0) + 1) : Date.now().toString(36));
  var kind = del ? TG_INP_KIND.del : TG_INP_KIND.add;
  var what = ptName_(o) + '، ' + v.room + '، هر ' + v.day + '، ' + tgInpHs_(v.from) + ' تا ' + tgInpHs_(v.to) + ' · ' + v.who;
  var key = del ? v.key : '';
  tgInpTab_(TG_INP_REQ, TG_INP_QHEAD).append([id, ptNow_(), v.who, String(tchat || ''), w.code, kind, v.day, String(v.from), String(v.to), tgInpRoomKey_(v.room), key, '',
    (del ? 'آزادکردن' : 'واگذاری') + ' از میز پارتنر [پارتنر:' + chat + '] · ' + what, 'منتظر پذیرش', '', '']);
  tgInpDeskSay_('🏢 <b>' + (del ? 'آزادکردن ساعت' : 'واگذاری اتاق') + ' · پارتنر ' + tgEsc_(ptName_(o)) + '</b>\n' + tgEsc_(what) + (tchat ? '' : '\n⚠️ درمانگر به بات وصل نیست؛ بعد از تأیید تلفنی خبرش کنید.'),
    ptKb_([[{ text: '✅ تأیید', callback_data: 'iv:y:' + id }, { text: '❌ رد', callback_data: 'iv:n:' + id }]]));
  return tgSend_(chat, '📨 فرستاده شد: ' + tgEsc_(what) + '\n\nبعد از تأیید پذیرش تجربه در برنامه می‌نشیند و هم شما هم درمانگر خبردار می‌شوید.', ptKb_([ptBack_()]));
}
/* بعد از تصمیم پذیرش روی درخواست‌های حضوری (از tgInpVCb_) */
function ptOnInpDecision_(q, yes, note) {
  var m = String(q[12] || '').match(/\[پارتنر:(-?\d+)\]/);
  if (!m) return false;
  tgSend_(m[1], (yes ? '✅ پذیرش تجربه تأیید کرد و در برنامه نشست: ' : 'پذیرش تجربه فعلاً تأیید نکرد: ') + tgEsc_(String(q[12]).replace(/\s*\[پارتنر:-?\d+\]\s*/, ' ')) + (note ? '\n' + tgEsc_(note) : ''),
    ptKb_([[ptB_('🗓 برنامهٔ هفتگی', 'wk')]]));
  ptClearCache_();
  return true;
}
/* آزاد کردن یک ساعت هفتگی */
function ptReleaseStart_(chat) {
  var w = ptMgr_(chat); if (!w) return null;
  var hs = (tgInpData_().hours || []).filter(function (h) { return h.p === w.code; });
  if (!hs.length) return tgSend_(chat, 'ساعتی برای آزاد کردن نیست.', ptKb_([ptBack_()]));
  ptSetState_(chat, { f: 'rel', v: { keys: hs.map(function (h) { return tgInpRowKey_(h); }) } });
  var kb = hs.slice(0, 20).map(function (h, i) { return [ptB_(h.day + ' ' + tgInpSlot_(h) + ' · ' + (h.room || '') + ' · ' + h.who, 'rx:' + i)]; });
  kb.push([ptB_('انصراف', 'wk')]);
  return tgSend_(chat, '➖ کدام ساعت هفتگی آزاد شود؟ (با تأیید پذیرش تجربه)\n\nاگر فقط یک روز خاص است، به‌جای این «📅 بستن یک روز» را بزنید.', ptKb_(kb));
}
function ptReleasePick_(chat, i) {
  var w = ptMgr_(chat), st = ptState_(chat);
  if (!w || !st || st.f !== 'rel') return ptDesk_(chat);
  var key = st.v.keys[Number(i)], h = null;
  (tgInpData_().hours || []).forEach(function (x) { if (!h && tgInpRowKey_(x) === key) h = x; });
  ptClear_(chat);
  if (!h) return tgSend_(chat, 'این ساعت دیگر در برنامه نیست.');
  return ptGrantSend_(chat, w, { who: h.who, room: h.room, day: h.day, from: tgInpH_(h.from), to: tgInpH_(h.to), key: key }, true);
}

/* ═══════════ بستن یک روز (استثنای تک‌روزه) ═══════════ */
function ptDayInfo_(d) {
  var j = tgJalali_(d, TG_TZ);
  var wd = Number(Utilities.formatDate(d, TG_TZ, 'u')); /* ۱ دوشنبه … ۷ یکشنبه */
  var idx = (wd + 1) % 7; /* شنبه = ۰ */
  return { j: j, day: TG_INP_DAYS[idx], label: TG_INP_DAYS[idx] + ' ' + tgFa_(j.d) + ' ' + TG_JMONTHS[j.m - 1], full: tgFa_(j.d) + ' ' + TG_JMONTHS[j.m - 1] + ' ' + tgFa_(j.y), g: Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd') };
}
function ptToday_() { return TG_DRY && TG_MEM.ptnow ? new Date(TG_MEM.ptnow) : new Date(); }
function ptOffStart_(chat) {
  var w = ptWho_(chat); if (!w || w.role === 'درمانگر') return null;
  ptSetState_(chat, { f: 'off', v: {} });
  var kb = [], row = [], now = ptToday_();
  for (var i = 0; i < 14; i++) {
    var d = new Date(now.getTime() + i * 86400000), di = ptDayInfo_(d);
    row.push(ptB_((i === 0 ? 'امروز ' : i === 1 ? 'فردا ' : '') + di.label, 'od:' + di.g));
    if (row.length === 2) { kb.push(row); row = []; }
  }
  if (row.length) kb.push(row);
  kb.push([ptB_('روزهای بستهٔ ثبت‌شده', 'ol')]);
  kb.push([ptB_('انصراف', 'dk')]);
  return tgSend_(chat, '📅 <b>بستن یک روز</b>\n\nکدام روز فضا بسته است؟ فقط همان یک روز بسته می‌شود؛ برنامهٔ هفتگی دست نمی‌خورد.\nاگر روزش در این فهرست نیست، تاریخ را بنویسید، مثل «۱۲ آبان».', ptKb_(kb));
}
function ptOffDate_(chat, g) {
  var st = ptState_(chat); if (!st || st.f !== 'off') return ptOffStart_(chat);
  st.v.g = g; ptSetState_(chat, st);
  var d = new Date(g + 'T12:00:00+03:30'), di = ptDayInfo_(d);
  return tgSend_(chat, '📅 ' + di.label + '\n\nتمام روز بسته است یا فقط بخشی از آن؟', ptKb_([PT_PARTS.slice(0, 2).map(function (p) { return ptB_(p[1], 'op:' + p[0]); }), PT_PARTS.slice(2).map(function (p) { return ptB_(p[1], 'op:' + p[0]); }), [ptB_('انصراف', 'dk')]]));
}
function ptOffPart_(chat, part) {
  var st = ptState_(chat); if (!st || st.f !== 'off') return ptOffStart_(chat);
  st.v.part = part; ptSetState_(chat, st);
  return tgSend_(chat, 'علتش؟', ptKb_(PT_OFF_WHY.map(function (x, i) { return [ptB_(x, 'ow:' + i)]; }).concat([[ptB_('انصراف', 'dk')]])));
}
function ptPartOf_(k) { for (var i = 0; i < PT_PARTS.length; i++) if (PT_PARTS[i][0] === k) return PT_PARTS[i]; return PT_PARTS[0]; }
function ptOffAffected_(code, day, part) {
  var P = ptPartOf_(part), out = [];
  (tgInpData_().hours || []).forEach(function (h) {
    if (h.p !== code || h.day !== day) return;
    var a = tgInpH_(h.from), b = tgInpH_(h.to);
    if (a == null || b == null || (a < P[3] && b > P[2])) if (out.indexOf(h.who) < 0) out.push(h.who);
  });
  return out;
}
function ptOffWhy_(chat, i) {
  var st = ptState_(chat), w = ptWho_(chat); if (!st || st.f !== 'off' || !w) return ptOffStart_(chat);
  st.v.why = PT_OFF_WHY[Number(i)] || PT_OFF_WHY[3]; ptSetState_(chat, st);
  var di = ptDayInfo_(new Date(st.v.g + 'T12:00:00+03:30')), who = ptOffAffected_(w.code, di.day, st.v.part);
  return tgSend_(chat, '📅 <b>مرور</b>\n' + di.full + '، ' + di.day + ' · ' + ptPartOf_(st.v.part)[1] + ' · ' + st.v.why + '\n\n' +
    (who.length ? 'به این درمانگرها خبر می‌دهیم: ' + tgEsc_(who.join('، ')) : 'آن روز درمانگری ساعت ندارد.') + '\nپذیرش تجربه هم خبردار می‌شود.',
    ptKb_([[ptB_('📣 ثبت و خبر بده', 'os')], [ptB_('انصراف', 'dk')]]));
}
function ptOffNextCode_() { var n = 0; ptRows_('off').forEach(function (r) { var m = String(r['کد']).match(/(\d+)/); if (m && Number(m[1]) > n) n = Number(m[1]); }); return 'OFF-' + (n + 1); }
function ptOffSave_(chat, uname) {
  var st = ptState_(chat), w = ptWho_(chat); if (!st || st.f !== 'off' || !w) return ptOffStart_(chat);
  ptClear_(chat);
  var v = st.v, di = ptDayInfo_(new Date(v.g + 'T12:00:00+03:30')), o = ptPlace_(w.code), who = ptOffAffected_(w.code, di.day, v.part);
  var code = ptOffNextCode_(), me = uname || String(chat), told = [];
  var text = '📅 <b>' + tgEsc_(ptName_(o)) + '، ' + di.full + ' (' + di.day + ') · ' + ptPartOf_(v.part)[1] + ' بسته است.</b>\nعلت: ' + tgEsc_(v.why) +
    '\n\nاگر آن روز جلسهٔ حضوری دارید، لطفاً مراجع را خبر کنید و جلسه را آنلاین برگزار کنید یا جابه‌جا کنید. پذیرش تجربه هم در جریان است.\n<i>فقط همین یک روز است؛ برنامهٔ هفتگی شما سر جایش است.</i>';
  who.forEach(function (n) {
    var c = ''; try { c = tgTherChatByName_(n); } catch (e) {}
    if (!c) ptRows_('ther').forEach(function (t) { if (!c && tgInpIsMe_(t['نام'], n) && t['chat_id']) c = ptChats_(t['chat_id'])[0]; });
    if (c) { tgSend_(c, text, ptKb_([[ptB_('👍 دیدم', 'ok:' + code)]])); told.push(n); }
  });
  ptTab_('off').append([code, w.code, di.full, di.day, v.g, ptPartOf_(v.part)[1], v.why, me, ptNow_(), told.join('، '), '', PT_OFF_ON]);
  var miss = who.filter(function (n) { return told.indexOf(n) < 0; });
  try { tgInpDeskSay_('📅 <b>روز بسته · ' + tgEsc_(ptName_(o)) + '</b>\n' + di.full + '، ' + di.day + ' · ' + ptPartOf_(v.part)[1] + ' · ' + tgEsc_(v.why) + '\n' +
    (told.length ? 'خبر رفت به: ' + tgEsc_(told.join('، ')) + '\n' : '') + (miss.length ? '⚠️ به بات وصل نیستند، تلفنی خبر کنید: ' + tgEsc_(miss.join('، ')) : '')); } catch (e2) {}
  return tgSend_(chat, '✅ ثبت شد. ' + (told.length ? tgFa_(told.length) + ' درمانگر خبردار شدند.' : '') + (miss.length ? '\nپذیرش تجربه به ' + tgEsc_(miss.join('، ')) + ' تلفنی خبر می‌دهد.' : ''), ptKb_([ptBack_()]));
}
function ptOffSeen_(chat, code) {
  var rows = ptRows_('off');
  for (var i = 0; i < rows.length; i++) if (rows[i]['کد'] === code) {
    var cur = rows[i]['دیدند'], me = String(chat);
    if (cur.indexOf(me) < 0) ptSetCell_('off', rows[i]._row, 'دیدند', cur ? cur + '، ' + me : me);
  }
  return tgSend_(chat, '🙏 ممنون.');
}
function ptOffUpcoming_(code, days) {
  var now = ptToday_(), a = Utilities.formatDate(now, TG_TZ, 'yyyy-MM-dd'), b = Utilities.formatDate(new Date(now.getTime() + days * 86400000), TG_TZ, 'yyyy-MM-dd');
  return ptRows_('off').filter(function (r) { return r['شناسه مکان'] === code && r['وضعیت'] === PT_OFF_ON && r['تاریخ میلادی'] >= a && r['تاریخ میلادی'] <= b; })
    .sort(function (x, y) { return x['تاریخ میلادی'] < y['تاریخ میلادی'] ? -1 : 1; });
}
function ptOffList_(chat) {
  var w = ptWho_(chat); if (!w) return null;
  ptClear_(chat);
  var list = ptOffUpcoming_(w.code, 120);
  var t = '📅 <b>روزهای بستهٔ پیش رو</b>\n\n' + (list.length ? list.map(function (x) { return '▫️ ' + tgEsc_(x['تاریخ'] + '، ' + x['روز هفته'] + ' · ' + x['بخش'] + ' · ' + x['علت']); }).join('\n') : 'روز بسته‌ای ثبت نشده.');
  var kb = list.slice(0, 10).map(function (x) { return [ptB_('↺ باز شد: ' + x['تاریخ'], 'ox:' + x['کد'])]; });
  kb.push([ptB_('📅 بستن یک روز دیگر', 'of')]); kb.push(ptBack_());
  return tgSend_(chat, t, ptKb_(kb));
}
function ptOffCancel_(chat, code) {
  var w = ptWho_(chat); if (!w) return null;
  var rows = ptRows_('off'), r = null;
  rows.forEach(function (x) { if (x['کد'] === code && x['شناسه مکان'] === w.code) r = x; });
  if (!r) return ptOffList_(chat);
  ptSetCell_('off', r._row, 'وضعیت', PT_OFF_X);
  var o = ptPlace_(w.code), msg = '🔓 ' + tgEsc_(ptName_(o)) + '، ' + tgEsc_(r['تاریخ']) + ' دیگر بسته نیست و طبق برنامهٔ همیشگی باز است.';
  String(r['خبر به']).split(/\s*،\s*/).filter(String).forEach(function (n) { var c = ''; try { c = tgTherChatByName_(n); } catch (e) {} if (c) tgSend_(c, msg); });
  try { tgInpDeskSay_(msg); } catch (e2) {}
  tgSend_(chat, '✅ ثبت شد و خبر رفت.');
  return ptOffList_(chat);
}
/* تاریخ نوشتاری: «۱۲ آبان» یا «1405/08/12» */
function ptParseJDate_(text) {
  var s = String(tgLatinDigits_(text || '')).trim(), jy = null, jm = null, jd = null;
  var m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) { jy = Number(m[1]); jm = Number(m[2]); jd = Number(m[3]); }
  else {
    for (var i = 0; i < TG_JMONTHS.length; i++) {
      var r = new RegExp('(\\d{1,2})\\s*' + TG_JMONTHS[i]);
      var mm = s.match(r); if (mm) { jd = Number(mm[1]); jm = i + 1; var yy = s.match(/(\d{4})/); if (yy) jy = Number(yy[1]); break; }
    }
  }
  if (!jm || !jd) return null;
  var today = tgJalali_(ptToday_(), TG_TZ);
  if (!jy) jy = (jm < today.m || (jm === today.m && jd < today.d)) ? today.y + 1 : today.y;
  var g = tgJ2G_(jy, jm, jd);
  if (!g || isNaN(g.getTime && g.getTime())) return null;
  return Utilities.formatDate(g, TG_TZ, 'yyyy-MM-dd');
}

/* ═══════════ مراجعان (بی‌نام) ═══════════ */
function ptClients_(chat) {
  var w = ptWho_(chat); if (!w) return null;
  var o = ptPlace_(w.code), lab = '', out = [];
  try { var p = tgInpPlace_(w.code); lab = p ? tgInpLabel_(p) : (o ? o['شهر'] : ''); } catch (e) { lab = o ? o['شهر'] : ''; }
  try {
    var leads = TG_DRY ? (TG_MEM['ptleads'] || []) : ptLeadRows_();
    leads.forEach(function (l) { if (lab && String(l.mode || '').indexOf(lab) > -1) out.push(l); });
  } catch (e2) {}
  var t = '🙋 <b>مراجعان حضوری فضای شما</b>\n<i>نام مراجع برای حفظ حریم خصوصی فقط نزد تجربه می‌ماند؛ اینجا هر مراجع یک کد دارد.</i>\n\n';
  if (!out.length) t += 'هنوز مراجعی برای فضای شما ثبت نشده. وقتی پذیرش تجربه مراجعی را برای حضوری در فضای شما هماهنگ کند، اینجا دیده می‌شود.';
  else {
    var started = out.filter(function (l) { return /بله/.test(l.start); }).length;
    t += tgFa_(out.length) + ' درخواست حضوری · ' + tgFa_(started) + ' شروع درمان\n\n';
    t += out.slice(-12).reverse().map(function (l) { return '▫️ <code>' + tgEsc_(l.code || '—') + '</code> · ' + tgEsc_(l.date) + ' · ' + tgEsc_(l.stage) + (l.ther ? ' · ' + tgEsc_(l.ther) : ''); }).join('\n');
  }
  return tgSend_(chat, t, ptKb_([ptBack_()]));
}
function ptLeadRows_() {
  var sh = tgSS_().getSheetByName(TG_LEADS);
  if (!sh || sh.getLastRow() < 2) return [];
  var lc = sh.getLastColumn(), hd = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (x) { return String(x).trim(); });
  var ix = function (n) { return hd.indexOf(n); };
  var cM = ix('حالت جلسه'), cC = ix('کد لید'), cS = ix('وضعیت'), cT = ix('درمانگر معارفه'), cW = ix('شروع درمان؟'), cD = ix('تاریخ شمسی');
  if (cM < 0) return [];
  var n = Math.min(sh.getLastRow() - 1, 600), start = sh.getLastRow() - n + 1;
  return sh.getRange(start, 1, n, lc).getDisplayValues().filter(function (r) { return /حضوری|·/.test(String(r[cM])); }).map(function (r) {
    return { mode: r[cM], code: cC > -1 ? r[cC] : '', stage: (cS > -1 ? r[cS] : '') || 'جدید', ther: cT > -1 ? r[cT] : '', start: cW > -1 ? r[cW] : '', date: cD > -1 ? r[cD] : r[0] };
  });
}

/* ═══════════ تیم فضا ═══════════ */
function ptTeam_(chat) {
  var w = ptMgr_(chat); if (!w) return ptDesk_(chat);
  var o = ptPlace_(w.code), staff = ptRows_('staff').filter(function (s) { return s['شناسه مکان'] === w.code && s['وضعیت'] !== 'غیرفعال'; });
  var t = '👥 <b>تیم فضای شما</b>\n\n▫️ ' + tgEsc_(o['مسئول'] || 'مدیر') + ' · مدیر (مسئول اصلی)\n';
  staff.forEach(function (s) { t += '▫️ ' + tgEsc_(s['نام'] || s['یوزرنیم']) + ' · ' + tgEsc_(s['نقش']) + '\n'; });
  t += '\nبرای اضافه کردن همکار، لینک زیر را برایش بفرستید. با باز کردن لینک، به میز فضای شما وصل می‌شود:\n\n';
  t += '🙋 <b>پذیرش یا منشی</b> (برنامه، روز بسته، مراجعان):\n' + ptLink_('pts-' + w.code + '-p-' + ptTok_(w.code + '|p')) + '\n\n';
  t += '🧑‍💼 <b>مدیر دوم</b> (همه‌چیز):\n' + ptLink_('pts-' + w.code + '-m-' + ptTok_(w.code + '|m'));
  var kb = staff.slice(0, 8).map(function (s) { return [ptB_('✖️ برداشتن ' + String(s['نام'] || s['یوزرنیم']).slice(0, 20), 'tx:' + s._row)]; });
  kb.push(ptBack_());
  return tgSend_(chat, t, ptKb_(kb));
}
function ptStaffJoin_(chat, uname, name, arg) {
  var m = String(arg).match(/^pts-([a-z0-9\-]+)-([mp])-([0-9a-f]{6})$/i);
  if (!m || ptTok_(m[1] + '|' + m[2]) !== m[3]) return tgSend_(chat, 'این لینک معتبر نیست. از مدیر فضا لینک تازه بخواهید.');
  var o = ptPlace_(m[1]); if (!o) return tgSend_(chat, 'این فضا پیدا نشد.');
  var role = PT_ROLE[m[2]], rows = ptRows_('staff'), have = null;
  rows.forEach(function (s) { if (s['شناسه مکان'] === m[1] && ptSame_(s['chat_id'], chat)) have = s; });
  if (have) { ptSetCell_('staff', have._row, 'نقش', role); ptSetCell_('staff', have._row, 'وضعیت', 'فعال'); }
  else ptTab_('staff').append([m[1], name || '', role, uname || '', String(chat), 'فعال', ptNow_(), 'لینک دعوت', '']);
  ptClearCache_();
  try { tgPtStaffLink_(m[1], role, name || uname || '', chat); } catch (ePl) { tgErr_('ptStaffJoin_ link', ePl); }
  try { if (o['chat_id مسئول']) tgSend_(ptChats_(o['chat_id مسئول'])[0], '👥 ' + tgEsc_(name || uname) + ' با نقش «' + role + '» به میز فضای شما وصل شد.'); } catch (e) {}
  try { tgInpDeskSay_('👥 ' + tgEsc_(name || uname) + ' با نقش «' + role + '» به تیم پارتنر ' + tgEsc_(ptName_(o)) + ' وصل شد.'); } catch (e2) {}
  tgSend_(chat, '👋 <b>خوش آمدید.</b> شما حالا «' + role + '» فضای ' + tgEsc_(ptName_(o)) + ' در تجربه هستید.\n\nهر وقت خواستید دکمهٔ «' + TG_PA_BTN + '» را بزنید.', { keyboard: [[TG_PA_BTN]], resize_keyboard: true });
  return ptDesk_(chat);
}
function ptStaffDrop_(chat, row) {
  var w = ptMgr_(chat); if (!w) return null;
  var s = ptRows_('staff')[Number(row) - 2];
  if (!s || s['شناسه مکان'] !== w.code) return ptTeam_(chat);
  ptSetCell_('staff', s._row, 'وضعیت', 'غیرفعال');
  ptClearCache_();
  return ptTeam_(chat);
}

/* ═══════════ تکمیل صفحهٔ سایت (گروه‌بندی‌شده) ═══════════ */
var PT_WHY_PAGE = 'صفحهٔ فضای شما روی سایت تجربه از همین جواب‌ها ساخته می‌شود. مراجع پیش از تصمیم دقیقاً همین‌ها را می‌خواند و گوگل هم از همین‌ها می‌فهمد فضای شما کجاست و برای چه کسی است. <b>هرچه کامل‌تر و با جزئیات‌تر، درخواست بیشتر.</b>';
function ptFill_(chat) {
  ptClear_(chat);
  var w = ptMgr_(chat); if (!w) return ptDesk_(chat);
  var o = ptPlace_(w.code), F = ptFieldsFor_(o), pct = ptPct_(o);
  if (!o['کشور']) {
    return tgSend_(chat, '🌐 <b>تکمیل صفحهٔ سایت</b>\n\nاول بگویید فضای شما کجاست تا پرسش‌ها مناسب همان‌جا باشد:', ptKb_([[ptB_('🇮🇷 ایران', 'cy:ایران'), ptB_('🌍 خارج از ایران', 'cy:x')], ptBack_()]));
  }
  var t = '🌐 <b>تکمیل صفحهٔ سایت</b> · ' + tgEsc_(ptName_(o)) + '\n' + ptBar_(pct) + ' ' + tgFa_(pct) + '٪\n\n' + PT_WHY_PAGE + '\n\nهر بخش را بزنید و پرسش‌ها یکی‌یکی می‌آید. هر جا خواستید رها کنید و بعد ادامه بدهید.\n';
  var kb = [];
  PT_GROUPS.forEach(function (g) {
    var fs = F.filter(function (f) { return f.g === g[0]; }); if (!fs.length) return;
    var done = fs.filter(function (f) { return String(o[f.col] || '').trim(); }).length;
    kb.push([ptB_((done === fs.length ? '✅ ' : '▫️ ') + g[1] + ' · ' + tgFa_(done) + '/' + tgFa_(fs.length), 'fg:' + g[0])]);
  });
  var miss = F.filter(function (f) { return !String(o[f.col] || '').trim(); });
  if (miss.length) kb.unshift([ptB_('▶️ ادامه از اولین جای خالی', 'fn')]);
  kb.push([ptB_('🌍 کشور: ' + o['کشور'], 'cy:?')]);
  kb.push(ptBack_());
  return tgSend_(chat, t, ptKb_(kb));
}
function ptCountry_(chat, v) {
  var w = ptMgr_(chat); if (!w) return null;
  var o = ptPlace_(w.code);
  if (v === '?') return tgSend_(chat, 'کشور فضای شما؟', ptKb_([[ptB_('🇮🇷 ایران', 'cy:ایران'), ptB_('🌍 خارج از ایران', 'cy:x')]]));
  if (v === 'x') { ptSetState_(chat, { f: 'cty' }); return tgSend_(chat, 'نام کشور را بنویسید. مثال: اتریش، آلمان، کانادا.', ptKb_([[ptB_('انصراف', 'fl')]])); }
  tgPaSet_(o._row, 'کشور', v);
  return ptFill_(chat);
}
function ptFillAsk_(chat, st) {
  var w = ptMgr_(chat), o = ptPlace_(w.code), F = ptFieldsFor_(o);
  var f = null; F.forEach(function (x) { if (x.k === st.k) f = x; });
  if (!f) return ptFill_(chat);
  var ab = ptAbroad_(o), now = String(o[f.col] || '').trim(), g = null;
  PT_GROUPS.forEach(function (x) { if (x[0] === f.g) g = x; });
  var t = (g ? g[1] + '\n\n' : '') + '✍️ <b>' + tgEsc_(f.col) + '</b>\n' + tgEsc_(ab && f.qab ? f.qab : f.q) + (f.why ? '\n\n<i>' + tgEsc_(f.why) + '</i>' : '') + (now ? '\n\nالان ثبت شده: ' + tgEsc_(now.slice(0, 300)) : '');
  return tgSend_(chat, t, ptKb_([[ptB_('⏭ بعدی', 'fx'), ptB_('✋ بس است', 'fl')]]));
}
function ptFillNextKey_(o, g, after) {
  var F = ptFieldsFor_(o).filter(function (f) { return !g || f.g === g; }), seen = !after;
  for (var i = 0; i < F.length; i++) {
    if (seen && (g || !String(o[F[i].col] || '').trim())) return F[i].k;
    if (F[i].k === after) seen = true;
  }
  return '';
}
function ptFillGo_(chat, g, after) {
  var w = ptMgr_(chat); if (!w) return null;
  var o = ptPlace_(w.code), k = ptFillNextKey_(o, g, after);
  if (!k) { ptClear_(chat); tgSend_(chat, g ? '✅ این بخش تمام شد.' : '✅ همه‌چیز پر شده. ممنون.'); return ptFill_(chat); }
  var st = { f: 'fill', g: g || '', k: k }; ptSetState_(chat, st);
  return ptFillAsk_(chat, st);
}
function ptFillSave_(chat, st, text, photo) {
  var w = ptMgr_(chat); if (!w) return null;
  var o = ptPlace_(w.code), f = null;
  PT_FIELDS.forEach(function (x) { if (x.k === st.k) f = x; });
  if (!f) return ptFill_(chat);
  var val = String(text || '').trim();
  if (photo) {
    val = (String(o[f.col] || '').trim() ? o[f.col] + '\n' : '') + 'tg:photo:' + photo;
    tgPaSet_(o._row, f.col, val);
    tgSend_(chat, '📸 عکس رسید. اگر عکس دیگری هم هست بفرستید، وگرنه «⏭ بعدی».', ptKb_([[ptB_('⏭ بعدی', 'fx')]]));
    return true;
  }
  if (val.length < 2) return tgSend_(chat, 'کمی کامل‌تر بنویسید.');
  tgPaSet_(o._row, f.col, val);
  var o2 = ptPlace_(w.code), pct = ptPct_(o2);
  tgPaSet_(o2._row, 'درصد تکمیل', tgFa_(pct) + '٪');
  if (pct === 100) { try { tgInpDeskSay_('🌐 پارتنر ' + tgEsc_(ptName_(o2)) + ' صفحهٔ سایتش را کامل کرد. آمادهٔ بازبینی و انتشار است.'); } catch (e) {} }
  return ptFillGo_(chat, st.g, st.k);
}

/* ═══════════ مدارک (اختیاری، درایو محرمانه) ═══════════ */
function ptDocs_(chat) {
  ptClear_(chat);
  var w = ptMgr_(chat); if (!w) return ptDesk_(chat);
  var o = ptPlace_(w.code), list = PT_DOCS[ptAbroad_(o) ? 'ab' : 'ir'], have = ptDocHave_(w.code);
  var t = '📁 <b>مدارک فضا</b> · اختیاری\n\nاگر بخواهید، این‌ها را بفرستید. در درایو محرمانهٔ تجربه نگه داشته می‌شود و فقط مدیر تجربه به آن دسترسی دارد. روی سایت هیچ‌کدام منتشر نمی‌شود؛ فقط نشان «فضای بررسی‌شده» کنار نام شما می‌آید.\n\n';
  var kb = list.map(function (d, i) { return [ptB_((have[d] ? '✅ ' : '▫️ ') + d, 'du:' + i)]; });
  kb.push(ptBack_());
  return tgSend_(chat, t, ptKb_(kb));
}
function ptDocAsk_(chat, i) {
  var w = ptMgr_(chat); if (!w) return null;
  var o = ptPlace_(w.code), d = PT_DOCS[ptAbroad_(o) ? 'ab' : 'ir'][Number(i)]; if (!d) return ptDocs_(chat);
  ptSetState_(chat, { f: 'doc', d: d });
  return tgSend_(chat, '📎 «' + tgEsc_(d) + '» را به شکل عکس یا فایل PDF همین‌جا بفرستید.', ptKb_([[ptB_('انصراف', 'dc')]]));
}
function ptDocHave_(code) {
  var out = {};
  try { ptDocRows_().forEach(function (r) { if (r[1] === code) out[r[3]] = 1; }); } catch (e) {}
  return out;
}
function ptPrivBook_() { return tgFinSS_(); }
function ptPrivTab_(name, head) {
  if (TG_DRY) { var k = 'priv:' + name; TG_MEM[k] = TG_MEM[k] || []; var T = TG_MEM[k]; return { rows: function () { return T.slice(); }, append: function (r) { T.push(r); } }; }
  var ss = ptPrivBook_(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.setRightToLeft(true); sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return { rows: function () { var n = sh.getLastRow() - 1; return n > 0 ? sh.getRange(2, 1, n, head.length).getDisplayValues() : []; }, append: function (r) { sh.appendRow(r); } };
}
function ptDocRows_() { return ptPrivTab_(PT_DOC_TAB, PT_DOC_HEAD).rows(); }
function ptDocFolder_(code, title) {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty(PT_DOC_DIR), root;
  if (id) { try { root = DriveApp.getFolderById(id); } catch (e) { root = null; } }
  if (!root) { root = DriveApp.createFolder('تجربه پارتنرز · مدارک (محرمانه)'); props.setProperty(PT_DOC_DIR, root.getId()); }
  var nm = code + ' · ' + (title || ''), it = root.getFoldersByName(nm);
  return it.hasNext() ? it.next() : root.createFolder(nm);
}
function ptDocSave_(chat, st, m) {
  var w = ptMgr_(chat); if (!w) return null;
  var o = ptPlace_(w.code), fid = '', fname = '';
  if (m.photo && m.photo.length) { fid = m.photo[m.photo.length - 1].file_id; fname = st.d + '.jpg'; }
  else if (m.document) { fid = m.document.file_id; fname = m.document.file_name || (st.d + '.pdf'); }
  if (!fid) return tgSend_(chat, 'عکس یا فایل PDF بفرستید.');
  var url = '';
  if (!TG_DRY) {
    try { var f = tgTgFile_(fid); var file = ptDocFolder_(w.code, ptName_(o)).createFile(f.blob.setName(ptName_(o) + ' · ' + st.d + ' · ' + fname)); url = file.getUrl(); }
    catch (e) { console.error('ptDocSave_: ' + e); }
  }
  ptPrivTab_(PT_DOC_TAB, PT_DOC_HEAD).append([ptNow_(), w.code, ptName_(o), st.d, fname, url, fid, String(chat), '']);
  ptClear_(chat);
  tgSend_(chat, '✅ «' + tgEsc_(st.d) + '» رسید و محرمانه نگه داشته شد. ممنون.');
  return ptDocs_(chat);
}
/* ناظر: دیدن مدارک یک فضا */
function ptDocsOwner_(chat, uname, code) {
  if (!ptIsOwner_(chat, uname)) return tgSend_(chat, 'مدارک پارتنرها فقط برای مدیر تجربه است.');
  var o = ptPlace_(code), rows = ptDocRows_().filter(function (r) { return r[1] === code; });
  var t = '📁 <b>مدارک ' + tgEsc_(ptName_(o) || code) + '</b>\n\n' + (rows.length ? rows.map(function (r, i) { return tgFa_(i + 1) + '. ' + tgEsc_(r[3]) + ' · ' + tgEsc_(r[0]) + (r[5] ? '\n   ' + r[5] : ''); }).join('\n') : 'هنوز مدرکی نفرستاده.');
  var kb = rows.slice(0, 8).map(function (r, i) { return [ptB_('📎 بفرست: ' + String(r[3]).slice(0, 26), 'dg:' + code + ':' + i)]; });
  kb.push([ptB_('↩️ ' + (ptName_(o) || code), 'hp:' + code)]);
  return tgSend_(chat, t, ptKb_(kb));
}
function ptDocGet_(chat, uname, code, i) {
  if (!ptIsOwner_(chat, uname)) return null;
  var r = ptDocRows_().filter(function (x) { return x[1] === code; })[Number(i)];
  if (!r || !r[6]) return tgSend_(chat, 'فایل پیدا نشد.');
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'doc', chat: String(chat), fid: r[6] }); return null; }
  var body = { chat_id: chat, caption: r[3] + ' · ' + r[2], document: r[6] };
  var res = tgApi_('sendDocument', body);
  if (!res || res.getResponseCode() !== 200) { delete body.document; body.photo = r[6]; tgApi_('sendPhoto', body); }
  return null;
}

/* ═══════════ سهم پارتنر (فقط ناظر تعیین می‌کند، در دفتر مالی) ═══════════ */
function ptShareOf_(code) {
  var hit = '';
  try {
    var rows = ptPrivTab_(PT_SHARE_TAB, PT_SHARE_HEAD).rows();
    rows.forEach(function (r) { if (r[0] === code && r[2]) hit = String(r[2]).replace(/[^\d۰-۹]/g, ''); });
  } catch (e) {}
  return hit ? Number(tgLatinDigits_(hit)) : 0;
}
function ptShareAsk_(chat, uname, code) {
  if (!ptIsOwner_(chat, uname)) return tgSend_(chat, 'سهم پارتنر را فقط مدیر تجربه تعیین می‌کند.');
  var cur = ptShareOf_(code), o = ptPlace_(code);
  return tgSend_(chat, '💼 <b>سهم ' + tgEsc_(ptName_(o) || code) + '</b>\nالان: ' + (cur ? tgFa_(cur) + '٪' : 'تعیین نشده') + '\n\nاین عدد فقط در دفتر مالی شما نوشته می‌شود و خود پارتنر در میزش می‌بیند؛ جای دیگری نمی‌رود.',
    ptKb_([PT_SHARES.slice(0, 3).map(function (n) { return ptB_(tgFa_(n) + '٪', 'ps:' + code + ':' + n); }), PT_SHARES.slice(3).map(function (n) { return ptB_(tgFa_(n) + '٪', 'ps:' + code + ':' + n); }), [ptB_('↩️ ' + (ptName_(o) || code), 'hp:' + code)]]));
}
function ptShareSet_(chat, uname, code, n) {
  if (!ptIsOwner_(chat, uname)) return null;
  n = Number(n); if (PT_SHARES.indexOf(n) < 0) return null;
  var o = ptPlace_(code);
  ptPrivTab_(PT_SHARE_TAB, PT_SHARE_HEAD).append([code, ptName_(o), String(n), ptNow_(), uname || String(chat), '']);
  if (o && o['chat_id مسئول']) tgSend_(ptChats_(o['chat_id مسئول'])[0], '💼 سهم فضای شما طبق قرارداد: <b>' + tgFa_(n) + '٪</b> از هر جلسه‌ای که در فضای شما برگزار می‌شود. این عدد را فقط شما در میز خودتان می‌بینید.');
  tgSend_(chat, '✅ سهم ' + tgEsc_(ptName_(o)) + ' شد ' + tgFa_(n) + '٪ و به خودش خبر رفت.');
  return ptHubPlace_(chat, uname, code);
}

/* ═══════════ نمای پذیرش و ناظر ═══════════ */
function ptHub_(chat, uname) {
  ptClear_(chat);
  var rows = tgPaRows_(), t = '🏢 <b>تجربه پارتنرز</b> · نمای پذیرش\n\n', kb = [];
  if (!rows.length) t += 'هنوز پارتنری ثبت نشده.';
  rows.forEach(function (o) {
    var code = o['شناسه مکان'], st = ptDeskStats_(code), pct = ptPct_(o);
    t += '▫️ <b>' + tgEsc_(o['شهر']) + '</b> · ' + tgEsc_(ptName_(o)) + '\n   ' + tgEsc_(o['وضعیت'] || 'در انتظار تأیید') + ' · صفحه ' + tgFa_(pct) + '٪ · ' + tgFa_(st.rooms) + ' اتاق · ' + tgFa_(st.hours) + ' ساعت · ' + tgFa_(st.ther) + ' درمانگر' +
      (st.soon ? ' · 📅 ' + tgFa_(st.soon) + ' روز بسته' : '') + (o['chat_id مسئول'] ? '' : ' · ⚠️ به بات وصل نیست') + ' · 🧭 ' + tgFa_(ptReadyN_(code).ok) + '/' + tgFa_(ptReadyN_(code).all) + '\n';
    kb.push([ptB_('🏠 ' + o['شهر'] + ' · ' + ptName_(o), 'hp:' + code)]);
  });
  var pend = ptRows_('ther').filter(function (x) { return x['وضعیت'] === PT_TST.wait || x['وضعیت'] === PT_TST.ivok; });
  if (pend.length) { t += '\n⏳ <b>درمانگر فضای پارتنر منتظر تصمیم ناظر:</b> ' + tgEsc_(pend.map(function (x) { return x['نام']; }).join('، ')); kb.push([ptB_('⏳ درمانگرهای منتظر تأیید', 'hq')]); }
  var q = tgInpTab_(TG_INP_REQ, TG_INP_QHEAD).rows().filter(function (r) { return r[13] === 'منتظر پذیرش' && String(r[12]).indexOf('[پارتنر:') > -1; });
  if (q.length) t += '\n🔑 ' + tgFa_(q.length) + ' واگذاری یا آزادکردن اتاق منتظر تأیید پذیرش (کارتش در پیام‌های پذیرش آمده).';
  if (ptIsOwner_(chat, uname)) kb.push([ptB_('📣 یادآوری تکمیل صفحه به همهٔ پارتنرها', 'nz')]);
  return tgSend_(chat, t, ptKb_(kb));
}
function ptHubPlace_(chat, uname, code) {
  var o = ptPlace_(code); if (!o) return ptHub_(chat, uname);
  var st = ptDeskStats_(code), pct = ptPct_(o), owner = ptIsOwner_(chat, uname);
  var staff = ptRows_('staff').filter(function (s) { return s['شناسه مکان'] === code && s['وضعیت'] !== 'غیرفعال'; });
  var t = '🏠 <b>' + tgEsc_(ptName_(o)) + '</b> · ' + tgEsc_(o['شهر']) + (o['کشور'] ? ' · ' + tgEsc_(o['کشور']) : '') + '\n\n' +
    'وضعیت: ' + tgEsc_(o['وضعیت'] || '—') + '\nمدیر: ' + tgEsc_(o['مسئول'] || '—') + (o['chat_id مسئول'] ? '' : ' (به بات وصل نیست)') + '\n' +
    ptContacts_(code).slice(0, 3).map(function (x) { return '   ' + (x.uname ? '@' + tgEsc_(x.uname) + ' · ' : '') + '<code>' + tgEsc_(x.chat) + '</code> · ' + tgEsc_(x.role); }).join('\n') + (ptContacts_(code).length ? '\n' : '') +
    '🧭 آمادگی فعال‌سازی: ' + tgFa_(ptReadyN_(code).ok) + ' از ' + tgFa_(ptReadyN_(code).all) + (o['لینک صفحه'] ? '\n🌐 ' + tgEsc_(o['لینک صفحه']) : '') + '\n' +
    (staff.length ? 'تیم: ' + tgEsc_(staff.map(function (s) { return (s['نام'] || s['یوزرنیم']) + ' (' + s['نقش'] + ')'; }).join('، ')) + '\n' : '') +
    'صفحهٔ سایت: ' + ptBar_(pct) + ' ' + tgFa_(pct) + '٪\nقواعد: ' + (o['قواعد را پذیرفت'] === 'بله' ? 'پذیرفته' : 'هنوز نه') + '\n' +
    '🗓 ' + tgFa_(st.rooms) + ' اتاق · ' + tgFa_(st.hours) + ' ساعت هفتگی · ' + tgFa_(st.ther) + ' درمانگر\n';
  if (owner) { var sh = ptShareOf_(code); t += '💼 سهم: ' + (sh ? tgFa_(sh) + '٪' : 'تعیین نشده') + '\n'; }
  var miss = ptFieldsFor_(o).filter(function (f) { return !String(o[f.col] || '').trim(); }).map(function (f) { return f.col; });
  if (miss.length) t += '\nهنوز خالی: ' + tgEsc_(miss.join('، '));
  var kb = [[ptB_('💬 پیام به مدیر فضا', 'mg:' + code), ptB_('📇 تماس و آیدی', 'ct:' + code)]];
  if (ptContacts_(code).length > 1) kb.push([ptB_('💬 پیام به همهٔ تیم فضا', 'mt:' + code)]);
  kb.push([ptB_('🧭 چک‌لیست فعال‌سازی', 'ry:' + code), ptB_('📣 یادآوری تکمیل صفحه', 'nz:' + code)]);
  kb.push([ptB_('🗓 برنامهٔ هفتگی', 'hw:' + code), ptB_('📅 روزهای بسته', 'hf:' + code)]);
  if (owner) kb.push([ptB_('💼 سهم پارتنر', 'pp:' + code), ptB_('📁 مدارک', 'dv:' + code)]);
  kb.push([ptB_('↩️ همهٔ فضاها', 'hb')]);
  return tgSend_(chat, t, ptKb_(kb));
}
function ptHubOff_(chat, code) {
  var o = ptPlace_(code), list = ptOffUpcoming_(code, 120);
  return tgSend_(chat, '📅 <b>روزهای بستهٔ ' + tgEsc_(ptName_(o)) + '</b>\n\n' + (list.length ? list.map(function (x) { return '▫️ ' + tgEsc_(x['تاریخ'] + '، ' + x['روز هفته'] + ' · ' + x['بخش'] + ' · ' + x['علت'] + (x['خبر به'] ? ' · خبر به: ' + x['خبر به'] : '')); }).join('\n') : 'چیزی ثبت نشده.'),
    ptKb_([[ptB_('↩️ ' + ptName_(o), 'hp:' + code)]]));
}
function ptHubQueue_(chat, uname) {
  var pend = ptRows_('ther').filter(function (x) { return x['وضعیت'] === PT_TST.wait || x['وضعیت'] === PT_TST.ivok || x['وضعیت'] === PT_TST.iv; });
  if (!pend.length) return tgSend_(chat, 'درمانگری منتظر نیست.');
  var owner = ptIsOwner_(chat, uname);
  pend.slice(0, 6).forEach(function (r) { tgSend_(chat, ptTherCard_(r), owner && r['وضعیت'] !== PT_TST.iv ? ptTherOwnerKb_(r['کد']) : null); });
  return null;
}

/* ═══════════ یادآوری تکمیل صفحه (با اجازهٔ ناظر، دستی) ═══════════ */
function ptNudgeText_(o) {
  var pct = ptPct_(o), miss = ptFieldsFor_(o).filter(function (f) { return !String(o[f.col] || '').trim(); });
  var groups = {}; miss.forEach(function (f) { groups[f.g] = 1; });
  var gl = PT_GROUPS.filter(function (g) { return groups[g[0]]; }).map(function (g) { return g[1]; });
  return '🌱 سلام، وقت بخیر\n\nصفحهٔ <b>' + tgEsc_(ptName_(o)) + '</b> روی سایت تجربه آماده است و فقط منتظر اطلاعات شماست.\n\n' +
    ptBar_(pct) + ' ' + tgFa_(pct) + '٪ کامل\n\n' +
    'مراجعی که دنبال درمان حضوری در ' + tgEsc_(o['شهر']) + ' است، پیش از تصمیم همین صفحه را می‌خواند؛ گوگل هم از همین اطلاعات می‌فهمد فضای شما کجاست و برای چه کسی است. <b>هرچه کامل‌تر و با جزئیات‌تر، درخواست بیشتر.</b>\n\n' +
    (miss.length ? '<b>هنوز این‌ها را از شما نداریم:</b>\n' + miss.slice(0, 14).map(function (f) { return '▫️ ' + tgEsc_(f.col); }).join('\n') + (miss.length > 14 ? '\n▫️ …' : '') + '\n\n' : '') +
    'چند دقیقه بیشتر طول نمی‌کشد و هر جا خواستید می‌توانید رها کنید و بعد ادامه بدهید.';
}
function ptNudge(send, only) {
  var out = [];
  tgPaRows_().forEach(function (o) {
    if (only && o['شناسه مکان'] !== only) return;
    var pct = ptPct_(o), to = ptChats_(o['chat_id مسئول'])[0];
    if (pct >= 100) return;
    if (!to) { out.push('⚠️ ' + ptName_(o) + ': به بات وصل نیست'); return; }
    if (!send) { out.push('… ' + ptName_(o) + ' · ' + pct + '٪'); return; }
    tgSend_(to, ptNudgeText_(o), ptKb_([[ptB_('🌐 تکمیل صفحه', 'fn')], [ptB_('🏢 میز پارتنر', 'dk')]]));
    tgPaSet_(o._row, 'آخرین یادآوری تکمیل', ptNow_());
    out.push('✅ ' + ptName_(o) + ' · ' + pct + '٪');
  });
  Logger.log(out.join('\n') || 'کسی نبود');
  return out;
}
function ptNudgeCb_(chat, uname, code) {
  if (!ptIsOwner_(chat, uname) && !ptIsBoss_(chat, uname)) return null;
  var st = ptState_(chat);
  if (!st || st.f !== 'nz' || st.code !== (code || '*')) {
    ptSetState_(chat, { f: 'nz', code: code || '*' });
    var prev = ptNudge(false, code || '');
    var o = code ? ptPlace_(code) : tgPaRows_().filter(function (x) { return ptPct_(x) < 100 && x['chat_id مسئول']; })[0];
    return tgSend_(chat, '📣 <b>پیش‌نمایش یادآوری</b>\n\nبه این‌ها می‌رود:\n' + tgEsc_(prev.join('\n') || 'کسی نیست') + (o ? '\n\n<b>متن نمونه:</b>\n' + ptNudgeText_(o) : ''),
      ptKb_([[ptB_('📨 بفرست', code ? 'nz:' + code : 'nz')], [ptB_('انصراف', code ? 'hp:' + code : 'hb')]]));
  }
  ptClear_(chat);
  var done = ptNudge(true, code || '');
  return tgSend_(chat, '✅ فرستاده شد:\n' + tgEsc_(done.join('\n')));
}


/* ═══════════ v142 · ۴ مهر ۱۴۰۵: نمای ناظر و پذیرش، تماس، پیام و چک‌لیست فعال‌سازی ═══════════
   یاسر: «در بات هیچ امکانی ندارم که مدارک را ببینم یا پیام بدهم به پارتنر یا آیدی تلگرامش را داشته باشم.»
   ریشه: ناظر و پذیرش دکمهٔ «🏢 میز پارتنر» نداشتند (TG_PA_ON فقط برای خود پارتنرها روشن می‌شد)،
   کارت هر فضا نه آیدی و یوزرنیم نشان می‌داد نه راه پیام؛ پیام پارتنر به پذیرش هم رشته و پاسخ نداشت.
   حالا: دکمهٔ میز برای ناظر و پذیرش، کارت تماس (chat_id، یوزرنیم، لینک مستقیم)، پیام دوطرفه از هاب پیام
   (همان tgMsgDeliver_، با دکمهٔ «↩️ پاسخ» و ثبت در «هاب پیام تجربه»)، و چک‌لیست استاندارد فعال‌سازی. */

/* نام و یوزرنیم هر chat از تب «کاربران بات» */
function ptUser_(chat) {
  chat = String(chat || '').trim(); if (!chat) return null;
  if (TG_DRY) return (TG_MEM.ptusers || {})[chat] || null;
  try {
    var c = CacheService.getScriptCache(), hit = c.get('ptu' + chat);
    if (hit) return JSON.parse(hit);
    var sh = tgUserSheet_(false); if (!sh || sh.getLastRow() < 2) return null;
    var f = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(chat).matchEntireCell(true).findNext();
    if (!f) return null;
    var v = sh.getRange(f.getRow(), 1, 1, 3).getDisplayValues()[0];
    var o = { name: String(v[1] || '').trim(), uname: String(v[2] || '').replace(/^@/, '').trim() };
    c.put('ptu' + chat, JSON.stringify(o), 3600);
    return o;
  } catch (e) { return null; }
}
/* همهٔ آدم‌های وصل یک فضا: مدیر(ها) و تیم */
function ptContacts_(code) {
  var o = ptPlace_(code), out = [], seen = {};
  var add = function (c, name, role, un) {
    c = String(c || '').trim(); if (!c || seen[c]) return; seen[c] = 1;
    var u = ptUser_(c) || {};
    out.push({ chat: c, name: name || u.name || '', role: role, uname: (u.uname || String(un || '').replace(/^@/, '')).trim() });
  };
  if (o) ptChats_(o['chat_id مسئول']).forEach(function (c) { add(c, o['مسئول'], PT_ROLE.m, ''); });
  ptRows_('staff').forEach(function (s) {
    if (s['شناسه مکان'] !== code || s['وضعیت'] === 'غیرفعال') return;
    ptChats_(s['chat_id']).forEach(function (c) { add(c, s['نام'], s['نقش'] || PT_ROLE.p, s['یوزرنیم']); });
  });
  return out;
}
function ptContactLine_(x) {
  return '👤 <a href="tg://user?id=' + tgEsc_(x.chat) + '">' + tgEsc_(x.name || 'بدون نام') + '</a> · ' + tgEsc_(x.role) +
    (x.uname ? ' · @' + tgEsc_(x.uname) : ' · یوزرنیم ندارد') + '\n   آیدی عددی: <code>' + tgEsc_(x.chat) + '</code>';
}
function ptInviteLinks_(code) {
  return '🧑‍💼 مدیر: ' + ptLink_('pts-' + code + '-m-' + ptTok_(code + '|m')) + '\n🙋 پذیرش: ' + ptLink_('pts-' + code + '-p-' + ptTok_(code + '|p'));
}

/* چک‌لیست استاندارد فعال‌سازی هر فضا. همین فهرست در راهنمای اسکیل هم آمده است. */
function ptReady_(code) {
  var o = ptPlace_(code) || {}, d = tgInpData_(), place = null;
  (d.places || []).forEach(function (p) { if (p.id === code) place = p; });
  var rooms = (d.rooms || []).filter(function (r) { return r.p === code && r.status !== 'غیرفعال'; }).length;
  var hours = (d.hours || []).filter(function (h) { return h.p === code; }).length;
  var pct = ptPct_(o);
  return [
    { k: 'bot', ok: !!ptChats_(o['chat_id مسئول']).length, t: 'مدیر فضا به بات وصل است', fix: 'لینک ورود مدیر را برایش بفرستید' },
    { k: 'on', ok: !!(place && place.status === 'فعال'), t: 'در «مکان‌های حضوری» فعال است (مراجع در بات می‌بیند)', fix: 'در هاب، تب «مکان‌های حضوری» وضعیت را «فعال» کنید' },
    { k: 'rm', ok: rooms > 0, t: 'دست‌کم یک اتاق با روز و ساعت دارد', fix: 'مدیر فضا از «🚪 اتاق‌ها» ثبت کند' },
    { k: 'ph', ok: !!String(o['پوشهٔ عکس'] || '').trim(), t: 'عکس فضا رسیده است', fix: 'از «🌐 تکمیل صفحه» عکس بفرستد' },
    { k: 'pg', ok: !!String(o['لینک صفحه'] || '').trim(), t: 'صفحهٔ سایت منتشر شده است', fix: 'صفحه را از روی الگوی /partners/ بسازید' },
    { k: 'pc', ok: pct >= 70, t: 'اطلاعات صفحه دست‌کم ۷۰٪ کامل است (الان ' + tgFa_(pct) + '٪)', fix: '«📣 یادآوری تکمیل صفحه» را بفرستید' },
    { k: 'ru', ok: o['قواعد را پذیرفت'] === 'بله', t: 'قواعد همکاری را پذیرفته است', fix: 'از میز پارتنر «📋 قواعد همکاری» را تأیید کند' },
    { k: 'th', ok: hours > 0, t: 'دست‌کم یک درمانگر ساعت حضوری دارد', fix: 'لینک inq- را به درمانگرهای همان شهر بدهید' }
  ];
}
function ptReadyN_(code) { var r = ptReady_(code); return { ok: r.filter(function (x) { return x.ok; }).length, all: r.length }; }

/* پیام ناظر یا پذیرش به فضا، از مسیر هاب پیام (پاسخ دوطرفه و ثبت) */
function ptMsgAsk_(chat, uname, code, all) {
  if (!ptIsBoss_(chat, uname)) return null;
  var o = ptPlace_(code); if (!o) return null;
  var to = ptContacts_(code).filter(function (x) { return all || x.role === PT_ROLE.m; });
  var back = ptKb_([[ptB_('↩️ ' + (ptName_(o) || code), 'hp:' + code)]]);
  if (!to.length) return tgSend_(chat, '⚠️ هنوز کسی از ' + tgEsc_(ptName_(o)) + ' به بات وصل نیست، پس پیام بات به او نمی‌رسد.\n\nاین لینک‌ها را از هر راهی که دارید (تلفن: ' + tgEsc_(o['شمارهٔ تماس'] || 'ثبت نشده') + ') برایش بفرستید:\n' + ptInviteLinks_(code), back);
  var label = (all ? 'تیم ' : 'مدیر ') + ptName_(o);
  tgSetVal_('msw', chat, JSON.stringify({ to: to.map(function (x) { return x.chat; }), label: label, g: 'pt' }));
  return tgSend_(chat, '💬 پیامتان به <b>' + tgEsc_(label) + '</b> (' + tgEsc_(to.map(function (x) { return x.name || x.chat; }).join('، ')) + ') را بنویسید یا ویس بفرستید.\n\nپیام از طرف «تجربه» می‌رسد و زیرش دکمهٔ «↩️ پاسخ» دارد؛ جواب همین‌جا به خودتان برمی‌گردد و در هاب پیام ثبت می‌شود.\nبرای انصراف /cancel');
}
/* کارت تماس کامل یک فضا */
function ptContactCard_(chat, uname, code) {
  if (!ptIsBoss_(chat, uname)) return null;
  var o = ptPlace_(code); if (!o) return null;
  var cs = ptContacts_(code), kb = [];
  var t = '📇 <b>تماس با ' + tgEsc_(ptName_(o)) + '</b>\n\n';
  t += cs.length ? cs.map(ptContactLine_).join('\n\n') : 'هنوز کسی از این فضا به بات وصل نیست.';
  t += '\n\n☎️ تلفن فضا: ' + tgEsc_(o['شمارهٔ تماس'] || 'ثبت نشده') + (o['ایمیل'] ? '\n✉️ ' + tgEsc_(o['ایمیل']) : '') + (o['نام و شمارهٔ رابط'] ? '\n🤝 رابط: ' + tgEsc_(o['نام و شمارهٔ رابط']) : '');
  t += '\n\n🔗 <b>لینک ورود به میز</b> (اگر گوشی عوض کرد یا همکار تازه دارد):\n' + ptInviteLinks_(code);
  cs.forEach(function (x) { if (x.uname) kb.push([{ text: '📲 گفت‌وگوی مستقیم با ' + String(x.name || x.uname).slice(0, 22), url: 'https://t.me/' + x.uname }]); });
  kb.push([ptB_('💬 پیام از طرف تجربه', 'mg:' + code)]);
  kb.push([ptB_('↩️ ' + (ptName_(o) || code), 'hp:' + code)]);
  return tgSend_(chat, t, ptKb_(kb));
}
/* چک‌لیست فعال‌سازی */
function ptReadyCard_(chat, uname, code) {
  if (!ptIsBoss_(chat, uname)) return null;
  var o = ptPlace_(code); if (!o) return null;
  var r = ptReady_(code), n = r.filter(function (x) { return x.ok; }).length;
  var t = '🧭 <b>فعال‌سازی ' + tgEsc_(ptName_(o)) + '</b> · ' + tgFa_(n) + ' از ' + tgFa_(r.length) + '\n\n';
  r.forEach(function (x) { t += (x.ok ? '✅ ' : '▫️ ') + tgEsc_(x.t) + (x.ok ? '' : '\n      ← ' + tgEsc_(x.fix)) + '\n'; });
  var miss = ptFieldsFor_(o).filter(function (f) { return !String(o[f.col] || '').trim(); }).map(function (f) { return f.col; });
  if (miss.length) t += '\n<b>اطلاعاتی که هنوز از پارتنر نداریم:</b>\n' + tgEsc_(miss.join('، '));
  if (o['آخرین یادآوری تکمیل']) t += '\n\n📨 آخرین یادآوری: ' + tgEsc_(o['آخرین یادآوری تکمیل']);
  var kb = [];
  if (miss.length) kb.push([ptB_('📣 پیش‌نمایش یادآوری تکمیل', 'nz:' + code)]);
  kb.push([ptB_('📇 تماس', 'ct:' + code), ptB_('💬 پیام', 'mg:' + code)]);
  kb.push([ptB_('↩️ ' + (ptName_(o) || code), 'hp:' + code)]);
  return tgSend_(chat, t, ptKb_(kb));
}

/* ═══════════ صفحهٔ مراجع: start=inp-<کد> از صفحه‌های سایت ═══════════ */
function ptInpStart_(chat, arg) {
  var code = String(arg).replace(/^inp-/, '').split('-')[0];
  var p = null; try { p = tgInpPlace_(code); } catch (e) {}
  if (!p) return tgSend_(chat, 'این فضا الان فعال نیست. برای جلسهٔ آنلاین یا شهر دیگر «/therapy» را بزنید.');
  try { tgStat_('inp_start', chat, code); } catch (e2) {}
  return tgInpPick_(chat, code);
}

/* ═══════════ درمانگر تجربه: درخواست ساعت حضوری در یک فضا با لینک start=inq-<کد> ═══════════ */
function ptInqStart_(chat, arg) {
  var code = String(arg).replace(/^inq-/i, '').split('-')[0];
  var who = null; try { who = TG_DRY ? TG_DRY_THER : tgWhoTherapist_(chat); } catch (e) {}
  if (!who || !who.name) return tgSend_(chat, 'این لینک برای درمانگرهای تجربه است. اگر درمانگر تجربه هستید، اول با «/start ther» به بات وصل شوید و بعد دوباره همین لینک را باز کنید.');
  var p = null; try { p = tgInpPlace_(code); } catch (e2) {}
  if (!p) return tgSend_(chat, 'این فضا الان فعال نیست. از «' + TG_INP_BTN + '» فضاهای فعال را ببینید.');
  try { tgStat_('inq_start', chat, code); } catch (e3) {}
  return tgInpQCb_(chat, 'ap:' + code);
}

/* ═══════════ مسیریابی ═══════════ */
function ptRoute_(m, chat, name, uname) {
  var text = String((m && m.text) || '').trim();
  if (text.indexOf('/start ') === 0) {
    var arg = text.replace(/^\/start(@\w+)?\s*/, '').trim();
    if (/^pts-/i.test(arg)) { ptStaffJoin_(chat, uname, name, arg); return true; }
    if (/^ptt-/i.test(arg)) { ptTherJoin_(chat, uname, arg); return true; }
    if (/^inp-/i.test(arg)) { ptInpStart_(chat, arg); return true; }
    if (/^inq-/i.test(arg)) { ptInqStart_(chat, arg); return true; }
  }
  if (text === TG_PA_BTN || text === '/partner_desk' || text === (TG_ROLE_BTN && TG_ROLE_BTN['پارتنر'])) { ptEntry_(chat, uname); return true; }
  if (text === PT_TH_BTN) { ptTherHome_(chat); return true; }
  var st = ptState_(chat);
  if (st) {
    if (text && (text.indexOf('/') === 0 || (typeof tgIsBtnLike_ === 'function' && tgIsBtnLike_(text) && st.f !== 'fill' && st.f !== 'ther'))) { ptClear_(chat); return false; }
    if (st.f === 'doc' && (m.photo || m.document)) { ptDocSave_(chat, st, m); return true; }
    if (st.f === 'fill' && m.photo && m.photo.length && st.k === 'ph') { ptFillSave_(chat, st, '', m.photo[m.photo.length - 1].file_id); return true; }
    if (!text) return false;
    if (st.f === 'fill') { ptFillSave_(chat, st, text); return true; }
    if (st.f === 'ther') { ptTherAddText_(chat, st, text); return true; }
    if (st.f === 'room' && st.s === 'name') { st.v.name = text.slice(0, 40); st.s = 'kind'; ptSetState_(chat, st); ptRoomAskKind_(chat, st.v); return true; }
    if (st.f === 'grant' && st.s === 'name') {
      var hit = []; try { hit = tgTherFind_(text, false); } catch (e) {}
      if (!hit.length) { tgSend_(chat, 'این نام در درمانگرهای تجربه پیدا نشد. دوباره بنویسید یا انصراف.'); return true; }
      st.v.who = hit[0].name; ptSetState_(chat, st); ptGrantAskRoom_(chat, st); return true;
    }
    if (st.f === 'off') { var g = ptParseJDate_(text); if (!g) { tgSend_(chat, 'تاریخ را نفهمیدم. مثل «۱۲ آبان» بنویسید.'); return true; } ptOffDate_(chat, g); return true; }
    if (st.f === 'cty') { var w0 = ptMgr_(chat); if (w0) { var o0 = ptPlace_(w0.code); tgPaSet_(o0._row, 'کشور', text.slice(0, 30)); } ptClear_(chat); ptFill_(chat); return true; }
    if (st.f === 'say') { ptClear_(chat); ptSaySave_(chat, text); return true; }
  }
  /* میز پارتنر قدیمی: متن آزاد (قواعد، متن محلی، پیوستن درمانگر) تا امروز به جایی وصل نبود */
  if (text && typeof tgPaWaiting_ === 'function' && tgPaWaiting_(chat)) { tgPaText_(chat, text, name, uname); return true; }
  return false;
}
function ptSayAsk_(chat) { ptSetState_(chat, { f: 'say' }); return tgSend_(chat, '💬 پیامتان را بنویسید. به پذیرش تجربه می‌رسد.', ptKb_([[ptB_('انصراف', 'dk')]])); }
function ptSaySave_(chat, text) {
  var w = ptWho_(chat), o = w ? ptPlace_(w.code) : null;
  /* v142: از مسیر هاب پیام، تا پذیرش دکمهٔ «↩️ پاسخ» داشته باشد و رشته ثبت شود */
  try {
    var to = tgMsgGroup_('desk').map(function (x) { return x.chat; });
    if (to.length) { tgMsgDeliver_(chat, { text: String(text).slice(0, 900) }, (ptUser_(chat) || {}).name || '', '', { to: to, label: '📥 پذیرش تجربه', g: 'pt' }); return tgSend_(chat, 'هر وقت خواستید از همین میز دوباره پیام بدهید.', ptKb_([ptBack_()])); }
  } catch (eM) {}
  try { tgInpDeskSay_('💬 <b>پیام از ' + (w ? tgEsc_(w.role) + ' · ' + tgEsc_(ptName_(o)) : 'پارتنر') + '</b>\n' + tgEsc_(String(text).slice(0, 900))); } catch (e) {}
  return tgSend_(chat, '✅ رسید. پذیرش تجربه همین‌جا جواب می‌دهد.', ptKb_([ptBack_()]));
}

/* کال‌بک pt: */
function ptCb_(cq, rest, chat, name, uname) {
  var p = String(rest || '').split(':'), a = p[0], x = p.slice(1).join(':');
  if (a === 'dk') return ptDesk_(chat);
  if (a === 'gu') return ptGuide_(chat);
  if (a === 'wk') return ptWeek_(chat);
  if (a === 'rm') return ptRooms_(chat);
  if (a === 'ra') return ptRoomStart_(chat, 0);
  if (a === 're') return ptRoomStart_(chat, Number(x));
  if (a === 'rp') return ptRoomPause_(chat, Number(x));
  if (a === 'rk' || a === 'rd' || a === 'rf' || a === 'rt') return ptRoomCb_(chat, a, x);
  if (a === 'th') return ptTher_(chat);
  if (a === 'ta') return ptTherAddStart_(chat);
  if (a === 'tq') { var st = ptState_(chat); return st && st.f === 'ther' ? ptTherAddText_(chat, st, null) : ptTher_(chat); }
  if (a === 'ti') return ptInviteAsk_(chat);
  if (a === 'tj') return ptInviteSend_(chat, uname, x);
  if (a === 'to') return ptTherOwnerCb_(chat, uname, p[1], p.slice(2).join(':'));
  if (a === 'tv') return ptTherSupPick_(chat, uname, p[1], p[2]);
  if (a === 'ts') return ptTherSupDone_(chat, p[1], p.slice(2).join(':'), uname);
  if (a === 'gr') return ptGrantStart_(chat);
  if (a === 'gw' || a === 'gm' || a === 'gd' || a === 'gf' || a === 'gt' || a === 'gs') return ptGrantCb_(chat, a, x);
  if (a === 'rl') return ptReleaseStart_(chat);
  if (a === 'rx') return ptReleasePick_(chat, x);
  if (a === 'of') return ptOffStart_(chat);
  if (a === 'od') return ptOffDate_(chat, x);
  if (a === 'op') return ptOffPart_(chat, x);
  if (a === 'ow') return ptOffWhy_(chat, x);
  if (a === 'os') return ptOffSave_(chat, uname);
  if (a === 'ol') return ptOffList_(chat);
  if (a === 'ox') return ptOffCancel_(chat, x);
  if (a === 'ok') return ptOffSeen_(chat, x);
  if (a === 'cl') return ptClients_(chat);
  if (a === 'tm') return ptTeam_(chat);
  if (a === 'tx') return ptStaffDrop_(chat, x);
  if (a === 'fl') return ptFill_(chat);
  if (a === 'fn') return ptFillGo_(chat, '', '');
  if (a === 'fg') return ptFillGo_(chat, x, '');
  if (a === 'fx') { var s2 = ptState_(chat); return s2 && s2.f === 'fill' ? ptFillGo_(chat, s2.g, s2.k) : ptFill_(chat); }
  if (a === 'cy') return ptCountry_(chat, x);
  if (a === 'dc') return ptDocs_(chat);
  if (a === 'du') return ptDocAsk_(chat, x);
  if (a === 'sy') return ptSayAsk_(chat);
  /* v166.8: نمای پذیرش (همهٔ فضاها، مدیرها، درمانگران منتظر) فقط برای تیم تجربه؛ هفتهٔ یک فضا برای تیم یا خود همان فضا */
  if (a === 'hb' || a === 'hp' || a === 'hf' || a === 'hq') { if (!ptIsBoss_(chat, uname)) return null; }
  if (a === 'hw' && x && !ptIsBoss_(chat, uname)) { var ww = ptWho_(chat); if (!ww || ww.code !== x) return null; }
  if (a === 'hb') return ptHub_(chat, uname);
  if (a === 'hp') return ptHubPlace_(chat, uname, x);
  if (a === 'hw') return ptWeek_(chat, x);
  if (a === 'hf') return ptHubOff_(chat, x);
  if (a === 'hq') return ptHubQueue_(chat, uname);
  if (a === 'pp') return ptShareAsk_(chat, uname, x);
  if (a === 'ps') return ptShareSet_(chat, uname, p[1], p[2]);
  if (a === 'dv') return ptDocsOwner_(chat, uname, x);
  if (a === 'dg') return ptDocGet_(chat, uname, p[1], p[2]);
  if (a === 'nz') return ptNudgeCb_(chat, uname, x);
  if (a === 'ct') return ptContactCard_(chat, uname, x);
  if (a === 'mg') return ptMsgAsk_(chat, uname, x, false);
  if (a === 'mt') return ptMsgAsk_(chat, uname, x, true);
  if (a === 'ry') return ptReadyCard_(chat, uname, x);
  return null;
}
/* کال‌بک‌های قدیمی میز پارتنر که حالا به نسخهٔ تازه می‌روند (undefined یعنی «خودت ادامه بده») */
function ptPaOverride_(cq, rest, chat, name, uname) {
  var a = String(rest || '').split(':')[0];
  if (a === 'dk') return ptDesk_(chat) || null;
  if (a === 'fl' || a === 'fq') { if (ptMgr_(chat)) { ptFill_(chat); return null; } return undefined; }
  if (a === 'hb') { if (ptIsBoss_(chat, uname)) ptHub_(chat, uname); return null; }
  if (a === 'sy') { ptSayAsk_(chat); return null; }
  return undefined;
}
/* ردیف منو برای درمانگر «فقط همین فضا» */
function ptMenuRow_(chat) {
  var w = ptWho_(chat);
  return (w && w.role === 'درمانگر') ? [[{ text: PT_TH_BTN }]] : [];
}

/* ═══════════ همگامی با سایت: کدام درمانگر کجا حضوری می‌بیند ═══════════
   اسنیپت WPCode «Tajrobeh — حضوری روی کارت‌ها» این نقشه را در گزینهٔ tj_inp_map نگه می‌دارد
   و روی کارت /team/ و صفحهٔ هر درمانگر نشان «حضوری در …» و دکمهٔ رزرو حضوری می‌گذارد. */
var PT_INP_URL = 'https://tajrobeh.life/wp-json/tj/v1/inp';
function ptInpMap_() {
  var d = tgInpData_(), map = {}, places = {};
  (d.places || []).forEach(function (p) { if (p.status === 'فعال') places[p.id] = p; });
  var slug = {};
  try { tgPrAll_().forEach(function (r) { var v = r.v || {}; if (v.site_slug && v.name) slug[tgInpNameKey_(v.name)] = String(v.site_slug); }); } catch (e) {}
  var pn = {}; try { tgPaRows_().forEach(function (o) { pn[o['شناسه مکان']] = o; }); } catch (e2) {}
  (d.hours || []).forEach(function (h) {
    var p = places[h.p]; if (!p) return;
    var k = tgInpNameKey_(h.who), s = slug[k]; if (!s) return;
    map[s] = map[s] || { name: h.who, at: [] };
    var at = null; map[s].at.forEach(function (x) { if (x.code === h.p) at = x; });
    if (!at) { at = { code: h.p, city: p.city, area: p.area || '', place: (pn[h.p] && pn[h.p]['نام نمایشی']) || p.name, kind: (pn[h.p] ? 'partner' : 'clinic'), days: [] }; map[s].at.push(at); }
    if (h.day && at.days.indexOf(h.day) < 0) at.days.push(h.day);
  });
  Object.keys(map).forEach(function (s) { map[s].at.forEach(function (a) { a.days.sort(function (x, y) { return TG_INP_DAYS.indexOf(x) - TG_INP_DAYS.indexOf(y); }); }); });
  return map;
}
function ptInpPush() {
  var map = ptInpMap_(), body = { op: 'inp', map: map, t: Date.now() };
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'inpmap', n: Object.keys(map).length }); return { ok: true, n: Object.keys(map).length }; }
  var key = PropertiesService.getScriptProperties().getProperty('TG_DIR_KEY');
  if (!key) throw new Error('سایت هنوز با بات جفت نشده است');
  var raw = tgDirAscii_(JSON.stringify(body)), ts = String(Math.floor(Date.now() / 1000));
  var res = UrlFetchApp.fetch(PT_INP_URL + '?ts=' + ts + '&sig=' + tgDirSign_(ts, raw, key), { method: 'post', contentType: 'application/json', payload: raw, muteHttpExceptions: true, followRedirects: false });
  var out = res.getResponseCode() + ' ' + res.getContentText().slice(0, 200);
  Logger.log('ptInpPush: ' + Object.keys(map).length + ' درمانگر · ' + out);
  return out;
}

/* ═══════════ کار ساعتی: یادآوری روز بسته، همگامی سایت ═══════════ */
function ptTick(e) {
  if (ciPaused_(e, 'ptTick', 'skip')) return;
  var rs0 = Date.now(); try {   /* v166.18: سنجش زمان اجرا (بدنه بی‌تغییر) */
  var out = [];
  try {
    var t = ptToday_(), hh = Number(Utilities.formatDate(t, TG_TZ, 'HH'));
    var tomorrow = Utilities.formatDate(new Date(t.getTime() + 86400000), TG_TZ, 'yyyy-MM-dd');
    if (hh >= 17 && hh < 19) ptRows_('off').forEach(function (r) {
      if (r['وضعیت'] !== PT_OFF_ON || r['تاریخ میلادی'] !== tomorrow || String(r['دیدند']).indexOf('یادآوری') > -1) return;
      String(r['خبر به']).split(/\s*،\s*/).filter(String).forEach(function (n) { var c = ''; try { c = tgTherChatByName_(n); } catch (e) {} if (c) tgSend_(c, '⏰ یادآوری: فردا ' + tgEsc_(r['بخش']) + ' فضای ' + tgEsc_(ptName_(ptPlace_(r['شناسه مکان']))) + ' بسته است (' + tgEsc_(r['علت']) + ').'); });
      ptSetCell_('off', r._row, 'دیدند', (r['دیدند'] ? r['دیدند'] + '، ' : '') + 'یادآوری');
      out.push('یادآوری ' + r['کد']);
    });
    if (hh === 3) { try { out.push('سایت: ' + ptInpPush()); } catch (e2) { out.push('سایت: ' + e2); } }
  } catch (e) { out.push('خطا: ' + e); }
  if (out.length) console.log('ptTick: ' + out.join(' · '));
  return out.join('\n');
  } finally { tgRunStat_('ptTick', rs0); }
}

/* ═══════════ برپاسازی (یک بار؛ تکرارش بی‌خطر) ═══════════ */
function ptSetup() {
  var log = [];
  ['staff', 'ther', 'off'].forEach(function (k) { ptTab_(k); log.push('✅ تب ' + PT_T[k]); });
  var pn = tgSS_().getSheetByName(TG_PN_TAB);
  if (pn) {
    var lc = pn.getLastColumn(), hd = pn.getRange(1, 1, 1, lc).getValues()[0].map(String), add = [];
    TG_PN_HEAD.forEach(function (c) { if (hd.indexOf(c) < 0) add.push(c); });
    if (add.length) { pn.getRange(1, lc + 1, 1, add.length).setValues([add]).setFontWeight('bold').setBackground('#f3efec'); log.push('✅ ستون تازه در صفحهٔ پارتنر: ' + add.join('، ')); }
  }
  try { ptPrivTab_(PT_SHARE_TAB, PT_SHARE_HEAD); ptPrivTab_(PT_DOC_TAB, PT_DOC_HEAD); log.push('✅ دفتر مالی: سهم و مدارک پارتنرها'); } catch (e) { log.push('⚠️ دفتر مالی: ' + e); }
  /* v169.1: ptTick تریگر جدا ندارد؛ هر ساعت از tgWatchdog صدا زده می‌شود (v1691Hourly_). تریگر نساز. */
  log.push('ptTick: ساعتی از tgWatchdog (v169.1)');
  ptClearCache_();
  Logger.log(log.join('\n'));
  return log;
}
/* رنگ سبز گروه حضوری و پارتنرز در هاب */
function ptHubColor() {
  var ss = tgSS_(), n = 0;
  ['صفحهٔ پارتنر', 'مکان‌های حضوری', 'اتاق‌های حضوری', 'ساعت‌های حضوری', 'درخواست‌های حضوری', 'درخواست فضای پارتنر', PT_T.staff, PT_T.ther, PT_T.off]
    .forEach(function (nm) { var sh = ss.getSheetByName(nm); if (sh) { sh.setTabColor('#348a5a'); n++; } });
  Logger.log(n + ' تب سبز شد');
  return n;
}

/* ═══════════ تست ═══════════ */
function ptTests() {
  var out = [], pass = 0, fail = 0;
  var ok = function (t, c) { if (c) { pass++; } else { fail++; out.push('❌ ' + t); } };
  var was = TG_DRY; TG_DRY = true; TG_OUTBOX = []; TG_MEM = {};
  var OUT = function () { return JSON.stringify(TG_OUTBOX); };
  try {
    TG_MEM.ptnow = '2026-09-23T08:00:00Z'; /* ۱ مهر ۱۴۰۵، چهارشنبه */
    var blank = []; for (var b = 0; b < TG_PN_HEAD.length; b++) blank.push('');
    var r1 = blank.slice(); r1[0] = 'mashhad'; r1[1] = 'میانه'; r1[2] = 'مشهد'; r1[6] = 'نفیسه'; r1[7] = '700'; r1[9] = 'فعال';
    tgPaTab_().append(r1);
    var r2 = blank.slice(); r2[0] = 'austria'; r2[1] = 'فضای وین'; r2[2] = 'اتریش'; r2[7] = '800'; r2[9] = 'فعال';
    tgPaTab_().append(r2);
    TG_MEM['inp'] = { places: [{ id: 'mashhad', city: 'مشهد', name: 'پارتنر', area: 'بردیا', status: 'فعال', ord: 3 }],
      rooms: [{ p: 'mashhad', room: 'اتاق ۱', kind: 'بزرگسال', days: 'همه روزها', from: '9', to: '21', status: 'فعال' }],
      hours: [{ p: 'mashhad', who: 'سارا نمونه', day: 'چهارشنبه', from: '10', to: '14', room: '1', open: 'دارد', chk: 'تأیید شد' }] };
    TG_MEM['watchids'] = ['1'];
    TG_MEM['desk'] = [{ name: 'ژیلا', chat: '368' }];

    ok('ستون‌های تازهٔ صفحهٔ پارتنر اضافه شد', TG_PN_HEAD.indexOf('کشور') > -1 && TG_PN_HEAD.indexOf('مجوز و نهاد صادرکننده') > -1);
    ok('هر فیلد ستونی دارد', PT_FIELDS.every(function (f) { return TG_PN_HEAD.indexOf(f.col) > -1; }));
    ok('کلید فیلدها یکتاست', PT_FIELDS.map(function (f) { return f.k; }).filter(function (k, i, a) { return a.indexOf(k) !== i; }).length === 0);
    ok('هیچ متن پرسشی خط تیرهٔ وسط جمله ندارد', PT_FIELDS.every(function (f) { return (f.q + (f.qab || '') + (f.why || '')).indexOf('—') < 0; }) && PT_GUIDE.join(' ').indexOf('—') < 0);
    ok('مدیر اصلی شناخته می‌شود', ptWho_(700) && ptWho_(700).role === PT_ROLE.m && ptWho_(700).code === 'mashhad');
    ok('ناشناس پارتنر نیست', !ptIsPartnerChat_(12345));
    var oM = tgPaByCode_('mashhad'), oA = tgPaByCode_('austria');
    ok('مشهد ایران است', !ptAbroad_(oM));
    ok('اتریش خارج است', ptAbroad_(oA));
    ok('فیلد کد پستی فقط ایران', ptFieldsFor_(oM).some(function (f) { return f.k === 'pc'; }) && !ptFieldsFor_(oA).some(function (f) { return f.k === 'pc'; }));
    ok('زبان پذیرش و واحد پول فقط خارج', ptFieldsFor_(oA).some(function (f) { return f.k === 'lg'; }) && !ptFieldsFor_(oM).some(function (f) { return f.k === 'cu'; }));
    ok('درصد تکمیل اول صفر', ptPct_(oM) === 0);

    TG_OUTBOX = []; ptDesk_(700);
    ok('میز: قدم بعدی قواعد است', OUT().indexOf('قواعد همکاری را بخوانید') > -1);
    ok('میز: دکمهٔ بستن یک روز', OUT().indexOf('pt:of') > -1 && OUT().indexOf('pt:gr') > -1);
    ok('میز: درصد صفحه دیده می‌شود', OUT().indexOf('صفحهٔ سایت') > -1);

    TG_OUTBOX = []; ptRoute_({ text: TG_PA_BTN, chat: { id: 700 }, from: { id: 700 } }, 700, 'نفیسه', '');
    ok('دکمهٔ میز پارتنر حالا جواب می‌دهد', OUT().indexOf('میز پارتنر تجربه') > -1);

    /* اتاق تازه */
    TG_OUTBOX = []; ptCb_({}, 'ra', 700, '', '');
    ptRoute_({ text: 'اتاق بازی' }, 700, '', '');
    ptCb_({}, 'rk:کودک', 700, '', '');
    ok('دکمهٔ روزها همان کال‌بکی است که ویزارد می‌فهمد', OUT().indexOf('"pt:rd:0"') > -1 && OUT().indexOf('"pt:rd:ok"') > -1);
    ptCb_({}, 'rd:0', 700, '', ''); ptCb_({}, 'rd:2', 700, '', ''); ptCb_({}, 'rd:ok', 700, '', '');
    ptCb_({}, 'rf:10', 700, '', ''); ptCb_({}, 'rt:18', 700, '', '');
    var rr = tgInpTab_(TG_INP_ROOMS, TG_INP_RHEAD).rows();
    ok('اتاق تازه در تب اتاق‌ها نشست', rr.length === 1 && rr[0][1] === 'اتاق بازی' && rr[0][2] === 'کودک' && rr[0][3] === 'شنبه، دوشنبه' && rr[0][6] === 'فعال');
    ok('اتاق: هفتگی بودن گفته شد', OUT().indexOf('هر هفته تکرار') > -1);

    /* برنامهٔ هفتگی و بازهٔ آزاد */
    var wt = ptWeekText_('mashhad');
    ok('برنامه: ساعت درمانگر و آزاد', wt.indexOf('سارا نمونه') > -1 && wt.indexOf('آزاد') > -1);
    ok('بازهٔ آزاد درست', JSON.stringify(ptFree_([9, 21], [[10, 14]])) === '[[9,10],[14,21]]');

    /* دادن اتاق */
    TG_OUTBOX = []; TG_MEM['tab:' + TG_INP_REQ] = [];
    ptCb_({}, 'gr', 700, '', '');
    ok('واگذاری: فهرست درمانگر', OUT().indexOf('سارا نمونه') > -1);
    ptCb_({}, 'gw:0', 700, '', ''); ptCb_({}, 'gm:0', 700, '', ''); ptCb_({}, 'gd:4', 700, '', '');
    ok('واگذاری: اشغال همان روز گفته شد', OUT().indexOf('الان پر') > -1);
    ptCb_({}, 'gf:14', 700, '', ''); ptCb_({}, 'gt:17', 700, '', '');
    ok('واگذاری: مرور بی‌تداخل', OUT().indexOf('مرور') > -1 && OUT().indexOf('هم‌پوشانی') < 0);
    ptCb_({}, 'gs', 700, '', '');
    var q = tgInpTab_(TG_INP_REQ, TG_INP_QHEAD).rows();
    ok('واگذاری در درخواست‌های حضوری نشست', q.length === 1 && q[0][5] === TG_INP_KIND.add && q[0][12].indexOf('[پارتنر:700]') > -1);
    ok('واگذاری: دکمهٔ تأیید پذیرش', OUT().indexOf('iv:y:') > -1);
    TG_OUTBOX = []; ptOnInpDecision_(q[0], true, '');
    ok('بعد از تأیید، مدیر فضا خبر گرفت', OUT().indexOf('"chat":"700"') > -1 && OUT().indexOf('تأیید کرد') > -1 && OUT().indexOf('[پارتنر') < 0);
    ok('تداخل شناخته می‌شود', ptClash_('mashhad', 'اتاق ۱', 'چهارشنبه', 12, 16).indexOf('سارا') > -1);

    /* بستن یک روز */
    TG_OUTBOX = []; ptCb_({}, 'of', 700, '', '');
    ok('روز بسته: ۱۴ روز پیش رو', OUT().indexOf('امروز') > -1 && OUT().indexOf('مهر') > -1);
    ptCb_({}, 'od:2026-09-23', 700, '', ''); ptCb_({}, 'op:all', 700, '', ''); ptCb_({}, 'ow:0', 700, '', '');
    ok('روز بسته: درمانگر آن روز پیدا شد', OUT().indexOf('سارا نمونه') > -1);
    TG_OUTBOX = []; ptCb_({}, 'os', 700, '', 'nafise');
    var offs = ptRows_('off');
    ok('روز بسته ثبت شد', offs.length === 1 && offs[0]['روز هفته'] === 'چهارشنبه' && offs[0]['وضعیت'] === PT_OFF_ON);
    ok('روز بسته: پذیرش خبر گرفت یا تماس تلفنی خواسته شد', OUT().indexOf('روز بسته') > -1 || OUT().indexOf('تلفنی') > -1);
    ok('روز بسته در میز دیده می‌شود', ptOffUpcoming_('mashhad', 7).length === 1);
    ok('تاریخ نوشتاری فهمیده می‌شود', ptParseJDate_('۱۲ آبان') === '2026-11-03');
    ok('تاریخ عددی فهمیده می‌شود', ptParseJDate_('1405/07/01') === '2026-09-23');

    /* معرفی درمانگر فقط‌پارتنر */
    TG_OUTBOX = []; ptCb_({}, 'ta', 700, '', '');
    ptRoute_({ text: 'مینا نمونه' }, 700, '', ''); ptCb_({}, 'tq:skip', 700, '', ''); ptCb_({}, 'tq:skip', 700, '', '');
    ptRoute_({ text: 'روانکاوی' }, 700, '', ''); ptRoute_({ text: 'ارشد بالینی فردوسی' }, 700, '', ''); ptCb_({}, 'tq:skip', 700, '', '');
    var th = ptRows_('ther');
    ok('درمانگر معرفی‌شده ثبت شد', th.length === 1 && th[0]['نام'] === 'مینا نمونه' && th[0]['وضعیت'] === PT_TST.wait && th[0]['نوع'] === PT_KIND_ONLY);
    ok('کارت به ناظر رفت با دکمهٔ مصاحبه', OUT().indexOf('"chat":"1"') > -1 && OUT().indexOf('pt:to:iv:PT-101') > -1);
    TG_OUTBOX = []; TG_MEM['whodesk'] = null; ptTherOwnerCb_(999, '', 'ok', 'PT-101');
    ok('غیرناظر نمی‌تواند تأیید کند', ptRows_('ther')[0]['وضعیت'] === PT_TST.wait);
    TG_MEM['watchids'] = ['1']; TG_OUTBOX = []; ptTherOwnerCb_(1, '', 'ok', 'PT-101');
    ok('ناظر تأیید کرد و لینک اتصال برای مدیر رفت', ptRows_('ther')[0]['وضعیت'] === PT_TST.ok && OUT().indexOf('start=ptt-PT-101-') > -1);
    var link = OUT().match(/start=(ptt-PT-101-[0-9a-f]{6})/)[1];
    TG_OUTBOX = []; ptRoute_({ text: '/start ' + link }, 55, 'مینا', '@mina');
    ok('درمانگر با لینک وصل شد', ptWho_(55) && ptWho_(55).role === 'درمانگر' && OUT().indexOf('فضای حضوری من') > -1);
    ok('لینک جعلی رد می‌شود', (TG_OUTBOX = [], ptRoute_({ text: '/start ptt-PT-101-000000' }, 56, '', ''), OUT().indexOf('معتبر نیست') > -1));
    ok('درمانگر فضا در فهرست «فقط همین فضا»', ptTherList_('mashhad').some(function (x) { return x.name === 'مینا نمونه' && x.kind === PT_KIND_ONLY; }));

    /* تیم */
    TG_OUTBOX = []; ptCb_({}, 'tm', 700, '', '');
    var sl = OUT().match(/start=(pts-mashhad-p-[0-9a-f]{6})/);
    ok('لینک دعوت پذیرش ساخته شد', !!sl);
    TG_OUTBOX = []; ptRoute_({ text: '/start ' + sl[1] }, 77, 'منشی', '@sec');
    ok('پذیرش پارتنر وصل شد', ptWho_(77) && ptWho_(77).role === PT_ROLE.p);
    TG_OUTBOX = []; ptDesk_(77);
    ok('پذیرش پارتنر دکمهٔ اتاق و سهم ندارد', OUT().indexOf('pt:rm') < 0 && OUT().indexOf('pt:of') > -1);
    TG_OUTBOX = []; ptCb_({}, 'ra', 77, '', '');
    ok('پذیرش پارتنر نمی‌تواند اتاق بسازد', OUT().indexOf('اسم اتاق') < 0);

    /* تکمیل صفحه */
    TG_OUTBOX = []; ptCb_({}, 'fl', 700, '', '');
    ok('تکمیل: اول کشور پرسیده می‌شود', OUT().indexOf('pt:cy:ایران') > -1);
    ptCb_({}, 'cy:ایران', 700, '', '');
    ok('تکمیل: اهمیت اطلاعات گفته می‌شود', OUT().indexOf('درخواست بیشتر') > -1);
    TG_OUTBOX = []; ptCb_({}, 'fn', 700, '', '');
    ptRoute_({ text: 'مشهد، بلوار بردیا، پلاک ۱۲' }, 700, '', '');
    ok('تکمیل: جواب نشست و پرسش بعدی آمد', tgPaByCode_('mashhad')['نشانی کامل'].indexOf('بردیا') > -1 && OUT().indexOf('کد پستی') > -1);
    ok('تکمیل: درصد بالا رفت', ptPct_(tgPaByCode_('mashhad')) > 0);
    ptCb_({}, 'dk', 700, '', '');

    /* سهم */
    var SH1 = PT_SHARES[PT_SHARES.length - 1];   /* v170.9: گزینه‌های سهم از تنظیمات خصوصی (در اجرای محلی ساختگی) */
    TG_OUTBOX = []; ptShareSet_(999, '', 'mashhad', SH1);
    ok('غیرناظر سهم را عوض نمی‌کند', ptShareOf_('mashhad') === 0);
    ptShareSet_(1, '', 'mashhad', SH1);
    ok('ناظر سهم را گذاشت', ptShareOf_('mashhad') === SH1);
    ok('عدد خارج بازه رد می‌شود', (ptShareSet_(1, '', 'mashhad', 99), ptShareOf_('mashhad') === SH1));
    TG_OUTBOX = []; ptDesk_(700);
    ok('مدیر سهم خودش را می‌بیند', OUT().indexOf('سهم شما طبق قرارداد') > -1);
    TG_OUTBOX = []; ptDesk_(77);
    ok('پذیرش پارتنر سهم را نمی‌بیند', OUT().indexOf('سهم شما') < 0);

    /* مدارک */
    TG_OUTBOX = []; ptCb_({}, 'dc', 700, '', '');
    ok('مدارک: اختیاری و محرمانه گفته شد', OUT().indexOf('اختیاری') > -1 && OUT().indexOf('محرمانه') > -1);
    ptCb_({}, 'du:2', 700, '', '');
    ptRoute_({ document: { file_id: 'FID1', file_name: 'lease.pdf' } }, 700, '', '');
    ok('مدرک در دفتر محرمانه ثبت شد', ptDocRows_().length === 1 && ptDocRows_()[0][3].indexOf('اجاره') > -1);
    TG_OUTBOX = []; ptDocsOwner_(999, '', 'mashhad');
    ok('غیرناظر مدرک نمی‌بیند', OUT().indexOf('فقط برای مدیر تجربه') > -1);
    TG_OUTBOX = []; ptDocsOwner_(1, '', 'mashhad'); ptDocGet_(1, '', 'mashhad', 0);
    ok('ناظر مدرک را می‌بیند و فایل را می‌گیرد', OUT().indexOf('FID1') > -1);

    /* هاب پذیرش */
    TG_OUTBOX = []; ptHub_(1, '');
    ok('هاب: فضاها و درمانگر منتظر', OUT().indexOf('میانه') > -1 && OUT().indexOf('pt:hp:mashhad') > -1);
    TG_OUTBOX = []; ptHubPlace_(1, '', 'mashhad');
    ok('هاب فضا: سهم فقط برای ناظر', OUT().indexOf('pt:pp:mashhad') > -1);

    /* یادآوری تکمیل: پیش‌نمایش بعد ارسال */
    TG_OUTBOX = []; ptCb_({}, 'nz:mashhad', 1, '', '');
    ok('یادآوری: اول پیش‌نمایش', OUT().indexOf('پیش‌نمایش') > -1 && OUT().indexOf('"chat":"700"') < 0);
    TG_OUTBOX = []; ptCb_({}, 'nz:mashhad', 1, '', '');
    ok('یادآوری: بعد ارسال به مدیر', OUT().indexOf('"chat":"700"') > -1 && OUT().indexOf('درخواست بیشتر') > -1);

    /* کال‌بک‌های قدیمی */
    TG_OUTBOX = []; ok('pa:dk به میز تازه می‌رود', (ptPaOverride_({}, 'dk', 700, '', ''), OUT().indexOf('pt:of') > -1));
    ok('pa ناشناخته دست‌نخورده می‌ماند', ptPaOverride_({}, 'ru', 700, '', '') === undefined);
    ok('مسیر قدیمی متن آزاد وصل است', (tgSetVal_('pas', 900, '1'), ptRoute_({ text: 'سلام' }, 900, '', '')) === true);

    /* مراجع از سایت */
    TG_OUTBOX = []; ptRoute_({ text: '/start inp-mashhad' }, 4000, '', '');
    ok('start=inp: مسیر حضوری همان فضا باز شد', OUT().indexOf('سارا نمونه') > -1 || OUT().indexOf('کدام روز') > -1);

    /* نقشهٔ سایت */
    TG_MEM['pqrows'] = { 'ther:1': { id: 'ther:1', name: 'سارا نمونه', site_slug: 'sara-nemoone', roles: 'T' } };
    var mp = ptInpMap_();
    ok('نقشهٔ حضوری سایت: درمانگر و روز', mp['sara-nemoone'] && mp['sara-nemoone'].at[0].code === 'mashhad' && mp['sara-nemoone'].at[0].days[0] === 'چهارشنبه');
    ok('نقشه نام فضای پارتنر را دارد', mp['sara-nemoone'].at[0].place === 'میانه' && mp['sara-nemoone'].at[0].kind === 'partner');

    /* راهنما و PDF */
    TG_OUTBOX = []; ptGuide_(700);
    ok('راهنما: هفتگی بودن توضیح داده شد', OUT().indexOf('دوشنبهٔ بعد هم هست') > -1 && OUT().indexOf('"kind":"pdf"') > -1);

    /* v142: نمای ناظر و پذیرش: تماس، پیام، چک‌لیست */
    TG_MEM.ptusers = { '700': { name: 'Nafise', uname: 'nafise_x' } };
    TG_OUTBOX = []; ptCb_({}, 'hp:mashhad', 1, '', '');
    ok('کارت فضا برای ناظر: آیدی و یوزرنیم', OUT().indexOf('@nafise_x') > -1 && OUT().indexOf('700') > -1);
    ok('کارت فضا: دکمهٔ پیام، تماس، چک‌لیست و مدارک', OUT().indexOf('pt:mg:mashhad') > -1 && OUT().indexOf('pt:ct:mashhad') > -1 && OUT().indexOf('pt:ry:mashhad') > -1 && OUT().indexOf('pt:dv:mashhad') > -1);
    TG_OUTBOX = []; ptCb_({}, 'ct:mashhad', 1, '', '');
    ok('تماس: لینک مستقیم تلگرام و لینک ورود', OUT().indexOf('t.me/nafise_x') > -1 && OUT().indexOf('tg://user?id=700') > -1 && OUT().indexOf('pts-mashhad-m-') > -1);
    TG_OUTBOX = []; ptCb_({}, 'ct:mashhad', 12345, '', '');
    ok('تماس برای غریبه بسته است', OUT() === '[]');
    TG_OUTBOX = []; ptCb_({}, 'mg:mashhad', 1, '', '');
    var mw = JSON.parse(tgGetVal_('msw', 1) || '{}');
    ok('پیام به مدیر: حالت نوشتن در هاب پیام', mw.to ? (mw.to[0] === '700' && mw.g === 'pt') : false);
    TG_OUTBOX = []; tgMsgMaybe_(1, { text: 'سلام، لطفاً اطلاعات صفحه را کامل کنید', message_id: 3 }, 'یاسر', '');
    ok('پیام به مدیر رسید با دکمهٔ پاسخ', OUT().indexOf('"chat":"700"') > -1 && OUT().indexOf('ms:r:') > -1);
    TG_OUTBOX = []; ptCb_({}, 'ry:mashhad', 1, '', '');
    ok('چک‌لیست فعال‌سازی هشت مورد دارد', ptReady_('mashhad').length === 8 && OUT().indexOf('صفحهٔ سایت منتشر') > -1);
    ok('یادآوری: فیلدهای خالی تک‌تک', ptNudgeText_(tgPaByCode_('mashhad')).indexOf('▫️ لینک گوگل مپ') > -1);
    TG_OUTBOX = []; TG_MEM['msggrp'] = { desk: [{ chat: '368', name: 'پذیرش' }] };
    ptSaySave_(700, 'اتاق دوم آماده شد');
    ok('پیام پارتنر به پذیرش با دکمهٔ پاسخ و نام فضا', OUT().indexOf('"chat":"368"') > -1 && OUT().indexOf('ms:r:') > -1 && OUT().indexOf('پارتنر') > -1);
    ok('متن‌های تازه خط تیره ندارند', (ptNudgeText_(tgPaByCode_('mashhad')) + JSON.stringify(ptReady_('mashhad'))).indexOf('—') < 0);
  } catch (e) { fail++; out.push('❌ خطا: ' + (e.message || e) + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')); }
  TG_DRY = was; TG_OUTBOX = []; TG_MEM = {};
  return { pass: pass, fail: fail, text: out.join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'ptTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['تجربه پارتنرز ۲', 'ptTests']); } catch (ePt5) {}

/* ═══════════ پیام یک‌باره ۲ مهر ۱۴۰۵ (با اجازهٔ یاسر): مدیرهای کرج، اصفهان، نور و درمانگرهای همان شهرها. بعد از ارسال پاک شود ═══════════ */
/* v170.14: نام و متن گیرنده‌ها در کد نیست؛ کلید اختیاری PT_M0924 ({mgr, ther})، پیام ۲ مهر فرستاده شده است */
var PT_M0924 = (function (o) { o = o || {}; return { mgr: o.mgr || [], ther: o.ther || [] }; })(cfg_('PT_M0924', {}));
function ptM0924MgrText_(m, o) {
  var miss = ptFieldsFor_(o).filter(function (f) { return !String(o[f.col] || '').trim(); }).map(function (f) { return f.col; });
  var t = '🌱 سلام ' + tgEsc_(m.name) + '، وقت بخیر\n\n' +
    'صفحهٔ <b>' + tgEsc_(ptName_(o)) + '</b> روی سایت تجربه منتشر شد:\n' + m.url + '\n\n' +
    'مراجعی که دنبال درمان حضوری در ' + tgEsc_(m.city) + ' است، پیش از تصمیم همین صفحه را می‌خواند؛ گوگل هم از همین اطلاعات می‌فهمد فضای شما کجاست و برای چه کسی است. <b>هرچه اطلاعات کامل‌تر باشد، درخواست بیشتری می‌رسد.</b>\n\n' +
    (m.extra ? m.extra + '\n\n' : '') +
    '<b>از «🏢 میز پارتنر» این کارها مانده:</b>\n' +
    '۱. «🌐 تکمیل صفحه»' + (miss.length ? '، این‌ها هنوز خالی است: ' + tgEsc_(miss.join('، ')) : '') + '\n' +
    '۲. «🚪 اتاق‌ها»: روزها و ساعت باز بودن هر اتاق. این ساعت‌ها هر هفته تکرار می‌شوند تا خودتان عوضشان کنید.\n' +
    '۳. اگر روزی بسته بودید، «📅 بستن یک روز» با یک دکمه به درمانگرها خبر می‌دهد.\n\n' +
    '<b>منشی یا مسئول پذیرش دارید؟</b> این لینک را برایش بفرستید تا به میز فضای شما وصل شود. برنامه، روز بسته و مراجعان را می‌بیند، ولی بخش مالی را نه:\n' +
    ptLink_('pts-' + m.code + '-p-' + ptTok_(m.code + '|p'));
  if (m.ther) t += '\n\nاگر خودتان هم در این فضا حضوری مراجع می‌بینید، از «' + TG_INP_BTN + '» ساعت‌هایتان را ثبت کنید تا روی کارت شما در سایت نشان «حضوری در ' + tgEsc_(m.city) + '» بیاید. اگر نه، کاری لازم نیست.';
  return t;
}
function ptM0924TherText_(x) {
  return '🏢 سلام ' + tgEsc_(x.name.split(' ')[0]) + ' جان، وقت بخیر\n\n' +
    tgEsc_(x.place) + ' حالا روی سایت تجربه صفحهٔ خودش را دارد:\n' + x.url + '\n\n' +
    'اگر دوست دارید در ' + tgEsc_(x.city) + ' حضوری هم مراجع ببینید، دکمهٔ زیر را بزنید و روز و ساعت پیشنهادی‌تان را بفرستید. پذیرش تجربه هماهنگ و تأیید می‌کند؛ بعد از آن روی کارت شما در سایت نشان «حضوری در ' + tgEsc_(x.city) + '» می‌آید و مراجعان آن شهر به شما هم معرفی می‌شوند.\n\n' +
    'همین کار را هر وقت خواستید از «' + TG_INP_BTN + '» هم می‌توانید بکنید.';
}
function ptMsg0924(send) {
  var out = [];
  PT_M0924.mgr.forEach(function (m) {
    var o = ptPlace_(m.code); if (!o) { out.push('⚠️ ' + m.code + ' پیدا نشد'); return; }
    var to = ptChats_(o['chat_id مسئول'])[0]; if (!to) { out.push('⚠️ ' + m.code + ' chat ندارد'); return; }
    var txt = ptM0924MgrText_(m, o);
    if (!send) { out.push('• مدیر ' + m.code + ' → ' + to + '\n' + txt); return; }
    tgSend_(to, txt, ptKb_([[ptB_('🌐 تکمیل صفحه', 'fn')], [ptB_('🚪 اتاق‌ها', 'rm'), ptB_('👥 تیم من', 'tm')], [ptB_('🏢 میز پارتنر', 'dk')]]));
    try { tgPaSet_(o._row, 'آخرین یادآوری تکمیل', ptNow_()); } catch (e) {}
    out.push('✅ مدیر ' + m.code + ' → ' + to);
  });
  PT_M0924.ther.forEach(function (x) {
    var to = tgTherChatByName_(x.name); if (!to) { out.push('⚠️ ' + x.name + ' به بات وصل نیست'); return; }
    var txt = ptM0924TherText_(x);
    if (!send) { out.push('• درمانگر ' + x.name + ' → ' + to + '\n' + txt); return; }
    tgSend_(to, txt, { inline_keyboard: [[{ text: '🤝 درخواست ساعت حضوری در ' + x.city, callback_data: 'iq:ap:' + x.code }], [{ text: '👀 دیدن صفحه', url: x.url }]] });
    out.push('✅ درمانگر ' + x.name + ' → ' + to);
  });
  Logger.log(out.join('\n\n'));
  return out;
}
function ptMsg0924Preview() { return ptMsg0924(false); }
function ptMsg0924Send() { return ptMsg0924(true); }



/* ═══════════ v144 · ۶ مهر ۱۴۰۵: مراجع هفتگی هر ساعت حضوری (اشغال کلینیک گاندی) ═══════════
   یاسر: «خود تراپیست در آن ساعات نام مراجعی که هر هفته در آن اتاق می‌بیند را وارد کند و هر تغییری را در بات اعلام کند؛ ساده و راحت.»
   داده: تب «اشغال هفتگی گاندی» در هاب پذیرش؛ هر ردیف یک ساعت از یک اتاق.
   ستون‌ها: روز، اتاق، ساعت، درمانگر، نام کامل مراجع هفتگی، وضعیت، از تاریخ، یادداشت، یادداشت ساعت، آخرین تغییر.
   مسیر درمانگر: «🏢 حضوری من» ← «👥 مراجع هر ساعت» ← یک ساعت ← «✍️ نام مراجع» یا «⬜ خالی است».
   هر تغییر به پذیرش (ژیلا) خبر داده می‌شود. نام مراجع فقط در همین تب و همین پیام‌ها می‌ماند. */
var TG_OCC_TAB = 'اشغال هفتگی گاندی';
var TG_OCC_FIRST = 3; // ردیف ۱ عنوان، ردیف ۲ سرستون

function tgOccRows_() {
  if (TG_DRY) return (TG_MEM['occ'] || []).map(function (r, i) { return { row: i + TG_OCC_FIRST, v: r }; });
  var sh = tgSS_().getSheetByName(TG_OCC_TAB);
  if (!sh || sh.getLastRow() < TG_OCC_FIRST) return [];
  var v = sh.getRange(TG_OCC_FIRST, 1, sh.getLastRow() - TG_OCC_FIRST + 1, 10).getDisplayValues();
  return v.map(function (r, i) { return { row: i + TG_OCC_FIRST, v: r }; });
}
function tgOccMine_(name) {
  return tgOccRows_().filter(function (x) { return x.v[3] && tgInpIsMe_(x.v[3], name); });
}
function tgOccKey_(v) { return [v[0], v[1], v[2]].join('|'); }
function tgOccMark_(v) {
  var s = String(v[5] || '');
  if (s === 'پر' && v[4]) return '👤 ' + v[4];
  if (s === 'خالی') return '⬜ خالی';
  return '❔ ثبت نشده';
}
function tgOccLabel_(v) { return v[0] + ' · اتاق ' + tgFa_(v[1]) + ' · ' + tgFa_(v[2]); }

/* فهرست ساعت‌های خود درمانگر */
function tgOccList_(chat, who) {
  var mine = tgOccMine_(who.name);
  if (!mine.length) return tgSend_(chat, 'در جدول اشغال کلینیک گاندی هنوز ساعتی به اسم شما نیست. اگر در گاندی اتاق دارید، به پذیرش بگویید تا ساعتتان را ثبت کند.');
  var left = mine.filter(function (x) { return !x.v[5] || x.v[5] === 'نامشخص'; }).length;
  var t = '👥 <b>مراجع‌های هفتگی شما در کلینیک گاندی</b>\n\nبرای هر ساعت بنویسید چه کسی هر هفته می‌آید، یا بزنید خالی است. هر وقت تغییری شد (مراجع تازه، پایان درمان، جابه‌جایی) همین‌جا عوضش کنید؛ پذیرش خودکار خبردار می‌شود.\n\nنام مراجع فقط برای پذیرش ثبت می‌شود و جای دیگری نمی‌رود.';
  if (left) t += '\n\n❔ ' + tgFa_(left) + ' ساعت هنوز ثبت نشده است.';
  var kb = mine.map(function (x) {
    var lab = tgOccLabel_(x.v) + ' ← ' + tgOccMark_(x.v);
    return [{ text: lab.length > 60 ? lab.slice(0, 58) + '…' : lab, callback_data: 'iq:ox:' + x.row }];
  });
  if (left) kb.push([{ text: '⬜ همهٔ ثبت‌نشده‌ها خالی است', callback_data: 'iq:oa' }]);
  return tgSend_(chat, t, { inline_keyboard: kb });
}
function tgOccGet_(row, name) {
  var hit = null;
  tgOccRows_().forEach(function (x) { if (x.row === Number(row) && tgInpIsMe_(x.v[3], name)) hit = x; });
  return hit;
}
/* نوشتن یک ساعت و خبر به پذیرش */
function tgOccSet_(who, x, client, quiet) {
  var before = tgOccMark_(x.v), now = tgInpNow_();
  var st = client ? 'پر' : 'خالی';
  var since = (client && client !== x.v[4]) ? now : (client ? x.v[6] : '');
  var stamp = 'درمانگر · ' + now;
  if (TG_DRY) { var m = TG_MEM['occ'][x.row - TG_OCC_FIRST]; m[4] = client; m[5] = st; m[6] = since; m[9] = stamp; }
  else tgSS_().getSheetByName(TG_OCC_TAB).getRange(x.row, 5, 1, 6).setValues([[client, st, since, x.v[7] || '', x.v[8] || '', stamp]]);
  x.v[4] = client; x.v[5] = st; x.v[6] = since;
  var after = tgOccMark_(x.v);
  if (!quiet && before !== after) tgInpDeskSay_('👥 <b>اشغال گاندی · تغییر</b>\n' + tgEsc_(who.name) + '\n' + tgEsc_(tgOccLabel_(x.v)) + '\nقبل: ' + tgEsc_(before) + '\nحالا: ' + tgEsc_(after));
  return after;
}
/* دکمه‌ها: ox (یک ساعت)، on (نوشتن نام)، oe (خالی)، oa (همه خالی) */
function tgOccCb_(chat, who, a) {
  if (a[0] === 'oc') return tgOccList_(chat, who);
  if (a[0] === 'oa') {
    var n = 0, names = [];
    tgOccMine_(who.name).forEach(function (x) { if (!x.v[5] || x.v[5] === 'نامشخص') { tgOccSet_(who, x, '', true); n++; names.push(tgOccLabel_(x.v)); } });
    if (n) tgInpDeskSay_('👥 <b>اشغال گاندی</b>\n' + tgEsc_(who.name) + ' این ' + tgFa_(n) + ' ساعت را خالی اعلام کرد:\n' + tgEsc_(names.join('\n')));
    tgSend_(chat, '✅ ' + tgFa_(n) + ' ساعت خالی ثبت شد.');
    return tgOccList_(chat, who);
  }
  var x = tgOccGet_(a[1], who.name);
  if (!x) return tgOccList_(chat, who);
  if (a[0] === 'ox') return tgSend_(chat, '🕘 <b>' + tgEsc_(tgOccLabel_(x.v)) + '</b>\nالان: ' + tgEsc_(tgOccMark_(x.v)) + (x.v[6] ? '\nاز: ' + tgEsc_(x.v[6]) : ''),
    { inline_keyboard: [[{ text: '✍️ نام مراجع', callback_data: 'iq:on:' + x.row }, { text: '⬜ خالی است', callback_data: 'iq:oe:' + x.row }], [{ text: '↩️ همهٔ ساعت‌ها', callback_data: 'iq:oc' }]] });
  if (a[0] === 'oe') { tgOccSet_(who, x, ''); tgSend_(chat, '✅ ثبت شد: ' + tgEsc_(tgOccLabel_(x.v)) + ' خالی است.'); return tgOccList_(chat, who); }
  if (a[0] === 'on') {
    tgSetVal_('inpreq', chat, JSON.stringify({ k: 'occ', row: x.row, key: tgOccKey_(x.v) }));
    return tgSend_(chat, 'نام و نام خانوادگی کامل مراجعی را بنویسید که هر هفته در این ساعت می‌آید:\n' + tgEsc_(tgOccLabel_(x.v)) + '\n\nبرای انصراف «بازگشت» را بنویسید.');
  }
  return tgOccList_(chat, who);
}
/* متن آزاد: نام مراجع. true یعنی پیام مصرف شد */
function tgOccText_(chat, who, st, text) {
  var name = String(text || '').replace(/\s+/g, ' ').trim();
  if (name.length < 3 || name.length > 60) { tgSend_(chat, 'نام کامل مراجع را بنویسید، مثلاً: سارا محمدی'); return true; }
  tgDel_('inpreq', chat);
  var x = tgOccGet_(st.row, who.name);
  if (!x || tgOccKey_(x.v) !== st.key) { tgSend_(chat, 'این ساعت در جدول جابه‌جا شده است. دوباره از فهرست انتخاب کنید.'); tgOccList_(chat, who); return true; }
  tgOccSet_(who, x, name);
  tgSend_(chat, '✅ ثبت شد: ' + tgEsc_(tgOccLabel_(x.v)) + ' ← ' + tgEsc_(name));
  tgOccList_(chat, who);
  return true;
}

function tgOccTests() {
  var pass = 0, fail = 0, out = [];
  function ok(n, c) { if (c) { pass++; out.push('✅ ' + n); } else { fail++; out.push('❌ ' + n); } }
  var was = TG_DRY; TG_DRY = true; TG_OUTBOX = []; TG_MEM = {};
  function said() { return TG_OUTBOX.map(function (x) { return (x.text || '') + ' ' + JSON.stringify(x.markup || ''); }).join('\n'); }
  try {
    TG_MEM['desk'] = [{ name: 'ژیلا', chat: '500' }];
    TG_MEM['occ'] = [
      ['شنبه', '۲', '9 تا 10', 'الف ب', '', 'نامشخص', '', '', '', ''],
      ['شنبه', '۲', '10 تا 11', 'الف ب', '', 'نامشخص', '', '', '', ''],
      ['یکشنبه', '۳', '9 تا 10', 'پ ت', 'مراجع قدیمی', 'پر', '', '', '', '']];
    var who = { name: 'الف ب' };
    tgOccList_(1, who);
    ok('فهرست فقط ساعت‌های خود درمانگر', said().indexOf('iq:ox:3') > -1 && said().indexOf('iq:ox:4') > -1 && said().indexOf('iq:ox:5') < 0);
    ok('شمار ثبت‌نشده‌ها و دکمهٔ همه خالی', said().indexOf('۲ ساعت') > -1 && said().indexOf('iq:oa') > -1);
    TG_OUTBOX = []; tgOccCb_(1, who, ['on', '3']);
    ok('نوشتن نام: حالت انتظار ثبت شد', JSON.parse(tgGetVal_('inpreq', 1)).k === 'occ');
    TG_OUTBOX = []; tgOccText_(1, who, JSON.parse(tgGetVal_('inpreq', 1)), 'سارا محمدی');
    ok('نام در جدول نشست', TG_MEM['occ'][0][4] === 'سارا محمدی' && TG_MEM['occ'][0][5] === 'پر');
    ok('پذیرش خبر شد', (TG_MEM['notify'] || []).concat(TG_OUTBOX).some(function (m) { return String(m.chat) === '500' && m.text.indexOf('سارا محمدی') > -1; }));
    ok('حالت انتظار پاک شد', !tgGetVal_('inpreq', 1));
    TG_OUTBOX = []; tgOccCb_(1, who, ['oe', '3']);
    ok('خالی کردن', TG_MEM['occ'][0][4] === '' && TG_MEM['occ'][0][5] === 'خالی');
    TG_OUTBOX = []; tgOccCb_(1, { name: 'غریبه' }, ['oe', '5']);
    ok('ساعت دیگران دست نمی‌خورد', TG_MEM['occ'][2][4] === 'مراجع قدیمی');
    TG_OUTBOX = []; tgOccCb_(1, who, ['oa']);
    ok('همه خالی: فقط ثبت‌نشده‌ها', TG_MEM['occ'][1][5] === 'خالی' && TG_MEM['occ'][2][5] === 'پر');
    TG_OUTBOX = []; ok('نام کوتاه پذیرفته نمی‌شود', tgOccText_(1, who, { k: 'occ', row: 3, key: 'x' }, 'ع') === true && said().indexOf('نام کامل') > -1);
  } catch (e) { fail++; out.push('❌ خطا: ' + e); }
  TG_DRY = was;
  return { pass: pass, fail: fail, text: out.join('\n') };
}
try { TG_SUITES.push(['اشغال گاندی (v144)', 'tgOccTests']); } catch (eSu) {}
