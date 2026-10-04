/* Tajrobeh: ارسال پیام امنیتی به بات (هشدار ورود مدیر و کد ورود دومرحله‌ای)
 * تصمیم یاسر (۱۲ مهر): Secret تازه‌ای نیست. همان نشانی بات (tajrobeh_leads_endpoint) و همان امضای لید (tajrobeh_leads_signed_url
 * با TJ_LEAD_SECRET، اسنیپت 501143) به کار می‌رود. پیام با kind «wp_sec» می‌رود و بات خودش آن را به ادمین (از تنظیمات بات) می‌رساند.
 * شناسهٔ تلگرام و کلید در وردپرس نیست.
 * خاموش است تا مسیر wp_sec در بات منتشر شود: فقط وقتی گزینهٔ tj_sec_bot_on برابر 1 باشد چیزی فرستاده می‌شود.
 * بی امضا (TJ_LEAD_SECRET خالی) هم چیزی نمی‌فرستد، چون بات این نوع پیام را فقط با امضای درست می‌پذیرد.
 * پاسخ: true یعنی doPost بات اجرا شد (۳۰۲ به echo خود Apps Script یا ۲xx). نرسیدن پیام تلگرام را از اینجا نمی‌توان دید.
 */
if (!function_exists('tj_bot_send')) {
  function tj_bot_send($event, $data = array()) {
    if (get_option('tj_sec_bot_on') !== '1') { return false; }
    if (!function_exists('tajrobeh_leads_endpoint') || !function_exists('tajrobeh_leads_signed_url') || !defined('TJ_LEAD_SECRET') || TJ_LEAD_SECRET === '') { return false; }
    $body = wp_json_encode(array_merge(array('kind' => 'wp_sec', 'event' => (string) $event, 'site' => home_url()), (array) $data));
    $r = wp_remote_post(tajrobeh_leads_signed_url($body), array(
      'timeout' => 10, 'redirection' => 0, 'headers' => array('Content-Type' => 'application/json'), 'body' => $body,
    ));
    if (is_wp_error($r)) { return false; }
    $code = (int) wp_remote_retrieve_response_code($r);
    if ($code >= 200 && $code < 300) { return true; }
    return ($code === 302 || $code === 303) && strpos((string) wp_remote_retrieve_header($r, 'location'), 'https://script.googleusercontent.com/macros/echo') === 0;
  }
}
