# نقشهٔ بات تلگرام تجربه

این فایل نقشهٔ کوتاه بات است: ماژول‌ها، تب‌ها، نقش‌ها و مسیرهای اصلی. شرح فنی کامل، دام‌ها و تاریخچه در اسکیل
`.claude/skills/tajrobeh-bot/SKILL.md` است. تاریخچهٔ نسخه‌ها در `CHANGELOG.md` ریشهٔ مخزن است.

**قاعده:** هر PR که ماژول، تب، نقش، کار زمان‌دار یا مسیر اصلی بات را عوض کند، همین فایل را در همان PR به‌روز می‌کند.
بخش خودکار پایین با `node .github/scripts/bot-map.mjs` ساخته می‌شود و اگر با کد یکی نباشد، بررسی PR قرمز می‌شود.
بخش دستی (همین بالا) را خودت به‌روز کن.

در این فایل هیچ شناسهٔ شیت، کانال، توکن، شماره یا اسم آدم نمی‌آید.

## ۱. ماژول‌ها

| فایل | کارش | پیشوند نام‌ها |
|---|---|---|
| `Code.gs` | درِ ورودی: وبهوک تلگرام (با `update_id`)، فرم‌های سایت، واتس‌اپ، کلیک تماس | بی‌پیشوند |
| `telegram.gs` | منطق اصلی بات: منوها، نقش‌ها، پذیرش و لید، معارفه و رزرو، جلسهٔ درمان، مدرسه، مجله، اطلاعیه، مینی‌اپ (`?api=`)، کارهای زمان‌دار، تست‌ها | `tg` و `TG_` |
| `building.gs` | هاب ساختمان پزشکان ونک؛ عمداً جدا از بقیهٔ بات | `vk` و `VK_` |
| `social.gs` | میز سوشال و صف ارسال زمان‌دار | `so` و `SO_` |
| `partners.gs` | تجربه پارتنرز: فضاها، اتاق‌ها، ساعت حضوری، روز بسته | `pt` |
| `maint.gs` | نقطهٔ اجرای دستی توابع نگهداری از ادیتور | `maintRun` |
| `v162.gs` | رویدادهای مدرسه، جذب تراپیست برای پذیرش، تکرار وقت‌ها | `tg` |
| `mag_contrib.gs` | مشارکت در مجله: بازبینی علمی، صدای نویسنده، افزوده | `mc` |
| `author.gs` | حساب نویسندهٔ وردپرس، خودسرویس | `tgAu` |
| `voice.gs` | موتور صدا: ویس به متن، مچ‌میکینگ صوتی، صدای نویسنده | `vx` |
| `seo_gemini.gs` | پیشنهاد سئوی مجله با Gemini (فقط محتوای منتشرشده) | `seo` |
| `gemini_setup.gs` | اتصال Gemini؛ کلید فقط در Script Properties | `gem` |
| `ci.gs` | مسیر دیپلوی خودکار: کلید یک‌بارمصرف، توقف کارهای زمان‌دار، تست، پایش خطا، اجرای یک‌باره | `ci` |
| `ebi.gs` | کمپین «پلی‌لیستِ ابی» (C-004، v170.15 به بعد): اکشن `ebi_check` درگاه، کدهای start `ebi…`، ویس درمانگران، تب آینهٔ ثبت‌نام‌ها، راهبران از تنظیمات | `ebi` و `EBI_` |
| `version.gs` | شمارهٔ نسخهٔ کد (`TG_CODE_VERSION`) | |

ترتیب اجرای فایل‌ها مهم است و در `bot/.clasp.json` (`filePushOrder`) ثابت شده: اول `Code.gs`، بعد `telegram.gs`.

## ۲. داده کجاست

- **هاب تجربه** (شیت اصلی): درمانگران، لیدها، اسلات معارفه، وقت‌های هفتگی، افراد و نقش‌ها، کارها، خطاها، تست‌ها.
- **هاب مدرسه**: لیدها و عضویت مدرسه، رویدادها، دانش‌آموختگان.
- **هاب محتوا**: مجله، مشارکت مجله، صف ارسال سوشال.
- **هاب آمار**: آمار روزانه، سئو.
- **شیت‌های ساختمان**: جدا، فقط برای `building.gs`.
- **Script Properties**: توکن‌ها و کلیدها، وضعیت‌های کوتاه (صف کشیک، صف تکرار لید، آمار زمان اجرا). هیچ‌کدام در گیت نیست.

