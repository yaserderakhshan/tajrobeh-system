/* ============================================================================
   تست تجربهٔ روانی مهاجرت (v166.28) · یک منبع
   ----------------------------------------------------------------------------
   جایگزین گوگل‌فرم مهاجرت. الگو همان تست سبک درمانی است: پیشوند tgMig، کال‌بک mg:،
   وضعیت در کش با انقضای ۱ ساعت، یک سؤال در هر پیام با ویرایش همان پیام، دکمهٔ «از اول».
   ورودی‌ها: /start mig · /start ld-test · /start ig_tl_test (منبع اینستاگرام) · /migration · /tests · مینی‌اپ با api:'mig'
   s > 0: باند نارنجی، یک خط ویژه در نتیجه، و اگر لید ساخته شد یادداشت «s>0». پیام اورژانس و هشدار جدا ندارد (v166.29).
   داده: تب «تست مهاجرت» هاب تجربه (پنهان و محافظت‌شده). لید فقط با دکمهٔ معارفه ساخته می‌شود.
   متن‌ها در ثابت‌های T_MIG_* هستند تا تیم محتوا ویرایش کند.
   ============================================================================ */

var TG_MIG_TAB = 'تست مهاجرت';
var TG_MIG_TTL = 3600;
var TG_MIG_BTN = '🧳 تست تجربهٔ روانی مهاجرت';
var TG_MIG_URL = 'https://tajrobeh.life/persian-therapy/?utm_source=telegram&utm_campaign=mig_test';

var T_MIG_INTRO = '🧳 <b>تست تجربهٔ روانی مهاجرت</b>\n\n۱۹ سؤال کوتاه، حدود ۴ دقیقه. پاسخ‌هایت فقط برای تیم بالینی تجربه قابل دیدن است. این تست تشخیص نیست.';
var T_MIG_START = 'شروع';
var T_MIG_AGAIN = '↺ از اول';
var T_MIG_PHQ_HEAD = 'در دو هفتهٔ گذشته چقدر…';
var T_MIG_MIG_HEAD = 'این جمله چقدر دربارهٔ تو درست است؟';
var T_MIG_DREAM = 'اگر تجربهٔ مهاجرتت تا امروز یک خواب بود، فضای آن را در دو خط چطور توصیف می‌کردی؟\n\n(اختیاری. بنویس و بفرست، یا «رد می‌شوم» را بزن.)';
var T_MIG_DREAM_SKIP = 'رد می‌شوم';
var T_MIG_DREAM_BAD = 'بین ۳ تا ۴۰۰ حرف بنویس، یا «رد می‌شوم» را بزن.';
var T_MIG_EXPIRED = 'این تست منقضی شده است. از اول شروع کنیم؟';
var T_MIG_TESTS = 'تست‌های تجربه در بات:';
var T_MIG_BOOK_BTN = '🗓 معارفهٔ رایگان ۱۵ دقیقه‌ای';
var T_MIG_URL_BTN = 'درمانگرهای فارسی‌زبان برای خارج از ایران';
var T_MIG_BAND = {
  green: ['🟢 در مسیر جاافتادن', 'با همهٔ سختی‌های مهاجرت، نشانه‌های فشار جدی در پاسخ‌هایت دیده نمی‌شود. اگر روزی سنگین‌تر شد، این تست را دوباره بزن.'],
  yellow: ['🟡 بار مهاجرت سنگین شده', 'پاسخ‌هایت نشان می‌دهد مهاجرت بخشی از انرژی‌ات را گرفته است. حرف زدن با یک درمانگر که این تجربه را می‌شناسد معمولاً زود اثر می‌کند.'],
  orange: ['🟠 وقت کمک گرفتن است', 'فشاری که در پاسخ‌هایت دیده می‌شود بیشتر از آن است که بشود تنها با آن کنار آمد. پیشنهاد ما یک گفت‌وگوی کوتاه با درمانگر است.']
};
var T_MIG_DIM = {
  grief: 'سوگ و دلتنگی: بخشی از انرژی‌ات صرف چیزی است که پشت سر گذاشته‌ای. سوگ مهاجرت واقعی است.',
  limbo: 'تعلیق و هویت: نه کاملاً اینجایی و نه آنجا؛ از شایع‌ترین تجربه‌های مهاجرت.',
  lonely: 'تنهایی: رابطه‌های اینجا هنوز جای رابطه‌های آنجا را نگرفته‌اند.',
  guilt: 'گناه بازمانده: امنیت نسبی‌ات با احساس گناه همراه شده؛ این نشانهٔ پیوند توست، نه بی‌وفایی.',
  helpless: 'درماندگی و تردید: سیستم تازه اعتمادت به توانایی‌هایت را لرزانده؛ این افت معمولاً موقت است.'
};
var T_MIG_DIM_NAME = { grief: 'سوگ', limbo: 'تعلیق', lonely: 'تنهایی', guilt: 'گناه بازمانده', helpless: 'درماندگی' };
var T_MIG_PHQ_LINE = 'نشانه‌های {x} در دو هفتهٔ اخیر بالاتر از حد معمول است.';
var T_MIG_S_LINE = 'اگر این روزها فکر نبودن یا آسیب زدن به خودت سراغت می‌آید، از همین هفته با یک متخصص حرف بزن.';
var T_MIG_SUP_LINE = 'و اینکه اینجا کسی را برای روزهای سخت نداری، خودش دلیل خوبی برای شروع است.';
var T_MIG_TAIL = 'این تست تشخیص نیست و جای ارزیابی حرفه‌ای را نمی‌گیرد.';

