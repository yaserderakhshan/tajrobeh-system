/**
 * hubro.gs · v170.128 · ۲۲ آبان ۱۴۰۵ · فقط‌خواندنی کردن تب هاب پس از بار واقعی پل (QUEUE بند E، تصمیم یاسر ۲۲ آبان ۰۱:۰۰)
 *
 * پس از هر «بار واقعی موفق با شمار برابر» یک بخش خوراک برش در پل (STATUS-D)، تب‌های همان بخش (از CO_SECTIONS) قفل برگه می‌گیرند:
 * فقط مالک (همان حسابی که بات با آن اجرا می‌شود) ویرایش می‌کند، پس بات همچنان می‌نویسد و ویرایش کارکنان بسته است. هیچ داده‌ای پاک نمی‌شود.
 * اجرا: هر بخش یک تابع یک‌بارهٔ جدا (ro…) که از اجرای دستی گردش کار دیپلوی با run_once زده می‌شود؛ roUndoAll همهٔ این قفل‌ها را برمی‌دارد.
 * قفل این فایل با توضیح HRO_DESC شناخته می‌شود و قفل‌های دیگر شیت (ستون‌ها، تنظیمات) دست نمی‌خورند. خروجی فقط شمار و وضع، بی نام آدم.
 * حالت خشک: TG_MEM['hro:tabs'] = {'<b>:<t>': ''|توضیح قفل}.
 */
var HRO_DESC = 'فقط‌خواندنی · بار واقعی در پل · ';
var HRO_FN = { 'people': 'roPeople', 'leads': 'roLeads', 'lead-events': 'roLeadEvents', 'lead-sources': 'roLeadSources', 'lead-clicks': 'roLeadClicks', 'tasks': 'roTasks',
  'therapist-leave': 'roTherapistLeave', 'therapist-applications': 'roTherapistApplications', 'venues': 'roVenues', 'venue-rooms': 'roVenueRooms', 'venue-hours': 'roVenueHours',
  'venue-occupancy': 'roVenueOccupancy', 'venue-requests': 'roVenueRequests', 'school-courses': 'roSchoolCourses', 'school-circles': 'roSchoolCircles', 'school-faculty': 'roSchoolFaculty',
  'school-leads': 'roSchoolLeads', 'school-lead-events': 'roSchoolLeadEvents', 'scholarships': 'roScholarships', 'alumni': 'roAlumni' };
