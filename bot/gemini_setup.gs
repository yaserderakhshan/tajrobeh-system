/**
 * ماژول Gemini بات تجربه. کلید فقط از Script Properties خوانده می‌شود (GEMINI_API_KEY).
 * هیچ دادهٔ شناسایی‌پذیر مراجع بدون تأیید یاسر به این توابع داده نمی‌شود.
 */
var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/';

function gemKey_() {
  var k = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!k) throw new Error('GEMINI_API_KEY تنظیم نشده');
  return k;
}

function gemFetch_(path, payload) {
  var opt = { method: payload ? 'post' : 'get', muteHttpExceptions: true,
    headers: { 'x-goog-api-key': gemKey_() }, contentType: 'application/json' };
  if (payload) opt.payload = JSON.stringify(payload);
  var r = UrlFetchApp.fetch(GEMINI_BASE + path, opt);
  var body = {}; try { body = JSON.parse(r.getContentText()); } catch (e) {}
  return { code: r.getResponseCode(), body: body };
}

/** بررسی سلامت: فهرست مدل‌ها و یک درخواست متنی خیلی کوچک. */
function geminiCheck() {
  var list = gemFetch_('models?pageSize=200');
  Logger.log('models HTTP ' + list.code);
  var names = (list.body.models || []).map(function (m) { return m.name.replace('models/', ''); });
  Logger.log('image models: ' + names.filter(function (n) { return /image/.test(n); }).join(', '));
  Logger.log('text models: ' + names.filter(function (n) { return /^gemini-[0-9.]+-(flash|pro)(-latest)?$|flash-latest|pro-latest/.test(n); }).join(', '));
  ['gemini-flash-latest', 'gemini-3.1-flash-image'].forEach(function (mdl) {
    var t = gemFetch_('models/' + mdl + ':generateContent', { contents: [{ parts: [{ text: 'فقط بنویس: سلام' }] }] });
    var err = t.body.error ? (t.body.error.message || '').slice(0, 260) : 'OK';
    Logger.log(mdl + ' HTTP ' + t.code + ' : ' + err);
  });
}
