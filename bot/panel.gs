/**
 * panel.gs · v170.98 · ۲ آبان ۱۴۰۵ · ورود یک‌بارمصرف به پنل پل و دعوت موج درمانگران (INBOX E22، E24)
 *
 * ۱) لینک ورود: https://bridge.tajrobeh.life/auth/telegram/handoff#t=<payload>.<signature>
 *    payload = base64url(JSON {tid, ph?, iat, exp, jti})، بی پرکننده؛ exp حداکثر ۱۸۰ ثانیه بعد از iat (ثانیهٔ یونیکس)؛
 *    jti شانزده بایت تصادفی؛ signature = base64url(HMAC-SHA256(payload، رمز مشترک)).
 *    رمز فقط در Script Property «TG_BRIDGE_HANDOFF_SECRET». توکن هرگز در لاگ، شیت یا پیام خطا نمی‌آید.
 *    لینک کوتاه‌عمر است، پس دکمه‌ها لینک ثابت ندارند: «ورود به پنل» (pnl:go) هر بار لینک تازه می‌سازد.
 *    ph فقط از شمارهٔ دکمهٔ اشتراک تماس تلگرام است؛ این بات آن را جدا نگه نمی‌دارد، پس فعلاً فرستاده نمی‌شود.
 * ۲) «/panel» (و /start panel) برای هر درمانگر یا عضو وصل‌شده. کس دیگری لینک نمی‌گیرد.
 * ۳) موج دعوت (v170.99، E28 و E30): دعوت اصلی و پیامک از خود پل می‌رود. ردیف تب «دعوت موج‌ها» هاب تجربه را لین A یا پل
 *    می‌گذارد (موج، تاریخ، کد درمانگر). ساعت ۱۰ تهرانِ همان تاریخ یک کارت با دکمهٔ «ارسال موج» در پیام خصوصی مالک می‌آید
 *    (بی فرمان تایپی)؛ با دکمه، پیام تلگرام با دکمهٔ ورود برای درمانگران می‌رود. یادآوری یک بار، ۴۸ ساعت بعد، اگر دکمه
 *    زده نشده. بات پیامک نمی‌فرستد.
 */
var BR_HANDOFF_URL = 'https://bridge.tajrobeh.life/auth/telegram/handoff#t=';
var BR_TTL_S = 180;
var PNL_TAB = 'دعوت موج‌ها';
var PNL_HEAD = ['موج', 'تاریخ', 'کد درمانگر', 'وضعیت', 'ارسال', 'دکمه', 'یادآوری', 'پیامک', 'یادداشت'];
var PNL_REMIND_MS = 48 * 3600000;
var T_PNL_INVITE = 'سلام {نام}. پنل تازهٔ درمانگران تجربه آماده است و جای شما آنجاست. با دکمهٔ زیر وارد شوید.';
var T_PNL_REMIND = 'یادآوری: هنوز وارد پنل تازه نشده‌اید. با دکمهٔ زیر وارد شوید.';
var T_PNL_LINK = '🔐 لینک ورود شما به پنل آماده است. فقط یک بار و تا ۳ دقیقه کار می‌کند؛ اگر دیر شد، دوباره «ورود به پنل» را بزنید.';
var PNL_HOUR = 10;
var T_PNL_NO = 'این بخش برای درمانگران و همکاران وصل‌شده به بات است.';
var T_PNL_OFF = 'ورود به پنل هنوز آماده نیست. کمی بعد دوباره امتحان کنید.';
var PNL_BTN = 'ورود به پنل';

function pnlNow_() { return TG_DRY && TG_MEM['pnl:now'] ? Number(TG_MEM['pnl:now']) : Date.now(); }
function pnlProp_(k) { return TG_DRY ? (TG_MEM['pnlp:' + k] || '') : (PropertiesService.getScriptProperties().getProperty(k) || ''); }
function brB64_(x) { return Utilities.base64EncodeWebSafe(x).replace(/=+$/, ''); }
/* شانزده بایت تصادفی (دو UUID تصادفی، بی خط) */
function brJti_() {
  if (TG_DRY && TG_MEM['br:jti']) return TG_MEM['br:jti'];
  var hex = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 32), b = [];
  for (var i = 0; i < 32; i += 2) { var v = parseInt(hex.substr(i, 2), 16); b.push(v > 127 ? v - 256 : v); }
  return brB64_(b);
}
/** توکن handoff؛ '' اگر رمز نیست. */
function brToken_(tid, ph) {
  var sec = pnlProp_('TG_BRIDGE_HANDOFF_SECRET');
  if (!sec || !tid) return '';
  var iat = Math.floor(pnlNow_() / 1000), p = { tid: Number(tid), iat: iat, exp: iat + BR_TTL_S, jti: brJti_() };
  if (ph) p.ph = ph;
  var payload = brB64_(JSON.stringify(p));
  return payload + '.' + brB64_(Utilities.computeHmacSha256Signature(payload, sec));
}
function brUrl_(tid) { var t = brToken_(tid); return t ? BR_HANDOFF_URL + t : ''; }

