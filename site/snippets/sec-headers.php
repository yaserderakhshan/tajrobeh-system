/* Tajrobeh: امنیت، هدرهای امنیتی از داخل وردپرس (ممیزی ۱۱ مهر، یافتهٔ ۶؛ تصمیم یاسر: با اسنیپت، نه سرور)
 * - HSTS اول با max-age کوتاه (۵ دقیقه). بعد از یک هفتهٔ بی‌مشکل در PRهای جدا: یک روز، یک هفته، شش ماه.
 *   includeSubDomains و preload عمداً نیست.
 * - قاب‌گذاری: در همهٔ صفحه‌ها فقط همین دامنه (X-Frame-Options و CSP frame-ancestors).
 *   برگهٔ مینی‌اپ /app/ استثناست: تلگرام وب آن را در iframe باز می‌کند، پس آنجا frame-ancestors دامنه‌های تلگرام را هم دارد و XFO ندارد.
 * - nosniff، Referrer-Policy، و Permissions-Policy (دوربین و مکان و پرداخت بسته؛ میکروفون فقط برای خود سایت، برای ضبط صدا).
 * محدودیت: صفحه‌ای که مستقیم از فایل کش سرو شود (بی اجرای وردپرس) این هدرها را نمی‌گیرد؛ راه کامل، تنظیم در openresty است.
 */
add_action('send_headers', function () {
    if (headers_sent()) { return; }
    header('Strict-Transport-Security: max-age=300');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), geolocation=(), payment=(), microphone=(self)');
    $path = (string) parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
    if (preg_match('#^/app(/|$)#', $path)) {
        header("Content-Security-Policy: frame-ancestors 'self' https://web.telegram.org https://webk.telegram.org https://webz.telegram.org");
    } else {
        header('X-Frame-Options: SAMEORIGIN');
        header("Content-Security-Policy: frame-ancestors 'self'");
    }
});
