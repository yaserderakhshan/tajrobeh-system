/* ============================================================================
   v168 فاز ۱: ورود از اینستاگرام با کد start الگوی ig_<پیج>_<کلمه>
   ----------------------------------------------------------------------------
   - تشخیص در مسیر اصلی کدهای start (tgPrivate_)، پیش از مدرسه و پیش از «کد ناشناخته».
   - هر کلمه یک سطر در تب «نقشهٔ کلمه‌ها» هاب تجربه است. کلمهٔ تازه = یک سطر تازه، بدون کد.
   - کلمه‌ای که در جدول نیست هم کار می‌کند: منبع ثبت می‌شود و خوش‌آمد عادی می‌آید.
   - منبع «اینستاگرام · <پیج> · <کلمه>» روی کاربر (کش و تب کاربران بات) و روی لید می‌نشیند.
   - مقصدها:
       تراپی                 خوش‌آمد کوتاه، سؤال موضوع، بعد معارفه (مثل gt- بی‌موضوع)
       تراپی خارج            مسیر خارج از ایران
       مدرسه                 فهرست دوره‌های باز
       مدرسه:<دوره یا کمپین>  لید مدرسه + کارت برای مسئول مدرسه (مثل EFT) + کارت دوره اگر کمپین دارد
       بات:<کد start>        همان مسیر موجود بات (ev، comm، join، style، test و …)
       صفحه:/<مسیر>          یک پیام کوتاه با دکمهٔ لینک صفحه‌ای از tajrobeh.life (با UTM)
       بات:mig               تست تجربهٔ روانی مهاجرت (mig.gs) با همان منبع اینستاگرام
       تست‌ها                 منوی «تست‌های تجربه در بات»
   - قاعدهٔ ثابت: هیچ مقصدی بیرون از اکوسیستم تجربه نیست (پرسلاین، فرم گوگل و مانند این‌ها). نشانی بیرونی پذیرفته نمی‌شود.
       خوش‌آمد یا خالی        خوش‌آمد عادی
   - کلمه فقط حروف انگلیسی کوچک، رقم و زیرخط. کل کد حداکثر ۶۴ نویسه (سقف تلگرام).
   ============================================================================ */

var IG_T_MAP = 'نقشهٔ کلمه‌ها';
var IG_MAP_HEAD = ['پیج', 'کلمه', 'برچسب فارسی', 'مقصد', 'نوع درخواست', 'حالت جلسه', 'شناسهٔ مکان', 'موضوع', 'کد UTM'];
var IG_PAGES = { tl: 'tajrobeh.life', ts: 'tajrobeh_school' };
var IG_RE = /^ig_([a-z]{2})_([a-z0-9_]{1,56})$/;
var IG_DAYS = 30;                    /* ورود اینستاگرام تا چند روز روی لید تازه می‌نشیند */
var IG_USERS_COL = 'ورود اینستاگرام';   /* ستون انتهای تب کاربران بات: «کد|yyyy-MM-dd» */

/* سطرهای آغازین، از جدول کلیدواژه‌های سند سوشال (فصل دو) و کدهایی که دایرکتم الان می‌فرستد
   (ig_tl_roya، ig_tl_jameh، ig_tl_test، ig_ts_roya، ig_tl_bat، ig_ts_bat). */