فهرست کامل تب‌ها در بخش خودکار پایین است.

## ۳. نقش‌ها

نقش هر حساب از سه منبع جمع می‌شود: تب «درمانگران»، تیم پذیرش، و تب «افراد» (`tgRolesOf_`).
یک نفر می‌تواند چند نقش داشته باشد و منو از مجموعهٔ نقش‌ها ساخته می‌شود. همه نقش پایهٔ «مراجع» را هم دارند.
دستورها و دکمه‌های تیمی فقط با نقش تیمی باز می‌شوند (v166.9، مجموعهٔ تست «دسترسی‌ها»).

## ۴. مسیرهای اصلی

| کیست | مسیر | کجای کد |
|---|---|---|
| مراجع | شروع ← پرسش‌های پذیرش ← شماره ← لید در «لیدها» با کد لید ← خبر به کشیک | `tgOnPhone_`، `tgAppendLead_`، `tgDutyTick` |
| مراجع | وقت معارفه: فهرست وقت‌های خالی ← رزرو (دوباره با شیت سنجیده می‌شود) ← «وقت معارفهٔ من» و لغو | `tgSlotBookable_`، `tgMeetGet_` |
| مراجع | مینی‌اپ: گالری درمانگران، مچ‌میکینگ، رزرو | `?api=` در `tgApiRoute_` |
| فرم سایت | فرم وردپرس ← `doPost` ← لید (زیر قفل، تکراری حذف) | `Code.gs` |
| پذیرش | کارت لید، تماس اول، پیگیری دوساعته، واگذاری، گزارش روزانه | `tgLeadCardText_`، `tgSlaTick_` |
| درمانگر | اتصال خودسرویس: نام و شماره ← درخواست ← تأیید پذیرش یا یاسر با یک لمس (v166.21) ← منوی درمانگر، وقت‌ها، جلسه‌ها | `tgTherSignup_`، `tgTqRequest_`، `tgOnTq_` |
| همکار | «🪪 نقش دیگری دارم»: نام ← درخواست ← تأیید پذیرش یا یاسر (v166.21) | `tgRoleClaimName_`، `tgTqRequest_` |
| درمانگر | جلسهٔ درمان و یادآوری (۲۴ ساعته، «امروز» یا «فردا») | `tgMeetTick`، `tgSoonWord_` |
| مدرسه | لید مدرسه، رویدادها، عضویت، کامیونیتی | `tgSch*`، `v162.gs` |
| مجله | نویسنده، بازبینی، صدا، انتشار | `mag_contrib.gs`، `author.gs`، `voice.gs` |
| ساختمان | شارژ، پرداخت (کارت از نقش «روان‌پزشکی» در «افراد»)، هزینه، اطلاعیه | `building.gs` |
| پرداخت | پرداخت تتر برای خارج از ایران | `tgPay*`، `tgPayTick` |
| کمپین C-004 | `ebi<id>-<hex>` اتصال ثبت‌نام سایت · `ebi-<نوع>` نام و شماره ← `/tj/v1/ebi-join` ← اتصال · `ebi-list` نوشتن و دیدن فهرست · `ebi-voice` ویس درمانگر با اجازه ← راهبران. تب‌ها: «پلی‌لیست ابی · ویس‌ها» و «پلی‌لیست ابی · ثبت‌نام‌ها» (هاب پذیرش، بی شماره). راهبران: کلید «راهبران C-004» در «تنظیمات خصوصی بات» | `ebiRoute_`، `ebiCb_`، `ebiHourly_` |

## ۵. انتشار

فقط از مسیر خودکار گیت‌هاب: مرج روی شاخهٔ اصلی ← بررسی محلی ← نسخهٔ آزمایشی و همهٔ تست‌ها ← دیپلوی اصلی ← پایش خطا ← برگشت خودکار.
شرح در اسکیل بات بخش ۱۶ و در `.github/workflows/bot-deploy.yml`.

## ۶. خودکار از کد