var TG_MIG_PHQ_OPTS = ['اصلاً', 'چند روز', 'بیش از نصف روزها', 'تقریباً هر روز'];
var TG_MIG_MIG_OPTS = ['اصلاً', 'کمی', 'تا حدی', 'زیاد', 'خیلی زیاد'];
var TG_MIG_Q = [
  { k: 'dur', t: 'چند وقت است از ایران رفته‌ای؟', o: ['کمتر از ۱ سال', '۱ تا ۳', '۳ تا ۷', 'بیشتر از ۷ سال'] },
  { k: 'reg', t: 'کجا زندگی می‌کنی؟', o: ['اروپا', 'آمریکا و کانادا', 'ترکیه و امارات', 'استرالیا', 'جای دیگر'] },
  { k: 'p1', h: 'phq', t: 'احساس عصبی بودن، اضطراب یا تنش' },
  { k: 'p2', h: 'phq', t: 'نتوانستن جلوی نگرانی را بگیری' },
  { k: 'p3', h: 'phq', t: 'علاقه یا لذت کم در انجام کارها' },
  { k: 'p4', h: 'phq', t: 'احساس غمگینی، افسردگی یا ناامیدی' },
  { k: 's', h: 'phq', t: 'فکر اینکه بهتر بود نبودی یا به خودت آسیب بزنی' },
  { k: 'g1', h: 'mig', t: 'خاطرات ایران با حسرت و اندوه سنگینی سراغم می‌آید.' },
  { k: 'g2', h: 'mig', t: 'حس می‌کنم بخشی از خودم در ایران جا مانده است.' },
  { k: 'i1', h: 'mig', t: 'اینجا غریبه‌ام و اگر برگردم هم جای سابقم را ندارم.' },
  { k: 'i2', h: 'mig', t: 'وقتی به زبان جدید حرف می‌زنم، حس می‌کنم خود واقعی‌ام نیستم.' },
  { k: 'l1', h: 'mig', t: 'ساختن رابطهٔ نزدیک و معنادار در کشور جدید برایم سخت است.' },
  { k: 'l2', h: 'mig', t: 'به جای آشنا شدن با محیط جدید، بیشتر در خانه یا جمع‌های ایرانی می‌مانم.' },
  { k: 's1', h: 'mig', t: 'وقتی خبر ایران یا مشکل عزیزانم را می‌شنوم، از اینکه جای امن‌تری هستم احساس گناه می‌کنم.' },
  { k: 's2', h: 'mig', t: 'حس می‌کنم حق ندارم اینجا از زندگی لذت ببرم وقتی دیگران رنج می‌کشند.' },
  { k: 'c1', h: 'mig', t: 'در برابر کارهای اداری، زبان یا قوانین اینجا احساس درماندگی می‌کنم.' },
  { k: 'c2', h: 'mig', t: 'به توانایی‌های حرفه‌ای‌ام شک کرده‌ام، شکی که در ایران نداشتم.' },
  { k: 'sup', t: 'اینجا کسی هست که در روز سخت بتوانی با او حرف بزنی؟', o: ['بله', 'نه چندان'] },
  { k: 'dream', free: true }
];
var TG_MIG_DIMS = [['grief', 'g1', 'g2'], ['limbo', 'i1', 'i2'], ['lonely', 'l1', 'l2'], ['guilt', 's1', 's2'], ['helpless', 'c1', 'c2']];
var TG_MIG_HEAD = ['زمان', 'chat', 'منبع', 'dur', 'reg', 'p1', 'p2', 'p3', 'p4', 's', 'g1', 'g2', 'i1', 'i2', 'l1', 'l2', 's1', 's2', 'c1', 'c2',
  'sup', 'A', 'D', 'P', 'ابعاد پررنگ', 'باند', 'رؤیا', 'لید؟'];

/* ---------- نمره‌دهی (تابع خالص) ---------- */
function tgMigScore_(a) {
  var n = function (k) { return Number(a[k]) || 0; };
  var A = n('p1') + n('p2'), D = n('p3') + n('p4'), P = A + D, s = n('s');
  var dims = TG_MIG_DIMS.map(function (d, i) { return { k: d[0], v: n(d[1]) + n(d[2]), i: i }; });
  var strong = dims.filter(function (d) { return d.v >= 5; }).sort(function (x, y) { return (y.v - x.v) || (x.i - y.i); }).map(function (d) { return d.k; });
  var band = (P >= 6 || (A >= 3 && D >= 3) || strong.length >= 3 || s > 0) ? 'orange' : ((P >= 3 || strong.length >= 1) ? 'yellow' : 'green');
  var o = { A: A, D: D, P: P, s: s, strong: strong, band: band, anx: A >= 3, dep: D >= 3 };
  dims.forEach(function (d) { o[d.k] = d.v; });
  return o;
}