var IG_MAP_SEED = [
  ['tl', 'therapy',   'شروع تراپی',            'تراپی',                            '',            '',      '',       '', 'U-221'],
  ['tl', 'abroad',    'خارج از ایران',          'تراپی خارج',                       '',            'آنلاین', '',       '', 'U-222'],
  ['tl', 'school',    'مدرسه',                 'مدرسه',                            '',            '',      '',       '', 'U-223'],
  ['tl', 'karaj',     'حضوری کرج',             'تراپی',                            '',            'حضوری', 'karaj2', '', 'U-226'],
  ['tl', 'eft',       'دورهٔ EFT',              'مدرسه:EFT',                        '',            '',      '',       '', 'U-227'],
  ['tl', 'webinar',   'رویدادهای مدرسه',        'بات:ev',                           '',            '',      '',       '', 'U-228'],
  ['tl', 'clinical',  'دورهٔ تجربه بالینی',      'مدرسه:تجربه بالینی',               '',            '',      '',       '', 'U-229'],
  ['tl', 'map',       'چطور درمانگر شویم',      'صفحه:/how-to-become-a-therapist/', '',            '',      '',       '', 'U-230'],
  ['tl', 'grief',     'ماتم و مالیخولیا',       'صفحه:/mag/melancholia-in-war/',    '',            '',      '',       '', 'U-231'],
  ['tl', 'bat',       'بات تلگرام',             'خوش‌آمد',                          '',            '',      '',       '', ''],
  ['tl', 'cost',      'هزینه',                 'تراپی',                            '',            '',      '',       '', 'U-233'],
  ['tl', 'group',     'گروه‌درمانی',            'تراپی',                            'گروه‌درمانی', '',      '',       '', 'U-235'],
  ['tl', 'approach',  'رویکرد',                'بات:style',                        '',            '',      '',       '', ''],
  ['tl', 'roya',      'دورهٔ رویا',             'مدرسه:دورهٔ رویا',                 '',            '',      '',       '', ''],
  ['tl', 'jameh',     'جامعه',                 'بات:comm',                         '',            '',      '',       '', ''],
  ['tl', 'test',      'تست تجربهٔ روانی مهاجرت', 'بات:mig',                          '',            '',      '',       '', ''],
  ['ts', 'school',    'مدرسه',                 'مدرسه',                            '',            '',      '',       '', 'U-224'],
  ['ts', 'therapy',   'شروع تراپی',            'تراپی',                            '',            '',      '',       '', 'U-225'],
  ['ts', 'eft',       'دورهٔ EFT',              'مدرسه:EFT',                        '',            '',      '',       '', 'U-238'],
  ['ts', 'webinar',   'رویدادهای مدرسه',        'بات:ev',                           '',            '',      '',       '', 'U-239'],
  ['ts', 'migration', 'رودمپ مهاجرت روان‌شناسان', 'صفحه:/roadmap/psychology-migration/', '',        '',      '',       '', 'U-240'],
  ['ts', 'clinical',  'دورهٔ تجربه بالینی',      'مدرسه:تجربه بالینی',               '',            '',      '',       '', 'U-241'],
  ['ts', 'map',       'چطور درمانگر شویم',      'صفحه:/how-to-become-a-therapist/', '',            '',      '',       '', 'U-242'],
  ['ts', 'edu',       'آموزش',                 'مدرسه',                            '',            '',      '',       '', ''],
  ['ts', 'bat',       'بات تلگرام',             'بات:join',                         '',            '',      '',       '', ''],
  ['ts', 'roya',      'دورهٔ رویا',             'مدرسه:دورهٔ رویا',                 '',            '',      '',       '', ''],
  ['ts', 'approach',  'رویکرد',                'بات:style',                        '',            '',      '',       '', '']
];

var T_IG_THER = 'خوش آمدید.\n\nچند سؤال کوتاه می‌پرسم تا درمانگر مناسب را پیدا کنیم. جلسهٔ معارفه رایگان است و حدود بیست دقیقه طول می‌کشد.';
var T_IG_INP = 'جلسهٔ حضوری را برایتان یادداشت کردیم.';
var T_IG_SCH = 'درخواستتان برای «{c}» ثبت شد. مسئول مدرسه همین‌جا در تلگرام با شما در تماس است.';
var T_IG_PAGE = '«{c}» را از دکمهٔ زیر ببینید.';
var T_IG_TESTS = 'تست ارزیابی مهاجران هنوز در بات نیست. فعلاً این تست را دارید:';
var IG_SITE = 'https://tajrobeh.life';
/* فقط صفحه‌های خود سایت؛ هر نشانی بیرونی رد می‌شود (قاعدهٔ ۱۲ CLAUDE.md) */
function igPageUrl_(x) {
  var u = String(x || '').trim();
  if (/^\/[^\s]*$/.test(u)) return IG_SITE + u;
  if (/^https:\/\/(www\.)?tajrobeh\.life(\/[^\s]*)?$/.test(u)) return u;
  return '';
}

