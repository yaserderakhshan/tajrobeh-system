/**
 * TJ Mag Home v2 — صفحه‌ی مجله‌ی تجربه
 * WPCode PHP snippet. Insert: Auto Insert / Frontend Only.
 * خروجی فقط روی برگه‌ی ۲۸۷ (/mag/) جای گروه main.tjm می‌نشیند.
 * شورت‌کد [tj_mag_home] هم برای تست در هر برگه‌ای در دسترس است.
 */

if ( ! defined( 'ABSPATH' ) ) { return; }

/* ---------- داده‌های قابل ویرایش ---------- */

function tj_mag_cats() {
	return array(
		'psy'    => 10, // روانکاوی
		'ther'   => 9,  // روان‌درمانی
		'film'   => 18, // معرفی فیلم
		'book'   => 19, // معرفی کتاب
		'note'   => 8,  // دست‌نوشته‌ها
		'life'   => 12, // سبک زندگی
		'people' => 5,  // چهره‌ها
		'lit'    => 4,  // ادبیات
		'kid'    => 13, // کودک و نوجوان
		'art'    => 20, // مقاله
	);
}

/**
 * قلاب‌ها — جمله‌های واقعی و عیناً برداشته‌شده از خود مقاله‌ها.
 * q باید دقیقاً در متن نوشته باشد. برای افزودن، یک ردیف اضافه کنید.
 */
function tj_mag_hooks() {
	return array(
		array( 'p' => 260, 'q' => 'زخم همیشه از درون می‌آید، اما بیرون را لکه‌دار می‌کند.' ),
		array( 'p' => 259, 'q' => 'فراموشی برای یادگیری ضروری است.' ),
		array( 'p' => 269, 'q' => 'آیا شرّ، زاده می‌شود یا پرورانده می‌شود؟' ),
		array( 'p' => 275, 'q' => 'چرا باز هم احساس می‌کنم کافی نیستم؟' ),
		array( 'p' => 216, 'q' => 'چرا همیشه ما عاشق افراد «اشتباه» می‌شویم؟' ),
		array( 'p' => 220, 'q' => 'تغییر ناگهانی و غیرمنتظره یگانه چیزی است که شایسته‌ی روایت است.' ),
		array( 'p' => 152, 'q' => 'محله کودکی‌اش دیگر وجود خارجی ندارد.' ),
		array( 'p' => 242, 'q' => 'آیا فراموشی به معنای از بین رفتن محتواست؟ یا فقط به شکل دیگری بازمی‌گردد؟' ),
		array( 'p' => 214, 'q' => 'فقدان روانکاو حس گم‌گشتگی و مالیخولیایی را در مراجع برمی‌انگیزد.' ),
		array( 'p' => 108, 'q' => 'وقتی در جمع حضور پیدا می‌کنید، خود را چگونه نشان می‌دهید؟' ),
		array( 'p' => 279, 'q' => 'آیا می‌توان مادری را فراتر از کلیشه‌های فداکاری و عشق بی‌پایان درک کرد؟' ),
		array( 'p' => 267, 'q' => 'چرا هنوز هم دیدن برخی چیزها یا مواجهه با آن‌ها باعث ترس و نگرانی در ما می‌شود؟' ),
		array( 'p' => 261, 'q' => 'ترکیبی از تصویر، متن و کنایه که می‌تواند در یک چشم‌به‌هم‌زدن بخنداند، بسوزاند، افشا کند' ),
		array( 'p' => 274, 'q' => 'حوادث بیرونی تنها سطحی از واقعیتند' ),
	);
}

/** پیشنهادهای جست‌وجو */
function tj_mag_seeds() {
	return array( 'اضطراب', 'رویا', 'مادر', 'لکان', 'سینما', 'عشق', 'کودک', 'بدن', 'فروید', 'سوگ' );
}

/**
 * تقویم روان — مناسبت‌ها بر پایه‌ی تاریخ میلادی (ماه-روز).
 * p = شناسه‌ی نوشته‌ی مرتبط.
 */
function tj_mag_calendar() {
	return array(
		array( 'md' => '01-01', 't' => 'آغاز سال میلادی',              'p' => 275 ),
		array( 'md' => '02-14', 't' => 'روز ولنتاین',                   'p' => 199 ),
		array( 'md' => '02-26', 't' => 'زادروز جان بالبی',              'p' => 141 ),
		array( 'md' => '03-08', 't' => 'روز جهانی زن',                  'p' => 258 ),
		array( 'md' => '03-20', 't' => 'نوروز',                         'p' => 170 ),
		array( 'md' => '03-21', 't' => 'نوروز',                         'p' => 170 ),
		array( 'md' => '03-30', 't' => 'زادروز ملانی کلاین',            'p' => 31 ),
		array( 'md' => '04-02', 't' => 'روز جهانی آگاهی از اوتیسم',     'p' => 272 ),
		array( 'md' => '04-07', 't' => 'زادروز دونالد وینیکات',         'p' => 66 ),
		array( 'md' => '04-13', 't' => 'زادروز ژاک لکان',               'p' => 19 ),
		array( 'md' => '04-23', 't' => 'روز جهانی کتاب',                'p' => 119 ),
		array( 'md' => '05-03', 't' => 'زادروز هاینتس کوهات',           'p' => 43 ),
		array( 'md' => '05-06', 't' => 'زادروز زیگموند فروید',          'p' => 40 ),
		array( 'md' => '06-01', 't' => 'روز جهانی کودک',                'p' => 215 ),
		array( 'md' => '06-13', 't' => 'زادروز اروین یالوم',            'p' => 133 ),
		array( 'md' => '07-26', 't' => 'زادروز کارل گوستاو یونگ',       'p' => 52 ),
		array( 'md' => '09-08', 't' => 'زادروز ویلفرد بیون',            'p' => 142 ),
		array( 'md' => '09-09', 't' => 'سالروز درگذشت ژاک لکان',        'p' => 193 ),
		array( 'md' => '09-16', 't' => 'زادروز کارن هورنای',            'p' => 144 ),
		array( 'md' => '09-23', 't' => 'سالروز درگذشت زیگموند فروید',   'p' => 169 ),
		array( 'md' => '10-10', 't' => 'روز جهانی سلامت روان',          'p' => 281 ),
		array( 'md' => '10-14', 't' => 'زادروز هانا آرنت',              'p' => 148 ),
		array( 'md' => '11-25', 't' => 'روز جهانی محو خشونت علیه زنان', 'p' => 117 ),
		array( 'md' => '12-03', 't' => 'زادروز آنا فروید',              'p' => 103 ),
		array( 'md' => '12-21', 't' => 'شب یلدا',                       'p' => 208 ),
	);
}

/** مسیرهای مطالعه */
function tj_mag_paths() {
	return array(
		array(
			't'  => 'روانکاوی از صفر',
			'd'  => 'اگر تا حالا هیچ متن روانکاوی نخوانده‌اید.',
			'ids' => array( 194, 192, 16, 235, 229, 250, 263 ),
		),
		array(
			't'  => 'از فروید تا لکان',
			'd'  => 'خط اصلی نظریه، از تعبیر رویا تا بازگشت لکان به فروید.',
			'ids' => array( 40, 67, 19, 191, 25, 195 ),
		),
		array(
			't'  => 'مادر، کودک، ابژه',
			'd'  => 'مکتب بریتانیایی؛ جایی که رابطه جای غریزه را گرفت.',
			'ids' => array( 31, 162, 66, 232, 189, 268 ),
		),
		array(
			't'  => 'در اتاق درمان',
			'd'  => 'برای کسی که می‌خواهد بداند داخل آن اتاق چه می‌گذرد.',
			'ids' => array( 281, 209, 205, 244, 204, 283 ),
		),
	);
}

/** قرن روانکاوی */
function tj_mag_figures() {
	return array(
		array( 'p' => 40,  'n' => 'زیگموند فروید',    'b' => 1856, 'd' => 1939, 'lane' => 1, 'w' => 'بنیان‌گذار روانکاوی' ),
		array( 'p' => 52,  'n' => 'کارل گوستاو یونگ', 'b' => 1875, 'd' => 1961, 'lane' => 1, 'w' => 'ناخودآگاه جمعی' ),
		array( 'p' => 31,  'n' => 'ملانی کلاین',      'b' => 1882, 'd' => 1960, 'lane' => 2, 'w' => 'روابط ابژه‌ای' ),
		array( 'p' => 144, 'n' => 'کارن هورنای',      'b' => 1885, 'd' => 1952, 'lane' => 4, 'w' => 'نقد زنانگی فرویدی' ),
		array( 'p' => 103, 'n' => 'آنا فروید',        'b' => 1895, 'd' => 1982, 'lane' => 2, 'w' => 'مکانیسم‌های دفاعی' ),
		array( 'p' => 66,  'n' => 'دونالد وینیکات',   'b' => 1896, 'd' => 1971, 'lane' => 2, 'w' => 'فضای انتقالی' ),
		array( 'p' => 142, 'n' => 'ویلفرد بیون',      'b' => 1897, 'd' => 1979, 'lane' => 2, 'w' => 'نظریه‌ی فکر کردن' ),
		array( 'p' => 19,  'n' => 'ژاک لکان',         'b' => 1901, 'd' => 1981, 'lane' => 3, 'w' => 'ناخودآگاه همچون زبان' ),
		array( 'p' => 148, 'n' => 'هانا آرنت',        'b' => 1906, 'd' => 1975, 'lane' => 5, 'w' => 'اندیشه و شر' ),
		array( 'p' => 141, 'n' => 'جان بالبی',        'b' => 1907, 'd' => 1990, 'lane' => 2, 'w' => 'نظریه‌ی دلبستگی' ),
		array( 'p' => 43,  'n' => 'هاینتس کوهات',     'b' => 1913, 'd' => 1981, 'lane' => 4, 'w' => 'روانشناسی خویشتن' ),
		array( 'p' => 133, 'n' => 'اروین یالوم',      'b' => 1931, 'd' => 0,    'lane' => 4, 'w' => 'درمان اگزیستانسیال' ),
		array( 'p' => 187, 'n' => 'نانسی مک‌ویلیامز', 'b' => 1945, 'd' => 0,    'lane' => 4, 'w' => 'تشخیص روانکاوانه' ),
		array( 'p' => 225, 'n' => 'توماس آگدن',       'b' => 1946, 'd' => 0,    'lane' => 4, 'w' => 'سوژه‌ی سوم تحلیلی' ),
	);
}

function tj_mag_lanes() {
	return array(
		1 => 'نسل اول',
		2 => 'مکتب بریتانیا',
		3 => 'مکتب فرانسه',
		4 => 'مکتب آمریکا',
		5 => 'بیرون از بالین',
	);
}

/**
 * اتصال مجله به اینستاگرام.
 * هر ردیف: شناسه‌ی نوشته => نشانی پست اینستاگرام.
 * تا وقتی خالی باشد، فقط معرفی سه پیج نمایش داده می‌شود.
 */
function tj_mag_insta() {
	return array();
}

/* ---------- کمکی‌ها ---------- */

function tj_fa( $n ) {
	$en = array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' );
	$fa = array( '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' );
	return str_replace( $en, $fa, (string) $n );
}

/** میلادی به شمسی */
function tj_g2j( $gy, $gm, $gd ) {
	$gdm = array( 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 );
	$gy2 = ( $gm > 2 ) ? ( $gy + 1 ) : $gy;
	$days = 355666 + ( 365 * $gy ) + (int) ( ( $gy2 + 3 ) / 4 ) - (int) ( ( $gy2 + 99 ) / 100 )
		+ (int) ( ( $gy2 + 399 ) / 400 ) + $gd + $gdm[ $gm - 1 ];
	$jy = -1595 + ( 33 * (int) ( $days / 12053 ) );
	$days %= 12053;
	$jy += 4 * (int) ( $days / 1461 );
	$days %= 1461;
	if ( $days > 365 ) {
		$jy += (int) ( ( $days - 1 ) / 365 );
		$days = ( $days - 1 ) % 365;
	}
	if ( $days < 186 ) {
		$jm = 1 + (int) ( $days / 31 );
		$jd = 1 + ( $days % 31 );
	} else {
		$jm = 7 + (int) ( ( $days - 186 ) / 30 );
		$jd = 1 + ( ( $days - 186 ) % 30 );
	}
	return array( $jy, $jm, $jd );
}

function tj_jmonth( $m ) {
	$a = array( '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
		'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند' );
	return isset( $a[ $m ] ) ? $a[ $m ] : '';
}

/** تاریخ شمسی نوشته */
function tj_date( $post_id, $mode = 'full' ) {
	$ts = get_post_time( 'U', true, $post_id );
	if ( ! $ts ) { return ''; }
	$ts += (int) ( get_option( 'gmt_offset' ) * HOUR_IN_SECONDS );
	list( $jy, $jm, $jd ) = tj_g2j( (int) gmdate( 'Y', $ts ), (int) gmdate( 'n', $ts ), (int) gmdate( 'j', $ts ) );
	if ( 'year' === $mode ) { return tj_fa( $jy ); }
	if ( 'short' === $mode ) { return tj_fa( $jd ) . ' ' . tj_jmonth( $jm ); }
	return tj_fa( $jd ) . ' ' . tj_jmonth( $jm ) . ' ' . tj_fa( $jy );
}

function tj_jyear_num( $post_id ) {
	$ts = get_post_time( 'U', true, $post_id );
	if ( ! $ts ) { return 0; }
	$ts += (int) ( get_option( 'gmt_offset' ) * HOUR_IN_SECONDS );
	$j = tj_g2j( (int) gmdate( 'Y', $ts ), (int) gmdate( 'n', $ts ), (int) gmdate( 'j', $ts ) );
	return $j[0];
}

function tj_read_min( $post_id ) {
	$c = get_post_field( 'post_content', $post_id );
	$c = wp_strip_all_tags( strip_shortcodes( (string) $c ) );
	$w = preg_split( '/\s+/u', $c, -1, PREG_SPLIT_NO_EMPTY );
	$m = (int) ceil( count( $w ) / 180 );
	return max( 1, $m );
}

function tj_thumb( $post_id, $size = 'medium_large' ) {
	$u = get_the_post_thumbnail_url( $post_id, $size );
	return $u ? $u : '';
}

function tj_primary_cat( $post_id ) {
	$terms = get_the_category( $post_id );
	if ( empty( $terms ) ) { return null; }
	$skip = array( 1, 20 );
	foreach ( $terms as $t ) {
		if ( ! in_array( (int) $t->term_id, $skip, true ) ) { return $t; }
	}
	return $terms[0];
}

function tj_excerpt( $post_id, $len = 120 ) {
	$p = get_post( $post_id );
	if ( ! $p ) { return ''; }
	$e = $p->post_excerpt ? $p->post_excerpt : $p->post_content;
	$e = wp_strip_all_tags( strip_shortcodes( $e ) );
	$e = trim( preg_replace( '/\s+/u', ' ', $e ) );
	$e = trim( str_replace( 'این متن بخشی از', '', $e ) );
	if ( mb_strlen( $e ) > $len ) { $e = mb_substr( $e, 0, $len ) . '…'; }
	return $e;
}

/** کارت استاندارد مطلب */
function tj_card( $post_id, $opts = array() ) {
	$o = wp_parse_args( $opts, array(
		'img'  => true,
		'exc'  => false,
		'meta' => true,
	) );
	$title = get_the_title( $post_id );
	$link  = get_permalink( $post_id );
	if ( ! $title || ! $link ) { return ''; }
	$cat = tj_primary_cat( $post_id );
	$img = $o['img'] ? tj_thumb( $post_id ) : '';

	$h = '<article class="tjg-card">';
	if ( $o['img'] ) {
		$h .= '<a class="tjg-card-fig" href="' . esc_url( $link ) . '" tabindex="-1" aria-hidden="true">';
		$h .= $img
			? '<img src="' . esc_url( $img ) . '" alt="' . esc_attr( $title ) . '" loading="lazy" decoding="async">'
			: '<span class="tjg-card-ph"></span>';
		$h .= '</a>';
	}
	$h .= '<div class="tjg-card-body">';
	if ( $cat ) {
		$h .= '<a class="tjg-kicker" href="' . esc_url( get_category_link( $cat->term_id ) ) . '">' . esc_html( $cat->name ) . '</a>';
	}
	$h .= '<h3 class="tjg-card-t"><a href="' . esc_url( $link ) . '">' . esc_html( $title ) . '</a></h3>';
	if ( $o['exc'] ) {
		$h .= '<p class="tjg-card-x">' . esc_html( tj_excerpt( $post_id, 140 ) ) . '</p>';
	}
	if ( $o['meta'] ) {
		$h .= '<p class="tjg-card-m"><span>' . esc_html( tj_date( $post_id ) ) . '</span>'
			. '<span class="tjg-dot"></span><span>' . esc_html( tj_fa( tj_read_min( $post_id ) ) ) . ' دقیقه</span></p>';
	}
	$h .= '</div></article>';
	return $h;
}

/** واکشی نوشته‌ها */
function tj_posts( $args ) {
	$d = array(
		'post_type'           => 'post',
		'post_status'         => 'publish',
		'ignore_sticky_posts' => true,
		'no_found_rows'       => true,
		'posts_per_page'      => 6,
		'orderby'             => 'date',
		'order'               => 'DESC',
		'fields'              => 'ids',
	);
	$q = new WP_Query( wp_parse_args( $args, $d ) );
	if ( ! empty( $q->posts ) && function_exists( '_prime_post_caches' ) ) {
		_prime_post_caches( $q->posts, true, false );
	}
	return $q->posts;
}

function tj_row( $ids, $opts = array(), $cols = 'tjg-g4' ) {
	if ( empty( $ids ) ) { return ''; }
	$h = '<div class="tjg-grid ' . esc_attr( $cols ) . '">';
	foreach ( $ids as $id ) { $h .= tj_card( $id, $opts ); }
	$h .= '</div>';
	return $h;
}

/** سربرگ بخش */
function tj_head( $eyebrow, $title, $more_url = '', $more_txt = '', $id = '', $note = '' ) {
	$h = '<header class="tjg-sec-h"' . ( $id ? ' id="' . esc_attr( $id ) . '"' : '' ) . '>';
	$h .= '<div>';
	if ( $eyebrow ) { $h .= '<p class="tjg-eyebrow">' . esc_html( $eyebrow ) . '</p>'; }
	$h .= '<h2 class="tjg-sec-t">' . esc_html( $title ) . '</h2>';
	if ( $note ) { $h .= '<p class="tjg-sec-n">' . esc_html( $note ) . '</p>'; }
	$h .= '</div>';
	if ( $more_url ) {
		$h .= '<a class="tjg-more" href="' . esc_url( $more_url ) . '">' . esc_html( $more_txt ) . '</a>';
	}
	$h .= '</header>';
	return $h;
}

/* ---------- استایل ---------- */

function tj_mag_css() {
	return <<<'CSS'
<style id="tjg-css">
.tjg{
--red:#c83f49;--red6:#b63942;--red7:#8e2d34;--red1:#eec3c7;--red0:#faeced;
--ink:#0e0e0e;--ink2:#222;--soft:#4e4e4e;--mut:#676768;
--line:#dfdfe2;--surf:#fefefe;--sunk:#f5f5f8;--sunk2:#fafafc;
--r-sm:8px;--r:14px;--r-lg:20px;
font-family:'Anjoman Max','Vazirmatn',system-ui,sans-serif;
color:var(--soft);line-height:1.75;letter-spacing:0;
max-width:1140px;margin-inline:auto;padding-inline:16px;padding-block:0 72px;
overflow-wrap:normal;word-break:normal;
}
.tjg *,.tjg *::before,.tjg *::after{box-sizing:border-box;overflow-wrap:normal}
.tjg img{max-width:100%;display:block}
:where(.tjg) a{color:inherit;text-decoration:none}
.tjg h1,.tjg h2,.tjg h3,.tjg h4,.tjg p,.tjg ul,.tjg ol,.tjg figure{margin:0}
.tjg ul,.tjg ol{list-style:none;padding:0}
.tjg button{font-family:inherit}
.tjg section{margin-block-start:66px}
.tjg .tjg-tight{margin-block-start:30px}
.tjg-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.tjg :focus-visible{outline:2px solid var(--red);outline-offset:3px;border-radius:4px}
.tjg [id^="tjg-"]{scroll-margin-block-start:90px}

/* --- سربرگ بخش --- */
.tjg-sec-h{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;
margin-block-end:22px;padding-block-end:14px;border-block-end:1px solid var(--line)}
.tjg-eyebrow{font-size:13px;color:var(--red);margin-block-end:2px}
.tjg-sec-t{font-size:clamp(21px,3.2vw,28px);line-height:1.4;color:var(--ink)}
.tjg-sec-n{font-size:14px;color:var(--mut);line-height:1.8;margin-block-start:6px;max-width:46rem}
.tjg-more{flex:0 0 auto;font-size:14px;color:var(--mut);border:1px solid var(--line);
border-radius:999px;padding:6px 14px;transition:.18s;white-space:nowrap}
.tjg-more:hover{color:var(--red);border-color:var(--red1);background:var(--red0)}

/* --- کارت --- */
.tjg-grid{display:grid;gap:24px}
.tjg-g4{grid-template-columns:repeat(4,1fr)}
.tjg-g3{grid-template-columns:repeat(3,1fr)}
.tjg-card{display:flex;flex-direction:column;gap:10px;min-width:0}
.tjg-card-fig{display:block;aspect-ratio:16/10;overflow:hidden;border-radius:var(--r);
background:var(--sunk);border:1px solid var(--line)}
.tjg-card-fig img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.tjg-card:hover .tjg-card-fig img{transform:scale(1.04)}
.tjg-card-ph{display:block;width:100%;height:100%;
background:repeating-linear-gradient(135deg,var(--sunk) 0 10px,var(--sunk2) 10px 20px)}
.tjg-card-body{display:flex;flex-direction:column;gap:6px;min-width:0}
.tjg-kicker{font-size:12.5px;color:var(--red);line-height:1.6}
.tjg-kicker:hover{text-decoration:underline}
.tjg-card-t{font-size:17px;line-height:1.65;color:var(--ink2);font-weight:400}
.tjg-card-t a:hover{color:var(--red)}
.tjg-card-x{font-size:14.5px;line-height:1.85;color:var(--mut)}
.tjg-card-m{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--mut);flex-wrap:wrap}
.tjg-dot{width:3px;height:3px;border-radius:50%;background:var(--line);flex:0 0 auto}

