/**
 * ws.gs · v170.78 · موتور میز کار (/desk/ روی tajrobeh.life)
 *
 * چرا: هر فرایند تازهٔ تیم (مجله، سوشال، مدرسه، رویداد) تا امروز کد تازه می‌خواست. این موتور سه کار را عمومی می‌کند
 * و هر فرایند تازه فقط چند سطر در سه برگهٔ هاب تجربه است، نه کد:
 *   ۱. همگام‌سازی: برگهٔ «میز کار · همگام‌سازی». هر سطر یک مجموعه (set) است: فایل، برگه، ستون‌های مجاز، ستون کلید، هر چند دقیقه.
 *      فقط ستون‌های مجاز خوانده می‌شوند، ستون یا مقداری که شبیه دادهٔ شخصی باشد خودکار کنار می‌رود، هش گرفته می‌شود و
 *      فقط اگر عوض شده باشد با امضا به tj/v1/ws-sync می‌رود. هش آخر در Script Properties.
 *   ۲. رویدادها: برگهٔ «میز کار · رویدادها». کنش‌های میز (take، submitted، so_go و …) از tj/v1/ws-outbox (op: pull) می‌آیند؛
 *      هر act یک قاعده است: نوشتن در برگه با کلید + پیام بات به نقش. act بی‌پیکربندی در «میز کار · بی‌صاحب» ثبت می‌شود.
 *      ack فقط برای موفق‌ها. id اجراشده‌ها نگه داشته می‌شود تا اجرای دوباره اثری نداشته باشد.
 *   ۳. سنجش: برگهٔ «سنجش · کارها». هر سطر یک کار با نوع منبع (WS_SRC). نوع تازه = یک تابع، کار تازه = یک سطر.
 *      نتیجه فقط به برگهٔ مقصد افزوده می‌شود (با تاریخ) و خلاصهٔ ۹۰ روز آخر با set مقصد (mx_…) می‌رود. هیچ بخشی به هوش مصنوعی وابسته نیست.
 *   به‌علاوه: ترکر مهلت‌ها (۹ صبح تهران)، پیام روزانهٔ تصمیم‌های منتظر برای مدیر، و برگهٔ «میز کار · سلامت» (set = ws_health).
 *
 * امضا (deskPost، deskLink): HMAC-SHA256 با کلید Script Property «TG_DIR_KEY» (همان کلید جفت‌شدهٔ tj/v1/dir).
 * هیچ کلید یا توکنی در کد، لاگ، پیام یا برگه نمی‌آید. توکن اینستاگرام هم فقط از Script Properties خوانده می‌شود.
 * خواندن دایرکت‌ها ممنوع است؛ هیچ منبعی به اندپوینت گفت‌وگوها دست نمی‌زند.
 *
 * تریگر: فقط wsTick هر ۵ دقیقه (wsSetup می‌سازدش). کارهای روزانه و ساعتی و ۹ صبح داخل همین تریگر زمان‌بندی می‌شوند.
 * قلاب‌ها در telegram.gs: tgRoleRow_ (wsMenuRow_)، tgMyRoles_ (WS_CUR)، tgPrivate_ (wsRoute_). تست: wsTests در TG_SUITES.
 */

var WS_SITE = 'https://tajrobeh.life';
var WS_API = WS_SITE + '/wp-json/tj/v1/';
var WS_DESK_URL = WS_SITE + '/desk/';
var WS_LINK_DAYS = 7;
var WS_BTN = '🗂 میز کار';
var WS_MAX_ROWS = 3000;
var WS_MAX_BYTES = 1500000;
var WS_SET_RE = /^(mag|ws|so|ig|ev|sc|mx)_[a-z0-9_]{1,40}$/;
/* نقش‌هایی که «عضو تیم» حساب نمی‌شوند؛ دکمهٔ میز کار و ws_people فقط برای بقیه */
var WS_NO_TEAM = ['مراجع', 'دانشجو', 'نمایندهٔ کلاس'];
var WS_MANAGER = 'مدیر';         /* در «پیام به چه نقشی»: chat مالک (TG_OWNER_CHAT) */
var WS_PULL_LIMIT = 50;
var WS_DONE_KEEP = 200;          /* چند id اجراشدهٔ آخر نگه داشته شود (سقف هر Script Property حدود ۹KB است) */
var WS_TRY_MAX = 5;              /* رویدادی که این‌قدر شکست بخورد دیگر امتحان نمی‌شود و در «بی‌صاحب» ثبت می‌شود */
var WS_TEAM_TEXT = '[متن از تیم]';
var WS_STAMP = '{now}';
var WS_SUM_DAYS = 90;
var WS_DAILY_HOUR = 9;           /* ترکر و پیام تصمیم‌ها: ساعت ۹ تهران */

/* ---------- برگه‌های پیکربندی (هاب تجربه) ---------- */
var WS_T_SYNC = 'میز کار · همگام‌سازی';
var WS_SYNC_HEAD = ['set', 'شناسهٔ فایل', 'نام برگه', 'ستون‌های مجاز', 'ستون کلید', 'هر چند دقیقه', 'فعال'];
var WS_T_ACT = 'میز کار · رویدادها';
var WS_ACT_HEAD = ['act', 'شناسهٔ فایل', 'برگهٔ مقصد', 'ستون کلید', 'ستون‌ها و مقدارها', 'پیام به چه نقشی', 'متن کوتاه پیام', 'نقش مجاز', 'کار ویژه', 'فعال', 'دکمهٔ میز'];
var WS_T_JOB = 'سنجش · کارها';
var WS_JOB_HEAD = ['job', 'نوع منبع', 'پارامترها', 'برنامه', 'برگهٔ مقصد', 'set مقصد', 'فعال'];
var WS_T_DUE = 'میز کار · مهلت‌ها';
var WS_DUE_HEAD = ['نوع', 'set', 'ستون مرحله', 'مرحله', 'ستون زمان', 'سقف روز', 'نقش مسئول', 'فعال'];
var WS_T_ORPHAN = 'میز کار · بی‌صاحب';
var WS_ORPHAN_HEAD = ['زمان', 'id', 'act', 'کلید', 'از طرف', 'علت'];
var WS_T_HEALTH = 'میز کار · سلامت';
var WS_HEALTH_HEAD = ['کار', 'آخرین اجرا', 'مدت (ثانیه)', 'نتیجه', 'شکست پشت‌سرهم', 'تلاش بعدی', 'هشدار', 'پیام'];

/* شناسهٔ فایل: نام هاب (از تنظیمات خصوصی cfg_) یا شناسهٔ خام. «بات» یعنی منبع درونی (WS_BUILTIN). */
var WS_FILES = { 'هاب تجربه': 'TG_SHEET_ID', 'هاب محتوا': 'TG_CONTENT_SHEET_ID', 'هاب آمار': 'TG_STAT_SHEET_ID', 'هاب مدرسه': 'TG_SCHOOL_SHEET_ID' };

/* ستون‌ها و برگه‌هایی که هرگز فرستاده نمی‌شوند، حتی اگر در فهرست مجاز نوشته شده باشند */
var WS_DENY_COL = /(شمار[هۀ]ٔ?\s*(تماس|تلفن|موبایل|همراه)|تلفن|موبایل|همراه|phone|mobile|tel\b|ایمیل|e-?mail|کد\s*ملی|national|chat_?id|یوزرنیم|username|آدرس\s*منزل|شرح\s*حال|بالینی|clinical|تشخیص|diagnos|دارو|پروندهٔ?\s*درمان|یادداشت\s*(درمان|جلسه))/i;
var WS_DENY_TAB = /(لید|CRM|جلسه‌های درمان|پرونده|کارتابل|پیام‌های درمانگران|اپلای|مالی|پرداخت|تنخواه|دایرکت‌های|inbox|گفت‌وگو)/i;

var WS_SYNC_SEED = [
  ['mag_topics', 'هاب محتوا', 'موضوعات مجله', 'کد,موضوع,زاویه یا توضیح,دسته,وضعیت,نویسنده,تاریخ انتشار,آخرین تغییر میز', 'کد', 15, 'بله'],
  ['mag_writers', 'هاب محتوا', 'نویسندگان مجله', 'شماره,تاریخ ثبت,نام,نقش,کد موضوع,موضوع,وضعیت,موعد تحویل,تاریخ انتشار,لینک مطلب منتشرشده,موعد تحویل (شمسی),تاریخ انتشار (شمسی),آخرین تغییر میز', 'شماره', 10, 'بله'],
  ['ws_people', 'بات', 'اعضای تیم', 'w,name,roles', 'w', 60, 'بله'],
  ['so_queue', 'هاب محتوا', 'سوشال · صف ارسال', 'کد,برای,تاریخ شمسی,ساعت,متن (HTML),دکمه (متن|لینک),وضعیت,زمان ارسال,یادداشت,سازنده,آخرین تغییر میز', 'کد', 5, 'بله'],
  ['so_calendar', 'هاب محتوا', 'سوشال · تقویم', 'کد,تاریخ شمسی,ساعت,تاریخ میلادی,کانال,قالب,عنوان,مسئول,وضعیت,لینک رهگیری,کمپین,انجام‌دهنده,آخرین تغییر میز', 'کد', 10, 'بله'],
  ['so_links', 'هاب محتوا', 'سوشال · لینک‌ها', 'کد,پیج,کاربرد,لینک کوتاه,لینک کامل,مقصد,کمپین,کد U', 'کد', 30, 'بله'],
  /* فقط قالب پاسخ‌های دایرکتم و نسخه‌هایش؛ هیچ گفت‌وگویی خوانده نمی‌شود */
  ['so_dm', 'هاب محتوا', 'سوشال · دایرکتم', 'کد,پیج,بخش دایرکتم,کلیدواژه یا دکمه,مقصد,لینک دقیق (با UTM),کد رهگیری,وضعیت,نسخه,یادداشت', 'کد', 30, 'بله'],
  ['so_dm_versions', 'هاب محتوا', 'سوشال · دایرکتم نسخه‌ها', 'نسخه,تاریخ,پیج,چه تغییر کرد,چرا,انجام‌دهنده,با چه سنجه‌ای مقایسه شود', 'نسخه', 60, 'بله'],
  ['so_reels', 'هاب محتوا', 'سوشال · سنجش ریل‌ها', 'کد بسته,پیج,تاریخ شمسی,ساعت,قالب,فیلم,مقاله,قلاب (خط اول),طول (ث),trial,شناسهٔ مدیا,لینک,views ۲۴س,reach ۲۴س,avg watch (ث) ۲۴س,shares ۲۴س,saves ۲۴س,likes ۲۴س,comments ۲۴س,follows ۲۴س,views ۷۲س,reach ۷۲س,avg watch ۷۲س,shares ۷۲س,follows ۷۲س,کلیک تلگرام (GA4),یادداشت و درس', 'کد بسته', 30, 'بله'],
  ['ig_daily', 'هاب آمار', 'اینستاگرام · روزانه', 'تاریخ,پیج,ریچ,نمایش,اکانت درگیر,تعامل,کلیک دکمه‌های پروفایل,کلیک لینک بیو,فالوور', 'تاریخ', 360, 'بله']
];

/* ستون‌ها و مقدارها: «ستون=مقدار» با «؛» یا خط تازه. {now} زمان، {by} نام کننده، {key} کلید، {data.x} فیلد رویداد.
   پیام به چه نقشی: نام نقش‌ها با کاما، «مدیر»، «@ستون» یعنی chat همان سطر، یا «@data.x» یعنی chat فیلد x رویداد
   (فقط اگر آن chat در برگهٔ افراد فعال باشد). «الف|ب» یعنی اگر «الف» گیرنده‌ای نداشت، «ب». ستون کلید خالی یعنی سطر تازه افزوده شود. */