/* ---------- خواندن نقشه (کش ۱۰ دقیقه) ---------- */
function igS_(v) { return String(v == null ? '' : v).trim(); }
function igMap_() {
  return pbCache_('igmap', function () {
    var o = {};
    pbRows_('e', IG_T_MAP, IG_MAP_HEAD, IG_MAP_SEED).forEach(function (r) {
      var p = igS_(r['پیج']).toLowerCase(), k = igS_(r['کلمه']).toLowerCase();
      if (!p || !k) return;
      o[p + '_' + k] = { page: p, kw: k, label: igS_(r['برچسب فارسی']), dest: igS_(r['مقصد']), kind: igS_(r['نوع درخواست']),
                         mode: igS_(r['حالت جلسه']), place: igS_(r['شناسهٔ مکان']), topic: igS_(r['موضوع']), utm: igS_(r['کد UTM']) };
    });
    return o;
  });
}
function igParse_(code) {
  var c = igS_(code);
  if (c.length > 64) return null;
  var m = c.match(IG_RE);
  if (!m) return null;
  return { page: m[1], kw: m[2], code: c };
}
function igRow_(page, kw) {
  var r = null;
  try { r = igMap_()[page + '_' + kw] || null; } catch (e) {}
  return r || { page: page, kw: kw, label: '', dest: '', kind: '', mode: '', place: '', topic: '', utm: '' };
}
function igSrc_(page, kw) { return 'اینستاگرام · ' + page + ' · ' + kw; }
function igLabel_(code) {
  var x = igParse_(code);
  if (!x) return '';
  var r = igRow_(x.page, x.kw);
  return 'اینستاگرام › ' + x.page + ' › ' + (r.label || x.kw);
}

/* ---------- حافظهٔ ورود روی کاربر ---------- */
/* کش ۶ ساعته کافی نیست (لید ممکن است روزها بعد ساخته شود)، پس در تب کاربران بات هم می‌ماند. */
function igRemember_(chat, code) {
  tgSetVal_('igc', chat, code);
  tgSetVal_('src', chat, (function () { var x = igParse_(code); return x ? igSrc_(x.page, x.kw) : ''; })());
  if (TG_DRY) { TG_MEM['igu:' + chat] = code + '|' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd'); return; }
  try {
    var sh = tgUserSheet_(true);
    if (!sh) return;
    var col = igUsersCol_(sh), last = sh.getLastRow(), at = 0;
    if (last > 1) {
      var ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === String(chat)) { at = i + 2; break; }
    }
    var val = code + '|' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
    if (at) sh.getRange(at, col).setValue(val);
    else {
      var row = [String(chat), '', '', '', '', '', ''];
      while (row.length < col - 1) row.push('');
      row.push(val);
      sh.appendRow(row);
    }
  } catch (e) { tgErr_('igRemember_', e); }
}
function igUsersCol_(sh) {
  var lc = Math.max(sh.getLastColumn(), TG_USERS_HEAD.length);
  var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
  var i = head.indexOf(IG_USERS_COL);
  if (i > -1) return i + 1;
  var at = Math.max(head.filter(String).length, TG_USERS_HEAD.length) + 1;
  sh.getRange(1, at).setValue(IG_USERS_COL).setFontWeight('bold');
  return at;
}
/* کد ورود اینستاگرامِ این کاربر اگر در IG_DAYS روز اخیر بوده، وگرنه '' */
function igRecall_(chat) {
  if (!chat) return '';
  var hit = tgGetVal_('igc', chat);
  if (hit) return hit === '-' ? '' : hit;
  var raw = '';
  if (TG_DRY) raw = TG_MEM['igu:' + chat] || '';
  else {
    try {
      var sh = tgUserSheet_(false);
      if (sh && sh.getLastRow() > 1) {
        var col = igUsersCol_(sh), last = sh.getLastRow();
        var ids = sh.getRange(2, 1, last - 1, 1).getValues(), vals = sh.getRange(2, col, last - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === String(chat)) { raw = String(vals[i][0] || ''); break; }
      }
    } catch (e) { tgErr_('igRecall_', e); }
  }
  var p = raw.split('|'), code = p[0] || '', day = p[1] || '';
  var fresh = code && day && (Date.now() - new Date(day + 'T00:00:00+03:30').getTime()) <= IG_DAYS * 86400000;
  if (!TG_DRY) tgSetVal_('igc', chat, fresh ? code : '-');
  return fresh ? code : '';
}

