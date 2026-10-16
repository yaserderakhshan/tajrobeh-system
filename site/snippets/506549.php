/**
 * Tajrobeh — میز کار تجربه (tjws) v1 · ۲۴ مهر ۱۴۰۵
 * D72: موتور مجله روی سایت و بات خودمان؛ پلتفرم فقط ورود و فضای کار.
 * ۱) ورود با لینک امضاشدهٔ بات (?tw=&tr=&tx=&tk=) یا مدیر وردپرس؛ کوکی tjws.
 * ۲) /tj/v1/ws-sync  : بات داده‌ها را می‌فرستد (tjd_auth). مجموعه‌ها فقط از فهرست مجاز.
 * ۳) /tj/v1/ws-outbox: بات کارهای ثبت‌شده در میز را برمی‌دارد و پس از اجرا تأیید می‌کند (tjd_auth).
 * ۴) /tj/v1/ws-act   : کارهای کاربر میز (کوکی + توکن).
 * ۵) /desk/          : صفحهٔ میز کار، بدون کش و بدون ایندکس.
 * هیچ رمزی چاپ یا ثبت نمی‌شود. شناسهٔ تلگرام هرگز در خروجی صفحه نمی‌آید.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
if ( ! defined( 'TJWS_VER' ) ) { define( 'TJWS_VER', '1.0' ); }

function tjws_key() { return (string) get_option( 'tj_dir_key', '' ); }

function tjws_sets() {
	return array( 'mag_topics', 'mag_writers', 'ws_people', 'so_queue', 'so_calendar', 'so_links', 'so_dm', 'so_reels', 'ig_daily' );
}
/* هر حوزهٔ تازه بدون تغییر کد: نام مجموعه با پیشوند مجاز، حداکثر ۳۰۰۰ سطر و ۱.۵ مگابایت. */
function tjws_set_ok( $s ) {
	return is_string( $s ) && ( in_array( $s, tjws_sets(), true ) || preg_match( '/^(mag|ws|so|ig|ev|sc|mx)_[a-z0-9_]{1,40}$/', $s ) );
}
function tjws_get( $set ) {
	$v = get_option( 'tjws_set_' . $set, array() );
	return is_array( $v ) ? $v : array();
}
function tjws_at( $set ) { return (int) get_option( 'tjws_at_' . $set, 0 ); }

/* ───── هویت ───── */
function tjws_roles_all() { return array( 'مدیر', 'سردبیر', 'نویسنده', 'بازبین', 'سوشال' ); }

function tjws_sig( $w, $r, $x ) { return hash_hmac( 'sha256', 'ws|' . $w . '|' . $r . '|' . $x, tjws_key() ); }

function tjws_me() {
	if ( array_key_exists( 'tjws_me', $GLOBALS ) ) { return $GLOBALS['tjws_me']; }
	$me = false;
	$GLOBALS['tjws_me'] = false;
	if ( empty( $_COOKIE['tjws'] ) || tjws_key() === '' ) { return $me; }
	$p = explode( '.', (string) $_COOKIE['tjws'] );
	if ( count( $p ) !== 2 ) { return $me; }
	$d = json_decode( base64_decode( strtr( $p[0], '-_', '+/' ) ), true );
	if ( ! is_array( $d ) || empty( $d['w'] ) || empty( $d['x'] ) ) { return $me; }
	if ( (int) $d['x'] < time() ) { return $me; }
	$r = isset( $d['r'] ) ? (string) $d['r'] : '';
	if ( ! hash_equals( tjws_sig( $d['w'], $r, (int) $d['x'] ), (string) $p[1] ) ) { return $me; }
	$roles = array_values( array_filter( array_map( 'trim', explode( ',', $r ) ) ) );
	$name  = '';
	$pp    = tjws_get( 'ws_people' );
	foreach ( $pp as $row ) {
		if ( isset( $row['w'] ) && (string) $row['w'] === (string) $d['w'] ) {
			$name = isset( $row['name'] ) ? $row['name'] : '';
			if ( ! empty( $row['roles'] ) ) { $roles = array_values( array_unique( array_merge( $roles, (array) $row['roles'] ) ) ); }
			break;
		}
	}
	if ( $d['w'] === 'admin' ) { $name = 'مدیر'; }
	$me = array( 'w' => (string) $d['w'], 'roles' => $roles, 'name' => $name, 'sig' => (string) $p[1] );
	$GLOBALS['tjws_me'] = $me;
	return $me;
}
function tjws_can( $role ) {
	$me = tjws_me();
	if ( ! $me ) { return false; }
	return in_array( 'مدیر', $me['roles'], true ) || in_array( $role, $me['roles'], true );
}
function tjws_set_cookie( $w, $r, $x ) {
	$val = rtrim( strtr( base64_encode( wp_json_encode( array( 'w' => (string) $w, 'r' => (string) $r, 'x' => (int) $x ) ) ), '+/', '-_' ), '=' ) . '.' . tjws_sig( $w, $r, $x );
	setcookie( 'tjws', $val, array( 'expires' => (int) $x, 'path' => '/', 'secure' => is_ssl(), 'httponly' => true, 'samesite' => 'Lax' ) );
	$_COOKIE['tjws'] = $val;
	unset( $GLOBALS['tjws_me'] );
}
function tjws_csrf() {
	$me = tjws_me();
	return $me ? hash_hmac( 'sha256', 'csrf|' . $me['sig'], tjws_key() ) : '';
}

/* ───── مسیرهای REST ───── */
add_action( 'rest_api_init', function () {
	$bot = function ( $req ) { return function_exists( 'tjd_auth' ) ? tjd_auth( $req ) : false; };
	register_rest_route( 'tj/v1', '/ws-sync', array( 'methods' => 'POST', 'permission_callback' => $bot, 'callback' => 'tjws_sync' ) );
	register_rest_route( 'tj/v1', '/ws-outbox', array( 'methods' => 'POST', 'permission_callback' => $bot, 'callback' => 'tjws_outbox' ) );
	register_rest_route( 'tj/v1', '/ws-act', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => 'tjws_act' ) );
	register_rest_route( 'tj/v1', '/go-stats', array( 'methods' => 'POST', 'permission_callback' => $bot, 'callback' => 'tjws_go_stats' ) );
} );

/* شمار کلیک لینک‌های کوتاه /go/<نام>: فقط شمار روزانه، بی هیچ دادهٔ بازدیدکننده؛ ربات‌ها شمرده نمی‌شوند. */
add_action( 'init', function () {
	$path = trim( (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '', PHP_URL_PATH ), '/' );
	if ( strpos( $path, 'go/' ) !== 0 ) { return; }
	$slug = sanitize_title( substr( $path, 3 ) );
	if ( $slug === '' || strlen( $slug ) > 60 ) { return; }
	$ua = isset( $_SERVER['HTTP_USER_AGENT'] ) ? strtolower( (string) $_SERVER['HTTP_USER_AGENT'] ) : '';
	if ( $ua === '' || preg_match( '/bot|crawl|spider|preview|facebookexternalhit|telegram|whatsapp|curl|wget|python/', $ua ) ) { return; }
	$day = wp_date( 'Y-m-d' );
	$c   = get_option( 'tjws_go_clicks', array() );
	if ( ! is_array( $c ) ) { $c = array(); }
	if ( ! isset( $c[ $day ] ) ) {
		$c[ $day ] = array();
		if ( count( $c ) > 120 ) { ksort( $c ); $c = array_slice( $c, -120, null, true ); }
	}
	if ( ! isset( $c[ $day ][ $slug ] ) && count( $c[ $day ] ) >= 500 ) { return; }
	$c[ $day ][ $slug ] = isset( $c[ $day ][ $slug ] ) ? $c[ $day ][ $slug ] + 1 : 1;
	update_option( 'tjws_go_clicks', $c, false );
}, 1 );
function tjws_go_stats( WP_REST_Request $r ) {
	$d    = json_decode( $r->get_body(), true );
	$days = is_array( $d ) && ! empty( $d['days'] ) ? max( 1, min( 120, (int) $d['days'] ) ) : 90;
	$c    = get_option( 'tjws_go_clicks', array() );
	$from = wp_date( 'Y-m-d', time() - ( $days - 1 ) * DAY_IN_SECONDS );
	$out  = array();
	$tot  = array();
	foreach ( (array) $c as $day => $row ) {
		if ( $day < $from ) { continue; }
		foreach ( (array) $row as $slug => $n ) {
			$out[]        = array( 'day' => $day, 'slug' => $slug, 'clicks' => (int) $n );
			$tot[ $slug ] = ( isset( $tot[ $slug ] ) ? $tot[ $slug ] : 0 ) + (int) $n;
		}
	}
	$items = array();
	foreach ( $tot as $slug => $n ) { $items[] = array( 'slug' => $slug, 'clicks' => $n ); }
	return rest_ensure_response( array( 'ok' => true, 'items' => $items, 'daily' => $out, 'since' => $from ) );
}