/* درمانگر یا عضو فعال وصل‌شده */
function pnlCan_(chat) {
  var t = null; try { t = tgTherByChat_(chat); } catch (e) {}
  if (t) return { name: t.name, code: t.code };
  var p = null; try { p = tgPersonByChat_(chat); } catch (e2) {}
  return p ? { name: p.name || '', code: '' } : null;
}
function pnlKb_() { return { inline_keyboard: [[{ text: '🔐 ' + PNL_BTN, callback_data: 'pnl:go' }]] }; }
/** لینک تازه برای همان چت؛ ستون «دکمه» ردیف موجش را پر می‌کند. */
function pnlSendLink_(chat) {
  var who = pnlCan_(chat);
  if (!who) { tgSend_(chat, T_PNL_NO); return false; }
  var url = brUrl_(chat);
  if (!url) { tgSend_(chat, T_PNL_OFF); tgErr_('pnlSendLink_', 'TG_BRIDGE_HANDOFF_SECRET نیست'); return false; }
  tgSend_(chat, T_PNL_LINK, { inline_keyboard: [[{ text: '🔐 باز کردن پنل', url: url }]] });
  if (who.code) pnlMark_(who.code, 'دکمه');
  return true;
}
function pnlOnCb_(chat, data) {
  if (data.indexOf('pnl:w:') === 0) {   /* ارسال موج: فقط مالک */
    if (String(chat) !== String(TG_OWNER_CHAT)) { tgSend_(chat, T_PNL_NO); return true; }
    var id = data.slice(6), w = Object.keys(pnlDueWaves_()).filter(function (k) { return pnlWid_(k) === id; })[0] || '';
    if (!w) { tgSend_(chat, '📨 این موج دیگر ردیف سررسیدهٔ ارسال‌نشده ندارد.'); return true; }
    var o = pnlWave_(w);
    tgSend_(chat, '📨 موج «' + tgEsc_(w) + '»: دعوت تلگرام ' + tgFa_(o.tg) + '، بی چت ' + tgFa_(o.none) + '.');
    return true;
  }
  if (!pnlCan_(chat)) { tgSend_(chat, T_PNL_NO); return true; }   /* فقط درمانگر یا عضو وصل‌شده */
  if (data === 'pnl:go') pnlSendLink_(chat);
  return true;
}

