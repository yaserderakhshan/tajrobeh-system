/**
 * Tajrobeh · دایرکتوری اعضا از بات تلگرام (v1.1)
 *
 * بات تجربه (Apps Script) بعد از بازبینی یاسر، کارت‌های سایت را از همین‌جا به‌روز می‌کند:
 *   عکس، نام نمایشی، خط رویکرد، شهر و تگ‌های کارت‌های .thc (تراپیست) و .supc (استاد و سوپروایزر)
 *   در هر برگهٔ منتشرشده‌ای که آن کارت را دارد؛ و اگر تراپیست کارت ندارد، کارت تازه در صفحهٔ اصلی
 *   (و اگر دانش‌آموختهٔ مدرسه است، در اسلایدر /school/).
 *
 * امنیت: هر درخواست با HMAC-SHA256 امضا می‌شود (?ts=&sig=). کلید را هیچ آدمی نمی‌بیند:
 *   مدیر پنجرهٔ جفت‌شدن را از پیشخوان باز می‌کند (POST /tj/v1/dir/pair-open) و بات کلید را خودش
 *   می‌سازد و یک بار به /tj/v1/dir/pair می‌فرستد.
 * v1.1 (۱۴ مهر ۱۴۰۵): بخش #therapists صفحهٔ اصلی بازطراحی شد و حالا نوار .mq با کارت‌های a.p3 (لینک به /team/<slug>/) است؛
 *   هیچ .thc یا «thc more» در آن نیست و هر کارت تازه با «anchor not found» می‌شکست. حالا:
 *   - کارت a.p3 هم شناخته و به‌روز می‌شود (نام، عکس ۱۵۰، رویکرد کوتاه).
 *   - کارت تازه فقط پیش از نشانگر ثابت می‌نشیند، نه کلاس طراحی: <!-- tj:dir:home --> در 503465 و <!-- tj:dir:school --> در 294.
 *     بازطراحی این دو صفحه بدون نگه داشتن نشانگر ممنوع است (site-check و site-mirror قرمز می‌شوند).
 *   - کارت تازهٔ صفحهٔ اصلی بی لینک /team/ گذاشته نمی‌شود: اگر صفحهٔ تیم نیست، خطای «no team page».
 * v1.2 (۱۸ مهر ۱۴۰۵): op «evlite» برای رویداد سبک J-07 (بات v170.23.38): عکس‌ها، رویداد milestone در evData برگهٔ 505409 و آرشیو ایستا؛ undo برای «برگرداندن» یاسر.
 * هر برگه پیش از ذخیره نسخهٔ قبلی‌اش را در revisions دارد و بعد از ذخیره عیناً بازخوانی می‌شود؛
 * اگر چیزی جز همان کارت‌ها عوض شده باشد، محتوای قبلی برمی‌گردد.
 */

if (!defined('TJD_VER')) {
    define('TJD_VER', '1.2');
    define('TJD_MARK_HOME', '<!-- tj:dir:home -->');
    define('TJD_MARK_SCHOOL', '<!-- tj:dir:school -->');
    define('TJD_HOME', 503465);
    define('TJD_SCHOOL', 294);
    define('TJD_BADGE', '/wp-content/uploads/2026/09/tjl-verified-badge.webp');
}

