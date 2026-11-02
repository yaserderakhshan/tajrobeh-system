/**
 * login.gs · v170.107 · ۱۱ آبان ۱۴۰۵ · پیوند بات قدیمی با پنل پل (INBOX E38، E39)
 *
 * ۱) «ورود به تجربه» برای هر کاربر بات (E38): فرمان /login، /start login، متن «ورود به تجربه» یا دکمهٔ lgn:go.
 *    شمارهٔ اشتراک تماس خود تلگرام (contact.user_id === from.id) شش ساعت در کش می‌ماند (lg:ph). اگر نیست، اول دکمهٔ
 *    اشتراک شماره می‌آید. پیوند همان توکن handoff پنل (panel.gs، brToken_) با ph است: عمر ۳ دقیقه، jti یکتا، توکن پس از #.
 *    متن دکمه «ورود به تجربه» است، نه نشانی خام. پیوند هر بار تازه ساخته می‌شود.
 * ۲) لید تازهٔ بات به پل (E39 بند ۱): بعد از نوشتن سطر لید در هاب، اگر لید از چت تلگرام آمده (chat_id در یادداشت)،
 *    یک POST سرور به سرور به BRIDGE_LEAD_URL (پیش‌فرض public-leads پل؛ off خاموش). بدنه JSON با source=bot و telegram_id.
 *    امضا: سربرگ X-Tajrobeh-Timestamp (ثانیهٔ یونیکس) و X-Tajrobeh-Signature = هگز HMAC-SHA256(«<timestamp>.<بدنه>»، راز handoff).
 *    شکست هرگز کار بات را نمی‌گیرد: try/catch، یک خط لاگ، شمارش روزانه در BRL:<روز>.
 * ۳) دعوت درمانگران (E39 بند ۲): یک‌بارهٔ lgV170107Invite (ساعت ۱۰ تا ۲۰ تهران؛ بیرون از آن، تریگر یک‌بارهٔ ساعت ۱۰ بعد)
 *    اول فقط به مالک و چت‌های BRIDGE_TEST_CHATS، و برای مالک کارتی با دکمهٔ «ارسال به همهٔ درمانگران» (lgn:all، فقط مالک،
 *    فقط ۱۰ تا ۲۰). هر درمانگر فعال با چت فقط یک بار دعوت می‌گیرد (LG_INV).
 */
var BR_LEAD_URL_DEF = 'https://bridge.tajrobeh.life/api/v2/reception/public-leads';
var LG_BTN = 'ورود به تجربه';
var LG_PH_SEC = 21600;
var LG_INV_FROM = 10, LG_INV_TO = 20;
var T_LG_ASK = 'برای ورود به تجربه، شمارهٔ همین حساب تلگرام را با دکمهٔ زیر بفرستید.';
var T_LG_OWN = 'فقط شمارهٔ خودتان را با همان دکمهٔ «اشتراک شمارهٔ من» بفرستید.';
var T_LG_LINK = '🔐 پیوند ورود شما آماده است. فقط یک بار و تا ۳ دقیقه کار می‌کند؛ اگر دیر شد، دوباره «ورود به تجربه» را بزنید.';
var T_LG_INVITE = 'سلام {نام}. پنل تازهٔ تجربه آماده است. با دکمهٔ «ورود به تجربه» وارد شوید؛ اگر بات شماره‌تان را خواست، دکمهٔ اشتراک شماره را بزنید.';