var WS_ACT_SEED = [
  /* سایت الان این پنج را می‌فرستد. متن‌ها از تیم (۲۴ مهر ۱۴۰۵)؛ {title} عنوان مطلب از data.title */
  ['take', 'هاب محتوا', 'موضوعات مجله', 'کد', 'نویسنده={by}؛ وضعیت=رزرو شد؛ آخرین تغییر میز={now}', 'سردبیر', 'موضوع «{title}» برداشته شد.', '', '', 'بله', 'خیر'],
  ['submitted', 'هاب محتوا', 'نویسندگان مجله', 'شماره', 'وضعیت=تحویل شد؛ لینک متن={data.doc}؛ آخرین تغییر میز={now}', 'سردبیر', 'مطلب «{title}» برای بازبینی رسید.', '', '', 'بله', 'بله'],
  ['returned', 'هاب محتوا', 'نویسندگان مجله', 'شماره', 'وضعیت=در حال نوشتن؛ یادداشت سردبیر={data.note}؛ آخرین تغییر میز={now}', '@chat_id', 'مطلب «{title}» با یادداشت سردبیر برگشت.', 'سردبیر', '', 'بله', 'بله'],
  ['to_clinical', 'هاب محتوا', 'نویسندگان مجله', 'شماره', 'وضعیت=بازبینی علمی؛ آخرین تغییر میز={now}', '@data.reviewer_w|سردبیر', 'مطلب «{title}» برای بازبینی علمی آماده است.', 'سردبیر', '', 'بله', 'بله'],
  ['propose', 'هاب محتوا', 'موضوعات مجله', '', 'کد={data.code}؛ موضوع={data.title}؛ زاویه یا توضیح={data.angle}؛ وضعیت=پیشنهاد؛ نویسنده={by}؛ آخرین تغییر میز={now}', 'سردبیر', 'پیشنهاد موضوع تازه: «{title}»', '', '', 'بله', 'بله'],
  /* سایت «decided» را نمی‌فرستد؛ خاموش */
  ['decided', 'هاب محتوا', 'نویسندگان مجله', 'شماره', 'وضعیت={data.status}؛ یادداشت سردبیر={data.note}؛ آخرین تغییر میز={now}', '@chat_id', WS_TEAM_TEXT, 'سردبیر', '', 'خیر', 'خیر'],
  /* so_*: بعد از ساخت صفحه‌های سوشال میز می‌آیند؛ تا آن وقت پیکربندی آماده است و چیزی اجرا نمی‌شود */
  ['so_go', 'هاب محتوا', 'سوشال · صف ارسال', 'کد', 'وضعیت=برو؛ آخرین تغییر میز={now}', 'سوشال', WS_TEAM_TEXT, 'ناظر,راهبر', '', 'بله', 'خیر'],
  ['so_hold', 'هاب محتوا', 'سوشال · صف ارسال', 'کد', 'وضعیت=نگه دار؛ یادداشت={data.note}؛ آخرین تغییر میز={now}', 'سوشال', WS_TEAM_TEXT, 'ناظر,راهبر', '', 'بله', 'خیر'],
  ['so_sticker_done', 'هاب محتوا', 'سوشال · تقویم', 'کد', 'وضعیت=استیکر آماده شد؛ آخرین تغییر میز={now}', 'سوشال', WS_TEAM_TEXT, '', '', 'بله', 'خیر'],
  ['so_link_new', 'هاب محتوا', 'سوشال · لینک‌ها', '', 'کد={data.code}؛ پیج={data.page}؛ کاربرد={data.use}؛ مقصد={data.dest}؛ کمپین={data.campaign}', 'سوشال', WS_TEAM_TEXT, '', '', 'بله', 'خیر'],
  ['so_dm_edit', 'هاب محتوا', 'سوشال · دایرکتم', 'کد', 'وضعیت=ویرایش شد؛ نسخه={data.version}؛ یادداشت={data.note}', 'ناظر', WS_TEAM_TEXT, '', '', 'بله', 'خیر'],
  ['so_dm_applied', 'هاب محتوا', 'سوشال · دایرکتم', 'کد', 'وضعیت=اعمال شد', 'سوشال', WS_TEAM_TEXT, '', '', 'بله', 'خیر'],
  ['so_sugg', 'هاب محتوا', 'سوشال · تقویم', '', 'کد={data.code}؛ عنوان={data.title}؛ قالب={data.format}؛ وضعیت=پیشنهاد؛ انجام‌دهنده={by}؛ آخرین تغییر میز={now}', 'ناظر', WS_TEAM_TEXT, '', '', 'بله', 'خیر'],
  /* بند ۸: اختیاری. نبودن تابعشان فقط همان رویداد را در «بی‌صاحب» می‌نشاند، موتور نمی‌ایستد. */
  ['gem_seo', '', '', '', '', '', '', 'سردبیر,ناظر', 'gem_seo', 'خیر', 'خیر'],
  ['channel_post', 'هاب محتوا', 'سوشال · صف ارسال', 'کد', 'وضعیت=در صف؛ آخرین تغییر میز={now}', 'سوشال', WS_TEAM_TEXT, 'ناظر,راهبر', 'channel_post', 'خیر', 'خیر'],
  ['digest_send', '', '', '', '', '', '', 'ناظر,راهبر', 'digest_send', 'خیر', 'خیر'],
  ['voice_tx', '', '', '', '', '', '', '', 'voice_tx', 'خیر', 'خیر']
];

/* پارامترها «کلید=مقدار؛ …». برنامه: «روزانه» (با ساعت اختیاری مثل «روزانه ۷»)، «ساعتی»، یا «بعد از رویداد + ۲۴ و ۷۲ ساعت». */
var WS_JOB_SEED = [
  ['ig_account', 'ig_account', 'توکن=IG_GRAPH_TOKEN؛ حساب‌ها=IG_ACCOUNTS', 'روزانه ۷', 'سنجش · اینستاگرام روزانه', 'mx_ig_daily', 'بله'],
  ['ig_media', 'ig_media', 'توکن=IG_GRAPH_TOKEN؛ حساب‌ها=IG_ACCOUNTS؛ صف=so_queue', 'بعد از رویداد + ۲۴ و ۷۲ ساعت', 'سنجش · ریل و پست', 'mx_reels', 'بله'],
  ['go_clicks', 'go_clicks', 'مسیر=go-stats؛ روز=90', 'روزانه ۶', 'سنجش · کلیک go', 'mx_go', 'بله'],
  ['wp_posts', 'wp_posts', 'تعداد=50', 'روزانه ۵', 'سنجش · مطالب مجله', 'mx_posts', 'بله'],
  ['desk_flow', 'desk_flow', 'set=mag_writers,so_queue؛ ستون مرحله=وضعیت؛ ستون زمان=آخرین تغییر میز', 'روزانه ۸', 'سنجش · روند میز', 'mx_flow', 'بله']
];

/* نوع «مهلت»: سطری که بیش از «سقف روز» در «مرحله» مانده، پیام به «نقش مسئول»؛ دو برابر، به مدیر.
   نوع «تصمیم»: سطرهای منتظر تصمیم انسانی در این مرحله، فقط در پیام روزانهٔ مدیر شمرده می‌شوند. */
var WS_DUE_SEED = [
  ['مهلت', 'mag_writers', 'وضعیت', 'در انتظار سردبیر', 'آخرین تغییر میز', 3, 'سردبیر', 'بله'],
  ['مهلت', 'mag_writers', 'وضعیت', 'تحویل شد', 'آخرین تغییر میز', 5, 'سردبیر', 'بله'],
  ['مهلت', 'mag_writers', 'وضعیت', 'بازبینی علمی', 'آخرین تغییر میز', 7, 'سردبیر', 'بله'],
  ['مهلت', 'mag_writers', 'وضعیت', 'در حال نوشتن', 'آخرین تغییر میز', 21, 'سردبیر', 'بله'],
  ['مهلت', 'so_queue', 'وضعیت', 'نگه دار', 'آخرین تغییر میز', 3, 'سوشال', 'بله'],
  ['تصمیم', 'so_queue', 'وضعیت', 'منتظر برو', '', '', '', 'بله'],
  ['تصمیم', 'mag_writers', 'وضعیت', 'در انتظار سردبیر', '', '', '', 'بله'],
  ['تصمیم', 'mag_topics', 'وضعیت', 'پیشنهاد', '', '', '', 'بله'],
  ['تصمیم', 'so_calendar', 'وضعیت', 'پیشنهاد', '', '', '', 'بله']
];

/* ======================= کمکی ======================= */
var WS_CUR = '';          /* chat همین اجرا؛ tgMyRoles_ می‌گذارد تا wsMenuRow_ بداند دکمه را نشان دهد یا نه */
var WS_FAKE_HTTP = null;  /* فقط تست: function (url, opts) → { code, body } */
var WS_NOW = 0;           /* فقط تست: زمان ثابت (ms) */

