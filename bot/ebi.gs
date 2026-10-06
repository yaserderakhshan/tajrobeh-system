/* ============================================================================
   ebi.gs · کمپین «پلی‌لیستِ ابی» (کد C-004، ۱۳ مهر تا ۱۲ آبان ۱۴۰۵؛ تصمیم یاسر، ۱۳ مهر ۱۴۰۵)
   سیستم موازی نیست: درگاه انتشار (publish.gs)، جمنای (gemini_setup.gs)، سیاست پیام و صف (tgNotify_) و موتور رویداد.

   v170.15 · اکشن «ebi_check» در درگاه:
   - ورودی {text}: یک مورد فهرست عمومی و بی‌نام کمپین (دادهٔ مراجع نیست).
   - خروجی {verdict: ok|review, reason}. ok فقط برای «چیز درخشان» کوتاه، مهربان و بی‌خطر.
   - جمنای خطا داد، در دسترس نبود یا سقف روز پر بود ← review (هرگز ok بی‌سنجش).
   - سقف روزانهٔ جدا (`ebi_daily_cap` در «تنظیمات انتشار»، پیش‌فرض ۳۰۰) تا سهمیهٔ سئو (`gem_daily_cap`) مصرف نشود؛
     سقف ساعتی جدا در درگاه (`ebi_hourly_max`، پیش‌فرض ۱۲۰) تا سقف ۳۰ فراخوانی بقیهٔ اکشن‌ها پر نشود.
   - شمار و توکن هر روز در Script Properties (EBI_GEM:<روز>، EBI_TOK:<روز>) و در `status`.
   ============================================================================ */

var EBI_CODE = 'C-004';
var EBI_GEM_MODEL = 'gemini-flash-latest';
var EBI_TEXT_MAX = 600;
var EBI_CHECK_SCHEMA = {
  type: 'OBJECT',
  properties: { verdict: { type: 'STRING', enum: ['ok', 'review'] }, reason: { type: 'STRING' } },
  required: ['verdict', 'reason']
};

function ebiCheckPrompt_(text) {
  return [
    'تو بازبین فهرست عمومی کمپین «پلی‌لیستِ ابی» در مرکز تجربه زندگی هستی.',
    'مردم بی‌نام یک «چیز درخشان» کوتاه می‌نویسند: چیزی کوچک که زندگی را قابل‌تحمل‌تر یا روشن‌تر می‌کند. متن روی سایت عمومی منتشر می‌شود.',
    'خروجی فقط JSON طبق اسکیما.',
    'verdict = "ok" فقط وقتی متن کوتاه، مهربان و بی‌خطر است.',
    'verdict = "review" اگر هر کدام از این‌ها هست:',
    '- نام یک آدم واقعی و خصوصی، یا اطلاعات تماس (شماره، ایمیل، آیدی، لینک، آدرس). نام هنرمند یا اثر شناخته‌شده اشکالی ندارد.',
    '- هر نشانه‌ای از حال بد، ناامیدی، آسیب به خود یا دیگری.',
    '- توهین، نفرت یا تحقیر.',
    '- محتوای جنسی.',
    '- تبلیغ یا فروش.',
    '- سیاست.',
    '- هر تردیدی.',
    'reason: یک جملهٔ کوتاه فارسی، بی خط تیره.',
    '',
    'متن:',
    '«' + String(text).replace(/[«»]/g, '"') + '»'
  ].join('\n');
}

function ebiDayKey_() { return pbDay_(pbNow_()); }
function ebiUsed_() { return Number(pbProp_('EBI_GEM:' + ebiDayKey_()) || 0); }
function ebiCap_() { return pbCfgN_('ebi_daily_cap', 300); }
function ebiUse_(ok, err, usage) {
  var d = ebiDayKey_();
  pbProp_('EBI_GEM:' + d, String(ebiUsed_() + 1));
  if (usage) {
    var t = {}; try { t = JSON.parse(pbProp_('EBI_TOK:' + d) || '{}') || {}; } catch (e) { t = {}; }
    t.in = (Number(t.in) || 0) + (Number(usage.promptTokenCount) || 0);
    t.out = (Number(t.out) || 0) + (Number(usage.candidatesTokenCount) || 0) + (Number(usage.thoughtsTokenCount) || 0);
    pbProp_('EBI_TOK:' + d, JSON.stringify(t));
  }
  if (!ok) pbProp_('PB_GEM_ERR', pbFmt_(pbNow_()) + ' · ebi_check · ' + tgSecretMask_(String(err || '')).slice(0, 120));
}
function ebiTok_() { try { return JSON.parse(pbProp_('EBI_TOK:' + ebiDayKey_()) || '{}') || {}; } catch (e) { return {}; } }

