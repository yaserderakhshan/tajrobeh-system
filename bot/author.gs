/**
 * author.gs · v165 · ۷ مهر ۱۴۰۵
 * حساب نویسندهٔ وردپرس، خودسرویس و بی‌دخالت یاسر:
 *   مطلب منتشر می‌شود ← بات از نویسنده ایمیل می‌خواهد (یا ایمیل پرونده را تأیید می‌گیرد)
 *   ← بات با امضای HMAC (همان کلید جفت‌شدهٔ tj/v1/dir) از سایت دعوت‌نامهٔ یک‌بارمصرف می‌گیرد
 *   ← نویسنده دکمه را می‌زند و حسابش با نقش «نویسنده» ساخته و مطلبش به نامش می‌شود.
 * اسنیپت وردپرس: «Tajrobeh author self-join» (tj/v1/author-invite و tj/v1/author-join).
 * اگر حسابی با همان ایمیل باشد، سایت همان لحظه مطلب را به او نسبت می‌دهد و دعوت‌نامه لازم نیست.
 * قلاب‌ها در telegram.gs: tgAuRoute_ (tgPrivate_، کنار mcRoute_) · tgAuCb_ (کال‌بک au:) · tgAuAfterPub_ (tgMagPubLink_)
 */

var TG_AU_URL = 'https://tajrobeh.life/wp-json/tj/v1/author-invite';
var TG_AU_STATE = 'auj';

function tgAuSite_(data) {
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'au', data: JSON.parse(JSON.stringify(data)) }); return (TG_MEM['aures'] || { ok: true, link: 'https://tajrobeh.life/wp-json/tj/v1/author-join?t=DRY' }); }
  var key = PropertiesService.getScriptProperties().getProperty('TG_DIR_KEY');
  if (!key) throw new Error('سایت هنوز با بات جفت نشده است');
  var body = tgDirAscii_(JSON.stringify(data));
  var ts = String(Math.floor(Date.now() / 1000));
  var res = UrlFetchApp.fetch(TG_AU_URL + '?ts=' + ts + '&sig=' + tgDirSign_(ts, body, key), {
    method: 'post', contentType: 'application/json', payload: body, muteHttpExceptions: true, followRedirects: false
  });
  var code = res.getResponseCode(), txt = res.getContentText(), j = null;
  try { j = JSON.parse(txt); } catch (e) {}
  if (code !== 200 || !j) throw new Error('سایت ' + code + ': ' + ((j && j.message) || txt.slice(0, 160)));
  return j;
}

function tgAuIsEmail_(s) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(s || '').trim()); }

/* اطلاعات نویسنده از پروفایل سایت و تب‌ها: نامک انگلیسی، معرفی کوتاه، صفحهٔ تیم، ایمیل پرونده */
function tgAuInfo_(name, chat) {
  var o = { name: String(name || '').trim(), slug: '', bio: '', page: '', email: '' };
  if (TG_DRY) return Object.assign(o, (TG_MEM['auinfo'] || {})[o.name] || {});
  try {
    var rec = tgPqRec_('ther:' + o.name) || tgPqRec_('ppl:' + o.name);
    if (rec) {
      var v = rec.v;
      o.slug = String(v.site_slug || '').trim() || tgPrLatinSlug_(v.latin) || '';
      var title = String(v.pub_title || v.title || '').trim(), head = String(v.pub_headline || v.headline || '').trim();
      o.bio = [title, head].filter(String).join('. ');
      o.page = String(v.page || '').trim();
      if (!o.slug && o.page) o.slug = (o.page.replace(/\/+$/, '').split('/').pop() || '');
    }
  } catch (e) {}
  try {
    var t = tgTherapistRows_().filter(function (x) { return tgSameName_(x.name, o.name); })[0];
    if (t && tgAuIsEmail_(t.email)) o.email = String(t.email).trim();
  } catch (e2) {}
  return o;
}

