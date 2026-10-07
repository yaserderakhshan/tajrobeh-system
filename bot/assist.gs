/**
 * assist.gs · v170.23.11 · دستیار پاسخ‌گو (بات، وب، ویجت سایت؛ نسخهٔ ۲ همان رابط وب را صدا می‌زند)
 *
 * دانش: فقط ردیف‌های «دانش دستیار» (هاب پذیرش) با «تأیید = بله». ردیف بی تأیید هرگز استفاده نمی‌شود. ردیفی که دربارهٔ
 *   درصد، سهم، کمیسیون، تسویه یا قرارداد است حتی با تأیید هم کنار می‌رود (AS_DENY).
 * حالت‌ها (ASSIST_MODE):
 *   «منو»: دکمه‌های موضوع؛ هر متن آزاد مستقیم به پذیرش.
 *   «جستجو» (پیش‌فرض): متن آزاد داخل همین Apps Script، بی هیچ سرویس بیرونی، با «پرسش‌های نمونه» و «موضوع» ردیف‌های
 *     تأییدشده مقایسه می‌شود: یکسان‌سازی فارسی، حذف واژه‌های پرتکرار بی‌معنا، همپوشانی واژه‌ها با وزن بیشتر برای واژه‌های کم‌تکرار.
 *     امتیاز بالای ASSIST_MATCH_MIN (پیش‌فرض محافظه‌کار ۰٫۶) ← پاسخ همان ردیف با «جوابم را نگرفتم»؛ وگرنه سه موضوع نزدیک و «با پذیرش حرف بزنم».
 *   «هوشمند»: فقط وقتی ASSIST_GEMINI_PAID = «بله». تا آن موقع هرگز فعال نمی‌شود و به «جستجو» برمی‌گردد. جمنای فقط شمارهٔ ردیف
 *     تأییدشده را انتخاب می‌کند و پاسخ همیشه متن تأییدشده است؛ متن پیش از ارسال بی‌شناسه می‌شود.
 * جمنای رایگان فقط برای یک کار: پیش‌نویس ردیف‌های «دانش دستیار» از «سؤالات متداول» (بی هیچ دادهٔ کاربر)، با «تأیید = خیر».
 * مرزها: مشاورهٔ بالینی، تشخیص یا دارو نه. بحران همیشه پیش از هر تطبیقی با فهرست واژه‌ها (tgIsCrisis_): شمارهٔ اورژانس
 *   کشور کاربر (ASSIST_EMERGENCY، پیش‌فرض متن ایران T_CRISIS) و کارت فوری برای پذیرش بی ساعت سکوت. ویس و فایل به دستیار نمی‌رسد.
 * تحویل به پذیرش: صندوق یکتا (inbAdd_) اگر هست، وگرنه «تماس همکاران» (tgColleague_)؛ کاربر «پیامت به پذیرش رسید» می‌گیرد.
 * رابط وب واحد: doPost با action = assist.ask و امضای HMAC همان سایت (ts و sig در نشانی؛ Apps Script سرآیند نمی‌خواند).
 *   ورودی channel، session_id، text، country؛ خروجی answer، topic، handoff، buttons. نرخ‌گیری برای هر session_id.
 * گزارش: «دستیار · گزارش» بی متن سؤال؛ «سؤال‌های بی‌پاسخ» فقط متن بی‌شناسه، پاک‌شدن بعد از ۳۰ روز؛ یک خط در گزارش شبانه.
 * همه پشت ASSIST_ENABLED = «بله».
 */
var AS_KB_TAB = 'دانش دستیار';
var AS_KB_HEAD = ['موضوع', 'پرسش‌های نمونه', 'پاسخ', 'منبع', 'تأیید', 'تاریخ تأیید', 'تأییدکننده',
  'مخاطب', 'حوزه', 'تیم تأیید', 'نسخه', 'تاریخ بازبینی', 'یادداشت بازبینی'];   /* v170.23.15: ستون‌های ته جدول (ASSISTANT.md بند ۵)؛ با نام سرستون خوانده می‌شوند */
var AS_LOG_TAB = 'دستیار · گزارش';
var AS_LOG_HEAD = ['زمان', 'کانال', 'موضوع', 'حالت', 'نتیجه', 'رضایت', 'شناسه', 'مخاطب', 'میلی‌ثانیه'];   /* v170.23.15: مخاطب و زمان پاسخ */
var AS_UN_TAB = 'سؤال‌های بی‌پاسخ';
var AS_UN_HEAD = ['زمان', 'کانال', 'متن'];
var AS_COST_TAB = 'هزینهٔ جمنای';
var AS_COST_HEAD = ['زمان', 'کار', 'مدل', 'توکن ورودی', 'توکن خروجی'];
var AS_BTN = '❓ سؤال دارم';
var AS_WELCOME = 'سلام، من دستیار تجربه هستم. سؤالت را بپرس یا یکی از موضوع‌ها را انتخاب کن. هر جا لازم باشد، همکارم در پذیرش جواب می‌دهد.';
var AS_HANDED = 'پیامت به پذیرش رسید. همکارم در پذیرش همین‌جا جواب می‌دهد.';
var AS_DENY = /درصد|سهم درمانگر|کمیسیون|تسویه|قرارداد همکاری|شرایط قرارداد/;
var AS_MODES = { menu: 'منو', search: 'جستجو', smart: 'هوشمند' };
var AS_BOT_LINK = 'https://t.me/tajrobehlife_bot?start=pz-assist';
cfg_('ASSIST_ENABLED', '');      /* «بله» = روشن */
cfg_('ASSIST_MODE', '');         /* منو | جستجو | هوشمند؛ خالی = جستجو */
cfg_('ASSIST_GEMINI_PAID', '');  /* فقط یاسر بعد از فعال شدن Billing «بله» می‌کند */
cfg_('ASSIST_MATCH_MIN', '');    /* آستانهٔ جست‌وجو، ۰ تا ۱؛ خالی = ۰٫۶ */
cfg_('ASSIST_EMERGENCY', '');    /* JSON {کد کشور: متن اورژانس}؛ خالی = متن ایران */
cfg_('ASSIST_RATE', '');         /* سقف پرسش هر session_id در ساعت؛ خالی = ۲۰ */
cfg_('ASSIST_TOOLS', '');        /* v170.23.16: «بله» = ابزارهای بی هوش مصنوعی (AS_TOOLS: رویدادهای پیش‌رو، مجله، وضعیت من) */
cfg_('ASSIST_KB_TEAMS', '');     /* v170.23.15: «بله» = /askreview به تفکیک «تیم تأیید» و راه تیم‌های دیگر (مالی، مدرسه، رویداد، مجله)؛ خالی = فقط پذیرش و مالک، همهٔ صف */
/* تیم‌های تأیید (ASSISTANT.md بند ۲) و نقش‌هایی که هر تیم را می‌سازند (نقش میز پذیرش یا تب افراد) */
var AS_TEAMS = { 'پذیرش': /پذیرش/, 'مالی': /مالی/, 'مدرسه': /مدرسه|استاد|هیئت علمی|منتور|سوپروایزر/, 'رویداد': /رویداد|کامیونیتی|کمپین/, 'مجله': /مجله|سردبیر/ };
var AS_AUDS = ['مراجع', 'خانواده', 'کاربر عمومی', 'مراجع خارج از ایران', 'درمانگر', 'پارتنر فضا', 'سازمان', 'کارمند سازمان', 'متقاضی همکاری', 'دانشجو', 'علاقه‌مند', 'عضو مدرسه', 'استاد', 'کامیونیتی', 'نویسنده', 'خوانندهٔ مجله', 'روان‌شناس', 'همکار'];

function asDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function asNow_() { return asDry_() && TG_MEM['as:now'] ? Number(TG_MEM['as:now']) : Date.now(); }
function asOn_() { return String(cfg_('ASSIST_ENABLED', '') || '').trim() === 'بله'; }
function asPaid_() { return String(cfg_('ASSIST_GEMINI_PAID', '') || '').trim() === 'بله'; }
/** حالت مؤثر: «هوشمند» بی ASSIST_GEMINI_PAID = بله هرگز؛ به «جستجو» برمی‌گردد */
function asMode_() {
  var m = String(cfg_('ASSIST_MODE', '') || '').trim();
  if (m === AS_MODES.menu) return AS_MODES.menu;
  if (m === AS_MODES.smart && asPaid_()) return AS_MODES.smart;
  return AS_MODES.search;
}
function asMin_() { var n = Number(tgLatinDigits_(String(cfg_('ASSIST_MATCH_MIN', '') || ''))); return n > 0 && n <= 1 ? n : 0.6; }
function asFmt_(ms) { return Utilities.formatDate(new Date(ms || asNow_()), TG_TZ, 'yyyy-MM-dd HH:mm'); }

/* ───── برگه‌ها با نام سرستون (هاب پذیرش) ───── */
function asTab_(name, head) {
  if (asDry_()) {
    var D = TG_MEM['as:' + name] = TG_MEM['as:' + name] || [];
    D.forEach(function (o, i) { o._row = i + 2; });
    return { rows: D, set: function (r, h, v) { var o = D[r - 2]; if (o) o[h] = v; }, add: function (o) { D.push(o); o._row = D.length + 1; return o; }, del: function (r) { D.splice(r - 2, 1); } };
  }
  var ss = tgSS_(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.setRightToLeft(true); sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); sh.setFrozenRows(1); }
  var lc = Math.max(sh.getLastColumn(), head.length), hd = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
  head.forEach(function (h) { if (hd.indexOf(h) < 0) { hd.push(h); sh.getRange(1, hd.length).setValue(h).setFontWeight('bold'); } });
  var n = sh.getLastRow(), v = n > 1 ? sh.getRange(2, 1, n - 1, hd.length).getValues() : [];
  var rows = v.map(function (r, i) { var o = { _row: i + 2 }; hd.forEach(function (h, j) { if (h) o[h] = r[j] instanceof Date ? asFmt_(r[j].getTime()) : String(r[j] == null ? '' : r[j]).trim(); }); return o; });
  return {
    rows: rows,
    set: function (r, h, val) { var c = hd.indexOf(h); if (c > -1) sh.getRange(r, c + 1).setValue(val); },
    add: function (o) { sh.appendRow(hd.map(function (h) { return o[h] === undefined ? '' : (typeof tgCell_ === 'function' ? tgCell_(o[h]) : o[h]); })); o._row = sh.getLastRow(); rows.push(o); return o; },
    del: function (r) { sh.deleteRow(r); }
  };
}

/* ───── دانش تأییدشده ───── */
function asKb_() {
  var out = [];
  asTab_(AS_KB_TAB, AS_KB_HEAD).rows.forEach(function (o) {
    if (String(o['تأیید'] || '').trim() !== 'بله') return;
    if (!o['پاسخ'] || AS_DENY.test(o['موضوع'] + ' ' + o['پاسخ'])) return;
    out.push({ row: o._row, topic: String(o['موضوع'] || 'عمومی').trim(), samples: String(o['پرسش‌های نمونه'] || '').split(/\n|؛/).map(function (s) { return s.trim(); }).filter(String), answer: String(o['پاسخ']).trim() });
  });
  return out;
}
function asTopics_(kb) { var seen = {}, out = []; (kb || asKb_()).forEach(function (k) { if (!seen[k.topic]) { seen[k.topic] = 1; out.push(k.topic); } }); return out; }

