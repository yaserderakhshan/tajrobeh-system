/**
 * poll.gs · v170.124 · ۲۰ آبان ۱۴۰۵ · نظرسنجی کارکنان (E6 بند ۵، Q2 لین A)
 *
 * فقط کارکنان مدرسه و پذیرش و مالک با «/poll سؤال | گزینه | گزینه» می‌سازند؛ نظرسنجی ناشناس است و فقط شمار ذخیره می‌شود،
 * هیچ نام یا شناسهٔ رأی‌دهنده‌ای نه. تلگرام برای نظرسنجی ناشناس poll_answer نمی‌فرستد (فقط برای غیرناشناس)؛ وضعیت و شمار با update نوع «poll» می‌آید،
 * پس allowed_updates با TG_FEAT_POLL «poll» می‌گیرد. شمار در Script Property «PL:<id>» (۳۰ نظرسنجی آخر).
 * هدف: کلید TG_POLL_CHAT (پیش‌فرض خود سازنده، یعنی پیش‌نمایش). «/pollresult»: شمار ۵ نظرسنجی آخر.
 * پشت TG_FEAT_POLL؛ خاموش یعنی این فرمان‌ها مثل امروز به مسیر بعدی می‌روند.
 */
var PL_MAX_KEEP = 30;
function pollDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function pollGet_(k) { if (pollDry_()) return TG_MEM['pl:' + k] || ''; return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function pollPut_(k, v) { if (pollDry_()) { TG_MEM['pl:' + k] = v; return; } PropertiesService.getScriptProperties().setProperty(k, v); }
function pollDel_(k) { if (pollDry_()) { delete TG_MEM['pl:' + k]; return; } PropertiesService.getScriptProperties().deleteProperty(k); }
function pollStaff_(chat) {
  var c = String(chat);
  if (pollDry_()) return (TG_MEM['pollstaff'] || []).indexOf(c) > -1;
  if (c === String(TG_OWNER_CHAT)) return true;
  try { if (tgWhoDesk_(chat, '')) return true; } catch (e) {}
  try { var ow = tgSchoolOwners_(); for (var i = 0; i < ow.length; i++) if (tgChatIds_(ow[i].chat).indexOf(c) > -1) return true; } catch (e2) {}
  return false;
}
/* «/poll سؤال | گزینه ۱ | گزینه ۲» (جداکننده «|» یا خط جدید) ← {q, opts} یا null */
function pollParse_(text) {
  var body = String(text || '').replace(/^\/poll(@\w+)?\s*/, '');
  var parts = body.split(/\s*\|\s*|\n+/).map(function (x) { return String(x).replace(/^\s+|\s+$/g, ''); }).filter(String);
  if (parts.length < 3 || parts.length > 11) return null;
  var q = parts[0], opts = parts.slice(1);
  if (q.length > 300 || opts.some(function (o) { return o.length > 100; })) return null;
  return { q: q, opts: opts };
}
function pollSave_(id, q, opts) {
  var idx = []; try { idx = JSON.parse(pollGet_('PL_IDX') || '[]') || []; } catch (e) { idx = []; }
  idx.push(String(id));
  while (idx.length > PL_MAX_KEEP) pollDel_('PL:' + idx.shift());
  pollPut_('PL_IDX', JSON.stringify(idx));
  pollPut_('PL:' + id, JSON.stringify({ q: q, o: opts, c: opts.map(function () { return 0; }), n: 0 }));
}
/* update.poll: فقط نظرسنجی‌هایی که خود بات ساخته (کلید PL:<id> هست)؛ فقط شمار */
function pollUpdate_(poll) {
  if (!poll || !poll.id) return false;
  var raw = pollGet_('PL:' + poll.id); if (!raw) return false;
  var o; try { o = JSON.parse(raw); } catch (e) { return false; }
  o.c = (poll.options || []).map(function (x) { return Number(x.voter_count || 0); });
  o.n = Number(poll.total_voter_count || 0);
  pollPut_('PL:' + poll.id, JSON.stringify(o));
  return true;
}
function pollResultText_() {
  var idx = []; try { idx = JSON.parse(pollGet_('PL_IDX') || '[]') || []; } catch (e) {}
  var out = [];
  idx.slice(-5).reverse().forEach(function (id) {
    var o; try { o = JSON.parse(pollGet_('PL:' + id) || 'null'); } catch (e) { o = null; }
    if (!o) return;
    out.push('📊 <b>' + tgEsc_(o.q) + '</b> · ' + tgFa_(o.n) + ' رأی\n' + o.o.map(function (t, i) { return '• ' + tgEsc_(t) + ': ' + tgFa_(o.c[i] || 0); }).join('\n'));
  });
  return out.length ? out.join('\n\n') : 'هنوز نظرسنجی‌ای ساخته نشده.';
}
var PL_HELP = 'ساخت نظرسنجی ناشناس:\n/poll سؤال | گزینهٔ ۱ | گزینهٔ ۲ | …\n(۲ تا ۱۰ گزینه). شمار رأی‌ها: /pollresult';
function pollRoute_(chat, m) {
  var t = m && m.text; if (!t || !/^\/poll(result)?(@\w+)?(\s|$)/.test(t)) return false;
  if (!tgFeat_('POLL') || !pollStaff_(chat)) return false;   /* خاموش یا غیرکارمند: مثل امروز به مسیر بعدی */
  if (/^\/pollresult/.test(t)) { tgSend_(chat, pollResultText_()); return true; }
  var p = pollParse_(t);
  if (!p) { tgSend_(chat, PL_HELP); return true; }
  var target = String(cfg_('TG_POLL_CHAT', '') || '').trim() || String(chat);
  var res = tgApi_('sendPoll', { chat_id: target, question: p.q, options: p.opts.map(function (x) { return { text: x }; }), is_anonymous: true });
  var j = null; try { j = res && res.getContentText ? JSON.parse(res.getContentText()) : null; } catch (e) {}
  if (j && j.ok && j.result && j.result.poll) { pollSave_(j.result.poll.id, p.q, p.opts); if (target !== String(chat)) tgSend_(chat, 'نظرسنجی فرستاده شد. شمار: /pollresult'); }
  else if (!pollDry_()) tgSend_(chat, 'نظرسنجی نرفت؛ بعداً دوباره بزنید.');
  return true;
}
function pollTests() {
  var out = [], pass = 0, fail = 0;
  function ok(n, c) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n); }
  var kD = TG_DRY, kM = TG_MEM, kO = TG_OUTBOX, kC = TG_CFG_;
  TG_DRY = true; TG_MEM = { pollstaff: ['501'] }; TG_OUTBOX = []; TG_CFG_ = {};
  try {
    ok('نظرسنجی: تجزیهٔ درست', JSON.stringify(pollParse_('/poll آیا خوب بود؟ | بله | نه')) === JSON.stringify({ q: 'آیا خوب بود؟', opts: ['بله', 'نه'] }));
    ok('نظرسنجی: کمتر از دو گزینه و بیش از ده گزینه رد می‌شود', pollParse_('/poll سؤال | یک') === null && pollParse_('/poll q | 1|2|3|4|5|6|7|8|9|10|11') === null && pollParse_('/poll q | 1|2|3|4|5|6|7|8|9|10') !== null);
    ok('نظرسنجی: کلید خاموش، فرمان به مسیر بعدی می‌رود', pollRoute_('501', { text: '/poll q | a | b' }) === false && TG_OUTBOX.length === 0);
    TG_CFG_ = { TG_FEAT_POLL: '1' };
    ok('نظرسنجی: غیرکارمند به مسیر بعدی می‌رود', pollRoute_('999', { text: '/poll q | a | b' }) === false && TG_OUTBOX.length === 0);
    TG_OUTBOX = [];
    ok('نظرسنجی: کارمند، sendPoll ساخته می‌شود', pollRoute_('501', { text: '/poll q | a | b' }) === true && TG_OUTBOX.some(function (x) { return x.kind === 'api' && x.method === 'sendPoll'; }));
    TG_OUTBOX = [];
    pollRoute_('501', { text: '/poll فقط سؤال' });
    ok('نظرسنجی: ورودی ناقص راهنما می‌دهد، sendPoll نه', TG_OUTBOX.some(function (x) { return x.kind === 'msg' && /ساخت نظرسنجی/.test(x.text); }) && !TG_OUTBOX.some(function (x) { return x.method === 'sendPoll'; }));
    pollSave_('P1', 'سؤال نمونه', ['الف', 'ب']);
    ok('نظرسنجی: poll ناشناس شمار را به‌روز می‌کند', pollUpdate_({ id: 'P1', total_voter_count: 3, options: [{ voter_count: 2 }, { voter_count: 1 }] }) === true && /۳ رأی/.test(pollResultText_()) && /الف: ۲/.test(pollResultText_()));
    ok('نظرسنجی: poll ناشناخته نادیده گرفته می‌شود', pollUpdate_({ id: 'X', options: [] }) === false);
    ok('نظرسنجی: هیچ شناسهٔ رأی‌دهنده‌ای ذخیره نمی‌شود', !/user|from|chat/.test(TG_MEM['pl:PL:P1'] || ''));
    for (var i = 0; i < 35; i++) pollSave_('Z' + i, 'q', ['a', 'b']);
    ok('نظرسنجی: فقط ۳۰ تای آخر می‌ماند', JSON.parse(TG_MEM['pl:PL_IDX']).length === 30 && !TG_MEM['pl:PL:P1']);
  } finally { TG_DRY = kD; TG_MEM = kM; TG_OUTBOX = kO; TG_CFG_ = kC; }
  Logger.log(out.join('\n'));
  return { pass: pass, fail: fail, text: out.filter(function (l) { return l.indexOf('❌') === 0; }).join('\n') };
}
