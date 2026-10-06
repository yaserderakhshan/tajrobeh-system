/* Tajrobeh · کمپین ثبت‌نام مدرسه (v122 بات)
   ۱) /wp-json/tj/v1/camp?code=EFT-1 : وضعیت کمپین از بات (هاب مدرسه)، با کش ۵ دقیقه‌ای
   ۲) هر صفحه‌ای که ریشه‌اش data-camp="EFT-1" دارد، با data-cp و data-cp-href و data-cp-show زنده می‌شود
   ۳) صفحه‌ای که data-camp-event دارد، JSON-LD رویداد وبینار را از همان داده می‌گیرد
   قاعده: هیچ عدد و تاریخی در این اسنیپت نیست؛ همه از تب «کمپین‌ها» و «خط زمانی کمپین» هاب مدرسه می‌آید.
   ۱۴ مهر ۱۴۰۵ (بات v170.16.1): رمز کمپین با GitHub Secret تازهٔ «CP_WP_SECRET» عوض شد. بات تا دیدن اولین ۲۰۰ با رمز تازه، با رمز قبلی هم می‌فرستد؛ پس فاصله‌ای نیست. */

if (!defined('TJ_CAMP_SECRET_V2')) define('TJ_CAMP_SECRET_V2', '');  // رمز کمپین؛ مقدار فقط از GitHub Secret «CP_WP_SECRET» هنگام انتشار (در گیت خالی). رمز قدیمی TJ_CAMP_SECRET از ۱۱ مهر کنار رفت.

/* ۱۱ مهر ۱۴۰۵: فقط رمز تازه؛ رمز خالی یا کوتاه هرگز پذیرفته نمی‌شود
   (پیش از این hash_equals('', '') هر درخواست بی رمز را می‌پذیرفت، اگر رمز تعریف نشده بود). همین تابع برای /thers-push (505131). */
if (!function_exists('tj_camp_auth')) {
  function tj_camp_auth($r) {
    $given = (string) $r->get_header('x-tj-secret');
    if ($given === '') return false;
    foreach (array(TJ_CAMP_SECRET_V2) as $s) {
      if (strlen($s) >= 32 && strpos($s, '__') !== 0 && hash_equals($s, $given)) return true;
    }
    return false;
  }
}

/* داده را بات هر ۱۵ دقیقه و بعد از هر تغییر به /camp-push می‌فرستد (سرور ایران به googleusercontent نمی‌رسد).
   کشیدن مستقیم فقط پشتیبان است، با مهلت کوتاه. */
if (!function_exists('tj_camp_get')) {
  function tj_camp_get($code) {
    $code = preg_replace('/[^A-Za-z0-9\-]/', '', (string) $code);
    if (!$code) return null;
    $key = 'tj_camp_' . strtolower($code);
    $pushed = get_option($key . '_last');
    if ($pushed) return $pushed;
    if (get_transient($key . '_fail')) return null;
    $url = 'https://script.google.com/macros/s/AKfycbxD-DYhZ9LFjwB9az_DpMprzF_ItJkdad_DutMGPk1qY3ksBb45aMHYZBsXTCepYhsC8Q/exec?api=camp&code=' . rawurlencode($code);
    $res = wp_remote_get($url, array('timeout' => 4, 'redirection' => 5));
    $j = null;
    if (!is_wp_error($res) && wp_remote_retrieve_response_code($res) === 200) $j = json_decode(wp_remote_retrieve_body($res), true);
    if (is_array($j) && !empty($j['ok'])) { update_option($key . '_last', $j, false); return $j; }
    set_transient($key . '_fail', 1, 600);
    return null;
  }
}

