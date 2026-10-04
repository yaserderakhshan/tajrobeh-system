/**
 * dq.gs · v170.0 · ۱۱ مهر ۱۴۰۵ · «صف ارسال» مدیریت: پیام یا تیکت از طرف یاسر به یک نقش یا یک نفر، با پاسخ در همان ردیف
 *
 * چرا: یاسر یا دستیارش با نوشتن یک ردیف در تب «صف ارسال» هاب پیام (tgMsgSS_، فقط یاسر) به همکار پیام می‌دهد و پاسخ
 * همان‌جا برمی‌گردد. اولین مورد: تیکت‌های مالی FIN-001 و FIN-002 برای نقش «مالی».
 * - با «سوشال · صف ارسال» (social.gs) فرق دارد: آنجا پیام زمان‌دار بی‌پاسخ برای تیم سوشال و کانال است؛ اینجا تأیید یاسر،
 *   دکمه‌های پاسخ، پیگیری و خواندن وضعیت تیکت. از همان ابزارهای بات استفاده می‌کند (tgPeopleList_، tgSend_، tgTgFile_،
 *   rvTranscribe_، tgSetVal_، tgWatchMenu_، tgTick5 و tgWatchdog). تریگر تازه‌ای نمی‌سازد (سقف تریگر و سهمیه).
 * - تأیید: «تأییدشده» ← مستقیم. خالی ← پیش‌نمایش برای یاسر با «بفرست»، «ویرایش»، «لغو».
 * - ارسال: هر ۱۰ دقیقه از tgTick5 (dqTick_) و هر ساعت از tgWatchdog (dqHourly_: پیگیری و وضعیت تیکت)؛ فقط ۹ تا ۱۸ تهران،
 *   جمعه فقط اگر موضوع «فوری» دارد.
 * - پیگیری: ۲۴ ساعت بی‌پاسخ ← یک یادآوری مؤدبانه؛ ۴۸ ساعت ← گزارش به یاسر. ارجاع خودکار به نفر دیگر ندارد.
 * - حریم: اطلاعات مالی (موضوع FIN-… یا گیرندهٔ «مالی») فقط به نقش «مالی» و یاسر. حقوق و قرارداد از این مسیر نمی‌رود.
 *   نام مراجع را بات تشخیص نمی‌دهد؛ ثبت‌کننده نباید بنویسد (قاعدهٔ ۴ CLAUDE.md).
 */

var DQ_TAB = 'صف ارسال';
var DQ_HEAD = ['کد', 'زمان ثبت', 'ثبت‌کننده', 'گیرنده', 'موضوع', 'متن پیام', 'لینک', 'لینک ردیف تیکت', 'تأیید', 'وضعیت ارسال',
  'زمان ارسال', 'لینک پیام', 'پاسخ گیرنده', 'زمان پاسخ', 'وضعیت تیکت', 'یادداشت'];
var DQ_C = {}; DQ_HEAD.forEach(function (h, i) { DQ_C[h] = i; });
var DQ_ST = { WAIT: 'در انتظار تأیید', READY: 'آمادهٔ ارسال', SENT: 'فرستاده شد', REP: 'پاسخ آمد', CLOSED: 'بسته شد', ERR: 'خطا',
  PRE: 'پیش از انتشار فرستاده شد' };   /* PRE: فقط برای تیکتی که پیش از v170 از «سوشال · صف ارسال» رفته بود (tgV170Seed) */
var DQ_ST_LIST = [DQ_ST.WAIT, DQ_ST.READY, DQ_ST.SENT, DQ_ST.REP, DQ_ST.CLOSED, DQ_ST.ERR, DQ_ST.PRE];
var DQ_OK = 'تأییدشده';
var DQ_TK_DONE = 'پاسخ داده شد';
var DQ_BTN = '📮 صف ارسال';
var DQ_SIGN = 'از طرف مدیریت تجربه';
var DQ_REMIND_H = 24, DQ_ESC_H = 48;
var DQ_FIN_ROLE = 'مالی';
var DQ_NEVER = /حقوق|قرارداد/;

/* ---------------- کمکی ---------------- */
function dqDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function dqNow_() { return dqDry_() && TG_MEM['dq:now'] ? new Date(Number(TG_MEM['dq:now'])) : new Date(); }
function dqOwner_() { return String(TG_OWNER_CHAT); }
function dqStamp_(d) { var j = tgJalali_(d, TG_TZ); return j.y + '/' + ('0' + j.m).slice(-2) + '/' + ('0' + j.d).slice(-2) + ' ' + Utilities.formatDate(d, TG_TZ, 'HH:mm'); }
function dqParseStamp_(s) {
  var m = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/.exec(tgLatinDigits_(String(s || '')));
  if (!m) return null;
  var g = tgJ2G_(+m[1], +m[2], +m[3]);
  return new Date(Date.UTC(g.getFullYear(), g.getMonth(), g.getDate(), +m[4], +m[5]) - 210 * 60000);
}
function dqUrgent_(r) { return /فوری/.test(r.subject); }
/* ساعت کاری تیم: ۹ تا ۱۸ تهران؛ جمعه فقط فوری */
function dqHoursOk_(r, d) {
  d = d || dqNow_();
  var h = +Utilities.formatDate(d, TG_TZ, 'H'), wd = +Utilities.formatDate(d, TG_TZ, 'u');   /* u: ۵ = جمعه */
  if (h < 9 || h >= 18) return false;
  if (wd === 5 && !dqUrgent_(r)) return false;
  return true;
}
function dqProp_(code, patch) {
  var k = 'DQ:' + code, cur = {};
  try { cur = JSON.parse((dqDry_() ? TG_MEM['dqp:' + k] : PropertiesService.getScriptProperties().getProperty(k)) || '{}'); } catch (e) {}
  if (!patch) return cur;
  Object.keys(patch).forEach(function (x) { cur[x] = patch[x]; });
  if (dqDry_()) TG_MEM['dqp:' + k] = JSON.stringify(cur); else PropertiesService.getScriptProperties().setProperty(k, JSON.stringify(cur));
  return cur;
}

/* پرچم سبک (شرط یاسر، ۱۱ مهر): اگر هیچ ردیف تازه یا «آمادهٔ ارسال» نیست، تیک ۱۰ دقیقه‌ای شیت را نمی‌خواند.
   هر نوشتن ردیفی که کار دارد پرچم را روشن می‌کند؛ tick و dqHourly_ بعد از خواندن آن را از نو حساب می‌کنند.
   ردیفی که دستی در شیت نوشته شود، حداکثر تا اجرای ساعتی بعد دیده می‌شود. */
