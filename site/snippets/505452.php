/* Tajrobeh school calendar feed (ICS) — reads the event data embedded in /school/events/ (page 505409)
   URL: /wp-json/tj/v1/calendar.ics   optional ?c=pub | CLIN-۱۴ | EFT | MODERN */
/* v162: رویدادهایی که از بات تعریف می‌شوند (هاب مدرسه) — از API بات، با کش ۲۰ دقیقه و پشتیبان آخرین نسخهٔ سالم */
if ( ! function_exists( 'tj_school_live_events' ) ) {
function tj_school_live_events() {
	$key = 'tj_live_events_v1';
	$c = get_transient( $key );
	if ( false !== $c ) { return $c; }
	$url = 'https://script.google.com/macros/s/AKfycbxD-DYhZ9LFjwB9az_DpMprzF_ItJkdad_DutMGPk1qY3ksBb45aMHYZBsXTCepYhsC8Q/exec?api=events';
	$r = wp_remote_get( $url, array( 'timeout' => 12, 'redirection' => 5 ) );
	$ok = false; $out = array();
	if ( ! is_wp_error( $r ) && 200 === (int) wp_remote_retrieve_response_code( $r ) ) {
		$j = json_decode( wp_remote_retrieve_body( $r ), true );
		if ( is_array( $j ) && ! empty( $j['ok'] ) && isset( $j['events'] ) && is_array( $j['events'] ) ) {
			$ok = true;
			$keep = array( 'code', 'title', 'topic', 'dateIso', 'time', 'kind', 'presenter', 'register', 'poster', 'instagram', 'intro', 'perm', 'rec', 'highlights', 'stage', 'slug', 'desc', 'botLink', 'contribLink', 'access', 'mins', 'place', 'feedbackLink' );
			foreach ( $j['events'] as $e ) {
				if ( ! is_array( $e ) || empty( $e['code'] ) || empty( $e['dateIso'] ) ) { continue; }
				$o = array();
				foreach ( $keep as $k ) { if ( isset( $e[ $k ] ) ) { $o[ $k ] = is_bool( $e[ $k ] ) ? $e[ $k ] : ( is_numeric( $e[ $k ] ) ? $e[ $k ] + 0 : wp_strip_all_tags( (string) $e[ $k ] ) ); } }
				$o['feedback'] = array();
				if ( ! empty( $e['feedback'] ) && is_array( $e['feedback'] ) ) {
					foreach ( array_slice( $e['feedback'], 0, 12 ) as $f ) {
						$o['feedback'][] = array( 'name' => wp_strip_all_tags( (string) ( isset( $f['name'] ) ? $f['name'] : '' ) ), 'text' => wp_strip_all_tags( (string) ( isset( $f['text'] ) ? $f['text'] : '' ) ), 'voice' => esc_url_raw( (string) ( isset( $f['voice'] ) ? $f['voice'] : '' ) ) );
					}
				}
				$out[] = $o;
			}
		}
	}
	if ( $ok ) { update_option( 'tj_live_events_last', $out, false ); set_transient( $key, $out, 20 * MINUTE_IN_SECONDS ); return $out; }
	$out = get_option( 'tj_live_events_last', array() );
	set_transient( $key, $out, 5 * MINUTE_IN_SECONDS );
	return is_array( $out ) ? $out : array();
}
}
if ( ! function_exists( 'tj_school_ics_build' ) ) {
function tj_school_ics_build( $c ) {
	$p = get_post( 505409 );
	if ( ! $p ) { return ''; }
	if ( ! preg_match( '#<script type="application/json" id="evData">(.*?)</script>#s', $p->post_content, $m ) ) { return ''; }
	$d = json_decode( str_replace( '<\/', '</', $m[1] ), true );
	if ( ! is_array( $d ) || empty( $d['events'] ) ) { return ''; }
	$esc = function ( $s ) { return str_replace( array( "\\", ';', ',', "\r", "\n" ), array( "\\\\", '\;', '\,', '', '\n' ), (string) $s ); };
	$fold = function ( $line ) {
		$out = '';
		while ( strlen( $line ) > 73 ) {
			$cut = 73;
			while ( $cut > 0 && ( ord( $line[ $cut ] ) & 0xC0 ) === 0x80 ) { $cut--; }
			$out .= substr( $line, 0, $cut ) . "\r\n ";
			$line = substr( $line, $cut );
		}
		return $out . $line;
	};
	$tz  = new DateTimeZone( '+03:30' );
	$utc = new DateTimeZone( 'UTC' );
	$now = gmdate( 'Ymd\THis\Z' );
	$min = gmdate( 'Y-m-d', time() - 400 * DAY_IN_SECONDS );
	$name = 'مدرسهٔ تجربه';
	if ( $c === 'pub' ) { $name .= ' · برنامه‌های باز'; } elseif ( $c !== '' ) { $name .= ' · ' . $c; }
	$L = array( 'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//tajrobeh.life//school events//FA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
		'X-WR-CALNAME:' . $esc( $name ), 'X-WR-CALDESC:' . $esc( 'تقویم برنامه‌های مدرسهٔ تجربه · tajrobeh.life/school/events' ),
		'X-WR-TIMEZONE:Asia/Tehran', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H' );
	foreach ( $d['events'] as $e ) {
		if ( ! empty( $e['x'] ) || empty( $e['d'] ) || $e['d'] < $min ) { continue; }
		$ci = isset( $e['ci'] ) ? $e['ci'] : '';
		if ( $c === 'pub' && $e['a'] === 'members' ) { continue; }
		if ( $c !== '' && $c !== 'pub' && $e['a'] === 'members' && $e['c'] !== 'SCH' ) {
			if ( $ci !== '' ? $ci !== $c : $e['c'] !== $c ) { continue; }
		}
		$L[] = 'BEGIN:VEVENT';
		$L[] = 'UID:' . $e['i'] . '@tajrobeh.life';
		$L[] = 'DTSTAMP:' . $now;
		if ( ! empty( $e['t'] ) ) {
			try { $st = new DateTime( $e['d'] . ' ' . $e['t'], $tz ); } catch ( Exception $ex ) { continue; }
			$en = clone $st;
			$en->modify( '+' . ( ! empty( $e['m'] ) ? (int) $e['m'] : 90 ) . ' minutes' );
			$st->setTimezone( $utc ); $en->setTimezone( $utc );
			$L[] = 'DTSTART:' . $st->format( 'Ymd\THis\Z' );
			$L[] = 'DTEND:' . $en->format( 'Ymd\THis\Z' );
		} else {
			$day = str_replace( '-', '', $e['d'] );
			$L[] = 'DTSTART;VALUE=DATE:' . $day;
			$L[] = 'DTEND;VALUE=DATE:' . gmdate( 'Ymd', strtotime( $e['d'] . ' +1 day' ) );
		}
		$sum = $e['ttl'] . ( $ci !== '' ? ' · ' . $ci : '' );
		$desc = ( ! empty( $e['s'] ) ? $e['s'] . "\n" : '' );
		if ( ! empty( $e['p'] ) && ! empty( $d['P'] ) ) {
			$nm = array();
			foreach ( $e['p'] as $k ) { if ( isset( $d['P'][ $k ][0] ) ) { $nm[] = $d['P'][ $k ][0]; } }
			if ( $nm ) { $desc .= implode( '، ', $nm ) . "\n"; }
		}
		$url = 'https://tajrobeh.life/school/events/#ev=' . $e['i'];
		$desc .= $url;
		$L[] = $fold( 'SUMMARY:' . $esc( $sum ) );
		$L[] = $fold( 'DESCRIPTION:' . $esc( $desc ) );
		if ( ! empty( $e['pl'] ) ) { $L[] = $fold( 'LOCATION:' . $esc( $e['pl'] ) ); }
		if ( ! empty( $e['g'] ) && isset( $d['G'][ $e['g'] ][0] ) ) { $L[] = $fold( 'CATEGORIES:' . $esc( $d['G'][ $e['g'] ][0] ) ); }
		$L[] = 'URL:' . $url;
		$L[] = 'END:VEVENT';
	}
	$have = array();
	foreach ( $d['events'] as $e0 ) { if ( ! empty( $e0['i'] ) ) { $have[ $e0['i'] ] = 1; } }
	foreach ( tj_school_live_events() as $e ) {
		if ( isset( $have[ $e['code'] ] ) || $e['dateIso'] < $min ) { continue; }
		$members = ( isset( $e['access'] ) && false !== strpos( (string) $e['access'], 'دانشجویان' ) );
		if ( $c === 'pub' && $members ) { continue; }
		$L[] = 'BEGIN:VEVENT';
		$L[] = 'UID:' . $e['code'] . '@tajrobeh.life';
		$L[] = 'DTSTAMP:' . $now;
		if ( ! empty( $e['time'] ) ) {
			try { $st = new DateTime( $e['dateIso'] . ' ' . $e['time'], $tz ); } catch ( Exception $ex ) { continue; }
			$en = clone $st; $en->modify( '+' . ( ! empty( $e['mins'] ) ? (int) $e['mins'] : 90 ) . ' minutes' );
			$st->setTimezone( $utc ); $en->setTimezone( $utc );
			$L[] = 'DTSTART:' . $st->format( 'Ymd\THis\Z' );
			$L[] = 'DTEND:' . $en->format( 'Ymd\THis\Z' );
		} else {
			$L[] = 'DTSTART;VALUE=DATE:' . str_replace( '-', '', $e['dateIso'] );
			$L[] = 'DTEND;VALUE=DATE:' . gmdate( 'Ymd', strtotime( $e['dateIso'] . ' +1 day' ) );
		}
		$url = 'https://tajrobeh.life/school/events/#ev=' . $e['code'];
		$desc = ( ! empty( $e['desc'] ) ? $e['desc'] . "\n" : '' ) . ( ! empty( $e['presenter'] ) ? $e['presenter'] . "\n" : '' ) . ( ! empty( $e['access'] ) ? $e['access'] . "\n" : '' ) . $url;
		$L[] = $fold( 'SUMMARY:' . $esc( $e['title'] ) );
		$L[] = $fold( 'DESCRIPTION:' . $esc( $desc ) );
		if ( ! empty( $e['place'] ) ) { $L[] = $fold( 'LOCATION:' . $esc( $e['place'] ) ); }
		$L[] = 'URL:' . $url;
		$L[] = 'END:VEVENT';
	}
	$L[] = 'END:VCALENDAR';
	return implode( "\r\n", $L ) . "\r\n";
}
}
add_action( 'rest_api_init', function () {
	$cb = function ( $req ) {
		$c   = trim( (string) $req->get_param( 'c' ) );
		$c   = preg_replace( '/[^\p{L}\p{N}\/\-]/u', '', $c );
		$key = 'tj_ics_' . md5( $c . '|' . get_post_modified_time( 'U', true, 505409 ) );
		$out = get_transient( $key );
		if ( false === $out ) {
			$out = tj_school_ics_build( $c );
			set_transient( $key, $out, 30 * MINUTE_IN_SECONDS );
		}
		if ( ! headers_sent() ) {
			header( 'Content-Type: text/calendar; charset=utf-8' );
			header( 'Content-Disposition: inline; filename="tajrobeh-school.ics"' );
			header( 'Cache-Control: public, max-age=1800' );
			header( 'Access-Control-Allow-Origin: *' );
		}
		echo $out;
		exit;
	};
	register_rest_route( 'tj/v1', '/events-live', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function () {
		$res = new WP_REST_Response( array( 'ok' => true, 'events' => tj_school_live_events() ) );
		$res->header( 'Cache-Control', 'public, max-age=600' );
		return $res;
	} ) );
	foreach ( array( '/calendar', '/calendar\.ics' ) as $r ) {
		register_rest_route( 'tj/v1', $r, array( 'methods' => 'GET', 'callback' => $cb, 'permission_callback' => '__return_true' ) );
	}
} );
