/**
 * school2.gs · v166.25 · ۹ مهر ۱۴۰۵ · رویکرد تازهٔ مدرسه
 *
 * سه تب تازهٔ هاب مدرسه از راه بات پر می‌شوند، نه دستی:
 *   ۱) «منتورینگ · جلسه‌ها»: منتور با «📝 ثبت جلسهٔ منتورینگ» در چند لمس یک سطر برای هر دانشجو می‌سازد.
 *      محتوای جلسه هرگز پرسیده نمی‌شود. بعد از ثبت، از هر دانشجو بازخورد ۱ تا ۵ گرفته می‌شود.
 *   ۲) «جلسه‌های بالینی»: «نمایندهٔ کلاس» پیشنهاد جلسه یا ارائه (کیس، مقاله) می‌دهد، سوپروایزر حلقه از بات
 *      تأیید یا رد می‌کند، حلقه خبردار می‌شود و یک روز پیش از جلسه یادآوری می‌گیرد.
 *   ۳) «نردبان دانشجو»: «📈 مسیر من» ردیف خود دانشجو را فقط برای خواندن نشان می‌دهد.
 * به‌علاوه: یادآوری هفتگی به نماینده و منتور حلقه برای دانشجوهای «در انتظار اتصال»، و فعال شدن ردیف عضویت
 * وقتی دانشجو خودش وصل می‌شود.
 *
 * نقش‌ها از تب «افراد»: «منتور» و «نمایندهٔ کلاس»، با حلقه در ستون «حلقه یا دوره».
 * ستون‌ها با نام سرستون خوانده و نوشته می‌شوند؛ اگر تب یا ستونی نبود، آخر سطر اول اضافه می‌شود.
 * دست نمی‌زند به: چرخهٔ لید، رویدادها، پرداخت.
 * قلاب‌ها در telegram.gs: tgOnCallback_ (smn: و scl:)، tgSchText_ (scText_)، tgSchoolMenu_ و tgSchoolRoute_،
 * tgPathShow_ (scLadderText_)، tgEduConnect_ (scMemActivate_)، tgDaily (scDaily_)، TG_SUITES (scTests).
 */

var SC_T_MENT = 'منتورینگ · جلسه‌ها';
var SC_T_CLIN = 'جلسه‌های بالینی';
var SC_T_LADDER = 'نردبان دانشجو';
var SC_MENT_HEAD = ['شناسه', 'کد جلسه', 'تاریخ ثبت', 'تاریخ جلسه', 'منتور', 'chat منتور', 'حلقه', 'نوع جلسه',
                    'دانشجو', 'chat دانشجو', 'مدت (دقیقه)', 'بازخورد دانشجو (۱ تا ۵)', 'تاریخ بازخورد'];
var SC_CLIN_HEAD = ['شناسه', 'تاریخ پیشنهاد', 'حلقه', 'نماینده', 'chat نماینده', 'نوع', 'عنوان', 'ارائه‌دهنده',
                    'تاریخ جلسه', 'وضعیت', 'سوپروایزر', 'تاریخ تصمیم', 'یادآوری به حلقه'];
var SC_CLIN_TYPES = ['جلسهٔ بالینی', 'ارائهٔ کیس', 'ارائهٔ مقاله'];
var SC_ST = { prop: 'پیشنهاد', ok: 'تأیید شد', no: 'رد شد' };
var SC_ROLE_MENTOR = 'منتور';
var SC_ROLE_REP = 'نمایندهٔ کلاس';
var SC_BTN_MENT = '📝 ثبت جلسهٔ منتورینگ';
var SC_BTN_CLIN = '🗣 پیشنهاد جلسهٔ بالینی';
var SC_BTN_CLIN_LIST = '📋 جلسه‌های بالینی حلقه';
var SC_BTN_PENDING = '🔗 دانشجوهای وصل‌نشده';
var SC_MEM_WAIT = 'در انتظار اتصال';