function tjws_sync( WP_REST_Request $r ) {
	$d = json_decode( $r->get_body(), true );
	if ( ! is_array( $d ) || empty( $d['set'] ) || ! tjws_set_ok( $d['set'] ) ) {
		return new WP_Error( 'tjws_set', 'bad set', array( 'status' => 400 ) );
	}
	$rows = isset( $d['rows'] ) && is_array( $d['rows'] ) ? $d['rows'] : array();
	if ( count( $rows ) > 3000 || strlen( $r->get_body() ) > 1572864 ) {
		return new WP_Error( 'tjws_big', 'too big', array( 'status' => 413 ) );
	}
	update_option( 'tjws_set_' . $d['set'], $rows, false );
	update_option( 'tjws_at_' . $d['set'], time(), false );
	return rest_ensure_response( array( 'ok' => true, 'set' => $d['set'], 'n' => count( $rows ), 'v' => TJWS_VER ) );
}

function tjws_outbox_push( $act, $data ) {
	$me  = tjws_me();
	$box = get_option( 'tjws_outbox', array() );
	if ( ! is_array( $box ) ) { $box = array(); }
	$id    = 'A' . gmdate( 'ymdHis' ) . wp_rand( 100, 999 );
	$box[] = array( 'id' => $id, 'at' => time(), 'w' => $me ? $me['w'] : '', 'act' => $act, 'data' => $data, 'st' => 'new' );
	if ( count( $box ) > 400 ) { $box = array_slice( $box, -400 ); }
	update_option( 'tjws_outbox', $box, false );
	return $id;
}
function tjws_outbox( WP_REST_Request $r ) {
	$d   = json_decode( $r->get_body(), true );
	$op  = is_array( $d ) && isset( $d['op'] ) ? $d['op'] : 'pull';
	$box = get_option( 'tjws_outbox', array() );
	if ( ! is_array( $box ) ) { $box = array(); }
	if ( $op === 'ack' ) {
		$ids = isset( $d['ids'] ) ? (array) $d['ids'] : array();
		$res = isset( $d['res'] ) && is_array( $d['res'] ) ? $d['res'] : array();
		foreach ( $box as &$it ) {
			if ( in_array( $it['id'], $ids, true ) ) {
				$it['st']  = 'done';
				$it['res'] = isset( $res[ $it['id'] ] ) ? sanitize_text_field( $res[ $it['id'] ] ) : '';
			}
		}
		unset( $it );
		update_option( 'tjws_outbox', $box, false );
		return rest_ensure_response( array( 'ok' => true ) );
	}
	$new = array_values( array_filter( $box, function ( $it ) { return $it['st'] === 'new'; } ) );
	foreach ( $new as &$it ) {
		$dd        = isset( $it['data'] ) && is_array( $it['data'] ) ? $it['data'] : array();
		$it['key'] = ! empty( $dd['code'] ) ? (string) $dd['code'] : ( ! empty( $dd['post'] ) ? 'post-' . (int) $dd['post'] : $it['id'] );
		$it['by']  = array( 'w' => $it['w'], 'admin' => $it['w'] === 'admin' );
	}
	unset( $it );
	return rest_ensure_response( array( 'ok' => true, 'items' => $new, 'v' => TJWS_VER ) );
}

/* ───── پیش‌نویس‌ها ───── */
function tjws_posts( $args ) {
	$q = new WP_Query( array_merge( array( 'post_type' => 'post', 'post_status' => array( 'draft', 'pending', 'publish' ), 'posts_per_page' => 50, 'meta_key' => '_tjws_stage', 'no_found_rows' => true ), $args ) );
	return $q->posts;
}
function tjws_stages() {
	return array(
		'write'    => array( 'نوشتن', 'نویسنده' ),
		'editor'   => array( 'سردبیر', 'سردبیر' ),
		'clinical' => array( 'بازبینی بالینی', 'بازبین' ),
		'prep'     => array( 'آماده‌سازی و سئو', 'دستیار' ),
		'final'    => array( 'تأیید نهایی', 'مدیر' ),
		'publish'  => array( 'منتشر شد', '' ),
	);
}
function tjws_next( $stage, $who_is_me ) {
	$t = array(
		'write'    => $who_is_me ? 'متن را کامل کنید و «تحویل به سردبیر» را بزنید.' : 'نویسنده در حال نوشتن است.',
		'editor'   => 'سردبیر متن و تغییرها را می‌بیند و تصمیم می‌گیرد.',
		'clinical' => 'بازبین بالینی متن را می‌خواند و حکم می‌دهد.',
		'prep'     => 'بستهٔ سئو، تصویر و گیت انتشار آماده می‌شود.',
		'final'    => 'مدیر تأیید نهایی و انتشار را می‌زند.',
		'publish'  => 'منتشر شد؛ پخش و سنجش خودکار است.',
	);
	return isset( $t[ $stage ] ) ? $t[ $stage ] : '';
}
function tjws_can_post( $p ) {
	$me = tjws_me();
	if ( ! $me || ! $p ) { return false; }
	if ( tjws_can( 'سردبیر' ) ) { return true; }
	return (string) get_post_meta( $p->ID, '_tjws_w', true ) === $me['w'];
}
function tjws_ver_log( $pid, $label ) {
	$me   = tjws_me();
	$revs = wp_get_post_revisions( $pid, array( 'numberposts' => 1 ) );
	$rid  = $revs ? (int) key( $revs ) : 0;
	$log  = get_post_meta( $pid, '_tjws_versions', true );
	if ( ! is_array( $log ) ) { $log = array(); }
	$log[] = array( 'rev' => $rid, 'at' => time(), 'by' => $me ? ( $me['name'] ? $me['name'] : 'نویسنده' ) : '', 'label' => $label );
	update_post_meta( $pid, '_tjws_versions', $log );
}