/* ---------- وضعیت (کش ۱ ساعت) ---------- */
function tgMigGet_(chat) {
  var raw = tgGetVal_('mig', chat);   /* کش یک‌جای پیام (TG_MEMO_KEYS)، بی خواندن اضافه */
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function tgMigPut_(chat, st) {
  var s = JSON.stringify(st);
  if (TG_DRY) { TG_MEM['mig' + chat] = s; return; }
  CacheService.getScriptCache().put('mig' + chat, s, TG_MIG_TTL);
  if (TG_CMEMO) TG_CMEMO['mig' + chat] = s;
}
function tgMigDel_(chat) { tgDel_('mig', chat); }

/* پیام تازه یا ویرایش همان پیام */
function tgMigShow_(chat, msgId, text, kb) {
  if (msgId && !TG_DRY) {
    var r = tgApi_('editMessageText', { chat_id: chat, message_id: msgId, text: text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb });
    try { if (r && r.getResponseCode && r.getResponseCode() === 200) return; } catch (e) {}
  }
  if (TG_DRY && msgId) { TG_OUTBOX.push({ kind: 'msg', chat: String(chat), text: String(text), markup: kb || null, edit: msgId }); return; }
  tgSend_(chat, text, kb);
}

/* ---------- ورود ---------- */
function tgMigStart_(chat, src, msgId) {
  tgMigPut_(chat, { i: -1, a: {}, src: src || 'بات', t: Date.now() });
  tgMigShow_(chat, msgId || 0, T_MIG_INTRO, { inline_keyboard: [[{ text: T_MIG_START, callback_data: 'mg:go' }]] });
}
function tgMigTests_(chat) {
  tgSend_(chat, T_MIG_TESTS, { inline_keyboard: [[{ text: '🧭 تست سبک درمانی من', callback_data: 'mg:style' }], [{ text: TG_MIG_BTN, callback_data: 'mg:start' }]] });
}
/* از مسیر /start؛ true یعنی رسیدگی شد */
function tgMigStartArg_(chat, arg) {
  var a = String(arg || '');
  if (a !== 'mig' && a !== 'ld-test' && a !== 'ig_tl_test') return false;
  var src = a === 'ig_tl_test' ? 'اینستاگرام · tl · test' : (a === 'ld-test' ? 'ld-test' : 'بات');
  if (a === 'ig_tl_test') { try { tgSetVal_('src', chat, src); tgSetVal_('esrc', chat, src); } catch (e) {} }
  tgMigStart_(chat, src);
  return true;
}

/* ---------- سؤال ---------- */
function tgMigQText_(i) {
  var q = TG_MIG_Q[i], head = '🧳 سؤال ' + tgFa_(String(i + 1)) + ' از ۱۹\n\n';
  if (q.free) return head + T_MIG_DREAM;
  if (q.h === 'phq') return head + T_MIG_PHQ_HEAD + '\n<b>' + tgEsc_(q.t) + '</b>';
  if (q.h === 'mig') return head + T_MIG_MIG_HEAD + '\n<b>' + tgEsc_(q.t) + '</b>';
  return head + '<b>' + tgEsc_(q.t) + '</b>';
}
function tgMigQKb_(i) {
  var q = TG_MIG_Q[i], opts = q.o || (q.h === 'phq' ? TG_MIG_PHQ_OPTS : (q.h === 'mig' ? TG_MIG_MIG_OPTS : [])), kb = [];
  if (q.free) kb.push([{ text: T_MIG_DREAM_SKIP, callback_data: 'mg:skip' }]);
  else if (opts.length > 3) opts.forEach(function (o, j) { kb.push([{ text: o, callback_data: 'mg:a:' + i + ':' + j }]); });
  else kb.push(opts.map(function (o, j) { return { text: o, callback_data: 'mg:a:' + i + ':' + j }; }));
  kb.push([{ text: T_MIG_AGAIN, callback_data: 'mg:re' }]);
  return { inline_keyboard: kb };
}
function tgMigAsk_(chat, st, msgId) {
  tgMigPut_(chat, st);
  tgMigShow_(chat, msgId, tgMigQText_(st.i), tgMigQKb_(st.i));
}

/* ---------- کال‌بک mg: ---------- */
function tgMigCb_(cq, rest, chat, name, uname) {
  var msgId = cq && cq.message ? cq.message.message_id : 0;
  var p = String(rest || '').split(':'), act = p[0];
  if (act === 'style') return tgStyleStart_(chat);
  if (act === 'start') return tgMigStart_(chat, 'بات');
  if (act === 're') { var src0 = (tgMigGet_(chat) || {}).src || 'بات'; tgMigDel_(chat); return tgMigStart_(chat, src0, msgId); }
  var st = tgMigGet_(chat);
  if (!st) return tgSend_(chat, T_MIG_EXPIRED, { inline_keyboard: [[{ text: T_MIG_START, callback_data: 'mg:start' }]] });
  if (act === 'go') { st.i = 0; return tgMigAsk_(chat, st, msgId); }
  if (act === 'a') {
    var i = Number(p[1]), j = Number(p[2]), q = TG_MIG_Q[i];
    if (!q || i !== st.i) return null;                       /* لمس تکراری یا کهنه */
    var opts = q.o || (q.h === 'phq' ? TG_MIG_PHQ_OPTS : TG_MIG_MIG_OPTS);
    if (!(j >= 0 && j < opts.length)) return null;
    st.a[q.k] = q.o ? opts[j] : j;
    st.i = i + 1;
    return tgMigAsk_(chat, st, msgId);
  }
  if (act === 'skip') { if (TG_MIG_Q[st.i] && TG_MIG_Q[st.i].free) { st.a.dream = ''; return tgMigFinish_(chat, st, msgId); } return null; }
  if (act === 'book') return tgMigBook_(chat, name, uname, st);
  return null;
}
/* متن آزاد رؤیا؛ true یعنی رسیدگی شد */
function tgMigText_(chat, text) {
  var st = tgMigGet_(chat);
  if (!st || !TG_MIG_Q[st.i] || !TG_MIG_Q[st.i].free) return false;
  var t = String(text || '').trim();
  if (t.indexOf('/') === 0 || tgIsBtnLike_(t)) return false;
  if (t.length < 3 || t.length > 400) { tgSend_(chat, T_MIG_DREAM_BAD, { inline_keyboard: [[{ text: T_MIG_DREAM_SKIP, callback_data: 'mg:skip' }]] }); return true; }
  st.a.dream = t;
  tgMigFinish_(chat, st, 0);
  return true;
}

/* لید: یکی برای هر مراجع. اگر پرونده دارد یادداشت می‌شود، وگرنه ساخته می‌شود. */
function tgMigLead_(chat, name, uname, st, note) {
  var row = -1;
  try { row = tgFindLead_(chat); } catch (e) {}
  if (row >= 2) { try { tgLeadNote_(row, note, 'بات'); } catch (e2) {} return row; }
  var src = /^اینستاگرام/.test(st.src || '') ? st.src : 'Telegram bot';
  tgAppendLead_({
    source: src, name: name, channel: 'تلگرام', phone: uname || String(chat), region: 'خارج از ایران',
    firstText: note, status: 'جدید', kind: 'تراپی فردی', topic: 'سایر',
    note: 'chat_id: ' + chat + (uname ? ' · ' + uname : '') + ' · ' + note
  });
  return 0;
}

/* ---------- پایان و نتیجه ---------- */
function tgMigResultText_(sc, a) {
  var b = T_MIG_BAND[sc.band], t = '<b>' + b[0] + '</b>\n\n' + b[1];
  sc.strong.slice(0, 2).forEach(function (k) { t += '\n\n• ' + T_MIG_DIM[k]; });
  if (sc.s > 0) t += '\n\n• ' + T_MIG_S_LINE;
  if (sc.anx || sc.dep) t += '\n\n• ' + T_MIG_PHQ_LINE.replace('{x}', sc.anx && sc.dep ? 'اضطراب و افسردگی' : (sc.anx ? 'اضطراب' : 'افسردگی'));
  if (a.sup === 'نه چندان') t += '\n\n' + T_MIG_SUP_LINE;
  return t + '\n\n<i>' + T_MIG_TAIL + '</i>';
}
function tgMigResultKb_(band) {
  var book = [{ text: T_MIG_BOOK_BTN, callback_data: 'mg:book' }], url = [{ text: T_MIG_URL_BTN, url: TG_MIG_URL }];
  return { inline_keyboard: (band === 'green' ? [url, book] : [book, url]).concat([[{ text: T_MIG_AGAIN, callback_data: 'mg:re' }]]) };
}
function tgMigFinish_(chat, st, msgId) {
  var sc = tgMigScore_(st.a);
  st.i = TG_MIG_Q.length; st.sc = sc;
  st.tab = tgMigSave_(chat, st, sc);
  tgMigPut_(chat, st);
  tgMigShow_(chat, msgId, tgMigResultText_(sc, st.a), tgMigResultKb_(sc.band));
  return sc;
}
function tgMigSave_(chat, st, sc) {
  var a = st.a, g = function (k) { return a[k] === undefined ? '' : a[k]; };
  var row = [Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm'), String(chat), st.src || '', g('dur'), g('reg'), g('p1'), g('p2'), g('p3'), g('p4'), g('s'),
    g('g1'), g('g2'), g('i1'), g('i2'), g('l1'), g('l2'), g('s1'), g('s2'), g('c1'), g('c2'), g('sup'), sc.A, sc.D, sc.P,
    sc.strong.map(function (k) { return T_MIG_DIM_NAME[k]; }).join('، '), sc.band, g('dream'), st.booked ? 'بله' : ''];
  if (TG_DRY) { var T = TG_MEM['tab:' + TG_MIG_TAB] = TG_MEM['tab:' + TG_MIG_TAB] || []; T.push(row); return T.length + 1; }
  try {
    var sh = tgMigSheet_();
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row.map(function (x) { return (typeof x === 'string' && /^[=+@-]/.test(x)) ? "'" + x : x; })]);
    return sh.getLastRow();
  } catch (e) { tgErr_('tgMigSave_', e); return 0; }
}
function tgMigSheet_() {
  var ss = tgSS_(), sh = ss.getSheetByName(TG_MIG_TAB);
  if (sh) return sh;
  sh = ss.insertSheet(TG_MIG_TAB);
  try { sh.setRightToLeft(true); } catch (e) {}
  sh.getRange(1, 1, 1, TG_MIG_HEAD.length).setValues([TG_MIG_HEAD]).setFontWeight('bold').setBackground('#f3efec');
  sh.setFrozenRows(1);
  /* دادهٔ بالینی: پنهان و فقط مالک فایل (بات) می‌نویسد */
  try { sh.hideSheet(); } catch (e2) {}
  try { var p = sh.protect().setDescription('تست مهاجرت · فقط بات'); p.removeEditors(p.getEditors()); if (p.canDomainEdit()) p.setDomainEdit(false); } catch (e3) {}
  return sh;
}
/* دکمهٔ معارفه: لید با یادداشت، بعد مسیر معارفهٔ خارج از ایران */
function tgMigBook_(chat, name, uname, st) {
  var sc = st.sc || tgMigScore_(st.a);
  var note = 'تست مهاجرت · ' + sc.band + ' · ' + (sc.strong.map(function (k) { return T_MIG_DIM_NAME[k]; }).join('، ') || 'بی بُعد پررنگ') + ' · ' + (st.src || 'بات') + (sc.s > 0 ? ' · s>0' : '');
  if (!st.booked) {
    tgMigLead_(chat, name, uname, st, note);
    st.booked = 1; tgMigPut_(chat, st);
    if (st.tab && !TG_DRY) { try { tgMigSheet_().getRange(st.tab, TG_MIG_HEAD.length).setValue('بله'); } catch (e) {} }
    if (TG_DRY && st.tab) { var T = TG_MEM['tab:' + TG_MIG_TAB] || []; if (T[st.tab - 2]) T[st.tab - 2][TG_MIG_HEAD.length - 1] = 'بله'; }
  }
  return tgOutside_(chat);
}

