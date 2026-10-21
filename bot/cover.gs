/**
 * cover.gs · v170.82 · ۲۹ مهر ۱۴۰۵ · کارخانهٔ کاور مجله با Gemini (D116؛ بخش ۷ اسکیل tajrobeh-gemini)
 *
 * چرخه (همه از tgWatchdog، ساعتی؛ بی تریگر تازه):
 * (در این مخزن: قدم سنگین tgWatchdog، فقط ساعت‌های BG_HEAVY_HOURS، هر بار تا ۲ کاور.)
 * ۱) صف در تب «کاور · صف» هاب محتوا: اول مقاله‌های تازه (۱۴ روز اخیر)، بعد قدیمی‌ها به ترتیب ترافیک (pbTrafficOrder_).
 * ۲) برای هر مقاله: بریف و یک استعاره از متن با مدل متنی، بعد تصویر با مدل تصویری Pro و کاورهای مرجع
 *    (COVER_REFS در «تنظیمات تیم»، یا تصویر شاخص چند مطلب اخیر). بی متن و لوگو. PNG در پوشهٔ درایو.
 *    هر ساعت یک کاور، شب (۱ تا ۹) دو کاور، تا شمار کاورهای آماده به سقف روز برسد.
 * ۳) از ساعت ۱۰ یک پیام در روز برای یاسر: حداکثر ۱۰ کاور با دکمهٔ تأیید یا رد هر کدام و «همه».
 *    نمونه: تا یاسر «ادامهٔ کامل» نزده، حداکثر ۳ کاور در روز.
 * ۴) فقط تأییدشده‌ها با اسنیپت tj/v1/cover روی سایت: لوگو در گوشهٔ بالا چپ، webp، تصویر شاخص، alt فارسی،
 *    کش همان نوشته. کاور قبلی حذف نمی‌شود (شناسه‌اش در ستون «کاور قبلی» می‌ماند).
 * - هیچ دادهٔ مراجع به Gemini نمی‌رود: فقط متن مقالهٔ منتشرشده.
 * - تصویر آدم واقعی ساخته نمی‌شود؛ زن در تصویر همیشه با روسری (رسانهٔ ایرانی).
 * - هزینه: هر کاور حدود ۰٫۱۵ دلار (دفتر «Gemini · هزینه» با کار «کاور»).
 * - خاموش کردن: COVER_ON = 0 در «تنظیمات تیم».
 */
var CV_TAB = 'کاور · صف';
var CV_HEAD = ['شناسه', 'عنوان', 'لینک', 'منبع', 'وضعیت', 'استعاره', 'alt', 'فایل درایو', 'مدل', 'هزینه (دلار)', 'ساخته شد', 'پیام', 'تصمیم', 'شناسهٔ کاور تازه', 'کاور قبلی', 'یادداشت'];
var CV_ST = { q: 'در صف', made: 'ساخته شد', sent: 'فرستاده شد', ok: 'تأیید', no: 'رد', live: 'روی سایت', err: 'خطا' };
var CV_ON = String(cfg_('COVER_ON', ''));   /* خالی یا 1 = روشن، 0 = خاموش */
var CV_DAILY = Number(cfg_('COVER_DAILY', 0)) || 10;
var CV_REFS = cfg_('COVER_REFS', []);
var CV_MAX = 10, CV_SAMPLE = 3, CV_HOUR = 10, CV_NEW_DAYS = 14, CV_APPLY_PER_RUN = 3;
var CV_SITE = 'https://tajrobeh.life';

