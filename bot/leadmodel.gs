/**
 * leadmodel.gs · v170.2 · ۱۲ مهر ۱۴۰۵ · مدل یکپارچهٔ لید
 *
 * چرا: هر ورودی (مراجع، درمانگر متقاضی، پارتنر، تقاضای حضوری) در تب خودش می‌ماند و پذیرش یک صف واحد نداشت.
 * حالا تب «لیدها» تنها صف است و تب‌های جزئیات فقط جزئیات را نگه می‌دارند و با «کد لید» به آن وصل‌اند.
 * - ستون‌های تازهٔ «لیدها» (انتهای جدول، بی جابه‌جایی): نوع لید، پیشنهاد کاربر، پیامد، مسئول مرحله، مهلت مرحله، منبع جزئیات.
 * - تب‌های جزئیات (درخواست‌های حضوری، تقاضا و انتظار حضوری، اپلای تراپیست در هاب مدرسه، درخواست فضای پارتنر، صفحهٔ پارتنر)
 *   یک ستون «کد لید» در انتها می‌گیرند. «جذب تراپیست» آینهٔ اپلای است و دست نمی‌خورد.
 * - هر ردیف جزئیات بی کد، در اجرای ساعتی (از tgWatchdog، بی تریگر تازه) لید می‌گیرد یا به لید موجود همان chat وصل می‌شود.
 *   لید تازه: مسئول پیش‌فرض پذیرش (مسئول پذیرش)، «اقدام اول» با مهلت ۲۴ ساعت.
 * - لید با مسئول «بات · خودرزرو» مسئول آدم می‌گیرد (مسئول پذیرش).
 * - پیامد هر نوع با دکمهٔ «🏁 پیامد» روی کارت لید؛ «ارجاع به مدرسه» برای همه، یک ردیف در «درخواست عضویت» هاب مدرسه با همان کد لید.
 * - پیشنهاد کاربر (روز، ساعت، محله یا شهر) وقتی وقت آنلاین یا حضوری جور نشد: ستون «پیشنهاد کاربر» و کارت برای مسئول پذیرش.
 * - داشبورد: تب «داشبورد لید» روزی یک بار.
 * - نام مراجع در هیچ کارت و خلاصه‌ای نمی‌آید؛ فقط کد لید.
 * - تا یاسر دکمهٔ «✅ اجرا» را نزده (LM_ON)، هیچ چیز نوشته نمی‌شود؛ یک‌بارهٔ tgV1702Plan فقط شمارش آزمایشی را می‌فرستد.
 * - بی تغییر در پرداخت، نقش‌ها و تریگرها.
 */

var LM_T = { C: 'مراجع', T: 'درمانگر متقاضی', P: 'پارتنر', I: 'تقاضای حضوری' };
var LM_TYPES = [LM_T.C, LM_T.T, LM_T.P, LM_T.I];
var LM_COLS = ['نوع لید', 'پیشنهاد کاربر', 'پیامد', 'مسئول مرحله', 'مهلت مرحله', 'منبع جزئیات'];
var LM_SCHOOL = 'ارجاع به مدرسه';
var LM_WAITSUP = 'در انتظار مصاحبه/سوپروایزر';
var LM_OUT = {
  'مراجع': ['شروع درمان', 'ارجاع', 'انصراف', 'بی‌پاسخ', LM_SCHOOL],
  'درمانگر متقاضی': ['پذیرش (ورود به سیستم و کامیونیتی)', LM_SCHOOL, 'رد با دلیل', LM_WAITSUP],
  'پارتنر': ['درخواست', 'بررسی', 'قرارداد', 'فعال', 'رد', LM_SCHOOL],
  'تقاضای حضوری': ['ساعت پیدا شد', 'پیشنهاد کاربر بررسی شد', 'تبدیل به آنلاین', 'انصراف', LM_SCHOOL]
};
/* پیامد موفق هر نوع (برای نرخ تبدیل داشبورد) */
var LM_WIN = { 'مراجع': /^شروع درمان/, 'درمانگر متقاضی': /^پذیرش/, 'پارتنر': /^فعال/, 'تقاضای حضوری': /^(ساعت پیدا شد|تبدیل به آنلاین)/ };
var LM_FIRST_H = 24, LM_STAGE_H = 72;
var LM_DASH = 'داشبورد لید';

function lmOn_() { return stkProp_('LM_ON') === '1'; }
function lmOwner_() { try { return tgOwnerFor_('پذیرش'); } catch (e) { return tgNm_('reception'); } }
function lmFmt_(d, f) { return Utilities.formatDate(d, TG_TZ, f); }

/* پیامد ← وضعیت در واژگان واحد لید */
function lmStOf_(out) {
  if (out === 'شروع درمان') return TG_ST.START;
  if (out === 'ارجاع') return TG_ST.REF;
  if (out === 'بی‌پاسخ') return TG_ST.NOANS;
  if (/^(انصراف|رد|فعال|پذیرش|ساعت پیدا شد|تبدیل به آنلاین|ارجاع به مدرسه)/.test(out)) return TG_ST.CLOSED;
  return TG_ST.FOLLOW;
}
function lmGuessType_(src, text) {
  var s = String(src || '') + ' ' + String(text || '');
  if (/اپلای|متقاضی همکاری|درمانگر متقاضی/.test(s)) return LM_T.T;
  if (/پارتنر/.test(s)) return LM_T.P;
  return LM_T.C;
}

/* ---------------- منابع جزئیات ---------------- */
function lmCityOf_(note) { return ((/شهر:\s*(.+)$/.exec(String(note || '')) || [])[1] || '').trim(); }
var LM_SRC = [
  { id: 'req', tab: 'درخواست‌های حضوری', inp: true, type: LM_T.I, make: function (g) {
    var st = g('وضعیت');
    return { ref: 'درخواست‌های حضوری · ' + g('شناسه'), name: g('درمانگر'), place: g('مکان'), open: st === 'منتظر پذیرش' || !st,
      out: /تأیید|انجام/.test(st) ? 'ساعت پیدا شد' : (/رد|لغو/.test(st) ? 'انصراف' : ''),
      text: 'درخواست ساعت حضوری درمانگر · ' + [g('نوع'), g('روز'), g('از ساعت') && g('تا ساعت') ? g('از ساعت') + ' تا ' + g('تا ساعت') : ''].filter(String).join(' · ') };
  } },
  { id: 'dem', tab: 'تقاضا و انتظار حضوری', inp: true, type: LM_T.I, make: function (g) {
    var client = g('نوع') === 'مراجع', who = g('کی');
    return { ref: 'تقاضا و انتظار حضوری · ' + g('زمان') + ' · ' + g('نوع'), name: client ? 'مراجع حضوری' : who, chat: client && /^\d{4,}$/.test(who) ? who : '',
      place: g('مکان') === '-' ? '' : g('مکان'), city: lmCityOf_(g('توضیح')), open: g('وضعیت') === 'باز', out: g('وضعیت') === 'باز' ? '' : 'ساعت پیدا شد',
      sug: [g('روز'), g('بازه')].filter(String).join(' · '),
      text: 'تقاضای حضوری ' + (client ? 'مراجع' : 'درمانگر') + ' · ' + [g('روز'), g('بازه'), g('توضیح')].filter(String).join(' · ') };
  } },
  { id: 'apply', tab: 'اپلای تراپیست', school: true, type: LM_T.T, make: function (g) {
    var stg = g('مرحله'), res = g('نتیجهٔ نهایی'), out = '';
    if (/پذیرش کامل/.test(res)) out = LM_OUT[LM_T.T][0];
    else if (/عدم پذیرش/.test(res)) out = 'رد با دلیل';
    else if (/الزامی/.test(res)) out = LM_SCHOOL;
    else if (/سوپروایزر|مصاحبهٔ دوم/.test(stg)) out = LM_WAITSUP;
    return { ref: 'اپلای تراپیست · ' + g('کد اپلای'), name: g('نام کامل'), city: g('شهر'), open: !/همکاری آغاز شد|بسته/.test(stg) && !res, out: out,
      stageOwner: out === LM_WAITSUP ? (g('سوپروایزر مصاحبهٔ دوم') || '') : '',
      text: 'اپلای تراپیست ' + g('کد اپلای') + ' · مرحله: ' + (stg || 'نامعلوم') };
  } },
  { id: 'preq', tab: 'درخواست فضای پارتنر', type: LM_T.P, make: function (g) {
    var st = g('وضعیت'), out = /فعال/.test(st) ? 'فعال' : /رد/.test(st) ? 'رد' : /تأیید/.test(st) ? 'قرارداد' : /تماس/.test(st) ? 'بررسی' : 'درخواست';
    return { ref: 'درخواست فضای پارتنر · ' + g('کد'), name: g('نام درمانگر'), city: g('شهر'), place: g('شناسه مکان'), open: !/فعال|رد/.test(st), out: out,
      text: 'درخواست فضای پارتنر ' + g('کد') + ' · ' + (st || 'در انتظار پارتنر') };
  } },
  { id: 'page', tab: 'صفحهٔ پارتنر', type: LM_T.P, dup: true, make: function (g) {
    var st = g('وضعیت'), live = /فعال|منتشر/.test(st);
    return { ref: 'صفحهٔ پارتنر · ' + g('شناسه مکان'), name: g('نام نمایشی'), city: g('شهر'), place: g('شناسه مکان'), open: !live && !/رد|بسته/.test(st),
      out: live ? 'فعال' : (/رد|بسته/.test(st) ? 'رد' : 'بررسی'), text: 'صفحهٔ پارتنر ' + g('شناسه مکان') + ' · ' + (st || 'بی وضعیت') };
  } }
];
/* نام نمایشی پارتنر برای پیدا کردن صفحهٔ تکراری (مثل دو صفحهٔ «نور») */
function lmDupKey_(name) {
  return String(name || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/مرکز|کلینیک|مشاوره|روان‌?شناسی|خدمات|و/g, '').replace(/[\s‌\-_.،,]+/g, '').trim();
}

