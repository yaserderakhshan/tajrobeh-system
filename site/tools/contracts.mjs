// قرارداد صفحه‌ها (site/contracts.json): نشانگرهای ثابتی که کد (اسنیپت، بات) به آن‌ها تکیه دارد.
// contractProblems: برای site-check (نسخهٔ PR) و site-mirror (سایت زنده). hookProblems: قلاب‌های عینی مجله در متن خود مقاله
// (فقط خواندن از سایت). هر پیام «breaks» همان قاعده را دارد تا قرمز شدن بگوید چه می‌شکند.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const CONTRACTS_FILE = join(ROOT, 'site', 'contracts.json');
export function loadContracts(text) { return JSON.parse(text ?? readFileSync(CONTRACTS_FILE, 'utf8')); }

/** read(path نسبت به ریشهٔ مخزن) ← متن یا null. برمی‌گرداند فهرست مشکل‌ها. */
export function contractProblems(C, read) {
  const out = [];
  for (const r of C.rules || []) {
    if (r.kind !== 'hooks') {
      const html = read(r.file);
      if (html === null || html === undefined) out.push(`${r.where}: فایل ${r.file} نیست؛ ${r.breaks}`);
      else {
        const n = String(html).split(r.marker).length - 1, want = r.count ?? 1;
        if (n !== want) out.push(`${r.where}: نشانگر ${r.marker} ${n ? n + ' بار (باید ' + want + ')' : 'نیست'}؛ ${r.breaks}`);
      }
    }
    for (const u of r.users || []) {
      const code = read(u.file);
      if (code === null || code === undefined) continue;
      if (!String(code).includes(u.needle)) out.push(`${u.file} دیگر «${u.needle}» را ندارد (${u.what})؛ قرارداد «${r.id}» در site/contracts.json را با کد یکی کن`);
    }
  }
  return out;
}

