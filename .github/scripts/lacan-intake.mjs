// E58: فید وب‌هوک ورودی لکان روی فرم فلوئنت به پل.
// MODE=probe (پیش‌فرض): فقط خواندن. مسیرها، فیلدها، فیدهای موجود، شکل تنظیم وب‌هوک (فقط نام کلیدها).
// MODE=apply: فید وب‌هوک را می‌سازد (اگر فیدی با همان نشانی هست، همان را به‌روز می‌کند).
//   راز = base64url(HMAC-SHA256(کلید = راز مشترک بات، متن «tajrobeh-school-intake-v1»))، راز مشترک بات = base64url(HMAC-SHA256(TELEGRAM_TOKEN، «tajrobeh-handoff-v1»)).
//   راز فقط در حافظه است، پوشانده می‌شود و هیچ‌جا چاپ نمی‌شود.
// MODE=test: یک ورودی آزمایشی با نام «آزمون TEST» از فرم می‌فرستد (لین D آن را در پنل به «انصراف» می‌برد).
import { createHmac } from 'node:crypto';
import { loadEnv, wpClient, log, fail, summary } from '../../site/tools/site-lib.mjs';

loadEnv();
const wp = wpClient();
const B = wp.base;
const MODE = process.env.MODE || 'probe';
const FORM = String(process.env.FORM_ID || '19');
const URL_IN = 'https://bridge.tajrobeh.life/api/v2/school/course-registrations/intake';
const FEED_NAME = 'پل · ورودی ثبت‌نام لکان';
const bad = (m) => { fail(m); summary(`\n**❌ ${m}**`); process.exit(1); };
if (!wp.hasAuth) bad('WP_USER یا WP_APP_PASSWORD نیست');
const keys = (o) => (o && typeof o === 'object' ? Object.keys(o).join(',') : String(o).slice(0, 40));
const hosts = (o) => [...new Set((JSON.stringify(o || '').match(/https?:\\?\/\\?\/[^\\/"]+/g) || []).map((u) => u.replace(/\\/g, '')))].join(' ') || '-';
const out = [`## E58 ورودی لکان · ${MODE} · فرم ${FORM}`];

async function feeds() {
  const r = await wp.get(`/wp-json/fluentform/v1/integrations/${FORM}/form-integrations`);
  const list = r.json?.feeds || r.json?.integrations || r.json?.data || [];
  return { r, list: Array.isArray(list) ? list : Object.values(list || {}) };
}

if (MODE === 'probe') {
  const f = await feeds();
  log(`form-integrations → HTTP ${f.r.status}، کلیدها: ${keys(f.r.json)}`);
  for (const x of f.list) log(`  فید ${x.id}: ${x.provider || x.integration_name || '?'} «${x.name || x.value?.name || ''}» فعال=${x.enabled ?? x.status ?? '?'} میزبان: ${hosts(x)}`);
  for (const q of ['?integration_name=webhook', '?integration_name=webhook&integration_id=', '']) {
    const r = await wp.get(`/wp-json/fluentform/v1/integrations/${FORM}${q}`);
    log(`integrations/${FORM}${q} → HTTP ${r.status}، کلیدها: ${keys(r.json)}؛ settings: ${keys(r.json?.settings)}`);
  }
  const g = await wp.get('/wp-json/fluentform/v1/integrations');
  log(`integrations (سراسری) → HTTP ${g.status}، کلیدها: ${keys(g.json)}`);
  const l = await wp.get(`/wp-json/fluentform/v1/integrations/${FORM}/integration-list-id`);
  log(`integration-list-id → HTTP ${l.status}، ${JSON.stringify(l.json || '').slice(0, 300)}`);
  out.push(`- فیدهای موجود: ${f.list.length}`);
} else if (MODE === 'apply') {
  const tok = process.env.TELEGRAM_TOKEN;
  if (!tok) bad('TELEGRAM_TOKEN نیست');
  const b64u = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const shared = b64u(createHmac('sha256', Buffer.from(tok, 'utf8')).update('tajrobeh-handoff-v1').digest());
  const secret = b64u(createHmac('sha256', Buffer.from(shared, 'utf8')).update('tajrobeh-school-intake-v1').digest());
  console.log(`::add-mask::${shared}`); console.log(`::add-mask::${secret}`);
  const def = await wp.get(`/wp-json/fluentform/v1/integrations/${FORM}?integration_name=webhook&integration_id=`);
  const base = def.json?.settings && typeof def.json.settings === 'object' ? def.json.settings : {};
  log(`شکل پیش‌فرض وب‌هوک: HTTP ${def.status}، کلیدها: ${keys(base)}`);
  const f = await feeds();
  const old = f.list.find((x) => JSON.stringify(x).includes('course-registrations/intake'));
  const integration = {
    ...base,
    name: FEED_NAME,
    request_url: URL_IN,
    request_method: 'POST',
    request_format: 'JSON',
    request_body: 'all_fields',
    with_header: 'yup',
    request_headers: [{ key: 'Tajrobeh-Intake-Secret', value: secret }],
    fields: base.fields || [],
    conditionals: base.conditionals || { status: false, type: 'all', conditions: [] },
    enabled: true,
  };
  const r = await wp.post(`/wp-json/fluentform/v1/integrations/${FORM}`, {
    form_id: Number(FORM), integration_name: 'webhook', integration_id: old ? old.id : '', data_type: 'stringify', integration: JSON.stringify(integration),
  });
  log(`ذخیرهٔ فید → HTTP ${r.status}، کلیدها: ${keys(r.json)}، پیام: ${String(r.json?.message || '').slice(0, 200)}`);
  if (!r.ok) bad(`فید ذخیره نشد (HTTP ${r.status}): ${String(r.json?.message || r.text).replace(secret, '***').slice(0, 200)}`);
  const f2 = await feeds();
  const now = f2.list.filter((x) => JSON.stringify(x).includes('course-registrations/intake'));
  out.push(`- فید ${old ? 'به‌روز' : 'ساخته'} شد؛ فیدهای پل روی فرم: ${now.length}`);
  log(out.at(-1));
} else if (MODE === 'test') {
  const def = await wp.get(`/wp-json/fluentform/v1/forms/${FORM}`);
  let fields = [];
  try { const ff = def.json?.form_fields; fields = (typeof ff === 'string' ? JSON.parse(ff) : ff)?.fields || []; } catch {}
  const data = new URLSearchParams();
  const walk = (arr) => { for (const x of arr || []) {
    if (x.columns) { for (const c of x.columns) walk(c.fields); continue; }
    const n = x.attributes?.name; if (!n) continue;
    const opts = Object.keys(x.settings?.advanced_options ? Object.fromEntries((x.settings.advanced_options || []).map((o) => [o.value, 1])) : (x.options || {}));
    if (x.element === 'input_name') { data.append(`${n}[first_name]`, 'آزمون'); data.append(`${n}[last_name]`, 'TEST'); }
    else if (x.element === 'input_email') data.append(n, 'test+lacan@example.invalid');
    else if (/mobile|phone/i.test(n)) data.append(n, '09123456789'); // pii:ok نمونهٔ ساختگی آزمون
    else if (x.element === 'select' || x.element === 'input_radio') data.append(n, opts[0] || '');
    else if (x.element === 'input_checkbox') { if (opts[0]) data.append(`${n}[]`, opts[0]); }
    else if (x.element === 'input_hidden') data.append(n, x.attributes?.value || '');
    else data.append(n, 'آزمون TEST ورودی لکان، لطفاً نادیده بگیرید');
  } };
  walk(fields);
  const r = await fetch(B + '/wp-admin/admin-ajax.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: B + '/lacan/' },
    body: new URLSearchParams({ action: 'fluentform_submit', form_id: FORM, data: data.toString() }) });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch {}
  const id = j?.data?.insert_id || j?.insert_id || '';
  out.push(`- ورودی آزمایشی «آزمون TEST»: HTTP ${r.status}${id ? `، شمارهٔ ورودی ${id}` : ''}${j?.errors ? `، خطا: ${Object.keys(j.errors).join(',')}` : ''}`);
  log(out.at(-1));
  if (!r.ok || !(j?.success || id)) bad('ورودی آزمایشی پذیرفته نشد');
} else bad(`MODE ناشناخته: ${MODE}`);
summary(out.join('\n'));