/* ---------- شیت ---------- */
function scEnsure_(tab, head) {
  if (TG_DRY) return null;
  var sh = tgSchSheet_(tab, head);
  var have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(function (h) { return String(h || '').trim(); });
  var miss = head.filter(function (h) { return have.indexOf(h) < 0; });
  if (miss.length) {
    var at = have.filter(String).length ? sh.getLastColumn() + 1 : 1;
    if (sh.getMaxColumns() < at + miss.length - 1) sh.insertColumnsAfter(sh.getMaxColumns(), at + miss.length - 1 - sh.getMaxColumns());
    sh.getRange(1, at, 1, miss.length).setValues([miss]).setFontWeight('bold').setBackground('#f9f2f2');
  }
  tgCpDrop_();
  return sh;
}
function scRead_(tab, head) { if (!TG_DRY) scEnsure_(tab, head); tgCpDrop_(); return tgCpRead_(tab); }
function scAdd_(tab, head, obj) { if (!TG_DRY) scEnsure_(tab, head); var r = tgCpAdd_(tab, obj); tgCpDrop_(); return r; }
function scSet_(tab, row, ch) { tgCpSet_(tab, row, ch); tgCpDrop_(); }
function scNextId_(rows, prefix) {
  var max = 0;
  rows.forEach(function (r) { var m = String(r['شناسه'] || '').match(/(\d+)/); if (m) max = Math.max(max, Number(m[1])); });
  return prefix + '-' + (max + 1);
}
function scToday_() { return tgJDateFull_(new Date(), TG_TZ); }
function scState_(k, chat, v) {
  if (v === undefined) { var raw = tgGetVal_(k, chat); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } }
  if (v === null) return tgDel_(k, chat);
  return tgSetVal_(k, chat, JSON.stringify(v));
}

/* ---------- آدم‌ها و حلقه ---------- */
function scPerson_(chat) {
  if (TG_DRY) return TG_MEM['person'] || null;
  try { return tgWhoPerson_(chat, ''); } catch (e) { return null; }
}
function scHas_(p, role) { return !!(p && p.roles && p.roles.indexOf(role) > -1); }
function scCircleOf_(v) { return tgCircleKey_(v); }
/* اعضای یک حلقه از «عضویت دانشجو» (فعال و در انتظار اتصال) */
function scMembers_(circle) {
  var key = scCircleOf_(circle);
  if (!key) return [];
  return tgCpRead_(TG_SCH_T_MEM).filter(function (r) {
    var st = String(r['وضعیت'] || '').trim();
    if (st && st !== 'فعال' && st !== SC_MEM_WAIT) return false;
    return scCircleOf_(r['حلقه']) === key || scCircleOf_(r['کد حلقه']) === key;
  }).map(function (r) {
    return { row: r._row, name: String(r['نام'] || '').trim(), chat: tgChatIds_(r['chat_id'])[0] || '', status: String(r['وضعیت'] || '').trim() };
  });
}
/* کسانی از «افراد» که این نقش را در همین حلقه دارند */
function scPeopleOf_(role, circle) {
  var key = scCircleOf_(circle), out = [];
  if (!key) return out;
  (TG_DRY ? (TG_MEM['people'] || []) : tgPeopleList_()).forEach(function (p) {
    if (scHas_(p, role) && scCircleOf_(p.circle) === key && p.chat) out.push({ name: p.name, chat: tgChatIds_(p.chat)[0] || '' });
  });
  return out.filter(function (x) { return x.chat; });
}

/* ==================================================================
   ۱) منتورینگ
   ================================================================== */
function scMentStart_(chat) {
  var p = scPerson_(chat);
  if (!scHas_(p, SC_ROLE_MENTOR)) return tgSend_(chat, 'این بخش برای منتورهای مدرسه است.');
  var circle = scCircleOf_(p.circle);
  if (!circle) return tgSend_(chat, 'حلقهٔ شما در تب «افراد» ثبت نشده. به مسئول مدرسه بگویید.');
  scState_('mtw', chat, { step: 'kind', circle: circle, mentor: p.name });
  return tgSend_(chat, '📝 <b>ثبت جلسهٔ منتورینگ</b> · حلقهٔ ' + tgEsc_(tgFa_(circle)) + '\n\nجلسه فردی بود یا گروهی؟',
    { inline_keyboard: [[{ text: '👤 فردی', callback_data: 'smn:k:f' }, { text: '👥 گروهی', callback_data: 'smn:k:g' }],
                        [{ text: '↩️ بی‌خیال', callback_data: 'smn:x' }]] });
}

function scMentStudents_(chat, d) {
  var list = scMembers_(d.circle);
  if (!list.length) { scState_('mtw', chat, null); return tgSend_(chat, 'در «عضویت دانشجو» هنوز دانشجویی برای این حلقه ثبت نشده. به مسئول مدرسه بگویید.'); }
  if (d.kind === 'g') {
    d.students = list.map(function (m) { return { name: m.name, chat: m.chat }; });
    return scMentAskDate_(chat, d);
  }
  d.step = 'stu';
  scState_('mtw', chat, d);
  var kb = [];
  for (var i = 0; i < list.length && i < 30; i++) kb.push([{ text: list[i].name || ('دانشجوی ' + (i + 1)), callback_data: 'smn:s:' + i }]);
  kb.push([{ text: '↩️ بی‌خیال', callback_data: 'smn:x' }]);
  return tgSend_(chat, 'با کدام دانشجو؟', { inline_keyboard: kb });
}

