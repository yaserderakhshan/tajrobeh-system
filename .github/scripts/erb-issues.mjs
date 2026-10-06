// صندوق یکتای خطا، مرحلهٔ ۲ (v170.23.6): آینهٔ تب «خطاها»ی هاب روی issueهای گیت‌هاب. وضعیت فقط در هاب است.
//   sync: هر اثر انگشت شدت ۱ و ۲ ← یک issue با برچسب auto-bug (تکراری نه؛ نشان <!-- erb:X-… --> در متن). PR باز ← «PR»،
//         PR ادغام‌شده ← «اصلاح‌شده» (issue تا شاهد ۷ روزه باز با برچسب «زیر-نظر»). «تأییدشده» ← بستن؛ «بازگشته» ← باز کردن.
//   prcheck: PR اصلاحی (Fixes/Closes/Refs به issue auto-bug) باید تست یا قرارداد ضد تکرار اضافه کند.
// متن issue فقط اثر انگشت (بی عدد و نام)، منبع، شدت، شمار و تاریخ است؛ نمونهٔ پیام هرگز به گیت‌هاب نمی‌رود.
import { execFileSync } from 'node:child_process';

const { GITHUB_REPOSITORY: REPO, GITHUB_TOKEN: GH, BOT_API_URL: API, BOT_API_KEY: KEY } = process.env;
const LABEL = 'auto-bug', WATCH = 'زیر-نظر', MAX_NEW = 8;

async function gh(method, path, body) {
  const r = await fetch(`https://api.github.com${path}`, { method, headers: { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, ok: r.ok, json: j };
}
async function bot(action, extra = {}) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow', body: JSON.stringify({ api: 1, key: KEY, action, ...extra }) });
  const j = JSON.parse(await r.text());
  if (!j.ok) throw new Error(`درگاه ${action}: ${j.error}`);
  return j.data;
}
const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const day = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '-');
export const mark = (id) => `<!-- erb:${id} -->`;
export function issueTitle(r) { return `[شدت ${fa(r.sev)}] ${String(r.fp).slice(0, 100)}`; }
export function issueBody(r) {
  return [mark(r.id), '', 'خطای خودکار از صندوق یکتای خطا (تب «خطاها»ی هاب). متن پیام و هر دادهٔ شخصی فقط در هاب خصوصی است.', '',
    '| | |', '|---|---|', `| اثر انگشت | \`${String(r.fp).replace(/\|/g, '/')}\` |`, `| شناسه | ${r.id} |`, `| منبع | ${r.src} |`, `| شدت | ${fa(r.sev)} |`,
    `| اولین بار | ${day(r.first)} |`, `| آخرین بار | ${day(r.last)} |`, `| شمار | ${fa(r.n)} |`, '',
    'هر PR اصلاحی با `Fixes #<این شماره>` یک تست یا قرارداد ضد تکرار هم اضافه می‌کند (بررسی PR بی آن قرمز است).',
    'بعد از ادغام، ۷ روز زیر نظر می‌ماند؛ اگر تکرار نشد خودکار بسته می‌شود و اگر تکرار شد دوباره باز.'].join('\n');
}
const ORDER = { 'تازه': 0, 'بازگشته': 0, 'در برنامه': 1, 'PR': 2, 'اصلاح‌شده': 3, 'تأییدشده': 4 };

async function prState(num) {
  /* PRهایی که به این issue اشاره کرده‌اند (cross-referenced) */
  const r = await gh('GET', `/repos/${REPO}/issues/${num}/timeline?per_page=100`);
  let open = false, merged = 0;
  for (const ev of r.json || []) {
    const src = ev.event === 'cross-referenced' ? ev.source?.issue : null;
    if (!src?.pull_request || src.repository?.full_name !== REPO) continue;
    if (src.pull_request.merged_at) merged = Math.max(merged, Date.parse(src.pull_request.merged_at));
    else if (src.state === 'open') open = true;
  }
  return { open, merged };
}

