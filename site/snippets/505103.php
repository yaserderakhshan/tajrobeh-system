/* لینک‌های کوتاه: tajrobeh.life/go/<نام> · جدول از تب «سوشال · لینک‌های کوتاه» هاب آمار (منتشرشده به CSV) · کش ۵ دقیقه · نسخهٔ ۲ */
if (!function_exists('tj_go_map_v2')) {
    function tj_go_map_v2() {
        $m = get_transient('tj_go_map_v2');
        if (is_array($m) && $m) { return $m; }
        $csv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_SppHWuWCpEJFt4dw8MnHaycoA-kkSNLGXEFS8XnJaVjSruNrUXRnElRaDy-ewmJswnp5y1zGtJ6s/pub?gid=779286944&single=true&output=csv';
        $m = array();
        $r = wp_remote_get($csv, array('timeout' => 6));
        if (!is_wp_error($r) && (int) wp_remote_retrieve_response_code($r) === 200) {
            $lines = preg_split("/\r\n|\n|\r/", (string) wp_remote_retrieve_body($r));
            foreach ($lines as $i => $line) {
                if ($i === 0 || trim($line) === '') { continue; }
                $c    = str_getcsv($line);
                $k    = strtolower(trim(isset($c[0]) ? $c[0] : ''));
                $dest = trim(isset($c[1]) ? $c[1] : '');
                $st   = trim(isset($c[5]) ? $c[5] : '');
                if ($k === '' || $dest === '') { continue; }
                if ($st !== '' && $st !== 'فعال') { continue; }
                $m[$k] = array($dest, trim(isset($c[2]) ? $c[2] : ''), trim(isset($c[3]) ? $c[3] : ''), trim(isset($c[4]) ? $c[4] : ''));
            }
        }
        if ($m) {
            set_transient('tj_go_map_v2', $m, 5 * MINUTE_IN_SECONDS);
            update_option('tj_go_map_v2_last', $m, false);
            return $m;
        }
        $last = get_option('tj_go_map_v2_last');
        if (is_array($last) && $last) {
            set_transient('tj_go_map_v2', $last, MINUTE_IN_SECONDS);
            return $last;
        }
        return array(
            'life'   => array('/get-therapy/', 'bio', 'tl_bio', 'U-210'),
            'school' => array('/school/', 'bio', 'ts_bio', 'U-211'),
            'yaser'  => array('/', 'bio', 'ty_bio', 'U-212'),
            'bat-tl' => array('https://t.me/tajrobehlife_bot?start=ig_tl_bat', '', '', ''),
            'bat-ts' => array('https://t.me/tajrobehlife_bot?start=ig_ts_bat', '', '', ''),
        );
    }
}
add_action('init', function () {
    if (is_admin()) { return; }
    $uri  = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '';
    $path = strtolower(trim((string) parse_url($uri, PHP_URL_PATH), '/'));
    if (strpos($path, 'go/') !== 0) { return; }
    $name = substr($path, 3);
    $map  = tj_go_map_v2();
    nocache_headers();
    if (!isset($map[$name])) { wp_redirect(home_url('/'), 302); exit; }
    $m    = $map[$name];
    $dest = $m[0];
    $url  = (strpos($dest, 'http') === 0) ? $dest : home_url($dest);
    $own  = (strpos($url, home_url()) === 0);
    if ($own && $m[1] !== '') {
        $url = add_query_arg(array(
            'utm_source'   => 'instagram',
            'utm_medium'   => $m[1],
            'utm_campaign' => $m[2],
            'utm_content'  => $m[3],
        ), $url);
    }
    wp_redirect($url, 302);
    exit;
}, 1);
