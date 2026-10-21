/**
 * ماژول Gemini بات تجربه. کلید فقط از Script Properties خوانده می‌شود (GEMINI_API_KEY).
 * هیچ دادهٔ شناسایی‌پذیر مراجع بدون تأیید یاسر به این توابع داده نمی‌شود.
 *
 * v170.81 (D116، اعتبار ۳۰۰ دلاری تا حدود اوایل دی ۱۴۰۵):
 * - دفتر هزینه: هر درخواست generateContent یک ردیف در تب «Gemini · هزینه» هاب آمار (زمان، کار، مدل، HTTP،
 *   توکن‌ها، شمار تصویر، هزینهٔ برآوردی). هیچ متن درخواست، پاسخ یا کلیدی ثبت نمی‌شود.
 * - geminiCheck: مدل متنی و دو مدل تصویری را واقعاً امتحان می‌کند (تصویر برگشت یا نه). یک‌بارهٔ gemV17081Check
 *   بعد از انتشار سبز همین را اجرا می‌کند و خلاصه را در گزارش گردش کار می‌گذارد.
 * - gemWeekly: گزارش هفتگی با پیام خصوصی بات برای یاسر (یکشنبه ۹، از V1691_WEEKLY؛ بی تریگر تازه).
 * تنظیم‌ها از تب «تنظیمات تیم»: GEM_CREDIT_USD (۳۰۰)، GEM_CREDIT_END (2026-12-22)، GEM_SPENT_ADJ_USD (۰).
 */
var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/';
var GEM_LEDGER_TAB = 'Gemini · هزینه';
var GEM_LEDGER_HEAD = ['زمان', 'کار', 'مدل', 'HTTP', 'توکن ورودی', 'توکن خروجی', 'تصویر', 'هزینهٔ برآوردی (دلار)'];
/* کاری که الان Gemini را صدا می‌زند؛ هر نقطهٔ ورود پیش از فراخوانی پرش می‌کند */
var GEM_TASK = '';
/* قیمت برآوردی (دلار): هر میلیون توکن ورودی و خروجی، و هر تصویر خروجی. اولین الگوی جور برنده است. */
var GEM_PRICE = [
  { re: /flash.*image|image.*flash/, inM: 0.3, outM: 0, img: 0.039 },
  { re: /image/, inM: 2, outM: 0, img: 0.134 },
  { re: /flash-lite/, inM: 0.1, outM: 0.4, img: 0 },
  { re: /flash/, inM: 0.3, outM: 2.5, img: 0 },
  { re: /pro/, inM: 2, outM: 12, img: 0 }
];
/* از تب «تنظیمات تیم» (cfg.gs)؛ در سطح بالا تا کلیدها در تب دیده شوند */
var GEM_CREDIT_USD = Number(cfg_('GEM_CREDIT_USD', 0)) || 300;   /* کلید خالی ← ۳۰۰ */
var GEM_CREDIT_END = String(cfg_('GEM_CREDIT_END', '') || '2026-12-22');
var GEM_SPENT_ADJ_USD = Number(cfg_('GEM_SPENT_ADJ_USD', 0)) || 0;
var GEM_IMG_PREFER = { flash: ['gemini-3.1-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image'],
  pro: ['gemini-3-pro-image', 'gemini-3-pro-image-preview'] };

function gemKey_() {
  var k = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!k) throw new Error('GEMINI_API_KEY تنظیم نشده');
  return k;
}
function gemTask_(t) { GEM_TASK = String(t || ''); }