if (!function_exists('tjd_route')) {

add_action('rest_api_init', function () {
    register_rest_route('tj/v1', '/dir/admin', array(
        'methods' => 'POST',
        'callback' => 'tjd_route',
        'permission_callback' => function () { return current_user_can('manage_options'); },
    ));
    register_rest_route('tj/v1', '/dir', array(
        'methods' => 'POST', 'callback' => 'tjd_route', 'permission_callback' => 'tjd_auth',
    ));
    register_rest_route('tj/v1', '/dir/pair', array(
        'methods' => 'POST', 'callback' => 'tjd_pair', 'permission_callback' => '__return_true',
    ));
    register_rest_route('tj/v1', '/dir/pair-open', array(
        'methods' => 'POST', 'callback' => 'tjd_pair_open',
        'permission_callback' => function () { return current_user_can('manage_options'); },
    ));
});

/* ───── جفت‌شدن ───── */
/* امنیت (بات v170.9): پنجره یک کد یک‌بارمصرف می‌سازد که فقط به مدیر (manage_options) نشان داده می‌شود و باید
   به tgDirPair('<کد>') در بات داده شود. بی کد درست، هیچ‌کس در پنجره کلید نمی‌گذارد. جفت‌شدهٔ قبلی فقط با replace=1 عوض می‌شود. */
function tjd_pair_open(WP_REST_Request $r) {
    $d = json_decode($r->get_body(), true);
    if (get_option('tj_dir_key') && empty($d['replace'])) return array('ok' => false, 'paired' => true, 'msg' => 'already paired; send {"replace":1} to re-pair');
    $code = bin2hex(random_bytes(16));
    update_option('tj_dir_pair_code', hash('sha256', $code), false);
    update_option('tj_dir_pair_until', time() + 600, false);
    return array('ok' => true, 'until' => time() + 600, 'code' => $code, 'paired' => (bool) get_option('tj_dir_key'));
}

function tjd_pair(WP_REST_Request $r) {
    $until = (int) get_option('tj_dir_pair_until', 0);
    if ($until < time()) return new WP_Error('tjd_closed', 'pairing window closed', array('status' => 403));
    $d = json_decode($r->get_body(), true);
    $code = isset($d['code']) ? (string) $d['code'] : '';
    $want = (string) get_option('tj_dir_pair_code', '');
    if ($want === '' || $code === '' || !hash_equals($want, hash('sha256', $code))) return new WP_Error('tjd_code', 'bad pairing code', array('status' => 403));
    $key = isset($d['key']) ? (string) $d['key'] : '';
    if (!preg_match('/^[A-Za-z0-9]{48,128}$/', $key)) return new WP_Error('tjd_bad', 'bad key', array('status' => 400));
    update_option('tj_dir_key', $key, false);
    delete_option('tj_dir_pair_until');
    delete_option('tj_dir_pair_code');
    return array('ok' => true);
}

function tjd_auth(WP_REST_Request $r) {
    $key = (string) get_option('tj_dir_key', '');
    if ($key === '') return new WP_Error('tjd_nokey', 'not paired', array('status' => 403));
    $ts = (int) $r->get_param('ts');
    $sig = strtolower((string) $r->get_param('sig'));
    if (abs(time() - $ts) > 300) return new WP_Error('tjd_ts', 'stale', array('status' => 403));
    $calc = hash_hmac('sha256', $ts . '.' . $r->get_body(), $key);
    if (!hash_equals($calc, $sig)) return new WP_Error('tjd_sig', 'bad signature', array('status' => 403));
    $once = 'tjd_n_' . substr($calc, 0, 24);
    if (get_transient($once)) return new WP_Error('tjd_replay', 'replay', array('status' => 403));
    set_transient($once, 1, 900);
    return true;
}

/* ───── مسیر اصلی ───── */
function tjd_route(WP_REST_Request $r) {
    $d = json_decode($r->get_body(), true);
    if (!is_array($d)) return new WP_Error('tjd_json', 'bad json', array('status' => 400));
    $op = isset($d['op']) ? $d['op'] : '';
    try {
        if ($op === 'ping') {
            return array('ok' => true, 'v' => TJD_VER, 'webp' => wp_image_editor_supports(array('mime_type' => 'image/webp')));
        }
        if ($op === 'find') return tjd_find($d);
        if ($op === 'preview') return tjd_preview($d);
        if ($op === 'publish') return tjd_publish($d);
        if ($op === 'evlite') return tjd_evlite($d);   /* v1.2: رویداد سبک J-07 */
        if ($op === 'person') {
            if (!function_exists('tjp_upsert')) throw new Exception('people snippet missing');
            return tjp_upsert(isset($d['person']) ? (array) $d['person'] : array());
        }
    } catch (Throwable $e) {
        return new WP_Error('tjd_err', $e->getMessage(), array('status' => 500));
    }
    return new WP_Error('tjd_op', 'unknown op', array('status' => 400));
}

/* ───── نام ───── */
function tjd_norm($s) {
    $s = wp_strip_all_tags((string) $s);
    $s = preg_replace('/^\s*دکتر\s+/u', '', $s);
    $s = preg_replace('/\(.*?\)/u', '', $s);
    $s = strtr($s, array('ي' => 'ی', 'ك' => 'ک', 'ئ' => 'ی', 'آ' => 'ا', 'أ' => 'ا', 'ؤ' => 'و', 'ة' => 'ه', 'ۀ' => 'ه'));
    $s = preg_replace('/[\x{200B}-\x{200F}\x{FEFF}\s]+/u', '', $s);
    $s = str_replace('وو', 'و', $s);
    return mb_strtolower($s);
}

function tjd_names_match($cardName, $names) {
    $c = tjd_norm($cardName);
    if ($c === '') return false;
    foreach ((array) $names as $n) { if ($n !== '' && tjd_norm($n) === $c) return true; }
    return false;
}

/* ───── کارت‌ها ───── */
function tjd_div_end($html, $s) {
    $depth = 0; $i = $s; $len = strlen($html);
    while ($i < $len) {
        $o = strpos($html, '<div', $i);
        $c = strpos($html, '</div>', $i);
        if ($c === false) return false;
        if ($o !== false && $o < $c) { $depth++; $i = $o + 4; continue; }
        $depth--; $i = $c + 6;
        if ($depth === 0) return $i;
    }
    return false;
}

function tjd_cards($html) {
    $out = array();
    foreach (array('thc', 'supc') as $kind) {
        $needle = '<div class="' . $kind . '"';
        $off = 0;
        while (($s = strpos($html, $needle, $off)) !== false) {
            $after = substr($html, $s + strlen($needle), 1);
            if ($after !== '>' && $after !== ' ') { $off = $s + 1; continue; }
            $e = tjd_div_end($html, $s);
            if ($e === false) break;
            $card = substr($html, $s, $e - $s);
            $out[] = array('kind' => $kind, 's' => $s, 'e' => $e, 'html' => $card, 'f' => tjd_fields($kind, $card),
                           'sec' => tjd_section($html, $s));
            $off = $e;
        }
    }
    /* v1.1: کارت نوار صفحهٔ اصلی <a class="p3" href="/team/<slug>/">…</a> (لینک تودرتو ندارد) */
    $off = 0;
    while (($s = strpos($html, '<a class="p3"', $off)) !== false) {
        $e = strpos($html, '</a>', $s);
        if ($e === false) break;
        $e += 4;
        $card = substr($html, $s, $e - $s);
        $out[] = array('kind' => 'p3', 's' => $s, 'e' => $e, 'html' => $card, 'f' => tjd_fields('p3', $card), 'sec' => tjd_section($html, $s));
        $off = $e;
    }
    usort($out, function ($a, $b) { return $a['s'] - $b['s']; });
    return $out;
}

function tjd_section($html, $s) {
    if (preg_match_all('/<(?:section|div)[^>]*\sid="([^"]+)"/', substr($html, 0, $s), $m)) return end($m[1]);
    return '';
}

function tjd_fields($kind, $card) {
    $f = array('name' => '', 'photo' => '', 'sp' => '', 'city' => '', 'tags' => '', 'badges' => array());
    if (preg_match('/<b>(.*?)<\/b>/su', $card, $m)) $f['name'] = trim(wp_strip_all_tags($m[1]));
    if ($kind === 'p3') {
        if (preg_match('/<img[^>]*\ssrc="([^"]*)"/', $card, $m)) $f['photo'] = $m[1];
        if (preg_match('/<small>(.*?)<\/small>/su', $card, $m)) $f['sp'] = trim(wp_strip_all_tags($m[1]));
        if (preg_match('/href="([^"]*)"/', $card, $m)) $f['href'] = $m[1];
    } elseif ($kind === 'thc') {
        if (preg_match('/<img class="ph" src="([^"]*)"/', $card, $m)) $f['photo'] = $m[1];
        if (preg_match('/<span class="sp">(.*?)<\/span>/su', $card, $m)) $f['sp'] = trim(wp_strip_all_tags($m[1]));
        if (preg_match('/<span class="loc">(?:<svg.*?<\/svg>)?([^<]*)<\/span>/su', $card, $m)) $f['city'] = trim($m[1]);
        if (preg_match('/data-tags="([^"]*)"/', $card, $m)) $f['tags'] = $m[1];
        foreach (array('sch', 'mnt', 'pen') as $b) { if (strpos($card, 'class="' . $b . '"') !== false) $f['badges'][] = $b; }
    } else {
        if (preg_match('/<img[^>]*\ssrc="([^"]*)"/', $card, $m)) $f['photo'] = $m[1];
        if (preg_match('/<span class="ap">(.*?)<\/span>/su', $card, $m)) $f['sp'] = trim(wp_strip_all_tags($m[1]));
    }
    return $f;
}

function tjd_pages() {
    global $wpdb;
    $ids = $wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type = 'page' AND post_status = 'publish'
        AND (post_content LIKE '%class=\"thc%' OR post_content LIKE '%class=\"supc%' OR post_content LIKE '%class=\"p3\"%') ORDER BY ID");
    return array_map('intval', $ids);
}

/* همهٔ کارت‌های یک نفر در همهٔ برگه‌ها */
function tjd_locate($names) {
    $hits = array();
    foreach (tjd_pages() as $pid) {
        $html = get_post_field('post_content', $pid, 'raw');
        foreach (tjd_cards($html) as $c) {
            if (!tjd_names_match($c['f']['name'], $names)) continue;
            $hits[] = array('page' => $pid, 'title' => get_the_title($pid), 'url' => get_permalink($pid),
                            'kind' => $c['kind'], 'sec' => $c['sec'], 'f' => $c['f']);
        }
    }
    return $hits;
}

function tjd_find($d) {
    $names = isset($d['names']) ? (array) $d['names'] : array();
    return array('ok' => true, 'hits' => tjd_locate($names));
}

/* ───── عکس ───── */
function tjd_clamp($v, $a, $b) { return max($a, min($b, $v)); }

/* crop = {x,y: مرکز قاب نسبت به عرض و ارتفاع · z: اندازهٔ قاب نسبت به بزرگ‌ترین قاب ممکن} */
function tjd_image($b64, $crop, $w, $h, $mime) {
    require_once ABSPATH . 'wp-admin/includes/file.php';
    $bin = base64_decode((string) $b64, true);
    if ($bin === false || strlen($bin) < 200) throw new Exception('image missing');
    if (strlen($bin) > 15 * 1024 * 1024) throw new Exception('image too large');
    $tmp = wp_tempnam('tjd-src');
    file_put_contents($tmp, $bin);
    $ed = wp_get_image_editor($tmp);
    if (is_wp_error($ed)) { @unlink($tmp); throw new Exception('not an image: ' . $ed->get_error_message()); }
    if (method_exists($ed, 'maybe_exif_rotate')) $ed->maybe_exif_rotate();
    $sz = $ed->get_size();
    $W = (float) $sz['width']; $H = (float) $sz['height'];
    if ($W < 120 || $H < 120) { @unlink($tmp); throw new Exception('image too small'); }
    $ar = $w / $h;
    $x = isset($crop['x']) ? (float) $crop['x'] : 0.5;
    $y = isset($crop['y']) ? (float) $crop['y'] : ($H > $W * 1.1 ? 0.4 : 0.45);
    $z = tjd_clamp(isset($crop['z']) ? (float) $crop['z'] : 0.9, 0.3, 1.0);
    $cw = min($W, $H * $ar) * $z; $ch = $cw / $ar;
    $sx = tjd_clamp($x * $W - $cw / 2, 0, $W - $cw);
    $sy = tjd_clamp($y * $H - $ch / 2, 0, $H - $ch);
    $ed->crop((int) round($sx), (int) round($sy), (int) round($cw), (int) round($ch), $w, $h);
    $ed->set_quality($mime === 'image/webp' ? 86 : 84);
    $out = $tmp . ($mime === 'image/webp' ? '.webp' : '.jpg');
    $saved = $ed->save($out, $mime);
    @unlink($tmp);
    if (is_wp_error($saved)) throw new Exception('save failed: ' . $saved->get_error_message());
    return array('path' => $saved['path'], 'src' => array('w' => (int) $W, 'h' => (int) $H),
                 'crop' => array('x' => round($x, 3), 'y' => round($y, 3), 'z' => round($z, 3)));
}

function tjd_preview($d) {
    $kind = (isset($d['kind']) && $d['kind'] === 'supc') ? 'supc' : 'thc';
    $w = 400; $h = $kind === 'supc' ? 472 : 400;
    $img = tjd_image(isset($d['photo']) ? $d['photo'] : '', isset($d['crop']) ? (array) $d['crop'] : array(), $w, $h, 'image/jpeg');
    $b64 = base64_encode(file_get_contents($img['path']));
    @unlink($img['path']);
    return array('ok' => true, 'jpg' => $b64, 'src' => $img['src'], 'crop' => $img['crop']);
}

function tjd_media($path, $slug, $title, $alt) {
    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    $up = wp_upload_dir();
    $ext = pathinfo($path, PATHINFO_EXTENSION);
    $name = wp_unique_filename($up['path'], $slug . '.' . $ext);
    $dest = trailingslashit($up['path']) . $name;
    if (!@rename($path, $dest)) { if (!@copy($path, $dest)) throw new Exception('move failed'); @unlink($path); }
    @chmod($dest, 0644);
    $type = wp_check_filetype($name);
    $id = wp_insert_attachment(array('post_mime_type' => $type['type'], 'post_title' => $title,
                                     'post_status' => 'inherit', 'post_content' => ''), $dest);
    if (is_wp_error($id) || !$id) throw new Exception('attachment failed');
    wp_update_attachment_metadata($id, wp_generate_attachment_metadata($id, $dest));
    update_post_meta($id, '_wp_attachment_image_alt', $alt);
    $url = wp_get_attachment_url($id);
    return array('id' => $id, 'url' => wp_make_link_relative($url));
}

/* ───── ویرایش کارت ───── */
function tjd_attr($s) { return esc_attr(wp_strip_all_tags((string) $s)); }
function tjd_txt($s) { return esc_html(wp_strip_all_tags((string) $s)); }

function tjd_rep($pattern, $card, $fn) {
    $n = 0;
    $out = preg_replace_callback($pattern, $fn, $card, 1, $n);
    return array($out === null ? $card : $out, $n);
}

function tjd_ini($name) {
    $n = trim(preg_replace('/^\s*دکتر\s+/u', '', (string) $name));
    $p = preg_split('/\s+/u', $n);
    $a = mb_substr($p[0], 0, 1);
    $b = (count($p) > 1) ? mb_substr($p[count($p) - 1], 0, 1) : '';
    return esc_html($b !== '' ? $a . '·' . $b : $a);
}

function tjd_patch($kind, $card, $f) {
    $done = array();
    $old = tjd_fields($kind, $card);
    if ($kind === 'p3') {   /* v1.1: نام، عکس و رویکرد کوتاه؛ شهر و تگ ندارد */
        if (!empty($f['name']) && tjd_norm($f['name']) !== '' && $f['name'] !== $old['name']) {
            list($card, $n) = tjd_rep('/<b>.*?<\/b>/su', $card, function () use ($f) { return '<b>' . tjd_txt($f['name']) . '</b>'; });
            if ($n) $done[] = 'name';
        }
        if (!empty($f['photo']) && $f['photo'] !== $old['photo']) {
            list($card, $n) = tjd_rep('/(<img[^>]*\ssrc=")[^"]*(")/', $card, function ($m) use ($f) { return $m[1] . esc_url($f['photo']) . $m[2]; });
            if ($n) $done[] = 'photo';
        }
        if (isset($f['sp']) && trim($f['sp']) !== '' && trim($f['sp']) !== $old['sp']) {
            if (strpos($card, '<small>') !== false) list($card, $n) = tjd_rep('/<small>.*?<\/small>/su', $card, function () use ($f) { return '<small>' . tjd_txt($f['sp']) . '</small>'; });
            else list($card, $n) = tjd_rep('/<\/b>/', $card, function () use ($f) { return '</b><small>' . tjd_txt($f['sp']) . '</small>'; });
            if ($n) $done[] = 'sp';
        }
        return array($card, $done);
    }
    if (!empty($f['name']) && tjd_norm($f['name']) !== '' && $f['name'] !== $old['name']) {
        list($card, $n) = tjd_rep('/<b>.*?<\/b>/su', $card, function () use ($f) { return '<b>' . tjd_txt($f['name']) . '</b>'; });
        if ($old['name'] !== '') $card = str_replace('alt="' . esc_attr($old['name']) . '"', 'alt="' . tjd_attr($f['name']) . '"', $card);
        if ($n) $done[] = 'name';
    }
    if (!empty($f['photo_off'])) {
        if ($kind === 'thc') return array('', array('card_removed'));
        $nm0 = !empty($f['name']) ? $f['name'] : $old['name'];
        $ini = tjd_ini($nm0);
        $reOff = $kind === 'thc' ? '/<img class="ph" src="[^"]*"[^>]*>/su' : '/<img[^>]*\ssrc="[^"]*"[^>]*>/su';
        list($card, $n) = tjd_rep($reOff, $card, function () use ($ini) { return '<span class="ph ini" aria-hidden="true">' . $ini . '</span>'; });
        if ($n) $done[] = 'photo_off';
    } elseif (!empty($f['photo']) && strpos($card, 'class="ph ini"') !== false) {
        $nm0 = !empty($f['name']) ? $f['name'] : $old['name'];
        list($card, $n) = tjd_rep('/<span class="ph ini"[^>]*>.*?<\/span>/su', $card, function () use ($f, $nm0) {
            return '<img class="ph" src="' . esc_url($f['photo']) . '" alt="' . tjd_attr($nm0) . '" width="92" height="92" loading="lazy">';
        });
        if ($n) $done[] = 'photo_on';
    } elseif (!empty($f['photo'])) {
        $re = $kind === 'thc' ? '/(<img class="ph" src=")[^"]*(")/' : '/(<img[^>]*\ssrc=")[^"]*(")/';
        list($card, $n) = tjd_rep($re, $card, function ($m) use ($f) { return $m[1] . esc_url($f['photo']) . $m[2]; });
        if ($n) $done[] = 'photo';
    }
    if (isset($f['sp']) && trim($f['sp']) !== '' && trim($f['sp']) !== $old['sp']) {
        $cls = $kind === 'thc' ? 'sp' : 'ap';
        list($card, $n) = tjd_rep('/<span class="' . $cls . '">.*?<\/span>/su', $card,
            function () use ($f, $cls) { return '<span class="' . $cls . '">' . tjd_txt($f['sp']) . '</span>'; });
        if ($n) $done[] = 'sp';
    }
    if ($kind === 'thc' && isset($f['city']) && trim($f['city']) !== '' && trim($f['city']) !== $old['city']) {
        $city = tjd_txt($f['city']);
        if (strpos($card, '<span class="loc">') !== false) {
            list($card, $n) = tjd_rep('/(<span class="loc">(?:<svg.*?<\/svg>)?)[^<]*(<\/span>)/su', $card,
                function ($m) use ($city) { return $m[1] . $city . $m[2]; });
        } elseif (strpos($card, '<span class="meta">') !== false) {
            list($card, $n) = tjd_rep('/<span class="meta">/', $card,
                function () use ($city) { return '<span class="meta"><span class="loc">' . $city . '</span>'; });
        } else {
            $card = substr($card, 0, -6) . '<span class="meta"><span class="loc">' . $city . '</span></span></div>'; $n = 1;
        }
        if (!empty($n)) $done[] = 'city';
    }
    if ($kind === 'thc' && isset($f['tags']) && trim($f['tags']) !== '' && strpos($card, 'data-tags="') !== false
        && trim($f['tags']) !== $old['tags']) {
        list($card, $n) = tjd_rep('/data-tags="[^"]*"/', $card, function () use ($f) { return 'data-tags="' . tjd_attr(tjd_tags($f['tags'])) . '"'; });
        if ($n) $done[] = 'tags';
    }
    return array($card, $done);
}

function tjd_tags($t) {
    $ok = array('lacan', 'object', 'classic', 'modern', 'cbt', 'schema', 'eft', 'mbt', 'child', 'psy', 'writer', 'school', 'abroad');
    $out = array();
    foreach (preg_split('/[\s,،]+/u', strtolower((string) $t)) as $x) { if (in_array($x, $ok, true) && !in_array($x, $out, true)) $out[] = $x; }
    return implode(' ', $out);
}

function tjd_new_card($f, $withTags) {
    $name = tjd_txt($f['name']);
    $meta = '';
    if (!empty($f['city'])) $meta .= '<span class="loc">' . tjd_txt($f['city']) . '</span>';
    if (!empty($f['school'])) $meta .= '<span class="sch" title="دانش‌آموخته‌ی مدرسه تجربه زندگی">مدرسه‌ی تجربه</span>';
    $tags = $withTags ? ' data-tags="' . tjd_attr(tjd_tags(isset($f['tags']) ? $f['tags'] : '')) . '"' : '';
    return '<div class="thc"' . $tags . '><img class="vf" src="' . TJD_BADGE . '" alt="تأییدشده" width="18" height="18" loading="lazy">'
         . '<img class="ph" src="' . esc_url($f['photo']) . '" alt="' . tjd_attr($f['name']) . '" width="92" height="92" loading="lazy">'
         . '<b>' . $name . '</b><span class="sp">' . tjd_txt(isset($f['sp']) ? $f['sp'] : '') . '</span>'
         . ($meta !== '' ? '<span class="meta">' . $meta . '</span>' : '') . '</div>';
}

/* v1.1: کارت نوار صفحهٔ اصلی؛ بی لینک صفحهٔ تیم ساخته نمی‌شود */
function tjd_new_p3($f, $href) {
    return '<a class="p3" href="' . esc_url($href) . '"><img src="' . esc_url($f['photo']) . '" alt="" width="40" height="40" loading="lazy">'
         . '<span><b>' . tjd_txt($f['name']) . '</b><small>' . tjd_txt(isset($f['sp']) ? $f['sp'] : '') . '</small></span></a>';
}
/* v1.1: لینک صفحهٔ /team/ این نفر: از بات (team: نشانی یا اسلاگ) یا پست tj_person با همین نام */
function tjd_team_href($names, $d) {
    $t = isset($d['team']) ? trim((string) $d['team']) : '';
    if ($t !== '') {
        if (preg_match('#/team/([a-z0-9-]+)/?#', $t, $m)) return '/team/' . $m[1] . '/';
        if (preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $t)) return '/team/' . $t . '/';
    }
    if (!post_type_exists('tj_person')) return '';
    $ps = get_posts(array('post_type' => 'tj_person', 'post_status' => 'publish', 'numberposts' => 500, 'fields' => 'ids'));
    foreach ($ps as $id) {
        if (tjd_names_match(get_the_title($id), $names)) return wp_make_link_relative(get_permalink($id));
    }
    return '';
}
/* کارت تازه فقط پیش از نشانگر ثابت همان برگه (نه کلاس طراحی). نشانگر باید دقیقاً یک بار باشد. */
function tjd_insert_card($html, $card, $marker) {
    if (substr_count($html, $marker) !== 1) return false;
    $p = strpos($html, $marker);
    return substr($html, 0, $p) . $card . "\n" . substr($html, $p);
}

