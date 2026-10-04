/**
 * Tajrobeh — مشارکت در مجله v2 (tjmc) · ۷ مهر ۱۴۰۵ · v2: صدای تمیز و متن زمان‌دار از موتور صدای بات (tj/v1/mag-voice)، اعمال اصلاحات بازبینی (tj/v1/post-patch)
 * منبع حقیقت: تب «مشارکت مجله» در بات. سایت فقط موارد تأییدشدهٔ سردبیر را از API عمومی بات می‌خواند
 * (همان الگوی tj_school_live_events در اسنیپت 505452). هیچ رمزی بین بات و سایت رد و بدل نمی‌شود.
 *  ۱) بازبینی علمی تأییدشده  ← خط «بازبینی علمی» زیر متای مقاله + reviewedBy در اسکیمای 504841
 *  ۲) صدای نویسنده            ← فقط بعد از تبدیل به mp3 در «ابزارها › صداهای مجله» (در مرورگر، بدون شل سرور)
 *  ۳) افزودهٔ نویسنده/مهمان    ← کادر «افزوده» زیر همان تیتری که مشارکت‌کننده انتخاب کرده
 * مسیرهای REST: tj/v1/mag-index (فهرست مطلب‌ها و تیترها برای بات) · tj/v1/mag-sync (خواندن دوباره از بات)
 */

if ( ! defined( 'TJMC_BOT' ) ) {
	define( 'TJMC_BOT', 'https://script.google.com/macros/s/AKfycbxD-DYhZ9LFjwB9az_DpMprzF_ItJkdad_DutMGPk1qY3ksBb45aMHYZBsXTCepYhsC8Q/exec' );
}

/* ---------- داده ---------- */
/* صفحهٔ تیم از روی نام (همان ایندکس tjp_index اسنیپت 504078)، وقتی بات نشانی نداده */
if ( ! function_exists( 'tjmc_person_url' ) ) {
function tjmc_person_url( $name ) {
	if ( ! function_exists( 'tjp_index' ) || ! function_exists( 'tjp_norm' ) ) { return ''; }
	$idx = tjp_index();
	$k   = tjp_norm( $name );
	if ( '' !== $k && isset( $idx[ $k ]['id'] ) ) {
		$u = get_permalink( (int) $idx[ $k ]['id'] );
		return $u ? $u : '';
	}
	return '';
}
}