<!-- AUTO:START (node .github/scripts/bot-map.mjs) -->
نسخهٔ کد: `v170.23.2`

### فایل‌ها (به ترتیب اجرا)

| فایل | خط | تابع |
|---|---|---|
| `Code.gs` | ۴۱۲ | ۳۳ |
| `telegram.gs` | ۳۷۶۶۷ | ۲۰۳۶ |
| `building.gs` | ۲۰۵۲ | ۱۷۱ |
| `social.gs` | ۳۳۸ | ۲۵ |
| `partners.gs` | ۱۹۲۸ | ۱۶۲ |
| `maint.gs` | ۴ | ۱ |
| `v162.gs` | ۷۹۹ | ۶۴ |
| `school2.gs` | ۴۳۹ | ۳۲ |
| `mag_contrib.gs` | ۱۲۴۳ | ۹۷ |
| `author.gs` | ۱۴۸ | ۱۰ |
| `voice.gs` | ۱۰۷۶ | ۹۱ |
| `review.gs` | ۶۲۳ | ۵۳ |
| `seo_gemini.gs` | ۲۳۱ | ۱۶ |
| `gemini_setup.gs` | ۳۵ | ۳ |
| `mig.gs` | ۴۲۲ | ۲۵ |
| `publish.gs` | ۱۵۷۴ | ۱۲۰ |
| `v168.gs` | ۲۱۴۷ | ۱۲۶ |
| `wppage.gs` | ۱۹۴ | ۱۵ |
| `stuck.gs` | ۴۷۸ | ۳۴ |
| `leadmodel.gs` | ۷۷۷ | ۴۱ |
| `comments.gs` | ۹۰۴ | ۵۷ |
| `dq.gs` | ۵۹۳ | ۴۹ |
| `cfg.gs` | ۱۵۳ | ۱۴ |
| `ops.gs` | ۱۱۱۱ | ۹۹ |
| `social_ig.gs` | ۳۳۰ | ۱۴ |
| `v17013.gs` | ۵۵۷ | ۴۰ |
| `ebi.gs` | ۹۹۶ | ۷۱ |
| `ci.gs` | ۵۴۳ | ۳۱ |
| `sitesec.gs` | ۲۷۵ | ۲۲ |
| `sec.gs` | ۱۰۵ | ۱ |
| `version.gs` | ۸ | ۰ |

### کارهای زمان‌دار

توقف در زمان دیپلوی: «رد» یعنی این نوبت اجرا نمی‌شود، «عقب» یعنی بعد از سبز شدن تست‌ها اجرا می‌شود.

| تابع | فایل | زمان‌بندی | در زمان دیپلوی |
|---|---|---|---|
| `ptTick` | `partners.gs` | onEdit / دستی | رد |
| `soTick` | `social.gs` | everyMinutes(5) | رد |
| `tgAnnDue` | `telegram.gs` | at(at) | عقب |
| `tgCpTick` | `telegram.gs` | everyMinutes(5) | رد |
| `tgDaily` | `telegram.gs` | atHour(21) | عقب |
| `tgDigestEvening` | `telegram.gs` | atHour(18) | عقب |
| `tgDigestMorning` | `telegram.gs` | atHour(9) | عقب |
| `tgDutyTick` | `telegram.gs` | everyMinutes(5) | رد |
| `tgMeetTick` | `telegram.gs` | everyMinutes(30) | رد |
| `tgMonWeekly` | `telegram.gs` | onEdit / دستی | عقب |
| `tgPayTick` | `telegram.gs` | everyMinutes(1) | رد |
| `tgTherWeekly` | `telegram.gs` | onEdit / دستی | عقب |
| `tgWatchdog` | `telegram.gs` | everyHours(1) | عقب |
| `vkTick` | `building.gs` | onEdit / دستی | رد |
| `vxTick` | `voice.gs` | after(پویا) | رد |
| `ciRunDeferred` | `ci.gs` | at(پویا)، after(5000)، after(60 * 1000) | متوقف نمی‌شود |
| `tgPoll` | `telegram.gs` | everyMinutes(1) | متوقف نمی‌شود |
| `tgRun` | `telegram.gs` | after(60 * 1000)، after(1000) | متوقف نمی‌شود |
| `tgTick5` | `v168.gs` | everyMinutes(5) | متوقف نمی‌شود |

