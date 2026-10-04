/* Tajrobeh: کش فهرست درمانگرها برای ویجت شروع تراپی (gtw) · 1405-06-31
   GET /wp-json/tj/v1/thers
   POST /wp-json/tj/v1/thers-push (۹ مهر ۱۴۰۵، بات v166.29.1): بات فهرست عمومی را خودش می‌فرستد، با همان رمز camp-push.
   سرور ایران همیشه به workers.dev نمی‌رسد و کش بیش از یک روز کهنه ماند؛ کشیدن از لبه فقط پشتیبان است. */
if (!function_exists('tj_gtw_thers_fetch')) {
function tj_gtw_thers_fetch() {
    if (get_transient('tjgtw_thers_lock')) { return null; }
    set_transient('tjgtw_thers_lock', 1, 45);
    $r = wp_remote_get('https://tajrobeh-edge.yaserderakhshan.workers.dev/thers', array('timeout' => 20, 'redirection' => 5));
    delete_transient('tjgtw_thers_lock');
    if (is_wp_error($r)) { return null; }
    $j = json_decode(wp_remote_retrieve_body($r), true);
    if (!is_array($j) || !isset($j['list']) || !is_array($j['list']) || count($j['list']) < 1) { return null; }
    $pack = array('at' => time(), 'list' => $j['list']);
    set_transient('tjgtw_thers', $pack, 30 * DAY_IN_SECONDS);
    update_option('tj_gtw_thers_bk', $pack, false);
    return $pack;
}
function tj_gtw_thers_rest($req) {
    $pack = get_transient('tjgtw_thers');
    $src = 'cache';
    if (!is_array($pack)) {
        $pack = tj_gtw_thers_fetch();
        $src = 'live';
        if (!is_array($pack)) {
            $bk = get_option('tj_gtw_thers_bk');
            if (is_array($bk)) { $pack = $bk; $src = 'backup'; }
        }
    } elseif (time() - intval($pack['at']) > 1800) {
        $src = 'stale';
        if (!wp_next_scheduled('tj_gtw_thers_refresh')) {
            wp_schedule_single_event(time(), 'tj_gtw_thers_refresh');
            if (function_exists('spawn_cron')) { spawn_cron(); }
        }
    }
    if (!is_array($pack) || empty($pack['list'])) { return new WP_REST_Response(array('ok' => false), 200); }
    $res = new WP_REST_Response(array('ok' => true, 'src' => $src, 'age' => time() - intval($pack['at']), 'list' => $pack['list']), 200);
    $res->header('Cache-Control', 'no-store');
    return $res;
}
function tj_gtw_thers_push($req) {
    $b = $req->get_json_params();
    if (!is_array($b) || !isset($b['list']) || !is_array($b['list']) || count($b['list']) < 1) {
        return new WP_REST_Response(array('ok' => false, 'error' => 'empty'), 400);
    }
    $pack = array('at' => time(), 'list' => $b['list']);
    set_transient('tjgtw_thers', $pack, 30 * DAY_IN_SECONDS);
    update_option('tj_gtw_thers_bk', $pack, false);
    return new WP_REST_Response(array('ok' => true, 'n' => count($b['list'])), 200);
}
add_action('rest_api_init', function () {
    register_rest_route('tj/v1', '/thers', array('methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => 'tj_gtw_thers_rest'));
    register_rest_route('tj/v1', '/thers-push', array('methods' => 'POST', 'callback' => 'tj_gtw_thers_push',
        'permission_callback' => function ($r) { return function_exists('tj_camp_auth') && tj_camp_auth($r); })); // رمز قدیم یا تازه (505050)
});
add_action('tj_gtw_thers_refresh', 'tj_gtw_thers_fetch');
}