/* ───── کارهای کاربر ───── */
function tjws_act( WP_REST_Request $r ) {
	$me = tjws_me();
	if ( ! $me ) { return new WP_Error( 'tjws_auth', 'login', array( 'status' => 403 ) ); }
	if ( ! hash_equals( tjws_csrf(), (string) $r->get_header( 'x_tjws' ) ) ) { return new WP_Error( 'tjws_csrf', 'csrf', array( 'status' => 403 ) ); }
	$d   = json_decode( $r->get_body(), true );
	$act = is_array( $d ) && isset( $d['act'] ) ? $d['act'] : '';

	if ( $act === 'take' ) {
		$code  = sanitize_text_field( $d['code'] );
		$weeks = max( 1, min( 6, (int) $d['weeks'] ) );
		$topic = null;
		foreach ( tjws_get( 'mag_topics' ) as $t ) { if ( isset( $t['code'] ) && $t['code'] === $code ) { $topic = $t; } }
		if ( ! $topic || $topic['status'] !== 'باز' ) { return new WP_Error( 'tjws_topic', 'این موضوع دیگر باز نیست', array( 'status' => 409 ) ); }
		$due = time() + $weeks * WEEK_IN_SECONDS;
		$pid = wp_insert_post( array( 'post_type' => 'post', 'post_status' => 'draft', 'post_title' => $topic['title'], 'post_content' => '', 'post_author' => (int) get_option( 'tjws_author', 1 ) ) );
		if ( is_wp_error( $pid ) ) { return $pid; }
		update_post_meta( $pid, '_tjws_code', $code );
		update_post_meta( $pid, '_tjws_w', $me['w'] );
		update_post_meta( $pid, '_tjws_wname', $me['name'] );
		update_post_meta( $pid, '_tjws_stage', 'write' );
		update_post_meta( $pid, '_tjws_due', $due );
		update_post_meta( $pid, '_tjws_brief', $topic );
		tjws_outbox_push( 'take', array( 'code' => $code, 'post' => $pid, 'due' => gmdate( 'Y-m-d', $due ) ) );
		return rest_ensure_response( array( 'ok' => true, 'post' => $pid ) );
	}
	if ( $act === 'propose' ) {
		$title = sanitize_text_field( $d['title'] );
		$angle = sanitize_textarea_field( $d['angle'] );
		if ( mb_strlen( $title ) < 6 ) { return new WP_Error( 'tjws_title', 'عنوان کوتاه است', array( 'status' => 400 ) ); }
		$near = tjws_near( $title . ' ' . $angle );
		$id   = tjws_outbox_push( 'propose', array( 'title' => $title, 'angle' => $angle, 'near' => $near ) );
		return rest_ensure_response( array( 'ok' => true, 'id' => $id, 'near' => $near ) );
	}
	if ( in_array( $act, array( 'save', 'submit' ), true ) ) {
		$p = get_post( (int) $d['post'] );
		if ( ! tjws_can_post( $p ) ) { return new WP_Error( 'tjws_post', 'no access', array( 'status' => 403 ) ); }
		$html = wp_kses_post( (string) $d['html'] );
		$args = array( 'ID' => $p->ID, 'post_content' => $html );
		if ( ! empty( $d['title'] ) ) { $args['post_title'] = sanitize_text_field( $d['title'] ); }
		if ( $act === 'save' ) {
			update_post_meta( $p->ID, '_tjws_buffer', array( 'title' => isset( $args['post_title'] ) ? $args['post_title'] : $p->post_title, 'html' => $html, 'at' => time() ) );
			if ( ! empty( $d['version'] ) ) { wp_update_post( $args ); delete_post_meta( $p->ID, '_tjws_buffer' ); tjws_ver_log( $p->ID, 'نسخهٔ دستی' ); }
			return rest_ensure_response( array( 'ok' => true, 'at' => time() ) );
		}
		wp_update_post( $args );
		delete_post_meta( $p->ID, '_tjws_buffer' );
		$editor = tjws_can( 'سردبیر' ) && (string) get_post_meta( $p->ID, '_tjws_w', true ) !== $me['w'];
		tjws_ver_log( $p->ID, $editor ? 'سردبیر' : 'تحویل نویسنده' );
		if ( ! $editor ) {
			update_post_meta( $p->ID, '_tjws_stage', 'editor' );
			update_post_meta( $p->ID, '_tjws_sub_at', time() );
			tjws_outbox_push( 'submitted', array( 'post' => $p->ID, 'code' => get_post_meta( $p->ID, '_tjws_code', true ), 'title' => get_the_title( $p ) ) );
		}
		return rest_ensure_response( array( 'ok' => true ) );
	}
	if ( $act === 'decide' ) {
		if ( ! tjws_can( 'سردبیر' ) ) { return new WP_Error( 'tjws_role', 'editor only', array( 'status' => 403 ) ); }
		$p   = get_post( (int) $d['post'] );
		$dec = in_array( $d['dec'], array( 'clinical', 'return' ), true ) ? $d['dec'] : '';
		if ( ! $p || ! $dec ) { return new WP_Error( 'tjws_dec', 'bad', array( 'status' => 400 ) ); }
		$note = sanitize_textarea_field( isset( $d['note'] ) ? $d['note'] : '' );
		update_post_meta( $p->ID, '_tjws_stage', $dec === 'clinical' ? 'clinical' : 'write' );
		if ( $note ) { update_post_meta( $p->ID, '_tjws_note', array( 'by' => 'سردبیر', 'at' => time(), 'text' => $note ) ); }
		tjws_outbox_push( $dec === 'clinical' ? 'to_clinical' : 'returned', array( 'post' => $p->ID, 'code' => get_post_meta( $p->ID, '_tjws_code', true ), 'title' => get_the_title( $p ), 'note' => $note ) );
		return rest_ensure_response( array( 'ok' => true ) );
	}
	return new WP_Error( 'tjws_act', 'unknown', array( 'status' => 400 ) );
}

/* هم‌پوشانی ساده با استخر و مطالب سایت (بدون جمنای تا اکشن gem_seo بیاید) */
function tjws_words( $s ) {
	$s = preg_replace( '/[^\p{L}\p{N}\s]/u', ' ', mb_strtolower( $s ) );
	$stop = array( 'و', 'در', 'به', 'از', 'که', 'با', 'را', 'این', 'آن', 'برای', 'چه', 'چطور', 'یک', 'است', 'می', 'های', 'ها', 'تا', 'یا' );
	return array_values( array_diff( array_filter( preg_split( '/\s+/u', $s ), function ( $w ) { return mb_strlen( $w ) > 2; } ), $stop ) );
}
function tjws_near( $text ) {
	$a = tjws_words( $text );
	if ( ! $a ) { return array(); }
	$best = array();
	foreach ( tjws_get( 'mag_topics' ) as $t ) {
		$b = tjws_words( $t['title'] . ' ' . ( isset( $t['kw'] ) ? $t['kw'] : '' ) );
		$n = count( array_intersect( $a, $b ) );
		if ( $n >= 2 ) { $best[] = array( 'code' => $t['code'], 'title' => $t['title'], 'n' => $n ); }
	}
	usort( $best, function ( $x, $y ) { return $y['n'] - $x['n']; } );
	$site = get_posts( array( 's' => implode( ' ', array_slice( $a, 0, 3 ) ), 'post_type' => 'post', 'post_status' => 'publish', 'numberposts' => 2 ) );
	$out  = array( 'pool' => array_slice( $best, 0, 2 ), 'site' => array() );
	foreach ( $site as $s ) { $out['site'][] = array( 'title' => get_the_title( $s ), 'url' => get_permalink( $s ) ); }
	return $out;
}

/* ───── صفحهٔ میز ───── */
add_action( 'template_redirect', function () {
	$path = trim( (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '', PHP_URL_PATH ), '/' );
	if ( $path !== 'desk' ) { return; }
	if ( ! defined( 'DONOTCACHEPAGE' ) ) { define( 'DONOTCACHEPAGE', true ); }
	nocache_headers();
	header( 'X-Robots-Tag: noindex, nofollow' );
	if ( isset( $_GET['tw'], $_GET['tr'], $_GET['tx'], $_GET['tk'] ) ) {
		$w = sanitize_text_field( wp_unslash( $_GET['tw'] ) );
		$rr = sanitize_text_field( wp_unslash( $_GET['tr'] ) );
		$x = (int) $_GET['tx'];
		if ( $x > time() && tjws_key() !== '' && hash_equals( tjws_sig( $w, $rr, $x ), (string) $_GET['tk'] ) ) {
			tjws_set_cookie( $w, $rr, $x );
		}
		wp_safe_redirect( home_url( '/desk/' ) );
		exit;
	}
	if ( ! tjws_me() && current_user_can( 'manage_options' ) ) {
		tjws_set_cookie( 'admin', implode( ',', tjws_roles_all() ), time() + 30 * DAY_IN_SECONDS );
	}
	if ( ! tjws_me() ) { return; }
	status_header( 200 );
	tjws_render();
	exit;
}, 0 );
add_filter( 'wpseo_exclude_from_sitemap_by_post_ids', function ( $ids ) {
	$p = get_page_by_path( 'desk' );
	if ( $p ) { $ids[] = $p->ID; }
	return $ids;
} );

/* ───── نمایش ───── */
function tjws_e( $s ) { return esc_html( (string) $s ); }
function tjws_fa( $s ) { return strtr( (string) $s, array( '0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹' ) ); }
function tjws_jdate( $ts ) {
	if ( ! $ts ) { return ''; }
	if ( class_exists( 'IntlDateFormatter' ) ) {
		$f = new IntlDateFormatter( 'fa_IR@calendar=persian', IntlDateFormatter::LONG, IntlDateFormatter::NONE, 'Asia/Tehran', IntlDateFormatter::TRADITIONAL, 'd MMMM' );
		$o = $f->format( (int) $ts );
		if ( $o ) { return $o; }
	}
	return tjws_fa( gmdate( 'Y-m-d', (int) $ts ) );
}
function tjws_days( $ts ) { return max( 0, (int) floor( ( time() - (int) $ts ) / DAY_IN_SECONDS ) ); }
function tjws_url( $q = array() ) { return esc_url( add_query_arg( $q, home_url( '/desk/' ) ) ); }

