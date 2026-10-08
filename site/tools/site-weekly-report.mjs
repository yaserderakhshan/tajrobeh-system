// خلاصهٔ کوتاه چک هفتگی برای یاسر (از audit.json و drift.json همان اجرا). نام یا دادهٔ هیچ کاربری در آن نیست.
import { join } from 'node:path';
import { faDigits, readJson, report } from './site-lib.mjs';

const OUT = process.env.OUT || '/tmp/site-weekly';
const a = readJson(join(OUT, 'audit.json'), {});
const drift = readJson(join(OUT, 'drift.json'), []);
const s = (ms) => (ms == null ? '-' : faDigits((ms / 1000).toFixed(1)));
const L = ['🩺 چک هفتگی tajrobeh.life'];
if (a.speed) {
  const ok = a.speed.filter((r) => !r.error);
  const worst = [...ok].sort((x, y) => y.lcp - x.lcp)[0];
  L.push(`سرعت موبایل: امتیاز ${faDigits(Math.min(...ok.map((r) => r.score)))} تا ${faDigits(Math.max(...ok.map((r) => r.score)))} · کندترین LCP ${s(worst?.lcp)} ثانیه (${decodeURI(worst?.url || '-')})`);
}
if (a.security) {
  const sec = a.security;
  const upd = (sec.plugins || []).length;
  L.push(`امنیت: ${faDigits(sec.vulns?.length || 0)} آسیب‌پذیری شناخته‌شده · هدرها ${['strict-transport-security', 'x-frame-options', 'x-content-type-options'].filter((h) => sec.headers?.[h]).length ? 'هست' : 'نیست'} · TLS ${faDigits(sec.tls?.days_left ?? '?')} روز · ${faDigits(upd)} افزونه`);
  for (const v of (sec.vulns || []).slice(0, 3)) L.push(`  ⚠️ ${v.slug} ${v.ver}: رفع در ${v.fixed_in}`);
}
if (a.leads) {
  const miss = a.leads.pages.filter((p) => p.status !== 200 || !p.has);
  L.push(`مسیرهای لید: ${miss.length ? '⛔ ' + miss.map((p) => p.url).join('، ') : `هر ${faDigits(a.leads.pages.length)} صفحهٔ فرم سالم`}`);
}
if (a.links) L.push(`لینک خراب: ${faDigits(a.links.bad.length)} از ${faDigits(a.links.checked)}${a.links.bad.length ? ' (' + a.links.bad.slice(0, 3).map((b) => decodeURI(b.url)).join('، ') + ')' : ''}`);
L.push(`ناهمخوانی مخزن و سایت: ${faDigits(drift.length)} مورد${drift.length ? ' (ویرایش دستی در وردپرس؛ site-mirror در اجرای ساعتی برمی‌دارد)' : ''}`);
try { L.push((await import('./faq-review.mjs')).faqReviewLine(7)); } catch (e) { L.push('پرسش‌های پرتکرار دستیار: سنجش صفحه‌های مرجع نشد (' + String(e.message || e).slice(0, 80) + ')'); }
await report(L.join('\n'), { type: 'گزارش', ref: 'SITE-WEEKLY' });
console.log(L.join('\n'));
