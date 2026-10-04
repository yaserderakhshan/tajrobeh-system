/* Tajrobeh: رتبه‌بندی جست‌وجوی کل سایت (گام G2، ۲ مهر ۱۴۰۵)
 * ۱. یکسان‌سازی ی و ک عربی در عبارت جست‌وجو
 * ۲. ترتیب: زندگی‌نامه‌ای که کلمه را دارد، عنوانی که با کلمه شروع می‌شود، عنوانی که کلمه را دارد، بقیه؛ در هر گروه تازه‌ترین اول
 */
add_action('pre_get_posts', function($q){
	if (is_admin() || !$q->is_main_query() || !$q->is_search()) return;
	$s = (string) $q->get('s');
	$n = str_replace(array('ي','ى','ك'), array('ی','ی','ک'), $s);
	if ($n !== $s) $q->set('s', $n);
}, 5);
add_filter('posts_search_orderby', function($orderby, $q){
	if (is_admin() || !$q->is_main_query() || !$q->is_search()) return $orderby;
	global $wpdb;
	$s = trim((string) $q->get('s'));
	if ($s === '') return $orderby;
	$t = $wpdb->posts . '.post_title';
	$like  = '%' . $wpdb->esc_like($s) . '%';
	$start = $wpdb->esc_like($s) . '%';
	$bio   = '%' . $wpdb->esc_like('زندگی') . '%' . $wpdb->esc_like('نامه') . '%';
	$pins  = array('فروید' => 'زیگموند', 'لکان' => 'ژاک', 'یونگ' => 'کارل');
	$pin   = '';
	foreach ($pins as $k => $v) { if (mb_strpos($s, $k) !== false) { $pin = '%' . $wpdb->esc_like($v) . '%'; break; } }
	$case = $wpdb->prepare("(CASE WHEN $t = %s THEN 0 WHEN $t LIKE %s AND $t LIKE %s THEN 1 WHEN $t LIKE %s THEN 2 WHEN $t LIKE %s THEN 3 ELSE 4 END) ASC", $s, $bio, $like, $start, $like);
	if ($pin !== '') $case .= $wpdb->prepare(", ($t LIKE %s) DESC", $pin);
	return $case . ", {$wpdb->posts}.post_date DESC";
}, 20, 2);