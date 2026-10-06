// برنامهٔ تکمیل ۲-۰: قاعدهٔ «قابلیت کامل». چهار سنجش روی docs/features.json و کد، در بررسی محلی (bot-precheck.mjs):
// ۱) هر قابلیت فهرست‌شده همهٔ فیلدها را دارد؛ فیلد خالی فقط اگر در gaps آمده. نقش از TG_ROLES، مینی‌اپ از TG_CAP، تست از TG_SUITES.
// ۲) پیام بی‌کیبورد: شمار tgSend_(chat, متن) بی آرگومان سوم در کد غیرتستی (ایستا) از known.bare_sends بیشتر نشود.
// ۳) هر نقش TG_ROLES هم در بات (برچسب و شاخه) و هم در مینی‌اپ (TEAMR یا TG_CAP) راه ورود دارد، جز known.
// ۴) هیچ مسیر کال‌بکی (چیزی با «:») دکمهٔ کشوی نقش‌های مینی‌اپ نمی‌شود و هر data-s کشو صفحه‌ای در PAGES دارد.
// known فقط کوچک می‌شود: خلأیی که بسته شد باید از known هم برداشته شود.
import { readFileSync, readdirSync } from 'node:fs';

const FIELDS = ['owner_role', 'lifecycle', 'no_bare_message', 'settings_in_hub', 'edit_cancel_history', 'hub_tab', 'hub_edit_back', 'miniapp', 'tests'];
const empty = (v) => v === null || v === undefined || v === false || v === '' || (Array.isArray(v) && !v.length);

/* بدنهٔ تابع‌های سطح بالا */
function functions(src) {
  const out = {}, lines = src.split('\n');
  let cur = null, buf = [];
  for (const l of lines) {
    const m = /^(?:async\s+)?function\s+([\w$]+)\s*\(/.exec(l);
    if (m) { if (cur) out[cur] = buf.join('\n'); cur = m[1]; buf = []; }
    if (cur) buf.push(l);
  }
  if (cur) out[cur] = buf.join('\n');
  return out;
}
/* آرگومان‌های فراخوانی‌های name( ... ) با شمارش پرانتز و رشته */
export function callArgs(text, name) {
  const out = [], re = new RegExp(`(?<![\\w$.])${name}\\(`, 'g');
  let m;
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length, depth = 1, args = 1, q = null, any = false;
    for (; i < text.length && depth; i++) {
      const c = text[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; any = true; continue; }
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth--;
      else if (c === ',' && depth === 1) args++;
      else if (!/\s/.test(c)) any = true;
    }
    out.push(any ? args : 0);
  }
  return out;
}

