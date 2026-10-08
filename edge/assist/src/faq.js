// پرسش‌های پرتکرار دستیار (content/assist/faq.json، ساختهٔ Cowork از صفحه‌های منتشرشدهٔ سایت). منبع اول پاسخ.
// تطبیق بی هوش مصنوعی: یکسان‌سازی فارسی، حذف واژه‌های پرسشی و محاوره‌ای، BM25 روی question و variants و keywords
// (keywords با وزن بیشتر). جواب همان متن فایل است با دکمهٔ لینک‌هایش؛ ورکر متن جواب را نمی‌سازد و عوض نمی‌کند.

/* ───── یکسان‌سازی ───── */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹', AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function faNorm(s) {
  s = String(s || '')
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[يى]/g, 'ی').replace(/[كڪ]/g, 'ک').replace(/ة/g, 'ه').replace(/[أإٱآ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ی').replace(/ۀ/g, 'ه')
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')          /* اعراب و کشیده */
    .replace(/[‌‍‎‏]/g, '')          /* نیم‌فاصله و نشانه‌های جهت: «می‌خواهم» و «میخواهم» یکی */
    .toLowerCase()
    .replace(/[؟?،,؛;:!«»"'()\[\]{}.\-_/\\|*+=<>٪%٫٬…]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  /* «می خواهم»، «نمی دانم» و «دوره ها» با فاصله هم یکی شوند */
  return s.replace(/(^| )(ن?می) (?=\S)/g, '$1$2').replace(/ (ها|های|هایی|ای|ام|ات|اش)(?= |$)/g, '$1');
}
/* واژه‌های پرسشی، محاوره‌ای و پرکاربرد بی‌معنا برای تطبیق */
const STOP = ('از به با در بر که این آن اون را رو و یا تا برای چه چی چرا چطور چطوری چگونه چجوری چجور آیا من ما شما شماها تو او اونها آنها ' +
  'هست است هستم هستید هستین هستش بود شد شود میشه میشود میشن کنم کنید کنیم کنین کرد کردم کن کنه یک یه هم اگر ولی اما خیلی لطفا لطفاً سلام ممنون مرسی ' +
  'باید دارم دارید دارین داره دارد داریم نداره ندارید بله نه کجا کجاست کجان کجاس کی کیه کیست کدام کدوم چند چنده همین همان چیزی چیه چیست چیس ' +
  'چقدر چقدره چقد چقده خوب خوبه میخوام میخواهم میخوایم میخواستم میخواستیم خواهم خواستم بخوام بخواهم بدونم دونم میدونم بگید بگین بگو بگویید بفرمایید ' +
  'توی دیگه دیگر هر همه وقتی اینکه آنکه بی ای ام چطوریه چجوریه هستن هستند میتونم میتونیم بشه بشم بکنم ممکنه ممکن لطف').split(/\s+/);
const STOP_SET = new Set(STOP.map(faNorm).filter(Boolean));
/* ریشهٔ ساده: پسوندهای جمع و ضمیر؛ «می»ِ ابتدای فعل */
export function faStem(t) {
  if (t.length > 4 && /^(نمی|می)/.test(t)) t = t.replace(/^(نمی|می)/, '');
  for (const suf of ['هایی', 'های', 'ها', 'ترین', 'تر', 'یی', 'ای', 'ام', 'ات', 'اش', 'یم', 'ید', 'ند', 'ی']) if (t.length - suf.length >= 3 && t.endsWith(suf)) return t.slice(0, -suf.length);
  return t;
}
export function faTokens(s) {
  const out = [];
  for (const w of faNorm(s).split(' ')) { if (!w || w.length < 2 || STOP_SET.has(w)) continue; out.push(faStem(w)); }
  return out;
}

/* ───── BM25F ساده: هر پرسش یک سند؛ question و variants وزن ۱، keywords وزن KW_W ───── */
export const KW_W = 2.5, K1 = 1.2, B = 0.6;
/* آستانه‌ها (۱۶ مهر، روی ۵۰ پرسش و ۲۴۷ شکل فایل Cowork): SURE امتیاز نرمال‌شدهٔ بهترین (نسبت به بیشینهٔ ممکن برای همین پرسش)،
   GAP برتری نسبی بر دومی. با هر شکلِ بیرون‌گذاشته از نمایه (سخت‌ترین سنجش) دقتِ جواب‌های مطمئن ۹۴٪ و پوشش ۴۸٪؛ بقیه به دسته‌بند جمنای
   می‌رود. با شکل‌های خود فایل ۲۹۱ از ۲۹۷ درست؛ هیچ پرسش بی‌ربطی جواب مطمئن نمی‌گیرد. */
export const SURE = 0.5, GAP = 0.4, NEAR_MIN = 0.12;

export function loadFaq(data) {
  const items = (Array.isArray(data) ? data : (data && (data.faq || data.items)) || []).filter((f) => f && f.id && f.answer);
  const docs = items.map((f) => {
    const tf = new Map(), add = (t, w) => tf.set(t, (tf.get(t) || 0) + w);
    for (const t of faTokens(f.question)) add(t, 1);
    for (const v of f.variants || []) for (const t of new Set(faTokens(v))) add(t, 1);
    for (const k of f.keywords || []) for (const t of faTokens(k)) add(t, KW_W);
    let len = 0; for (const v of tf.values()) len += v;
    return { f, tf, len };
  });
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avg = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length);
  const byId = new Map(items.map((f) => [String(f.id), f]));
  /* جملهٔ کامل یکسان‌شده (بی واژه‌های پرسشی) ← پرسش؛ اگر دو پرسش یک شکل داشتند، هیچ‌کدام (مبهم) */
  const exact = new Map();
  for (const f of items) for (const s of [f.question].concat(f.variants || [])) {
    const k = faTokens(s).join(' '); if (!k) continue;
    exact.set(k, exact.has(k) && exact.get(k) !== f ? null : f);
  }
  return { items, docs, df, N: docs.length, avg, byId, exact, version: (data && data.version) || '' };
}
function idf(F, t) { const n = F.df.get(t) || 0; return Math.log(1 + (F.N - n + 0.5) / (n + 0.5)); }
/** همهٔ پرسش‌ها با امتیاز؛ norm = امتیاز ÷ بیشینهٔ ممکن (همهٔ واژه‌های پرسش با بیشترین tf) */
export function faqRank(F, text) {
  const q = [...new Set(faTokens(text))];
  if (!q.length || !F.N) return [];
  const sat = (tf, len) => (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * len / F.avg));
  const max = q.reduce((a, t) => a + idf(F, t) * (K1 + 1), 0) || 1;
  return F.docs.map((d) => {
    let s = 0, hit = 0;
    for (const t of q) { const tf = d.tf.get(t); if (tf) { s += idf(F, t) * sat(tf, d.len); hit++; } }
    return { f: d.f, score: s, norm: s / max, hit };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}
/** {sure, best, ranked}: sure یعنی امتیاز بالای آستانه و فاصلهٔ کافی با دومی */
export function faqMatch(F, text) {
  const ranked = faqRank(F, text);
  const ex = F.exact.get(faTokens(text).join(' '));
  if (ex) { const r = ranked.find((x) => x.f === ex); return { sure: true, exact: true, best: r || { f: ex, score: 1, norm: 1, hit: 0 }, gap: 1, ranked }; }
  const best = ranked[0], second = ranked[1];
  const gap = best ? (best.score - (second ? second.score : 0)) / best.score : 0;
  const sure = !!best && best.norm >= SURE && gap >= GAP;
  return { sure, best: best || null, gap, ranked };
}
/** سه پرسش نزدیک برای دکمه (اگر هیچ هم‌پوشانی نیست، پرسش‌های عمومی اول فایل) */
export function faqNear(F, text, n = 3) {
  const r = faqRank(F, text).filter((x) => x.norm >= NEAR_MIN).slice(0, n).map((x) => x.f);
  for (const f of F.items) { if (r.length >= n) break; if (!r.includes(f) && (f.audience === 'همه' || f.audience === 'مراجع')) r.push(f); }
  return r.slice(0, n);
}
/** پرسش طبقه‌بندی برای جمنای: فقط id و question؛ خروجی فقط یک id یا none */
export function classifyPrompt(F, q) {
  return 'تو فقط دسته‌بند هستی. پرسش کاربر را با یکی از پرسش‌های پرتکرار زیر جفت کن. فقط id همان پرسش را برگردان؛ اگر هیچ‌کدام همان موضوع نیست، "none". ' +
    'هیچ متن دیگری ننویس.\n\nپرسش کاربر: ' + q + '\n\nپرسش‌ها:\n' + F.items.map((f) => f.id + ': ' + f.question).join('\n');
}
export const CLASSIFY_SCHEMA = { type: 'OBJECT', properties: { id: { type: 'STRING' } }, required: ['id'] };
/** خروجی جمنای ← پرسش یا null (هر چیزی جز id موجود، none است) */
export function classifyPick(F, out) {
  const id = String((out && out.id) || '').trim();
  return id && id !== 'none' && F.byId.has(id) ? F.byId.get(id) : null;
}
