/**
 * video.gs · v170.100 (از v174.0 مخزن قدیمی) · ۲ آبان ۱۴۰۵ · پیش‌نویس زیرنویس فارسی، فصل‌بندی و پیشنهاد تکهٔ ریلز (D116، بند د لین E)
 *
 * تیم در تب «ویدیو · زیرنویس» هاب محتوا یک سطر می‌گذارد: نشانی یوتیوب (عمومی یا فهرست‌نشده) یا شناسهٔ فایل درایو.
 * هر شب (ساعت ۱ تا ۸ تهران، از tgWatchdog؛ بی تریگر تازه) بات با Gemini:
 * ۱) یوتیوب: تکه‌های ۱۰ دقیقه‌ای (videoMetadata)، هر اجرا تا ۲ تکه، زیرنویس با زمان. پیشرفت در سطر می‌ماند.
 *    فایل درایو: فقط اگر ستون «بی صدای مراجع» تیک خورده و فایل زیر ۱۸ مگابایت است، یک‌جا.
 * ۲) بعد از آخرین تکه: فایل SRT در پوشهٔ درایو، فصل‌بندی به شکل یوتیوب، و ۳ تا ۵ پیشنهاد تکهٔ ریلز (۱۵ تا ۶۰ ثانیه).
 * همه فقط پیش‌نویس است؛ تیم و یاسر پیش از انتشار می‌بینند. هیچ‌چیز خودکار جایی منتشر نمی‌شود.
 * حریم خصوصی: فایلی که ممکن است صدای مراجع داشته باشد به Gemini نمی‌رود (ستون «بی صدای مراجع» با تیم است).
 * خاموش: VIDEO_ON = 0 در «تنظیمات تیم».
 */
var VD_TAB = 'ویدیو · زیرنویس';
var VD_HEAD = ['شناسه', 'نشانی یا فایل درایو', 'عنوان', 'بی صدای مراجع', 'وضعیت', 'پیشرفت (دقیقه)', 'زیرنویس SRT', 'فصل‌ها', 'پیشنهاد ریلز', 'هزینه (دلار)', 'یادداشت', 'فایل کار'];
var VD_ST = { q: 'در صف', run: 'در کار', done: 'پیش‌نویس آماده', perm: 'اجازه لازم', err: 'خطا' };
var VD_ON = String(cfg_('VIDEO_ON', ''));   /* خالی یا 1 = روشن، 0 = خاموش */
var VD_SEG = 600, VD_MAX_MIN = 180, VD_PER_RUN = 2, VD_DRIVE_MAX = 18 * 1024 * 1024;
var VD_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];

