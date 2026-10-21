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
function msLimit_() { return msProp_('MS_SAMPLE_OK') ? Math.max(1, MS_DAILY) : Math.min(MS_SAMPLE, Math.max(1, MS_DAILY)); }
function msAdd_(id, url, kind, now, sug, why, st) {
  pbAdd_('c', MS_TAB, MS_HEAD, { 'تاریخ': pbFmt_(msNow_()), 'شناسه': String(id), 'آدرس': url, 'نوع': kind,
    'فعلی': msNoDash_(now).slice(0, 2000), 'پیشنهادی': msNoDash_(sug).slice(0, 3000), 'دلیل': msNoDash_(why).slice(0, 500), 'وضعیت': st || MS_ST.wait });
}

/* ترتیب: تازه‌ها، بعد ترافیک؛ هر مقاله یک بار (هر چه در «بستهٔ سئو» یا صف سردبیر هست، انجام‌شده است) */
function msOrder_() {
  var done = {};
  pbRows_('c', PB_T_SEO, PB_SEO_HEAD).forEach(function (r) { done[String(r['شناسه']).trim()] = 1; });
  pbRows_('c', MS_TAB, MS_HEAD).forEach(function (r) { done[String(r['شناسه']).trim()] = 1; });
  var m = pbArtMap_(), now = msNow_().getTime(), out = [], seen = {};
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

/** یک مقاله: بسته، بازبینی، اعمال. */
function msOne_(id) {
  var r = pbGemSeo_(id, false);
  if (!r.ok) throw new Error(r.error || 'بستهٔ سئو');
  var post = pbWp_('/wp-json/wp/v2/posts/' + id + '?_fields=id,link,title,content,categories');
  var url = decodeURI(String(post.link || '')), text = seoStrip_(post.content.rendered);
  msReview_(id, url, seoStrip_(post.title.rendered), text);
  var row = pbRows_('c', PB_T_SEO, PB_SEO_HEAD).filter(function (x) { return String(x['شناسه']).trim() === String(id); }).pop();
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
    var used = Number(msProp_('MS_DAY:' + day) || 0), ids = msOrder_();
    while (n < MS_PER_RUN && used < msLimit_() && ids.length && pbGemLeft_() > 2) {
      var id = ids.shift();
      try { msOne_(id); } catch (e1) { msAdd_(id, '', 'خطا', '', '', String(e1.message || e1).slice(0, 200)); tgErr_('msOne_', e1); }
      used++; n++; msProp_('MS_DAY:' + day, String(used));
    }
  }
  if (h >= MS_SUM_HOUR) { try { msSummary_(day); } catch (e2) { tgErr_('msSummary_', e2); } }
  return n;
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
  if (!msProp_('MS_SAMPLE_OK')) {
    tgSend_(String(TG_OWNER_CHAT), '🧾 <b>نمونهٔ بستهٔ سئو</b>\nروی ' + tgFa_(n) + ' مقاله متا و alt خودکار اعمال شد (' + tgFa_(ap) + ' مورد، برگشت‌پذیر) و ' + tgFa_(wait) + ' پیشنهاد به صف سردبیر رفت.\n' +
      Object.keys(arts).filter(function (k) { return arts[k]; }).map(function (k) { return '• ' + tgEsc_(arts[k]); }).join('\n') +
      '\n\nاگر درست است، «ادامه» را بزنید تا هر شب تا ' + tgFa_(MS_DAILY) + ' مقاله برود.', { inline_keyboard: [[{ text: '▶️ ادامه', callback_data: 'msq:full' }]] });
  }
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
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
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
    ok('ساعت ۱۰ به بعد: یک پیام برای سردبیر و نمونه با دکمهٔ «ادامه» برای یاسر (روی کد قبلی مردود)', msSummary_('2026-10-21') === true &&
      TG_OUTBOX.some(function (x) { return x.chat === '321' && /صف سردبیر/.test(x.text); }) &&
      TG_OUTBOX.some(function (x) { return x.chat === owner && JSON.stringify(x.markup || '').indexOf('msq:full') > -1; }) && msSummary_('2026-10-21') === false);
    msOnCb_('777', 'msq:full');
    ok('فقط یاسر «ادامه» می‌زند', msLimit_() === 3 && (msOnCb_(owner, 'msq:full'), msLimit_() === 15));
    MS_ON = '0';
    ok('MAGSEO_ON = 0 خاموش می‌کند', msHourly_() === 'off');
    ok('کلیدهای بستهٔ سئو اختیاری‌اند', ['MAGSEO_ON', 'MAGSEO_DAILY'].every(function (k) { return CFG_OPTIONAL.indexOf(k) > -1; }));
    ok('سیم‌کشی: واچ‌داگ ساعتی و مسیر دکمهٔ msq:', String(tgWatchdog).indexOf('msHourly_') > -1 && String(tgOnCallback_).indexOf("'msq:'") > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; MS_ON = cfgK[0]; MS_DAILY = cfgK[1]; GEM_TASK = '';
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ بستهٔ سئو و بازبینی اول درست است'));
  return tgTestTally_(log, fail);
}