/* یک فراخوانی جمنای با اسکیما؛ {o, usage} یا خطا */
function ebiGem_(text) {
  if (TG_DRY) {
    if (TG_MEM['ebi:gemerr']) throw new Error(TG_MEM['ebi:gemerr']);
    return { o: TG_MEM['ebi:gem'] || { verdict: 'ok', reason: 'نمونه' }, usage: { promptTokenCount: 200, candidatesTokenCount: 20 } };
  }
  var res = gemFetch_('models/' + EBI_GEM_MODEL + ':generateContent', {
    contents: [{ role: 'user', parts: [{ text: ebiCheckPrompt_(text) }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: EBI_CHECK_SCHEMA, temperature: 0 }
  });
  if (res.code !== 200) throw new Error('HTTP ' + res.code);
  var parts = (((res.body.candidates || [])[0] || {}).content || {}).parts || [];
  return { o: JSON.parse(parts.map(function (p) { return p.text || ''; }).join('')), usage: res.body.usageMetadata || null };
}

/* v170.17.1: سرور سایت (ایران) پاسخ Apps Script را از script.googleusercontent.com نمی‌تواند بخواند؛ فقط می‌داند درخواست رسید (۳۰۲).
   پس اگر id آمده، بات خودش حکم را به سایت می‌فرستد (POST /tj/v1/ebi-verdict با کلید دوم؛ بات به سایت می‌رسد).
   ok یعنی انتشار؛ review یعنی همان پیام تأیید برای راهبران (اسنیپت 506031). */
function ebiCheck_(p, dry) {
  var r = ebiCheckRun_(p, dry);
  var id = Number(p && p.id);
  if (!dry && r.ok && r.data && r.data.verdict && id > 0 && Math.floor(id) === id) {
    var w = ebiWp_('POST', 'ebi-verdict', { id: id, verdict: r.data.verdict, reason: r.data.reason || '' });
    r.data.pushed = !!(w && w.ok);
  }
  return r;
}
function ebiCheckRun_(p, dry) {
  var text = String((p && p.text) || '').trim();
  if (!text) return { ok: false, error: 'text لازم است' };
  if (text.length > EBI_TEXT_MAX) return { ok: true, data: { verdict: 'review', reason: 'متن بلندتر از اندازهٔ فهرست است.' } };
  if (dry) return { ok: true, data: { would: 'gemini', model: EBI_GEM_MODEL, chars: text.length, used_today: ebiUsed_(), cap: ebiCap_() } };
  if (ebiUsed_() >= ebiCap_()) return { ok: true, data: { verdict: 'review', reason: 'سقف روزانهٔ بررسی خودکار پر است.' } };
  var r;
  try { r = ebiGem_(text); }
  catch (e) { ebiUse_(false, e && e.message || e, null); return { ok: true, data: { verdict: 'review', reason: 'جمنای در دسترس نبود.' } }; }
  ebiUse_(true, '', r.usage);
  var v = r.o && r.o.verdict === 'ok' ? 'ok' : 'review';
  var why = String((r.o && r.o.reason) || '').replace(/[—–]/g, '،').trim().slice(0, 200) || (v === 'ok' ? 'مناسب فهرست.' : 'بازبینی دستی.');
  return { ok: true, data: { verdict: v, reason: why } };
}

/* ثبت در درگاه (publish.gs پیش از این فایل بار می‌شود) */
try {
  PB_ACTIONS.ebi_check = function (p, dry) { return ebiCheck_(p, dry); };
  PB_RATE_BUCKET.ebi_check = ['ebi', 'ebi_hourly_max', 120];
  if (PB_WRITE.indexOf('ebi_check') < 0) PB_WRITE.push('ebi_check');   /* dry_run را می‌پذیرد */
  /* v170.16.3: فهرست راهبران برای setcfg اسنیپت ابی (گردش کار site-ebi-setcfg). فقط با کلید دوم درگاه؛ گردش کار مقدارها را می‌پوشاند و جایی نمی‌نویسد */
  PB_ACTIONS.ebi_mods = function (p) { return ebiMods_(p); };
  PB_RATE_BUCKET.ebi_mods = ['ebim', 'ebi_mods_hourly_max', 10];
} catch (eEbiReg) {}

/* ============================================================================
   v170.16 · کدهای start، اتصال به فهرست سایت، ویس درمانگران، تب آینه، کلید راهبران
   - راهبران کمپین از کلید «راهبران C-004» در «تنظیمات خصوصی بات» (آرایهٔ chat_id). هیچ chat_id در کد نیست.
     همهٔ پیام‌ها به هر دو می‌رود و تأیید هر کدام کافی است. در متن‌ها «راهبر کمپین»، نه نام.
   - ebi<id>-<6hex>: اتصال chat به ثبت‌نام سایت (POST /tj/v1/ebi-people) و خوش‌آمد بر اساس نوع.
   - ebi-night|student|therapist|crisis|community|bereaved: نام و شماره (دکمهٔ اشتراک)، POST /ebi-join (src=bot)، اتصال، خوش‌آمد.
     شماره فقط به سایت می‌رود؛ در هاب و بات نمی‌ماند.
   - ebi-list: خوش‌آمد همراهان فهرست، برچسب «همراه کمپین ابی» در «کاربران بات»، نوشتن یک مورد (POST /ebi-list) و سه مورد آخر.
   - ebi-voice: ویس یا متن تجربهٔ درمانگر در تب «پلی‌لیست ابی · ویس‌ها»، فایل در پوشهٔ درایو کمپین (فقط تیم)، دو دکمهٔ اجازه، و برای راهبران.
   - تب آینهٔ «پلی‌لیست ابی · ثبت‌نام‌ها» در هاب پذیرش (بی شماره): روزی یک بار و با هر اتصال تازه از GET /ebi-people.
   - منبع لیدی که بعد از ورود با این کدها ساخته شود: «کمپین › C-004 › <نوع>».
   - بعد از تاریخ «پایان C-004» (تنظیمات)، همهٔ کدهای ebi پیام «کمپین تمام شد» و دکمهٔ منوی اصلی می‌دهند.
   ============================================================================ */
var EBI_SITE = 'https://tajrobeh.life/wp-json/tj/v1/';
var EBI_KIND = { night: 'شب اجرای تجربه', student: 'دانشجو', therapist: 'درمانگر و روانپزشک', crisis: 'کادر بحران و اورژانس',
  bereaved: 'بازماندهٔ سوگ', community: 'کامیونیتی تجربه', follow: 'همراه فهرست' };
var EBI_JOIN_KINDS = ['night', 'student', 'therapist', 'crisis', 'community', 'bereaved'];
var EBI_WELCOME = {
  night: 'اسم شما در فهرست شب‌های تجربه ثبت شد ✓ تاریخ‌ها که اعلام شد همین‌جا خبرتان می‌کنیم.',
  student: 'اسم شما در فهرست دانشجویان کمپین ثبت شد ✓ خبرهای کمپین همین‌جا به شما می‌رسد.',
  therapist: 'ثبت شد ✓ از همراهی‌تان ممنونیم. اگر دوست دارید تجربه یا تحلیلتان از نمایش را بفرستید، دکمهٔ زیر را بزنید.',
  crisis: 'ثبت شد ✓ از همراهی‌تان ممنونیم. راهبر کمپین برای هماهنگی خبرتان می‌کند.',
  bereaved: 'ثبت شد ✓ ممنون که به ما اعتماد کردید. خبرهای کمپین همین‌جا به شما می‌رسد.',
  community: 'ثبت شد ✓ به کامیونیتی تجربه خوش آمدید. خبرهای کمپین همین‌جا به شما می‌رسد.',
  follow: 'ثبت شد ✓ همراه فهرست شدید.'
};
var EBI_CFG_LEADS = 'راهبران C-004', EBI_CFG_END = 'پایان C-004', EBI_CFG_DRIVE = 'پوشهٔ درایو C-004';   /* v170.19: «چک‌لیست شب C-004» برداشته شد (یادآور ساعت ۲۱ لازم نیست) */
var EBI_VOICE_TAB = 'پلی‌لیست ابی · ویس‌ها';
var EBI_VOICE_HEAD = ['زمان', 'نام', 'نقش', 'لینک فایل', 'اجازهٔ انتشار', 'متن', 'chat_id', 'کد'];
var EBI_PERM = { y: 'اجازه می‌دهم در مجله و کانال بیاید', n: 'فقط برای تیم', w: 'هنوز نپرسیده' };
var EBI_MIRROR_TAB = 'پلی‌لیست ابی · ثبت‌نام‌ها';
var EBI_MIRROR_HEAD = ['زمان', 'نوع', 'منبع', 'نام', 'وصل به بات'];
var EBI_USER_LABEL = 'همراه کمپین ابی';
var EBI_FIXED_CODES = ['ebi-night', 'ebi-student', 'ebi-therapist', 'ebi-crisis', 'ebi-community', 'ebi-bereaved', 'ebi-list', 'ebi-voice'];

/* کلیدهای تنظیمات: سر بارگذاری ثبت می‌شوند تا cfgSync_ ردیف تب را بپذیرد؛ اختیاری‌اند تا خالی بودنشان انتشار را نگه ندارد */
try {
  cfg_(EBI_CFG_LEADS, []); cfg_(EBI_CFG_END, ''); cfg_(EBI_CFG_DRIVE, '');
  [EBI_CFG_LEADS, EBI_CFG_END, EBI_CFG_DRIVE].forEach(function (k) { if (CFG_OPTIONAL.indexOf(k) < 0) CFG_OPTIONAL.push(k); });
  CFG_NOTE[EBI_CFG_LEADS] = 'chat_id راهبران کمپین پلی‌لیست ابی (JSON، مثل ["…","…"])';
  CFG_NOTE[EBI_CFG_END] = 'آخرین روز کمپین C-004 (شمسی یا میلادی، مثل 1405-08-12)';
  CFG_NOTE[EBI_CFG_DRIVE] = 'شناسهٔ پوشهٔ درایو کمپین برای ویس‌ها (اختیاری؛ خالی = پوشهٔ خود بات)';
} catch (eEbiCfg) {}

function ebiKey2Ok_(given) {
  var k2 = TG_DRY ? TG_MEM['pb:key2'] : pbProps_().getProperty(PB_KEY2_PROP);
  given = String(given || '');
  if (!k2 || given.length < 20) return false;
  var a = pbSha_(given), b = pbSha_(k2), d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function ebiMods_(p) {
  if (!ebiKey2Ok_(p && p.key)) return { ok: false, error: 'key2_only' };
  var m = ebiLeads_();
  return m.length ? { ok: true, data: { mods: m, n: m.length } } : { ok: false, error: 'no_leads' };
}
function ebiLeads_() {
  var v = cfg_(EBI_CFG_LEADS, []);
  if (!Array.isArray(v)) v = String(v || '').split(/[\s,،;]+/);
  var out = [];
  v.forEach(function (x) { var c = String(x == null ? '' : x).replace(/[^\d-]/g, ''); if (c && out.indexOf(c) < 0) out.push(c); });
  return out;
}
function ebiIsLead_(chat) { return ebiLeads_().indexOf(String(chat)) > -1; }
function ebiEndIso_() { var v = cfg_(EBI_CFG_END, ''); return v ? v17013OfIso_(v) : ''; }
function ebiEnded_() {
  var end = ebiEndIso_(); if (!end) return false;
  var today = TG_DRY && TG_MEM['ebi:today'] ? TG_MEM['ebi:today'] : Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  return today > end;
}
function ebiTellLeads_(text, kb, kind) {
  var n = 0;
  ebiLeads_().forEach(function (c) { var r = tgNotify_(c, kind || TG_NK.task, text, { ref: EBI_CODE, markup: kb || null }); if (r === 'رفت' || r === 'صف') n++; });
  return n;
}
function ebiHomeKb_(extra) { return { inline_keyboard: (extra || []).concat([[{ text: '🏠 منوی اصلی', callback_data: 'ebi:home' }]]) }; }

/* ---------- سایت ---------- */
/* v170.16.1: کلید دوم درگاه (BOT_API_KEY)، همان که setcfg اسنیپت ابی دارد؛ تا نیامده کلید اول */
function ebiKey_() { return TG_DRY ? 'tjk_dry' : (pbProps_().getProperty(PB_KEY2_PROP) || pbProps_().getProperty(PB_KEY_PROP) || ''); }
function ebiWp_(method, path, body) {
  if (TG_DRY) {
    TG_OUTBOX.push({ kind: 'ebiwp', method: method, path: path, body: body || null });
    var f = TG_MEM['ebi:wp']; return f ? f(method, path, body) : { ok: false, error: 'dry' };
  }
  try {
    var opt = { method: String(method).toLowerCase(), muteHttpExceptions: true, followRedirects: true, headers: { 'X-TJ-Key': ebiKey_() } };
    if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
    var r = UrlFetchApp.fetch(EBI_SITE + path, opt), code = r.getResponseCode(), j;
    try { j = JSON.parse(r.getContentText()); } catch (e) { j = { ok: false, error: 'bad_json' }; }
    if (!j || typeof j !== 'object') j = { ok: false, error: 'bad_json' };
    if (code >= 400 && j.ok !== false) j.ok = false;
    j._code = code;
    return j;
  } catch (e) { tgErr_('ebiWp_ ' + path, e); return { ok: false, error: 'http' }; }
}

/* ---------- برچسب کد شروع و منبع لید ---------- */
function ebiStartLabel_(code) {
  var c = String(code || '');
  if (/^ebi\d+-[a-f0-9]{6}$/.test(c)) return 'کمپین › ' + EBI_CODE + ' › اتصال ثبت‌نام سایت';
  var m = c.match(/^ebi-(\w+)$/);
  if (m && (EBI_KIND[m[1]] || m[1] === 'list' || m[1] === 'voice')) return 'کمپین › ' + EBI_CODE + ' › ' + m[1];
  return '';
}
function ebiLeadPrefill_(o) {
  try {
    var mm = String(o.note || '').match(/chat_id: (\d+)/); if (!mm) return o;
    var kind = tgGetVal_('ebisrc', mm[1]); if (!kind) return o;
    var src = String(o.source || '');
    if (!src || src === 'Telegram bot' || src === 'Telegram mini app') o.source = 'کمپین › ' + EBI_CODE + ' › ' + kind;
    o.note = String(o.note || '') + ' · کمپین ' + EBI_CODE;
  } catch (e) { tgErr_('ebiLeadPrefill_', e); }
  return o;
}

/* ---------- مسیر پیام خصوصی (tgPrivate_، پیش از tgOnPhone_ و کلیدواژه‌ها؛ دام ۹ و ۱۲) ---------- */
function ebiRoute_(m, chat, name, uname) {
  var text = String(m.text || '').trim();
  var arg = /^\/start(@\w+)?\s+ebi/.test(text) ? text.replace(/^\/start(@\w+)?\s+/, '').trim() : '';
  if (arg) return ebiStart_(chat, arg, name, uname);
  if (text === '/ebi' && ebiIsLead_(chat) && typeof ebiDesk_ === 'function') { ebiDesk_(chat); return true; }
  var j = tgGetVal_('ebij', chat);
  if (j && ebiJoinInput_(chat, m, j, name)) return true;
  if (tgGetVal_('ebil', chat) && text && ebiListInput_(chat, text)) return true;
  if (tgGetVal_('ebiv', chat) === 'w' && ebiVoiceInput_(chat, m, name, uname)) return true;
  if (typeof ebiNightInput_ === 'function' && tgGetVal_('ebin', chat) && ebiNightInput_(chat, m)) return true;
  return false;
}
function ebiStart_(chat, arg, name, uname) {
  try { tgLogStart_(arg, chat); } catch (e) {}
  if (ebiEnded_()) { tgSend_(chat, 'کمپین «پلی‌لیستِ ابی» تمام شد. ممنون از همراهی‌تان.', ebiHomeKb_()); return true; }
  var m = arg.match(/^ebi(\d+)-([a-f0-9]{6})$/);
  if (m) return ebiLink_(chat, arg, true);
  var k = (arg.match(/^ebi-(\w+)$/) || [])[1] || '';
  if (EBI_JOIN_KINDS.indexOf(k) > -1) {
    tgSetVal_('ebisrc', chat, k);
    tgSetVal_('ebij', chat, k + '|n');
    tgSend_(chat, '🎶 <b>پلی‌لیستِ ابی</b> · ' + tgEsc_(EBI_KIND[k]) + '\n\nنام و نام خانوادگی‌تان را بنویسید.', { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'ebi:x' }]] });
    return true;
  }
  if (k === 'list') { tgSetVal_('ebisrc', chat, 'follow'); ebiUserLabel_(chat, name, uname); ebiListHome_(chat, true); return true; }
  if (k === 'voice') { tgSetVal_('ebisrc', chat, 'therapist'); ebiVoiceAsk_(chat); return true; }
  return false;   /* کد ناشناخته: مسیر عادی بات */
}

/* اتصال chat به ثبت‌نام سایت و خوش‌آمد بر اساس نوع */
function ebiLink_(chat, code, fromStart) {
  var r = ebiWp_('POST', 'ebi-people', { start: code, chat_id: String(chat) });
  if (!r || !r.ok) {
    if (fromStart) tgSend_(chat, r && (r.error === 'bad_sig' || r.error === 'bad_code') ? 'این لینک معتبر نیست. لینک را از همان صفحهٔ ثبت‌نام دوباره باز کنید.' : 'الان به فهرست سایت وصل نشدیم. چند دقیقهٔ دیگر همین لینک را دوباره باز کنید.', ebiHomeKb_());
    if (!r || (r.error !== 'bad_sig' && r.error !== 'bad_code')) tgErr_('ebiLink_', (r && r.error) || 'no response', EBI_CODE);
    return true;
  }
  var kind = EBI_KIND[r.kind] ? r.kind : 'follow';
  tgSetVal_('ebisrc', chat, kind);
  ebiWelcome_(chat, kind);
  try { ebiMirror_(); } catch (e) { tgErr_('ebiMirror_ link', e); }
  return true;
}
function ebiWelcome_(chat, kind) {
  tgSend_(chat, '🎶 ' + (EBI_WELCOME[kind] || EBI_WELCOME.follow), tgMenu_());
  var rows = [[{ text: '✍️ نوشتن یک چیز درخشان', callback_data: 'ebi:l:w' }]];
  if (kind === 'therapist') rows.unshift([{ text: '🎙 فرستادن تجربه یا تحلیل', callback_data: 'ebi:v:go' }]);
  tgSend_(chat, 'همراه «پلی‌لیستِ ابی» هم باشید:', ebiHomeKb_(rows));
}

/* ---------- ثبت‌نام از بات: نام ← شماره ← سایت ← اتصال ---------- */
function ebiPhoneKb_() { return { keyboard: [[{ text: '📞 فرستادن شمارهٔ من', request_contact: true }], [{ text: '↩️ انصراف' }]], resize_keyboard: true, one_time_keyboard: true }; }
function ebiJoinInput_(chat, m, st, name) {
  var p = String(st).split('|'), kind = p[0], step = p[1], text = String(m.text || '').trim();
  if (text === '↩️ انصراف' || text === '↩️ بازگشت') { tgDel_('ebij', chat); tgSend_(chat, 'باشد. هر وقت خواستید همان لینک را دوباره بزنید.', tgMenu_()); return true; }
  if (text.indexOf('/') === 0) { tgDel_('ebij', chat); return false; }
  if (step === 'n') {
    if (m.contact) { tgSend_(chat, 'اول نام و نام خانوادگی‌تان را بنویسید.', { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'ebi:x' }]] }); return true; }
    if (!text) return false;
    if (text.length < 2 || text.length > 60 || tgLooksLikePhone_(text)) { tgSend_(chat, 'نام را کوتاه و با حروف بنویسید (حداکثر ۶۰ نویسه).', { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'ebi:x' }]] }); return true; }
    tgSetVal_('ebij', chat, kind + '|p|' + text.replace(/\|/g, ' '));
    tgSend_(chat, 'ممنون. حالا شمارهٔ تماستان را با دکمهٔ زیر بفرستید یا بنویسید.', ebiPhoneKb_());
    return true;
  }
  if (step === 'p') {
    var phone = '';
    if (m.contact && m.contact.phone_number) {
      if (m.contact.user_id && m.from && String(m.contact.user_id) !== String(m.from.id)) { tgSend_(chat, 'شمارهٔ خودتان را بفرستید.', ebiPhoneKb_()); return true; }
      phone = String(m.contact.phone_number);
    } else if (text && tgLooksLikePhone_(text)) phone = tgLatinDigits_(text).replace(/[^\d+]/g, '');
    else if (text) { tgSend_(chat, 'شماره را کامل بنویسید (با کد کشور اگر بیرون از ایران هستید)، یا دکمهٔ زیر را بزنید.', ebiPhoneKb_()); return true; }
    else return false;
    var nm = p.slice(2).join('|');
    var r = ebiWp_('POST', 'ebi-join', { kind: kind, name: nm, phone: phone, src: 'bot' });
    if (!r || !r.ok || !r.start) { tgSend_(chat, (r && r.msg) ? tgEsc_(String(r.msg)) : 'ثبت نشد. چند دقیقهٔ دیگر دوباره امتحان کنید.', ebiPhoneKb_()); if (!r || !r.msg) tgErr_('ebiJoin_', (r && r.error) || 'no response', EBI_CODE); return true; }
    tgDel_('ebij', chat);
    var l = ebiWp_('POST', 'ebi-people', { start: r.start, chat_id: String(chat) });
    if (!l || !l.ok) tgErr_('ebiJoin_ link', (l && l.error) || 'no response', EBI_CODE);
    tgSetVal_('ebisrc', chat, kind);
    ebiWelcome_(chat, kind);
    try { ebiMirror_(); } catch (e) { tgErr_('ebiMirror_ join', e); }
    return true;
  }
  tgDel_('ebij', chat);
  return false;
}