function tjws_stage_of_writer_row( $st ) {
	if ( $st === 'منتشر شد' ) { return 'publish'; }
	if ( $st === 'تحویل شد' || $st === 'در انتظار سردبیر' ) { return 'editor'; }
	return 'write';
}
function tjws_stepper( $stage ) {
	$keys = array_keys( tjws_stages() );
	$i    = array_search( $stage, $keys, true );
	$h    = '<div class="stp">';
	foreach ( tjws_stages() as $k => $v ) {
		$j   = array_search( $k, $keys, true );
		$cls = $j < $i ? 'd' : ( $j === $i ? 'c' : '' );
		$h  .= '<div class="s ' . $cls . '"><i>' . ( $j < $i ? '✓' : tjws_fa( $j + 1 ) ) . '</i>' . tjws_e( $v[0] ) . '</div>';
	}
	return $h . '</div>';
}
function tjws_card( $a ) {
	$h  = '<div class="card"><div class="ch"><span class="code">' . tjws_e( $a['code'] ) . '</span>';
	if ( ! empty( $a['due'] ) ) { $h .= '<span class="due">تحویل ' . tjws_e( tjws_jdate( $a['due'] ) ) . '</span>'; }
	$h .= '</div><b class="tt">' . tjws_e( $a['title'] ) . '</b>' . tjws_stepper( $a['stage'] );
	$h .= '<p class="next"><span>قدم بعدی</span>' . tjws_e( $a['next'] ) . '</p>';
	if ( ! empty( $a['note'] ) ) { $h .= '<p class="note">«' . tjws_e( $a['note'] ) . '» سردبیر</p>'; }
	if ( ! empty( $a['btn'] ) ) { $h .= '<div class="acts">' . $a['btn'] . '</div>'; }
	return $h . '</div>';
}

function tjws_mine() {
	$me  = tjws_me();
	$out = array();
	$seen = array();
	foreach ( tjws_posts( array( 'meta_query' => array( array( 'key' => '_tjws_w', 'value' => $me['w'] ) ) ) ) as $p ) {
		$st    = get_post_meta( $p->ID, '_tjws_stage', true );
		$code  = get_post_meta( $p->ID, '_tjws_code', true );
		$seen[ $code ] = 1;
		$note  = get_post_meta( $p->ID, '_tjws_note', true );
		$btn   = $st === 'write' ? '<a class="btn ink" href="' . tjws_url( array( 'v' => 'write', 'id' => $p->ID ) ) . '">باز کردن متن</a>' : '<a class="btn line" href="' . tjws_url( array( 'v' => 'compare', 'id' => $p->ID ) ) . '">نسخه‌ها</a>';
		$out[] = array( 'code' => $code, 'title' => get_the_title( $p ), 'stage' => $st, 'due' => get_post_meta( $p->ID, '_tjws_due', true ), 'next' => tjws_next( $st, true ), 'note' => ( $st === 'write' && is_array( $note ) ) ? $note['text'] : '', 'btn' => $btn );
	}
	foreach ( tjws_get( 'mag_writers' ) as $r ) {
		if ( (string) ( isset( $r['w'] ) ? $r['w'] : '' ) !== $me['w'] ) { continue; }
		if ( isset( $seen[ $r['topic_code'] ] ) ) { continue; }
		$st    = tjws_stage_of_writer_row( $r['status'] );
		$out[] = array( 'code' => $r['topic_code'] ? $r['topic_code'] : $r['code'], 'title' => $r['topic'], 'stage' => $st, 'due' => ! empty( $r['due'] ) ? strtotime( $r['due'] ) : 0, 'next' => tjws_next( $st, true ), 'note' => '', 'btn' => '' );
	}
	return $out;
}

function tjws_render() {
	$me = tjws_me();
	$v  = isset( $_GET['v'] ) ? sanitize_key( $_GET['v'] ) : 'home';
	echo '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>میز کار تجربه</title><style>' . tjws_css() . '</style></head><body>';
	if ( ! $me ) {
		echo '<main class="gate"><div class="gcard"><span class="mark">ت</span><h1>میز کار تجربه</h1><p>ورود با لینک شخصی شماست. اگر لینک ندارید یا تاریخش گذشته، از سردبیر مجله بخواهید لینک تازه بفرستد.</p></div></main></body></html>';
		return;
	}
	$isEd = tjws_can( 'سردبیر' );
	$nav  = array( 'home' => 'کارهای من', 'pool' => 'استخر مطالب' );
	if ( $isEd ) { $nav['editor'] = 'میز سردبیر'; $nav['flow'] = 'روند همهٔ مطالب'; }
	$wait = 0;
	if ( $isEd ) { $wait = count( tjws_posts( array( 'meta_value' => 'editor' ) ) ) + count( array_filter( tjws_get( 'mag_writers' ), function ( $r ) { return tjws_stage_of_writer_row( $r['status'] ) === 'editor'; } ) ); }
	echo '<div class="app"><aside class="side"><div class="brand"><span class="mark">ت</span>میز کار تجربه</div><p class="grp">مجله</p>';
	foreach ( $nav as $k => $t ) {
		$n = $k === 'editor' && $wait ? '<span class="n red">' . tjws_fa( $wait ) . '</span>' : '';
		$on = ( $v === $k || ( $k === 'home' && in_array( $v, array( 'write', 'compare' ), true ) ) || ( $k === 'editor' && $v === 'review' ) ) ? ' on' : '';
		echo '<a class="nav' . $on . '" href="' . tjws_url( array( 'v' => $k ) ) . '">' . tjws_e( $t ) . $n . '</a>';
	}
	echo '<div class="grow"></div><div class="who"><b>' . tjws_e( $me['name'] ? $me['name'] : 'شما' ) . '</b><span>' . tjws_e( implode( '، ', $me['roles'] ) ) . '</span></div></aside><main class="main">';
	if ( $v === 'pool' ) { tjws_v_pool(); }
	elseif ( $v === 'write' ) { tjws_v_write(); }
	elseif ( $v === 'compare' || $v === 'review' ) { tjws_v_compare( $v === 'review' ); }
	elseif ( $v === 'editor' && $isEd ) { tjws_v_editor(); }
	elseif ( $v === 'flow' && $isEd ) { tjws_v_flow(); }
	else { tjws_v_home( $isEd, $wait ); }
	echo '</main></div><script>window.TJWS={u:' . wp_json_encode( esc_url_raw( rest_url( 'tj/v1/ws-act' ) ) ) . ',t:' . wp_json_encode( tjws_csrf() ) . ',d:' . wp_json_encode( home_url( '/desk/' ) ) . '};' . tjws_js() . '</script></body></html>';
}

function tjws_v_home( $isEd, $wait ) {
	$mine = tjws_mine();
	echo '<header class="head"><div><p class="sub">' . tjws_e( tjws_jdate( time() ) ) . '</p><h1>کارهای من</h1></div><a class="btn line" href="' . tjws_url( array( 'v' => 'pool' ) ) . '">استخر مطالب</a></header>';
	if ( $isEd && $wait ) { echo '<a class="alert" href="' . tjws_url( array( 'v' => 'editor' ) ) . '"><b>' . tjws_fa( $wait ) . ' متن منتظر شماست</b><span>میز سردبیر</span></a>'; }
	if ( ! $mine ) { echo '<div class="empty"><b>هنوز مطلبی برنداشته‌اید</b><p>از استخر مطالب یک موضوع بردارید یا موضوع خودتان را پیشنهاد دهید.</p><a class="btn ink" href="' . tjws_url( array( 'v' => 'pool' ) ) . '">استخر مطالب</a></div>'; return; }
	echo '<div class="cards">';
	foreach ( $mine as $a ) { echo tjws_card( $a ); }
	echo '</div>';
}