/* --- هیرو --- */
.tjg-hero{padding-block:30px 0;text-align:center}

/* --- قلاب --- */
.tjg-hook{margin-block-start:34px;border:1px solid var(--line);border-radius:var(--r-lg);
background:var(--surf);padding:34px 30px 22px;text-align:start;position:relative;overflow:hidden}
.tjg-hook::before{content:"";position:absolute;inset-block:0;inset-inline-start:0;width:5px;background:var(--red)}
.tjg-hook-q{font-size:clamp(20px,3.1vw,29px);line-height:1.65;color:var(--ink);
max-width:44rem;transition:opacity .25s ease}
.tjg-hook-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
margin-block-start:20px;padding-block-start:16px;border-block-start:1px solid var(--line)}
.tjg-hook-src{font-size:14px;color:var(--mut);line-height:1.8;min-width:0}
.tjg-hook-src a{color:var(--red)}
.tjg-hook-src a:hover{text-decoration:underline}
.tjg-shuffle{flex:0 0 auto;font-size:13.5px;color:var(--mut);background:var(--sunk);
border:1px solid transparent;border-radius:999px;padding:7px 15px;cursor:pointer;transition:.18s}
.tjg-shuffle:hover{background:var(--red0);color:var(--red);border-color:var(--red1)}

/* --- جست‌وجوی اصلی --- */
.tjg-find{margin-block-start:0;position:relative;max-width:44rem;margin-inline:auto}
.tjg-find-in{position:relative}
.tjg-find input{width:100%;font-family:inherit;font-size:16px;color:var(--ink2);
border:1px solid var(--line);border-radius:999px;padding:15px 52px 15px 18px;background:var(--surf);
line-height:1.7;transition:.18s}
.tjg-find input:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 4px var(--red0)}
.tjg-find-ic{position:absolute;inset-inline-end:20px;top:50%;transform:translateY(-50%);
width:18px;height:18px;color:var(--mut);pointer-events:none}
.tjg-seeds{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-block-start:12px}
.tjg-seed{font-size:13px;color:var(--mut);background:transparent;border:1px solid var(--line);
border-radius:999px;padding:5px 13px;cursor:pointer;transition:.15s;line-height:1.7}
.tjg-seed:hover{color:var(--red);border-color:var(--red1);background:var(--red0)}
.tjg-res{position:absolute;inset-inline:0;top:calc(100% + 8px);z-index:20;background:var(--surf);
border:1px solid var(--line);border-radius:var(--r);box-shadow:0 14px 34px -18px rgba(34,34,34,.4);
padding:6px;text-align:start;max-height:340px;overflow-y:auto}
.tjg-res a{display:flex;gap:10px;align-items:baseline;padding:9px 12px;border-radius:9px;
font-size:14.5px;line-height:1.7;color:var(--ink2)}
.tjg-res a:hover{background:var(--sunk);color:var(--red)}
.tjg-res a span{font-size:12px;color:var(--mut);flex:0 0 auto}
.tjg-res a .tjg-res-t{font-size:14.5px;color:inherit;flex:1 1 auto;min-width:0}
.tjg-res p{padding:14px 12px;font-size:14px;color:var(--mut)}

/* --- نوار امروز --- */
.tjg-today{margin-block-start:30px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;
border-block:1px solid var(--line);padding-block:13px;font-size:14px}
.tjg-today-b{flex:0 0 auto;font-size:12.5px;color:var(--red);background:var(--red0);
border-radius:999px;padding:4px 12px}
.tjg-today-t{color:var(--ink2)}
.tjg-today-a{color:var(--mut);min-width:0}
.tjg-today-a a{color:var(--red)}
.tjg-today-a a:hover{text-decoration:underline}
.tjg-today-n{margin-inline-start:auto;font-size:12.5px;color:var(--mut);flex:0 0 auto}

/* --- تیتر یک --- */
.tjg-lead{display:grid;grid-template-columns:1.05fr .95fr;gap:34px;align-items:center}
.tjg-lead-fig{aspect-ratio:4/3;border-radius:var(--r-lg);overflow:hidden;border:1px solid var(--line);background:var(--sunk)}
.tjg-lead-fig img{width:100%;height:100%;object-fit:cover}
.tjg-lead h2{font-size:clamp(22px,3.4vw,32px);line-height:1.45;color:var(--ink);margin-block:10px 12px}
.tjg-lead h2 a:hover{color:var(--red)}
.tjg-lead .tjg-card-x{font-size:16px}
.tjg-lead .tjg-card-m{margin-block-start:14px;font-size:13px}