/* ---------------- خواندن و نوشتن تب‌ها (سرستون‌محور) ---------------- */
function lmTabRead_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 1) return null;
  var v = sh.getRange(1, 1, sh.getLastRow(), Math.max(1, sh.getLastColumn())).getValues();
  return { head: v[0].map(function (x) { return String(x || '').trim(); }), rows: v.slice(1), sh: sh };
}
/* تب‌های حضوری (در تست: همان حافظهٔ tgInpTab_) */
function lmInpTab_(name, head) {
  if (stkDry_()) return { head: head.concat(['کد لید']), rows: (TG_MEM['tab:' + name] || []).map(function (r) { return r.slice(); }), mem: TG_MEM['tab:' + name] || [] };
  var t = null; try { t = lmTabRead_(tgSS_(), name); } catch (e) {}
  return t ? { head: t.head, rows: t.rows.map(function (r) { return r.map(function (x) { return x instanceof Date ? lmFmt_(x, 'yyyy-MM-dd HH:mm') : String(x == null ? '' : x); }); }), sh: t.sh } : { head: head, rows: [] };
}
function lmTab_(src) {
  if (stkDry_()) {
    if (src.inp) return lmInpTab_(src.tab, src.id === 'req' ? TG_INP_QHEAD : TG_INP_DHEAD);
    var m = TG_MEM['lm:tab:' + src.tab]; return m ? { head: m.head, rows: m.rows, mem: m.rows } : null;
  }
  if (src.inp) { var t0 = lmInpTab_(src.tab, []); return t0.sh ? t0 : null; }
  return lmTabRead_(src.school ? tgSchSS_() : tgSS_(), src.tab);
}
function lmLinkSet_(t, i, code) {
  var c = t.head.indexOf('کد لید');
  if (stkDry_()) {
    if (c < 0) { t.head.push('کد لید'); c = t.head.length - 1; }
    var mr = t.mem[i]; while (mr.length <= c) mr.push(''); mr[c] = code; t.rows[i][c] = code; return;
  }
  if (c < 0) {
    var lc = t.sh.getLastColumn() + 1;
    if (t.sh.getMaxColumns() < lc) t.sh.insertColumnsAfter(t.sh.getMaxColumns(), 1);
    t.sh.getRange(1, lc).setValue('کد لید').setFontWeight('bold');
    t.head.push('کد لید'); c = lc - 1;
  }
  t.sh.getRange(i + 2, c + 1).setValue(code);
}

/* ---------------- نمایهٔ لیدها ---------------- */
/* همهٔ لیدها (باز و بسته) با نوع، منبع جزئیات و chat؛ در تست: TG_MEM['lm:leads'] */
function lmLeadIdx_() {
  var list;
  if (stkDry_()) list = (TG_MEM['lm:leads'] = TG_MEM['lm:leads'] || []);
  else {
    var sh = tgSS_().getSheetByName(TG_LEADS), last = sh.getLastRow();
    TG_LEAD_HM_ = null; TG_LEAD_HEAD_X = null;
    var hm = tgLeadHeadMap_(sh);
    var v = last >= 2 ? sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues() : [];
    var g = function (r, n) { var x = tgLeadHv_(r, hm, n); return x instanceof Date ? lmFmt_(x, 'yyyy-MM-dd') : String(x == null ? '' : x).trim(); };
    list = v.map(function (r, i) {
      return { row: i + 2, code: g(r, 'کد لید'), type: g(r, 'نوع لید'), ref: g(r, 'منبع جزئیات'), chat: tgLeadChat_(g(r, 'یادداشت')),
        owner: g(r, 'مسئول'), status: g(r, 'وضعیت'), out: g(r, 'پیامد'), src: g(r, 'منبع'), text: g(r, 'متن اولیه'),
        date: g(r, 'تاریخ'), time: g(r, 'زمان'), start: g(r, 'شروع درمان؟'), name: g(r, 'نام'),
        phone: g(r, 'شماره / شناسه'), noans: Number(g(r, 'شمار بی‌پاسخ')) || 0, meetTher: g(r, 'درمانگر معارفه'), next: g(r, 'اقدام بعدی'),
        nextDate: tgLeadIso_(tgLeadHv_(r, hm, 'تاریخ اقدام بعدی')), booked: g(r, 'معارفه هماهنگ شد؟'), meetDate: tgLeadIso_(tgLeadHv_(r, hm, 'تاریخ معارفه')),
        result: g(r, 'نتیجه'), last: tgLeadIso_(tgLeadHv_(r, hm, 'آخرین تماس')) };
    });
  }
  var idx = { list: list, byRef: {}, byChat: {} };
  list.forEach(function (l) {
    if (!l.code) return;
    if (l.ref) idx.byRef[l.ref] = l.code;
    if (l.chat && (!idx.byChat[l.chat] || !tgStClosed_(l.status))) idx.byChat[l.chat] = l.code;
  });
  return idx;
}

/* ساخت لید از یک ردیف جزئیات. o: {type, name, ref, chat, place, city, text, open, out, stageOwner, sug} */
function lmCreate_(o, idx) {
  var now = stkNow_(), due = new Date(now.getTime() + LM_FIRST_H * 3600000), f = {};
  f['تاریخ'] = lmFmt_(now, 'yyyy-MM-dd'); f['زمان'] = lmFmt_(now, 'H:mm');
  f['منبع'] = 'مدل لید › ' + o.type; f['نام'] = o.name || o.type; f['کانال'] = o.chat ? 'تلگرام' : 'بات';
  f['متن اولیه'] = o.text || ''; f['مسئول'] = lmOwner_();
  f['یادداشت'] = (o.chat ? 'chat_id: ' + o.chat + ' · ' : '') + 'ساخته از ' + o.ref;
  f['نوع لید'] = o.type; f['منبع جزئیات'] = o.ref;
  if (o.out) f['پیامد'] = o.out;
  if (o.sug) f['پیشنهاد کاربر'] = o.sug;
  if (o.place) f['شناسهٔ مکان'] = o.place;
  if (o.city) f['شهر درخواستی'] = o.city;
  if (o.open) {
    f['وضعیت'] = TG_ST.NEW; f['اقدام بعدی'] = 'اقدام اول';
    f['تاریخ اقدام بعدی'] = lmFmt_(due, 'yyyy-MM-dd'); f['مهلت'] = lmFmt_(due, 'yyyy-MM-dd HH:mm');
    if (o.out === LM_WAITSUP) { f['مسئول مرحله'] = o.stageOwner || lmOwner_(); f['مهلت مرحله'] = lmFmt_(new Date(now.getTime() + LM_STAGE_H * 3600000), 'yyyy-MM-dd HH:mm'); }
  } else { f['وضعیت'] = TG_ST.CLOSED; f['دلیل بستن'] = o.out || 'بسته پیش از مدل لید'; }
  var code;
  if (stkDry_()) {
    code = 'L-D' + (1001 + idx.list.length);
    idx.list.push({ row: idx.list.length + 2, code: code, type: o.type, ref: o.ref, chat: o.chat || '', owner: f['مسئول'], status: f['وضعیت'], out: o.out || '', f: f });
  } else {
    /* v170.20: از نویسندهٔ واحد (tgAppendLead_)؛ ستون‌های ثابت جدا، بقیه به‌عنوان extra */
    var base = { 'تاریخ': 1, 'زمان': 1, 'منبع': 1, 'نام': 1, 'کانال': 1, 'متن اولیه': 1, 'وضعیت': 1, 'مسئول': 1, 'یادداشت': 1 }, ex = {};
    for (var k in f) if (!base[k]) ex[k] = f[k];
    var r = tgAppendLead_({ source: f['منبع'], name: f['نام'], channel: f['کانال'], phone: '', region: '', firstText: f['متن اولیه'],
      status: f['وضعیت'], owner: f['مسئول'], note: f['یادداشت'], type: o.type, extra: ex });
    if (typeof r !== 'number') throw new Error('lmCreate_: لید نوشته نشد');
    code = tgLeadCode_(r);
    idx.list.push({ row: r, code: code, type: o.type, ref: o.ref, chat: o.chat || '', owner: f['مسئول'], status: f['وضعیت'], out: o.out || '' });
    if (o.chat) { try { CacheService.getScriptCache().remove('lr' + o.chat); } catch (e) {} }
  }
  idx.byRef[o.ref] = code; if (o.chat) idx.byChat[o.chat] = code;
  tgLeadEv_({ code: code, actor: 'بات', channel: 'مدل لید', what: 'ساخت لید', to: o.type + (o.open ? '' : ' (بسته)'), note: o.ref, type: o.type });
  return code;
}