function tjws_v_pool() {
	$f     = isset( $_GET['f'] ) ? sanitize_text_field( wp_unslash( $_GET['f'] ) ) : '';
	$rows  = tjws_get( 'mag_topics' );
	usort( $rows, function ( $a, $b ) { return (int) $a['sort'] - (int) $b['sort']; } );
	$chips = array( '' => 'همه', 'دیاسپورا' => 'مهاجرت', 'مسئله' => 'مسئله‌محور', 'مدرسه' => 'مدرسه' );
	$open  = count( array_filter( $rows, function ( $t ) { return $t['status'] === 'باز'; } ) );
	echo '<header class="head"><div><p class="sub">' . tjws_fa( $open ) . ' موضوع باز</p><h1>استخر مطالب</h1></div><a class="btn line" href="#propose">موضوع خودم را پیشنهاد می‌دهم</a></header><div class="chips">';
	foreach ( $chips as $k => $t ) { echo '<a class="chip' . ( $f === $k ? ' on' : '' ) . '" href="' . tjws_url( array( 'v' => 'pool', 'f' => $k ) ) . '">' . tjws_e( $t ) . '</a>'; }
	echo '</div><div class="pool">';
	foreach ( $rows as $t ) {
		if ( $t['status'] === 'بسته' ) { continue; }
		if ( $f !== '' && mb_strpos( $t['cat'], $f ) === false ) { continue; }
		$open1 = $t['status'] === 'باز';
		echo '<details class="pc' . ( $open1 ? '' : ' taken' ) . '"><summary><span class="code">' . tjws_e( $t['code'] ) . '</span><b>' . tjws_e( $t['title'] ) . '</b><span class="facts">';
		if ( ! empty( $t['words'] ) ) { echo '<span>' . tjws_e( tjws_fa( $t['words'] ) ) . ' واژه</span>'; }
		if ( ! empty( $t['table'] ) && mb_strpos( $t['table'], 'بله' ) === 0 ) { echo '<span>جدول</span>'; }
		if ( ! empty( $t['video'] ) && mb_strpos( $t['video'], 'بله' ) === 0 ) { echo '<span>ویدیو</span>'; }
		echo '<span>' . tjws_e( $open1 ? 'موج ' . tjws_fa( $t['wave'] ) : ( $t['status'] === 'منتشر شد' ? 'منتشر شد' : 'برداشته شد' ) ) . '</span></span></summary>';
		echo '<div class="pd"><p>' . tjws_e( $t['angle'] ) . '</p><div class="brief">';
		echo '<div><span>کلیدواژهٔ اصلی</span><span>' . tjws_e( $t['kw'] ) . '</span></div>';
		if ( ! empty( $t['table'] ) && mb_strpos( $t['table'], 'بله' ) === 0 ) { echo '<div><span>جدول</span><span>' . tjws_e( trim( preg_replace( '/^بله\s*·?\s*/u', '', $t['table'] ) ) ) . '</span></div>'; }
		echo '</div>';
		if ( $open1 ) {
			echo '<p class="lab">کی تحویل می‌دهید؟</p><div class="chips wk" data-code="' . esc_attr( $t['code'] ) . '"><span class="chip" data-w="2">۲ هفته</span><span class="chip on" data-w="3">۳ هفته</span><span class="chip" data-w="4">۴ هفته</span></div><button class="btn ink" data-take="' . esc_attr( $t['code'] ) . '">برمی‌دارم</button>';
		}
		echo '</div></details>';
	}
	echo '</div><section class="box" id="propose"><h2>موضوع خودم</h2><label>عنوان<input id="pt" maxlength="120"></label><label>زاویه در یک جمله<textarea id="pa" rows="2" maxlength="300"></textarea></label><div id="pnear"></div><button class="btn ink" id="psend">بفرست برای سردبیر</button></section>';
}


function tjws_v_editor() {
	echo '<header class="head"><div><p class="sub">مجله</p><h1>میز سردبیر</h1></div><a class="btn line" href="' . tjws_url( array( 'v' => 'flow' ) ) . '">روند همهٔ مطالب</a></header><div class="list">';
	$items = array();
	foreach ( tjws_posts( array( 'meta_value' => 'editor' ) ) as $p ) {
		$items[] = array( 'd' => tjws_days( get_post_meta( $p->ID, '_tjws_sub_at', true ) ), 'code' => get_post_meta( $p->ID, '_tjws_code', true ), 'title' => get_the_title( $p ), 'who' => get_post_meta( $p->ID, '_tjws_wname', true ), 'href' => tjws_url( array( 'v' => 'review', 'id' => $p->ID ) ), 'src' => 'میز' );
	}
	foreach ( tjws_get( 'mag_writers' ) as $r ) {
		if ( tjws_stage_of_writer_row( $r['status'] ) !== 'editor' ) { continue; }
		$items[] = array( 'd' => ! empty( $r['at'] ) ? tjws_days( strtotime( $r['at'] ) ) : 0, 'code' => $r['topic_code'] ? $r['topic_code'] : $r['code'], 'title' => $r['topic'], 'who' => $r['name'], 'href' => '', 'src' => 'بات' );
	}
	usort( $items, function ( $a, $b ) { return $b['d'] - $a['d']; } );
	if ( ! $items ) { echo '<div class="empty"><b>متنی منتظر شما نیست</b></div>'; }
	foreach ( $items as $it ) {
		$tone = $it['d'] >= 10 ? 'red' : ( $it['d'] >= 4 ? 'warn' : 'n' );
		$tag  = $it['href'] ? 'a href="' . $it['href'] . '"' : 'div';
		echo '<' . $tag . ' class="row"><span class="tx"><b>' . tjws_e( $it['title'] ) . '</b><small>' . tjws_e( $it['code'] . '، ' . $it['who'] . ( $it['href'] ? '' : '، تحویل در بات' ) ) . '</small></span><span class="badge ' . $tone . '">' . ( $it['d'] ? tjws_fa( $it['d'] ) . ' روز' : 'امروز' ) . '</span></' . ( $it['href'] ? 'a' : 'div' ) . '>';
	}
	echo '</div>';
}

function tjws_v_flow() {
	$cols = array();
	foreach ( tjws_stages() as $k => $s ) { $cols[ $k ] = array(); }
	foreach ( tjws_posts( array() ) as $p ) {
		$st = get_post_meta( $p->ID, '_tjws_stage', true );
		if ( isset( $cols[ $st ] ) ) { $cols[ $st ][] = array( get_post_meta( $p->ID, '_tjws_code', true ), get_the_title( $p ), get_post_meta( $p->ID, '_tjws_wname', true ) ); }
	}
	foreach ( tjws_get( 'mag_writers' ) as $r ) {
		$st = tjws_stage_of_writer_row( $r['status'] );
		$cols[ $st ][] = array( $r['topic_code'] ? $r['topic_code'] : $r['code'], $r['topic'], $r['name'] );
	}
	echo '<header class="head"><div><p class="sub">مجله</p><h1>روند همهٔ مطالب</h1></div></header><div class="kb">';
	foreach ( tjws_stages() as $k => $s ) {
		echo '<div class="col"><div class="h"><b>' . tjws_e( $s[0] ) . '</b><span>' . tjws_fa( count( $cols[ $k ] ) ) . '</span></div>' . ( $s[1] ? '<small class="own">با ' . tjws_e( $s[1] ) . '</small>' : '' );
		foreach ( $cols[ $k ] as $c ) { echo '<div class="ac"><span class="code">' . tjws_e( $c[0] ) . '</span><b>' . tjws_e( $c[1] ) . '</b><small>' . tjws_e( $c[2] ) . '</small></div>'; }
		echo '</div>';
	}
	echo '</div>';
}

function tjws_brief_checks( $brief ) {
	return array( 'kw' => isset( $brief['kw'] ) ? $brief['kw'] : '', 'words' => isset( $brief['words'] ) ? (int) preg_replace( '/\D/', '', strtr( $brief['words'], array_flip( array( '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' ) ) ) ) : 0, 'table' => isset( $brief['table'] ) ? mb_strpos( $brief['table'], 'بله' ) === 0 : false );
}