async function sync() {
  const rows = (await bot('error_list')).rows || [];
  if ((await gh('GET', `/repos/${REPO}/labels/${encodeURIComponent(LABEL)}`)).status === 404) await gh('POST', `/repos/${REPO}/labels`, { name: LABEL, color: 'c83f49', description: 'خطای خودکار از صندوق یکتای خطا' });
  if ((await gh('GET', `/repos/${REPO}/labels/${encodeURIComponent(WATCH)}`)).status === 404) await gh('POST', `/repos/${REPO}/labels`, { name: WATCH, color: 'f7b32b', description: 'اصلاح شد؛ ۷ روز شاهد' });
  const all = [];
  for (let p = 1; p < 20; p++) { const r = await gh('GET', `/repos/${REPO}/issues?labels=${LABEL}&state=all&per_page=100&page=${p}`); if (!r.ok || !r.json?.length) break; all.push(...r.json.filter((i) => !i.pull_request)); if (r.json.length < 100) break; }
  const byId = new Map(); for (const i of all) { const m = String(i.body || '').match(/<!-- erb:(X-[a-z0-9]+) -->/); if (m) byId.set(m[1], i); }
  const set = []; let made = 0, closed = 0, reopened = 0;
  rows.sort((a, b) => a.sev - b.sev || b.n - a.n);
  for (const r of rows) {
    let iss = byId.get(r.id);
    if (!iss && r.sev <= 2 && r.st !== 'تأییدشده' && made < MAX_NEW) {   /* هر دور حداکثر MAX_NEW، شدت ۱ اول */
      const c = await gh('POST', `/repos/${REPO}/issues`, { title: issueTitle(r), body: issueBody(r), labels: [LABEL] });
      if (!c.ok) { console.log(`::warning::issue ساخته نشد (${r.id}): HTTP ${c.status}`); continue; }
      iss = c.json; made++;
    }
    if (!iss) continue;
    const it = { id: r.id };
    if (r.issue !== iss.html_url) it.issue = iss.html_url;
    if (ORDER[r.st] < 1) it.st = 'در برنامه';
    const body = issueBody(r);
    if (iss.body !== body || iss.title !== issueTitle(r)) await gh('PATCH', `/repos/${REPO}/issues/${iss.number}`, { title: issueTitle(r), body });
    const pr = await prState(iss.number);
    if (pr.merged && ORDER[r.st] < 3 && !(r.st === 'بازگشته' && pr.merged <= r.stAt)) { it.st = 'اصلاح‌شده'; it.at = pr.merged; }
    else if (pr.open && ORDER[r.st] < 2) it.st = 'PR';
    const st = it.st || r.st;
    const hasW = (iss.labels || []).some((l) => l.name === WATCH);
    if (st === 'تأییدشده' && iss.state === 'open') {
      await gh('POST', `/repos/${REPO}/issues/${iss.number}/comments`, { body: '✅ ۷ روز بعد از اصلاح تکرار نشد. «تأییدشده»؛ بسته شد.' });
      await gh('PATCH', `/repos/${REPO}/issues/${iss.number}`, { state: 'closed', state_reason: 'completed' });
      if (hasW) await gh('DELETE', `/repos/${REPO}/issues/${iss.number}/labels/${encodeURIComponent(WATCH)}`);
      closed++;
    } else if (st === 'اصلاح‌شده' && (iss.state === 'closed' || !hasW)) {
      if (iss.state === 'closed') { await gh('PATCH', `/repos/${REPO}/issues/${iss.number}`, { state: 'open' }); reopened++; }
      if (!hasW) { await gh('POST', `/repos/${REPO}/issues/${iss.number}/labels`, { labels: [WATCH] }); await gh('POST', `/repos/${REPO}/issues/${iss.number}/comments`, { body: '🔎 اصلاح ادغام شد. ۷ روز زیر نظر است؛ اگر تکرار نشد خودکار بسته می‌شود.' }); }
    } else if (st === 'بازگشته' && (iss.state === 'closed' || hasW)) {
      if (iss.state === 'closed') { await gh('PATCH', `/repos/${REPO}/issues/${iss.number}`, { state: 'open' }); reopened++; }
      if (hasW) await gh('DELETE', `/repos/${REPO}/issues/${iss.number}/labels/${encodeURIComponent(WATCH)}`);
      await gh('POST', `/repos/${REPO}/issues/${iss.number}/comments`, { body: `↩️ بعد از اصلاح دوباره تکرار شد (آخرین بار ${day(r.last)}، شمار ${fa(r.n)}). «بازگشته»؛ دوباره باز است.` });
    }
    if (it.issue || it.st) set.push(it);
  }
  const res = set.length ? await bot('error_set', { items: set }) : { updated: 0, skipped: [] };
  console.log(`صندوق خطا ← issue: ${rows.length} ردیف · issue تازه ${made} · بسته ${closed} · بازشده ${reopened} · به‌روز در هاب ${res.updated}${res.skipped?.length ? ' · ردشده ' + res.skipped.length : ''}`);
}