export function check(root = '.') {
  const bad = [], info = [];
  const doc = JSON.parse(readFileSync(`${root}/docs/features.json`, 'utf8'));
  const gs = readdirSync(`${root}/bot`).filter((f) => f.endsWith('.gs')).map((f) => readFileSync(`${root}/bot/${f}`, 'utf8'));
  const all = gs.join('\n');
  const app = readFileSync(`${root}/site/pages/503886-app.html`, 'utf8');
  const roles = (/const TG_ROLES = \[([\s\S]*?)\];/.exec(all) || [, ''])[1].replace(/\/\*[\s\S]*?\*\//g, '').match(/'[^']+'/g).map((x) => x.slice(1, -1));
  const capRe = /\{ key: '[^']+',\s*page: '([^']+)',\s*label: '[^']+',\s*roles: \[([^\]]*)\]([^}]*)\}/g;
  const pages = new Set(), appRoles = new Set();
  for (const m of all.matchAll(capRe)) { pages.add(m[1]); if (/app: true/.test(m[3])) m[2].split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean).forEach((r) => appRoles.add(r)); }
  const suites = new Set([...all.matchAll(/\[\s*'[^'\n]*'\s*,\s*'([\w$]+)'\s*\]/g)].map((m) => m[1]));
  const fns = {}; gs.forEach((s) => Object.assign(fns, functions(s)));

  /* ۱ */
  const keys = new Set();
  for (const f of doc.features || []) {
    const id = f.key || '?';
    if (keys.has(id)) bad.push(`features: کلید تکراری ${id}`); keys.add(id);
    if (!f.name) bad.push(`${id}: نام ندارد`);
    const gaps = f.gaps || [];
    for (const k of FIELDS) {
      if (!(k in f)) bad.push(`${id}: فیلد ${k} نیست`);
      else if (empty(f[k]) && !gaps.includes(k)) bad.push(`${id}: ${k} خالی است و در gaps نیامده`);
      else if (!empty(f[k]) && gaps.includes(k)) bad.push(`${id}: ${k} پر است؛ از gaps بردار`);
    }
    if (f.owner_role && !roles.includes(f.owner_role)) bad.push(`${id}: نقش «${f.owner_role}» در TG_ROLES نیست`);
    if (f.miniapp && !pages.has(f.miniapp)) bad.push(`${id}: صفحهٔ مینی‌اپ ${f.miniapp} در TG_CAP نیست`);
    for (const t of f.tests || []) if (!suites.has(t)) bad.push(`${id}: مجموعهٔ تست ${t} در TG_SUITES نیست`);
  }
  const complete = (doc.features || []).filter((f) => !(f.gaps || []).length).length;
  info.push(`قابلیت‌ها: ${(doc.features || []).length}، کامل: ${complete}، فیلدهای باز: ${(doc.features || []).reduce((n, f) => n + (f.gaps || []).length, 0)}`);

  /* ۲ */
  let bare = 0;
  for (const [n, body] of Object.entries(fns)) {
    if (/Tests?\w*$/.test(n)) continue;
    bare += callArgs(body, 'tgSend_').filter((a) => a === 2).length;
  }
  const known = doc.known || {};
  if (known.bare_sends == null) bad.push(`known.bare_sends خالی است؛ شمار فعلی ${bare}`);
  else if (bare > known.bare_sends) bad.push(`پیام بی‌کیبورد تازه: ${bare} در برابر ${known.bare_sends}. به پیام دکمه بده (منو یا «بازگشت»)`);
  else if (bare < known.bare_sends) bad.push(`پیام بی‌کیبورد کم شد (${bare})؛ known.bare_sends را ${bare} کن`);
  info.push(`پیام بی‌کیبورد (ایستا): ${bare}`);

  /* ۳ */
  const btn = (/const TG_ROLE_BTN = \{([\s\S]*?)\};/.exec(all) || [, ''])[1];
  const schRoles = (/var TG_SCH_ROLES = \[([^\]]*)\]/.exec(all) || [, ''])[1];
  const routeSrc = (fns.tgRoleRoute_ || '') + (fns.tgSchoolRoute_ || '') + schRoles;   /* tgSchoolRoute_ نقش‌های TG_SCH_ROLES را می‌گیرد */
  const section = (/const TG_SECTION_ROLE = \{([\s\S]*?)\};/.exec(all) || [, ''])[1];
  const teamr = ((/TEAMR = \[([^\]]*)\]/.exec(app) || [, ''])[1].match(/'[^']+'/g) || []).map((x) => x.slice(1, -1));
  const noBot = [], noApp = [];
  for (const r of roles) {
    if (r === 'مراجع') continue;
    const hasBtn = btn.includes(`'${r}'`);
    const hasRoute = routeSrc.includes(`'${r}'`) || section.includes(`'${r}'`);
    if (!hasBtn || !hasRoute) noBot.push(r);
    if (!teamr.includes(r) && !appRoles.has(r)) noApp.push(r);
  }
  const kb = known.roles_without_bot_entry || [], ka = known.roles_without_app_entry || [];
  noBot.filter((r) => !kb.includes(r)).forEach((r) => bad.push(`نقش «${r}» در بات برچسب یا شاخه ندارد`));
  kb.filter((r) => !noBot.includes(r)).forEach((r) => bad.push(`نقش «${r}» در بات راه ورود دارد؛ از known.roles_without_bot_entry بردار`));
  noApp.filter((r) => !ka.includes(r)).forEach((r) => bad.push(`نقش «${r}» در مینی‌اپ راه ورود ندارد`));
  ka.filter((r) => !noApp.includes(r)).forEach((r) => bad.push(`نقش «${r}» در مینی‌اپ راه ورود دارد؛ از known.roles_without_app_entry بردار`));
  info.push(`نقش بی راه ورود: بات ${noBot.length}، مینی‌اپ ${noApp.length}`);

  /* ۴ */
  const ds = app.indexOf('var xb = [];'), de = app.indexOf("id=\"tjRoles\"", ds);
  if (ds < 0 || de < 0) bad.push('کشوی نقش‌های مینی‌اپ پیدا نشد (var xb … tjRoles)');
  else {
    const drawer = app.slice(ds, de);
    const pagesApp = new Set([...((/var PAGES = \{([\s\S]*?)\n  \};/.exec(app) || [, ''])[1].matchAll(/^\s{4}([a-z]+):/gm))].map((m) => m[1]));
    for (const m of drawer.matchAll(/data-([sx])="([^"]+)"/g)) {
      if (/['+]/.test(m[2])) continue;   /* مقدار ساخته‌شده از PAGES (mine) */
      if (m[2].includes(':')) bad.push(`کشوی مینی‌اپ: مسیر کال‌بک «${m[2]}» دکمه شده`);
      if (m[1] === 's' && pagesApp.size && !pagesApp.has(m[2])) bad.push(`کشوی مینی‌اپ: صفحهٔ ${m[2]} در PAGES نیست`);
    }
  }
  return { bad, info, bare, noBot, noApp };
}

export function featuresSelfTest() {
  const bad = [], t = (n, c) => { if (!c) bad.push(n); };
  t('شمار آرگومان', JSON.stringify(callArgs("tgSend_(a, 'x, y'); tgSend_(a, f(b, c), kb); tgSend_()", 'tgSend_')) === '[2,3,0]');
  t('رشته با پرانتز', JSON.stringify(callArgs("tgSend_(c, 'سلام (خوب)')", 'tgSend_')) === '[2]');
  return bad;
}

if (process.argv[1] && process.argv[1].endsWith('features-check.mjs')) {
  const r = check('.');
  r.info.forEach((x) => console.log(x));
  if (process.argv[2] === 'list') console.log(JSON.stringify({ bare: r.bare, noBot: r.noBot, noApp: r.noApp }));
  r.bad.forEach((x) => console.log('✗ ' + x));
  process.exit(r.bad.length ? 1 : 0);
}