function tjws_v_write() {
	$p = get_post( isset( $_GET['id'] ) ? (int) $_GET['id'] : 0 );
	if ( ! tjws_can_post( $p ) ) { echo '<div class="empty"><b>این متن در دسترس شما نیست</b></div>'; return; }
	$buf   = get_post_meta( $p->ID, '_tjws_buffer', true );
	$title = is_array( $buf ) ? $buf['title'] : $p->post_title;
	$html  = is_array( $buf ) ? $buf['html'] : $p->post_content;
	$brief = get_post_meta( $p->ID, '_tjws_brief', true );
	$chk   = tjws_brief_checks( is_array( $brief ) ? $brief : array() );
	$note  = get_post_meta( $p->ID, '_tjws_note', true );
	$st    = get_post_meta( $p->ID, '_tjws_stage', true );
	echo '<header class="head"><div><p class="sub">' . tjws_e( get_post_meta( $p->ID, '_tjws_code', true ) ) . '، تحویل ' . tjws_e( tjws_jdate( get_post_meta( $p->ID, '_tjws_due', true ) ) ) . '</p><h1>میز تحریریه</h1></div><div class="hb"><span class="saved" id="saved">' . ( is_array( $buf ) ? 'ذخیره شد' : '' ) . '</span><a class="btn line" href="' . tjws_url( array( 'v' => 'compare', 'id' => $p->ID ) ) . '">نسخه‌ها</a><button class="btn line" id="ver">ذخیرهٔ نسخه</button>' . ( $st === 'write' || tjws_can( 'سردبیر' ) ? '<button class="btn ink" id="sub">' . ( $st === 'write' ? 'تحویل به سردبیر' : 'ثبت ویرایش سردبیر' ) . '</button>' : '' ) . '</div></header>';
	if ( $st === 'write' && is_array( $note ) ) { echo '<p class="note big">«' . tjws_e( $note['text'] ) . '» سردبیر</p>'; }
	echo '<div class="ed"><div class="colm"><div class="tbar"><button data-c="bold"><b>B</b></button><button data-c="h2">تیتر</button><button data-c="p">متن</button><button data-c="ul">فهرست</button><button data-c="link">لینک</button><button data-c="table">جدول</button></div>';
	echo '<article class="doc" data-post="' . (int) $p->ID . '" data-kw="' . esc_attr( $chk['kw'] ) . '" data-words="' . (int) $chk['words'] . '" data-table="' . ( $chk['table'] ? 1 : 0 ) . '"><input id="ttl" value="' . esc_attr( $title ) . '" aria-label="عنوان"><div id="doc" contenteditable="true">' . ( $html ? $html : '<p><br></p>' ) . '</div></article></div>';
	echo '<div class="rail"><div class="box"><div class="bh"><b>بریف موضوع</b></div><div class="brief">';
	echo '<div><span>کلیدواژهٔ اصلی</span><span>' . tjws_e( $chk['kw'] ) . '</span></div><div><span>طول</span><span id="wc"></span></div><div><span>جدول</span><span id="tb"></span></div></div><div class="pgb"><i id="pg"></i></div></div>';
	echo '<div class="box"><div class="bh"><b>پیش از تحویل</b><span>خودکار</span></div><div id="chk"></div></div></div></div>';
}

function tjws_text_lines( $html ) {
	$t = preg_replace( '#</(p|h[1-6]|li|tr|div)>|<br\s*/?>#i', "\n", (string) $html );
	$t = wp_strip_all_tags( $t );
	$t = html_entity_decode( $t, ENT_QUOTES, 'UTF-8' );
	return trim( preg_replace( "/\n{2,}/", "\n", $t ) );
}
function tjws_v_compare( $review ) {
	$p = get_post( isset( $_GET['id'] ) ? (int) $_GET['id'] : 0 );
	if ( ! tjws_can_post( $p ) ) { echo '<div class="empty"><b>این متن در دسترس شما نیست</b></div>'; return; }
	$log = get_post_meta( $p->ID, '_tjws_versions', true );
	$log = is_array( $log ) ? array_values( array_filter( $log, function ( $l ) { return ! empty( $l['rev'] ); } ) ) : array();
	$n   = count( $log );
	$b   = isset( $_GET['rb'] ) ? (int) $_GET['rb'] : ( $n ? $log[ $n - 1 ]['rev'] : 0 );
	$a   = isset( $_GET['ra'] ) ? (int) $_GET['ra'] : ( $n > 1 ? $log[ $n - 2 ]['rev'] : 0 );
	$ra  = $a ? get_post( $a ) : null;
	$rb  = $b ? get_post( $b ) : $p;
	echo '<header class="head"><div><p class="sub">' . tjws_e( get_post_meta( $p->ID, '_tjws_code', true ) . '، ' . get_post_meta( $p->ID, '_tjws_wname', true ) ) . '</p><h1>' . tjws_e( $review ? get_the_title( $p ) : 'مقایسهٔ نسخه‌ها' ) . '</h1></div><a class="btn line" href="' . tjws_url( array( 'v' => 'write', 'id' => $p->ID ) ) . '">' . ( $review ? 'ویرایش خودم' : 'برگشت به متن' ) . '</a></header>';
	if ( $n ) {
		echo '<div class="vstrip">';
		foreach ( $log as $i => $l ) {
			$cls = (int) $l['rev'] === $b ? ' on' : ( (int) $l['rev'] === $a ? ' cmp' : '' );
			echo '<a class="' . trim( $cls ) . '" href="' . tjws_url( array( 'v' => $review ? 'review' : 'compare', 'id' => $p->ID, 'ra' => $b, 'rb' => (int) $l['rev'] ) ) . '">نسخهٔ ' . tjws_fa( $i + 1 ) . '<em>' . tjws_e( $l['label'] . '، ' . tjws_jdate( $l['at'] ) ) . '</em></a>';
		}
		echo '</div>';
	}
	echo '<div class="ed"><div class="colm"><article class="doc dif">';
	if ( $ra && $rb ) {
		$d = wp_text_diff( tjws_text_lines( $ra->post_content ), tjws_text_lines( $rb->post_content ), array( 'show_split_view' => false ) );
		echo $d ? $d : '<p class="sub">این دو نسخه فرقی ندارند.</p>';
	} else {
		echo '<h2>' . tjws_e( get_the_title( $p ) ) . '</h2>' . wp_kses_post( $rb->post_content );
	}
	echo '</article></div><div class="rail">';
	if ( $review && tjws_can( 'سردبیر' ) ) {
		echo '<div class="box"><div class="bh"><b>تصمیم شما</b></div><div class="dec"><label class="o"><input type="radio" name="dec" value="clinical" checked><span>خوب است، برود برای بازبینی بالینی</span></label><label class="o"><input type="radio" name="dec" value="return"><span>برگردد با یادداشت</span></label></div><textarea id="dnote" rows="3" placeholder="یادداشت برای نویسنده"></textarea><button class="btn ink block" id="dsend" data-post="' . (int) $p->ID . '">ثبت</button></div>';
	}
	echo '<div class="box"><div class="bh"><b>در این نسخه</b></div><div class="brief"><div><span>نسخه‌ها</span><span>' . tjws_fa( $n ) . '</span></div><div><span>مرحله</span><span>' . tjws_e( tjws_stages()[ get_post_meta( $p->ID, '_tjws_stage', true ) ][0] ) . '</span></div></div></div></div></div>';
}

