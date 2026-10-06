/**
 * voice.gs · v166 · ۷ مهر ۱۴۰۵ · موتور صدای تجربه
 *
 * سه مسیر، با یک قاعدهٔ حریم خصوصی روشن:
 *  v170.23.7 (تصمیم یاسر): Groq کامل حذف شد؛ همه با Gemini (ai.gs). قاعدهٔ حریم خصوصی تازه: صدا و متن مراجع و پیام خصوصی فقط
 *  با کلید پولی Gemini API (دادهٔ ورودی برای آموزش استفاده نمی‌شود؛ تأیید Cowork در کلید GEMINI_PAID)؛ فایل صدا ذخیره نمی‌شود.
 *  ۱) صدایی که قرار است منتشر شود (صدای نویسندهٔ مجله):
 *     درایو ← Auphonic (نویز، اکو، هم‌سطحی، mp3) ← Gemini (متن با زمان‌بندی، خلاصه، جملهٔ برجسته)
 *     ← متن به خود گوینده برمی‌گردد و تأیید می‌کند ← سردبیر ← سایت (tj/v1/mag-voice با امضای HMAC)
 *  ۲) صدای خصوصی (مراجع، پیام به پذیرش، هر ورودی متنی بات): Gemini فقط با کلید پولی، فایل ذخیره نمی‌شود،
 *     متن به خود فرستنده برمی‌گردد و با «همین را بفرست» مثل یک پیام متنی وارد همان مسیر بات می‌شود.
 *     هیچ صدای مراجع به Auphonic نمی‌رود.
 *  ۳) مچ‌میکینگ صوتی مراجع (vxc): مراجع حرفش را می‌گوید، Gemini (کلید پولی) متن و برداشت ساختاریافته می‌سازد
 *     (موضوع، نیازها، سبک، جنسیت، سن، حالت جلسه)، مراجع تأیید می‌کند و مسیر عادی پذیرش ادامه پیدا می‌کند.
 *
 * و خط لولهٔ اصلاحات بازبینی علمی (بخش پایین فایل): گوگل‌داک/یادداشت بازبین ← فهرست تغییر دقیق
 * ← صفحهٔ بررسی سردبیر ← تأیید نهایی یاسر ← tj/v1/post-patch روی مقاله.
 *
 * قلاب‌ها در telegram.gs: vxRoute_ (tgPrivate_) · vxUniversal_ (tgPrivate_ پیش از if(!text)) · vxOnCb_ (کال‌بک vx:)
 *   · دکمهٔ «با صدای خودم» در tgQuizTopic_ · vxcAfterPhone_ (tgOnPhone_) · vxMsgText_ (tgMsgDeliver_)
 * قلاب‌ها در mag_contrib.gs: mcVoiceIn_ ← vxStart_ · mcEditorApprove_ ← vxMagPublish_ · mcReviewSubmit_ ← vxEdQueue_
 * قلاب در Code.gs: doGet با ?vxp= ← vxPage_
 */

var VX_TAB = 'صف صدا';
var VX_HEAD = ['کد', 'زمان', 'کاربرد', 'ارجاع', 'chat_id', 'نام', 'فایل اصلی', 'مدت', 'وضعیت', 'تمیزکاری', 'mp3',
  'متن', 'فایل متن', 'خلاصه', 'جملهٔ برجسته', 'تأیید گوینده', 'خطا', 'تلاش', 'آخرین تغییر', 'بدون تأیید گوینده'];
var VX_ST = { Q: 'در صف', ENH: 'در حال تمیزکاری', TXT: 'در حال متن', ASK: 'منتظر تأیید گوینده', OK: 'تأیید شد', DONE: 'تحویل شد', ERR: 'خطا', DROP: 'کنار گذاشته شد' };
var VX_FOLDER = 'صدا · تمیزشده و متن';
var VX_GEM_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
var VX_AU_ALGO = { filtering: true, leveler: true, normloudness: true, loudnesstarget: -16, denoise: true, denoisemethod: 'dynamic', denoiseamount: 0, deverbamount: 0 };
var VX_DRY_JOBS = null;
var VX_DRY_LLM = null;   // در TG_DRY: پاسخ جعلی مدل برای مچ‌میکینگ صوتی
var VX_DRY_TEXT = null;  // در TG_DRY: متن جعلی ترانویسی

function vxDry_() { return (typeof TG_DRY !== 'undefined') ? !!TG_DRY : false; }
function vxP_() { return PropertiesService.getScriptProperties(); }
function vxErr_(where, e) { try { tgErr_('voice ' + where, String(e && e.stack ? e.stack : e)); } catch (x) {} }
function vxEsc_(s) { return tgEsc_(String(s == null ? '' : s)); }
function vxB_(t, d) { return { text: t, callback_data: d }; }
function vxNoDash_(s) { return String(s || '').replace(/\s*[—–]\s*/g, '، '); }
function vxFa_(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; }); }
function vxClock_(sec) { sec = Math.max(0, Math.round(+sec || 0)); return vxFa_(Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2)); }

/* ================= ترانویسی ================= */

/** خصوصی: Gemini فقط با کلید پولی (ai.gs). فایل جایی نوشته نمی‌شود. */
function vxPrivateText_(fileId) {
  if (vxDry_()) return { text: VX_DRY_TEXT || 'متن آزمایشی ویس', segs: [] };
  var f = tgTgFile_(fileId);
  var ext = (String(f.path).split('.').pop() || 'ogg').replace('oga', 'ogg');
  var tr = tgRmTranscribe_(f.blob.setName('v.' + ext), true);
  return { text: vxNoDash_(String(tr.text || '').trim()), segs: tr.segs || [], note: tr.note || '' };
}

function vxTyping_(chat) { if (!vxDry_()) try { tgApi_('sendChatAction', { chat_id: chat, action: 'typing' }); } catch (e) {} }

/** Gemini با چند بخش (متن + صدا) و خروجی JSON. */
function vxGem_(parts, schema) {
  var last = '';
  for (var k = 0; k < VX_GEM_MODELS.length * 2; k++) {
    var mdl = VX_GEM_MODELS[k % VX_GEM_MODELS.length];
    var res = gemFetch_('models/' + mdl + ':generateContent', {
      contents: [{ role: 'user', parts: parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 }
    });
    if (res.code === 200) {
      var t = (((res.body.candidates || [])[0] || {}).content || {}).parts;
      try { var o = JSON.parse((t || []).map(function (p) { return p.text || ''; }).join('')); o._model = mdl; return o; }
      catch (e) { last = mdl + ' JSON'; continue; }
    }
    last = mdl + ' ' + res.code + ' ' + JSON.stringify(res.body.error || '').slice(0, 160);
    if (res.code === 400 || res.code === 403) break;
    Utilities.sleep(4000 + 4000 * Math.floor(k / VX_GEM_MODELS.length));
  }
  throw new Error('Gemini: ' + last);
}

var VX_TR_SCHEMA = {
  type: 'OBJECT',
  properties: {
    segs: { type: 'ARRAY', items: { type: 'OBJECT', properties: { i: { type: 'INTEGER' }, t: { type: 'STRING' } }, required: ['i', 't'] } },
    summary: { type: 'STRING' },
    quote: { type: 'INTEGER' }
  },
  required: ['segs', 'summary', 'quote']
};

var VX_TR_SCHEMA_RAW = {
  type: 'OBJECT',
  properties: {
    segs: { type: 'ARRAY', items: { type: 'OBJECT', properties: { s: { type: 'NUMBER' }, e: { type: 'NUMBER' }, t: { type: 'STRING' } }, required: ['s', 'e', 't'] } },
    summary: { type: 'STRING' },
    quote: { type: 'INTEGER' }
  },
  required: ['segs', 'summary', 'quote']
};

/**
 * متن عمومی: Gemini، متن با زمان‌بندی از خود صدا (v170.23.7: بی Groq).
 * خروجی {segs:[[s,e,t]], summary, quote:{i,t,s,e}, engine, text}
 */
function vxPublicText_(blob, ctx) {
  var segs0 = [];
  var audio = { inline_data: { mime_type: /mpeg/.test(blob.getContentType()) ? 'audio/mp3' : 'audio/ogg', data: Utilities.base64Encode(blob.getBytes()) } };
  var rules = 'قواعد: املای درست فارسی و نیم‌فاصله؛ نشانه‌گذاری طبیعی؛ تکیه‌کلام‌ها (اِم، اِ، یعنی تکراری) را فقط وقتی معنا عوض نمی‌شود حذف کن؛ ' +
    'هیچ چیزی اضافه یا خلاصه نکن؛ نام‌های خاص (فروید، لکان، وینیکات، کلاین و …) را درست بنویس؛ هرگز خط تیره (— یا –) وسط جمله ننویس.\n' +
    'summary: یک جملهٔ کوتاه (حداکثر ۲۵ کلمه) به سوم شخص که بگوید گوینده در این صدا چه می‌گوید.\n' +
    'quote: شمارهٔ تکه‌ای که یک جملهٔ کامل و مستقل است (با «و»، «برای همین»، «یعنی» یا حرف ربط شروع نشود، دست‌کم هشت کلمه) و عمیق‌ترین فکر گوینده را بی‌نیاز از جملهٔ قبل و بعد می‌رساند؛ مناسب برای نقل‌قول برجسته در میانهٔ مقاله.';
  var head = 'این صدای ' + (ctx.who || 'نویسنده') + ' دربارهٔ مطلب «' + (ctx.title || '') + '» در مجلهٔ روان‌شناسی و روانکاوی تجربه است.\n';
  var out;
  if (segs0.length) {
    var list = segs0.map(function (s, i) { return i + ') ' + s[2]; }).join('\n');
    var o = vxGem_([{ text: head + 'این فهرست تکه‌ها از یک مدل گفتار به متن آمده و خطا دارد. با گوش‌دادن به صدا متن هر تکه را درست کن و شمارهٔ تکه‌ها را دقیقاً حفظ کن (هر تکه یک سطر خروجی).\n' + rules + '\n\n' + list }, audio], VX_TR_SCHEMA);
    var fix = {}; (o.segs || []).forEach(function (x) { fix[x.i] = x.t; });
    out = { segs: segs0.map(function (s, i) { return [s[0], s[1], vxNoDash_(fix[i] != null ? fix[i] : s[2]).trim()]; }).filter(function (s) { return s[2]; }), summary: vxNoDash_(o.summary), qi: o.quote, engine: 'groq+' + o._model };
  } else {
    var o2 = vxGem_([{ text: head + 'متن کامل این صدا را بنویس، به صورت تکه‌های جمله‌ای با زمان شروع و پایان هر تکه به ثانیه.\n' + rules }, audio], VX_TR_SCHEMA_RAW);
    out = { segs: (o2.segs || []).map(function (s) { return [Math.round(s.s * 100) / 100, Math.round(s.e * 100) / 100, vxNoDash_(s.t).trim()]; }).filter(function (s) { return s[2]; }), summary: vxNoDash_(o2.summary), qi: o2.quote, engine: o2._model };
  }
  var q = out.segs[out.qi] || out.segs[0] || [0, 0, ''];
  out.quote = { i: out.segs.indexOf(q), s: q[0], e: q[1], t: q[2] };
  try { var pq = vxPickQuote_(out.segs, ctx); if (pq) out.quote = pq; } catch (eQ) { vxErr_('quote', eQ); }
  out.text = vxParas_(out.segs).join('\n\n');
  delete out.qi;
  return out;
}

/** جملهٔ برجسته: یک تا سه تکهٔ پشت‌سرهم که با هم یک فکر کامل و مستقل می‌سازند (فقط متن، بی‌صدا) */
function vxPickQuote_(segs, ctx) {
  if (!segs || !segs.length) return null;
  var list = segs.map(function (s, i) { return i + ') ' + s[2]; }).join('\n');
  var o = vxGem_([{ text: 'این متن گفته‌شدهٔ ' + (ctx.who || 'نویسنده') + ' دربارهٔ «' + (ctx.title || '') + '» است، تکه‌به‌تکه با شماره.\n' +
    'یک نقل‌قول برجسته برای وسط مقاله انتخاب کن: از تکهٔ i تا تکهٔ j (پشت‌سرهم، حداکثر سه تکه) که با هم یک فکر کامل، مستقل و عمیق بسازند؛ ' +
    'بدون نیاز به جملهٔ قبل و بعد فهمیده شود، با حرف ربط («و»، «برای همین»، «یا»، «یعنی») شروع نشود، سؤال ناتمام نباشد، بین ۱۰ تا ۳۵ کلمه.\n\n' + list }],
    { type: 'OBJECT', properties: { i: { type: 'INTEGER' }, j: { type: 'INTEGER' } }, required: ['i', 'j'] });
  var i = Math.max(0, Math.min(segs.length - 1, +o.i || 0)), j = Math.max(i, Math.min(segs.length - 1, +o.j || i, i + 2));
  var t = segs.slice(i, j + 1).map(function (x) { return x[2]; }).join(' ').replace(/^(و|یا|برای همین|یعنی)\s+/, '').replace(/[،,؛\s]+$/, '');
  return { i: i, j: j, s: segs[i][0], e: segs[j][1], t: vxNoDash_(t) };
}

/** دوباره انتخاب جملهٔ برجسته برای صداهای تحویل‌شده و فرستادن دوباره به سایت */
function vxRequoteAll() {
  var n = 0;
  vxRows_().forEach(function (r) {
    if (r['وضعیت'] !== VX_ST.DONE || !r['فایل متن']) return;
    var tr = vxTr_(r); if (!tr) return;
    var q = vxPickQuote_(tr.segs, vxCtx_(r)); if (!q) return;
    tr.quote = q; vxTrSave_(r, tr); vxSet_(r['کد'], { 'جملهٔ برجسته': q.t });
    if (r['کاربرد'] === 'mag') { var m = mcGet_(r['ارجاع']); if (m) { vxMagPublish_(m, vxGet_(r['کد']), true); n++; } }
  });
  Logger.log('requote ' + n);
  return n;
}

/** تکه‌ها را به پاراگراف‌های خوانا می‌چسباند (با مکث بلند یا هر پنج تکه). */
function vxParas_(segs) {
  var out = [], cur = [];
  segs.forEach(function (s, i) {
    cur.push(s[2]);
    var gap = segs[i + 1] ? segs[i + 1][0] - s[1] : 0;
    if (cur.length >= 5 || gap > 1.2) { out.push(cur.join(' ')); cur = []; }
  });
  if (cur.length) out.push(cur.join(' '));
  return out;
}

/** متن اصلاح‌شدهٔ گوینده را روی همان زمان‌ها پخش می‌کند (به نسبت طول). */
function vxResegment_(segs, text) {
  var total0 = segs.length ? segs[0][0] : 0, total1 = segs.length ? segs[segs.length - 1][1] : 0;
  var sent = String(text || '').replace(/\r/g, '').split(/(?<=[.؟?!…:؛])\s+|\n+/).map(function (x) { return x.trim(); }).filter(String);
  if (!sent.length) return segs;
  var L = sent.reduce(function (a, s) { return a + s.length; }, 0), t = total0, span = Math.max(1, total1 - total0);
  return sent.map(function (s) { var d = span * s.length / L; var o = [Math.round(t * 100) / 100, Math.round((t + d) * 100) / 100, s]; t += d; return o; });
}

/** «غلط ← درست» در هر سطر؛ اگر نبود کل متن جایگزین می‌شود. */
function vxApplyEdit_(tr, msg) {
  var lines = String(msg || '').split('\n').filter(function (l) { return /←|=>|->/.test(l); });
  if (lines.length) {
    var segs = tr.segs.map(function (s) { return s.slice(); }), n = 0;
    lines.forEach(function (l) {
      var p = l.split(/←|=>|->/); if (p.length < 2) return;
      var a = p[0].trim(), b = p.slice(1).join('').trim(); if (!a) return;
      segs.forEach(function (s) { if (s[2].indexOf(a) > -1) { s[2] = s[2].split(a).join(b); n++; } });
    });
    return { segs: segs, n: n };
  }
  return { segs: vxResegment_(tr.segs, vxNoDash_(msg)), n: -1 };
}

/* ================= صف و وضعیت ================= */

function vxSheet_() { return tgMagSheet_(VX_TAB, VX_HEAD); }

function vxRows_() {
  if (vxDry_()) { if (!VX_DRY_JOBS) VX_DRY_JOBS = []; return VX_DRY_JOBS; }
  var sh = vxSheet_(), n = sh.getLastRow();
  if (sh.getLastColumn() < VX_HEAD.length) sh.getRange(1, 1, 1, VX_HEAD.length).setValues([VX_HEAD]).setFontWeight('bold');
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, VX_HEAD.length).getDisplayValues().map(function (r, i) { var o = { _row: i + 2 }; VX_HEAD.forEach(function (h, j) { o[h] = r[j]; }); return o; });
}
function vxGet_(code) { var a = vxRows_(); for (var i = 0; i < a.length; i++) if (a[i]['کد'] === code) return a[i]; return null; }
function vxBy_(use, ref) { var a = vxRows_().filter(function (r) { return r['کاربرد'] === use && r['ارجاع'] === ref && r['وضعیت'] !== VX_ST.DROP; }); return a.length ? a[a.length - 1] : null; }

