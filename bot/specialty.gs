/**
 * specialty.gs · v170.62 تا v170.64 · ۲۲ مهر ۱۴۰۵ · پنج خط خدمت تخصصی: ستون‌های «درمانگران»، استخرها، مچ‌میکینگ و برچسب لید
 *
 * خط‌ها: سکسولوژی · پیش از ازدواج و زوج · جدایی و طلاق · کودک و نوجوان · سوگ.
 * ۱) سه ستون تازه در انتهای تب «درمانگران» (با نام هدر، tgTherCol_): «خدمات تخصصی» (چندمقداری با «،»)، «مسیر»، «متن تخصصی (پیش‌نویس)».
 * ۲) شش ستون استخر تازه در تب «استخرها»، بعد از «یادداشت» (۱۸ تا ۲۳). ستون‌های ۱ تا ۱۷ و شماره‌هایشان همان می‌ماند.
 *    زوج‌درمانی همان استخر «زوج و رابطه» (ستون ۱۰) است. خانهٔ خالی از «خدمات تخصصی» با «۲ – معمول» پر می‌شود؛
 *    اولویتی که مسئول پذیرش گذاشته دست نمی‌خورد.
 * ۳) مچ‌میکینگ: اگر نوع درخواست یکی از این خط‌هاست (کلید spk چت یا over.kind)، اول همان استخر خدمت فیلتر می‌شود؛
 *    اگر کسی در آن استخر وقت آزاد نداشت، همان قاعدهٔ قبلی (موضوع، خارج از ایران، اولویت) اجرا می‌شود و مسیر رزرو قفل نمی‌شود.
 *    هشدار ارجاع لید فقط وقتی است که استخر آن خط عضو دارد.
 */
var SP_LINES = [
  { key: 'sex',   name: 'سکسولوژی',          col: 18 },
  { key: 'pre',   name: 'پیش از ازدواج',      col: 19 },
  { key: 'div',   name: 'جدایی و طلاق',       col: 20 },
  { key: 'k12',   name: 'کودک زیر ۱۲',        col: 21 },
  { key: 'teen',  name: 'نوجوان ۱۲ تا ۱۷',    col: 22 },
  { key: 'grief', name: 'سوگ',               col: 23 }
];
var SP_POOL_FIRST = 18, SP_POOL_LAST = 23;
/* مقدارهای ستون «خدمات تخصصی» و «مسیر» */
var SP_SVC = ['سکسولوژی', 'پیش از ازدواج', 'زوج‌درمانی', 'جدایی و طلاق', 'کودک زیر ۱۲', 'نوجوان ۱۲ تا ۱۷', 'سوگ'];
var SP_PATH = ['تحلیلی', 'شناختی با تست', 'هر دو'];
var SP_COL_SVC = 'خدمات تخصصی', SP_COL_PATH = 'مسیر', SP_COL_TEXT = 'متن تخصصی (پیش‌نویس)';
/* نوع درخواست لید ← کلید استخر. زوج‌درمانی استخر موجود «زوج و رابطه» است */
var SP_KIND_POOL = { 'سکسولوژی': 'sex', 'پیش از ازدواج': 'pre', 'جدایی و طلاق': 'div', 'کودک زیر ۱۲': 'k12', 'نوجوان ۱۲ تا ۱۷': 'teen', 'سوگ': 'grief' };