### تب‌های شیت

هر ثابتی که با `getSheetByName` خوانده می‌شود. شیتی که تب در آن است از خود کد معلوم است.

| ثابت | نام تب | فایل‌ها |
|---|---|---|
| `CFG_TAB` | «تنظیمات خصوصی بات» | `cfg.gs` |
| `CM_FIX_TAB` | «اصلاح کامنت‌ها · پیش‌نمایش» | `comments.gs` |
| `CM_TAB` | «دفتر کامنت‌ها» | `comments.gs` |
| `DQ_TAB` | «صف ارسال» | `dq.gs` |
| `EBI_MIRROR_TAB` | «پلی‌لیست ابی · ثبت‌نام‌ها» | `ebi.gs` |
| `HUB_GUIDE` | «راهنما» | `ops.gs` |
| `HUB_MINE` | «کارهای من» | `ops.gs` |
| `HUB_QUEUES` | «صف‌ها» | `ops.gs` |
| `HUB_REPORT` | «گزارش من» | `ops.gs` |
| `HUB_TODAY` | «امروز» | `ops.gs` |
| `LM_DASH` | «داشبورد لید» | `leadmodel.gs` |
| `OPS_LISTS_TAB` | «فهرست‌ها» | `ops.gs` |
| `OPS_REG_TAB` | «هاب‌ها» | `ops.gs` |
| `OPS_TAB` | «کارها» | `ops.gs` |
| `SC_T_LADDER` | «نردبان دانشجو» | `school2.gs` |
| `SEO_TAB` | «سئو · پیشنهاد Gemini» | `seo_gemini.gs` |
| `STK_TAB` | «درخواست‌های متوقف» | `stuck.gs` |
| `TG_AE_TAB` | «رویدادهای بات و اپ» | `telegram.gs` |
| `TG_ANN_TAB` | «اطلاعیه‌ها» | `telegram.gs` |
| `TG_APM_TAB` | «جذب تراپیست» | `telegram.gs` |
| `TG_BOX_TAB` | «صندوق پیام» | `telegram.gs` |
| `TG_BUG_TAB` | «باگ و پیشنهاد» | `telegram.gs` |
| `TG_CFG_TAB` | «تنظیمات» | `telegram.gs` |
| `TG_COLL_TAB` | «تماس همکاران» | `telegram.gs` |
| `TG_CRM_TAB` | «🧭 CRM لیدها» | `telegram.gs` `v168.gs` |
| `TG_DAY_TAB` | «نظارت روزانه» | `telegram.gs` |
| `TG_DESK_TAB` | «تیم پذیرش» | `telegram.gs` |
| `TG_DUTY_LOG` | «نوبت پذیرش · پاسخ‌ها» | `telegram.gs` |
| `TG_DUTY_TAB` | «نوبت پذیرش» | `telegram.gs` |
| `TG_EFT_TAB` | «فرم ثبت‌نام EFT» | `telegram.gs` |
| `TG_ERR_TAB` | «خطاها» | `telegram.gs` |
| `TG_EVR_TAB` | «ثبت‌نام رویداد» | `telegram.gs` |
| `TG_EV_FUN` | «قیف بات و اپ» | `telegram.gs` |
| `TG_EV_TAB` | «رویدادها» | `telegram.gs` |
| `TG_FAQ` | «سؤالات متداول» | `telegram.gs` |
| `TG_FB_LOG` | «بازخوردها» | `telegram.gs` |
| `TG_FEED_ITEMS_TAB` | «محتوای تجربه» | `telegram.gs` |
| `TG_FEED_TAB` | «علاقه‌مندان محتوا» | `telegram.gs` |
| `TG_INP_CAP` | «ظرفیت حضوری» | `telegram.gs` |
| `TG_INP_CHKL` | «چک‌لیست مکان‌ها» | `telegram.gs` |
| `TG_INP_HOURS` | «ساعت‌های حضوری» | `telegram.gs` `v162.gs` |
| `TG_INP_LOG` | «بررسی حضوری» | `telegram.gs` |
| `TG_INP_PLACES` | «مکان‌های حضوری» | `telegram.gs` `v168.gs` |
| `TG_INP_ROOMS` | «اتاق‌های حضوری» | `telegram.gs` |
| `TG_INP_RULES` | «قوانین حضوری» | `telegram.gs` |
| `TG_LEADS` | «لیدها» | `Code.gs` `telegram.gs` `partners.gs` `v168.gs` `leadmodel.gs` `comments.gs` `v17013.gs` `ebi.gs` |
| `TG_LEAD_EV_TAB` | «رویدادهای لید» | `telegram.gs` `comments.gs` |
| `TG_MAG_TAB` | «نویسندگان مجله» | `telegram.gs` |
| `TG_MAG_TOPICS_TAB` | «موضوعات مجله» | `telegram.gs` |
| `TG_MIG_TAB` | «تست مهاجرت» | `mig.gs` |
| `TG_MON_TAB` | «نظارت» | `telegram.gs` |
| `TG_MSG_LOG` | «پیام‌ها» | `telegram.gs` |
| `TG_OB_TAB` | «آنبوردینگ» | `telegram.gs` |
| `TG_OCC_TAB` | «اشغال هفتگی گاندی» | `partners.gs` |
| `TG_OFF_TAB` | «مرخصی درمانگران» | `telegram.gs` |
| `TG_OUT_TAB` | «ارسال‌های بات» | `telegram.gs` |
| `TG_PEOPLE_TAB` | «افراد» | `telegram.gs` `social.gs` `ops.gs` |
| `TG_PEV_TAB` | «رویدادهای افراد» | `telegram.gs` |
| `TG_PN_TAB` | «صفحهٔ پارتنر» | `telegram.gs` `partners.gs` |
| `TG_POLICY_TAB` | «سیاست پیام» | `telegram.gs` |
| `TG_POL_TAB` | «سیاست‌ها» | `telegram.gs` |
| `TG_POOLS_TAB` | «استخرها» | `telegram.gs` |
| `TG_PQ_QTAB` | «پرسش‌نامهٔ پروفایل» | `telegram.gs` |
| `TG_PQ_TAB` | «پروفایل سایت» | `telegram.gs` |
| `TG_PSY_T_APPT` | «نوبت‌ها» | `telegram.gs` |
| `TG_PSY_T_PAY` | «پرداخت‌ها» | `telegram.gs` |
| `TG_QUEUE_TAB` | «صف پیام» | `telegram.gs` |
| `TG_RMSTAT_TAB` | «رودمپ · آمار روزانه» | `telegram.gs` |
| `TG_RPT_DATA` | «لیدها · داده» | `telegram.gs` |
| `TG_RPT_TAB` | «📊 گزارش پذیرش» | `telegram.gs` |
| `TG_SCH_CODES_TAB` | «کدهای مدرسه» | `telegram.gs` |
| `TG_SCH_DESK_TAB` | «کارتابل مدرسه» | `telegram.gs` |
| `TG_SCH_FUNNEL_TAB` | «قیف کمپین» | `telegram.gs` |
| `TG_SCH_MOVED_TAB` | «منتقل شد ← لیدهای مدرسه» | `telegram.gs` |
| `TG_SCH_T_ALUM` | «دانش‌آموختگان» | `telegram.gs` |
| `TG_SCH_T_COMM` | «کامیونیتی» | `telegram.gs` |
| `TG_SCH_T_MEM` | «عضویت دانشجو» | `telegram.gs` |
| `TG_SCH_T_REQ` | «لیدهای مدرسه» | `telegram.gs` |
| `TG_SCH_T_REQ_OLD` | «درخواست عضویت» | `telegram.gs` |
| `TG_SEO_TAB` | «الزامات سئو» | `telegram.gs` |
| `TG_SESS` | «جلسه‌های درمان» | `telegram.gs` |
| `TG_SLOTS` | «اسلات معارفه» | `telegram.gs` `v168.gs` |
| `TG_STAT_DASH` | «داشبورد» | `telegram.gs` |
| `TG_STAT_TAB` | «آمار روزانهٔ بات» | `telegram.gs` |
| `TG_SUP_TAB` | «درخواست سوپرویژن» | `telegram.gs` |
| `TG_TEST_TAB` | «تست‌ها» | `telegram.gs` |
| `TG_THER` | «درمانگران» | `telegram.gs` `v168.gs` |
| `TG_TK_TAB` | «پیام‌های درمانگران» | `telegram.gs` |
| `TG_TSK_TAB` | «کارها» | `telegram.gs` |
| `TG_USERS_TAB` | «کاربران بات» | `telegram.gs` `ebi.gs` |
| `TG_UTM_TAB` | «سئو · لینک‌های UTM» | `telegram.gs` |
| `TG_WEEKLY` | «وقت‌های هفتگی» | `telegram.gs` `v162.gs` |
| `TG_WF_TAB` | «بازخورد وبینار» | `telegram.gs` |
| `V168_T_QUEUE` | «کارتابل پیگیری» | `v168.gs` |
| `V168_T_VOCAB` | «واژگان» | `v168.gs` |
| `V17013_OF_TAB` | «کمپین‌های مراجعان» | `v17013.gs` |
| `V17013_SCHO_TAB` | «بورسیه» | `v17013.gs` |

