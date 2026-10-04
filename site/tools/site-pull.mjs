// خواندن وضعیت سایت زنده و مقایسه با /site. فقط GET؛ هیچ درخواست نوشتنی به سایت نمی‌رود.
//   node site-pull.mjs             ← فقط گزارش تفاوت
//   node site-pull.mjs --write     ← نسخهٔ زنده را در /site می‌نویسد (فقط فایل‌های مخزن؛ سایت دست نمی‌خورد)
// رمز: WP_USER و WP_APP_PASSWORD (Application Password کاربر claude-ops). بی رمز فقط دادهٔ عمومی خوانده می‌شود.
// خروجی: خلاصه در لاگ و GITHUB_STEP_SUMMARY، و پوشهٔ $OUT (پیش‌فرض RUNNER_TEMP/site-pull) برای artifact.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE, fail, hash, lf, loadEnv, log, maskSecrets, pageFiles, readJson, summary, warn, wpClient, writeJson } from './site-lib.mjs';

loadEnv();
const WRITE = process.argv.includes('--write');
const OUT = process.env.OUT || join(process.env.RUNNER_TEMP || '/tmp', 'site-pull');
mkdirSync(OUT, { recursive: true });
const wp = wpClient();
const diffs = [];
const add = (kind, id, msg) => diffs.push({ kind, id: String(id), msg });
const notes = [];
const state = { pulled_at: new Date().toISOString(), base: wp.base, items: {} };
const J = (v) => JSON.stringify(v, null, 1) + '\n';
const enc = (s) => decodeURIComponent(s);

// ---------- ۱. برگه‌ها ----------
async function pages() {
  const authed = wp.hasAuth;
  const q = authed
    // مخزن عمومی (v170.14): فقط برگه‌های منتشرشده؛ پیش‌نویس و خصوصی وارد مخزن نمی‌شوند
    ? '/wp-json/wp/v2/pages?context=edit&status=publish&_fields=id,slug,status,title,parent,template,link,modified_gmt,content,yoast_head_json'
    : '/wp-json/wp/v2/pages?_fields=id,slug,status,title,parent,template,link,modified_gmt,yoast_head_json';
  const live = await wp.all(q);
  if (authed && !live.some((p) => typeof p.content?.raw === 'string')) throw new Error('رمز پذیرفته نشد یا claude-ops دسترسی ویرایش برگه ندارد (content.raw نیامد)');
  log(`برگه‌ها: ${live.length} (${authed ? 'منتشرشده، متن خام' : 'فقط منتشرشده'})`);
  const idxPath = join(SITE, 'pages-index.json');
  const index = readJson(idxPath, []);
  const byId = new Map(index.map((p) => [p.id, p]));
  const files = pageFiles();
  const FIELDS = ['slug', 'status', 'title', 'parent', 'template', 'link'];
  const newIndex = [], yoast = {};
  for (const p of live) {
    const meta = { id: p.id, slug: enc(p.slug), status: p.status, title: p.title.raw ?? p.title.rendered, parent: p.parent, template: p.template, link: p.link };
    newIndex.push(meta);
    const old = byId.get(p.id);
    if (!old) add('برگه', p.id, `در مخزن نیست: ${meta.link} (${meta.status})`);
    else for (const f of FIELDS) {
      const a = String(old[f] ?? ''), b = String(meta[f] ?? '');
      const same = f === 'link' || f === 'slug' ? enc(a).toLowerCase() === enc(b).toLowerCase() : a === b;
      if (!same) add('برگه', p.id, `${f}: «${enc(a)}» ← «${enc(b)}»`);
    }
    const y = p.yoast_head_json || {};
    yoast[p.id] = { title: y.title || '', description: y.description || '', canonical: y.canonical || '', robots: y.robots ? `${y.robots.index},${y.robots.follow}` : '' };
    if (!authed) continue;
    const raw = p.content.raw;
    if (maskSecrets(raw) !== raw) add('برگه', p.id, '⚠️ متن برگه چیزی شبیه رمز دارد؛ بررسی دستی لازم است (برگه‌ها پوشانده نمی‌شوند)');
    const fname = `${p.id}-${meta.slug}.html`;
    const cur = files.get(p.id);
    state.items[`page:${p.id}`] = { hash: hash(raw), modified: p.modified_gmt };
    if (!cur) add('برگه', p.id, `فایل متن در مخزن نیست (${fname})`);
    else {
      const rh = hash(readFileSync(join(SITE, 'pages', cur), 'utf8'));
      if (rh !== hash(raw)) add('برگه', p.id, `متن فرق دارد (مخزن ${rh} · زنده ${hash(raw)} · آخرین ویرایش زنده ${p.modified_gmt})`);
      if (cur !== fname) add('برگه', p.id, `نام فایل: ${cur} ← ${fname}`);
    }
    if (WRITE) {
      if (cur && cur !== fname) renameSync(join(SITE, 'pages', cur), join(SITE, 'pages', fname));
      writeFileSync(join(SITE, 'pages', fname), lf(raw));
    }
  }
  const liveIds = new Set(live.map((p) => p.id));
  for (const p of index) {
    if (liveIds.has(p.id) || p.status !== 'publish') continue;
    add('برگه', p.id, `در مخزن هست، در سایت منتشرشده نیست (پیش‌نویس، خصوصی، حذف یا زباله‌دان): ${p.link}`);
  }
  // Yoast: عنوان، توضیح، canonical و robots محاسبه‌شده (yoast_head_json). متای خام فقط با پل خوانده می‌شود.
  const yPath = join(SITE, 'yoast.json');
  const yRepo = readJson(yPath, null);
  if (!yRepo) add('Yoast', '-', `site/yoast.json در مخزن نبود؛ ${Object.keys(yoast).length} برگه ثبت می‌شود`);
  else for (const [id, y] of Object.entries(yoast)) {
    const o = yRepo[id];
    if (!o) continue;
    for (const k of Object.keys(y)) if ((o[k] || '') !== y[k]) add('Yoast', id, `${k}: «${o[k] || '-'}» ← «${y[k] || '-'}»`);
  }
  for (const [id, y] of Object.entries(yoast)) {
    if (!y.title) add('Yoast', id, 'عنوان سئو خالی است');
    if (!y.description) add('Yoast', id, 'توضیح متا خالی است');
  }
  if (WRITE && authed) writeFileSync(idxPath, J(newIndex.sort((a, b) => b.id - a.id)));
  if (WRITE) writeFileSync(yPath, J(yoast));
  return live;
}

