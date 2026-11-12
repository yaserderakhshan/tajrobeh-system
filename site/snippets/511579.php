/**
 * G9 · فرم‌های سایت به گیرندهٔ یگانهٔ پل (POST /v2/reception/site-forms/{formId}/entries)
 * لین A · ۲۱ آبان ۱۴۰۵. کنار اسنیپت 501143 (شیت پذیرش) کار می‌کند و جایش را نمی‌گیرد.
 * راز در گزینهٔ tj_g9_intake_secret (autoload خاموش) است؛ هیچ‌جا چاپ نمی‌شود. بی راز، کاری نمی‌کند.
 * داده‌ی شخصی فقط به پل می‌رود؛ لاگ فقط شماره‌ی فرم، شماره‌ی ورودی و کد پاسخ.
 */
if ( ! defined( 'ABSPATH' ) ) { return; }

function tj_g9_send( $entryId, $formData, $form ) {
	static $done = array();
	if ( isset( $done[ $entryId ] ) ) { return; }
	$done[ $entryId ] = true;
	$form_id = isset( $form->id ) ? (int) $form->id : 0;
	if ( $form_id < 1 || in_array( $form_id, array( 1, 2, 4 ), true ) ) { return; }
	$secret = (string) get_option( 'tj_g9_intake_secret', '' );
	if ( '' === $secret ) { return; }
	$body = is_array( $formData ) ? $formData : array();
	foreach ( array_keys( $body ) as $k ) {
		if ( 0 === strpos( (string) $k, '_fluentform_' ) || '_wp_http_referer' === $k ) { unset( $body[ $k ] ); }
	}
	$body['entry_id'] = (string) $entryId;
	$r = wp_remote_post( 'https://bridge.tajrobeh.life/api/v2/reception/site-forms/' . $form_id . '/entries', array(
		'timeout'     => 6,
		'redirection' => 0,
		'headers'     => array( 'Content-Type' => 'application/json', 'Tajrobeh-Intake-Secret' => $secret ),
		'body'        => wp_json_encode( $body ),
	) );
	$code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
	$log  = get_option( 'tj_g9_log', array() );
	if ( ! is_array( $log ) ) { $log = array(); }
	array_unshift( $log, array( 't' => time(), 'f' => $form_id, 'e' => (string) $entryId, 'c' => $code ) );
	update_option( 'tj_g9_log', array_slice( $log, 0, 50 ), false );
}
add_action( 'fluentform/submission_inserted', 'tj_g9_send', 30, 3 );
