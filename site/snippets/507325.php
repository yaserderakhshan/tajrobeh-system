/* نقشهٔ سایت خبری گوگل: /news-sitemap.xml با نوشته‌های ۴۸ ساعت اخیر (لین F، ۱ آبان ۱۴۰۵) */
add_action( 'init', function () {
	$path = isset( $_SERVER['REQUEST_URI'] ) ? strtok( $_SERVER['REQUEST_URI'], '?' ) : '';
	if ( '/news-sitemap.xml' !== $path ) {
		return;
	}
	$q = new WP_Query( array(
		'post_type'           => 'post',
		'post_status'         => 'publish',
		'posts_per_page'      => 1000,
		'ignore_sticky_posts' => true,
		'no_found_rows'       => true,
		'date_query'          => array( array( 'after' => gmdate( 'Y-m-d H:i:s', time() - 48 * HOUR_IN_SECONDS ), 'column' => 'post_date_gmt', 'inclusive' => true ) ),
	) );
	nocache_headers();
	status_header( 200 );
	header( 'Content-Type: application/xml; charset=utf-8' );
	header( 'X-Robots-Tag: noindex, follow' );
	echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
	echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' . "\n";
	foreach ( $q->posts as $p ) {
		echo "<url>\n<loc>" . esc_url( get_permalink( $p ) ) . "</loc>\n<news:news>\n<news:publication>\n<news:name>مجلهٔ تجربه زندگی</news:name>\n<news:language>fa</news:language>\n</news:publication>\n";
		echo '<news:publication_date>' . esc_html( get_post_time( 'c', true, $p ) ) . "</news:publication_date>\n";
		echo '<news:title>' . esc_html( wp_strip_all_tags( get_the_title( $p ) ) ) . "</news:title>\n</news:news>\n</url>\n";
	}
	echo '</urlset>';
	exit;
}, 0 );
add_filter( 'robots_txt', function ( $output ) {
	return rtrim( $output ) . "\nSitemap: " . home_url( '/news-sitemap.xml' ) . "\n";
}, 99 );