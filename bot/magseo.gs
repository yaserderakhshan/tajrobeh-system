/**
 * magseo.gs · v170.83 · ۲۹ مهر ۱۴۰۵ · بستهٔ سئو و بازبینی اول برای همهٔ مقاله‌های مجله (D116، بند ج لین E)
 *
 * هر شب (ساعت ۱ تا ۸ تهران، از tgWatchdog ساعتی؛ بی تریگر تازه) برای چند مقاله، اول تازه‌ها (۱۴ روز اخیر) و
 * بعد قدیمی‌ها به ترتیب ترافیک:
 * ۱) بستهٔ سئو با همان سازندهٔ درگاه انتشار (pbGemSeo_) در تب «بستهٔ سئو» هاب محتوا.
 * ۲) خودکار اعمال می‌شود، فقط اگر گیت سئو سبز بود و فقط جایی که خالی است (v170.83، INBOX E4): متای یوست و
 *    متن جایگزین تصویرها (اسنیپت tj/v1/seo-apply). متا یا alt که آدم نوشته دست نمی‌خورد؛ نسخهٔ Gemini برای متا
 *    به صف سردبیر می‌رود.
 * ۳) فقط پیشنهاد، در تب «صف سردبیر · Gemini»: تیتر سئو، پرسش‌های پرتکرار، لینک از مقاله‌های قدیمی و یافته‌های
 *    بازبینی اول (با مدل Pro و قاعده‌های بخش ۱۱ اسکیل مجله؛ خط تیره و واژهٔ ممنوع بی Gemini هم شمرده می‌شود).
 * ۴) ساعت ۱۰ یک پیام کوتاه برای سردبیر وقتی پیشنهاد تازه هست.
 * نمونه: تا یاسر «ادامه» نزده، روزی ۳ مقاله. بعد MAGSEO_DAILY (۱۵).
 * فقط متن منتشرشدهٔ مقاله به Gemini می‌رود. خاموش: MAGSEO_ON = 0 در «تنظیمات تیم».
 *
 * E21 (۱ آبان، تصمیم مالک): فهرست بازسازی‌شدهٔ R-F1 (E15) دیگر کنار گذاشته نمی‌شود؛ همهٔ نوشته‌ها و برگه‌ها.
 * هر مقاله یک ردیف هم در تب «سئو · پیشنهاد Gemini» هاب آمار (تیتر فعلی کنار پیشنهاد، بلوک پاسخ، پرسش‌ها، لینک داخلی،
 * جملهٔ برجسته) که لین F داوری می‌کند. برگه فقط پیشنهاد است و هیچ چیزی رویش نوشته نمی‌شود.
 * اجرای دسته‌ای: «/seobatch ۴۰» مالک (یا msBatch(40)) صف را با تریگر زنجیره‌ای می‌دواند تا سهمیهٔ اجرای روز یا سقف ماهانهٔ Gemini.
 */
var MS_TAB = 'صف سردبیر · Gemini';
var MS_HEAD = ['تاریخ', 'شناسه', 'آدرس', 'نوع', 'فعلی', 'پیشنهادی', 'دلیل', 'وضعیت', 'یادداشت سردبیر'];
var MS_ST = { wait: 'در انتظار سردبیر', applied: 'اعمال شد (برگشت‌پذیر)' };
var MS_SEO_APPLIED = 'اعمال شد: متا و alt';
var MS_ON = String(cfg_('MAGSEO_ON', ''));   /* خالی یا 1 = روشن، 0 = خاموش */
var MS_DAILY = Number(cfg_('MAGSEO_DAILY', 0)) || 15;
var MS_SAMPLE = 3, MS_PER_RUN = 2, MS_NEW_DAYS = 14, MS_SUM_HOUR = 10;
var MS_REVIEW_MODELS = ['gemini-pro-latest', 'gemini-flash-latest'];
var MS_KINDS = ['خط تیره', 'واژهٔ ممنوع', 'ادعای بی‌منبع', 'ادعای بالینی', 'منبع کم', 'جزئیات شناسایی‌پذیر', 'ساختار', 'نگارش'];

function msNow_() { return TG_DRY && TG_MEM['ms:now'] ? new Date(Number(TG_MEM['ms:now'])) : new Date(); }
function msDay_() { return Utilities.formatDate(msNow_(), TG_TZ, 'yyyy-MM-dd'); }
function msProp_(k, v) {
  if (TG_DRY) { if (v === undefined) return TG_MEM['msp:' + k] || ''; TG_MEM['msp:' + k] = v; return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty(k) || '';
  P.setProperty(k, String(v)); return v;
}
function msNoDash_(s) { return String(s == null ? '' : s).replace(/\s*[—–]\s*/g, '، ').trim(); }
function msLimit_() { return msProp_('MS_SAMPLE_OK') || msAutoOk_() ? Math.max(1, MS_DAILY) : Math.min(MS_SAMPLE, Math.max(1, MS_DAILY)); }
/* E28 (۱ آبان، قاعدهٔ مالک: بی دکمهٔ «ادامه»): داوری لین F در ستون «وضعیت» تب «سئو · پیشنهاد Gemini»؛ «شروع با رد» یعنی رد */
function msVerdict_(st) { st = String(st || '').trim(); return /^رد/.test(st) ? 'rej' : /^(تأیید|تایید|اعمال|پذیرفت)/.test(st) ? 'acc' : ''; }
var MS_AUTO_MIN = 5, MS_AUTO_RATE = 0.6, MS_AUTO_N = 80, MS_AUTO_MEMO = null;
/* نرخ پذیرش ردیف‌های بعد از دستور کار E25؛ دست‌کم ۵ داوری و ۶۰٪ یعنی دسته‌های شبانه خودکار */
function msAccept_() {
  if (MS_AUTO_MEMO) return MS_AUTO_MEMO;
  var from = Number(msProp_('MS_E25_FROM') || 0), a = 0, r = 0;
  if (from) { try { pbRows_('s', SEO_TAB, MS_SEO_HEAD).forEach(function (x) { var t = x['تاریخ'] instanceof Date ? x['تاریخ'].getTime() : (pbWhen_(x['تاریخ']) || new Date(0)).getTime(); if (t < from) return; var v = msVerdict_(x['وضعیت']); if (v === 'acc') a++; else if (v === 'rej') r++; }); } catch (e) { tgErr_('msAccept_', e); } }
  return (MS_AUTO_MEMO = { acc: a, rej: r, ok: a + r >= MS_AUTO_MIN && a / (a + r) >= MS_AUTO_RATE });
}
function msAutoOk_() { return msAccept_().ok; }
function msAdd_(id, url, kind, now, sug, why, st) {
  pbAdd_('c', MS_TAB, MS_HEAD, { 'تاریخ': pbFmt_(msNow_()), 'شناسه': String(id), 'آدرس': url, 'نوع': kind,
    'فعلی': msNoDash_(now).slice(0, 2000), 'پیشنهادی': msNoDash_(sug).slice(0, 3000), 'دلیل': msNoDash_(why).slice(0, 500), 'وضعیت': st || MS_ST.wait });
}

/* ترتیب: تازه‌ها، بعد ترافیک؛ هر مقاله یک بار (هر چه در «بستهٔ سئو»، صف سردبیر یا دستهٔ E21 هست، انجام‌شده است) */
function msOrder_() {
  var done = msDone_();
  pbRows_('c', PB_T_SEO, PB_SEO_HEAD).forEach(function (r) { done[String(r['شناسه']).trim()] = 1; });
  pbRows_('c', MS_TAB, MS_HEAD).forEach(function (r) { done[String(r['شناسه']).trim()] = 1; });
  var m = pbArtMap_(), now = msNow_().getTime(), out = [], seen = {}, touched = msTouched_();
  Object.keys(m).forEach(function (id) { if (touched[msPath_(m[id].u)]) done[id] = 1; });   /* E25 */
  var t = function (d) { return typeof d === 'number' ? d : (d instanceof Date ? d.getTime() : ((pbWhen_(d) || new Date(0)).getTime())); };
  Object.keys(m).filter(function (id) { return t(m[id].d) >= now - MS_NEW_DAYS * 86400000; })
    .sort(function (a, b) { return t(m[b].d) - t(m[a].d); }).forEach(function (id) { seen[id] = 1; if (!done[id]) out.push(id); });
  pbTrafficOrder_().forEach(function (id) { id = String(id); if (!seen[id] && !done[id]) { seen[id] = 1; out.push(id); } });
  return out;
}

/* ─────────────────────────── بازبینی اول ─────────────────────────── */
var MS_REVIEW_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sources: { type: 'INTEGER' },
    issues: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      kind: { type: 'STRING', enum: MS_KINDS }, quote: { type: 'STRING' }, suggestion: { type: 'STRING' }, why: { type: 'STRING' } },
      required: ['kind', 'quote', 'suggestion', 'why'] } }
  },
  required: ['sources', 'issues']
};
function msReviewPrompt_(title, text) {
  return ['تو ویراستار اول «مجلهٔ تجربه» هستی؛ مجلهٔ روان‌درمانی و روانکاوی. این مقالهٔ منتشرشده را با قاعده‌های مجله بسنج. خروجی فقط JSON طبق اسکیما.',
    'قاعده‌ها:',
    '۱. هیچ خط تیرهٔ بلند یا کوتاه وسط جمله.',
    '۲. «مراجع»، نه «بیمار» و نه «مشتری». «ارگانیک» هرگز.',
    '۳. حداقل سه منبع معتبر (نام نویسنده، عنوان، سال). sources شمار منبع‌های متن است.',
    '۴. ادعای بالینی یا عددی بی منبع، یا وعدهٔ درمانی، یافته است.',
    '۵. هیچ جزئیات قابل‌شناسایی از هیچ مراجعی؛ نمونهٔ بالینی فقط ترکیبی و ناشناس.',
    '۶. ساختار: یک ایدهٔ روشن، تیترهای میانی، پاراگراف کوتاه. نگارش: نیم‌فاصله و غلط آشکار.',
    'حداکثر هشت یافتهٔ مهم. quote عیناً از متن و کوتاه (زیر ۲۰۰ نویسه). suggestion متن جایگزین پیشنهادی یا کار لازم، بی خط تیره. why یک جملهٔ کوتاه.',
    'اگر ایراد مهمی نیست، issues خالی بماند. سلیقه‌ای ایراد نگیر.',
    '',
    'عنوان: ' + title,
    'متن مقاله:',
    text.slice(0, 16000)].join('\n');
}
/* شمارش‌های بی Gemini */
function msLocal_(text) {
  var out = [], d = (text.match(/[—–]/g) || []).length, w = text.match(/بیمار|مشتری|ارگانیک/g) || [];
  if (d) out.push({ kind: 'خط تیره', quote: tgFa_(d) + ' خط تیره در متن', suggestion: 'جمله را بشکن یا ویرگول، نقطه یا دونقطه بگذار', why: 'بند ۱۱ اسکیل مجله' });
  if (w.length) out.push({ kind: 'واژهٔ ممنوع', quote: w.slice(0, 5).join('، '), suggestion: '«مراجع» به جای «بیمار» و «مشتری»؛ «ارگانیک» حذف', why: 'بند ۱۱ اسکیل مجله' });
  return out;
}
function msReview_(id, url, title, text) {
  var issues = msLocal_(text), src = -1;
  gemTask_('بازبینی اول');
  try {
    var o = gemJson_(msReviewPrompt_(title, text), MS_REVIEW_SCHEMA, MS_REVIEW_MODELS);
    src = Number(o.sources);
    (o.issues || []).slice(0, 8).forEach(function (x) {
      if ((x.kind === 'خط تیره' || x.kind === 'واژهٔ ممنوع') && issues.some(function (y) { return y.kind === x.kind; })) return;
      issues.push(x);
    });
  } finally { gemTask_(''); }
  if (src >= 0 && src < 3 && !issues.some(function (y) { return y.kind === 'منبع کم'; })) issues.push({ kind: 'منبع کم', quote: tgFa_(src) + ' منبع', suggestion: 'دست‌کم سه منبع معتبر (نام نویسنده، عنوان، سال)', why: 'بند ۱۱ اسکیل مجله' });
  issues.forEach(function (x) { msAdd_(id, url, 'بازبینی اول · ' + x.kind, x.quote, x.suggestion, x.why); });
  return issues.length;
}

