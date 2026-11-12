/**
 * biz.gs · v170.124 · ۲۰ آبان ۱۴۰۵ · بات روی حساب‌های رسمی (Telegram Business) (E6 بند ۸) · فقط حالت خشک تا اجازهٔ یاسر
 *
 * «درِ دیگر» همان بات، نه بات دوم؛ فقط پاسخ ثابت و منو، بی هوش مصنوعی؛ هیچ دادهٔ مراجع به هیچ مدلی نمی‌رود.
 * قاعده‌ها: (۱) پیام اول هر چت: معرفی کوتاه و راه «همکار» (۲) کلیدواژهٔ «همکار»: بات کنار می‌رود و پذیرش خبر می‌شود (۳) خارج از ساعت کاری یک اطلاع در روز
 * (۴) وسط گفت‌وگوی آدم هرگز: هر پیامی که خود صاحب حساب فرستاده ۲۴ ساعت بات را برای همان چت ساکت می‌کند (۵) فقط با TG_FEAT_BIZ و برای اتصال واقعی
 * فقط با TG_BIZ_LIVE=1 که یاسر بعد از انتخاب بات در تنظیمات تلگرام روشن می‌کند؛ بدون آن فقط حالت خشک (آزمون) کار می‌کند و هر update نادیده است.
 * ⚠️ نیازموده: آیا بات پیام‌های خودِ صاحب حساب را هم می‌بیند؟ این کد هر پیامی را که from آن شناسهٔ صاحب اتصال است «آدم» می‌داند؛ اگر تلگرام این پیام‌ها را نفرستد،
 * فقط کلیدواژه و پیام اول جواب می‌گیرند و وسط گفت‌وگوی آدم، بات تنها با «پیام اول هر چت» پاسخ می‌دهد (بعدش ساکت)، پس خطر محدود است.
 * ⛔ ساختن لید در پل (brLeadPush_) فقط بعد از اتصال واقعی و اجازهٔ یاسر؛ این‌جا فقط «لید خواسته شد» ثبت می‌شود.
 */