function dqFlag_(v) {
  if (dqDry_()) { if (v === undefined) return TG_MEM['dq:flag'] || ''; TG_MEM['dq:flag'] = v; return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty('DQ_PENDING') || '';
  if ((P.getProperty('DQ_PENDING') || '') !== v) P.setProperty('DQ_PENDING', v);
  return v;
}
function dqNeedsTick_(r) { return !!r.code && (!r.st || r.st === DQ_ST.READY); }
function dqFlagFrom_(rows) { return dqFlag_(rows.some(dqNeedsTick_) ? '1' : '0'); }
/* زمان اجرای صف در روز (جدا از RS: تا جمع سهمیه دو بار شمرده نشود): DQ_RS:<روز> = {n, ms, skip} */
function dqStat_(t0, skipped) {
  var day = Utilities.formatDate(dqNow_(), TG_TZ, 'yyyy-MM-dd'), k = 'DQ_RS:' + day, o = {};
  try { o = JSON.parse((dqDry_() ? TG_MEM['dqp:' + k] : PropertiesService.getScriptProperties().getProperty(k)) || '{}'); } catch (e) {}
  o.n = (o.n || 0) + 1; o.ms = (o.ms || 0) + (Date.now() - t0); if (skipped) o.skip = (o.skip || 0) + 1;
  if (dqDry_()) TG_MEM['dqp:' + k] = JSON.stringify(o); else PropertiesService.getScriptProperties().setProperty(k, JSON.stringify(o));
  return o;
}
/* یک خط برای گزارش سلامت: زمان امروز و دیروز صف (ثانیه)، شمار اجرا و اجراهای بی‌خواندن شیت */
function dqHealth_() {
  var P = dqDry_() ? null : PropertiesService.getScriptProperties(), out = {};
  [0, 1].forEach(function (back) {
    var day = Utilities.formatDate(new Date(dqNow_().getTime() - back * 86400000), TG_TZ, 'yyyy-MM-dd'), o = {};
    try { o = JSON.parse((P ? P.getProperty('DQ_RS:' + day) : TG_MEM['dqp:DQ_RS:' + day]) || '{}'); } catch (e) {}
    out[back ? 'yesterday' : 'today'] = { day: day, sec: Math.round((o.ms || 0) / 1000), n: o.n || 0, skip: o.skip || 0 };
  });
  out.pending = dqFlag_() === '1';
  return out;
}

/* ---------------- تب صف ---------------- */
function dqSheet_() {
  if (dqDry_()) return null;
  var ss = tgMsgSS_(), sh = ss.getSheetByName(DQ_TAB);
  if (!sh) {
    sh = ss.insertSheet(DQ_TAB);
    sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, DQ_HEAD.length).setValues([DQ_HEAD]).setFontWeight('bold').setFontColor('#fefefe').setBackground('#222222');
    sh.setFrozenRows(1);
    var n = Math.max(200, sh.getMaxRows() - 1);
    sh.getRange(2, DQ_C['ثبت‌کننده'] + 1, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['یاسر', 'دستیار'], true).setAllowInvalid(true).build());
    sh.getRange(2, DQ_C['تأیید'] + 1, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([DQ_OK], true).setAllowInvalid(true).build());
    sh.getRange(2, DQ_C['وضعیت ارسال'] + 1, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(DQ_ST_LIST, true).setAllowInvalid(false).build());
    sh.setColumnWidth(DQ_C['متن پیام'] + 1, 360); sh.setColumnWidth(DQ_C['پاسخ گیرنده'] + 1, 300);
  }
  return sh;
}
function dqRows_() {
  if (dqDry_()) { TG_MEM['dq:reads'] = (TG_MEM['dq:reads'] || 0) + 1; return (TG_MEM['dq:rows'] = TG_MEM['dq:rows'] || []); }
  var sh = dqSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, DQ_HEAD.length).getDisplayValues().map(function (v, i) { return dqObj_(v, i + 2); }).filter(function (r) { return r.code; });
}
function dqObj_(v, row) {
  return { row: row, code: String(v[0]).trim(), at: v[1], by: v[2], to: String(v[3]).trim(), subject: String(v[4]).trim(), text: String(v[5]), link: String(v[6]).trim(),
    tk: String(v[7]).trim(), ok: String(v[8]).trim(), st: String(v[9]).trim(), sentAt: v[10], msg: v[11], reply: v[12], repAt: v[13], tkSt: v[14], note: v[15] };
}
function dqArr_(r) { return [r.code, r.at, r.by, r.to, r.subject, r.text, r.link, r.tk, r.ok, r.st, r.sentAt, r.msg, r.reply, r.repAt, r.tkSt, r.note]; }
function dqWrite_(r) {
  if (dqNeedsTick_(r)) dqFlag_('1');
  if (dqDry_()) { var a = dqRows_(), i = a.map(function (x) { return x.code; }).indexOf(r.code); if (i < 0) a.push(r); else a[i] = r; return; }
  var sh = dqSheet_();
  if (r.row) sh.getRange(r.row, 1, 1, DQ_HEAD.length).setValues([dqArr_(r)]);
  else { sh.appendRow(dqArr_(r)); r.row = sh.getLastRow(); }
}
function dqGet_(code) { return dqRows_().filter(function (r) { return r.code === code; })[0] || null; }
/* ردیف تازه (از بات، مینی‌اپ یا یک‌باره). کد Q-1001 به بالا */
function dqAdd_(o) {
  var mx = 1000;
  dqRows_().forEach(function (r) { var m = /^Q-(\d+)$/.exec(r.code); if (m) mx = Math.max(mx, +m[1]); });
  var r = { code: 'Q-' + (mx + 1), at: dqStamp_(dqNow_()), by: o.by || 'یاسر', to: String(o.to || '').trim(), subject: String(o.subject || '').trim().slice(0, 120),
    text: String(o.text || '').slice(0, 3500), link: String(o.link || '').trim(), tk: String(o.tk || '').trim(), ok: o.ok ? DQ_OK : '', st: '', sentAt: '', msg: '',
    reply: '', repAt: '', tkSt: '', note: '' };
  dqWrite_(r);
  return r;
}

/* ---------------- گیرنده و حریم ---------------- */
/* «نقش» یا «نام کامل» از تب «افراد»؛ فقط ردیف فعال با chat_id. خروجی: [{name, chat, roles}] */
function dqResolve_(to) {
  var t = String(to || '').trim();
  if (!t) return [];
  return tgPeopleList_().filter(function (p) {
    if (!p.chat || String(p.status || '').trim() === 'غیرفعال') return false;
    return String(p.name).trim() === t || (p.roles || []).indexOf(t) > -1;
  }).map(function (p) { return { name: p.name, chat: String(p.chat).split(/[,،;\s]+/).filter(Boolean)[0], roles: p.roles || [] }; })
    .filter(function (p) { return /^-?\d+$/.test(p.chat); });
}
function dqIsFin_(r) { return /\bFIN-\d+/i.test(r.subject + ' ' + r.text) || r.to === DQ_FIN_ROLE; }
/* خطا یا '' */
function dqGuard_(r, to) {
  if (!r.text.trim() && !r.subject) return 'متن پیام خالی است';
  if (DQ_NEVER.test(r.subject + ' ' + r.text)) return 'حقوق و قرارداد افراد از این مسیر فرستاده نمی‌شود';
  if (!to.length) return 'گیرندهٔ «' + r.to + '» در تب «افراد» نقش یا نام فعال با chat_id ندارد';
  if (dqIsFin_(r)) {
    var bad = to.filter(function (p) { return p.roles.indexOf(DQ_FIN_ROLE) < 0 && p.chat !== dqOwner_(); });
    if (bad.length) return 'اطلاعات مالی فقط به نقش «مالی» و یاسر می‌رود';
  }
  return '';
}

