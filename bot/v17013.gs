/* ============================================================================
   v170.13 (۱۲ مهر ۱۴۰۵، تصمیم یاسر)
   ۱) سقف پیام: تیم پذیرش (تب «تیم پذیرش») سقف روزانه ندارد؛ بقیه همان. خلاصهٔ یک‌بارهٔ پیام‌های امروزِ [سقف] که هنوز معتبرند.
   ۲) پیام «✅ اجرا»ی مدل لید دوباره برای یاسر (همان مسیر v170.2: cmTick5_ تا ۱۵ دقیقه بعد).
   ۳) هاب پذیرش: تب‌ها و ستون‌های غیرروزانه مخفی می‌شوند، هیچ‌چیز پاک نمی‌شود.
   ۴) بورسیهٔ مدرسه (فرم فلوئنت ۱۷): تب «بورسیه» در هاب مدرسه، هر پاسخ در ستون خودش، خبر فوری به مسئول مدرسه و سردبیر،
      کد sf_17_<شمارهٔ ورودی> در بات برای دیدن وضعیت و فرستادن نمونه‌کار، پیام کوتاه با هر تغییر وضعیت.
   ۵) آفرهای کمپین مراجعان: هر آفر یک سطر در «کمپین‌های مراجعان» هاب پذیرش؛ لینک بات start=c_<کد>، بخش آفر روی صفحه‌های
      /persian-therapy/ از راه همان camp-push، و لید با «کد کمپین» و «آفر» روی کارت پذیرش. آفر بعدی فقط یک سطر است.
   ============================================================================ */

/* ---------- ۱) سقف پیام ---------- */
function v17013CapFree_(chat) {
  try { return !!tgWhoDesk_(chat, ''); } catch (e) { return false; }
}

function tgV17013Capped() {
  if (TG_DRY) return v17013CappedRun_(TG_MEM['v17013:out'] || []);
  var sh = tgOutSheet_(); if (!sh || sh.getLastRow() < 2) return 'سقف: دفتر ارسال خالی است';
  var last = sh.getLastRow(), from = Math.max(2, last - 4000);
  return v17013CappedRun_(sh.getRange(from, 1, last - from + 1, 7).getValues());
}
/* ردیف‌های «ارسال‌های بات»: [شناسه، زمان، chat، نوع، مرجع، متن، نتیجه]؛ ۲۴ ساعت گذشته */
function v17013CappedRun_(rows) {
  var since = Date.now() - 24 * 3600000, by = {}, seen = {}, n = 0, kept = 0;   /* ۲۴ ساعت گذشته، نه روز تقویمی (انتشار ممکن است بعد از نیمه‌شب باشد) */
  (rows || []).forEach(function (r) {
    var t = r[1] instanceof Date ? r[1] : new Date(r[1]);
    if (isNaN(t.getTime()) || t.getTime() < since) return;
    var txt = String(r[5] || '');
    if (txt.indexOf('[سقف]') !== 0) return;
    var chat = String(r[2] || '').trim();
    if (!chat || !v17013CapFree_(chat)) return;
    n++;
    var ref = String(r[4] || '').trim(), body = txt.replace(/^\[سقف\]\s*/, '').split('\n')[0].trim().slice(0, 140);
    var key = chat + '|' + ref + '|' + body;
    if (seen[key]) return; seen[key] = 1;
    if (!v17013StillValid_(ref)) return;
    kept++;
    (by[chat] = by[chat] || []).push('• ' + (ref ? '<code>' + tgEsc_(ref) + '</code> · ' : '') + tgEsc_(body));
  });
  var sent = 0;
  Object.keys(by).forEach(function (chat) {
    var head = '📥 <b>پیام‌های کاری ۲۴ ساعت گذشته که به‌خاطر سقف روزانه نرسید</b>\nاز این به بعد پیام‌های کاری پذیرش سقف ندارد. فقط مواردی که هنوز باز است (' + tgFa_(by[chat].length) + '):\n\n';
    var chunks = [head];
    by[chat].forEach(function (ln) { if ((chunks[chunks.length - 1] + ln + '\n').length > 3800) chunks.push(''); chunks[chunks.length - 1] += ln + '\n'; });
    chunks.forEach(function (c) { tgNotify_(chat, TG_NK.report, c.trim(), { force: true, ref: 'سقف' }); });
    sent++;
  });
  return 'سقف: ' + n + ' پیام امروز · هنوز معتبر: ' + kept + ' · خلاصه برای ' + sent + ' نفر';
}
/* لید بسته‌شده یا ناپیدا دیگر معتبر نیست؛ مرجع غیرلید (کار، مدرسه…) معتبر می‌ماند */
function v17013StillValid_(ref) {
  if (!/^L-\d+$/.test(ref)) return true;
  if (TG_DRY) return (TG_MEM['v17013:closed'] || []).indexOf(ref) < 0;
  try { var row = tgLeadByCode_(ref); if (!row || row < 2) return false; var l = tgLeadRead_(row); return !!l && !l.closed; }
  catch (e) { return true; }
}

/* ---------- ۲) پیام «✅ اجرا» دوباره ---------- */
function tgV17013LmPlan() {
  try { if (typeof lmOn_ === 'function' && lmOn_()) return 'مدل لید روشن است؛ پیام اجرا دوباره فرستاده نشد'; } catch (e) {}
  stkProp_('CM_PLAN_REQ', '1'); stkProp_('CM_AT', null);
  return 'پیام «✅ اجرا» با دکمهٔ تازه در تیک بعدی (تا ۱۵ دقیقه، در ساعت سکوت از ۹ صبح) برای یاسر می‌رود';
}

