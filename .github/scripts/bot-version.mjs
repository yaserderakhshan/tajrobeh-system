// v170.5: رزرو شمارهٔ نسخهٔ بات پیش از شروع کار، تا دو جلسه یک شماره برندارند.
// رزرو = PR باز (پیش‌نویس هم کافی است). هر PR باز این شماره‌ها را دارد: TG_CODE_VERSION شاخه‌اش،
// و هر شماره‌ای که در توضیحش در خطی با «رزرو نسخه:» آمده (برای صف چند نسخه‌ای یک شاخه).
// اگر دو شاخه یک شماره را بخواهند، PR زودتر صاحب آن است و بررسی PR دیرتر قرمز می‌شود.
// (برچسب گیت ممکن نبود: جلسه‌های Claude فقط روی شاخهٔ خودشان می‌نویسند.)
//   node bot-version.mjs taken            ← شماره‌های گرفته‌شده (main و PRهای باز) و شمارهٔ آزاد بعدی
//   node bot-version.mjs check            ← در بررسی PR (env: GITHUB_TOKEN، GITHUB_REPOSITORY، PR_NUMBER)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function parseVer(v) { const m = /^v(\d+)\.(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(String(v || '').trim()); return m ? m.slice(1).map((x) => Number(x || 0)) : null; }
export function cmpVer(a, b) { const x = parseVer(a), y = parseVer(b); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }
export function verOf(src) { return (/var TG_CODE_VERSION = '([^']+)'/.exec(String(src || '')) || [])[1] || ''; }
/* شماره‌هایی که توضیح PR رزرو کرده: خطی با «رزرو نسخه:» */
export function bodyClaims(body) {
  const out = [];
  String(body || '').split('\n').filter((l) => /رزرو نسخه\s*:/.test(l)).forEach((l) => (l.match(/v\d+\.\d+(?:\.\d+){0,2}/g) || []).forEach((v) => out.push(v)));
  return out;
}
/* prs: [{number, branch, created_at, version, body}] ← { [نسخه]: {number, branch, created_at} } (زودترین صاحب) */
export function owners(prs) {
  const o = {};
  [...prs].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.number - b.number).forEach((p) => {
    new Set([p.version, ...bodyClaims(p.body)].filter(parseVer)).forEach((v) => { if (!o[v]) o[v] = { number: p.number, branch: p.branch, created_at: p.created_at }; });
  });
  return o;
}
/* خطای PR من، یا خالی */
export function checkPr(me, prs, mainVer, botChanged = true) {
  /* ۱۳ مهر ۱۴۰۵: PRی که کد بات را عوض نمی‌کند (سند، روند) شمارهٔ تازه نمی‌خواهد و چیزی رزرو نمی‌کند */
  if (!botChanged && me.version === mainVer) return '';
  if (!parseVer(me.version)) return `شمارهٔ نسخه «${me.version}» درست نیست`;
  if (mainVer && parseVer(mainVer) && cmpVer(me.version, mainVer) <= 0) return `${me.version} از نسخهٔ main (${mainVer}) بالاتر نیست`;
  const o = owners(prs)[me.version];
  if (o && o.branch !== me.branch) return `${me.version} را PR #${o.number} (${o.branch}) زودتر گرفته؛ شمارهٔ آزاد بعدی را بردارید (node .github/scripts/bot-version.mjs taken)`;
  return '';
}
export function nextFree(prs, mainVer) {
  const taken = new Set(Object.keys(owners(prs)).concat([mainVer]));
  const p = parseVer(mainVer); let v = '';
  /* بعد از بزرگ‌ترین شمارهٔ گرفته‌شده در همان رقم اول */
  Object.keys(owners(prs)).forEach((x) => { const q = parseVer(x); if (q && q[0] === p[0] && q[1] > p[1]) p[1] = q[1]; });
  for (let n = p[1] + 1; n < p[1] + 200; n++) { v = `v${p[0]}.${n}`; if (!taken.has(v)) return v; }
  return '';
}
export function versionSelfTest() {
  const bad = [], t = (n, c) => { if (!c) bad.push(n); };
  const P = (number, branch, min, version, body) => ({ number, branch, version, body: body || '', created_at: new Date(Date.UTC(2026, 9, 3, 12, min)).toISOString() });
  const prs = [P(90, 'claude/a', 0, 'v170.3', 'رزرو نسخه: v170.4'), P(96, 'claude/b', 10, 'v170.5', 'رزرو نسخه: v170.6، v171.0، v171.1')];
  t('PR صاحب شماره ← قبول', checkPr(prs[1], prs, 'v170.2') === '');
  t('شمارهٔ رزروشده در توضیح PR دیگر ← مردود', /PR #96/.test(checkPr(P(99, 'claude/c', 20, 'v171.0'), prs, 'v170.2')));
  t('همان شماره، PR دیرتر ← مردود؛ زودتر ← قبول', /PR #90/.test(checkPr(P(98, 'claude/c', 30, 'v170.4'), prs, 'v170.2')) && checkPr(prs[0], prs.concat([P(98, 'claude/c', 30, 'v170.3')]), 'v170.2') === '');
  t('هم‌شمارهٔ main یا پایین‌تر ← مردود', /بالاتر نیست/.test(checkPr(P(97, 'claude/c', 5, 'v170.2'), prs, 'v170.2')));
  t('شاخهٔ خودش با چند PR پشت‌سرهم ← قبول', checkPr(P(100, 'claude/b', 40, 'v170.6'), prs, 'v170.5') === '');
  t('رزرو از توضیح خوانده می‌شود', JSON.stringify(bodyClaims('سلام\nرزرو نسخه: v170.6، v171.0 و v171.1.2')) === '["v170.6","v171.0","v171.1.2"]');
  t('شمارهٔ آزاد بعدی', nextFree(prs, 'v170.2') === 'v170.7');
  t('PR بی تغییر کد بات با شمارهٔ main ← قبول؛ با تغییر کد ← مردود', checkPr(P(101, 'claude/d', 50, 'v170.2'), prs, 'v170.2', false) === '' && /بالاتر نیست/.test(checkPr(P(101, 'claude/d', 50, 'v170.2'), prs, 'v170.2', true)));
  t('ترتیب نسخه‌ها', cmpVer('v171.0', 'v170.12') > 0 && cmpVer('v169.2.2', 'v169.2') > 0);
  return bad;
}

async function api(path) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(`GitHub API ${r.status} ${path}`);
    return r.json();
  }
  const repo = process.env.GITHUB_REPOSITORY || 'yaserderakhshan/tajrobeh-system';
  return JSON.parse(execSync(`gh api 'repos/${repo}${path}'`, { encoding: 'utf8', maxBuffer: 1 << 26 }));
}
/* آیا این PR کد بات را عوض می‌کند؟ (همان قاعدهٔ گام «شمارهٔ نسخه و CHANGELOG» در bot-check.yml) */
function botChanged() {
  const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main';
  try {
    const ch = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' });
    return ch.split('\n').some((f) => /^bot\/(.*\.gs|\.clasp\.json|appsscript\.json)$/.test(f));
  } catch (e) { return true; }
}
async function verAt(ref) { try { const c = await api(`/contents/bot/version.gs?ref=${encodeURIComponent(ref)}`); return verOf(Buffer.from(c.content, 'base64').toString('utf8')); } catch (e) { return ''; } }
async function openPrs() {
  const list = await api('/pulls?state=open&per_page=100'), out = [];
  for (const p of list) {
    const version = await verAt(p.head.sha);
    out.push({ number: p.number, branch: p.head.ref, created_at: p.created_at, version, body: p.body || '' });
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cmd = process.argv[2];
  const mainVer = await verAt('main'), prs = await openPrs();
  if (cmd === 'taken') {
    console.log(`main: ${mainVer}`);
    const o = owners(prs);
    Object.keys(o).filter((v) => cmpVer(v, mainVer) > 0).sort(cmpVer).forEach((v) => console.log(`${v}  PR #${o[v].number}  ${o[v].branch}`));
    console.log(`شمارهٔ آزاد بعدی: ${nextFree(prs, mainVer)}`);
  } else if (cmd === 'check') {
    const n = Number(process.env.PR_NUMBER), me = prs.find((p) => p.number === n) || { number: n, branch: process.env.HEAD_REF || '', created_at: new Date().toISOString(), body: '' };
    me.version = verOf(readFileSync('bot/version.gs', 'utf8'));
    const err = checkPr(me, prs.filter((p) => p.number !== n).concat([me]), mainVer, botChanged());
    if (err) { console.log(`::error::رزرو نسخه: ${err}`); process.exit(1); }
    console.log(`${me.version} برای این PR آزاد است (main: ${mainVer}).`);
  }
}
