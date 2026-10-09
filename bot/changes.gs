/**
 * changes.gs · v170.23.31 · ۱۸ مهر ۱۴۰۵ · کنترل تغییر C-01 در بات (برد فرآیندها، کار ۳؛ بی هوش مصنوعی)
 *
 * الف) درخواست تغییر: هر نقش تیم (همان مجموعهٔ «کار تازه»، tgV1CanCreate_) با دکمهٔ «📝 درخواست تغییر» در داشبورد یا /cr
 *      سه پرسش جواب می‌دهد: چه چیزی، چرا، کدام مسیر (J-01 تا J-07، C-01، نمی‌دانم). کد CR-xxx می‌گیرد و در تب
 *      «درخواست‌های تغییر» هاب عملیات (فقط یاسر) می‌نشیند. کارت به یاسر با «تأیید» و «رد با دلیل»؛ نتیجه به درخواست‌دهنده.
 *      درخواست‌های باز شنبه‌ها در جمع‌بندی ۱۸:۰۰ یاسر می‌آید (و در گزارش هفتگی ایجنت).
 * ب) اعلان نسخه: تب «اعلان‌های نسخه» هاب عملیات (کد مسیر، نسخه، خلاصه، گیرنده‌ها، وضعیت). وقتی یاسر وضعیت سطری را
 *      «تأیید شد» کند، نوبت ساعتی بعد (۹ تا ۱۸) برای هر گیرنده پیام با «خواندم» می‌فرستد و زمان خواندن را در تب
 *      «خوانش اعلان‌ها» ثبت می‌کند. ۴۸ ساعت نخوانده ← یک بار یادآوری. نخوانده‌ها در جمع‌بندی یاسر.
 *      گیرنده‌ها: نام (از «افراد») یا نام نقش (مثلاً «پذیرش») با ویرگول؛ «همهٔ تیم» یعنی همهٔ نقش‌های تیم.
 * متن کاربر پیش از نوشتن در شیت با tgCell_ از فرمول پاک می‌شود. تست: chgTests (مجموعهٔ «کنترل تغییر»).
 */

var CHG_BTN = '📝 درخواست تغییر';
var CHG_TAB = 'درخواست‌های تغییر';
var CHG_HEAD = ['کد', 'تاریخ', 'درخواست‌دهنده', 'chat', 'چه چیزی', 'چرا', 'مسیر', 'وضعیت', 'دلیل رد', 'تاریخ تصمیم'];
var CHG_ST = { OPEN: 'باز', OK: 'تأیید شد', NO: 'رد شد' };
var CHG_FIRST = 5;   /* CR-001 تا CR-004 روی برد ثبت شده‌اند */
var CHG_PATHS = ['J-01', 'J-02', 'J-03', 'J-04', 'J-05', 'J-06', 'J-07', 'C-01'];
var CHG_MAX = 800;

var VN_TAB = 'اعلان‌های نسخه';
var VN_HEAD = ['کد', 'کد مسیر', 'نسخه', 'خلاصه', 'گیرنده‌ها', 'وضعیت', 'زمان ارسال'];
var VN_ST = { DRAFT: 'پیش‌نویس', OK: 'تأیید شد', SENT: 'فرستاده شد' };
var VN_RD_TAB = 'خوانش اعلان‌ها';
var VN_RD_HEAD = ['کد اعلان', 'گیرنده', 'chat', 'زمان ارسال', 'زمان خواندن', 'یادآوری'];
var VN_REMIND_MS = 48 * 3600000;
var VN_TEAM_ROLES = ['پذیرش', 'مدرسه', 'سردبیر', 'مالی', 'سازمانی', 'روان‌پزشکی', 'سوشال', 'تنخواه', 'ناظر'];

function chgDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function chgNow_() { return chgDry_() && TG_MEM['chg:now'] ? Number(TG_MEM['chg:now']) : Date.now(); }
function chgStamp_(ms) { var d = new Date(ms || chgNow_()); return tgJDateFull_(d, TG_TZ) + ' ' + Utilities.formatDate(d, TG_TZ, 'HH:mm'); }
function chgOwner_(chat) { return String(chat) === String(TG_OWNER_CHAT); }
function chgCan_(chat) { try { return chgOwner_(chat) || tgV1CanCreate_(chat, ''); } catch (e) { return false; } }

