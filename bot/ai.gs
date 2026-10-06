/**
 * ai.gs · v170.23.7 · ۱۴ مهر ۱۴۰۵ · جمنای به‌جای گروک، کامل (تصمیم یاسر)
 *
 * همهٔ کارهای مدل بات از اینجا می‌گذرد؛ هیچ فراخوانی Groq نمانده:
 *   - aiTranscribe_: متن کردن صدا مستقیم از خود فایل صوتی (tgRmTranscribe_ همین را صدا می‌زند).
 *   - aiJson_: خروجی ساختاریافتهٔ JSON با schema (برداشت صوتی مراجع، خلاصه، …).
 *   - aiRoute_: تشخیص نوع و منظور، صاحب، خلاصه، کارها و پیش‌نویس پاسخ؛ زیر آستانهٔ اطمینان به آدم می‌رود.
 * زمینه: AI_CONTEXT (همان docs/ai/context.md، بی اسم و شماره).
 *
 * قاعدهٔ حریم خصوصی (جای قاعدهٔ قبلی voice.gs): همه با جمنای، ولی صدا یا متنِ مراجع و پیام خصوصی فقط وقتی به مدل می‌رود که
 * کلید Gemini API پولی باشد (Paid tier: دادهٔ ورودی برای آموزش مدل استفاده نمی‌شود). از خود کلید نمی‌شود فهمید پولی است یا نه؛
 * Cowork بعد از دیدن صورت‌حساب پروژه در AI Studio کلید GEMINI_PAID را «بله» می‌کند. تا آن موقع مسیر خصوصی متن نمی‌سازد
 * (پیام صوتی همان‌طور به پذیرش می‌رسد و از فرستنده خواسته می‌شود بنویسد). فایل صدا هیچ‌جا ذخیره نمی‌شود.
 * حالت خشک: TG_MEM['ai:tr'] متن ساختگی، TG_MEM['ai:json'] پاسخ ساختگی، TG_MEM['ai:calls'] ثبت فراخوانی‌ها.
 */
var AI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
var AI_MIN_CONF = 0.7;
cfg_('GEMINI_PAID', '');   /* «بله» فقط بعد از تأیید Cowork که پروژهٔ کلید صورت‌حساب فعال دارد */

function aiDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function aiPaid_() { return String(cfg_('GEMINI_PAID', '') || '').trim() === 'بله'; }
function aiLog_(kind, priv) { if (aiDry_()) (TG_MEM['ai:calls'] = TG_MEM['ai:calls'] || []).push({ kind: kind, priv: !!priv }); }

/** فراخوانی خام با چند مدل جایگزین؛ parts: [{text}|{inline_data}] */
function aiGen_(parts, schema, temp) {
  var last = '';
  for (var k = 0; k < AI_MODELS.length * 2; k++) {
    var mdl = AI_MODELS[k % AI_MODELS.length];
    var cfg = { temperature: temp == null ? 0.2 : temp };
    if (schema) { cfg.responseMimeType = 'application/json'; cfg.responseSchema = schema; }
    var res = gemFetch_('models/' + mdl + ':generateContent', { contents: [{ role: 'user', parts: parts }], generationConfig: cfg });
    if (res.code === 200) {
      var t = ((((res.body.candidates || [])[0] || {}).content || {}).parts || []).map(function (p) { return p.text || ''; }).join('');
      if (!schema) return { text: t, _model: mdl };
      try { var o = JSON.parse(t); o._model = mdl; return o; } catch (e) { last = mdl + ' JSON'; continue; }
    }
    last = mdl + ' ' + res.code;
    if (res.code === 400 || res.code === 403) break;
    Utilities.sleep(3000 + 3000 * Math.floor(k / AI_MODELS.length));
  }
  throw new Error('Gemini: ' + last);
}

/* ───── صدا ← متن ───── */
var AI_TR_SCHEMA = { type: 'OBJECT', properties: { text: { type: 'STRING' },
  segs: { type: 'ARRAY', items: { type: 'OBJECT', properties: { s: { type: 'NUMBER' }, e: { type: 'NUMBER' }, t: { type: 'STRING' } }, required: ['s', 'e', 't'] } } }, required: ['text'] };