function scMentAskDate_(chat, d) {
  d.step = 'date';
  scState_('mtw', chat, d);
  return tgSend_(chat, 'جلسه کی بود؟', { inline_keyboard: [[{ text: 'امروز', callback_data: 'smn:d:0' }, { text: 'دیروز', callback_data: 'smn:d:1' }],
    [{ text: 'روز دیگر (می‌نویسم)', callback_data: 'smn:d:x' }]] });
}

function scMentAskMin_(chat, d) {
  d.step = 'min';
  scState_('mtw', chat, d);
  return tgSend_(chat, 'چقدر طول کشید؟', { inline_keyboard: [[30, 45, 60, 90].map(function (m) { return { text: tgFa_(String(m)) + ' دقیقه', callback_data: 'smn:m:' + m }; })] });
}

function scMentSave_(chat, d) {
  scState_('mtw', chat, null);
  var rows = scRead_(SC_T_MENT, SC_MENT_HEAD), now = scToday_();
  var code = 'MT-' + (Utilities.formatDate(new Date(), TG_TZ, 'yyMMddHHmm')) + '-' + String(chat).slice(-3);
  var made = [];
  d.students.forEach(function (s) {
    var id = scNextId_(rows.concat(made.map(function (x) { return { 'شناسه': x.id }; })), 'MS');
    scAdd_(SC_T_MENT, SC_MENT_HEAD, { 'شناسه': id, 'کد جلسه': code, 'تاریخ ثبت': now, 'تاریخ جلسه': d.date, 'منتور': d.mentor,
      'chat منتور': String(chat), 'حلقه': d.circle, 'نوع جلسه': d.kind === 'g' ? 'گروهی' : 'فردی', 'دانشجو': s.name,
      'chat دانشجو': s.chat || '', 'مدت (دقیقه)': d.min });
    made.push({ id: id, s: s });
  });
  var asked = 0;
  made.forEach(function (x) {
    if (!x.s.chat) return;
    tgSend_(x.s.chat, '🌱 جلسهٔ منتورینگ ' + tgEsc_(d.date) + ' با ' + tgEsc_(d.mentor) + ' برایتان چطور بود؟\nاز ۱ (کم) تا ۵ (عالی) یکی را بزنید.',
      { inline_keyboard: [[1, 2, 3, 4, 5].map(function (n) { return { text: tgFa_(String(n)), callback_data: 'smn:f:' + x.id + ':' + n }; })] });
    asked++;
  });
  return tgSend_(chat, '✅ ثبت شد: ' + tgFa_(String(made.length)) + ' سطر در «' + SC_T_MENT + '».' +
    (asked ? '\nاز ' + tgFa_(String(asked)) + ' دانشجو بازخورد خواسته شد.' : ''), tgSchoolMenu_(SC_ROLE_MENTOR));
}

function scMentFeedback_(chat, id, n) {
  n = Number(n);
  if (!(n >= 1 && n <= 5)) return null;
  var r = scRead_(SC_T_MENT, SC_MENT_HEAD).filter(function (x) { return String(x['شناسه']) === String(id); })[0];
  if (!r || String(r['chat دانشجو']) !== String(chat)) return tgSend_(chat, 'این بازخورد پیدا نشد.');
  if (String(r['بازخورد دانشجو (۱ تا ۵)'] || '').trim()) return tgSend_(chat, 'بازخوردتان قبلاً ثبت شده. ممنون.');
  scSet_(SC_T_MENT, r._row, { 'بازخورد دانشجو (۱ تا ۵)': n, 'تاریخ بازخورد': scToday_() });
  return tgSend_(chat, 'ممنون، ثبت شد. 🌱');
}

/* ==================================================================
   ۲) جلسه‌های بالینی (نمایندهٔ کلاس ← سوپروایزر ← حلقه)
   ================================================================== */
function scClinStart_(chat) {
  var p = scPerson_(chat);
  if (!scHas_(p, SC_ROLE_REP)) return tgSend_(chat, 'این بخش برای نمایندهٔ کلاس است.');
  var circle = scCircleOf_(p.circle);
  if (!circle) return tgSend_(chat, 'حلقهٔ شما در تب «افراد» ثبت نشده. به مسئول مدرسه بگویید.');
  scState_('csw', chat, { step: 'type', circle: circle, rep: p.name });
  return tgSend_(chat, '🗣 <b>پیشنهاد جلسهٔ بالینی</b> · حلقهٔ ' + tgEsc_(tgFa_(circle)) + '\n\nچه نوعی است؟',
    { inline_keyboard: SC_CLIN_TYPES.map(function (t, i) { return [{ text: t, callback_data: 'scl:t:' + i }]; }).concat([[{ text: '↩️ بی‌خیال', callback_data: 'scl:x' }]]) });
}