if ( ! function_exists( 'tjmc_clean_item' ) ) {
function tjmc_clean_item( $e ) {
	if ( ! is_array( $e ) ) { return null; }
	$code = isset( $e['code'] ) ? (string) $e['code'] : '';
	$t    = isset( $e['t'] ) ? (string) $e['t'] : '';
	$post = isset( $e['post'] ) ? (int) $e['post'] : 0;
	if ( ! preg_match( '/^C-\d{3,6}$/', $code ) || ! in_array( $t, array( 'r', 'v', 'n' ), true ) || $post <= 0 ) { return null; }
	$s = function ( $k, $max = 200 ) use ( $e ) { return isset( $e[ $k ] ) ? mb_substr( trim( wp_strip_all_tags( (string) $e[ $k ] ) ), 0, $max ) : ''; };
	$o = array( 'code' => $code, 't' => $t, 'post' => $post, 'name' => $s( 'name', 80 ), 'job' => $s( 'job', 80 ), 'kind' => $s( 'kind', 40 ), 'ht' => $s( 'ht', 200 ) );
	$url = isset( $e['url'] ) ? esc_url_raw( (string) $e['url'] ) : '';
	$o['url']  = ( $url && 0 === strpos( $url, 'https://tajrobeh.life/' ) ) ? $url : '';
	$o['nz']   = ( isset( $e['nz'] ) && preg_match( '/^\d{3,8}$/', (string) $e['nz'] ) ) ? (string) $e['nz'] : '';
	$o['date'] = ( isset( $e['date'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $e['date'] ) ) ? (string) $e['date'] : '';
	$o['src']  = ( isset( $e['src'] ) && preg_match( '/^[\w-]{20,80}$/', (string) $e['src'] ) ) ? (string) $e['src'] : '';
	$o['text'] = isset( $e['text'] ) ? mb_substr( trim( wp_strip_all_tags( (string) $e['text'] ) ), 0, 2500 ) : '';
	if ( '' === $o['name'] ) { return null; }
	if ( 'n' === $t && mb_strlen( $o['text'] ) < 20 ) { return null; }
	if ( 'v' === $t && '' === $o['src'] ) { return null; }
	return $o;
}
}

if ( ! function_exists( 'tjmc_items' ) ) {
function tjmc_items( $force = false ) {
	$key = 'tjmc_items_v1';
	if ( ! $force ) {
		$c = get_transient( $key );
		if ( false !== $c ) { return $c; }
	}
	$r  = wp_remote_get( TJMC_BOT . '?api=magcontrib', array( 'timeout' => 12, 'redirection' => 5 ) );
	$ok = false; $out = array();
	if ( ! is_wp_error( $r ) && 200 === (int) wp_remote_retrieve_response_code( $r ) ) {
		$j = json_decode( wp_remote_retrieve_body( $r ), true );
		if ( is_array( $j ) && ! empty( $j['ok'] ) && isset( $j['items'] ) && is_array( $j['items'] ) ) {
			$ok = true;
			foreach ( $j['items'] as $e ) {
				$o = tjmc_clean_item( $e );
				if ( ! $o ) { continue; }
				if ( '' === $o['url'] ) { $o['url'] = tjmc_person_url( $o['name'] ); }
				$out[] = $o;
			}
		}
	}
	if ( $ok ) {
		$old = get_option( 'tjmc_items_last', array() );
		update_option( 'tjmc_items_last', $out, false );
		set_transient( $key, $out, 15 * MINUTE_IN_SECONDS );
		if ( $force ) { tjmc_purge_changed( is_array( $old ) ? $old : array(), $out ); }
		return $out;
	}
	$out = get_option( 'tjmc_items_last', array() );
	set_transient( $key, $out, 5 * MINUTE_IN_SECONDS );
	return is_array( $out ) ? $out : array();
}
}

if ( ! function_exists( 'tjmc_purge_changed' ) ) {
function tjmc_purge_changed( $old, $new ) {
	$sig = function ( $list ) { $m = array(); foreach ( $list as $i ) { $m[ $i['post'] ] = ( isset( $m[ $i['post'] ] ) ? $m[ $i['post'] ] : '' ) . md5( wp_json_encode( $i ) ); } return $m; };
	$a = $sig( $old ); $b = $sig( $new );
	$ids = array();
	foreach ( $a + $b as $pid => $x ) { if ( ! isset( $a[ $pid ], $b[ $pid ] ) || $a[ $pid ] !== $b[ $pid ] ) { $ids[] = (int) $pid; } }
	foreach ( $ids as $pid ) { tjmc_purge_post( $pid ); }
	return $ids;
}
}

if ( ! function_exists( 'tjmc_purge_post' ) ) {
function tjmc_purge_post( $pid ) {
	clean_post_cache( $pid );
	if ( class_exists( 'WPO_Page_Cache' ) && method_exists( 'WPO_Page_Cache', 'delete_single_post_cache' ) ) {
		WPO_Page_Cache::delete_single_post_cache( $pid );
	}
}
}

if ( ! function_exists( 'tjmc_for_post' ) ) {
function tjmc_for_post( $pid ) {
	$g = array( 'r' => array(), 'v' => array(), 'n' => array() );
	foreach ( tjmc_items() as $i ) { if ( (int) $i['post'] === (int) $pid ) { $g[ $i['t'] ][] = $i; } }
	return $g;
}
}

/* بازبین‌های تأییدشده برای اسکیمای 504841 */
if ( ! function_exists( 'tjmc_reviews_for' ) ) {
function tjmc_reviews_for( $pid ) {
	$g = tjmc_for_post( $pid );
	return $g['r'];
}
}

/* صداهایی که mp3 آماده دارند: code => attachment id */
if ( ! function_exists( 'tjmc_audio_map' ) ) {
function tjmc_audio_map() {
	$m = get_option( 'tjmc_audio', array() );
	return is_array( $m ) ? $m : array();
}
}

/* ---------- تیترها (یک تعریف برای بات و برای درج) ---------- */
if ( ! function_exists( 'tjmc_norm' ) ) {
function tjmc_norm( $s ) {
	$s = html_entity_decode( wp_strip_all_tags( (string) $s ), ENT_QUOTES, 'UTF-8' );
	$s = str_replace( array( "\xC2\xA0", 'ي', 'ك' ), array( ' ', 'ی', 'ک' ), $s );
	return trim( preg_replace( '/\s+/u', ' ', $s ) );
}
}
/* کلید مقایسهٔ تیتر: بی‌نیم‌فاصله و بی‌فاصله */
if ( ! function_exists( 'tjmc_key' ) ) {
function tjmc_key( $s ) { return preg_replace( '/[\s\x{200C}\x{200F}\x{200E}]+/u', '', tjmc_norm( $s ) ); }
}

/* بازه‌های سکشن‌های tjx (بلوک‌های بالا و پایین استاندارد) تا تیترهای داخلشان شمرده نشود */
if ( ! function_exists( 'tjmc_tjx_ranges' ) ) {
function tjmc_tjx_ranges( $html ) {
	$r = array();
	if ( preg_match_all( '#<section\b[^>]*class="[^"]*\btjx\b[^"]*"[^>]*>#', $html, $m, PREG_OFFSET_CAPTURE ) ) {
		foreach ( $m[0] as $x ) {
			$st  = $x[1];
			$end = strpos( $html, '</section>', $st );
			$r[] = array( $st, false === $end ? strlen( $html ) : $end + 10 );
		}
	}
	return $r;
}
}

/* آخر متن اصلی: جایی که بلوک پایانی استاندارد (جدول، پرسش‌ها، جعبه، مسیر خواندن) شروع می‌شود */
if ( ! function_exists( 'tjmc_tail' ) ) {
function tjmc_tail( $html ) {
	$first = strpos( $html, '<h2' );
	$from  = false === $first ? 0 : $first + 3;
	$tail  = strlen( $html );
	foreach ( array( '<div class="tjx">', '<h2 id="tjx-faq"', '<div class="tjx-faq"', '<div class="tjx-box"', '<nav class="tjx-path"' ) as $needle ) {
		$p = strpos( $html, $needle, $from );
		if ( false !== $p && $p < $tail ) { $tail = $p; }
	}
	return $tail;
}
}

/* تیترهای h2 متن اصلی (بیرون از مکث کوتاه و پیش از بلوک پایانی): متن و جای شروع */
if ( ! function_exists( 'tjmc_h2s' ) ) {
function tjmc_h2s( $html ) {
	$out  = array();
	$rng  = tjmc_tjx_ranges( $html );
	$tail = tjmc_tail( $html );
	if ( preg_match_all( '#<h2\b[^>]*>(.*?)</h2>#s', $html, $m, PREG_OFFSET_CAPTURE ) ) {
		foreach ( $m[0] as $k => $x ) {
			$pos = $x[1];
			if ( $pos >= $tail ) { break; }
			$in  = false;
			foreach ( $rng as $g ) { if ( $pos >= $g[0] && $pos < $g[1] ) { $in = true; break; } }
			if ( $in ) { continue; }
			$t = tjmc_norm( $m[1][ $k ][0] );
			if ( '' !== $t ) { $out[] = array( 't' => $t, 'pos' => $pos ); }
		}
	}
	return $out;
}
}

/* ---------- REST ---------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'tj/v1', '/mag-index', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			$c = get_transient( 'tjmc_index_v2' );
			if ( false === $c ) {
				$c = array();
				$q = get_posts( array( 'post_type' => 'post', 'post_status' => 'publish', 'numberposts' => 400, 'orderby' => 'date', 'order' => 'DESC' ) );
				foreach ( $q as $p ) {
					$u = get_userdata( $p->post_author );
					$h = array();
					foreach ( tjmc_h2s( $p->post_content ) as $x ) { $h[] = mb_substr( $x['t'], 0, 90 ); }
					$c[] = array(
						'id'     => (int) $p->ID,
						'title'  => tjmc_norm( get_the_title( $p ) ),
						'link'   => get_permalink( $p ),
						'author' => $u ? tjmc_norm( $u->display_name ) : '',
						'h'      => array_slice( $h, 0, 14 ),
					);
				}
				set_transient( 'tjmc_index_v2', $c, 30 * MINUTE_IN_SECONDS );
			}
			return rest_ensure_response( array( 'ok' => true, 'posts' => $c ) );
		},
	) );
	register_rest_route( 'tj/v1', '/mag-sync', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			if ( get_transient( 'tjmc_sync_lock' ) ) { return rest_ensure_response( array( 'ok' => true, 'throttled' => true ) ); }
			set_transient( 'tjmc_sync_lock', 1, 45 );
			$items = tjmc_items( true );
			return rest_ensure_response( array( 'ok' => true, 'n' => count( $items ) ) );
		},
	) );
} );
add_action( 'save_post_post', function () { delete_transient( 'tjmc_index_v2' ); } );

/* ---------- نمایش روی مقاله ---------- */
if ( ! function_exists( 'tjmc_person_link' ) ) {
function tjmc_person_link( $i ) {
	$n = esc_html( $i['name'] );
	return $i['url'] ? '<a href="' . esc_url( $i['url'] ) . '">' . $n . '</a>' : '<b>' . $n . '</b>';
}
}

if ( ! function_exists( 'tjmc_render' ) ) {
function tjmc_render( $content ) {
	if ( is_admin() || ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) { return $content; }
	$pid = get_the_ID();
	$g   = tjmc_for_post( $pid );
	if ( ! $g['r'] && ! $g['v'] && ! $g['n'] ) { return $content; }

	/* الف) افزوده‌ها: از آخر به اول درج می‌شوند تا جای بقیه جابه‌جا نشود */
	if ( $g['n'] ) {
		$h2s  = tjmc_h2s( $content );
		$tail = tjmc_tail( $content );
		$ins = array();
		foreach ( $g['n'] as $n ) {
			$at = $tail;
			$want = tjmc_key( $n['ht'] );
			foreach ( $h2s as $k => $h ) {
				if ( '' !== $want && tjmc_key( $h['t'] ) === $want ) {
					$at = isset( $h2s[ $k + 1 ] ) ? $h2s[ $k + 1 ]['pos'] : $tail;
					break;
				}
			}
			$paras = array_filter( array_map( 'trim', preg_split( '/\n+/u', $n['text'] ) ) );
			$body  = '';
			foreach ( $paras as $p ) { $body .= '<p>' . esc_html( $p ) . '</p>'; }
			$kind  = $n['kind'] ? '<span class="tjmc-note-k">' . esc_html( $n['kind'] ) . '</span>' : '';
			$by    = '<span class="tjmc-note-by">افزودهٔ ' . tjmc_person_link( $n ) . ( $n['job'] ? '<small>' . esc_html( $n['job'] ) . '</small>' : '' ) . '</span>';
			$ins[] = array( $at, '<aside class="tjmc-note" id="' . esc_attr( strtolower( $n['code'] ) ) . '"><div class="tjmc-note-h">' . $kind . $by . '</div>' . $body . '</aside>' );
		}
		usort( $ins, function ( $a, $b ) { return $b[0] - $a[0]; } );
		foreach ( $ins as $x ) { $content = substr( $content, 0, $x[0] ) . $x[1] . substr( $content, $x[0] ); }
	}

	/* ب) بازبین‌ها و صدا: زیر خط متای مقاله، یا بالای متن */
	$top = '';
	if ( $g['r'] ) {
		$names = array();
		foreach ( $g['r'] as $r ) { $names[] = tjmc_person_link( $r ); }
		$top .= '<p class="tjmc-rev"><span class="tjmc-rev-k">بازبینی علمی</span>' . implode( '<i>،</i> ', $names ) . '</p>';
	}
	$am = tjmc_audio_map();
	$quote_html = '';
	foreach ( $g['v'] as $v ) {
		if ( empty( $am[ $v['code'] ] ) ) { continue; }
		$src = wp_get_attachment_url( (int) $am[ $v['code'] ] );
		if ( ! $src ) { continue; }
		$tr  = tjmc_tr_for( $pid, $v['code'] );
		$top .= tjmc_voice_html( $pid, $v, $src, $tr );
		if ( $tr && ! empty( $tr['quote']['t'] ) ) { $quote_html = tjmc_quote_html( $v, $tr ); }
		break;
	}
	/* «از زبان نویسنده»: جملهٔ برجستهٔ صدا وسط مقاله، پیش از تیتر میانی */
	if ( '' !== $quote_html ) {
		$h2s = tjmc_h2s( $content );
		$at  = -1;
		if ( count( $h2s ) >= 2 ) { $at = $h2s[ (int) floor( count( $h2s ) / 2 ) ]['pos']; }
		else {
			/* مقاله‌های کوتاه بی‌تیتر: بعد از چهارمین پاراگراف متن اصلی */
			$tail = tjmc_tail( $content ); $n = 0; $off = 0;
			while ( false !== ( $p = strpos( $content, '</p>', $off ) ) ) { if ( $p >= $tail ) { break; } $n++; $off = $p + 4; if ( 4 === $n ) { $at = $off; break; } }
		}
		if ( $at > 0 ) { $content = substr( $content, 0, $at ) . $quote_html . substr( $content, $at ); }
	}
	if ( '' !== $top ) {
		if ( preg_match( '#<(p|div)\b[^>]*class="[^"]*\btjx-meta\b[^"]*"[^>]*>.*?</\1>#s', $content, $m, PREG_OFFSET_CAPTURE ) ) {
			$end = $m[0][1] + strlen( $m[0][0] );
			$content = substr( $content, 0, $end ) . $top . substr( $content, $end );
		} else {
			$content = $top . $content;
		}
	}
	return $content;
}
}
add_filter( 'the_content', 'tjmc_render', 30 );

/* ---------- صدای نویسنده: متن زمان‌دار، پخش‌کننده، جملهٔ برجسته (v2 · ۷ مهر ۱۴۰۵) ---------- */
if ( ! function_exists( 'tjmc_tr_for' ) ) {
function tjmc_tr_for( $pid, $code ) {
	$all = get_post_meta( $pid, '_tjmc_tr', true );
	return ( is_array( $all ) && isset( $all[ $code ] ) && is_array( $all[ $code ] ) ) ? $all[ $code ] : null;
}
}
if ( ! function_exists( 'tjmc_fa' ) ) {
function tjmc_fa( $s ) { return strtr( (string) $s, array( '0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹' ) ); }
}
if ( ! function_exists( 'tjmc_clock' ) ) {
function tjmc_clock( $sec ) { $sec = max( 0, (int) round( $sec ) ); return tjmc_fa( floor( $sec / 60 ) . ':' . str_pad( (string) ( $sec % 60 ), 2, '0', STR_PAD_LEFT ) ); }
}
if ( ! function_exists( 'tjmc_voice_html' ) ) {
function tjmc_voice_html( $pid, $v, $src, $tr ) {
	$id   = 'tjv-' . strtolower( $v['code'] );
	$segs = ( $tr && ! empty( $tr['segs'] ) ) ? $tr['segs'] : array();
	$dur  = ( $tr && ! empty( $tr['dur'] ) ) ? (int) $tr['dur'] : ( $segs ? (int) ceil( end( $segs )[1] ) : 0 );
	/* موج واقعی کلمه‌ها: چگالی گفتار در ۵۶ بازه */
	$n = 56; $b = array_fill( 0, $n, 0 );
	if ( $segs && $dur > 0 ) {
		foreach ( $segs as $x ) {
			$len = mb_strlen( $x[2] ); $a = max( 0, (float) $x[0] ); $e = max( $a + 0.1, (float) $x[1] );
			for ( $k = (int) floor( $a / $dur * $n ); $k <= min( $n - 1, (int) floor( $e / $dur * $n ) ); $k++ ) { $b[ $k ] += $len / max( 0.3, $e - $a ); }
		}
	} else { for ( $k = 0; $k < $n; $k++ ) { $b[ $k ] = 6 + 5 * sin( $k * 0.9 ) + 3 * sin( $k * 2.3 ); } }
	$mx = max( 1, max( $b ) );
	$bars = '';
	foreach ( $b as $x ) { $bars .= '<i style="--h:' . round( 0.18 + 0.82 * $x / $mx, 2 ) . '"></i>'; }
	$who  = tjmc_person_link( $v );
	$h  = '<section class="tjv" id="' . esc_attr( $id ) . '" data-src="' . esc_url( $src ) . '" data-dur="' . (int) $dur . '" aria-label="صدای نویسنده">';
	$h .= '<div class="tjv-row"><button class="tjv-btn" type="button" aria-label="پخش صدای نویسنده"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="p" d="M8 5.5v13l11-6.5z"/><path class="s" d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg></button>';
	$h .= '<div class="tjv-meta"><span class="tjv-k">با صدای نویسنده</span><span class="tjv-who">' . $who . '</span></div>';
	$h .= '<span class="tjv-time"><b class="tjv-cur">' . tjmc_fa( '0:00' ) . '</b><small>' . tjmc_clock( $dur ) . '</small></span><button class="tjv-rate" type="button" aria-label="سرعت پخش">۱×</button></div>';
	$h .= '<div class="tjv-wave" role="slider" tabindex="0" aria-label="جای پخش" aria-valuemin="0" aria-valuemax="' . (int) $dur . '" aria-valuenow="0">' . $bars . '</div>';
	if ( $tr && ! empty( $tr['summary'] ) ) { $h .= '<p class="tjv-sum">' . esc_html( $tr['summary'] ) . '</p>'; }
	if ( $segs ) {
		$paras = array(); $cur = array();
		foreach ( $segs as $i => $x ) {
			$cur[] = '<span data-s="' . esc_attr( $x[0] ) . '" data-e="' . esc_attr( $x[1] ) . '">' . esc_html( $x[2] ) . '</span>';
			$gap = isset( $segs[ $i + 1 ] ) ? $segs[ $i + 1 ][0] - $x[1] : 0;
			if ( count( $cur ) >= 5 || $gap > 1.2 ) { $paras[] = '<p>' . implode( ' ', $cur ) . '</p>'; $cur = array(); }
		}
		if ( $cur ) { $paras[] = '<p>' . implode( ' ', $cur ) . '</p>'; }
		$h .= '<div class="tjx-faq tjv-trw"><details id="' . esc_attr( $id ) . '-text"><summary>متن گفته‌شده<small>روی هر جمله بزنید تا از همان‌جا بشنوید</small></summary><div class="tjv-tr">' . implode( '', $paras ) . '</div></details></div>';
	}
	$h .= '<audio preload="none" src="' . esc_url( $src ) . '"></audio></section>';
	/* اسکیما: صدا با متن کامل */
	$text = '';
	foreach ( $segs as $x ) { $text .= $x[2] . ' '; }
	$ld = array(
		'@context' => 'https://schema.org', '@type' => 'AudioObject',
		'name' => 'صدای نویسنده: ' . get_the_title( $pid ), 'contentUrl' => $src, 'encodingFormat' => 'audio/mpeg', 'inLanguage' => 'fa',
		'creator' => array_filter( array( '@type' => 'Person', 'name' => $v['name'], 'url' => $v['url'] ) ),
		'isPartOf' => get_permalink( $pid ),
	);
	if ( $dur ) { $ld['duration'] = 'PT' . floor( $dur / 60 ) . 'M' . ( $dur % 60 ) . 'S'; }
	if ( $tr && ! empty( $tr['summary'] ) ) { $ld['description'] = $tr['summary']; }
	if ( '' !== trim( $text ) ) { $ld['transcript'] = mb_substr( trim( $text ), 0, 12000 ); }
	if ( ! empty( $v['date'] ) ) { $ld['uploadDate'] = $v['date']; }
	$h .= '<script type="application/ld+json">' . wp_json_encode( $ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . '</script>';
	return $h;
}
}
if ( ! function_exists( 'tjmc_quote_html' ) ) {
function tjmc_quote_html( $v, $tr ) {
	$q = $tr['quote'];
	$q['t'] = preg_replace( '/[\x{060C},;:\s]+$/u', '', $q['t'] );
	return '<aside class="tjv-q" data-for="tjv-' . esc_attr( strtolower( $v['code'] ) ) . '" data-s="' . esc_attr( $q['s'] ) . '" data-e="' . esc_attr( $q['e'] ) . '">'
		. '<button class="tjv-qb" type="button" aria-label="شنیدن همین جمله با صدای نویسنده"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="p" d="M8 5.5v13l11-6.5z"/><path class="s" d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg></button>'
		. '<div><span class="tjv-qk">از زبان نویسنده</span><blockquote>«' . esc_html( $q['t'] ) . '»</blockquote><cite>' . esc_html( $v['name'] ) . ' · با صدای خودش</cite></div></aside>';
}
}


/* صفحهٔ بررسی اصلاحات بازبینی (505698، /review/): فقط با لینک امضاشدهٔ بات کار می‌کند؛ ایندکس و نقشهٔ سایت نه */
add_filter( 'wpseo_robots', function ( $r ) { return is_page( 505698 ) ? 'noindex, nofollow' : $r; } );
add_filter( 'wpseo_exclude_from_sitemap_by_post_ids', function ( $ids ) { $ids[] = 505698; return $ids; } );

/* v169 (بات): /review/ فقط به بات ریدایرکت می‌شود و بررسی در مینی‌اپ انجام می‌شود.
   ریشهٔ ۴۰۴ قبلی: لینک بات ?c=…&w=<chat_id>&k=… داشت و «w» متغیر عمومی پرس‌وجوی وردپرس (شمارهٔ هفته) است؛ وردپرس آرشیو هفته را
   می‌گشت، چیزی پیدا نمی‌کرد و پیش از اجرای خود برگه ۴۰۴ می‌داد. این قلاب پیش از redirect_canonical و حتی روی همان ۴۰۴ اجرا می‌شود. */
add_action( 'template_redirect', function () {
	$uri  = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '';
	$path = trim( (string) wp_parse_url( $uri, PHP_URL_PATH ), '/' );
	if ( 'review' !== $path ) { return; }
	$c  = isset( $_GET['c'] ) ? sanitize_text_field( wp_unslash( $_GET['c'] ) ) : '';
	$to = 'https://t.me/tajrobehlife_bot';
	if ( preg_match( '/^E-[0-9]{1,6}$/', $c ) ) { $to .= '?start=rv_' . $c; }
	nocache_headers();
	wp_redirect( $to, 302 );
	exit;
}, 0 );

/* ---------- REST: صدا و متن از بات (امضای HMAC همان tjd_auth) ---------- */
if ( ! function_exists( 'tjmc_voice_push' ) ) {
function tjmc_voice_push( WP_REST_Request $req ) {
	$p    = $req->get_json_params();
	$code = sanitize_text_field( isset( $p['code'] ) ? $p['code'] : '' );
	$post = isset( $p['post'] ) ? (int) $p['post'] : 0;
	if ( ! preg_match( '/^C-\d{3,6}$/', $code ) || 'post' !== get_post_type( $post ) ) { return new WP_Error( 'bad', 'code/post', array( 'status' => 400 ) ); }
	$segs = array();
	foreach ( (array) ( isset( $p['segs'] ) ? $p['segs'] : array() ) as $x ) {
		if ( ! is_array( $x ) || count( $x ) < 3 ) { continue; }
		$t = trim( wp_strip_all_tags( (string) $x[2] ) );
		if ( '' === $t ) { continue; }
		$segs[] = array( round( (float) $x[0], 2 ), round( (float) $x[1], 2 ), mb_substr( $t, 0, 600 ) );
		if ( count( $segs ) >= 900 ) { break; }
	}
	$q  = ( isset( $p['quote'] ) && is_array( $p['quote'] ) ) ? $p['quote'] : array();
	$tr = array(
		'code' => $code, 'dur' => isset( $p['dur'] ) ? (int) $p['dur'] : 0,
		'summary' => mb_substr( trim( wp_strip_all_tags( (string) ( isset( $p['summary'] ) ? $p['summary'] : '' ) ) ), 0, 400 ),
		'quote' => array( 't' => mb_substr( trim( wp_strip_all_tags( (string) ( isset( $q['t'] ) ? $q['t'] : '' ) ) ), 0, 400 ), 's' => (float) ( isset( $q['s'] ) ? $q['s'] : 0 ), 'e' => (float) ( isset( $q['e'] ) ? $q['e'] : 0 ) ),
		'segs' => $segs, 'at' => current_time( 'mysql' ),
	);
	$all = get_post_meta( $post, '_tjmc_tr', true );
	if ( ! is_array( $all ) ) { $all = array(); }
	$all[ $code ] = $tr;
	update_post_meta( $post, '_tjmc_tr', $all );
	$audio = false; $att = 0; $why = '';
	$drive = ( isset( $p['drive'] ) && preg_match( '/^[\w-]{20,80}$/', (string) $p['drive'] ) ) ? (string) $p['drive'] : '';
	if ( $drive ) {
		$r    = wp_remote_get( 'https://drive.google.com/uc?export=download&id=' . rawurlencode( $drive ), array( 'timeout' => 60, 'redirection' => 6 ) );
		$body = is_wp_error( $r ) ? '' : wp_remote_retrieve_body( $r );
		if ( strlen( $body ) > 2000 && 0 !== strpos( ltrim( $body ), '<' ) ) {
			$up = wp_upload_bits( 'mag-voice-' . strtolower( $code ) . '-' . time() . '.mp3', null, $body );
			if ( empty( $up['error'] ) ) {
				$att = wp_insert_attachment( array( 'post_mime_type' => 'audio/mpeg', 'post_title' => 'صدای نویسنده: ' . get_the_title( $post ), 'post_status' => 'inherit', 'post_parent' => $post ), $up['file'], $post );
				if ( $att && ! is_wp_error( $att ) ) {
					require_once ABSPATH . 'wp-admin/includes/media.php';
					require_once ABSPATH . 'wp-admin/includes/image.php';
					wp_update_attachment_metadata( $att, wp_generate_attachment_metadata( $att, $up['file'] ) );
					$m   = tjmc_audio_map();
					$old = isset( $m[ $code ] ) ? (int) $m[ $code ] : 0;
					$m[ $code ] = (int) $att;
					update_option( 'tjmc_audio', $m, false );
					if ( $old && $old !== (int) $att ) { wp_delete_attachment( $old, true ); }
					$audio = true;
				} else { $why = 'attach'; $att = 0; }
			} else { $why = 'upload'; }
		} else { $why = 'fetch'; }
	}
	delete_transient( 'tjmc_items_v1' );
	tjmc_items( true );
	tjmc_purge_post( $post );
	return rest_ensure_response( array( 'ok' => true, 'audio' => $audio, 'att' => (int) $att, 'why' => $why, 'url' => $att ? wp_get_attachment_url( $att ) : '' ) );
}
}

/* ---------- REST: اعمال اصلاحات تأییدشدهٔ بازبینی علمی روی متن مقاله ---------- */
if ( ! function_exists( 'tjpp_key' ) ) {
function tjpp_key( $s ) {
	$s = html_entity_decode( wp_strip_all_tags( (string) $s ), ENT_QUOTES, 'UTF-8' );
	$s = preg_replace( '/^[\x{2022}\-\s]+/u', '', $s );
	$s = str_replace( array( 'ي', 'ك' ), array( 'ی', 'ک' ), $s );
	$s = preg_replace( '/[\s\x{200C}\x{200F}\x{200E}\x{00A0}]+/u', '', $s );
	return preg_replace( '/[\x{2014}\x{2013}\-،,.:؛!؟?«»"()]/u', '', $s );
}
}
if ( ! function_exists( 'tjpp_blocks' ) ) {
function tjpp_blocks( $html ) {
	$out = array();
	if ( preg_match_all( '#<(p|li|h2|h3|h4|blockquote)\b[^>]*>(.*?)</\1>#su', $html, $m, PREG_OFFSET_CAPTURE ) ) {
		foreach ( $m[0] as $i => $x ) {
			$out[] = array( 'start' => $x[1], 'len' => strlen( $x[0] ), 'full' => $x[0], 'tag' => $m[1][ $i ][0], 'inner' => $m[2][ $i ][0], 'ipos' => $m[2][ $i ][1], 'key' => tjpp_key( $m[2][ $i ][0] ) );
		}
	}
	return $out;
}
}
/* بازهٔ بلوک با کامنت‌های گوتنبرگ اطرافش */
if ( ! function_exists( 'tjpp_span' ) ) {
function tjpp_span( $html, $b ) {
	$s = $b['start']; $e = $b['start'] + $b['len'];
	$before = substr( $html, 0, $s );
	if ( preg_match( '#<!-- wp:[a-z/-]+(?:\s[^>]*)?-->\s*$#', $before, $mm ) ) { $s -= strlen( $mm[0] ); }
	$after = substr( $html, $e, 200 );
	if ( preg_match( '#^\s*<!-- /wp:[a-z/-]+ -->#', $after, $mm ) ) { $e += strlen( $mm[0] ); }
	return array( $s, $e );
}
}
if ( ! function_exists( 'tjpp_apply_one' ) ) {
function tjpp_apply_one( $html, $c ) {
	$kind = isset( $c['kind'] ) ? $c['kind'] : 'edit';
	$old  = (string) ( isset( $c['old'] ) ? $c['old'] : '' );
	$isli = (bool) preg_match( '/^\s*\x{2022}/u', (string) ( isset( $c['neu'] ) ? $c['neu'] : '' ) );
	$neu  = trim( preg_replace( '/^\x{2022}\s*/u', '', (string) ( isset( $c['neu'] ) ? $c['neu'] : '' ) ) );
	$neu  = preg_replace( '/\s*[\x{2014}\x{2013}]\s*/u', '، ', $neu );
	$blocks = tjpp_blocks( $html );
	if ( 'add' === $kind ) {
		$ka = tjpp_key( isset( $c['after'] ) ? $c['after'] : '' );
		$hit = array_values( array_filter( $blocks, function ( $b ) use ( $ka ) { return '' !== $ka && $b['key'] === $ka; } ) );
		if ( 1 !== count( $hit ) ) { return array( $html, false, 'جای افزودن پیدا نشد' ); }
		list( $s, $e ) = tjpp_span( $html, $hit[0] );
		if ( 'li' === $hit[0]['tag'] ) {
			if ( $isli ) {
				$ins = ( $e > $hit[0]['start'] + $hit[0]['len'] ) ? "\n<!-- wp:list-item -->\n<li>" . esc_html( $neu ) . "</li>\n<!-- /wp:list-item -->" : '<li>' . esc_html( $neu ) . '</li>';
				return array( substr( $html, 0, $e ) . $ins . substr( $html, $e ), true, '' );
			}
			if ( ! preg_match( '#</(ul|ol)>(\s*<!-- /wp:list -->)?#', $html, $lm, PREG_OFFSET_CAPTURE, $e ) ) { return array( $html, false, 'پایان فهرست پیدا نشد' ); }
			$e = $lm[0][1] + strlen( $lm[0][0] );
		}
		$ins = "\n\n<!-- wp:paragraph -->\n<p>" . esc_html( $neu ) . "</p>\n<!-- /wp:paragraph -->";
		return array( substr( $html, 0, $e ) . $ins . substr( $html, $e ), true, '' );
	}
	$ko  = tjpp_key( $old );
	if ( '' === $ko ) { return array( $html, false, 'متن قبلی خالی است' ); }
	$hit = array_values( array_filter( $blocks, function ( $b ) use ( $ko ) { return $b['key'] === $ko; } ) );
	if ( 1 === count( $hit ) ) {
		$b = $hit[0];
		if ( 'del' === $kind ) { list( $s, $e ) = tjpp_span( $html, $b ); return array( substr( $html, 0, $s ) . substr( $html, $e ), true, '' ); }
		$inner = $b['inner'];
		if ( false === strpos( $inner, '<' ) ) {
			$new = esc_html( $neu );
		} else {
			$po = html_entity_decode( wp_strip_all_tags( $inner ), ENT_QUOTES, 'UTF-8' );
			$a = preg_split( '//u', $po, -1, PREG_SPLIT_NO_EMPTY ); $z = preg_split( '//u', $neu, -1, PREG_SPLIT_NO_EMPTY );
			$pre = 0; while ( $pre < count( $a ) && $pre < count( $z ) && $a[ $pre ] === $z[ $pre ] ) { $pre++; }
			$suf = 0; while ( $suf < count( $a ) - $pre && $suf < count( $z ) - $pre && $a[ count( $a ) - 1 - $suf ] === $z[ count( $z ) - 1 - $suf ] ) { $suf++; }
			$mo = implode( '', array_slice( $a, $pre, count( $a ) - $pre - $suf ) );
			$mn = implode( '', array_slice( $z, $pre, count( $z ) - $pre - $suf ) );
			if ( '' !== $mo && 1 === substr_count( $inner, $mo ) ) { $new = str_replace( $mo, esc_html( $mn ), $inner ); }
			elseif ( '' === $mo ) {
				$anc = implode( '', array_slice( $a, max( 0, $pre - 14 ), min( 14, $pre ) ) );
				if ( '' !== $anc && 1 === substr_count( $inner, $anc ) ) { $new = str_replace( $anc, $anc . esc_html( $mn ), $inner ); }
				else { return array( $html, false, 'بند قالب‌بندی دارد؛ دستی' ); }
			} else { return array( $html, false, 'بند قالب‌بندی دارد؛ دستی' ); }
		}
		$full = substr( $b['full'], 0, $b['ipos'] - $b['start'] ) . $new . substr( $b['full'], $b['ipos'] - $b['start'] + strlen( $inner ) );
		return array( substr( $html, 0, $b['start'] ) . $full . substr( $html, $b['start'] + $b['len'] ), true, '' );
	}
	if ( count( $hit ) > 1 ) { return array( $html, false, 'بیش از یک جا' ); }
	/* جمله‌ای درون یک بند */
	if ( mb_strlen( $ko ) >= 10 ) {
		$in = array_values( array_filter( $blocks, function ( $b ) use ( $ko ) { return false !== strpos( $b['key'], $ko ); } ) );
		if ( 1 === count( $in ) ) {
			$b = $in[0]; $inner = $b['inner'];
			$needle = trim( $old );
			if ( 1 === substr_count( $inner, $needle ) ) {
				$new = 'del' === $kind ? str_replace( $needle, '', $inner ) : str_replace( $needle, esc_html( $neu ), $inner );
				$full = substr( $b['full'], 0, $b['ipos'] - $b['start'] ) . $new . substr( $b['full'], $b['ipos'] - $b['start'] + strlen( $inner ) );
				return array( substr( $html, 0, $b['start'] ) . $full . substr( $html, $b['start'] + $b['len'] ), true, '' );
			}
		}
	}
	return array( $html, false, 'متن دقیق پیدا نشد' );
}
}
if ( ! function_exists( 'tjpp_patch' ) ) {
function tjpp_patch( WP_REST_Request $req ) {
	$p    = $req->get_json_params();
	$post = isset( $p['post'] ) ? (int) $p['post'] : 0;
	$pp   = get_post( $post );
	if ( ! $pp || 'post' !== $pp->post_type ) { return new WP_Error( 'bad', 'post', array( 'status' => 400 ) ); }
	$html = $pp->post_content; $res = array(); $n = 0;
	foreach ( (array) ( isset( $p['changes'] ) ? $p['changes'] : array() ) as $c ) {
		if ( ! is_array( $c ) ) { continue; }
		list( $html, $ok, $why ) = tjpp_apply_one( $html, $c );
		$res[] = array( 'id' => isset( $c['id'] ) ? (int) $c['id'] : 0, 'ok' => $ok, 'why' => $why );
		if ( $ok ) { $n++; }
	}
	if ( $n > 0 ) {
		kses_remove_filters();
		$u = wp_update_post( array( 'ID' => $post, 'post_content' => $html ), true );
		kses_init_filters();
		if ( is_wp_error( $u ) ) { return new WP_Error( 'save', $u->get_error_message(), array( 'status' => 500 ) ); }
	}
	$rv = ( isset( $p['reviewed'] ) && is_array( $p['reviewed'] ) ) ? $p['reviewed'] : array();
	if ( ! empty( $rv['date'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $rv['date'] ) ) { update_post_meta( $post, '_tj_last_reviewed', $rv['date'] ); }
	$log = get_post_meta( $post, '_tj_review_log', true ); if ( ! is_array( $log ) ) { $log = array(); }
	$log[] = array( 'code' => sanitize_text_field( isset( $p['code'] ) ? $p['code'] : '' ), 'at' => current_time( 'mysql' ), 'applied' => $n, 'total' => count( $res ) );
	update_post_meta( $post, '_tj_review_log', array_slice( $log, -30 ) );
	delete_transient( 'tjmc_items_v1' );
	tjmc_purge_post( $post );
	return rest_ensure_response( array( 'ok' => true, 'applied' => $n, 'results' => $res ) );
}
}
add_action( 'rest_api_init', function () {
	$auth = function ( $req ) { return function_exists( 'tjd_auth' ) ? tjd_auth( $req ) : false; };
	register_rest_route( 'tj/v1', '/mag-voice', array( 'methods' => 'POST', 'permission_callback' => $auth, 'callback' => 'tjmc_voice_push' ) );
	register_rest_route( 'tj/v1', '/post-patch', array( 'methods' => 'POST', 'permission_callback' => $auth, 'callback' => 'tjpp_patch' ) );
} );


add_action( 'wp_head', function () {
	if ( ! is_singular( 'post' ) ) { return; }
	echo '<style id="tjmc-css">'
	. '.tjmc-rev{display:flex;flex-wrap:wrap;gap:.35em .5em;align-items:center;font-size:.9rem;color:var(--soft,#46423d);margin:.6em 0 1.1em}'
	. '.tjmc-rev-k{font-size:.78rem;border:1px solid var(--line,#ded6c6);border-radius:999px;padding:.1em .7em;color:var(--soft,#46423d)}'
	. '.tjmc-rev a{color:inherit!important;text-decoration:none!important;border-bottom:1px solid var(--line,#ded6c6)!important}'
	. '.tjmc-rev a:hover{border-bottom-color:var(--r,#c83f49)!important}.tjmc-rev i{font-style:normal;margin-inline-start:-.35em}'
	. '.tjv{position:relative;margin:0 0 1.6em;padding:14px 16px 12px;border:1px solid var(--line,#dfdfe2);border-radius:20px;background:#fff;box-shadow:0 8px 30px rgba(14,14,14,.05)}'
	. '.tjv-row{display:flex;align-items:center;gap:12px}'
	. '.tjv-btn,.tjv-qb{flex:none;width:48px;height:48px;border-radius:50%;border:0;background:var(--tj-red,#c83f49)!important;color:#fff!important;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 18px rgba(200,63,73,.28);transition:transform .2s}'
	. '.tjv-btn:hover,.tjv-qb:hover{transform:scale(1.05)}.tjv-btn svg,.tjv-qb svg{width:22px;height:22px;fill:#fff}.tjv .s,.tjv-q .s{display:none}.tjv.on .tjv-btn .p,.tjv-q.on .p{display:none}.tjv.on .tjv-btn .s,.tjv-q.on .s{display:inline}'
	. '.tjv-meta{display:flex;flex-direction:column;min-width:0;flex:1;line-height:1.5}.tjv-k{font-size:.74rem;color:var(--tj-red,#c83f49);font-weight:700}.tjv-who{font-size:.95rem}.tjv-who a{color:var(--tj-ink,#0e0e0e)!important;text-decoration:none!important;font-weight:700}'
	. '.tjv-time{display:flex;flex-direction:column;align-items:flex-end;font-size:.8rem;color:var(--tj-mut,#676768);line-height:1.4}.tjv-time b{color:var(--tj-ink,#0e0e0e);font-weight:700}'
	. '.tjv-rate{flex:none;border:1px solid var(--line,#dfdfe2);background:#fff;border-radius:999px;font:inherit;font-size:.78rem;padding:2px 10px;cursor:pointer;color:var(--tj-soft,#4e4e4e)}'
	. '.tjv-wave{display:flex;align-items:center;justify-content:space-between;gap:2px;height:40px;margin:12px 2px 4px;cursor:pointer;outline-offset:4px}.tjv-wave i{flex:0 0 4px;width:4px;height:calc(var(--h)*100%);min-height:3px;border-radius:4px;background:var(--line,#dfdfe2);transition:background .2s,transform .2s;transform-origin:center}'
	. '.tjv-wave i.on{background:var(--tj-red,#c83f49)}.tjv.on .tjv-wave i.now{transform:scaleY(1.25);background:var(--tj-red-400,#d9737a)}'
	. '.tjv-sum{margin:.4em 0 .2em!important;font-size:.92rem!important;color:var(--tj-soft,#4e4e4e);line-height:1.9}'
	. '.tjv-trw{margin:.4em 0 0!important}.tjv-trw summary small{display:block;font-size:.72rem;color:var(--tj-mut,#676768);font-weight:400}'
	. '.tjv-tr p{margin:.5em 0!important;line-height:2.05;font-size:.98rem}.tjv-tr span{cursor:pointer;border-radius:5px;transition:background .25s,color .25s;padding:0 1px}.tjv-tr span:hover{background:var(--tj-sunk,#f5f5f8)}.tjv-tr span.now{background:var(--tj-tint,#faeced);color:var(--tj-ink,#0e0e0e);box-shadow:0 0 0 2px var(--tj-tint,#faeced)}'
	. '.tjv audio{display:none}'
	. '.tjv-q{display:flex;gap:14px;align-items:flex-start;margin:2em 0;padding:18px 18px 16px;border-radius:22px;background:var(--tj-tint,#faeced);position:relative}'
	. '.tjv-q blockquote{margin:.2em 0 .3em!important;padding:0!important;border:0!important;font-size:1.15rem;line-height:1.9;font-weight:700;color:var(--tj-ink,#0e0e0e)}.tjv-qk{font-size:.74rem;color:var(--tj-red,#c83f49);font-weight:700}.tjv-q cite{font-style:normal;font-size:.82rem;color:var(--tj-soft,#4e4e4e)}'
	. '.tjv-q.on blockquote{background:linear-gradient(90deg,transparent 0,transparent 100%)}'
	. '.tjv-mini{position:fixed;inset-inline:12px;bottom:14px;z-index:9990;max-width:520px;margin-inline:auto;display:flex;align-items:center;gap:10px;padding:8px 12px 8px 8px;border-radius:999px;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border:1px solid var(--line,#dfdfe2);box-shadow:0 10px 30px rgba(14,14,14,.14);transform:translateY(140%);transition:transform .35s}'
	. '.tjv-mini.show{transform:none}.tjv-mini .tjv-btn{width:38px;height:38px}.tjv-mini .tjv-btn svg{width:18px;height:18px}.tjv-mini .t{flex:1;min-width:0;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tjv-mini .bar{position:absolute;inset-inline:18px;bottom:4px;height:2px;background:var(--line,#dfdfe2);border-radius:2px;overflow:hidden}.tjv-mini .bar i{display:block;height:100%;width:0;background:var(--tj-red,#c83f49);margin-inline-start:0}'
	. '.tjv-mini.on .tjv-btn .p{display:none}.tjv-mini.on .tjv-btn .s{display:inline}.tjv-mini .s{display:none}'
	. '@media (prefers-reduced-motion:reduce){.tjv-wave i,.tjv-mini{transition:none}}'
	. '.tjmc-note{position:relative;margin:1.6em 0;padding:1em 1.1em 1em 1em;border-inline-start:3px solid var(--r,#c83f49);background:#fbf8f2;border-radius:0 14px 14px 0}'
	. '.tjmc-note-h{display:flex;flex-wrap:wrap;gap:.4em .8em;align-items:baseline;margin-bottom:.4em;font-size:.82rem;color:var(--soft,#46423d)}'
	. '.tjmc-note-k{color:var(--r,#c83f49);font-weight:600}'
	. '.tjmc-note-by a{color:inherit!important;font-weight:600;text-decoration:none!important;border-bottom:1px solid var(--line,#ded6c6)!important}'
	. '.tjmc-note-by small{margin-inline-start:.4em;opacity:.75}'
	. '.tjmc-note p{margin:.35em 0!important;font-size:.98rem;line-height:1.95}'
	. '</style>';
} );


add_action( 'wp_footer', function () {
	if ( ! is_singular( 'post' ) ) { return; }
	?>
<script id="tjv-js">
(function(){
var roots=[].slice.call(document.querySelectorAll('.tjv'));
if(!roots.length){return;}
function fa(s){return String(s).replace(/\d/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[d];});}
function clock(t){t=Math.max(0,Math.floor(t||0));return fa(Math.floor(t/60)+':'+('0'+(t%60)).slice(-2));}
var mini=null;
roots.forEach(function(R){
	var A=R.querySelector('audio'),btn=R.querySelector('.tjv-btn'),cur=R.querySelector('.tjv-cur'),wave=R.querySelector('.tjv-wave');
	var bars=[].slice.call(wave.querySelectorAll('i')),spans=[].slice.call(R.querySelectorAll('.tjv-tr span'));
	var dur=+R.getAttribute('data-dur')||0,stopAt=0,rates=[1,1.25,1.5,0.75],ri=0,lastSpan=null;
	var who=(R.querySelector('.tjv-who')||{}).textContent||'';
	function D(){if(A.duration){if(isFinite(A.duration)){return A.duration;}}return dur;}
	function play(){ if(A.preload!=='auto'){A.preload='auto';} var p=A.play(); if(p){p.catch(function(){});} }
	function toggle(){ if(A.paused){stopAt=0;play();}else{A.pause();} }
	btn.addEventListener('click',toggle);
	R.querySelector('.tjv-rate').addEventListener('click',function(){ri=(ri+1)%rates.length;A.playbackRate=rates[ri];this.textContent=fa(String(rates[ri]).replace('.','٫'))+'×';});
	function seekTo(t,go){ A.currentTime=Math.max(0,Math.min(D()-0.1,t)); upd(); if(go){play();} }
	wave.addEventListener('click',function(e){var r=wave.getBoundingClientRect(),x=(r.right-e.clientX)/r.width;if(getComputedStyle(wave).direction!=='rtl'){x=(e.clientX-r.left)/r.width;}seekTo(x*D(),true);});
	wave.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){seekTo(A.currentTime+5);}else if(e.key==='ArrowRight'){seekTo(A.currentTime-5);}else if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle();}});
	spans.forEach(function(s){s.addEventListener('click',function(){stopAt=0;seekTo(+s.getAttribute('data-s'),true);});});
	function upd(){
		var t=A.currentTime||0,d=D()||1,k=Math.floor(t/d*bars.length);
		cur.textContent=clock(t);wave.setAttribute('aria-valuenow',Math.floor(t));
		bars.forEach(function(b,i){b.className=i<k?'on':(i===k?'on now':'');});
		var hit=null;
		for(var i=0;i<spans.length;i++){var s=spans[i];if(t>=+s.getAttribute('data-s')){if(t<+s.getAttribute('data-e')+0.25){hit=s;}}}
		if(hit!==lastSpan){if(lastSpan){lastSpan.classList.remove('now');}if(hit){hit.classList.add('now');}lastSpan=hit;}
		if(mini){if(mini._r===R){mini.querySelector('.bar i').style.width=(t/d*100)+'%';}}
		if(stopAt){if(t>=stopAt){A.pause();stopAt=0;}}
	}
	A.addEventListener('timeupdate',upd);
	A.addEventListener('play',function(){R.classList.add('on');roots.forEach(function(o){if(o!==R){var a=o.querySelector('audio');if(!a.paused){a.pause();}}});showMini(R,A,who);});
	A.addEventListener('pause',function(){R.classList.remove('on');[].slice.call(document.querySelectorAll('.tjv-q.on')).forEach(function(q){q.classList.remove('on');});if(mini){mini.classList.remove('on');}});
	A.addEventListener('ended',function(){R.classList.remove('on');if(mini){mini.classList.remove('show');}});
	R._seg=function(s,e,q){stopAt=e+0.35;seekTo(s,true);q.classList.add('on');};
	R._toggle=toggle;
});
[].slice.call(document.querySelectorAll('.tjv-q')).forEach(function(q){
	var R=document.getElementById(q.getAttribute('data-for'));if(!R){return;}
	q.querySelector('.tjv-qb').addEventListener('click',function(){var a=R.querySelector('audio');if(q.classList.contains('on')){if(!a.paused){a.pause();}return;}R._seg(+q.getAttribute('data-s'),+q.getAttribute('data-e'),q);});
});
function showMini(R,A,who){
	if(!mini){
		mini=document.createElement('div');mini.className='tjv-mini';mini.setAttribute('role','region');mini.setAttribute('aria-label','پخش‌کنندهٔ صدای نویسنده');
		mini.innerHTML='<button class="tjv-btn" type="button" aria-label="پخش یا توقف"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="p" d="M8 5.5v13l11-6.5z"/><path class="s" d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg></button><span class="t"></span><span class="bar"><i></i></span>';
		document.body.appendChild(mini);
		mini.querySelector('.tjv-btn').addEventListener('click',function(){if(mini._r){mini._r._toggle();}});
		mini.querySelector('.t').addEventListener('click',function(){if(mini._r){mini._r.scrollIntoView({behavior:'smooth',block:'center'});}});
	}
	mini._r=R;mini.classList.add('on');mini.querySelector('.t').textContent='با صدای '+who.trim();
	if(!R._io){R._io=new IntersectionObserver(function(en){en.forEach(function(x){if(mini._r!==R){return;}var playing=!R.querySelector('audio').paused;if(!x.isIntersecting){if(playing){mini.classList.add('show');}}else{mini.classList.remove('show');}});},{threshold:0});R._io.observe(R);}
}
})();
</script>
	<?php
}, 30 );