function aiMime_(blob) {
  var ct = String(blob.getContentType() || ''), n = String(blob.getName() || '');
  if (/mpeg|mp3/.test(ct) || /\.mp3$/i.test(n)) return 'audio/mp3';
  if (/wav/.test(ct) || /\.wav$/i.test(n)) return 'audio/wav';
  if (/m4a|mp4|aac/.test(ct) || /\.(m4a|mp4|aac)$/i.test(n)) return 'audio/aac';
  return 'audio/ogg';
}
/** opts.priv: صدای مراجع یا پیام خصوصی (فقط با کلید پولی). خروجی {engine, text, segs, note} مثل tgRmTranscribe_ قبلی */
function aiTranscribe_(blob, opts) {
  opts = opts || {};
  aiLog_('tr', opts.priv);
  if (opts.priv && !aiPaid_()) return { engine: '', text: '', segs: [], note: 'کلید پولی جمنای تأیید نشده؛ صدای خصوصی متن نمی‌شود' };
  if (aiDry_()) return { engine: 'gemini (dry)', text: TG_MEM['ai:tr'] || 'متن آزمایشی ویس', segs: [], note: '' };
  try {
    var o = aiGen_([{ text: 'این صدای فارسی را کامل و کلمه‌به‌کلمه به متن فارسی بنویس، با املای درست و نیم‌فاصله، بی خلاصه‌کردن و بی افزودن. ' +
      'خط تیرهٔ بلند وسط جمله ننویس. segs: تکه‌های جمله‌ای با زمان شروع و پایان به ثانیه.' + (opts.hint ? '\nزمینه: ' + opts.hint : '') },
      { inline_data: { mime_type: aiMime_(blob), data: Utilities.base64Encode(blob.getBytes()) } }], AI_TR_SCHEMA, 0);
    var segs = (o.segs || []).map(function (s) { return [Math.round(s.s * 100) / 100, Math.round(s.e * 100) / 100, String(s.t || '').replace(/\s*[—–]\s*/g, '، ').trim()]; }).filter(function (s) { return s[2]; });
    return { engine: 'gemini ' + o._model, text: String(o.text || '').replace(/\s*[—–]\s*/g, '، ').trim(), segs: segs, note: '' };
  } catch (e) { return { engine: 'gemini', text: '', segs: [], note: String(e.message || e).slice(0, 160) }; }
}

/* ───── JSON ساختاریافته ───── */
function aiJson_(prompt, schema, opts) {
  opts = opts || {};
  aiLog_('json', opts.priv);
  if (opts.priv && !aiPaid_()) throw new Error('کلید پولی جمنای تأیید نشده');
  if (aiDry_()) { if (TG_MEM['ai:json'] === undefined) throw new Error('dry'); return JSON.parse(JSON.stringify(TG_MEM['ai:json'])); }
  var o = aiGen_([{ text: prompt }], schema, opts.temp);
  delete o._model;
  return o;
}

/* ───── بستهٔ زمینه (همان docs/ai/context.md) ───── */
var AI_CONTEXT = [
  'تو دستیار عملیات «مرکز تجربه زندگی» هستی: مرکز روان‌درمانی و آموزش روانکاوی، آنلاین و حضوری. همه‌چیز فارسی.',
  'نقش‌ها: مراجع، درمانگر، استاد، سوپروایزر، دانشجو، پارتنر، تیم پذیرش، مسئول مالی، مسئول روان‌پزشکی، مسئول مدرسه، مدیر عملیات، ناظر.',
  'صف‌ها (مسیریابی): پذیرش (وقت، معارفه، تغییر جلسه، لینک جلسه، مراجع)، مالی (پرداخت، تسویه، تنخواه)، روان‌پزشکی (ویزیت، نسخه، دارو)، ' +
    'مدرسه (کلاس، ثبت‌نام، سوپرویژن آموزشی)، حضوری (اتاق و ساعت حضوری)، پارتنر، فنی (اشکال بات و سایت)، مدیریت (بقیه).',
  'وضعیت رشته: تازه، در دست، منتظر طرف، بسته. «بسته» فقط با پاسخ واقعی یا علت بستن.',
  'واژگان: معارفه = جلسهٔ آشنایی اول؛ رودمپ = مسیر همراهی مهاجران؛ هاب = شیت عملیات؛ کارتابل = فهرست کارهای هر نفر.',
  'حریم خصوصی: نام، شماره، ایمیل یا هر دادهٔ شناسایی مراجع را در خلاصه، کار یا پیش‌نویس تکرار نکن. تشخیص بالینی نده. بحران (آسیب به خود یا دیگری) = نوع «بحران» و اطمینان پایین برای اینکه آدم فوری ببیند.',
  'پیش‌نویس پاسخ: کوتاه، محترمانه، دوم شخص جمع، بی وعدهٔ زمانی که نمی‌دانی، بی خط تیرهٔ بلند وسط جمله.',
  'اطمینان: عدد ۰ تا ۱. هر جا مطمئن نیستی پایین بده؛ زیر ۰٫۷ را آدم بررسی می‌کند.'
].join('\n');
var AI_ROUTE_SCHEMA = { type: 'OBJECT', properties: {
  type: { type: 'STRING' }, owner: { type: 'STRING' }, summary: { type: 'STRING' },
  tasks: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, due_days: { type: 'INTEGER' } }, required: ['title'] } },
  draft: { type: 'STRING' }, confidence: { type: 'NUMBER' } }, required: ['type', 'owner', 'summary', 'confidence'] };