function scClinSave_(chat, d) {
  scState_('csw', chat, null);
  var rows = scRead_(SC_T_CLIN, SC_CLIN_HEAD), id = scNextId_(rows, 'CS');
  scAdd_(SC_T_CLIN, SC_CLIN_HEAD, { 'شناسه': id, 'تاریخ پیشنهاد': scToday_(), 'حلقه': d.circle, 'نماینده': d.rep, 'chat نماینده': String(chat),
    'نوع': d.type, 'عنوان': d.title, 'ارائه‌دهنده': d.who, 'تاریخ جلسه': d.date, 'وضعیت': SC_ST.prop });
  var to = scPeopleOf_('سوپروایزر', d.circle);
  if (!to.length) to = (TG_DRY ? (TG_MEM['schowners'] || []) : tgSchoolOwners_()).map(function (o) { return { name: o.name, chat: tgChatIds_(o.chat)[0] || '' }; });
  var card = '🗣 <b>پیشنهاد ' + tgEsc_(d.type) + '</b> · حلقهٔ ' + tgEsc_(tgFa_(d.circle)) + '\n\n' +
    'عنوان: ' + tgEsc_(d.title) + '\nارائه‌دهنده: ' + tgEsc_(d.who) + '\nتاریخ: ' + tgEsc_(d.date) + '\nنماینده: ' + tgEsc_(d.rep);
  var kb = { inline_keyboard: [[{ text: '✅ تأیید', callback_data: 'scl:ok:' + id }, { text: '✖️ رد', callback_data: 'scl:no:' + id }]] };
  to.forEach(function (x) { if (x.chat) tgSend_(x.chat, card, kb); });
  return tgSend_(chat, '✅ پیشنهاد ثبت شد و برای تأیید سوپروایزر رفت.', tgSchoolMenu_(SC_ROLE_REP));
}

function scClinDecide_(chat, uname, id, ok) {
  var p = scPerson_(chat);
  var can = scHas_(p, 'سوپروایزر') || (TG_DRY ? !!TG_MEM['schowner'] : !!tgSchOwnerOf_(chat, uname));
  if (!can) return tgSend_(chat, 'این دکمه برای سوپروایزر حلقه است.');
  var r = scRead_(SC_T_CLIN, SC_CLIN_HEAD).filter(function (x) { return String(x['شناسه']) === String(id); })[0];
  if (!r) return tgSend_(chat, 'این پیشنهاد پیدا نشد.');
  if (String(r['وضعیت']) !== SC_ST.prop) return tgSend_(chat, 'این پیشنهاد قبلاً بررسی شده: ' + tgEsc_(String(r['وضعیت'])));
  var by = (p && p.name) || 'مدرسه';
  scSet_(SC_T_CLIN, r._row, { 'وضعیت': ok ? SC_ST.ok : SC_ST.no, 'سوپروایزر': by, 'تاریخ تصمیم': scToday_() });
  var line = tgEsc_(r['نوع']) + ' «' + tgEsc_(r['عنوان']) + '» · ' + tgEsc_(r['تاریخ جلسه']);
  var rep = tgChatIds_(r['chat نماینده'])[0];
  if (rep) tgSend_(rep, (ok ? '✅ تأیید شد: ' : '✖️ تأیید نشد: ') + line);
  if (ok) {
    var n = 0;
    scMembers_(r['حلقه']).forEach(function (m) { if (m.chat) { tgSend_(m.chat, '🗣 <b>' + tgEsc_(r['نوع']) + ' در حلقهٔ شما</b>\n\n«' + tgEsc_(r['عنوان']) + '» · ارائه: ' + tgEsc_(r['ارائه‌دهنده']) + '\nتاریخ: ' + tgEsc_(r['تاریخ جلسه'])); n++; } });
    return tgSend_(chat, '✅ تأیید شد و به ' + tgFa_(String(n)) + ' نفر از حلقه خبر رسید.');
  }
  return tgSend_(chat, 'رد شد و به نماینده خبر رسید.');
}

function scClinList_(chat) {
  var p = scPerson_(chat), circle = scCircleOf_(p && p.circle);
  var rows = scRead_(SC_T_CLIN, SC_CLIN_HEAD).filter(function (r) { return scCircleOf_(r['حلقه']) === circle; }).slice(-10);
  if (!rows.length) return tgSend_(chat, 'هنوز جلسهٔ بالینی برای حلقهٔ شما ثبت نشده.');
  return tgSend_(chat, '📋 <b>جلسه‌های بالینی حلقه</b>\n\n' + rows.map(function (r) {
    return '• ' + tgEsc_(r['تاریخ جلسه']) + ' · ' + tgEsc_(r['نوع']) + ' «' + tgEsc_(r['عنوان']) + '» · ' + tgEsc_(r['وضعیت']);
  }).join('\n'));
}

