/**
 * review.gs · v169.0 · ۱۰ مهر ۱۴۰۵ · روند تازهٔ بازبینی علمی
 *
 * چرا: دکمهٔ «🔍 بررسی اصلاحات» به tajrobeh.life/review/?c=…&w=…&k=… می‌رفت و ۴۰۴ می‌داد. علت: «w» در وردپرس متغیر
 * عمومی پرس‌وجو است (شمارهٔ هفته)؛ وردپرس ?w=<chat_id> را «نوشته‌های هفتهٔ فلان» می‌خواند، چیزی پیدا نمی‌کند و پیش از
 * اجرای خود برگه ۴۰۴ می‌دهد. سردبیر هم فقط نتیجهٔ Gemini را می‌دید، نه حرف اصلی بازبین، و هیچ صف و ثبتی جز کارت تلگرام نبود.
 *
 * روند (وضعیت در ستون «وضعیت» تب «اصلاحات مقاله» هاب محتوا، فهرست کشویی RV_ST_LIST):
 *   تازه ← در صف سردبیر ⇄ برگشت به بازبین ← تأیید سردبیر ← (چک آمادگی سبز) آمادهٔ انتشار ← منتشر شد
 *                                                         ↘ (قرمز) در صف سردبیر          ↘ برگشت از یاسر ← در صف سردبیر
 *   رد شد: سردبیر کل بازبینی را کنار گذاشت.
 * - ویس بازبین با Gemini کامل پیاده می‌شود (rvTranscribe_، فهرست اصطلاحات بالینی RV_GLOSSARY). صدای مراجع هرگز به این مسیر نمی‌آید:
 *   فقط فایل‌هایی که خود بازبین در مسیر بازبینی فرستاده.
 * - صف سردبیر در مینی‌اپ (api: rv.list، rv.open، rv.act) و همه‌چیز در بات هم (کال‌بک rv:). /review/ سایت فقط به بات ریدایرکت می‌شود.
 * - چک آمادگی (rvChecks_) پیش از رسیدن کارت به یاسر؛ کارت سه‌خطی یاسر با «✅ انتشار» و «↩️ برگشت با یادداشت».
 * - امتیازها در تب «امتیازها» هاب محتوا. امتیاز هیچ اثری روی مچ‌میکینگ و ارجاع ندارد.
 */

var RV_ST = { NEW: 'تازه', ED: 'در صف سردبیر', BACKR: 'برگشت به بازبین', OKE: 'تأیید سردبیر', READY: 'آمادهٔ انتشار',
  BACKY: 'برگشت از یاسر', PUB: 'منتشر شد', REJ: 'رد شد' };
var RV_ST_LIST = [RV_ST.NEW, RV_ST.ED, RV_ST.BACKR, RV_ST.OKE, RV_ST.READY, RV_ST.BACKY, RV_ST.PUB, RV_ST.REJ];
var RV_OPEN = [RV_ST.ED, RV_ST.BACKR, RV_ST.OKE, RV_ST.READY, RV_ST.BACKY];
var RV_COL = { OWN: 'مالک فعلی', AT: 'زمان ثبت', EDAT: 'زمان تأیید سردبیر', FINAT: 'زمان تأیید نهایی', RAW: 'متن اصلی بازبین', TR: 'متن پیاده‌شدهٔ ویس', PTS: 'امتیاز' };
var RV_NEW_COLS = [RV_COL.OWN, RV_COL.AT, RV_COL.EDAT, RV_COL.FINAT, RV_COL.RAW, RV_COL.TR, RV_COL.PTS];
var RV_DEADLINE = { ed: 5, owner: 2 };   /* روز کاری؛ جمعه تعطیل */
var RV_BOT = 'https://t.me/tajrobehlife_bot';

var RV_PTS_TAB = 'امتیازها';
var RV_PTS_HEAD = ['کد', 'تاریخ شمسی', 'نفر', 'کار', 'امتیاز', 'کد مرجع'];
var RV_PTS = { ART: ['مقالهٔ منتشرشده', 5], REVFIX: ['بازبینی که اصلاحش اعمال شد', 3], REVOK: ['بازبینی بدون اصلاح', 1],
  REF: ['معرفی بازبین یا نویسندهٔ پذیرفته‌شده', 2], IDEA: ['ایده یا ویس استفاده‌شده', 1] };

/* اصطلاحات بالینی فارسی برای پیاده‌کردن ویس بازبین (املای درست) */
var RV_GLOSSARY = ['اختلال شخصیت خودشیفته', 'خودشیفتگی', 'خودشیفتگی پنهان', 'خودشیفتگی آشکار', 'دلبستگی ناایمن', 'دلبستگی اجتنابی',
  'دلبستگی دوسوگرا', 'دلبستگی آشفته', 'تروما', 'ترومای رشدی', 'ترومای پیچیده', 'اختلال استرس پس از سانحه', 'سوگ', 'سوگ پیچیده',
  'انتقال', 'انتقال متقابل', 'مکانیسم دفاعی', 'فرافکنی', 'همانندسازی فرافکنانه', 'دوپاره‌سازی', 'انکار', 'والایش', 'سرکوب',
  'شناخت‌درمانی', 'درمان شناختی رفتاری', 'طرحواره‌درمانی', 'طرحواره', 'روان‌درمانی پویشی', 'روان‌کاوی', 'روان‌تحلیلی',
  'درمان هیجان‌مدار', 'ذهنی‌سازی', 'ظرفیت بازتابی', 'خودتنظیمی هیجانی', 'نشخوار فکری', 'اختلال وسواسی جبری', 'اضطراب فراگیر',
  'افسردگی اساسی', 'اختلال دوقطبی', 'اختلال شخصیت مرزی', 'گسلش', 'تجزیه', 'شرم', 'گناه', 'عزت نفس', 'خودارزشمندی',
  'والد ناکافی', 'مادر به‌قدر کافی خوب', 'آینه‌داری', 'همدلی', 'اتحاد درمانی', 'رابطهٔ درمانی', 'مرز', 'هم‌وابستگی', 'دیگری',
  'وینیکات', 'کوهات', 'کرنبرگ', 'بالبی', 'فروید', 'لکان', 'کلاین', 'DSM-5', 'ICD-11'];