/* قلاب‌ها از کد 503540: array( 'p' => 260, 'q' => '...' ) */
export function parseHooks(php) {
  const a = String(php).indexOf('function tj_mag_hooks');
  if (a < 0) return [];
  const body = String(php).slice(a, String(php).indexOf('\n}', a));
  const out = [];
  for (const m of body.matchAll(/array\(\s*'p'\s*=>\s*(\d+)\s*,\s*'q'\s*=>\s*'((?:[^'\\]|\\.)*)'\s*\)/g)) out.push({ p: Number(m[1]), q: m[2].replace(/\\(.)/g, '$1') });
  return out;
}
const ENT = { nbsp: ' ', zwnj: '‌', zwj: '', amp: '&', quot: '"', laquo: '«', raquo: '»', lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"', hellip: '…', ndash: '-', mdash: '-' };
/* متن قابل مقایسه: بی تگ، موجودیت‌ها باز، ی و ک فارسی، گیومه‌ها یکی، فاصله و نیم‌فاصله یکی */
export function normText(s) {
  return String(s ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[«»“”„"]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[\s‌‏‎]+/g, ' ').trim();
}
/** wp: wpClient (فقط GET). برمی‌گرداند {problems, notes, checked} */
export async function hookProblems(wp, php, rule = { where: 'قلاب‌های هیروی مجله', breaks: 'جملهٔ قلاب در متن مقاله نیست' }) {
  const hooks = parseHooks(php), problems = [], notes = [];
  if (!hooks.length) { problems.push(`${rule.where}: هیچ قلابی در tj_mag_hooks پیدا نشد (ساختار تابع عوض شده؟)؛ نگهبان را با کد یکی کن`); return { problems, notes, checked: 0 }; }
  let checked = 0;
  for (const h of hooks) {
    let r = await wp.get(`/wp-json/wp/v2/posts/${h.p}?context=edit&_fields=id,status,content`, { retries: 2 });
    if (r.status === 401 || r.status === 403) r = await wp.get(`/wp-json/wp/v2/posts/${h.p}?_fields=id,status,content`, { retries: 2, authed: false });
    if (r.status === 404) { notes.push(`نوشتهٔ ${h.p} منتشر نیست یا نیست؛ قلابش روی مجله نمی‌آید`); continue; }
    if (!r.ok || !r.json) { notes.push(`نوشتهٔ ${h.p}: خوانده نشد (HTTP ${r.status})؛ این بار سنجیده نشد`); continue; }
    if (r.json.status && r.json.status !== 'publish') { notes.push(`نوشتهٔ ${h.p} منتشر نیست؛ قلابش روی مجله نمی‌آید`); continue; }
    const text = normText(r.json.content?.raw ?? r.json.content?.rendered ?? '');
    checked++;
    if (!text.includes(normText(h.q))) problems.push(`${rule.where}: جملهٔ قلاب نوشتهٔ ${h.p} («${h.q.slice(0, 40)}…») در متن همان مقاله نیست؛ ${rule.breaks}`);
  }
  return { problems, notes, checked };
}

export function contractsSelfTest() {
  const bad = [], t = (n, c) => { if (!c) bad.push(n); };
  const C = { rules: [{ id: 'a', file: 'p.html', where: 'برگهٔ آ', marker: '<!-- m -->', count: 1, users: [{ file: 's.php', needle: '<!-- m -->', what: 'x' }], breaks: 'می‌شکند' }] };
  const files = { 'p.html': '<div><!-- m --></div>', 's.php': "$k='<!-- m -->';" };
  t('سالم ← بی مشکل', contractProblems(C, (f) => files[f] ?? null).length === 0);
  t('نشانگر حذف ← قرمز با breaks', contractProblems(C, (f) => (f === 'p.html' ? '<div></div>' : files[f])).some((x) => /نیست؛ می‌شکند/.test(x)));
  t('نشانگر دوبار ← قرمز', contractProblems(C, (f) => (f === 'p.html' ? '<!-- m --><!-- m -->' : files[f])).length === 1);
  t('کد نشانگر را عوض کرد ← قرمز', contractProblems(C, (f) => (f === 's.php' ? 'x' : files[f])).some((x) => /قرارداد «a»/.test(x)));
  const h = parseHooks("function tj_mag_hooks() {\n\treturn array(\n\t\tarray( 'p' => 12, 'q' => 'جملهٔ «یک».' ),\n\t\tarray( 'p' => 7, 'q' => 'it\\'s' ),\n\t);\n}\n");
  t('خواندن قلاب‌ها', h.length === 2 && h[0].p === 12 && h[1].q === "it's");
  t('یکی کردن متن', normText('<p>جمله&nbsp;ی &#171;یک&#187;.</p>') === normText('جمله ی «یک».') && normText('مي‌شود') === normText('می شود'));
  return bad;
}

if (process.argv[1] && process.argv[1].endsWith('contracts.mjs')) {
  const mode = process.argv[2];
  if (mode === 'selftest') { const b = contractsSelfTest(); console.log(b.length ? '❌ ' + b.join('، ') : '✅ قرارداد صفحه‌ها: خودآزمایی سبز'); process.exit(b.length ? 1 : 0); }
  if (mode === 'hooks') {
    const { wpClient } = await import('./site-lib.mjs');
    const C = loadContracts(), rule = C.rules.find((r) => r.kind === 'hooks');
    const res = await hookProblems(wpClient(), readFileSync(join(ROOT, rule.file), 'utf8'), rule);
    for (const n of res.notes) console.log(`::warning::${n}`);
    console.log(`قلاب‌های مجله: ${res.checked} مقاله سنجیده شد · مشکل: ${res.problems.length}`);
    if (res.problems.length) { for (const p of res.problems) console.log(`::error::${p}`); process.exit(1); }
    process.exit(0);
  }
  const C = loadContracts(), p = contractProblems(C, (f) => { try { return readFileSync(join(ROOT, f), 'utf8'); } catch { return null; } });
  for (const x of p) console.log(`::error::${x}`);
  console.log(`قرارداد صفحه‌ها: ${C.rules.length} قاعده · مشکل: ${p.length}`);
  process.exit(p.length ? 1 : 0);
}