function spSq_(x) { return String(x == null ? '' : x).replace(/[\s‌]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }
function spLine_(key) { for (var i = 0; i < SP_LINES.length; i++) if (SP_LINES[i].key === key) return SP_LINES[i]; return null; }
function spPoolName_(key) { var l = spLine_(key); return l ? l.name : ''; }
/* نوع درخواست ← کلید استخر خط تخصصی ('' اگر خط تخصصی نیست) */
function spKeyOfKind_(kind) {
  var q = spSq_(kind);
  if (!q) return '';
  for (var k in SP_KIND_POOL) if (spSq_(k) === q) return SP_KIND_POOL[k];
  return '';
}
/* «خدمات تخصصی» یک درمانگر ← {key: true}؛ زوج‌درمانی ← rel */
function spSvcKeys_(svc) {
  var out = {}, parts = String(svc || '').split(/[،,]/).map(spSq_).filter(String);
  parts.forEach(function (p) {
    for (var k in SP_KIND_POOL) if (spSq_(k) === p) out[SP_KIND_POOL[k]] = true;
    if (p === spSq_('زوج‌درمانی')) out.rel = true;
  });
  return out;
}
/* سطر تب «استخرها» ← اولویت هر استخر تخصصی (برای tgPoolMap_) */
function spPoolRec_(row, rec) {
  SP_LINES.forEach(function (l) { var p = tgPoolPri_(row[l.col - 1]); if (p) rec[l.key] = p; });
  return rec;
}

/* چت یا over ← کلید استخر تخصصی */
function spPoolKeyOf_(chat, over) {
  if (over) return spKeyOfKind_(over.kind);
  if (!chat) return '';
  try { return spKeyOfKind_(tgGetVal_('spk', chat)); } catch (e) { return ''; }
}
/* اول استخر خدمت؛ اگر خالی ماند null تا tgPoolFilter_ همان قاعدهٔ قبلی را اجرا کند */
function spPoolFirst_(slots, chat, over, map, abroad) {
  var key = spPoolKeyOf_(chat, over);
  if (!key) return null;
  function rec(s) { return map[tgNorm_(s.therapist)] || null; }
  function distinct(list) { var s = {}, n = 0; list.forEach(function (x) { if (!s[x.therapist]) { s[x.therapist] = 1; n++; } }); return n; }
  var cand = slots.filter(function (s) { var r = rec(s); return r && r[key]; });
  if (abroad) cand = cand.filter(function (s) { var r = rec(s); return r && r.abroad; });
  if (!cand.length) return null;
  for (var p = 1; p <= 3; p++) {
    var tier = cand.filter(function (s) { return rec(s)[key] <= p; });
    if (distinct(tier) >= 2) return tier;
  }
  return cand;
}
/* هشدار ارجاع: نوع درخواست خط تخصصی و استخرش عضو دارد */
function spReferNeed_(kind) {
  var key = spKeyOfKind_(kind);
  if (!key) return '';
  return tgPoolNames_(key).length ? key : '';
}

/* ستون‌های تازهٔ «درمانگران» و «استخرها» (یک‌باره و بی‌خطر برای اجرای دوباره) */
function spSetup_() {
  var out = [];
  [SP_COL_SVC, SP_COL_PATH, SP_COL_TEXT].forEach(function (h) { out.push(h + ': ستون ' + tgTherCol_(h)); });
  out.push(spPoolEnsure_());
  return out.join(' · ');
}
function spPoolEnsure_() {
  var sh = tgSS_().getSheetByName(TG_POOLS_TAB);
  if (!sh || sh.getLastRow() < 3) return 'تب استخرها نیست';
  if (sh.getMaxColumns() < SP_POOL_LAST) sh.insertColumnsAfter(sh.getMaxColumns(), SP_POOL_LAST - sh.getMaxColumns());
  var head = sh.getRange(3, SP_POOL_FIRST, 1, SP_LINES.length).getValues()[0], made = 0;
  SP_LINES.forEach(function (l, i) {
    var h = String(head[i] || '').trim();
    if (!h) { sh.getRange(3, l.col).setValue(l.name).setFontWeight('bold').setBackground('#fbe9ea').setWrap(true); made++; }
    else if (h !== l.name) throw new Error('ستون ' + l.col + ' استخرها از قبل «' + h + '» است');
    sh.setColumnWidth(l.col, 105);
  });
  var n = sh.getLastRow() - 3;
  if (n > 0) {
    var pri = SpreadsheetApp.newDataValidation().requireValueInList(TG_POOL_PRI, true).setAllowInvalid(false).build();
    sh.getRange(4, SP_POOL_FIRST, n, SP_LINES.length).setDataValidation(pri);
  }
  var filled = spPoolSyncAll_();
  CacheService.getScriptCache().remove('pools');
  return 'استخرهای تخصصی: ' + made + ' ستون تازه · ' + filled + ' خانه از «خدمات تخصصی» پر شد';
}
/* نام نرمال‌شده ← کلیدهای «خدمات تخصصی» از تب «درمانگران» */
function spTherSvc_() {
  if (TG_DRY) return TG_MEM['sp:svc'] || {};
  var ts = tgSS_().getSheetByName(TG_THER), out = {};
  if (!ts || ts.getLastRow() < 4) return out;
  var hd = ts.getRange(3, 1, 1, ts.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var cs = hd.indexOf(SP_COL_SVC);
  if (cs < 0) return out;
  ts.getRange(4, 1, ts.getLastRow() - 3, cs + 1).getValues().forEach(function (r) { var nm = tgNorm_(String(r[0] || '')); if (nm) out[nm] = spSvcKeys_(r[cs]); });
  return out;
}
/* «خدمات تخصصی» ← خانه‌های خالی استخرها با «۲ – معمول»، فقط درمانگر فعال. اولویت موجود دست نمی‌خورد */
function spPoolSyncAll_(onlyName) {
  var ps = tgSS_().getSheetByName(TG_POOLS_TAB);
  if (!ps || ps.getLastRow() < 4) return 0;
  var svc = spTherSvc_();
  var width = Math.min(ps.getMaxColumns(), SP_POOL_LAST);
  var pv = ps.getRange(4, 1, ps.getLastRow() - 3, width).getValues(), n = 0;
  var cols = SP_LINES.map(function (l) { return { key: l.key, col: l.col }; }).concat([{ key: 'rel', col: 10 }]);
  for (var i = 0; i < pv.length; i++) {
    var nm = tgNorm_(String(pv[i][0] || ''));
    if (!nm || !svc[nm] || (onlyName && nm !== tgNorm_(onlyName))) continue;
    if (String(pv[i][1] || '').trim() !== 'فعال') continue;
    cols.forEach(function (c) {
      if (!svc[nm][c.key] || c.col > width || String(pv[i][c.col - 1] || '').trim()) return;
      ps.getRange(i + 4, c.col).setValue(TG_POOL_PRI[1]); n++;
    });
  }
  if (n) CacheService.getScriptCache().remove('pools');
  return n;
}

/* یک‌باره v170.62: ستون‌ها و استخرهای تازه */
function tgV17062SpSetup() { return spSetup_(); }

/* ============================================================================
   بخش ۲ (v170.63): برچسب لید. «نوع درخواست» لید این خط‌ها مقدار خودش را می‌گیرد تا جدا شمرده و درست ارجاع شود.
   مقدارهای تازه: پیش از ازدواج · زوج‌درمانی · جدایی و طلاق · سکسولوژی · کودک زیر ۱۲ · نوجوان ۱۲ تا ۱۷ · سوگ.
   «کودک و نوجوان» برای سطرهای گذشته می‌ماند. فقط لید تازه برچسب می‌گیرد؛ سطرهای گذشته دست نمی‌خورند.
   منبع‌ها به ترتیب: کد شروع (th_pre و …، کلید grief صفحهٔ شروع تراپی) ← need فرم سایت ← کلیدواژهٔ روشن در متن.
   ============================================================================ */
var SP_KINDS_NEW = ['پیش از ازدواج', 'زوج‌درمانی', 'جدایی و طلاق', 'سکسولوژی', 'کودک زیر ۱۲', 'نوجوان ۱۲ تا ۱۷', 'سوگ'];
/* need فرم سایت (موضوع: need:<کلید> در یادداشت، اسنیپت ۵۰۱۱۴۳) */
var SP_NEED = { premarital: 'پیش از ازدواج', couple: 'زوج‌درمانی', divorce: 'جدایی و طلاق', sex: 'سکسولوژی', kid: 'کودک زیر ۱۲', teen: 'نوجوان ۱۲ تا ۱۷', grief: 'سوگ' };
/* کدهای شروع تازه: همان مسیر th_cpl، نوع درخواست از پیش پر */
var SP_START = { th_pre: 'پیش از ازدواج', th_div: 'جدایی و طلاق', th_sex: 'سکسولوژی', th_kid: 'کودک زیر ۱۲', th_teen: 'نوجوان ۱۲ تا ۱۷', th_grf: 'سوگ' };
var SP_START_LABEL = { th_pre: 'خدمات › پیش از ازدواج', th_div: 'خدمات › جدایی و طلاق', th_sex: 'خدمات › سکسولوژی', th_kid: 'خدمات › کودک زیر ۱۲', th_teen: 'خدمات › نوجوان ۱۲ تا ۱۷', th_grf: 'خدمات › سوگ' };
/* کلیدواژه‌های روشن در متن مراجع (فقط وقتی نوع درخواست خالی یا عمومی است). کودک و نوجوان عمداً نیست: «کودک درون» و «دوران نوجوانی» */
var SP_KW = [
  [/سکسولوژ|سکس ?تراپ|سکس‌تراپ|مشکلات? جنسی|درمان جنسی|اختلال جنسی/, 'سکسولوژی'],
  [/پیش از ازدواج|قبل از ازدواج|مشاوره\S* ازدواج/, 'پیش از ازدواج'],
  [/طلاق/, 'جدایی و طلاق'],
  [/زوج ?درمانی|زوج‌درمانی/, 'زوج‌درمانی'],
  [/سوگ|داغدار|از دست دادن عزیز|فوت (پدر|مادر|همسر|فرزند|عزیز)/, 'سوگ']
];
var SP_GENERIC = ['', 'تراپی فردی', 'نامشخص'];

/* واژگان کد (پشتیبان وقتی تب خالی است) و قاعده‌های نرمال‌سازی: مقدار تازه پیش از قاعدهٔ کلی «کودک|نوجوان ← کودک و نوجوان» */
try {
  SP_KINDS_NEW.forEach(function (k) { if (V168_VOCAB['نوع درخواست'].indexOf(k) < 0) V168_VOCAB['نوع درخواست'].splice(V168_VOCAB['نوع درخواست'].length - 1, 0, k); });
  if (!V168_KIND_RULES.some(function (r) { return r[1] === 'کودک زیر ۱۲'; })) {
    V168_KIND_RULES.unshift([/کودکزیر/, 'کودک زیر ۱۲'], [/نوجوان[۱1][۲2]/, 'نوجوان ۱۲ تا ۱۷'], [/سکسولوژ|سکستراپ/, 'سکسولوژی'],
      [/پیشازازدواج/, 'پیش از ازدواج'], [/طلاق/, 'جدایی و طلاق'], [/^سوگ$/, 'سوگ']);
  }
  Object.keys(SP_START_LABEL).forEach(function (k) { if (!TG_START_MAP[k]) TG_START_MAP[k] = SP_START_LABEL[k]; });
} catch (eSpV) {}

/* شروع با کد تازه یا gt-grief: نوع درخواست این چت (spk) */
function spStartArg_(chat, arg) {
  var a = String(arg || '');
  var k = SP_START[a] || (a === 'gt-grief' ? 'سوگ' : '');
  if (k || spKindOfChat_(chat)) tgSetVal_('spk', chat, k);   /* کد شروع دیگر، برچسب قبلی را پاک می‌کند */
  return k;
}
function spKindOfChat_(chat) { try { return String(tgGetVal_('spk', chat) || ''); } catch (e) { return ''; } }
/* متن یا یادداشت ← نوع درخواست ('' اگر چیزی روشن نبود) */
function spKindOfText_(text, kind) {
  var t = String(text || ''), m = t.match(/need:([a-z]+)/);
  if (m && SP_NEED[m[1]]) return SP_NEED[m[1]];
  if (SP_GENERIC.indexOf(String(kind || '').trim()) < 0) return '';
  var q = t.replace(/‌/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  for (var i = 0; i < SP_KW.length; i++) if (SP_KW[i][0].test(q)) return SP_KW[i][1];
  return '';
}
/* tgAppendLead_ (لید تازه از هر مسیر): need فرم سایت یا کلیدواژهٔ روشن */
function spLeadPrefill_(o) {
  try {
    var k = spKindOfText_(String(o.note || '') + ' ' + String(o.firstText || ''), o.kind);
    if (k) o.kind = k;
  } catch (e) { tgErr_('spLeadPrefill_', e); }
  return o;
}
/* واژگان: مقدارهای تازه در فهرست «نوع درخواست» (فهرست کشویی تب «لیدها» همان ستون است) */
function spVocabAdd_() {
  var sh = tgSS_().getSheetByName(V168_T_VOCAB);
  if (!sh) return 'تب واژگان نیست';
  var hd = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var c = hd.indexOf('نوع درخواست') + 1;
  if (c < 1) return 'ستون «نوع درخواست» در واژگان نیست';
  var v = sh.getRange(2, c, Math.max(1, sh.getLastRow() - 1), 1).getValues().map(function (r) { return String(r[0] || '').trim(); });
  var have = v.filter(String), last = 0;
  v.forEach(function (x, i) { if (x) last = i + 1; });
  var add = SP_KINDS_NEW.filter(function (k) { return have.map(v168Squash_).indexOf(v168Squash_(k)) < 0; });
  if (add.length) sh.getRange(2 + last, c, add.length, 1).setValues(add.map(function (x) { return [x]; }));
  pbCacheDrop_('v168voc');
  return 'نوع درخواست: ' + add.length + ' مقدار تازه';
}
/* کدهای start: برچسب کدهای تازه در تب «کدهای start» */
function spStartRows_() {
  var have = {}; pbRows_('e', PB_T_START, PB_START_HEAD).forEach(function (r) { have[String(r['کد']).trim()] = 1; });
  var add = Object.keys(SP_START_LABEL).filter(function (k) { return !have[k]; }).map(function (k) { return { 'کد': k, 'برچسب': SP_START_LABEL[k] }; });
  pbAddMany_('e', PB_T_START, PB_START_HEAD, add);
  return 'کدهای start: ' + add.length + ' ردیف';
}
/* خشک: لیدهای فعلی که با همین قاعده‌ها برچسب تازه می‌گرفتند (فقط شمار، بی نوشتن) */
function spLabelDry() {
  var rows;
  if (TG_DRY) rows = TG_MEM['sp:leads'] || [];
  else { var sh = tgSS_().getSheetByName(TG_LEADS), last = sh.getLastRow(); rows = last < 2 ? [] : sh.getRange(2, 1, last - 1, 14).getValues(); }
  var by = {}, n = 0;
  rows.forEach(function (r) {
    if (!String(r[3] || '').trim() && !String(r[5] || '').trim()) return;
    var k = spKindOfText_(String(r[12] || '') + ' ' + String(r[7] || ''), String(r[13] || '').trim());
    if (!k || v168Squash_(k) === v168Squash_(r[13])) return;
    by[k] = (by[k] || 0) + 1; n++;
  });
  return 'برچسب تازه (خشک): ' + n + ' لید فعلی' + (n ? ' · ' + SP_KINDS_NEW.filter(function (k) { return by[k]; }).map(function (k) { return k + ' ' + by[k]; }).join('، ') : '') + ' · سطرهای گذشته عوض نمی‌شوند';
}
/* یک‌باره v170.63: واژگان و کدهای start، به‌اضافهٔ شمار خشک */
function tgV17063SpLabels() { return [spVocabAdd_(), spStartRows_(), spLabelDry()].join(' · '); }

/* ============================================================================
   بخش ۳ (v170.64): کودک و نوجوان در فرم پذیرش بات (تصمیم D49: هیچ‌کدام الزامی نیست)
   - نوع «کودک زیر ۱۲»: «پرکنندهٔ فرم والد یا سرپرست است؟» و سن کودک.
   - نوع «نوجوان ۱۲ تا ۱۷»: «والد در جریان هست و موافق است؟» (اختیاری).
   پرسش پیش از کشور و شماره می‌آید (tgQuizFinish_). جواب فقط در ستون «پرسش‌های والد» لید و کارت لید پذیرش دیده می‌شود.
   پذیرش خودش تصمیم می‌گیرد؛ هیچ مسیری قفل نمی‌شود.
   ============================================================================ */
var SP_COL_KIDQ = 'پرسش‌های والد';
var SP_SKIP = '⏭ رد کردن';
var SP_KQ = {
  par:  { t: 'پرکنندهٔ فرم والد یا سرپرست است؟', o: ['بله', 'خیر'], skip: true, lbl: 'پرکنندهٔ فرم والد یا سرپرست' },
  age:  { t: 'سن کودک؟', o: ['زیر ۳ سال', '۳ تا ۶ سال', '۷ تا ۹ سال', '۱۰ تا ۱۲ سال'], skip: true, lbl: 'سن کودک' },
  tpar: { t: 'والد در جریان هست و موافق است؟', o: ['بله', 'هنوز نه', 'ترجیح می‌دهم نگویم'], skip: false, lbl: 'والد در جریان و موافق' }
};
try { if (TG_LEAD_FIELDS.indexOf(SP_COL_KIDQ) < 0) TG_LEAD_FIELDS.push(SP_COL_KIDQ); } catch (eKq) {}
function spKidSeq_(chat) {
  var k = spKindOfChat_(chat);
  if (k === 'کودک زیر ۱۲') return ['par', 'age'];
  if (k === 'نوجوان ۱۲ تا ۱۷') return ['tpar'];
  return [];
}
/* پرسش بعدی را می‌فرستد؛ true اگر پرسید */
function spKidAsk_(chat) {
  var seq = spKidSeq_(chat);
  for (var i = 0; i < seq.length; i++) {
    var q = seq[i];
    if (tgGetVal_('kq' + q, chat)) continue;
    var Q = SP_KQ[q], rows = Q.o.map(function (o, j) { return [{ text: o, callback_data: 'kq:' + q + ':' + j }]; });
    if (Q.skip) rows.push([{ text: SP_SKIP, callback_data: 'kq:' + q + ':x' }]);
    tgSend_(chat, Q.t, { inline_keyboard: rows });
    return true;
  }
  return false;
}
/* دکمه‌ها: kq:<پرسش>:<شمارهٔ گزینه|x> */
function spKidCb_(chat, data) {
  var p = String(data).split(':'), q = p[1], Q = SP_KQ[q];
  if (!Q || tgGetVal_('kq' + q, chat)) return true;
  var v = p[2] === 'x' ? '-' : (Q.o[Number(p[2])] || '-');
  tgSetVal_('kq' + q, chat, v);
  if (v !== '-') tgSend_(chat, '✅ ' + tgEsc_(v));
  if (spKidAsk_(chat)) return true;
  if (typeof v1689Ask_ === 'function' && v1689Ask_(chat)) return true;
  tgAskPhone_(chat);
  return true;
}
/* از tgOnPhone_: جواب‌ها در ستون «پرسش‌های والد» */
function spKidExtras_(chat, extra) {
  try {
    var parts = [];
    spKidSeq_(chat).forEach(function (q) { var v = tgGetVal_('kq' + q, chat); if (v && v !== '-') parts.push(SP_KQ[q].lbl + ': ' + v); });
    if (parts.length) extra[SP_COL_KIDQ] = parts.join(' · ');
  } catch (e) { tgErr_('spKidExtras_', e); }
  return extra;
}

function spTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  function S(n) { return { therapist: n, dateIso: '2026-10-20', hhmm: '10:00' }; }
  function names(l) { return l.map(function (s) { return s.therapist; }).join('، '); }
  try {
    ok('نوع درخواست ← استخر خط (با نیم‌فاصله و فاصله)', spKeyOfKind_('سوگ') === 'grief' && spKeyOfKind_('نوجوان ۱۲ تا ۱۷') === 'teen' && spKeyOfKind_('پیش از ازدواج') === 'pre' && spKeyOfKind_('تراپی فردی') === '' && spKeyOfKind_('کودک و نوجوان') === '');
    var sk = spSvcKeys_('سکسولوژی، زوج‌درمانی، کودک زیر ۱۲');
    ok('خدمات تخصصی ← استخرها؛ زوج‌درمانی همان «زوج و رابطه»', sk.sex && sk.rel && sk.k12 && !sk.grief, JSON.stringify(sk));
    var row = []; for (var i = 0; i < 23; i++) row.push(''); row[22] = '۱ – اول صف'; row[17] = '۳ – ذخیره';
    var rec = spPoolRec_(row, {});
    ok('سطر استخرها: ستون ۱۸ سکسولوژی و ۲۳ سوگ خوانده می‌شود', rec.grief === 1 && rec.sex === 3 && !rec.pre, JSON.stringify(rec));
    ok('ستون‌های استخر تازه بعد از «یادداشت» و پشت‌سرهم', SP_POOL_FIRST === TG_POOL_LAST + 1 && SP_LINES.every(function (l, i) { return l.col === SP_POOL_FIRST + i; }) && SP_POOL_LAST === SP_POOL_FIRST + SP_LINES.length - 1);

    var pm = {};
    pm[tgNorm_('سوگ‌کار الف')] = { ind: 2, grief: 1 };
    pm[tgNorm_('سوگ‌کار ب')] = { ind: 1, grief: 2 };
    pm[tgNorm_('فردی‌کار پ')] = { ind: 1 };
    TG_MEM['poolmap'] = pm;
    var slots = [S('فردی‌کار پ'), S('سوگ‌کار الف'), S('سوگ‌کار ب')];
    tgSetVal_('qt', 801, 'oth'); tgSetVal_('spk', 801, 'سوگ');
    var r1 = tgPoolFilter_(slots, 801);
    ok('مچ‌میکینگ: اول استخر خدمت (سوگ)، فردی‌کار بیرون', names(r1).indexOf('فردی‌کار پ') < 0 && r1.length === 2, names(r1));
    var r2 = tgPoolFilter_([S('فردی‌کار پ')], 801);
    ok('استخر خدمت خالی: همان قاعدهٔ قبلی، مسیر رزرو قفل نمی‌شود', r2.length === 1, names(r2));
    tgSetVal_('qt', 802, 'oth');
    var r0 = tgPoolFilter_(slots, 802);
    ok('بی خط تخصصی: رفتار قبلی دست‌نخورده (آبشار اولویت فردی)', names(r0).indexOf('فردی‌کار پ') > -1 && r0.length === 2, names(r0));
    ok('over.kind هم کار می‌کند (مینی‌اپ و آزمون)', tgPoolFilter_(slots, null, { topic: 'oth', kind: 'سوگ' }).length === 2);
    pm[tgNorm_('خارج‌بین')] = { ind: 1, grief: 1, abroad: true };
    TG_MEM['poolmap'] = pm;
    var r3 = tgPoolFilter_(slots.concat([S('خارج‌بین')]), null, { topic: 'oth', kind: 'سوگ', abroad: true });
    ok('خارج از ایران: فقط عضو استخر خارج در همان خط', names(r3) === 'خارج‌بین', names(r3));
    ok('برچسب استخر برای هشدار ارجاع', spPoolName_('div') === 'جدایی و طلاق' && spPoolName_('x') === '');

    /* بخش ۲: برچسب لید */
    ok('need فرم سایت ← نوع درخواست', spKindOfText_('موضوع: need:premarital | from:home', '') === 'پیش از ازدواج' && spKindOfText_('موضوع: need:teen', 'تراپی فردی') === 'نوجوان ۱۲ تا ۱۷' && spKindOfText_('need:anx', '') === '');
    ok('کلیدواژهٔ روشن فقط روی نوع عمومی', spKindOfText_('برای طلاق مشاوره می‌خواهم', 'تراپی فردی') === 'جدایی و طلاق' && spKindOfText_('برای طلاق', 'زوج‌درمانی') === '' && spKindOfText_('سکس‌تراپی', '') === 'سکسولوژی');
    ok('کودک درون و دوران نوجوانی برچسب نمی‌گیرد', spKindOfText_('کار روی کودک درون و دوران نوجوانی', '') === '');
    ok('نرمال‌سازی: «کودک زیر ۱۲» به «کودک و نوجوان» برنمی‌گردد', v168NormKind_('کودک زیر ۱۲') !== 'کودک و نوجوان' && v168NormKind_('نوجوان ۱۲ تا ۱۷') !== 'کودک و نوجوان' && v168NormKind_('کودک و نوجوان') === 'کودک و نوجوان', v168NormKind_('کودک زیر ۱۲'));
    TG_OUTBOX = [];
    tgAppendLead_({ source: 'سایت › پذیرش › شروع تراپی', name: 'نمونه', channel: 'فرم سایت', phone: '', region: 'داخل ایران', firstText: '', status: 'جدید', note: 'موضوع: need:divorce | from:home' });
    var ld = TG_OUTBOX.filter(function (x) { return x.kind === 'lead'; })[0];
    ok('لید تازهٔ فرم سایت با need:divorce ← «جدایی و طلاق»', ld && ld.o.kind === 'جدایی و طلاق', ld && ld.o.kind);
    ok('کد شروع th_kid ← نوع درخواست چت', spStartArg_(811, 'th_kid') === 'کودک زیر ۱۲' && spKindOfChat_(811) === 'کودک زیر ۱۲');
    spStartArg_(811, 'home_hero');
    ok('کد شروع دیگر برچسب قبلی را پاک می‌کند', spKindOfChat_(811) === '');
    ok('gt-grief ← سوگ؛ th_cpl دست‌نخورده', spStartArg_(812, 'gt-grief') === 'سوگ' && spStartArg_(813, 'th_cpl') === '' && TG_START_MAP.th_cpl === 'خدمات › زوج');
    ok('برچسب کد شروع تازه', tgStartLabel_('th_teen') === 'خدمات › نوجوان ۱۲ تا ۱۷' && tgStartLabel_('th_grf') === 'خدمات › سوگ');
    var L = function (name, kind, note, txt) { var r = []; for (var z = 0; z < 14; z++) r.push(''); r[3] = name; r[7] = txt || ''; r[12] = note || ''; r[13] = kind; return r; };
    TG_MEM['sp:leads'] = [L('الف', '', 'موضوع: need:sex'), L('ب', 'تراپی فردی', '', 'برای سوگ پدرم'), L('پ', 'سکسولوژی', 'need:sex'), L('', '', 'need:kid'), L('ت', 'زوج‌درمانی', '', 'طلاق')];
    var dr = spLabelDry();
    ok('خشک: شمار برچسب تازهٔ لیدهای فعلی، بی نام', /: 2 لید/.test(dr) && /سکسولوژی 1/.test(dr) && /سوگ 1/.test(dr) && dr.indexOf('الف') < 0, dr);

    /* بخش ۳: کودک و نوجوان در فرم پذیرش */
    var lastT = function () { var m = TG_OUTBOX.filter(function (x) { return x.text; }); return m.length ? m[m.length - 1] : {}; };
    TG_OUTBOX = []; spStartArg_(901, 'th_kid');
    tgQuizFinish_(901, 'on');
    var m1 = lastT();
    ok('کودک زیر ۱۲: پیش از شماره «پرکنندهٔ فرم والد یا سرپرست است؟» با «رد کردن»', m1.text === SP_KQ.par.t && JSON.stringify(m1.markup || m1.kb || m1).indexOf('kq:par:x') > -1, JSON.stringify(m1).slice(0, 200));
    spKidCb_(901, 'kq:par:0');
    ok('بعد: سن کودک', lastT().text === SP_KQ.age.t);
    spKidCb_(901, 'kq:age:x');
    ok('رد کردن سن: مسیر به کشور و شماره ادامه می‌دهد', lastT().text !== SP_KQ.age.t && tgGetVal_('kqage', 901) === '-');
    var ex1 = spKidExtras_(901, {});
    ok('جواب در ستون «پرسش‌های والد»؛ ردشده نمی‌آید', ex1[SP_COL_KIDQ] === 'پرکنندهٔ فرم والد یا سرپرست: بله', JSON.stringify(ex1));
    TG_OUTBOX = []; spStartArg_(902, 'th_teen'); tgQuizFinish_(902, 'on');
    ok('نوجوان: یک پرسش اختیاری با «ترجیح می‌دهم نگویم»', lastT().text === SP_KQ.tpar.t && JSON.stringify(lastT()).indexOf('kq:tpar:2') > -1);
    spKidCb_(902, 'kq:tpar:1');
    ok('نوجوان: «هنوز نه» ثبت می‌شود و مسیر قفل نمی‌شود', spKidExtras_(902, {})[SP_COL_KIDQ] === 'والد در جریان و موافق: هنوز نه' && lastT().text !== SP_KQ.tpar.t);
    TG_OUTBOX = []; tgQuizFinish_(903, 'on');
    ok('بی نوع کودک و نوجوان: پرسش تازه نمی‌آید', !TG_OUTBOX.some(function (x) { return x.text === SP_KQ.par.t || x.text === SP_KQ.tpar.t; }));
    ok('کارت لید پذیرش جواب را نشان می‌دهد', tgLeadCardText_({ name: 'نمونه', kidq: 'سن کودک: ۷ تا ۹ سال' }).indexOf('سن کودک: ۷ تا ۹ سال') > -1);
    ok('ستون «پرسش‌های والد» در فهرست ستون‌های لید (در انتها ساخته می‌شود)', TG_LEAD_FIELDS.indexOf(SP_COL_KIDQ) > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'spTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['خط‌های خدمت تخصصی: استخرها، برچسب لید، پرسش‌های والد (v170.62 تا v170.64)', 'spTests']); } catch (eSp) {}
