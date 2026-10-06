/**
 * intake2.gs · v170.35 · درگاه‌های ورودی، بند ۱ و ۳ (سمت بات) و بند ۲ (کدهای رجیستری)
 *
 * ۱) قرارداد یکسان ورود (از /wp-json/tj/v1/lead سایت، kind:'lead'):
 *    {kind:'lead', line, intent, page, cta, campaign, utm:{source,medium,campaign,content,term}, ref, vid, form,
 *     name, phone, email, msg}  ← همان مسیر handleWebForm_ (لید یا مدرسه)، با منبع «سایت › <خط> › <فرم یا نیت>».
 *    intent:'vote' + city ← رأی شهر (همان tgCvVote_، با همان سقف)؛ لید نمی‌سازد.
 *    فرم فلوئنت قدیمی (بی kind) هم فیلدهای cta، page_url، vid، campaign و utm_* را اگر داشت همین‌طور می‌برد.
 * ۲) ردپا: پنج ستون تازهٔ لید «صفحهٔ ورود»، «دکمه»، «کمپین»، «UTM»، «شناسهٔ بازدید».
 *    - فرم سایت: از همان قرارداد.
 *    - بات: سایت به لینک بات «__<توکن>» می‌چسباند و کلیک را با همان توکن (kind:'click'، tok) می‌فرستد؛ کلیک در «ردپای ورود»
 *      می‌نشیند. /start <کد>__<توکن> توکن را برمی‌دارد، کد را به کد قدیمی (CTA_TO) برمی‌گرداند و ردپا را به همین گفت‌وگو
 *      می‌چسباند (۶ ساعت کش، و برای بعد از آن تب). لید همین گفت‌وگو همان ستون‌ها را می‌گیرد.
 *    - کد start تازهٔ رجیستری (pz-…، rm-…) پیش از همهٔ مسیرها به کد قدیمی برمی‌گردد؛ کد قدیمی هم همچنان کار می‌کند.
 * ۳) فهرست پارتنرها و شهرهای رأی با camp-push به سایت می‌رود (سرور ایران به googleusercontent نمی‌رسد)، تا مرورگر دیگر
 *    مستقیم به Apps Script نزند. کلید ITK_TRACK = «بله» توکن‌گذاری لینک بات را در سایت روشن می‌کند (پیش‌فرض خاموش).
 */
var ITK2_COLS = ['صفحهٔ ورود', 'دکمه', 'کمپین', 'UTM', 'شناسهٔ بازدید'];
var ITK2_TAB = 'ردپای ورود';
var ITK2_HEAD = ['زمان', 'توکن', 'شناسهٔ بازدید', 'دکمه', 'کد', 'صفحه', 'کمپین', 'UTM', 'chat'];
var ITK2_LINES = { 'پذیرش': 'پذیرش', 'مدرسه': 'مدرسه', 'روان‌پزشکی': 'روانپزشکی', 'سازمانی': 'سازمانی', 'رودمپ': 'رودمپ', 'کمپین': 'کمپین', 'همکاری': 'همکاری' };
var ITK2_TOK_RX = /^(.*?)__([a-z0-9]{6,12})$/;
var ITK_CTX = null;   /* درخواست جاری فرم سایت */
cfg_('ITK_TRACK', '');   /* «بله»: سایت توکن ردپا را به لینک‌های بات می‌چسباند */