/* ---------- همراهان فهرست ---------- */
function ebiUserLabel_(chat, name, uname) {
  if (TG_DRY) { (TG_MEM['ebi:labels'] = TG_MEM['ebi:labels'] || {})[String(chat)] = EBI_USER_LABEL; return; }
  try {
    tgUserTouch_(chat, name, uname, 'کمپین ' + EBI_CODE);
    var sh = tgSS_().getSheetByName(TG_USERS_TAB); if (!sh || sh.getLastRow() < 2) return;
    var lc = sh.getLastColumn(), head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h || '').trim(); });
    var c = head.indexOf('برچسب') + 1;
    if (!c) { c = lc + 1; sh.getRange(1, c).setValue('برچسب').setFontWeight('bold'); }
    var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === String(chat)) {
      var cell = sh.getRange(i + 2, c), cur = String(cell.getValue() || '');
      if (cur.indexOf(EBI_USER_LABEL) < 0) cell.setValue(cur ? cur + '، ' + EBI_USER_LABEL : EBI_USER_LABEL);
      return;
    }
  } catch (e) { tgErr_('ebiUserLabel_', e); }
}
function ebiListHome_(chat, first) {
  tgSend_(chat, (first ? '🎶 به همراهان «پلی‌لیستِ ابی» خوش آمدید.\n\n' : '') + 'چه کاری انجام بدهیم؟',
    ebiHomeKb_([[{ text: '✍️ نوشتن یک چیز درخشان', callback_data: 'ebi:l:w' }], [{ text: '👀 سه مورد آخر فهرست', callback_data: 'ebi:l:r' }]]));
}
function ebiListAsk_(chat) {
  tgSetVal_('ebil', chat, 'w');
  tgSend_(chat, '✍️ یک «چیز درخشان» کوتاه بنویسید: چیزی کوچک که زندگی را روشن‌تر می‌کند.\nبی‌نام منتشر می‌شود و پیش از انتشار دیده می‌شود.', { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'ebi:l:x' }]] });
}
function ebiListInput_(chat, text) {
  if (text.indexOf('/') === 0) { tgDel_('ebil', chat); return false; }
  var t = text.replace(/\s+/g, ' ').trim();
  if (t.length < 3 || t.length > 300) { tgSend_(chat, 'بین ۳ تا ۳۰۰ نویسه بنویسید.', { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'ebi:l:x' }]] }); return true; }
  tgDel_('ebil', chat);
  var r = ebiWp_('POST', 'ebi-list', { text: t, anon: 1, src: 'bot' });
  if (r && r.ok) tgSend_(chat, 'ثبت شد ✓ بعد از بررسی روی فهرست می‌آید.', ebiHomeKb_([[{ text: '✍️ یکی دیگر', callback_data: 'ebi:l:w' }], [{ text: '👀 سه مورد آخر فهرست', callback_data: 'ebi:l:r' }]]));
  else { tgSend_(chat, (r && r.msg) ? tgEsc_(String(r.msg)) : 'ثبت نشد. کمی بعد دوباره امتحان کنید.', ebiHomeKb_([[{ text: '✍️ دوباره', callback_data: 'ebi:l:w' }]])); if (!r || !r.msg) tgErr_('ebiListInput_', (r && r.error) || 'no response', EBI_CODE); }
  return true;
}
/* پاسخ GET /ebi-list را با هر شکلی که دارد به متن موردها برمی‌گرداند (تازه‌ترین اول) */
function ebiListItems_(r) {
  var a = (r && (r.items || r.data || r.list)) || (Array.isArray(r) ? r : []);
  if (!Array.isArray(a)) a = [];
  return a.map(function (x) { return typeof x === 'string' ? x : String((x && (x.text || x.title || x.t || (x.title && x.title.rendered))) || ''); })
    .map(function (s) { return s.replace(/<[^>]+>/g, '').trim(); }).filter(String);
}
function ebiListRecent_(chat) {
  var r = ebiWp_('GET', 'ebi-list'), items = ebiListItems_(r).slice(0, 3);
  if (!items.length) return tgSend_(chat, r && r.ok === false ? 'الان فهرست در دسترس نیست. کمی بعد دوباره بزنید.' : 'فهرست هنوز خالی است. اولین مورد را شما بنویسید.', ebiHomeKb_([[{ text: '✍️ نوشتن یک چیز درخشان', callback_data: 'ebi:l:w' }]]));
  return tgSend_(chat, '👀 <b>سه مورد آخر فهرست</b>\n\n' + items.map(function (s) { return '• ' + tgEsc_(s.slice(0, 300)); }).join('\n\n'),
    ebiHomeKb_([[{ text: '✍️ نوشتن یک چیز درخشان', callback_data: 'ebi:l:w' }]]));
}

/* ---------- ویس درمانگران ---------- */
function ebiVoiceAsk_(chat) {
  tgSetVal_('ebiv', chat, 'w');
  tgSend_(chat, '🎙 تجربه یا تحلیلتان از نمایش را همین‌جا بفرستید: یک ویس، یا متن.', { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'ebi:v:x' }]] });
}
function ebiFolderId_() {
  var id = cfg_(EBI_CFG_DRIVE, '') || pbProp_('EBI_DRIVE');
  if (id || TG_DRY) return id || 'dry-folder';
  var f = DriveApp.createFolder('پلی‌لیست ابی · ویس‌ها (' + EBI_CODE + ')');   /* خصوصی: فقط صاحب بات؛ هیچ لینک عمومی */
  pbProp_('EBI_DRIVE', f.getId());
  ebiTellLeads_('📁 پوشهٔ ویس‌های کمپین در درایو بات ساخته شد (خصوصی، فقط تیم).\n' + f.getUrl(), null, TG_NK.sys);
  return f.getId();
}
function ebiSaveVoice_(fid, label) {
  if (TG_DRY) return 'dry-file:' + fid;
  try {
    var tf = tgTgFile_(fid), ext = (tf.path.match(/\.[A-Za-z0-9]{2,5}$/) || [''])[0];
    return DriveApp.getFolderById(ebiFolderId_()).createFile(tf.blob.setName(label + ext)).getUrl();
  } catch (e) { tgErr_('ebiSaveVoice_', e, EBI_CODE); return ''; }
}
function ebiWhoRole_(chat) {
  try { var t = tgWhoTherapist_(chat); if (t && t.name) return { name: t.name, role: 'درمانگر' }; } catch (e) {}
  try { var p = tgWhoPerson_(chat, ''); if (p && p.name) return { name: p.name, role: (p.roles || []).join('، ') || 'همراه' }; } catch (e2) {}
  return null;
}
function ebiVoiceInput_(chat, m, name, uname) {
  var fid = '', text = String(m.text || m.caption || '').trim();
  if (m.voice) fid = m.voice.file_id; else if (m.audio) fid = m.audio.file_id;
  if (!fid && !text) return false;
  if (!fid && text.indexOf('/') === 0) { tgDel_('ebiv', chat); return false; }
  if (!fid && text.length < 10) { tgSend_(chat, 'کمی بیشتر بنویسید، یا یک ویس بفرستید.', { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'ebi:v:x' }]] }); return true; }
  var who = ebiWhoRole_(chat) || { name: name, role: 'مهمان' };
  var link = fid ? ebiSaveVoice_(fid, 'ویس ' + who.name + ' ' + Utilities.formatDate(new Date(), TG_TZ, 'MM-dd HHmm')) : '';
  if (fid && !link) { tgSend_(chat, 'فایل ذخیره نشد. چند دقیقهٔ دیگر دوباره بفرستید.', { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'ebi:v:x' }]] }); return true; }
  var rows = pbRows_('e', EBI_VOICE_TAB, EBI_VOICE_HEAD), code = 'V-' + (1001 + rows.length);
  var row = pbAdd_('e', EBI_VOICE_TAB, EBI_VOICE_HEAD, { 'زمان': TG_DRY ? 'dry' : tgJDateFull_(new Date(), TG_TZ) + ' ' + Utilities.formatDate(new Date(), TG_TZ, 'HH:mm'),
    'نام': who.name, 'نقش': who.role, 'لینک فایل': link, 'اجازهٔ انتشار': EBI_PERM.w, 'متن': fid ? '' : text.slice(0, 3000), 'chat_id': String(chat), 'کد': code });
  tgSetVal_('ebiv', chat, 'p');
  tgSetVal_('ebivm', chat, code + '|' + (m.message_id || ''));
  tgSend_(chat, 'رسید ✓ اجازه می‌دهید این تجربه منتشر شود؟', { inline_keyboard: [
    [{ text: EBI_PERM.y, callback_data: 'ebi:v:y:' + code }], [{ text: EBI_PERM.n, callback_data: 'ebi:v:n:' + code }]] });
  return true;
}
function ebiVoicePerm_(chat, code, yes) {
  var rows = pbRows_('e', EBI_VOICE_TAB, EBI_VOICE_HEAD), row = null;
  for (var i = 0; i < rows.length; i++) if (String(rows[i]['کد']) === String(code) && String(rows[i]['chat_id']) === String(chat)) row = rows[i];
  if (!row) return tgSend_(chat, 'این مورد پیدا نشد.', ebiHomeKb_());
  var perm = yes ? EBI_PERM.y : EBI_PERM.n, first = row['اجازهٔ انتشار'] === EBI_PERM.w;
  pbSet_('e', EBI_VOICE_TAB, EBI_VOICE_HEAD, row, { 'اجازهٔ انتشار': perm });
  tgDel_('ebiv', chat);
  tgSend_(chat, 'ثبت شد ✓ ممنون از همراهی‌تان.', ebiHomeKb_([[{ text: '🎙 یکی دیگر', callback_data: 'ebi:v:go' }]]));
  if (!first) return null;   /* تغییر نظر بعدی فقط ستون را عوض می‌کند؛ به راهبران دوباره نمی‌رود */
  var mid = (tgGetVal_('ebivm', chat).split('|')[1]) || '';
  var head = '🎙 <b>پلی‌لیست ابی · تجربهٔ تازه</b> · <code>' + tgEsc_(code) + '</code>\n' + tgEsc_(row['نام']) + ' · ' + tgEsc_(row['نقش']) + '\nاجازه: ' + tgEsc_(perm) +
    (row['متن'] ? '\n\n' + tgEsc_(String(row['متن']).slice(0, 1500)) : '') + '\n\nهمه در تب «' + EBI_VOICE_TAB + '» هاب پذیرش.';
  ebiLeads_().forEach(function (c) {
    tgNotify_(c, TG_NK.task, head, { ref: EBI_CODE, markup: row['لینک فایل'] && /^https:/.test(row['لینک فایل']) ? { inline_keyboard: [[{ text: '📁 فایل در درایو', url: row['لینک فایل'] }]] } : null });
    if (mid && !row['متن']) { if (TG_DRY) TG_OUTBOX.push({ kind: 'copy', chat: c, from: String(chat), mid: mid }); else try { tgApi_('copyMessage', { chat_id: c, from_chat_id: chat, message_id: Number(mid) }); } catch (e) { tgErr_('ebiVoicePerm_ copy', e, EBI_CODE); } }
  });
  tgDel_('ebivm', chat);
  return null;
}