var AI_QUEUES = ['پذیرش', 'مالی', 'روان‌پزشکی', 'مدرسه', 'حضوری', 'پارتنر', 'فنی', 'مدیریت'];
/** {type, owner (یکی از AI_QUEUES), summary, tasks, draft, confidence, human} */
function aiRoute_(text, meta) {
  meta = meta || {};
  var o;
  try {
    o = aiJson_(AI_CONTEXT + '\n\nیک پیام ورودی آمده' + (meta.role ? ' از «' + meta.role + '»' : '') + (meta.kind ? ' (نوع اولیه: ' + meta.kind + ')' : '') +
      '. نوع و منظورش، صفی که باید برود (یکی از: ' + AI_QUEUES.join('، ') + ')، خلاصهٔ یک‌جمله‌ای، کارهای لازم و پیش‌نویس پاسخ را بده.\n\nپیام:\n' + String(text || '').slice(0, 4000),
      AI_ROUTE_SCHEMA, { priv: true, temp: 0.1 });
  } catch (e) { return { type: '', owner: '', summary: '', tasks: [], draft: '', confidence: 0, human: true, why: String(e.message || e).slice(0, 80) }; }
  o.owner = AI_QUEUES.indexOf(o.owner) > -1 ? o.owner : '';
  o.confidence = Math.max(0, Math.min(1, Number(o.confidence) || 0));
  o.tasks = (o.tasks || []).slice(0, 5);
  o.draft = String(o.draft || '').replace(/\s*[—–]\s*/g, '، ');
  o.human = o.confidence < AI_MIN_CONF || !o.owner || /بحران/.test(o.type || '');
  return o;
}