function cvNow_() { return TG_DRY && TG_MEM['cv:now'] ? new Date(Number(TG_MEM['cv:now'])) : new Date(); }
function cvProp_(k, v) {
  if (TG_DRY) { if (v === undefined) return TG_MEM['cvp:' + k] || ''; TG_MEM['cvp:' + k] = v; return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty(k) || '';
  P.setProperty(k, String(v)); return v;
}
function cvRows_() { return pbRows_('c', CV_TAB, CV_HEAD); }
function cvSet_(row, ch) { pbSet_('c', CV_TAB, CV_HEAD, row, ch); }
function cvLimit_() { var d = Math.min(CV_MAX, Math.max(1, CV_DAILY)); return cvProp_('CV_SAMPLE_OK') ? d : Math.min(CV_SAMPLE, d); }
function cvNoDash_(s) { return String(s || '').replace(/\s*[—–]\s*/g, '، ').trim(); }
function cvTime_(d) {
  if (typeof d === 'number') return d;
  if (d instanceof Date) return d.getTime();
  var w = d ? pbWhen_(d) : null;
  return w ? w.getTime() : 0;
}

/* ─────────────────────────── ۱) صف ─────────────────────────── */
function cvEnqueue_(limit) {
  var rows = cvRows_(), have = {}, pending = 0;
  rows.forEach(function (r) {
    have[String(r['شناسه']).trim()] = 1;
    if (r['وضعیت'] === CV_ST.q || r['وضعیت'] === CV_ST.made) pending++;
  });
  var room = limit * 2 - pending;
  if (room <= 0) return 0;
  var m = pbArtMap_(), now = cvNow_().getTime(), add = [], seen = {};
  Object.keys(m).filter(function (id) { return !have[id] && cvTime_(m[id].d) >= now - CV_NEW_DAYS * 86400000; })
    .sort(function (a, b) { return cvTime_(m[b].d) - cvTime_(m[a].d); })
    .forEach(function (id) { seen[id] = 1; add.push({ id: id, src: 'تازه' }); });
  pbTrafficOrder_().forEach(function (id) { id = String(id); if (!have[id] && !seen[id]) { seen[id] = 1; add.push({ id: id, src: 'قدیمی' }); } });
  add = add.slice(0, room);
  pbAddMany_('c', CV_TAB, CV_HEAD, add.map(function (a) {
    var x = m[a.id] || {};
    return { 'شناسه': a.id, 'عنوان': x.t || '', 'لینک': x.u || '', 'منبع': a.src, 'وضعیت': CV_ST.q };
  }));
  return add.length;
}
function cvNext_(rows) {
  var q = rows.filter(function (r) { return r['وضعیت'] === CV_ST.q; });
  return q.filter(function (r) { return r['منبع'] === 'تازه'; })[0] || q[0] || null;
}

/* ─────────────────────────── ۲) ساخت ─────────────────────────── */
var CV_BRIEF_SCHEMA = {
  type: 'OBJECT',
  properties: { metaphor: { type: 'STRING' }, scene: { type: 'STRING' }, background: { type: 'STRING' }, alt: { type: 'STRING' } },
  required: ['metaphor', 'scene', 'background', 'alt']
};
function cvBriefPrompt_(title, text) {
  return ['تو طراح هنری «مجلهٔ تجربه» هستی؛ مجلهٔ روان‌درمانی و روانکاوی. برای کاور این مقاله یک استعارهٔ تصویری بساز. خروجی فقط JSON طبق اسکیما.',
    'قاعده‌ها:',
    '۱. metaphor: یک جملهٔ فارسی، یک استعارهٔ روشن از ایدهٔ اصلی مقاله (نه تیتر، نه شعار).',
    '۲. scene: توصیف تصویری همان استعاره به انگلیسی برای تصویرساز؛ یک صحنهٔ ساده با یک یا دو عنصر، بی هیچ نوشته.',
    '۳. هیچ آدم واقعی، چهرهٔ مشهور یا شخص شناختنی در صحنه نباشد. اگر زن یا دختری هست، با روسری که موها را کامل بپوشاند. بی صحنهٔ بالینی، خون یا خشونت.',
    '۴. background: یک رنگ زمینهٔ تخت و آرام به انگلیسی (مثل warm cream یا dusty teal).',
    '۵. alt: متن جایگزین فارسی زیر ۱۲۵ نویسه که خود تصویر را توصیف کند، بی خط تیره.',
    '',
    'عنوان: ' + title,
    'متن مقاله:',
    text].join('\n');
}
function cvPrompt_(b) {
  return 'Create a magazine cover illustration that matches the style of the attached reference covers: hand-drawn, textured pencil and ink lines, ' +
    'soft hand-painted fills, one flat solid background color (' + b.background + '), a limited palette, strawberry red (#c83f49) only as a small accent. ' +
    'Scene: ' + b.scene + '. One clear visual metaphor, calm and warm, generous empty space. ' +
    'Wide 16:9 landscape composition. Keep the top-left corner (about 15% of the width and height) completely empty, a logo will be placed there. ' +
    'Strict rules: no text, letters, numbers, signatures, logos or watermarks anywhere. Do not depict any real or recognizable person. ' +
    'Any woman or girl shown must wear a headscarf that fully covers her hair, with modest clothing. No nudity, blood or violence. ' +
    'Not photorealistic, not 3D, not a cute vector mascot.';
}
function cvModel_() {
  if (TG_DRY) return TG_MEM['cv:model'] || 'gemini-3-pro-image';
  var c = CacheService.getScriptCache(), hit = c.get('cvModel');
  if (hit) return hit;
  var l = gemFetch_('models?pageSize=200');
  var names = (l.body.models || []).map(function (x) { return String(x.name).replace('models/', ''); });
  var m = gemPickImg_(names, 'pro') || gemPickImg_(names, 'flash');
  if (!m) throw new Error('مدل تصویری پیدا نشد');
  c.put('cvModel', m, 21600);
  return m;
}
/* مرجع‌ها: COVER_REFS (فهرست نشانی تصویر) یا تصویر شاخص چند مطلب اخیر؛ حداکثر ۵ */
function cvRefUrls_() {
  if (CV_REFS && CV_REFS.length) return CV_REFS.slice(0, 5);
  if (TG_DRY) return TG_MEM['cv:refurls'] || [];
  var c = CacheService.getScriptCache(), hit = c.get('cvRefs');
  if (hit) return JSON.parse(hit);
  var out = [];
  try {
    pbWp_('/wp-json/wp/v2/posts?per_page=8&_fields=id,featured_media').forEach(function (p) {
      if (out.length >= 5 || !p.featured_media) return;
      try { var md = pbWp_('/wp-json/wp/v2/media/' + p.featured_media + '?_fields=source_url'); if (md.source_url) out.push(md.source_url); } catch (e) {}
    });
  } catch (e2) { tgErr_('cvRefUrls_', e2); }
  c.put('cvRefs', JSON.stringify(out), 21600);
  return out;
}
function cvRefParts_() {
  return cvRefUrls_().map(function (u) {
    if (TG_DRY) return { inlineData: { mimeType: 'image/png', data: 'UkVG' } };
    var r = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true });
    if (r.getResponseCode() !== 200) return null;
    var b = r.getBlob();
    return { inlineData: { mimeType: b.getContentType() || 'image/webp', data: Utilities.base64Encode(b.getBytes()) } };
  }).filter(Boolean);
}
function cvImgPart_(body) {
  var out = null;
  (((body || {}).candidates) || []).forEach(function (c) {
    (((c || {}).content || {}).parts || []).forEach(function (p) { var d = p && (p.inlineData || p.inline_data); if (d && !out) out = d; });
  });
  return out;
}
function cvFolder_() {
  var id = cvProp_('CV_DRIVE');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('تجربه · کاورهای Gemini');
  cvProp_('CV_DRIVE', f.getId());
  return f;
}
function cvSave_(postId, img) {
  var name = 'cover-' + postId + '-' + Utilities.formatDate(cvNow_(), TG_TZ, 'yyyyMMdd-HHmm') + '.png';
  if (TG_DRY) { var k = 'drv-' + postId; (TG_MEM['cv:drive'] = TG_MEM['cv:drive'] || {})[k] = img.data; return k; }
  return cvFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(img.data), img.mimeType || 'image/png', name)).getId();
}
function cvLoad_(fid) {
  if (TG_DRY) return { b64: (TG_MEM['cv:drive'] || {})[fid] || '', blob: null };
  var b = DriveApp.getFileById(fid).getBlob();
  return { b64: Utilities.base64Encode(b.getBytes()), blob: b };
}