/* ---------------- ارسال ---------------- */
function dqMsgText_(r) {
  return '📮 <b>' + tgEsc_(r.code) + ' · ' + tgEsc_(r.subject) + '</b>\n\n' + tgEsc_(r.text) +
    (r.link ? '\n\n🔗 ' + tgEsc_(r.link) : '') + '\n\n<i>' + DQ_SIGN + '</i>';
}
function dqKb_(code) {
  return { inline_keyboard: [[{ text: '✅ بررسی کردم و در شیت نوشتم', callback_data: 'dq:ok:' + code }],
    [{ text: '💬 پاسخ کوتاه', callback_data: 'dq:re:' + code }], [{ text: '⏳ زمان بیشتری لازم دارم', callback_data: 'dq:mo:' + code }]] };
}
function dqMsgId_(res) {
  if (dqDry_()) return 900 + TG_OUTBOX.length;
  try { var j = JSON.parse(res.getContentText()); return j.ok ? j.result.message_id : 0; } catch (e) { return 0; }
}
function dqFail_(r, why) {
  r.st = DQ_ST.ERR; r.note = why; dqWrite_(r);
  tgSend_(dqOwner_(), '⚠️ <b>صف ارسال · ' + tgEsc_(r.code) + '</b>\n' + tgEsc_(r.subject) + '\nفرستاده نشد: ' + tgEsc_(why));
}
function dqPreview_(r) {
  r.st = DQ_ST.WAIT; dqWrite_(r);
  tgSend_(dqOwner_(), '👀 <b>پیش‌نمایش صف ارسال</b> · گیرنده: ' + tgEsc_(r.to) + '\n\n' + dqMsgText_(r),
    { inline_keyboard: [[{ text: '✅ بفرست', callback_data: 'dq:go:' + r.code }, { text: '✏️ ویرایش', callback_data: 'dq:ed:' + r.code }, { text: '✖️ لغو', callback_data: 'dq:no:' + r.code }]] });
}
/* یک ردیف آماده: نگهبان، ساعت کاری، ارسال، ثبت لینک و زمان */
function dqSend_(r) {
  var to = dqResolve_(r.to), why = dqGuard_(r, to);
  if (why) { dqFail_(r, why); return 'err'; }
  if (r.st !== DQ_ST.READY) { r.st = DQ_ST.READY; dqWrite_(r); }
  if (!dqHoursOk_(r)) return 'wait';
  var links = [];
  to.forEach(function (p) { var id = dqMsgId_(tgSend_(p.chat, dqMsgText_(r), dqKb_(r.code))); if (id) links.push('tg://openmessage?user_id=' + p.chat + '&message_id=' + id); });
  if (!links.length) { dqFail_(r, 'تلگرام پیام را نپذیرفت'); return 'err'; }
  r.st = DQ_ST.SENT; r.sentAt = dqStamp_(dqNow_()); r.msg = links.join('\n'); dqWrite_(r);
  dqProp_(r.code, { to: to.map(function (p) { return p.chat; }), sent: dqNow_().getTime() });
  return 'sent';
}
/* هر ۱۰ دقیقه از tgTick5: پیش‌نمایش ردیف‌های تازهٔ بی‌تأیید و ارسال ردیف‌های آماده */
function dqTick_() {
  var n = 0, rows = dqRows_();
  rows.forEach(function (r) {
    try {
      if (!r.st && r.ok !== DQ_OK) { dqPreview_(r); n++; return; }
      if ((!r.st || r.st === DQ_ST.READY || r.st === DQ_ST.WAIT) && r.ok === DQ_OK) { if (dqSend_(r) === 'sent') n++; }
    } catch (e) { tgErr_('dqTick_ ' + r.code, e); }
  });
  dqFlagFrom_(rows);
  return n;
}

