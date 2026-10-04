/* Tajrobeh — بلوک‌های تبدیل مقالهٔ مجله. نسخهٔ ۱ (شهریور ۱۴۰۵)
   یک بلوک اصلی بات (با گفت‌وگوی متحرک)، یک خط سبک میان‌متنی، و نوار کامیونیتی دانشجویان.
   نوع بلوک از نقشهٔ tjcv_cfg و در نبودش از دستهٔ مقاله تعیین می‌شود.
   همهٔ کلیک‌ها و دیده‌شدن‌ها با پارامتر صفحه، نوع بلوک و پارامتر start به آنالیتیکس می‌رود. */

if ( ! function_exists( 'tjcv_cfg' ) ) {

function tjcv_cfg( $id ) {
    $map = array(
        104 => array( 'v' => 't', 'topic' => 'خودشیفتگی و رابطه با والد' ),
        86  => array( 'v' => 't', 'topic' => 'خودشیفتگی و رابطه با والد' ),
        193 => array( 'v' => 't', 'topic' => 'سوگ و مرگ' ),
        35  => array( 'v' => 'a', 'topic' => 'پادکست و شنیدنی' ),
        89  => array( 'v' => 'a', 'topic' => 'پادکست و شنیدنی' ),
        118 => array( 'v' => 'k', 'topic' => 'روانکاوی' ),
    );
    if ( isset( $map[ $id ] ) ) { return $map[ $id ]; }
    $c = wp_get_post_categories( $id );
    if ( in_array(18,$c,true) || in_array(19,$c,true) || in_array(17,$c,true) || in_array(4,$c,true) ) { return array('v'=>'a','topic'=>'فیلم، کتاب و پادکست'); }
    if ( in_array(9,$c,true) || in_array(7,$c,true) || in_array(11,$c,true) || in_array(13,$c,true) || in_array(8,$c,true) ) { return array('v'=>'t','topic'=>'روان‌درمانی'); }
    if ( in_array(5,$c,true) || in_array(20,$c,true) ) { return array('v'=>'s','topic'=>'روانکاوی'); }
    if ( in_array(10,$c,true) ) { return array('v'=>'k','topic'=>'روانکاوی'); }
    return array('v'=>'k','topic'=>'روان‌شناسی');
}

function tjcv_is_student( $id ) {
    $c = wp_get_post_categories( $id );
    return ( in_array(10,$c,true) || in_array(5,$c,true) || in_array(19,$c,true) || in_array(20,$c,true) );
}

function tjcv_ic( $n ) {
    $s = array(
        'tg'    => '<path d="M22 3 2 10.5l6.5 2.2L20 6l-8.8 8.4.4 6.1 3.2-3.9 4.6 3.4z"/>',
        'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'heart' => '<path d="M20.8 6.6a5 5 0 0 0-8.8-1.7A5 5 0 0 0 3.2 6.6c-1 3 1.6 6 8.8 12 7.2-6 9.8-9 8.8-12z"/>',
        'check' => '<path d="M4 12.5 9.5 18 20 6.5"/>',
        'bolt'  => '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
        'users' => '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6"/><path d="M17 5.4a3.4 3.4 0 0 1 0 6"/><path d="M18.6 14.9c2 .7 3.4 2.3 3.4 5.1"/>',
        'globe' => '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18"/>',
    );
    $p = isset($s[$n]) ? $s[$n] : '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $p . '</svg>';
}

function tjcv_copy( $v, $topic ) {
    $t = array(
      't' => array(
        'h'  => 'اگر جایی از این متن به خودتان نزدیک بود',
        'p'  => 'در بات تلگرام تجربه، بدون ثبت‌نام و در چند دقیقه، وقت جلسهٔ معارفه می‌گیرید. معارفه تراپی نیست؛ گفت‌وگویی کوتاه است برای اینکه ببینیم کدام درمانگر و کدام شیوه به شما می‌خورد.',
        'btn'=> 'رزرو معارفهٔ رایگان در تلگرام',
        'f'  => array( array('clock','حدود بیست دقیقه'), array('heart','رایگان'), array('check','بدون ثبت‌نام') ),
        'c'  => array('چه چیزی این روزها بیشتر مشغولتان کرده؟', array('رابطه','خودم','خانواده'), 1, 'دو درمانگر برایتان انتخاب کردم.', array('پروفایل اول','پروفایل دوم'), 0, 'وقت معارفه رزرو شد'),
      ),
      'a' => array(
        'h'  => 'هر هفته یک پیشنهاد، با نگاه روانکاوانه',
        'p'  => 'فیلم، کتاب و پادکستی که در مجله تحلیلشان کرده‌ایم، در بات به دست خودتان می‌رسد. موضوع را خودتان انتخاب می‌کنید و هر وقت خواستید قطعش می‌کنید.',
        'btn'=> 'گرفتن پیشنهاد هفته در تلگرام',
        'f'  => array( array('check','موضوع را خودتان انتخاب می‌کنید'), array('heart','رایگان'), array('clock','هفته‌ای یک پیام') ),
        'c'  => array('به کدام‌ها علاقه دارید؟', array('فیلم','پادکست','کتاب'), 1, 'پیشنهاد این هفته آماده است.', array('بفرست','بعداً'), 0, 'هر هفته یکی می‌رسد'),
      ),
      's' => array(
        'h'  => 'دانشجوی روان‌شناسی هستید؟',
        'p'  => 'کامیونیتی تجربه رایگان است. از ژورنال کلاب‌ها و برنامه‌های عمومی مدرسه باخبر می‌شوید و می‌توانید در بخشی از جلسه‌ها شرکت کنید. برای عضویت لازم نیست در دوره‌ای ثبت‌نام کنید.',
        'btn'=> 'عضویت در کامیونیتی از تلگرام',
        'f'  => array( array('users','ویژهٔ دانشجویان'), array('heart','رایگان'), array('check','بدون ثبت‌نام در دوره') ),
        'c'  => array('دانشجوی چه مقطعی هستید؟', array('کارشناسی','ارشد','دکتری'), 1, 'برنامه‌های آزاد این ماه:', array('ژورنال کلاب','کارگاه'), 0, 'عضو کامیونیتی شدید'),
      ),
      'k' => array(
        'h'  => 'این موضوع را دنبال می‌کنید؟',
        'p'  => 'در بات تجربه موضوع‌های موردعلاقه‌تان را انتخاب می‌کنید و هر وقت مطلب تازه‌ای در همان حوزه منتشر شد خودمان خبرتان می‌کنیم. نه بیشتر، نه چیز دیگری.',
        'btn'=> 'دنبال‌کردن این موضوع در تلگرام',
        'f'  => array( array('check','فقط موضوع‌هایی که انتخاب کرده‌اید'), array('heart','رایگان'), array('clock','هر وقت خواستید قطعش کنید') ),
        'c'  => array('کدام موضوع‌ها را دنبال می‌کنید؟', array('روانکاوی','تروما','رابطه'), 0, 'مطلب تازه در همین موضوع:', array('بخوانم','بعداً'), 0, 'از این به بعد خبرتان می‌کنیم'),
      ),
    );
    $x = isset($t[$v]) ? $t[$v] : $t['k'];
    if ( $v === 'k' && $topic ) { $x['btn'] = 'دنبال‌کردن «' . $topic . '» در تلگرام'; }
    return $x;
}

function tjcv_chat( $c ) {
    $h  = '<div class="tjbot-chat"><div class="tjbot-top"><span class="av">' . tjcv_ic('tg') . '</span><span><b>بات تجربه</b><small>معمولاً در چند ثانیه پاسخ می‌دهد</small></span></div>';
    $h .= '<p class="bb m1">' . esc_html($c[0]) . '</p>';
    $h .= '<div class="ch m2">';
    foreach ( $c[1] as $i => $s ) {
        $h .= '<span class="' . ( $i === (int) $c[2] ? 'on o1' : '' ) . '">' . esc_html($s) . '</span>';
    }
    $h .= '</div><p class="bb m3">' . esc_html($c[3]) . '</p><div class="ch m4">';
    foreach ( $c[4] as $i => $s ) {
        $h .= '<span class="' . ( $i === (int) $c[5] ? 'on o2' : '' ) . '">' . esc_html($s) . '</span>';
    }
    $h .= '</div><p class="bb ok m5">' . tjcv_ic('check') . esc_html($c[6]) . '</p></div>';
    return $h;
}

function tjcv_block( $id ) {
    $cfg = tjcv_cfg( $id );
    $v = $cfg['v'];
    $x = tjcv_copy( $v, $cfg['topic'] );
    $start = 'mg-' . $id . '-' . $v;
    $url = 'https://t.me/tajrobehlife_bot?start=' . $start;
    $f = '';
    foreach ( $x['f'] as $it ) { $f .= '<li>' . tjcv_ic($it[0]) . esc_html($it[1]) . '</li>'; }
    $o  = '<aside class="tjbot" data-v="' . esc_attr($v) . '" data-post="' . (int) $id . '" data-start="' . esc_attr($start) . '">';
    $o .= '<div class="tjbot-in"><div class="tjbot-copy">';
    $o .= '<span class="tjbot-eye">' . tjcv_ic('tg') . 'بات تجربه</span>';
    $o .= '<h3 class="tjbot-h">' . esc_html($x['h']) . '</h3>';
    $o .= '<p class="tjbot-p">' . esc_html($x['p']) . '</p>';
    $o .= '<a class="tjbot-go" href="' . esc_url($url) . '" target="_blank" rel="noopener" data-tjbot="main">' . tjcv_ic('tg') . '<span class="tjbot-gotxt">' . esc_html($x['btn']) . '</span></a>';
    $o .= '<ul class="tjbot-facts">' . $f . '</ul>';
    $o .= '</div><div class="tjbot-demo" aria-hidden="true">' . tjcv_chat($x['c']) . '</div></div></aside>';
    return $o;
}

function tjcv_line( $id ) {
    $cfg = tjcv_cfg( $id );
    $v = $cfg['v'];
    $start = 'mg-' . $id . '-' . $v . '-i';
    $url = 'https://t.me/tajrobehlife_bot?start=' . $start;
    $txt = array(
      't' => array('خواندن دربارهٔ این موضوع یک چیز است و حرف‌زدن دربارهٔ آن چیز دیگری.', 'رزرو معارفهٔ رایگان در بات تجربه'),
      'a' => array('این مطلب را در بات تجربه هم داریم، همراه پیشنهادهای هم‌خانواده‌اش.', 'دیدن پیشنهادهای مرتبط در بات'),
      's' => array('اگر دانشجوی روان‌شناسی هستید، کامیونیتی تجربه برای همین ساخته شده.', 'عضویت رایگان در کامیونیتی'),
      'k' => array('اگر این حوزه را دنبال می‌کنید، لازم نیست هر بار سر بزنید.', 'خبردارشدن از مطلب‌های تازهٔ این موضوع'),
    );
    $t = isset($txt[$v]) ? $txt[$v] : $txt['k'];
    return '<p class="tjbot-line" data-v="' . esc_attr($v) . '" data-post="' . (int) $id . '"><span class="ic">' . tjcv_ic('tg') . '</span><span>' . esc_html($t[0]) . ' <a href="' . esc_url($url) . '" target="_blank" rel="noopener" data-tjbot="inline">' . esc_html($t[1]) . '</a></span></p>';
}

function tjcv_strip( $id ) {
    $url = 'https://t.me/tajrobehlife_bot?start=mg-' . $id . '-s';
    return '<aside class="tjbot-strip" data-post="' . (int) $id . '"><span class="tjbot-strip-ic">' . tjcv_ic('users') . '</span><span class="tjbot-strip-tx"><b>دانشجوی روان‌شناسی هستید؟</b><span>کامیونیتی تجربه رایگان است: خبر ژورنال کلاب‌ها و برنامه‌های عمومی مدرسه، و امکان شرکت در بخشی از جلسه‌ها.</span></span><a href="' . esc_url($url) . '" target="_blank" rel="noopener" data-tjbot="student">' . tjcv_ic('tg') . 'عضویت در تلگرام</a></aside>';
}

} /* end function_exists */