/** یک کاور برای یک ردیف صف؛ خطا را بالا می‌دهد */
function cvGenOne_(row) {
  var id = String(row['شناسه']).trim();
  gemTask_('کاور');
  try {
    var post = pbWp_('/wp-json/wp/v2/posts/' + id + '?_fields=id,title,content,link');
    var title = seoStrip_(post.title && post.title.rendered), text = seoStrip_(post.content && post.content.rendered).slice(0, 9000);
    var b = gemJson_(cvBriefPrompt_(title, text), CV_BRIEF_SCHEMA);
    var mdl = cvModel_(), res = null, img = null;
    for (var k = 0; k < 2 && !img; k++) {
      res = gemFetch_('models/' + mdl + ':generateContent', {
        contents: [{ role: 'user', parts: cvRefParts_().concat([{ text: cvPrompt_(b) }]) }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } }
      });
      img = res.code === 200 ? cvImgPart_(res.body) : null;
      if (!img && (res.code === 429 || res.code >= 500) && !TG_DRY) Utilities.sleep(8000);
    }
    if (!img) throw new Error('تصویر ساخته نشد (HTTP ' + (res && res.code) + ')');
    var fid = cvSave_(id, img);
    cvSet_(row, { 'عنوان': title || row['عنوان'], 'لینک': decodeURI(String(post.link || row['لینک'] || '')), 'وضعیت': CV_ST.made,
      'استعاره': cvNoDash_(b.metaphor), 'alt': cvNoDash_(b.alt).slice(0, 125), 'فایل درایو': fid, 'مدل': mdl,
      'هزینه (دلار)': gemCost_(mdl, (res.body || {}).usageMetadata, 1), 'ساخته شد': cvNow_(), 'یادداشت': '' });
    return fid;
  } finally { gemTask_(''); }
}

