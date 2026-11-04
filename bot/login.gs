/**
 * login.gs · v170.107 · ۱۱ آبان ۱۴۰۵ · پیوند بات قدیمی با پنل پل (INBOX E38، E39)
 *
 * ۱) «ورود به تجربه» برای هر کاربر بات (E38): فرمان /login، /start login، متن «ورود به تجربه» یا دکمهٔ lgn:go.
 *    شمارهٔ اشتراک تماس خود تلگرام (contact.user_id === from.id) شش ساعت در کش می‌ماند (lg:ph). اگر نیست، اول دکمهٔ
 *    اشتراک شماره می‌آید. پیوند همان توکن handoff پنل (panel.gs، brToken_) با ph است: عمر ۳ دقیقه، jti یکتا، توکن پس از #.
 *    متن دکمه «ورود به تجربه» است، نه نشانی خام. پیوند هر بار تازه ساخته می‌شود.
 * ۲) لید تازهٔ بات به پل (E39 بند ۱): بعد از نوشتن سطر لید در هاب، اگر لید از چت تلگرام آمده (chat_id در یادداشت)،
 *    (کد ارسال در bridge.gs) یک POST سرور به سرور به BRIDGE_LEAD_URL (پیش‌فرض public-leads پل؛ off خاموش). بدنه JSON با source=bot و telegram_id.
 *    امضا: سربرگ X-Tajrobeh-Timestamp (ثانیهٔ یونیکس) و X-Tajrobeh-Signature = هگز HMAC-SHA256(«<timestamp>.<بدنه>»، راز handoff).
 *    شکست هرگز کار بات را نمی‌گیرد: try/catch، یک خط لاگ، شمارش روزانه در BRL:<روز>.
 * ۳) دعوت درمانگران (E39 بند ۲): یک‌بارهٔ lgV170107Invite (ساعت ۱۰ تا ۲۰ تهران؛ بیرون از آن، تریگر یک‌بارهٔ ساعت ۱۰ بعد)
 *    اول فقط به مالک و چت‌های BRIDGE_TEST_CHATS، و برای مالک کارتی با دکمهٔ «ارسال به همهٔ درمانگران» (lgn:all، فقط مالک،
 *    فقط ۱۰ تا ۲۰). هر درمانگر فعال با چت فقط یک بار دعوت می‌گیرد (LG_INV).
 */
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
  if (!t) { tgSend_(chat, T_PNL_OFF); tgErr_('lgSend_', 'راز handoff نیست (توکن بات؟)'); return false; }
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
  if (data === 'lgn:e48') {
    if (String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, T_PNL_NO);
    return tgSend_(chat, lgE48Send_());
  }
  return null;
}

/* ───── ۲) لید تازهٔ بات به پل: bridge.gs (آداپتور پل) ───── */

