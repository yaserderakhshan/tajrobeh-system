/**
 * psy2.gs · v170.23.8 · روان‌پزشکی، بخش ۱: نقش «روان‌پزشک»، اتصال حساب و اصلاح ردیف‌ها (تصمیم یاسر)
 *
 * سنجش پیش از ساخت (آزمون خشک مسیر فعلی v151 و v157، ۱۴ مهر ۱۴۰۵؛ tgPsyTests ۱۵ از ۱۵ سبز):
 *   - روان‌پزشک نقش جدا نداشت: «درمانگر» در استخر «روان‌پزشکی» بود؛ «روان‌پزشکی» نقش مسئول بخش است.
 *   - chat_id فقط با لینک دعوت ساخته می‌شد و بی تأیید مسئول، فرد تازه می‌ساخت (ردیف موجود را وصل نمی‌کرد) ← روان‌پزشکِ
 *     ثبت‌شده بی chat_id هرگز وصل نمی‌شد، وقت هفتگی نداشت و هیچ نوبتی ساخته نمی‌شد (تب‌های نوبت و پرداخت خالی).
 *   - نوع ویزیت و مدت، بستر جلسه، فرم اداری بعد از ویزیت، پرونده‌های نسخه و نامه، تسویه و نمای کامل مسئول نبود.
 *   - روان‌پزشک از رزرو خبر نمی‌گرفت؛ فقط مسئول.
 * این بخش: نقش «روان‌پزشک» (میز خودش)، اتصال حساب با تأیید مسئول روان‌پزشکی (ردیف موجود وصل می‌شود، نه فرد تازه)،
 * و پیش‌نمایش اصلاح ردیف‌های غلط برای Cowork. بخش ۲ (psy3): ویزیت، فرم اداری، پرونده‌ها، رویدادها، نمای مسئول، پیام خوشامد.
 * حالت خشک: TG_MEM['people']، TG_MEM['therrows']، TG_MEM['poolmap']، TG_MEM['ps2:*'].
 */
var PS2_ROLE = 'روان‌پزشک';
var PS2_DESK_BTN = '📋 نوبت‌های من';

function ps2Dry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function ps2Prop_(k, v) {
  if (ps2Dry_()) { if (v !== undefined) { if (v === null) delete TG_MEM['ps2:' + k]; else TG_MEM['ps2:' + k] = v; } return TG_MEM['ps2:' + k] || ''; }
  var P = PropertiesService.getScriptProperties();
  if (v === null) { P.deleteProperty(k); return ''; }
  if (v !== undefined) P.setProperty(k, String(v));
  return P.getProperty(k) || '';
}
/* روان‌پزشک‌ها: افراد با نقش «روان‌پزشک»، یا درمانگرِ استخر «روان‌پزشکی» */
function ps2People_() {
  var pool = {}; tgPsyNames_().forEach(function (n) { pool[tgNorm_(n.name || n)] = 1; });
  return tgPeopleList_().filter(function (p) { return (p.roles || []).indexOf(PS2_ROLE) > -1 || (pool[tgNorm_(p.name)] && (p.roles || []).indexOf('درمانگر') > -1); });
}
function ps2IsDoc_(chat) {
  var c = String(chat);
  return ps2People_().some(function (p) { return String(p.chat || '').split(/[,،;\s]+/).indexOf(c) > -1; });
}
function ps2DocName_(chat) {
  var c = String(chat), p = ps2People_().filter(function (x) { return String(x.chat || '').split(/[,،;\s]+/).indexOf(c) > -1; })[0];
  return p ? p.name : '';
}