/* ---------------- پاسخ گیرنده ---------------- */
function dqIsTo_(r, chat) {
  var p = dqProp_(r.code);
  return (p.to || []).indexOf(String(chat)) > -1 || dqResolve_(r.to).some(function (x) { return x.chat === String(chat); });
}
function dqReply_(r, chat, text) {
  r.reply = String(text).slice(0, 2000); r.repAt = dqStamp_(dqNow_());
  if (r.st === DQ_ST.SENT) r.st = DQ_ST.REP;
  dqWrite_(r);
  tgSend_(dqOwner_(), '📬 <b>پاسخ ' + tgEsc_(r.code) + '</b> · ' + tgEsc_(r.subject) + '\n\n' + tgEsc_(r.reply),
    { inline_keyboard: [[{ text: '🔒 بستن', callback_data: 'dq:cl:' + r.code }]] });
}
function dqCb_(chat, data) {
  var a = String(data).split(':'), act = a[1], code = a.slice(2).join(':');
  if (['new', 'open', 'late'].indexOf(act) > -1) return dqOwnerCb_(chat, act);
  var r = dqGet_(code);
  if (!r) return tgSend_(chat, 'این مورد پیدا نشد.');
  var own = String(chat) === dqOwner_();
  if (['go', 'ed', 'no', 'cl'].indexOf(act) > -1) {
    if (!own) return tgSend_(chat, 'این کار فقط با یاسر است.');
    if (act === 'go') { if (r.st !== DQ_ST.WAIT) return tgSend_(chat, code + ' الان ' + (r.st || 'تازه') + ' است.'); r.ok = DQ_OK; r.st = DQ_ST.READY; dqWrite_(r);
      var s = dqSend_(r); return tgSend_(chat, s === 'sent' ? '✅ ' + code + ' فرستاده شد.' : s === 'wait' ? '✅ تأیید شد؛ در ساعت کاری (۹ تا ۱۸) می‌رود.' : '⚠️ ' + code + ' فرستاده نشد.'); }
    if (act === 'no') { r.st = DQ_ST.CLOSED; r.note = 'لغو یاسر'; dqWrite_(r); return tgSend_(chat, '✖️ ' + code + ' لغو شد.'); }
    if (act === 'ed') { tgSetVal_('dqed', chat, code); return tgSend_(chat, 'متن تازهٔ ' + code + ' را بنویسید.'); }
    if (act === 'cl') { r.st = DQ_ST.CLOSED; dqWrite_(r); return tgSend_(chat, '🔒 ' + code + ' بسته شد.'); }
  }
  if (!dqIsTo_(r, chat)) return tgSend_(chat, 'این پیام برای شما نیست.');
  if ([DQ_ST.SENT, DQ_ST.REP].indexOf(r.st) < 0) return tgSend_(chat, 'این مورد بسته شده است. ممنون.');
  if (act === 'ok') { dqReply_(r, chat, '✅ بررسی کردم و در شیت نوشتم'); return tgSend_(chat, 'ممنون. ثبت شد و به مدیریت خبر دادیم.'); }
  if (act === 're') { tgSetVal_('dqre', chat, code); return tgSend_(chat, 'پاسخ کوتاهتان را بنویسید یا ویس بفرستید.'); }
  if (act === 'mo') { tgSetVal_('dqmo', chat, code); return tgSend_(chat, 'تا چه تاریخی؟ مثلاً ۱۴۰۵/۰۷/۲۰ یا «۳ روز».'); }
}
/* ورودی‌های حالت‌دار: پاسخ کوتاه (متن یا ویس)، تاریخ «زمان بیشتر»، ویرایش یاسر، پیام تازه */
function dqRoute_(chat, m) {
  var text = String((m && m.text) || '').trim(), v = m && (m.voice || m.audio);
  var re = tgGetVal_('dqre', chat), mo = tgGetVal_('dqmo', chat), ed = tgGetVal_('dqed', chat);
  if (re) {
    if (!v && (!text || text.indexOf('/') === 0)) { tgDel_('dqre', chat); return false; }
    var r = dqGet_(re); tgDel_('dqre', chat);
    if (!r) return true;
    if (v) { try { text = '🎙 ' + rvTranscribe_(dqDry_() ? null : tgTgFile_(v.file_id).blob); } catch (e) { tgErr_('dq voice', e); return tgSend_(chat, 'ویس خوانده نشد؛ لطفاً متن بنویسید.') || true; } }
    dqReply_(r, chat, '💬 ' + text);
    tgSend_(chat, 'ممنون. پاسختان رسید.');
    return true;
  }
  if (mo) {
    if (!text || text.indexOf('/') === 0) { tgDel_('dqmo', chat); return false; }
    var r2 = dqGet_(mo); tgDel_('dqmo', chat);
    if (r2) { dqReply_(r2, chat, '⏳ زمان بیشتری لازم است، تا ' + text.slice(0, 40)); tgSend_(chat, 'ممنون. ثبت شد.'); }
    return true;
  }
  if (ed && String(chat) === dqOwner_()) {
    if (!text || text.indexOf('/') === 0) { tgDel_('dqed', chat); return false; }
    var r3 = dqGet_(ed); tgDel_('dqed', chat);
    if (r3) { r3.text = text.slice(0, 3500); dqPreview_(r3); }
    return true;
  }
  if (String(chat) === dqOwner_() || dqIsWatch_(chat)) {
    if (text === DQ_BTN) { dqMenu_(chat); return true; }
    if (tgGetVal_('dqnew', chat)) return dqNewIn_(chat, text);
  }
  return false;
}
function dqIsWatch_(chat) { try { return !!tgWhoWatch_(chat, ''); } catch (e) { return false; } }

/* ---------------- میز یاسر در بات ---------------- */
function dqMenu_(chat) {
  tgSend_(chat, '📮 <b>صف ارسال</b>', { inline_keyboard: [[{ text: '✍️ پیام تازه', callback_data: 'dq:new:-' }],
    [{ text: '📂 پیام‌های باز', callback_data: 'dq:open:-' }, { text: '⏰ بی‌پاسخ', callback_data: 'dq:late:-' }]] });
}
function dqList_(kind) {
  var now = dqNow_().getTime();
  return dqRows_().filter(function (r) {
    if (kind === 'late') { var t = dqParseStamp_(r.sentAt); return r.st === DQ_ST.SENT && t && now - t.getTime() >= DQ_REMIND_H * 3600000; }
    return [DQ_ST.WAIT, DQ_ST.READY, DQ_ST.SENT, DQ_ST.REP].indexOf(r.st) > -1 || (!r.st && r.code);
  }).map(function (r) { return { code: r.code, to: r.to, subject: r.subject, st: r.st || 'تازه', sentAt: r.sentAt, reply: r.reply, tkSt: r.tkSt }; });
}
function dqListText_(kind) {
  var a = dqList_(kind);
  if (!a.length) return kind === 'late' ? 'پیام بی‌پاسخی نیست.' : 'پیام بازی نیست.';
  return (kind === 'late' ? '⏰ <b>بی‌پاسخ (بیش از ۲۴ ساعت)</b>\n' : '📂 <b>پیام‌های باز</b>\n') + a.map(function (x) {
    return '• ' + tgEsc_(x.code) + ' · ' + tgEsc_(x.subject) + ' · ' + tgEsc_(x.to) + ' · ' + tgEsc_(x.st) + (x.tkSt ? ' · تیکت: ' + tgEsc_(x.tkSt) : '');
  }).join('\n');
}
function dqOwnerCb_(chat, act) {
  if (String(chat) !== dqOwner_() && !dqIsWatch_(chat)) return tgSend_(chat, 'این بخش فقط برای ناظر است.');
  if (act === 'open' || act === 'late') return tgSend_(chat, dqListText_(act));
  if (act === 'new') { tgSetVal_('dqnew', chat, JSON.stringify({ step: 'to' })); return tgSend_(chat, 'گیرنده؟ نقش (مثل «مالی») یا نام کامل از تب «افراد» را بنویسید.'); }
}
function dqNewIn_(chat, text) {
  var st = {}; try { st = JSON.parse(tgGetVal_('dqnew', chat) || '{}'); } catch (e) {}
  if (!text || text.indexOf('/') === 0) { tgDel_('dqnew', chat); return false; }
  if (st.step === 'to') {
    if (!dqResolve_(text).length) { tgSend_(chat, 'این نقش یا نام در «افراد» گیرندهٔ فعال ندارد. دوباره بنویسید یا /cancel.'); return true; }
    st.to = text; st.step = 'subject'; tgSetVal_('dqnew', chat, JSON.stringify(st)); tgSend_(chat, 'موضوع کوتاه؟'); return true;
  }
  if (st.step === 'subject') { st.subject = text.slice(0, 120); st.step = 'text'; tgSetVal_('dqnew', chat, JSON.stringify(st)); tgSend_(chat, 'متن پیام؟'); return true; }
  if (st.step === 'text') {
    tgDel_('dqnew', chat);
    var r = dqAdd_({ by: 'یاسر', to: st.to, subject: st.subject, text: text, ok: String(chat) === dqOwner_() });
    if (r.ok !== DQ_OK) { dqPreview_(r); return true; }
    var s = dqSend_(r);
    tgSend_(chat, s === 'sent' ? '✅ ' + r.code + ' فرستاده شد.' : s === 'wait' ? '🕘 ' + r.code + ' ثبت شد و در ساعت کاری می‌رود.' : '⚠️ ' + r.code + ' فرستاده نشد؛ دلیل در ستون یادداشت.');
    return true;
  }
  tgDel_('dqnew', chat); return false;
}