add_action('rest_api_init', function () {
  register_rest_route('tj/v1', '/camp-push', array(
    'methods' => 'POST',
    'permission_callback' => 'tj_camp_auth',
    'callback' => function ($r) {
      $b = $r->get_json_params();
      $n = 0; $changed = false;
      if (is_array($b) && !empty($b['camps']) && is_array($b['camps'])) {
        foreach ($b['camps'] as $j) {
          if (!is_array($j) || empty($j['ok']) || empty($j['code'])) continue;
          $code = preg_replace('/[^A-Za-z0-9\-]/', '', (string) $j['code']);
          $j['pushed'] = time();
          $old = get_option('tj_camp_' . strtolower($code) . '_last');
          $ow = ($old && !empty($old['webinar'])) ? $old['webinar']['at']['iso'] : '';
          $nw = !empty($j['webinar']) ? $j['webinar']['at']['iso'] : '';
          if ($ow !== $nw) $changed = true;
          update_option('tj_camp_' . strtolower($code) . '_last', $j, false);
          delete_transient('tj_camp_' . strtolower($code) . '_fail');
          $n++;
        }
      }
      /* v170.13: آفرهای کمپین مراجعان (تب «کمپین‌های مراجعان» هاب پذیرش). فقط آفر فعال می‌آید؛ نبودن کلید یعنی دست نزن */
      if (is_array($b) && isset($b['offers']) && is_array($b['offers'])) {
        $clean = array();
        foreach ($b['offers'] as $o) {
          if (!is_array($o) || empty($o['code']) || empty($o['title'])) continue;
          $oc = preg_replace('/[^A-Za-z0-9]/', '', (string) $o['code']);
          if ($oc === '' || strlen($oc) > 20) continue;
          $op = isset($o['path']) ? preg_replace('#[^A-Za-z0-9/_\-]#', '', (string) $o['path']) : '';
          $op = '/' . trim($op !== '' ? $op : 'persian-therapy', '/') . '/';
          $clean[] = array('code' => $oc, 'title' => sanitize_text_field((string) $o['title']), 'path' => $op,
                           'bot' => 'https://t.me/tajrobehlife_bot?start=c_' . $oc);
        }
        if (wp_json_encode(get_option('tj_offers_last')) !== wp_json_encode($clean)) { update_option('tj_offers_last', $clean, false); $changed = true; }
      }
      if ($changed) { if (function_exists('wpo_cache_flush')) { wpo_cache_flush(); } }
      return array('ok' => true, 'saved' => $n);
    }
  ));
  register_rest_route('tj/v1', '/camp', array(
    'methods' => 'GET',
    'permission_callback' => '__return_true',
    'callback' => function ($r) {
      $j = tj_camp_get($r->get_param('code'));
      if (!$j) return new WP_Error('tj_camp', 'not found', array('status' => 404));
      $resp = rest_ensure_response($j);
      $resp->header('Cache-Control', 'public, max-age=120');
      return $resp;
    }
  ));
});