/* --- سینما --- */
.tjg-cine{background:var(--ink);border-radius:var(--r-lg);padding:34px 30px;color:#e9e9e9}
.tjg-cine .tjg-sec-h{border-block-end-color:rgba(255,255,255,.14);margin-block-end:24px}
.tjg-cine .tjg-sec-t{color:#fefefe}
.tjg-cine .tjg-eyebrow{color:var(--red1)}
.tjg-cine .tjg-sec-n{color:#aeaeb0}
.tjg-cine .tjg-more{color:#bababa;border-color:rgba(255,255,255,.2)}
.tjg-cine .tjg-more:hover{background:rgba(255,255,255,.08);color:#fefefe;border-color:rgba(255,255,255,.35)}
.tjg-cine .tjg-card-t{color:#fefefe}
.tjg-cine .tjg-card-t a:hover{color:var(--red1)}
.tjg-cine .tjg-kicker{color:var(--red1)}
.tjg-cine .tjg-card-x{color:#9a9a9c}
.tjg-cine .tjg-card-m{color:#878788}
.tjg-cine .tjg-card-fig{border-color:rgba(255,255,255,.12);background:#1f1f1f}
.tjg-cine .tjg-dot{background:#4e4e4e}
.tjg-pick{margin-block-start:28px;border:1px dashed rgba(255,255,255,.26);border-radius:var(--r);
padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}
.tjg-pick-k{font-size:12.5px;color:var(--red1);margin-block-end:4px}
.tjg-pick-t{font-size:clamp(17px,2.4vw,21px);line-height:1.6;color:#fefefe;transition:opacity .2s ease}
.tjg-pick-a{display:flex;gap:9px;align-items:center;flex:0 0 auto;flex-wrap:wrap}
.tjg-pick-a a{font-size:14px;color:#0e0e0e;background:#fefefe;border-radius:var(--r-sm);padding:10px 17px;transition:.18s}
.tjg-pick-a a:hover{background:var(--red1)}
.tjg-pick-a button{font-size:14px;color:#bababa;background:transparent;border:1px solid rgba(255,255,255,.24);
border-radius:var(--r-sm);padding:10px 17px;cursor:pointer;transition:.18s;font-family:inherit}
.tjg-pick-a button:hover{color:#fefefe;border-color:rgba(255,255,255,.5)}

/* --- قرن روانکاوی --- */
.tjg-tl-wrap{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--sunk2);overflow:hidden}
.tjg-tl-scroll{overflow-x:auto;overflow-y:hidden;scrollbar-width:thin}
.tjg-tl{position:relative;min-width:1560px;padding:16px 20px 12px}
.tjg-tl-axis{position:relative;height:24px;margin-inline-start:118px;
margin-block-end:8px;border-block-end:1px solid var(--line)}
.tjg-tl-tick{position:absolute;font-size:11.5px;color:var(--mut);top:2px;transform:translateX(50%)}
.tjg-lane{position:relative;padding-inline-start:118px;border-block-end:1px dashed var(--line)}
.tjg-lane:last-child{border-block-end:0}
.tjg-lane-name{position:absolute;inset-inline-start:0;top:50%;transform:translateY(-50%);
width:104px;text-align:start;font-size:12.5px;color:var(--ink2);
padding-inline-end:12px;border-inline-end:2px solid var(--red1)}
.tjg-fig{position:absolute;width:186px;display:flex;align-items:center;gap:9px;
background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:7px 10px 7px 7px;
transition:.18s;z-index:1}
.tjg-fig:hover{border-color:var(--red);box-shadow:0 6px 18px -8px rgba(200,63,73,.5);z-index:3}
.tjg-fig img{width:40px;height:40px;border-radius:9px;object-fit:cover;flex:0 0 auto;background:var(--sunk)}
.tjg-fig-mono{width:40px;height:40px;border-radius:9px;background:var(--red0);color:var(--red);
display:grid;place-items:center;font-size:16px;flex:0 0 auto}
.tjg-fig-txt{min-width:0}
.tjg-fig-n{display:block;font-size:13.5px;color:var(--ink2);line-height:1.5;white-space:nowrap;
overflow:hidden;text-overflow:ellipsis}
.tjg-fig-y{display:block;font-size:11.5px;color:var(--mut);line-height:1.5}
.tjg-fig-w{display:block;font-size:11.5px;color:var(--red);line-height:1.5;white-space:nowrap;
overflow:hidden;text-overflow:ellipsis}

/* --- مسیرهای مطالعه --- */
.tjg-paths{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.tjg-path{border:1px solid var(--line);border-radius:var(--r);background:var(--surf);
padding:20px;display:flex;flex-direction:column;gap:14px;transition:.2s}
.tjg-path:hover{border-color:var(--red1)}
.tjg-path.is-full{border-color:var(--red1);background:var(--red0)}
.tjg-path-top{display:flex;align-items:flex-start;gap:13px}
.tjg-ring{position:relative;width:48px;height:48px;flex:0 0 auto}
.tjg-ring svg{width:48px;height:48px;transform:rotate(-90deg)}
.tjg-ring circle{fill:none;stroke-width:3.5}
.tjg-ring .tjg-ring-bg{stroke:var(--line)}
.tjg-ring .tjg-ring-fg{stroke:var(--red);stroke-linecap:round;transition:stroke-dashoffset .5s ease}
.tjg-ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:13px;
color:var(--ink2);font-weight:400}
.tjg-path h3{font-size:18px;line-height:1.6;color:var(--ink)}
.tjg-path-d{display:block;font-size:13.5px;line-height:1.8;color:var(--mut);margin-block-start:3px}
.tjg-path-left{font-size:13px;color:var(--red6);background:var(--red0);border-radius:999px;
padding:5px 13px;align-self:flex-start;line-height:1.7}
.tjg-path-det{border-block-start:1px solid var(--line)}
.tjg-path-det summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:9px;
padding-block:11px;font-size:13.5px;color:var(--mut)}
.tjg-path-det summary::-webkit-details-marker{display:none}
.tjg-path-det summary::after{content:"";width:6px;height:6px;border:solid var(--mut);border-width:0 1.5px 1.5px 0;
transform:rotate(45deg);margin-block-end:3px;transition:.2s}
.tjg-path-det[open] summary::after{transform:rotate(-135deg);margin-block:0}
.tjg-path-det summary:hover{color:var(--red)}
.tjg-path-list{display:flex;flex-direction:column;gap:1px;padding-block-end:8px}
.tjg-step{display:flex;align-items:flex-start;gap:10px;padding-block:7px;font-size:14.5px;line-height:1.7}
.tjg-step-box{flex:0 0 auto;width:19px;height:19px;border:1px solid var(--line);border-radius:6px;
background:var(--surf);margin-block-start:3px;cursor:pointer;position:relative;transition:.15s}
.tjg-step-box:hover{border-color:var(--red)}
.tjg-step.is-done .tjg-step-box{background:var(--red);border-color:var(--red)}
.tjg-step.is-done .tjg-step-box::after{content:"";position:absolute;inset-inline-start:6px;top:3px;
width:5px;height:9px;border:solid #fefefe;border-width:0 1.6px 1.6px 0;transform:rotate(45deg)}
.tjg-step.is-done a{color:var(--mut);text-decoration:line-through;text-decoration-color:var(--line)}
.tjg-step a{color:var(--ink2);min-width:0}
.tjg-step a:hover{color:var(--red)}
.tjg-step-m{flex:0 0 auto;font-size:11.5px;color:var(--mut);margin-block-start:4px}
.tjg-path-cta{margin-block-start:auto;font-size:14.5px;color:#fefefe;background:var(--red);
border:1px solid var(--red);border-radius:var(--r-sm);padding:11px 15px;text-align:center;transition:.18s}
.tjg-path-cta:hover{background:var(--red6);border-color:var(--red6)}
.tjg-path.is-full .tjg-path-cta{background:transparent;color:var(--red6);border-color:var(--red1)}
.tjg-paths-note{font-size:13px;color:var(--mut);margin-block-start:16px;text-align:center}

/* --- قفسه‌ی کتاب --- */
.tjg-shelf-scroll{overflow-x:auto;scrollbar-width:thin;padding-block-end:6px;scroll-snap-type:x proximity;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
.tjg-shelf{display:flex;gap:10px;align-items:flex-end;min-width:min-content;
padding:26px 4px 0;border-block-end:5px solid var(--ink2);border-radius:0 0 3px 3px}
.tjg-face{flex:0 0 128px;display:flex;flex-direction:column;gap:8px;margin-inline-end:16px;scroll-snap-align:start}
.tjg-face-c{aspect-ratio:3/4;border-radius:3px 8px 8px 3px;overflow:hidden;border:1px solid var(--line);
border-inline-start:5px solid var(--red);background:var(--sunk);
box-shadow:0 8px 18px -12px rgba(34,34,34,.65);transition:.25s}
.tjg-face:hover .tjg-face-c{transform:translateY(-7px)}
.tjg-face-c img{width:100%;height:100%;object-fit:cover}
.tjg-face-t{font-size:12.5px;line-height:1.65;color:var(--ink2)}
.tjg-face:hover .tjg-face-t{color:var(--red)}
.tjg-spine{flex:0 0 auto;width:44px;border-radius:3px 3px 0 0;position:relative;
display:flex;align-items:center;justify-content:center;padding-block:14px;
box-shadow:inset -3px 0 0 rgba(0,0,0,.13),0 6px 14px -10px rgba(34,34,34,.6);transition:transform .28s cubic-bezier(.2,.7,.2,1),box-shadow .28s;scroll-snap-align:start;will-change:transform}
.tjg-spine:hover,.tjg-spine:focus-visible{transform:translateY(-8px);box-shadow:inset -3px 0 0 rgba(0,0,0,.13),0 14px 22px -12px rgba(34,34,34,.7)}
.tjg-spine:focus-visible{outline:2px solid var(--tj-ink,#0e0e0e);outline-offset:2px}
.tjg-spine span{writing-mode:vertical-rl;font-size:12.5px;line-height:1.35;color:#fefefe;
max-height:100%;overflow:hidden;text-align:start;padding-block-start:2px}
.tjg-shelf-foot{font-size:12.5px;color:var(--mut);margin-block-start:12px;text-align:center}

/* --- میز دانشجو --- */
.tjg-desk-wrap{background:var(--sunk);border-radius:var(--r-lg);padding:34px 30px}
.tjg-desk-h{text-align:center;margin-block-end:26px}
.tjg-desk-h p.tjg-eyebrow{margin-block-end:6px}
.tjg-desk-h h2{font-size:clamp(21px,3.2vw,28px);line-height:1.45;color:var(--ink)}
.tjg-desk-h span{display:block;font-size:15px;color:var(--soft);line-height:1.9;
max-width:40rem;margin:8px auto 0}
.tjg-desk{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.tjg-tile{border:1px solid var(--line);border-radius:var(--r);padding:18px;background:var(--surf);
display:flex;flex-direction:column;gap:7px;transition:.2s}
.tjg-tile:hover{border-color:var(--red);transform:translateY(-3px)}
.tjg-tile-n{font-size:12.5px;color:var(--red)}
.tjg-tile h3{font-size:16px;line-height:1.6;color:var(--ink)}
.tjg-tile p{font-size:13.5px;line-height:1.8;color:var(--mut)}
.tjg-desk-cta{margin-block-start:20px;border:1px dashed var(--red1);border-radius:var(--r);
padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;
background:var(--red0)}
.tjg-desk-cta p{font-size:14.5px;color:var(--ink2);line-height:1.8}
.tjg-btn{display:inline-block;background:var(--red);color:#fefefe;border-radius:var(--r-sm);
padding:11px 22px;font-size:15px;transition:.18s;flex:0 0 auto}
.tjg-btn:hover{background:var(--red6)}
.tjg-btn-o{background:transparent;color:var(--ink2);border:1px solid var(--line)}
.tjg-btn-o:hover{background:var(--sunk);color:var(--ink)}

/* --- اینستاگرام --- */
.tjg-ig{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;
border:1px solid var(--line);border-radius:var(--r);padding:20px 24px;background:var(--surf)}
.tjg-ig p{font-size:14.5px;line-height:1.85;color:var(--soft);max-width:38rem}
.tjg-ig p b{color:var(--ink);font-weight:400}
.tjg-ig-l{display:flex;gap:8px;flex-wrap:wrap}
.tjg-ig-l a{font-size:13.5px;color:var(--ink2);border:1px solid var(--line);border-radius:999px;
padding:7px 14px;transition:.18s}
.tjg-ig-l a:hover{color:var(--red);border-color:var(--red1);background:var(--red0)}

/* --- نویسندگان --- */
.tjg-authors{display:flex;flex-wrap:wrap;gap:9px}
.tjg-au{display:flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:999px;
padding:6px 14px 6px 6px;font-size:14px;color:var(--ink2);transition:.18s;background:var(--surf)}
.tjg-au:hover{border-color:var(--red1);background:var(--red0);color:var(--red)}
.tjg-au-i{width:27px;height:27px;border-radius:50%;background:var(--sunk);color:var(--mut);
display:grid;place-items:center;font-size:12.5px;flex:0 0 auto}
.tjg-au-c{font-size:12px;color:var(--mut)}

/* --- موضوع‌ها و آرشیو --- */
.tjg-topics{display:flex;flex-wrap:wrap;gap:9px;margin-block-end:26px}
.tjg-topic{display:flex;align-items:baseline;gap:7px;font-size:14.5px;color:var(--soft);
background:var(--sunk);border:1px solid transparent;border-radius:999px;padding:8px 16px;transition:.18s}
.tjg-topic:hover{background:var(--red0);color:var(--red);border-color:var(--red1)}
.tjg-topic b{font-size:12px;color:var(--mut);font-weight:400}
.tjg-topic:hover b{color:var(--red6)}
.tjg-yr{border-block-end:1px solid var(--line)}
.tjg-yr summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;
padding-block:14px;font-size:16px;color:var(--ink2)}
.tjg-yr summary::-webkit-details-marker{display:none}
.tjg-yr summary::after{content:"";width:7px;height:7px;border:solid var(--mut);border-width:0 1.5px 1.5px 0;
transform:rotate(45deg);margin-block-end:4px;transition:.2s}
.tjg-yr[open] summary::after{transform:rotate(-135deg);margin-block:0 0}
.tjg-yr summary b{font-size:12.5px;color:var(--mut);font-weight:400;margin-inline-start:auto}
.tjg-yr summary:hover{color:var(--red)}
.tjg-yr-list{column-count:3;column-gap:34px;padding-block:4px 18px}
.tjg-ar-item{break-inside:avoid;display:flex;gap:10px;align-items:baseline;padding-block:7px;
font-size:14.5px;line-height:1.75}
.tjg-ar-item a{color:var(--soft);min-width:0}
.tjg-ar-item a:hover{color:var(--red)}
.tjg-ar-item em{font-style:normal;flex:0 0 auto;font-size:11.5px;color:var(--mut)}

/* --- پایان --- */
.tjg-foot{margin-block-start:66px;border:1px solid var(--line);border-radius:var(--r-lg);
padding:34px;text-align:center;background:var(--sunk2)}
.tjg-foot h2{font-size:clamp(20px,3vw,26px);color:var(--ink);line-height:1.5;margin-block-end:10px}
.tjg-foot p{font-size:15px;color:var(--soft);line-height:1.9;max-width:40rem;margin-inline:auto}
.tjg-foot-a{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-block-start:22px}
.tjg-fine{margin-block-start:30px;text-align:center;font-size:12px;color:var(--line)}
.tjg-fine a{color:var(--line)}
.tjg-fine a:hover{color:var(--mut)}

/* --- واکنش‌گرا --- */
@media (max-width:1000px){
	.tjg-g4{grid-template-columns:repeat(2,1fr)}
	.tjg-desk{grid-template-columns:repeat(2,1fr)}
	.tjg-yr-list{column-count:2}
	.tjg-lead{grid-template-columns:1fr;gap:20px}
}
@media (max-width:640px){
	.tjg{padding-inline:14px;padding-block-end:56px}
	.tjg section{margin-block-start:48px}
	.tjg-hero{padding-block:24px 0}
	.tjg-hook{padding:24px 20px 18px;border-radius:var(--r)}
	.tjg-hook-q{font-size:19px}
	.tjg-find input{font-size:15px;padding:13px 46px 13px 16px}
	.tjg-seeds{flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;
	margin-inline:-14px;padding-inline:14px;scrollbar-width:none}
	.tjg-seeds::-webkit-scrollbar{display:none}
	.tjg-seed{flex:0 0 auto}
	.tjg-today-n{margin-inline-start:0;width:100%}
	.tjg-g3,.tjg-g4{grid-template-columns:1fr;gap:18px}
	.tjg-grid.tjg-g4 .tjg-card,.tjg-grid.tjg-g3 .tjg-card{display:grid;grid-template-columns:104px 1fr;
	gap:12px;align-items:center}
	.tjg-grid .tjg-card-fig{aspect-ratio:1/1;border-radius:10px}
	.tjg-grid .tjg-card-t{font-size:15.5px}
	.tjg-grid .tjg-card-x{display:none}
	.tjg-cine{padding:24px 18px;border-radius:var(--r)}
	.tjg-paths{grid-template-columns:1fr}
	.tjg-desk-wrap{padding:24px 18px;border-radius:var(--r)}
	.tjg-desk{grid-template-columns:1fr}
	.tjg-yr-list{column-count:1}
	.tjg-sec-h{flex-wrap:wrap;gap:10px}
	.tjg-foot{padding:24px 18px}
	.tjg-ig{padding:18px}
	/* خط زمان روی موبایل به فهرست عمودی تبدیل می‌شود */
	.tjg-tl-scroll{overflow:visible}
	.tjg-tl{min-width:0!important;padding:6px 14px 14px}
	.tjg-tl-axis{display:none}
	.tjg-lane{padding-inline-start:0;padding-block:14px 6px;border-block-end:1px solid var(--line)}
	.tjg-lane-name{position:static;transform:none;width:auto;display:block;margin-block-end:10px;
	color:var(--red);border-inline-end:0;padding-inline-end:0;font-size:12.5px}
	.tjg-fig{position:static!important;inset-inline-start:auto!important;top:auto!important;
	width:100%;margin-block-end:8px}
	.tjg-fig-n,.tjg-fig-w{white-space:normal}
}
@media (prefers-reduced-motion:reduce){
	.tjg *{transition:none!important;animation:none!important}
}
.tjg .tjg-res-all{border-top:1px solid var(--line,#dfdfe2)!important;margin-top:4px}
.tjg .tjg-res-all .tjg-res-t{color:var(--red,#c83f49)!important;font-size:14px}
</style>
CSS;
}

/* ---------- اسکریپت ---------- */

function tj_mag_js() {
	return <<<'JS'
<script id="tjg-js">
(function(){
"use strict";
var root=document.querySelector(".tjg");
if(!root)return;

function fa(n){return String(n).replace(/[0-9]/g,function(d){return "۰۱۲۳۴۵۶۷۸۹"[+d];});}
function norm(s){
	return (s||"").toString()
		.replace(/[يیى]/g,"ی")
		.replace(/[كک]/g,"ک")
		.replace(/[\u200b-\u200f\u064b-\u0652\u0640\u0654]/g,"")
		.replace(/ة/g,"ه")
		.replace(/[\u06f0-\u06f9]/g,function(c){return String(c.charCodeAt(0)-1776);})
		.replace(/\s+/g," ")
		.trim().toLowerCase();
}
function tag(name,txt,cls){
	var el=document.createElement(name);
	if(txt!==null)el.textContent=txt;
	if(cls)el.className=cls;
	return el;
}

/* --- ۱. قلاب --- */
(function(){
	var box=root.querySelector("[data-tjg-hook]");
	var raw=document.getElementById("tjg-hook-data");
	if(!box){return;}
	if(!raw){return;}
	var list;
	try{list=JSON.parse(raw.textContent);}catch(e){return;}
	if(!list){return;}
	if(!list.length){return;}
	var q=box.querySelector("[data-tjg-hook-q]");
	var src=box.querySelector("[data-tjg-hook-src]");
	var btn=box.querySelector("[data-tjg-shuffle]");
	var last=-1;
	function show(i){
		var it=list[i];
		q.style.opacity="0";
		setTimeout(function(){
			q.textContent="«"+it.q+"»";
			src.textContent="";
			src.appendChild(tag("span","از نوشته‌ی "));
			var a=tag("a",it.t);
			a.setAttribute("href",it.u);
			src.appendChild(a);
			src.appendChild(tag("span"," · "+fa(it.m)+" دقیقه خواندن"));
			q.style.opacity="1";
		},180);
	}
	function pick(){
		var i=Math.floor(Math.random()*list.length);
		if(list.length>1){ if(i===last){ i=(i+1)%list.length; } }
		last=i;show(i);
	}
	pick();
	if(btn){btn.addEventListener("click",pick);}
})();

/* --- ۲. نوار امروز --- */
(function(){
	var box=root.querySelector("[data-tjg-today]");
	var raw=document.getElementById("tjg-occ-data");
	if(!box){return;}
	if(!raw){return;}
	var list;
	try{list=JSON.parse(raw.textContent);}catch(e){return;}
	if(!list){return;}
	if(!list.length){return;}

	var now=new Date();
	var key=("0"+(now.getMonth()+1)).slice(-2)+"-"+("0"+now.getDate()).slice(-2);
	function cmp(md){var p=md.split("-");return (+p[0])*31+(+p[1]);}
	var idx=-1,best=1e9;
	for(var i=0;i<list.length;i++){
		var d=list[i].md;
		if(d===key){idx=i;break;}
		var diff=(cmp(d)>=cmp(key))?(cmp(d)-cmp(key)):(372-cmp(key)+cmp(d));
		if(diff<best){best=diff;idx=i;}
	}
	if(idx<0){return;}
	var cur=list[idx];
	var isToday=(cur.md===key);
	var nxt=list[(idx+1)%list.length];

	var today="";
	try{today=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{day:"numeric",month:"long",year:"numeric"}).format(now);}
	catch(e){today="";}

	var bd=box.querySelector("[data-tjg-today-b]");
	var tt=box.querySelector("[data-tjg-today-t]");
	var aa=box.querySelector("[data-tjg-today-a]");
	var nn=box.querySelector("[data-tjg-today-n]");
	if(bd){bd.textContent=today?today:"تقویم روان";}
	if(tt){tt.textContent=(isToday?"":"نزدیک‌ترین مناسبت: ")+cur.t;}
	if(aa){
		aa.textContent="";
		if(cur.u){
			aa.appendChild(tag("span","برای همین روز بخوانید: "));
			var a=tag("a",cur.pt);
			a.setAttribute("href",cur.u);
			aa.appendChild(a);
		}
	}
	if(nn){nn.textContent="بعدی: "+nxt.t;}
})();

/* --- ۳. جست‌وجو --- */
(function(){
	var wrap=root.querySelector("[data-tjg-find]");
	if(!wrap){return;}
	var input=wrap.querySelector("input");
	var res=wrap.querySelector("[data-tjg-res]");
	var seeds=wrap.querySelectorAll("[data-tjg-seed]");
	var items=root.querySelectorAll("[data-tjg-ar-item]");
	var idx=[],timer=null;

	for(var i=0;i<items.length;i++){
		var a=items[i].querySelector("a");
		if(!a){continue;}
		idx.push({ t:a.textContent, n:norm(a.textContent), u:a.getAttribute("href") });
	}

	function hide(){res.hidden=true;res.textContent="";}
	/* v2 (۱ مهر ۱۴۰۵): رتبه‌بندی به‌جای ۹ نتیجهٔ اول، زندگی‌نامه‌ها بالا، پیوند همهٔ نتیجه‌ها، رویداد search در آنالیتیکس */
	var lastSent="",sendT=null;
	function track(raw,n){
		clearTimeout(sendT);
		sendT=setTimeout(function(){
			if(raw===lastSent){return;}
			lastSent=raw;
			if(typeof window.gtag==="function"){window.gtag("event","search",{search_term:raw,results:n,search_area:"mag"});}
		},1200);
	}
	function allLink(raw,n){
		var a=tag("a",null,"tjg-res-all");
		a.setAttribute("href","/?s="+encodeURIComponent(raw));
		a.appendChild(tag("span",n>0?("دیدن همهٔ "+fa(n)+" نوشته برای «"+raw+"»"):("جست‌وجوی «"+raw+"» در متن همهٔ نوشته‌ها"),"tjg-res-t"));
		return a;
	}
	var PIN={"فروید":"زیگموند","لکان":"ژاک","یونگ":"کارل"};
	function run(){
		var raw=(input.value||"").trim();
		var q=norm(raw);
		if(q.length<2){hide();return;}
		var toks=q.split(" ");
		var hits=[];
		for(var i=0;i<idx.length;i++){
			var n=idx[i].n,ok=true,pos=0;
			for(var t=0;t<toks.length;t++){
				var p=n.indexOf(toks[t]);
				if(p<0){ok=false;break;}
				if(t===0){pos=p;}
			}
			if(!ok){continue;}
			var s=pos/200;
			if(/زندگی ?نامه/.test(n)){s-=3;}
			for(var pk in PIN){if(q.indexOf(pk)>=0){if(n.indexOf(PIN[pk])>=0){s-=0.6;}}}
			if(n.indexOf(q)===0){s-=2;}
			if(pos===0){s-=1;}else if(n.charAt(pos-1)===" "){s-=1;}
			var e=pos+toks[0].length;
			if(e>=n.length){s-=0.5;}else if(/[\s:؛،()«»|؟!.]/.test(n.charAt(e))){s-=0.5;}
			hits.push({it:idx[i],s:s,o:i});
		}
		hits.sort(function(x,y){return (x.s-y.s)||(x.o-y.o);});
		track(raw,hits.length);
		res.textContent="";
		if(!hits.length){
			res.appendChild(tag("p","در عنوان نوشته‌ها چیزی با این واژه نبود."));
			res.appendChild(allLink(raw,0));
			res.hidden=false;return;
		}
		var max=Math.min(hits.length,8);
		for(var k=0;k<max;k++){
			var a=tag("a",null);
			a.setAttribute("href",hits[k].it.u);
			a.appendChild(tag("span",hits[k].it.t,"tjg-res-t"));
			res.appendChild(a);
		}
		res.appendChild(allLink(raw,hits.length));
		res.hidden=false;
	}
	input.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(run,130);});
	input.addEventListener("focus",run);
	for(var s=0;s<seeds.length;s++){
		seeds[s].addEventListener("click",function(){
			input.value=this.getAttribute("data-tjg-seed");
			input.focus();run();
		});
	}
	document.addEventListener("click",function(e){
		if(wrap.contains(e.target)){return;}
		hide();
	});
	input.addEventListener("keydown",function(e){if(e.key==="Escape"){hide();input.blur();}});
	hide();
})();

/* --- ۴. مسیرهای مطالعه --- */
(function(){
	var wrap=root.querySelector("[data-tjg-paths]");
	if(!wrap){return;}
	var KEY="tjg_read_v1",done={};
	try{done=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(e){done={};}
	function save(){try{localStorage.setItem(KEY,JSON.stringify(done));}catch(e){}}

	var paths=wrap.querySelectorAll("[data-tjg-path]");
	var sum=root.querySelector("[data-tjg-paths-sum]");

	function paint(path){
		var steps=path.querySelectorAll("[data-tjg-step]");
		var n=steps.length,c=0,left=0,next=null;
		for(var i=0;i<n;i++){
			var id=steps[i].getAttribute("data-tjg-step");
			var bx=steps[i].querySelector(".tjg-step-box");
			if(done[id]){
				steps[i].classList.add("is-done");c++;
				if(bx){bx.setAttribute("aria-checked","true");}
			}else{
				steps[i].classList.remove("is-done");
				if(bx){bx.setAttribute("aria-checked","false");}
				left+=parseInt(steps[i].getAttribute("data-m"),10)||0;
				if(!next){next=steps[i];}
			}
		}
		var ring=path.querySelector(".tjg-ring-fg"),lbl=path.querySelector(".tjg-ring b");
		var circ=2*Math.PI*21;
		if(ring){
			ring.setAttribute("stroke-dasharray",circ.toFixed(1));
			ring.setAttribute("stroke-dashoffset",(circ*(1-(n?c/n:0))).toFixed(1));
		}
		if(lbl){lbl.textContent=fa(c)+"/"+fa(n);}

		var leftEl=path.querySelector("[data-tjg-left]");
		if(leftEl){
			if(next){leftEl.textContent=fa(left)+" دقیقه تا پایان این مسیر";}
			else{leftEl.textContent="این مسیر را تمام کرده‌اید";}
		}
		var cta=path.querySelector("[data-tjg-path-cta]");
		if(cta){
			if(next){
				var a=next.querySelector("a");
				cta.textContent=(c>0?"ادامه: ":"شروع: ")+(a?a.textContent:"");
				if(a){cta.setAttribute("href",a.getAttribute("href"));}
				path.classList.remove("is-full");
			}else{
				cta.textContent="یک مسیر دیگر را شروع کنید";
				cta.setAttribute("href","#tjg-paths");
				path.classList.add("is-full");
			}
		}
		return {n:n,c:c};
	}

	function paintAll(){
		var tot=0,got=0;
		for(var k=0;k<paths.length;k++){
			var r=paint(paths[k]);
			tot+=r.n;got+=r.c;
		}
		if(sum){
			if(got===0){sum.textContent="هیچ‌کدام را هنوز نخوانده‌اید. از هر مسیری که خواستید شروع کنید.";}
			else if(got>=tot){sum.textContent="هر "+fa(tot)+" نوشته‌ی مسیرها را خوانده‌اید. کارتان درست است.";}
			else{sum.textContent=fa(got)+" نوشته از "+fa(tot)+" نوشته‌ی مسیرها را خوانده‌اید.";}
		}
	}
	paintAll();

	wrap.addEventListener("click",function(e){
		var box=e.target.closest?e.target.closest(".tjg-step-box"):null;
		if(!box){return;}
		e.preventDefault();
		var step=box.parentNode,id=step.getAttribute("data-tjg-step");
		if(done[id]){delete done[id];}else{done[id]=1;}
		save();paintAll();
	});
	wrap.addEventListener("keydown",function(e){
		if(e.key!==" "){ if(e.key!=="Enter"){return;} }
		var box=null;
		if(e.target.classList){ if(e.target.classList.contains("tjg-step-box")){box=e.target;} }
		if(!box){return;}
		e.preventDefault();box.click();
	});
})();

/* --- ۵. پیشنهاد فیلم --- */
(function(){
	var box=root.querySelector("[data-tjg-pick]");
	var raw=document.getElementById("tjg-film-data");
	if(!box){return;}
	if(!raw){return;}
	var list;
	try{list=JSON.parse(raw.textContent);}catch(e){return;}
	if(!list){return;}
	if(!list.length){return;}
	var tt=box.querySelector("[data-tjg-pick-t]");
	var uu=box.querySelector("[data-tjg-pick-u]");
	var bb=box.querySelector("[data-tjg-pick-b]");
	var last=-1;
	function pick(){
		var i=Math.floor(Math.random()*list.length);
		if(list.length>1){ if(i===last){ i=(i+1)%list.length; } }
		last=i;
		tt.style.opacity="0";
		setTimeout(function(){
			tt.textContent=list[i].t;
			uu.setAttribute("href",list[i].u);
			tt.style.opacity="1";
		},160);
	}
	if(bb){bb.addEventListener("click",pick);}
})();

})();
</script>
JS;
}

/* ---------- بخش‌ها ---------- */

/** ۱. هیرو: قلاب و جست‌وجو */
function tj_sec_hero() {
	$hooks = array();
	foreach ( tj_mag_hooks() as $k ) {
		$p = (int) $k['p'];
		if ( 'publish' !== get_post_status( $p ) ) { continue; }
		$hooks[] = array(
			'q' => $k['q'],
			't' => get_the_title( $p ),
			'u' => get_permalink( $p ),
			'm' => tj_read_min( $p ),
		);
	}

	$h  = '<header class="tjg-hero">';
	$h .= '<h1 class="tjg-sr">مجلهٔ تجربه</h1>';

	$h .= '<div class="tjg-find" data-tjg-find>';
	$h .= '<div class="tjg-find-in">';
	$h .= '<input type="search" placeholder="دنبال چه می‌گردید؟ در عنوان ۲۶۷ نوشته بگردید" aria-label="جست‌وجو در مجله" autocomplete="off">';
	$h .= '<svg class="tjg-find-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'
		. '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>';
	$h .= '<div class="tjg-res" data-tjg-res hidden></div>';
	$h .= '</div><div class="tjg-seeds">';
	foreach ( tj_mag_seeds() as $s ) {
		$h .= '<button type="button" class="tjg-seed" data-tjg-seed="' . esc_attr( $s ) . '">' . esc_html( $s ) . '</button>';
	}
	$h .= '</div></div>';

	if ( ! empty( $hooks ) ) {
		$first = $hooks[ array_rand( $hooks ) ];
		$h .= '<div class="tjg-hook" data-tjg-hook>';
		$h .= '<p class="tjg-hook-q" data-tjg-hook-q>' . esc_html( '«' . $first['q'] . '»' ) . '</p>';
		$h .= '<div class="tjg-hook-foot">';
		$h .= '<p class="tjg-hook-src" data-tjg-hook-src>از نوشته‌ی '
			. '<a href="' . esc_url( $first['u'] ) . '">' . esc_html( $first['t'] ) . '</a>'
			. ' · ' . esc_html( tj_fa( $first['m'] ) ) . ' دقیقه خواندن</p>';
		$h .= '<button type="button" class="tjg-shuffle" data-tjg-shuffle>یکی دیگر نشانم بده</button>';
		$h .= '</div></div>';
		$h .= '<script type="application/json" id="tjg-hook-data">' . wp_json_encode( $hooks ) . '</script>';
	}

	$h .= '</header>';
	return $h;
}

/** ۲. نوار امروز */
function tj_sec_today() {
	$data = array();
	foreach ( tj_mag_calendar() as $o ) {
		$row = array( 'md' => $o['md'], 't' => $o['t'] );
		$p = isset( $o['p'] ) ? (int) $o['p'] : 0;
		if ( $p && 'publish' === get_post_status( $p ) ) {
			$row['u']  = get_permalink( $p );
			$row['pt'] = get_the_title( $p );
		}
		$data[] = $row;
	}

	$key  = gmdate( 'm-d', current_time( 'timestamp' ) );
	$pick = $data[0];
	$best = 1e9;
	foreach ( $data as $row ) {
		$a = (int) substr( $row['md'], 0, 2 ) * 31 + (int) substr( $row['md'], 3, 2 );
		$b = (int) substr( $key, 0, 2 ) * 31 + (int) substr( $key, 3, 2 );
		if ( $row['md'] === $key ) { $pick = $row; break; }
		$diff = ( $a >= $b ) ? ( $a - $b ) : ( 372 - $b + $a );
		if ( $diff < $best ) { $best = $diff; $pick = $row; }
	}

	$h  = '<div class="tjg-today" data-tjg-today>';
	$h .= '<span class="tjg-today-b" data-tjg-today-b>تقویم روان</span>';
	$h .= '<span class="tjg-today-t" data-tjg-today-t>' . esc_html( $pick['t'] ) . '</span>';
	$h .= '<span class="tjg-today-a" data-tjg-today-a>';
	if ( isset( $pick['u'] ) ) {
		$h .= 'برای همین روز بخوانید: <a href="' . esc_url( $pick['u'] ) . '">' . esc_html( $pick['pt'] ) . '</a>';
	}
	$h .= '</span>';
	$h .= '<span class="tjg-today-n" data-tjg-today-n></span>';
	$h .= '</div>';
	$h .= '<script type="application/json" id="tjg-occ-data">' . wp_json_encode( $data ) . '</script>';
	return $h;
}

/** ۳. تیتر یک و تازه‌ها */
function tj_sec_lead() {
	$ids = tj_posts( array( 'posts_per_page' => 5 ) );
	if ( empty( $ids ) ) { return ''; }
	$lead = array_shift( $ids );
	$cat  = tj_primary_cat( $lead );
	$img  = tj_thumb( $lead, 'large' );

	$h  = '<section class="tjg-tight" aria-label="تازه‌ترین نوشته">';
	$h .= tj_head( 'تازه رسیده', 'تیتر یک' );
	$h .= '<div class="tjg-lead"><a class="tjg-lead-fig" href="' . esc_url( get_permalink( $lead ) ) . '" tabindex="-1" aria-hidden="true">';
	$h .= $img ? '<img src="' . esc_url( $img ) . '" alt="' . esc_attr( get_the_title( $lead ) ) . '" fetchpriority="high" decoding="async">' : '<span class="tjg-card-ph"></span>';
	$h .= '</a><div>';
	if ( $cat ) {
		$h .= '<a class="tjg-kicker" href="' . esc_url( get_category_link( $cat->term_id ) ) . '">' . esc_html( $cat->name ) . '</a>';
	}
	$h .= '<h2><a href="' . esc_url( get_permalink( $lead ) ) . '">' . esc_html( get_the_title( $lead ) ) . '</a></h2>';
	$h .= '<p class="tjg-card-x">' . esc_html( tj_excerpt( $lead, 220 ) ) . '</p>';
	$h .= '<p class="tjg-card-m"><span>' . esc_html( get_the_author_meta( 'display_name', get_post_field( 'post_author', $lead ) ) ) . '</span>'
		. '<span class="tjg-dot"></span><span>' . esc_html( tj_date( $lead ) ) . '</span>'
		. '<span class="tjg-dot"></span><span>' . esc_html( tj_fa( tj_read_min( $lead ) ) ) . ' دقیقه</span></p>';
	$h .= '</div></div>';
	$h .= '<div style="margin-block-start:38px">' . tj_row( $ids, array( 'exc' => true ), 'tjg-g4' ) . '</div>';
	$h .= '</section>';
	return $h;
}

/** ۴. سینما روی کاناپه */
function tj_sec_cinema() {
	$c   = tj_mag_cats();
	$ids = tj_posts( array( 'cat' => $c['film'], 'posts_per_page' => 6 ) );
	if ( empty( $ids ) ) { return ''; }
	$t = get_term( $c['film'], 'category' );
	$n = ( $t && ! is_wp_error( $t ) ) ? (int) $t->count : 0;

	$h  = '<section class="tjg-cine" aria-label="سینما روی کاناپه">';
	$h .= tj_head( '', 'سینما روی کاناپه', get_category_link( $c['film'] ), 'همهٔ ' . tj_fa( $n ) . ' فیلم', '',
		'فیلم را می‌خوابانیم روی کاناپه و می‌گذاریم حرف بزند. گاهی یک شخصیت داستانی چیزی را نشان می‌دهد که هیچ توضیح نظری نشان نمی‌دهد.' );
	$h .= tj_row( $ids, array( 'exc' => true ), 'tjg-g3' );
	$h .= tj_cine_pick( $c['film'] );
	$h .= '</section>';
	return $h;
}

/** پیشنهاد فیلم از میان فیلم‌های پوشش‌داده‌شده */
function tj_cine_pick( $cat ) {
	$all = tj_posts( array( 'cat' => $cat, 'posts_per_page' => 60 ) );
	if ( count( $all ) < 3 ) { return ''; }
	$strip = array(
		'معرفی و بررسی روانشناختی سریال ', 'بررسی روانشناختی و نقد فیلم ', 'معرفی و تحلیل مینی سریال ',
		'کاوشی روانکاوانه در سریال ', 'نگاهی روانکاوانه به فیلم ', 'تحلیل روانکاوانه فیلم ',
		'معرفی و تحلیل انیمیشن ', 'بررسی روانشناختی فیلم ', 'تحلیل روانشناختی فیلم ',
		'بررسی روانکاوانه فیلم ', 'معرفی و تحلیل سریال ', 'معرفی و تحلیل فیلم ',
		'معرفی و بررسی فیلم ', 'نگاهی به مینی‌سریال ', 'نقد و بررسی انیمیشن ',
		'معرفی مینی‌سریال ', 'نقد و بررسی فیلم ', 'نقد و تحلیل فیلم ', 'نگاهی به سریال ',
		'نگاهی به فیلم ', 'تحلیل سریال ', 'معرفی سریال ', 'تحلیل فیلم ', 'معرفی فیلم ',
		'نقد فیلم ', 'بررسی فیلم ', 'انیمیشن ', 'مستند ', 'سریال ', 'فیلم ',
	);
	$cut = array( ' : ', ' :', '؛ ', ' | ', ' – ', ' - ' );
	$key = array( 'تحلیل', 'نقد', 'بررسی', 'نگاهی', 'روانکاوانه', 'روانشناختی' );
	$list = array();
	foreach ( $all as $id ) {
		$t = get_the_title( $id );
		foreach ( $strip as $s ) {
			if ( 0 === mb_strpos( $t, $s ) ) { $t = mb_substr( $t, mb_strlen( $s ) ); break; }
		}
		foreach ( $cut as $sep ) {
			$pos = mb_strpos( $t, $sep );
			if ( false === $pos || $pos < 5 ) { continue; }
			$tail = mb_substr( $t, $pos );
			foreach ( $key as $kw ) {
				if ( false !== mb_strpos( $tail, $kw ) ) { $t = mb_substr( $t, 0, $pos ); break; }
			}
		}
		$t = trim( $t );
		if ( mb_strlen( $t ) < 3 ) { $t = get_the_title( $id ); }
		$list[] = array( 't' => $t, 'u' => get_permalink( $id ) );
	}
	$first = $list[ array_rand( $list ) ];

	$h  = '<div class="tjg-pick" data-tjg-pick>';
	$h .= '<div><p class="tjg-pick-k">امشب چه ببینیم؟</p>';
	$h .= '<p class="tjg-pick-t" data-tjg-pick-t>' . esc_html( $first['t'] ) . '</p></div>';
	$h .= '<div class="tjg-pick-a">';
	$h .= '<a data-tjg-pick-u href="' . esc_url( $first['u'] ) . '">تحلیل این فیلم را بخوانید</a>';
	$h .= '<button type="button" data-tjg-pick-b>یکی دیگر</button>';
	$h .= '</div></div>';
	$h .= '<script type="application/json" id="tjg-film-data">' . wp_json_encode( $list ) . '</script>';
	return $h;
}

/** ۵. قرن روانکاوی */
function tj_sec_century() {
	$figs  = tj_mag_figures();
	$lanes = tj_mag_lanes();
	$y0 = 1850; $y1 = 1960;
	$labw = 118; $pillw = 186; $track = 1400;
	$ppy = $track / ( $y1 - $y0 );

	$by_lane = array();
	foreach ( $figs as $f ) { $by_lane[ $f['lane'] ][] = $f; }
	$placed = array();
	$rows_in_lane = array();
	foreach ( $by_lane as $ln => $items ) {
		usort( $items, function ( $a, $b ) { return $a['b'] - $b['b']; } );
		$ends = array();
		foreach ( $items as $f ) {
			$x = ( $f['b'] - $y0 ) * $ppy;
			$row = 0;
			while ( isset( $ends[ $row ] ) && $ends[ $row ] > $x - 10 ) { $row++; }
			$ends[ $row ] = $x + $pillw;
			$f['x'] = $x; $f['row'] = $row;
			$placed[ $ln ][] = $f;
		}
		$rows_in_lane[ $ln ] = count( $ends );
	}

	$h  = '<section aria-label="قرن روانکاوی">';
	$h .= tj_head( 'چهره‌ها', 'یک قرن روانکاوی، روی یک خط', get_category_link( 5 ), 'همهٔ چهره‌ها', '',
		'هر کارت سر جای سال تولد آن چهره ایستاده و هر ردیف یک مکتب است. از راست به چپ، از ۱۸۵۰ تا امروز. خط را بکشید تا بقیه را ببینید.' );
	$h .= '<div class="tjg-tl-wrap"><div class="tjg-tl-scroll"><div class="tjg-tl" style="min-width:' . (int) ( $labw + $track + $pillw + 44 ) . 'px">';

	$h .= '<div class="tjg-tl-axis">';
	for ( $y = $y0; $y <= $y1; $y += 10 ) {
		$h .= '<span class="tjg-tl-tick" style="inset-inline-start:' . round( ( $y - $y0 ) * $ppy ) . 'px">' . esc_html( tj_fa( $y ) ) . '</span>';
	}
	$h .= '</div>';

	foreach ( $lanes as $ln => $label ) {
		if ( empty( $placed[ $ln ] ) ) { continue; }
		$hgt = max( 1, $rows_in_lane[ $ln ] ) * 60 + 18;
		$h .= '<div class="tjg-lane" style="height:' . (int) $hgt . 'px">';
		$h .= '<span class="tjg-lane-name">' . esc_html( $label ) . '</span>';
		foreach ( $placed[ $ln ] as $f ) {
			$img = tj_thumb( $f['p'], 'thumbnail' );
			$yr  = $f['d'] ? ( tj_fa( $f['b'] ) . ' تا ' . tj_fa( $f['d'] ) ) : ( 'متولد ' . tj_fa( $f['b'] ) );
			$h .= '<a class="tjg-fig" href="' . esc_url( get_permalink( $f['p'] ) ) . '"'
				. ' style="inset-inline-start:' . (int) ( $labw + round( $f['x'] ) ) . 'px;top:' . ( 9 + $f['row'] * 60 ) . 'px">';
			$h .= $img
				? '<img src="' . esc_url( $img ) . '" alt="" loading="lazy" decoding="async" style="object-position:50% 28%">'
				: '<span class="tjg-fig-mono">' . esc_html( mb_substr( $f['n'], 0, 1 ) ) . '</span>';
			$h .= '<span class="tjg-fig-txt">'
				. '<span class="tjg-fig-n">' . esc_html( $f['n'] ) . '</span>'
				. '<span class="tjg-fig-y">' . esc_html( $yr ) . '</span>'
				. '<span class="tjg-fig-w">' . esc_html( $f['w'] ) . '</span></span></a>';
		}
		$h .= '</div>';
	}
	$h .= '</div></div></div></section>';
	return $h;
}

/** ۶. مسیرهای مطالعه */
function tj_sec_paths() {
	$h  = '<section aria-label="مسیرهای مطالعه">';
	$h .= tj_head( 'برای خواندن پیوسته', 'مسیرهای مطالعه', '', '', 'tjg-paths',
		'هر مسیر یک ترتیب درست است، نه یک فهرست. هرکدام را که خواندید تیک بزنید تا بداند کجا مانده‌اید و چقدر تا پایانش مانده. این تیک‌ها فقط در مرورگر خودتان می‌ماند.' );
	$h .= '<div class="tjg-paths" data-tjg-paths>';
	foreach ( tj_mag_paths() as $p ) {
		$ids = array();
		foreach ( $p['ids'] as $id ) {
			if ( 'publish' === get_post_status( $id ) ) { $ids[] = $id; }
		}
		if ( count( $ids ) < 2 ) { continue; }
		$total = 0;
		foreach ( $ids as $id ) { $total += tj_read_min( $id ); }

		$h .= '<div class="tjg-path" data-tjg-path>';
		$h .= '<div class="tjg-path-top"><span class="tjg-ring">'
			. '<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="tjg-ring-bg" cx="24" cy="24" r="21"></circle>'
			. '<circle class="tjg-ring-fg" cx="24" cy="24" r="21" stroke-dasharray="132" stroke-dashoffset="132"></circle></svg>'
			. '<b>' . esc_html( '۰/' . tj_fa( count( $ids ) ) ) . '</b></span>';
		$h .= '<span><h3>' . esc_html( $p['t'] ) . '</h3>'
			. '<span class="tjg-path-d">' . esc_html( $p['d'] ) . '</span></span></div>';
		$h .= '<span class="tjg-path-left" data-tjg-left>' . esc_html( tj_fa( $total ) ) . ' دقیقه تا پایان این مسیر</span>';
		$h .= '<details class="tjg-path-det"><summary>' . esc_html( 'فهرست ' . tj_fa( count( $ids ) ) . ' نوشته' ) . '</summary>';
		$h .= '<ol class="tjg-path-list">';
		foreach ( $ids as $id ) {
			$m = tj_read_min( $id );
			$h .= '<li class="tjg-step" data-tjg-step="' . (int) $id . '" data-m="' . (int) $m . '">'
				. '<span class="tjg-step-box" role="checkbox" aria-checked="false" tabindex="0" aria-label="خوانده شد"></span>'
				. '<a href="' . esc_url( get_permalink( $id ) ) . '">' . esc_html( get_the_title( $id ) ) . '</a>'
				. '<span class="tjg-step-m">' . esc_html( tj_fa( $m ) . ' دقیقه' ) . '</span></li>';
		}
		$h .= '</ol></details>';
		$h .= '<a class="tjg-path-cta" data-tjg-path-cta href="' . esc_url( get_permalink( $ids[0] ) ) . '">شروع کنید</a>';
		$h .= '</div>';
	}
	$h .= '</div><p class="tjg-paths-note" data-tjg-paths-sum></p></section>';
	return $h;
}

/** ۷. قفسهٔ تجربه */
function tj_sec_shelf() {
	$c   = tj_mag_cats();
	$ids = tj_posts( array( 'cat' => $c['book'], 'posts_per_page' => 24 ) );
	if ( empty( $ids ) ) { return ''; }
	$t = get_term( $c['book'], 'category' );
	$n = ( $t && ! is_wp_error( $t ) ) ? (int) $t->count : count( $ids );

	$face  = array_slice( $ids, 0, 3 );
	$spine = array_slice( $ids, 3 );
	$tones = array( '#8e2d34', '#c83f49', '#4e4e4e', '#b63942', '#222222', '#6e2328', '#676768', '#541a1f' );

	$h  = '<section aria-label="قفسهٔ کتاب">';
	$h .= tj_head( 'کتاب', 'قفسهٔ تجربه', get_category_link( $c['book'] ), 'همهٔ ' . tj_fa( $n ) . ' کتاب', '',
		'هر کتابی که در این قفسه است را خوانده‌ایم و درباره‌اش نوشته‌ایم. سه‌تای اول تازه‌ترین‌اند.' );
	$h .= '<div class="tjg-shelf-scroll"><div class="tjg-shelf">';

	foreach ( $face as $id ) {
		$img = tj_thumb( $id, 'medium' );
		$h  .= '<a class="tjg-face" href="' . esc_url( get_permalink( $id ) ) . '">';
		$h  .= '<span class="tjg-face-c">' . ( $img
			? '<img src="' . esc_url( $img ) . '" alt="' . esc_attr( get_the_title( $id ) ) . '" loading="lazy" decoding="async">'
			: '<span class="tjg-card-ph"></span>' ) . '</span>';
		$h  .= '<span class="tjg-face-t">' . esc_html( get_the_title( $id ) ) . '</span></a>';
	}
	foreach ( $spine as $i => $id ) {
		$title = get_the_title( $id );
		$title = preg_replace( '/^[\s:؛\-]+|[\s:؛\-]+$/u', '', str_replace( array( 'معرفی و تحلیل کتاب', 'معرفی کتاب', 'نقد و تحلیل کتاب', 'کتاب' ), '', $title ) ); // trim بایتی با «؛» حرف اول را خراب می‌کرد و عنوان خالی می‌شد
		if ( '' === $title ) { $title = get_the_title( $id ); }
		if ( mb_strlen( $title ) > 30 ) { $title = mb_substr( $title, 0, 30 ) . '…'; }
		$hgt = min( 258, max( 174, 46 + mb_strlen( $title ) * 7 ) );
		$h  .= '<a class="tjg-spine" href="' . esc_url( get_permalink( $id ) ) . '"'
			. ' style="height:' . (int) $hgt . 'px;background:' . esc_attr( $tones[ $i % count( $tones ) ] ) . '"'
			. ' title="' . esc_attr( get_the_title( $id ) ) . '">'
			. '<span>' . esc_html( $title ) . '</span></a>';
	}
	$h .= '</div></div>';
	$h .= '<p class="tjg-shelf-foot">روی هر عطف بزنید تا نوشته‌اش باز شود.</p>';
	$h .= '</section>';
	return $h;
}

/** ۸. میز دانشجو */
function tj_sec_student() {
	$c = tj_mag_cats();
	$url_con = ( 'publish' === get_post_status( 502969 ) ) ? get_permalink( 502969 ) : get_category_link( $c['psy'] );
	$url_fac = ( 'publish' === get_post_status( 502968 ) ) ? get_permalink( 502968 ) : get_category_link( $c['people'] );

	$tiles = array(
		array( 'n' => 'اگر تازه شروع کرده‌اید', 't' => 'واژه‌نامهٔ مفاهیم',
			'd' => 'اصطلاح‌هایی که سر کلاس رد می‌شوند و کسی توضیح نمی‌دهد، اینجا با زبان ساده و ارجاع.', 'u' => $url_con ),
		array( 'n' => 'اگر نمی‌دانید از کجا', 't' => 'مسیر روانکاوی از صفر',
			'd' => 'هفت نوشته به ترتیب درست. تیک بزنید تا بداند کجا مانده‌اید.', 'u' => '#tjg-paths' ),
		array( 'n' => 'برای امتحان و ارائه', 't' => 'چهره‌ها و مکتب‌ها',
			'd' => 'زندگی‌نامه و سهم هرکدام، به‌جای جزوه‌های دست‌چندم.', 'u' => $url_fac ),
		array( 'n' => 'برای پایان‌نامه', 't' => 'کتاب‌های مرجع',
			'd' => 'کابانیس، مک‌ویلیامز و بقیهٔ منابعی که واقعاً لازم می‌شوند.', 'u' => get_category_link( $c['book'] ) ),
	);

	$h  = '<section aria-label="میز دانشجو"><div class="tjg-desk-wrap">';
	$h .= '<div class="tjg-desk-h"><p class="tjg-eyebrow">میز دانشجو</p>';
	$h .= '<h2>دانشجوی روان‌شناسی هستید؟ این‌جا برای شماست.</h2>';
	$h .= '<span>می‌دانیم که منابع فارسی درست‌وحسابی کم است و جزوه‌ها دست‌چندم‌اند. این چهار تا را برای همین چیدیم.</span></div>';
	$h .= '<div class="tjg-desk">';
	foreach ( $tiles as $t ) {
		$h .= '<a class="tjg-tile" href="' . esc_url( $t['u'] ) . '">'
			. '<span class="tjg-tile-n">' . esc_html( $t['n'] ) . '</span>'
			. '<h3>' . esc_html( $t['t'] ) . '</h3>'
			. '<p>' . esc_html( $t['d'] ) . '</p></a>';
	}
	$h .= '</div>';
	$h .= '<div class="tjg-desk-cta">'
		. '<p>دانشجوها هم در مدرسهٔ تجربه و هم در گرفتن تراپی از تجربه تخفیف دارند.</p>'
		. '<a class="tjg-btn" href="' . esc_url( home_url( '/school/' ) ) . '">مدرسهٔ تجربه</a></div>';
	$h .= '</div></section>';
	return $h;
}

/** ۹. اتاق درمان و دست‌نوشته‌ها */
function tj_sec_room() {
	$c = tj_mag_cats();
	$h = '';

	$ids = tj_posts( array( 'cat' => $c['ther'], 'posts_per_page' => 4 ) );
	if ( $ids ) {
		$h .= '<section aria-label="از اتاق درمان">';
		$h .= tj_head( 'از اتاق درمان', 'روان‌درمانی در عمل', get_category_link( $c['ther'] ), 'همهٔ نوشته‌ها' );
		$h .= tj_row( $ids, array( 'exc' => true ), 'tjg-g4' );
		$h .= '</section>';
	}
	$ids = tj_posts( array( 'cat' => $c['note'], 'posts_per_page' => 4 ) );
	if ( $ids ) {
		$h .= '<section aria-label="دست‌نوشته‌ها">';
		$h .= tj_head( 'نوشته‌های شخصی', 'دست‌نوشته‌ها', get_category_link( $c['note'] ), 'همهٔ دست‌نوشته‌ها' );
		$h .= tj_row( $ids, array( 'exc' => true ), 'tjg-g4' );
		$h .= '</section>';
	}
	return $h;
}

/** ۱۰. اینستاگرام */
function tj_sec_insta() {
	$pages = array(
		'tajrobeh.life'          => 'https://instagram.com/tajrobeh.life',
		'experientiallifecenter' => 'https://instagram.com/experientiallifecenter',
		'tajrobeh_school'        => 'https://instagram.com/tajrobeh_school',
	);
	$h  = '<section aria-label="مجله و اینستاگرام"><div class="tjg-ig">';
	$h .= '<p>هرچه در اینستاگرام کوتاه گفتیم، <b>اینجا کامل و با ارجاع نوشته‌ایم.</b> پست‌های ما اغلب سرِ نخ‌اند و متن کامل‌شان در همین مجله است.</p>';
	$h .= '<span class="tjg-ig-l">';
	foreach ( $pages as $name => $url ) {
		$h .= '<a href="' . esc_url( $url ) . '" rel="noopener" target="_blank">' . esc_html( '@' . $name ) . '</a>';
	}
	$h .= '</span></div></section>';
	return $h;
}

/** ۱۱. نویسندگان */
function tj_sec_authors() {
	$users = get_users( array(
		'has_published_posts' => array( 'post' ),
		'orderby'             => 'post_count',
		'order'               => 'DESC',
		'number'              => 24,
		'exclude'             => array( 1 ),
		'fields'              => array( 'ID', 'display_name' ),
	) );
	if ( empty( $users ) ) { return ''; }

	$h  = '<section aria-label="نویسندگان مجله">';
	$h .= tj_head( 'به قلم', 'نویسندگان مجله', '', '', '',
		'تراپیست‌ها، دانشجوها و تحریریهٔ تجربه. روی هر نام بزنید تا همهٔ نوشته‌هایش را ببینید.' );
	$h .= '<div class="tjg-authors">';
	foreach ( $users as $u ) {
		$n = trim( $u->display_name );
		if ( '' === $n ) { continue; }
		$cnt = count_user_posts( $u->ID, 'post', true );
		$h  .= '<a class="tjg-au" href="' . esc_url( get_author_posts_url( $u->ID ) ) . '">'
			. '<span class="tjg-au-i">' . esc_html( mb_substr( $n, 0, 1 ) ) . '</span>'
			. '<span>' . esc_html( $n ) . '</span>'
			. '<span class="tjg-au-c">' . esc_html( tj_fa( $cnt ) ) . '</span></a>';
	}
	$h .= '</div></section>';
	return $h;
}

/** ۱۲. موضوع‌ها و آرشیو */
function tj_sec_archive() {
	$cached = get_transient( 'tjg_archive_v4' );
	if ( is_string( $cached ) && '' !== $cached ) { return $cached; }

	$c = tj_mag_cats();
	$order = array( 'psy', 'ther', 'film', 'book', 'note', 'life', 'people', 'lit', 'kid' );

	$q = new WP_Query( array(
		'post_type'              => 'post',
		'post_status'            => 'publish',
		'posts_per_page'         => -1,
		'ignore_sticky_posts'    => true,
		'no_found_rows'          => true,
		'update_post_meta_cache' => false,
		'orderby'                => 'date',
		'order'                  => 'DESC',
	) );

	$years = array();
	foreach ( $q->posts as $p ) {
		$y = tj_jyear_num( $p->ID );
		$years[ $y ][] = $p;
	}
	wp_reset_postdata();
	krsort( $years );

	$h  = '<section aria-label="موضوع‌ها و آرشیو">';
	$h .= tj_head( 'همه‌چیز یک‌جا', 'موضوع‌ها و آرشیو', '', '', 'tjg-archive',
		'اگر دنبال چیز مشخصی هستید، از جست‌وجوی بالای صفحه سریع‌تر می‌رسید.' );
	$h .= '<div class="tjg-topics">';
	foreach ( $order as $k ) {
		$t = get_term( $c[ $k ], 'category' );
		if ( ! $t || is_wp_error( $t ) ) { continue; }
		$h .= '<a class="tjg-topic" href="' . esc_url( get_category_link( $t->term_id ) ) . '">'
			. esc_html( $t->name ) . ' <b>' . esc_html( tj_fa( (int) $t->count ) ) . '</b></a>';
	}
	$h .= '</div>';

	$first = true;
	foreach ( $years as $y => $posts ) {
		$h .= '<details class="tjg-yr">';
		$h .= '<summary>سال ' . esc_html( tj_fa( $y ) ) . ' <b>' . esc_html( tj_fa( count( $posts ) ) ) . ' نوشته</b></summary>';
		$h .= '<div class="tjg-yr-list">';
		foreach ( $posts as $p ) {
			$h .= '<div class="tjg-ar-item" data-tjg-ar-item>'
				. '<a href="' . esc_url( get_permalink( $p ) ) . '">' . esc_html( get_the_title( $p ) ) . '</a>'
				. '<em>' . esc_html( tj_date( $p->ID, 'short' ) ) . '</em></div>';
		}
		$h .= '</div></details>';
		$first = false;
	}
	$h .= '</section>';

	set_transient( 'tjg_archive_v4', $h, 12 * HOUR_IN_SECONDS );
	return $h;
}

add_action( 'save_post_post', function () { delete_transient( 'tjg_archive_v4' ); } );

/** ۱۳. پایان صفحه */
function tj_sec_foot() {
	$h  = '<section class="tjg-foot">';
	$h .= '<h2>حالا وقت حرف زدن است</h2>';
	$h .= '<p>مجله جایی‌ست که فکر می‌کنیم؛ اتاق درمان جایی‌ست که کار می‌کنیم. هر وقت آماده بودید، از همین‌جا شروع کنید.</p>';
	$h .= '<div class="tjg-foot-a">';
	$h .= '<a class="tjg-btn" href="' . esc_url( home_url( '/get-therapy/' ) ) . '">شروع تراپی</a>';
	$h .= '<a class="tjg-btn tjg-btn-o" href="https://t.me/tajrobeh_life" rel="noopener">کانال تلگرام</a>';
	$h .= '</div></section>';
	$h .= '<p class="tjg-fine"><a href="' . esc_url( home_url( '/feed/' ) ) . '">خوراک RSS مجله</a></p>';
	return $h;
}

/** ۱۴. داده‌ی ساختاریافته */
function tj_sec_schema() {
	$ids = tj_posts( array( 'posts_per_page' => 10 ) );
	$items = array();
	foreach ( $ids as $i => $id ) {
		$items[] = array(
			'@type'    => 'ListItem',
			'position' => $i + 1,
			'url'      => get_permalink( $id ),
			'name'     => get_the_title( $id ),
		);
	}
	$data = array(
		'@context'    => 'https://schema.org',
		'@type'       => 'Blog',
		'@id'         => home_url( '/mag/#blog' ),
		'name'        => 'مجلهٔ تجربه',
		'description' => 'نوشته‌هایی دربارهٔ روان، رابطه و زندگی روزمره، به قلم تراپیست‌ها و نویسنده‌های مرکز تجربه زندگی.',
		'inLanguage'  => 'fa-IR',
		'url'         => home_url( '/mag/' ),
		'publisher'   => array(
			'@type' => 'Organization',
			'name'  => 'مرکز تجربه زندگی',
			'url'   => home_url( '/' ),
		),
		'mainEntity'  => array(
			'@type'           => 'ItemList',
			'itemListElement' => $items,
		),
	);
	return '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . '</script>';
}

/* ---------- خروجی ---------- */

function tj_mag_home() {
	$h  = '<div class="tjg" dir="rtl" lang="fa">';
	$h .= tj_mag_css();
	$h .= tj_sec_hero();
	$h .= tj_sec_today();
	$h .= tj_sec_lead();
	$h .= tj_sec_cinema();
	$h .= tj_sec_century();
	$h .= tj_sec_paths();
	$h .= tj_sec_shelf();
	$h .= tj_sec_student();
	$h .= tj_sec_room();
	$h .= tj_sec_insta();
	$h .= tj_sec_authors();
	$h .= tj_sec_archive();
	$h .= tj_sec_foot();
	$h .= tj_sec_schema();
	$h .= tj_mag_js();
	$h .= '</div>';
	return $h;
}

add_shortcode( 'tj_mag_home', 'tj_mag_home' );

/**
 * جای‌گزینی محتوای صفحه‌ی مجله.
 * قالب page-mag دست‌نخورده می‌ماند؛ فقط گروه main.tjm با خروجی تازه عوض می‌شود.
 * برای برگشت به حالت قبل کافی است این قطعه‌کد غیرفعال شود.
 */
function tj_mag_swap( $pre, $block ) {
	if ( null !== $pre ) { return $pre; }
	if ( defined( 'TJ_MAG_V3_LIVE' ) ) { if ( TJ_MAG_V3_LIVE ) { return $pre; } }
	if ( is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) { return $pre; }
	if ( ! isset( $block['blockName'] ) || 'core/group' !== $block['blockName'] ) { return $pre; }
	if ( ! is_page( 287 ) ) { return $pre; }
	$cls = isset( $block['attrs']['className'] ) ? trim( (string) $block['attrs']['className'] ) : '';
	if ( 'tjm' !== $cls ) { return $pre; }
	return '<main class="tjg-main">' . tj_mag_home() . '</main>';
}
add_filter( 'pre_render_block', 'tj_mag_swap', 10, 2 );

/* ==========================================================
 * TJ Mag Home v3 (۶ مهر ۱۴۰۵)
 * بازطراحی صفحهٔ مجله: سربرگ با H1 واقعی، جلد، تقویم زندهٔ دو هفته‌ای
 * (از دادهٔ evData برگهٔ رویدادها 505409)، پروندهٔ ماه، ورود از راه نیاز،
 * اطلس مفاهیم، و بخش‌های قبلی با کارت‌های کوچک‌تر.
 * همهٔ متن‌ها و لینک‌ها سمت سرور ساخته می‌شوند تا خزنده ببیند.
 * ========================================================== */

/** پروندهٔ هر ماه شمسی (کلید = شمارهٔ ماه). هر سال خودکار تکرار می‌شود. */
function tjm3_issues() {
	return array(
		1  => array( 't' => 'نو شدن', 'd' => 'نوروز فقط عوض شدن تقویم نیست. این‌جا از این می‌خوانیم که آدم چطور واقعاً عوض می‌شود و چرا خودیاری معمولاً کافی نیست.', 'ids' => array( 170, 275, 108, 192 ) ),
		2  => array( 't' => 'ماه فروید', 'd' => 'شانزدهم اردیبهشت زادروز فروید است. از زندگی‌اش تا تداعی آزاد و تعبیر رویا، چهار نوشته برای شروع.', 'ids' => array( 40, 192, 70, 16 ) ),
		3  => array( 't' => 'کودکی', 'd' => 'به بهانهٔ روز جهانی کودک: کودک در روانکاوی چطور دیده می‌شود و درمانش چه اصولی دارد.', 'ids' => array( 215, 221, 227, 134 ) ),
		4  => array( 't' => 'رابطهٔ درمانی', 'd' => 'انتقال، همدلی و «اینجا و اکنون». آنچه میان درمانگر و مراجع می‌گذرد، از چشم خود درمانگرها.', 'ids' => array( 73, 68, 120, 283 ) ),
		5  => array( 't' => 'ناخودآگاه', 'd' => 'چهارم مرداد زادروز یونگ است. از ناخودآگاه جمعی تا رویا و والایش در هنر.', 'ids' => array( 52, 69, 82, 97 ) ),
		6  => array( 't' => 'سوگ و فقدان', 'd' => 'شهریور ماه درگذشت لکان و فروید است. چهار نوشته دربارهٔ از دست دادن و سوگواری.', 'ids' => array( 193, 131, 78, 134 ) ),
		7  => array( 't' => 'درمان چطور کار می‌کند؟', 'd' => 'هجدهم مهر روز جهانی سلامت روان است. این ماه از داخل اتاق درمان می‌نویسیم: حرف زدن چطور درمان می‌کند و درمانگر خوب را از کجا بشناسیم.', 'ids' => array( 124, 172, 281, 205 ) ),
		8  => array( 't' => 'زن، بدن، خشونت', 'd' => 'از نقد هورنای بر فروید تا خشونت علیه زنان و دوسوگرایی مادرانه.', 'ids' => array( 258, 117, 144, 279 ) ),
		9  => array( 't' => 'دفاع‌ها', 'd' => 'دوازدهم آذر زادروز آنا فروید است. سازوکارهای دفاعی، خشم و شرم را از نزدیک ببینیم.', 'ids' => array( 103, 74, 115, 138 ) ),
		10 => array( 't' => 'تنهایی', 'd' => 'شب‌های بلند زمستان. تنهایی از دیدگاه روانکاوی و ظرفیت تنها بودن وینیکات.', 'ids' => array( 186, 30, 76, 202 ) ),
		11 => array( 't' => 'عشق', 'd' => 'چرا عاشق آدم «اشتباه» می‌شویم؟ فروید و روانکاوی دربارهٔ عشق چه می‌گویند؟', 'ids' => array( 125, 199, 216, 280 ) ),
		12 => array( 't' => 'مادر', 'd' => 'به بهانهٔ روز جهانی زن و زادروز ملانی کلاین: مادری فراتر از کلیشهٔ فداکاری.', 'ids' => array( 279, 268, 86, 31 ) ),
	);
}

/** ورود از راه نیاز: هر کارت یک صفحهٔ /help/ و دو نوشتهٔ مجله. */
function tjm3_needs() {
	return array(
		array( 't' => 'اضطراب', 'd' => 'نگرانی‌ای که تمام نمی‌شود و بدن را هم درگیر می‌کند.', 'h' => 504361, 'ids' => array( 251, 250 ) ),
		array( 't' => 'سوگ و فقدان', 'd' => 'بعد از مرگ، جدایی یا از دست دادن هر چیز مهم.', 'h' => 504387, 'ids' => array( 131, 78 ) ),
		array( 't' => 'عشق و رابطه', 'd' => 'تکرار یک الگو در رابطه‌ها، خیانت، جدایی.', 'h' => 504383, 'ids' => array( 216, 125 ) ),
		array( 't' => 'افسردگی', 'd' => 'بی‌میلی، خستگی و حسی که اسمش را نمی‌دانید.', 'h' => 504362, 'ids' => array( 128, 275 ) ),
		array( 't' => 'پدر، مادر، خانواده', 'd' => 'رد والدین در زندگی امروز شما و در فرزندپروری.', 'h' => 505214, 'ids' => array( 104, 86 ) ),
		array( 't' => 'خشم و شرم', 'd' => 'حس‌هایی که پنهانشان می‌کنیم و از جای دیگری سر درمی‌آورند.', 'h' => 504388, 'ids' => array( 115, 138 ) ),
		array( 't' => 'تنهایی', 'd' => 'میان جمع یا دور از همه، و تنهایی بعد از مهاجرت.', 'h' => 505211, 'ids' => array( 186, 30 ) ),
		array( 't' => 'خواب و رویا', 'd' => 'بی‌خوابی، کابوس و رویاهایی که تکرار می‌شوند.', 'h' => 504386, 'ids' => array( 82, 249 ) ),
	);
}

/** اطلس مفاهیم: چهار خوشه، برگرفته از /مفاهیم-روانکاوی/ */
function tjm3_atlas() {
	return array(
		array( 't' => 'مفاهیم پایه', 'n' => array(
			12 => 'روانکاوی چیست', 27 => 'سمپتوم', 70 => 'تداعی آزاد', 82 => 'رویا', 69 => 'ناخودآگاه جمعی',
			13 => 'لغزش زبانی', 235 => 'فانتزی و فانتاسم', 97 => 'والایش', 33 => 'مرحلهٔ آینه‌ای', 163 => 'ساختارهای بالینی', 230 => 'پرورژن' ) ),
		array( 't' => 'اتاق درمان', 'n' => array(
			73 => 'انتقال', 68 => 'همدلی', 60 => 'همدلی و همدردی', 120 => 'اینجا و اکنون',
			65 => 'ارزیابی درمانجو', 177 => 'پایان روانکاوی', 172 => 'رازهای اتاق تراپی', 124 => 'درمان با گفتن' ) ),
		array( 't' => 'رشد و دلبستگی', 'n' => array(
			61 => 'روابط ابژه', 102 => 'دلبستگی', 108 => 'خود واقعی و کاذب', 76 => 'ظرفیت تنها بودن',
			11 => 'عاملیت', 112 => 'ذهنی‌سازی', 232 => 'کلاین و وینیکات' ) ),
		array( 't' => 'دفاع، آسیب و سوگ', 'n' => array(
			74 => 'مکانیسم‌های دفاعی', 139 => 'تروما', 128 => 'تروما و افسردگی', 135 => 'ترومای اجتماعی',
			131 => 'سوگواری', 134 => 'سوگ کودکان', 138 => 'شرم و گناه', 115 => 'خشم', 30 => 'تنهایی اگزیستانسیال' ) ),
	);
}

/* ---------- کمکی‌ها ---------- */

function tjm3_ok( $id ) { return $id && 'publish' === get_post_status( $id ); }

function tjm3_bot( $start ) { return 'https://t.me/tajrobehlife_bot?start=' . rawurlencode( $start ); }

function tjm3_wday( $w ) {
	$a = array( 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه' );
	return isset( $a[ $w ] ) ? $a[ $w ] : '';
}

/** نمایهٔ همهٔ نوشته‌ها برای «چقدر وقت دارید؟» (کش ۱۲ ساعته) */
function tjm3_index() {
	$c = get_transient( 'tjm3_idx_v1' );
	if ( is_array( $c ) ) { return $c; }
	$q = new WP_Query( array(
		'post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => -1,
		'ignore_sticky_posts' => true, 'no_found_rows' => true, 'orderby' => 'date', 'order' => 'DESC',
	) );
	$list = array(); $minY = 0; $authors = array();
	foreach ( $q->posts as $p ) {
		$cat = tj_primary_cat( $p->ID );
		$list[] = array(
			't' => get_the_title( $p ), 'u' => get_permalink( $p ), 'm' => tj_read_min( $p->ID ),
			'c' => $cat ? $cat->name : '',
		);
		$y = tj_jyear_num( $p->ID );
		if ( $y ) { if ( ! $minY ) { $minY = $y; } elseif ( $y < $minY ) { $minY = $y; } }
		$authors[ (int) $p->post_author ] = 1;
	}
	wp_reset_postdata();
	unset( $authors[1] );
	$out = array( 'list' => $list, 'since' => $minY, 'authors' => count( $authors ) );
	set_transient( 'tjm3_idx_v1', $out, 12 * HOUR_IN_SECONDS );
	return $out;
}
add_action( 'save_post_post', function () { delete_transient( 'tjm3_idx_v1' ); } );

/** دادهٔ رویدادها از برگهٔ 505409 (همان منبع /school/events/) */
function tjm3_events() {
	$post = get_post( 505409 );
	if ( ! $post ) { return array(); }
	$key = 'tjm3_ev_' . md5( $post->post_modified_gmt );
	$c = get_transient( $key );
	if ( is_array( $c ) ) { return $c; }
	if ( ! preg_match( '#<script type="application/json" id="evData">(.*?)</script>#s', $post->post_content, $m ) ) { return array(); }
	$d = json_decode( str_replace( '<\/', '</', $m[1] ), true );
	if ( ! is_array( $d ) || empty( $d['events'] ) ) { return array(); }
	$out = array( 'events' => $d['events'], 'P' => isset( $d['P'] ) ? $d['P'] : array() );
	set_transient( $key, $out, 6 * HOUR_IN_SECONDS );
	return $out;
}

/** نوشتهٔ پیش‌خوانی برای هر رویداد */
function tjm3_read_for( $e ) {
	$t  = isset( $e['ttl'] ) ? $e['ttl'] : '';
	$kw = array( 'رویا' => 82, 'مهاجرت' => 77, 'تروما' => 285, 'جنگ' => 284, 'کلاین' => 232, 'وینیکات' => 232,
		'لکان' => 19, 'انتقال' => 73, 'زنانگی' => 258, 'سوپرویژن' => 205, 'فروید' => 40, 'گروه' => 57,
		'هیجان' => 102, 'EFT' => 102, 'روان‌رنجوری' => 163, 'ناخودآگاه' => 82, 'شروع درمان' => 124, 'روان‌درمانی' => 124 );
	foreach ( $kw as $k => $id ) {
		if ( false !== mb_strpos( $t, $k ) ) { if ( tjm3_ok( $id ) ) { return $id; } }
	}
	$ap = array( 'lacan' => 33, 'classic' => 12, 'eft' => 102, 'modern' => 249, 'group' => 57 );
	if ( ! empty( $e['ap'] ) ) { if ( isset( $ap[ $e['ap'] ] ) ) { if ( tjm3_ok( $ap[ $e['ap'] ] ) ) { return $ap[ $e['ap'] ]; } } }
	$g = array( 'case' => 40, 'sup' => 205, 'jc' => 137, 'class' => 70 );
	if ( ! empty( $e['g'] ) ) { if ( isset( $g[ $e['g'] ] ) ) { if ( tjm3_ok( $g[ $e['g'] ] ) ) { return $g[ $e['g'] ]; } } }
	return 0;
}

function tjm3_ev_link( $e ) {
	$map = array( 'case' => '/school/events/freud-case-reading/', 'jc' => '/school/events/journal-club/', 'sup' => '/school/events/group-supervision/' );
	if ( ! empty( $e['g'] ) ) { if ( isset( $map[ $e['g'] ] ) ) { return home_url( $map[ $e['g'] ] ); } }
	if ( ! empty( $e['ln'] ) ) { if ( 'class' === $e['g'] ) { return home_url( $e['ln'] ); } }
	return home_url( '/school/events/#ev=' . rawurlencode( $e['i'] ) );
}

function tjm3_access( $a ) {
	if ( 'free' === $a ) { return 'رایگان و باز'; }
	if ( 'members' === $a ) { return 'مخصوص دانشجویان'; }
	return 'با ثبت‌نام';
}

/* ---------- بخش‌ها ---------- */

/** ۱. سربرگ مجله */
function tjm3_masthead() {
	$idx   = tjm3_index();
	$n     = count( $idx['list'] );
	$now   = current_time( 'timestamp' );
	list( $jy, $jm, $jd ) = tj_g2j( (int) gmdate( 'Y', $now ), (int) gmdate( 'n', $now ), (int) gmdate( 'j', $now ) );

	$h  = '<header class="tj3-mast">';
	$h .= '<p class="tj3-mast-top"><span class="tj3-issue">شمارهٔ ' . esc_html( tj_jmonth( $jm ) . ' ' . tj_fa( $jy ) ) . '</span>';
	$h .= '<span>' . esc_html( tj_fa( $n ) ) . ' نوشتهٔ تألیفی</span><span>' . esc_html( tj_fa( $idx['authors'] ) ) . ' نویسنده</span>';
	if ( $idx['since'] ) { $h .= '<span>از ' . esc_html( tj_fa( $idx['since'] ) ) . '</span>'; }
	$h .= '</p>';
	$h .= '<h1 class="tj3-h1">مجلهٔ تجربه</h1>';
	$h .= '<p class="tj3-sub">روانکاوی، روان‌درمانی، سینما و ادبیات، به قلم درمانگرها و دانشجوهای مرکز تجربه زندگی</p>';
	$h .= '<p class="tj3-lede">مجلهٔ تجربه نوشته‌های فارسی و تألیفی دربارهٔ روان و رابطه است: مفاهیم روانکاوی به زبان ساده، تحلیل روانکاوانهٔ فیلم و کتاب، زندگی‌نامهٔ چهره‌ها و گزارش از داخل اتاق درمان. نویسنده‌ها درمانگرهای کلینیک و دانشجوهای مدرسهٔ تجربه‌اند و هر ماه یک پرونده و چند برنامهٔ زنده کنار نوشته‌ها می‌آید.</p>';

	/* جست‌وجو: همان نشانه‌گذاری نسخهٔ قبل تا اسکریپت جست‌وجو کار کند */
	$h .= '<div class="tjg-find tj3-find" data-tjg-find><div class="tjg-find-in">';
	$h .= '<input type="search" placeholder="' . esc_attr( 'در عنوان ' . tj_fa( $n ) . ' نوشته بگردید: لکان، اضطراب، سوگ…' ) . '" aria-label="جست‌وجو در مجله" autocomplete="off">';
	$h .= '<svg class="tjg-find-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>';
	$h .= '<div class="tjg-res" data-tjg-res hidden></div></div>';
	$h .= '<div class="tjg-seeds">';
	foreach ( tj_mag_seeds() as $s ) {
		$h .= '<button type="button" class="tjg-seed" data-tjg-seed="' . esc_attr( $s ) . '">' . esc_html( $s ) . '</button>';
	}
	$h .= '</div></div>';

	/* چقدر وقت دارید؟ */
	$h .= '<div class="tj3-time" data-tj3-time>';
	$h .= '<span class="tj3-time-q">چقدر وقت دارید؟</span>';
	$h .= '<button type="button" data-tj3-t="1-6">یک چای، <b>زیر ۶ دقیقه</b></button>';
	$h .= '<button type="button" data-tj3-t="7-14">مسیر خانه، <b>۷ تا ۱۴ دقیقه</b></button>';
	$h .= '<button type="button" data-tj3-t="15-999">یک عصر، <b>۱۵ دقیقه به بالا</b></button>';
	$h .= '<button type="button" class="tj3-rand" data-tj3-t="1-999">یک نوشتهٔ تصادفی</button>';
	$h .= '<div class="tj3-time-out" data-tj3-out hidden></div>';
	$h .= '</div>';
	$h .= '<script type="application/json" id="tj3-idx">' . wp_json_encode( array_map( function ( $r ) { return (int) $r['m']; }, $idx['list'] ) ) . '</script>';

	/* فقط دقیقه‌ها؛ عنوان و نشانی از آرشیو پایین صفحه خوانده می‌شود (همان ترتیب تاریخ) تا صفحه سنگین نشود */
	$h .= '</header>';
	return $h;
}

/** ۲. جلد: تیتر یک و تازه‌ها */
function tjm3_cover() {
	$ids = tj_posts( array( 'posts_per_page' => 6 ) );
	if ( empty( $ids ) ) { return ''; }
	$lead = array_shift( $ids );
	$cat  = tj_primary_cat( $lead );
	$img  = tj_thumb( $lead, 'large' );

	$h  = '<section class="tj3-cover" aria-labelledby="tj3-cover-h">';
	$h .= '<article class="tj3-lead">';
	$h .= '<a class="tj3-lead-fig" href="' . esc_url( get_permalink( $lead ) ) . '" tabindex="-1" aria-hidden="true">';
	$h .= $img ? '<img src="' . esc_url( $img ) . '" alt="" fetchpriority="high" decoding="async">' : '<span class="tjg-card-ph"></span>';
	$h .= '</a><div class="tj3-lead-b">';
	$h .= '<p class="tj3-tag">تیتر یک' . ( $cat ? ' · <a href="' . esc_url( get_category_link( $cat->term_id ) ) . '">' . esc_html( $cat->name ) . '</a>' : '' ) . '</p>';
	$h .= '<h2 id="tj3-cover-h"><a href="' . esc_url( get_permalink( $lead ) ) . '">' . esc_html( get_the_title( $lead ) ) . '</a></h2>';
	$h .= '<p class="tj3-x">' . esc_html( tj_excerpt( $lead, 210 ) ) . '</p>';
	$h .= '<p class="tjg-card-m"><a class="tj3-au" href="' . esc_url( get_author_posts_url( get_post_field( 'post_author', $lead ) ) ) . '">'
		. esc_html( get_the_author_meta( 'display_name', get_post_field( 'post_author', $lead ) ) ) . '</a>'
		. '<span class="tjg-dot"></span><span>' . esc_html( tj_date( $lead ) ) . '</span>'
		. '<span class="tjg-dot"></span><span>' . esc_html( tj_fa( tj_read_min( $lead ) ) ) . ' دقیقه</span></p>';
	$h .= '</div></article>';

	$h .= '<div class="tj3-latest"><h2 class="tj3-mini-h">تازه‌ها</h2><ol>';
	foreach ( $ids as $i => $id ) {
		$c = tj_primary_cat( $id );
		$t = tj_thumb( $id, 'thumbnail' );
		$h .= '<li><span class="tj3-num">' . esc_html( tj_fa( $i + 1 ) ) . '</span>';
		$h .= '<a class="tj3-th" href="' . esc_url( get_permalink( $id ) ) . '" tabindex="-1" aria-hidden="true">' . ( $t ? '<img src="' . esc_url( $t ) . '" alt="" loading="lazy" decoding="async" width="64" height="64">' : '<span class="tjg-card-ph"></span>' ) . '</a>';
		$h .= '<span class="tj3-li-b">' . ( $c ? '<span class="tjg-kicker">' . esc_html( $c->name ) . '</span>' : '' );
		$h .= '<a class="tj3-li-t" href="' . esc_url( get_permalink( $id ) ) . '">' . esc_html( get_the_title( $id ) ) . '</a>';
		$h .= '<span class="tj3-li-m">' . esc_html( tj_date( $id, 'short' ) . ' · ' . tj_fa( tj_read_min( $id ) ) . ' دقیقه' ) . '</span></span></li>';
	}
	$h .= '</ol><a class="tjg-more" href="#tjg-archive">همهٔ نوشته‌ها، سال به سال</a></div>';
	$h .= '</section>';
	return $h;
}

/** ۳. تقویم تجربه: دو هفتهٔ پیش رو */
function tjm3_calendar() {
	$tz    = wp_timezone();
	$today = new DateTime( 'now', $tz );
	$start = ( clone $today )->modify( '-1 day' )->setTime( 0, 0 );
	$days  = 22;
	$from  = $start->format( 'Y-m-d' );
	$to    = ( clone $start )->modify( '+' . ( $days - 1 ) . ' days' )->format( 'Y-m-d' );

	$D  = tjm3_events();
	$IX = tjm3_index();
	$L  = isset( $IX['list'] ) ? $IX['list'] : array();
	$ev = isset( $D['events'] ) ? $D['events'] : array();
	$P  = isset( $D['P'] ) ? $D['P'] : array();

	$byDay = array(); $classes = array(); $prep = array(); $seen = array();
	$prepTo = ( clone $today )->modify( '+60 days' )->format( 'Y-m-d' );
	$todayS = $today->format( 'Y-m-d' );
	usort( $ev, function ( $a, $b ) { return strcmp( $a['d'] . ( isset( $a['t'] ) ? $a['t'] : '' ), $b['d'] . ( isset( $b['t'] ) ? $b['t'] : '' ) ); } );
	foreach ( $ev as $e ) {
		if ( empty( $e['d'] ) ) { continue; }
		if ( ! empty( $e['x'] ) ) { continue; }
		$g = isset( $e['g'] ) ? $e['g'] : 'pub';
		if ( $e['d'] >= $from ) {
			if ( $e['d'] <= $to ) {
				if ( 'class' === $g ) { $classes[ $e['d'] ][] = $e; } else { $byDay[ $e['d'] ][] = $e; }
			}
		}
		if ( $e['d'] >= $todayS ) {
			if ( $e['d'] <= $prepTo ) {
				if ( 'class' !== $g ) {
					$k = isset( $e['sh'] ) ? $e['sh'] : $e['ttl'];
					if ( ! isset( $seen[ $k ] ) ) {
						if ( count( $prep ) < 3 ) { $seen[ $k ] = 1; $prep[] = $e; }
					}
				}
			}
		}
	}

	/* مناسبت‌ها بر پایهٔ ماه-روز میلادی */
	$occ = array();
	foreach ( tj_mag_calendar() as $o ) { $occ[ $o['md'] ][] = $o; }

	$gl = array( 'pub' => 'رویداد باز', 'jc' => 'ژورنال کلاب', 'case' => 'کیس‌خوانی', 'sup' => 'سوپرویژن', 'reg' => 'ثبت‌نام' );

	$h  = '<section class="tj3-cal" id="tjg-cal" aria-labelledby="tj3-cal-h">';
	$h .= '<header class="tjg-sec-h"><div><p class="tjg-eyebrow">تقویم تجربه</p>';
	$h .= '<h2 class="tjg-sec-t" id="tj3-cal-h">دو هفتهٔ پیش رو</h2>';
	$h .= '<p class="tjg-sec-n">برنامه‌های مدرسهٔ تجربه و مناسبت‌های روانکاوی، روز به روز. کنار هر برنامه یک نوشته از مجله هست که پیش از جلسه بخوانید.</p></div>';
	$h .= '<a class="tjg-more" href="' . esc_url( home_url( '/school/events/' ) ) . '">تقویم کامل مدرسه</a></header>';

	$h .= '<p class="tj3-legend"><span class="k-ev">برنامهٔ باز یا ثبت‌نامی</span><span class="k-cl">کلاس حلقه‌ها</span><span class="k-oc">مناسبت و نوشتهٔ همان روز</span></p>';

	$h .= '<div class="tj3-strip-w"><ol class="tj3-strip" data-tj3-strip>';
	$cur = clone $start;
	for ( $i = 0; $i < $days; $i++ ) {
		$ds = $cur->format( 'Y-m-d' );
		$md = $cur->format( 'm-d' );
		list( $jy, $jm, $jd ) = tj_g2j( (int) $cur->format( 'Y' ), (int) $cur->format( 'n' ), (int) $cur->format( 'j' ) );
		$w  = (int) $cur->format( 'w' );
		$cls = 'tj3-day' . ( 5 === $w ? ' is-fri' : '' ) . ( $ds === $todayS ? ' is-today' : '' );
		$has = isset( $byDay[ $ds ] ) || isset( $classes[ $ds ] ) || isset( $occ[ $md ] );
		if ( ! $has ) { $cls .= ' is-empty'; }
		$h .= '<li class="' . esc_attr( $cls ) . '" data-d="' . esc_attr( $ds ) . '">';
		$h .= '<div class="tj3-dh"><span class="tj3-wd">' . esc_html( tjm3_wday( $w ) ) . '</span><b>' . esc_html( tj_fa( $jd ) ) . '</b><span class="tj3-mn">' . esc_html( tj_jmonth( $jm ) ) . '</span></div>';
		$h .= '<div class="tj3-items">';
		if ( isset( $occ[ $md ] ) ) {
			foreach ( $occ[ $md ] as $o ) {
				$p = isset( $o['p'] ) ? (int) $o['p'] : 0;
				if ( tjm3_ok( $p ) ) {
					$h .= '<a class="tj3-oc" href="' . esc_url( get_permalink( $p ) ) . '" title="' . esc_attr( get_the_title( $p ) ) . '"><span>' . esc_html( $o['t'] ) . '</span><em>بخوانید: ' . esc_html( wp_trim_words( get_the_title( $p ), 6, '…' ) ) . '</em></a>';
				} else {
					$h .= '<span class="tj3-oc"><span>' . esc_html( $o['t'] ) . '</span></span>';
				}
			}
		}
		if ( isset( $byDay[ $ds ] ) ) {
			foreach ( $byDay[ $ds ] as $e ) {
				$g = isset( $e['g'] ) ? $e['g'] : 'pub';
				$lab = isset( $gl[ $g ] ) ? $gl[ $g ] : 'برنامه';
				$h .= '<a class="tj3-ev g-' . esc_attr( $g ) . '" href="' . esc_url( tjm3_ev_link( $e ) ) . '">';
				$h .= '<i>' . esc_html( $lab . ( ! empty( $e['t'] ) ? ' · ' . tj_fa( $e['t'] ) : '' ) ) . '</i>';
				$h .= '<span>' . esc_html( $e['ttl'] ) . '</span></a>';
			}
		}
		if ( isset( $classes[ $ds ] ) ) {
			$nC = count( $classes[ $ds ] );
			$h .= '<a class="tj3-clx" href="' . esc_url( home_url( '/school/events/' ) ) . '" title="' . esc_attr( implode( ' · ', array_map( function ( $x ) { return $x['ttl']; }, $classes[ $ds ] ) ) ) . '">'
				. esc_html( tj_fa( $nC ) . ( $nC > 1 ? ' کلاس' : ' کلاس' ) . ' در حلقه‌های مدرسه' ) . '</a>';
		}
		if ( ! $has ) {
			if ( ! empty( $L ) ) {
				$pk = $L[ abs( crc32( $ds ) ) % count( $L ) ];
				$h .= '<a class="tj3-rd" href="' . esc_url( $pk['u'] ) . '" title="' . esc_attr( $pk['t'] ) . '"><em>نوشتهٔ این روز</em>' . esc_html( wp_trim_words( $pk['t'], 7, '…' ) ) . '<i>' . esc_html( tj_fa( $pk['m'] ) ) . ' دقیقه</i></a>';
			} else { $h .= '<span class="tj3-none">روز خواندن</span>'; }
		}
		$h .= '</div></li>';
		$cur->modify( '+1 day' );
	}
	$h .= '</ol></div>';

	/* پیش از جلسه بخوانید */
	if ( ! empty( $prep ) ) {
		$h .= '<div class="tj3-prep"><h3 class="tj3-prep-h">پیش از جلسه بخوانید</h3><div class="tj3-prep-g">';
		foreach ( $prep as $e ) {
			$ts = strtotime( $e['d'] . ' 12:00:00' );
			list( $jy, $jm, $jd ) = tj_g2j( (int) gmdate( 'Y', $ts ), (int) gmdate( 'n', $ts ), (int) gmdate( 'j', $ts ) );
			$who = array();
			if ( ! empty( $e['p'] ) ) { foreach ( $e['p'] as $pk ) { if ( isset( $P[ $pk ] ) ) { $who[] = $P[ $pk ][0]; } } }
			$r = tjm3_read_for( $e );
			$h .= '<article class="tj3-pc">';
			$h .= '<p class="tj3-pc-d"><b>' . esc_html( tj_fa( $jd ) ) . '</b><span>' . esc_html( tj_jmonth( $jm ) ) . '</span></p>';
			$h .= '<div class="tj3-pc-b"><p class="tj3-pc-k">' . esc_html( tjm3_access( isset( $e['a'] ) ? $e['a'] : '' ) . ( ! empty( $e['pl'] ) ? ' · ' . $e['pl'] : '' ) ) . '</p>';
			$h .= '<h4><a href="' . esc_url( tjm3_ev_link( $e ) ) . '">' . esc_html( $e['ttl'] ) . '</a></h4>';
			if ( $who ) { $h .= '<p class="tj3-pc-w">' . esc_html( implode( '، ', $who ) ) . '</p>'; }
			if ( $r ) {
				$h .= '<a class="tj3-pc-r" href="' . esc_url( get_permalink( $r ) ) . '"><span>پیش‌خوانی</span>' . esc_html( get_the_title( $r ) ) . '</a>';
			}
			$h .= '</div></article>';
		}
		$h .= '</div></div>';
	}

	$h .= '<div class="tj3-cal-a">';
	$h .= '<a class="tjg-btn" href="' . esc_url( tjm3_bot( 'mag_cal' ) ) . '" rel="noopener">یادآوری برنامه‌ها در تلگرام</a>';
	$h .= '<a class="tjg-btn tjg-btn-o" href="' . esc_url( home_url( '/wp-json/tj/v1/calendar.ics?c=pub' ) ) . '">افزودن برنامه‌های باز به تقویم گوشی</a>';
	$h .= '<a class="tjg-btn tjg-btn-o" href="' . esc_url( home_url( '/school/community/' ) ) . '">عضویت رایگان در کامیونیتی</a>';
	$h .= '</div>';
	$h .= '</section>';
	return $h;
}

/** ۴. پروندهٔ ماه */
function tjm3_issue() {
	$now = current_time( 'timestamp' );
	list( $jy, $jm, $jd ) = tj_g2j( (int) gmdate( 'Y', $now ), (int) gmdate( 'n', $now ), (int) gmdate( 'j', $now ) );
	$all = tjm3_issues();
	if ( ! isset( $all[ $jm ] ) ) { return ''; }
	$is = $all[ $jm ];
	$ids = array();
	foreach ( $is['ids'] as $id ) { if ( tjm3_ok( $id ) ) { $ids[] = $id; } }
	if ( count( $ids ) < 2 ) { return ''; }

	$h  = '<section class="tj3-issue-s" aria-labelledby="tj3-issue-h"><div class="tj3-issue-w">';
	$h .= '<div class="tj3-issue-l"><p class="tjg-eyebrow">پروندهٔ شمارهٔ ' . esc_html( tj_jmonth( $jm ) ) . '</p>';
	$h .= '<h2 id="tj3-issue-h">' . esc_html( $is['t'] ) . '</h2>';
	$h .= '<p>' . esc_html( $is['d'] ) . '</p>';
	$h .= '<span class="tj3-issue-n" aria-hidden="true">' . esc_html( tj_fa( $jm ) ) . '</span></div>';
	$h .= '<ol class="tj3-issue-r">';
	foreach ( $ids as $i => $id ) {
		$t = tj_thumb( $id, 'thumbnail' );
		$h .= '<li><a href="' . esc_url( get_permalink( $id ) ) . '">';
		$h .= '<span class="tj3-th">' . ( $t ? '<img src="' . esc_url( $t ) . '" alt="" loading="lazy" decoding="async" width="64" height="64">' : '<span class="tjg-card-ph"></span>' ) . '</span>';
		$h .= '<span class="tj3-ir-b"><b>' . esc_html( get_the_title( $id ) ) . '</b><em>' . esc_html( tj_fa( tj_read_min( $id ) ) ) . ' دقیقه خواندن</em></span></a></li>';
	}
	$h .= '</ol></div></section>';
	return $h;
}

/** ۵. با چه چیزی درگیرید؟ */
function tjm3_needs_sec() {
	$h  = '<section class="tj3-needs" aria-labelledby="tj3-needs-h">';
	$h .= '<header class="tjg-sec-h"><div><p class="tjg-eyebrow">از کجا شروع کنم؟</p>';
	$h .= '<h2 class="tjg-sec-t" id="tj3-needs-h">با چه چیزی درگیرید؟</h2>';
	$h .= '<p class="tjg-sec-n">هر کارت یک راهنمای کوتاه دارد و دو نوشتهٔ عمیق‌تر از مجله. این‌ها برای فهمیدن است، نه تشخیص.</p></div>';
	$h .= '<a class="tjg-more" href="' . esc_url( home_url( '/help/' ) ) . '">همهٔ راهنماها</a></header>';
	$h .= '<div class="tj3-needs-g">';
	$i = 0;
	foreach ( tjm3_needs() as $n ) {
		$i++;
		$help = tjm3_ok( $n['h'] ) ? get_permalink( $n['h'] ) : home_url( '/help/' );
		$h .= '<article class="tj3-need"><span class="tj3-need-i" aria-hidden="true">' . esc_html( tj_fa( $i ) ) . '</span>';
		$h .= '<h3><a href="' . esc_url( $help ) . '">' . esc_html( $n['t'] ) . '</a></h3>';
		$h .= '<p>' . esc_html( $n['d'] ) . '</p><ul>';
		foreach ( $n['ids'] as $id ) {
			if ( ! tjm3_ok( $id ) ) { continue; }
			$h .= '<li><a href="' . esc_url( get_permalink( $id ) ) . '">' . esc_html( get_the_title( $id ) ) . '</a></li>';
		}
		$h .= '</ul></article>';
	}
	$h .= '</div>';
	$h .= '<p class="tj3-needs-f">نمی‌دانید دقیقاً چه چیزی؟ <a href="' . esc_url( home_url( '/tests/need-profile/' ) ) . '">نیمرخ نیاز من</a> را امتحان کنید؛ رایگان است.</p>';
	$h .= '</section>';
	return $h;
}

/** ۶. جمله‌ای از آرشیو (قلاب) */
function tjm3_hook() {
	$hooks = array();
	foreach ( tj_mag_hooks() as $k ) {
		$p = (int) $k['p'];
		if ( ! tjm3_ok( $p ) ) { continue; }
		$hooks[] = array( 'q' => $k['q'], 't' => get_the_title( $p ), 'u' => get_permalink( $p ), 'm' => tj_read_min( $p ) );
	}
	if ( empty( $hooks ) ) { return ''; }
	$first = $hooks[ array_rand( $hooks ) ];
	$h  = '<section class="tj3-hook-s" aria-label="جمله‌ای از آرشیو">';
	$h .= '<div class="tjg-hook" data-tjg-hook><p class="tj3-hook-k">جمله‌ای از آرشیو</p>';
	$h .= '<p class="tjg-hook-q" data-tjg-hook-q>' . esc_html( '«' . $first['q'] . '»' ) . '</p>';
	$h .= '<div class="tjg-hook-foot"><p class="tjg-hook-src" data-tjg-hook-src>از نوشته‌ی <a href="' . esc_url( $first['u'] ) . '">' . esc_html( $first['t'] ) . '</a> · ' . esc_html( tj_fa( $first['m'] ) ) . ' دقیقه خواندن</p>';
	$h .= '<button type="button" class="tjg-shuffle" data-tjg-shuffle>یکی دیگر</button></div></div>';
	$h .= '<script type="application/json" id="tjg-hook-data">' . wp_json_encode( $hooks ) . '</script>';
	$h .= '</section>';
	return $h;
}

/** ۷. اطلس مفاهیم */
function tjm3_atlas_sec() {
	$url = tjm3_ok( 502969 ) ? get_permalink( 502969 ) : home_url( '/mag/' );
	$h  = '<section class="tj3-atlas" aria-labelledby="tj3-atlas-h">';
	$h .= '<header class="tjg-sec-h"><div><p class="tjg-eyebrow">برای فهمیدن زبان روانکاوی</p>';
	$h .= '<h2 class="tjg-sec-t" id="tj3-atlas-h">اطلس مفاهیم</h2>';
	$h .= '<p class="tjg-sec-n">سی‌وپنج مفهوم در چهار منظومه. هر ستاره یک نوشتهٔ کامل است؛ از مرکز هر منظومه شروع کنید و به بیرون بروید.</p></div>';
	$h .= '<a class="tjg-more" href="' . esc_url( $url ) . '">واژه‌نامهٔ کامل</a></header>';
	$h .= '<div class="tj3-atlas-g">';
	foreach ( tjm3_atlas() as $ci => $cl ) {
		$nodes = array();
		foreach ( $cl['n'] as $id => $lab ) { if ( tjm3_ok( $id ) ) { $nodes[ $id ] = $lab; } }
		$n = count( $nodes );
		if ( ! $n ) { continue; }
		$inner = (int) floor( $n / 2 );
		$outer = $n - $inner;
		$h .= '<div class="tj3-cl c' . (int) $ci . '"><svg class="tj3-orb" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
			. '<ellipse cx="50" cy="50" rx="22" ry="21"></ellipse><ellipse cx="50" cy="50" rx="35" ry="37"></ellipse></svg>';
		$h .= '<h3 class="tj3-cl-c">' . esc_html( $cl['t'] ) . '</h3><ul>';
		$k = 0;
		foreach ( $nodes as $id => $lab ) {
			if ( $k < $inner ) { $ring = 0; $cnt = $inner; $j = $k; $rx = 22; $ry = 21; $off = -90; }
			else { $ring = 1; $cnt = $outer; $j = $k - $inner; $rx = 35; $ry = 37; $off = -90 + ( 180 / max( 1, $cnt ) ); }
			$a = deg2rad( $off + ( 360 / max( 1, $cnt ) ) * $j );
			$x = round( 50 + $rx * cos( $a ), 2 );
			$y = round( 50 + $ry * sin( $a ), 2 );
			$h .= '<li style="--x:' . $x . '%;--y:' . $y . '%"><a class="r' . $ring . '" href="' . esc_url( get_permalink( $id ) ) . '" title="' . esc_attr( get_the_title( $id ) ) . '">' . esc_html( $lab ) . '</a></li>';
			$k++;
		}
		$h .= '</ul></div>';
	}
	$h .= '</div></section>';
	return $h;
}

/** ۱۱. میز دانشجو (نسخهٔ ۳) */
function tjm3_student() {
	$c = tj_mag_cats();
	$tiles = array(
		array( 'n' => 'اگر تازه شروع کرده‌اید', 't' => 'واژه‌نامهٔ مفاهیم', 'd' => 'اصطلاح‌هایی که سر کلاس رد می‌شوند، با زبان ساده و ارجاع.', 'u' => tjm3_ok( 502969 ) ? get_permalink( 502969 ) : get_category_link( $c['psy'] ) ),
		array( 'n' => 'اگر می‌خواهید درمانگر شوید', 't' => 'از دانشگاه تا اتاق درمان', 'd' => 'درمان فردی، سوپرویژن، کارورزی و انتخاب رویکرد؛ مسیر قدم به قدم.', 'u' => home_url( '/how-to-become-a-therapist/' ) ),
		array( 'n' => 'برای سنجیدن خودتان', 't' => 'تست آمادگی کار بالینی', 'd' => 'چند دقیقه، رایگان. نشان می‌دهد در کدام قدم مسیر هستید.', 'u' => home_url( '/tests/clinical-readiness/' ) ),
		array( 'n' => 'برای خواندن جمعی', 't' => 'ژورنال کلاب و کیس‌خوانی', 'd' => 'یک مقاله، یک ارائه، گفت‌وگوی جمعی. برنامه‌ها در تقویم بالای همین صفحه‌اند.', 'u' => home_url( '/school/events/journal-club/' ) ),
	);
	$h  = '<section aria-labelledby="tj3-desk-h"><div class="tjg-desk-wrap">';
	$h .= '<div class="tjg-desk-h"><p class="tjg-eyebrow">میز دانشجو</p>';
	$h .= '<h2 id="tj3-desk-h">دانشجوی روان‌شناسی یا پزشکی هستید؟</h2>';
	$h .= '<span>بخش زیادی از همین مجله را دانشجوهای مدرسهٔ تجربه نوشته‌اند. این چهار در برای شماست.</span></div>';
	$h .= '<div class="tjg-desk">';
	foreach ( $tiles as $t ) {
		$h .= '<a class="tjg-tile" href="' . esc_url( $t['u'] ) . '"><span class="tjg-tile-n">' . esc_html( $t['n'] ) . '</span><h3>' . esc_html( $t['t'] ) . '</h3><p>' . esc_html( $t['d'] ) . '</p></a>';
	}
	$h .= '</div>';
	$h .= '<div class="tjg-desk-cta"><p>عضویت در کامیونیتی تجربه رایگان است؛ از برنامه‌های باز، ژورنال کلاب‌ها و دوره‌های تازه باخبر می‌شوید.</p>';
	$h .= '<a class="tjg-btn" href="' . esc_url( home_url( '/school/community/' ) ) . '">عضویت در کامیونیتی</a>';
	$h .= '<a class="tjg-btn tjg-btn-o" href="' . esc_url( home_url( '/editorial/' ) ) . '">برای مجله بنویسید</a></div>';
	$h .= '</div></section>';
	return $h;
}

/** ۱۶. پایان صفحه */
function tjm3_foot() {
	$h  = '<section class="tjg-foot tj3-foot">';
	$h .= '<h2>مجله جای فکر کردن است؛ اتاق درمان جای کار کردن</h2>';
	$h .= '<p>هر هفته یک نوشتهٔ تازه و برنامه‌های مدرسه را در تلگرام بگیرید، یا اگر آماده‌اید، با یک جلسهٔ معارفه شروع کنید.</p>';
	$h .= '<div class="tjg-foot-a">';
	$h .= '<a class="tjg-btn" href="' . esc_url( tjm3_bot( 'mag_home' ) ) . '" rel="noopener">مجله در تلگرام</a>';
	$h .= '<a class="tjg-btn tjg-btn-o" href="' . esc_url( home_url( '/get-therapy/' ) ) . '">شروع تراپی</a>';
	$h .= '<a class="tjg-btn tjg-btn-o" href="' . esc_url( home_url( '/tests/therapy-style/' ) ) . '">تست سبک درمانی من</a>';
	$h .= '</div></section>';
	$h .= '<p class="tjg-fine"><a href="' . esc_url( home_url( '/editorial/' ) ) . '">اصول تحریریه</a> · <a href="' . esc_url( home_url( '/feed/' ) ) . '">خوراک RSS مجله</a></p>';
	return $h;
}

/** دادهٔ ساختاریافته */
function tjm3_schema() {
	$ids = tj_posts( array( 'posts_per_page' => 12 ) );
	$items = array();
	foreach ( $ids as $i => $id ) {
		$items[] = array( '@type' => 'ListItem', 'position' => $i + 1, 'url' => get_permalink( $id ), 'name' => get_the_title( $id ) );
	}
	$terms = array();
	foreach ( tjm3_atlas() as $cl ) {
		foreach ( $cl['n'] as $id => $lab ) {
			if ( ! tjm3_ok( $id ) ) { continue; }
			$terms[] = array( '@type' => 'DefinedTerm', 'name' => $lab, 'url' => get_permalink( $id ), 'inDefinedTermSet' => home_url( '/mag/#atlas' ) );
		}
	}
	$blog = array(
		'@context' => 'https://schema.org', '@type' => 'Blog', '@id' => home_url( '/mag/#blog' ),
		'name' => 'مجلهٔ تجربه', 'url' => home_url( '/mag/' ), 'inLanguage' => 'fa-IR',
		'description' => 'نوشته‌های فارسی و تألیفی دربارهٔ روانکاوی، روان‌درمانی، تحلیل روانکاوانهٔ فیلم و کتاب و چهره‌های روانکاوی، به قلم درمانگرها و دانشجوهای مرکز تجربه زندگی.',
		'about' => array( array( '@type' => 'Thing', 'name' => 'روانکاوی' ), array( '@type' => 'Thing', 'name' => 'روان‌درمانی' ) ),
		'publisher' => array( '@type' => 'Organization', 'name' => 'مرکز تجربه زندگی', 'url' => home_url( '/' ) ),
		'mainEntity' => array( '@type' => 'ItemList', 'itemListOrder' => 'https://schema.org/ItemListOrderDescending', 'itemListElement' => $items ),
	);
	$set = array(
		'@context' => 'https://schema.org', '@type' => 'DefinedTermSet', '@id' => home_url( '/mag/#atlas' ),
		'name' => 'اطلس مفاهیم روانکاوی مجلهٔ تجربه', 'inLanguage' => 'fa-IR', 'hasDefinedTerm' => $terms,
	);
	$f = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
	return '<script type="application/ld+json">' . wp_json_encode( $blog, $f ) . '</script><script type="application/ld+json">' . wp_json_encode( $set, $f ) . '</script>';
}

/* ---------- خروجی v3 ---------- */

function tj_mag_home_v3() {
	$h  = '<div class="tjg tjg3" dir="rtl" lang="fa">';
	$h .= tj_mag_css();
	$h .= tjm3_css();
	$h .= tjm3_masthead();
	$h .= tjm3_cover();
	$h .= tjm3_calendar();
	$h .= tjm3_issue();
	$h .= tjm3_needs_sec();
	$h .= tjm3_hook();
	$h .= tjm3_atlas_sec();
	$h .= tj_sec_cinema();
	$h .= tj_sec_century();
	$h .= tj_sec_paths();
	$h .= tj_sec_shelf();
	$h .= tjm3_student();
	$h .= tj_sec_room();
	$h .= tj_sec_authors();
	$h .= tj_sec_archive();
	$h .= tjm3_foot();
	$h .= tjm3_schema();
	$h .= tj_mag_js();
	$h .= tjm3_js();
	$h .= '</div>';
	return $h;
}

/* ---------- استایل v3 ---------- */
function tjm3_css() {
	return <<<'CSS'
<style id="tjg3-css">
.tjg.tjg3{max-width:1180px}
.tjg3 h4{margin:0}
.tjg3 section{margin-block-start:84px}
.tjg3 .tjg-sec-t{font-weight:800}
.tjg3 .tjg-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:15px;line-height:1.6;padding:11px 20px;border-radius:999px;background:var(--red);color:#fff!important;border:1px solid var(--red);transition:.18s;white-space:nowrap}
.tjg3 .tjg-btn:hover{background:var(--red6);border-color:var(--red6)}
.tjg3 .tjg-btn.tjg-btn-o{background:#fff;color:var(--ink2)!important;border-color:var(--line)}
.tjg3 .tjg-btn.tjg-btn-o:hover{border-color:var(--red1);color:var(--red)!important;background:var(--red0)}

/* سربرگ */
.tjg3 .tj3-mast{padding-block:44px 8px;text-align:center;position:relative}
.tjg3 .tj3-mast-top{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 18px;font-size:13.5px;color:var(--mut)}
.tjg3 .tj3-mast-top span{position:relative}
.tjg3 .tj3-mast-top span+span::before{content:"";position:absolute;inset-inline-start:-11px;top:50%;width:4px;height:4px;border-radius:50%;background:var(--red1);transform:translateY(-50%)}
.tjg3 .tj3-issue{color:var(--red)!important;font-weight:700}
.tjg3 .tj3-h1{font-size:clamp(46px,9vw,104px);line-height:1.12;font-weight:900;color:var(--ink);margin-block:14px 6px!important;letter-spacing:-1px}
.tjg3 .tj3-sub{font-size:clamp(16px,2.2vw,20px);color:var(--ink2)}
.tjg3 .tj3-lede{font-size:16px;line-height:2;color:var(--soft);max-width:44rem;margin:18px auto 0!important}
.tjg3 .tj3-find{margin-block-start:28px!important}
.tjg3 .tj3-time{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-block-start:22px;position:relative}
.tjg3 .tj3-time-q{font-size:14px;color:var(--ink2);margin-inline-end:4px}
.tjg3 .tj3-time button{font-family:inherit;font-size:13.5px;line-height:1.6;color:var(--soft);background:#fff;border:1px dashed var(--line);border-radius:12px;padding:7px 13px;cursor:pointer;transition:.18s}
.tjg3 .tj3-time button b{color:var(--ink2);font-weight:700}
.tjg3 .tj3-time button:hover,.tjg3 .tj3-time button.is-on{border-color:var(--red);border-style:solid;color:var(--red);background:var(--red0)}
.tjg3 .tj3-time .tj3-rand{border-style:solid;color:var(--red);border-color:var(--red1)}
.tjg3 .tj3-time-out{flex:1 1 100%;max-width:40rem;margin:10px auto 0;display:flex;align-items:center;gap:14px;justify-content:space-between;text-align:start;border:1px solid var(--line);border-radius:16px;padding:14px 18px;background:#fff;box-shadow:0 12px 30px -22px rgba(34,34,34,.45)}
.tjg3 .tj3-time-out[hidden]{display:none}
.tjg3 .tj3-time-out a{color:var(--ink);font-size:16.5px;line-height:1.7}
.tjg3 .tj3-time-out a:hover{color:var(--red)}
.tjg3 .tj3-time-out small{display:block;font-size:12.5px;color:var(--mut)}
.tjg3 .tj3-time-out button{flex:0 0 auto}

/* جلد */
.tjg3 .tj3-cover{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:40px;margin-block-start:56px!important;padding-block-start:34px;border-block-start:2px solid var(--ink)}
.tjg3 .tj3-lead-fig{display:block;aspect-ratio:16/9;max-height:340px;width:100%;overflow:hidden;border-radius:18px;background:var(--sunk);border:1px solid var(--line)}
.tjg3 .tj3-lead-fig img{width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
.tjg3 .tj3-lead:hover .tj3-lead-fig img{transform:scale(1.03)}
.tjg3 .tj3-lead-b{padding-block-start:18px}
.tjg3 .tj3-tag{font-size:13px;color:var(--red)}
.tjg3 .tj3-tag a{color:var(--red)}
.tjg3 .tj3-lead h2{font-size:clamp(23px,3.2vw,34px);line-height:1.45;color:var(--ink);font-weight:800;margin-block:8px 10px}
.tjg3 .tj3-lead h2 a:hover{color:var(--red)}
.tjg3 .tj3-x{font-size:16px;line-height:1.95;color:var(--soft)}
.tjg3 .tj3-lead .tjg-card-m{margin-block-start:12px;font-size:13px}
.tjg3 .tj3-au{color:var(--ink2)}
.tjg3 .tj3-au:hover{color:var(--red)}
.tjg3 .tj3-mini-h{font-size:14px;color:var(--mut);font-weight:700;letter-spacing:.5px;margin-block-end:8px!important;padding-block-end:10px;border-block-end:1px solid var(--line)}
.tjg3 .tj3-latest ol{counter-reset:none}
.tjg3 .tj3-latest li{display:grid;grid-template-columns:22px 64px minmax(0,1fr);gap:12px;align-items:center;padding-block:12px;border-block-end:1px solid var(--line)}
.tjg3 .tj3-num{font-size:22px;font-weight:900;color:var(--red1);line-height:1}
.tjg3 .tj3-th{display:block;width:64px;height:64px;border-radius:12px;overflow:hidden;background:var(--sunk);border:1px solid var(--line)}
.tjg3 .tj3-th img{width:100%;height:100%;object-fit:cover}
.tjg3 .tj3-li-b{display:flex;flex-direction:column;gap:2px;min-width:0}
.tjg3 .tj3-li-t{font-size:15.5px;line-height:1.65;color:var(--ink2)}
.tjg3 .tj3-li-t:hover{color:var(--red)}
.tjg3 .tj3-li-m{font-size:12px;color:var(--mut)}
.tjg3 .tj3-latest .tjg-more{display:inline-block;margin-block-start:14px}

/* تقویم */
.tjg3 .tj3-legend{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:12.5px;color:var(--mut);margin-block-end:12px}
.tjg3 .tj3-legend span{display:inline-flex;align-items:center;gap:7px}
.tjg3 .tj3-legend span::before{content:"";width:12px;height:12px;border-radius:4px}
.tjg3 .tj3-legend .k-ev::before{background:var(--red)}
.tjg3 .tj3-legend .k-cl::before{background:var(--sunk);border:1px solid var(--line)}
.tjg3 .tj3-legend .k-oc::before{border:1.5px dashed var(--red);background:#fff}
.tjg3 .tj3-strip-w{position:relative}
.tjg3 .tj3-strip{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 16px;scrollbar-width:thin;overscroll-behavior-x:contain}
.tjg3 .tj3-day{flex:0 0 164px;scroll-snap-align:start;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:16px;background:#fff;min-height:210px;overflow:hidden}
.tjg3 .tj3-day[hidden]{display:none}
.tjg3 .tj3-day.is-empty{flex-basis:112px;background:var(--sunk2)}
.tjg3 .tj3-dh{display:flex;align-items:baseline;gap:6px;padding:10px 12px 8px;border-block-end:1px solid var(--line)}
.tjg3 .tj3-dh b{font-size:26px;line-height:1;color:var(--ink);font-weight:900}
.tjg3 .tj3-wd{font-size:12px;color:var(--mut);order:3;margin-inline-start:auto}
.tjg3 .tj3-mn{font-size:12.5px;color:var(--soft)}
.tjg3 .tj3-day.is-fri .tj3-wd{color:var(--red)}
.tjg3 .tj3-day.is-today{border-color:var(--red);box-shadow:0 0 0 3px var(--red0)}
.tjg3 .tj3-day.is-today .tj3-dh{background:var(--red);border-color:var(--red)}
.tjg3 .tj3-day.is-today .tj3-dh b,.tjg3 .tj3-day.is-today .tj3-dh span{color:#fff}
.tjg3 .tj3-day.is-today .tj3-wd::after{content:" · امروز"}
.tjg3 .tj3-items{display:flex;flex-direction:column;gap:7px;padding:10px}
.tjg3 .tj3-ev{display:block;border-radius:10px;padding:7px 9px;background:var(--red0);border-inline-start:3px solid var(--red);font-size:13px;line-height:1.65;color:var(--ink2)}
.tjg3 .tj3-ev i{display:block;font-style:normal;font-size:11px;color:var(--red)}
.tjg3 .tj3-ev.g-reg{background:#fff;border:1px solid var(--red1);border-inline-start:3px solid var(--red)}
.tjg3 .tj3-ev:hover{background:var(--red1)}
.tjg3 .tj3-oc{display:block;border:1.5px dashed var(--red1);border-radius:10px;padding:6px 9px;font-size:12.5px;line-height:1.65;color:var(--ink2)}
.tjg3 .tj3-oc span{display:block;color:var(--red);font-weight:700}
.tjg3 .tj3-oc em{display:block;font-style:normal;color:var(--mut);font-size:12px}
.tjg3 a.tj3-oc:hover{border-color:var(--red);background:var(--red0)}
.tjg3 .tj3-clx{display:block;font-size:12px;color:var(--mut);background:var(--sunk);border-radius:8px;padding:5px 8px;line-height:1.6}
.tjg3 .tj3-clx:hover{color:var(--red)}
.tjg3 .tj3-none{font-size:12px;color:#a3a3a8;margin-block-start:auto}
.tjg3 .tj3-nav{position:absolute;top:84px;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink2);font-size:20px;line-height:1;cursor:pointer;box-shadow:0 8px 20px -12px rgba(0,0,0,.4);z-index:2;display:flex;align-items:center;justify-content:center;font-family:inherit}
.tjg3 .tj3-nav:hover{color:var(--red);border-color:var(--red1)}
.tjg3 .tj3-nav.prev{inset-inline-start:-14px}
.tjg3 .tj3-nav.next{inset-inline-end:-14px}
.tjg3 .tj3-prep{margin-block-start:26px}
.tjg3 .tj3-prep-h{font-size:17px;color:var(--ink);font-weight:800;margin-block-end:12px!important}
.tjg3 .tj3-prep-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.tjg3 .tj3-pc{display:grid;grid-template-columns:62px minmax(0,1fr);gap:14px;border:1px solid var(--line);border-radius:16px;padding:16px;background:#fff}
.tjg3 .tj3-pc-d{display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--red0);border-radius:12px;height:66px}
.tjg3 .tj3-pc-d b{font-size:26px;line-height:1.1;color:var(--red);font-weight:900}
.tjg3 .tj3-pc-d span{font-size:12px;color:var(--red6)}
.tjg3 .tj3-pc-b{display:flex;flex-direction:column;gap:4px;min-width:0}
.tjg3 .tj3-pc-k{font-size:12px;color:var(--mut)}
.tjg3 .tj3-pc h4{font-size:15.5px;line-height:1.65;color:var(--ink);font-weight:700}
.tjg3 .tj3-pc h4 a:hover{color:var(--red)}
.tjg3 .tj3-pc-w{font-size:13px;color:var(--soft)}
.tjg3 .tj3-pc-r{display:block;margin-block-start:6px;padding-block-start:8px;border-block-start:1px dashed var(--line);font-size:13.5px;line-height:1.7;color:var(--ink2)}
.tjg3 .tj3-pc-r span{display:inline-block;font-size:11px;color:#fff;background:var(--ink2);border-radius:999px;padding:1px 8px;margin-inline-end:6px}
.tjg3 .tj3-pc-r:hover{color:var(--red)}
.tjg3 .tj3-cal-a{display:flex;flex-wrap:wrap;gap:10px;margin-block-start:22px}

/* پرونده */
.tjg3 .tj3-issue-w{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:34px;align-items:center;background:var(--sunk);border-radius:24px;padding:38px;position:relative;overflow:hidden}
.tjg3 .tj3-issue-l{position:relative;z-index:1}
.tjg3 .tj3-issue-l h2{font-size:clamp(26px,4vw,40px);line-height:1.35;color:var(--ink);font-weight:900;margin-block:6px 10px}
.tjg3 .tj3-issue-l p:not(.tjg-eyebrow){font-size:15.5px;line-height:1.95;color:var(--soft);max-width:30rem}
.tjg3 .tj3-issue-n{position:absolute;inset-inline-end:-10px;bottom:-70px;font-size:260px;line-height:1;font-weight:900;color:transparent;-webkit-text-stroke:2px var(--red1);opacity:.7;z-index:-1;pointer-events:none}
.tjg3 .tj3-issue-r{display:flex;flex-direction:column;gap:10px;position:relative;z-index:1}
.tjg3 .tj3-issue-r a{display:grid;grid-template-columns:64px minmax(0,1fr);gap:14px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:10px 12px;transition:.18s}
.tjg3 .tj3-issue-r a:hover{border-color:var(--red1);transform:translateX(-4px)}
.tjg3 .tj3-ir-b b{display:block;font-weight:600;font-size:15px;line-height:1.7;color:var(--ink2)}
.tjg3 .tj3-ir-b em{font-style:normal;font-size:12px;color:var(--mut)}

/* نیازها */
.tjg3 .tj3-needs-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.tjg3 .tj3-need{position:relative;border:1px solid var(--line);border-radius:18px;padding:20px 18px 16px;background:#fff;transition:.2s;display:flex;flex-direction:column;gap:6px}
.tjg3 .tj3-need:hover{border-color:var(--red1);box-shadow:0 16px 30px -24px rgba(200,63,73,.6);transform:translateY(-2px)}
.tjg3 .tj3-need-i{position:absolute;inset-inline-end:16px;top:14px;font-size:30px;font-weight:900;color:var(--red0);line-height:1}
.tjg3 .tj3-need h3{font-size:19px;font-weight:800;color:var(--ink)}
.tjg3 .tj3-need h3 a::after{content:" ←";color:var(--red);font-size:15px}
.tjg3 .tj3-need h3 a:hover{color:var(--red)}
.tjg3 .tj3-need>p{font-size:13.5px;line-height:1.85;color:var(--mut)}
.tjg3 .tj3-need ul{margin-block-start:6px!important;display:flex;flex-direction:column;gap:4px;border-block-start:1px dashed var(--line);padding-block-start:8px}
.tjg3 .tj3-need li a{font-size:13.5px;line-height:1.7;color:var(--ink2);display:block}
.tjg3 .tj3-need li a::before{content:"";display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--red);margin-inline-end:7px;vertical-align:middle}
.tjg3 .tj3-need li a:hover{color:var(--red)}
.tjg3 .tj3-needs-f{margin-block-start:16px;font-size:14.5px;color:var(--soft)}
.tjg3 .tj3-needs-f a{color:var(--red);text-decoration:underline;text-underline-offset:4px}

/* قلاب */
.tjg3 .tj3-hook-s .tjg-hook{margin:0;text-align:center;padding:44px 30px 22px;background:#fff}
.tjg3 .tj3-hook-s .tjg-hook::before{inset-inline:0;inset-block-start:0;inset-block-end:auto;width:auto;height:4px}
.tjg3 .tj3-hook-k{font-size:13px;color:var(--red);margin-block-end:8px}
.tjg3 .tj3-hook-s .tjg-hook-q{margin-inline:auto;font-weight:700}
.tjg3 .tj3-hook-s .tjg-hook-foot{justify-content:center}

/* اطلس */
.tjg3 .tj3-atlas-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.tjg3 .tj3-cl{position:relative;aspect-ratio:1.18/1;border:1px solid var(--line);border-radius:26px;background:radial-gradient(circle at 50% 50%,var(--red0) 0,#fff 58%);overflow:hidden}
.tjg3 .tj3-orb{position:absolute;inset:0;width:100%;height:100%}
.tjg3 .tj3-orb ellipse{fill:none;stroke:var(--red1);stroke-width:.35;stroke-dasharray:1.2 1.4;vector-effect:non-scaling-stroke}
.tjg3 .tj3-cl-c{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:118px;height:118px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font-size:15px;line-height:1.5;font-weight:800;padding:10px;box-shadow:0 0 0 8px rgba(200,63,73,.12);z-index:1}
.tjg3 .tj3-cl ul{position:absolute;inset:0}
.tjg3 .tj3-cl li{position:absolute;left:var(--x);top:var(--y);transform:translate(-50%,-50%);z-index:2}
.tjg3 .tj3-cl li a{display:block;white-space:nowrap;font-size:13px;line-height:1.6;color:var(--ink2);background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 11px;transition:.18s;box-shadow:0 6px 14px -12px rgba(0,0,0,.5)}
.tjg3 .tj3-cl li a.r0{font-weight:700;border-color:var(--red1)}
.tjg3 .tj3-cl li a::before{content:"✦";color:var(--red);font-size:10px;margin-inline-end:5px}
.tjg3 .tj3-cl li a:hover{background:var(--red);color:#fff;border-color:var(--red)}
.tjg3 .tj3-cl li a:hover::before{color:#fff}

/* کارت‌های فشرده (تامنیل کوچک) */
.tjg.tjg3 .tjg-grid{gap:14px 26px}
.tjg.tjg3 .tjg-g4{grid-template-columns:repeat(2,minmax(0,1fr))}
.tjg.tjg3 .tjg-g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.tjg.tjg3 .tjg-card{flex-direction:row;align-items:flex-start;gap:14px;padding-block:12px;border-block-end:1px solid var(--line)}
.tjg.tjg3 .tjg-card-fig{flex:0 0 88px;width:88px;height:88px;aspect-ratio:1/1;border-radius:14px}
.tjg.tjg3 .tjg-card-t{font-size:16px}
.tjg.tjg3 .tjg-card-x{font-size:13.5px;line-height:1.8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

.tjg3 .tj3-foot h2{font-size:clamp(22px,3vw,30px)}

@media (max-width:1024px){
.tjg3 .tj3-cover{grid-template-columns:minmax(0,1fr);gap:28px}
.tjg3 .tj3-prep-g{grid-template-columns:minmax(0,1fr)}
.tjg3 .tj3-needs-g{grid-template-columns:repeat(2,minmax(0,1fr))}
.tjg3 .tj3-atlas-g{grid-template-columns:minmax(0,1fr);max-width:620px;margin-inline:auto}
.tjg.tjg3 .tjg-g3{grid-template-columns:repeat(2,minmax(0,1fr))}
.tjg3 .tj3-issue-w{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:760px){
.tjg3 section{margin-block-start:60px}
.tjg3 .tj3-mast{padding-block-start:26px}
.tjg3 .tj3-lede{font-size:15px}
.tjg3 .tj3-time-q{flex:1 1 100%}
.tjg3 .tj3-time button{font-size:13px;padding:6px 11px}
.tjg3 .tj3-lead-fig{max-height:220px}
.tjg3 .tj3-day{flex-basis:150px}
.tjg3 .tj3-nav{display:none}
.tjg3 .tj3-needs-g{grid-template-columns:minmax(0,1fr)}
.tjg3 .tj3-need-i{font-size:24px}
.tjg3 .tj3-issue-w{padding:24px 18px}
.tjg3 .tj3-issue-n{font-size:180px}
.tjg3 .tj3-cl{aspect-ratio:auto;padding:18px 14px;background:#fff}
.tjg3 .tj3-orb{display:none}
.tjg3 .tj3-cl-c{position:static;transform:none;width:auto;height:auto;border-radius:999px;display:inline-flex;padding:6px 16px;margin-block-end:12px;box-shadow:none}
.tjg3 .tj3-cl ul{position:static;display:flex;flex-wrap:wrap;gap:7px}
.tjg3 .tj3-cl li{position:static;transform:none}
.tjg3 .tj3-cl li a{white-space:normal}
.tjg.tjg3 .tjg-g4,.tjg.tjg3 .tjg-g3{grid-template-columns:minmax(0,1fr)}
.tjg.tjg3 .tjg-card-fig{flex-basis:72px;width:72px;height:72px}
.tjg3 .tj3-cal-a .tjg-btn{flex:1 1 100%}
}

/* وزن فونت متغیر انجمن (فونت با وزن ۴۰۰ تعریف شده؛ محور wght مستقیم) */
.tjg3 .tj3-h1{font-variation-settings:"wght" 760,"slnt" 0}
.tjg3 .tjg-sec-t,.tjg3 .tj3-lead h2,.tjg3 .tj3-issue-l h2,.tjg3 .tj3-need h3,.tjg3 .tj3-cl-c,.tjg3 .tj3-prep-h,.tjg3 .tj3-pc h4{font-variation-settings:"wght" 640,"slnt" 0}
.tjg3 .tj3-num,.tjg3 .tj3-dh b,.tjg3 .tj3-pc-d b,.tjg3 .tj3-issue-n,.tjg3 .tj3-need-i{font-variation-settings:"wght" 820,"slnt" 0}
.tjg3 .tj3-issue,.tjg3 .tj3-oc span,.tjg3 .tj3-time button b,.tjg3 .tj3-mini-h,.tjg3 .tj3-cl li a.r0{font-variation-settings:"wght" 600,"slnt" 0}
/* v3.1 اصلاح‌ها */
.tjg3 .tj3-day.is-today .tj3-wd{font-size:0}
.tjg3 .tj3-day.is-today .tj3-wd::after{content:"امروز";font-size:12px;background:#fff;color:var(--red);border-radius:999px;padding:1px 8px}
.tjg3 .tj3-strip-w{margin-block-start:10px}
.tjg3 .tj3-nav{top:-52px}
.tjg3 .tj3-nav.prev{inset-inline-start:auto;inset-inline-end:46px}
.tjg3 .tj3-nav.next{inset-inline-end:0}
.tjg3 .tj3-day.is-empty{flex-basis:150px}
.tjg3 .tj3-rd{display:block;font-size:12.5px;line-height:1.7;color:var(--soft);border-block-start:1px dashed var(--line);padding-block-start:8px;margin-block-start:auto}
.tjg3 .tj3-rd em{display:block;font-style:normal;font-size:11px;color:var(--mut)}
.tjg3 .tj3-rd i{display:block;font-style:normal;font-size:11px;color:var(--red)}
.tjg3 .tj3-rd:hover{color:var(--red)}
.tjg3 .tj3-items{flex:1}
.tjg3 .tj3-issue-w{isolation:isolate}
.tjg3 .tj3-issue-l{position:static}
.tjg3 .tj3-issue-l h2,.tjg3 .tj3-issue-l p,.tjg3 .tj3-issue-l .tjg-eyebrow{position:relative;z-index:1}
.tjg3 .tj3-issue-n{inset-inline-end:auto;inset-inline-start:18px;bottom:-96px;opacity:.55}
</style>
CSS;
}

/* ---------- اسکریپت v3 ---------- */
function tjm3_js() {
	return <<<'JS'
<script id="tjg3-js">
(function(){
"use strict";
var root=document.querySelector(".tjg3");
if(!root){return;}
function fa(n){return String(n).replace(/[0-9]/g,function(d){return "۰۱۲۳۴۵۶۷۸۹"[+d];});}
function ga(n,p){try{if(typeof window.gtag==="function"){window.gtag("event",n,p);}}catch(e){}}

/* تقویم: روزهای گذشته پنهان، امروز علامت، حداکثر ۱۴ روز */
(function(){
	var strip=root.querySelector("[data-tj3-strip]");
	if(!strip){return;}
	var now=new Date();
	var key=now.getFullYear()+"-"+("0"+(now.getMonth()+1)).slice(-2)+"-"+("0"+now.getDate()).slice(-2);
	var days=strip.querySelectorAll(".tj3-day"),shown=0;
	for(var i=0;i<days.length;i++){
		var d=days[i].getAttribute("data-d");
		days[i].classList.remove("is-today");
		if(d<key){days[i].hidden=true;continue;}
		shown++;
		if(shown>14){days[i].hidden=true;continue;}
		days[i].hidden=false;
		if(d===key){days[i].classList.add("is-today");}
	}
	var w=strip.parentNode;
	function mk(cls,txt,dir,lbl){
		var b=document.createElement("button");
		b.type="button";b.className="tj3-nav "+cls;b.textContent=txt;b.setAttribute("aria-label",lbl);
		b.addEventListener("click",function(){strip.scrollBy({left:dir*strip.clientWidth*0.8,behavior:"smooth"});});
		w.appendChild(b);
	}
	mk("prev","›",1,"روزهای قبل");
	mk("next","‹",-1,"روزهای بعد");
})();

/* چقدر وقت دارید؟ */
(function(){
	var box=root.querySelector("[data-tj3-time]");
	var raw=document.getElementById("tj3-idx");
	if(!box){return;}
	if(!raw){return;}
	var mins;
	try{mins=JSON.parse(raw.textContent);}catch(e){return;}
	if(!mins){return;}
	var arr=root.querySelectorAll("[data-tjg-ar-item] a"),list=[];
	for(var q=0;q<arr.length;q++){ if(q<mins.length){ list.push([arr[q].textContent,arr[q].getAttribute("href"),mins[q],""]); } }
	if(!list.length){return;}
	var out=box.querySelector("[data-tj3-out]");
	var btns=box.querySelectorAll("[data-tj3-t]");
	var cur=null,last=-1;
	function pool(r){
		var p=r.split("-"),a=+p[0],b=+p[1],res=[];
		for(var i=0;i<list.length;i++){
			var m=+list[i][2];
			if(m>=a){ if(m<=b){res.push(i);} }
		}
		return res;
	}
	function show(r){
		var ps=pool(r);
		if(!ps.length){return;}
		var k=ps[Math.floor(Math.random()*ps.length)];
		if(ps.length>1){ if(k===last){ k=ps[(ps.indexOf(k)+1)%ps.length]; } }
		last=k;
		var it=list[k];
		out.textContent="";
		var d=document.createElement("div");
		var a=document.createElement("a");a.href=it[1];a.textContent=it[0];
		var s=document.createElement("small");s.textContent=(it[3]?it[3]+" · ":"")+fa(it[2])+" دقیقه خواندن";
		d.appendChild(a);d.appendChild(s);
		var b=document.createElement("button");b.type="button";b.className="tjg-shuffle";b.textContent="یکی دیگر";
		b.addEventListener("click",function(){show(r);});
		out.appendChild(d);out.appendChild(b);
		out.hidden=false;
		ga("mag_time_pick",{range:r});
	}
	for(var i=0;i<btns.length;i++){
		btns[i].addEventListener("click",function(){
			for(var j=0;j<btns.length;j++){btns[j].classList.remove("is-on");}
			this.classList.add("is-on");
			cur=this.getAttribute("data-tj3-t");show(cur);
		});
	}
})();

/* سنجش کلیک بخش‌ها */
root.addEventListener("click",function(e){
	var a=e.target.closest?e.target.closest("a"):null;
	if(!a){return;}
	var s=a.closest("section,header.tj3-mast");
	var lbl="";
	if(s){lbl=s.getAttribute("aria-labelledby")||s.getAttribute("aria-label")||s.className||"";}
	ga("mag_home_click",{section:String(lbl).slice(0,40),link_text:(a.textContent||"").trim().slice(0,60),link_url:a.getAttribute("href")||""});
});
})();
</script>
JS;
}

/* ---------- جای‌گزینی v3 ---------- */
/* برای برگشت به نسخهٔ قبل فقط این را false کنید. */
if ( ! defined( 'TJ_MAG_V3_LIVE' ) ) { define( 'TJ_MAG_V3_LIVE', true ); }
/* اولویت ۱۱: هستهٔ وردپرس در اولویت ۱۰ (_wp_add_block_level_preset_styles) خروجی قبلی را null می‌کند؛ پس این باید بعد از آن و بعد از نسخهٔ قبلی اجرا شود. */
function tj_mag_swap_v3( $pre, $block ) {
	if ( is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) { return $pre; }
	if ( ! isset( $block['blockName'] ) || 'core/group' !== $block['blockName'] ) { return $pre; }
	if ( ! is_page( 287 ) ) { return $pre; }
	$cls = isset( $block['attrs']['className'] ) ? trim( (string) $block['attrs']['className'] ) : '';
	if ( 'tjm' !== $cls ) { return $pre; }
	$preview = isset( $_GET['tjv3'] ) && current_user_can( 'edit_pages' );
	if ( ! TJ_MAG_V3_LIVE && ! $preview ) { return $pre; }
	return '<main class="tjg-main">' . tj_mag_home_v3() . '</main>';
}
add_filter( 'pre_render_block', 'tj_mag_swap_v3', 11, 2 );