function itk2Dry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function itk2S_(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n || 120); }
function itk2Utm_(u) {
  if (!u) return '';
  if (typeof u === 'string') return itk2S_(u, 200);
  return ['source', 'medium', 'campaign', 'content', 'term'].map(function (k) { return u[k] ? k + '=' + itk2S_(u[k], 40) : ''; }).filter(String).join('&');
}
/** زمینهٔ ردپا از بدنهٔ قرارداد یا فرم قدیمی */
function itk2CtxOf_(b) {
  b = b || {};
  var utm = b.utm || (b.utm_source || b.utm_campaign ? { source: b.utm_source, medium: b.utm_medium, campaign: b.utm_campaign, content: b.utm_content, term: b.utm_term } : null);
  var c = { page: itk2S_(b.page || b.page_url || b.source_page, 200), cta: itk2S_(b.cta, 60), campaign: itk2S_(b.campaign, 40), utm: itk2Utm_(utm), vid: itk2S_(b.vid, 40) };
  return (c.page || c.cta || c.campaign || c.utm || c.vid) ? c : null;
}
function itk2Extra_(c) {
  var x = {}; if (!c) return x;
  if (c.page) x['صفحهٔ ورود'] = c.page; if (c.cta) x['دکمه'] = c.cta; if (c.campaign) x['کمپین'] = c.campaign; if (c.utm) x['UTM'] = c.utm; if (c.vid) x['شناسهٔ بازدید'] = c.vid;
  return x;
}
/** از tgAppendLead_: ردپای فرم جاری یا ردپای همین گفت‌وگو (از /start) به ستون‌های لید */
function itk2Merge_(o) {
  try {
    var c = ITK_CTX;
    if (!c) { var m = String(o.note || '').match(/chat_id: (\d+)/); if (m) c = itk2ChatCtx_(m[1]); }
    if (!c) return o;
    o.extra = o.extra || {};
    var x = itk2Extra_(c); Object.keys(x).forEach(function (k) { if (!o.extra[k]) o.extra[k] = x[k]; });
  } catch (e) { tgErr_('itk2Merge_', e); }
  return o;
}

/* ───── ورود از قرارداد سایت ───── */
function itk2LeadIn_(body) {
  var line = ITK2_LINES[String(body.line || '').trim()] || 'پذیرش', intent = itk2S_(body.intent, 40);
  if (intent === 'vote') {
    if (typeof tgCvRate_ === 'function' && !tgCvRate_()) return { ok: false, error: 'rate' };
    return typeof tgCvVote_ === 'function' ? tgCvVote_(itk2S_(body.city, 40)) : { ok: false };
  }
  var label = itk2S_(body.form, 60) || intent || 'فرم';
  var src = line === 'کمپین' ? 'کمپین › ' + (itk2S_(body.campaign, 20) || 'نامعلوم') + ' › ' + label : 'سایت › ' + line + ' › ' + label;
  var flat = { source: src, form_title: label, name: itk2S_(body.name, 80), phone: itk2S_(body.phone, 30), email: itk2S_(body.email, 80), note: itk2S_(body.msg, 1500), source_page: itk2S_(body.page, 200) };
  ITK_CTX = itk2CtxOf_(body);
  try { handleWebForm_(flat); } finally { ITK_CTX = null; }
  return { ok: true };
}

/* ───── کلیک با توکن (ردپای ورود) ───── */
function itk2Click_(body) {
  var tok = itk2S_(body.tok, 12);
  if (!/^[a-z0-9]{6,12}$/.test(tok)) return false;
  var c = itk2CtxOf_(body) || {};
  var row = [new Date(), tok, c.vid || '', c.cta || '', itk2S_(body.code, 64), c.page || '', c.campaign || '', c.utm || '', ''];
  if (itk2Dry_()) { (TG_MEM['itk2:tab'] = TG_MEM['itk2:tab'] || []).push(row); return true; }
  try {
    var ss = tgSS_(), sh = ss.getSheetByName(ITK2_TAB);
    if (!sh) { sh = ss.insertSheet(ITK2_TAB); sh.setRightToLeft(true); sh.appendRow(ITK2_HEAD); sh.getRange(1, 1, 1, ITK2_HEAD.length).setFontWeight('bold'); }
    sh.appendRow(row);
    CacheService.getScriptCache().put('itkt:' + tok, JSON.stringify(c), 21600);
  } catch (e) { tgErr_('itk2Click_', e); }
  return true;
}
function itk2Tok_(tok) {
  if (itk2Dry_()) { var r = (TG_MEM['itk2:tab'] || []).filter(function (x) { return x[1] === tok; })[0]; return r ? { vid: r[2], cta: r[3], page: r[5], campaign: r[6], utm: r[7] } : null; }
  var hit = CacheService.getScriptCache().get('itkt:' + tok); if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  try {
    var sh = tgSS_().getSheetByName(ITK2_TAB); if (!sh) return null;
    var f = sh.createTextFinder(tok).matchEntireCell(true).findNext(); if (!f) return null;
    var v = sh.getRange(f.getRow(), 1, 1, ITK2_HEAD.length).getValues()[0];
    return { vid: String(v[2]), cta: String(v[3]), page: String(v[5]), campaign: String(v[6]), utm: String(v[7]) };
  } catch (e2) { return null; }
}
function itk2ChatCtx_(chat) {
  if (itk2Dry_()) return (TG_MEM['itk2:chat'] || {})[chat] || null;
  var h = CacheService.getScriptCache().get('itkc:' + chat); if (!h) return null;
  try { return JSON.parse(h); } catch (e) { return null; }
}

