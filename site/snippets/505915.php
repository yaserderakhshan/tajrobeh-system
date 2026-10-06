/* Tajrobeh x Playlist-e Ebi: collective list (CPT + REST). moderation = publish in wp-admin */
add_action('init', function(){
  register_post_type('tj_ebi_item', array(
    'labels' => array('name'=>'فهرست ابی','singular_name'=>'مورد فهرست','menu_name'=>'فهرست ابی','all_items'=>'همهٔ موردها','edit_item'=>'ویرایش مورد'),
    'public' => false, 'show_ui' => true, 'show_in_menu' => true, 'menu_icon' => 'dashicons-heart',
    'supports' => array('title','custom-fields'), 'capability_type' => 'post', 'map_meta_cap' => true,
    'menu_position' => 26,
  ));
});
function tj_ebi_list_data(){
  $c = get_transient('tj_ebi_list_v1');
  if ($c !== false) return $c;
  $q = get_posts(array('post_type'=>'tj_ebi_item','post_status'=>'publish','numberposts'=>600,'orderby'=>'date','order'=>'ASC','suppress_filters'=>true));
  $items = array(); $n = 0;
  foreach ($q as $p){
    $n++;
    $anon = get_post_meta($p->ID,'tj_anon',true) === '1';
    $name = $anon ? '' : (string) get_post_meta($p->ID,'tj_name',true);
    $items[] = array('n'=>$n,'t'=>wp_strip_all_tags($p->post_title),'by'=>$name,'d'=>get_the_date('Y-m-d',$p));
  }
  $out = array('count'=>$n,'items'=>array_reverse($items));
  set_transient('tj_ebi_list_v1',$out,300);
  return $out;
}
add_action('rest_api_init', function(){
  register_rest_route('tj/v1','/ebi-list', array(
    array('methods'=>'GET','permission_callback'=>'__return_true','callback'=>function(){
      $r = rest_ensure_response(tj_ebi_list_data());
      $r->header('Cache-Control','public, max-age=120');
      return $r;
    }),
    array('methods'=>'POST','permission_callback'=>'__return_true','callback'=>function($req){
      $hp = (string)$req->get_param('hp');
      if ($hp !== '') return new WP_REST_Response(array('ok'=>true),200);
      $t = trim(wp_strip_all_tags((string)$req->get_param('text')));
      $t = preg_replace('/\s+/u',' ',$t);
      $len = function_exists('mb_strlen') ? mb_strlen($t) : strlen($t);
      if ($len < 3 || $len > 160) return new WP_REST_Response(array('ok'=>false,'msg'=>'متن باید بین ۳ تا ۱۶۰ حرف باشد.'),400);
      $name = trim(wp_strip_all_tags((string)$req->get_param('name')));
      if (function_exists('mb_substr')) $name = mb_substr($name,0,40); else $name = substr($name,0,40);
      $anon = $req->get_param('anon') ? '1' : '0';
      if ($name === '') $anon = '1';
      $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'x';
      $k = 'tj_ebi_rl_'.md5($ip);
      $c = (int) get_transient($k);
      if ($c >= 5) return new WP_REST_Response(array('ok'=>false,'msg'=>'امروز چند مورد فرستاده‌اید؛ کمی بعد دوباره سر بزنید.'),429);
      set_transient($k,$c+1,HOUR_IN_SECONDS*6);
      $id = wp_insert_post(array('post_type'=>'tj_ebi_item','post_status'=>'pending','post_title'=>$t), true);
      if (is_wp_error($id)) return new WP_REST_Response(array('ok'=>false,'msg'=>'ثبت نشد؛ دوباره امتحان کنید.'),500);
      update_post_meta($id,'tj_name',$name);
      update_post_meta($id,'tj_anon',$anon);
      $src = substr(sanitize_text_field((string)$req->get_param('src')),0,40);
      if ($src) update_post_meta($id,'tj_src',$src);
      return new WP_REST_Response(array('ok'=>true),200);
    }),
  ));
});
add_action('transition_post_status', function($new,$old,$post){
  if ($post && $post->post_type === 'tj_ebi_item') delete_transient('tj_ebi_list_v1');
},10,3);
add_action('deleted_post', function($id){ if (get_post_type($id)==='tj_ebi_item') delete_transient('tj_ebi_list_v1'); });
/* pending count bubble in admin menu */
add_action('admin_menu', function(){
  global $menu;
  $c = wp_count_posts('tj_ebi_item');
  $p = isset($c->pending) ? (int)$c->pending : 0;
  if (!$p || !is_array($menu)) return;
  foreach ($menu as $i=>$m){ if (isset($m[2]) && $m[2]==='edit.php?post_type=tj_ebi_item'){ $menu[$i][0] .= ' <span class="awaiting-mod"><span class="pending-count">'.$p.'</span></span>'; } }
}, 99);
/* columns: name / anon */
add_filter('manage_tj_ebi_item_posts_columns', function($c){ $c['tj_by']='نام'; return $c; });
add_action('manage_tj_ebi_item_posts_custom_column', function($col,$id){
  if ($col==='tj_by'){ echo get_post_meta($id,'tj_anon',true)==='1' ? 'بی‌نام' : esc_html(get_post_meta($id,'tj_name',true)); }
},10,2);
/* ===== press (بازتاب ابی): paste a link, title/source/image are fetched from og tags ===== */
add_action('init', function(){
  register_post_type('tj_ebi_press', array(
    'labels' => array('name'=>'بازتاب ابی','singular_name'=>'لینک خبر','menu_name'=>'بازتاب رسانه‌ای','add_new'=>'افزودن لینک خبر','add_new_item'=>'افزودن لینک خبر','all_items'=>'بازتاب رسانه‌ای'),
    'public' => false, 'show_ui' => true, 'show_in_menu' => 'edit.php?post_type=tj_ebi_item',
    'supports' => array('title','thumbnail'), 'capability_type' => 'post', 'map_meta_cap' => true,
  ));
});
add_action('add_meta_boxes', function(){
  add_meta_box('tj_ebi_press_box','لینک خبر', function($post){
    $u = get_post_meta($post->ID,'tj_url',true); $s = get_post_meta($post->ID,'tj_src',true);
    wp_nonce_field('tj_ebi_press','tj_ebi_press_n');
    echo '<p><label>لینک خبر یا یادداشت<br><input type="url" name="tj_url" value="'.esc_attr($u).'" style="width:100%" dir="ltr" required></label></p>';
    echo '<p><label>نام رسانه (اختیاری)<br><input type="text" name="tj_src" value="'.esc_attr($s).'" style="width:100%"></label></p>';
    echo '<p style="color:#666">فقط لینک کافی است. عنوان، نام رسانه و تصویر اگر خالی باشند از خود صفحهٔ خبر برداشته می‌شوند.</p>';
  }, 'tj_ebi_press', 'normal', 'high');
});
function tj_ebi_og($h,$p){
  $q = preg_quote($p,'/');
  if (preg_match('/<meta[^>]+(?:property|name)=["\']'.$q.'["\'][^>]*content=["\']([^"\']*)["\']/i',$h,$m)) return trim(html_entity_decode($m[1], ENT_QUOTES, 'UTF-8'));
  if (preg_match('/<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']'.$q.'["\']/i',$h,$m)) return trim(html_entity_decode($m[1], ENT_QUOTES, 'UTF-8'));
  return '';
}
function tj_ebi_press_fill($id){
  static $busy = false; if ($busy) return; $busy = true;
  $u = get_post_meta($id,'tj_url',true);
  if ($u) {
    $post = get_post($id);
    $need_t = (trim($post->post_title) === ''); $need_i = (!has_post_thumbnail($id)) ? (get_post_meta($id,'tj_noimg',true) !== '1') : false; $need_s = (get_post_meta($id,'tj_src',true) === '');
    if ($need_t || $need_i || $need_s) {
      $r = wp_remote_get($u, array('timeout'=>15,'redirection'=>5,'user-agent'=>'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'));
      if (!is_wp_error($r)) {
        $h = (string) wp_remote_retrieve_body($r);
        if ($need_t) { $t = tj_ebi_og($h,'og:title'); if ($t === '' && preg_match('/<title[^>]*>([^<]+)/i',$h,$m)) $t = trim(html_entity_decode($m[1], ENT_QUOTES, 'UTF-8'));
          if ($t !== '') { $t = preg_replace('/\s*[|\-–]\s*[^|\-–«»]{2,40}$/u','',$t); wp_update_post(array('ID'=>$id,'post_title'=>wp_strip_all_tags($t))); } }
        if ($need_s) { $s = tj_ebi_og($h,'og:site_name'); if ($s === '') { $s = preg_replace('/^www\./','',(string) parse_url($u, PHP_URL_HOST)); } update_post_meta($id,'tj_src',sanitize_text_field($s)); }
        if ($need_i) { $img = (string) get_post_meta($id,'tj_img',true); if ($img === '') $img = tj_ebi_og($h,'og:image'); if ($img === '') $img = tj_ebi_og($h,'twitter:image');
          if ($img !== '') {
            require_once ABSPATH.'wp-admin/includes/media.php'; require_once ABSPATH.'wp-admin/includes/file.php'; require_once ABSPATH.'wp-admin/includes/image.php';
            $tmp = download_url($img, 20);
            if (!is_wp_error($tmp)) {
              $ext = 'jpg'; $ct = function_exists('mime_content_type') ? (string) @mime_content_type($tmp) : '';
              if (strpos($ct,'webp') !== false) $ext = 'webp'; elseif (strpos($ct,'png') !== false) $ext = 'png';
              $fa = array('name'=>'tjl-ebi-press-'.$id.'.'.$ext, 'tmp_name'=>$tmp);
              $aid = media_handle_sideload($fa, $id, get_the_title($id));
              if (is_wp_error($aid)) { @unlink($tmp); } else { set_post_thumbnail($id,$aid); update_post_meta($aid,'_wp_attachment_image_alt','تصویر خبر '.get_the_title($id)); }
            }
          } }
      }
    }
  }
  delete_transient('tj_ebi_press_v1');
  $busy = false;
}
add_action('save_post_tj_ebi_press', function($id){
  if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
  if (!isset($_POST['tj_ebi_press_n']) || !wp_verify_nonce($_POST['tj_ebi_press_n'],'tj_ebi_press')) return;
  if (!current_user_can('edit_post',$id)) return;
  update_post_meta($id,'tj_url', esc_url_raw(trim((string) (isset($_POST['tj_url']) ? $_POST['tj_url'] : ''))));
  update_post_meta($id,'tj_src', sanitize_text_field((string) (isset($_POST['tj_src']) ? $_POST['tj_src'] : '')));
  tj_ebi_press_fill($id);
}, 20);
add_action('transition_post_status', function($n,$o,$p){ if ($p && $p->post_type === 'tj_ebi_press') delete_transient('tj_ebi_press_v1'); },10,3);
function tj_ebi_press_data(){
  $c = get_transient('tj_ebi_press_v1'); if ($c !== false) return $c;
  $q = get_posts(array('post_type'=>'tj_ebi_press','post_status'=>'publish','numberposts'=>60,'orderby'=>'date','order'=>'DESC','suppress_filters'=>true));
  $out = array();
  foreach ($q as $p) {
    $img = get_the_post_thumbnail_url($p,'medium_large'); if (!$img) $img = ''; if (get_post_meta($p->ID,'tj_noimg',true) === '1') $img = '';
    $out[] = array('t'=>get_the_title($p),'u'=>get_post_meta($p->ID,'tj_url',true),'s'=>get_post_meta($p->ID,'tj_src',true),'i'=>$img,'d'=>get_the_date('Y-m-d',$p));
  }
  set_transient('tj_ebi_press_v1',$out,600);
  return $out;
}
add_action('rest_api_init', function(){
  register_rest_route('tj/v1','/ebi-press', array(
    array('methods'=>'GET','permission_callback'=>'__return_true','callback'=>function(){ $r = rest_ensure_response(array('items'=>tj_ebi_press_data())); $r->header('Cache-Control','public, max-age=300'); return $r; }),
    array('methods'=>'POST','permission_callback'=>function(){ return current_user_can('edit_posts'); },'callback'=>function($req){
      $u = esc_url_raw((string) $req->get_param('url')); if (!$u) return new WP_REST_Response(array('ok'=>false),400);
      $id = wp_insert_post(array('post_type'=>'tj_ebi_press','post_status'=>'publish','post_title'=>sanitize_text_field((string)$req->get_param('title'))), true);
      if (is_wp_error($id)) return new WP_REST_Response(array('ok'=>false),500);
      update_post_meta($id,'tj_url',$u); update_post_meta($id,'tj_src',sanitize_text_field((string)$req->get_param('src')));
      if ($req->get_param('date')) wp_update_post(array('ID'=>$id,'post_date'=>sanitize_text_field((string)$req->get_param('date')).' 12:00:00'));
      tj_ebi_press_fill($id);
      return new WP_REST_Response(array('ok'=>true,'id'=>$id,'item'=>array('t'=>get_the_title($id),'s'=>get_post_meta($id,'tj_src',true),'i'=>(string) get_the_post_thumbnail_url($id,'medium_large'))),200);
    }),
  ));
});
add_action('rest_api_init', function(){ register_rest_route('tj/v1','/ebi-press-img', array('methods'=>'POST','permission_callback'=>function(){ return current_user_can('edit_posts'); },'callback'=>function($req){ $id=(int)$req->get_param('id'); if(get_post_type($id)!=='tj_ebi_press') return new WP_REST_Response(array('ok'=>false),400); $t=get_post_thumbnail_id($id); delete_post_thumbnail($id); if($t) wp_delete_attachment($t,true); update_post_meta($id,'tj_img',esc_url_raw((string)$req->get_param('img'))); update_post_meta($id,'tj_noimg',$req->get_param('noimg') ? '1' : '0'); delete_transient('tj_ebi_press_v1'); tj_ebi_press_fill($id); return new WP_REST_Response(array('ok'=>true,'i'=>(string)get_the_post_thumbnail_url($id,'medium_large')),200); })); });
/* talk page → get-therapy (tracked) */
add_action('template_redirect', function(){
  if (is_page(505920)) { wp_redirect(home_url('/get-therapy/?from=ebi-talk&utm_source=ebis-playlist&utm_medium=landing&utm_campaign=c-004&utm_content=talk'), 302); exit; }
});