function wsDry_() { return typeof TG_DRY !== 'undefined' && !!TG_DRY; }
function wsNow_() { return WS_NOW ? new Date(WS_NOW) : new Date(); }
function wsS_(v) { return String(v == null ? '' : v).trim(); }
function wsOn_(v) { var s = wsS_(v); return s === 'بله' || s === 'فعال' || s === '1' || s.toLowerCase() === 'true' || s === '✓' || v === true; }
function wsEn_(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); }).replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }); }
function wsNum_(v) { var n = Number(wsEn_(v).replace(/[,٬\s]/g, '')); return isFinite(n) ? n : 0; }
function wsList_(s) { return wsS_(s).split(/[,،]+/).map(function (x) { return x.trim(); }).filter(String); }
function wsHex_(bytes) { return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function wsSig_(msg, key) { return wsHex_(Utilities.computeHmacSha256Signature(msg, key, Utilities.Charset.UTF_8)); }
function wsHash_(s) { return wsHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
function wsDay_(d) { return Utilities.formatDate(d || wsNow_(), TG_TZ, 'yyyy-MM-dd'); }
function wsStamp_(d) { return Utilities.formatDate(d || wsNow_(), TG_TZ, 'yyyy-MM-dd HH:mm'); }
function wsHour_(d) { return Number(Utilities.formatDate(d || wsNow_(), TG_TZ, 'H')); }
function wsProps_() { return PropertiesService.getScriptProperties(); }
function wsProp_(k, v) {
  if (wsDry_()) {
    if (v === undefined) return TG_MEM['wsp:' + k] || '';
    if (v === null) delete TG_MEM['wsp:' + k]; else TG_MEM['wsp:' + k] = String(v);
    return v;
  }
  var P = wsProps_();
  if (v === undefined) return P.getProperty(k) || '';
  if (v === null) P.deleteProperty(k); else P.setProperty(k, String(v));
  return v;
}
/* کلید فقط از Script Properties؛ در تست از TG_MEM. هرگز برگردانده یا لاگ نمی‌شود. */
function wsKey_() {
  if (wsDry_()) return TG_MEM['ws:key'] || '';
  return wsProps_().getProperty('TG_DIR_KEY') || '';
}
function wsSecret_(name) {
  if (!/^[A-Z][A-Z0-9_]{2,40}$/.test(wsS_(name))) return '';
  if (wsDry_()) return TG_MEM['ws:sec:' + name] || '';
  return wsProps_().getProperty(wsS_(name)) || '';
}
function wsParams_(s) {
  var o = {};
  wsS_(s).split(/[؛;\n]+/).forEach(function (p) { var i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return o;
}
function wsErrText_(e) { return tgSecretMask_(String((e && e.message) || e)).slice(0, 300); }

/* ======================= ۱. امضا ======================= */
function wsHttp_(url, opts) {
  if (WS_FAKE_HTTP) { var f = WS_FAKE_HTTP(url, opts || {}) || {}; return { code: f.code || 200, body: typeof f.body === 'string' ? f.body : JSON.stringify(f.body || {}) }; }
  if (wsDry_()) return { code: 200, body: '{"ok":true}' };
  var o = { muteHttpExceptions: true, followRedirects: false };
  Object.keys(opts || {}).forEach(function (k) { o[k] = opts[k]; });
  var res;
  try { res = UrlFetchApp.fetch(url, o); }
  catch (e) { throw new Error('شبکه: ' + wsErrText_(e)); }   /* متن خطای UrlFetch آدرس را دارد؛ پوشانده می‌شود */
  return { code: res.getResponseCode(), body: res.getContentText() };
}

/* POST امضاشده به tj/v1/<route>. body همان JSON.stringify(obj) است (نویسه‌های غیر ASCII به ‎\uXXXX‎ تا بایت‌های امضا و ارسال یکی باشد). */
function deskPost(route, obj) {
  if (!/^[a-z0-9-]{2,40}$/.test(wsS_(route))) throw new Error('مسیر نامعتبر');
  var key = wsKey_();
  if (!key) throw new Error('کلید TG_DIR_KEY در Script Properties نیست');
  var body = tgDirAscii_(JSON.stringify(obj || {}));
  var ts = String(Math.floor(wsNow_().getTime() / 1000));
  var r = wsHttp_(WS_API + route + '?ts=' + ts + '&sig=' + wsSig_(ts + '.' + body, key), { method: 'post', contentType: 'application/json', payload: body });
  var j = null;
  try { j = JSON.parse(r.body); } catch (e) {}
  if (r.code !== 200 || !j) throw new Error('سایت ' + r.code + ' در ' + route + ': ' + tgSecretMask_(String((j && j.message) || r.body || '')).slice(0, 160));
  if (j.ok === false) throw new Error('سایت در ' + route + ': ' + tgSecretMask_(String(j.message || j.error || 'ok=false')).slice(0, 160));
  return j;
}

/* لینک امضاشدهٔ میز کار، هفت روزه. roles با کاما، همان رشته‌ای که امضا می‌شود. */
function deskLink(chatId, roles) {
  var key = wsKey_();
  if (!key) throw new Error('کلید TG_DIR_KEY در Script Properties نیست');
  var w = wsS_(chatId), r = (Array.isArray(roles) ? roles : wsList_(roles)).join(',');
  var exp = Math.floor(wsNow_().getTime() / 1000) + WS_LINK_DAYS * 86400;
  var tk = wsSig_('ws|' + w + '|' + r + '|' + exp, key);
  return WS_DESK_URL + '?tw=' + encodeURIComponent(w) + '&tr=' + encodeURIComponent(r) + '&tx=' + exp + '&tk=' + tk;
}

/* ======================= دکمهٔ «میز کار» (فقط اعضای تیم) ======================= */
/* نقش‌های تیمی این chat از برگهٔ افراد؛ مراجع و دانشجو حساب نمی‌شوند */
function wsTeamRoles_(chat) {
  var c = wsS_(chat);
  if (!c) return [];
  var out = [];
  try {
    tgPeopleList_().forEach(function (p) {
      if (String(p.status || '').indexOf('غیرفعال') > -1) return;
      if (!tgChatIn_(p.chat, c)) return;
      (p.roles || []).forEach(function (r) { if (r && WS_NO_TEAM.indexOf(r) < 0 && out.indexOf(r) < 0) out.push(r); });
    });
  } catch (e) {}
  return out;
}
function wsMenuRow_() {
  if (!WS_CUR) return [];
  return wsTeamRoles_(WS_CUR).length ? [[{ text: WS_BTN }]] : [];
}
function wsRoute_(chat, m) {
  var t = wsS_(m && m.text);
  if (t !== WS_BTN && t !== '/desk') return false;
  var roles = wsTeamRoles_(chat);
  if (!roles.length) return false;   /* مراجع: مسیر عادی بات */
  var url = '';
  try { url = deskLink(chat, roles); } catch (e) { tgErr_('wsRoute_', e); }
  if (!url) { tgSend_(chat, WS_BTN + ' ' + '⚠️'); return true; }
  tgSend_(chat, WS_BTN, { inline_keyboard: [[{ text: WS_BTN, url: url }]] });
  return true;
}

/* ======================= جدول عمومی (فایل + برگه) ======================= */
function wsFileId_(cell) {
  var s = wsS_(cell);
  if (WS_FILES[s]) { var g = (typeof globalThis !== 'undefined') ? globalThis : this; return String(g[WS_FILES[s]] || ''); }
  return /^[A-Za-z0-9_-]{25,80}$/.test(s) ? s : '';
}
/* {head, rows, find, set, append} روی یک برگه. در حالت خشک از TG_MEM['wssrc:<برگه>'] = {head, rows} */
function wsTable_(fileCell, tab, create) {
  var name = wsS_(tab);
  if (!name) throw new Error('نام برگه خالی است');
  if (wsDry_()) {
    var m = TG_MEM['wssrc:' + name];
    if (!m) { if (!create) throw new Error('برگه پیدا نشد: ' + name); m = TG_MEM['wssrc:' + name] = { head: [], rows: [] }; }
    /* head و rows همان آرایه‌های حافظه‌اند؛ wsTableOf_ خودش در آن‌ها می‌نویسد */
    var none = function () {};
    return wsTableOf_(m.head, m.rows, { set: none, append: none, addCol: none });
  }
  var id = wsFileId_(fileCell);
  if (!id) throw new Error('شناسهٔ فایل نامعتبر برای ' + name);
  var ss = SpreadsheetApp.openById(id), sh = ss.getSheetByName(name);
  if (!sh) {
    if (!create) throw new Error('برگه پیدا نشد: ' + name);
    sh = ss.insertSheet(name);
    try { sh.setRightToLeft(true); } catch (e) {}
  }
  var lc = Math.max(1, sh.getLastColumn()), last = sh.getLastRow();
  var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return wsS_(h); });
  while (head.length && !head[head.length - 1]) head.pop();
  var rows = last > 1 && head.length ? sh.getRange(2, 1, last - 1, head.length).getValues() : [];
  return wsTableOf_(head, rows, {
    set: function (r, c, v) { sh.getRange(r + 2, c + 1).setValue(pbCell_(v)); },
    append: function (row) { sh.appendRow(row.map(pbCell_)); },
    addCol: function (h) { var at = head.length; if (sh.getMaxColumns() < at) sh.insertColumnsAfter(sh.getMaxColumns(), at - sh.getMaxColumns()); sh.getRange(1, at, 1, 1).setValue(h).setFontWeight('bold'); }
  });
}
function wsTableOf_(head, rows, io) {
  var t = { head: head, rows: rows };
  t.col = function (h) { return head.indexOf(wsS_(h)); };
  t.ensure = function (h) { var c = t.col(h); if (c > -1) return c; head.push(wsS_(h)); io.addCol(wsS_(h)); rows.forEach(function (r) { while (r.length < head.length) r.push(''); }); return head.length - 1; };
  t.find = function (h, key) { var c = t.col(h), k = wsS_(key); if (c < 0 || !k) return -1; for (var i = 0; i < rows.length; i++) if (wsS_(rows[i][c]) === k) return i; return -1; };
  t.set = function (r, h, v) { var c = t.ensure(h); while (rows[r].length <= c) rows[r].push(''); rows[r][c] = v; io.set(r, c, v); };
  t.append = function (obj) { Object.keys(obj).forEach(function (h) { t.ensure(h); }); var row = head.map(function (h) { return obj[h] === undefined ? '' : obj[h]; }); rows.push(row); io.append(row); return rows.length - 1; };
  t.objects = function () { return rows.map(function (r) { var o = {}; head.forEach(function (h, j) { if (h) o[h] = r[j]; }); return o; }); };
  return t;
}

/* ======================= ۲. فیلتر ستون و مقدار ======================= */
function wsAllowedCols_(cfgCols) { return wsList_(cfgCols).filter(function (h) { return !WS_DENY_COL.test(h); }); }
function wsVal_(v) {
  if (v instanceof Date || Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : wsStamp_(v);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  var s = String(v == null ? '' : v);
  var d = wsEn_(s).replace(/[\s\-()]/g, '');
  if (/(?:^|\D)(?:\+?98|0)?9\d{9}(?:\D|$)/.test(d)) return '';                 /* شمارهٔ موبایل */
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(s)) return '';                         /* ایمیل */
  if (/(?:^|\D)\d{10}(?:\D|$)/.test(d) && !/^\d{4}-\d{2}-\d{2}/.test(s)) return '';  /* کد ملی یا شمارهٔ ده‌رقمی */
  return s.length > 2000 ? s.slice(0, 2000) : s;
}
/* سطرهای مجاز یک set. خروجی: {cols, key, rows:[{…}], cut} */
function wsReadSet_(cfg) {
  var set = wsS_(cfg['set']), tab = wsS_(cfg['نام برگه']);
  if (!WS_SET_RE.test(set)) throw new Error('set نامعتبر: ' + set);
  if (WS_DENY_TAB.test(tab)) throw new Error('این برگه برای میز کار مجاز نیست: ' + tab);
  var cols = wsAllowedCols_(cfg['ستون‌های مجاز']), key = wsS_(cfg['ستون کلید']);
  if (!cols.length) throw new Error('ستون مجاز ندارد: ' + set);
  var builtin = wsS_(cfg['شناسهٔ فایل']) === 'بات';
  var src = builtin ? wsBuiltin_(tab) : wsTable_(cfg['شناسهٔ فایل'], tab).objects();
  var rows = [];
  src.forEach(function (o) {
    var r = {}, any = false;
    /* منبع درونی (اعضای تیم) از خود بات است و شناسهٔ chat دارد؛ فیلتر مقدار فقط روی برگه‌ها */
    cols.forEach(function (h) { if (o[h] !== undefined) { r[h] = builtin ? String(o[h]) : wsVal_(o[h]); if (r[h] !== '') any = true; } });
    if (any) rows.push(r);
  });
  var cut = 0;
  if (rows.length > WS_MAX_ROWS) { cut = rows.length - WS_MAX_ROWS; rows = rows.slice(cut); }
  while (rows.length && JSON.stringify(rows).length > WS_MAX_BYTES * 0.95) { var n = Math.ceil(rows.length / 10); rows = rows.slice(n); cut += n; }
  return { cols: cols.filter(function (h) { return src.length ? Object.prototype.hasOwnProperty.call(src[0], h) : true; }), key: key, rows: rows, cut: cut };
}
/* منبع درونی بات (شناسهٔ فایل = «بات») */
function wsBuiltin_(name) {
  if (name === 'اعضای تیم') {
    var out = [];
    tgPeopleList_().forEach(function (p) {
      if (String(p.status || '').indexOf('غیرفعال') > -1) return;
      var roles = (p.roles || []).filter(function (r) { return WS_NO_TEAM.indexOf(r) < 0; });
      var w = wsS_(p.chat).split(/[,،;\s]+/).filter(String)[0] || '';
      if (roles.length && w) out.push({ w: w, name: wsS_(p.name), roles: roles.join(',') });
    });
    return out;
  }
  if (name === 'سلامت') return wsHealthRows_();
  throw new Error('منبع درونی ناشناخته: ' + name);
}

/* ======================= ۳. موتور همگام‌سازی ======================= */
function wsSyncCfg_() { return pbRows_('e', WS_T_SYNC, WS_SYNC_HEAD, WS_SYNC_SEED); }
function wsSyncBySet_(set) { return wsSyncCfg_().filter(function (r) { return wsS_(r['set']) === set; })[0] || null; }
/* force: بی‌توجه به موعد. خروجی {sent, same, skipped} */
function wsSyncRun_(force) {
  var out = { sent: [], same: [], skipped: [] }, now = wsNow_().getTime();
  wsSyncCfg_().forEach(function (cfg) {
    var set = wsS_(cfg['set']);
    if (!set || !wsOn_(cfg['فعال'])) return;
    var every = Math.max(5, wsNum_(cfg['هر چند دقیقه']) || 15) * 60000;
    var last = wsNum_(wsProp_('WS_T_' + set));
    if (!force && last && now - last < every - 30000) { out.skipped.push(set); return; }
    if (!wsDue_('sync:' + set)) { out.skipped.push(set); return; }
    wsGuard_('sync:' + set, function () {
      var d = wsReadSet_(cfg);
      if (wsPush_(set, d)) out.sent.push(set); else out.same.push(set);
      wsProp_('WS_T_' + set, String(now));
      return d.rows.length + ' سطر' + (d.cut ? ' · ' + d.cut + ' سطر قدیمی بریده شد' : '');
    });
  });
  return out;
}
/* فقط اگر هش عوض شده باشد می‌فرستد؛ true یعنی فرستاد */
function wsPush_(set, d) {
  var h = wsHash_(JSON.stringify([d.cols, d.key, d.rows]));
  if (wsProp_('WS_H_' + set) === h) return false;
  deskPost('ws-sync', { set: set, key: d.key || '', cols: d.cols, rows: d.rows, v: (typeof TG_CODE_VERSION !== 'undefined' ? TG_CODE_VERSION : ''), at: Math.floor(wsNow_().getTime() / 1000) });
  wsProp_('WS_H_' + set, h);
  return true;
}

/* ======================= ۴. موتور رویدادها ======================= */
function wsActCfg_() { return pbRows_('e', WS_T_ACT, WS_ACT_HEAD, WS_ACT_SEED); }
function wsDoneList_() { try { var a = JSON.parse(wsProp_('WS_DONE') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function wsIsDone_(id) { return wsDoneList_().indexOf(id) > -1; }
function wsMarkDone_(id) { var a = wsDoneList_(); if (a.indexOf(id) < 0) a.push(id); if (a.length > WS_DONE_KEEP) a = a.slice(a.length - WS_DONE_KEEP); wsProp_('WS_DONE', JSON.stringify(a)); }
function wsTries_() { try { return JSON.parse(wsProp_('WS_TRY') || '{}') || {}; } catch (e) { return {}; } }
function wsSeen_() { try { return JSON.parse(wsProp_('WS_SEEN') || '[]') || []; } catch (e) { return []; } }
function wsSeenAdd_(k) { var a = wsSeen_(); if (a.indexOf(k) > -1) return false; a.push(k); if (a.length > WS_DONE_KEEP) a = a.slice(a.length - WS_DONE_KEEP); wsProp_('WS_SEEN', JSON.stringify(a)); return true; }

/* یک دور: pull ← اجرای قاعده ← ack فقط موفق‌ها. خروجی {done, acked, orphan, failed} */
function wsEventsRun_() {
  var res = { done: [], acked: [], orphan: [], failed: [] };
  var j = deskPost('ws-outbox', { op: 'pull', limit: WS_PULL_LIMIT });
  var items = (j.items || j.events || []).slice(0, WS_PULL_LIMIT);
  if (!items.length) return res;
  var cfgs = {};
  wsActCfg_().forEach(function (r) { var a = wsS_(r['act']); if (a && wsOn_(r['فعال']) && !cfgs[a]) cfgs[a] = r; });
  var tries = wsTries_(), ack = [], newOrphans = [];
  items.forEach(function (ev) {
    var id = wsS_(ev && ev.id).slice(0, 64), act = wsS_(ev && ev.act);
    if (!id || !act) return;
    if (wsIsDone_(id)) { ack.push(id); return; }      /* قبلاً اجرا شده و ack گم شده: فقط ack */
    if ((tries[id] || 0) >= WS_TRY_MAX) return;
    var cfg = cfgs[act];
    if (!cfg) { if (wsOrphan_(ev, 'act بی‌پیکربندی')) newOrphans.push(act); res.orphan.push(id); return; }
    var r;
    try { r = wsApply_(cfg, ev); }
    catch (e) { r = { ok: false, why: wsErrText_(e) }; }
    if (r && r.ok) {
      wsMarkDone_(id); ack.push(id); res.done.push(id); delete tries[id];
      try { wsNotify_(cfg, ev, r); } catch (eN) { tgErr_('wsNotify_', eN); }
      return;
    }
    if (r && r.orphan) { if (wsOrphan_(ev, r.why)) newOrphans.push(act); res.orphan.push(id); return; }
    tries[id] = (tries[id] || 0) + 1;
    res.failed.push(id);
    if (tries[id] >= WS_TRY_MAX) wsOrphan_(ev, 'پس از ' + WS_TRY_MAX + ' تلاش: ' + (r && r.why || ''));
  });
  var keep = {}; Object.keys(tries).slice(-100).forEach(function (k) { keep[k] = tries[k]; });
  wsProp_('WS_TRY', JSON.stringify(keep));
  if (ack.length) { deskPost('ws-outbox', { op: 'ack', ids: ack }); res.acked = ack; }
  if (newOrphans.length) wsSendTo_(WS_MANAGER, null, '🗂 میز کار · بی‌صاحب: ' + tgEsc_(newOrphans.filter(function (a, i) { return newOrphans.indexOf(a) === i; }).join('، ')));
  return res;
}
/* ثبت یک بار در «میز کار · بی‌صاحب»؛ true یعنی بار اول بود */
function wsOrphan_(ev, why) {
  if (!wsSeenAdd_(wsS_(ev.id))) return false;
  pbAdd_('e', WS_T_ORPHAN, WS_ORPHAN_HEAD, { 'زمان': wsStamp_(), 'id': wsS_(ev.id), 'act': wsS_(ev.act), 'کلید': wsS_(ev.key).slice(0, 80),
    'از طرف': wsByName_(ev), 'علت': wsS_(why).slice(0, 200) });
  return true;
}
function wsIsAdmin_(ev) { return !!(ev && ev.by && typeof ev.by === 'object' && ev.by.admin === true); }
/* نقش‌های فرستنده: مدیر وردپرس (by.admin) مدیر است و برگهٔ افراد سنجیده نمی‌شود؛ بقیه فقط از برگهٔ افراد */
function wsByRoles_(ev) {
  if (wsIsAdmin_(ev)) return [WS_MANAGER];
  var w = wsByChat_(ev), roles = w ? wsTeamRoles_(w) : [];
  if (w && String(w) === String(TG_OWNER_CHAT) && roles.indexOf(WS_MANAGER) < 0) roles.push(WS_MANAGER);
  return roles;
}
function wsByChat_(ev) { var b = ev && ev.by; return wsS_(b && typeof b === 'object' ? (b.w || b.chat) : (ev && ev.w)); }
/* نام کننده از برگهٔ افراد (نه از ادعای سایت) */
function wsByName_(ev) {
  var w = wsByChat_(ev);
  if (!w) return wsIsAdmin_(ev) ? WS_MANAGER : '';
  try { var p = tgPeopleList_().filter(function (x) { return tgChatIn_(x.chat, w); })[0]; return p ? wsS_(p.name) : (wsIsAdmin_(ev) ? WS_MANAGER : ''); } catch (e) { return ''; }
}
/* {now} {by} {key} {act} {id}، {data.x} یا کوتاهش {x}. {title} اگر در data نبود از ستون «موضوع» یا «عنوان» همان سطر */
function wsTpl_(s, ev, by, rowObj) {
  return wsS_(s).replace(/\{((?:data\.)?[A-Za-z_][A-Za-z0-9_]{0,40})\}/g, function (all, k) {
    if (k === 'now') return wsStamp_();
    if (k === 'by') return by;
    if (k === 'key') return wsS_(ev.key);
    if (k === 'act') return wsS_(ev.act);
    if (k === 'id') return wsS_(ev.id);
    var f = k.replace(/^data\./, ''), v = (ev.data || {})[f];
    if ((v == null || v === '') && f === 'title' && rowObj) v = rowObj['موضوع'] || rowObj['عنوان'] || rowObj['عنوان مطلب'] || '';
    return v == null ? '' : String(typeof v === 'object' ? JSON.stringify(v) : v).slice(0, 1000);
  });
}
function wsPairs_(s) {
  return wsS_(s).split(/[؛;\n]+/).map(function (p) { var i = p.indexOf('='); return i > 0 ? [p.slice(0, i).trim(), p.slice(i + 1).trim()] : null; }).filter(function (x) { return x && x[0]; });
}
/* اجرای یک قاعده. خروجی {ok, row, rowObj} یا {ok:false, why, orphan?} */
function wsApply_(cfg, ev) {
  var allow = wsList_(cfg['نقش مجاز']);
  var roles = wsByRoles_(ev);
  if (!roles.length) return { ok: false, orphan: true, why: 'فرستنده عضو تیم نیست' };
  /* مدیر (chat مالک یا مدیر وردپرس با by.admin) هر کنشی را می‌تواند */
  if (allow.length && roles.indexOf(WS_MANAGER) < 0 && !allow.some(function (r) { return roles.indexOf(r) > -1; })) return { ok: false, orphan: true, why: 'نقش مجاز نیست' };
  var special = wsS_(cfg['کار ویژه']);
  if (special) {
    var h = WS_HANDLERS[special];
    if (!h) return { ok: false, orphan: true, why: 'کار ویژه تعریف نشده: ' + special };
    var hr = h(cfg, ev, roles);
    if (!hr || !hr.ok) return { ok: false, orphan: !!(hr && hr.orphan), why: (hr && hr.why) || 'کار ویژه ناموفق' };
    if (!wsS_(cfg['برگهٔ مقصد'])) return hr;
  }
  if (!wsS_(cfg['برگهٔ مقصد'])) return { ok: true };
  var tab = wsS_(cfg['برگهٔ مقصد']);
  if (WS_DENY_TAB.test(tab)) return { ok: false, orphan: true, why: 'برگهٔ مقصد مجاز نیست' };
  var by = wsByName_(ev), pairs = wsPairs_(cfg['ستون‌ها و مقدارها']).filter(function (p) { return !WS_DENY_COL.test(p[0]); });
  if (!pairs.length) return { ok: false, orphan: true, why: 'ستونی برای نوشتن ندارد' };
  var t = wsTable_(cfg['شناسهٔ فایل'], tab), keyCol = wsS_(cfg['ستون کلید']), r;
  if (!keyCol) {
    var obj = {};
    pairs.forEach(function (p) { obj[p[0]] = wsTpl_(p[1], ev, by); });
    r = t.append(obj);
  } else {
    r = t.find(keyCol, ev.key);
    if (r < 0) return { ok: false, why: 'سطری با ' + keyCol + ' = ' + wsS_(ev.key).slice(0, 40) + ' پیدا نشد' };
    pairs.forEach(function (p) { t.set(r, p[0], wsTpl_(p[1], ev, by)); });
  }
  return { ok: true, row: r, rowObj: t.objects()[r] };
}
function wsNotify_(cfg, ev, r) {
  var to = wsS_(cfg['پیام به چه نقشی']);
  if (!to) return;
  var txt = wsS_(cfg['متن کوتاه پیام']);
  if (!txt || txt.indexOf(WS_TEAM_TEXT) > -1) txt = '🗂 {act} · {key}';   /* تا تیم متن بنویسد: فقط نام کنش و کلید */
  wsSendTo_(to, r && r.rowObj, tgEsc_(wsTpl_(txt, ev, wsByName_(ev), r && r.rowObj)), wsOn_(cfg['دکمهٔ میز']), ev);
}
/* to: «مدیر»، نام نقش‌ها با کاما، «@ستون» (chat همان سطر)، «@data.x» (chat فیلد رویداد، فقط اگر در برگهٔ افراد فعال است).
   «الف|ب»: اگر «الف» گیرنده‌ای نداشت، «ب» (مثل «@data.reviewer_w|سردبیر») */
/* withDesk: زیر پیام دکمهٔ «میز کار» با لینک امضاشدهٔ همان گیرنده (فقط اگر گیرنده نقش تیمی دارد) */
function wsSendTo_(to, rowObj, html, withDesk, ev) {
  var split = function (c) { return wsS_(c).split(/[,،;\s]+/).filter(String); };
  var one = function (t) {
    if (t === WS_MANAGER) return [String(TG_OWNER_CHAT)];
    if (/^@data\.[A-Za-z0-9_]{1,40}$/.test(t)) {
      var w = wsS_(((ev && ev.data) || {})[t.slice(6)]);
      if (!/^-?\d{3,20}$/.test(w)) return [];
      return tgPeopleList_().some(function (p) { return String(p.status || '').indexOf('غیرفعال') < 0 && tgChatIn_(p.chat, w); }) ? [w] : [];
    }
    if (t.charAt(0) === '@') return rowObj ? split(rowObj[t.slice(1)]) : [];
    var out = [];
    tgPeopleList_().forEach(function (p) {
      if (String(p.status || '').indexOf('غیرفعال') > -1 || (p.roles || []).indexOf(t) < 0) return;
      var c1 = split(p.chat)[0];
      if (c1) out.push(c1);
    });
    return out;
  };
  var chats = [];
  wsList_(to).forEach(function (grp) {
    var alts = grp.split('|').map(function (x) { return x.trim(); }).filter(String);
    for (var i = 0; i < alts.length; i++) { var got = one(alts[i]); if (got.length) { chats = chats.concat(got); break; } }
  });
  chats.filter(function (c, i) { return /^-?\d{3,20}$/.test(c) && chats.indexOf(c) === i; }).forEach(function (c) {
    var kb = null;
    if (withDesk) { var rr = wsTeamRoles_(c); if (rr.length) try { kb = { inline_keyboard: [[{ text: WS_BTN, url: deskLink(c, rr) }]] }; } catch (e) { kb = null; } }
    tgSend_(c, html, kb || undefined);
  });
}

/* ---------- بند ۸: کارهای ویژهٔ اختیاری. نبودن تابع زیرین فقط «بی‌صاحب» می‌سازد. ---------- */
var WS_GO_ST = 'برو';
var WS_HANDLERS = {
  /* فقط بعد از so_go مدیر: سطر صف باید «برو» باشد؛ بعد «در صف» می‌شود تا soTick مثل همیشه بفرستد */
  channel_post: function (cfg, ev) {
    try {
      var t = wsTable_(cfg['شناسهٔ فایل'] || 'هاب محتوا', cfg['برگهٔ مقصد'] || 'سوشال · صف ارسال'), r = t.find('کد', ev.key);
      if (r < 0) return { ok: false, why: 'سطر صف پیدا نشد' };
      if (wsS_(t.objects()[r]['وضعیت']) !== WS_GO_ST) return { ok: false, orphan: true, why: 'هنوز so_go مدیر ندارد' };
      return { ok: true };
    } catch (e) { return { ok: false, why: wsErrText_(e) }; }
  },
  gem_seo: function () { return typeof seoRunPriority === 'function' ? (seoRunPriority(), { ok: true }) : { ok: false, orphan: true, why: 'gem_seo در این نسخه نیست' }; },
  digest_send: function () { return typeof tgDeskDigest_ === 'function' ? (tgDeskDigest_('morn'), { ok: true }) : { ok: false, orphan: true, why: 'digest_send در این نسخه نیست' }; },
  voice_tx: function () { return { ok: false, orphan: true, why: 'رونویسی صدا هنوز به میز وصل نیست' }; }
};

/* ======================= ۵. سنجش خودکار (بی هوش مصنوعی) ======================= */
function wsJobCfg_() { return pbRows_('e', WS_T_JOB, WS_JOB_HEAD, WS_JOB_SEED); }
/* برنامه ← {every: ms, hour?, offsets?} */
function wsPlan_(s) {
  var t = wsEn_(wsS_(s));
  if (/بعد از/.test(t)) { var offs = (t.match(/\d+/g) || ['24']).map(Number).filter(function (n) { return n > 0 && n < 2000; }); return { every: 3600000, offsets: offs }; }
  if (/ساعتی/.test(t)) return { every: 3600000 };
  if (/روزانه/.test(t)) { var h = (t.match(/\d+/) || [])[0]; return { every: 86400000, hour: h === undefined ? 7 : Math.min(23, Number(h)) }; }
  var m = t.match(/(\d+)\s*دقیقه/); if (m) return { every: Math.max(5, Number(m[1])) * 60000 };
  return { every: 86400000, hour: 7 };
}
function wsJobDue_(cfg, now) {
  var p = wsPlan_(cfg['برنامه']), last = wsNum_(wsProp_('WS_J_' + wsS_(cfg['job'])));
  if (p.hour !== undefined) return wsHour_(now) >= p.hour && wsProp_('WS_JD_' + wsS_(cfg['job'])) !== wsDay_(now);
  return !last || now.getTime() - last >= p.every - 30000;
}
function wsJobsRun_(only) {
  var out = { ran: [], skipped: [] }, now = wsNow_();
  wsJobCfg_().forEach(function (cfg) {
    var job = wsS_(cfg['job']);
    if (!job || !wsOn_(cfg['فعال'])) return;
    if (only && only !== job) return;
    if (!only && (!wsJobDue_(cfg, now) || !wsDue_('job:' + job))) { out.skipped.push(job); return; }
    wsGuard_('job:' + job, function () { var n = wsJobOne_(cfg); wsProp_('WS_J_' + job, String(now.getTime())); wsProp_('WS_JD_' + job, wsDay_(now)); return n; });
    out.ran.push(job);
  });
  return out;
}
/* اجرای یک کار: منبع ← افزودن به برگهٔ مقصد (با تاریخ) ← خلاصهٔ ۹۰ روز با set مقصد */
function wsJobOne_(cfg) {
  var type = wsS_(cfg['نوع منبع']), fn = WS_SRC[type];
  if (!fn) throw new Error('نوع منبع ناشناخته: ' + type);
  var dest = wsS_(cfg['برگهٔ مقصد']), file = 'هاب آمار', at = dest.indexOf('›');
  if (at > -1) { file = dest.slice(0, at).trim(); dest = dest.slice(at + 1).trim(); }
  var t = wsTable_(file, dest, true);
  var plan = wsPlan_(cfg['برنامه']), params = wsParams_(cfg['پارامترها']);
  if (plan.offsets) params.offsets = plan.offsets;
  var rows = fn(params, { existing: t.objects(), now: wsNow_() }) || [];
  var day = wsDay_();
  rows.forEach(function (r) { var o = { 'تاریخ': day }; Object.keys(r).forEach(function (k) { if (!WS_DENY_COL.test(k)) o[k] = wsVal_(r[k]); }); t.append(o); });
  var mx = wsS_(cfg['set مقصد']);
  if (mx) {
    if (!/^mx_/.test(mx) || !WS_SET_RE.test(mx)) throw new Error('set مقصد باید mx_… باشد: ' + mx);
    var from = wsDay_(new Date(wsNow_().getTime() - WS_SUM_DAYS * 86400000));
    var sum = t.objects().map(function (o) { var x = {}; Object.keys(o).forEach(function (k) { if (k && !WS_DENY_COL.test(k)) x[k] = wsVal_(o[k]); }); return x; })
      .filter(function (o) { return String(o['تاریخ'] || '').slice(0, 10) >= from; });
    if (sum.length > WS_MAX_ROWS) sum = sum.slice(sum.length - WS_MAX_ROWS);
    wsPush_(mx, { cols: t.head.filter(function (h) { return h && !WS_DENY_COL.test(h); }), key: '', rows: sum, cut: 0 });
  }
  return rows.length + ' سطر تازه';
}

/* ---------- نوع‌های منبع: هر کدام (params, ctx) → [سطر] ---------- */
var WS_IG = 'https://graph.facebook.com/v21.0/';
function wsIgCfg_(params) {
  var token = wsSecret_(params['توکن'] || 'IG_GRAPH_TOKEN');
  if (!token) throw new Error('توکن اینستاگرام در Script Properties نیست (' + (params['توکن'] || 'IG_GRAPH_TOKEN') + ')');
  var acc = {};
  try { acc = JSON.parse(wsSecret_(params['حساب‌ها'] || 'IG_ACCOUNTS') || '{}') || {}; } catch (e) { acc = {}; }
  if (!Object.keys(acc).length) throw new Error('فهرست حساب‌ها (' + (params['حساب‌ها'] || 'IG_ACCOUNTS') + ') خالی است');
  return { token: token, acc: acc };
}
function wsIgGet_(path, q, token) {
  var qs = Object.keys(q || {}).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
  var r = wsHttp_(WS_IG + path + '?' + qs + (qs ? '&' : '') + 'access_token=' + encodeURIComponent(token), { method: 'get' });
  var j = null; try { j = JSON.parse(r.body); } catch (e) {}
  if (r.code !== 200 || !j || j.error) throw new Error('اینستاگرام ' + r.code + ': ' + tgSecretMask_(String((j && j.error && j.error.message) || '')).slice(0, 120));
  return j;
}
function wsIgMetric_(j, name) {
  var d = (j.data || []).filter(function (x) { return x.name === name; })[0];
  if (!d) return '';
  if (d.total_value && d.total_value.value !== undefined) return Number(d.total_value.value) || 0;
  var v = d.values || []; return v.length ? Number(v[v.length - 1].value) || 0 : '';
}
var WS_SRC = {
  /* آمار روزانهٔ هر حساب: دنبال‌کننده، دسترسی، بازدید پروفایل، کلیک لینک (روز قبل) */
  ig_account: function (params, ctx) {
    var c = wsIgCfg_(params), day = wsDay_(new Date(ctx.now.getTime() - 86400000));
    var have = {}; ctx.existing.forEach(function (o) { have[String(wsVal_(o['روز'])).slice(0, 10) + '|' + wsS_(o['پیج'])] = 1; });
    var since = Math.floor(ctx.now.getTime() / 1000) - 2 * 86400, until = Math.floor(ctx.now.getTime() / 1000);
    return Object.keys(c.acc).filter(function (pg) { return !have[day + '|' + pg]; }).map(function (pg) {
      var id = wsS_(c.acc[pg]);
      var info = wsIgGet_(id, { fields: 'followers_count' }, c.token);
      var ins = wsIgGet_(id + '/insights', { metric: 'reach,profile_views,website_clicks', period: 'day', metric_type: 'total_value', since: since, until: until }, c.token);
      return { 'روز': day, 'پیج': pg, 'دنبال‌کننده': Number(info.followers_count) || 0, 'دسترسی': wsIgMetric_(ins, 'reach'),
               'بازدید پروفایل': wsIgMetric_(ins, 'profile_views'), 'کلیک لینک': wsIgMetric_(ins, 'website_clicks') };
    });
  },
  /* آمار هر ریل یا پست n ساعت بعد از انتشار. زمان از ستون «زمان ارسال» صف (set صف)، بی هیچ تماسی اگر چیزی سر موعد نیست */
  ig_media: function (params, ctx) {
    var offs = params.offsets || [24, 72], q = wsSyncBySet_(params['صف'] || 'so_queue');
    if (!q) throw new Error('set صف پیدا نشد');
    var src = wsTable_(q['شناسهٔ فایل'], q['نام برگه']).objects(), now = ctx.now.getTime();
    var done = {}; ctx.existing.forEach(function (o) { done[wsS_(o['کد صف']) + '|' + wsS_(o['ساعت بعد'])] = 1; });
    var due = [];
    src.forEach(function (o) {
      var code = wsS_(o['کد']), sent = wsWhen_(o['زمان ارسال']);
      if (!code || !sent) return;
      offs.forEach(function (h) { var at = sent + h * 3600000; if (now >= at && now < at + 48 * 3600000 && !done[code + '|' + h]) due.push({ code: code, sent: sent, h: h }); });
    });
    if (!due.length) return [];
    var c = wsIgCfg_(params), media = [];
    Object.keys(c.acc).forEach(function (pg) {
      (wsIgGet_(wsS_(c.acc[pg]) + '/media', { fields: 'id,timestamp,media_type,media_product_type', limit: 50 }, c.token).data || [])
        .forEach(function (m) { media.push({ pg: pg, id: m.id, t: Date.parse(m.timestamp) || 0, kind: m.media_product_type || m.media_type || '' }); });
    });
    var out = [];
    due.forEach(function (d) {
      var best = null;
      media.forEach(function (m) { var gap = Math.abs(m.t - d.sent); if (gap <= 6 * 3600000 && (!best || gap < best.gap)) best = { m: m, gap: gap }; });
      if (!best) return;
      var ins = wsIgGet_(best.m.id + '/insights', { metric: 'views,reach,saved,shares,likes,comments' }, c.token);
      out.push({ 'کد صف': d.code, 'پیج': best.m.pg, 'رسانه': best.m.id, 'نوع': best.m.kind, 'ساعت بعد': d.h,
        'بازدید': wsIgMetric_(ins, 'views'), 'دسترسی': wsIgMetric_(ins, 'reach'), 'ذخیره': wsIgMetric_(ins, 'saved'),
        'اشتراک': wsIgMetric_(ins, 'shares'), 'لایک': wsIgMetric_(ins, 'likes'), 'کامنت': wsIgMetric_(ins, 'comments') });
    });
    return out;
  },
  /* شمار کلیک لینک‌های /go/ از سایت: POST امضاشده به tj/v1/go-stats با {days}. پاسخ {ok, items, daily:[{day, slug, clicks}], since}.
     فقط روزهای کامل (پیش از امروز) و فقط روز و لینکی که هنوز ثبت نشده افزوده می‌شود. */
  go_clicks: function (params, ctx) {
    var j = deskPost(params['مسیر'] || 'go-stats', { days: Math.min(365, wsNum_(params['روز']) || 90) });
    var today = wsDay_(ctx.now), have = {};
    ctx.existing.forEach(function (o) { have[String(wsVal_(o['روز'])).slice(0, 10) + '|' + wsS_(o['لینک'])] = 1; });
    var out = [];
    (j.daily || []).forEach(function (x) {
      var day = wsEn_(wsS_(x.day)).slice(0, 10), slug = wsS_(x.slug).replace(/^\/?(go\/)?/, '').replace(/\/$/, '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day >= today || !/^[a-z0-9_\/-]{1,80}$/i.test(slug)) return;
      var link = '/go/' + slug;
      if (have[day + '|' + link]) return;
      have[day + '|' + link] = 1;
      out.push({ 'روز': day, 'لینک': link, 'کلیک': wsNum_(x.clicks) });
    });
    return out;
  },
  /* مطالب منتشرشدهٔ مجله (wp/v2/posts، عمومی): تاریخ، دسته، شمار کلمه. فقط مطلب تازه افزوده می‌شود */
  wp_posts: function (params, ctx) {
    var n = Math.min(100, wsNum_(params['تعداد']) || 50);
    var r = wsHttp_(WS_SITE + '/wp-json/wp/v2/posts?per_page=' + n + '&status=publish&_fields=id,date,link,slug,categories,content', { method: 'get' });
    var list = null; try { list = JSON.parse(r.body); } catch (e) {}
    if (r.code !== 200 || !Array.isArray(list)) throw new Error('wp/v2/posts ' + r.code);
    var have = {}; ctx.existing.forEach(function (o) { have[wsS_(o['شناسه'])] = 1; });
    var cats = {};
    try {
      var rc = wsHttp_(WS_SITE + '/wp-json/wp/v2/categories?per_page=100&_fields=id,name', { method: 'get' }), cl = JSON.parse(rc.body);
      if (Array.isArray(cl)) cl.forEach(function (c) { cats[c.id] = wsS_(c.name); });
    } catch (e) {}
    return list.filter(function (p) { return p && p.id && !have[String(p.id)]; }).map(function (p) {
      var txt = String((p.content && p.content.rendered) || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
      return { 'شناسه': String(p.id), 'تاریخ انتشار': String(p.date || '').slice(0, 10), 'نامک': wsS_(p.slug).slice(0, 120),
        'دسته': (p.categories || []).map(function (id) { return cats[id] || String(id); }).join('، '),
        'شمار کلمه': txt.split(/\s+/).filter(String).length, 'لینک': wsS_(p.link) };
    });
  },
  /* روزهای ماندن در هر مرحله، از سطرهای همان setها (فقط ستون‌های مجاز) */
  desk_flow: function (params, ctx) {
    var stCol = params['ستون مرحله'] || 'وضعیت', tCol = params['ستون زمان'] || 'آخرین تغییر میز', out = [];
    wsList_(params['set'] || 'mag_writers,so_queue').forEach(function (set) {
      var cfg = wsSyncBySet_(set);
      if (!cfg) return;
      var g = {};
      wsReadSet_(cfg).rows.forEach(function (o) {
        var st = wsS_(o[stCol]), t = wsWhen_(o[tCol]);
        if (!st || !t) return;
        var d = Math.max(0, (ctx.now.getTime() - t) / 86400000);
        (g[st] = g[st] || []).push(d);
      });
      Object.keys(g).forEach(function (st) {
        var a = g[st], sum = a.reduce(function (x, y) { return x + y; }, 0);
        out.push({ 'set': set, 'مرحله': st, 'شمار': a.length, 'میانگین روز': Math.round(sum / a.length * 10) / 10, 'بیشترین روز': Math.round(Math.max.apply(null, a) * 10) / 10 });
      });
    });
    return out;
  }
};
/* زمان از سلول: تاریخ، «yyyy-MM-dd HH:mm» یا عدد ms */
function wsWhen_(v) {
  if (v instanceof Date || Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? 0 : v.getTime();
  if (typeof v === 'number') return v > 1e11 ? v : 0;
  var s = wsEn_(wsS_(v)), m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m || Number(m[1]) < 2000) return 0;
  /* به وقت تهران (UTC+3:30، بی ساعت تابستانی از ۱۴۰۱) */
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0)) - 210 * 60000;
}

/* ======================= ۶. ترکر مهلت‌ها و پیام تصمیم‌ها ======================= */
function wsDailyDue_(now) { return wsHour_(now) >= WS_DAILY_HOUR && wsProp_('WS_DAY') !== wsDay_(now); }
function wsDueCfg_() { return pbRows_('e', WS_T_DUE, WS_DUE_HEAD, WS_DUE_SEED); }
/* هر روز یک بار، از ساعت ۹ تهران. خروجی {late: {نقش: [کلیدها]}, boss: [..], decide: {..}} */
function wsDailyRun_(force) {
  var now = wsNow_();
  if (!force && !wsDailyDue_(now)) return null;
  var late = {}, boss = [], decide = [], cache = {};
  var rowsOf = function (set) {
    if (cache[set]) return cache[set];
    var cfg = wsSyncBySet_(set);
    return (cache[set] = cfg ? { key: wsS_(cfg['ستون کلید']), rows: wsReadSet_(cfg).rows } : { key: '', rows: [] });
  };
  wsDueCfg_().forEach(function (d) {
    if (!wsOn_(d['فعال'])) return;
    var set = wsS_(d['set']), st = wsS_(d['مرحله']), col = wsS_(d['ستون مرحله']) || 'وضعیت', data = rowsOf(set);
    var hits = data.rows.filter(function (o) { return wsS_(o[col]) === st; });
    if (wsS_(d['نوع']) === 'تصمیم') { if (hits.length) decide.push(st + ' (' + set + '): ' + hits.length); return; }
    var cap = wsNum_(d['سقف روز']), role = wsS_(d['نقش مسئول']), tc = wsS_(d['ستون زمان']) || 'آخرین تغییر میز';
    if (!cap) return;
    hits.forEach(function (o) {
      var t = wsWhen_(o[tc]);
      if (!t) return;
      var days = (now.getTime() - t) / 86400000, k = wsS_(o[data.key]) || '؟';
      if (days >= cap * 2) boss.push(k + ' · ' + st + ' · ' + Math.floor(days) + ' روز');
      else if (days > cap && role) (late[role] = late[role] || []).push(k + ' · ' + st + ' · ' + Math.floor(days) + ' روز');
    });
  });
  Object.keys(late).forEach(function (role) { wsSendTo_(role, null, '⏰ ' + tgEsc_(late[role].slice(0, 30).join('\n'))); });
  var mgr = [];
  if (boss.length) mgr.push('⏰⏰ ' + tgEsc_(boss.slice(0, 30).join('\n')));
  if (decide.length) mgr.push('🧭 ' + tgEsc_(decide.join('\n')));
  if (mgr.length) wsSendTo_(WS_MANAGER, null, mgr.join('\n\n'));   /* بی‌مورد، بی‌پیام */
  wsProp_('WS_DAY', wsDay_(now));
  return { late: late, boss: boss, decide: decide };
}

/* ======================= ۷. سلامت ======================= */
function wsHealthAll_() { return pbRows_('e', WS_T_HEALTH, WS_HEALTH_HEAD, []); }
function wsHealthRow_(name) { return wsHealthAll_().filter(function (r) { return wsS_(r['کار']) === name; })[0] || null; }
function wsHealthRows_() {
  return wsHealthAll_().map(function (r) {
    return { 'کار': wsS_(r['کار']), 'آخرین اجرا': wsVal_(r['آخرین اجرا']), 'مدت (ثانیه)': wsNum_(r['مدت (ثانیه)']), 'نتیجه': wsS_(r['نتیجه']),
             'شکست پشت‌سرهم': wsNum_(r['شکست پشت‌سرهم']), 'تلاش بعدی': wsVal_(r['تلاش بعدی']) };
  });
}
/* اگر کار در فاصلهٔ تلاش دوباره است، false */
function wsDue_(name) {
  var r = wsHealthRow_(name);
  var next = r ? wsWhen_(r['تلاش بعدی']) : 0;
  return !next || wsNow_().getTime() >= next;
}
/* اجرا با ثبت سلامت؛ شکست دوم پشت‌سرهم یک پیام به مدیر و تا رفع تکرار نمی‌شود؛ فاصلهٔ تلاش ۵، ۱۰، ۲۰ … تا ۳۶۰ دقیقه */
function wsGuard_(name, fn) {
  var t0 = Date.now(), ok = true, msg = '';
  try { msg = String(fn() || 'انجام شد'); }
  catch (e) { ok = false; msg = wsErrText_(e); }
  var row = wsHealthRow_(name), fails = ok ? 0 : (row ? wsNum_(row['شکست پشت‌سرهم']) : 0) + 1;
  var next = ok ? '' : wsStamp_(new Date(wsNow_().getTime() + Math.min(360, 5 * Math.pow(2, fails - 1)) * 60000));
  var warned = row && wsOn_(row['هشدار']);
  var ch = { 'کار': name, 'آخرین اجرا': wsStamp_(), 'مدت (ثانیه)': Math.round((Date.now() - t0) / 100) / 10, 'نتیجه': ok ? 'موفق' : 'شکست',
             'شکست پشت‌سرهم': fails, 'تلاش بعدی': next, 'هشدار': ok ? '' : (warned ? 'بله' : ''), 'پیام': msg.slice(0, 300) };
  if (!ok && fails >= 2 && !warned) {
    ch['هشدار'] = 'بله';
    try { wsSendTo_(WS_MANAGER, null, '⚠️ میز کار · ' + tgEsc_(name) + '\n' + tgEsc_(msg.slice(0, 200))); } catch (eS) {}
  }
  if (row) pbSet_('e', WS_T_HEALTH, WS_HEALTH_HEAD, row, ch); else pbAdd_('e', WS_T_HEALTH, WS_HEALTH_HEAD, ch);
  if (!ok) try { tgErr_('ws ' + name, msg); } catch (eE) {}
  return ok;
}

/* ======================= تریگر ======================= */
function wsTick(e) {
  if (ciPaused_(e, 'wsTick', 'skip')) return;
  var rs0 = Date.now();
  if (!wsKey_()) return;              /* سایت جفت نشده: کاری نیست */
  if (!wsMutex_(true)) return;        /* اجرای هم‌زمان: این نوبت رد می‌شود */
  try {
    wsSyncRun_(false);
    if (wsDue_('events')) wsGuard_('events', function () { var r = wsEventsRun_(); return 'انجام ' + r.done.length + ' · بی‌صاحب ' + r.orphan.length + ' · شکست ' + r.failed.length; });
    if (Date.now() - rs0 < 200000) wsJobsRun_();
    if (Date.now() - rs0 < 240000 && wsDailyDue_(wsNow_()) && wsDue_('daily')) wsGuard_('daily', function () { var d = wsDailyRun_(true); return 'دیرکرد ' + Object.keys(d.late).length + ' نقش · مدیر ' + d.boss.length + ' · تصمیم ' + d.decide.length; });
    try { var h = { cols: WS_HEALTH_HEAD.slice(0, 6), key: 'کار', rows: wsHealthRows_(), cut: 0 }; wsPush_('ws_health', h); } catch (eH) { tgErr_('ws_health', eH); }
  } finally {
    wsMutex_(false);
    try { tgRunStat_('wsTick', rs0); } catch (eR) {}
  }
}
/* قفل کوتاه + نشان اجرا در Script Properties تا قفل اسکریپت (که doPost هم دارد) چند دقیقه نگه داشته نشود */
function wsMutex_(take) {
  if (wsDry_()) { if (take) { if (TG_MEM['ws:run']) return false; TG_MEM['ws:run'] = 1; return true; } delete TG_MEM['ws:run']; return true; }
  var l = LockService.getScriptLock();
  if (!l.tryLock(10000)) return false;
  try {
    var P = wsProps_(), at = Number(P.getProperty('WS_RUN') || 0);
    if (take) { if (at && Date.now() - at < 9 * 60000) return false; P.setProperty('WS_RUN', String(Date.now())); return true; }
    P.deleteProperty('WS_RUN'); return true;
  } finally { l.releaseLock(); }
}

/* یک بار (با تأیید یاسر): سه برگهٔ پیکربندی، مهلت‌ها، بی‌صاحب، سلامت و تریگر wsTick. خروجی فقط شمار. */
function wsSetup() {
  [[WS_T_SYNC, WS_SYNC_HEAD, WS_SYNC_SEED], [WS_T_ACT, WS_ACT_HEAD, WS_ACT_SEED], [WS_T_JOB, WS_JOB_HEAD, WS_JOB_SEED],
   [WS_T_DUE, WS_DUE_HEAD, WS_DUE_SEED], [WS_T_ORPHAN, WS_ORPHAN_HEAD, []], [WS_T_HEALTH, WS_HEALTH_HEAD, []]]
    .forEach(function (x) { pbRows_('e', x[0], x[1], x[2]); });
  var trig = 'هست';
  if (!wsDry_()) {
    var ts = ScriptApp.getProjectTriggers();
    if (!ts.some(function (t) { return t.getHandlerFunction() === 'wsTick'; })) {
      if (ts.length >= 19) trig = 'ساخته نشد: سقف ۲۰ تریگر';
      else { ScriptApp.newTrigger('wsTick').timeBased().everyMinutes(5).create(); trig = 'ساخته شد'; }
    }
  }
  return 'برگه‌ها: ۶ · تریگر wsTick: ' + trig;
}

/* ======================= تست (در TG_SUITES با نام «موتور میز کار (v170.78)») =======================
   همه با دادهٔ ساختگی، حالت خشک و پاسخ ساختگی شبکه (WS_FAKE_HTTP). هیچ درخواست واقعی، کلید واقعی یا نام واقعی. */
function wsTests() {
  var out = [], pass = 0, fail = 0;
  var ok = function (t, c) { if (c) pass++; else { fail++; out.push('❌ ' + t); } };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, http: WS_FAKE_HTTP, now: WS_NOW, cur: WS_CUR };
  var KEY = 'test-key-not-real', T0 = 1700000000000, calls = [];
  var reset = function () {
    TG_DRY = true; TG_OUTBOX = []; calls = []; WS_NOW = T0; WS_CUR = '';
    TG_MEM = { 'ws:key': KEY, people: [
      { name: 'نمونه سردبیر', chat: '5001', roles: ['سردبیر', 'سوشال'], status: 'فعال' },
      { name: 'نمونه سوشال', chat: '5002', roles: ['سوشال', 'دانشجو'], status: 'فعال' },
      { name: 'نمونه مراجع', chat: '5003', roles: ['مراجع'], status: 'فعال' },
      { name: 'نمونه غیرفعال', chat: '5004', roles: ['سردبیر'], status: 'غیرفعال' }] };
    WS_FAKE_HTTP = function (u, o) { calls.push({ u: u, o: o }); return { code: 200, body: { ok: true } }; };
  };
  var msgs = function (chat) { return TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && (!chat || x.chat === String(chat)); }); };
  var posts = function (route) { return calls.filter(function (c) { return c.u.indexOf(WS_API + route + '?') === 0; }); };
  var body = function (c) { return JSON.parse(c.o.payload); };
  var ago = function (days) { return wsStamp_(new Date(T0 - days * 86400000)); };
  try {
    reset();
    /* ۱. امضا با نمونهٔ ثابت */
    ok('امضای HMAC نمونهٔ ثابت', wsSig_('1700000000.{"a":1}', KEY) === 'a1bb0f02f9e931f529aed21e78f45f7f3e73d2e2ae2126920bf6af244d5a455d');
    var link = deskLink('5001', ['سردبیر', 'سوشال']);
    ok('لینک میز: انقضای هفت‌روزه و امضای ثابت', link === WS_DESK_URL + '?tw=5001&tr=' + encodeURIComponent('سردبیر,سوشال') + '&tx=1700604800&tk=e107bbb849a259956e9cb3fa1fa1a82fdc815f03b7ff9a9c61bf5f6ef2c67fe4');
    ok('لینک میز: رشتهٔ نقش با کاما هم همان', deskLink('5001', 'سردبیر,سوشال') === link);
    deskPost('ws-sync', { set: 'mag_x', t: 'متن' });
    var c0 = calls[0], pl = c0 && c0.o.payload;
    ok('deskPost: آدرس، ts و sig = HMAC(ts.body)', !!c0 && c0.u === WS_API + 'ws-sync?ts=1700000000&sig=' + wsSig_('1700000000.' + pl, KEY) && c0.o.method === 'post');
    ok('deskPost: بدنه همان JSON و فقط ASCII', /^[\x00-\x7f]*$/.test(pl) && JSON.parse(pl).t === 'متن');
    var noKey = ''; TG_MEM['ws:key'] = ''; try { deskPost('ws-sync', {}); } catch (e) { noKey = e.message; } TG_MEM['ws:key'] = KEY;
    ok('deskPost بی کلید خطا می‌دهد و کلیدی چاپ نمی‌کند', /TG_DIR_KEY/.test(noKey) && noKey.indexOf(KEY) < 0);
    var bad = ''; try { deskPost('../x', {}); } catch (e) { bad = e.message; }
    ok('deskPost مسیر نامعتبر را رد می‌کند', /نامعتبر/.test(bad));
    ok('پوشاندن tk و access_token در متن خطا', tgSecretMask_(link).indexOf('e107bb') < 0 && wsErrText_('x?access_token=SECRETVALUE1').indexOf('SECRETVALUE1') < 0);

    /* ۲. فیلتر ستون مجاز */
    ok('ستون‌های شخصی حتی در فهرست مجاز کنار می‌روند', JSON.stringify(wsAllowedCols_('کد,شمارهٔ تماس,ایمیل,وضعیت,کد ملی,chat_id,یوزرنیم,شرح حال')) === '["کد","وضعیت"]');
    ok('مقدار شبیه شماره، ایمیل یا کد ملی خالی می‌شود', wsVal_('تماس ۰۹۱۲۳۴۵۶۷۸۹') === '' && wsVal_('a@b.co') === '' && wsVal_('0012345678') === '' && wsVal_('موضوع آزاد') === 'موضوع آزاد');   // pii:ok ساختگی
    TG_MEM['wssrc:برگهٔ نمونه'] = { head: ['کد', 'موضوع', 'تلفن', 'یادداشت خصوصی'], rows: [['T-1', 'سوگ', '09120000000', 'نباید برود'], ['T-2', 'خواب', '', '']] };   // pii:ok ساختگی
    var cfgX = { 'set': 'mag_test', 'شناسهٔ فایل': 'هاب محتوا', 'نام برگه': 'برگهٔ نمونه', 'ستون‌های مجاز': 'کد,موضوع,تلفن', 'ستون کلید': 'کد', 'هر چند دقیقه': 5, 'فعال': 'بله' };
    var rs = wsReadSet_(cfgX);
    ok('فقط ستون‌های مجاز خوانده می‌شوند', rs.rows.length === 2 && JSON.stringify(Object.keys(rs.rows[0])) === '["کد","موضوع"]' && JSON.stringify(rs).indexOf('نباید') < 0 && JSON.stringify(rs).indexOf('0912') < 0);
    var denyTab = ''; try { wsReadSet_({ 'set': 'mag_y', 'شناسهٔ فایل': 'هاب تجربه', 'نام برگه': 'لیدها', 'ستون‌های مجاز': 'کد' }); } catch (e) { denyTab = e.message; }
    ok('برگهٔ لیدها هرگز همگام نمی‌شود', /مجاز نیست/.test(denyTab));
    var badSet = ''; try { wsReadSet_({ 'set': 'leads_all', 'شناسهٔ فایل': 'هاب محتوا', 'نام برگه': 'برگهٔ نمونه', 'ستون‌های مجاز': 'کد' }); } catch (e) { badSet = e.message; }
    ok('set بی‌پیشوند مجاز رد می‌شود', /set نامعتبر/.test(badSet));
    var ppl = wsReadSet_({ 'set': 'ws_people', 'شناسهٔ فایل': 'بات', 'نام برگه': 'اعضای تیم', 'ستون‌های مجاز': 'w,name,roles', 'ستون کلید': 'w' }).rows;
    ok('ws_people فقط اعضای تیم فعال، بی نقش مراجع و دانشجو', ppl.length === 2 && ppl[0].w === '5001' && ppl[0].roles === 'سردبیر,سوشال' && ppl[1].roles === 'سوشال');

    /* ۳. همگام‌سازی با هش */
    TG_MEM['pb:' + WS_T_SYNC] = [cfgX];
    calls = [];
    var s1 = wsSyncRun_(true), s2 = wsSyncRun_(true);
    ok('بار اول می‌فرستد، بار دوم بی‌تغییر نمی‌فرستد', s1.sent.join() === 'mag_test' && s2.same.join() === 'mag_test' && posts('ws-sync').length === 1);
    ok('بدنهٔ ws-sync: set، کلید و سطرها', body(posts('ws-sync')[0]).set === 'mag_test' && body(posts('ws-sync')[0]).key === 'کد' && body(posts('ws-sync')[0]).rows.length === 2);
    TG_MEM['wssrc:برگهٔ نمونه'].rows[1][1] = 'خواب و رویا';
    ok('بعد از تغییر دوباره می‌فرستد', wsSyncRun_(true).sent.join() === 'mag_test' && posts('ws-sync').length === 2);
    WS_NOW = T0 + 60000;
    ok('پیش از موعد اجرا نمی‌شود', wsSyncRun_(false).skipped.join() === 'mag_test');
    WS_NOW = T0;
    ok('so_dm و so_reels روشن و با نام برگه‌های هاب', WS_SYNC_SEED.some(function (r) { return r[0] === 'so_dm' && r[2] === 'سوشال · دایرکتم' && r[6] === 'بله'; })
      && WS_SYNC_SEED.some(function (r) { return r[0] === 'so_reels' && r[2] === 'سوشال · سنجش ریل‌ها' && r[6] === 'بله'; }) && !WS_DENY_TAB.test('سوشال · دایرکتم'));
    ok('سطرهای اولیهٔ همگام‌سازی همهٔ setهای خواسته‌شده را دارند', ['mag_topics', 'mag_writers', 'ws_people', 'so_queue', 'so_calendar', 'so_links', 'so_dm', 'so_reels', 'ig_daily']
      .every(function (x) { return WS_SYNC_SEED.some(function (r) { return r[0] === x && WS_SET_RE.test(x) && wsAllowedCols_(r[3]).length === wsList_(r[3]).length; }); }));

    /* ۴. رویدادها و idempotency */
    reset();
    TG_MEM['wssrc:موضوعات مجله'] = { head: ['کد', 'موضوع', 'وضعیت', 'نویسنده'], rows: [['T-1', 'سوگ', 'باز', ''], ['T-2', 'خواب', 'باز', '']] };
    TG_MEM['wssrc:سوشال · صف ارسال'] = { head: ['کد', 'وضعیت'], rows: [['Q-1', 'منتظر برو']] };
    var outbox = [{ id: 'e1', act: 'take', key: 'T-1', by: { w: '5002' } }, { id: 'e2', act: 'act_nashenakhte', key: 'x', by: { w: '5001' } },
                  { id: 'e3', act: 'take', key: 'T-404', by: { w: '5002' } }, { id: 'e4', act: 'so_go', key: 'Q-1', by: { w: '5002' } },
                  { id: 'e5', act: 'take', key: 'T-2', by: { w: '5003' } }];
    WS_FAKE_HTTP = function (u, o) { calls.push({ u: u, o: o }); var b = JSON.parse(o.payload || '{}'); return { code: 200, body: b.op === 'pull' ? { ok: true, items: outbox } : { ok: true } }; };
    var e1 = wsEventsRun_();
    var top = TG_MEM['wssrc:موضوعات مجله'].rows;
    ok('take: نوشتن با کلید و نام از برگهٔ افراد', top[0][2] === 'رزرو شد' && top[0][3] === 'نمونه سوشال' && top[1][2] === 'باز');
    ok('ستون تازهٔ قاعده افزوده شد', TG_MEM['wssrc:موضوعات مجله'].head.indexOf('آخرین تغییر میز') > -1);
    var acks = posts('ws-outbox').map(body).filter(function (b) { return b.op === 'ack'; });
    ok('ack فقط برای موفق‌ها', acks.length === 1 && JSON.stringify(acks[0].ids) === '["e1"]');
    ok('پیام take به سردبیر با عنوان از سطر، بی دکمه', msgs('5001').some(function (m) { return m.text === 'موضوع «سوگ» برداشته شد.' && !m.markup; }));
    var orph = TG_MEM['pb:' + WS_T_ORPHAN] || [];
    ok('act بی‌پیکربندی در «بی‌صاحب» و یک پیام به مدیر', orph.some(function (r) { return r['id'] === 'e2'; }) && msgs(TG_OWNER_CHAT).length === 1);
    ok('so_go از غیرمدیر رد شد و صف دست نخورد', orph.some(function (r) { return r['id'] === 'e4' && /نقش/.test(r['علت']); }) && TG_MEM['wssrc:سوشال · صف ارسال'].rows[0][1] === 'منتظر برو');
    ok('مراجع نمی‌تواند کنش بفرستد', orph.some(function (r) { return r['id'] === 'e5'; }) && top[1][2] === 'باز');
    ok('کلید ناموجود شکست است، نه ack', e1.failed.join() === 'e3' && wsTries_()['e3'] === 1);
    top[0][2] = 'دستی'; TG_OUTBOX = []; calls = [];
    var e2r = wsEventsRun_();
    var acks2 = posts('ws-outbox').map(body).filter(function (b) { return b.op === 'ack'; });
    ok('اجرای دوبارهٔ همان id اثر دوباره ندارد (فقط ack)', top[0][2] === 'دستی' && e2r.done.length === 0 && acks2.length === 1 && acks2[0].ids.join() === 'e1');
    ok('بی‌صاحب دوباره ثبت نمی‌شود و پیام تکرار نمی‌شود', (TG_MEM['pb:' + WS_T_ORPHAN] || []).length === orph.length && msgs(TG_OWNER_CHAT).length === 0 && msgs('5001').length === 0);
    for (var i = 0; i < WS_TRY_MAX; i++) wsEventsRun_();
    ok('بعد از ' + WS_TRY_MAX + ' شکست، دیگر امتحان نمی‌شود و ثبت می‌شود', wsTries_()['e3'] === WS_TRY_MAX && (TG_MEM['pb:' + WS_T_ORPHAN] || []).some(function (r) { return r['id'] === 'e3'; }));
    outbox = [{ id: 'e6', act: 'so_go', key: 'Q-1', by: { w: TG_OWNER_CHAT } }, { id: 'e7', act: 'propose', key: '', data: { code: 'T-9', title: 'تنهایی' }, by: { w: '5001' } }];
    wsEventsRun_();
    ok('so_go مدیر اجرا شد', TG_MEM['wssrc:سوشال · صف ارسال'].rows[0][1] === 'برو');
    var tp = TG_MEM['wssrc:موضوعات مجله'];
    var pm = msgs('5001').filter(function (m) { return /پیشنهاد موضوع تازه/.test(m.text); })[0];
    ok('propose: متن تیم با title و دکمهٔ میز با لینک همان گیرنده', !!pm && pm.text === 'پیشنهاد موضوع تازه: «تنهایی»' && pm.markup && pm.markup.inline_keyboard[0][0].url === deskLink('5001', ['سردبیر', 'سوشال']));
    ok('propose با ستون کلید خالی سطر تازه می‌سازد', tp.rows.length === 3 && tp.rows[2][tp.head.indexOf('وضعیت')] === 'پیشنهاد' && tp.rows[2][tp.head.indexOf('موضوع')] === 'تنهایی');
    /* مدیر وردپرس (by.admin): مدیر است و برگهٔ افراد سنجیده نمی‌شود؛ decided خاموش است */
    TG_MEM['wssrc:سوشال · صف ارسال'].rows[0][1] = 'منتظر برو';
    TG_MEM['wssrc:نویسندگان مجله'] = { head: ['شماره', 'موضوع', 'وضعیت', 'chat_id'], rows: [['21', 'خشم', 'تحویل شد', '5002'], ['22', 'شرم', 'تحویل شد', '7777']] };
    TG_MEM.people.push({ name: 'نمونه بازبین', chat: '5005', roles: ['استاد'], status: 'فعال' });
    TG_OUTBOX = [];
    outbox = [{ id: 'a1', act: 'so_go', key: 'Q-1', w: '9999', by: { w: '9999', admin: true } }, { id: 'a2', act: 'decided', key: '21', by: { w: '5001' } },
              { id: 'a3', act: 'returned', key: '21', data: { title: 'خشم', note: 'کوتاه‌تر' }, by: { w: '5001' } },
              { id: 'a4', act: 'returned', key: '22', data: { title: 'شرم' }, by: { w: '9999', admin: true } },
              { id: 'a5', act: 'to_clinical', key: '21', data: { title: 'خشم' }, by: { w: '5001' } },
              { id: 'a6', act: 'submitted', key: '22', data: { title: 'شرم' }, by: { w: '5003', admin: false } }];
    var ea = wsEventsRun_();
    ok('by.admin: مدیر حساب می‌شود و so_go اجرا شد', TG_MEM['wssrc:سوشال · صف ارسال'].rows[0][1] === 'برو' && ea.done.indexOf('a1') > -1);
    ok('decided خاموش است و اجرا نمی‌شود', ea.orphan.indexOf('a2') > -1);
    var rt = msgs('5002').filter(function (m) { return /برگشت/.test(m.text); })[0];
    ok('returned به نویسندهٔ همان سطر با دکمهٔ میز', !!rt && rt.text === 'مطلب «خشم» با یادداشت سردبیر برگشت.' && rt.markup && rt.markup.inline_keyboard[0][0].url === deskLink('5002', ['سوشال']));
    ok('returned به نویسندهٔ غیرتیمی: پیام بی دکمه', msgs('7777').length === 1 && !msgs('7777')[0].markup && ea.done.indexOf('a4') > -1);
    ok('to_clinical بی reviewer_w به سردبیر با دکمه', msgs('5001').some(function (m) { return m.text === 'مطلب «خشم» برای بازبینی علمی آماده است.' && !!m.markup; }) && msgs('5005').length === 0);
    ok('admin: false مدیر نمی‌سازد؛ مراجع رد می‌شود', ea.orphan.indexOf('a6') > -1);
    TG_OUTBOX = [];
    outbox = [{ id: 'a7', act: 'to_clinical', key: '21', data: { title: 'خشم', reviewer_w: '5005' }, by: { w: '5001' } },
              { id: 'a8', act: 'to_clinical', key: '22', data: { title: 'شرم', reviewer_w: '8888' }, by: { w: '5001' } }];
    wsEventsRun_();
    ok('to_clinical با reviewer_w فقط به همان نفر', msgs('5005').some(function (m) { return /خشم/.test(m.text); }) && !msgs('5001').some(function (m) { return /خشم/.test(m.text); }));
    ok('reviewer_w بیرون از برگهٔ افراد: به سردبیر، نه آن chat', msgs('8888').length === 0 && msgs('5001').some(function (m) { return /شرم/.test(m.text); }));
    ok('پنج act سایت روشن‌اند، decided خاموش', ['take', 'propose', 'submitted', 'returned', 'to_clinical'].every(function (a) { return WS_ACT_SEED.some(function (r) { return r[0] === a && r[9] === 'بله' && r[6].indexOf(WS_TEAM_TEXT) < 0; }); })
      && WS_ACT_SEED.filter(function (r) { return r[0] === 'decided'; })[0][9] === 'خیر');
    ok('فرمول از دادهٔ رویداد اجرا نمی‌شود', pbCell_('=IMPORTXML("x")').charAt(0) === "'");
    ok('همهٔ actهای خواسته‌شده سطر دارند', ['take', 'submitted', 'returned', 'to_clinical', 'decided', 'propose', 'so_go', 'so_hold', 'so_sticker_done', 'so_link_new', 'so_dm_edit', 'so_dm_applied', 'so_sugg', 'gem_seo', 'channel_post', 'digest_send', 'voice_tx']
      .every(function (a) { return WS_ACT_SEED.some(function (r) { return r[0] === a; }); }));
    /* بند ۸: کار ویژهٔ خاموش یا نبود تابعش موتور را نمی‌ایستاند؛ channel_post فقط بعد از so_go */
    TG_MEM['pb:' + WS_T_ACT] = WS_ACT_SEED.map(function (r) { var o = {}; WS_ACT_HEAD.forEach(function (h, j) { o[h] = r[j]; }); if (o['act'] === 'channel_post' || o['act'] === 'voice_tx') o['فعال'] = 'بله'; return o; });
    TG_MEM['wssrc:سوشال · صف ارسال'].rows.push(['Q-2', 'منتظر برو']);
    outbox = [{ id: 'e8', act: 'channel_post', key: 'Q-2', by: { w: TG_OWNER_CHAT } }, { id: 'e9', act: 'channel_post', key: 'Q-1', by: { w: TG_OWNER_CHAT } }, { id: 'e10', act: 'voice_tx', key: '', by: { w: '5001' } }];
    var e3r = wsEventsRun_();
    var q = TG_MEM['wssrc:سوشال · صف ارسال'];
    ok('channel_post بی so_go اجرا نمی‌شود، بعد از so_go به صف می‌رود', q.rows[1][1] === 'منتظر برو' && q.rows[0][1] === 'در صف' && e3r.done.join() === 'e9');
    ok('کار ویژهٔ ناموجود فقط بی‌صاحب می‌سازد', e3r.orphan.indexOf('e10') > -1 && e3r.orphan.indexOf('e8') > -1);

    /* ۵. نوع‌های منبع با پاسخ ساختگی */
    reset();
    TG_MEM['ws:sec:IG_GRAPH_TOKEN'] = 'IGTOKENFAKE123'; TG_MEM['ws:sec:IG_ACCOUNTS'] = '{"tl":"111"}';
    WS_FAKE_HTTP = function (u, o) {
      calls.push({ u: u, o: o });
      if (u.indexOf(WS_IG + '111?') === 0) return { body: { followers_count: 500 } };
      if (u.indexOf(WS_IG + '111/insights') === 0) return { body: { data: [{ name: 'reach', total_value: { value: 40 } }, { name: 'profile_views', total_value: { value: 7 } }, { name: 'website_clicks', values: [{ value: 1 }, { value: 3 }] }] } };
      if (u.indexOf(WS_IG + '111/media') === 0) return { body: { data: [{ id: 'M1', timestamp: new Date(T0 - 25 * 3600000 + 600000).toISOString(), media_product_type: 'REELS' }, { id: 'M2', timestamp: new Date(T0 - 300 * 3600000).toISOString() }] } };
      if (u.indexOf(WS_IG + 'M1/insights') === 0) return { body: { data: [{ name: 'views', values: [{ value: 900 }] }, { name: 'reach', values: [{ value: 600 }] }, { name: 'saved', values: [{ value: 12 }] }, { name: 'shares', values: [{ value: 5 }] }, { name: 'likes', values: [{ value: 70 }] }, { name: 'comments', values: [{ value: 4 }] }] } };
      if (u.indexOf(WS_API + 'go-stats') === 0) return { body: { ok: true, items: [{ slug: 'life', clicks: 15 }], since: wsDay_(new Date(T0 - 3 * 86400000)),
        daily: [{ day: wsDay_(new Date(T0 - 86400000)), slug: 'life', clicks: 12 }, { day: wsDay_(new Date(T0 - 2 * 86400000)), slug: 'go/school', clicks: 2 },
                { day: wsDay_(new Date(T0)), slug: 'life', clicks: 3 }, { day: wsDay_(new Date(T0 - 86400000)), slug: '<bad>', clicks: 1 }] } };
      if (u.indexOf(WS_SITE + '/wp-json/wp/v2/posts') === 0) return { body: [{ id: 41, date: '2026-10-01T10:00:00', slug: 'grief', link: WS_SITE + '/mag/grief/', categories: [3], content: { rendered: '<p>یک دو سه</p> چهار' } }] };
      if (u.indexOf(WS_SITE + '/wp-json/wp/v2/categories') === 0) return { body: [{ id: 3, name: 'سوگ' }] };
      return { code: 200, body: { ok: true } };
    };
    var ctx = { existing: [], now: new Date(T0) };
    var ia = WS_SRC.ig_account(wsParams_('توکن=IG_GRAPH_TOKEN؛ حساب‌ها=IG_ACCOUNTS'), ctx);
    ok('ig_account: دنبال‌کننده، دسترسی، بازدید پروفایل، کلیک لینک', ia.length === 1 && ia[0]['دنبال‌کننده'] === 500 && ia[0]['دسترسی'] === 40 && ia[0]['بازدید پروفایل'] === 7 && ia[0]['کلیک لینک'] === 3 && ia[0]['پیج'] === 'tl');
    ok('ig_account: روزِ ثبت‌شده دوباره خوانده نمی‌شود', WS_SRC.ig_account(wsParams_(''), { existing: [{ 'روز': ia[0]['روز'], 'پیج': 'tl' }], now: new Date(T0) }).length === 0);
    ok('ig_account: هیچ تماسی به گفت‌وگوها نیست', calls.every(function (c) { return !/conversations|messages|inbox/i.test(c.u); }));
    var noTok = ''; TG_MEM['ws:sec:IG_GRAPH_TOKEN'] = ''; try { WS_SRC.ig_account({}, ctx); } catch (e) { noTok = e.message; } TG_MEM['ws:sec:IG_GRAPH_TOKEN'] = 'IGTOKENFAKE123';
    ok('ig_account بی توکن خطای روشن می‌دهد', /توکن/.test(noTok));
    var leak = ''; var fh = WS_FAKE_HTTP; WS_FAKE_HTTP = function (u) { return { code: 400, body: { error: { message: 'bad ' + u } } }; };
    try { WS_SRC.ig_account({}, ctx); } catch (e) { leak = e.message; } WS_FAKE_HTTP = fh;
    ok('توکن در متن خطای اینستاگرام نمی‌آید', !!leak && leak.indexOf('IGTOKENFAKE123') < 0);
    TG_MEM['pb:' + WS_T_SYNC] = WS_SYNC_SEED.map(function (r) { var o = {}; WS_SYNC_HEAD.forEach(function (h, j) { o[h] = r[j]; }); return o; });
    TG_MEM['wssrc:سوشال · صف ارسال'] = { head: ['کد', 'وضعیت', 'زمان ارسال'], rows: [['Q-1', 'فرستاده شد', ago(25 / 24)], ['Q-2', 'فرستاده شد', ago(1 / 24)]] };
    calls = [];
    var im = WS_SRC.ig_media({ offsets: [24, 72], 'صف': 'so_queue', 'توکن': 'IG_GRAPH_TOKEN', 'حساب‌ها': 'IG_ACCOUNTS' }, ctx);
    ok('ig_media: ۲۴ ساعت بعد از زمان ارسال صف', im.length === 1 && im[0]['کد صف'] === 'Q-1' && im[0]['ساعت بعد'] === 24 && im[0]['رسانه'] === 'M1' && im[0]['بازدید'] === 900 && im[0]['ذخیره'] === 12 && im[0]['کامنت'] === 4);
    ok('ig_media: اندازه‌گیری‌شده تکرار نمی‌شود', WS_SRC.ig_media({ offsets: [24, 72] }, { existing: [{ 'کد صف': 'Q-1', 'ساعت بعد': 24 }], now: new Date(T0) }).length === 0);
    TG_MEM['wssrc:سوشال · صف ارسال'].rows = [['Q-3', 'در صف', ago(1)]].slice(0, 0); calls = [];
    ok('ig_media: چیزی سر موعد نیست = هیچ تماس', WS_SRC.ig_media({ offsets: [24] }, ctx).length === 0 && calls.length === 0);
    calls = [];
    var gc = WS_SRC.go_clicks(wsParams_('مسیر=go-stats؛ روز=90'), ctx);
    ok('go_clicks: بدنهٔ امضاشده {days: 90}', posts('go-stats').length === 1 && body(posts('go-stats')[0]).days === 90);
    ok('go_clicks: روزهای کامل، بی امروز و بی نامک نامعتبر', gc.length === 2 && gc[0]['لینک'] === '/go/life' && gc[0]['کلیک'] === 12 && gc[1]['لینک'] === '/go/school' && gc.every(function (r) { return r['روز'] < wsDay_(new Date(T0)); }));
    ok('go_clicks: روز و لینک ثبت‌شده دوباره نمی‌آید', WS_SRC.go_clicks({}, { existing: [{ 'روز': gc[0]['روز'], 'لینک': '/go/life' }], now: new Date(T0) }).length === 1);
    var wp = WS_SRC.wp_posts({ 'تعداد': '20' }, ctx);
    ok('wp_posts: تاریخ، دسته و شمار کلمه', wp.length === 1 && wp[0]['شناسه'] === '41' && wp[0]['تاریخ انتشار'] === '2026-10-01' && wp[0]['دسته'] === 'سوگ' && wp[0]['شمار کلمه'] === 4);
    ok('wp_posts: مطلب ثبت‌شده دوباره نمی‌آید', WS_SRC.wp_posts({}, { existing: [{ 'شناسه': 41 }], now: new Date(T0) }).length === 0);
    TG_MEM['wssrc:نویسندگان مجله'] = { head: ['شماره', 'وضعیت', 'آخرین تغییر میز', 'chat_id'], rows: [['1', 'در حال نوشتن', ago(4), '5001'], ['2', 'در حال نوشتن', ago(2), '5002'], ['3', 'تحویل شد', ago(1), '']] };
    var fl = WS_SRC.desk_flow(wsParams_('set=mag_writers'), ctx);
    var wr = fl.filter(function (r) { return r['مرحله'] === 'در حال نوشتن'; })[0];
    ok('desk_flow: روزهای ماندن در هر مرحله', fl.length === 2 && wr && wr['شمار'] === 2 && wr['میانگین روز'] === 3 && wr['بیشترین روز'] === 4);
    /* کل مسیر کار: افزودن با تاریخ + خلاصه با set مقصد */
    TG_MEM['pb:' + WS_T_JOB] = WS_JOB_SEED.map(function (r) { var o = {}; WS_JOB_HEAD.forEach(function (h, j) { o[h] = r[j]; }); return o; });
    calls = [];
    wsJobsRun_('ig_account'); wsJobsRun_('ig_account');
    var dest = TG_MEM['wssrc:سنجش · اینستاگرام روزانه'];
    var mx = posts('ws-sync').map(body).filter(function (b) { return b.set === 'mx_ig_daily'; });
    ok('کار: فقط افزودنی با تاریخ، بار دوم سطر تکراری نمی‌سازد', !!dest && dest.rows.length === 1 && dest.head.indexOf('تاریخ') === 0);
    ok('کار: خلاصه با set مقصد mx_ig_daily رفت (یک بار)', mx.length === 1 && mx[0].rows.length === 1);
    ok('سطرهای اولیهٔ سنجش همهٔ نوع‌ها را دارند و هر نوع یک تابع است', ['ig_account', 'ig_media', 'go_clicks', 'wp_posts', 'desk_flow'].every(function (t) { return typeof WS_SRC[t] === 'function' && WS_JOB_SEED.some(function (r) { return r[1] === t && /^mx_/.test(r[5]); }); }));
    ok('برنامه: روزانه، ساعتی، بعد از رویداد', wsPlan_('روزانه ۷').hour === 7 && wsPlan_('ساعتی').every === 3600000 && JSON.stringify(wsPlan_('بعد از رویداد + ۲۴ و ۷۲ ساعت').offsets) === '[24,72]');

    /* ۶. ترکر مهلت و پیام تصمیم‌ها */
    reset();
    TG_MEM['pb:' + WS_T_SYNC] = WS_SYNC_SEED.map(function (r) { var o = {}; WS_SYNC_HEAD.forEach(function (h, j) { o[h] = r[j]; }); return o; });
    TG_MEM['wssrc:نویسندگان مجله'] = { head: ['شماره', 'وضعیت', 'آخرین تغییر میز'], rows: [['11', 'در انتظار سردبیر', ago(4)], ['12', 'در انتظار سردبیر', ago(7)], ['13', 'در انتظار سردبیر', ago(1)]] };
    TG_MEM['wssrc:سوشال · صف ارسال'] = { head: ['کد', 'وضعیت'], rows: [['Q-1', 'منتظر برو']] };
    TG_MEM['wssrc:موضوعات مجله'] = { head: ['کد', 'وضعیت'], rows: [] };
    TG_MEM['wssrc:سوشال · تقویم'] = { head: ['کد', 'وضعیت'], rows: [] };
    WS_NOW = T0 - (wsHour_(new Date(T0)) - 10) * 3600000;   /* ساعت ۱۰ تهران */
    var d1 = wsDailyRun_(false);
    ok('مهلت: از سقف گذشته به مسئول همان مرحله', !!d1 && msgs('5001').length === 1 && /11/.test(msgs('5001')[0].text) && !/13/.test(msgs('5001')[0].text));
    ok('مهلت: دو برابر به مدیر، با تصمیم‌های منتظر در همان یک پیام', msgs(TG_OWNER_CHAT).length === 1 && /12/.test(msgs(TG_OWNER_CHAT)[0].text) && /منتظر برو/.test(msgs(TG_OWNER_CHAT)[0].text));
    ok('روزی یک بار', wsDailyRun_(false) === null);
    reset();
    TG_MEM['pb:' + WS_T_SYNC] = WS_SYNC_SEED.map(function (r) { var o = {}; WS_SYNC_HEAD.forEach(function (h, j) { o[h] = r[j]; }); return o; });
    ['نویسندگان مجله', 'سوشال · صف ارسال', 'موضوعات مجله', 'سوشال · تقویم'].forEach(function (t) { TG_MEM['wssrc:' + t] = { head: ['کد', 'شماره', 'وضعیت'], rows: [] }; });
    WS_NOW = T0 - (wsHour_(new Date(T0)) - 10) * 3600000;
    wsDailyRun_(false);
    ok('بی‌مورد، بی‌پیام', TG_OUTBOX.length === 0);
    WS_NOW = T0 - (wsHour_(new Date(T0)) - 8) * 3600000;
    TG_MEM['wsp:WS_DAY'] = '';
    ok('پیش از ساعت ۹ اجرا نمی‌شود', wsDailyRun_(false) === null);

    /* ۷. سلامت: شکست دوم یک پیام، تا رفع تکرار نه، فاصلهٔ افزایشی */
    reset();
    var boom = function () { throw new Error('خطای ساختگی?token=SECRETX'); };
    wsGuard_('job:t', boom);
    ok('شکست اول: پیامی نیست', msgs(TG_OWNER_CHAT).length === 0 && wsHealthRow_('job:t')['شکست پشت‌سرهم'] === 1);
    ok('فاصلهٔ تلاش: تا موعد اجرا نمی‌شود', wsDue_('job:t') === false);
    var n1 = wsWhen_(wsHealthRow_('job:t')['تلاش بعدی']);
    WS_NOW = n1 + 1000; wsGuard_('job:t', boom);
    var n2 = wsWhen_(wsHealthRow_('job:t')['تلاش بعدی']);
    ok('شکست دوم پشت‌سرهم: یک پیام به مدیر', msgs(TG_OWNER_CHAT).length === 1 && msgs(TG_OWNER_CHAT)[0].text.indexOf('SECRETX') < 0);
    ok('فاصله افزایشی است', n2 - WS_NOW > n1 - T0);
    WS_NOW = n2 + 1000; wsGuard_('job:t', boom);
    ok('شکست سوم: پیام تکرار نمی‌شود', msgs(TG_OWNER_CHAT).length === 1);
    wsGuard_('job:t', function () { return 'خوب'; });
    var hr = wsHealthRow_('job:t');
    ok('موفقیت شمار و هشدار را صفر می‌کند', hr['شکست پشت‌سرهم'] === 0 && hr['هشدار'] === '' && hr['نتیجه'] === 'موفق' && wsDue_('job:t'));
    ok('ردیف سلامت در ws_health با ستون‌های کار', wsHealthRows_().length === 1 && wsHealthRows_()[0]['کار'] === 'job:t');

    /* ۸. دکمهٔ میز کار، قفل، تریگر */
    reset();
    WS_CUR = '5001'; var row1 = wsMenuRow_(); WS_CUR = '5003'; var row3 = wsMenuRow_();
    ok('دکمه برای عضو تیم هست، برای مراجع نه', row1.length === 1 && row1[0][0].text === WS_BTN && row3.length === 0);
    ok('مراجع با دکمه به مسیر عادی می‌رود', wsRoute_('5003', { text: WS_BTN }) === false && TG_OUTBOX.length === 0);
    ok('عضو غیرفعال دکمه ندارد', wsTeamRoles_('5004').length === 0);
    wsRoute_('5002', { text: WS_BTN });
    var mm = msgs('5002')[0], btn = mm && mm.markup && mm.markup.inline_keyboard[0][0];
    ok('پیام فقط دکمه با لینک امضاشده و نقش از برگهٔ افراد', !!btn && btn.url === deskLink('5002', ['سوشال']) && mm.text === WS_BTN);
    ok('قفل: اجرای هم‌زمان رد می‌شود', wsMutex_(true) === true && wsMutex_(true) === false && wsMutex_(false) === true && wsMutex_(true) === true);
    wsMutex_(false);
    ok('wsTick خط اول توقف دیپلوی را دارد', /ciPaused_\(e, 'wsTick', 'skip'\)/.test(String(wsTick)));
    ok('wsSetup فقط تریگر ۵ دقیقه‌ای wsTick', /newTrigger\('wsTick'\)\.timeBased\(\)\.everyMinutes\(5\)/.test(String(wsSetup)));
    ok('در رجیستری TG_CAP', TG_CAP.some(function (c) { return c.key === 'ws_desk' && c.appNa; }));
    ok('کد هیچ مقدار کلیدی ندارد', !/TG_DIR_KEY'\s*,\s*'[^']{8,}'/.test(String(wsKey_)));
  } catch (e) {
    fail++; out.push('❌ خطا: ' + (e && e.stack || e));
  } finally {
    TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; WS_FAKE_HTTP = keep.http; WS_NOW = keep.now; WS_CUR = keep.cur;
  }
  return { pass: pass, fail: fail, text: out.join('\n') };
}

try { TG_CAP.push({ key: 'ws_desk', page: 'desk', label: 'میز کار تیم روی سایت با لینک امضاشدهٔ هفت‌روزه (v170.78)', roles: [], bot: true,
  appNa: 'میز کار صفحهٔ /desk/ سایت است و مینی‌اپ فقط لینکش را لازم دارد' }); } catch (eWc) {}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'wsTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['موتور میز کار (v170.78)', 'wsTests']); } catch (eWs) {}
