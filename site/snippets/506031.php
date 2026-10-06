/* Tajrobeh x Playlist-e Ebi · ops: bot bridge, one-tap moderation, people lists (night, students, therapists, follow) */

/* ---------- bot API bridge ---------- */
function tj_ebibot_cfg(){ $o = get_option('tj_bot_api'); return is_array($o) ? $o : array(); }
function tj_ebibot_call($payload, $timeout = 25){
  $c = tj_ebibot_cfg();
  if (empty($c['key']) || empty($c['webapp'])) return array('ok'=>false,'error'=>'no_cfg');
  $payload = array_merge(array('api'=>1,'key'=>$c['key']), $payload);
  $r = wp_remote_post($c['webapp'], array('timeout'=>$timeout,'redirection'=>5,'headers'=>array('Content-Type'=>'text/plain'),'body'=>wp_json_encode($payload)));
  if (is_wp_error($r)) return array('ok'=>false,'error'=>'http: '.$r->get_error_message());
  $j = json_decode(wp_remote_retrieve_body($r), true);
  return is_array($j) ? $j : array('ok'=>false,'error'=>'bad_json');
}
function tj_ebi_mods(){ $c = tj_ebibot_cfg(); $m = isset($c['mods']) ? (array)$c['mods'] : array(); return array_values(array_filter(array_map(function($x){ return preg_replace('/[^0-9-]/','',(string)$x); }, $m))); } /* campaign leads: option tj_bot_api, field mods (set with do=setcfg) */
function tj_ebi_send_all($text, $buttons, $ref, $type = 'کار'){
  $res = array();
  foreach (tj_ebi_mods() as $chat){
    $res[$chat] = tj_ebibot_call(array('action'=>'send','chat'=>$chat,'type'=>$type,'ref'=>$ref,'text'=>$text,'buttons'=>$buttons));
  }
  $log = get_option('tj_ebi_ops_log', array()); if (!is_array($log)) $log = array();
  array_unshift($log, array('t'=>current_time('mysql'),'ref'=>$ref,'res'=>array_map(function($x){ return !empty($x['ok']) ? 'ok' : (isset($x['error']) ? $x['error'] : 'err'); }, $res)));
  update_option('tj_ebi_ops_log', array_slice($log,0,60), false);
  return $res;
}
function tj_ebi_sig($s){ return substr(hash_hmac('sha256', $s, wp_salt('auth').'ebi-mod'), 0, 20); }
function tj_ebi_modurl($a, $id = 0){ return add_query_arg(array('tj_ebi_mod'=>$a,'i'=>$id,'s'=>tj_ebi_sig($a.'|'.$id)), home_url('/')); }
function tj_ebi_fa($n){ return strtr((string)$n, array('0'=>'۰','1'=>'۱','2'=>'۲','3'=>'۳','4'=>'۴','5'=>'۵','6'=>'۶','7'=>'۷','8'=>'۸','9'=>'۹')); }