/* ───── ویس‌های بی‌متن: تلاش دوباره (فقط شناسهٔ تلگرام، حداکثر ۷ روز؛ خود فایل هرگز ذخیره نمی‌شود) ───── */
var AI_RETRY_D = 7;
function aiRetryList_(v) {
  if (aiDry_()) { if (v !== undefined) TG_MEM['ai:retry'] = v; return TG_MEM['ai:retry'] || []; }
  var P = PropertiesService.getScriptProperties();
  if (v !== undefined) { P.setProperty('AI_VOICE_RETRY', JSON.stringify(v)); return v; }
  try { return JSON.parse(P.getProperty('AI_VOICE_RETRY') || '[]'); } catch (e) { return []; }
}
/** از tgMsgDeliver_ وقتی متن ویس نیامد: {th, fid, at} */
function aiRetryAdd_(th, fid) { var L = aiRetryList_(); if (!L.some(function (x) { return x.fid === fid; })) { L.push({ th: th, fid: fid, at: Date.now() }); aiRetryList_(L.slice(-50)); } }
/** ساعتی: متن ویس‌های مانده؛ متن کنار همان پیام در تب «پیام‌ها» (ستون متن) */
function aiRetryTick_() {
  var L = aiRetryList_(), keep = [], n = 0, now = aiDry_() && TG_MEM['ai:now'] ? TG_MEM['ai:now'] : Date.now();
  L.forEach(function (x) {
    if (now - x.at > AI_RETRY_D * 86400000) return;   /* بعد از ۷ روز شناسه هم پاک می‌شود */
    var tx = { text: '' };
    try { tx = aiTranscribe_(aiDry_() ? null : tgTgFile_(x.fid).blob, { priv: true }); } catch (e) {}
    if (tx.text && aiMsgFill_(x.th, tx.text)) n++; else keep.push(x);
  });
  aiRetryList_(keep);
  return n;
}
function aiMsgFill_(th, text) {
  if (aiDry_()) { (TG_MEM['ai:filled'] = TG_MEM['ai:filled'] || []).push({ th: th, text: text }); return true; }
  try {
    var sh = tgMsgSS_().getSheetByName(TG_MSG_LOG), n = sh.getLastRow(); if (n < 2) return false;
    var from = Math.max(2, n - 2000), v = sh.getRange(from, 1, n - from + 1, 8).getValues();
    for (var i = v.length - 1; i >= 0; i--) {
      if (String(v[i][0]) === th && String(v[i][7]) === 'ویس' && /^🎙 (ویس|\(ویس، متن گرفته نشد\))$/.test(String(v[i][6]).trim())) {
        sh.getRange(from + i, 7).setValue('🎙 ' + String(text).slice(0, 3900)); return true;
      }
    }
  } catch (e) { tgErr_('aiMsgFill_', e); }
  return false;
}
/* ویس‌های قدیمیِ بی‌متن: شناسهٔ فایل نگه داشته نشده بود (قاعدهٔ حریم خصوصی) و بات تاریخچهٔ گفت‌وگو را نمی‌خواند.
   همکار گیرنده ویس را برای بات فوروارد می‌کند و متن را پس می‌گیرد (فقط تیم؛ فقط با کلید پولی). */
function aiForwardText_(chat, m) {
  if (!(m && m.forward_date && (m.voice || m.audio))) return false;
  var team = false; try { team = tgMsgIsTeam_(tgMsgMe_(chat, '').roles) || tgPrOk_(chat); } catch (e) {}
  if (!team) return false;
  if (!aiPaid_()) { tgSend_(chat, 'متن کردن ویس‌های خصوصی فقط با کلید پولی جمنای انجام می‌شود و هنوز تأیید نشده است.'); return true; }
  var f = m.voice || m.audio, tx = aiTranscribe_(aiDry_() ? null : tgTgFile_(f.file_id).blob, { priv: true });
  tgSend_(chat, tx.text ? '📝 <b>متن ویس</b>:\n' + tgEsc_(tx.text.slice(0, 3800)) : 'متن گرفته نشد؛ دوباره امتحان کنید.');
  return true;
}

/* یک‌بارهٔ خودکار v170.23.7: وضعیت جمنای (کلید هست؟ پولی تأیید شده؟ یک فراخوانی کوچک) و شمار ویس‌های بی‌متن هاب پیام. فقط شمار. */
function tgV170237Gemini() {
  var key = false; try { key = !!gemKey_(); } catch (e) {}
  var ping = '';
  try { ping = aiGen_([{ text: 'فقط بنویس: سلام' }], null, 0)._model; } catch (e) { ping = 'خطا ' + String(e.message || e).slice(0, 40); }
  var empty = 0;
  try {
    var sh = tgMsgSS_().getSheetByName(TG_MSG_LOG), n = sh.getLastRow();
    if (n >= 2) sh.getRange(2, 7, n - 1, 2).getValues().forEach(function (r) { if (String(r[1]) === 'ویس' && /^🎙 (ویس|\(ویس، متن گرفته نشد\))$/.test(String(r[0]).trim())) empty++; });
  } catch (e) {}
  var groq = false; try { var P = PropertiesService.getScriptProperties(); groq = !!(P.getProperty('GROQ_KEY') || P.getProperty('groq')); } catch (e) {}
  return 'جمنای: کلید ' + (key ? 'هست' : 'نیست') + ' · پولی (GEMINI_PAID): ' + (aiPaid_() ? 'تأیید شده' : 'تأیید نشده؛ مسیر خصوصی متن نمی‌سازد') + ' · آزمون: ' + ping +
    ' · ' + (typeof vxcRedo_ === 'function' ? (function () { try { return vxcRedo_('10-06'); } catch (e) { return 'برداشت دوباره: خطا'; } })() : '') +
    ' · ویس بی‌متن در هاب پیام: ' + empty + ' (شناسهٔ فایلشان نگه داشته نشده؛ با فوروارد به بات) · کلید گروک هنوز در Script Properties: ' + (groq ? 'بله، دیگر استفاده نمی‌شود' : 'نه');
}