/* ───── میز روان‌پزشک ───── */
function ps2Menu_() { return { keyboard: [[TG_PSY_BTN_WEEK, PS2_DESK_BTN]].concat(typeof PS3_INFO_BTN !== 'undefined' ? [[PS3_INFO_BTN]] : []).concat([['↩️ بازگشت']]), resize_keyboard: true }; }
function ps2Desk_(chat, text) {
  var t = String(text || '').trim();
  if (t === TG_PSY_BTN_WEEK) return tgPsyWeeklyStart_(chat);
  if (t === PS2_DESK_BTN) return ps2MyAppts_(chat);
  return tgSend_(chat, '💊 <b>میز روان‌پزشک</b>\nوقت هفتگی و نوبت‌هایتان از همین‌جا.', ps2Menu_());
}
/* نوبت‌های پیش‌رو با نام همین روان‌پزشک (هر دو دفتر) */
function ps2Appts_(name) {
  var out = [];
  [TG_PSY_ACC.tj, TG_PSY_ACC.dr].forEach(function (acc) {
    var rows = ps2Dry_() ? (TG_MEM['psyappt'] || []).filter(function (r) { return r[7] === acc; }) : (function () { var sh = tgPsyTab_(acc, TG_PSY_T_APPT, TG_PSY_H_APPT); return sh && sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, TG_PSY_H_APPT.length).getValues() : []; })();
    rows.forEach(function (r) { if (tgNorm_(r[2]) === tgNorm_(name) && String(r[8] || '').indexOf('منتقل شد') !== 0) out.push(r); });
  });
  return out.sort(function (a, b) { return String(a[5] + a[6]).localeCompare(String(b[5] + b[6])); });
}
function ps2MyAppts_(chat) {
  var name = ps2DocName_(chat); if (!name) return tgSend_(chat, 'حساب شما هنوز به ردیف روان‌پزشک وصل نیست؛ مسئول روان‌پزشکی وصل می‌کند.');
  var today = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  var L = ps2Appts_(name).filter(function (r) { return String(r[5]) >= today; }).slice(0, 15);
  if (!L.length) return tgSend_(chat, '📋 نوبت پیش‌رویی ثبت نیست.', ps2Menu_());
  return tgSend_(chat, '📋 <b>نوبت‌های پیش‌رو</b>\n' + L.map(function (r) { return '• ' + tgEsc_(r[5]) + ' ' + tgFa_(r[6]) + ' · <code>' + r[0] + '</code> · ' + tgEsc_(r[8]); }).join('\n'), ps2Menu_());
}

/* ───── اتصال حساب با تأیید مسئول روان‌پزشکی ─────
   روان‌پزشک لینک start=psyjoin-<توکن> را می‌زند ← درخواست به مسئول با فهرست ردیف‌های روان‌پزشکِ بی chat_id ←
   مسئول ردیف درست را می‌زند ← chat_id و نقش «روان‌پزشک» روی همان ردیف (فرد تازه ساخته نمی‌شود). */