/* ───── /start: توکن و کد رجیستری ───── */
/** پیش از همهٔ مسیرهای tgPrivate_: m.text را به «/start <کد قدیمی>» برمی‌گرداند */
function itk2Start_(m, chat) {
  var mm = /^\/start(@\w+)?\s+(\S+)\s*$/.exec(String((m && m.text) || '')); if (!mm) return;
  var arg = mm[2], t = ITK2_TOK_RX.exec(arg), tok = '';
  if (t) { arg = t[1]; tok = t[2]; }
  var to = (typeof CTA_TO !== 'undefined' && CTA_TO[arg]) ? CTA_TO[arg] : arg;
  if (tok) {
    var c = itk2Tok_(tok) || {};
    c.code = arg;
    if (itk2Dry_()) { (TG_MEM['itk2:chat'] = TG_MEM['itk2:chat'] || {})[String(chat)] = c; }
    else {
      try { CacheService.getScriptCache().put('itkc:' + chat, JSON.stringify(c), 21600); } catch (e) {}
      try { var sh = tgSS_().getSheetByName(ITK2_TAB); if (sh) { var f = sh.createTextFinder(tok).matchEntireCell(true).findNext(); if (f) sh.getRange(f.getRow(), 9).setValue(String(chat)); } } catch (e2) {}
    }
  }
  if (/^\/[a-z]+$/.test(to)) { m.text = to; return; }   /* کد رجیستری با دستور بات (مثل pz-reception ← /human) */
  if (to !== mm[2]) m.text = '/start ' + to;
}
/** برچسب کد از رجیستری (برای «کدهای start» و منبع) */
function itk2Label_(code) {
  if (typeof CTA_LABEL !== 'undefined' && CTA_LABEL[code]) return CTA_LABEL[code];
  if (typeof CTA_FAMILY !== 'undefined') for (var i = 0; i < CTA_FAMILY.length; i++) if (code.indexOf(CTA_FAMILY[i][0]) === 0) return CTA_FAMILY[i][1];
  return '';
}

/* ───── camp-push: فهرست پارتنرها، شهرهای رأی و کلید ردپا ───── */
function itk2Push_() {
  var o = {};
  try { if (typeof tgApiPartners_ === 'function') { var p = tgApiPartners_({}); if (p && p.ok !== false) o.partners = p; } } catch (e) { tgErr_('itk2Push_ partners', e); }
  try { if (typeof tgCvList_ === 'function') o.cities = tgCvList_(); } catch (e2) { tgErr_('itk2Push_ cities', e2); }
  o.track = String(cfg_('ITK_TRACK', '') || '').trim() === 'بله' ? 1 : 0;
  return o;
}

