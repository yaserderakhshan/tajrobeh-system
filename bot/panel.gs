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
 * ۳) موج دعوت: تب «دعوت موج‌ها» هاب تجربه (ستون کد درمانگر؛ نام و شماره از خود هاب). ارسال فقط با «/wave <موج>» مالک.
 *    یادآوری یک بار، ۴۸ ساعت بعد، اگر دکمه زده نشده. بی چت تلگرام: پیامک کاوه‌نگار با لینک کوتاه بات، اگر کلید
 *    KAVENEGAR_API_KEY در Script Properties باشد. پیام‌ها کوتاه‌اند و متن واقعی موج را لین A پیش از ارسال دیده است.
 */
var BR_HANDOFF_URL = 'https://bridge.tajrobeh.life/auth/telegram/handoff#t=';
var BR_TTL_S = 180;
var PNL_TAB = 'دعوت موج‌ها';
var PNL_HEAD = ['موج', 'تاریخ', 'کد درمانگر', 'وضعیت', 'ارسال', 'دکمه', 'یادآوری', 'پیامک', 'یادداشت'];
var PNL_REMIND_MS = 48 * 3600000;
var T_PNL_INVITE = 'سلام {نام}. پنل تازهٔ درمانگران تجربه آماده است و جای شما آنجاست. با دکمهٔ زیر وارد شوید.';
var T_PNL_REMIND = 'یادآوری: هنوز وارد پنل تازه نشده‌اید. با دکمهٔ زیر وارد شوید.';
var T_PNL_LINK = '🔐 لینک ورود شما به پنل آماده است. فقط یک بار و تا ۳ دقیقه کار می‌کند؛ اگر دیر شد، دوباره «ورود به پنل» را بزنید.';
var T_PNL_SMS = 'تجربه: پنل تازهٔ درمانگران آماده است. ورود: {لینک}';
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
function pnlWho_(chat) {
  var t = null; try { t = tgTherByChat_(chat); } catch (e) {}
  if (t) return { name: t.name, code: t.code };
  var p = null; try { p = tgPersonByChat_(chat); } catch (e2) {}
  return p ? { name: p.name || '', code: '' } : null;
}
function pnlKb_() { return { inline_keyboard: [[{ text: '🔐 ' + PNL_BTN, callback_data: 'pnl:go' }]] }; }
/** لینک تازه برای همان چت؛ ستون «دکمه» ردیف موجش را پر می‌کند. */
function pnlSendLink_(chat) {
  var who = pnlWho_(chat);
  if (!who) { tgSend_(chat, T_PNL_NO); return false; }
  var url = brUrl_(chat);
  if (!url) { tgSend_(chat, T_PNL_OFF); tgErr_('pnlSendLink_', 'TG_BRIDGE_HANDOFF_SECRET نیست'); return false; }
  tgSend_(chat, T_PNL_LINK, { inline_keyboard: [[{ text: '🔐 باز کردن پنل', url: url }]] });
  if (who.code) pnlMark_(who.code, 'دکمه');
  return true;
}
function pnlOnCb_(chat, data) { if (data === 'pnl:go') pnlSendLink_(chat); return true; }

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
/* شمارهٔ درمانگرِ بی چت از تب «افراد» با همان نام (فقط برای پیامک) */
function pnlPhone_(t) {
  if (!t) return '';
  if (TG_DRY) return (TG_MEM['pnl:phones'] || {})[String(t.code)] || '';
  var list = []; try { list = tgPeopleList_(); } catch (e) {}
  var p = list.filter(function (x) { return String(x.name || '').trim() === String(t.name).trim() && String(x.status).trim() !== 'غیرفعال'; })[0];
  return p ? String(p.phone || '') : '';
}
function pnlChatOf_(t) { return String(t && t.chat || '').split(/[,،\s]+/).filter(String)[0] || ''; }
/* پیامک کاوه‌نگار؛ کلید فقط در Script Properties و هرگز در لاگ */
function pnlSms_(phone, text) {
  var key = pnlProp_('KAVENEGAR_API_KEY');
  var ph = tgLatinDigits_(String(phone || '')).replace(/\D/g, '');
  if (!key || ph.length < 10) return false;
  if (TG_DRY) { (TG_MEM['pnl:sms'] = TG_MEM['pnl:sms'] || []).push({ to: ph, text: text }); return true; }
  var r = UrlFetchApp.fetch('https://api.kavenegar.com/v1/' + encodeURIComponent(key) + '/sms/send.json',
    { method: 'post', muteHttpExceptions: true, payload: { receptor: ph, message: text } });
  if (r.getResponseCode() !== 200) { tgErr_('pnlSms_', 'HTTP ' + r.getResponseCode()); return false; }
  return true;
}
/** ارسال یک موج (فقط با «/wave <موج>» مالک). خروجی: {tg, sms, none} */
function pnlWave_(wave) {
  var out = { tg: 0, sms: 0, none: 0 }, now = pbFmt_(new Date(pnlNow_()));
  pnlRows_().forEach(function (r) {
    if (String(r['موج']).trim() !== String(wave).trim() || String(r['ارسال'] || '') || String(r['پیامک'] || '')) return;
    var t = pnlTher_(r['کد درمانگر']), chat = pnlChatOf_(t);
    var nm = t ? String(t.name).split(/\s+/)[0] : '';
    if (chat) {
      tgSend_(chat, T_PNL_INVITE.replace('{نام}', nm || 'همکار گرامی').replace('سلام همکار گرامی.', 'سلام.'), pnlKb_());
      pbSet_('h', PNL_TAB, PNL_HEAD, r, { 'ارسال': now, 'وضعیت': 'دعوت رفت' }); out.tg++;
    } else if (pnlSms_(pnlPhone_(t), T_PNL_SMS.replace('{لینک}', 't.me/' + tgBotName_() + '?start=panel'))) {
      pbSet_('h', PNL_TAB, PNL_HEAD, r, { 'پیامک': now, 'وضعیت': 'پیامک رفت' }); out.sms++;
    } else { pbSet_('h', PNL_TAB, PNL_HEAD, r, { 'وضعیت': t ? 'بی چت و بی پیامک' : 'کد پیدا نشد' }); out.none++; }
  });
  return out;
}
/** قدم سبک واچ‌داگ: یادآوری یک‌باره ۴۸ ساعت بعد، ۹ تا ۲۱ تهران */
function pnlTick_() {
  var h = Number(Utilities.formatDate(new Date(pnlNow_()), TG_TZ, 'H'));
  if (h < 9 || h >= 21) return 0;
  var n = 0;
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
/* «/panel» و «/start panel» برای همه؛ «/wave» فقط مالک */
function pnlCmd_(chat, t) {
  t = String(t || '').trim();
  if (/^\/panel(@\w+)?$/.test(t) || /^\/start(@\w+)?\s+panel$/.test(t)) { pnlSendLink_(chat); return true; }
  var m = t.match(/^\/wave(?:@\w+)?(?:\s+(.+))?$/);
  if (!m || String(chat) !== String(TG_OWNER_CHAT)) return false;
  if (!m[1]) {
    var w = {}; pnlRows_().forEach(function (r) { var k = String(r['موج']).trim(); if (!k) return; w[k] = w[k] || [0, 0]; w[k][0]++; if (r['ارسال'] || r['پیامک']) w[k][1]++; });
    tgSend_(chat, Object.keys(w).length ? '📨 موج‌های دعوت:\n' + Object.keys(w).map(function (k) { return '• ' + tgEsc_(k) + ': ' + tgFa_(w[k][0]) + ' نفر، رفته ' + tgFa_(w[k][1]); }).join('\n') + '\nارسال: «/wave نام موج»' : '📨 تب «' + PNL_TAB + '» هاب خالی است.');
    return true;
  }
  var o = pnlWave_(m[1]);
  tgSend_(chat, '📨 موج «' + tgEsc_(m[1].trim()) + '»: تلگرام ' + tgFa_(o.tg) + '، پیامک ' + tgFa_(o.sms) + '، نرسید ' + tgFa_(o.none) + '.');
  return true;
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

    /* موج */
    TG_OUTBOX = [];
    TG_MEM['pnl:thers'] = [{ name: 'سارا آزمون', code: 'T1', chat: '5550001' }, { name: 'بی چت', code: 'T2', chat: '' }];
    TG_MEM['pnl:phones'] = {};
    pbRows_('h', PNL_TAB, PNL_HEAD).push({ 'موج': 'موج ۱', 'کد درمانگر': 'T1' }, { 'موج': 'موج ۱', 'کد درمانگر': 'T2' }, { 'موج': 'موج ۲', 'کد درمانگر': 'T1' }, { 'موج': 'موج ۱', 'کد درمانگر': 'T9' });
    ok('/wave فقط مالک', pnlCmd_('5550001', '/wave موج ۱') === false && !TG_OUTBOX.some(function (x) { return /پنل تازه/.test(x.text); }));
    var R = pnlRows_();
    ok('/wave مالک: دعوت با دکمهٔ pnl:go فقط برای همان موج؛ وضعیت‌ها ثبت', pnlCmd_('9001', '/wave موج ۱') === true &&
      TG_OUTBOX.filter(function (x) { return x.chat === '5550001' && /سلام سارا/.test(x.text) && JSON.stringify(x.markup).indexOf('pnl:go') > -1; }).length === 1 &&
      R[0]['وضعیت'] === 'دعوت رفت' && R[1]['وضعیت'] === 'بی چت و بی پیامک' && R[3]['وضعیت'] === 'کد پیدا نشد' && !R[2]['ارسال'], JSON.stringify(R.map(function (r) { return r['وضعیت']; })));
    TG_OUTBOX = [];
    ok('دوباره /wave همان موج: تکراری نمی‌رود', (pnlCmd_('9001', '/wave موج ۱'), !TG_OUTBOX.some(function (x) { return x.chat === '5550001' && /پنل تازه/.test(x.text); })));
    /* پیامک بی چت */
    TG_MEM['pnlp:KAVENEGAR_API_KEY'] = 'test-only-sms-key'; TG_MEM['pnl:phones'] = { T2: '09120000000' };
    R[1]['وضعیت'] = '';
    pnlWave_('موج ۱');
    ok('بی چت با کلید پیامک: پیامک با لینک کوتاه بات، بی توکن', (TG_MEM['pnl:sms'] || []).length === 1 && /t\.me\/tajrobehlife_bot\?start=panel/.test(TG_MEM['pnl:sms'][0].text) && !/#t=/.test(TG_MEM['pnl:sms'][0].text) && R[1]['وضعیت'] === 'پیامک رفت', JSON.stringify(TG_MEM['pnl:sms']) + ' ' + R[1]['وضعیت']);
    /* یادآوری */
    TG_OUTBOX = [];
    ok('یادآوری پیش از ۴۸ ساعت نه', pnlTick_() === 0);
    TG_MEM['pnl:now'] = String(Number(TG_MEM['pnl:now']) + PNL_REMIND_MS + 60000);
    ok('یادآوری بعد از ۴۸ ساعت یک بار با دکمه (روی کد قبلی مردود)', pnlTick_() === 1 && TG_OUTBOX.some(function (x) { return x.text === T_PNL_REMIND && JSON.stringify(x.markup).indexOf('pnl:go') > -1; }) && pnlTick_() === 0);
    R[0]['یادآوری'] = ''; pnlOnCb_('5550001', 'pnl:go');
    ok('دکمه زده شد: ستون «دکمه» پر و دیگر یادآوری نیست', !!R[0]['دکمه'] && pnlTick_() === 0);
    ok('سیم‌کشی: پیام، دکمه و واچ‌داگ', String(tgPrivate_).indexOf('pnlCmd_') > -1 && String(tgOnCallback_).indexOf("'pnl:'") > -1 && String(tgWatchdog).indexOf('pnlTick_') > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_DRY_THER = keep.ther; TG_OWNER_CHAT = keep.own;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ ورود به پنل و موج دعوت درست است'));
  return tgTestTally_(log, fail);
}