/* ---------------- پیگیری و وضعیت تیکت (هر ساعت از tgWatchdog) ---------------- */
/* «لینک ردیف تیکت»: https://docs.google.com/spreadsheets/d/<id>/edit#gid=<gid>&range=A<row> */
function dqTkRead_(link) {
  if (dqDry_()) return (TG_MEM['dq:tk'] || {})[link] || '';
  var id = (/\/d\/([\w-]{20,})/.exec(link) || [])[1], gid = (/gid=(\d+)/.exec(link) || [])[1], row = +((/range=[A-Z]+(\d+)/.exec(link) || [])[1] || 0);
  if (!id || !row || row < 2) return '';
  var ss = SpreadsheetApp.openById(id), sh = gid ? ss.getSheets().filter(function (s) { return String(s.getSheetId()) === gid; })[0] : ss.getSheets()[0];
  if (!sh) return '';
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(function (x) { return String(x).trim(); });
  var c = head.indexOf('وضعیت'); if (c < 0) c = 8;   /* تیکت‌های مالی: ستون I */
  return String(sh.getRange(row, c + 1).getDisplayValue()).trim();
}
function dqHourly_() {
  var t0 = Date.now(), now = dqNow_(), n = 0, rows = dqRows_();
  if (rows.some(dqNeedsTick_)) { dqFlag_('1'); n += dqTick_(); rows = dqRows_(); }   /* ردیف دستی تازه */
  rows.forEach(function (r) {
    try {
      /* وضعیت تیکت مقصد: فقط ردیف با «لینک ردیف تیکت»، فقط همین اجرای ساعتی */
      if (r.tk && [DQ_ST.SENT, DQ_ST.REP, DQ_ST.PRE].indexOf(r.st) > -1) {
        var s = dqTkRead_(r.tk);
        if (s && s !== r.tkSt) {
          r.tkSt = s; if (s === DQ_TK_DONE && (r.st === DQ_ST.SENT || r.st === DQ_ST.PRE)) { r.st = DQ_ST.REP; r.repAt = r.repAt || dqStamp_(now); } dqWrite_(r);
          if (s === DQ_TK_DONE) tgSend_(dqOwner_(), '📬 <b>' + tgEsc_(r.code) + '</b> · ' + tgEsc_(r.subject) + '\nوضعیت تیکت در شیت: «' + DQ_TK_DONE + '»', { inline_keyboard: [[{ text: '🔒 بستن', callback_data: 'dq:cl:' + r.code }]] });
          n++;
        }
      }
      if (r.st !== DQ_ST.SENT) return;
      var t = dqParseStamp_(r.sentAt); if (!t) return;
      var hrs = (now.getTime() - t.getTime()) / 3600000, p = dqProp_(r.code);
      if (hrs >= DQ_ESC_H && !p.esc) {
        dqProp_(r.code, { esc: now.getTime() });
        tgSend_(dqOwner_(), '⏰ <b>' + tgEsc_(r.code) + '</b> · ' + tgEsc_(r.subject) + '\n۴۸ ساعت از ارسال گذشته و پاسخی نیامده. گیرنده: ' + tgEsc_(r.to) + '. تصمیم با شماست.');
        n++; return;
      }
      if (hrs >= DQ_REMIND_H && !p.rem && dqHoursOk_(r, now)) {
        dqProp_(r.code, { rem: now.getTime() });
        (p.to || dqResolve_(r.to).map(function (x) { return x.chat; })).forEach(function (c) {
          tgSend_(c, '🔔 یادآوری مؤدبانه دربارهٔ <b>' + tgEsc_(r.code) + ' · ' + tgEsc_(r.subject) + '</b>\nهر وقت فرصت کردید، با یکی از دکمه‌های همان پیام خبر بدهید. ممنون.\n\n<i>' + DQ_SIGN + '</i>', dqKb_(r.code));
        });
        n++;
      }
    } catch (e) { tgErr_('dqHourly_ ' + r.code, e); }
  });
  dqFlagFrom_(rows);
  dqStat_(t0, false);
  return n;
}
/* از tgTick5: هر ۱۰ دقیقه */
function dqTick5_() {
  if (!dqDry_() && !v16810Due_('DQ_TICK_AT', 10)) return 0;
  if (!dqDry_()) v16810Prop_('DQ_TICK_AT', v16810Now_());
  var t0 = Date.now();
  if (dqFlag_() !== '1') { dqStat_(t0, true); return 0; }   /* کاری نیست: شیت خوانده نمی‌شود */
  var n = dqTick_();
  dqStat_(t0, false);
  return n;
}

/* ---------------- مینی‌اپ ---------------- */
function dqApi_(p, api) {
  var w = tgApiWho_(p); if (!w) return { ok: false, error: 'auth' };
  var chat = String(w.chat);
  if (api === 'dq.list') return { ok: true, open: dqList_('open'), late: dqList_('late') };
  if (api === 'dq.new') {
    var to = String(p.to || '').trim(), subject = String(p.subject || '').trim(), text = String(p.text || '').trim();
    if (!to || !subject || !text) return { ok: false, error: 'گیرنده، موضوع و متن لازم است.' };
    if (!dqResolve_(to).length) return { ok: false, error: 'این نقش یا نام در «افراد» گیرندهٔ فعال ندارد.' };
    var r = dqAdd_({ by: 'یاسر', to: to, subject: subject, text: text, link: String(p.link || ''), ok: chat === dqOwner_() });
    if (r.ok !== DQ_OK) { dqPreview_(r); return { ok: true, code: r.code, msg: 'پیش‌نمایش برای یاسر رفت.' }; }
    var s = dqSend_(r);
    return { ok: s !== 'err', code: r.code, msg: s === 'sent' ? 'فرستاده شد.' : s === 'wait' ? 'در ساعت کاری می‌رود.' : 'فرستاده نشد.' };
  }
  return { ok: false, error: 'unknown' };
}

/* ---------------- یک‌بارهٔ اولین اجرا: FIN-001 و FIN-002 (تأیید یاسر، ۱۱ مهر) ---------------- */
var DQ_FIN_TAIL = 'پاسخ و اگر پرداختی شده، تاریخ و مبلغ و شمارهٔ پیگیری را در همان ردیف بنویسید و وضعیت را "پاسخ داده شد" کنید. ' +
  'سطر جمع فروردین و اردیبهشت در "تحویل یورویی" حالا فرمول است؛ لطفاً دستی تایپ نشود.';