### نقش‌ها (`TG_ROLES`)

«مراجع»، «درمانگر»، «دانشجو»، «استاد»، «سوپروایزر»، «پذیرش»، «مالی»، «مدرسه»، «سازمانی»، «روان‌پزشکی»، «ناظر»، «سردبیر»، «راهبر»، «مصاحبه‌گر»، «سوشال»، «پارتنر»، «تنخواه»، «منتور»، «نمایندهٔ کلاس»

### مجموعه‌های تست (`TG_SUITES`)

| نام | تابع |
|---|---|
| تست مهاجرت | `tgMigTests` |
| چرخهٔ لید v168 | `tgV168Tests` |
| v168.9: کد start، کشور و آشنایی، ثبت مطلب | `tgV1689Tests` |
| v168.10: سهمیهٔ زمان اجرا | `tgV16810Tests` |
| روند بازبینی علمی v169 | `rvTests` |
| هاب عملیات و حضور v169.2 | `opsTests` |
| انتشار خودکار برگهٔ مینی‌اپ v169.4 | `wpPageTests` |
| صف ارسال v170 | `dqTests` |
| درگاه API: اکشن send v170.1 | `pbSendTests` |
| هشدار درخواست متوقف v170.2 | `stkTests` |
| مدل لید v170.2 | `lmTests` |
| کامنت‌های هاب پذیرش v170.2 | `cmTests` |
| v169.1: تجمیع تریگرها | `tgV1691Tests` |
| ورود اینستاگرام | `tgIgTests` |
| کمپین ثبت‌نام | `tgCpTests` |
| ساختمان ونک | `vkTests` |
| رودمپ‌ها | `tgRmTests` |
| مجله نسخهٔ ۹۹ | `tgMagV99Tests` |
| همگامی بات و مینی‌اپ | `tgParityTests` |
| کش وقت‌های معارفه | `tgSlotsCacheTests` |
| شکل عکس | `tgImgTests` |
| کارها و صندوق پیام | `tgV1Tests` |
| استخر و سئو | `tgSeoTests` |
| آمار روزانه | `tgStatTests` |
| مدرسه | `tgSchoolTests` |
| هاب مدرسه | `tgSchool2Tests` |
| هستهٔ نسخهٔ ۲ | `tgCoreTests` |
| موتور پیام | `tgNotifyTests` |
| پایپ‌لاین مطالب | `tgMagV150Tests` |
| روان‌پزشکی | `tgPsyTests` |
| رویدادهای مدرسه | `tgEvV152Tests` |
| غنی‌سازی | `tgEnTests` |
| همراه و مرخصی | `tgV154Tests` |
| نشانی پارتنر و سرعت | `tgV155Tests` |
| اصلاح‌های v157 | `tgV157Tests` |
| جذب تراپیست v159 | `tgV159Tests` |
| پل هویت | `tgIdBridgeTests` |
| مجله | `tgMagTests` |
| پروفایل سایت | `tgPqTests` |
| بازبینی پروفایل | `tgPrTests` |
| حضوری | `tgInpTests` |
| پرداخت تتر | `tgPayTests` |
| پروفایل در مینی‌اپ | `tgPqApiTests` |
| متن اطلاعیه | `tgAnnSafeTests` |
| مچ‌میکینگ | `tgMatchTests` |
| جلسهٔ درمان | `tgSessTests` |
| تقویم و دعوت | `tgCalTests` |
| نرخ و ظرفیت | `tgPqKTests` |
| چرخهٔ لید | `tgLeadTests` |
| چرخهٔ لید ۲ | `tgLead2Tests` |
| کارت ارجاع | `tgReferTests` |
| چرخهٔ واتس‌اپ | `tgWaTests` |
| وقت و پیگیری جلسه | `tgScTests` |
| مدرسه ۲ | `tgSchool3Tests` |
| مرز مدرسه | `tgSchBorderTests` |
| لید واحد مدرسه | `tgSchUnifyTests` |
| فرم اپلای | `tgApFormTests` |
| برچسب دکمه‌ها | `tgBtnTests` |
| تیکت درمانگران | `tgTkTests` |
| مالی و مدرسه | `tgFinSchTests` |
| ثبت‌نام خودسرویس | `tgSignupTests` |
| پروفایل درمانگر | `tgProTests` |
| تاریخ | `tgDateTests` |
| دامنهٔ گزارش | `tgScopeTests` |
| نقش‌ها | `tgRoleTests` |
| گروه | `tgGroupTests` |
| واگذاری | `tgAssignTests` |
| استخرها | `tgPoolTests` |
| نظارت | `tgMonTests` |
| گزارش روزانه | `tgDayTests` |
| کارت اطلاعیه | `tgAnnUiTests` |
| پیوستن به تجربه | `tgApV106Tests` |
| بازخورد وبینار | `tgWfTests` |
| فرم EFT | `tgEftTests` |
| تجربه پارتنرز | `tgPaTests` |
| تنخواه | `tnkTests` |
| تگ حضوری | `tgInpTagTests` |
| پیام همگانی | `tgBcTests` |
| رأی شهر | `tgCvTests` |
| مشارکت مجله | `mcTests` |
| حساب نویسنده | `tgAuTests` |
| موتور صدا | `vxTestsRun` |
| مسیر دیپلوی خودکار | `ciTests` |
| دسترسی‌ها | `tgAccessTests` |
| لید گم‌نشدنی | `tgLeadSafeTests` |
| پیگیری EFT | `tgEft166Tests` |
| رویکرد تازهٔ مدرسه | `scTests` |
| درگاه انتشار | `pbTests` |
| امنیت ورودی سایت | `ssTests` |
| اصلی ۱ از ۳ | `tgRunTests1` |
| اصلی ۲ از ۳ | `tgRunTests2` |
| اصلی ۳ از ۳ | `tgRunTests3` |
| دایرکتوری صفحهٔ اصلی p3 (v170.23.2) | `tgDirP3Tests` |
| دادهٔ دکمه (v170.9.2) | `tgCbTests` |
| مینی‌اپ ۲ | `tgApp2Tests` |
| نسخهٔ ۱۱۶ | `tgV116Tests` |
| پیام و بازخورد | `tgV117MsgTests` |
| تجربه پارتنرز ۲ | `ptTests` |
| برنامهٔ من (v118) | `tgV118Tests` |
| اشغال گاندی (v144) | `tgOccTests` |
| پشتیبان مدل لید (v170.4) | `lmSafeTests` |
| تنظیمات خصوصی (v170.8، v170.9) | `cfgTests` |
| نسخهٔ ۱۶۲ | `tgV162Tests` |
| v170.13: سقف پذیرش، بورسیه، آفر | `v17013Tests` |
| کمپین C-004 (پلی‌لیست ابی) | `ebiTests` |
| کمپین C-004 · کدها و ویس (v170.16) | `ebiCodeTests` |
| امنیت ورودی‌ها (v170.9) | `secTests` |
| کمپین C-004 · شب‌ها و گزارش (v170.17) | `ebiNightTests` |

### درخواست‌های ci (فقط گردش کار دیپلوی، با کلید یک‌بارمصرف)

`ping`، `start`، `status`، `kick`، `resume`، `errs`، `stats`، `once`، `onceAuto`، `smoke`، `health`، `auth`، `props`، `pagesync`، `cfgcheck`، `pagesha`
<!-- AUTO:END -->