function vxSet_(code, patch) {
  var r = vxGet_(code); if (!r) return null;
  patch['آخرین تغییر'] = Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd HH:mm');
  Object.keys(patch).forEach(function (k) {
    var j = VX_HEAD.indexOf(k); if (j < 0) return;
    r[k] = patch[k] == null ? '' : String(patch[k]);
    if (!vxDry_()) vxSheet_().getRange(r._row, j + 1).setValue(patch[k] == null ? '' : patch[k]);
  });
  return r;
}

/** کار تازه: {use, ref, chat, name, file, dur, noAsk} → کد V- */
function vxStart_(o) {
  var rows = vxRows_(), mx = 3000;
  rows.forEach(function (r) { var m = /^V-(\d+)$/.exec(r['کد']); if (m) mx = Math.max(mx, +m[1]); });
  var code = 'V-' + (mx + 1);
  var rec = { 'کد': code, 'زمان': Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd HH:mm'), 'کاربرد': o.use, 'ارجاع': o.ref || '', 'chat_id': o.chat || '',
    'نام': o.name || '', 'فایل اصلی': o.file || '', 'مدت': o.dur || '', 'وضعیت': VX_ST.Q, 'تلاش': 0, 'بدون تأیید گوینده': o.noAsk ? 'بله' : '' };
  if (vxDry_()) { var d = { _row: rows.length + 2 }; VX_HEAD.forEach(function (h) { d[h] = rec[h] == null ? '' : String(rec[h]); }); rows.push(d); return code; }
  vxSheet_().appendRow(VX_HEAD.map(function (h) { return rec[h] == null ? '' : rec[h]; }));
  vxKick_(20);
  return code;
}

/** یک تریگر یک‌بارهٔ کوتاه؛ وقتی صف خالی است هیچ هزینه‌ای ندارد. */
function vxKick_(sec) {
  if (vxDry_()) return;
  try {
    var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'vxTick'; });
    if (!has) ScriptApp.newTrigger('vxTick').timeBased().after(Math.max(10, sec || 30) * 1000).create();
  } catch (e) { vxErr_('kick', e); }
}

function vxTick(e) {
  if (ciPaused_(e, 'vxTick', 'skip')) return;
  var rs0 = Date.now(); try {   /* v166.18: سنجش زمان اجرا (بدنه بی‌تغییر) */
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'vxTick') ScriptApp.deleteTrigger(t); });
  var c = CacheService.getScriptCache();
  if (c.get('vxbusy')) { vxKick_(60); return; }
  c.put('vxbusy', '1', 300);
  var again = false, t0 = Date.now();
  try {
    var rows = vxRows_();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if ([VX_ST.Q, VX_ST.ENH, VX_ST.TXT].indexOf(r['وضعیت']) < 0) continue;
      if (Date.now() - t0 > 240000) { again = true; break; }
      try { if (vxStep_(r)) again = true; } catch (e) { again = vxFail_(r, e) || again; }
    }
    vxEdTick_();
  } finally { c.remove('vxbusy'); }
  if (again) vxKick_(40);
  } finally { tgRunStat_('vxTick', rs0); }
}

function vxFail_(r, e) {
  vxErr_('step ' + r['کد'], e);
  var n = (+r['تلاش'] || 0) + 1;
  if (n >= 4) {
    vxSet_(r['کد'], { 'وضعیت': VX_ST.ERR, 'خطا': String(e).slice(0, 300), 'تلاش': n });
    try { tgWatchIds_().forEach(function (w) { tgSend_(w, '⚠️ صدای ' + r['کد'] + ' (' + vxEsc_(r['ارجاع']) + ') بعد از چند تلاش پردازش نشد: ' + vxEsc_(String(e).slice(0, 200))); }); } catch (x) {}
    return false;
  }
  vxSet_(r['کد'], { 'خطا': String(e).slice(0, 300), 'تلاش': n });
  return true;
}

/** یک قدم ماشین وضعیت. true یعنی هنوز کار دارد. */
function vxStep_(r) {
  var code = r['کد'];
  if (r['وضعیت'] === VX_ST.Q) {
    if (vxEnhOn_()) {
      var uuid = vxAuStart_(r['فایل اصلی'], code + ' ' + r['ارجاع']);
      vxSet_(code, { 'وضعیت': VX_ST.ENH, 'تمیزکاری': uuid });
      return true;
    }
    r = vxSet_(code, { 'وضعیت': VX_ST.TXT, 'تمیزکاری': 'خاموش' });
  }
  if (r['وضعیت'] === VX_ST.ENH) {
    var j = vxAu_('production/' + r['تمیزکاری'] + '.json', 'get').body.data || {};
    if (j.status === 3) {
      var of = (j.output_files || [])[0];
      var blob = vxAuDownload_(of.download_url).setName(code + '-' + r['ارجاع'] + '.mp3');
      var id = vxFolder_().createFile(blob).getId();
      r = vxSet_(code, { 'وضعیت': VX_ST.TXT, 'mp3': id, 'مدت': Math.round(j.length || 0) });
    } else if (j.status === 2 || j.status === 9) {
      r = vxSet_(code, { 'وضعیت': VX_ST.TXT, 'خطا': 'Auphonic: ' + (j.error_message || j.status_string) });
    } else return true;
  }
  if (r['وضعیت'] === VX_ST.TXT) {
    var src = DriveApp.getFileById(r['mp3'] || r['فایل اصلی']).getBlob();
    var ctx = vxCtx_(r);
    var tr = vxPublicText_(src, ctx);
    tr.v = 1; tr.code = code; tr.dur = +r['مدت'] || (tr.segs.length ? Math.round(tr.segs[tr.segs.length - 1][1]) : 0);
    var jf = vxFolder_().createFile(code + '.json', JSON.stringify(tr), 'application/json').getId();
    r = vxSet_(code, { 'متن': tr.text.slice(0, 45000), 'فایل متن': jf, 'خلاصه': tr.summary, 'جملهٔ برجسته': tr.quote.t, 'مدت': tr.dur, 'خطا': '' });
    if (r['بدون تأیید گوینده'] === 'بله') { vxSet_(code, { 'وضعیت': VX_ST.OK, 'تأیید گوینده': 'بدون پرسش (قبلاً منتشر شده)' }); vxDone_(vxGet_(code)); }
    else { vxSet_(code, { 'وضعیت': VX_ST.ASK }); vxAsk_(vxGet_(code), tr); }
    return false;
  }
  return false;
}

function vxCtx_(r) {
  if (r['کاربرد'] === 'mag') { var m = mcGet_(r['ارجاع']); return { who: r['نام'], title: m ? m['عنوان مطلب'] : '' }; }
  return { who: r['نام'], title: '' };
}

function vxFolder_() { return tgPqFolder_(VX_FOLDER); }
function vxTr_(r) { try { return JSON.parse(DriveApp.getFileById(r['فایل متن']).getBlob().getDataAsString()); } catch (e) { return null; } }
function vxTrSave_(r, tr) { DriveApp.getFileById(r['فایل متن']).setContent(JSON.stringify(tr)); }

/* ================= Auphonic ================= */

function vxAuKey_() { return vxP_().getProperty('AUPHONIC_TOKEN') || ''; }
/** VX_ENHANCE: on | off | auto (پیش‌فرض: فقط وقتی اعتبار پولی هست، چون حساب رایگان جینگل دارد) */
function vxEnhOn_() {
  if (!vxAuKey_()) return false;
  var mode = vxP_().getProperty('VX_ENHANCE') || 'auto';
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  var c = CacheService.getScriptCache(), hit = c.get('vxpaid');
  if (hit) return hit === '1';
  var u = vxAu_('user.json', 'get').body.data || {};
  var paid = (+u.onetime_credits > 0) || !!u.subscription || !!(u.recurring_credits > 2.01);
  c.put('vxpaid', paid ? '1' : '0', 3600);
  return paid;
}
function vxAu_(path, method, payload) {
  var o = { method: method || 'get', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + vxAuKey_() } };
  if (payload) { o.contentType = 'application/json'; o.payload = JSON.stringify(payload); }
  var r = UrlFetchApp.fetch('https://auphonic.com/api/' + path, o), j = {};
  try { j = JSON.parse(r.getContentText()); } catch (e) {}
  return { code: r.getResponseCode(), body: j };
}
function vxAuStart_(fileId, title) {
  var c = vxAu_('productions.json', 'post', { metadata: { title: title }, output_basename: String(title).replace(/[^\w-]+/g, '-'),
    output_files: [{ format: 'mp3', bitrate: '80', mono_mixdown: true }], algorithms: VX_AU_ALGO });
  var uuid = c.body && c.body.data && c.body.data.uuid;
  if (!uuid) throw new Error('Auphonic create ' + c.code + ' ' + JSON.stringify(c.body).slice(0, 160));
  var up = UrlFetchApp.fetch('https://auphonic.com/api/production/' + uuid + '/upload.json', { method: 'post', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + vxAuKey_() }, payload: { input_file: DriveApp.getFileById(fileId).getBlob() } });
  if (up.getResponseCode() !== 200) throw new Error('Auphonic upload ' + up.getResponseCode());
  var st = vxAu_('production/' + uuid + '/start.json', 'post');
  if (st.code !== 200) throw new Error('Auphonic start ' + st.code);
  return uuid;
}

