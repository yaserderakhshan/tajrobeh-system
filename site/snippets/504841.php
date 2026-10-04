// اسکیمای بازبینی بالینی مقاله‌های مجله · v4 (۷ مهر ۱۴۰۵): بازبین‌های تأییدشده از بات هم خودکار اضافه می‌شوند
// دو منبع:
//  ۱) $map ثابت پایین (بازبینی‌های پیش از بات)
//  ۲) tjmc_reviews_for() از اسنیپت «مشارکت در مجله (tjmc)»: هر بازبینی که سردبیر در بات تأیید کرده و بازبین با نمایش نامش موافقت کرده
// کد نظام فقط وقتی می‌آید که خود بازبین در بات داده باشد.
function tj_reviewers() {
    return array(
        'erfan' => array('name' => 'دکتر عرفان امیربیگی', 'job' => 'روان‌درمانگر تحلیلی', 'url' => 'https://tajrobeh.life/team/erfan-amirbeigi/', 'code' => '70828'),
    );
}
add_filter( 'wpseo_schema_webpage', function( $data ) {
    $map = array(
        140 => array('date' => '2026-09-17', 'by' => array('erfan')),
        27  => array('date' => '2026-09-17', 'by' => array('erfan')),
        104 => array('date' => '2026-09-17', 'by' => array('erfan')),
        86  => array('date' => '2026-09-17', 'by' => array('erfan')),
        35  => array('date' => '2026-09-17', 'by' => array('erfan')),
    );
    $id = get_the_ID();
    $all = tj_reviewers();
    $people = array(); $seen = array(); $date = '';
    if ( isset( $map[ $id ] ) ) {
        $date = $map[ $id ]['date'];
        foreach ( $map[ $id ]['by'] as $k ) {
            if ( ! isset( $all[ $k ] ) ) { continue; }
            $r = $all[ $k ];
            $p = array( '@type' => 'Person', 'name' => $r['name'], 'jobTitle' => $r['job'] );
            if ( ! empty( $r['url'] ) ) { $p['url'] = $r['url']; }
            if ( ! empty( $r['code'] ) ) { $p['identifier'] = array( '@type' => 'PropertyValue', 'name' => 'کد نظام روان‌شناسی', 'value' => $r['code'] ); }
            $people[] = $p; $seen[ $r['name'] ] = 1;
        }
    }
    if ( function_exists( 'tjmc_reviews_for' ) ) {
        foreach ( tjmc_reviews_for( $id ) as $r ) {
            if ( isset( $seen[ $r['name'] ] ) ) { continue; }
            $p = array( '@type' => 'Person', 'name' => $r['name'] );
            if ( ! empty( $r['job'] ) ) { $p['jobTitle'] = $r['job']; }
            if ( ! empty( $r['url'] ) ) { $p['url'] = $r['url']; }
            if ( ! empty( $r['nz'] ) ) { $p['identifier'] = array( '@type' => 'PropertyValue', 'name' => 'کد نظام روان‌شناسی', 'value' => $r['nz'] ); }
            $people[] = $p; $seen[ $r['name'] ] = 1;
            if ( ! empty( $r['date'] ) && $r['date'] > $date ) { $date = $r['date']; }
        }
    }
    $lr = (string) get_post_meta( $id, '_tj_last_reviewed', true );   /* v4: تاریخ آخرین اعمال اصلاحات بازبینی از بات */
    if ( $lr && $lr > $date ) { $date = $lr; }
    if ( ! $people ) { return $data; }
    $data['@type']        = 'MedicalWebPage';
    if ( $date ) { $data['lastReviewed'] = $date; }
    $data['reviewedBy']   = count( $people ) === 1 ? $people[0] : $people;
    return $data;
}, 20 );
