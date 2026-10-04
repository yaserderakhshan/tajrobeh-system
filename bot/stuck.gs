/**
 * stuck.gs · v170.2 · ۱۲ مهر ۱۴۰۵ · «هشدار درخواست متوقف» (حضوری، آنلاین، لید)
 *
 * چرا: درخواست‌هایی که جلو نمی‌روند بی‌صدا می‌ماندند (مثلاً ساعت‌های گاندی که هیچ‌کدام تأیید نشده بود و مراجع حضوری
 * هیچ وقتی نمی‌دید). حالا هر مورد یک ردیف در تب «درخواست‌های متوقف» هاب پذیرش دارد و یک کارت برای مسئول پذیرش و یاسر.
 * - موقعیت‌ها (کلید علت ← STK_R):
 *   حضوری: مکان بی ساعت تأییدشده (inp_noapproved)، شهر بی مکان (inp_nocity)، درخواست ساعت درمانگر بیش از ۲۴ ساعت
 *   «منتظر پذیرش» (inp_req24)، ساعت تأییدشده بی اتاق (inp_noroom).
 *   آنلاین: هیچ وقت معارفه با استخر، منطقهٔ زمانی و روز جور نشد (on_noslot)، رزرو خطا داد (on_bookerr).
 *   لید: مسئول آدم نیست، مثل «بات — خودرزرو» (lead_botowner)؛ لید خارج از ایران بیش از ۳۰ دقیقه بی تماس (lead_abroad).
 * - کارت: علت با عدد، کار بعدی، دکمهٔ همان کار. نام مراجع هرگز؛ فقط کد لید. مورد آنلاین بی لید، لید می‌گیرد.
 * - اسپم نه: برای هر نفر و هر علت روزی یک کارت (Script Property STK_SENT:<روز>). بقیهٔ موردها فقط در تب و خلاصهٔ ۹ صبح.
 * - کارت از tgNotify_ با نوع «کار» می‌رود: سکوت شب و سقف روزانه همان «سیاست پیام» است.
 * - زمان‌بندی: بی تریگر تازه. اسکن ساعتی از tgWatchdog (stkHourly_)، خلاصهٔ ۹ صبح برای یاسر از همان‌جا (یک بار در روز).
 *   موردهای آنلاین همان لحظه از قلاب tgOfferSlots_/tgAskAvail_ و tgOnBook_ ثبت می‌شوند.
 * - موردی که شرطش دیگر برقرار نیست (اسکن) خودکار «حل شد» می‌شود؛ موردهای آنلاین را پذیرش با دکمه می‌بندد.
 */

var STK_TAB = 'درخواست‌های متوقف';
/* هشت ستون اول همان است که یاسر خواست؛ بقیه برای کار خود بات */
var STK_HEAD = ['کد لید', 'نوع', 'حالت', 'شهر یا مکان', 'دلیل دقیق توقف', 'از کی', 'مسئول', 'اقدام لازم',
  'وضعیت', 'کد', 'زمان ثبت', 'کارت', 'کلید', 'زمان حل', 'علت'];
var STK_F = ['lead', 'type', 'mode', 'place', 'detail', 'since', 'owner', 'next', 'st', 'code', 'at', 'card', 'key', 'done', 'reason'];
var STK_ST = { OPEN: 'باز', WORK: 'در حال حل', DONE: 'حل شد' };
var STK_HELD = 'نگه‌داشته تا تأیید یاسر';
var STK_R = {
  inp_noapproved: { part: 'حضوری', label: 'مکان بی ساعت تأییدشده', next: 'ساعت‌های ثبت‌شده را بررسی و تأیید کنید تا به مراجع نشان داده شوند.', btn: ['📋 باز کردن فهرست بررسی', 'q'] },
  inp_wait48: { part: 'حضوری', label: 'تأیید ساعت بیش از ۴۸ ساعت معطل', next: 'ساعت‌های منتظر را همین امروز تأیید یا رد کنید.', btn: ['📋 باز کردن فهرست بررسی', 'q'] },
  inp_nocity: { part: 'حضوری', label: 'شهر بی مکان', next: 'مکان یا درمانگر حضوری در این شهر پیدا کنید، یا به مراجع جلسهٔ آنلاین پیشنهاد دهید.', btn: ['📋 باز کردن فهرست حضوری', 'q'] },
  inp_req24: { part: 'حضوری', label: 'درخواست ساعت درمانگر بیش از ۲۴ ساعت منتظر پذیرش', next: 'درخواست‌ها را تأیید یا رد کنید.', btn: ['📋 باز کردن فهرست بررسی', 'q'] },
  inp_noroom: { part: 'حضوری', label: 'ساعت تأییدشده بی اتاق', next: 'برای این ساعت‌ها اتاق تعیین کنید.', btn: ['🚪 تعیین اتاق', 'q'] },
  on_noslot: { part: 'آنلاین', label: 'وقت معارفه جور نشد', next: 'با مراجع تماس بگیرید و وقت دستی پیدا کنید، یا به درمانگرهای استخر وقت تازه اضافه کنید.', btn: ['👥 واگذاری لید', 'asg'] },
  on_bookerr: { part: 'آنلاین', label: 'رزرو خطا داد', next: 'رزرو را دستی ثبت کنید و به مراجع خبر بدهید.', btn: ['👥 واگذاری لید', 'asg'] },
  lead_botowner: { part: 'لید', label: 'مسئول لید آدم نیست', next: 'لید را به یک نفر از پذیرش واگذار کنید.', btn: ['👥 واگذاری لید', 'asg'] },
  lead_abroad: { part: 'لید', label: 'لید خارج از ایران بی تماس', next: 'همین حالا تماس اول را بگیرید یا لید را واگذار کنید.', btn: ['👥 واگذاری لید', 'asg'] },
  lead_stage: { part: 'لید', label: 'مهلت مرحلهٔ مصاحبه یا سوپروایزر گذشت', next: 'از مسئول مرحله نتیجه را بگیرید یا مهلت تازه بگذارید.', btn: ['🏁 ثبت پیامد', 'out'] },
  /* سلامت لید، هر صبح (lmHealth_) */
  lead_nonext: { part: 'لید', label: 'لید بی اقدام بعدی یا با موعد گذشته', next: 'اقدام بعدی و تاریخش را بگذارید یا همان کار را انجام دهید.', btn: ['🏁 ثبت پیامد', 'out'] },
  lead_closednext: { part: 'لید', label: 'لید بسته با اقدام بعدی باز', next: 'اقدام بعدی را پاک کنید یا لید را دوباره باز کنید.', btn: ['🏁 ثبت پیامد', 'out'] },
  lead_new48: { part: 'لید', label: 'لید جدید بیش از ۴۸ ساعت بی تماس', next: 'همین امروز تماس اول را بگیرید یا لید را واگذار کنید.', btn: ['👥 واگذاری لید', 'asg'] },
  lead_comment3: { part: 'لید', label: 'کامنت باز بیش از ۳ روز', next: 'کامنت را بخوانید و نتیجه را روی خود لید ثبت کنید.', btn: ['🏁 ثبت پیامد', 'out'] },
  lead_meetstale: { part: 'لید', label: 'معارفهٔ رزروشده بی تاریخ یا بی نتیجه', next: 'تاریخ معارفه یا نتیجهٔ آن را ثبت کنید.', btn: ['🏁 ثبت پیامد', 'out'] }
};
var STK_ABROAD_MIN = 30, STK_REQ_H = 24, STK_WAIT_H = 48;

function stkDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function stkNow_() { return stkDry_() && TG_MEM['stk:now'] ? new Date(Number(TG_MEM['stk:now'])) : new Date(); }
function stkDay_(d) { return Utilities.formatDate(d || stkNow_(), TG_TZ, 'yyyyMMdd'); }
function stkStamp_(d) { d = d || stkNow_(); return tgJDateFull_(d, TG_TZ) + ' ' + Utilities.formatDate(d, TG_TZ, 'HH:mm'); }
function stkJDay_(ms) { var j = tgJalali_(new Date(ms), TG_TZ); return tgFa_(j.d) + ' ' + TG_JMONTHS[j.m - 1]; }
function stkProp_(k, v) {
  if (stkDry_()) { if (v === undefined) return TG_MEM['stkp:' + k] || ''; TG_MEM['stkp:' + k] = v; return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty(k) || '';
  if (v === null) P.deleteProperty(k); else P.setProperty(k, String(v));
  return v;
}
/* کارت‌ها تا یاسر دکمهٔ «📤 ارسال کارت‌ها» را نزده، فقط در تب می‌مانند */
function stkSendOn_() { return stkProp_('STK_SEND_OK') === '1'; }

/* ---------------- تب ---------------- */
function stkSheet_() {
  var ss = tgSS_(), sh = ss.getSheetByName(STK_TAB);
  if (!sh) {
    sh = ss.insertSheet(STK_TAB); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, STK_HEAD.length).setValues([STK_HEAD]).setFontWeight('bold').setFontColor('#fefefe').setBackground('#222222');
    sh.setFrozenRows(1); sh.setColumnWidth(5, 420); sh.setColumnWidth(8, 300);
    sh.getRange(2, 9, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([STK_ST.OPEN, STK_ST.WORK, STK_ST.DONE], true).setAllowInvalid(false).build());
  }
  return sh;
}
function stkRows_() {
  if (stkDry_()) return (TG_MEM['stk:rows'] = TG_MEM['stk:rows'] || []);
  var sh = stkSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, STK_HEAD.length).getDisplayValues().map(function (v, i) {
    var r = { row: i + 2 }; STK_F.forEach(function (f, j) { r[f] = v[j]; }); return r;
  }).filter(function (r) { return r.code; });
}
function stkArr_(r) { return STK_F.map(function (f) { return r[f] === undefined || r[f] === null ? '' : r[f]; }); }
function stkWrite_(r) {
  if (stkDry_()) { var a = stkRows_(), i = a.map(function (x) { return x.code; }).indexOf(r.code); if (i < 0) a.push(r); else a[i] = r; return; }
  var sh = stkSheet_();
  if (r.row) sh.getRange(r.row, 1, 1, STK_HEAD.length).setValues([stkArr_(r)]);
  else { sh.appendRow(stkArr_(r)); r.row = sh.getLastRow(); }
}
function stkOpen_(r) { return r.st !== STK_ST.DONE; }