/* مرحلهٔ ۳ (v170.23.7): اصلاح‌گر شبانه فقط PR می‌زند؛ ادغام فقط با دکمهٔ یاسر در بات (erb-merge.yml). */
export const NEED_OK = 'نیاز-به-اوکی', AUTOFIX = 'auto-fix';
export function sevOf(title) { const m = String(title).match(/\[شدت ([۱-۳1-3])\]/); return m ? '0123۰۱۲۳'.indexOf(m[1]) % 4 : 3; }
async function pick() {
  const r = await gh('GET', `/repos/${REPO}/issues?labels=${LABEL}&state=open&per_page=100&sort=created&direction=asc`);
  const L = (r.json || []).filter((i) => !i.pull_request && !(i.labels || []).some((l) => l.name === WATCH || l.name === NEED_OK));
  L.sort((a, b) => sevOf(a.title) - sevOf(b.title) || Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const i of L) {
    if ((await prState(i.number)).open) continue;
    console.log(`issue بعدی: #${i.number}`);
    if (process.env.GITHUB_OUTPUT) (await import('node:fs')).appendFileSync(process.env.GITHUB_OUTPUT, `issue=${i.number}\nsev=${sevOf(i.title)}\n`);
    return;
  }
  console.log('issue بازی برای اصلاح نیست.');
}
/* فهرست PRهای auto-fix باز و آماده (نه پیش‌نویس، نه «نیاز-به-اوکی») ← بات برای پیام ساعت ۹ */
async function fixnote() {
  const prs = ((await gh('GET', `/repos/${REPO}/pulls?state=open&per_page=50`)).json || [])
    .filter((p) => !p.draft && (p.labels || []).some((l) => l.name === AUTOFIX) && !(p.labels || []).some((l) => l.name === NEED_OK))
    .map((p) => ({ n: p.number, title: String(p.title).slice(0, 120), issue: refsOf(p.body)[0] || 0, sev: sevOf(p.title) }));
  const d = await bot('fix_note', { prs });
  console.log(`اصلاح‌های آماده برای پیام صبح: ${prs.length} (${d.stored})`);
}
/* erb-merge.yml: فقط PRهایی که یاسر با دکمه خواسته؛ هر کدام فقط اگر auto-fix، بی «نیاز-به-اوکی»، نه پیش‌نویس و همهٔ بررسی‌ها سبز.
   ادغام با GITHUB_TOKEN گردش کار push را راه نمی‌اندازد؛ پس همان دیپلوی بات یا سایت صریحاً dispatch می‌شود (پایش و برگشت خودکار). */
async function merge() {
  const want = String(process.env.PRS || '').split(',').map(Number).filter((n) => n > 0).slice(0, 10);
  const done = [], skip = []; let base0 = '', bot0 = false, site0 = false;
  for (const n of want) {
    const p = (await gh('GET', `/repos/${REPO}/pulls/${n}`)).json;
    const labels = (p?.labels || []).map((l) => l.name);
    if (!p || p.state !== 'open') { skip.push(`#${n}: باز نیست`); continue; }
    if (!labels.includes(AUTOFIX) || labels.includes(NEED_OK) || p.draft) { skip.push(`#${n}: اصلاح خودکار آماده نیست`); continue; }
    const runs = (await gh('GET', `/repos/${REPO}/commits/${p.head.sha}/check-runs?per_page=100`)).json?.check_runs || [];
    if (!runs.length || runs.some((c) => c.status !== 'completed' || !['success', 'skipped', 'neutral'].includes(c.conclusion))) { skip.push(`#${n}: بررسی‌ها سبز نیست`); continue; }
    const files = ((await gh('GET', `/repos/${REPO}/pulls/${n}/files?per_page=100`)).json || []).map((f) => f.filename);
    if (!base0) base0 = (await gh('GET', `/repos/${REPO}/commits/main`)).json?.sha || '';
    const m = await gh('PUT', `/repos/${REPO}/pulls/${n}/merge`, { merge_method: 'merge', sha: p.head.sha });
    if (!m.ok) { skip.push(`#${n}: ادغام نشد (HTTP ${m.status}${m.status === 405 || m.status === 409 ? '، تعارض یا نسخهٔ تکراری' : ''})`); continue; }
    done.push(`#${n}`);
    if (files.some((f) => f.startsWith('bot/') || f.startsWith('.github/scripts/'))) bot0 = true;
    if (files.some((f) => /^site\/(pages|snippets|css|templates|template-parts)\/|^site\/yoast-meta\.json$/.test(f))) site0 = true;
  }
  const after = (await gh('GET', `/repos/${REPO}/commits/main`)).json?.sha || '';
  if (bot0) await gh('POST', `/repos/${REPO}/actions/workflows/bot-deploy.yml/dispatches`, { ref: 'main', inputs: { scope: 'related' } });
  if (site0 && base0 && after) await gh('POST', `/repos/${REPO}/actions/workflows/site-deploy.yml/dispatches`, { ref: 'main', inputs: { before: base0, after } });
  const msg = `🔧 ادغام اصلاح‌های شبانه: ${done.length ? done.join('، ') + ' ادغام شد' + (bot0 ? '؛ انتشار بات با پایش راه افتاد' : '') + (site0 ? '؛ انتشار سایت راه افتاد' : '') : 'هیچ'}${skip.length ? '\nنشد: ' + skip.join(' · ') : ''}`;
  console.log(msg);
  if (API && KEY && process.env.REPORT_CHAT_ID) { try { await bot('send', { chat: process.env.REPORT_CHAT_ID, type: 'گزارش', ref: 'ERB-MERGE', text: msg }); } catch (e) { console.log(`::warning::خبر نرفت: ${e.message}`); } }
}

