/**
 * guard.gs · v170.23.30 · ۱۸ مهر ۱۴۰۵ · نگهبان مهلت‌ها (برد فرآیندها، کار ۲؛ بی هوش مصنوعی)
 *
 * هر ساعت در ساعت کاری (۹ تا ۱۸ تهران، جمعه نه) از داخل tgWatchdog. فقط شرط ساده؛ هیچ مدلی صدا زده نمی‌شود.
 *   J-01 لید تراپی L-: همان پایش موجود tgSlaTick_ (یک نگرانی، یک پایش). زنجیرهٔ تازه در tgSlaWant_:
 *        فوری ۳۰ دقیقه یا عادی ۲ ساعت بی تماس اول ← مسئول لید؛ ۲۴ ساعت بعد ← مسئول پذیرش؛ ۲۴ ساعت بعد ← یک خط در جمع‌بندی یاسر.
 *   J-04 لید مدرسه S-: ۲ ساعت کاری بی تماس اول ← مسئول پیگیری (یا مسئول مدرسهٔ تیم پذیرش)؛ ۲۴ ساعت بعد ← مسئول ارشد مدرسه؛
 *        ۲۴ ساعت بعد ← جمع‌بندی یاسر. ساعت شروع، اولین باری است که نگهبان لید را می‌بیند (تب ساعت ثبت ندارد) پس لیدهای
 *        قدیمی یک‌جا بالا نمی‌روند. مهلت مصاحبهٔ ۳ روز کاری (CR-004) هنوز منتظر یاسر است و ساخته نشد.
 *   J-02 فهرست انتظار روان‌پزشکی: لید باز روان‌پزشکی بی نوبت ← روزی یک یادآوری جمع به مسئول روان‌پزشکی.
 *   J-06 پروفایل ناقص درمانگر تازه (دعوت از GRD_J06_SINCE به بعد): ۲۴ ساعت بعد از دعوت هنوز ناقص ← یادآوری به خود درمانگر؛
 *        ۳ روز بعد ← مسئول پذیرش.
 * هر هشدار یک سطر در «رویدادهای لید» (tgLeadEv_، کانال «نگهبان مهلت») و هر مرحله فقط یک بار (Script Property «GRD_STATE»).
 * تست: grdTests (مجموعهٔ «نگهبان مهلت»).
 */

var GRD_PROP = 'GRD_STATE';
var GRD_H_FROM = 9, GRD_H_TO = 18;
var GRD_DAY_MS = 24 * 3600000;
var GRD_SCH_FIRST_MIN = 120;              /* J-04: دو ساعت کاری */
var GRD_J06_SINCE = '2026-10-09';         /* J-06: فقط درمانگرهایی که از روز انتشار نگهبان دعوت شده‌اند */
var GRD_J06_FIRST_MS = GRD_DAY_MS;        /* یک روز بعد از دعوت، اگر هنوز ناقص است */
var GRD_J06_SECOND_MS = 3 * GRD_DAY_MS;   /* سه روز بعد از یادآوری اول */
var GRD_KEEP_MS = 7 * GRD_DAY_MS;         /* کلیدی که یک هفته دیده نشد پاک می‌شود */
var GRD_CH = 'نگهبان مهلت';

function grdDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function grdNow_() { return grdDry_() && TG_MEM['grd:now'] ? Number(TG_MEM['grd:now']) : Date.now(); }

