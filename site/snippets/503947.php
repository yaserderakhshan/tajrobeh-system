/* Tajrobeh — خط تست در جعبهٔ پایان مقاله.
   ۲۱ شهریور ۱۴۰۵، دو تغییر:
   ۱) از تزریق با جاوااسکریپت به رندر سمت سرور تغییر کرد. لینک جاوااسکریپتی را
      خزندهٔ مدل‌های زبانی اجرا نمی‌کند و گوگل هم دیرتر می‌بیند؛ صفحهٔ
      /tests/therapy-style/ به همین دلیل «کشف‌شده ولی ایندکس‌نشده» مانده بود.
   ۲) محدودیت دسته برداشته شد. هر ۲۶۷ مقاله جعبهٔ tj-cta را دارند و
      ترافیک معرفی فیلم و کتاب و پادکست بیشترین ایمپرشن بی‌تبدیل را می‌آورد؛
      همان‌جا بیشترین جای مناسب برای یک لید مگنت رایگان است. */
add_filter( 'the_content', function ( $content ) {
	if ( ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) {
		return $content;
	}
	if ( strpos( $content, 'tj-cta-test' ) !== false ) {
		return $content;
	}
	$marker = '<!-- /tj-cta -->';
	$mpos = strpos( $content, $marker );
	if ( $mpos === false ) {
		return $content;
	}
	$dpos = strrpos( substr( $content, 0, $mpos ), '</div>' );
	if ( $dpos === false ) {
		return $content;
	}
	$html  = '<p class="tj-cta-test" style="margin:16px 0 0;font-size:14px;color:#676768;line-height:2.1">';
	$html .= 'نمی‌دانید چه نوع تراپی به شما می‌خورد؟ ';
	$html .= '<a href="/tests/therapy-style/" style="color:#8e2d34;text-decoration:none;border-bottom:1px solid #eec3c7">تست سبک درمانی من</a>';
	$html .= ' رایگان است، ثبت‌نام نمی‌خواهد و دو دقیقه طول می‌کشد. ';
	$html .= '<a href="/tests/" style="color:#8e2d34;text-decoration:none;border-bottom:1px solid #eec3c7">بقیهٔ تست‌های رایگان</a>';
	$html .= '</p>';
	return substr( $content, 0, $dpos ) . $html . substr( $content, $dpos );
}, 20 );