/** دانلود خروجی: Auphonic به S3 ریدایرکت می‌کند و S3 هدر Authorization را نمی‌پذیرد؛ پس ریدایرکت دستی و بی‌هدر */
function vxAuDownload_(url) {
  var r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + vxAuKey_() }, followRedirects: false, muteHttpExceptions: true });
  var code = r.getResponseCode();
  if (code >= 300 && code < 400) {
    var h = r.getAllHeaders(), loc = h.Location || h.location;
    var r2 = UrlFetchApp.fetch(loc, { muteHttpExceptions: true });
    if (r2.getResponseCode() !== 200) throw new Error('Auphonic download ' + r2.getResponseCode());
    return r2.getBlob();
  }
  if (code !== 200) throw new Error('Auphonic download ' + code);
  return r.getBlob();
}

/** یک‌بار: کلید Auphonic از صفحهٔ تنظیمات Auphonic با یک رمز یک‌بارمصرف (بدون اینکه کلید در کد یا گفت‌وگو بیاید). */
function vxKeyOpen() { var n = Utilities.getUuid().replace(/-/g, ''); CacheService.getScriptCache().put('vxkeyn', n, 900); Logger.log('nonce ' + n); return n; }
function vxKeyIn_(body) {
  var c = CacheService.getScriptCache(), n = c.get('vxkeyn');
  if (!n || String(body.vxkey) !== n || !/^[A-Za-z0-9_\-]{20,80}$/.test(String(body.v || ''))) return false;
  vxP_().setProperty('AUPHONIC_TOKEN', String(body.v));
  c.remove('vxkeyn'); c.remove('vxpaid');
  return true;
}

/* ================= تأیید گوینده ================= */

function vxTgUpload_(method, fields, fileField, blob) {
  if (vxDry_()) { TG_OUTBOX.push({ kind: 'upload', method: method, chat: String(fields.chat_id) }); return null; }
  var token = vxP_().getProperty('TELEGRAM_TOKEN'), payload = {};
  Object.keys(fields).forEach(function (k) { payload[k] = typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : String(fields[k]); });
  payload[fileField] = blob;
  return tgFetchRetry_('https://api.telegram.org/bot' + token + '/' + method, { method: 'post', payload: payload, muteHttpExceptions: true });
}

function vxTextChunks_(text, max) {
  var out = [], cur = '';
  String(text).split('\n\n').forEach(function (p) {
    if ((cur + '\n\n' + p).length > max) { if (cur) out.push(cur); cur = p.length > max ? p.slice(0, max) : p; }
    else cur = cur ? cur + '\n\n' + p : p;
  });
  if (cur) out.push(cur);
  return out;
}

function vxAsk_(r, tr) {
  var chat = r['chat_id'];
  if (!chat) { vxSet_(r['کد'], { 'وضعیت': VX_ST.OK, 'تأیید گوینده': 'بی‌نشانی' }); return vxDone_(vxGet_(r['کد'])); }
  var ctx = vxCtx_(r);
  if (r['mp3']) {
    try { vxTgUpload_('sendAudio', { chat_id: chat, title: 'نسخهٔ تمیزشده', performer: r['نام'] || 'تجربه', caption: '🎧 نسخهٔ تمیزشدهٔ صدای شما' + (ctx.title ? ' روی «' + ctx.title + '»' : '') }, 'audio', DriveApp.getFileById(r['mp3']).getBlob()); } catch (e) { vxErr_('sendAudio', e); }
  }
  var parts = vxTextChunks_(tr.text, 3300);
  parts.forEach(function (p, i) {
    var head = i === 0 ? '📝 <b>متنی که از صدای شما درآمد</b>\n<i>' + vxEsc_(tr.summary) + '</i>\n\n' : '';
    tgSend_(chat, head + vxEsc_(p));
  });
  tgSend_(chat, 'این متن کنار صدایتان روی صفحهٔ مطلب می‌آید تا کسی که نمی‌تواند گوش بدهد هم بخواند، و برای گوگل هم خواناست.\n\nدرست است؟ اگر جایی اشتباه شنیده شده، اصلاحش کنید.', { inline_keyboard: [
    [vxB_('✅ درست است، برای سردبیر بفرست', 'vx:ok:' + r['کد'])],
    [vxB_('✏️ اصلاح متن', 'vx:ed:' + r['کد']), vxB_('🎙 دوباره ضبط می‌کنم', 'vx:re:' + r['کد'])]
  ] });
}

