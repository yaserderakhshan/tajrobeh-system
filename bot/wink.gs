/**
 * v170.99 (E34، لین A): کار یک‌بارهٔ «چشمک توتی» برای لین C.
 * چهار تصویر توتی، هر کدام دو نسخه، فقط یک چشم در حالت چشمک؛ خروجی PNG در پوشهٔ درایو لین C.
 * شناسهٔ درایو در کد نمی‌آید (مخزن عمومی): ورودی‌ها با نام فایل و پوشهٔ خروجی با نام پوشه پیدا می‌شوند.
 * ورودی‌ها باید همه در یک پوشه باشند (همان پوشهٔ تصویرهای توتی). فایل خروجی موجود دوباره ساخته نمی‌شود.
 * اجرا: wkV17099Start از مسیر یک‌بارهٔ CI بعد از انتشار فقط تریگر یک‌بارهٔ wkRun را می‌گذارد؛ هرچه در وقت نماند با تریگر بعدی ادامه می‌یابد
 * و تریگر در پایان برداشته می‌شود. هزینه در دفتر Gemini (gemLedger_) با کار «چشمک توتی» ثبت می‌شود.
 */
var WK_MODEL = 'gemini-3-pro-image-preview';
var WK_OUT = 'laneC-gemini-img-1405-08';
var WK_SRC = [
  { n: 'IMG-040', t: 'Purchase donr tooti test.jpg' },
  { n: 'IMG-056', t: 'excited tooti.jpg' },
  { n: 'IMG-036', t: 'all done.jpg' },
  { n: 'welcome', t: 'welcome to platform test.jpg' }
];
var WK_VARIANTS = 2;
var WK_BUDGET_MS = 240000;
var WK_PROMPT = 'Edit this exact illustration of our own character (Tooti). Change ONLY one eye: the character\'s left eye (viewer\'s right) ' +
  'becomes closed in a wink, drawn as one gently curved happy line in the same black hand-drawn ink stroke. The other eye stays exactly the same. ' +
  'Keep everything else identical: pose, ink lines, colours, proportions, framing and canvas size. Plain pure white background, no shadow, no text, no new elements.';

function wkProp_(k, v) {
  if (TG_DRY) { if (v !== undefined) TG_MEM['wkp:' + k] = String(v); return TG_MEM['wkp:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function wkNow_() { return TG_DRY && TG_MEM['wk:now'] ? Number(TG_MEM['wk:now']()) : Date.now(); }

/* درایو. در آزمون همه از TG_MEM['wk:io'] */
function wkIo_() {
  if (TG_DRY) return TG_MEM['wk:io'];
  return {
    src: function (titles) {
      var it = DriveApp.getFilesByName(titles[0]);
      while (it.hasNext()) {
        var ps = it.next().getParents();
        while (ps.hasNext()) {
          var dir = ps.next(), got = {}, all = true;
          titles.forEach(function (t) { var f = dir.getFilesByName(t); if (f.hasNext()) got[t] = f.next(); else all = false; });
          if (all) return titles.map(function (t) { var b = got[t].getBlob(); return { mime: b.getContentType() || 'image/jpeg', b64: Utilities.base64Encode(b.getBytes()) }; });
        }
      }
      return null;
    },
    out: function (name) { var it = DriveApp.getFoldersByName(name); return it.hasNext() ? it.next() : null; },
    has: function (dir, name) { return dir.getFilesByName(name).hasNext(); },
    save: function (dir, name, img) { dir.createFile(Utilities.newBlob(Utilities.base64Decode(img.data), 'image/png', name)); }
  };
}
function wkPart_(body) {
  var out = null;
  (((body || {}).candidates) || []).forEach(function (c) {
    (((c || {}).content || {}).parts || []).forEach(function (p) { var d = p && (p.inlineData || p.inline_data); if (d && !out) out = d; });
  });
  return out;
}
/* PNG واقعی: اگر مدل JPEG یا WebP داد، تبدیل می‌شود */
function wkPng_(img) {
  if (TG_DRY || /png/i.test(String(img.mimeType || ''))) return img;
  var b = Utilities.newBlob(Utilities.base64Decode(img.data), img.mimeType || 'image/jpeg', 'x').getAs('image/png');
  return { mimeType: 'image/png', data: Utilities.base64Encode(b.getBytes()) };
}
function wkArm_(ms) {
  if (TG_DRY) { TG_MEM['wk:arm'] = ms; return; }
  wkDisarm_();
  ScriptApp.newTrigger('wkRun').timeBased().after(ms).create();
}
function wkDisarm_() {
  if (TG_DRY) { TG_MEM['wk:arm'] = 0; return; }
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'wkRun') ScriptApp.deleteTrigger(t); });
}

