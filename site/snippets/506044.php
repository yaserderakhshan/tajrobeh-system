/* Tajrobeh · عکس کپسول‌های «آدم‌های تجربه» از صفحهٔ تیم (p3 avatar sync v1، ۱۴ مهر ۱۴۰۵)
   ریشهٔ عکس خالی یک درمانگر: کپسول‌های a.p3 صفحهٔ اصلی با نشانی دستی ساخته شده بودند (/2026/09/<نام>-150x150.webp)،
   ولی عکس او مهر آپلود شده و وردپرس نام را با -1 عوض کرده بود؛ نشانی حدسی ۴۰۴ می‌داد.
   حالا هر کپسولی که به /team/<slug>/ لینک دارد، عکسش را موقع نمایش از دادهٔ همان صفحهٔ تیم (آواتار) می‌گیرد؛
   پس عکس تازه یا عوض‌شده خودش همه‌جا می‌رسد و نشانی دستی دیگر نمی‌شکند. اگر صفحهٔ تیم آواتار نداشت، همان قبلی می‌ماند. */
add_filter('the_content', function ($c) {
  if (is_admin() || strpos($c, 'class="p3"') === false) return $c;
  return preg_replace_callback('#(<a class="p3" href="/team/([a-z0-9\-]+)/"><img\b[^>]*?\ssrc=")[^"]*"#', function ($m) {
    static $cache = array();
    $slug = $m[2];
    if (!array_key_exists($slug, $cache)) {
      $u = '';
      $p = get_page_by_path($slug, OBJECT, 'tj_person');
      if ($p) {
        if (function_exists('tjp_data')) {
          $d = tjp_data($p->ID);
          if (!empty($d['img']['avatar'])) $u = (string) $d['img']['avatar'];
        }
      }
      $cache[$slug] = $u;
    }
    if ($cache[$slug] === '') return $m[0];
    return $m[1] . esc_url($cache[$slug]) . '"';   /* ویژگی‌های دیگر img (مثل decoding که وردپرس پیش از این فیلتر می‌افزاید) دست نمی‌خورند */
  }, $c);
}, 25);
