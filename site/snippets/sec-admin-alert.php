/* Tajrobeh: امنیت، هشدار ورود مدیر کل به یاسر (تأیید یاسر، ۱۱ مهر)
 * هر ورود موفق کاربری با نقش administrator (جز claude-ops که ورود فرمی ندارد) یک پیام کوتاه از بات برای یاسر می‌فرستد:
 * نام کاربری، زمان تهران، IP. وقتی ورود دومرحله‌ای روشن است، هشدار بعد از تأیید کد می‌رود (رویداد tj_admin_login_verified).
 * نیاز: اسنیپت «ارسال پیام امنیتی به بات». بات پیام را به ادمین (از تنظیمات خود بات) می‌رساند. تا روشن شدن tj_sec_bot_on خاموش است.
 */
if (!function_exists('tj_admin_alert')) {
  function tj_admin_alert($user) {
    if (!function_exists('tj_bot_send')) { return; }
    if (!in_array('administrator', (array) $user->roles, true) || $user->user_login === 'claude-ops') { return; }
    $ip = function_exists('tj_sec_ip') ? tj_sec_ip() : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '-');
    $when = wp_date('Y-m-d H:i', null, new DateTimeZone('Asia/Tehran'));
    $ok = tj_bot_send('login', array('user' => $user->user_login, 'when' => $when, 'ip' => $ip));
    if (function_exists('tj_sec_log')) { tj_sec_log($ok ? 'admin-alert-sent' : 'admin-alert-failed', $user->user_login); }
  }
}
// اگر ورود دومرحله‌ای برای این کاربر لازم باشد، اسنیپت آن پیش از این (اولویت ۵) کار را قطع می‌کند و بعد از کد درست tj_admin_login_verified را صدا می‌زند
add_action('wp_login', function ($login, $user) { tj_admin_alert($user); }, 20, 2);
add_action('tj_admin_login_verified', 'tj_admin_alert', 10, 1);