/* ---------------- گیرنده‌ها و کارت ---------------- */
/* کارت کامل برای مسئول پذیرش (ژیلا)؛ یاسر برای هر مورد یک خط کوتاه می‌گیرد */
function stkBoss_() {
  try { var b = stkDry_() ? TG_MEM['stk:boss'] : tgDutyBoss_(); var c = b ? tgChatIds_(b.chat)[0] : ''; return c ? { name: b.name || '', chat: String(c) } : null; } catch (e) { return null; }
}
function stkKb_(r, def) {
  var rows = [], lead = (/^L-\d+/.exec(r.lead) || [''])[0];
  if (def.btn[1] === 'asg' && lead) rows.push([{ text: def.btn[0], callback_data: 'ld:asg:' + lead }]);
  else if (def.btn[1] === 'out' && lead) rows.push([{ text: def.btn[0], callback_data: 'lm:o:' + lead }]);
  else if (def.btn[1] === 'q') rows.push([{ text: def.btn[0], callback_data: 'sk:q:' + r.code }]);
  rows.push([{ text: '🔧 در حال حل', callback_data: 'sk:w:' + r.code }, { text: '✅ حل شد', callback_data: 'sk:ok:' + r.code }]);
  return { inline_keyboard: rows };
}
function stkCardText_(r, def) {
  return '⛔️ <b>درخواست متوقف · ' + tgEsc_(r.mode) + '</b>\n' + tgEsc_(def.label) + '\n\n' + tgEsc_(r.detail) +
    (r.lead ? '\nلید: <code>' + tgEsc_(r.lead) + '</code>' : '') + (r.type ? ' · نوع: ' + tgEsc_(r.type) : '') +
    (r.place ? '\nشهر یا مکان: ' + tgEsc_(r.place) : '') + (r.since ? '\nاز: ' + tgEsc_(r.since) : '') +
    '\n\n<b>اقدام لازم:</b> ' + tgEsc_(def.next) + '\n<code>' + tgEsc_(r.code) + '</code>';
}
function stkLine_(r) {
  return '⛔️ ' + tgEsc_(r.code) + (r.lead ? ' · ' + tgEsc_(String(r.lead).slice(0, 40)) : '') + ' · ' + tgEsc_(r.mode) + ' · ' + tgEsc_(r.reason) + (r.place ? ' · ' + tgEsc_(r.place) : '') +
    '\n' + tgEsc_(String(r.detail).slice(0, 200));
}
/* برای هر نفر و هر علت روزی یک کارت */
function stkSentToday_(chat, reason, mark) {
  var k = 'STK_SENT:' + stkDay_(), m = {};
  try { m = JSON.parse(stkProp_(k) || '{}'); } catch (e) {}
  var id = chat + '|' + reason;
  if (!mark) return !!m[id];
  m[id] = 1; stkProp_(k, JSON.stringify(m));
  return true;
}
/* فرستادن کارت یک مورد: کارت کامل به ژیلا، خط کوتاه به یاسر؛ هر نفر و هر علت روزی یک بار */
function stkSend_(r) {
  var def = STK_R[r.key.split(':')[0]]; if (!def) return 0;
  var boss = stkBoss_(), own = String(TG_OWNER_CHAT), sent = 0, rk = r.key.split(':')[0];
  var full = boss ? boss.chat : own;
  [[full, 'card'], [own, 'line']].forEach(function (x) {
    if (x[1] === 'line' && x[0] === full) return;
    if (stkSentToday_(x[0], rk)) return;
    var st = x[1] === 'card' ? tgNotify_(x[0], TG_NK.task, stkCardText_(r, def), { ref: r.code, markup: stkKb_(r, def) })
                             : tgNotify_(x[0], TG_NK.task, stkLine_(r), { ref: r.code });
    if (st === 'رفت' || st === 'صف') { stkSentToday_(x[0], rk, true); sent++; }
  });
  r.card = sent ? stkStamp_() : (r.card && r.card !== STK_HELD ? r.card : 'فقط در تب و خلاصه');
  stkWrite_(r);
  return sent;
}

/* ثبت یا به‌روزرسانی یک مورد. o: {reason, key, detail, lead, type, place, since, owner, ref} ← ردیف */
function stkRaise_(o) {
  var def = STK_R[o.reason]; if (!def) return null;
  var key = o.reason + ':' + (o.key || '-');
  var r = stkRows_().filter(function (x) { return x.key === key && stkOpen_(x); })[0];
  var since = o.since ? stkJDay_(o.since) : '';
  if (r) {
    r.detail = String(o.detail || r.detail); if (o.lead) r.lead = o.lead; if (o.type) r.type = o.type; if (o.place) r.place = o.place; if (since) r.since = since; if (o.owner) r.owner = o.owner;
    stkWrite_(r);
    return r;
  }
  var mx = 1000; stkRows_().forEach(function (x) { var m = /^S-(\d+)$/.exec(x.code); if (m) mx = Math.max(mx, +m[1]); });
  var boss = stkBoss_();
  r = { code: 'S-' + (mx + 1), at: stkStamp_(), mode: o.mode || def.part, reason: def.label, detail: String(o.detail || ''), lead: o.lead || '', type: o.type || '',
    place: o.place || '', since: since || stkStamp_(), owner: o.owner || (boss ? boss.name : ''), next: def.next, st: STK_ST.OPEN, card: '', key: key, done: '' };
  stkWrite_(r);
  try { var lc = (/^L-\d+$/.exec(r.lead) || [''])[0]; if (lc) tgLeadEv_({ code: lc, actor: 'بات', channel: 'درخواست متوقف', what: 'توقف', to: def.label, note: r.code + ' · ' + String(r.detail).slice(0, 200), type: r.type }); } catch (eE) {}
  if (!stkSendOn_()) { r.card = STK_HELD; stkWrite_(r); return r; }
  stkSend_(r);
  return r;
}
/* بعد از تأیید یاسر: کارت‌های نگه‌داشته می‌روند (همان قاعدهٔ هر نفر و هر علت روزی یک کارت) و یک فهرست کامل برای یاسر */
function stkRelease_() {
  stkProp_('STK_SEND_OK', '1');
  var held = stkRows_().filter(function (r) { return stkOpen_(r) && r.card === STK_HELD; }), n = 0;
  var boss = stkBoss_();
  held.forEach(function (r) {
    var def = STK_R[r.key.split(':')[0]]; if (!def || !boss) { r.card = 'فقط در تب و خلاصه'; stkWrite_(r); return; }
    if (!stkSentToday_(boss.chat, r.key.split(':')[0])) {
      var st = tgNotify_(boss.chat, TG_NK.task, stkCardText_(r, def), { ref: r.code, markup: stkKb_(r, def) });
      if (st === 'رفت' || st === 'صف') { stkSentToday_(boss.chat, r.key.split(':')[0], true); r.card = stkStamp_(); n++; }
    }
    if (r.card === STK_HELD) r.card = 'فقط در تب و خلاصه';
    stkWrite_(r);
  });
  var t = stkSummaryText_();
  if (t) tgNotify_(String(TG_OWNER_CHAT), TG_NK.task, t, { ref: 'STK' });
  return { held: held.length, cards: n };
}
/* اسکن: موردی که دیگر شرطش نیست، حل می‌شود (فقط علت‌های اسکنی) */
function stkSettle_(reasons, liveKeys) {
  var n = 0;
  stkRows_().forEach(function (r) {
    if (!stkOpen_(r)) return;
    var rk = r.key.split(':')[0];
    if (reasons.indexOf(rk) < 0 || liveKeys[r.key]) return;
    r.st = STK_ST.DONE; r.done = stkStamp_(); stkWrite_(r); n++;
  });
  return n;
}