/* ─────────────────────────── اعمال روی سایت ─────────────────────────── */
function msWp_(path, body) {
  if (TG_DRY) return TG_MEM['ms:wp'](path, body);
  var P = PropertiesService.getScriptProperties();
  var u = P.getProperty('WP_BOT_USER') || '', pw = P.getProperty('WP_BOT_APP_PASSWORD') || '';
  if (!u || !pw) return { code: 0, error: 'creds' };
  var r = UrlFetchApp.fetch(PB_SITE + path, { method: 'post', muteHttpExceptions: true, followRedirects: false, contentType: 'application/json',
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(u + ':' + pw, Utilities.Charset.UTF_8) }, payload: JSON.stringify(body) });
  var j = null; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  return { code: r.getResponseCode(), json: j };
}
function msAlts_(cell) {
  return String(cell || '').split('\n').map(function (l) { var p = l.split(' ← '); return p.length === 2 ? { file: p[0].trim(), alt: msNoDash_(p[1]).slice(0, 125) } : null; })
    .filter(function (x) { return x && x.file && x.alt; });
}
/* ردیف «بستهٔ سئو» با گیت سبز ← متا و alt روی سایت؛ تیتر، FAQ و لینک‌ها فقط به صف سردبیر. خروجی: 'applied' | 'later' | 'skip' | 'error' */
function msApply_(row) {
  var id = String(row['شناسه']).trim(), url = row['آدرس'];
  if (row['وضعیت'] !== 'در انتظار اعمال') return 'skip';
  var alts = msAlts_(row['متن جایگزین تصویرها']);
  var res = msWp_('/wp-json/tj/v1/seo-apply', { post_id: Number(id), metadesc: msNoDash_(row['متا']), alts: alts });
  if (res.code === 404 || res.code === 0) return 'later';   /* اسنیپت یا رمز هنوز نیست؛ ردیف می‌ماند */
  if (res.code !== 200 || !res.json || !res.json.ok) {
    pbSet_('c', PB_T_SEO, PB_SEO_HEAD, row, { 'وضعیت': 'خطای اعمال' });
    tgErr_('msApply_', 'HTTP ' + res.code + ' · ' + id);
    return 'error';
  }
  var j = res.json;
  pbSet_('c', PB_T_SEO, PB_SEO_HEAD, row, { 'وضعیت': MS_SEO_APPLIED });
  if (j.meta_applied === false) msAdd_(id, url, 'متای یوست', j.prev_meta || '', row['متا'], 'متای فعلی را آدم نوشته؛ دست نخورد. اگر نسخهٔ Gemini بهتر است، سردبیر جایگزین کند');
  else msAdd_(id, url, 'متای یوست', '(خالی)', row['متا'], 'متا خالی بود؛ گیت سئو سبز؛ خودکار اعمال شد', MS_ST.applied);
  if (alts.length) msAdd_(id, url, 'متن جایگزین تصویر', '', alts.map(function (a) { return a.file + ' ← ' + a.alt; }).join('\n'), 'فقط تصویرهای بی alt؛ ' + tgFa_(Number(j.alts_set || 0)) + ' نوشته شد', MS_ST.applied);
  if (row['تیتر سئو'] && row['تیتر سئو'] !== j.title_now) msAdd_(id, url, 'تیتر سئو', j.title_now || '', row['تیتر سئو'], 'کلیدواژهٔ اصلی: ' + (row['کلیدواژهٔ اصلی'] || ''));
  if (row['پرسش‌های پرتکرار']) msAdd_(id, url, 'پرسش‌های پرتکرار', '', row['پرسش‌های پرتکرار'], 'بخش پرسش‌ها با اسکیمای FAQ، فقط از خود متن');
  if (row['لینک از مقاله‌های قدیمی']) msAdd_(id, url, 'لینک از مقالهٔ قدیمی', '', row['لینک از مقاله‌های قدیمی'], 'لینک داخلی از مقاله‌های نزدیک به همین مطلب');
  return 'applied';
}