/* یک‌بارهٔ خودکار v170.35: برچسب کدهای تازهٔ رجیستری در «کدهای start» (فقط ردیف‌های نبوده؛ هیچ ردیفی پاک نمی‌شود). فقط شمار. */
function tgV17035Intake() {
  if (typeof CTA_LABEL === 'undefined') return 'رجیستری نیست';
  var have = {};
  try { pbRows_('e', PB_T_START, PB_START_HEAD, []).forEach(function (r) { have[String(r['کد'] || '').trim()] = 1; }); } catch (e) {}
  var add = Object.keys(CTA_LABEL).filter(function (k) { return !have[k] && CTA_LABEL[k]; });
  if (add.length) {
    try { pbAddMany_('e', PB_T_START, PB_START_HEAD, add.map(function (k) { return { 'کد': k, 'برچسب': CTA_LABEL[k] }; })); } catch (e2) { tgErr_('tgV17035Intake', e2); }
  }
  return '«کدهای start»: ' + add.length + ' ردیف تازه از رجیستری';
}

function itk2Tests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = {};
  try {
    /* قرارداد سایت ← لید با منبع و ستون‌های ردپا */
    itk2LeadIn_({ kind: 'lead', line: 'پذیرش', intent: 'start', form: 'فرم شروع تراپی', page: '/get-therapy/', cta: 'gt.form.main', utm: { source: 'ig', campaign: 'c4' }, vid: 'v1a2b3', name: 'نمونه', phone: '0' });
    var L = TG_OUTBOX.filter(function (x) { return x.kind === 'lead'; })[0];
    ok('قرارداد ← لید با منبع «سایت › پذیرش › …»', L && L.o.source === 'سایت › پذیرش › فرم شروع تراپی', JSON.stringify(L && L.o.source));
    ok('ستون‌های ردپا روی لید', L && L.o.extra['دکمه'] === 'gt.form.main' && L.o.extra['UTM'] === 'source=ig&campaign=c4' && L.o.extra['شناسهٔ بازدید'] === 'v1a2b3' && L.o.extra['صفحهٔ ورود'] === '/get-therapy/');
    ok('زمینهٔ فرم بعد از ثبت پاک می‌شود', ITK_CTX === null);
    TG_OUTBOX = [];
    itk2LeadIn_({ kind: 'lead', line: 'کمپین', campaign: 'C-004', intent: 'join', name: 'نمونه', phone: '0' });
    L = TG_OUTBOX.filter(function (x) { return x.kind === 'lead'; })[0];
    ok('کمپین ← منبع «کمپین › C-004 › join»', L && /^کمپین › C-004 › join/.test(L.o.source), JSON.stringify(L && L.o.source));
    /* کلیک با توکن و /start */
    ok('توکن نامعتبر رد', itk2Click_({ tok: 'A!' }) === false);
    itk2Click_({ tok: 'ab12cd34', vid: 'v9', cta: 'home.hero.start', code: 'pz-home-hero', page: '/' });
    var m = { text: '/start pz-abroad-de__ab12cd34' };
    itk2Start_(m, '777');
    ok('کد رجیستری به کد قدیمی و توکن جدا', m.text === '/start pt_de', m.text);
    ok('ردپای کلیک به همین گفت‌وگو', (TG_MEM['itk2:chat'] || {})['777'] && TG_MEM['itk2:chat']['777'].cta === 'home.hero.start' && TG_MEM['itk2:chat']['777'].code === 'pz-abroad-de');
    var o = itk2Merge_({ note: 'chat_id: 777 · x', extra: {} });
    ok('لید بات همان ردپا را می‌گیرد', o.extra['دکمه'] === 'home.hero.start' && o.extra['شناسهٔ بازدید'] === 'v9');
    var m2 = { text: '/start pt_de' }; itk2Start_(m2, '778');
    ok('کد قدیمی دست نمی‌خورد', m2.text === '/start pt_de');
    var m3 = { text: '/start pz-reception' }; itk2Start_(m3, '779');
    ok('گفت‌وگو با پذیرش ← /human', m3.text === '/human', m3.text);
    ok('برچسب از رجیستری و خانواده', itk2Label_('pt_de') !== '' && itk2Label_('mg-12-t') === 'مجله › مقاله');
    ok('push: کلید ردپا پیش‌فرض خاموش', itk2Push_().track === 0);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; ITK_CTX = null; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'itk2Tests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['درگاه‌های ورودی: قرارداد و ردپا (v170.35)', 'itk2Tests']); } catch (eItk2) {}