/* ---------- لید: منبع و فیلدهای پیش‌پر ---------- */
/* از tgAppendLead_ صدا زده می‌شود. فقط خانه‌های خالی را پر می‌کند؛ جواب خود مراجع همیشه برنده است. */
function igLeadPrefill_(o) {
  try {
    var mm = String(o.note || '').match(/chat_id: (\d+)/);
    if (!mm) return o;
    var code = igRecall_(mm[1]), x = igParse_(code);
    if (!x) return o;
    var r = igRow_(x.page, x.kw);
    var src = String(o.source || '');
    if (!src || src === 'Telegram bot' || src === 'Telegram mini app') o.source = igSrc_(x.page, x.kw);
    if (!o.kind && r.kind) o.kind = r.kind;
    if (!o.topic && r.topic) o.topic = r.topic;
    if (/خارج/.test(r.dest) && !o.region) o.region = 'خارج از ایران';
    if (r.mode || r.place) {
      o.extra = o.extra || {};
      if (!o.extra['حالت جلسه']) o.extra['حالت جلسه'] = [r.mode, r.place].filter(String).join(' · ');
      /* v168 فاز ۶: سه فیلد ساختاریافته */
      if (r.mode && !o.extra['حالت']) o.extra['حالت'] = r.mode;
      if (r.place && !o.extra['شناسهٔ مکان'] && (!o.extra['حالت'] || o.extra['حالت'] === 'حضوری')) o.extra['شناسهٔ مکان'] = r.place;
    }
    o.note = String(o.note || '') + ' · ' + igSrc_(x.page, x.kw) + (src === 'Telegram mini app' ? ' · از مینی‌اپ' : '');
  } catch (e) { tgErr_('igLeadPrefill_', e); }
  return o;
}

/* ---------- ورود ---------- */
function tgIgStart_(chat, arg, name, uname) {
  var x = igParse_(arg);
  if (!x) return false;
  try { tgLogStart_(x.code, chat); } catch (e) {}
  igRemember_(chat, x.code);
  var r = igRow_(x.page, x.kw), d = r.dest, src = igSrc_(x.page, x.kw);
  tgSetVal_('esrc', chat, src);
  var mk = d.indexOf(':') > -1 ? d.slice(0, d.indexOf(':')).trim() : d.trim();
  var arg2 = d.indexOf(':') > -1 ? d.slice(d.indexOf(':') + 1).trim() : '';

  if (mk === 'تراپی خارج') { tgOutside_(chat); return true; }
  if (mk === 'تراپی') {
    tgSend_(chat, T_IG_THER + ((r.mode && r.mode.indexOf('حضوری') === 0) ? '\n' + T_IG_INP : ''));
    tgQuizTopic_(chat);
    return true;
  }
  if (mk === 'مدرسه' && !arg2) { tgCpList_(chat); return true; }
  if (mk === 'مدرسه') return igSchool_(chat, arg2, r, src, name, uname);
  if (mk === 'بات' && arg2 === 'mig' && typeof tgMigStart_ === 'function') { tgMigStart_(chat, src); return true; }   /* منبع اینستاگرام روی تست می‌ماند */
  if (mk === 'بات' && arg2 && !igParse_(arg2)) {
    tgPrivate_({ chat: { id: chat, type: 'private' }, from: { id: chat, first_name: name || '', username: String(uname || '').replace(/^@/, '') }, text: '/start ' + arg2 });
    return true;
  }
  if (mk === 'تست‌ها') {
    if (typeof tgMigTests_ === 'function') { tgMigTests_(chat); return true; }
    tgSend_(chat, T_IG_TESTS, { inline_keyboard: [[{ text: '🧭 تست سبک درمانی من', callback_data: 'ig:style' }]] });
    tgSend_(chat, 'منوی بات:', tgMenu_());
    return true;
  }
  var pu = mk === 'صفحه' ? igPageUrl_(arg2) : '';
  if (pu) {
    var u = pu + (pu.indexOf('?') > -1 ? '&' : '?') + 'utm_source=instagram&utm_medium=dm&utm_campaign=' + x.page + '_bot' +
            (r.utm ? '&utm_content=' + encodeURIComponent(r.utm) : '');
    tgSend_(chat, T_IG_PAGE.replace('{c}', tgEsc_(r.label || x.kw)), { inline_keyboard: [[{ text: '🌐 ' + (r.label || 'باز کردن'), url: u }]] });
    return true;
  }
  tgWelcome_(chat);
  return true;
}