/* ─────────────────────────── E25: زمینهٔ هر صفحه از هاب آمار ─────────────────────────── */
var MS_STAT_MEMO = {};
function msStat_(tab) {
  if (MS_STAT_MEMO[tab]) return MS_STAT_MEMO[tab];
  var v = [];
  if (TG_DRY) v = TG_MEM['ms:stat:' + tab] || [];
  else { try { var sh = SpreadsheetApp.openById(SEO_SHEET).getSheetByName(tab); if (sh && sh.getLastRow() > 1) v = sh.getDataRange().getValues(); } catch (e) { tgErr_('msStat_', tab + ': ' + e); } }
  var h = (v[0] || []).map(function (x) { return String(x).trim(); });
  return (MS_STAT_MEMO[tab] = v.slice(1).map(function (r) { var o = {}; h.forEach(function (k, j) { if (k) o[k] = r[j]; }); return o; }));
}
function msPath_(u) { var x = String(u || ''); try { x = decodeURI(x); } catch (e) {} x = x.replace(/^https?:\/\/[^/]+/, '').trim(); if (!x) return ''; if (x[0] !== '/') x = '/' + x; return x.replace(/\/?$/, '/'); }
function msJal_(v) {
  if (v instanceof Date) return v;
  var m = tgLatinDigits_(String(v || '')).match(/(1[34]\d\d)[-\/](\d{1,2})[-\/](\d{1,2})/);
  return m ? tgJalaliToGreg_(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}
/* کلیدواژه‌های ۲۸ روزهٔ سرچ کنسول یک صفحه (تب «کوئری‌ها»: صفحهٔ هدف، ایمپرشن)، پرایمپرشن اول */
function msQueries_(path) {
  var rows = msStat_('کوئری‌ها'), last = 0;
  rows.forEach(function (r) { var d = msJal_(r['تاریخ برداشت']); if (d && d.getTime() > last) last = d.getTime(); });
  var seen = {}, out = [];
  rows.filter(function (r) { var d = msJal_(r['تاریخ برداشت']); return msPath_(r['صفحهٔ هدف']) === path && (!d || d.getTime() >= last - 28 * 86400000); })
    .sort(function (a, b) { return Number(b['ایمپرشن'] || 0) - Number(a['ایمپرشن'] || 0); })
    .forEach(function (r) { var q = String(r['کوئری'] || '').trim(); if (q && !seen[q]) { seen[q] = 1; out.push(q); } });
  return out.slice(0, 6);
}
/* صفحه‌هایی که لین F در ۲۸ روز اخیر دست زده یا هنوز در پنجرهٔ سنجش است («کارتابل بهینه‌سازی»: تاریخ در «وضعیت»، «تاریخ بررسی» آینده) */
function msTouched_() {
  var now = msNow_().getTime(), out = {};
  msStat_('کارتابل بهینه‌سازی').forEach(function (r) {
    var p = msPath_(r['صفحه / محل']); if (!p) return;
    var done = msJal_(r['وضعیت']), rev = msJal_(r['تاریخ بررسی']);
    if ((done && now - done.getTime() < 28 * 86400000) || (rev && rev.getTime() > now)) out[p] = 1;
  });
  return out;
}
/* پرسش‌های فعلی صفحه: بلوک FAQ یوست، summary، و تیترهای پرسشی */
function msFaqs_(html) {
  var out = [], seen = {}, add = function (q) { q = seoStrip_(q); if (q && q.length < 200 && !seen[q]) { seen[q] = 1; out.push(q); } }, m;
  var res = [/class="schema-faq-question"[^>]*>([\s\S]*?)<\/(?:strong|span|h\d)>/g, /<summary[^>]*>([\s\S]*?)<\/summary>/g, /<h[2-4][^>]*>([^<]*[؟?])\s*<\/h[2-4]>/g];
  res.forEach(function (re) { while ((m = re.exec(String(html || '')))) add(m[1]); });
  return out.slice(0, 15);
}

/* ─────────────────────────── E21: ردیف تب «سئو · پیشنهاد Gemini» هاب آمار ─────────────────────────── */
var MS_SEO_HEAD = SEO_HEAD.concat(['نوع', 'جملهٔ برجسته', 'لینک از مقاله‌های قدیمی']);
function msWords_(s) { return String(s || '').trim().split(/\s+/).filter(String).length; }
function msSeoRow_(ref, page, link, cur, o, gate) {
  var warn = gate.slice(), w = msWords_(o.short_answer);
  if (w && (w < 40 || w > 60)) warn.push('بلوک پاسخ ' + tgFa_(w) + ' واژه');
  return pbAdd_('s', SEO_TAB, MS_SEO_HEAD, { 'تاریخ': pbFmt_(msNow_()), 'شناسه': ref, 'آدرس': link, 'نوع': page ? 'برگه' : 'نوشته',
    'تیتر فعلی': cur.title || '', 'تیتر پیشنهادی': msNoDash_(o.seo_title), 'طول تیتر': String(o.seo_title || '').length,
    'متای فعلی': cur.description || '', 'متای پیشنهادی': msNoDash_(o.meta_description), 'طول متا': String(o.meta_description || '').length,
    'کلیدواژهٔ اصلی': o.focus_keyword || '', 'پاسخ کوتاه (زیر H1)': msNoDash_(o.short_answer),
    'پرسش‌های پرتکرار': (o.faq || []).map(function (f, k) { return (k + 1) + '. ' + msNoDash_(f.q) + '\n' + msNoDash_(f.a); }).join('\n\n'),
    'متن جایگزین تصویرها': (o.image_alts || []).map(function (a) { return a.src + ' ← ' + msNoDash_(a.alt); }).join('\n'),
    'لینک داخلی پیشنهادی': (o.internal_links || []).map(function (l) { return msNoDash_(l.anchor) + ' ← ' + l.url; }).join('\n'),
    'لینک از مقاله‌های قدیمی': (o.backlinks || []).map(function (b) { return b.url + '\nپاراگراف: ' + b.paragraph + '\nجمله: ' + msNoDash_(b.sentence); }).join('\n\n'),
    'جملهٔ برجسته': msNoDash_(o.pull_quote), 'ایرادهای گیت': warn.join('، '), 'وضعیت': gate.length ? 'اصلاح لازم' : 'در انتظار تأیید' });
}
/* انجام‌شده‌ها: «بستهٔ سئو»، صف سردبیر و Property «MS_DONE» (دسته و شب) */
function msDone_() {
  var done = {}; try { done = JSON.parse(msProp_('MS_DONE') || '{}') || {}; } catch (e) {}
  pbRows_('c', PB_T_SEO, PB_SEO_HEAD).forEach(function (r) { done[String(r['شناسه']).trim()] = 1; });
  pbRows_('c', MS_TAB, MS_HEAD).forEach(function (r) { done[String(r['شناسه']).trim()] = 1; });
  return done;
}
function msMark_(ref) { var o = {}; try { o = JSON.parse(msProp_('MS_DONE') || '{}') || {}; } catch (e) {} o[String(ref)] = 1; msProp_('MS_DONE', JSON.stringify(o)); }

/** یک مطلب: بسته، بازبینی (فقط نوشته و اگر review نخواسته نشده)، اعمال (فقط نوشته). ref = شناسهٔ نوشته یا «p» + شناسهٔ برگه. */
function msOne_(ref, opts) {
  opts = opts || {};
  ref = String(ref); var page = /^p\d+$/.test(ref), id = ref.replace(/\D/g, ''), kind = page ? 'pages' : 'posts';
  var post = pbWp_('/wp-json/wp/v2/' + kind + '/' + id + '?_fields=id,link,title,content' + (page ? '' : ',categories'));
  var cur = {}; try { cur = pbWp_('/wp-json/wp/v2/' + kind + '/' + id + '?_fields=id,yoast_head_json').yoast_head_json || {}; } catch (eY) {}
  var ctx = { queries: msQueries_(msPath_(post.link)), faqs: msFaqs_(post.content && post.content.rendered) };   /* E25 */
  var r = pbGemSeo_(id, false, kind, ctx);
  if (!r.ok) throw new Error(r.error || 'بستهٔ سئو');
  var url = decodeURI(String(post.link || '')), text = seoStrip_(post.content.rendered);
  msSeoRow_(ref, page, url, cur, r.pack || {}, r.data.gate || []);
  msMark_(ref);
  if (page) return 'suggested';
  if (opts.review !== false) msReview_(id, url, seoStrip_(post.title.rendered), text);
  var row = pbRows_('c', PB_T_SEO, PB_SEO_HEAD).filter(function (x) { return String(x['شناسه']).trim() === id; }).pop();
  var a = row ? msApply_(row) : 'skip';
  if (a === 'skip' && row) msAdd_(id, url, 'بستهٔ سئو', '', row['تیتر سئو'] + '\n' + row['متا'], 'گیت سئو: ' + (row['ایرادهای گیت'] || '') + '؛ اعمال نشد');
  return a;
}

/* ─────────────────────────── از tgWatchdog، ساعتی ─────────────────────────── */
function msHourly_() {
  if (MS_ON === '0') return 'off';
  var day = msDay_(), h = Number(Utilities.formatDate(msNow_(), TG_TZ, 'H')), n = 0;
  /* ردیف‌های سبزی که اسنیپت نبود، دوباره */
  try { pbRows_('c', PB_T_SEO, PB_SEO_HEAD).filter(function (r) { return r['وضعیت'] === 'در انتظار اعمال'; }).slice(0, 3).forEach(function (r) { if (msApply_(r) === 'later') throw 'later'; }); }
  catch (e0) { if (e0 !== 'later') tgErr_('msApply_', e0); }
  if (h >= 1 && h < 9) {
    /* E28: داوری خوب بود ← هر شب یک دستهٔ خودکار تا سقف سهمیهٔ اجرا (بی فرمان مالک) */
    if (msAutoOk_() && !msBatchState_().left && msProp_('MS_AUTO_DAY') !== day) { msProp_('MS_AUTO_DAY', day); msBatch(MS_AUTO_N); msNight_(day, 'auto'); }
    var used = Number(msProp_('MS_DAY:' + day) || 0), ids = msOrder_();
    msNight_(day, 'run');
    while (n < MS_PER_RUN && used < msLimit_() && ids.length && pbGemLeft_() > 2) {
      var id = ids.shift(), res = '';
      try { res = msOne_(id); } catch (e1) { msAdd_(id, '', 'خطا', '', '', String(e1.message || e1).slice(0, 200)); tgErr_('msOne_', e1); res = 'err'; msMark_(id); }
      msNight_(day, res === 'err' ? 'err' : 'done');
      used++; n++; msProp_('MS_DAY:' + day, String(used));
    }
    /* E20: چرا این ساعت بیشتر نرفت (برای خط گزارش شبانه) */
    if (used >= msLimit_()) msNight_(day, 'limit');
    else if (!ids.length) msNight_(day, 'empty');
    else if (pbGemLeft_() <= 2) msNight_(day, 'cap');
  }
  if (h >= MS_SUM_HOUR) { try { msSummary_(day); } catch (e2) { tgErr_('msSummary_', e2); } }
  return n;
}

/* E20 (۱ آبان): شمار هر شب در Property «MS_NIGHT:<روز>»؛ خط گزارش شبانه از همین. پیش از این شبی که هیچ نکرد دیده نمی‌شد. */
var MS_WHY = { cap: 'سقف روزانهٔ Gemini پر بود', empty: 'مطلب تازه‌ای در صف نبود', limit: 'سهم شب پر شد' };
function msNight_(day, k, add) {
  var o = {}; try { o = JSON.parse(msProp_('MS_NIGHT:' + day) || '{}') || {}; } catch (e) {}
  o[k] = (o[k] || 0) + (add || 1); msProp_('MS_NIGHT:' + day, JSON.stringify(o)); return o;
}
function msNightLine_() {
  if (MS_ON === '0') return '🧾 بستهٔ سئو: خاموش (MAGSEO_ON = 0)';
  var day = msDay_(), o = {}; try { o = JSON.parse(msProp_('MS_NIGHT:' + day) || '{}') || {}; } catch (e) {}
  var skip = 0; try { skip = Number((bgJson_('BGS:' + day) || {}).msHourly_ || 0); } catch (e3) {}
  var why = Object.keys(MS_WHY).filter(function (k) { return o[k]; }).map(function (k) { return MS_WHY[k]; });
  if (skip) why.push(tgFa_(skip) + ' ساعت به‌خاطر سهمیهٔ اجرا رد شد');
  if (!o.run && !o.batch) why.unshift('هیچ ساعت شبی اجرا نشد');
  var b = msBatchState_(), done = (o.done || 0) + (o.batch || 0);
  var head = '🧾 بستهٔ سئو امروز: ' + tgFa_(done) + ' مطلب (شب ' + tgFa_(o.done || 0) + '، دسته ' + tgFa_(o.batch || 0) + ')' + (o.err ? '، خطا ' + tgFa_(o.err) : '') +
    ' · سهم شب ' + tgFa_(msLimit_()) + (function () { var x = msAccept_(); return ' · داوری لین F: پذیرش ' + tgFa_(x.acc) + '، رد ' + tgFa_(x.rej) + (x.ok ? ' (دسته‌های شبانه خودکار)' : ''); })() + (b.left ? ' · دسته: ' + tgFa_(b.left) + ' مانده' + (b.stop ? '، ' + b.stop : '') : '');
  return (done ? '' : '⚠️ ') + head + (why.length && !done ? ' · ' + why.join('، ') : '');
}
try { TG_NIGHT_LINES.push(msNightLine_); } catch (eNl) {}

/* ─────────────────────────── E21: اجرای دسته‌ای ─────────────────────────── */
var MS_BATCH_RUN_MS = 270000;   /* هر اجرا حداکثر ۴٫۵ دقیقه (سقف Apps Script ۶ دقیقه) */
var MS_BATCH_QUOTA_MIN = 50;     /* مصرف امروز از این بالاتر برود، دسته تا شب بعد (ساعت ۱) می‌ایستد؛ کارهای سبک واچ‌داگ از ۷۵ رد می‌شوند */
var MS_BATCH_GAP_MS = 90000;
function msBatchState_() { try { return JSON.parse(msProp_('MS_BATCH') || '{}') || {}; } catch (e) { return {}; } }
/* ترتیب دسته: نوشته‌ها و برگه‌ها با هم به ترتیب ترافیک (پربازدیدها اول)، بعد بقیهٔ نوشته‌ها، بعد بقیهٔ برگه‌ها */
function msPages_() {
  if (TG_DRY) return (TG_MEM['ms:pages'] || []).slice();
  var out = [];
  for (var p = 1; p <= 3; p++) {
    var r = UrlFetchApp.fetch(PB_SITE + '/wp-json/wp/v2/pages?per_page=100&page=' + p + '&_fields=id,link', { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) break;
    var j = JSON.parse(r.getContentText()); if (!j.length) break;
    j.forEach(function (x) { out.push({ id: String(x.id), u: decodeURI(String(x.link || '')) }); });
    if (j.length < 100) break;
  }
  return out;
}
function msBatchOrder_() {
  var done = msDone_(), m = pbArtMap_(), byUrl = {}, out = [], seen = {}, touched = msTouched_();
  var path = {};
  var add = function (ref) { if (ref && !seen[ref] && !done[ref] && !touched[path[ref]]) { seen[ref] = 1; out.push(ref); } };   /* E25: کار لین F کنار */
  Object.keys(m).forEach(function (id) { path[id] = msPath_(m[id].u); });
  Object.keys(m).forEach(function (id) { if (m[id].u) byUrl[decodeURI(m[id].u).replace(/\/$/, '')] = id; });
  var pages = msPages_(); pages.forEach(function (x) { byUrl[x.u.replace(/\/$/, '')] = 'p' + x.id; path['p' + x.id] = msPath_(x.u); });
  pbTrafficRows_().sort(function (a, b) { return b.n - a.n; }).forEach(function (r) {
    var u = decodeURI(String(r.u)).replace(/\/$/, ''); add(byUrl[u] || byUrl[PB_SITE + u]);
  });
  pbTrafficOrder_().forEach(function (id) { if (m[id]) add(id); });   /* فقط نوشته‌های فهرست مقاله‌ها */
  pages.forEach(function (x) { add('p' + x.id); });
  return out;
}
/** شروع دسته روی n مطلب (پیش‌فرض ۴۰). از «/seobatch n» مالک یا اجرای دستی. */
function msBatch(n) {
  n = Math.max(1, Math.min(500, Number(n) || 40));
  msProp_('MS_BATCH', JSON.stringify({ left: n, total: n, done: 0, err: 0, from: pbFmt_(msNow_()), stop: '' }));
  msBatchArm_(5000);
  return n;
}
function msBatchArm_(ms, at) {
  if (TG_DRY) { TG_MEM['ms:arm'] = at ? at.getTime() : ms; return; }
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'msBatchRun') ScriptApp.deleteTrigger(t); });
  var b = ScriptApp.newTrigger('msBatchRun').timeBased();
  (at ? b.at(at) : b.after(ms)).create();
}
/* ساعت ۱ تهرانِ پس از این لحظه */
function msNextNight_() {
  var now = msNow_(), d = new Date(now.getTime() + 3600000);
  var day = Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd'), h = Number(Utilities.formatDate(d, TG_TZ, 'H'));
  var t = new Date(day + 'T01:05:00+03:30');
  if (h >= 1) t = new Date(t.getTime() + 86400000);
  return t;
}
/** تریگر زنجیره‌ای دسته. خروجی: شمار مطالب این اجرا یا دلیل توقف. */
function msBatchRun(e) {
  if (typeof ciPaused_ === 'function' && ciPaused_(e, 'msBatchRun', 'defer')) return 'paused';
  var t0 = Date.now(), b = msBatchState_(), n = 0, day = msDay_();
  try {
    if (!b.left) return 'idle';
    if (MS_ON === '0') { b.stop = 'خاموش (MAGSEO_ON = 0)'; return 'off'; }
    var bud = gemBudget_();
    if (bud.month >= bud.monthBudgetUsd) { b.stop = 'سقف ماهانهٔ Gemini (' + tgFa_(GEM_MONTH_EUR) + ' یورو) پر است'; msBatchArm_(0, msNextNight_()); return 'budget'; }
    if (typeof bgUsedMin_ === 'function' && bgUsedMin_() >= MS_BATCH_QUOTA_MIN) { b.stop = 'سهمیهٔ اجرای امروز؛ ادامه ساعت ۱ بامداد'; msBatchArm_(0, msNextNight_()); return 'quota'; }
    b.stop = '';
    var ids = (b.only || []).length ? b.only.slice() : msBatchOrder_();
    PB_GEM_NOCAP = true;
    try {
      while (b.left > 0 && ids.length && Date.now() - t0 < MS_BATCH_RUN_MS) {
        var ref = ids.shift();
        try { msOne_(ref, { review: false }); b.done++; msNight_(day, 'batch'); }
        catch (e1) { b.err++; msMark_(ref); msNight_(day, 'err'); tgErr_('msBatchRun', String(ref) + ': ' + String(e1.message || e1).slice(0, 160)); }
        b.left--; n++; if ((b.only || []).length) b.only.shift();
      }
    } finally { PB_GEM_NOCAP = false; }
    if (!ids.length) b.left = 0;
    if (b.left > 0) msBatchArm_(MS_BATCH_GAP_MS);
    else if (TG_OWNER_CHAT) tgNotify_(String(TG_OWNER_CHAT), TG_NK.sys, '🧾 دستهٔ بستهٔ سئو تمام شد: ' + tgFa_(b.done) + ' مطلب' + (b.err ? '، خطا ' + tgFa_(b.err) : '') +
      ' در تب «' + SEO_TAB + '» هاب آمار.', { ref: 'MS-BATCH-' + day, force: true });
    return n;
  } finally { msProp_('MS_BATCH', JSON.stringify(b)); if (!TG_DRY && typeof tgRunStat_ === 'function') tgRunStat_('msBatchRun', t0); }
}
/* «/seobatch ۴۰» فقط مالک؛ «/seobatch» بی عدد = وضعیت */
function msOwnerCmd_(chat, t) {
  var m = String(t || '').match(/^\/seobatch(?:@\w+)?(?:\s+([0-9۰-۹]+))?$/);
  if (!m) return false;
  if (String(chat) !== String(TG_OWNER_CHAT)) return false;
  if (!m[1]) { var b = msBatchState_(); tgSend_(chat, b.left ? '🧾 دستهٔ سئو: ' + tgFa_(b.done || 0) + ' انجام، ' + tgFa_(b.left) + ' مانده' + (b.stop ? '\n' + b.stop : '') : '🧾 دسته‌ای در جریان نیست. «/seobatch ۴۰» شروع می‌کند.'); return true; }
  var n = msBatch(Number(String(m[1]).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })));
  tgSend_(chat, '🧾 دستهٔ بستهٔ سئو روی ' + tgFa_(n) + ' مطلب شروع شد (پربازدیدها اول، نوشته و برگه). خروجی در تب «' + SEO_TAB + '» هاب آمار. «/seobatch» وضعیت را می‌گوید.');
  return true;
}

