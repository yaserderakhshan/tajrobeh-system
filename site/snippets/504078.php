/**
 * Tajrobeh — صفحهٔ افراد (تیم تجربه) v1
 *
 * هر درمانگر، استاد و سوپروایزری که یاسر در بات تأییدش کند یک صفحهٔ ثابت می‌گیرد: /team/<نام>/
 * داده در پست‌متای «_tjp» (JSON) است و صفحه هر بار از روی داده رندر می‌شود؛ پس تغییر طراحی
 * یک‌جا به همهٔ صفحه‌ها می‌رسد. سبک و اسکریپت پایه عیناً از صفحهٔ اصلی (503465) برداشته می‌شود.
 *
 *   - نقش اصلی صفحه را می‌سازد: تراپیست (گرم، قرمز، قاب طاقی) یا استاد و سوپروایزر (جوهری، قاب کتابی).
 *     آدم چندنقشی یک صفحه دارد و بخش‌های هر نقش پشت هم می‌آیند.
 *   - نویسندهٔ مجله: نوشته‌هایش از کاربر وردپرس خودش (و نوشته‌های مشترک) می‌آید.
 *   - هر کارت .thc و .supc در هر برگه که اسمش با یک صفحه بخواند، خودش لینک می‌شود (بدون دست‌زدن به محتوا).
 *   - /team/ فهرست همهٔ صفحه‌هاست (کد کوتاه [tj_team]).
 *   - Yoast عنوان و توضیح می‌گیرد؛ JSON-LD: ProfilePage + Person + BreadcrumbList + FAQPage.
 * نوشتن داده فقط از مسیر امضاشدهٔ بات (اسنیپت 504064، op=person) یا مدیر وردپرس.
 */

if (!defined('TJP_VER')) {
    define('TJP_VER', '1.5');
    define('TJP_SLUG', 'team');
    define('TJP_HOME_ID', 503465);
}

