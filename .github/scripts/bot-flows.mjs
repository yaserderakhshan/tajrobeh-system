// آزمون‌های جریان (فقط محلی): مسیرهای واقعی (نه حالت خشک) روی شیت‌های حافظه‌ای gas-local.mjs.
// برای خطاهایی که با شمارهٔ سطر، قفل یا ترتیب نوشتن سروکار دارند و حالت خشک بات آن‌ها را نمی‌بیند.
// هر آزمون یک بات تازه بار می‌کند. همهٔ داده‌ها ساختگی است.
import { loadBot } from './gas-local.mjs';
import { seedFixtures } from './bot-fixtures.mjs';

const LEAD_HEAD = (() => {
  const h = ['تاریخ', 'ساعت', 'منبع', 'نام', 'کانال', 'شماره', 'منطقه', 'اولین پیام', 'وضعیت', 'مسئول', 'تاریخ تماس'];
  h[36] = 'کد لید'; h[37] = 'اعلان بات';
  return Array.from({ length: 38 }, (_, i) => h[i] || '');
})();

function leadsBot(botDir) {
  const b = loadBot(botDir);
  const ss = b.book(b.run('TG_SHEET_ID'));
  const sh = ss.insertSheet(b.run('TG_LEADS'));
  sh.appendRow(LEAD_HEAD);
  const fmt = (ms, p) => b.run(`Utilities.formatDate(new Date(${ms}), TG_TZ, '${p}')`);
  let n = 0;
  const add = (name, daysAgo) => {
    n++;
    const t = Date.now() - daysAgo * 86400000;
    sh.appendRow([fmt(t, 'yyyy-MM-dd'), daysAgo ? '10:00' : fmt(t, 'HH:mm'), 'بات', name, 'تلگرام', '0912000' + String(1000 + n), 'ایران', '', 'تازه', '', '']);
    b.run('bgLeadMark_()');   // v170.23.12.5: سطر تازه در بات با tgAppendLead_ یا onEdit نشانگر می‌زند
    return sh.getLastRow();
  };
  b.run(`tgDutyWho_ = function () { return { p: { name: 'کشیک نمونه', chat: '111', role: 'پذیرش' } }; };
         tgDutyBoss_ = function () { return { name: 'مسئول نمونه', chat: '222', role: 'مسئول پذیرش' }; };
         tgDutyClinic_ = function () { return true; };
         BG_DUTY_FROM = 0; BG_DUTY_NIGHT_MIN = 0;   // v170.23.42: آزمون جریان به ساعت روز وابسته نیست
         var __sent = []; tgSend_ = function (c, t) { __sent.push([String(c), String(t)]); return { ok: true }; };`);
  const tick = () => { b.run('__sent = []'); const r = b.run('tgDutyTick({})'); return { r, alerts: b.run('__sent.map(function (x) { return x[1]; })') }; };
  return { b, sh, add, tick };
}

