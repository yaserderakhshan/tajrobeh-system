/* Tajrobeh author self-join · v1 · 1405-07-07
 * tj/v1/author-invite (POST, HMAC tjd_auth from the bot) → one-time link
 * tj/v1/author-join?t=TOKEN (GET, public) → creates an Author account, assigns posts, redirects to the author page
 */
add_action('rest_api_init', function () {
  register_rest_route('tj/v1', '/author-invite', array(
    'methods' => 'POST',
    'permission_callback' => function ($req) { return function_exists('tjd_auth') ? tjd_auth($req) : false; },
    'callback' => 'tja_invite',
  ));
  register_rest_route('tj/v1', '/author-join', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true',
    'callback' => 'tja_join',
  ));
});

function tja_assign_posts($uid, $links) {
  $done = array();
  foreach ((array) $links as $l) {
    $pid = url_to_postid(esc_url_raw($l));
    if ($pid && get_post_type($pid) === 'post') {
      /* only the author changes; wp_update_post in a logged-out request re-filters content with kses and strips schema/styles */
      global $wpdb; $wpdb->update($wpdb->posts, array('post_author' => (int) $uid), array('ID' => (int) $pid)); clean_post_cache($pid);
      $done[] = $pid;
    }
  }
  if ($done && function_exists('WP_Optimize') ) {
    try { if (class_exists('WPO_Page_Cache')) WPO_Page_Cache::instance()->purge(); } catch (\Throwable $e) {}
  }
  return $done;
}

function tja_slug($s, $name) {
  $s = sanitize_title($s);
  if (!$s || preg_match('/%[0-9a-f]{2}/i', $s)) $s = 'writer-' . substr(md5($name . microtime()), 0, 6);
  return $s;
}

function tja_invite($req) {
  $p = $req->get_json_params();
  $email = sanitize_email($p['email'] ?? '');
  $name = sanitize_text_field($p['name'] ?? '');
  if (!is_email($email) || !$name) return new WP_Error('bad', 'email/name', array('status' => 400));
  $links = array_slice(array_map('esc_url_raw', (array) ($p['links'] ?? array())), 0, 20);
  $u = get_user_by('email', $email);
  if ($u) {
    if (!in_array('author', (array) $u->roles, true) && !user_can($u, 'edit_posts')) $u->add_role('author');
    $done = tja_assign_posts($u->ID, $links);
    return array('ok' => true, 'exists' => true, 'author_url' => get_author_posts_url($u->ID), 'posts' => $done);
  }
  $slug = tja_slug($p['slug'] ?? '', $name);
  $base = $slug; $i = 2;
  while (get_user_by('slug', $slug) || username_exists($slug)) { $slug = $base . '-' . $i++; }
  $tok = wp_generate_password(32, false, false);
  set_transient('tja_' . $tok, array(
    'name' => $name, 'email' => $email, 'slug' => $slug,
    'bio' => sanitize_textarea_field($p['bio'] ?? ''), 'page' => esc_url_raw($p['page'] ?? ''),
    'links' => $links, 'chat' => sanitize_text_field($p['chat'] ?? ''),
  ), 14 * DAY_IN_SECONDS);
  return array('ok' => true, 'exists' => false,
    'link' => add_query_arg('t', $tok, rest_url('tj/v1/author-join')),
    'author_url' => home_url('/mag/author/' . $slug . '/'));
}

function tja_join($req) {
  $tok = preg_replace('/[^A-Za-z0-9]/', '', (string) $req->get_param('t'));
  $d = $tok ? get_transient('tja_' . $tok) : false;
  if (!$d) {
    wp_die('<p style="font-family:Vazirmatn,Tahoma;direction:rtl;text-align:center">این لینک منقضی شده یا قبلاً استفاده شده است. اگر صفحهٔ نویسندگی‌تان ساخته نشده، در بات تجربه خبر بدهید.</p>', 'تجربه', array('response' => 410));
  }
  delete_transient('tja_' . $tok);
  $u = get_user_by('email', $d['email']);
  if (!$u) {
    $parts = preg_split('/\s+/u', trim($d['name']), 2);
    $uid = wp_insert_user(array(
      'user_login' => $d['slug'], 'user_nicename' => $d['slug'], 'user_email' => $d['email'],
      'user_pass' => wp_generate_password(24, true, true), 'role' => 'author',
      'display_name' => $d['name'], 'nickname' => $d['name'],
      'first_name' => $parts[0] ?? '', 'last_name' => $parts[1] ?? '',
      'description' => $d['bio'], 'user_url' => $d['page'],
    ));
    if (is_wp_error($uid)) wp_die(esc_html($uid->get_error_message()), 'تجربه', array('response' => 500));
    update_user_meta($uid, 'tj_selfjoin', current_time('mysql'));
    if ($d['chat']) update_user_meta($uid, 'tj_tg_chat', $d['chat']);
  } else { $uid = $u->ID; }
  tja_assign_posts($uid, $d['links']);
  wp_safe_redirect(get_author_posts_url($uid) . '?welcome=1', 302);
  exit;
}
