/* Tajrobeh · پلی‌لیست ابی · ویجت کوچک سراسری (tjeb v1.1، ۱۴ مهر ۱۴۰۵)
   v1.1 (قرارداد صفحه‌ها، site/contracts.json): جای ویجت در هوم و مدرسه فقط نشانگر ثابت <!-- tj:slot:ebi --> است، نه id بخش‌های طراحی.
   بی نشانگر (یا بیش از یکی) ویجت آن برگه نمی‌نشیند؛ site-check و site-mirror همان را قرمز می‌کنند.
   یک کارت جمع‌وجور که فهرست جمعی ابی را زنده نشان می‌دهد (شماره و آخرین موردها، چرخشی) و همان‌جا می‌شود یک مورد اضافه کرد.
   ثبت از همان مسیر صفحهٔ اصلی پلی‌لیست است: POST /wp-json/tj/v1/ebi-list (در انتظار بازبینی، بی‌نام، با src برای شمارش).
   جاها: هوم و مدرسه (294) سر نشانگر tj:slot:ebi · انتهای هر مقالهٔ مجله · شورت‌کد [tj_ebi_mini place="x"] برای هر جای دیگر.
   نام فرستنده‌ها هیچ‌جا در ویجت نمی‌آید. لینک‌ها UTM کمپین c-004 دارند. */