/* مدرسه: یک لید مدرسه برای هر نفر × دوره و کارت برای مسئول مدرسه، فقط بار اول (بدون اسپم) */
function igSchool_(chat, course, r, src, name, uname) {
  var camp = null;
  try { camp = tgCpFind_(course); } catch (e) {}
  if (camp) tgSetVal_('cpsrc' + camp.code, chat, src);
  var made = null;
  try {
    var o = { chat: chat, name: (name && name !== 'بدون نام') ? name : '', user: uname || '', src: src,
              course: camp ? camp.course : course, stage: TG_SCH_STAGES[TG_SCH_SG.lead], note: 'ورود از اینستاگرام' };
    if (camp) { o.camp = camp.code; o.circle = camp.circle; o.owner = camp.follow; }
    made = tgSchLeadEnsure_(o);
    if (made && made.created) tgCpOwners_().forEach(function (c) { tgSlCardSend_(c, made.row); });
  } catch (e2) { tgErr_('igSchool_', e2); }
  if (camp) { tgCpShow_(chat, camp); return true; }
  tgSend_(chat, T_IG_SCH.replace('{c}', tgEsc_(r.label || course)), tgMenu_());
  return true;
}

/* ---------- آزمون (روی کد قبلی مردود: tgIgStart_ و ستون منبع اینستاگرام وجود نداشت) ---------- */
function tgIgTests() {
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX, slK = TG_DRY_SLEAD;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  function start(chat, code) {
    tgPrivate_({ chat: { id: chat, type: 'private' }, from: { id: chat, first_name: 'نمونه', last_name: 'آزمون' }, text: '/start ' + code });
  }
  function texts(chat) { return TG_OUTBOX.filter(function (o) { return o.kind === 'msg' && o.chat === String(chat); }).map(function (o) { return o.text + JSON.stringify(o.markup || ''); }).join('\n'); }
  function lead(chat, extra) {
    var o = { source: 'Telegram bot', name: 'نمونه', phone: '09120000000', region: '', kind: '', topic: '', note: 'chat_id: ' + chat, extra: extra || {} };
    return igLeadPrefill_(o);
  }
  try {
    ok('الگو: ig_tl_karaj', !!igParse_('ig_tl_karaj') && igParse_('ig_tl_karaj').kw === 'karaj');
    ok('الگو: حروف بزرگ، فارسی و بیش از ۶۴ نویسه رد می‌شود', !igParse_('ig_tl_Karaj') && !igParse_('ig_tl_کرج') && !igParse_('ig_tl_' + 'a'.repeat(60)) && !igParse_('ig_t_x'));
    ok('نقشه: سطرهای آغازین خوانده می‌شود', igRow_('tl', 'karaj').place === 'karaj2' && igRow_('ts', 'eft').dest === 'مدرسه:EFT');

    /* تراپی + پیش‌پر کرج */
    TG_OUTBOX = []; start(9101, 'ig_tl_karaj');
    ok('کرج: خوش‌آمد و سؤال موضوع می‌آید', /چند سؤال کوتاه/.test(texts(9101)) && /t:anx/.test(texts(9101)) && /حضوری/.test(texts(9101)));
    ok('کرج: منبع روی کاربر', tgGetVal_('src', 9101) === 'اینستاگرام · tl · karaj' && tgGetVal_('esrc', 9101) === 'اینستاگرام · tl · karaj');
    ok('کرج: ورود در دفتر کاربران می‌ماند', /^ig_tl_karaj\|\d{4}-\d{2}-\d{2}$/.test(TG_MEM['igu:9101'] || ''));
    var l1 = lead(9101);
    ok('لید: منبع و حالت جلسه با شناسهٔ مکان', l1.source === 'اینستاگرام · tl · karaj' && l1.extra['حالت جلسه'] === 'حضوری · karaj2');
    var l1b = lead(9101, { 'حالت جلسه': 'آنلاین' });
    ok('لید: جواب خود مراجع برنده است', l1b.extra['حالت جلسه'] === 'آنلاین');
    delete TG_MEM['igc9101'];
    ok('لید: بعد از پاک شدن کش هم از دفتر کاربران پیدا می‌شود', lead(9101).source === 'اینستاگرام · tl · karaj');
    TG_MEM['igu:9101'] = 'ig_tl_karaj|2020-01-01'; delete TG_MEM['igc9101'];
    ok('لید: ورود کهنه‌تر از ۳۰ روز منبع نمی‌شود', lead(9101).source === 'Telegram bot');

    /* خارج و گروه‌درمانی */
    TG_OUTBOX = []; start(9102, 'ig_tl_abroad');
    ok('خارج: مسیر خارج از ایران', texts(9102).indexOf(T_OUTSIDE.slice(0, 20)) > -1);
    ok('خارج: منطقهٔ لید پیش‌پر', lead(9102).region === 'خارج از ایران');
    start(9103, 'ig_tl_group');
    ok('گروه‌درمانی: نوع درخواست پیش‌پر', lead(9103).kind === 'گروه‌درمانی');
    var l3 = igLeadPrefill_({ source: 'Telegram bot', kind: 'زوج‌درمانی', note: 'chat_id: 9103' });
    ok('گروه‌درمانی: نوع انتخاب‌شده عوض نمی‌شود', l3.kind === 'زوج‌درمانی');

    /* مدرسه: EFT با کمپین و یک دورهٔ بی‌کمپین */
    TG_MEM['cp:' + TG_CP_TAB] = [{ 'کد کمپین': 'EFT-1', 'دوره': 'درمان هیجان‌مدار (EFT)', 'کد دوره': 'EFT', 'حلقه': '۱', 'وضعیت': 'ثبت‌نام باز', 'کلید بات': 'eft', 'مسئول پیگیری': 'مسئول نمونه' }];
    TG_MEM['cp:' + TG_SCH_T_REQ] = [];
    TG_MEM['cpowners'] = ['7700'];
    TG_DRY_SLEAD = { row: 2, id: 'د-100', name: 'نمونه آزمون', chat: '9104', course: 'درمان هیجان‌مدار (EFT)', camp: 'EFT-1', status: TG_SCH_ST_OPEN, stage: TG_SCH_STAGES[TG_SCH_SG.lead], code: 'S-100', src: 'اینستاگرام · ts · eft' };
    TG_OUTBOX = []; start(9104, 'ig_ts_eft');
    var sl = (TG_MEM['cp:' + TG_SCH_T_REQ] || [])[0] || {};
    ok('EFT: لید مدرسه با منبع اینستاگرام', sl['منبع'] === 'اینستاگرام · ts · eft' && sl['کد کمپین'] === 'EFT-1' && sl['chat_id'] === '9104');
    ok('EFT: کارت لید برای مسئول مدرسه', TG_OUTBOX.some(function (o) { return o.kind === 'msg' && o.chat === '7700'; }));
    ok('EFT: کارت دوره برای خود فرد', /EFT/.test(texts(9104)));
    TG_OUTBOX = []; start(9104, 'ig_ts_eft');
    ok('EFT: بار دوم لید و کارت تکراری نمی‌سازد', (TG_MEM['cp:' + TG_SCH_T_REQ] || []).length === 1 && !TG_OUTBOX.some(function (o) { return o.chat === '7700'; }));
    TG_OUTBOX = []; start(9105, 'ig_ts_roya');
    var sl2 = (TG_MEM['cp:' + TG_SCH_T_REQ] || [])[1] || {};
    ok('رویا (پرسلاین بود): لید مدرسه در بات', sl2['دوره'] === 'دورهٔ رویا' && sl2['منبع'] === 'اینستاگرام · ts · roya' && /دورهٔ رویا/.test(texts(9105)));

    /* بات:<کد>، کلمهٔ ناشناخته، کلمهٔ تازه با یک سطر */
    TG_OUTBOX = []; start(9106, 'ig_tl_jameh');
    ok('جامعه (پرسلاین بود): مسیر کامیونیتی بات', TG_OUTBOX.length > 0 && tgGetVal_('src', 9106) === 'اینستاگرام · tl · jameh');
    ok('کدهای فعلی دایرکتم همه سطر دارند', ['ig_tl_roya', 'ig_tl_jameh', 'ig_tl_test', 'ig_ts_roya', 'ig_tl_bat', 'ig_ts_bat'].every(function (c) { var x = igParse_(c); return !!igMap_()[x.page + '_' + x.kw]; }));
    TG_OUTBOX = []; start(9110, 'ig_tl_test');
    ok('تست (فرم گوگل بود): تست مهاجرت بات با منبع اینستاگرام، بی لینک بیرونی', typeof tgMigGet_ !== 'function' || ((tgMigGet_(9110) || {}).src === 'اینستاگرام · tl · test' && !/docs\.google|porsline|forms\.gle/i.test(texts(9110))));
    TG_OUTBOX = []; start(9111, 'ig_ts_migration');
    ok('مهاجرت: صفحهٔ رودمپ سایت با UTM', texts(9111).indexOf('https://tajrobeh.life/roadmap/psychology-migration/?utm_source=instagram') > -1 && /U-240/.test(texts(9111)));
    ok('نقشه و سوگ نشانی دارند', igRow_('tl', 'map').dest === 'صفحه:/how-to-become-a-therapist/' && igRow_('tl', 'grief').dest === 'صفحه:/mag/melancholia-in-war/');
    ok('نشانی بیرون از سایت پذیرفته نمی‌شود', igPageUrl_('https://porsline.ir/s/x') === '' && igPageUrl_('https://docs.google.com/forms/x') === '' && igPageUrl_('/x/') === 'https://tajrobeh.life/x/');
    TG_OUTBOX = []; start(9107, 'ig_tl_unknownword');
    ok('کلمهٔ ناشناخته: خوش‌آمد عادی و منبع ثبت', texts(9107).indexOf(T_WELCOME.slice(0, 15)) > -1 && tgGetVal_('src', 9107) === 'اینستاگرام · tl · unknownword');
    pbAdd_('e', IG_T_MAP, IG_MAP_HEAD, { 'پیج': 'tl', 'کلمه': 'newword', 'برچسب فارسی': 'مطلب تازه', 'مقصد': 'صفحه:/mag/x/', 'کد UTM': 'U-231' });
    TG_OUTBOX = []; start(9108, 'ig_tl_newword');
    ok('کلمهٔ تازه با یک سطر شیت: صفحه با UTM', /utm_source=instagram/.test(texts(9108)) && /U-231/.test(texts(9108)));
    ok('برچسب دفتر ورود', tgStartLabel_('ig_tl_karaj') === 'اینستاگرام › tl › حضوری کرج');
    ok('کد start دیگر دست نخورده: gt-', (function () { TG_OUTBOX = []; start(9109, 'gt-anx'); return !tgGetVal_('src', 9109); })());
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; TG_DRY_SLEAD = slK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ ورود اینستاگرام درست است'));
  return tgTestTally_(log, fail);
}
