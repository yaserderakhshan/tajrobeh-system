/**
 * thq.gs · v170.66 · ۲۲ مهر ۱۴۰۵ · «پرسش از درمانگران»: پرسیدن از خود درمانگر در بات و ثبت در هاب تجربه
 *
 * تب «پرسش از درمانگران» (هاب تجربه): هر ردیف یک پرسش.
 *   کد · مخاطب · متن · گزینه‌ها (با «|») · چندانتخابی؟ · پرسش بعدی (شرطی) · ستون مقصد در «درمانگران» · وضعیت · شمار رسیده · شمار پاسخ
 *   مخاطب: نام‌ها با «،»، «همهٔ فعال‌ها»، «نقش=<نقش تب افراد>» (مثل نقش=سردبیر)، «<ستون درمانگران>=<مقدار>» (مثل زوج‌درمانی=بله)،
 *          یا «شرطی» (فقط از پرسش بعدی یک پرسش دیگر فرستاده می‌شود).
 *   پرسش بعدی (شرطی): «<کد>: <گزینه>|<گزینه>» یا «<کد>: *» (هر جوابی جز «هیچ‌کدام»)، چند تا با «؛».
 *   گزینه‌ها خالی: پاسخ متنی، اختیاری با دکمهٔ «بعداً».
 *   وضعیت: پیش‌نویس ← آمادهٔ ارسال ← ارسال شد. بات ردیف «آمادهٔ ارسال» را به گیرنده‌های وصل‌شده می‌فرستد (۹ تا ۲۱ تهران).
 * جواب‌ها در تب «پاسخ درمانگران» (کد پرسش، نام، پاسخ، زمان) و در ستون مقصد «درمانگران». «خدمات تخصصی» استخرها را هم پر می‌کند.
 * ۴۸ ساعت بعد یک یادآوری، فقط یک بار. به کسی که جواب داده دوباره فرستاده نمی‌شود. وصل‌نشده‌ها در کارت مسئول پذیرش.
 * خطاب بی اسم. کیبورد چندانتخابی همان الگوی فرم پذیرش (▫️/✅ و «✅ همین‌ها»).
 * وضعیت هر گیرنده در Script Property «THQ|<کد>|<chat>» است: {n نام، t زمان ارسال، r یادآوری، a پاسخ، s انتخاب‌ها}.
 */
var THQ_TAB = 'پرسش از درمانگران';
var THQ_HEAD = ['کد', 'مخاطب', 'متن', 'گزینه‌ها', 'چندانتخابی؟', 'پرسش بعدی (شرطی)', 'ستون مقصد در «درمانگران»', 'وضعیت', 'شمار رسیده', 'شمار پاسخ'];
var THQ_ANS = 'پاسخ درمانگران';
var THQ_ANS_HEAD = ['کد پرسش', 'نام', 'پاسخ', 'زمان'];
var THQ_ST = { DRAFT: 'پیش‌نویس', READY: 'آمادهٔ ارسال', SENT: 'ارسال شد' };
var THQ_COND = 'شرطی', THQ_ALL = 'همهٔ فعال‌ها', THQ_LATER = 'بعداً', THQ_NONE = 'هیچ‌کدام';
var THQ_REMIND_MS = 48 * 3600 * 1000, THQ_CAP = 60, THQ_H0 = 9, THQ_H1 = 21;

function thqDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function thqNow_() { return thqDry_() && TG_MEM['thq:now'] ? Number(TG_MEM['thq:now']) : Date.now(); }
function thqProps_() { return PropertiesService.getScriptProperties(); }
function thqGet_(k) { if (thqDry_()) return TG_MEM['thqp:' + k] || ''; return thqProps_().getProperty(k) || ''; }
function thqPut_(k, v) { if (thqDry_()) { TG_MEM['thqp:' + k] = v; return; } thqProps_().setProperty(k, v); }
function thqKeys_() {
  if (thqDry_()) return Object.keys(TG_MEM).filter(function (k) { return k.indexOf('thqp:THQ|') === 0; }).map(function (k) { return k.slice(5); });
  return thqProps_().getKeys().filter(function (k) { return k.indexOf('THQ|') === 0; });
}
function thqRecKey_(code, chat) { return 'THQ|' + code + '|' + String(chat); }
function thqRec_(code, chat) { try { return JSON.parse(thqGet_(thqRecKey_(code, chat)) || 'null'); } catch (e) { return null; } }
function thqRecPut_(code, chat, r) { thqPut_(thqRecKey_(code, chat), JSON.stringify(r)); }
/* این چت گیرندهٔ همین پرسش است؟ (سنجش مالکیت کال‌بک) */
function thqIsMine_(code, chat) { return !!thqRec_(code, chat); }