/* ───── موج دعوت ───── */
function pnlRows_() { return pbRows_('h', PNL_TAB, PNL_HEAD); }
function pnlMark_(code, col) {
  try {
    var r = pnlRows_().filter(function (x) { return String(x['کد درمانگر']).trim() === String(code) && !String(x[col] || ''); })[0];
    if (r) pbSet_('h', PNL_TAB, PNL_HEAD, r, (function () { var o = {}; o[col] = pbFmt_(new Date(pnlNow_())); return o; })());
  } catch (e) { tgErr_('pnlMark_', e); }
}
function pnlTher_(code) {
  var list = []; try { list = TG_DRY ? (TG_MEM['pnl:thers'] || []) : tgTherapistRows_(); } catch (e) {}
  return list.filter(function (t) { return String(t.code).trim() === String(code).trim(); })[0] || null;
}
function pnlChatOf_(t) { return String(t && t.chat || '').split(/[,،\s]+/).filter(String)[0] || ''; }
/* تاریخ ردیف (شمسی ۱۴۰۵-۰۸-۱۰ یا تاریخ برگه)؛ خالی یعنی سررسیده */
function pnlDue_(v, now) {
  if (v === '' || v == null) return true;
  var d = v instanceof Date ? v : null;
  if (!d) { var m = tgLatinDigits_(String(v)).match(/(1[34]\d\d)[-\/](\d{1,2})[-\/](\d{1,2})/); d = m ? tgJalaliToGreg_(Number(m[1]), Number(m[2]), Number(m[3])) : pbWhen_(v); }
  if (!d) return false;
  return Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd') <= Utilities.formatDate(new Date(now), TG_TZ, 'yyyy-MM-dd');
}
/* ردیف‌های سررسیدهٔ بی ارسال، به تفکیک موج */
function pnlDueWaves_() {
  var now = pnlNow_(), w = {};
  pnlRows_().forEach(function (r) {
    var k = String(r['موج'] || '').trim();
    if (!k || !String(r['کد درمانگر'] || '').trim() || String(r['ارسال'] || '') || String(r['وضعیت'] || '') || !pnlDue_(r['تاریخ'], now)) return;
    w[k] = (w[k] || 0) + 1;
  });
  return w;
}
/** ارسال یک موج، فقط بعد از دکمهٔ مالک (E28 بند ۳). دعوت اصلی و پیامک از پل می‌رود؛ این فقط پیام تلگرام است. خروجی: {tg, none} */
function pnlWave_(wave) {
  var out = { tg: 0, none: 0 }, now = pnlNow_(), at = pbFmt_(new Date(now));
  pnlRows_().forEach(function (r) {
    if (String(r['موج']).trim() !== String(wave).trim() || !String(r['کد درمانگر'] || '').trim() || String(r['ارسال'] || '') || String(r['وضعیت'] || '') || !pnlDue_(r['تاریخ'], now)) return;
    var t = pnlTher_(r['کد درمانگر']), chat = pnlChatOf_(t), nm = t ? String(t.name).split(/\s+/)[0] : '';
    if (!chat) { pbSet_('h', PNL_TAB, PNL_HEAD, r, { 'وضعیت': t ? 'بی چت تلگرام (دعوت از پل)' : 'کد پیدا نشد' }); out.none++; return; }
    tgSend_(chat, T_PNL_INVITE.replace('{نام}', nm || 'همکار گرامی'), pnlKb_());
    pbSet_('h', PNL_TAB, PNL_HEAD, r, { 'ارسال': at, 'وضعیت': 'دعوت رفت' }); out.tg++;
  });
  return out;
}
/* ساعت ۱۰: برای هر موج سررسیده یک کارت با دکمهٔ «ارسال» در پیام خصوصی مالک؛ هر موج یک بار در روز */
function pnlCards_() {
  var w = pnlDueWaves_(), day = Utilities.formatDate(new Date(pnlNow_()), TG_TZ, 'yyyy-MM-dd'), n = 0;
  Object.keys(w).forEach(function (k) {
    var key = 'PNL_CARD:' + k;
    if (pnlProp_(key) === day) return;
    pnlPropSet_(key, day);
    tgSend_(String(TG_OWNER_CHAT), '📨 <b>موج دعوت «' + tgEsc_(k) + '»</b>\n' + tgFa_(w[k]) + ' درمانگر سررسیده‌اند. با دکمهٔ زیر پیام تلگرام دعوت به پنل برایشان می‌رود (دعوت اصلی و پیامک از خود پل است).',
      { inline_keyboard: [[{ text: '📨 ارسال موج', callback_data: 'pnl:w:' + pnlWid_(k) }]] });
    n++;
  });
  return n;
}
/* شناسهٔ کوتاه موج برای دادهٔ دکمه (سقف ۶۴ بایت تلگرام) */
function pnlWid_(k) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(k).trim()).slice(0, 5).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function pnlPropSet_(k, v) { if (TG_DRY) TG_MEM['pnlp:' + k] = String(v); else PropertiesService.getScriptProperties().setProperty(k, String(v)); }
/** قدم سبک واچ‌داگ: کارت موج ساعت ۱۰ و یادآوری یک‌باره ۴۸ ساعت بعد، ۹ تا ۲۱ تهران */
function pnlTick_() {
  var h = Number(Utilities.formatDate(new Date(pnlNow_()), TG_TZ, 'H'));
  if (h < 9 || h >= 21) return 0;
  var n = 0;
  if (h >= PNL_HOUR) { try { pnlCards_(); } catch (eC) { tgErr_('pnlCards_', eC); } }
  pnlRows_().forEach(function (r) {
    if (!String(r['ارسال'] || '') || String(r['دکمه'] || '') || String(r['یادآوری'] || '')) return;
    var at = pbWhen_(r['ارسال']);
    if (!at || pnlNow_() - at.getTime() < PNL_REMIND_MS) return;
    var chat = pnlChatOf_(pnlTher_(r['کد درمانگر']));
    if (!chat) return;
    tgSend_(chat, T_PNL_REMIND, pnlKb_());
    pbSet_('h', PNL_TAB, PNL_HEAD, r, { 'یادآوری': pbFmt_(new Date(pnlNow_())) }); n++;
  });
  return n;
}
/* «/panel» و «/start panel» برای درمانگر یا عضو وصل‌شده (ارسال موج فرمان تایپی ندارد؛ E28، E30) */
function pnlCmd_(chat, t) {
  t = String(t || '').trim();
  if (/^\/panel(@\w+)?$/.test(t) || /^\/start(@\w+)?\s+panel$/.test(t)) { pnlSendLink_(chat); return true; }
  return false;
}