export function runFlows(botDir) {
  const problems = [];
  const chk = (name, cond, extra) => { if (!cond) problems.push(`جریان: ${name}${extra ? ' · ' + extra : ''}`); };

  // ۱) کشیک لید با کد لید، نه شمارهٔ سطر (۲.۴ گزارش بررسی)
  {
    const { b, sh, add, tick } = leadsBot(botDir);
    for (let i = 1; i <= 5; i++) add('قدیمی ' + i, 2);
    b.props.setProperty('TG_DUTY_LAST', String(sh.getLastRow()));   // حالت نسخهٔ سطرمحور پیش از جابه‌جایی
    let t = tick();
    chk('کشیک: اجرای اول، لیدهای قدیمی هشدار نمی‌گیرند', t.alerts.length === 0, t.r);
    add('تازه الف', 0); add('تازه ب', 0);
    t = tick();
    chk('کشیک: دو لید تازه دو هشدار', t.alerts.length === 2 && /تازه الف/.test(t.alerts[0]) && /تازه ب/.test(t.alerts[1]), t.r);
    sh.deleteRows(2, 3);
    add('تازه پ', 0);
    t = tick();
    chk('کشیک: بعد از حذف سطرها لید تازه گم نمی‌شود', t.alerts.length === 1 && /تازه پ/.test(t.alerts[0]), t.r);
    t = tick();
    chk('کشیک: هشدار تکراری نمی‌رود', t.alerts.length === 0, t.r);
    // «تازه الف» تماس اول گرفت؛ باید با کد خودش بسته شود، نه سطری که حالا جای آن است
    const codeCol = LEAD_HEAD.indexOf('کد لید') + 1;
    let rowA = 0;
    for (let r = 2; r <= sh.getLastRow(); r++) if (sh.getRange(r, 4).getValue() === 'تازه الف') rowA = r;
    const codeA = sh.getRange(rowA, codeCol).getValue();
    sh.getRange(rowA, 11).setValue(b.run(`Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd')`));
    b.run('bgLeadMark_()');   // ویرایش دستی تب لیدها (onEdit)
    tick();
    const pend = JSON.parse(b.props.getProperty('TG_DUTY_PEND') || '[]').map((x) => x.k);
    chk('کشیک: لیدی که تماس اول گرفت از صف بیرون می‌رود', codeA && pend.indexOf(codeA) < 0 && pend.length === 2, JSON.stringify(pend));
    chk('کشیک: قفل اسکریپت بعد از اجرا آزاد است', b.lockState.held === false);
  }

  // ۲) جابه‌جایی صف قدیمی سطرمحور به کد لید
  {
    const { b, sh, add, tick } = leadsBot(botDir);
    add('قدیمی', 2); const r2 = add('منتظر', 0);
    b.props.setProperty('TG_DUTY_LAST', String(sh.getLastRow()));
    b.props.setProperty('TG_DUTY_PEND', JSON.stringify([{ r: r2, n: 0 }]));
    const t = tick();
    const pend = JSON.parse(b.props.getProperty('TG_DUTY_PEND') || '[]');
    chk('کشیک: صف قدیمی {r} به کد لید تبدیل و هشدارش فرستاده می‌شود', t.alerts.length === 1 && /منتظر/.test(t.alerts[0]) && pend.length === 1 && /^L-\d+$/.test(pend[0].k) && !pend[0].r, JSON.stringify(pend));
  }
  // ۳) فرم سایت (۲.۹): رقم فارسی، فرم اصلاح‌شده، فرم تکراری
  {
    const { b, sh } = leadsBot(botDir);
    const post = (o) => b.run(`doPost({ postData: { contents: ${JSON.stringify(JSON.stringify(o))} } })`);
    const base = { source: 'سایت › پذیرش › شروع تراپی — نمونه', names: 'مراجع نمونه', phone: '۰۹۱۲۰۰۰۵۵۵۵', message: 'پیام اول' };
    post(base);
    const r1 = sh.getLastRow();
    chk('فرم سایت: شمارهٔ فارسی منطقه می‌گیرد', r1 === 2 && sh.getRange(2, 7).getValue() === 'داخل ایران', String(sh.getRange(2, 7).getValue()));
    post(base);
    chk('فرم سایت: همان فرم دوباره سطر تازه نمی‌سازد', sh.getLastRow() === 2);
    const memo0 = String(sh.getRange(2, 13).getValue());
    post({ ...base, message: 'پیام اصلاح‌شده' });
    chk('فرم سایت: فرم اصلاح‌شده دور ریخته نمی‌شود و روی همان پرونده یادداشت می‌شود', sh.getLastRow() === 2 && String(sh.getRange(2, 13).getValue()) !== memo0);
  }

  // ۴) شمارهٔ بات (۲.۹): نوشتن شکست خورد → بی seen، در صف تکرار، بعد نوشته می‌شود
  {
    const { b, sh, tick } = leadsBot(botDir);
    b.run(`var __realAppend = SpreadsheetApp.openById(TG_SHEET_ID).getSheetByName(TG_LEADS).appendRow;
           var __failOnce = true;
           (function () { var s0 = SpreadsheetApp.openById(TG_SHEET_ID).getSheetByName(TG_LEADS); var real = s0.appendRow.bind(s0);
             s0.appendRow = function (v) { if (__failOnce) { __failOnce = false; throw new Error('Service Spreadsheets timed out'); } return real(v); }; })();`);
    b.run(`tgOnPhone_(5550001, 'مراجع نمونه', '', '09120007777')`);
    chk('شمارهٔ بات: بعد از نوشتن ناموفق seen نمی‌خورد', !b.run(`tgFlag_('seen', 5550001)`));
    chk('شمارهٔ بات: لید در صف تکرار است', JSON.parse(b.props.getProperty('TG_LEAD_RETRY') || '[]').length === 1);
    tick();
    chk('شمارهٔ بات: tgDutyTick لید صف را می‌نویسد', sh.getLastRow() === 2 && String(sh.getRange(2, 6).getValue()).indexOf('09120007777') > -1 && !b.props.getProperty('TG_LEAD_RETRY'));
    b.run(`tgSetFlag_('seen', 5550001, 21600)`);
    b.run(`tgOnPhone_(5550001, 'مراجع نمونه', '', '09120008888')`);
    chk('شمارهٔ بات: شمارهٔ دوم در ۶ ساعت روی همان پرونده یادداشت می‌شود', sh.getLastRow() === 2 && String(sh.getRange(2, 13).getValue()).indexOf('09120008888') > -1, String(sh.getRange(2, 13).getValue()).slice(0, 120));
  }
  // ۵) نوشتن لید زیر قفل و پیدا کردن پروندهٔ درست (۲.۸)
  {
    const { b, sh, add } = leadsBot(botDir);
    b.run(`(function () { var s0 = SpreadsheetApp.openById(TG_SHEET_ID).getSheetByName(TG_LEADS); var real = s0.appendRow.bind(s0);
             s0.appendRow = function (v) { var __pr = LockService.getScriptLock(); if (__pr.tryLock(0)) { __pr.releaseLock(); __lockAtAppend.push('آزاد'); } else __lockAtAppend.push('قفل'); return real(v); }; })();
           var __lockAtAppend = [];`);
    b.run(`tgAppendLead_({ name: 'مراجع نمونه', phone: '09120001111', note: 'chat_id: 1234', extra: {} })`);
    b.run(`doPost({ postData: { contents: JSON.stringify({ source: 'سایت › پذیرش › نمونه', names: 'فرم نمونه', phone: '09120002222', message: 'x' }) } })`);
    const at = b.run('__lockAtAppend');
    chk('لید: سطر تازهٔ بات و فرم سایت زیر قفل نوشته می‌شود', at.length === 2 && at.every((x) => x === 'قفل'), JSON.stringify(at));
    chk('لید: قفل بعد از نوشتن آزاد است', b.lockState.held === false);
    // chat_id: 1234 نباید برای 123 پیدا شود؛ سطر کش‌شدهٔ کهنه دوباره سنجیده می‌شود
    add('دیگری', 0); sh.getRange(sh.getLastRow(), 13).setValue('chat_id: 123');
    const r123 = sh.getLastRow();
    chk('لید: chat_id پیشوندی پرونده را اشتباه نمی‌گیرد', b.run('tgFindLead_(12)') === -1 && b.run('tgFindLead_(123)') === r123 && b.run('tgFindLead_(1234)') === 2);
    b.run(`CacheService.getScriptCache().put('lr123', '2', 21600)`);
    chk('لید: سطر کش‌شدهٔ کهنه دوباره سنجیده می‌شود', b.run('tgFindLead_(123)') === r123);
  }
  // ۶) مرخصی درمانگر وقت‌ها را می‌بندد (۲.۱)، وقتی شیت تاریخ را Date کرده باشد
  {
    const b = loadBot(botDir); seedFixtures(b);
    const who = 'درمانگر نمونه الف';
    const before = b.run(`tgFreeSlots_('').filter(function (x) { return x.therapist === ${JSON.stringify(who)}; }).map(function (x) { return x.dateIso; })`);
    const d0 = before[2];
    const [y, m, d] = d0.split('-').map(Number);
    const ss = b.book(b.run('TG_SHEET_ID'));
    const off = ss.insertSheet(b.run('TG_OFF_TAB'));
    off.appendRow(['درمانگر', 'از', 'تا', 'ثبت', 'یادداشت']);
    // Sheets رشتهٔ yyyy-MM-dd را Date می‌کند؛ همان را شبیه‌سازی می‌کنیم
    b.run(`SpreadsheetApp.openById(TG_SHEET_ID).getSheetByName(TG_OFF_TAB).appendRow([${JSON.stringify(who)}, new Date(${y}, ${m - 1}, ${d}), new Date(${y}, ${m - 1}, ${d}), new Date(), 'از بات'])`);
    b.run('TG_OFF_X = null');   // ردیف دستی در شیت = اجرای تازه (حافظهٔ یک‌اجرایی v166.26)
    const after = b.run(`tgFreeSlots_('').filter(function (x) { return x.therapist === ${JSON.stringify(who)}; }).map(function (x) { return x.dateIso; })`);
    chk('مرخصی: روز مرخصی (تاریخ‌شده در شیت) از وقت‌های خالی حذف می‌شود', before.indexOf(d0) > -1 && after.indexOf(d0) < 0 && after.length === before.length - before.filter((x) => x === d0).length, d0 + ' · ' + after.length + '/' + before.length);
    const other = b.run(`tgFreeSlots_('').filter(function (x) { return x.therapist === 'درمانگر نمونه ب' && x.dateIso === ${JSON.stringify(d0)}; }).length`);
    chk('مرخصی: وقت درمانگر دیگر در همان روز می‌ماند', other > 0);
    b.run(`SpreadsheetApp.openById(TG_SHEET_ID).getSheetByName(TG_OFF_TAB).appendRow(['درمانگر نمونه ب', '1405/07/01', '1405/07/03', new Date(), 'دستی'])`);
    b.run('TG_OFF_X = null');
    chk('مرخصی: تاریخ شمسی تایپ‌شده هم خوانده می‌شود', b.run(`tgOffRows_().some(function (r) { return r.from === '2026-09-23' && r.to === '2026-09-25'; })`));
  }
  // ۷) «وقت معارفهٔ من» و لغو بعد از ۶ ساعت (۲.۲): از شیت، نه فقط از کش
  {
    const b = loadBot(botDir); seedFixtures(b);
    b.run(`var __sent = []; tgSend_ = function (c, t) { __sent.push([String(c), String(t)]); return { ok: true }; }; tgNotifyTherapistCancel_ = function () {};`);
    const slot = b.run(`tgFreeSlots_('')[3]`);
    const rowA = b.run(`tgWriteSlot_(${JSON.stringify(slot)}, 7001, 'مراجع نمونه الف', 'آزمون', 0)`);
    const sh = b.book(b.run('TG_SHEET_ID')).getSheetByName(b.run('TG_SLOTS'));
    b.run(`CacheService.getScriptCache().remove('meet7001')`);   // گذشت ۶ ساعت
    b.run('__sent = []; tgMyMeeting_(7001)');
    const t1 = b.run('__sent.map(function (x) { return x[1]; }).join(" | ")');
    chk('معارفه: بعد از پاک شدن کش هم «وقت معارفهٔ شما» از شیت می‌آید', /وقت معارفهٔ شما/.test(t1) && t1.indexOf(slot.therapist) > -1, t1.slice(0, 80));
    b.run(`CacheService.getScriptCache().remove('meet7001')`);
    b.run('__sent = []; tgCancelMeeting_(7001)');
    chk('معارفه: لغو بعد از ۶ ساعت وقت را آزاد می‌کند', sh.getRange(rowA, 6).getValue() === 'آزاد');
    // دکمهٔ لغو کهنه: کش مراجع ب به سطری اشاره می‌کند که حالا مال مراجع پ است
    const rowC = b.run(`tgWriteSlot_(${JSON.stringify(slot)}, 7003, 'مراجع نمونه پ', 'آزمون', 0)`);
    b.run(`tgSetVal_('meet', 7002, JSON.stringify({ t: 'x', d: '2026-01-01', h: '10:00', row: ${rowC} }))`);
    b.run('__sent = []; tgCancelMeeting_(7002)');
    chk('معارفه: دکمهٔ لغو کهنه وقت مراجع دیگری را آزاد نمی‌کند', sh.getRange(rowC, 6).getValue() === 'رزرو شده');
  }
  // ۸) رزرو دوباره با شیت سنجیده می‌شود (۲.۱۰): وقت گذشته، وقت ساختگی، وقت درست
  {
    const b = loadBot(botDir); seedFixtures(b);
    b.run(`var __sent = []; tgSend_ = function (c, t) { __sent.push([String(c), String(t)]); return { ok: true }; }; tgOfferSlots_ = function () {}; tgNotifyTherapist_ = function () { return true; };`);
    const ok = b.run(`tgFreeSlots_('').filter(function (x) { return tgSlotUtc_(x).getTime() - Date.now() > TG_MIN_LEAD_MS; })[0]`);
    const yest = b.run(`Utilities.formatDate(new Date(Date.now() - 86400000), TG_TZ, 'yyyy-MM-dd')`);
    chk('رزرو: وقت درست قابل رزرو است', b.run(`tgSlotBookable_(${JSON.stringify(ok)})`) === true);
    chk('رزرو: وقت دیروز رد می‌شود', b.run(`tgSlotBookable_(${JSON.stringify({ ...ok, dateIso: yest })})`) === false);
    chk('رزرو: ساعتی که در قاعدهٔ هفتگی نیست رد می‌شود', b.run(`tgSlotBookable_(${JSON.stringify({ ...ok, hhmm: '03:17' })})`) === false);
    const sh = b.book(b.run('TG_SHEET_ID')).getSheetByName(b.run('TG_SLOTS'));
    const before = sh.getLastRow();
    b.run(`tgSetVal_('off', 7101, JSON.stringify([${JSON.stringify({ ...ok, hhmm: '03:17' })}])); __sent = []; tgOnBook_(7101, 'مراجع نمونه', 0)`);
    chk('رزرو: بات وقت ساختگی را رزرو نمی‌کند و همان پیام «گرفته شد» می‌رود', sh.getLastRow() === before && /به کس دیگری رسید/.test(b.run('__sent.map(function (x) { return x[1]; }).join(" ")')));
    b.run(`tgSetVal_('off', 7102, JSON.stringify([${JSON.stringify(ok)}])); __sent = []; tgOnBook_(7102, 'مراجع نمونه', 0)`);
    chk('رزرو: وقت درست رزرو می‌شود', sh.getLastRow() === before + 1 && sh.getRange(sh.getLastRow(), 6).getValue() === 'رزرو شده');
  }
  // ۹) کارت و شبای ساختمان از نقش «روان‌پزشکی» در تب «افراد» (v166.19)؛ همه ساختگی
  {
    const b = loadBot(botDir);
    const ss = b.book(b.run('TG_SHEET_ID'));
    const pe = ss.insertSheet(b.run('TG_PEOPLE_TAB'));
    const base = b.run('TG_PEOPLE_HEAD.slice()');
    pe.appendRow(base.concat(['ستون دیگر']));
    const row = (name, roles, status) => { const r = base.map(() => ''); r[0] = name; r[3] = roles; r[5] = status; return r; };
    pe.appendRow(row('نفر نمونه الف', 'پذیرش، روان‌پزشکی', 'غیرفعال'));
    pe.appendRow(row('نفر نمونه ب', 'درمانگر', 'فعال'));
    pe.appendRow(row('نفر نمونه پ', 'روان‌پزشکی', 'فعال'));
    chk('ساختمان: ستون‌ها خالی‌اند، بخش کارت نمایش داده نمی‌شود و خطا نمی‌دهد', b.run('vkPayBlock_(false)') === '' && b.run('vkPayBlock_(true)') === '');
    const hd = pe.getRange(1, 1, 1, pe.getLastColumn()).getValues()[0];
    chk('ساختمان: سه ستون آخر سطر اول اضافه شد و ستون دیگر دست نخورد', hd.slice(-4).join('|') === 'ستون دیگر|شمارهٔ کارت|شبا|نام صاحب حساب', hd.slice(-4).join('|'));
    const col = (h) => hd.indexOf(h) + 1;
    pe.getRange(2, col('شمارهٔ کارت')).setValue('6037990000000001');   // غیرفعال
    pe.getRange(4, col('شمارهٔ کارت')).setValue('6037990000000003\n6037990000000004');
    pe.getRange(4, col('شبا')).setValue('IR000000000000000000000003\nIR000000000000000000000004');
    pe.getRange(4, col('نام صاحب حساب')).setValue('دارنده نمونه یک\nدارنده نمونه دو');
    b.run('VK_PAY_INFO_ = null');   // اجرای تازه
    const blk = b.run('vkPayBlock_(false)');
    chk('ساختمان: همهٔ کارت‌ها از مسئول فعال روان‌پزشکی، به ترتیب', blk.indexOf('6037990000000003') > -1 && blk.indexOf('6037990000000004') > -1 && blk.indexOf('0001') < 0 && blk.indexOf('دارنده نمونه دو') > blk.indexOf('6037990000000004'), blk.slice(0, 200));
    pe.getRange(4, col('شمارهٔ کارت')).setValue('6037990000000005');
    pe.getRange(4, col('شبا')).setValue('');
    b.run('VK_PAY_INFO_ = null');
    chk('ساختمان: تغییر خانه بی انتشار تازه در اجرای بعد دیده می‌شود', b.run('vkPayBlock_(false)').indexOf('6037990000000005') > -1);
    b.run('VK_PAY_INFO_ = null');
    chk('ساختمان: ستون‌ها دوباره اضافه نمی‌شوند', pe.getRange(1, 1, 1, pe.getLastColumn()).getValues()[0].filter((h) => h === 'شبا').length === 1);
  }
  // ۱۰) اتصال درمانگر فقط با تأیید (۲.۵، v166.21): پیش از تأیید chat_id در پرونده نمی‌نشیند
  {
    const b = loadBot(botDir);
    seedFixtures(b);
    b.run(`var __sent = []; tgSend_ = function (c, t, k) { __sent.push([String(c), String(t)]); return { ok: true }; };`);
    const msg = (x) => b.run(`tgHandle(${JSON.stringify({ update_id: 900000 + Math.floor(Math.random() * 99999), message: Object.assign({ message_id: 1, chat: { id: 9001, type: 'private' }, from: { id: 9001, first_name: 'نمونه', is_bot: false } }, x) })})`);
    const name = 'درمانگر نمونه ب';
    msg({ text: '/start ther' }); msg({ text: name }); msg({ contact: { phone_number: '+989120000123', user_id: 9001 } });
    const sh = b.book(b.run('TG_SHEET_ID')).getSheetByName(b.run('TG_THER'));
    const row = () => { for (let r = 4; r <= sh.getLastRow(); r++) if (sh.getRange(r, 1).getValue() === name) return r; return 0; };
    const chatCell = () => String(sh.getRange(row(), b.run('TG_C_CHAT')).getValue());
    const pend = () => JSON.parse(b.props.getProperty('TG_TQ') || '{}')['9001'];
    chk('اتصال: پیش از تأیید chat_id نوشته نمی‌شود و درخواست ثبت است', row() && chatCell() === '' && pend() && pend().chk === 'none', chatCell());
    chk('اتصال: کارت تأیید به یاسر رفت', b.run(`__sent.some(function (x) { return x[0] === String(TG_OWNER_CHAT) && x[1].indexOf('درخواست اتصال حساب') > -1; })`));
    b.run(`tgOnTq_({}, 'ok:9001', '5555', 'غریبه', '')`);
    chk('اتصال: بیرون از پذیرش تأیید نمی‌شود', chatCell() === '' && !!pend());
    b.run(`tgOnTq_({}, 'ok:9001', String(TG_OWNER_CHAT), 'یاسر', '')`);
    chk('اتصال: با تأیید یاسر chat_id نوشته شد و درخواست بسته شد', chatCell() === '9001' && !pend(), chatCell());
    chk('اتصال: قفل آزاد است', b.lockState.held === false);
  }
  return problems;
}
