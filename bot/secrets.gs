/**
 * secrets.gs · v170.99 · ۲ آبان ۱۴۰۵ · صندوق راز و پاک‌سازی Script Properties (INBOX E27، E28)
 *
 * ۱) صندوق راز (مثل E10): ردیف «<کلید>_INBOX» در تب پنهان «تنظیمات خصوصی بات». همگام‌سازی ساعتی تنظیمات (cfgSync_)
 *    اول خانه را پاک می‌کند، بعد مقدار را در Script Property هم‌نام می‌گذارد و فقط اثر انگشتش را به مالک خبر می‌دهد.
 *    فقط کلیدهای فهرست SEC_KEYS؛ مقدار هرگز در TG_CFG، لاگ، شیت یا پیام نمی‌آید.
 * ۲) راز مشترک ورود به پنل (TG_BRIDGE_HANDOFF_SECRET): اگر نیست، خود بات ۳۲ بایت تصادفی می‌سازد. مقدار یک بار در
 *    پیام خصوصی مالک می‌رود (بی ثبت در دفتر پیام‌ها) و ۱۵ دقیقه بعد خودکار پاک می‌شود؛ مالک همان را یک بار در
 *    متغیر CI پل می‌گذارد. در گزارش‌ها فقط اثر انگشت.
 * ۳) پاک‌سازی: کلیدهای روزانه (نامی با تاریخ yyyy-mm-dd) کهنه‌تر از ۱۴ روز پاک می‌شوند. بقیه دست نمی‌خورند.
 */
var SEC_KEYS = ['TG_BRIDGE_HANDOFF_SECRET', 'BRIDGE_TG_SECRET'];
var SEC_NOTE = { TG_BRIDGE_HANDOFF_SECRET: 'راز مشترک ورود به پنل پل', BRIDGE_TG_SECRET: 'راز سربرگ رونوشت آپدیت‌ها به پل (E29)' };
var SEC_WIPE_MS = 15 * 60000;
var SEC_KEEP_DAYS = 14;

function secProp_(k, v) {
  if (TG_DRY) { if (v === undefined) return TG_MEM['pnlp:' + k] || ''; if (v === null) delete TG_MEM['pnlp:' + k]; else TG_MEM['pnlp:' + k] = String(v); return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty(k) || '';
  if (v === null) P.deleteProperty(k); else P.setProperty(k, String(v));
  return v;
}
function secFp_(v) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(v)).slice(0, 4).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function secShape_(v) { return /^[A-Za-z0-9_\-+/=.]{24,200}$/.test(String(v || '')); }

/** از cfgSync_: ردیف‌های «_INBOX». خروجی: شمار برداشته‌ها. */
function secInbox_(rows) {
  var n = 0;
  (rows || []).forEach(function (r, i) {
    var name = String(r[0] || '').trim(), m = name.match(/^(.+)_INBOX$/), val = String(r[1] || '').trim();
    if (!m || !val || SEC_KEYS.indexOf(m[1]) < 0) return;
    vtxInboxClear_(i); r[1] = '';   /* اول پاک */
    var msg;
    if (!secShape_(val)) msg = '⚠️ <b>' + m[1] + '</b>\nمقدار ردیف ' + name + ' شبیه راز نبود (فاصله داشت یا طولش نادرست بود). خانه پاک شد و چیزی ذخیره نشد.';
    else { secProp_(m[1], val); msg = '✅ <b>' + m[1] + '</b> از تب تنظیمات برداشته و ذخیره شد (اثر انگشت ' + secFp_(val) + ')؛ خانه پاک شد.'; n++; }
    tgSend_(TG_OWNER_CHAT, msg);
  });
  return n;
}