/* ---------------- همگام‌سازی (همان پر کردن اولیه) ---------------- */
/* dry=true: هیچ چیز نمی‌نویسد، فقط می‌شمارد. خروجی: شمار ساخت و اتصال بر اساس نوع، تکراری‌ها، مسئول‌های بات، لیدهای بی نوع */
function lmSync_(dry) {
  var idx = lmLeadIdx_(), plan = { made: {}, linked: {}, dup: [], bot: 0, typed: 0, err: [], src: {} };
  LM_TYPES.forEach(function (t) { plan.made[t] = 0; plan.linked[t] = 0; });
  var fake = 0;
  LM_SRC.forEach(function (src) {
    var t = null;
    try { t = lmTab_(src); } catch (e) { plan.err.push(src.tab); return; }
    if (!t) return;
    var lc = t.head.indexOf('کد لید'), seen = {}, n = 0;
    t.rows.forEach(function (r, i) {
      var g = function (h) { var j = t.head.indexOf(h); if (j < 0 || j >= r.length) return ''; var x = r[j]; return x instanceof Date ? lmFmt_(x, 'yyyy-MM-dd HH:mm') : String(x == null ? '' : x).trim(); };
      var o = src.make(g); o.type = src.type;
      if (!o.ref.split(' · ')[1] && !o.name) return;
      n++;
      var cur = lc > -1 && lc < r.length ? String(r[lc] || '').trim() : '';
      var dk = src.dup ? lmDupKey_(o.name) : '';
      if (/^L-/.test(cur)) { if (dk && !seen[dk]) seen[dk] = { code: cur.split(' ')[0], ref: o.ref }; return; }
      if (dk && seen[dk]) {
        plan.dup.push(o.ref + ' ← ' + seen[dk].ref);
        if (!dry) lmLinkSet_(t, i, seen[dk].code + ' · تکراری ' + seen[dk].ref.split(' · ')[1] + '، پاک نشود');
        plan.linked[o.type]++;
        return;
      }
      var code = idx.byRef[o.ref] || (o.chat && idx.byChat[o.chat]) || '';
      if (code) plan.linked[o.type]++;
      else {
        plan.made[o.type]++;
        code = dry ? 'L-PLAN' + (++fake) : lmCreate_(o, idx);
        if (dry) idx.byRef[o.ref] = code;
      }
      if (!dry) lmLinkSet_(t, i, code);
      if (dk) seen[dk] = { code: code, ref: o.ref };
    });
    plan.src[src.tab] = n;
  });
  /* مسئول «بات · خودرزرو» ← مسئول آدم؛ لید بی نوع ← نوع از منبع */
  var noType = [];
  idx.list.forEach(function (l) {
    if (!l.code) return;
    if (/^بات/.test(l.owner) && !tgStClosed_(l.status)) {
      plan.bot++;
      if (!dry) {
        if (stkDry_()) l.owner = lmOwner_();
        else tgLeadSet_(l.row, { 'مسئول': lmOwner_() }, 'بات', 'مدل لید', 'مسئول آدم به جای «' + l.owner + '»');
      }
    }
    if (!l.type) { plan.typed++; noType.push(l); }
  });
  if (!dry && noType.length) lmTypeFill_(noType);
  return plan;
}
/* نوشتن یکجای «نوع لید» برای لیدهای قدیمی (یک setValues) */
function lmTypeFill_(list) {
  list.forEach(function (l) { l.type = lmGuessType_(l.src, l.text); });
  if (stkDry_()) return;
  var sh = tgSS_().getSheetByName(TG_LEADS), col = tgLeadCol_('نوع لید'), last = sh.getLastRow();
  if (last < 2) return;
  var rg = sh.getRange(2, col, last - 1, 1), v = rg.getValues(), by = {};
  list.forEach(function (l) { by[l.row] = l.type; });
  for (var i = 0; i < v.length; i++) if (!String(v[i][0] || '').trim() && by[i + 2]) v[i][0] = by[i + 2];
  rg.setValues(v);
  tgLeadMark_(2);
}
function lmPlanText_(p, dry) {
  var lines = LM_TYPES.map(function (t) { return '• ' + t + ': ' + tgFa_(p.made[t]) + ' لید تازه، ' + tgFa_(p.linked[t]) + ' اتصال به لید موجود'; });
  return lines.join('\n') +
    '\n• لید قدیمی بی نوع (نوع از منبع): ' + tgFa_(p.typed) +
    '\n• لید باز با مسئول بات ← ' + tgNm_('reception') + ': ' + tgFa_(p.bot) +
    '\n• صفحهٔ تکراری پارتنر (علامت می‌خورد، پاک نمی‌شود): ' + (p.dup.length ? p.dup.map(tgEsc_).join('، ') : 'هیچ') +
    '\n• ردیف خوانده‌شده: ' + Object.keys(p.src).map(function (k) { return tgEsc_(k) + ' ' + tgFa_(p.src[k]); }).join('، ') +
    (p.err.length ? '\n• خوانده نشد: ' + p.err.map(tgEsc_).join('، ') : '') + (dry ? '\n\n(آزمایشی؛ چیزی نوشته نشد)' : '');
}

/* ---------------- ستون‌ها و تب‌ها ---------------- */
var LM_NEW_TABS = ['درخواست‌های متوقف', 'داشبورد لید', 'دفتر کامنت‌ها'];
function lmSetup_() {
  if (stkDry_()) return 'dry';
  LM_COLS.forEach(function (c) { tgLeadCol_(c); });
  var es = tgLeadEvSheet_();
  if (es && String(es.getRange(1, TG_LEAD_EV_HEAD.length).getValue() || '').trim() !== TG_LEAD_EV_HEAD[TG_LEAD_EV_HEAD.length - 1]) {
    es.getRange(1, TG_LEAD_EV_HEAD.length).setValue(TG_LEAD_EV_HEAD[TG_LEAD_EV_HEAD.length - 1]).setFontWeight('bold');
  }
  stkSheet_();
  return 'ستون‌ها و تب‌ها آماده';
}

/* ---------------- ساعتی (از stkHourly_) ---------------- */
function lmHourly_() {
  if (!lmOn_()) return null;
  if (stkProp_('LM_SETUP') !== '1') { lmSetup_(); stkProp_('LM_SETUP', '1'); }
  var p = lmSync_(false), made = 0;
  LM_TYPES.forEach(function (t) { made += p.made[t]; });
  if (stkProp_('LM_FIRST') !== '1') stkProp_('LM_FIRST_PLAN', lmPlanText_(p, false).slice(0, 3000));
  var day = stkDay_();
  if (stkProp_('LM_DASH_DAY') !== day) { try { lmDash_(); stkProp_('LM_DASH_DAY', day); } catch (eD) { tgErr_('lmDash_', eD); } }
  return { made: made, bot: p.bot };
}
/* بعد از اولین اجرای کامل (پر کردن + اسکن): گزارش برای یاسر با دکمهٔ «📤 ارسال کارت‌ها». کارت‌ها تا آن موقع نگه‌داشته‌اند. */
function lmAfterFirst_() {
  if (!lmOn_() || stkProp_('LM_FIRST') === '1') return;
  stkProp_('LM_FIRST', '1');
  var held = stkRows_().filter(function (r) { return stkOpen_(r) && r.card === STK_HELD; });
  var by = {}; held.forEach(function (r) { by[r.mode + ' · ' + r.reason] = (by[r.mode + ' · ' + r.reason] || 0) + 1; });
  var t = '✅ <b>مدل لید اجرا شد</b>\n\n' + stkProp_('LM_FIRST_PLAN') +
    '\n\n⛔️ <b>کارت‌های درخواست متوقف، ساخته و نگه‌داشته</b> · ' + tgFa_(held.length) + ' مورد\n' +
    (Object.keys(by).map(function (k) { return '• ' + tgEsc_(k) + ': ' + tgFa_(by[k]); }).join('\n') || 'هیچ') +
    '\n\nفهرست کامل در تب «' + STK_TAB + '». تا دکمهٔ زیر را نزنید، هیچ کارتی برای مسئول پذیرش نمی‌رود.';
  tgNotify_(String(TG_OWNER_CHAT), TG_NK.task, t, { ref: 'LM', markup: { inline_keyboard: [[{ text: '📤 ارسال کارت‌ها', callback_data: 'sk:send:all' }]] } });
}

/* tgAppendLead_ (بات، فرم سایت، مینی‌اپ): لید تازه همان لحظه نوع و مهلت ۲۴ ساعتهٔ اقدام اول می‌گیرد */
function lmOnAppend_(sh, row, o) {
  if (!lmOn_() || stkDry_() || !row || row < 2) return;
  sh.getRange(row, tgLeadCol_('نوع لید')).setValue((o && o.type) || lmGuessType_(o && o.source, o && o.firstText));
  var mc = tgLeadCol_('مهلت');
  if (!String(sh.getRange(row, mc).getValue() || '').trim()) sh.getRange(row, mc).setValue(lmFmt_(new Date(Date.now() + LM_FIRST_H * 3600000), 'yyyy-MM-dd HH:mm'));
}