/** یک‌بارهٔ خودکار v170.99 (E28): نمونهٔ ۵تایی با دستور کار E25 همین حالا، بی فرمان مالک؛ داوری لین F از این لحظه شمرده می‌شود */
function msV17099Sample() {
  msProp_('MS_E25_FROM', String(msNow_().getTime()));
  return 'نمونه در صف: ' + msBatch(5) + ' مطلب';
}

/** یک‌بارهٔ خودکار v170.98 (E25): ردیف‌هایی که لین F در تب «سئو · پیشنهاد Gemini» «رد» زده، با دستور کار تازه یک بار دوباره (دسته با فهرست ثابت) */
function msV17098Redo() {
  var ids = [], seen = {};
  pbRows_('s', SEO_TAB, MS_SEO_HEAD).forEach(function (r) { var k = String(r['شناسه']).trim(); if (msVerdict_(r['وضعیت']) === 'rej' && k && !seen[k]) { seen[k] = 1; ids.push(k); } });
  ids = ids.slice(0, 10);
  if (!ids.length) return 'ردیف ردشده‌ای نیست';
  var d = {}; try { d = JSON.parse(msProp_('MS_DONE') || '{}') || {}; } catch (e) {}
  ids.forEach(function (k) { delete d[k]; }); msProp_('MS_DONE', JSON.stringify(d));
  msProp_('MS_BATCH', JSON.stringify({ left: ids.length, total: ids.length, done: 0, err: 0, from: pbFmt_(msNow_()), stop: '', only: ids }));
  msBatchArm_(60000);
  return 'دوباره در صف: ' + ids.length + ' مطلب';
}