/* ردیف‌های خالی صندوق در تب، اگر نیستند (یک‌باره) */
function secRows_() {
  var rows = cfgTabRows_(); if (!rows) return 'تب نیست';
  var have = {}; rows.forEach(function (r) { have[String(r[0]).trim()] = 1; });
  var add = SEC_KEYS.filter(function (k) { return !have[k + '_INBOX']; }).map(function (k) { return [k + '_INBOX', '', 'یک‌باره: ' + SEC_NOTE[k] + '. همگام‌سازی ساعتی مقدار را به Script Properties می‌برد و خانه را پاک می‌کند.']; });
  ['BRIDGE_TG_URL', 'BRIDGE_TEST_CHATS'].forEach(function (k) { if (!have[k]) add.push([k, '', CFG_NOTE[k] || '']); });   /* E29: کلیدهای خالی */
  if (!add.length) return 'ردیف‌ها بود';
  if (TG_DRY) { TG_MEM['cfg:tab'] = rows.concat(add); return 'ساخته شد: ' + add.length; }
  var sh = SpreadsheetApp.openById(TG_SHEET_ID).getSheetByName(CFG_TAB);
  sh.getRange(sh.getLastRow() + 1, 1, add.length, 3).setNumberFormat('@').setValues(add);
  return 'ساخته شد: ' + add.length;
}

/* راز ورود به پنل اگر نیست: ساخت، یک پیام خصوصی خودپاک‌شو به مالک، فقط اثر انگشت در گزارش */
function secHandoffInit_() {
  var cur = secProp_('TG_BRIDGE_HANDOFF_SECRET');
  if (cur) return 'بود (اثر انگشت ' + secFp_(cur) + ')';
  var b = [], hex = (Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 64);
  for (var i = 0; i < 64; i += 2) { var x = parseInt(hex.substr(i, 2), 16); b.push(x > 127 ? x - 256 : x); }
  var v = Utilities.base64EncodeWebSafe(b).replace(/=+$/, '');
  secProp_('TG_BRIDGE_HANDOFF_SECRET', v);
  var text = '🔐 <b>راز ورود به پنل ساخته شد</b>\nاین مقدار را یک بار در متغیر CI پل با نام <code>BRIDGE_TELEGRAM_HANDOFF_SECRET</code> بگذارید (جای مقدار قبلی):\n\n<code>' + v + '</code>\n\nاین پیام ۱۵ دقیقهٔ دیگر خودکار پاک می‌شود. اثر انگشت: ' + secFp_(v);
  var mid = '';
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'secret', chat: String(TG_OWNER_CHAT), text: text }); mid = '1'; }
  else {
    /* مستقیم از tgApi_، نه tgSend_: دفتر پیام‌های خروجی متن را نگه می‌دارد */
    var res = tgApi_('sendMessage', { chat_id: TG_OWNER_CHAT, text: text, parse_mode: 'HTML' });
    try { mid = String(JSON.parse(res.getContentText()).result.message_id || ''); } catch (e) {}
  }
  if (mid) secProp_('SEC_WIPE', JSON.stringify({ c: String(TG_OWNER_CHAT), m: mid, at: (TG_DRY && TG_MEM['sec:now'] ? Number(TG_MEM['sec:now']) : Date.now()) }));
  return 'ساخته شد (اثر انگشت ' + secFp_(v) + ')';
}
/** قدم سبک واچ‌داگ و تیک ۵ دقیقه‌ای: پاک کردن پیام راز بعد از ۱۵ دقیقه */
function secWipeTick_() {
  var s = secProp_('SEC_WIPE'); if (!s) return false;
  var o = {}; try { o = JSON.parse(s) || {}; } catch (e) {}
  var now = TG_DRY && TG_MEM['sec:now'] ? Number(TG_MEM['sec:now']) : Date.now();
  if (now - Number(o.at || 0) < SEC_WIPE_MS) return false;
  if (!TG_DRY) { try { tgApi_('deleteMessage', { chat_id: o.c, message_id: Number(o.m) }); } catch (eD) { tgErr_('secWipeTick_', eD); } }
  else TG_OUTBOX.push({ kind: 'delete', chat: o.c, m: o.m });
  secProp_('SEC_WIPE', null);
  return true;
}

