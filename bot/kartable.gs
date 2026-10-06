/**
 * kartable.gs · v170.23.5 · ۱۴ مهر ۱۴۰۵ · کارتابل «منتظر تأیید من» (تصمیم یاسر)
 *
 * همهٔ چیزهایی که فقط تصمیم یاسر را لازم دارند یک‌جا، هر کدام با دکمهٔ یک‌لمسی، مهلت (KTB_SLA_D روز) و یادآوری ساعت ۹ تهران:
 *   ۱) پروفایل «منتظر بازبینی» (همان صف tgPrQueue_)
 *   ۲) «بازبینی شد» ولی منتشرنشده
 *   ۳) «منتشر نشد»: اول خودکار به صف تلاش دوباره (sitepub.gs) می‌رود؛ کارت فقط برای آنچه بعد از تلاش دوباره باز شکست خورد
 *   ۴) رزومهٔ بی نسخهٔ سبک: نسخهٔ سبک با جمنای ساخته می‌شود (ستون pub_resume_draft) و برای تأیید می‌آید
 *   ۵) ویس معرفی پردازش‌نشده (روی صفحه نرفته): گوش دادن و تأیید انتشار
 * پیش‌نمایش‌های اصلاح داده اینجا نیستند: قاعدهٔ تأیید v170.23.4، آن‌ها را Cowork بررسی و «اوکی» می‌کند.
 * منتظرهای دیگران (تیکت بی پاسخ واقعی، باگ «تازه»، کار بی‌صاحب) به صف صاحبشان می‌روند (ktbRoute_؛ پیش‌نمایش با «اوکی» Cowork).
 * حالت خشک: همان TG_MEM['pqrows'] پروفایل‌ها؛ TG_MEM['ktb:gem'] پاسخ ساختگی جمنای؛ TG_MEM['ktb:tk']، ['ktb:bug']، ['ktb:ops'].
 */
var KTB_BTN = '🗂 منتظر تأیید من';
cfg_('TG_CONTRACT_VER', '');   /* v170.23.6: نسخهٔ قرارداد همکاری برای ستون «پشتوانهٔ انتشار» */
var KTB_SLA_D = 3;
var KTB_REMIND_H = 9;
var KTB_KIND = { review: 'پروفایل منتظر بازبینی', reviewed: 'بازبینی‌شده ولی منتشرنشده', failed: 'منتشر نشد، بعد از تلاش دوباره', resume: 'رزومهٔ سبک برای تأیید', voice: 'ویس معرفی برای انتشار' };
var KTB_ORDER = ['review', 'failed', 'reviewed', 'resume', 'voice'];

function ktbDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function ktbNow_() { return ktbDry_() && TG_MEM['ktb:now'] ? Number(TG_MEM['ktb:now']) : Date.now(); }
function ktbProp_(k, v) {
  if (ktbDry_()) { if (v !== undefined) TG_MEM['ktbp:' + k] = v; return TG_MEM['ktbp:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function ktbPub_(v) { return /[TES]/.test(String(v.roles || '')) && !/نمی‌رود/.test(String(v.status || '')); }   /* v170.23.6: اطلاعات سبک با پشتوانهٔ قرارداد؛ فقط تصمیم تیم */
function ktbSince_(v) { var t = Number(v.stamp || 0); if (t) return t; var d = new Date(String(v.updated || v.started || '')); return isNaN(d.getTime()) ? 0 : d.getTime(); }
function ktbVoiceId_(v) { var m = /^tg:voice:([^\s·]+)/.exec(String(v.voice || '')); return m ? m[1] : ''; }
function ktbSplHist_(id) { try { return splRows_().filter(function (e) { return e.id === id; }); } catch (e) { return []; } }

/** همهٔ منتظرها: {review, reviewed, failed, resume, voice: [{row, v, since}], retry: [id], resumeWait: [row]} */
function ktbItems_() {
  var out = { review: [], reviewed: [], failed: [], resume: [], voice: [], retry: [], resumeWait: [] };
  tgPrAll_().forEach(function (r) {
    var v = r.v; if (!ktbPub_(v)) return;
    var it = { row: r.row, v: v, since: ktbSince_(v) };
    if (tgPrNeeds_(v)) { out.review.push(it); return; }   /* بازبینی همه را با هم می‌بیند */
    var st = String(v.status || '').trim(), onsite = String(v.onsite || '').trim();
    if (st === 'منتشر نشد') {
      var h = ktbSplHist_(String(v.id)), act = typeof splActive_ === 'function' ? splActive_(String(v.id)) : null;
      var retried = h.some(function (e) { return (e.kind === 'تلاش دوباره' && e.res !== 'موفق') || e.q === 'سپرده به کارها'; });
      if (retried && !act) out.failed.push(it);
      else if (!act) out.retry.push(r);   /* اول خودکار دوباره */
      return;
    }
    if (st === 'بازبینی شد' && !onsite) { out.reviewed.push(it); return; }
    if (String(v.resume || '').indexOf('tg:doc:') === 0 && !String(v.pub_resume || '').trim()) {
      if (String(v.pub_resume_draft || '').trim()) out.resume.push(it); else out.resumeWait.push(r);
    }
    var vid = ktbVoiceId_(v);
    if (vid && vid !== String(v.page_voice || '') && String(v.page || '').trim()) out.voice.push(it);
  });
  return out;
}
function ktbCount_(I) { return KTB_ORDER.reduce(function (s, k) { return s + I[k].length; }, 0); }
function ktbAge_(t) { if (!t) return ''; var d = Math.floor((ktbNow_() - t) / 86400000); return d >= KTB_SLA_D ? ' · ⏰ ' + tgFa_(d) + ' روز' : d >= 1 ? ' · ' + tgFa_(d) + ' روز' : ''; }

/* ───── نما ───── */
function ktbShow_(chat) {
  if (!tgPrOk_(chat)) return tgSend_(chat, 'این بخش فقط برای ناظر است.');
  var I = ktbItems_(), n = ktbCount_(I);
  if (I.retry.length) ktbRetry_(I.retry);
  var L = ['🗂 <b>منتظر تأیید تو</b>' + (n ? ' · ' + tgFa_(n) + ' مورد' : '')], kb = [];
  if (!n) L.push('', '✅ چیزی منتظر تو نیست.');
  KTB_ORDER.forEach(function (k) {
    if (!I[k].length) return;
    var late = I[k].filter(function (x) { return x.since && ktbNow_() - x.since >= KTB_SLA_D * 86400000; }).length;
    L.push('• ' + KTB_KIND[k] + ': ' + tgFa_(I[k].length) + (late ? ' (⏰ ' + tgFa_(late) + ' از مهلت گذشته)' : ''));
    kb.push([{ text: KTB_KIND[k] + ' · ' + tgFa_(I[k].length), callback_data: 'ktb:l:' + k }]);
  });
  if (I.retry.length) L.push('', '🔁 ' + tgFa_(I.retry.length) + ' پروفایل «منتشر نشد» همین حالا خودکار دوباره فرستاده می‌شود؛ اگر باز نشد اینجا می‌آید.');
  if (I.resumeWait.length) L.push('📝 نسخهٔ سبک ' + tgFa_(I.resumeWait.length) + ' رزومه در حال ساخت است.');
  L.push('', 'مهلت هر مورد ' + tgFa_(KTB_SLA_D) + ' روز است؛ هر صبح ساعت ' + tgFa_(KTB_REMIND_H) + ' یادآوری می‌آید.');
  return tgSend_(chat, L.join('\n'), kb.length ? { inline_keyboard: kb } : null);
}
function ktbList_(chat, k) {
  var I = ktbItems_(), L = I[k] || [];
  if (!L.length) return tgSend_(chat, '✅ در «' + (KTB_KIND[k] || k) + '» چیزی نمانده.');
  var kb = L.slice(0, 20).map(function (x) {
    return [{ text: tgPrCut_(x.v.site_name || x.v.name, 24) + ktbAge_(x.since).replace(' · ', ' '), callback_data: 'ktb:o:' + k + ':' + x.row + ':' + tgPrH_(x.v.id) }];
  });
  return tgSend_(chat, '<b>' + tgEsc_(KTB_KIND[k]) + '</b> · ' + tgFa_(L.length) + ' مورد', { inline_keyboard: kb });
}
/* یک مورد: پروفایل‌ها همان کارت بازبینی؛ رزومه و ویس کارت خودشان */
function ktbOpen_(chat, k, row, h) {
  var r = tgPrRow_(row);
  if (!r || tgPrH_(r.v.id) !== h) return tgSend_(chat, 'این مورد کهنه شده. «' + KTB_BTN + '» را دوباره بزن.');
  var v = r.v, s = ':' + row + ':' + h;
  if (k === 'resume') {
    var d = String(v.pub_resume_draft || '').trim();
    return tgSend_(chat, '📝 <b>نسخهٔ سبک رزومه</b> · ' + tgEsc_(v.site_name || v.name) + '\nساخته‌شده با جمنای از فایل رزومهٔ خودش. روی صفحهٔ شخصی، زیر «رزومهٔ کامل» می‌نشیند.\n\n' + tgEsc_(d.slice(0, 3200)),
      { inline_keyboard: [[{ text: v.consent && String(v.consent).indexOf('بله') === 0 ? '✅ تأیید و انتشار' : '✅ تأیید (روی صفحه با اجازهٔ جدا)', callback_data: 'ktb:ra' + s }], [{ text: '✏️ اصلاح', callback_data: 'ktb:re' + s }, { text: '⏭ بعدی', callback_data: 'ktb:l:resume' }]] });
  }
  if (k === 'voice') {
    var vid = ktbVoiceId_(v);
    if (vid && !ktbDry_()) { try { tgApi_('sendVoice', { chat_id: chat, voice: vid, caption: 'ویس معرفی ' + String(v.site_name || v.name).slice(0, 60) }); } catch (e) {} }
    return tgSend_(chat, '🎙 <b>ویس معرفی</b> · ' + tgEsc_(v.site_name || v.name) + '\nبعد از تأیید روی صفحهٔ شخصی‌اش می‌نشیند.',
      { inline_keyboard: [[{ text: '✅ تأیید و انتشار', callback_data: 'ktb:va' + s }], [{ text: '✏️ اصلاح', callback_data: 'ktb:ve' + s }, { text: '⏭ بعدی', callback_data: 'ktb:l:voice' }]] });
  }
  return tgPrShow_(chat, row);
}
function ktbCb_(chat, data) {
  if (!tgPrOk_(chat)) return tgSend_(chat, 'این بخش فقط برای ناظر است.');
  var a = String(data).split(':'), act = a[1];
  if (act === 'h') return ktbShow_(chat);
  if (act === 'l') return ktbList_(chat, a[2]);
  if (act === 'o') return ktbOpen_(chat, a[2], Number(a[3]), a[4]);
  var r = tgPrRow_(Number(a[2]));
  if (!r || tgPrH_(r.v.id) !== a[3]) return tgSend_(chat, 'این مورد کهنه شده. «' + KTB_BTN + '» را دوباره بزن.');
  if (act === 'ra') {   /* رزومهٔ سبک تأیید شد ← ستون pub_resume و انتشار صفحه */
    tgPqPut_(r.v.id, { pub_resume: String(r.v.pub_resume_draft || ''), pub_resume_draft: '' });
    r = tgPrRow_(r.row);
    var o1 = tgPrPublish_(chat, r, { quiet: 1, src: 'redo' });
    return tgSend_(chat, (o1 && o1.ok !== false ? '✅ رزومهٔ سبک روی صفحه رفت.' : '⚠️ رزومه ثبت شد ولی انتشار کامل نشد؛ به صف تلاش دوباره رفت.'), { inline_keyboard: [[{ text: '🗂 بقیهٔ منتظرها', callback_data: 'ktb:h' }]] });
  }
  if (act === 're') return tgSend_(chat, '✏️ <b>اصلاح رزومهٔ سبک</b>', { inline_keyboard: [[{ text: '🔁 دوباره بساز', callback_data: 'ktb:rr:' + a[2] + ':' + a[3] }], [{ text: '✍️ متن را خودم می‌فرستم', callback_data: 'ktb:rw:' + a[2] + ':' + a[3] }], [{ text: '↩️ بازگشت', callback_data: 'ktb:o:resume:' + a[2] + ':' + a[3] }]] });
  if (act === 'rw') { tgSetVal_('ktbw', chat, JSON.stringify({ row: r.row, h: a[3] })); return tgSend_(chat, '✍️ متن رزومهٔ سبک را بفرست؛ هر بخش با «## عنوان» و هر ردیف با «- مورد · سال». برای انصراف: /cancel'); }
  if (act === 've') return tgSend_(chat, '✏️ <b>اصلاح ویس</b>', { inline_keyboard: [[{ text: '💬 پیام به خودش (ویس تازه بخواه)', callback_data: 'pr:msg:' + a[2] + ':' + a[3] }], [{ text: '🚫 این ویس روی صفحه نرود', callback_data: 'ktb:vx:' + a[2] + ':' + a[3] }], [{ text: '↩️ بازگشت', callback_data: 'ktb:o:voice:' + a[2] + ':' + a[3] }]] });
  if (act === 'vx') { var vx = ktbVoiceId_(r.v); tgPqPut_(r.v.id, { page_voice: vx }); return tgSend_(chat, '🚫 این ویس روی صفحه نمی‌رود (تا ویس تازه بیاید).', { inline_keyboard: [[{ text: '🗂 بقیهٔ منتظرها', callback_data: 'ktb:h' }]] }); }
  if (act === 'rr') { tgPqPut_(r.v.id, { pub_resume_draft: '' }); var g = ktbResumeMake_(tgPrRow_(r.row)); return tgSend_(chat, g ? '📝 نسخهٔ تازه ساخته شد.' : '⚠️ ساخته نشد؛ ساعت بعد دوباره.', { inline_keyboard: [[{ text: '📝 دیدن', callback_data: 'ktb:o:resume:' + r.row + ':' + a[3] }]] }); }
  if (act === 'va') {
    var o2 = tgPrPublish_(chat, r, { quiet: 1, src: 'redo' });
    return tgSend_(chat, (o2 && o2.ok !== false ? '✅ ویس روی صفحه رفت.' : '⚠️ انتشار کامل نشد؛ به صف تلاش دوباره رفت.'), { inline_keyboard: [[{ text: '🗂 بقیهٔ منتظرها', callback_data: 'ktb:h' }]] });
  }
  return null;
}
/* دکمهٔ منو و دستور /ok */
function ktbMaybe_(chat, m) {
  var t = String((m && m.text) || '').trim();
  var w = tgGetVal_('ktbw', chat);
  if (w && tgPrOk_(chat)) {   /* متن رزومهٔ سبک از خود یاسر */
    tgDel_('ktbw', chat);
    if (t === '/cancel' || t === 'انصراف') { tgSend_(chat, 'باشد، چیزی عوض نشد.'); return true; }
    var st = {}; try { st = JSON.parse(w); } catch (e) {}
    var r = tgPrRow_(st.row);
    if (!r || tgPrH_(r.v.id) !== st.h) { tgSend_(chat, 'این مورد کهنه شده.'); return true; }
    if (!/^##\s/m.test(t) || tgOkBad_(t)) { tgSetVal_('ktbw', chat, w); tgSend_(chat, 'متن باید بخش «## …» داشته باشد و لینک و شماره نداشته باشد. دوباره بفرست یا /cancel.'); return true; }
    tgPqPut_(r.v.id, { pub_resume_draft: t.replace(/\s*[—–]\s*/g, '، ').slice(0, 3500) });
    ktbOpen_(chat, 'resume', r.row, st.h); return true;
  }
  if (t !== KTB_BTN && t !== '/ok') return false;
  if (!tgPrOk_(chat)) return false;
  ktbShow_(chat); return true;
}

/* «منتشر نشد» ← صف تلاش دوباره همین حالا (یک بار برای هر شناسه) */
function ktbRetry_(rows) {
  var n = 0;
  (rows || []).forEach(function (r) {
    if (typeof splWrite_ !== 'function' || splActive_(String(r.v.id))) return;
    splWrite_({ id: String(r.v.id), name: r.v.name, kind: 'کارتابل', res: 'شکست', pages: String(r.v.onsite || ''), why: 'وضعیت «منتشر نشد»؛ دوباره از کارتابل', tries: 0, next: ktbNow_(), q: SPL_Q.wait });
    n++;
  });
  return n;
}

/* ───── رزومهٔ سبک با جمنای ───── */
var KTB_CV_SCHEMA = { type: 'OBJECT', properties: { sections: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
  title: { type: 'STRING' }, items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { t: { type: 'STRING' }, year: { type: 'STRING' } }, required: ['t'] } } }, required: ['title', 'items'] } } }, required: ['sections'] };
