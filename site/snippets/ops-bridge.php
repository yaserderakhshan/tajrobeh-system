/* Tajrobeh: پل انتشار مخزن (tj-ops/v1)
 * وضعیت: تأیید یاسر (۱۱ مهر ۱۴۰۵). نصب فقط یک بار و دستی در WPCode؛ هر تغییر بعدی این فایل هم دستی است (پل به خودش دست نمی‌زند).
 *
 * چرا: اسنیپت‌های WPCode، متای Yoast و کش WP-Optimize راه REST ندارند. گردش کار انتشار (.github/workflows/site-deploy.yml)
 * با کاربر claude-ops و Application Password فقط از همین چند مسیر آن‌ها را می‌خواند و می‌نویسد.
 *
 * نگهبان‌ها:
 * - کلید خاموش: «تنظیمات › عمومی › پل انتشار مخزن (tj-ops)». پیش‌فرض خاموش؛ وقتی خاموش است همهٔ مسیرها 403 می‌دهند.
 *   این گزینه فقط از پیشخوان عوض می‌شود (در REST نیست)، پس خود claude-ops نمی‌تواند روشنش کند.
 * - پل به اسنیپت خودش دست نمی‌زند (نه نوشتن، نه خاموش کردن).
 * - فقط کاربر TJ_OPS_USER، فقط با Application Password (نه کوکی مرورگر)، و فقط اگر manage_options دارد.
 * - نوشتن فقط با expect (هش فعلی): اگر کسی در وردپرس دستی عوضش کرده باشد، چیزی نوشته نمی‌شود (409).
 * - کد PHP پیش از ذخیره با token_get_all(TOKEN_PARSE) سنجیده می‌شود؛ خطای نحوی = 422 و هیچ تغییری.
 * - فقط این کنش‌ها، و هیچ کنش دیگری:
 *     GET  /state            خواندن اسنیپت‌ها، متای Yoast، نسخه‌ها و به‌روزرسانی‌ها، اندازهٔ صف لید و خط‌های آخر لاگ لید و امنیت
 *     POST /snippet/<id>     نوشتن متن کد یک اسنیپت موجود (عنوان و محل اجرا عوض نمی‌شود)
 *     POST /snippet-new      ساخت اسنیپت تازه، همیشه غیرفعال
 *     POST /snippet-active/<id>  روشن یا خاموش کردن یک اسنیپت
 *     POST /yoast/<id>       نوشتن title، description، canonical، noindex یک برگه
 *     POST /purge            پاک کردن کش WP-Optimize
 *     POST /restore          برگرداندن آخرین نسخهٔ ذخیره‌شدهٔ یک شیء
 * - پنج نسخهٔ قبلی هر شیء در گزینهٔ tj_ops_hist می‌ماند.
 * - هر فراخوانی (خواندن یا نوشتن، موفق یا رد) یک خط در tj_ops_log دارد: زمان، روش، مسیر، نتیجه، IP. بدون متن کد و بدون رمز.
 *   ۵۰۰ خط آخر نگه داشته می‌شود و از /state هم برمی‌گردد.
 */
if (!defined('TJ_OPS_USER')) { define('TJ_OPS_USER', 'claude-ops'); }