/* ─────────────────────────── ۳) پیام روزانه برای یاسر ─────────────────────────── */
function cvTg_(method, payload) {
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'api', method: method, chat: String(payload.chat_id), payload: payload }); return { ok: true, result: [] }; }
  return soPost_(method, payload);
}
function cvKb_(day) {
  var rows = cvRows_().filter(function (r) { return String(r['پیام']) === day; }), kb = [], open = 0;
  rows.forEach(function (r, i) {
    var n = tgFa_(i + 1), id = String(r['شناسه']).trim(), st = r['وضعیت'];
    if (st === CV_ST.sent) { open++; kb.push([{ text: '✅ ' + n, callback_data: 'cv:y:' + id }, { text: '❌ ' + n, callback_data: 'cv:n:' + id }]); }
    else kb.push([{ text: (st === CV_ST.no ? '❌ ' : '✅ ') + n + ' · ' + st, callback_data: 'cv:nop' }]);
  });
  if (open > 1) kb.push([{ text: '✅ همه', callback_data: 'cv:all:' + day }, { text: '❌ همه', callback_data: 'cv:none:' + day }]);
  if (!cvProp_('CV_SAMPLE_OK')) kb.push([{ text: '▶️ ادامهٔ کامل (روزی ' + tgFa_(Math.min(CV_MAX, CV_DAILY)) + ')', callback_data: 'cv:full' }]);
  return { inline_keyboard: kb };
}
function cvSendBatch_() {
  var now = cvNow_(), day = Utilities.formatDate(now, TG_TZ, 'yyyy-MM-dd'), h = Number(Utilities.formatDate(now, TG_TZ, 'H'));
  if (h < CV_HOUR || cvProp_('CV_SENT_DAY') === day) return 0;
  var made = cvRows_().filter(function (r) { return r['وضعیت'] === CV_ST.made && r['فایل درایو']; }).slice(0, cvLimit_());
  if (!made.length) return 0;
  cvProp_('CV_SENT_DAY', day);
  var chat = String(TG_OWNER_CHAT), pay = { chat_id: chat }, media = [];
  made.forEach(function (r, i) {
    var f = cvLoad_(r['فایل درایو']);
    pay['f' + i] = TG_DRY ? f.b64 : f.blob;
    media.push({ type: 'photo', media: 'attach://f' + i, caption: tgFa_(i + 1) + '. ' + String(r['عنوان'] || '').slice(0, 200) });
  });
  if (media.length === 1) { pay.photo = pay.f0; delete pay.f0; pay.caption = media[0].caption; cvTg_('sendPhoto', pay); }
  else { pay.media = JSON.stringify(media); cvTg_('sendMediaGroup', pay); }
  made.forEach(function (r) { cvSet_(r, { 'وضعیت': CV_ST.sent, 'پیام': day }); });
  var lines = made.map(function (r, i) { return tgFa_(i + 1) + '. ' + tgEsc_(r['عنوان']) + '\n   ' + tgEsc_(r['استعاره']); });
  var head = '🎨 <b>کاورهای امروز</b> (' + tgFa_(made.length) + ')\nهر کدام را تأیید یا رد کنید. فقط تأییدشده‌ها روی سایت می‌روند و کاور قبلی حذف نمی‌شود.';
  if (!cvProp_('CV_SAMPLE_OK')) head += '\nاین نمونه است (روزی حداکثر ' + tgFa_(CV_SAMPLE) + '). اگر سبک درست است، «ادامهٔ کامل» را بزنید.';
  tgSend_(chat, head + '\n\n' + lines.join('\n'), cvKb_(day));
  return made.length;
}

