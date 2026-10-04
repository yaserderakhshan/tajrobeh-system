/* Tajrobeh: کش وقت‌های آزاد معارفه برای ویجت شروع تراپی (gtw) · 1405-06-29
   GET /wp-json/tj/v1/slots?scope=ir|ab&zone=..&topic=anx|rel|fam|kid
   تازه تا ۱۰ دقیقه؛ کهنه تا ۶ ساعت فوراً برگردانده و در پس‌زمینه تازه می‌شود. */
if (!function_exists('tj_gtw_slots_key')) {
function tj_gtw_slots_key($scope, $zone, $topic) { return 'tjgtw_' . $scope . '_' . $zone . '_' . $topic; }
function tj_gtw_slots_fetch($scope, $zone, $topic) {
    $lock = 'tjgtwl_' . $scope . '_' . $zone . '_' . $topic;
    if (get_transient($lock)) { return null; }
    set_transient($lock, 1, 45);
    $url = 'https://script.google.com/macros/s/AKfycbxD-DYhZ9LFjwB9az_DpMprzF_ItJkdad_DutMGPk1qY3ksBb45aMHYZBsXTCepYhsC8Q/exec'
         . '?api=slots&scope=' . rawurlencode($scope) . '&zone=' . rawurlencode($zone) . '&topic=' . rawurlencode($topic);
    $r = wp_remote_get($url, array('timeout' => 25, 'redirection' => 5));
    delete_transient($lock);
    if (is_wp_error($r)) { return null; }
    $j = json_decode(wp_remote_retrieve_body($r), true);
    if (!is_array($j) || empty($j['ok']) || !isset($j['slots']) || !is_array($j['slots'])) { return null; }
    $out = array();
    foreach ($j['slots'] as $s) {
        if (!is_array($s) || empty($s['therapist']) || empty($s['dateIso'])) { continue; }
        $t = !empty($s['tehran']) ? $s['tehran'] : (isset($s['hhmm']) ? $s['hhmm'] : '');
        $out[] = array('n' => (string) $s['therapist'], 'd' => (string) $s['dateIso'], 't' => (string) $t);
    }
    $pack = array('at' => time(), 'slots' => $out);
    set_transient(tj_gtw_slots_key($scope, $zone, $topic), $pack, 6 * HOUR_IN_SECONDS);
    return $pack;
}
function tj_gtw_slots_rest($req) {
    $scope = $req->get_param('scope') === 'ab' ? 'ab' : 'ir';
    $zone  = (string) $req->get_param('zone');
    $topic = (string) $req->get_param('topic');
    if (!in_array($zone, array('ir', 'de', 'uk', 'us', 'uw', 'ae', 'tr'), true)) { $zone = ($scope === 'ab') ? 'de' : 'ir'; }
    if ($scope === 'ir') { $zone = 'ir'; }
    if (!in_array($topic, array('anx', 'rel', 'fam', 'kid'), true)) { $topic = 'anx'; }
    $pack = get_transient(tj_gtw_slots_key($scope, $zone, $topic));
    $src = 'cache';
    if (!is_array($pack)) {
        $pack = tj_gtw_slots_fetch($scope, $zone, $topic);
        $src = 'live';
    } elseif (time() - intval($pack['at']) > 600) {
        $src = 'stale';
        $args = array($scope, $zone, $topic);
        if (!wp_next_scheduled('tj_gtw_slots_refresh', $args)) {
            wp_schedule_single_event(time(), 'tj_gtw_slots_refresh', $args);
            if (function_exists('spawn_cron')) { spawn_cron(); }
        }
    }
    if (!is_array($pack)) { return new WP_REST_Response(array('ok' => false), 200); }
    $res = new WP_REST_Response(array('ok' => true, 'src' => $src, 'age' => time() - intval($pack['at']), 'slots' => $pack['slots']), 200);
    $res->header('Cache-Control', 'no-store');
    return $res;
}
add_action('rest_api_init', function () {
    register_rest_route('tj/v1', '/slots', array('methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => 'tj_gtw_slots_rest'));
});
add_action('tj_gtw_slots_refresh', 'tj_gtw_slots_fetch', 10, 3);
}