/* ---------- ۳) هاب پذیرش: مخفی، نه حذف ---------- */
var V17013_HIDE_TABS = [/^پشتیبان/, /^Errors$/, /^کلیک‌های تماس$/, /^سیاست‌ها$/, /^رویدادهای لید$/, /^دفتر کامنت‌ها$/];
var V17013_HIDE_COLS = ['منبع جزئیات', 'شناسهٔ مکان', 'شمار جابه‌جایی', 'کد کمپین'];
function v17013Hide_() {
  if (TG_DRY) return { tabs: [], cols: [], visible: [] };
  var ss = tgSS_(), tabs = [], cols = [], visible = [];
  ss.getSheets().forEach(function (sh) {
    var nm = sh.getName();
    if (V17013_HIDE_TABS.some(function (rx) { return rx.test(nm); })) {
      if (!sh.isSheetHidden() && ss.getSheets().filter(function (x) { return !x.isSheetHidden(); }).length > 1) { sh.hideSheet(); tabs.push(nm); }
    } else if (!sh.isSheetHidden()) visible.push(nm);
  });
  var ld = ss.getSheetByName(TG_LEADS);
  if (ld) {
    var head = ld.getRange(1, 1, 1, ld.getLastColumn()).getValues()[0];
    V17013_HIDE_COLS.forEach(function (h) {
      var i = head.map(function (x) { return String(x).trim(); }).indexOf(h);
      if (i > -1 && !ld.isColumnHiddenByUser(i + 1)) { ld.hideColumns(i + 1); cols.push(h); }
    });
  }
  return { tabs: tabs, cols: cols, visible: visible };
}

/* ---------- ۴) بورسیهٔ مدرسه ---------- */
var V17013_SCHO_TAB = 'بورسیه';
var V17013_SCHO_HEAD = ['شناسه', 'زمان', 'نام', 'شماره', 'ایمیل', 'chat_id', 'وضعیت', 'رشته و مقطع', 'دانشگاه', 'زمینه‌های همکاری',
  'سطح زبان', 'نمونه‌کارها', 'تعهد و انگیزه', 'فایل‌ها', 'شناسهٔ فرم', 'منبع', 'آخرین خبر به کاربر', 'یادداشت'];
var V17013_SCHO_ST = ['رسید', 'گفت‌وگو با سردبیر', 'تعیین بورسیه', 'رد', 'تأیید'];
/* نام فیلد فرم ← ستون (فرم ۱۷ را Cowork ساخته؛ نام لاتین یا برچسب فارسی، هر دو) */
var V17013_SCHO_MAP = [
  ['سطح زبان', /lang|english|ielts|toefl|زبان/i],
  ['دانشگاه', /^uni|univ|university|دانشگاه/i],
  ['رشته و مقطع', /field|major|degree|level|grade|رشته|مقطع/i],
  ['نمونه‌کارها', /sample|portfolio|resume|cv|نمونه/i],
  ['تعهد و انگیزه', /motiv|commit|why|reason|انگیزه|تعهد/i],
  ['زمینه‌های همکاری', /area|collab|cooper|skill|interest|hamkari|زمینه|همکاری|مهارت/i]
];
var V17013_SCHO_SKIP = /^(form_id|form_title|entry_id|source|source_page|name|names|first_name|last_name|mobile|phone|whatsapp|contact|email|note|sig|ts|kind|action|t|k|_.*)$/i;