/* ---------- تب آینه در هاب پذیرش (بی شماره) ---------- */
function ebiMirrorRows_(items) {
  return (items || []).map(function (x) {
    return [String(x.date || x.linked || ''), EBI_KIND[x.kind] || String(x.kind || ''), String(x.src || 'سایت') || 'سایت', String(x.name || 'بی‌نام'), x.chat_id ? 'بله' : 'نه'];
  });
}
function ebiMirror_() {
  var r = ebiWp_('GET', 'ebi-people');
  if (!r || !r.ok || !Array.isArray(r.items)) {
    /* اسنیپت سایت هنوز نصب نشده (۴۰۴) خطا نیست؛ بقیه روزی یک بار در «خطاها» */
    if (!(r && r._code === 404) && pbProp_('EBI_MIRROR_ERR') !== Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd')) { pbProp_('EBI_MIRROR_ERR', Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd')); tgErr_('ebiMirror_', (r && r.error) || 'no response', EBI_CODE); }
    return -1;
  }
  var rows = ebiMirrorRows_(r.items);
  if (TG_DRY) { TG_MEM['ebi:mirror'] = rows; return rows.length; }
  var ss = tgSS_(), sh = ss.getSheetByName(EBI_MIRROR_TAB);
  if (!sh) {
    sh = ss.insertSheet(EBI_MIRROR_TAB); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, EBI_MIRROR_HEAD.length).setValues([EBI_MIRROR_HEAD]).setFontWeight('bold').setBackground('#f9f2f2');
    sh.setFrozenRows(1);
  }
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, EBI_MIRROR_HEAD.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, EBI_MIRROR_HEAD.length).setNumberFormat('@').setValues(rows);
  pbProp_('EBI_MIRROR_AT', pbFmt_(new Date()));
  return rows.length;
}

/* ---------- کال‌بک‌ها (ebi:) ---------- */
function ebiCb_(cq, chat, data, name, uname) {
  var p = String(data).split(':'), a = p[1], b = p[2], c = p[3];
  if (a === 'home') { tgDel_('ebij', chat); tgDel_('ebil', chat); return tgSend_(chat, 'منوی اصلی 👇', tgMenu_()); }
  if (a === 'x') { tgDel_('ebij', chat); return tgSend_(chat, 'باشد. هر وقت خواستید همان لینک را دوباره بزنید.', tgMenu_()); }
  if (a === 'l') {
    if (ebiEnded_()) return tgSend_(chat, 'کمپین «پلی‌لیستِ ابی» تمام شد. ممنون از همراهی‌تان.', ebiHomeKb_());
    if (b === 'w') return ebiListAsk_(chat);
    if (b === 'r') return ebiListRecent_(chat);
    if (b === 'x') { tgDel_('ebil', chat); return ebiListHome_(chat, false); }
  }
  if (a === 'v') {
    if (b === 'go') return ebiVoiceAsk_(chat);
    if (b === 'x') { tgDel_('ebiv', chat); return tgSend_(chat, 'باشد.', ebiHomeKb_()); }
    if (b === 'y' || b === 'n') return ebiVoicePerm_(chat, c, b === 'y');
  }
  if (typeof ebiDeskCb_ === 'function') { var r = ebiDeskCb_(chat, p); if (r !== false) return r; }
  return tgSend_(chat, 'این دکمه دیگر کار نمی‌کند.', ebiHomeKb_());
}

/* ---------- ساعتی (tgWatchdog): راه‌اندازی یک‌باره و آینهٔ روزانه ---------- */
function ebiSetup_() {
  var out = [];
  var have = {}; pbRows_('e', PB_T_START, PB_START_HEAD).forEach(function (r) { have[String(r['کد']).trim()] = 1; });
  var add = EBI_FIXED_CODES.concat(['ebi<id>-<6hex>']).filter(function (k) { return !have[k]; }).map(function (k) {
    return { 'کد': k, 'برچسب': k === 'ebi<id>-<6hex>' ? 'کمپین › ' + EBI_CODE + ' › اتصال ثبت‌نام سایت (الگو)' : ebiStartLabel_(k) };
  });
  pbAddMany_('e', PB_T_START, PB_START_HEAD, add);
  out.push('کدهای start: ' + add.length + ' ردیف');
  pbRows_('e', EBI_VOICE_TAB, EBI_VOICE_HEAD);
  out.push('تب «' + EBI_VOICE_TAB + '» آماده');
  var n = ebiMirror_();
  out.push('تب «' + EBI_MIRROR_TAB + '»: ' + (n < 0 ? 'سایت در دسترس نبود' : n + ' نفر'));
  return out.join(' · ');
}
function ebiHourly_() {
  if (!ebiLeads_().length) return;   /* تا کلید «راهبران C-004» در تنظیمات نیامده، کمپین در بات خاموش است */
  var day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd'), hour = Number(Utilities.formatDate(new Date(), TG_TZ, 'H'));
  if (pbProp_('EBI_SETUP') !== '17016') {
    /* تا اسنیپت سایت جواب ندهد (فهرست افراد)، راه‌اندازی و اعلام «آماده» عقب می‌افتد؛ ساعت بعد دوباره */
    var probe = ebiWp_('GET', 'ebi-people');
    if (!probe || !probe.ok) return;
    pbProp_('EBI_SETUP', '17016');
    var rep = ebiSetup_();
    var bot = tgBotName_();
    ebiTellLeads_('🎶 <b>پلی‌لیستِ ابی</b> · بات آماده شد\n' + tgEsc_(rep) + '\n\nلینک‌ها:\n' + EBI_FIXED_CODES.map(function (k) { return 'https://t.me/' + bot + '?start=' + k; }).join('\n') +
      '\n\nدر تب «' + EBI_MIRROR_TAB + '» و «' + EBI_VOICE_TAB + '» هاب پذیرش.', null, TG_NK.sys);
    pbProp_('EBI_MIRROR_DAY', day);
    return;
  }
  if (pbProp_('EBI_MIRROR_DAY') !== day && hour >= 8) { pbProp_('EBI_MIRROR_DAY', day); ebiMirror_(); }
  if (typeof ebiHourly2_ === 'function') ebiHourly2_(day, hour);
}

/* ============================================================================
   v170.17 · شب‌های تجربه، اعلام، یادآوری، گزارش، پایان
   - هر شب یک رویداد در موتور رویداد موجود (تب «رویدادها» هاب مدرسه) با نوع «شب تجربه» و ستون «کمپین» = C-004.
     این رویدادها در صفحه‌های مدرسه، API رویدادها، فهرست رویداد بات و پیام بازخورد بعد از رویداد نمی‌آیند (EBI_NIGHT_KIND).
   - میز راهبران (`/ebi` یا دکمهٔ میز): «➕ شب تازه» (تاریخ، ساعت، ظرفیت)، «📋 شب‌ها»، «📣 اعلام شب‌های تجربه»، «📊 گزارش».
   - اعلام: افراد kind=night با chat_id از GET /ebi-people?kind=night، هر نفر یک پیام با یک دکمه برای هر شب باز
     (نوع «دعوت» از «سیاست پیام»؛ سکوت شب و صف همان tgNotify_). بی chat_id ← فهرست برای راهبران تا تماس بگیرند.
   - انتخاب شب زیر قفل، با ظرفیت و بی تکرار؛ ثبت در «ثبت‌نام رویداد» (منبع C-004)؛ لغو با دکمه.
   - ظهر روز شب: یادآوری به ثبت‌نامی‌ها.
   - شنبه ساعت ۱۰: گزارش برای راهبران. بعد از «پایان C-004»: دکمهٔ اعلام پنهان، گزارش نهایی یک بار.
   ============================================================================ */
var EBI_NIGHT_KIND = 'شب تجربه';
var EBI_EV_COL = 'کمپین';
var EBI_BC_MAX = 150;
try { if (TG_EV_HEAD2.indexOf(EBI_EV_COL) < 0) TG_EV_HEAD2.push(EBI_EV_COL); } catch (eEbiEv) {}

