/**
 * card.gs · v170.124 · ۲۰ آبان ۱۴۰۵ · کارت زنده (ویجت تلگرام) برای «جلسهٔ بعدی من» (E6 بند ۶)
 *
 * مستندات سنجیده‌شده (core.telegram.org/bots/api و /bots/widgets، ۲۰ آبان): ویجت فقط در چت خصوصی با بات؛ HTML تا ۳۲۷۶۸ بایت و ۴۰۹۶ بایت پس از zlib؛
 * بی شبکه و بی کتابخانه؛ دادهٔ هر پیام chat_data تا ۱۰۲۴ بایت که ویجت با TelegramWidget.chatData می‌خواند؛ فقط دادهٔ آن با editMessageWidgetData
 * (chat_id، message_id، chat_data) عوض می‌شود؛ رنگ‌ها متغیر --tg-theme-*. ⚠️ نام پارامترهای sendWidget در بخش خوانده‌شده نبود؛ از فیلدهای
 * InputWidgetMessageContent (html، width، height، chat_data، caption، parse_mode، allow_queries) حدس زده شده؛ با چت آزمایشی پس از انتشار تأیید می‌شود
 * و اگر API خطا داد، همان زیرنویس به‌عنوان پیام معمولی می‌رود (هیچ مسیری فقط به ویجت وابسته نیست).
 * پشت TG_FEAT_CARD؛ فقط چت خصوصی؛ هیچ نام خانوادگی یا دادهٔ بالینی در دادهٔ کارت نیست.
 * ⛔ اتصال به رویداد جلسه (نگاشت پیام ← جلسه، به‌روزرسانی با تغییر یا لغو) منتظر خوراک تدریجی پل است (E7، QM1.3).
 */
var CARD_HTML = '<div id="c" dir="rtl" style="font-family:system-ui;padding:12px;border-radius:12px;background:var(--tg-theme-secondary-bg-color,#f2f2f7);color:var(--tg-theme-text-color,#000)">' +
  '<div id="k" style="font-size:13px;color:var(--tg-theme-hint-color,#888)"></div>' +
  '<div id="n" style="font-size:18px;font-weight:600;margin:4px 0"></div>' +
  '<div id="w" style="font-size:15px"></div>' +
  '<div id="x" style="font-size:13px;margin-top:6px;color:var(--tg-theme-link-color,#2481cc)"></div></div>' +
  '<script>(function(){var W=window.TelegramWidget,P="۰۱۲۳۴۵۶۷۸۹";function fa(s){return String(s).replace(/\\d/g,function(d){return P[d]})}' +
  'function g(i,t){var e=document.getElementById(i);if(e)e.textContent=t}' +
  'function draw(){var d={};try{d=JSON.parse(W.chatData)||{}}catch(e){}' +
  'g("k",d.k||"");g("n",d.n||"");' +
  'if(d.s==="x"){g("w","لغو شد");g("x","");return}' +
  'g("w",(d.d||"")+(d.h?" · ساعت "+d.h+" به وقت تهران":""));' +
  'try{var m=Math.round((d.t*1000-Date.now())/60000);g("x",m>0?(m>=1440?fa(Math.floor(m/1440))+" روز دیگر":m>=60?fa(Math.floor(m/60))+" ساعت دیگر":fa(m)+" دقیقه دیگر"):"")}catch(e){}}' +
  'if(W){W.onEvent("chatDataChanged",draw);draw()}})()</script>';