var DQ_FIN_SEED = [
  { row: 2, subject: 'FIN-001 ماندهٔ یورویی ردیف ۲ در اردیبهشت' },
  { row: 3, subject: 'FIN-002 پرداخت یورویی ردیف ۳ در اردیبهشت' }
];
/* شیت مالی درمانگران از روی نام در درایو پیدا می‌شود (شناسه در کد نیست). خروجی: {url, gid, desc(row)} */
function dqFinTicketsTab_() {
  if (dqDry_()) return TG_MEM['dq:fin'] || null;
  var it = DriveApp.searchFiles('title contains "اکسل مالی درمانگران" and mimeType = "application/vnd.google-apps.spreadsheet" and trashed = false');
  while (it.hasNext()) {
    var ss = SpreadsheetApp.openById(it.next().getId()), sh = ss.getSheetByName('تیکت‌های مالی');
    if (!sh) continue;
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(function (x) { return String(x).trim(); }), c = head.indexOf('شرح مسئله');
    return { url: ss.getUrl(), gid: sh.getSheetId(), desc: function (row) { return c > -1 ? String(sh.getRange(row, c + 1).getDisplayValue()).trim() : ''; } };
  }
  return null;
}
/* شرط یاسر: اگر همین تیکت پیش از انتشار از صف فعلی («سوشال · صف ارسال») رفته، دوباره فرستاده نشود.
   خروجی: {st:'sent'|'queued', at, id} یا null */
function dqSoSent_(fin) {
  var rows = [];
  if (dqDry_()) rows = TG_MEM['dq:so'] || [];
  else { var sh = soSheet_(SO_TAB_OUT); if (sh) rows = sh.getDataRange().getDisplayValues().slice(1); }
  var re = new RegExp('\\b' + fin + '\\b');
  for (var i = 0; i < rows.length; i++) {
    var v = rows[i];
    if (!re.test(String(v[4] || '') + ' ' + String(v[10] || ''))) continue;
    var st = String(v[7] || '').trim();
    if (st === SO_ST_SENT) return { st: 'sent', at: String(v[9] || ''), id: String(v[8] || ''), code: String(v[0] || '') };
    if (st === SO_ST_QUEUE) return { st: 'queued', code: String(v[0] || '') };
  }
  return null;
}
function tgV170Seed() {
  if (dqRows_().some(function (r) { return /^FIN-00[12]/.test(r.subject); })) return 'قبلاً ساخته شده';
  var f = dqFinTicketsTab_();
  if (!f) return 'تب «تیکت‌های مالی» پیدا نشد';
  var out = [];
  DQ_FIN_SEED.forEach(function (s) {
    var fin = s.subject.split(' ')[0], tk = f.url + '#gid=' + f.gid + '&range=A' + s.row, prev = dqSoSent_(fin);
    if (prev && prev.st === 'queued') { out.push(fin + ': در «سوشال · صف ارسال» منتظر است؛ ساخته نشد'); return; }
    if (prev) {
      var p = dqAdd_({ by: 'دستیار', to: DQ_FIN_ROLE, subject: s.subject, text: 'پیش از انتشار v170 از «سوشال · صف ارسال» فرستاده شده بود.', tk: tk, ok: true });
      p.st = DQ_ST.PRE; p.sentAt = prev.at; p.note = 'ردیف ' + prev.code + ' سوشال' + (prev.id ? '، پیام ' + prev.id : ''); dqWrite_(p);
      out.push(p.code + ': ' + DQ_ST.PRE); return;
    }
    var desc = f.desc(s.row);
    if (desc.length > 700) desc = desc.slice(0, 700) + '…';
    var r = dqAdd_({ by: 'دستیار', to: DQ_FIN_ROLE, subject: s.subject, text: (desc ? desc + '\n\n' : '') + DQ_FIN_TAIL, tk: tk, ok: true });
    var st = dqSend_(r);
    out.push(r.code + ': ' + (st === 'sent' ? 'فرستاده شد' : st === 'wait' ? 'در ساعت کاری می‌رود' : 'خطا'));
  });
  return out.join(' · ');
}