/* ───── یکسان‌سازی و جست‌وجو (بی سرویس بیرونی) ───── */
var AS_STOP = ('از به با در بر که این آن اون را رو و یا تا برای چه چی چرا چطور چطوری چگونه چجوری آیا من ما شما تو او اون‌ها هست است هستم هستید بود شد شود میشه میشود می‌شود ' +
  'کنم کنید کنیم کرد کردم کن کنه یک یه هم اگر ولی اما خیلی لطفا لطفاً سلام ممنون مرسی باید دارم دارید داره دارد بله نه کجا کی کدام کدوم چند همین همان چیزی ' +
  'خوب خوبه میخوام میخواهم خواهم خواستم بخوام بدونم دونم بگید بگین بگویید توی تو دیگه دیگر هر همه وقتی اینکه آنکه بی های ها ای ام').split(/\s+/);
var AS_STOP_SET = null;
function asNorm_(s) {
  s = tgLatinDigits_(String(s || ''));
  s = s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه').replace(/[أإآ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ی');
  s = s.replace(/[ً-ٰٟـ]/g, '').replace(/‌/g, '').toLowerCase();
  return s.replace(/[^؀-ۿa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function asStem_(t) {
  if (t.length > 4 && /^(نمی|می)/.test(t)) t = t.replace(/^(نمی|می)/, '');
  var suf = ['هایی', 'های', 'ها', 'ترین', 'تر', 'یی', 'ای', 'ام', 'ات', 'اش', 'یم', 'ید', 'ند', 'ی'];
  for (var i = 0; i < suf.length; i++) if (t.length - suf[i].length >= 3 && t.slice(-suf[i].length) === suf[i]) return t.slice(0, -suf[i].length);
  return t;
}
function asTokens_(s) {
  if (!AS_STOP_SET) { AS_STOP_SET = {}; AS_STOP.forEach(function (w) { AS_STOP_SET[asNorm_(w)] = 1; }); }
  var out = [], seen = {};
  asNorm_(s).split(' ').forEach(function (w) { if (!w || AS_STOP_SET[w] || w.length < 2) return; var t = asStem_(w); if (!seen[t]) { seen[t] = 1; out.push(t); } });
  return out;
}
/** بهترین ردیف‌ها با امتیاز ۰ تا ۱: وزن هر واژه log(1 + N/df)؛ واژهٔ ناشناخته بیشترین وزن را می‌گیرد (احتیاط) */
function asSearch_(text, kb) {
  kb = kb || asKb_();
  var q = asTokens_(text); if (!q.length || !kb.length) return [];
  var docs = [];
  kb.forEach(function (k, i) {
    var tt = asTokens_(k.topic), list = k.samples.length ? k.samples : [''];
    list.forEach(function (s) { var set = {}; tt.concat(asTokens_(s)).forEach(function (t) { set[t] = 1; }); docs.push({ i: i, set: set }); });
  });
  var N = docs.length, df = {};
  docs.forEach(function (d) { Object.keys(d.set).forEach(function (t) { df[t] = (df[t] || 0) + 1; }); });
  var w = function (t) { return Math.log(1 + N / (df[t] || 0.5)); };
  var tot = q.reduce(function (a, t) { return a + w(t); }, 0), best = {};
  docs.forEach(function (d) {
    var hit = q.reduce(function (a, t) { return a + (d.set[t] ? w(t) : 0); }, 0), sc = tot ? hit / tot : 0;
    if (!best[d.i] || sc > best[d.i]) best[d.i] = sc;
  });
  return Object.keys(best).map(function (i) { return { k: kb[i], score: Math.round(best[i] * 1000) / 1000 }; })
    .filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; });
}