if (!function_exists('tjp_render')) {

/* ───── نوع پست ───── */
add_action('init', 'tjp_register', 5);
function tjp_register() {
    register_post_type('tj_person', array(
        'label' => 'تیم تجربه',
        'labels' => array('name' => 'تیم تجربه', 'singular_name' => 'عضو تیم', 'add_new_item' => 'افزودن عضو',
                          'edit_item' => 'ویرایش عضو', 'all_items' => 'همهٔ اعضا', 'menu_name' => 'تیم تجربه'),
        'public' => true, 'publicly_queryable' => true, 'show_ui' => true, 'show_in_menu' => true,
        'show_in_rest' => true, 'menu_icon' => 'dashicons-groups', 'menu_position' => 21,
        'has_archive' => false, 'hierarchical' => false, 'query_var' => true,
        'rewrite' => array('slug' => TJP_SLUG, 'with_front' => false),
        'supports' => array('title', 'thumbnail', 'excerpt', 'revisions', 'custom-fields'),
    ));
}
add_action('init', function () {
    if (get_option('tjp_rw') !== TJP_VER) { flush_rewrite_rules(false); update_option('tjp_rw', TJP_VER, true); }
}, 99);

/* برگهٔ /team/: عنوان و توضیح Yoast یک بار */
add_action('init', function () {
    if (get_option('tjp_team_seo') === TJP_VER) return;
    $pg = get_page_by_path(TJP_SLUG);
    if (!$pg) return;
    update_post_meta($pg->ID, '_yoast_wpseo_title', 'تیم تجربه: درمانگرها، استادها و سوپروایزرها | مرکز تجربه زندگی');
    update_post_meta($pg->ID, '_yoast_wpseo_metadesc', 'صفحهٔ هر درمانگر، استاد و سوپروایزر مرکز تجربه زندگی با روش کار، جلسهٔ اول، آموزش‌ها، نوشته‌ها و معرفی صوتی. درمانگر مناسب خود را پیدا کنید.');
    update_option('tjp_team_seo', TJP_VER, false);
}, 100);

add_action('rest_api_init', function () {
    register_rest_route('tj/v1', '/people/sys', array(
        'methods' => 'GET', 'callback' => 'tjp_sys',
        'permission_callback' => function () { return current_user_can('manage_options'); },
    ));
    register_rest_route('tj/v1', '/people/photo-sync', array(
        'methods' => 'POST', 'callback' => function (WP_REST_Request $r) {
            $d = json_decode($r->get_body(), true); if (!is_array($d)) $d = array();
            return tjp_photo_sync(!empty($d['apply']), isset($d['limit']) ? $d['limit'] : 8, isset($d['only']) ? $d['only'] : null, !empty($d['stamp']));
        },
        'permission_callback' => function () { return current_user_can('manage_options'); },
    ));
    register_rest_route('tj/v1', '/people/relink', array(
        'methods' => 'POST', 'callback' => function () { return tjp_relink(); },
        'permission_callback' => function () { return current_user_can('manage_options'); },
    ));
    register_rest_route('tj/v1', '/people/save', array(
        'methods' => 'POST', 'callback' => function (WP_REST_Request $r) {
            $d = json_decode($r->get_body(), true);
            if (!is_array($d)) return new WP_Error('tjp_json', 'bad json', array('status' => 400));
            try { return tjp_upsert($d); } catch (Throwable $e) { return new WP_Error('tjp_err', $e->getMessage(), array('status' => 500)); }
        },
        'permission_callback' => function () { return current_user_can('manage_options'); },
    ));
});

function tjp_ffmpeg() {
    $dis = array_map('trim', explode(',', (string) ini_get('disable_functions')));
    if (!function_exists('exec') || in_array('exec', $dis, true)) return '';
    foreach (array('/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/bin/ffmpeg') as $p) { if (@is_executable($p)) return $p; }
    $out = array(); @exec('command -v ffmpeg 2>/dev/null', $out);
    return !empty($out[0]) ? trim($out[0]) : '';
}

function tjp_sys() {
    return array('ver' => TJP_VER, 'ffmpeg' => tjp_ffmpeg(), 'exec' => function_exists('exec'),
                 'imagick' => class_exists('Imagick'), 'people' => count(tjp_index(true)));
}

/* ───── کمک‌ها ───── */
function tjp_data($id) {
    $j = get_post_meta($id, '_tjp', true);
    $d = is_array($j) ? $j : json_decode((string) $j, true);
    return is_array($d) ? $d : array();
}
function tjp_norm($s) {
    $s = wp_strip_all_tags((string) $s);
    $s = preg_replace('/^\s*دکتر\s+/u', '', $s);
    $s = preg_replace('/\(.*?\)/u', '', $s);
    $s = strtr($s, array('ي' => 'ی', 'ك' => 'ک', 'ئ' => 'ی', 'آ' => 'ا', 'أ' => 'ا', 'ؤ' => 'و', 'ة' => 'ه', 'ۀ' => 'ه'));
    $s = preg_replace('/[\x{200B}-\x{200F}\x{FEFF}\s]+/u', '', $s);
    return mb_strtolower(str_replace('وو', 'و', $s));
}
function tjp_fa($s) { return strtr((string) $s, array('0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹')); }
function tjp_en($s) { return strtr((string) $s, array('۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9')); }
function tjp_e($s) { return esc_html(tjp_clean($s)); }
/* خط تیرهٔ وسط جمله و | روی سایت نمی‌آیند */
function tjp_clean($s) { return tjp_fixfa(trim(preg_replace(array('/\s*[—–|]\s*/u', '/[ \t]+/u'), array(' · ', ' '), (string) $s))); }
/* نیم‌فاصله‌های رایج (فقط نمایش؛ متن خود عضو در شیت دست نمی‌خورد) */
function tjp_fixfa($s) {
    $s = preg_replace('/(?<![\p{L}\x{200C}])(ن?)می (?=(شود|شوند|کند|کنند|کنم|کنیم|کنید|دهد|دهند|دهم|دهیم|توان|توانم|توانند|خواهد|خواهند|خواهم|گیرد|گیرند|رسد|بینم|بیند|بینند|دانم|داند|دانند|گذارد|گردد|پردازم|پردازد|آید|آیند)(?![\p{L}]))/u', '$1می‌', $s);
    $s = preg_replace('/(?<![\p{L}\x{200C}])(ن?)می(?=(شود|شوند|کند|کنند|کنم|کنیم|کنید|دهد|دهند|دهم|دهیم|توانم|توانند|خواهد|خواهند|خواهم|گیرد|گیرند|رسد|بینم|بیند|بینند|دانم|داند|دانند|گذارد|گردد|پردازم|پردازد)(?![\p{L}]))/u', '$1می‌', $s);
    $s = strtr($s, array('رواندرمان' => 'روان‌درمان', 'روانشناس' => 'روان‌شناس', 'روانکاوان' => 'روانکاوان', ' ها ' => '‌ها ', ' های ' => '‌های '));
    return $s;
}
function tjp_lines($s) {
    $out = array();
    foreach (preg_split('/\r?\n+/u', (string) $s) as $l) { $l = trim(preg_replace('/^[\s\-•*·\d\.\)]+/u', '', $l)); if ($l !== '') $out[] = $l; }
    return $out;
}
function tjp_paras($s) {
    $ps = preg_split('/\r?\n\s*\r?\n/u', trim((string) $s));
    $h = '';
    foreach ($ps as $p) { $p = trim($p); if ($p !== '') $h .= '<p>' . nl2br(tjp_e($p)) . '</p>'; }
    return $h;
}
function tjp_first($name) {
    $n = trim(preg_replace('/^\s*دکتر\s+/u', '', (string) $name));
    $p = preg_split('/\s+/u', $n);
    return $p ? $p[0] : $n;
}
function tjp_jyear() {
    $y = (int) current_time('Y'); $m = (int) current_time('n'); $d = (int) current_time('j');
    return ($m > 3 || ($m === 3 && $d >= 21)) ? $y - 621 : $y - 622;
}
function tjp_cut($s, $n) { $s = trim(preg_replace('/\s+/u', ' ', wp_strip_all_tags((string) $s))); return mb_strlen($s) > $n ? rtrim(mb_substr($s, 0, $n - 1)) . '…' : $s; }
function tjp_ic($k) {
    $p = array(
        'pin' => '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
        'screen' => '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
        'lang' => '<path d="M4 5h9M8.5 3v2M6 5c.5 3 2.8 5.8 6 7M11 5c-.6 3.4-3 6.4-7 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/>',
        'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'cap' => '<path d="M12 4 2 9l10 5 10-5-10-5Z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/>',
        'book' => '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M8 7h7"/>',
        'eye' => '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
        'heart' => '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
        'users' => '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.2a3 3 0 0 1 0 5.6M21 20c0-2.6-1.6-4.8-3.8-5.6"/>',
        'link' => '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
        'arrow' => '<path d="M15 6l-6 6 6 6"/>',
        'play' => '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
        'pen' => '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/>',
        'chat' => '<path d="M4 5h16v11H8l-4 4V5Z"/>',
        'tg' => '<path d="M21.5 3.5 2.5 11l6.5 2.2L11 20l3.2-4.2 5.3 4 2-16.3Z"/><path d="m9 13.2 7.5-5.7"/>',
        'bolt' => '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" stroke="none"/>',
        'check' => '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        'file' => '<path d="M6 3h8l5 5v13H6V3Z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . (isset($p[$k]) ? $p[$k] : '') . '</svg>';
}

/* فهرست نام ← آدرس برای لینک‌کردن کارت‌ها */
function tjp_index($rebuild = false) {
    $idx = $rebuild ? false : get_option('tjp_index');
    if (is_array($idx)) return $idx;
    $idx = array();
    foreach (get_posts(array('post_type' => 'tj_person', 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids')) as $pid) {
        $d = tjp_data($pid);
        $row = array('id' => $pid, 'url' => wp_make_link_relative(get_permalink($pid)), 'roles' => isset($d['roles']) ? $d['roles'] : '');
        $names = array_merge(array(get_the_title($pid)), isset($d['aka']) ? (array) $d['aka'] : array());
        foreach ($names as $n) { $k = tjp_norm($n); if ($k !== '') $idx[$k] = $row; }
    }
    update_option('tjp_index', $idx, true);
    return $idx;
}
add_action('save_post_tj_person', function () { delete_option('tjp_index'); });

/* ارتباط‌ها: هر کارتی که آدم در برگه‌های سایت دارد (درمانگر، سوپروایزر، استاد، منتور، دانش‌آموخته) هر ساعت با صفحه‌اش هم‌خوان می‌شود */
function tjp_appear_calc($name, $d) {
    if (!function_exists('tjd_locate')) return null;
    $names = array_values(array_unique(array_filter(array_merge(array($name), isset($d['aka']) ? (array) $d['aka'] : array()))));
    $seen = array(); $ap = array();
    foreach (tjd_locate($names) as $hh) {
        $sk = $hh['page'] . '|' . $hh['sec'];
        if (isset($seen[$sk])) continue; $seen[$sk] = 1;
        $ap[] = array('page' => (int) $hh['page'], 'title' => $hh['title'], 'url' => $hh['url'], 'kind' => $hh['kind'], 'sec' => $hh['sec']);
    }
    return $ap;
}
function tjp_photo_sync($apply, $limit, $only = null, $stamp = false) {
    $rows = array(); $did = 0;
    $pick = array();
    if (is_array($only)) foreach ($only as $o) $pick[tjp_norm($o)] = 1;
    $limit = $limit ? (int) $limit : 8;
    foreach (get_posts(array('post_type' => 'tj_person', 'post_status' => array('publish', 'draft', 'private'), 'numberposts' => -1, 'fields' => 'ids')) as $pid) {
        $title = get_the_title($pid);
        $key   = (string) get_post_meta($pid, '_tjp_key', true);
        $prev  = (string) get_post_meta($pid, '_tjp_photo_src', true);
        $src   = '';
        if (function_exists('tjd_locate')) {
            foreach (tjd_locate(array($title, $key)) as $hh) {
                $s = isset($hh['f']['photo']) ? (string) $hh['f']['photo'] : '';
                if ($s === '') continue;
                $src = preg_replace('/-\d+x\d+(?=\.\w+$)/', '', $s);
                break;
            }
        }
        if ($src === '') { $rows[] = array('n' => $title, 'st' => 'بدون کارت'); continue; }
        if ($prev === 'off') continue;
        if ($prev !== '' && $prev === $src) continue;
        if ($pick && empty($pick[tjp_norm($title)]) && empty($pick[$key])) {
            if ($stamp) { update_post_meta($pid, '_tjp_photo_src', $src); $rows[] = array('n' => $title, 'st' => 'مرجع ثبت شد'); }
            continue;
        }
        $row = array('n' => $title, 'st' => ($prev === '' ? 'بی‌مرجع' : 'کهنه'));
        if ($apply && $did < $limit) {
            try { tjp_upsert(array('id' => $pid, 'display' => $title)); $row['st'] .= ' · اصلاح شد'; $did++; }
            catch (Throwable $e) { $row['err'] = $e->getMessage(); }
        }
        $rows[] = $row;
    }
    if ($did) { delete_option('tjp_index'); if (function_exists('wpo_cache_flush')) wpo_cache_flush(); }
    return array('n' => count($rows), 'fixed' => $did, 'rows' => $rows);
}

function tjp_relink() {
    $n = 0; $who = array();
    foreach (get_posts(array('post_type' => 'tj_person', 'post_status' => array('publish', 'draft', 'private'), 'numberposts' => -1, 'fields' => 'ids')) as $pid) {
        $d = tjp_data($pid);
        $ap = tjp_appear_calc(get_the_title($pid), $d);
        if ($ap === null) continue;
        $old = isset($d['appear']) ? (array) $d['appear'] : array();
        if (wp_json_encode($old) === wp_json_encode($ap)) continue;
        $d['appear'] = $ap;
        update_post_meta($pid, '_tjp', wp_slash(wp_json_encode($d, JSON_UNESCAPED_UNICODE)));
        $n++; $who[] = get_the_title($pid);
    }
    if ($n) { delete_option('tjp_index'); if (function_exists('wpo_cache_flush')) wpo_cache_flush(); }
    return array('changed' => $n, 'who' => $who);
}
add_action('tjp_relink_ev', 'tjp_relink');
add_action('init', function () { if (!wp_next_scheduled('tjp_relink_ev')) wp_schedule_event(time() + 600, 'hourly', 'tjp_relink_ev'); });

/* آشتی‌دهندهٔ عکس: هر روز کارت و صفحهٔ شخصی را با هم می‌سنجد و اگر عکس کارت تازه‌تر بود، صفحه را به‌روز می‌کند */
add_action('tjp_photosync_ev', function () { tjp_photo_sync(true, 6); });
add_action('init', function () { if (!wp_next_scheduled('tjp_photosync_ev')) wp_schedule_event(time() + 1800, 'daily', 'tjp_photosync_ev'); });
add_action('trashed_post', function ($id) { if (get_post_type($id) === 'tj_person') delete_option('tjp_index'); });

function tjp_url_by_user($uid) {
    $q = get_posts(array('post_type' => 'tj_person', 'post_status' => 'publish', 'numberposts' => 1, 'fields' => 'ids',
                         'meta_key' => '_tjp_user', 'meta_value' => (string) (int) $uid));
    return $q ? get_permalink($q[0]) : '';
}

/* سبک و اسکریپت پایهٔ صفحه‌های تیم. v1.5 (قرارداد صفحه‌ها): از اسنیپت مستقل tj2-team-assets، نه از محتوای هوم.
   تا آن اسنیپت فعال نشده، همان خواندن قبلی از هوم (کش ۱۲ ساعته، با تاریخ ویرایش هوم) می‌ماند. */
function tjp_home_assets() {
    if (function_exists('tj2_team_assets')) { $a = tj2_team_assets(); return array('mod' => 'tj2-' . $a['ver'], 'style' => $a['style'], 'script' => $a['script']); }
    $mod = get_post_field('post_modified_gmt', TJP_HOME_ID);
    $c = get_transient('tjp_home_assets');
    if (is_array($c) && isset($c['mod']) && $c['mod'] === $mod) return $c;
    $raw = (string) get_post_field('post_content', TJP_HOME_ID, 'raw');
    $st = preg_match('/<style>[\s\S]*?<\/style>/', $raw, $m) ? $m[0] : '';
    $sc = preg_match('/<script>[\s\S]*?<\/script>/', $raw, $m2) ? $m2[0] : '';
    $c = array('mod' => $mod, 'style' => $st, 'script' => $sc);
    set_transient('tjp_home_assets', $c, 12 * HOUR_IN_SECONDS);
    return $c;
}

/* ───── لینک‌کردن اسم‌ها در کارت‌های همهٔ برگه‌ها ───── */
add_filter('the_content', 'tjp_link_cards', 30);
function tjp_link_cards($html) {
    if (is_admin() || is_feed()) return $html;
    if (strpos($html, 'class="thc"') === false && strpos($html, 'class="supc"') === false) return $html;
    $idx = tjp_index();
    if (!$idx) return $html;
    $self = is_singular('tj_person') ? get_the_ID() : 0;
    $re = '/<div class="(thc|supc)"((?:(?!<div class="(?:thc|supc)").)*?)<b>(.*?)<\/b>/su';
    return preg_replace_callback($re, function ($m) use ($idx, $self) {
        $k = tjp_norm($m[3]);
        if (!isset($idx[$k]) || (int) $idx[$k]['id'] === (int) $self || strpos($m[3], '<a') !== false) return $m[0];
        return '<div class="' . $m[1] . ' tjp-has"' . $m[2] . '<b><a class="tjp-l" href="' . esc_url($idx[$k]['url']) . '">' . $m[3] . '</a></b>';
    }, $html);
}
add_action('wp_head', function () {
    echo '<style id="tjp-links">.tj2 .tjp-has{position:relative;cursor:pointer}.tj2 .tjp-has .tjp-l{color:inherit;text-decoration:none}'
       . '.tj2 .tjp-has .tjp-l::after{content:"";position:absolute;inset:0;z-index:1;border-radius:inherit}'
       . '.tj2 .tjp-has a:not(.tjp-l),.tj2 .tjp-has .pen,.tj2 .tjp-has .supmag{position:relative;z-index:2}'
       . '.tj2 .tjp-has:hover b{color:var(--tj-red,#c83f49)}.tj2 .tjp-has .tjp-l:focus-visible{outline:2px solid var(--tj-red-400,#d9737a);outline-offset:3px;border-radius:6px}</style>' . "\n";
}, 20);

/* ───── صفحهٔ هر نفر ───── */
add_filter('the_content', function ($html) {
    static $busy = false;
    if ($busy || is_admin() || get_post_type() !== 'tj_person' || !is_singular('tj_person')) return $html;
    $busy = true;
    $out = tjp_render(get_the_ID());
    $busy = false;
    return $out;
}, 5);
/* خروجی داخل بلوک html می‌رود تا do_blocks جلوی wpautop را بگیرد (مثل بقیهٔ برگه‌های سایت) */
/* کلاس single مال مقاله‌های مجله است؛ سبک مقاله نباید روی صفحهٔ افراد بنشیند */
add_filter('body_class', function ($c) { return is_singular('tj_person') ? array_values(array_diff($c, array('single'))) : $c; });

/* Yoast: همان گراف خودش ProfilePage می‌شود و مسیر «تیم تجربه» می‌گیرد؛ پس گراف تکراری نمی‌سازیم */
add_filter('wpseo_schema_webpage', function ($p) {
    if (is_singular('tj_person')) { $p['@type'] = array('WebPage', 'ProfilePage'); $p['mainEntity'] = array('@id' => get_permalink() . '#person'); }
    elseif (is_page(TJP_SLUG)) { $p['@type'] = array('WebPage', 'CollectionPage'); }
    return $p;
});
add_filter('wpseo_breadcrumb_links', function ($l) {
    if (is_singular('tj_person') && is_array($l) && count($l) >= 2) array_splice($l, 1, 0, array(array('url' => home_url('/' . TJP_SLUG . '/'), 'text' => 'تیم تجربه')));
    return $l;
});
add_filter('wpseo_opengraph_type', function ($t) { return is_singular('tj_person') ? 'profile' : $t; });
/* تصویر اشتراک‌گذاری همیشه همان عکس فعلی صفحه (یوست ممکن است عکس قبلی را نگه دارد) */
$tjp_og = function ($u) { if (!is_singular('tj_person')) return $u; $d = tjp_data(get_queried_object_id()); return !empty($d['img']['hero']) ? home_url(wp_make_link_relative($d['img']['hero'])) : $u; };
add_filter('wpseo_opengraph_image', $tjp_og); add_filter('wpseo_twitter_image', $tjp_og);

/* نام بخش کارت در برگه (therapists یا thTrack، supervisors یا supTrack، faculty یا facTrack، mentors، alumni یا alumTrack) به نقش */
function tjp_secrole($sec) {
    $s = strtolower(preg_replace('/Track$/', '', (string) $sec));
    $m = array('th' => 'T', 'therapists' => 'T', 'sup' => 'S', 'supervisors' => 'S', 'fac' => 'E', 'faculty' => 'E',
               'mentor' => 'M', 'mentors' => 'M', 'alum' => 'A', 'alumni' => 'A');
    return isset($m[$s]) ? $m[$s] : '';
}
function tjp_roles($d) {
    $r = (string) (isset($d['roles']) ? $d['roles'] : '');
    $x = isset($d['extra']) ? (array) $d['extra'] : array();
    $out = array();
    /* رجیستری نقش نویسنده‌های مجله (اسنیپت 504048): سردبیر، منتور و دانش‌آموخته از همان‌جا هم می‌آید */
    $reg = '';
    if (!empty($d['users']) && function_exists('tajrobeh_author_roles')) {
        $u = get_userdata((int) $d['users'][0]); $map = tajrobeh_author_roles();
        if ($u && isset($map[$u->user_nicename])) $reg = (string) $map[$u->user_nicename][0];
    }
    if (strpos($reg, 'سردبیر') !== false) $x[] = 'سردبیر';
    if (strpos($reg, 'منتور') !== false) $d['mentor'] = 1;
    if (strpos($reg, 'دانش‌آموخته') !== false && empty($d['alum'])) $d['alum'] = 'مدرسهٔ تجربه';
    /* هر کارتی که این آدم در سایت دارد، نقشش را هم روی صفحه‌اش نشان می‌دهد (مثلاً کارت سوپروایزر صفحهٔ اصلی) */
    foreach ((isset($d['appear']) ? (array) $d['appear'] : array()) as $ap) {
        $s0 = tjp_secrole(isset($ap['sec']) ? $ap['sec'] : '');
        if (($s0 === 'T' || $s0 === 'S' || $s0 === 'E') && strpos($r, $s0) === false) $r .= $s0;
        if ($s0 === 'M') $d['mentor'] = 1;
        if ($s0 === 'A' && empty($d['alum'])) $d['alum'] = 'مدرسهٔ تجربه';
    }
    if (strpos($r, 'T') !== false) $out['ther'] = 'تراپیست کلینیک تجربه';
    if (strpos($r, 'S') !== false) $out['sup'] = 'سوپروایزر';
    if (strpos($r, 'E') !== false) $out['edu'] = 'استاد مدرسهٔ تجربه';
    if (!empty($d['mentor'])) $out['mnt'] = 'منتور مدرسه';
    if (in_array('سردبیر', $x, true)) $out['ed'] = 'سردبیر مجلهٔ تجربه';
    if (!empty($d['users'])) $out['pen'] = 'نویسندهٔ مجله';
    if (!empty($d['alum'])) $out['alum'] = 'دانش‌آموختهٔ مدرسه';
    return $out;
}

/* فایل قبلیِ همین صفحه را پاک می‌کند تا رسانهٔ یتیم نماند؛ فقط فایل‌های خود صفحه‌ها (tjl-team-* و tjl-voice-team-*) */
function tjp_drop_media($url) {
    $url = (string) $url;
    if (!preg_match('~/tjl-(voice-)?team-[a-f0-9]{8}[^/]*$~', $url)) return;
    $aid = attachment_url_to_postid(home_url(wp_make_link_relative($url)));
    if ($aid) wp_delete_attachment($aid, true);
}

function tjp_pills($s) {
    $o = '';
    foreach (array_filter(array_map('trim', preg_split('/[،,]/u', (string) $s))) as $x) $o .= '<span>' . esc_html($x) . '</span>';
    return $o;
}

/* ───── رویکردها: خانواده، توضیح یک‌جمله‌ای ساده و صفحهٔ «بیشتر بخوانید» داخل سایت ───── */
function tjp_apx_fam() {
    return array(
        'psa' => array('روانکاوی و روان‌درمانی تحلیلی', '/approaches/psychoanalysis/', 'دربارهٔ روانکاوی'),
        'cbt' => array('درمان‌های شناختی و رفتاری', '/approaches/', 'دربارهٔ رویکردها'),
        'hum' => array('درمان‌های هیجان‌مدار و انسان‌گرا', '/approaches/', 'دربارهٔ رویکردها'),
        'sys' => array('درمان‌های سیستمی و خانواده', '/therapy/couple-therapy/', 'دربارهٔ زوج و خانواده'),
    );
}
function tjp_apx_list() {
    /* ترتیب مهم است: اول نام‌های خاص، بعد نام‌های کلی */
    return array(
        'tfp' => array('روان‌درمانی مبتنی بر انتقال (TFP)', 'psa', '/TFP|مبتنی بر انتقال/u', 'درمان تحلیلی ساختارمندی که برای دشواری‌های شخصیت ساخته شده؛ الگوهای رابطه را همان‌طور که در رابطه با درمانگر پیدا می‌شوند می‌بیند و روی آن‌ها کار می‌کند.'),
        'istdp' => array('روان‌درمانی پویشی کوتاه‌مدت فشرده (ISTDP)', 'psa', '/ISTDP|کوتاه[‌ ]?مدت/u', 'درمانی تحلیلی و فشرده‌تر که مستقیم سراغ احساس‌های پس‌زده و دفاع‌های دور آن‌ها می‌رود تا تغییر در زمان کوتاه‌تری رخ دهد.'),
        'object' => array('روابط ابژه', 'psa', '/ابژه|وینیکات|کلاین/u', 'شاخه‌ای از روانکاوی که می‌گوید تصویرهایی که از رابطه‌های اول زندگی، به‌خصوص با مراقبان، در ذهن داریم امروز هم در رابطه‌هایمان تکرار می‌شوند؛ درمان این الگوها را دیدنی و قابل تغییر می‌کند.'),
        'self' => array('سلف‌سایکولوژی', 'psa', '/سلف|کوهات|روان‌شناسی خود/u', 'شاخه‌ای از روانکاوی که روی احساس ارزشمندی و یکپارچگی «خود» تمرکز دارد و همدلی درمانگر را ابزار اصلی ترمیم می‌داند.'),
        'lacan' => array('روانکاوی لکانی', 'psa', '/لکان/u', 'روانکاوی به روایت ژاک لکان؛ به زبان، میل و آنچه در حرف‌زدن ما ناگفته می‌ماند توجه ویژه دارد.'),
        'jung' => array('روانشناسی تحلیلی یونگ', 'psa', '/یونگ/u', 'رویکرد کارل یونگ؛ با رؤیاها، نمادها و کهن‌الگوها کار می‌کند تا بخش‌های ناشناختهٔ شخصیت به هم نزدیک شوند.'),
        'modern' => array('روانکاوی مدرن و رابطه‌ای', 'psa', '/مدرن|رابطه[‌ ]?ای/u', 'روانکاوی امروزی که رابطهٔ زندهٔ درمانگر و مراجع را مرکز کار می‌داند؛ گفت‌وگومحورتر و گرم‌تر از تصویر کلاسیک روانکاوی.'),
        'classic' => array('روانکاوی کلاسیک', 'psa', '/کلاسیک|فروید/u', 'روانکاوی به شیوهٔ فروید و پیروانش: کار با خاطره‌ها، رؤیاها و کشمکش‌های درونی از راه گفت‌وگوی آزاد، معمولاً در جلسه‌های منظم و بلندمدت.'),
        'dynamic' => array('روان‌درمانی تحلیلی', 'psa', '/تحلیلی|روان[‌ ]?پویشی|روانکاو|سایکودینامیک/u', 'شکل انعطاف‌پذیرتر روانکاوی، معمولاً هفته‌ای یک جلسه و روبه‌رو؛ با همان هدف فهمیدن الگوهایی که از آن‌ها آگاه نیستیم.'),
        'schema' => array('طرحواره‌درمانی', 'cbt', '/طرحواره/u', 'الگوهای عمیقی را که از کودکی دربارهٔ خود و دیگران ساخته‌ایم پیدا می‌کند و با کار فکری، هیجانی و رفتاری کم‌کم ترمیمشان می‌کند.'),
        'dbt' => array('رفتاردرمانی دیالکتیکی (DBT)', 'cbt', '/DBT|دیالکتیک/u', 'مهارت‌های آرام‌کردن هیجان، تحمل لحظه‌های سخت و ارتباط مؤثر را قدم‌به‌قدم آموزش می‌دهد؛ به‌خصوص وقتی هیجان‌ها خیلی شدیدند.'),
        'act' => array('پذیرش و تعهد (ACT)', 'cbt', '/ACT|پذیرش و تعهد/u', 'به‌جای جنگیدن با فکر و احساس سخت، کمک می‌کند برایشان جا باز کنیم و در جهت چیزهایی که برایمان مهم است حرکت کنیم.'),
        'cbt' => array('شناختی‌رفتاری (CBT)', 'cbt', '/CBT|شناختی|رفتاری/u', 'با شناختن فکرهای خودکار و آزمودنشان در زندگی روزمره، احساس و رفتار را تغییر می‌دهد؛ ساختارمند و معمولاً کوتاه‌مدت.'),
        'eft' => array('هیجان‌مدار (EFT)', 'hum', '/هیجان[‌ ]?مدار|EFT/u', 'احساس‌ها را راهنمای تغییر می‌داند؛ در جلسه کمک می‌کند هیجان‌های دردناک تجربه و فهمیده شوند و جایشان احساس‌های تازه‌ای بنشیند. در زوج‌درمانی هم بسیار به کار می‌رود.', '/approaches/'),
        'gestalt' => array('گشتالت‌درمانی', 'hum', '/گشتالت/u', 'روی آگاهی از «اینجا و اکنون» تمرکز دارد و با تجربهٔ مستقیم در جلسه، احساس‌ها و نیازهای نادیده‌گرفته را به آگاهی می‌آورد.'),
        'human' => array('انسان‌گرا و وجودی', 'hum', '/انسان[‌ ]?گرا|وجودی|شخص[‌ ]?محور|اگزیستانس/u', 'رابطهٔ اصیل و بی‌قضاوت با درمانگر را محور می‌داند و به پرسش‌های معنا، آزادی و انتخاب می‌پردازد.'),
        'family' => array('درمان سیستمی و خانواده', 'sys', '/سیستمی|خانواده/u', 'مشکل را در چرخه‌ای می‌بیند که آدم‌های یک خانواده یا یک زوج با هم می‌سازند و با همهٔ این رابطه کار می‌کند، نه فقط یک نفر.'),
    );
}
/* از فهرست رویکردهای خود عضو (یا خط رویکرد) تا سه رویکرد شناخته‌شده؛ اولی رویکرد اصلی است */
function tjp_apx_match($txt) {
    $out = array();
    foreach (preg_split('/\s*[،,\n]\s*/u', (string) $txt) as $part) {
        $part = trim($part);
        if ($part === '') continue;
        $hit = array();
        $at = array();
        foreach (tjp_apx_list() as $k => $a) { if (preg_match($a[2], $part, $mm, PREG_OFFSET_CAPTURE)) { $hit[$k] = $a; $at[$k] = $mm[0][1]; } }
        /* «روان‌درمانی تحلیلی» کلی است؛ فقط وقتی می‌ماند که جداگانه آمده باشد، نه در دل نام یک شاخهٔ مشخص روانکاوی */
        if (isset($hit['dynamic'])) {
            $alone = false; $L = tjp_apx_list();
            foreach (preg_split('/\s+و\s+/u', $part) as $sp0) {
                if (!preg_match($L['dynamic'][2], $sp0)) continue;
                $other = false; foreach ($L as $k2 => $a2) { if ($k2 !== 'dynamic' && $a2[1] === 'psa' && preg_match($a2[2], $sp0)) { $other = true; break; } }
                if (!$other) { $alone = true; break; }
            }
            if (!$alone) unset($hit['dynamic']);
        }
        uksort($hit, function ($x, $y) use ($at) { return $at[$x] - $at[$y]; });   /* به ترتیب نوشتهٔ خود عضو */
        foreach ($hit as $k => $a) { if (!isset($out[$k])) $out[$k] = $a; }
        if (count($out) >= 3) break;
    }
    return array_slice($out, 0, 3, true);
}
function tjp_apx_html($list) {
    $fam = tjp_apx_fam(); $h = ''; $more = array(); $pf = '';
    foreach ($list as $k => $a) {
        $f = $fam[$a[1]];
        $h .= '<div class="tjp-apx-i">' . ($a[1] !== $pf ? '<small>از خانوادهٔ ' . esc_html($f[0]) . '</small>' : '') . '<b>'; $pf = $a[1]; $h .= '' . esc_html($a[0]) . '</b><p>' . esc_html($a[3]) . '</p></div>';
        $u = isset($a[4]) ? $a[4] : $f[1];
        if (!isset($more[$u])) $more[$u] = isset($a[4]) ? 'دربارهٔ ' . preg_replace('/\s*\(.*\)$/u', '', $a[0]) : $f[2];
    }
    $m = ''; foreach ($more as $u => $l) $m .= '<a href="' . esc_url($u) . '">' . esc_html($l) . tjp_ic('arrow') . '</a>';
    return $h . ($m ? '<div class="tjp-apx-m"><span>اگر خواستید، بیشتر بخوانید:</span>' . $m . '</div>' : '');
}

/* رزومهٔ سبک (متن پرداخت‌شدهٔ تیم): «## بخش» و «- مورد · سال» */
function tjp_cv($s) {
    $out = ''; $open = false; $n = 0; $heads = array();
    foreach (preg_split('/\r?\n/u', (string) $s) as $ln) {
        $ln = trim($ln);
        if ($ln === '') continue;
        if (preg_match('/^#+\s*(.+)$/u', $ln, $m)) {
            if ($open) $out .= '</ul></div>';
            $heads[] = tjp_clean($m[1]);
            $out .= '<div class="tjp-cv-s"><h4>' . tjp_e($m[1]) . '</h4><ul>'; $open = true; continue;
        }
        if (!$open) { $out .= '<div class="tjp-cv-s"><ul>'; $open = true; }
        $parts = explode(' · ', tjp_clean(preg_replace('/^[-•*]\s*/u', '', $ln)));
        $when = (count($parts) > 1 && preg_match('/[0-9۰-۹]/u', end($parts)) && mb_strlen(end($parts)) < 26) ? array_pop($parts) : '';
        $out .= '<li><span>' . esc_html(implode(' · ', $parts)) . '</span>' . ($when !== '' ? '<small>' . esc_html(tjp_fa($when)) . '</small>' : '') . '</li>'; $n++;
    }
    if ($open) $out .= '</ul></div>';
    return array('html' => $out, 'heads' => $heads, 'n' => $n);
}

function tjp_render($id) {
    $d = tjp_data($id);
    $a = tjp_home_assets();
    $name = get_the_title($id);
    $first = tjp_first($name);
    $roles = tjp_roles($d);
    $isT = isset($roles['ther']);
    $isEdu = isset($roles['sup']) || isset($roles['edu']);
    $prim = $isT ? 'ther' : 'edu';
    $url = get_permalink($id);
    $f = function ($k) use ($d) { return isset($d[$k]) ? trim((string) $d[$k]) : ''; };
    $title = tjp_clean($f('title'));
    $sp = tjp_clean($f('sp'));
    $city = preg_replace('/،\s*([^،]+)$/u', ' و $1', tjp_clean($f('city')));
    $mode = str_replace('، ', ' و ', tjp_clean($f('mode')));
    $focus = tjp_clean($f('focus'));
    $groups = tjp_clean($f('groups'));
    $langs = tjp_clean($f('langs'));
    $ages = tjp_clean($f('ages'));
    $since = (int) tjp_en($f('since'));
    $years = $since > 1330 ? max(0, tjp_jyear() - $since) : 0;
    $hero = isset($d['img']['hero']) ? $d['img']['hero'] : '';
    $heroS = isset($d['img']['hero_s']) ? $d['img']['hero_s'] : '';
    $avatar = isset($d['img']['avatar']) ? $d['img']['avatar'] : $hero;
    $voice = isset($d['voice']['url']) ? $d['voice'] : null;
    $vt = ($voice && !empty($voice['t'])) ? tjp_clean($voice['t']) : 'معرفی صوتی';

    /* ── هیرو ── */
    $chips = '';
    foreach ($roles as $k => $label) {
        $href = array('ther' => '#work', 'sup' => '#supervision', 'edu' => '#teach', 'pen' => '#writing', 'ed' => '#writing', 'alum' => '#path', 'mnt' => '#path');
        $chips .= '<a class="tjp-role r-' . $k . '" href="' . $href[$k] . '"><i></i>' . esc_html($label) . '</a>';
    }
    $facts = '';
    if ($city) $facts .= '<li>' . tjp_ic('pin') . tjp_e($city) . '</li>';
    if ($mode) $facts .= '<li>' . tjp_ic('screen') . 'جلسه ' . tjp_e($mode) . '</li>';
    if ($langs) $facts .= '<li>' . tjp_ic('lang') . tjp_e($langs) . '</li>';
    if ($years >= 1) $facts .= '<li>' . tjp_ic('clock') . tjp_fa($years) . ' سال کار بالینی</li>';
    $badges = '<span class="tjb tjb-vf">تأییدشدهٔ تجربه</span>';
    if (strpos($f('supervision'), 'بله') === 0) $badges .= '<span class="tjb tjb-svz">تحت سوپرویژن</span>';
    if (!empty($d['mentor'])) $badges .= '<span class="mnt tjb">منتور</span>';
    $tgUrl = 'https://t.me/tajrobehlife_bot?start=tm-' . rawurlencode((string) get_post_field('post_name', $id));
    $cta1 = $isT ? '<a class="btn btn-brand" href="' . esc_url($tgUrl) . '" rel="noopener">' . tjp_ic('tg') . 'رزرو جلسهٔ معارفه</a>'
                 : (isset($roles['sup']) ? '<a class="btn btn-brand" href="#supervision">درخواست سوپرویژن</a>'
                                         : '<a class="btn btn-brand" href="#teach">درس‌ها و دوره‌ها</a>');
    $cta2 = $voice ? '<a class="btn btn-ghost" href="#voice">' . tjp_ic('play') . 'شنیدن صدا</a>' : '<a class="btn btn-ghost" href="#work">روش کار</a>';
    $quote = $f('headline') ? '<p class="lede tjp-quote">' . tjp_e($f('headline')) . '</p>' : ($sp ? '<p class="lede">' . tjp_e($sp) . '</p>' : '');
    $pic = $hero ? '<img src="' . esc_url($hero) . '"' . ($heroS ? ' srcset="' . esc_url($heroS) . ' 360w, ' . esc_url($hero) . ' 720w" sizes="(max-width:760px) 220px, 300px"' : '')
         . ' width="720" height="900" alt="' . esc_attr($name . ($title ? '، ' . $title : '')) . '" fetchpriority="high" decoding="async">' : '';
    /* بی‌عکس: اگر ویس دارد، پوستر صدا («شنیدن، پیش از دیدن»)، وگرنه حروف اول نام روی زمینهٔ برند */
    if (!$hero) {
        $np = preg_split('/\s+/u', trim(preg_replace('/^\s*دکتر\s+/u', '', $name)));
        $ini = mb_substr($np[0], 0, 1) . (count($np) > 1 ? '<i>·</i>' . mb_substr(end($np), 0, 1) : '');
        $pic = '<div class="tjp-poster' . ($voice ? ' is-voice' : '') . '">' . ($voice
            ? '<button type="button" class="tjp-bigplay" data-go="voice" aria-label="پخش معرفی صوتی">' . tjp_ic('play') . '</button><span class="tjp-bars">' . str_repeat('<i></i>', 15) . '</span><b>معرفی صوتی</b><small>' . tjp_fa((int) round($voice['dur'])) . ' ثانیه، با صدای خودش</small>'
            : '<span class="tjp-ini">' . $ini . '</span><small>' . esc_html($title ? $title : 'تیم تجربه') . '</small>') . '</div>';
    }
    $listen = ($voice && $hero) ? '<button type="button" class="tjp-listen" data-go="voice">' . '<span class="tjp-wave"><i></i><i></i><i></i><i></i></span>' . tjp_fa((int) round($voice['dur'])) . ' ثانیه · ' . esc_html($vt) . '</button>' : '';

    $h = '<section class="hero tjp-hero' . ($hero ? '' : ' tjp-nopic') . '"><div class="wrap"><div class="copy">'
       . '<nav class="tjp-crumb" aria-label="مسیر"><a href="/">خانه</a><a href="/' . TJP_SLUG . '/">تیم تجربه</a><span>' . esc_html($name) . '</span></nav>'
       . '<div class="tjp-roles">' . $chips . '</div>'
       . '<h1>' . esc_html($name) . '</h1>'
       . ($title ? '<p class="tjp-title">' . esc_html($title) . '</p>' : '')
       . $quote
       . ($facts ? '<ul class="tjp-facts">' . $facts . '</ul>' : '')
       . '<div class="tjp-badges">' . $badges . '</div>'
       . '<div class="ctas">' . $cta1 . $cta2 . '</div>'
       . '</div>'
       . ($hero ? '<div class="art tjp-portrait"><span class="tjp-dots" aria-hidden="true"></span><div class="fr">' . $pic . '</div>' . $listen . '</div>' : '')
       . '</div></section>';

    $alt = false;
    $sec = function ($id, $cls, $inner) use (&$alt) { $alt = !$alt; return '<section id="' . $id . '" class="tjp-sec ' . ($alt ? 'tjp-alt ' : '') . $cls . '"><div class="wrap">' . $inner . '</div></section>'; };
    $head = function ($eb, $h2, $lede = '') { return '<div class="center rv"><span class="eyebrow">' . esc_html($eb) . '</span><h2 class="h2">' . esc_html($h2) . '</h2>' . ($lede ? '<p class="lede">' . esc_html($lede) . '</p>' : '') . '</div>'; };

    /* ── روش کار (تراپیست یا استاد) ── */
    /* یک کارت آرام با خانه‌های هم‌قد؛ توضیح رویکرد با آیکن کوچک «i» در همان کارت باز می‌شود (همان آکاردئون پرسش‌های رایج) */
    $side = ''; $nKv = 0;
    $kv = function ($ic, $k, $v, $extra = '', $cls = '') use (&$nKv) { $nKv++; return '<div class="tjp-kv-c' . $cls . '"><span class="tjp-kv-k">' . tjp_ic($ic) . $k . $extra . '</span><span class="tjp-kv-v">' . tjp_e($v) . '</span></div>'; };
    $apx = tjp_apx_match($f('approach') ? $f('approach') : $sp);
    if ($sp) $side .= $kv('book', 'رویکرد', $sp, $apx ? '<button type="button" class="tjp-i" aria-controls="tjp-apx" aria-expanded="false" aria-label="این رویکرد چیست؟" title="این رویکرد چیست؟"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="5.8" r="1.25" fill="currentColor"/></svg></button>' : '', ' is-apx');
    if ($ages) $side .= $kv('users', 'گروه مراجعان', $ages);
    if ($langs) $side .= $kv('lang', 'زبان جلسه', $langs);
    if ($mode) $side .= $kv('screen', 'شکل جلسه', $mode);
    if ($city) $side .= $kv('pin', 'محل کار', $city);
    if ($side && $sp && $apx) $side .= '<details class="tjp-apx" id="tjp-apx"><summary tabindex="-1" aria-hidden="true"></summary><div class="ans"><div class="tjp-apx-in">' . tjp_apx_html($apx) . '</div></div></details>';
    $body = '';

    /* ── جایگاه در هیئت علمی و دپارتمان (صفحهٔ استاد) ── */
    $bRaw = isset($d['board']) ? $d['board'] : '';
    $bItems = is_array($bRaw) ? $bRaw : array();
    if (!$bItems) {
        if (is_string($bRaw) && trim($bRaw) !== '') $bItems[] = array('k' => 'هیئت علمی', 'v' => $bRaw, 'i' => 'check');
        if ($f('dept')) $bItems[] = array('k' => 'دپارتمان', 'v' => $f('dept'), 'i' => 'users');
    }
    $bd = '';
    foreach ($bItems as $bi) {
        if (empty($bi['v'])) continue;
        $bd .= '<div>' . tjp_ic(isset($bi['i']) ? $bi['i'] : 'check') . '<b>' . tjp_e(isset($bi['k']) ? $bi['k'] : '') . '</b><span>' . tjp_e($bi['v']) . '</span></div>';
    }
    if ($bd) $body .= $sec('board', 'tjp-board', $head('مدرسهٔ تجربه', 'جایگاه در هیئت علمی و دپارتمان') . '<div class="tjp-grid rv">' . $bd . '</div>');

    if ($f('method')) {
        $body .= $sec('work', 'tjp-work', $head($isT ? 'روش کار' : 'نگاه و روش', $isT ? 'درمان چطور پیش می‌رود' : 'نگاه به درمان و آموزش')
            . ($side ? '<div class="tjp-kv rv" style="--n:' . $nKv . '">' . $side . '</div>' : '')
            . '<div class="tjp-prose rv">' . tjp_paras($f('method')) . '</div>'
            . (($focus || $groups) ? '<dl class="tjp-topics rv">'
                . ($focus ? '<div><dt>موضوع‌های اصلی کار</dt><dd>' . tjp_pills($focus) . '</dd></div>' : '')
                . ($groups ? '<div><dt>آشنایی ویژه</dt><dd>' . tjp_pills($groups) . '</dd></div>' : '')
                . '</dl>' : '')
            . ($isT && $f('first') ? '<div class="tjp-first rv"><span class="tjp-tag">' . tjp_ic('chat') . 'جلسهٔ اول</span><img class="tjp-first-art" src="/wp-content/uploads/2026/09/tjl-cut-armchair.webp" alt="" width="136" height="148" loading="lazy" decoding="async">' . tjp_paras($f('first')) . '</div>' : ''));
    }

    /* ── صدا ── */
    if ($voice) {
        $body .= $sec('voice', 'tjp-voice', '<div class="center rv"><span class="eyebrow">صدا</span><h2 class="h2">' . esc_html($vt === 'معرفی صوتی' ? 'معرفی با صدای خودش' : $vt . '، با صدای خودش') . '</h2></div>'
            . '<div class="vp rv" data-parts="' . esc_attr($voice['url'] . '|' . round((float) $voice['dur'], 2)) . '">'
            . ($avatar ? '<img class="av" src="' . esc_url($avatar) . '" alt="' . esc_attr($name) . '" loading="lazy" width="64" height="64">' : '')
            . '<div class="m"><b>' . esc_html($name) . '</b><small>' . esc_html($vt) . ' · ' . tjp_fa((int) round($voice['dur'])) . ' ثانیه</small>'
            . '<div class="row"><button type="button" aria-label="پخش"></button><div class="bar" role="slider" aria-label="پیشروی"><i></i></div><span class="t">۰:۰۰</span></div></div></div>');
    }

    /* ── استاد و سوپروایزر ── */
    if ($isEdu) {
        $teach = tjp_lines($f('teach'));
        $pages = isset($d['appear']) ? (array) $d['appear'] : array();
        $rows = '';
        $seenPg = array();
        foreach ($pages as $p) {
            /* فقط برگه‌هایی که کارتش در بخش استادهای یک برنامه است؛ فهرست سوپروایزرها در بخش سوپرویژن آمده */
            if (empty($p['url']) || (int) $p['page'] === TJP_HOME_ID || isset($seenPg[(int) $p['page']])) continue;
            if (tjp_secrole(isset($p['sec']) ? $p['sec'] : '') !== 'E') continue;
            $seenPg[(int) $p['page']] = 1;
            /* فقط صفحهٔ دوره‌ها؛ خود مدرسه و کامیونیتی و انجمن‌ها دوره نیستند */
            $pgSlug = (string) get_post_field('post_name', (int) $p['page']);
            if (in_array($pgSlug, array('school', 'community', 'associations', 'faculty', TJP_SLUG), true)) continue;
            $ttl = preg_replace('/\s*(·|؛|\|).*$/u', '', tjp_clean($p['title']));
            $rows .= '<a class="svc-row" href="' . esc_url(wp_make_link_relative($p['url'])) . '"><div><b>' . esc_html($ttl) . '</b><span>استاد این دوره</span></div>' . tjp_ic('arrow') . '</a>';
        }
        $li = ''; foreach ($teach as $t) $li .= '<li>' . tjp_e($t) . '</li>';
        /* سیلابس‌ها با نام منبع اصلی؛ منبع لاتین در span.ltr می‌نشیند */
        $syl = '';
        foreach ((isset($d['syllabus']) && is_array($d['syllabus']) ? $d['syllabus'] : array()) as $s0) {
            if (empty($s0['t'])) continue;
            $src = isset($s0['src']) ? trim((string) $s0['src']) : '';
            $srcH = $src === '' ? '' : (preg_match('/[\x{0600}-\x{06FF}]/u', $src) ? tjp_e($src) : '<span class="ltr">' . esc_html($src) . '</span>');
            $syl .= '<li><b>' . tjp_e($s0['t']) . '</b>'
                 . (!empty($s0['n']) ? '<span class="tjp-syl-n">' . tjp_e($s0['n']) . '</span>' : '')
                 . ($srcH ? '<small>' . tjp_ic('book') . 'منبع: ' . $srcH . '</small>' : '') . '</li>';
        }
        $two = '';
        if ($li) {
            $two = '<div class="tjp-two rv"><ul class="tjp-list">' . $li . '</ul>';
            if ($rows) { $two .= '<div class="svc-list tjp-rows">' . $rows . '</div>'; }
            $two .= '</div>';
        } elseif ($rows) {
            $two = '<div class="svc-list tjp-rows tjp-rows-w rv">' . $rows . '</div>';
        }
        if ($li || $rows || $syl) {
            $body .= $sec('teach', 'tjp-teach', $head('کلاس درس', $syl ? 'سیلابس‌ها و دوره‌ها' : 'درس‌ها و دوره‌ها')
                . ($syl ? '<ul class="tjp-syl rv">' . $syl . '</ul>' : '') . $two);
        }
        if (isset($roles['sup'])) {
            $acc = tjp_clean($f('supaccept'));
            $full = $acc && strpos($acc, 'ظرفیت ندارم') !== false;
            $open = $acc && !$full;
            $body .= $sec('supervision', 'tjp-sup', '<div class="tjp-supbox rv"><div><span class="eyebrow">سوپرویژن</span><h2 class="h2">'
                . esc_html($open ? 'سوپرویژن ' . preg_replace('/^فقط\s*/u', '', $acc) : 'سوپروایزر مدرسه و کلینیک تجربه') . '</h2>'
                . '<p class="lede">' . esc_html($full ? 'الان ظرفیت سوپرویژن تازه ندارد. برای خبر از ظرفیت‌های بعدی، در بات تجربه عضو مدرسه شوید.' : 'اگر درمانگر یا دانشجوی مدرسه‌اید، در بات تجربه به مدرسه وصل شوید و درخواستتان را بنویسید؛ مدرسه ظرفیت و زمان را هماهنگ می‌کند.') . '</p></div>'
                . '<div class="ctas"><a class="btn btn-brand" href="https://t.me/tajrobehlife_bot?start=edu" rel="noopener">وصل‌شدن به مدرسه در بات</a><a class="btn btn-ghost" href="/school/">مدرسهٔ تجربه</a></div></div>');
        }
    }

    /* ── آثار و ترجمه‌ها: نام اثر، نویسندهٔ اصلی، ناشر ── */
    $wk = '';
    foreach ((isset($d['works']) && is_array($d['works']) ? $d['works'] : array()) as $w0) {
        if (empty($w0['t'])) continue;
        $wk .= '<li><b>' . tjp_e($w0['t']) . '</b>'
             . (!empty($w0['a']) ? '<span>' . tjp_e($w0['a']) . '</span>' : '')
             . (!empty($w0['p']) ? '<small>' . tjp_ic('book') . tjp_e($w0['p']) . '</small>' : '') . '</li>';
    }
    if ($wk) $body .= $sec('works', 'tjp-works', $head('کتاب‌ها', 'آثار و ترجمه‌ها', $f('works_note')) . '<ul class="tjp-wl rv">' . $wk . '</ul>');

    /* ── مسیر حرفه‌ای ── */
    $path = '';
    if ($f('degree')) $path .= '<div>' . tjp_ic('cap') . '<b>تحصیلات</b><span>' . tjp_e($f('degree')) . '</span></div>';
    if ($since > 1330) $path .= '<div>' . tjp_ic('clock') . '<b>کار بالینی</b><span>از ' . tjp_fa($since) . ($years >= 1 ? '؛ ' . tjp_fa($years) . ' سال' : '') . '</span></div>';
    if (strpos($f('supervision'), 'بله') === 0) $path .= '<div>' . tjp_ic('eye') . '<b>سوپرویژن</b><span>' . tjp_e(tjp_3p($f('supervision'))) . '</span></div>';
    if (strpos($f('personal'), 'نگویم') === false && $f('personal')) $path .= '<div>' . tjp_ic('heart') . '<b>تراپی شخصی</b><span>' . tjp_e(tjp_3p($f('personal'))) . '</span></div>';
    if (!empty($d['alum'])) $path .= '<div>' . tjp_ic('users') . '<b>مدرسهٔ تجربه</b><span>دانش‌آموختهٔ ' . tjp_e($d['alum']) . '</span></div>';
    $tr = ''; foreach (tjp_lines($f('trainings')) as $t) $tr .= '<li>' . tjp_e($t) . '</li>';
    $cr = ''; foreach (tjp_lines($f('career')) as $t) $cr .= '<li>' . tjp_e($t) . '</li>';
    $cvH = '';
    $cvx = $f('resume') ? tjp_cv($f('resume')) : array('n' => 0);
    if ($cvx['n']) {
        $cvH = '<details class="tjp-cv rv"><summary><span class="tjp-cv-ic">' . tjp_ic('file') . '</span><span class="tjp-cv-t"><b>رزومهٔ کامل</b><small>'
             . esc_html(implode('، ', array_slice($cvx['heads'], 0, 4))) . '</small></span><span class="tjp-cv-go">' . tjp_ic('arrow') . '</span></summary>'
             . '<div class="ans"><div class="tjp-cv-b">' . $cvx['html'] . '</div></div></details>';
    }
    /* قانون یاسر: هیچ لینک بیرونی روی صفحه نیست؛ لینک رزومه (مثلاً لینکدین) فقط نگه داشته می‌شود */
    if ($path || $tr || $cr || $cvH) {
        $body .= $sec('path', 'tjp-path', $head('مسیر حرفه‌ای', 'آموزش و پشتوانهٔ حرفه‌ای')
            . ($path ? '<div class="tjp-grid rv">' . $path . '</div>' : '')
            . ($cr ? '<div class="tjp-card tjp-learn rv"><h3>' . tjp_ic('cap') . 'سوابق دانشگاهی و اجرایی</h3><ul class="tjp-list">' . $cr . '</ul></div>' : '')
            . ($tr ? '<div class="tjp-card tjp-learn rv"><h3>' . tjp_ic('book') . 'آموزش‌هایی که این روزها می‌بیند</h3><ul class="tjp-list">' . $tr . '</ul></div>' : '')
            . $cvH);
    }

    /* ── نوشته‌ها ── */
    $posts = !empty($d['users']) ? get_posts(array('post_type' => 'post', 'post_status' => 'publish', 'numberposts' => 5, 'author__in' => array_map('intval', (array) $d['users']))) : array();
    /* «در رزومه هست» و مانند آن نوشته نیست؛ روی صفحه نمی‌آید */
    $other = array_values(array_filter(tjp_lines($f('articles')), function ($o) {
        $o = trim($o);
        return !preg_match('~^(https?://|www\.)~i', $o) ? !(mb_strlen($o) < 45 && preg_match('/رزومه|^(ندارم|ندارد|خیر|نه|فعلا نه|فعلاً نه|[-.…]+)$/u', $o)) : true;
    }));
    $hasTxt = false; foreach ($other as $o0) { if (!preg_match('~^(https?://|www\.)~i', trim($o0))) { $hasTxt = true; break; } }
    if ($posts || $hasTxt) {
        $cards = '';
        foreach (array_slice($posts, 0, 4) as $p) {
            $img = get_the_post_thumbnail_url($p->ID, 'medium');
            $cards .= '<a class="tjp-mi" href="' . esc_url(wp_make_link_relative(get_permalink($p))) . '">'
                . ($img ? '<img src="' . esc_url($img) . '" alt="" loading="lazy" width="112" height="80">' : '<span class="tjp-mi-ph">' . tjp_ic('pen') . '</span>')
                . '<span class="tjp-mi-t"><b>' . esc_html(get_the_title($p)) . '</b><small>' . esc_html(tjp_cut(get_the_excerpt($p), 90)) . '</small></span></a>';
        }
        $mainUser = !empty($d['users']) ? (int) $d['users'][0] : 0;
        $more = $mainUser ? '<a class="tjp-more" href="' . esc_url(wp_make_link_relative(get_author_posts_url($mainUser))) . '">همهٔ نوشته‌ها در مجلهٔ تجربه' . tjp_ic('arrow') . '</a>' : '';
        $ol = '';
        $items = array();
        foreach ($other as $o) {
            $isUrl = preg_match('~^(https?://|www\.)~i', $o);
            if ($isUrl) {
                $u = preg_match('~^https?://~i', $o) ? $o : 'https://' . $o;
                $last = count($items) - 1;
                if ($last >= 0 && $items[$last]['u'] === '') { $items[$last]['u'] = $u; continue; }
                $items[] = array('t' => '', 'u' => $u);
            } else {
                $items[] = array('t' => $o, 'u' => '');
            }
        }
        foreach ($items as $it) {
            if ($it['t'] === '') continue;   /* فقط لینک بدون عنوان: چیزی نشان داده نمی‌شود (لینک بیرونی نداریم) */
            $ol .= '<li>' . tjp_e(tjp_cut($it['t'], 140)) . '</li>';
        }
        $body .= $sec('writing', 'tjp-writing', $head('نوشته‌ها', $posts ? 'در مجلهٔ تجربه' : 'نوشته‌ها و ترجمه‌ها')
            . ($cards ? '<div class="tjp-mag rv">' . $cards . '</div>' . ($more ? '<div class="tjp-morew">' . $more . '</div>' : '') : '')
            . ($ol ? '<div class="tjp-card tjp-learn rv"><h3>' . tjp_ic('pen') . 'کتاب‌ها و نوشته‌های دیگر</h3><ul class="tjp-list">' . $ol . '</ul></div>' : ''));
    }

    /* ── پایان صفحه: نوار کوچک «تیم تجربه» با چند چهره، به‌جای فهرست هم‌رویکردها ── */
    $faces = ''; $nf = 0;
    foreach (get_posts(array('post_type' => 'tj_person', 'post_status' => 'publish', 'numberposts' => 12, 'exclude' => array($id), 'orderby' => 'rand')) as $p) {
        $pd = tjp_data($p->ID);
        $im = isset($pd['img']['avatar']) ? $pd['img']['avatar'] : '';
        if (!$im || $nf >= 5) continue;
        $faces .= '<img src="' . esc_url($im) . '" alt="' . esc_attr(get_the_title($p)) . '" width="44" height="44" loading="lazy">'; $nf++;
    }
    $teamband = '<section class="tjp-teamband"><div class="wrap"><a class="tjp-tb rv" href="/' . TJP_SLUG . '/">'
        . ($faces ? '<span class="tjp-faces">' . $faces . '</span>' : '')
        . '<span class="tjp-tbt"><b>تیم تجربه</b><small>درمانگرها، استادها و سوپروایزرهای مرکز تجربه زندگی را ببینید</small></span>'
        . '<span class="tjp-tbgo">' . tjp_ic('arrow') . '</span></a></div></section>';

    /* ── پرسش‌ها ── */
    $faq = array();
    if ($isT) {
        if ($mode || $city) $faq[] = array('جلسه‌ها حضوری است یا آنلاین؟', $mode ? 'جلسه‌ها ' . $mode . ' برگزار می‌شود' . ($city ? '؛ محل کار در ' . $city . ' است.' : '.') : 'محل کار در ' . $city . ' است. شکل جلسه، حضوری یا آنلاین، با پذیرش هماهنگ می‌شود.');
        if ($langs) $faq[] = array('جلسه به چه زبانی برگزار می‌شود؟', 'زبان جلسه: ' . $langs . '.');
        if ($ages) $faq[] = array('با چه گروه‌هایی کار می‌شود؟', 'گروه‌های مراجع: ' . $ages . '.');
        if ($groups) $faq[] = array('آشنایی ویژه با چه گروه‌هایی دارد؟', 'در کنار کار با همهٔ مراجعان، آشنایی و تجربهٔ ویژه با این گروه‌ها: ' . $groups . '.');
        $faq[] = array('چطور می‌توانم وقت بگیرم؟', 'جلسهٔ معارفه در بات تلگرام تجربه رزرو می‌شود و ثبت‌نام لازم ندارد؛ وقت را از میان وقت‌های آزاد خودتان انتخاب می‌کنید. اگر ترجیح می‌دهید، با فرم پایین همین صفحه درخواست تماس بدهید تا همکاران پذیرش هماهنگ کنند. معارفه رایگان است و حدود بیست دقیقه طول می‌کشد.');
        if (strpos($f('supervision'), 'بله') === 0) $faq[] = array('کار بالینی زیر نظر سوپروایزر است؟', 'بله؛ ' . tjp_3p($f('supervision')) . (strpos($f('personal'), 'الان') === 0 ? ' و در تراپی شخصی هم هست.' : '.') . ' سوپرویژن و تراپی شخصی از معیارهای بالینی تجربه برای درمانگرهاست.');
    }
    if (isset($roles['sup'])) $faq[] = array('چطور می‌توانم سوپرویژن بگیرم؟', 'از راه مدرسهٔ تجربه. در بات تجربه به مدرسه وصل شوید و درخواست سوپرویژن را بنویسید؛ مدرسه ظرفیت و زمان را هماهنگ می‌کند.');
    $faqH = '';
    foreach ($faq as $q) $faqH .= '<details><summary>' . tjp_e($q[0]) . '</summary><div class="ans"><p>' . tjp_e($q[1]) . '</p></div></details>';
    if ($faqH) $body .= '<section class="faq" id="faq"><div class="wrap"><div class="center rv"><span class="eyebrow">پرسش‌های رایج</span><h2 class="h2">' . ($isT ? 'دربارهٔ جلسه‌ها' : 'دربارهٔ سوپرویژن') . '</h2></div><div class="faq-list rv">' . $faqH . '</div></div></section>';

    /* ── دعوت پایانی ── */
    if ($isT) {
        $form = do_shortcode('[fluentform id="7"]');
        $body .= '<section class="tjp-sec tjp-book" id="book"><div class="wrap"><div class="center rv"><span class="eyebrow">شروع کار</span><h2 class="h2">درخواست جلسهٔ معارفه</h2>'
               . '<p class="lede">جلسه‌ای کوتاه و رایگان برای آشنایی و سنجیدن تناسب این همکاری.</p></div>'
               . '<div class="tjp-bk rv"><div class="tjp-bk-copy"><span class="tjp-bk-fast">' . tjp_ic('bolt') . 'سریع‌ترین راه</span>'
               . '<h3>سه ضربه تا وقت معارفه</h3>'
               . '<ol class="tjp-bk-steps"><li><b>۱</b>روز را انتخاب کنید</li><li><b>۲</b>ساعت را بزنید</li><li><b>۳</b>تأیید رزرو همان لحظه می‌رسد</li></ol>'
               . '<a class="btn btn-brand tjp-bk-go" href="' . esc_url($tgUrl) . '" rel="noopener">' . tjp_ic('tg') . 'انتخاب وقت در تلگرام</a>'
               . '<ul class="tjp-bk-facts"><li>' . tjp_ic('clock') . 'حدود بیست دقیقه</li><li>' . tjp_ic('heart') . 'رایگان</li><li>' . tjp_ic('check') . 'بدون ثبت‌نام</li></ul></div>'
               . '<div class="tjp-bk-demo" aria-hidden="true"><div class="tjp-chat">'
               . '<div class="tjp-chat-top"><span class="av">' . tjp_ic('tg') . '</span><span><b>بات تجربه</b><small>معمولاً در چند ثانیه پاسخ می‌دهد</small></span></div>'
               . '<p class="bb m1">کدام روز برای معارفه بهتان می‌خورد؟</p>'
               . '<div class="ch m2"><span>شنبه</span><span class="on o1">دوشنبه</span><span>چهارشنبه</span></div>'
               . '<p class="bb m3">این ساعت‌ها آزاد است:</p>'
               . '<div class="ch m4"><span>۱۰:۰۰</span><span class="on o2">۱۶:۲۰</span><span>۱۸:۴۰</span></div>'
               . '<p class="bb ok m5">' . tjp_ic('check') . 'رزرو شد · دوشنبه، ساعت ۱۶:۲۰</p>'
               . '</div></div></div>'
               . '<details class="tjp-call rv"><summary><span>ترجیح می‌دهید با شما تماس بگیریم؟</span><b>درخواست تماس</b></summary>'
               . '<div class="ans"><div class="tjp-call-b"><p class="tjp-ap-note">همکاران پذیرش در ساعت کاری تماس می‌گیرند و وقت معارفه را هماهنگ می‌کنند.</p>'
               . '<div class="tjp-form" data-who="' . esc_attr($name) . '">' . $form . '</div></div></div></details></div></section>';
    } else {
        $body .= '<section class="berry"><div class="wrap rv"><h2 class="h2">مدرسهٔ تجربه، یک مسیر کامل</h2><p class="lede">آموزش، سوپرویژن، تراپی شخصی و ورود به کلینیک، در یک مسیر.</p><div class="ctas"><a class="btn btn-brand" href="/school/">مدرسهٔ تجربه</a><a class="btn btn-ghost" href="/' . TJP_SLUG . '/">همهٔ تیم تجربه</a></div></div></section>';
    }

    $css = tjp_css();
    $js = '<script>(function(){var r=document.getElementById("tj2");if(!r)return;'
        . 'r.querySelectorAll("[data-go]").forEach(function(b){b.addEventListener("click",function(){var s=document.getElementById(b.getAttribute("data-go"));if(!s)return;s.scrollIntoView({behavior:"smooth",block:"center"});var p=s.querySelector(".vp button");if(p)setTimeout(function(){p.click();},500);});});'
        /* همهٔ باز و بسته‌ها (پرسش‌ها، تماس، رزومه، رویکرد) با همان آکاردئون صفحهٔ اصلی: details > summary + .ans */
        . 'var ai=r.querySelector(".tjp-i"),ad=r.querySelector("#tjp-apx");if(ai&&ad){var as=ad.querySelector("summary");ai.addEventListener("click",function(){if(ad.hasAttribute("data-anim"))return;var w=!ad.open;as.click();ai.setAttribute("aria-expanded",w?"true":"false");});}'
        . 'var f=r.querySelector(".tjp-form textarea");if(f){if(!f.value){f.value="دوست دارم با "+r.querySelector(".tjp-form").getAttribute("data-who")+" کار کنم.";}}'
        . '})();</script>';
    return '<!-- wp:html --><!-- tjp:' . TJP_VER . ' -->' . $a['style'] . $css . '<div class="tj2 alignfull tjp tjp-' . $prim . '" id="tj2">' . $h . $body . $teamband . '</div>'
         . $a['script'] . tjp_vp_js() . $js . tjp_schema($id, $d, $roles, $faq) . '<!-- /wp:html -->';
}

/* پاسخ‌های اول‌شخص پرسش‌نامه، سوم‌شخص روی صفحه */
function tjp_3p($s) {
    $s = preg_replace('/^بله،\s*/u', '', trim((string) $s));
    return strtr($s, array('سوپرویژن فردی دارم' => 'سوپرویژن فردی دارد', 'سوپرویژن گروهی دارم' => 'سوپرویژن گروهی دارد',
                           'الان در تراپی شخصی هستم' => 'این روزها در تراپی شخصی است', 'قبلاً داشته‌ام' => 'پیش‌تر تراپی شخصی داشته است'));
}

function tjp_schema($id, $d, $roles, $faq) {
    $url = get_permalink($id);
    $name = get_the_title($id);
    $home = home_url('/');
    $img = isset($d['img']['hero']) ? home_url($d['img']['hero']) : '';
    $person = array('@type' => 'Person', '@id' => $url . '#person', 'name' => $name, 'url' => $url);
    if ($img) $person['image'] = $img;
    if (!empty($d['title'])) $person['jobTitle'] = tjp_clean($d['title']);
    if (!empty($d['headline'])) $person['description'] = tjp_clean($d['headline']);
    if (!empty($d['city'])) $person['address'] = array('@type' => 'PostalAddress', 'addressLocality' => tjp_clean($d['city']));
    if (!empty($d['langs'])) $person['knowsLanguage'] = array_values(array_filter(array_map('trim', preg_split('/[،,]/u', $d['langs']))));
    $about = array(); if (!empty($d['sp'])) $about[] = tjp_clean($d['sp']);
    if (!empty($d['focus'])) foreach (preg_split('/[،,]/u', $d['focus']) as $x) { $x = trim(tjp_clean($x)); if ($x) $about[] = $x; }
    if ($about) $person['knowsAbout'] = $about;
    $person['worksFor'] = array('@type' => 'Organization', 'name' => 'مرکز تجربه زندگی', 'url' => $home);
    $alma = array();
    if (!empty($d['alum'])) $alma[] = array('@type' => 'EducationalOrganization', 'name' => 'مدرسهٔ تجربه زندگی', 'url' => home_url('/school/'));
    if (!empty($d['alma'])) foreach ((array) $d['alma'] as $am) { $am = trim(tjp_clean($am)); if ($am !== '') $alma[] = array('@type' => 'CollegeOrUniversity', 'name' => $am); }
    if ($alma) $person['alumniOf'] = count($alma) === 1 ? $alma[0] : $alma;
    if (!empty($d['board'])) $person['memberOf'] = array('@type' => 'Organization', 'name' => 'هیئت علمی مدرسهٔ تجربه', 'url' => home_url('/school/'));
    if (!empty($d['degree'])) $person['hasCredential'] = array('@type' => 'EducationalOccupationalCredential', 'name' => tjp_clean($d['degree']));
    $same = array();
    if (!empty($d['users'])) $same[] = get_author_posts_url((int) $d['users'][0]);
    if ($same) $person['sameAs'] = array_values(array_unique($same));
    $yoast = defined('WPSEO_VERSION');
    $g = $yoast ? array($person) : array(
        array('@type' => 'ProfilePage', '@id' => $url . '#profile', 'url' => $url, 'name' => $name, 'inLanguage' => 'fa-IR',
              'dateModified' => get_post_modified_time('c', true, $id), 'mainEntity' => array('@id' => $url . '#person'),
              'breadcrumb' => array('@id' => $url . '#bc'), 'isPartOf' => array('@type' => 'WebSite', 'url' => $home, 'name' => 'مرکز تجربه زندگی')),
        $person,
        array('@type' => 'BreadcrumbList', '@id' => $url . '#bc', 'itemListElement' => array(
            array('@type' => 'ListItem', 'position' => 1, 'name' => 'خانه', 'item' => $home),
            array('@type' => 'ListItem', 'position' => 2, 'name' => 'تیم تجربه', 'item' => home_url('/' . TJP_SLUG . '/')),
            array('@type' => 'ListItem', 'position' => 3, 'name' => $name, 'item' => $url))),
    );
    if (!empty($d['voice']['url'])) $g[] = array('@type' => 'AudioObject', 'name' => (!empty($d['voice']['t']) ? tjp_clean($d['voice']['t']) : 'معرفی') . '، با صدای ' . $name, 'contentUrl' => home_url($d['voice']['url']),
                                                 'encodingFormat' => !empty($d['voice']['mp3']) ? 'audio/mpeg' : 'audio/ogg', 'duration' => 'PT' . (int) round($d['voice']['dur']) . 'S', 'about' => array('@id' => $url . '#person'));
    if ($faq) {
        $q = array(); foreach ($faq as $x) $q[] = array('@type' => 'Question', 'name' => tjp_clean($x[0]), 'acceptedAnswer' => array('@type' => 'Answer', 'text' => tjp_clean($x[1])));
        $g[] = array('@type' => 'FAQPage', '@id' => $url . '#faq', 'mainEntity' => $q);
    }
    return '<script type="application/ld+json">' . wp_json_encode(array('@context' => 'https://schema.org', '@graph' => $g), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
}

function tjp_vp_js() {
    return '<script>(function(){var fa=function(n){return String(n).replace(/[0-9]/g,function(x){return "۰۱۲۳۴۵۶۷۸۹"[x];});};function fmt(s){s=Math.max(0,Math.floor(s||0));return fa(Math.floor(s/60))+":"+fa(("0"+(s%60)).slice(-2));}'
        . 'document.querySelectorAll("#tj2 .vp").forEach(function(p){var parts=p.getAttribute("data-parts").split(",").map(function(x){var a=x.split("|");return {u:a[0],d:parseFloat(a[1])||0};});var total=parts.reduce(function(a,b){return a+b.d;},0);var idx=0,a=new Audio();a.preload="none";var btn=p.querySelector("button"),bar=p.querySelector(".bar"),fill=bar.querySelector("i"),t=p.querySelector(".t");var PLAY=\'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>\',PAUSE=\'<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>\';function off(i){var s=0;for(var k=0;k<i;k++)s+=parts[k].d;return s;}function load(i,seek){idx=i;a.src=parts[i].u;if(seek){a.addEventListener("loadedmetadata",function h(){a.currentTime=seek;a.removeEventListener("loadedmetadata",h);});}}'
        . 't.textContent=fmt(0)+" / "+fmt(total);btn.innerHTML=PLAY;'
        . 'btn.addEventListener("click",function(){if(!a.src)load(0,0);if(a.paused){p.classList.add("ld");var pr=a.play();if(pr)pr.catch(function(){p.classList.remove("ld");btn.innerHTML=PLAY;});}else{a.pause();}});a.addEventListener("playing",function(){p.classList.remove("ld");});'
        . 'a.addEventListener("play",function(){btn.innerHTML=PAUSE;p.classList.add("on");});a.addEventListener("pause",function(){btn.innerHTML=PLAY;});'
        . 'a.addEventListener("timeupdate",function(){var cur=off(idx)+a.currentTime;fill.style.width=(total?cur/total*100:0)+"%";t.textContent=fmt(cur)+" / "+fmt(total);});'
        . 'a.addEventListener("ended",function(){if(idx<parts.length-1){load(idx+1,0);a.play();}else{fill.style.width="0%";t.textContent=fmt(0)+" / "+fmt(total);p.classList.remove("on");}});'
        . 'bar.addEventListener("click",function(e){var r=bar.getBoundingClientRect();var x=(e.clientX-r.left)/r.width;if(getComputedStyle(bar).direction==="rtl")x=1-x;var target=x*total;var i=0;while(i<parts.length-1){if(target>off(i)+parts[i].d){i++;}else{break;}}load(i,target-off(i));a.play();});});})();</script>';
}

function tjp_css() {
    return <<<'CSS'
<style>
/* == tjp: صفحهٔ افراد == */
main.tj-page{margin-block-start:0}.wp-block-post-content>.tj2.alignfull{margin-top:0}
.tj2.tjp{--acc:var(--tj-red);--acc-2:var(--tj-red-400);--acc-bg:var(--tj-tint)}
.tj2.tjp-edu{--acc:var(--tj-ink);--acc-2:var(--tj-soft);--acc-bg:var(--tj-sunk)}
.tj2 .tjp-hero .wrap{grid-template-columns:minmax(0,1.35fr) minmax(0,.65fr);gap:48px;align-items:center}
.tj2 .tjp-hero.tjp-nopic .wrap{grid-template-columns:minmax(0,1fr);gap:0}
.tj2 .tjp-hero.tjp-nopic .copy{max-width:760px}
.tj2 .tjp-crumb{display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;color:var(--tj-mut);margin-bottom:14px}
.tj2 .tjp-crumb a:hover{color:var(--tj-red)}
.tj2 .tjp-crumb a::after{content:"/";margin-inline-start:6px;color:var(--tj-line)}
.tj2 .tjp-crumb span{color:var(--tj-soft)}
.tj2 .tjp-roles{display:flex;flex-wrap:wrap;gap:6px}
.tj2 .tjp-role{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--tj-ink);background:#fff;border:1px solid var(--tj-line);padding:4px 12px;border-radius:999px;transition:.15s}
.tj2 .tjp-role i{width:7px;height:7px;border-radius:50%;background:var(--c,var(--tj-red))}
.tj2 .tjp-role:hover{border-color:var(--c,var(--tj-red))}
.tj2 .r-ther{--c:var(--tj-red)}.tj2 .r-sup{--c:var(--tj-ink)}.tj2 .r-edu{--c:var(--tj-soft)}.tj2 .r-pen,.tj2 .r-ed{--c:var(--tj-yellow)}.tj2 .r-alum{--c:var(--tj-red-400)}.tj2 .r-mnt{--c:var(--tj-red-600)}
.tj2 .tjp-hero h1{font-size:clamp(32px,4vw,52px);margin:14px 0 2px;line-height:1.35}
.tj2 .tjp-title{font-size:15.5px;font-weight:600;color:var(--tj-soft);margin-bottom:18px}
.tj2 .tjp-quote{position:relative;padding-inline-start:30px;color:var(--tj-ink);font-size:clamp(16px,1.45vw,19.5px);line-height:2.05;margin:0 0 4px}
.tj2 .tjp-quote::before{content:"«";position:absolute;inset-inline-start:0;top:-8px;font-size:46px;line-height:1;color:var(--acc);font-weight:800}
.tj2 .tjp-facts{list-style:none;padding:0;margin:20px 0 14px;display:flex;flex-wrap:wrap;gap:8px}
.tj2 .tjp-facts li{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;color:var(--tj-ink);background:var(--tj-sunk);border-radius:999px;padding:6px 14px;line-height:1.6}
.tj2 .tjp-facts svg{width:15px;height:15px;color:var(--acc);flex:none}
.tj2 .tjp-badges{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:24px}
.tj2 .tjp-badges .sch,.tj2 .tjp-badges .mnt{font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--tj-tint);color:var(--tj-red-600);display:inline-flex;align-items:center;gap:5px}
.tj2 .tjp-portrait{position:relative;justify-self:center;width:100%;max-width:300px;isolation:isolate}
.tj2 .tjp-portrait .fr{position:relative;width:100%;flex:1 1 auto;aspect-ratio:4/5;border-radius:190px 190px 26px 26px;overflow:hidden;background:var(--acc-bg);box-shadow:0 34px 60px -36px rgba(14,14,14,.5)}
.tj2 .tjp-portrait::before{content:"";position:absolute;inset:-16px 22px 30px -16px;border:2px solid var(--acc-2);border-radius:190px 190px 26px 26px;z-index:-1;opacity:.55}
.tj2 .tjp-portrait::after{content:"";position:absolute;width:58px;height:58px;border-radius:50%;background:var(--tj-yellow);opacity:.9;top:18px;inset-inline-end:-18px;z-index:-1}
.tj2 .tjp-portrait img{width:100%;height:100%;object-fit:cover;max-width:none;max-height:none}
.tj2 .tjp-dots{position:absolute;width:132px;height:132px;bottom:-26px;inset-inline-end:-34px;z-index:-1;background:radial-gradient(circle,var(--acc-2) 1.6px,transparent 1.8px) 0 0/16px 16px;opacity:.55}
.tj2 .tjp-poster{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:34px 24px;text-align:center;background:radial-gradient(circle at 1px 1px,rgba(200,63,73,.16) 1.2px,transparent 1.4px) 0 0/18px 18px,linear-gradient(165deg,var(--acc-bg) 0%,#fff 78%)}
.tj2 .tjp-poster b{font-size:18px;color:var(--tj-ink);font-weight:700}
.tj2 .tjp-poster small{font-size:13px;color:var(--tj-soft);line-height:1.8}
.tj2 .tjp-ini{font-size:112px;font-weight:800;line-height:1;color:var(--acc);display:flex;align-items:center;gap:6px}
.tj2 .tjp-ini i{font-style:normal;font-size:60px;color:var(--tj-yellow)}
.tj2 .tjp-bigplay{width:88px;height:88px;border-radius:50%;border:0;background:var(--tj-red);color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 20px 34px -16px rgba(200,63,73,.75);transition:.2s}
.tj2 .tjp-bigplay:hover{transform:scale(1.06)}
.tj2 .tjp-bigplay svg{width:32px;height:32px;margin-inline-start:-4px}
.tj2 .tjp-bars{display:flex;gap:4px;align-items:center;height:48px;margin:6px 0 4px}
.tj2 .tjp-bars i{width:4px;height:10px;border-radius:3px;background:var(--acc);opacity:.7;animation:tjpb 1.2s ease-in-out infinite alternate}
.tj2 .tjp-bars i:nth-child(3n){animation-delay:-.4s}.tj2 .tjp-bars i:nth-child(3n+1){animation-delay:-.8s}.tj2 .tjp-bars i:nth-child(4n){animation-duration:.9s}
@keyframes tjpb{from{height:8px}to{height:44px}}
@media (prefers-reduced-motion:reduce){.tj2 .tjp-bars i{animation:none;height:24px}}
.tj2.tjp-edu .tjp-portrait .fr{border-radius:24px}
.tj2.tjp-edu .tjp-portrait::before{border-radius:24px;inset:18px -18px -18px 18px;border-color:var(--tj-ink);opacity:.8}
.tj2.tjp-edu .tjp-portrait::after{border-radius:6px;width:92px;height:14px;top:auto;bottom:-26px;inset-inline-end:36px;background:var(--tj-red)}
.tj2.tjp-edu .tjp-quote::before{color:var(--tj-red)}
.tj2 .tjp-listen{position:absolute;bottom:26px;inset-inline-start:-26px;display:inline-flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--tj-line);border-radius:999px;padding:9px 16px 9px 12px;font:inherit;font-size:13px;font-weight:700;color:var(--tj-ink);cursor:pointer;box-shadow:0 14px 30px -18px rgba(14,14,14,.45);transition:.18s}
.tj2 .tjp-listen:hover{border-color:var(--tj-red-400);transform:translateY(-2px)}
.tj2 .tjp-wave{display:inline-flex;gap:3px;align-items:center;height:16px}
.tj2 .tjp-wave i{width:3px;height:6px;border-radius:2px;background:var(--tj-red);animation:tjpw .9s ease-in-out infinite alternate}
.tj2 .tjp-wave i:nth-child(2){animation-delay:-.3s}.tj2 .tjp-wave i:nth-child(3){animation-delay:-.6s}.tj2 .tjp-wave i:nth-child(4){animation-delay:-.15s}
@keyframes tjpw{from{height:4px}to{height:16px}}
@media (prefers-reduced-motion:reduce){.tj2 .tjp-wave i{animation:none;height:10px}}
.tj2 .tjp-sec{background:#fff}.tj2 .tjp-alt{background:var(--tj-sunk)}
.tj2 .tjp-two{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,.6fr);gap:34px;margin-top:34px;align-items:start}
.tj2 .tjp-prose{max-width:860px;margin:34px auto 0}
.tj2 .tjp-prose p{font-size:17px;line-height:2.15;color:var(--tj-soft);text-align:justify}
.tj2 .tjp-prose p:first-child{color:var(--tj-ink)}
.tj2 .tjp-prose p+p{margin-top:16px}
.tj2 .tjp-kv{max-width:860px;margin:32px auto 0;background:#fff;border:1px solid var(--tj-line);border-radius:22px;display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));overflow:hidden}
.tj2 .tjp-kv-c{padding:18px 20px;display:flex;flex-direction:column;gap:6px;min-width:0}
.tj2 .tjp-kv-c+.tjp-kv-c{border-inline-start:1px solid var(--tj-line)}
.tj2 .tjp-kv-k{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--tj-mut);line-height:1.6}
.tj2 .tjp-kv-k>svg{width:16px;height:16px;color:var(--acc);flex:none}
.tj2 .tjp-kv-v{font-size:15px;color:var(--tj-ink);line-height:1.75}
.tj2 .tjp-i{all:unset;box-sizing:border-box;width:22px;height:22px;margin-inline-start:auto;border-radius:50%;display:grid;place-items:center;color:var(--acc);background:var(--acc-bg);cursor:pointer;transition:background-color .25s ease,color .25s ease}
.tj2 .tjp-i svg{width:16px;height:16px}
.tj2 .tjp-i:hover,.tj2 .tjp-i[aria-expanded="true"]{background:var(--acc);color:#fff}
.tj2 .tjp-i:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.tj2 details.tjp-apx{grid-column:1/-1;margin:0;padding:0;border:0;background:transparent}
.tj2 details.tjp-apx[open]{background:transparent;border:0;padding:0}
.tj2 details.tjp-apx>summary{display:block;height:0;padding:0;margin:0;overflow:hidden;border:0;list-style:none}
.tj2 details.tjp-apx>summary::-webkit-details-marker{display:none}
.tj2 details.tjp-apx>summary::after,.tj2 details.tjp-apx>summary::before{display:none}
.tj2 .btn svg{width:18px;height:18px;flex:none}
.tj2 .tjp-book{background:var(--tj-sunk)}
.tj2 .tjp-bk{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);max-width:980px;margin:30px auto 0;background:#fff;border:1px solid var(--tj-line);border-radius:28px;overflow:hidden;text-align:right;box-shadow:0 30px 60px -48px rgba(14,14,14,.45)}
.tj2 .tjp-bk-copy{padding:38px 40px 32px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center}
.tj2 .tjp-bk-fast{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:var(--tj-ink);background:var(--tj-yellow);padding:5px 13px 5px 15px;border-radius:999px}
.tj2 .tjp-bk-fast svg{width:13px;height:13px}
.tj2 .tjp-bk-copy h3{font-size:clamp(22px,2.3vw,27px);line-height:1.55;margin:16px 0 20px;color:var(--tj-ink)}
.tj2 .tjp-bk-steps{list-style:none;padding:0;margin:0 0 26px;display:grid;gap:0;width:100%}
.tj2 .tjp-bk-steps li{position:relative;display:flex;align-items:center;gap:12px;font-size:15px;color:var(--tj-ink);line-height:1.7;padding:6px 0}
.tj2 .tjp-bk-steps b{position:relative;z-index:1;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:13.5px;background:var(--tj-tint);color:var(--tj-red-600)}
.tj2 .tjp-bk-steps li:not(:last-child)::after{content:"";position:absolute;inset-inline-start:14px;top:34px;height:calc(100% - 26px);border-inline-start:2px dotted var(--tj-red-400);opacity:.5}
.tj2 .tjp-bk-steps li:last-child b{background:var(--tj-red);color:#fff}
.tj2 .tjp-bk-go{width:100%;justify-content:center;padding-block:15px;font-size:16px}
.tj2 .tjp-bk-facts{list-style:none;padding:0;margin:14px 0 0;display:flex;flex-wrap:wrap;gap:6px 18px}
.tj2 .tjp-bk-facts li{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--tj-soft)}
.tj2 .tjp-bk-facts svg{width:15px;height:15px;color:var(--tj-mut)}
.tj2 .tjp-bk-demo{position:relative;background:var(--tj-ink);display:grid;place-items:center;padding:36px 30px;overflow:hidden;isolation:isolate}
.tj2 .tjp-bk-demo::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(255,255,255,.12) 1.2px,transparent 1.4px) 0 0/18px 18px;z-index:-1}
.tj2 .tjp-bk-demo::after{content:"";position:absolute;width:280px;height:280px;border-radius:50%;background:var(--tj-red);filter:blur(80px);opacity:.5;top:-110px;inset-inline-end:-90px;z-index:-1}
.tj2 .tjp-chat{width:100%;max-width:330px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:26px;padding:14px 14px 18px;display:flex;flex-direction:column;gap:9px;box-shadow:0 30px 50px -30px rgba(0,0,0,.6)}
.tj2 .tjp-chat-top{display:flex;align-items:center;gap:10px;padding:2px 4px 11px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:4px}
.tj2 .tjp-chat-top .av{width:36px;height:36px;border-radius:50%;background:var(--tj-red);color:#fff;display:grid;place-items:center;flex:none}
.tj2 .tjp-chat-top .av svg{width:17px;height:17px}
.tj2 .tjp-chat-top b{display:block;font-size:13.5px;color:#fff;line-height:1.5}
.tj2 .tjp-chat-top small{display:block;font-size:11.5px;color:rgba(255,255,255,.55);line-height:1.5}
.tj2 .tjp-chat .bb{margin:0;align-self:flex-start;max-width:90%;background:#fff;color:var(--tj-ink);font-size:13.5px;line-height:1.8;padding:8px 13px;border-radius:16px 16px 5px 16px}
.tj2 .tjp-chat .ok{display:inline-flex;align-items:center;gap:6px;background:var(--tj-yellow);font-weight:700}
.tj2 .tjp-chat .ok svg{width:15px;height:15px;stroke-width:2.6}
.tj2 .tjp-chat .ch{display:flex;gap:6px}
.tj2 .tjp-chat .ch span{flex:1;text-align:center;font-size:12.5px;font-weight:700;color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:11px;padding:7px 4px;line-height:1.6}
.tj2 .tjp-chat .m1{animation:tjpA1 9s infinite both}.tj2 .tjp-chat .m2{animation:tjpA2 9s infinite both}.tj2 .tjp-chat .m3{animation:tjpA3 9s infinite both}
.tj2 .tjp-chat .m4{animation:tjpA4 9s infinite both}.tj2 .tjp-chat .m5{animation:tjpA5 9s infinite both}
.tj2 .tjp-chat .o1{animation:tjpO1 9s infinite both}.tj2 .tjp-chat .o2{animation:tjpO2 9s infinite both}
@keyframes tjpA1{0%,3%{opacity:0;transform:translateY(8px)}8%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjpA2{0%,11%{opacity:0;transform:translateY(8px)}16%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjpA3{0%,29%{opacity:0;transform:translateY(8px)}34%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjpA4{0%,37%{opacity:0;transform:translateY(8px)}42%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjpA5{0%,55%{opacity:0;transform:translateY(8px) scale(.96)}61%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjpO1{0%,20%{background:transparent;border-color:rgba(255,255,255,.28);transform:none}22%{transform:scale(.92)}25%,100%{background:var(--tj-red);border-color:var(--tj-red);transform:none}}
@keyframes tjpO2{0%,46%{background:transparent;border-color:rgba(255,255,255,.28);transform:none}48%{transform:scale(.92)}51%,100%{background:var(--tj-red);border-color:var(--tj-red);transform:none}}
@media (prefers-reduced-motion:reduce){.tj2 .tjp-chat *{animation:none!important}.tj2 .tjp-chat .on{background:var(--tj-red);border-color:var(--tj-red)}}
.tj2 .tjp-call{max-width:980px;margin:14px auto 0;background:#fff;border:1px solid var(--tj-line);border-radius:20px;text-align:right;overflow:hidden}
.tj2 .tjp-call summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px 14px 22px;font-size:14.5px;color:var(--tj-soft)}
.tj2 .tjp-call summary::-webkit-details-marker{display:none}
.tj2 .tjp-call summary::after{display:none}
.tj2 .tjp-call summary b{font-size:13.5px;color:var(--tj-ink);border:1px solid var(--tj-ink);border-radius:999px;padding:6px 18px;flex:none;transition:.15s}
.tj2 .tjp-call summary:hover b,.tj2 .tjp-call[open] summary b{background:var(--tj-ink);color:#fff}
.tj2 .tjp-call-b{padding:0 22px 20px;border-top:1px solid var(--tj-line)}
.tj2 .tjp-ap-note{font-size:13px;color:var(--tj-mut);line-height:1.9;margin:14px 0 6px}
.tj2 .tjp-call .ff-btn-submit{background:#fff!important;color:var(--tj-ink)!important;border:1px solid var(--tj-ink)!important;box-shadow:none!important}
.tj2 .tjp-call .ff-btn-submit:hover{background:var(--tj-ink)!important;color:#fff!important}
.tj2 .tjp-apx-in{border-top:1px solid var(--tj-line);background:var(--tj-sunk);padding:18px 22px;display:grid;gap:12px}
.tj2 .tjp-apx-i small{display:block;font-size:12px;color:var(--acc);font-weight:700;line-height:1.7}
.tj2 .tjp-apx-i b{display:block;font-size:15.5px;color:var(--tj-ink);margin:2px 0 4px}
.tj2 .tjp-apx-i p{font-size:14.5px;line-height:2;color:var(--tj-soft);margin:0}
.tj2 .tjp-apx-m{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;padding-top:12px;border-top:1px dashed var(--tj-line);font-size:13px;color:var(--tj-mut)}
.tj2 .tjp-apx-m a{display:inline-flex;align-items:center;gap:4px;color:var(--tj-red-600);font-weight:700}
.tj2 .tjp-apx-m a svg{width:14px;height:14px}
.tj2 .tjp-cv{display:block;max-width:860px;margin:16px auto 0;padding:0;background:#fff;border:1px solid var(--tj-line);border-radius:20px;text-align:right;transition:.15s}
.tj2 .tjp-cv summary,.tj2 .tjp-cv-link{list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:14px 18px}
.tj2 .tjp-cv summary::-webkit-details-marker{display:none}
.tj2 .tjp-cv summary::after{display:none}
.tj2 .tjp-cv:hover{border-color:var(--tj-red-400)}
.tj2 details.tjp-cv,.tj2 details.tjp-call{padding:0}
.tj2 details.tjp-cv>.ans,.tj2 details.tjp-call>.ans,.tj2 details.tjp-apx>.ans{overflow:hidden;padding:0;margin:0;box-sizing:border-box}
.tj2 details.tjp-cv[open],.tj2 details.tjp-call[open]{background:#fff;border-color:var(--tj-line)}
.tj2 .tjp-cv-ic{width:42px;height:42px;border-radius:13px;background:var(--acc-bg);color:var(--acc);display:grid;place-items:center;flex:none}
.tj2 .tjp-cv-ic svg{width:20px;height:20px}
.tj2 .tjp-cv-t{flex:1;min-width:0;display:flex;flex-direction:column}
.tj2 .tjp-cv-t b{font-size:15px;color:var(--tj-ink);line-height:1.6}
.tj2 .tjp-cv-t small{font-size:12.5px;color:var(--tj-mut);line-height:1.7}
.tj2 .tjp-cv-go{width:34px;height:34px;border-radius:50%;border:1px solid var(--tj-line);display:grid;place-items:center;flex:none;color:var(--tj-ink);transition:transform .2s}
.tj2 .tjp-cv-go svg{width:16px;height:16px}
.tj2 details.tjp-cv .tjp-cv-go{transform:rotate(-90deg)}.tj2 details.tjp-cv[open] .tjp-cv-go{transform:rotate(90deg)}
.tj2 .tjp-cv-b{border-top:1px solid var(--tj-line);padding:6px 24px 20px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 36px}
.tj2 .tjp-cv-s h4{font-size:13px;color:var(--acc);font-weight:800;margin:16px 0 4px}
.tj2 .tjp-cv-s ul{list-style:none;padding:0;margin:0}
.tj2 .tjp-cv-s li{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:7px 0;border-bottom:1px dashed var(--tj-line);font-size:14px;color:var(--tj-ink);line-height:1.85}
.tj2 .tjp-cv-s li:last-child{border-bottom:0}
.tj2 .tjp-cv-s small{flex:none;font-size:12.5px;color:var(--tj-mut);white-space:nowrap}
.tj2 .tjp-topics{max-width:860px;margin:28px auto 0;display:grid;gap:14px}
.tj2 .tjp-topics>div{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:start;padding-top:14px;border-top:1px solid var(--tj-line)}
.tj2 .tjp-topics dt{font-size:13px;color:var(--tj-mut);font-weight:600;line-height:2}
.tj2 .tjp-topics dd{margin:0;display:flex;flex-wrap:wrap;gap:6px}
.tj2 .tjp-topics dd span{font-size:13.5px;color:var(--tj-ink);background:#fff;border:1px solid var(--tj-line);border-radius:999px;padding:3px 12px;line-height:1.8}
.tj2 .tjp-mag{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:980px;margin:30px auto 0}
.tj2 .tjp-mi{display:flex;gap:14px;align-items:center;background:#fff;border:1px solid var(--tj-line);border-radius:16px;padding:10px;transition:.15s}
.tj2 .tjp-mi:hover{border-color:var(--tj-red-400)}
.tj2 .tjp-mi img,.tj2 .tjp-mi-ph{width:112px;height:80px;border-radius:11px;object-fit:cover;flex:none;background:var(--tj-sunk);display:grid;place-items:center}
.tj2 .tjp-mi-ph svg{width:22px;height:22px;color:var(--tj-mut)}
.tj2 .tjp-mi-t{min-width:0;display:flex;flex-direction:column;gap:3px}
.tj2 .tjp-mi-t b{font-size:14.5px;color:var(--tj-ink);line-height:1.8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tj2 .tjp-mi-t small{font-size:12.5px;color:var(--tj-mut);line-height:1.8;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.tj2 .tjp-morew{text-align:center;margin-top:18px}
.tj2 .tjp-more{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:var(--tj-red-600)}
.tj2 .tjp-more svg{width:16px;height:16px}
.tj2 .tjp-card{background:#fff;border:1px solid var(--tj-line);border-radius:20px;padding:20px 22px}
.tj2 .tjp-alt .tjp-card{background:#fff}
.tj2 .tjp-chips{display:flex;flex-wrap:wrap;gap:6px}
.tj2 .tjp-chips .chip{cursor:default;font-size:13px;padding:4px 12px}
.tj2 .tjp-first{max-width:860px;margin:34px auto 0;background:#fff;border:1px solid var(--tj-line);border-radius:20px;padding:30px 30px 24px;position:relative}
.tj2 .tjp-first-art{position:absolute;top:-52px;inset-inline-end:22px;width:64px;height:auto;pointer-events:none}
.tj2 .tjp-first p{font-size:16px;line-height:2.05;color:var(--tj-ink)}
.tj2 .tjp-tag{position:absolute;top:-15px;inset-inline-start:24px;display:inline-flex;align-items:center;gap:7px;background:var(--tj-ink);color:#fff;font-size:13px;font-weight:700;padding:4px 14px;border-radius:999px}
.tj2 .tjp-tag svg{width:14px;height:14px}
.tj2 .tjp-voice .vp{margin:28px auto 0}
.tj2 .vp{display:flex;gap:16px;align-items:center;background:#fff;border:1px solid var(--tj-line);border-radius:22px;padding:16px 18px;max-width:640px;width:100%;box-shadow:0 18px 40px -30px rgba(14,14,14,.35)}
.tj2 .vp img.av{width:64px;height:64px;border-radius:50%;object-fit:cover;object-position:top;flex:none;border:3px solid var(--tj-tint)}
.tj2 .vp .m{flex:1;min-width:0}.tj2 .vp b{display:block;font-size:15px;color:var(--tj-ink);line-height:1.6}
.tj2 .vp small{display:block;font-size:12.5px;color:var(--tj-mut);margin-top:2px}
.tj2 .vp .row{display:flex;align-items:center;gap:10px;margin-top:10px}
.tj2 .vp button{width:44px;height:44px;border-radius:50%;border:0;background:var(--tj-red);color:#fff;display:grid;place-items:center;cursor:pointer;flex:none;transition:.15s;padding:0}
.tj2 .vp button:hover{background:var(--tj-red-600)}.tj2 .vp button svg{width:18px;height:18px;fill:#fff}
.tj2 .vp .bar{flex:1;height:8px;border-radius:999px;background:var(--tj-sunk);position:relative;cursor:pointer;overflow:hidden}
.tj2 .vp .bar i{position:absolute;inset-block:0;inset-inline-start:0;width:0;background:var(--tj-red);border-radius:999px}
.tj2 .vp .t{font-size:12.5px;color:var(--tj-mut);font-variant-numeric:tabular-nums;direction:ltr;min-width:82px;text-align:left}
.tj2 .vp.on{border-color:var(--tj-red-400)}.tj2 .vp.ld button{animation:tjpld 1s ease-in-out infinite}
@keyframes tjpld{50%{opacity:.55}}
.tj2 .tjp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:30px}
.tj2 .tjp-grid>div{display:grid;grid-template-columns:40px 1fr;column-gap:12px;align-items:start;background:#fff;border:1px solid var(--tj-line);border-radius:16px;padding:16px}
.tj2 .tjp-grid svg{grid-row:span 2;width:40px;height:40px;padding:9px;border-radius:12px;background:var(--acc-bg);color:var(--acc)}
.tj2 .tjp-grid b{font-size:12.5px;color:var(--tj-mut);font-weight:600}
.tj2 .tjp-grid span{font-size:14.5px;color:var(--tj-ink);line-height:1.8}
.tj2 .tjp-learn{max-width:860px;margin:16px auto 0}
.tj2 .tjp-learn h3{display:flex;align-items:center;gap:8px;font-size:16px;margin-bottom:10px}
.tj2 .tjp-learn h3 svg{width:18px;height:18px;color:var(--acc)}
.tj2 .tjp-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.tj2 .tjp-list li{position:relative;padding-inline-start:20px;font-size:15px;line-height:1.9;color:var(--tj-soft)}
.tj2 .tjp-list li::before{content:"";position:absolute;inset-inline-start:2px;top:.85em;width:7px;height:7px;border-radius:50%;background:var(--acc-2)}
.tj2 .tjp-list a{color:var(--tj-red-600);border-bottom:1px solid var(--tj-red-400)}
.tj2 .tjp-teamband{padding-block:26px 44px;background:#fff}
.tj2 .tjp-tb{display:flex;align-items:center;gap:18px;max-width:760px;margin:0 auto;padding:14px 18px 14px 14px;border:1px solid var(--tj-line);border-radius:999px;background:#fff;transition:.2s}
.tj2 .tjp-tb:hover{border-color:var(--tj-red-400);box-shadow:0 16px 34px -26px rgba(14,14,14,.45);transform:translateY(-2px)}
.tj2 .tjp-faces{display:flex;flex:none}
.tj2 .tjp-faces img{width:44px;height:44px;border-radius:50%;object-fit:cover;border:3px solid #fff;margin-inline-start:-12px;box-shadow:0 2px 6px rgba(14,14,14,.12)}
.tj2 .tjp-faces img:first-child{margin-inline-start:0}
.tj2 .tjp-tbt{flex:1;min-width:0;display:flex;flex-direction:column}
.tj2 .tjp-tbt b{font-size:15.5px;color:var(--tj-ink)}.tj2 .tjp-tbt small{font-size:13px;color:var(--tj-soft);line-height:1.7}
.tj2 .tjp-tbgo{width:42px;height:42px;border-radius:50%;background:var(--tj-ink);color:#fff;display:grid;place-items:center;flex:none}
.tj2 .tjp-tbgo svg{width:18px;height:18px}
.tj2 .tjp-host{font-size:12px;color:var(--tj-mut);direction:ltr;unicode-bidi:isolate}
.tj2 .tjp-rows{margin-top:0;grid-template-columns:1fr;padding:4px 22px}
.tj2 .tjp-rows .svc-row:nth-last-child(-n+2){border-bottom:1px solid var(--tj-line)}.tj2 .tjp-rows .svc-row:last-child{border-bottom:0}
.tj2 .tjp-supbox{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;background:var(--tj-ink);border-radius:26px;padding:34px 36px}
.tj2 .tjp-supbox .h2{color:#fff}.tj2 .tjp-supbox .lede{color:rgba(255,255,255,.75)}
.tj2 .tjp-supbox .eyebrow{background:rgba(255,255,255,.1);color:#fff}.tj2 .tjp-supbox .eyebrow::before{background:var(--tj-yellow)}
.tj2 .tjp-supbox .btn-ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.35)}
.tj2 .tjp-rel .hs{margin-top:24px}
.tj2 .tjp-rel .thc{display:block}
.tj2 .tjp-book{text-align:right}
.tj2 .tjp-bookbox{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:34px;align-items:center;background:#fff;border:1px solid var(--tj-line);border-radius:28px;padding:34px}
.tj2 .tjp-bookbox .lede{margin:10px 0 12px}
.tj2 .tjp-bookbox .small a{color:var(--tj-red-600);font-weight:700}
.tj2 .tjp-form .ff-btn-submit{width:100%}
@media (max-width:760px){
.tj2 .tjp-hero .wrap{grid-template-columns:1fr;gap:18px}
.tj2 .tjp-portrait{order:-1}
.tj2 .tjp-portrait{width:210px;margin-top:10px}
.tj2 .tjp-portrait::after{width:48px;height:48px;inset-inline-end:-10px}
.tj2 .tjp-listen{inset-inline-start:-10px;bottom:14px;font-size:12px;padding:7px 12px 7px 10px}
.tj2 .tjp-hero h1{font-size:30px;margin-top:10px}
.tj2 .tjp-hero .copy{text-align:center}
.tj2 .tjp-crumb,.tj2 .tjp-roles,.tj2 .tjp-facts,.tj2 .tjp-badges{justify-content:center}
.tj2 .tjp-quote{padding-inline-start:0;padding-top:22px;text-align:center}
.tj2 .tjp-quote::before{inset-inline-start:50%;transform:translateX(50%);top:-10px}
.tj2 .tjp-two{grid-template-columns:1fr;gap:20px}
.tj2 .tjp-bk{grid-template-columns:1fr;border-radius:22px}
.tj2 .tjp-bk-copy{padding:26px 20px 24px}
.tj2 .tjp-bk-demo{padding:26px 16px}
.tj2 .tjp-call summary{flex-direction:column;align-items:stretch;text-align:center;padding:14px 16px}
.tj2 .tjp-call-b{padding:0 14px 16px}
.tj2 .tjp-cv-b{grid-template-columns:1fr;padding:4px 16px 16px}
.tj2 .tjp-cv summary,.tj2 .tjp-cv-link{padding:12px 14px}
.tj2 .tjp-mag{grid-template-columns:1fr}
.tj2 .tjp-mi img,.tj2 .tjp-mi-ph{width:92px;height:68px}
.tj2 .tjp-topics>div{grid-template-columns:1fr;gap:6px}
.tj2 .tjp-prose p{text-align:right;font-size:16px}
.tj2 .tjp-kv{grid-template-columns:repeat(2,minmax(0,1fr));border-radius:20px}
.tj2 .tjp-kv-c{padding:14px 16px}
.tj2 .tjp-kv-c+.tjp-kv-c{border-inline-start:0;border-top:1px solid var(--tj-line)}
.tj2 .tjp-kv-c.is-apx{grid-column:1/-1}
.tj2 .tjp-kv-c.is-apx~.tjp-kv-c:nth-child(odd){border-inline-start:1px solid var(--tj-line)}
.tj2 .tjp-kv:not(:has(.is-apx)) .tjp-kv-c:nth-child(even){border-inline-start:1px solid var(--tj-line)}
.tj2 .tjp-apx-in{padding:16px}
.tj2 .tjp-first{padding:26px 18px 18px}
.tj2 .tjp-supbox{grid-template-columns:1fr;padding:26px 20px}
.tj2 .tjp-bookbox{grid-template-columns:1fr;padding:22px 16px;gap:16px}
.tj2.tjp-edu .tjp-portrait::before{inset:12px -12px -12px 12px}
}
/* سیلابس‌ها و آثار (صفحهٔ استاد) */
.tj2 .tjp-syl,.tj2 .tjp-wl{list-style:none;padding:0;margin:30px auto 0;max-width:860px;display:grid;gap:12px}
.tj2 .tjp-syl li,.tj2 .tjp-wl li{background:#fff;border:1px solid var(--tj-line);border-radius:16px;padding:16px 20px;display:grid;gap:6px}
.tj2 .tjp-syl b,.tj2 .tjp-wl b{font-size:16px;color:var(--tj-ink);line-height:1.7}
.tj2 .tjp-wl span{font-size:14.5px;color:var(--tj-soft);line-height:1.8}
.tj2 .tjp-syl small,.tj2 .tjp-wl small{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--tj-mut);line-height:1.8}
.tj2 .tjp-syl small svg,.tj2 .tjp-wl small svg{width:15px;height:15px;color:var(--acc);flex:none}
.tj2 .tjp-syl .ltr{direction:ltr;unicode-bidi:isolate}
.tj2 .tjp-rows-w{max-width:860px;margin:30px auto 0;padding:4px 22px;background:#fff;border:1px solid var(--tj-line);border-radius:16px}
.tj2 .tjp-syl-n{justify-self:start;font-size:12.5px;font-weight:600;color:var(--acc);background:var(--acc-bg);border-radius:999px;padding:3px 11px}
@media (max-width:760px){
.tj2 .tjp-syl,.tj2 .tjp-wl{margin-top:22px}
.tj2 .tjp-syl li,.tj2 .tjp-wl li{padding:14px 16px;border-radius:14px}
}
</style>
CSS;
}

/* ───── فهرست تیم: [tj_team] روی برگهٔ /team/ ───── */
add_shortcode('tj_team', 'tjp_team');
function tjp_team() {
    $a = tjp_home_assets();
    $ps = get_posts(array('post_type' => 'tj_person', 'post_status' => 'publish', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC'));
    $cards = ''; $list = array(); $n = array('ther' => 0, 'sup' => 0, 'edu' => 0, 'pen' => 0);
    foreach ($ps as $i => $p) {
        $d = tjp_data($p->ID);
        $roles = tjp_roles($d);
        foreach ($n as $k => $v) { if (isset($roles[$k])) $n[$k]++; }
        $im = isset($d['img']['hero_s']) ? $d['img']['hero_s'] : (isset($d['img']['hero']) ? $d['img']['hero'] : (isset($d['img']['avatar']) ? $d['img']['avatar'] : ''));
        $nm = get_the_title($p);
        $np = preg_split('/\s+/u', trim(preg_replace('/^\s*دکتر\s+/u', '', $nm)));
        $ini = mb_substr($np[0], 0, 1) . (count($np) > 1 ? mb_substr(end($np), 0, 1) : '');
        $rl = ''; foreach ($roles as $k => $l) { if (in_array($k, array('ther', 'sup', 'edu', 'pen'), true)) $rl .= '<span class="r-' . $k . '"><i></i>' . esc_html($l) . '</span>'; }
        $sub = tjp_clean(!empty($d['sp']) ? $d['sp'] : (isset($d['title']) ? $d['title'] : ''));
        $city = !empty($d['city']) ? preg_replace('/،\s*([^،]+)$/u', ' و $1', tjp_clean($d['city'])) : '';
        $cards .= '<a class="tjt-card rv" data-r="' . esc_attr(implode(' ', array_keys($roles))) . '" href="' . esc_url(wp_make_link_relative(get_permalink($p))) . '">'
                . '<span class="av">' . ($im ? '<img src="' . esc_url($im) . '" alt="' . esc_attr($nm) . '" width="160" height="200" loading="' . ($i < 6 ? 'eager' : 'lazy') . '" decoding="async">' : '<span class="nopic" aria-hidden="true"></span>') . '</span>'
                . '<span class="tx"><b>' . esc_html($nm) . '</b>' . ($sub ? '<small>' . esc_html(tjp_cut($sub, 60)) . '</small>' : '')
                . '<span class="mt">' . $rl . ($city ? '<em>' . tjp_ic('pin') . esc_html($city) . '</em>' : '') . '</span></span>'
                . '<span class="go">' . tjp_ic('arrow') . '</span></a>';
        $list[] = array('@type' => 'ListItem', 'position' => $i + 1, 'url' => get_permalink($p), 'name' => $nm);
    }
    $chips = '<button class="chip on" data-f="all" type="button">همه <i>' . tjp_fa(count($ps)) . '</i></button>';
    foreach (array('ther' => 'تراپیست‌ها', 'sup' => 'سوپروایزرها', 'edu' => 'استادها', 'pen' => 'نویسنده‌های مجله') as $k => $l) { if ($n[$k]) $chips .= '<button class="chip" data-f="' . $k . '" type="button">' . $l . ' <i>' . tjp_fa($n[$k]) . '</i></button>'; }
    $css = '<style>'
         . '.tj2 .tjt-hero{padding-block:clamp(34px,5vw,64px) 10px;background:#fff}'
         . '.tj2 .tjt-hw{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:40px;align-items:center;max-width:1080px;margin:0 auto}'
         . '.tj2 .tjt-hero h1{font-size:clamp(28px,3.3vw,42px);line-height:1.45;margin:12px 0 10px}'
         . '.tj2 .tjt-hero .lede{margin:0;max-width:620px}'
         . '.tj2 .tjt-art{position:relative;isolation:isolate;justify-self:center;width:100%;max-width:250px}'
         . '.tj2 .tjt-art img{width:100%;height:auto;animation:tjtF 7s ease-in-out infinite}'
         . '.tj2 .tjt-art::before{content:"";position:absolute;inset:14% 8% 6% 8%;border-radius:50%;background:var(--tj-tint);z-index:-1}'
         . '@keyframes tjtF{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}'
         . '@media (prefers-reduced-motion:reduce){.tj2 .tjt-art img{animation:none}}'
         . '.tj2 .tjt-f{display:flex;flex-wrap:wrap;gap:6px;margin-top:22px}'
         . '.tj2 .tjt-f .chip i{font-style:normal;font-size:11px;opacity:.65;margin-inline-start:2px}'
         . '.tj2 .tjt-list{padding-block:26px clamp(40px,6vw,72px);background:#fff}'
         . '.tj2 .tjt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:1080px;margin:0 auto}'
         . '.tj2 .tjt-card{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--tj-line);border-radius:20px;padding:10px 12px 10px 10px;transition:border-color .3s ease,box-shadow .3s ease;min-width:0}'
         . '.tj2 .tjt-card:hover{border-color:var(--tj-red-400);box-shadow:0 14px 28px -24px rgba(14,14,14,.4)}'
         . '.tj2 .tjt-card .av{flex:none;width:68px;height:84px;border-radius:40px 40px 12px 12px;overflow:hidden;background:var(--tj-tint);display:grid;place-items:center}'
         . '.tj2 .tjt-card .av img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;max-width:none;transform:scale(1.28);transform-origin:50% 26%;backface-visibility:hidden;will-change:transform}'
         . '.tj2 .tjt-card .ini{font-size:24px;font-weight:800;color:var(--tj-red)}'
         . '.tj2 .tjt-card .nopic{width:28px;height:23px;background:var(--tjhm) center/contain no-repeat;opacity:.34}'
         . '.tj2 .tjt-card .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}'
         . '.tj2 .tjt-card b{font-size:15px;color:var(--tj-ink);line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
         . '.tj2 .tjt-card b{transition:color .3s ease}.tj2 .tjt-card:hover b{color:var(--tj-red-600)}'
         . '.tj2 .tjt-card small{font-size:12.5px;color:var(--tj-soft);line-height:1.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
         . '.tj2 .tjt-card .mt{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin-top:5px}'
         . '.tj2 .tjt-card .mt span{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--tj-ink);background:var(--tj-sunk);padding:1px 8px;border-radius:999px;line-height:1.8}'
         . '.tj2 .tjt-card .mt span i{width:6px;height:6px;border-radius:50%;background:var(--c,var(--tj-red))}'
         . '.tj2 .r-ther{--c:var(--tj-red)}.tj2 .r-sup{--c:var(--tj-ink)}.tj2 .r-edu{--c:var(--tj-soft)}.tj2 .r-pen{--c:var(--tj-yellow)}'
         . '.tj2 .tjt-card em{display:inline-flex;align-items:center;gap:3px;font-style:normal;font-size:11.5px;color:var(--tj-mut)}.tj2 .tjt-card em svg{width:12px;height:12px}'
         . '.tj2 .tjt-card .go{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:var(--tj-mut);transition:background-color .3s ease,color .3s ease}'
         . '.tj2 .tjt-card .go svg{width:16px;height:16px}.tj2 .tjt-card:hover .go{background:var(--tj-red);color:#fff}'
         . '.tj2 .tjt-card.hide{display:none}'
         . '.tj2 .tjt-more{display:flex;align-items:center;gap:16px;max-width:1080px;margin:26px auto 0;background:var(--tj-sunk);border-radius:22px;padding:16px 22px}'
         . '.tj2 .tjt-more p{margin:0;font-size:14px;line-height:1.9;color:var(--tj-soft);flex:1}'
         . '.tj2 .tjt-more a{flex:none}'
         . '@media (max-width:1024px){.tj2 .tjt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}'
         . '@media (max-width:760px){.tj2 .tjt-hw{grid-template-columns:1fr;gap:10px;text-align:center}.tj2 .tjt-art{order:-1;max-width:150px}.tj2 .tjt-hero .lede{margin-inline:auto}.tj2 .tjt-f{justify-content:center}.tj2 .tjt-grid{grid-template-columns:1fr;gap:10px}.tj2 .tjt-more{flex-wrap:wrap;justify-content:center;text-align:center}}'
         . '</style>';
    $js = '<script>(function(){var f=document.getElementById("tjpF");if(!f)return;f.addEventListener("click",function(e){var b=e.target.closest(".chip");if(!b)return;f.querySelectorAll(".chip").forEach(function(c){c.classList.remove("on");});b.classList.add("on");var k=b.getAttribute("data-f");document.querySelectorAll(".tjt-card").forEach(function(t){var r=(t.getAttribute("data-r")||"").split(" ");t.classList.toggle("hide",k==="all"?false:r.indexOf(k)<0);});});})();</script>';
    $graph = defined('WPSEO_VERSION') ? array(array('@type' => 'ItemList', 'name' => 'تیم تجربه', 'itemListElement' => $list)) : array(
            array('@type' => 'CollectionPage', 'name' => 'تیم تجربه', 'url' => home_url('/' . TJP_SLUG . '/'), 'inLanguage' => 'fa-IR', 'mainEntity' => array('@type' => 'ItemList', 'itemListElement' => $list)),
            array('@type' => 'BreadcrumbList', 'itemListElement' => array(array('@type' => 'ListItem', 'position' => 1, 'name' => 'خانه', 'item' => home_url('/')), array('@type' => 'ListItem', 'position' => 2, 'name' => 'تیم تجربه', 'item' => home_url('/' . TJP_SLUG . '/')))));
    $ld = '<script type="application/ld+json">' . wp_json_encode(array('@context' => 'https://schema.org', '@graph' => $graph), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
    return $a['style'] . tjp_css() . $css . '<div class="tj2 alignfull tjp" id="tj2">'
         . '<section class="tjt-hero"><div class="wrap"><div class="tjt-hw"><div class="copy">'
         . '<span class="eyebrow">تیم تجربه</span><h1>درمانگرها، استادها و سوپروایزرهای تجربه</h1>'
         . '<p class="lede">هر کدام صفحهٔ خودش را دارد: روش کار، جلسهٔ اول، مسیر حرفه‌ای و صدای خودش. صفحه‌ها را خود اعضا کامل می‌کنند و تیم تجربه پیش از انتشار می‌خواند.</p>'
         . '<div class="tjt-f" id="tjpF">' . $chips . '</div></div>'
         . '<div class="tjt-art"><img src="/wp-content/uploads/2026/09/tjl-cut-orbit.webp" alt="" width="682" height="666" fetchpriority="high" decoding="async"></div></div></div></section>'
         . '<section class="tjt-list"><div class="wrap"><div class="tjt-grid">' . $cards . '</div>'
         . '<div class="tjt-more rv">'
         . '<p>بیش از صد درمانگر دیگر هم در تجربه کار می‌کنند و صفحه‌هایشان یکی‌یکی اینجا می‌آید. تا آن موقع، پذیرش تجربه کمکتان می‌کند درمانگر مناسبتان را پیدا کنید.</p>'
         . '<a class="btn btn-brand" href="/get-therapy/">شروع تراپی</a></div>'
         . '</div></section></div>' . $a['script'] . $js . $ld;
}

/* ───── ساخت و به‌روزکردن صفحه (از بات یا مدیر) ───── */
/* آدرس انگلیسی برای اشتراک‌گذاری: اول نامک کاربر مجله (erfan-amirbeigi)، وگرنه آوانگاری ساده */
function tjp_slug($name, $users = array()) {
    if ($users) { $u = get_userdata((int) $users[0]); if ($u && preg_match('/^[a-z0-9-]+$/', $u->user_nicename)) return $u->user_nicename; }
    $n = trim(preg_replace('/^\s*دکتر\s+/u', '', (string) $name));
    $n = preg_replace('/[\x{200B}-\x{200F}\x{FEFF}]/u', '', $n);
    $map = array('آ' => 'a', 'ا' => 'a', 'أ' => 'a', 'ب' => 'b', 'پ' => 'p', 'ت' => 't', 'ث' => 's', 'ج' => 'j', 'چ' => 'ch', 'ح' => 'h', 'خ' => 'kh',
                 'د' => 'd', 'ذ' => 'z', 'ر' => 'r', 'ز' => 'z', 'ژ' => 'zh', 'س' => 's', 'ش' => 'sh', 'ص' => 's', 'ض' => 'z', 'ط' => 't', 'ظ' => 'z',
                 'ع' => '', 'غ' => 'gh', 'ف' => 'f', 'ق' => 'gh', 'ک' => 'k', 'ك' => 'k', 'گ' => 'g', 'ل' => 'l', 'م' => 'm', 'ن' => 'n', 'ه' => 'h', 'ة' => 'h', 'ۀ' => 'h', 'ء' => '', 'ئ' => 'y', 'ؤ' => 'o');
    $out = array();
    foreach (preg_split('/[^\p{L}\p{N}]+/u', $n, -1, PREG_SPLIT_NO_EMPTY) as $w) {
        $ch = preg_split('//u', $w, -1, PREG_SPLIT_NO_EMPTY); $r = '';
        foreach ($ch as $i => $c) {
            if ($c === 'و') $r .= ($i === 0 || in_array(isset($ch[$i - 1]) ? $ch[$i - 1] : '', array('ا', 'آ', 'و'), true)) ? 'v' : 'o';
            elseif ($c === 'ی' || $c === 'ي') $r .= ($i === 0) ? 'y' : 'i';
            elseif (isset($map[$c])) $r .= $map[$c];
            elseif (preg_match('/[a-z0-9]/i', $c)) $r .= strtolower($c);
        }
        if ($r !== '') $out[] = $r;
    }
    $sl = trim(preg_replace('/-+/', '-', implode('-', $out)), '-');
    return $sl !== '' ? $sl : 'member-' . substr(md5($name), 0, 6);
}

function tjp_find_users($name) {
    $k = tjp_norm($name); $main = 0; $all = array();
    foreach (get_users(array('fields' => array('ID', 'display_name'), 'number' => 500)) as $u) {
        $dn = (string) $u->display_name;
        if (tjp_norm($dn) === $k) { $main = (int) $u->ID; }
        elseif (mb_strpos(tjp_norm($dn), $k) !== false) { $all[] = (int) $u->ID; }
    }
    if (!$main) return array();
    return array_values(array_unique(array_merge(array($main), $all)));
}

function tjp_upsert($p) {
    $name = trim((string) (isset($p['display']) ? $p['display'] : (isset($p['name']) ? $p['name'] : '')));
    if ($name === '') throw new Exception('name missing');
    $key = tjp_norm(isset($p['name']) ? $p['name'] : $name);
    $ex = get_posts(array('post_type' => 'tj_person', 'post_status' => array('publish', 'draft', 'private'), 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_tjp_key', 'meta_value' => $key));
    $id = $ex ? (int) $ex[0] : 0;
    /* نشانی مستقیم صفحه (مثلاً یکدست‌کردن عکس از پیشخوان): کلید و وضعیت خود صفحه می‌ماند */
    if (!empty($p['id'])) {
        $pid = (int) $p['id'];
        if (get_post_type($pid) !== 'tj_person') throw new Exception('id is not a person page');
        $id = $pid; $k0 = (string) get_post_meta($pid, '_tjp_key', true); if ($k0 !== '') $key = $k0;
        if (empty($p['status'])) $p['status'] = get_post_status($pid);
    }
    if ($id && empty($p['display'])) $name = (string) get_post_field('post_title', $id);   /* بدون نام نمایشی، نام فعلی صفحه (با نیم‌فاصله) می‌ماند */
    $old = $id ? tjp_data($id) : array();
    $d = $old;
    foreach (array('roles', 'extra', 'title', 'sp', 'city', 'mode', 'langs', 'ages', 'headline', 'method', 'first', 'trainings', 'supervision',
                   'personal', 'teach', 'supaccept', 'articles', 'links', 'degree', 'since', 'tags', 'alum', 'mentor', 'appear', 'aka', 'focus', 'groups', 'resume', 'cv_url', 'approach',
                   'dept', 'board', 'syllabus', 'works', 'works_note', 'career', 'alma') as $k) {
        if (array_key_exists($k, $p)) $d[$k] = $p[$k];
    }
    /* صفحه‌هایی که کارت این آدم را دارند (برای بخش «کلاس درس» و نشان دانش‌آموخته) */
    if (!array_key_exists('appear', $p) && function_exists('tjd_locate')) {
        $names = array_values(array_unique(array_filter(array_merge(array($name, isset($p['name']) ? $p['name'] : ''), isset($d['aka']) ? (array) $d['aka'] : array()))));
        $seen = array(); $ap = array();
        foreach (tjd_locate($names) as $hh) {
            $sk = $hh['page'] . '|' . $hh['sec'];   /* یک برگه ممکن است دو کارت از یک نفر داشته باشد (درمانگر و سوپروایزر) */
            if (isset($seen[$sk])) continue; $seen[$sk] = 1;
            $ap[] = array('page' => (int) $hh['page'], 'title' => $hh['title'], 'url' => $hh['url'], 'kind' => $hh['kind'], 'sec' => $hh['sec']);
            if (tjp_secrole($hh['sec']) === 'A' && empty($d['alum']) && !array_key_exists('alum', $p)) $d['alum'] = 'مدرسهٔ تجربه';
        }
        $d['appear'] = $ap;
    }
    $users = tjp_find_users($name);
    if (!$users && !empty($p['name'])) $users = tjp_find_users($p['name']);
    $users = array_values(array_filter($users, function ($u) { return count_user_posts($u, 'post', true) > 0; }));
    $d['users'] = $users;
    $status = !empty($p['status']) ? sanitize_key($p['status']) : 'publish';
    /* آدرس انگلیسی؛ آدرس قبلی (مثلاً فارسی) را وردپرس خودش به آدرس تازه ری‌دایرکت می‌کند */
    $cur = $id ? (string) get_post_field('post_name', $id) : '';
    $slug = !empty($p['slug']) ? sanitize_title($p['slug']) : (($cur && preg_match('/^[a-z0-9-]+$/', $cur)) ? $cur : tjp_slug($name, $users));
    $excerpt = tjp_cut(isset($d['headline']) ? $d['headline'] : '', 300);
    $plain = trim(implode("\n\n", array_filter(array(isset($d['headline']) ? $d['headline'] : '', isset($d['method']) ? $d['method'] : '', isset($d['first']) ? $d['first'] : ''))));
    $arr = array('post_type' => 'tj_person', 'post_title' => $name, 'post_name' => $slug, 'post_status' => $status, 'post_excerpt' => $excerpt, 'post_content' => $plain);
    if ($id) { $arr['ID'] = $id; $r = wp_update_post(wp_slash($arr), true); } else { $r = wp_insert_post(wp_slash($arr), true); }
    if (is_wp_error($r)) throw new Exception('post: ' . $r->get_error_message());
    $id = (int) $r;
    update_post_meta($id, '_tjp_key', $key);
    if ($users) update_post_meta($id, '_tjp_user', (string) $users[0]); else delete_post_meta($id, '_tjp_user');

    /* عکسی نفرستاده و صفحه عکس ندارد: همان عکس کارت سایتش (نسخهٔ اصلی فایل) */
    if (empty($p['photo']) && function_exists('tjd_locate')) {
        $nm = array_values(array_unique(array_filter(array($name, isset($p['name']) ? $p['name'] : ''))));
        foreach (tjd_locate($nm) as $hh) {
            $src = isset($hh['f']['photo']) ? (string) $hh['f']['photo'] : '';
            if ($src === '') continue;
            $orig = preg_replace('/-\d+x\d+(?=\.\w+$)/', '', $src);
            $prev = (string) get_post_meta($id, '_tjp_photo_src', true);
            if (!empty($d['img']) && $prev === $orig) break;
            $aid = attachment_url_to_postid(home_url(wp_make_link_relative($orig)));
            $path = $aid ? get_attached_file($aid) : '';
            if (!$path || !file_exists($path)) { $up = wp_upload_dir(); $path = trailingslashit($up['basedir']) . preg_replace('~^.*?/wp-content/uploads/~', '', $src); }
            if ($path && file_exists($path)) { $p['photo'] = base64_encode(file_get_contents($path)); $p['crop'] = array('x' => 0.5, 'y' => 0.45); update_post_meta($id, '_tjp_photo_src', $orig); break; }
        }
    }

    /* عکس: پرتره ۷۲۰×۹۰۰ و ۳۶۰×۴۵۰ و آواتار ۱۶۰ */
    if (!empty($p['photo']) && function_exists('tjd_image')) {
        $c = isset($p['crop']) ? (array) $p['crop'] : array();
        $cp = array('x' => isset($c['x']) ? $c['x'] : 0.5, 'y' => isset($c['y']) ? $c['y'] : 0.42, 'z' => 1);
        $sl = 'tjl-team-' . substr(md5($key), 0, 8);
        $h1 = tjd_image($p['photo'], $cp, 720, 900, 'image/webp'); $m1 = tjd_media($h1['path'], $sl, $name . '، ' . (isset($d['title']) ? tjp_clean($d['title']) : 'مرکز تجربه زندگی'), $name);
        $h2 = tjd_image($p['photo'], $cp, 360, 450, 'image/webp'); $m2 = tjd_media($h2['path'], $sl . '-s', $name, $name);
        $ca = isset($c['x']) ? $c : array();
        $h3 = tjd_image($p['photo'], $ca, 160, 160, 'image/webp'); $m3 = tjd_media($h3['path'], $sl . '-av', $name, $name);
        $oldImg = isset($d['img']) ? (array) $d['img'] : array();
        $d['img'] = array('hero' => $m1['url'], 'hero_s' => $m2['url'], 'avatar' => $m3['url'], 'hero_id' => $m1['id']);
        foreach (array('hero', 'hero_s', 'avatar') as $ik) { if (!empty($oldImg[$ik]) && $oldImg[$ik] !== $d['img'][$ik]) tjp_drop_media($oldImg[$ik]); }
        set_post_thumbnail($id, $m1['id']);
    }

    /* صدا: با ffmpeg نویزگیری و mp3؛ اگر نبود، همان فایل و علامت «پردازش دستی». ready=1 یعنی mp3 تمیزشده از پیش (پاس بازبینی) */
    /* ویس از رسانهٔ خود سایت (mp3 که از پیش آپلود شده)؛ فایل تازه ساخته نمی‌شود */
    if (!empty($p['voice_url'])) {
        $d['voice'] = array('url' => wp_make_link_relative(esc_url_raw((string) $p['voice_url'])),
                            'dur' => isset($p['voice_dur']) ? (float) $p['voice_dur'] : 0, 'mp3' => 1,
                            't' => isset($p['voice_title']) ? (string) $p['voice_title'] : '');
    }
    if (!empty($p['voice']['b64'])) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        $bin = base64_decode((string) $p['voice']['b64'], true);
        if ($bin !== false && strlen($bin) > 500 && strlen($bin) < 25 * 1024 * 1024) {
            $in = wp_tempnam('tjp-voice'); file_put_contents($in, $bin);
            $ff = tjp_ffmpeg(); $mp3 = ''; $dur = isset($p['voice']['dur']) ? (float) $p['voice']['dur'] : 0;
            if (!empty($p['voice']['ready'])) { $mp3 = $in . '.mp3'; @rename($in, $mp3); }
            elseif ($ff) {
                $out = $in . '.mp3';
                $cmd = escapeshellarg($ff) . ' -y -i ' . escapeshellarg($in) . ' -af ' . escapeshellarg('highpass=f=80,lowpass=f=12000,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11')
                     . ' -ac 1 -ar 44100 -c:a libmp3lame -b:a 96k ' . escapeshellarg($out) . ' 2>&1';
                $o = array(); $rc = 1; @exec($cmd, $o, $rc);
                if ($rc === 0 && @filesize($out) > 1000) {
                    $mp3 = $out;
                    foreach ($o as $line) { if (preg_match('/time=(\d+):(\d+):([\d.]+)/', $line, $mm)) $dur = $mm[1] * 3600 + $mm[2] * 60 + (float) $mm[3]; }
                }
            }
            $slv = 'tjl-voice-team-' . substr(md5($key), 0, 8);
            $oldVoice = isset($d['voice']['url']) ? (string) $d['voice']['url'] : '';
            if ($mp3) { $mv = tjd_media($mp3, $slv, 'معرفی ' . $name . ' با صدای خودش', $name); @unlink($in); $d['voice'] = array('url' => $mv['url'], 'dur' => $dur, 'id' => $mv['id'], 'mp3' => 1); }
            else { $raw = $in . '.ogg'; @rename($in, $raw); $mv = tjd_media($raw, $slv, 'معرفی ' . $name . ' با صدای خودش', $name); $d['voice'] = array('url' => $mv['url'], 'dur' => $dur, 'id' => $mv['id'], 'mp3' => 0); }
        }
    }
    if (!empty($oldVoice) && (!isset($d['voice']['url']) || $d['voice']['url'] !== $oldVoice)) tjp_drop_media($oldVoice);
    if (array_key_exists('photo_off', $p) && $p['photo_off']) {
        if (isset($d['img']) && is_array($d['img'])) {
            foreach (array('hero', 'hero_s', 'avatar') as $kk) { if (!empty($d['img'][$kk])) tjp_drop_media($d['img'][$kk]); }
        }
        unset($d['img']);
        update_post_meta($id, '_tjp_photo_src', 'off');
    }
    if (array_key_exists('voice_off', $p) && $p['voice_off']) { if (isset($d['voice']['url'])) tjp_drop_media($d['voice']['url']); unset($d['voice']); }

    update_post_meta($id, '_tjp', wp_slash(wp_json_encode($d, JSON_UNESCAPED_UNICODE)));

    /* Yoast */
    $role = isset($d['title']) && $d['title'] ? tjp_clean($d['title']) : (strpos((string) $d['roles'], 'T') !== false ? 'روان‌درمانگر' : 'استاد و سوپروایزر');
    $role = preg_replace('/\s*·.*$/u', '', $role);
    $t = $name . '، ' . $role . (!empty($d['city']) ? ' در ' . tjp_clean($d['city']) : '') . ' | مرکز تجربه زندگی';
    $lead = !empty($d['headline']) ? tjp_clean($d['headline']) : tjp_cut(tjp_clean(isset($d['method']) ? $d['method'] : ''), 110);
    $desc = tjp_cut(trim($lead . ' ' . (!empty($d['sp']) ? 'رویکرد: ' . tjp_clean($d['sp']) . (!empty($d['city']) ? '، ' . tjp_clean($d['city']) : '') . '.' : '')), 155);
    if (!empty($p['seo_title'])) $t = tjp_cut((string) $p['seo_title'], 90);
    if (!empty($p['seo_desc'])) $desc = tjp_cut((string) $p['seo_desc'], 160);
    update_post_meta($id, '_yoast_wpseo_title', $t);
    update_post_meta($id, '_yoast_wpseo_metadesc', $desc);

    delete_option('tjp_index'); tjp_index(true);
    clean_post_cache($id);
    if (function_exists('wpo_cache_flush')) { wpo_cache_flush(); }
    elseif (class_exists('WPO_Page_Cache') && method_exists('WPO_Page_Cache', 'delete_single_post_cache')) { WPO_Page_Cache::delete_single_post_cache($id); }
    return array('ok' => true, 'id' => $id, 'url' => get_permalink($id), 'slug' => get_post_field('post_name', $id),
                 'voice_mp3' => isset($d['voice']['mp3']) ? (int) $d['voice']['mp3'] : null, 'users' => $users, 'ffmpeg' => (bool) tjp_ffmpeg());
}

} // function_exists