/* یک روز پیش از جلسهٔ تأییدشده، یادآوری به حلقه (از tgDaily، ساعت ۲۱) */
function scClinRemind_(now) {
  var tomorrow = Utilities.formatDate(new Date(now.getTime() + 86400000), TG_TZ, 'yyyy-MM-dd'), n = 0;
  scRead_(SC_T_CLIN, SC_CLIN_HEAD).forEach(function (r) {
    if (String(r['وضعیت']) !== SC_ST.ok || String(r['یادآوری به حلقه'] || '').trim()) return;
    var at = tgCpAt_(r['تاریخ جلسه'], '', false);
    if (!at || Utilities.formatDate(at, TG_TZ, 'yyyy-MM-dd') !== tomorrow) return;
    scMembers_(r['حلقه']).forEach(function (m) { if (m.chat) { tgSendAs_(TG_NK.remind, m.chat, '⏰ فردا ' + tgEsc_(r['نوع']) + ' «' + tgEsc_(r['عنوان']) + '» در حلقهٔ شماست.'); n++; } });
    scSet_(SC_T_CLIN, r._row, { 'یادآوری به حلقه': scToday_() });
  });
  return n;
}

/* ==================================================================
   ۳) نردبان دانشجو (فقط خواندن) و اتصال
   ================================================================== */
var SC_LADDER_HIDE = /chat|شماره|تلفن|ایمیل|email|یوزرنیم|شناسه/i;
function scLadderText_(chat) {
  try {
    var rows;
    if (TG_DRY) rows = TG_MEM['cp:' + SC_T_LADDER] || null;
    else { var sh = tgSchSS_().getSheetByName(SC_T_LADDER); if (!sh) return ''; tgCpDrop_(); rows = tgCpRead_(SC_T_LADDER); }
    if (!rows || !rows.length) return '';
    var p = scPerson_(chat), me = null;
    for (var i = 0; i < rows.length && !me; i++) {
      for (var k in rows[i]) if (/chat/i.test(k) && tgChatIds_(rows[i][k]).indexOf(String(chat)) > -1) { me = rows[i]; break; }
    }
    if (!me && p && p.name) for (var j = 0; j < rows.length && !me; j++) {
      for (var k2 in rows[j]) if (/^نام/.test(k2) && rows[j][k2] && tgSameName_(String(rows[j][k2]), p.name)) { me = rows[j]; break; }
    }
    if (!me) return '';
    var L = [];
    for (var h in me) {
      if (h === '_row' || SC_LADDER_HIDE.test(h)) continue;
      var v = me[h]; if (v instanceof Date) v = tgJDate_(v, TG_TZ);
      v = String(v == null ? '' : v).trim();
      if (v) L.push('• ' + tgEsc_(h) + ': ' + tgEsc_(v));
    }
    return L.length ? '📈 <b>ردیف شما در نردبان دانشجو</b>\n' + L.join('\n') + '\n\n' : '';
  } catch (e) { tgErr_('scLadderText_: ' + e); return ''; }
}

/* دانشجو خودش وصل شد: ردیف‌های «در انتظار اتصال» او در «عضویت دانشجو» فعال می‌شوند و chat_id می‌گیرند */
function scMemActivate_(chat, p) {
  if (!p || !p.name) return 0;
  var n = 0;
  tgCpRead_(TG_SCH_T_MEM).forEach(function (r) {
    if (String(r['وضعیت'] || '').trim() !== SC_MEM_WAIT) return;
    if (!tgSameName_(String(r['نام'] || ''), p.name)) return;
    var ch = { 'وضعیت': 'فعال' };
    if (!tgChatIds_(r['chat_id']).length) ch['chat_id'] = String(chat);
    tgCpSet_(TG_SCH_T_MEM, r._row, ch); n++;
  });
  tgCpDrop_();
  return n;
}