add_filter( 'the_content', 'tjcv_inject', 25 );
function tjcv_inject( $c ) {
    if ( is_feed() || ! is_singular('post') || ! in_the_loop() || ! is_main_query() ) { return $c; }
    if ( strpos( $c, 'tjbot' ) !== false ) { return $c; }
    $id = get_the_ID();
    $parts = explode( '</p>', $c );
    if ( count( $parts ) > 7 ) {
        $at = 3;
        $c = implode( '</p>', array_slice( $parts, 0, $at ) ) . '</p>' . tjcv_line( $id ) . implode( '</p>', array_slice( $parts, $at ) );
    }
    $blk = tjcv_block( $id );
    $done = false;
    foreach ( array( '<!--tj-svcrel-->', '<!-- tj-svcrel -->', '<!-- tj-cta -->' ) as $mk ) {
        $pos = strpos( $c, $mk );
        if ( $pos !== false ) {
            $c = substr( $c, 0, $pos ) . $blk . "\n" . substr( $c, $pos );
            $done = true;
            break;
        }
    }
    if ( ! $done ) { $c .= $blk; }
    if ( tjcv_is_student( $id ) ) { $c .= tjcv_strip( $id ); }
    return $c;
}

add_action( 'wp_head', 'tjcv_css', 40 );
function tjcv_css() {
    if ( ! is_singular('post') ) { return; }
    echo '<style id="tjcv-css">' . tjcv_css_text() . '</style>';
}
function tjcv_css_text() {
    $css = <<<'TJCSS'
.tjbot{margin:40px 0 12px;border-radius:22px;background:#141416;color:#fff;position:relative;overflow:hidden;direction:rtl;font-family:inherit}
.tjbot::before{content:"";position:absolute;width:300px;height:300px;border-radius:50%;background:#c83f49;filter:blur(90px);opacity:.42;top:-135px;inset-inline-end:-95px;pointer-events:none}
.tjbot-in{position:relative;display:grid;grid-template-columns:1.12fr .88fr;gap:26px;padding:28px 30px;align-items:center}
.tjbot-copy{min-width:0}
.tjbot-eye{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:#f3c6ca;background:rgba(200,63,73,.18);border:1px solid rgba(200,63,73,.45);border-radius:999px;padding:5px 12px;line-height:1.7}
.tjbot-eye svg{width:14px;height:14px}
.tjbot .tjbot-h{margin:14px 0 8px;font-size:21px;line-height:1.75;color:#fff;font-weight:700;border:0;padding:0}
.tjbot .tjbot-p{margin:0 0 18px;font-size:14.5px;line-height:2.1;color:rgba(255,255,255,.72)}
.tjbot-go{display:inline-flex;align-items:center;gap:9px;background:#c83f49;color:#fff;text-decoration:none;border-radius:13px;padding:12px 22px;font-size:15px;line-height:1.6;transition:transform .18s ease,background .18s ease}
.tjbot-go:hover,.tjbot-go:focus{background:#b63942;color:#fff;transform:translateY(-1px)}
.tjbot-go svg{width:17px;height:17px;flex:none}
.tjbot-facts{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px 18px}
.tjbot-facts li{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:rgba(255,255,255,.55);line-height:2}
.tjbot-facts li::before{content:none}
.tjbot-facts svg{width:14px;height:14px;flex:none;color:rgba(255,255,255,.4)}
.tjbot-demo{min-width:0;display:flex;justify-content:flex-end}
.tjbot-chat{width:100%;max-width:320px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:24px;padding:13px 13px 17px;display:flex;flex-direction:column;gap:8px;box-shadow:0 26px 44px -26px rgba(0,0,0,.7)}
.tjbot-top{display:flex;align-items:center;gap:10px;padding:2px 4px 10px;border-bottom:1px solid rgba(255,255,255,.12)}
.tjbot-top .av{width:34px;height:34px;border-radius:50%;background:#c83f49;color:#fff;display:grid;place-items:center;flex:none}
.tjbot-top .av svg{width:16px;height:16px}
.tjbot-top b{display:block;font-size:13px;color:#fff;line-height:1.5;font-weight:700}
.tjbot-top small{display:block;font-size:11px;color:rgba(255,255,255,.5);line-height:1.5}
.tjbot-chat .bb{margin:0;align-self:flex-start;max-width:94%;background:#fff;color:#0e0e0e;font-size:13px;line-height:1.85;padding:8px 13px;border-radius:16px 16px 5px 16px}
.tjbot-chat .ok{display:inline-flex;align-items:center;gap:6px;background:#f7d774;font-weight:700}
.tjbot-chat .ok svg{width:15px;height:15px;stroke-width:2.6;flex:none}
.tjbot-chat .ch{display:flex;gap:6px}
.tjbot-chat .ch span{flex:1;text-align:center;font-size:12px;font-weight:700;color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:11px;padding:7px 4px;line-height:1.6}
.tjbot-chat .m1{animation:tjbA1 9s infinite both}.tjbot-chat .m2{animation:tjbA2 9s infinite both}.tjbot-chat .m3{animation:tjbA3 9s infinite both}
.tjbot-chat .m4{animation:tjbA4 9s infinite both}.tjbot-chat .m5{animation:tjbA5 9s infinite both}
.tjbot-chat .o1{animation:tjbO1 9s infinite both}.tjbot-chat .o2{animation:tjbO2 9s infinite both}
@keyframes tjbA1{0%,3%{opacity:0;transform:translateY(8px)}8%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjbA2{0%,11%{opacity:0;transform:translateY(8px)}16%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjbA3{0%,29%{opacity:0;transform:translateY(8px)}34%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjbA4{0%,37%{opacity:0;transform:translateY(8px)}42%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjbA5{0%,55%{opacity:0;transform:translateY(8px) scale(.96)}61%,92%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes tjbO1{0%,20%{background:transparent;border-color:rgba(255,255,255,.28)}22%{transform:scale(.92)}25%,100%{background:#c83f49;border-color:#c83f49}}
@keyframes tjbO2{0%,46%{background:transparent;border-color:rgba(255,255,255,.28)}48%{transform:scale(.92)}51%,100%{background:#c83f49;border-color:#c83f49}}
.tjbot-line{margin:32px 0;padding:13px 16px;border:1px solid #eec3c7;background:#faeced;border-radius:14px;font-size:14px;line-height:2.05;color:#4e4e4e;display:flex;gap:11px;align-items:flex-start}
.tjbot-line .ic{flex:none;width:26px;height:26px;border-radius:50%;background:#c83f49;color:#fff;display:grid;place-items:center;margin-top:4px}
.tjbot-line .ic svg{width:13px;height:13px}
.tjbot-line a{color:#8e2d34;text-decoration:none;border-bottom:1px solid #d9737a}
.tjbot-line a:hover{color:#c83f49}
.tjbot-strip{margin:20px 0 0;border:1px solid #dfdfe2;background:#f5f5f8;border-radius:16px;padding:18px 20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.tjbot-strip-ic{flex:none;width:38px;height:38px;border-radius:50%;background:#fff;border:1px solid #dfdfe2;color:#c83f49;display:grid;place-items:center}
.tjbot-strip-ic svg{width:19px;height:19px}
.tjbot-strip-tx{flex:1 1 240px;min-width:0}
.tjbot-strip b{display:block;font-size:15.5px;color:#0e0e0e;line-height:1.9}
.tjbot-strip-tx>span{display:block;font-size:13.5px;color:#676768;line-height:2}
.tjbot-strip>a{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #c83f49;color:#c83f49;border-radius:12px;padding:9px 16px;font-size:14px;text-decoration:none;white-space:nowrap;transition:background .18s ease,color .18s ease}
.tjbot-strip>a:hover{background:#c83f49;color:#fff}
.tjbot-strip>a svg{width:15px;height:15px}
@media (max-width:760px){
.tjbot-in{grid-template-columns:minmax(0,1fr);padding:24px 20px;gap:22px}
.tjbot .tjbot-h{font-size:19px}
.tjbot-demo{justify-content:center}
.tjbot-chat{max-width:100%}
.tjbot-go{width:100%;justify-content:center}
.tjbot-strip>a{width:100%;justify-content:center}
}
/* قالب سایت رنگ لینک‌ها را عوض می‌کند؛ این بلوک رنگ‌های خودش را قفل می‌کند */
.tjbot .tjbot-go,.tjbot .tjbot-go span,.tjbot .tjbot-go svg{color:#fff!important}
.tjbot .tjbot-go:hover,.tjbot .tjbot-go:focus,.tjbot .tjbot-go:visited{color:#fff!important}
.tjbot .tjbot-h{color:#fff!important}
.tjbot .tjbot-p{color:rgba(255,255,255,.72)!important}
.tjbot .tjbot-eye{color:#f3c6ca!important}
.tjbot .tjbot-facts li{color:rgba(255,255,255,.55)!important}
.tjbot .tjbot-top b{color:#fff!important}
.tjbot .tjbot-top small{color:rgba(255,255,255,.5)!important}
.tjbot .tjbot-chat .bb{color:#0e0e0e!important}
.tjbot .tjbot-chat .ch span{color:#fff!important}
.tjbot .tjbot-chat .ok{color:#0e0e0e!important}
p.tjbot-line a{color:#8e2d34!important}
p.tjbot-line a:hover{color:#c83f49!important}
.tjbot-strip>a,.tjbot-strip>a:visited{color:#c83f49!important}
.tjbot-strip>a:hover{color:#fff!important}
@media (prefers-reduced-motion:reduce){
.tjbot-chat .m1,.tjbot-chat .m2,.tjbot-chat .m3,.tjbot-chat .m4,.tjbot-chat .m5,.tjbot-chat .o1,.tjbot-chat .o2{animation:none;opacity:1;transform:none}
.tjbot-chat .o1,.tjbot-chat .o2{background:#c83f49;border-color:#c83f49}
}
TJCSS;
    return $css;
}

add_action( 'wp_footer', 'tjcv_js', 22 );
function tjcv_js() {
    if ( ! is_singular('post') ) { return; }
    $js = <<<'TJJS'
(function(){
  function ev(n,p){
    p = p || {};
    try{ if(window.gtag){ gtag('event', n, p); } }catch(e){}
    try{ window.dataLayer = window.dataLayer || []; var o={event:n}; for(var k in p){ o[k]=p[k]; } window.dataLayer.push(o); }catch(e){}
  }
  var box = document.querySelector(".tjbot");
  var PID = box ? box.getAttribute("data-post") : "";
  var PATH = location.pathname;

  /* نسخهٔ خارج از ایران: همان بلوک، صورت دیگر */
  try{
    var tz = window.Intl ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "") : "";
    var dia = tz ? (tz.indexOf("Tehran") === -1 && tz !== "Iran") : false;
    if (dia && box) {
      box.setAttribute("data-v", "d");
      var H = box.querySelector(".tjbot-h"); if(H){ H.textContent = "از خارج از ایران می‌خوانید؟"; }
      var P = box.querySelector(".tjbot-p"); if(P){ P.textContent = "تراپی فارسی با درمانگر ایرانی، در ساعت محلی خودتان و با پرداخت ارزی. جلسهٔ معارفه رایگان است و همهٔ کار در تلگرام انجام می‌شود."; }
      var G = box.querySelector(".tjbot-gotxt"); if(G){ G.textContent = "رزرو معارفه از تلگرام"; }
      var A = box.querySelector(".tjbot-go");
      if(A){ A.setAttribute("href", "https://t.me/tajrobehlife_bot?start=mg-" + PID + "-d"); }
      box.setAttribute("data-start", "mg-" + PID + "-d");
      var bb = box.querySelectorAll(".tjbot-chat .bb");
      if(bb[0]){ bb[0].textContent = "کجا زندگی می‌کنید؟"; }
      if(bb[1]){ bb[1].textContent = "با ساعت محلی شما، این وقت‌ها آزاد است:"; }
      var c1 = box.querySelectorAll(".tjbot-chat .ch");
      if(c1[0]){ var s1 = c1[0].querySelectorAll("span"); var n1=["اروپا","آمریکا","کانادا"]; for(var i=0;i<s1.length;i++){ if(n1[i]) s1[i].textContent = n1[i]; } }
      if(c1[1]){ var s2 = c1[1].querySelectorAll("span"); var n2=["۱۹:۳۰","۲۱:۰۰"]; for(var j=0;j<s2.length;j++){ if(n2[j]) s2[j].textContent = n2[j]; } }
      var F = box.querySelectorAll(".tjbot-facts li");
      var nf = ["ساعت محلی خودتان","پرداخت ارزی","معارفه رایگان"];
      for(var k2=0;k2<F.length;k2++){ if(nf[k2]){ var sv=F[k2].querySelector("svg"); F[k2].textContent=""; if(sv) F[k2].appendChild(sv); F[k2].appendChild(document.createTextNode(nf[k2])); } }
      var L = document.querySelector(".tjbot-line");
      if(L){
        var la = L.querySelector("a");
        if(la){ la.textContent = "رزرو معارفهٔ فارسی از تلگرام"; la.setAttribute("href","https://t.me/tajrobehlife_bot?start=mg-" + PID + "-d-i"); }
        var lt = L.querySelector("span:last-child");
        if(lt && lt.firstChild && lt.firstChild.nodeType === 3){ lt.firstChild.nodeValue = "خارج از ایران زندگی می‌کنید؟ درمانگر فارسی‌زبان در ساعت محلی خودتان. "; }
      }
    }
  }catch(e){}

  /* دیده‌شدن بلوک‌ها */
  try{
    if (window.IntersectionObserver) {
      var seen = {};
      var io = new IntersectionObserver(function(en){
        for (var i=0;i<en.length;i++) {
          var t = en[i];
          if (!t.isIntersecting) { continue; }
          var el = t.target;
          var b = el.className.indexOf("tjbot-line") > -1 ? "inline" : (el.className.indexOf("tjbot-strip") > -1 ? "student" : "main");
          if (seen[b]) { io.unobserve(el); continue; }
          seen[b] = 1;
          ev("bot_block_view", { block:b, variant: el.getAttribute("data-v") || "s", post_id: el.getAttribute("data-post") || PID, page_path: PATH, page_kind: "article" });
          io.unobserve(el);
        }
      }, { threshold: 0.5 });
      var all = document.querySelectorAll(".tjbot, .tjbot-line, .tjbot-strip");
      for (var q=0;q<all.length;q++) { io.observe(all[q]); }
    }
  }catch(e){}

  /* کلیک روی هر لینک بات، از هر جای صفحه */
  document.addEventListener("click", function(e){
    var a = e.target.closest ? e.target.closest("a") : null;
    if (!a) { return; }
    var href = a.getAttribute("href") || "";
    if (href.indexOf("t.me/") === -1) { return; }
    var sp = "";
    var qi = href.indexOf("start" + String.fromCharCode(61));
    if (qi > -1) { sp = href.slice(qi + 6); }
    var blk = a.getAttribute("data-tjbot") || "other";
    var host = box ? (box.getAttribute("data-v") || "") : "";
    ev("bot_click", { block: blk, variant: host, post_id: PID, start_param: sp, page_path: PATH, page_kind: "article", link_text: (a.textContent||"").trim().slice(0,60) });
  }, true);
})();
TJJS;
    echo '<script>' . $js . '</script>';
}
