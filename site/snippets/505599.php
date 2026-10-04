/* tj-school-live v1 (۶ مهر ۱۴۰۵)
 * منبع زندهٔ «الان در مدرسه» برای صفحهٔ /school/ و هر جای دیگر.
 * داده را از بلوک evData برگهٔ رویدادها (505409) می‌خواند؛ پس فقط همان صفحه باید به‌روز شود.
 * خروجی: /wp-json/tj/v1/school-live  (کش ۲۰ دقیقه‌ای، با تغییر برگه خودش باطل می‌شود)
 */
add_action('rest_api_init', function () {
	register_rest_route('tj/v1', '/school-live', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => 'tj_school_live_payload',
	));
});

function tj_school_live_payload() {
	$page_id = 505409;
	$post    = get_post($page_id);
	if (!$post) { return new WP_Error('tj_no_page', 'events page missing', array('status' => 404)); }
	$tz    = wp_timezone();
	$now   = new DateTime('now', $tz);
	$today = $now->format('Y-m-d');
	$key   = 'tj_school_live_' . md5($post->post_modified_gmt . '|' . $today . '|' . $now->format('H'));
	$hit   = get_transient($key);
	if ($hit !== false) { $hit['now'] = $now->format('c'); return rest_ensure_response($hit); }

	if (!preg_match('#<script type="application/json" id="evData">(.*?)</script>#s', $post->post_content, $m)) {
		return new WP_Error('tj_no_data', 'evData missing', array('status' => 500));
	}
	$data = json_decode($m[1], true);
	if (!is_array($data) || empty($data['events'])) {
		return new WP_Error('tj_bad_data', 'evData invalid', array('status' => 500));
	}
	$P  = isset($data['P']) ? $data['P'] : array();
	$C  = isset($data['C']) ? $data['C'] : array();
	$G  = isset($data['G']) ? $data['G'] : array();
	$nowTs = $now->getTimestamp();

	$upcoming = array(); $recent = array(); $past = 0; $next30 = 0; $nextByG = array(); $firstYear = null;
	$in30 = (clone $now)->modify('+30 days')->format('Y-m-d');
	foreach ($data['events'] as $e) {
		if (empty($e['d'])) { continue; }
		$t   = !empty($e['t']) ? $e['t'] : '12:00';
		$mins = isset($e['m']) ? intval($e['m']) : 90;
		$start = DateTime::createFromFormat('Y-m-d H:i', $e['d'] . ' ' . $t, $tz);
		if (!$start) { continue; }
		$endTs = $start->getTimestamp() + $mins * 60;
		$y = intval(substr($e['d'], 0, 4));
		if ($firstYear === null || $y < $firstYear) { $firstYear = $y; }
		$people = array();
		if (!empty($e['p']) && is_array($e['p'])) {
			foreach ($e['p'] as $pk) {
				if (isset($P[$pk])) { $people[] = array('n' => $P[$pk][0], 'img' => $P[$pk][1], 'r' => $P[$pk][2]); }
			}
		}
		$row = array(
			'i'   => $e['i'], 'd' => $e['d'], 't' => isset($e['t']) ? $e['t'] : '', 'm' => $mins,
			'ttl' => $e['ttl'], 'g' => isset($e['g']) ? $e['g'] : 'pub', 'k' => isset($e['k']) ? $e['k'] : '',
			'c'   => isset($e['c']) ? $e['c'] : '', 'ci' => isset($e['ci']) ? $e['ci'] : '',
			'a'   => isset($e['a']) ? $e['a'] : '', 'pl' => isset($e['pl']) ? $e['pl'] : '',
			'ln'  => isset($e['ln']) ? $e['ln'] : '', 'ig' => (!empty($e['ig']) ? $e['ig'][0] : ''),
			'p'   => $people, 'ts' => $start->getTimestamp(), 'te' => $endTs,
		);
		if ($endTs >= $nowTs) {
			$upcoming[] = $row;
			if ($e['d'] <= $in30) { $next30++; }
		} else {
			$past++;
			$recent[] = $row;
		}
	}
	usort($upcoming, function ($a, $b) { return $a['ts'] - $b['ts']; });
	usort($recent, function ($a, $b) { return $b['ts'] - $a['ts']; });
	foreach ($upcoming as $u) { if (!isset($nextByG[$u['g']])) { $nextByG[$u['g']] = $u; } }
	$recentPublic = array();
	foreach ($recent as $r) { if ($r['g'] === 'pub' || $r['g'] === 'jc' || $r['g'] === 'case') { $recentPublic[] = $r; } if (count($recentPublic) >= 4) { break; } }

	$out = array(
		'now'      => $now->format('c'),
		'upcoming' => array_slice($upcoming, 0, 14),
		'recent'   => array_slice($recent, 0, 6),
		'recentPublic' => $recentPublic,
		'nextByG'  => $nextByG,
		'counts'   => array('past' => $past, 'next30' => $next30, 'since' => $firstYear, 'total' => count($data['events'])),
		'G' => $G, 'C' => $C,
	);
	set_transient($key, $out, 20 * MINUTE_IN_SECONDS);
	return rest_ensure_response($out);
}