if (!function_exists('tj_ops_norm')) {
  // همان یکدست‌سازی site/tools/site-lib.mjs → norm()
  function tj_ops_norm($s) { $s = str_replace(array("\r\n", "\r"), "\n", (string) $s); $s = preg_replace('/[ \t]+$/m', '', $s); return rtrim($s); }
  function tj_ops_hash($s) { return substr(hash('sha256', tj_ops_norm($s)), 0, 16); }

  function tj_ops_allowed() {
    if (get_option('tj_ops_enabled', '0') !== '1') { return false; }
    $u = wp_get_current_user();
    if (!$u || !$u->exists() || $u->user_login !== TJ_OPS_USER) { return false; }
    if (!function_exists('rest_get_authenticated_app_password') || !rest_get_authenticated_app_password()) { return false; }
    return user_can($u, 'manage_options');
  }

  function tj_ops_log($what) {
    $log = get_option('tj_ops_log', array());
    $log[] = gmdate('c') . ' ' . $what;
    update_option('tj_ops_log', array_slice($log, -500), false);
  }

  function tj_ops_hist_push($key, $old) {
    $h = get_option('tj_ops_hist', array());
    if (!isset($h[$key])) { $h[$key] = array(); }
    $h[$key][] = array('t' => gmdate('c'), 'hash' => tj_ops_hash($old), 'body' => $old);
    $h[$key] = array_slice($h[$key], -5);
    update_option('tj_ops_hist', $h, false);
  }

  // اسنیپت خود پل: با نشانهٔ ثبت مسیر tj-ops شناخته می‌شود
  function tj_ops_is_self($p) { return strpos((string) $p->post_content, "register_rest_route('tj-ops/v1'") !== false; }

  function tj_ops_snippet($p) {
    $type = wp_get_post_terms($p->ID, 'wpcode_type', array('fields' => 'slugs'));
    $loc  = wp_get_post_terms($p->ID, 'wpcode_location', array('fields' => 'slugs'));
    return array(
      'id' => $p->ID, 'title' => $p->post_title, 'active' => $p->post_status === 'publish',
      'type' => is_wp_error($type) ? '' : implode(',', $type), 'location' => is_wp_error($loc) ? '' : implode(',', $loc),
      'modified' => $p->post_modified_gmt, 'hash' => tj_ops_hash($p->post_content), 'code' => $p->post_content,
    );
  }

  function tj_ops_yoast($pid) {
    return array(
      'title' => (string) get_post_meta($pid, '_yoast_wpseo_title', true),
      'desc' => (string) get_post_meta($pid, '_yoast_wpseo_metadesc', true),
      'canonical' => (string) get_post_meta($pid, '_yoast_wpseo_canonical', true),
      'noindex' => (string) get_post_meta($pid, '_yoast_wpseo_meta-robots-noindex', true),
    );
  }

  function tj_ops_purge($pid = 0) {
    if ($pid && class_exists('WPO_Page_Cache') && method_exists('WPO_Page_Cache', 'delete_single_post_cache')) { WPO_Page_Cache::delete_single_post_cache($pid); return 'post'; }
    if (function_exists('wpo_cache_flush')) { wpo_cache_flush(); return 'all'; }
    return 'none';
  }
}

// کلید خاموش در «تنظیمات › عمومی»
add_action('admin_init', function () {
  register_setting('general', 'tj_ops_enabled', array('type' => 'string', 'default' => '0', 'show_in_rest' => false,
    'sanitize_callback' => function ($v) { return $v === '1' ? '1' : '0'; }));
  add_settings_field('tj_ops_enabled', 'پل انتشار مخزن (tj-ops)', function () {
    $v = get_option('tj_ops_enabled', '0');
    echo '<label><input type="checkbox" name="tj_ops_enabled" value="1" ' . checked($v, '1', false) . '> روشن</label>';
    echo '<p class="description">خاموش کردن این گزینه همهٔ مسیرهای انتشار خودکار از مخزن را فوراً می‌بندد.</p>';
  }, 'general');
});

// ثبت همهٔ فراخوانی‌های tj-ops، چه پذیرفته چه رد شده
add_filter('rest_post_dispatch', function ($res, $server, $req) {
  if (strpos($req->get_route(), '/tj-ops/v1') === 0) {
    $u = wp_get_current_user();
    $ip = isset($_SERVER['REMOTE_ADDR']) ? preg_replace('/[^0-9a-f.:]/i', '', $_SERVER['REMOTE_ADDR']) : '-';
    tj_ops_log(sprintf('%s %s %d user=%s ip=%s', $req->get_method(), $req->get_route(), $res->get_status(), $u && $u->exists() ? $u->user_login : '-', $ip));
  }
  return $res;
}, 10, 3);

