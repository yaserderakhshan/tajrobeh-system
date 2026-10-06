/**
 * mag_contrib.gs · v163 · ۷ مهر ۱۴۰۵
 * مسیر کامل مشارکت در مجلهٔ تجربه، از بات تا سایت:
 *   ۱) بازبینی علمی: کارت بازبینی برای درمانگر ← نتیجه با دکمه ← اصلاحات (متن / ویس / گوگل‌داک) ← رضایت نام و کد نظام ← سردبیر ← سایت
 *   ۲) صدای نویسنده: «🎙 مطالب من در مجله» ← افزودن صدا ← سردبیر ← سایت (mp3 در «ابزارها › صداهای مجله»)
 *   ۳) افزوده به متن: نویسندهٔ اصلی یا مهمان با لینک دعوت (start=co-<توکن>) ← نوع و تیتر ← متن یا ویس ← سردبیر ← سایت
 * منبع حقیقت: تب «مشارکت مجله» در هاب محتوا. سایت فقط موارد منتشرشده را از ?api=magcontrib می‌خواند (بی‌رمز، فقط دادهٔ عمومی).
 * بعد از هر انتشار، بات tj/v1/mag-sync سایت را صدا می‌زند تا صفحه همان لحظه به‌روز شود.
 * قلاب‌ها در telegram.gs: mcRoute_ (tgPrivate_) · mcOnCb_ (کال‌بک mc:) · mcStart_ (start=co- و rv-) · mcApiData_ (tgApiRoute_: api=magcontrib) · mcTests در TG_SUITES
 */

var MC_TAB = 'مشارکت مجله';
var MC_HEAD = ['کد', 'نوع', 'شناسهٔ مطلب', 'عنوان مطلب', 'نام', 'chat_id', 'نقش', 'وضعیت', 'نتیجهٔ بازبینی',
  'متن', 'فایل درایو', 'گوگل‌داک', 'تیتر', 'نوع افزوده', 'نام روی صفحه', 'کد نظام', 'صفحهٔ فرد', 'سمت',
  'تاریخ ثبت', 'تاریخ تصمیم', 'یادداشت سردبیر', 'توکن دعوت', 'انقضا', 'دعوت‌کننده', 'نگه‌دارندهٔ دعوت', 'ارجاع', 'چه چیزی ببینید', 'جیمیل'];
var MC_T = { REV: 'بازبینی', VOICE: 'صدا', NOTE: 'افزوده', INV: 'دعوت' };
var MC_ST = { NEW: 'آمادهٔ ارسال', INV: 'دعوت شد', DRAFT: 'در حال نوشتن', SENT: 'منتظر سردبیر', PUB: 'منتشر شد',
  OKN: 'تأیید بی‌نام', BACK: 'برگشت برای اصلاح', NO: 'فرصت ندارم', OPEN: 'باز', USED: 'استفاده شد', EXP: 'منقضی', DROP: 'کنار گذاشته شد' };
var MC_VERDICT = { a: 'تأیید بدون تغییر', b: 'تأیید با اصلاح‌های جزئی', c: 'نیاز به بازنویسی بخشی از متن', x: 'فرصت ندارم' };
var MC_KINDS = { bal: 'نکتهٔ بالینی', exp: 'از تجربهٔ اتاق درمان', ex: 'یک مثال', src: 'برای مطالعهٔ بیشتر' };
var MC_BTN = '🎙 مطالب من در مجله';
var MC_SITE = 'https://tajrobeh.life';
var MC_REVIEW_SHEET = cfg_('MC_REVIEW_SHEET', '');
var MC_INVITE_DAYS = 14;
var MC_MIN_NOTE = 40;
var MC_FOLDER = 'مشارکت مجله';
var MC_DRY_ROWS = null;   // در TG_DRY: سطرهای جعلی تب
var MC_DRY_INDEX = null;  // در TG_DRY: فهرست جعلی مطلب‌ها
var MC_DRY_PERSON = null; // در TG_DRY: {chat: {name, url, job, nz}}
var MC_DRY_EDITORS = null;
var MC_DRY_PEOPLE = null;
var MC_DRY_REVIEWS = null; // در TG_DRY: سطرهای شیت بازبینی  // در TG_DRY: نام ← {chat, url, job}

/* ================= لایهٔ اتصال به بقیهٔ بات (همان توابع telegram.gs، نه منطق موازی) ================= */

function mcDry_() { return (typeof TG_DRY !== 'undefined') ? !!TG_DRY : false; }

function mcOut_(ev) { if (typeof TG_OUTBOX !== 'undefined') TG_OUTBOX.push(ev); }

/** متدهای غیر از sendMessage (getFile، copyMessage). در حالت خشک رویداد با chat ثبت می‌شود. */
function mcTg_(method, payload) {
  if (mcDry_()) { mcOut_({ mc: 1, kind: 'api', method: method, chat: String(payload.chat_id || ''), text: '', markup: null }); return { ok: true, result: {} }; }
  var res = tgApi_(method, payload);
  try { return JSON.parse(res.getContentText()); } catch (e) { return { ok: false }; }
}

/** پیام با کیبورد inline از همان tgSend_ (پل مینی‌اپ، لاگ ارسال، بازگشت بی‌HTML). */
function mcSay_(chat, text, rows) {
  return tgSend_(chat, text, rows ? { inline_keyboard: rows } : null);
}

function mcEsc_(s) { return tgEsc_(s); }
function mcB_(text, data) { return { text: text, callback_data: data }; }
function mcU_(text, url) { return { text: text, url: url }; }

/** حالت گفت‌وگو فقط برای ورودی متنی/صوتی است؛ شناسه‌ها همیشه در کال‌بک هم هستند (دام ۱۳). */
function mcState_(chat, val) {
  if (val === undefined) { var s = tgGetVal_('mcs', chat); if (!s) return null; try { return JSON.parse(s); } catch (e) { return null; } }
  if (val === null) { tgDel_('mcs', chat); return null; }
  tgSetVal_('mcs', chat, JSON.stringify(val)); return val;
}

/** آدم پشت این چت: نام، صفحهٔ منتشرشدهٔ سایت و عنوانش. کد نظام پروفایل «فقط برای تأیید داخلی» است و هرگز از آنجا خوانده نمی‌شود. */
function mcPerson_(chat) {
  if (mcDry_()) return (MC_DRY_PERSON || {})[String(chat)] || null;
  var who = null;
  try { who = tgPqWho_(chat); } catch (e) {}
  if (!who || !who.name) {
    var g = PropertiesService.getScriptProperties().getProperty('mcgn' + chat);
    if (!g) return null;
    try { g = JSON.parse(g); return { name: g.name || '', url: '', job: g.job || '', nz: '' }; } catch (e2) { return null; }
  }
  var o = { name: String(who.name).trim(), url: '', job: '', nz: '' };
  try {
    var rec = tgPqRec_(tgPqId_(who), false);
    if (rec) { o.url = mcTeamUrl_(rec.v.page); o.job = String(rec.v.title || '').trim(); }
  } catch (e3) { mcLogErr_('person', e3); }
  return o;
}

function mcTeamUrl_(u) {
  u = String(u || '').trim();
  return /^https:\/\/tajrobeh\.life\/team\//.test(u) ? u : '';
}

/** سردبیرها (نقش «سردبیر» در تب افراد)، اولین chat هرکدام. */
function mcEditors_() {
  if (mcDry_()) return MC_DRY_EDITORS || [];
  return tgMagEditors_().map(function (e) { return tgMagFirst_(e.chat); }).filter(function (x) { return /^-?\d+$/.test(x); });
}

function mcIsEditor_(chat) {
  if (mcEditors_().indexOf(String(chat)) >= 0) return true;
  if (mcDry_()) return false;
  return tgMagIsEditor_(chat);
}

/** ترانویسی ویس با Gemini (ai.gs، صدای عمومی مجله)؛ اگر نشد رشتهٔ خالی. */
function mcTranscribe_(blob) {
  if (mcDry_()) return 'متن ترانویسی‌شدهٔ آزمایشی برای ویس، به اندازهٔ کافی بلند تا از حداقل رد شود.';
  try { return String((tgRmTranscribe_(blob) || {}).text || '').trim(); } catch (e) { mcLogErr_('transcribe', e); }
  return '';
}

function mcLogErr_(where, e) { try { tgErr_('mag_contrib ' + where, String(e && e.stack ? e.stack : e)); } catch (x) {} }

/* ================= داده ================= */

function mcSheet_() { return tgMagSheet_(MC_TAB, MC_HEAD); }

function mcRowsAll_() {
  if (mcDry_()) { if (!MC_DRY_ROWS) MC_DRY_ROWS = []; return MC_DRY_ROWS; }
  var sh = mcSheet_();
  var n = sh.getLastRow();
  if (n < 2) return [];
  var v = sh.getRange(2, 1, n - 1, MC_HEAD.length).getDisplayValues();
  return v.map(function (r, i) { var o = { _row: i + 2 }; MC_HEAD.forEach(function (h, j) { o[h] = r[j]; }); return o; });
}

function mcGet_(code) {
  var a = mcRowsAll_();
  for (var i = 0; i < a.length; i++) if (a[i]['کد'] === code) return a[i];
  return null;
}

function mcNextCode_(rows) {
  var mx = 2000;
  rows.forEach(function (r) { var m = /^C-(\d+)$/.exec(r['کد']); if (m) mx = Math.max(mx, +m[1]); });
  return 'C-' + (mx + 1);
}

function mcAdd_(obj) {
  var lock = mcDry_() ? null : LockService.getScriptLock();
  if (lock) lock.waitLock(20000);
  try {
    var rows = mcRowsAll_();
    obj['کد'] = mcNextCode_(rows);
    if (!obj['تاریخ ثبت']) obj['تاریخ ثبت'] = mcToday_();
    if (mcDry_()) { var o = { _row: rows.length + 2 }; MC_HEAD.forEach(function (h) { o[h] = obj[h] == null ? '' : String(obj[h]); }); rows.push(o); return o; }
    var sh = mcSheet_();
    sh.appendRow(MC_HEAD.map(function (h) { return obj[h] == null ? '' : obj[h]; }));
    return mcGet_(obj['کد']);
  } finally { if (lock) lock.releaseLock(); }
}

function mcSet_(code, patch) {
  var r = mcGet_(code);
  if (!r) return null;
  Object.keys(patch).forEach(function (k) {
    var j = MC_HEAD.indexOf(k);
    if (j < 0) return;
    r[k] = patch[k] == null ? '' : String(patch[k]);
    if (!mcDry_()) mcSheet_().getRange(r._row, j + 1).setValue(patch[k] == null ? '' : patch[k]);
  });
  return r;
}

function mcFa_(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; }); }

/** تاریخ نمایشی شیت (هر قالبی) به yyyy-MM-dd */
function mcIso_(v) {
  var s = String(v || '').trim(), m;
  if ((m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/.exec(s))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s))) return m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  return '';
}

