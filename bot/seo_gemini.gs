/**
 * بستهٔ سئوی خودکار مجله با Gemini (لایهٔ رایگان؛ فقط محتوای منتشرشده، هیچ دادهٔ مراجع).
 * خروجی فقط پیشنهاد است و در تب «سئو · پیشنهاد Gemini» هاب آمار می‌نشیند تا تأیید شود.
 * توابع اجرایی: seoReach · seoPackage(id) · seoRunPriority · seoDaily
 */
var SEO_SITE = 'https://tajrobeh.life';
var SEO_SHEET = cfg_('TG_STAT_SHEET_ID', '');
var SEO_TAB = 'سئو · پیشنهاد Gemini';
var SEO_MODEL = 'gemini-flash-latest';
var SEO_SUFFIX = ' | تجربه زندگی';
var SEO_PRIORITY = [104, 86, 193, 118, 89, 35];
var SEO_HEAD = ['تاریخ', 'شناسه', 'آدرس', 'تیتر فعلی', 'تیتر پیشنهادی', 'طول تیتر', 'متای فعلی', 'متای پیشنهادی', 'طول متا',
  'کلیدواژهٔ اصلی', 'پاسخ کوتاه (زیر H1)', 'پرسش‌های پرتکرار', 'متن جایگزین تصویرها', 'لینک داخلی پیشنهادی', 'ایرادهای گیت', 'وضعیت', 'یادداشت تأییدکننده'];

function seoReach() {
  var r = UrlFetchApp.fetch(SEO_SITE + '/wp-json/wp/v2/posts?per_page=1&_fields=id', { muteHttpExceptions: true });
  Logger.log('WP REST HTTP ' + r.getResponseCode() + ' : ' + r.getContentText().slice(0, 80));
}