/* ───── وضعیت: { key: { j, s, t, seen, last, c, n } } ───── */
var GRD_ST = null;
function grdState_() {
  if (GRD_ST) return GRD_ST;
  var raw = grdDry_() ? (TG_MEM['grd:state'] || '') : (PropertiesService.getScriptProperties().getProperty(GRD_PROP) || '');
  try { GRD_ST = raw ? JSON.parse(raw) : {}; } catch (e) { GRD_ST = {}; }
  return GRD_ST;
}
function grdSave_() {
  if (!GRD_ST) return;
  var now = grdNow_();
  for (var k in GRD_ST) if (Object.prototype.hasOwnProperty.call(GRD_ST, k) && now - Number(GRD_ST[k].last || 0) > GRD_KEEP_MS) delete GRD_ST[k];
  var s = JSON.stringify(GRD_ST);
  if (grdDry_()) TG_MEM['grd:state'] = s;
  else PropertiesService.getScriptProperties().setProperty(GRD_PROP, s);
}
/* لید یا مورد را «دیده‌شده» می‌کند و رکوردش را برمی‌گرداند */
function grdSee_(key, j, c, n) {
  var st = grdState_(), now = grdNow_();
  var r = st[key] || (st[key] = { j: j, s: 0, t: 0, seen: now });
  r.last = now; if (c) r.c = c; if (n) r.n = n;
  return r;
}
function grdDone_(key) { var st = grdState_(); if (st[key]) delete st[key]; }

/* ───── ساعت کاری ───── */
function grdTehran_(ms) {
  var d = new Date(ms);
  return { h: Number(Utilities.formatDate(d, TG_TZ, 'H')), m: Number(Utilities.formatDate(d, TG_TZ, 'm')), wd: Number(Utilities.formatDate(d, TG_TZ, 'u')) };
}
function grdInHours_(ms) { var t = grdTehran_(ms); return t.wd !== 5 && t.h >= GRD_H_FROM && t.h < GRD_H_TO; }
/* دقیقه‌های کاری میان دو لحظه (گام ۱۵ دقیقه‌ای؛ برای مهلت چندساعته کافی است) */
function grdWorkMin_(from, to) {
  if (!(to > from)) return 0;
  var n = 0, step = 15 * 60000;
  for (var x = from; x + step <= to && n < 60 * 24 * 14; x += step) if (grdInHours_(x)) n += 15;
  return n;
}

/* ───── ثبت و خبر ───── */
function grdEv_(o) {
  try { tgLeadEv_({ code: o.code || '', row: o.row || '', actor: 'بات', channel: GRD_CH, what: o.what, from: o.from || '', to: o.to || '', note: o.note || '', type: o.type || '' }); } catch (e) {}
}
function grdSend_(chat, text, markup) {
  if (!chat) return false;
  try { tgNotify_(String(chat).split(/[,،;\s]+/)[0], TG_NK.task, text, markup ? { markup: markup } : {}); return true; } catch (e) { return false; }
}
function grdBoss_() {
  var d = []; try { d = tgDeskRows_().filter(function (p) { return p.chat; }); } catch (e) {}
  return d.filter(function (p) { return p.role.indexOf('مسئول پذیرش') > -1; })[0] || d[0] || null;
}
function grdSchDesk_() {
  var d = []; try { d = tgDeskRows_().filter(function (p) { return p.chat; }); } catch (e) {}
  return d.filter(function (p) { return p.role.indexOf('مدرسه') > -1; })[0] || null;
}
function grdPersonChat_(name) {
  if (!name) return null;
  try { var p = tgPeopleList_().filter(function (x) { return tgNorm_(x.name) === tgNorm_(name) && x.chat; })[0]; return p ? { name: p.name, chat: p.chat } : null; } catch (e) { return null; }
}

/* ───── J-01: مرحلهٔ خواستنی برای tgSlaTick_ (تابع خالص) ─────
   age دقیقه از ورود لید؛ urgent یعنی فوری (۳۰ دقیقه)، وگرنه عادی (۲ ساعت). ۱ مسئول لید، ۲ مسئول پذیرش، ۳ جمع‌بندی یاسر. */