/* ---------- ابزارها › صداهای مجله: تبدیل به mp3 در مرورگر ---------- */
add_action( 'wp_ajax_tjmc_src', function () {
	if ( ! current_user_can( 'edit_others_posts' ) ) { wp_die( 'no', 403 ); }
	check_ajax_referer( 'tjmc', '_n' );
	$code = isset( $_GET['code'] ) ? sanitize_text_field( wp_unslash( $_GET['code'] ) ) : '';
	$src  = '';
	foreach ( tjmc_items() as $i ) { if ( 'v' === $i['t'] && $i['code'] === $code ) { $src = $i['src']; } }
	if ( ! $src ) { wp_die( 'notfound', 404 ); }
	$r = wp_remote_get( 'https://drive.google.com/uc?export=download&id=' . rawurlencode( $src ), array( 'timeout' => 45, 'redirection' => 6 ) );
	if ( is_wp_error( $r ) || 200 !== (int) wp_remote_retrieve_response_code( $r ) ) { wp_die( 'fetch', 502 ); }
	$body = wp_remote_retrieve_body( $r );
	if ( strlen( $body ) < 500 || 0 === strpos( ltrim( $body ), '<' ) ) { wp_die( 'notaudio', 502 ); }
	nocache_headers();
	header( 'Content-Type: application/octet-stream' );
	header( 'Content-Length: ' . strlen( $body ) );
	echo $body; // phpcs:ignore
	exit;
} );