// ---------- ۲. CSS سراسری، قالب‌ها و قطعه‌قالب‌ها ----------
async function theme() {
  if (!wp.hasAuth) { notes.push('قالب‌ها و CSS سراسری بی رمز خوانده نمی‌شوند.'); return; }
  const th = await wp.get('/wp-json/wp/v2/themes?status=active&_fields=stylesheet,version,name,_links');
  const active = th.json?.[0];
  if (!active) { warn(`قالب فعال خوانده نشد: HTTP ${th.status}`); return; }
  state.theme = { stylesheet: active.stylesheet, version: active.version };
  const gsHref = active._links?.['wp:user-global-styles']?.[0]?.href;
  if (gsHref) {
    const gs = await wp.get(gsHref + (gsHref.includes('?') ? '&' : '?') + 'context=edit');
    if (gs.ok) {
      const css = gs.json.styles?.css ?? '';
      const settings = { settings: gs.json.settings || {}, styles: Object.fromEntries(Object.entries(gs.json.styles || {}).filter(([k]) => k !== 'css')) };
      const repoCss = existsSync(join(SITE, 'css/global-styles.css')) ? readFileSync(join(SITE, 'css/global-styles.css'), 'utf8') : '';
      const repoSet = readJson(join(SITE, 'css/global-styles-settings.json'), {});
      if (hash(repoCss) !== hash(css)) add('CSS سراسری', gs.json.id, `global-styles.css فرق دارد (مخزن ${hash(repoCss)} · زنده ${hash(css)})`);
      if (hash(J(repoSet)) !== hash(J(settings))) add('CSS سراسری', gs.json.id, 'تنظیمات Global Styles (فونت‌ها و رنگ‌ها) فرق دارد');
      state.items[`global-styles:${gs.json.id}`] = { hash: hash(css), settings: hash(J(settings)) };
      if (WRITE) { writeFileSync(join(SITE, 'css/global-styles.css'), css); writeFileSync(join(SITE, 'css/global-styles-settings.json'), J(settings)); }
    } else warn(`Global Styles: HTTP ${gs.status}`);
  }
  for (const [route, dir] of [['templates', 'templates'], ['template-parts', 'template-parts']]) {
    const r = await wp.get(`/wp-json/wp/v2/${route}?context=edit&per_page=100&_fields=id,slug,source,content,modified`);
    if (!r.ok) { warn(`${route}: HTTP ${r.status}`); continue; }
    const live = r.json.filter((t) => t.source === 'custom' || existsSync(join(SITE, dir, `${t.slug}.html`)));
    const repo = new Set(readdirSync(join(SITE, dir)).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)));
    for (const t of live) {
      const raw = t.content?.raw ?? '';
      const p = join(SITE, dir, `${t.slug}.html`);
      state.items[`${route}:${t.slug}`] = { hash: hash(raw), source: t.source };
      if (!repo.has(t.slug)) add(dir, t.slug, `در مخزن نیست (منبع ${t.source})`);
      else if (hash(readFileSync(p, 'utf8')) !== hash(raw)) add(dir, t.slug, `فرق دارد (منبع زنده ${t.source})`);
      repo.delete(t.slug);
      if (WRITE) writeFileSync(p, lf(raw));
    }
    for (const s of repo) add(dir, s, 'در مخزن هست، در سایت نیست');
  }
}