/* برای فیلتر رویدادهای مدرسه: این ردیف شب کمپین است؟ */
function ebiIsNightEv_(o) { return !!o && String(o['نوع'] || o.kind || '').trim() === EBI_NIGHT_KIND; }
function ebiToday_() { return TG_DRY && TG_MEM['ebi:today'] ? TG_MEM['ebi:today'] : Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd'); }
function ebiIso_(d) { return d instanceof Date ? Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd') : v17013OfIso_(d); }
function ebiNights_(openOnly) {
  var today = ebiToday_();
  return tgEvAll_().filter(function (o) { return ebiIsNightEv_(o) && String(o[EBI_EV_COL] || '').trim() === EBI_CODE; })
    .filter(function (o) { return !openOnly || (String(o['وضعیت']).trim() === 'باز' && ebiIso_(o['تاریخ']) >= today); })
    .sort(function (a, b) { return (ebiIso_(a['تاریخ']) + a['ساعت']) < (ebiIso_(b['تاریخ']) + b['ساعت']) ? -1 : 1; });
}
function ebiNightBy_(code) { var L = ebiNights_(false); for (var i = 0; i < L.length; i++) if (L[i].code === String(code)) return L[i]; return null; }
function ebiNightWhen_(o) {
  var d = o['تاریخ'], j = d instanceof Date ? tgJDateFull_(d, TG_TZ) : String(d || '');
  return j + (o['ساعت'] ? ' · ساعت ' + tgFa_(String(o['ساعت'])) : '');
}
/* ثبت‌نام‌ها: [تاریخ ثبت، کد رویداد، عنوان، نام، شماره، نقش، کد منبع، کانال، chat_id، وضعیت] */
function ebiRegs_() {
  if (TG_DRY) return (TG_MEM['evregs'] = TG_MEM['evregs'] || []);
  var sh = tgEvSheet_(); if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
}
function ebiRegsOf_(code) { return ebiRegs_().filter(function (r) { return String(r[1]).trim() === String(code) && String(r[9]).trim() !== 'لغو'; }); }
function ebiNightCap_(o) { return Number(tgLatinDigits_(String(o['ظرفیت'] || '0'))) || 0; }
function ebiNightLeft_(o) { var c = ebiNightCap_(o); return c ? Math.max(0, c - ebiRegsOf_(o.code).length) : 999; }

/* ---------- میز راهبران ---------- */
function ebiDeskKb_() {
  var rows = [];
  if (!ebiEnded_() && ebiNights_(true).length) rows.push([{ text: '📣 اعلام شب‌های تجربه', callback_data: 'ebi:an:0' }]);
  rows.push([{ text: '➕ شب تازه', callback_data: 'ebi:nn:go' }, { text: '📋 شب‌ها', callback_data: 'ebi:ns' }]);
  rows.push([{ text: '📊 گزارش الان', callback_data: 'ebi:rp' }]);
  return ebiHomeKb_(rows);
}
function ebiDesk_(chat) {
  if (!ebiIsLead_(chat)) return tgSend_(chat, 'این میز برای راهبر کمپین است.', ebiHomeKb_());
  var open = ebiNights_(true);
  var t = '🎶 <b>میز کمپین «پلی‌لیستِ ابی»</b> · ' + EBI_CODE + (ebiEnded_() ? '\n<i>کمپین تمام شده است.</i>' : '') +
    '\n\nشب‌های باز: <b>' + tgFa_(open.length) + '</b>' +
    (open.length ? '\n' + open.slice(0, 6).map(function (o) { return '• ' + tgEsc_(ebiNightWhen_(o)) + ' · ثبت‌نام ' + tgFa_(ebiRegsOf_(o.code).length) + (ebiNightCap_(o) ? ' از ' + tgFa_(ebiNightCap_(o)) : ''); }).join('\n') : '');
  return tgSend_(chat, t, ebiDeskKb_());
}

/* ➕ شب تازه: تاریخ ← ساعت ← ظرفیت ← تأیید */
function ebiNightAsk_(chat) {
  tgSetVal_('ebin', chat, JSON.stringify({ s: 'd' }));
  return tgSend_(chat, '➕ <b>شب تازه</b>\nتاریخ را بنویسید (مثل ۱۴۰۵/۰۷/۲۰).', { inline_keyboard: [[{ text: '✖️ انصراف', callback_data: 'ebi:nn:x' }]] });
}
function ebiNightInput_(chat, m) {
  if (!ebiIsLead_(chat)) { tgDel_('ebin', chat); return false; }
  var text = String(m.text || '').trim(); if (!text) return false;
  if (text.indexOf('/') === 0) { tgDel_('ebin', chat); return false; }
  var st = {}; try { st = JSON.parse(tgGetVal_('ebin', chat)) || {}; } catch (e) { st = {}; }
  var x = { inline_keyboard: [[{ text: '✖️ انصراف', callback_data: 'ebi:nn:x' }]] };
  if (st.s === 'd') {
    var iso = v17013OfIso_(tgLatinDigits_(text).replace(/\s/g, ''));
    if (!iso) { tgSend_(chat, 'تاریخ را به این شکل بنویسید: ۱۴۰۵/۰۷/۲۰', x); return true; }
    if (iso < ebiToday_()) { tgSend_(chat, 'این تاریخ گذشته است. تاریخ دیگری بنویسید.', x); return true; }
    st = { s: 't', d: iso }; tgSetVal_('ebin', chat, JSON.stringify(st));
    tgSend_(chat, 'ساعت شروع را بنویسید (مثل ۱۹:۳۰).', x); return true;
  }
  if (st.s === 't') {
    var mm = tgLatinDigits_(text).match(/^(\d{1,2})\s*[:٫.]\s*(\d{2})$/) || tgLatinDigits_(text).match(/^(\d{1,2})$/);
    var h = mm ? Number(mm[1]) : -1, mi = mm && mm[2] ? Number(mm[2]) : 0;
    if (h < 0 || h > 23 || mi > 59) { tgSend_(chat, 'ساعت را به این شکل بنویسید: ۱۹:۳۰', x); return true; }
    st.s = 'c'; st.t = ('0' + h).slice(-2) + ':' + ('0' + mi).slice(-2); tgSetVal_('ebin', chat, JSON.stringify(st));
    tgSend_(chat, 'ظرفیت این شب چند نفر است؟', x); return true;
  }
  if (st.s === 'c') {
    var cap = Number(tgLatinDigits_(text).replace(/\D/g, ''));
    if (!cap || cap > 1000) { tgSend_(chat, 'یک عدد بین ۱ تا ۱۰۰۰ بنویسید.', x); return true; }
    st.s = 'ok'; st.c = cap; tgSetVal_('ebin', chat, JSON.stringify(st));
    var j = tgJDateFull_(new Date(st.d + 'T12:00:00+03:30'), TG_TZ);
    tgSend_(chat, '<b>شب تازه</b>\n' + tgEsc_(j) + ' · ساعت ' + tgFa_(st.t) + '\nظرفیت: ' + tgFa_(cap) + ' نفر\n\nثبت شود؟',
      { inline_keyboard: [[{ text: '✅ ثبت', callback_data: 'ebi:nn:ok' }, { text: '✏️ از نو', callback_data: 'ebi:nn:go' }], [{ text: '✖️ انصراف', callback_data: 'ebi:nn:x' }]] });
    return true;
  }
  tgDel_('ebin', chat); return false;
}
function ebiNightCreate_(st, by) {
  var code = tgEvNextCode_(), H = tgEvHeadAll_(), row = H.map(function () { return ''; });
  function put(n, v) { var c = H.indexOf(n); if (c > -1) row[c] = v; }
  var start = new Date(st.d + 'T' + st.t + ':00+03:30');
  put('کد', code); put('عنوان', EBI_NIGHT_KIND + ' · ' + tgJDateFull_(start, TG_TZ)); put('تاریخ', start); put('ساعت', st.t);
  put('نوع', EBI_NIGHT_KIND); put('ظرفیت', st.c); put('وضعیت', 'باز'); put(EBI_EV_COL, EBI_CODE); put('ثبت‌نام از بات', 'بله'); put('ثبت‌کننده', by || 'راهبر کمپین');
  if (TG_DRY) { (TG_MEM['evall'] = TG_MEM['evall'] || []).push(tgEvRowObj_(H, row, TG_MEM['evall'].length + 2)); return code; }
  try { tgEvHeadFix_(); } catch (eH) {}
  tgEvSheetMain_().appendRow(row);
  try { CacheService.getScriptCache().remove('evapi'); } catch (eX) {}
  try { tgPev_({ id: code, actor: by || 'راهبر کمپین', channel: 'بات', what: 'شب تجربهٔ تازه', to: EBI_CODE }); } catch (eP) {}
  return code;
}

/* 📣 اعلام: یک پیام با یک دکمه برای هر شب باز */
function ebiNightsKb_(open) {
  var rows = open.filter(function (o) { return ebiNightLeft_(o) > 0; }).slice(0, 12).map(function (o) { return [{ text: ebiNightWhen_(o), callback_data: 'ebi:nb:' + o.code }]; });
  return ebiHomeKb_(rows);
}
function ebiAnnText_(open) {
  return '🎶 <b>شب‌های تجربهٔ «پلی‌لیستِ ابی»</b>\nتاریخ‌ها اعلام شد. شبی را که می‌آیید انتخاب کنید:\n\n' +
    open.map(function (o) { var l = ebiNightLeft_(o); return '• ' + tgEsc_(ebiNightWhen_(o)) + (l < 999 ? ' · ' + (l ? tgFa_(l) + ' جای خالی' : 'پر شد') : ''); }).join('\n');
}
function ebiAnnounce_(chat, from) {
  if (!ebiIsLead_(chat)) return tgSend_(chat, 'این دکمه برای راهبر کمپین است.', ebiHomeKb_());
  if (ebiEnded_()) return tgSend_(chat, 'کمپین تمام شده است.', ebiDeskKb_());
  var open = ebiNights_(true);
  if (!open.length) return tgSend_(chat, 'شب بازی نیست. اول «➕ شب تازه» را بزنید.', ebiDeskKb_());
  var r = ebiWp_('GET', 'ebi-people?kind=night');
  if (!r || !r.ok || !Array.isArray(r.items)) return tgSend_(chat, 'فهرست شب از سایت خوانده نشد. چند دقیقهٔ دیگر دوباره بزنید.', ebiDeskKb_());
  var withChat = r.items.filter(function (x) { return x.chat_id; }), noChat = r.items.filter(function (x) { return !x.chat_id; });
  var start = Number(from) || 0, slice = withChat.slice(start, start + EBI_BC_MAX), sent = 0, queued = 0, bad = 0;
  var text = ebiAnnText_(open), kb = ebiNightsKb_(open);
  slice.forEach(function (x) { var q = tgNotify_(String(x.chat_id), TG_NK.invite, text, { ref: EBI_CODE, markup: kb }); if (q === 'رفت') sent++; else if (q === 'صف') queued++; else bad++; });
  var total = start + slice.length, more = withChat.length > total;
  if (!start && noChat.length) {
    var lines = noChat.slice(0, 80).map(function (x) { return '• ' + tgEsc_(x.name || 'بی‌نام') + (x.phone ? ' · <code>' + tgEsc_(x.phone) + '</code>' : ''); });
    ebiTellLeads_('☎️ <b>شب‌های تجربه · بی تلگرام</b>\nاین ' + tgFa_(noChat.length) + ' نفر به بات وصل نیستند؛ لطفاً تماس بگیرید و شب را بپرسید:\n\n' + lines.join('\n') + (noChat.length > 80 ? '\n…' : '') +
      '\n\nفهرست کامل در پیشخوان سایت، «فهرست ابی › ثبت‌نام‌ها» (نوع: شب).', ebiHomeKb_([[{ text: '🎶 میز کمپین', callback_data: 'ebi:d' }]]), TG_NK.task);
  }
  pbProp_('EBI_ANN_LAST', pbFmt_(new Date()) + ' · ' + total + ' نفر');
  return tgSend_(chat, '📣 اعلام رفت: ' + tgFa_(sent) + ' نفر' + (queued ? ' · در صف صبح: ' + tgFa_(queued) : '') + (bad ? ' · نرسید: ' + tgFa_(bad) : '') +
    (noChat.length && !start ? '\nبی تلگرام: ' + tgFa_(noChat.length) + ' نفر (فهرست برای راهبران رفت)' : '') + (more ? '\nمانده: ' + tgFa_(withChat.length - total) + ' نفر' : ''),
    more ? { inline_keyboard: [[{ text: '▶ ادامه', callback_data: 'ebi:an:' + total }], [{ text: '🎶 میز کمپین', callback_data: 'ebi:d' }]] } : ebiDeskKb_());
}

/* انتخاب و لغو شب (برای همه) */
function ebiBook_(chat, code, name) {
  if (ebiEnded_()) return tgSend_(chat, 'کمپین «پلی‌لیستِ ابی» تمام شد. ممنون از همراهی‌تان.', ebiHomeKb_());
  var lock = TG_DRY ? null : LockService.getScriptLock();
  if (lock && !lock.tryLock(15000)) return tgSend_(chat, 'شلوغ است. چند ثانیهٔ دیگر دوباره بزنید.', ebiHomeKb_([[{ text: '🔁 دوباره', callback_data: 'ebi:nb:' + code }]]));
  try {
    var o = ebiNightBy_(code), open = ebiNights_(true);
    if (!o || String(o['وضعیت']).trim() !== 'باز' || ebiIso_(o['تاریخ']) < ebiToday_()) return tgSend_(chat, 'این شب دیگر باز نیست.' + (open.length ? ' شب دیگری انتخاب کنید:' : ''), ebiNightsKb_(open));
    var mine = ebiRegsOf_(code).some(function (r) { return String(r[8]).trim() === String(chat); });
    if (mine) return tgSend_(chat, 'شما قبلاً برای این شب ثبت شده‌اید ✓\n' + tgEsc_(ebiNightWhen_(o)), ebiHomeKb_([[{ text: '✖️ لغو جای من', callback_data: 'ebi:nc:' + code }]]));
    if (ebiNightLeft_(o) <= 0) return tgSend_(chat, 'ظرفیت این شب پر شد.' + (open.length > 1 ? ' شب دیگری انتخاب کنید:' : ''), ebiNightsKb_(open.filter(function (x) { return x.code !== code; })));
    var row = [tgJDateFull_(new Date(), TG_TZ), o.code, o.title, name || '', '', '', EBI_CODE, 'بات', String(chat), 'ثبت شد'];
    if (TG_DRY) ebiRegs_().push(row); else tgEvSheet_().appendRow(row);
  } finally { if (lock) lock.releaseLock(); }
  return tgSend_(chat, '✅ جای شما ثبت شد:\n<b>' + tgEsc_(ebiNightWhen_(o)) + '</b>\nظهر همان روز یادآوری می‌فرستیم.', ebiHomeKb_([[{ text: '✖️ لغو جای من', callback_data: 'ebi:nc:' + code }]]));
}
function ebiCancel_(chat, code) {
  var o = ebiNightBy_(code), n = 0;
  if (TG_DRY) ebiRegs_().forEach(function (r) { if (String(r[1]) === String(code) && String(r[8]) === String(chat) && r[9] !== 'لغو') { r[9] = 'لغو'; n++; } });
  else {
    var sh = tgEvSheet_(), v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues() : [];
    v.forEach(function (r, i) { if (String(r[1]).trim() === String(code) && String(r[8]).trim() === String(chat) && String(r[9]).trim() !== 'لغو') { sh.getRange(i + 2, 10).setValue('لغو'); n++; } });
  }
  var open = ebiNights_(true).filter(function (x) { return x.code !== code; });
  return tgSend_(chat, n ? 'جای شما لغو شد.' + (open.length ? ' اگر خواستید شب دیگری انتخاب کنید:' : '') : 'ثبتی برای این شب پیدا نشد.', open.length ? ebiNightsKb_(open) : ebiHomeKb_());
}

/* ---------- کال‌بک‌های میز و شب ---------- */
function ebiDeskCb_(chat, p) {
  var a = p[1], b = p[2];
  if (a === 'nb') return ebiBook_(chat, b, '');
  if (a === 'nc') return ebiCancel_(chat, b);
  if (['d', 'an', 'nn', 'ns', 'nl', 'rp'].indexOf(a) < 0) return false;
  if (!ebiIsLead_(chat)) return tgSend_(chat, 'این دکمه برای راهبر کمپین است.', ebiHomeKb_());
  if (a === 'd') return ebiDesk_(chat);
  if (a === 'an') return ebiAnnounce_(chat, Number(b || 0));
  if (a === 'rp') return tgSend_(chat, ebiReport_(false), ebiDeskKb_());
  if (a === 'ns') {
    var L = ebiNights_(false);
    if (!L.length) return tgSend_(chat, 'هنوز شبی ثبت نشده است.', ebiDeskKb_());
    return tgSend_(chat, '📋 <b>شب‌های تجربه</b>\n\n' + L.map(function (o) { return '• <code>' + o.code + '</code> ' + tgEsc_(ebiNightWhen_(o)) + ' · ' + tgEsc_(String(o['وضعیت'])) + ' · ثبت‌نام ' + tgFa_(ebiRegsOf_(o.code).length) + (ebiNightCap_(o) ? ' از ' + tgFa_(ebiNightCap_(o)) : ''); }).join('\n'),
      ebiHomeKb_(L.slice(-6).map(function (o) { return [{ text: '👥 ' + ebiNightWhen_(o), callback_data: 'ebi:nl:' + o.code }]; }).concat([[{ text: '🎶 میز کمپین', callback_data: 'ebi:d' }]])));
  }
  if (a === 'nl') {
    var o = ebiNightBy_(b); if (!o) return tgSend_(chat, 'این شب پیدا نشد.', ebiDeskKb_());
    var R = ebiRegsOf_(b);
    return tgSend_(chat, '👥 <b>' + tgEsc_(ebiNightWhen_(o)) + '</b> · ' + tgFa_(R.length) + (ebiNightCap_(o) ? ' از ' + tgFa_(ebiNightCap_(o)) : '') + '\n\n' + (R.map(function (r, i) { return tgFa_(i + 1) + '. ' + tgEsc_(String(r[3] || 'بی‌نام')); }).join('\n') || 'هنوز کسی ثبت نکرده.'),
      ebiHomeKb_([[{ text: '🎶 میز کمپین', callback_data: 'ebi:d' }]]));
  }
  if (a === 'nn') {
    if (b === 'go') return ebiNightAsk_(chat);
    if (b === 'x') { tgDel_('ebin', chat); return ebiDesk_(chat); }
    if (b === 'ok') {
      var st = {}; try { st = JSON.parse(tgGetVal_('ebin', chat)) || {}; } catch (e) { st = {}; }
      if (st.s !== 'ok') return ebiNightAsk_(chat);
      tgDel_('ebin', chat);
      var code = ebiNightCreate_(st, 'راهبر کمپین');
      ebiTellLeads_('🌙 شب تازه ثبت شد · <code>' + code + '</code>\n' + tgEsc_(ebiNightWhen_(ebiNightBy_(code) || { 'تاریخ': st.d, 'ساعت': st.t })) + ' · ظرفیت ' + tgFa_(st.c), ebiDeskKb_(), TG_NK.report);
      return null;
    }
  }
  return false;
}

/* ---------- گزارش ---------- */
function ebiLeadCount_() {
  var src = [];
  if (TG_DRY) src = TG_MEM['ebi:leadsrc'] || [];
  else { try { var sh = tgSS_().getSheetByName(TG_LEADS); if (sh && sh.getLastRow() > 1) src = sh.getRange(2, 3, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); }); } catch (e) { tgErr_('ebiLeadCount_', e); return -1; } }
  return src.filter(function (x) { return String(x).indexOf('کمپین › ' + EBI_CODE) === 0; }).length;
}
function ebiReport_(final) {
  var L = ebiWp_('GET', 'ebi-list'), P = ebiWp_('GET', 'ebi-people');
  var listN = L && L.ok !== false ? (Number(L.total || L.count) || ebiListItems_(L).length) : -1;
  var by = {}, linked = 0, total = 0;
  if (P && P.ok && Array.isArray(P.items)) P.items.forEach(function (x) { total++; by[x.kind] = (by[x.kind] || 0) + 1; if (x.chat_id) linked++; });
  var voices = pbRows_('e', EBI_VOICE_TAB, EBI_VOICE_HEAD).length, leads = ebiLeadCount_();
  var t = '📊 <b>' + (final ? 'گزارش نهایی' : 'گزارش') + ' «پلی‌لیستِ ابی»</b> · ' + EBI_CODE + '\n\n' +
    '• موردهای فهرست: ' + (listN < 0 ? 'خوانده نشد' : '<b>' + tgFa_(listN) + '</b>' + (L && !L.total && !L.count ? ' (از پاسخ سایت)' : '')) + '\n' +
    '• ثبت‌نام‌ها: ' + (P && P.ok ? '<b>' + tgFa_(total) + '</b> · وصل به بات ' + tgFa_(linked) : 'خوانده نشد') + '\n' +
    Object.keys(EBI_KIND).filter(function (k) { return by[k]; }).map(function (k) { return '   ◦ ' + EBI_KIND[k] + ': ' + tgFa_(by[k]); }).join('\n') + (Object.keys(by).length ? '\n' : '') +
    '• ویس و تجربهٔ درمانگران: ' + tgFa_(voices) + '\n' +
    '• لیدهای کمپین در «لیدها»: ' + (leads < 0 ? 'خوانده نشد' : tgFa_(leads));
  var N = ebiNights_(false);
  if (N.length) t += '\n\n🌙 شب‌ها:\n' + N.map(function (o) { return '• ' + tgEsc_(ebiNightWhen_(o)) + ' · ' + tgFa_(ebiRegsOf_(o.code).length) + (ebiNightCap_(o) ? ' از ' + tgFa_(ebiNightCap_(o)) : ''); }).join('\n');
  return t;
}