/* ---------- مینی‌اپ: api:'mig' (v166.30) ----------
   op:'q'      ← سؤال‌ها و متن‌ها برای صفحهٔ /app/ (همان TG_MIG_Q و T_MIG_*)
   op:'submit' ← پاسخ‌ها {dur, reg, p1..p4, s, g1..c2, sup, dream}؛ همان tgMigScore_، سطر تب با منبع «app»، نتیجه
   op:'book'   ← لید با یادداشت «تست مهاجرت · باند · ابعاد · app» (و «s>0» اگر بود)؛ بعدش صفحه مسیر رزرو خودش را باز می‌کند
   لید فقط با op:'book' ساخته می‌شود. */
function tgMigApiUser_(p) {
  if (TG_DRY && p && p._user) return p._user;
  return tgVerifyInitData_(p.initData);
}
function tgMigApiCheck_(a) {
  var out = {}, bad = [];
  TG_MIG_Q.forEach(function (q) {
    var v = a ? a[q.k] : undefined;
    if (q.free) { var t = String(v == null ? '' : v).trim(); if (t && (t.length < 3 || t.length > 400)) bad.push(q.k); else out.dream = t; return; }
    if (q.o) { if (q.o.indexOf(String(v)) > -1) out[q.k] = String(v); else { var j = Number(v); if (String(v) !== '' && j >= 0 && j < q.o.length && Math.floor(j) === j) out[q.k] = q.o[j]; else bad.push(q.k); } return; }
    var max = q.h === 'phq' ? 3 : 4, n = Number(v);
    if (String(v) === '' || v == null || !(n >= 0 && n <= max) || Math.floor(n) !== n) bad.push(q.k); else out[q.k] = n;
  });
  return { a: out, bad: bad };
}
function tgMigResultJson_(sc, a) {
  var b = T_MIG_BAND[sc.band], lines = [];
  sc.strong.slice(0, 2).forEach(function (k) { lines.push(T_MIG_DIM[k]); });
  if (sc.s > 0) lines.push(T_MIG_S_LINE);
  if (sc.anx || sc.dep) lines.push(T_MIG_PHQ_LINE.replace('{x}', sc.anx && sc.dep ? 'اضطراب و افسردگی' : (sc.anx ? 'اضطراب' : 'افسردگی')));
  return { band: sc.band, title: b[0], body: b[1], lines: lines, sup: a.sup === 'نه چندان' ? T_MIG_SUP_LINE : '', tail: T_MIG_TAIL,
           strong: sc.strong.map(function (k) { return { k: k, label: T_MIG_DIM_NAME[k], v: sc[k] }; }),
           A: sc.A, D: sc.D, P: sc.P,
           buttons: sc.band === 'green' ? ['url', 'book'] : ['book', 'url'],
           book: { label: T_MIG_BOOK_BTN }, url: { label: T_MIG_URL_BTN, href: TG_MIG_URL.replace('utm_source=telegram', 'utm_source=telegram_app') } };
}
function tgApiMig_(p) {
  var op = String(p.op || 'q');
  if (op === 'q') {
    return { ok: true, intro: T_MIG_INTRO.replace(/<[^>]+>/g, ''), phqHead: T_MIG_PHQ_HEAD, migHead: T_MIG_MIG_HEAD,
             phqOpts: TG_MIG_PHQ_OPTS, migOpts: TG_MIG_MIG_OPTS, dream: T_MIG_DREAM, skip: T_MIG_DREAM_SKIP,
             q: TG_MIG_Q.map(function (q) { return { k: q.k, t: q.t || '', o: q.o || null, h: q.h || '', free: !!q.free }; }) };
  }
  var user = tgMigApiUser_(p);
  if (!user || !user.id) return { ok: false, error: 'auth' };
  var chat = user.id, name = [user.first_name, user.last_name].filter(String).join(' ').trim() || 'بدون نام', uname = user.username ? '@' + user.username : '';
  if (op === 'submit') {
    var raw = p.a; if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (e) { raw = null; } }
    var chk = tgMigApiCheck_(raw || {});
    if (chk.bad.length) return { ok: false, error: 'bad', fields: chk.bad };
    var sc = tgMigScore_(chk.a);
    var st = { i: TG_MIG_Q.length, a: chk.a, src: 'app', sc: sc, t: Date.now() };
    st.tab = tgMigSave_(chat, st, sc);
    tgMigPut_(chat, st);
    return { ok: true, result: tgMigResultJson_(sc, chk.a) };
  }
  if (op === 'book') {
    var st2 = tgMigGet_(chat);
    if (!st2 || !st2.sc) return { ok: false, error: 'no_result' };
    if (!st2.booked) {
      var sc2 = st2.sc;
      var note = 'تست مهاجرت · ' + sc2.band + ' · ' + (sc2.strong.map(function (k) { return T_MIG_DIM_NAME[k]; }).join('، ') || 'بی بُعد پررنگ') + ' · ' + (st2.src || 'app') + (sc2.s > 0 ? ' · s>0' : '');
      tgMigLead_(chat, name, uname, st2, note);
      st2.booked = 1; tgMigPut_(chat, st2);
      if (st2.tab && !TG_DRY) { try { tgMigSheet_().getRange(st2.tab, TG_MIG_HEAD.length).setValue('بله'); } catch (e2) {} }
      if (TG_DRY && st2.tab) { var T = TG_MEM['tab:' + TG_MIG_TAB] || []; if (T[st2.tab - 2]) T[st2.tab - 2][TG_MIG_HEAD.length - 1] = 'بله'; }
    }
    return { ok: true, next: 'book' };
  }
  return { ok: false, error: 'op' };
}