/* دانشجوهای وصل‌نشدهٔ یک حلقه، برای نماینده یا منتور (با لینک اتصال) */
function scPendingText_(circle) {
  var w = scMembers_(circle).filter(function (m) { return m.status === SC_MEM_WAIT; });
  if (!w.length) return '';
  return '🔗 <b>دانشجوهای وصل‌نشدهٔ حلقهٔ ' + tgEsc_(tgFa_(circle)) + '</b>\n' + w.map(function (m) { return '• ' + tgEsc_(m.name || 'بی‌نام'); }).join('\n') +
    '\n\nاین لینک را برایشان بفرستید تا به بات وصل شوند:\nhttps://t.me/' + tgBotName_() + '?start=edu_s';
}
function scPendingShow_(chat) {
  var p = scPerson_(chat), c = scCircleOf_(p && p.circle);
  if (!c) return tgSend_(chat, 'حلقهٔ شما در تب «افراد» ثبت نشده.');
  return tgSend_(chat, scPendingText_(c) || 'همهٔ دانشجوهای حلقه وصل‌اند. 👏');
}
/* هفته‌ای یک بار (شنبه، از tgDaily) به نماینده و منتور هر حلقه */
function scConnRemind_(now) {
  if (Utilities.formatDate(now, TG_TZ, 'u') !== '6') return 0;
  var circles = {}, n = 0;
  tgCpRead_(TG_SCH_T_MEM).forEach(function (r) { if (String(r['وضعیت'] || '').trim() === SC_MEM_WAIT) { var c = scCircleOf_(r['حلقه']) || scCircleOf_(r['کد حلقه']); if (c) circles[c] = 1; } });
  Object.keys(circles).forEach(function (c) {
    var txt = scPendingText_(c);
    if (!txt) return;
    scPeopleOf_(SC_ROLE_REP, c).concat(scPeopleOf_(SC_ROLE_MENTOR, c)).forEach(function (x) { tgSendAs_(TG_NK.remind, x.chat, txt); n++; });
  });
  return n;
}

function scDaily_(now) {
  try { scClinRemind_(now); } catch (e) { tgErr_('scClinRemind_: ' + e); }
  try { scConnRemind_(now); } catch (e2) { tgErr_('scConnRemind_: ' + e2); }
}

/* ==================================================================
   مسیریابی
   ================================================================== */
function scText_(chat, text) {
  var t = String(text || '').trim();
  if (!t) return false;
  if (t === SC_BTN_MENT || tgCmd_(t) === '/mentoring') { scMentStart_(chat); return true; }
  if (t === SC_BTN_CLIN || tgCmd_(t) === '/clinical') { scClinStart_(chat); return true; }
  if (t === SC_BTN_CLIN_LIST) { scClinList_(chat); return true; }
  if (t === SC_BTN_PENDING) { scPendingShow_(chat); return true; }
  var esc = (t === 'انصراف' || t === '↩️ بازگشت' || t.indexOf('/') === 0 || tgIsBtnLike_(t));
  var m = scState_('mtw', chat);
  if (m && m.step === 'date') {
    if (esc) { scState_('mtw', chat, null); return false; }
    var j = tgCpJ_(t);
    if (!j) { tgSend_(chat, 'این تاریخ را نفهمیدم. مثل «۸ مهر» یا «۱۴۰۵/۰۷/۰۸» بنویسید.'); return true; }
    m.date = tgCpJText_(j);
    scMentAskMin_(chat, m); return true;
  }
  var c = scState_('csw', chat);
  if (c) {
    if (esc) { scState_('csw', chat, null); return false; }
    if (c.step === 'title') { c.title = t.slice(0, 200); c.step = 'who'; scState_('csw', chat, c); tgSend_(chat, 'چه کسی ارائه می‌دهد؟ (اسم را بنویسید)'); return true; }
    if (c.step === 'who') { c.who = t.slice(0, 80); c.step = 'date'; scState_('csw', chat, c); tgSend_(chat, 'چه تاریخی؟ مثل «۱۸ مهر» یا «۱۴۰۵/۰۷/۱۸»'); return true; }
    if (c.step === 'date') {
      var j2 = tgCpJ_(t);
      if (!j2) { tgSend_(chat, 'این تاریخ را نفهمیدم. مثل «۱۸ مهر» بنویسید.'); return true; }
      c.date = tgCpJText_(j2); scClinSave_(chat, c); return true;
    }
  }
  return false;
}