function seoGet_(path) {
  var r = UrlFetchApp.fetch(SEO_SITE + path, { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('WP ' + r.getResponseCode() + ' ' + path);
  return JSON.parse(r.getContentText());
}

function seoStrip_(html) {
  return String(html || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#8204;/g, '‌')
    .replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function seoPool_() {
  var c = CacheService.getScriptCache(), hit = c.get('seoPool');
  if (hit) return JSON.parse(hit);
  var all = [];
  for (var p = 1; p <= 5; p++) {
    var r = UrlFetchApp.fetch(SEO_SITE + '/wp-json/wp/v2/posts?per_page=100&page=' + p + '&_fields=id,title,link', { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) break;
    var j = JSON.parse(r.getContentText()); if (!j.length) break;
    j.forEach(function (x) { all.push({ id: x.id, t: seoStrip_(x.title.rendered), u: decodeURI(x.link) }); });
  }
  try { c.put('seoPool', JSON.stringify(all), 21600); } catch (e) {}
  return all;
}

var SEO_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-3.5-flash'];

/** با تلاش دوباره و مدل جایگزین وقتی گوگل شلوغ است (۵۰۳) یا سهمیهٔ یک مدل پر شده (۴۲۹). */
function gemJson_(prompt, schema) {
  var last = '';
  for (var k = 0; k < SEO_MODELS.length * 2; k++) {
    var mdl = SEO_MODELS[k % SEO_MODELS.length];
    var res = gemFetch_('models/' + mdl + ':generateContent', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 }
    });
    if (res.code === 200) {
      var t = (((res.body.candidates || [])[0] || {}).content || {}).parts;
      try { var o = JSON.parse((t || []).map(function (p) { return p.text || ''; }).join('')); o._model = mdl; return o; }
      catch (e) { last = mdl + ' JSON خراب'; continue; }
    }
    last = mdl + ' ' + res.code;
    Logger.log('تلاش ' + (k + 1) + ': ' + last);
    if (res.code === 400 || res.code === 403) break;
    Utilities.sleep(5000 + 5000 * Math.floor(k / SEO_MODELS.length));
  }
  throw new Error('Gemini ناموفق: ' + last);
}

var SEO_SCHEMA = {
  type: 'OBJECT',
  properties: {
    focus_keyword: { type: 'STRING' },
    seo_title: { type: 'STRING' },
    meta_description: { type: 'STRING' },
    short_answer: { type: 'STRING' },
    faq: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: { type: 'STRING' }, a: { type: 'STRING' } }, required: ['q', 'a'] } },
    image_alts: { type: 'ARRAY', items: { type: 'OBJECT', properties: { src: { type: 'STRING' }, alt: { type: 'STRING' } }, required: ['src', 'alt'] } },
    internal_links: { type: 'ARRAY', items: { type: 'OBJECT', properties: { anchor: { type: 'STRING' }, url: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['anchor', 'url'] } }
  },
  required: ['focus_keyword', 'seo_title', 'meta_description', 'short_answer', 'faq', 'image_alts', 'internal_links']
};

function seoPrompt_(post, text, imgs, pool, feedback) {
  var cats = { 18: 'فیلم', 19: 'کتاب', 17: 'پادکست' };
  var kind = (post.categories || []).map(function (c) { return cats[c]; }).filter(Boolean).join('، ');
  var seed = (seoStrip_(post.title.rendered) + ' ' + text.slice(0, 3000)).split(/[\s،.؛:!؟()«»"]+/).filter(function (w) { return w.length > 2; });
  var bag = {}; seed.forEach(function (w) { bag[w] = 1; });
  var poolTxt = pool.filter(function (x) { return x.id !== post.id; })
    .map(function (x) { x.s = x.t.split(/\s+/).filter(function (w) { return bag[w]; }).length; return x; })
    .sort(function (a, b) { return b.s - a.s; }).slice(0, 40).map(function (x) { return x.t + ' :: ' + x.u; }).join('\n');
  return [
    'تو ویراستار سئوی «مجلهٔ تجربه» هستی؛ مجلهٔ روان‌درمانی و روانکاوی مرکز تجربه زندگی. خروجی فقط JSON طبق اسکیما.',
    'قاعده‌ها:',
    '۱. seo_title بین ۵۰ تا ۶۰ نویسه، و دقیقاً با «' + SEO_SUFFIX.trim() + '» تمام شود (با فاصله و خط عمودی پیش از آن). باید با کوئری واقعی جست‌وجوی فارسی بخواند، نه اسم داخلی مطلب.',
    '۲. meta_description بین ۱۲۰ تا ۱۵۵ نویسه، یک جملهٔ کامل و دعوت‌کننده، بدون وعده‌ای که در متن نیست.',
    kind ? '۳. این مطلب دربارهٔ ' + kind + ' است: واژهٔ «معرفی» را در تیتر نیاور؛ «تحلیل روانکاوانهٔ …» بهتر کلیک می‌گیرد اگر متن واقعاً تحلیل دارد.' : '۳. تیتر روشن و مسئله‌محور.',
    '۴. هیچ خط تیرهٔ بلند یا کوتاه (— یا –) در هیچ متنی. «بیمار»، «مشتری» و «ارگانیک» ننویس. «مراجع» فقط برای کسی است که در جلسهٔ درمان است؛ هرگز واژه‌هایی مثل فرزند، فرد، خواننده یا مادر را با «مراجع» عوض نکن.',
    '۴ب. نیم‌فاصلهٔ فارسی را درست بگذار: «می‌/نمی‌» پیش از فعل و «‌ها، ‌های، ‌تر، ‌ترین» بعد از اسم و صفت؛ مثل «پادکست‌های»، «ویژگی‌های»، «شنیدنی‌ترین». «تأثیر» با همزه.',
    '۵. short_answer بین ۴۰ تا ۶۰ واژه، پاسخ مستقیم به پرسش اصلی مطلب، فقط از خود متن.',
    '۶. faq سه تا پنج پرسش که مردم واقعاً جست‌وجو می‌کنند؛ پاسخ هر کدام ۲ تا ۳ جمله و فقط از متن مقاله. ادعای بالینی تازه نساز.',
    '۷. image_alts برای هر تصویر فهرست‌شده یک متن جایگزین فارسی کوتاه (زیر ۱۲۵ نویسه) بر پایهٔ بافت متن؛ اگر نمی‌دانی چه چیزی در تصویر است، کلی و صادق بنویس.',
    '۸. internal_links سه تا پنج پیوند فقط از فهرست «مطالب موجود» زیر، که واقعاً به موضوع مربوط‌اند؛ anchor عبارتی طبیعی از متن همین مقاله باشد. هیچ آدرسی بیرون از فهرست نساز.',
    feedback ? 'ایرادهای نسخهٔ قبلی که باید رفع شود: ' + feedback : '',
    '',
    'عنوان فعلی: ' + seoStrip_(post.title.rendered),
    'تصویرها: ' + (imgs.length ? imgs.join(' ، ') : 'ندارد'),
    'متن مقاله:',
    text.slice(0, 14000),
    '',
    'مطالب موجود:',
    poolTxt
  ].join('\n');
}

function seoFix_(s) {
  return String(s).replace(/ (ها|های|هایی|ترین|تری)(?=[\s،.؛:!؟]|$)/g, '\u200c$1')
    .replace(/(^|\s)(می|نمی) (?=[\u0600-\u06FF])/g, '$1$2\u200c').replace(/تاثیر/g, 'تأثیر');
}

function seoFixAll_(o) {
  ['seo_title', 'meta_description', 'short_answer', 'focus_keyword'].forEach(function (k) { o[k] = seoFix_(o[k]); });
  o.faq.forEach(function (f) { f.q = seoFix_(f.q); f.a = seoFix_(f.a); });
  o.image_alts.forEach(function (a) { a.alt = seoFix_(a.alt); });
  return o;
}

function seoGate_(o, pool, text) {
  var bad = [], urls = {};
  pool.forEach(function (x) { urls[x.u] = 1; });
  var tl = o.seo_title.length, ml = o.meta_description.length;
  if (tl < 50 || tl > 60) bad.push('طول تیتر ' + tl);
  if (o.seo_title.slice(-SEO_SUFFIX.length) !== SEO_SUFFIX) bad.push('پسوند تیتر');
  if (ml < 120 || ml > 155) bad.push('طول متا ' + ml);
  var all = JSON.stringify(o);
  if (/[—–]/.test(all)) bad.push('خط تیره');
  if (/بیمار|مشتری|ارگانیک/.test(all)) bad.push('واژهٔ ممنوع');
  if (/مراجع/.test(all) && !/مراجع/.test(text || '')) bad.push('«مراجع» بی‌جا');
  var w = o.short_answer.trim().split(/\s+/).length;
  if (w < 35 || w > 70) bad.push('پاسخ کوتاه ' + w + ' واژه');
  if (o.faq.length < 3) bad.push('پرسش کم');
  o.internal_links = o.internal_links.filter(function (l) { return urls[decodeURI(l.url)] || urls[l.url]; });
  if (o.internal_links.length < 2) bad.push('لینک داخلی معتبر کم');
  return bad;
}

function seoTab_() {
  var ss = SpreadsheetApp.openById(SEO_SHEET), sh = ss.getSheetByName(SEO_TAB);
  if (!sh) {
    sh = ss.insertSheet(SEO_TAB);
    sh.getRange(1, 1, 1, SEO_HEAD.length).setValues([SEO_HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.setRightToLeft(true);
    sh.getRange('P2:P').setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList(['در انتظار تأیید', 'تأیید', 'اصلاح لازم', 'رد', 'اعمال شد'], true).build());
  }
  return sh;
}

function seoPackage(id) {
  id = id || SEO_PRIORITY[0];
  var post = seoGet_('/wp-json/wp/v2/posts/' + id + '?_fields=id,link,title,content,categories,yoast_head_json');
  var html = post.content.rendered, text = seoStrip_(html);
  var imgs = [], m, re = /<img[^>]+src="([^"]+)"[^>]*>/g;
  while ((m = re.exec(html)) && imgs.length < 12) { if (!/alt="[^"]{3,}"/.test(m[0])) imgs.push(m[1].split('/').pop()); }
  var pool = seoPool_(), o, bad = [], fb = '';
  for (var i = 0; i < 3; i++) {
    o = gemJson_(seoPrompt_(post, text, imgs, pool, fb), SEO_SCHEMA);
    o = seoFixAll_(o);
    bad = seoGate_(o, pool, text);
    if (!bad.length) break;
    fb = bad.join('، ');
    Utilities.sleep(4000);
  }
  var y = post.yoast_head_json || {};
  var row = [new Date(), id, decodeURI(post.link), y.title || '', o.seo_title, o.seo_title.length, y.description || '',
    o.meta_description, o.meta_description.length, o.focus_keyword, o.short_answer,
    o.faq.map(function (f, k) { return (k + 1) + '. ' + f.q + '\n' + f.a; }).join('\n\n'),
    o.image_alts.map(function (a) { return a.src + ' ← ' + a.alt; }).join('\n'),
    o.internal_links.map(function (l) { return l.anchor + ' ← ' + l.url; }).join('\n'),
    bad.join('، '), bad.length ? 'اصلاح لازم' : 'در انتظار تأیید', ''];
  var sh = seoTab_();
  sh.appendRow(row);
  sh.getRange(sh.getLastRow(), 1, 1, row.length).setWrap(true).setVerticalAlignment('top');
  Logger.log(id + ' → ' + o.seo_title + ' (' + o.seo_title.length + ') | gate: ' + (bad.join('، ') || 'OK'));
  return bad.length === 0;
}

function seoDone_() {
  var sh = seoTab_(), n = sh.getLastRow(), seen = {};
  if (n > 1) sh.getRange(2, 2, n - 1, 1).getValues().forEach(function (r) { seen[r[0]] = 1; });
  return seen;
}

/** پربازدیدها را اول، هر کدام یک بار. */
function seoRunPriority() {
  var seen = seoDone_();
  SEO_PRIORITY.forEach(function (id) {
    if (seen[id]) return;
    try { seoPackage(id); } catch (e) { Logger.log(id + ' خطا: ' + e.message); }
    Utilities.sleep(8000);
  });
}

/** برای تریگر روزانه: پنج مطلب بعدی که هنوز بسته ندارند (اول فهرست اولویت، بعد جدیدترها). */
function seoDaily() {
  var seen = seoDone_(), queue = SEO_PRIORITY.concat(seoPool_().map(function (x) { return x.id; }));
  var n = 0;
  for (var i = 0; i < queue.length && n < 5; i++) {
    if (seen[queue[i]]) continue;
    seen[queue[i]] = 1;
    try { seoPackage(queue[i]); n++; } catch (e) { Logger.log(queue[i] + ' خطا: ' + e.message); }
    Utilities.sleep(8000);
  }
}

/** برای بازبینی: همهٔ ردیف‌ها را در لاگ نشان می‌دهد. */
function seoShow() {
  var sh = seoTab_(), d = sh.getDataRange().getDisplayValues();
  Logger.log('ردیف‌ها: ' + (d.length - 1));
  for (var i = 1; i < d.length; i++) {
    Logger.log('==== ' + d[i][1]);
    [4, 5, 7, 8, 9, 10, 11, 12, 13, 14].forEach(function (k) { Logger.log(SEO_HEAD[k] + ': ' + String(d[i][k]).replace(/https?:\/\/tajrobeh\.life/g, '').slice(0, 1500)); });
  }
}

/** همهٔ ردیف‌های تب را پاک می‌کند و پربازدیدها را از نو می‌سازد. */
function seoRedoPriority() {
  var sh = seoTab_(); if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  seoRunPriority();
}