function tgSlaWant_(age, urgent) {
  var first = typeof lcCfg_ === 'function' ? lcCfg_().first : 15;   /* v170.23.44 (D17): فوری و عادی، همان قول تماس اول */
  if (age >= first + 2 * 1440) return 3;
  if (age >= first + 1440) return 2;
  if (age >= first) return 1;
  return 0;
}
/* J-01 مرحلهٔ ۳: فقط ثبت برای جمع‌بندی یاسر (پیامی به کسی نمی‌رود) */
function grdJ01Late_(code, row, name, owner) {
  var r = grdSee_('L:' + (code || row), 'J-01', code, name);
  r.w = owner || '';
  if (r.s < 3) { r.s = 3; r.t = grdNow_(); grdEv_({ code: code, row: row, what: 'هشدار مهلت تماس اول', from: 'مرحلهٔ ۳', to: 'جمع‌بندی یاسر', note: 'J-01' }); }
}
/* هر نوبت tgSlaTick_ لیدهای مرحلهٔ ۳ را که هنوز بی‌تماس‌اند تازه نگه می‌دارد تا در جمع‌بندی بمانند */
function grdJ01Keep_(code, row) { var st = grdState_(), k = 'L:' + (code || row); if (st[k]) st[k].last = grdNow_(); }

/* ───── J-04: لید مدرسه ───── */
function grdSchool_() {
  var list = [];
  try { list = tgSlOpen_(); } catch (e) { tgErr_('grdSchool_', e); return 0; }
  var now = grdNow_(), n = 0, chief = null, desk = grdSchDesk_();
  try { chief = tgSchChief_(); } catch (e2) {}
  var live = {};
  list.forEach(function (l) {
    var key = 'S:' + (l.code || l.id);
    live[key] = 1;
    if (l.bucket !== 'first') { grdDone_(key); return; }   /* تماس اول گرفته شد */
    var r = grdSee_(key, 'J-04', l.code || l.id, l.name);
    var want = 0, w = grdWorkMin_(r.seen, now);
    if (w >= GRD_SCH_FIRST_MIN) want = 1;
    if (r.s >= 1 && now - r.t >= GRD_DAY_MS) want = 2;
    if (r.s >= 2 && now - r.t >= GRD_DAY_MS) want = 3;
    if (want <= r.s) return;
    var to = null, head = '';
    if (want === 1) { to = grdPersonChat_(l.owner) || desk; head = '⏳ <b>دو ساعت کاری از لید مدرسه گذشته و تماس اول گرفته نشده</b>'; }
    else if (want === 2) { to = chief; head = '⏰ <b>یک روز از مهلت تماس اول لید مدرسه گذشته</b>'; }
    r.s = want; r.t = now; n++;
    if (want < 3) {
      if (to && to.chat) {
        grdSend_(to.chat, head);
        try { if (!grdDry_()) tgSlCardSend_(String(to.chat).split(/[,،;\s]+/)[0], l.row); } catch (e3) {}
      }
      grdEv_({ code: l.code || l.id, row: l.row, what: 'هشدار مهلت تماس اول مدرسه', from: 'مرحلهٔ ' + tgFa_(want), to: (to && to.name) || 'گیرنده پیدا نشد', note: 'J-04' });
    } else {
      grdEv_({ code: l.code || l.id, row: l.row, what: 'هشدار مهلت تماس اول مدرسه', from: 'مرحلهٔ ۳', to: 'جمع‌بندی یاسر', note: 'J-04' });
    }
  });
  /* لید بسته‌شده یا پاک‌شده از وضعیت بیرون می‌رود */
  var st = grdState_();
  for (var k in st) if (Object.prototype.hasOwnProperty.call(st, k) && k.indexOf('S:') === 0 && !live[k]) delete st[k];
  return n;
}

