// پرسش‌های پرتکرار دستیار (content/assist/faq.json) که صفحهٔ مرجعشان در site/pages عوض شده و جوابشان باید بازبینی شود.
// نشانی هر لینک فایل با site/pages-index.json به شناسهٔ برگه و با تاریخچهٔ گیت فایل همان برگه سنجیده می‌شود.
//   node site/tools/faq-review.mjs [روز=7]     (در گزارش هفتگی سایت هم می‌آید)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const key = (u) => { try { return decodeURIComponent(new URL(u).pathname).replace(/\/+$/, '') || '/'; } catch { return ''; } };

/** [{id, question, page, file, when}] برای برگه‌هایی که در days روز گذشته در site/pages عوض شده‌اند */
export function faqReview(days = 7) {
  const faq = JSON.parse(readFileSync(join(ROOT, 'content/assist/faq.json'), 'utf8')).faq || [];
  const pages = JSON.parse(readFileSync(join(ROOT, 'site/pages-index.json'), 'utf8'));
  const byPath = new Map(pages.map((p) => [key(p.link), p]));
  const files = new Map();
  for (const f of execFileSync('git', ['ls-files', 'site/pages'], { cwd: ROOT, encoding: 'utf8' }).split('\n')) { const m = /site\/pages\/(\d+)-/.exec(f); if (m) files.set(Number(m[1]), f); }
  const changed = new Map();
  const since = `${days} days ago`;
  const out = [];
  for (const f of faq) for (const l of f.links || []) {
    const p = byPath.get(key(l.url)); if (!p) continue;
    const file = files.get(Number(p.id)); if (!file) continue;
    if (!changed.has(file)) {
      let when = '';
      try { when = execFileSync('git', ['log', '-1', '--since=' + since, '--format=%cs', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch {}
      changed.set(file, when);
    }
    const when = changed.get(file);
    if (when) out.push({ id: f.id, question: f.question, page: p.title, url: l.url, file, when });
  }
  return out;
}
/** یک خط گزارش هفتگی (فارسی) */
export function faqReviewLine(days = 7) {
  const L = faqReview(days);
  if (!L.length) return 'پرسش‌های پرتکرار دستیار: صفحهٔ مرجع هیچ جوابی این هفته عوض نشد.';
  const by = new Map(); for (const x of L) (by.get(x.page) || by.set(x.page, []).get(x.page)).push(x.id);
  return 'پرسش‌های پرتکرار دستیار، جواب‌هایی که باید بازبینی شوند (صفحهٔ مرجعشان عوض شد): ' + [...by].map(([pg, ids]) => `«${pg}» ← ${[...new Set(ids)].join('، ')}`).join(' · ');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const L = faqReview(Number(process.argv[2]) || 7);
  console.log(faqReviewLine(Number(process.argv[2]) || 7));
  for (const x of L) console.log(`${x.id}\t${x.when}\t${x.file}`);
}
