// اندازه‌گیری زندهٔ سایت از گیت‌هاب: سرعت (Lighthouse موبایل)، امنیت (هدرها، نقاط افشا، آسیب‌پذیری افزونه‌ها)،
// و مسیرهای لید (حضور فرم‌ها و لینک‌ها، و یک ثبت آزمایشی فرم با دادهٔ TEST که بعد پاک می‌شود).
//   node site-audit.mjs speed security leads      ← بخش‌های دلخواه؛ بی آرگومان همه
// فقط خواندن، جز ثبت آزمایشی فرم (LEAD_SUBMIT=1) که یک ورودی Fluent می‌سازد و همان را پاک می‌کند.
// نام، شماره یا ایمیل هیچ کاربری چاپ نمی‌شود؛ فقط شمارش.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { connect } from 'node:tls';
import { join } from 'node:path';
import { fail, faDigits, loadEnv, log, summary, warn, wpClient } from './site-lib.mjs';

loadEnv();
const OUT = process.env.OUT || join(process.env.RUNNER_TEMP || '/tmp', 'site-audit');
mkdirSync(OUT, { recursive: true });
const wp = wpClient();
const B = wp.base;
const parts = process.argv.slice(2).length ? process.argv.slice(2) : ['speed', 'security', 'leads'];
const md = [];
const J = (v) => JSON.stringify(v, null, 1);
const res = {};

