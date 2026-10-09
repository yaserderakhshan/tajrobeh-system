/**
 * evlite.gs · v170.23.34 · ۱۸ مهر ۱۴۰۵ · رویداد سبک J-07 نسخهٔ ۰٫۱ (برد فرآیندها، کار ۷)
 *
 * ۱) ساخت: نقش مدرسه یا سردبیر (همان tgEvCan_) با «📸 رویداد برگزارشده» یا /evlite سه چیز می‌گوید: دوره (از تب «دوره‌ها»
 *    یا برنامهٔ عمومی)، تاریخ (پیش‌فرض امروز)، عنوان کوتاه. کد EV-xxxx (همان شمارهٔ رویدادهای بات، بی تکرار) و لینک
 *    https://t.me/<بات>?start=evc-<کد> می‌سازد. سطر در تب «رویدادهای سبک» هاب مدرسه و یک پوشهٔ درایو برای همان EV.
 * ۲) مشارکت: هر کس لینک را دارد، بی نقش: تا ۵ عکس، ویس تا ۹۰ ثانیه، متن تا ۵۰۰ نویسه، نام دلخواه برای اعتبار.
 *    تیک «همهٔ آدم‌های داخل عکس یا ویس رضایت داده‌اند» اجباری است؛ بی آن هیچ عکس یا ویسی پذیرفته نمی‌شود.
 *    هر مشارکت یک سطر در «مشارکت‌های رویداد سبک» و فایلش در پوشهٔ همان EV.
 * ۳) بستن: خودکار ۴۸ ساعت بعد از ساخت (نوبت ساعتی) یا زودتر با دکمهٔ «بستن» سازنده.
 * ۴) پیش‌نویس: ویس‌ها با جمنای (لایهٔ رایگان؛ مشارکت حاضران رویداد، نه دادهٔ مراجع) متن می‌شوند و بعد جمنای
 *    {ttl, sh, s, quote, photos, alt, ig_caption, warnings} می‌سازد. بعد چک‌های کد (نه هوش مصنوعی): خط تیرهٔ وسط جمله،
 *    رقم لاتین، نام بیرون از P، طول، و نقل‌قول عین متن. هر مشکل به warnings می‌رود.
 * ۵) تأیید: کارت پیش‌نمایش با «انتشار» و «اصلاح» برای تأییدکننده (کلید EVL_APPROVER در تنظیمات خصوصی؛ نام یا نقش؛
 *    پیش‌فرض نقش «مدرسه»). اصلاح = یک پیام آزاد که جمنای روی همان پیش‌نویس اعمال می‌کند. ۲۴ ساعت بی جواب ← یادآوری،
 *    ۲۴ ساعت بعد ← یاسر. بعد از انتشار، یاسر خبر می‌گیرد و دکمهٔ «برگرداندن» دارد (تصمیم نهایی CR-003 با یاسر).
 * ۶) انتشار: op «evlite» اسنیپت 504064 (امضای HMAC): ۳ عکس فشرده (عرض حداکثر ۱۶۰۰، تامنیل کوچک)، رویداد با
 *    k:"milestone" و c همان دوره در evData برگهٔ 505409 طبق بخش ۵ اسکیل tajrobeh-events (آرشیو ایستا هم)، عکس‌ها و
 *    نقل‌قول در کشوی جزئیات. لینک #ev= به همهٔ مشارکت‌کننده‌ها، کپشن و فایل استوری به سازنده، و در انتها دعوت کامیونیتی (J-03).
 * کارهای سنگین (جمنای، عکس، سایت) در evlRun با ماشه‌ٔ یک‌باره اجرا می‌شوند تا وبهوک معطل نماند. تست: evlTests.
 */

var EVL_BTN = '📸 رویداد برگزارشده';
var EVL_TAB = 'رویدادهای سبک';
var EVL_HEAD = ['کد', 'وضعیت', 'دوره', 'نام دوره', 'تاریخ رویداد', 'عنوان کوتاه', 'سازنده', 'chat سازنده', 'زمان ساخت', 'زمان بستن',
  'پوشهٔ درایو', 'پیش‌نویس', 'تأییدکننده', 'زمان ارسال برای تأیید', 'یادآوری', 'ارجاع به یاسر', 'شناسه در سایت', 'زمان انتشار', 'خطا'];
var EVL_C_TAB = 'مشارکت‌های رویداد سبک';
var EVL_C_HEAD = ['شناسه', 'کد رویداد', 'زمان', 'chat', 'نام برای اعتبار', 'نوع', 'file_id', 'file_id کوچک', 'درایو', 'متن', 'مدت'];
var EVL_ST = { COL: 'در حال جمع‌آوری', CLOSED: 'بسته؛ در صف پیش‌نویس', REVIEW: 'منتظر تأیید', QPUB: 'در صف انتشار', PUB: 'منتشر شد',
  BACK: 'برگشت خورد', EMPTY: 'بی مشارکت', ERR: 'خطا' };
var EVL_OPEN_MS = 48 * 3600000;
var EVL_REMIND_MS = 24 * 3600000;
var EVL_MAX_PH = 5, EVL_MAX_VOICE = 90, EVL_MAX_TEXT = 500, EVL_GEM_PH = 12;
var EVL_LEN = { ttl: 90, sh: 40, s: 320, quote: 280, ig_caption: 2000, alt: 125 };
var EVL_SITE = 'https://tajrobeh.life/school/events/';
var EVL_PUB = ['PUB', 'برنامهٔ عمومی'];

cfg_('EVL_APPROVER', '');   /* تأییدکنندهٔ رویداد سبک: نام یا نقش، با ویرگول؛ خالی یعنی نقش «مدرسه» */

function evlDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function evlNow_() { return evlDry_() && TG_MEM['evl:now'] ? Number(TG_MEM['evl:now']) : Date.now(); }
function evlOwner_(chat) { return String(chat) === String(TG_OWNER_CHAT); }
function evlFa_(n) { return tgFa_(n); }
function evlLink_(code) { return 'https://t.me/' + tgBotName_() + '?start=evc-' + code; }
function evlSiteId_(code) { return String(code).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

/* ───── جدول‌ها (هاب مدرسه؛ خشک: TG_MEM) ───── */
function evlRows_(tab, head) {
  if (evlDry_()) return (TG_MEM['evl:' + tab] = TG_MEM['evl:' + tab] || []);
  var sh = tgSchSheet_(tab, head); if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getDisplayValues().map(function (r, i) {
    var o = { row: i + 2 }; head.forEach(function (h, j) { o[h] = String(r[j] || '').trim(); }); return o;
  });
}
function evlPut_(tab, head, o) {
  if (evlDry_()) { var L = evlRows_(tab, head); if (!o.row) { o.row = L.length + 2; L.push(o); } else L[o.row - 2] = o; return o; }
  var sh = tgSchSheet_(tab, head);
  var arr = head.map(function (h) { return tgCell_(o[h] === undefined ? '' : String(o[h])); });
  if (o.row) sh.getRange(o.row, 1, 1, head.length).setValues([arr]);
  else { sh.appendRow(arr); o.row = sh.getLastRow(); }
  return o;
}
function evlEv_(code) { return evlRows_(EVL_TAB, EVL_HEAD).filter(function (r) { return r['کد'] === String(code); })[0] || null; }
function evlContribs_(code) { return evlRows_(EVL_C_TAB, EVL_C_HEAD).filter(function (r) { return r['کد رویداد'] === String(code); }); }

/* کد EV بی تکرار با رویدادهای بات (tgEvNextCode_ هم این تب را می‌بیند) */
function evlMaxCode_() {
  var max = 0;
  evlRows_(EVL_TAB, EVL_HEAD).forEach(function (r) { var m = /^EV-(\d+)$/.exec(r['کد']); if (m) max = Math.max(max, Number(m[1])); });
  return max;
}
function evlNextCode_() {
  var max = 2000;
  try { tgEvAll_().forEach(function (o) { var m = /^EV-(\d+)$/.exec(String(o.code || '')); if (m) max = Math.max(max, Number(m[1])); }); } catch (e) {}
  return 'EV-' + (Math.max(max, evlMaxCode_()) + 1);
}

/* دوره‌ها: کد سایت (C در evData) از ستون «کلید»، وگرنه کد دوره */
function evlCourses_() {
  var out = [];
  if (evlDry_() && TG_MEM['evl:courses']) return TG_MEM['evl:courses'];
  try { tgSchCourses_().forEach(function (c) { var k = String(c.key || c.code || '').trim(); if (k && !/بسته|آرشیو/.test(c.status || '')) out.push({ c: k, name: c.name || k }); }); } catch (e) {}
  out.push({ c: EVL_PUB[0], name: EVL_PUB[1] });
  return out;
}

/* ───── ۱) ساخت ───── */
function evlStGet_(k, chat) { try { return JSON.parse(tgGetVal_(k, chat) || 'null'); } catch (e) { return null; } }
function evlStPut_(k, chat, o) { tgSetVal_(k, chat, JSON.stringify(o)); }
function evlStart_(chat) {
  if (!tgEvCan_(chat)) { tgSend_(chat, 'ساخت رویداد سبک با مسئول مدرسه یا سردبیر است.'); return true; }
  var C = evlCourses_(), kb = [], r = [];
  C.forEach(function (c, i) { r.push({ text: c.name, callback_data: 'evl:c:' + i }); if (r.length === 2) { kb.push(r); r = []; } });
  if (r.length) kb.push(r);
  kb.push([{ text: 'انصراف', callback_data: 'evl:x' }]);
  evlStPut_('evln', chat, { s: 'c' });
  tgSend_(chat, '📸 <b>رویداد برگزارشده</b> · ۱ از ۳\nمال کدام دوره است؟', { inline_keyboard: kb });
  return true;
}
function evlAskDate_(chat) {
  tgSend_(chat, '۲ از ۳ · تاریخ رویداد؟ «امروز» را بزنید یا بنویسید، مثلاً ۱۴۰۵/۰۷/۱۶', { inline_keyboard: [[{ text: 'امروز', callback_data: 'evl:d:t' }], [{ text: 'انصراف', callback_data: 'evl:x' }]] });
}
function evlCreateText_(chat, name, text) {
  var st = evlStGet_('evln', chat); if (!st) return false;
  var s = String(text || '').trim();
  if (!s || s.indexOf('/') === 0 || s === EVL_BTN) { tgDel_('evln', chat); return false; }
  if (st.s === 'd') {
    var iso = tgOffParseDate_(s), today = Utilities.formatDate(new Date(evlNow_()), TG_TZ, 'yyyy-MM-dd');
    if (!iso) { tgSend_(chat, 'تاریخ را این‌طور بنویسید: ۱۴۰۵/۰۷/۱۶'); return true; }
    if (iso > today) { tgSend_(chat, 'رویداد سبک برای برنامه‌ای است که برگزار شده. تاریخ امروز یا گذشته را بنویسید.'); return true; }
    st.d = iso; st.s = 't'; evlStPut_('evln', chat, st);
    tgSend_(chat, '۳ از ۳ · یک عنوان کوتاه (تا ۶۰ نویسه)، مثلاً «جلسهٔ اول EFT»');
    return true;
  }
  if (st.s === 't') {
    if (s.length < 3) { tgSend_(chat, 'عنوان کمی کامل‌تر؟'); return true; }
    if (s.length > 60) { tgSend_(chat, 'عنوان کوتاه‌تر بنویسید؛ تا ۶۰ نویسه.'); return true; }
    tgDel_('evln', chat);
    evlCreate_(chat, name, st.c, st.cn, st.d, s);
    return true;
  }
  return false;
}
function evlCreate_(chat, name, c, cname, iso, title) {
  var who = name || ''; try { var p = tgPersonByChat_(chat); if (p && p.name) who = p.name; } catch (e) {}
  var o = { 'کد': evlNextCode_(), 'وضعیت': EVL_ST.COL, 'دوره': c, 'نام دوره': cname || c, 'تاریخ رویداد': iso, 'عنوان کوتاه': title,
    'سازنده': who || 'تیم', 'chat سازنده': String(chat), 'زمان ساخت': String(evlNow_()) };
  if (!evlDry_()) { try { o['پوشهٔ درایو'] = evlFolder_(o).getUrl(); } catch (eF) { tgErr_('evlCreate_ پوشه', eF); } }
  evlPut_(EVL_TAB, EVL_HEAD, o);
  try { tgPev_({ id: o['کد'], actor: who || 'بات', channel: 'بات', what: 'رویداد سبک', to: title }); } catch (eP) {}
  tgSend_(chat, '✅ <b>رویداد سبک ساخته شد</b> · <code>' + o['کد'] + '</code>\n' + tgEsc_(title) + ' · ' + tgEsc_(cname || c) + ' · ' + tgJDateFull_(new Date(iso + 'T12:00:00Z'), 'UTC') +
    '\n\nاین لینک را برای حاضران بفرستید تا عکس، ویس یا چند خط بفرستند (۴۸ ساعت باز است):\n' + evlLink_(o['کد']) +
    '\n\nبعد از بسته شدن، پیش‌نویس برای تأیید می‌رود.', { inline_keyboard: [[{ text: '🔒 بستن جمع‌آوری', callback_data: 'evl:close:' + o['کد'] }]] });
  return o;
}
function evlFolder_(o) {
  var root = tgPqFolder_(TG_EV_FOLDER), nm = o['کد'] + ' · ' + o['عنوان کوتاه'];
  var it = root.getFoldersByName(nm);
  return it.hasNext() ? it.next() : root.createFolder(nm);
}

/* ───── ۲) مشارکت ───── */
function evlJoin_(chat, arg) {
  var m = String(arg || '').match(/^evc-(EV-\d+)$/i); if (!m) return false;
  var o = evlEv_(m[1].toUpperCase()); if (!o) return false;   /* رویداد عادی: همان مسیر قبلی tgEvContribJoin_ */
  if (o['وضعیت'] !== EVL_ST.COL) { tgSend_(chat, 'جمع‌آوری این رویداد بسته شده است. ممنون از همراهی‌تان.'); return true; }
  evlStPut_('evk', chat, { code: o['کد'], ok: 0, ph: 0, vo: 0, tx: 0, nm: '' });
  tgSend_(chat, '📸 <b>' + tgEsc_(o['عنوان کوتاه']) + '</b>\nممنون که بودید. برای صفحهٔ این رویداد می‌توانید این‌ها را همین‌جا بفرستید:\n' +
    '• تا ' + evlFa_(EVL_MAX_PH) + ' عکس\n• یک ویس تا ' + evlFa_(EVL_MAX_VOICE) + ' ثانیه\n• چند خط متن، تا ' + evlFa_(EVL_MAX_TEXT) + ' نویسه\n\n' +
    'پیش از عکس یا ویس، تأیید کنید که همهٔ آدم‌های داخل آن رضایت داده‌اند.', evlKb_(false));
  return true;
}
function evlKb_(ok) {
  var kb = [];
  if (!ok) kb.push([{ text: '✅ همهٔ آدم‌های داخل عکس یا ویس رضایت داده‌اند', callback_data: 'evl:ok' }]);
  kb.push([{ text: '✍️ نام من در اعتبار بیاید', callback_data: 'evl:nm' }]);
  kb.push([{ text: 'تمام شد', callback_data: 'evl:end' }]);
  return { inline_keyboard: kb };
}
function evlBigPhoto_(arr) { return arr[arr.length - 1]; }
function evlSmallPhoto_(arr) {
  var pick = arr[0];
  for (var i = 0; i < arr.length; i++) if (Math.max(arr[i].width || 0, arr[i].height || 0) <= 800) pick = arr[i];
  return pick;
}
function evlSave_(o, chat, st, kind, fid, fidSmall, text, dur) {
  var url = '';
  if (fid && !evlDry_()) {
    try {
      var f = tgTgFile_(fid), ext = (String(f.path).split('.').pop() || (kind === 'عکس' ? 'jpg' : 'ogg')).replace('oga', 'ogg');
      url = evlFolder_(o).createFile(f.blob.setName(o['کد'] + ' · ' + kind + ' · ' + Utilities.formatDate(new Date(), TG_TZ, 'MMdd-HHmmss') + '.' + ext)).getUrl();
    } catch (e) { tgErr_('evlSave_ درایو', e); }
  }
  var c = { 'شناسه': 'C' + (evlRows_(EVL_C_TAB, EVL_C_HEAD).length + 1), 'کد رویداد': o['کد'], 'زمان': String(evlNow_()), 'chat': String(chat),
    'نام برای اعتبار': st.nm || '', 'نوع': kind, 'file_id': fid || '', 'file_id کوچک': fidSmall || '', 'درایو': url, 'متن': text || '', 'مدت': dur ? String(dur) : '' };
  return evlPut_(EVL_C_TAB, EVL_C_HEAD, c);
}
/* true یعنی پیام مصرف شد */
function evlInput_(chat, m) {
  var st = evlStGet_('evk', chat); if (!st) return false;
  var text = String(m.text || m.caption || '').trim();
  if (m.text && (text.indexOf('/') === 0 || tgIsBtnLike_(text))) { tgDel_('evk', chat); return false; }
  var o = evlEv_(st.code);
  if (!o || o['وضعیت'] !== EVL_ST.COL) { tgDel_('evk', chat); tgSend_(chat, 'جمع‌آوری این رویداد بسته شده است. ممنون از همراهی‌تان.'); return true; }
  if (st.w === 'nm' && m.text) {
    st.nm = text.slice(0, 40); delete st.w; evlStPut_('evk', chat, st);
    evlRows_(EVL_C_TAB, EVL_C_HEAD).forEach(function (c) { if (c['کد رویداد'] === st.code && c.chat === String(chat)) { c['نام برای اعتبار'] = st.nm; evlPut_(EVL_C_TAB, EVL_C_HEAD, c); } });
    tgSend_(chat, '✅ اگر چیزی از شما روی صفحه بیاید، با نام «' + tgEsc_(st.nm) + '» می‌آید.', evlKb_(st.ok));
    return true;
  }
  var media = (m.photo && m.photo.length) || m.voice || m.audio || m.video || m.video_note || m.document;
  if (media && !st.ok) { tgSend_(chat, 'پیش از فرستادن عکس یا ویس، دکمهٔ رضایت را بزنید. این را نگه نداشتیم.', evlKb_(false)); return true; }
  if (m.photo && m.photo.length) {
    if (st.ph >= EVL_MAX_PH) { tgSend_(chat, 'تا ' + evlFa_(EVL_MAX_PH) + ' عکس جا دارد و همه رسیده.', evlKb_(st.ok)); return true; }
    evlSave_(o, chat, st, 'عکس', evlBigPhoto_(m.photo).file_id, evlSmallPhoto_(m.photo).file_id, text.slice(0, EVL_MAX_TEXT), 0);
    st.ph++; evlStPut_('evk', chat, st);
    tgSend_(chat, '✅ عکس ' + evlFa_(st.ph) + ' از ' + evlFa_(EVL_MAX_PH) + ' رسید.', evlKb_(st.ok));
    return true;
  }
  if (m.voice || m.audio) {
    var v = m.voice || m.audio, dur = Number(v.duration || 0);
    if (dur > EVL_MAX_VOICE) { tgSend_(chat, 'ویس تا ' + evlFa_(EVL_MAX_VOICE) + ' ثانیه جا دارد. کوتاه‌ترش را بفرستید.', evlKb_(st.ok)); return true; }
    if (st.vo >= 1) { tgSend_(chat, 'یک ویس از شما رسیده است. همان کافی است.', evlKb_(st.ok)); return true; }
    evlSave_(o, chat, st, 'ویس', v.file_id, '', '', dur);
    st.vo++; evlStPut_('evk', chat, st);
    tgSend_(chat, '✅ ویس رسید.', evlKb_(st.ok));
    return true;
  }
  if (media) { tgSend_(chat, 'فقط عکس، ویس و متن کوتاه پذیرفته می‌شود.', evlKb_(st.ok)); return true; }
  if (!text) return false;
  if (st.tx + text.length > EVL_MAX_TEXT) { tgSend_(chat, 'متن تا ' + evlFa_(EVL_MAX_TEXT) + ' نویسه جا دارد. کوتاه‌ترش کنید.', evlKb_(st.ok)); return true; }
  if (text.length < 5) { tgSend_(chat, 'کمی بیشتر بنویسید؛ یکی دو جمله کافی است.', evlKb_(st.ok)); return true; }
  evlSave_(o, chat, st, 'متن', '', '', text, 0);
  st.tx += text.length; evlStPut_('evk', chat, st);
  tgSend_(chat, '✅ متن رسید.', evlKb_(st.ok));
  return true;
}

/* ───── ۳) بستن ───── */
function evlClose_(code, why) {
  var o = evlEv_(code); if (!o || o['وضعیت'] !== EVL_ST.COL) return false;
  o['وضعیت'] = EVL_ST.CLOSED; o['زمان بستن'] = String(evlNow_()) + (why ? ' · ' + why : '');
  evlPut_(EVL_TAB, EVL_HEAD, o);
  evlKick_();
  return true;
}
/* اجرای کار سنگین بیرون از وبهوک: یک ماشهٔ یک‌باره (نوبت ساعتی هم پشتیبان است) */
function evlKick_() {
  if (evlDry_()) { TG_MEM['evl:kick'] = (TG_MEM['evl:kick'] || 0) + 1; return; }
  try {
    var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'evlRun'; });
    if (!has) ScriptApp.newTrigger('evlRun').timeBased().after(1000).create();
  } catch (e) { tgErr_('evlKick_', e); }
}
function evlRun() {
  if (!evlDry_()) { try { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'evlRun') ScriptApp.deleteTrigger(t); }); } catch (e) {} }
  var lock = evlDry_() ? null : LockService.getScriptLock();
  if (lock && !lock.tryLock(5000)) return 0;
  var n = 0;
  try {
    evlRows_(EVL_TAB, EVL_HEAD).forEach(function (o) {
      try {
        if (o['وضعیت'] === EVL_ST.CLOSED) { evlDraft_(o); n++; }
        else if (o['وضعیت'] === EVL_ST.QPUB) { evlPublish_(o); n++; }
      } catch (e) { o['خطا'] = String(e && e.message || e).slice(0, 300); evlPut_(EVL_TAB, EVL_HEAD, o); tgErr_('evlRun ' + o['کد'], e); }
    });
  } finally { if (lock) lock.releaseLock(); }
  return n;
}

