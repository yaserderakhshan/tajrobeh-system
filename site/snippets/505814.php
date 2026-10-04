// وقتی مطلبی منتشر می‌شود، کش صفحه‌ها (از جمله /mag/) خالی شود تا مطلب تازه همان لحظه دیده شود. ۱۰ مهر ۱۴۰۵
add_action('transition_post_status', function($new, $old, $post){
  if ($new !== 'publish' || $old === 'publish' || !$post || $post->post_type !== 'post') return;
  if (function_exists('wpo_cache_flush')) { wpo_cache_flush(); }
}, 20, 3);