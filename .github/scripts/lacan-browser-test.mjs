// E62: ثبت آزمایشی فرم ۱۹ لکان در مرورگر واقعی (ضداسپم توکنی فلوئنت با جاوااسکریپت صفحه ساخته می‌شود).
// نام «آزمون TEST»: بات آن را وارد هاب نمی‌کند ولی به ورودی مدرسهٔ پل می‌فرستد. شمارهٔ ساختگی.
import { chromium } from 'playwright';
const URL = process.env.PAGE_URL || 'https://tajrobeh.life/school/lacan/', FID = process.env.FORM_ID || '19';
const sum = (s) => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) import('node:fs').then((fs) => fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + '\n')); };
const br = await chromium.launch();
const pg = await br.newPage({ locale: 'fa-IR' });
await pg.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
const f = pg.locator(`form[data-form_id="${FID}"]`).first();
if (!(await f.count())) { sum(`::error::فرم ${FID} در صفحه نیست`); process.exit(1); }
await f.scrollIntoViewIfNeeded().catch(() => {});
await pg.waitForTimeout(4000);   // ضداسپم توکنی بعد از چند ثانیه آماده می‌شود
const fill = async (sel, v) => { const l = f.locator(sel); for (let i = 0; i < await l.count(); i++) await l.nth(i).fill(v, { force: true }).catch(() => {}); };
await fill('input[name$="[first_name]"]', 'آزمون');
await fill('input[name$="[last_name]"]', 'TEST');
await fill('input[type="email"]', 'test+lacan@example.invalid');
await fill('input[name*="mobile"], input[type="tel"]', '09123456789');   // pii:ok ساختگی
await fill('input[name="university"]', 'آزمون TEST');
await fill('textarea', 'آزمون TEST ورودی لکان، لطفاً نادیده بگیرید');
const sels = f.locator('select');
for (let i = 0; i < await sels.count(); i++) {
  const vals = await sels.nth(i).locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
  if (vals[0]) await sels.nth(i).selectOption(vals[0], { force: true }).catch(() => {});
}
const rads = await f.locator('input[type="radio"]').evaluateAll((xs) => [...new Set(xs.map((x) => x.name))]);
for (const n of rads) await f.locator(`input[type="radio"][name="${n}"]`).first().check({ force: true }).catch(() => {});
const resP = pg.waitForResponse((r) => r.url().includes('admin-ajax.php') && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null);
await f.locator('button[type="submit"], .ff-btn-submit').first().click({ force: true });
const res = await resP;
let j = null, txt = ''; if (res) { txt = await res.text(); try { j = JSON.parse(txt); } catch {} }
const id = j?.data?.insert_id || '';
const ok = res && res.status() < 300 && (j?.success || id);
const err = j?.errors ? (typeof j.errors === 'string' ? j.errors : Object.entries(j.errors).map(([k, v]) => k + ': ' + Object.values(v || {}).join(' ')).join(' | ')) : txt.slice(0, 160);
sum(`- ثبت آزمایشی فرم ${FID} در مرورگر: HTTP ${res ? res.status() : '-'}${id ? `، شمارهٔ ورودی ${id}` : ''}${ok ? '' : `، خطا: ${String(err).slice(0, 300)}`}`);
await br.close();
if (!ok) process.exit(1);
