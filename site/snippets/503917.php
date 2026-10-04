add_action( 'wp_footer', function () {
	if ( ! is_singular( 'post' ) ) {
		return;
	}
$tj_js = <<<'TJJS'
(function(){
  try{
    var tz = '';
    if (window.Intl) { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }
    if (!tz) { return; }
    if (tz.indexOf('Tehran') > -1) { return; }
    if (tz === 'Iran') { return; }
    var box = document.querySelector('.tj-article-cta');
    if (!box) { return; }
    if (box.querySelector('.tj-cta-abroad')) { return; }
    var p = document.createElement('p');
    p.className = 'tj-cta-abroad';
    p.setAttribute('style','margin:18px 0 0;padding-top:14px;border-top:1px solid #eec3c7;font-size:14px;color:#676768;line-height:2.1');
    var a = document.createElement('a');
    a.setAttribute('href','/persian-therapy/');
    a.setAttribute('style','color:#8e2d34;text-decoration:none;border-bottom:1px solid #eec3c7');
    a.appendChild(document.createTextNode('تراپی فارسی با پرداخت ارزی، در ساعت محلی خودتان'));
    p.appendChild(document.createTextNode('خارج از ایران زندگی می‌کنید؟ '));
    p.appendChild(a);
    box.appendChild(p);
  }catch(e){}
})();
TJJS;
	echo '<script>' . $tj_js . '</script>';
}, 20 );