add_action( 'wp_ajax_tjmc_done', function () {
	if ( ! current_user_can( 'edit_others_posts' ) ) { wp_send_json_error( 'no', 403 ); }
	check_ajax_referer( 'tjmc', '_n' );
	$code = isset( $_POST['code'] ) ? sanitize_text_field( wp_unslash( $_POST['code'] ) ) : '';
	$att  = isset( $_POST['att'] ) ? (int) $_POST['att'] : 0;
	$post = 0;
	foreach ( tjmc_items() as $i ) { if ( 'v' === $i['t'] && $i['code'] === $code ) { $post = (int) $i['post']; } }
	if ( ! $post || ! $att || 'audio/mpeg' !== get_post_mime_type( $att ) ) { wp_send_json_error( 'bad' ); }
	$m = tjmc_audio_map();
	$m[ $code ] = $att;
	update_option( 'tjmc_audio', $m, false );
	wp_update_post( array( 'ID' => $att, 'post_parent' => $post ) );
	tjmc_purge_post( $post );
	wp_send_json_success( array( 'url' => wp_get_attachment_url( $att ) ) );
} );

add_action( 'admin_menu', function () {
	add_management_page( 'صداهای مجله', 'صداهای مجله', 'edit_others_posts', 'tjmc-voices', 'tjmc_admin_page' );
} );