if (!function_exists('tj_ebi_mini_html')) {
  function tj_ebi_mini_html($place) {
    $GLOBALS['tj_ebi_mini_used'] = true;
    $place = preg_replace('/[^a-z0-9\-]/', '', strtolower((string) $place));
    if ($place === '') $place = 'site';
    $d = function_exists('tj_ebi_list_data') ? tj_ebi_list_data() : array('count' => 0, 'items' => array());
    $seen = array(); $items = array();
    foreach ((array) $d['items'] as $it) {
      $t = trim((string) $it['t']);
      if ($t === '' || isset($seen[$t])) continue;
      $seen[$t] = 1;
      if (function_exists('mb_strlen') ? mb_strlen($t) > 70 : strlen($t) > 140) $t = (function_exists('mb_substr') ? mb_substr($t, 0, 68) : substr($t, 0, 136)) . '…';
      $items[] = array((int) $it['n'], $t);
      if (count($items) >= 12) break;
    }
    $url = home_url('/ebis-playlist/') . '?utm_source=tajrobeh&utm_medium=mini&utm_campaign=c-004&utm_content=' . $place;
    $first = $items ? $items[0] : null;
    $h  = '<aside class="tjeb" data-place="' . esc_attr($place) . '" data-count="' . (int) $d['count'] . '" data-items="' . esc_attr(wp_json_encode($items, JSON_UNESCAPED_UNICODE)) . '" aria-label="پلی‌لیست ابی">';
    $h .= '<div class="tjeb-row">';
    $h .= '<a class="tjeb-berry" href="' . esc_url($url) . '" aria-hidden="true" tabindex="-1"><img src="' . esc_url(home_url('/wp-content/uploads/2026/09/tjl-berry.webp')) . '" alt="" width="44" height="44" loading="lazy"></a>';
    $h .= '<div class="tjeb-body"><p class="tjeb-k"><a href="' . esc_url($url) . '">پلی‌لیستِ ابی</a><span>فهرستی که با هم می‌نویسیم</span></p>';
    $h .= '<p class="tjeb-tick" aria-live="polite">';
    if ($first) { $h .= '<b class="tjeb-n">' . (int) $first[0] . '.</b> <span class="tjeb-t">' . esc_html($first[1]) . '</span>'; }
    else { $h .= '<span class="tjeb-t">اولین چیز درخشان فهرست را شما بنویسید</span>'; }
    $h .= '</p></div>';
    $h .= '<button class="tjeb-add" type="button" aria-expanded="false"><span aria-hidden="true">+</span> یکی هم شما</button>';
    $h .= '</div>';
    $h .= '<form class="tjeb-form" hidden><input class="tjeb-in" name="text" type="text" minlength="3" maxlength="160" required placeholder="یک چیز کوچک که زندگی را ارزشمند می‌کند" aria-label="چیزی که زندگی را ارزشمند می‌کند"><input class="tjeb-hp" name="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true"><button type="submit">بفرست</button><p class="tjeb-note">بی‌نام و بعد از بازبینی به فهرست اضافه می‌شود.</p></form>';
    $h .= '<p class="tjeb-ok" hidden>رسید! بعد از بازبینی، شمارهٔ <b class="tjeb-next"></b> فهرست می‌شود. <a href="' . esc_url($url) . '">دیدن کل فهرست</a></p>';
    $h .= '</aside>';
    return $h;
  }
  function tj_ebi_mini_at($c, $place) {
    $mk = '<!-- tj:slot:ebi -->';
    if (substr_count($c, $mk) !== 1) return $c;
    return str_replace($mk, '<div class="tjeb-wrap tjeb-at-' . $place . '">' . tj_ebi_mini_html($place) . '</div>', $c);
  }
}
add_shortcode('tj_ebi_mini', function ($a) { $a = shortcode_atts(array('place' => 'site'), $a); return tj_ebi_mini_html($a['place']); });
add_filter('the_content', function ($c) {
  if (is_admin() || !in_the_loop() || !is_main_query()) return $c;
  if (strpos($c, 'class="tjeb"') !== false) return $c;
  if (is_front_page()) return tj_ebi_mini_at($c, 'home');
  if (is_page(294)) return tj_ebi_mini_at($c, 'school');
  if (is_singular('post')) return $c . '<div class="tjeb-wrap tjeb-at-mag">' . tj_ebi_mini_html('mag') . '</div>';
  return $c;
}, 30);
add_action('wp_head', function () {
  if (!(is_front_page() || is_page(294) || is_singular('post') || is_page())) return;
  echo '<style id="tjeb-css">'
   . '.tjeb-wrap{max-width:1180px;margin:8px auto 40px;padding:0 20px}.tjeb-at-mag{padding:0;margin:36px 0 8px}'
   . '.tjeb,.tjeb *{box-sizing:border-box}.tjeb{--r:var(--tj-red,#c83f49);--ink:var(--tj-ink,#0e0e0e);direction:rtl;font-family:inherit;max-width:640px;margin:0 auto;background:#fff;border:1px solid var(--tj-line,#dfdfe2);border-radius:18px;padding:12px 14px;box-shadow:0 8px 28px rgba(14,14,14,.05);position:relative;overflow:hidden}'
   . '.tjeb::before{content:"";position:absolute;inset:0 0 0 auto;width:4px;background:var(--r)}'
   . '.tjeb-row{display:flex;align-items:center;gap:12px}'
   . '.tjeb .tjeb-berry{flex:none;display:block;box-sizing:border-box;width:44px;height:44px;margin:0;border-radius:50%;background:var(--tj-tint,#faeced);padding:6px;transition:transform .4s cubic-bezier(.3,1.6,.5,1)}.tjeb-berry img{display:block;width:100%;height:100%;object-fit:contain;margin:0;max-width:none}.tjeb:hover .tjeb-berry{transform:rotate(-12deg) scale(1.08)}'
   . '.tjeb-body{flex:1;min-width:0}'
   . '.tjeb p{margin:0}.tjeb-k{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;font-size:12.5px;line-height:1.6;color:var(--tj-mut,#676768)}'
   . '.tjeb .tjeb-k a{color:var(--r);font-weight:800;text-decoration:none;font-size:13.5px}.tjeb .tjeb-k a:hover{text-decoration:underline}'
   . '.tjeb-tick{height:1.7em;overflow:hidden;font-size:15px;line-height:1.7;color:var(--ink);font-weight:700;white-space:nowrap;text-overflow:ellipsis}'
   . '.tjeb-tick.go{animation:tjebUp .5s ease both}.tjeb-n{color:var(--r);font-weight:900;margin-inline-end:2px}'
   . '@keyframes tjebUp{from{opacity:0;transform:translateY(60%)}to{opacity:1;transform:none}}'
   . '.tjeb .tjeb-add{flex:none;font:inherit;font-size:13.5px;font-weight:800;color:var(--r);background:#fff;border:1.5px solid var(--r);border-radius:999px;padding:6px 14px;cursor:pointer;white-space:nowrap;transition:background .2s,color .2s,transform .2s}'
   . '.tjeb .tjeb-add:hover,.tjeb .tjeb-add[aria-expanded="true"]{background:var(--r);color:#fff}.tjeb .tjeb-add:active{transform:scale(.95)}.tjeb-add span{display:inline-block;transition:transform .3s}.tjeb-add[aria-expanded="true"] span{transform:rotate(45deg)}'
   . '.tjeb-form{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.tjeb-form[hidden],.tjeb-ok[hidden]{display:none}'
   . '.tjeb .tjeb-in{flex:1 1 220px;min-width:0;font:inherit;font-size:14.5px;padding:9px 14px;border:1px solid var(--tj-line,#dfdfe2);border-radius:12px;background:var(--tj-sunk,#f5f5f8);color:var(--ink);outline:none;margin:0}.tjeb .tjeb-in:focus{border-color:var(--r);background:#fff}'
   . '.tjeb .tjeb-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}'
   . '.tjeb-form button{flex:none;font:inherit;font-size:14px;font-weight:800;color:#fff;background:var(--r);border:0;border-radius:12px;padding:9px 18px;cursor:pointer}.tjeb-form button[disabled]{opacity:.6}'
   . '.tjeb-note{flex-basis:100%;font-size:12px;color:var(--tj-mut,#676768);line-height:1.6}'
   . '.tjeb-ok{margin-top:10px!important;font-size:14px;line-height:1.7;color:var(--ink);background:var(--tj-tint,#faeced);border-radius:12px;padding:8px 12px}.tjeb .tjeb-ok a{color:var(--r);font-weight:800}'
   . '.tjeb.pop .tjeb-berry{animation:tjebPop .7s cubic-bezier(.3,1.6,.5,1)}@keyframes tjebPop{40%{transform:scale(1.35) rotate(14deg)}}'
   . '@media (max-width:560px){.tjeb .tjeb-row{display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px 10px}.tjeb .tjeb-add{grid-column:1/-1;width:100%}.tjeb-tick{white-space:normal;height:auto;min-height:1.7em;max-height:3.4em}}'
   . '@media (prefers-reduced-motion:reduce){.tjeb *{animation:none!important;transition:none!important}}'
   . '.tjeb-n+.tjeb-t::before{content:"«"}.tjeb-n+.tjeb-t::after{content:"»"}'
   . '</style>';
});
add_action('wp_footer', function () {
  if (empty($GLOBALS['tj_ebi_mini_used'])) return;
  ?>
<script>
(function(){
var fa=function(n){return String(n).replace(/[0-9]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[d];});};
var esc=function(s){var d=document.createElement('span');d.textContent=s;return d.innerHTML;};
var boxes=document.querySelectorAll('.tjeb');
for(var b=0;b<boxes.length;b++){(function(box){
  var items=[];try{items=JSON.parse(box.getAttribute('data-items')||'[]');}catch(e){}
  var tick=box.querySelector('.tjeb-tick'),i=0;
  var show=function(){if(!items.length)return;var it=items[i%items.length];tick.classList.remove('go');void tick.offsetWidth;tick.innerHTML='<b class="tjeb-n">'+fa(it[0])+'.</b> <span class="tjeb-t">'+esc(it[1])+'</span>';tick.classList.add('go');i++;};
  if(items.length){show();}
  var timer=null;
  if(items.length>1){if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){timer=setInterval(show,3800);}}
  box.addEventListener('mouseenter',function(){if(timer){clearInterval(timer);timer=null;}});
  var add=box.querySelector('.tjeb-add'),form=box.querySelector('.tjeb-form'),ok=box.querySelector('.tjeb-ok'),inp=box.querySelector('.tjeb-in');
  add.addEventListener('click',function(){var open=form.hidden;form.hidden=!open;ok.hidden=true;add.setAttribute('aria-expanded',open?'true':'false');if(open){inp.focus();}});
  form.addEventListener('submit',function(e){e.preventDefault();var t=inp.value.trim();if(t.length<3){inp.focus();return;}
    var btn=form.querySelector('button');btn.disabled=true;
    fetch('/wp-json/tj/v1/ebi-list',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t,anon:1,name:'',hp:form.querySelector('.tjeb-hp').value,src:'mini-'+box.getAttribute('data-place')})})
    .then(function(r){return r.json().then(function(j){return {s:r.status,j:j};});})
    .then(function(x){btn.disabled=false;
      if(x.j){if(x.j.ok){form.hidden=true;inp.value='';add.setAttribute('aria-expanded','false');add.hidden=true;box.querySelector('.tjeb-next').textContent=fa((parseInt(box.getAttribute('data-count'),10)||0)+1);ok.hidden=false;box.classList.add('pop');return;}}
      var n=form.querySelector('.tjeb-note');n.textContent=(x.j?x.j.msg:'')||'ثبت نشد؛ دوباره امتحان کنید.';})
    .catch(function(){btn.disabled=false;form.querySelector('.tjeb-note').textContent='ثبت نشد؛ دوباره امتحان کنید.';});
  });
})(boxes[b]);}
})();
</script>
<?php
}, 40);
