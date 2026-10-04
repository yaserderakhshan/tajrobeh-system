/* Tajrobeh — nofollow روی لینک‌های «ورود به پلتفرم» داخل محتوای مقاله‌ها.
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
	$repl = array(
		'<a href="https://tajrobeh.life/login" rel="nofollow">',
		'<a href="https://tajrobeh.life/login" rel="nofollow">',
		'<a href="/login" rel="nofollow">'
	);
	return str_replace( $find, $repl, $content );
}, 25 );