/* ───── آزمون ───── */
function aiTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = {};
  try {
    TG_CFG_ = { GEMINI_PAID: '' };
    ok('بی کلید پولی: صدای خصوصی متن نمی‌شود', aiTranscribe_(null, { priv: true }).text === '' && /پولی/.test(aiTranscribe_(null, { priv: true }).note));
    ok('بی کلید پولی: صدای عمومی (مجله، رودمپ) متن می‌شود', aiTranscribe_(null, {}).text === 'متن آزمایشی ویس');
    ok('بی کلید پولی: مسیریاب ← آدم', aiRoute_('سلام می‌خواهم جلسه‌ام را جابه‌جا کنم').human === true);
    TG_CFG_ = { GEMINI_PAID: 'بله' };
    ok('با کلید پولی: صدای خصوصی با جمنای', aiTranscribe_(null, { priv: true }).text === 'متن آزمایشی ویس' && TG_MEM['ai:calls'].some(function (c) { return c.kind === 'tr' && c.priv; }));
    TG_MEM['ai:json'] = { type: 'تغییر جلسه', owner: 'پذیرش', summary: 'جابه‌جایی جلسهٔ هفتهٔ بعد', tasks: [{ title: 'هماهنگی وقت تازه', due_days: 1 }], draft: 'سلام — حتماً', confidence: 0.92 };
    var r = aiRoute_('سلام می‌خواهم جلسه‌ام را جابه‌جا کنم', { role: 'مراجع' });
    ok('مسیریاب: JSON ساختاریافته و صف معتبر', r.owner === 'پذیرش' && r.tasks.length === 1 && !r.human && r.draft.indexOf('—') < 0, JSON.stringify(r));
    TG_MEM['ai:json'].confidence = 0.4;
    ok('مسیریاب: زیر آستانه ← آدم', aiRoute_('x').human === true);
    TG_MEM['ai:json'] = { type: 'بحران', owner: 'پذیرش', summary: 's', confidence: 0.99 };
    ok('مسیریاب: بحران همیشه ← آدم', aiRoute_('x').human === true);
    TG_MEM['ai:json'] = { type: 'x', owner: 'صف من‌درآوردی', summary: 's', confidence: 0.99 };
    ok('مسیریاب: صف ناشناخته ← آدم', aiRoute_('x').human === true && aiRoute_('x').owner === '');
    ok('زمینه بی اسم و شماره', !/[0-9۰-۹]{6,}|@/.test(AI_CONTEXT) && AI_QUEUES.every(function (q) { return AI_CONTEXT.indexOf(q) > -1; }));
    /* ویس بی‌متن: تلاش دوباره، ۷ روز، فقط شناسه */
    TG_MEM['ai:retry'] = []; aiRetryAdd_('M-1', 'FID1'); aiRetryAdd_('M-1', 'FID1');
    ok('تلاش دوباره: یک بار برای هر شناسه', aiRetryList_().length === 1);
    ok('تلاش دوباره: متن کنار همان پیام', aiRetryTick_() === 1 && TG_MEM['ai:filled'][0].th === 'M-1' && !aiRetryList_().length);
    TG_MEM['ai:retry'] = [{ th: 'M-2', fid: 'F2', at: Date.now() - 8 * 86400000 }];
    ok('تلاش دوباره: بعد از ۷ روز شناسه هم پاک', aiRetryTick_() === 0 && !aiRetryList_().length);
    ok('هیچ فراخوانی گروک در کد بات نیست', typeof vxGroqJson_ === 'undefined' || String(vxGroqJson_).indexOf('groq.com') < 0);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = null; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'aiTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['جمنای به‌جای گروک (v170.23.7)', 'aiTests']); } catch (eAi) {}
