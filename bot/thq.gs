/**
 * thq.gs · v170.64 · ۲۲ مهر ۱۴۰۵ · K07: «پرسش از درمانگران»، برای همیشه
 *
 * تب «پرسش از درمانگران» (هاب تجربه): هر ردیف یک پرسش.
 *   کد · مخاطب · متن · گزینه‌ها (با «|») · چندانتخابی؟ · شرط · ستون مقصد · وضعیت · شمار رسیده · شمار پاسخ
 *   مخاطب: نام‌ها با «،»، «همهٔ فعال‌ها»، یا فیلتر «<ستون>=<مقدار>» روی ستون‌های «درمانگران» (زوج‌درمانی=بله)
 *          یا «افراد» (نقش=سردبیر). ردیفی که «شرط» دارد فقط بعد از پرسش قبلی فرستاده می‌شود.
 *   شرط: «<کد پرسش قبلی>: <پاسخ>|<پاسخ>» یا «<کد>: *» (هر پاسخی جز «هیچ‌کدام»).
 *   گزینه‌های خالی: پاسخ متنی، اختیاری با دکمهٔ «بعداً».
 *   وضعیت: پیش‌نویس ← آمادهٔ ارسال ← ارسال شد. ارسال ۹ تا ۲۱ تهران، فقط به وصل‌شده‌ها.
 * جواب‌ها در تب «پاسخ درمانگران» (کد پرسش، نام، پاسخ، زمان) و در ستون مقصد «درمانگران».
 * مقصد «خدمات تخصصی (تأییدشده)»: گزینه‌ها برای هر نفر از پیش با «اعلام‌شده»اش (پروفایل سایت) تیک می‌خورد و جواب استخرهای تازه را پر می‌کند.
 * ۴۸ ساعت بعد یک یادآوری، فقط یک بار. به کسی که جواب داده دوباره فرستاده نمی‌شود. وصل‌نشده‌ها در کارت مسئول پذیرش. خطاب بی اسم.
 * وضعیت هر گیرنده در Script Property «THQ|<کد>|<chat>»: {n نام، t زمان ارسال، r یادآوری، a پاسخ، s انتخاب‌ها}.
 */
var THQ_TAB = 'پرسش از درمانگران';
var THQ_HEAD = ['کد', 'مخاطب', 'متن', 'گزینه‌ها', 'چندانتخابی؟', 'شرط', 'ستون مقصد', 'وضعیت', 'شمار رسیده', 'شمار پاسخ'];
var THQ_ANS = 'پاسخ درمانگران';
var THQ_ANS_HEAD = ['کد پرسش', 'نام', 'پاسخ', 'زمان'];
var THQ_ST = { DRAFT: 'پیش‌نویس', READY: 'آمادهٔ ارسال', SENT: 'ارسال شد' };
var THQ_ALL = 'همهٔ فعال‌ها', THQ_LATER = 'بعداً', THQ_NONE = 'هیچ‌کدام';
var THQ_REMIND_MS = 48 * 3600 * 1000, THQ_CAP = 60, THQ_H0 = 9, THQ_H1 = 21;

function thqDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function thqNow_() { return thqDry_() && TG_MEM['thq:now'] ? Number(TG_MEM['thq:now']) : Date.now(); }
function thqGet_(k) { if (thqDry_()) return TG_MEM['thqp:' + k] || ''; return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function thqPut_(k, v) { if (thqDry_()) { TG_MEM['thqp:' + k] = v; return; } PropertiesService.getScriptProperties().setProperty(k, v); }
function thqKeys_() {
  if (thqDry_()) return Object.keys(TG_MEM).filter(function (k) { return k.indexOf('thqp:THQ|') === 0; }).map(function (k) { return k.slice(5); });
  return PropertiesService.getScriptProperties().getKeys().filter(function (k) { return k.indexOf('THQ|') === 0; });
}
function thqRecKey_(code, chat) { return 'THQ|' + code + '|' + String(chat); }
function thqRec_(code, chat) { try { return JSON.parse(thqGet_(thqRecKey_(code, chat)) || 'null'); } catch (e) { return null; } }
function thqRecPut_(code, chat, r) { thqPut_(thqRecKey_(code, chat), JSON.stringify(r)); }
/* این چت گیرندهٔ همین پرسش است؟ (سنجش مالکیت کال‌بک) */
function thqIsMine_(code, chat) { return !!thqRec_(code, chat); }

/* ---------- تب و ردیف ---------- */
function thqRows_() { return pbRows_('e', THQ_TAB, THQ_HEAD); }
function thqRow_(code) { var c = String(code || '').trim(); return thqRows_().filter(function (r) { return String(r['کد']).trim() === c; })[0] || null; }
function thqOpts_(row) { return String(row['گزینه‌ها'] || '').split('|').map(function (x) { return x.trim(); }).filter(String); }
function thqMulti_(row) { return /بله/.test(String(row['چندانتخابی؟'] || '')); }
function thqDest_(row) { return String(row['ستون مقصد'] || '').replace(/[«»]/g, '').trim(); }
function thqCond_(row) { var m = String(row['شرط'] || '').match(/^\s*([^:：]+?)\s*[:：]\s*(.+)$/); return m ? { code: m[1].trim(), want: m[2].trim() } : null; }

/* ---------- مخاطب ---------- */
function thqTher_() {
  if (thqDry_()) return TG_MEM['thq:ther'] || [];
  return tgTherapistRows_().map(function (t) { return { name: t.name, chat: String(t.chat || '').split(/[,،;\s]+/)[0], status: t.status }; });
}
function thqWhere_(col, val) {
  if (thqDry_()) { var w = (TG_MEM['thq:where'] || {})[col + '=' + val]; return w === undefined ? null : w; }
  var sh = tgSS_().getSheetByName(TG_THER), hd = sh.getRange(3, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var c = hd.indexOf(col);
  if (c < 0) return null;
  if (sh.getLastRow() < 4) return [];
  return sh.getRange(4, 1, sh.getLastRow() - 3, c + 1).getValues().filter(function (r) { return String(r[c] || '').trim() === val; }).map(function (r) { return tgNorm_(String(r[0] || '')); });
}
function thqPerson_(p) { return { name: p.name, chat: String(p.chat || '').split(/[,،;\s]+/)[0] }; }
/* مخاطب ردیف ← [{name, chat}] (chat خالی یعنی وصل‌نشده) */
function thqAudience_(aud) {
  var a = String(aud || '').trim(), ther = thqTher_();
  if (!a) return [];
  if (a === THQ_ALL) return ther.filter(function (t) { return String(t.status).trim() === 'فعال'; });
  var m = a.match(/^(.+?)\s*=\s*(.+)$/);
  if (m) {
    var col = m[1].trim(), val = m[2].trim();
    if (col !== 'نقش' && col !== 'نقش‌ها') {
      var ok = thqWhere_(col, val);
      if (ok) return ther.filter(function (t) { return String(t.status).trim() === 'فعال' && ok.indexOf(tgNorm_(t.name)) > -1; });
    }
    return tgPeopleList_().filter(function (p) {
      if (String(p.status || '').trim() === 'غیرفعال') return false;
      if (col === 'نقش' || col === 'نقش‌ها') return (p.roles || []).indexOf(val) > -1;
      return String(p[col] || '').trim() === val;
    }).map(thqPerson_);
  }
  var names = a.split(/[،,]/).map(function (x) { return tgNorm_(x); }).filter(String), ppl = [];
  try { ppl = tgPeopleList_(); } catch (e) {}
  return names.map(function (n) {
    var t = ther.filter(function (x) { return tgNorm_(x.name) === n; })[0] || ppl.filter(function (x) { return tgNorm_(x.name) === n; })[0];
    return t ? thqPerson_(t) : null;
  }).filter(Boolean);
}

/* ---------- کیبورد ---------- */
function thqKb_(row, sel) {
  var code = String(row['کد']).trim(), opts = thqOpts_(row);
  if (!opts.length) return { inline_keyboard: [[{ text: THQ_LATER, callback_data: 'tq:' + code + ':l' }]] };
  if (!thqMulti_(row)) return { inline_keyboard: opts.map(function (o, i) { return [{ text: o, callback_data: 'tq:' + code + ':' + i }]; }) };
  var per = opts.some(function (o) { return o.length > 16; }) ? 1 : 2, rows = [];
  for (var i = 0; i < opts.length; i += per) {
    rows.push(opts.slice(i, i + per).map(function (o, j) { var k = i + j; return { text: ((sel || []).indexOf(k) > -1 ? '✅ ' : '▫️ ') + o, callback_data: 'tq:' + code + ':' + k }; }));
  }
  rows.push([{ text: T_PICK_DONE, callback_data: 'tq:' + code + ':ok' }]);
  return { inline_keyboard: rows };
}
/* انتخاب از پیش: مقصد «خدمات تخصصی (تأییدشده)» ← «اعلام‌شده» همان نفر از پروفایل سایت */
var THQ_DECL_X = null;
function thqPre_(row, name) {
  if (thqDest_(row) !== SP_COL_OK || !thqMulti_(row)) return [];
  if (!THQ_DECL_X) { try { THQ_DECL_X = spDeclAll_(); } catch (e) { THQ_DECL_X = {}; } }
  var have = spKeysOf_(THQ_DECL_X[tgNorm_(name)] || ''), out = [];
  thqOpts_(row).forEach(function (o, i) { var k = spKeyOf_(o); if (k && have[k]) out.push(i); });
  return out;
}
function thqAsk_(row, who) {
  var code = String(row['کد']).trim(), old = thqRec_(code, who.chat);
  if (old && old.a) return false;   /* به کسی که جواب داده دوباره نه */
  var rec = old || { n: who.name, t: 0, r: 0, a: 0, s: thqPre_(row, who.name) };
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
  if (act === 'l') { rec.l = 1; thqRecPut_(code, chat, rec); tgDel_('thqw', chat); tgSend_(chat, 'باشد.'); return thqNext_(chat); }
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
  tgDel_('thqw', chat);
  if (!rec || rec.a || !row) return false;
  thqSave_(row, chat, rec, [], String(text).trim().slice(0, 3000));
  return true;
}
/* گزینهٔ دکمه ← مقدار فهرست ستون مقصد */
function thqCanon_(dest, label) {
  var q = String(label || '');
  if (dest === SP_COL_OK) { if (q === THQ_NONE) return THQ_NONE; var k = spKeyOf_(q); return k ? spLine_(k).name : q; }
  if (dest === SP_COL_PATH) { if (/هر دو/.test(q)) return 'هر دو'; if (/شناختی/.test(q)) return 'شناختی با تست'; if (/تحلیلی/.test(q)) return 'تحلیلی'; }
  return q;
}
function thqSave_(row, chat, rec, picked, text) {
  var code = String(row['کد']).trim(), dest = thqDest_(row), now = new Date(thqNow_());
  var ans = text || picked.join('، ');
  rec.a = 1; thqRecPut_(code, chat, rec);
  pbAdd_('e', THQ_ANS, THQ_ANS_HEAD, { 'کد پرسش': code, 'نام': rec.n, 'پاسخ': tgCell_(ans), 'زمان': tgJDateFull_(now, TG_TZ) + ' ' + Utilities.formatDate(now, TG_TZ, 'HH:mm') });
  if (dest) thqDestWrite_(rec.n, dest, text || picked.map(function (x) { return thqCanon_(dest, x); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join('، '));
  thqCount_(row);
  tgSend_(chat, '✅ ثبت شد.');
  thqChain_(code, chat, picked);
  return thqNext_(chat);
}
function thqDestWrite_(name, dest, val) {
  if (thqDry_()) { (TG_MEM['thq:dest'] = TG_MEM['thq:dest'] || []).push({ name: name, dest: dest, val: val }); return; }
  var r = tgTherRow_(name);
  if (!r) return;
  tgSS_().getSheetByName(TG_THER).getRange(r, tgTherCol_(dest)).setValue(tgCell_(val));
  try { CacheService.getScriptCache().removeAll(['trows', 'tmap', 'tinfo']); } catch (e) {}
  if (dest === SP_COL_OK && typeof spPoolSyncAll_ === 'function') { try { spPoolSyncAll_(name); } catch (e2) { tgErr_('thq pool', e2); } }
}
/* ردیف‌هایی که شرطشان به همین پرسش و همین پاسخ می‌خورد ← صف همین چت (به ترتیب تب) */
function thqChain_(code, chat, picked) {
  var q = (tgGetVal_('thqq', chat) || '').split(',').filter(String);
  thqRows_().forEach(function (row) {
    var c = thqCond_(row), rc = String(row['کد']).trim();
    if (!c || c.code !== code || q.indexOf(rc) > -1) return;
    var hit = c.want === '*' ? picked.some(function (x) { return x && x !== THQ_NONE; })
      : picked.some(function (x) { return c.want.split('|').map(function (w) { return w.trim(); }).indexOf(x) > -1; });
    if (hit) q.push(rc);
  });
  tgSetVal_('thqq', chat, q.join(','));
}
function thqNext_(chat) {
  var q = (tgGetVal_('thqq', chat) || '').split(',').filter(String), name = '';
  thqKeys_().some(function (k) { if (k.split('|')[2] !== String(chat)) return false; try { name = JSON.parse(thqGet_(k)).n || ''; } catch (e) {} return !!name; });
  while (q.length) {
    var code = q.shift(), row = thqRow_(code);
    tgSetVal_('thqq', chat, q.join(','));
    if (!row || String(row['وضعیت']).trim() === THQ_ST.DRAFT) continue;
    if (thqAsk_(row, { chat: String(chat), name: name })) { thqCount_(row); return true; }
  }
  return false;
}
function thqCount_(row) {
  var code = String(row['کد']).trim(), sent = 0, ans = 0;
  thqKeys_().forEach(function (k) { if (k.split('|')[1] !== code) return; var r = null; try { r = JSON.parse(thqGet_(k)); } catch (e) {} if (r && r.t) { sent++; if (r.a) ans++; } });
  pbSet_('e', THQ_TAB, THQ_HEAD, row, { 'شمار رسیده': sent, 'شمار پاسخ': ans });
}

/* ---------- تیک ساعتی (قدم واجب نگهبان) ---------- */
function thqHourOk_() { var h = Number(Utilities.formatDate(new Date(thqNow_()), TG_TZ, 'H')); return h >= THQ_H0 && h < THQ_H1; }
function thqTick_() {
  if (!thqHourOk_()) return 'بیرون از ساعت';
  var n = 0;
  THQ_DECL_X = null;
  thqRows_().forEach(function (row) {
    var code = String(row['کد']).trim(), aud = String(row['مخاطب'] || '').trim();
    if (String(row['وضعیت']).trim() !== THQ_ST.READY || !code || !aud || thqCond_(row)) return;
    var left = 0, none = [];
    thqAudience_(aud).forEach(function (w) {
      if (!w.chat) { none.push(w.name); return; }
      if (thqRec_(code, w.chat)) return;
      if (n >= THQ_CAP) { left++; return; }
      if (thqAsk_(row, w)) n++;
    });
    thqCount_(row);
    if (!left) { pbSet_('e', THQ_TAB, THQ_HEAD, row, { 'وضعیت': THQ_ST.SENT }); thqUnlinked_(code, none); }
  });
  var rem = thqRemind_(THQ_CAP - n);
  return 'پرسش از درمانگران: ' + n + ' ارسال · یادآوری ' + rem;
}
/* ۴۸ ساعت بعد، فقط یک بار، فقط بی‌جواب‌ها */
function thqRemind_(cap) {
  var now = thqNow_(), sent = 0, rows = {};
  thqKeys_().forEach(function (k) {
    var r = null; try { r = JSON.parse(thqGet_(k)); } catch (e) {}
    if (!r || r.a || r.r || !r.t || now - r.t < THQ_REMIND_MS || sent >= cap) return;
    var p = k.split('|'), row = rows[p[1]] || (rows[p[1]] = thqRow_(p[1]));
    if (row && thqAsk_(row, { chat: p[2], name: r.n })) sent++;
  });
  return sent;
}
/* کارت مسئول پذیرش (میز پذیرش): درمانگرهای وصل‌نشدهٔ همین پرسش، یک بار */
function thqUnlinked_(code, none) {
  if (!none.length || thqGet_('THQU|' + code)) return;
  thqPut_('THQU|' + code, '1');
  var boss = typeof grdBoss_ === 'function' ? grdBoss_() : null;
  if (!boss || !boss.chat) return;
  tgNotify_(String(boss.chat).split(/[,،;\s]+/)[0], TG_NK.task, '🔌 <b>پرسش ' + tgEsc_(code) + '</b> · ' + tgFa_(none.length) + ' نفر هنوز به بات وصل نیستند و پرسش به آن‌ها نرسید:\n' +
    none.map(function (x) { return '• ' + tgEsc_(x); }).join('\n'), { ref: 'THQ-' + code });
}

/* ---------- دستهٔ اول ---------- */
var THQ_SEED = [
  { 'کد': 'SQ-01', 'مخاطب': THQ_ALL, 'متن': 'سلام، وقت‌تان بخیر. برای اینکه مراجع را دقیق‌تر به شما ارجاع بدهیم، کدام خدمت‌های زیر را به‌عنوان تخصص خودتان ارائه می‌دهید؟ آنچه در پروفایل‌تان زده‌اید از پیش انتخاب شده است.',
    'گزینه‌ها': SP_LINES.map(function (l) { return l.name; }).concat([THQ_NONE]).join(' | '), 'چندانتخابی؟': 'بله', 'شرط': '', 'ستون مقصد': SP_COL_OK },
  { 'کد': 'SQ-02', 'مخاطب': '', 'متن': 'این کار را با کدام مسیر انجام می‌دهید؟',
    'گزینه‌ها': 'تحلیلی | شناختی با تست و ارزیابی | هر دو', 'چندانتخابی؟': 'خیر', 'شرط': 'SQ-01: سکسولوژی|پیش از ازدواج|زوج‌درمانی|جدایی و طلاق|وسواس', 'ستون مقصد': SP_COL_PATH },
  { 'کد': 'SQ-03', 'مخاطب': '', 'متن': 'اگر مایلید، چند خط دربارهٔ همین خدمت برای صفحهٔ سایت بنویسید: جلسه‌ها چطور پیش می‌رود و برای چه کسی مناسب است. پیش از انتشار بازبینی بالینی می‌شود. لطفاً هیچ جزئیاتی از مراجعان ننویسید.',
    'گزینه‌ها': '', 'چندانتخابی؟': 'خیر', 'شرط': 'SQ-01: *', 'ستون مقصد': SP_COL_TEXT },
  { 'کد': 'SQ-04', 'مخاطب': 'نقش=سردبیر', 'متن': 'سلام، وقت‌تان بخیر. دو بازبینی بالینی منتظر شماست: پیش‌نویس صفحهٔ روان‌درمانی نوجوان (برگهٔ ۵۰۶۴۳۲ در وردپرس) و قاعدهٔ رضایت والد برای زیر ۱۸ سال در آیین‌نامهٔ نظام روان‌شناسی.',
    'گزینه‌ها': 'دیدم، نظرم را می‌فرستم | فعلاً فرصت ندارم', 'چندانتخابی؟': 'خیر', 'شرط': '', 'ستون مقصد': '' }
];
/* خشک، بی ارسال و بی نوشتن: گیرنده‌ها، انتخاب از پیش و کیبورد هر پرسش دستهٔ اول. نام‌ها در لاگ نمی‌آید */
function thqDryRun_() {
  THQ_DECL_X = null;
  return 'پرسش از درمانگران (خشک، بی ارسال و بی نوشتن): ' + THQ_SEED.map(function (row) {
    var code = row['کد'], kb = thqKb_(row, []).inline_keyboard;
    if (row['شرط']) return code + ': شرطی (' + row['شرط'].split(':')[0] + ')، کیبورد ' + kb.length + ' ردیف';
    var list = thqAudience_(row['مخاطب']), on = list.filter(function (w) { return w.chat; });
    var pre = on.filter(function (w) { return thqPre_(row, w.name).length; }).length;
    return code + ': ' + list.length + ' گیرنده، وصل ' + on.length + '، وصل‌نشده ' + (list.length - on.length) +
      (thqDest_(row) === SP_COL_OK ? '، با انتخاب از پیش ' + pre : '') + '، کیبورد ' + kb.length + ' ردیف';
  }).join(' | ');
}
/* یک‌باره v170.64: فقط خشک */
function tgV17064ThqDry() { return thqDryRun_(); }

function thqTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, desk: tgDeskRows_ };
  TG_DRY = true; TG_MEM = { 'thq:now': Date.UTC(2026, 9, 14, 7, 0) }; TG_OUTBOX = [];   /* ۱۰:۳۰ تهران */
  var msgs = function (c) { return TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && (!c || x.chat === String(c)); }); };
  var last = function (c) { var m = msgs(c); return m.length ? m[m.length - 1] : {}; };
  try {
    tgDeskRows_ = function () { return [{ name: 'پذیرش نمونه', role: 'مسئول پذیرش', chat: '7500' }]; };
    TG_MEM['thq:ther'] = [{ name: 'درمانگر الف', chat: '7301', status: 'فعال' }, { name: 'درمانگر ب', chat: '7302', status: 'فعال' },
                          { name: 'درمانگر وصل‌نشده', chat: '', status: 'فعال' }, { name: 'درمانگر پایان', chat: '7304', status: 'پایان همکاری' }];
    TG_MEM['people'] = [{ name: 'سردبیر نمونه', chat: '7401', roles: ['سردبیر'], status: 'فعال' }, { name: 'دانشجو', chat: '7402', roles: ['دانشجو'], status: 'فعال' }];
    TG_MEM['thpq'] = {}; TG_MEM['thpq'][tgNorm_('درمانگر الف')] = { focus: 'مسائل جنسی، سوگ و فقدان' };
    var aud = thqAudience_(THQ_ALL);
    ok('مخاطب «همهٔ فعال‌ها»: فقط فعال، وصل‌نشده بی chat', aud.length === 3 && aud.filter(function (w) { return !w.chat; }).length === 1);
    ok('مخاطب «نقش=سردبیر» از تب افراد', thqAudience_('نقش=سردبیر').map(function (w) { return w.chat; }).join() === '7401');
    TG_MEM['thq:where'] = { 'زوج‌درمانی=بله': [tgNorm_('درمانگر ب')] };
    ok('مخاطب «زوج‌درمانی=بله» روی ستون «درمانگران»', thqAudience_('زوج‌درمانی=بله').map(function (w) { return w.chat; }).join() === '7302');
    ok('انتخاب از پیش از «اعلام‌شده»', thqPre_(THQ_SEED[0], 'درمانگر الف').join() === '0,6' && thqPre_(THQ_SEED[0], 'درمانگر ب').length === 0 && thqPre_(THQ_SEED[3], 'درمانگر الف').length === 0);
    var dry = thqDryRun_();
    ok('خشک: گیرنده، انتخاب از پیش و کیبورد؛ بی ارسال، بی نوشتن، بی نام', msgs().length === 0 && !TG_MEM['pb:' + THQ_TAB] && /SQ-01: 3 گیرنده، وصل 2، وصل‌نشده 1، با انتخاب از پیش 1، کیبورد 15 ردیف/.test(dry) && /SQ-02: شرطی \(SQ-01\)/.test(dry) && /SQ-04: 1 گیرنده، وصل 1/.test(dry) && dry.indexOf('درمانگر الف') < 0, dry);

    TG_MEM['pb:' + THQ_TAB] = THQ_SEED.map(function (r) { var o = {}; THQ_HEAD.forEach(function (h) { o[h] = r[h] === undefined ? '' : r[h]; }); o['وضعیت'] = THQ_ST.DRAFT; return o; });
    thqTick_();
    ok('پیش‌نویس فرستاده نمی‌شود', msgs().length === 0);
    thqRows_().forEach(function (r) { pbSet_('e', THQ_TAB, THQ_HEAD, r, { 'وضعیت': THQ_ST.READY }); });
    TG_MEM['thq:now'] = Date.UTC(2026, 9, 14, 20, 0);   /* ۲۳:۳۰ تهران */
    thqTick_();
    ok('بیرون از ۹ تا ۲۱ تهران چیزی نمی‌رود', msgs().length === 0);
    TG_MEM['thq:now'] = Date.UTC(2026, 9, 14, 7, 0); TG_MEM.notify = [];
    thqTick_();
    var m1 = last('7301'), kb1 = JSON.stringify(m1.markup);
    ok('آمادهٔ ارسال: به وصل‌شده‌های فعال، متن دقیق و بی اسم؛ شرطی‌ها نه', msgs('7301').length === 1 && msgs('7302').length === 1 && msgs('7304').length === 0 && m1.text === THQ_SEED[0]['متن'] && !msgs().some(function (m) { return m.text === THQ_SEED[1]['متن']; }));
    ok('کیبورد: سیزده عنوان و «هیچ‌کدام»، «اعلام‌شده» از پیش تیک خورده', (kb1.match(/▫️/g) || []).length === 12 && (kb1.match(/✅ /g) || []).length === 3 && kb1.indexOf('✅ سکسولوژی') > -1 && kb1.indexOf('✅ سوگ') > -1 && kb1.indexOf(T_PICK_DONE) > -1, kb1.slice(0, 300));
    ok('سردبیر پرسش خودش را گرفت، دو گزینه', msgs('7401').length === 1 && last('7401').markup.inline_keyboard.length === 2);
    ok('وضعیت «ارسال شد» و شمار رسیده', thqRow_('SQ-01')['وضعیت'] === THQ_ST.SENT && Number(thqRow_('SQ-01')['شمار رسیده']) === 2);
    var nt = (TG_MEM.notify || []).filter(function (x) { return String(x.text || '').indexOf('SQ-01') > -1; });
    ok('کارت مسئول پذیرش: نام وصل‌نشده‌ها، یک بار', nt.length === 1 && nt[0].chat === '7500' && nt[0].text.indexOf('درمانگر وصل‌نشده') > -1 && nt[0].text.indexOf('درمانگر الف') < 0);
    TG_OUTBOX = []; thqTick_();
    ok('تیک دوباره: به کسی دوباره فرستاده نمی‌شود', msgs().length === 0);

    var cq = { message: { message_id: 55 } };
    thqCb_(cq, '7301', 'tq:SQ-01:6'); thqCb_(cq, '7301', 'tq:SQ-01:2');
    ok('برداشتن و افزودن در همان پیام', msgs('7301').length === 0 && (thqRec_('SQ-01', '7301').s || []).join() === '0,2');
    thqCb_(cq, '7999', 'tq:SQ-01:ok');
    ok('کال‌بک از غیرگیرنده نادیده', !thqRec_('SQ-01', '7999'));
    thqCb_(cq, '7301', 'tq:SQ-01:ok');
    var ans = pbRows_('e', THQ_ANS, THQ_ANS_HEAD);
    ok('پاسخ در تب «پاسخ درمانگران»', ans.length === 1 && ans[0]['کد پرسش'] === 'SQ-01' && ans[0]['نام'] === 'درمانگر الف' && ans[0]['پاسخ'] === 'سکسولوژی، زوج‌درمانی');
    var d1 = (TG_MEM['thq:dest'] || [])[0];
    ok('ستون مقصد «خدمات تخصصی (تأییدشده)»', d1 && d1.dest === SP_COL_OK && d1.val === 'سکسولوژی، زوج‌درمانی', JSON.stringify(d1));
    ok('شرط SQ-02 خورد: پرسش مسیر', last('7301').text === THQ_SEED[1]['متن']);
    thqCb_(cq, '7301', 'tq:SQ-02:1');
    var d2 = TG_MEM['thq:dest'][1];
    ok('مسیر «شناختی با تست»، بعد SQ-03 با «بعداً»', d2.dest === SP_COL_PATH && d2.val === 'شناختی با تست' && last('7301').text === THQ_SEED[2]['متن'] && JSON.stringify(last('7301').markup).indexOf(THQ_LATER) > -1);
    ok('پاسخ متنی', thqText_('7301', 'جلسه‌ها هفتگی است.') === true && TG_MEM['thq:dest'][2].dest === SP_COL_TEXT);
    ok('متن بعدی دیگر پاسخ حساب نمی‌شود', thqText_('7301', 'سلام') === false);
    TG_OUTBOX = []; thqCb_(cq, '7301', 'tq:SQ-01:3');
    ok('بعد از پاسخ، دکمهٔ دوباره کاری نمی‌کند', msgs('7301').length === 0 && pbRows_('e', THQ_ANS, THQ_ANS_HEAD).length === 3);
    thqCb_(cq, '7302', 'tq:SQ-01:6'); thqCb_(cq, '7302', 'tq:SQ-01:13'); thqCb_(cq, '7302', 'tq:SQ-01:ok');
    ok('«هیچ‌کدام» بقیه را برمی‌دارد و پرسش بعدی نمی‌آید', TG_MEM['thq:dest'][3].val === THQ_NONE && !msgs('7302').some(function (m) { return m.text === THQ_SEED[1]['متن'] || m.text === THQ_SEED[2]['متن']; }));
    thqCb_(cq, '7401', 'tq:SQ-04:0');
    ok('سردبیر: پاسخ ثبت، بی ستون مقصد', pbRows_('e', THQ_ANS, THQ_ANS_HEAD).slice(-1)[0]['پاسخ'] === 'دیدم، نظرم را می‌فرستم' && TG_MEM['thq:dest'].length === 4);
    ok('شمار پاسخ', Number(thqRow_('SQ-01')['شمار پاسخ']) === 2);
    var sq = THQ_SEED[3]; TG_MEM['thqp:' + thqRecKey_('SQ-04', '7403')] = JSON.stringify({ n: 'سردبیر دوم', t: Date.UTC(2026, 9, 14, 7, 0), r: 0, a: 0, s: [] });
    TG_OUTBOX = []; TG_MEM['thq:now'] = Date.UTC(2026, 9, 16, 6, 0);
    thqTick_();
    ok('پیش از ۴۸ ساعت یادآوری نیست', msgs('7403').length === 0);
    TG_MEM['thq:now'] = Date.UTC(2026, 9, 16, 8, 0);
    thqTick_();
    ok('۴۸ ساعت بعد یک یادآوری به بی‌جواب، نه به جواب‌داده‌ها', msgs('7403').length === 1 && msgs('7301').length === 0 && msgs('7401').length === 0);
    TG_MEM['thq:now'] = Date.UTC(2026, 9, 19, 8, 0); thqTick_();
    ok('یادآوری فقط یک بار', msgs('7403').length === 1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 400)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; tgDeskRows_ = keep.desk; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'thqTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['K07 پرسش از درمانگران (v170.64)', 'thqTests']); } catch (eThq) {}