/* ---------------- سلامت لید (هر صبح، از stkHourly_) ---------------- */
var LM_HEALTH = ['lead_nonext', 'lead_closednext', 'lead_new48', 'lead_comment3', 'lead_meetstale'];
function lmHealth_() {
  var idx = lmLeadIdx_(), live = {}, now = stkNow_(), today = lmFmt_(now, 'yyyy-MM-dd'), c3 = {};
  String(stkProp_('CM_OPEN3') || '').split(',').filter(String).forEach(function (c) { c3[c] = 1; });
  idx.list.forEach(function (l) {
    if (!l.code || (!l.name && !l.phone && !l.ref)) return;
    var st = tgStOf_(l.status) || l.status || TG_ST.NEW, type = l.type || lmGuessType_(l.src, l.text), own = cmHuman_(l.owner);
    var R = function (reason, det) { live[reason + ':' + l.code] = 1; stkRaise_({ reason: reason, key: l.code, lead: l.code, type: type, owner: own, mode: 'لید', detail: det }); };
    if (tgStClosed_(l.status)) {
      if (l.next) R('lead_closednext', l.code + ': «' + st + '» است ولی اقدام بعدی باز دارد: «' + l.next + '»' + (l.nextDate ? ' (' + l.nextDate + ')' : '') + '.');
      return;
    }
    if (tgSection_(l.src, '') === 'مدرسه') return;
    if (!l.next || !l.nextDate) R('lead_nonext', l.code + ': اقدام بعدی یا تاریخش خالی است.');
    else if (l.nextDate < today) R('lead_nonext', l.code + ': موعد «' + l.next + '» ' + tgFa_(v168DayDiff_(l.nextDate, today)) + ' روز گذشته است.');
    if (st === TG_ST.NEW && !l.last) {
      var d = new Date(String(l.date || '') + 'T' + (/^\d{1,2}:\d{2}$/.test(l.time || '') ? ('0' + l.time).slice(-5) : '00:00') + ':00');
      var hrs = isNaN(d.getTime()) ? 0 : (now.getTime() - d.getTime()) / 3600000;
      if (hrs > 48) R('lead_new48', l.code + ': «جدید» و ' + tgFa_(Math.floor(hrs)) + ' ساعت بی تماس.');
    }
    if (c3[l.code]) R('lead_comment3', l.code + ': کامنت باز بیش از ۳ روز در هاب پذیرش دارد.');
    if (st === TG_ST.BOOKED && (!l.meetDate || (l.meetDate < today && !/برگزار|حاضر|لغو|شروع/.test(l.result || ''))))
      R('lead_meetstale', l.code + ': «معارفه رزرو شد» ' + (l.meetDate ? 'با تاریخ گذشتهٔ ' + l.meetDate + ' و بی نتیجه.' : 'بی تاریخ معارفه.'));
  });
  stkSettle_(LM_HEALTH, live);
  return Object.keys(live).length;
}

/* ---------------- پیشنهاد کاربر و تقاضای حضوری (قلاب‌ها) ---------------- */
function lmBossChat_() { var b = stkBoss_(); return b ? b.chat : String(TG_OWNER_CHAT); }
/* mode: «آنلاین» یا «حضوری»؛ why: دلیل دقیق توقف اگر صدازننده می‌داند */
function lmOnSuggest_(chat, text, mode, why) {
  if (!lmOn_()) return null;
  try {
    var code = stkLeadOf_(chat, 'پیشنهاد کاربر'), sug = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!code || !sug) return null;
    var row = stkDry_() ? 0 : tgLeadByCode_(code), type = lmTypeOfCode_(code, row) || (mode === 'حضوری' ? LM_T.I : LM_T.C);
    if (row >= 2) tgLeadSet_(row, { 'پیشنهاد کاربر': sug }, 'مراجع', 'بات', 'پیشنهاد کاربر');
    var reason = why || stkLastStop_(code) || 'وقت مناسب پیدا نشد';
    tgLeadEv_({ code: code, row: row, actor: 'مراجع', channel: 'بات', what: 'پیشنهاد کاربر', to: sug, note: mode + ' · ' + reason, type: type });
    var t = '🙋 <b>پیشنهاد کاربر · ' + tgEsc_(mode) + '</b>\nلید: <code>' + tgEsc_(code) + '</code> · نوع: ' + tgEsc_(type) +
      '\n\n<b>دلیل دقیق توقف:</b> ' + tgEsc_(reason) + '\n<b>پیشنهاد کاربر:</b> ' + tgEsc_(sug) +
      '\n\n<b>اقدام لازم:</b> با همین ترجیح وقت پیدا کنید یا پیشنهاد دیگری بدهید، بعد پیامد را ثبت کنید.';
    tgNotify_(lmBossChat_(), TG_NK.task, t, { ref: code, markup: { inline_keyboard: [[{ text: '🏁 پیامد', callback_data: 'lm:o:' + code }, { text: '👥 واگذاری', callback_data: 'ld:asg:' + code }]] } });
    return code;
  } catch (e) { tgErr_('lmOnSuggest_', e); return null; }
}
/* tgInpDemand_: مراجع حضوری که جواب نگرفت (شهر بی مکان یا روز بی درمانگر) */
function lmOnDemand_(chat, pid, day, part, note) {
  if (!lmOn_() || !/^\d{4,}$/.test(String(chat || ''))) return null;
  var city = lmCityOf_(note), sug = [city ? 'شهر: ' + city : '', pid && pid !== '-' ? 'مکان: ' + pid : '', day, part].filter(String).join(' · ');
  return lmOnSuggest_(chat, sug || 'بی ترجیح ثبت‌شده', 'حضوری', note || 'تقاضای حضوری بی جواب');
}
function lmTypeOfCode_(code, row) {
  if (stkDry_()) { var l = (TG_MEM['lm:leads'] || []).filter(function (x) { return x.code === code; })[0]; return l ? l.type : (TG_DRY_LEAD && TG_DRY_LEAD.code === code ? TG_DRY_LEAD.type || '' : ''); }
  if (!row || row < 2) return '';
  try { return String(tgSS_().getSheetByName(TG_LEADS).getRange(row, tgLeadCol_('نوع لید')).getValue() || '').trim(); } catch (e) { return ''; }
}

/* ---------------- پیامد (دکمه روی کارت لید) ---------------- */
function lmCb_(chat, data) {
  var a = String(data).split(':'), act = a[1], code = a[2] || '', i = Number(a[3]);
  var isOwner = String(chat) === String(TG_OWNER_CHAT), who = null;
  try { who = tgWhoDesk_(chat, ''); } catch (e) {}
  if (!isOwner && !who) return tgSend_(chat, 'این بخش برای پذیرش است.');
  if (act === 'go') {
    if (!isOwner) return tgSend_(chat, 'اجرای مدل لید فقط با تأیید یاسر است.');
    if (lmOn_()) return tgSend_(chat, 'مدل لید از قبل روشن است.');
    /* v170.4: پیش از روشن شدن، پشتیبان کامل تب «لیدها»؛ اگر پشتیبان ساخته نشد، روشن نمی‌شود */
    var bk = lmBackup_('پیش از اجرا');
    if (!bk.ok) return tgSend_(chat, '⚠️ پشتیبان تب «' + TG_LEADS + '» ساخته نشد، پس مدل لید روشن نشد: ' + tgEsc_(bk.err || '?'));
    stkProp_('LM_BAK', bk.name);
    stkProp_('LM_ON', '1');
    return tgSend_(chat, '✅ تأیید شد. پشتیبان کامل «' + TG_LEADS + '» ساخته شد: «' + tgEsc_(bk.name) + '» (' + tgFa_(bk.rows) + ' ردیف).\n' +
      'اجرای ساعتی بعدی (تا یک ساعت دیگر) لیدها را می‌سازد و وصل می‌کند و کارت‌های درخواست متوقف را می‌سازد ولی نمی‌فرستد. بعد گزارش با دکمهٔ «📤 ارسال کارت‌ها» برایتان می‌آید.',
      lmSafeKb_());
  }
  if (act === 'off' || act === 'rb' || act === 'rbok' || act === 'safe') {
    if (!isOwner) return tgSend_(chat, 'این دکمه فقط برای یاسر است.');
    if (act === 'safe') return tgSend_(chat, lmSafeText_(), lmSafeKb_());
    if (act === 'off') {
      if (!lmOn_()) return tgSend_(chat, 'مدل لید از قبل خاموش است.', lmSafeKb_());
      stkProp_('LM_ON', null);
      return tgSend_(chat, '⏸ مدل لید خاموش شد. از همین لحظه نه لیدی ساخته یا وصل می‌شود، نه کامنتی اعمال می‌شود. چیزی برگردانده نشد؛ اگر لازم است «↩️ برگرداندن» را بزنید.', lmSafeKb_());
    }
    var bn = stkProp_('LM_BAK');
    if (!bn) return tgSend_(chat, 'پشتیبانی ثبت نشده است؛ چیزی برای برگرداندن نیست.');
    if (act === 'rb') return tgSend_(chat, '↩️ <b>برگرداندن تب «' + TG_LEADS + '»</b> از «' + tgEsc_(bn) + '»\n\n' +
      '• مدل لید اول خاموش می‌شود.\n• از وضع فعلی تب هم یک پشتیبان تازه ساخته می‌شود.\n• ردیف‌های پشتیبان سر جایشان برمی‌گردند. لید تازه‌ای که بعد از پشتیبان از سایت یا بات آمده نگه داشته می‌شود؛ لیدی که خود مدل ساخته برداشته می‌شود.\n• پاسخ‌های 🤖 زیر کامنت‌ها و ردیف‌های «رویدادهای لید» دست نمی‌خورند.\n\nمطمئنید؟',
      { inline_keyboard: [[{ text: '✅ بله، برگردان', callback_data: 'lm:rbok' }], [{ text: 'نه', callback_data: 'lm:safe' }]] });
    stkProp_('LM_ON', null);
    var r = lmRestore_(bn);
    return tgSend_(chat, r.ok ? '✅ تب «' + TG_LEADS + '» از «' + tgEsc_(bn) + '» برگشت: ' + tgFa_(r.rows) + ' ردیف از پشتیبان، ' + tgFa_(r.kept) + ' لید تازهٔ بعد از پشتیبان نگه داشته شد، ' + tgFa_(r.dropped) + ' لید ساختهٔ مدل برداشته شد. وضع پیش از برگرداندن هم در «' + tgEsc_(r.pre) + '» است. مدل لید خاموش است.'
      : '⚠️ برگرداندن نشد: ' + tgEsc_(r.err || '?') + '. مدل لید خاموش است و چیزی عوض نشد.', lmSafeKb_());
  }
  if (!lmOn_()) return tgSend_(chat, 'مدل لید هنوز روشن نشده است.');
  var row = stkDry_() ? (TG_DRY_LEAD && TG_DRY_LEAD.code === code ? TG_DRY_LEAD.row : -1) : tgLeadByCode_(code);
  if (row < 2) return tgSend_(chat, 'لید ' + tgEsc_(code) + ' پیدا نشد.');
  var type = lmTypeOfCode_(code, row) || LM_T.C, opts = LM_OUT[type] || LM_OUT[LM_T.C];
  if (act === 'o') {
    return tgSend_(chat, '🏁 پیامد <code>' + tgEsc_(code) + '</code> · ' + tgEsc_(type), { inline_keyboard: opts.map(function (o, k) { return [{ text: o, callback_data: 'lm:s:' + code + ':' + k }]; }) });
  }
  if (act === 's') {
    var out = opts[i]; if (!out) return tgSend_(chat, 'این گزینه دیگر نیست.');
    var actor = who ? who.name : 'یاسر', st = lmStOf_(out), ch = { 'پیامد': out, 'وضعیت': st };
    if (st === TG_ST.CLOSED) ch['دلیل بستن'] = out;
    var extra = '';
    if (out === LM_WAITSUP) {
      ch['مسئول مرحله'] = actor; ch['مهلت مرحله'] = lmFmt_(new Date(stkNow_().getTime() + LM_STAGE_H * 3600000), 'yyyy-MM-dd HH:mm');
      extra = '\nمسئول مرحله: ' + tgEsc_(actor) + ' · مهلت: ' + tgFa_(ch['مهلت مرحله']);
    }
    tgLeadSet_(row, ch, actor, 'تلگرام', 'پیامد: ' + out);
    tgLeadEv_({ code: code, row: row, actor: actor, channel: 'تلگرام', what: 'پیامد', to: out, type: type });
    if (out === LM_SCHOOL) { var sid = lmToSchool_(row, code, type); extra = '\nردیف هاب مدرسه: ' + tgEsc_(sid || 'ساخته نشد'); }
    return tgSend_(chat, '✅ پیامد ' + tgEsc_(code) + ': ' + tgEsc_(out) + extra);
  }
}
/* «ارجاع به مدرسه»: ردیف تازه در «درخواست عضویت» هاب مدرسه با همان کد لید */
function lmToSchool_(row, code, type) {
  var l = null; try { l = tgLeadRead_(row); } catch (e) {}
  var note = 'ارجاع از هاب پذیرش · ' + code + ' · ' + type;
  if (stkDry_()) { (TG_MEM['lm:school'] = TG_MEM['lm:school'] || []).push({ code: code, note: note }); tgLeadEv_({ code: code, row: row, actor: 'بات', channel: 'مدل لید', what: LM_SCHOOL, to: 'د-DRY', type: type }); return 'د-DRY'; }
  try {
    var sh = tgSchSheet_(TG_SCH_T_REQ, TG_SCH_REQ_HEAD), id = tgSchNextId_(TG_SCH_T_REQ, TG_SCH_REQ_HEAD, 'د');
    sh.appendRow([id, tgJDateFull_(new Date(), TG_TZ), (l && l.name) || '', '', (l && l.chatId) || '', type === LM_T.T ? 'درمانگر' : 'دانشجو', '', '',
      (l && l.phone) ? "'" + l.phone : '', '', '', note, TG_SJ_ST.wait, '', '', note]);
    tgSlSet_(sh.getLastRow(), { 'منبع': 'ارجاع پذیرش' }, 'مدل لید');
    try { tgSchDropCache_(); } catch (eC) {}
    tgLeadEv_({ code: code, row: row, actor: 'بات', channel: 'مدل لید', what: LM_SCHOOL, to: id, type: type });
    return id;
  } catch (e) { tgErr_('lmToSchool_', e); return ''; }
}