function tjws_css() {
	$f = esc_url( content_url( '/uploads/fonts/anjoman-max-regular.woff2' ) );
	return '@font-face{font-family:AnjomanMax;src:url(' . $f . ') format("woff2");font-weight:100 900;font-display:swap}'
	. ':root{--red:#c83f49;--red50:#faeced;--ink:#0e0e0e;--soft:#4e4e4e;--mut:#676768;--line:#dfdfe2;--sunk:#f5f5f8;--paper:#fff;--ok:#2f7d4f;--ok50:#e9f5ee;--warn:#9a6b00;--warn50:#fdf5e1}'
	. '*{box-sizing:border-box}html,body{margin:0;background:var(--sunk);color:var(--ink);font-family:AnjomanMax,Tahoma,sans-serif;font-variation-settings:"slnt" 0;font-size:15px;line-height:1.8}'
	. 'a{color:inherit;text-decoration:none}button{font:inherit;cursor:pointer}'
	. '.app{display:flex;min-height:100vh}.side{width:240px;flex:none;background:var(--paper);box-shadow:inset -1px 0 0 var(--line);padding:24px 14px;display:flex;flex-direction:column;gap:4px;position:sticky;top:0;height:100vh}'
	. '.brand{display:flex;align-items:center;gap:10px;font-size:17px;padding:0 8px 16px}.mark{width:32px;height:32px;border-radius:10px;background:var(--red50);color:var(--red);display:inline-flex;align-items:center;justify-content:center}'
	. '.grp{font-size:12px;color:var(--mut);margin:8px 10px 2px}.nav{display:flex;align-items:center;height:42px;padding-inline:12px;border-radius:12px;color:var(--soft)}.nav.on{background:var(--sunk);color:var(--ink)}'
	. '.n{margin-inline-start:auto;font-size:12px;min-width:22px;height:22px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;padding-inline:6px;background:var(--sunk)}.n.red{background:var(--red);color:#fff}'
	. '.grow{flex:1}.who{padding:10px;display:flex;flex-direction:column;font-size:14px}.who span{font-size:12px;color:var(--mut)}'
	. '.main{flex:1;min-width:0;padding:28px 32px 60px;display:flex;flex-direction:column;gap:18px}'
	. '.head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}.head h1{margin:0;font-size:28px;font-weight:400}.sub{margin:0;font-size:13px;color:var(--mut)}.hb{display:flex;gap:8px;align-items:center;flex-wrap:wrap}'
	. '.btn{height:42px;padding-inline:18px;border-radius:999px;border:0;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:14px;white-space:nowrap}.btn.ink{background:var(--ink);color:#fff}.btn.line{background:var(--paper);box-shadow:inset 0 0 0 1px var(--line)}.btn.block{width:100%;margin-top:10px}.btn[disabled]{opacity:.4}'
	. '.saved{font-size:12px;color:var(--mut)}'
	. '.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px}.card,.box,.empty{background:var(--paper);border-radius:22px;box-shadow:inset 0 0 0 1px rgba(223,223,226,.7);padding:18px 20px}'
	. '.ch{display:flex;justify-content:space-between;font-size:12px;color:var(--mut)}.tt{display:block;font-weight:400;font-size:17px;margin:4px 0 10px}.code{font-size:12px;color:var(--mut);direction:ltr;unicode-bidi:isolate}'
	. '.stp{display:flex;margin:6px 0 4px}.stp .s{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:var(--mut);position:relative;text-align:center}'
	. '.stp .s i{width:24px;height:24px;border-radius:50%;background:var(--paper);box-shadow:inset 0 0 0 1.5px var(--line);display:flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;position:relative;z-index:1}'
	. '.stp .s:before{content:"";position:absolute;top:12px;left:50%;width:100%;height:1.5px;background:var(--line)}.stp .s:first-child:before{display:none}'
	. '.stp .s.d i{background:var(--ink);color:#fff;box-shadow:none}.stp .s.d:before,.stp .s.c:before{background:var(--ink)}.stp .s.c i{background:var(--red);color:#fff;box-shadow:0 0 0 4px var(--red50)}.stp .s.c{color:var(--ink)}'
	. '.next{margin:10px 0 0;font-size:14px;display:flex;gap:8px;align-items:baseline}.next span{font-size:11px;color:var(--red);background:var(--red50);border-radius:999px;padding:0 8px;flex:none}'
	. '.note{margin:8px 0 0;font-size:13px;color:var(--soft);background:var(--sunk);border-radius:14px;padding:8px 12px}.note.big{font-size:14px}.acts{margin-top:12px;display:flex;gap:8px}'
	. '.alert{display:flex;justify-content:space-between;align-items:center;background:var(--red50);color:#8a2a31;border-radius:18px;padding:14px 18px}.alert span{font-size:13px}'
	. '.empty{text-align:center;padding:40px}.empty b{display:block;font-weight:400;font-size:17px}.empty p{color:var(--mut)}'
	. '.chips{display:flex;gap:6px;flex-wrap:wrap}.chip{height:34px;padding-inline:14px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line);display:inline-flex;align-items:center;font-size:13px;color:var(--soft);background:var(--paper);cursor:pointer}.chip.on{background:var(--ink);color:#fff;box-shadow:none}'
	. '.pool{display:flex;flex-direction:column;gap:10px;max-width:860px}.pc{background:var(--paper);border-radius:20px;box-shadow:inset 0 0 0 1px rgba(223,223,226,.8);padding:14px 18px}.pc summary{list-style:none;cursor:pointer;display:flex;flex-direction:column;gap:4px}.pc summary::-webkit-details-marker{display:none}'
	. '.pc b{font-weight:400;font-size:16px}.facts{display:flex;gap:6px;flex-wrap:wrap}.facts span{height:24px;padding-inline:9px;border-radius:999px;background:var(--sunk);display:inline-flex;align-items:center;font-size:11px;color:var(--soft)}'
	. '.pc.taken{background:transparent;box-shadow:inset 0 0 0 1px var(--line)}.pc.taken b{color:var(--mut)}.pd{margin-top:10px;display:flex;flex-direction:column;gap:10px}.pd p{margin:0;color:var(--soft)}.lab{font-size:13px;color:var(--mut)}'
	. '.brief div{display:flex;justify-content:space-between;gap:12px;min-height:36px;align-items:center;font-size:13px;border-bottom:1px solid rgba(223,223,226,.5)}.brief div:last-child{border-bottom:0}.brief div span:first-child{color:var(--mut)}'
	. '.box h2{margin:0 0 10px;font-size:18px;font-weight:400}.box label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--mut);margin-bottom:10px}'
	. 'input,textarea{font:inherit;border:0;border-radius:14px;box-shadow:inset 0 0 0 1px var(--line);padding:10px 12px;color:var(--ink);background:var(--paper)}#propose{max-width:860px}'
	. '.list{display:flex;flex-direction:column;background:var(--paper);border-radius:22px;box-shadow:inset 0 0 0 1px rgba(223,223,226,.7);padding:6px 20px;max-width:900px}'
	. '.row{display:flex;align-items:center;gap:12px;min-height:66px;border-bottom:1px solid rgba(223,223,226,.55)}.row:last-child{border-bottom:0}.row .tx{flex:1;display:flex;flex-direction:column}.row .tx b{font-weight:400}.row small{font-size:12px;color:var(--mut)}'
	. '.badge{font-size:12px;border-radius:999px;padding:2px 10px;background:var(--sunk);white-space:nowrap}.badge.red{background:var(--red50);color:#8a2a31}.badge.warn{background:var(--warn50);color:var(--warn)}'
	. '.kb{display:grid;grid-template-columns:repeat(6,minmax(160px,1fr));gap:12px;align-items:start;overflow-x:auto}.col{background:#ececf0;border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:8px;min-height:420px}.col .h{display:flex;justify-content:space-between;font-size:14px}.col .h b{font-weight:400}.own{font-size:11px;color:var(--mut)}'
	. '.ac{background:var(--paper);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--mut)}.ac b{font-weight:400;font-size:13px;color:var(--ink);line-height:1.6}'
	. '.ed{display:flex;gap:22px;align-items:flex-start}.colm{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}.rail{width:340px;flex:none;display:flex;flex-direction:column;gap:14px;position:sticky;top:20px}'
	. '.tbar{display:inline-flex;gap:2px;background:var(--ink);border-radius:14px;padding:4px;align-self:flex-start;position:sticky;top:12px;z-index:2}.tbar button{height:34px;min-width:34px;padding-inline:10px;border:0;border-radius:10px;background:transparent;color:#fff;font-size:13px}.tbar button:hover{background:rgba(255,255,255,.14)}'
	. '.doc{background:var(--paper);border-radius:22px;box-shadow:inset 0 0 0 1px rgba(223,223,226,.7);padding:32px 44px;font-size:16px;line-height:2.05}'
	. '#ttl{width:100%;border:0;box-shadow:none;padding:0;font-size:28px;line-height:1.5;margin-bottom:12px}#doc{outline:none;min-height:420px}#doc h2{font-size:20px;font-weight:400;margin:20px 0 4px}#doc p{margin:0 0 12px}'
	. '.doc table,#doc table{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0 14px}.doc th,#doc th{font-weight:400;text-align:start;background:var(--sunk);padding:8px 10px}.doc td,#doc td{padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}'
	. '.bh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}.bh b{font-weight:400;font-size:16px}.bh span{font-size:12px;color:var(--mut)}'
	. '.pgb{height:6px;border-radius:999px;background:var(--sunk);overflow:hidden;margin-top:6px}.pgb i{display:block;height:100%;background:var(--ink);width:0}'
	. '.ck{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid rgba(223,223,226,.5);font-size:13px}.ck:last-child{border-bottom:0}.ck i{width:22px;height:22px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;background:var(--red50);color:var(--red)}.ck.ok i{background:var(--ok50);color:var(--ok)}'
	. '.vstrip{display:flex;gap:8px;flex-wrap:wrap}.vstrip a{height:34px;padding-inline:12px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line);display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--soft);background:var(--paper)}.vstrip a.on{background:var(--ink);color:#fff;box-shadow:none}.vstrip a.cmp{box-shadow:inset 0 0 0 1.5px var(--ink)}.vstrip em{font-style:normal;font-size:11px;opacity:.7}'
	. 'table.diff{width:100%;border-collapse:collapse;font-size:15px;line-height:2}table.diff col.content{width:auto}table.diff td{padding:4px 8px;vertical-align:top}table.diff .diff-deletedline{background:var(--red50)}table.diff .diff-addedline{background:var(--ok50)}table.diff del{color:#8a2a31;text-decoration:line-through;background:#f6d4d7}table.diff ins{text-decoration:none;color:var(--ok);background:#cfe9da}'
	. '.dec{display:flex;flex-direction:column;gap:8px}.box .dec .o{display:flex;flex-direction:row;align-items:center;gap:10px;min-height:50px;border-radius:14px;box-shadow:inset 0 0 0 1px var(--line);padding:6px 12px;font-size:14px;cursor:pointer}#dnote{width:100%;margin-top:10px}'
	. '.gate{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.gcard{background:var(--paper);border-radius:26px;padding:36px;max-width:420px;text-align:center;box-shadow:inset 0 0 0 1px var(--line)}.gcard h1{font-weight:400;font-size:24px}.gcard p{color:var(--soft)}'
	. '.screen-reader-text{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:999px;padding:10px 20px;font-size:14px;z-index:9}'
	. '@media(max-width:900px){.app{flex-direction:column}.side{width:auto;height:auto;position:static;flex-direction:row;flex-wrap:wrap;padding:12px}.brand{padding:0 6px 0 0}.grp,.grow,.who{display:none}.main{padding:18px 16px 50px}.ed{flex-direction:column}.rail{width:100%;position:static}.doc{padding:22px 18px}.cards{grid-template-columns:1fr}.kb{grid-template-columns:repeat(6,200px)}}';
}

