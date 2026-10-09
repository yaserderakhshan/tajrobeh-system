// چک اطلاعات شخصی روی متن PR (تیتر، توضیح، کامنت‌ها، بازبینی‌ها و کامنت‌های خط به خط)، با همان قاعده‌های pii-scan.mjs
// و همان فهرست خصوصی نام‌ها (GitHub Secret «PII_NAMES»). مخزن عمومی است و متن PR هم عمومی است.
// خروجی فقط نوع و جا را می‌گوید (مثلاً «توضیح PR خط ۴۴: نام همکار»)، هرگز خود مقدار را. یافته = خروج ۱.
// ورودی‌ها: GITHUB_TOKEN، REPO (owner/name)، PR_NUMBER. اختیاری: STATUS_SHA تا نتیجه را روی همان کامیت
// با context «متن PR بی اطلاعات شخصی» بنویسد (برای رویدادهای کامنت که چک‌شان به PR وصل نیست).
import { piiLine } from './pii-scan.mjs';

const { GITHUB_TOKEN: TOKEN, REPO, PR_NUMBER: PR, STATUS_SHA } = process.env;
const CONTEXT = 'متن PR بی اطلاعات شخصی';
const api = async (path, opt = {}) => {
  const r = await fetch('https://api.github.com/repos/' + REPO + path, { ...opt, headers: { authorization: 'Bearer ' + TOKEN, accept: 'application/vnd.github+json', 'content-type': 'application/json', ...(opt.headers || {}) } });
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.status === 204 ? null : r.json();
};
const all = async (path) => { const out = []; for (let p = 1; p < 20; p++) { const j = await api(path + (path.includes('?') ? '&' : '?') + 'per_page=100&page=' + p); out.push(...j); if (j.length < 100) break; } return out; };

/* متن‌ها: [جا، متن] */
export function piiTexts(items) {
  const hits = [];
  for (const [where, text] of items) {
    String(text || '').split('\n').forEach((line, i) => {
      for (const kind of piiLine(line, '')) hits.push(`${where} خط ${i + 1}: ${kind}`);
    });
  }
  return hits;
}

async function main() {
  if (!TOKEN || !REPO || !PR) { console.log('::error::GITHUB_TOKEN، REPO و PR_NUMBER لازم است'); process.exit(2); }
  const pr = await api('/pulls/' + PR);
  const items = [['تیتر PR', pr.title], ['توضیح PR', pr.body]];
  for (const c of await all('/issues/' + PR + '/comments')) items.push(['کامنت ' + c.id, c.body]);
  for (const c of await all('/pulls/' + PR + '/comments')) items.push(['کامنت خط ' + c.id, c.body]);
  for (const r of await all('/pulls/' + PR + '/reviews')) items.push(['بازبینی ' + r.id, r.body]);
  const hits = piiTexts(items);
  const sha = STATUS_SHA || pr.head.sha;
  const state = hits.length ? 'failure' : 'success';
  const desc = hits.length ? (hits.length + ' مورد؛ متن را ویرایش کنید (جزئیات در لاگ)') : 'تیتر، توضیح و کامنت‌ها پاک‌اند';
  try { await api('/statuses/' + sha, { method: 'POST', body: JSON.stringify({ state, context: CONTEXT, description: desc.slice(0, 140) }) }); }
  catch (e) { console.log('::warning::وضعیت کامیت نوشته نشد: ' + e.message); }
  console.log(`متن PR ${PR}: ${items.length} متن سنجیده شد · ${hits.length} مورد`);
  for (const h of hits) console.log('::error::' + h);
  if (hits.length) { console.log('نام یا شمارهٔ شخصی را از متن بردارید (در PR نه، در Script Properties یا تب تنظیمات). بعد از ویرایش، چک دوباره اجرا می‌شود.'); process.exit(1); }
}
if (import.meta.url === 'file://' + process.argv[1]) main().catch((e) => { console.log('::error::' + e.message); process.exit(2); });
