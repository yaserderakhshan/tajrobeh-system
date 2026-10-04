/**
 * Tajrobeh: کارت «این نویسنده کیست» در صفحهٔ نویسندهٔ مجله (/mag/author/<slug>/)
 * نویسنده را به نقشش در اکوسیستم وصل می‌کند: تراپیست ← رزرو معارفه، دانشجو ← مدرسه.
 * منبع حقیقت: رجیستری افراد (اسکیل tajrobeh-people). نویسندهٔ تازه؟ فقط یک سطر به آرایه اضافه کن.
 * نوع: therapist | alumni | student
 */
function tajrobeh_author_roles() {
    return array(
        'paris-tanzifi' => array('روانکاو لکانی، تراپیست و سوپروایزر کلینیک تجربه', 'therapist'),
        'arman-dashti' => array('تراپیست کلینیک تجربه', 'therapist'),
        'afra' => array('تراپیست کلینیک تجربه', 'therapist'),
        'sara-derakhshan' => array('تراپیست کلینیک تجربه و دانش‌آموختهٔ مدرسهٔ تجربه', 'therapist'),
        'siamak-safari' => array('تراپیست کلینیک تجربه، دانش‌آموخته و منتور مدرسهٔ تجربه', 'therapist'),
        'erfan-amirbeigi' => array('تراپیست کلینیک تجربه، دانش‌آموختهٔ مدرسه و سردبیر مجلهٔ تجربه', 'therapist'),
        'fatemeh-baberi' => array('تراپیست کلینیک تجربه و دانش‌آموختهٔ مدرسهٔ تجربه', 'therapist'),
        'mastooreh-karami' => array('تراپیست کلینیک تجربه و دانش‌آموختهٔ مدرسهٔ تجربه', 'therapist'),
        'mohammdreza-shabanzadeh' => array('تراپیست کلینیک تجربه و دانش‌آموختهٔ مدرسهٔ تجربه', 'therapist'),
        'naeimeh-rezvani' => array('تراپیست کلینیک تجربه و دانش‌آموختهٔ مدرسهٔ تجربه', 'therapist'),
        'tabasom-arjmand' => array('دانش‌آموختهٔ مدرسهٔ تجربه', 'alumni'),
        'fatemeh-shahinfar' => array('دانش‌آموختهٔ مدرسهٔ تجربه', 'alumni'),
        'ghazaljafari' => array('', 'student'),
        'aref-j' => array('', 'student'),
        'mohanna' => array('', 'student'),
        'saeid-brati' => array('', 'student'),
        'hanieh' => array('', 'student'),
        'narjes-ziaei' => array('', 'student'),
        'narges-ziaei' => array('', 'student'),
        'khdemi2' => array('', 'student'),
        'amirhossein-bahrami' => array('', 'student'),
        'tondro' => array('', 'student'),
        'hajiali' => array('', 'student'),
        'fardin-barhour' => array('', 'student'),
        'mahsa-bina' => array('', 'student'),
    );
}
add_filter('render_block', function ($html, $block) {
    if (empty($block['blockName']) || $block['blockName'] !== 'core/query-title') { return $html; }
    if (!is_author()) { return $html; }
    $a = get_queried_object();
    if (!$a || empty($a->user_nicename)) { return $html; }
    $map = tajrobeh_author_roles();
    if (!isset($map[$a->user_nicename])) { return $html; }
    $role = $map[$a->user_nicename][0];
    $type = $map[$a->user_nicename][1];
    $name = esc_html($a->display_name);
    if ($type === 'therapist') {
        $txt = $name . '، ' . esc_html($role) . ' است. اگر نوشته‌هایش به دلتان نشست، می‌توانید برای جلسهٔ معارفه وقت بگیرید.';
        $btn = '<a class="tjab-b" href="/get-therapy/">رزرو جلسهٔ معارفه</a><a class="tjab-g" href="/#therapists">درمانگران تجربه</a>';
        if (function_exists('tjp_url_by_user') && ($pu = tjp_url_by_user($a->ID))) { $btn = '<a class="tjab-b" href="' . esc_url(wp_make_link_relative($pu)) . '">صفحهٔ کامل در تیم تجربه</a><a class="tjab-g" href="/get-therapy/">رزرو جلسهٔ معارفه</a>'; }
    } elseif ($type === 'alumni') {
        $txt = $name . '، ' . esc_html($role) . ' است. بخش بزرگی از مطالب مجله را دانشجوها و درمانگرهای همین مجموعه نوشته‌اند.';
        $btn = '<a class="tjab-b" href="/school/">مدرسهٔ تجربه</a><a class="tjab-g" href="/editorial/">شما هم بنویسید</a>';
    } else {
        $txt = $name . ' دانشجوی مدرسهٔ تجربه است. بخش بزرگی از مطالب مجله را دانشجوها و درمانگرهای همین مجموعه نوشته‌اند.';
        $btn = '<a class="tjab-b" href="/school/">مدرسهٔ تجربه</a><a class="tjab-g" href="/editorial/">شما هم بنویسید</a>';
    }
    $css = '<style>.tjab{max-width:760px;margin:16px auto 4px;padding:14px 18px;border:1px solid var(--tj-line,#dfdfe2);border-radius:16px;background:var(--tj-tint,#faeced);display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;direction:rtl;text-align:right}.tjab p{margin:0;font-size:14.5px;line-height:1.9;color:var(--tj-ink,#0e0e0e);flex:1 1 300px}.tjab .tjab-a{display:flex;gap:8px;flex-wrap:wrap}.tjab a{display:inline-flex;align-items:center;padding:7px 16px;border-radius:999px;font-size:13.5px;font-weight:700;text-decoration:none;line-height:1.6}.tjab a.tjab-b{background:var(--tj-red,#c83f49);color:#fff}.tjab a.tjab-g{background:#fff;color:var(--tj-red-600,#b63942);border:1px solid var(--tj-red-400,#d9737a)}</style>';
    return $html . $css . '<div class="tjab"><p>' . $txt . '</p><div class="tjab-a">' . $btn . '</div></div>';
}, 10, 2);