var BIZ_HUMAN_MS = 24 * 3600 * 1000;
var BIZ_T_INTRO = 'سلام، این پاسخ خودکار از بات مرکز تجربه زندگی است. پیام‌تان را همین‌جا بنویسید تا همکار پذیرش در اولین فرصت پاسخ بدهد. برای صحبت مستقیم با همکار، کلمهٔ «همکار» را بنویسید.';
var BIZ_T_COLLEAGUE = 'باشد، به همکار پذیرش خبر دادم. از این لحظه خود همکار پاسخ می‌دهد.';
var BIZ_T_OUTSIDE = 'پیام‌تان ثبت شد. الان بیرون از ساعت کاری پذیرش هستیم و همکار در ساعت کاری پاسخ می‌دهد.';
function bizDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function bizLive_() { return bizDry_() || String(cfg_('TG_BIZ_LIVE', '')) === '1'; }
function bizGet_(k) { if (bizDry_()) return TG_MEM['biz:' + k] || ''; return PropertiesService.getScriptProperties().getProperty('BIZ:' + k) || ''; }
function bizPut_(k, v) { if (bizDry_()) { TG_MEM['biz:' + k] = v; return; } PropertiesService.getScriptProperties().setProperty('BIZ:' + k, v); }
function bizNow_() { return bizDry_() && TG_MEM['biz:now'] ? Number(TG_MEM['biz:now']) : Date.now(); }
function bizMap_() { try { return JSON.parse(bizGet_('S') || '{}') || {}; } catch (e) { return {}; } }
function bizSaveMap_(m) {
  var ks = Object.keys(m); while (ks.length > 300) { var o = ks.sort(function (a, b) { return (m[a].t || 0) - (m[b].t || 0); })[0]; delete m[o]; ks = Object.keys(m); }
  bizPut_('S', JSON.stringify(m));
}
function bizSay_(bc, chat, text) {
  if (bizDry_()) { (TG_MEM['biz:sent'] = TG_MEM['biz:sent'] || []).push({ bc: bc, chat: String(chat), text: text }); }
  return tgApi_('sendMessage', { business_connection_id: bc, chat_id: chat, text: text });
}
function bizNotifyDesk_(chat) {
  if (bizDry_()) { (TG_MEM['biz:notify'] = TG_MEM['biz:notify'] || []).push(String(chat)); return; }
  try { var b = typeof stkBoss_ === 'function' ? stkBoss_() : null; if (b && b.chat) tgNotify_(b.chat, TG_NK.task, '📨 یک نفر از حساب رسمی «همکار» خواست. در تلگرام همان حساب پاسخ بدهید.', { ref: 'حساب رسمی' }); } catch (e) { tgErr_('bizNotifyDesk_', e); }
}
function bizInHours_(ms) {
  if (bizDry_() && TG_MEM['biz:hours']) return TG_MEM['biz:hours'] === 'in';
  return typeof grdInHours_ === 'function' ? grdInHours_(ms) : true;
}
/* true = update را بات برداشت (هرگز به بقیهٔ مسیرها نمی‌رود) */
function bizHandle_(update) {
  if (!update) return false;
  if (update.business_connection) {
    var c = update.business_connection;
    bizPut_('C', JSON.stringify({ id: c.id, uid: String((c.user && c.user.id) || ''), en: !!c.is_enabled }));
    return true;
  }
  var bm = update.business_message;
  if (!bm) return !!(update.edited_business_message || update.deleted_business_messages);
  if (!bizLive_()) return true;
  var conn = {}; try { conn = JSON.parse(bizGet_('C') || '{}') || {}; } catch (e) {}
  var bc = String(bm.business_connection_id || conn.id || ''), chat = bm.chat && bm.chat.id, from = bm.from && String(bm.from.id || '');
  if (!bc || !chat || (conn.en === false)) return true;
  var map = bizMap_(), key = String(chat), st = map[key] || null, now = bizNow_();
  if (conn.uid && from === conn.uid) { map[key] = { t: (st && st.t) || now, h: now, o: (st && st.o) || 0 }; bizSaveMap_(map); return true; }   /* صاحب حساب نوشته: ساکت */
  if (st && st.h && now - st.h < BIZ_HUMAN_MS) return true;
  var text = String(bm.text || bm.caption || '');
  if (/همکار/.test(text)) { bizSay_(bc, chat, BIZ_T_COLLEAGUE); bizNotifyDesk_(chat); map[key] = { t: (st && st.t) || now, h: now, o: (st && st.o) || 0 }; bizSaveMap_(map); return true; }
  if (!st) {
    bizSay_(bc, chat, BIZ_T_INTRO);
    map[key] = { t: now, h: 0, o: 0 };
    bizSaveMap_(map);
    if (bizDry_()) (TG_MEM['biz:lead'] = TG_MEM['biz:lead'] || []).push(key);   /* ⛔ ساختن لید واقعی بعد از اجازهٔ یاسر */
    return true;
  }
  if (!bizInHours_(now) && now - (st.o || 0) > 12 * 3600 * 1000) { bizSay_(bc, chat, BIZ_T_OUTSIDE); st.o = now; map[key] = st; bizSaveMap_(map); }
  return true;
}
function bizTests() {
  var out = [], pass = 0, fail = 0;
  function ok(n, c) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n); }
  var kD = TG_DRY, kM = TG_MEM, kO = TG_OUTBOX, kC = TG_CFG_, kG = typeof grdInHours_ === 'function' ? grdInHours_ : null;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; TG_CFG_ = {};
  var T0 = Date.UTC(2026, 10, 15, 6, 0);
  var msg = function (chat, text, from) { return { business_message: { business_connection_id: 'BC1', chat: { id: chat }, from: { id: from || chat }, text: text } }; };
  var said = function () { return TG_MEM['biz:sent'] || []; };
  try {
    bizHandle_({ business_connection: { id: 'BC1', user: { id: 9000 }, is_enabled: true } });
    TG_MEM['biz:now'] = T0;
    bizHandle_(msg(700, 'سلام وقت می‌خواستم'));
    ok('حساب رسمی: پیام اول، معرفی با business_connection_id', said().length === 1 && said()[0].bc === 'BC1' && said()[0].chat === '700' && /بات مرکز تجربه/.test(said()[0].text) && /همکار/.test(said()[0].text));
    ok('حساب رسمی: لید خواسته شد ولی لید واقعی نه', (TG_MEM['biz:lead'] || []).indexOf('700') > -1);
    bizHandle_(msg(700, 'یک سؤال دیگر'));
    ok('حساب رسمی: پیام دوم در ساعت کاری پاسخ ندارد', said().length === 1);
    TG_MEM['biz:hours'] = 'out'; TG_MEM['biz:now'] = T0 + 14 * 3600000;
    bizHandle_(msg(701, 'سلام')); var a0 = said().length;
    TG_MEM['biz:now'] = T0 + 14 * 3600000 + 60000;
    bizHandle_(msg(701, 'ادامه'));
    var a1 = said().length;
    TG_MEM['biz:now'] = T0 + 14 * 3600000 + 120000;
    bizHandle_(msg(701, 'باز هم'));
    ok('حساب رسمی: بیرون از ساعت دقیقاً یک اطلاع (نه بیشتر)', a1 === a0 + 1 && /بیرون از ساعت کاری/.test(said()[a0].text) && said().length === a1);
    TG_MEM['biz:hours'] = 'in';
    TG_MEM['biz:now'] = T0;
    bizHandle_(msg(702, 'همکار لطفا'));
    ok('حساب رسمی: کلیدواژه «همکار»، کنار می‌رود و پذیرش خبر می‌شود', said().some(function (x) { return x.chat === '702' && /به همکار پذیرش خبر دادم/.test(x.text); }) && (TG_MEM['biz:notify'] || []).indexOf('702') > -1);
    var n1 = said().length;
    bizHandle_(msg(702, 'مرسی'));
    ok('حساب رسمی: پس از «همکار» ۲۴ ساعت ساکت', said().length === n1);
    bizHandle_(msg(703, 'سلام')); var n2 = said().length;
    bizHandle_(msg(703, 'من صاحب حسابم', 9000));
    TG_MEM['biz:now'] = T0 + 3600000;
    bizHandle_(msg(703, 'پاسخ مراجع'));
    ok('حساب رسمی: پس از پیام خود صاحب حساب، وسط گفت‌وگوی آدم بات حرف نمی‌زند', said().length === n2);
    ok('حساب رسمی: بی TG_BIZ_LIVE بیرون از آزمون خشک بسته است', (function () { TG_DRY = false; var r = bizLive_(); TG_DRY = true; return r === false; })());
    ok('حساب رسمی: متن‌ها بی لینک و بی خط تیره', !/https?:|[—–]/.test(BIZ_T_INTRO + BIZ_T_COLLEAGUE + BIZ_T_OUTSIDE));
  } finally { TG_DRY = kD; TG_MEM = kM; TG_OUTBOX = kO; TG_CFG_ = kC; }
  Logger.log(out.join('\n'));
  return { pass: pass, fail: fail, text: out.filter(function (l) { return l.indexOf('❌') === 0; }).join('\n') };
}