add_action('rest_api_init', function () {
  $perm = 'tj_ops_allowed';

  // وضعیت کامل: اسنیپت‌ها، متای Yoast برگه‌ها، نسخه‌ها و به‌روزرسانی‌های در انتظار (برای چک هفتگی امنیت)
  register_rest_route('tj-ops/v1', '/state', array('methods' => 'GET', 'permission_callback' => $perm, 'callback' => function () {
    $snips = array();
    foreach (get_posts(array('post_type' => 'wpcode', 'post_status' => array('publish', 'draft'), 'numberposts' => -1)) as $p) { $snips[] = tj_ops_snippet($p); }
    $yoast = array();
    foreach (get_posts(array('post_type' => 'page', 'post_status' => array('publish', 'draft', 'private'), 'numberposts' => -1, 'fields' => 'ids')) as $pid) { $yoast[$pid] = tj_ops_yoast($pid); }
    if (!function_exists('get_plugins')) { require_once ABSPATH . 'wp-admin/includes/plugin.php'; }
    require_once ABSPATH . 'wp-admin/includes/update.php';
    $upd = get_site_transient('update_plugins');
    $plugins = array();
    foreach (get_plugins() as $file => $d) {
      $plugins[] = array('file' => $file, 'name' => $d['Name'], 'version' => $d['Version'], 'active' => is_plugin_active($file),
        'update' => isset($upd->response[$file]) ? $upd->response[$file]->new_version : null);
    }
    $core = get_site_transient('update_core');
    $theme = wp_get_theme();
    return array(
      'wp' => get_bloginfo('version'), 'php' => PHP_VERSION,
      'core_update' => (isset($core->updates[0]) && $core->updates[0]->response === 'upgrade') ? $core->updates[0]->current : null,
      'theme' => array('name' => $theme->get('Name'), 'version' => $theme->get('Version')),
      'plugins' => $plugins, 'snippets' => $snips, 'yoast' => $yoast,
      'log' => array_slice(get_option('tj_ops_log', array()), -50),
      // سلامت مسیر لید و امنیت ورود (بی دادهٔ فرم): اندازهٔ صف لید، قدیمی‌ترین ردیف، و خط‌های آخر لاگ‌ها
      'lead_queue' => (function () { $q = get_option('tj_lead_q', array()); $o = 0; foreach ($q as $it) { $o = max($o, time() - (int) $it['first']); } return array('n' => count($q), 'oldest_s' => $o); })(),
      'lead_log' => array_slice(get_option('tj_lead_log', array()), -30),
      'sec_log' => array_slice(get_option('tj_sec_log', array()), -30),
    );
  }));

  // نوشتن متن یک اسنیپت
  register_rest_route('tj-ops/v1', '/snippet/(?P<id>\d+)', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($r) {
    $p = get_post((int) $r['id']);
    if (!$p || $p->post_type !== 'wpcode') { return new WP_Error('tj_ops_404', 'snippet', array('status' => 404)); }
    if (tj_ops_is_self($p)) { return new WP_Error('tj_ops_self', 'bridge snippet is not writable', array('status' => 403)); }
    $code = (string) $r->get_param('code');
    if (tj_ops_hash($p->post_content) !== (string) $r->get_param('expect')) { return new WP_Error('tj_ops_drift', 'live changed', array('status' => 409, 'live' => tj_ops_hash($p->post_content))); }
    $type = wp_get_post_terms($p->ID, 'wpcode_type', array('fields' => 'slugs'));
    if (!is_wp_error($type) && in_array('php', $type, true)) {
      try { token_get_all('<?php ' . $code, TOKEN_PARSE); } catch (\Throwable $e) { return new WP_Error('tj_ops_parse', 'parse error line ' . $e->getLine(), array('status' => 422)); }
    }
    tj_ops_hist_push('snippet:' . $p->ID, $p->post_content);
    kses_remove_filters();
    $res = wp_update_post(array('ID' => $p->ID, 'post_content' => wp_slash($code)), true);
    kses_init_filters();
    if (is_wp_error($res)) { return $res; }
    if (function_exists('wpcode') && isset(wpcode()->cache) && method_exists(wpcode()->cache, 'cache_all_loaded_snippets')) { wpcode()->cache->cache_all_loaded_snippets(); }
    $now = get_post($p->ID);
    tj_ops_log('snippet ' . $p->ID . ' ' . tj_ops_hash($now->post_content));
    return array('ok' => true, 'hash' => tj_ops_hash($now->post_content), 'purge' => tj_ops_purge());
  }));

  // ساخت اسنیپت تازه، همیشه غیرفعال. محل اجرا و نوع از ورودی، فقط از فهرست مجاز.
  register_rest_route('tj-ops/v1', '/snippet-new', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($r) {
    $type = (string) $r->get_param('type');
    $loc = (string) $r->get_param('location');
    if (!in_array($type, array('php', 'html', 'css', 'js'), true)) { return new WP_Error('tj_ops_type', 'type', array('status' => 400)); }
    if (!in_array($loc, array('everywhere', 'frontend_only', 'site_wide_header', 'site_wide_footer'), true)) { return new WP_Error('tj_ops_loc', 'location', array('status' => 400)); }
    $code = (string) $r->get_param('code');
    if ($type === 'php') { try { token_get_all('<?php ' . $code, TOKEN_PARSE); } catch (\Throwable $e) { return new WP_Error('tj_ops_parse', 'parse error line ' . $e->getLine(), array('status' => 422)); } }
    kses_remove_filters();
    $id = wp_insert_post(array('post_type' => 'wpcode', 'post_status' => 'draft', 'post_title' => sanitize_text_field((string) $r->get_param('title')), 'post_content' => wp_slash($code)), true);
    kses_init_filters();
    if (is_wp_error($id)) { return $id; }
    wp_set_post_terms($id, array($type), 'wpcode_type');
    wp_set_post_terms($id, array($loc), 'wpcode_location');
    return array('ok' => true, 'id' => $id, 'active' => false, 'hash' => tj_ops_hash($code));
  }));

  // روشن یا خاموش کردن یک اسنیپت (برای برگشت خودکار: خاموش کردن اسنیپتی که تازه روشن شده)
  register_rest_route('tj-ops/v1', '/snippet-active/(?P<id>\d+)', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($r) {
    $p = get_post((int) $r['id']);
    if (!$p || $p->post_type !== 'wpcode') { return new WP_Error('tj_ops_404', 'snippet', array('status' => 404)); }
    if (tj_ops_is_self($p)) { return new WP_Error('tj_ops_self', 'bridge snippet is not writable', array('status' => 403)); }
    $on = (bool) $r->get_param('active');
    wp_update_post(array('ID' => $p->ID, 'post_status' => $on ? 'publish' : 'draft'));
    if (function_exists('wpcode') && isset(wpcode()->cache) && method_exists(wpcode()->cache, 'cache_all_loaded_snippets')) { wpcode()->cache->cache_all_loaded_snippets(); }
    return array('ok' => true, 'id' => $p->ID, 'active' => get_post_status($p->ID) === 'publish', 'purge' => tj_ops_purge());
  }));

  // نوشتن متای Yoast یک برگه یا نوشته (title، desc، canonical، noindex)
  register_rest_route('tj-ops/v1', '/yoast/(?P<id>\d+)', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($r) {
    $pid = (int) $r['id'];
    if (!get_post($pid)) { return new WP_Error('tj_ops_404', 'post', array('status' => 404)); }
    $old = tj_ops_yoast($pid);
    if (tj_ops_hash(wp_json_encode($old)) !== (string) $r->get_param('expect')) { return new WP_Error('tj_ops_drift', 'live changed', array('status' => 409)); }
    tj_ops_hist_push('yoast:' . $pid, wp_json_encode($old));
    $map = array('title' => '_yoast_wpseo_title', 'desc' => '_yoast_wpseo_metadesc', 'canonical' => '_yoast_wpseo_canonical', 'noindex' => '_yoast_wpseo_meta-robots-noindex');
    foreach ($map as $k => $meta) {
      $v = $r->get_param($k);
      if ($v === null) { continue; }
      $v = $k === 'canonical' ? esc_url_raw($v) : sanitize_text_field($v);
      if ($v === '') { delete_post_meta($pid, $meta); } else { update_post_meta($pid, $meta, $v); }
    }
    wp_update_post(array('ID' => $pid)); // ساخت دوبارهٔ indexable یوست و پاک شدن کش همین برگه
    tj_ops_log('yoast ' . $pid);
    return array('ok' => true, 'hash' => tj_ops_hash(wp_json_encode(tj_ops_yoast($pid))), 'purge' => tj_ops_purge($pid));
  }));

  // پاک کردن کش WP-Optimize (یک برگه یا همه)
  register_rest_route('tj-ops/v1', '/purge', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($r) {
    $what = tj_ops_purge((int) $r->get_param('post'));
    tj_ops_log('purge ' . $what);
    return array('ok' => true, 'purge' => $what);
  }));

  // برگرداندن آخرین نسخهٔ ذخیره‌شده (پشتیبان برگشت خودکار گردش کار)
  register_rest_route('tj-ops/v1', '/restore', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($r) {
    $key = (string) $r->get_param('key');
    $h = get_option('tj_ops_hist', array());
    if (empty($h[$key])) { return new WP_Error('tj_ops_404', 'no history', array('status' => 404)); }
    $last = end($h[$key]);
    list($kind, $id) = array_pad(explode(':', $key, 2), 2, 0);
    if ($kind === 'snippet') {
      $sp = get_post((int) $id);
      if (!$sp || $sp->post_type !== 'wpcode' || tj_ops_is_self($sp)) { return new WP_Error('tj_ops_self', 'not restorable', array('status' => 403)); }
      kses_remove_filters();
      wp_update_post(array('ID' => (int) $id, 'post_content' => wp_slash($last['body'])));
      kses_init_filters();
      if (function_exists('wpcode') && isset(wpcode()->cache) && method_exists(wpcode()->cache, 'cache_all_loaded_snippets')) { wpcode()->cache->cache_all_loaded_snippets(); }
    } elseif ($kind === 'yoast') {
      $old = json_decode($last['body'], true);
      $map = array('title' => '_yoast_wpseo_title', 'desc' => '_yoast_wpseo_metadesc', 'canonical' => '_yoast_wpseo_canonical', 'noindex' => '_yoast_wpseo_meta-robots-noindex');
      foreach ($map as $k => $meta) { if (empty($old[$k])) { delete_post_meta((int) $id, $meta); } else { update_post_meta((int) $id, $meta, $old[$k]); } }
      wp_update_post(array('ID' => (int) $id));
    } else { return new WP_Error('tj_ops_kind', 'kind', array('status' => 400)); }
    tj_ops_log('restore ' . $key . ' ' . $last['hash']);
    return array('ok' => true, 'hash' => $last['hash'], 'purge' => tj_ops_purge());
  }));
});