var CARD_DATA_MAX = 1024;
function cardBytes_(s) { return typeof tgCbBytes_ === 'function' ? tgCbBytes_(s) : Buffer.byteLength(String(s), 'utf8'); }
function cardCut_(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
/* c = {k: نوع، n: نام نمایشی (نه خانوادگی)، t: زمان یونیکس (ثانیه)، d: تاریخ شمسی آمادهٔ نمایش، h: ساعت تهران HH:mm، s: 'x' یعنی لغو، r: بازنگری} */
function cardData_(c) {
  var o = { r: Number(c.r || 1), k: cardCut_(c.k, 24), n: cardCut_(c.n, 24), t: Number(c.t || 0), d: cardCut_(c.d, 40), h: cardCut_(c.h, 5) };
  if (c.s === 'x') o.s = 'x';
  var s = JSON.stringify(o);
  if (cardBytes_(s) > CARD_DATA_MAX) { o.n = cardCut_(o.n, 10); o.d = cardCut_(o.d, 20); s = JSON.stringify(o); }
  return cardBytes_(s) > CARD_DATA_MAX ? '' : s;
}
/* زیرنویس همیشه کامل است (کارتی که ویجت را نشان ندهد همین را می‌بیند). برچسب tg-time با کلید TIME (قالب مستند: unix و format). */
function cardCaption_(c, abroad) {
  var tail = typeof tgTimeTail_ === 'function' ? tgTimeTail_(Number(c.t || 0) * 1000, !!abroad) : '';
  var cancel = c.s === 'x';
  return (cancel ? '❌ ' : '🗓 ') + '<b>' + tgEsc_(cardCut_(c.k, 24)) + '</b>' + (c.n ? ' · ' + tgEsc_(cardCut_(c.n, 24)) : '') +
    (cancel ? '\nلغو شد.' : '\n' + tgEsc_(cardCut_(c.d, 40)) + (c.h ? ' ساعت ' + tgEsc_(c.h) + ' به وقت تهران' : '') + tail);
}
/* فقط چت خصوصی (شناسهٔ مثبت). true یعنی کارت رفت؛ false یعنی کلید خاموش یا چت غیرخصوصی یا خطا و زیرنویس معمولی رفت */
function cardSend_(chat, c, markup, abroad) {
  if (!tgFeat_('CARD')) return false;
  var cap = cardCaption_(c, abroad), data = cardData_(c);
  if (!(Number(chat) > 0) || !data) { tgSend_(chat, cap, markup); return false; }
  var res = tgApi_('sendWidget', { chat_id: chat, html: CARD_HTML, height: 130, chat_data: data, caption: cap, parse_mode: 'HTML', reply_markup: markup || undefined });
  var okk = TG_DRY ? true : !!(res && res.getResponseCode && res.getResponseCode() === 200);
  if (!okk) { tgSend_(chat, cap, markup); return false; }
  return true;
}
/* تغییر یا لغو: فقط دادهٔ ویجت (بی پیام تازه). */
function cardUpdate_(chat, messageId, c) {
  var data = cardData_(c); if (!tgFeat_('CARD') || !data) return false;
  var res = tgApi_('editMessageWidgetData', { chat_id: chat, message_id: messageId, chat_data: data });
  return TG_DRY ? true : !!(res && res.getResponseCode && res.getResponseCode() === 200);
}
function cardTests() {
  var out = [], pass = 0, fail = 0;
  function ok(n, c) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n); }
  var kD = TG_DRY, kM = TG_MEM, kO = TG_OUTBOX, kC = TG_CFG_;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; TG_CFG_ = {};
  try {
    var long = { k: 'جلسهٔ بعدی من', n: new Array(60).join('ب'), t: 1794753000, d: new Array(80).join('ج'), h: '18:30', r: 7 };
    var d = cardData_(long);
    ok('کارت: دادهٔ بلندترین حالت فارسی زیر ۱۰۲۴ بایت', d !== '' && cardBytes_(d) <= CARD_DATA_MAX && JSON.parse(d).t === 1794753000);
    ok('کارت: HTML زیر ۳۲۷۶۸ بایت و بی شبکه', cardBytes_(CARD_HTML) < 32768 && !/fetch|XMLHttpRequest|WebSocket|src=|href=|https?:/.test(CARD_HTML));
    ok('کارت: دادهٔ لغو علامت s دارد', JSON.parse(cardData_({ k: 'جلسه', n: 'الف', t: 1, d: 'x', h: '10:00', s: 'x' })).s === 'x');
    ok('کارت: زیرنویس همیشه کامل است (ساعت و نام)', /جلسهٔ بعدی من/.test(cardCaption_(long, false)) && /18:30/.test(cardCaption_(long, false)));
    ok('کارت: زیرنویس لغو', /لغو شد/.test(cardCaption_({ k: 'جلسه', n: 'الف', s: 'x' }, false)));
    ok('کارت: با کلید خاموش هیچ‌چیز نمی‌رود', cardSend_(5, long, null, false) === false && cardUpdate_(5, 9, long) === false && TG_OUTBOX.length === 0);
    TG_CFG_ = { TG_FEAT_CARD: '1' };
    TG_OUTBOX = [];
    ok('کارت: چت خصوصی، sendWidget', cardSend_(501, long, null, false) === true && TG_OUTBOX.some(function (x) { return x.kind === 'api' && x.method === 'sendWidget'; }));
    TG_OUTBOX = [];
    ok('کارت: گروه (شناسهٔ منفی) فقط زیرنویس معمولی', cardSend_(-100, long, null, false) === false && !TG_OUTBOX.some(function (x) { return x.method === 'sendWidget'; }) && TG_OUTBOX.some(function (x) { return x.kind === 'msg'; }));
    TG_OUTBOX = [];
    ok('کارت: به‌روزرسانی فقط editMessageWidgetData، پیام تازه نه', cardUpdate_(501, 9, { k: 'جلسه', n: 'الف', t: 1, d: 'x', h: '10:00', s: 'x' }) === true && TG_OUTBOX.length === 1 && TG_OUTBOX[0].method === 'editMessageWidgetData');
  } finally { TG_DRY = kD; TG_MEM = kM; TG_OUTBOX = kO; TG_CFG_ = kC; }
  Logger.log(out.join('\n'));
  return { pass: pass, fail: fail, text: out.filter(function (l) { return l.indexOf('❌') === 0; }).join('\n') };
}
