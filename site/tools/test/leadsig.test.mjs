// بات v170.9: امضای لید سایت. رمز در گیت خالی است و هنگام انتشار از SITE_SECRET_TJ_LEAD_SECRET (GitHub Secret «SITE_LEAD_SECRET») پر می‌شود.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { maskSecrets, unmaskFrom } from '../secrets.mjs';

const SNIP = new URL('../../snippets/501143.php', import.meta.url);
const FAKE = 'Lm4Np6Qr8St0Uv2Wx4Yz6Ab8Cd0Ef2Gh4Ij6Kl8';   // ساختگی

test('رمز امضای لید در گیت خالی است', () => {
  const s = readFileSync(SNIP, 'utf8');
  assert.match(s, /define\('TJ_LEAD_SECRET', ''\)/);
  assert.equal(maskSecrets(s), s);
});
test('هنگام انتشار از Secret پر می‌شود و هر سه ارسال (صف لید، ارسال مستقیم، کلیک غیرمسدود) امضا دارند', () => {
  const s = readFileSync(SNIP, 'utf8');
  assert.match(unmaskFrom(s, '', { SITE_SECRET_TJ_LEAD_SECRET: FAKE }), new RegExp(`define\\('TJ_LEAD_SECRET', '${FAKE}'\\)`));
  assert.equal((s.match(/wp_remote_post\(tajrobeh_leads_signed_url\(\$body\)/g) || []).length, 3);
  assert.doesNotMatch(s, /wp_remote_post\(tajrobeh_leads_endpoint\(\)/);
});