/* ─────────────────────────── آزمون ─────────────────────────── */
try { TG_SUITES.push(['ورود به پنل و موج دعوت v170.98', 'pnlTests']); } catch (eSu) {}

function pnlTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, ther: typeof TG_DRY_THER === 'undefined' ? null : TG_DRY_THER, own: TG_OWNER_CHAT };
  TG_DRY = true; TG_OUTBOX = []; TG_OWNER_CHAT = '9001';
  TG_MEM = { 'pnl:now': String(Date.UTC(2026, 9, 24, 7, 0, 0)), 'br:jti': 'AAECAwQFBgcICQoLDA0ODw', 'pnlp:TG_BRIDGE_HANDOFF_SECRET': 'test-only-handoff-secret' };
  try {
    /* بردار ثابت: همین توکن با Node (crypto.createHmac) ساخته شد */
    var tok = brToken_('5550001');
    var parts = tok.split('.'), pl = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0] + '==='.slice((parts[0].length + 3) % 4))).getDataAsString());
    ok('توکن دو تکه، base64url بی پرکننده (روی کد قبلی مردود)', parts.length === 2 && !/[=+/]/.test(tok), tok);
    ok('payload: tid، iat، exp = iat + ۱۸۰، jti؛ بی ph', pl.tid === 5550001 && pl.exp - pl.iat === 180 && pl.iat === Math.floor(Number(TG_MEM['pnl:now']) / 1000) && pl.jti === 'AAECAwQFBgcICQoLDA0ODw' && !('ph' in pl), JSON.stringify(pl));
    ok('بردار Node: همان توکن بایت‌به‌بایت (روی کد قبلی مردود)', tok === 'eyJ0aWQiOjU1NTAwMDEsImlhdCI6MTc5MjgyNTIwMCwiZXhwIjoxNzkyODI1MzgwLCJqdGkiOiJBQUVDQXdRRkJnY0lDUW9MREEwT0R3In0.3hZKTqbO3IDqRrKFABESsd-EfYmm13FiMOcgmCA9niI', tok);
    TG_MEM['br:jti'] = '';
    ok('jti تصادفی ۱۶ بایت (۲۲ نویسه)', brJti_().length === 22 && brJti_() !== brJti_());
    TG_MEM['br:jti'] = 'AAECAwQFBgcICQoLDA0ODw';

    /* /panel */
    TG_DRY_THER = { name: 'درمانگر آزمون', code: 'T1', chat: '5550001' };
    ok('/panel درمانگر: لینک تازه با دکمهٔ url', pnlCmd_('5550001', '/panel') === true &&
      TG_OUTBOX.some(function (x) { return x.chat === '5550001' && JSON.stringify(x.markup || '').indexOf(BR_HANDOFF_URL) > -1; }));
    ok('توکن در متن پیام نیست، فقط در دکمه', !TG_OUTBOX.some(function (x) { return String(x.text).indexOf('#t=') > -1; }));
    TG_OUTBOX = []; TG_DRY_THER = null; TG_MEM['person'] = null;
    ok('/panel ناشناس: لینک نمی‌گیرد (روی کد قبلی مردود)', pnlCmd_('777', '/panel') === true && TG_OUTBOX.length === 1 && TG_OUTBOX[0].text === T_PNL_NO && JSON.stringify(TG_OUTBOX[0].markup || '').indexOf('bridge') < 0);
    TG_OUTBOX = []; TG_DRY_THER = { name: 'درمانگر آزمون', code: 'T1', chat: '5550001' }; TG_MEM['pnlp:TG_BRIDGE_HANDOFF_SECRET'] = '';
    ok('بی رمز: پیام «آماده نیست»، بی لینک', pnlSendLink_('5550001') === false && TG_OUTBOX[0].text === T_PNL_OFF);
    TG_MEM['pnlp:TG_BRIDGE_HANDOFF_SECRET'] = 'test-only-handoff-secret';
    ok('/start panel هم', pnlCmd_('5550001', '/start panel') === true);

    /* موج: کارت با دکمه برای مالک، بی فرمان تایپی، بی پیامک */
    TG_OUTBOX = [];
    TG_MEM['pnl:thers'] = [{ name: 'سارا آزمون', code: 'T1', chat: '5550001' }, { name: 'بی چت', code: 'T2', chat: '' }];
    pbRows_('h', PNL_TAB, PNL_HEAD).push({ 'موج': 'موج ۱', 'تاریخ': '۱۴۰۵-۰۸-۰۲', 'کد درمانگر': 'T1' }, { 'موج': 'موج ۱', 'تاریخ': '1405-08-02', 'کد درمانگر': 'T2' }, { 'موج': 'موج ۲', 'تاریخ': '1405-09-01', 'کد درمانگر': 'T1' }, { 'موج': 'موج ۱', 'تاریخ': '', 'کد درمانگر': 'T9' });
    var R = pnlRows_();
    ok('«/wave» دیگر فرمان نیست (E30)', pnlCmd_('9001', '/wave موج ۱') === false && !TG_OUTBOX.length);
    TG_MEM['pnl:now'] = String(Date.UTC(2026, 9, 24, 4, 0, 0));
    ok('پیش از ساعت ۱۰ کارتی نمی‌رود', (pnlTick_(), !TG_OUTBOX.length));
    TG_MEM['pnl:now'] = String(Date.UTC(2026, 9, 24, 7, 0, 0));
    pnlTick_();
    ok('ساعت ۱۰: یک کارت «ارسال موج» فقط برای موج سررسیده، فقط به مالک؛ هنوز هیچ دعوتی نرفته (روی کد قبلی مردود)', TG_OUTBOX.length === 1 && TG_OUTBOX[0].chat === '9001' && JSON.stringify(TG_OUTBOX[0].markup).indexOf('pnl:w:' + pnlWid_('موج ۱')) > -1 && !R[0]['ارسال'], JSON.stringify(TG_OUTBOX));
    ok('کارت همان موج همان روز دوباره نمی‌آید', (TG_OUTBOX = [], pnlTick_(), !TG_OUTBOX.length));
    ok('دکمهٔ موج برای غیرمالک کار نمی‌کند', (pnlOnCb_('5550001', 'pnl:w:' + pnlWid_('موج ۱')), !R[0]['ارسال']));
    TG_OUTBOX = [];
    pnlOnCb_('9001', 'pnl:w:' + pnlWid_('موج ۱'));
    ok('دکمهٔ مالک: دعوت با pnl:go فقط برای سررسیده‌های همان موج؛ بی پیامک', TG_OUTBOX.filter(function (x) { return x.chat === '5550001' && /سلام سارا/.test(x.text) && JSON.stringify(x.markup).indexOf('pnl:go') > -1; }).length === 1 &&
      R[0]['وضعیت'] === 'دعوت رفت' && /بی چت/.test(R[1]['وضعیت']) && R[3]['وضعیت'] === 'کد پیدا نشد' && !R[2]['ارسال'] && typeof pnlSms_ === 'undefined', JSON.stringify(R.map(function (r) { return r['وضعیت']; })));
    TG_OUTBOX = [];
    ok('دوباره دکمه: تکراری نمی‌رود', (pnlOnCb_('9001', 'pnl:w:' + pnlWid_('موج ۱')), !TG_OUTBOX.some(function (x) { return x.chat === '5550001'; })));
    /* یادآوری */
    TG_OUTBOX = [];
    ok('یادآوری پیش از ۴۸ ساعت نه', pnlTick_() === 0);
    TG_MEM['pnl:now'] = String(Number(TG_MEM['pnl:now']) + PNL_REMIND_MS + 60000); R[2]['تاریخ'] = '1405-12-01';
    ok('یادآوری بعد از ۴۸ ساعت یک بار با دکمه (روی کد قبلی مردود)', pnlTick_() === 1 && TG_OUTBOX.some(function (x) { return x.text === T_PNL_REMIND && JSON.stringify(x.markup).indexOf('pnl:go') > -1; }) && pnlTick_() === 0);
    R[0]['یادآوری'] = ''; pnlOnCb_('5550001', 'pnl:go');
    ok('دکمه زده شد: ستون «دکمه» پر و دیگر یادآوری نیست', !!R[0]['دکمه'] && pnlTick_() === 0);
    ok('سیم‌کشی: پیام، دکمه و واچ‌داگ', String(tgPrivate_).indexOf('pnlCmd_') > -1 && String(tgOnCallback_).indexOf("'pnl:'") > -1 && String(tgWatchdog).indexOf('pnlTick_') > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_DRY_THER = keep.ther; TG_OWNER_CHAT = keep.own;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ ورود به پنل و موج دعوت درست است'));
  return tgTestTally_(log, fail);
}
