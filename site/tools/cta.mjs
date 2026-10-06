// رجیستری دکمه‌ها و درهای ورودی (درگاه‌های ورودی، بند ۲؛ ۱۴ مهر ۱۴۰۵). به سایت وصل نمی‌شود؛ روی آینهٔ site/ کار می‌کند.
// site/cta-registry.json منبع یکتای کدهای start بات، شناسه‌های data-cta، فرم‌ها و پارامترهای /get-therapy/ است.
//   node site/tools/cta.mjs check     ← هر کد start، data-cta، فرم یا پارامتر ثبت‌نشده روی سایت = قرمز (site-check)
//   node site/tools/cta.mjs scan      ← فهرست موجودی (کد، شمار، صفحه‌ها)
//   node site/tools/cta.mjs init      ← رجیستری اولیه از روی آینه (فقط یک بار؛ بعد دستی نگه‌داری می‌شود)
//   node site/tools/cta.mjs selftest
// قاعدهٔ نام‌گذاری کد تازه: <خط>-<جا>[-<جزء>]، حروف کوچک لاتین و رقم و «-»، حداکثر ۴۰ نویسه.
//   خط‌ها: pz پذیرش · sch مدرسه · psy روان‌پزشکی · org سازمانی · rm رودمپ · cmp کمپین · co همکاری
// کدهای قدیمی در «aliases» می‌مانند و همچنان کار می‌کنند؛ کد تازه (code) بعد از پشتیبانی بات در لینک‌ها جای آن‌ها را می‌گیرد.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LINES = { pz: 'پذیرش', sch: 'مدرسه', psy: 'روان‌پزشکی', org: 'سازمانی', rm: 'رودمپ', cmp: 'کمپین', co: 'همکاری' };
export const NAME_RX = /^(pz|sch|psy|org|rm|cmp|co)-[a-z0-9]+(-[a-z0-9]+)*$/;
const START_RX = /t\.me\/tajrobehlife_bot\?start=([A-Za-z0-9_\-]*)/g;
const FORM_RX = /\[fluentform\s+id=\\?["']?(\d+)/g;
const GT_RX = /\/get-therapy\/\?([^"'\s<>#\\]+)/g;
const CTA_RX = /data-cta=\\?["']([^"'\\]+)/g;

/** کد قدیمی ← {code تازه، خط، برچسب}؛ برای init و پیشنهاد کد تازه */
export function canon(old) {
  const k = (s) => s.toLowerCase().replace(/[_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  let m;
  if ((m = /^pt_(.+)$/.exec(old))) return { code: 'pz-abroad-' + k(m[1]), line: 'pz', label: 'خارج از ایران › ' + m[1] };
  if ((m = /^inp-(.+)$/.exec(old))) return { code: 'pz-inp-' + k(m[1]), line: 'pz', label: 'حضوری › ' + m[1] };
  if ((m = /^gt-(.+)$/.exec(old))) return { code: 'pz-gt-' + k(m[1]), line: 'pz', label: 'شروع تراپی › ' + m[1] };
  if ((m = /^th_(.+)$/.exec(old))) return { code: 'pz-svc-' + k(m[1]), line: 'pz', label: 'خدمات › ' + m[1] };
  if ((m = /^home_(.+)$/.exec(old))) return { code: 'pz-home-' + k(m[1]), line: 'pz', label: 'هوم › ' + m[1] };
  if ((m = /^(?:rm[_-]|roadmap_)(.+)$/.exec(old))) return { code: 'rm-' + k(m[1]), line: 'rm', label: 'رودمپ › ' + m[1] };
  if ((m = /^sch_(.+)$/.exec(old))) return { code: 'sch-' + k(m[1]), line: 'sch', label: 'مدرسه › ' + m[1] };
  if ((m = /^ebi-(.+)$/.exec(old))) return { code: 'cmp-ebi-' + k(m[1]), line: 'cmp', label: 'کمپین ابی › ' + m[1] };
  const fixed = {
    comm: ['sch-comm', 'sch', 'مدرسه › کامیونیتی'], community: ['sch-comm', 'sch', 'مدرسه › کامیونیتی'], join: ['sch-join', 'sch', 'مدرسه › عضویت'],
    sch_join: ['sch-join', 'sch', 'مدرسه › عضویت'], edu: ['sch-edu', 'sch', 'مدرسه › اتصال'], ev: ['sch-ev', 'sch', 'رویداد › لینک مستقیم'],
    partner: ['co-partner', 'co', 'همکاری › پارتنر'], write: ['co-write', 'co', 'همکاری › نویسندگی مجله'], apply: ['co-apply', 'co', 'همکاری › اپلای درمانگر'],
    off: ['co-off', 'co', 'درمانگر › مرخصی'], voice: ['co-voice', 'co', 'درمانگر › ویس معرفی'], psybook: ['psy-book', 'psy', 'روان‌پزشکی › نوبت'],
    psycard: ['psy-card', 'psy', 'روان‌پزشکی › کارت'], vxc: ['pz-vxc', 'pz', 'پذیرش › مچ‌میکینگ صوتی'], hub_ther: ['co-hub-ther', 'co', 'هاب درمانگران'],
    hdr_menu: ['pz-hdr-menu', 'pz', 'هدر › منو'], page: ['co-page', 'co', 'درمانگر › صفحهٔ من'], uni: ['sch-uni', 'sch', 'دانشجو › دانشگاه']
  };
  if (fixed[old]) return { code: fixed[old][0], line: fixed[old][1], label: fixed[old][2] };
  return { code: 'pz-' + k(old), line: 'pz', label: old, review: true };
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) walk(p, out); else if (/\.(html|php|js|css|txt)$/.test(f.name)) out.push(p);
  }
  return out;
}
/** files: [{path, body}] */
export function scan(files) {
  const codes = {}, forms = {}, gt = {}, ctas = {};
  const add = (o, k, f) => { (o[k] = o[k] || { count: 0, files: [] }).count++; if (!o[k].files.includes(f)) o[k].files.push(f); };
  for (const { path, body } of files) {
    for (const m of body.matchAll(START_RX)) add(codes, m[1], path);
    for (const m of body.matchAll(FORM_RX)) add(forms, m[1], path);
    for (const m of body.matchAll(GT_RX)) for (const kv of m[1].replace(/&amp;|&#038;/g, '&').split('&')) { const p = kv.split('=')[0]; if (p) add(gt, p, path); }
    for (const m of body.matchAll(CTA_RX)) add(ctas, m[1], path);
  }
  return { codes, forms, gt, ctas };
}
export function siteFiles(root = ROOT) {
  return ['site/pages', 'site/templates', 'site/template-parts', 'site/snippets'].flatMap((d) => walk(join(root, d)))
    .filter((p) => !p.endsWith('index.json')).map((p) => ({ path: relative(root, p), body: readFileSync(p, 'utf8') }));
}
/** کلیدهای $map و $skip در 501143 */
export function formMap(php) {
  const map = {}, skip = [];
  const mm = /\$map\s*=\s*array\(([\s\S]*?)\n\s*\);/.exec(php || '');
  if (mm) for (const m of mm[1].matchAll(/(\d+)\s*=>\s*array\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) map[m[1]] = { dept: m[2], label: m[3] };
  const sk = /\$skip\s*=\s*array\(([^)]*)\)/.exec(php || '');
  if (sk) for (const m of sk[1].matchAll(/\d+/g)) skip.push(m[0]);
  return { map, skip };
}

export function registryProblems(reg, sc, php) {
  const bad = [];
  const known = new Map();
  for (const e of reg.codes || []) {
    if (!NAME_RX.test(e.code)) bad.push(`رجیستری: کد «${e.code}» قاعدهٔ نام‌گذاری ندارد (<خط>-<جا>، مثل pz-home-hero)`);
    if (!LINES[e.line]) bad.push(`رجیستری: خط «${e.line}» برای ${e.code} نامعتبر است`);
    for (const c of [e.code, ...(e.aliases || [])]) { if (known.has(c) && known.get(c) !== e.code) bad.push(`رجیستری: «${c}» در دو ردیف آمده`); known.set(c, e.code); }
  }
  const fam = (reg.families || []).map((f) => f.prefix);
  const builders = new Set((reg.builders || []).map((b) => b.file));
  for (const [c, v] of Object.entries(sc.codes)) {
    if (c === '') { for (const f of v.files) if (!builders.has(f)) bad.push(`لینک بات با کد ساختنی در اسکریپت (${f}) در «builders» رجیستری نیست`); continue; }
    if (known.has(c) || fam.some((p) => c.startsWith(p))) continue;
    bad.push(`کد start ثبت‌نشده: «${c}» (${v.files.slice(0, 3).join('، ')}). اول در site/cta-registry.json ثبت کن`);
  }
  const fm = formMap(php);
  const regForms = new Set(Object.keys(reg.forms || {}));
  for (const [id, v] of Object.entries(sc.forms)) {
    if (!regForms.has(id)) bad.push(`فرم ${id} در رجیستری نیست (${v.files[0]})`);
    if (php && !fm.map[id] && !fm.skip.includes(id)) bad.push(`فرم ${id} در $map اسنیپت 501143 نیست؛ بخش و صاحب از روی عنوان حدس زده می‌شود`);
  }
  const gtOk = new Set([...(reg.getTherapy?.params || []), ...(reg.getTherapy?.legacy || []), ...(reg.getTherapy?.extra || [])]);
  for (const [p, v] of Object.entries(sc.gt)) if (!gtOk.has(p)) bad.push(`پارامتر ناشناختهٔ /get-therapy/: «${p}» (${v.files[0]})`);
  const ctaOk = new Set((reg.ctas || []).map((c) => c.id));
  for (const [c, v] of Object.entries(sc.ctas)) if (!ctaOk.has(c)) bad.push(`data-cta ثبت‌نشده: «${c}» (${v.files[0]})`);
  return bad;
}

/** bot/ctareg.gs: کد تازه ← کد قدیمی‌ای که بات می‌شناسد (اولین alias)، و برچسب هر کد (تازه و قدیمی) برای «کدهای start» */
export function genBot(reg) {
  const to = {}, label = {};
  for (const e of reg.codes || []) {
    const old = (e.aliases || [])[0] || e.code;
    if (e.code !== old) to[e.code] = old;
    for (const c of [e.code, ...(e.aliases || [])]) label[c] = e.label || '';
  }
  const fam = (reg.families || []).map((f) => [f.prefix, f.label || '']);
  const j = (o) => JSON.stringify(o, null, 0);
  return '/* تولید خودکار از site/cta-registry.json با «node site/tools/cta.mjs gen-bot». دستی ویرایش نکن؛ bot-check همگامی را می‌سنجد. */\n' +
    'var CTA_TO = ' + j(to) + ';\n' + 'var CTA_LABEL = ' + j(label) + ';\n' + 'var CTA_FAMILY = ' + j(fam) + ';\n';
}
export function ctaSelfTest() {
  const bad = [], t = (n, c) => { if (!c) bad.push(n); };
  t('نام‌گذاری', NAME_RX.test('pz-home-hero') && !NAME_RX.test('rm_campus') && !NAME_RX.test('xx-a'));
  t('نگاشت قدیمی', canon('pt_de').code === 'pz-abroad-de' && canon('rm_campus').code === 'rm-campus' && canon('rm-kanape').code === 'rm-kanape' && canon('web_EFT-1').code === 'pz-web-eft-1');
  const sc = scan([{ path: 'a.html', body: '<a href="https://t.me/tajrobehlife_bot?start=rm_campus">x</a><a href="https://t.me/tajrobehlife_bot?start=mg-12-t">y</a>[fluentform id="16"]<a href="/get-therapy/?need=anx&amp;tj_why=x">z</a><a data-cta="home.hero">' }]);
  t('اسکن', sc.codes.rm_campus.count === 1 && sc.forms['16'] && sc.gt.need && sc.gt.tj_why && sc.ctas['home.hero']);
  const reg = { codes: [{ code: 'rm-campus', line: 'rm', aliases: ['rm_campus'] }], families: [{ prefix: 'mg-' }], forms: { 16: {} }, getTherapy: { params: ['need', 'src'], legacy: ['tj_why'] }, ctas: [{ id: 'home.hero' }] };
  const php = "$skip = array(1);\n$map = array(\n  16 => array('مدرسه', 'x'),\n);";
  t('همه ثبت‌شده ← بی مشکل', registryProblems(reg, sc, php).length === 0);
  t('کد ثبت‌نشده ← قرمز', registryProblems({ ...reg, codes: [] }, sc, php).some((x) => /rm_campus/.test(x)));
  t('فرم بی $map ← قرمز', registryProblems(reg, sc, '$map = array(\n);').some((x) => /501143/.test(x)));
  t('cta ثبت‌نشده ← قرمز', registryProblems({ ...reg, ctas: [] }, sc, php).some((x) => /home\.hero/.test(x)));
  return bad;
}

if (process.argv[1] && process.argv[1].endsWith('cta.mjs')) {
  const mode = process.argv[2] || 'check';
  if (mode === 'selftest') { const b = ctaSelfTest(); console.log(b.length ? '❌ ' + b.join('، ') : '✅ رجیستری دکمه‌ها: خودآزمایی سبز'); process.exit(b.length ? 1 : 0); }
  if (mode === 'gen-bot') {
    const reg = JSON.parse(readFileSync(join(ROOT, 'site/cta-registry.json'), 'utf8'));
    const out = genBot(reg), P = join(ROOT, 'bot/ctareg.gs');
    if (process.argv[3] === '--check') {
      const cur = existsSync(P) ? readFileSync(P, 'utf8') : '';
      if (cur !== out) { console.log('::error::bot/ctareg.gs با site/cta-registry.json همگام نیست؛ node site/tools/cta.mjs gen-bot را اجرا کن و کامیت کن'); process.exit(1); }
      console.log('bot/ctareg.gs همگام است.'); process.exit(0);
    }
    writeFileSync(P, out); console.log('bot/ctareg.gs ساخته شد.'); process.exit(0);
  }
  const sc = scan(siteFiles());
  if (mode === 'scan') { console.log(JSON.stringify({ codes: Object.fromEntries(Object.entries(sc.codes).map(([k, v]) => [k, v.count])), forms: Object.keys(sc.forms), gt: Object.fromEntries(Object.entries(sc.gt).map(([k, v]) => [k, v.count])), ctas: Object.keys(sc.ctas).length }, null, 1)); process.exit(0); }
  if (mode === 'init') {
    const P = join(ROOT, 'site/cta-registry.json');
    const reg = JSON.parse(readFileSync(P, 'utf8'));
    if ((reg.codes || []).length) { console.log('ردیف‌های کد از قبل هست؛ init فقط یک بار.'); process.exit(1); }
    const byNew = {};
    for (const [old, v] of Object.entries(sc.codes)) {
      if (!old || /-$|_$/.test(old)) continue;   /* پیشوند لینک ساختنی (mg-، tm-، c_) خانواده است */
      if (/^(web|pre|app|cp)_/.test(old) || /^ig_/.test(old)) continue;
      const c = canon(old), e = byNew[c.code] = byNew[c.code] || { code: c.code, line: c.line, label: c.label, aliases: [], pages: [], links: 0 };
      e.aliases.push(old); e.links += v.count; for (const f of v.files) if (!e.pages.includes(f)) e.pages.push(f);
      if (c.review) e.review = 'نام پیشنهادی؛ Cowork بازبینی کند';
    }
    reg.codes = Object.values(byNew).sort((a, b) => a.code.localeCompare(b.code));
    writeFileSync(P, JSON.stringify(reg, null, 2) + '\n');
    console.log(`رجیستری ساخته شد: ${reg.codes.length} ردیف از ${Object.keys(sc.codes).length} کد`);
    process.exit(0);
  }
  const reg = JSON.parse(readFileSync(join(ROOT, 'site/cta-registry.json'), 'utf8'));
  const php = existsSync(join(ROOT, 'site/snippets/501143.php')) ? readFileSync(join(ROOT, 'site/snippets/501143.php'), 'utf8') : '';
  const p = registryProblems(reg, sc, php);
  for (const x of p) console.log(`::error::${x}`);
  console.log(`رجیستری دکمه‌ها: ${(reg.codes || []).length} ردیف · ${Object.keys(sc.codes).length} کد روی سایت · مشکل: ${p.length}`);
  process.exit(p.length ? 1 : 0);
}