function lgNow_() { return TG_DRY && TG_MEM['lg:now'] ? Number(TG_MEM['lg:now']) : Date.now(); }
function lgProp_(k, v) {
  if (TG_DRY) { if (v !== undefined) TG_MEM['lgp:' + k] = String(v); return TG_MEM['lgp:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function lgKb_() { return { inline_keyboard: [[{ text: '🔑 ' + LG_BTN, callback_data: 'lgn:go' }]] }; }
function lgPhone_(p) { var d = tgLatinDigits_(String(p || '')).replace(/[^\d]/g, ''); return d ? '+' + d : ''; }

/* ───── ۱) ورود به تجربه ───── */
function lgCmd_(chat, t) {
  t = String(t || '').trim();
  if (/^\/login(@\w+)?$/.test(t) || /^\/start(@\w+)?\s+login$/.test(t) || t === LG_BTN || t === '🔑 ' + LG_BTN) { lgStart_(chat); return true; }
  return false;
}
function lgStart_(chat) {
  var ph = tgGetVal_('lg:ph', chat);
  if (ph) return lgSend_(chat, ph);
  tgSetFlag_('lg:w', chat, 900);
  tgSend_(chat, T_LG_ASK, { keyboard: [[{ text: '📱 اشتراک شمارهٔ من', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true });
  return true;
}
/** از مسیر اشتراک تماس؛ true یعنی این شماره مال ورود بود */
function lgContact_(chat, m) {
  if (!tgFlag_('lg:w', chat)) return false;
  var own = m.contact && m.contact.user_id && m.from && Number(m.contact.user_id) === Number(m.from.id);
  if (!own) { tgSend_(chat, T_LG_OWN); return true; }
  tgDel_('lg:w', chat);
  var ph = lgPhone_(m.contact.phone_number);
  if (TG_DRY) TG_MEM['lg:ph' + chat] = ph; else CacheService.getScriptCache().put('lg:ph' + chat, ph, LG_PH_SEC);
  tgSend_(chat, '✅', { remove_keyboard: true });
  return lgSend_(chat, ph);
}
function lgSend_(chat, ph) {
  var t = brToken_(chat, ph);
  if (!t) { tgSend_(chat, T_PNL_OFF); tgErr_('lgSend_', 'TG_BRIDGE_HANDOFF_SECRET نیست'); return false; }
  tgSend_(chat, T_LG_LINK, { inline_keyboard: [[{ text: '🔑 ' + LG_BTN, url: BR_HANDOFF_URL + t }]] });
  return true;
}
/* دکمه‌ها: lgn:go برای هر کاربر (sec:public، پیوند فقط برای همان چت و همان شمارهٔ اشتراک‌شده ساخته می‌شود)؛ lgn:all فقط مالک */
function lgOnCb_(chat, data) {   // sec:public
  if (data === 'lgn:go') return lgStart_(chat);
  if (data === 'lgn:all') {
    if (String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, T_PNL_NO);
    if (!lgInWindow_()) return tgSend_(chat, '⏰ دعوت فقط ساعت ۱۰ تا ۲۰ تهران فرستاده می‌شود. همین دکمه را در آن ساعت بزنید.');
    var o = lgInviteAll_();
    return tgSend_(chat, '📨 دعوت «ورود به تجربه»: ' + tgFa_(o.sent) + ' درمانگر دعوت گرفتند · بی چت ' + tgFa_(o.none) + ' · از قبل ' + tgFa_(o.had) + '.');
  }
  return null;
}

/* ───── ۲) لید تازهٔ بات به پل ───── */
function brLeadUrl_() {
  var v = String(cfg_('BRIDGE_LEAD_URL', '') || '').trim();
  if (/^(off|0|خاموش)$/i.test(v)) return '';
  return v || BR_LEAD_URL_DEF;
}
function brLeadBody_(o, code, chat) {
  return { source: 'bot', telegram_id: Number(chat), lead_code: String(code || ''), name: String(o.name || ''), phone: String(o.phone || ''),
    channel: String(o.channel || 'تلگرام'), region: String(o.region || ''), kind: String(o.kind || ''), topic: String(o.topic || ''),
    message: String(o.firstText || ''), origin: String(o.source || 'Telegram bot'), created_at: new Date(lgNow_()).toISOString() };
}
/** خروجی: 'ok' | 'skip' | 'fail'. هرگز خطا بالا نمی‌دهد. */
function brLeadPush_(o, row) {
  try {
    var mm = String(o && o.note || '').match(/chat_id: (\d+)/);
    if (!mm) return 'skip';   /* لید فرم سایت یا واتس‌اپ: سایت خودش به پل می‌فرستد */
    var url = brLeadUrl_(), sec = pnlProp_('TG_BRIDGE_HANDOFF_SECRET');
    if (!url || !sec) return 'skip';
    var code = ''; try { code = row && typeof row === 'number' && typeof tgLeadCode_ === 'function' ? tgLeadCode_(row) : ''; } catch (eC) {}
    var body = JSON.stringify(brLeadBody_(o, code, mm[1])), ts = String(Math.floor(lgNow_() / 1000));
    var h = { 'X-Tajrobeh-Timestamp': ts, 'X-Tajrobeh-Signature': brHex_(Utilities.computeHmacSha256Signature(ts + '.' + body, sec)) };
    var okc;
    if (TG_DRY) { (TG_MEM['br:leads'] = TG_MEM['br:leads'] || []).push({ url: url, body: body, h: h }); okc = Number(TG_MEM['br:leadCode'] || 200); }
    else okc = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: body, headers: h, muteHttpExceptions: true, followRedirects: false }).getResponseCode();
    var res = okc >= 200 && okc < 300 ? 'ok' : 'fail';
    if (res === 'fail') { try { Logger.log('brLeadPush_: پل HTTP ' + okc); } catch (eL) {} }
    brLeadCount_(res);
    return res;
  } catch (e) { try { Logger.log('brLeadPush_: ' + String(e.message || e).slice(0, 120)); } catch (e2) {} brLeadCount_('fail'); return 'fail'; }
}
function brLeadCount_(res) {
  try {
    var day = Utilities.formatDate(new Date(lgNow_()), TG_TZ, 'yyyy-MM-dd'), k = 'BRL:' + day, c = {};
    try { c = JSON.parse(lgProp_(k) || '{}') || {}; } catch (e) {}
    c[res] = (c[res] || 0) + 1; lgProp_(k, JSON.stringify(c));
  } catch (e2) {}
}
function brLeadNightLine_() {
  var day = Utilities.formatDate(new Date(lgNow_()), TG_TZ, 'yyyy-MM-dd'), c = {};
  try { c = JSON.parse(lgProp_('BRL:' + day) || '{}') || {}; } catch (e) {}
  var inv = 0; try { inv = Object.keys(JSON.parse(lgProp_('LG_INV') || '{}')).length; } catch (e2) {}
  return '🌉 پل امروز: ' + tgFa_(c.ok || 0) + ' لید بات رسید' + (c.fail ? '، ' + tgFa_(c.fail) + ' شکست' : '') + ' · دعوت «ورود به تجربه» تا امروز: ' + tgFa_(inv) + ' درمانگر';
}
try { TG_NIGHT_LINES.push(brLeadNightLine_); } catch (eNl) {}

/* ───── ۳) دعوت درمانگران ───── */
function lgInWindow_() { var h = Number(Utilities.formatDate(new Date(lgNow_()), TG_TZ, 'H')); return h >= LG_INV_FROM && h < LG_INV_TO; }
function lgActive_(t) { return t && t.chat && !/پایان|غیرفعال|متوقف/.test(String(t.status || '')); }
function lgInvited_() { var o = {}; try { o = JSON.parse(lgProp_('LG_INV') || '{}') || {}; } catch (e) {} return o; }
function lgInviteOne_(chat, nm, inv) {
  if (inv[chat]) return false;
  tgSend_(chat, T_LG_INVITE.replace('{نام}', nm || 'همکار گرامی'), lgKb_());
  inv[chat] = Utilities.formatDate(new Date(lgNow_()), TG_TZ, 'yyyy-MM-dd HH:mm');
  return true;
}
/** مرحلهٔ ۱: مالک و چت‌های آزمایشی پل، و کارت مالک برای ارسال به همه */
function lgInviteTest_() {
  var inv = lgInvited_(), n = 0, chats = [String(TG_OWNER_CHAT)].concat(typeof brTestChats_ === 'function' ? brTestChats_() : []);
  chats.filter(function (c, i) { return c && chats.indexOf(c) === i; }).forEach(function (c) { if (lgInviteOne_(c, '', inv)) n++; });
  lgProp_('LG_INV', JSON.stringify(inv));
  var all = (TG_DRY ? (TG_MEM['pnl:thers'] || []) : tgTherapistRows_()).filter(lgActive_).length;
  tgSend_(String(TG_OWNER_CHAT), '📨 <b>دعوت «ورود به تجربه»</b>\nپیام آزمایشی برای شما و چت‌های آزمایشی رفت (' + tgFa_(n) + '). اگر درست بود، با دکمهٔ زیر برای ' + tgFa_(all) + ' درمانگر فعالِ وصل به بات می‌رود (فقط ساعت ۱۰ تا ۲۰).',
    { inline_keyboard: [[{ text: '📨 ارسال به همهٔ درمانگران', callback_data: 'lgn:all' }]] });
  return n;
}
function lgInviteAll_() {
  var inv = lgInvited_(), out = { sent: 0, none: 0, had: 0 };
  (TG_DRY ? (TG_MEM['pnl:thers'] || []) : tgTherapistRows_()).forEach(function (t) {
    if (!t || /پایان|غیرفعال|متوقف/.test(String(t.status || ''))) return;
    var chat = typeof pnlChatOf_ === 'function' ? pnlChatOf_(t) : String(t.chat || '');
    if (!chat) { out.none++; return; }
    if (inv[chat]) { out.had++; return; }
    if (lgInviteOne_(chat, String(t.name || '').split(/\s+/)[0], inv)) out.sent++;
  });
  lgProp_('LG_INV', JSON.stringify(inv));
  return out;
}
/** یک‌بارهٔ خودکار v170.107: مرحلهٔ آزمایشی دعوت؛ بیرون از ۱۰ تا ۲۰ تهران، تریگر یک‌باره برای ساعت ۱۰ بعد */
function lgV170107Invite() {
  if (lgInWindow_()) return 'دعوت آزمایشی: ' + lgInviteTest_() + ' پیام · کارت مالک رفت';
  if (!TG_DRY) {
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'lgInviteRun') ScriptApp.deleteTrigger(t); });
    var d = new Date(lgNow_() + 3600000), day = Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd'), at = new Date(day + 'T10:05:00+03:30');
    if (at.getTime() <= lgNow_()) at = new Date(at.getTime() + 86400000);
    ScriptApp.newTrigger('lgInviteRun').timeBased().at(at).create();
    return 'بیرون از ساعت ۱۰ تا ۲۰؛ تریگر یک‌باره برای ' + Utilities.formatDate(at, TG_TZ, 'yyyy-MM-dd HH:mm');
  }
  TG_MEM['lg:arm'] = 1; return 'تریگر یک‌باره';
}
function lgInviteRun() {
  if (!TG_DRY) ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'lgInviteRun') ScriptApp.deleteTrigger(t); });
  if (lgInWindow_()) lgInviteTest_();
}

