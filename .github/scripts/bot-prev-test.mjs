// تست پشتوانهٔ برگشت دیپلوی (bot-prev.sh) بی گوگل؛ در bot-precheck.mjs اجرا می‌شود.
// ۱) پشتوانهٔ برگشت برچسب bot-live که عین کد زنده است؛ بی برچسب (فقط مخزن تازه، v170.14) پشتیبان کد زنده با اثر دقیق .live-reviewed
// ۲) برگشت همیشه .clasp.json پرشده از سکرت را دارد (باگ v170.9: شناسهٔ خالی پروژه در کد کامیت)
// ۳) گردش کار bot-deploy.yml واقعاً همین اسکریپت را صدا می‌زند
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SH = join(HERE, 'bot-prev.sh');
const WF = join(HERE, '..', 'workflows', 'bot-deploy.yml');

const run = (args, cwd, env = {}) => spawnSync('bash', [SH, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });

export function prevSelfTest() {
  const bad = [];
  const t = (name, ok, more = '') => { if (!ok) bad.push(name + (more ? ` (${String(more).trim().slice(0, 160)})` : '')); };
  const T = mkdtempSync(join(tmpdir(), 'botprev-'));
  try {
    const live = join(T, 'live'), bak = join(T, 'bak'), rev = join(T, 'rev');
    mkdirSync(live);
    for (const [f, s] of [['Code.gs', 'var a = 1;'], ['telegram.gs', 'var b = 2;'], ['version.gs', "var TG_CODE_VERSION = 'v0';"],
      ['appsscript.json', '{"timeZone":"Asia/Tehran"}'], ['app_page.html', '<p>x</p>']]) writeFileSync(join(live, f), s + '\n');
    const fp = run(['fp', live], T).stdout.trim();
    t('اثر انگشت ساخته می‌شود', /^[0-9a-f]{64}$/.test(fp), fp);
    // همان اثر با پایان خط ویندوز و بی خط آخر (هم‌ارز گام «بررسی کد زنده»)
    const live2 = join(T, 'live2'); mkdirSync(live2);
    for (const f of readdirSync(live)) writeFileSync(join(live2, f), readFileSync(join(live, f), 'utf8').replace(/\n$/, '').replace(/\n/g, '\r\n'));
    t('اثر انگشت به CRLF و خط آخر حساس نیست', run(['fp', live2], T).stdout.trim() === fp);

    // v170.14: راه یک‌بارهٔ مخزن تازه (بی برچسب) فقط با اثر دقیق bot/.live-reviewed
    const claspFake = join(T, 'clasp-fake.json'), claspOk = join(T, 'clasp-ok.json');
    writeFileSync(claspFake, JSON.stringify({ scriptId: 'SET_BY_CI_FROM_SECRET_SCRIPT_ID', rootDir: '.' }));
    writeFileSync(claspOk, JSON.stringify({ scriptId: 'fake-script-id-for-test', rootDir: '.' }));
    let r = run(['firstrun', live, bak, rev], T);
    t('firstrun بی فایل بازبینی ← توقف', r.status !== 0 && !existsSync(bak), r.stdout + r.stderr);
    writeFileSync(rev, '0'.repeat(64) + '\n# اثر دیگر\n');
    r = run(['firstrun', live, bak, rev], T);
    t('firstrun با اثر ناهمخوان ← توقف، بی پشتیبان', r.status !== 0 && !existsSync(bak), r.stdout + r.stderr);
    const liveBad = join(T, 'liveBad'); mkdirSync(liveBad); writeFileSync(join(liveBad, 'Code.gs'), 'var a = 1;\n');
    writeFileSync(rev, run(['fp', liveBad], T).stdout.trim() + '\n');
    r = run(['firstrun', liveBad, bak, rev], T);
    t('firstrun با کد زندهٔ ناقص ← توقف', r.status !== 0 && !existsSync(bak), r.stdout + r.stderr);
    writeFileSync(rev, '# توضیح\n' + fp + '\n');
    r = run(['prev-ref', '', live, bak, rev], T);
    t('prev-ref بی برچسب و اثر دقیق ← live و پشتیبان کامل', r.status === 0 && r.stdout.trim() === 'live' && run(['fp', bak], T).stdout.trim() === fp, r.stdout + r.stderr);
    const outL = join(T, 'outL');
    r = run(['rollback-src', 'live', outL, claspOk], T, { PREV_BACKUP: bak });
    t('برگشت live: کد پشتیبان با .clasp.json پرشده', r.status === 0 && readFileSync(join(outL, 'Code.gs'), 'utf8') === 'var a = 1;\n' &&
      JSON.parse(readFileSync(join(outL, '.clasp.json'), 'utf8')).scriptId === 'fake-script-id-for-test', r.stdout + r.stderr);
    r = run(['rollback-src', 'live', join(T, 'outL2'), claspFake], T, { PREV_BACKUP: bak });
    t('برگشت live با شناسهٔ پرنشده ← توقف', r.status !== 0, r.stdout + r.stderr);

    // برگشت از کامیت: .clasp.json کامیت شناسه ندارد (باگ v170.9) و باید جایگزین شود
    const repo = join(T, 'repo'); mkdirSync(join(repo, 'bot'), { recursive: true });
    const g = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' });
    g('init', '-q'); g('config', 'user.email', 't@example.com'); g('config', 'user.name', 't');
    writeFileSync(join(repo, 'bot', 'Code.gs'), 'var old = 1;\n');
    writeFileSync(join(repo, 'bot', '.clasp.json'), readFileSync(claspFake));
    g('add', '-A'); g('commit', '-qm', 'old');
    r = run(['rollback-src', 'HEAD', join(T, 'out1'), claspFake], repo);
    t('برگشت با شناسهٔ پرنشده ← توقف', r.status !== 0, r.stdout + r.stderr);
    const out2 = join(T, 'out2');
    r = run(['rollback-src', 'HEAD', out2, claspOk], repo);
    t('برگشت از کامیت: .clasp.json با شناسهٔ پروژه، نه نسخهٔ گیت',
      r.status === 0 && JSON.parse(readFileSync(join(out2, '.clasp.json'), 'utf8')).scriptId === 'fake-script-id-for-test' &&
      readFileSync(join(out2, 'Code.gs'), 'utf8') === 'var old = 1;\n', r.stdout + r.stderr);

    // گردش کار همین مسیرها را صدا می‌زند
    const wf = readFileSync(WF, 'utf8');
    const prev = wf.slice(wf.indexOf('id: prev'), wf.indexOf('DEPS=$(clasp list-deployments'));
    t('گام «وضعیت فعلی»: پشتوانه از prev-ref با پشتیبان و فایل بازبینی', /PREV_REF=\$\(cd "\$GITHUB_WORKSPACE" && bash \.github\/scripts\/bot-prev\.sh prev-ref "\$PREV_REF" \/tmp\/remote \/tmp\/live_backup bot\/\.live-reviewed\)/.test(prev));
    t('برگشت به live برچسب bot-live را جابه‌جا نمی‌کند', /if \[ "\$PREV_REF" != "live" \]; then\s+git tag -f bot-live "\$PREV_REF"/.test(wf));
    t('برچسب bot-live فقط بعد از پایش سبز', wf.indexOf('bot-monitor.mjs watch') > -1 && wf.indexOf('git tag -f bot-live HEAD') > wf.indexOf('bot-monitor.mjs watch'));
    t('PR معکوس فقط کد بات و دفترهایش را برمی‌گرداند (نه گردش کارها و نه کار سایت؛ v170.22.1)', /git diff --binary "\$BEFORE" HEAD -- bot CHANGELOG\.md docs\/bot > \/tmp\/rev\.patch/.test(wf));
    // prev-ref روی مخزن آزمایشی
    const pr = join(T, 'prrepo'); mkdirSync(join(pr, 'bot'), { recursive: true });
    const g3 = (...a) => execFileSync('git', a, { cwd: pr, encoding: 'utf8' });
    g3('init', '-q'); g3('config', 'user.email', 't@example.com'); g3('config', 'user.name', 't');
    for (const f of ['Code.gs', 'telegram.gs', 'version.gs', 'appsscript.json']) writeFileSync(join(pr, 'bot', f), readFileSync(join(live, f)));
    writeFileSync(join(pr, 'bot', 'README.md'), 'x\n'); writeFileSync(join(pr, 'bot', 'ci_key.gs'), 'var k=1;\n');
    g3('add', '-A'); g3('commit', '-qm', 'same'); const same = g3('rev-parse', 'HEAD').trim();
    writeFileSync(join(pr, 'bot', 'Code.gs'), 'var a = 2;\n'); g3('commit', '-qam', 'other'); const other = g3('rev-parse', 'HEAD').trim();
    const liveP = join(T, 'liveP'); mkdirSync(liveP);
    for (const f of ['Code.gs', 'telegram.gs', 'version.gs', 'appsscript.json']) writeFileSync(join(liveP, f), readFileSync(join(live, f)));
    r = run(['prev-ref', same, liveP], pr);
    t('prev-ref: برچسب عین کد زنده ← همان برچسب', r.status === 0 && r.stdout.trim() === same, r.stdout + r.stderr);
    r = run(['prev-ref', other, liveP], pr);
    t('prev-ref: برچسب ناهمخوان با کد زنده ← توقف', r.status !== 0 && !r.stdout.trim(), r.stdout + r.stderr);
    r = run(['prev-ref', '', liveP], pr);
    t('prev-ref: بی برچسب و بی فایل بازبینی ← توقف', r.status !== 0, r.stdout + r.stderr);
    r = run(['prev-ref', other, liveP, join(T, 'bakP'), rev], pr);
    t('prev-ref: برچسب ناهمخوان حتی با فایل بازبینی ← توقف', r.status !== 0 && !existsSync(join(T, 'bakP')), r.stdout + r.stderr);
    r = run(['prev-ref', same, join(T, 'nolive')], pr);
    t('prev-ref: کد زندهٔ کشیده‌نشده ← توقف', r.status !== 0, r.stdout + r.stderr);
  } catch (e) {
    bad.push('خطای اجرای تست: ' + e.message);
  } finally {
    rmSync(T, { recursive: true, force: true });
  }
  return bad;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bad = prevSelfTest();
  for (const b of bad) console.log('✗ ' + b);
  console.log(bad.length ? `${bad.length} مردود` : 'پشتوانهٔ برگشت: همه قبول');
  process.exit(bad.length ? 1 : 0);
}