function vxOk_(chat, code) {
  var r = vxGet_(code);
  if (!r || String(r['chat_id']) !== String(chat)) return tgSend_(chat, 'این مورد پیدا نشد.');
  if (r['وضعیت'] !== VX_ST.ASK) return tgSend_(chat, 'این صدا قبلاً ثبت شده است 🌱');
  vxSet_(code, { 'وضعیت': VX_ST.OK, 'تأیید گوینده': Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd HH:mm') });
  tgSend_(chat, 'ممنون 🌱 برای سردبیر رفت. بعد از تأیید، صدا و متن روی صفحه می‌آیند و خبرتان می‌کنیم.');
  vxDone_(vxGet_(code));
}

function vxEditAsk_(chat, code) {
  var r = vxGet_(code);
  if (!r || String(r['chat_id']) !== String(chat) || r['وضعیت'] !== VX_ST.ASK) return tgSend_(chat, 'این مورد دیگر قابل اصلاح نیست.');
  tgSetVal_('vxe', chat, code);
  tgSend_(chat, '✏️ دو راه دارید:\n\n۱. فقط جاهای غلط را بفرستید، هر کدام در یک سطر به این شکل:\n<code>کلمهٔ غلط ← کلمهٔ درست</code>\n\n۲. یا کل متن درست را یکجا بفرستید.', { inline_keyboard: [[vxB_('انصراف', 'vx:x')]] });
}

function vxEditIn_(chat, text) {
  var code = tgGetVal_('vxe', chat); tgDel_('vxe', chat);
  var r = vxGet_(code); if (!r || r['وضعیت'] !== VX_ST.ASK) return true;
  var tr = vxTr_(r); if (!tr) return true;
  var ed = vxApplyEdit_(tr, text);
  if (ed.n === 0) { tgSetVal_('vxe', chat, code); tgSend_(chat, 'آن کلمه‌ها در متن پیدا نشد. دقیقاً همان‌طور که در متن آمده بنویسید، یا کل متن درست را بفرستید.'); return true; }
  tr.segs = ed.segs; tr.text = vxParas_(tr.segs).join('\n\n'); tr.edited = true;
  var q = tr.segs[tr.quote.i] || tr.segs[0]; if (q) tr.quote = { i: tr.segs.indexOf(q), s: q[0], e: q[1], t: q[2] };
  if (!vxDry_()) vxTrSave_(r, tr);
  vxSet_(code, { 'متن': tr.text.slice(0, 45000), 'جملهٔ برجسته': tr.quote.t });
  tgSend_(chat, (ed.n > 0 ? vxFa_(ed.n) + ' اصلاح اعمال شد.' : 'متن تازه جایگزین شد.') + ' همین را بفرستیم؟', { inline_keyboard: [[vxB_('✅ بله، برای سردبیر بفرست', 'vx:ok:' + code)], [vxB_('✏️ یک اصلاح دیگر', 'vx:ed:' + code)]] });
  return true;
}

function vxReRecord_(chat, code) {
  var r = vxGet_(code);
  if (!r || String(r['chat_id']) !== String(chat)) return;
  vxSet_(code, { 'وضعیت': VX_ST.DROP });
  if (r['کاربرد'] === 'mag') { var m = mcGet_(r['ارجاع']); if (m) { mcSet_(r['ارجاع'], { 'وضعیت': MC_ST.DROP }); mcVoiceAsk_(chat, m['شناسهٔ مطلب']); return; } }
  tgSend_(chat, 'باشه. صدای تازه را بفرستید.');
}

/** بعد از تأیید گوینده: تحویل به مصرف‌کننده */
function vxDone_(r) {
  if (!r) return;
  if (r['کاربرد'] === 'mag') {
    var m = mcGet_(r['ارجاع']);
    if (!m) return;
    if (m['وضعیت'] === MC_ST.PUB) { vxMagPublish_(m, r, true); vxSet_(r['کد'], { 'وضعیت': VX_ST.DONE }); return; }
    mcSet_(r['ارجاع'], { 'وضعیت': MC_ST.SENT });
    vxMagEditorCard_(mcGet_(r['ارجاع']), r);
  }
}

function vxMagEditorCard_(m, r) {
  var eds = mcEditors_();
  var txt = '🎙 <b>صدای نویسنده</b> · <code>' + m['کد'] + '</code>\n«' + vxEsc_(mcShort_(m['عنوان مطلب'], 80)) + '»\nاز: ' + vxEsc_(m['نام']) +
    '\n\n<i>' + vxEsc_(r['خلاصه']) + '</i>\n\n💬 جملهٔ برجسته:\n«' + vxEsc_(r['جملهٔ برجسته']) + '»\n\n⏱ ' + vxClock_(r['مدت']) + (r['mp3'] ? ' · نویز و سطح صدا درست شده' : '') + ' · متن را خود نویسنده تأیید کرده';
  var rows = [[mcB_('✅ تأیید و انتشار روی صفحه', 'mc:ea:' + m['کد'])], [mcB_('📝 دیدن متن کامل', 'vx:tx:' + r['کد'])], [mcB_('↩️ برگشت با توضیح', 'mc:er:' + m['کد']), mcB_('🗑 کنار بگذار', 'mc:ex:' + m['کد'])]];
  eds.forEach(function (e) {
    if (r['mp3']) { try { vxTgUpload_('sendAudio', { chat_id: e, title: m['عنوان مطلب'], performer: m['نام'] }, 'audio', DriveApp.getFileById(r['mp3']).getBlob()); } catch (x) { vxErr_('ed audio', x); } }
    tgSend_(e, txt, { inline_keyboard: rows });
  });
}

function vxShowText_(chat, code) {
  var r = vxGet_(code); if (!r) return;
  /* v166.8: متن کامل فقط برای صاحب صدا یا سردبیر (کدها پشت‌سرهم‌اند؛ پیش از این هر کسی با کال‌بک ساختگی می‌خواند) */
  if (String(r['chat_id']) !== String(chat) && !(typeof mcIsEditor_ === 'function' && mcIsEditor_(chat))) return;
  vxTextChunks_(r['متن'], 3500).forEach(function (p) { tgSend_(chat, vxEsc_(p)); });
}

/* ================= انتشار صدا روی سایت ================= */

var VX_SITE_VOICE = 'https://tajrobeh.life/wp-json/tj/v1/mag-voice';
var VX_SITE_PATCH = 'https://tajrobeh.life/wp-json/tj/v1/post-patch';

function vxSite_(url, data) {
  if (vxDry_()) { TG_OUTBOX.push({ kind: 'site', url: url, data: JSON.parse(JSON.stringify(data)) }); return (TG_MEM['vxsite'] || { ok: true, results: [] }); }
  var key = vxP_().getProperty('TG_DIR_KEY');
  if (!key) throw new Error('سایت با بات جفت نشده');
  var body = tgDirAscii_(JSON.stringify(data)), ts = String(Math.floor(Date.now() / 1000));
  var res = UrlFetchApp.fetch(url + '?ts=' + ts + '&sig=' + tgDirSign_(ts, body, key), { method: 'post', contentType: 'application/json', payload: body, muteHttpExceptions: true, followRedirects: false });
  var j = null; try { j = JSON.parse(res.getContentText()); } catch (e) {}
  if (res.getResponseCode() !== 200 || !j) throw new Error('سایت ' + res.getResponseCode() + ': ' + ((j && j.message) || res.getContentText().slice(0, 160)));
  return j;
}

/** mc = سطر «مشارکت مجله»، r = سطر صف صدا. silent یعنی بدون پیام (بازسازی موارد قبلی). */
function vxMagPublish_(m, r, silent) {
  r = r || vxBy_('mag', m['کد']);
  if (!r || !r['فایل متن']) return { ok: false, why: 'novx' };
  var tr = vxTr_(r) || {};
  var audio = r['mp3'] || '';
  if (audio && !vxDry_()) try { DriveApp.getFileById(audio).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { vxErr_('share', e); }
  var res;
  try {
    res = vxSite_(VX_SITE_VOICE, { code: m['کد'], post: +m['شناسهٔ مطلب'], drive: audio, dur: +r['مدت'] || tr.dur || 0,
      name: m['نام'], url: m['صفحهٔ فرد'], job: m['سمت'], summary: tr.summary || '', quote: tr.quote || null, segs: (tr.segs || []).slice(0, 900) });
  } catch (e) { vxErr_('publish ' + m['کد'], e); return { ok: false, why: String(e) }; }
  vxSet_(r['کد'], { 'وضعیت': VX_ST.DONE });
  return res || { ok: true };
}

/** یک‌بار: صداهای قبلی مجله (منتشرشده یا منتظر) از خط لولهٔ تازه رد می‌شوند. منتشرشده‌ها بی‌پرسش. */
function vxMagBackfill() {
  var n = 0;
  mcRowsAll_().forEach(function (m) {
    if (m['نوع'] !== MC_T.VOICE || !m['فایل درایو']) return;
    if ([MC_ST.PUB, MC_ST.SENT].indexOf(m['وضعیت']) < 0) return;
    if (vxBy_('mag', m['کد'])) return;
    vxStart_({ use: 'mag', ref: m['کد'], chat: m['chat_id'], name: m['نام'], file: String(m['فایل درایو']).split(/\s+/)[0], noAsk: m['وضعیت'] === MC_ST.PUB });
    n++;
  });
  Logger.log('backfill ' + n);
  return n;
}

/* ================= ورودی متنی با صدا (همه‌جای بات) ================= */

/** قلاب اول در tgPrivate_: حالت‌های همین فایل */
function vxRoute_(chat, m, name, uname) {
  var text = String((m && m.text) || '').trim();
  if (/^\/start(@\w+)?\s+vxc$/.test(text) || text === '/voice') { vxcIntro_(chat); return true; }
  if (text && tgGetVal_('vxe', chat)) { if (/^\//.test(text) || tgIsBtnLike_(text)) { tgDel_('vxe', chat); return false; } return vxEditIn_(chat, text); }
  if (tgFlag_('vxc', chat)) {
    if (m.voice || m.audio) { vxcVoice_(chat, m, name); return true; }
    if (text && !/^\//.test(text) && !tgIsBtnLike_(text) && text.length > 12) { vxcAnalyze_(chat, text, name); return true; }
    if (text && (/^\//.test(text) || tgIsBtnLike_(text))) tgDelFlag_('vxc', chat);
  }
  return false;
}

function vxIsStaff_(chat, uname) {
  try { var r = tgRolesOf_(chat, uname); return (r.roles || []).some(function (x) { return x !== 'مراجع'; }); } catch (e) { return false; }
}

/** قلاب دوم، درست پیش از if(!text) return: ویسی که هیچ مسیر دیگری نگرفت */
function vxUniversal_(chat, m, name, uname) {
  if (!(m.voice || m.audio)) return false;
  var v = m.voice || m.audio;
  if ((v.duration || 0) > 900) { tgSend_(chat, 'این صدا خیلی بلند است. لطفاً زیر ۱۵ دقیقه بفرستید.'); return true; }
  vxTyping_(chat);
  var tr;
  try { tr = vxPrivateText_(v.file_id); } catch (e) { vxErr_('universal', e); tgSend_(chat, 'صدا را نتوانستم به متن تبدیل کنم. یک بار دیگر بفرستید یا بنویسید.'); return true; }
  if (!tr.text) { tgSend_(chat, 'متنی از این صدا درنیامد. کمی بلندتر یا در جای ساکت‌تر دوباره بفرستید.'); return true; }
  tgSetVal_('vxu', chat, tr.text.slice(0, 3800));
  var staff = vxIsStaff_(chat, uname);
  var kb = [[vxB_('✅ همین را بفرست', 'vx:u:ok')]];
  if (!staff) kb.push([vxB_('🍓 با همین، درمانگر مناسبم را پیدا کن', 'vx:c:use')]);
  kb.push([vxB_('✏️ خودم می‌نویسم', 'vx:u:x')]);
  tgSend_(chat, '🎧 <b>از صدای شما این متن درآمد:</b>\n\n' + vxEsc_(tr.text.slice(0, 3500)) + '\n\n<i>فایل صدا نزد ما نگه داشته نمی‌شود؛ فقط متن.</i>', { inline_keyboard: kb });
  return true;
}

/** «همین را بفرست»: متن مثل یک پیام معمولی وارد همان مسیری می‌شود که کاربر در آن بود */
function vxUniversalOk_(cq) {
  var chat = cq.message.chat.id, t = tgGetVal_('vxu', chat);
  tgDel_('vxu', chat);
  if (!t) return tgSend_(chat, 'این متن منقضی شده؛ دوباره ویس بفرستید.');
  if (!vxDry_()) try { tgApi_('editMessageReplyMarkup', { chat_id: chat, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } }); } catch (e) {}
  tgPrivate_({ chat: { id: chat, type: 'private' }, from: cq.from, text: t, message_id: cq.message.message_id, _vx: 1 });
}

/* ---------- پیام به پذیرش: متن ویس کنار خود ویس ---------- */
function vxMsgText_(chat, m) {
  if (!(m && m.voice) || vxDry_()) return '';
  try { return vxPrivateText_(m.voice.file_id).text || ''; } catch (e) { return ''; }
}

/* ================= مچ‌میکینگ صوتی مراجع ================= */

var T_VXC_INTRO = '🎙 <b>فقط بگویید؛ ما گوش می‌دهیم</b>\n\n' +
  'به‌جای جواب‌دادن به سؤال‌ها، یک ویس بفرستید و هر چه در ذهنتان است بگویید، مثلاً:\n' +
  '• الان چه چیزی بیشتر از همه اذیتتان می‌کند\n' +
  '• از تراپی چه می‌خواهید؛ ریشه‌یابی، راهکار، یا فقط کسی که بشنود\n' +
  '• درمانگر خانم یا آقا، آنلاین یا حضوری، اگر ترجیحی دارید\n\n' +
  'یک تا سه دقیقه کافی است. اگر راحت‌ترید، همین‌ها را بنویسید.\n\n' +
  '🔒 <b>حریم خصوصی:</b> فایل صدای شما نزد ما ذخیره نمی‌شود؛ فقط به متن تبدیل می‌شود. این متن فقط در اختیار مسئول پذیرش در مرکز تجربه زندگی قرار می‌گیرد، برای پیدا کردن درمانگر مناسب، و بدون رضایت شما منتشر یا با کسی به اشتراک گذاشته نمی‌شود.';

function vxcIntro_(chat) {
  tgSetFlag_('vxc', chat, 3600);
  tgDel_('vxct', chat);
  tgSend_(chat, T_VXC_INTRO, { inline_keyboard: [[vxB_('📝 نه، به سؤال‌ها جواب می‌دهم', 'vx:c:quiz')]] });
}

function vxcVoice_(chat, m, name) {
  var v = m.voice || m.audio;
  vxTyping_(chat);
  var tr;
  try { tr = vxPrivateText_(v.file_id); } catch (e) { vxErr_('vxc', e); tr = { text: '' }; }
  if (!tr.text) { tgSend_(chat, 'صدایتان را نتوانستم به متن تبدیل کنم. یک بار دیگر بفرستید یا بنویسید.'); return; }
  vxcAnalyze_(chat, tr.text, name);
}

var VX_C_SYS = 'تو دستیار پذیرش یک مرکز روان‌درمانی هستی. از حرف مراجع فقط برداشت ساختاریافته بساز؛ تشخیص نده، توصیه نکن. خروجی فقط JSON با این کلیدها:\n' +
  'topic: یکی از anx (اضطراب و استرس)، dep (افسردگی و بی‌حوصلگی)، rel (رابطه و زوج)، fam (خانواده و والدین)، self (خودشناسی و مسیر زندگی)، kid (کودک و نوجوان)، psy (ارزیابی روان‌پزشکی و دارو)، oth\n' +
  'needs: آرایه از n1 افسردگی، n2 بی‌حوصلگی، n3 بی‌انگیزگی، n4 تعویق و اهمال، n5 اضطراب، n6 افکار وسواسی و نشخوار، n7 شناخت بهتر خود، n8 ریشه‌یابی مشکلات، n9 مشکل در رابطه با دیگران (فقط آن‌هایی که واقعاً گفته شد)\n' +
  'prefs: آرایه از p1 تحلیل عمیق، p2 نظر و راهکار، p3 کوتاه‌مدت، p4 شنونده و همدل، p5 راهنمایی دربارهٔ یک مشکل خاص (فقط اگر گفته شد)\n' +
  'gender: f یا m یا x (اگر نگفت x)\n' +
  'age: same یا older یا x\n' +
  'mode: on (آنلاین) یا teh (حضوری تهران) یا city (حضوری شهر دیگر) یا x (نگفت)\n' +
  'couple: true اگر برای زوج یا رابطه با همسر درمان می‌خواهد\n' +
  'crisis: true فقط اگر از فکر آسیب به خود یا دیگری یا خطر فوری گفت\n' +
  'summary: دو جملهٔ کوتاه فارسی به دوم شخص محترمانه («شما…») که حرف اصلی مراجع را بدون قضاوت بازگو کند؛ بدون خط تیره\n' +
  'city: نام شهر اگر گفت، وگرنه خالی';

var VX_C_SCHEMA = { type: 'OBJECT', properties: {
  topic: { type: 'STRING' }, needs: { type: 'ARRAY', items: { type: 'STRING' } }, prefs: { type: 'ARRAY', items: { type: 'STRING' } },
  gender: { type: 'STRING' }, age: { type: 'STRING' }, mode: { type: 'STRING' }, couple: { type: 'BOOLEAN' }, crisis: { type: 'BOOLEAN' },
  summary: { type: 'STRING' }, city: { type: 'STRING' } }, required: ['topic', 'summary'] };
/* v170.23.7: برداشت ساختاریافتهٔ حرف مراجع با Gemini (کلید پولی)؛ نام قبلی برای قلاب‌ها */
function vxGroqJson_(sys, user) {
  if (vxDry_()) return VX_DRY_LLM || { topic: 'anx', needs: ['n5'], prefs: [], gender: 'x', age: 'x', mode: 'x', crisis: false, summary: 'شما اضطراب دارید.' };
  return aiJson_(sys + '\n\n' + user, VX_C_SCHEMA, { priv: true, temp: 0.1 });
}

/* برداشت دوباره برای ویس‌هایی که روی لید فقط «🎙 از صدای مراجع» بی‌برداشت دارند (از #29؛ v170.23.7 با Gemini و فقط با کلید پولی) */
function vxcRedoNote_(r) {
  var lbl = function (list, keys) { return list.filter(function (x) { return keys.indexOf(x.k) > -1; }).map(function (x) { return x.label.replace(/^\S+\s/, ''); }).join('، '); };
  var p = ['🎙 برداشت دوباره از صدای مراجع: ' + (r.summary || '')];
  p.push('موضوع: ' + lbl(TG_TOPICS, [r.topic]));
  if ((r.needs || []).length) p.push('گفته‌ها: ' + lbl(TG_NEEDS, r.needs));
  if ((r.prefs || []).length) p.push('از تراپی: ' + lbl(TG_PREFS, r.prefs));
  return p.join(' · ');
}
var VX_REDO_RX = /^(\d\d-\d\d) \d\d:\d\d [^:\n]*: 🎙 از صدای مراجع \(متن شد؛ فایل صدا نگه داشته نشد\):\s*\| متن: (.+)$/;
/* فقط یادداشت تازه روی لید (افزودنی)؛ وضعیت و ستون‌ها دست نمی‌خورند. خروجی فقط شمار. */
function vxcRedo_(since) {
  if (!aiPaid_()) return 'برداشت دوباره: منتظر تأیید کلید پولی جمنای';
  var sh = tgSS_().getSheetByName(TG_LEADS), col = tgLeadCol_('یادداشت'), n = sh.getLastRow();
  var vals = n > 1 ? sh.getRange(2, col, n - 1, 1).getValues() : [], seen = 0, done = 0, bad = 0;
  for (var i = 0; i < vals.length; i++) {
    var cell = String(vals[i][0] || '');
    if (cell.indexOf('🎙 برداشت دوباره') > -1) continue;
    var lines = cell.split('\n');
    for (var j = 0; j < lines.length; j++) {
      var m = lines[j].match(VX_REDO_RX);
      if (!m || m[1] < since) continue;
      seen++;
      try { tgLeadNote_(i + 2, vxcRedoNote_(vxcNormalize_(vxGroqJson_(VX_C_SYS, 'حرف مراجع:\n' + m[2]), m[2])), 'بات'); done++; } catch (e) { bad++; vxErr_('vxcRedo_', e); }
      break;
    }
  }
  return 'ویس مراجع بی‌برداشت: ' + seen + ' · دوباره: ' + done + ' · ناموفق: ' + bad;
}

/** بی‌مدل: اگر Gemini جواب نداد (یا کلید پولی تأیید نشده)، حداقل موضوع از کلیدواژه‌ها */
function vxcGuess_(text) {
  var t = String(text);
  var map = [['rel', /همسر|شوهر|زوج|رابطه|نامزد|دوست ?پسر|دوست ?دختر|طلاق|خیانت/], ['kid', /بچه|فرزند|پسرم|دخترم|نوجوان|کودک/], ['psy', /دارو|روان ?پزشک|قرص/],
    ['anx', /اضطراب|استرس|نگران|ترس|حمله|پنیک|وسواس/], ['dep', /افسرد|غمگین|بی ?حوصله|انگیزه|ناامید|گریه/], ['fam', /مادر|پدر|خانواده|والدین/], ['self', /خودم|هدف|مسیر|خودشناسی|معنا/]];
  for (var i = 0; i < map.length; i++) if (map[i][1].test(t)) return map[i][0];
  return 'oth';
}

function vxcNormalize_(o, text) {
  var pick = function (v, ok, d) { return ok.indexOf(v) > -1 ? v : d; };
  var r = {
    topic: pick(o.topic, TG_TOPICS.map(function (x) { return x.k; }), vxcGuess_(text)),
    needs: (o.needs || []).filter(function (k) { return /^n[1-9]$/.test(k); }),
    prefs: (o.prefs || []).filter(function (k) { return /^p[1-5]$/.test(k); }),
    gender: pick(o.gender, ['f', 'm', 'x'], ''),
    age: pick(o.age, ['same', 'older', 'x'], ''),
    mode: pick(o.mode, ['on', 'teh', 'city'], ''),
    crisis: o.crisis === true,
    summary: vxNoDash_(String(o.summary || '').slice(0, 400)),
    city: String(o.city || '').slice(0, 40)
  };
  if (o.couple === true && r.topic !== 'kid') r.topic = 'rel';
  return r;
}

function vxcAnalyze_(chat, text, name) {
  var all = ((tgGetVal_('vxct', chat) || '') + '\n' + text).trim().slice(-6000);
  tgSetVal_('vxct', chat, all);
  if (tgCrisisStrong_(all)) { tgDelFlag_('vxc', chat); tgOnCrisis_(chat, name, '', all); return; }
  vxTyping_(chat);
  var o = {};
  try { o = vxGroqJson_(VX_C_SYS, 'حرف مراجع:\n' + all); } catch (e) { vxErr_('vxc llm', e); o = {}; }
  var r = vxcNormalize_(o, all);
  if (r.crisis) { tgDelFlag_('vxc', chat); tgOnCrisis_(chat, name, '', all); return; }
  tgSetVal_('vxcj', chat, JSON.stringify(r));
  var lbl = function (list, k) { for (var i = 0; i < list.length; i++) if (list[i].k === k) return list[i].label; return ''; };
  var lines = [];
  lines.push('• موضوع اصلی: <b>' + vxEsc_(lbl(TG_TOPICS, r.topic).replace(/^\S+\s/, '')) + '</b>');
  if (r.needs.length) lines.push('• چیزهایی که گفتید: ' + vxEsc_(TG_NEEDS.filter(function (n) { return r.needs.indexOf(n.k) > -1; }).map(function (n) { return n.label; }).join('، ')));
  if (r.prefs.length) lines.push('• از تراپی می‌خواهید: ' + vxEsc_(TG_PREFS.filter(function (n) { return r.prefs.indexOf(n.k) > -1; }).map(function (n) { return n.label; }).join('، ')));
  var pr = [];
  if (r.gender === 'f') pr.push('درمانگر خانم'); if (r.gender === 'm') pr.push('درمانگر آقا');
  if (r.mode) pr.push(lbl(TG_MODES, r.mode).replace(/^\S+\s/, ''));
  if (r.age === 'older') pr.push('درمانگر بزرگ‌تر از خودتان'); if (r.age === 'same') pr.push('درمانگر هم‌سن‌وسال');
  if (pr.length) lines.push('• ترجیح: ' + vxEsc_(pr.join('، ')));
  tgSend_(chat, '🍓 <b>این‌طور فهمیدم:</b>\n\n' + (r.summary ? '<i>' + vxEsc_(r.summary) + '</i>\n\n' : '') + lines.join('\n') + '\n\nدرست است؟', { inline_keyboard: [
    [vxB_('✅ درست است، ادامه بدهیم', 'vx:c:ok')],
    [vxB_('🎙 چیزی اضافه می‌کنم', 'vx:c:more'), vxB_('📝 خودم جواب می‌دهم', 'vx:c:quiz')]
  ] });
}

function vxcOk_(chat) {
  var r = {}; try { r = JSON.parse(tgGetVal_('vxcj', chat) || '{}'); } catch (e) {}
  if (!r.topic) return tgQuizTopic_(chat);
  tgDelFlag_('vxc', chat);
  tgSetVal_('qt', chat, r.topic);
  tgSetVal_('nd', chat, (r.needs || []).join(','));
  if ((r.prefs || []).length) { tgSetVal_('pf', chat, r.prefs.join(',')); tgSetFlag_('pfd', chat, 86400); }
  var note = '🎙 از صدای مراجع (متن شد؛ فایل صدا نگه داشته نشد): ' + (r.summary || '') + ' | متن: ' + String(tgGetVal_('vxct', chat) || '').replace(/\s+/g, ' ').slice(0, 1200);
  tgSetVal_('vxn', chat, note);
  tgDel_('vxct', chat);
  tgSend_(chat, 'ممنون که گفتید 🌱 با همین، درمانگری را پیدا می‌کنیم که به حرفتان نزدیک‌تر است.');
  if (!r.gender) return tgQuizGender_(chat, '');
  tgSetVal_('qg', chat, r.gender);
  if (!r.age) return tgQuizAge_(chat);
  if (!r.mode) return tgQuizMode_(chat, r.age);
  tgSetVal_('qa', chat, r.age);
  return tgQuizFinish_(chat, r.mode);
}

/** از tgOnPhone_ بعد از ساخت یا به‌روزرسانی سطر لید */
function vxcAfterPhone_(chat) {
  var note = tgGetVal_('vxn', chat);
  if (!note) return;
  tgDel_('vxn', chat);
  if (vxDry_()) { TG_OUTBOX.push({ kind: 'vxnote', text: note }); return; }
  try { var row = tgFindLead_(chat); if (row > 1) tgLeadNote_(row, note, 'مراجع'); } catch (e) { vxErr_('vxn', e); }
}

/* ================= کال‌بک‌ها ================= */

function vxOnCb_(chat, data, cq, name, uname) {
  var a = String(data).split(':');
  try {
    if (a[1] === 'u' && a[2] === 'ok') return vxUniversalOk_(cq);
    if (a[1] === 'u' && a[2] === 'x') { tgDel_('vxu', chat); return tgSend_(chat, 'باشه، بنویسید.'); }
    if (a[1] === 'c') {
      if (a[2] === 'go') return vxcIntro_(chat);
      if (a[2] === 'use') { var t = tgGetVal_('vxu', chat); tgDel_('vxu', chat); tgSetFlag_('vxc', chat, 3600); if (t) return vxcAnalyze_(chat, t, name); return vxcIntro_(chat); }
      if (a[2] === 'ok') return vxcOk_(chat);
      if (a[2] === 'more') { tgSetFlag_('vxc', chat, 3600); return tgSend_(chat, 'بفرمایید؛ ویس یا متن. بقیهٔ حرف‌هایتان را هم نگه داشته‌ام.'); }
      if (a[2] === 'quiz') { tgDelFlag_('vxc', chat); tgDel_('vxct', chat); return tgQuizTopic_(chat, true); }
    }
    if (a[1] === 'ok') return vxOk_(chat, a[2]);
    if (a[1] === 'ed') return vxEditAsk_(chat, a[2]);
    if (a[1] === 're') return vxReRecord_(chat, a[2]);
    if (a[1] === 'tx') return vxShowText_(chat, a[2]);
    if (a[1] === 'x') { tgDel_('vxe', chat); return tgSend_(chat, 'بسته شد.'); }
    if (a[1] === 'ed2') return vxEdCb_(chat, a);
  } catch (e) { vxErr_('cb ' + data, e); tgSend_(chat, 'این دکمه الان کار نکرد. دوباره امتحان کنید.'); }
}

/* ================= اصلاحات بازبینی علمی ================= */

var VX_ED_TAB = 'اصلاحات مقاله';
/* v169: هفت ستون آخر در انتهای تب اضافه شدند (ستون‌های قبلی جابه‌جا نمی‌شوند؛ بات با ایندکس می‌خواند). روند در review.gs */
var VX_ED_HEAD = ['کد', 'بازبینی', 'شناسهٔ مطلب', 'عنوان', 'بازبین', 'وضعیت', 'پیشنهادها', 'پذیرفته', 'فایل', 'سردبیر', 'تأیید نهایی', 'انتشار', 'نتیجه', 'زمان',
  'مالک فعلی', 'زمان ثبت', 'زمان تأیید سردبیر', 'زمان تأیید نهایی', 'متن اصلی بازبین', 'متن پیاده‌شدهٔ ویس', 'امتیاز'];
/* v169: همان مقدارهای فهرست کشویی RV_ST (review.gs). خطای ساخت وضعیت را «تازه» نگه می‌دارد و «نتیجه» با «خطای ساخت» شروع می‌شود */
var VX_ED_ST = { Q: 'تازه', ED: 'در صف سردبیر', FIN: 'آمادهٔ انتشار', PUB: 'منتشر شد', FAIL: 'تازه', NONE: 'در صف سردبیر' };

function vxEdSheet_() { return tgMagSheet_(VX_ED_TAB, VX_ED_HEAD); }
function vxEdRows_() {
  if (vxDry_()) return (TG_MEM['vxed'] = TG_MEM['vxed'] || []);
  var sh = vxEdSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, VX_ED_HEAD.length).getDisplayValues().map(function (r, i) { var o = { _row: i + 2 }; VX_ED_HEAD.forEach(function (h, j) { o[h] = r[j]; }); return o; });
}
function vxEdGet_(code) { var a = vxEdRows_(); for (var i = 0; i < a.length; i++) if (a[i]['کد'] === code || a[i]['بازبینی'] === code) return a[i]; return null; }
function vxEdSet_(code, patch) {
  var r = vxEdGet_(code); if (!r) return null;
  patch['زمان'] = Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd HH:mm');
  Object.keys(patch).forEach(function (k) { var j = VX_ED_HEAD.indexOf(k); if (j < 0) return; r[k] = String(patch[k] == null ? '' : patch[k]); if (!vxDry_()) vxEdSheet_().getRange(r._row, j + 1).setValue(patch[k]); });
  return r;
}

/** از mcReviewSubmit_ (نتیجهٔ b یا c) و دستی برای موارد قبلی */
function vxEdQueue_(cCode) {
  if (vxEdGet_(cCode)) return vxEdGet_(cCode)['کد'];
  var rows = vxEdRows_(), mx = 4000;
  rows.forEach(function (r) { var m = /^E-(\d+)$/.exec(r['کد']); if (m) mx = Math.max(mx, +m[1]); });
  var code = 'E-' + (mx + 1), m = mcGet_(cCode);
  var now0 = Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd HH:mm');
  var rec = [code, cCode, m ? m['شناسهٔ مطلب'] : '', m ? m['عنوان مطلب'] : '', m ? m['نام'] : '', VX_ED_ST.Q, '', '', '', '', '', '', '', now0,
    'سیستم', now0, '', '', m ? String(m['متن'] || '').slice(0, 45000) : '', '', ''];
  if (vxDry_()) { var o = { _row: rows.length + 2 }; VX_ED_HEAD.forEach(function (h, j) { o[h] = rec[j]; }); rows.push(o); return code; }
  vxEdSheet_().appendRow(rec);
  vxKick_(15);
  return code;
}

function vxEdTick_() {
  vxEdRows_().forEach(function (e) {
    if (e['وضعیت'] !== VX_ED_ST.Q || e['فایل'] || /^خطای ساخت/.test(e['نتیجه'])) return;
    try { vxEdBuild_(e['کد']); } catch (x) { vxErr_('edbuild ' + e['کد'], x); vxEdSet_(e['کد'], { 'وضعیت': VX_ED_ST.FAIL, 'نتیجه': ('خطای ساخت: ' + String(x)).slice(0, 300) }); }
  });
}

function vxK_(s) { return String(s || '').replace(/^[•\-\s]+/, '').replace(/[\s‌‏‎ ]+/g, '').replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک').replace(/[—–\-،,.:؛!؟?«»"()]/g, ''); }

/** پاراگراف‌های سند: نسخهٔ پایه (ساختهٔ بات) و نسخهٔ فعلی با پیشنهادها */
function vxDocParas_(docId) {
  var tok = ScriptApp.getOAuthToken(), H = { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true };
  var paras = function (doc) { return ((doc.body || {}).content || []).filter(function (c) { return c.paragraph; }).map(function (c) { return c.paragraph.elements.map(function (e) { return (e.textRun || {}).content || ''; }).join('').trim(); }).filter(String); };
  var lines = function (txt) { return String(txt || '').replace(/^\uFEFF/, '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(String); };
  var now = [], via = '';
  /* با پیشنهادهای پذیرفته (حالت Suggesting)؛ اگر Docs API در پروژه باز نبود، خروجی متنی درایو */
  try { var cr = UrlFetchApp.fetch('https://docs.googleapis.com/v1/documents/' + docId + '?suggestionsViewMode=PREVIEW_SUGGESTIONS_ACCEPTED', H); if (cr.getResponseCode() === 200) { now = paras(JSON.parse(cr.getContentText())); via = 'docs'; } } catch (e0) {}
  if (!now.length) { var ex = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + docId + '/export?mimeType=text/plain', H); if (ex.getResponseCode() === 200) { now = lines(ex.getContentText()); via = 'export'; } }
  var revs = JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + docId + '/revisions?fields=revisions(id,modifiedTime,lastModifyingUser(emailAddress,me),exportLinks)', H).getContentText()).revisions || [];
  var base = null;
  for (var i = 0; i < revs.length; i++) {
    var me = revs[i].lastModifyingUser && revs[i].lastModifyingUser.me;
    if (!me) break;
    base = revs[i];
  }
  var baseParas = null;
  if (base && base.exportLinks && base.exportLinks['text/plain']) {
    baseParas = lines(UrlFetchApp.fetch(base.exportLinks['text/plain'], H).getContentText());
  }
  var comments = [];
  try {
    var cj = JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + docId + '/comments?fields=comments(content,quotedFileContent,resolved,replies(content))&pageSize=100', H).getContentText());
    comments = (cj.comments || []).map(function (c) { return { q: (c.quotedFileContent || {}).value || '', t: c.content || '' }; });
  } catch (e) {}
  return { now: now, base: baseParas, comments: comments, via: via };
}

/** LCS روی پاراگراف‌ها ← تغییرهای جایگزینی/درج/حذف */
function vxParaDiff_(a, b) {
  var n = a.length, m = b.length, K = function (s) { return vxK_(s); };
  var L = []; for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
  for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) L[i][j] = K(a[i]) === K(b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  var ops = [], x = 0, y = 0, del = [], ins = [], prev = '';
  var flush = function () {
    var k = 0;
    for (; k < Math.min(del.length, ins.length); k++) ops.push({ kind: 'edit', old: del[k], neu: ins[k] });
    for (var d = k; d < del.length; d++) ops.push({ kind: 'del', old: del[d], neu: '' });
    for (var s = k; s < ins.length; s++) ops.push({ kind: 'add', old: '', neu: ins[s], after: s === k ? prev : ins[s - 1] });
    if (del.length || ins.length) prev = ins.length ? ins[ins.length - 1] : prev;
    del = []; ins = [];
  };
  while (x < n || y < m) {
    if (x < n && y < m && K(a[x]) === K(b[y])) { flush(); prev = b[y]; x++; y++; }
    else if (y < m && (x >= n || L[x][y + 1] >= L[x + 1][y])) { ins.push(b[y]); y++; }
    else { del.push(a[x]); x++; }
  }
  flush();
  return ops.filter(function (o) { return !(o.kind === 'edit' && vxK_(o.old) === vxK_(o.neu)); });
}

var VX_ED_SCHEMA = { type: 'OBJECT', properties: {
  changes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { old: { type: 'STRING' }, neu: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['old', 'neu', 'why'] } },
  notes: { type: 'ARRAY', items: { type: 'STRING' } }
}, required: ['changes', 'notes'] };

/** یادداشت آزاد بازبین (متن/ویس) و کامنت‌ها ← تغییرهای دقیقِ جمله‌به‌جمله. فقط محتوای منتشرشدهٔ مقاله و حرف حرفه‌ای بازبین. */
function vxNotesToChanges_(paras, notes) {
  if (!String(notes).trim()) return { changes: [], notes: [] };
  var o = vxGem_([{ text: 'این یادداشت یک بازبین علمی (روان‌شناس بالینی) روی یک مقالهٔ مجله است. هر اصلاحی که روشن و قابل اجراست را به شکل تغییر دقیق بنویس:\n' +
    'old باید عیناً یک جمله یا بخشی از یک پاراگراف مقالهٔ زیر باشد (حرف‌به‌حرف کپی کن)، neu همان بخش بعد از اصلاح، why یک جملهٔ کوتاه دلیل.\n' +
    'هر چیزی که نظر کلی است یا نمی‌شود دقیقاً اعمال کرد را در notes بنویس. چیزی از خودت اضافه نکن. خط تیرهٔ وسط جمله ننویس.\n\n' +
    '=== یادداشت بازبین ===\n' + String(notes).slice(0, 12000) + '\n\n=== متن مقاله (پاراگراف به پاراگراف) ===\n' + paras.join('\n').slice(0, 60000) }], VX_ED_SCHEMA);
  return { changes: (o.changes || []).filter(function (c) { return c.old && c.neu !== undefined; }), notes: o.notes || [] };
}

function vxEdBuild_(code) {
  var e = vxEdGet_(code), m = mcGet_(e['بازبینی']);
  if (!m) throw new Error('mc not found');
  var art = mcPostText_(m['شناسهٔ مطلب']).map(function (x) { return x.t; });
  var changes = [], notes = [], id = 0;
  var docUrl = m['گوگل‌داک'], docId = (String(docUrl).match(/[-\w]{25,}/) || [])[0];
  var commentTxt = '';
  if (docId) {
    var d = vxDocParas_(docId);
    var cut = function (list) { var i = 0; while (i < list.length && i < 4 && (/^راهنما:|^https?:\/\//.test(list[i]) || vxK_(list[i]) === vxK_(m['عنوان مطلب']) || vxK_(list[i]) === vxK_(art[0] || ''))) i++; return list.slice(i); };
    var base = d.base ? cut(d.base) : art;
    vxParaDiff_(base, cut(d.now)).forEach(function (o) { changes.push({ id: ++id, src: 'doc', kind: o.kind, old: o.old.replace(/^•\s*/, ''), neu: o.neu.replace(/^•\s*/, ''), after: String(o.after || '').replace(/^•\s*/, ''), why: '', on: true }); });
    commentTxt = d.comments.map(function (c) { return (c.q ? '«' + c.q + '» ← ' : '') + c.t; }).join('\n');
  }
  /* v169: ویس بازبین با Gemini کامل پیاده می‌شود (review.gs) و کنار متن اصلی به Gemini تغییرها می‌رسد */
  var trText = typeof rvVoiceText_ === 'function' ? rvVoiceText_(m) : '';
  var free = [m['متن'], trText ? 'ویس بازبین:\n' + trText : '', commentTxt].filter(String).join('\n');
  if (free.trim()) {
    var g = vxNotesToChanges_(art, free);
    g.changes.forEach(function (c) { changes.push({ id: ++id, src: 'note', kind: c.neu ? 'edit' : 'del', old: vxNoDash_(c.old), neu: vxNoDash_(c.neu), why: c.why, on: false }); });
    notes = g.notes;
  }
  var data = { v: 1, code: code, c: m['کد'], post: +m['شناسهٔ مطلب'], title: m['عنوان مطلب'], reviewer: m['نام'], verdict: m['نتیجهٔ بازبینی'], nz: m['کد نظام'], consent: m['نام روی صفحه'], doc: docUrl, raw: m['متن'], tr: trText, changes: changes, notes: notes };
  /* v169: چک عنوان، توضیح متا، لینک داخلی و لحن با Gemini (فقط متن منتشرشدهٔ مقاله) */
  try { if (typeof rvGemQc_ === 'function') { var rp = rvPostFetch_(data.post); data.qc = rvGemQc_(rp ? { title: rp.title, meta: rp.meta, links: rvLinksIn_(rp.html), text: rp.text } : null); } } catch (eq) { vxErr_('qc', eq); }
  var fid = vxDry_() ? 'DRYFILE' : vxFolder_().createFile(code + '-edits.json', JSON.stringify(data), 'application/json').getId();
  if (vxDry_()) TG_MEM['vxedfile'] = data;
  vxEdSet_(code, { 'وضعیت': changes.length ? VX_ED_ST.ED : VX_ED_ST.NONE, 'پیشنهادها': changes.length, 'پذیرفته': changes.filter(function (c) { return c.on; }).length, 'فایل': fid,
    'مالک فعلی': typeof rvEditorName_ === 'function' ? rvEditorName_() : 'سردبیر', 'متن اصلی بازبین': String(m['متن'] || '').slice(0, 45000), 'متن پیاده‌شدهٔ ویس': String(trText || '').slice(0, 45000) });
  if (typeof rvEditorCard_ === 'function') rvEditorCard_(code); else vxEdCard_(vxEdGet_(code), data, 'editor');
}

function vxEdData_(e) { if (vxDry_()) return TG_MEM['vxedfile']; return JSON.parse(DriveApp.getFileById(e['فایل']).getBlob().getDataAsString()); }
function vxEdSave_(e, data) { if (vxDry_()) { TG_MEM['vxedfile'] = data; return; } DriveApp.getFileById(e['فایل']).setContent(JSON.stringify(data)); }

/* ----- صفحهٔ بررسی: لینک امضاشده ----- */
function vxPageKey_() { var p = vxP_(), k = p.getProperty('VX_PAGE_KEY'); if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('VX_PAGE_KEY', k); } return k; }
function vxSig_(code, who) { return Utilities.computeHmacSha256Signature(code + '|' + who, vxDry_() ? 'dry' : vxPageKey_()).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('').slice(0, 32); }
/* v169: ریشهٔ ۴۰۴ «🔍 بررسی اصلاحات»: «w» متغیر عمومی پرس‌وجوی وردپرس است (شمارهٔ هفته)؛ ?w=<chat_id> را آرشیو هفته می‌خواند و ۴۰۴ می‌دهد.
   حالا هر لینک بررسی به خود بات می‌رود (start=rv_E-…) و بات دکمهٔ مینی‌اپ می‌دهد. برگهٔ /review/ هم به همین ریدایرکت می‌شود. */
function vxPageUrl_(code, who) { return 'https://t.me/tajrobehlife_bot?start=rv_' + code; }

/** پارامتر c در نشانی /exec رزرو گوگل است (خطای ۴۰۰)؛ برای همین کد با ec می‌آید.
 * API صفحهٔ بررسی روی سایت (tajrobeh.life/review/): GET برای داده، POST با act برای ذخیره و انتشار */
function vxApiEd_(p) {
  try {
    if (p.act) {
      var dec = p.dec; if (typeof dec === 'string') { try { dec = JSON.parse(dec); } catch (e) { dec = []; } }
      var r = vxPageSave(String(p.ec || p.c || ''), String(p.w || ''), String(p.k || ''), dec || [], String(p.act));
      r.ok = r.ok !== false; return r;
    }
    var d = vxPageData(String(p.ec || p.c || ''), String(p.w || ''), String(p.k || ''));
    d.ok = true; return d;
  } catch (e) { return { ok: false, error: String(e && e.message ? e.message : e) }; }
}
function vxOwner_() { return typeof TG_OWNER_CHAT !== 'undefined' ? String(TG_OWNER_CHAT) : ''; }

function vxEdCard_(e, data, stage) {
  var ch = data.changes || [];
  var head = '🔬 <b>اصلاحات بازبینی علمی</b> · <code>' + e['کد'] + '</code>\n«' + vxEsc_(mcShort_(data.title, 80)) + '»\nبازبین: ' + vxEsc_(data.reviewer) + ' · ' + vxEsc_(data.verdict) + '\n\n';
  if (!ch.length) {
    var t0 = head + 'تغییر مشخصی در متن پیدا نشد.' + (data.raw ? '\n\nیادداشت بازبین:\n' + vxEsc_(mcShort_(data.raw, 1500)) : '') + (data.doc ? '\n\nسند: ' + data.doc : '');
    return mcEditors_().forEach(function (x) { tgSend_(x, t0); });
  }
  var nDoc = ch.filter(function (c) { return c.src === 'doc'; }).length, nNote = ch.length - nDoc;
  var body = head + vxFa_(ch.length) + ' تغییر پیشنهادی' + (nDoc ? ' · ' + vxFa_(nDoc) + ' مستقیم از متن سند' : '') + (nNote ? ' · ' + vxFa_(nNote) + ' ساخته‌شده از یادداشت‌ها (پیش‌فرض خاموش)' : '') +
    (data.notes && data.notes.length ? '\n' + vxFa_(data.notes.length) + ' نکتهٔ کلی' : '');
  if (stage === 'editor') {
    body += '\n\nهر تغییر را در صفحهٔ بررسی با قبل و بعدش ببینید، تیک بزنید یا ویرایش کنید و برای تأیید نهایی بفرستید.';
    mcEditors_().forEach(function (x) { tgSend_(x, body, { inline_keyboard: [[{ text: '🔍 بررسی اصلاحات', url: vxPageUrl_(e['کد'], x) }]] }); });
    var own = vxOwner_();
    if (own && mcEditors_().map(String).indexOf(own) < 0) tgSend_(own, body.replace('هر تغییر را', 'سردبیر خبر شد. اگر خواستید خودتان هم می‌توانید هر تغییر را'), { inline_keyboard: [[{ text: '🔍 بررسی و انتشار', url: vxPageUrl_(e['کد'], own) }]] });
  } else if (stage === 'final') {
    var own2 = vxOwner_();
    body += '\n\nسردبیر ' + vxFa_(ch.filter(function (c) { return c.on; }).length) + ' تغییر را پذیرفته. با یک نگاه تأیید کنید تا روی مقاله برود.';
    tgSend_(own2, body, { inline_keyboard: [[{ text: '✅ دیدن و تأیید نهایی', url: vxPageUrl_(e['کد'], own2) }]] });
  }
}

function vxEdCb_(chat, a) { /* رزرو برای دکمه‌های آینده در خود تلگرام */ }

/** سرِ صفحه: داده برای رندر */
function vxPageData(code, who, k) {
  if (k !== vxSig_(code, who)) throw new Error('لینک نامعتبر است.');
  var e = vxEdGet_(code); if (!e) throw new Error('پیدا نشد.');
  var d = vxEdData_(e);
  var isOwner = String(who) === vxOwner_(), isEd = mcEditors_().map(String).indexOf(String(who)) > -1;
  var p = null; try { p = mcPost_(d.post); } catch (x) {}
  return { e: { code: e['کد'], st: e['وضعیت'], res: e['نتیجه'] }, d: d, role: isOwner ? 'owner' : (isEd ? 'editor' : 'viewer'), link: p ? p.link : '' };
}

/** سرِ صفحه: ذخیره و اقدام. action: save | send | publish */
function vxPageSave(code, who, k, decisions, action) {
  if (k !== vxSig_(code, who)) throw new Error('لینک نامعتبر است.');
  var e = vxEdGet_(code), d = vxEdData_(e);
  var isOwner = String(who) === vxOwner_(), isEd = mcEditors_().map(String).indexOf(String(who)) > -1;
  if (!isOwner && !isEd) throw new Error('دسترسی ندارید.');
  if (e['وضعیت'] === VX_ED_ST.PUB) throw new Error('این اصلاحات قبلاً منتشر شده است.');
  (decisions || []).forEach(function (x) { d.changes.forEach(function (c) { if (c.id === x.id) { c.on = !!x.on; if (typeof x.neu === 'string') c.neu = vxNoDash_(x.neu); } }); });
  vxEdSave_(e, d);
  var on = d.changes.filter(function (c) { return c.on; });
  vxEdSet_(code, { 'پذیرفته': on.length });
  /* v169: همان روند تازه (چک آمادگی و کارت یاسر)، نه انتشار مستقیم */
  if (action === 'send' && !isOwner) return rvApprove_(String(who), code);
  if ((action === 'publish' || action === 'send') && isOwner) return rvPublish_(String(who), code);
  return { ok: true, msg: 'ذخیره شد.' };
}

function vxEdPublish_(code, d) {
  var on = d.changes.filter(function (c) { return c.on; });
  var m = mcGet_(d.c);
  var named = m && m['نام روی صفحه'] === 'بله';
  var res = vxSite_(VX_SITE_PATCH, { post: d.post, code: d.c, changes: on.map(function (c) { return { id: c.id, kind: c.kind, old: c.old, neu: c.neu, after: c.after || '' }; }),
    reviewed: { name: named ? m['نام'] : '', date: Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd') } });
  var ok = (res.results || []).filter(function (x) { return x.ok; }).length, bad = (res.results || []).filter(function (x) { return !x.ok; });
  vxEdSet_(code, { 'وضعیت': VX_ED_ST.PUB, 'تأیید نهایی': Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd HH:mm'), 'انتشار': ok + '/' + on.length, 'نتیجه': bad.map(function (b) { return '#' + b.id + ' ' + b.why; }).join(' · ').slice(0, 400) });
  try { if (typeof rvAfterPublish_ === 'function') rvAfterPublish_(code, d, ok); } catch (eAp) { vxErr_('rvAfterPublish_', eAp); }   /* v169: امتیاز و سنجش اسکیما */
  if (m && [MC_ST.SENT, MC_ST.DRAFT].indexOf(m['وضعیت']) > -1) { mcSet_(d.c, { 'وضعیت': named ? MC_ST.PUB : MC_ST.OKN, 'تاریخ تصمیم': mcToday_() }); }
  mcSiteSync_();
  var p = mcPost_(d.post), link = p ? p.link : '';
  if (m && m['chat_id']) tgSend_(m['chat_id'], '🌿 اصلاحات علمی شما روی «' + vxEsc_(mcShort_(d.title, 60)) + '» اعمال شد' + (named ? ' و نامتان به‌عنوان بازبین علمی آمد' : '') + ':\n' + link + '\n\nممنون که دقت و دانشتان را برای مجله گذاشتید.');
  mcEditorsSay_('✅ ' + code + ': ' + vxFa_(ok) + ' از ' + vxFa_(on.length) + ' تغییر روی مقاله نشست.' + (bad.length ? ' ' + vxFa_(bad.length) + ' مورد جای دقیقش پیدا نشد و باید دستی نگاه شود.' : ''));
  return { ok: true, applied: ok, total: on.length, bad: bad, link: link, msg: 'منتشر شد.' };
}

/* ----- صفحهٔ HTML (از doGet با ?vxp=ed) ----- */
function vxPage_(p) {
  var t = HtmlService.createHtmlOutput(VX_PAGE_HTML.replace('__ARGS__', JSON.stringify({ c: String(p.c || ''), w: String(p.w || ''), k: String(p.k || '') })));
  return t.setTitle('بررسی اصلاحات · تجربه').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

var VX_PAGE_HTML = '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">' +
'<style>@font-face{font-family:Anjoman;src:url(https://tajrobeh.life/wp-content/uploads/fonts/anjoman-max-regular.woff2) format("woff2");font-weight:100 1000;font-display:swap}' +
':root{--r:#c83f49;--r6:#b63942;--ink:#0e0e0e;--soft:#4e4e4e;--mut:#676768;--line:#dfdfe2;--sunk:#f5f5f8;--tint:#faeced;--ok:#1f7a55}' +
'*{box-sizing:border-box}html,body{margin:0;background:#fff;color:var(--ink);font:16px/1.9 Anjoman,Tahoma,sans-serif;font-variation-settings:"slnt" 0}' +
'.w{max-width:860px;margin:0 auto;padding:22px 16px 120px}.eb{color:var(--r);font-size:13px;font-weight:700;letter-spacing:.02em}h1{font-size:26px;line-height:1.5;margin:4px 0 6px}' +
'.meta{color:var(--soft);font-size:14px;display:flex;flex-wrap:wrap;gap:6px 14px}.meta a{color:var(--r)}.pill{border:1px solid var(--line);border-radius:999px;padding:0 10px;font-size:12px}' +
'.bar{height:6px;background:var(--sunk);border-radius:9px;margin:18px 0 8px;overflow:hidden}.bar i{display:block;height:100%;background:var(--r);width:0;transition:width .4s}' +
'.c{border:1px solid var(--line);border-radius:18px;padding:14px 16px;margin:14px 0;transition:opacity .25s,border-color .25s,box-shadow .25s}.c.on{border-color:var(--r);box-shadow:0 6px 24px rgba(200,63,73,.08)}.c.off{opacity:.55}' +
'.ch{display:flex;align-items:center;gap:10px;justify-content:space-between}.tag{font-size:12px;color:var(--mut)}.tag b{color:var(--ink)}' +
'.sw{position:relative;width:46px;height:26px;border-radius:99px;background:var(--line);border:0;cursor:pointer;flex:none;transition:background .2s}.sw:after{content:"";position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}.c.on .sw{background:var(--r)}.c.on .sw:after{transform:translateX(-20px)}' +
'.df{margin:10px 0 4px;font-size:16px;line-height:2.1;background:var(--sunk);border-radius:12px;padding:10px 12px}.df del{color:#8a2c33;text-decoration:line-through;text-decoration-color:var(--r);background:rgba(200,63,73,.08);border-radius:4px;padding:0 2px}.df ins{text-decoration:none;background:var(--tint);color:var(--ink);font-weight:700;border-bottom:2px solid var(--r);border-radius:4px;padding:0 2px}' +
'.why{font-size:13px;color:var(--soft)}.ed{font-size:13px;color:var(--r);background:none;border:0;cursor:pointer;padding:0;font-family:inherit}textarea{width:100%;min-height:110px;font:inherit;border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px}' +
'.notes{background:var(--sunk);border-radius:16px;padding:12px 16px;margin:18px 0}.notes h3{margin:0 0 6px;font-size:15px}.notes li{font-size:14px;color:var(--soft)}' +
'.ft{position:fixed;inset:auto 0 0 0;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-top:1px solid var(--line)}.ft .w{padding:12px 16px;display:flex;gap:10px;align-items:center;justify-content:space-between}' +
'.cnt{font-size:14px;color:var(--soft)}.btn{font:inherit;font-weight:700;border-radius:999px;border:1px solid var(--r);background:var(--r);color:#fff;padding:9px 20px;cursor:pointer}.btn.gh{background:#fff;color:var(--r)}.btn:disabled{opacity:.5}' +
'.msg{margin:14px 0;padding:12px 14px;border-radius:14px;background:var(--tint)}.done{border:1px solid var(--ok);background:#f1faf5}.sk{height:120px;border-radius:18px;background:linear-gradient(90deg,#f5f5f8,#fbfbfd,#f5f5f8);background-size:200% 100%;animation:s 1.2s infinite}@keyframes s{to{background-position:-200% 0}}' +
'</style></head><body><div class="w" id="app"><div class="sk"></div><div class="sk" style="margin-top:14px"></div></div>' +
'<div class="ft"><div class="w"><span class="cnt" id="cnt"></span><span><button class="btn gh" id="bs">ذخیره</button> <button class="btn" id="bg">…</button></span></div></div>' +
'<script>var A=__ARGS__,D=null,ROLE="";' +
'function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}' +
'function tok(s){return String(s||"").split(/(\\s+)/)}' +
'function diff(a,b){var x=tok(a),y=tok(b),n=x.length,m=y.length,L=[],i,j;for(i=0;i<=n;i++){L.push(new Array(m+1).fill(0))}for(i=n-1;i>=0;i--)for(j=m-1;j>=0;j--)L[i][j]=x[i]===y[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);var o="";i=0;j=0;while(i<n||j<m){if(i<n&&j<m&&x[i]===y[j]){o+=esc(x[i]);i++;j++}else if(j<m&&(i>=n||L[i][j+1]>=L[i+1][j])){o+="<ins>"+esc(y[j])+"</ins>";j++}else{o+="<del>"+esc(x[i])+"</del>";i++}}return o.replace(/<\\/ins><ins>/g,"").replace(/<\\/del><del>/g,"")}' +
'function kindLbl(c){return c.kind==="add"?"افزودن بند تازه":c.kind==="del"?"حذف":"اصلاح"}' +
'function render(){var d=D.d,h="";h+="<div class=eb>بازبینی علمی · "+esc(D.e.code)+"</div><h1>"+esc(d.title)+"</h1><div class=meta><span>بازبین: <b>"+esc(d.reviewer)+"</b></span><span class=pill>"+esc(d.verdict)+"</span>"+(D.link?"<a href=\\""+esc(D.link)+"\\" target=_blank>دیدن مقاله</a>":"")+(d.doc?"<a href=\\""+esc(d.doc)+"\\" target=_blank>سند بازبین</a>":"")+"</div>";' +
'if(D.e.st==="منتشر شد")h+="<div class=\\"msg done\\">این اصلاحات منتشر شده است. "+esc(D.e.res||"")+"</div>";' +
'h+="<div class=bar><i id=pb></i></div>";' +
'd.changes.forEach(function(c){var body=c.kind==="add"?"<ins>"+esc(c.neu)+"</ins>":c.kind==="del"?"<del>"+esc(c.old)+"</del>":diff(c.old,c.neu);h+="<div class=\\"c "+(c.on?"on":"off")+"\\" id=c"+c.id+"><div class=ch><span class=tag><b>"+kindLbl(c)+"</b> · "+(c.src==="doc"?"از متن سند بازبین":"ساخته‌شده از یادداشت بازبین؛ با دقت ببینید")+"</span><button class=sw aria-label=پذیرش data-id="+c.id+"></button></div>"+(c.kind==="add"&&c.after?"<div class=why>بعد از: «"+esc(c.after.slice(0,90))+"…»</div>":"")+"<div class=df>"+body+"</div>"+(c.why?"<div class=why>"+esc(c.why)+"</div>":"")+(c.kind!=="del"?"<button class=ed data-id="+c.id+">ویرایش متن تازه</button><div id=t"+c.id+"></div>":"")+"</div>"});' +
'if(d.notes&&d.notes.length)h+="<div class=notes><h3>نکته‌های کلی بازبین (روی متن اعمال نمی‌شود)</h3><ul>"+d.notes.map(function(n){return"<li>"+esc(n)+"</li>"}).join("")+"</ul></div>";' +
'if(d.raw)h+="<details class=notes><summary>یادداشت کامل بازبین</summary><div style=\\"white-space:pre-wrap;font-size:14px\\">"+esc(d.raw)+"</div></details>";' +
'h+="<div id=res></div>";document.getElementById("app").innerHTML=h;wire();count()}' +
'function count(){var on=D.d.changes.filter(function(c){return c.on}).length,t=D.d.changes.length;document.getElementById("cnt").textContent=on+" از "+t+" تغییر پذیرفته";document.getElementById("pb").style.width=(t?on*100/t:0)+"%"}' +
'function wire(){document.querySelectorAll(".sw").forEach(function(b){b.onclick=function(){var c=D.d.changes.find(function(x){return x.id==b.dataset.id});c.on=!c.on;var el=document.getElementById("c"+c.id);el.className="c "+(c.on?"on":"off");count()}});' +
'document.querySelectorAll(".ed").forEach(function(b){b.onclick=function(){var c=D.d.changes.find(function(x){return x.id==b.dataset.id}),box=document.getElementById("t"+c.id);if(box.firstChild)return;var ta=document.createElement("textarea");ta.value=c.neu;ta.oninput=function(){c.neu=ta.value;c.on=true;document.getElementById("c"+c.id).className="c on";count()};box.appendChild(ta);ta.focus()}})}' +
'function dec(){return D.d.changes.map(function(c){return{id:c.id,on:c.on,neu:c.neu}})}' +
'function act(a){var bs=document.getElementById("bs"),bg=document.getElementById("bg");bs.disabled=bg.disabled=true;google.script.run.withSuccessHandler(function(r){bs.disabled=bg.disabled=false;var m="<div class=\\"msg done\\">"+esc(r.msg||"انجام شد")+(r.total!=null?" "+r.applied+" از "+r.total+" تغییر روی مقاله نشست.":"")+(r.bad&&r.bad.length?"<br>جای دقیق این‌ها پیدا نشد و باید دستی نگاه شود: "+r.bad.map(function(b){return"#"+b.id}).join("، "):"")+(r.link?"<br><a href=\\""+esc(r.link)+"?v="+Date.now()+"\\" target=_blank>دیدن مقاله</a>":"")+"</div>";document.getElementById("res").innerHTML=m;document.getElementById("res").scrollIntoView({behavior:"smooth"})}).withFailureHandler(function(e){bs.disabled=bg.disabled=false;document.getElementById("res").innerHTML="<div class=msg>"+esc(e.message)+"</div>"}).vxPageSave(A.c,A.w,A.k,dec(),a)}' +
'google.script.run.withSuccessHandler(function(r){D=r;ROLE=r.role;var bg=document.getElementById("bg");bg.textContent=ROLE==="owner"?"✅ تأیید و انتشار روی مقاله":"فرستادن برای تأیید نهایی";if(ROLE==="viewer"){bg.style.display="none";document.getElementById("bs").style.display="none"}bg.onclick=function(){act(ROLE==="owner"?"publish":"send")};document.getElementById("bs").onclick=function(){act("save")};render()}).withFailureHandler(function(e){document.getElementById("app").innerHTML="<div class=msg>"+esc(e.message)+"</div>"}).vxPageData(A.c,A.w,A.k);' +
'</script></body></html>';

/* ================= تست خشک ================= */
function vxTests() {
  var out = [], ok = function (name, cond) { out.push([name, !!cond]); };
  ok('پاراگراف: مکث بلند جدا می‌کند', vxParas_([[0, 1, 'الف'], [1, 2, 'ب'], [4, 5, 'ج']]).length === 2);
  var tr = { segs: [[0, 2, 'این یک تست است'], [2, 4, 'فروئد گفت']] };
  var e1 = vxApplyEdit_(tr, 'فروئد ← فروید');
  ok('اصلاح «غلط ← درست»', e1.n === 1 && e1.segs[1][2] === 'فروید گفت');
  var e2 = vxApplyEdit_(tr, 'جملهٔ اول. جملهٔ دوم کمی بلندتر است.');
  ok('اصلاح کل متن روی همان زمان', e2.n === -1 && e2.segs.length === 2 && e2.segs[1][1] === 4);
  ok('بی‌خط‌تیره', vxNoDash_('الف — ب') === 'الف، ب');
  var d = vxParaDiff_(['الف', 'ب', 'ج', 'د'], ['الف', 'ب تازه', 'ج', 'ج۲', 'د']);
  ok('دیف: یک اصلاح و یک افزودن', d.length === 2 && d[0].kind === 'edit' && d[0].old === 'ب' && d[1].kind === 'add' && d[1].after === 'ج');
  ok('دیف: فقط فاصله فرق دارد، تغییر نیست', vxParaDiff_(['الف ب'], ['الف  ب']).length === 0);
  var n = vxcNormalize_({ topic: 'zzz', needs: ['n5', 'x'], prefs: ['p4'], gender: 'f', age: 'x', mode: 'on', couple: false, summary: 'شما — نگرانید' }, 'خیلی استرس دارم');
  ok('مچ صوتی: موضوع نامعتبر ← حدس کلیدواژه', n.topic === 'anx');
  ok('مچ صوتی: فیلتر کلیدها', n.needs.join() === 'n5' && n.prefs.join() === 'p4' && n.gender === 'f' && n.mode === 'on' && n.age === 'x');
  ok('مچ صوتی: زوج ← rel', vxcNormalize_({ topic: 'anx', couple: true }, '').topic === 'rel');
  ok('خلاصه بی‌خط‌تیره', n.summary.indexOf('—') < 0);
  ok('حدس بی‌مدل: همسر ← rel', vxcGuess_('با همسرم دعوا داریم') === 'rel');
  ok('امضای لینک ثابت است', vxSig_('E-4001', '1') === vxSig_('E-4001', '1') && vxSig_('E-4001', '1') !== vxSig_('E-4001', '2'));
  ok('تکه‌تکه‌کردن متن بلند', vxTextChunks_(new Array(40).join('پاراگراف نسبتاً بلند برای تست. ') + '\n\n' + new Array(40).join('دومی. '), 600).length >= 2);
  return out;
}

/** برای TG_SUITES: تست‌های تابعی + مسیر خشک مچ‌میکینگ صوتی و «همین را بفرست» */
function vxTestsRun() {
  var lines = [];
  vxTests().forEach(function (x) { lines.push((x[1] ? '✓ ' : '✗ ') + x[0]); });
  var keepDry = TG_DRY, keepMem = TG_MEM, keepBox = TG_OUTBOX;
  TG_DRY = true; TG_MEM = { policy: {}, capdry: {}, quiet: false, notify: [] }; TG_OUTBOX = [];
  try {
    var C = '7001', from = { id: 7001, first_name: 'تست' };
    tgSetVal_('lctry', C, 'ایران'); tgSetVal_('lhrd', C, 'اینستاگرام');   /* v168.9: دو پرسش پیش از شماره از قبل جواب داده شده */
    var last = function () { var a = TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && x.chat === C; }); return a[a.length - 1] || { text: '', markup: null }; };
    var kbHas = function (ev, d) { return JSON.stringify((ev && ev.markup) || {}).indexOf(d) > -1; };
    tgQuizTopic_(C);
    lines.push((kbHas(last(), 'vx:c:go') ? '✓' : '✗') + ' دکمهٔ «با صدای خودم» در سؤال موضوع');
    vxOnCb_(C, 'vx:c:go', { from: from, message: { chat: { id: C }, message_id: 1 } }, 'تست', '');
    lines.push((tgFlag_('vxc', C) && last().text.indexOf('حریم خصوصی') > -1 ? '✓' : '✗') + ' معرفی مچ صوتی با متن حریم خصوصی');
    VX_DRY_TEXT = 'با همسرم خیلی دعوا داریم و استرس دارم، ترجیحاً درمانگر خانم و آنلاین';
    VX_DRY_LLM = { topic: 'anx', couple: true, needs: ['n5', 'n9'], prefs: ['p2'], gender: 'f', age: 'x', mode: 'on', crisis: false, summary: 'شما در رابطه با همسرتان تنش دارید.' };
    vxRoute_(C, { chat: { id: C }, from: from, voice: { file_id: 'V1', duration: 40 } }, 'تست', '');
    lines.push((kbHas(last(), 'vx:c:ok') && last().text.indexOf('رابطه') > -1 ? '✓' : '✗') + ' برداشت صوتی: زوج و ترجیح‌ها نشان داده شد');
    vxOnCb_(C, 'vx:c:ok', { from: from, message: { chat: { id: C }, message_id: 2 } }, 'تست', '');
    lines.push((tgGetVal_('qt', C) === 'rel' && tgGetVal_('nd', C) === 'n5,n9' && tgGetVal_('qg', C) === 'f' && tgGetVal_('pf', C) === 'p2' ? '✓' : '✗') + ' تأیید: موضوع، نیازها، سبک و جنسیت پر شد');
    lines.push((kbHas(last(), 'request_contact') ? '✓' : '✗') + ' همه‌چیز گفته شده بود: مستقیم سراغ شماره');
    lines.push((!tgFlag_('vxc', C) && tgGetVal_('vxn', C).indexOf('فایل صدا نگه داشته نشد') > -1 ? '✓' : '✗') + ' یادداشت لید آماده و حالت بسته شد');
    vxcAfterPhone_(C);
    lines.push((TG_OUTBOX.some(function (x) { return x.kind === 'vxnote'; }) && !tgGetVal_('vxn', C) ? '✓' : '✗') + ' یادداشت بعد از شماره ثبت شد');
    VX_DRY_LLM = { topic: 'dep', crisis: true, summary: '' };
    vxcIntro_(C); vxcAnalyze_(C, 'دیگر نمی‌خواهم زنده باشم', 'تست');
    lines.push((!tgFlag_('vxc', C) ? '✓' : '✗') + ' بحران: مسیر مچ صوتی بسته و مسیر بحران');
    VX_DRY_TEXT = 'سلام وقت بخیر، سؤالی دربارهٔ هزینهٔ جلسه داشتم';
    vxUniversal_(C, { chat: { id: C }, from: from, voice: { file_id: 'V2', duration: 12 } }, 'تست', '');
    lines.push((kbHas(last(), 'vx:u:ok') && kbHas(last(), 'vx:c:use') && last().text.indexOf('نگه داشته نمی‌شود') > -1 ? '✓' : '✗') + ' ویس بی‌حالت: متن + «همین را بفرست» + پیشنهاد مچ');
    lines.push((tgGetVal_('vxu', C) === VX_DRY_TEXT ? '✓' : '✗') + ' متن ویس برای تزریق نگه داشته شد');
  } catch (e) { lines.push('✗ خطا: ' + e + ' ' + (e.stack || '').slice(0, 200)); }
  finally { TG_DRY = keepDry; TG_MEM = keepMem; TG_OUTBOX = keepBox; VX_DRY_TEXT = null; VX_DRY_LLM = null; }
  return lines.join('\n');
}
