/* Tajrobeh: بستن فهرست کاربران برای مهمان (ممیزی ۱۱ مهر، یافتهٔ ۷)
 * - /wp-json/wp/v2/users و زیرمسیرهایش برای کسی که وارد نشده حذف می‌شود (۴۰۴). کاربر واردشده و claude-ops مثل قبل.
 * - ?author=<عدد> برای مهمان به خانه می‌رود و نامک نویسنده را لو نمی‌دهد. صفحه‌های /mag/author/<نامک>/ دست نمی‌خورند.
 * هیچ بخشی از سایت، بات یا مینی‌اپ این مسیرها را بی ورود نمی‌خواند (بررسی کد مخزن).
 */
add_filter('rest_endpoints', function ($endpoints) {
    if (is_user_logged_in()) { return $endpoints; }
    foreach (array_keys($endpoints) as $route) {
        if (strpos($route, '/wp/v2/users') === 0) { unset($endpoints[$route]); }
    }
    return $endpoints;
});

add_action('init', function () {
    if (is_admin() || is_user_logged_in() || !isset($_GET['author'])) { return; }
    if (preg_match('/^\d+$/', (string) $_GET['author'])) { wp_safe_redirect(home_url('/'), 301); exit; }
}, 1);