/* ───── جدول‌ها (هاب عملیات؛ در حالت خشک TG_MEM) ───── */
function chgSheet_(tab, head) {
  var ss = opsSS_(); if (!ss) return null;
  var sh = ss.getSheetByName(tab);
  if (!sh) { sh = ss.insertSheet(tab); opsStyleSheet_(sh, head); if (tab === VN_TAB) opsDrop_(sh.getRange(2, 6, 300, 1), [VN_ST.DRAFT, VN_ST.OK, VN_ST.SENT]); }
  return sh;
}
function chgRows_(tab, head) {
  if (chgDry_()) return (TG_MEM['chg:' + tab] = TG_MEM['chg:' + tab] || []);
  var sh = chgSheet_(tab, head); if (!sh) return [];
  var n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, head.length).getDisplayValues().map(function (r, i) {
    var o = { row: i + 2 }; head.forEach(function (h, j) { o[h] = String(r[j] || '').trim(); }); return o;
  });
}
function chgPut_(tab, head, o) {
  if (chgDry_()) { var L = chgRows_(tab, head); if (!o.row) { o.row = L.length + 2; L.push(o); } else L[o.row - 2] = o; return o; }
  var sh = chgSheet_(tab, head); if (!sh) return o;
  var arr = head.map(function (h) { return tgCell_(o[h] === undefined ? '' : String(o[h])); });
  if (o.row) sh.getRange(o.row, 1, 1, head.length).setValues([arr]);
  else { sh.appendRow(arr); o.row = sh.getLastRow(); }
  return o;
}