/* PR اصلاحی بی تست یا قرارداد ← قرمز */
export function refsOf(text) { return [...String(text || '').matchAll(/\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?|refs?)\s+#(\d+)/gi)].map((m) => Number(m[1])); }
export function hasGuard(files, addedLines) {
  if (files.some((f) => f === 'site/contracts.json' || /^site\/tools\/test\//.test(f) || /^\.github\/scripts\/.*test/i.test(f))) return true;
  return addedLines.some((l) => /^\+.*\bok\(\s*'/.test(l) && /^\+/.test(l));
}
async function prcheck() {
  const { PR_BODY = '', PR_TITLE = '', BASE, HEAD } = process.env;
  const nums = [...new Set(refsOf(PR_TITLE + '\n' + PR_BODY))];
  const bugs = [];
  for (const n of nums) { const r = await gh('GET', `/repos/${REPO}/issues/${n}`); if (r.ok && (r.json.labels || []).some((l) => l.name === LABEL)) bugs.push(n); }
  if (!bugs.length) { console.log('این PR به issue خودکار اشاره ندارد.'); return; }
  const files = execFileSync('git', ['diff', '--name-only', BASE, HEAD], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const added = execFileSync('git', ['diff', '-U0', BASE, HEAD, '--', 'bot', 'site', '.github/scripts'], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  if (!hasGuard(files, added)) { console.log(`::error::این PR خطای خودکار ${bugs.map((b) => '#' + b).join('، ')} را اصلاح می‌کند ولی تست (ok(...) در bot) یا قرارداد (site/contracts.json) ضد تکرار اضافه نکرده است.`); process.exit(1); }
  console.log(`PR اصلاحی برای ${bugs.map((b) => '#' + b).join('، ')}: تست یا قرارداد ضد تکرار دارد.`);
}

export function selfTest() {
  const bad = [], t = (n, c) => { if (!c) bad.push(n); };
  const r = { id: 'X-abc1234', fp: 'tgLeadSet_ · TypeError متن a1b2c3', src: 'بات', sev: 1, first: Date.UTC(2026, 9, 1), last: Date.UTC(2026, 9, 6), n: 12 };
  const b = issueBody(r);
  t('متن issue نشان دارد و رقم لاتین ندارد جز شناسه و تاریخ', b.includes(mark(r.id)) && !/\b0912/.test(b));
  t('عنوان با شدت', issueTitle(r).startsWith('[شدت ۱]'));
  t('ارجاع PR', JSON.stringify(refsOf('Fixes #12 and refs #7, closes #3')) === '[12,7,3]');
  t('تست در bot ← سبز', hasGuard(['bot/errbox.gs'], ["+    ok('x', true);"]));
  t('قرارداد ← سبز', hasGuard(['site/contracts.json'], []));
  t('بی تست ← قرمز', !hasGuard(['bot/telegram.gs'], ['+ var a = 1;']));
  t('شدت از عنوان', sevOf('[شدت ۱] x') === 1 && sevOf('[شدت ۲] y') === 2 && sevOf('z') === 3);
  return bad;
}

if (process.argv[1] && process.argv[1].endsWith('erb-issues.mjs')) {
  const mode = process.argv[2];
  if (mode === 'selftest') { const b = selfTest(); console.log(b.length ? '❌ ' + b.join('، ') : '✅ erb-issues: خودآزمایی سبز'); process.exit(b.length ? 1 : 0); }
  if (mode === 'prcheck') await prcheck();
  else if (mode === 'pick') await pick();
  else if (mode === 'fixnote') await fixnote();
  else if (mode === 'merge') await merge();
  else if (mode === 'sync') { if (!API || !KEY) { console.log('::warning::درگاه بات تنظیم نشده'); process.exit(0); } await sync(); }
  else { console.log('mode: sync | prcheck | selftest'); process.exit(1); }
}
