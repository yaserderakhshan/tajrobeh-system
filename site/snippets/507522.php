/* لین O · خوشه‌های محتوایی: لینک دوطرفهٔ ستون و زیرشاخه‌ها (۱۱ آبان ۱۴۰۵) */
add_filter('the_content', function ($c) {
  if (!is_singular('post') || !in_the_loop() || !is_main_query()) return $c;
  $map = array(
    'lacan-cluster'    => array('learn-lacan', 'نقشهٔ آموزش لکان در مجلهٔ تجربه'),
    'freud-cluster'    => array('learn-freud-where-to-start', 'نقشهٔ آموزش فروید در مجلهٔ تجربه'),
    'analytic-cluster' => array('psychoanalytic-approaches', 'رویکردهای تحلیلی در مجلهٔ تجربه'),
    'abroad-cluster'   => array('', 'راهنمای سلامت روان در مهاجرت'),
    'school-cluster'   => array('learn-psychoanalytic-psychotherapy', 'نقشهٔ آموزش روان‌درمانی تحلیلی'),
    'cbt-cluster'      => array('', 'درمان شناختی رفتاری در مجلهٔ تجربه'),
  );
  $me = get_the_ID();
  foreach (wp_get_post_tags($me, array('fields' => 'slugs')) as $t) {
    if (!isset($map[$t])) continue;
    $q = get_posts(array('tag' => $t, 'numberposts' => 80, 'post_status' => 'publish', 'orderby' => 'date', 'order' => 'ASC'));
    if (count($q) < 2) return $c;
    $pil = $map[$t][0] ? get_page_by_path($map[$t][0], OBJECT, 'post') : null;
    $h = '<style>.tjx-cl{margin:40px 0 0;padding:22px 22px 14px;border:1px solid var(--tj-line,#dfdfe2);border-radius:18px;background:var(--tj-sunk,#f5f5f8)}.tjx-cl .h{font-weight:700;color:var(--tj-ink,#0e0e0e);margin-bottom:10px;font-size:17px}.tjx-cl .p{display:inline-block;margin-bottom:12px;color:var(--tj-red,#c83f49)!important;font-weight:600}.tjx-cl ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}.tjx-cl li{margin:0}.tjx-cl li a{display:inline-block;padding:6px 14px;border-radius:999px;background:#fff;border:1px solid var(--tj-line,#dfdfe2);font-size:14.5px;line-height:1.7;color:var(--tj-soft,#4e4e4e)!important;text-decoration:none}.tjx-cl li a:hover{border-color:var(--tj-red-400,#d9737a);color:var(--tj-red,#c83f49)!important}</style>';
    $h .= '<nav class="tjx-cl" aria-label="' . esc_attr($map[$t][1]) . '"><div class="h">' . esc_html($map[$t][1]) . '</div>';
    if ($pil) {
      if ($pil->ID != $me) $h .= '<a class="p" href="' . esc_url(get_permalink($pil)) . '">نقشهٔ کامل: ' . esc_html(get_the_title($pil)) . '</a>';
    }
    $h .= '<ul>';
    foreach ($q as $p) {
      if ($p->ID == $me) continue;
      if ($pil) { if ($p->ID == $pil->ID) continue; }
      $h .= '<li><a href="' . esc_url(get_permalink($p)) . '">' . esc_html(get_the_title($p)) . '</a></li>';
    }
    return $c . $h . '</ul></nav>';
  }
  return $c;
}, 30);