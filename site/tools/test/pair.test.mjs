// امنیت (بات v170.9): جفت‌شدن بات و سایت بی کد مدیر کلید نمی‌پذیرد (site/tools/test/pair-test.php با وردپرس ساختگی)
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

test('جفت‌شدن بی کد یا با کد غلط رد می‌شود', () => {
  const out = execFileSync('php', [join(dirname(fileURLToPath(import.meta.url)), 'pair-test.php')], { encoding: 'utf8' });
  assert.equal(out.trim(), 'OK');
});