// ---------- ۳. اسنیپت‌های WPCode ----------
// WPCode راه REST ندارد. پس فقط بررسی غیرمستقیم: برای اسنیپت‌های HTML، CSS و JS سراسری (سربرگ یا پاورقی) یک سطر
// شاخص از فایل مخزن باید در HTML خانه دیده شود. اسنیپت‌های PHP بی پل قابل خواندن نیستند.
async function snippets() {
  if (wp.hasAuth) {
    const st = await wp.get('/wp-json/tj-ops/v1/state', { timeout: 90000 });
    if (st.ok && Array.isArray(st.json?.snippets)) return snippetsBridge(st.json);
    notes.push(`پل tj-ops در دسترس نیست (HTTP ${st.status})؛ اسنیپت‌ها غیرمستقیم سنجیده شدند.`);
  }
  const idx = readJson(join(SITE, 'snippets/index.json'), []);
  const types = await wp.get('/wp-json/wp/v2/types?context=edit');
  if (types.ok && types.json?.wpcode) notes.push('نوع wpcode در REST دیده شد؛ می‌شود اسنیپت‌ها را مستقیم خواند.');
  const home = await wp.get('/?tj_pull=' + Date.now(), { authed: false });
  if (!home.ok) { warn(`خانه خوانده نشد: HTTP ${home.status}`); return; }
  const html = home.text.replace(/\s+/g, ' ');
  let checked = 0;
  for (const s of idx) {
    if (!s.active || !['css', 'html', 'js'].includes(s.type) || !/سربرگ|پاورقی/.test(s.location)) continue;
    const code = readFileSync(join(SITE, 'snippets', s.file), 'utf8');
    const lines = code.split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).filter((l) => l.length >= 40 && !/^(\/\*|\*|\/\/|<!--)/.test(l));
    const probe = lines.sort((a, b) => b.length - a.length).slice(0, 3).map((l) => l.slice(0, 120));
    if (!probe.length) continue;
    checked++;
    const hit = probe.filter((l) => html.includes(l)).length;
    if (hit === 0) add('اسنیپت', s.id, `«${s.title}»: هیچ سطر شاخص مخزن در HTML خانه نیست (کد زنده فرق دارد یا اسنیپت خاموش است)`);
    else if (hit < probe.length) add('اسنیپت', s.id, `«${s.title}»: ${hit} از ${probe.length} سطر شاخص پیدا شد (احتمالاً کمی فرق دارد)`);
  }
  const php = idx.filter((s) => s.active && s.type === 'php').length;
  notes.push(`اسنیپت‌ها: ${checked} اسنیپت HTML/CSS/JS سراسری غیرمستقیم در HTML خانه سنجیده شد؛ ${php} اسنیپت PHP فعال بی پل tj-ops قابل خواندن نیست.`);
}

