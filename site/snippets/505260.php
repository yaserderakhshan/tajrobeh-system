/* Tajrobeh: لینک داخلی سمت سرور از مقاله‌های مجله به صفحه‌های هدف نقشهٔ کلیدواژه (گام G3، ۲ مهر ۱۴۰۵)
 * قواعد: حداکثر سه لینک در هر مقاله، هر مقصد یک بار، فقط اولین رخداد، فقط داخل p و li،
 * هرگز داخل لینک و تیتر و بلوک‌های CTA، نه روی خود صفحهٔ مقصد، نه وقتی مقاله از قبل به مقصد لینک دارد.
 * ترتیب نقشه یعنی اولویت. برای افزودن مقصد تازه فقط یک سطر به tj_il_map اضافه کن.
 */
function tj_il_map() {
	return array(
		array('نشخوار فکری', '/help/نشخوار-فکری/'),
		array('اهمال کاری', '/help/اهمال-کاری/'),
		array('اضطراب اجتماعی', '/help/اضطراب-اجتماعی/'),
		array('اضطراب مهاجرت', '/help/اضطراب-مهاجرت/'),
		array('سوگ مهاجرت', '/help/سوگ-مهاجرت/'),
		array('عزت نفس', '/help/عزت-نفس/'),
		array('بی خوابی', '/help/بی-خوابی/'),
		array('افسردگی', '/help/افسردگی/'),
		array('اضطراب', '/help/اضطراب/'),
		array('خیانت', '/help/خیانت/'),
		array('طلاق', '/help/طلاق-و-جدایی/'),
		array('سوگ', '/help/سوگ/'),
		array('زوج درمانی', '/therapy/couple-therapy/'),
		array('مشاوره پیش از ازدواج', '/therapy/premarital-counseling/'),
		array('گروه درمانی', '/therapy/group-therapy/'),
		array('روان درمانی تحلیلی', '/approaches/psychodynamic-therapy/'),
		array('روان پویشی', '/approaches/psychodynamic-therapy/'),
		array('سوپرویژن', '/how-to-become-a-therapist/supervision/'),
		array('زیگموند فروید', '/mag/زندگینامه-زیگموند-فروید/'),
		array('ژاک لکان', '/mag/زندگی-نامه-ژاک-لکان/'),
		array('کارل گستاو یونگ', '/mag/زندگی-نامه-کارل-گستاو-یونگ/'),
		array('روان پزشک', '/therapy/psychiatry/'),
	);
}
function tj_il_pat($ph) {
	$parts = preg_split('/[\s\x{200C}]+/u', $ph);
	$q = array();
	foreach ($parts as $p) { $q[] = preg_quote($p, '/'); }
	return '/(?<![\p{L}\p{M}\x{200C}])(' . implode('[\s\x{200C}]?', $q) . ')(?![\p{L}\p{M}])/u';
}
function tj_il_inject($content) {
	if (!is_singular('post') || !in_the_loop() || !is_main_query()) return $content;
	$self = rawurldecode((string) wp_parse_url(get_permalink(), PHP_URL_PATH));
	$todo = array();
	foreach (tj_il_map() as $m) {
		$path = $m[1];
		if ($path === $self) continue;
		$enc = implode('/', array_map('rawurlencode', explode('/', $path)));
		if (strpos($content, $path) !== false) continue;
		if (stripos($content, $enc) !== false) continue;
		$todo[] = array(tj_il_pat($m[0]), $path);
	}
	if (!$todo) return $content;
	$parts = preg_split('/(<[^>]+>)/u', $content, -1, PREG_SPLIT_DELIM_CAPTURE);
	if ($parts === false) return $content;
	$voids = array('br','img','hr','input','meta','link','source','wbr','col','area','embed','track','param');
	$skips = array('a','h1','h2','h3','h4','h5','h6','script','style','button','figcaption','code','pre','summary','label','select','textarea','svg');
	$stack = array(); $block = 0; $para = 0; $done = 0; $used = array();
	foreach ($parts as $i => $p) {
		if ($p === '') continue;
		if ($p[0] === '<') {
			if (!preg_match('/^<\s*(\/?)\s*([a-z0-9]+)/i', $p, $mm)) continue;
			$close = ($mm[1] === '/'); $tag = strtolower($mm[2]);
			if (in_array($tag, $voids, true) || substr($p, -2) === '/>') continue;
			if (!$close) {
				$skip = in_array($tag, $skips, true) || preg_match('/class=["\'][^"\']*(tj-cta|tjcv|tjx-cta|tjx-toc)/i', $p);
				$isP = in_array($tag, array('p','li'), true);
				$stack[] = array($tag, $skip, $isP);
				if ($skip) $block++;
				if ($isP) $para++;
			} else {
				for ($k = count($stack) - 1; $k >= 0; $k--) {
					if ($stack[$k][0] === $tag) {
						while (count($stack) > $k) { $e = array_pop($stack); if ($e[1]) $block--; if ($e[2]) $para--; }
						break;
					}
				}
			}
			continue;
		}
		if ($block > 0 || $para <= 0) continue;
		foreach ($todo as $t) {
			if (isset($used[$t[1]])) continue;
			if (preg_match($t[0], $p, $mm, PREG_OFFSET_CAPTURE)) {
				$off = $mm[1][1]; $txt = $mm[1][0];
				$p = substr($p, 0, $off) . '<a class="tj-il" href="' . esc_url(home_url($t[1])) . '">' . $txt . '</a>' . substr($p, $off + strlen($txt));
				$used[$t[1]] = 1; $done++;
				break;
			}
		}
		$parts[$i] = $p;
		if ($done >= 3) break;
	}
	return implode('', $parts);
}
add_filter('the_content', 'tj_il_inject', 20);