/** یک دور: تا WK_BUDGET_MS فایل می‌سازد. خروجی خلاصهٔ شمارشی؛ وضعیت در WK_STATE */
function wkRun() {
  var t0 = wkNow_(), st = {};
  try { st = JSON.parse(wkProp_('WK_STATE') || '{}') || {}; } catch (e) {}
  st.made = st.made || 0; st.skip = st.skip || 0; st.err = st.err || 0; st.cost = st.cost || 0; st.runs = (st.runs || 0) + 1;
  var io = wkIo_(), dir = io.out(WK_OUT), left = 0;
  if (!dir) { st.end = 'پوشهٔ خروجی پیدا نشد'; wkDisarm_(); wkProp_('WK_STATE', JSON.stringify(st)); return wkLine_(st); }
  var src = io.src(WK_SRC.map(function (s) { return s.t; }));
  if (!src) { st.end = 'ورودی‌ها در یک پوشه پیدا نشدند'; wkDisarm_(); wkProp_('WK_STATE', JSON.stringify(st)); return wkLine_(st); }
  gemTask_('چشمک توتی');
  try {
    for (var i = 0; i < WK_SRC.length; i++) {
      for (var v = 1; v <= WK_VARIANTS; v++) {
        var name = WK_SRC[i].n + '-wink-v' + v + '.png';
        if (io.has(dir, name)) continue;
        if (wkNow_() - t0 > WK_BUDGET_MS) { left++; continue; }
        var key = 'try:' + name; st[key] = (st[key] || 0) + 1;
        if (st[key] > 3) { if (st[key] === 4) st.err++; continue; }   /* سه بار نشد: رها */
        var res = gemFetch_('models/' + WK_MODEL + ':generateContent', {
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: src[i].mime, data: src[i].b64 } }, { text: WK_PROMPT }] }],
          generationConfig: { responseModalities: ['IMAGE'] }
        });
        var img = res.code === 200 ? wkPart_(res.body) : null;
        if (res.code === 200) st.cost += gemCost_(WK_MODEL, (res.body || {}).usageMetadata, img ? 1 : 0);
        if (!img) { left++; continue; }
        io.save(dir, name, wkPng_(img));
        st.made++;
      }
    }
  } finally { gemTask_(''); }
  st.cost = Math.round(st.cost * 10000) / 10000;
  if (left && st.runs < 12) wkArm_(60000);
  else { st.end = left ? 'نیمه‌کاره' : 'تمام'; wkDisarm_(); }
  wkProp_('WK_STATE', JSON.stringify(st));
  return wkLine_(st);
}
function wkLine_(st) {
  return 'چشمک توتی: ' + st.made + ' فایل ساخته شد · خطا ' + st.err + ' · هزینه حدود ' + st.cost + ' دلار' + (st.end ? ' · ' + st.end : ' · ادامه با تریگر');
}
/** یک‌بارهٔ خودکار بعد از انتشار v170.99: فقط تریگر یک‌باره را می‌گذارد تا کار طولانی زیر قفل CI اجرا نشود */
function wkV17099Start() { wkProp_('WK_STATE', ''); wkArm_(60000); return 'چشمک توتی: تریگر یک‌باره گذاشته شد'; }

try { TG_SUITES.push(['چشمک توتی یک‌باره v170.99', 'wkTests']); } catch (eSu) {}

function wkTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM };
  TG_DRY = true; TG_MEM = {};
  try {
    var files = {}, asked = [], clock = 0;
    function io(srcOk, outOk) {
      return {
        src: function (t) { asked = t; return srcOk ? t.map(function () { return { mime: 'image/jpeg', b64: 'SlBH' }; }) : null; },
        out: function (n) { return outOk && n === WK_OUT ? { dir: 1 } : null; },
        has: function (d, n) { return !!files[n]; },
        save: function (d, n, img) { files[n] = img.data; }
      };
    }
    var reqs = [];
    TG_MEM['gem:fakeFn'] = function (url, p) { reqs.push({ url: url, p: p }); clock += 1000;
      return { code: 200, body: { usageMetadata: { promptTokenCount: 1000 }, candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'UE5H' } }] } }] } }; };
    TG_MEM['wk:now'] = function () { return clock; };
    TG_MEM['wk:io'] = io(true, true);
    var st0 = wkV17099Start();
    ok('شروع فقط تریگر می‌گذارد و به Gemini نمی‌رود', TG_MEM['wk:arm'] === 60000 && reqs.length === 0 && /تریگر/.test(st0));
    var line = wkRun();
    var names = Object.keys(files).sort();
    ok('هشت فایل با نام درست، فقط یک بار برای هر فایل', names.length === 8 && names.indexOf('IMG-040-wink-v1.png') >= 0 && names.indexOf('welcome-wink-v2.png') >= 0 && reqs.length === 8, names.join());
    ok('مدل pro تصویری، تصویر ورودی همراه دستور و فقط خروجی تصویر', reqs.every(function (r) { return /gemini-3-pro-image-preview:generateContent/.test(r.url) && r.p.contents[0].parts[0].inlineData.data === 'SlBH' &&
      /ONLY one eye/.test(r.p.contents[0].parts[1].text) && r.p.generationConfig.responseModalities.join() === 'IMAGE'; }));
    ok('ورودی‌ها با نام فایل پیدا می‌شوند، نه شناسه', asked.length === 4 && asked.every(function (t) { return /\.jpg$/.test(t); }));
    ok('پایان: تریگر برداشته و خط گزارش با شمار و هزینه', TG_MEM['wk:arm'] === 0 && /۸|8/.test(line) && /هزینه/.test(line) && /تمام/.test(line), line);
    ok('هزینه در دفتر Gemini با کار «چشمک توتی»', (TG_MEM['gem:ledger'] || []).length === 8 && TG_MEM['gem:ledger'][0][1] === 'چشمک توتی');
    reqs = []; var again = wkRun();
    ok('اجرای دوباره فایل موجود را نمی‌سازد', reqs.length === 0 && /8 فایل ساخته شد/.test(again), again);

    /* وقت کم: نیمه می‌ماند و تریگر یک‌باره ادامه می‌دهد */
    files = {}; reqs = []; TG_MEM = { 'gem:fakeFn': TG_MEM['gem:fakeFn'], 'wk:now': TG_MEM['wk:now'], 'wk:io': io(true, true) };
    clock = 0; TG_MEM['gem:fakeFn'] = function (url, p) { reqs.push(1); clock += 100000;
      return { code: 200, body: { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'UE5H' } }] } }] } }; };
    var l1 = wkRun();
    ok('وقت تمام شد: تریگر یک‌باره برای ادامه', TG_MEM['wk:arm'] === 60000 && Object.keys(files).length === 3 && /ادامه/.test(l1), l1);
    clock = 0; wkRun(); clock = 0; wkRun();
    ok('دورهای بعد بقیه را می‌سازند و تریگر برداشته می‌شود', Object.keys(files).length === 8 && TG_MEM['wk:arm'] === 0);

    /* بی پوشه یا بی ورودی: هیچ درخواستی به Gemini نمی‌رود */
    reqs = []; TG_MEM = { 'gem:fakeFn': TG_MEM['gem:fakeFn'], 'wk:now': TG_MEM['wk:now'], 'wk:io': io(true, false) };
    var l2 = wkRun();
    ok('پوشهٔ خروجی نیست: بی درخواست و بی تریگر', reqs.length === 0 && TG_MEM['wk:arm'] === 0 && /پوشه/.test(l2));
    TG_MEM['wk:io'] = io(false, true); TG_MEM['wkp:WK_STATE'] = '';
    var l3 = wkRun();
    ok('ورودی‌ها نیستند: بی درخواست', reqs.length === 0 && /ورودی/.test(l3));

    /* مدل تصویر نداد: سه بار و بعد رها، بی حلقهٔ بی‌پایان */
    files = {}; TG_MEM = { 'wk:now': function () { return 0; }, 'wk:io': io(true, true), 'gem:fake': { code: 200, body: { candidates: [] } } };
    for (var k = 0; k < 5; k++) wkRun();
    var st = JSON.parse(TG_MEM['wkp:WK_STATE']);
    ok('بی تصویر: هر فایل حداکثر سه بار، بعد خطا و پایان', st.err === 8 && st['try:IMG-040-wink-v1.png'] >= 4 && TG_MEM['wk:arm'] === 0 && (TG_MEM['gem:urls'] || []).length === 24, JSON.stringify(st).slice(0, 120));
    ok('یک‌باره در فهرست CI', CI_ONCE_ALLOW.indexOf('wkV17099Start') >= 0 && CI_ONCE_AUTO.indexOf('wkV17099Start') >= 0);
    ok('در کد شناسهٔ درایو نیست', !/[A-Za-z0-9_-]{28,}/.test(WK_OUT + JSON.stringify(WK_SRC)));
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ چشمک توتی درست است'));
  return tgTestTally_(log, fail);
}