/* ---------- کارهای ساعتی کمپین (از ebiHourly_) ---------- */
function ebiHourly2_(day, hour) {
  var now = new Date();
  /* پایان: گزارش نهایی یک بار */
  if (ebiEnded_()) { if (pbProp_('EBI_FINAL') !== '1') { pbProp_('EBI_FINAL', '1'); ebiTellLeads_(ebiReport_(true), ebiHomeKb_(), TG_NK.report); } return; }
  var tonight = ebiNights_(true).filter(function (o) { return ebiIso_(o['تاریخ']) === day; });
  /* ظهر روز شب: یادآوری به ثبت‌نامی‌ها */
  if (hour >= 12 && tonight.length && pbProp_('EBI_NOON') !== day) {
    pbProp_('EBI_NOON', day);
    tonight.forEach(function (o) {
      ebiRegsOf_(o.code).forEach(function (r) { var c = String(r[8] || '').trim(); if (c) tgNotify_(c, TG_NK.remind, '🌙 یادآوری: امشب <b>' + tgEsc_(ebiNightWhen_(o)) + '</b>. منتظرتان هستیم.', { ref: EBI_CODE, markup: ebiHomeKb_([[{ text: '✖️ نمی‌توانم بیایم', callback_data: 'ebi:nc:' + o.code }]]) }); });
    });
  }
  /* شنبه ساعت ۱۰: گزارش هفتگی */
  if (Utilities.formatDate(now, TG_TZ, 'u') === '6' && hour >= 10 && pbProp_('EBI_WEEK') !== day) {
    pbProp_('EBI_WEEK', day);
    ebiTellLeads_(ebiReport_(false), ebiHomeKb_([[{ text: '🎶 میز کمپین', callback_data: 'ebi:d' }]]), TG_NK.report);
  }
}

/* ---------- تست خشک ---------- */
function ebiTests() {
  var pass = 0, fail = 0, out = [];
  function ok(n, c, x) { if (c) pass++; else fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !x ? '' : ' · ' + String(x).slice(0, 200))); }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  try {
    TG_MEM['pb:key'] = 'tjk_' + 'e'.repeat(48);
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 5, 12, 0).getTime();
    function gw(b) { return pbGateway_(Object.assign({ api: 1, key: TG_MEM['pb:key'], action: 'ebi_check' }, b)); }
    var d = gw({ text: 'صدای باران روی پنجره', dry_run: true });
    ok('dry_run: جمنای صدا زده نمی‌شود و مصرف ثبت نمی‌شود', d.ok && d.data.would === 'gemini' && d.data.model === 'gemini-flash-latest' && d.data.dry_run === true && ebiUsed_() === 0, JSON.stringify(d));
    ok('متن خالی رد می‌شود', gw({ text: '  ' }).ok === false);
    TG_MEM['ebi:gem'] = { verdict: 'ok', reason: 'مهربان و کوتاه' };
    var a = gw({ text: 'صدای باران روی پنجره' });
    ok('جمنای ok ← ok با دلیل', a.ok && a.data.verdict === 'ok' && a.data.reason === 'مهربان و کوتاه', JSON.stringify(a));
    ok('مصرف و توکن روز ثبت می‌شود', ebiUsed_() === 1 && ebiTok_().in === 200 && ebiTok_().out === 20);
    TG_MEM['ebi:gem'] = { verdict: 'review', reason: 'نشانهٔ حال بد' };
    ok('جمنای review ← review', gw({ text: 'دیگر نمی‌کشم' }).data.verdict === 'review');
    TG_MEM['ebi:gem'] = { verdict: 'maybe', reason: 'x' };
    ok('پاسخ ناشناخته ← review', gw({ text: 'یک فنجان چای' }).data.verdict === 'review');
    TG_MEM['ebi:gem'] = { verdict: 'ok', reason: 'خوب — عالی' };
    ok('خط تیره از دلیل برداشته می‌شود', !/[—–]/.test(gw({ text: 'یک فنجان چای' }).data.reason));
    TG_MEM['ebi:gemerr'] = 'HTTP 503';
    var e = gw({ text: 'لبخند مادرم' });
    ok('خطای جمنای ← review، نه خطای درگاه', e.ok === true && e.data.verdict === 'review' && /در دسترس نبود/.test(e.data.reason), JSON.stringify(e));
    delete TG_MEM['ebi:gemerr'];
    ok('متن خیلی بلند ← review بی جمنای', (function () { var u = ebiUsed_(); var r = gw({ text: new Array(700).join('الف') }); return r.data.verdict === 'review' && ebiUsed_() === u; })());
    ok('سقف روز پر ← review بی جمنای', (function () { pbProp_('EBI_GEM:' + ebiDayKey_(), '300'); var r = gw({ text: 'گل' }); return r.data.verdict === 'review' && /سقف/.test(r.data.reason) && ebiUsed_() === 300; })());
    /* سقف ساعتی جدا: ۳۰ فراخوانی بقیهٔ اکشن‌ها پر است ولی ebi_check کار می‌کند */
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 5, 15, 0).getTime();
    for (var i = 0; i < 31; i++) pbGateway_({ api: 1, key: TG_MEM['pb:key'], action: 'status' });
    var st = pbGateway_({ api: 1, key: TG_MEM['pb:key'], action: 'status' });
    ok('سقف عمومی درگاه پر شده', st.error === 'rate_limited');
    ok('ebi_check سقف ساعتی خودش را دارد', gw({ text: 'گل', dry_run: true }).ok === true);
    ok('status شمار امروز کمپین را دارد', (function () { pbProp_('EBI_GEM:' + ebiDayKey_(), '3'); TG_MEM['pb:now'] = pbTehran_(2026, 10, 5, 16, 0).getTime(); var s2 = pbStatus_(); return s2.data.gemini.ebi_today === 3; })());
    /* v170.17.1: حکم با id به سایت فرستاده می‌شود؛ بی id یا آزمایشی نه */
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 6, 10, 0).getTime(); pbProp_('EBI_GEM:' + ebiDayKey_(), '0');
    var vs = []; TG_MEM['ebi:wp'] = function (m, path, body) { if (path === 'ebi-verdict') vs.push(body); return { ok: true }; };
    TG_MEM['ebi:gem'] = { verdict: 'ok', reason: 'مهربان' };
    var g1 = gw({ text: 'بوی نان تازه', id: 41 });
    ok('v170.17.1: حکم ok با id به سایت رفت', g1.data.pushed === true && vs.length === 1 && vs[0].id === 41 && vs[0].verdict === 'ok', JSON.stringify([g1, vs]));
    TG_MEM['ebi:gem'] = { verdict: 'review', reason: 'نامطمئن' };
    gw({ text: 'یک جملهٔ دیگر', id: '42' });
    ok('v170.17.1: حکم review هم می‌رود', vs.length === 2 && vs[1].id === 42 && vs[1].verdict === 'review');
    gw({ text: 'بی شناسه' }); gw({ text: 'آزمایشی', id: 43, dry_run: true }); gw({ text: 'شناسهٔ بد', id: 'x' });
    ok('v170.17.1: بی id، آزمایشی یا id نادرست چیزی نمی‌رود', vs.length === 2);
    TG_MEM['ebi:wp'] = function () { return { ok: false, error: 'not_found', _code: 404 }; };
    var g4 = gw({ text: 'مسیر هنوز نیست', id: 44 });
    ok('v170.17.1: مسیر سایت نبود ← حکم همچنان در پاسخ، بی خطای درگاه', g4.ok && g4.data.verdict === 'review' && g4.data.pushed === false);
    ok('پرامپت متن را در گیومه دارد و خط تیره ندارد', /«گل سرخ»/.test(ebiCheckPrompt_('گل سرخ')) && !/[—–]/.test(ebiCheckPrompt_('x')));
  } catch (err) { fail++; out.push('❌ خطا: ' + (err.message || err) + ' ' + String(err.stack || '').split('\n')[1]); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box;
  return { pass: pass, fail: fail, text: out.join('\n') };
}
try { TG_SUITES.push(['کمپین C-004 (پلی‌لیست ابی)', 'ebiTests']); } catch (eSuEbi) {}