function ps2JoinLink_() { var bot = ''; try { bot = tgBotName_(); } catch (e) {} return 'https://t.me/' + bot + '?start=psyjoin-' + tgPsyTok_('join'); }
function ps2Join_(chat, uname, name, arg) {
  var m = /^psyjoin-([0-9a-z]+)$/i.exec(String(arg || '')); if (!m) return false;
  if (m[1] !== tgPsyTok_('join')) { tgSend_(chat, 'این لینک معتبر نیست. از مسئول روان‌پزشکی لینک تازه بخواهید.'); return true; }
  if (ps2IsDoc_(chat)) { tgSend_(chat, 'حساب شما از قبل به بخش روان‌پزشکی وصل است.', ps2Menu_()); return true; }
  ps2Prop_('PS2_JOIN:' + chat, JSON.stringify({ chat: String(chat), uname: uname || '', name: name || '', at: Date.now() }));
  var cand = ps2People_().filter(function (p) { return !String(p.chat || '').trim(); });
  var kb = cand.slice(0, 8).map(function (p) { return [{ text: '✅ ' + p.name, callback_data: 'ps2:c:' + chat + ':' + p.row }]; });
  kb.push([{ text: '❌ روان‌پزشک ما نیست', callback_data: 'ps2:x:' + chat }]);
  var cs = tgPsyRoleChats_();
  cs.forEach(function (c) { tgNotify_(c, TG_NK.task, '🔗 <b>اتصال حساب روان‌پزشک</b>\nحساب تلگرام ' + (uname ? '@' + tgEsc_(uname) + ' ' : '') + '(' + tgEsc_(name || 'بی‌نام') + ') با لینک روان‌پزشکی آمد.\nکدام ردیف است؟' + (cand.length ? '' : '\n(ردیف روان‌پزشکِ بی‌حسابی پیدا نشد؛ اول ردیفش را در «افراد» بسازید.)'), { ref: 'PS2-JOIN', markup: { inline_keyboard: kb } }); });
  tgSend_(chat, '👋 درخواست اتصال شما به بخش روان‌پزشکی تجربه رفت. بعد از تأیید مسئول روان‌پزشکی، همین‌جا خبر می‌دهیم.');
  return true;
}
function ps2Cb_(chat, data) {
  var a = String(data).split(':'), act = a[1];
  if (!tgPsyIsHead_(chat)) return tgSend_(chat, 'این دکمه مخصوص مسئول روان‌پزشکی است.');
  var who = a[2], req = {}; try { req = JSON.parse(ps2Prop_('PS2_JOIN:' + who) || '{}'); } catch (e) {}
  if (!req.chat) return tgSend_(chat, 'این درخواست دیگر باز نیست.');
  if (act === 'x') { ps2Prop_('PS2_JOIN:' + who, null); tgSend_(who, 'درخواست اتصال شما پذیرفته نشد. اگر اشتباهی شده، با مسئول روان‌پزشکی صحبت کنید.'); return tgSend_(chat, '❌ رد شد.'); }
  if (act === 'c') {
    var row = Number(a[3]), p = tgPeopleList_().filter(function (x) { return x.row === row; })[0];
    if (!p || String(p.chat || '').trim()) return tgSend_(chat, 'این ردیف پیدا نشد یا از قبل حساب دارد.');
    var id = tgPersonSet_(row, { addChat: req.chat, addRole: PS2_ROLE }, 'مسئول روان‌پزشکی', { why: 'اتصال حساب روان‌پزشک (تأیید مسئول)' });
    ps2Prop_('PS2_JOIN:' + who, null);
    try { tgPev_({ id: id, row: row, actor: 'مسئول روان‌پزشکی', channel: 'بات', what: 'اتصال حساب روان‌پزشک', to: 'وصل شد' }); } catch (e) {}
    tgSend_(req.chat, '✅ حساب شما به بخش روان‌پزشکی تجربه وصل شد.', ps2Menu_());
    if (typeof ps3Welcome_ === 'function') { try { ps3Welcome_(req.chat, p.name); } catch (eW) { tgErr_('ps3Welcome_', eW); } }   /* بخش ۲ */
    return tgSend_(chat, '✅ ' + tgEsc_(p.name) + ' وصل شد و نقش «روان‌پزشک» گرفت.');
  }
  return null;
}