// ---------- سرعت ----------
const SPEED_URLS = (process.env.SPEED_URLS || '/,/get-therapy/,/persian-therapy/,/school/,/mag/').split(',');
async function speed() {
  // ۵ مقالهٔ پربازدید: از SPEED_ARTICLES (نشانی‌ها با ویرگول)؛ وگرنه ۵ نوشتهٔ آخر (نشانهٔ پربازدید نیست؛ در گزارش گفته می‌شود)
  let arts = (process.env.SPEED_ARTICLES || '').split(',').filter(Boolean);
  let artNote = 'فهرست مقاله‌های پربازدید از Search Console';
  if (!arts.length) {
    const r = await wp.get('/wp-json/wp/v2/posts?per_page=5&_fields=link', { authed: false });
    arts = (r.json || []).map((p) => p.link.replace(B, ''));
    artNote = '۵ نوشتهٔ آخر (فهرست پربازدیدها از Search Console نرسید)';
  }
  const rows = [];
  for (const u of [...SPEED_URLS, ...arts]) {
    const file = join(OUT, `lh-${rows.length}.json`);
    try {
      execFileSync('npx', ['-y', 'lighthouse@12', B + u, '--only-categories=performance', '--form-factor=mobile', '--output=json', `--output-path=${file}`,
        '--chrome-flags=--headless=new --no-sandbox', '--quiet', '--max-wait-for-load=60000'], { stdio: 'ignore', timeout: 180000 });
      const lh = JSON.parse(readFileSync(file, 'utf8'));
      const a = lh.audits;
      const items = a['network-requests']?.details?.items || [];
      const by = {};
      for (const it of items) by[it.resourceType] = (by[it.resourceType] || 0) + (it.transferSize || 0);
      const third = (a['third-party-summary']?.details?.items || []).slice(0, 3).map((x) => `${x.entity?.text || x.entity} ${Math.round(x.transferSize / 1024)}KB`);
      rows.push({ url: u, score: Math.round((lh.categories.performance.score || 0) * 100), lcp: a['largest-contentful-paint'].numericValue, cls: a['cumulative-layout-shift'].numericValue,
        tbt: a['total-blocking-time'].numericValue, fcp: a['first-contentful-paint'].numericValue, ttfb: a['server-response-time']?.numericValue,
        kb: Math.round((a['total-byte-weight'].numericValue || 0) / 1024), reqs: items.length,
        doc: Math.round((by.Document || 0) / 1024), css: Math.round((by.Stylesheet || 0) / 1024), js: Math.round((by.Script || 0) / 1024),
        font: Math.round((by.Font || 0) / 1024), img: Math.round((by.Image || 0) / 1024),
        lcpEl: (a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet || '').slice(0, 90),
        blocking: (a['render-blocking-resources']?.details?.items || []).length, third });
    } catch (e) { rows.push({ url: u, error: String(e.message).slice(0, 120) }); }
  }
  // دادهٔ میدانی (کاربران واقعی Chrome، ۲۸ روز) از PageSpeed Insights؛ برای سایت کم‌ترافیک معمولاً خالی است
  for (const r of rows) {
    try {
      const k = process.env.PSI_API_KEY ? `&key=${process.env.PSI_API_KEY}` : '';
      const p = await (await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(B + r.url)}&strategy=mobile&category=performance${k}`)).json();
      const m = p.loadingExperience?.metrics;
      r.field = m ? { lcp: m.LARGEST_CONTENTFUL_PAINT_MS?.percentile, inp: m.INTERACTION_TO_NEXT_PAINT?.percentile, cls: m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile / 100, origin: p.loadingExperience?.origin_fallback || false } : null;
      if (!r.field && p.originLoadingExperience?.metrics) {
        const o = p.originLoadingExperience.metrics;
        r.field = { lcp: o.LARGEST_CONTENTFUL_PAINT_MS?.percentile, inp: o.INTERACTION_TO_NEXT_PAINT?.percentile, cls: o.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile / 100, origin: true };
      }
      if (p.error) r.fieldErr = p.error.message?.slice(0, 80);
    } catch (e) { r.fieldErr = String(e).slice(0, 80); }
  }
  res.speed = rows;
  const s = (ms) => (ms == null ? '-' : (ms / 1000).toFixed(1) + 's');
  md.push('## سرعت (Lighthouse موبایل از رانر آمریکا، با شبیه‌سازی 4G کند)\n', `مقاله‌ها: ${artNote}\n`,
    '| صفحه | امتیاز | LCP | CLS | TBT | TTFB | وزن KB | درخواست | سند/CSS/JS/فونت/تصویر KB | منابع مسدودکننده | میدانی LCP/INP/CLS |', '|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => r.error ? `| ${r.url} | خطا: ${r.error} |` :
      `| ${decodeURI(r.url)} | ${r.score} | ${s(r.lcp)} | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)}ms | ${Math.round(r.ttfb || 0)}ms | ${r.kb} | ${r.reqs} | ${r.doc}/${r.css}/${r.js}/${r.font}/${r.img} | ${r.blocking} | ${r.field ? `${s(r.field.lcp)}/${r.field.inp ?? '-'}ms/${r.field.cls ?? '-'}${r.field.origin ? ' (کل دامنه)' : ''}` : 'ندارد'} |`),
    '', '**عنصر LCP و شخص‌ثالث‌ها:**', ...rows.filter((r) => !r.error).map((r) => `- ${decodeURI(r.url)}: \`${r.lcpEl.replace(/`/g, '')}\` · ${r.third.join('، ') || '-'}`), '');
}