add_action('wp_head', function () {
  if (!is_singular()) return;
  $p = get_post();
  if (!$p) return;
  if (!preg_match('/data-camp-event="([A-Za-z0-9\-]+)"/', $p->post_content, $m)) return;
  $j = tj_camp_get($m[1]);
  if (!$j || empty($j['webinar'])) return;
  $w = $j['webinar'];
  $ev = array(
    '@context' => 'https://schema.org', '@type' => 'EducationEvent',
    'name' => $w['title'], 'startDate' => $w['at']['iso'],
    'eventAttendanceMode' => 'https://schema.org/OnlineEventAttendanceMode',
    'eventStatus' => 'https://schema.org/EventScheduled', 'isAccessibleForFree' => true, 'inLanguage' => 'fa',
    'location' => array('@type' => 'VirtualLocation', 'url' => $j['links']['web']),
    'organizer' => array('@type' => 'EducationalOrganization', 'name' => 'مدرسهٔ تجربه زندگی', 'url' => 'https://tajrobeh.life/school/'),
    'offers' => array('@type' => 'Offer', 'price' => 0, 'priceCurrency' => 'IRR', 'url' => get_permalink($p), 'availability' => 'https://schema.org/InStock'),
    'about' => $j['course']
  );
  echo '<script type="application/ld+json">' . wp_json_encode($ev, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>' . "\n";
});

add_action('wp_footer', function () {
  ?>
<script>
(function(){
var root=document.querySelector('#tj2[data-camp]');
if(!root) return;
var code=root.getAttribute('data-camp');
var src=root.getAttribute('data-camp-src')||'site';
var fa=function(n){return String(n).replace(/[0-9]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[d];});};
var money=function(n){return fa(String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'٬'))+' تومان';};
var put=function(k,v){var l=root.querySelectorAll('[data-cp="'+k+'"]');for(var i=0;i<l.length;i++){l[i].textContent=v;}};
fetch('/wp-json/tj/v1/camp?code='+encodeURIComponent(code)).then(function(r){return r.json();}).then(function(j){
  if(!j || !j.ok) return;
  root.setAttribute('data-camp-state', j.state);
  put('state', j.stateLine);
  if(j.webinar){
    put('web-title', j.webinar.title);
    put('web-date', j.webinar.at.day+' '+j.webinar.at.fa);
    put('web-time', 'ساعت '+j.webinar.at.time+' به وقت تهران');
    put('web-when', j.webinar.at.day+' '+j.webinar.at.fa+'، ساعت '+j.webinar.at.time);
    var cal=root.querySelectorAll('[data-cp-href="cal"]');for(var c=0;c<cal.length;c++){cal[c].href=j.webinar.cal;}
  }
  if(j.tier){
    put('tier-amount', money(j.tier.amount));
    put('tier-label', j.tier.label);
    put('tier', money(j.tier.amount)+(j.tier.until?' تا '+j.tier.until.fa:''));
  }
  if(j.prepay){ put('prepay', money(j.prepay)); }
  if(j.fee){ put('fee', money(j.fee)); }
  if(j.start){ put('start', j.start.fa); }
  if(j.deadline){ put('deadline', j.deadline.fa); }
  var box=root.querySelector('[data-cp="tiers"]');
  if(box){ if(j.tiers){ if(j.tiers.length){
    var h='';
    for(var t=0;t<j.tiers.length;t++){var x=j.tiers[t];
      h+='<div class="'+(x.now?'now':(x.past?'past':''))+'"><span>'+(x.now?'الان · ':'')+x.label+' · تا '+x.until.fa+'</span><b>'+money(x.amount).replace(' تومان','')+'<small>تومان در ماه</small></b></div>';}
    box.innerHTML=h; } } }
  var links={web:j.links.web,apply:j.links.apply,pre:j.links.pre,card:j.links.card};
  var hs=root.querySelectorAll('[data-cp-href]');
  for(var k=0;k<hs.length;k++){var w=hs[k].getAttribute('data-cp-href'); if(links[w]){ hs[k].href=links[w]+'_'+src; }}
  var show={web:!!j.webinar, noweb:!j.webinar, apply:!!j.canApply, applyonly:(j.canApply?!j.webinar:false), pre:!j.canApply, closed:j.state==='بسته', open:j.state!=='بسته'};
  var ss=root.querySelectorAll('[data-cp-show]');
  for(var s=0;s<ss.length;s++){var want=ss[s].getAttribute('data-cp-show').split(' '), ok=false;
    for(var q=0;q<want.length;q++){ if(show[want[q]]){ ok=true; } }
    ss[s].hidden=!ok; }
}).catch(function(){});
})();
</script>
<?php
}, 30);

/* v170.13: بخش آفر روی /persian-therapy/ و صفحه‌های کشوری، خودکار از tj_offers_last (بی ویرایش دستی هر برگه).
   صفحه‌های انگلیسی (/en/) نه. دکمه همان «رزرو معارفه در تلگرام» صفحه با کد c_<کد>. */
add_filter('the_content', function ($c) {
  if (!is_page() || !in_the_loop() || !is_main_query()) return $c;
  $offers = get_option('tj_offers_last');
  if (empty($offers) || !is_array($offers)) return $c;
  $path = (string) wp_parse_url(get_permalink(), PHP_URL_PATH);
  if ($path === '' || strpos($path, '/en/') !== false) return $c;
  $html = '';
  foreach ($offers as $o) {
    if (empty($o['path']) || strpos($path, $o['path']) !== 0) continue;
    $html .= '<section class="tj-offer" id="offer-' . esc_attr($o['code']) . '" dir="rtl"><p class="tj-offer-t">' . esc_html($o['title']) . '</p>'
           . '<a class="btn btn-brand" href="' . esc_url($o['bot']) . '" target="_blank" rel="noopener">رزرو معارفه در تلگرام</a></section>';
  }
  return $html === '' ? $c : $html . $c;
}, 20);
add_action('wp_head', function () {
  if (!is_page()) return;
  $offers = get_option('tj_offers_last');
  if (empty($offers)) return;
  echo '<style>.tj-offer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;max-width:1100px;margin:16px auto;padding:14px 18px;background:#faeced;border-inline-start:4px solid #c83f49;border-radius:12px;font-family:"Anjoman Max","Vazirmatn",system-ui,sans-serif;line-height:1.5}.tj-offer-t{margin:0;font-weight:800;color:#222222}@media (max-width:600px){.tj-offer{margin:12px 16px}.tj-offer .btn{width:100%;text-align:center}}</style>';
});