function tjws_js() {
	return <<<'JS'
(function(){
var T=window.TJWS;function $(s,r){return (r||document).querySelector(s)}function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function toast(m){var t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove()},2600)}
function act(o){return fetch(T.u,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-TJWS':T.t},body:JSON.stringify(o)}).then(function(r){return r.json().then(function(j){if(!r.ok){throw new Error(j.message||'خطا')}return j})})}
$$('.wk .chip').forEach(function(c){c.onclick=function(){$$('.chip',c.parentNode).forEach(function(x){x.classList.remove('on')});c.classList.add('on')}});
$$('[data-take]').forEach(function(b){b.onclick=function(){var w=$('.wk[data-code="'+b.dataset.take+'"] .chip.on');b.disabled=true;act({act:'take',code:b.dataset.take,weeks:w?+w.dataset.w:3}).then(function(j){location.href=T.d+'?v=write&id='+j.post}).catch(function(e){b.disabled=false;toast(e.message)})}});
var ps=$('#psend');if(ps){ps.onclick=function(){ps.disabled=true;act({act:'propose',title:$('#pt').value,angle:$('#pa').value}).then(function(j){var n=j.near||{},h='<div class="brief">';h+='<div><span>در استخر</span><span>'+((n.pool||[]).length?n.pool.map(function(x){return x.code+' '+x.title}).join('، '):'نزدیکش نیست')+'</span></div>';h+='<div><span>در سایت</span><span>'+((n.site||[]).length?n.site.map(function(x){return x.title}).join('، '):'مطلبی نداریم')+'</span></div></div>';$('#pnear').innerHTML=h;toast('برای سردبیر رفت');ps.textContent='فرستاده شد'}).catch(function(e){ps.disabled=false;toast(e.message)})}}
var ds=$('#dsend');if(ds){ds.onclick=function(){var d=$('input[name=dec]:checked');ds.disabled=true;act({act:'decide',post:+ds.dataset.post,dec:d?d.value:'clinical',note:$('#dnote').value}).then(function(){toast('ثبت شد');setTimeout(function(){location.href=T.d+'?v=editor'},800)}).catch(function(e){ds.disabled=false;toast(e.message)})}}
var doc=$('#doc');if(!doc)return;var art=$('.doc'),post=+art.dataset.post,kw=art.dataset.kw||'',target=+art.dataset.words||0,needT=art.dataset.table==='1',dirty=false,tm=null;
function fa(n){return String(n).replace(/\d/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[d]})}
function words(){var t=doc.innerText.replace(/\s+/g,' ').trim();return t?t.split(' ').length:0}
function check(){var w=words(),first=(doc.querySelector('p')||{}).innerText||'',txt=doc.innerText,list=[];
 if(target){$('#wc').textContent=fa(w)+' از '+fa(target)+' واژه';$('#pg').style.width=Math.min(100,Math.round(w*100/target))+'%'}else{$('#wc').textContent=fa(w)+' واژه'}
 var hasT=!!doc.querySelector('table');$('#tb').textContent=needT?(hasT?'گذاشته شد':'لازم است'):(hasT?'دارد':'لازم نیست');
 if(kw){list.push([first.indexOf(kw)>=0||doc.innerText.slice(0,400).indexOf(kw)>=0,'کلیدواژه در بند اول'])}
 if(needT){list.push([hasT,'جدول طبق بریف'])}
 if(target){list.push([w>=target*0.9,'طول نزدیک هدف'])}
 var dash=(txt.match(/[—–]/g)||[]).length;list.push([dash===0,dash?fa(dash)+' خط تیرهٔ وسط جمله':'بدون خط تیرهٔ وسط جمله']);
 var bad=(txt.match(/بیمار/g)||[]).length;list.push([bad===0,bad?'«مراجع» به‌جای «بیمار»':'واژهٔ «مراجع»']);
 list.push([doc.querySelectorAll('h2').length>=2,'دست‌کم دو تیتر میانی']);
 $('#chk').innerHTML=list.map(function(x){return '<div class="ck'+(x[0]?' ok':'')+'"><i>'+(x[0]?'✓':'!')+'</i><span>'+x[1]+'</span></div>'}).join('')}
function save(ver){dirty=false;$('#saved').textContent='در حال ذخیره';return act({act:'save',post:post,title:$('#ttl').value,html:doc.innerHTML,version:ver?1:0}).then(function(){$('#saved').textContent=ver?'نسخه ذخیره شد':'ذخیره شد'}).catch(function(e){$('#saved').textContent='ذخیره نشد';toast(e.message)})}
function changed(){dirty=true;$('#saved').textContent='';clearTimeout(tm);tm=setTimeout(function(){save(false)},4000);check()}
doc.addEventListener('input',changed);$('#ttl').addEventListener('input',changed);
$$('.tbar button').forEach(function(b){b.onmousedown=function(e){e.preventDefault()};b.onclick=function(){var c=b.dataset.c;
 if(c==='bold')document.execCommand('bold');else if(c==='h2')document.execCommand('formatBlock',false,'h2');else if(c==='p')document.execCommand('formatBlock',false,'p');else if(c==='ul')document.execCommand('insertUnorderedList');
 else if(c==='link'){var u=prompt('نشانی لینک');if(u)document.execCommand('createLink',false,u)}
 else if(c==='table'){document.execCommand('insertHTML',false,'<table><tr><th>ستون ۱</th><th>ستون ۲</th><th>ستون ۳</th></tr><tr><td> </td><td> </td><td> </td></tr><tr><td> </td><td> </td><td> </td></tr></table><p><br></p>')}
 changed()}});
$('#ver').onclick=function(){save(true)};
var sb=$('#sub');if(sb){sb.onclick=function(){sb.disabled=true;act({act:'submit',post:post,title:$('#ttl').value,html:doc.innerHTML}).then(function(){toast('تحویل شد');setTimeout(function(){location.href=T.d},900)}).catch(function(e){sb.disabled=false;toast(e.message)})}}
window.addEventListener('beforeunload',function(e){if(dirty){save(false)}});
check();
})();
JS;
}