if ( ! function_exists( 'tjmc_pending_voices' ) ) {
function tjmc_pending_voices( $items = null ) {
	$am = tjmc_audio_map();
	$out = array();
	foreach ( ( null === $items ? tjmc_items() : $items ) as $i ) { if ( 'v' === $i['t'] && empty( $am[ $i['code'] ] ) ) { $out[] = $i; } }
	return $out;
}
}

/* شمارندهٔ کار مانده روی منوی ابزارها، تا یادمان نرود */
add_action( 'admin_notices', function () {
	if ( ! current_user_can( 'edit_others_posts' ) ) { return; }
	$scr = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( $scr && 'tools_page_tjmc-voices' === $scr->id ) { return; }
	$n = count( tjmc_pending_voices( get_option( 'tjmc_items_last', array() ) ) );
	if ( $n > 0 ) {
		echo '<div class="notice notice-info"><p>' . esc_html( $n ) . ' صدای تأییدشدهٔ مجله منتظر تبدیل به mp3 است. <a href="' . esc_url( admin_url( 'tools.php?page=tjmc-voices' ) ) . '">تبدیل و انتشار</a></p></div>';
	}
} );


/* تبدیل خودکار در پس‌زمینه: هر بار یک مدیر پیشخوان را باز کند و صدای منتظری باشد، بی‌کلیک تبدیل و منتشر می‌شود */
add_action( 'admin_footer', function () {
	if ( ! current_user_can( 'edit_others_posts' ) ) { return; }
	$scr = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( $scr && 'tools_page_tjmc-voices' === $scr->id ) { return; }
	if ( get_transient( 'tjmc_auto_lock' ) ) { return; }
	$pend = tjmc_pending_voices( get_option( 'tjmc_items_last', array() ) );
	if ( ! $pend ) { return; }
	set_transient( 'tjmc_auto_lock', 1, 5 * MINUTE_IN_SECONDS );
	$codes = array(); foreach ( $pend as $p ) { $codes[] = $p['code']; }
	$cfg = array( 'ajax' => admin_url( 'admin-ajax.php' ), 'n' => wp_create_nonce( 'tjmc' ), 'rest' => esc_url_raw( rest_url( 'wp/v2/media' ) ), 'rn' => wp_create_nonce( 'wp_rest' ), 'codes' => array_slice( $codes, 0, 4 ) );
	echo '<script>window.TJMCA=' . wp_json_encode( $cfg ) . ';</script>';
	?>
<script>
(function(){
var C=window.TJMCA;
function go(){
function toMp3(buf){
	var ac=new (window.AudioContext||window.webkitAudioContext)();
	return ac.decodeAudioData(buf).then(function(dec){
		var sr=44100, len=Math.ceil(dec.duration*sr);
		var oc=new OfflineAudioContext(1,len,sr);
		var s=oc.createBufferSource(); s.buffer=dec;
		var hp=oc.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=80;
		var lp=oc.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=12000;
		var cp=oc.createDynamicsCompressor(); cp.threshold.value=-24; cp.knee.value=12; cp.ratio.value=3; cp.attack.value=0.01; cp.release.value=0.25;
		s.connect(hp); hp.connect(lp); lp.connect(cp); cp.connect(oc.destination); s.start();
		return oc.startRendering();
	}).then(function(out){
		var d=out.getChannelData(0), pk=0, i;
		for(i=0;i<d.length;i++){ var a=Math.abs(d[i]); if(a>pk) pk=a; }
		var g=pk>0 ? 0.95/pk : 1, pcm=new Int16Array(d.length);
		for(i=0;i<d.length;i++){ var v=d[i]*g; v=v>1?1:(v<-1?-1:v); pcm[i]=v<0?v*32768:v*32767; }
		var enc=new lamejs.Mp3Encoder(1,44100,96), parts=[], blk=1152;
		for(i=0;i<pcm.length;i+=blk){ var b=enc.encodeBuffer(pcm.subarray(i,i+blk)); if(b.length) parts.push(new Int8Array(b)); }
		var f=enc.flush(); if(f.length) parts.push(new Int8Array(f));
		return new Blob(parts,{type:'audio/mpeg'});
	});
}

(function next(k){
	if(k>=C.codes.length){return;}
	var code=C.codes[k];
	fetch(C.ajax+'?action=tjmc_src&code='+encodeURIComponent(code)+'&_n='+C.n,{credentials:'same-origin'}).then(function(r){ if(!r.ok){throw new Error('src');} return r.arrayBuffer(); })
	.then(function(buf){ return toMp3(buf); })
	.then(function(blob){ return fetch(C.rest,{method:'POST',credentials:'same-origin',headers:{'X-WP-Nonce':C.rn,'Content-Type':'audio/mpeg','Content-Disposition':'attachment; filename="mag-voice-'+code.toLowerCase()+'.mp3"'},body:blob}); })
	.then(function(r){ return r.json(); })
	.then(function(j){ if(!j){throw new Error('up');} if(!j.id){throw new Error('up');} var fd=new FormData(); fd.append('action','tjmc_done'); fd.append('_n',C.n); fd.append('code',code); fd.append('att',j.id); return fetch(C.ajax,{method:'POST',credentials:'same-origin',body:fd}); })
	.then(function(){ next(k+1); }).catch(function(){ next(k+1); });
})(0);
}
var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js'; s.onload=go; document.body.appendChild(s);
})();
</script>
	<?php
} );