function gemFetch_(path, payload) {
  var res;
  /* خشک: یک پاسخ ساختگی، یا فهرستی که به ترتیب برمی‌گردد (آخری تکرار می‌شود) */
  var fk = TG_DRY ? TG_MEM['gem:fake'] : null;
  if (fk) res = JSON.parse(JSON.stringify(Array.isArray(fk) ? (fk.length > 1 ? fk.shift() : fk[0]) : fk));
  else {
    var opt = { method: payload ? 'post' : 'get', muteHttpExceptions: true,
      headers: { 'x-goog-api-key': gemKey_() }, contentType: 'application/json' };
    if (payload) opt.payload = JSON.stringify(payload);
    var r = UrlFetchApp.fetch(GEMINI_BASE + path, opt);
    var body = {}; try { body = JSON.parse(r.getContentText()); } catch (e) {}
    res = { code: r.getResponseCode(), body: body };
  }
  if (payload) { try { gemLedger_(path, res); } catch (eL) {} }
  return res;
}

/* ─────────────────────────── دفتر هزینه ─────────────────────────── */
function gemPrice_(model) {
  var m = String(model || '');
  for (var i = 0; i < GEM_PRICE.length; i++) if (GEM_PRICE[i].re.test(m)) return GEM_PRICE[i];
  return GEM_PRICE[GEM_PRICE.length - 1];
}
/* هزینهٔ برآوردی یک پاسخ. برای مدل تصویری خروجی همان تصویر حساب می‌شود (توکن تصویر دو بار شمرده نمی‌شود). */
function gemCost_(model, usage, nImg) {
  var p = gemPrice_(model), u = usage || {};
  var tin = Number(u.promptTokenCount || 0), tout = Number(u.candidatesTokenCount || 0) + Number(u.thoughtsTokenCount || 0);
  var c = tin * p.inM / 1e6 + (p.img ? 0 : tout * p.outM / 1e6) + Number(nImg || 0) * p.img;
  return Math.round(c * 1e6) / 1e6;
}
function gemImgCount_(body) {
  var n = 0;
  (((body || {}).candidates) || []).forEach(function (c) {
    (((c || {}).content || {}).parts || []).forEach(function (p) { if (p && (p.inlineData || p.inline_data)) n++; });
  });
  return n;
}
function gemLedger_(path, res) {
  var m = String(path).match(/models\/([^:]+):/), model = m ? m[1] : String(path);
  var u = (res.body || {}).usageMetadata || {}, nImg = gemImgCount_(res.body);
  var cost = res.code === 200 ? gemCost_(model, u, nImg) : 0;
  var row = [new Date(), GEM_TASK || 'سایر', model, res.code, Number(u.promptTokenCount || 0),
    Number(u.candidatesTokenCount || 0) + Number(u.thoughtsTokenCount || 0), nImg, cost];
  if (TG_DRY) { (TG_MEM['gem:ledger'] = TG_MEM['gem:ledger'] || []).push(row); return row; }
  gemLedgerTab_().appendRow(row);
  return row;
}
function gemLedgerTab_() {
  var ss = SpreadsheetApp.openById(cfg_('TG_STAT_SHEET_ID', ''));
  var sh = ss.getSheetByName(GEM_LEDGER_TAB);
  if (!sh) {
    sh = ss.insertSheet(GEM_LEDGER_TAB);
    sh.getRange(1, 1, 1, GEM_LEDGER_HEAD.length).setValues([GEM_LEDGER_HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.setRightToLeft(true);
  }
  return sh;
}
function gemLedgerRows_() {
  if (TG_DRY) return TG_MEM['gem:ledger'] || [];
  var sh = gemLedgerTab_(), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, GEM_LEDGER_HEAD.length).getValues();
}

/* ─────────────────────────── گزارش هفتگی ─────────────────────────── */
function gemNow_() { return TG_DRY && TG_MEM['gem:now'] ? new Date(Number(TG_MEM['gem:now'])) : new Date(); }
function gemUsd_(x) { return tgFa_((Math.round(Number(x || 0) * 100) / 100).toFixed(2)).replace('.', '٫'); }

/* عددهای گزارش (بی ارسال)؛ جدا تا تست بتواند بسنجد */
function gemBudget_() {
  var now = gemNow_(), day = 86400000, rows = gemLedgerRows_();
  var credit = GEM_CREDIT_USD, adj = GEM_SPENT_ADJ_USD;
  var end = new Date(GEM_CREDIT_END + 'T23:59:00+03:30');
  var total = adj, week = 0, calls = 0, imgs = 0, fails = 0, byTask = {};
  rows.forEach(function (r) {
    var t = r[0] instanceof Date ? r[0].getTime() : new Date(r[0]).getTime(), c = Number(r[7] || 0);
    total += c;
    if (t >= now.getTime() - 7 * day && t <= now.getTime()) {
      week += c; calls++; imgs += Number(r[6] || 0);
      if (Number(r[3]) !== 200) fails++;
      byTask[r[1]] = (byTask[r[1]] || 0) + c;
    }
  });
  var left = Math.max(0, credit - total), daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / day));
  var projected = week / 7 * daysLeft;
  return { credit: credit, total: total, week: week, calls: calls, imgs: imgs, fails: fails, byTask: byTask,
    left: left, daysLeft: daysLeft, projected: projected, burnsAll: projected >= left,
    needPerDay: daysLeft ? left / daysLeft : 0 };
}

