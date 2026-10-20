function tajrobeh_hreflang_cluster() {
	return array(
		'fa'    => 500984,
		'fa-DE' => 503820,
		'fa-CA' => 503821,
		'fa-US' => 503822,
		'fa-GB' => 503823,
		'fa-AU' => 503824,
		'fa-NZ' => 505719,
		'fa-NL' => 503825,
		'fa-SE' => 503826,
		'fa-TR' => 503827,
		'en'    => 503836,
		'en-DE' => 505396,
		'en-GB' => 507253,
		'en-CA' => 507259,
		'en-US' => 507260,
		'de'    => 507263,
	);
}
add_action( 'wp_head', function () {
	$tj = tajrobeh_hreflang_cluster();
	if ( ! is_page( array_values( $tj ) ) ) {
		return;
	}
	foreach ( $tj as $tj_lang => $tj_id ) {
		if ( 'publish' !== get_post_status( $tj_id ) ) {
			continue;
		}
		$tj_url = get_permalink( $tj_id );
		if ( $tj_url ) {
			echo '<link rel="alternate" hreflang="' . esc_attr( $tj_lang ) . '" href="' . esc_url( $tj_url ) . '" />' . "\n";
		}
	}
	$tj_default = get_permalink( 500984 );
	if ( $tj_default ) {
		echo '<link rel="alternate" hreflang="x-default" href="' . esc_url( $tj_default ) . '" />' . "\n";
	}
}, 5 );
/* زبان سند برای برگه‌های انگلیسی و آلمانی همین خوشه (فقط lang؛ dir دست نمی‌خورد تا هدر فارسی سالم بماند) */
add_filter( 'language_attributes', function ( $output ) {
	if ( is_admin() || ! is_page() ) {
		return $output;
	}
	$tj   = tajrobeh_hreflang_cluster();
	$id   = get_queried_object_id();
	$lang = array_search( $id, $tj, true );
	if ( false === $lang || 0 === strpos( $lang, 'fa' ) ) {
		return $output;
	}
	return preg_replace( '/lang="[^"]*"/', 'lang="' . esc_attr( $lang ) . '"', $output );
} );

/* زبان برگه برای بقیهٔ اسنیپت‌ها (۲۸ مهر ۱۴۰۵): برگه‌ای که در خوشه نیست یا fa-* است، fa برمی‌گرداند؛ وگرنه en یا de. ویجت‌ها و نوار پیشنهاد از همین می‌خوانند. */
if ( ! function_exists( 'tajrobeh_page_lang' ) ) {
	function tajrobeh_page_lang( $id = 0 ) {
		$id = $id ? (int) $id : (int) get_queried_object_id();
		if ( ! $id ) {
			return 'fa';
		}
		$lang = array_search( $id, tajrobeh_hreflang_cluster(), true );
		if ( false === $lang || 0 === strpos( $lang, 'fa' ) ) {
			return 'fa';
		}
		return strtolower( substr( $lang, 0, 2 ) );
	}
}
/* لینک پرش به محتوا (skip link قالب) روی برگه‌های انگلیسی و آلمانی به زبان خود برگه */
add_filter( 'gettext', function ( $t, $text, $domain ) {
	if ( 'Skip to content' !== $text || is_admin() || ! did_action( 'wp' ) ) {
		return $t;
	}
	$l = tajrobeh_page_lang();
	if ( 'de' === $l ) {
		return 'Zum Inhalt springen';
	}
	if ( 'en' === $l ) {
		return 'Skip to content';
	}
	return $t;
}, 10, 3 );