/* ---------- تب‌ها ---------- */
function thqRows_() { return pbRows_('e', THQ_TAB, THQ_HEAD); }
function thqRow_(code) { var c = String(code || '').trim(); return thqRows_().filter(function (r) { return String(r['کد']).trim() === c; })[0] || null; }
function thqOpts_(row) { return String(row['گزینه‌ها'] || '').split('|').map(function (x) { return x.trim(); }).filter(String); }
function thqMulti_(row) { return /بله/.test(String(row['چندانتخابی؟'] || '')); }
function thqDest_(row) { return String(row['ستون مقصد در «درمانگران»'] || '').replace(/[«»]/g, '').trim(); }

/* ---------- مخاطب ---------- */
function thqTher_() {
  if (thqDry_()) return TG_MEM['thq:ther'] || [];
  return tgTherapistRows_().map(function (t) { return { name: t.name, chat: String(t.chat || '').split(/[,،;\s]+/)[0], status: t.status, row: t.row }; });
}
function thqWhere_(col, val) {
  if (thqDry_()) return (TG_MEM['thq:where'] || {})[col + '=' + val] || [];
  var sh = tgSS_().getSheetByName(TG_THER), hd = sh.getRange(3, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var c = hd.indexOf(col);
  if (c < 0 || sh.getLastRow() < 4) return [];
  return sh.getRange(4, 1, sh.getLastRow() - 3, c + 1).getValues().filter(function (r) { return String(r[c] || '').trim() === val; }).map(function (r) { return tgNorm_(String(r[0] || '')); });
}
/* مخاطب ردیف ← [{name, chat}] (chat خالی یعنی وصل‌نشده) */
function thqAudience_(aud) {
  var a = String(aud || '').trim(), ther = thqTher_();
  if (!a || a === THQ_COND) return [];
  if (a === THQ_ALL) return ther.filter(function (t) { return String(t.status).trim() === 'فعال'; });
  var m = a.match(/^نقش\s*=\s*(.+)$/);
  if (m) {
    var role = m[1].trim();
    return tgPeopleList_().filter(function (p) { return String(p.status || '').trim() !== 'غیرفعال' && (p.roles || []).indexOf(role) > -1; })
      .map(function (p) { return { name: p.name, chat: String(p.chat || '').split(/[,،;\s]+/)[0] }; });
  }
  m = a.match(/^(.+?)\s*=\s*(.+)$/);
  if (m) { var ok = thqWhere_(m[1].trim(), m[2].trim()); return ther.filter(function (t) { return String(t.status).trim() === 'فعال' && ok.indexOf(tgNorm_(t.name)) > -1; }); }
  var names = a.split(/[،,]/).map(function (x) { return tgNorm_(x); }).filter(String), ppl = [];
  try { ppl = tgPeopleList_(); } catch (e) {}
  return names.map(function (n) {
    var t = ther.filter(function (x) { return tgNorm_(x.name) === n; })[0] || ppl.filter(function (x) { return tgNorm_(x.name) === n; })[0];
    return t ? { name: t.name, chat: String(t.chat || '').split(/[,،;\s]+/)[0] } : null;
  }).filter(Boolean);
}

/* ---------- کیبورد ---------- */
function thqKb_(row, sel) {
  var code = String(row['کد']).trim(), opts = thqOpts_(row);
  if (!opts.length) return { inline_keyboard: [[{ text: THQ_LATER, callback_data: 'tq:' + code + ':l' }]] };
  if (!thqMulti_(row)) return { inline_keyboard: opts.map(function (o, i) { return [{ text: o, callback_data: 'tq:' + code + ':' + i }]; }) };
  var wide = opts.some(function (o) { return o.length > 16; }), rows = [], per = wide ? 1 : 2;
  for (var i = 0; i < opts.length; i += per) {
    rows.push(opts.slice(i, i + per).map(function (o, j) { var k = i + j; return { text: ((sel || []).indexOf(k) > -1 ? '✅ ' : '▫️ ') + o, callback_data: 'tq:' + code + ':' + k }; }));
  }
  rows.push([{ text: T_PICK_DONE, callback_data: 'tq:' + code + ':ok' }]);
  return { inline_keyboard: rows };
}
function thqAsk_(row, who) {
  var code = String(row['کد']).trim(), old = thqRec_(code, who.chat);
  if (old && old.a) return false;   /* به کسی که جواب داده دوباره نه */
  var rec = old || { n: who.name, t: 0, r: 0, a: 0, s: [] };
  if (old) rec.r = 1; else rec.t = thqNow_();
  thqRecPut_(code, who.chat, rec);
  if (!thqOpts_(row).length) tgSetVal_('thqw', who.chat, code);
  tgSend_(who.chat, String(row['متن'] || ''), thqKb_(row, rec.s));
  return true;
}

/* ---------- جواب ---------- */
/* کال‌بک tq:<کد>:<شماره|ok|l>. فقط گیرندهٔ همان پرسش (thqIsMine_) */
function thqCb_(cq, chat, data) {
  var p = String(data).split(':'), code = p[1], act = p[2];
  if (!thqIsMine_(code, chat)) return;
  var rec = thqRec_(code, chat), row = thqRow_(code);
  if (!rec || rec.a || !row) return;
  var opts = thqOpts_(row);
  if (act === 'l') { rec.a = 0; rec.l = 1; thqRecPut_(code, chat, rec); tgDel_('thqw', chat); tgSend_(chat, 'باشد.'); return thqNext_(chat); }
  if (!thqMulti_(row)) { var o = opts[Number(act)]; if (o === undefined) return; return thqSave_(row, chat, rec, [o], ''); }
  if (act === 'ok') {
    var picked = (rec.s || []).map(function (i) { return opts[i]; }).filter(function (x) { return x !== undefined; });
    if (!picked.length) return;
    return thqSave_(row, chat, rec, picked, '');
  }
  var k = Number(act); if (!(k >= 0 && k < opts.length)) return;
  var s = rec.s || [], at = s.indexOf(k);
  if (at > -1) s.splice(at, 1);
  else if (opts[k] === THQ_NONE) s = [k];
  else { s = s.filter(function (i) { return opts[i] !== THQ_NONE; }); s.push(k); }
  rec.s = s; thqRecPut_(code, chat, rec);
  try { tgApi_('editMessageReplyMarkup', { chat_id: chat, message_id: cq.message.message_id, reply_markup: thqKb_(row, s) }); } catch (e) {}
}
/* پاسخ متنی (از مسیر درمانگر) */
function thqText_(chat, text) {
  var code = tgGetVal_('thqw', chat);
  if (!code || !String(text || '').trim() || String(text).indexOf('/') === 0 || (typeof tgIsBtnLike_ === 'function' && tgIsBtnLike_(text))) return false;
  var rec = thqRec_(code, chat), row = thqRow_(code);
  if (!rec || rec.a || !row) { tgDel_('thqw', chat); return false; }
  tgDel_('thqw', chat);
  thqSave_(row, chat, rec, [], String(text).trim().slice(0, 3000));
  return true;
}
/* گزینهٔ دکمه ← مقدار فهرست ستون مقصد («خدمات تخصصی» و «مسیر»)؛ ستون دیگر همان متن */
function thqCanon_(dest, label) {
  var q = String(label || '');
  if (dest === SP_COL_SVC) {
    if (/هیچ/.test(q)) return THQ_NONE;
    var M = [[/سکس/, 'سکسولوژی'], [/پیش از ازدواج/, 'پیش از ازدواج'], [/زوج/, 'زوج‌درمانی'], [/طلاق|جدایی/, 'جدایی و طلاق'], [/کودک/, 'کودک زیر ۱۲'], [/نوجوان/, 'نوجوان ۱۲ تا ۱۷'], [/سوگ/, 'سوگ']];
    for (var i = 0; i < M.length; i++) if (M[i][0].test(q)) return M[i][1];
  }
  if (dest === SP_COL_PATH) { if (/هر دو/.test(q)) return 'هر دو'; if (/شناختی/.test(q)) return 'شناختی با تست'; if (/تحلیلی/.test(q)) return 'تحلیلی'; }
  return q;
}
function thqSave_(row, chat, rec, picked, text) {
  var code = String(row['کد']).trim(), dest = thqDest_(row);
  var ans = text || picked.join('، ');
  rec.a = 1; thqRecPut_(code, chat, rec);
  pbAdd_('e', THQ_ANS, THQ_ANS_HEAD, { 'کد پرسش': code, 'نام': rec.n, 'پاسخ': tgCell_(ans), 'زمان': tgJDateFull_(new Date(thqNow_()), TG_TZ) + ' ' + Utilities.formatDate(new Date(thqNow_()), TG_TZ, 'HH:mm') });
  if (dest) {
    var val = text || picked.map(function (x) { return thqCanon_(dest, x); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join('، ');
    thqDestWrite_(rec.n, dest, val);
  }
  thqCount_(row);
  tgSend_(chat, '✅ ثبت شد.');
  thqChain_(row, chat, picked);
  return thqNext_(chat);
}
function thqDestWrite_(name, dest, val) {
  if (thqDry_()) { (TG_MEM['thq:dest'] = TG_MEM['thq:dest'] || []).push({ name: name, dest: dest, val: val }); return; }
  var r = tgTherRow_(name);
  if (!r) return;
  tgSS_().getSheetByName(TG_THER).getRange(r, tgTherCol_(dest)).setValue(tgCell_(val));
  try { CacheService.getScriptCache().removeAll(['trows', 'tmap', 'tinfo']); } catch (e) {}
  if (dest === SP_COL_SVC && typeof spPoolSyncAll_ === 'function') { try { spPoolSyncAll_(name); } catch (e2) { tgErr_('thq pool', e2); } }
}
/* پرسش بعدی شرطی: «<کد>: گزینه|گزینه؛ <کد>: *» ← صف همین چت */
function thqChain_(row, chat, picked) {
  var spec = String(row['پرسش بعدی (شرطی)'] || '').trim();
  if (!spec) return;
  var q = (tgGetVal_('thqq', chat) || '').split(',').filter(String);
  spec.split(/[؛;\n]/).forEach(function (part) {
    var m = part.match(/^\s*([^:：]+?)\s*[:：]\s*(.+)$/);
    if (!m) return;
    var code = m[1].trim(), want = m[2].trim(), hit;
    if (want === '*') hit = picked.some(function (x) { return x && x !== THQ_NONE; });
    else { var W = want.split('|').map(function (x) { return x.trim(); }); hit = picked.some(function (x) { return W.indexOf(x) > -1; }); }
    if (hit && q.indexOf(code) < 0) q.push(code);
  });
  tgSetVal_('thqq', chat, q.join(','));
}
function thqNext_(chat) {
  var q = (tgGetVal_('thqq', chat) || '').split(',').filter(String);
  while (q.length) {
    var code = q.shift(), row = thqRow_(code);
    tgSetVal_('thqq', chat, q.join(','));
    if (!row || String(row['وضعیت']).trim() === THQ_ST.DRAFT) continue;
    var who = { chat: String(chat), name: '' };
    var base = thqKeys_().filter(function (k) { return k.split('|')[2] === String(chat); })[0];
    try { who.name = (JSON.parse(thqGet_(base) || '{}').n) || ''; } catch (e) {}
    if (thqAsk_(row, who)) { thqCount_(row); return true; }
  }
  return false;
}
function thqCount_(row) {
  var code = String(row['کد']).trim(), sent = 0, ans = 0;
  thqKeys_().forEach(function (k) { if (k.split('|')[1] !== code) return; var r = null; try { r = JSON.parse(thqGet_(k)); } catch (e) {} if (r && r.t) { sent++; if (r.a) ans++; } });
  pbSet_('e', THQ_TAB, THQ_HEAD, row, { 'شمار رسیده': sent, 'شمار پاسخ': ans });
}

/* ---------- تیک ساعتی ---------- */
function thqHourOk_() { var h = Number(Utilities.formatDate(new Date(thqNow_()), TG_TZ, 'H')); return h >= THQ_H0 && h < THQ_H1; }
function thqTick_() {
  if (!thqHourOk_()) return 'بیرون از ساعت';
  var n = 0, live = 0, rows = thqRows_();
  rows.forEach(function (row) {
    var st = String(row['وضعیت']).trim(), aud = String(row['مخاطب'] || '').trim(), code = String(row['کد']).trim();
    if (st !== THQ_ST.READY || !code || !aud || aud === THQ_COND) return;
    live++;
    var list = thqAudience_(aud), left = 0, none = [];
    list.forEach(function (w) {
      if (!w.chat) { none.push(w.name); return; }
      if (thqRec_(code, w.chat)) return;
      if (n >= THQ_CAP) { left++; return; }
      if (thqAsk_(row, w)) n++;
    });
    thqCount_(row);
    if (!left) { pbSet_('e', THQ_TAB, THQ_HEAD, row, { 'وضعیت': THQ_ST.SENT }); thqUnlinked_(code, none); }
  });
  var rem = thqRemind_(THQ_CAP - n);
  return 'پرسش از درمانگران: ' + n + ' ارسال · یادآوری ' + rem.sent;
}
/* ۴۸ ساعت بعد، فقط یک بار، فقط بی‌جواب‌ها */
function thqRemind_(cap) {
  var now = thqNow_(), sent = 0, pending = 0, rows = {};
  thqKeys_().forEach(function (k) {
    var r = null; try { r = JSON.parse(thqGet_(k)); } catch (e) {}
    if (!r || r.a || r.r || !r.t) return;
    pending++;
    if (now - r.t < THQ_REMIND_MS || sent >= cap) return;
    var p = k.split('|'), row = rows[p[1]] || (rows[p[1]] = thqRow_(p[1]));
    if (!row) return;
    if (thqAsk_(row, { chat: p[2], name: r.n })) sent++;
  });
  return { sent: sent, pending: pending };
}
/* کارت مسئول پذیرش: درمانگرهای وصل‌نشدهٔ همین پرسش (یک بار) */
function thqUnlinked_(code, none) {
  if (!none.length || thqGet_('THQU|' + code)) return;
  thqPut_('THQU|' + code, '1');
  var boss = typeof grdBoss_ === 'function' ? grdBoss_() : null;
  if (!boss || !boss.chat) return;
  var t = '🔌 <b>پرسش ' + tgEsc_(code) + '</b> · ' + tgFa_(none.length) + ' نفر هنوز به بات وصل نیستند و پرسش به آن‌ها نرسید:\n' + none.map(function (x) { return '• ' + tgEsc_(x); }).join('\n');
  tgNotify_(String(boss.chat).split(/[,،;\s]+/)[0], TG_NK.task, t, { ref: 'THQ-' + code });
}

/* ---------- دستهٔ اول ---------- */
var THQ_SVC_OPTS = 'سکسولوژی و درمان مشکلات جنسی | مشاورهٔ پیش از ازدواج | زوج‌درمانی | مشاورهٔ جدایی و طلاق | کودک زیر ۱۲ سال | نوجوان ۱۲ تا ۱۷ سال | سوگ | هیچ‌کدام';
var THQ_SEED = [
  { 'کد': 'SQ-01', 'مخاطب': THQ_ALL, 'متن': 'سلام، وقت‌تان بخیر. برای اینکه مراجع را دقیق‌تر به شما ارجاع بدهیم، کدام خدمت‌های تخصصی زیر را ارائه می‌دهید؟',
    'گزینه‌ها': THQ_SVC_OPTS, 'چندانتخابی؟': 'بله',
    'پرسش بعدی (شرطی)': 'SQ-02: سکسولوژی و درمان مشکلات جنسی|مشاورهٔ پیش از ازدواج|زوج‌درمانی|مشاورهٔ جدایی و طلاق؛ SQ-03: *',
    'ستون مقصد در «درمانگران»': 'خدمات تخصصی', 'وضعیت': THQ_ST.DRAFT },
  { 'کد': 'SQ-02', 'مخاطب': THQ_COND, 'متن': 'این کار را با کدام مسیر انجام می‌دهید؟',
    'گزینه‌ها': 'تحلیلی | شناختی با تست و ارزیابی | هر دو', 'چندانتخابی؟': 'خیر', 'پرسش بعدی (شرطی)': '',
    'ستون مقصد در «درمانگران»': 'مسیر', 'وضعیت': THQ_ST.DRAFT },
  { 'کد': 'SQ-03', 'مخاطب': THQ_COND, 'متن': 'اگر مایلید، چند خط دربارهٔ همین خدمت برای صفحهٔ سایت بنویسید: جلسه‌ها چطور پیش می‌رود و برای چه کسی مناسب است. پیش از انتشار بازبینی بالینی می‌شود. لطفاً هیچ جزئیاتی از مراجعان ننویسید.',
    'گزینه‌ها': '', 'چندانتخابی؟': 'خیر', 'پرسش بعدی (شرطی)': '',
    'ستون مقصد در «درمانگران»': 'متن تخصصی (پیش‌نویس)', 'وضعیت': THQ_ST.DRAFT },
  { 'کد': 'SQ-04', 'مخاطب': 'نقش=سردبیر', 'متن': 'سلام، وقت‌تان بخیر. دو بازبینی بالینی منتظر شماست: پیش‌نویس صفحهٔ روان‌درمانی نوجوان (برگهٔ ۵۰۶۴۳۲ در وردپرس) و قاعدهٔ رضایت والد برای زیر ۱۸ سال در آیین‌نامهٔ نظام روان‌شناسی. نتیجه را از همین‌جا بفرستید.',
    'گزینه‌ها': 'دیدم، نظرم را می‌فرستم | فعلاً فرصت ندارم', 'چندانتخابی؟': 'خیر', 'پرسش بعدی (شرطی)': '',
    'ستون مقصد در «درمانگران»': '', 'وضعیت': THQ_ST.DRAFT }
];
function thqSeed_() {
  var have = {}; thqRows_().forEach(function (r) { have[String(r['کد']).trim()] = 1; });
  var add = THQ_SEED.filter(function (r) { return !have[r['کد']]; }).map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { o[k] = r[k]; }); return o; });
  pbAddMany_('e', THQ_TAB, THQ_HEAD, add);
  pbRows_('e', THQ_ANS, THQ_ANS_HEAD);
  return 'تب «' + THQ_TAB + '»: ' + add.length + ' پرسش پیش‌نویس · تب «' + THQ_ANS + '» آماده';
}
/* خشک: گیرنده‌ها و کیبورد هر پرسش، بی ارسال. نام‌ها فقط در یادداشت خانهٔ «مخاطب» همان ردیف هاب، نه در لاگ */
function thqDryRun_(codes) {
  var out = [];
  thqRows_().forEach(function (row) {
    var code = String(row['کد']).trim();
    if (codes && codes.indexOf(code) < 0) return;
    var aud = String(row['مخاطب'] || '').trim(), kb = thqKb_(row, []).inline_keyboard;
    if (aud === THQ_COND) { out.push(code + ': شرطی، کیبورد ' + kb.length + ' ردیف'); return; }
    var list = thqAudience_(aud), on = list.filter(function (w) { return w.chat; }), off = list.filter(function (w) { return !w.chat; });
    var done = on.filter(function (w) { var r = thqRec_(code, w.chat); return r && r.a; }).length;
    out.push(code + ': ' + list.length + ' گیرنده، وصل ' + on.length + '، وصل‌نشده ' + off.length + (done ? '، پاسخ‌داده ' + done : '') + '، کیبورد ' + kb.length + ' ردیف');
    if (!thqDry_()) {
      try {
        var sh = pbTab_('e', THQ_TAB, THQ_HEAD);
        sh.getRange(row._row, THQ_HEAD.indexOf('مخاطب') + 1).setNote('گیرنده‌ها (خشک، ' + tgJDateFull_(new Date(), TG_TZ) + ')\nوصل: ' + on.map(function (w) { return w.name; }).join('، ') + '\nوصل‌نشده: ' + off.map(function (w) { return w.name; }).join('، '));
      } catch (e) { tgErr_('thqDryRun_ note', e); }
    }
  });
  return 'پرسش از درمانگران (خشک، بی ارسال): ' + out.join(' | ');
}
/* یک‌باره v170.66: تب‌ها، چهار پرسش دستهٔ اول به‌صورت پیش‌نویس، و اجرای خشک */
function tgV17066ThqSetup() { return thqSeed_() + ' · ' + thqDryRun_(); }

function thqTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_MEM = { 'thq:now': Date.UTC(2026, 9, 14, 7, 0) }; TG_OUTBOX = [];   /* ۱۰:۳۰ تهران */
  var msgs = function (c) { return TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && (!c || x.chat === String(c)); }); };
  var last = function (c) { var m = msgs(c); return m.length ? m[m.length - 1] : {}; };
  try {
    TG_MEM['thq:ther'] = [{ name: 'درمانگر الف', chat: '7301', status: 'فعال' }, { name: 'درمانگر ب', chat: '7302', status: 'فعال' },
                          { name: 'درمانگر وصل‌نشده', chat: '', status: 'فعال' }, { name: 'درمانگر پایان', chat: '7304', status: 'پایان همکاری' }];
    TG_MEM['people'] = [{ name: 'سردبیر نمونه', chat: '7401', roles: ['سردبیر'], status: 'فعال' }, { name: 'دانشجو', chat: '7402', roles: ['دانشجو'], status: 'فعال' }];
    var s = thqSeed_();
    ok('راه‌اندازی: چهار پرسش پیش‌نویس و تب پاسخ‌ها', /4 پرسش/.test(s) && thqRows_().length === 4 && thqRows_().every(function (r) { return r['وضعیت'] === THQ_ST.DRAFT; }), s);
    ok('راه‌اندازی دوباره چیزی اضافه نمی‌کند', /0 پرسش/.test(thqSeed_()) && thqRows_().length === 4);
    var aud = thqAudience_(THQ_ALL);
    ok('مخاطب «همهٔ فعال‌ها»: فقط فعال، وصل‌نشده هم در فهرست (بی chat)', aud.length === 3 && aud.filter(function (w) { return !w.chat; }).length === 1);
    var ed = thqAudience_('نقش=سردبیر');
    ok('مخاطب «نقش=سردبیر» از تب افراد', ed.length === 1 && ed[0].chat === '7401');
    var dry = thqDryRun_();
    ok('خشک: شمار گیرنده‌ها و کیبورد، بی ارسال و بی نام', msgs().length === 0 && /SQ-01: 3 گیرنده، وصل 2، وصل‌نشده 1، کیبورد 9 ردیف/.test(dry) && /SQ-04: 1 گیرنده، وصل 1/.test(dry) && dry.indexOf('درمانگر الف') < 0 && dry.indexOf('سردبیر نمونه') < 0, dry);
    thqTick_();
    ok('پیش‌نویس فرستاده نمی‌شود', msgs().length === 0);

    var r1 = thqRow_('SQ-01'), r4 = thqRow_('SQ-04');
    pbSet_('e', THQ_TAB, THQ_HEAD, r1, { 'وضعیت': THQ_ST.READY }); pbSet_('e', THQ_TAB, THQ_HEAD, r4, { 'وضعیت': THQ_ST.READY });
    pbSet_('e', THQ_TAB, THQ_HEAD, thqRow_('SQ-02'), { 'وضعیت': THQ_ST.READY }); pbSet_('e', THQ_TAB, THQ_HEAD, thqRow_('SQ-03'), { 'وضعیت': THQ_ST.READY });
    TG_MEM['thq:now'] = Date.UTC(2026, 9, 14, 20, 0);   /* ۲۳:۳۰ تهران */
    thqTick_();
    ok('بیرون از ۹ تا ۲۱ تهران چیزی نمی‌رود', msgs().length === 0);
    TG_MEM['thq:now'] = Date.UTC(2026, 9, 14, 7, 0);
    TG_MEM.notify = [];
    var dk = tgDeskRows_;
    tgDeskRows_ = function () { return [{ name: 'پذیرش نمونه', role: 'مسئول پذیرش', chat: '7500' }]; };
    try { thqTick_(); } finally { tgDeskRows_ = dk; }
    var m1 = last('7301');
    ok('آمادهٔ ارسال: به وصل‌شده‌های فعال، متن دقیق و بی اسم', msgs('7301').length === 1 && msgs('7302').length === 1 && msgs('7304').length === 0 && m1.text === THQ_SEED[0]['متن'] && m1.text.indexOf('الف') < 0);
    var kb1 = JSON.stringify(m1.markup);
    ok('کیبورد چندانتخابی همان الگو (▫️ و «✅ همین‌ها»)، هشت گزینه', (kb1.match(/▫️/g) || []).length === 8 && kb1.indexOf(T_PICK_DONE) > -1);
    ok('سردبیر پرسش خودش را گرفت، دو گزینه', msgs('7401').length === 1 && last('7401').markup.inline_keyboard.length === 2);
    ok('وضعیت «ارسال شد» و شمار رسیده', thqRow_('SQ-01')['وضعیت'] === THQ_ST.SENT && Number(thqRow_('SQ-01')['شمار رسیده']) === 2);
    var nt = (TG_MEM.notify || []).filter(function (x) { return String(x.text || '').indexOf('SQ-01') > -1; });
    ok('کارت مسئول پذیرش: نام وصل‌نشده‌ها، یک بار', nt.length === 1 && nt[0].chat === '7500' && nt[0].text.indexOf('درمانگر وصل‌نشده') > -1 && nt[0].text.indexOf('درمانگر الف') < 0);
    TG_OUTBOX = []; thqTick_();
    ok('تیک دوباره: به کسی دوباره فرستاده نمی‌شود', msgs().length === 0);

    var cq = { message: { message_id: 55 } };
    thqCb_(cq, '7301', 'tq:SQ-01:0'); thqCb_(cq, '7301', 'tq:SQ-01:2');
    ok('انتخاب چندتایی در همان پیام (بی پیام تازه)', msgs('7301').length === 0 && (thqRec_('SQ-01', '7301').s || []).join() === '0,2');
    thqCb_(cq, '7999', 'tq:SQ-01:ok');
    ok('کال‌بک از غیرگیرنده نادیده', !thqRec_('SQ-01', '7999'));
    thqCb_(cq, '7301', 'tq:SQ-01:ok');
    var ans = pbRows_('e', THQ_ANS, THQ_ANS_HEAD);
    ok('پاسخ در تب «پاسخ درمانگران»', ans.length === 1 && ans[0]['کد پرسش'] === 'SQ-01' && ans[0]['نام'] === 'درمانگر الف' && ans[0]['پاسخ'] === 'سکسولوژی و درمان مشکلات جنسی، زوج‌درمانی');
    var d1 = (TG_MEM['thq:dest'] || [])[0];
    ok('ستون مقصد «خدمات تخصصی» با مقدار فهرست', d1 && d1.dest === 'خدمات تخصصی' && d1.val === 'سکسولوژی، زوج‌درمانی', JSON.stringify(d1));
    ok('بعد از گزینه‌های اول، پرسش مسیر (SQ-02) آمد', last('7301').text === THQ_SEED[1]['متن']);
    thqCb_(cq, '7301', 'tq:SQ-02:1');
    var d2 = (TG_MEM['thq:dest'] || [])[1];
    ok('مسیر: «شناختی با تست»، بعد پرسش متن (SQ-03) با «بعداً»', d2 && d2.val === 'شناختی با تست' && last('7301').text === THQ_SEED[2]['متن'] && JSON.stringify(last('7301').markup).indexOf(THQ_LATER) > -1, JSON.stringify(d2));
    ok('پاسخ متنی', thqText_('7301', 'جلسه‌ها هفتگی است.') === true && (TG_MEM['thq:dest'] || [])[2].dest === 'متن تخصصی (پیش‌نویس)');
    ok('متن بعدی دیگر پاسخ حساب نمی‌شود', thqText_('7301', 'سلام') === false);
    TG_OUTBOX = [];
    thqCb_(cq, '7301', 'tq:SQ-01:3');
    ok('بعد از پاسخ، دکمهٔ دوباره کاری نمی‌کند', msgs('7301').length === 0 && pbRows_('e', THQ_ANS, THQ_ANS_HEAD).length === 3);

    thqCb_(cq, '7302', 'tq:SQ-01:7'); thqCb_(cq, '7302', 'tq:SQ-01:ok');
    ok('«هیچ‌کدام»: پرسش بعدی نمی‌آید', msgs('7302').filter(function (m) { return m.text === THQ_SEED[1]['متن'] || m.text === THQ_SEED[2]['متن']; }).length === 0 && TG_MEM['thq:dest'][3].val === 'هیچ‌کدام');
    ok('شمار پاسخ', Number(thqRow_('SQ-01')['شمار پاسخ']) === 2 && Number(thqRow_('SQ-01')['شمار رسیده']) === 2);

    TG_OUTBOX = [];
    TG_MEM['thq:now'] = Date.UTC(2026, 9, 16, 6, 0);   /* حدود ۴۷ ساعت بعد */
    thqTick_();
    ok('پیش از ۴۸ ساعت یادآوری نیست', msgs('7401').length === 0);
    TG_MEM['thq:now'] = Date.UTC(2026, 9, 16, 8, 0);
    thqTick_();
    ok('۴۸ ساعت بعد یک یادآوری به بی‌جواب (سردبیر)، نه به جواب‌داده‌ها', msgs('7401').length === 1 && msgs('7301').length === 0 && msgs('7302').length === 0);
    TG_MEM['thq:now'] = Date.UTC(2026, 9, 19, 8, 0);
    thqTick_();
    ok('یادآوری فقط یک بار', msgs('7401').length === 1);
    ok('canon: گزینهٔ «کودک زیر ۱۲ سال» ← «کودک زیر ۱۲»', thqCanon_('خدمات تخصصی', 'کودک زیر ۱۲ سال') === 'کودک زیر ۱۲' && thqCanon_('خدمات تخصصی', 'مشاورهٔ جدایی و طلاق') === 'جدایی و طلاق');
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 400)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'thqTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['پرسش از درمانگران (v170.66)', 'thqTests']); } catch (eThq) {}