/* ---------- کمکی ---------- */
function rvDry_() { return (typeof TG_DRY !== 'undefined') ? !!TG_DRY : false; }
function rvNow_() { return rvDry_() && TG_MEM['rv:now'] ? new Date(TG_MEM['rv:now']) : new Date(); }
function rvStamp_(d) { return Utilities.formatDate(d || rvNow_(), 'Asia/Tehran', 'yyyy-MM-dd HH:mm'); }
function rvParse_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/.exec(String(s || '').trim());
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) - 210 * 60000) : null;
}
function rvJDate_(d) { var j = tgJalali_(d || rvNow_(), TG_TZ); return j.y + '/' + ('0' + j.m).slice(-2) + '/' + ('0' + j.d).slice(-2); }
/* روزهای کاری گذشته از t0 تا اکنون (جمعه حساب نمی‌شود) */
function rvBizDays_(t0, now) {
  if (!t0) return 0;
  var n = 0, d = new Date(t0.getTime());
  while (true) {
    d = new Date(d.getTime() + 86400000);
    if (d > now) break;
    if (Utilities.formatDate(d, TG_TZ, 'u') !== '5') n++;
  }
  return n;
}
function rvOwnerChat_() { return typeof TG_OWNER_CHAT !== 'undefined' ? String(TG_OWNER_CHAT) : ''; }
function rvIsOwner_(chat) { return String(chat) === rvOwnerChat_(); }
function rvIsEd_(chat) { return mcEditors_().map(String).indexOf(String(chat)) > -1 || (typeof mcIsEditor_ === 'function' && mcIsEditor_(chat)); }
function rvEditorName_() {
  try { var e = tgMagEditors_()[0]; if (e && e.name) return String(e.name).split(/\s+/)[0]; } catch (x) {}
  return 'سردبیر';
}
function rvInHours_(d) { var h = +Utilities.formatDate(d || rvNow_(), TG_TZ, 'H'); return h >= 9 && h < 18; }
function rvAppBtn_(text, code) { return { text: text, web_app: { url: TG_APP_URL + '?rv=' + encodeURIComponent(code) } }; }