/* دکمه‌ها: cv:y:<شناسه> · cv:n:<شناسه> · cv:all:<روز> · cv:none:<روز> · cv:full · cv:nop. فقط یاسر. */
function cvOnCb_(chat, data, cq) {
  if (String(chat) !== String(TG_OWNER_CHAT)) { tgSend_(chat, 'تأیید کاور فقط با یاسر است.'); return true; }
  var p = String(data).split(':'), act = p[1], arg = p[2] || '';
  if (act === 'nop') return true;
  if (act === 'full') {
    cvProp_('CV_SAMPLE_OK', '1');
    tgSend_(chat, '✅ از پیام بعد، روزی تا ' + tgFa_(cvLimit_()) + ' کاور می‌آید.');
    return true;
  }
  var rows = cvRows_(), hit = [], st = (act === 'y' || act === 'all') ? CV_ST.ok : CV_ST.no;
  rows.forEach(function (r) {
    if (r['وضعیت'] !== CV_ST.sent) return;
    if ((act === 'y' || act === 'n') && String(r['شناسه']).trim() === arg) hit.push(r);
    if ((act === 'all' || act === 'none') && String(r['پیام']) === arg) hit.push(r);
  });
  hit.forEach(function (r) { cvSet_(r, { 'وضعیت': st, 'تصمیم': cvNow_() }); });
  var day = hit.length ? String(hit[0]['پیام']) : arg;
  if (cq && cq.message && day) { try { cvTg_('editMessageReplyMarkup', { chat_id: String(chat), message_id: cq.message.message_id, reply_markup: JSON.stringify(cvKb_(day)) }); } catch (e) {} }
  return true;
}

/* ─────────────────────────── ۴) روی سایت ─────────────────────────── */
function cvWp_(path, body) {
  if (TG_DRY) return TG_MEM['cv:wp'](path, body);
  var P = PropertiesService.getScriptProperties();
  var u = P.getProperty('WP_BOT_USER') || '', pw = P.getProperty('WP_BOT_APP_PASSWORD') || '';
  if (!u || !pw) return { code: 0, error: 'creds' };
  var r = UrlFetchApp.fetch(CV_SITE + path, { method: 'post', muteHttpExceptions: true, followRedirects: false, contentType: 'application/json',
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(u + ':' + pw, Utilities.Charset.UTF_8) }, payload: JSON.stringify(body) });
  var j = null; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  return { code: r.getResponseCode(), json: j };
}
function cvApply_() {
  var ok = cvRows_().filter(function (r) { return r['وضعیت'] === CV_ST.ok && r['فایل درایو']; }).slice(0, CV_APPLY_PER_RUN), done = 0;
  for (var i = 0; i < ok.length; i++) {
    var r = ok[i], f = cvLoad_(r['فایل درایو']);
    var res = cvWp_('/wp-json/tj/v1/cover', { post_id: Number(r['شناسه']), image: f.b64, mime: 'image/png', alt: r['alt'] });
    if (res.code === 200 && res.json && res.json.ok) {
      cvSet_(r, { 'وضعیت': CV_ST.live, 'شناسهٔ کاور تازه': res.json.media_id || '', 'کاور قبلی': res.json.previous || '', 'یادداشت': '' });
      done++;
    } else if (res.code === 404 || res.code === 0) {
      cvSet_(r, { 'یادداشت': res.code === 0 ? 'رمز کاربر وردپرس بات در Script Properties نیست' : 'اسنیپت کاور هنوز روی سایت نیست' });
      break;   /* تأییدشده می‌ماند و ساعت بعد دوباره */
    } else {
      cvSet_(r, { 'وضعیت': CV_ST.err, 'یادداشت': 'سایت HTTP ' + res.code + ' ' + String((res.json && (res.json.code || res.json.message)) || '').slice(0, 80) });
      tgErr_('cvApply_', 'HTTP ' + res.code + ' · ' + r['شناسه']);
    }
  }
  return done;
}