/* ---------------- داشبورد ---------------- */
function lmMedian_(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function lmEvRows_() {
  if (stkDry_()) return TG_MEM['lm:ev'] || [];
  var es = tgLeadEvSheet_(); if (!es || es.getLastRow() < 2) return [];
  var n = Math.min(es.getLastRow() - 1, 20000);
  return es.getRange(es.getLastRow() - n + 1, 1, n, 6).getValues().map(function (r) { return { t: r[0] instanceof Date ? r[0].getTime() : 0, code: String(r[1] || ''), actor: String(r[3] || ''), ch: String(r[4] || ''), what: String(r[5] || '') }; });
}
/* بلوک‌های داشبورد (آرایه‌ای از [عنوان، مقدار، …]) */
function lmDashRows_() {
  var idx = lmLeadIdx_(), ev = lmEvRows_(), out = [];
  var created = {}, first = {}, typeOf = {};
  idx.list.forEach(function (l) {
    if (!l.code) return;
    var t = l.type || lmGuessType_(l.src, l.text); typeOf[l.code] = t;
    var d = new Date(String(l.date || '') + 'T' + (/^\d{1,2}:\d{2}$/.test(l.time || '') ? ('0' + l.time).slice(-5) : '00:00') + ':00');
    if (!isNaN(d.getTime())) created[l.code] = d.getTime();
  });
  ev.forEach(function (e) {
    if (!e.code || first[e.code] || !e.t) return;
    if (/^(بات|مراجع|مهاجرت)$/.test(e.actor) || /مدل لید|درخواست متوقف/.test(e.ch)) return;
    first[e.code] = e.t;
  });
  out.push(['📊 داشبورد لید', 'به‌روز: ' + stkStamp_()]);
  out.push(['']);
  out.push(['زمان تا اولین تماس (میانه، ساعت)', 'شمار لید با تماس']);
  LM_TYPES.forEach(function (t) {
    var a = Object.keys(first).filter(function (c) { return typeOf[c] === t && created[c] && first[c] >= created[c]; }).map(function (c) { return (first[c] - created[c]) / 3600000; });
    var m = lmMedian_(a);
    out.push([t, m === null ? '-' : Math.round(m * 10) / 10, a.length]);
  });
  out.push(['']);
  out.push(['نرخ تبدیل بر اساس نوع', 'کل', 'موفق', 'درصد']);
  LM_TYPES.forEach(function (t) {
    var all = idx.list.filter(function (l) { return l.code && typeOf[l.code] === t; });
    var win = all.filter(function (l) { return LM_WIN[t].test(l.out || '') || (t === LM_T.C && (tgStOf_(l.status) === TG_ST.START || l.start === 'بله')); });
    out.push([t, all.length, win.length, all.length ? Math.round(100 * win.length / all.length) + '%' : '-']);
  });
  out.push(['']);
  out.push(['توقف بر اساس دلیل', 'باز', 'کل']);
  var by = {};
  stkRows_().forEach(function (r) { var k = r.mode + ' · ' + r.reason; by[k] = by[k] || [0, 0]; by[k][1]++; if (stkOpen_(r)) by[k][0]++; });
  Object.keys(by).forEach(function (k) { out.push([k, by[k][0], by[k][1]]); });
  out.push(['']);
  out.push(['تقاضای حضوری بی‌جواب (شهر یا مکان · روز و بازه)', 'شمار']);
  var dm = {};
  lmInpTab_(TG_INP_DEM, TG_INP_DHEAD).rows.forEach(function (r) {
    if (r[1] !== 'مراجع' || r[7] !== 'باز') return;
    var k = (lmCityOf_(r[6]) || (r[2] && r[2] !== '-' ? r[2] : 'نامعلوم')) + ' · ' + ([r[3], r[4]].filter(String).join(' ') || 'هر وقت');
    dm[k] = (dm[k] || 0) + 1;
  });
  Object.keys(dm).sort(function (x, y) { return dm[y] - dm[x]; }).forEach(function (k) { out.push([k, dm[k]]); });
  out.push(['']);
  out.push(['درمانگر متقاضی بر اساس پیامد', 'شمار']);
  var ap = {};
  idx.list.forEach(function (l) { if (l.code && typeOf[l.code] === LM_T.T) { var k = l.out || 'بی پیامد'; ap[k] = (ap[k] || 0) + 1; } });
  Object.keys(ap).forEach(function (k) { out.push([k, ap[k]]); });
  return out;
}
function lmDash_() {
  var rows = lmDashRows_();
  if (stkDry_()) { TG_MEM['lm:dash'] = rows; return rows.length; }
  var ss = tgSS_(), sh = ss.getSheetByName(LM_DASH);
  if (!sh) { sh = ss.insertSheet(LM_DASH); sh.setRightToLeft(true); }
  sh.clear();
  var w = 4, v = rows.map(function (r) { var x = r.slice(0, w); while (x.length < w) x.push(''); return x; });
  sh.getRange(1, 1, v.length, w).setValues(v);
  sh.getRange(1, 1).setFontSize(15).setFontWeight('bold');
  v.forEach(function (r, i) { if (r[1] === 'شمار' || r[1] === 'کل' || r[1] === 'باز' || r[1] === 'شمار لید با تماس') sh.getRange(i + 1, 1, 1, w).setFontWeight('bold').setBackground('#f5f5f8'); });
  sh.setColumnWidth(1, 360);
  return rows.length;
}

/* ---------------- یک‌باره بعد از انتشار (CI_ONCE_AUTO): فقط شمارش آزمایشی، بی نوشتن ---------------- */
/* یک‌باره فقط می‌شمارد و درخواست طرح کامنت‌ها را می‌گذارد؛ پیام واحد با «✅ اجرا» را cmTick5_ (تا ۱۵ دقیقه بعد) می‌فرستد،
   چون دسته‌بندی ۸۳ کامنت در زمان یک‌بارهٔ انتشار جا نمی‌شود */
function tgV1702Plan() {
  var p = lmSync_(true);
  stkProp_('CM_PLAN_REQ', '1'); stkProp_('CM_AT', null);
  return 'آزمایشی: ' + LM_TYPES.map(function (x) { return x + ' ' + p.made[x] + '+' + p.linked[x]; }).join('، ') +
    ' · بی نوع ' + p.typed + ' · مسئول بات ' + p.bot + ' · تکراری ' + p.dup.length + (p.err.length ? ' · خطا ' + p.err.join('،') : '') + ' (تازه+اتصال) · طرح کامنت‌ها در تیک بعدی';
}
function lmPlanSend_() {
  var p = lmSync_(true), cmTxt = '', n = 0;
  try { var r = cmRun_(true); n = r.rows.length; cmTxt = cmPlanText_(r); } catch (e) { tgErr_('cmRun_ dry', e); cmTxt = '💬 کامنت‌ها خوانده نشد: ' + tgEsc_(String(e).slice(0, 120)); }
  var t = '🧩 <b>مدل لید: نتیجهٔ آزمایشی پر کردن داده‌ها</b>\n\n' + lmPlanText_(p, true) +
    '\n\n<b>تب‌های تازه:</b> ' + LM_NEW_TABS.join('، ') +
    '\n<b>ستون‌های تازهٔ «لیدها»:</b> ' + LM_COLS.join('، ') +
    '\n<b>ستون تازهٔ «رویدادهای لید»:</b> نوع لید' +
    '\n<b>ستون «کد لید» در انتهای:</b> ' + LM_SRC.map(function (s) { return s.tab; }).join('، ') +
    '\n<b>تب‌های تازهٔ کامنت:</b> ' + CM_TAB + ' (فهرست کامل پیشنهادها با حالت «آزمایشی»)' +
    '\n\nبا «✅ اجرا» همین‌ها نوشته و کامنت‌ها اعمال می‌شوند (پاسخ کوتاه زیر هر کامنت، بی resolve)؛ کارت‌های درخواست متوقف ساخته ولی نگه داشته می‌شوند.';
  var parts = [t, cmTxt], kb = { inline_keyboard: [[{ text: '✅ اجرا', callback_data: 'lm:go' }]] };
  /* پیام بلند تکه‌تکه؛ دکمه روی آخرین تکه */
  var chunks = [];
  parts.join('\n\n').split('\n').forEach(function (ln) { if (!chunks.length || (chunks[chunks.length - 1] + '\n' + ln).length > 3800) chunks.push(ln); else chunks[chunks.length - 1] += '\n' + ln; });
  chunks.forEach(function (c, i) { tgNotify_(String(TG_OWNER_CHAT), TG_NK.task, c, i === chunks.length - 1 ? { ref: 'LM', markup: kb } : { ref: 'LM' }); });
  return n;
}

/* ---------------- تست خشک ---------------- */
function lmTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX, dlK = TG_DRY_LEAD;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var OWN = String(TG_OWNER_CHAT);
  try {
    TG_MEM['stk:boss'] = { name: 'پذیرشی', chat: '7101', role: 'مسئول پذیرش' };
    TG_MEM['stk:now'] = pbTehran_(2026, 10, 4, 10, 0).getTime();
    TG_MEM['lm:leads'] = [
      { row: 2, code: 'L-1100', type: '', ref: '', chat: '8801', owner: 'پذیرشی', status: 'جدید', src: 'Telegram bot', text: '', date: '2026-10-01', time: '10:00' },
      { row: 3, code: 'L-1101', type: '', ref: '', chat: '', owner: 'بات — خودرزرو', status: 'معارفه رزرو شد', src: 'Telegram mini app', text: '', date: '2026-10-01', time: '11:00' }];
    TG_MEM['tab:' + TG_INP_DEM] = [['1405-07-10 10:00', 'مراجع', '-', '', '', '8801', 'حضوری در شهری که مکان نداریم · شهر: شیراز', 'باز'],
                                   ['1405-07-10 11:00', 'مراجع', 'gandhi', 'شنبه', 'صبح', '8803', 'در این روز درمانگر حضوری نبود', 'باز'],
                                   ['1405-07-10 12:00', 'درمانگر', 'gandhi', '', 'عصر و شب', 'درمانگر الف', 'می‌خواهد اتاق بگیرد', 'بسته']];
    TG_MEM['tab:' + TG_INP_REQ] = [['R-1', 'اکنون', 'درمانگر الف', '1', 'gandhi', 'ساعت تازه', 'شنبه', '9', '15', '', '', '', '', 'منتظر پذیرش', '', '']];
    TG_MEM['lm:tab:اپلای تراپیست'] = { head: TG_SCH_APPLY_HEAD.slice(), rows: [
      (function () { var r = TG_SCH_APPLY_HEAD.map(function () { return ''; }); r[0] = 'A-001'; r[2] = 'متقاضی آزمایشی'; r[11] = 'ارجاع به سوپروایزر'; r[13] = 'سوپروایزر ب'; return r; })(),
      (function () { var r = TG_SCH_APPLY_HEAD.map(function () { return ''; }); r[0] = 'A-002'; r[2] = 'متقاضی دوم'; r[11] = 'ثبت نتیجه'; r[16] = 'پذیرش کامل'; return r; })()] };
    TG_MEM['lm:tab:درخواست فضای پارتنر'] = { head: TG_PA_RHEAD.slice(), rows: [['P-1', 'اکنون', 'درمانگر ج', '1', '', 'کرج', 'karaj', '', '', '', '', 'در انتظار پارتنر', '', '', '', '']] };
    TG_MEM['lm:tab:صفحهٔ پارتنر'] = { head: TG_PN_HEAD.slice(), rows: [
      (function () { var r = TG_PN_HEAD.map(function () { return ''; }); r[0] = 'nour'; r[1] = 'مرکز نور'; r[2] = 'تهران'; r[9] = 'فعال'; return r; })(),
      (function () { var r = TG_PN_HEAD.map(function () { return ''; }); r[0] = 'nour2'; r[1] = 'کلینیک نور'; r[2] = 'تهران'; r[9] = 'پیش‌نویس'; return r; })()] };

    /* آزمایشی: هیچ نوشتنی */
    var p = lmSync_(true);
    ok('آزمایشی: شمار بر اساس نوع (حضوری ۳ تازه + ۱ اتصال، متقاضی ۲، پارتنر ۲)', p.made[LM_T.I] === 3 && p.linked[LM_T.I] === 1 && p.made[LM_T.T] === 2 && p.made[LM_T.P] === 2);
    ok('آزمایشی: صفحهٔ تکراری نور پیدا می‌شود', p.dup.length === 1 && /nour2/.test(p.dup[0]));
    ok('آزمایشی: چیزی نوشته نمی‌شود', TG_MEM['lm:leads'].length === 2 && TG_MEM['tab:' + TG_INP_DEM][0].length === 8 && TG_MEM['lm:leads'][1].owner === 'بات — خودرزرو');
    ok('آزمایشی: مسئول بات و لید بی نوع شمرده می‌شوند', p.bot === 1 && p.typed === 2);
    var plan = tgV1702Plan();
    ok('یک‌باره خودش پیامی نمی‌فرستد و طرح کامنت را می‌خواهد', !TG_OUTBOX.length && TG_MEM['stkp:CM_PLAN_REQ'] === '1');
    cmTick5_();
    var pm = TG_OUTBOX.filter(function (o) { return o.chat === OWN && /نتیجهٔ آزمایشی/.test(o.text || ''); })[0];
    ok('یک‌باره فقط گزارش و دکمهٔ «✅ اجرا» برای یاسر؛ فهرست تب و ستون تازه', pm && JSON.stringify(pm.markup).indexOf('lm:go') > -1 && /پیامد/.test(pm.text) && /درخواست‌های متوقف/.test(pm.text) && /آزمایشی/.test(plan));
    ok('پیش از تأیید: قلاب‌ها، کامنت‌ها و اسکن ساعتی خاموش', cmTick5_() === 0 && stkHourly_().off === 1 && stkOnNoSlot_('9901', {}) === null && lmOnSuggest_('8801', 'شنبه صبح', 'آنلاین') === null);
    lmCb_('5555', 'lm:go');
    ok('فقط یاسر «اجرا» را می‌زند', !lmOn_());
    lmCb_(OWN, 'lm:go');
    ok('یاسر «اجرا» زد ← روشن', lmOn_());

    /* اجرای واقعی (حافظه) */
    TG_OUTBOX = [];
    var h = stkHourly_();
    var L = TG_MEM['lm:leads'];
    ok('لید تازه با نوع، مسئول پذیرشی و مهلت ۲۴ ساعت', L.filter(function (l) { return l.type === LM_T.T; }).length === 2 &&
      L.filter(function (l) { return l.f && l.f['مسئول'] === tgNm_('reception') && l.f['مهلت'] === '2026-10-05 10:00' && l.f['اقدام بعدی'] === 'اقدام اول'; }).length >= 3);
    ok('تقاضای حضوری مراجع با لید موجود همان chat وصل می‌شود، نه لید تازه', TG_MEM['tab:' + TG_INP_DEM][0][8] === 'L-1100');
    ok('تقاضای حضوری بی لید ← لید تازه با chat و پیشنهاد کاربر', L.some(function (l) { return l.chat === '8803' && l.type === LM_T.I && l.f['پیشنهاد کاربر'] === 'شنبه · صبح'; }));
    ok('ردیف بستهٔ قدیمی ← لید بسته با پیامد', L.some(function (l) { return /درمانگر/.test(l.ref) && l.status === TG_ST.CLOSED && l.out === 'ساعت پیدا شد'; }));
    ok('متقاضی در مرحلهٔ سوپروایزر: پیامد، مسئول مرحله و مهلت مرحله', L.some(function (l) { return l.ref === 'اپلای تراپیست · A-001' && l.out === LM_WAITSUP && l.f['مسئول مرحله'] === 'سوپروایزر ب' && l.f['مهلت مرحله'] === '2026-10-07 10:00'; }));
    ok('متقاضی پذیرفته ← لید بسته با «پذیرش»', L.some(function (l) { return l.ref === 'اپلای تراپیست · A-002' && /^پذیرش/.test(l.out) && l.status === TG_ST.CLOSED; }));
    var pr = TG_MEM['lm:tab:صفحهٔ پارتنر'].rows;
    ok('صفحهٔ تکراری نور: علامت «تکراری، پاک نشود» و همان لید، بی ردیف حذف‌شده', pr.length === 2 && /تکراری nour، پاک نشود/.test(pr[1][pr[1].length - 1]) && pr[1][pr[1].length - 1].indexOf(pr[0][pr[0].length - 1]) === 0);
    ok('مسئول «بات — خودرزرو» ← پذیرشی', L[1].owner === tgNm_('reception'));
    ok('لید قدیمی بی نوع ← نوع از منبع', L[0].type === LM_T.C);
    var n0 = L.length; stkHourly_();
    ok('اجرای دوباره لید تکراری نمی‌سازد', TG_MEM['lm:leads'].length === n0);
    ok('رویداد ساخت لید با نوع ثبت می‌شود', TG_OUTBOX.some(function (o) { return o.kind === 'leadev' && o.o.what === 'ساخت لید' && o.o.type === LM_T.T; }));
    /* کارت‌های متوقف ساخته ولی نگه‌داشته */
    var held = stkRows_().filter(function (r) { return r.card === STK_HELD; });
    ok('کارت‌های موردهای فعلی ساخته و نگه‌داشته؛ چیزی برای پذیرشی نرفت', held.length >= 1 && !TG_OUTBOX.some(function (o) { return o.chat === '7101' && /درخواست متوقف/.test(o.text || ''); }));
    var rep = TG_OUTBOX.filter(function (o) { return o.chat === OWN && /مدل لید اجرا شد/.test(o.text || ''); });
    ok('گزارش اجرای اول یک بار برای یاسر با دکمهٔ «ارسال کارت‌ها»', rep.length === 1 && JSON.stringify(rep[0].markup).indexOf('sk:send') > -1);
    var city = stkRows_().filter(function (r) { return r.key === 'inp_nocity:شیراز'; })[0];
    ok('ستون‌های تب متوقف: کد لید، نوع، حالت، شهر، دلیل، از کی، مسئول، اقدام لازم', STK_HEAD.slice(0, 8).join('|') === 'کد لید|نوع|حالت|شهر یا مکان|دلیل دقیق توقف|از کی|مسئول|اقدام لازم' &&
      city && city.lead === 'L-1100' && city.type === LM_T.I && city.mode === 'حضوری' && city.place === 'شیراز' && city.owner === 'پذیرشی');
    stkCb_('7101', 'sk:send:all');
    ok('فقط یاسر کارت‌ها را آزاد می‌کند', !stkSendOn_());
    stkCb_(OWN, 'sk:send:all');
    ok('بعد از تأیید یاسر کارت‌ها برای پذیرشی می‌روند', stkSendOn_() && TG_OUTBOX.some(function (o) { return o.chat === '7101' && /درخواست متوقف/.test(o.text || ''); }));
    ok('نام مراجع و متقاضی در هیچ کارتی نیست', !TG_OUTBOX.some(function (o) { return /متقاضی آزمایشی|متقاضی دوم/.test(o.text || ''); }));

    /* پیشنهاد کاربر */
    TG_OUTBOX = [];
    TG_MEM['stk:lead:9905'] = 'L-1100';
    stkOnNoSlot_('9905', { scope: 'فردی', zone: 'Europe/Berlin', total: 4, usable: 0 });
    ok('جست‌وجوی بی‌نتیجهٔ آنلاین در رویدادها (حالت، روز، دلیل)', TG_OUTBOX.some(function (o) { return o.kind === 'leadev' && o.o.what === 'جست‌وجوی بی‌نتیجه' && /آنلاین · Europe\/Berlin/.test(o.o.to) && /جور نشد/.test(o.o.note); }));
    lmOnSuggest_('9905', 'دوشنبه‌ها بعد از ۱۸، ونک', 'آنلاین');
    var sc = TG_OUTBOX.filter(function (o) { return o.chat === '7101' && /پیشنهاد کاربر/.test(o.text || ''); })[0];
    ok('کارت پیشنهاد کاربر برای پذیرشی: کد لید، نوع، دلیل دقیق، پیشنهاد', sc && /L-1100/.test(sc.text) && /نوع: مراجع/.test(sc.text) && /وقت معارفه جور نشد/.test(sc.text) && /ونک/.test(sc.text));
    ok('رویداد «پیشنهاد کاربر» ثبت می‌شود', TG_OUTBOX.some(function (o) { return o.kind === 'leadev' && o.o.what === 'پیشنهاد کاربر'; }));
    TG_OUTBOX = [];
    TG_MEM['stk:lead:8807'] = 'L-1100';
    lmOnDemand_('8807', '-', '', '', 'حضوری در شهری که مکان نداریم · شهر: رشت');
    ok('تقاضای حضوری بی جواب ← کارت با شهر و دلیل', TG_OUTBOX.some(function (o) { return o.chat === '7101' && /حضوری/.test(o.text || '') && /شهر: رشت/.test(o.text) && /شهری که مکان نداریم/.test(o.text); }));

    /* پیامد */
    TG_DRY_LEAD = { row: 9, code: 'L-1200', type: LM_T.T, name: 'x' };
    TG_MEM['deskwho'] = { name: 'پذیرشی', chat: '7101' };
    TG_OUTBOX = [];
    lmCb_('7101', 'lm:o:L-1200');
    var om = TG_OUTBOX.filter(function (o) { return o.chat === '7101'; })[0];
    ok('دکمه‌های پیامد بر اساس نوع (متقاضی: پذیرش، ارجاع به مدرسه، رد، در انتظار)', om && JSON.stringify(om.markup).indexOf('lm:s:L-1200:3') > -1 && /پذیرش \(ورود به سیستم/.test(JSON.stringify(om.markup)));
    lmCb_('7101', 'lm:s:L-1200:3');
    var set = TG_OUTBOX.filter(function (o) { return o.kind === 'leadset'; })[0];
    ok('«در انتظار مصاحبه/سوپروایزر» مسئول و مهلت مرحله را ثبت می‌کند', set && set.changes['پیامد'] === LM_WAITSUP && set.changes['مسئول مرحله'] === 'پذیرشی' && set.changes['مهلت مرحله'] === '2026-10-07 10:00');
    lmCb_('7101', 'lm:s:L-1200:1');
    ok('«ارجاع به مدرسه» ردیف هاب مدرسه با همان کد لید می‌سازد', (TG_MEM['lm:school'] || []).some(function (x) { return x.code === 'L-1200' && /ارجاع از هاب پذیرش · L-1200/.test(x.note); }));
    ok('پیامد ← وضعیت (شروع درمان، بی‌پاسخ، رد، قرارداد)', lmStOf_('شروع درمان') === TG_ST.START && lmStOf_('بی‌پاسخ') === TG_ST.NOANS && lmStOf_('رد با دلیل') === TG_ST.CLOSED && lmStOf_('قرارداد') === TG_ST.FOLLOW);
    TG_MEM['deskwho'] = null;
    TG_OUTBOX = [];
    lmCb_('5555', 'lm:s:L-1200:0');
    ok('غیرپذیرش پیامد ثبت نمی‌کند', !TG_OUTBOX.some(function (o) { return o.kind === 'leadset'; }));

    /* داشبورد */
    TG_MEM['lm:ev'] = [{ t: pbTehran_(2026, 10, 1, 12, 0).getTime(), code: 'L-1100', actor: 'پذیرشی', ch: 'تلگرام', what: 'آخرین تماس' }];
    var dsh = lmDashRows_(), txt = JSON.stringify(dsh);
    ok('داشبورد: زمان تا اولین تماس، نرخ تبدیل، توقف، تقاضای حضوری، متقاضی بر اساس پیامد',
      /زمان تا اولین تماس/.test(txt) && /نرخ تبدیل/.test(txt) && /توقف بر اساس دلیل/.test(txt) && /تقاضای حضوری بی‌جواب/.test(txt) && /درمانگر متقاضی بر اساس پیامد/.test(txt));
    var mr = dsh.filter(function (r) { return r[0] === LM_T.C && typeof r[1] === 'number'; })[0];
    ok('داشبورد: میانهٔ زمان تا تماس مراجع ۲ ساعت', mr && mr[1] === 2);
    ok('داشبورد: تقاضای حضوری شیراز شمرده می‌شود', dsh.some(function (r) { return /^شیراز/.test(String(r[0])) && r[1] === 1; }));
    ok('داشبورد نام ندارد', txt.indexOf('متقاضی آزمایشی') < 0);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 400) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; TG_DRY_LEAD = dlK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ مدل لید درست است'));
  return tgTestTally_(log, fail);
}

/* ---------------- v170.4: پشتیبان، خاموش و برگرداندن ---------------- */
/* تب «لیدها» به شکل جدول متن و فرمول (فرمول هر خانه اگر داشت، وگرنه مقدار) */
function lmTabGet_() {
  if (stkDry_()) return (TG_MEM['lm:sheet'] || []).map(function (r) { return r.slice(); });
  var sh = tgSS_().getSheetByName(TG_LEADS), lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 1 || lc < 1) return [];
  var rg = sh.getRange(1, 1, lr, lc), v = rg.getValues(), f = rg.getFormulas();
  return v.map(function (r, i) { return r.map(function (x, j) { return f[i][j] ? f[i][j] : x; }); });
}
function lmBackup_(why) {
  try {
    var stamp = Utilities.formatDate(stkDry_() ? cmNow_() : new Date(), TG_TZ, 'yyyy-MM-dd HH-mm');
    var name = 'پشتیبان لیدها ' + stamp, data = lmTabGet_();
    if (stkDry_()) { if (TG_MEM['lm:bak:' + name]) name += ' ' + why; TG_MEM['lm:bak:' + name] = data.map(function (r) { return r.slice(); }); return { ok: true, name: name, rows: Math.max(0, data.length - 1) }; }
    var ss = tgSS_(); if (ss.getSheetByName(name)) name += ' ' + why;
    var sh = ss.getSheetByName(TG_LEADS).copyTo(ss).setName(name);
    try { sh.hideSheet(); } catch (eH) {}
    try { sh.getRange(1, 1).setNote('پشتیبان خودکار مدل لید (' + why + ')؛ پاک یا ویرایش نشود.'); } catch (eN) {}
    return { ok: true, name: name, rows: Math.max(0, data.length - 1) };
  } catch (e) { tgErr_('lmBackup_', e); return { ok: false, err: String(e && e.message || e).slice(0, 120) }; }
}
function lmBakGet_(name) {
  if (stkDry_()) return TG_MEM['lm:bak:' + name] ? TG_MEM['lm:bak:' + name].map(function (r) { return r.slice(); }) : null;
  var sh = tgSS_().getSheetByName(name); if (!sh) return null;
  var lr = sh.getLastRow(), lc = sh.getLastColumn(); if (lr < 1) return [];
  var rg = sh.getRange(1, 1, lr, lc), v = rg.getValues(), f = rg.getFormulas();
  return v.map(function (r, i) { return r.map(function (x, j) { return f[i][j] ? f[i][j] : x; }); });
}
/* برگرداندن: ردیف‌های پشتیبان + لیدهای تازهٔ بعد از پشتیبان که مدل نساخته (کد در پشتیبان نیست و «منبع جزئیات» خالی) */
function lmRestore_(name) {
  var bak = lmBakGet_(name);
  if (!bak || !bak.length) return { ok: false, err: 'تب پشتیبان «' + name + '» پیدا نشد' };
  var pre = lmBackup_('پیش از برگرداندن');
  if (!pre.ok) return { ok: false, err: 'پشتیبانِ وضع فعلی ساخته نشد' };
  try {
    var cur = lmTabGet_(), head = (cur[0] || bak[0]).map(String), ci = head.indexOf('کد لید'), si = head.indexOf('منبع جزئیات');
    if (ci < 0) ci = 0;
    var seen = {}; bak.slice(1).forEach(function (r) { seen[String(r[ci]).trim()] = 1; });
    var kept = [], dropped = 0;
    cur.slice(1).forEach(function (r) {
      var c = String(r[ci]).trim(); if (!c || seen[c]) return;
      if (si > -1 && String(r[si] || '').trim()) dropped++; else kept.push(r);
    });
    var w = Math.max(bak[0].length, head.length), pad = function (r) { r = r.slice(0, w); while (r.length < w) r.push(''); return r; };
    var out = bak.map(pad).concat(kept.map(pad));
    if (stkDry_()) TG_MEM['lm:sheet'] = out;
    else {
      var sh = tgSS_().getSheetByName(TG_LEADS), lr = Math.max(sh.getLastRow(), out.length), lc = Math.max(sh.getLastColumn(), w);
      sh.getRange(1, 1, lr, lc).clearContent();
      sh.getRange(1, 1, out.length, w).setValues(out);
      /* ردیف هر chat ممکن است عوض شده باشد: کش ردیف لید (lr<chat>) همه پاک */
      try { var hi = head.indexOf('یادداشت'), ks = []; if (hi > -1) cur.concat(out).forEach(function (r) { var c = tgLeadChat_(String(r[hi] || '')); if (c) ks.push('lr' + c); }); for (var k = 0; k < ks.length; k += 500) CacheService.getScriptCache().removeAll(ks.slice(k, k + 500)); } catch (eC) {}
    }
    return { ok: true, rows: bak.length - 1, kept: kept.length, dropped: dropped, pre: pre.name };
  } catch (e) { tgErr_('lmRestore_', e); return { ok: false, err: String(e && e.message || e).slice(0, 120) }; }
}
function lmSafeText_() {
  var bn = stkProp_('LM_BAK');
  return '🧩 <b>مدل لید</b>: ' + (lmOn_() ? 'روشن' : 'خاموش') + (bn ? '\nپشتیبان: «' + tgEsc_(bn) + '»' : '\nپشتیبانی ثبت نشده');
}
function lmSafeKb_() {
  return { inline_keyboard: [[{ text: '⏸ خاموش کردن مدل لید', callback_data: 'lm:off' }], [{ text: '↩️ برگرداندن «' + TG_LEADS + '» از پشتیبان', callback_data: 'lm:rb' }]] };
}

