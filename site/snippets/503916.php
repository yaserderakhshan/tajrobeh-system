add_action( 'wp_head', function () {
	$tj = array(
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
	);
	if ( ! is_page( array_values( $tj ) ) ) {
		return;
	}
	foreach ( $tj as $tj_lang => $tj_id ) {
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