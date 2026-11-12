/**
 * G9 · فیلد راز گیرندهٔ فرم‌های پل در «تنظیمات › عمومی» (لین A، ۲۱ آبان ۱۴۰۵).
 * مقدار هرگز نمایش داده نمی‌شود؛ خالی گذاشتن یعنی «عوض نکن».
 */
if ( ! defined( 'ABSPATH' ) ) { return; }
add_action( 'admin_init', function () {
	register_setting( 'general', 'tj_g9_intake_secret', array(
		'type'              => 'string',
		'show_in_rest'      => false,
		'sanitize_callback' => function ( $v ) {
			$v = trim( (string) $v );
			return '' === $v ? (string) get_option( 'tj_g9_intake_secret', '' ) : $v;
		},
	) );
	add_settings_field( 'tj_g9_intake_secret', 'راز فرم‌های سایت (پل)', function () {
		$has = '' !== (string) get_option( 'tj_g9_intake_secret', '' );
		echo '<input type="password" name="tj_g9_intake_secret" value="" autocomplete="off" class="regular-text" placeholder="' . ( $has ? 'تنظیم شده؛ برای عوض کردن بنویسید' : 'هنوز تنظیم نشده' ) . '">';
		$fp = $has ? substr( hash( 'sha256', trim( (string) get_option( 'tj_g9_intake_secret', '' ) ) ), 0, 8 ) : '';
		echo '<p class="description">همان مقدار BRIDGE_SITE_FORMS_INTAKE_SECRET در گیت‌لب. نمایش داده نمی‌شود.' . ( $fp ? ' اثر انگشت: <code>' . esc_html( $fp ) . '</code>' : '' ) . '</p>';
	}, 'general' );
} );