/* ───── الف) درخواست تغییر ───── */
function chgNextCode_() {
  var max = CHG_FIRST - 1;
  chgRows_(CHG_TAB, CHG_HEAD).forEach(function (r) { var m = /^CR-(\d+)$/.exec(r['کد']); if (m) max = Math.max(max, Number(m[1])); });
  return 'CR-' + ('00' + (max + 1)).slice(-3);
}
function chgStart_(chat) {
  if (!chgCan_(chat)) { tgSend_(chat, 'این گزینه فقط برای تیم تجربه است.'); return true; }
  tgSetVal_('chg', chat, JSON.stringify({ q: 1 }));
  tgSend_(chat, '📝 <b>درخواست تغییر</b> · ۱ از ۳\nچه چیزی باید عوض شود؟ در یکی دو جمله بنویسید.', { inline_keyboard: [[{ text: 'انصراف', callback_data: 'crq:x' }]] });
  return true;
}
function chgPathKb_() {
  var kb = [], r = [];
  CHG_PATHS.forEach(function (p) { r.push({ text: p, callback_data: 'crq:p:' + p }); if (r.length === 4) { kb.push(r); r = []; } });
  if (r.length) kb.push(r);
  kb.push([{ text: 'نمی‌دانم', callback_data: 'crq:p:?' }, { text: 'انصراف', callback_data: 'crq:x' }]);
  return { inline_keyboard: kb };
}
/* متن آزاد در میانهٔ درخواست؛ true یعنی پیام مصرف شد */
function chgText_(chat, text) {
  var raw = tgGetVal_('chg', chat); if (!raw) return false;
  var st = {}; try { st = JSON.parse(raw); } catch (e) { tgDel_('chg', chat); return false; }
  var t = String(text || '').trim();
  if (!t || /^\//.test(t)) { if (t === '/cancel') { tgDel_('chg', chat); tgSend_(chat, 'لغو شد.'); return true; } return false; }
  t = t.slice(0, CHG_MAX);
  if (st.q === 1) { st.what = t; st.q = 2; tgSetVal_('chg', chat, JSON.stringify(st)); tgSend_(chat, '۲ از ۳\nچرا؟ چه مشکلی حل می‌شود؟', { inline_keyboard: [[{ text: 'انصراف', callback_data: 'crq:x' }]] }); return true; }
  if (st.q === 2) { st.why = t; st.q = 3; tgSetVal_('chg', chat, JSON.stringify(st)); tgSend_(chat, '۳ از ۳\nکدام مسیر را عوض می‌کند؟', chgPathKb_()); return true; }
  if (st.q === 'no') return chgReject_(chat, st.code, t);
  return false;
}
function chgSave_(chat, path) {
  var raw = tgGetVal_('chg', chat); var st = {}; try { st = JSON.parse(raw || '{}'); } catch (e) {}
  if (!st.what || !st.why) { tgDel_('chg', chat); tgSend_(chat, 'درخواست ناقص بود؛ دوباره از «' + CHG_BTN + '» شروع کنید.'); return true; }
  var who = ''; try { var p = tgPersonByChat_(chat); who = p ? p.name : ''; } catch (e2) {}
  var o = { 'کد': chgNextCode_(), 'تاریخ': chgStamp_(), 'درخواست‌دهنده': who || 'تیم', 'chat': String(chat), 'چه چیزی': st.what, 'چرا': st.why,
            'مسیر': path === '?' ? 'نمی‌دانم' : path, 'وضعیت': CHG_ST.OPEN, 'دلیل رد': '', 'تاریخ تصمیم': '' };
  chgPut_(CHG_TAB, CHG_HEAD, o);
  tgDel_('chg', chat);
  tgSend_(chat, '✅ درخواست شما با کد <code>' + o['کد'] + '</code> ثبت شد. نتیجه را همین‌جا می‌فرستیم.');
  if (TG_OWNER_CHAT) tgSend_(TG_OWNER_CHAT, chgCard_(o), { inline_keyboard: [[{ text: '✅ تأیید', callback_data: 'crq:ok:' + o['کد'] }, { text: '❌ رد با دلیل', callback_data: 'crq:no:' + o['کد'] }]] });
  return true;
}
function chgCard_(o) {
  return '📝 <b>درخواست تغییر</b> · <code>' + o['کد'] + '</code>\nاز: ' + tgEsc_(o['درخواست‌دهنده']) + ' · مسیر: ' + tgEsc_(o['مسیر']) +
    '\n\n<b>چه چیزی:</b> ' + tgEsc_(o['چه چیزی']) + '\n<b>چرا:</b> ' + tgEsc_(o['چرا']);
}
function chgFind_(code) { return chgRows_(CHG_TAB, CHG_HEAD).filter(function (r) { return r['کد'] === code; })[0] || null; }
function chgDecide_(chat, code, ok, reason) {
  if (!chgOwner_(chat)) { tgSend_(chat, 'فقط یاسر درخواست تغییر را تأیید یا رد می‌کند.'); return true; }
  var o = chgFind_(code); if (!o) { tgSend_(chat, 'این درخواست پیدا نشد.'); return true; }
  if (o['وضعیت'] !== CHG_ST.OPEN) { tgSend_(chat, 'این درخواست قبلاً «' + tgEsc_(o['وضعیت']) + '» شده است.'); return true; }
  o['وضعیت'] = ok ? CHG_ST.OK : CHG_ST.NO; o['دلیل رد'] = ok ? '' : String(reason || '').slice(0, CHG_MAX); o['تاریخ تصمیم'] = chgStamp_();
  chgPut_(CHG_TAB, CHG_HEAD, o);
  tgSend_(chat, (ok ? '✅ ' : '❌ ') + '<code>' + code + '</code> ' + o['وضعیت'] + '.');
  if (o.chat && String(o.chat) !== String(chat)) tgSend_(o.chat, (ok ? '✅ درخواست تغییر <code>' + code + '</code> تأیید شد. نسخهٔ تازهٔ مسیر بعد از اجرا در بات اعلام می‌شود.'
    : '❌ درخواست تغییر <code>' + code + '</code> رد شد.\nدلیل: ' + tgEsc_(o['دلیل رد'])));
  return true;
}
function chgReject_(chat, code, reason) { tgDel_('chg', chat); return chgDecide_(chat, code, false, reason); }
function chgOpen_() { return chgRows_(CHG_TAB, CHG_HEAD).filter(function (r) { return r['وضعیت'] === CHG_ST.OPEN; }); }

/* ───── ب) اعلان نسخه ───── */
function vnRecipients_(spec) {
  var people = []; try { people = tgPeopleList_(); } catch (e) {}
  var want = String(spec || '').split(/[,،\n]+/).map(function (x) { return x.trim(); }).filter(String), out = [], seen = {};
  function add(p) { var c = String(p.chat || '').split(/[,،;\s]+/)[0]; if (c && !seen[c] && p.status !== 'غیرفعال') { seen[c] = 1; out.push({ name: p.name, chat: c }); } }
  want.forEach(function (w) {
    if (w === 'همهٔ تیم' || w === 'همه تیم') { people.forEach(function (p) { if ((p.roles || []).some(function (r) { return VN_TEAM_ROLES.indexOf(r) > -1; })) add(p); }); return; }
    people.forEach(function (p) { if (tgNorm_(p.name) === tgNorm_(w) || (p.roles || []).indexOf(w) > -1) add(p); });
  });
  return out;
}
function vnText_(a) {
  return '📣 <b>نسخهٔ تازهٔ مسیر ' + tgEsc_(a['کد مسیر']) + '</b> · ' + tgEsc_(a['نسخه']) + '\n\n' + tgEsc_(a['خلاصه']) +
    '\n\nلطفاً بخوانید و «خواندم» را بزنید.';
}
function vnKb_(code) { return { inline_keyboard: [[{ text: '✅ خواندم', callback_data: 'vnr:' + code }]] }; }
/* نوبت ساعتی: سطرهای «تأیید شد» فرستاده می‌شوند؛ نخوانده‌های ۴۸ ساعته یک بار یادآوری می‌گیرند */
function vnTick_() {
  var now = chgNow_(), n = 0;
  var rows = chgRows_(VN_TAB, VN_HEAD), rd = chgRows_(VN_RD_TAB, VN_RD_HEAD);
  rows.forEach(function (a) {
    if (a['وضعیت'] !== VN_ST.OK || !a['کد']) return;
    vnRecipients_(a['گیرنده‌ها']).forEach(function (r) {
      if (rd.some(function (x) { return x['کد اعلان'] === a['کد'] && x.chat === r.chat; })) return;
      tgSend_(r.chat, vnText_(a), vnKb_(a['کد']));
      var o = { 'کد اعلان': a['کد'], 'گیرنده': r.name, 'chat': r.chat, 'زمان ارسال': String(now), 'زمان خواندن': '', 'یادآوری': '' };
      chgPut_(VN_RD_TAB, VN_RD_HEAD, o); rd.push(o); n++;
    });
    a['وضعیت'] = VN_ST.SENT; a['زمان ارسال'] = chgStamp_(now); chgPut_(VN_TAB, VN_HEAD, a);
  });
  rd.forEach(function (x) {
    if (x['زمان خواندن'] || x['یادآوری'] || !(now - Number(x['زمان ارسال'] || now) >= VN_REMIND_MS)) return;
    var a = rows.filter(function (y) { return y['کد'] === x['کد اعلان']; })[0];
    if (a) tgSend_(x.chat, '⏰ یادآوری\n' + vnText_(a), vnKb_(a['کد']));
    x['یادآوری'] = chgStamp_(now); chgPut_(VN_RD_TAB, VN_RD_HEAD, x); n++;
  });
  return n;
}
function vnRead_(chat, code) {
  var x = chgRows_(VN_RD_TAB, VN_RD_HEAD).filter(function (r) { return r['کد اعلان'] === code && r.chat === String(chat); })[0];
  if (!x) { tgSend_(chat, 'این اعلان برای شما ثبت نشده بود.'); return true; }
  if (!x['زمان خواندن']) { x['زمان خواندن'] = chgStamp_(); chgPut_(VN_RD_TAB, VN_RD_HEAD, x); }
  tgSend_(chat, '✅ ثبت شد. ممنون.');
  return true;
}
function vnUnread_() { return chgRows_(VN_RD_TAB, VN_RD_HEAD).filter(function (x) { return !x['زمان خواندن']; }); }

/* ───── مسیریابی ───── */
function chgRoute_(chat, m) {
  var t = String((m && m.text) || '').trim();
  if (t === '/cr' || t === CHG_BTN) return chgStart_(chat);
  if (t && tgGetVal_('chg', chat)) return chgText_(chat, t);
  return false;
}
function chgCb_(chat, data) {
  var a = String(data || '').split(':');
  if (a[0] === 'vnr') return vnRead_(chat, a.slice(1).join(':'));
  if (a[1] === 'new') return chgStart_(chat);
  if (a[1] === 'x') { tgDel_('chg', chat); tgSend_(chat, 'لغو شد.'); return true; }
  if (a[1] === 'p') return chgSave_(chat, a[2] || '?');
  if (a[1] === 'ok') return chgDecide_(chat, a[2], true, '');
  if (a[1] === 'no') {
    if (!chgOwner_(chat)) return chgDecide_(chat, a[2], false, '');
    tgSetVal_('chg', chat, JSON.stringify({ q: 'no', code: a[2] }));
    tgSend_(chat, 'دلیل رد <code>' + tgEsc_(a[2]) + '</code> را بنویسید (برای درخواست‌دهنده فرستاده می‌شود).');
    return true;
  }
  return false;
}
/* خط‌های جمع‌بندی ۱۸:۰۰ یاسر: نخوانده‌ها هر روز، درخواست‌های باز شنبه‌ها */
function chgDigestText_() {
  var t = '', now = chgNow_();
  try {
    var u = vnUnread_();
    if (u.length) t += '\n\n📣 <b>اعلان نسخهٔ نخوانده</b>\n' + u.slice(0, 12).map(function (x) { return '• ' + tgEsc_(x['کد اعلان']) + ' · ' + tgEsc_(x['گیرنده']); }).join('\n');
  } catch (e) {}
  try {
    if (Number(Utilities.formatDate(new Date(now), TG_TZ, 'u')) === 6) {
      var o = chgOpen_();
      if (o.length) t += '\n\n📝 <b>درخواست‌های تغییر باز</b>\n' + o.slice(0, 12).map(function (x) { return '• ' + x['کد'] + ' · ' + tgEsc_(x['مسیر']) + ' · ' + tgEsc_(String(x['چه چیزی']).slice(0, 80)); }).join('\n');
    }
  } catch (e2) {}
  return t;
}

/* ───── تست ───── */
function chgTests() {
  var pass = 0, fail = 0, text = [];
  function ok(name, c) { if (c) { pass++; text.push('✅ ' + name); } else { fail++; text.push('❌ ' + name); } }
  var keepDry = TG_DRY, keepMem = TG_MEM, keepOut = TG_OUTBOX, keepOwner = TG_OWNER_CHAT, keepCan = tgV1CanCreate_;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var said = function (c) { return TG_OUTBOX.filter(function (x) { return !c || x.chat === String(c); }).map(function (x) { return x.text || ''; }).join('\n'); };
  try {
    TG_OWNER_CHAT = '900';
    tgV1CanCreate_ = function (c) { return String(c) === '801' || String(c) === '802'; };
    TG_MEM['person'] = { name: 'همکار نمونه', chat: '801' };
    ok('مراجع دکمه را نمی‌گیرد', chgRoute_('555', { text: '/cr' }) === true && said('555').indexOf('فقط برای تیم') > -1 && !tgGetVal_('chg', '555'));
    TG_OUTBOX = [];
    chgRoute_('801', { text: CHG_BTN });
    ok('شروع: پرسش ۱', said('801').indexOf('۱ از ۳') > -1);
    chgRoute_('801', { text: '=HYPERLINK("x") مهلت مصاحبه' });
    ok('پرسش ۲', said('801').indexOf('۲ از ۳') > -1);
    chgRoute_('801', { text: 'لید گم می‌شود' });
    ok('پرسش ۳ با دکمه‌های مسیر', TG_OUTBOX.some(function (x) { return JSON.stringify(x.markup || x.kb || '').indexOf('crq:p:J-04') > -1; }));
    TG_OUTBOX = [];
    chgCb_('801', 'crq:p:J-04');
    var r = chgRows_(CHG_TAB, CHG_HEAD)[0];
    ok('کد CR-005 و ثبت در تب', r && r['کد'] === 'CR-005' && r['مسیر'] === 'J-04' && r['وضعیت'] === CHG_ST.OPEN && r['درخواست‌دهنده'] === 'همکار نمونه');
    ok('کارت با تأیید و رد به یاسر', TG_OUTBOX.some(function (x) { return x.chat === '900' && JSON.stringify(x.markup || '').indexOf('crq:ok:CR-005') > -1 && JSON.stringify(x.markup || '').indexOf('crq:no:CR-005') > -1; }));
    ok('پیام به درخواست‌دهنده با کد', said('801').indexOf('CR-005') > -1);
    TG_OUTBOX = [];
    ok('دیگری نمی‌تواند تأیید کند', chgCb_('802', 'crq:ok:CR-005') === true && chgFind_('CR-005')['وضعیت'] === CHG_ST.OPEN);
    chgCb_('900', 'crq:no:CR-005'); chgRoute_('900', { text: 'با CR-004 یکی است' });
    ok('رد با دلیل و خبر به درخواست‌دهنده', chgFind_('CR-005')['وضعیت'] === CHG_ST.NO && chgFind_('CR-005')['دلیل رد'] === 'با CR-004 یکی است' && said('801').indexOf('رد شد') > -1);
    ok('تصمیم دوباره نه', (chgCb_('900', 'crq:ok:CR-005'), chgFind_('CR-005')['وضعیت'] === CHG_ST.NO));
    chgRoute_('802', { text: '/cr' }); chgRoute_('802', { text: 'الف' }); chgRoute_('802', { text: 'ب' }); chgCb_('802', 'crq:p:?');
    ok('کد بعدی CR-006 و «نمی‌دانم»', chgFind_('CR-006') && chgFind_('CR-006')['مسیر'] === 'نمی‌دانم');
    ok('درخواست باز در جمع‌بندی شنبه', (TG_MEM['chg:now'] = new Date('2026-10-10T18:00:00+03:30').getTime(), chgDigestText_().indexOf('CR-006') > -1));
    ok('غیر شنبه درخواست باز نمی‌آید', (TG_MEM['chg:now'] = new Date('2026-10-12T18:00:00+03:30').getTime(), chgDigestText_().indexOf('CR-006') < 0));
    /* اعلان نسخه */
    TG_MEM['people'] = [{ name: 'پذیرش الف', chat: '811', roles: ['پذیرش'] }, { name: 'مدرسه ب', chat: '812', roles: ['مدرسه'] }, { name: 'دانشجو ج', chat: '813', roles: ['دانشجو'] }];
    ok('گیرنده با نقش و نام', vnRecipients_('پذیرش، دانشجو ج').map(function (x) { return x.chat; }).join() === '811,813');
    ok('همهٔ تیم بی دانشجو', vnRecipients_('همهٔ تیم').map(function (x) { return x.chat; }).join() === '811,812');
    var t0 = new Date('2026-10-12T10:00:00+03:30').getTime(); TG_MEM['chg:now'] = t0;
    chgPut_(VN_TAB, VN_HEAD, { 'کد': 'V-1', 'کد مسیر': 'J-04', 'نسخه': '۰٫۲', 'خلاصه': 'مهلت تماس اول دو ساعت کاری شد.', 'گیرنده‌ها': 'همهٔ تیم', 'وضعیت': VN_ST.DRAFT });
    TG_OUTBOX = [];
    ok('پیش‌نویس فرستاده نمی‌شود', vnTick_() === 0 && !TG_OUTBOX.length);
    chgRows_(VN_TAB, VN_HEAD)[0]['وضعیت'] = VN_ST.OK;
    ok('تأیید شد: به هر گیرنده با «خواندم»', vnTick_() === 2 && TG_OUTBOX.filter(function (x) { return JSON.stringify(x.markup || '').indexOf('vnr:V-1') > -1; }).length === 2);
    ok('وضعیت فرستاده شد و دوباره نمی‌رود', chgRows_(VN_TAB, VN_HEAD)[0]['وضعیت'] === VN_ST.SENT && vnTick_() === 0);
    chgCb_('811', 'vnr:V-1');
    ok('خواندم: زمان ثبت می‌شود', chgRows_(VN_RD_TAB, VN_RD_HEAD).filter(function (x) { return x.chat === '811'; })[0]['زمان خواندن'] !== '');
    ok('نخوانده در جمع‌بندی', chgDigestText_().indexOf('مدرسه ب') > -1 && chgDigestText_().indexOf('پذیرش الف') < 0);
    TG_MEM['chg:now'] = t0 + VN_REMIND_MS + 60000; TG_OUTBOX = [];
    ok('۴۸ ساعت: یک یادآوری فقط به نخوانده', vnTick_() === 1 && TG_OUTBOX.length === 1 && TG_OUTBOX[0].chat === '812');
    TG_OUTBOX = []; ok('یادآوری دوباره نه', vnTick_() === 0 && !TG_OUTBOX.length);
    ok('متن کاربر در شیت با tgCell_ از فرمول پاک می‌شود', tgCell_('=HYPERLINK("x")') === "'=HYPERLINK(\"x\")");
  } catch (e) { fail++; text.push('❌ خطا: ' + (e && e.message)); }
  finally { TG_DRY = keepDry; TG_MEM = keepMem; TG_OUTBOX = keepOut; TG_OWNER_CHAT = keepOwner; tgV1CanCreate_ = keepCan; }
  return { pass: pass, fail: fail, text: text.join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'chgTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['کنترل تغییر', 'chgTests']); } catch (eS) {}