/* کلیدهای روزانهٔ کهنه (نامی با تاریخ) پاک؛ خروجی فقط شمار و پیشوند، نه نام کامل (بعضی کلیدها شناسهٔ چت دارند) */
function secClean_(keys, now) {
  var cut = Utilities.formatDate(new Date(now - SEC_KEEP_DAYS * 86400000), 'Asia/Tehran', 'yyyy-MM-dd'), del = [], pre = {};
  keys.forEach(function (k) {
    var m = String(k).match(/(20\d\d-\d\d-\d\d)/);
    if (!m || m[1] >= cut || SEC_KEYS.indexOf(k) > -1) return;
    del.push(k);
    var p = String(k).slice(0, String(k).indexOf(m[1])).replace(/[0-9]+/g, '#') || '(تاریخ)'; pre[p] = (pre[p] || 0) + 1;
  });
  return { del: del, pre: pre };
}
/** یک‌بارهٔ خودکار v170.99 (E27، E28): صندوق راز، راز ورود به پنل، پاک‌سازی Script Properties. */
function secV17099Setup() {
  var out = [];
  try { out.push('ردیف‌های صندوق: ' + secRows_()); } catch (e1) { out.push('ردیف‌های صندوق: خطا ' + String(e1.message || e1).slice(0, 80)); }
  try { out.push('راز پنل: ' + secHandoffInit_()); } catch (e2) { out.push('راز پنل: خطا ' + String(e2.message || e2).slice(0, 80)); }
  var P = TG_DRY ? null : PropertiesService.getScriptProperties();
  var keys = TG_DRY ? Object.keys(TG_MEM['sec:props'] || {}) : P.getKeys();
  var c = secClean_(keys, TG_DRY && TG_MEM['sec:now'] ? Number(TG_MEM['sec:now']) : Date.now());
  c.del.forEach(function (k) { if (TG_DRY) delete TG_MEM['sec:props'][k]; else P.deleteProperty(k); });
  out.push('Script Properties: ' + keys.length + ' ← ' + (keys.length - c.del.length) + ' (پاک شد ' + c.del.length + ': ' +
    (Object.keys(c.pre).map(function (p) { return p + ' ' + c.pre[p]; }).join('، ') || 'هیچ') + ')');
  return out.join(' · ');
}

/* ─────────────────────────── آزمون ─────────────────────────── */
try { TG_SUITES.push(['صندوق راز و پاک‌سازی v170.99', 'secVaultTests']); } catch (eSu) {}

function secVaultTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, own: TG_OWNER_CHAT };
  TG_DRY = true; TG_OUTBOX = []; TG_OWNER_CHAT = '9001';
  TG_MEM = { 'cfg:tab': [['VERTEX_PROJECT', 'x', ''], ['TG_BRIDGE_HANDOFF_SECRET_INBOX', 'test-only-handoff-secret-0123456789', ''], ['OTHER_INBOX', 'test-only-other-secret-0123456789', ''], ['BRIDGE_TG_SECRET_INBOX', 'کوتاه', '']],
    'sec:now': String(Date.UTC(2026, 9, 24, 7, 0, 0)) };
  try {
    var n = secInbox_(TG_MEM['cfg:tab']);
    ok('صندوق: کلید مجاز برداشته، خانه پاک، فقط اثر انگشت در پیام (روی کد قبلی مردود)', n === 1 && secProp_('TG_BRIDGE_HANDOFF_SECRET') === 'test-only-handoff-secret-0123456789' && TG_MEM['cfg:tab'][1][1] === '' &&
      !TG_OUTBOX.some(function (x) { return String(x.text).indexOf('test-only-handoff') > -1; }) && TG_OUTBOX.some(function (x) { return /اثر انگشت/.test(x.text); }));
    ok('صندوق: کلید بیرون از فهرست دست نمی‌خورد', TG_MEM['cfg:tab'][2][1] !== '' && !secProp_('OTHER'));
    ok('صندوق: مقدار نادرست پاک و ذخیره نمی‌شود', TG_MEM['cfg:tab'][3][1] === '' && !secProp_('BRIDGE_TG_SECRET') && TG_OUTBOX.some(function (x) { return /⚠️/.test(x.text); }));
    ok('cfgSync_ صندوق را صدا می‌زند', String(cfgSync_).indexOf('secInbox_') > -1);
    TG_OUTBOX = [];
    ok('راز موجود دوباره ساخته نمی‌شود', /^بود/.test(secHandoffInit_()) && !TG_OUTBOX.length);
    secProp_('TG_BRIDGE_HANDOFF_SECRET', null);
    var r = secHandoffInit_(), v = secProp_('TG_BRIDGE_HANDOFF_SECRET');
    ok('راز تازه ۳۲ بایت (۴۳ نویسهٔ base64url)، یک پیام خصوصی، گزارش فقط اثر انگشت (روی کد قبلی مردود)', v.length === 43 && /^[A-Za-z0-9_-]+$/.test(v) && r.indexOf(v) < 0 && /اثر انگشت/.test(r) &&
      TG_OUTBOX.length === 1 && TG_OUTBOX[0].kind === 'secret' && TG_OUTBOX[0].chat === '9001', r);
    ok('پیام راز ۱۵ دقیقه بعد پاک می‌شود، نه زودتر', secWipeTick_() === false && (TG_MEM['sec:now'] = String(Number(TG_MEM['sec:now']) + SEC_WIPE_MS + 1000), secWipeTick_() === true) &&
      TG_OUTBOX.some(function (x) { return x.kind === 'delete'; }) && !secProp_('SEC_WIPE'));
    ok('سیم‌کشی پاک کردن پیام در واچ‌داگ', String(tgWatchdog).indexOf('secWipeTick_') > -1);
    var c = secClean_(['RS:2026-09-01', 'BGS:2026-10-20', 'MS_DAY:2026-09-30', 'nu:5550001:2026-09-01', 'TELEGRAM_TOKEN', 'X2026'], Date.UTC(2026, 9, 24));
    ok('پاک‌سازی: فقط کلیدهای تاریخ‌دار کهنه‌تر از ۱۴ روز؛ گزارش بی شناسه', c.del.length === 3 && c.del.indexOf('BGS:2026-10-20') < 0 && c.del.indexOf('TELEGRAM_TOKEN') < 0 && JSON.stringify(c.pre).indexOf('5550001') < 0, JSON.stringify(c));
    TG_MEM['sec:props'] = { 'RS:2026-09-01': 1, 'TELEGRAM_TOKEN': 1 };
    ok('یک‌بارهٔ پاک‌سازی در فهرست خودکار', /Script Properties: 2 ← 1/.test(secV17099Setup()) && CI_ONCE_AUTO.indexOf('secV17099Setup') > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_OWNER_CHAT = keep.own;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ صندوق راز درست است'));
  return tgTestTally_(log, fail);
}

/* ─────────────────────────── آزمون E26 (اتصال فقط با تأیید، خانهٔ خالی نوبت) ─────────────────────────── */
try { TG_SUITES.push(['اتصال حساب فقط با تأیید v170.99', 'e26Tests']); } catch (eSu2) {}

function e26Tests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  var st = { byPhone: tgLeadByPhone_, find: tgFindLead_, upd: tgUpdateLead_, note: tgLeadNote_, app: tgAppendLead_, ppl: tgPeopleList_, conn: tgEduConnect_,
    wt: tgWhoTherapist_, wd: tgWhoDesk_, tea: tgTeaRows_ };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = {};
  var calls = [];
  try {
    tgLeadByPhone_ = function () { return 7; }; tgFindLead_ = function () { return -1; };
    tgUpdateLead_ = function (row) { calls.push('upd:' + row); }; tgLeadNote_ = function (row, t) { calls.push('note:' + row); };
    tgAppendLead_ = function () { calls.push('app'); return true; };
    tgOnPhone_('5550009', 'نمونه', 'nmune', '+989000000000');   /* pii:ok شمارهٔ ساختگی آزمون */
    ok('شمارهٔ تأییدنشده به پروندهٔ دیگری وصل نمی‌شود؛ فقط یادداشت (روی کد قبلی مردود)', calls.indexOf('upd:7') < 0 && calls.indexOf('note:7') > -1 && calls.indexOf('app') < 0, calls.join());
    calls = [];
    tgOnPhone_('5550019', 'نمونه', 'nmune', '+989000000000', true);   /* pii:ok شمارهٔ ساختگی آزمون */
    ok('شمارهٔ دکمهٔ اشتراک تماس خود فرستنده وصل می‌کند', calls.indexOf('upd:7') > -1, calls.join());
    ok('مسیر پیام، تأیید شماره را می‌فرستد', /Number\(m\.contact\.user_id\) === Number\(m\.from\.id\)/.test(String(tgPrivate_)));

    /* مدرسه */
    var row = { row: 5, name: 'دانشجوی آزمون', chat: '', roles: ['دانشجو'], status: 'فعال', user: 'stud_test', phone: '' };
    tgPeopleList_ = function () { return [row]; };
    var conn = []; tgEduConnect_ = function (c, p) { conn.push(c + ':' + p.row); };
    tgEduSignupName_('5550010', 'دانشجوی آزمون');
    ok('مدرسه با نام: وصل نمی‌شود، درخواست با دکمه به مدرسه (روی کد قبلی مردود)', !conn.length && (TG_MEM['eduask'] || []).length === 1 && JSON.stringify(TG_MEM['eduask'][0].kb).indexOf('edu:ok:5550010:5') > -1);
    TG_MEM['eduowners'] = ['8001'];
    tgEduAskCb_('5550011', 'edu:ok:5550010:5');
    ok('دکمهٔ تأیید برای غیرمسئول کار نمی‌کند', !conn.length);
    tgEduAskCb_('8001', 'edu:ok:5550010:5');
    ok('مسئول مدرسه تأیید کرد ← همان ردیف وصل شد', conn.join() === '5550010:5');
    TG_OUTBOX = [];
    tgEduByPhone_('5550012', { phone_number: '+989000000000' }, 5550012);   /* pii:ok */
    ok('مدرسه با تماس بی user_id (تماس کس دیگر) رد می‌شود (روی کد قبلی مردود)', TG_OUTBOX.some(function (x) { return /شمارهٔ خودتان/.test(x.text); }) && conn.length === 1);
    tgWhoTherapist_ = function () { return null; }; tgWhoDesk_ = function () { return null; };
    var r = tgRolesOf_('5550013', 'stud_test');
    ok('یوزرنیم تنها نقش مدرسه نمی‌دهد (روی کد قبلی مردود)', r.roles.indexOf('دانشجو') < 0, JSON.stringify(r.roles));
    tgTeaRows_ = function () { return [{ name: 'استاد آزمون', chat: '', user: 'tea_test' }]; };
    ok('استاد با یوزرنیم تنها شناخته نمی‌شود', tgTeaWho_('5550014', 'tea_test') === null);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  tgLeadByPhone_ = st.byPhone; tgFindLead_ = st.find; tgUpdateLead_ = st.upd; tgLeadNote_ = st.note; tgAppendLead_ = st.app; tgPeopleList_ = st.ppl; tgEduConnect_ = st.conn;
  tgWhoTherapist_ = st.wt; tgWhoDesk_ = st.wd; tgTeaRows_ = st.tea;
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ اتصال فقط با تأیید درست است'));
  return tgTestTally_(log, fail);
}