/* ستون‌های تازه در انتهای تب و فهرست کشویی وضعیت (یک بار، از tgV169Setup) */
function rvSheetCols_() {
  if (rvDry_()) return 'dry';
  var sh = vxEdSheet_(), lc = sh.getLastColumn();
  var head = sh.getRange(1, 1, 1, Math.max(1, lc)).getValues()[0].map(String);
  var added = 0;
  VX_ED_HEAD.forEach(function (h, i) { if (head[i] !== h) { sh.getRange(1, i + 1).setValue(h).setFontWeight('bold'); added++; } });
  var col = VX_ED_HEAD.indexOf('وضعیت') + 1;
  sh.getRange(2, col, Math.max(1, sh.getMaxRows() - 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(RV_ST_LIST, true).setAllowInvalid(true).build());
  return 'ستون: ' + added;
}

/* ---------- وضعیت ---------- */
function rvSet_(code, st, extra) {
  var p = extra || {};
  if (st) p['وضعیت'] = st;
  if (st === RV_ST.ED || st === RV_ST.BACKY) p[RV_COL.OWN] = p[RV_COL.OWN] || rvEditorName_();
  if (st === RV_ST.BACKR) p[RV_COL.OWN] = p[RV_COL.OWN] || 'بازبین';
  if (st === RV_ST.OKE) p[RV_COL.OWN] = 'سیستم (چک آمادگی)';
  if (st === RV_ST.READY) p[RV_COL.OWN] = 'یاسر';
  if (st === RV_ST.PUB || st === RV_ST.REJ) p[RV_COL.OWN] = '';
  var res = vxEdSet_(code, p);
  if (res && st && typeof opsAdaptReview_ === 'function') opsAdaptReview_(res['کد'] || code, st, res['عنوان']);
  return res;
}

/* ---------- ویس بازبین با Gemini ---------- */
var RV_TR_SCHEMA = { type: 'OBJECT', properties: { text: { type: 'STRING' } }, required: ['text'] };
function rvTranscribe_(blob) {
  if (rvDry_()) return TG_MEM['rv:tr'] || 'متن پیاده‌شدهٔ آزمایشی با اصطلاح دلبستگی ناایمن و انتقال متقابل.';
  try {
    var o = vxGem_([{ text: 'این ویس یک بازبین علمی (روان‌شناس بالینی) دربارهٔ یک مقالهٔ مجله است. کل گفته را کامل و کلمه‌به‌کلمه به فارسی بنویس، بدون خلاصه‌کردن و بدون افزودن چیزی از خودت. ' +
      'اصطلاحات تخصصی را با همین املا بنویس اگر شنیده شد: ' + RV_GLOSSARY.join('، ') + '. خط تیرهٔ وسط جمله ننویس. جمله‌ها را با نقطه و ویرگول جدا کن.' },
      { inlineData: { mimeType: blob.getContentType() || 'audio/ogg', data: Utilities.base64Encode(blob.getBytes()) } }], RV_TR_SCHEMA);
    var t = vxNoDash_(String(o.text || '').trim());
    if (t) return t;
  } catch (e) { vxErr_('rvTranscribe_', e); }
  return mcTranscribe_(blob);   /* اگر نشد، مسیر عمومی Gemini (ai.gs) */
}
/* همهٔ ویس‌های بازبین (شناسه‌های درایو در «فایل درایو» سطر مشارکت) */
function rvVoiceIds_(m) {
  return String((m && m['فایل درایو']) || '').split(/\s+/).filter(function (x) { return /^[-\w]{20,}$/.test(x); });
}
function rvVoiceText_(m) {
  if (rvDry_()) return rvVoiceIds_(m).length ? rvTranscribe_(null) : '';
  var out = [];
  rvVoiceIds_(m).forEach(function (id) {
    try { var f = DriveApp.getFileById(id); if (!/^audio\/|ogg|mpeg/.test(String(f.getMimeType()))) return; out.push(rvTranscribe_(f.getBlob())); } catch (e) { vxErr_('rvVoiceText_ ' + id, e); }
  });
  return out.filter(String).join('\n\n');
}

/* ---------- چک محتوایی Gemini: عنوان، توضیح متا، لینک داخلی، لحن ---------- */
var RV_QC_SCHEMA = { type: 'OBJECT', properties: { notes: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['notes'] };
function rvGemQc_(post) {
  if (rvDry_()) return TG_MEM['rv:qc'] || ['عنوان سئو کوتاه است.'];
  if (!post) return [];
  try {
    var o = vxGem_([{ text: 'سردبیر مجلهٔ روان‌شناسی تجربه هستی. این مقاله را برای چهار چیز بسنج و برای هر ایراد یک جملهٔ کوتاه و عملی بنویس (اگر ایرادی نیست چیزی ننویس):\n' +
      '۱. عنوان سئو (۵۰ تا ۶۰ نویسه با «| تجربه زندگی»)\n۲. توضیح متا (۱۲۰ تا ۱۵۵ نویسه)\n۳. لینک داخلی به مقاله‌های دیگر تجربه (حداقل دو)\n۴. لحن: محترمانه، «مراجع» نه «بیمار»، بی وعدهٔ درمانی.\n' +
      'خط تیرهٔ وسط جمله ننویس.\n\nعنوان: ' + post.title + '\nتوضیح متا: ' + post.meta + '\nشمار لینک داخلی: ' + post.links + '\n\nمتن:\n' + String(post.text).slice(0, 30000) }], RV_QC_SCHEMA);
    return (o.notes || []).map(vxNoDash_).slice(0, 8);
  } catch (e) { vxErr_('rvGemQc_', e); return []; }
}

/* ---------- مقاله از REST سایت (برای چک) ---------- */
function rvPostFetch_(pid) {
  if (rvDry_()) return TG_MEM['rv:post'] || null;
  var r = UrlFetchApp.fetch(MC_SITE + '/wp-json/wp/v2/posts/' + pid + '?_fields=id,link,title,content,yoast_head_json', { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  var j = JSON.parse(r.getContentText()), y = j.yoast_head_json || {};
  var html = String((j.content || {}).rendered || '');
  return { id: j.id, link: j.link, html: html, title: String(y.title || (j.title || {}).rendered || ''), meta: String(y.description || ''),
    schema: y.schema ? JSON.stringify(y.schema) : '', text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
}
function rvLinksIn_(html) {
  var n = 0, re = /<a\b[^>]*href="([^"]+)"/gi, m;
  while ((m = re.exec(String(html)))) { var h = m[1]; if (/^https?:\/\/(www\.)?tajrobeh\.life\//i.test(h) || /^\/[^\/]/.test(h)) n++; }
  return n;
}
function rvImgsNoAlt_(html) {
  var n = 0, re = /<img\b[^>]*>/gi, m;
  while ((m = re.exec(String(html)))) { var a = /\balt="([^"]*)"/i.exec(m[0]); if (!a || !String(a[1]).trim()) n++; }
  return n;
}

/* چک آمادگی: تغییرهای تأییدشده روی متن فعلی جا می‌شوند، عنوان و متا، دو لینک داخلی، alt تصویرها، اسکیما و تاریخ بازبینی */
function rvChecks_(code) {
  var e = vxEdGet_(code), d = vxEdData_(e), p = rvPostFetch_(d.post);
  var out = [];
  var add = function (k, ok, msg) { out.push({ k: k, ok: !!ok, msg: msg }); };
  if (!p) { add('post', false, 'مقاله از سایت خوانده نشد.'); return out; }
  var plain = vxK_(p.text);
  var on = (d.changes || []).filter(function (c) { return c.on; }), miss = [];
  on.forEach(function (c) {
    var key = c.kind === 'add' ? c.after : c.old;
    if (key && plain.indexOf(vxK_(key)) < 0) miss.push(c.id);
  });
  add('apply', !miss.length, miss.length ? 'جای این تغییرها در متن فعلی پیدا نشد: ' + miss.map(function (x) { return '#' + vxFa_(x); }).join('، ') : 'همهٔ ' + vxFa_(on.length) + ' تغییر تأییدشده جای خود را در متن دارند.');
  var html = p.html;
  on.forEach(function (c) { if (c.kind === 'add') html += '<p>' + c.neu + '</p>'; });
  var tl = String(p.title).length;
  add('title', tl >= 30 && tl <= 70, 'عنوان سئو ' + vxFa_(tl) + ' نویسه' + (tl >= 30 && tl <= 70 ? '' : ' (باید ۳۰ تا ۷۰ باشد)'));
  var ml = String(p.meta).length;
  add('meta', ml >= 120 && ml <= 160, 'توضیح متا ' + vxFa_(ml) + ' نویسه' + (ml >= 120 && ml <= 160 ? '' : ' (باید ۱۲۰ تا ۱۶۰ باشد)'));
  var ln = rvLinksIn_(html);
  add('links', ln >= 2, vxFa_(ln) + ' لینک داخلی' + (ln >= 2 ? '' : ' (حداقل ۲ لازم است)'));
  var na = rvImgsNoAlt_(html);
  add('alt', na === 0, na ? vxFa_(na) + ' تصویر بی متن جایگزین (alt)' : 'همهٔ تصویرها alt دارند');
  var sch = String(p.schema || '');
  var named = d.consent === 'بله';
  add('schema', /"@graph"|"@type"/.test(sch), sch ? 'اسکیمای صفحه هست؛ با انتشار _tj_last_reviewed و ' + (named ? 'reviewedBy (نام بازبین با رضایت)' : 'فقط lastReviewed (بازبین نام نخواست)') + ' نوشته می‌شود.' : 'اسکیمای صفحه خوانده نشد.');
  return out;
}
function rvChecksText_(list) { return list.map(function (c) { return (c.ok ? '🟢 ' : '🔴 ') + c.msg; }).join('\n'); }

/* ---------- کارت‌ها ---------- */
function rvEditorCard_(code, why) {
  var e = vxEdGet_(code), d = vxEdData_(e), ch = d.changes || [];
  var t = '🔬 <b>بازبینی علمی در صف شما</b> · <code>' + code + '</code>\n«' + vxEsc_(mcShort_(d.title, 80)) + '»\nبازبین: ' + vxEsc_(d.reviewer) + ' · ' + vxEsc_(d.verdict) +
    '\n' + vxFa_(ch.length) + ' تغییر پیشنهادی' + (d.raw || d.tr ? ' · حرف اصلی بازبین کنار هر تغییر' : '') + (why ? '\n\n' + why : '') +
    '\n\nمهلت: ' + vxFa_(RV_DEADLINE.ed) + ' روز کاری.';
  var kb = { inline_keyboard: [[rvAppBtn_('🔍 باز کردن در مینی‌اپ', code)],
    [vxB_('📄 دیدن در همین‌جا', 'rv:o:' + code), vxB_('✅ تأیید سردبیری', 'rv:ok:' + code)],
    [vxB_('❓ سؤال از بازبین', 'rv:q:' + code), vxB_('🗑 رد کل بازبینی', 'rv:x:' + code)]] };
  if (rvDry_()) { (MC_DRY_EDITORS || []).forEach(function (x) { tgSend_(x, t, kb); }); return; }
  mcEditors_().forEach(function (x) { tgSend_(x, t, kb); });
}
function rvOwnerCard_(code) {
  var e = vxEdGet_(code), d = vxEdData_(e);
  var on = (d.changes || []).filter(function (c) { return c.on; }).length;
  var t = '📰 <b>آمادهٔ انتشار</b> · <code>' + code + '</code>\n«' + vxEsc_(mcShort_(d.title, 70)) + '»\n' +
    'بازبین: ' + vxEsc_(d.reviewer) + ' · ' + vxFa_(on) + ' تغییر تأییدشدهٔ سردبیر · همهٔ چک‌ها سبز';
  tgSend_(rvOwnerChat_(), t, { inline_keyboard: [[vxB_('✅ انتشار', 'rv:p:' + code), vxB_('↩️ برگشت با یادداشت', 'rv:b:' + code)], [rvAppBtn_('🔍 دیدن جزئیات', code)]] });
}

/* ---------- کارها (مشترک بات و مینی‌اپ) ---------- */
function rvCan_(chat, e, need) {
  if (!e) return 'پیدا نشد.';
  var own = rvIsOwner_(chat), ed = rvIsEd_(chat);
  if (need === 'owner' ? !own : !(ed || own)) return 'این کار از دست شما برنمی‌آید.';
  return '';
}
/* تصمیم‌های سردبیر روی تغییرها: [{id, on, neu, rej, cm}] */
function rvDecide_(code, decs, comment) {
  var e = vxEdGet_(code), d = vxEdData_(e);
  (decs || []).forEach(function (x) {
    (d.changes || []).forEach(function (c) {
      if (c.id !== +x.id) return;
      if (typeof x.on === 'boolean') c.on = x.on;
      if (x.rej === true) { c.on = false; c.rej = true; } else if (x.rej === false) c.rej = false;
      if (typeof x.neu === 'string' && x.neu.trim()) { c.neu = vxNoDash_(x.neu); c.edited = true; }
      if (typeof x.cm === 'string') c.cm = vxNoDash_(x.cm).slice(0, 600);
    });
  });
  if (typeof comment === 'string') d.edNote = vxNoDash_(comment).slice(0, 1500);
  vxEdSave_(e, d);
  vxEdSet_(code, { 'پذیرفته': (d.changes || []).filter(function (c) { return c.on; }).length });
  return d;
}
function rvApprove_(chat, code) {
  var e = vxEdGet_(code), why = rvCan_(chat, e);
  if (why) return { ok: false, error: why };
  if ([RV_ST.ED, RV_ST.BACKY].indexOf(e['وضعیت']) < 0) return { ok: false, error: 'این مورد در صف سردبیر نیست: ' + e['وضعیت'] };
  rvSet_(code, RV_ST.OKE, { [RV_COL.EDAT]: rvStamp_() });
  var checks = rvChecks_(code), bad = checks.filter(function (c) { return !c.ok; });
  var d = vxEdData_(vxEdGet_(code)); d.checks = checks; d.checkedAt = rvStamp_(); vxEdSave_(vxEdGet_(code), d);
  if (bad.length) {
    rvSet_(code, RV_ST.ED, { 'نتیجه': 'چک قرمز: ' + bad.map(function (b) { return b.k; }).join('، ') });
    rvEditorCard_(code, '🔴 <b>چک آمادگی کامل نیست</b>، کارت به صف شما برگشت:\n' + vxEsc_(rvChecksText_(checks)));
    return { ok: true, ready: false, checks: checks, msg: 'چک آمادگی قرمز شد؛ مورد در صف شما ماند.' };
  }
  rvSet_(code, RV_ST.READY, { 'نتیجه': '' });
  rvOwnerCard_(code);
  return { ok: true, ready: true, checks: checks, msg: 'همهٔ چک‌ها سبز است؛ برای انتشار نزد یاسر رفت.' };
}
function rvReject_(chat, code) {
  var e = vxEdGet_(code), why = rvCan_(chat, e);
  if (why) return { ok: false, error: why };
  if (e['وضعیت'] === RV_ST.PUB) return { ok: false, error: 'منتشر شده است.' };
  rvSet_(code, RV_ST.REJ, { 'نتیجه': 'رد سردبیر' });
  return { ok: true, msg: 'کنار گذاشته شد.' };
}
/* سؤال سردبیر از بازبین: پیام به بازبین و منتظر جواب (متن یا ویس) */
function rvAsk_(chat, code, q) {
  var e = vxEdGet_(code), why = rvCan_(chat, e);
  if (why) return { ok: false, error: why };
  q = vxNoDash_(String(q || '').trim());
  if (q.length < 3) return { ok: false, error: 'متن سؤال را بنویسید.' };
  var d = vxEdData_(e), m = mcGet_(d.c), rc = m ? String(m['chat_id'] || '') : '';
  if (!rc) return { ok: false, error: 'بازبین به بات وصل نیست.' };
  d.qa = (d.qa || []).concat([{ q: q, at: rvStamp_() }]); vxEdSave_(e, d);
  rvSet_(code, RV_ST.BACKR);
  tgSetVal_('rvans', rc, code);
  tgSend_(rc, '🔬 سردبیر مجله دربارهٔ بازبینی شما روی «' + vxEsc_(mcShort_(d.title, 60)) + '» یک سؤال دارد:\n\n' + vxEsc_(q) + '\n\nجوابتان را همین‌جا بنویسید یا ویس بفرستید.');
  return { ok: true, msg: 'سؤال برای بازبین رفت.' };
}
/* جواب بازبین ← دوباره صف سردبیر */
function rvAnsIn_(chat, m) {
  var code = tgGetVal_('rvans', chat);
  if (!code) return false;
  var text = String((m && m.text) || '').trim(), v = m && (m.voice || m.audio);
  if (!v && (!text || text.indexOf('/') === 0 || tgIsBtnLike_(text))) { tgDel_('rvans', chat); return false; }
  var e = vxEdGet_(code);
  if (!e || e['وضعیت'] !== RV_ST.BACKR) { tgDel_('rvans', chat); return false; }
  if (v) {
    var id = mcSaveTgFile_(v.file_id, 'review-answer-' + code + '-' + Date.now() + '.ogg');
    text = '🎙 ' + (rvDry_() ? rvTranscribe_(null) : rvTranscribe_(DriveApp.getFileById(id).getBlob()));
  }
  var d = vxEdData_(e), qa = d.qa || [];
  if (qa.length) qa[qa.length - 1].a = vxNoDash_(text).slice(0, 4000);
  d.qa = qa; vxEdSave_(e, d);
  tgDel_('rvans', chat);
  rvSet_(code, RV_ST.ED);
  tgSend_(chat, 'ممنون. جوابتان برای سردبیر رفت.');
  rvEditorCard_(code, '💬 <b>جواب بازبین</b>:\n' + vxEsc_(mcShort_(text, 1500)));
  return true;
}
/* یادداشت برگشت یاسر (متن یا ویس) ← سردبیر */
function rvBackStart_(chat, code) {
  var e = vxEdGet_(code), why = rvCan_(chat, e, 'owner');
  if (why) return { ok: false, error: why };
  if (e['وضعیت'] !== RV_ST.READY) return { ok: false, error: 'این مورد آمادهٔ انتشار نیست: ' + e['وضعیت'] };
  tgSetVal_('rvback', chat, code);
  tgSend_(chat, 'یادداشت برای سردبیر را بنویسید یا ویس بفرستید.');
  return { ok: true, msg: 'منتظر یادداشت.' };
}
function rvBack_(chat, code, note, voiceMsg) {
  var e = vxEdGet_(code), why = rvCan_(chat, e, 'owner');
  if (why) return { ok: false, error: why };
  note = vxNoDash_(String(note || '').trim());
  if (!note && !voiceMsg) return { ok: false, error: 'یادداشت را بنویسید.' };
  var d = vxEdData_(e); d.ownerNotes = (d.ownerNotes || []).concat([{ t: note, at: rvStamp_() }]); vxEdSave_(e, d);
  rvSet_(code, RV_ST.BACKY);
  mcEditors_().forEach(function (x) {
    if (voiceMsg && !rvDry_()) { try { tgApi_('copyMessage', { chat_id: x, from_chat_id: chat, message_id: voiceMsg }); } catch (er) {} }
  });
  rvEditorCard_(code, '↩️ <b>برگشت از یاسر</b>' + (note ? ':\n' + vxEsc_(mcShort_(note, 1500)) : ' (ویس بالا)'));
  return { ok: true, msg: 'برای سردبیر برگشت.' };
}
function rvBackIn_(chat, m) {
  var code = tgGetVal_('rvback', chat);
  if (!code) return false;
  var text = String((m && m.text) || '').trim(), v = m && (m.voice || m.audio);
  if (!v && (!text || text.indexOf('/') === 0 || tgIsBtnLike_(text))) { tgDel_('rvback', chat); return false; }
  tgDel_('rvback', chat);
  var note = text;
  if (v && !rvDry_()) { try { var f = tgTgFile_(v.file_id); note = rvTranscribe_(f.blob.setName('n.ogg')); } catch (x) { note = ''; } }
  var r = rvBack_(chat, code, note, v ? m.message_id : 0);
  tgSend_(chat, r.ok ? 'برای سردبیر برگشت.' : r.error);
  return true;
}
function rvPublish_(chat, code) {
  var e = vxEdGet_(code), why = rvCan_(chat, e, 'owner');
  if (why) return { ok: false, error: why };
  if (e['وضعیت'] !== RV_ST.READY) return { ok: false, error: 'این مورد آمادهٔ انتشار نیست: ' + e['وضعیت'] };
  var r = vxEdPublish_(code, vxEdData_(e));
  return { ok: r.ok !== false, msg: r.msg || 'منتشر شد.' };
}

/* بعد از انتشار (از vxEdPublish_): امتیاز، تاریخ‌ها، و سنجش اسکیما روی خود صفحه */
function rvAfterPublish_(code, d, applied) {
  var m = mcGet_(d.c), who = m ? m['نام'] : d.reviewer;
  var pt = applied > 0 ? RV_PTS.REVFIX : RV_PTS.REVOK;
  rvPoint_(who, pt, code);
  vxEdSet_(code, { [RV_COL.FINAT]: rvStamp_(), [RV_COL.PTS]: pt[1], [RV_COL.OWN]: '' });
  if (m && m['chat_id']) tgSend_(m['chat_id'], '⭐ برای این بازبینی ' + vxFa_(pt[1]) + ' امتیاز گرفتید. مجموع امتیازتان: ' + vxFa_(rvPointsOf_(who)) + '.');
  if (rvDry_()) return;
  try {
    var p = rvPostFetch_(d.post), page = p ? UrlFetchApp.fetch(p.link, { muteHttpExceptions: true }).getContentText() : '';
    var okLr = /lastReviewed/.test(page), okRb = d.consent !== 'بله' || /reviewedBy/.test(page);
    if (!(okLr && okRb)) mcEditorsSay_('⚠️ ' + code + ': بعد از انتشار ' + (okLr ? '' : 'lastReviewed ') + (okRb ? '' : 'reviewedBy ') + 'در اسکیمای صفحه دیده نشد. کش صفحه را پاک کنید و دوباره ببینید.');
  } catch (x) { vxErr_('rv schema', x); }
}

/* ---------- امتیازها ---------- */
function rvPtsSheet_() { return tgMagSheet_(RV_PTS_TAB, RV_PTS_HEAD); }
function rvPtsRows_() {
  if (rvDry_()) return (TG_MEM['rv:pts'] = TG_MEM['rv:pts'] || []);
  var sh = rvPtsSheet_(), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, RV_PTS_HEAD.length).getDisplayValues().map(function (r) { return { code: r[0], who: r[2], work: r[3], pts: +tgLatinDigits_(r[4]) || 0, ref: r[5] }; });
}
function rvPoint_(who, pt, ref) {
  who = String(who || '').trim();
  if (!who) return '';
  var rows = rvPtsRows_();
  if (rows.some(function (r) { return r.ref === ref && r.work === pt[0] && mcNorm_(r.who) === mcNorm_(who); })) return '';
  var mx = 1000;
  rows.forEach(function (r) { var mm = /^P-(\d+)$/.exec(r.code); if (mm) mx = Math.max(mx, +mm[1]); });
  var rec = ['P-' + (mx + 1), rvJDate_(), who, pt[0], pt[1], ref];
  if (rvDry_()) { rows.push({ code: rec[0], who: who, work: pt[0], pts: pt[1], ref: ref }); return rec[0]; }
  rvPtsSheet_().appendRow(rec);
  return rec[0];
}
function rvPointsOf_(who) {
  var n = mcNorm_(who);
  return rvPtsRows_().filter(function (r) { return mcNorm_(r.who) === n; }).reduce(function (s, r) { return s + r.pts; }, 0);
}
function rvMyPoints_(chat) {
  var me = mcPerson_(chat);
  if (!me || !me.name) return { ok: true, name: '', total: 0, items: [] };
  var n = mcNorm_(me.name), items = rvPtsRows_().filter(function (r) { return mcNorm_(r.who) === n; });
  return { ok: true, name: me.name, total: items.reduce(function (s, r) { return s + r.pts; }, 0), items: items.slice(-20).reverse().map(function (r) { return { work: r.work, pts: r.pts, ref: r.ref }; }) };
}
function rvPointsMsg_(chat) {
  var p = rvMyPoints_(chat);
  if (!p.name) return tgSend_(chat, 'امتیاز به نام اعضای تیم ثبت می‌شود و نام شما هنوز در فهرست افراد نیست.');
  tgSend_(chat, '⭐ <b>امتیاز شما: ' + vxFa_(p.total) + '</b>\n' + (p.items.length ? p.items.map(function (x) { return '• ' + vxEsc_(x.work) + ' · ' + vxFa_(x.pts) + (x.ref ? ' · ' + x.ref : ''); }).join('\n') : 'هنوز امتیازی ثبت نشده.') +
    '\n\nامتیاز فقط برای قدردانی است و روی ارجاع مراجع اثری ندارد.');
}

/* ---------- بات: کال‌بک‌ها و پیام‌ها ---------- */
function rvOnCb_(chat, data) {
  var a = String(data).split(':'), act = a[1], code = a.slice(2).join(':');
  var say = function (r) { tgSend_(chat, r.ok ? (r.msg || 'انجام شد.') : '⚠️ ' + r.error); };
  try {
    if (act === 'o') return rvShowInBot_(chat, code);
    if (act === 'ok') return say(rvApprove_(chat, code));
    if (act === 'x') return say(rvReject_(chat, code));
    if (act === 'q') { var e = vxEdGet_(code), w = rvCan_(chat, e); if (w) return say({ ok: false, error: w }); tgSetVal_('rvq', chat, code); return tgSend_(chat, 'سؤالتان از بازبین را بنویسید.'); }
    if (act === 'p') return say(rvPublish_(chat, code));
    if (act === 'b') { var r = rvBackStart_(chat, code); if (!r.ok) say(r); return; }
    if (act === 'v') return rvSendVoices_(chat, code);
  } catch (x) { vxErr_('rv cb ' + data, x); tgSend_(chat, 'این دکمه الان کار نکرد. دوباره امتحان کنید.'); }
}
/* مسیر پیام: جواب بازبین، سؤال سردبیر، یادداشت یاسر، /points، /start rv_E-… */
function rvRoute_(chat, m) {
  var text = String((m && m.text) || '').trim();
  var sm = /^\/start(?:@\w+)?\s+rv_(E-\d+)$/.exec(text);
  if (sm) {
    var e = vxEdGet_(sm[1]);
    if (!e || rvCan_(chat, e)) { tgSend_(chat, 'این لینک بررسی برای شما باز نیست.'); return true; }
    tgSend_(chat, '🔬 بازبینی <code>' + sm[1] + '</code> · ' + vxEsc_(e['وضعیت']), { inline_keyboard: [[rvAppBtn_('🔍 باز کردن در مینی‌اپ', sm[1])], [vxB_('📄 دیدن در همین‌جا', 'rv:o:' + sm[1])]] });
    return true;
  }
  if (text === '/points' || text === '⭐ امتیاز من') { rvPointsMsg_(chat); return true; }
  if (tgGetVal_('rvq', chat)) {
    var code = tgGetVal_('rvq', chat);
    if (!text || text.indexOf('/') === 0 || tgIsBtnLike_(text)) { tgDel_('rvq', chat); return false; }
    tgDel_('rvq', chat);
    var r = rvAsk_(chat, code, text);
    tgSend_(chat, r.ok ? r.msg : '⚠️ ' + r.error);
    return true;
  }
  if (tgGetVal_('rvback', chat)) return rvBackIn_(chat, m);
  if (tgGetVal_('rvans', chat)) return rvAnsIn_(chat, m);
  return false;
}
function rvShowInBot_(chat, code) {
  var e = vxEdGet_(code), w = rvCan_(chat, e);
  if (w) return tgSend_(chat, w);
  var d = vxEdData_(e);
  var head = '🔬 <code>' + code + '</code> · ' + vxEsc_(e['وضعیت']) + '\n«' + vxEsc_(d.title) + '»\nبازبین: ' + vxEsc_(d.reviewer) + ' · ' + vxEsc_(d.verdict);
  tgSend_(chat, head);
  var raw = [d.raw, d.tr ? '🎙 ' + d.tr : ''].filter(String).join('\n\n');
  if (raw) vxTextChunks_('<b>حرف اصلی بازبین</b>\n' + vxEsc_(raw), 3500).forEach(function (p) { tgSend_(chat, p); });
  (d.changes || []).slice(0, 30).forEach(function (c) {
    tgSend_(chat, '#' + vxFa_(c.id) + ' ' + (c.on ? '✅' : '⬜️') + (c.rej ? ' ✕ رد' : '') + ' · ' + (c.src === 'doc' ? 'از متن سند' : 'ساختهٔ Gemini از یادداشت') +
      (c.old ? '\n<b>قبل:</b> ' + vxEsc_(mcShort_(c.old, 900)) : '') + (c.neu ? '\n<b>بعد:</b> ' + vxEsc_(mcShort_(c.neu, 900)) : '') + (c.why ? '\n<i>' + vxEsc_(c.why) + '</i>' : ''),
      { inline_keyboard: [[vxB_(c.on ? '⬜️ برداشتن تیک' : '✅ تیک', 'rv:t:' + code + ':' + c.id)]] });
  });
  tgSend_(chat, 'تصمیم:', { inline_keyboard: [[vxB_('✅ تأیید سردبیری', 'rv:ok:' + code), vxB_('❓ سؤال از بازبین', 'rv:q:' + code)], [vxB_('🎧 ویس‌های بازبین', 'rv:v:' + code), vxB_('🗑 رد کل بازبینی', 'rv:x:' + code)]] });
}
function rvToggleCb_(chat, data) {
  var a = String(data).split(':'), code = a[2], id = +a[3];
  var e = vxEdGet_(code), w = rvCan_(chat, e);
  if (w) return tgSend_(chat, w);
  var d = vxEdData_(e), c = (d.changes || []).filter(function (x) { return x.id === id; })[0];
  if (!c) return;
  rvDecide_(code, [{ id: id, on: !c.on, rej: false }]);
  tgSend_(chat, '#' + vxFa_(id) + (c.on ? ' برداشته شد.' : ' تیک خورد.'));
}
function rvSendVoices_(chat, code) {
  var e = vxEdGet_(code), w = rvCan_(chat, e);
  if (w) return tgSend_(chat, w);
  var m = mcGet_(vxEdData_(e).c), ids = rvVoiceIds_(m);
  if (!ids.length) return tgSend_(chat, 'بازبین ویسی نفرستاده است.');
  if (rvDry_()) return tgSend_(chat, 'ویس‌ها: ' + ids.length);
  ids.forEach(function (id) { try { var f = DriveApp.getFileById(id); if (/audio|ogg|mpeg/.test(String(f.getMimeType()))) tgApi_('sendAudio', { chat_id: chat, audio: f.getBlob() }); } catch (x) { vxErr_('rv voice', x); } });
}

/* ---------- مینی‌اپ ---------- */
function rvApi_(p, api) {
  var who = tgApiWho_(p);
  if (!who) return { ok: false, error: 'auth' };
  var chat = String(who.chat);
  if (api === 'rv.list') {
    var rows = vxEdRows_().filter(function (e) { return RV_OPEN.indexOf(e['وضعیت']) > -1; }).map(function (e) {
      return { code: e['کد'], title: e['عنوان'], reviewer: e['بازبین'], st: e['وضعیت'], n: +e['پیشنهادها'] || 0, on: +e['پذیرفته'] || 0, owner: e[RV_COL.OWN] || '', at: e['زمان'], late: rvLate_(e) };
    });
    return { ok: true, rows: rows, owner: rvIsOwner_(chat) };
  }
  var code = String(p.code || '');
  var e = vxEdGet_(code), w = rvCan_(chat, e);
  if (w) return { ok: false, error: w };
  if (api === 'rv.open') {
    var d = vxEdData_(e), post = null;
    try { post = mcPost_(d.post); } catch (x) {}
    return { ok: true, code: code, st: e['وضعیت'], owner: rvIsOwner_(chat), editor: rvIsEd_(chat), link: post ? post.link : '', late: rvLate_(e),
      d: { title: d.title, reviewer: d.reviewer, verdict: d.verdict, raw: d.raw || '', tr: d.tr || '', doc: d.doc || '', notes: d.notes || [], qc: d.qc || [],
        checks: d.checks || [], qa: d.qa || [], ownerNotes: d.ownerNotes || [], edNote: d.edNote || '', voices: rvVoiceIds_(mcGet_(d.c)).length,
        changes: (d.changes || []).map(function (c) { return { id: c.id, kind: c.kind, src: c.src, old: c.old, neu: c.neu, after: c.after || '', why: c.why || '', on: !!c.on, rej: !!c.rej, cm: c.cm || '', edited: !!c.edited }; }) } };
  }
  if (api === 'rv.act') {
    var act = String(p.act || ''), decs = p.dec;
    if (typeof decs === 'string') { try { decs = JSON.parse(decs); } catch (x2) { decs = []; } }
    if (act !== 'publish' && act !== 'back' && (decs || p.comment !== undefined)) rvDecide_(code, decs || [], p.comment);
    if (act === 'save') return { ok: true, msg: 'ذخیره شد.' };
    if (act === 'approve') return rvApprove_(chat, code);
    if (act === 'ask') return rvAsk_(chat, code, p.text);
    if (act === 'reject') return rvReject_(chat, code);
    if (act === 'voice') { rvSendVoices_(chat, code); return { ok: true, msg: 'ویس‌ها در بات برایتان آمد.' }; }
    if (act === 'publish') return rvPublish_(chat, code);
    if (act === 'back') return rvBack_(chat, code, p.text, 0);
    return { ok: false, error: 'act' };
  }
  return { ok: false, error: 'unknown' };
}

/* ---------- مهلت‌ها و جمع‌بندی ۱۸ ---------- */
function rvLate_(e) {
  var t0 = rvParse_(e['زمان']), now = rvNow_(), days = rvBizDays_(t0, now);
  if ([RV_ST.ED, RV_ST.BACKY].indexOf(e['وضعیت']) > -1) return days > RV_DEADLINE.ed ? days : 0;
  if (e['وضعیت'] === RV_ST.READY) return days > RV_DEADLINE.owner ? days : 0;
  return 0;
}
/* از tgWatchdog (ساعتی): یک یادآوری برای هر مورد معوق در هر مرحله، فقط ۹ تا ۱۸ */
function rvDeadlineTick_() {
  if (!rvInHours_()) return 0;
  var P = rvDry_() ? null : PropertiesService.getScriptProperties(), n = 0;
  vxEdRows_().forEach(function (e) {
    var late = rvLate_(e);
    if (!late) return;
    var k = 'RV_REM:' + e['کد'] + ':' + e['وضعیت'];
    if (rvDry_() ? TG_MEM[k] : P.getProperty(k)) return;
    if (rvDry_()) TG_MEM[k] = '1'; else P.setProperty(k, rvStamp_());
    var msg = '⏰ مهلت <code>' + e['کد'] + '</code> («' + vxEsc_(mcShort_(e['عنوان'], 50)) + '») گذشته است: ' + vxFa_(late) + ' روز کاری در «' + e['وضعیت'] + '».';
    if (e['وضعیت'] === RV_ST.READY) tgSend_(rvOwnerChat_(), msg, { inline_keyboard: [[vxB_('✅ انتشار', 'rv:p:' + e['کد']), vxB_('↩️ برگشت با یادداشت', 'rv:b:' + e['کد'])]] });
    else (rvDry_() ? (MC_DRY_EDITORS || []) : mcEditors_()).forEach(function (x) { tgSend_(x, msg, { inline_keyboard: [[rvAppBtn_('🔍 باز کردن', e['کد'])]] }); });
    n++;
  });
  return n;
}
/* از tgDigestEvening (۱۸:۰۰): موارد معوق بازبینی برای یاسر */
function rvEvening_() {
  var late = vxEdRows_().filter(function (e) { return rvLate_(e) > 0; });
  if (!late.length) return 0;
  tgSend_(rvOwnerChat_(), '🔬 <b>بازبینی علمی · معوق</b>\n' + late.map(function (e) { return '• <code>' + e['کد'] + '</code> ' + vxEsc_(mcShort_(e['عنوان'], 40)) + ' · ' + e['وضعیت'] + ' · ' + vxFa_(rvLate_(e)) + ' روز کاری'; }).join('\n'));
  return late.length;
}

/* یک‌بارهٔ خودکار بعد از انتشار سبز: ستون‌ها، فهرست کشویی، تب «امتیازها»، و انتقال ردیف‌های باز (E-4001 و بقیه) به روند تازه */
function tgV169Setup() {
  var out = [rvSheetCols_()];
  if (!rvDry_()) rvPtsSheet_();
  out.push('تب امتیازها: آماده');
  var moved = [];
  vxEdRows_().forEach(function (e) {
    var st = e['وضعیت'];
    if ([RV_ST.PUB, RV_ST.REJ].indexOf(st) > -1 || !e['فایل']) return;
    if (RV_OPEN.indexOf(st) > -1 && st !== RV_ST.READY) return;
    var d = vxEdData_(e), m = mcGet_(d.c);
    if (!d.raw && m) d.raw = m['متن'] || '';
    if (!d.tr && m) d.tr = rvVoiceText_(m);
    vxEdSave_(e, d);
    rvSet_(e['کد'], RV_ST.ED, { [RV_COL.AT]: e[RV_COL.AT] || e['زمان'], [RV_COL.RAW]: mcShort_(d.raw, 45000), [RV_COL.TR]: mcShort_(d.tr, 45000) });
    rvEditorCard_(e['کد'], 'این مورد به روند تازهٔ بازبینی منتقل شد. حالا حرف اصلی بازبین را کنار هر تغییر می‌بینید.');
    moved.push(e['کد']);
  });
  out.push('منتقل‌شده به صف سردبیر: ' + (moved.length ? moved.join('، ') : 'هیچ'));
  return out.join(' · ');
}

/* ---------- تست (خشک) ---------- */
function rvTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX, edK = MC_DRY_EDITORS, rowsK = MC_DRY_ROWS;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; MC_DRY_EDITORS = ['7001']; MC_DRY_ROWS = [];
  try {
    var OWN = rvOwnerChat_();
    /* ریشهٔ ۴۰۴: لینک دیگر به /review/ با w نمی‌رود */
    ok('لینک بررسی دیگر پارامتر w وردپرس ندارد (روی کد قبلی مردود)', !/[?&]w=/.test(vxPageUrl_('E-4001', '7001')) && vxPageUrl_('E-4001', '7001').indexOf('start=rv_E-4001') > -1);
    /* ساخت ردیف و صف سردبیر */
    MC_DRY_ROWS.push({ 'کد': 'C-2003', 'نوع': 'بازبینی', 'شناسهٔ مطلب': '86', 'عنوان مطلب': 'مادر خودشیفته', 'نام': 'بازبین آزمایشی', 'chat_id': '8101', 'وضعیت': MC_ST.SENT,
      'نتیجهٔ بازبینی': MC_VERDICT.b, 'متن': 'پاراگراف دوم دقیق نیست؛ دلبستگی ناایمن را درست بنویسید.', 'فایل درایو': 'DRYabcdefghijklmnopqrstuvwxyz', 'نام روی صفحه': 'بله' });
    TG_MEM['vxed'] = [];
    var code = vxEdQueue_('C-2003');
    ok('ردیف تازه با وضعیت «تازه» و زمان ثبت', vxEdGet_(code)['وضعیت'] === RV_ST.NEW && !!vxEdGet_(code)[RV_COL.AT]);
    TG_MEM['vxedfile'] = { v: 1, code: code, c: 'C-2003', post: 86, title: 'مادر خودشیفته', reviewer: 'بازبین آزمایشی', verdict: MC_VERDICT.b, consent: 'بله',
      raw: 'پاراگراف دوم دقیق نیست', tr: 'متن ویس با دلبستگی ناایمن', qc: ['عنوان سئو کوتاه است.'],
      changes: [{ id: 1, src: 'doc', kind: 'edit', old: 'دلبستگی نا امن', neu: 'دلبستگی ناایمن', on: true }, { id: 2, src: 'note', kind: 'edit', old: 'جملهٔ دوم', neu: 'جملهٔ دوم بهتر', on: false }] };
    vxEdSet_(code, { 'فایل': 'DRYFILE' });
    rvSet_(code, RV_ST.ED);
    TG_OUTBOX = [];
    rvEditorCard_(code);
    var card = TG_OUTBOX.filter(function (o) { return o.chat === '7001'; })[0];
    ok('کارت سردبیر دکمهٔ مینی‌اپ دارد، نه لینک سایت (روی کد قبلی مردود)', card && JSON.stringify(card.markup).indexOf('web_app') > -1 && JSON.stringify(card.markup).indexOf('?rv=' + code) > -1 && JSON.stringify(card.markup).indexOf('tajrobeh.life/review') < 0);
    /* مینی‌اپ: سردبیر حرف اصلی بازبین را کنار تغییرها می‌بیند */
    TG_MEM['apiwho'] = { chat: 7001, name: 'سردبیر' };
    var op = rvApi_({ initData: 'x', code: code }, 'rv.open');
    ok('rv.open: متن اصلی و ویس پیاده‌شدهٔ بازبین کنار تغییرها', op.ok && op.d.raw.indexOf('پاراگراف دوم') > -1 && op.d.tr.indexOf('دلبستگی') > -1 && op.d.changes.length === 2);
    TG_MEM['apiwho'] = { chat: 9999, name: 'غریبه' };
    ok('غیرسردبیر صف را باز نمی‌کند', rvApi_({ initData: 'x', code: code }, 'rv.open').ok === false);
    TG_MEM['apiwho'] = { chat: 7001, name: 'سردبیر' };
    rvApi_({ initData: 'x', code: code, act: 'save', dec: [{ id: 2, on: true, neu: 'جملهٔ دوم — بهتر', cm: 'خوب است' }, { id: 1, rej: true }] }, 'rv.act');
    var dd = vxEdData_(vxEdGet_(code));
    ok('تیک، ویرایش متن (بی خط تیره)، رد و نظر ذخیره می‌شود', dd.changes[1].on && dd.changes[1].neu.indexOf('—') < 0 && dd.changes[1].cm === 'خوب است' && dd.changes[0].rej && !dd.changes[0].on);
    /* سؤال از بازبین و جواب */
    TG_OUTBOX = [];
    var ask = rvApi_({ initData: 'x', code: code, act: 'ask', text: 'منظورتان از پاراگراف دوم کدام جمله است؟' }, 'rv.act');
    ok('سؤال از بازبین: وضعیت «برگشت به بازبین» و پیام به بازبین', ask.ok && vxEdGet_(code)['وضعیت'] === RV_ST.BACKR && TG_OUTBOX.some(function (o) { return o.chat === '8101'; }));
    rvRoute_('8101', { text: 'جملهٔ سوم پاراگراف دوم.' });
    ok('جواب بازبین ← دوباره صف سردبیر با پیام به سردبیر', vxEdGet_(code)['وضعیت'] === RV_ST.ED && vxEdData_(vxEdGet_(code)).qa[0].a.indexOf('جملهٔ سوم') > -1);
    /* چک آمادگی قرمز ← برگشت به سردبیر، نه کارت یاسر */
    TG_MEM['rv:post'] = { id: 86, link: 'https://tajrobeh.life/x/', title: 'کوتاه', meta: 'کوتاه', schema: '{"@graph":[]}', html: '<p>جملهٔ دوم</p>', text: 'جملهٔ دوم' };
    TG_OUTBOX = [];
    var ap = rvApi_({ initData: 'x', code: code, act: 'approve' }, 'rv.act');
    ok('چک قرمز: کارت به صف سردبیر برمی‌گردد و یاسر کارت نمی‌گیرد (معیار ۳)', ap.ok && ap.ready === false && vxEdGet_(code)['وضعیت'] === RV_ST.ED && !TG_OUTBOX.some(function (o) { return o.chat === OWN && /آمادهٔ انتشار/.test(o.text || ''); }));
    /* چک سبز ← آمادهٔ انتشار و کارت سه‌خطی یاسر */
    TG_MEM['rv:post'] = { id: 86, link: 'https://tajrobeh.life/x/', title: 'مادر خودشیفته و اثر آن بر فرزندان | تجربه زندگی', meta: new Array(13).join('توضیح متا ') + 'پایان',
      schema: '{"@graph":[{"@type":"Article"}]}', html: '<p>جملهٔ دوم</p><a href="https://tajrobeh.life/a/">ا</a><a href="/b/">ب</a><img alt="تصویر">', text: 'جملهٔ دوم' };
    TG_OUTBOX = [];
    var ap2 = rvApprove_('7001', code);
    ok('همهٔ چک‌ها سبز ← «آمادهٔ انتشار» و کارت یاسر با دو دکمه', ap2.ready === true && vxEdGet_(code)['وضعیت'] === RV_ST.READY && TG_OUTBOX.some(function (o) { return o.chat === OWN && JSON.stringify(o.markup || {}).indexOf('rv:p:' + code) > -1 && JSON.stringify(o.markup || {}).indexOf('rv:b:' + code) > -1; }));
    ok('سردبیر نمی‌تواند خودش منتشر کند', rvPublish_('7001', code).ok === false);
    /* برگشت از یاسر */
    rvBack_(OWN, code, 'عنوان را عوض کنید', 0);
    ok('برگشت با یادداشت ← «برگشت از یاسر» و کارت سردبیر', vxEdGet_(code)['وضعیت'] === RV_ST.BACKY);
    rvApprove_('7001', code);
    /* انتشار ← امتیاز و پیام */
    TG_OUTBOX = [];
    TG_MEM['vxsite'] = { ok: true, results: [{ id: 2, ok: true }] };
    var pub = rvPublish_(OWN, code);
    ok('انتشار: «منتشر شد»، امتیاز ۳ در «امتیازها» و پیام به بازبین (معیار ۶)', pub.ok && vxEdGet_(code)['وضعیت'] === RV_ST.PUB &&
      rvPtsRows_().some(function (r) { return r.ref === code && r.pts === 3; }) && TG_OUTBOX.some(function (o) { return o.chat === '8101' && /امتیاز/.test(o.text || ''); }));
    ok('امتیاز تکراری ثبت نمی‌شود', rvPoint_('بازبین آزمایشی', RV_PTS.REVFIX, code) === '' && rvPointsOf_('بازبین آزمایشی') === 3);
    /* مهلت */
    TG_MEM['vxed'].push({ _row: 9, 'کد': 'E-4999', 'عنوان': 'آزمون مهلت', 'وضعیت': RV_ST.ED, 'زمان': '2026-09-20 10:00', 'فایل': 'X' });
    TG_MEM['rv:now'] = pbTehran_(2026, 10, 4, 10, 0).getTime();
    TG_OUTBOX = [];
    ok('مهلت ۵ روز کاری سردبیر: یک بار یادآوری', rvDeadlineTick_() === 1 && rvDeadlineTick_() === 0);
    ok('جمع‌بندی ۱۸ یاسر مورد معوق را دارد', rvEvening_() === 1);
    ok('ویس بازبینی با Gemini پیاده می‌شود و اصطلاح بالینی درست می‌ماند', rvTranscribe_(null).indexOf('دلبستگی ناایمن') > -1);
    ok('اندپوینت‌ها در رجیستری', ['rv.list', 'rv.open', 'rv.act', 'pts.me'].every(function (a) { return TG_CAP.some(function (c) { return c.api === a; }); }));
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; MC_DRY_EDITORS = edK; MC_DRY_ROWS = rowsK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ روند بازبینی درست است'));
  return tgTestTally_(log, fail);
}