function v17013ScholarIs_(flat, src) {
  if (!flat) return false;
  if (String(flat.form_id || '').trim() === '17') return true;
  return /درخواست بورسیه/.test(String(src || '') + ' ' + String(flat.source || ''));
}
function v17013Val_(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(v17013Val_).filter(String).join('، ');
  if (typeof v === 'object') return Object.keys(v).map(function (k) { return v17013Val_(v[k]); }).filter(String).join(' ');
  return String(v).trim();
}
function v17013ScholarCol_(k) {
  for (var i = 0; i < V17013_SCHO_MAP.length; i++) if (V17013_SCHO_MAP[i][1].test(k)) return V17013_SCHO_MAP[i][0];
  return '';
}
/* پاسخ‌های فرم به {ستون: مقدار}؛ فیلد بی‌نقشه ستون «پاسخ: <نام فیلد>» می‌گیرد */
function v17013ScholarFields_(flat) {
  var o = {};
  Object.keys(flat || {}).forEach(function (k) {
    if (V17013_SCHO_SKIP.test(k)) return;
    var val = v17013Val_(flat[k]); if (!val) return;
    var col = v17013ScholarCol_(k) || ('پاسخ: ' + String(k).slice(0, 40));
    o[col] = o[col] ? o[col] + ' · ' + val : val;
  });
  return o;
}
function v17013ScholarSave_(flat, src) {
  if (!v17013ScholarIs_(flat, src)) return '';
  var entry = String(flat.entry_id || '').replace(/\D/g, '');
  var name = v17013Val_(flat.name) || v17013Val_(flat.names) || '';
  var o = v17013ScholarFields_(flat);
  o['نام'] = name.slice(0, 120);
  o['شماره'] = v17013Val_(flat.mobile || flat.phone || flat.whatsapp || '').slice(0, 30);
  o['ایمیل'] = v17013Val_(flat.email).slice(0, 120);
  o['وضعیت'] = V17013_SCHO_ST[0];
  o['شناسهٔ فرم'] = entry;
  o['منبع'] = String(src || flat.source || 'سایت › مدرسه › درخواست بورسیه').slice(0, 200);
  var id;
  if (TG_DRY) {
    var L = TG_MEM['v17013:scho'] = TG_MEM['v17013:scho'] || [];
    for (var d = 0; d < L.length; d++) if (entry && L[d]['شناسهٔ فرم'] === entry) return L[d]['شناسه'];
    id = 'ب-' + ('00' + (L.length + 1)).slice(-3);
    o['شناسه'] = id; o['زمان'] = 'dry'; L.push(o);
  } else {
    var sh = tgSchSheet_(V17013_SCHO_TAB, V17013_SCHO_HEAD);
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (x) { return String(x).trim(); });
      if (entry && sh.getLastRow() > 1) {
        var ec = head.indexOf('شناسهٔ فرم') + 1, ids = sh.getRange(2, ec, sh.getLastRow() - 1, 1).getValues();
        for (var r = 0; r < ids.length; r++) if (String(ids[r][0]) === entry) return String(sh.getRange(r + 2, 1).getValue());
      }
      Object.keys(o).forEach(function (c) {   /* ستون تازه فقط در انتها؛ ستون موجود جابه‌جا نمی‌شود */
        if (head.indexOf(c) < 0) { sh.getRange(1, head.length + 1).setValue(c).setFontWeight('bold').setBackground('#f9f2f2'); head.push(c); }
      });
      id = tgSchNextId_(V17013_SCHO_TAB, V17013_SCHO_HEAD, 'ب');
      o['شناسه'] = id; o['زمان'] = tgJDateFull_(new Date(), TG_TZ);
      sh.appendRow(tgCellRow_(head.map(function (c) { return o[c] !== undefined ? o[c] : ''; })));
      try { tgSchDropCache_(); } catch (eC) {}
    } finally { lock.releaseLock(); }
  }
  try { v17013ScholarTell_(id, o); } catch (eT) { tgErr_('v17013ScholarTell_', eT); }
  return id;
}
/* مسئول مدرسه و سردبیر مجله، فوری (بی سکوت شب) */
function v17013ScholarTeam_() {
  var out = [], seen = {};
  function add(c) { c = String(c || '').trim(); if (/^-?\d+$/.test(c) && !seen[c]) { seen[c] = 1; out.push(c); } }
  if (TG_DRY) { (TG_MEM['v17013:team'] || []).forEach(add); return out; }
  try { tgSchoolOwners_().forEach(function (p) { add(tgMsgFirst_(p.chat)); }); } catch (e1) {}
  try { (typeof mcEditors_ === 'function' ? mcEditors_() : []).forEach(add); } catch (e2) {}
  return out;
}
function v17013ScholarCardText_(id, o) {
  var t = '🎓 <b>درخواست بورسیه</b> · <code>' + tgEsc_(id) + '</code>\n' + tgEsc_(o['نام'] || 'بی‌نام') +
    (o['شماره'] ? ' · <code>' + tgEsc_(o['شماره']) + '</code>' : '') + (o['ایمیل'] ? ' · ' + tgEsc_(o['ایمیل']) : '') +
    '\nوضعیت: <b>' + tgEsc_(o['وضعیت'] || V17013_SCHO_ST[0]) + '</b>';
  ['رشته و مقطع', 'دانشگاه', 'زمینه‌های همکاری', 'سطح زبان', 'نمونه‌کارها', 'تعهد و انگیزه'].forEach(function (c) {
    if (o[c]) t += '\n<b>' + c + ':</b> ' + tgEsc_(String(o[c]).slice(0, 300));
  });
  return t + '\n\nهمهٔ پاسخ‌ها در تب «' + V17013_SCHO_TAB + '» هاب مدرسه است.';
}
function v17013ScholarKb_(id, cur) {
  var rows = [], row = [];
  V17013_SCHO_ST.forEach(function (s, i) {
    if (s === cur) return;
    row.push({ text: s, callback_data: 'sb:s:' + id + ':' + i });
    if (row.length === 2) { rows.push(row); row = []; }
  });
  if (row.length) rows.push(row);
  return { inline_keyboard: rows };
}
function v17013ScholarTell_(id, o) {
  var txt = v17013ScholarCardText_(id, o), kb = v17013ScholarKb_(id, o['وضعیت']);
  v17013ScholarTeam_().forEach(function (c) { tgNotify_(c, TG_NK.task, txt, { force: true, ref: id, markup: kb }); });
}
/* ردیف بورسیه با شناسه یا شمارهٔ ورودی فرم: {row, head, v} */
function v17013ScholarFind_(id, entry) {
  if (TG_DRY) {
    var L = TG_MEM['v17013:scho'] || [];
    for (var i = 0; i < L.length; i++) if ((id && L[i]['شناسه'] === id) || (entry && L[i]['شناسهٔ فرم'] === String(entry))) return { dry: L[i], row: i + 2 };
    return null;
  }
  var sh = tgSchSheet_(V17013_SCHO_TAB, V17013_SCHO_HEAD);
  if (!sh || sh.getLastRow() < 2) return null;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (x) { return String(x).trim(); });
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues(), ec = head.indexOf('شناسهٔ فرم');
  for (var r = 0; r < v.length; r++) {
    if ((id && String(v[r][0]) === id) || (entry && ec > -1 && String(v[r][ec]) === String(entry))) {
      var o = {}; head.forEach(function (h, j) { o[h] = v[r][j]; });
      return { sh: sh, head: head, row: r + 2, o: o };
    }
  }
  return null;
}
function v17013ScholarGet_(f, col) { return f.dry ? String(f.dry[col] || '') : String(f.o[col] || ''); }
function v17013ScholarPut_(f, col, val) {
  if (f.dry) { f.dry[col] = val; return; }
  var c = f.head.indexOf(col) + 1;
  if (c < 1) { c = f.head.length + 1; f.sh.getRange(1, c).setValue(col).setFontWeight('bold'); f.head.push(col); }
  f.sh.getRange(f.row, c).setValue(val); f.o[col] = val;
}
/* پیام کوتاه به کاربر؛ متن را تیم می‌تواند در «قالب پیام‌ها» با کلید scholar_status عوض کند ({ID} و {ST}) */
function v17013ScholarUserText_(id, st) {
  var t = '';
  try { t = typeof pbTpl_ === 'function' ? String(pbTpl_('scholar_status') || '') : ''; } catch (e) {}
  if (!t) t = 'وضعیت درخواست بورسیهٔ شما (<code>{ID}</code>): <b>{ST}</b>';
  return t.split('{ID}').join(tgEsc_(id)).split('{ST}').join(tgEsc_(st));
}
function v17013ScholarNotifyUser_(f) {
  var chat = v17013ScholarGet_(f, 'chat_id').trim(), st = v17013ScholarGet_(f, 'وضعیت').trim(), id = v17013ScholarGet_(f, 'شناسه');
  if (!/^\d+$/.test(chat) || !st || v17013ScholarGet_(f, 'آخرین خبر به کاربر') === st) return false;
  tgNotify_(chat, TG_NK.remind, v17013ScholarUserText_(id, st), { force: true, ref: id, markup: v17013ScholarUserKb_(id) });
  v17013ScholarPut_(f, 'آخرین خبر به کاربر', st);
  return true;
}
function v17013ScholarUserKb_(id) { return { inline_keyboard: [[{ text: '📎 فرستادن فایل نمونه‌کار', callback_data: 'sb:f:' + id }]] }; }
function v17013ScholarStaff_(chat) {
  if (String(chat) === String(TG_OWNER_CHAT)) return true;
  return v17013ScholarTeam_().indexOf(String(chat)) > -1;
}
function v17013ScholarCb_(chat, data) {
  var a = String(data).split(':'), act = a[1], id = a[2] || '';
  var f = v17013ScholarFind_(id, '');
  if (!f) return tgSend_(chat, 'درخواست ' + tgEsc_(id) + ' پیدا نشد.');
  if (act === 'f') {
    if (v17013ScholarGet_(f, 'chat_id') !== String(chat)) return tgSend_(chat, 'این درخواست به حساب شما وصل نیست.');
    tgSetVal_('schof', chat, id);
    return tgSend_(chat, 'فایل نمونه‌کار را همین‌جا بفرستید (PDF، Word یا عکس).');
  }
  if (act === 's') {
    if (!v17013ScholarStaff_(chat)) return tgSend_(chat, 'این دکمه برای مسئول مدرسه و سردبیر است.');
    var st = V17013_SCHO_ST[Number(a[3])];
    if (!st) return tgSend_(chat, 'این وضعیت دیگر نیست.');
    v17013ScholarPut_(f, 'وضعیت', st);
    var told = v17013ScholarNotifyUser_(f);
    return tgSend_(chat, '✅ ' + tgEsc_(id) + ': ' + tgEsc_(st) + (told ? ' · به متقاضی خبر داده شد.' : ' · متقاضی هنوز در بات وصل نشده؛ با اولین ورودش خبر می‌گیرد.'),
      v17013ScholarKb_(id, st));
  }
  return null;
}
/* کد شروع sf_17_<ورودی>: وصل شدن حساب به همان درخواست؛ فقط وضعیت و کد، هیچ دادهٔ شخصی. اولین حساب صاحب درخواست است. */
function v17013ScholarStart_(chat, arg) {
  var m = String(arg || '').match(/^sf_17_(\d{1,9})$/);
  if (!m) return false;
  try { tgLogStart_(arg, chat); } catch (e) {}
  var f = v17013ScholarFind_('', m[1]);
  if (!f) { tgSend_(chat, 'درخواستی با این کد هنوز ثبت نشده است. چند دقیقه بعد دوباره همین لینک را باز کنید.'); return true; }
  var bound = v17013ScholarGet_(f, 'chat_id').trim(), id = v17013ScholarGet_(f, 'شناسه');
  if (bound && bound !== String(chat)) { tgSend_(chat, 'این درخواست قبلاً به حساب دیگری در تلگرام وصل شده است.'); return true; }
  if (!bound) v17013ScholarPut_(f, 'chat_id', String(chat));
  var st = v17013ScholarGet_(f, 'وضعیت') || V17013_SCHO_ST[0];
  tgSend_(chat, v17013ScholarUserText_(id, st), v17013ScholarUserKb_(id));
  v17013ScholarPut_(f, 'آخرین خبر به کاربر', st);
  return true;
}
function v17013ScholarFolder_() {
  var P = PropertiesService.getScriptProperties(), id = P.getProperty('SCHO_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var parent = DriveApp.getFileById(TG_SCHOOL_SHEET_ID).getParents();
  var root = parent.hasNext() ? parent.next() : DriveApp.getRootFolder();
  var it = root.getFoldersByName('بورسیه · نمونه‌کارها'), fo = it.hasNext() ? it.next() : root.createFolder('بورسیه · نمونه‌کارها');
  P.setProperty('SCHO_FOLDER', fo.getId());
  return fo;
}
function v17013ScholarFile_(chat, m) {
  var id = tgGetVal_('schof', chat);
  if (!id) return false;
  var doc = m.document, ph = m.photo && m.photo.length ? m.photo[m.photo.length - 1] : null;
  var fid = doc ? doc.file_id : (ph ? ph.file_id : '');
  if (!fid) return false;
  var f = v17013ScholarFind_(id, '');
  if (!f || v17013ScholarGet_(f, 'chat_id') !== String(chat)) { tgDel_('schof', chat); return false; }
  var nm = id + ' · ' + String((doc && doc.file_name) || 'نمونه‌کار.jpg').slice(0, 80), url;
  if (TG_DRY) url = 'https://drive.google.com/file/d/DRY/view';
  else {
    var got = tgTgFile_(fid);
    var file = v17013ScholarFolder_().createFile(got.blob.setName(nm));
    url = file.getUrl();
  }
  var cur = v17013ScholarGet_(f, 'فایل‌ها');
  v17013ScholarPut_(f, 'فایل‌ها', (cur ? cur + '\n' : '') + url);
  tgDel_('schof', chat);
  tgSend_(chat, 'فایل رسید و به درخواست <code>' + tgEsc_(id) + '</code> وصل شد.', v17013ScholarUserKb_(id));
  v17013ScholarTeam_().forEach(function (c) { tgNotify_(c, TG_NK.task, '📎 فایل نمونه‌کار تازه برای <code>' + tgEsc_(id) + '</code>: ' + url, { force: true, ref: id }); });
  return true;
}
/* تغییر وضعیتی که دستی در شیت داده شد هم به کاربر خبر داده می‌شود (هر ۱۵ دقیقه) */
function v17013ScholarTick_() {
  if (TG_DRY) return 0;
  var P = PropertiesService.getScriptProperties(), at = Number(P.getProperty('V17013_SCHO_AT') || 0);
  if (Date.now() - at < 15 * 60000) return 0;
  P.setProperty('V17013_SCHO_AT', String(Date.now()));
  var ss = tgSchSS_(), sh = ss.getSheetByName(V17013_SCHO_TAB);
  if (!sh || sh.getLastRow() < 2) return 0;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (x) { return String(x).trim(); });
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues(), n = 0;
  var ci = head.indexOf('chat_id'), si = head.indexOf('وضعیت'), li = head.indexOf('آخرین خبر به کاربر');
  for (var r = 0; r < v.length && n < 20; r++) {
    if (!/^\d+$/.test(String(v[r][ci]).trim()) || !String(v[r][si]).trim() || String(v[r][si]).trim() === String(v[r][li]).trim()) continue;
    var o = {}; head.forEach(function (h, j) { o[h] = v[r][j]; });
    if (v17013ScholarNotifyUser_({ sh: sh, head: head, row: r + 2, o: o })) n++;
  }
  return n;
}