function ebiCodeTests() {
  var pass = 0, fail = 0, out = [];
  function ok(n, c, x) { if (c) pass++; else fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !x ? '' : ' · ' + String(x).slice(0, 240))); }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_ };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  function msgs(chat) { return TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && (!chat || String(x.chat) === String(chat)); }); }
  function last(chat) { var a = msgs(chat); return a[a.length - 1] || {}; }
  function P(chat, text, extra) { var m = Object.assign({ chat: { id: chat, type: 'private' }, from: { id: chat, first_name: 'کاربر' }, text: text, message_id: 50 }, extra || {}); return ebiRoute_(m, chat, 'کاربر', ''); }
  var calls = [];
  try {
    TG_CFG_ = Object.assign({}, TG_CFG_ || {}); TG_CFG_[EBI_CFG_LEADS] = ['7000101', '7000102'];
    ok('راهبران از تنظیمات، نه کد', JSON.stringify(ebiLeads_()) === '["7000101","7000102"]' && ebiIsLead_('7000102') && !ebiIsLead_('7000103'));
    ok('کلیدها اختیاری و توضیح‌دار', CFG_OPTIONAL.indexOf(EBI_CFG_LEADS) > -1 && !!CFG_NOTE[EBI_CFG_LEADS] && (EBI_CFG_LEADS in TG_CFG_SEEN));
    /* v170.16.3: فهرست راهبران فقط با کلید دوم درگاه */
    TG_MEM['pb:key'] = 'tjk_' + 'e'.repeat(48); TG_MEM['pb:key2'] = 'k'.repeat(40);
    var g1 = pbGateway_({ api: 1, key: TG_MEM['pb:key'], action: 'ebi_mods' }), g2 = pbGateway_({ api: 1, key: 'k'.repeat(40), action: 'ebi_mods' });
    ok('ebi_mods با کلید اول رد و با کلید دوم فهرست راهبران', !g1.ok && g1.error === 'key2_only' && g2.ok && JSON.stringify(g2.data.mods) === '["7000101","7000102"]', JSON.stringify([g1, g2]));
    TG_MEM['ebi:wp'] = function (method, path, body) {
      calls.push(method + ' ' + path);
      if (path === 'ebi-people' && method === 'POST') return body.start === 'ebi12-abcdef' || body.start === 'ebi77-0a0b0c' ? { ok: true, id: 12, kind: body.start === 'ebi77-0a0b0c' ? 'therapist' : 'night', name: 'x' } : { ok: false, error: 'bad_sig' };
      if (path === 'ebi-join') return body.phone.replace(/\D/g, '').length >= 10 ? { ok: true, start: 'ebi77-0a0b0c' } : { ok: false, msg: 'شمارهٔ تماس را کامل بنویسید.' };
      if (path === 'ebi-people' && method === 'GET') return { ok: true, items: [{ id: 12, date: '2026-10-05 10:00:00', kind: 'night', name: 'نفر یک', phone: '09120000001', src: 'site', chat_id: '6001' }, { id: 13, date: '2026-10-05 11:00:00', kind: 'student', name: 'نفر دو', phone: '09120000002', src: 'bot' }] };   // pii:ok ساختگی
      if (path === 'ebi-list' && method === 'POST') return { ok: true };
      if (path === 'ebi-list' && method === 'GET') return { ok: true, items: [{ text: 'یک' }, { title: 'دو' }, 'سه', { text: 'چهار' }] };
      return { ok: false, error: 'x' };
    };
    /* اتصال با کد امضاشده */
    ok('ebi<id>-<hex>: اتصال و خوش‌آمد شب', P(6001, '/start ebi12-abcdef') === true && calls.indexOf('POST ebi-people') > -1 && /شب‌های تجربه ثبت شد/.test(msgs(6001)[0].text) && tgGetVal_('ebisrc', 6001) === 'night');
    ok('آینه بعد از اتصال: بی شماره', TG_MEM['ebi:mirror'].length === 2 && JSON.stringify(TG_MEM['ebi:mirror']).indexOf('0912') < 0 && TG_MEM['ebi:mirror'][0][4] === 'بله' && TG_MEM['ebi:mirror'][1][4] === 'نه' && TG_MEM['ebi:mirror'][0][1] === 'شب اجرای تجربه');
    ok('هر پیام دکمه دارد', msgs(6001).every(function (x) { return !!x.markup; }));
    TG_OUTBOX = [];
    ok('امضای نادرست: پیام روشن، بی خطا در «خطاها»', P(6002, '/start ebi12-ffffff') === true && /معتبر نیست/.test(last(6002).text) && !(TG_MEM['errs'] || []).some(function (e) { return /ebiLink_/.test(e.where); }));
    /* ثبت‌نام از بات */
    TG_OUTBOX = [];
    ok('ebi-therapist: نام می‌پرسد', P(6003, '/start ebi-therapist') === true && /نام و نام خانوادگی/.test(last(6003).text) && tgGetVal_('ebij', 6003) === 'therapist|n');
    ok('شماره به‌جای نام پذیرفته نمی‌شود', P(6003, '09120000003') === true && tgGetVal_('ebij', 6003) === 'therapist|n');   // pii:ok ساختگی
    P(6003, 'سارا نمونه');
    ok('بعد از نام، دکمهٔ اشتراک شماره', JSON.stringify(last(6003).markup).indexOf('request_contact') > -1 && tgGetVal_('ebij', 6003) === 'therapist|p|سارا نمونه');
    ok('شمارهٔ کس دیگر رد می‌شود', P(6003, '', { contact: { phone_number: '+989120000004', user_id: 999 } }) === true && /شمارهٔ خودتان/.test(last(6003).text));   // pii:ok ساختگی
    ok('شمارهٔ کوتاه: خطای سایت نشان داده می‌شود و حالت می‌ماند', P(6003, '0912 000') === true && tgGetVal_('ebij', 6003).indexOf('therapist|p') === 0);
    calls = [];
    ok('شمارهٔ خودش: ebi-join با src=bot، اتصال، خوش‌آمد درمانگر با دکمهٔ ویس', P(6003, '', { contact: { phone_number: '+989120000003', user_id: 6003 } }) === true &&   // pii:ok ساختگی
      calls[0] === 'POST ebi-join' && calls[1] === 'POST ebi-people' && !tgGetVal_('ebij', 6003) && msgs(6003).some(function (x) { return /ebi:v:go/.test(JSON.stringify(x.markup || '')); }));
    var jb = TG_OUTBOX.filter(function (x) { return x.kind === 'ebiwp' && x.path === 'ebi-join'; })[0];
    ok('بدنهٔ ebi-join: نوع، نام، شماره، src', jb.body.kind === 'therapist' && jb.body.name === 'سارا نمونه' && jb.body.src === 'bot' && /0000003/.test(jb.body.phone));
    ok('منبع لید بعدی: کمپین › C-004 › therapist', ebiLeadPrefill_({ source: 'Telegram bot', note: 'chat_id: 6003' }).source === 'کمپین › C-004 › therapist');
    ok('منبع لید دیگران دست نمی‌خورد', ebiLeadPrefill_({ source: 'Telegram bot', note: 'chat_id: 6999' }).source === 'Telegram bot' && ebiLeadPrefill_({ source: 'سایت › پذیرش › فرم', note: 'chat_id: 6003' }).source === 'سایت › پذیرش › فرم');
    ok('tgSection_ لید کمپین را لید پذیرش می‌داند (کشیک خبر می‌گیرد)', tgSection_('کمپین › C-004 › night', '') === 'پذیرش' && tgDutyClinic_({ src: 'کمپین › C-004 › night', memo: '' }) === true && tgSection_('سایت › مدرسه › فرم', '') === 'مدرسه');
    TG_OUTBOX = [];
    ok('انصراف وسط ثبت‌نام', P(6005, '/start ebi-night') && P(6005, '↩️ انصراف') === true && !tgGetVal_('ebij', 6005));
    ok('دستور وسط ثبت‌نام حالت را می‌بندد و مسیر عادی می‌رود', P(6006, '/start ebi-crisis') && P(6006, '/menu') === false && !tgGetVal_('ebij', 6006));
    /* همراهان فهرست */
    TG_OUTBOX = [];
    ok('ebi-list: خوش‌آمد و برچسب', P(6007, '/start ebi-list') === true && TG_MEM['ebi:labels']['6007'] === 'همراه کمپین ابی' && /خوش آمدید/.test(last(6007).text));
    ebiCb_({}, 6007, 'ebi:l:w');
    ok('نوشتن مورد: کوتاه رد می‌شود', P(6007, 'هی') === true && tgGetVal_('ebil', 6007) === 'w');
    calls = [];
    ok('نوشتن مورد: POST ebi-list بی‌نام با src=bot', P(6007, 'صدای باران روی پنجره') === true && calls[0] === 'POST ebi-list' && !tgGetVal_('ebil', 6007) &&
      TG_OUTBOX.filter(function (x) { return x.kind === 'ebiwp' && x.path === 'ebi-list' && x.method === 'POST'; })[0].body.anon === 1);
    TG_OUTBOX = []; ebiCb_({}, 6007, 'ebi:l:r');
    ok('سه مورد آخر', /یک/.test(last(6007).text) && /دو/.test(last(6007).text) && /سه/.test(last(6007).text) && !/چهار/.test(last(6007).text));
    /* ویس */
    TG_OUTBOX = [];
    ok('ebi-voice: ویس می‌خواهد', P(6008, '/start ebi-voice') === true && tgGetVal_('ebiv', 6008) === 'w');
    ok('متن خیلی کوتاه پذیرفته نمی‌شود', P(6008, 'سلام') === true && tgGetVal_('ebiv', 6008) === 'w');
    var mv = { chat: { id: 6008 }, from: { id: 6008, first_name: 'درمانگر' }, voice: { file_id: 'VF1' }, message_id: 77 };
    ok('ویس: ردیف در تب ویس‌ها با لینک درایو', ebiRoute_(mv, 6008, 'درمانگر', '') === true && TG_MEM['pb:' + EBI_VOICE_TAB].length === 1 && /dry-file:VF1/.test(TG_MEM['pb:' + EBI_VOICE_TAB][0]['لینک فایل']) && TG_MEM['pb:' + EBI_VOICE_TAB][0]['اجازهٔ انتشار'] === EBI_PERM.w);
    ok('دو دکمهٔ اجازه', JSON.stringify(last(6008).markup).indexOf('ebi:v:y:V-1001') > -1 && JSON.stringify(last(6008).markup).indexOf('ebi:v:n:V-1001') > -1);
    TG_OUTBOX = []; TG_MEM['notify'] = [];
    ebiCb_({}, 6008, 'ebi:v:y:V-1001');
    ok('اجازه ثبت و به هر دو راهبر رفت، با کپی ویس', TG_MEM['pb:' + EBI_VOICE_TAB][0]['اجازهٔ انتشار'] === EBI_PERM.y &&
      TG_MEM['notify'].filter(function (x) { return x.ref === 'C-004'; }).length === 2 && TG_OUTBOX.filter(function (x) { return x.kind === 'copy'; }).length === 2);
    TG_MEM['notify'] = [];
    ebiCb_({}, 6008, 'ebi:v:n:V-1001');
    ok('تغییر نظر: ستون عوض می‌شود، پیام دوباره به راهبران نمی‌رود', TG_MEM['pb:' + EBI_VOICE_TAB][0]['اجازهٔ انتشار'] === EBI_PERM.n && !TG_MEM['notify'].length);
    ok('دکمهٔ اجازهٔ دیگری کار نمی‌کند', (function () { TG_OUTBOX = []; ebiCb_({}, 6009, 'ebi:v:y:V-1001'); return /پیدا نشد/.test(last(6009).text) && TG_MEM['pb:' + EBI_VOICE_TAB][0]['اجازهٔ انتشار'] === EBI_PERM.n; })());
    /* پایان کمپین از تنظیمات */
    TG_CFG_[EBI_CFG_END] = '1405-08-12';
    TG_MEM['ebi:today'] = '2026-11-03'; TG_OUTBOX = [];
    ok('در روز پایان هنوز باز است', !ebiEnded_());
    TG_MEM['ebi:today'] = '2026-11-04';
    ok('بعد از پایان: پیام «تمام شد» با دکمهٔ منو', ebiEnded_() && P(6010, '/start ebi-night') === true && /تمام شد/.test(last(6010).text) && /ebi:home/.test(JSON.stringify(last(6010).markup)) && !tgGetVal_('ebij', 6010));
    delete TG_MEM['ebi:today']; TG_CFG_[EBI_CFG_END] = '';
    /* برچسب‌ها و دادهٔ دکمه */
    ok('برچسب کد شروع', tgStartLabel_('ebi-night') === 'کمپین › C-004 › night' && /اتصال ثبت‌نام سایت/.test(tgStartLabel_('ebi12-abcdef')));
    ok('کد ناشناختهٔ ebi مسیر عادی', ebiStart_(6011, 'ebi-zzz', 'x', '') === false);
    ok('دادهٔ دکمه‌ها زیر ۶۴ بایت', ['ebi:v:y:V-1001', 'ebi:l:w', 'ebi:home'].every(function (d) { return tgCbBytes_(d) <= 64; }));
    ok('شکل‌های پاسخ فهرست', ebiListItems_({ data: [{ title: { rendered: '<b>الف</b>' } }] })[0] === 'الف' || ebiListItems_({ data: [{ text: 'الف' }] })[0] === 'الف');
    /* راه‌اندازی */
    var su = ebiSetup_();
    var st = TG_MEM['pb:' + PB_T_START].map(function (r) { return r['کد']; });
    ok('راه‌اندازی: کدها در «کدهای start»، تب ویس‌ها و آینه', EBI_FIXED_CODES.every(function (k) { return st.indexOf(k) > -1; }) && st.indexOf('ebi<id>-<6hex>') > -1 && /۲|2 نفر/.test(su), su);
    TG_MEM['stkp:x'] = 1;
    ok('کار ساعتی: بی جواب سایت، اعلام «آماده» نمی‌رود', (function () { var f = TG_MEM['ebi:wp']; TG_MEM['ebi:wp'] = function () { return { ok: false, _code: 404 }; }; TG_MEM['notify'] = []; ebiHourly_(); TG_MEM['ebi:wp'] = f; return !TG_MEM['notify'].length && pbProp_('EBI_SETUP') !== '17016'; })());
    ok('کار ساعتی: با جواب سایت، یک بار اعلام به هر دو راهبر', (function () { TG_MEM['notify'] = []; ebiHourly_(); ebiHourly_(); return TG_MEM['notify'].filter(function (x) { return /بات آماده شد/.test(x.text); }).length === 2 && pbProp_('EBI_SETUP') === '17016'; })());
    ok('راه‌اندازی دوباره ردیف تکراری نمی‌سازد', (function () { var n = TG_MEM['pb:' + PB_T_START].length; ebiSetup_(); return TG_MEM['pb:' + PB_T_START].length === n; })());
  } catch (err) { fail++; out.push('❌ خطا: ' + (err.message || err) + ' ' + String(err.stack || '').split('\n').slice(1, 3).join(' ')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg;
  return { pass: pass, fail: fail, text: out.join('\n') };
}
try { TG_SUITES.push(['کمپین C-004 · کدها و ویس (v170.16)', 'ebiCodeTests']); } catch (eSuEbi2) {}

function ebiNightTests() {
  var pass = 0, fail = 0, out = [];
  function ok(n, c, x) { if (c) pass++; else fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !x ? '' : ' · ' + String(x).slice(0, 240))); }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_ };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  function last(chat) { var a = TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && String(x.chat) === String(chat); }); return a[a.length - 1] || {}; }
  function P(chat, text) { return ebiRoute_({ chat: { id: chat }, from: { id: chat, first_name: 'ک' }, text: text }, chat, 'ک', ''); }
  try {
    TG_CFG_ = Object.assign({}, TG_CFG_ || {}); TG_CFG_[EBI_CFG_LEADS] = ['7000101', '7000102'];
    TG_MEM['ebi:today'] = '2026-10-10';
    TG_MEM['evall'] = [{ code: 'EV-2005', title: 'ژورنال کلاب', 'نوع': 'ژورنال کلاب', 'وضعیت': 'باز', 'تاریخ': '2026-10-20' }];
    TG_MEM['ebi:wp'] = function (m, path) {
      if (/^ebi-people\?kind=night/.test(path)) return { ok: true, items: [{ id: 1, kind: 'night', name: 'الف', chat_id: '6101' }, { id: 2, kind: 'night', name: 'ب', chat_id: '6102' }, { id: 3, kind: 'night', name: 'پ', phone: '09120000005' }] };   // pii:ok ساختگی
      if (path === 'ebi-people') return { ok: true, items: [{ kind: 'night', chat_id: '6101' }, { kind: 'student' }, { kind: 'night' }] };
      if (path === 'ebi-list') return { ok: true, items: [{ text: 'a' }, { text: 'b' }] };
      return { ok: false };
    };
    /* میز فقط برای راهبر */
    TG_OUTBOX = [];
    ok('غیرراهبر میز را نمی‌بیند', P(6200, '/ebi') === false && ebiDeskCb_(6200, ['ebi', 'd']) !== false && /راهبر کمپین/.test(last(6200).text));
    ok('راهبر با /ebi میز را می‌بیند؛ بی شب، دکمهٔ اعلام نیست', P(7000101, '/ebi') === true && /میز کمپین/.test(last(7000101).text) && JSON.stringify(last(7000101).markup).indexOf('ebi:an') < 0);
    /* شب تازه */
    ebiDeskCb_(7000101, ['ebi', 'nn', 'go']);
    ok('تاریخ گذشته رد می‌شود', P(7000101, '۱۴۰۵/۰۷/۰۱') === true && /گذشته/.test(last(7000101).text));
    P(7000101, '۱۴۰۵/۰۷/۲۰'); P(7000101, '۱۹:۳۰');
    ok('ظرفیت نادرست رد می‌شود', P(7000101, 'زیاد') === true && /عدد/.test(last(7000101).text));
    P(7000101, '۲');
    ok('خلاصه با تأیید و انصراف', /ثبت شود/.test(last(7000101).text) && /ebi:nn:ok/.test(JSON.stringify(last(7000101).markup)));
    ebiDeskCb_(7000101, ['ebi', 'nn', 'ok']);
    var nights = ebiNights_(true);
    ok('شب در موتور رویداد با نوع «شب تجربه» و کمپین C-004', nights.length === 1 && nights[0]['نوع'] === 'شب تجربه' && nights[0]['کمپین'] === 'C-004' && nights[0]['ظرفیت'] === 2 && nights[0].code === 'EV-2006', JSON.stringify(nights[0]));
    var NC = nights[0].code;
    ok('شب در API و فهرست رویدادهای مدرسه نمی‌آید', (function () { var a = tgApiEvents_({}); return a.events.every(function (e) { return e.code !== NC; }) && a.events.some(function (e) { return e.code === 'EV-2005'; }); })());
    ok('شب در پیام بازخورد بعد از رویداد نمی‌آید', ebiIsNightEv_(nights[0]) && !ebiIsNightEv_(TG_MEM['evall'][0]));
    /* اعلام */
    TG_OUTBOX = []; TG_MEM['notify'] = [];
    ebiDeskCb_(7000101, ['ebi', 'an', '0']);
    var inv = TG_MEM['notify'].filter(function (x) { return x.kind === 'دعوت'; });
    ok('اعلام: به افراد شب با chat، نوع «دعوت»، با دکمهٔ هر شب', inv.length === 2 && TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && x.chat === '6101'; }).some(function (x) { return JSON.stringify(x.markup).indexOf('ebi:nb:' + NC) > -1; }));
    ok('بی chat ← فهرست برای هر دو راهبر', TG_MEM['notify'].filter(function (x) { return /بی تلگرام/.test(x.text); }).length === 2);
    /* انتخاب با ظرفیت */
    TG_OUTBOX = [];
    ebiDeskCb_(6101, ['ebi', 'nb', NC]);
    ok('انتخاب شب ثبت می‌شود (منبع C-004)', ebiRegsOf_(NC).length === 1 && ebiRegsOf_(NC)[0][6] === 'C-004' && /جای شما ثبت شد/.test(last(6101).text));
    ebiDeskCb_(6101, ['ebi', 'nb', NC]);
    ok('دوباره زدن ثبت تکراری نمی‌سازد', ebiRegsOf_(NC).length === 1 && /قبلاً/.test(last(6101).text));
    ebiDeskCb_(6102, ['ebi', 'nb', NC]);
    ebiDeskCb_(6103, ['ebi', 'nb', NC]);
    ok('ظرفیت پر: نفر سوم ثبت نمی‌شود', ebiRegsOf_(NC).length === 2 && /پر شد/.test(last(6103).text));
    ebiDeskCb_(6102, ['ebi', 'nc', NC]);
    ok('لغو جای خالی می‌کند', ebiRegsOf_(NC).length === 1 && /لغو شد/.test(last(6102).text));
    ebiDeskCb_(6103, ['ebi', 'nb', NC]);
    ok('بعد از لغو، نفر بعدی ثبت می‌شود', ebiRegsOf_(NC).length === 2);
    /* یادآوری ظهر و ۲۱ */
    TG_MEM['ebi:today'] = '2026-10-12'; TG_MEM['notify'] = [];
    ebiHourly2_('2026-10-12', 12);
    ok('ظهر روز شب: یادآوری به ثبت‌نامی‌ها، یک بار', TG_MEM['notify'].filter(function (x) { return x.kind === 'یادآوری'; }).length === 2 && (function () { ebiHourly2_('2026-10-12', 13); return TG_MEM['notify'].filter(function (x) { return x.kind === 'یادآوری'; }).length === 2; })());
    TG_MEM['notify'] = [];
    ebiHourly2_('2026-10-12', 21); ebiHourly2_('2026-10-12', 22);
    ok('v170.19: ساعت ۲۱ و بعد یادآوری برای راهبران نمی‌رود و کلید چک‌لیست نیست', !TG_MEM['notify'].some(function (x) { return /امشب شب تجربه/.test(x.text); }) && typeof EBI_CFG_CHECK === 'undefined' && !(('چک‌لیست شب C-004') in TG_CFG_SEEN));
    /* گزارش */
    TG_MEM['ebi:leadsrc'] = ['کمپین › C-004 › night', 'Telegram bot', 'کمپین › C-004 › student'];
    var rp = ebiReport_(false);
    ok('گزارش: فهرست، ثبت‌نام به تفکیک، ویس، لید C-004', /موردهای فهرست: <b>۲<\/b>/.test(rp) && /ثبت‌نام‌ها: <b>۳<\/b>/.test(rp) && /شب اجرای تجربه: ۲/.test(rp) && /لیدهای کمپین در «لیدها»: ۲/.test(rp), rp);
    /* پایان */
    TG_CFG_[EBI_CFG_END] = '1405-08-12'; TG_MEM['ebi:today'] = '2026-11-05'; TG_MEM['notify'] = [];
    ok('بعد از پایان: دکمهٔ اعلام پنهان', JSON.stringify(ebiDeskKb_()).indexOf('ebi:an') < 0);
    ebiHourly2_('2026-11-05', 10); ebiHourly2_('2026-11-05', 11);
    ok('گزارش نهایی یک بار برای هر دو راهبر', TG_MEM['notify'].filter(function (x) { return /گزارش نهایی/.test(x.text); }).length === 2);
    TG_OUTBOX = []; ebiDeskCb_(6104, ['ebi', 'nb', NC]);
    ok('بعد از پایان انتخاب شب بسته است', /تمام شد/.test(last(6104).text));
    ok('دادهٔ دکمه‌ها زیر ۶۴ بایت', ['ebi:nb:EV-20061', 'ebi:nc:EV-20061', 'ebi:an:1500', 'ebi:nl:EV-20061'].every(function (d) { return tgCbBytes_(d) <= 64; }));
  } catch (err) { fail++; out.push('❌ خطا: ' + (err.message || err) + ' ' + String(err.stack || '').split('\n').slice(1, 3).join(' ')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg;
  return { pass: pass, fail: fail, text: out.join('\n') };
}
try { TG_SUITES.push(['کمپین C-004 · شب‌ها و گزارش (v170.17)', 'ebiNightTests']); } catch (eSuEbi3) {}

