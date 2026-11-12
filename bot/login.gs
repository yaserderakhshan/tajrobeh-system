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
/* v170.116 (E61، متن K273 تأییدشدهٔ یاسر): دعوت همهٔ درمانگرهای فعال به پل، روز استقرار دستهٔ v پل؛ دکمه نشانی ریشهٔ پل */
var T_LG_INV2 = 'سلام {نام}. پل تجربه دارد برای پذیرش مراجعان تازه آماده می‌شود. وقت‌هایی را که در بات داده بودید به پنلتان آوردیم. لطفاً وارد شوید، وقت‌ها را تأیید کنید و اطلاعات نمایه‌تان را کامل کنید؛ مراجعان تازه شما را با همین نمایه می‌بینند.';
var LG_BRIDGE_ROOT = 'https://bridge.tajrobeh.life/';
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
  if (data === 'lgn:all2') {
    if (String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, T_PNL_NO);
    if (!lgInWindow_()) return tgSend_(chat, '⏰ دعوت فقط ساعت ۱۰ تا ۲۰ تهران فرستاده می‌شود. همین دکمه را در آن ساعت بزنید.');
    var o2 = lgInvite2All_();
    return tgSend_(chat, '📨 دعوت پل (E61): ' + tgFa_(o2.sent) + ' درمانگر پیام گرفتند · بی چت ' + tgFa_(o2.none) + ' · از قبل ' + tgFa_(o2.had) + '.');
  }
  if (data === 'lgn:all') {
    if (String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, T_PNL_NO);
    if (!lgInWindow_()) return tgSend_(chat, '⏰ دعوت فقط ساعت ۱۰ تا ۲۰ تهران فرستاده می‌شود. همین دکمه را در آن ساعت بزنید.');
    var o = lgInviteAll_();
    return tgSend_(chat, '📨 دعوت «ورود به تجربه»: ' + tgFa_(o.sent) + ' درمانگر دعوت گرفتند · بی چت ' + tgFa_(o.none) + ' · از قبل ' + tgFa_(o.had) + '.');
  }
  if (data === 'lgn:wv1') {
    if (String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, T_PNL_NO);
    lgProp_('WV1_GO', Utilities.formatDate(new Date(lgNow_()), TG_TZ, 'yyyy-MM-dd HH:mm'));
    var rr = wvTick_(true);
    return tgSend_(chat, '📨 موج ۱ شروع شد. ' + rr + (lgInWindow_() ? '' : ' ارسال از ساعت ۱۰ ادامه پیدا می‌کند.'));
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
/* ───── ۵) موج ۱ پل از بات (E49، E51، E52): فهرست از GET امضادار پل؛ شروع فقط با دکمهٔ مالک ───── */
var T_WV_CLIENT = 'سلام {نام}. حساب شما در اپ تازهٔ تجربه آماده است؛ جلسه‌ها و کیف پولتان آنجاست. با دکمهٔ زیر وارد شوید.';
var T_WV_THER = 'سلام {نام}. دعوت مراجعان شما به پنل تازهٔ تجربه از امروز شروع شد. در پنل، بخش «مراجعان من»، کنار نام هر مراجع دکمهٔ «پیوند دعوت» هست. اگر مراجعی پیامک را ندید یا خارج از ایران است، همین پیوند را برایش بفرستید؛ با آن وارد می‌شود و به شما وصل می‌ماند.';
var T_WV_ABROAD = 'سلام {نام}. این مراجعان شما خارج از ایران هستند و پیامک به آن‌ها نمی‌رسد: {فهرست}. لطفاً امروز پیوند دعوت هر کدام را از «مراجعان من» بردارید و برایشان بفرستید؛ با آن وارد می‌شوند و به شما وصل می‌مانند.';
var WV_BATCH = 50;
var WV_URL_DEF = 'https://bridge.tajrobeh.life/api/v2/legacy/bot-feed?wave=1';
/** نشانی خوراک موج (قرارداد لین D، E55): پیش‌فرض bot-feed؛ BRIDGE_WAVE_URL جایش را می‌گیرد؛ off یعنی خاموش؛ فقط bridge.tajrobeh.life */
function wvUrl_() {
  var v = String(cfg_('BRIDGE_WAVE_URL', '') || '').trim();
  if (/^(off|0|خاموش)$/i.test(v)) return '';
  v = v || WV_URL_DEF;
  return /^https:\/\/bridge\.tajrobeh\.life\//.test(v) ? v : '';
}
/** GET امضادار (E55): سرآیند Tajrobeh-Timestamp و Tajrobeh-Signature = v1=<هگز HMAC("legacy-bot-feed.v1:<ts>:<پرسمان خام>")>. خروجی {clients, therapists} یا null */
function wvFetch_() {
  var url = wvUrl_(), sec = brHandoffSecret_(); if (!url || !sec) return null;
  var q = url.indexOf('?') > -1 ? url.slice(url.indexOf('?') + 1) : '', j;
  if (TG_DRY) { j = TG_MEM['wv:data'] || null; TG_MEM['wv:sigtext'] = 'legacy-bot-feed.v1:<ts>:' + q; }
  else {
    var ts = String(Math.floor(Date.now() / 1000));
    var r = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true, followRedirects: false,
      headers: { 'Tajrobeh-Timestamp': ts, 'Tajrobeh-Signature': brSign_('legacy-bot-feed.v1:' + ts + ':' + q, sec) } });
    if (r.getResponseCode() !== 200) { Logger.log('wvFetch_: HTTP ' + r.getResponseCode()); return null; }
    try { j = JSON.parse(r.getContentText()); } catch (e) { return null; }
  }
  if (!j) return null;
  var thById = {};
  var th = (j.therapists || []).map(function (t) { var o = { id: String(t.therapistId || ''), tid: String(t.telegramId || ''), first: String(t.displayName || '').split(/\s+/)[0] }; thById[o.id] = o; return o; });
  var cl = (j.clients || []).map(function (c) { var t = thById[String(c.therapistId || '')] || {};
    return { tid: String(c.telegramId || ''), first: String(c.firstName || ''), url: String(c.inviteUrl || ''), ther: String(t.tid || ''), abroad: c.abroad === true }; });
  return { clients: cl, therapists: th };
}
/* مجموعهٔ «فرستاده‌شده» در چند کلید Script Property (هر کدام زیر ۸۰۰۰ نویسه) */
function wvSent_(k) { var s = {}, i = 0, v; while ((v = lgProp_(k + i))) { v.split(',').forEach(function (x) { if (x) s[x] = 1; }); i++; } return s; }
function wvMark_(k, ids) {
  if (!ids.length) return;
  var i = 0; while (lgProp_(k + i)) i++;
  var last = i ? lgProp_(k + (i - 1)) : '', add = ids.join(',');
  if (i && last.length + add.length + 1 < 8000) lgProp_(k + (i - 1), last + ',' + add); else lgProp_(k + i, add);
}
/** از tgTick5 و دکمهٔ مالک. بی WV1_GO فقط یک بار کارت شروع برای مالک؛ بعد ۵۰ تا در هر نوبت، ساعت ۱۰ تا ۲۰، هر نفر یک بار */
function wvTick_(force) {
  var d; try { d = wvFetch_(); } catch (e) { return 'رابط موج: ' + String(e.message || e).slice(0, 80); }
  if (!d) return 'رابط موج آماده نیست';
  var cl = d.clients.filter(function (c) { return /^\d{4,}$/.test(c.tid) && /^https:\/\/bridge\.tajrobeh\.life\/i\//.test(c.url); });
  if (!lgProp_('WV1_GO')) {
    if (lgProp_('WV1_CARD')) return 'منتظر دکمهٔ مالک';
    var abr = {}; cl.forEach(function (c) { if (c.abroad && c.ther) abr[c.ther] = 1; });
    tgSend_(String(TG_OWNER_CHAT), '📨 <b>موج ۱ پل از بات</b>\nدعوت مراجع: ' + tgFa_(cl.length) + ' · پیام درمانگر دارای حساب: ' + (/^(1|بله|yes|on)$/i.test(String(cfg_('WAVE_THER_MSG', '') || '').trim()) ? tgFa_(d.therapists.length) : 'خاموش') +
      ' · پیام «مراجع خارج»: ' + tgFa_(Object.keys(abr).length) + ' درمانگر\nهر نفر یک بار، دسته‌های ۵۰تایی، ساعت ۱۰ تا ۲۰.' +
      '\n\n<b>پیش‌نمایش متن‌ها</b>\n• مراجع: ' + tgEsc_(T_WV_CLIENT) + '\n• درمانگر: ' + tgEsc_(T_WV_THER) + '\n• مراجع خارج: ' + tgEsc_(T_WV_ABROAD), { inline_keyboard: [[{ text: '📨 شروع موج ۱', callback_data: 'lgn:wv1' }]] });
    lgProp_('WV1_CARD', '1');
    return 'کارت شروع برای مالک رفت';
  }
  if (!lgInWindow_()) return 'بیرون از ساعت ۱۰ تا ۲۰';
  var n = 0, out = { c: 0, t: 0, a: 0 };
  var sc = wvSent_('WV1_C'), nc = [];
  for (var i = 0; i < cl.length && n < WV_BATCH; i++) {
    var c = cl[i]; if (sc[c.tid]) continue;
    tgSend_(c.tid, T_WV_CLIENT.replace('{نام}', c.first || 'دوست عزیز'), { inline_keyboard: [[{ text: '🔑 ' + LG_BTN, url: c.url }]] });
    nc.push(c.tid); n++; out.c++;
  }
  wvMark_('WV1_C', nc);
  var st = wvSent_('WV1_T'), nt = [], thOn = /^(1|بله|yes|on)$/i.test(String(cfg_('WAVE_THER_MSG', '') || '').trim());   /* E51 پیام عمومی درمانگر: فقط با کلید (E55 فقط مراجع و «خارج») */
  for (var j = 0; thOn && j < d.therapists.length && n < WV_BATCH; j++) {
    var t = d.therapists[j]; if (!/^\d{4,}$/.test(t.tid) || st[t.tid]) continue;
    tgSend_(t.tid, T_WV_THER.replace('{نام}', t.first || 'همکار گرامی')); nt.push(t.tid); n++; out.t++;
  }
  wvMark_('WV1_T', nt);
  var byT = {}; cl.forEach(function (c) { if (c.abroad && /^\d{4,}$/.test(c.ther)) (byT[c.ther] = byT[c.ther] || []).push(c.first || '؟'); });
  var thName = {}; d.therapists.forEach(function (t) { thName[t.tid] = t.first; });
  var sa = wvSent_('WV1_A'), na = [];
  Object.keys(byT).forEach(function (tid) {
    if (n >= WV_BATCH || sa[tid]) return;
    tgSend_(tid, T_WV_ABROAD.replace('{نام}', thName[tid] || 'همکار گرامی').replace('{فهرست}', byT[tid].join('، '))); na.push(tid); n++; out.a++;
  });
  wvMark_('WV1_A', na);
  if (n) { var tot = {}; try { tot = JSON.parse(lgProp_('WV1_N') || '{}') || {}; } catch (e2) {} ['c', 't', 'a'].forEach(function (k) { tot[k] = (tot[k] || 0) + out[k]; }); lgProp_('WV1_N', JSON.stringify(tot)); }
  return 'این نوبت: مراجع ' + out.c + '، درمانگر ' + out.t + '، خارج ' + out.a;
}
function wvNightLine_() {
  var t = {}; try { t = JSON.parse(lgProp_('WV1_N') || '{}') || {}; } catch (e) {}
  return lgProp_('WV1_GO') ? '📨 موج ۱ از بات تا امروز: مراجع ' + tgFa_(t.c || 0) + ' · درمانگر ' + tgFa_(t.t || 0) + ' · پیام «خارج» ' + tgFa_(t.a || 0) : '';
}
try { TG_NIGHT_LINES.push(wvNightLine_); } catch (eWn) {}
/** یک‌بارهٔ خودکار v170.112 (Q21، فقط‌خواندنی): نشانی‌های عمومی دریافت USDT با نام شبکه */
function lgV170112Addr() {
  var a = function (k) { try { return tgPaySet_(k) || 'خالی'; } catch (e) { return 'خطا'; } };
  return 'USDT روی TRON (TRC20): ' + a('addr_tron') + ' · USDT روی BNB Smart Chain (BEP20): ' + a('addr_bsc');
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
/* ───── E61: دعوت همهٔ درمانگرهای فعال به پل (فقط با دکمهٔ مالک، یک بار برای هر نفر، مجموعهٔ جدای LG_INV2) ───── */
function lgInv2Kb_() { return { inline_keyboard: [[{ text: LG_BTN, url: LG_BRIDGE_ROOT }]] }; }
function lgInv2Rows_() { return (TG_DRY ? (TG_MEM['pnl:thers'] || []) : tgTherapistRows_()).filter(function (t) { return t && !/پایان|غیرفعال|متوقف/.test(String(t.status || '')); }); }
/** کارت مالک: پیش‌نمایش عین متن و شمار گیرنده‌ها؛ چیزی برای درمانگرها نمی‌رود */
function lgInvite2Card_() {
  var inv = {}; try { inv = JSON.parse(lgProp_('LG_INV2') || '{}') || {}; } catch (e) {}
  var n = 0; lgInv2Rows_().forEach(function (t) { var c = typeof pnlChatOf_ === 'function' ? pnlChatOf_(t) : String(t.chat || ''); if (c && !inv[c]) n++; });
  tgSend_(String(TG_OWNER_CHAT), '📨 <b>دعوت درمانگرها به پل (E61)</b>\nپیش‌نمایش پیام:\n\n' + tgEsc_(T_LG_INV2.replace('{نام}', 'نام')) + '\n\nدکمه: «' + LG_BTN + '» به ' + LG_BRIDGE_ROOT +
    '\n\nبا دکمهٔ زیر برای ' + tgFa_(n) + ' درمانگر فعالِ وصل به بات می‌رود (فقط ساعت ۱۰ تا ۲۰).', { inline_keyboard: [[{ text: '📨 ارسال به همهٔ درمانگران', callback_data: 'lgn:all2' }]] });
  return n;
}
function lgInvite2All_() {
  var inv = {}; try { inv = JSON.parse(lgProp_('LG_INV2') || '{}') || {}; } catch (e) {}
  var out = { sent: 0, none: 0, had: 0 }, now = Utilities.formatDate(new Date(lgNow_()), TG_TZ, 'yyyy-MM-dd HH:mm');
  lgInv2Rows_().forEach(function (t) {
    var chat = typeof pnlChatOf_ === 'function' ? pnlChatOf_(t) : String(t.chat || '');
    if (!chat) { out.none++; return; }
    if (inv[chat]) { out.had++; return; }
    tgSend_(chat, T_LG_INV2.replace('{نام}', tgEsc_(String(t.name || '').split(/\s+/)[0] || 'همکار گرامی')), lgInv2Kb_());
    inv[chat] = now; out.sent++;
  });
  lgProp_('LG_INV2', JSON.stringify(inv));
  return out;
}
/** یک‌بارهٔ خودکار v170.116: کارت مالک دعوت پل؛ بیرون از ۱۰ تا ۲۰ تهران، تریگر یک‌باره برای ۱۰:۰۵ بعد */
function lgV170116Inv2() {
  if (lgInWindow_()) return 'کارت دعوت پل برای مالک رفت · گیرنده‌ها: ' + lgInvite2Card_();
  if (!TG_DRY) {
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'lgInv2Run') ScriptApp.deleteTrigger(t); });
    var d = new Date(lgNow_() + 3600000), day = Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd'), at = new Date(day + 'T10:05:00+03:30');
    if (at.getTime() <= lgNow_()) at = new Date(at.getTime() + 86400000);
    ScriptApp.newTrigger('lgInv2Run').timeBased().at(at).create();
    return 'بیرون از ساعت ۱۰ تا ۲۰؛ تریگر یک‌باره برای ' + Utilities.formatDate(at, TG_TZ, 'yyyy-MM-dd HH:mm');
  }
  TG_MEM['lg:arm2'] = 1; return 'تریگر یک‌باره';
}
function lgInv2Run() {
  if (!TG_DRY) ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'lgInv2Run') ScriptApp.deleteTrigger(t); });
  if (lgInWindow_()) lgInvite2Card_();
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
    ok('E55: سرآیند Tajrobeh-Signature = v1=HMAC(«reception-public-lead.v1:<ts>:<بدنه>»)', L0().h['Tajrobeh-Signature'] === 'v1=' + brHex_(Utilities.computeHmacSha256Signature('reception-public-lead.v1:' + L0().h['Tajrobeh-Timestamp'] + ':' + L0().body, 'test-only-handoff-secret-0123456789', Utilities.Charset.UTF_8)) && !L0().h['X-Tajrobeh-Signature']);   /* v170.126: بدنهٔ فارسی؛ امضا UTF-8 (E17) */
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
    /* E61 */
    TG_MEM['lg:now'] = String(new Date('2026-11-06T12:00:00+03:30').getTime()); TG_OUTBOX = []; delete TG_MEM['lgp:LG_INV2'];
    var r61 = lgV170116Inv2();
    ok('E61: یک‌باره فقط کارت پیش‌نمایش برای مالک، با عین متن و دکمهٔ lgn:all2 (روی کد قبلی مردود)', TG_OUTBOX.length === 1 && TG_OUTBOX[0].chat === '9001' &&
      TG_OUTBOX[0].text.indexOf('مراجعان تازه شما را با همین نمایه می‌بینند') > -1 && JSON.stringify(TG_OUTBOX[0].markup).indexOf('lgn:all2') > -1 && /۲ درمانگر فعال/.test(TG_OUTBOX[0].text), r61);
    TG_OUTBOX = []; lgOnCb_('5550071', 'lgn:all2');
    ok('E61: دکمه فقط برای مالک', TG_OUTBOX.length === 1 && TG_OUTBOX[0].text === T_PNL_NO);
    TG_OUTBOX = []; lgOnCb_('9001', 'lgn:all2');
    var s61 = TG_OUTBOX.filter(function (x) { return x.text && x.text.indexOf('سلام') === 0; });
    ok('E61: همهٔ درمانگرهای فعال با چت، حتی دعوت‌شدهٔ قبلی، با دکمهٔ نشانی ریشهٔ پل', s61.map(function (x) { return x.chat; }).sort().join() === '5550071,5550074' &&
      JSON.stringify(s61[0].markup).indexOf('"url":"https://bridge.tajrobeh.life/"') > -1 && s61[0].text.indexOf('{نام}') < 0 && /۲ درمانگر پیام گرفتند/.test(TG_OUTBOX[TG_OUTBOX.length - 1].text), JSON.stringify(s61).slice(0, 200));
    TG_OUTBOX = []; lgOnCb_('9001', 'lgn:all2');
    ok('E61: هر درمانگر فقط یک بار', TG_OUTBOX.length === 1 && /۰ درمانگر پیام گرفتند/.test(TG_OUTBOX[0].text));
    TG_MEM['lg:now'] = String(new Date('2026-11-06T21:30:00+03:30').getTime()); TG_OUTBOX = []; lgOnCb_('9001', 'lgn:all2');
    ok('E61: بیرون از ۱۰ تا ۲۰ نه؛ یک‌باره در فهرست CI', TG_OUTBOX.length === 1 && /۱۰ تا ۲۰/.test(TG_OUTBOX[0].text) && CI_ONCE_AUTO.indexOf('lgV170116Inv2') >= 0 && CI_ONCE_ALLOW.indexOf('lgV170116Inv2') >= 0);
    /* موج ۱ (E49، E51، E52) */
    TG_CFG_ = {}; TG_OUTBOX = []; TG_MEM['lg:now'] = String(new Date('2026-11-04T12:00:00+03:30').getTime());
    ['WV1_GO', 'WV1_CARD', 'WV1_C0', 'WV1_T0', 'WV1_A0', 'WV1_N'].forEach(function (k) { delete TG_MEM['lgp:' + k]; });
    TG_MEM['wv:data'] = { wave: 1, clients: [{ clientId: 'c1', telegramId: 5550101, firstName: 'الف', inviteCode: 'AAA', inviteUrl: 'https://bridge.tajrobeh.life/i/AAA', therapistId: 't1', therapistName: 'درمانگر آزمون', abroad: true },
      { clientId: 'c2', telegramId: 5550102, firstName: 'ب', inviteUrl: 'https://bridge.tajrobeh.life/i/BBB', therapistId: 't1' },
      { clientId: 'c3', firstName: 'بی تلگرام', inviteUrl: 'https://bridge.tajrobeh.life/i/CCC' }, { clientId: 'c4', telegramId: 5550103, firstName: 'بد', inviteUrl: 'https://evil.example/i/x' }],
      therapists: [{ therapistId: 't1', displayName: 'درمانگر آزمون', telegramId: 5550201 }] };
    ok('موج ۱: بی دکمهٔ مالک فقط یک کارت شروع، هیچ پیام به کسی', /کارت شروع/.test(wvTick_()) && TG_OUTBOX.length === 1 && TG_OUTBOX[0].chat === '9001' &&
      JSON.stringify(TG_OUTBOX[0].markup).indexOf('lgn:wv1') > -1 && /دعوت مراجع: ۲/.test(TG_OUTBOX[0].text) && /منتظر/.test(wvTick_()) && TG_OUTBOX.length === 1, JSON.stringify(TG_OUTBOX[0]));
    TG_OUTBOX = []; lgOnCb_('5550102', 'lgn:wv1');
    ok('موج ۱: دکمه فقط مالک', TG_OUTBOX.length === 1 && TG_OUTBOX[0].text === T_PNL_NO && !TG_MEM['lgp:WV1_GO']);
    TG_OUTBOX = []; lgOnCb_('9001', 'lgn:wv1');
    var toC = TG_OUTBOX.filter(function (x) { return x.chat === '5550101' || x.chat === '5550102'; });
    ok('موج ۱: مراجع با پیوند /i/ خودش؛ بی تلگرام و نشانی بیگانه هیچ', toC.length === 2 && toC[0].markup.inline_keyboard[0][0].url === 'https://bridge.tajrobeh.life/i/AAA' && toC[0].text.indexOf('سلام الف.') === 0 &&
      !TG_OUTBOX.some(function (x) { return x.chat === '5550103'; }));
    var toT = TG_OUTBOX.filter(function (x) { return x.chat === '5550201'; });
    ok('E55: درمانگر فقط پیام «خارج» با نام کوچک مراجع خارج (E51 خاموش)؛ امضای bot-feed', toT.length === 1 && /^سلام درمانگر\./.test(toT[0].text) && /خارج از ایران هستند و پیامک به آن‌ها نمی‌رسد: الف\./.test(toT[0].text) &&
      wvUrl_() === WV_URL_DEF && TG_MEM['wv:sigtext'] === 'legacy-bot-feed.v1:<ts>:wave=1', JSON.stringify(toT));
    TG_OUTBOX = [];
    ok('موج ۱: هر نفر یک بار؛ شمارش در گزارش شب', /مراجع 0، درمانگر 0، خارج 0/.test(wvTick_()) && TG_OUTBOX.length === 0 && /مراجع ۲ · درمانگر ۰ · پیام «خارج» ۱/.test(wvNightLine_()), wvNightLine_());
    TG_MEM['lg:now'] = String(new Date('2026-11-04T21:00:00+03:30').getTime()); delete TG_MEM['lgp:WV1_C0'];
    ok('موج ۱: بیرون از ۱۰ تا ۲۰ هیچ', /بیرون/.test(wvTick_()) && TG_OUTBOX.length === 0);
    TG_CFG_ = { BRIDGE_WAVE_URL: 'https://evil.example/w' };
    ok('موج ۱: فقط نشانی پل پذیرفته می‌شود', wvUrl_() === '' && /آماده نیست/.test(wvTick_()));
    TG_CFG_ = { BRIDGE_WAVE_URL: 'off' };
    ok('موج ۱: off خاموش می‌کند', wvUrl_() === '');
    ok('یک‌بارهٔ نشانی تتر در فهرست CI', CI_ONCE_AUTO.indexOf('lgV170112Addr') >= 0 && CI_ONCE_ALLOW.indexOf('lgV170112Addr') >= 0 && /TRON \(TRC20\)/.test(lgV170112Addr()));
    TG_CFG_ = {};
    /* E53 */
    TG_CFG_ = {}; TG_MEM['br:leads'] = []; TG_MEM['br:leadCode'] = 200;
    ok('E53: لید فرم سایت با source=Website و موبایل به پل (روی کد قبلی مردود)', brLeadPush_({ name: 'مراجع سایت', phone: '09000000002', channel: 'فرم سایت', note: '', firstText: 'x' }, 0) === 'ok' &&   /* pii:ok */
      JSON.parse(TG_MEM['br:leads'][0].body).source === 'Website' && JSON.parse(TG_MEM['br:leads'][0].body).mobile === '09000000002');   /* pii:ok */
    ok('E53: فرم سایت بی موبایل و لید واتس‌اپ به پل نمی‌رود', brLeadPush_({ name: 'x', phone: '', channel: 'فرم سایت', note: '' }, 0) === 'skip' && brLeadPush_({ name: 'x', phone: '+1', channel: 'WhatsApp', note: '' }, 0) === 'skip' && TG_MEM['br:leads'].length === 1);
    delete TG_MEM['pnlp:TG_BRIDGE_HANDOFF_SECRET']; TG_MEM['br:token'] = 'test-only-bot-token';
    TG_MEM['thpub'] = [{ n: 'درمانگر یک', d: 'درمانگر یک', a: 1, g: 'f', sp: 'شناختی', ab: 1, tr: 2 }]; TG_MEM['br:now'] = '1790000000000';
    TG_MEM['pnl:thers'] = [{ name: 'درمانگر یک', code: 'T1', chat: '5550301', rate: 100, status: 'فعال' }];
    var fsig = 'v1=' + brHex_(Utilities.computeHmacSha256Signature('bot-match-feed.v1:1790000000:api=br_ther', brHandoffSecret_()));
    var feed = tgApiRoute_({ api: 'br_ther', ts: '1790000000', sig: fsig });
    var fj = feed && typeof feed.getContent === 'function' ? JSON.parse(feed.getContent()) : feed;
    ok('E53: خوراک مچ امضادار، فقط فیلد درمانگر', fj.ok === true && fj.therapists.length === 1 && fj.therapists[0].approach === 'شناختی' && fj.therapists[0].code === 'T1' && fj.therapists[0].abroad === true &&
      JSON.stringify(fj).indexOf('lead') < 0, JSON.stringify(fj).slice(0, 300));
    var bad = tgApiRoute_({ api: 'br_ther', ts: '1790000000', sig: '00' }), bj = bad && typeof bad.getContent === 'function' ? JSON.parse(bad.getContent()) : bad;
    var old = tgApiRoute_({ api: 'br_ther', ts: '1789990000', sig: brHex_(Utilities.computeHmacSha256Signature('bot-match-feed.v1:1789990000:api=br_ther', brHandoffSecret_())) }), oj = old && typeof old.getContent === 'function' ? JSON.parse(old.getContent()) : old;
    ok('E53: امضای غلط یا کهنه رد می‌شود', bj.ok === false && oj.ok === false);
    /* E60 */
    TG_MEM['weekrules'] = [{ name: 'درمانگر یک', iso: 7, hhmm: '18:00', pool: 'ایران', kind: TG_KIND_MEET }, { name: 'درمانگر یک', iso: 1, hhmm: '10:00', pool: 'ایران', kind: TG_KIND_SESS }];
    TG_MEM['slotnow'] = '2026-11-05T08:00:00+03:30'; TG_MEM['offrows'] = [];
    TG_MEM['slotrows'] = [['درمانگر یک', new Date('2026-11-07T12:00:00+03:30'), 'عصر', '17:00', 'آنلاین', 'آزاد', 'ایران'], ['درمانگر یک', new Date('2026-11-08T12:00:00+03:30'), 'عصر', '16:00', 'آنلاین', 'رزرو شده', 'ایران']];
    delete TG_MEM['brf:cache'];
    var f2 = tgApiRoute_({ api: 'br_ther', ts: '1790000000', sig: fsig }), f2j = f2 && typeof f2.getContent === 'function' ? JSON.parse(f2.getContent()) : f2, t2 = (f2j.therapists || [])[0] || {};
    var wI = (t2.weekly || []).filter(function (w) { return w.kind === 'intro'; })[0] || {}, wT = (t2.weekly || []).filter(function (w) { return w.kind === 'therapy'; })[0] || {};
    ok('E60: خوراک مچ وقت هفتگی (یکشنبه=0) و ردیف آزاد معارفه دارد، رزروشده نه (روی کد قبلی مردود)', f2j.version === 2 && wI.weekday === 0 && wI.from === '18:00' && wI.to === '18:20' &&
      wT.weekday === 1 && wT.from === '10:00' && wT.to > '10:00' && (t2.introSlots || []).length === 1 && t2.introSlots[0].date === '2026-11-07' && t2.introSlots[0].from === '17:00' && t2.introSlots[0].to === '17:20' &&
      JSON.stringify(f2j).indexOf('رزرو') < 0, JSON.stringify(t2).slice(0, 300));
    ok('E62.۴: یک‌بارهٔ سنجش خوراک فقط شمار می‌دهد، بی نام', /درمانگر 1/.test(brV170117Stat()) && brV170117Stat().indexOf('درمانگر یک') < 0 && CI_ONCE_AUTO.indexOf('brV170117Stat') >= 0 && CI_ONCE_ALLOW.indexOf('brV170117Stat') >= 0, brV170117Stat());
    /* E64: کش و راه برعکس */
    var cached = tgApiRoute_({ api: 'br_ther', ts: '1790000000', sig: fsig }), cj = cached && typeof cached.getContent === 'function' ? JSON.parse(cached.getContent()) : cached;
    TG_MEM['weekrules'] = [];
    var c2 = tgApiRoute_({ api: 'br_ther', ts: '1790000000', sig: fsig }), c2j = c2 && typeof c2.getContent === 'function' ? JSON.parse(c2.getContent()) : c2;
    ok('E64: خوراک از کش می‌آید (دادهٔ تازه تا تیک بعدی دیده نمی‌شود) و زمان ساخت ثبت می‌شود (روی کد قبلی مردود)', (c2j.therapists[0].weekly || []).length === (cj.therapists[0].weekly || []).length && (cj.therapists[0].weekly || []).length > 0 && JSON.parse(lgProp_('BRF')).buildMs >= 0);
    TG_CFG_ = { BRIDGE_SLOTS_URL: 'off' }; TG_MEM['br:slots'] = [];
    ok('E64: تیک خوراک را تازه می‌کند و با off چیزی نمی‌فرستد', brFeedTick_() === 'cache' && (brFeedCacheGet_().therapists[0].weekly || []).length === 0 && TG_MEM['br:slots'].length === 0);
    ok('E65: بی تنظیم، نشانی پیش‌فرض legacy/bot-slots/intake پل', (TG_CFG_ = {}, brSlotsUrl_() === BR_SLOTS_URL_DEF) && /legacy\/bot-slots\/intake$/.test(BR_SLOTS_URL_DEF));
    ok('E66: نرخ جلسه به تومان و طول جلسه در خوراک (روی کد قبلی مردود)', (TG_MEM['pnl:thers'][0].rate = '۱٬۲۰۰٬۰۰۰', TG_MEM['pnl:thers'][0].slen = '50', brFeedBuild_(1790000000, false).therapists[0].rateToman === 1200000) && brFeedBuild_(1790000000, false).therapists[0].sessionMinutes === 50 &&
      (TG_MEM['pnl:thers'][0].rate = '', brFeedBuild_(1790000000, false).therapists[0].rateToman === null));
    ok('E68: v1UserId از ستون v1_user_id؛ خالی یعنی فیلد نمی‌آید (روی کد قبلی مردود)', (TG_MEM['pnl:thers'][0].v1 = '۴۲', brFeedBuild_(1790000000, false).therapists[0].v1UserId === 42) &&
      (TG_MEM['pnl:thers'][0].v1 = '', JSON.stringify(brFeedBuild_(1790000000, false).therapists[0]).indexOf('v1UserId') < 0));
    TG_CFG_ = { BRIDGE_SLOTS_URL: 'https://bridge.tajrobeh.life/api/v2/legacy/bot-slots/intake' };
    var p64 = brFeedTick_(), s64 = TG_MEM['br:slots'][0] || {}, ts64 = s64.h ? s64.h['Tajrobeh-Timestamp'] : '';
    ok('E64: با نشانی، خوراک امضاشده به پل می‌رود؛ بار دوم بی تغییر نه', p64 === 'push 200' && s64.url === TG_CFG_.BRIDGE_SLOTS_URL &&
      s64.h['Tajrobeh-Signature'] === brSign_('legacy-bot-slots.v1:' + ts64 + ':' + s64.body, brHandoffSecret_()) && JSON.parse(s64.body).therapists.length === 1 && brFeedTick_() === 'same' && TG_MEM['br:slots'].length === 1, p64);
    TG_CFG_ = { BRIDGE_SLOTS_URL: 'https://evil.example/x' };
    ok('E64: فقط نشانی پل؛ یک‌باره در فهرست CI', brFeedTick_() === 'cache' && CI_ONCE_AUTO.indexOf('brV170119Stat') >= 0 && /ساخت خوراک: \d+/.test(brV170119Stat()));
    TG_CFG_ = {}; delete TG_MEM['brf:cache'];
    delete TG_MEM['weekrules']; delete TG_MEM['slotrows']; delete TG_MEM['slotnow']; delete TG_MEM['offrows'];
    /* E62.۳ ورودی مدرسه */
    TG_CFG_ = {}; TG_MEM['br:sch'] = []; TG_MEM['br:schCode'] = 200; delete TG_MEM['lgp:BRL'];
    var r62 = brSchIntake_({ form_id: '19', entry_id: 5, names: { first_name: 'آزمون' }, mobile: '09000000003', course: '', _fluentform_19_fluentformnonce: 'n', __fluent_form_embded_post_id: '1', _wp_http_referer: '/x' });   /* pii:ok */
    var s62 = TG_MEM['br:sch'][0] || {}, b62 = s62.body ? JSON.parse(s62.body) : {};
    ok('E62.۳: فرم ۱۹ به ورودی مدرسهٔ پل با راز ساخته از راز مشترک، بی کلید داخلی فلوئنت (روی کد قبلی مردود)', r62 === 'ok' && s62.url === BR_SCH_URL_DEF &&
      s62.h['Tajrobeh-Intake-Secret'] === brB64_(Utilities.computeHmacSha256Signature('tajrobeh-school-intake-v1', brHandoffSecret_())) && !/=$/.test(s62.h['Tajrobeh-Intake-Secret']) &&
      b62.course === 'lacan' && b62.source === 'Website' && b62.mobile === '09000000003' && JSON.stringify(b62).indexOf('fluent') < 0 && !b62._wp_http_referer, JSON.stringify(s62).slice(0, 200));   /* pii:ok */
    ok('E62.۳: فرم دیگر به مدرسهٔ پل نمی‌رود؛ off خاموش می‌کند', brSchIntake_({ form_id: '7', mobile: '1' }) === 'skip' && (TG_CFG_ = { BRIDGE_SCH_URL: 'off' }, brSchIntake_({ form_id: '19', mobile: '1' }) === 'skip') && TG_MEM['br:sch'].length === 1);
    TG_CFG_ = {}; TG_MEM['br:schCode'] = 503;
    var q62 = brSchIntake_({ form_id: '19', mobile: '1' }), qq = brLeadState_().q;
    TG_MEM['br:schCode'] = 200; var n62 = TG_MEM['br:sch'].length; brLeadRetryTick_();
    ok('E62.۳: شکست ۵xx در صف مشترک می‌ماند و تیک بعدی دوباره می‌فرستد', q62 === 'later' && qq.length === 1 && qq[0].t === 'sch' && TG_MEM['br:sch'].length === n62 + 1 && brLeadState_().q.length === 0 && brLeadState_().sch.ok === 2);
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