function scOnCb_(cq, data, chat, uname) {
  var p = String(data).split(':'), k = p[0], a = p[1];
  if (k === 'smn') {
    if (a === 'f') return scMentFeedback_(chat, p[2], p[3]);
    var d = scState_('mtw', chat);
    if (a === 'x') { scState_('mtw', chat, null); return tgSend_(chat, 'باشد، ثبت نشد.', tgSchoolMenu_(SC_ROLE_MENTOR)); }
    if (!d) return tgSend_(chat, 'این گفت‌وگو تمام شده. دوباره «' + SC_BTN_MENT + '» را بزنید.');
    if (a === 'k') { d.kind = p[2] === 'g' ? 'g' : 'f'; return scMentStudents_(chat, d); }
    if (a === 's') { var s = scMembers_(d.circle)[Number(p[2])]; if (!s) return tgSend_(chat, 'این دانشجو پیدا نشد.'); d.students = [{ name: s.name, chat: s.chat }]; return scMentAskDate_(chat, d); }
    if (a === 'd') {
      if (p[2] === 'x') { d.step = 'date'; scState_('mtw', chat, d); return tgSend_(chat, 'تاریخ جلسه را بنویسید، مثل «۸ مهر».'); }
      d.date = tgJDateFull_(new Date(Date.now() - Number(p[2] || 0) * 86400000), TG_TZ);
      return scMentAskMin_(chat, d);
    }
    if (a === 'm') { d.min = Number(p[2]) || 0; return scMentSave_(chat, d); }
    return null;
  }
  if (k === 'scl') {
    if (a === 'ok' || a === 'no') return scClinDecide_(chat, uname, p[2], a === 'ok');
    var c = scState_('csw', chat);
    if (a === 'x') { scState_('csw', chat, null); return tgSend_(chat, 'باشد، ثبت نشد.', tgSchoolMenu_(SC_ROLE_REP)); }
    if (!c) return tgSend_(chat, 'این گفت‌وگو تمام شده. دوباره «' + SC_BTN_CLIN + '» را بزنید.');
    if (a === 't') { c.type = SC_CLIN_TYPES[Number(p[2])] || SC_CLIN_TYPES[0]; c.step = 'title'; scState_('csw', chat, c); return tgSend_(chat, 'عنوانش چیست؟ (یک خط)'); }
  }
  return null;
}

/* ==================================================================
   آزمون (دادهٔ ساختگی)
   ================================================================== */