/* ───── ۴) پیش‌نویس با جمنای و چک‌های کد ───── */
var EVL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    ttl: { type: 'STRING' }, sh: { type: 'STRING' }, s: { type: 'STRING' },
    quote: { type: 'STRING' }, quote_from: { type: 'STRING' },
    photos: { type: 'ARRAY', items: { type: 'STRING' } }, alt: { type: 'ARRAY', items: { type: 'STRING' } },
    ig_caption: { type: 'STRING' }, warnings: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['ttl', 'sh', 's', 'quote', 'photos', 'alt', 'ig_caption', 'warnings']
};
function evlRules_(pNames) {
  return 'تو ویراستار مرکز تجربه زندگی هستی. فقط از همین مشارکت‌ها بنویس و هیچ چیز از خودت اضافه نکن: نه واقعیت، نه عدد، نه احساسی که کسی نگفته.\n' +
    'لحن تجربه: گرم و دقیق، ساده و بی‌اغراق. فارسی معیار با نیم‌فاصلهٔ درست. رقم‌ها فارسی (۱۲۳). خط تیرهٔ بلند یا میانی وسط جمله ننویس؛ ویرگول یا نقطه بگذار.\n' +
    'هیچ نامی نیاور، مگر نام‌های این فهرست یا نامی که خود مشارکت‌کننده برای اعتبار داده: ' + (pNames.length ? pNames.join('، ') : '(فهرست خالی است)') + '.\n' +
    'هیچ ادعای درمانی یا بالینی نکن (مثل «درمان می‌کند»، «اضطراب را از بین می‌برد»).\n' +
    'خروجی: ttl عنوان کامل (تا ۹۰ نویسه) · sh عنوان کوتاه (تا ۴۰) · s دقیقاً دو جمله دربارهٔ آنچه گذشت · quote یک جملهٔ عیناً نقل‌شده از متن یا ویس یک مشارکت‌کننده، بی هیچ تغییری (اگر نبود خالی) ' +
    'و quote_from شناسهٔ همان مشارکت · photos سه شناسهٔ بهترین عکس‌ها (روشن، گویا، بی تکرار؛ اگر کمتر بود همان‌ها) · alt برای هر عکس انتخابی یک متن جایگزین کوتاه بی نام ' +
    '· ig_caption کپشن اینستاگرام کوتاه در همان لحن · warnings هر جا مطمئن نبودی یا چیزی کم بود.';
}
function evlTranscribe_(c) {
  if (c['متن'] || c['نوع'] !== 'ویس' || !c['file_id']) return c['متن'] || '';
  try {
    var t = '';
    if (evlDry_()) t = TG_MEM['ai:tr'] || 'متن آزمایشی ویس';
    else {
      var f = tgTgFile_(c['file_id']), ext = (String(f.path).split('.').pop() || 'ogg').replace('oga', 'ogg');
      t = String(aiTranscribe_(f.blob.setName('v.' + ext), { priv: false, hint: 'حرف یکی از حاضران یک رویداد آموزشی دربارهٔ همان رویداد' }).text || '').trim();
    }
    if (t) { c['متن'] = t.slice(0, 3000); evlPut_(EVL_C_TAB, EVL_C_HEAD, c); }
    return t;
  } catch (e) { tgErr_('evlTranscribe_', e); return ''; }
}
function evlPhotoB64_(fid) {
  if (evlDry_()) return 'AAAA';
  return Utilities.base64Encode(tgTgFile_(fid).blob.getBytes());
}
function evlSources_(o) {
  var C = evlContribs_(o['کد']), src = [], photos = [];
  C.forEach(function (c) {
    if (c['نوع'] === 'عکس') photos.push(c);
    var t = evlTranscribe_(c);
    if (t) src.push({ id: c['شناسه'], kind: c['نوع'], name: c['نام برای اعتبار'] || '', text: t });
  });
  return { all: C, src: src, photos: photos };
}
function evlGem_(parts) {
  if (evlDry_()) return JSON.parse(JSON.stringify(TG_MEM['evl:gem'] || {}));
  return aiGen_(parts, EVL_SCHEMA, 0.3);
}
function evlDraft_(o) {
  var S = evlSources_(o);
  if (!S.src.length && !S.photos.length) {
    o['وضعیت'] = EVL_ST.EMPTY; evlPut_(EVL_TAB, EVL_HEAD, o);
    tgSend_(o['chat سازنده'], 'جمع‌آوری <code>' + o['کد'] + '</code> بسته شد ولی مشارکتی نرسید؛ پیش‌نویسی ساخته نشد.');
    return null;
  }
  var P = evlPNames_();
  var parts = [{ text: evlRules_(P.names) + '\n\nرویداد: ' + o['عنوان کوتاه'] + ' · ' + o['نام دوره'] + ' · ' + o['تاریخ رویداد'] +
    '\n\nمشارکت‌ها (JSON):\n' + JSON.stringify(S.src) }];
  S.photos.slice(0, EVL_GEM_PH).forEach(function (p) {
    parts.push({ text: 'عکس با شناسهٔ ' + p['شناسه'] + (p['متن'] ? ' · توضیح فرستنده: ' + p['متن'] : '') });
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: evlPhotoB64_(p['file_id کوچک'] || p['file_id']) } });
  });
  var d = evlGem_(parts);
  return evlShow_(o, evlCheck_(evlClean_(d), S, P));
}
function evlClean_(d) {
  d = d || {};
  var out = { ttl: String(d.ttl || '').trim(), sh: String(d.sh || '').trim(), s: String(d.s || '').trim(), quote: String(d.quote || '').trim(),
    quote_from: String(d.quote_from || '').trim(), photos: (d.photos || []).map(String).slice(0, 3), alt: (d.alt || []).map(function (x) { return String(x || '').trim(); }).slice(0, 3),
    ig_caption: String(d.ig_caption || '').trim(), warnings: (d.warnings || []).map(String).filter(String) };
  return out;
}
/* P (افراد ثبت‌شده در evData سایت): نام‌هایی که روی صفحهٔ رویدادها مجازند */
function evlPMap_() {
  if (evlDry_()) return TG_MEM['evl:P'] || {};
  var c = CacheService.getScriptCache(), hit = c.get('evlP');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var P = {};
  try {
    var r = UrlFetchApp.fetch('https://tajrobeh.life/wp-json/wp/v2/pages/505409?_fields=content', { muteHttpExceptions: true });
    var html = r.getResponseCode() === 200 ? JSON.parse(r.getContentText()).content.rendered : '';
    var m = /<script type="application\/json" id="evData">([\s\S]*?)<\/script>/.exec(html);
    if (m) { var D = JSON.parse(m[1]); Object.keys(D.P || {}).forEach(function (k) { P[k] = String((D.P[k] || [])[0] || ''); }); }
    c.put('evlP', JSON.stringify(P), 21600);
  } catch (e) { tgErr_('evlPMap_', e); }
  return P;
}
function evlBare_(n) { return String(n || '').replace(/^\s*(دکتر|استاد|خانم|آقای)\s+/, '').trim(); }
function evlPNames_() {
  var P = evlPMap_(), names = [], keys = {};
  Object.keys(P).forEach(function (k) { var n = evlBare_(P[k]); if (n) { names.push(n); keys[n] = k; } });
  return { names: names, keys: keys };
}
function evlNorm_(s) { return tgNorm_(String(s || '')).replace(/[\s‌.،,!؟?«»"':؛]+/g, ''); }
/* چک‌های کد بعد از جمنای (نه هوش مصنوعی) */
function evlCheck_(d, S, P) {
  var w = d.warnings.slice(), ok = P.names.slice();
  S.src.forEach(function (x) { if (x.name) ok.push(evlBare_(x.name)); });
  var fields = { ttl: 'عنوان', sh: 'عنوان کوتاه', s: 'خلاصه', quote: 'نقل‌قول', ig_caption: 'کپشن' };
  var texts = Object.keys(fields).map(function (k) { return [fields[k], d[k]]; }).concat(d.alt.map(function (a, i) { return ['متن جایگزین ' + evlFa_(i + 1), a]; }));
  texts.forEach(function (t) {
    if (/\s[—–]\s|[^\s]—|—[^\s]|\s–\s/.test(t[1])) w.push(t[0] + ': خط تیره وسط جمله');
    if (/[0-9]/.test(t[1])) w.push(t[0] + ': رقم لاتین');
  });
  Object.keys(EVL_LEN).forEach(function (k) {
    if (k === 'alt') { d.alt.forEach(function (a, i) { if (a.length > EVL_LEN.alt) w.push('متن جایگزین ' + evlFa_(i + 1) + ': بلندتر از ' + evlFa_(EVL_LEN.alt) + ' نویسه'); }); return; }
    if (String(d[k] || '').length > EVL_LEN[k]) w.push(fields[k] + ': بلندتر از ' + evlFa_(EVL_LEN[k]) + ' نویسه');
  });
  if (!d.ttl) w.push('عنوان خالی است');
  var sent = String(d.s || '').split(/[.!؟?]+/).filter(function (x) { return x.trim(); }).length;
  if (sent !== 2) w.push('خلاصه باید دو جمله باشد (' + evlFa_(sent) + ' جمله است)');
  /* نام بیرون از P: نام همکاران ثبت‌شده و هر لقب پیش از نام */
  var all = texts.map(function (t) { return t[1]; }).join(' \n ');
  var allowed = function (n) { var b = evlNorm_(n); return ok.some(function (a) { var x = evlNorm_(a); return x && (x === b || x.indexOf(b) === 0 || b.indexOf(x) === 0); }); };
  try { (evlDry_() ? (TG_MEM['people'] || []) : tgPeopleList_()).forEach(function (p) { var n = evlBare_(p.name); if (n && n.length > 3 && all.indexOf(n) > -1 && !allowed(n)) w.push('نام بیرون از فهرست P: ' + n); }); } catch (e) {}
  var re = /(دکتر|خانم|آقای|استاد)\s+([^\s،.:؛!؟«»]+(?:\s+[^\s،.:؛!؟«»]+)?)/g, mm;
  while ((mm = re.exec(all))) { if (!allowed(mm[2]) && !allowed(mm[2].split(/\s+/)[0])) w.push('نام بیرون از فهرست P: ' + mm[1] + ' ' + mm[2]); }
  /* نقل‌قول عین متن */
  if (d.quote) {
    var hit = S.src.filter(function (x) { return evlNorm_(x.text).indexOf(evlNorm_(d.quote)) > -1; })[0];
    if (!hit) w.push('نقل‌قول عیناً در مشارکت‌ها پیدا نشد');
    else d.quote_from = hit.id;
  }
  var ids = S.photos.map(function (p) { return p['شناسه']; });
  d.photos = d.photos.filter(function (id) { return ids.indexOf(id) > -1; });
  if (!d.photos.length && ids.length) d.photos = ids.slice(0, 3);
  if (d.photos.length < Math.min(3, ids.length)) w.push('کمتر از سه عکس انتخاب شد');
  if (d.alt.length < d.photos.length) w.push('متن جایگزین برای همهٔ عکس‌ها نیست');
  var seen = {}; d.warnings = w.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; });
  return d;
}

/* ───── ۵) تأیید ───── */
function evlApprovers_() {
  var spec = String(cfg_('EVL_APPROVER', '') || '').trim(), out = [], seen = {};
  function add(p) { var c = String(p.chat || '').split(/[,،;\s]+/)[0]; if (c && !seen[c] && p.status !== 'غیرفعال') { seen[c] = 1; out.push({ name: p.name, chat: c }); } }
  if (!spec) { tgSchoolOwners_().forEach(add); }
  else {
    var people = evlDry_() ? (TG_MEM['people'] || []) : tgPeopleList_();
    spec.split(/[,،\n]+/).map(function (x) { return x.trim(); }).filter(String).forEach(function (w) {
      people.forEach(function (p) { if (tgNorm_(p.name) === tgNorm_(w) || (p.roles || []).indexOf(w) > -1) add(p); });
    });
  }
  if (!out.length && TG_OWNER_CHAT) out.push({ name: 'مالک', chat: String(TG_OWNER_CHAT) });
  return out;
}
function evlCan_(chat) { return evlOwner_(chat) || evlApprovers_().some(function (a) { return a.chat === String(chat); }); }
function evlCard_(o, d) {
  var C = evlContribs_(o['کد']), q = d.quote ? '«' + tgEsc_(d.quote) + '»' + (evlCredit_(C, d.quote_from) ? ' · ' + tgEsc_(evlCredit_(C, d.quote_from)) : '') : '(نقل‌قولی نیست)';
  return '📸 <b>پیش‌نمایش رویداد سبک</b> · <code>' + o['کد'] + '</code>\n' + tgEsc_(o['نام دوره']) + ' · ' + tgJDateFull_(new Date(o['تاریخ رویداد'] + 'T12:00:00Z'), 'UTC') +
    ' · ' + evlFa_(C.length) + ' مشارکت\n\n<b>' + tgEsc_(d.ttl) + '</b>\nعنوان کوتاه: ' + tgEsc_(d.sh) + '\n\n' + tgEsc_(d.s) + '\n\n' + q +
    '\n\n<b>متن جایگزین عکس‌ها:</b>\n' + d.alt.map(function (a, i) { return evlFa_(i + 1) + '. ' + tgEsc_(a); }).join('\n') +
    '\n\n<b>کپشن:</b>\n' + tgEsc_(d.ig_caption) +
    (d.warnings.length ? '\n\n⚠️ <b>هشدارها</b>\n' + d.warnings.map(function (x) { return '• ' + tgEsc_(x); }).join('\n') : '\n\n✅ چک‌ها بی هشدار');
}
function evlCredit_(C, id) { var c = C.filter(function (x) { return x['شناسه'] === id; })[0]; return c ? c['نام برای اعتبار'] : ''; }
function evlPreviewTo_(o, d, chat) {
  var C = evlContribs_(o['کد']);
  var ph = d.photos.map(function (id) { return C.filter(function (c) { return c['شناسه'] === id; })[0]; }).filter(Boolean);
  if (ph.length) {
    if (evlDry_()) TG_OUTBOX.push({ kind: 'album', chat: String(chat), n: ph.length });
    else try { tgApi_('sendMediaGroup', { chat_id: chat, media: JSON.stringify(ph.map(function (c) { return { type: 'photo', media: c['file_id'] }; })) }); } catch (e) { tgErr_('evl album', e); }
  }
  tgSend_(chat, evlCard_(o, d), { inline_keyboard: [[{ text: '✅ انتشار', callback_data: 'evl:pub:' + o['کد'] }, { text: '✏️ اصلاح', callback_data: 'evl:fix:' + o['کد'] }]] });
}
function evlShow_(o, d) {
  o['پیش‌نویس'] = JSON.stringify(d); o['وضعیت'] = EVL_ST.REVIEW; o['زمان ارسال برای تأیید'] = String(evlNow_()); o['یادآوری'] = ''; o['ارجاع به یاسر'] = ''; o['خطا'] = '';
  evlPut_(EVL_TAB, EVL_HEAD, o);
  evlApprovers_().forEach(function (a) { evlPreviewTo_(o, d, a.chat); });
  return d;
}
function evlDraftOf_(o) { try { return JSON.parse(o['پیش‌نویس'] || 'null'); } catch (e) { return null; } }
function evlFixText_(chat, text) {
  var code = tgGetVal_('evlf', chat); if (!code) return false;
  var t = String(text || '').trim();
  if (!t || t.indexOf('/') === 0) { tgDel_('evlf', chat); if (t === '/cancel') { tgSend_(chat, 'لغو شد.'); return true; } return false; }
  tgDel_('evlf', chat);
  var o = evlEv_(code), d0 = o && evlDraftOf_(o);
  if (!o || !d0 || o['وضعیت'] !== EVL_ST.REVIEW) { tgSend_(chat, 'این پیش‌نویس دیگر منتظر تأیید نیست.'); return true; }
  tgSend_(chat, 'در حال اعمال اصلاح…');
  var S = evlSources_(o), P = evlPNames_();
  var parts = [{ text: evlRules_(P.names) + '\n\nپیش‌نویس فعلی (JSON):\n' + JSON.stringify(d0) + '\n\nمشارکت‌ها (JSON):\n' + JSON.stringify(S.src) +
    '\n\nاین اصلاح تأییدکننده را روی همان پیش‌نویس اعمال کن و بقیه را دست نزن:\n' + t.slice(0, 800) +
    '\nشناسه‌های عکس مجاز: ' + S.photos.map(function (p) { return p['شناسه']; }).join('، ') }];
  try { evlShow_(o, evlCheck_(evlClean_(evlGem_(parts)), S, P)); }
  catch (e) { tgSend_(chat, 'اصلاح انجام نشد: ' + tgEsc_(String(e && e.message || e).slice(0, 200))); }
  return true;
}
function evlWho_(chat) { try { var p = tgPersonByChat_(chat); return p && p.name ? p.name : String(chat); } catch (e) { return String(chat); } }

/* ───── ۶) انتشار ───── */
function evlJDay_(iso) { return tgJDate_(new Date(iso + 'T12:00:00Z'), 'UTC'); }
function evlJYear_(iso) { return tgFa_(tgJalali_(new Date(iso + 'T12:00:00Z'), 'UTC').y); }
function evlSiteEvent_(o, d) {
  var P = evlPNames_(), C = evlContribs_(o['کد']), text = [d.ttl, d.s, d.quote].join(' '), p = [];
  P.names.forEach(function (n) { if (text.indexOf(n) > -1 && p.indexOf(P.keys[n]) < 0) p.push(P.keys[n]); });
  var pub = o['دوره'] === EVL_PUB[0];
  var ev = { i: evlSiteId_(o['کد']) + '-' + o['تاریخ رویداد'].slice(0, 4), d: o['تاریخ رویداد'], t: '', ttl: d.ttl, k: 'milestone', c: o['دوره'],
    a: pub ? 'free' : 'members', ap: '', p: p, pl: '', s: d.s, ig: [], g: pub ? 'pub' : 'class', sh: d.sh || o['عنوان کوتاه'] };
  if (d.quote) ev.fb = [{ name: evlCredit_(C, d.quote_from) || '', text: d.quote }];
  return ev;
}
function evlPublish_(o) {
  var d = evlDraftOf_(o); if (!d) throw new Error('پیش‌نویس نیست');
  var C = evlContribs_(o['کد']), ev = evlSiteEvent_(o, d);
  var photos = d.photos.map(function (id, i) {
    var c = C.filter(function (x) { return x['شناسه'] === id; })[0];
    return c ? { b64: evlPhotoB64_(c['file_id']), alt: d.alt[i] || d.sh || o['عنوان کوتاه'] } : null;
  }).filter(Boolean);
  var res = tgDir_('evlite', { ev: ev, photos: photos, arch: { year: evlJYear_(o['تاریخ رویداد']), md: evlJDay_(o['تاریخ رویداد']) } });
  if (!res || !res.ok) throw new Error('سایت: ' + JSON.stringify(res || {}).slice(0, 200));
  o['وضعیت'] = EVL_ST.PUB; o['شناسه در سایت'] = res.i || ev.i; o['زمان انتشار'] = String(evlNow_()); o['خطا'] = '';
  evlPut_(EVL_TAB, EVL_HEAD, o);
  var url = EVL_SITE + '#ev=' + (res.i || ev.i);
  var bot = tgBotName_(), seen = {};
  C.forEach(function (c) {
    if (!c.chat || seen[c.chat]) return; seen[c.chat] = 1;
    tgSend_(c.chat, '🌱 صفحهٔ «' + tgEsc_(d.sh || o['عنوان کوتاه']) + '» با مشارکت شما منتشر شد:\n' + url +
      '\n\nاگر دوست دارید در برنامه‌های بعدی هم کنار ما باشید، عضویت رایگان کامیونیتی تجربه از همین بات است:\nhttps://t.me/' + bot + '?start=comm');
  });
  tgSend_(o['chat سازنده'], '✅ <code>' + o['کد'] + '</code> روی صفحهٔ رویدادها منتشر شد:\n' + url + '\n\n<b>کپشن اینستاگرام:</b>\n' + tgEsc_(d.ig_caption) +
    (res.story ? '\n\nفایل استوری برای صفحهٔ مدرسه:\nhttps://tajrobeh.life' + res.story : ''));
  if (TG_OWNER_CHAT && String(TG_OWNER_CHAT) !== String(o['chat سازنده']))
    tgSend_(TG_OWNER_CHAT, '📸 رویداد سبک <code>' + o['کد'] + '</code> با تأیید ' + tgEsc_(o['تأییدکننده'] || '') + ' منتشر شد:\n' + url,
      { inline_keyboard: [[{ text: '↩️ برگرداندن', callback_data: 'evl:undo:' + o['کد'] }]] });
  return res;
}
function evlUndo_(chat, code) {
  if (!evlOwner_(chat)) return tgSend_(chat, 'برگرداندن با یاسر است.');
  var o = evlEv_(code); if (!o || o['وضعیت'] !== EVL_ST.PUB) return tgSend_(chat, 'این رویداد منتشرشده نیست.');
  var res = tgDir_('evlite', { undo: 1, i: o['شناسه در سایت'] });
  if (!res || !res.ok) return tgSend_(chat, 'برگرداندن نشد: ' + tgEsc_(JSON.stringify(res || {}).slice(0, 160)));
  o['وضعیت'] = EVL_ST.BACK; evlPut_(EVL_TAB, EVL_HEAD, o);
  tgSend_(o['chat سازنده'], '↩️ رویداد سبک <code>' + o['کد'] + '</code> از صفحهٔ رویدادها برداشته شد.');
  return tgSend_(chat, '↩️ برداشته شد.');
}

/* ───── قلاب‌ها ───── */
function evlRoute_(m, chat, name, uname) {
  var t = String(m.text || '').trim();
  if (t && /^\/start(@\w+)?\s+evc-/i.test(t)) return evlJoin_(chat, t.replace(/^\/start(@\w+)?\s+/, '').trim());
  if (t === EVL_BTN || t === '/evlite') return evlStart_(chat);
  if (t && tgGetVal_('evlf', chat) && evlFixText_(chat, t)) return true;
  if (t && tgGetVal_('evln', chat) && evlCreateText_(chat, name, t)) return true;
  if (tgGetVal_('evk', chat) && evlInput_(chat, m)) return true;
  return false;
}
function evlCb_(chat, data, name, uname) {
  var p = String(data).split(':'), act = p[1], arg = p.slice(2).join(':');
  if (act === 'x') { tgDel_('evln', chat); return tgSend_(chat, 'باشد.'); }
  if (act === 'c') {
    var st = evlStGet_('evln', chat), c = evlCourses_()[Number(arg)];
    if (!st || !c) return tgSend_(chat, 'دوباره از «' + EVL_BTN + '» شروع کنید.');
    st.c = c.c; st.cn = c.name; st.s = 'd'; evlStPut_('evln', chat, st); return evlAskDate_(chat);
  }
  if (act === 'd') {
    var st2 = evlStGet_('evln', chat); if (!st2) return null;
    st2.d = Utilities.formatDate(new Date(evlNow_()), TG_TZ, 'yyyy-MM-dd'); st2.s = 't'; evlStPut_('evln', chat, st2);
    return tgSend_(chat, '۳ از ۳ · یک عنوان کوتاه (تا ۶۰ نویسه)، مثلاً «جلسهٔ اول EFT»');
  }
  if (act === 'ok' || act === 'nm' || act === 'end') {
    var k = evlStGet_('evk', chat); if (!k) return tgSend_(chat, 'لینک رویداد را دوباره باز کنید.');
    if (act === 'ok') { k.ok = 1; evlStPut_('evk', chat, k); return tgSend_(chat, '✅ ممنون. حالا عکس، ویس یا متن را بفرستید.', evlKb_(true)); }
    if (act === 'nm') { k.w = 'nm'; evlStPut_('evk', chat, k); return tgSend_(chat, 'نامی که می‌خواهید کنار مشارکتتان بیاید را بنویسید.'); }
    tgDel_('evk', chat);
    return tgSend_(chat, '🙏 ممنون. بعد از نگاه تیم، صفحهٔ رویداد منتشر می‌شود و لینکش را برایتان می‌فرستیم.');
  }
  var o = evlEv_(arg); if (!o) return tgSend_(chat, 'این رویداد پیدا نشد.');
  if (act === 'close') {
    if (String(o['chat سازنده']) !== String(chat) && !evlOwner_(chat)) return tgSend_(chat, 'بستن با سازندهٔ رویداد است.');
    return tgSend_(chat, evlClose_(arg, 'دستی') ? '🔒 جمع‌آوری بسته شد. پیش‌نویس تا چند دقیقهٔ دیگر برای تأیید می‌رود.' : 'این رویداد دیگر در حال جمع‌آوری نیست.');
  }
  if (act === 'undo') return evlUndo_(chat, arg);
  if (act === 'pub' || act === 'fix') {
    if (!evlCan_(chat)) return tgSend_(chat, 'تأیید رویداد سبک با تأییدکنندهٔ مدرسه است.');
    if (o['وضعیت'] !== EVL_ST.REVIEW) return tgSend_(chat, 'این پیش‌نویس «' + tgEsc_(o['وضعیت']) + '» است.');
    if (act === 'fix') { tgSetVal_('evlf', chat, arg); return tgSend_(chat, 'اصلاح را در یک پیام بنویسید (مثلاً «عنوان کوتاه‌تر، عکس دوم نه»).'); }
    o['وضعیت'] = EVL_ST.QPUB; o['تأییدکننده'] = evlWho_(chat); evlPut_(EVL_TAB, EVL_HEAD, o);
    evlKick_();
    return tgSend_(chat, '✅ در صف انتشار است؛ تا چند دقیقهٔ دیگر لینکش می‌آید.');
  }
  return null;
}

/* نوبت ساعتی: بستن خودکار ۴۸ ساعته، کار مانده، یادآوری تأییدکننده و ارجاع به یاسر */
function evlTick_() {
  var now = evlNow_(), n = 0, pend = false;
  evlRows_(EVL_TAB, EVL_HEAD).forEach(function (o) {
    var st = o['وضعیت'];
    if (st === EVL_ST.COL && now - Number(o['زمان ساخت'] || now) >= EVL_OPEN_MS) { evlClose_(o['کد'], 'خودکار'); n++; pend = true; return; }
    if (st === EVL_ST.CLOSED || st === EVL_ST.QPUB) pend = true;
    if (st !== EVL_ST.REVIEW) return;
    var sent = Number(o['زمان ارسال برای تأیید'] || now);
    if (!o['یادآوری'] && now - sent >= EVL_REMIND_MS) {
      evlApprovers_().forEach(function (a) { tgSend_(a.chat, '⏰ پیش‌نمایش رویداد سبک <code>' + o['کد'] + '</code> («' + tgEsc_(o['عنوان کوتاه']) + '») ۲۴ ساعت است منتظر «انتشار» یا «اصلاح» است.'); });
      o['یادآوری'] = String(now); evlPut_(EVL_TAB, EVL_HEAD, o); n++;
    } else if (o['یادآوری'] && !o['ارجاع به یاسر'] && now - Number(o['یادآوری']) >= EVL_REMIND_MS) {
      var d = evlDraftOf_(o);
      if (TG_OWNER_CHAT && d) evlPreviewTo_(o, d, TG_OWNER_CHAT);
      if (TG_OWNER_CHAT) tgSend_(TG_OWNER_CHAT, '⏰ پیش‌نمایش بالا ۴۸ ساعت بی جواب ماند و به شما رسید.');
      o['ارجاع به یاسر'] = String(now); evlPut_(EVL_TAB, EVL_HEAD, o); n++;
    }
  });
  if (pend) evlRun();
  return n;
}

/* آزمون واقعی (یک بار بعد از انتشار سبز، CI_ONCE_AUTO): EV جلسهٔ اول EFT و جشن شکوفه‌ها (۱۶ مهر ۱۴۰۵)
   و لینک مشارکت برای تأییدکننده‌های مدرسه (نقش «مدرسه» یا EVL_APPROVER) و مسئول ارشد مدرسه */
function tgV1702334EvliteSeed() {
  var title = 'جلسهٔ اول EFT و جشن شکوفه‌ها';
  var have = evlRows_(EVL_TAB, EVL_HEAD).filter(function (r) { return r['عنوان کوتاه'] === title; })[0];
  if (have) return { out: 'از قبل هست: ' + have['کد'] };
  var to = evlApprovers_(), chief = null;
  try { chief = tgSchChief_(); } catch (e) {}
  if (chief && chief.chat && !to.some(function (a) { return a.chat === String(chief.chat).split(/[,،;\s]+/)[0]; })) to.unshift({ name: chief.name, chat: String(chief.chat).split(/[,،;\s]+/)[0] });
  var by = to[0] ? to[0].chat : String(TG_OWNER_CHAT);
  var cn = 'درمان هیجان‌مدار';
  evlCourses_().forEach(function (c) { if (c.c === 'EFT') cn = c.name; });
  var o = evlCreate_(by, to[0] ? to[0].name : 'تیم', 'EFT', cn, '2026-10-08', title);
  to.slice(1).forEach(function (a) {
    tgSend_(a.chat, '📸 رویداد سبک <code>' + o['کد'] + '</code> · ' + tgEsc_(title) + '\nلینک مشارکت حاضران (۴۸ ساعت باز است):\n' + evlLink_(o['کد']) +
      '\n\nپیش‌نویس بعد از بسته شدن برای تأیید می‌آید.');
  });
  return { out: o['کد'] + ' · لینک برای ' + to.length + ' نفر' };
}

/* ───── آزمون ───── */
function evlTests() {
  var pass = 0, fail = 0, text = [];
  function ok(label, cond) { if (cond) { pass++; text.push('✅ ' + label); } else { fail++; text.push('❌ ' + label); } }
  var keepDry = TG_DRY, keepMem = TG_MEM, keepOut = TG_OUTBOX, keepOwner = TG_OWNER_CHAT, keepCan = tgEvCan_, keepCfg = TG_CFG_;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; TG_OWNER_CHAT = '900';
  try {
    TG_CFG_ = JSON.parse(JSON.stringify(keepCfg || {})); TG_CFG_.EVL_APPROVER = '';
    tgEvCan_ = function (c) { return String(c) === '700' || String(c) === '900'; };
    TG_MEM['people'] = [{ name: 'مدرسه نمونه', chat: '701', roles: ['مدرسه'], status: 'فعال' }, { name: 'همکار ساختگی‌زاده', chat: '702', roles: ['پذیرش'], status: 'فعال' }];
    TG_MEM['evall'] = [{ code: 'EV-2050' }];
    TG_MEM['evl:courses'] = [{ c: 'EFT', name: 'درمان هیجان‌مدار' }, { c: EVL_PUB[0], name: EVL_PUB[1] }];
    TG_MEM['evl:P'] = { tst: 'دکتر استاد نمونه‌نو' };
    TG_MEM['evl:now'] = new Date('2026-10-08T15:00:00+03:30').getTime();
    function said(c) { return TG_OUTBOX.filter(function (x) { return x.chat === String(c); }).map(function (x) { return x.text || ''; }).join('\n'); }
    function kbOf(c) { var L = TG_OUTBOX.filter(function (x) { return x.chat === String(c) && x.markup; }); return L.length ? JSON.stringify(L[L.length - 1].markup) : ''; }
    function msg(c, m) { m.chat = { id: c }; m.from = { first_name: 'آزمون' }; return evlRoute_(m, c, 'آزمون', ''); }

    ok('بی نقش نمی‌سازد', (msg('555', { text: EVL_BTN }), said('555').indexOf('مسئول مدرسه') > -1 && !tgGetVal_('evln', '555')));
    msg('700', { text: EVL_BTN });
    ok('فهرست دوره‌ها با برنامهٔ عمومی', kbOf('700').indexOf('درمان هیجان‌مدار') > -1 && kbOf('700').indexOf('برنامهٔ عمومی') > -1);
    evlCb_('700', 'evl:c:0'); evlCb_('700', 'evl:d:t');
    ok('عنوان بلند رد می‌شود', (msg('700', { text: new Array(70).join('ب') }), !evlRows_(EVL_TAB, EVL_HEAD).length));
    msg('700', { text: 'جلسهٔ اول EFT' });
    var o = evlRows_(EVL_TAB, EVL_HEAD)[0];
    ok('کد بعد از رویدادهای بات و تاریخ امروز', o && o['کد'] === 'EV-2051' && o['دوره'] === 'EFT' && o['تاریخ رویداد'] === '2026-10-08' && o['وضعیت'] === EVL_ST.COL);
    ok('لینک evc و دکمهٔ بستن', said('700').indexOf('?start=evc-EV-2051') > -1 && kbOf('700').indexOf('evl:close:EV-2051') > -1);
    ok('کد بعدی رویداد بات هم این تب را می‌بیند', evlNextCode_() === 'EV-2052');
    ok('تاریخ آینده رد می‌شود', (msg('700', { text: EVL_BTN }), evlCb_('700', 'evl:c:0'), msg('700', { text: '۱۴۰۵/۰۸/۳۰' }), said('700').indexOf('امروز یا گذشته') > -1));
    tgDel_('evln', '700');

    TG_OUTBOX = [];
    ok('لینک رویداد عادی به مسیر قبلی می‌رود', msg('800', { text: '/start evc-EV-2050' }) === false);
    msg('800', { text: '/start evc-EV-2051' });
    ok('ورود بی نقش با دکمهٔ رضایت', kbOf('800').indexOf('evl:ok') > -1);
    var ph = [{ file_id: 'small', width: 320, height: 240 }, { file_id: 'mid', width: 800, height: 600 }, { file_id: 'big', width: 1280, height: 960 }];
    msg('800', { photo: ph });
    ok('بی تیک رضایت عکس پذیرفته نمی‌شود', !evlContribs_('EV-2051').length && said('800').indexOf('دکمهٔ رضایت') > -1);
    msg('800', { text: 'جلسهٔ گرمی بود و از تمرین جفت‌ها خیلی یاد گرفتم.' });
    ok('متن بی تیک پذیرفته می‌شود', evlContribs_('EV-2051').length === 1);
    evlCb_('800', 'evl:ok');
    for (var i = 0; i < 6; i++) msg('800', { photo: ph });
    var P8 = evlContribs_('EV-2051').filter(function (c) { return c['نوع'] === 'عکس'; });
    ok('حداکثر پنج عکس با فایل بزرگ و کوچک', P8.length === 5 && P8[0]['file_id'] === 'big' && P8[0]['file_id کوچک'] === 'mid');
    msg('800', { voice: { file_id: 'v1', duration: 120 } });
    ok('ویس بلندتر از ۹۰ ثانیه رد', !evlContribs_('EV-2051').some(function (c) { return c['نوع'] === 'ویس'; }));
    msg('800', { voice: { file_id: 'v2', duration: 40 } });
    ok('ویس ۴۰ ثانیه پذیرفته', evlContribs_('EV-2051').some(function (c) { return c['نوع'] === 'ویس' && c['مدت'] === '40'; }));
    ok('متن بیش از ۵۰۰ نویسه رد', (msg('800', { text: new Array(520).join('ج') }), said('800').indexOf('کوتاه‌ترش') > -1));
    evlCb_('800', 'evl:nm'); msg('800', { text: 'سارا نمونه' });
    ok('نام اعتبار روی همهٔ مشارکت‌های همان نفر', evlContribs_('EV-2051').every(function (c) { return c['نام برای اعتبار'] === 'سارا نمونه'; }));
    evlCb_('800', 'evl:end');
    ok('بستن فقط با سازنده', (evlCb_('801', 'evl:close:EV-2051'), evlEv_('EV-2051')['وضعیت'] === EVL_ST.COL));

    /* بستن خودکار ۴۸ ساعته و پیش‌نویس */
    TG_MEM['ai:tr'] = 'به نظرم بهترین بخش تمرین جفت‌ها بود.';
    TG_MEM['evl:gem'] = { ttl: 'جلسهٔ اول دورهٔ EFT — آغاز', sh: 'جلسهٔ اول EFT', s: 'حلقهٔ اول دوره با 15 نفر شروع شد. دکتر ناشناس‌پور هم حضور داشت.',
      quote: 'بهترین بخش تمرین جفت‌ها بود', quote_from: 'C9', photos: ['C2', 'C3', 'C99'], alt: ['حاضران در کلاس', 'تمرین جفت‌ها'], ig_caption: 'جلسهٔ اول', warnings: [] };
    TG_MEM['evl:now'] += EVL_OPEN_MS + 1000; TG_OUTBOX = [];
    evlTick_();
    o = evlEv_('EV-2051');
    ok('۴۸ ساعت: بسته و پیش‌نویس منتظر تأیید', o['وضعیت'] === EVL_ST.REVIEW && /خودکار/.test(o['زمان بستن']));
    var d = evlDraftOf_(o), W = d.warnings.join(' | ');
    ok('ویس متن شد و در سطر نشست', evlContribs_('EV-2051').filter(function (c) { return c['نوع'] === 'ویس'; })[0]['متن'] === TG_MEM['ai:tr']);
    ok('چک کد: خط تیره', W.indexOf('خط تیره') > -1);
    ok('چک کد: رقم لاتین', W.indexOf('رقم لاتین') > -1);
    ok('چک کد: نام بیرون از P', W.indexOf('ناشناس‌پور') > -1);
    ok('چک کد: عکس ناموجود حذف و متن جایگزین کم', d.photos.join() === 'C2,C3' && W.indexOf('متن جایگزین برای همهٔ') < 0);
    ok('نقل‌قول عین ویس پیدا و منبعش ثبت شد', W.indexOf('نقل‌قول عیناً') < 0 && /^C\d+$/.test(d.quote_from));
    ok('پیش‌نمایش با آلبوم و انتشار و اصلاح به نقش مدرسه', TG_OUTBOX.some(function (x) { return x.kind === 'album' && x.chat === '701'; }) && kbOf('701').indexOf('evl:pub:EV-2051') > -1 && kbOf('701').indexOf('evl:fix:EV-2051') > -1);
    ok('غیرتأییدکننده منتشر نمی‌کند', (evlCb_('702', 'evl:pub:EV-2051'), evlEv_('EV-2051')['وضعیت'] === EVL_ST.REVIEW));

    /* اصلاح */
    TG_MEM['evl:gem'] = { ttl: 'جلسهٔ اول دورهٔ EFT', sh: 'جلسهٔ اول EFT', s: 'حلقهٔ اول دوره شروع شد. حاضران از تمرین جفت‌ها گفتند.',
      quote: 'بهترین بخش تمرین جفت‌ها بود', photos: ['C2', 'C3', 'C4'], alt: ['حاضران در کلاس', 'تمرین جفت‌ها', 'گفت‌وگوی پایانی'], ig_caption: 'جلسهٔ اول دورهٔ EFT', warnings: [] };
    evlCb_('701', 'evl:fix:EV-2051'); TG_OUTBOX = []; msg('701', { text: 'خط تیره و عدد را بردار' });
    d = evlDraftOf_(evlEv_('EV-2051'));
    ok('اصلاح: پیش‌نویس تازه بی هشدار', d.ttl === 'جلسهٔ اول دورهٔ EFT' && !d.warnings.length && said('701').indexOf('چک‌ها بی هشدار') > -1);

    /* یادآوری و ارجاع */
    TG_MEM['evl:now'] += EVL_REMIND_MS + 1000; TG_OUTBOX = []; evlTick_();
    ok('۲۴ ساعت: یادآوری به تأییدکننده', said('701').indexOf('۲۴ ساعت') > -1);
    TG_MEM['evl:now'] += EVL_REMIND_MS + 1000; TG_OUTBOX = []; evlTick_();
    ok('۲۴ ساعت بعد: پیش‌نمایش به یاسر', kbOf('900').indexOf('evl:pub:EV-2051') > -1 && evlEv_('EV-2051')['ارجاع به یاسر'] !== '');
    TG_OUTBOX = []; evlTick_(); ok('ارجاع دوباره نه', !said('900'));

    /* انتشار */
    TG_MEM['dirres'] = { evlite: { ok: true, i: 'ev-2051-2026', story: '/wp-content/uploads/2026/10/s.jpg' } };
    TG_OUTBOX = []; evlCb_('701', 'evl:pub:EV-2051'); ok('انتشار در صف و ماشه', evlEv_('EV-2051')['وضعیت'] === EVL_ST.QPUB && TG_MEM['evl:kick'] > 0); evlRun();
    var dir = TG_OUTBOX.filter(function (x) { return x.kind === 'dir'; })[0];
    ok('انتشار با op evlite: milestone، دوره، سه عکس، نقل‌قول با نام اعتبار', dir && dir.data.ev.k === 'milestone' && dir.data.ev.c === 'EFT' && dir.data.ev.g === 'class' && dir.data.photos.length === 3 &&
      dir.data.ev.fb[0].name === 'سارا نمونه' && dir.data.ev.i === 'ev-2051-2026' && dir.data.arch.year === '۱۴۰۵' && dir.data.arch.md === '۱۶ مهر');
    ok('P از متن: کسی در متن نبود', dir && dir.data.ev.p.length === 0);
    o = evlEv_('EV-2051');
    ok('وضعیت منتشر شد و تأییدکننده ثبت', o['وضعیت'] === EVL_ST.PUB && (o['تأییدکننده'] === '701' || o['تأییدکننده'] === 'مدرسه نمونه'));
    ok('لینک #ev= و دعوت کامیونیتی به مشارکت‌کننده', said('800').indexOf('#ev=ev-2051-2026') > -1 && said('800').indexOf('start=comm') > -1);
    ok('کپشن و استوری به سازنده', said('700').indexOf('جلسهٔ اول دورهٔ EFT') > -1 && said('700').indexOf('s.jpg') > -1);
    ok('یاسر با دکمهٔ برگرداندن', kbOf('900').indexOf('evl:undo:EV-2051') > -1);
    ok('برگرداندن فقط یاسر', (evlCb_('701', 'evl:undo:EV-2051'), evlEv_('EV-2051')['وضعیت'] === EVL_ST.PUB));
    TG_OUTBOX = []; evlCb_('900', 'evl:undo:EV-2051');
    ok('برگرداندن: op undo و وضعیت', TG_OUTBOX.some(function (x) { return x.kind === 'dir' && x.data.undo === 1 && x.data.i === 'ev-2051-2026'; }) && evlEv_('EV-2051')['وضعیت'] === EVL_ST.BACK);
    ok('لینک بسته پیام بسته می‌دهد', (msg('803', { text: '/start evc-EV-2051' }), said('803').indexOf('بسته شده') > -1));

    /* بی مشارکت */
    msg('700', { text: '/evlite' }); evlCb_('700', 'evl:c:1'); evlCb_('700', 'evl:d:t'); msg('700', { text: 'جشن شکوفه‌ها' });
    var o2 = evlRows_(EVL_TAB, EVL_HEAD).filter(function (r) { return r['عنوان کوتاه'] === 'جشن شکوفه‌ها'; })[0];
    ok('برنامهٔ عمومی: کد PUB', o2 && o2['دوره'] === 'PUB');
    evlCb_('700', 'evl:close:' + o2['کد']); evlRun();
    ok('بی مشارکت: وضعیت و خبر سازنده', evlEv_(o2['کد'])['وضعیت'] === EVL_ST.EMPTY && said('700').indexOf('مشارکتی نرسید') > -1);
    ok('متن‌ها بی خط تیره', [EVL_BTN, EVL_HEAD.join(' '), EVL_C_HEAD.join(' '), Object.keys(EVL_ST).map(function (k) { return EVL_ST[k]; }).join(' ')].join(' ').search(/[—–]/) < 0);
    ok('متن کاربر در شیت با tgCell_', tgCell_('=1+1') === "'=1+1");
  } catch (e) { fail++; text.push('❌ خطا: ' + (e && e.stack || e)); }
  finally { TG_DRY = keepDry; TG_MEM = keepMem; TG_OUTBOX = keepOut; TG_OWNER_CHAT = keepOwner; tgEvCan_ = keepCan; TG_CFG_ = keepCfg; }
  return { pass: pass, fail: fail, text: text.join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'evlTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['رویداد سبک J-07', 'evlTests']); } catch (eS) {}