/* ───── J-02: فهرست انتظار روان‌پزشکی (روزی یک یادآوری جمع) ───── */
function grdPsyWait_() {
  var leads = [];
  try { leads = tgOpenLeads_(); } catch (e) { tgErr_('grdPsyWait_', e); return []; }
  var booked = {};
  try { (typeof ps3Rows_ === 'function' ? ps3Rows_() : []).forEach(function (o) { if (o['chat مراجع']) booked[String(o['chat مراجع'])] = 1; }); } catch (e2) {}
  return leads.filter(function (l) {
    if (tgSection_(l.src, l.note) !== 'روان‌پزشکی') return false;
    var chat = ''; try { chat = tgLeadChat_(l.note) || ''; } catch (e3) {}
    return !(chat && booked[chat]);
  });
}
function grdPsy_() {
  var day = Utilities.formatDate(new Date(grdNow_()), TG_TZ, 'yyyy-MM-dd');
  var r = grdSee_('P:day', 'J-02', '', '');
  if (r.d === day) return 0;
  var wait = grdPsyWait_();
  r.d = day;
  if (!wait.length) return 0;
  var t = '💊 <b>فهرست انتظار روان‌پزشکی</b> · ' + tgFa_(wait.length) + ' نفر بی نوبت\n' +
    wait.slice(0, 12).map(function (l) { return '• ' + tgEsc_(l.name || 'بی‌نام') + (l.code ? ' · ' + tgEsc_(l.code) : '') + ' · ' + tgFa_(Math.max(0, Math.floor(l.age / 1440))) + ' روز'; }).join('\n') +
    (wait.length > 12 ? '\nو ' + tgFa_(wait.length - 12) + ' نفر دیگر' : '');
  var sent = 0;
  try { sent = typeof tgPsyNotifyHead_ === 'function' ? tgPsyNotifyHead_(t, null, 'فهرست انتظار روان‌پزشکی') : 0; } catch (e) {}
  grdEv_({ what: 'یادآوری فهرست انتظار روان‌پزشکی', from: tgFa_(wait.length) + ' نفر', to: 'مسئول روان‌پزشکی', note: 'J-02' });
  return sent ? 1 : 0;
}

/* ───── J-06: پروفایل ناقص درمانگر تازه ───── */
function grdIso_(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  var s = tgLatinDigits_(String(v)).trim(), m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1900) { var g = tgJ2G_(y, mo, d); return g ? g.getTime() : 0; }
    return new Date(y, mo - 1, d).getTime();
  }
  var f = s.match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);   /* «۱۸ مهر ۱۴۰۵» از tgJDateFull_ */
  if (f) { var mi = TG_JMONTHS.indexOf(f[2]); if (mi > -1) { var g2 = tgJ2G_(+f[3], mi + 1, +f[1]); return g2 ? g2.getTime() : 0; } }
  return 0;
}
function grdProfiles_() {
  var rows = [];
  try { rows = tgPrAll_(); } catch (e) { tgErr_('grdProfiles_', e); return 0; }
  var now = grdNow_(), since = new Date(GRD_J06_SINCE + 'T00:00:00+03:30').getTime(), boss = grdBoss_(), n = 0;
  rows.forEach(function (x) {
    var v = x.v || {};
    var key = 'T:' + v.id;
    if (String(v.roles || '').indexOf('T') < 0) return;
    if (TG_PQ_OPEN.indexOf(String(v.status || '')) < 0) { grdDone_(key); return; }   /* کامل شد یا بسته شد */
    if (String(v.consent || '').indexOf('فقط برای تیم') > -1) return;
    var inv = grdIso_(v.invited);
    if (!inv || inv < since) return;
    var r = grdSee_(key, 'J-06', v.id, v.name);
    var want = 0;
    if (now - inv >= GRD_J06_FIRST_MS) want = 1;
    if (r.s >= 1 && now - r.t >= GRD_J06_SECOND_MS) want = 2;
    if (want <= r.s) return;
    r.s = want; r.t = now; n++;
    if (want === 1) {
      var to = String(v.chat || '').split(/[,،;\s]+/)[0];
      grdSend_(to, '🪪 یادآوری: صفحهٔ شما در سایت تجربه هنوز کامل نشده. از همان جایی که مانده بود ادامه بدهید.',
        { inline_keyboard: [[{ text: '🪪 ادامه می‌دهم', callback_data: 'pq:go' }]] });
      grdEv_({ code: v.id, what: 'هشدار پروفایل ناقص', from: 'مرحلهٔ ۱', to: v.name || '', note: 'J-06', type: 'درمانگر' });
    } else {
      grdSend_(boss && boss.chat, '🪪 <b>پروفایل درمانگر تازه سه روز است ناقص مانده</b>\n' + tgEsc_(v.name || '') + ' · ' + tgEsc_(String(v.status || '')) +
        (v.pct ? ' · ' + tgFa_(String(v.pct)) + '٪' : ''));
      grdEv_({ code: v.id, what: 'هشدار پروفایل ناقص', from: 'مرحلهٔ ۲', to: (boss && boss.name) || 'مسئول پذیرش', note: 'J-06', type: 'درمانگر' });
    }
  });
  return n;
}