function scTests() {
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  function cb(chat, data) { return scOnCb_({ id: '1', from: { id: chat } }, data, chat, ''); }
  function sent(chat) { return TG_OUTBOX.filter(function (o) { return o.kind === 'msg' && o.chat === String(chat); }); }
  try {
    TG_MEM['cp:' + TG_SCH_T_MEM] = [
      { 'نام': 'دانشجوی الف', 'chat_id': '9101', 'حلقه': 'حلقهٔ ۱۴', 'وضعیت': 'فعال' },
      { 'نام': 'دانشجوی ب', 'chat_id': '', 'حلقه': 'حلقهٔ ۱۴', 'وضعیت': SC_MEM_WAIT },
      { 'نام': 'دانشجوی پ', 'chat_id': '9103', 'حلقه': 'حلقهٔ ۷', 'وضعیت': 'فعال' }];
    TG_MEM['person'] = { name: 'منتور نمونه', roles: [SC_ROLE_MENTOR], circle: '۱۴', chat: '9001' };
    /* منتورینگ گروهی */
    scText_(9001, SC_BTN_MENT);
    ok('منتور: نوع جلسه پرسیده شد، نه محتوا', sent(9001).some(function (o) { return /فردی بود یا گروهی/.test(o.text); }) && !TG_OUTBOX.some(function (o) { return /محتوا|درباره|موضوع جلسه/.test(String(o.text)); }));
    cb(9001, 'smn:k:g'); cb(9001, 'smn:d:0'); TG_OUTBOX = []; cb(9001, 'smn:m:60');
    var rows = TG_MEM['cp:' + SC_T_MENT] || [];
    ok('منتور: برای هر دانشجوی حلقه یک سطر (فقط حلقهٔ ۱۴)', rows.length === 2 && rows.every(function (r) { return r['حلقه'] === '14' && r['مدت (دقیقه)'] === 60 && r['نوع جلسه'] === 'گروهی'; }));
    ok('منتور: فقط از دانشجوی وصل‌شده بازخورد خواسته شد', sent(9101).length === 1 && /۱ \(کم\) تا ۵/.test(sent(9101)[0].text) && TG_OUTBOX.filter(function (o) { return /چطور بود/.test(String(o.text)); }).length === 1);
    var fid = rows[0]['شناسه'];
    TG_OUTBOX = []; cb(9103, 'smn:f:' + fid + ':4');
    ok('بازخورد: فقط خود دانشجو', !(rows[0]['بازخورد دانشجو (۱ تا ۵)']));
    cb(9101, 'smn:f:' + fid + ':4');
    ok('بازخورد: ۴ ثبت شد', rows[0]['بازخورد دانشجو (۱ تا ۵)'] === 4);
    TG_OUTBOX = []; cb(9101, 'smn:f:' + fid + ':2');
    ok('بازخورد: دوباره عوض نمی‌شود', rows[0]['بازخورد دانشجو (۱ تا ۵)'] === 4);
    TG_MEM['person'] = { name: 'غیرمنتور', roles: ['دانشجو'], circle: '۱۴', chat: '9101' };
    TG_OUTBOX = []; scText_(9101, SC_BTN_MENT);
    ok('منتور: دانشجو نمی‌تواند جلسه ثبت کند', sent(9101).some(function (o) { return /برای منتورهای/.test(o.text); }));
    /* جلسهٔ بالینی */
    TG_MEM['people'] = [{ name: 'سوپروایزر نمونه', roles: ['سوپروایزر'], circle: '۱۴', chat: '9201' }];
    TG_MEM['person'] = { name: 'نماینده نمونه', roles: ['دانشجو', SC_ROLE_REP], circle: '۱۴', chat: '9301' };
    scText_(9301, SC_BTN_CLIN); cb(9301, 'scl:t:1'); scText_(9301, 'کیس نمونه'); scText_(9301, 'ارائه‌دهندهٔ نمونه');
    TG_OUTBOX = []; scText_(9301, '۱۸ مهر ۱۴۰۵');
    var cl = (TG_MEM['cp:' + SC_T_CLIN] || [])[0] || {};
    ok('بالینی: سطر با وضعیت «پیشنهاد»', cl['نوع'] === 'ارائهٔ کیس' && cl['عنوان'] === 'کیس نمونه' && cl['وضعیت'] === SC_ST.prop && /مهر/.test(cl['تاریخ جلسه']));
    ok('بالینی: کارت تأیید به سوپروایزر حلقه', sent(9201).some(function (o) { return JSON.stringify(o.markup || {}).indexOf('scl:ok:' + cl['شناسه']) > -1; }));
    TG_MEM['person'] = { name: 'دانشجوی الف', roles: ['دانشجو'], circle: '۱۴', chat: '9101' };
    TG_OUTBOX = []; cb(9101, 'scl:ok:' + cl['شناسه']);
    ok('بالینی: دانشجو نمی‌تواند تأیید کند', cl['وضعیت'] === SC_ST.prop);
    TG_MEM['person'] = { name: 'سوپروایزر نمونه', roles: ['سوپروایزر'], circle: '۱۴', chat: '9201' };
    TG_OUTBOX = []; cb(9201, 'scl:ok:' + cl['شناسه']);
    ok('بالینی: تأیید سوپروایزر، خبر به نماینده و حلقه', cl['وضعیت'] === SC_ST.ok && sent(9301).length === 1 && sent(9101).length === 1 && sent(9103).length === 0);
    TG_OUTBOX = []; cb(9201, 'scl:ok:' + cl['شناسه']);
    ok('بالینی: تأیید دوباره بی‌اثر', sent(9301).length === 0);
    /* مسیر من و اتصال */
    TG_MEM['cp:' + SC_T_LADDER] = [{ 'نام': 'دانشجوی الف', 'chat_id': '9101', 'سطح': '۱', 'ساعت جلسهٔ بالینی': '۱۲', 'شمارهٔ تماس': '09120000000' }];
    TG_MEM['person'] = { name: 'دانشجوی الف', roles: ['دانشجو'], circle: '۱۴', chat: '9101' };
    var lt = scLadderText_(9101);
    ok('مسیر من: ردیف خود دانشجو، بی شماره و chat', /سطح/.test(lt) && /ساعت جلسهٔ بالینی/.test(lt) && lt.indexOf('0912') < 0 && lt.indexOf('9101') < 0);
    TG_MEM['person'] = { name: 'کس دیگر', roles: ['دانشجو'], circle: '۱۴', chat: '9999' };
    ok('مسیر من: دیگری ردیف کسی را نمی‌بیند', scLadderText_(9999) === '');
    var act = scMemActivate_(9102, { name: 'دانشجوی ب' });
    ok('اتصال: ردیف «در انتظار اتصال» فعال شد و chat گرفت', act === 1 && TG_MEM['cp:' + TG_SCH_T_MEM][1]['وضعیت'] === 'فعال' && TG_MEM['cp:' + TG_SCH_T_MEM][1]['chat_id'] === '9102');
    TG_MEM['cp:' + TG_SCH_T_MEM][1]['وضعیت'] = SC_MEM_WAIT;
    ok('منوی منتور و نمایندهٔ کلاس دکمهٔ رویدادها دارد (هم‌خوان با «مدرسه»)', [SC_ROLE_MENTOR, SC_ROLE_REP].every(function (r) { return JSON.stringify(tgSchoolMenu_(r)).indexOf('رویدادها') > -1; }));
    ok('یادآوری اتصال: نام و لینک', /دانشجوی ب/.test(scPendingText_('14')) && /start=edu_s/.test(scPendingText_('14')));
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 200) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ رویکرد تازهٔ مدرسه درست است'));
  return tgTestTally_(log, fail);
}