/* ---------- moderation: queue new items, check, notify ---------- */
$GLOBALS['tj_ebi_new'] = array();
add_action('wp_insert_post', function($id, $post, $update){
  if ($update || !$post || $post->post_type !== 'tj_ebi_item' || $post->post_status !== 'pending') return;
  $GLOBALS['tj_ebi_new'][] = $id;
}, 10, 3);
add_filter('rest_post_dispatch', function($res, $server, $req){
  if ($req->get_route() === '/tj/v1/ebi-list' && $req->get_method() === 'POST' && !empty($GLOBALS['tj_ebi_new'])){
    $d = $res->get_data();
    if (is_array($d) && !empty($d['ok'])){ $id = end($GLOBALS['tj_ebi_new']); $d['ref'] = $id.'.'.tj_ebi_sig('ref|'.$id); $res->set_data($d); }
  }
  return $res;
}, 10, 3);
add_action('shutdown', function(){
  if (empty($GLOBALS['tj_ebi_new'])) return;
  if (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
  foreach ($GLOBALS['tj_ebi_new'] as $id) tj_ebi_moderate($id);
}, 20);
function tj_ebi_rule_flag($t){
  if (preg_match('/[0-9۰-۹]{7,}|https?:|www\.|@[a-z0-9_]{4,}|\.(com|ir|net|org)\b/iu', $t)) return 'contact';
  if (preg_match('/خودکشی|خودمو بکشم|خودم را بکشم|بمیرم|تمومش کنم|تمامش کنم|زنده نباشم|ارزش زندگی نداره/u', $t)) return 'risk';
  return '';
}
function tj_ebi_moderate($id){
  $p = get_post($id); if (!$p || $p->post_status !== 'pending') return;
  $t = $p->post_title; $flag = tj_ebi_rule_flag($t); $why = $flag;
  if ($flag === ''){
    $r = tj_ebibot_call(array('action'=>'ebi_check','text'=>$t), 20);
    if (!empty($r['ok']) && isset($r['data']['verdict'])){
      update_post_meta($id,'tj_check', sanitize_text_field($r['data']['verdict'].' '.(isset($r['data']['reason']) ? $r['data']['reason'] : '')));
      if ($r['data']['verdict'] === 'ok'){ wp_update_post(array('ID'=>$id,'post_status'=>'publish')); update_post_meta($id,'tj_by','gemini'); return; }
      $why = 'gemini';
    } else { $why = 'manual'; }
  }
  update_post_meta($id,'tj_review',$why);
  tj_ebi_notify_queue($id, $why);
}
function tj_ebi_pending_ids(){ return get_posts(array('post_type'=>'tj_ebi_item','post_status'=>'pending','numberposts'=>200,'fields'=>'ids','orderby'=>'date','order'=>'ASC','suppress_filters'=>true)); }
function tj_ebi_notify_queue($id, $why){
  $last = (int) get_option('tj_ebi_last_notify', 0);
  if ($why !== 'risk' && time() - $last < 20*MINUTE_IN_SECONDS) return;
  update_option('tj_ebi_last_notify', time(), false);
  $n = count(tj_ebi_pending_ids());
  $p = get_post($id);
  $labels = array('risk'=>'⚠️ نشانهٔ حال بد در متن؛ لطفاً با دقت ببینید','contact'=>'شماره یا لینک در متن','gemini'=>'جمنای مطمئن نبود','manual'=>'بازبینی دستی');
  $txt = '<b>فهرست ابی · منتظر تأیید</b>'."\n\n".'«'.esc_html($p->post_title).'»'."\n".'<i>'.esc_html(isset($labels[$why]) ? $labels[$why] : $why).'</i>';
  if ($n > 1) $txt .= "\n\n".'در صف: <b>'.tj_ebi_fa($n).'</b> مورد';
  $txt .= "\n\n".'هر کدام از شما بزند کافی است؛ همان لحظه روی سایت می‌آید.';
  $btn = array(array(array('text'=>'✅ انتشار همین','url'=>tj_ebi_modurl('pub',$id)), array('text'=>'✖️ رد','url'=>tj_ebi_modurl('del',$id))));
  if ($n > 1) $btn[] = array(array('text'=>'📋 صف تأیید ('.tj_ebi_fa($n).')','url'=>tj_ebi_modurl('list',0)));
  tj_ebi_send_all($txt, $btn, 'EBI-'.$id, $why === 'risk' ? 'فوری' : 'کار');
}
/* hourly sweep: anything still pending and not notified recently */
add_action('init', function(){ if (!wp_next_scheduled('tj_ebi_sweep')) wp_schedule_event(time()+300, 'hourly', 'tj_ebi_sweep'); });
add_action('tj_ebi_sweep', function(){
  $ids = tj_ebi_pending_ids(); if (!$ids) return;
  foreach ($ids as $id){ if (!get_post_meta($id,'tj_review',true)) { tj_ebi_moderate($id); } }
  $ids = tj_ebi_pending_ids(); if ($ids) tj_ebi_notify_queue(end($ids), 'manual');
});

/* one-tap pages for moderators */
add_action('init', function(){
  if (empty($_GET['tj_ebi_mod'])) return;
  $a = sanitize_key($_GET['tj_ebi_mod']); $id = isset($_GET['i']) ? (int)$_GET['i'] : 0; $s = isset($_GET['s']) ? (string)$_GET['s'] : '';
  nocache_headers(); header('Content-Type: text/html; charset=utf-8'); header('X-Robots-Tag: noindex');
  $ok = hash_equals(tj_ebi_sig($a.'|'.$id), $s);
  $msg = ''; $body = '';
  if (!$ok){ $msg = 'این لینک معتبر نیست.'; }
  elseif ($a === 'pub' || $a === 'del'){
    $p = get_post($id);
    if (!$p || $p->post_type !== 'tj_ebi_item') $msg = 'این مورد پیدا نشد.';
    elseif ($p->post_status === 'publish') $msg = 'این مورد قبلاً منتشر شده بود. ✅';
    elseif ($p->post_status === 'trash') $msg = 'این مورد قبلاً رد شده بود.';
    elseif ($a === 'pub'){ wp_update_post(array('ID'=>$id,'post_status'=>'publish')); update_post_meta($id,'tj_by','link'); $msg = 'منتشر شد ✅'; }
    else { wp_trash_post($id); $msg = 'رد شد و از صف برداشته شد.'; }
    if ($p) $body = '<p class="q">«'.esc_html($p->post_title).'»</p>';
    $n = count(tj_ebi_pending_ids());
    if ($n) $body .= '<a class="b" href="'.esc_url(tj_ebi_modurl('list',0)).'">'.tj_ebi_fa($n).' مورد دیگر در صف</a>';
  }
  elseif ($a === 'list'){
    $msg = 'صف تأیید فهرست ابی';
    $ids = tj_ebi_pending_ids();
    if (!$ids) $body = '<p>صف خالی است. 🌱</p>';
    foreach ($ids as $pid){
      $p = get_post($pid); $nm = get_post_meta($pid,'tj_anon',true) === '1' ? 'بی‌نام' : get_post_meta($pid,'tj_name',true);
      $body .= '<div class="it"><p class="q">«'.esc_html($p->post_title).'»</p><small>'.esc_html($nm).'</small><div><a class="b" href="'.esc_url(tj_ebi_modurl('pub',$pid)).'">✅ انتشار</a><a class="b x" href="'.esc_url(tj_ebi_modurl('del',$pid)).'">✖️ رد</a></div></div>';
    }
  } else { $msg = 'درخواست ناشناخته.'; }
  echo '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>فهرست ابی</title><style>body{font-family:Vazirmatn,Tahoma,sans-serif;margin:0;padding:24px 16px;background:#fff;color:#222;max-width:520px;margin-inline:auto}h1{font-size:20px}.q{font-size:17px;color:#0e0e0e;margin:8px 0}.it{border:1px solid #dfdfe2;border-radius:14px;padding:12px;margin:10px 0}.it small{color:#676768}.b{display:inline-block;margin:8px 0 0 8px;padding:10px 16px;border-radius:999px;background:#c83f49;color:#fff;text-decoration:none;font-weight:700}.b.x{background:#fff;color:#222;border:1px solid #dfdfe2}</style></head><body><h1>'.esc_html($msg).'</h1>'.$body.'</body></html>';
  exit;
}, 1);

/* ---------- people lists ---------- */
add_action('init', function(){
  register_post_type('tj_ebi_person', array(
    'labels'=>array('name'=>'فهرست‌های کمپین','singular_name'=>'نفر','menu_name'=>'ثبت‌نام‌ها','all_items'=>'ثبت‌نام‌ها'),
    'public'=>false,'show_ui'=>true,'show_in_menu'=>'edit.php?post_type=tj_ebi_item','supports'=>array('title','custom-fields'),
    'capability_type'=>'post','map_meta_cap'=>true,
  ));
});
function tj_ebi_kinds(){ return array('night'=>'شب اجرای تجربه','student'=>'دانشجو','therapist'=>'درمانگر و روانپزشک','crisis'=>'کادر بحران و اورژانس','bereaved'=>'بازماندهٔ سوگ','community'=>'کامیونیتی تجربه','follow'=>'همراه فهرست'); }
function tj_ebi_digits($s){ return strtr((string)$s, array('۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9')); }
add_action('rest_api_init', function(){
  register_rest_route('tj/v1','/ebi-join', array('methods'=>'POST','permission_callback'=>'__return_true','callback'=>function($req){
    if ((string)$req->get_param('hp') !== '') return new WP_REST_Response(array('ok'=>true),200);
    $kinds = tj_ebi_kinds(); $kind = sanitize_key((string)$req->get_param('kind'));
    if (!isset($kinds[$kind])) return new WP_REST_Response(array('ok'=>false,'msg'=>'نوع ثبت‌نام نامعتبر است.'),400);
    $name = mb_substr(trim(wp_strip_all_tags((string)$req->get_param('name'))),0,60);
    $phone = preg_replace('/[^0-9+]/','', tj_ebi_digits((string)$req->get_param('phone')));
    if (strlen(preg_replace('/\D/','',$phone)) < 10) return new WP_REST_Response(array('ok'=>false,'msg'=>'شمارهٔ تماس را کامل بنویسید.'),400);
    if ($kind !== 'follow' && $name === '') return new WP_REST_Response(array('ok'=>false,'msg'=>'نام را بنویسید.'),400);
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'x'; $k = 'tj_ebi_jr_'.md5($ip); $c = (int)get_transient($k);
    if ($c >= 8) return new WP_REST_Response(array('ok'=>false,'msg'=>'چند بار ثبت کرده‌اید؛ کمی بعد دوباره امتحان کنید.'),429);
    set_transient($k,$c+1,HOUR_IN_SECONDS*6);
    $f = array();
    foreach (array('uni','field','count','nights','role','note','city','ref') as $x){ $v = mb_substr(trim(wp_strip_all_tags((string)$req->get_param($x))),0,300); if ($v !== '') $f[$x] = $v; }
    $id = wp_insert_post(array('post_type'=>'tj_ebi_person','post_status'=>'private','post_title'=>($name !== '' ? $name : 'بی‌نام').' · '.$kinds[$kind]), true);
    if (is_wp_error($id)) return new WP_REST_Response(array('ok'=>false,'msg'=>'ثبت نشد؛ دوباره امتحان کنید.'),500);
    update_post_meta($id,'tj_kind',$kind); update_post_meta($id,'tj_name',$name); update_post_meta($id,'tj_phone',$phone);
    update_post_meta($id,'tj_src', mb_substr(sanitize_text_field((string)$req->get_param('src')),0,40));
    foreach ($f as $x=>$v) update_post_meta($id,'tj_'.$x,$v);
    if (!empty($f['ref']) && strpos($f['ref'],'.') !== false){ list($iid,$sg) = explode('.',$f['ref'],2); if (hash_equals(tj_ebi_sig('ref|'.(int)$iid),$sg)) update_post_meta((int)$iid,'tj_person',$id); }
    $code = 'ebi'.$id.'-'.substr(tj_ebi_sig('p|'.$id),0,6);
    update_post_meta($id,'tj_start',$code);
    $GLOBALS['tj_ebi_join_new'] = $id;
    return new WP_REST_Response(array('ok'=>true,'start'=>$code),200);
  }));
  /* bot: link a chat_id to a person (start=ebi<id>-<sig>) and read lists */
  register_rest_route('tj/v1','/ebi-people', array(
    array('methods'=>'GET','permission_callback'=>'tj_ebi_botauth','callback'=>function($req){
      $kind = sanitize_key((string)$req->get_param('kind'));
      $args = array('post_type'=>'tj_ebi_person','post_status'=>'private','numberposts'=>2000,'orderby'=>'date','order'=>'ASC','suppress_filters'=>true);
      if ($kind) $args['meta_query'] = array(array('key'=>'tj_kind','value'=>$kind));
      $out = array();
      foreach (get_posts($args) as $p){ $m = get_post_meta($p->ID); $row = array('id'=>$p->ID,'date'=>$p->post_date);
        foreach ($m as $k=>$v){ if (strpos($k,'tj_') === 0) $row[substr($k,3)] = $v[0]; } $out[] = $row; }
      return array('ok'=>true,'items'=>$out);
    }),
    array('methods'=>'POST','permission_callback'=>'tj_ebi_botauth','callback'=>function($req){
      $code = (string)$req->get_param('start'); $chat = preg_replace('/[^0-9-]/','',(string)$req->get_param('chat_id'));
      if (!preg_match('/^ebi(\d+)-([a-f0-9]{6})$/',$code,$m)) return array('ok'=>false,'error'=>'bad_code');
      if (!hash_equals(substr(tj_ebi_sig('p|'.$m[1]),0,6),$m[2])) return array('ok'=>false,'error'=>'bad_sig');
      update_post_meta((int)$m[1],'tj_chat_id',$chat); update_post_meta((int)$m[1],'tj_linked',current_time('mysql'));
      return array('ok'=>true,'id'=>(int)$m[1],'kind'=>get_post_meta((int)$m[1],'tj_kind',true),'name'=>get_post_meta((int)$m[1],'tj_name',true));
    }),
  ));
  /* admin: set bot api config */
  register_rest_route('tj/v1','/ebi-ops', array('methods'=>'POST','permission_callback'=>function(){ return current_user_can('manage_options'); },'callback'=>function($req){
    $do = (string)$req->get_param('do');
    if ($do === 'setcfg'){ $mods = array_values(array_filter(array_map(function($x){ return preg_replace('/[^0-9-]/','',(string)$x); }, (array)$req->get_param('mods')))); update_option('tj_bot_api', array('key'=>sanitize_text_field((string)$req->get_param('key')),'webapp'=>esc_url_raw((string)$req->get_param('webapp')),'mods'=>$mods), false); return array('ok'=>true,'mods'=>count($mods)); }
    if ($do === 'status'){ $r = tj_ebibot_call(array('action'=>'status')); return array('ok'=>!empty($r['ok']),'version'=>isset($r['data']['version']) ? $r['data']['version'] : null,'log'=>array_slice((array)get_option('tj_ebi_ops_log',array()),0,10)); }
    if ($do === 'test'){ $mods = tj_ebi_mods(); if (!$mods) return array('ok'=>false,'error'=>'no_mods'); return tj_ebibot_call(array('action'=>'send','dry'=>true,'chat'=>$mods[0],'type'=>'کار','ref'=>'EBI-TEST','text'=>'test')); }
    if ($do === 'moderate'){ $ids = tj_ebi_pending_ids(); foreach ($ids as $id) tj_ebi_moderate($id); return array('ok'=>true,'n'=>count($ids)); }
    return array('ok'=>false);
  }));
});
function tj_ebi_botauth($req){
  $c = tj_ebibot_cfg(); $k = (string)$req->get_header('x_tj_key'); if ($k === '') $k = (string)$req->get_param('key');
  return !empty($c['key']) && $k !== '' && hash_equals($c['key'], $k);
}
/* notify moderators about new signups (throttled digest) */
add_action('shutdown', function(){
  if (empty($GLOBALS['tj_ebi_join_new'])) return;
  if (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
  $id = $GLOBALS['tj_ebi_join_new'];
  $last = (int)get_option('tj_ebi_join_notify',0);
  if (time() - $last < 30*MINUTE_IN_SECONDS) return;
  update_option('tj_ebi_join_notify', time(), false);
  $kinds = tj_ebi_kinds(); $since = get_option('tj_ebi_join_since', '2026-10-01 00:00:00');
  $q = get_posts(array('post_type'=>'tj_ebi_person','post_status'=>'private','numberposts'=>500,'fields'=>'ids','date_query'=>array(array('after'=>$since)),'suppress_filters'=>true));
  update_option('tj_ebi_join_since', current_time('mysql'), false);
  $cnt = array(); foreach ($q as $pid){ $kk = get_post_meta($pid,'tj_kind',true); $cnt[$kk] = isset($cnt[$kk]) ? $cnt[$kk]+1 : 1; }
  $lines = array(); foreach ($cnt as $kk=>$n) $lines[] = '· '.(isset($kinds[$kk]) ? $kinds[$kk] : $kk).': <b>'.tj_ebi_fa($n).'</b>';
  $txt = '<b>پلی‌لیست ابی · ثبت‌نام تازه</b>'."\n\n".implode("\n",$lines)."\n\n".'<i>فهرست کامل در پیشخوان سایت، بخش «فهرست ابی › ثبت‌نام‌ها».</i>';
  tj_ebi_send_all($txt, array(array(array('text'=>'باز کردن فهرست','url'=>admin_url('edit.php?post_type=tj_ebi_person')))), 'EBI-JOIN', 'گزارش');
}, 21);

/* admin columns + csv export */
add_filter('manage_tj_ebi_person_posts_columns', function($c){ return array('cb'=>$c['cb'],'title'=>'نام','tj_kind'=>'نوع','tj_phone'=>'شماره','tj_more'=>'جزئیات','tj_bot'=>'بات','date'=>'تاریخ'); });
add_action('manage_tj_ebi_person_posts_custom_column', function($col,$id){
  $k = tj_ebi_kinds();
  if ($col === 'tj_kind'){ $v = get_post_meta($id,'tj_kind',true); echo esc_html(isset($k[$v]) ? $k[$v] : $v); }
  if ($col === 'tj_phone') echo '<span dir="ltr">'.esc_html(get_post_meta($id,'tj_phone',true)).'</span>';
  if ($col === 'tj_more'){ $o = array(); foreach (array('uni'=>'دانشگاه','field'=>'رشته','count'=>'تعداد','nights'=>'شب‌ها','role'=>'نقش','city'=>'شهر','note'=>'یادداشت') as $x=>$l){ $v = get_post_meta($id,'tj_'.$x,true); if ($v !== '') $o[] = $l.': '.$v; } echo esc_html(implode(' · ',$o)); }
  if ($col === 'tj_bot') echo get_post_meta($id,'tj_chat_id',true) ? '✅' : '·';
}, 10, 2);
add_filter('manage_tj_ebi_item_posts_columns', function($c){ $c['tj_check'] = 'بررسی'; return $c; }, 20);
add_action('manage_tj_ebi_item_posts_custom_column', function($col,$id){ if ($col === 'tj_check') echo esc_html(trim(get_post_meta($id,'tj_by',true).' '.get_post_meta($id,'tj_review',true).' '.get_post_meta($id,'tj_check',true))); }, 10, 2);
add_action('restrict_manage_posts', function($pt){
  if ($pt !== 'tj_ebi_person') return;
  $k = tj_ebi_kinds(); $cur = isset($_GET['tj_kind']) ? sanitize_key($_GET['tj_kind']) : '';
  echo '<select name="tj_kind"><option value="">همهٔ نوع‌ها</option>'; foreach ($k as $v=>$l) echo '<option value="'.esc_attr($v).'"'.selected($cur,$v,false).'>'.esc_html($l).'</option>'; echo '</select>';
  echo ' <a class="button" href="'.esc_url(wp_nonce_url(admin_url('admin-post.php?action=tj_ebi_csv&kind='.$cur),'tj_ebi_csv')).'">خروجی CSV</a>';
});
add_action('pre_get_posts', function($q){ if (is_admin() && $q->is_main_query() && $q->get('post_type') === 'tj_ebi_person' && !empty($_GET['tj_kind'])) $q->set('meta_query', array(array('key'=>'tj_kind','value'=>sanitize_key($_GET['tj_kind'])))); });
add_action('admin_post_tj_ebi_csv', function(){
  if (!current_user_can('edit_posts') || !wp_verify_nonce(isset($_GET['_wpnonce']) ? $_GET['_wpnonce'] : '','tj_ebi_csv')) wp_die('no');
  $kind = isset($_GET['kind']) ? sanitize_key($_GET['kind']) : '';
  $args = array('post_type'=>'tj_ebi_person','post_status'=>'private','numberposts'=>5000,'orderby'=>'date','order'=>'ASC','suppress_filters'=>true);
  if ($kind) $args['meta_query'] = array(array('key'=>'tj_kind','value'=>$kind));
  header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="ebi-'.($kind ? $kind : 'all').'-'.date('Ymd').'.csv"');
  $o = fopen('php://output','w'); fwrite($o, "\xEF\xBB\xBF");
  $cols = array('kind','name','phone','uni','field','count','nights','role','city','note','src','chat_id');
  fputcsv($o, array_merge(array('date'),$cols));
  foreach (get_posts($args) as $p){ $r = array($p->post_date); foreach ($cols as $c) $r[] = get_post_meta($p->ID,'tj_'.$c,true); fputcsv($o,$r); }
  fclose($o); exit;
});