/* ---------------- اسکن حضوری ---------------- */
function stkHrs_(h) { var a = tgInpH_(h.from), b = tgInpH_(h.to); return (a !== null && b !== null && b > a) ? b - a : 0; }
/* کد لیدهای وصل‌شده به ردیف‌های یک تب جزئیات (ستون «کد لید» که مدل لید می‌نویسد) */
function stkCodes_(rows, head) {
  var i = head.indexOf('کد لید'), out = [];
  if (i < 0) return '';
  rows.forEach(function (r) { var c = (/^L-[\w]+/.exec(String(r[i] || '')) || [''])[0]; if (c && out.indexOf(c) < 0) out.push(c); });
  return out.slice(0, 6).join('، ') + (out.length > 6 ? ' و ' + tgFa_(out.length - 6) + ' لید دیگر' : '');
}
function stkInpScan_(live) {
  var d = tgInpData_(), sla = {};
  try { sla = JSON.parse((stkDry_() ? TG_MEM['V168_INPSLA'] : PropertiesService.getScriptProperties().getProperty('V168_INPSLA')) || '{}'); } catch (e) {}
  var now = stkNow_().getTime(), byP = {};
  d.hours.forEach(function (h) {
    if (/^(ندارد|خیر|پر|نه)/.test(h.open)) return;
    var p = (byP[h.p] = byP[h.p] || { tot: 0, ok: 0, wait: 0, since: 0, noroom: 0, noroomRows: 0, old: 0 });
    var hrs = stkHrs_(h), ok = v168HourOk_(h);
    p.tot += hrs;
    if (ok) { p.ok += hrs; if (!String(h.room || '').trim()) { p.noroom += hrs; p.noroomRows++; } }
    else if (String(h.chk || '').trim() === 'در انتظار تأیید' || !String(h.chk || '').trim()) {
      p.wait += hrs; var s = sla['h:' + tgInpRowKey_(h)];
      if (s && s.t && (!p.since || s.t < p.since)) p.since = s.t;
      if (s && s.t && now - s.t >= STK_WAIT_H * 3600000) p.old += hrs;
    }
  });
  var dt = lmInpTab_(TG_INP_DEM, TG_INP_DHEAD), demHead = dt.head;
  var dem = dt.rows.filter(function (r) { return r[1] === 'مراجع' && r[7] === 'باز'; });
  var wantP = {}, wantCity = {};
  dem.forEach(function (r) {
    var city = (/شهر:\s*(.+)$/.exec(String(r[6] || '')) || [])[1];
    if (city) (wantCity[city.trim()] = wantCity[city.trim()] || []).push(r);
    else if (r[2] && r[2] !== '-') (wantP[r[2]] = wantP[r[2]] || []).push(r);
  });
  Object.keys(byP).forEach(function (pid) {
    var p = byP[pid], name = tgInpPlaceName_(pid, d), w = wantP[pid] || [];
    if (p.tot && !p.ok) {
      var det = name + ': ' + tgFa_(p.tot) + ' ساعت ثبت شده، ۰ تأییدشده؛ ' + tgFa_(p.wait) + ' ساعت' + (p.since ? ' از ' + stkJDay_(p.since) : '') + ' در انتظار بررسی پذیرش' +
        (w.length ? '. ' + tgFa_(w.length) + ' مراجع حضوری اینجا را خواسته‌اند.' : '.');
      live['inp_noapproved:' + pid] = 1;
      stkRaise_({ reason: 'inp_noapproved', key: pid, detail: det, place: name, type: LM_T.I, since: p.since, lead: stkCodes_(w, demHead) });
    }
    if (p.old) {
      live['inp_wait48:' + pid] = 1;
      stkRaise_({ reason: 'inp_wait48', key: pid, place: name, type: LM_T.I, since: p.since, lead: stkCodes_(w, demHead),
        detail: name + ': ' + tgFa_(p.old) + ' ساعت بیش از ۴۸ ساعت در انتظار تأیید پذیرش است' + (p.since ? '؛ قدیمی‌ترین از ' + stkJDay_(p.since) : '') + '.' });
    }
    if (p.noroom) {
      live['inp_noroom:' + pid] = 1;
      stkRaise_({ reason: 'inp_noroom', key: pid, place: name, type: LM_T.I, detail: name + ': ' + tgFa_(p.noroomRows) + ' ردیف (' + tgFa_(p.noroom) + ' ساعت در هفته) تأیید شده ولی اتاق ندارد.' });
    }
  });
  /* مکانی که مراجع خواسته ولی هیچ ساعتی ثبت نشده */
  Object.keys(wantP).forEach(function (pid) {
    if (byP[pid] && byP[pid].tot) return;
    var name = tgInpPlaceName_(pid, d);
    live['inp_noapproved:' + pid] = 1;
    stkRaise_({ reason: 'inp_noapproved', key: pid, place: name, type: LM_T.I, lead: stkCodes_(wantP[pid], demHead),
      detail: name + ': ۰ ساعت ثبت شده؛ ' + tgFa_(wantP[pid].length) + ' مراجع حضوری اینجا را خواسته‌اند.' });
  });
  Object.keys(wantCity).forEach(function (city) {
    live['inp_nocity:' + city] = 1;
    stkRaise_({ reason: 'inp_nocity', key: city, place: city, type: LM_T.I, lead: stkCodes_(wantCity[city], demHead),
      detail: city + ': ' + tgFa_(wantCity[city].length) + ' تقاضای باز در «تقاضا و انتظار حضوری»؛ ۰ مکان در این شهر.' });
  });
  /* درخواست ساعت درمانگر بیش از ۲۴ ساعت «منتظر پذیرش» (سن از دفتر مهلت v168InpSla_) */
  var qt = lmInpTab_(TG_INP_REQ, TG_INP_QHEAD);
  var reqs = qt.rows.filter(function (r) { return r[13] === 'منتظر پذیرش'; });
  var old = reqs.filter(function (r) { var s = sla['q:' + r[0]]; return s && s.t && now - s.t >= STK_REQ_H * 3600000; });
  if (old.length) {
    var first = Math.min.apply(null, old.map(function (r) { return sla['q:' + r[0]].t; }));
    var places = []; old.forEach(function (r) { var n = tgInpPlaceName_(r[4], d); if (places.indexOf(n) < 0) places.push(n); });
    live['inp_req24:all'] = 1;
    stkRaise_({ reason: 'inp_req24', key: 'all', type: LM_T.I, since: first, place: places.join('، '), lead: stkCodes_(old, qt.head),
      detail: tgFa_(old.length) + ' درخواست ساعت درمانگر بیش از ۲۴ ساعت «منتظر پذیرش» است (از ' + tgFa_(reqs.length) + ' درخواست باز)؛ قدیمی‌ترین از ' + stkJDay_(first) + '. شناسه‌ها: ' + old.map(function (r) { return r[0]; }).slice(0, 10).join('، ') });
  }
}