/** یک‌بارهٔ خودکار v170.108 (E40): یک لید آزمایشی «آزمون لین E» به پل، و شمار دعوت و لید تا الان. خروجی در گزارش دیپلوی */
function lgV170108TestLead() {
  var url = brLeadUrl_(), sec = brHandoffSecret_();
  var out = 'دعوت تا الان: ' + Object.keys(lgInvited_()).length + ' · امروز ' + JSON.stringify((function (c) { return { ok: c.ok, fail: c.fail, q: c.q.length }; })(brLeadState_()));
  if (!TG_DRY) try {   /* کلیدهای روزانهٔ v170.107 در یک کلید BRL جمع می‌شوند؛ شمار قدیمی در خروجی می‌ماند */
    var P = PropertiesService.getScriptProperties();
    P.getKeys().forEach(function (k) { if (/^BRL:\d{4}-/.test(k)) { out += ' · ' + k + '=' + P.getProperty(k); P.deleteProperty(k); } });
  } catch (eK) {}
  if (!url || !sec) return out + ' · لید آزمایشی: خاموش یا بی راز';
  var body = JSON.stringify({ fullName: 'آزمون لین E', mobile: '', telegramUsername: 'tajrobeh_lane_e_test', message: 'لید آزمایشی بات (E40)؛ نادیده بگیرید.', source: 'Bot', homepage: '' });
  var c = 0;
  try { c = brLeadPost_(url, body, sec); } catch (e) { BR_LAST_TXT = String(e.message || e).slice(0, 120); }
  return out + ' · لید آزمایشی: HTTP ' + c + (BR_LAST_TXT ? ' ' + BR_LAST_TXT : '');
}
/** یک‌بارهٔ خودکار v170.109 (فقط‌خواندنی): شمار دعوت «ورود به تجربه» و لید پل تا الان، برای گزارش دیپلوی */
function lgV170109Count() {
  var c = brLeadState_();
  return 'دعوت تا الان: ' + Object.keys(lgInvited_()).length + ' · امروز لید پل: رسید ' + c.ok + '، شکست ' + c.fail + '، صف ' + c.q.length;
}
/** یک‌بارهٔ خودکار v170.110 (E46): اثر انگشت توکن بات و راز ساخته‌شده (۸ نویسهٔ اول SHA-256)، برای مقایسه با پل */
function lgV170110Fp() {
  var fp = function (v) { return brHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(v), Utilities.Charset.UTF_8)).slice(0, 8); };
  var tok = TG_DRY ? String(TG_MEM['br:token'] || '') : String(PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN') || '');
  var sec = brHandoffSecret_();
  return 'توکن بات: ' + (tok ? fp(tok.trim()) : 'نیست') + ' · راز handoff (' + BR_HANDOFF_LABEL + '): ' + (sec ? fp(sec) + ' · ' + sec.length + ' نویسه' : 'نیست');
}
/* ───── ۴) E48: پیام یک‌بارهٔ پنل به مسئول «سازمانی» (tgNm_('chief'))، فقط با دکمهٔ مالک ───── */
var T_LG_E48 = 'سلام {نام} جان. مشکل نمایش مراجعان در پنل تجربه برطرف شد. مراجعانت حالا در برنامهٔ هفتگی دیده می‌شوند؛ هر کدام را که درست است با «درست است» تأیید کن. اگر جایی گیر کردی، دکمهٔ بازخورد داخل پنل را بزن.';
/** درمانگر فعال با چت که نامش با نام خصوصی tgNm_('chief') شروع می‌شود؛ دقیقاً یکی، وگرنه null */
function lgE48Target_() {
  var nm = String(tgNm_('chief') || '').trim(); if (!nm) return null;
  var hit = (TG_DRY ? (TG_MEM['pnl:thers'] || []) : tgTherapistRows_()).filter(function (t) {
    return lgActive_(t) && String(t.name || '').trim().indexOf(nm) === 0;
  });
  return hit.length === 1 ? { chat: typeof pnlChatOf_ === 'function' ? pnlChatOf_(hit[0]) : String(hit[0].chat), first: nm.split(/\s+/)[0] } : null;
}
function lgE48Send_() {
  if (lgProp_('LG_E48')) return 'پیام E48 قبلاً رفته بود (' + lgProp_('LG_E48') + ').';
  var t = lgE48Target_(); if (!t || !t.chat) return '⚠️ گیرندهٔ پیام E48 دقیقاً یک نفر پیدا نشد؛ چیزی نرفت.';
  tgSend_(t.chat, T_LG_E48.replace('{نام}', t.first));
  lgProp_('LG_E48', Utilities.formatDate(new Date(lgNow_()), TG_TZ, 'yyyy-MM-dd HH:mm'));
  return '✅ پیام E48 به ' + tgEsc_(t.first) + ' رفت.';
}
/** از tgTick5 (هر ۳۰ دقیقه، ساعت ۱۰ تا ۲۰): کارت پیش‌نمایش E48 یک بار برای مالک؛ ارسال به گیرنده فقط با دکمهٔ مالک */
function lgE48Tick_() {
  if (lgProp_('LG_E48') || lgProp_('LG_E48C') || !lgInWindow_()) return false;
  var t = lgE48Target_(); if (!t || !t.chat) return false;
  tgSend_(String(TG_OWNER_CHAT), '📨 <b>پیام E48 (با تأیید شما)</b>\nگیرنده: ' + tgEsc_(t.first) + '\n\n' + tgEsc_(T_LG_E48.replace('{نام}', t.first)),
    { inline_keyboard: [[{ text: '📨 ارسال به ' + t.first, callback_data: 'lgn:e48' }]] });
  lgProp_('LG_E48C', Utilities.formatDate(new Date(lgNow_()), TG_TZ, 'yyyy-MM-dd HH:mm'));
  return true;
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

try { TG_SUITES.push(['ورود به تجربه، لید به پل (E40)، دعوت درمانگران v170.108', 'lgTests']); } catch (eSu) {}
function lgTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, own: TG_OWNER_CHAT, cfg: TG_CFG_ };
  TG_DRY = true; TG_OUTBOX = []; TG_OWNER_CHAT = '9001'; TG_CFG_ = {}; BR_LAST_TXT = '';
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

    /* لید به پل (E40: شکل دقیق camelCase) */
    var o = { name: 'مراجع آزمون', phone: '09000000000', note: 'chat_id: 5550061 · @test_user9', firstText: 'سلام', kind: 'فردی', source: 'Telegram bot' };   /* pii:ok */
    var L0 = function () { return TG_MEM['br:leads'][TG_MEM['br:leads'].length - 1]; };
    ok('لید بات به پل', brLeadPush_(o, 0) === 'ok' && TG_MEM['br:leads'].length === 1 && L0().url === BR_LEAD_URL_DEF);
    var b0 = JSON.parse(L0().body);
    ok('E40: بدنه فقط fullName، mobile، telegramUsername، message، source=Bot، homepage خالی (روی کد قبلی مردود)',
      Object.keys(b0).sort().join() === 'fullName,homepage,message,mobile,source,telegramUsername' && b0.source === 'Bot' && b0.homepage === '' &&
      b0.fullName === 'مراجع آزمون' && b0.mobile === '09000000000' && b0.telegramUsername === 'test_user9' && b0.message === 'سلام', L0().body);
    ok('امضای HMAC روی «timestamp.بدنه»', L0().h['X-Tajrobeh-Signature'] === brHex_(Utilities.computeHmacSha256Signature(L0().h['X-Tajrobeh-Timestamp'] + '.' + L0().body, 'test-only-handoff-secret-0123456789')));
    var long = brLeadBody_({ name: '', firstText: new Array(700).join('ا'), note: '' }, 'L-1', '1');
    ok('message حداکثر ۵۰۰ و نام خالی پر می‌شود', long.message.length === 500 && long.message.indexOf('[L-1] ') === 0 && !!long.fullName);
    ok('بی موبایل و یوزرنیم به پل نمی‌رود (۴۰۰ می‌شد)', brLeadPush_({ name: 'x', note: 'chat_id: 5' }, 0) === 'skip' && TG_MEM['br:leads'].length === 1);
    ok('لید فرم سایت (بی chat_id) به پل نمی‌رود', brLeadPush_({ name: 'x', note: '' }, 0) === 'skip' && TG_MEM['br:leads'].length === 1);
    TG_MEM['br:leadCode'] = 500;
    ok('شکست پل خطا بالا نمی‌دهد و شمرده می‌شود', brLeadPush_(o, 0) === 'fail' && /۱ لید بات رسید، ۱ شکست/.test(brLeadNightLine_()), brLeadNightLine_());
    TG_MEM['br:leadCode'] = 429;
    ok('E40: ۴۲۹ شکست نیست؛ در صف می‌ماند', brLeadPush_(o, 0) === 'later' && brLeadState_().q.length === 1 && /۱ در صف ۴۲۹/.test(brLeadNightLine_()), brLeadNightLine_());
    TG_MEM['br:leadCodes'] = [429];
    ok('تیک: ۴۲۹ دوباره، صف می‌ماند', brLeadRetryTick_() === 0 && brLeadState_().q.length === 1);
    TG_MEM['br:leadCode'] = 200;
    ok('تیک: بعد از سقف، صف خالی و شمرده', brLeadRetryTick_() === 1 && brLeadState_().q.length === 0 && /۲ لید بات رسید/.test(brLeadNightLine_()), brLeadNightLine_());
    ok('صف ۴۲۹ در tgTick5', /brLeadRetryTick_/.test(String(tgTick5)));
    TG_CFG_ = { BRIDGE_LEAD_URL: 'off' };
    ok('BRIDGE_LEAD_URL = off خاموش می‌کند', brLeadPush_(o, 0) === 'skip');
    TG_CFG_ = {};
    ok('tgAppendLead_ بعد از نوشتن سطر لید را به پل می‌فرستد', /brLeadPush_\(o, row\)/.test(String(tgAppendLead_)));
    var tl = lgV170108TestLead(), tb = JSON.parse(L0().body);
    ok('یک‌بارهٔ لید آزمایشی «آزمون لین E» با شکل E40، در فهرست CI', /HTTP 200/.test(tl) && tb.fullName === 'آزمون لین E' && tb.source === 'Bot' &&
      CI_ONCE_AUTO.indexOf('lgV170108TestLead') >= 0 && CI_ONCE_ALLOW.indexOf('lgV170108TestLead') >= 0, tl);

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
    /* E48 */
    TG_CFG_ = { TG_NAMES: { chief: 'همکار آزمون' } }; TG_OUTBOX = []; TG_MEM['lg:now'] = String(new Date('2026-11-04T12:00:00+03:30').getTime());
    TG_MEM['pnl:thers'] = [{ name: 'همکار آزمون یک', chat: '5550091', status: 'فعال' }, { name: 'درمانگر دیگر', chat: '5550092', status: 'فعال' }];
    ok('E48: تیک فقط یک کارت پیش‌نمایش برای مالک، نه پیام به گیرنده؛ بار دوم هیچ', lgE48Tick_() === true && TG_OUTBOX.length === 1 && TG_OUTBOX[0].chat === '9001' &&
      JSON.stringify(TG_OUTBOX[0].markup).indexOf('lgn:e48') > -1 && lgE48Tick_() === false && TG_OUTBOX.length === 1 && /lgE48Tick_/.test(String(tgTick5)));
    TG_OUTBOX = []; lgOnCb_('5550092', 'lgn:e48');
    ok('E48: دکمه فقط برای مالک', TG_OUTBOX.length === 1 && TG_OUTBOX[0].text === T_PNL_NO);
    TG_OUTBOX = []; lgOnCb_('9001', 'lgn:e48');
    ok('E48: با دکمهٔ مالک فقط به همان یک نفر، با نام کوچک', TG_OUTBOX.length === 2 && TG_OUTBOX[0].chat === '5550091' && TG_OUTBOX[0].text.indexOf('سلام همکار جان') === 0 && /رفت/.test(TG_OUTBOX[1].text));
    TG_OUTBOX = []; lgOnCb_('9001', 'lgn:e48');
    ok('E48: فقط یک بار', TG_OUTBOX.length === 1 && /قبلاً رفته/.test(TG_OUTBOX[0].text));
    TG_MEM['pnl:thers'].push({ name: 'همکار آزمون دو', chat: '5550093', status: 'فعال' }); delete TG_MEM['lgp:LG_E48'];
    ok('E48: دو نفر هم‌نام یعنی هیچ ارسال', lgE48Target_() === null);
    TG_CFG_ = {};
    /* E46: راز از توکن بات */
    delete TG_MEM['pnlp:TG_BRIDGE_HANDOFF_SECRET']; TG_MEM['br:token'] = 'test-only-bot-token';
    var dsec = brB64_(Utilities.computeHmacSha256Signature('tajrobeh-handoff-v1', 'test-only-bot-token'));
    ok('E46: راز handoff = base64url(HMAC(توکن، tajrobeh-handoff-v1)) بی پرکننده (روی کد قبلی مردود)', brHandoffSecret_() === dsec && dsec.length === 43 && !/=/.test(dsec));
    var t46 = brToken_('5550060', '+989000000000').split('.');   /* pii:ok ساختگی */
    ok('E46: نشانه با همان راز امضا می‌شود و شمار پیوند بالا می‌رود', t46[1] === brB64_(Utilities.computeHmacSha256Signature(t46[0], dsec)) && brLeadState_().ln >= 1 && /پیوند «ورود به تجربه» امروز/.test(brLeadNightLine_()));
    ok('E46: یک‌بارهٔ اثر انگشت بی خود راز، در فهرست CI', /^توکن بات: [0-9a-f]{8} · راز handoff \(tajrobeh-handoff-v1\): [0-9a-f]{8}/.test(lgV170110Fp()) && lgV170110Fp().indexOf(dsec) < 0 &&
      CI_ONCE_AUTO.indexOf('lgV170110Fp') >= 0 && CI_ONCE_ALLOW.indexOf('lgV170110Fp') >= 0, lgV170110Fp());
    ok('یک‌بارهٔ شمار v170.109 فقط‌خواندنی و در فهرست CI', /^دعوت تا الان: \d+/.test(lgV170109Count()) && CI_ONCE_AUTO.indexOf('lgV170109Count') >= 0 && CI_ONCE_ALLOW.indexOf('lgV170109Count') >= 0);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_OWNER_CHAT = keep.own; TG_CFG_ = keep.cfg;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ ورود و پل درست است'));
  return tgTestTally_(log, fail);
}