// ---------- امنیت ----------
async function security() {
  const out = {};
  const home = await wp.get('/', { authed: false });
  const H = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'server', 'x-powered-by', 'cache-control', 'content-encoding', 'x-cache', 'cf-ray', 'x-arvan-cache'];
  out.headers = Object.fromEntries(H.map((h) => [h, home.headers.get(h)]));
  out.ttfb_home_ms = home.ms;
  // کش صفحهٔ WP-Optimize و کش مرورگر برای فایل‌های ثابت
  out.page_cache = {};
  for (const u of ['/', '/get-therapy/', '/mag/', '/school/']) {
    const r = await wp.get(u, { authed: false, retries: 1 });
    out.page_cache[u] = { wpo: /Cached by WP-Optimize|wpo-cache|WP Optimize page cache/i.test(r.text || ''), ms: r.ms, cc: r.headers.get('cache-control') || '-' };
  }
  const asset = async (re) => { const m = (home.text || '').match(re); if (!m) return null; const r = await wp.get(m[1].startsWith('http') ? m[1] : B + m[1], { authed: false, retries: 1 }); return { url: m[1].replace(B, '').slice(0, 80), cc: r.headers.get('cache-control') || '-', expires: r.headers.get('expires') || '-', type: r.headers.get('content-type') }; };
  out.static = { font: await asset(/(https?:\/\/tajrobeh\.life\/[^"')\s]+\.woff2)/), image: await asset(/(https?:\/\/tajrobeh\.life\/wp-content\/uploads\/[^"'\s]+\.(?:webp|png|jpe?g))/) };
  const probe = async (p, o = {}) => { const r = await wp.get(p, { authed: false, retries: 1, timeout: 20000, ...o }); return r; };
  const x1 = await probe('/xmlrpc.php');
  let xmlMethods = null;
  try {
    const r = await fetch(B + '/xmlrpc.php', { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>' });
    const t = await r.text();
    xmlMethods = { status: r.status, count: (t.match(/<string>/g) || []).length, pingback: /pingback\.ping/.test(t), multicall: /system\.multicall/.test(t) };
  } catch {}
  out.xmlrpc = { get: x1.status, post: xmlMethods };
  const users = await probe('/wp-json/wp/v2/users');
  out.users_public = { status: users.status, count: Array.isArray(users.json) ? users.json.length : 0 };
  const au = await probe('/?author=1');
  out.author_enum = { status: au.status, reveals_slug: /\/author\//.test(au.headers.get('location') || '') };
  for (const p of ['/readme.html', '/license.txt', '/wp-content/debug.log', '/.env', '/wp-config.php.bak', '/wp-content/uploads/', '/wp-includes/', '/wp-login.php', '/wp-admin/install.php']) {
    const r = await probe(p);
    out[p] = { status: r.status, listing: /<title>Index of/i.test(r.text || '') };
  }
  const ev = await probe('/wp-json/tj/v1/events-live');
  if (ev.ok && ev.json) {
    const s = JSON.stringify(ev.json);
    out.events_live = { status: ev.status, feedback_named: (s.match(/"name":"[^"]+"/g) || []).length, voice: (s.match(/"voice":"http/g) || []).length };
  } else out.events_live = { status: ev.status };
  // گواهی TLS
  out.tls = await new Promise((ok) => {
    const s = connect({ host: new URL(B).hostname, port: 443, servername: new URL(B).hostname, timeout: 15000 }, () => {
      const c = s.getPeerCertificate(); ok({ valid_to: c.valid_to, days_left: Math.round((new Date(c.valid_to) - Date.now()) / 864e5), issuer: c.issuer?.O, proto: s.getProtocol() }); s.end();
    });
    s.on('error', (e) => ok({ error: String(e) })); s.on('timeout', () => { ok({ error: 'timeout' }); s.destroy(); });
  });
  // نسخه‌ها و آسیب‌پذیری‌های شناخته‌شده (wpvulnerability.net)
  const feed = await probe('/feed/');
  out.wp = feed.text?.match(/wordpress\.org\/\?v=([\d.]+)/)?.[1] || null;
  const vulns = [];
  const vcheck = async (kind, slug, ver) => {
    try {
      const j = await (await fetch(`https://www.wpvulnerability.net/${kind}/${slug}/${kind === 'core' ? '' : ''}`)).json();
      for (const v of j?.data?.vulnerability || []) {
        const op = v.operator || {};
        const max = op.max_version, cmp = (a, b) => a.split('.').map(Number).reduce((r, x, i) => r || x - (Number(b.split('.')[i]) || 0), 0);
        const hit = !max || (op.max_operator === 'lt' ? cmp(ver, max) < 0 : cmp(ver, max) <= 0);
        if (hit && (!op.min_version || cmp(ver, op.min_version) >= 0)) vulns.push({ kind, slug, ver, name: v.name?.slice(0, 120), fixed_in: max || 'هنوز رفع نشده', severity: v.impact?.cvss?.severity || v.impact?.cwe?.[0]?.name || '' });
      }
    } catch {}
  };
  if (out.wp) await vcheck('core', out.wp, out.wp);
  const roles = {};
  if (wp.hasAuth) {
    const pl = await wp.get('/wp-json/wp/v2/plugins?context=edit&_fields=plugin,name,version,status');
    out.plugins = pl.ok ? pl.json.map((p) => ({ slug: p.plugin.split('/')[0], name: p.name.replace(/<[^>]+>/g, ''), version: p.version, status: p.status })) : `HTTP ${pl.status}`;
    if (Array.isArray(out.plugins)) for (const p of out.plugins) await vcheck('plugin', p.slug, p.version);
    const th = await wp.get('/wp-json/wp/v2/themes?_fields=stylesheet,version,status');
    if (th.ok) { out.themes = th.json; for (const t of th.json) await vcheck('theme', t.stylesheet, t.version.raw || t.version); }
    try {
      const us = await wp.all('/wp-json/wp/v2/users?context=edit&_fields=roles');
      for (const u of us) for (const r of u.roles || []) roles[r] = (roles[r] || 0) + 1;
    } catch (e) { roles.error = e.message; }
  }
  out.roles = roles;
  out.vulns = vulns;
  res.security = out;
  const yes = (b) => (b ? 'بله' : 'نه');
  md.push('## امنیت\n',
    `- وردپرس ${out.wp || 'نامعلوم (نسخه در فید پنهان است)'} · TLS ${out.tls.proto || ''} تا ${out.tls.days_left ?? '?'} روز دیگر (${out.tls.issuer || out.tls.error || ''})`,
    `- هدرها: ${H.slice(0, 6).map((h) => `${h} ${out.headers[h] ? '✓' : '✗'}`).join(' · ')}`,
    `- سرور: ${out.headers.server || '-'} · x-powered-by: ${out.headers['x-powered-by'] || '-'} · فشرده‌سازی: ${out.headers['content-encoding'] || 'ندارد'} · cache-control: ${out.headers['cache-control'] || '-'}`,
    `- کش صفحه: ${Object.entries(out.page_cache).map(([u, c]) => `${u} ${c.wpo ? 'WPO ✓' : 'WPO ✗'} ${c.ms}ms`).join(' · ')}`,
    `- کش فایل ثابت: فونت ${out.static.font ? out.static.font.cc : '-'} · تصویر ${out.static.image ? out.static.image.cc : '-'}`,
    `- xmlrpc: GET ${out.xmlrpc.get} · POST ${xmlMethods ? `${xmlMethods.status}، ${xmlMethods.count} متد، pingback ${yes(xmlMethods.pingback)}، multicall ${yes(xmlMethods.multicall)}` : '-'}`,
    `- فهرست کاربران عمومی /wp/v2/users: HTTP ${out.users_public.status}، ${out.users_public.count} کاربر دیده می‌شود · ‎?author=1 نامک را نشان می‌دهد: ${yes(out.author_enum.reveals_slug)}`,
    `- events-live: HTTP ${out.events_live.status}${out.events_live.feedback_named != null ? `، ${out.events_live.feedback_named} بازخورد با نام، ${out.events_live.voice} صدا` : ''}`,
    `- مسیرهای حساس: ${['/readme.html', '/license.txt', '/wp-content/debug.log', '/.env', '/wp-config.php.bak', '/wp-content/uploads/', '/wp-includes/', '/wp-login.php', '/wp-admin/install.php'].map((p) => `${p} ${out[p].status}${out[p].listing ? ' (فهرست پوشه باز!)' : ''}`).join(' · ')}`,
    `- نقش کاربران (فقط شمارش): ${Object.entries(roles).map(([k, v]) => `${k} ${v}`).join('، ') || 'خوانده نشد'}`,
    `- افزونه‌ها: ${Array.isArray(out.plugins) ? out.plugins.map((p) => `${p.name} ${p.version}${p.status === 'active' ? '' : ' (غیرفعال)'}`).join('، ') : out.plugins || 'بی رمز'}`,
    `- آسیب‌پذیری شناخته‌شده برای نسخهٔ نصب‌شده: ${vulns.length ? '' : 'هیچ'}`, ...vulns.map((v) => `  - ${v.kind} ${v.slug} ${v.ver}: ${v.name} (رفع در ${v.fixed_in}) ${v.severity}`), '');
}

// ---------- لید ----------
const LEAD_PAGES = [['/get-therapy/', 7], ['/persian-therapy/', 5], ['/persian-therapy/en/', 9], ['/contact-us/', 10], ['/enterprise/', 3], ['/school/', 6], ['/school/associations/', 11]];
async function leads() {
  const rows = [];
  for (const [u, fid] of LEAD_PAGES) {
    const r = await wp.get(u, { authed: false });
    const h = r.text || '';
    const forms = [...new Set([...h.matchAll(/data-form_id="(\d+)"/g)].map((m) => m[1]))];
    const starts = [...new Set([...h.matchAll(/t\.me\/tajrobehlife_bot(?:\?start=([\w-]+))?/g)].map((m) => m[1] || '(بی کد)'))];
    rows.push({ url: u, status: r.status, ms: r.ms, expect: fid, forms, has: forms.includes(String(fid)), nonce: new RegExp(`_fluentform_${fid}_fluentformnonce`).test(h),
      turnstile: /turnstile|recaptcha|hcaptcha/i.test(h), honeypot: /ff_hp|item__fluent_hp|fluent_hp/i.test(h),
      starts, porsline: (h.match(/porsline/gi) || []).length, wa: (h.match(/wa\.me\//g) || []).length, gform: (h.match(/docs\.google\.com\/forms|forms\.gle/g) || []).length });
  }
  res.leads = { pages: rows };
  md.push('## مسیرهای لید (صفحه‌های زنده)\n', '| صفحه | HTTP | فرم مورد انتظار | فرم‌های صفحه | nonce | ضداسپم | کدهای start بات | بیرون از اکوسیستم |', '|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.url} | ${r.status} (${r.ms}ms) | ${r.expect} ${r.has ? '✓' : '✗'} | ${r.forms.join('، ') || '-'} | ${r.nonce ? '✓' : '✗'} | ${r.turnstile ? 'کپچا' : r.honeypot ? 'هانی‌پات' : 'ندارد'} | ${r.starts.join('، ') || '-'} | ${[r.porsline && `پرسلاین ${r.porsline}`, r.wa && `واتساپ ${r.wa}`, r.gform && `فرم گوگل ${r.gform}`].filter(Boolean).join('، ') || '-'} |`), '');
  if (process.env.LEAD_SUBMIT === '1') {
    // LEAD_FORMS: «7» یا «7,5,9» یا «all» (همهٔ فرم‌های جدول بالا). هانی‌پات فلوئنت هم همین‌جا سنجیده می‌شود.
    const want = (process.env.LEAD_FORMS || '7').split(',').map((x) => x.trim());
    res.leads.submits = [];
    for (const [u, fid] of LEAD_PAGES) if (want.includes('all') || want.includes(String(fid))) await leadSubmit(u, fid);
  }
  else md.push('ثبت آزمایشی فرم انجام نشد (LEAD_SUBMIT خاموش).\n');
}

// ثبت آزمایشی فرم ۷ با دادهٔ TEST: بات نام‌هایی را که با «تست» شروع می‌شوند و شمارهٔ 09123456789 را نادیده می‌گیرد (bot/Code.gs)،
// پس ردیفی در هاب ساخته نمی‌شود؛ فقط یک خط «فرم تستی نادیده گرفته شد» در تب خطاها. ورودی Fluent بعد از تست پاک می‌شود.
async function leadSubmit(pageUrl, fid) {
  const tag = `TEST-${process.env.GITHUB_RUN_ID || Date.now()}`;
  const out0 = {};
  const page = await wp.get(pageUrl, { authed: false });
  const h = page.text || '';
  const fm = h.match(new RegExp(`<form[^>]*data-form_id="${fid}"[\\s\\S]*?<\\/form>`));
  if (!fm) { md.push(`ثبت آزمایشی: فرم ${fid} در ${pageUrl} پیدا نشد.\n`); return; }
  const f = fm[0];
  const data = new URLSearchParams();
  const seen = new Set();
  for (const m of f.matchAll(/<(input|select|textarea)\b([^>]*)>([\s\S]*?<\/select>)?/g)) {
    const attrs = m[2];
    const name = attrs.match(/\bname="([^"]+)"/)?.[1];
    if (!name) continue;
    const type = (attrs.match(/\btype="([^"]+)"/)?.[1] || m[1]).toLowerCase();
    const val = attrs.match(/\bvalue="([^"]*)"/)?.[1] ?? '';
    if (type === 'hidden') { data.append(name, val); continue; }
    if (['radio', 'checkbox'].includes(type)) { if (!seen.has(name)) { data.append(name, val); seen.add(name); } continue; }
    if (m[1] === 'select') { const o = (m[3] || '').match(/<option[^>]*value="([^"]+)"/); data.append(name, o ? o[1] : ''); continue; }
    if (seen.has(name)) continue;
    seen.add(name);
    // هانی‌پات فلوئنت (…__fluent_sf و مانند آن): کاربر واقعی آن را نمی‌بیند و خالی می‌فرستد
    if (/__fluent_sf|fluent_hp|_checkme_|honeypot/i.test(name)) { data.append(name, ''); continue; }
    if (/phone|mobile|tel|شماره/i.test(name) || type === 'tel') data.append(name, process.env.LEAD_TEST_PHONE || '09123456789');
    else if (type === 'email' || /email/i.test(name)) data.append(name, 'test+audit@example.invalid');
    else if (/name|نام/i.test(name)) data.append(name, 'تست TEST ممیزی');
    else if (type === 'number') data.append(name, '30');
    else data.append(name, `${tag} ثبت آزمایشی ممیزی، لطفاً نادیده بگیرید`);
  }
  // فیلدها و گزینه‌های مجاز از تعریف خود فرم (REST فلوئنت، با claude-ops): فیلدهایی که ویجت صفحه با جاوااسکریپت می‌سازد در HTML نیستند
  if (wp.hasAuth) {
    const def = await wp.get(`/wp-json/fluentform/v1/forms/${fid}`);
    let fields = [];
    try { const ff = def.json?.form_fields ?? def.json?.data?.form_fields; fields = (typeof ff === 'string' ? JSON.parse(ff) : ff)?.fields || []; } catch {}
    out0.def = def.status;
    const walk = (arr) => { for (const x of arr || []) { if (x.columns) { for (const c of x.columns) walk(c.fields); continue; } leadFill(x, data, tag); } };
    walk(fields);
  }
  if (![...data.keys()].some((k) => /name/i.test(k))) data.set('names', 'تست TEST ممیزی');
  out0.fields0 = [...new Set([...data.keys()])].map((k) => k.replace(/\[.*$/, '')).join(',');
  const fill = (k) => /phone|mobile|tel/i.test(k) ? (process.env.LEAD_TEST_PHONE || '09123456789') : /mail/i.test(k) ? 'test+audit@example.invalid' : /name/i.test(k) ? 'تست TEST ممیزی' : `${tag} ثبت آزمایشی ممیزی`;
  const send = async () => {
    const t0 = Date.now();
    const r = await fetch(B + '/wp-admin/admin-ajax.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: B + pageUrl },
      body: new URLSearchParams({ action: 'fluentform_submit', form_id: String(fid), data: data.toString() }) });
    const txt = await r.text();
    let j = null; try { j = JSON.parse(txt); } catch {}
    return { r, txt, j, ms: Date.now() - t0 };
  };
  // فیلدهایی که ویجت صفحه با جاوااسکریپت می‌سازد در HTML نیستند؛ اگر سرور الزامی خواند، با دادهٔ TEST پر و یک بار دوباره فرستاده می‌شود
  let a = await send();
  if (a.r.status === 423 && a.j?.errors) {
    for (const k of Object.keys(a.j.errors)) data.set(k, fill(k));
    if (!data.has('note')) data.set('note', `${tag} ثبت آزمایشی ممیزی`);
    else data.set('note', `${tag} ثبت آزمایشی ممیزی`);
    a = await send();
  }
  const { r, txt, j, ms } = a;
  const okSubmit = r.ok && j && (j.success === true || j.data?.result || j.data?.insert_id);
  const errs = j?.errors ? Object.entries(j.errors).map(([k, v]) => `${k}: ${Object.values(v || {}).join(' ')}`).join(' | ') : txt.slice(0, 160);
  out0.fields = [...new Set([...data.keys()])].map((k) => k.replace(/\[.*$/, '')).join(',');
  const out = { ...out0, status: r.status, ms, ok: !!okSubmit, msg: okSubmit ? '' : errs };
  // پاک کردن ورودی آزمایشی
  if (okSubmit && wp.hasAuth) {
    const list = await wp.get(`/wp-json/fluentform/v1/submissions?form_id=${fid}&search=${encodeURIComponent(tag)}&per_page=5`);
    const items = list.json?.submissions?.data || list.json?.data || [];
    let ids = items.filter((x) => JSON.stringify(x).includes(tag)).map((x) => x.id);
    if (!ids.length) {
      const l2 = await wp.get(`/wp-json/fluentform/v1/submissions?form_id=${fid}&per_page=5&sort_type=DESC`);
      const it2 = l2.json?.submissions?.data || l2.json?.data || [];
      ids = it2.filter((x) => JSON.stringify(x).includes('تست TEST ممیزی') && Date.now() - new Date((x.created_at || '').replace(' ', 'T') + 'Z') < 15 * 60000).map((x) => x.id);
      out.list_status = l2.status;
    }
    out.found = ids;
    for (const id of ids) {
      const d = await wp.del(`/wp-json/fluentform/v1/submissions/${id}`);
      out.deleted = (out.deleted || []).concat({ id, status: d.status });
    }
    if (!ids.length) out.cleanup = `ورودی آزمایشی پیدا نشد (HTTP ${list.status}). Cowork: ورودی‌های فرم ۷ با برچسب ${tag} را پاک کند.`;
  } else if (okSubmit) out.cleanup = `بی رمز پاک نشد. Cowork: ورودی فرم ۷ با برچسب ${tag} را پاک کند.`;
  out.form = fid; out.honeypot = /fluent_hp|_fluent_checkme_|item__fluent/i.test(f); res.leads.submits.push(out);
  md.push(`فیلدهای فرستاده‌شده: ${out.fields || "-"} (تعریف فرم از REST: ${out.def ?? "-"})\n`);
  md.push(`**ثبت آزمایشی فرم ${fid} در ${pageUrl} (${tag}):** HTTP ${out.status} در ${faDigits((ms / 1000).toFixed(1))} ثانیه · ${out.ok ? 'پذیرفته شد' : `رد شد: ${out.msg}`}` +
    `${out.deleted ? ` · پاک‌سازی: ${out.deleted.map((d) => `${d.id} → ${d.status}`).join('، ')}` : ''}${out.cleanup ? ` · ${out.cleanup}` : ''}\n`);
}

// پر کردن یک فیلد از تعریف فلوئنت با دادهٔ TEST؛ برای انتخابی‌ها اولین گزینهٔ مجاز
function leadFill(x, data, tag) {
  const el = x.element || '', name = x.attributes?.name;
  if (!name || ['input_hidden', 'custom_html', 'section_break', 'container', 'recaptcha', 'hcaptcha', 'turnstile'].includes(el)) return;
  const opts = (x.settings?.advanced_options || []).map((o) => o.value).filter((v) => v !== '' && v != null);
  const optsObj = x.options ? Object.keys(x.options) : [];
  const first = opts[0] ?? optsObj[0];
  const set = (k, v) => { if (!data.has(k) || data.get(k) === '' || /ثبت آزمایشی/.test(data.get(k))) data.set(k, v); };
  if (el === 'input_name') { for (const sub of Object.keys(x.fields || {})) if (x.fields[sub]?.settings?.visible !== false) set(`${name}[${sub}]`, 'تست TEST ممیزی'); return; }
  if (el === 'phone' || /phone|mobile|tel|whatsapp/i.test(name)) return set(name, process.env.LEAD_TEST_PHONE || '09123456789');
  if (el === 'input_email') return set(name, 'test+audit@example.invalid');
  if (el === 'input_checkbox' || el === 'terms_and_condition' || el === 'gdpr_agreement') { if (first != null) { data.delete(name); data.append(`${name}[]`, first); } else set(name, 'on'); return; }
  if (['select', 'input_radio', 'select_country'].includes(el) || first != null) { if (first != null) data.set(name, first); return; }
  if (el === 'input_number') return set(name, '30');
  if (/name|نام/i.test(name)) return set(name, 'تست TEST ممیزی');
  set(name, `${tag} ثبت آزمایشی ممیزی، لطفاً نادیده بگیرید`);
}

// ---------- لینک‌های شکسته و ۴۰۴ ----------
async function links() {
  const sm = await wp.get('/sitemap_index.xml', { authed: false });
  const maps = [...(sm.text || '').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const pages = new Set();
  for (const m of maps) { const r = await wp.get(m, { authed: false }); for (const x of (r.text || '').matchAll(/<loc>([^<]+)<\/loc>/g)) pages.add(x[1]); }
  const targets = new Map(); // نشانی ← صفحه‌ای که لینک داده
  const bad = [];
  const list = [...pages].slice(0, Number(process.env.LINK_PAGES || 400));
  for (let i = 0; i < list.length; i += 4) {
    await Promise.all(list.slice(i, i + 4).map(async (u) => {
      const r = await wp.get(u, { authed: false, retries: 2 });
      if (r.status !== 200) { bad.push({ url: u.replace(B, ''), status: r.status, from: 'sitemap' }); return; }
      for (const m of (r.text || '').matchAll(/href="([^"#]+)"/g)) {
        let h = m[1].replace(/&amp;/g, '&');
        if (h.startsWith('/') && !h.startsWith('//')) h = B + h;
        if (!h.startsWith(B) || /\/wp-(admin|json|content|includes)|\/feed\/|\?|\.(css|js|png|jpe?g|webp|svg|woff2?)$/i.test(h)) continue;
        if (!targets.has(h)) targets.set(h, u);
      }
    }));
  }
  const tl = [...targets.keys()].filter((h) => !pages.has(h));
  for (let i = 0; i < tl.length; i += 4) {
    await Promise.all(tl.slice(i, i + 4).map(async (h) => {
      const r = await wp.get(h, { authed: false, retries: 1, timeout: 20000 });
      if (r.status >= 400 || r.status === 0) bad.push({ url: h.replace(B, ''), status: r.status, from: targets.get(h).replace(B, '') });
    }));
  }
  res.links = { sitemap: pages.size, checked: list.length + tl.length, bad };
  md.push('## لینک‌های شکسته و ۴۰۴\n', `${faDigits(pages.size)} نشانی در نقشهٔ سایت · ${faDigits(list.length + tl.length)} نشانی سنجیده شد · ${faDigits(bad.length)} خراب\n`,
    ...bad.slice(0, 60).map((b) => `- ${decodeURI(b.url)} → ${b.status} (لینک از ${decodeURI(b.from)})`), '');
}

// ---------- اجرا ----------
const fns = { speed, security, leads, links };
let broken = 0;
for (const p of parts) {
  try { await fns[p](); } catch (e) { broken++; fail(`${p}: ${e.message}`); md.push(`## ${p}\n\n❌ اجرا نشد: ${e.message}\n`); }
}
writeFileSync(join(OUT, 'audit.json'), J(res));
const text = `# اندازه‌گیری زندهٔ ${B}\n\n${new Date().toISOString()}\n\n${md.join('\n')}`;
writeFileSync(join(OUT, 'audit.md'), text);
summary(text);
log(text);
process.exit(broken ? 1 : 0);
