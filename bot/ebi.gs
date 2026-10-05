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

function ebiCheck_(p, dry) {
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
} catch (eEbiReg) {}

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
    ok('پرامپت متن را در گیومه دارد و خط تیره ندارد', /«گل سرخ»/.test(ebiCheckPrompt_('گل سرخ')) && !/[—–]/.test(ebiCheckPrompt_('x')));
  } catch (err) { fail++; out.push('❌ خطا: ' + (err.message || err) + ' ' + String(err.stack || '').split('\n')[1]); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box;
  return { pass: pass, fail: fail, text: out.join('\n') };
}
try { TG_SUITES.push(['کمپین C-004 (پلی‌لیست ابی)', 'ebiTests']); } catch (eSuEbi) {}