/* ───── نوبت ساعتی (از tgWatchdog) ───── */
function grdTick_() {
  if (!grdInHours_(grdNow_())) return 0;
  var n = 0;
  try { n += grdSchool_(); } catch (e1) { tgErr_('grdSchool_', e1); }
  try { n += grdPsy_(); } catch (e2) { tgErr_('grdPsy_', e2); }
  try { n += grdProfiles_(); } catch (e3) { tgErr_('grdProfiles_', e3); }
  grdSave_();
  return n;
}

/* ───── خط‌های جمع‌بندی یاسر (opsEvening_) ───── */
function grdDigestLines_() {
  var st = grdState_(), out = [], now = grdNow_();
  for (var k in st) {
    if (!Object.prototype.hasOwnProperty.call(st, k)) continue;
    var r = st[k];
    if (r.s < 3 || now - Number(r.last || 0) > 2 * GRD_DAY_MS) continue;
    out.push('• ' + r.j + ' · ' + tgEsc_(r.c || '') + (r.n ? ' · ' + tgEsc_(r.n) : '') + ' · دو روز از مهلت تماس اول گذشته' + (r.w ? ' (' + tgEsc_(r.w) + ')' : ''));
  }
  return out;
}

/* ───── تست ───── */
function grdTests() {
  var pass = 0, fail = 0, text = [];
  function ok(name, c) { if (c) { pass++; text.push('✅ ' + name); } else { fail++; text.push('❌ ' + name); } }
  var keepDry = TG_DRY, keepMem = TG_MEM, keepOut = TG_OUTBOX, keepSt = GRD_ST;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; GRD_ST = null;
  try {
    /* J-01 */
    ok('J-01 (D17): پیش از ۱۵ دقیقه هیچ، فوری و عادی یکسان', tgSlaWant_(14, false) === 0 && tgSlaWant_(14, true) === 0);
    ok('J-01 (D17): ۱۵ دقیقه ← مسئول لید، فوری و عادی', tgSlaWant_(15, false) === 1 && tgSlaWant_(15, true) === 1);
    ok('J-01: ۲۴ ساعت بعد ← مسئول پذیرش', tgSlaWant_(15 + 1440, false) === 2 && tgSlaWant_(15 + 1439, false) === 1);
    ok('J-01: ۲۴ ساعت بعد ← جمع‌بندی یاسر', tgSlaWant_(120 + 2880, false) === 3);
    /* ساعت کاری: دوشنبه ۱۰:۰۰ تهران */
    var mon10 = new Date('2026-10-12T10:00:00+03:30').getTime();
    ok('ساعت کاری: دوشنبه ۱۰', grdInHours_(mon10) === true);
    ok('ساعت کاری: ۱۹ نه', grdInHours_(mon10 + 9 * 3600000) === false);
    ok('ساعت کاری: جمعه نه', grdInHours_(new Date('2026-10-16T10:00:00+03:30').getTime()) === false);
    ok('دو ساعت کاری از ۱۷ تا فردا ۱۰', grdWorkMin_(new Date('2026-10-12T17:00:00+03:30').getTime(), new Date('2026-10-13T10:00:00+03:30').getTime()) === 120);
    /* J-04 */
    TG_MEM['grd:now'] = mon10;
    TG_MEM['people'] = [{ name: 'مسئول ارشد نمونه', chat: '501', roles: ['مدرسه'], user: 'chief' }];
    TG_MEM['schchief'] = { name: 'مسئول ارشد نمونه', chat: '501' };
    var keepOpen = tgSlOpen_, keepDesk = tgDeskRows_;
    tgSlOpen_ = function () { return TG_MEM['grd:sl'] || []; };
    tgDeskRows_ = function () { return [{ name: 'پذیرش نمونه', role: 'مسئول پذیرش', chat: '500' }, { name: 'مدرسهٔ نمونه', role: 'مسئول مدرسه', chat: '502' }]; };
    try {
      TG_MEM['grd:sl'] = [{ row: 5, id: 'د-1', code: 'S-1001', name: 'متقاضی نمونه', owner: '', bucket: 'first' }];
      ok('J-04: بار اول فقط دیده می‌شود', grdSchool_() === 0 && grdState_()['S:S-1001'].s === 0);
      TG_MEM['grd:now'] = mon10 + 119 * 60000; ok('J-04: پیش از ۲ ساعت کاری هیچ', grdSchool_() === 0);
      TG_MEM['grd:now'] = mon10 + 120 * 60000; TG_OUTBOX = [];
      ok('J-04: ۲ ساعت کاری ← مسئول مدرسهٔ تیم پذیرش', grdSchool_() === 1 && TG_OUTBOX.some(function (x) { return x.chat === '502'; }));
      ok('J-04: سطر در رویدادهای لید', TG_OUTBOX.some(function (x) { return x.kind === 'leadev' && x.o.code === 'S-1001' && x.o.note === 'J-04' && x.o.channel === GRD_CH; }));
      TG_OUTBOX = []; ok('J-04: هر مرحله یک بار', grdSchool_() === 0 && !TG_OUTBOX.length);
      TG_MEM['grd:now'] = mon10 + 120 * 60000 + GRD_DAY_MS; TG_OUTBOX = [];
      ok('J-04: ۲۴ ساعت بعد ← مسئول ارشد مدرسه', grdSchool_() === 1 && TG_OUTBOX.some(function (x) { return x.chat === '501'; }));
      TG_MEM['grd:now'] = mon10 + 120 * 60000 + 2 * GRD_DAY_MS; TG_OUTBOX = [];
      ok('J-04: ۲۴ ساعت بعد ← جمع‌بندی یاسر، بی پیام', grdSchool_() === 1 && !TG_OUTBOX.some(function (x) { return x.kind !== 'leadev'; }));
      ok('J-04: خط جمع‌بندی یاسر', grdDigestLines_().join('').indexOf('S-1001') > -1);
      TG_MEM['grd:sl'] = [{ row: 5, id: 'د-1', code: 'S-1001', name: 'متقاضی نمونه', bucket: 'live' }];
      grdSchool_(); ok('J-04: بعد از تماس اول از وضعیت بیرون می‌رود', !grdState_()['S:S-1001'] && grdDigestLines_().length === 0);
      GRD_ST = null; TG_MEM['grd:state'] = ''; TG_MEM['grd:now'] = mon10;
      TG_MEM['grd:sl'] = [{ row: 6, id: 'د-2', code: 'S-1002', name: 'متقاضی دو', owner: 'مسئول ارشد نمونه', bucket: 'first' }];
      grdSchool_(); TG_MEM['grd:now'] = mon10 + 120 * 60000; TG_OUTBOX = []; grdSchool_();
      ok('J-04: اگر مسئول پیگیری دارد، خود او', TG_OUTBOX.some(function (x) { return x.chat === '501'; }) && !TG_OUTBOX.some(function (x) { return x.chat === '502'; }));
    } finally { tgSlOpen_ = keepOpen; tgDeskRows_ = keepDesk; }
    /* J-06 */
    GRD_ST = null; TG_MEM['grd:state'] = '';
    var inv = new Date('2026-10-12T00:00:00+03:30');
    TG_MEM['pqrows'] = {
      'ther:الف': { id: 'ther:الف', name: 'درمانگر الف', roles: 'T', status: 'دعوت شد', invited: tgJDateFull_(inv, TG_TZ), chat: '601' },
      'ther:قدیم': { id: 'ther:قدیم', name: 'درمانگر قدیمی', roles: 'T', status: 'دعوت شد', invited: '1405-06-01', chat: '602' },
      'ther:کامل': { id: 'ther:کامل', name: 'درمانگر کامل', roles: 'T', status: 'روی سایت', invited: tgJDateFull_(inv, TG_TZ), chat: '603' }
    };
    var keepDesk2 = tgDeskRows_;
    tgDeskRows_ = function () { return [{ name: 'پذیرش نمونه', role: 'مسئول پذیرش', chat: '500' }]; };
    try {
      ok('تاریخ شمسی دعوت خوانده می‌شود', Math.abs(grdIso_(tgJDateFull_(inv, TG_TZ)) - inv.getTime()) < GRD_DAY_MS);
      TG_MEM['grd:now'] = inv.getTime() + 12 * 3600000; TG_OUTBOX = [];
      ok('J-06: پیش از یک روز هیچ', grdProfiles_() === 0);
      TG_MEM['grd:now'] = inv.getTime() + GRD_DAY_MS + 6 * 3600000; TG_OUTBOX = [];
      ok('J-06: یادآوری به خود درمانگر تازه', grdProfiles_() === 1 && TG_OUTBOX.some(function (x) { return x.chat === '601'; }));
      ok('J-06: دعوت قدیمی و پروفایل کامل یادآوری نمی‌گیرند', !TG_OUTBOX.some(function (x) { return x.chat === '602' || x.chat === '603'; }));
      TG_MEM['grd:now'] = inv.getTime() + GRD_DAY_MS + 6 * 3600000 + GRD_J06_SECOND_MS; TG_OUTBOX = [];
      ok('J-06: سه روز بعد ← مسئول پذیرش', grdProfiles_() === 1 && TG_OUTBOX.some(function (x) { return x.chat === '500'; }));
      TG_OUTBOX = []; ok('J-06: دوباره نه', grdProfiles_() === 0);
    } finally { tgDeskRows_ = keepDesk2; }
    /* J-02 */
    var keepOL = tgOpenLeads_;
    tgOpenLeads_ = function () { return [
      { name: 'مراجع الف', code: 'L-2001', src: 'سایت › روان‌پزشکی › فرم', note: '', age: 2 * 1440 },
      { name: 'مراجع ب', code: 'L-2002', src: 'سایت › پذیرش › فرم', note: '', age: 60 }]; };
    TG_MEM['people'] = [{ name: 'مسئول روان‌پزشکی نمونه', chat: '700', roles: ['روان‌پزشکی'], status: 'فعال' }];
    try {
      GRD_ST = null; TG_MEM['grd:state'] = ''; TG_OUTBOX = [];
      TG_MEM['grd:now'] = mon10;
      ok('J-02: فقط لید روان‌پزشکی در فهرست', grdPsyWait_().length === 1 && grdPsyWait_()[0].code === 'L-2001');
      ok('J-02: یک یادآوری جمع به مسئول روان‌پزشکی', grdPsy_() === 1 && TG_OUTBOX.filter(function (x) { return x.chat === '700'; }).length === 1);
      TG_OUTBOX = []; ok('J-02: همان روز دوباره نه', grdPsy_() === 0 && !TG_OUTBOX.length);
    } finally { tgOpenLeads_ = keepOL; }
    /* بیرون از ساعت کاری کاری نمی‌کند */
    TG_MEM['grd:now'] = mon10 + 10 * 3600000;
    ok('بیرون از ۹ تا ۱۸ هیچ', grdTick_() === 0);
  } catch (e) { fail++; text.push('❌ خطا: ' + (e && e.message)); }
  finally { TG_DRY = keepDry; TG_MEM = keepMem; TG_OUTBOX = keepOut; GRD_ST = keepSt; }
  return { pass: pass, fail: fail, text: text.join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'grdTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['نگهبان مهلت', 'grdTests']); } catch (eS) {}