function gemWeeklyText_(b) {
  var tasks = Object.keys(b.byTask).sort(function (x, y) { return b.byTask[y] - b.byTask[x]; })
    .map(function (k) { return '• ' + tgEsc_(k) + ': ' + gemUsd_(b.byTask[k]) + ' دلار'; });
  var verdict = b.burnsAll
    ? '✅ با سرعت این هفته، اعتبار پیش از سوختن مصرف می‌شود.'
    : '⚠️ با سرعت این هفته تا سوختن فقط حدود ' + gemUsd_(b.projected) + ' دلار مصرف می‌شود و حدود ' +
      gemUsd_(b.left - b.projected) + ' دلار می‌سوزد. برای مصرف کامل روزی حدود ' + gemUsd_(b.needPerDay) + ' دلار لازم است.';
  return ['🤖 <b>گزارش هفتگی Gemini</b>',
    'مصرف این هفته: ' + gemUsd_(b.week) + ' دلار (' + tgFa_(b.calls) + ' درخواست، ' + tgFa_(b.imgs) + ' تصویر' + (b.fails ? '، ' + tgFa_(b.fails) + ' ناموفق' : '') + ')',
    'مصرف تا امروز: ' + gemUsd_(b.total) + ' از ' + gemUsd_(b.credit) + ' دلار',
    'مانده: ' + gemUsd_(b.left) + ' دلار · ' + tgFa_(b.daysLeft) + ' روز تا سوختن',
    verdict].concat(tasks.length ? ['', 'به تفکیک کار:'].concat(tasks) : []).concat(['', 'عددها برآوردی از دفتر هزینه‌اند؛ عدد دقیق در کنسول Billing.']).join('\n');
}

/** از V1691_WEEKLY (یکشنبه ۹). فقط برای یاسر. */
function gemWeekly() {
  var b = gemBudget_();
  tgSend_(TG_OWNER_CHAT, gemWeeklyText_(b));
  return b;
}

/* ─────────────────────────── سلامت ─────────────────────────── */
function gemPickImg_(names, kind) {
  var pref = GEM_IMG_PREFER[kind] || [];
  for (var i = 0; i < pref.length; i++) if (names.indexOf(pref[i]) > -1) return pref[i];
  var re = kind === 'pro' ? /pro.*image|image.*pro/ : /flash.*image|image.*flash/;
  return names.filter(function (n) { return re.test(n); })[0] || '';
}