// با پل tj-ops: متن کامل همهٔ اسنیپت‌ها و متای خام Yoast
const EXT = { php: 'php', html: 'html', css: 'css', js: 'js', text: 'txt', universal: 'html', scss: 'scss' };
function snippetsBridge(b) {
  const idxPath = join(SITE, 'snippets/index.json');
  const idx = readJson(idxPath, []);
  const byId = new Map(idx.map((x) => [x.id, x]));
  const out = [];
  for (const sn of b.snippets) {
    const self = sn.code.includes("register_rest_route('tj-ops/v1'");
    const old = byId.get(sn.id);
    const file = self ? 'ops-bridge.php' : old?.file || `${sn.id}.${EXT[sn.type] || 'txt'}`;
    out.push({ ...(old || {}), id: sn.id, file, title: sn.title, type: sn.type || old?.type, location: old?.location || sn.location, loc: sn.location, active: sn.active });
    const code = lf(maskSecrets(sn.code));
    state.items[`snippet:${sn.id}`] = { hash: hash(code), modified: sn.modified, active: sn.active };
    const p = join(SITE, 'snippets', file);
    const rh = existsSync(p) ? hash(maskSecrets(readFileSync(p, 'utf8'))) : '-';
    if (!old) add('اسنیپت', sn.id, `در مخزن نبود: «${sn.title}» (${sn.active ? 'فعال' : 'غیرفعال'})`);
    else {
      if (rh !== hash(code)) add('اسنیپت', sn.id, `کد فرق دارد (مخزن ${rh} · زنده ${hash(code)})`);
      if (old.active !== sn.active) add('اسنیپت', sn.id, `فعال: ${old.active} ← ${sn.active}`);
      if (old.title !== sn.title) add('اسنیپت', sn.id, `عنوان: «${old.title}» ← «${sn.title}»`);
    }
    if (maskSecrets(sn.code) !== sn.code) notes.push(`اسنیپت ${sn.id}: رمز داخل کد در مخزن خالی نوشته شد (مقدار فقط روی سایت است).`);
    if (WRITE && !self) writeFileSync(p, code);
  }
  for (const x of idx) if (Number.isInteger(x.id) && !b.snippets.some((y) => y.id === x.id)) add('اسنیپت', x.id, 'در مخزن هست، در سایت نیست');
  if (WRITE) writeFileSync(idxPath, J(out.sort((a, c) => a.id - c.id)));
  if (WRITE) writeFileSync(join(SITE, 'yoast-meta.json'), J(b.yoast));
  for (const [id, y] of Object.entries(b.yoast)) state.items[`yoast:${id}`] = { hash: hash(JSON.stringify(y)) };
  notes.push(`اسنیپت‌ها از پل tj-ops: ${b.snippets.length} (${b.snippets.filter((x) => x.active).length} فعال).`);
}

// ---------- ۴. ریدایرکت‌ها ----------
// منبع: نقشه‌های داخل اسنیپت‌ها (505693 ریدایرکت ۴۰۴های قدیمی، 505103 لینک‌های کوتاه /go/) + پایه‌ها.
// خروجی site/redirects.json فهرست مورد انتظار است؛ تست دود و چک هفتگی همین را می‌سنجند.
async function redirects() {
  const exp = [
    { from: 'http://tajrobeh.life/', code: 301, to: 'https://tajrobeh.life/', src: 'سرور' },
    { from: 'https://www.tajrobeh.life/', code: 301, to: 'https://tajrobeh.life/', src: 'سرور' },
  ];
  const s693 = readFileSync(join(SITE, 'snippets/505693.php'), 'utf8');
  for (const m of s693.matchAll(/'(\/[^']*)'\s*=>\s*'(\/[^']*)'/g)) exp.push({ from: wp.base + encodeURI(m[1]), code: 301, to: wp.base + m[2], src: '505693' });
  const s103 = readFileSync(join(SITE, 'snippets/505103.php'), 'utf8');
  for (const m of s103.matchAll(/'(go\/[^']+)'\s*=>\s*array\('([^']+)'/g)) exp.push({ from: `${wp.base}/${m[1]}`, code: 302, to: wp.base + m[2], src: '505103', prefix: true });
  const plug = (state.plugins || []).find((p) => /redirection/i.test(p.plugin));
  if (plug && wp.hasAuth) {
    const r = await wp.get('/wp-json/redirection/v1/redirect?per_page=200');
    if (r.ok) for (const x of r.json.items || []) exp.push({ from: wp.base + x.url, code: x.action_code, to: x.action_data?.url, src: 'Redirection', enabled: x.enabled });
    else warn(`افزونهٔ Redirection: HTTP ${r.status}`);
  }
  const live = [];
  for (const e of exp) {
    const r = await wp.get(e.from, { authed: false, retries: 2, timeout: 20000 });
    const loc = r.headers.get('location') || '';
    const ok = (r.status === e.code || (e.code === 301 && r.status === 308)) && (e.prefix ? loc.startsWith(e.to) : loc === e.to);
    live.push({ ...e, live_code: r.status, live_to: loc, ok });
    if (!ok) add('ریدایرکت', e.from.replace(wp.base, ''), `انتظار ${e.code} ← ${e.to.replace(wp.base, '')} · زنده ${r.status} ← ${loc.replace(wp.base, '') || '-'}`);
  }
  if (WRITE) writeFileSync(join(SITE, 'redirects.json'), J(exp));
  writeFileSync(join(OUT, 'redirects-live.json'), J(live));
  notes.push(`ریدایرکت‌ها: ${live.filter((x) => x.ok).length} از ${live.length} درست کار کردند.`);
}

