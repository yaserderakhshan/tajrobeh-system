/* Tajrobeh: لینک‌های «ورود به پلتفرم» داخل محتوای مقاله‌ها.
   ۱۴ مهر ۱۴۰۵ (درگاه‌های ورودی، بند ۵): /login کنار رفت؛ همین بنرها حالا به /get-therapy/ با منبع mag-banner می‌روند.
   ۲۱ شهریور ۱۴۰۵. بنرهای قدیمی داخل ده‌ها مقاله به /login لینک می‌دهند و آن آدرس
   یک اپ Next.js پشت لاگین است که نباید اعتبار سئو بگیرد یا ایندکس شود.
   هدر و فوتر و دکمهٔ شناور جداگانه اصلاح شده‌اند. */
add_filter( 'the_content', function ( $content ) {
	if ( strpos( $content, '/login' ) === false ) {
		return $content;
	}
	$find = array(
		'<a href="https://tajrobeh.life/login">',
		'<a href="http://tajrobeh.life/login">',
		'<a href="/login">'
	);
	$to   = '<a href="/get-therapy/?src=mag-banner" data-cta="mag.banner.start">';
	$repl = array( $to, $to, $to );
	$find[] = '<a href="https://tajrobeh.life/login" rel="nofollow">';
	$find[] = '<a href="/login" rel="nofollow">';
	$repl[] = $to;
	$repl[] = $to;
	return str_replace( $find, $repl, $content );
}, 25 );