/**
 * Tajrobeh · دستیار پاسخ‌گو، مسیر هم‌دامنهٔ سایت به ورکر tj-assist (v2، ۱۷ مهر ۱۴۰۵)
 *
 * چرا: workers.dev از داخل ایران باز نمی‌شود و tajrobeh.life روی کلادفلر نیست، پس route ورکر روی دامنهٔ سایت فعلاً ممکن نیست.
 * ویجت (اسنیپت 501145) اول همین مسیر خود سایت را صدا می‌زند و سرور سایت درخواست را به ورکر می‌رساند:
 *   POST /wp-json/tj/v1/assist       ← POST {ورکر}/assist (امضا با همان رمز فرم‌ها TJ_LEAD_SECRET در 501143؛ X-Tj-Ts و X-Tj-Sig)
 *   GET  /wp-json/tj/v1/assist/boot  ← GET  {ورکر}/assist/boot (پنج دقیقه در transient)
 *   GET  /wp-json/tj/v1/assist/probe ← نتیجهٔ آخرین پروب‌ها (فقط زمان و کد؛ هیچ متن کاربر یا رمزی)
 * تا v1 همین مسیر به اپس‌اسکریپت می‌رفت و کند بود؛ حالا فقط یک رفت‌وبرگشت سبک به ورکر است.
 *
 * پروب داخل ایران: wp-cron هر ساعت از خود سرور سایت boot و یک پرسش ثابت (tap همان اولین دکمهٔ پرسش) را از ورکر می‌گیرد.
 * پرسش پروب با channel=probe در گزارش دستیار (تب گزارش بات) می‌نشیند و پروب‌های ناموفقِ پیش از آن با miss همراهش می‌روند
 * (ورکر «وصل نشد ×n» ثبت می‌کند). ۴۸ نتیجهٔ آخر در option tj_assist_probe می‌ماند.
 * هیچ رمز یا شناسه‌ای به مرورگر نمی‌رسد و متن سؤال در سایت ذخیره نمی‌شود.
 */