/** یک‌بارهٔ خودکار v170.97 (E20)، فقط خواندن: وضعیت بستهٔ سئو. بی نام و بی متن مقاله. */
function msV17097Diag() {
  var day = msDay_(), y = Utilities.formatDate(new Date(msNow_().getTime() - 86400000), TG_TZ, 'yyyy-MM-dd'), ids = [], q = '';
  try { ids = msOrder_(); } catch (e) { q = ' (خطا: ' + String(e.message || e).slice(0, 100) + ')'; }
  var bgs = function (d) { try { return Number((bgJson_('BGS:' + d) || {}).msHourly_ || 0); } catch (e) { return -1; } };
  var rsw = function (d) { try { var x = (bgJson_('RSW:' + d) || {}).msHourly_; return x ? x[0] : 0; } catch (e) { return -1; } };
  return 'روشن: ' + (MS_ON === '0' ? 'نه' : 'بله') + ' · صف شب: ' + ids.length + ' مطلب' + q + ' · سهم شب: ' + msLimit_() + (msProp_('MS_SAMPLE_OK') ? '' : ' (نمونه)') +
    ' · Gemini باقی امروز: ' + pbGemLeft_() + ' · دیروز ' + y + ': اجرا ' + rsw(y) + ' بار، رد سهمیه ' + bgs(y) + '، ثبت‌شده ' + (msProp_('MS_DAY:' + y) || 0) +
    ' · امروز: اجرا ' + rsw(day) + '، رد ' + bgs(day) + '، ثبت‌شده ' + (msProp_('MS_DAY:' + day) || 0) +
    ' · ردیف «بستهٔ سئو» ' + pbRows_('c', PB_T_SEO, PB_SEO_HEAD).length + '، صف سردبیر ' + pbRows_('c', MS_TAB, MS_HEAD).length;
}

/* ساعت ۱۰: یک خط برای سردبیر؛ و تا پیش از «ادامه»، نمونه برای یاسر */
function msSummary_(day) {
  if (msProp_('MS_SUM_DAY') === day) return false;
  var since = Number(msProp_('MS_SUM_ROW') || 1), rows = pbRows_('c', MS_TAB, MS_HEAD);
  var fresh = rows.filter(function (r) { return r._row > since; });
  msProp_('MS_SUM_DAY', day);
  if (!fresh.length) return false;
  msProp_('MS_SUM_ROW', String(rows[rows.length - 1]._row));
  var wait = fresh.filter(function (r) { return r['وضعیت'] === MS_ST.wait; }).length, ap = fresh.length - wait;
  var arts = {}; fresh.forEach(function (r) { arts[r['شناسه']] = r['آدرس']; });
  var n = Object.keys(arts).length;
  if (wait) pbNotifyEditors_('🧾 <b>پیشنهادهای تازهٔ Gemini</b>\n' + tgFa_(wait) + ' پیشنهاد برای ' + tgFa_(n) + ' مقاله در تب «' + MS_TAB + '» هاب محتوا منتظر شماست (تیتر، پرسش‌ها، لینک‌ها و بازبینی اول). هیچ‌کدام بی تأیید شما اعمال نمی‌شود.');
  /* E28: پیام نمونه با دکمهٔ «ادامه» برای مالک برداشته شد؛ ادامه با داوری لین F خودکار است (msAccept_) */
  return true;
}
function msOnCb_(chat, data) {
  if (String(chat) !== String(TG_OWNER_CHAT)) { tgSend_(chat, 'این دکمه فقط برای یاسر است.'); return true; }
  if (data === 'msq:full') { msProp_('MS_SAMPLE_OK', '1'); tgSend_(chat, '✅ از امشب هر شب تا ' + tgFa_(msLimit_()) + ' مقاله.'); }
  return true;
}

/* ─────────────────────────── تست ─────────────────────────── */
try { TG_SUITES.push(['بستهٔ سئو و بازبینی اول v170.83', 'msTests']); } catch (eSu) {}

function msTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX, cfgK = [MS_ON, MS_DAILY];
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; MS_ON = '1'; MS_DAILY = 15;
  try {
    var D = 86400000, t0 = pbTehran_(2026, 10, 21, 2, 5).getTime(), owner = String(TG_OWNER_CHAT);
    TG_MEM['ms:now'] = String(t0);
    TG_MEM['mageditors'] = [{ name: 'سردبیر آزمون', chat: '321', roles: [TG_MAG_EDITOR], status: '' }];
    TG_MEM['pb:' + PB_T_ART] = [
      { 'شناسه': '901', 'عنوان': 'اضطراب و خواب', 'لینک': 'https://tajrobeh.life/sleep/', 'تاریخ انتشار': new Date(t0 - 3 * D) },
      { 'شناسه': '104', 'عنوان': 'اضطراب جدایی', 'لینک': 'https://tajrobeh.life/sep/', 'تاریخ انتشار': new Date(t0 - 400 * D) },
      { 'شناسه': '77', 'عنوان': 'خواب و رؤیا', 'لینک': 'https://tajrobeh.life/dream/', 'تاریخ انتشار': new Date(t0 - 500 * D) }];
    TG_MEM['pb:traffic'] = [{ u: 'https://tajrobeh.life/sep/', n: 900 }];
    var html = '<p>متن مقاله دربارهٔ اضطراب و خواب — با یک خط تیره و واژهٔ بیمار.</p><img src="https://tajrobeh.life/u/a-1024x576.webp">';
    TG_MEM['wp:/wp-json/wp/v2/posts/901?_fields=id,link,title,content,categories'] = { id: 901, link: 'https://tajrobeh.life/sleep/', title: { rendered: 'اضطراب و خواب' }, content: { rendered: html }, categories: [] };
    var title = 'اضطراب شبانه و بی‌خوابی: چرا ذهن آرام نیست؟' + SEO_SUFFIX;
    while (title.length < 52) title = 'چرا ' + title;
    var meta = 'وقتی شب‌ها ذهن آرام نمی‌گیرد، اضطراب خواب را می‌دزدد. در این مقاله می‌خوانید اضطراب شبانه از کجا می‌آید و روان‌درمانی چطور کمک می‌کند تا آرام شوید.';
    TG_MEM['pb:gem'] = { focus_keyword: 'اضطراب شبانه', secondary_keywords: ['بی خوابی', 'اضطراب خواب', 'ذهن آرام'], seo_title: title, meta_description: meta.slice(0, 150),
      faq: [{ q: 'الف؟', a: 'ب.' }, { q: 'ج؟', a: 'د.' }, { q: 'ه؟', a: 'و.' }], image_alts: [{ src: 'a-1024x576.webp', alt: 'ماه پشت پنجره در شب' }],
      backlinks: [{ url: 'https://tajrobeh.life/sep/', paragraph: 'آغاز', sentence: 'جمله' }, { url: 'https://tajrobeh.life/dream/', paragraph: 'آغاز', sentence: 'جمله' }], wikimedia: [] };
    TG_MEM['gem:fake'] = { code: 200, body: { candidates: [{ content: { parts: [{ text: JSON.stringify({ sources: 1, issues: [{ kind: 'ادعای بالینی', quote: 'درمان قطعی', suggestion: 'کمک می‌کند', why: 'وعدهٔ درمانی' }] }) }] } }] } };
    var calls = [];
    TG_MEM['ms:wp'] = function (path, body) { calls.push({ path: path, body: body }); return { code: 200, json: { ok: true, meta_applied: false, prev_meta: 'متای قدیمی', title_now: 'اضطراب و خواب | تجربه زندگی', alts_set: 1 } }; };

    /* E21: R-F1 کنار نمی‌رود؛ تیتر فعلی از یوست؛ بلوک پاسخ و جملهٔ برجسته */
    TG_MEM['wp:/wp-json/wp/v2/posts/901?_fields=id,yoast_head_json'] = { id: 901, yoast_head_json: { title: 'اضطراب و خواب | تجربه زندگی', description: 'متای قدیمی' } };
    TG_MEM['pb:gem'].short_answer = Array(46).join('واژه ').trim();
    TG_MEM['pb:gem'].internal_links = [{ url: 'https://tajrobeh.life/sep/', anchor: 'اضطراب' }];
    TG_MEM['pb:gem'].pull_quote = 'ذهن شب‌ها آرام نمی‌گیرد و این طبیعی است.';
    TG_MEM['ms:rebuilt'] = ['901'];
    ok('نمونه: پیش از «ادامه» روزی ۳، بعد سقف تنظیم (روی کد قبلی مردود)', msLimit_() === 3 && (msProp_('MS_SAMPLE_OK', '1'), msLimit_() === 15));
    TG_MEM['msp:MS_SAMPLE_OK'] = '';
    var ord = msOrder_();
    ok('ترتیب: تازه، بعد ترافیک', ord[0] === '901' && ord[1] === '104');

    var a = msOne_('901');
    var Q = pbRows_('c', MS_TAB, MS_HEAD), kinds = Q.map(function (r) { return r['نوع']; });
    var seo = pbRows_('c', PB_T_SEO, PB_SEO_HEAD)[0];
    ok('گیت سبز: متا و alt خودکار روی سایت', a === 'applied' && calls.length === 1 && calls[0].path === '/wp-json/tj/v1/seo-apply' && calls[0].body.metadesc === seo['متا'] &&
      calls[0].body.alts.length === 1 && calls[0].body.alts[0].file === 'a-1024x576.webp' && seo['وضعیت'] === MS_SEO_APPLIED);
    ok('تیتر به سایت نمی‌رود، فقط پیشنهاد', !('title' in calls[0].body) && !('seo_title' in calls[0].body) && Q.some(function (r) { return r['نوع'] === 'تیتر سئو' && r['وضعیت'] === MS_ST.wait && r['فعلی'] === 'اضطراب و خواب | تجربه زندگی'; }));
    ok('متایی که آدم نوشته دست نمی‌خورد؛ نسخهٔ Gemini فقط پیشنهاد سردبیر (روی کد قبلی مردود)', Q.some(function (r) { return r['نوع'] === 'متای یوست' && r['فعلی'] === 'متای قدیمی' && r['وضعیت'] === MS_ST.wait; }) &&
      !Q.some(function (r) { return r['نوع'] === 'متای یوست' && r['وضعیت'] === MS_ST.applied; }));
    var rEmpty = { 'شناسه': '6', 'آدرس': 'y', 'وضعیت': 'در انتظار اعمال', 'متا': 'متای تازه', 'متن جایگزین تصویرها': '' }, keepWp = TG_MEM['ms:wp'];
    TG_MEM['ms:wp'] = function () { return { code: 200, json: { ok: true, meta_applied: true, prev_meta: '', title_now: '', alts_set: 0 } }; };
    ok('متای خالی: خودکار اعمال و ثبت در صف سردبیر', msApply_(rEmpty) === 'applied' && pbRows_('c', MS_TAB, MS_HEAD).some(function (r) { return r['شناسه'] === '6' && r['نوع'] === 'متای یوست' && r['وضعیت'] === MS_ST.applied; }));
    TG_MEM['ms:wp'] = keepWp;
    ok('پرسش‌ها و لینک‌ها پیشنهاد به سردبیر', kinds.indexOf('پرسش‌های پرتکرار') > -1 && kinds.indexOf('لینک از مقالهٔ قدیمی') > -1);
    ok('بازبینی اول: یافتهٔ Gemini، خط تیره و واژهٔ ممنوع بی Gemini، و منبع کم', kinds.indexOf('بازبینی اول · ادعای بالینی') > -1 && kinds.indexOf('بازبینی اول · خط تیره') > -1 &&
      kinds.indexOf('بازبینی اول · واژهٔ ممنوع') > -1 && kinds.indexOf('بازبینی اول · منبع کم') > -1);
    ok('هیچ خانهٔ صف سردبیر و alt خط تیره ندارد', !/[—–]/.test(JSON.stringify(Q) + JSON.stringify(calls[0].body.alts)));
    ok('هزینهٔ بازبینی در دفتر با کار «بازبینی اول»', (TG_MEM['gem:ledger'] || []).some(function (x) { return x[1] === 'بازبینی اول'; }));

    var S0 = pbRows_('s', SEO_TAB, MS_SEO_HEAD).filter(function (r) { return r['شناسه'] === '901'; })[0] || {};
    ok('E21: مقالهٔ فهرست R-F1 هم پردازش شد و ردیف تب «سئو · پیشنهاد Gemini» با تیتر فعلی کنار پیشنهاد (روی کد قبلی مردود)', a === 'applied' && S0['تیتر فعلی'] === 'اضطراب و خواب | تجربه زندگی' &&
      S0['تیتر پیشنهادی'] === title && S0['نوع'] === 'نوشته' && S0['وضعیت'] === 'در انتظار تأیید', JSON.stringify(S0).slice(0, 300));
    ok('E21: بلوک پاسخ، لینک داخلی و جملهٔ برجسته بی خط تیره', msWords_(S0['پاسخ کوتاه (زیر H1)']) === 45 && /اضطراب ← https:\/\/tajrobeh.life\/sep\//.test(S0['لینک داخلی پیشنهادی']) &&
      S0['جملهٔ برجسته'] && !/[—–]/.test(S0['جملهٔ برجسته']) && !/بلوک پاسخ/.test(S0['ایرادهای گیت']), S0['جملهٔ برجسته']);
    /* گیت مردود: هیچ چیز روی سایت نمی‌رود */
    calls = [];
    TG_MEM['wp:/wp-json/wp/v2/posts/104?_fields=id,link,title,content,categories'] = { id: 104, link: 'https://tajrobeh.life/sep/', title: { rendered: 'اضطراب جدایی' }, content: { rendered: '<p>متن</p>' }, categories: [] };
    TG_MEM['pb:gem'] = JSON.parse(JSON.stringify(TG_MEM['pb:gem'])); TG_MEM['pb:gem'].meta_description = 'کوتاه';
    var b = msOne_('104');
    ok('گیت مردود: متا اعمال نمی‌شود و به سردبیر گزارش می‌شود', b === 'skip' && calls.length === 0 && pbRows_('c', MS_TAB, MS_HEAD).some(function (r) { return r['شناسه'] === '104' && r['نوع'] === 'بستهٔ سئو'; }));

    /* اسنیپت هنوز نیست */
    var r404 = { 'شناسه': '5', 'آدرس': 'x', 'وضعیت': 'در انتظار اعمال', 'متا': 'm', 'متن جایگزین تصویرها': '' };
    TG_MEM['ms:wp'] = function () { return { code: 404, json: { code: 'rest_no_route' } }; };
    ok('اسنیپت نیست: ردیف برای بعد می‌ماند', msApply_(r404) === 'later' && r404['وضعیت'] === 'در انتظار اعمال');

    /* ساعتی */
    TG_MEM['ms:wp'] = function (path, body) { calls.push({ path: path, body: body }); return { code: 200, json: { ok: true, prev_meta: '', title_now: '', alts_set: 0 } }; };
    TG_MEM['ms:now'] = String(pbTehran_(2026, 10, 21, 14, 5).getTime());
    var before = pbRows_('c', PB_T_SEO, PB_SEO_HEAD).length;
    msHourly_();
    ok('روز (۱۴): مقالهٔ تازه پردازش نمی‌شود', pbRows_('c', PB_T_SEO, PB_SEO_HEAD).length === before);
    TG_OUTBOX = [];
    TG_MEM['msp:MS_SUM_DAY'] = ''; TG_MEM['msp:MS_SUM_ROW'] = '';
    ok('ساعت ۱۰ به بعد: یک پیام برای سردبیر؛ هیچ دکمهٔ «ادامه» برای مالک (E28، روی کد قبلی مردود)', msSummary_('2026-10-21') === true &&
      TG_OUTBOX.some(function (x) { return x.chat === '321' && /صف سردبیر/.test(x.text); }) &&
      !TG_OUTBOX.some(function (x) { return x.chat === owner; }) && msSummary_('2026-10-21') === false);
    msOnCb_('777', 'msq:full');
    ok('فقط یاسر «ادامه» می‌زند', msLimit_() === 3 && (msOnCb_(owner, 'msq:full'), msLimit_() === 15));
    /* E20: خط گزارش شبانه می‌گوید چرا شب چیزی نرفت */
    TG_MEM['msp:MS_NIGHT:2026-10-21'] = '';
    ok('E20: شبی که هیچ ساعتش اجرا نشد با ⚠️ (روی کد قبلی مردود)', /^⚠️/.test(msNightLine_()) && /هیچ ساعت شبی اجرا نشد/.test(msNightLine_()) && TG_NIGHT_LINES.indexOf(msNightLine_) > -1, msNightLine_());
    TG_MEM['ms:now'] = String(pbTehran_(2026, 10, 21, 4, 5).getTime());
    TG_MEM['pbp:PB_GEM:' + pbDay_(pbNow_())] = '999';
    msHourly_();
    ok('E20: سقف Gemini پر، دلیل در خط شبانه', /سقف روزانهٔ Gemini/.test(msNightLine_()), msNightLine_());
    TG_MEM['pbp:PB_GEM:' + pbDay_(pbNow_())] = '';
    TG_MEM['msp:MS_NIGHT:2026-10-21'] = JSON.stringify({ run: 2, done: 3, limit: 1 });
    ok('E20: شب موفق بی ⚠️ با شمار', !/^⚠️/.test(msNightLine_()) && /شب ۳/.test(msNightLine_()), msNightLine_());
    ok('E20: یک‌بارهٔ فقط‌خواندنی در فهرست خودکار', CI_ONCE_AUTO.indexOf('msV17097Diag') > -1 && CI_ONCE_ALLOW.indexOf('msV17097Diag') > -1 && /صف شب: \d+ مطلب/.test(msV17097Diag()), msV17097Diag());

    /* E21: برگه فقط پیشنهاد؛ دستهٔ پربازدیدها اول */
    TG_MEM['ms:pages'] = [{ id: '297', u: 'https://tajrobeh.life/get-therapy/' }, { id: '12', u: 'https://tajrobeh.life/legal/' }];
    TG_MEM['pb:traffic'] = [{ u: 'https://tajrobeh.life/get-therapy/', n: 5000 }, { u: 'https://tajrobeh.life/sep/', n: 900 }];
    TG_MEM['wp:/wp-json/wp/v2/pages/297?_fields=id,link,title,content'] = { id: 297, link: 'https://tajrobeh.life/get-therapy/', title: { rendered: 'شروع تراپی' }, content: { rendered: '<p>شروع تراپی</p>' } };
    TG_MEM['wp:/wp-json/wp/v2/pages/12?_fields=id,link,title,content'] = { id: 12, link: 'https://tajrobeh.life/legal/', title: { rendered: 'قوانین' }, content: { rendered: '<p>قوانین</p>' } };
    TG_MEM['wp:/wp-json/wp/v2/posts/77?_fields=id,link,title,content,categories'] = { id: 77, link: 'https://tajrobeh.life/dream/', title: { rendered: 'خواب و رؤیا' }, content: { rendered: '<p>رؤیا</p>' }, categories: [] };
    var bo = msBatchOrder_();
    ok('E21: ترتیب دسته: برگهٔ پربازدید اول، نوشته‌ها، بعد بقیهٔ برگه‌ها؛ انجام‌شده‌ها نه', bo[0] === 'p297' && bo.indexOf('901') < 0 && bo.indexOf('104') < 0 && bo.indexOf('77') > 0 && bo[bo.length - 1] === 'p12', bo.join(','));
    calls = [];
    ok('E21: برگه فقط پیشنهاد، هیچ نوشتنی روی سایت (روی کد قبلی مردود)', msOne_('p297') === 'suggested' && calls.length === 0 &&
      pbRows_('s', SEO_TAB, MS_SEO_HEAD).some(function (r) { return r['شناسه'] === 'p297' && r['نوع'] === 'برگه'; }) &&
      pbRows_('c', PB_T_SEO, PB_SEO_HEAD).some(function (r) { return r['شناسه'] === 'p297' && r['وضعیت'] !== 'در انتظار اعمال'; }));
    TG_OUTBOX = []; TG_MEM['pbp:PB_GEM:' + pbDay_(pbNow_())] = '40';
    ok('E21: «/seobatch» فقط مالک', msOwnerCmd_('777', '/seobatch 5') === false && !msBatchState_().left);
    ok('E21: «/seobatch ۵» مالک دسته را می‌سازد', msOwnerCmd_(owner, '/seobatch ۵') === true && msBatchState_().left === 5 && TG_MEM['ms:arm'] === 5000);
    TG_MEM['gem:ledger'] = [];
    var nb = msBatchRun();
    var B = msBatchState_();
    ok('E21: اجرای دسته با سقف روزانهٔ پر هم می‌رود و صف را تمام می‌کند؛ سقف بعدش برمی‌گردد', nb === 2 && B.done === 2 && B.left === 0 && PB_GEM_NOCAP === false && pbGemLeft_() === 0 &&
      TG_OUTBOX.some(function (x) { return x.chat === owner && /دستهٔ بستهٔ سئو تمام شد/.test(x.text); }), nb + ' ' + JSON.stringify(B) + ' ' + PB_GEM_NOCAP + ' ' + pbGemLeft_() + ' ' + JSON.stringify(TG_OUTBOX.map(function (x) { return x.chat + ':' + String(x.text).slice(0, 40); })));
    ok('E21: دسته بازبینی Pro نمی‌کند', !(TG_MEM['gem:ledger'] || []).some(function (x) { return x[1] === 'بازبینی اول'; }));
    msBatch(10); TG_MEM['gem:ledger'] = [[new Date(Number(TG_MEM['ms:now'])), 'کاور', 'm', 200, 0, 0, 0, GEM_MONTH_EUR * GEM_EUR_USD + 1]];
    TG_MEM['gem:now'] = TG_MEM['ms:now'];
    ok('E21: سقف ماهانهٔ ۹۰ یورو دسته را تا شب بعد نگه می‌دارد', msBatchRun() === 'budget' && /سقف ماهانه/.test(msBatchState_().stop) && msBatchState_().left === 10 && TG_MEM['ms:arm'] > Number(TG_MEM['ms:now']), msBatchState_().stop);
    /* E25: دستور کار تازه از داوری لین F */
    MS_STAT_MEMO = {};
    TG_MEM['ms:stat:کوئری‌ها'] = [['تاریخ برداشت', 'کوئری', 'کلیک', 'ایمپرشن', 'CTR', 'رتبه', 'نیت', 'صفحهٔ هدف'],
      ['1405-07-20', 'اضطراب جدایی کودکان', '3', '120', '0.02', '9', 'اطلاعاتی', '/sep/'], ['1405-07-20', 'اضطراب جدایی', '9', '900', '0.01', '7', 'اطلاعاتی', '/sep/'],
      ['1405-05-01', 'کوئری کهنه', '1', '5000', '0', '9', 'اطلاعاتی', '/sep/'], ['1405-07-20', 'خواب', '1', '50', '0', '9', 'اطلاعاتی', '/sleep/']];
    ok('E25 الف: کلیدواژه‌های ۲۸ روزهٔ همان صفحه، پرایمپرشن اول، کهنه نه (روی کد قبلی مردود)', JSON.stringify(msQueries_('/sep/')) === JSON.stringify(['اضطراب جدایی', 'اضطراب جدایی کودکان']), JSON.stringify(msQueries_('/sep/')));
    var pr = pbSeoPrompt_({ title: { rendered: 'اضطراب جدایی' } }, 'متن', [], [], '', { queries: ['اضطراب جدایی'], faqs: ['اضطراب جدایی چیست؟'] });
    ok('E25: پرامپت کلیدواژه، پرسش‌های موجود و قاعدهٔ alt بی نام را دارد', pr.indexOf('اضطراب جدایی چیست؟') > -1 && /focus_keyword همان اولی/.test(pr) && /هرگز نام هیچ شخصی/.test(pr));
    var g0 = JSON.parse(JSON.stringify(TG_MEM['pb:gem']));
    ok('E25 الف: تیتری که کلیدواژهٔ اول را ندارد از گیت رد می‌شود', pbSeoGate_(g0, [], 'متن', { queries: ['واژه‌ای که در تیتر نیست'] }).some(function (x) { return /در تیتر نیست/.test(x); }) &&
      !pbSeoGate_(JSON.parse(JSON.stringify(TG_MEM['pb:gem'])), [], 'متن', { queries: ['اضطراب شبانه'] }).some(function (x) { return /در تیتر نیست/.test(x); }));
    TG_MEM['pb:names'] = ['نام آزمونی خانوادگی']; PB_NAMES_MEMO = null;
    var c0 = pbSeoClean_({ image_alts: [{ src: 'a-1024x576.webp', alt: 'ماه در شب' }, { src: 'ساختگی.webp', alt: 'تصویر' }, { src: 'b.webp', alt: 'عکس خانوادگی در جلسه' }],
      faq: [{ q: 'اضطراب جدایی چیست؟', a: 'x' }, { q: 'چه زمانی کمک بگیریم؟', a: 'y' }] }, ['https://tajrobeh.life/u/a-1024x576.webp', 'b.webp'], { faqs: ['اضطراب جدایی چیست'] });
    ok('E25 ب و ج: alt فقط برای فایل واقعی و بی نام شخص؛ پرسش تکراری حذف (روی کد قبلی مردود)', c0.image_alts.length === 1 && c0.image_alts[0].src === 'a-1024x576.webp' && c0.faq.length === 1 && c0.faq[0].q === 'چه زمانی کمک بگیریم؟', JSON.stringify(c0));
    ok('E25: پرسش‌های فعلی صفحه از HTML', JSON.stringify(msFaqs_('<h3>اضطراب چیست؟</h3><summary>درمان چقدر طول می‌کشد؟</summary><h2>مقدمه</h2>')) === JSON.stringify(['درمان چقدر طول می‌کشد؟', 'اضطراب چیست؟']), JSON.stringify(msFaqs_('<h3>اضطراب چیست؟</h3><summary>درمان چقدر طول می‌کشد؟</summary>')));
    TG_MEM['ms:stat:کارتابل بهینه‌سازی'] = [['#', 'صفحه / محل', 'کار', 'نوع', 'اولویت', 'وضعیت', 'شاخص هدف', 'عدد قبل', 'عدد بعد', 'تاریخ بررسی'],
      ['1', '/dream/', 'تیتر تازه', 'سئو', '۱', 'انجام شد ۱۴۰۵-۰۷-۲۵', 'CTR', '', '', ''], ['2', '/legal/', 'متا', 'سئو', '۲', 'در کار', '', '', '', '۱۴۰۶-۰۱-۰۱'],
      ['3', '/get-therapy/', 'قدیمی', 'سئو', '۱', 'انجام شد ۱۴۰۵-۰۴-۰۱', '', '', '', '۱۴۰۵-۰۵-۰۱']];
    MS_STAT_MEMO = {}; TG_MEM['msp:MS_DONE'] = '';
    var bo2 = msBatchOrder_(), T = msTouched_();
    ok('E25 د: صفحه‌های دست‌خوردهٔ ۲۸ روز اخیر و در پنجرهٔ سنجش کنار؛ کار کهنه نه (روی کد قبلی مردود)', T['/dream/'] && T['/legal/'] && !T['/get-therapy/'] && bo2.indexOf('77') < 0 && bo2.indexOf('p12') < 0 && msOrder_().indexOf('77') < 0, JSON.stringify(T) + ' ' + bo2.join(','));
    pbRows_('s', SEO_TAB, MS_SEO_HEAD).push({ 'شناسه': '104', 'وضعیت': 'رد' }, { 'شناسه': '104', 'وضعیت': 'رد' });
    ok('E25: یک‌بارهٔ «رد»ها: همان شناسه‌ها با فهرست ثابت دوباره در صف', /۱|1/.test(msV17098Redo()) && JSON.stringify(msBatchState_().only) === '["104"]' && CI_ONCE_AUTO.indexOf('msV17098Redo') > -1, JSON.stringify(msBatchState_()));
    /* E28: نمونه و دستهٔ خودکار با داوری لین F */
    TG_MEM['msp:MS_BATCH'] = ''; TG_MEM['ms:arm'] = 0;
    ok('E28: یک‌بارهٔ نمونه ۵ مطلب را بی فرمان مالک در صف می‌گذارد (روی کد قبلی مردود)', /نمونه در صف: ۵|5/.test(msV17099Sample()) && msBatchState_().left === 5 && CI_ONCE_AUTO.indexOf('msV17099Sample') > -1);
    ok('E28: «رد (لین F، …)» رد شمرده می‌شود، نه فقط «رد»', msVerdict_('رد (لین F، ۱ آبان)') === 'rej' && msVerdict_('تأیید شد') === 'acc' && msVerdict_('در انتظار تأیید') === '');
    var from = Number(TG_MEM['msp:MS_E25_FROM']);
    TG_MEM['msp:MS_BATCH'] = '';
    var addV = function (st, n) { for (var k = 0; k < n; k++) pbRows_('s', SEO_TAB, MS_SEO_HEAD).push({ 'تاریخ': new Date(from + 1000), 'شناسه': 'v' + st + k, 'وضعیت': st }); };
    addV('تأیید', 2); addV('رد (لین F)', 2); MS_AUTO_MEMO = null;
    ok('E28: زیر ۵ داوری، دستهٔ خودکار نیست', !msAutoOk_());
    addV('تأیید', 2); MS_AUTO_MEMO = null;
    ok('E28: ۴ از ۶ (۶۷٪) ← خودکار؛ سهم شب بالا می‌رود', msAutoOk_() && msLimit_() === 15);
    pbRows_('s', SEO_TAB, MS_SEO_HEAD).push({ 'تاریخ': new Date(from - 86400000), 'شناسه': 'old', 'وضعیت': 'رد' }, { 'تاریخ': new Date(from - 86400000), 'شناسه': 'old2', 'وضعیت': 'رد' }); MS_AUTO_MEMO = null;
    ok('E28: داوری‌های پیش از نمونه شمرده نمی‌شوند', msAutoOk_());
    TG_MEM['ms:now'] = String(pbTehran_(2026, 10, 22, 2, 5).getTime()); TG_MEM['msp:MS_AUTO_DAY'] = '';
    msHourly_();
    ok('E28: شب بعد دستهٔ خودکار ۸۰تایی، یک بار در روز', msBatchState_().total === MS_AUTO_N && TG_MEM['msp:MS_AUTO_DAY'] === msDay_() && (msProp_('MS_BATCH', JSON.stringify({ left: 0 })), msHourly_(), msBatchState_().left === 0));
    addV('رد (لین F)', 4); MS_AUTO_MEMO = null;
    ok('E28: نرخ زیر ۶۰٪ ← خودکار خاموش', !msAutoOk_());
    MS_AUTO_MEMO = null;
    ok('E21: سیم‌کشی /seobatch در پیام‌ها', String(tgPrivate_).indexOf('msOwnerCmd_') > -1);
    MS_ON = '0';
    ok('MAGSEO_ON = 0 خاموش می‌کند', msHourly_() === 'off');
    ok('کلیدهای بستهٔ سئو اختیاری‌اند', ['MAGSEO_ON', 'MAGSEO_DAILY'].every(function (k) { return CFG_OPTIONAL.indexOf(k) > -1; }));
    ok('سیم‌کشی: واچ‌داگ ساعتی و مسیر دکمهٔ msq:', String(tgWatchdog).indexOf('msHourly_') > -1 && String(tgOnCallback_).indexOf("'msq:'") > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; MS_ON = cfgK[0]; MS_DAILY = cfgK[1]; PB_GEM_NOCAP = false; PB_NAMES_MEMO = null; MS_STAT_MEMO = {}; MS_AUTO_MEMO = null; GEM_TASK = '';
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ بستهٔ سئو و بازبینی اول درست است'));
  return tgTestTally_(log, fail);
}