/* ---------------- تست خشک ---------------- */
function dqTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var OWN = dqOwner_();
  var to = function (c) { return TG_OUTBOX.filter(function (o) { return o.kind === 'msg' && o.chat === String(c); }); };
  try {
    TG_MEM['people'] = [{ name: 'مسئول مالی آزمایشی', chat: '7301', roles: ['مالی'], status: 'فعال' }, { name: 'پذیرش آزمایشی', chat: '7302', roles: ['پذیرش'], status: 'فعال' },
      { name: 'بی‌چت آزمایشی', chat: '', roles: ['سوشال'], status: 'فعال' }];
    /* یکشنبه ۱۲ مهر ۱۴۰۵، ۱۰:۰۰ تهران */
    TG_MEM['dq:now'] = pbTehran_(2026, 10, 4, 10, 0).getTime();
    var r1 = dqAdd_({ by: 'دستیار', to: 'مالی', subject: 'FIN-009 آزمون', text: 'شرح آزمایشی.', tk: 'TK1', ok: true });
    ok('ساخت ردیف: کد Q-1001 و زمان ثبت', r1.code === 'Q-1001' && !!r1.at && dqGet_('Q-1001'));
    ok('ردیف «تأییدشده» مستقیم و فقط به نقش مالی می‌رود', dqTick_() === 1 && dqGet_('Q-1001').st === DQ_ST.SENT && to('7301').length === 1 && to('7302').length === 0);
    var m = to('7301')[0];
    ok('قالب پیام: کد و موضوع، امضا، بی اسم کوچک، سه دکمه', /Q-1001 · FIN-009/.test(m.text) && m.text.indexOf(DQ_SIGN) > -1 && m.text.indexOf('مسئول') < 0 &&
      JSON.stringify(m.markup).indexOf('dq:ok:Q-1001') > -1 && JSON.stringify(m.markup).indexOf('dq:re:Q-1001') > -1 && JSON.stringify(m.markup).indexOf('dq:mo:Q-1001') > -1);
    ok('لینک پیام و زمان ارسال در ردیف', /message_id=/.test(dqGet_('Q-1001').msg) && !!dqGet_('Q-1001').sentAt);
    /* مسیر تأیید */
    TG_OUTBOX = [];
    var r2 = dqAdd_({ by: 'دستیار', to: 'پذیرش', subject: 'هماهنگی', text: 'لطفاً بررسی کنید.' });
    dqTick_();
    ok('ردیف بی‌تأیید اول پیش‌نمایش برای یاسر با سه دکمه', dqGet_(r2.code).st === DQ_ST.WAIT && to('7302').length === 0 && JSON.stringify(to(OWN)[0].markup).indexOf('dq:go:' + r2.code) > -1);
    dqTick_();
    ok('پیش‌نمایش دوباره نمی‌رود', to(OWN).length === 1);
    dqCb_('7302', 'dq:go:' + r2.code);
    ok('«بفرست» فقط از یاسر', dqGet_(r2.code).st === DQ_ST.WAIT);
    dqCb_(OWN, 'dq:ed:' + r2.code); dqRoute_(OWN, { text: 'متن ویرایش‌شده.' });
    ok('«ویرایش» متن را عوض و دوباره پیش‌نمایش می‌کند', dqGet_(r2.code).text === 'متن ویرایش‌شده.' && to(OWN).length === 3);
    dqCb_(OWN, 'dq:go:' + r2.code);
    var q = function (c) { return to(c).filter(function (o) { return /^📮/.test(o.text); }); };
    ok('بعد از «بفرست» به گیرنده رفت', dqGet_(r2.code).st === DQ_ST.SENT && q('7302').length === 1);
    var r3 = dqAdd_({ to: 'پذیرش', subject: 'لغوی', text: 'x' }); dqTick_(); dqCb_(OWN, 'dq:no:' + r3.code);
    ok('«لغو» ← بسته شد و نمی‌رود', dqGet_(r3.code).st === DQ_ST.CLOSED && q('7302').length === 1);
    /* سه دکمه */
    TG_OUTBOX = [];
    dqCb_('7302', 'dq:ok:Q-1001');
    ok('غیرگیرنده نمی‌تواند پاسخ دهد', !dqGet_('Q-1001').reply);
    dqCb_('7301', 'dq:ok:Q-1001');
    ok('«بررسی کردم» ← پاسخ و زمان در ردیف و خبر به یاسر', dqGet_('Q-1001').st === DQ_ST.REP && /بررسی کردم/.test(dqGet_('Q-1001').reply) && !!dqGet_('Q-1001').repAt && to(OWN).some(function (o) { return /Q-1001/.test(o.text) && /FIN-009/.test(o.text); }));
    dqCb_('7302', 'dq:re:' + r2.code); dqRoute_('7302', { voice: { file_id: 'X' } });
    ok('«پاسخ کوتاه» با ویس ← متن پیاده‌شده در ردیف', /🎙/.test(dqGet_(r2.code).reply) && dqGet_(r2.code).st === DQ_ST.REP);
    var r4 = dqAdd_({ to: 'پذیرش', subject: 'زمان', text: 'y', ok: true }); dqTick_();
    dqCb_('7302', 'dq:mo:' + r4.code); dqRoute_('7302', { text: '۱۴۰۵/۰۷/۲۰' });
    ok('«زمان بیشتر» تاریخ را می‌پرسد و ثبت می‌کند', /۱۴۰۵\/۰۷\/۲۰/.test(dqGet_(r4.code).reply));
    /* وضعیت تیکت در شیت مقصد */
    var r5 = dqAdd_({ to: 'مالی', subject: 'FIN-010', text: 'z', tk: 'TK5', ok: true }); dqTick_();
    TG_OUTBOX = [];
    TG_MEM['dq:tk'] = { TK5: 'در حال بررسی' }; dqHourly_();
    ok('وضعیت تیکت مقصد خوانده و در صف نوشته شد', dqGet_(r5.code).tkSt === 'در حال بررسی' && dqGet_(r5.code).st === DQ_ST.SENT);
    TG_MEM['dq:tk'] = { TK5: DQ_TK_DONE }; dqHourly_();
    ok('«پاسخ داده شد» در شیت ← صف «پاسخ آمد» و خبر به یاسر', dqGet_(r5.code).st === DQ_ST.REP && to(OWN).some(function (o) { return o.text.indexOf(r5.code) > -1; }));
    /* یادآوری و ۴۸ ساعت */
    var r6 = dqAdd_({ to: 'پذیرش', subject: 'بی‌پاسخ', text: 'w', ok: true }); dqTick_();
    TG_OUTBOX = [];
    TG_MEM['dq:now'] = pbTehran_(2026, 10, 5, 11, 0).getTime(); dqHourly_();
    ok('۲۴ ساعت بی‌پاسخ ← یک یادآوری مؤدبانه به گیرنده', to('7302').filter(function (o) { return /یادآوری/.test(o.text) && o.text.indexOf(r6.code) > -1; }).length === 1);
    dqHourly_();
    ok('یادآوری تکرار نمی‌شود', to('7302').filter(function (o) { return /یادآوری/.test(o.text) && o.text.indexOf(r6.code) > -1; }).length === 1);
    TG_MEM['dq:now'] = pbTehran_(2026, 10, 6, 11, 0).getTime(); dqHourly_();
    ok('۴۸ ساعت ← گزارش به یاسر، بی ارجاع خودکار', to(OWN).some(function (o) { return /۴۸ ساعت/.test(o.text) && o.text.indexOf(r6.code) > -1; }));
    ok('«بی‌پاسخ» در فهرست یاسر', dqList_('late').some(function (x) { return x.code === r6.code; }));
    /* ساعت کاری */
    TG_OUTBOX = [];
    TG_MEM['dq:now'] = pbTehran_(2026, 10, 6, 20, 0).getTime();
    var r7 = dqAdd_({ to: 'پذیرش', subject: 'شب', text: 'v', ok: true }); dqTick_();
    ok('بیرون از ۹ تا ۱۸ نمی‌رود و «آمادهٔ ارسال» می‌ماند', dqGet_(r7.code).st === DQ_ST.READY && to('7302').length === 0);
    TG_MEM['dq:now'] = pbTehran_(2026, 10, 9, 10, 0).getTime();   /* جمعه */
    dqTick_();
    ok('جمعه غیرفوری نمی‌رود', dqGet_(r7.code).st === DQ_ST.READY);
    var r8 = dqAdd_({ to: 'پذیرش', subject: 'فوری: آزمون', text: 'u', ok: true }); dqTick_();
    ok('جمعه فوری می‌رود', dqGet_(r8.code).st === DQ_ST.SENT);
    TG_MEM['dq:now'] = pbTehran_(2026, 10, 10, 9, 5).getTime(); dqTick_();
    ok('شنبه ۹ صبح ردیف مانده می‌رود', dqGet_(r7.code).st === DQ_ST.SENT);
    /* گیرندهٔ نامعتبر و حریم */
    TG_OUTBOX = [];
    var r9 = dqAdd_({ to: 'نقش ناموجود', subject: 'x', text: 'x', ok: true }); dqTick_();
    ok('گیرندهٔ نامعتبر ← «خطا» و خبر به یاسر', dqGet_(r9.code).st === DQ_ST.ERR && to(OWN).some(function (o) { return o.text.indexOf(r9.code) > -1; }));
    var r10 = dqAdd_({ to: 'سوشال', subject: 'x', text: 'x', ok: true }); dqTick_();
    ok('گیرندهٔ بی chat_id ← «خطا»', dqGet_(r10.code).st === DQ_ST.ERR);
    var r11 = dqAdd_({ to: 'پذیرش آزمایشی', subject: 'FIN-011 مانده', text: 'x', ok: true }); dqTick_();
    ok('تیکت مالی به غیر «مالی» نمی‌رود', dqGet_(r11.code).st === DQ_ST.ERR && to('7302').length === 0);
    var r12 = dqAdd_({ to: 'پذیرش', subject: 'حقوق مهر', text: 'x', ok: true }); dqTick_();
    ok('حقوق و قرارداد از این مسیر نمی‌رود', dqGet_(r12.code).st === DQ_ST.ERR && to('7302').length === 0);
    /* میز یاسر و مینی‌اپ */
    TG_MEM['dq:now'] = pbTehran_(2026, 10, 10, 10, 0).getTime();
    TG_MEM['watch'] = null;
    ok('دکمهٔ «📮 صف ارسال» برای غیرناظر کار نمی‌کند', dqRoute_('7302', { text: DQ_BTN }) === false);
    TG_OUTBOX = [];
    dqRoute_(OWN, { text: DQ_BTN }); dqCb_(OWN, 'dq:new:-');
    dqRoute_(OWN, { text: 'پذیرش' }); dqRoute_(OWN, { text: 'موضوع تازه' }); dqRoute_(OWN, { text: 'متن تازه.' });
    var last = dqRows_()[dqRows_().length - 1];
    ok('پیام تازه از بات یاسر: ساخته، تأییدشده و فرستاده', last.subject === 'موضوع تازه' && last.ok === DQ_OK && last.st === DQ_ST.SENT);
    TG_MEM['apiwho'] = { chat: Number(OWN), name: 'یاسر' };
    var ls = dqApi_({ initData: 'x' }, 'dq.list');
    ok('مینی‌اپ dq.list: باز و بی‌پاسخ', ls.ok && ls.open.length > 0 && ls.late.length > 0);
    var nw = dqApi_({ initData: 'x', to: 'پذیرش', subject: 'از مینی‌اپ', text: 'سلام' }, 'dq.new');
    ok('مینی‌اپ dq.new: می‌سازد و می‌فرستد', nw.ok && dqGet_(nw.code).st === DQ_ST.SENT);
    ok('اندپوینت‌ها در رجیستری', ['dq.list', 'dq.new'].every(function (a) { return TG_CAP.some(function (c) { return c.api === a && (c.roles || []).indexOf('ناظر') > -1; }); }));
    /* شرط ۱: تیک سبک */
    TG_MEM['dq:now'] = pbTehran_(2026, 10, 10, 11, 0).getTime();
    dqTick_();   /* همه رفتند یا بسته‌اند ← پرچم خاموش */
    TG_MEM['dq:reads'] = 0;
    ok('بی ردیف تازه یا آماده، dqTick5_ شیت را نمی‌خواند', dqFlag_() === '0' && dqTick5_() === 0 && TG_MEM['dq:reads'] === 0);
    var rf = dqAdd_({ to: 'پذیرش', subject: 'پرچم', text: 'p', ok: true });
    ok('ردیف تازه پرچم را روشن می‌کند و تیک بعدی می‌فرستد', dqFlag_() === '1' && dqTick5_() === 1 && dqGet_(rf.code).st === DQ_ST.SENT && dqFlag_() === '0');
    TG_MEM['dq:tk'] = { TK5: DQ_TK_DONE, TKX: 'باز' }; var tkReads = 0, keepTk = dqTkRead_;
    dqTkRead_ = function (l) { tkReads++; return keepTk(l); };
    dqTick5_(); dqTick_();
    ok('تیک ۱۰ دقیقه‌ای وضعیت تیکت را نمی‌خواند', tkReads === 0);
    dqHourly_();
    ok('اجرای ساعتی فقط ردیف‌های دارای لینک تیکت را می‌خواند', tkReads === dqRows_().filter(function (r) { return r.tk && [DQ_ST.SENT, DQ_ST.REP, DQ_ST.PRE].indexOf(r.st) > -1; }).length && tkReads > 0);
    dqTkRead_ = keepTk;
    /* ردیف دستی (بی پرچم) در اجرای ساعتی دیده می‌شود */
    dqFlag_('0'); TG_MEM['dq:rows'].push({ code: 'Q-1990', to: 'پذیرش', subject: 'دستی', text: 'm', ok: DQ_OK, st: '', tk: '' });
    dqHourly_();
    ok('ردیف دستی بی پرچم در اجرای ساعتی فرستاده می‌شود', dqGet_('Q-1990').st === DQ_ST.SENT);
    /* شرط ۲: خط زمان اجرا */
    var hh = dqHealth_();
    ok('زمان اجرای صف جدا ثبت می‌شود (اجرا و بی‌خواندن)', hh.today.n > 0 && hh.today.skip > 0 && typeof hh.today.sec === 'number');
    /* شرط ۴: تیکت‌هایی که پیش از انتشار از صف سوشال رفته‌اند */
    TG_MEM['dq:rows'] = []; TG_OUTBOX = [];
    TG_MEM['dq:fin'] = { url: 'https://docs.google.com/spreadsheets/d/FAKE/edit', gid: 77, desc: function (row) { return 'شرح آزمایشی ردیف ' + row; } };
    TG_MEM['dq:so'] = [['S-9', 'مالی', '', '', 'FIN-001 پیگیری', '', '', SO_ST_SENT, '555', '1405/07/10 12:00', '', 'یاسر']];
    var sd = tgV170Seed();
    var p1 = dqRows_().filter(function (r) { return /^FIN-001/.test(r.subject); })[0], p2 = dqRows_().filter(function (r) { return /^FIN-002/.test(r.subject); })[0];
    ok('FIN-001 که از صف سوشال رفته بود دوباره نمی‌رود و «پیش از انتشار فرستاده شد» ثبت می‌شود', p1 && p1.st === DQ_ST.PRE && /S-9/.test(p1.note) && !TG_OUTBOX.some(function (o) { return /FIN-001/.test(o.text || ''); }));
    ok('FIN-002 با شرح تیکت، جملهٔ یاسر و لینک ردیف ۳ فرستاده شد', p2 && p2.st === DQ_ST.SENT && p2.text.indexOf('شرح آزمایشی ردیف 3') === 0 && p2.text.indexOf('دستی تایپ نشود') > -1 && /gid=77&range=A3$/.test(p2.tk) && to('7301').length > 0);
    ok('یک‌باره دو بار ردیف نمی‌سازد', tgV170Seed() === 'قبلاً ساخته شده' && /Q-1001: پیش از انتشار/.test(sd) && /Q-1002: فرستاده شد/.test(sd));
    TG_MEM['dq:rows'] = []; TG_MEM['dq:so'] = [['S-10', 'مالی', '', '', 'FIN-002', '', '', SO_ST_QUEUE, '', '', '', 'یاسر']];
    ok('اگر در صف سوشال منتظر است، ساخته نمی‌شود و گزارش می‌شود', /FIN-002: در «سوشال · صف ارسال» منتظر است/.test(tgV170Seed()));
    ok('هیچ پیامی از صف نام مراجع یا عدد حقوق ندارد (نگهبان واژه)', !TG_OUTBOX.some(function (o) { return /حقوق/.test(o.text || '') && o.chat !== OWN; }));
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ صف ارسال درست است'));
  return tgTestTally_(log, fail);
}