/* ---------------- اسکن لید ---------------- */
function stkLeadScan_(live, only) {
  var leads = [];
  try { leads = tgOpenLeads_(); } catch (e) { return; }
  var boss = stkBoss_(), now = stkNow_().getTime();
  leads.forEach(function (l) {
    if (!l.code) return;
    if (only && only.indexOf(l.code) < 0) return;
    var own = /^بات/.test(l.owner) || !l.owner ? (boss ? boss.name : '') : l.owner;
    if (/^بات/.test(l.owner)) {
      live['lead_botowner:' + l.code] = 1;
      stkRaise_({ reason: 'lead_botowner', key: l.code, lead: l.code, type: l.type, owner: own, mode: l.mode || 'لید',
        detail: 'مسئول ' + l.code + ' «' + l.owner + '» است، نه یک نفر از پذیرش' + (l.touched ? '' : '؛ ' + tgFa_(Math.round(l.age / 60)) + ' ساعت است تماسی ثبت نشده') + '.' });
    }
    if (l.abroad && !l.touched && l.age >= STK_ABROAD_MIN) {
      live['lead_abroad:' + l.code] = 1;
      stkRaise_({ reason: 'lead_abroad', key: l.code, lead: l.code, type: l.type, owner: own, place: 'خارج از ایران', mode: l.mode || 'لید',
        detail: l.code + ': خارج از ایران، ' + tgFa_(l.age) + ' دقیقه بی تماس' + (l.owner ? ' · مسئول: ' + l.owner : ' · بی مسئول') + '.' });
    }
    var sd = l.stageDue ? new Date(String(l.stageDue).replace(' ', 'T') + (String(l.stageDue).length <= 10 ? 'T23:59:00' : ':00')) : null;
    if (sd && !isNaN(sd.getTime()) && sd.getTime() < now && /در انتظار مصاحبه/.test(l.out || '')) {
      live['lead_stage:' + l.code] = 1;
      stkRaise_({ reason: 'lead_stage', key: l.code, lead: l.code, type: l.type, owner: l.stageOwner || own, mode: 'لید',
        detail: l.code + ': مرحلهٔ «' + l.out + '» با مسئول ' + (l.stageOwner || 'نامعلوم') + '؛ مهلت ' + l.stageDue + ' گذشت.' });
    }
  });
}

/* ---------------- آنلاین (قلاب‌ها) ---------------- */
/* کد لید مراجع؛ اگر لید ندارد، یک لید بی‌نام با chat_id می‌سازد (نام مراجع در کارت نمی‌آید) */
function stkLeadOf_(chat, why) {
  if (stkDry_()) return TG_MEM['stk:lead:' + chat] || (TG_MEM['stk:lead:' + chat] = 'L-DRY' + chat);
  var r = tgFindLead_(chat);
  if (r < 2) {
    tgAppendLead_({ name: 'مراجع تلگرام', channel: 'تلگرام', note: 'chat_id: ' + chat + ' · خودکار: ' + why, status: 'جدید' });
    r = tgFindLead_(chat);
  }
  return r >= 2 ? (tgLeadCode_(r) || '') : '';
}
/* tgOfferSlots_/tgAskAvail_: هیچ وقت معارفه جور نشد. info: {scope, zone, total, usable, band}
   هر جست‌وجوی بی‌نتیجه در «رویدادهای لید» هم ثبت می‌شود (حالت، روز، دلیل) */