/* ─────────────────────────── از tgWatchdog، ساعتی ─────────────────────────── */
function cvHourly_() {
  if (CV_ON === '0') return 'off';
  try { cvApply_(); } catch (e1) { tgErr_('cvApply_', e1); }
  var lim = cvLimit_();
  try { cvEnqueue_(lim); } catch (e2) { tgErr_('cvEnqueue_', e2); }
  var per = 2;   /* فقط در ساعت‌های سنگین صدا زده می‌شود */
  var rows = cvRows_(), made = rows.filter(function (r) { return r['وضعیت'] === CV_ST.made; }).length, gen = 0;
  while (gen < per && made < lim) {
    var row = cvNext_(rows);
    if (!row) break;
    try { cvGenOne_(row); made++; } catch (e3) { cvSet_(row, { 'وضعیت': CV_ST.err, 'یادداشت': String(e3.message || e3).slice(0, 120) }); tgErr_('cvGenOne_', e3); }
    gen++;
  }
  try { cvSendBatch_(); } catch (e4) { tgErr_('cvSendBatch_', e4); }
  return gen;
}

/* ─────────────────────────── تست ─────────────────────────── */
try { TG_SUITES.push(['کارخانهٔ کاور v170.82', 'cvTests']); } catch (eSu) {}

function cvTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX, cfgK = [CV_ON, CV_DAILY, CV_REFS];
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; CV_ON = '1'; CV_DAILY = 10; CV_REFS = [];
  try {
    var D = 86400000, t0 = pbTehran_(2026, 10, 21, 3, 5).getTime();
    TG_MEM['cv:now'] = String(t0);
    var owner = String(TG_OWNER_CHAT);
    TG_MEM['pb:' + PB_T_ART] = [
      { 'شناسه': '901', 'عنوان': 'مقالهٔ تازه', 'لینک': 'https://tajrobeh.life/new/', 'تاریخ انتشار': new Date(t0 - 2 * D) },
      { 'شناسه': '104', 'عنوان': 'پربازدید', 'لینک': 'https://tajrobeh.life/top/', 'تاریخ انتشار': new Date(t0 - 400 * D) },
      { 'شناسه': '50', 'عنوان': 'قدیمی', 'لینک': 'https://tajrobeh.life/old/', 'تاریخ انتشار': new Date(t0 - 900 * D) }];
    TG_MEM['pb:traffic'] = [{ u: 'https://tajrobeh.life/old/', n: 5 }, { u: 'https://tajrobeh.life/top/', n: 900 }];

    ok('نمونه: پیش از «ادامهٔ کامل» روزی ۳، بعد ۱۰ و نه بیشتر (روی کد قبلی مردود)', cvLimit_() === 3 && (cvProp_('CV_SAMPLE_OK', '1'), cvLimit_() === 10) && (CV_DAILY = 40, cvLimit_() === 10));
    CV_DAILY = 10; TG_MEM['cvp:CV_SAMPLE_OK'] = '';
    var n = cvEnqueue_(3), q = cvRows_();
    ok('صف: اول مقالهٔ تازه، بعد قدیمی‌ها به ترتیب ترافیک، تا دو برابر سقف روز', n === 6 && q[0]['شناسه'] === '901' && q[0]['منبع'] === 'تازه' && q[1]['شناسه'] === '104' && q[2]['شناسه'] === '50');
    ok('صف تکراری نمی‌سازد', cvEnqueue_(3) === 0 && cvRows_().length === 6);

    var brief = { metaphor: 'دری نیمه‌باز — رو به نور', scene: 'a half-open door with warm light', background: 'warm cream', alt: 'دری نیمه‌باز — و نور گرم' };
    var img = { code: 200, body: { usageMetadata: { promptTokenCount: 8000 }, candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'UE5H' } }] } }] } };
    TG_MEM['gem:fake'] = [{ code: 200, body: { candidates: [{ content: { parts: [{ text: JSON.stringify(brief) }] } }] } }, img];
    TG_MEM['wp:/wp-json/wp/v2/posts/901?_fields=id,title,content,link'] = { id: 901, title: { rendered: 'مقالهٔ تازه' }, content: { rendered: '<p>متن مقاله دربارهٔ امید</p>' }, link: 'https://tajrobeh.life/new/' };
    TG_MEM['cv:refurls'] = ['https://tajrobeh.life/a.webp', 'https://tajrobeh.life/b.webp'];
    var p = cvPrompt_(brief);
    ok('پرامپت: بی نوشته، بی آدم واقعی، روسری، گوشهٔ بالا چپ خالی', /no text/.test(p) && /real or recognizable person/.test(p) && /headscarf/.test(p) && /top-left corner/.test(p) && /16:9/.test(p));
    var r901 = cvRows_()[0];
    cvGenOne_(r901);
    var L = TG_MEM['gem:ledger'] || [];
    ok('ساخت: بریف و تصویر، فایل در درایو، وضعیت «ساخته شد»', r901['وضعیت'] === CV_ST.made && r901['فایل درایو'] === 'drv-901' && TG_MEM['cv:drive']['drv-901'] === 'UE5H' && r901['مدل'] === 'gemini-3-pro-image');
    ok('alt و استعاره بی خط تیره و alt زیر ۱۲۵ نویسه', !/[—–]/.test(r901['alt'] + r901['استعاره']) && r901['alt'].length <= 125);
    ok('هزینه در دفتر با کار «کاور» و در ردیف', L.length === 2 && L.every(function (x) { return x[1] === 'کاور'; }) && L[1][6] === 1 && r901['هزینه (دلار)'] > 0.13);
    ok('مرجع‌ها همراه درخواست تصویر رفتند', cvRefParts_().length === 2);

    /* پیام روزانه */
    TG_MEM['gem:fake'] = [{ code: 200, body: { candidates: [{ content: { parts: [{ text: JSON.stringify(brief) }] } }] } }, img];
    TG_MEM['wp:/wp-json/wp/v2/posts/104?_fields=id,title,content,link'] = { id: 104, title: { rendered: 'پربازدید' }, content: { rendered: '<p>متن</p>' }, link: 'https://tajrobeh.life/top/' };
    cvGenOne_(cvRows_()[1]);
    TG_OUTBOX = [];
    ok('پیش از ساعت ۱۰ پیامی نمی‌رود', cvSendBatch_() === 0 && TG_OUTBOX.length === 0);
    TG_MEM['cv:now'] = String(pbTehran_(2026, 10, 21, 10, 5).getTime());
    var sent = cvSendBatch_();
    var grp = TG_OUTBOX.filter(function (x) { return x.method === 'sendMediaGroup'; })[0];
    var msg = TG_OUTBOX.filter(function (x) { return x.kind === 'msg'; })[0];
    var kb = msg ? JSON.stringify(msg.markup) : '';
    ok('ساعت ۱۰: یک آلبوم و یک پیام با دکمه فقط برای یاسر (روی کد قبلی مردود)', sent === 2 && grp && grp.chat === owner && msg && msg.chat === owner && TG_OUTBOX.every(function (x) { return String(x.chat) === owner; }));
    ok('دکمهٔ تأیید و رد هر کاور، «همه» و «ادامهٔ کامل»', kb.indexOf('cv:y:901') > -1 && kb.indexOf('cv:n:104') > -1 && kb.indexOf('cv:all:2026-10-21') > -1 && kb.indexOf('cv:full') > -1);
    ok('پیام خط تیرهٔ وسط جمله ندارد', !/[—–]/.test(msg.text));
    ok('همان روز دوباره نمی‌رود', cvSendBatch_() === 0);

    /* تصمیم */
    var rows = cvRows_();
    cvOnCb_('777', 'cv:y:901', null);
    ok('غیر یاسر نمی‌تواند تأیید کند', rows[0]['وضعیت'] === CV_ST.sent);
    TG_OUTBOX = [];
    cvOnCb_(owner, 'cv:y:901', { message: { message_id: 55 } });
    cvOnCb_(owner, 'cv:n:104', { message: { message_id: 55 } });
    ok('تأیید و رد هر کاور و به‌روز شدن دکمه‌ها', rows[0]['وضعیت'] === CV_ST.ok && rows[1]['وضعیت'] === CV_ST.no && TG_OUTBOX.some(function (x) { return x.method === 'editMessageReplyMarkup'; }));
    cvOnCb_(owner, 'cv:full', null);
    ok('«ادامهٔ کامل» سقف را ۱۰ می‌کند', cvLimit_() === 10);

    /* روی سایت */
    var calls = [];
    TG_MEM['cv:wp'] = function (path, body) { calls.push({ path: path, body: body }); return { code: 404, json: { code: 'rest_no_route' } }; };
    ok('اسنیپت هنوز نیست: تأیید می‌ماند و یادداشت می‌گیرد', cvApply_() === 0 && rows[0]['وضعیت'] === CV_ST.ok && /اسنیپت/.test(rows[0]['یادداشت']));
    calls = [];
    TG_MEM['cv:wp'] = function (path, body) { calls.push({ path: path, body: body }); return { code: 200, json: { ok: true, media_id: 7001, previous: 6001 } }; };
    ok('فقط تأییدشده روی سایت می‌رود؛ کاور قبلی نگه داشته می‌شود', cvApply_() === 1 && calls.length === 1 && calls[0].path === '/wp-json/tj/v1/cover' &&
      calls[0].body.post_id === 901 && calls[0].body.image === 'UE5H' && calls[0].body.alt === rows[0]['alt'] && rows[0]['وضعیت'] === CV_ST.live &&
      rows[0]['شناسهٔ کاور تازه'] === 7001 && rows[0]['کاور قبلی'] === 6001 && rows[1]['وضعیت'] === CV_ST.no);

    /* ساعتی */
    TG_MEM['cv:now'] = String(pbTehran_(2026, 10, 22, 3, 5).getTime());
    TG_MEM['gem:fake'] = [{ code: 200, body: { candidates: [{ content: { parts: [{ text: JSON.stringify(brief) }] } }] } }, img];
    TG_MEM['wp:/wp-json/wp/v2/posts/50?_fields=id,title,content,link'] = { id: 50, title: { rendered: 'قدیمی' }, content: { rendered: '<p>متن</p>' }, link: 'https://tajrobeh.life/old/' };
    ok('ساعتی شب: ساخت کاور بعدی از صف', cvHourly_() >= 1 && cvRows_().filter(function (r) { return r['شناسه'] === '50'; })[0]['وضعیت'] === CV_ST.made);
    CV_ON = '0';
    ok('COVER_ON = 0 همه را خاموش می‌کند', cvHourly_() === 'off');
    ok('سیم‌کشی: واچ‌داگ ساعتی و مسیر دکمهٔ cv:', String(tgWatchdog).indexOf('cvHourly_') > -1 && String(tgOnCallback_).indexOf("'cv:'") > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; CV_ON = cfgK[0]; CV_DAILY = cfgK[1]; CV_REFS = cfgK[2]; GEM_TASK = '';
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ کارخانهٔ کاور درست است'));
  return tgTestTally_(log, fail);
}