/** بررسی سلامت: فهرست مدل‌ها، یک درخواست متنی کوچک، و یک تصویر کوچک با هر مدل تصویری. خروجی یک خط خلاصه. */
function geminiCheck() {
  gemTask_('سلامت');
  var list = gemFetch_('models?pageSize=200');
  var names = (list.body.models || []).map(function (m) { return String(m.name).replace('models/', ''); });
  var out = ['فهرست مدل‌ها HTTP ' + list.code + ' (' + names.length + ')'];
  var t = gemFetch_('models/gemini-flash-latest:generateContent', { contents: [{ parts: [{ text: 'فقط بنویس: سلام' }] }] });
  out.push('متن: ' + (t.code === 200 ? 'OK' : t.code + ' ' + String((t.body.error || {}).message || '').slice(0, 60)));
  ['flash', 'pro'].forEach(function (kind) {
    var mdl = gemPickImg_(names, kind);
    if (!mdl) { out.push('تصویر ' + kind + ': مدلی پیدا نشد'); return; }
    var r = gemFetch_('models/' + mdl + ':generateContent', {
      contents: [{ parts: [{ text: 'A small hand-drawn strawberry on a flat cream background, no text.' }] }],
      generationConfig: { responseModalities: ['IMAGE'] }
    });
    var n = gemImgCount_(r.body);
    out.push('تصویر ' + kind + ' (' + mdl + '): ' + (r.code === 200 && n ? 'OK' : r.code + ' ' + (n ? '' : 'بی تصویر ') + String((r.body.error || {}).message || '').slice(0, 60)));
  });
  gemTask_('');
  Logger.log(out.join('\n'));
  return out.join(' · ');
}

/* یک‌بارهٔ خودکار بعد از انتشار سبز v170.81: تب دفتر هزینه و بررسی سلامت (حدود ۰٫۲ دلار). */
function gemV17081Check() {
  gemLedgerTab_();
  return geminiCheck();
}

/* ─────────────────────────── تست ─────────────────────────── */
try { TG_SUITES.push(['Gemini: هزینه و گزارش هفتگی v170.81', 'gemTests']); } catch (eSu) {}

function gemTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX, cfgK = [GEM_CREDIT_USD, GEM_CREDIT_END, GEM_SPENT_ADJ_USD];
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  GEM_CREDIT_USD = 300; GEM_CREDIT_END = '2026-12-22'; GEM_SPENT_ADJ_USD = 0;
  try {
    ok('هزینهٔ متن Flash: یک میلیون ورودی و یک میلیون خروجی ۲٫۸ دلار', Math.abs(gemCost_('gemini-flash-latest', { promptTokenCount: 1e6, candidatesTokenCount: 5e5, thoughtsTokenCount: 5e5 }, 0) - 2.8) < 1e-6);
    ok('هزینهٔ تصویر Pro حدود ۱۳ سنت و Flash حدود ۴ سنت', Math.abs(gemCost_('gemini-3-pro-image', { promptTokenCount: 0, candidatesTokenCount: 1290 }, 1) - 0.134) < 1e-6
      && Math.abs(gemCost_('gemini-3.1-flash-image', {}, 1) - 0.039) < 1e-6);
    ok('Flash-lite ارزان‌تر از Flash', gemPrice_('gemini-flash-lite-latest').inM < gemPrice_('gemini-flash-latest').inM);

    TG_MEM['gem:fake'] = { code: 200, body: { usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200 },
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAA' } }] } }] } };
    gemTask_('کاور');
    gemFetch_('models/gemini-3-pro-image:generateContent', { contents: [] });
    gemTask_('');
    var L = TG_MEM['gem:ledger'] || [];
    ok('هر درخواست یک ردیف در دفتر هزینه (روی کد قبلی مردود)', L.length === 1 && L[0][1] === 'کاور' && L[0][2] === 'gemini-3-pro-image' && L[0][6] === 1 && L[0][7] > 0.13);
    ok('ردیف دفتر کلید و متن درخواست ندارد', L.length === 1 && L[0].length === GEM_LEDGER_HEAD.length && !/key|AAAA/i.test(JSON.stringify(L[0])));
    gemFetch_('models?pageSize=200');
    ok('فهرست مدل‌ها (GET) ردیف هزینه نمی‌سازد', (TG_MEM['gem:ledger'] || []).length === 1);
    TG_MEM['gem:fake'] = { code: 429, body: { error: { message: 'quota' } } };
    gemFetch_('models/gemini-flash-latest:generateContent', { contents: [] });
    ok('درخواست ناموفق با هزینهٔ صفر ثبت می‌شود', TG_MEM['gem:ledger'][1][3] === 429 && TG_MEM['gem:ledger'][1][7] === 0);

    /* گزارش هفتگی: ۳۱ روز مانده، این هفته ۱۴ دلار (روزی ۲) ← ۶۲ دلار تا سوختن؛ مانده ۲۶۰ ← هشدار سوختن */
    var now = new Date('2026-11-22T09:00:00+03:30').getTime(), d = 86400000;
    TG_MEM['gem:now'] = String(now);
    TG_MEM['gem:ledger'] = [[new Date(now - 30 * d), 'سئو', 'gemini-flash-latest', 200, 0, 0, 0, 26],
      [new Date(now - 2 * d), 'کاور', 'gemini-3-pro-image', 200, 0, 0, 10, 10], [new Date(now - d), 'سئو', 'gemini-flash-latest', 200, 0, 0, 0, 4]];
    var b = gemBudget_();
    ok('مصرف هفته، کل و مانده', Math.abs(b.week - 14) < 1e-9 && Math.abs(b.total - 40) < 1e-9 && Math.abs(b.left - 260) < 1e-9 && b.imgs === 10);
    ok('پیش‌بینی: با این سرعت اعتبار کامل مصرف نمی‌شود', b.daysLeft === 31 && Math.abs(b.projected - 62) < 1e-9 && b.burnsAll === false);
    var r = gemWeekly();
    var msg = TG_OUTBOX.filter(function (x) { return String(x.chat) === String(TG_OWNER_CHAT); }).map(function (x) { return x.text; }).join('\n');
    ok('گزارش هفتگی با پیام خصوصی برای یاسر رفت (روی کد قبلی مردود)', r && /گزارش هفتگی Gemini/.test(msg) && msg.indexOf('۱۴٫۰۰') > -1 && msg.indexOf('۲۶۰٫۰۰') > -1 && /می‌سوزد/.test(msg));
    ok('گزارش فقط برای یاسر است', TG_OUTBOX.length === 1);
    ok('گزارش خط تیرهٔ وسط جمله ندارد', !/[—–]/.test(msg));
    TG_MEM['gem:ledger'].push([new Date(now - 3 * d), 'کاور', 'gemini-3-pro-image', 200, 0, 0, 100, 60]);
    ok('اگر سرعت کافی باشد، پیام سوختن نمی‌دهد', gemBudget_().burnsAll === true && /پیش از سوختن مصرف می‌شود/.test(gemWeeklyText_(gemBudget_())));

    ok('انتخاب مدل تصویری از فهرست', gemPickImg_(['gemini-3-pro-image-preview', 'gemini-3.1-flash-image'], 'pro') === 'gemini-3-pro-image-preview'
      && gemPickImg_(['gemini-3.1-flash-image'], 'flash') === 'gemini-3.1-flash-image' && gemPickImg_(['gemini-flash-latest'], 'pro') === '');
    ok('گزارش هفتگی در کارهای هفتگی (یکشنبه ۹) و اجراکننده آن را می‌شناسد', V1691_WEEKLY.some(function (j) { return j.fn === 'gemWeekly' && j.wd === 7 && j.h === 9; }) && String(v1691Run_).indexOf('gemWeekly') > -1);
    ok('بررسی سلامت بعد از انتشار خودکار اجرا می‌شود', CI_ONCE_AUTO.indexOf('gemV17081Check') > -1 && CI_ONCE_ALLOW.indexOf('gemV17081Check') > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; GEM_TASK = '';
  GEM_CREDIT_USD = cfgK[0]; GEM_CREDIT_END = cfgK[1]; GEM_SPENT_ADJ_USD = cfgK[2];
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ هزینه و گزارش Gemini درست است'));
  return tgTestTally_(log, fail);
}