function stkOnNoSlot_(chat, info) {
  if (typeof lmOn_ === 'function' && !lmOn_()) return null;
  try {
    info = info || {};
    var lead = stkLeadOf_(chat, 'وقت معارفه جور نشد');
    var det = 'استخر «' + (info.scope || 'همه') + '»: ' + tgFa_(info.total || 0) + ' وقت آزاد، ' + tgFa_(info.usable || 0) + ' با منطقهٔ زمانی ' + (info.zone || '?') +
      ' و ساعت معقول جور شد' + (info.band ? ' (بازهٔ «' + info.band + '»)' : '') + '؛ به مراجع «وقت مناسب نیست» گفته شد.';
    try {
      tgLeadEv_({ code: lead, actor: 'بات', channel: 'بات', what: 'جست‌وجوی بی‌نتیجه', to: 'آنلاین · ' + (info.zone || '?') + ' · ' + tgJDateFull_(stkNow_(), TG_TZ),
        note: (info.total ? 'وقت آزاد بود ولی با منطقهٔ زمانی و ساعت جور نشد' : 'هیچ وقت آزادی در استخر نبود') + (info.band ? ' · بازه ' + info.band : ''), type: LM_T.C });
    } catch (eE) {}
    return stkRaise_({ reason: 'on_noslot', key: lead || chat, lead: lead, type: LM_T.C, place: info.zone || '', detail: det });
  } catch (e) { tgErr_('stkOnNoSlot_', e); return null; }
}
function stkOnBookErr_(chat, err, slot) {
  if (typeof lmOn_ === 'function' && !lmOn_()) return null;
  try {
    var lead = stkLeadOf_(chat, 'رزرو خطا داد');
    var det = 'رزرو وقت ' + (slot ? tgFa_(slot.dateIso || '') + ' ' + tgFa_(slot.hhmm || '') + ' (' + (slot.therapist || '') + ')' : '') + ' خطا داد: ' + tgSecretMask_(String(err || '')).slice(0, 120);
    return stkRaise_({ reason: 'on_bookerr', key: (lead || chat) + ':' + stkDay_(), lead: lead, type: LM_T.C, detail: det });
  } catch (e) { tgErr_('stkOnBookErr_', e); return null; }
}
/* آخرین دلیل توقف یک لید (برای کارت «پیشنهاد کاربر») */
function stkLastStop_(code) {
  var a = stkRows_().filter(function (r) { return String(r.lead).indexOf(code) > -1; });
  var r = a[a.length - 1];
  return r ? r.reason + ': ' + r.detail : '';
}

/* ---------------- دکمه‌ها ---------------- */
function stkCb_(chat, data) {
  var a = String(data).split(':'), act = a[1], code = a.slice(2).join(':');
  var isOwner = String(chat) === String(TG_OWNER_CHAT), ok = isOwner; try { ok = ok || !!tgWhoDesk_(chat, ''); } catch (e) {}
  if (!ok) return tgSend_(chat, 'این بخش برای پذیرش است.');
  if (act === 'send') {
    if (!isOwner) return tgSend_(chat, 'ارسال کارت‌ها فقط با تأیید یاسر است.');
    if (stkSendOn_()) return tgSend_(chat, 'کارت‌ها قبلاً فرستاده شده‌اند.');
    var res = stkRelease_();
    return tgSend_(chat, '📤 ارسال شد: ' + tgFa_(res.cards) + ' کارت برای مسئول پذیرش (از ' + tgFa_(res.held) + ' مورد نگه‌داشته؛ بقیه با همان علت در تب و خلاصهٔ صبح). از این به بعد کارت‌های تازه خودکار می‌روند.');
  }
  var r = stkRows_().filter(function (x) { return x.code === code; })[0];
  if (act === 'q') return tgInpQueue_(chat);
  if (!r) return tgSend_(chat, 'این مورد پیدا نشد.');
  if (act === 'w') { r.st = STK_ST.WORK; stkWrite_(r); return tgSend_(chat, '🔧 ' + code + ' «در حال حل» شد.'); }
  if (act === 'ok') { r.st = STK_ST.DONE; r.done = stkStamp_(); stkWrite_(r); return tgSend_(chat, '✅ ' + code + ' حل شد.'); }
}

/* ---------------- اجرای ساعتی و خلاصهٔ ۹ صبح ---------------- */
function stkScan_() {
  var live = {};
  try { stkInpScan_(live); } catch (e) { tgErr_('stkInpScan_', e); }
  try { stkLeadScan_(live); } catch (e2) { tgErr_('stkLeadScan_', e2); }
  stkSettle_(['inp_noapproved', 'inp_wait48', 'inp_nocity', 'inp_req24', 'inp_noroom', 'lead_botowner', 'lead_abroad', 'lead_stage'], live);
  return Object.keys(live).length;
}
function stkSummaryText_() {
  var open = stkRows_().filter(stkOpen_);
  if (!open.length) return '';
  var by = {};
  open.forEach(function (r) { (by[r.mode + ' · ' + r.reason] = by[r.mode + ' · ' + r.reason] || []).push(r); });
  return '🧭 <b>درخواست‌های متوقف باز</b> · ' + tgFa_(open.length) + ' مورد\n\n' + Object.keys(by).map(function (k) {
    return '<b>' + tgEsc_(k) + '</b> (' + tgFa_(by[k].length) + ')\n' + by[k].slice(0, 5).map(function (r) {
      return '• ' + tgEsc_(r.code) + (r.lead ? ' · ' + tgEsc_(String(r.lead).slice(0, 40)) : '') + (r.st === STK_ST.WORK ? ' 🔧' : '') + ' · ' + tgEsc_(String(r.detail).slice(0, 140));
    }).join('\n');
  }).join('\n\n');
}
/* از tgWatchdog (ساعتی). تا یاسر «✅ اجرا»ی مدل لید را نزده، کاری نمی‌کند */
function stkHourly_() {
  if (typeof lmOn_ === 'function' && !lmOn_()) return { off: 1 };
  var t0 = Date.now(), lm = null;
  try { if (typeof lmHourly_ === 'function') lm = lmHourly_(); } catch (eL) { tgErr_('lmHourly_', eL); }
  var n = stkScan_(), now = stkNow_(), h = +Utilities.formatDate(now, TG_TZ, 'H'), day = stkDay_(now), sum = 0;
  try { if (typeof lmAfterFirst_ === 'function') lmAfterFirst_(); } catch (eF) { tgErr_('lmAfterFirst_', eF); }
  if (h >= 9 && stkProp_('STK_SUM_DAY') !== day) {
    stkProp_('STK_SUM_DAY', day);
    try { if (typeof lmHealth_ === 'function') lmHealth_(); } catch (eH) { tgErr_('lmHealth_', eH); }   /* سلامت لید هر صبح */
    var t = stkSendOn_() ? stkSummaryText_() : '';
    if (t) {
      tgSend_(String(TG_OWNER_CHAT), t); sum = 1;
      var bs = stkBoss_(); if (bs && bs.chat !== String(TG_OWNER_CHAT)) tgSend_(bs.chat, t);
    }
    if (!stkDry_()) { var P = PropertiesService.getScriptProperties(); P.getKeys().forEach(function (k) { if (k.indexOf('STK_SENT:') === 0 && k !== 'STK_SENT:' + day) P.deleteProperty(k); }); }
  }
  return { live: n, summary: sum, lm: lm, ms: Date.now() - t0 };
}

