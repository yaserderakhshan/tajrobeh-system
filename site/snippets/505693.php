// tj-redirects v1 (مهر ۱۴۰۵): ریدایرکت ۳۰۱ نشانی‌های قدیمیِ ۴۰۴ به صفحه‌های تازه. فقط روی صفحهٔ ۴۰۴ اجرا می‌شود؛ نشانی تازه = یک سطر در $map
add_action('template_redirect', function () {
    if (!is_404()) { return; }
    $path = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
    $path = '/' . trim($path, '/') . '/';
    $map = array(
        '/couple-therapy/'    => '/therapy/couple-therapy/',
        '/eft/'               => '/school/eft/',
        '/mag/school-new/'    => '/school/',
        '/mag/joinus-new/'    => '/joinus/',
        '/school/cbt/'        => '/school/',
        '/mag/services_type/' => '/therapy/',
        '/magazine/'          => '/mag/',
    );
    if (isset($map[$path])) { wp_safe_redirect(home_url($map[$path]), 301); exit; }
});