if (!function_exists('tj_assist_ask')) {

	define('TJ_ASSIST_EDGE', 'https://tj-assist.yaserderakhshan.workers.dev');

	add_action('rest_api_init', function () {
		register_rest_route('tj/v1', '/assist', array(
			'methods'             => 'POST',
			'permission_callback' => '__return_true',
			'callback'            => 'tj_assist_ask',
		));
		register_rest_route('tj/v1', '/assist/boot', array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => 'tj_assist_boot',
		));
		register_rest_route('tj/v1', '/assist/probe', array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => function () {
				return new WP_REST_Response(array('ok' => true, 'probes' => array_values((array) get_option('tj_assist_probe', array()))), 200, array('Cache-Control' => 'no-store'));
			},
		));
	});

	/* پاسخ خام ورکر برای یک بدنهٔ JSON؛ امضا اگر رمز هست، Origin سایت در هر حال (ورکر بی امضا فقط سقف نشانی را می‌سنجد) */
	function tj_assist_edge_post($body, $timeout) {
		$h = array('Content-Type' => 'text/plain', 'Origin' => 'https://tajrobeh.life');
		$secret = defined('TJ_LEAD_SECRET') ? (string) TJ_LEAD_SECRET : '';
		if ($secret !== '') {
			$ts            = (string) time();
			$h['X-Tj-Ts']  = $ts;
			$h['X-Tj-Sig'] = hash_hmac('sha256', $ts . '.' . $body, $secret);
		}
		return wp_remote_post(TJ_ASSIST_EDGE . '/assist', array('timeout' => $timeout, 'redirection' => 0, 'headers' => $h, 'body' => $body));
	}

	function tj_assist_ask($req) {
		$p   = (array) json_decode((string) $req->get_body(), true);
		$sid = preg_replace('/[^A-Za-z0-9_-]/', '', substr((string) ($p['session_id'] ?? ''), 0, 64));
		if ($sid === '') {
			return new WP_REST_Response(array('ok' => false, 'error' => 'session'), 400);
		}
		/* سقف ساده برای هر نشانی، کنار سقف هر session_id در خود ورکر */
		$ipk = 'tjas_' . md5((string) ($_SERVER['REMOTE_ADDR'] ?? '')) . '_' . gmdate('YmdH');
		$n   = (int) get_transient($ipk);
		if ($n >= 60) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'rate'), 429);
		}
		set_transient($ipk, $n + 1, 3700);
		$body = wp_json_encode(array(
			'action'     => 'assist.ask',
			'channel'    => 'site',
			'session_id' => $sid,
			'text'       => mb_substr(wp_strip_all_tags((string) ($p['text'] ?? '')), 0, 500),
			'tap'        => preg_replace('/[^A-Za-z0-9:_.-]/', '', substr((string) ($p['tap'] ?? ''), 0, 60)),
			'audience'   => mb_substr(wp_strip_all_tags((string) ($p['audience'] ?? '')), 0, 30),
			'miss'       => max(0, min(20, (int) ($p['miss'] ?? 0))),
		));
		$r = tj_assist_edge_post($body, 8);
		if (is_wp_error($r)) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'net'), 503);
		}
		$j = json_decode(wp_remote_retrieve_body($r), true);
		if (!is_array($j)) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'bad'), 502);
		}
		$btns = array();
		foreach ((array) ($j['buttons'] ?? array()) as $b) {
			$u      = isset($b['url']) ? (string) $b['url'] : '';
			$btns[] = array(
				'id'   => isset($b['id']) ? (string) $b['id'] : '',
				'url'  => (strpos($u, 'https://t.me/tajrobehlife_bot') === 0 || strpos($u, 'https://tajrobeh.life/') === 0) ? $u : '',
				'text' => (string) ($b['text'] ?? ''),
			);
		}
		return new WP_REST_Response(array(
			'ok'      => !empty($j['ok']),
			'error'   => (string) ($j['error'] ?? ''),
			'answer'  => (string) ($j['answer'] ?? ''),
			'handoff' => !empty($j['handoff']),
			'buttons' => $btns,
		), 200, array('Cache-Control' => 'no-store'));
	}

	function tj_assist_boot_fetch($timeout) {
		$r = wp_remote_get(TJ_ASSIST_EDGE . '/assist/boot', array('timeout' => $timeout, 'redirection' => 0));
		if (is_wp_error($r) || (int) wp_remote_retrieve_response_code($r) !== 200) {
			return null;
		}
		$j = json_decode(wp_remote_retrieve_body($r), true);
		return (is_array($j) && !empty($j['ok'])) ? $j : null;
	}

	function tj_assist_boot() {
		$j = get_transient('tj_assist_boot');
		if (!is_array($j)) {
			$j = tj_assist_boot_fetch(6);
			if (!$j) {
				return new WP_REST_Response(array('ok' => false, 'error' => 'net'), 503);
			}
			set_transient('tj_assist_boot', $j, 300);
		}
		return new WP_REST_Response($j, 200, array('Cache-Control' => 'public, max-age=300'));
	}

	/* ───── پروب ساعتی از سرور سایت ───── */
	add_action('init', function () {
		if (!wp_next_scheduled('tj_assist_probe')) {
			wp_schedule_event(time() + 120, 'hourly', 'tj_assist_probe');
		}
	});
	add_action('tj_assist_probe', 'tj_assist_probe_run');
	function tj_assist_probe_run() {
		$row = array('at' => gmdate('c'), 'boot' => 0, 'boot_ms' => 0, 'ask' => 0, 'ask_ms' => 0);
		$t   = microtime(true);
		$b   = tj_assist_boot_fetch(10);
		$row['boot_ms'] = (int) round((microtime(true) - $t) * 1000);
		$row['boot']    = $b ? 1 : 0;
		$miss = (int) get_option('tj_assist_probe_miss', 0);
		$id   = $b ? (string) ($b['quick'][0]['id'] ?? '') : '';
		if ($b) {
			$body = wp_json_encode(array('action' => 'assist.ask', 'channel' => 'probe', 'audience' => 'پروب سرور سایت', 'session_id' => 'probe' . gmdate('YmdH'), 'text' => '', 'tap' => $id !== '' ? 'f:' . $id : '', 'miss' => min(20, $miss)));
			$t    = microtime(true);
			$r    = tj_assist_edge_post($body, 10);
			$row['ask_ms'] = (int) round((microtime(true) - $t) * 1000);
			$j    = is_wp_error($r) ? null : json_decode(wp_remote_retrieve_body($r), true);
			$row['ask'] = (is_array($j) && !empty($j['ok'])) ? 1 : 0;
		}
		/* شمار پروب‌های ناموفق تا پروب موفق بعدی؛ همان‌جا با miss به گزارش ورکر می‌رود */
		update_option('tj_assist_probe_miss', $row['ask'] ? 0 : min(20, $miss + 1), false);
		$L   = (array) get_option('tj_assist_probe', array());
		$L[] = $row;
		update_option('tj_assist_probe', array_slice($L, -48), false);
	}
}