/* برگه را مستقیم ذخیره می‌کند (بی‌فیلتر، پس هیچ جای دیگرِ برگه دست نمی‌خورد)، نسخهٔ قبلی در revisions می‌ماند
   و بعد عیناً بازخوانی می‌شود؛ اگر نخواند، محتوای قبلی برمی‌گردد */
function tjd_save_page($pid, $old, $new) {
    global $wpdb;
    if ($old === $new) return true;
    $cur = $wpdb->get_var($wpdb->prepare("SELECT post_content FROM {$wpdb->posts} WHERE ID = %d", $pid));
    if ($cur !== $old) return false; // کسی همین حالا برگه را عوض کرده
    if (function_exists('wp_save_post_revision')) wp_save_post_revision($pid);
    $ok = $wpdb->update($wpdb->posts, array('post_content' => $new, 'post_modified' => current_time('mysql'),
                                            'post_modified_gmt' => current_time('mysql', 1)), array('ID' => $pid));
    clean_post_cache($pid);
    $back = $wpdb->get_var($wpdb->prepare("SELECT post_content FROM {$wpdb->posts} WHERE ID = %d", $pid));
    if ($ok === false || $back !== $new) {
        $wpdb->update($wpdb->posts, array('post_content' => $old), array('ID' => $pid));
        clean_post_cache($pid);
        return false;
    }
    if (function_exists('wp_save_post_revision')) wp_save_post_revision($pid);
    if (class_exists('WPO_Page_Cache')) {
        if (method_exists('WPO_Page_Cache', 'delete_single_post_cache')) WPO_Page_Cache::delete_single_post_cache($pid);
        if ((int) get_option('page_on_front') === $pid && method_exists('WPO_Page_Cache', 'delete_homepage_cache')) WPO_Page_Cache::delete_homepage_cache();
    }
    do_action('tjd_page_updated', $pid);
    return true;
}