/* ---------- ۵) آفرهای کمپین مراجعان ---------- */
var V17013_OF_TAB = 'کمپین‌های مراجعان';
var V17013_OF_HEAD = ['کد', 'عنوان', 'تعداد جلسه', 'درصد تخفیف', 'مخاطب', 'شروع', 'پایان', 'وضعیت', 'مسیر سایت', 'لینک بات', 'لینک سایت', 'یادداشت'];
var V17013_OF_SEED = { code: 'abroad12', title: '۱۲ جلسه با ۲۰٪ تخفیف برای فارسی‌زبانان خارج از ایران', n: 12, pct: 20, aud: 'خارج از ایران', path: '/persian-therapy/' };
var V17013_OF_MEM = null;
function v17013OfSheet_() {
  var ss = tgSS_(), sh = ss.getSheetByName(V17013_OF_TAB);
  if (!sh) {
    sh = ss.insertSheet(V17013_OF_TAB); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, V17013_OF_HEAD.length).setValues([V17013_OF_HEAD]).setFontWeight('bold').setBackground('#f9f2f2');
    sh.setFrozenRows(1);
  }
  return sh;
}
function v17013OfIso_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return Utilities.formatDate(v, TG_TZ, 'yyyy-MM-dd');
  var s = tgLatinDigits_(String(v || '').trim());
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (!m) return '';
  var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (y < 1700) { try { var g = tgJ2G_(y, mo, d); return Utilities.formatDate(g, TG_TZ, 'yyyy-MM-dd'); } catch (e) { return ''; } }
  return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
}
function v17013Offers_() {
  if (TG_DRY) return (TG_MEM['v17013:offers'] || []).map(function (o, i) { var x = {}; for (var k in o) x[k] = o[k]; x.row = i + 2; return x; });
  if (V17013_OF_MEM) return V17013_OF_MEM;
  var out = [];
  try {
    var sh = tgSS_().getSheetByName(V17013_OF_TAB);
    if (sh && sh.getLastRow() > 1) {
      var v = sh.getRange(2, 1, sh.getLastRow() - 1, V17013_OF_HEAD.length).getValues();
      v.forEach(function (r, i) {
        var code = String(r[0] || '').trim();
        if (!/^[A-Za-z0-9]{2,20}$/.test(code)) return;
        out.push({ row: i + 2, code: code, title: String(r[1] || '').trim(), n: Number(tgLatinDigits_(String(r[2] || '0'))) || 0,
          pct: Number(tgLatinDigits_(String(r[3] || '0'))) || 0, aud: String(r[4] || '').trim(), from: v17013OfIso_(r[5]), to: v17013OfIso_(r[6]),
          st: String(r[7] || '').trim(), path: String(r[8] || '').trim() || '/persian-therapy/' });
      });
    }
  } catch (e) { tgErr_('v17013Offers_', e); }
  V17013_OF_MEM = out;
  return out;
}
function v17013OfActive_(o, today) {
  if (!o || !o.code || !o.title) return false;
  if (/بسته|خاموش|پایان/.test(o.st || '')) return false;
  today = today || Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  if (o.from && today < o.from) return false;
  if (o.to && today > o.to) return false;
  return true;
}
function v17013OfFind_(code) {
  var c = String(code || '').replace(/^c_/i, '').toLowerCase();
  if (!c) return null;
  var all = v17013Offers_();
  for (var i = 0; i < all.length; i++) if (all[i].code.toLowerCase() === c) return all[i];
  return null;
}
function v17013OfLinks_(o) {
  var path = String(o.path || '/persian-therapy/');
  if (path.charAt(0) !== '/') path = '/' + path;
  return { bot: 'https://t.me/tajrobehlife_bot?start=c_' + o.code, site: 'https://tajrobeh.life' + path + '#offer-' + o.code };
}
/* لینک‌ها و پیش‌فرض‌ها فقط در خانهٔ خالی نوشته می‌شوند */
function v17013OfFill_() {
  if (TG_DRY) return 0;
  var sh = v17013OfSheet_(), n = 0;
  V17013_OF_MEM = null;
  v17013Offers_().forEach(function (o) {
    var L = v17013OfLinks_(o), cur = sh.getRange(o.row, 8, 1, 4).getValues()[0];
    var want = [cur[0] || 'فعال', cur[1] || '/persian-therapy/', L.bot, L.site];
    if (want.join('|') !== cur.join('|')) { sh.getRange(o.row, 8, 1, 4).setValues([want]); n++; }
  });
  V17013_OF_MEM = null;
  return n;
}
/* برای سایت (camp-push): فقط آفرهای فعال، بی دادهٔ داخلی */
function v17013OfPayload_() {
  return v17013Offers_().filter(function (o) { return v17013OfActive_(o); }).map(function (o) {
    return { code: o.code, title: o.title, sessions: o.n, pct: o.pct, aud: o.aud, path: v17013OfLinks_(o).site.replace(/^https:\/\/tajrobeh\.life|#.*$/g, ''), bot: v17013OfLinks_(o).bot };
  });
}
function v17013OfLabel_(code) {
  var o = v17013OfFind_(code);
  return o ? 'کمپین › ' + o.title : '';
}
function v17013OfStart_(chat, arg) {
  if (!/^c_[A-Za-z0-9]{2,20}$/.test(String(arg || ''))) return false;
  var o = v17013OfFind_(arg);
  if (!o || !v17013OfActive_(o)) return false;   /* آفر نیست یا بسته است: مسیر عادی بات */
  try { tgLogStart_(String(arg), chat); } catch (e) {}
  tgSetVal_('ocamp', chat, o.code);
  tgSetVal_('esrc', chat, String(arg));
  tgSend_(chat, 'از آفر «' + tgEsc_(o.title) + '» آمدید.');
  if (/خارج/.test(o.aud)) tgOutside_(chat); else tgQuizTopic_(chat);
  return true;
}
function v17013Extras_(chat, extra) {
  try {
    var c = tgGetVal_('ocamp', chat);
    if (!c) return extra;
    var o = v17013OfFind_(c);
    extra['کد کمپین'] = c;
    extra['آفر'] = o ? o.title : c;
  } catch (e) { tgErr_('v17013Extras_', e); }
  return extra;
}

/* ---------- یک‌باره بعد از انتشار ---------- */
function tgV17013Setup() {
  var out = [];
  /* آفر اول */
  try {
    var sh = v17013OfSheet_(), have = v17013OfFind_(V17013_OF_SEED.code);
    if (!have) {
      var s = V17013_OF_SEED;
      sh.appendRow([s.code, s.title, s.n, s.pct, s.aud, Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd'), '', 'فعال', s.path, '', '', 'v170.13']);
      V17013_OF_MEM = null;
    }
    v17013OfFill_();
    var o = v17013OfFind_(V17013_OF_SEED.code), L = v17013OfLinks_(o);
    out.push('آفر ' + o.code + ': ' + L.bot + ' · ' + L.site);
    out.push('سایت: ' + tgCpPush_('آفر'));
  } catch (e) { out.push('آفر: خطا ' + e); }
  /* تب بورسیه */
  try { tgSchSheet_(V17013_SCHO_TAB, V17013_SCHO_HEAD); out.push('تب «' + V17013_SCHO_TAB + '»: آماده'); } catch (e2) { out.push('بورسیه: خطا ' + e2); }
  /* مخفی کردن */
  try {
    var h = v17013Hide_();
    out.push('مخفی شد: تب‌ها ' + (h.tabs.join('، ') || 'هیچ') + ' · ستون‌های لیدها ' + (h.cols.join('، ') || 'هیچ'));
    out.push('تب‌های پیدا: ' + h.visible.join('، '));
  } catch (e3) { out.push('مخفی کردن: خطا ' + e3); }
  return out.join(' · ');
}

/* ---------- تست خشک ---------- */
function v17013Tests() {
  var pass = 0, fail = 0, out = [];
  function ok(n, c, x) { if (c) pass++; else fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !x ? '' : ' · ' + String(x).slice(0, 200))); }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  try {
    /* ۱) سقف */
    TG_MEM['deskwho'] = { name: 'پذیرش نمونه', chat: '9001' };
    ok('پذیرش از سقف آزاد است', v17013CapFree_('9001') === true);
    TG_MEM['policy'] = {}; TG_MEM['policy'][TG_NK.task] = { cap: 1 };
    TG_OUTBOX = []; tgNotify_('9001', TG_NK.task, 'یک'); tgNotify_('9001', TG_NK.task, 'دو'); tgNotify_('9001', TG_NK.task, 'سه');
    ok('پیام کاری پذیرش بیش از سقف هم می‌رود', TG_OUTBOX.filter(function (x) { return x.kind === 'msg'; }).length === 3);
    TG_MEM['deskwho'] = null; TG_MEM['capdry'] = {};
    TG_OUTBOX = []; tgNotify_('9002', TG_NK.task, 'یک'); var r2 = tgNotify_('9002', TG_NK.task, 'دو');
    ok('برای بقیه سقف همان است', r2 === 'سقف' && TG_OUTBOX.filter(function (x) { return x.kind === 'msg'; }).length === 1, r2);
    TG_MEM['deskwho'] = { name: 'پذیرش نمونه', chat: '9001' };
    var now = new Date(), old = new Date(now.getTime() - 3 * 86400000);
    TG_MEM['v17013:out'] = [
      ['M-1', now, '9001', 'کار', 'L-1001', '[سقف] تماس اول گرفته نشده: L-1001', 'خطا'],
      ['M-2', now, '9001', 'کار', 'L-1001', '[سقف] تماس اول گرفته نشده: L-1001', 'خطا'],
      ['M-3', now, '9001', 'کار', 'L-1002', '[سقف] موعد اقدام بعدی', 'خطا'],
      ['M-4', now, '9001', 'کار', 'K-005', '[سقف] پاسخ به پیام درمانگر', 'خطا'],
      ['M-5', old, '9001', 'کار', 'L-1003', '[سقف] دیروزی', 'خطا'],
      ['M-6', now, '9001', 'کار', 'L-1004', 'رفته بود', 'رفت']];
    TG_MEM['v17013:closed'] = ['L-1002'];
    TG_OUTBOX = [];
    var cs = tgV17013Capped();
    var sm = TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && x.chat === '9001'; });
    ok('خلاصهٔ جامانده‌ها: یک پیام، تکراری و بسته و دیروزی نه', sm.length === 1 && /L-1001/.test(sm[0].text) && /K-005/.test(sm[0].text) && !/L-1002|L-1003|L-1004/.test(sm[0].text) && sm[0].text.split('\n').filter(function (ln) { return /L-1001/.test(ln); }).length === 1, cs + ' | ' + (sm[0] && sm[0].text));

    /* ۲) پیام اجرا */
    TG_MEM['stkp:LM_ON'] = '';
    ok('پیام «✅ اجرا» دوباره درخواست می‌شود', /یاسر/.test(tgV17013LmPlan()) && TG_MEM['stkp:CM_PLAN_REQ'] === '1');

    /* ۴) بورسیه */
    TG_OUTBOX = []; TG_MEM['v17013:team'] = ['8001', '8002'];
    var flat = { form_id: 17, entry_id: '345', name: 'متقاضی نمونه', mobile: '09120000017', email: 'a@example.com',   // pii:ok ساختگی
      field_and_level: 'روانشناسی بالینی، ارشد', university: 'دانشگاه نمونه', collaboration_areas: ['ترجمه', 'ویراستاری'],
      english_level: 'پیشرفته', portfolio_links: 'https://example.com/p', motivation: 'انگیزهٔ نمونه', extra_q: 'پاسخ اضافه' };   // pii:ok ساختگی
    var id = v17013ScholarSave_(flat, 'سایت › مدرسه › درخواست بورسیه');
    var row = TG_MEM['v17013:scho'][0];
    ok('فرم ۱۷ ردیف بورسیه با شناسه', id === 'ب-001' && row['وضعیت'] === 'رسید' && row['شناسهٔ فرم'] === '345', JSON.stringify(row));
    ok('هر پاسخ در ستون خودش', row['رشته و مقطع'] === 'روانشناسی بالینی، ارشد' && row['دانشگاه'] === 'دانشگاه نمونه' && row['زمینه‌های همکاری'] === 'ترجمه، ویراستاری' &&
      row['سطح زبان'] === 'پیشرفته' && row['نمونه‌کارها'] === 'https://example.com/p' && row['تعهد و انگیزه'] === 'انگیزهٔ نمونه' && row['پاسخ: extra_q'] === 'پاسخ اضافه', JSON.stringify(row));
    var tell = TG_OUTBOX.filter(function (x) { return x.kind === 'msg'; });
    ok('خبر فوری به مسئول مدرسه و سردبیر با دکمهٔ وضعیت', tell.length === 2 && tell.every(function (x) { return /درخواست بورسیه/.test(x.text) && JSON.stringify(x.markup).indexOf('sb:s:ب-001:1') > -1; }));
    ok('ورودی تکراری ردیف دوم نمی‌سازد', v17013ScholarSave_(flat, '') === 'ب-001' && TG_MEM['v17013:scho'].length === 1);
    ok('فرم دیگر بورسیه نیست', v17013ScholarSave_({ form_id: 15, name: 'x' }, 'سایت › مدرسه › ثبت‌نام دورهٔ EFT') === '');
    TG_OUTBOX = [];
    ok('کد sf_17_ ناشناخته', v17013ScholarStart_('7001', 'sf_17_999') === true && /هنوز ثبت نشده/.test(TG_OUTBOX[TG_OUTBOX.length - 1].text));
    TG_OUTBOX = []; v17013ScholarStart_('7001', 'sf_17_345');
    ok('sf_17_ حساب را وصل و وضعیت را نشان می‌دهد، بی دادهٔ شخصی', row['chat_id'] === '7001' && /رسید/.test(TG_OUTBOX[0].text) && !/متقاضی نمونه|0912/.test(TG_OUTBOX[0].text) && JSON.stringify(TG_OUTBOX[0].markup).indexOf('sb:f:ب-001') > -1);
    TG_OUTBOX = []; v17013ScholarStart_('7002', 'sf_17_345');
    ok('حساب دوم درخواست دیگری را نمی‌گیرد', row['chat_id'] === '7001' && /حساب دیگری/.test(TG_OUTBOX[0].text));
    TG_OUTBOX = []; v17013ScholarCb_('7002', 'sb:s:ب-001:1');
    ok('غیر تیم وضعیت را عوض نمی‌کند', row['وضعیت'] === 'رسید');
    TG_OUTBOX = []; v17013ScholarCb_('8001', 'sb:s:ب-001:1');
    var um = TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && x.chat === '7001'; });
    ok('تغییر وضعیت: پیام کوتاه به کاربر', row['وضعیت'] === 'گفت‌وگو با سردبیر' && um.length === 1 && /گفت‌وگو با سردبیر/.test(um[0].text) && row['آخرین خبر به کاربر'] === 'گفت‌وگو با سردبیر');
    TG_OUTBOX = []; v17013ScholarCb_('7001', 'sb:f:ب-001');
    ok('دکمهٔ فایل منتظر فایل می‌ماند', tgGetVal_('schof', '7001') === 'ب-001');
    TG_OUTBOX = [];
    ok('فایل به همان ردیف وصل می‌شود', v17013ScholarFile_('7001', { document: { file_id: 'F1', file_name: 'cv.pdf' } }) === true && /DRY/.test(row['فایل‌ها']) && !tgGetVal_('schof', '7001'));
    ok('بی انتظار، فایل مسیر دیگر می‌رود', v17013ScholarFile_('7001', { document: { file_id: 'F2' } }) === false);
    ok('دادهٔ دکمه‌ها زیر ۶۴ بایت', tgCbBytes_('sb:s:ب-001:4') <= 64 && tgCbBytes_('sb:f:ب-001') <= 64);
    var kbS = JSON.stringify(tgSchoolPubKb_());
    ok('منوی مدرسه: دکمهٔ بورسیه به صفحهٔ بورسیه، نه فرم عضویت', kbS.indexOf('tajrobeh.life/school/scholarship/') > -1, kbS);

    /* ۵) آفر */
    var today = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
    TG_MEM['v17013:offers'] = [{ code: 'abroad12', title: V17013_OF_SEED.title, n: 12, pct: 20, aud: 'خارج از ایران', from: today, to: '', st: 'فعال', path: '/persian-therapy/' },
                               { code: 'old1', title: 'آفر قدیمی', n: 6, pct: 10, aud: 'ایران', from: '2026-01-01', to: '2026-02-01', st: 'فعال', path: '/persian-therapy/' }];
    var L = v17013OfLinks_(v17013OfFind_('c_ABROAD12'));
    ok('لینک بات و سایت از کد', L.bot === 'https://t.me/tajrobehlife_bot?start=c_abroad12' && L.site === 'https://tajrobeh.life/persian-therapy/#offer-abroad12', JSON.stringify(L));
    var pl = v17013OfPayload_();
    ok('فقط آفر فعال به سایت می‌رود', pl.length === 1 && pl[0].code === 'abroad12' && pl[0].path === '/persian-therapy/' && pl[0].pct === 20, JSON.stringify(pl));
    TG_OUTBOX = [];
    ok('start=c_<کد> آفر را می‌شناسد', v17013OfStart_('6001', 'c_abroad12') === true && tgGetVal_('ocamp', '6001') === 'abroad12' && TG_OUTBOX.some(function (x) { return /۱۲ جلسه/.test(x.text || ''); }));
    ok('آفر بسته به مسیر عادی', v17013OfStart_('6002', 'c_old1') === false && v17013OfStart_('6002', 'c_nope') === false);
    var ex = v17013Extras_('6001', {});
    ok('لید آفر کد کمپین و عنوان می‌گیرد', ex['کد کمپین'] === 'abroad12' && ex['آفر'] === V17013_OF_SEED.title);
    ok('برچسب کد شروع', tgStartLabel_('c_abroad12') === 'کمپین › ' + V17013_OF_SEED.title);
    ok('کارت پذیرش آفر را نشان می‌دهد', tgLeadCardText_({ name: 'الف', code: 'L-1', src: 'Telegram bot', offer: V17013_OF_SEED.title }).indexOf('🎁') > -1);
    ok('ستون‌های تازه در فهرست مجاز لید', TG_LEAD_FIELDS.indexOf('کد کمپین') > -1 && TG_LEAD_FIELDS.indexOf('آفر') > -1 && TG_SCALE_HEADS.indexOf('آفر') > -1);
    ok('تاریخ شمسی و میلادی آفر', v17013OfIso_('2026-10-04') === '2026-10-04' && /^2026-10-0[34]$/.test(v17013OfIso_('۱۴۰۵/۰۷/۱۲')), v17013OfIso_('۱۴۰۵/۰۷/۱۲'));
  } catch (e) { fail++; out.push('❌ خطا: ' + (e.message || e) + ' ' + String(e.stack || '').split('\n')[1]); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box;
  return { pass: pass, fail: fail, text: out.join('\n') };
}
try { TG_SUITES.push(['v170.13: سقف پذیرش، بورسیه، آفر', 'v17013Tests']); } catch (eSu) {}