try { TG_SUITES.push(['ورود به تجربه، لید به پل، دعوت درمانگران v170.107', 'lgTests']); } catch (eSu) {}
function lgTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, own: TG_OWNER_CHAT, cfg: TG_CFG_ };
  TG_DRY = true; TG_OUTBOX = []; TG_OWNER_CHAT = '9001'; TG_CFG_ = {};
  TG_MEM = { 'pnlp:TG_BRIDGE_HANDOFF_SECRET': 'test-only-handoff-secret-0123456789', 'lg:now': String(new Date('2026-11-02T12:00:00+03:30').getTime()) };
  try {
    /* ورود */
    ok('«ورود به تجربه» بی شماره: اول دکمهٔ اشتراک شماره', lgCmd_('5550060', '/login') === true && JSON.stringify(TG_OUTBOX[0].markup).indexOf('request_contact') > -1 && TG_MEM['lg:w5550060'] === '1');
    TG_OUTBOX = [];
    var mine = { contact: { phone_number: '989000000000', user_id: 5550060 }, from: { id: 5550060 } };   /* pii:ok شمارهٔ ساختگی آزمون */
    var other = { contact: { phone_number: '989000000001', user_id: 77 }, from: { id: 5550060 } };   /* pii:ok */
    ok('شمارهٔ کس دیگر پذیرفته نمی‌شود', lgContact_('5550060', other) === true && TG_OUTBOX.length === 1 && TG_OUTBOX[0].text === T_LG_OWN && TG_MEM['lg:w5550060'] === '1');
    TG_OUTBOX = [];
    ok('شمارهٔ خود فرستنده: پیوند با دکمهٔ متن‌دار «ورود به تجربه»', lgContact_('5550060', mine) === true && TG_OUTBOX.length === 2 &&
      TG_OUTBOX[1].markup.inline_keyboard[0][0].text.indexOf(LG_BTN) > -1 && TG_OUTBOX[1].markup.inline_keyboard[0][0].url.indexOf(BR_HANDOFF_URL) === 0 && TG_OUTBOX[1].text.indexOf('http') < 0);
    var tok = TG_OUTBOX[1].markup.inline_keyboard[0][0].url.slice(BR_HANDOFF_URL.length).split('.'),
        pay = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(tok[0] + '==='.slice((tok[0].length + 3) % 4))).getDataAsString());
    ok('توکن: tid، ph از اشتراک تماس، عمر ۱۸۰ ثانیه، jti، امضای درست', pay.tid === 5550060 && pay.ph === '+989000000000' && pay.exp - pay.iat === 180 && !!pay.jti &&   /* pii:ok */
      tok[1] === brB64_(Utilities.computeHmacSha256Signature(tok[0], 'test-only-handoff-secret-0123456789')));
    TG_OUTBOX = [];
    ok('بار دوم شمارهٔ کش‌شده: پیوند مستقیم', lgOnCb_('5550060', 'lgn:go') === true && TG_OUTBOX.length === 1 && TG_OUTBOX[0].markup.inline_keyboard[0][0].url);
    ok('مسیر پیام و دکمه وصل است', /lgCmd_\(chat/.test(String(tgPrivate_)) && /lgContact_\(chat, m\)/.test(String(tgPrivate_)) && /lgOnCb_\(chat, data\)/.test(String(tgOnCallback_)));

    /* لید به پل */
    var o = { name: 'مراجع آزمون', phone: '09000000000', note: 'chat_id: 5550061', firstText: 'سلام', kind: 'فردی', source: 'Telegram bot' };   /* pii:ok */
    ok('لید بات به پل با source=bot و telegram_id و امضای HMAC (روی کد قبلی مردود)', brLeadPush_(o, 0) === 'ok' && TG_MEM['br:leads'].length === 1 &&
      TG_MEM['br:leads'][0].url === BR_LEAD_URL_DEF && JSON.parse(TG_MEM['br:leads'][0].body).source === 'bot' && JSON.parse(TG_MEM['br:leads'][0].body).telegram_id === 5550061 &&
      TG_MEM['br:leads'][0].h['X-Tajrobeh-Signature'] === brHex_(Utilities.computeHmacSha256Signature(TG_MEM['br:leads'][0].h['X-Tajrobeh-Timestamp'] + '.' + TG_MEM['br:leads'][0].body, 'test-only-handoff-secret-0123456789')));
    ok('لید فرم سایت (بی chat_id) به پل نمی‌رود', brLeadPush_({ name: 'x', note: '' }, 0) === 'skip' && TG_MEM['br:leads'].length === 1);
    TG_MEM['br:leadCode'] = 500;
    ok('شکست پل خطا بالا نمی‌دهد و شمرده می‌شود', brLeadPush_(o, 0) === 'fail' && /۱ لید بات رسید، ۱ شکست/.test(brLeadNightLine_()), brLeadNightLine_());
    TG_CFG_ = { BRIDGE_LEAD_URL: 'off' };
    ok('BRIDGE_LEAD_URL = off خاموش می‌کند', brLeadPush_(o, 0) === 'skip');
    TG_CFG_ = {};
    ok('tgAppendLead_ بعد از نوشتن سطر لید را به پل می‌فرستد', /brLeadPush_\(o, row\)/.test(String(tgAppendLead_)));

    /* دعوت */
    TG_OUTBOX = []; TG_MEM['pnl:thers'] = [{ name: 'درمانگر یک', code: 'T1', chat: '5550071', status: 'فعال' }, { name: 'درمانگر دو', code: 'T2', chat: '', status: 'فعال' },
      { name: 'درمانگر سه', code: 'T3', chat: '5550073', status: 'پایان همکاری' }, { name: 'درمانگر چهار', code: 'T4', chat: '5550074', status: '' }];
    var r1 = lgV170107Invite();
    ok('مرحلهٔ آزمایشی فقط مالک، بعد کارت مالک با دکمهٔ ارسال به همه', /۱|1/.test(r1) && TG_OUTBOX.length === 2 && TG_OUTBOX[0].chat === '9001' &&
      JSON.stringify(TG_OUTBOX[1].markup).indexOf('lgn:all') > -1 && /۲ درمانگر فعال/.test(TG_OUTBOX[1].text), r1);
    TG_OUTBOX = [];
    lgOnCb_('5550071', 'lgn:all');
    ok('دکمهٔ ارسال به همه فقط برای مالک', TG_OUTBOX.length === 1 && TG_OUTBOX[0].text === T_PNL_NO);
    TG_OUTBOX = [];
    lgOnCb_('9001', 'lgn:all');
    var sentTo = TG_OUTBOX.filter(function (x) { return x.text && x.text.indexOf('سلام') === 0; }).map(function (x) { return x.chat; }).sort().join();
    ok('ارسال به همه: فقط درمانگر فعال با چت، با دکمهٔ ورود', sentTo === '5550071,5550074' && /۲ درمانگر دعوت گرفتند/.test(TG_OUTBOX[TG_OUTBOX.length - 1].text), sentTo);
    TG_OUTBOX = []; lgOnCb_('9001', 'lgn:all');
    ok('هر درمانگر فقط یک بار', TG_OUTBOX.length === 1 && /۰ درمانگر دعوت گرفتند/.test(TG_OUTBOX[0].text));
    TG_MEM['lg:now'] = String(new Date('2026-11-02T21:30:00+03:30').getTime()); TG_OUTBOX = [];
    lgOnCb_('9001', 'lgn:all');
    ok('بیرون از ساعت ۱۰ تا ۲۰ دعوتی نمی‌رود', TG_OUTBOX.length === 1 && /۱۰ تا ۲۰/.test(TG_OUTBOX[0].text));
    ok('یک‌بارهٔ دعوت در فهرست CI', CI_ONCE_AUTO.indexOf('lgV170107Invite') >= 0);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_OWNER_CHAT = keep.own; TG_CFG_ = keep.cfg;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ ورود و پل درست است'));
  return tgTestTally_(log, fail);
}