/*
 * publish: { names:[...], kind:'thc'|'supc'|'any', f:{name, sp, city, tags, school},
 *            photo:<b64>|'' , crop:{x,y,z}, create:bool, dry:bool, slug:'...' }
 */
function tjd_publish($d) {
    $names = isset($d['names']) ? array_values(array_filter((array) $d['names'])) : array();
    if (!$names) throw new Exception('names missing');
    $f = isset($d['f']) ? (array) $d['f'] : array();
    $dry = !empty($d['dry']);
    $create = !empty($d['create']);
    $slug = sanitize_title(isset($d['slug']) ? $d['slug'] : 'member');
    $display = !empty($f['name']) ? $f['name'] : (!empty($d['display']) ? $d['display'] : $names[0]);
    $alt = $display . (!empty($f['sp']) ? '، ' . $f['sp'] : '');
    $media = array();
    $photoFor = function ($kind) use (&$media, $d, $dry, $slug, $display, $alt) {
        if (empty($d['photo'])) return '';
        if (isset($media[$kind])) return $media[$kind]['url'];
        if ($dry) { $media[$kind] = array('id' => 0, 'url' => '/dry-run.webp'); return $media[$kind]['url']; }
        $w = $kind === 'p3' ? 150 : 400; $h = $kind === 'supc' ? 472 : ($kind === 'p3' ? 150 : 400);
        $img = tjd_image($d['photo'], isset($d['crop']) ? (array) $d['crop'] : array(), $w, $h, 'image/webp');
        $media[$kind] = tjd_media($img['path'], ($kind === 'supc' ? 'tjl-sup-' : ($kind === 'p3' ? 'tjl-p3-' : 'tjl-th2-')) . $slug,
                                  $display . '، ' . ($kind === 'supc' ? 'استاد مرکز تجربه زندگی' : 'تراپیست مرکز تجربه زندگی'), $alt);
        return $media[$kind]['url'];
    };

    $report = array();
    $pages = tjd_pages();
    $foundThcHome = false; $foundThcSchool = false;
    foreach ($pages as $pid) {
        $old = get_post_field('post_content', $pid, 'raw');
        $cards = tjd_cards($old);
        $new = $old; $shift = 0; $changes = array();
        foreach ($cards as $c) {
            if (!tjd_names_match($c['f']['name'], $names)) continue;
            if (($c['kind'] === 'thc' || $c['kind'] === 'p3') && $pid === TJD_HOME) $foundThcHome = true;
            if ($c['kind'] === 'thc' && $pid === TJD_SCHOOL) $foundThcSchool = true;
            $ff = $f;
            unset($ff['school']);
            if ($c['kind'] === 'supc') { unset($ff['city'], $ff['tags']); if (empty($d['supc_sp'])) unset($ff['sp']); }
            if ($c['kind'] === 'p3') unset($ff['city'], $ff['tags']);
            $ff['photo'] = (!empty($d['photo']) && ($c['kind'] === 'thc' || $c['kind'] === 'p3' || !empty($d['supc_photo']))) ? $photoFor($c['kind']) : '';
            list($card2, $done) = tjd_patch($c['kind'], $c['html'], $ff);
            if (!$done) continue;
            $s = $c['s'] + $shift;
            $new = substr($new, 0, $s) . $card2 . substr($new, $s + strlen($c['html']));
            $shift += strlen($card2) - strlen($c['html']);
            $changes[] = array('kind' => $c['kind'], 'sec' => $c['sec'], 'done' => $done);
        }
        if ($changes) $report[$pid] = array('page' => $pid, 'title' => get_the_title($pid), 'url' => get_permalink($pid),
                                            'changes' => $changes, 'old' => $old, 'new' => $new);
    }

    // کارت تازه برای تراپیستی که در صفحهٔ اصلی کارت ندارد
    $kindWanted = isset($d['kind']) ? $d['kind'] : 'thc';
    if ($create && $kindWanted !== 'supc') {
        $targets = array();
        if (!$foundThcHome) $targets[] = TJD_HOME;
        if (!empty($f['school']) && !$foundThcSchool) $targets[] = TJD_SCHOOL;
        foreach ($targets as $pid) {
            if (empty($d['photo'])) { $report['err_' . $pid] = array('page' => $pid, 'error' => 'no photo for new card'); continue; }
            if (empty($f['sp'])) { $report['err_' . $pid] = array('page' => $pid, 'error' => 'no sp for new card'); continue; }
            $base = isset($report[$pid]) ? $report[$pid]['new'] : get_post_field('post_content', $pid, 'raw');
            $cf = $f; $cf['name'] = $display;
            if ($pid === TJD_HOME) {
                /* v1.1: نوار a.p3 با لینک صفحهٔ تیم؛ بی صفحهٔ تیم کارت بی‌لینک گذاشته نمی‌شود */
                $href = tjd_team_href(array_merge($names, array($display)), $d);
                if ($href === '') { $report['err_' . $pid] = array('page' => $pid, 'error' => 'no team page'); continue; }
                $cf['photo'] = $photoFor('p3');
                $ins = tjd_insert_card($base, tjd_new_p3($cf, $href), TJD_MARK_HOME);
                $mk = 'tj:dir:home';
            } else {
                $cf['photo'] = $photoFor('thc');
                $ins = tjd_insert_card($base, tjd_new_card($cf, false), TJD_MARK_SCHOOL);
                $mk = 'tj:dir:school';
            }
            if ($ins === false) { $report['err_' . $pid] = array('page' => $pid, 'error' => 'marker missing: ' . $mk); continue; }
            if (!isset($report[$pid])) $report[$pid] = array('page' => $pid, 'title' => get_the_title($pid), 'url' => get_permalink($pid),
                                                            'changes' => array(), 'old' => get_post_field('post_content', $pid, 'raw'));
            $report[$pid]['new'] = $ins;
            $report[$pid]['changes'][] = array('kind' => $pid === TJD_HOME ? 'p3' : 'thc', 'sec' => $pid === TJD_HOME ? 'therapists' : 'alumni', 'done' => array('new'));
        }
    }

    $out = array('ok' => true, 'dry' => $dry, 'pages' => array(), 'errors' => array(), 'media' => array());
    foreach ($report as $k => $rp) {
        if (isset($rp['error'])) { $out['errors'][] = $rp; continue; }
        // نگهبان: بیرون از کارت‌ها نباید چیزی عوض شده باشد
        $delta = strlen($rp['new']) - strlen($rp['old']);
        $okSave = $dry ? true : tjd_save_page($rp['page'], $rp['old'], $rp['new']);
        $out['pages'][] = array('page' => $rp['page'], 'title' => $rp['title'], 'url' => $rp['url'],
                                'changes' => $rp['changes'], 'saved' => $okSave, 'delta' => $delta);
        if (!$okSave) $out['errors'][] = array('page' => $rp['page'], 'error' => 'save verify failed, restored');
    }
    foreach ($media as $k => $m) $out['media'][$k] = $m;
    return $out;
}