/* v170.4: پشتیبان، خاموش و برگرداندن (روی کد پیشین مردود: «اجرا» پشتیبانی نمی‌ساخت و دکمهٔ خاموش و برگرداندن نبود) */
function lmSafeTests() {
  var out = [], pass = 0, fail = 0;
  var ok = function (t, c) { if (c) pass++; else { fail++; out.push('❌ ' + t); } };
  var was = TG_DRY; TG_DRY = true; TG_OUTBOX = []; TG_MEM = {};
  var OWN = String(TG_OWNER_CHAT), OUT = function () { return JSON.stringify(TG_OUTBOX); };
  try {
    TG_MEM['stkp:now'] = '2026-10-03T10:00:00Z';
    var H = ['تاریخ', 'وضعیت', 'یادداشت', 'کد لید', 'منبع جزئیات'];
    TG_MEM['lm:sheet'] = [H, ['1405-07-01', 'جدید', 'tg:8801', 'L-2001', ''], ['1405-07-02', 'در پیگیری', '', 'L-2002', '']];
    lmCb_('5555', 'lm:go');
    ok('غریبه «اجرا» نمی‌زند و پشتیبانی ساخته نمی‌شود', !lmOn_() && !stkProp_('LM_BAK'));
    TG_OUTBOX = []; lmCb_(OWN, 'lm:go');
    var bn = stkProp_('LM_BAK');
    ok('«اجرا»ی یاسر اول پشتیبان کامل می‌سازد، بعد روشن می‌کند', lmOn_() && bn && JSON.stringify(TG_MEM['lm:bak:' + bn]) === JSON.stringify(TG_MEM['lm:sheet']));
    ok('پیام اجرا نام پشتیبان و دکمه‌های خاموش و برگرداندن دارد', OUT().indexOf(bn) > -1 && OUT().indexOf('lm:off') > -1 && OUT().indexOf('lm:rb') > -1);
    /* بعد از اجرا: مدل یک ردیف را عوض کرده، یک لید خودش ساخته و یک لید واقعی تازه هم آمده */
    TG_MEM['lm:sheet'][1][1] = 'نیاز به ارجاع مجدد';
    TG_MEM['lm:sheet'].push(['1405-07-11', 'جدید', '', 'L-2003', 'درخواست‌های حضوری:2']);
    TG_MEM['lm:sheet'].push(['1405-07-11', 'جدید', 'tg:8805', 'L-2004', '']);
    lmCb_('5555', 'lm:off');
    ok('غریبه نمی‌تواند خاموش کند', lmOn_());
    TG_OUTBOX = []; lmCb_(OWN, 'lm:off');
    ok('دکمهٔ خاموش پردازش را متوقف می‌کند', !lmOn_() && cmTick5_() === 0 && stkHourly_().off === 1);
    TG_OUTBOX = []; lmCb_(OWN, 'lm:rb');
    ok('برگرداندن اول تأیید می‌خواهد و چیزی عوض نمی‌کند', OUT().indexOf('lm:rbok') > -1 && TG_MEM['lm:sheet'][1][1] === 'نیاز به ارجاع مجدد');
    lmCb_('5555', 'lm:rbok');
    ok('غریبه نمی‌تواند برگرداند', TG_MEM['lm:sheet'][1][1] === 'نیاز به ارجاع مجدد');
    TG_OUTBOX = []; lmCb_(OWN, 'lm:rbok');
    var S = TG_MEM['lm:sheet'];
    ok('بعد از تأیید، ردیف‌ها از پشتیبان برمی‌گردند', S[1][1] === 'جدید' && S[2][3] === 'L-2002');
    ok('لید واقعی تازهٔ بعد از پشتیبان می‌ماند و لید ساختهٔ مدل برداشته می‌شود', S.length === 4 && S[3][3] === 'L-2004' && !S.some(function (r) { return r[3] === 'L-2003'; }));
    ok('وضع پیش از برگرداندن هم پشتیبان می‌شود و مدل خاموش می‌ماند', Object.keys(TG_MEM).filter(function (k) { return k.indexOf('lm:bak:') === 0; }).length === 2 && !lmOn_() && OUT().indexOf('برگشت') > -1);
  } catch (e) { fail++; out.push('❌ خطا: ' + e); }
  TG_DRY = was; TG_OUTBOX = []; TG_MEM = {};
  Logger.log('پشتیبان مدل لید: ' + pass + ' قبول، ' + fail + ' مردود\n' + out.join('\n'));
  return { pass: pass, fail: fail, out: out };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'lmSafeTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['پشتیبان مدل لید (v170.4)', 'lmSafeTests']); } catch (eLs) {}