function vdNow_() { return TG_DRY && TG_MEM['vd:now'] ? new Date(Number(TG_MEM['vd:now'])) : new Date(); }
function vdProp_(k, v) {
  if (TG_DRY) { if (v === undefined) return TG_MEM['vdp:' + k] || ''; TG_MEM['vdp:' + k] = v; return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty(k) || '';
  P.setProperty(k, String(v)); return v;
}
function vdRows_() { return pbRows_('c', VD_TAB, VD_HEAD); }
function vdSet_(row, ch) { pbSet_('c', VD_TAB, VD_HEAD, row, ch); }
function vdNoDash_(s) { return String(s == null ? '' : s).replace(/\s*[—–]\s*/g, '، ').trim(); }
function vdYt_(u) { return /^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{6,}/.test(String(u || '').trim()); }
function vdDriveId_(u) {
  var s = String(u || '').trim(), m = s.match(/\/d\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/);
  return m ? m[1] : (/^[\w-]{25,}$/.test(s) ? s : '');
}
function vdYes_(v) { return v === true || /^(true|بله|آری|✓|✔|1)$/i.test(String(v == null ? '' : v).trim()); }

/* ─────────────────────────── زمان و SRT ─────────────────────────── */
function vdTs_(sec, srt) {
  var ms = Math.max(0, Math.round(Number(sec) * 1000)), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  var p = function (n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; };
  if (srt) return p(h) + ':' + p(m) + ':' + p(s) + ',' + p(ms % 1000, 3);
  return (h ? h + ':' + p(m) : p(m)) + ':' + p(s);
}
function vdSrt_(cues) {
  return cues.slice().sort(function (a, b) { return a.s - b.s; }).map(function (c, i) {
    var e = Math.max(Number(c.e), Number(c.s) + 0.8);
    return (i + 1) + '\n' + vdTs_(c.s, true) + ' --> ' + vdTs_(e, true) + '\n' + vdNoDash_(c.t);
  }).join('\n\n') + '\n';
}

/* ─────────────────────────── Gemini ─────────────────────────── */
var VD_CUE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    ended: { type: 'BOOLEAN' },
    cues: { type: 'ARRAY', items: { type: 'OBJECT', properties: { s: { type: 'NUMBER' }, e: { type: 'NUMBER' }, t: { type: 'STRING' } }, required: ['s', 'e', 't'] } }
  },
  required: ['ended', 'cues']
};
var VD_META_SCHEMA = {
  type: 'OBJECT',
  properties: {
    chapters: { type: 'ARRAY', items: { type: 'OBJECT', properties: { s: { type: 'NUMBER' }, title: { type: 'STRING' } }, required: ['s', 'title'] } },
    reels: { type: 'ARRAY', items: { type: 'OBJECT', properties: { s: { type: 'NUMBER' }, e: { type: 'NUMBER' }, hook: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['s', 'e', 'hook', 'why'] } }
  },
  required: ['chapters', 'reels']
};
function vdCuePrompt_(seg) {
  return ['زیرنویس فارسی این ' + (seg ? 'بخش از ویدیو' : 'فایل') + ' را بنویس. خروجی فقط JSON طبق اسکیما.',
    '۱. هر cue یک یا دو سطر کوتاه (حداکثر ۸۴ نویسه)، بین ۱ تا ۶ ثانیه. s و e ثانیه از آغاز همین ' + (seg ? 'بخش' : 'فایل') + ' است.',
    '۲. گفتار را وفادار و روان بنویس؛ تکیه‌کلام‌های زائد را حذف کن ولی معنا را عوض نکن. نام خاص را همان‌طور که شنیده می‌شود بنویس.',
    '۳. هیچ خط تیرهٔ بلند یا کوتاه. نیم‌فاصلهٔ فارسی درست.',
    '۴. اگر گفتاری نیست، cues خالی. ended را true بگذار اگر ویدیو در همین بخش تمام شد یا این بخش بعد از پایان ویدیوست.'].join('\n');
}
function vdMetaPrompt_(title, cues) {
  var txt = cues.map(function (c) { return vdTs_(c.s) + ' ' + c.t; }).join('\n').slice(0, 60000);
  return ['از روی زیرنویس زمان‌دار این ویدیوی «مرکز تجربه زندگی» (روان‌درمانی و روانکاوی)، فصل‌بندی و پیشنهاد تکهٔ ریلز بساز. خروجی فقط JSON.',
    '۱. chapters: از ۰ شروع شود، هر فصل دست‌کم ۶۰ ثانیه، تیتر کوتاه فارسی (زیر ۵۰ نویسه) که محتوای همان فصل را بگوید.',
    '۲. reels: سه تا پنج تکه بین ۱۵ تا ۶۰ ثانیه که بی بافت هم فهمیده شود و سه ثانیهٔ اولش قلاب دارد. hook یک جملهٔ کوتاه برای روی تصویر، why یک جملهٔ کوتاه.',
    '۳. هیچ خط تیرهٔ بلند یا کوتاه. هیچ وعدهٔ درمانی یا ادعای بالینی که در گفتار نیست.',
    '',
    'عنوان: ' + (title || ''),
    'زیرنویس:', txt].join('\n');
}
function vdGem_(parts, schema) {
  var last = '';
  for (var k = 0; k < VD_MODELS.length * 2; k++) {
    var mdl = VD_MODELS[k % VD_MODELS.length];
    var res = gemFetch_('models/' + mdl + ':generateContent', { contents: [{ role: 'user', parts: parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2, mediaResolution: 'MEDIA_RESOLUTION_LOW' } });
    if (res.code === 200) {
      var t = (((res.body.candidates || [])[0] || {}).content || {}).parts;
      try { var o = JSON.parse((t || []).map(function (p) { return p.text || ''; }).join('')); o._cost = gemCost_(mdl, res.body.usageMetadata, 0); return o; }
      catch (e) { last = mdl + ' JSON'; continue; }
    }
    last = mdl + ' ' + res.code;
    if (res.code === 400) return { _bad: true, _err: last };   /* مثلاً بخش بعد از پایان ویدیو */
    if (res.code === 403) break;
    if (!TG_DRY) Utilities.sleep(5000);
  }
  throw new Error('Gemini: ' + last);
}

/* ─────────────────────────── درایو ─────────────────────────── */
function vdFolder_() {
  var id = vdProp_('VD_DRIVE');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('تجربه · زیرنویس Gemini (پیش‌نویس)');
  vdProp_('VD_DRIVE', f.getId());
  return f;
}
function vdPut_(name, text, fid) {
  if (TG_DRY) { var k = fid || ('drv-' + name); (TG_MEM['vd:drive'] = TG_MEM['vd:drive'] || {})[k] = text; return k; }
  if (fid) { DriveApp.getFileById(fid).setContent(text); return fid; }
  return vdFolder_().createFile(name, text, MimeType.PLAIN_TEXT).getId();
}
function vdGet_(fid) {
  if (TG_DRY) return (TG_MEM['vd:drive'] || {})[fid] || '';
  return DriveApp.getFileById(fid).getBlob().getDataAsString('UTF-8');
}
function vdDriveBlob_(id) {
  if (TG_DRY) return TG_MEM['vd:blob:' + id] || null;
  var f = DriveApp.getFileById(id);
  return { size: f.getSize(), mime: f.getMimeType(), b64: f.getSize() <= VD_DRIVE_MAX ? Utilities.base64Encode(f.getBlob().getBytes()) : '' };
}

/* ─────────────────────────── یک گام برای یک سطر ─────────────────────────── */
function vdId_(rows) {
  var n = 1000;
  rows.forEach(function (r) { var m = String(r['شناسه'] || '').match(/^V-(\d+)$/); if (m) n = Math.max(n, Number(m[1])); });
  return 'V-' + (n + 1);
}
/** خروجی: 'segment' | 'done' | 'perm' | 'skip' */
function vdStep_(row) {
  var src = String(row['نشانی یا فایل درایو'] || '').trim(), yt = vdYt_(src), did = yt ? '' : vdDriveId_(src);
  if (!yt && !did) { vdSet_(row, { 'وضعیت': VD_ST.err, 'یادداشت': 'نشانی یوتیوب یا فایل درایو شناخته نشد' }); return 'skip'; }
  if (did && !vdYes_(row['بی صدای مراجع'])) { vdSet_(row, { 'وضعیت': VD_ST.perm, 'یادداشت': 'برای فایل درایو، ستون «بی صدای مراجع» را تیم تیک بزند' }); return 'perm'; }
  var work = row['فایل کار'] ? JSON.parse(vdGet_(row['فایل کار']) || '{"cues":[]}') : { cues: [] };
  var at = Number(row['پیشرفت (دقیقه)'] || 0) * 60, cost = Number(row['هزینه (دلار)'] || 0), ended = false;
  gemTask_('زیرنویس');
  try {
    if (yt) {
      var o = vdGem_([{ fileData: { fileUri: src }, videoMetadata: { startOffset: at + 's', endOffset: (at + VD_SEG) + 's' } }, { text: vdCuePrompt_(true) }], VD_CUE_SCHEMA);
      if (o._bad && at > 0) ended = true;
      else if (o._bad) throw new Error(o._err);
      else {
        (o.cues || []).forEach(function (c) { work.cues.push({ s: at + Number(c.s), e: at + Number(c.e), t: vdNoDash_(c.t) }); });
        cost += o._cost || 0; ended = !!o.ended;
      }
      at += VD_SEG;
      if (at >= VD_MAX_MIN * 60) ended = true;
    } else {
      var b = vdDriveBlob_(did);
      if (!b || !b.b64) { vdSet_(row, { 'وضعیت': VD_ST.err, 'یادداشت': 'فایل درایو بزرگ‌تر از ۱۸ مگابایت است یا باز نشد' }); return 'skip'; }
      var o2 = vdGem_([{ inlineData: { mimeType: b.mime, data: b.b64 } }, { text: vdCuePrompt_(false) }], VD_CUE_SCHEMA);
      if (o2._bad) throw new Error(o2._err);
      (o2.cues || []).forEach(function (c) { work.cues.push({ s: Number(c.s), e: Number(c.e), t: vdNoDash_(c.t) }); });
      cost += o2._cost || 0; ended = true;
    }
    var name = String(row['شناسه']);
    var wf = vdPut_(name + '-work.json', JSON.stringify(work), row['فایل کار'] || '');
    vdSet_(row, { 'فایل کار': wf, 'پیشرفت (دقیقه)': Math.round(at / 60), 'هزینه (دلار)': Math.round(cost * 10000) / 10000, 'وضعیت': VD_ST.run });
    if (!ended) return 'segment';

    var m = vdGem_([{ text: vdMetaPrompt_(row['عنوان'], work.cues) }], VD_META_SCHEMA);
    if (m._bad) throw new Error(m._err);
    cost += m._cost || 0;
    var ch = (m.chapters || []).sort(function (a, b) { return a.s - b.s; });
    if (ch.length && ch[0].s !== 0) ch[0].s = 0;
    var srt = vdPut_(name + '.srt', vdSrt_(work.cues));
    vdSet_(row, { 'وضعیت': VD_ST.done, 'زیرنویس SRT': srt, 'هزینه (دلار)': Math.round(cost * 10000) / 10000,
      'فصل‌ها': ch.map(function (c) { return vdTs_(c.s) + ' ' + vdNoDash_(c.title); }).join('\n'),
      'پیشنهاد ریلز': (m.reels || []).slice(0, 5).map(function (r, i) { return tgFa_(i + 1) + '. ' + vdTs_(r.s) + ' تا ' + vdTs_(r.e) + ' · ' + vdNoDash_(r.hook) + '\n   ' + vdNoDash_(r.why); }).join('\n'),
      'یادداشت': 'پیش‌نویس؛ پیش از انتشار تیم و یاسر ببینند. ' + tgFa_(work.cues.length) + ' زیرنویس' });
    return 'done';
  } finally { gemTask_(''); }
}

/* ─────────────────────────── از tgWatchdog، ساعتی ─────────────────────────── */
function vdHourly_() {
  if (VD_ON === '0') return 'off';
  var h = Number(Utilities.formatDate(vdNow_(), TG_TZ, 'H'));
  if (h < 1 || h >= 9) return 0;
  var rows = vdRows_(), n = 0;
  rows.forEach(function (r) { if (!String(r['شناسه'] || '').trim() && String(r['نشانی یا فایل درایو'] || '').trim()) vdSet_(r, { 'شناسه': vdId_(rows), 'وضعیت': VD_ST.q }); });
  while (n < VD_PER_RUN) {
    var row = rows.filter(function (r) { return r['وضعیت'] === VD_ST.run; })[0] ||
              rows.filter(function (r) { return (r['وضعیت'] === VD_ST.q || r['وضعیت'] === '') && String(r['نشانی یا فایل درایو'] || '').trim(); })[0];
    if (!row) break;
    var res;
    try { res = vdStep_(row); } catch (e) { vdSet_(row, { 'وضعیت': VD_ST.err, 'یادداشت': String(e.message || e).slice(0, 160) }); tgErr_('vdStep_', e); res = 'err'; }
    n++;
    if (res !== 'segment' && res !== 'done') continue;
  }
  return n;
}

/* ─────────────────────────── تست ─────────────────────────── */
try { TG_SUITES.push(['زیرنویس و فصل‌بندی ویدیو v170.100', 'vdTests']); } catch (eSu) {}

function vdTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM, onK = VD_ON;
  TG_DRY = true; TG_MEM = {}; VD_ON = '1';
  try {
    var g = function (o) { return { code: 200, body: { usageMetadata: { promptTokenCount: 100000, candidatesTokenCount: 4000 }, candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] } }; };
    ok('زمان SRT و یوتیوب (روی کد قبلی مردود)', vdTs_(3725.5, true) === '01:02:05,500' && vdTs_(65) === '01:05' && vdTs_(3725) === '1:02:05');
    ok('یوتیوب و درایو شناخته می‌شوند', vdYt_('https://www.youtube.com/watch?v=abcDEF12345') && vdYt_('https://youtu.be/abcDEF12345') && !vdYt_('https://example.com/x') &&
      vdDriveId_('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view') === '1AbCdEfGhIjKlMnOpQrStUvWxYz012345');   /* pii:ok شناسهٔ ساختگی آزمون */
    TG_MEM['pb:' + VD_TAB] = [
      { 'نشانی یا فایل درایو': 'https://www.youtube.com/watch?v=abcDEF12345', 'عنوان': 'کاناپه: نشست اول' },
      { 'نشانی یا فایل درایو': 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view', 'عنوان': 'ضبط جلسه' }];   /* pii:ok شناسهٔ ساختگی آزمون */
    TG_MEM['vd:now'] = String(pbTehran_(2026, 10, 22, 14, 0).getTime());
    ok('روز: کاری نمی‌کند', vdHourly_() === 0 && !TG_MEM['gem:ledger']);
    TG_MEM['vd:now'] = String(pbTehran_(2026, 10, 22, 2, 0).getTime());
    TG_MEM['gem:fake'] = [g({ ended: false, cues: [{ s: 1, e: 3, t: 'سلام — خوش آمدید' }, { s: 4, e: 7, t: 'امروز دربارهٔ اضطراب حرف می‌زنیم' }] }),
      g({ ended: true, cues: [{ s: 2, e: 5, t: 'پایان' }] }),
      g({ chapters: [{ s: 5, title: 'آغاز' }, { s: 600, title: 'جمع‌بندی — پایان' }], reels: [{ s: 4, e: 40, hook: 'اضطراب از کجا می‌آید؟', why: 'قلاب روشن' }] })];
    var rows = vdRows_();
    var n1 = vdHourly_();
    ok('شب: شناسه و دو تکهٔ ۱۰ دقیقه‌ای در یک اجرا', n1 === 2 && rows[0]['شناسه'] === 'V-1001' && rows[1]['شناسه'] === 'V-1002' && rows[0]['پیشرفت (دقیقه)'] === 20);
    var reqs = TG_MEM['gem:ledger'] || [];
    ok('هزینه با کار «زیرنویس» در دفتر', reqs.length === 3 && reqs.every(function (x) { return x[1] === 'زیرنویس'; }) && rows[0]['هزینه (دلار)'] > 0);
    var srt = (TG_MEM['vd:drive'] || {})[rows[0]['زیرنویس SRT']] || '';
    ok('آخر کار: SRT با زمان کل ویدیو (تکهٔ دوم +۶۰۰ ثانیه)', rows[0]['وضعیت'] === VD_ST.done && /^1\n00:00:01,000 --> 00:00:03,000\n/.test(srt) && srt.indexOf('00:10:02,000 --> 00:10:05,000') > -1);
    vdHourly_();
    ok('فایل درایو بی تیک «بی صدای مراجع» به Gemini نمی‌رود', rows[1]['وضعیت'] === VD_ST.perm && (TG_MEM['gem:ledger'] || []).length === 3);
    ok('فصل‌ها از ۰۰:۰۰ و ریلز با زمان', /^00:00 آغاز\n10:00 /.test(rows[0]['فصل‌ها']) && /00:04 تا 00:40/.test(rows[0]['پیشنهاد ریلز']));
    ok('هیچ خروجی خط تیره ندارد', !/[—–]/.test(srt + rows[0]['فصل‌ها'] + rows[0]['پیشنهاد ریلز']));
    ok('فقط پیش‌نویس: هیچ پیامی به کانال یا کسی نرفت', !TG_OUTBOX.length || !TG_OUTBOX.some(function (x) { return x.kind === 'msg'; }));
    rows[1]['بی صدای مراجع'] = true; rows[1]['وضعیت'] = VD_ST.q;
    TG_MEM['vd:blob:1AbCdEfGhIjKlMnOpQrStUvWxYz012345'] = { size: 1000, mime: 'audio/ogg', b64: 'T2dn' };   /* pii:ok شناسهٔ ساختگی آزمون */
    TG_MEM['gem:fake'] = [g({ ended: true, cues: [{ s: 0, e: 2, t: 'ویس راهبر' }] }), g({ chapters: [{ s: 0, title: 'ویس' }], reels: [] })];
    vdHourly_();
    ok('فایل درایو با تیک: یک‌جا و پیش‌نویس آماده', rows[1]['وضعیت'] === VD_ST.done && /ویس راهبر/.test((TG_MEM['vd:drive'] || {})[rows[1]['زیرنویس SRT']] || ''));
    VD_ON = '0';
    ok('VIDEO_ON = 0 خاموش می‌کند', vdHourly_() === 'off');
    ok('سیم‌کشی واچ‌داگ', String(tgWatchdog).indexOf('vdHourly_') > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; VD_ON = onK; GEM_TASK = '';
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ زیرنویس و فصل‌بندی درست است'));
  return tgTestTally_(log, fail);
}