/* ───── رویداد سبک J-07 (بات v170.23.38): op «evlite» ─────
 * { ev:{i,d,t,ttl,k:'milestone',c,a,ap,p,pl,s,ig,g,sh,fb}, photos:[{b64,alt}] (حداکثر ۳), arch:{year,md}, dry }
 * یا { undo:1, i }. عکس‌ها فشرده (عرض حداکثر ۱۶۰۰، webp) و تامنیل «medium» وردپرس؛ یک فایل استوری ۱۰۸۰×۱۹۲۰ از عکس اول.
 * رویداد در evData برگهٔ 505409 (بی بازچینی بقیه) و دکمهٔ ایستای آرشیو در سال شمسی خودش (بخش ۵ اسکیل tajrobeh-events).
 * پیش از هر ویرایش، رفت‌وبرگشت JSON سنجیده می‌شود: اگر encode(decode(evData)) عین متن برگه نبود، چیزی نوشته نمی‌شود. */
if (!defined('TJD_EV_PAGE')) define('TJD_EV_PAGE', 505409);
function tjd_fa($n) { return strtr((string) $n, array('0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹')); }
function tjd_unfa($s) { return (int) strtr((string) $s, array('۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9')); }
function tjd_ev_json($obj) {
    return str_replace('</', '<\/', wp_json_encode($obj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS));
}
function tjd_ev_split($html) {
    if (!preg_match('#(<script type="application/json" id="evData">)(.*?)(</script>)#s', $html, $m, PREG_OFFSET_CAPTURE)) throw new Exception('evData missing');
    $raw = $m[2][0];
    $D = json_decode($raw);
    if (!is_object($D) || !isset($D->events) || !is_array($D->events)) throw new Exception('evData invalid');
    if (tjd_ev_json($D) !== $raw) throw new Exception('evData roundtrip mismatch');
    return array('D' => $D, 'start' => $m[2][1], 'len' => strlen($raw));
}
function tjd_ev_clean($ev, $D) {
    $t = function ($v, $n) { return mb_substr(trim(wp_strip_all_tags((string) $v)), 0, $n); };
    $o = new stdClass();
    $o->i = (string) (isset($ev['i']) ? $ev['i'] : '');
    if (!preg_match('/^[a-z0-9][a-z0-9-]{2,60}$/', $o->i)) throw new Exception('bad id');
    $o->d = (string) (isset($ev['d']) ? $ev['d'] : '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $o->d)) throw new Exception('bad date');
    $o->t = '';
    $o->ttl = $t(isset($ev['ttl']) ? $ev['ttl'] : '', 120);
    if ($o->ttl === '') throw new Exception('no title');
    $o->k = 'milestone';
    $o->c = (string) (isset($ev['c']) ? $ev['c'] : '');
    if (!isset($D->C->{$o->c})) throw new Exception('unknown course');
    $o->a = (isset($ev['a']) && in_array($ev['a'], array('free', 'members', 'reg'), true)) ? $ev['a'] : 'members';
    $o->ap = 'inter';
    for ($k = count($D->events) - 1; $k >= 0; $k--) { $x = $D->events[$k]; if (isset($x->c, $x->ap) && $x->c === $o->c && isset($D->A->{$x->ap})) { $o->ap = $x->ap; break; } }
    $o->p = array();
    foreach ((array) (isset($ev['p']) ? $ev['p'] : array()) as $pk) { if (is_string($pk) && isset($D->P->{$pk})) $o->p[] = $pk; }
    $o->pl = $t(isset($ev['pl']) ? $ev['pl'] : '', 60);
    $o->s = $t(isset($ev['s']) ? $ev['s'] : '', 400);
    $o->ig = array();
    $o->g = (string) (isset($ev['g']) ? $ev['g'] : '');
    if (!isset($D->G->{$o->g})) throw new Exception('unknown group');
    $o->sh = $t(isset($ev['sh']) ? $ev['sh'] : $o->ttl, 60);
    if (!empty($ev['fb']) && is_array($ev['fb'])) {
        $o->fb = array();
        foreach (array_slice($ev['fb'], 0, 3) as $f) {
            $q = $t(isset($f['text']) ? $f['text'] : '', 300);
            if ($q !== '') { $x = new stdClass(); $x->name = $t(isset($f['name']) ? $f['name'] : '', 40); $x->text = $q; $o->fb[] = $x; }
        }
        if (!$o->fb) unset($o->fb);
    }
    return $o;
}
function tjd_ev_photo($b64, $slug, $title, $alt) {
    require_once ABSPATH . 'wp-admin/includes/file.php';
    $bin = base64_decode((string) $b64, true);
    if ($bin === false || strlen($bin) < 200) throw new Exception('image missing');
    if (strlen($bin) > 15 * 1024 * 1024) throw new Exception('image too large');
    $tmp = wp_tempnam('tjd-ev');
    file_put_contents($tmp, $bin);
    $ed = wp_get_image_editor($tmp);
    if (is_wp_error($ed)) { @unlink($tmp); throw new Exception('not an image'); }
    if (method_exists($ed, 'maybe_exif_rotate')) $ed->maybe_exif_rotate();
    $sz = $ed->get_size();
    if ($sz['width'] > 1600) $ed->resize(1600, null, false);
    $ed->set_quality(82);
    $saved = $ed->save($tmp . '.webp', 'image/webp');
    @unlink($tmp);
    if (is_wp_error($saved)) throw new Exception('save failed');
    $m = tjd_media($saved['path'], $slug, $title, $alt);
    $th = wp_get_attachment_image_src($m['id'], 'medium');
    return array('id' => $m['id'], 'u' => $m['url'], 't' => $th ? wp_make_link_relative($th[0]) : $m['url']);
}
function tjd_ev_icon($html, $g, $D = null) {
    if ($D && isset($D->ICONS->{$g})) return '<span class="ic">' . $D->ICONS->{$g} . '</span>';
    if (preg_match('#data-g="' . preg_quote($g, '#') . '" data-ev="[^"]*"><time[^>]*>[^<]*</time>(<span class="ic">.*?</span>)<span><b>#s', $html, $m)) return $m[1];
    if (preg_match('#<span data-g="' . preg_quote($g, '#') . '" title="[^"]*">(<span class="ic">.*?</span>)#s', $html, $m)) return $m[1];
    return '';
}
/* آرشیو ایستا: افزودن یا برداشتن دکمه و شمارها؛ +1 یا -1 */
function tjd_ev_arch($html, $o, $D, $arch, $dir) {
    $a0 = strpos($html, 'id="archive"');
    if ($a0 === false) throw new Exception('archive missing');
    $a1 = strpos($html, '</section>', $a0);
    $sec = substr($html, $a0, $a1 - $a0);
    $label = isset($D->G->{$o->g}[0]) ? $D->G->{$o->g}[0] : '';
    if ($dir < 0) {
        $b = preg_quote($o->i, '#');
        if (!preg_match('#<button type="button" class="ar" data-g="([a-z]+)" data-ev="' . $b . '">.*?</button>#s', $sec, $bm, PREG_OFFSET_CAPTURE)) return $html;
        $g = $bm[1][0];
        $ds = strrpos(substr($sec, 0, $bm[0][1]), '<details class="ay">');
        $de = strpos($sec, '</details>', $bm[0][1]);
        $det = substr($sec, $ds, $de - $ds);
        $det = str_replace($bm[0][0], '', $det);
    } else {
        $g = $o->g;
        $year = (string) $arch['year'];
        $ppl = array();
        foreach ($o->p as $pk) { $ppl[] = (string) $D->P->{$pk}[0]; }
        $btn = '<button type="button" class="ar" data-g="' . esc_attr($g) . '" data-ev="' . esc_attr($o->i) . '"><time datetime="' . esc_attr($o->d) . '">' . esc_html((string) $arch['md']) . '</time>' .
            tjd_ev_icon($sec, $g, $D) . '<span><b>' . esc_html($o->ttl) . '</b><small>' . esc_html($label . ($ppl ? ' · ' . implode('، ', $ppl) : '')) . '</small></span></button>';
        $ds = strpos($sec, '<details class="ay"><summary><b>' . $year . '</b>');
        if ($ds === false) {
            $first = strpos($sec, '<details class="ay">');
            if ($first === false) throw new Exception('no year block');
            $chev = preg_match('#<span class="chev">.*?</span>#s', $sec, $cm) ? $cm[0] : '';
            $new = '<details class="ay"><summary><b>' . $year . '</b><span class="n">۰ برنامه</span><span class="gs"></span>' . $chev . '</summary><div class="ayl"></div></details>' . "\n";
            $sec = substr($sec, 0, $first) . $new . substr($sec, $first);
            $ds = $first;
        }
        $de = strpos($sec, '</details>', $ds);
        $det = substr($sec, $ds, $de - $ds);
        if (strpos($det, 'data-ev="' . $o->i . '"') !== false) return $html;   /* تکرار بی‌ضرر */
        $at = strrpos($det, '</div>');
        if (preg_match_all('#<button type="button" class="ar"[^>]*><time datetime="(\d{4}-\d{2}-\d{2})"#', $det, $bs, PREG_OFFSET_CAPTURE)) {
            foreach ($bs[1] as $k => $hit) { if ($hit[0] <= $o->d) { $at = $bs[0][$k][1]; break; } }
        }
        $det = substr($det, 0, $at) . $btn . substr($det, $at);
    }
    $det = preg_replace_callback('#<span class="n">([۰-۹0-9]+) برنامه</span>#u', function ($m) use ($dir) { return '<span class="n">' . tjd_fa(max(0, tjd_unfa($m[1]) + $dir)) . ' برنامه</span>'; }, $det, 1);
    $gq = preg_quote($g, '#');
    if (preg_match('#(<span data-g="' . $gq . '" title="[^"]*"><span class="ic">.*?</span>)([۰-۹0-9]+)(</span>)#su', $det, $gm)) {
        $nv = tjd_unfa($gm[2]) + $dir;
        $det = str_replace($gm[0], $nv > 0 ? $gm[1] . tjd_fa($nv) . $gm[3] : '', $det);
    } elseif ($dir > 0) {
        $chip = '<span data-g="' . esc_attr($g) . '" title="' . esc_attr($label) . '">' . tjd_ev_icon($sec, $g, $D) . '۱</span>';
        $det = preg_replace('#</span><span class="chev">#', $chip . '</span><span class="chev">', $det, 1);
    }
    $empty = $dir < 0 && preg_match('#<span class="n">[۰0] برنامه</span>#u', $det);
    if ($empty) $sec = substr($sec, 0, $ds) . substr($sec, $de + strlen("</details>\n"));   /* سال خالی‌شده (فقط سالی که خودش ساخته بود) برداشته می‌شود */
    else $sec = substr($sec, 0, $ds) . $det . substr($sec, $de);
    $sec = preg_replace_callback('#(<div class="ah"><div><h2>[^<]*</h2><p>)([۰-۹0-9]+)( برنامه)#u', function ($m) use ($dir) { return $m[1] . tjd_fa(max(0, tjd_unfa($m[2]) + $dir)) . $m[3]; }, $sec, 1);
    return substr($html, 0, $a0) . $sec . substr($html, $a1);
}
function tjd_evlite($d) {
    $pid = TJD_EV_PAGE;
    $old = (string) get_post_field('post_content', $pid, 'raw');
    if ($old === '') throw new Exception('page missing');
    $x = tjd_ev_split($old);
    $D = $x['D'];
    if (!empty($d['undo'])) {
        $i = isset($d['i']) ? (string) $d['i'] : '';
        $keep = array(); $gone = null;
        foreach ($D->events as $e) { if (isset($e->i) && $e->i === $i) $gone = $e; else $keep[] = $e; }
        if (!$gone) return array('ok' => true, 'i' => $i, 'gone' => false);
        $D->events = $keep;
        $new = substr($old, 0, $x['start']) . tjd_ev_json($D) . substr($old, $x['start'] + $x['len']);
        $new = tjd_ev_arch($new, $gone, $D, array(), -1);
        if (!tjd_save_page($pid, $old, $new)) throw new Exception('save failed');
        return array('ok' => true, 'i' => $i, 'gone' => true);
    }
    $o = tjd_ev_clean(isset($d['ev']) ? (array) $d['ev'] : array(), $D);
    $arch = isset($d['arch']) ? (array) $d['arch'] : array();
    if (!isset($arch['year'], $arch['md']) || !preg_match('/^[۰-۹]{4}$/u', (string) $arch['year'])) throw new Exception('bad arch');
    $photos = array_slice(isset($d['photos']) ? (array) $d['photos'] : array(), 0, 3);
    if (!empty($d['dry'])) return array('ok' => true, 'dry' => true, 'i' => $o->i, 'ev' => $o, 'photos' => count($photos));
    $made = array(); $story = '';
    try {
        $o->ph = array();
        foreach ($photos as $n => $p) {
            $alt = mb_substr(wp_strip_all_tags(isset($p['alt']) ? (string) $p['alt'] : $o->sh), 0, 125);
            $m = tjd_ev_photo(isset($p['b64']) ? $p['b64'] : '', 'tjl-ev-' . $o->i . '-' . ($n + 1), $o->ttl, $alt);
            $made[] = $m['id'];
            $ph = new stdClass(); $ph->u = $m['u']; $ph->t = $m['t']; $ph->a = $alt; $o->ph[] = $ph;
            if ($n === 0) {
                $img = tjd_image($p['b64'], array('x' => 0.5, 'y' => 0.5, 'z' => 1), 1080, 1920, 'image/jpeg');
                $sm = tjd_media($img['path'], 'tjl-ev-' . $o->i . '-story', $o->ttl . ' · استوری', $alt);
                $made[] = $sm['id']; $story = $sm['url'];
            }
        }
        if (!$o->ph) unset($o->ph);
        $keep = array(); $placed = false;
        foreach ($D->events as $e) {
            if (isset($e->i) && $e->i === $o->i) continue;
            if (!$placed && isset($e->d) && $e->d > $o->d) { $keep[] = $o; $placed = true; }
            $keep[] = $e;
        }
        if (!$placed) $keep[] = $o;
        $D->events = $keep;
        $new = substr($old, 0, $x['start']) . tjd_ev_json($D) . substr($old, $x['start'] + $x['len']);
        $new = tjd_ev_arch($new, $o, $D, $arch, 1);
        if (!tjd_save_page($pid, $old, $new)) throw new Exception('save failed');
    } catch (Throwable $e) {
        foreach ($made as $id) wp_delete_attachment($id, true);
        throw $e;
    }
    return array('ok' => true, 'i' => $o->i, 'story' => $story, 'ph' => isset($o->ph) ? count($o->ph) : 0);
}

} // function_exists
