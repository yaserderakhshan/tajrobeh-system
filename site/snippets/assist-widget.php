/**
 * Tajrobeh · دستیار پاسخ‌گو، مسیر سرور سایت (بات v170.23.11، assist.gs)
 *
 * از بات v170.23.16 فقط مسیر سرور: رابط کاربری در دکمهٔ شناور ارتباط (اسنیپت 501145، گزینهٔ «سؤال دارم») است.
 * مرورگر فقط با مسیر خود سایت (/wp-json/tj/v1/assist) حرف می‌زند؛ سرور سایت درخواست را با همان رمز فرم‌ها
 * (TJ_LEAD_SECRET در اسنیپت 501143، تابع tajrobeh_leads_signed_url) امضا می‌کند و به رابط وب واحد بات می‌فرستد:
 * action = assist.ask، ورودی channel، session_id، text (یا tap)، country؛ خروجی answer، topic، handoff، buttons.
 * نسخهٔ ۲ همین رابط را مستقیم صدا می‌زند. هیچ رمز یا شناسه‌ای به مرورگر نمی‌رسد و متن سؤال در سایت ذخیره نمی‌شود.
 * نصب: Cowork، به‌صورت «PHP، همه‌جا». تا وقتی ASSIST_ENABLED در بات روشن نیست، پاسخ «خاموش» است و گزینهٔ «سؤال دارم» پیام کوتاه و لینک بات می‌دهد.
 */
if (!function_exists('tj_assist_ask')) {

	add_action('rest_api_init', function () {
		register_rest_route('tj/v1', '/assist', array(
			'methods'             => 'POST',
			'permission_callback' => '__return_true',
			'callback'            => 'tj_assist_ask',
		));
	});

	function tj_assist_ask($req) {
		$p   = (array) $req->get_json_params();
		$sid = preg_replace('/[^A-Za-z0-9_-]/', '', substr((string) ($p['session_id'] ?? ''), 0, 64));
		if ($sid === '') {
			return new WP_REST_Response(array('ok' => false, 'error' => 'session'), 400);
		}
		/* سقف ساده برای هر نشانی، کنار سقف هر session_id در خود بات */
		$ipk = 'tjas_' . md5((string) ($_SERVER['REMOTE_ADDR'] ?? '')) . '_' . gmdate('YmdH');
		$n   = (int) get_transient($ipk);
		if ($n >= 60) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'rate'), 429);
		}
		set_transient($ipk, $n + 1, 3700);
		if (!function_exists('tajrobeh_leads_signed_url')) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'bridge'), 503);
		}
		$country = strtoupper(preg_replace('/[^A-Za-z]/', '', (string) ($_SERVER['HTTP_CF_IPCOUNTRY'] ?? '')));
		$body    = wp_json_encode(array(
			'action'     => 'assist.ask',
			'channel'    => 'site',
			'session_id' => $sid,
			'text'       => mb_substr(wp_strip_all_tags((string) ($p['text'] ?? '')), 0, 500),
			'tap'        => preg_replace('/[^A-Za-z0-9:_-]/', '', substr((string) ($p['tap'] ?? ''), 0, 40)),
			'audience'   => mb_substr(wp_strip_all_tags((string) ($p['audience'] ?? '')), 0, 30),
			'country'    => substr($country, 0, 2),
		));
		/* Apps Script بعد از doPost با ۳۰۲ به نشانی echo می‌فرستد و پاسخ JSON فقط با GET همان نشانی خوانده می‌شود.
		   دنبال کردن خودکار POST را دوباره به echo می‌فرستد و صفحهٔ HTML با ۴۰۵ می‌گیرد (همان error=bad). مثل 501143 ریدایرکت
		   خودکار دنبال نمی‌شود و فقط نشانی echo خود گوگل با GET خوانده می‌شود. */
		$r = wp_remote_post(tajrobeh_leads_signed_url($body), array(
			'timeout'     => 15,
			'redirection' => 0,
			'headers'     => array('Content-Type' => 'application/json'),
			'body'        => $body,
		));
		if (is_wp_error($r)) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'net'), 503);
		}
		$code = (int) wp_remote_retrieve_response_code($r);
		$loc  = (string) wp_remote_retrieve_header($r, 'location');
		if (in_array($code, array(301, 302, 303, 307), true)) {
			if (strpos($loc, 'https://script.googleusercontent.com/macros/echo') !== 0) {
				return new WP_REST_Response(array('ok' => false, 'error' => 'bad'), 502);
			}
			$r = wp_remote_get($loc, array('timeout' => 15, 'redirection' => 0));
			if (is_wp_error($r)) {
				return new WP_REST_Response(array('ok' => false, 'error' => 'net'), 503);
			}
		}
		$j = json_decode(wp_remote_retrieve_body($r), true);
		if (!is_array($j)) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'bad'), 502);
		}
		$btns = array();
		foreach ((array) ($j['buttons'] ?? array()) as $b) {
			$btns[] = array(
				'id'   => isset($b['id']) ? (string) $b['id'] : '',
				'url'  => isset($b['url']) && (strpos((string) $b['url'], 'https://t.me/tajrobehlife_bot') === 0 || strpos((string) $b['url'], 'https://tajrobeh.life/') === 0) ? (string) $b['url'] : '',   /* بات v170.23.16: ابزار رویداد و مجله لینک خود سایت می‌دهند */
				'text' => (string) ($b['text'] ?? ''),
			);
		}
		return new WP_REST_Response(array(
			'ok'      => !empty($j['ok']),
			'error'   => (string) ($j['error'] ?? ''),
			'answer'  => (string) ($j['answer'] ?? ''),
			'handoff' => !empty($j['handoff']),
			'buttons' => $btns,
		), 200);
	}

	/* رابط کاربری از اینجا برداشته شد (ASSISTANT.md بند ۱۰): دستیار حالا گزینهٔ «سؤال دارم» در دکمهٔ شناور ارتباط (اسنیپت 501145) است
	   و همین مسیر سرور را صدا می‌زند. حباب جدای ویجت دیگر ساخته نمی‌شود. */
}
