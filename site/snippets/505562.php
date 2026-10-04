/**
 * Tajrobeh — کارت نویسندهٔ مقاله v1 (tjau) · ۶ مهر ۱۴۰۵
 * نویسندهٔ درمانگر با نویسندهٔ عادی یکی نیست:
 *  - در سطر نویسندهٔ بالای مقاله، نشان نقش (درمانگر کلینیک / دانش‌آموخته / دانشجوی مدرسه) می‌آید؛
 *  - جعبهٔ «نویسندهٔ این نوشته» پایین مقاله کارت کامل می‌شود: عکس، عنوان حرفه‌ای، شمار نوشته‌ها
 *    و برای درمانگر، رزرو معارفه با خود او در بات (start=tm-<نامک صفحهٔ تیم>)؛
 *  - اسکیمای Person یوست jobTitle و sameAs (صفحهٔ تیم) می‌گیرد.
 * نقش‌ها از tajrobeh_author_roles() (اسنیپت 504048) و داده‌ها از صفحهٔ تیم (اسنیپت 504078).
 * نویسندهٔ تازه؟ فقط یک سطر به همان آرایهٔ 504048 اضافه کن.
 */
function tjau_ctx() {
    static $ctx = null;
    if ($ctx !== null) { return $ctx; }
    $ctx = false;
    if (!is_singular('post')) { return $ctx; }
    $pid = get_queried_object_id();
    $uid = (int) get_post_field('post_author', $pid);
    $u = get_userdata($uid);
    if (!$u) { return $ctx; }
    $map = function_exists('tajrobeh_author_roles') ? tajrobeh_author_roles() : array();
    $type = isset($map[$u->user_nicename]) ? $map[$u->user_nicename][1] : 'writer';
    $role = isset($map[$u->user_nicename]) ? (string) $map[$u->user_nicename][0] : '';
    $person = 0; $d = array(); $purl = '';
    $q = get_posts(array('post_type' => 'tj_person', 'post_status' => 'publish', 'numberposts' => 1, 'fields' => 'ids',
                         'meta_key' => '_tjp_user', 'meta_value' => (string) $uid));
    if (!$q && function_exists('tjp_index') && function_exists('tjp_norm')) {
        $idx = tjp_index();
        $k = tjp_norm($u->display_name);
        if ($k !== '' && isset($idx[$k]['id'])) { $q = array((int) $idx[$k]['id']); }
    }
    if ($q) {
        $person = (int) $q[0];
        $purl = wp_make_link_relative(get_permalink($person));
        if (function_exists('tjp_data')) { $d = tjp_data($person); }
    }
    $img = '';
    if (!empty($d['img']['avatar'])) { $img = (string) $d['img']['avatar']; }
    elseif (!empty($d['img']['hero_s'])) { $img = (string) $d['img']['hero_s']; }
    elseif ($person) { $t = get_the_post_thumbnail_url($person, 'thumbnail'); if ($t) { $img = $t; } }
    $ctx = array(
        'uid' => $uid, 'name' => $u->display_name, 'type' => $type, 'role' => $role,
        'purl' => $purl, 'pslug' => $person ? (string) get_post_field('post_name', $person) : '',
        'title' => !empty($d['title']) ? wp_strip_all_tags((string) $d['title']) : '',
        'img' => $img, 'count' => (int) count_user_posts($uid, 'post', true),
        'aurl' => wp_make_link_relative(get_author_posts_url($uid)),
    );
    return $ctx;
}
function tjau_badge($t) {
    $b = array('therapist' => 'درمانگر کلینیک تجربه', 'alumni' => 'دانش‌آموختهٔ مدرسهٔ تجربه', 'student' => 'دانشجوی مدرسهٔ تجربه');
    return isset($b[$t]) ? $b[$t] : '';
}
function tjau_card($x) {
    $name = esc_html($x['name']);
    $parts = preg_split('/\s+/u', trim($x['name']));
    $first = esc_html($parts[0]);
    $t = $x['type'];
    $ph = $x['img']
        ? '<img class="tjau-ph" src="' . esc_url($x['img']) . '" width="72" height="72" alt="' . $name . '" loading="lazy" decoding="async">'
        : ''; /* بی‌عکس: بخش عکس غیرفعال، حروف اول اسم هیچ‌جا نمی‌آید */
    $bd = tjau_badge($t);
    $line = $x['title'] !== '' ? $x['title'] : $x['role'];
    $cnt = $x['count'] > 1 ? number_format_i18n($x['count']) . ' نوشته در مجلهٔ تجربه' : '';
    $note = '';
    if ($t === 'therapist') {
        $note = 'این نوشته را درمانگری نوشته که خودش در کلینیک تجربه با مراجع کار می‌کند. اگر نگاهش به دلتان نشست، می‌توانید جلسهٔ معارفه را با خود ' . $first . ' شروع کنید.';
        $book = $x['pslug'] !== '' ? 'https://t.me/tajrobehlife_bot?start=tm-' . $x['pslug'] : '/get-therapy/';
        $btns = '<a class="p" data-tjau="book" href="' . esc_url($book) . '">رزرو جلسهٔ معارفه با ' . $first . '</a>';
        if ($x['purl'] !== '') { $btns .= '<a class="g" data-tjau="profile" href="' . esc_url($x['purl']) . '">صفحهٔ ' . $name . '</a>'; }
        $btns .= '<a class="g" data-tjau="posts" href="' . esc_url($x['aurl']) . '">همهٔ نوشته‌ها</a>';
    } elseif ($t === 'alumni' || $t === 'student') {
        $note = 'بخش بزرگی از مطالب مجلهٔ تجربه را دانشجوها و دانش‌آموخته‌های مدرسهٔ تجربه نوشته‌اند؛ مدرسه‌ای که مسیر درمانگر شدن را از آموزش تا کار بالینی زیر نظر سوپروایزر پیش می‌برد.';
        $btns = '<a class="p" data-tjau="school" href="/school/">مدرسهٔ تجربه</a><a class="g" data-tjau="posts" href="' . esc_url($x['aurl']) . '">همهٔ نوشته‌ها</a><a class="g" data-tjau="write" href="/editorial/">شما هم بنویسید</a>';
    } else {
        $btns = '<a class="g" data-tjau="posts" href="' . esc_url($x['aurl']) . '">همهٔ نوشته‌های ' . $name . '</a><a class="g" data-tjau="write" href="/editorial/">شما هم برای مجله بنویسید</a>';
    }
    $h = '<section class="tjau tjau-' . esc_attr($t) . '" aria-label="دربارهٔ نویسنده" data-type="' . esc_attr($t) . '">';
    $h .= '<div class="tjau-h">' . $ph . '<div><span class="tjau-l">نویسندهٔ این نوشته</span>';
    $h .= '<div class="tjau-n"><a href="' . esc_url($x['purl'] !== '' ? $x['purl'] : $x['aurl']) . '">' . $name . '</a>' . ($bd !== '' ? '<span class="tjau-bd tjau-bd-' . esc_attr($t) . '">' . esc_html($bd) . '</span>' : '') . '</div>';
    if ($line !== '') { $h .= '<span class="tjau-r">' . esc_html($line) . '</span>'; }
    if ($cnt !== '') { $h .= '<span class="tjau-c">' . esc_html($cnt) . '</span>'; }
    $h .= '</div></div>';
    if ($note !== '') { $h .= '<p>' . $note . '</p>'; }
    $h .= '<div class="tjau-b">' . $btns . '</div></section>';
    return $h;
}
add_filter('render_block', function ($html, $block) {
    if (empty($block['blockName'])) { return $html; }
    $cls = isset($block['attrs']['className']) ? (string) $block['attrs']['className'] : '';
    if ($cls === '') { return $html; }
    if ($block['blockName'] === 'core/post-author-name' && strpos($cls, 'tj-art-au') !== false) {
        $x = tjau_ctx();
        if (!$x) { return $html; }
        $bd = tjau_badge($x['type']);
        if ($bd === '') { return $html; }
        return $html . '<span class="tjau-bd tjau-bd-' . esc_attr($x['type']) . '">' . esc_html($bd) . '</span>';
    }
    if ($block['blockName'] === 'core/group' && strpos($cls, 'tj-art-aubox') !== false) {
        $x = tjau_ctx();
        if (!$x) { return $html; }
        return tjau_card($x);
    }
    return $html;
}, 20, 2);
add_filter('wpseo_schema_person', function ($data) {
    $x = tjau_ctx();
    if (!$x) { return $data; }
    if (!isset($data['name']) || $data['name'] !== $x['name']) { return $data; }
    if ($x['type'] === 'therapist') {
        $data['jobTitle'] = $x['title'] !== '' ? $x['title'] : 'روان‌درمانگر';
        $data['worksFor'] = array('@id' => home_url('/#organization'));
    }
    if ($x['type'] === 'alumni' || $x['type'] === 'student' || strpos($x['role'], 'دانش‌آموخته') !== false) {
        $data['alumniOf'] = array('@type' => 'EducationalOrganization', 'name' => 'مدرسهٔ تجربه', 'url' => home_url('/school/'));
    }
    if ($x['purl'] !== '') {
        $s = isset($data['sameAs']) ? (array) $data['sameAs'] : array();
        $s[] = home_url($x['purl']);
        $data['sameAs'] = array_values(array_unique($s));
    }
    return $data;
}, 20);
add_action('wp_head', function () {
    if (!is_singular('post')) { return; }
    echo '<style id="tjau-css">.tjau-bd{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;line-height:1;padding:6px 10px;border-radius:999px;background:var(--tj-tint,#faeced);color:var(--tj-red-600,#b63942);border:1px solid var(--tj-red-400,#d9737a);white-space:nowrap}.tjau-bd::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--tj-red,#c83f49)}.tjau-bd-alumni,.tjau-bd-student{background:#fff;color:var(--tj-soft,#4e4e4e);border-color:var(--tj-line,#dfdfe2)}.tjau-bd-alumni::before,.tjau-bd-student::before{background:var(--tj-mut,#676768)}.tjau{direction:rtl;text-align:right;max-width:760px;margin:28px auto 8px;border:1px solid var(--tj-line,#dfdfe2);border-radius:20px;background:#fff;padding:20px 22px;overflow-wrap:normal;word-break:normal;box-sizing:border-box}.tjau-therapist{border-color:var(--tj-red-400,#d9737a);background:linear-gradient(180deg,var(--tj-tint,#faeced),#fff 75%)}.tjau-h{display:flex;gap:14px;align-items:center}.tjau-ph{flex:none;width:72px;height:72px;border-radius:50%;object-fit:cover;background:var(--tj-sunk,#f5f5f8)}.tjau-mono{display:grid;place-items:center;font-size:26px;font-weight:800;color:var(--tj-red,#c83f49);background:var(--tj-tint,#faeced)}.tjau-l{display:block;font-size:12px;color:var(--tj-mut,#676768);margin:0 0 2px;line-height:1.6}.tjau-n{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:18px;font-weight:800;line-height:1.6}.tjau-n a{color:var(--tj-ink,#0e0e0e)!important;text-decoration:none!important}.tjau-r{display:block;font-size:14px;color:var(--tj-soft,#4e4e4e);line-height:1.8;margin-top:2px}.tjau-c{display:block;font-size:12.5px;color:var(--tj-mut,#676768);line-height:1.8}.tjau p{margin:14px 0 0;font-size:15px;line-height:2;color:var(--tj-ink,#0e0e0e)}.tjau-b{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.tjau-b a{display:inline-flex;align-items:center;justify-content:center;padding:9px 16px;border-radius:999px;font-size:14px;font-weight:700;line-height:1.6;text-decoration:none!important}.tjau-b a.p{background:var(--tj-red,#c83f49)!important;color:#fff!important;border:1px solid var(--tj-red,#c83f49)!important}.tjau-b a.p:hover{background:var(--tj-red-600,#b63942)!important}.tjau-b a.g{background:#fff!important;color:var(--tj-red-600,#b63942)!important;border:1px solid var(--tj-red-400,#d9737a)!important}.tj-art-meta .tjau-bd{margin-inline-start:2px}@media (max-width:760px){.tjau{padding:16px}.tjau-ph{width:60px;height:60px}.tjau-b a{flex:1 1 auto}}</style>';
});
add_action('wp_footer', function () {
    if (!is_singular('post')) { return; }
    echo '<script>(function(){document.addEventListener("click",function(e){var a=e.target.closest?e.target.closest("[data-tjau]"):null;if(!a){return;}var s=a.closest(".tjau");var p={kind:a.getAttribute("data-tjau"),author_type:s?s.getAttribute("data-type"):"",page_path:location.pathname,link_url:a.getAttribute("href")};if(window.gtag){window.gtag("event","author_card_click",p);}if(window.dataLayer){window.dataLayer.push(Object.assign({event:"author_card_click"},p));}},true);})();</script>';
});