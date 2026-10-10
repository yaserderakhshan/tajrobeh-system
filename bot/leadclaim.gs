/**
 * v170.23.43 · قول پاسخ لید تازهٔ پذیرش (leadclaim.gs)
 *
 * ۱. صاحب لید لحظهٔ ساخت (tgAppendLead_ ← lcOwnerFor_): از تب «نوبت پذیرش» برای همان روز و بازه؛ خانهٔ خالی = مسئول پذیرش.
 *    بیرون از ساعت کاری صاحب: صاحب نوبت صبح روز کاری بعد. لید بخش‌های دیگر همان مسئول بخش (tgOwnerFor_).
 *    خانهٔ جدول می‌تواند چند نام با «،» داشته باشد؛ اولی صاحب است و بقیه نفرهای بعدی همان نوبت.
 * ۲. ساعت کاری هر نفر از تب «تیم پذیرش» (شروع اعلان، پایان اعلان، روزهای کاری). کارت فقط در ساعت کاری همان نفر می‌رود.
 * ۳. کارت با سه دکمهٔ «برداشتم»، «تماس گرفتم»، «به بعدی». قول در ساعت کاری ۱۵ دقیقه؛ اگر «برداشتم» نخورد، لید به نفر بعدی
 *    همان نوبت می‌رسد (بعد بقیهٔ تیم پذیرش که در ساعت کاری‌اند، آخر مسئول پذیرش) و سرپرست پذیرش خبر می‌گیرد.
 * ۴. بیرون از ساعت کاری: یک پیام کوتاه به مراجع (اگر از بات آمده) و کارت ساعت ۹ صبح روز کاری بعد با قول ۳۰ دقیقه.
 *    خبر سرپرست «کار» است و در سکوت ۲۲ تا ۹ در صف می‌ماند (tgNotify_).
 * ۵. قاعدهٔ «تماس گرفته، بی قدم بعد» دست نخورد.
 * ۶. «رویدادهای لید»: نوبت · واگذاری، نوبت · به نفر بعدی، نوبت · برداشته شد (دقیقه و «در قول»)، نوبت · اولین تماس (دقیقه).
 *    «داشبورد لید»: میانهٔ زمان تا اولین تماس و درصد لید برداشته‌شده در قول (lcDashRows_).
 * ۷. در لاگ و خطا نام، شماره یا chat_id نمی‌آید؛ فقط نام تابع و کد لید.
 *
 * حالت هر لید در Script Property «LC_ST» (کد لید ← {a ساخت، s شروع قول، p0 قول اول، t کارت فعلی، pr قول فعلی، to، ch، tr، c برداشت، cb، f اولین تماس، at صبح، ack}).
 * صف tgDutyRun_ (TG_DUTY_PEND) همان می‌ماند و هر سطرش با lcStep_ پیش می‌رود.
 */
var LC_PROMISE_MIN = 15, LC_MORNING_MIN = 30, LC_MORNING_H = 9, LC_KEEP_DAYS = 3;
/* v170.23.44 (تصمیم D17): قول تماس اول. عددها در «تنظیمات خصوصی بات»، کلید LEAD_SLA (JSON)؛ خالی یعنی همین پیش‌فرض‌ها:
   first مهلت تماس اول از شروع ساعت کاری صاحب لید (۱۵)، remind یادآوری به صاحب لید (۱۰)، claim مهلت «برداشتم» (۱۵)، morningClaim مهلت «برداشتم» صبح (۳۰) */
cfg_('LEAD_SLA', '');
function lcCfg_() {
  var c = lcDry_() && TG_MEM['lc:cfg'] ? TG_MEM['lc:cfg'] : cfg_('LEAD_SLA', '');
  if (typeof c === 'string') { try { c = c ? JSON.parse(c) : {}; } catch (e) { c = {}; } }
  c = c || {};
  var n = function (v, d) { v = Number(v); return v > 0 && v < 1440 ? v : d; };
  return { first: n(c.first, 15), remind: n(c.remind, 10), claim: n(c.claim, LC_PROMISE_MIN), morning: n(c.morningClaim, LC_MORNING_MIN) };
}
var LC_EV = { start: 'نوبت · واگذاری', pass: 'نوبت · به نفر بعدی', claim: 'نوبت · برداشته شد', first: 'نوبت · اولین تماس', remind: 'نوبت · یادآوری تماس اول', late: 'نوبت · مهلت تماس اول گذشت' };
var LC_IN = 'در قول', LC_OUT = 'بیرون از قول';

function lcDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function lcProp_(k, v) {
  if (lcDry_()) { if (v === undefined) return TG_MEM['lcp:' + k] || ''; TG_MEM['lcp:' + k] = String(v); return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty(k) || '';
  P.setProperty(k, String(v)); return v;
}
function lcAll_() { try { return JSON.parse(lcProp_('LC_ST') || '{}') || {}; } catch (e) { return {}; } }
function lcSt_(code) { var o = lcAll_()[code]; return o ? o : null; }
function lcSave_(code, st) {
  var all = lcAll_(), lim = Date.now() - LC_KEEP_DAYS * 86400000;
  if (lcDry_()) lim = 0;
  all[code] = st;
  Object.keys(all).forEach(function (k) { if (k !== code && Number(all[k].a || all[k].s || 0) < lim) delete all[k]; });
  lcProp_('LC_ST', JSON.stringify(all));
}

/* ───── آدم‌ها و ساعت کاری ───── */
function lcDesk_() { if (lcDry_()) return TG_MEM['lc:desk'] || []; return tgDeskRows_(); }
function lcNorm_(s) { return String(s || '').replace(/[‌\s]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }
function lcByName_(nm) {
  var n = lcNorm_(nm); if (!n) return null;
  var list = lcDesk_();
  for (var i = 0; i < list.length; i++) if (lcNorm_(list[i].name) === n) return list[i];
  return null;
}
function lcBoss_() {
  var list = lcDesk_().filter(function (p) { return p.chat; });
  for (var i = 0; i < list.length; i++) if (String(list[i].role || '').indexOf('مسئول پذیرش') > -1) return list[i];
  return list[0] || null;
}
/** روزهای کاری به شمارهٔ tgDutyDayIdx_ (۰ شنبه … ۶ جمعه) */
function lcDays_(s) {
  s = String(s || '');
  if (s === TG_DESK_DAYS[2] || /همه/.test(s)) return [0, 1, 2, 3, 4, 5, 6];
  if (s === TG_DESK_DAYS[1] || /چهارشنبه/.test(s)) return [0, 1, 2, 3, 4];
  return [0, 1, 2, 3, 4, 5];
}
function lcHour_(t) { return Number(Utilities.formatDate(new Date(t), TG_TZ, 'H')); }
function lcInHours_(p, t) {
  if (!p) return false;
  var h = lcHour_(t), st = Number(p.start) || 9, en = Number(p.end) || 18;
  return lcDays_(p.days).indexOf(tgDutyDayIdx_(new Date(t))) > -1 && h >= st && h < en;
}
function lcSlotIdx_(t) {
  var h = lcHour_(t);
  for (var i = 0; i < TG_DUTY_SLOTS.length; i++) if (h >= TG_DUTY_SLOTS[i][1] && h < TG_DUTY_SLOTS[i][2]) return i;
  return -1;
}
/** نفرهای نوبتِ لحظهٔ t به ترتیب خانه؛ خانهٔ خالی = مسئول پذیرش؛ «—» یا جمعهٔ خالی = بسته (null) */
function lcSlotPeople_(t) {
  var s = lcSlotIdx_(t); if (s < 0) return null;
  var d = tgDutyDayIdx_(new Date(t)), cell = String((tgDutyGrid_()[d] || [])[s] || '').trim();
  if (cell === '—' || cell === '-') return null;
  var boss = lcBoss_();
  if (!cell) return d === 6 ? null : (boss ? [boss] : null);
  var ppl = cell.split(/[،,؛;\/|]+/).map(function (x) { return lcByName_(x.trim()); }).filter(function (p) { return p && p.chat; });
  return ppl.length ? ppl : (boss ? [boss] : null);
}
/** ساعت ۹ نزدیک‌ترین روز کاری بعد (روزی که نوبت صبحش باز است) */
function lcNextMorning_(now) {
  for (var k = 0; k <= 8; k++) {
    var ymd = Utilities.formatDate(new Date(now + k * 86400000), TG_TZ, 'yyyy-MM-dd');
    var t = new Date(ymd + 'T' + ('0' + LC_MORNING_H).slice(-2) + ':00:00+03:30').getTime();
    if (t > now && lcSlotPeople_(t)) return t;
  }
  return now + 86400000;
}
/** برنامهٔ لید در لحظهٔ now: live یعنی همین حالا کسی در ساعت کاری‌اش هست */
function lcPlan_(now) {
  var ppl = lcSlotPeople_(now);
  var live = (ppl || []).filter(function (p) { return lcInHours_(p, now); });
  if (live.length) return { live: true, owner: live[0], at: now, promise: LC_PROMISE_MIN };
  var m = lcNextMorning_(now), pm = lcSlotPeople_(m);
  return { live: false, owner: (pm && pm[0]) || lcBoss_(), at: m, promise: LC_MORNING_MIN };
}
/** از tgAppendLead_: صاحب لید تازه */
function lcOwnerFor_(o) {
  var sec = tgSection_(o && o.source, o && o.note);
  if (sec !== 'پذیرش') return tgOwnerFor_(sec);
  var now = o && o.when ? new Date(o.when).getTime() : (lcDry_() && TG_MEM['lc:now'] ? Number(TG_MEM['lc:now']) : Date.now());
  var pl = lcPlan_(now);
  return pl.owner ? pl.owner.name : tgOwnerFor_('پذیرش');
}

/* ───── کارت، رد، برداشت ───── */
function lcKb_(code) {
  return { inline_keyboard: [[
    { text: '🙋 برداشتم', callback_data: 'lq:take:' + code },
    { text: '☎ تماس گرفتم', callback_data: 'lq:call:' + code },
    { text: '⏭ به بعدی', callback_data: 'lq:next:' + code }]] };
}
function lcOwnerSet_(l, name, why) {
  if (!l || !name || l.owner === name) return;
  if (lcDry_()) (TG_MEM['lc:owner'] = TG_MEM['lc:owner'] || []).push({ code: l.code, name: name });
  else if (l.row >= 2) tgLeadSet_(l.row, { 'مسئول': name }, 'بات', 'بات', why || 'نوبت پذیرش');
  l.owner = name;
}
function lcCard_(code, st, p, now, pr, l, first) {
  st.t = now; st.pr = pr; st.to = p.name; st.ch = String(p.chat);
  st.tr = (st.tr || []).concat([p.name]);
  var head = first && st.at ? '🌅 <b>لید بیرون از ساعت کاری، حالا نوبت شماست</b>' : (first ? '🔔 <b>لید تازه، نوبت شماست</b>' : '🔁 <b>لید به شما رسید</b>');
  tgSend_(st.ch, head + '\nقول پاسخ: ' + tgFa_(pr) + ' دقیقه. با «برداشتم» لید مال شما می‌شود؛ اگر برنداشتید، به نفر بعدی می‌رود.\n\n' + tgLeadCardText_(l), lcKb_(code));
  lcOwnerSet_(l, p.name, first ? 'نوبت پذیرش' : 'نوبت پذیرش · نفر بعدی');
  if (!lcDry_()) {
    try { var fc = tgFlagCol_(), sh = tgSS_().getSheetByName(TG_LEADS); if (String(sh.getRange(l.row, fc).getValue() || '').indexOf('مرحلهٔ') < 0) sh.getRange(l.row, fc).setValue(tgCell_('مرحلهٔ ۱ ' + Utilities.formatDate(new Date(now), TG_TZ, 'MM-dd HH:mm') + ' · نوبت ' + p.name)); } catch (eF) { tgErr_('lcCard_ flag', eF, code); }
    try { if (typeof opsAdaptLead_ === 'function') opsAdaptLead_(code, p.chat, p.name); } catch (eO) { tgErr_('lcCard_ ops', eO, code); }
  }
}
/** نفر بعدی: بقیهٔ همان نوبت، بعد تیم پذیرش در ساعت کاری، آخر مسئول پذیرش؛ کسی که امتحان شده نه */
function lcNext_(st, now) {
  var tried = {}; (st.tr || []).forEach(function (n) { tried[lcNorm_(n)] = 1; });
  var cand = (lcSlotPeople_(now) || []).concat(lcDesk_().filter(function (p) { return /پذیرش/.test(String(p.role || '')); }));
  var b = lcBoss_(); if (b) cand.push(b);
  for (var i = 0; i < cand.length; i++) {
    var p = cand[i];
    if (p && p.chat && !tried[lcNorm_(p.name)] && lcInHours_(p, now)) return p;
  }
  return null;
}
function lcPass_(code, st, l, now, why) {
  var from = st.to || '', boss = lcBoss_(), nx = lcNext_(st, now), waited = Math.round((now - (st.s || st.t || now)) / 60000), cf = lcCfg_();
  var told = st.lt && now - st.lt < 5 * 60000;   /* خبر «مهلت تماس اول» همین الان رفته؛ پیام دوم به سرپرست نه */
  if (why === 'مهلت' && boss && lcNorm_(boss.name) !== lcNorm_(from) && !told) {
    tgNotify_(boss.chat, TG_NK.task, '⏱ <b>لید ' + tgEsc_(code) + ' در قول برداشته نشد</b>\n' + tgFa_(waited) + ' دقیقه از شروع قول گذشته و «برداشتم» نخورد. ' +
      (nx ? 'به نفر بعدی رسید: ' + tgEsc_(nx.name) + '.' : 'کس دیگری در ساعت کاری نیست؛ لطفاً خودتان پیگیری کنید.') + '\n\n' + tgLeadLine_(l), { ref: code });
  }
  if (nx) {
    lcCard_(code, st, nx, now, cf.claim, l, false);
    tgLeadEv_({ code: code, row: l.row, actor: 'بات', channel: 'نوبت پذیرش', what: LC_EV.pass, from: from, to: nx.name, note: why, type: l.type || '' });
  } else { st.t = now; st.pr = cf.claim * 2; }
  lcSave_(code, st);
  return nx;
}
function lcClaim_(code, st, name, now, l, chat) {
  if (st.c) return false;
  st.c = now; st.cb = name; if (chat) st.cbc = String(chat);
  var mins = Math.max(0, Math.round((now - (st.s || now)) / 60000)), inP = st.s ? (now - st.s) <= (st.p0 || lcCfg_().claim) * 60000 : true;
  tgLeadEv_({ code: code, row: l ? l.row : '', actor: name, channel: 'نوبت پذیرش', what: LC_EV.claim, from: '', to: mins, note: inP ? LC_IN : LC_OUT, type: (l && l.type) || '' });
  if (l) lcOwnerSet_(l, name, 'برداشتم');
  lcSave_(code, st);
  return true;
}
/* ───── قول تماس اول (D17) ───── */
/** شمار روزانه برای خلاصهٔ شبانه: LC_DAY:<روز شروع قول> = {ok، miss، m: دقیقه‌ها} */
function lcDayAdd_(cs, fn) {
  var k = 'LC_DAY:' + Utilities.formatDate(new Date(cs || lcNow_()), TG_TZ, 'yyyy-MM-dd'), d;
  try { d = JSON.parse(lcProp_(k) || '{}') || {}; } catch (e) { d = {}; }
  d.ok = d.ok || 0; d.miss = d.miss || 0; d.m = d.m || [];
  fn(d); d.m = d.m.slice(-300);
  lcProp_(k, JSON.stringify(d));
}
/** اولین تماس (دکمهٔ «تماس گرفتم» کارت، نتیجهٔ تماس کارت لید، یا ستون تماس شیت). دقیقه از شروع قول (cs) */
function lcOnContact_(code, name) {
  var st = lcSt_(code);
  if (!st || st.f || !(st.a || st.s)) return false;
  var now = lcNow_(), cs = st.cs || st.a || st.s, cf = lcCfg_();
  st.f = now;
  var mins = Math.max(0, Math.round((now - cs) / 60000)), inP = now - cs <= cf.first * 60000;
  tgLeadEv_({ code: code, actor: name || 'شیت', channel: 'نوبت پذیرش', what: LC_EV.first, from: '', to: mins, note: inP ? LC_IN : LC_OUT });
  lcDayAdd_(cs, function (d) { d.m.push(mins); if (inP) d.ok++; else if (!st.lt) d.miss++; });
  lcSave_(code, st);
  return true;
}
function lcNow_() { return lcDry_() && TG_MEM['lc:now'] ? Number(TG_MEM['lc:now']) : Date.now(); }
/** لید خارج: «زمان مناسب» مراجع؛ null برای لید داخل */
function lcAbroad_(l) {
  if (!l || String(l.region || '').indexOf('خارج') < 0) return null;
  var tz = '', best = '';
  try { tz = abLeadTz_(l); best = abLeadBest_(l); } catch (e) {}
  return { tz: tz, best: best };
}
function lcOk_(p, t, ab) { return lcInHours_(p, t) && (!ab || abInWinNow_(ab.tz, ab.best, t)); }
/** نخستین لحظه از t که صاحب لید در ساعت کاری است (و برای لید خارج، داخل «زمان مناسب» مراجع)؛ گام ۱۵ دقیقه، تا ۸ روز */
function lcWorkStart_(p, t, ab) {
  if (!p) return t;
  if (lcOk_(p, t, ab)) return t;
  var q = 900000;
  for (var x = Math.ceil(t / q) * q; x < t + 8 * 86400000; x += q) if (lcOk_(p, x, ab)) return x;
  return ab ? lcWorkStart_(p, t, null) : t;   /* بی اشتراک: فقط ساعت کاری صاحب لید */
}
function lcHm_(ms, tz) {
  var d = new Date(ms), h = Number(Utilities.formatDate(d, tz, 'H')), m = Number(Utilities.formatDate(d, tz, 'm'));
  return m ? tgFa_(('0' + h).slice(-2) + ':' + ('0' + m).slice(-2)) : tgFa_(h);
}
/** پیام بیرون از ساعت کاری: «درخواستتان رسید؛ فردا صبح ساعت ۹ تماس می‌گیریم.» (لید خارج: ساعت به وقت خودش) */
function lcAckText_(now, m, ab) {
  var tz = ab && ab.tz ? ab.tz : TG_TZ;
  var d0 = Utilities.formatDate(new Date(now), tz, 'yyyy-MM-dd'), d1 = Utilities.formatDate(new Date(now + 86400000), tz, 'yyyy-MM-dd'), dm = Utilities.formatDate(new Date(m), tz, 'yyyy-MM-dd');
  var am = Number(Utilities.formatDate(new Date(m), tz, 'H')) < 12;
  var word = dm === d0 ? 'امروز' : (dm === d1 ? (am ? 'فردا صبح' : 'فردا') : TG_DUTY_DAYS[tgDutyDayIdx_(new Date(m))]);
  return 'درخواستتان رسید؛ ' + word + ' ساعت ' + lcHm_(m, tz) + (tz !== TG_TZ ? ' به وقت شما' : '') + ' تماس می‌گیریم.';
}
/** از tgDutyRun_ برای هر لید باز پذیرش؛ true یعنی در صف بماند. x.n: ۰ منتظر شروع ساعت کاری، ۱ کارت منتظر برداشت، ۳ برداشته‌شده */
function lcStep_(x, l, now) {
  if (now instanceof Date) now = now.getTime();
  var code = x.k, st = lcSt_(code) || {}, cf = lcCfg_();
  if (!st.a) st.a = x.a || now;
  /* صف پیش از v170.23.43: کارتش رفته بود؛ دوباره کارت و رد نمی‌گیرد و مثل برداشته‌شده تا تماس اول یا پایان مهلت می‌ماند */
  if (!st.s && !st.c && x.n >= 1 && x.t) { st.s = x.t; st.c = x.t; st.cb = x.to || ''; st.legacy = 1; lcSave_(code, st); }
  var kept = lcStepCore_(x, l, now, code, st, cf);
  /* هشدارهای قول تماس اول، در هر حالت (برداشته یا نه) تا اولین تماس */
  if (kept && st.cs && !st.f && !st.legacy) {
    var e = now - st.cs, changed = false;
    if (!st.r10 && e >= cf.remind * 60000 && e < cf.first * 60000) {
      st.r10 = now; changed = true;
      var hc = st.cbc || st.ch;
      if (hc) tgNotify_(hc, TG_NK.urgent, '⏰ <b>' + tgFa_(cf.remind) + ' دقیقه از قول تماس اول لید ' + tgEsc_(code) + ' گذشته</b>\nتا ' + tgFa_(cf.first) + ' دقیقه تماس بگیرید و نتیجه را از کارت ثبت کنید.', { ref: code });
      tgLeadEv_({ code: code, row: l.row, actor: 'بات', channel: 'نوبت پذیرش', what: LC_EV.remind, from: '', to: cf.remind, note: '', type: l.type || '' });
    }
    if (!st.lt && e >= cf.first * 60000) {
      st.lt = now; st.r10 = st.r10 || now; changed = true;
      var b = lcBoss_();
      if (b) tgNotify_(b.chat, TG_NK.task, '⏱ <b>مهلت ' + tgFa_(cf.first) + ' دقیقه‌ای تماس اول لید ' + tgEsc_(code) + ' گذشت</b>\n' + (st.c ? 'برداشته شده ولی تماس اول ثبت نشده.' : '«برداشتم» هم نخورده.') + '\n\n' + tgLeadLine_(l), { ref: code });
      tgLeadEv_({ code: code, row: l.row, actor: 'بات', channel: 'نوبت پذیرش', what: LC_EV.late, from: '', to: cf.first, note: LC_OUT, type: l.type || '' });
      lcDayAdd_(st.cs, function (d) { d.miss++; });
    }
    if (changed) lcSave_(code, st);
  }
  x.d = st.cs && !st.f && !st.legacy ? (!st.r10 ? st.cs + cf.remind * 60000 : (!st.lt ? st.cs + cf.first * 60000 : 0)) : 0;
  if (!x.d) delete x.d;
  return kept;
}
function lcStepCore_(x, l, now, code, st, cf) {
  if (st.f && !st.c) { st.c = st.f; lcSave_(code, st); }   /* تماس اول یعنی برداشته شده؛ رد به نفر بعدی نه */
  if (st.c) {
    x.n = 3; x.t = st.c;
    if (now - st.c >= TG_DUTY_GIVEUP * 60000) { try { tgDutyLog_(l, { a: st.a, t: st.s, to: st.cb, n: 1 }, 'بی‌پاسخ ماند', null); } catch (eG) {} return false; }
    return true;
  }
  if (!st.s) {
    if (st.at && now < st.at) { x.n = 0; x.at = st.at; return true; }
    var morning = !!st.at, pl = lcPlan_(now), ab = lcAbroad_(l), owner = pl.owner;
    /* شروع قول: از ساخت لید، فقط داخل ساعت کاری صاحب لید (لید خارج: اشتراک با «زمان مناسب» مراجع) */
    if (!st.cs) st.cs = lcWorkStart_(owner, pl.live ? st.a : now, ab);
    if (st.cs > now || !pl.live) {
      if (st.cs <= now && !pl.live) st.cs = lcWorkStart_(owner, now, ab);
      if (st.cs > now) {
        if (!st.ack && l.chatId) { tgSend_(l.chatId, lcAckText_(now, st.cs, ab)); st.ack = 1; }
        st.at = st.cs;
        if (owner) lcOwnerSet_(l, owner.name, 'نوبت صبح');
        if (!st.ns) { lcNextSet_(l, st.cs); st.ns = 1; }
        lcSave_(code, st); x.n = 0; x.at = st.at; return true;
      }
    }
    if (!owner) { lcSave_(code, st); x.n = 0; delete x.at; return true; }   /* نه نوبت‌داری، نه مسئول پذیرش: فقط پایش ساعتی tgSlaTick_ */
    var pr = morning ? cf.morning : cf.claim;
    lcCard_(code, st, owner, now, pr, l, true);
    st.s = now; st.p0 = pr;
    tgLeadEv_({ code: code, row: l.row, actor: 'بات', channel: 'نوبت پذیرش', what: LC_EV.start, from: '', to: owner.name, note: morning ? 'صبح روز کاری بعد · ' + pr + ' دقیقه' : 'ساعت کاری · ' + pr + ' دقیقه', type: l.type || '' });
    lcSave_(code, st); x.sent = 1;
    x.n = 1; x.t = st.t; x.pr = st.pr; delete x.at; return true;
  }
  if (now - st.t >= (st.pr || cf.claim) * 60000) { if (lcPass_(code, st, l, now, 'مهلت')) x.sent = 1; }
  x.n = 1; x.t = st.t; x.pr = st.pr; return true;
}
/** لید بیرون از ساعت: «تماس اول» با تاریخ روز شروع قول، تا اولین کار «کار امروز» صاحبش باشد */
function lcNextSet_(l, at) {
  var d = Utilities.formatDate(new Date(at), TG_TZ, 'yyyy-MM-dd');
  if (lcDry_()) { (TG_MEM['lc:next'] = TG_MEM['lc:next'] || []).push({ code: l.code, date: d }); return; }
  if (l.row >= 2) { try { tgLeadSet_(l.row, { 'اقدام بعدی': 'تماس اول', 'تاریخ اقدام بعدی': d }, 'بات', 'بات', 'نوبت صبح'); } catch (e) { tgErr_('lcNextSet_', e, l.code); } }
}
/** «کار امروز»: لید شب که امروز نوبتش است اول فهرست (tgTodayList_) */
function lcTodayFirst_(code) {
  if (!code) return false;
  var st = lcAll_()[code];
  return !!(st && st.at && !st.f && st.at <= lcNow_() + 86400000);
}
/** آیا قول تماس اول این لید را همین ماژول پایش می‌کند (tgSlaTick_ مرحلهٔ ۱ را تکرار نکند) */
function lcSlaOwn_(code) { var st = code ? lcAll_()[code] : null; return !!(st && st.cs && !st.legacy); }
/** خط خلاصهٔ شبانهٔ یاسر */
function lcNightLine_() {
  var k = 'LC_DAY:' + Utilities.formatDate(new Date(lcNow_()), TG_TZ, 'yyyy-MM-dd'), d;
  try { d = JSON.parse(lcProp_(k) || '{}') || {}; } catch (e) { d = {}; }
  var n = (d.ok || 0) + (d.miss || 0), cf = lcCfg_();
  if (!n && !(d.m || []).length) return '';
  var m = typeof lmMedian_ === 'function' ? lmMedian_(d.m || []) : null;
  return '⏱ قول تماس اول (امروز): پاسخ زیر ' + tgFa_(cf.first) + ' دقیقه ' + tgFa_(d.ok || 0) + ' از ' + tgFa_(n) +
    (n ? ' (' + tgFa_(Math.round(100 * (d.ok || 0) / n)) + '٪)' : '') + ' · میانهٔ زمان پاسخ ' + (m === null ? 'بی داده' : tgFa_(Math.round(m)) + ' دقیقه');
}
try { TG_NIGHT_LINES.push(lcNightLine_); } catch (eNl) {}

/* ───── دکمه‌ها ───── */
function lcLead_(code) {
  if (lcDry_()) return (TG_MEM['lc:leads'] || {})[code] || null;
  var row = tgLeadByCode_(code);
  return row >= 2 ? tgLeadRead_(row) : null;
}
function lcCb_(cq, chat, data) {
  var who = tgWhoDesk_(chat, cq && cq.from && cq.from.username);
  if (!who) return tgSend_(chat, 'این دکمه‌ها برای تیم پذیرش است.');
  var a = String(data).split(':'), act = a[1], code = a[2] || '', now = lcNow_();
  var st = lcSt_(code), l = lcLead_(code);
  if (!st || !l) return tgSend_(chat, 'این لید دیگر در صف نوبت نیست. کارت کامل را با «🔍 لید دیگر» پیدا کنید.');
  var boss = lcBoss_(), isBoss = boss && lcNorm_(boss.name) === lcNorm_(who.name);
  if (act === 'take' || act === 'call') {
    if (st.c && lcNorm_(st.cb) !== lcNorm_(who.name)) return tgSend_(chat, 'این لید را ' + tgEsc_(st.cb) + ' برداشته است.');
    var got = lcClaim_(code, st, who.name, now, l, chat);
    if (act === 'call') { lcOnContact_(code, who.name); return tgOnLead_(cq, 'call:' + code); }
    if (got) { try { tgLeadCardEdit_(cq, l); } catch (eE) {} }
    return tgSend_(chat, got ? '✅ لید ' + tgEsc_(code) + ' مال شماست. نتیجهٔ تماس را از همین کارت ثبت کنید.' : 'این لید را خودتان برداشته‌اید.');
  }
  if (act === 'next') {
    if (st.c) return tgSend_(chat, 'این لید برداشته شده است.');
    if (lcNorm_(st.to) !== lcNorm_(who.name) && !isBoss) return tgSend_(chat, 'فقط کسی که لید دستش است یا مسئول پذیرش آن را رد می‌کند.');
    var nx = lcPass_(code, st, l, now, 'رد');
    return tgSend_(chat, nx ? '⏭ لید ' + tgEsc_(code) + ' به نفر بعدی رسید.' : 'کس دیگری در ساعت کاری نیست؛ لید پیش شما می‌ماند.');
  }
  return null;
}

/* ───── داشبورد لید ───── */
function lcDashRows_(ev, now) {
  now = now || lcNow_();
  var lim = now - 30 * 86400000, start = {}, claim = {}, fc = [];
  (ev || []).forEach(function (e) {
    if (!e.code || !e.t || e.t < lim) return;
    if (e.what === LC_EV.start) start[e.code] = 1;
    else if (e.what === LC_EV.claim && claim[e.code] === undefined) claim[e.code] = e.note === LC_IN;
    else if (e.what === LC_EV.first && String(e.to) !== '') fc.push(Number(e.to));
  });
  var n = Object.keys(start).length, inP = Object.keys(start).filter(function (c) { return claim[c] === true; }).length;
  var m = typeof lmMedian_ === 'function' ? lmMedian_(fc) : null;
  return [[''], ['قول پاسخ لید تازه (۳۰ روز اخیر)', 'عدد', 'شمار لید'],
    ['میانهٔ زمان تا اولین تماس (دقیقه)', m === null ? '-' : Math.round(m), fc.length],
    ['درصد لید برداشته‌شده در قول', n ? Math.round(100 * inP / n) + '%' : '-', n]];
}

/* ───── آزمون خشک ───── */
function lcTests() {
  var pass = 0, fail = 0, text = [];
  function ok(t, c, d) { if (c) { pass++; text.push('✅ ' + t); } else { fail++; text.push('❌ ' + t + (d ? ' · ' + d : '')); } }
  var kD = TG_DRY, kM = TG_MEM, kO = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  try {
    var T = function (d, hm) { return new Date('2026-10-' + d + 'T' + hm + ':00+03:30').getTime(); }, M = 60000;
    /* ۱۰ اکتبر ۲۰۲۶ شنبه است. همه ساختگی */
    TG_MEM['lc:desk'] = [
      { name: 'کشیک الف', role: 'پذیرش', chat: '9101', start: 9, end: 18, days: TG_DESK_DAYS[0] },
      { name: 'کشیک ب', role: 'پذیرش', chat: '9102', start: 9, end: 22, days: TG_DESK_DAYS[0] },
      { name: 'سرپرست نمونه', role: 'مسئول پذیرش', chat: '9100', start: 9, end: 18, days: TG_DESK_DAYS[0] }];
    TG_MEM['duty'] = TG_DUTY_DAYS.map(function () { return ['کشیک الف، کشیک ب', 'کشیک الف', '']; });
    TG_MEM['duty'][6] = ['', '', ''];   /* جمعهٔ خالی یعنی تعطیل */
    var lead = function (code, chatId) { return { row: 5, code: code, name: 'مراجع ساختگی', phone: '', owner: '', chatId: chatId || '', type: 'مراجع' }; };
    var msgs = function (chat) { return TG_OUTBOX.filter(function (o) { return o.kind === 'msg' && o.chat === chat; }); };
    var evs = function (what) { return TG_OUTBOX.filter(function (o) { return o.kind === 'leadev' && o.o.what === what; }); };

    /* صاحب لحظهٔ ساخت */
    TG_MEM['lc:now'] = T('10', '10:00');
    ok('صاحب لید پذیرش در ساعت کاری: اولین نام نوبت', lcOwnerFor_({ source: 'بات' }) === 'کشیک الف');
    TG_MEM['lc:now'] = T('10', '19:00');
    ok('خانهٔ خالی ۱۸ تا ۲۲ = مسئول پذیرش (بیرون از ساعتش، پس صاحب نوبت صبح)', lcOwnerFor_({ source: 'بات' }) === 'کشیک الف');
    TG_MEM['lc:now'] = T('10', '23:30');
    ok('لید شب: صاحب نوبت صبح فردا', lcOwnerFor_({ source: 'بات' }) === 'کشیک الف');
    ok('لید بخش دیگر: مسئول همان بخش', lcOwnerFor_({ source: 'سایت › مدرسه' }) === tgOwnerFor_('مدرسه'));

    /* در ساعت: کارت با سه دکمه و قول ۱۵ دقیقه */
    var l1 = lead('L-7001'), x1 = { k: 'L-7001', n: 0, a: T('10', '10:00') }, t0 = T('10', '10:02');
    ok('در ساعت: در صف می‌ماند', lcStep_(x1, l1, t0) === true && x1.n === 1 && x1.pr === 15);
    var c1 = msgs('9101')[0];
    ok('کارت به صاحب نوبت با سه دکمه', c1 && /قول پاسخ: ۱۵ دقیقه/.test(c1.text) && JSON.stringify(c1.markup).indexOf('lq:take:L-7001') > -1 && JSON.stringify(c1.markup).indexOf('lq:call:L-7001') > -1 && JSON.stringify(c1.markup).indexOf('lq:next:L-7001') > -1);
    ok('رویداد واگذاری ثبت شد', evs(LC_EV.start).length === 1);
    ok('پیش از ۱۵ دقیقه رد نمی‌شود', lcStep_(x1, l1, t0 + 14 * M) && msgs('9102').length === 0);

    /* رد به نفر بعدی و خبر به سرپرست */
    lcStep_(x1, l1, t0 + 15 * M);
    var bossN = msgs('9100').length;
    ok('بعد از ۱۵ دقیقه: کارت به نفر بعدی همان نوبت', msgs('9102').length === 1 && lcSt_('L-7001').to === 'کشیک ب' && (TG_MEM['lc:owner'] || []).some(function (o) { return o.code === 'L-7001' && o.name === 'کشیک ب'; }));
    ok('سرپرست پذیرش یک خبر گرفت (مهلت تماس اول و برداشت با هم)', (TG_MEM['notify'] || []).filter(function (n) { return n.chat === '9100' && /در قول برداشته نشد|مهلت ۱۵ دقیقه‌ای تماس اول/.test(n.text); }).length === 1);
    ok('رویداد «به نفر بعدی»', evs(LC_EV.pass).length === 1);

    /* برداشتم: دقیقه و بیرون از قول */
    TG_MEM['deskwho'] = TG_MEM['lc:desk'][1]; TG_MEM['lc:leads'] = { 'L-7001': l1 }; TG_MEM['lc:now'] = t0 + 18 * M;
    var cq = { from: {}, message: { chat: { id: '9102' }, message_id: 1 } };
    lcCb_(cq, '9102', 'lq:take:L-7001');
    var cl = evs(LC_EV.claim)[0];
    ok('برداشتم: رویداد با دقیقه و «بیرون از قول»', cl && cl.o.to === 18 && cl.o.note === LC_OUT && lcSt_('L-7001').c === t0 + 18 * M);
    ok('بعد از برداشت دیگر رد نمی‌شود', lcStep_(x1, l1, t0 + 60 * M) && x1.n === 3 && msgs('9100').length === bossN);
    TG_MEM['deskwho'] = TG_MEM['lc:desk'][0]; TG_OUTBOX = [];
    lcCb_(cq, '9101', 'lq:take:L-7001');
    ok('نفر دیگر نمی‌تواند لید برداشته را بردارد', TG_OUTBOX.some(function (o) { return /برداشته است/.test(o.text || ''); }));

    /* برداشت در قول و اولین تماس */
    TG_OUTBOX = []; TG_MEM['lc:now'] = T('10', '11:00');
    var l2 = lead('L-7002'), x2 = { k: 'L-7002', n: 0, a: T('10', '10:55') };
    lcStep_(x2, l2, T('10', '11:00'));
    TG_MEM['lc:leads']['L-7002'] = l2; TG_MEM['lc:now'] = T('10', '11:05');
    lcCb_(cq, '9101', 'lq:take:L-7002');
    ok('برداشت در ۵ دقیقه: «در قول»', evs(LC_EV.claim).some(function (e) { return e.o.code === 'L-7002' && e.o.note === LC_IN && e.o.to === 5; }));
    TG_MEM['lc:now'] = T('10', '11:20');
    ok('اولین تماس یک بار ثبت می‌شود (دقیقه از ساخت لید)', lcOnContact_('L-7002', 'کشیک الف') && !lcOnContact_('L-7002', 'کشیک الف') && evs(LC_EV.first).some(function (e) { return e.o.code === 'L-7002' && e.o.to === 25; }));

    /* «به بعدی» با دکمه */
    TG_OUTBOX = [];
    var l3 = lead('L-7003'), x3 = { k: 'L-7003', n: 0, a: T('10', '12:00') };
    lcStep_(x3, l3, T('10', '12:00')); TG_MEM['lc:leads']['L-7003'] = l3; TG_MEM['lc:now'] = T('10', '12:03');
    TG_MEM['deskwho'] = TG_MEM['lc:desk'][1];
    lcCb_(cq, '9102', 'lq:next:L-7003');
    ok('«به بعدی» فقط با کسی که لید دستش است', TG_OUTBOX.some(function (o) { return /فقط کسی که لید دستش است/.test(o.text || ''); }));
    TG_MEM['deskwho'] = TG_MEM['lc:desk'][0];
    lcCb_(cq, '9101', 'lq:next:L-7003');
    ok('«به بعدی»: همان لحظه به نفر بعد، بی انتظار ۱۵ دقیقه', msgs('9102').some(function (o) { return /لید به شما رسید/.test(o.text); }) && lcSt_('L-7003').to === 'کشیک ب');

    /* بیرون از ساعت: پیام به مراجع، صبح ساعت ۹ با قول ۳۰ دقیقه */
    TG_OUTBOX = []; TG_MEM['notify'] = [];
    var l4 = lead('L-7004', '8801'), x4 = { k: 'L-7004', n: 0, a: T('10', '23:10') };
    ok('بیرون از ساعت: در صف تا صبح', lcStep_(x4, l4, T('10', '23:12')) && x4.n === 0 && x4.at === T('11', '09:00'));
    ok('پیام کوتاه به مراجع', msgs('8801').length === 1 && msgs('8801')[0].text === 'درخواستتان رسید؛ فردا صبح ساعت ۹ تماس می‌گیریم.' && !msgs('9101').length);
    lcStep_(x4, l4, T('10', '23:40'));
    ok('پیام مراجع فقط یک بار و شب کارتی نمی‌رود', msgs('8801').length === 1 && !msgs('9101').length && !msgs('9102').length);
    lcStep_(x4, l4, T('11', '09:00'));
    ok('ساعت ۹ صبح: کارت به صاحب همان نوبت با قول ۳۰ دقیقه', msgs('9101').some(function (o) { return /قول پاسخ: ۳۰ دقیقه/.test(o.text); }) && x4.n === 1 && x4.pr === 30);
    lcStep_(x4, l4, T('11', '09:20'));
    ok('قول صبح: ۲۰ دقیقه بعد هنوز رد نمی‌شود', !msgs('9102').length);
    TG_MEM['lc:now'] = T('11', '09:25'); TG_MEM['lc:leads']['L-7004'] = l4; TG_MEM['deskwho'] = TG_MEM['lc:desk'][0];
    lcCb_(cq, '9101', 'lq:take:L-7004');
    ok('برداشت صبح در ۲۵ دقیقه: «در قول»', evs(LC_EV.claim).some(function (e) { return e.o.code === 'L-7004' && e.o.note === LC_IN; }));
    TG_MEM['lc:now'] = T('15', '23:00');
    ok('شب پنج‌شنبه: «شنبه» به‌جای «فردا»', /^درخواستتان رسید؛ شنبه ساعت ۹ تماس می‌گیریم\.$/.test(lcAckText_(T('15', '23:00'), lcNextMorning_(T('15', '23:00')))));

    /* نفر بعدی در ساعت کاری خودش؛ کسی نیست ← سرپرست */
    TG_OUTBOX = []; TG_MEM['notify'] = [];
    var l5 = lead('L-7005'), x5 = { k: 'L-7005', n: 0, a: T('10', '17:30') };
    lcStep_(x5, l5, T('10', '17:30'));
    lcStep_(x5, l5, T('10', '18:10'));
    ok('بعد از ۱۸ کشیک الف و سرپرست بیرون از ساعت‌اند: کشیک ب', msgs('9102').length === 1 && lcSt_('L-7005').to === 'کشیک ب');
    TG_MEM['quiet'] = true; TG_MEM['queue'] = []; TG_MEM['duty'][0][2] = 'کشیک ب';
    var l6 = lead('L-7006'), x6 = { k: 'L-7006', n: 0, a: T('10', '21:30') };
    lcStep_(x6, l6, T('10', '21:30')); lcStep_(x6, l6, T('10', '22:05'));
    ok('سکوت ۲۲ تا ۹: خبر سرپرست در صف می‌ماند', (TG_MEM['queue'] || []).some(function (q) { return q.chat === '9100'; }));
    TG_MEM['quiet'] = false;

    /* «تماس گرفتم»: برداشت و اولین تماس با یک دکمه */
    TG_OUTBOX = [];
    var l7 = lead('L-7007'), x7 = { k: 'L-7007', n: 0, a: T('10', '10:00') };
    lcStep_(x7, l7, T('10', '10:00')); TG_MEM['lc:leads']['L-7007'] = l7; TG_MEM['lc:now'] = T('10', '10:07'); TG_MEM['deskwho'] = TG_MEM['lc:desk'][0];
    try { lcCb_(cq, '9101', 'lq:call:L-7007'); } catch (eCall) {}
    ok('«تماس گرفتم»: برداشت و اولین تماس با هم', evs(LC_EV.claim).some(function (e) { return e.o.code === 'L-7007' && e.o.note === LC_IN; }) && evs(LC_EV.first).some(function (e) { return e.o.code === 'L-7007' && e.o.to === 7; }));
    TG_MEM['deskwho'] = null; TG_OUTBOX = [];
    lcCb_(cq, '5555', 'lq:take:L-7007');
    ok('غریبه نمی‌تواند لید بردارد', TG_OUTBOX.some(function (o) { return /برای تیم پذیرش/.test(o.text || ''); }));
    ok('کد ماژول نام یا شماره را در خطا نمی‌نویسد', !/tgErr_\([^)]*(\.name|\.chat|phone)/.test(String(lcStep_) + String(lcCard_) + String(lcCb_)));

    /* صف قدیمی */
    TG_OUTBOX = [];
    var l8 = lead('L-7008'), x8 = { k: 'L-7008', n: 2, t: T('10', '10:00'), to: 'کشیک الف', a: T('10', '09:55') };
    ok('صف پیش از این نسخه: کارت و رد دوباره نمی‌گیرد', lcStep_(x8, l8, T('10', '10:40')) && x8.n === 3 && !TG_OUTBOX.some(function (o) { return o.kind === 'msg'; }) && !evs(LC_EV.claim).length);

    /* داشبورد */
    var E = function (code, what, to, note, t) { return { t: t || T('10', '12:00'), code: code, what: what, to: to, note: note || '' }; };
    var rows = lcDashRows_([E('L-1', LC_EV.start), E('L-1', LC_EV.claim, 5, LC_IN), E('L-1', LC_EV.first, 10),
      E('L-2', LC_EV.start), E('L-2', LC_EV.claim, 40, LC_OUT), E('L-2', LC_EV.first, 50), E('L-3', LC_EV.start), E('L-3', LC_EV.first, 30),
      E('L-0', LC_EV.start, '', '', T('10', '12:00') - 40 * 86400000)], T('10', '13:00'));
    ok('داشبورد: میانهٔ زمان تا اولین تماس', rows[2][1] === 30 && rows[2][2] === 3, JSON.stringify(rows));
    ok('داشبورد: درصد در قول (۱ از ۳)', rows[3][1] === '33%' && rows[3][2] === 3, JSON.stringify(rows));
    ok('داشبورد لید بلوک قول را دارد', /lcDashRows_/.test(String(lmDashRows_)));
    ok('tgDutyRun_ لیدها را با lcStep_ پیش می‌برد', /lcStep_\(/.test(String(tgDutyRun_)) && /lcOwnerFor_\(/.test(String(tgAppendLead_)));
  } catch (e) { fail++; text.push('❌ خطا: ' + (e && e.stack || e)); }
  finally { TG_DRY = kD; TG_MEM = kM; TG_OUTBOX = kO; }
  return { pass: pass, fail: fail, text: text.join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'lcTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['قول پاسخ لید تازه (v170.23.43)', 'lcTests']); } catch (eLc) {}

/* v170.23.44 (D17): قول تماس اول ۱۵ دقیقه از شروع ساعت کاری صاحب لید */
function lcSlaTests() {
  var pass = 0, fail = 0, text = [];
  function ok(t, c, d) { if (c) { pass++; text.push('✅ ' + t); } else { fail++; text.push('❌ ' + t + (d ? ' · ' + d : '')); } }
  var kD = TG_DRY, kM = TG_MEM, kO = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  try {
    var T = function (d, hm) { return new Date('2026-10-' + d + 'T' + hm + ':00+03:30').getTime(); }, M = 60000;
    var desk = function () { return [
      { name: 'کشیک الف', role: 'پذیرش', chat: '9101', start: 9, end: 18, days: TG_DESK_DAYS[0] },
      { name: 'کشیک ب', role: 'پذیرش', chat: '9102', start: 9, end: 22, days: TG_DESK_DAYS[0] },
      { name: 'سرپرست نمونه', role: 'مسئول پذیرش', chat: '9100', start: 9, end: 18, days: TG_DESK_DAYS[0] }]; };
    var grid = function () { var g = TG_DUTY_DAYS.map(function () { return ['کشیک الف، کشیک ب', 'کشیک الف', '']; }); g[6] = ['', '', '']; return g; };
    var reset = function () { TG_MEM = { 'lc:desk': desk(), duty: grid() }; TG_OUTBOX = []; };
    var lead = function (code, extra) { var l = { row: 5, code: code, name: 'مراجع ساختگی', phone: '', owner: '', chatId: '', type: 'مراجع', region: 'داخل ایران' }; for (var k in (extra || {})) l[k] = extra[k]; return l; };
    var notes = function (chat, rx) { return (TG_MEM['notify'] || []).filter(function (n) { return n.chat === chat && (!rx || rx.test(n.text)); }); };
    var evs = function (what, code) { return TG_OUTBOX.filter(function (o) { return o.kind === 'leadev' && o.o.what === what && (!code || o.o.code === code); }); };
    var day = function (d) { try { return JSON.parse(TG_MEM['lcp:LC_DAY:2026-10-' + d] || '{}'); } catch (e) { return {}; } };

    /* ۱) در ساعت کاری: ۱۵ دقیقه از ساخت لید؛ یادآوری ۱۰ به صاحب، ۱۵ به سرپرست */
    reset();
    var l1 = lead('L-8101'), x1 = { k: 'L-8101', n: 0, a: T('10', '10:00') };
    lcStep_(x1, l1, T('10', '10:02'));
    ok('در ساعت: شروع قول همان لحظهٔ ساخت لید', lcSt_('L-8101').cs === T('10', '10:00') && x1.d === T('10', '10:10'));
    lcStep_(x1, l1, T('10', '10:09'));
    ok('پیش از دقیقهٔ ۱۰ یادآوری نه', !notes('9101', /قول تماس اول/).length);
    lcStep_(x1, l1, T('10', '10:10'));
    ok('دقیقهٔ ۱۰: یادآوری به صاحب لید', notes('9101', /۱۰ دقیقه از قول تماس اول/).length === 1 && evs(LC_EV.remind, 'L-8101').length === 1 && x1.d === T('10', '10:15'));
    lcStep_(x1, l1, T('10', '10:15'));
    ok('دقیقهٔ ۱۵: خبر به سرپرست پذیرش، یک بار', notes('9100', /مهلت ۱۵ دقیقه‌ای تماس اول/).length === 1 && evs(LC_EV.late, 'L-8101').length === 1 && !x1.d);
    lcStep_(x1, l1, T('10', '10:40'));
    ok('یادآوری و خبر تکرار نمی‌شوند', notes('9101', /۱۰ دقیقه از قول/).length === 1 && notes('9100', /مهلت ۱۵/).length === 1);
    ok('شمار امروز: یک مهلت گذشته', day('10').miss === 1 && !day('10').ok);
    var l1b = lead('L-8102'), x1b = { k: 'L-8102', n: 0, a: T('10', '11:00') };
    lcStep_(x1b, l1b, T('10', '11:01')); TG_MEM['lc:now'] = T('10', '11:12');
    lcOnContact_('L-8102', 'کشیک الف');
    ok('تماس اول در ۱۲ دقیقه: «در قول» و شمار ok', evs(LC_EV.first, 'L-8102').some(function (e) { return e.o.to === 12 && e.o.note === LC_IN; }) && day('10').ok === 1);
    lcStep_(x1b, l1b, T('10', '11:20'));
    ok('بعد از تماس اول هیچ هشداری نمی‌رود', !notes('9100', /L-8102/).length);
    TG_MEM['lc:now'] = T('10', '21:00');
    var nl = lcNightLine_();
    ok('خلاصهٔ روزانهٔ یاسر: پاسخ زیر ۱۵ دقیقه و میانه', /پاسخ زیر ۱۵ دقیقه ۱ از ۲/.test(nl) && /میانهٔ زمان پاسخ ۱۲ دقیقه/.test(nl) && TG_NIGHT_LINES.indexOf(lcNightLine_) > -1, nl);

    /* ۲) بیرون از ساعت کاری: پیام با ساعت شروع کار صاحب لید، اولین کار امروز، ۱۵ دقیقه از شروع کار او */
    reset(); TG_MEM['lc:desk'][0].start = 10;
    var l2 = lead('L-8201', { chatId: '8801' }), x2 = { k: 'L-8201', n: 0, a: T('10', '23:10') };
    lcStep_(x2, l2, T('10', '23:12'));
    var ack = TG_OUTBOX.filter(function (o) { return o.kind === 'msg' && o.chat === '8801'; });
    ok('بیرون از ساعت: «درخواستتان رسید» با ساعت شروع کار صاحب لید', ack.length === 1 && ack[0].text === 'درخواستتان رسید؛ فردا صبح ساعت ۱۰ تماس می‌گیریم.', ack.length ? ack[0].text : '');
    ok('شروع قول: ساعت ۱۰ فردا (شروع کار او)', lcSt_('L-8201').cs === T('11', '10:00') && x2.at === T('11', '10:00'));
    ok('«تماس اول» با تاریخ فردا، اولین کار «کار امروز»', (TG_MEM['lc:next'] || []).some(function (o) { return o.code === 'L-8201' && o.date === '2026-10-11'; }));
    TG_MEM['lc:now'] = T('11', '09:00');
    ok('صبح: لید شب در «کار امروز» اول است', lcTodayFirst_('L-8201') === true && lcTodayFirst_('L-0000') === false);
    lcStep_(x2, l2, T('11', '10:00'));
    ok('ساعت ۱۰: کارت به صاحب لید', TG_OUTBOX.some(function (o) { return o.kind === 'msg' && o.chat === '9101' && /بیرون از ساعت کاری/.test(o.text); }));
    lcStep_(x2, l2, T('11', '10:09'));
    ok('یادآوری از ۱۰:۰۰ شمرده می‌شود، نه از ساخت لید', !notes('9101', /قول تماس اول/).length);
    lcStep_(x2, l2, T('11', '10:10'));
    ok('۱۰:۱۰ یادآوری به صاحب لید', notes('9101', /قول تماس اول/).length === 1);

    /* ۳) لید خارج: اشتراک ساعت کاری صاحب لید با «زمان مناسب» مراجع */
    reset();
    var l3 = lead('L-8301', { region: 'خارج از ایران', tz: 'Europe/Berlin', best: 'بعدازظهر', chatId: '8802' }), x3 = { k: 'L-8301', n: 0, a: T('10', '10:00') };
    lcStep_(x3, l3, T('10', '10:01'));
    ok('لید خارج: شروع قول از ۱۴:۳۰ تهران (۱۳ به وقت او)', lcSt_('L-8301').cs === T('10', '14:30') && x3.at === T('10', '14:30'), String(lcSt_('L-8301').cs));
    var ack3 = TG_OUTBOX.filter(function (o) { return o.kind === 'msg' && o.chat === '8802'; });
    ok('لید خارج: پیام با ساعت به وقت خودش', ack3.length === 1 && ack3[0].text === 'درخواستتان رسید؛ امروز ساعت ۱۳ به وقت شما تماس می‌گیریم.', ack3.length ? ack3[0].text : '');
    lcStep_(x3, l3, T('10', '14:30')); lcStep_(x3, l3, T('10', '14:40'));
    ok('لید خارج: کارت ۱۴:۳۰ و یادآوری ۱۴:۴۰', TG_OUTBOX.some(function (o) { return o.kind === 'msg' && o.chat === '9101' && /برداشتم/.test(JSON.stringify(o.markup || '')); }) && notes('9101', /قول تماس اول/).length === 1);
    var l3b = lead('L-8302', { region: 'خارج از ایران', tz: 'Europe/Berlin', best: 'شب' }), x3b = { k: 'L-8302', n: 0, a: T('10', '10:00') };
    lcStep_(x3b, l3b, T('10', '10:01'));
    ok('لید خارج بی اشتراک (شب او بیرون از ساعت صاحب لید): همان ساعت کاری صاحب لید', lcSt_('L-8302').cs === T('10', '10:00'));

    /* ۴) بی‌مسئول: خانهٔ خالی نوبت ← مسئول پذیرش؛ بی هیچ کس ← بی خطا در صف */
    reset(); TG_MEM['duty'][0][0] = '';
    var l4 = lead('L-8401'), x4 = { k: 'L-8401', n: 0, a: T('10', '10:00') };
    lcStep_(x4, l4, T('10', '10:00'));
    ok('بی‌مسئول: کارت و قول با مسئول پذیرش', TG_OUTBOX.some(function (o) { return o.kind === 'msg' && o.chat === '9100'; }) && lcSt_('L-8401').cs === T('10', '10:00'));
    lcStep_(x4, l4, T('10', '10:10')); lcStep_(x4, l4, T('10', '10:15'));
    ok('بی‌مسئول: یادآوری ۱۰ و خبر ۱۵ به مسئول پذیرش', notes('9100', /۱۰ دقیقه از قول/).length === 1 && notes('9100', /مهلت ۱۵/).length === 1);
    reset(); TG_MEM['lc:desk'] = [];
    var l5 = lead('L-8501'), x5 = { k: 'L-8501', n: 0, a: T('10', '10:00') }, kept = false, threw = '';
    try { kept = lcStep_(x5, l5, T('10', '10:00')); lcStep_(x5, l5, T('10', '10:20')); } catch (e5) { threw = String(e5); }
    ok('بی هیچ کس در تیم: بی خطا، در صف برای پایش ساعتی', kept && !threw && !TG_OUTBOX.some(function (o) { return o.kind === 'msg'; }), threw);

    /* عددها از «تنظیمات خصوصی بات» */
    reset(); TG_MEM['lc:cfg'] = { first: 20, remind: 12 };
    var l6 = lead('L-8601'), x6 = { k: 'L-8601', n: 0, a: T('10', '10:00') };
    lcStep_(x6, l6, T('10', '10:00')); lcStep_(x6, l6, T('10', '10:11'));
    ok('LEAD_SLA: یادآوری ۱۲ دقیقه', !notes('9101', /قول تماس اول/).length && x6.d === T('10', '10:12'));
    lcStep_(x6, l6, T('10', '10:12')); lcStep_(x6, l6, T('10', '10:19'));
    ok('LEAD_SLA: مهلت ۲۰ دقیقه', notes('9101', /۱۲ دقیقه از قول/).length === 1 && !notes('9100', /مهلت ۲۰/).length);
    lcStep_(x6, l6, T('10', '10:20'));
    ok('LEAD_SLA: خبر سرپرست سر ۲۰ دقیقه', notes('9100', /مهلت ۲۰ دقیقه‌ای/).length === 1);
    ok('LEAD_SLA در فهرست کلیدهای اختیاری تنظیمات', CFG_OPTIONAL.indexOf('LEAD_SLA') > -1 && !!CFG_NOTE.LEAD_SLA);
    TG_MEM['lc:cfg'] = null;

    /* قاعدهٔ SLA لید: فوری و عادی ۱۵ دقیقه؛ پایش ساعتی تکرار نمی‌کند */
    ok('tgSlaWant_: فوری و عادی ۱۵ دقیقه', tgSlaWant_(15, false) === 1 && tgSlaWant_(15, true) === 1 && tgSlaWant_(14, false) === 0);
    ok('پایش ساعتی لید پایش‌شده را دوباره هشدار نمی‌دهد', lcSlaOwn_('L-8601') === true && lcSlaOwn_('L-0000') === false && /lcSlaOwn_\(/.test(String(tgSlaTick_)));
    ok('موعد هشدار در برنامهٔ تیک (بی خواندن شیت)', bgDutyNext_([{ n: 1, t: T('10', '10:00'), pr: 15, d: T('10', '10:10') }], T('10', '10:01'), 0) === T('10', '10:10'));
  } catch (e) { fail++; text.push('❌ خطا: ' + (e && e.stack || e)); }
  finally { TG_DRY = kD; TG_MEM = kM; TG_OUTBOX = kO; }
  return { pass: pass, fail: fail, text: text.join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'lcSlaTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['قول تماس اول ۱۵ دقیقه (v170.23.44، D17)', 'lcSlaTests']); } catch (eLs) {}
