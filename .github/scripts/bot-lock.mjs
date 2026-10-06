// v170.5: قفل انتشار بات. هر اجرای «دیپلوی بات» پیش از هر کاری صبر می‌کند تا همهٔ اجراهای زودتر همین گردش کار
// (با پایش ۲۰ دقیقه‌ای‌شان) تمام شوند؛ دو انتشار هرگز هم‌زمان نیستند و هیچ انتشاری بی‌صدا لغو نمی‌شود.
// (concurrency خود گیت‌هاب فقط یک اجرای منتظر نگه می‌دارد و اجرای منتظر قبلی را لغو می‌کند.)
//   node bot-lock.mjs wait     ← در گردش کار؛ GITHUB_TOKEN، GITHUB_REPOSITORY و GITHUB_RUN_ID لازم است
import { fileURLToPath } from 'node:url';

export const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
/* اجراهایی که این اجرا باید منتظرشان بماند: فعال و زودتر (با زمان ساخت، و اگر برابر بود با شناسهٔ کوچک‌تر) */
export function blockers(runs, me) {
  const t = Date.parse(me.created_at);
  return runs.filter((r) => r.id !== me.id && ACTIVE.has(r.status) &&
    (Date.parse(r.created_at) < t || (Date.parse(r.created_at) === t && r.id < me.id))).map((r) => r.id);
}
export function lockSelfTest() {
  const bad = [];
  const R = (id, status, min) => ({ id, status, created_at: new Date(Date.UTC(2026, 9, 3, 12, min)).toISOString() });
  const me = R(10, 'in_progress', 30);
  const t = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${name}: ${JSON.stringify(got)} به‌جای ${JSON.stringify(want)}`); };
  t('اجرای زودترِ در حال اجرا ← صبر', blockers([R(9, 'in_progress', 10), me], me), [9]);
  t('اجرای زودترِ تمام‌شده ← بی‌صبر', blockers([R(9, 'completed', 10), me], me), []);
  t('اجرای دیرتر ← بی‌صبر (او منتظر این است)', blockers([me, R(11, 'in_progress', 40)], me), []);
  t('دو اجرای زودتر (یکی در صف) ← صبر برای هر دو', blockers([R(8, 'in_progress', 5), R(9, 'queued', 10), me], me), [8, 9]);
  t('هم‌زمان ساخته‌شده ← شناسهٔ کوچک‌تر اول', blockers([R(7, 'in_progress', 30), me], me), [7]);
  const other = R(12, 'in_progress', 30);
  t('هم‌زمان ساخته‌شده، شناسهٔ بزرگ‌تر ← منتظر من', blockers([me], other), [10]);
  /* هیچ دو اجرای فعالی هم‌زمان آزاد نمی‌شوند */
  const runs = [R(1, 'in_progress', 0), R(2, 'queued', 1), R(3, 'queued', 1), R(4, 'waiting', 2)];
  const free = runs.filter((r) => blockers(runs, r).length === 0).map((r) => r.id);
  t('از چند اجرای فعال فقط یکی آزاد است', free, [1]);
  return bad;
}

async function gh(path) {
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`GitHub API ${r.status} ${path}`);
  return r.json();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === 'wait') {
  const MAX_MIN = Number(process.env.LOCK_MAX_MIN || 330);
  const me = await gh(`/actions/runs/${process.env.GITHUB_RUN_ID}`);
  const t0 = Date.now();
  for (;;) {
    /* ۱۴ مهر ۱۴۰۵: LOCK_WORKFLOWS (نام فایل‌ها با ویرگول) یعنی قفل مشترک چند گردش کار؛ site-deploy و site-mirror هرگز هم‌زمان نیستند
       و چون concurrency گیت‌هاب اجرای منتظر را لغو می‌کند، هیچ انتشاری به‌خاطر یک آینهٔ ساعتی بی‌صدا لغو نمی‌شود */
    const wfs = (process.env.LOCK_WORKFLOWS || '').split(',').map((x) => x.trim()).filter(Boolean);
    let runs = [];
    try {
      for (const w of (wfs.length ? wfs : [me.workflow_id])) runs = runs.concat((await gh(`/actions/workflows/${w}/runs?per_page=50`)).workflow_runs || []);
    } catch (e) { console.log(`خواندن اجراها نشد (${e.message})؛ دوباره`); runs = []; }
    const b = blockers(runs.map((r) => ({ id: r.id, status: r.status, created_at: r.created_at })), me);
    if (!b.length && runs.length) { console.log(`قفل آزاد است (${Math.round((Date.now() - t0) / 60000)} دقیقه صبر).`); break; }
    if (Date.now() - t0 > MAX_MIN * 60000) { console.log(`::error::قفل انتشار: بعد از ${MAX_MIN} دقیقه هنوز اجرای زودتری باز است (${b.join('، ')}). این انتشار انجام نشد؛ دوباره اجرا کنید.`); process.exit(1); }
    console.log(`منتظر اجرای زودتر: ${b.join('، ')}`);
    await new Promise((r) => setTimeout(r, 60000));
  }
}
