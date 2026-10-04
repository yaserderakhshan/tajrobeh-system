/* Tajrobeh: امنیت، سقف تلاش ناموفق ورود (تأیید یاسر، ۱۱ مهر)
 * - ۵ تلاش ناموفق از یک IP در ۱۵ دقیقه ← قفل ۱۵ دقیقه‌ای همان IP برای ورود (wp-login.php و هر مسیری که از authenticate می‌گذرد).
 * - هر تلاش ناموفق، هر قفل و هر ورود رد‌شده در زمان قفل در گزینهٔ tj_sec_log ثبت می‌شود (۵۰۰ خط آخر).
 *   نام کاربری کامل ثبت نمی‌شود؛ فقط سه حرف اول و طول آن.
 * - IP: REMOTE_ADDR. اگر آن نشانی خصوصی یا لوکال باشد (پراکسی جلوی PHP؛ آزمون پل نشان داد وردپرس 10.10.11.1 را می‌بیند)،
 *   X-Real-IP و بعد اولین نشانی X-Forwarded-For به کار می‌رود. اگر هیچ IP عمومی پیدا نشد، قفل نمی‌شود و فقط ثبت می‌شود،
 *   تا همهٔ کاربران پشت یک IP با هم قفل نشوند.
 * - Application Password (claude-ops) از این مسیر نمی‌گذرد و قفل نمی‌شود.
 */
if (!function_exists('tj_sec_ip')) {
  function tj_sec_ip() {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    $pub = function ($v) { return (bool) filter_var($v, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE); };
    if (!$pub($ip)) {
      $cands = array();
      if (!empty($_SERVER['HTTP_X_REAL_IP'])) { $cands[] = trim((string) $_SERVER['HTTP_X_REAL_IP']); }
      if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) { $cands[] = trim(explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR'])[0]); }
      foreach ($cands as $c) { if ($pub($c)) { return $c; } }
      return 'private:' . $ip; // IP واقعی پیدا نشد
    }
    return $ip;
  }
  function tj_sec_log($event, $user = '') {
    $u = $user === '' ? '-' : mb_substr($user, 0, 3) . '…(' . mb_strlen($user) . ')';
    $log = get_option('tj_sec_log', array());
    $log[] = gmdate('c') . ' ' . $event . ' ip=' . tj_sec_ip() . ' user=' . $u;
    update_option('tj_sec_log', array_slice($log, -500), false);
  }
  function tj_sec_key($kind) { return 'tj_sec_' . $kind . '_' . substr(md5(tj_sec_ip()), 0, 16); }
}

if (!defined('TJ_SEC_MAX')) { define('TJ_SEC_MAX', 5); }
if (!defined('TJ_SEC_LOCK')) { define('TJ_SEC_LOCK', 15 * MINUTE_IN_SECONDS); }

// پیش از سنجش رمز: IP قفل‌شده رد می‌شود
add_filter('authenticate', function ($user, $username) {
  if (get_transient(tj_sec_key('lock'))) {
    tj_sec_log('blocked', (string) $username);
    return new WP_Error('tj_locked', 'به‌خاطر تلاش‌های ناموفق پشت سر هم، ورود از این اتصال ۱۵ دقیقه بسته است. بعداً دوباره امتحان کنید.');
  }
  return $user;
}, 1, 2);

add_action('wp_login_failed', function ($username) {
  $k = tj_sec_key('fail');
  $n = (int) get_transient($k) + 1;
  set_transient($k, $n, TJ_SEC_LOCK);
  tj_sec_log('fail#' . $n, (string) $username);
  if ($n >= TJ_SEC_MAX && strpos(tj_sec_ip(), 'private:') === 0) { tj_sec_log('no-real-ip-nolock', (string) $username); return; }
  if ($n >= TJ_SEC_MAX) {
    set_transient(tj_sec_key('lock'), 1, TJ_SEC_LOCK);
    delete_transient($k);
    tj_sec_log('lock', (string) $username);
  }
});

// ورود موفق شمارش همان IP را صفر می‌کند
add_action('wp_login', function ($login) { delete_transient(tj_sec_key('fail')); }, 10, 1);
