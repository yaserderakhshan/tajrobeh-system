/**
 * robots.txt سایت تجربه.
 * فایل فیزیکی در ۱۹ شهریور ۱۴۰۵ حذف شد تا از وردپرس مدیریت شود.
 * ویرایشگر پروندهٔ یوست در نسخهٔ رایگان نیست و فیلتر robots_txt هم
 * توسط یوست بازنویسی می‌شود، پس خروجی را در همان اکشن do_robotstxt
 * می‌نویسیم و همان‌جا تمام می‌کنیم تا هیچ افزونه‌ای رویش دست نبرد.
 *
 * ۲۱ شهریور ۱۴۰۵ — دو تغییر:
 * ۱) فهرست خزندهٔ هوش مصنوعی کامل شد (GEO).
 * ۲) عمداً /login و /forms و /dashboard بدونِ اسلش بسته نشدند.
 *    این سه مسیر را اپ Next.js سرو می‌کند و الان ایندکس‌اند. اگر اینجا
 *    ببندیمشان گوگل دیگر نمی‌تواند noindex آینده را ببیند و آدرس‌ها
 *    تا ابد در نتایج می‌مانند. مسیر درست: مسئول فنی سایت هدر X-Robots-Tag: noindex
 *    را روی این سه مسیر بگذارد، بعد از حذف شدن از ایندکس اینجا هم بسته شود.
 */
add_action('do_robotstxt', function () {
  $lines = array(
    '# مرکز تجربه زندگی · tajrobeh.life',
    '# راهنمای دستیارهای هوش مصنوعی: https://tajrobeh.life/llms.txt',
    '',
    'User-agent: *',
    'Disallow: /wp-admin/',
    'Allow: /wp-admin/admin-ajax.php',
    'Disallow: /wp-json/',
    'Disallow: /forms/',
    'Disallow: /login/',
    'Disallow: /dashboard/',
    'Disallow: /wp-content/uploads/wpo/wpo-plugins-tables-list.json',
    'Disallow: /*?s=',
    'Disallow: /*?replytocom=',
    '',
    '# دستیارها و موتورهای جست‌وجوی هوش مصنوعی: دسترسی کامل',
    'User-agent: GPTBot',
    'User-agent: OAI-SearchBot',
    'User-agent: ChatGPT-User',
    'User-agent: ClaudeBot',
    'User-agent: Claude-User',
    'User-agent: Claude-SearchBot',
    'User-agent: anthropic-ai',
    'User-agent: PerplexityBot',
    'User-agent: Perplexity-User',
    'User-agent: Google-Extended',
    'User-agent: Google-CloudVertexBot',
    'User-agent: Applebot',
    'User-agent: Applebot-Extended',
    'User-agent: DuckAssistBot',
    'User-agent: meta-externalagent',
    'User-agent: Meta-ExternalFetcher',
    'User-agent: Amazonbot',
    'User-agent: MistralAI-User',
    'User-agent: cohere-ai',
    'User-agent: YouBot',
    'User-agent: CCBot',
    'User-agent: Bytespider',
    'User-agent: TikTokSpider',
    'User-agent: Timpibot',
    'User-agent: LinerBot',
    'User-agent: ProRataInc',
    'User-agent: Diffbot',
    'User-agent: omgili',
    'User-agent: omgilibot',
    'User-agent: Webzio-Extended',
    'User-agent: AI2Bot',
    'Allow: /',
    'Disallow: /wp-admin/',
    'Disallow: /wp-json/',
    'Disallow: /forms/',
    'Disallow: /login/',
    'Disallow: /dashboard/',
    '',
    'Sitemap: https://tajrobeh.life/sitemap_index.xml',
    ''
  );
  echo implode(chr(10), $lines);
  exit;
});