var KTB_CV_PROMPT = 'این فایل رزومهٔ یک روان‌درمانگر است. یک نسخهٔ سبک فارسی برای صفحهٔ معرفی عمومی او بساز: فقط تحصیلات، آموزش‌ها و دوره‌های تخصصی، ' +
  'سابقهٔ کار بالینی، تدریس و سوپرویژن، و انتشارات. هر بخش حداکثر ۶ ردیف، هر ردیف کوتاه (زیر ۹۰ نویسه) و سال جدا (اگر هست، به شمسی یا همان که نوشته). ' +
  'هیچ شماره تلفن، ایمیل، نشانی، کد ملی، کد نظام، تاریخ تولد یا نام مراجع و همکار نیاور. چیزی از خودت نساز؛ فقط آنچه در فایل هست. خط تیرهٔ بلند ننویس.';
function ktbCvFormat_(o) {
  return (o && o.sections || []).filter(function (s) { return s && s.title && (s.items || []).length; }).slice(0, 6).map(function (s) {
    return '## ' + String(s.title).replace(/\s*[—–]\s*/g, '، ').trim() + '\n' + s.items.slice(0, 6).map(function (i) {
      return '- ' + String(i.t).replace(/\s*[—–]\s*/g, '، ').replace(/\s+/g, ' ').trim().slice(0, 90) + (i.year ? ' · ' + String(i.year).trim().slice(0, 20) : '');
    }).join('\n');
  }).join('\n\n');
}
/* جمنای با فایل (PDF و تصویر)؛ همان مدل‌های جایگزین seo_gemini.gs */
function ktbGemFile_(blob, prompt, schema) {
  if (ktbDry_()) { var f = TG_MEM['ktb:gem']; if (!f) throw new Error('dry'); return f; }
  var mime = blob.getContentType() || 'application/pdf';
  if (!/pdf|image\//.test(mime)) throw new Error('نوع فایل ' + mime + ' را جمنای مستقیم نمی‌خواند (فقط PDF و تصویر)');
  var parts = [{ inline_data: { mime_type: mime, data: Utilities.base64Encode(blob.getBytes()) } }, { text: prompt }], last = '';
  for (var k = 0; k < SEO_MODELS.length; k++) {
    var res = gemFetch_('models/' + SEO_MODELS[k] + ':generateContent', { contents: [{ role: 'user', parts: parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 } });
    if (res.code === 200) { try { return JSON.parse((((res.body.candidates || [])[0] || {}).content || {}).parts.map(function (p) { return p.text || ''; }).join('')); } catch (e) { last = 'JSON'; continue; } }
    last = String(res.code); if (res.code === 400 || res.code === 403) break;
  }
  throw new Error('جمنای ناموفق: ' + last);
}
function ktbResumeMake_(r) {
  if (!r) return false;
  if (!ktbDry_() && typeof aiPaid_ === 'function' && !aiPaid_()) return false;   /* v170.29: رزومه دادهٔ شخصی است؛ فقط با کلید پولی */
  var m = /^tg:doc:([^\s·]+)/.exec(String(r.v.resume || '')); if (!m) return false;
  try {
    var blob = ktbDry_() ? null : tgTgFile_(m[1]);
    var o = ktbGemFile_(blob, KTB_CV_PROMPT, KTB_CV_SCHEMA), txt = ktbCvFormat_(o);
    if (!txt) return false;
    tgPqPut_(r.v.id, { pub_resume_draft: txt });
    return true;
  } catch (e) { tgErr_('ktbResumeMake_', e); return false; }
}

/* ───── ساعتی از tgWatchdog: تلاش دوباره، رزومه‌های سبک (دو تا در ساعت)، یادآوری ساعت ۹ ───── */
function ktbHourly_() {
  try { ktbFixMaybe_(); } catch (eF) { tgErr_('ktbFixMaybe_', eF); }
  var I = ktbItems_();
  if (I.retry.length) ktbRetry_(I.retry);
  I.resumeWait.slice(0, 2).forEach(function (r) { ktbResumeMake_(r); });
  return ktbRemind_(I);
}
function ktbRemind_(I) {
  var d = new Date(ktbNow_()), h = Number(Utilities.formatDate(d, TG_TZ, 'H')), day = Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd');
  if (h < KTB_REMIND_H || ktbProp_('KTB_DAY') === day) return '';
  ktbProp_('KTB_DAY', day);
  I = I || ktbItems_();
  var n = ktbCount_(I); if (!n) return '';
  var L = ['🗂 <b>منتظر تأیید تو</b> · ' + tgFa_(n) + ' مورد'];
  KTB_ORDER.forEach(function (k) {
    if (!I[k].length) return;
    var late = I[k].filter(function (x) { return x.since && ktbNow_() - x.since >= KTB_SLA_D * 86400000; }).length;
    L.push('• ' + KTB_KIND[k] + ': ' + tgFa_(I[k].length) + (late ? ' (⏰ ' + tgFa_(late) + ' از مهلت گذشته)' : ''));
  });
  var text = L.join('\n'), kb = { inline_keyboard: [[{ text: '🗂 باز کن', callback_data: 'ktb:h' }]] };
  if (ktbDry_()) { (TG_MEM['ktb:remind'] = TG_MEM['ktb:remind'] || []).push(text); return text; }
  TG_OUT_KIND = 'سیستم'; TG_OUT_REF = 'کارتابل';
  tgSend_(TG_OWNER_CHAT, text, kb);
  return text;
}

/* ───── منتظرهای دیگران ← صف صاحبشان (پیش‌نمایش؛ اعمال با «اوکی» Cowork در B1) ───── */
var KTB_RT_TAB = 'مسیریابی منتظرها · پیش‌نمایش';
var KTB_RT_HEAD = ['نوع', 'مرجع', 'عنوان کار', 'صاحب', 'دلیل', 'حالت'];
cfg_('TG_ROUTE', {});   /* {"باگ": "<کلید TG_NAMES>", "پیش‌فرض": "<کلید TG_NAMES>"}؛ پیش‌فرض: مدیر عملیات */
function ktbRouteOwner_(kind) {
  var r = cfg_('TG_ROUTE', {}) || {}, key = r[kind] || r['پیش‌فرض'] || 'ops';
  return tgNm_(key) || tgNm_('ops') || tgNm_('chief') || '';
}
/* تیکت «پاسخ داده شد» یا باز بی پاسخ واقعی؛ باگ «تازه»؛ کار باز بی‌صاحب */
function ktbRouteRows_() {
  var out = [], real = function (s) { s = String(s || '').trim(); return s.length >= 8 && !/^(پاسخ داده شد|انجام شد|ok|اوکی|-)$/i.test(s); };
  var tk = ktbDry_() ? (TG_MEM['ktb:tk'] || []) : (function () { var sh = tgSS_().getSheetByName(TG_TK_TAB), n = sh ? sh.getLastRow() : 0; return n < 2 ? [] : sh.getRange(2, 1, n - 1, 10).getValues().map(function (v) { return { id: String(v[0]), owner: String(v[7]), st: String(v[8]), reply: String(v[9]) }; }); })();
  tk.forEach(function (t) {
    if (!t.id || /بسته|لغو/.test(t.st) || real(t.reply)) return;
    out.push({ kind: 'تیکت', ref: t.id, title: 'پاسخ واقعی به پیام ' + t.id + (t.st === 'پاسخ داده شد' ? ' (علامت «پاسخ داده شد» بی متن پاسخ)' : ''), owner: t.owner || ktbRouteOwner_('تیکت'), why: t.st === 'پاسخ داده شد' ? 'بسته شده بی پاسخ واقعی' : 'بی پاسخ' });
  });
  var bg = ktbDry_() ? (TG_MEM['ktb:bug'] || []) : (function () { var sh = tgSS_().getSheetByName(TG_BUG_TAB), n = sh ? sh.getLastRow() : 0; return n < 2 ? [] : sh.getRange(2, 1, n - 1, 7).getValues().map(function (v) { return { id: String(v[0]), kind: String(v[2]), st: String(v[6]) }; }); })();
  bg.forEach(function (b) { if (b.id && (String(b.st).trim() || 'تازه') === 'تازه') out.push({ kind: 'باگ', ref: b.id, title: 'بررسی ' + (b.kind || 'باگ') + ' ' + b.id, owner: ktbRouteOwner_('باگ'), why: 'باگ «تازه» بی بررسی' }); });
  var ops = ktbDry_() ? (TG_MEM['ktb:ops'] || []) : (function () { try { return opsRows_(); } catch (e) { return []; } })();
  ops.forEach(function (t) { if (opsOpen_(t) && !String(t.owner || '').trim()) out.push({ kind: 'کار بی‌صاحب', ref: t.code, title: t.title, owner: ktbRouteOwner_(t.cat || 'کار'), why: 'کار باز بی صاحب' }); });
  return out;
}
function ktbRoutePreview_() {
  var rows = ktbRouteRows_();
  var cnt = function (k) { return rows.filter(function (r) { return r.kind === k; }).length; };
  var sum = 'تیکت بی پاسخ واقعی: ' + cnt('تیکت') + ' · باگ تازه: ' + cnt('باگ') + ' · کار بی‌صاحب: ' + cnt('کار بی‌صاحب') + ' · بی صاحب پیدا: ' + rows.filter(function (r) { return !r.owner; }).length;
  if (ktbDry_()) { TG_MEM['ktb:rt'] = rows; return sum; }
  var ss = tgSS_(), sh = ss.getSheetByName(KTB_RT_TAB) || ss.insertSheet(KTB_RT_TAB);
  if (/^اعمال شد/.test(String(sh.getRange(1, 2).getValue() || ''))) return sum + ' · پیش از این اعمال شده';
  sh.clear(); sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, 3).setValues([['بررسی Cowork: بعد از بررسی، Cowork در B1 «اوکی» می‌نویسد', '', 'v170.23.5 · ' + sum]]).setFontWeight('bold');
  sh.getRange(2, 1, 1, KTB_RT_HEAD.length).setValues([KTB_RT_HEAD]).setFontWeight('bold').setBackground('#f5f5f8');
  if (rows.length) sh.getRange(3, 1, rows.length, KTB_RT_HEAD.length).setNumberFormat('@').setValues(rows.map(function (r) { return [r.kind, r.ref, r.title, r.owner, r.why, r.owner ? 'با اوکی کار ساخته یا صاحب داده می‌شود' : 'صاحب پیدا نشد؛ دست نمی‌خورد']; }));
  sh.setFrozenRows(2);
  return sum;
}
function ktbRouteMaybe_() {
  if (ktbProp_('KTB_RT_DONE') === '1') return 0;
  var ok = ktbDry_() ? TG_MEM['ktb:rtok'] : (function () { var sh = tgSS_().getSheetByName(KTB_RT_TAB); return sh ? String(sh.getRange(1, 2).getValue() || '').trim() : ''; })();
  if (ok !== 'اوکی') return 0;
  ktbProp_('KTB_RT_DONE', '1');
  var n = 0;
  ktbRouteRows_().forEach(function (r) {
    if (!r.owner) return;
    if (r.kind === 'کار بی‌صاحب') { if (ktbDry_()) (TG_MEM['ktb:own'] = TG_MEM['ktb:own'] || []).push(r); else ktbOwnerSet_(r.ref, r.owner); }
    var t = { title: r.title, cat: r.kind === 'باگ' ? 'فنی' : 'پذیرش', owner: r.owner, by: 'بات', due: new Date(ktbNow_() + 2 * 86400000), src: 'بات', ref: 'KTB:' + r.kind + ':' + r.ref, note: r.why };
    if (r.kind === 'کار بی‌صاحب') return;
    if (ktbDry_()) (TG_MEM['ktb:tasks'] = TG_MEM['ktb:tasks'] || []).push(t); else opsAdd_(t);
    n++;
  });
  if (!ktbDry_()) { try { tgSS_().getSheetByName(KTB_RT_TAB).getRange(1, 2).setValue('اعمال شد ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + n + ' کار'); } catch (e) {} }
  return n;
}

/* کار بی‌صاحب ← صاحب (همان مسیر opsAdd_ برای chat و آینه) */
function ktbOwnerSet_(code, owner) {
  try {
    var t = opsRows_().filter(function (x) { return x.code === code; })[0]; if (!t || String(t.owner || '').trim()) return false;
    var before = t.ownerChat, pp = opsPeople_().filter(function (p) { return p.name === owner; })[0];
    t.owner = owner; t.ownerChat = opsFirstChat_(pp) || ''; t.moved = opsStamp_();
    opsWrite_(t); opsMirror_(t, before); return true;
  } catch (e) { tgErr_('ktbOwnerSet_', e); return false; }
}
/* ───── v170.23.6: جواب‌های جابه‌جا (لینک یا شماره در «عنوان» و پرسش‌های متنی) و ستون «پشتوانهٔ انتشار» ─────
   پیش‌نمایش در تب «اصلاح پروفایل‌ها · پیش‌نمایش»؛ اعمال فقط با «اوکی» Cowork در B1: لینک به «لینک‌ها» می‌رود، خانه خالی و از «ردشده»
   برداشته می‌شود تا بات دوباره بپرسد؛ ستون «پشتوانهٔ انتشار» برای همکاران بی مقدار پر می‌شود. */
var KTB_FX_TAB = 'اصلاح پروفایل‌ها · پیش‌نمایش';
var KTB_FX_KEYS = ['title', 'latin', 'degree', 'headline', 'method', 'first', 'trainings', 'teach', 'pub_title', 'pub_headline'];
function ktbFixRows_() {
  var out = [];
  tgPrAll_().forEach(function (r) {
    var v = r.v;
    KTB_FX_KEYS.forEach(function (k) { var val = String(v[k] || ''); var b = tgOkBad_(val); if (b && (k !== 'latin' || TG_OK_URL_RX.test(val))) out.push({ id: v.id, row: r.row, kind: 'جواب جابه‌جا', key: k, val: val.slice(0, 120), why: b }); });
    if (/[TES]/.test(String(v.roles || '')) && !String(v.basis || '').trim()) out.push({ id: v.id, row: r.row, kind: 'پشتوانهٔ انتشار', key: 'basis', val: tgPrBasis_(), why: 'خالی' });
  });
  return out;
}
function ktbFixPreview_() {
  var rows = ktbFixRows_(), cnt = function (k) { return rows.filter(function (x) { return x.kind === k; }).length; };
  var sum = 'جواب جابه‌جا: ' + cnt('جواب جابه‌جا') + ' (در «عنوان»: ' + rows.filter(function (x) { return x.key === 'title' || x.key === 'pub_title'; }).length + ') · پشتوانهٔ انتشار خالی: ' + cnt('پشتوانهٔ انتشار');
  if (ktbDry_()) { TG_MEM['ktb:fx'] = rows; return sum; }
  var ss = tgSS_(), sh = ss.getSheetByName(KTB_FX_TAB) || ss.insertSheet(KTB_FX_TAB);
  if (/^اعمال شد/.test(String(sh.getRange(1, 2).getValue() || ''))) return sum + ' · پیش از این اعمال شده';
  sh.clear(); sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, 3).setValues([['بررسی Cowork: بعد از بررسی، Cowork در B1 «اوکی» می‌نویسد', '', 'v170.23.6 · ' + sum]]).setFontWeight('bold');
  sh.getRange(2, 1, 1, 5).setValues([['شناسه', 'نوع', 'ستون', 'مقدار', 'دلیل']]).setFontWeight('bold').setBackground('#f5f5f8');
  if (rows.length) sh.getRange(3, 1, rows.length, 5).setNumberFormat('@').setValues(rows.map(function (x) { return [x.id, x.kind, x.key, x.val, x.why]; }));
  sh.setFrozenRows(2);
  return sum;
}
function ktbFixMaybe_() {
  if (ktbProp_('KTB_FX_DONE') === '1') return 0;
  var ok = ktbDry_() ? TG_MEM['ktb:fxok'] : (function () { var sh = tgSS_().getSheetByName(KTB_FX_TAB); return sh ? String(sh.getRange(1, 2).getValue() || '').trim() : ''; })();
  if (ok !== 'اوکی') return 0;
  ktbProp_('KTB_FX_DONE', '1');
  var n = 0, all = {}; tgPrAll_().forEach(function (r) { all[r.v.id] = r.v; });
  ktbFixRows_().forEach(function (x) {
    var v = all[x.id]; if (!v) return;
    var put = {};
    if (x.key === 'basis') put.basis = x.val;
    else {
      put[x.key] = '';
      if (TG_OK_URL_RX.test(x.val)) put.links = (String(v.links || '') + '\n' + x.val).trim();
      put.skipped = String(v.skipped || '').split(',').filter(function (k) { return k && k !== x.key; }).join(',');
    }
    tgPqPut_(x.id, put); Object.assign(v, put); n++;
  });
  if (!ktbDry_()) { try { tgSS_().getSheetByName(KTB_FX_TAB).getRange(1, 2).setValue('اعمال شد ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + n + ' خانه'); } catch (e) {} }
  return n;
}
function tgV170236OkCard() { return 'اصلاح پروفایل‌ها (پیش‌نمایش برای Cowork): ' + ktbFixPreview_(); }

/* یک‌بارهٔ خودکار v170.23.5: شمار منتظرها (فقط شمار؛ لاگ عمومی است)، تلاش دوباره برای «منتشر نشد»، پیش‌نمایش مسیریابی */
function tgV170235Kartable() {
  var I = ktbItems_(), t = ktbRetry_(I.retry);
  return 'کارتابل یاسر: منتظر بازبینی ' + I.review.length + ' · بازبینی‌شده منتشرنشده ' + I.reviewed.length + ' · منتشر نشد ' + (I.failed.length + I.retry.length) +
    ' (دوباره فرستاده: ' + t + '، بعد از تلاش باز شکست: ' + I.failed.length + ') · رزومهٔ بی نسخهٔ سبک ' + (I.resume.length + I.resumeWait.length) + ' (پیش‌نویس آماده: ' + I.resume.length + ') · ویس پردازش‌نشده ' + I.voice.length +
    ' · مسیریابی: ' + ktbRoutePreview_();
}

/* ───── آزمون ───── */
function ktbTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { watch: ['700'], 'ktb:now': Date.UTC(2026, 9, 6, 6, 0), 'spl:now': Date.UTC(2026, 9, 6, 6, 0) };
  try {
    var base = { roles: 'T', consent: 'بله', photo: 'tg:photo:F', city: 'تهران', review: 'x', rstamp: '9', stamp: '5' };
    var mk = function (o) { return Object.assign({}, base, o); };
    TG_MEM['pqrows'] = {
      'ther:الف': mk({ id: 'ther:الف', name: 'الف', stamp: String(Date.UTC(2026, 9, 1)), rstamp: '0', review: '' }),
      'ther:ب': mk({ id: 'ther:ب', name: 'ب', status: 'بازبینی شد', onsite: '' }),
      'ther:پ': mk({ id: 'ther:پ', name: 'پ', status: 'منتشر نشد' }),
      'ther:ت': mk({ id: 'ther:ت', name: 'ت', status: 'روی سایت', onsite: 'خانه', resume: 'tg:doc:D1 · cv.pdf', page: 'https://tajrobeh.life/team/t/' }),
      'ther:ث': mk({ id: 'ther:ث', name: 'ث', status: 'روی سایت', onsite: 'خانه', voice: 'tg:voice:V1 · 40s', page: 'https://tajrobeh.life/team/s/', page_voice: '' }),
      'ther:ج': mk({ id: 'ther:ج', name: 'ج', status: 'روی سایت نمی‌رود (تصمیم تیم)', resume: 'tg:doc:D2' }) };
    var I = ktbItems_();
    ok('منتظر بازبینی', I.review.length === 1 && I.review[0].v.name === 'الف');
    ok('بازبینی‌شده ولی منتشرنشده', I.reviewed.length === 1 && I.reviewed[0].v.name === 'ب');
    ok('«منتشر نشد» اول به تلاش دوباره، نه کارت', I.retry.length === 1 && I.failed.length === 0);
    ok('رزومهٔ بی نسخهٔ سبک ← در حال ساخت', I.resumeWait.length === 1 && I.resume.length === 0);
    ok('ویس پردازش‌نشده', I.voice.length === 1 && I.voice[0].v.name === 'ث');
    ok('«روی سایت نمی‌رود» (تصمیم تیم) در کارتابل نیست', !JSON.stringify(I).match(/"ج"/));
    ok('تلاش دوباره ← صف sitepub، یک بار', ktbRetry_(I.retry) === 1 && ktbRetry_(ktbItems_().retry) === 0 && splActive_('ther:پ').q === SPL_Q.wait);
    /* بعد از تلاش دوباره ناموفق ← کارت */
    var a = splActive_('ther:پ'); a.q = SPL_Q.task; splWrite_(a);
    ok('بعد از تلاش باز شکست ← کارت', ktbItems_().failed.length === 1);
    /* رزومهٔ سبک با جمنای */
    TG_MEM['ktb:gem'] = { sections: [{ title: 'تحصیلات', items: [{ t: 'کارشناسی ارشد روان‌شناسی بالینی — دانشگاه نمونه', year: '۱۳۹۸' }] }, { title: 'خالی', items: [] }] };
    ok('رزومهٔ سبک ساخته و در ستون پیش‌نویس', ktbResumeMake_(tgPrRow_(ktbItems_().resumeWait[0].row)) && /^## تحصیلات\n- کارشناسی ارشد روان‌شناسی بالینی، دانشگاه نمونه · ۱۳۹۸$/.test(TG_MEM['pqrows']['ther:ت'].pub_resume_draft), TG_MEM['pqrows']['ther:ت'].pub_resume_draft);
    ok('پیش‌نویس ← کارتابل', ktbItems_().resume.length === 1);
    /* نما و دکمه‌ها */
    TG_OUTBOX = [];
    ktbShow_(700);
    var said = TG_OUTBOX.map(function (o) { return o.text + JSON.stringify(o.markup || ''); }).join(' ');
    ok('نما: شمار هر دسته و دکمه', /منتظر تأیید تو/.test(said) && /ktb:l:review/.test(said) && /ktb:l:resume/.test(said) && /⏰/.test(said));
    ok('نما: غیرناظر راه ندارد', (function () { TG_OUTBOX = []; ktbShow_(901); return !TG_OUTBOX.some(function (o) { return /منتظر تأیید تو/.test(o.text); }); })());
    ok('دکمهٔ منو و /ok', ktbMaybe_(700, { text: KTB_BTN }) === true && ktbMaybe_(700, { text: '/ok' }) === true && ktbMaybe_(901, { text: KTB_BTN }) === false);
    var rT = ktbItems_().resume[0];
    TG_MEM['dirres'] = { find: { ok: true, hits: [] }, person: { ok: true, url: 'https://tajrobeh.life/team/t/' }, publish: { ok: true, pages: [], errors: [] } };
    ktbCb_(700, 'ktb:ra:' + rT.row + ':' + tgPrH_(rT.v.id));
    ok('تأیید رزومه ← ستون رزومهٔ سبک و پاک شدن پیش‌نویس', /تحصیلات/.test(TG_MEM['pqrows']['ther:ت'].pub_resume) && !TG_MEM['pqrows']['ther:ت'].pub_resume_draft);
    ok('کارت کهنه رد می‌شود', (function () { TG_OUTBOX = []; ktbCb_(700, 'ktb:ra:' + rT.row + ':zzzz'); return /کهنه/.test(TG_OUTBOX.map(function (o) { return o.text; }).join(' ')); })());
    /* یادآوری ساعت ۹، روزی یک بار */
    ok('یادآوری ۹ صبح، روزی یک بار', !!ktbRemind_() && ktbRemind_() === '' && (TG_MEM['ktb:remind'] || []).length === 1);
    /* مسیریابی منتظرهای دیگران */
    TG_CFG_ = { TG_NAMES: { ops: 'مدیر نمونه', reception: 'پذیرش نمونه' }, TG_ROUTE: {} };
    TG_MEM['ktb:tk'] = [{ id: 'M-1', owner: 'پذیرش نمونه', st: 'پاسخ داده شد', reply: '' }, { id: 'M-2', owner: 'پذیرش نمونه', st: 'پاسخ داده شد', reply: 'ساعت را عوض کردیم و خبر دادیم' }, { id: 'M-3', owner: '', st: 'تازه', reply: '' }];
    TG_MEM['ktb:bug'] = [{ id: 'B-1', kind: 'باگ', st: 'تازه' }, { id: 'B-2', kind: 'باگ', st: 'بررسی شد' }];
    TG_MEM['ktb:ops'] = [{ code: 'T-1', title: 'کار نمونه', owner: '', st: OPS_ST.NEW }, { code: 'T-2', title: 'با صاحب', owner: 'x', st: OPS_ST.NEW }];
    var sum = ktbRoutePreview_(), rr = TG_MEM['ktb:rt'];
    ok('مسیریابی: تیکت بی پاسخ واقعی، باگ تازه، کار بی‌صاحب', /تیکت بی پاسخ واقعی: 2/.test(sum) && /باگ تازه: 1/.test(sum) && /کار بی‌صاحب: 1/.test(sum), sum);
    ok('مسیریابی: بی صاحب ← مدیر عملیات', rr.filter(function (r) { return r.ref === 'M-3' || r.ref === 'B-1'; }).every(function (r) { return r.owner === 'مدیر نمونه'; }));
    ok('مسیریابی: بی «اوکی» Cowork کاری ساخته نمی‌شود', ktbRouteMaybe_() === 0 && !(TG_MEM['ktb:tasks'] || []).length);
    TG_MEM['ktb:rtok'] = 'اوکی';
    ok('مسیریابی: با «اوکی» یک بار', ktbRouteMaybe_() === 3 && ktbRouteMaybe_() === 0 && (TG_MEM['ktb:own'] || []).length === 1);
    /* v170.23.6: کارت تأیید یکسان، اعتبارسنجی، ریشهٔ لینک در «عنوان»، اصلاح هاب و پشتوانهٔ انتشار */
    TG_CFG_ = { TG_CONTRACT_VER: '۱' };
    ok('پشتوانهٔ انتشار با نسخهٔ قرارداد', tgPrBasis_() === 'قرارداد همکاری · نسخهٔ ۱');
    ok('اعتبارسنجی: لینک گوگل‌میت در عنوان قفل می‌کند', tgOkBad_('https://meet.google.com/abc-defg-hij') === 'لینک یا ایمیل دارد' && tgOkBad_('روان‌شناس بالینی · روانکاو') === '' && !!tgOkBad_('09' + '121234567'));   // pii:ok ساختگی
    TG_MEM['pqrows']['ther:ح'] = mk({ id: 'ther:ح', name: 'ح', title: 'https://meet.google.com/abc-defg-hij', links: '', skipped: 'title,links', basis: '' });
    TG_MEM['dirres'] = { find: { ok: true, hits: [{ kind: 'p3', page: TG_PR_HOME, title: 'خانه', f: { name: 'ح', sp: 'لکانی', city: 'تهران', photo: 1 } }] } };
    var pH = tgPrPlan_(tgPrRow_(Object.keys(TG_MEM['pqrows']).indexOf('ther:ح') + 3));
    ok('کارت: لینک در عنوان ← ⛔ و دکمهٔ تأیید قفل', tgPrValid_(pH).block.some(function (x) { return /عنوان/.test(x); }) && JSON.stringify(tgPrKb_(pH)).indexOf('pr:pub') < 0);
    var fxs = ktbFixPreview_(), fx = TG_MEM['ktb:fx'];
    ok('اصلاح هاب: پیش‌نمایش جواب جابه‌جا و پشتوانهٔ خالی', /جواب جابه‌جا: 1 \(در «عنوان»: 1\)/.test(fxs) && fx.some(function (x) { return x.kind === 'پشتوانهٔ انتشار'; }), fxs);
    ok('اصلاح هاب: بی «اوکی» Cowork چیزی عوض نمی‌شود', ktbFixMaybe_() === 0 && TG_MEM['pqrows']['ther:ح'].title !== '');
    TG_MEM['ktb:fxok'] = 'اوکی';
    ktbFixMaybe_();
    var vH = TG_MEM['pqrows']['ther:ح'];
    ok('اصلاح هاب: لینک به «لینک‌ها»، عنوان خالی و دوباره پرسیده می‌شود، پشتوانه پر', vH.title === '' && /meet\.google/.test(vH.links) && vH.skipped === 'links' && vH.basis === 'قرارداد همکاری · نسخهٔ ۱');
    /* ریشه: لینک برای پرسش غیرلینکی جواب نیست؛ حالت بسته و پیام به مسیر خودش */
    tgSetVal_('pq', '905', JSON.stringify({ id: 'ther:ح', w: 'T', name: 'ح', todo: ['title'], i: 0, pick: [], n: 1 }));
    ok('ریشه: لینک وسط پرسش «عنوان» مصرف نمی‌شود و حالت بسته می‌شود', tgPqStep_('905', { text: 'https://meet.google.com/abc-defg-hij' }) === false && !tgGetVal_('pq', '905') && TG_MEM['pqrows']['ther:ح'].title === '');
    tgSetVal_('pq', '905', JSON.stringify({ id: 'ther:ح', w: 'T', name: 'ح', todo: ['links'], i: 0, pick: [], n: 1 }));
    ok('ریشه: پرسش «لینک‌ها» لینک را می‌پذیرد', tgPqStep_('905', { text: 'https://example.org/me' }) === true);
    TG_CFG_ = null;
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = null; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'ktbTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['کارتابل تأیید یاسر (v170.23.5)', 'ktbTests']); } catch (eKtb) {}