function mcToday_() { return Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd'); }

/* ================= فهرست مطلب‌ها از سایت ================= */

function mcIndex_() {
  if (mcDry_()) return MC_DRY_INDEX || [];
  var c = CacheService.getScriptCache();
  try {
    var n = Number(c.get('mcidx:n') || 0);
    if (n) {
      var keys = []; for (var i = 0; i < n; i++) keys.push('mcidx:' + i);
      var got = c.getAll(keys), s = '';
      for (var k = 0; k < n; k++) { if (!got['mcidx:' + k]) { s = ''; break; } s += got['mcidx:' + k]; }
      if (s) return JSON.parse(s);
    }
  } catch (e0) {}
  try {
    var r = UrlFetchApp.fetch(MC_SITE + '/wp-json/tj/v1/mag-index', { muteHttpExceptions: true, followRedirects: true });
    var j = JSON.parse(r.getContentText());
    if (j.ok) {
      var str = JSON.stringify(j.posts), put = {}, parts = 0;
      for (var p = 0; p < str.length; p += 30000) { put['mcidx:' + parts] = str.slice(p, p + 30000); parts++; }
      put['mcidx:n'] = String(parts);
      try { c.putAll(put, 1800); } catch (e2) {}
      return j.posts;
    }
  } catch (e) { mcLogErr_('index', e); }
  return [];
}

function mcPost_(pid) {
  var a = mcIndex_();
  for (var i = 0; i < a.length; i++) if (String(a[i].id) === String(pid)) return a[i];
  return null;
}

function mcNorm_(s) { return String(s || '').replace(/[‌‏‎\s]+/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/^(دکتر)/, ''); }

/** «الف و ب»، «الف، ب»، «الف؛ ب»: هر نویسندهٔ مشترک هم مطلب را مال خودش می‌بیند. */
function mcAuthors_(a) { return String(a || '').split(/\s+و\s+|[،,؛;]/).map(mcNorm_).filter(String); }

function mcIsAuthor_(name, p) {
  var n = mcNorm_(name);
  return !!n && !!p && mcAuthors_(p.author).indexOf(n) >= 0;
}

function mcMyPosts_(name) {
  return mcIndex_().filter(function (p) { return mcIsAuthor_(name, p); });
}

function mcShort_(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

/* ================= ورودی‌ها ================= */

/** قلاب tgPrivate_: کدهای شروع این ماژول، دکمهٔ منو و ورودی‌های حالت‌دار. */
function mcRoute_(chat, m) {
  var text = String((m && m.text) || '').trim();
  var sm = /^\/start(?:@\w+)?\s+(co-[A-Za-z0-9]+|rv-C-\d+|mymag)$/.exec(text);
  if (sm) { mcState_(chat, null); return mcStart_(chat, sm[1], m.from || null); }
  return mcHandleMsg_(chat, m);
}

/** اگر پیام مال این ماژول بود true برمی‌گرداند. */
function mcHandleMsg_(chat, m) {
  var text = String((m && m.text) || '').trim();
  if (text === MC_BTN || text === '/mymag') { mcState_(chat, null); mcMy_(chat); return true; }
  var st = mcState_(chat);
  if (!st) return false;
  if (text === '/cancel' || text === 'لغو') { mcState_(chat, null); mcSay_(chat, 'بسته شد. هر وقت خواستید از «' + MC_BTN + '» برگردید.'); return true; }
  if (text && (text.indexOf('/') === 0 || (typeof tgIsBtnLike_ === 'function' && tgIsBtnLike_(text)))) { mcState_(chat, null); return false; }
  var file = mcFileOf_(m);
  try {
    if (st.s === 'fix') return mcFixIn_(chat, st, text, file);
    if (st.s === 'gmail') return mcGmailIn_(chat, st, text);
    if (st.s === 'nz') return mcNzIn_(chat, st, text);
    if (st.s === 'voice') return mcVoiceIn_(chat, st, file, text);
    if (st.s === 'note') return mcNoteIn_(chat, st, text, file);
    if (st.s === 'gname') return mcGuestNameIn_(chat, st, text);
    if (st.s === 'pid') return mcPidIn_(chat, text);
    if (st.s === 'back') return mcBackIn_(chat, st, text);
  } catch (e) { mcLogErr_('msg', e); mcSay_(chat, 'چیزی درست ثبت نشد. لطفاً دوباره بفرستید.'); return true; }
  return false;
}

function mcFileOf_(m) {
  if (!m) return null;
  if (m.voice) return { id: m.voice.file_id, kind: 'voice', mime: m.voice.mime_type || 'audio/ogg', dur: m.voice.duration || 0, msg: m.message_id };
  if (m.audio) return { id: m.audio.file_id, kind: 'audio', mime: m.audio.mime_type || 'audio/mpeg', dur: m.audio.duration || 0, msg: m.message_id, name: m.audio.file_name || '' };
  if (m.document) {
    var mt = String(m.document.mime_type || '');
    return { id: m.document.file_id, kind: /^audio\//.test(mt) ? 'audio' : 'doc', mime: mt, msg: m.message_id, name: m.document.file_name || '' };
  }
  return null;
}

/** start=co-<توکن> و start=rv-<کد> */
function mcStart_(chat, param, from) {
  param = String(param || '');
  if (param.indexOf('co-') === 0) { mcInviteOpen_(chat, param.slice(3), from); return true; }
  if (param.indexOf('rv-') === 0) { var r = mcGet_(param.slice(3)); if (r && String(r['chat_id']) === String(chat)) mcReviewCard_(r); else mcSay_(chat, 'این بازبینی پیدا نشد.'); return true; }
  if (param === 'mymag') { mcMy_(chat); return true; }
  return false;
}

/** کال‌بک‌هایی که با mc: شروع می‌شوند. */
function mcOnCb_(chat, data, cq) {
  var a = String(data).split(':');
  var op = a[1];
  try {
    switch (op) {
      case 'my': mcMy_(chat); return true;
      case 'p': mcPostMenu_(chat, a[2]); return true;
      case 'v': mcVoiceAsk_(chat, a[2]); return true;
      case 'n': mcNoteKindAsk_(chat, a[2], a[3] || ''); return true;
      case 'k': mcNoteHeadAsk_(chat, a[2], a[3], a[4] || ''); return true;
      case 'h': mcNoteTextAsk_(chat, a[2], a[3], a[4], a[5] || ''); return true;
      case 'i': mcInviteMake_(chat, a[2]); return true;
      case 'pid': mcState_(chat, { s: 'pid' }); mcSay_(chat, 'شناسه یا لینک مطلب را بفرستید.'); return true;
      case 'rv': mcVerdict_(chat, a[2], a[3]); return true;
      case 'fx': mcFixDone_(chat, a[2]); return true;
      case 'rd': mcVerdictDoc_(chat, a[2], a[3]); return true;
      case 'ro': mcReopen_(chat, a[2]); return true;
      case 'doc': mcDocStart_(chat, a[2]); return true;
      case 'dd': mcDocDone_(chat, a[2]); return true;
      case 'nm': mcConsent_(chat, a[2], a[3]); return true;
      case 'nz': mcNzSkip_(chat, a[2]); return true;
      case 'ea': mcEditorApprove_(chat, a[2]); return true;
      case 'er': mcEditorBackAsk_(chat, a[2]); return true;
      case 'ex': mcEditorDrop_(chat, a[2]); return true;
      case 'x': mcState_(chat, null); mcSay_(chat, 'بسته شد.'); return true;
    }
  } catch (e) { mcLogErr_('cb ' + data, e); mcSay_(chat, 'این دکمه الان کار نکرد. دوباره امتحان کنید.'); return true; }
  return false;
}

/* ================= «مطالب من در مجله» ================= */

function mcMy_(chat) {
  var me = mcPerson_(chat);
  var posts = me ? mcMyPosts_(me.name) : [];
  var ed = mcIsEditor_(chat);
  if (!posts.length) {
    var rows0 = ed ? [[mcB_('🔎 انتخاب مطلب با شناسه یا لینک', 'mc:pid')]] : null;
    mcSay_(chat, ed ? 'به‌عنوان سردبیر می‌توانید برای هر مطلبی صدا، افزوده یا لینک دعوت بسازید.'
      : 'مطلبی به نام شما در مجله پیدا نکردم. اگر فکر می‌کنید اشتباه است، از «پیام به پذیرش» خبر بدهید تا نام نویسنده درست شود.', rows0);
    return;
  }
  var rows = posts.slice(0, 12).map(function (p) { return [mcB_(mcShort_(p.title, 48), 'mc:p:' + p.id)]; });
  if (ed) rows.push([mcB_('🔎 مطلب دیگری (سردبیر)', 'mc:pid')]);
  var ptsLine = '';
  try { if (typeof rvMyPoints_ === 'function') { var pp = rvMyPoints_(chat); if (pp.name) ptsLine = '⭐ امتیاز شما: ' + vxFa_(pp.total) + ' (جزئیات: /points)\n\n'; } } catch (ePp) {}
  mcSay_(chat, ptsLine + '<b>مطالب شما در مجلهٔ تجربه</b>\nکدام را می‌خواهید زنده‌تر کنید؟ می‌توانید صدای خودتان را رویش بگذارید، چیزی به متن اضافه کنید یا از همکاری دعوت کنید که در آن مشارکت کند. همه‌چیز با تأیید سردبیر منتشر می‌شود.', rows);
}

function mcPidIn_(chat, text) {
  var m = /(\d{1,7})\/?$/.exec(String(text).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }));
  var p = null;
  if (m) p = mcPost_(m[1]);
  if (!p) {
    var slug = decodeURIComponent((/tajrobeh\.life\/(?:mag\/)?([^\/?#]+)\/?/.exec(text) || [])[1] || '');
    if (slug) p = mcIndex_().filter(function (x) { return decodeURIComponent(String(x.link)).indexOf('/' + slug + '/') >= 0; })[0] || null;
  }
  if (!p) { mcSay_(chat, 'این مطلب را پیدا نکردم. شناسهٔ عددی یا لینک کامل مطلب را بفرستید.'); return true; }
  mcState_(chat, null);
  mcPostMenu_(chat, p.id);
  return true;
}

function mcCanEditPost_(chat, p) {
  if (!p) return false;
  if (mcIsEditor_(chat)) return true;
  var me = mcPerson_(chat);
  return !!(me && mcIsAuthor_(me.name, p));
}

function mcPostMenu_(chat, pid) {
  var p = mcPost_(pid);
  if (!mcCanEditPost_(chat, p)) { mcSay_(chat, 'این مطلب در فهرست شما نیست.'); return; }
  var mine = mcRowsAll_().filter(function (r) { return r['شناسهٔ مطلب'] === String(pid) && r['نوع'] !== MC_T.INV; });
  var line = mine.length ? '\n\nتا حالا روی این مطلب: ' + mine.map(function (r) { return r['نوع'] + ' (' + r['وضعیت'] + ')'; }).join('، ') : '';
  mcSay_(chat, '<b>' + mcEsc_(p.title) + '</b>\n' + p.link + line, [
    [mcB_('🎙 افزودن صدای خودم', 'mc:v:' + pid)],
    [mcB_('✍️ افزودن نکته یا تجربه به متن', 'mc:n:' + pid)],
    [mcB_('🔗 دعوت از همکار برای مشارکت', 'mc:i:' + pid)],
    [mcB_('↩️ مطالب من', 'mc:my')]
  ]);
}

/* ================= ۲) صدا ================= */

function mcVoiceAsk_(chat, pid) {
  var p = mcPost_(pid);
  if (!mcCanEditPost_(chat, p)) { mcSay_(chat, 'این مطلب در فهرست شما نیست.'); return; }
  mcState_(chat, { s: 'voice', pid: String(pid) });
  mcSay_(chat, '🎙 <b>صدای شما روی «' + mcEsc_(mcShort_(p.title, 60)) + '»</b>\n\nیک ویس یا فایل صوتی بفرستید: خواندن کل متن، یا دو تا پنج دقیقه که بگویید این مطلب از کجا آمده و مهم‌ترین حرفش چیست.\n\nچند نکتهٔ کوچک: جای ساکت، گوشی نزدیک دهان، بدون موسیقی پس‌زمینه. نویزگیری و یکدست‌کردن صدا را ما انجام می‌دهیم.',
    [[mcB_('انصراف', 'mc:x')]]);
}

function mcVoiceIn_(chat, st, file, text) {
  if (!file || (file.kind !== 'voice' && file.kind !== 'audio')) { mcSay_(chat, 'منتظر یک ویس یا فایل صوتی هستم. برای انصراف «لغو» را بفرستید.'); return true; }
  if (file.dur && file.dur < 20) { mcSay_(chat, 'این صدا خیلی کوتاه است. کمی بیشتر صحبت کنید، حداقل نیم دقیقه.'); return true; }
  var p = mcPost_(st.pid);
  var me = mcPerson_(chat) || { name: '', url: '', job: '' };
  var ext = /mpeg|mp3/.test(file.mime) ? 'mp3' : (/mp4|m4a|aac/.test(file.mime) ? 'm4a' : 'ogg');
  var drive = mcSaveTgFile_(file.id, 'voice-' + st.pid + '-' + Date.now() + '.' + ext);
  var r = mcAdd_({ 'نوع': MC_T.VOICE, 'شناسهٔ مطلب': st.pid, 'عنوان مطلب': p ? p.title : '', 'نام': me.name, 'chat_id': chat,
    'نقش': 'نویسنده', 'وضعیت': MC_ST.SENT, 'فایل درایو': drive, 'صفحهٔ فرد': me.url, 'سمت': me.job, 'نام روی صفحه': 'بله' });
  mcState_(chat, null);
  /* v166: موتور صدا (voice.gs): تمیزکاری، متن، تأیید خود نویسنده، بعد سردبیر */
  if (!mcDry_() && typeof vxStart_ === 'function') {
    mcSet_(r['کد'], { 'وضعیت': MC_ST.DRAFT });
    vxStart_({ use: 'mag', ref: r['کد'], chat: chat, name: me.name, file: drive, dur: file.dur || '' });
    mcSay_(chat, '🎧 صدایتان رسید. نویز و سطح صدا را درست می‌کنیم و متنش را درمی‌آوریم؛ چند دقیقهٔ دیگر نسخهٔ تمیز و متن را همین‌جا می‌فرستم تا ببینید و تأیید کنید.');
    return true;
  }
  mcSay_(chat, 'ممنون 🌱 صدای شما رسید و برای سردبیر رفت. بعد از تأیید، نسخهٔ نویزگیری‌شده روی صفحهٔ مطلب می‌آید و خبرتان می‌کنیم.');
  mcEditorCard_(r, file.msg, chat);
  return true;
}

/** فایل تلگرام را در پوشهٔ «مشارکت مجله» درایو می‌گذارد و شناسهٔ فایل درایو را برمی‌گرداند. */
function mcSaveTgFile_(fileId, name) {
  if (mcDry_()) return 'DRY' + String(fileId).replace(/[^\w-]/g, '').slice(0, 20) + 'xxxxxxxxxxxxxxxxxxxx';
  var f = tgTgFile_(fileId);
  var ext = (String(f.path).match(/\.[A-Za-z0-9]{2,5}$/) || ['.ogg'])[0].replace('.oga', '.ogg');
  return mcFolder_().createFile(f.blob.setName(String(name).replace(/\.[A-Za-z0-9]{2,5}$/, '') + ext)).getId();
}

function mcFolder_() { return tgPqFolder_(MC_FOLDER); }

/* ================= ۳) افزوده به متن ================= */

function mcNoteKindAsk_(chat, pid, tok) {
  var p = mcPost_(pid);
  if (!tok) { if (!mcCanEditPost_(chat, p)) { mcSay_(chat, 'این مطلب در فهرست شما نیست.'); return; } }
  else if (!mcInviteValid_(tok, chat, pid)) { mcSay_(chat, 'این دعوت دیگر باز نیست.'); return; }
  var rows = Object.keys(MC_KINDS).map(function (k) { return [mcB_(MC_KINDS[k], 'mc:k:' + pid + ':' + k + ':' + (tok || ''))]; });
  rows.push([mcB_('انصراف', 'mc:x')]);
  mcSay_(chat, '✍️ <b>' + mcEsc_(mcShort_(p ? p.title : '', 70)) + '</b>\nچه چیزی می‌خواهید اضافه کنید؟', rows);
}

function mcNoteHeadAsk_(chat, pid, kind, tok) {
  var p = mcPost_(pid);
  if (!p || !MC_KINDS[kind]) { mcSay_(chat, 'این مطلب پیدا نشد.'); return; }
  var rows = (p.h || []).slice(0, 14).map(function (h, i) { return [mcB_(mcShort_(h, 50), 'mc:h:' + pid + ':' + kind + ':' + i + ':' + (tok || ''))]; });
  rows.push([mcB_('آخر مطلب', 'mc:h:' + pid + ':' + kind + ':e:' + (tok || ''))]);
  mcSay_(chat, 'این «' + MC_KINDS[kind] + '» زیر کدام بخش مطلب بیاید؟', rows);
}

function mcNoteTextAsk_(chat, pid, kind, hi, tok) {
  var p = mcPost_(pid);
  if (!p) { mcSay_(chat, 'این مطلب پیدا نشد.'); return; }
  var ht = (hi === 'e') ? '' : ((p.h || [])[+hi] || '');
  mcState_(chat, { s: 'note', pid: String(pid), k: kind, ht: ht, tok: tok || '' });
  mcSay_(chat, 'حالا متن را بنویسید، یا اگر راحت‌ترید ویس بفرستید تا به متن تبدیلش کنیم.\n\nکوتاه و روشن بهتر است: یک تا سه پاراگراف. این نوشته بعد از تأیید سردبیر با نام شما زیر همان بخش منتشر می‌شود. اگر از تجربهٔ اتاق درمان می‌نویسید، هیچ جزئیاتی که مراجع را شناسایی کند نیاورید.',
    [[mcB_('انصراف', 'mc:x')]]);
}

function mcNoteIn_(chat, st, text, file) {
  var drive = '';
  if (file && (file.kind === 'voice' || file.kind === 'audio')) {
    drive = mcSaveTgFile_(file.id, 'note-' + st.pid + '-' + Date.now() + '.ogg');
    text = mcDry_() ? mcTranscribe_(null) : mcTranscribe_(DriveApp.getFileById(drive).getBlob());
    if (!text) { mcSay_(chat, 'ویس رسید ولی تبدیلش به متن نشد. لطفاً متن را تایپ کنید.'); return true; }
  }
  if (!text || text.length < MC_MIN_NOTE) { mcSay_(chat, 'کمی بیشتر بنویسید، حداقل یکی دو جمله.'); return true; }
  if (st.tok && !mcInviteValid_(st.tok, chat, st.pid)) { mcState_(chat, null); mcSay_(chat, 'این دعوت دیگر باز نیست.'); return true; }
  var p = mcPost_(st.pid);
  var me = mcPerson_(chat) || { name: st.gn || '', url: '', job: '' };
  var inv = st.tok ? mcInviteRow_(st.tok) : null;
  var r = mcAdd_({ 'نوع': MC_T.NOTE, 'شناسهٔ مطلب': st.pid, 'عنوان مطلب': p ? p.title : '', 'نام': me.name || st.gn || '', 'chat_id': chat,
    'نقش': st.tok ? 'مهمان' : 'نویسنده', 'وضعیت': MC_ST.SENT, 'متن': text, 'فایل درایو': drive, 'تیتر': st.ht, 'نوع افزوده': MC_KINDS[st.k] || '',
    'صفحهٔ فرد': me.url || '', 'سمت': me.job || '', 'نام روی صفحه': 'بله', 'دعوت‌کننده': inv ? inv['دعوت‌کننده'] : '', 'توکن دعوت': st.tok || '' });
  if (inv) mcSet_(inv['کد'], { 'وضعیت': MC_ST.USED });
  mcState_(chat, null);
  mcSay_(chat, 'ممنون 🌱 متن شما رسید و برای سردبیر رفت. بعد از تأیید، با نامتان زیر همان بخش مطلب منتشر می‌شود و خبرتان می‌کنیم.' +
    (drive ? '\n\nمتنی که از ویس شما درآمد:\n<i>' + mcEsc_(mcShort_(text, 900)) + '</i>' : ''));
  if (inv && inv['دعوت‌کننده'] && inv['دعوت‌کننده'] !== String(chat)) {
    mcSay_(inv['دعوت‌کننده'], '✉️ همکاری که دعوتش کرده بودید، روی «' + mcEsc_(mcShort_(p ? p.title : '', 60)) + '» مشارکت کرد (' + (MC_KINDS[st.k] || 'افزوده') + '). بعد از تأیید سردبیر روی صفحه می‌آید.');
  }
  mcEditorCard_(r, null, chat);
  return true;
}

/* ----- دعوت ----- */

function mcToken_() {
  var s = Utilities.getUuid().replace(/-/g, '');
  return s.slice(0, 10);
}

function mcInviteMake_(chat, pid) {
  var p = mcPost_(pid);
  if (!mcCanEditPost_(chat, p)) { mcSay_(chat, 'این مطلب در فهرست شما نیست.'); return; }
  var tok = mcToken_();
  var exp = Utilities.formatDate(new Date(Date.now() + MC_INVITE_DAYS * 864e5), 'Asia/Tehran', 'yyyy-MM-dd');
  var me = mcPerson_(chat) || { name: '' };
  mcAdd_({ 'نوع': MC_T.INV, 'شناسهٔ مطلب': pid, 'عنوان مطلب': p.title, 'نام': me.name, 'chat_id': chat, 'نقش': mcIsEditor_(chat) ? 'سردبیر' : 'نویسنده',
    'وضعیت': MC_ST.OPEN, 'توکن دعوت': tok, 'انقضا': exp, 'دعوت‌کننده': chat });
  var link = 'https://t.me/' + mcBotName_() + '?start=co-' + tok;
  mcSay_(chat, '🔗 <b>لینک دعوت ساخته شد</b>\nاین لینک را برای همکاری بفرستید که می‌خواهید در «' + mcEsc_(mcShort_(p.title, 60)) + '» مشارکت کند. یک‌بارمصرف است و تا ' + mcFa_(MC_INVITE_DAYS) + ' روز باز می‌ماند.\n\n' + link + '\n\nمتن پیشنهادی برای فرستادن:\n<i>سلام، مطلبی در مجلهٔ تجربه نوشته‌ام و دوست دارم نگاه شما هم در آن باشد. اگر وقت دارید، از این لینک یک نکته، مثال یا تجربه به آن اضافه کنید:</i>\n' + link);
}

function mcBotName_() { return tgBotName_(); }

function mcInviteRow_(tok) {
  var a = mcRowsAll_();
  for (var i = 0; i < a.length; i++) if (a[i]['نوع'] === MC_T.INV && a[i]['توکن دعوت'] === tok) return a[i];
  return null;
}

/** دعوت باز است، منقضی نشده، و یا هنوز استفاده نشده یا همین چت در حال استفاده از آن است. */
function mcInviteValid_(tok, chat, pid) {
  var r = mcInviteRow_(tok);
  if (!r) return false;
  if (pid && r['شناسهٔ مطلب'] !== String(pid)) return false;
  if (mcIso_(r['انقضا']) && mcIso_(r['انقضا']) < mcToday_()) { if (r['وضعیت'] === MC_ST.OPEN) mcSet_(r['کد'], { 'وضعیت': MC_ST.EXP }); return false; }
  if (r['وضعیت'] === MC_ST.OPEN) return true;
  return r['وضعیت'] === MC_ST.DRAFT && r['نگه‌دارندهٔ دعوت'] === String(chat);
}

function mcInviteOpen_(chat, tok, from) {
  var r = mcInviteRow_(tok);
  if (!r || !mcInviteValid_(tok, chat, '')) { mcSay_(chat, 'این لینک دعوت دیگر باز نیست. اگر هنوز می‌خواهید مشارکت کنید، از کسی که لینک را فرستاده یک لینک تازه بخواهید.'); return; }
  mcSet_(r['کد'], { 'وضعیت': MC_ST.DRAFT, 'نگه‌دارندهٔ دعوت': String(chat) });
  var p = mcPost_(r['شناسهٔ مطلب']);
  mcSay_(chat, '🌿 <b>دعوت به مشارکت در مجلهٔ تجربه</b>\nشما را دعوت کرده‌اند که در این مطلب مشارکت کنید:\n<b>' + mcEsc_(p ? p.title : r['عنوان مطلب']) + '</b>\n' + (p ? p.link : ''));
  var me = mcPerson_(chat);
  if (me && me.name) { mcNoteKindAsk_(chat, r['شناسهٔ مطلب'], tok); return; }
  var guess = from ? [from.first_name, from.last_name].filter(Boolean).join(' ').trim() : '';
  mcState_(chat, { s: 'gname', pid: r['شناسهٔ مطلب'], tok: tok });
  mcSay_(chat, 'نام و نام خانوادگی‌تان را همان‌طور که دوست دارید زیر مشارکتتان بیاید بنویسید' + (guess ? ' (مثلاً ' + mcEsc_(guess) + ')' : '') + '. اگر سمتی هم دارید، بعد از نام با ویرگول بنویسید؛ مثل «نام، روان‌درمانگر».');
}

function mcGuestNameIn_(chat, st, text) {
  var parts = String(text).split(/[،,]/);
  var name = parts[0].trim();
  if (name.length < 3 || name.length > 60) { mcSay_(chat, 'لطفاً نام و نام خانوادگی را بنویسید.'); return true; }
  mcGuestSet_(chat, { name: name, job: (parts[1] || '').trim().slice(0, 60) });
  mcState_(chat, null);
  mcNoteKindAsk_(chat, st.pid, st.tok);
  return true;
}

/** مهمانی که در تب افراد نیست: نامش ۱۴ روز در کش می‌ماند تا مشارکتش ثبت شود. */
function mcGuestSet_(chat, o) {
  if (mcDry_()) { MC_DRY_PERSON = MC_DRY_PERSON || {}; MC_DRY_PERSON[String(chat)] = { name: o.name, url: '', job: o.job, nz: '' }; return; }
  if (!o.name) return;
  PropertiesService.getScriptProperties().setProperty('mcgn' + chat, JSON.stringify(o));
}

/* ================= ۱) بازبینی علمی ================= */

/** ستون‌های شیت «بازبینی بالینی مجلهٔ تجربه» با الگو پیدا می‌شوند، نه با نام دقیق. */
var MC_RS_COLS = { code: /^کد$/, title: /^مقاله$/, link: /لینک/, name: /^بازبین$/, what: /ببینید/, verdict: /^نتیجه/, fix: /^اصلاح/, consent: /نام من|نام روی صفحه/, nz: /^کد نظام/, sent: /^تاریخ ارسال/, answered: /^تاریخ پاسخ/ };
function mcRsCol_(H, k) { for (var i = 0; i < H.length; i++) if (MC_RS_COLS[k].test(String(H[i]).trim())) return i; return -1; }

function mcLinkKey_(u) { try { u = decodeURIComponent(String(u || '')); } catch (e) { u = String(u || ''); } return u.replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase(); }

/** سطرهای شیت بازبینی را به تب «مشارکت مجله» می‌آورد؛ سطر قبلاً آمده بی‌شناسهٔ مطلب را هم درست می‌کند. */
function mcImportReviews() {
  var v = mcDry_() ? (MC_DRY_REVIEWS || [[]]) : SpreadsheetApp.openById(MC_REVIEW_SHEET).getSheets()[0].getDataRange().getDisplayValues();
  var H = v[0];
  var C = {}; Object.keys(MC_RS_COLS).forEach(function (k) { C[k] = mcRsCol_(H, k); });
  var g = function (row, k) { return C[k] > -1 ? String(row[C[k]] || '').trim() : ''; };
  var have = {};
  mcRowsAll_().forEach(function (r) { if (r['ارجاع']) have[r['ارجاع'] + '|' + mcNorm_(r['نام'])] = r; });
  var people = mcPeopleByName_();
  var idx = mcIndex_();
  var byLink = {}; idx.forEach(function (p) { byLink[mcLinkKey_(p.link)] = p; });
  var out = [];
  for (var i = 1; i < v.length; i++) {
    var code = g(v[i], 'code'), name = g(v[i], 'name');
    if (!code || !name) continue;
    var post = byLink[mcLinkKey_(g(v[i], 'link'))] || idx.filter(function (p) { return mcNorm_(p.title) === mcNorm_(g(v[i], 'title')); })[0];
    var old = have[code + '|' + mcNorm_(name)];
    if (old) {
      if (!old['شناسهٔ مطلب'] && post) { mcSet_(old['کد'], { 'شناسهٔ مطلب': post.id, 'چه چیزی ببینید': g(v[i], 'what') }); out.push(old['کد'] + ' ' + code + ' ' + name + ' (شناسهٔ مطلب درست شد)'); }
      continue;
    }
    var person = people[mcNorm_(name)] || {};
    var r = mcAdd_({ 'نوع': MC_T.REV, 'شناسهٔ مطلب': post ? post.id : '', 'عنوان مطلب': post ? post.title : g(v[i], 'title'), 'نام': name, 'chat_id': person.chat || '',
      'نقش': 'بازبین', 'وضعیت': MC_ST.NEW, 'ارجاع': code, 'چه چیزی ببینید': g(v[i], 'what'), 'صفحهٔ فرد': person.url || '',
      'سمت': person.job || '' });
    out.push(r['کد'] + ' ' + code + ' ' + name + (person.chat ? '' : ' (chat_id ندارد)') + (post ? '' : ' (مطلب پیدا نشد)'));
  }
  console.log(out.join('\n') || 'ردیف تازه‌ای نبود');
  return out;
}

/** تب «پروفایل سایت» یک‌جا: شناسه ← {page, title} (به‌جای خواندن شیت برای هر نفر). */
function mcPqMap_() {
  var out = {};
  try {
    var sh = tgPqSheet_(); if (!sh || sh.getLastRow() < 3) return out;
    var lc = sh.getLastColumn(), keys = sh.getRange(2, 1, 1, lc).getValues()[0].map(String);
    var ci = keys.indexOf('id'), cp = keys.indexOf('page'), ct = keys.indexOf('title');
    if (ci < 0) ci = 0;
    sh.getRange(3, 1, sh.getLastRow() - 2, lc).getValues().forEach(function (r) {
      var id = String(r[ci] || ''); if (id) out[id] = { page: cp > -1 ? String(r[cp] || '') : '', title: ct > -1 ? String(r[ct] || '') : '' };
    });
  } catch (e) { mcLogErr_('pqmap', e); }
  return out;
}

/** نام ← {chat, url, job} از تب‌های افراد و درمانگران. */
function mcPeopleByName_() {
  var m = {};
  if (mcDry_()) return MC_DRY_PEOPLE || m;
  var pq = mcPqMap_();
  var add = function (name, chat) {
    name = String(name || '').trim(); if (!name) return;
    var k = mcNorm_(name), c = tgMagFirst_(chat);
    if (m[k] && m[k].chat) return;
    var rec = pq['ther:' + tgNorm_(name)] || pq['ppl:' + tgNorm_(name)] || {};
    m[k] = { chat: /^\d+$/.test(c) ? c : '', url: mcTeamUrl_(rec.page), job: String(rec.title || '').trim() };
  };
  (tgPeopleList_() || []).forEach(function (p) { if (String(p.status).trim() !== 'غیرفعال') add(p.name, p.chat); });
  (tgTherapistRows_() || []).forEach(function (t) { add(t.name, t.chat); });
  return m;
}

/** کارت بازبینی را برای همهٔ سطرهای «آمادهٔ ارسال» که chat_id دارند می‌فرستد. */
function mcSendReviews() {
  var sent = [];
  mcRowsAll_().forEach(function (r) {
    if (r['نوع'] !== MC_T.REV || r['وضعیت'] !== MC_ST.NEW || !/^\d+$/.test(r['chat_id'])) return;
    var res = mcReviewCard_(r, true);
    if (res === 'رفت' || res === 'صف') { mcSet_(r['کد'], { 'وضعیت': MC_ST.INV }); mcReviewSheetSet_(r, { sent: mcToday_() }); sent.push(r['کد'] + ' ' + r['نام']); }
    if (!mcDry_()) Utilities.sleep(400);
  });
  console.log('ارسال شد: ' + sent.length + '\n' + sent.join('\n'));
  return sent;
}

function mcReviewCard_(r, invite) {
  var p = mcPost_(r['شناسهٔ مطلب']);
  var link = p ? p.link : '';
  var what = r['چه چیزی ببینید'] ? '\n\n<b>جاهایی که نگاه شما برایمان مهم است:</b>\n' + mcEsc_(r['چه چیزی ببینید']) : '';
  var txt = '🔬 <b>بازبینی علمی یک مقالهٔ مجله</b>\n\n«' + mcEsc_(p ? p.title : r['عنوان مطلب']) + '»\n' + link + what +
    '\n\nهر وقت فرصت کردید مقاله را بخوانید و نتیجه را با یکی از دکمه‌ها بفرستید. اگر اصلاحی دارید، می‌توانید همین‌جا بنویسید، ویس بفرستید، یا روی نسخه‌ای از متن در گوگل‌داک کار کنید.' +
    '\n\nاگر بازبینی تأیید شود و خودتان بخواهید، نامتان به‌عنوان بازبین علمی روی مقاله می‌آید و به صفحه‌تان لینک می‌شود.';
  var c = r['کد'];
  var rows = [
    [mcB_('✅ ' + MC_VERDICT.a, 'mc:rv:' + c + ':a')],
    [mcB_('✏️ ' + MC_VERDICT.b, 'mc:rv:' + c + ':b')],
    [mcB_('📝 ' + MC_VERDICT.c, 'mc:rv:' + c + ':c')],
    [mcB_('📄 روی متن در گوگل‌داک کار می‌کنم', 'mc:doc:' + c)],
    [mcB_('⏳ ' + MC_VERDICT.x, 'mc:rv:' + c + ':x')]
  ];
  if (invite) return tgNotify_(r['chat_id'], TG_NK.invite, txt, { ref: c, markup: { inline_keyboard: rows } });
  return mcSay_(r['chat_id'], txt, rows);
}

function mcMineOr_(chat, code) {
  var r = mcGet_(code);
  if (!r || String(r['chat_id']) !== String(chat)) { mcSay_(chat, 'این بازبینی پیدا نشد.'); return null; }
  if (r['وضعیت'] === MC_ST.PUB || r['وضعیت'] === MC_ST.OKN) { mcSay_(chat, 'این بازبینی قبلاً ثبت و تأیید شده است. ممنون از شما.'); return null; }
  if (r['وضعیت'] === MC_ST.SENT) { mcSay_(chat, 'بازبینی شما رسیده و منتظر سردبیر است. ممنون 🙏'); return null; }
  return r;
}

function mcVerdict_(chat, code, v) {
  var r = mcMineOr_(chat, code);
  if (!r || !MC_VERDICT[v]) return;
  if (v === 'x') {
    mcSet_(code, { 'وضعیت': MC_ST.NO, 'نتیجهٔ بازبینی': MC_VERDICT.x, 'تاریخ تصمیم': mcToday_() });
    mcReviewSheetSet_(r, { verdict: MC_VERDICT.x, answered: mcToday_() });
    mcSay_(chat, 'کاملاً قابل درک است. ممنون که خبر دادید 🙏 اگر بعداً فرصت شد، همین پیام بالا هنوز کار می‌کند.');
    mcEditorsSay_('⏳ ' + mcEsc_(r['نام']) + ' برای بازبینی «' + mcEsc_(mcShort_(r['عنوان مطلب'], 50)) + '» فرصت ندارد. (' + code + ')');
    return;
  }
  mcSet_(code, { 'نتیجهٔ بازبینی': MC_VERDICT[v], 'وضعیت': MC_ST.DRAFT });
  if (v === 'a') { mcConsentAsk_(chat, code); return; }
  mcState_(chat, { s: 'fix', c: code });
  mcSay_(chat, 'ممنون. اصلاحات را همین‌جا بنویسید یا ویس بفرستید؛ اگر چند پیام شد اشکالی ندارد. وقتی تمام شد «تمام شد» را بزنید.\n\nاگر ترجیح می‌دهید مستقیم روی متن کار کنید، گوگل‌داک را بزنید.', [
    [mcB_('✅ تمام شد', 'mc:fx:' + code)],
    [mcB_('📄 کار روی متن در گوگل‌داک', 'mc:doc:' + code)]
  ]);
}

/** بعد از کار در گوگل‌داک: خود سند اصلاحات است؛ نتیجه ثبت و سراغ رضایت نام. */
function mcVerdictDoc_(chat, code, v) {
  var r = mcMineOr_(chat, code);
  if (!r || (v !== 'b' && v !== 'c')) return;
  mcSet_(code, { 'نتیجهٔ بازبینی': MC_VERDICT[v], 'وضعیت': MC_ST.DRAFT });
  mcConsentAsk_(chat, code);
}

function mcReopen_(chat, code) {
  var r = mcMineOr_(chat, code);
  if (r) mcReviewCard_(r);
}

function mcFixIn_(chat, st, text, file) {
  var r = mcGet_(st.c);
  if (!r) { mcState_(chat, null); return false; }
  var add = text;
  var drive = r['فایل درایو'];
  if (file && (file.kind === 'voice' || file.kind === 'audio')) {
    var id = mcSaveTgFile_(file.id, 'review-' + st.c + '-' + Date.now() + '.ogg');
    drive = drive ? drive + ' ' + id : id;
    /* v169: ویس بازبینی با Gemini و فهرست اصطلاحات بالینی (review.gs)؛ اگر نشد مسیر عمومی Gemini */
    add = mcDry_() ? mcTranscribe_(null) : (typeof rvTranscribe_ === 'function' ? rvTranscribe_(DriveApp.getFileById(id).getBlob()) : mcTranscribe_(DriveApp.getFileById(id).getBlob()));
    add = '🎙 ' + (add || '(ویس، متن نشد)');
  } else if (file) {
    var id2 = mcSaveTgFile_(file.id, 'review-' + st.c + '-' + (file.name || Date.now()));
    drive = drive ? drive + ' ' + id2 : id2;
    add = '📎 ' + (file.name || 'فایل');
  }
  if (!add) { mcSay_(chat, 'متن یا ویس بفرستید، یا «تمام شد» را بزنید.'); return true; }
  var body = r['متن'] ? r['متن'] + '\n' + add : add;
  mcSet_(st.c, { 'متن': body.slice(0, 45000), 'فایل درایو': drive });
  var heard = add.indexOf('🎙 ') === 0 ? '\n\n📝 از ویس شما این متن درآمد (اگر جایی غلط شنیده شده، درستش را بنویسید):\n' + mcEsc_(mcShort_(add.slice(2), 1500)) : '';
  mcSay_(chat, 'ثبت شد.' + heard + '\n\nاگر چیز دیگری هست بفرستید، وگرنه «تمام شد».', [[mcB_('✅ تمام شد', 'mc:fx:' + st.c)]]);
  return true;
}

function mcFixDone_(chat, code) {
  var r = mcMineOr_(chat, code);
  if (!r) return;
  if (!r['متن'] && !r['گوگل‌داک']) { mcSay_(chat, 'هنوز اصلاحی نرسیده. متن یا ویس بفرستید، یا اگر اصلاحی ندارید «' + MC_VERDICT.a + '» را از پیام بازبینی بزنید.'); return; }
  mcState_(chat, null);
  mcConsentAsk_(chat, code);
}

/* ----- گوگل‌داک ----- */

function mcDocStart_(chat, code) {
  var r = mcMineOr_(chat, code);
  if (!r) return;
  if (r['گوگل‌داک']) { mcDocSend_(chat, r); return; }
  var mail = mcMailOf_(chat);
  if (mail) { mcDocMake_(chat, code, mail); return; }
  mcState_(chat, { s: 'gmail', c: code });
  mcSay_(chat, 'برای اینکه فقط خودتان به سند دسترسی داشته باشید، جیمیلی را که با آن وارد گوگل‌داک می‌شوید بفرستید. این نشانی فقط برای همین سند استفاده می‌شود و جایی منتشر نمی‌شود.', [[mcB_('انصراف', 'mc:x')]]);
}

function mcMailOf_(chat) {
  if (mcDry_()) return '';
  return PropertiesService.getScriptProperties().getProperty('mcmail' + chat) || '';
}

function mcGmailIn_(chat, st, text) {
  var mail = String(text).trim().toLowerCase();
  if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(mail)) { mcSay_(chat, 'این نشانی ایمیل درست به نظر نمی‌رسد. دوباره بفرستید.'); return true; }
  if (!mcDry_()) PropertiesService.getScriptProperties().setProperty('mcmail' + chat, mail);
  mcState_(chat, null);
  mcDocMake_(chat, st.c, mail);
  return true;
}

function mcDocMake_(chat, code, mail) {
  var r = mcGet_(code);
  var p = mcPost_(r['شناسهٔ مطلب']);
  var url;
  if (mcDry_()) url = 'https://docs.google.com/document/d/DRY/edit';
  else {
    var txt = mcPostText_(r['شناسهٔ مطلب']);
    var doc = DocumentApp.create('بازبینی علمی · ' + mcShort_(p ? p.title : r['عنوان مطلب'], 70) + ' · ' + code);
    var b = doc.getBody();
    b.setAttributes((function () { var a = {}; a[DocumentApp.Attribute.LEFT_TO_RIGHT] = false; return a; })());
    b.appendParagraph('راهنما: با حالت «پیشنهاد» (Suggesting) یا کامنت روی همین متن کار کنید. وقتی تمام شد، در بات «نوشتنم تمام شد» را بزنید.').setItalic(true);
    b.appendParagraph(p ? p.link : '');
    b.appendParagraph(p ? p.title : r['عنوان مطلب']).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    txt.forEach(function (x) {
      var para = b.appendParagraph(x.t);
      if (x.h) para.setHeading(x.h === 2 ? DocumentApp.ParagraphHeading.HEADING2 : DocumentApp.ParagraphHeading.HEADING3);
      para.setLeftToRight(false);
    });
    doc.saveAndClose();
    var f = DriveApp.getFileById(doc.getId());
    f.moveTo(mcFolder_());
    f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    f.addEditor(mail);
    url = doc.getUrl();
  }
  mcSet_(code, { 'گوگل‌داک': url, 'وضعیت': MC_ST.DRAFT });
  mcDocSend_(chat, mcGet_(code));
}

function mcDocSend_(chat, r) {
  mcSay_(chat, '📄 سند آماده است و فقط با جیمیل شما به اشتراک گذاشته شد. روی خود متن پیشنهاد یا کامنت بگذارید؛ وقتی تمام شد اینجا نتیجه را انتخاب کنید.', [
    [mcU_('باز کردن سند', r['گوگل‌داک'])],
    [mcB_('✅ نوشتنم تمام شد', 'mc:dd:' + r['کد'])]
  ]);
}

function mcDocDone_(chat, code) {
  var r = mcMineOr_(chat, code);
  if (!r) return;
  if (r['نتیجهٔ بازبینی'] && r['نتیجهٔ بازبینی'] !== MC_VERDICT.x) { mcConsentAsk_(chat, code); return; }
  mcSay_(chat, 'نتیجهٔ کلی بازبینی‌تان کدام است؟', [
    [mcB_('✅ ' + MC_VERDICT.a, 'mc:rv:' + code + ':a')],
    [mcB_('✏️ ' + MC_VERDICT.b, 'mc:rd:' + code + ':b')],
    [mcB_('📝 ' + MC_VERDICT.c, 'mc:rd:' + code + ':c')]
  ]);
}

/** متن ساده‌شدهٔ مطلب از REST وردپرس: [{t, h}] */
function mcPostText_(pid) {
  var r = UrlFetchApp.fetch(MC_SITE + '/wp-json/wp/v2/posts/' + pid + '?_fields=content', { muteHttpExceptions: true });
  var html = '';
  try { html = JSON.parse(r.getContentText()).content.rendered; } catch (e) { return [{ t: '(متن مطلب خوانده نشد؛ از لینک بالا بخوانید.)' }]; }
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  var out = [];
  var re = /<(h2|h3|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi, m;
  while ((m = re.exec(html))) {
    var t = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&zwnj;/g, '‌').replace(/&amp;/g, '&').replace(/&#8211;|&#8212;/g, '،').replace(/\s+/g, ' ').trim();
    if (!t) continue;
    out.push({ t: (m[1].toLowerCase() === 'li' ? '• ' : '') + t, h: m[1].toLowerCase() === 'h2' ? 2 : (m[1].toLowerCase() === 'h3' ? 3 : 0) });
  }
  return out.length ? out : [{ t: '(متن مطلب خوانده نشد؛ از لینک بالا بخوانید.)' }];
}

/* ----- رضایت نام و کد نظام ----- */

function mcConsentAsk_(chat, code) {
  mcSay_(chat, 'یک سؤال آخر: اگر سردبیر بازبینی را تأیید کرد، نامتان به‌عنوان بازبین علمی روی مقاله بیاید؟', [
    [mcB_('بله، نامم بیاید', 'mc:nm:' + code + ':y'), mcB_('نه، بی‌نام', 'mc:nm:' + code + ':n')]
  ]);
}

function mcConsent_(chat, code, yn) {
  var r = mcMineOr_(chat, code);
  if (!r) return;
  mcSet_(code, { 'نام روی صفحه': yn === 'y' ? 'بله' : 'نه' });
  if (yn === 'y' && !r['کد نظام']) {
    mcState_(chat, { s: 'nz', c: code });
    mcSay_(chat, 'اگر دوست دارید کد نظام روان‌شناسی‌تان هم کنار نام بیاید (برای اعتبار علمی صفحه در گوگل مفید است)، عددش را بفرستید.', [[mcB_('نه، لازم نیست', 'mc:nz:' + code)]]);
    return;
  }
  mcReviewSubmit_(chat, code);
}

function mcNzIn_(chat, st, text) {
  var d = String(text).replace(/[۰-۹]/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(x); }).replace(/[^\d]/g, '');
  if (d.length < 3 || d.length > 8) { mcSay_(chat, 'فقط عدد کد نظام را بفرستید، یا «نه، لازم نیست» را بزنید.', [[mcB_('نه، لازم نیست', 'mc:nz:' + st.c)]]); return true; }
  mcSet_(st.c, { 'کد نظام': d });
  mcState_(chat, null);
  mcReviewSubmit_(chat, st.c);
  return true;
}

function mcNzSkip_(chat, code) { mcState_(chat, null); if (mcMineOr_(chat, code)) mcReviewSubmit_(chat, code); }

function mcReviewSubmit_(chat, code) {
  var r = mcSet_(code, { 'وضعیت': MC_ST.SENT, 'تاریخ تصمیم': '' });
  mcReviewSheetSet_(r, { verdict: r['نتیجهٔ بازبینی'], fix: mcShort_([r['متن'], r['گوگل‌داک']].filter(String).join('\n'), 45000), consent: r['نام روی صفحه'], nz: r['کد نظام'], answered: mcToday_() });
  mcSay_(chat, 'ممنون از وقتی که گذاشتید 🙏 بازبینی‌تان ثبت شد و برای سردبیر رفت. بعد از تأیید خبرتان می‌کنیم.');
  /* v166: اصلاحات (سند، ویس، متن) به فهرست تغییر دقیق تبدیل می‌شود و سردبیر در صفحهٔ بررسی تصمیم می‌گیرد */
  if (!mcDry_() && typeof vxEdQueue_ === 'function' && (r['نتیجهٔ بازبینی'] === MC_VERDICT.b || r['نتیجهٔ بازبینی'] === MC_VERDICT.c)) { vxEdQueue_(code); return; }
  mcEditorCard_(r, null, chat);
}

/** نتیجه را در شیت «بازبینی بالینی مجلهٔ تجربه» هم می‌نویسد (ردیف با همان کد R- و نام بازبین). کلیدها: MC_RS_COLS */
function mcReviewSheetSet_(r, patch) {
  if (mcDry_() || !r || !r['ارجاع']) return;
  try {
    var sh = SpreadsheetApp.openById(MC_REVIEW_SHEET).getSheets()[0];
    var v = sh.getDataRange().getDisplayValues();
    var H = v[0], cc = mcRsCol_(H, 'code'), cn = mcRsCol_(H, 'name');
    for (var i = 1; i < v.length; i++) {
      if (v[i][cc] !== r['ارجاع'] || mcNorm_(v[i][cn]) !== mcNorm_(r['نام'])) continue;
      Object.keys(patch).forEach(function (k) { var j = mcRsCol_(H, k); if (j >= 0 && patch[k] != null) sh.getRange(i + 1, j + 1).setValue(patch[k]); });
      return;
    }
  } catch (e) { mcLogErr_('reviewSheet', e); }
}

/* ================= سردبیر ================= */

function mcEditorsSay_(text, rows) { mcEditors_().forEach(function (e) { mcSay_(e, text, rows); }); }

function mcEditorCard_(r, voiceMsgId, fromChat) {
  var eds = mcEditors_();
  if (!eds.length) { mcLogErr_('editor', 'no editor connected'); return; }
  var head = { 'بازبینی': '🔬 بازبینی علمی', 'صدا': '🎙 صدای نویسنده', 'افزوده': '✍️ افزوده به متن' }[r['نوع']] || r['نوع'];
  var lines = [head + ' · <code>' + r['کد'] + '</code>',
    '«' + mcEsc_(mcShort_(r['عنوان مطلب'], 80)) + '»',
    'از: ' + mcEsc_(r['نام']) + (r['نقش'] ? ' (' + r['نقش'] + ')' : '')];
  if (r['نوع'] === MC_T.REV) {
    lines.push('نتیجه: <b>' + mcEsc_(r['نتیجهٔ بازبینی']) + '</b>');
    lines.push('نام روی صفحه: ' + (r['نام روی صفحه'] || 'نه') + (r['کد نظام'] ? ' · کد نظام ' + r['کد نظام'] : ''));
    if (r['متن']) lines.push('\n' + mcEsc_(mcShort_(r['متن'], 2500)));
    if (r['گوگل‌داک']) lines.push('\nسند: ' + r['گوگل‌داک']);
  } else if (r['نوع'] === MC_T.NOTE) {
    lines.push(mcEsc_(r['نوع افزوده']) + ' · زیر بخش: ' + mcEsc_(r['تیتر'] || 'آخر مطلب'));
    lines.push('\n' + mcEsc_(mcShort_(r['متن'], 2500)));
    lines.push('\n<i>اگر متن ویرایش لازم دارد، ستون «متن» همین کد را در تب «مشارکت مجله» درست کنید و بعد تأیید بزنید.</i>');
  }
  var c = r['کد'];
  var okText = r['نوع'] === MC_T.REV ? (r['نام روی صفحه'] === 'بله' ? '✅ تأیید و انتشار نام بازبین' : '✅ تأیید (بی‌نام)') : '✅ تأیید و انتشار';
  var rows = [[mcB_(okText, 'mc:ea:' + c)], [mcB_('↩️ برگشت با توضیح', 'mc:er:' + c), mcB_('🗑 کنار بگذار', 'mc:ex:' + c)]];
  eds.forEach(function (e) {
    if (voiceMsgId) mcTg_('copyMessage', { chat_id: e, from_chat_id: fromChat, message_id: voiceMsgId });
    mcSay_(e, lines.join('\n'), rows);
  });
}

function mcEditorGuard_(chat, code) {
  if (!mcIsEditor_(chat)) { mcSay_(chat, 'این کار فقط از دست سردبیر برمی‌آید.'); return null; }
  var r = mcGet_(code);
  if (!r) { mcSay_(chat, 'این مورد پیدا نشد.'); return null; }
  if (r['وضعیت'] !== MC_ST.SENT) { mcSay_(chat, 'این مورد قبلاً رسیدگی شده است: ' + r['وضعیت']); return null; }
  return r;
}

function mcEditorApprove_(chat, code) {
  var r = mcEditorGuard_(chat, code);
  if (!r) return;
  var pub = !(r['نوع'] === MC_T.REV && r['نام روی صفحه'] !== 'بله');
  if (r['نوع'] === MC_T.VOICE) mcShareForSite_(r['فایل درایو']);
  mcSet_(code, { 'وضعیت': pub ? MC_ST.PUB : MC_ST.OKN, 'تاریخ تصمیم': mcToday_() });
  mcSiteSync_();
  var p = mcPost_(r['شناسهٔ مطلب']);
  var link = p ? p.link : '';
  /* v166: صدا با متن و mp3 تمیز مستقیم روی صفحه می‌رود */
  var vxPub = null;
  if (r['نوع'] === MC_T.VOICE && !mcDry_() && typeof vxMagPublish_ === 'function') { try { vxPub = vxMagPublish_(mcGet_(code)); } catch (eVx) { mcLogErr_('vxpub', eVx); } }
  var vxOk = vxPub && vxPub.ok && vxPub.audio;
  mcEditorsSay_('✅ ' + code + ' تأیید شد' + (r['نوع'] === MC_T.VOICE ? (vxOk ? '. صدا و متن روی صفحه رفت:\n' + link : (vxPub && vxPub.ok ? '. متن روی صفحه رفت؛ صدا با اولین باز شدن پیشخوان وردپرس خودکار تبدیل و کنار متن منتشر می‌شود.' : '. صدا بعد از تبدیل در «ابزارها › صداهای مجله» روی صفحه می‌آید.')) : (pub ? ' و روی صفحه رفت.' : '.')));
  var msg = {
    'بازبینی': pub ? '🌿 بازبینی شما تأیید شد و نامتان به‌عنوان بازبین علمی روی مقاله آمد:\n' + link + '\n\nممنون که دقت و دانشتان را برای مجله گذاشتید.' : '🌿 بازبینی شما تأیید شد. ممنون که دقت و دانشتان را برای مجله گذاشتید.',
    'صدا': '🌿 صدای شما تأیید شد. نسخهٔ نویزگیری‌شده به‌زودی روی صفحهٔ مطلب می‌آید:\n' + link,
    'افزوده': '🌿 نوشتهٔ شما تأیید شد و با نامتان روی مطلب آمد:\n' + link + (r['کد'] ? '#' + r['کد'].toLowerCase() : '')
  }[r['نوع']];
  if (msg) mcSay_(r['chat_id'], msg);
  /* v169: امتیاز (review.gs): بازبینی بدون اصلاح ۱، ایده یا ویس استفاده‌شده ۱ */
  try { if (typeof rvPoint_ === 'function') { if (r['نوع'] === MC_T.REV) rvPoint_(r['نام'], RV_PTS.REVOK, code); else if (r['نوع'] === MC_T.VOICE || r['نوع'] === MC_T.NOTE) rvPoint_(r['نام'], RV_PTS.IDEA, code); } } catch (ePt) { mcLogErr_('points', ePt); }
  if (r['نوع'] === MC_T.REV) mcReviewSheetSet_(r, { answered: mcToday_() });
  if (r['نوع'] === MC_T.NOTE && r['دعوت‌کننده'] && r['دعوت‌کننده'] !== r['chat_id']) {
    mcSay_(r['دعوت‌کننده'], '🌿 مشارکتی که دعوتش کرده بودید روی «' + mcEsc_(mcShort_(r['عنوان مطلب'], 60)) + '» منتشر شد:\n' + link);
  }
}

function mcEditorBackAsk_(chat, code) {
  var r = mcEditorGuard_(chat, code);
  if (!r) return;
  mcState_(chat, { s: 'back', c: code });
  mcSay_(chat, 'توضیح کوتاهی بنویسید که برای ' + mcEsc_(r['نام']) + ' فرستاده شود.', [[mcB_('انصراف', 'mc:x')]]);
}

function mcBackIn_(chat, st, text) {
  var r = mcEditorGuard_(chat, st.c);
  mcState_(chat, null);
  if (!r) return true;
  if (!text || text.length < 5) { mcSay_(chat, 'توضیح خیلی کوتاه است.'); return true; }
  mcSet_(st.c, { 'وضعیت': MC_ST.BACK, 'یادداشت سردبیر': text, 'تاریخ تصمیم': mcToday_() });
  var again = r['نوع'] === MC_T.VOICE ? [[mcB_('🎙 فرستادن صدای تازه', 'mc:v:' + r['شناسهٔ مطلب'])]]
    : (r['نوع'] === MC_T.NOTE ? [[mcB_('✍️ نوشتن دوباره', 'mc:n:' + r['شناسهٔ مطلب'] + ':' + (r['توکن دعوت'] || ''))]]
      : [[mcB_('✏️ فرستادن اصلاحات', 'mc:rv:' + st.c + ':b')]]);
  if (r['نوع'] === MC_T.REV) mcSet_(st.c, { 'وضعیت': MC_ST.DRAFT, 'متن': '' });
  if (r['نوع'] === MC_T.NOTE && r['توکن دعوت']) { var inv = mcInviteRow_(r['توکن دعوت']); if (inv) mcSet_(inv['کد'], { 'وضعیت': MC_ST.DRAFT }); }
  mcSay_(r['chat_id'], '💬 یادداشت سردبیر دربارهٔ «' + mcEsc_(mcShort_(r['عنوان مطلب'], 60)) + '»:\n\n' + mcEsc_(text), again);
  mcSay_(chat, 'فرستاده شد.');
  return true;
}

function mcEditorDrop_(chat, code) {
  var r = mcEditorGuard_(chat, code);
  if (!r) return;
  mcSet_(code, { 'وضعیت': MC_ST.DROP, 'تاریخ تصمیم': mcToday_() });
  mcSay_(chat, code + ' کنار گذاشته شد. به فرستنده پیامی نرفت؛ اگر لازم است، «برگشت با توضیح» بهتر است.');
}

function mcShareForSite_(ids) {
  if (mcDry_()) return;
  String(ids || '').split(/\s+/).filter(String).forEach(function (id) {
    try { DriveApp.getFileById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { mcLogErr_('share', e); }
  });
}

function mcSiteSync_() {
  if (mcDry_()) { mcOut_({ mc: 1, method: 'siteSync' }); return; }
  try { CacheService.getScriptCache().remove('mcapi'); UrlFetchApp.fetch(MC_SITE + '/wp-json/tj/v1/mag-sync', { muteHttpExceptions: true }); } catch (e) { mcLogErr_('sync', e); }
}

/* ================= API عمومی برای سایت ================= */

function mcApiItems_() {
  var out = [];
  mcRowsAll_().forEach(function (r) {
    if (r['وضعیت'] !== MC_ST.PUB) return;
    var pid = +r['شناسهٔ مطلب'];
    if (!pid) return;
    var base = { code: r['کد'], post: pid, name: r['نام'], url: r['صفحهٔ فرد'], job: r['سمت'], date: mcIso_(r['تاریخ تصمیم']) || mcIso_(r['تاریخ ثبت']) };
    if (r['نوع'] === MC_T.REV) { if (r['نام روی صفحه'] !== 'بله') return; base.t = 'r'; base.nz = r['کد نظام']; }
    else if (r['نوع'] === MC_T.VOICE) { base.t = 'v'; base.src = String(r['فایل درایو']).split(/\s+/)[0]; }
    else if (r['نوع'] === MC_T.NOTE) { base.t = 'n'; base.kind = r['نوع افزوده']; base.ht = r['تیتر']; base.text = r['متن']; }
    else return;
    out.push(base);
  });
  return out;
}

/** از tgApiRoute_ (api=magcontrib، عمومی). کش ۱۰ دقیقه؛ بعد از هر تأیید پاک می‌شود. */
function mcApiData_() {
  if (mcDry_()) return { ok: true, items: mcApiItems_() };
  var c = CacheService.getScriptCache(), s = c.get('mcapi');
  if (s) { try { return JSON.parse(s); } catch (e) {} }
  var out = { ok: true, items: mcApiItems_() };
  try { c.put('mcapi', JSON.stringify(out), 600); } catch (e2) {}
  return out;
}

/* ================= راه‌اندازی و نگهداری ================= */

function mcSetup() {
  var sh = mcSheet_();
  var H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (H.join('|') !== MC_HEAD.join('|')) sh.getRange(1, 1, 1, MC_HEAD.length).setValues([MC_HEAD]).setFontWeight('bold').setBackground('#f6f1e7');
  sh.setFrozenRows(1);
  ['تاریخ ثبت', 'تاریخ تصمیم', 'انقضا', 'کد نظام', 'chat_id', 'شناسهٔ مطلب', 'نگه‌دارندهٔ دعوت', 'دعوت‌کننده'].forEach(function (h) { sh.getRange(2, MC_HEAD.indexOf(h) + 1, 998, 1).setNumberFormat('@'); });
  var st = Object.keys(MC_ST).map(function (k) { return MC_ST[k]; });
  sh.getRange(2, MC_HEAD.indexOf('وضعیت') + 1, 999, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(st, true).setAllowInvalid(false).build());
  return 'ok ' + MC_TAB;
}

/** یادآوری ملایم: بازبینی‌ای که ۷ روز «دعوت شد» مانده، یک بار. از watchdog روزانه صدا زده می‌شود. */
function mcTick_() {
  var today = mcToday_();
  if (!mcDry_()) {
    var P = PropertiesService.getScriptProperties();
    var h = Number(Utilities.formatDate(new Date(), 'Asia/Tehran', 'H'));
    if (P.getProperty('MC_TICK_DAY') === today || h < 10 || h > 18) return;
    P.setProperty('MC_TICK_DAY', today);
  }
  mcRowsAll_().forEach(function (r) {
    if (r['نوع'] !== MC_T.REV || r['وضعیت'] !== MC_ST.INV || r['یادداشت سردبیر'].indexOf('یادآوری') >= 0) return;
    var d = mcIso_(r['تاریخ ثبت']);
    if (!d || (new Date(today) - new Date(d)) / 864e5 < 7) return;
    mcSay_(r['chat_id'], 'یادآوری کوچک دربارهٔ بازبینی «' + mcEsc_(mcShort_(r['عنوان مطلب'], 60)) + '». اگر فرصتش نیست، «فرصت ندارم» هم پاسخ خوبی است 🙏', [[mcB_('باز کردن بازبینی', 'mc:ro:' + r['کد'])]]);
    mcSet_(r['کد'], { 'یادداشت سردبیر': (r['یادداشت سردبیر'] ? r['یادداشت سردبیر'] + ' · ' : '') + 'یادآوری ' + today });
  });
  /* نویسندهٔ تازه‌وصل (یا کسی که دیروز به سقف اعلان خورد) یک بار خبر می‌گیرد */
  if (!mcDry_()) { try { mcAnnounceAuthors(true); } catch (eA) { mcLogErr_('announce', eA); } }
}

/** نویسنده‌های مجله که به بات وصل‌اند: [{name, chat, posts}] */
function mcConnectedAuthors_() {
  var people = mcPeopleByName_(), seen = {}, out = [];
  mcIndex_().forEach(function (p) {
    mcAuthors_(p.author).forEach(function (k) {
      var who = people[k];
      if (!who || !who.chat) return;
      if (!seen[k]) { seen[k] = { chat: who.chat, posts: 0, key: k }; out.push(seen[k]); }
      seen[k].posts++;
    });
  });
  return out;
}

var MC_T_AUTHORS = '🎙 <b>مطالب شما در مجلهٔ تجربه حالا زنده‌تر می‌شوند</b>\n\n' +
  'از این به بعد می‌توانید از همین بات روی مطلب‌هایی که در مجله نوشته‌اید:\n' +
  '• صدای خودتان را بگذارید (خواندن متن یا چند دقیقه دربارهٔ آن)،\n' +
  '• نکته، مثال یا تجربه‌ای به متن اضافه کنید،\n' +
  '• و از همکاری دعوت کنید که در مطلبتان مشارکت کند.\n\n' +
  'همه‌چیز با تأیید سردبیر روی صفحهٔ مطلب منتشر می‌شود و نامتان کنارش می‌آید.';

/** اعلام یک‌باره به نویسنده‌های وصل. بی‌آرگومان فقط فهرست را برمی‌گرداند؛ با true می‌فرستد (هر نفر یک بار). */
function mcAnnounceAuthors(send) {
  var list = mcConnectedAuthors_(), P = mcDry_() ? null : PropertiesService.getScriptProperties(), done = [];
  list.forEach(function (a) {
    if (!send) { done.push(a.key + ' ' + a.chat + ' (' + a.posts + ')'); return; }
    if (P && P.getProperty('mcann' + a.chat)) return;
    var r = tgNotify_(a.chat, TG_NK.invite, MC_T_AUTHORS, { ref: 'mag-contrib', markup: { inline_keyboard: [[mcB_(MC_BTN, 'mc:my')]] } });
    if (r === 'رفت' || r === 'صف') { if (P) P.setProperty('mcann' + a.chat, mcToday_()); done.push(a.key + ' ' + r); }
    if (!mcDry_()) Utilities.sleep(300);
  });
  console.log((send ? 'فرستاده شد: ' : 'فهرست: ') + done.length + '\n' + done.join('\n'));
  return done;
}

/* ================= تست (در TG_SUITES با نام «مشارکت مجله») ================= */

function mcTests() {
  var res = [], ok = 0, bad = 0;
  function t(name, cond, info) { if (cond) ok++; else { bad++; res.push('✗ ' + name + (info ? ' :: ' + String(info).slice(0, 200) : '')); } }
  var keepDry = TG_DRY, keepMem = TG_MEM, keepBox = TG_OUTBOX;
  TG_DRY = true; TG_MEM = { policy: {}, capdry: {}, quiet: false, notify: [] }; TG_OUTBOX = [];
  try {
  var A = '9001', E = '9002', R = '9003', G = '9004';
  MC_DRY_ROWS = [];
  MC_DRY_EDITORS = [E];
  MC_DRY_PERSON = {};
  MC_DRY_PERSON[A] = { name: 'آرمان دانش‌پژوه', url: 'https://tajrobeh.life/team/arman-daneshpajouh/', job: 'روان‌درمانگر', nz: '' };
  MC_DRY_PERSON[E] = { name: 'مدیری آرانمونه', url: '', job: 'سردبیر', nz: '70828' };
  MC_DRY_PERSON[R] = { name: 'مینا ساحلی‌زاده', url: 'https://tajrobeh.life/team/mina/', job: 'روان‌درمانگر', nz: '' };
  MC_DRY_INDEX = [
    { id: 73, title: 'انتقال و انتقال متقابل', link: 'https://tajrobeh.life/mag/transference/', author: 'آرمان دانش‌پژوه', h: ['تعریف', 'انواع انتقال', 'جمع‌بندی'] },
    { id: 27, title: 'سمپتوم', link: 'https://tajrobeh.life/mag/symptom/', author: 'تحریریهٔ تجربه', h: ['سمپتوم چیست'] },
    { id: 88, title: 'مطلب مشترک', link: 'https://tajrobeh.life/mag/joint/', author: 'نعیمه رضوان‌پور و آرمان دانش‌پژوه', h: ['یک'] }
  ];
  var out = function () { return TG_OUTBOX.filter(function (x) { return x.kind === 'msg' || x.mc; }); };
  var last = function (chat) { var o = out().filter(function (x) { return x.chat === String(chat) && x.kind === 'msg'; }); return o.length ? o[o.length - 1] : { text: '', markup: null }; };
  var kbHas = function (ev, data) { return JSON.stringify(ev.markup || {}).indexOf(data) >= 0; };
  var msg = function (chat, text, extra) { var m = { message_id: 5, text: text }; if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; }); return mcHandleMsg_(chat, m); };
  var cb = function (chat, data) { return mcOnCb_(chat, data, {}); };
  var n0 = TG_OUTBOX.length;

  // مطالب من
  t('دکمهٔ منو گرفته می‌شود', msg(A, MC_BTN) === true);
  t('فهرست مطلب نویسنده', kbHas(last(A), 'mc:p:73') && !kbHas(last(A), 'mc:p:27'), last(A).text);
  t('مطلب مشترک هم در فهرست است', kbHas(last(A), 'mc:p:88'));
  t('پیام بی‌ربط بدون حالت رد می‌شود', msg(A, 'سلام') === false);
  cb(A, 'mc:p:73');
  t('منوی مطلب سه کار دارد', kbHas(last(A), 'mc:v:73') && kbHas(last(A), 'mc:n:73') && kbHas(last(A), 'mc:i:73'));
  cb(A, 'mc:p:27');
  t('مطلب دیگران بسته است', last(A).text.indexOf('در فهرست شما نیست') >= 0);

  // صدا
  cb(A, 'mc:v:73');
  t('حالت صدا', mcState_(A) && mcState_(A).s === 'voice');
  msg(A, 'متن');
  t('متن به‌جای ویس رد می‌شود', last(A).text.indexOf('منتظر یک ویس') >= 0);
  msg(A, '', { voice: { file_id: 'F1', duration: 5, mime_type: 'audio/ogg' } });
  t('ویس کوتاه رد می‌شود', last(A).text.indexOf('کوتاه') >= 0);
  msg(A, '', { voice: { file_id: 'F2', duration: 95, mime_type: 'audio/ogg' } });
  var v = MC_DRY_ROWS.filter(function (r) { return r['نوع'] === MC_T.VOICE; })[0];
  t('سطر صدا ساخته شد', v && v['وضعیت'] === MC_ST.SENT && v['شناسهٔ مطلب'] === '73' && v['فایل درایو'], JSON.stringify(v));
  t('کد C-2001', v && v['کد'] === 'C-2001');
  t('حالت پاک شد', !mcState_(A));
  t('ویس برای سردبیر کپی شد', out().some(function (x) { return x.method === 'copyMessage' && x.chat === E; }));
  t('کارت سردبیر دکمهٔ تأیید دارد', kbHas(last(E), 'mc:ea:C-2001'));
  cb(A, 'mc:ea:C-2001');
  t('غیرسردبیر نمی‌تواند تأیید کند', last(A).text.indexOf('سردبیر') >= 0 && mcGet_('C-2001')['وضعیت'] === MC_ST.SENT);
  cb(E, 'mc:ea:C-2001');
  t('تأیید صدا', mcGet_('C-2001')['وضعیت'] === MC_ST.PUB);
  t('سایت همگام شد', out().some(function (x) { return x.method === 'siteSync'; }));
  t('به نویسنده خبر رسید', last(A).text.indexOf('تأیید شد') >= 0);
  cb(E, 'mc:ea:C-2001');
  t('تأیید دوباره بی‌اثر', last(E).text.indexOf('قبلاً رسیدگی') >= 0);

  // افزوده به متن توسط نویسنده
  cb(A, 'mc:n:73');
  t('انواع افزوده', kbHas(last(A), 'mc:k:73:bal:'));
  cb(A, 'mc:k:73:bal:');
  t('انتخاب تیتر', kbHas(last(A), 'mc:h:73:bal:1:') && kbHas(last(A), 'mc:h:73:bal:e:'));
  cb(A, 'mc:h:73:bal:1:');
  t('حالت نوشتن', mcState_(A).s === 'note' && mcState_(A).ht === 'انواع انتقال');
  msg(A, 'کوتاه');
  t('متن کوتاه رد', last(A).text.indexOf('بیشتر بنویسید') >= 0);
  msg(A, 'در کار با انتقال، مهم است که درمانگر پیش از تفسیر، اول ببیند این احساس در رابطهٔ درمانی چه کاری انجام می‌دهد.');
  var nt = mcGet_('C-2002');
  t('سطر افزوده', nt && nt['نوع'] === MC_T.NOTE && nt['تیتر'] === 'انواع انتقال' && nt['نوع افزوده'] === MC_KINDS.bal);

  // برگشت با توضیح
  cb(E, 'mc:er:C-2002');
  msg(E, 'لطفاً یک مثال کوتاه هم اضافه کنید.');
  t('برگشت ثبت شد', mcGet_('C-2002')['وضعیت'] === MC_ST.BACK && last(A).text.indexOf('یک مثال کوتاه') >= 0);
  t('دکمهٔ نوشتن دوباره', kbHas(last(A), 'mc:n:73:'));

  // دعوت مهمان
  cb(A, 'mc:i:73');
  var inv = MC_DRY_ROWS.filter(function (r) { return r['نوع'] === MC_T.INV; })[0];
  t('دعوت ساخته شد', inv && inv['وضعیت'] === MC_ST.OPEN && inv['توکن دعوت'].length === 10);
  t('لینک دعوت', last(A).text.indexOf('?start=co-' + inv['توکن دعوت']) >= 0);
  t('start co- گرفته می‌شود', mcStart_(G, 'co-' + inv['توکن دعوت'], { first_name: 'سارا' }) === true);
  t('از مهمان نام پرسیده شد', mcState_(G) && mcState_(G).s === 'gname');
  t('دعوت در دست مهمان', mcInviteRow_(inv['توکن دعوت'])['وضعیت'] === MC_ST.DRAFT);
  t('مهمان دوم نمی‌تواند', (mcStart_('9005', 'co-' + inv['توکن دعوت']), last('9005').text.indexOf('باز نیست') >= 0));
  msg(G, 'سارا رحیم‌پور، روان‌درمانگر');
  t('نام مهمان ثبت', mcPerson_(G) && mcPerson_(G).name === 'سارا رحیم‌پور' && mcPerson_(G).job === 'روان‌درمانگر');
  var tok = inv['توکن دعوت'];
  t('مهمان نوع را می‌بیند', kbHas(last(G), 'mc:k:73:ex:' + tok));
  cb(G, 'mc:k:73:ex:' + tok);
  cb(G, 'mc:h:73:ex:e:' + tok);
  msg(G, '', { voice: { file_id: 'F9', duration: 40, mime_type: 'audio/ogg' } });
  var gn = MC_DRY_ROWS.filter(function (r) { return r['نوع'] === MC_T.NOTE && r['نقش'] === 'مهمان'; })[0];
  t('افزودهٔ مهمان از ویس', gn && gn['متن'].indexOf('ترانویسی') >= 0 && gn['تیتر'] === '' && gn['نام'] === 'سارا رحیم‌پور', JSON.stringify(gn));
  t('دعوت استفاده شد', mcInviteRow_(tok)['وضعیت'] === MC_ST.USED);
  t('دعوت‌کننده خبردار شد', out().some(function (x) { return x.chat === A && x.text.indexOf('همکاری که دعوتش کرده بودید') >= 0; }));
  t('عدد فارسی در دعوت', out().some(function (x) { return String(x.text || '').indexOf('۱۴ روز') >= 0; }));
  t('لینک مصرف‌شده بسته است', (mcStart_(G, 'co-' + tok), last(G).text.indexOf('باز نیست') >= 0));
  cb(E, 'mc:ea:' + gn['کد']);
  t('افزودهٔ مهمان منتشر شد', mcGet_(gn['کد'])['وضعیت'] === MC_ST.PUB);
  t('دعوت‌کننده خبر انتشار گرفت', last(A).text.indexOf('منتشر شد') >= 0);

  // دعوت منقضی
  var old = mcAdd_({ 'نوع': MC_T.INV, 'شناسهٔ مطلب': '73', 'وضعیت': MC_ST.OPEN, 'توکن دعوت': 'oldtoken01', 'انقضا': '2020-01-01', 'دعوت‌کننده': A });
  mcStart_('9006', 'co-oldtoken01');
  t('دعوت منقضی', last('9006').text.indexOf('باز نیست') >= 0 && mcGet_(old['کد'])['وضعیت'] === MC_ST.EXP);

  // بازبینی
  var rv = mcAdd_({ 'نوع': MC_T.REV, 'شناسهٔ مطلب': '73', 'عنوان مطلب': 'انتقال و انتقال متقابل', 'نام': 'مینا ساحلی‌زاده', 'chat_id': R, 'نقش': 'بازبین', 'وضعیت': MC_ST.NEW, 'ارجاع': 'R-103', 'چه چیزی ببینید': 'تعریف انتقال متقابل', 'صفحهٔ فرد': 'https://tajrobeh.life/team/mina/' });
  var sent = mcSendReviews();
  t('کارت بازبینی رفت', sent.length === 1 && mcGet_(rv['کد'])['وضعیت'] === MC_ST.INV && kbHas(last(R), 'mc:rv:' + rv['کد'] + ':a') && kbHas(last(R), 'mc:doc:' + rv['کد']));
  t('متن کارت نام کوچک ندارد', last(R).text.indexOf('مینا') < 0);
  t('کارت چه چیزی ببینید دارد', last(R).text.indexOf('تعریف انتقال متقابل') >= 0);
  cb(R, 'mc:rv:' + rv['کد'] + ':b');
  t('حالت اصلاحات', mcState_(R).s === 'fix');
  cb(R, 'mc:fx:' + rv['کد']);
  t('بی‌اصلاح نمی‌شود تمام کرد', last(R).text.indexOf('هنوز اصلاحی نرسیده') >= 0);
  msg(R, 'در بخش دوم بهتر است بین انتقال مثبت و منفی تمایز روشن‌تری گذاشته شود.');
  msg(R, '', { voice: { file_id: 'F7', duration: 30 } });
  t('متن و ویس جمع شد', mcGet_(rv['کد'])['متن'].split('\n').length === 2);
  cb(R, 'mc:fx:' + rv['کد']);
  t('پرسش نام', kbHas(last(R), 'mc:nm:' + rv['کد'] + ':y'));
  cb(R, 'mc:nm:' + rv['کد'] + ':y');
  t('پرسش کد نظام', mcState_(R).s === 'nz');
  msg(R, 'کد من ۱۲۳۴۵ است');
  var rr = mcGet_(rv['کد']);
  t('کد نظام ارقام فارسی', rr['کد نظام'] === '12345', rr['کد نظام']);
  t('منتظر سردبیر', rr['وضعیت'] === MC_ST.SENT && rr['نام روی صفحه'] === 'بله');
  t('کارت سردبیر نتیجه دارد', last(E).text.indexOf(MC_VERDICT.b) >= 0 && kbHas(last(E), 'mc:ea:' + rv['کد']));
  cb(R, 'mc:rv:' + rv['کد'] + ':a');
  t('بعد از ارسال قفل است', last(R).text.indexOf('منتظر سردبیر') >= 0);
  cb(E, 'mc:ea:' + rv['کد']);
  t('بازبینی منتشر شد', mcGet_(rv['کد'])['وضعیت'] === MC_ST.PUB && last(R).text.indexOf('بازبین علمی') >= 0);

  // بازبینی بی‌نام و فرصت ندارم
  var rv2 = mcAdd_({ 'نوع': MC_T.REV, 'شناسهٔ مطلب': '27', 'نام': 'x', 'chat_id': R, 'وضعیت': MC_ST.INV });
  cb(R, 'mc:rv:' + rv2['کد'] + ':a');
  cb(R, 'mc:nm:' + rv2['کد'] + ':n');
  cb(E, 'mc:ea:' + rv2['کد']);
  t('بی‌نام تأیید شد ولی عمومی نیست', mcGet_(rv2['کد'])['وضعیت'] === MC_ST.OKN);
  var rv3 = mcAdd_({ 'نوع': MC_T.REV, 'شناسهٔ مطلب': '27', 'نام': 'y', 'chat_id': R, 'وضعیت': MC_ST.INV });
  cb(R, 'mc:rv:' + rv3['کد'] + ':x');
  t('فرصت ندارم', mcGet_(rv3['کد'])['وضعیت'] === MC_ST.NO && last(E).text.indexOf('فرصت ندارد') >= 0);
  cb('9999', 'mc:rv:' + rv3['کد'] + ':a');
  t('بازبینی دیگری را نمی‌شود زد', last('9999').text.indexOf('پیدا نشد') >= 0);

  // گوگل‌داک در حالت خشک (جیمیل خواسته می‌شود)
  var rv4 = mcAdd_({ 'نوع': MC_T.REV, 'شناسهٔ مطلب': '73', 'نام': 'z', 'chat_id': R, 'وضعیت': MC_ST.INV });
  cb(R, 'mc:doc:' + rv4['کد']);
  t('جیمیل پرسیده شد', mcState_(R).s === 'gmail');
  msg(R, 'not-an-email');
  t('ایمیل نادرست رد', last(R).text.indexOf('درست به نظر نمی‌رسد') >= 0);
  msg(R, 'Someone@Example.com');  // pii:ok ساختگی
  t('سند ساخته شد', mcGet_(rv4['کد'])['گوگل‌داک'].indexOf('docs.google.com') >= 0 && kbHas(last(R), 'mc:dd:' + rv4['کد']));
  cb(R, 'mc:dd:' + rv4['کد']);
  t('نتیجه بعد از سند', kbHas(last(R), 'mc:rd:' + rv4['کد'] + ':b'));
  cb(R, 'mc:rd:' + rv4['کد'] + ':c');
  t('نتیجهٔ سند ثبت و پرسش نام', mcGet_(rv4['کد'])['نتیجهٔ بازبینی'] === MC_VERDICT.c && kbHas(last(R), 'mc:nm:' + rv4['کد']));

  // API سایت
  var items = mcApiItems_();
  var byT = function (k) { return items.filter(function (i) { return i.t === k; }); };
  t('API: یک صدا', byT('v').length === 1 && byT('v')[0].src && byT('v')[0].post === 73);
  t('API: یک افزوده (برگشتی نمی‌آید)', byT('n').length === 1 && byT('n')[0].name === 'سارا رحیم‌پور' && byT('n')[0].ht === '');
  t('API: فقط بازبین با نام', byT('r').length === 1 && byT('r')[0].nz === '12345' && byT('r')[0].url.indexOf('tajrobeh.life') >= 0);
  t('API: کد C-', items.every(function (i) { return /^C-\d+$/.test(i.code); }));

  // ورود از tgPrivate_ و وارد کردن شیت بازبینی
  t('mcRoute_ کد شروع دعوت', mcRoute_('9007', { text: '/start co-nonexist1', from: {} }) === true && last('9007').text.indexOf('باز نیست') >= 0);
  t('mcRoute_ پیام بی‌ربط', mcRoute_('9007', { text: 'سلام', from: {} }) === false);
  MC_DRY_REVIEWS = [['کد', 'مقاله', 'لینک مقاله', 'بازبین', 'رویکرد بازبین', 'بیشتر چه چیزی را ببینید'],
    ['R-101', 'انتقال', 'https://tajrobeh.life/mag/transference', 'آرمان دانش‌پژوه', '', 'بخش دوم'],
    ['R-102', 'سمپتوم', 'https://tajrobeh.life/mag/symptom/', 'ناشناس نو', '', 'همه']];
  MC_DRY_PEOPLE = {}; MC_DRY_PEOPLE[mcNorm_('آرمان دانش‌پژوه')] = { chat: '9001', url: '', job: '' };
  var im = mcImportReviews();
  t('وارد کردن بازبینی‌ها', im.length === 2 && im[1].indexOf('chat_id ندارد') >= 0 && im[0].indexOf('مطلب پیدا نشد') < 0, im.join(' | '));
  t('وارد کردن دوباره تکرار نمی‌سازد', mcImportReviews().length === 0);
  var sent2 = mcSendReviews();
  t('فقط بازبین وصل کارت می‌گیرد', sent2.length === 1 && TG_MEM.notify.some(function (n) { return n.chat === '9001' && n.kind === TG_NK.invite; }));
  t('API سایت', mcApiData_().ok === true && mcApiData_().items.length === 3);
  var ca = mcConnectedAuthors_();
  t('نویسنده‌های وصل (مشترک هم شمرده می‌شود)', ca.length === 1 && ca[0].chat === '9001' && ca[0].posts === 2, JSON.stringify(ca));
  TG_MEM.capdry = {};
  t('اعلام به نویسنده دکمهٔ مطالب من دارد', mcAnnounceAuthors(true).length === 1 && kbHas(last(A), 'mc:my'));
  t('پیام‌ها خط تیرهٔ وسط جمله ندارند', out().every(function (x) { return String(x.text || '').indexOf(' — ') < 0; }));

  // لغو و پاک‌کردن حالت
  cb(A, 'mc:v:73');
  msg(A, 'لغو');
  t('لغو حالت', !mcState_(A));
  t('کال‌بک ناشناخته', cb(A, 'mc:zz') === false);
  t('start ناشناخته', mcStart_(A, 'gt-rel') === false);

  } catch (eT) { t('اجرای بی‌خطا: ' + eT + ' ' + (eT && eT.stack ? String(eT.stack).slice(0, 300) : ''), false); }
  MC_DRY_ROWS = null; MC_DRY_INDEX = null; MC_DRY_PERSON = null; MC_DRY_EDITORS = null; MC_DRY_PEOPLE = null; MC_DRY_REVIEWS = null;
  TG_DRY = keepDry; TG_MEM = keepMem; TG_OUTBOX = keepBox;
  return { pass: ok, fail: bad, text: res.join('\n') };
}
