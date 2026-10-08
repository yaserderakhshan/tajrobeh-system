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
 * مرزها: مشاورهٔ بالینی، تشخیص یا دارو نه. بحران همیشه پیش از هر تطبیق و پیش از جمنای با فهرست جمله‌های صریح (tgIsCrisis_):
 *   فقط پیام ثابت اورژانس T_CRISIS (از v170.23.19 بی کارت فوری و بی تحویل؛ متن پیام هیچ‌جا نمی‌رود). ویس و فایل به دستیار نمی‌رسد.
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
var AS_LOG_HEAD = ['زمان', 'کانال', 'موضوع', 'حالت', 'نتیجه', 'رضایت', 'شناسه', 'مخاطب', 'میلی‌ثانیه', 'منبع پاسخ'];   /* v170.23.19: دانش | سایت | ابزار */   /* v170.23.15: مخاطب و زمان پاسخ */
var AS_UN_TAB = 'سؤال‌های بی‌پاسخ';
var AS_UN_HEAD = ['زمان', 'کانال', 'متن', 'حوزه', 'نوع', 'مخاطب'];   /* v170.23.17: حوزهٔ حدس‌زده (بی جمنای)، نوع و مخاطب */
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
cfg_('ASSIST_RATE', '');         /* سقف پرسش هر session_id در ساعت؛ خالی = ۲۰ */
cfg_('ASSIST_REWRITE', '');      /* v170.23.18، v170.23.19: «بله» = روان کردن پاسخ و پاسخ از روی منبع سایت با جمنای (نسخهٔ رایگان هم)، با گارد */
cfg_('ASSIST_GEMINI_DAILY', '');  /* v170.23.18: سقف فراخوانی جمنای دستیار در روز؛ خالی = ۲۰۰؛ بالای سقف برگشت به «جستجو» */
cfg_('ASSIST_GEMINI_DRAFT', '');  /* v170.23.18: «بله» = پیش‌نویس ردیف از پرسش‌های بی‌جواب، فقط متن پاک‌شده، فقط برای صف بازبینی */
cfg_('ASSIST_WEEKLY', '');       /* v170.23.17: «بله» = گزارش هفتگی هر تیم (پرتکرارهای بی‌جواب و ردیف‌های بازبینی‌نشده) از tgWatchdog */
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
  if (m === AS_MODES.smart && asPaid_() && asGemLeft_() > 0) return AS_MODES.smart;   /* v170.23.18: بالای سقف روزانه برگشت به «جستجو» */
  return AS_MODES.search;
}
/* ───── سقف روزانهٔ جمنای دستیار (v170.23.18) ───── */
function asGemDay_() { return 'AS_GEM:' + Utilities.formatDate(new Date(asNow_()), TG_TZ, 'yyyy-MM-dd'); }
function asGemCap_() { var n = Number(tgLatinDigits_(String(cfg_('ASSIST_GEMINI_DAILY', '') || ''))); return n > 0 ? n : 200; }
function asGemUsed_() { return Number(asProp_(asGemDay_()) || 0); }
function asGemLeft_() { return asGemCap_() - asGemUsed_(); }
function asGemCount_() { asProp_(asGemDay_(), asGemUsed_() + 1); }
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
    out.push({ row: o._row, topic: String(o['موضوع'] || 'عمومی').trim(), samples: String(o['پرسش‌های نمونه'] || '').split(/\n|؛/).map(function (s) { return s.trim(); }).filter(String), answer: String(o['پاسخ']).trim(), aud: String(o['مخاطب'] || '').trim(), dom: String(o['حوزه'] || '').trim() });
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
  return s.replace(/[؟،؛٪«»٫٬]/g, ' ').replace(/[^؀-ۿa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();   /* v170.23.17: نشانه‌های فارسی هم جدا */
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
  var id = ctx && /^A-[0-9a-z]{4,16}$/.test(String(ctx.logId || '')) ? String(ctx.logId) : 'A-' + asNow_().toString(36) + Math.floor(Math.random() * 1296).toString(36);   /* v170.23.24: شناسهٔ ساخت ورکر */
  var ms = ctx && ctx.t0 ? Math.max(0, Date.now() - ctx.t0) : '';
  try { asTab_(AS_LOG_TAB, AS_LOG_HEAD).add({ 'زمان': asFmt_(), 'کانال': channel, 'موضوع': topic || '', 'حالت': mode, 'نتیجه': result, 'رضایت': '', 'شناسه': id, 'مخاطب': asAud_(ctx), 'میلی‌ثانیه': ms, 'منبع پاسخ': (ctx && ctx.src) || '' }); } catch (e) { tgErr_('asLog_', e); }
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
function asUnanswered_(channel, text, extra, kind, ctx) {
  var clean = asScrub_(text, extra);
  try { asTab_(AS_UN_TAB, AS_UN_HEAD).add({ 'زمان': asFmt_(), 'کانال': channel, 'متن': clean, 'حوزه': asGuessDomain_(clean), 'نوع': kind || 'بی‌پاسخ', 'مخاطب': ctx ? asAud_(ctx) : '' }); } catch (e) { tgErr_('asUnanswered_', e); }
}
/* ───── حوزه‌ها (ASSISTANT.md بند ۲) و حدس حوزه بی جمنای ─────
   اول نزدیک‌ترین ردیف «دانش دستیار» که حوزه دارد (asSearch_، هر وضعیت تأیید؛ فقط برای حدس حوزه، نه پاسخ)، بعد واژه‌های کلیدی. */
var AS_DOMAINS = [
  { d: 'پرداخت', team: 'مالی', re: /پرداخت|رسید|فاکتور|بازگشت وجه|درگاه|کارت|تتر|یورو|کیف پول|واریز/ },
  { d: 'روان‌پزشکی', team: 'پذیرش', re: /روانپزشک|روان پزشک|دارو|ویزیت/ },
  { d: 'خارج از ایران', team: 'پذیرش', re: /خارج از ایران|خارج کشور|مهاجر|اختلاف ساعت|اروپا|آمریکا|کانادا|آلمان/ },
  { d: 'حضوری', team: 'پذیرش', re: /حضوری|نشانی|آدرس|مطب|ساختمان/ },
  { d: 'سازمانی', team: 'پذیرش', re: /سازمان|شرکت|کارمند|کارکنان/ },
  { d: 'مدرسه و دوره‌ها', team: 'مدرسه', re: /دوره|مدرسه|کلاس|پیش ?نیاز|ثبت ?نام دوره|گواهی|سوپرویژن|استاد/ },
  { d: 'رویدادها', team: 'رویداد', re: /رویداد|کارگاه|وبینار|دورهمی/ },
  { d: 'مجله', team: 'مجله', re: /مجله|مقاله|نویسنده|نوشتن/ },
  { d: 'همکاری درمانگران و پارتنرها', team: 'مدرسه و پذیرش', re: /همکاری|استخدام|درمانگر بشوم|درمانگر شوم|پارتنر|اتاق اجاره/ },
  { d: 'تست‌ها و مهاجرت روان‌شناسان', team: 'پذیرش و مدرسه', re: /تست|آزمون|پرسشنامه|مهاجرت روانشناس/ },
  { d: 'تراپی و پذیرش', team: 'پذیرش', re: /./ }
];
function asDomTeam_(d) { for (var i = 0; i < AS_DOMAINS.length; i++) if (AS_DOMAINS[i].d === d) return AS_DOMAINS[i].team; return 'پذیرش'; }
function asGuessDomain_(text) {
  try {
    var all = asTab_(AS_KB_TAB, AS_KB_HEAD).rows.filter(function (o) { return o['حوزه'] && String(o['تأیید'] || '').trim() !== 'کنار'; })
      .map(function (o) { return { row: o._row, topic: String(o['موضوع'] || ''), samples: String(o['پرسش‌های نمونه'] || '').split(/\n|؛/).filter(String), answer: '', dom: o['حوزه'] }; });
    var top = asSearch_(text, all)[0];
    if (top && top.score >= 0.35) return top.k.dom;
  } catch (e) {}
  var n = asNorm_(text);
  for (var i = 0; i < AS_DOMAINS.length; i++) if (AS_DOMAINS[i].re.test(n)) return AS_DOMAINS[i].d;
  return 'تراپی و پذیرش';
}
/** سؤال‌های بی‌پاسخ بیش از ۳۰ روز پاک می‌شوند */
function asPurge_() {
  var t = asTab_(AS_UN_TAB, AS_UN_HEAD), lim = asFmt_(asNow_() - 30 * 86400000), n = 0;
  t.rows.slice().reverse().forEach(function (o) { if (o['زمان'] && o['زمان'] < lim) { t.del(o._row); n++; } });
  return n;
}

/* ───── هستهٔ پاسخ (مشترک بات و وب) ─────
   ctx: {channel, chat, name, country}. خروجی: {answer, topic, handoff, buttons:[{id,text}|{url,text}], crisis, log} */
function asEmergency_() { return T_CRISIS; }   /* v170.23.19: پیام ثابت، بی نسخهٔ کشوری (ASSIST_EMERGENCY کنار رفت) */
/** chat همکاران میز پذیرش */
function asDeskChats_() {
  if (asDry_()) return TG_MEM['as:desk'] || [];
  return (typeof tgDeskRows_ === 'function' ? tgDeskRows_() : []).map(function (d) { return String(d.chat || '').split(/[,،;\s]+/)[0]; }).filter(String);
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
  ctx.src = 'دانش';
  var log = asLog_(ctx.channel, k.topic, mode, 'پاسخ', ctx);
  return { answer: asRewrite_(ctx, k), topic: k.topic, handoff: false, log: log,
    buttons: [{ id: 'x:' + log, text: 'جوابم را نگرفتم' }, { id: 'y:' + log, text: '👍' }, { id: 'n:' + log, text: '👎' }] };
}
/** پرسش آزاد */
function asAsk_(ctx, text) {
  if (ctx && !ctx.t0) ctx.t0 = Date.now();
  text = String(text || '').trim();
  if (ctx && text) ctx.lastText = text;
  if (!text) return { answer: AS_WELCOME, topic: '', handoff: false, buttons: asTopicBtns_(asTopics_()).concat([{ id: 'h', text: 'با پذیرش حرف بزنم' }]) };
  /* بحران همیشه اول */
  if (tgIsCrisis_(text)) {   /* v170.23.19: فقط پیام ثابت اورژانس؛ بی کارت فوری، بی تحویل، بی جمنای. گزارش فقط شمار، بی متن */
    asLog_(ctx.channel, 'بحران', asMode_(), 'بحران', ctx);
    return { answer: asEmergency_(), topic: 'بحران', handoff: false, crisis: true, buttons: [] };
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
    if (sm && sm.crisis) { asLog_(ctx.channel, 'بحران', mode, 'بحران', ctx); return { answer: asEmergency_(), topic: 'بحران', handoff: false, crisis: true, buttons: [] }; }
    if (sm && sm.k) return asAnswerOut_(ctx, sm.k, mode);
    mode = AS_MODES.search;   /* اطمینان کم یا خطا: جست‌وجوی داخلی */
  }
  var res = asSearch_(text, kb), top = res[0];
  /* v170.23.19: اولویت مخاطب پرسنده بین ردیف‌های تأییدشده (ناشناس یعنی عمومی و مراجع) */
  if (res.length > 1) { var aud = asAud_(ctx), mine = function (k) { return !k.aud || k.aud.indexOf(aud) > -1 || (aud === 'کاربر عمومی' && /مراجع|عمومی/.test(k.aud)); };
    res.forEach(function (r) { if (mine(r.k)) r.score = Math.min(1, r.score + 0.05); }); res.sort(function (a, b) { return b.score - a.score; }); top = res[0]; }
  if (top && top.score >= asMin_()) return asAnswerOut_(ctx, top.k, mode);
  /* v170.23.19: بعد نمایهٔ سایت (منتشرشده) و رویدادهای بات */
  var site = asSiteAnswer_(ctx, text);
  if (site) return site;
  var near = [], seen = {};
  res.forEach(function (r) { if (!seen[r.k.topic] && near.length < 3) { seen[r.k.topic] = 1; near.push(r.k.topic); } });
  if (near.length < 3) asTopics_(kb).forEach(function (t) { if (!seen[t] && near.length < 3) { seen[t] = 1; near.push(t); } });
  asLog_(ctx.channel, '', mode, 'بی‌پاسخ', ctx);
  asUnanswered_(ctx.channel, text, [ctx.name], 'بی‌پاسخ', ctx);
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
    if (act === 'x') { asRate_(a[1], false); if (lastText) asUnanswered_(ctx.channel, lastText, [ctx.name], 'جوابم را نگرفتم', ctx); }
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
    if (out) { ctx.src = 'ابزار'; out.tool = t.id; out.log = asLog_(ctx.channel, 'ابزار ' + t.id, asMode_(), out.handoff ? 'تحویل' : 'ابزار', ctx); return out; }
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

/* ───── گزارش هفتگی تیم‌ها (v170.23.17؛ ASSISTANT.md بند ۸) ─────
   پشت ASSIST_WEEKLY. از tgWatchdog (قدم سبک)، شنبه از ساعت ۱۰ تهران، یک بار در هفته با پرچم AS_WK_DONE (بی تریگر تازه).
   هر تیم: پنج پرسش پرتکرار بی‌جواب ۷ روز گذشتهٔ حوزه‌های خودش (متن پاک‌شده) با دکمهٔ «پاسخ می‌دهم»، و ردیف‌های تأییدشده‌ای
   که بیش از ۹۰ روز بازبینی نشده‌اند. پاسخ تیم ردیف تازه با «تأیید» خالی و منبع «پاسخ تیم» می‌سازد و همان تیم تأییدش می‌کند. */
var AS_WK_TOP = 5, AS_STALE_DAYS = 90;
function asWeeklyOn_() { return String(cfg_('ASSIST_WEEKLY', '') || '').trim() === 'بله'; }
function asProp_(k, v) {
  if (asDry_()) { if (v !== undefined) TG_MEM['asp:' + k] = String(v); return TG_MEM['asp:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function asWeekKey_() { return v1691Week_(new Date(asNow_())); }
function asWeeklyMaybe_() {
  if (!asOn_() || !asWeeklyOn_()) return 0;
  var d = new Date(asNow_()), wd = Number(Utilities.formatDate(d, TG_TZ, 'u')), h = Number(Utilities.formatDate(d, TG_TZ, 'H'));
  if (wd !== 6 || h < 10 || asProp_('AS_WK_DONE') === asWeekKey_()) return 0;
  asProp_('AS_WK_DONE', asWeekKey_());
  return asWeekly_();
}
/** chat اعضای یک تیم: پذیرش از میز پذیرش، بقیه از نقش‌های تب افراد (AS_TEAMS)؛ بی عضو، مالک */
function asTeamChats_(team) {
  var out = [];
  if (team === 'پذیرش') out = asDeskChats_();
  else {
    var re = AS_TEAMS[team];
    try { (tgPeopleList_() || []).forEach(function (p) { if (!re || !p.chat || String(p.status || '').indexOf('غیرفعال') > -1) return; if (re.test((p.roles || []).join(' '))) out.push(String(p.chat).split(/[,،;\s]+/)[0]); }); } catch (e) {}
  }
  out = out.filter(function (c, i) { return c && out.indexOf(c) === i; });
  return out.length ? out : (TG_OWNER_CHAT ? [String(TG_OWNER_CHAT)] : []);
}
/* کلید گروه پرسش‌ها: واژه‌های معنادار به ترتیب، بی فاصله (پس «پیش‌نیاز» و «پیش نیاز» یکی‌اند) و بی واژه‌های پرسشی */
var AS_QWORDS = /^(چیست|چیه|چیس|چطوره|چگونه|چنده|کجاست|هستش|است|میشه|دارین|دارید|چی|چه)$/;
function asQKey_(t) { return asTokens_(t).filter(function (w) { return !AS_QWORDS.test(w); }).join(''); }
function asQId_(k) { var h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
/** متن گزارش هر تیم: {team: {top:[{id,q,n,dom}], stale:[{row,topic,days}]}} */
function asWeeklyData_() {
  var since = asFmt_(asNow_() - 7 * 86400000), stLim = asNow_() - AS_STALE_DAYS * 86400000, by = {};
  var add = function (team) { return (by[team] = by[team] || { top: {}, stale: [] }); };
  asTab_(AS_UN_TAB, AS_UN_HEAD).rows.forEach(function (o) {
    if (!o['متن'] || String(o['زمان'] || '') < since) return;
    var dom = o['حوزه'] || asGuessDomain_(o['متن']), k = asQKey_(o['متن']); if (!k) return;
    asRowTeams_({ 'تیم تأیید': asDomTeam_(dom) }).forEach(function (team) {
      var T = add(team).top, x = T[k] = T[k] || { id: asQId_(k), q: o['متن'], n: 0, dom: dom };
      x.n++;
    });
  });
  asTab_(AS_KB_TAB, AS_KB_HEAD).rows.forEach(function (o) {
    if (String(o['تأیید'] || '').trim() !== 'بله') return;
    var at = String(o['تاریخ بازبینی'] || o['تاریخ تأیید'] || ''), ms = at ? new Date(at.replace(' ', 'T') + ':00+03:30').getTime() : 0;
    if (ms && ms > stLim) return;
    var days = ms ? Math.floor((asNow_() - ms) / 86400000) : null;
    asRowTeams_(o).forEach(function (team) { add(team).stale.push({ row: o._row, topic: String(o['موضوع'] || ''), days: days }); });
  });
  Object.keys(by).forEach(function (t) { by[t].top = Object.keys(by[t].top).map(function (k) { return by[t].top[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, AS_WK_TOP); });
  return by;
}
function asWeekly_() {
  var by = asWeeklyData_(), sent = 0, store = {};
  try { store = JSON.parse(asProp_('AS_WK_Q') || '{}') || {}; } catch (e) { store = {}; }
  Object.keys(by).forEach(function (team) {
    var x = by[team]; if (!x.top.length && !x.stale.length) return;
    var T = ['📊 <b>دستیار · گزارش هفتگی تیم ' + tgEsc_(team) + '</b>'];
    if (x.top.length) { T.push('', 'پرتکرارهای بی‌جواب این هفته:'); x.top.forEach(function (q, i) { T.push(tgFa_(i + 1) + '. «' + tgEsc_(q.q.slice(0, 160)) + '» · ' + tgFa_(q.n) + ' بار · ' + tgEsc_(q.dom)); store[q.id] = { q: q.q.slice(0, 300), dom: q.dom, team: team, at: asNow_() }; }); }
    if (x.stale.length) { T.push('', 'ردیف‌هایی که بیش از ' + tgFa_(AS_STALE_DAYS) + ' روز بازبینی نشده‌اند:'); x.stale.slice(0, 10).forEach(function (r) { T.push('• ردیف ' + tgFa_(r.row) + ' · ' + tgEsc_(r.topic) + (r.days != null ? ' · ' + tgFa_(r.days) + ' روز' : ' · بی تاریخ')); }); T.push('برای بازبینی: /askreview'); }
    var kb = x.top.map(function (q, i) { return [{ text: '✍️ پاسخ می‌دهم به ' + tgFa_(i + 1), callback_data: 'as:ra:' + q.id }]; });
    asTeamChats_(team).forEach(function (c) { tgNotify_(c, TG_NK.task, T.join('\n'), { ref: 'AS-WK-' + team, markup: kb.length ? { inline_keyboard: kb } : null }); sent++; });
  });
  var keys = Object.keys(store).sort(function (a, b) { return (store[b].at || 0) - (store[a].at || 0); }).slice(0, 60), keep = {};
  keys.forEach(function (k) { keep[k] = store[k]; });
  asProp_('AS_WK_Q', JSON.stringify(keep));
  try { var all = []; Object.keys(by).forEach(function (t) { all = all.concat(by[t].top); }); asDraftFromIdx_(all); asDraftUn_(all); } catch (eD) { tgErr_('asDraftUn_', eD); }   /* v170.23.18: فقط با کلید؛ v170.23.19: اول از نمایهٔ سایت */
  return sent;
}
function asTeamAnsCb_(chat, id) {
  var store = {}; try { store = JSON.parse(asProp_('AS_WK_Q') || '{}') || {}; } catch (e) {}
  var it = store[id]; if (!it) return tgSend_(chat, 'این پرسش دیگر در فهرست نیست.');
  if (!asIsOwner_(chat) && asTeamChats_(it.team).indexOf(String(chat)) < 0) return tgSend_(chat, 'این پرسش مال تیم ' + tgEsc_(it.team) + ' است.');
  tgSetVal_('asa', chat, id);
  return tgSend_(chat, '✍️ پاسخ پیشنهادی تیم برای این پرسش را بفرست:\n«' + tgEsc_(it.q) + '»\n\nبعد از ثبت، در صف تأیید همین تیم می‌آید. برای لغو: انصراف');
}
function asTeamAnsText_(chat, text) {
  var id = tgGetVal_('asa', chat); tgDel_('asa', chat);
  if (text === 'انصراف' || text.indexOf('/') === 0) { tgSend_(chat, 'لغو شد.'); return true; }
  var store = {}; try { store = JSON.parse(asProp_('AS_WK_Q') || '{}') || {}; } catch (e) {}
  var it = store[id]; if (!it) { tgSend_(chat, 'این پرسش دیگر در فهرست نیست.'); return true; }
  asTab_(AS_KB_TAB, AS_KB_HEAD).add({ 'موضوع': it.q.slice(0, 40), 'پرسش‌های نمونه': it.q, 'پاسخ': String(text).slice(0, 2000), 'منبع': 'پاسخ تیم', 'تأیید': '', 'تاریخ تأیید': '', 'تأییدکننده': '',
    'حوزه': it.dom, 'تیم تأیید': it.team, 'نسخه': 1, 'تاریخ بازبینی': '', 'یادداشت بازبینی': 'از گزارش هفتگی · ' + asStaffName_(chat) });
  delete store[id]; asProp_('AS_WK_Q', JSON.stringify(store));
  tgSend_(chat, '✅ ثبت شد و در صف تأیید تیم ' + tgEsc_(it.team) + ' است (/askreview).');
  return true;
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
  if (asGemLeft_() <= 0) throw new Error('سقف روزانهٔ جمنای دستیار');
  asGemCount_();
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

/* ───── روان کردن پاسخ (v170.23.18؛ ASSISTANT.md بند ۶) ─────
   فقط با ASSIST_REWRITE = بله و ASSIST_GEMINI_PAID = بله و زیر سقف روزانه. ورودی: پرسش پاک‌شده و متن یک ردیف تأییدشده. خروجی رد می‌شود
   و متن خود ردیف می‌رود اگر عدد، نشانی، لینک، ایمیل، آیدی یا نامی داشته باشد که در ردیف نیست، یا خالی یا خیلی بلند باشد. */
var AS_RW_SCHEMA = { type: 'OBJECT', properties: { text: { type: 'STRING' } }, required: ['text'] };
/* v170.23.19 (تصمیم یاسر): روان کردن و پاسخ از روی منبع روی نسخهٔ رایگان جمنای، بی وابستگی به ASSIST_GEMINI_PAID؛ گاردها همان */
function asRewriteOn_() { return String(cfg_('ASSIST_REWRITE', '') || '').trim() === 'بله'; }
function asFacts_(t) {
  var s = tgLatinDigits_(String(t || '')), out = [];
  (s.match(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+|@[A-Za-z0-9_]{3,}|[A-Za-z0-9-]+\.[A-Za-z]{2,}(?:\/[^\s،.]*)?|\d+(?:[.,٫٬]\d+)*/g) || []).forEach(function (x) { out.push(x.replace(/[.,،؛:)]+$/, '')); });
  (s.match(/[A-Z][a-z]+/g) || []).forEach(function (x) { out.push(x); });
  var t2 = AS_TITLES.join('|'), re = new RegExp('(?:' + t2 + ')\\s+([^\\s«»"(),،.!؟?:؛]+)', 'g'), m;
  while ((m = re.exec(s))) out.push(m[1]);
  return out;
}
/** خروجی امن است اگر هر عدد، لینک، ایمیل، آیدی یا نامش در متن ردیف هم باشد */
function asRwSafe_(out, src) {
  var o = String(out || '').trim(); if (!o || o.length > Math.max(400, String(src).length * 2)) return false;
  var base = tgLatinDigits_(String(src));
  return asFacts_(o).every(function (f) { return base.indexOf(f) > -1; });
}
function asRewrite_(ctx, k) {
  if (!asRewriteOn_() || asGemLeft_() <= 0) return k.answer;
  try {
    var q = asScrub_(ctx.lastText || '', [ctx.name]);
    var prompt = 'این پاسخ تأییدشده را برای همین پرسش، کوتاه، گرم و روان بازنویسی کن. هیچ عدد، نشانی، لینک، نام یا اطلاعات تازه‌ای اضافه نکن؛ ' +
      'فقط از همین متن استفاده کن. مشاورهٔ بالینی، تشخیص یا دارو نده. خط تیرهٔ بلند ننویس.\n\nپرسش: ' + q + '\n\nپاسخ تأییدشده:\n' + k.answer;
    var o = asGem_('روان کردن پاسخ', prompt, AS_RW_SCHEMA);
    var t = String((o && o.text) || '').replace(/[—–]/g, '،').trim();
    if (asRwSafe_(t, k.answer)) return t;
    if (asDry_()) (TG_MEM['as:rwreject'] = TG_MEM['as:rwreject'] || []).push(t);
  } catch (e) { if (!asDry_()) tgErr_('asRewrite_', e); }
  return k.answer;
}

/* ───── پیش‌نویس ردیف از پرسش‌های بی‌جواب (v170.23.18) ─────
   فقط با ASSIST_GEMINI_DRAFT = بله و زیر سقف (از v170.23.19 بی PAID). ورودی فقط متن پاک‌شدهٔ «سؤال‌های بی‌پاسخ» (بی کانال، زمان یا شناسه).
   خروجی فقط «موضوع» و «پرسش‌های نمونه»؛ «پاسخ» خالی می‌ماند تا تیم بنویسد. ردیف با «تأیید» خالی و منبع «پیش‌نویس از پرسش‌های بی‌جواب». */
var AS_UNDRAFT_SCHEMA = { type: 'ARRAY', items: { type: 'OBJECT', properties: { topic: { type: 'STRING' }, samples: { type: 'ARRAY', items: { type: 'STRING' } }, dom: { type: 'STRING' } }, required: ['topic', 'samples'] } };
function asDraftUnOn_() { return String(cfg_('ASSIST_GEMINI_DRAFT', '') || '').trim() === 'بله'; }   /* v170.23.19: بی PAID؛ فقط متن پاک‌شده */
function asDraftUn_(items) {
  if (!asDraftUnOn_() || !items || !items.length || asGemLeft_() <= 0) return 0;
  var qs = items.slice(0, 15).map(function (x) { return asScrub_(x.q); });
  var o;
  try {
    o = asGem_('پیش‌نویس از بی‌جواب‌ها', 'این پرسش‌های بی‌جواب را دسته کن. برای هر دسته یک «موضوع» کوتاه و ۳ تا ۶ شکل پرسش بنویس. پاسخ ننویس. ' +
      'حوزه را از این فهرست بگذار: ' + AS_DOMAINS.map(function (d) { return d.d; }).join('، ') + '.\n\n' + qs.map(function (q, i) { return (i + 1) + ') ' + q; }).join('\n'), AS_UNDRAFT_SCHEMA);
  } catch (e) { if (!asDry_()) tgErr_('asDraftUn_', e); return 0; }
  var t = asTab_(AS_KB_TAB, AS_KB_HEAD), n = 0;
  (o || []).slice(0, 5).forEach(function (x) {
    if (!x || !x.topic || !x.samples || !x.samples.length) return;
    var dom = AS_DOMAINS.some(function (d) { return d.d === x.dom; }) ? x.dom : asGuessDomain_(x.samples.join(' '));
    t.add({ 'موضوع': asScrub_(x.topic).slice(0, 40), 'پرسش‌های نمونه': x.samples.slice(0, 6).map(function (q) { return asScrub_(q); }).join('\n'), 'پاسخ': '', 'منبع': 'پیش‌نویس از پرسش‌های بی‌جواب',
      'تأیید': '', 'حوزه': dom, 'تیم تأیید': asDomTeam_(dom), 'نسخه': 1, 'یادداشت بازبینی': 'پاسخ را تیم بنویسد (✏️ اصلاح پاسخ)' });
    n++;
  });
  return n;
}

/* ───── نمایهٔ دانش سایت (v170.23.19؛ فاز ۷) ─────
   منبع «منتشرشده»: متن همین حالای سایت (گردش کار assist-index روزی دو بار، اکشن kb_index با کلید دوم درگاه) و رویدادهایی که بات
   همین حالا نشان می‌دهد. در برگهٔ پنهان «نمایهٔ دانش» هاب پذیرش؛ بات با کش ۶ ساعته می‌خواند. هر دور تازه جای دور قبلی را می‌گیرد،
   پس صفحهٔ تازه وارد و صفحهٔ حذف‌شده یا پیش‌نویس‌شده بیرون می‌رود. هر تکه با سهم، تسویه، حقوق یا قرارداد، یا شماره و ایمیل، رد می‌شود. */
var AS_IDX_TAB = 'نمایهٔ دانش';
var AS_IDX_HEAD = ['شناسه', 'نشانی', 'عنوان', 'متن', 'حوزه', 'مخاطب', 'منبع', 'تاریخ', 'دور'];
var AS_IDX_MONEY = /درصد سهم|سهم(?: درمانگر| شما| همکار)|تسویه|کمیسیون|حقوق(?: ماه| ماهانه| ماهیانه| پایه| دریافتی| و مزایا)|فیش حقوقی|قرارداد/;
var AS_IDX_PII = /(?:\+98|0098|0)9\d{9}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\bIR\d{24}\b/;
cfg_('ASSIST_IDX_MIN', '');      /* v170.23.19: آستانهٔ پاسخ از نمایهٔ سایت، ۰ تا ۱؛ خالی = ۰٫۵ */
function asIdxMin_() { var n = Number(tgLatinDigits_(String(cfg_('ASSIST_IDX_MIN', '') || ''))); return n > 0 && n <= 1 ? n : 0.5; }
function asIdxOk_(c) {
  var t = String((c && c.title) || '') + ' ' + String((c && c.text) || '');
  return !!(c && c.id && /^https:\/\/tajrobeh\.life\//.test(String(c.url || '')) && String(c.text || '').length >= 30 && !AS_IDX_MONEY.test(t) && !AS_DENY.test(t) && !AS_IDX_PII.test(tgLatinDigits_(t)));
}
/* اکشن درگاه kb_index (فقط کلید دوم): {run, part, of, chunks} */
function asIdxIngest_(p, dry) {
  if (typeof ebiKey2Ok_ === 'function' && !ebiKey2Ok_(p && p.key)) return { ok: false, error: 'key2_only' };
  var run = String(p.run || '').replace(/\D/g, '').slice(0, 14), part = Number(p.part) || 0, of = Number(p.of) || 0;
  var list = Array.isArray(p.chunks) ? p.chunks : [];
  if (!run || part < 1 || of < part) return { ok: false, error: 'run/part/of' };
  var ok = list.filter(asIdxOk_), rows = ok.map(function (c) { return [String(c.id).slice(0, 20), String(c.url).slice(0, 300), String(c.title || '').slice(0, 160), String(c.text).slice(0, 600),
    String(c.dom || '').slice(0, 40), String(c.aud || '').slice(0, 40), String(c.src || 'سایت').slice(0, 10), String(c.mod || '').slice(0, 10), run]; });
  if (dry) return { ok: true, data: { would: rows.length, dropped: list.length - rows.length, part: part, of: of } };
  asIdxAppend_(rows);
  if (part < of) return { ok: true, data: { part: part, of: of, rows: rows.length, dropped: list.length - rows.length } };
  var st = asIdxSwap_(run);
  return { ok: true, data: st };
}
function asIdxSheet_() {
  var ss = tgSS_(), sh = ss.getSheetByName(AS_IDX_TAB);
  if (!sh) { sh = ss.insertSheet(AS_IDX_TAB); sh.setRightToLeft(true); sh.getRange(1, 1, 1, AS_IDX_HEAD.length).setValues([AS_IDX_HEAD]).setFontWeight('bold'); sh.setFrozenRows(1); try { sh.hideSheet(); } catch (e) {} }
  return sh;
}
function asIdxAppend_(rows) {
  if (!rows.length) return;
  if (asDry_()) { TG_MEM['as:idxrows'] = (TG_MEM['as:idxrows'] || []).concat(rows); return; }
  var sh = asIdxSheet_(); sh.getRange(sh.getLastRow() + 1, 1, rows.length, AS_IDX_HEAD.length).setNumberFormat('@').setValues(rows);
}
/** پایان دور: دور قبلی بیرون، شمار تازه‌ها و حذف‌شده‌ها */
function asIdxSwap_(run) {
  var all;
  if (asDry_()) all = TG_MEM['as:idxrows'] || [];
  else { var sh = asIdxSheet_(), n = sh.getLastRow(); all = n > 1 ? sh.getRange(2, 1, n - 1, AS_IDX_HEAD.length).getValues() : []; }
  var cur = all.filter(function (r) { return String(r[8]) === run; }), old = {}, now = {};
  all.forEach(function (r) { if (String(r[8]) !== run) old[r[0]] = 1; });
  cur.forEach(function (r) { now[r[0]] = 1; });
  var added = Object.keys(now).filter(function (k) { return !old[k]; }).length, removed = Object.keys(old).filter(function (k) { return !now[k]; }).length;
  if (!cur.length && all.length) return { n: all.length, added: 0, removed: 0, error: 'دور خالی؛ نمایهٔ قبلی ماند' };
  if (asDry_()) TG_MEM['as:idxrows'] = cur;
  else { var sh2 = asIdxSheet_(), m = sh2.getLastRow(); if (m > 1) sh2.getRange(2, 1, m - 1, AS_IDX_HEAD.length).clearContent(); if (cur.length) sh2.getRange(2, 1, cur.length, AS_IDX_HEAD.length).setValues(cur); if (sh2.getLastRow() > cur.length + 1) { try { sh2.deleteRows(cur.length + 2, sh2.getLastRow() - cur.length - 1); } catch (e) {} } }
  var st = { n: cur.length, added: Object.keys(old).length ? added : cur.length, removed: removed, run: run, at: asFmt_() };
  asProp_('AS_IDX_STAT', JSON.stringify(st));
  asIdxCacheClear_();
  asEdgePing_();
  return st;
}
var AS_IDX_MEMO = null;
function asIdxCacheClear_() { AS_IDX_MEMO = null; if (asDry_()) return; try { var c = CacheService.getScriptCache(), n = Number(c.get('askidx:n') || 0), ks = ['askidx:n']; for (var i = 0; i < n; i++) ks.push('askidx:' + i); c.removeAll(ks); } catch (e) {} }
/** تکه‌های نمایه: [{id,url,title,text,dom,aud,src}] با کش ۶ ساعته (تکه‌تکه، هر کلید زیر ۹۰ کیلوبایت) */
function asIdx_() {
  if (AS_IDX_MEMO) return AS_IDX_MEMO;
  var rows = null;
  if (asDry_()) rows = TG_MEM['as:idxrows'] || [];
  else {
    var c = CacheService.getScriptCache();
    try { var n = Number(c.get('askidx:n') || 0); if (n) { var ks = []; for (var i = 0; i < n; i++) ks.push('askidx:' + i); var got = c.getAll(ks); if (Object.keys(got).length === n) rows = ks.map(function (k) { return got[k]; }).join(''); rows = rows ? JSON.parse(rows) : null; } } catch (e) { rows = null; }
    if (!rows) {
      var sh = tgSS_().getSheetByName(AS_IDX_TAB), m = sh ? sh.getLastRow() : 0;
      rows = m > 1 ? sh.getRange(2, 1, m - 1, 7).getValues().map(function (r) { return r.map(String); }) : [];
      try { var j = JSON.stringify(rows), parts = {}, k = 0; for (var o = 0; o < j.length; o += 90000) parts['askidx:' + (k++)] = j.slice(o, o + 90000); parts['askidx:n'] = String(k); c.putAll(parts, 21600); } catch (e2) {}
    }
  }
  AS_IDX_MEMO = rows.map(function (r) { return { id: r[0], url: r[1], title: r[2], text: r[3], dom: r[4], aud: r[5], src: r[6] || 'سایت' }; }).filter(function (x) { return asIdxOk_(x); });
  return AS_IDX_MEMO;
}
/** رویدادهای پیش‌روی بات به شکل تکه (همان دادهٔ tgApiEvents162_، کش ۱۵ دقیقه‌ای خودش) */
function asEvChunks_() {
  try {
    var r = asDry_() && TG_MEM['as:events'] ? { events: TG_MEM['as:events'] } : tgApiEvents162_({}), today = asToday_();
    return ((r && r.events) || []).filter(function (e) { return e.dateIso && e.dateIso >= today; }).map(function (e) {
      return { id: 'ev-' + e.code, url: AS_SITE + '/school/events/#ev=' + encodeURIComponent(e.code), title: e.title, text: [e.title, e.date, e.time ? 'ساعت ' + e.time : '', e.desc || '', e.intro || ''].filter(String).join(' · ').slice(0, 600), dom: 'رویدادها', aud: 'کاربر عمومی', src: 'رویداد' };
    }).filter(asIdxOk_);
  } catch (e) { return []; }
}
/** پاسخ از منبع منتشرشده: سه تکهٔ برتر؛ جمنای (اگر ASSIST_REWRITE) پاسخ کوتاه با گارد می‌سازد، وگرنه بخشی از متن تکهٔ اول */
var AS_COMPOSE_SCHEMA = { type: 'OBJECT', properties: { text: { type: 'STRING' }, i: { type: 'INTEGER' }, none: { type: 'BOOLEAN' } }, required: ['text', 'i', 'none'] };
function asSiteAnswer_(ctx, text) {
  var docs = asIdx_().concat(asEvChunks_()); if (!docs.length) return null;
  var kb = docs.map(function (d, i) { return { row: i, topic: d.title, samples: [d.text], answer: '' }; });
  var res = asSearch_(text, kb).filter(function (r) { return r.score >= asIdxMin_(); }).slice(0, 3);
  if (!res.length) return null;
  var top = res.map(function (r) { return docs[r.k.row]; }), pick = top[0], ans = '';
  if (asRewriteOn_() && asGemLeft_() > 0) {
    try {
      var q = asScrub_(text, [ctx.name]);
      var prompt = 'به پرسش زیر فقط از روی این متن‌های منتشرشدهٔ سایت مرکز تجربه زندگی، کوتاه (حداکثر سه جمله) و فارسی جواب بده. ' +
        'هیچ عدد، نشانی، لینک، نام یا اطلاعاتی که در متن‌ها نیست اضافه نکن. مشاورهٔ بالینی، تشخیص یا دارو نده. خط تیرهٔ بلند ننویس. ' +
        'اگر متن‌ها جواب نمی‌دهند none = true. i شمارهٔ متنی است که بیشتر از آن استفاده کردی.\n\nپرسش: ' + q + '\n\n' +
        top.map(function (d, i) { return i + ') ' + d.title + '\n' + d.text; }).join('\n\n');
      var o = asGem_('پاسخ از منبع سایت', prompt, AS_COMPOSE_SCHEMA);
      var t = String((o && o.text) || '').replace(/[—–]/g, '،').trim();
      if (o && o.none) return null;
      if (t && asRwSafe_(t, top.map(function (d) { return d.title + ' ' + d.text; }).join(' '))) { ans = t; if (o.i >= 0 && o.i < top.length) pick = top[o.i]; }
      else if (asDry_()) (TG_MEM['as:rwreject'] = TG_MEM['as:rwreject'] || []).push(t);
    } catch (e) { if (!asDry_()) tgErr_('asSiteAnswer_', e); }
  }
  if (!ans) { ans = pick.text.length > 360 ? pick.text.slice(0, 360).replace(/\s+\S*$/, '') + '…' : pick.text; }
  ctx.src = pick.src === 'رویداد' ? 'سایت' : 'سایت';
  var log = asLog_(ctx.channel, pick.dom || 'سایت', asMode_(), 'پاسخ', ctx);
  return { answer: ans, topic: pick.dom || '', handoff: false, log: log, source: pick.url,
    buttons: [{ url: pick.url, text: ('📖 ' + String(pick.title).split(' › ')[0]).slice(0, 40) }, { id: 'x:' + log, text: 'جوابم را نگرفتم' }, { id: 'y:' + log, text: '👍' }, { id: 'n:' + log, text: '👎' }] };
}
/** خط شبانهٔ نمایه: شمار، تازه، حذف‌شده و درصد پاسخ‌های امروز از سایت و از دانش تأییدشده */
function asIdxNightLine_() {
  var st = {}; try { st = JSON.parse(asProp_('AS_IDX_STAT') || '{}') || {}; } catch (e) {}
  var day = Utilities.formatDate(new Date(asNow_()), TG_TZ, 'yyyy-MM-dd');
  var L = asTab_(AS_LOG_TAB, AS_LOG_HEAD).rows.filter(function (o) { return String(o['زمان'] || '').slice(0, 10) === day && o['نتیجه'] === 'پاسخ'; });
  var site = L.filter(function (o) { return o['منبع پاسخ'] === 'سایت'; }).length, kb = L.filter(function (o) { return o['منبع پاسخ'] === 'دانش'; }).length;
  if (!st.n && !L.length) return '';
  return '📚 نمایهٔ دانش: ' + tgFa_(st.n || 0) + ' تکه' + (st.at ? ' (' + tgFa_(String(st.at).slice(5)) + ')' : '') + ' · تازه ' + tgFa_(st.added || 0) + ' · حذف‌شده ' + tgFa_(st.removed || 0) +
    (L.length ? ' · پاسخ‌های امروز: ' + tgFa_(Math.round(100 * site / L.length)) + '٪ از سایت، ' + tgFa_(Math.round(100 * kb / L.length)) + '٪ از دانش تأییدشده' : '');
}
try { TG_NIGHT_LINES.push(asIdxNightLine_); } catch (eNl2) {}
/** پیش‌نویس ردیف «دانش دستیار» از پرتکرارهای بی‌جواب و نزدیک‌ترین تکهٔ نمایه (بی جمنای)؛ «تأیید» خالی، منبع همان نشانی */
function asDraftFromIdx_(items) {
  var docs = asIdx_(); if (!docs.length || !items || !items.length) return 0;
  var kb = docs.map(function (d, i) { return { row: i, topic: d.title, samples: [d.text], answer: '' }; }), t = asTab_(AS_KB_TAB, AS_KB_HEAD), have = {}, n = 0;
  t.rows.forEach(function (o) { have[asQKey_(String(o['پرسش‌های نمونه'] || '').split('\n')[0])] = 1; });
  items.slice(0, 10).forEach(function (x) {
    var q = asScrub_(x.q), k = asQKey_(q); if (!k || have[k]) return;
    var top = asSearch_(q, kb)[0]; if (!top || top.score < asIdxMin_()) return;
    var d = docs[top.k.row];
    t.add({ 'موضوع': q.slice(0, 40), 'پرسش‌های نمونه': q, 'پاسخ': d.text, 'منبع': d.url, 'تأیید': '', 'حوزه': d.dom || x.dom || '', 'تیم تأیید': asDomTeam_(d.dom || x.dom || ''), 'نسخه': 1,
      'یادداشت بازبینی': 'پیش‌نویس از نمایهٔ سایت (متن منتشرشده)؛ بخوان، کوتاه کن و تأیید کن' });
    have[k] = 1; n++;
  });
  return n;
}
try {
  PB_ACTIONS.kb_index = function (p, dry) { return asIdxIngest_(p, dry); };
  PB_RATE_BUCKET.kb_index = ['kbi', 'kb_index_hourly_max', 40];
  if (PB_WRITE.indexOf('kb_index') < 0) PB_WRITE.push('kb_index');
} catch (eKbi) {}

/* ───── موتور لبه (v170.23.24، تصمیم یاسر) ─────
   پاسخ زنده از ورکر کلادفلر (edge/assist)، نه از اپس‌اسکریپت: ورکر هر ۳۰ دقیقه و بعد از هر تأیید یا تعویض نمایه، دادهٔ عمومی
   دستیار را با as_dump می‌گیرد و در KV نگه می‌دارد، و گزارش‌ها را دسته‌ای با as_log پس می‌فرستد. هر دو فقط با کلید دوم درگاه.
   در as_dump فقط چیزی است که دستیار به هر بازدیدکننده می‌گوید: ردیف‌های تأییدشده، تکه‌های منتشرشدهٔ سایت، رویدادهای پیش‌رو،
   واژه‌ها و پیام ثابت بحران، و چند تنظیم. بی نام، شماره، chat_id یا شناسهٔ داخلی. «وضعیت من» و هر چیز هویتی فقط در بات. */
cfg_('ASSIST_EDGE_URL', '');      /* v170.23.24: نشانی ورکر دستیار (https://…)؛ خالی = بی پینگ */
var AS_EDGE_MAX_LOG = 40;
function asEdgeDump_(p) {
  if (typeof ebiKey2Ok_ === 'function' && !ebiKey2Ok_(p && p.key)) return { ok: false, error: 'key2_only' };
  var today = asToday_(), ev = [];
  try {
    var r = asDry_() && TG_MEM['as:events'] ? { events: TG_MEM['as:events'] } : tgApiEvents162_({});
    ev = ((r && r.events) || []).filter(function (e) { return e.dateIso && e.dateIso >= today; })
      .sort(function (a, b) { return a.dateIso < b.dateIso ? -1 : a.dateIso > b.dateIso ? 1 : 0; }).slice(0, 12)
      .map(function (e) { return { code: String(e.code || ''), title: String(e.title || ''), date: String(e.date || ''), time: String(e.time || ''), iso: String(e.dateIso || '') }; });
  } catch (e) {}
  var kb = asKb_();
  return { ok: true, data: {
    v: typeof TG_CODE_VERSION !== 'undefined' ? TG_CODE_VERSION : '', at: asFmt_(),
    on: asOn_(), mode: asMode_(), tools: asToolsOn_(), rewrite: asRewriteOn_(), gem_daily: asGemCap_(), min: asMin_(), idx_min: asIdxMin_(),
    kb: kb.map(function (k) { return { r: k.row, t: k.topic, s: k.samples, a: k.answer, au: k.aud, d: k.dom }; }),
    topics: asTopics_(kb),
    idx: asIdx_().map(function (d) { return [d.id, d.url, d.title, d.text, d.dom, d.aud, d.src]; }),
    events: ev,
    crisis: { words: TG_CRISIS_WORDS.slice(), text: T_CRISIS },
    texts: { welcome: AS_WELCOME, handed: AS_HANDED, bot: AS_BOT_LINK },
    deny: AS_DENY.source, money: AS_IDX_MONEY.source
  } };
}
/* گزارش ورکر: {entries: [{k: 'log'|'un'|'rate'|'handoff'|'gem', ...}]}، حداکثر AS_EDGE_MAX_LOG در هر فراخوان */
function asEdgeLog_(p, dry) {
  if (typeof ebiKey2Ok_ === 'function' && !ebiKey2Ok_(p && p.key)) return { ok: false, error: 'key2_only' };
  var L = Array.isArray(p.entries) ? p.entries.slice(0, AS_EDGE_MAX_LOG) : [], n = 0;
  if (dry) return { ok: true, data: { would: L.length } };
  var cl = function (s, m) { return String(s == null ? '' : s).slice(0, m); };
  L.forEach(function (x) {
    try {
      var ch = cl(x.ch || 'site', 20).replace(/[^\w-]/g, '') || 'site';
      var ctx = { channel: ch, audience: cl(x.au, 30), src: cl(x.src, 10), logId: cl(x.id, 20), t0: Date.now() - Math.max(0, Math.min(60000, Number(x.ms) || 0)) };
      if (x.k === 'log') { asLog_(ch, cl(x.topic, 80), cl(x.mode || 'لبه', 20), cl(x.res, 20), ctx); n++; }
      else if (x.k === 'un') { asUnanswered_(ch, cl(x.text, 500), [], cl(x.kind || 'بی‌پاسخ', 30), ctx); n++; }
      else if (x.k === 'rate') { if (asRate_(cl(x.id, 20), x.good === true)) n++; }
      else if (x.k === 'handoff') { asHandoff_({ channel: ch, session: cl(x.sid, 64) }, cl(x.text, 500), cl(x.why || 'خواست با پذیرش حرف بزند', 60)); n++; }
      else if (x.k === 'gem') { if (!asDry_()) asTab_(AS_COST_TAB, AS_COST_HEAD).add({ 'زمان': asFmt_(), 'کار': 'ورکر · ' + cl(x.job, 40), 'مدل': cl(x.model, 40), 'توکن ورودی': Number(x.tin) || 0, 'توکن خروجی': Number(x.tout) || 0 }); n++; }
    } catch (e) { tgErr_('asEdgeLog_', e); }
  });
  return { ok: true, data: { n: n } };
}
/* بعد از تأیید و تعویض نمایه: ورکر دادهٔ تازه را بگیرد (بی رمز؛ ورکر خودش دقیقه‌ای یک بار می‌پذیرد) */
function asEdgePing_() {
  var u = String(cfg_('ASSIST_EDGE_URL', '') || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[\w.-]+(?:\/[\w./-]*)?$/.test(u)) return false;
  if (asDry_()) { (TG_MEM['as:edgeping'] = TG_MEM['as:edgeping'] || []).push(u); return true; }
  try { UrlFetchApp.fetch(u + '/assist/refresh', { method: 'post', muteHttpExceptions: true, followRedirects: false }); return true; } catch (e) { return false; }
}
try {
  PB_ACTIONS.as_dump = function (p) { return asEdgeDump_(p); };
  PB_ACTIONS.as_log = function (p, dry) { return asEdgeLog_(p, dry); };
  PB_RATE_BUCKET.as_dump = ['asd', 'as_dump_hourly_max', 30];
  PB_RATE_BUCKET.as_log = ['asl', 'as_log_hourly_max', 400];
  if (PB_WRITE.indexOf('as_log') < 0) PB_WRITE.push('as_log');
} catch (eEdge) {}

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
  if (tgGetVal_('asa', chat) && t) return asTeamAnsText_(chat, t);
  if (t === '/askreview') { asReviewNext_(chat); return true; }
  if (!tgGetVal_('asq', chat) || !t || t.indexOf('/') === 0 || (typeof tgIsBtnLike_ === 'function' && tgIsBtnLike_(t)) || (typeof tgLooksLikePhone_ === 'function' && tgLooksLikePhone_(t))) return false;
  if (tgIsCrisis_(t) && typeof tgOnCrisis_ === 'function') { tgDel_('asq', chat); asLog_('bot', 'بحران', asMode_(), 'بحران', asCtxBot_(chat, name)); tgOnCrisis_(chat, name, m.from && m.from.username ? '@' + m.from.username : '', t); return true; }
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
  if (/^ra:/.test(id)) return asTeamAnsCb_(chat, id.slice(3));   /* v170.23.17: «پاسخ می‌دهم» از گزارش هفتگی */
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
  return asJson_({ ok: true, answer: out.answer, topic: out.topic || '', handoff: !!out.handoff, buttons: out.buttons || [], log_id: out.log || '', source: out.crisis || out.handoff ? '' : (ctx.src || ''), source_url: ctx.src === 'سایت' ? (out.source || '') : '' });   /* v170.23.19: قرارداد پل بخش ۹ */
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
    if (!String(o['پاسخ'] || '').trim()) return tgSend_(chat, 'این ردیف هنوز پاسخ ندارد؛ اول «✏️ اصلاح پاسخ».');   /* v170.23.18 */
    t.set(r, 'تأیید', 'بله'); t.set(r, 'تاریخ تأیید', asFmt_()); t.set(r, 'تأییدکننده', asStaffName_(chat)); t.set(r, 'تاریخ بازبینی', asFmt_());
    if (!o['نسخه']) t.set(r, 'نسخه', 1);
    asEdgePing_();
    return asReviewNext_(chat, r);
  }
  if (act === 'no') { t.set(r, 'تأیید', 'کنار'); t.set(r, 'تأییدکننده', asStaffName_(chat)); t.set(r, 'تاریخ بازبینی', asFmt_()); asEdgePing_(); return asReviewNext_(chat, r); }
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
  var ms = L.filter(function (o) { return String(o['میلی‌ثانیه']) !== ''; }).map(function (o) { return Number(o['میلی‌ثانیه']); }).filter(function (x) { return x >= 0; }).sort(function (a, b) { return a - b; });
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
    TG_MEM['notify'] = []; TG_MEM['as:handoff'] = [];
    var r3 = asAsk_({ channel: 'web', session: 's1', country: 'DE' }, 'قیمت جلسه چقدر است، می‌خواهم خودکشی کنم');
    ok('بحران پیش از تطبیق: فقط پیام ثابت اورژانس (v170.23.19)', r3.crisis && r3.answer === T_CRISIS && /۱۲۳/.test(r3.answer) && /۱۱۵/.test(r3.answer) && /۱۴۸۰/.test(r3.answer) && !r3.handoff && !r3.buttons.length, JSON.stringify(r3));
    ok('بحران: بی کارت فوری و بی تحویل به پذیرش', !(TG_MEM['notify'] || []).length && !(TG_MEM['as:handoff'] || []).length, JSON.stringify(TG_MEM['notify']));
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

/* ───── آزمون دستیار ۴ · یادگیری مداوم (v170.23.17) ───── */
function asTests4() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT, names: asKnownNames_ };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'as:now': new Date('2026-10-10T11:00:00+03:30').getTime(), 'as:desk': ['801'] };   /* شنبه ۱۸ مهر */
  TG_CFG_ = { ASSIST_ENABLED: 'بله' }; TG_OWNER_CHAT = '9001';
  try {
    asKnownNames_ = function () { return []; };
    TG_MEM['as:' + AS_KB_TAB] = [
      { 'موضوع': 'قیمت', 'پرسش‌های نمونه': 'هزینه جلسه', 'پاسخ': 'پاسخ نمونهٔ قیمت', 'تأیید': 'بله', 'حوزه': 'تراپی و پذیرش', 'تیم تأیید': 'پذیرش', 'تاریخ بازبینی': '2026-10-01 10:00' },
      { 'موضوع': 'رسید', 'پرسش‌های نمونه': 'رسید پرداخت می‌خواهم', 'پاسخ': 'پاسخ نمونهٔ رسید', 'تأیید': 'بله', 'حوزه': 'پرداخت', 'تیم تأیید': 'مالی', 'تاریخ تأیید': '2026-06-01 10:00' }
    ];
    TG_MEM['people'] = [{ id: 'P-7', name: 'مالی نمونه', chat: '802', roles: ['مالی'], status: 'فعال' }, { id: 'P-8', name: 'مدرسه نمونه', chat: '803', roles: ['مدرسه'], status: 'فعال' }];
    /* الف) ثبت با حوزهٔ حدس‌زده */
    asAsk_({ channel: 'site', session: 's1' }, 'پیش‌نیاز دورهٔ مقدماتی چیست؟');
    asAsk_({ channel: 'site', session: 's2' }, 'پیش نیاز دوره مقدماتی چیه');
    asAsk_({ channel: 'bot', chat: '601' }, 'بازگشت وجه چطور است');
    var r = asAsk_({ channel: 'bot', chat: '602' }, 'هزینه جلسه');
    asTap_({ channel: 'bot', chat: '602' }, 'x:' + r.log, 'هزینهٔ جلسهٔ خانم نمونه‌پور چند است');
    var U = TG_MEM['as:' + AS_UN_TAB];
    ok('بی‌پاسخ‌ها با حوزه (واژهٔ کلیدی)', U[0]['حوزه'] === 'مدرسه و دوره‌ها' && U[2]['حوزه'] === 'پرداخت', JSON.stringify(U.map(function (o) { return o['حوزه']; })));
    ok('«جوابم را نگرفتم» با نوع و حوزه از نزدیک‌ترین ردیف', U[3]['نوع'] === 'جوابم را نگرفتم' && U[3]['حوزه'] === 'تراپی و پذیرش' && U[3]['متن'].indexOf('نمونه‌پور') < 0, JSON.stringify(U[3]));
    ok('هیچ متنی به جمنای نرفت', !(TG_MEM['as:gemcalls'] || []).length);
    /* ب و ج) گزارش هفتگی */
    ok('کلید خاموش: گزارش نمی‌رود', asWeeklyMaybe_() === 0);
    TG_CFG_.ASSIST_WEEKLY = 'بله'; TG_MEM['notify'] = [];
    var n = asWeeklyMaybe_();
    var to = function (c) { return (TG_MEM['notify'] || []).filter(function (x) { return x.chat === c; }); };
    ok('گزارش برای مدرسه، مالی و پذیرش', n >= 3 && to('803').length === 1 && to('802').length === 1 && to('801').length === 1, JSON.stringify((TG_MEM['notify'] || []).map(function (x) { return x.chat; })));
    ok('مدرسه: پرتکرار با شمار ۲ (دو شکل یک پرسش)', /پیش.?نیاز/.test(to('803')[0].text) && /۲ بار/.test(to('803')[0].text), to('803')[0].text);
    ok('مالی: ردیف بیش از ۹۰ روز بازبینی‌نشده', /بیش از ۹۰ روز/.test(to('802')[0].text) && /رسید/.test(to('802')[0].text), to('802')[0].text);
    ok('پذیرش: ردیف تازه‌بازبینی‌شده نمی‌آید', !/بیش از ۹۰ روز/.test(to('801')[0].text), to('801')[0].text);
    ok('همان هفته دوباره نمی‌رود', asWeeklyMaybe_() === 0);
    /* پاسخ تیم */
    var store = JSON.parse(TG_MEM['asp:AS_WK_Q']), id = Object.keys(store).filter(function (k) { return store[k].team === 'مدرسه'; })[0];
    TG_OUTBOX = []; asTeamAnsCb_('801', id);
    ok('عضو تیم دیگر نمی‌تواند پاسخ بدهد', /مال تیم مدرسه/.test(TG_OUTBOX[0].text));
    asTeamAnsCb_('803', id);
    ok('عضو مدرسه: منتظر پاسخ', tgGetVal_('asa', '803') === id);
    var kb0 = TG_MEM['as:' + AS_KB_TAB].length;
    asRoute_('803', { text: 'پاسخ نمونهٔ تیم مدرسه', from: {} });
    var nr = TG_MEM['as:' + AS_KB_TAB][kb0] || {};
    ok('ردیف تازه با تأیید خالی، منبع «پاسخ تیم»، تیم مدرسه', nr['پاسخ'] === 'پاسخ نمونهٔ تیم مدرسه' && nr['تأیید'] === '' && nr['منبع'] === 'پاسخ تیم' && nr['تیم تأیید'] === 'مدرسه' && nr['نسخه'] === 1, JSON.stringify(nr));
    ok('ردیف تازه هنوز جواب نمی‌دهد', asKb_().every(function (k) { return k.answer !== 'پاسخ نمونهٔ تیم مدرسه'; }));
    TG_MEM['as:now'] = new Date('2026-10-11T11:00:00+03:30').getTime();
    ok('یکشنبه گزارش نمی‌رود', asWeeklyMaybe_() === 0);
    ok('قدم سبک واچ‌داگ', /asWeeklyMaybe_/.test(String(tgWatchdog)));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { asKnownNames_ = keep.names; TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'asTests4'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['دستیار ۴ · یادگیری (v170.23.17)', 'asTests4']); } catch (eAs4) {}

/* ───── آزمون دستیار ۵ · جمنای با گارد (v170.23.18) ───── */
function asTests5() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT, names: asKnownNames_ };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'as:now': new Date('2026-10-10T11:00:00+03:30').getTime(), 'as:desk': ['801'] };
  TG_CFG_ = { ASSIST_ENABLED: 'بله', ASSIST_MATCH_MIN: '0.3' }; TG_OWNER_CHAT = '9001';
  try {
    asKnownNames_ = function () { return []; };
    TG_MEM['as:' + AS_KB_TAB] = [{ 'موضوع': 'معارفه', 'پرسش‌های نمونه': 'جلسهٔ معارفه چیست\nمعارفه رایگان است', 'پاسخ': 'معارفه ۲۰ دقیقه و رایگان است. نمونهٔ پاسخ تأییدشده.', 'تأیید': 'بله' }];
    var ask = function () { return asAsk_({ channel: 'bot', chat: '601', name: 'مراجع نمونه' }, 'معارفه رایگان است؟ من خانم نمونه‌پور هستم'); };
    TG_MEM['as:gem'] = { text: 'معارفه رایگان است و ۲۰ دقیقه طول می‌کشد.' }; TG_MEM['as:gemcalls'] = [];
    ok('کلیدها خاموش: متن خود ردیف، بی جمنای', ask().answer === 'معارفه ۲۰ دقیقه و رایگان است. نمونهٔ پاسخ تأییدشده.' && TG_MEM['as:gemcalls'].length === 0);
    TG_CFG_.ASSIST_REWRITE = 'بله';   /* v170.23.19: بی PAID هم (نسخهٔ رایگان) */
    ok('روان کردن مجاز: همان عدد ۲۰، بی چیز تازه', ask().answer === 'معارفه رایگان است و ۲۰ دقیقه طول می‌کشد.');
    var sent = TG_MEM['as:gemcalls'][0].prompt;
    ok('به جمنای فقط پرسش پاک‌شده و متن ردیف', sent.indexOf('نمونه‌پور') < 0 && sent.indexOf('معارفه ۲۰ دقیقه') > -1, sent);
    TG_MEM['as:gem'] = { text: 'معارفه ۳۰ دقیقه و رایگان است.' };
    ok('خروجی جعلی با عدد تازه رد می‌شود، متن ردیف می‌رود', ask().answer === 'معارفه ۲۰ دقیقه و رایگان است. نمونهٔ پاسخ تأییدشده.' && (TG_MEM['as:rwreject'] || []).length === 1);
    TG_MEM['as:gem'] = { text: 'معارفه ۲۰ دقیقه است؛ نشانی ما tajrobeh.life/x است.' };
    ok('نشانی تازه رد می‌شود', ask().answer.indexOf('نمونهٔ پاسخ تأییدشده') > -1);
    TG_MEM['as:gem'] = { text: 'معارفه ۲۰ دقیقه با دکتر آزمونی است.' };
    ok('نام تازه بعد از عنوان رد می‌شود', ask().answer.indexOf('نمونهٔ پاسخ تأییدشده') > -1);
    TG_MEM['as:gem'] = { text: 'Contact Sample for the 20 minute session.' };
    ok('نام لاتین تازه رد می‌شود', ask().answer.indexOf('نمونهٔ پاسخ تأییدشده') > -1);
    ok('گارد مستقیم: عدد تازه ناامن، همان عدد امن', !asRwSafe_('هزینه ۹۹۰ هزار است', 'هزینه در تماس گفته می‌شود') && asRwSafe_('۲۰ دقیقه است', 'جلسه 20 دقیقه است'));
    /* سقف روزانه */
    TG_CFG_.ASSIST_GEMINI_DAILY = '3'; TG_MEM['as:gem'] = { text: 'معارفه رایگان است و ۲۰ دقیقه طول می‌کشد.' };
    var used = asGemUsed_();
    ok('شمار فراخوانی‌های امروز ثبت می‌شود', used >= 3, used);
    TG_MEM['as:gemcalls'] = [];
    ok('بالای سقف: متن ردیف، بی فراخوانی', ask().answer.indexOf('نمونهٔ پاسخ تأییدشده') > -1 && TG_MEM['as:gemcalls'].length === 0);
    TG_CFG_.ASSIST_MODE = 'هوشمند';
    ok('بالای سقف: «هوشمند» به «جستجو» برمی‌گردد', asMode_() === AS_MODES.search);
    TG_CFG_.ASSIST_GEMINI_DAILY = '50'; TG_CFG_.ASSIST_MODE = '';
    /* پیش‌نویس از بی‌جواب‌ها */
    TG_MEM['as:gem'] = [{ topic: 'رسید پرداخت', samples: ['رسید می‌خواهم', 'فاکتور جلسه'], dom: 'پرداخت' }];
    var items = [{ q: 'رسید پرداخت خانم نمونه‌پور را می‌خواهم' }, { q: 'فاکتور جلسه' }];
    ok('پیش‌نویس بی کلید نمی‌سازد', asDraftUn_(items) === 0);
    TG_CFG_.ASSIST_GEMINI_PAID = '';   /* v170.23.19: پیش‌نویس هم بی PAID */
    TG_CFG_.ASSIST_GEMINI_DRAFT = 'بله'; TG_MEM['as:gemcalls'] = [];
    var n0 = TG_MEM['as:' + AS_KB_TAB].length, made = asDraftUn_(items), nr = TG_MEM['as:' + AS_KB_TAB][n0] || {};
    ok('پیش‌نویس: موضوع و پرسش‌ها، پاسخ خالی، تأیید خالی، تیم مالی', made === 1 && nr['پاسخ'] === '' && nr['تأیید'] === '' && nr['تیم تأیید'] === 'مالی' && nr['منبع'] === 'پیش‌نویس از پرسش‌های بی‌جواب', JSON.stringify(nr));
    ok('به جمنای فقط متن پاک‌شده', TG_MEM['as:gemcalls'][0].prompt.indexOf('نمونه‌پور') < 0);
    TG_MEM['deskwho'] = null; TG_OUTBOX = []; asReviewCb_('9001', 'ok:' + nr._row);
    ok('ردیف بی پاسخ تأیید نمی‌شود', nr['تأیید'] === '' && /هنوز پاسخ ندارد/.test(TG_OUTBOX[0].text));
    ok('ردیف بی پاسخ هرگز جواب نمی‌دهد', asKb_().every(function (k) { return k.answer; }));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { asKnownNames_ = keep.names; TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'asTests5'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['دستیار ۵ · جمنای با گارد (v170.23.18)', 'asTests5']); } catch (eAs5) {}

/* ───── آزمون دستیار ۷ · نمایهٔ سایت (v170.23.19) ───── */
function asTests7() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, names: asKnownNames_, memo: AS_IDX_MEMO };
  TG_DRY = true; TG_OUTBOX = []; AS_IDX_MEMO = null;
  TG_MEM = { 'as:now': new Date('2026-10-10T11:00:00+03:30').getTime(), 'as:desk': ['801'], 'pb:key2': 'k2-ساختگی-برای-آزمون-خشک-0123456789', 'as:events': [] };
  TG_CFG_ = { ASSIST_ENABLED: 'بله', ASSIST_MATCH_MIN: '0.6' };
  try {
    asKnownNames_ = function () { return []; };
    TG_MEM['as:' + AS_KB_TAB] = [{ 'موضوع': 'معارفه', 'پرسش‌های نمونه': 'جلسهٔ معارفه چیست', 'پاسخ': 'معارفه رایگان است. نمونهٔ پاسخ تأییدشده.', 'تأیید': 'بله' }];
    var K = TG_MEM['pb:key2'], S = 'https://tajrobeh.life';
    var clinic = { id: 'c1', url: S + '/clinic/', title: 'کلینیک حضوری', text: 'کلینیک حضوری تجربه در تهران است و جلسه‌های حضوری از شنبه تا پنجشنبه برگزار می‌شود. نمونهٔ متن ساختگی.', dom: 'حضوری', aud: 'مراجع' };
    var course = { id: 's1', url: S + '/school/', title: 'مدرسهٔ تجربه', text: 'دوره‌های مدرسهٔ تجربه برای دانشجویان روان‌شناسی با سوپرویژن گروهی برگزار می‌شود. نمونهٔ متن ساختگی.', dom: 'مدرسه و دوره‌ها', aud: 'دانشجو' };
    var money = { id: 'm1', url: S + '/joinus/', title: 'همکاری', text: 'درصد سهم درمانگر از هر جلسه و زمان تسویه در قرارداد همکاری آمده است. نمونهٔ متن ساختگی.', dom: 'همکاری درمانگران و پارتنرها', aud: 'متقاضی همکاری' };
    var foreign = { id: 'f1', url: 'https://example.com/x', title: 'بیرونی', text: 'متن بیرونی که نباید وارد شود چون نشانی‌اش بیرون از سایت است. ساختگی.', dom: '', aud: '' };
    ok('کلید اول یا خالی رد می‌شود', asIdxIngest_({ key: 'x', run: '202610101100', part: 1, of: 1, chunks: [clinic] }).error === 'key2_only');
    var d = asIdxIngest_({ key: K, run: '202610101100', part: 1, of: 2, chunks: [clinic, money, foreign] }, true);
    ok('اجرای خشک درگاه فقط می‌شمارد', d.ok && d.data.would === 1 && d.data.dropped === 2 && !(TG_MEM['as:idxrows'] || []).length, JSON.stringify(d));
    var r1 = asIdxIngest_({ key: K, run: '202610101100', part: 1, of: 2, chunks: [clinic, money, foreign] });
    var r2 = asIdxIngest_({ key: K, run: '202610101100', part: 2, of: 2, chunks: [course] });
    ok('دور اول دو تکه‌ای: متن مالی و نشانی بیرونی رد، دو تکه تازه', r1.ok && r1.data.dropped === 2 && r2.ok && r2.data.n === 2 && r2.data.added === 2 && r2.data.removed === 0, JSON.stringify([r1, r2]));
    ok('صفحهٔ تازه جواب می‌دهد، با لینک صفحه', (function () { var a = asAsk_({ channel: 'bot', chat: '601' }, 'کلینیک حضوری کجاست؟'); return a.source === S + '/clinic/' && a.buttons[0].url === S + '/clinic/' && /کلینیک حضوری/.test(a.answer); })());
    ok('منبع پاسخ در گزارش «سایت» است', TG_MEM['as:' + AS_LOG_TAB].slice(-1)[0]['منبع پاسخ'] === 'سایت');
    ok('دانش تأییدشده پیش از سایت', asAsk_({ channel: 'bot', chat: '601' }, 'جلسهٔ معارفه چیست').answer.indexOf('نمونهٔ پاسخ تأییدشده') > -1);
    var r3 = asIdxIngest_({ key: K, run: '202610102300', part: 1, of: 1, chunks: [course] });
    ok('دور دوم بی کلینیک: حذف‌شده ۱', r3.data.n === 1 && r3.data.removed === 1 && r3.data.added === 0, JSON.stringify(r3));
    var a2 = asAsk_({ channel: 'bot', chat: '601' }, 'کلینیک حضوری کجاست؟');
    ok('صفحهٔ حذف‌شده دیگر جواب نمی‌دهد', a2.source !== S + '/clinic/' && /پیدا نکردم/.test(a2.answer), a2.answer);
    ok('دور خالی نمایهٔ قبلی را پاک نمی‌کند', asIdxIngest_({ key: K, run: '202610110300', part: 1, of: 1, chunks: [] }).data.error && asIdx_().length === 1);
    TG_MEM['as:idxrows'].push(['m1', money.url, money.title, money.text, money.dom, money.aud, 'سایت', '', '202610102300']); AS_IDX_MEMO = null;
    var a3 = asAsk_({ channel: 'bot', chat: '601' }, 'درصد سهم درمانگر و تسویه چقدر است؟');
    ok('متن مالی محرمانه حتی اگر در نمایه بماند جواب داده نمی‌شود', !a3.source && a3.answer.indexOf('درصد') < 0, a3.answer);
    /* جمنای (نسخهٔ رایگان) با گارد */
    TG_CFG_.ASSIST_REWRITE = 'بله'; TG_CFG_.ASSIST_GEMINI_DAILY = '20';
    TG_MEM['as:gem'] = { text: 'دوره‌های مدرسه برای دانشجویان روان‌شناسی با سوپرویژن گروهی است.', i: 0, none: false }; TG_MEM['as:gemcalls'] = [];
    var g1 = asAsk_({ channel: 'bot', chat: '601', name: 'مراجع نمونه' }, 'دوره‌های مدرسهٔ تجربه برای دانشجویان؟ من خانم نمونه‌پور هستم');
    ok('پاسخ کوتاه جمنای از سه تکهٔ برتر، با لینک منبع', g1.answer === TG_MEM['as:gem'].text && g1.source === S + '/school/', g1.answer);
    ok('به جمنای فقط پرسش پاک‌شده و متن منتشرشده', TG_MEM['as:gemcalls'][0].prompt.indexOf('نمونه‌پور') < 0 && TG_MEM['as:gemcalls'][0].prompt.indexOf('سوپرویژن گروهی') > -1);
    TG_MEM['as:gem'] = { text: 'دوره‌ها ۱۲ جلسه است و با ۰۹۱۲۰۰۰۰۰۰۰ هماهنگ کنید.', i: 0, none: false }; TG_MEM['as:rwreject'] = [];   // pii:ok ساختگی
    var g2 = asAsk_({ channel: 'bot', chat: '601' }, 'دوره‌های مدرسهٔ تجربه برای دانشجویان؟');
    ok('پاسخ جعلی با عدد تازه رد می‌شود و متن منبع می‌رود', g2.answer.indexOf('۱۲') < 0 && g2.answer.indexOf('نمونهٔ متن ساختگی') > -1 && TG_MEM['as:rwreject'].length === 1, g2.answer);
    TG_MEM['as:gemcalls'] = [];
    var c = asAsk_({ channel: 'bot', chat: '601' }, 'می‌خواهم خودکشی کنم');
    ok('بحران همیشه اول و هرگز به جمنای نمی‌رود', c.crisis && TG_MEM['as:gemcalls'].length === 0);
    TG_CFG_.ASSIST_REWRITE = '';
    /* رویدادهای بات */
    TG_MEM['as:events'] = [{ code: 'EV-T1', title: 'کارگاه نمونهٔ آزمون', date: '۲۰ مهر', dateIso: '2026-10-12', time: '۱۸:۰۰', desc: 'کارگاه ساختگی برای آزمون نمایهٔ رویدادها در مدرسه.' },
      { code: 'EV-T0', title: 'کارگاه گذشته', date: '۱ مهر', dateIso: '2026-09-23', desc: 'کارگاه ساختگی گذشته که نباید پاسخ داده شود.' }];
    var e1 = asAsk_({ channel: 'bot', chat: '601' }, 'کارگاه نمونهٔ آزمون کی است؟');
    ok('رویداد پیش‌روی بات جواب می‌دهد، رویداد گذشته نه', /#ev=EV-T1$/.test(e1.source || '') && asEvChunks_().length === 1, e1.source);
    /* خط شبانه */
    var nl = asIdxNightLine_();
    ok('خط شبانه: شمار، تازه، حذف‌شده و درصد سایت و دانش', /نمایهٔ دانش: ۱ تکه/.test(nl) && /حذف‌شده ۱/.test(nl) && /٪ از سایت/.test(nl) && /٪ از دانش تأییدشده/.test(nl), nl);
    /* پیش‌نویس از نمایه */
    var n0 = TG_MEM['as:' + AS_KB_TAB].length, made = asDraftFromIdx_([{ q: 'دوره‌های مدرسهٔ تجربه برای دانشجویان روان‌شناسی' }, { q: 'سؤال بی‌ربط درباره هوا' }]), nr = TG_MEM['as:' + AS_KB_TAB][n0] || {};
    ok('پیش‌نویس از نمایه: «تأیید» خالی و منبع روشن', made === 1 && nr['تأیید'] === '' && nr['منبع'] === S + '/school/' && /پیش‌نویس از نمایهٔ سایت/.test(nr['یادداشت بازبینی']), JSON.stringify(nr));
    ok('پیش‌نویس تأییدنشده جواب نمی‌دهد', asKb_().every(function (k) { return k.topic !== nr['موضوع']; }));
    var ver = ssVerify_; ssVerify_ = function () { return 'ok'; }; var w;
    try { w = JSON.parse(asWeb_({}, '{}', { action: 'assist.ask', channel: 'site', session_id: 'test-s1', text: 'دوره‌های مدرسهٔ تجربه برای دانشجویان؟', audience: 'دانشجو' }).getContent()); } finally { ssVerify_ = ver; }
    ok('خروجی وب: log_id، source و source_url (قرارداد پل)', w.ok && w.log_id && w.source === 'سایت' && w.source_url === S + '/school/', JSON.stringify(w));
    ok('بحران: فقط جمله‌های صریح خودکشی و آسیب به خود', ['دیگر نمی‌خواهم زنده باشم', 'نمیخوام زنده بمونم', 'می‌خواهم خودم را بکشم', 'به خودم آسیب می‌زنم', 'به خودکشی فکر می‌کنم', 'I want to kill myself'].every(tgIsCrisis_));
    var gen = ['نمی‌خواهم زندگی‌ام خراب شود', 'نمیخوام زندگی کنم اینجوری', 'الهی بمیرم برات', 'دیگه نمی‌کشم از این کار', 'قرص خوردم و خوابیدم', 'تمومش کنم این بحث را'].filter(tgIsCrisis_);
    ok('جمله‌های کلی بحران شناخته نمی‌شوند (از جمله «نمی‌خواهم زندگی‌ام خراب شود»)', gen.length === 0, gen.join(' | '));
    TG_MEM['notify'] = []; var leads0 = TG_OUTBOX.length, appended = 0, appendK = tgAppendLead_; tgAppendLead_ = function () { appended++; };
    try { TG_OUTBOX = []; tgOnCrisis_('612', 'مراجع نمونه', '', 'می‌خواهم خودکشی کنم'); } finally { tgAppendLead_ = appendK; }
    ok('مسیر بحران بات: فقط یک پیام ثابت، بی لید و بی کارت فوری', TG_OUTBOX.length === 1 && TG_OUTBOX[0].text === T_CRISIS && appended === 0 && !(TG_MEM['notify'] || []).length, JSON.stringify(TG_OUTBOX));
    ok('پیام بحران گروه همان پیام ثابت است', T_CRISIS_GROUP === T_CRISIS && TG_CRISIS_STRONG === TG_CRISIS_WORDS);
    ok('اکشن kb_index در درگاه، فقط نوشتنی', typeof PB_ACTIONS.kb_index === 'function' && PB_WRITE.indexOf('kb_index') > -1);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { asKnownNames_ = keep.names; TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; AS_IDX_MEMO = null; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'asTests7'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['دستیار ۷ · نمایهٔ سایت (v170.23.19)', 'asTests7']); } catch (eAs7) {}

/* v170.23.24: دادهٔ عمومی و گزارش ورکر لبه */
function asTests8() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, names: asKnownNames_, memo: AS_IDX_MEMO };
  TG_DRY = true; TG_OUTBOX = []; AS_IDX_MEMO = null;
  TG_MEM = { 'as:now': new Date('2026-10-10T11:00:00+03:30').getTime(), 'as:desk': ['801'], 'pb:key2': 'k2-ساختگی-برای-آزمون-خشک-0123456789', 'as:handoff': [] };
  TG_CFG_ = { ASSIST_ENABLED: 'بله', ASSIST_TOOLS: 'بله' };
  try {
    asKnownNames_ = function () { return ['نمونه نمونه‌پور']; };
    var K = TG_MEM['pb:key2'], S = 'https://tajrobeh.life';
    TG_MEM['as:' + AS_KB_TAB] = [
      { 'موضوع': 'هزینه', 'پرسش‌های نمونه': 'هزینه جلسه چقدر است', 'پاسخ': 'پاسخ تأییدشدهٔ ساختگی دربارهٔ هزینه.', 'تأیید': 'بله' },
      { 'موضوع': 'پیش‌نویس', 'پرسش‌های نمونه': 'سؤال پیش‌نویس', 'پاسخ': 'پاسخ تأییدنشده', 'تأیید': '' },
      { 'موضوع': 'همکاری', 'پرسش‌های نمونه': 'سهم درمانگر', 'پاسخ': 'درصد سهم درمانگر ساختگی', 'تأیید': 'بله' }];
    TG_MEM['as:events'] = [{ code: 'EV-T1', title: 'کارگاه نمونه', date: '۲۰ مهر', dateIso: '2026-10-12', time: '۱۸:۰۰' }, { code: 'EV-T0', title: 'کارگاه گذشته', dateIso: '2026-09-01' }];
    asIdxIngest_({ key: K, run: '202610101100', part: 1, of: 1, chunks: [{ id: 'c1', url: S + '/clinic/', title: 'کلینیک', text: 'کلینیک حضوری تجربه در تهران است و متن ساختگی برای آزمون نمایه.', dom: 'حضوری', aud: 'مراجع' }] });
    ok('as_dump فقط با کلید دوم', asEdgeDump_({ key: 'x' }).error === 'key2_only');
    var d = asEdgeDump_({ key: K }).data, j = JSON.stringify(d);
    ok('as_dump: فقط ردیف تأییدشده، بی متن مالی', d.kb.length === 1 && d.kb[0].t === 'هزینه' && JSON.stringify([d.kb, d.idx, d.topics]).indexOf('تأییدنشده') < 0 && JSON.stringify([d.kb, d.idx, d.topics]).indexOf('درصد سهم') < 0, JSON.stringify(d.kb));
    ok('as_dump: نمایه، رویداد پیش‌رو، واژه‌ها و پیام ثابت بحران', d.idx.length === 1 && d.idx[0][1] === S + '/clinic/' && d.events.length === 1 && d.events[0].code === 'EV-T1' && d.crisis.text === T_CRISIS && d.crisis.words.indexOf('خودکشی') > -1);
    ok('as_dump: بی نام شناخته‌شده و بی شماره', j.indexOf('نمونه‌پور') < 0 && !/09\d{9}/.test(tgLatinDigits_(j)) && !/@[\w.-]+\.\w{2,}/.test(j));
    ok('as_log فقط با کلید دوم', asEdgeLog_({ key: 'x', entries: [] }).error === 'key2_only');
    ok('as_log اجرای خشک فقط می‌شمارد', asEdgeLog_({ key: K, entries: [{ k: 'log' }, { k: 'log' }] }, true).data.would === 2);
    var lg = TG_MEM['as:' + AS_LOG_TAB] || [], n0 = lg.length;
    var r = asEdgeLog_({ key: K, entries: [{ k: 'log', ch: 'site', id: 'A-edge0001', topic: 'هزینه', mode: 'لبه', res: 'پاسخ', ms: 420, src: 'دانش', au: 'مراجع' }, { k: 'rate', id: 'A-edge0001', good: true },
      { k: 'un', ch: 'site', text: 'سؤال بی‌جواب از نمونه نمونه‌پور با ۰۹۱۲۳۴۵۶۷۸۹', kind: 'بی‌پاسخ' }, { k: 'handoff', ch: 'site', sid: 's-1', text: 'می‌خواهم با پذیرش حرف بزنم' }] });   // pii:ok ساختگی
    lg = TG_MEM['as:' + AS_LOG_TAB];
    var row = lg[lg.length - 1] || {};
    ok('as_log: گزارش با شناسه و زمان ورکر، رضایت روی همان شناسه', r.data.n === 4 && lg.length === n0 + 1 && row['شناسه'] === 'A-edge0001' && row['منبع پاسخ'] === 'دانش' && Number(row['میلی‌ثانیه']) >= 400 && row['رضایت'] === '👍', JSON.stringify(row));
    var un = (TG_MEM['as:' + AS_UN_TAB] || []).slice(-1)[0] || {};
    ok('as_log: بی‌پاسخ پاک‌شده (بی نام و شماره)', un['متن'] && un['متن'].indexOf('نمونه‌پور') < 0 && !/\d{6,}/.test(tgLatinDigits_(un['متن'])), un['متن']);
    ok('as_log: تحویل به پذیرش', TG_MEM['as:handoff'].length === 1);
    ok('as_log: شناسهٔ نامعتبر جایش شناسهٔ تازه', (asEdgeLog_({ key: K, entries: [{ k: 'log', id: 'x;drop', res: 'پاسخ' }] }), /^A-/.test(TG_MEM['as:' + AS_LOG_TAB].slice(-1)[0]['شناسه']) && TG_MEM['as:' + AS_LOG_TAB].slice(-1)[0]['شناسه'] !== 'x;drop'));
    var many = []; for (var i = 0; i < 60; i++) many.push({ k: 'log', res: 'پاسخ' });
    ok('as_log: حداکثر ۴۰ در هر فراخوان', asEdgeLog_({ key: K, entries: many }).data.n === AS_EDGE_MAX_LOG);
    TG_MEM['as:edgeping'] = [];
    ok('پینگ بی نشانی کاری نمی‌کند', asEdgePing_() === false && !TG_MEM['as:edgeping'].length);
    TG_CFG_.ASSIST_EDGE_URL = 'http://bad.example/x';
    ok('پینگ فقط به نشانی https', asEdgePing_() === false);
    TG_CFG_.ASSIST_EDGE_URL = 'https://edge.example.org/';
    asIdxIngest_({ key: K, run: '202610102300', part: 1, of: 1, chunks: [{ id: 'c2', url: S + '/school/', title: 'مدرسه', text: 'مدرسهٔ تجربه دوره‌های ساختگی برای آزمون نمایه دارد و متن کافی دارد.', dom: 'مدرسه و دوره‌ها', aud: 'دانشجو' }] });
    ok('تعویض نمایه ورکر را پینگ می‌کند', TG_MEM['as:edgeping'].length === 1 && TG_MEM['as:edgeping'][0] === 'https://edge.example.org');
    ok('اکشن‌های درگاه: as_dump خواندنی، as_log نوشتنی', typeof PB_ACTIONS.as_dump === 'function' && PB_WRITE.indexOf('as_dump') < 0 && PB_WRITE.indexOf('as_log') > -1 && PB_RATE_BUCKET.as_log[2] === 400);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { asKnownNames_ = keep.names; TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; AS_IDX_MEMO = null; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'asTests8'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['دستیار ۸ · دادهٔ ورکر لبه (v170.23.24)', 'asTests8']); } catch (eAs8) {}