/* ───── بی‌شناسه کردن ───── */
function asKnownNames_() {
  var out = [];
  try { (typeof tgTherapistRows_ === 'function' ? tgTherapistRows_() : []).forEach(function (t) { if (t.name) out.push(String(t.name)); }); } catch (e) {}
  try { (typeof tgPeopleList_ === 'function' ? tgPeopleList_() : []).forEach(function (p) { if (p.name) out.push(String(p.name)); }); } catch (e2) {}
  return out;
}
/* v170.23.15: واژهٔ بعد از عنوان (خانم، آقای، دکتر، استاد و مانند آن) و هر واژهٔ لاتین حرف‌بزرگ، حتی اگر در فهرست‌های داخلی نباشد */
var AS_TITLES = ['سرکار خانم', 'جناب آقای', 'خانم', 'آقای', 'آقا', 'دکتر', 'استاد', 'مهندس', 'جناب', 'سرکار', 'دکتری'];
function asScrubTitles_(s) {
  var t = AS_TITLES.map(function (x) { return x.replace(/\s+/g, '\\s+'); }).join('|');
  s = s.replace(new RegExp('(^|[\\s«"(،,.])(' + t + ')\\s+[^\\s«»"(),،.!؟?:؛]+', 'g'), '$1$2 [نام]');
  return s.replace(/(^|[^A-Za-z])[A-Z][a-z]+(?:[-'][A-Za-z]+)*/g, '$1[نام]');
}
function asScrub_(text, extra) {
  var s = cmScrub_(String(text || ''), '');
  s = s.replace(/\d{4,}/g, '[عدد]');
  s = asScrubTitles_(s);
  var names = asKnownNames_().concat(extra || []), parts = {};
  names.forEach(function (n) { String(n).split(/\s+/).forEach(function (p) { p = p.trim(); if (p.length >= 3) parts[p] = 1; }); });
  names.forEach(function (n) { n = String(n).trim(); if (n.length >= 3) s = s.split(n).join('[نام]'); });
  s = s.split(/(\s+)/).map(function (w) { return parts[w.replace(/[.,،!؟?]/g, '')] ? '[نام]' : w; }).join('');
  return s.slice(0, 400);
}

/* ───── گزارش ───── */
/* ctx اختیاری: مخاطب (ctx.audience) و زمان پاسخ از ctx.t0 */
function asLog_(channel, topic, mode, result, ctx) {
  var id = 'A-' + asNow_().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  var ms = ctx && ctx.t0 ? Math.max(0, Date.now() - ctx.t0) : '';
  try { asTab_(AS_LOG_TAB, AS_LOG_HEAD).add({ 'زمان': asFmt_(), 'کانال': channel, 'موضوع': topic || '', 'حالت': mode, 'نتیجه': result, 'رضایت': '', 'شناسه': id, 'مخاطب': asAud_(ctx), 'میلی‌ثانیه': ms }); } catch (e) { tgErr_('asLog_', e); }
  return id;
}
/* مخاطب: از ورودی وب (فهرست AS_AUDS) یا در بات از نقش chat؛ وگرنه «کاربر عمومی» */
function asAud_(ctx) {
  if (!ctx) return '';
  if (ctx.aud) return ctx.aud;
  var a = String(ctx.audience || '').trim();
  if (AS_AUDS.indexOf(a) > -1) return (ctx.aud = a);
  if (ctx.channel === 'bot' && ctx.chat) {
    try {
      var r = tgRolesOf_(ctx.chat, ''), roles = (r && r.roles) || [];
      if (r && r.desk) return (ctx.aud = 'همکار');
      if (roles.indexOf('درمانگر') > -1) return (ctx.aud = 'درمانگر');
      if (roles.some(function (x) { return /دانشجو/.test(x); })) return (ctx.aud = 'دانشجو');
      if (roles.some(function (x) { return /استاد|سوپروایزر|منتور/.test(x); })) return (ctx.aud = 'استاد');
      if (roles.some(function (x) { return /پارتنر/.test(x); })) return (ctx.aud = 'پارتنر فضا');
    } catch (e) {}
  }
  return (ctx.aud = 'کاربر عمومی');
}
function asRate_(id, good) {
  var t = asTab_(AS_LOG_TAB, AS_LOG_HEAD), o = t.rows.filter(function (r) { return r['شناسه'] === id; })[0];
  if (o && !o['رضایت']) { t.set(o._row, 'رضایت', good ? '👍' : '👎'); return true; }
  return false;
}
function asUnanswered_(channel, text, extra) {
  try { asTab_(AS_UN_TAB, AS_UN_HEAD).add({ 'زمان': asFmt_(), 'کانال': channel, 'متن': asScrub_(text, extra) }); } catch (e) { tgErr_('asUnanswered_', e); }
}
/** سؤال‌های بی‌پاسخ بیش از ۳۰ روز پاک می‌شوند */
function asPurge_() {
  var t = asTab_(AS_UN_TAB, AS_UN_HEAD), lim = asFmt_(asNow_() - 30 * 86400000), n = 0;
  t.rows.slice().reverse().forEach(function (o) { if (o['زمان'] && o['زمان'] < lim) { t.del(o._row); n++; } });
  return n;
}

/* ───── هستهٔ پاسخ (مشترک بات و وب) ─────
   ctx: {channel, chat, name, country}. خروجی: {answer, topic, handoff, buttons:[{id,text}|{url,text}], crisis, log} */
function asEmergency_(country) {
  var m = cfg_('ASSIST_EMERGENCY', '');
  if (typeof m === 'string' && m) { try { m = JSON.parse(m); } catch (e) { m = {}; } }
  var c = String(country || '').trim().toUpperCase();
  return (m && c && m[c]) ? String(m[c]) : T_CRISIS;
}
/** chat همکاران میز پذیرش */
function asDeskChats_() {
  if (asDry_()) return TG_MEM['as:desk'] || [];
  return (typeof tgDeskRows_ === 'function' ? tgDeskRows_() : []).map(function (d) { return String(d.chat || '').split(/[,،;\s]+/)[0]; }).filter(String);
}
function asUrgent_(ctx) {
  var line = '🚨 <b>هشدار بحران در دستیار</b> · ' + (ctx.channel === 'bot' ? 'تلگرام' : 'وب') + (ctx.chat ? ' · chat در کارت گفت‌وگو' : ' · بی راه تماس');
  try { asDeskChats_().forEach(function (c) { tgNotify_(c, TG_NK.urgent, line, { ref: 'AS-CRISIS', force: true }); }); } catch (e) { tgErr_('asUrgent_', e); }
  if (typeof inbAdd_ === 'function') { try { inbAdd_('as', 'AS-' + (ctx.chat || ctx.session || asNow_()), { chat: ctx.chat || '', text: 'بحران · ' + (ctx.channel || ''), q: 'پذیرش', type: 'بحران', more: true }); } catch (e2) {} }
}
function asHandoff_(ctx, text, why) {
  var sum = asScrub_(text, [ctx.name]).replace(/\s+/g, ' ').slice(0, 140);
  var line = '🤖 دستیار · ' + why + (sum ? ': ' + sum : '');
  try {
    if (typeof inbAdd_ === 'function') inbAdd_('as', 'AS-' + (ctx.chat || ctx.session || asNow_()), { chat: ctx.chat || '', text: line, q: 'پذیرش', type: 'دستیار', more: true });
    else if (typeof tgColleague_ === 'function') tgColleague_(ctx.chat || '', ctx.name || (ctx.channel === 'bot' ? '' : 'وب'), ctx.uname || '', line);
    if (asDry_()) (TG_MEM['as:handoff'] = TG_MEM['as:handoff'] || []).push(line);
  } catch (e) { tgErr_('asHandoff_', e); }
}
function asTopicBtns_(topics) { return topics.slice(0, 3).map(function (t) { return { id: 't:' + asTopicIdx_(t), text: t }; }); }
function asTopicIdx_(t) { return asTopics_().indexOf(t); }
function asAnswerOut_(ctx, k, mode) {
  var log = asLog_(ctx.channel, k.topic, mode, 'پاسخ', ctx);
  return { answer: k.answer, topic: k.topic, handoff: false, log: log,
    buttons: [{ id: 'x:' + log, text: 'جوابم را نگرفتم' }, { id: 'y:' + log, text: '👍' }, { id: 'n:' + log, text: '👎' }] };
}
/** پرسش آزاد */
function asAsk_(ctx, text) {
  if (ctx && !ctx.t0) ctx.t0 = Date.now();
  text = String(text || '').trim();
  if (!text) return { answer: AS_WELCOME, topic: '', handoff: false, buttons: asTopicBtns_(asTopics_()).concat([{ id: 'h', text: 'با پذیرش حرف بزنم' }]) };
  /* بحران همیشه اول */
  if (tgIsCrisis_(text)) {
    asUrgent_(ctx);
    asLog_(ctx.channel, 'بحران', asMode_(), 'بحران', ctx);
    return { answer: asEmergency_(ctx.country), topic: 'بحران', handoff: true, crisis: true, buttons: [] };
  }
  var mode = asMode_();
  if (mode === AS_MODES.menu) {
    asHandoff_(ctx, text, 'متن آزاد');
    asLog_(ctx.channel, '', mode, 'تحویل', ctx);
    return { answer: AS_HANDED, topic: '', handoff: true, buttons: ctx.channel === 'bot' ? [] : [{ url: AS_BOT_LINK, text: 'ادامه در تلگرام' }] };
  }
  /* v170.23.16: ابزارها پیش از دانش (بعد از بحران و حالت منو) */
  var tool = asToolFor_(ctx, text);
  if (tool) return tool;
  var kb = asKb_();
  if (mode === AS_MODES.smart) {
    var sm = asSmart_(ctx, text, kb);
    if (sm && sm.crisis) { asUrgent_(ctx); asLog_(ctx.channel, 'بحران', mode, 'بحران', ctx); return { answer: asEmergency_(ctx.country), topic: 'بحران', handoff: true, crisis: true, buttons: [] }; }
    if (sm && sm.k) return asAnswerOut_(ctx, sm.k, mode);
    mode = AS_MODES.search;   /* اطمینان کم یا خطا: جست‌وجوی داخلی */
  }
  var res = asSearch_(text, kb), top = res[0];
  if (top && top.score >= asMin_()) return asAnswerOut_(ctx, top.k, mode);
  var near = [], seen = {};
  res.forEach(function (r) { if (!seen[r.k.topic] && near.length < 3) { seen[r.k.topic] = 1; near.push(r.k.topic); } });
  if (near.length < 3) asTopics_(kb).forEach(function (t) { if (!seen[t] && near.length < 3) { seen[t] = 1; near.push(t); } });
  asLog_(ctx.channel, '', mode, 'بی‌پاسخ', ctx);
  asUnanswered_(ctx.channel, text, [ctx.name]);
  return { answer: 'جواب دقیقی برای این پیدا نکردم. شاید یکی از این موضوع‌ها باشد، یا مستقیم با پذیرش حرف بزن.', topic: '', handoff: false,
    buttons: asTopicBtns_(near).concat([{ id: 'h', text: 'با پذیرش حرف بزنم' }]) };
}
/** کلیک روی دکمه‌ها؛ id بی پیشوند as: */
function asTap_(ctx, id, lastText) {
  if (ctx && !ctx.t0) ctx.t0 = Date.now();
  var a = String(id || '').split(':'), act = a[0];
  if (act === 't') {
    var topic = asTopics_()[Number(a[1])]; if (!topic) return asAsk_(ctx, '');
    var rows = asKb_().filter(function (k) { return k.topic === topic; });
    return { answer: '«' + topic + '»: کدام سؤال؟', topic: topic, handoff: false,
      buttons: rows.slice(0, 8).map(function (k) { return { id: 'q:' + k.row, text: (k.samples[0] || k.answer).slice(0, 60) }; }).concat([{ id: 'h', text: 'با پذیرش حرف بزنم' }]) };
  }
  if (act === 'q') { var k = asKb_().filter(function (x) { return String(x.row) === String(a[1]); })[0]; return k ? asAnswerOut_(ctx, k, AS_MODES.menu) : asAsk_(ctx, ''); }
  if (act === 'y' || act === 'n') { asRate_(a[1], act === 'y'); return { answer: 'ممنون از بازخوردت.', topic: '', handoff: false, buttons: [] }; }
  if (act === 'x' || act === 'h') {
    if (act === 'x') { asRate_(a[1], false); if (lastText) asUnanswered_(ctx.channel, lastText, [ctx.name]); }
    asHandoff_(ctx, lastText || '', act === 'x' ? 'جوابم را نگرفتم' : 'خواست با پذیرش حرف بزند');
    asLog_(ctx.channel, '', asMode_(), 'تحویل', ctx);
    return { answer: AS_HANDED, topic: '', handoff: true, buttons: ctx.channel === 'bot' ? [] : [{ url: AS_BOT_LINK, text: 'ادامه در تلگرام' }] };
  }
  return asAsk_(ctx, '');
}

/* ───── ابزارها (v170.23.16، بی هوش مصنوعی؛ ASSISTANT.md بند ۷) ─────
   هر ابزار یک سطر: id، الگوی تشخیص روی متن یکسان‌شده، تابع (ctx، متن) ← خروجی همان شکل asAsk_ یا null، و کانال‌های مجاز.
   کانال نامجاز: ابزار با deny همان کانال جواب می‌دهد (مثلاً «در بات ادامه بده»). افزودن ابزار تازه یعنی یک سطر. */
var AS_SITE = 'https://tajrobeh.life';
var AS_ALL_CH = ['bot', 'site', 'web', 'instagram', 'v2'];
var AS_TOOLS = [
  { id: 'events', re: /رویداد|کارگاه|وبینار|ایونت|دورهمی|برنامه(?:های)? پیش ?رو|جلسه(?:ی)? عمومی/, fn: asToolEvents_, ch: AS_ALL_CH },
  { id: 'mag', re: /مجله|مقاله|مطلبی? (?:درباره|دربارهٔ|در مورد)|چیزی بخونم|چیزی بخوانم/, fn: asToolMag_, ch: AS_ALL_CH },
  { id: 'status', re: /وضعیت (?:درخواست|پرونده)م|وضعیتم|وضعیت من|درخواستم چی شد|درخواستم کجاست|کی (?:با من |باهام )?تماس میگیر|پیگیری درخواست/, fn: asToolStatus_, ch: ['bot'], deny: asToolStatusWeb_ }
];
function asToolsOn_() { return String(cfg_('ASSIST_TOOLS', '') || '').trim() === 'بله'; }
/** ابزار مناسب متن یا null */
function asToolFor_(ctx, text) {
  if (!asToolsOn_()) return null;
  var n = asNorm_(text);
  for (var i = 0; i < AS_TOOLS.length; i++) {
    var t = AS_TOOLS[i]; if (!t.re.test(n) && !t.re.test(String(text))) continue;
    var allowed = t.ch.indexOf(ctx.channel || 'web') > -1, f = allowed ? t.fn : t.deny;
    if (typeof f !== 'function') continue;
    var out = null;
    try { out = f(ctx, text); } catch (e) { tgErr_('asTool ' + t.id, e); }
    if (out) { out.tool = t.id; out.log = asLog_(ctx.channel, 'ابزار ' + t.id, asMode_(), out.handoff ? 'تحویل' : 'ابزار', ctx); return out; }
  }
  return null;
}
function asToday_() { return Utilities.formatDate(new Date(asNow_()), TG_TZ, 'yyyy-MM-dd'); }
/* رویدادهای پیش‌رو: از همان دادهٔ tgApiEvents162_، سه مورد نزدیک با لینک صفحهٔ رویدادها */
function asToolEvents_(ctx) {
  var r = asDry_() && TG_MEM['as:events'] ? { ok: true, events: TG_MEM['as:events'] } : tgApiEvents162_({});
  var today = asToday_();
  var L = ((r && r.events) || []).filter(function (e) { return e.dateIso && e.dateIso >= today; }).sort(function (a, b) { return a.dateIso < b.dateIso ? -1 : a.dateIso > b.dateIso ? 1 : 0; }).slice(0, 3);
  if (!L.length) return { answer: 'فعلاً رویداد تازه‌ای در برنامه نیست. صفحهٔ رویدادها را ببین.', topic: 'رویدادها', handoff: false, buttons: [{ url: AS_SITE + '/school/events/', text: 'صفحهٔ رویدادها' }] };
  return { answer: 'رویدادهای پیش‌رو:\n' + L.map(function (e) { return '• ' + e.title + (e.date ? ' · ' + e.date : '') + (e.time ? ' · ساعت ' + e.time : ''); }).join('\n'),
    topic: 'رویدادها', handoff: false, buttons: L.map(function (e) { return { url: AS_SITE + '/school/events/#ev=' + encodeURIComponent(e.code), text: String(e.title).slice(0, 40) }; }) };
}
/* مجله: جست‌وجوی عنوان با REST خود سایت (پرسش پاک‌شده)، سه نتیجه، کش ۶ ساعته */
var AS_MAG_DROP = /مجله|مقاله(?:ای)?|مطلبی?|نوشته|درباره|دربارهٔ|در مورد|چیزی|بخونم|بخوانم|دارید|هست|می ?خوام|میخواهم|برام|بفرست/g;
function asMagQuery_(text) { return asNorm_(asScrub_(text).replace(/\[(?:نام|عدد)\]/g, ' ')).replace(/[؟،؛!?.,]/g, ' ').replace(AS_MAG_DROP, ' ').split(' ').filter(function (w) { return w.length >= 2 && !(AS_STOP_SET || (asTokens_(''), AS_STOP_SET))[w]; }).join(' ').slice(0, 60); }
function asMagSearch_(q) {
  if (asDry_()) { var f = TG_MEM['as:mag']; (TG_MEM['as:magq'] = TG_MEM['as:magq'] || []).push(q); return typeof f === 'function' ? f(q) : (f || []); }
  var c = CacheService.getScriptCache(), key = 'asmag:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, q)).slice(0, 22);
  var hit = c.get(key); if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var res = UrlFetchApp.fetch(AS_SITE + '/wp-json/wp/v2/posts?search=' + encodeURIComponent(q) + '&per_page=3&_fields=title,link', { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return [];
  var L = (JSON.parse(res.getContentText()) || []).map(function (p) { return { title: String((p.title && p.title.rendered) || '').replace(/<[^>]+>/g, '').replace(/&#8204;/g, '‌').replace(/&[a-z#0-9]+;/gi, ' ').trim(), link: String(p.link || '') }; })
    .filter(function (p) { return p.title && p.link.indexOf(AS_SITE + '/') === 0; }).slice(0, 3);
  try { c.put(key, JSON.stringify(L), 21600); } catch (e2) {}
  return L;
}
function asToolMag_(ctx, text) {
  var q = asMagQuery_(text);
  var L = q.length >= 2 ? asMagSearch_(q) : [];
  if (!L.length) return { answer: 'مطلبی با این عنوان در مجله پیدا نکردم. فهرست مجله را ببین.', topic: 'مجله', handoff: false, buttons: [{ url: AS_SITE + '/mag/', text: 'مجلهٔ تجربه' }] };
  return { answer: 'از مجلهٔ تجربه:\n' + L.map(function (p) { return '• ' + p.title; }).join('\n'), topic: 'مجله', handoff: false,
    buttons: L.map(function (p) { return { url: p.link, text: p.title.slice(0, 40) }; }) };
}
/* وضعیت من: فقط بات و فقط chat ثبت‌شده روی لید (tgFindLead_). فقط مرحله و قدم بعد؛ بی نام درمانگر، بی شماره */
var AS_ST_NEXT = {
  first: 'همکارم در پذیرش به‌زودی برای هماهنگی با تو تماس می‌گیرد.',
  booked: 'وقت معارفه‌ات ثبت شده؛ یادآوری پیش از جلسه همین‌جا می‌آید.',
  live: 'درخواستت در پیگیری پذیرش است.',
  stale: 'درخواستت در صف پیگیری پذیرش است؛ اگر عجله داری «با پذیرش حرف بزنم» را بزن.',
  closed: 'این درخواست بسته شده است. اگر دوباره کمک می‌خواهی «با پذیرش حرف بزنم» را بزن.'
};
function asFindLead_(chat) {
  if (asDry_()) return TG_DRY_LEAD && String(TG_DRY_LEAD.chatId || '') === String(chat) ? TG_DRY_LEAD.row : -1;
  return tgFindLead_(chat);
}
function asToolStatus_(ctx) {
  var row = ctx.chat ? asFindLead_(ctx.chat) : -1, l = row > 1 ? tgLeadRead_(row) : null;
  if (!l) return { answer: 'درخواستی به نام این حساب تلگرام پیدا نکردم. اگر فرم را جای دیگری پر کرده‌ای، با پذیرش حرف بزن.', topic: 'وضعیت من', handoff: false, buttons: [{ id: 'h', text: 'با پذیرش حرف بزنم' }] };
  var k = l.closed ? 'closed' : l.booked ? 'booked' : (l.stage || 'first');
  var lines = ['وضعیت درخواست ' + (l.code || '') + ': ' + (l.status || 'در پیگیری')];
  if (k === 'booked' && l.meetDate) lines.push('تاریخ معارفه: ' + tgFa_(l.meetDate));
  lines.push('قدم بعد: ' + (AS_ST_NEXT[k] || AS_ST_NEXT.live));
  return { answer: lines.join('\n'), topic: 'وضعیت من', handoff: false, buttons: [{ id: 'h', text: 'با پذیرش حرف بزنم' }] };
}
function asToolStatusWeb_() {
  return { answer: 'برای دیدن وضعیت درخواستت، در بات تجربه ادامه بده.', topic: 'وضعیت من', handoff: false, buttons: [{ url: AS_BOT_LINK, text: 'ادامه در تلگرام' }] };
}

/* ───── حالت هوشمند (فقط با ASSIST_GEMINI_PAID = بله) ───── */
var AS_SMART_SCHEMA = { type: 'OBJECT', properties: { i: { type: 'INTEGER' }, conf: { type: 'NUMBER' }, crisis: { type: 'BOOLEAN' } }, required: ['i', 'conf', 'crisis'] };
function asSmart_(ctx, text, kb) {
  if (!asPaid_()) return null;   /* هرگز بی Billing */
  var clean = asScrub_(text, [ctx.name]);
  var list = kb.map(function (k, i) { return i + ') موضوع: ' + k.topic + ' · پرسش‌ها: ' + k.samples.join(' | '); }).join('\n');
  var prompt = 'فقط یکی از ردیف‌های زیر را برای پرسش کاربر انتخاب کن؛ اگر هیچ‌کدام دقیق جواب نمی‌دهد i = -1. ' +
    'اگر پرسش نشانهٔ خطر یا آسیب به خود یا دیگری دارد crisis = true. مشاورهٔ بالینی، تشخیص یا دارو نده.\n\nردیف‌ها:\n' + list + '\n\nپرسش: ' + clean;
  try {
    var o = asGem_('دستیار', prompt, AS_SMART_SCHEMA);
    if (o.crisis) return { crisis: true };
    if (o.i >= 0 && o.i < kb.length && Number(o.conf) >= 0.7) return { k: kb[o.i] };
  } catch (e) { tgErr_('asSmart_', e); }
  return null;
}
/** فراخوانی جمنای با ثبت توکن در «هزینهٔ جمنای». فقط برای پیش‌نویس دانش (بی دادهٔ کاربر) یا حالت هوشمند. */
function asGem_(job, prompt, schema) {
  if (asDry_()) { var f = TG_MEM['as:gem']; if (f === undefined) throw new Error('dry'); (TG_MEM['as:gemcalls'] = TG_MEM['as:gemcalls'] || []).push({ job: job, prompt: prompt }); return JSON.parse(JSON.stringify(f)); }
  var models = typeof AI_MODELS !== 'undefined' ? AI_MODELS : ['gemini-flash-latest'], last = '';
  for (var i = 0; i < models.length; i++) {
    var res = gemFetch_('models/' + models[i] + ':generateContent', { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema } });
    if (res.code === 200) {
      var u = res.body.usageMetadata || {};
      try { asTab_(AS_COST_TAB, AS_COST_HEAD).add({ 'زمان': asFmt_(), 'کار': job, 'مدل': models[i], 'توکن ورودی': u.promptTokenCount || 0, 'توکن خروجی': u.candidatesTokenCount || 0 }); } catch (e) {}
      var t = ((((res.body.candidates || [])[0] || {}).content || {}).parts || []).map(function (p) { return p.text || ''; }).join('');
      try { return JSON.parse(t); } catch (e2) { last = 'JSON'; continue; }
    }
    last = String(res.code);
  }
  throw new Error('جمنای ناموفق: ' + last);
}

/* ───── بات ───── */
function asKb2_(out) {
  var rows = [], cur = [];
  (out.buttons || []).forEach(function (b) {
    var btn = b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: 'as:' + b.id };
    if (b.id && /^[yn]:/.test(b.id)) { cur.push(btn); return; }
    rows.push([btn]);
  });
  if (cur.length) rows.push(cur);
  return rows.length ? { inline_keyboard: rows } : null;
}
function asBotSend_(chat, out) { return tgSend_(chat, tgEsc_(out.answer), asKb2_(out)); }
function asCtxBot_(chat, name) { return { channel: 'bot', chat: String(chat), name: name || '' }; }
function asWelcome_(chat) { tgSetVal_('asq', chat, '1'); return asBotSend_(chat, asAsk_(asCtxBot_(chat), '')); }
/** مسیر بات؛ true یعنی مصرف شد */
function asRoute_(chat, m) {
  if (!asOn_() || !m) return false;
  var t = String(m.text || '').trim(), name = [m.from && m.from.first_name, m.from && m.from.last_name].filter(String).join(' ');
  if (t === AS_BTN || t === '/ask' || /^\/start(@\w+)?\s+(pz-assist|ask)$/.test(t)) { asWelcome_(chat); return true; }
  if (tgGetVal_('asr', chat) && t) return asReviewText_(chat, t);
  if (t === '/askreview') { asReviewNext_(chat); return true; }
  if (!tgGetVal_('asq', chat) || !t || t.indexOf('/') === 0 || (typeof tgIsBtnLike_ === 'function' && tgIsBtnLike_(t)) || (typeof tgLooksLikePhone_ === 'function' && tgLooksLikePhone_(t))) return false;
  if (tgIsCrisis_(t) && typeof tgOnCrisis_ === 'function') { tgDel_('asq', chat); asUrgent_(asCtxBot_(chat, name)); asLog_('bot', 'بحران', asMode_(), 'بحران', asCtxBot_(chat, name)); tgOnCrisis_(chat, name, m.from && m.from.username ? '@' + m.from.username : '', t); return true; }
  tgSetVal_('aslast', chat, t.slice(0, 500));
  asBotSend_(chat, asAsk_(asCtxBot_(chat, name), t));
  return true;
}
/** متن آزادی که هیچ جریان دیگری نگرفت (پیش از T_FALLBACK) */
function asFallback_(chat, text, name) {
  if (!asOn_()) return false;
  tgSetVal_('asq', chat, '1'); tgSetVal_('aslast', chat, String(text || '').slice(0, 500));
  asBotSend_(chat, asAsk_(asCtxBot_(chat, name), text));
  return true;
}
function asCb_(chat, data, name) {
  var id = String(data).replace(/^as:/, '');
  if (/^(ok|ed|es|no|nx):/.test(id) || id === 'rv') return asReviewCb_(chat, id);
  var out = asTap_(asCtxBot_(chat, name), id, tgGetVal_('aslast', chat));
  if (out.handoff) tgDel_('asq', chat);
  return asBotSend_(chat, out);
}

/* ───── رابط وب واحد (سایت، ویجت، نسخهٔ ۲) ───── */
function asJson_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function asWeb_(e, raw, body) {
  var v = typeof ssVerify_ === 'function' ? ssVerify_(e, raw) : 'nokey';
  if (v !== 'ok') return asJson_({ ok: false, error: 'sig' });
  if (!asOn_()) return asJson_({ ok: false, error: 'off' });
  var sid = String(body.session_id || '').replace(/[^\w-]/g, '').slice(0, 64);
  if (!sid) return asJson_({ ok: false, error: 'session' });
  var max = Number(cfg_('ASSIST_RATE', '')) || 20;
  if (!pbRate_('as:' + sid, max)) return asJson_({ ok: false, error: 'rate' });
  var ctx = { channel: String(body.channel || 'web').replace(/[^\w-]/g, '').slice(0, 20) || 'web', session: sid, country: String(body.country || '').slice(0, 2), audience: String(body.audience || '').slice(0, 30), t0: Date.now() };
  var out = body.tap ? asTap_(ctx, String(body.tap), String(body.text || '')) : asAsk_(ctx, String(body.text || '').slice(0, 500));
  return asJson_({ ok: true, answer: out.answer, topic: out.topic || '', handoff: !!out.handoff, buttons: out.buttons || [] });
}

/* ───── بازبینی دانش در بات ─────
   ASSIST_KB_TEAMS خاموش (پیش‌فرض): فقط پذیرش و مالک، همهٔ صف (رفتار v170.23.11).
   روشن (v170.23.15): هر بازبین فقط ردیف‌های «تیم تأیید» خودش؛ تیم از نقش میز پذیرش یا تب افراد (AS_TEAMS)؛ مالک همه را می‌بیند.
   ردیف بی «تیم تأیید» مال پذیرش است. «تأیید» خالی یا «خیر» یعنی در صف؛ «بله» و «کنار» بیرون از صف. */
function asTeamsOn_() { return String(cfg_('ASSIST_KB_TEAMS', '') || '').trim() === 'بله'; }
function asIsOwner_(chat) { return !!(TG_OWNER_CHAT && String(chat) === String(TG_OWNER_CHAT)); }
/** تیم‌های یک chat؛ ['*'] برای مالک */
function asReviewTeams_(chat) {
  if (asIsOwner_(chat)) return ['*'];
  var out = [], r = null;
  try { r = tgRolesOf_(chat, ''); } catch (e) {}
  var desk = null; try { desk = tgWhoDesk_(chat, ''); } catch (e2) {}
  if (desk) out.push('پذیرش');
  if (!asTeamsOn_()) return out;
  var roles = ((r && r.roles) || []).concat(desk && desk.role ? [String(desk.role)] : []).join(' ');
  Object.keys(AS_TEAMS).forEach(function (t) { if (out.indexOf(t) < 0 && AS_TEAMS[t].test(roles)) out.push(t); });
  return out;
}
function asRowTeams_(o) { var t = String(o['تیم تأیید'] || '').trim(); return t ? t.split(/\s*(?:،|,| و )\s*/).filter(String) : ['پذیرش']; }
function asRowFor_(o, teams) { if (!teams.length) return false; if (teams.indexOf('*') > -1 || !asTeamsOn_()) return true; return asRowTeams_(o).some(function (t) { return teams.indexOf(t) > -1; }); }
function asInQueue_(o) { var s = String(o['تأیید'] || '').trim(); return s !== 'بله' && s !== 'کنار'; }
function asIsStaff_(chat) { return asReviewTeams_(chat).length > 0; }
function asStaffName_(chat) {
  try { var d = tgWhoDesk_(chat, ''); if (d && d.name) return d.name; } catch (e) {}
  try { var r = tgRolesOf_(chat, ''); if (r && r.name) return r.name; } catch (e2) {}
  return asIsOwner_(chat) ? 'مالک' : 'نامعلوم';
}
var AS_NOT_STAFF = 'این بخش مخصوص پذیرش، تیم‌های تأیید و مالک است.';
function asReviewNext_(chat, after) {
  var teams = asReviewTeams_(chat);
  if (!teams.length) return tgSend_(chat, AS_NOT_STAFF);
  var rows = asTab_(AS_KB_TAB, AS_KB_HEAD).rows.filter(function (o) { return asInQueue_(o) && asRowFor_(o, teams) && (!after || o._row > after); });
  if (!rows.length) return tgSend_(chat, '✅ ردیفی در صف بازبینی شما نیست.');
  var o = rows[0], r = o._row, bad = AS_DENY.test(o['موضوع'] + ' ' + o['پاسخ']);
  var T = ['📚 <b>دانش دستیار</b> · ردیف ' + tgFa_(r) + ' (' + tgFa_(rows.length) + ' مانده)' + (o['نسخه'] ? ' · نسخهٔ ' + tgFa_(o['نسخه']) : ''),
    (o['حوزه'] || o['مخاطب'] || o['تیم تأیید']) ? '<i>' + [o['حوزه'], o['مخاطب'], o['تیم تأیید'] ? 'تیم ' + o['تیم تأیید'] : ''].filter(String).map(tgEsc_).join(' · ') + '</i>' : '',
    '', '<b>موضوع:</b> ' + tgEsc_(o['موضوع'] || ''),
    '<b>پرسش‌های نمونه:</b>\n' + tgEsc_(o['پرسش‌های نمونه'] || ''), '', '<b>پاسخ:</b>\n' + tgEsc_(o['پاسخ'] || '')];
  if (o['یادداشت بازبینی']) T.push('', '📝 ' + tgEsc_(o['یادداشت بازبینی']));
  if (bad) T.push('', '⚠️ این پاسخ دربارهٔ درصد، تسویه یا قرارداد است و دستیار هرگز آن را نمی‌گوید. اصلاح یا کنار بگذار.');
  var kb = [[{ text: '✅ تأیید', callback_data: 'as:ok:' + r }, { text: '✏️ اصلاح پاسخ', callback_data: 'as:ed:' + r }],
    [{ text: '✏️ پرسش‌های نمونه', callback_data: 'as:es:' + r }, { text: '🚫 کنار بگذار', callback_data: 'as:no:' + r }], [{ text: '⏭ بعدی', callback_data: 'as:nx:' + r }]];
  if (bad) kb[0].shift();
  return tgSend_(chat, T.filter(function (x, i) { return x !== '' || i !== 1; }).join('\n'), { inline_keyboard: kb });
}
function asReviewCb_(chat, id) {
  var teams = asReviewTeams_(chat);
  if (!teams.length) return tgSend_(chat, AS_NOT_STAFF);
  var a = id.split(':'), act = a[0], r = Number(a[1]);
  if (act === 'rv') return asReviewNext_(chat);
  var t = asTab_(AS_KB_TAB, AS_KB_HEAD), o = t.rows.filter(function (x) { return x._row === r; })[0];
  if (!o) return asReviewNext_(chat);
  if (!asRowFor_(o, teams)) return tgSend_(chat, 'این ردیف مال تیم دیگری است (' + tgEsc_(asRowTeams_(o).join('، ')) + ').');
  if (act === 'ok') {
    if (AS_DENY.test(o['موضوع'] + ' ' + o['پاسخ'])) return tgSend_(chat, 'این ردیف تأیید نمی‌شود؛ اول اصلاحش کن.');
    t.set(r, 'تأیید', 'بله'); t.set(r, 'تاریخ تأیید', asFmt_()); t.set(r, 'تأییدکننده', asStaffName_(chat)); t.set(r, 'تاریخ بازبینی', asFmt_());
    if (!o['نسخه']) t.set(r, 'نسخه', 1);
    return asReviewNext_(chat, r);
  }
  if (act === 'no') { t.set(r, 'تأیید', 'کنار'); t.set(r, 'تأییدکننده', asStaffName_(chat)); t.set(r, 'تاریخ بازبینی', asFmt_()); return asReviewNext_(chat, r); }
  if (act === 'nx') return asReviewNext_(chat, r);
  tgSetVal_('asr', chat, (act === 'ed' ? 'پاسخ' : 'پرسش‌های نمونه') + '|' + r);
  return tgSend_(chat, act === 'ed' ? 'متن تازهٔ پاسخ را بفرست.' : 'پرسش‌های نمونه را بفرست، هر کدام در یک خط.');
}
/** نسخهٔ بعدی ردیف: عدد ستون «نسخه» + ۱ (خالی = ۱، پس اولین اصلاح ۲) */
function asNextVer_(o) { var n = Number(tgLatinDigits_(String(o['نسخه'] || ''))); return (n > 0 ? n : 1) + 1; }
function asReviewText_(chat, text) {
  var st = String(tgGetVal_('asr', chat) || '').split('|'); tgDel_('asr', chat);
  if (text === 'انصراف' || text.indexOf('/') === 0) { tgSend_(chat, 'لغو شد.'); return true; }
  var teams = asReviewTeams_(chat), t = asTab_(AS_KB_TAB, AS_KB_HEAD), r = Number(st[1]), o = t.rows.filter(function (x) { return x._row === r; })[0];
  if (!o || !asRowFor_(o, teams)) { tgSend_(chat, AS_NOT_STAFF); return true; }
  /* v170.23.15: هر اصلاح نسخه را بالا می‌برد و «تأیید» را خالی می‌کند (دوباره در صف) */
  t.set(r, st[0], text.slice(0, 2000));
  t.set(r, 'نسخه', asNextVer_(o));
  t.set(r, 'تأیید', '');
  t.set(r, 'تاریخ بازبینی', asFmt_());
  tgSend_(chat, '✅ ثبت شد (نسخهٔ ' + tgFa_(asNextVer_(o)) + '). حالا ردیف را دوباره ببین و تأیید کن.');
  asReviewNext_(chat, r - 1);
  return true;
}

/* ───── پیش‌نویس دانش از «سؤالات متداول» (جمنای رایگان؛ بی دادهٔ کاربر) ───── */
var AS_DRAFT_SCHEMA = { type: 'ARRAY', items: { type: 'OBJECT', properties: { i: { type: 'INTEGER' }, topic: { type: 'STRING' }, samples: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['i', 'topic', 'samples'] } };
var AS_TOPIC_HINT = ['خدمات', 'شروع درمان', 'معارفه', 'قیمت', 'رزرو و جابه‌جایی', 'پرداخت', 'حریم خصوصی', 'تماس با پذیرش'];
function asDraft_() {
  var faq = typeof tgFaq_ === 'function' ? tgFaq_() : [];
  if (asDry_() && TG_MEM['as:faq']) faq = TG_MEM['as:faq'];
  var t = asTab_(AS_KB_TAB, AS_KB_HEAD), have = {};
  t.rows.forEach(function (o) { have[String(o['منبع'] || '')] = 1; });
  var todo = faq.filter(function (f) { return !have['سؤالات متداول · ردیف ' + f.row] && !AS_DENY.test(f.q + ' ' + f.a); });
  if (!todo.length) return { made: 0, gem: '' };
  var meta = {}, gem = 'جمنای';
  try {
    var prompt = 'برای هر پرسش متداول یک «موضوع» کوتاه از این فهرست (' + AS_TOPIC_HINT.join('، ') + ') و ۴ تا ۶ شکل دیگر از همان پرسش، به فارسی محاوره‌ای و رسمی، بنویس. ' +
      'پاسخ‌ها را عوض نکن و چیزی اضافه نکن.\n\n' + todo.map(function (f, i) { return i + ') ' + f.q; }).join('\n');
    (asGem_('پیش‌نویس دانش دستیار', prompt, AS_DRAFT_SCHEMA) || []).forEach(function (x) { if (x && todo[x.i]) meta[x.i] = x; });
  } catch (e) { gem = 'بی جمنای (' + String(e.message || e).slice(0, 40) + ')'; }
  todo.forEach(function (f, i) {
    var m = meta[i] || {}, s = [f.q].concat((m.samples || []).filter(function (x) { return x && x !== f.q; })).slice(0, 7);
    t.add({ 'موضوع': m.topic || 'عمومی', 'پرسش‌های نمونه': s.join('\n'), 'پاسخ': f.a, 'منبع': 'سؤالات متداول · ردیف ' + f.row, 'تأیید': 'خیر', 'تاریخ تأیید': '', 'تأییدکننده': '' });
  });
  return { made: todo.length, gem: gem };
}
function asDraftCard_(n) {
  var text = '📚 ' + tgFa_(n) + ' ردیف پیش‌نویس در «' + AS_KB_TAB + '» منتظر تأیید است. دستیار فقط از ردیف‌های تأییدشده جواب می‌دهد.';
  try {
    if (typeof inbAdd_ === 'function') { inbAdd_('as', 'AS-KB', { text: text + ' (/askreview)', q: 'پذیرش', type: 'دانش دستیار', more: true }); return 'صندوق یکتا'; }
    var desk = asDeskChats_();
    desk.forEach(function (c) { tgNotify_(c, TG_NK.task, text, { ref: 'AS-KB', markup: { inline_keyboard: [[{ text: '📚 بررسی یکی‌یکی', callback_data: 'as:rv' }]] } }); });
    return 'میز پذیرش (' + desk.length + ')';
  } catch (e) { tgErr_('asDraftCard_', e); return 'خطا'; }
}
/* یک‌بارهٔ خودکار v170.23.11: برگه‌ها، پیش‌نویس دانش و کارت تأیید. فقط شمار، بی متن. */
function tgV1702311Assist() {
  [[AS_KB_TAB, AS_KB_HEAD], [AS_LOG_TAB, AS_LOG_HEAD], [AS_UN_TAB, AS_UN_HEAD], [AS_COST_TAB, AS_COST_HEAD]].forEach(function (x) { try { asTab_(x[0], x[1]); } catch (e) {} });
  var d = asDraft_(), where = d.made ? asDraftCard_(d.made) : '';
  return 'دستیار: برگه‌ها آماده · پیش‌نویس دانش ' + d.made + ' ردیف (' + (d.gem || '-') + ')' + (where ? ' · کارت: ' + where : '') + ' · ' + (asOn_() ? 'روشن' : 'خاموش (ASSIST_ENABLED)') + ' · حالت ' + asMode_();
}

/* ───── گزارش شبانه ───── */
function asNightLine_() {
  try { asPurge_(); } catch (e) {}
  var day = Utilities.formatDate(new Date(asNow_()), TG_TZ, 'yyyy-MM-dd');
  var L = asTab_(AS_LOG_TAB, AS_LOG_HEAD).rows.filter(function (o) { return String(o['زمان'] || '').slice(0, 10) === day; });
  if (!L.length) return '';
  var free = L.filter(function (o) { return o['حالت'] === AS_MODES.search || o['حالت'] === AS_MODES.smart; });
  var hit = free.filter(function (o) { return o['نتیجه'] === 'پاسخ'; }).length;
  var hand = L.filter(function (o) { return o['نتیجه'] === 'تحویل'; }).length, cr = L.filter(function (o) { return o['نتیجه'] === 'بحران'; }).length;
  var up = L.filter(function (o) { return o['رضایت'] === '👍'; }).length, dn = L.filter(function (o) { return o['رضایت'] === '👎'; }).length;
  /* v170.23.15: به تفکیک کانال و مخاطب (پرسش و درصد جواب)، و میانهٔ زمان پاسخ */
  var split = function (key) {
    var g = {}; L.forEach(function (o) { var k = String(o[key] || '').trim() || 'نامعلوم'; var x = g[k] = g[k] || { n: 0, f: 0, h: 0 }; x.n++;
      if (o['حالت'] === AS_MODES.search || o['حالت'] === AS_MODES.smart) { x.f++; if (o['نتیجه'] === 'پاسخ') x.h++; } });
    return Object.keys(g).sort(function (a, b) { return g[b].n - g[a].n; }).map(function (k) { return asChanFa_(k) + ' ' + tgFa_(g[k].n) + (g[k].f ? ' (' + tgFa_(Math.round(100 * g[k].h / g[k].f)) + '٪)' : ''); }).join('، ');
  };
  var ms = L.map(function (o) { return Number(o['میلی‌ثانیه']); }).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
  var med = ms.length ? ms[Math.floor(ms.length / 2)] : null;
  return '🤖 دستیار: ' + tgFa_(L.length) + ' پرسش · ' + (free.length ? tgFa_(Math.round(100 * hit / free.length)) + '٪ با جست‌وجو جواب گرفت' : 'بی متن آزاد') +
    ' · ' + tgFa_(hand) + ' تحویل پذیرش' + (cr ? ' · ' + tgFa_(cr) + ' بحران' : '') + ' · 👍 ' + tgFa_(up) + ' 👎 ' + tgFa_(dn) + ' · آستانه ' + tgFa_(asMin_()) +
    '\n   کانال: ' + split('کانال') + ' · مخاطب: ' + split('مخاطب') + (med != null ? ' · میانهٔ زمان پاسخ ' + tgFa_(med) + ' میلی‌ثانیه' : '');
}
function asChanFa_(k) { return { bot: 'تلگرام', site: 'سایت', web: 'وب', instagram: 'اینستاگرام', v2: 'نسخهٔ ۲' }[k] || k; }
try { TG_NIGHT_LINES.push(asNightLine_); } catch (eNl) {}

/* ───── آزمون ───── */
function asTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT };
  var stub = { ver: ssVerify_, names: asKnownNames_, crisisBot: typeof tgOnCrisis_ === 'function' ? tgOnCrisis_ : null };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'as:now': new Date('2026-10-07T12:00:00+03:30').getTime(), 'as:desk': ['801'] };
  TG_CFG_ = { ASSIST_ENABLED: 'بله' }; TG_OWNER_CHAT = '9001';
  try {
    asKnownNames_ = function () { return ['درمانگر نمونه‌زاده']; };
    TG_MEM['as:' + AS_KB_TAB] = [
      { 'موضوع': 'قیمت', 'پرسش‌های نمونه': 'هزینهٔ جلسه چقدر است\nقیمت جلسه درمان\nتعرفه مشاوره', 'پاسخ': 'پاسخ تأییدشدهٔ قیمت', 'تأیید': 'بله' },
      { 'موضوع': 'معارفه', 'پرسش‌های نمونه': 'جلسهٔ معارفه چیست\nمعارفه رایگان است', 'پاسخ': 'پاسخ تأییدشدهٔ معارفه', 'تأیید': 'بله' },
      { 'موضوع': 'رزرو و جابه‌جایی', 'پرسش‌های نمونه': 'چطور وقتم را عوض کنم\nلغو جلسه', 'پاسخ': 'پاسخ تأییدشدهٔ جابه‌جایی', 'تأیید': 'بله' },
      { 'موضوع': 'پرداخت', 'پرسش‌های نمونه': 'پرداخت با کارت خارجی', 'پاسخ': 'پاسخ تأییدنشده', 'تأیید': 'خیر' },
      { 'موضوع': 'تسویه', 'پرسش‌های نمونه': 'سهم درمانگر چند درصد است', 'پاسخ': 'سهم درمانگر ۵۰ درصد', 'تأیید': 'بله' }
    ];
    ok('یکسان‌سازی: ی و ک عربی، نیم‌فاصله و رقم', asNorm_('مي‌خواهم كلاس ۱۲٣') === 'میخواهم کلاس 123');
    ok('واژهٔ پرتکرار حذف و ریشه', asTokens_('من می‌خواهم هزینه‌ها را بدانم').join(',') === 'هزینه,بدانم', asTokens_('من می‌خواهم هزینه‌ها را بدانم').join(','));
    var kb = asKb_();
    ok('فقط ردیف تأییدشده، بی موضوع ممنوع', kb.length === 3 && kb.every(function (k) { return k.answer.indexOf('تأییدنشده') < 0 && k.topic !== 'تسویه'; }));
    TG_MEM['as:gemcalls'] = [];
    var r1 = asAsk_({ channel: 'bot', chat: '501', name: 'مراجع نمونه' }, 'قیمت جلسه‌ی درمان چنده؟');
    ok('جست‌وجو: جواب تأییدشده با «جوابم را نگرفتم»', r1.answer === 'پاسخ تأییدشدهٔ قیمت' && r1.buttons.some(function (b) { return b.text === 'جوابم را نگرفتم'; }), JSON.stringify(r1).slice(0, 200));
    var r2 = asAsk_({ channel: 'bot', chat: '501' }, 'آب و هوای فردا');
    ok('زیر آستانه: سه موضوع و «با پذیرش حرف بزنم»', !r2.handoff && r2.buttons.length === 4 && r2.buttons[3].text === 'با پذیرش حرف بزنم');
    ok('سؤال بی‌پاسخ ثبت شد', (TG_MEM['as:' + AS_UN_TAB] || []).length === 1);
    ok('پرسش پرداخت تأییدنشده جواب نمی‌گیرد', asAsk_({ channel: 'bot' }, 'پرداخت با کارت خارجی').answer.indexOf('تأییدنشده') < 0);
    ok('هیچ متنی به جمنای نرفت (جستجو)', TG_MEM['as:gemcalls'].length === 0);
    /* بحران همیشه اول، حتی با تطبیق */
    TG_MEM['notify'] = [];
    var r3 = asAsk_({ channel: 'web', session: 's1' }, 'قیمت جلسه چقدر است، می‌خواهم خودکشی کنم');
    ok('بحران پیش از تطبیق: شمارهٔ اورژانس و کارت فوری', r3.crisis && /۱۲۳/.test(r3.answer) && (TG_MEM['notify'] || []).some(function (x) { return x.chat === '801' && x.kind === TG_NK.urgent; }));
    TG_CFG_.ASSIST_EMERGENCY = '{"DE":"Notruf 112"}';
    ok('اورژانس کشور کاربر', asAsk_({ channel: 'web', session: 's1', country: 'de' }, 'می‌خواهم خودکشی کنم').answer === 'Notruf 112');
    delete TG_CFG_.ASSIST_EMERGENCY;
    /* منو: متن آزاد مستقیم به پذیرش */
    TG_CFG_.ASSIST_MODE = 'منو'; TG_MEM['as:handoff'] = [];
    var r4 = asAsk_({ channel: 'bot', chat: '502', name: 'مراجع نمونه' }, 'قیمت جلسه چقدر است؟ شماره‌ام 0912' + '3456789');   // pii:ok ساختگی
    ok('منو: تحویل به پذیرش با متن بی‌شناسه', r4.handoff && r4.answer === AS_HANDED && TG_MEM['as:handoff'].length === 1 && !/\d{5}/.test(TG_MEM['as:handoff'][0]), TG_MEM['as:handoff'][0]);
    /* هوشمند بی Billing: هرگز */
    TG_CFG_.ASSIST_MODE = 'هوشمند'; TG_CFG_.ASSIST_GEMINI_PAID = 'خیر';
    ok('هوشمند بی ASSIST_GEMINI_PAID به جستجو برمی‌گردد', asMode_() === AS_MODES.search && asAsk_({ channel: 'bot' }, 'تعرفه مشاوره').answer === 'پاسخ تأییدشدهٔ قیمت' && TG_MEM['as:gemcalls'].length === 0);
    /* هوشمند با Billing: فقط انتخاب ردیف، متن بی‌شناسه */
    TG_CFG_.ASSIST_GEMINI_PAID = 'بله'; TG_MEM['as:gem'] = { i: 1, conf: 0.9, crisis: false };
    var r5 = asAsk_({ channel: 'bot', name: 'مراجع نمونه' }, 'درمانگر نمونه‌زاده گفت معارفه چطوری است؟ a@b.co');
    var sent = (TG_MEM['as:gemcalls'][0] || {}).prompt || '';
    ok('هوشمند (فقط با Billing): پاسخ تأییدشده و متن بی‌شناسه', r5.answer === 'پاسخ تأییدشدهٔ معارفه' && sent.indexOf('نمونه‌زاده') < 0 && sent.indexOf('a@b.co') < 0, sent.slice(-120));
    TG_MEM['as:gem'] = { i: 0, conf: 0.4, crisis: false };
    ok('هوشمند با اطمینان کم ← جستجو', asAsk_({ channel: 'bot' }, 'آب و هوا').handoff === false);
    TG_CFG_.ASSIST_MODE = ''; TG_CFG_.ASSIST_GEMINI_PAID = '';
    /* جوابم را نگرفتم */
    TG_MEM['as:handoff'] = []; var n0 = TG_MEM['as:' + AS_UN_TAB].length;
    var r6 = asTap_({ channel: 'bot', chat: '503', name: 'مراجع نمونه' }, 'x:' + r1.log, 'قیمت جلسه برای 0912' + '3456789 چقدر است');   // pii:ok ساختگی
    ok('«جوابم را نگرفتم» = تحویل و سؤال بی‌شناسه در بی‌پاسخ‌ها', r6.handoff && TG_MEM['as:handoff'].length === 1 && TG_MEM['as:' + AS_UN_TAB].length === n0 + 1 && !/\d{5}/.test(TG_MEM['as:' + AS_UN_TAB][n0]['متن']));
    ok('گزارش بی متن سؤال', TG_MEM['as:' + AS_LOG_TAB].every(function (o) { return Object.keys(o).every(function (k) { return String(o[k]).indexOf('قیمت جلسه') < 0; }); }));
    ok('رضایت ثبت می‌شود', asTap_({ channel: 'bot' }, 'y:' + r1.log) && TG_MEM['as:' + AS_LOG_TAB].some(function (o) { return o['رضایت'] === '👎'; }));
    /* موضوع و پرسش با دکمه */
    var r7 = asTap_({ channel: 'bot' }, 't:' + asTopics_().indexOf('معارفه'));
    ok('دکمهٔ موضوع ← پرسش‌ها ← پاسخ', r7.buttons.length >= 2 && asTap_({ channel: 'bot' }, r7.buttons[0].id).answer === 'پاسخ تأییدشدهٔ معارفه');
    /* پاک‌شدن بعد از ۳۰ روز */
    TG_MEM['as:' + AS_UN_TAB].push({ 'زمان': '2026-08-01 10:00', 'کانال': 'web', 'متن': 'کهنه' });
    ok('بی‌پاسخ‌های بیش از ۳۰ روز پاک می‌شوند', asPurge_() === 1 && TG_MEM['as:' + AS_UN_TAB].every(function (o) { return o['متن'] !== 'کهنه'; }));
    /* رابط وب */
    ssVerify_ = function () { return 'bad'; };
    ok('وب بی امضای درست رد می‌شود', JSON.parse(asWeb_({}, '{}', { action: 'assist.ask', session_id: 'w1', text: 'قیمت' }).getContent()).error === 'sig');
    ssVerify_ = function () { return 'ok'; };
    var w = JSON.parse(asWeb_({}, '{}', { action: 'assist.ask', channel: 'site', session_id: 'w1', text: 'هزینه جلسه چقدر است' }).getContent());
    ok('وب: answer، topic، handoff، buttons', w.ok && w.answer === 'پاسخ تأییدشدهٔ قیمت' && w.topic === 'قیمت' && w.handoff === false && Array.isArray(w.buttons));
    TG_CFG_.ASSIST_RATE = '2';
    asWeb_({}, '{}', { action: 'assist.ask', session_id: 'w1', text: 'قیمت' });
    ok('نرخ‌گیری برای هر session_id', JSON.parse(asWeb_({}, '{}', { action: 'assist.ask', session_id: 'w1', text: 'قیمت' }).getContent()).error === 'rate'
      && JSON.parse(asWeb_({}, '{}', { action: 'assist.ask', session_id: 'w2', text: 'قیمت' }).getContent()).ok);
    var wh = JSON.parse(asWeb_({}, '{}', { action: 'assist.ask', session_id: 'w3', tap: 'h', text: 'سؤال' }).getContent());
    ok('وب: تحویل با دکمهٔ ادامه در تلگرام', wh.handoff && wh.buttons.some(function (b) { return b.url === AS_BOT_LINK; }));
    TG_CFG_.ASSIST_RATE = '';
    /* خاموش */
    TG_CFG_.ASSIST_ENABLED = '';
    ok('خاموش: بات و وب هیچ کاری نمی‌کنند', asRoute_('501', { text: AS_BTN, from: {} }) === false && asFallback_('501', 'سلام') === false && JSON.parse(asWeb_({}, '{}', { session_id: 'w9', text: 'x' }).getContent()).error === 'off');
    TG_CFG_.ASSIST_ENABLED = 'بله';
    /* بات */
    TG_OUTBOX = [];
    ok('دکمهٔ «سؤال دارم» ← خوش‌آمد و موضوع‌ها', asRoute_('510', { text: AS_BTN, from: {} }) === true && TG_OUTBOX[TG_OUTBOX.length - 1].text.indexOf('دستیار تجربه') > -1 && tgGetVal_('asq', '510') === '1');
    var hit = 0; tgOnCrisis_ = function () { hit++; };
    ok('بحران در گفت‌وگوی دستیار ← مسیر بحران بات', asRoute_('510', { text: 'به خودکشی فکر می‌کنم', from: {} }) === true && hit === 1);
    ok('شماره در گفت‌وگو به مسیر خودش می‌رود', (tgSetVal_('asq', '510', '1'), asRoute_('510', { text: '0912' + '3456789', from: {} }) === false));   // pii:ok ساختگی
    /* پیش‌نویس دانش: جمنای فقط روی سؤالات متداول */
    TG_MEM['as:' + AS_KB_TAB] = []; TG_MEM['as:gemcalls'] = [];
    TG_MEM['as:faq'] = [{ row: 4, q: 'جلسه آنلاین است؟', a: 'بله، آنلاین و حضوری.' }, { row: 5, q: 'سهم درمانگر چقدر است؟', a: 'درصد' }];
    TG_MEM['as:gem'] = [{ i: 0, topic: 'خدمات', samples: ['آنلاین هم دارید؟', 'جلسه آنلاین می‌شود؟'] }];
    var d1 = asDraft_();
    var row = TG_MEM['as:' + AS_KB_TAB][0] || {};
    ok('پیش‌نویس از سؤالات متداول با «تأیید = خیر»', d1.made === 1 && row['تأیید'] === 'خیر' && row['موضوع'] === 'خدمات' && row['پرسش‌های نمونه'].split('\n').length === 3 && row['پاسخ'] === 'بله، آنلاین و حضوری.');
    ok('ورودی جمنای فقط پرسش‌های متداول', TG_MEM['as:gemcalls'].length === 1 && TG_MEM['as:gemcalls'][0].prompt.indexOf('جلسه آنلاین است؟') > -1 && TG_MEM['as:gemcalls'][0].prompt.indexOf('سهم') < 0);
    ok('پیش‌نویس تکرار نمی‌شود', asDraft_().made === 0);
    ok('ردیف تأییدنشده هنوز استفاده نمی‌شود', asKb_().length === 0);
    /* بازبینی در بات */
    TG_MEM['deskwho'] = { name: 'پذیرش نمونه', chat: '801' };
    asReviewCb_('801', 'ok:2');
    ok('پذیرش تأیید می‌کند با تاریخ و نام', row['تأیید'] === 'بله' && row['تأییدکننده'] === 'پذیرش نمونه' && !!row['تاریخ تأیید'] && asKb_().length === 1);
    TG_MEM['as:' + AS_KB_TAB].push({ 'موضوع': 'مالی', 'پرسش‌های نمونه': 'x', 'پاسخ': 'تسویه هر ماه', 'تأیید': 'خیر' });
    TG_OUTBOX = []; asReviewCb_('801', 'ok:3');
    ok('پاسخ دربارهٔ تسویه تأیید نمی‌شود', TG_MEM['as:' + AS_KB_TAB][1]['تأیید'] === 'خیر');
    TG_MEM['deskwho'] = null; TG_OUTBOX = []; asReviewCb_('700', 'ok:3');
    ok('غیرپذیرش نمی‌تواند تأیید کند', /مخصوص پذیرش/.test(TG_OUTBOX[0].text));
    /* گزارش شبانه */
    var nl = asNightLine_();
    ok('خط گزارش شبانه با درصد جست‌وجو', /دستیار: .+٪ با جست‌وجو جواب گرفت/.test(nl), nl);
    ok('دستیار در خط‌های گزارش شبانه ثبت است', TG_NIGHT_LINES.indexOf(asNightLine_) > -1);
    ok('کلیدهای کش هر پیام', ['asq', 'asr', 'aslast'].every(function (k) { return TG_MEMO_KEYS.indexOf(k) > -1; }));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally {
    ssVerify_ = stub.ver; asKnownNames_ = stub.names; if (stub.crisisBot) tgOnCrisis_ = stub.crisisBot;
    TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own;
  }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'asTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['دستیار پاسخ‌گو (v170.23.11)', 'asTests']); } catch (eAs) {}

/* ───── آزمون دستیار ۲ (v170.23.15: دانش و سنجش) ───── */
function asTests2() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT, names: asKnownNames_ };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'as:now': new Date('2026-10-08T12:00:00+03:30').getTime(), 'as:desk': ['801'] };
  TG_CFG_ = { ASSIST_ENABLED: 'بله' }; TG_OWNER_CHAT = '9001';
  try {
    asKnownNames_ = function () { return []; };
    ok('ستون‌های تازهٔ دانش با نام سرستون', ['مخاطب', 'حوزه', 'تیم تأیید', 'نسخه', 'تاریخ بازبینی', 'یادداشت بازبینی'].every(function (h) { return AS_KB_HEAD.indexOf(h) > -1; }) && AS_KB_HEAD[0] === 'موضوع');
    ok('ستون‌های تازهٔ گزارش', AS_LOG_HEAD.indexOf('مخاطب') > -1 && AS_LOG_HEAD.indexOf('میلی‌ثانیه') > -1);
    /* بازبینی به تفکیک تیم */
    var K = TG_MEM['as:' + AS_KB_TAB] = [
      { 'موضوع': 'قیمت', 'پرسش‌های نمونه': 'هزینه جلسه', 'پاسخ': 'پاسخ نمونهٔ قیمت', 'تأیید': '', 'تیم تأیید': 'پذیرش' },
      { 'موضوع': 'رسید پرداخت', 'پرسش‌های نمونه': 'رسید', 'پاسخ': 'پاسخ نمونهٔ رسید', 'تأیید': '', 'تیم تأیید': 'مالی' },
      { 'موضوع': 'پیش‌نیاز دوره', 'پرسش‌های نمونه': 'پیش‌نیاز', 'پاسخ': 'پاسخ نمونهٔ دوره', 'تأیید': 'خیر', 'تیم تأیید': 'مدرسه و پذیرش' },
      { 'موضوع': 'بی‌تیم', 'پرسش‌های نمونه': 'سؤال', 'پاسخ': 'پاسخ نمونه', 'تأیید': '' },
      { 'موضوع': 'تأییدشده', 'پرسش‌های نمونه': 'x', 'پاسخ': 'y', 'تأیید': 'بله', 'تیم تأیید': 'پذیرش' }
    ];
    asTab_(AS_KB_TAB, AS_KB_HEAD);
    var queue = function (chat) { return asTab_(AS_KB_TAB, AS_KB_HEAD).rows.filter(function (o) { var t = asReviewTeams_(chat); return t.length && asInQueue_(o) && asRowFor_(o, t); }).map(function (o) { return o['موضوع']; }).join('|'); };
    TG_MEM['deskwho'] = { name: 'پذیرش نمونه', chat: '801', role: 'پذیرش' };
    TG_MEM['people'] = [{ id: 'P-7', name: 'مالی نمونه', chat: '802', roles: ['مالی'], status: 'فعال' }];
    ok('کلید خاموش: پذیرش همهٔ صف را می‌بیند (رفتار قبلی)', queue('801') === 'قیمت|رسید پرداخت|پیش‌نیاز دوره|بی‌تیم', queue('801'));
    TG_MEM['deskwho'] = null;
    ok('کلید خاموش: مالی راه ندارد', asReviewTeams_('802').length === 0);
    TG_CFG_.ASSIST_KB_TEAMS = 'بله';
    TG_MEM['deskwho'] = { name: 'پذیرش نمونه', chat: '801', role: 'پذیرش' };
    ok('روشن: پذیرش فقط ردیف‌های پذیرش و بی‌تیم', queue('801') === 'قیمت|پیش‌نیاز دوره|بی‌تیم', queue('801'));
    TG_MEM['deskwho'] = null;
    ok('روشن: مالی فقط ردیف مالی (از نقش تب افراد)', queue('802') === 'رسید پرداخت', queue('802'));
    ok('مالک همه را می‌بیند', queue('9001') === 'قیمت|رسید پرداخت|پیش‌نیاز دوره|بی‌تیم', queue('9001'));
    ok('بی نقش راه ندارد', asReviewTeams_('7777').length === 0);
    TG_MEM['deskwho'] = { name: 'پذیرش نمونه', chat: '801', role: 'پذیرش' }; TG_OUTBOX = [];
    asReviewCb_('801', 'ok:3');
    ok('پذیرش ردیف مالی را تأیید نمی‌کند', K[1]['تأیید'] === '' && /تیم دیگری/.test(TG_OUTBOX[0].text));
    asReviewCb_('801', 'ok:2');
    ok('تأیید با تاریخ بازبینی و نسخهٔ ۱', K[0]['تأیید'] === 'بله' && !!K[0]['تاریخ بازبینی'] && K[0]['نسخه'] === 1);
    /* اصلاح: نسخه بالا، تأیید خالی */
    asReviewCb_('801', 'ed:2'); asReviewText_('801', 'پاسخ اصلاح‌شدهٔ نمونه');
    ok('اصلاح پاسخ: نسخه ۲ و تأیید خالی (دوباره در صف)', K[0]['پاسخ'] === 'پاسخ اصلاح‌شدهٔ نمونه' && K[0]['نسخه'] === 2 && K[0]['تأیید'] === '' && asInQueue_(K[0]));
    asReviewCb_('801', 'es:2'); asReviewText_('801', 'پرسش یک\nپرسش دو');
    ok('اصلاح پرسش‌ها: نسخه ۳', K[0]['نسخه'] === 3 && K[0]['تأیید'] === '');
    TG_CFG_.ASSIST_KB_TEAMS = '';
    /* گزارش با مخاطب و زمان */
    K[0]['تأیید'] = 'بله'; TG_MEM['as:' + AS_LOG_TAB] = [];
    TG_MEM['deskwho'] = null;
    asAsk_({ channel: 'site', session: 's1', audience: 'دانشجو' }, 'پرسش یک');
    asAsk_({ channel: 'site', session: 's2', audience: 'نامعتبر' }, 'آب و هوا');
    TG_MEM['deskwho'] = { name: 'پذیرش نمونه', chat: '801', role: 'پذیرش' };
    asAsk_({ channel: 'bot', chat: '801' }, 'پرسش دو');
    var LG = TG_MEM['as:' + AS_LOG_TAB];
    ok('مخاطب: ورودی وب از فهرست، نامعتبر «کاربر عمومی»، میز «همکار»', LG[0]['مخاطب'] === 'دانشجو' && LG[1]['مخاطب'] === 'کاربر عمومی' && LG[2]['مخاطب'] === 'همکار', JSON.stringify(LG.map(function (o) { return o['مخاطب']; })));
    ok('میلی‌ثانیه عدد است', LG.every(function (o) { return typeof o['میلی‌ثانیه'] === 'number' && o['میلی‌ثانیه'] >= 0; }));
    var nl = asNightLine_();
    ok('خط شبانه به تفکیک کانال و مخاطب', /کانال: سایت ۲/.test(nl) && /تلگرام ۱/.test(nl) && /مخاطب: /.test(nl) && /دانشجو ۱/.test(nl) && /میانهٔ زمان پاسخ/.test(nl), nl);
    /* پاک‌سازی قوی‌تر (دادهٔ ساختگی) */
    var sc = function (x) { return asScrub_(x); };
    ok('واژهٔ بعد از عنوان', sc('خانم نمونه‌پور گفت') === 'خانم [نام] گفت' && sc('با دکتر آزمونی حرف زدم') === 'با دکتر [نام] حرف زدم' && sc('آقای نمونه، سلام') === 'آقای [نام]، سلام', [sc('خانم نمونه‌پور گفت'), sc('با دکتر آزمونی حرف زدم'), sc('آقای نمونه، سلام')].join(' | '));
    ok('عنوان دوکلمه‌ای و استاد', sc('سرکار خانم آزمون‌زاده') === 'سرکار خانم [نام]' && sc('استاد نمونه‌وند کلاس دارد') === 'استاد [نام] کلاس دارد', sc('سرکار خانم آزمون‌زاده'));
    ok('واژهٔ لاتین حرف‌بزرگ حذف، کوچک می‌ماند', sc('Sample Person wrote online') === '[نام] [نام] wrote online', sc('Sample Person wrote online'));
    ok('بی عنوان و بی لاتین دست نمی‌خورد', sc('هزینهٔ جلسه چقدر است') === 'هزینهٔ جلسه چقدر است');
    ok('مجموعهٔ «دستیار ۲» در TG_SUITES', TG_SUITES.some(function (x) { return x[1] === 'asTests2'; }));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { asKnownNames_ = keep.names; TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'asTests2'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['دستیار ۲ (v170.23.15)', 'asTests2']); } catch (eAs2) {}

/* ───── آزمون دستیار ۳ · ابزارها (v170.23.16) ───── */
function asTests3() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, lead: typeof TG_DRY_LEAD !== 'undefined' ? TG_DRY_LEAD : null };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'as:now': new Date('2026-10-08T12:00:00+03:30').getTime(), 'as:desk': ['801'] };
  TG_CFG_ = { ASSIST_ENABLED: 'بله' };
  try {
    TG_MEM['as:' + AS_KB_TAB] = [{ 'موضوع': 'قیمت', 'پرسش‌های نمونه': 'هزینه جلسه', 'پاسخ': 'پاسخ نمونهٔ قیمت', 'تأیید': 'بله' }];
    TG_MEM['as:events'] = [
      { code: 'EV-3', title: 'رویداد نمونهٔ سوم', dateIso: '2026-10-20', date: '۲۸ مهر', time: '۱۸:۰۰' },
      { code: 'EV-1', title: 'رویداد گذشته', dateIso: '2026-10-01', date: '۹ مهر' },
      { code: 'EV-2', title: 'رویداد نمونهٔ دوم', dateIso: '2026-10-10', date: '۱۸ مهر' },
      { code: 'EV-4', title: 'رویداد چهارم', dateIso: '2026-11-01' }, { code: 'EV-5', title: 'رویداد پنجم', dateIso: '2026-12-01' }];
    ok('کلید خاموش: ابزار نیست، جست‌وجوی معمول', asAsk_({ channel: 'bot', chat: '601' }, 'رویدادهای پیش رو چیه').tool === undefined);
    TG_CFG_.ASSIST_TOOLS = 'بله';
    var ev = asAsk_({ channel: 'site', session: 's1' }, 'کارگاه یا رویداد پیش‌رو دارید؟');
    ok('رویدادها: سه مورد نزدیک، گذشته نه، به ترتیب تاریخ', ev.tool === 'events' && ev.buttons.length === 3 && ev.buttons[0].url === AS_SITE + '/school/events/#ev=EV-2' && ev.answer.indexOf('گذشته') < 0, JSON.stringify(ev));
    TG_MEM['as:events'] = [{ code: 'EV-1', title: 'رویداد گذشته', dateIso: '2026-10-01' }];
    ok('رویدادها: بی رویداد آینده، لینک صفحه', asAsk_({ channel: 'bot', chat: '601' }, 'وبینار دارید؟').buttons[0].url === AS_SITE + '/school/events/');
    TG_MEM['as:mag'] = function (q) { return /اضطراب/.test(q) ? [{ title: 'مطلب نمونه دربارهٔ اضطراب', link: AS_SITE + '/mag/sample-1/' }] : []; };
    var mg = asAsk_({ channel: 'site', session: 's2' }, 'مقاله‌ای دربارهٔ اضطراب دارید؟ Sample');
    ok('مجله: نتیجه با لینک سایت', mg.tool === 'mag' && mg.buttons[0].url === AS_SITE + '/mag/sample-1/', JSON.stringify(mg));
    ok('مجله: پرسش پاک‌شده و بی واژهٔ زائد به جست‌وجو رفت', TG_MEM['as:magq'][0] === 'اضطراب', TG_MEM['as:magq'][0]);
    ok('مجله: بی نتیجه، لینک مجله', asAsk_({ channel: 'bot', chat: '601' }, 'مقاله درباره چیزی ناشناخته').buttons[0].url === AS_SITE + '/mag/');
    /* وضعیت من */
    TG_DRY_LEAD = { row: 7, code: 'L-9001', chatId: '602', status: 'در پیگیری', stage: 'live', booked: false, closed: false, meetTher: 'درمانگر نمونه', phone: '09' + '000000000' };   // pii:ok ساختگی
    var st = asAsk_({ channel: 'bot', chat: '602' }, 'وضعیت درخواستم چیه؟');
    ok('وضعیت من: فقط مرحله و قدم بعد، بی نام درمانگر و شماره', st.tool === 'status' && /L-9001/.test(st.answer) && /قدم بعد/.test(st.answer) && st.answer.indexOf('درمانگر نمونه') < 0 && !/\d{6}/.test(st.answer), st.answer);
    TG_DRY_LEAD.booked = true; TG_DRY_LEAD.meetDate = '2026-10-12';
    ok('وضعیت من: معارفهٔ ثبت‌شده با تاریخ', /تاریخ معارفه/.test(asAsk_({ channel: 'bot', chat: '602' }, 'وضعیتم چیه').answer));
    var unk = asAsk_({ channel: 'bot', chat: '699' }, 'وضعیت درخواستم چیه؟');
    ok('وضعیت من با chat ناشناس: بی هیچ دادهٔ لید', unk.tool === 'status' && unk.answer.indexOf('L-9001') < 0 && unk.buttons[0].id === 'h', unk.answer);
    var web = asAsk_({ channel: 'site', session: 's3' }, 'وضعیت درخواستم چیه؟');
    ok('وضعیت من در وب: «در بات ادامه بده» با لینک بات', web.tool === 'status' && web.buttons[0].url === AS_BOT_LINK && web.answer.indexOf('L-') < 0, JSON.stringify(web));
    ok('ابزارها در گزارش با نام ابزار', TG_MEM['as:' + AS_LOG_TAB].some(function (o) { return o['موضوع'] === 'ابزار status' && o['نتیجه'] === 'ابزار'; }));
    ok('بحران پیش از ابزار', asAsk_({ channel: 'bot', chat: '602' }, 'رویداد دارید؟ می‌خواهم خودکشی کنم').crisis === true);
    ok('جدول ابزار: هر سطر id، الگو، تابع و کانال', AS_TOOLS.every(function (t) { return t.id && t.re instanceof RegExp && typeof t.fn === 'function' && t.ch.length; }));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_DRY_LEAD = keep.lead; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'asTests3'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['دستیار ۳ · ابزارها (v170.23.16)', 'asTests3']); } catch (eAs3) {}
