// E58: فید وب‌هوک ورودی لکان روی فرم‌های فلوئنت. گام ۱، فقط خواندن (بی تغییر سایت، بی راز).
// چاپ می‌کند: مسیرهای REST فلوئنت که webhook یا integration دارند، فرم ۱۹ و فرم‌هایی که عنوانشان «لکان» دارد،
// نام فیلدهای هر کدام، و فیدهای وب‌هوک موجود (فقط نام و میزبان نشانی). هیچ دادهٔ ثبت‌نامی خوانده نمی‌شود.
import { loadEnv, wpClient, log, fail, summary } from './site-lib.mjs';

loadEnv();
const wp = wpClient();
const bad = (m) => { fail(m); summary(`\n**❌ ${m}**`); process.exit(1); };
if (!wp.hasAuth) bad('WP_USER یا WP_APP_PASSWORD نیست');

const idx = await wp.get('/wp-json/fluentform/v1');
if (!idx.ok || !idx.json) bad(`فهرست مسیرهای فلوئنت نیامد (HTTP ${idx.status})`);
const routes = Object.entries(idx.json.routes || {})
  .filter(([p]) => /webhook|integration/i.test(p))
  .map(([p, v]) => `${(v.methods || []).join(',')} ${p}`);
log('مسیرهای وب‌هوک و یکپارچه‌سازی فلوئنت:');
routes.forEach((r) => log('  ' + r));

const forms = await wp.get('/wp-json/fluentform/v1/forms?per_page=100&search=' + encodeURIComponent('لکان'));
const list = (forms.json && (forms.json.data || forms.json.forms?.data || forms.json)) || [];
const ids = new Set(['19']);
for (const f of Array.isArray(list) ? list : []) { ids.add(String(f.id)); log(`فرم ${f.id}: ${f.title} (${f.status})`); }

const out = [`## E58 گام ۱ (فقط خواندن)`, `- مسیرها: ${routes.length}`];
for (const id of ids) {
  const f = await wp.get(`/wp-json/fluentform/v1/forms/${id}`);
  const fields = [];
  try {
    const ff = typeof f.json?.form_fields === 'string' ? JSON.parse(f.json.form_fields) : (f.json?.form_fields || {});
    const walk = (a) => (a || []).forEach((x) => { if (x.attributes?.name) fields.push(`${x.attributes.name}:${x.element}`); if (x.columns) x.columns.forEach((c) => walk(c.fields)); if (x.fields && !x.attributes?.name) walk(Object.values(x.fields)); });
    walk(ff.fields);
  } catch {}
  log(`فرم ${id} «${f.json?.title || '?'}» (HTTP ${f.status}) فیلدها: ${fields.join('، ')}`);
  out.push(`- فرم ${id} «${f.json?.title || '?'}»: ${fields.length} فیلد`);
  for (const p of [`/wp-json/fluentform/v1/integrations/${id}`, `/wp-json/fluentform/v1/forms/${id}/integrations`, `/wp-json/fluentform/v1/settings/${id}/webhooks`, `/wp-json/fluentform/v1/forms/${id}/webhooks`]) {
    const r = await wp.get(p);
    const s = r.json ? JSON.stringify(r.json) : '';
    const hosts = [...new Set((s.match(/https?:\\?\/\\?\/[^\\/"]+/g) || []).map((u) => u.replace(/\\/g, '')))];
    log(`  ${p} → HTTP ${r.status}، کلیدها: ${r.json && typeof r.json === 'object' ? Object.keys(r.json).slice(0, 12).join(',') : '-'}، میزبان‌ها: ${hosts.join(' ') || '-'}`);
  }
}
summary(out.join('\n'));