/* ───── پیش‌نمایش اصلاح ردیف‌ها (Cowork «اوکی» می‌کند) ───── */
var PS2_FX_TAB = 'اصلاح روان‌پزشکی · پیش‌نمایش';
function ps2FixRows_() {
  var out = [], pool = {};
  tgPsyNames_().forEach(function (n) { pool[tgNorm_(n.name || n)] = 1; });
  tgPeopleList_().forEach(function (p) {
    if (pool[tgNorm_(p.name)] && (p.roles || []).indexOf(PS2_ROLE) < 0) out.push({ tab: 'افراد', row: p.row, field: 'نقش‌ها', from: (p.roles || []).join('، '), to: 'افزودن «' + PS2_ROLE + '»', why: 'در استخر روان‌پزشکی است' });
  });
  Object.keys(pool).forEach(function (k) {
    var it = tgPsyNames_().filter(function (n) { return tgNorm_(n.name || n) === k; })[0], name = it ? (it.name || it) : '';
    var t = name ? tgPrTher_(name) : null;
    if (t && t.school && !/روان‌پزشک/.test(t.school)) out.push({ tab: TG_THER, row: t.row, field: 'مکتب اصلی', from: t.school, to: 'روان‌پزشکی', why: 'روان‌پزشک رویکرد روان‌درمانی ندارد' });
  });
  return out;
}
function ps2FixPreview_() {
  var rows = ps2FixRows_(), sum = 'ردیف برای اصلاح: ' + rows.length + ' (نقش: ' + rows.filter(function (r) { return r.field === 'نقش‌ها'; }).length + '، رویکرد: ' + rows.filter(function (r) { return r.field === 'مکتب اصلی'; }).length + ')';
  if (ps2Dry_()) { TG_MEM['ps2:fx'] = rows; return sum; }
  var ss = tgSS_(), sh = ss.getSheetByName(PS2_FX_TAB) || ss.insertSheet(PS2_FX_TAB);
  if (/^اعمال شد/.test(String(sh.getRange(1, 2).getValue() || ''))) return sum + ' · پیش از این اعمال شده';
  sh.clear(); sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, 3).setValues([['بررسی Cowork: بعد از بررسی، Cowork در B1 «اوکی» می‌نویسد', '', 'v170.23.8 · ' + sum]]).setFontWeight('bold');
  sh.getRange(2, 1, 1, 6).setValues([['تب', 'سطر', 'ستون', 'فعلی', 'درست', 'دلیل']]).setFontWeight('bold').setBackground('#f5f5f8');
  if (rows.length) sh.getRange(3, 1, rows.length, 6).setNumberFormat('@').setValues(rows.map(function (r) { return [r.tab, String(r.row), r.field, r.from, r.to, r.why]; }));
  return sum;
}
function ps2FixMaybe_() {
  if (ps2Prop_('PS2_FX_DONE') === '1') return 0;
  var ok = ps2Dry_() ? TG_MEM['ps2:fxok'] : (function () { var sh = tgSS_().getSheetByName(PS2_FX_TAB); return sh ? String(sh.getRange(1, 2).getValue() || '').trim() : ''; })();
  if (ok !== 'اوکی') return 0;
  ps2Prop_('PS2_FX_DONE', '1');
  var n = 0;
  ps2FixRows_().forEach(function (r) {
    if (r.field === 'نقش‌ها') { tgPersonSet_(r.row, { addRole: PS2_ROLE }, 'Cowork', { why: 'اصلاح روان‌پزشکی v170.23.8' }); n++; }
    else if (r.field === 'مکتب اصلی' && !ps2Dry_()) { var sh = tgSS_().getSheetByName(TG_THER), c = tgTherCol_('مکتب اصلی'); if (c) { sh.getRange(r.row, c).setValue('روان‌پزشکی'); n++; } }
    else if (ps2Dry_()) { (TG_MEM['ps2:therfix'] = TG_MEM['ps2:therfix'] || []).push(r.row); n++; }
  });
  if (!ps2Dry_()) { try { tgSS_().getSheetByName(PS2_FX_TAB).getRange(1, 2).setValue('اعمال شد ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + n); } catch (e) {} }
  return n;
}
/* یک‌بارهٔ خودکار v170.23.8: پیش‌نمایش اصلاح و شمار روان‌پزشک‌های وصل‌نشده. فقط شمار. */
function tgV170238PsyRole() {
  var ps = ps2People_();
  return 'روان‌پزشک: ' + ps.length + ' · بی حساب تلگرام: ' + ps.filter(function (p) { return !String(p.chat || '').trim(); }).length + ' · ' + ps2FixPreview_() + ' · لینک اتصال برای مسئول با /psylinks';
}

/* ───── آزمون ───── */
function ps2Tests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = {};
  try {
    TG_MEM['people'] = [{ row: 2, id: 'P-1', name: 'مسئول نمونه', chat: '200', roles: ['روان‌پزشکی'], status: 'فعال' },
                        { row: 3, id: 'P-2', name: 'دکتر نمونه', chat: '', roles: ['درمانگر'], status: 'فعال' }];
    TG_MEM['psynames'] = ['دکتر نمونه'];
    TG_MEM['therinfo'] = { 'دکتر نمونه': { row: 9, school: 'طرحواره‌درمانی' } };
    ok('روان‌پزشک از استخر شناخته می‌شود', ps2People_().length === 1 && ps2People_()[0].name === 'دکتر نمونه');
    ok('نقش «روان‌پزشک» در فهرست نقش‌ها و دکمه دارد', TG_ROLES.indexOf(PS2_ROLE) > -1 && !!TG_ROLE_BTN[PS2_ROLE]);
    var tok = tgPsyTok_('join');
    ok('لینک غلط رد می‌شود', ps2Join_('500', 'drsample', 'نمونه', 'psyjoin-bad') === true && !ps2Prop_('PS2_JOIN:500'));
    TG_OUTBOX = [];
    ok('لینک درست ← درخواست به مسئول با ردیف بی‌حساب', ps2Join_('500', 'drsample', 'نمونه', 'psyjoin-' + tok) === true && !!ps2Prop_('PS2_JOIN:500') &&
      JSON.stringify([TG_MEM['notify'] || [], TG_OUTBOX]).indexOf('اتصال حساب روان‌پزشک') > -1 && JSON.stringify([TG_MEM['notify'] || [], TG_OUTBOX]).indexOf('ps2:c:500:3') > -1);
    ok('هنوز نه نقش و نه chat (بی تأیید)', !TG_MEM['people'][1].chat && TG_MEM['people'][1].roles.indexOf(PS2_ROLE) < 0);
    ps2Cb_('999', 'ps2:c:500:3');
    ok('غیرمسئول نمی‌تواند وصل کند', !TG_MEM['people'][1].chat);
    ps2Cb_('200', 'ps2:c:500:3');
    ok('تأیید مسئول ← همان ردیف chat و نقش می‌گیرد (فرد تازه نه)', TG_MEM['people'][1].chat === '500' && TG_MEM['people'][1].roles.indexOf(PS2_ROLE) > -1 && TG_MEM['people'].length === 2 && !ps2Prop_('PS2_JOIN:500'));
    ok('روان‌پزشک وصل‌شده میز خودش را دارد', ps2IsDoc_('500') && ps2DocName_('500') === 'دکتر نمونه');
    TG_MEM['psyappt'] = [['PS-1', new Date(), 'دکتر نمونه', 'مراجع', '9', '2099-01-02', '10:00', TG_PSY_ACC.tj, 'رزرو شده', 'درگاه تجربه', '']];
    TG_OUTBOX = []; ps2MyAppts_('500');
    ok('نوبت‌های من', TG_OUTBOX.some(function (x) { return /PS-1/.test(x.text); }));
    /* اصلاح ردیف‌ها */
    TG_MEM['people'][1].roles = ['درمانگر']; TG_MEM['people'][1].chat = '';
    var sum = ps2FixPreview_();
    ok('پیش‌نمایش: نقش و رویکرد غلط', /نقش: 1/.test(sum) && /رویکرد: 1/.test(sum), sum);
    ok('بی «اوکی» Cowork تغییری نیست', ps2FixMaybe_() === 0 && TG_MEM['people'][1].roles.indexOf(PS2_ROLE) < 0);
    TG_MEM['ps2:fxok'] = 'اوکی';
    ok('با «اوکی» یک بار', ps2FixMaybe_() === 2 && TG_MEM['people'][1].roles.indexOf(PS2_ROLE) > -1 && ps2FixMaybe_() === 0);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'ps2Tests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['روان‌پزشکی: نقش و اتصال (v170.23.8)', 'ps2Tests']); } catch (ePs2) {}