if ( ! function_exists( 'tjmc_admin_page' ) ) {
function tjmc_admin_page() {
	$items = tjmc_items( true );
	$am    = tjmc_audio_map();
	echo '<div class="wrap" dir="rtl"><h1>صداهای مجله</h1><p>صداهایی که سردبیر در بات تأیید کرده اینجا می‌آیند. «تبدیل و انتشار» فایل را در همین مرورگر نویزگیری سبک، هم‌سطح و mp3 می‌کند، در رسانه‌ها بارگذاری می‌کند و روی مقاله می‌گذارد.</p>';
	echo '<table class="widefat striped" id="tjmc-t"><thead><tr><th>کد</th><th>مقاله</th><th>نویسنده</th><th>تاریخ تأیید</th><th>وضعیت</th></tr></thead><tbody>';
	$n = 0;
	foreach ( $items as $i ) {
		if ( 'v' !== $i['t'] ) { continue; }
		$n++;
		$done = ! empty( $am[ $i['code'] ] );
		echo '<tr data-code="' . esc_attr( $i['code'] ) . '" data-done="' . ( $done ? 1 : 0 ) . '" data-name="' . esc_attr( $i['name'] ) . '"><td>' . esc_html( $i['code'] ) . '</td><td><a href="' . esc_url( get_permalink( $i['post'] ) ) . '" target="_blank">' . esc_html( get_the_title( $i['post'] ) ) . '</a></td><td>' . esc_html( $i['name'] ) . '</td><td>' . esc_html( $i['date'] ) . '</td><td class="st">' . ( $done ? '✅ منتشر شده' : '⏳ منتظر تبدیل' ) . '</td></tr>';
	}
	if ( ! $n ) { echo '<tr><td colspan="5">هنوز صدای تأییدشده‌ای نیست.</td></tr>'; }
	echo '</tbody></table><p><button class="button button-primary" id="tjmc-go">تبدیل و انتشار همهٔ صداهای منتظر</button> <span id="tjmc-log"></span></p></div>';
	$cfg = array( 'ajax' => admin_url( 'admin-ajax.php' ), 'n' => wp_create_nonce( 'tjmc' ), 'rest' => esc_url_raw( rest_url( 'wp/v2/media' ) ), 'rn' => wp_create_nonce( 'wp_rest' ) );
	echo '<script>window.TJMC=' . wp_json_encode( $cfg ) . ';</script>';
	echo '<script src="https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js"></script>';
	echo '<script>if(!window.lamejs){document.write(\'<script src="https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js"><\\/script>\');}</script>';
	?>
<script>
(function(){
var C=window.TJMC, logEl=document.getElementById('tjmc-log');
function log(s){ logEl.textContent=s; }
function toMp3(buf){
	var ac=new (window.AudioContext||window.webkitAudioContext)();
	return ac.decodeAudioData(buf).then(function(dec){
		var sr=44100, len=Math.ceil(dec.duration*sr);
		var oc=new OfflineAudioContext(1,len,sr);
		var s=oc.createBufferSource(); s.buffer=dec;
		var hp=oc.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=80;
		var lp=oc.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=12000;
		var cp=oc.createDynamicsCompressor(); cp.threshold.value=-24; cp.knee.value=12; cp.ratio.value=3; cp.attack.value=0.01; cp.release.value=0.25;
		s.connect(hp); hp.connect(lp); lp.connect(cp); cp.connect(oc.destination); s.start();
		return oc.startRendering();
	}).then(function(out){
		var d=out.getChannelData(0), pk=0, i;
		for(i=0;i<d.length;i++){ var a=Math.abs(d[i]); if(a>pk) pk=a; }
		var g=pk>0 ? 0.95/pk : 1, pcm=new Int16Array(d.length);
		for(i=0;i<d.length;i++){ var v=d[i]*g; v=v>1?1:(v<-1?-1:v); pcm[i]=v<0?v*32768:v*32767; }
		var enc=new lamejs.Mp3Encoder(1,44100,96), parts=[], blk=1152;
		for(i=0;i<pcm.length;i+=blk){ var b=enc.encodeBuffer(pcm.subarray(i,i+blk)); if(b.length) parts.push(new Int8Array(b)); }
		var f=enc.flush(); if(f.length) parts.push(new Int8Array(f));
		return new Blob(parts,{type:'audio/mpeg'});
	});
}
function one(tr){
	var code=tr.getAttribute('data-code'), st=tr.querySelector('.st');
	st.textContent='⏬ دریافت…';
	return fetch(C.ajax+'?action=tjmc_src&code='+encodeURIComponent(code)+'&_n='+C.n,{credentials:'same-origin'}).then(function(r){ if(!r.ok) throw new Error('دریافت ناموفق ('+r.status+')'); return r.arrayBuffer(); })
	.then(function(buf){ st.textContent='🎚 تبدیل…'; return toMp3(buf); })
	.then(function(blob){ st.textContent='⏫ بارگذاری…';
		return fetch(C.rest,{method:'POST',credentials:'same-origin',headers:{'X-WP-Nonce':C.rn,'Content-Type':'audio/mpeg','Content-Disposition':'attachment; filename="mag-voice-'+code.toLowerCase()+'.mp3"'},body:blob}); })
	.then(function(r){ return r.json(); })
	.then(function(j){ if(!j || !j.id) throw new Error('بارگذاری ناموفق');
		var fd=new FormData(); fd.append('action','tjmc_done'); fd.append('_n',C.n); fd.append('code',code); fd.append('att',j.id);
		return fetch(C.ajax,{method:'POST',credentials:'same-origin',body:fd}).then(function(r){ return r.json(); }); })
	.then(function(j){ if(!j || !j.success) throw new Error('ثبت ناموفق'); st.textContent='✅ منتشر شد'; tr.setAttribute('data-done','1'); })
	.catch(function(e){ st.textContent='⚠️ '+e.message; });
}
document.getElementById('tjmc-go').addEventListener('click',function(){
	if(!window.lamejs){ log('کتابخانهٔ mp3 بار نشد؛ صفحه را دوباره باز کنید.'); return; }
	var rows=[].slice.call(document.querySelectorAll('#tjmc-t tr[data-done="0"]')), k=0;
	if(!rows.length){ log('صدای منتظری نیست.'); return; }
	(function next(){ if(k>=rows.length){ log('تمام شد.'); return; } log((k+1)+' از '+rows.length); one(rows[k++]).then(next); })();
});
})();
</script>
	<?php
}
}