/* ---------- آزمون ---------- */
function tgMigTests() {
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  function S(o) { var a = { p1: 0, p2: 0, p3: 0, p4: 0, s: 0, g1: 0, g2: 0, i1: 0, i2: 0, l1: 0, l2: 0, s1: 0, s2: 0, c1: 0, c2: 0 }; for (var k in o) a[k] = o[k]; return tgMigScore_(a); }
  var cq = function (id) { return { message: { chat: { id: id }, message_id: 77 }, from: { first_name: 'نمونه' } }; };
  try {
    /* نمره: مرزها */
    ok('P=2 سبز', S({ p1: 1, p3: 1 }).band === 'green');
    ok('P=3 زرد', S({ p1: 2, p3: 1 }).band === 'yellow');
    ok('P=5 زرد', S({ p1: 2, p2: 1, p3: 1, p4: 1 }).band === 'yellow');
    ok('P=6 نارنجی', S({ p1: 2, p2: 1, p3: 2, p4: 1 }).band === 'orange');
    ok('A=3 و D=3 نارنجی (P=6)', S({ p1: 2, p2: 1, p3: 2, p4: 1 }).anx && S({ p1: 2, p2: 1, p3: 2, p4: 1 }).dep);
    ok('A=3 و D=2 زرد', S({ p1: 2, p2: 1, p3: 1, p4: 1 }).band === 'yellow');
    ok('بُعد ۴ پررنگ نیست', S({ g1: 2, g2: 2 }).strong.length === 0 && S({ g1: 2, g2: 2 }).band === 'green');
    ok('بُعد ۵ پررنگ و زرد', S({ g1: 3, g2: 2 }).strong.join() === 'grief' && S({ g1: 3, g2: 2 }).band === 'yellow');
    ok('سه بُعد پررنگ نارنجی', S({ g1: 3, g2: 2, i1: 3, i2: 2, l1: 4, l2: 1 }).band === 'orange');
    ok('s=0 بی اثر، s=1 نارنجی', S({ s: 0 }).band === 'green' && S({ s: 1 }).band === 'orange');
    ok('ترتیب ابعاد به نمره، برابرها به ترتیب تعریف', S({ c1: 4, c2: 4, g1: 3, g2: 3, l1: 3, l2: 3 }).strong.join() === 'helpless,grief,lonely');

    /* جریان کامل از ig_tl_test */
    var C = 9301;
    tgPrivate_({ chat: { id: C, type: 'private' }, from: { id: C, first_name: 'نمونه' }, text: '/start ig_tl_test' });
    var st0 = tgMigGet_(C);
    ok('ig_tl_test: مقدمه و منبع اینستاگرام', !!st0 && st0.src === 'اینستاگرام · tl · test' && TG_OUTBOX.some(function (o) { return /۱۹ سؤال کوتاه/.test(o.text || ''); }));
    tgMigCb_(cq(C), 'go', C, 'نمونه', '');
    var ans = [0, 0, 1, 1, 0, 0, 0, 3, 3, 1, 1, 0, 0, 0, 0, 0, 0, 1];
    for (var i = 0; i < ans.length; i++) tgMigCb_(cq(C), 'a:' + i + ':' + ans[i], C, 'نمونه', '');
    ok('سؤال ۱۹ متن آزاد با «رد می‌شوم»', TG_OUTBOX.some(function (o) { return /یک خواب بود/.test(o.text || '') && JSON.stringify(o.markup || '').indexOf('mg:skip') > -1; }));
    ok('لمس تکراری سؤال قبلی نادیده گرفته می‌شود', (tgMigCb_(cq(C), 'a:3:3', C, 'نمونه', ''), tgMigGet_(C).i === 18));
    TG_OUTBOX = [];
    ok('رؤیا کوتاه رد می‌شود', tgMigText_(C, 'ab') === true && TG_OUTBOX.some(function (o) { return o.text === T_MIG_DREAM_BAD; }));
    tgMigText_(C, 'یک ایستگاه قطار که هیچ قطاری از آن نمی‌رود');
    var res = TG_OUTBOX.filter(function (o) { return /🟡|🟢|🟠/.test(o.text || ''); })[0];
    ok('نتیجه: زرد با سوگ و خط «کسی را نداری»', !!res && /🟡/.test(res.text) && /سوگ و دلتنگی/.test(res.text) && res.text.indexOf(T_MIG_SUP_LINE) > -1 && res.text.indexOf(T_MIG_TAIL) > -1);
    ok('نتیجه: معارفه اول، لینک سایت با utm', JSON.stringify(res.markup.inline_keyboard[0]).indexOf('mg:book') > -1 && JSON.stringify(res.markup).indexOf('utm_source=telegram&utm_campaign=mig_test') > -1);
    var T = TG_MEM['tab:' + TG_MIG_TAB] || [];
    ok('ردیف تب «تست مهاجرت» با نمره و رؤیا، بی لید', T.length === 1 && T[0][2] === 'اینستاگرام · tl · test' && T[0][25] === 'yellow' && T[0][26].indexOf('ایستگاه') > -1 && T[0][27] === '' && !TG_OUTBOX.some(function (o) { return o.kind === 'lead'; }));
    TG_OUTBOX = [];
    tgMigCb_(cq(C), 'book', C, 'نمونه', '');
    var ld = TG_OUTBOX.filter(function (o) { return o.kind === 'lead'; })[0];
    ok('معارفه: لید با یادداشت باند و ابعاد و منبع، بعد مسیر معارفه', !!ld && /تست مهاجرت · yellow · سوگ · اینستاگرام · tl · test/.test(ld.o.note) && ld.o.region === 'خارج از ایران' && T[0][27] === 'بله' && TG_OUTBOX.some(function (o) { return o.text === T_OUTSIDE; }));

    /* s > 0: بی پیام اورژانس، نارنجی، خط ویژه، یادداشت لید */
    var D = 9302;
    TG_MEM['desk'] = [{ chat: '7001', role: 'مسئول پذیرش' }];
    tgMigStart_(D, 'بات'); tgMigCb_(cq(D), 'go', D, 'نمونه', '');
    [0, 0, 0, 0, 0, 0].forEach(function (v, i) { tgMigCb_(cq(D), 'a:' + i + ':' + v, D, 'نمونه', ''); });
    TG_OUTBOX = []; TG_MEM['notify'] = [];
    tgMigCb_(cq(D), 'a:6:1', D, 'نمونه', '');
    ok('s>0: پیام اورژانس، هشدار و لید نیست؛ سؤال ۸ می‌آید (روی نسخهٔ قبل مردود)', !TG_OUTBOX.some(function (o) { return /۱۲۳|۱۱۲|۹۱۱/.test(o.text || '') || o.kind === 'lead'; }) && !(TG_MEM['notify'] || []).length && TG_OUTBOX.some(function (o) { return /سؤال ۸ از/.test(o.text || ''); }));
    ok('کد mig_help و دکمهٔ کمک نیست', typeof tgMigSafety_ === 'undefined' && typeof tgMigHelp_ === 'undefined' && String(tgMigCb_).indexOf("'help'") < 0);
    for (var k = 7; k < 18; k++) tgMigCb_(cq(D), 'a:' + k + ':0', D, 'نمونه', '');
    TG_OUTBOX = []; tgMigCb_(cq(D), 'skip', D, 'نمونه', '');
    var r2 = TG_OUTBOX.filter(function (o) { return /🟠/.test(o.text || ''); })[0];
    ok('s>0: نتیجهٔ نارنجی با خط ویژه', !!r2 && r2.text.indexOf(T_MIG_S_LINE) > -1);
    TG_OUTBOX = []; tgMigCb_(cq(D), 'book', D, 'نمونه', '');
    var l2 = TG_OUTBOX.filter(function (o) { return o.kind === 'lead'; })[0];
    ok('s>0: لید با یادداشت «s>0» و بی برچسب هشدار', !!l2 && /· s>0$/.test(l2.o.note) && !/هشدار|بحران/.test(l2.o.firstText));
    TG_OUTBOX = []; tgMigCb_(cq(D), 're', D, 'نمونه', '');
    var st2 = tgMigGet_(D);
    ok('«از اول» همه‌چیز را پاک می‌کند', !!st2 && st2.i === -1 && Object.keys(st2.a).length === 0 && !st2.booked && TG_OUTBOX.some(function (o) { return /۱۹ سؤال کوتاه/.test(o.text || ''); }));
    TG_OUTBOX = []; tgPrivate_({ chat: { id: 9303, type: 'private' }, from: { id: 9303, first_name: 'نمونه' }, text: '/migration' });
    ok('/migration و /start mig تست را باز می‌کنند', !!tgMigGet_(9303) && (tgPrivate_({ chat: { id: 9304, type: 'private' }, from: { id: 9304, first_name: 'نمونه' }, text: '/start mig' }), !!tgMigGet_(9304)));
    TG_OUTBOX = []; tgMigTests_(9305);
    ok('منوی تست‌ها: دکمهٔ دوم تست مهاجرت', TG_OUTBOX[0].text === T_MIG_TESTS && TG_OUTBOX[0].markup.inline_keyboard[1][0].text === TG_MIG_BTN);
    /* مینی‌اپ */
    var q0 = tgApiMig_({ api: 'mig', op: 'q' });
    ok('api mig q: ۱۹ سؤال و متن‌ها، بی initData', q0.ok && q0.q.length === 19 && q0.phqOpts.length === 4 && q0.intro.indexOf('<') < 0);
    ok('api mig: بی کاربر معتبر رد می‌شود', tgApiMig_({ op: 'submit', a: {} }).error === 'auth');
    var U = { id: 9401, first_name: 'نمونه' };
    var A0 = { dur: 1, reg: 'اروپا', p1: 2, p2: 1, p3: 1, p4: 1, s: 0, g1: 3, g2: 3, i1: 0, i2: 0, l1: 0, l2: 0, s1: 0, s2: 0, c1: 0, c2: 0, sup: 'نه چندان', dream: '' };
    ok('api mig: پاسخ نادرست با نام فیلد رد می‌شود', (function () { var b = {}; for (var k in A0) b[k] = A0[k]; b.p1 = 5; delete b.c2; var r = tgApiMig_({ op: 'submit', _user: U, a: b }); return r.error === 'bad' && r.fields.join() === 'p1,c2'; })());
    TG_MEM['tab:' + TG_MIG_TAB] = []; TG_OUTBOX = [];
    var r1 = tgApiMig_({ op: 'submit', _user: U, a: JSON.stringify(A0) });
    var sx = tgMigScore_(tgMigApiCheck_(A0).a);
    ok('api mig submit: همان tgMigScore_ (زرد، سوگ)', r1.ok && r1.result.band === sx.band && sx.band === 'yellow' && r1.result.strong[0].k === 'grief' && r1.result.sup === T_MIG_SUP_LINE);
    var row1 = (TG_MEM['tab:' + TG_MIG_TAB] || [])[0] || [];
    ok('api mig submit: سطر تب با منبع app و بی لید', row1[2] === 'app' && row1[3] === '۱ تا ۳' && row1[25] === 'yellow' && !TG_OUTBOX.some(function (o) { return o.kind === 'lead'; }));
    ok('api mig: لینک سایت داخل اکوسیستم', r1.result.url.href.indexOf('https://tajrobeh.life/persian-therapy/') === 0);
    var A1 = {}; for (var k1 in A0) A1[k1] = A0[k1]; A1.s = 2;
    var r2 = tgApiMig_({ op: 'submit', _user: { id: 9402 }, a: A1 });
    ok('api mig: s>0 نارنجی با خط ویژه، بی پیام و بی اعلان', r2.result.band === 'orange' && r2.result.lines.indexOf(T_MIG_S_LINE) > -1 && !TG_OUTBOX.some(function (o) { return o.kind === 'msg'; }));
    TG_OUTBOX = [];
    var b2 = tgApiMig_({ op: 'book', _user: { id: 9402, first_name: 'نمونه' } });
    var lb = TG_OUTBOX.filter(function (o) { return o.kind === 'lead'; })[0];
    ok('api mig book: لید با یادداشت app و s>0، یک بار', b2.ok && !!lb && /تست مهاجرت · orange · سوگ · app · s>0$/.test(lb.o.note) && (tgApiMig_({ op: 'book', _user: { id: 9402 } }), TG_OUTBOX.filter(function (o) { return o.kind === 'lead'; }).length === 1));
    ok('api mig book بی نتیجه رد می‌شود', tgApiMig_({ op: 'book', _user: { id: 9499 } }).error === 'no_result');
    ok('مسیر api در روتر و رجیستری قابلیت‌ها', String(tgApiRoute_).indexOf("api === 'mig'") > -1 && TG_CAP.some(function (c) { return c.api === 'mig' && c.app && c.bot; }));
    var all = [T_MIG_INTRO, T_MIG_DREAM, T_MIG_TAIL, T_MIG_SUP_LINE, T_MIG_S_LINE].concat(Object.keys(T_MIG_BAND).map(function (k) { return T_MIG_BAND[k].join(' '); })).concat(Object.keys(T_MIG_DIM).map(function (k) { return T_MIG_DIM[k]; })).join(' ');
    ok('مقدمه وعدهٔ تماس نمی‌دهد', T_MIG_INTRO.indexOf('تماس') < 0 && /این تست تشخیص نیست\.$/.test(T_MIG_INTRO));
    ok('بی خط تیره وسط جمله و بی لینک بیرونی', all.indexOf('—') < 0 && all.indexOf('–') < 0 && TG_MIG_URL.indexOf('https://tajrobeh.life/') === 0);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ تست مهاجرت درست است'));
  return tgTestTally_(log, fail);
}
