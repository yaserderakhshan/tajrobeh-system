add_action('init', function () {
	if ( is_admin() || wp_doing_ajax() ) { return; } // ۲۱ آبان: برای کاربر واردشده هم به پل برود، نه ورود وردپرس
	$p = trim( (string) parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/' );
	if ( in_array( $p, array( 'login', 'dashboard', 'panel' ), true ) ) {
		wp_redirect( 'https://bridge.tajrobeh.life/', 302 );
		exit;
	}
}, 1);