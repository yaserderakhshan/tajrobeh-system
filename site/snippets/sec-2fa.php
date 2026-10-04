/* Tajrobeh: امنیت، ورود دومرحله‌ای مدیر کل با کد یک‌بارمصرف بات (تأیید یاسر، ۱۱ مهر)
 *
 * چه کسی: فقط نقش administrator، و فقط کاربرانی که شناسه‌شان در گزینهٔ tj_2fa_users است
 *   (مرحلهٔ اول فقط حساب یاسر؛ بعد از تست، مقدار all برای همهٔ مدیرها). claude-ops هرگز (ورود فرمی ندارد؛ فقط Application Password).
 * روند: رمز درست ← کوکی ورود پاک می‌شود ← کد ۶ رقمی (۱۰ دقیقه، حداکثر ۵ تلاش) از بات به ادمین (مرحلهٔ اول فقط حساب یاسر)
 *   ← اگر بات در دسترس نبود یا پیام امنیتی خاموش است: همان کد به ایمیل همان مدیر ← صفحهٔ «کد ورود» ← کد درست = ورود.
 * کد هرگز خام ذخیره نمی‌شود (HMAC با نمک وردپرس). هر ارسال، هر تلاش و هر نتیجه در tj_sec_log ثبت می‌شود (بی کد).
 * خاموش کردن اضطراری: define('TJ_2FA_OFF', true); در wp-config.php (مسئول فنی سایت)، یا خالی کردن گزینهٔ tj_2fa_users.
 */
if (!function_exists('tj2fa_required')) {
  function tj2fa_required($user) {
    if (defined('TJ_2FA_OFF') && TJ_2FA_OFF) { return false; }
    if (!$user || !in_array('administrator', (array) $user->roles, true) || $user->user_login === 'claude-ops') { return false; }
    $list = trim((string) get_option('tj_2fa_users', ''));
    if ($list === 'all') { return true; }
    return in_array((string) $user->ID, array_map('trim', explode(',', $list)), true);
  }
  function tj2fa_log($e, $user) { if (function_exists('tj_sec_log')) { tj_sec_log('2fa-' . $e, $user ? $user->user_login : ''); } }
  function tj2fa_mac($code, $token) { return hash_hmac('sha256', $code . '|' . $token, wp_salt('auth')); }

  function tj2fa_deliver($user, $code) {
    $msg = "کد ورود به پیشخوان tajrobeh.life: " . $code . "\nتا ۱۰ دقیقه معتبر است. اگر شما وارد نمی‌شدید، فوراً به یاسر خبر دهید.";
    if (function_exists('tj_bot_send') && tj_bot_send('2fa', array('user' => $user->user_login, 'code' => $code))) { return 'bot'; }
    if (wp_mail($user->user_email, 'کد ورود tajrobeh.life', $msg)) { return 'email'; }
    return '';
  }

  function tj2fa_form($token, $via, $err = '') {
    if (!function_exists('login_header')) { wp_die('ورود دومرحله‌ای لازم است. از صفحهٔ ورود معمول (wp-login.php) وارد شوید.', 'کد ورود', array('response' => 403)); }
    login_header('کد ورود', '', $err ? new WP_Error('tj2fa', $err) : null);
    $where = $via === 'email' ? 'ایمیل شما' : 'تلگرام شما (بات تجربه)';
    echo '<form name="tj2fa" method="post" action="' . esc_url(site_url('wp-login.php?action=tj2fa', 'login_post')) . '">';
    echo '<p>کد ۶ رقمی به ' . esc_html($where) . ' فرستاده شد.</p>';
    echo '<p><label for="tj2fa_code">کد ورود</label><input type="text" name="tj2fa_code" id="tj2fa_code" class="input" inputmode="numeric" autocomplete="one-time-code" pattern="\d{6}" maxlength="6" required autofocus></p>';
    echo '<input type="hidden" name="tj2fa_t" value="' . esc_attr($token) . '">';
    wp_nonce_field('tj2fa_' . $token, 'tj2fa_n');
    echo '<p class="submit"><input type="submit" class="button button-primary button-large" value="ورود"></p></form>';
    login_footer('tj2fa_code');
    exit;
  }
}

// بعد از رمز درست: به‌جای ورود، کد بفرست
add_action('wp_login', function ($login, $user) {
  if (!tj2fa_required($user)) { return; }
  wp_clear_auth_cookie();
  $token = wp_generate_password(40, false, false);
  $code = (string) random_int(100000, 999999);
  $via = tj2fa_deliver($user, $code);
  if (!$via) {
    tj2fa_log('undeliverable', $user);
    wp_die('کد ورود فرستاده نشد (نه از بات، نه از ایمیل). چند دقیقه بعد دوباره امتحان کنید یا به مسئول فنی سایت خبر دهید.', 'کد ورود', array('response' => 503));
  }
  set_transient('tj2fa_' . $token, array('u' => $user->ID, 'mac' => tj2fa_mac($code, $token), 'n' => 0, 'via' => $via,
    'remember' => !empty($_POST['rememberme']), 'to' => isset($_REQUEST['redirect_to']) ? wp_unslash($_REQUEST['redirect_to']) : admin_url()), 10 * MINUTE_IN_SECONDS);
  tj2fa_log('sent-' . $via, $user);
  tj2fa_form($token, $via);
}, 5, 2);

// صفحهٔ کد: wp-login.php?action=tj2fa
add_action('login_form_tj2fa', function () {
  $token = isset($_POST['tj2fa_t']) ? preg_replace('/[^A-Za-z0-9]/', '', (string) $_POST['tj2fa_t']) : '';
  $s = $token ? get_transient('tj2fa_' . $token) : false;
  if (!$s) { wp_safe_redirect(wp_login_url()); exit; }
  $user = get_user_by('id', $s['u']);
  if (!isset($_POST['tj2fa_n']) || !wp_verify_nonce($_POST['tj2fa_n'], 'tj2fa_' . $token)) { tj2fa_form($token, $s['via'], 'دوباره امتحان کنید.'); }
  $code = preg_replace('/\D/', '', (string) ($_POST['tj2fa_code'] ?? ''));
  if (!hash_equals($s['mac'], tj2fa_mac($code, $token))) {
    $s['n']++;
    if ($s['n'] >= 5) { delete_transient('tj2fa_' . $token); tj2fa_log('too-many', $user); wp_safe_redirect(wp_login_url()); exit; }
    set_transient('tj2fa_' . $token, $s, 10 * MINUTE_IN_SECONDS);
    tj2fa_log('wrong#' . $s['n'], $user);
    tj2fa_form($token, $s['via'], 'کد درست نیست.');
  }
  delete_transient('tj2fa_' . $token);
  wp_set_auth_cookie($user->ID, $s['remember']);
  wp_set_current_user($user->ID);
  tj2fa_log('ok', $user);
  do_action('tj_admin_login_verified', $user);
  wp_safe_redirect(apply_filters('login_redirect', $s['to'], $s['to'], $user));
  exit;
});