/* بعد از انتشار از میز سردبیر: اگر نویسنده صفحهٔ نویسندگی ندارد، مسیر ساخت حساب را خودش شروع می‌کند */
function tgAuAfterPub_(r, link) {
  var to = tgMagFirst_(r.chat);
  if (!to) return false;
  try {
    var p = tgPersonByChat_(to);
    if (p && !TG_DRY && /\/mag\/author\//.test(String(tgPeopleSheet_().getRange(p.row, TG_PEOPLE_HEAD.indexOf('مجلهٔ تجربه') + 1).getValue() || ''))) return false;
  } catch (e) {}
  return tgAuStart_(to, r.name, [link]);
}

function tgAuStart_(chat, name, links) {
  var info = tgAuInfo_(name, chat);
  var st = { name: info.name, slug: info.slug, bio: info.bio, page: info.page, links: links || [], email: info.email };
  tgSetVal_(TG_AU_STATE, chat, JSON.stringify(st));
  var t = '✍️ <b>صفحهٔ نویسندگی شما در مجلهٔ تجربه</b>\n\n' +
          'برای اینکه مطلب به نام خودتان روی سایت بیاید و همهٔ نوشته‌هایتان یک‌جا جمع شود، یک صفحهٔ نویسنده برایتان می‌سازیم.\n\n';
  if (st.email) {
    t += 'ایمیلی که از شما داریم: <code>' + tgEsc_(st.email) + '</code>\nهمین باشد؟';
    return tgSend_(chat, t, { inline_keyboard: [[{ text: '✅ همین ایمیل', callback_data: 'au:ok' }], [{ text: '✏️ ایمیل دیگری می‌نویسم', callback_data: 'au:new' }], [{ text: 'فعلاً نه', callback_data: 'au:x' }]] });
  }
  t += 'فقط ایمیلتان را همین‌جا بنویسید. ایمیل فقط برای حساب نویسنده است و روی سایت نمایش داده نمی‌شود.';
  return tgSend_(chat, t, { inline_keyboard: [[{ text: 'فعلاً نه', callback_data: 'au:x' }]] });
}

function tgAuState_(chat) { var s = tgGetVal_(TG_AU_STATE, chat); if (!s) return null; try { return JSON.parse(s); } catch (e) { return null; } }

/* متن آزاد وقتی منتظر ایمیل است */
function tgAuRoute_(chat, m) {
  var st = tgAuState_(chat);
  if (!st || !m || !m.text) return false;
  var s = String(m.text).trim();
  if (s.indexOf('/') === 0) { tgDel_(TG_AU_STATE, chat); return false; }
  if (!tgAuIsEmail_(s)) { tgSend_(chat, 'این شبیه ایمیل نیست. یک ایمیل کامل بنویسید، مثل name@gmail.com', { inline_keyboard: [[{ text: 'فعلاً نه', callback_data: 'au:x' }]] }); return true; }
  st.email = s;
  tgAuInvite_(chat, st);
  return true;
}

function tgAuCb_(cq, rest, chat) {
  var st = tgAuState_(chat);
  if (rest === 'x') { tgDel_(TG_AU_STATE, chat); return tgSend_(chat, 'باشد. هر وقت خواستید از «' + TG_MAG_BTN + '» خبر بدهید.'); }
  if (!st) return tgSend_(chat, 'این درخواست منقضی شده؛ از «' + TG_MAG_BTN + '» دوباره خبر بدهید.');
  if (rest === 'new') { st.email = ''; tgSetVal_(TG_AU_STATE, chat, JSON.stringify(st)); return tgSend_(chat, 'ایمیلتان را بنویسید.'); }
  if (rest === 'ok' && tgAuIsEmail_(st.email)) return tgAuInvite_(chat, st);
  return null;
}

function tgAuInvite_(chat, st) {
  var res;
  try {
    res = tgAuSite_({ name: st.name, email: st.email, slug: st.slug, bio: st.bio, page: st.page, links: st.links || [], chat: String(chat) });
  } catch (e) {
    tgErr_('tgAuInvite_: ' + e);
    tgDeskSay_('⚠️ ساخت حساب نویسنده برای ' + tgEsc_(st.name) + ' از سایت جواب نگرفت: ' + tgEsc_(String(e.message || e)));
    return tgSend_(chat, 'سایت همین الان جواب نداد. به تیم خبر دادیم و به‌زودی دوباره برایتان می‌فرستیم.');
  }
  tgDel_(TG_AU_STATE, chat);
  var url = res.author_url || '';
  try {
    var p = tgPersonByChat_(chat);
    if (p && url) tgPersonSet_(p.row, { 'مجلهٔ تجربه': url }, 'بات', { why: 'صفحهٔ نویسندهٔ مجله' });
  } catch (e2) {}
  if (res.exists) {
    return tgSend_(chat, '✅ حساب نویسندهٔ شما از قبل بود و مطلب به نام خودتان شد.', url ? { inline_keyboard: [[{ text: '🌐 صفحهٔ نویسندگی من', url: url }]] } : null);
  }
  return tgSend_(chat, '🎉 آماده است. دکمهٔ پایین را بزنید تا صفحهٔ نویسندگی‌تان ساخته شود و مطلب به نام خودتان شود. این لینک فقط برای شماست و یک بار کار می‌کند.',
    { inline_keyboard: [[{ text: '✍️ ساخت صفحهٔ نویسندهٔ من', url: res.link }]] });
}

function tgAuTests() {
  var out = [], ok = function (n, c) { out.push((c ? '✅ ' : '❌ ') + n); };
  var was = TG_DRY; TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var said = function () { return TG_OUTBOX.map(function (x) { return String(x.text || ''); }).join(' | '); };
  TG_MEM['auinfo'] = { 'نویسندهٔ تست': { slug: 'test-writer', email: '' } };
  tgAuStart_(777, 'نویسندهٔ تست', ['https://tajrobeh.life/mag/x/']);
  ok('ایمیل خواسته می‌شود', said().indexOf('ایمیلتان') > -1);
  TG_OUTBOX = [];
  ok('متن غیرایمیل رد می‌شود', tgAuRoute_(777, { text: 'سلام' }) && said().indexOf('شبیه ایمیل نیست') > -1);
  TG_OUTBOX = [];
  tgAuRoute_(777, { text: 'writer@example.com' });
  var call = TG_OUTBOX.filter(function (x) { return x.kind === 'au'; })[0];
  ok('از سایت دعوت‌نامه گرفته می‌شود', !!call && call.data.email === 'writer@example.com' && call.data.slug === 'test-writer' && call.data.links.length === 1);
  ok('دکمهٔ ساخت فرستاده می‌شود', said().indexOf('ساخت صفحهٔ نویسندهٔ من') > -1 || JSON.stringify(TG_OUTBOX).indexOf('author-join') > -1);
  ok('حالت پاک می‌شود', !tgAuState_(777));
  TG_MEM['auinfo'] = { 'نویسندهٔ دوم': { email: 'x@y.com' } }; TG_OUTBOX = [];
  tgAuStart_(778, 'نویسندهٔ دوم', []);
  ok('ایمیل پرونده برای تأیید نشان داده می‌شود', said().indexOf('x@y.com') > -1);
  TG_MEM['aures'] = { ok: true, exists: true, author_url: 'https://tajrobeh.life/mag/author/y/' }; TG_OUTBOX = [];
  tgAuCb_({}, 'ok', 778);
  ok('حساب موجود: بدون دعوت‌نامه', said().indexOf('از قبل بود') > -1);
  TG_DRY = was;
  return out.join('\n') + '\n(' + out.filter(function (s) { return s.indexOf('✅') === 0; }).length + ' از ' + out.length + ')';
}