function hroSheet_(tb) { var ss = tb.b === 'school' ? tgSchSS_() : tgSS_(); return ss.getSheetByName(tb.t); }
function hroMine_(sh) {
  return sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).filter(function (p) { return String(p.getDescription() || '').indexOf(HRO_DESC) === 0; });
}
/** قفل تب‌های یک بخش؛ خروجی «بخش: قفل، از پیش، تب نیست» به ترتیب تب‌ها */
function hroLock_(s) {
  var S = coSec_(s); if (!S) return s + ': بخش ناشناخته';
  var out = S.tabs.map(function (tb) {
    if (TG_DRY) {
      var m = TG_MEM['hro:tabs'] || {}, k = tb.b + ':' + tb.t;
      if (!(k in m)) return 'تب نیست';
      if (String(m[k]).indexOf(HRO_DESC) === 0) return 'از پیش';
      m[k] = HRO_DESC + s; return 'قفل';
    }
    try {
      var sh = hroSheet_(tb); if (!sh) return 'تب نیست';
      if (hroMine_(sh).length) return 'از پیش';
      var p = sh.protect().setDescription(HRO_DESC + s);
      p.removeEditors(p.getEditors());   /* مالک برداشته نمی‌شود؛ بات با همان حساب می‌نویسد */
      if (p.canDomainEdit()) p.setDomainEdit(false);
      return 'قفل';
    } catch (e) { return 'خطا ' + String(e.message || e).slice(0, 40); }
  });
  return s + ': ' + out.join('، ');
}
/** برداشتن همهٔ قفل‌های این فایل (برگشت)؛ قفل‌های دیگر دست نمی‌خورند */
function hroUnlockAll_() {
  var n = 0, seen = {};
  CO_SECTIONS.forEach(function (S) {
    S.tabs.forEach(function (tb) {
      var k = tb.b + ':' + tb.t; if (seen[k]) return; seen[k] = 1;
      if (TG_DRY) { var m = TG_MEM['hro:tabs'] || {}; if (String(m[k] || '').indexOf(HRO_DESC) === 0) { m[k] = ''; n++; } return; }
      try { var sh = hroSheet_(tb); if (sh) hroMine_(sh).forEach(function (p) { p.remove(); n++; }); } catch (e) {}
    });
  });
  return 'قفل برداشته ' + n;
}
function roPeople() { return hroLock_('people'); }
function roLeads() { return hroLock_('leads'); }
function roLeadEvents() { return hroLock_('lead-events'); }
function roLeadSources() { return hroLock_('lead-sources'); }
function roLeadClicks() { return hroLock_('lead-clicks'); }
function roTasks() { return hroLock_('tasks'); }
function roTherapistLeave() { return hroLock_('therapist-leave'); }
function roTherapistApplications() { return hroLock_('therapist-applications'); }
function roVenues() { return hroLock_('venues'); }
function roVenueRooms() { return hroLock_('venue-rooms'); }
function roVenueHours() { return hroLock_('venue-hours'); }
function roVenueOccupancy() { return hroLock_('venue-occupancy'); }
function roVenueRequests() { return hroLock_('venue-requests'); }
function roSchoolCourses() { return hroLock_('school-courses'); }
function roSchoolCircles() { return hroLock_('school-circles'); }
function roSchoolFaculty() { return hroLock_('school-faculty'); }
function roSchoolLeads() { return hroLock_('school-leads'); }
function roSchoolLeadEvents() { return hroLock_('school-lead-events'); }
function roScholarships() { return hroLock_('scholarships'); }
function roAlumni() { return hroLock_('alumni'); }
function roUndoAll() { return hroUnlockAll_(); }

try { TG_SUITES.push(['فقط‌خواندنی تب هاب پس از بار پل (v170.128)', 'hroTests']); } catch (eSuH) {}
function hroTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM };
  TG_DRY = true; TG_MEM = { 'hro:tabs': { 'hub:لیدها': '', 'hub:کدهای start': '', 'school:اپلای تراپیست': 'قفل دیگری' } };
  try {
    ok('هر بخش خوراک برش یک تابع قفل دارد و همه در فهرست یک‌باره‌های CI هستند', CO_SECTIONS.every(function (S) { var f = HRO_FN[S.s]; return f && typeof ciGlobal_(f) === 'function' && CI_ONCE_ALLOW.indexOf(f) > -1; }) && CI_ONCE_ALLOW.indexOf('roUndoAll') > -1);
    ok('قفل: تب هست ← قفل با توضیح بخش', roLeads() === 'leads: قفل' && TG_MEM['hro:tabs']['hub:لیدها'] === HRO_DESC + 'leads');
    ok('دوباره زدن: «از پیش»، بی قفل دوم', roLeads() === 'leads: از پیش');
    ok('تب ناپیدا: «تب نیست»؛ بخش دوتبی هر تب جدا', roLeadSources() === 'lead-sources: قفل، تب نیست', roLeadSources());
    ok('تب بی قفل این فایل قفل می‌شود؛ roUndoAll فقط قفل‌های این فایل را برمی‌دارد', hroLock_('therapist-applications') === 'therapist-applications: تب نیست، قفل' && roUndoAll() === 'قفل برداشته 3' && TG_MEM['hro:tabs']['hub:لیدها'] === '' && TG_MEM['hro:tabs']['school:اپلای تراپیست'] === '');
    ok('بخش ناشناخته پیام روشن می‌دهد', hroLock_('xyz') === 'xyz: بخش ناشناخته');
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 200)); }
  TG_DRY = keep.dry; TG_MEM = keep.mem;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ قفل تب هاب درست است'));
  return tgTestTally_(log, fail);
}