// ---------- ۵. افزونه‌ها، قالب و نسخه‌ها ----------
async function platform() {
  const out = { wp: null, wp_latest: null, php: null, theme: state.theme || null, plugins: [] };
  const feed = await wp.get('/feed/', { authed: false });
  out.wp = feed.text?.match(/wordpress\.org\/\?v=([\d.]+)/)?.[1] || null;
  try { const v = await (await fetch('https://api.wordpress.org/core/version-check/1.7/')).json(); out.wp_latest = v.offers?.[0]?.current || null; } catch {}
  if (wp.hasAuth) {
    const r = await wp.get('/wp-json/wp/v2/plugins?context=edit&_fields=plugin,name,version,status,author,requires_php');
    if (r.ok) out.plugins = r.json.map((p) => ({ plugin: p.plugin, name: p.name.replace(/<[^>]+>/g, ''), version: p.version, status: p.status }));
    else warn(`فهرست افزونه‌ها: HTTP ${r.status} (کاربر باید activate_plugins داشته باشد)`);
    const h = await wp.get('/wp-json/wp-site-health/v1/directory-sizes');
    if (!h.ok) notes.push(`Site Health: HTTP ${h.status}`);
  }
  for (const p of out.plugins) {
    const slug = p.plugin.split('/')[0];
    try {
      const j = await (await fetch(`https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=${slug}&request[fields][sections]=0`)).json();
      p.latest = j?.version || null;
    } catch { p.latest = null; }
    if (p.latest && p.latest !== p.version) add('افزونه', slug, `${p.name}: نسخهٔ ${p.version} · تازه‌ترین ${p.latest}${p.status === 'active' ? '' : ' (غیرفعال)'}`);
  }
  if (out.wp && out.wp_latest && out.wp !== out.wp_latest) add('وردپرس', 'core', `نسخهٔ ${out.wp} · تازه‌ترین ${out.wp_latest}`);
  state.plugins = out.plugins;
  if (WRITE) writeFileSync(join(SITE, 'platform.json'), J({ ...out, read_at: state.pulled_at }));
  writeFileSync(join(OUT, 'platform.json'), J(out));
  notes.push(`وردپرس ${out.wp || '?'} (تازه‌ترین ${out.wp_latest || '?'}) · قالب ${out.theme ? `${out.theme.stylesheet} ${out.theme.version}` : '?'} · ${out.plugins.length} افزونه.`);
}

// ---------- اجرا ----------
const steps = [['برگه‌ها', pages], ['قالب و CSS', theme], ['افزونه‌ها', platform], ['اسنیپت‌ها', snippets], ['ریدایرکت‌ها', redirects]];
let broken = 0;
for (const [name, fn] of steps) {
  try { await fn(); } catch (e) { broken++; fail(`${name}: ${e.message}`); notes.push(`❌ ${name} خوانده نشد: ${e.message}`); }
}
if (WRITE) writeFileSync(join(SITE, 'state.json'), J({ pulled_at: state.pulled_at, base: state.base, items: state.items }));

const byKind = {};
for (const d of diffs) byKind[d.kind] = (byKind[d.kind] || 0) + 1;
const md = `## مقایسهٔ مخزن و سایت زنده\n\n${wp.base} · ${state.pulled_at} · ${wp.hasAuth ? 'با رمز claude-ops' : 'بی رمز'}${WRITE ? ' · فایل‌های /site نوشته شد' : ''}\n\n` +
  notes.map((n) => `- ${n}`).join('\n') + '\n\n' +
  `**${diffs.length} تفاوت:** ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join('، ') || 'هیچ'}\n\n` +
  (diffs.length ? `| نوع | شناسه | تفاوت |\n|---|---|---|\n${diffs.map((d) => `| ${d.kind} | ${d.id} | ${d.msg.replace(/\|/g, '/')} |`).join('\n')}\n` : '');
writeFileSync(join(OUT, 'drift.md'), md);
writeFileSync(join(OUT, 'drift.json'), J(diffs));
summary(md);
log(md);
process.exit(broken ? 1 : 0);