/* ---------------- تست خشک ---------------- */
function stkTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var OWN = String(TG_OWNER_CHAT);
  var cards = function (c) { return TG_OUTBOX.filter(function (o) { return o.kind === 'msg' && o.chat === String(c) && /درخواست متوقف/.test(o.text || ''); }); };
  try {
    TG_MEM['stk:boss'] = { name: 'مسئول پذیرش آزمایشی', chat: '7101', role: 'مسئول پذیرش' };
    TG_MEM['stkp:LM_ON'] = '1'; TG_MEM['stkp:STK_SEND_OK'] = '1';
    TG_MEM['stk:now'] = pbTehran_(2026, 10, 4, 10, 0).getTime();
    var day0 = pbTehran_(2026, 9, 11, 10, 0).getTime();   /* ۲۰ شهریور */
    TG_MEM['inp'] = { places: [{ id: 'gandhi', city: 'تهران', name: 'کلینیک تجربه' }], rooms: [],
      hours: [{ p: 'gandhi', who: 'درمانگر الف', day: 'شنبه', from: '9', to: '15', room: '', open: 'بله', chk: 'در انتظار تأیید' },
              { p: 'gandhi', who: 'درمانگر ب', day: 'یکشنبه', from: '10', to: '14', room: '', open: 'بله', chk: '' },
              { p: 'vanak', who: 'درمانگر ج', day: 'شنبه', from: '9', to: '11', room: '', open: 'بله', chk: 'تأیید شد' }] };
    var hk = 'h:' + tgInpRowKey_(TG_MEM['inp'].hours[0]), sl = {}; sl[hk] = { t: day0 };
    TG_MEM['V168_INPSLA'] = JSON.stringify(sl);
    stkScan_();
    var g = stkRows_().filter(function (r) { return r.key === 'inp_noapproved:gandhi'; })[0];
    ok('گاندی: کارت با عدد دقیق (ساعت ثبت‌شده، ۰ تأییدشده، در انتظار از ۲۰ شهریور)', g && /۱۰ ساعت ثبت شده، ۰ تأییدشده؛ ۱۰ ساعت از ۲۰ شهریور در انتظار بررسی پذیرش/.test(g.detail));
    ok('کارت کامل برای مسئول پذیرش و یک خط برای یاسر، با اقدام لازم و دکمهٔ فهرست بررسی', cards('7101').length >= 1 && TG_OUTBOX.some(function (o) { return o.chat === OWN && /^⛔️ S-/.test(o.text || ''); }) && !cards(OWN).length &&
      /اقدام لازم/.test(cards('7101')[0].text) && JSON.stringify(cards('7101')[0].markup).indexOf('sk:q:') > -1);
    var nr = stkRows_().filter(function (r) { return r.key === 'inp_noroom:vanak'; })[0];
    ok('ساعت تأییدشده بی اتاق جدا ثبت می‌شود', nr && /۱ ردیف \(۲ ساعت در هفته\)/.test(nr.detail));
    var n1 = cards('7101').length;
    stkScan_();
    ok('اسکن دوباره ردیف تکراری نمی‌سازد و همان روز کارت دوباره نمی‌رود', stkRows_().filter(function (r) { return r.key === 'inp_noapproved:gandhi'; }).length === 1 && cards('7101').length === n1);
    /* شهر بی مکان و تقاضای مکان */
    TG_MEM['tab:' + TG_INP_DEM] = [['اکنون', 'مراجع', '-', '', '', '8801', 'شهر: شیراز', 'باز'], ['اکنون', 'مراجع', 'gandhi', '', '', '8802', 'ساعت تأییدشده نداریم', 'باز']];
    TG_MEM['tab:' + TG_INP_REQ] = [['R-1', 'اکنون', 'درمانگر الف', '1', 'gandhi', 'ساعت تازه', 'شنبه', '9', '15', '', '', '', '', 'منتظر پذیرش', '', '']];
    sl['q:R-1'] = { t: TG_MEM['stk:now'] - 30 * 3600000 }; TG_MEM['V168_INPSLA'] = JSON.stringify(sl);
    stkScan_();
    var c = stkRows_().filter(function (r) { return r.key === 'inp_nocity:شیراز'; })[0], q = stkRows_().filter(function (r) { return r.key === 'inp_req24:all'; })[0];
    ok('شهر بی مکان با شمار تقاضا', c && /شیراز: ۱ تقاضای باز/.test(c.detail));
    ok('درخواست ساعت بیش از ۲۴ ساعت منتظر پذیرش', q && /۱ درخواست ساعت درمانگر بیش از ۲۴ ساعت/.test(q.detail));
    ok('تقاضای مراجع کنار مکان بی ساعت تأییدشده', /۱ مراجع حضوری اینجا را خواسته‌اند/.test(stkRows_().filter(function (r) { return r.key === 'inp_noapproved:gandhi'; })[0].detail));
    /* حل خودکار */
    TG_MEM['inp'].hours[0].chk = 'تأیید شد'; TG_MEM['inp'].hours[0].room = '۳';
    stkScan_();
    ok('وقتی شرط برطرف شد، مورد «حل شد» می‌شود', stkRows_().filter(function (r) { return r.key === 'inp_noapproved:gandhi'; })[0].st === STK_ST.DONE);
    /* لید */
    var now = new Date(Number(TG_MEM['stk:now'])), mk = function (code, owner, region, mins, contact) {
      var r = []; for (var i = 0; i < 25; i++) r.push('');
      var d = new Date(now.getTime() - mins * 60000);
      /* tgOpenLeadsOf_ تاریخ و ساعت را به وقت محلی اسکریپت می‌خواند (در Apps Script همان تهران) */
      r[0] = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); r[1] = d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); r[2] = 'Telegram bot'; r[3] = 'نام آزمایشی'; r[5] = '0912';
      r[6] = region; r[8] = 'جدید'; r[9] = owner; r[10] = contact || ''; r[24] = code; return r;
    };
    var hm = {}; hm['کد لید'] = 24;
    TG_MEM['openrows'] = { v: [mk('L-1250', 'بات — خودرزرو', 'تهران', 300), mk('L-1272', '', 'خارج از ایران', 45), mk('L-1300', '', 'خارج از ایران', 10)], hm: hm, now: now.getTime() };
    TG_OUTBOX = [];
    stkScan_();
    var b = stkRows_().filter(function (r) { return r.key === 'lead_botowner:L-1250'; })[0], ab = stkRows_().filter(function (r) { return r.key === 'lead_abroad:L-1272'; })[0];
    ok('مسئول «بات — خودرزرو» ← هشدار با دکمهٔ واگذاری', b && b.lead === 'L-1250' && cards('7101').some(function (o) { return JSON.stringify(o.markup).indexOf('ld:asg:L-1250') > -1; }));
    ok('لید خارج از ایران بیش از ۳۰ دقیقه بی تماس؛ کمتر از ۳۰ دقیقه نه', ab && /۴۵ دقیقه بی تماس/.test(ab.detail) && !stkRows_().some(function (r) { return r.key === 'lead_abroad:L-1300'; }));
    ok('نام مراجع در هیچ کارت و ردیفی نیست', !TG_OUTBOX.some(function (o) { return /نام آزمایشی/.test(o.text || ''); }) && JSON.stringify(stkRows_()).indexOf('نام آزمایشی') < 0);
    /* آنلاین */
    TG_OUTBOX = [];
    var ns = stkOnNoSlot_('9901', { scope: 'فردی', zone: 'Europe/Berlin', total: 12, usable: 0 });
    ok('وقت جور نشد ← مورد آنلاین با عدد و لید ساخته‌شده', ns && ns.lead === 'L-DRY9901' && /استخر «فردی»: ۱۲ وقت آزاد، ۰ با منطقهٔ زمانی Europe\/Berlin/.test(ns.detail));
    var be = stkOnBookErr_('9902', 'Exception: timeout', { dateIso: '2026-10-05', hhmm: '18:00', therapist: 'درمانگر الف' });
    ok('رزرو خطا ← مورد آنلاین', be && /خطا داد/.test(be.detail) && be.mode === 'آنلاین');
    /* دکمه‌ها و دسترسی */
    TG_MEM['deskwho'] = null;
    stkCb_('5555', 'sk:ok:' + be.code);
    ok('غیرپذیرش نمی‌تواند وضعیت را عوض کند', stkRows_().filter(function (r) { return r.code === be.code; })[0].st === STK_ST.OPEN);
    stkCb_(OWN, 'sk:w:' + be.code);
    ok('«در حال حل» از دکمه', stkRows_().filter(function (r) { return r.code === be.code; })[0].st === STK_ST.WORK);
    /* خلاصهٔ ۹ صبح */
    TG_OUTBOX = [];
    TG_MEM['stk:now'] = pbTehran_(2026, 10, 5, 8, 0).getTime(); stkHourly_();
    ok('پیش از ۹ خلاصه نمی‌رود', !TG_OUTBOX.some(function (o) { return /درخواست‌های متوقف باز/.test(o.text || ''); }));
    TG_MEM['stk:now'] = pbTehran_(2026, 10, 5, 9, 5).getTime(); stkHourly_(); stkHourly_();
    ok('ساعت ۹ یک بار خلاصهٔ موردهای باز برای یاسر', TG_OUTBOX.filter(function (o) { return o.chat === OWN && /درخواست‌های متوقف باز/.test(o.text || ''); }).length === 1);
    ok('روز تازه، کارت تازه برای همان علت', cards('7101').length >= 0 && stkSentToday_('7101', 'lead_abroad') === false);
    var w48 = stkRows_().filter(function (r) { return r.key === 'inp_wait48:gandhi'; })[0];
    ok('هشدار جدای تأیید ساعت بیش از ۴۸ ساعت', w48 && /بیش از ۴۸ ساعت در انتظار تأیید/.test(w48.detail) && w48.since === '۲۰ شهریور');
    ok('ردیف تب: کد لید، نوع، حالت، مکان، از کی، مسئول', g && g.type === 'تقاضای حضوری' && g.mode === 'حضوری' && g.place === 'گاندی' && g.since === '۲۰ شهریور' && g.owner === 'مسئول پذیرش آزمایشی' && b.owner === 'مسئول پذیرش آزمایشی');
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ هشدار درخواست متوقف درست است'));
  return tgTestTally_(log, fail);
}
