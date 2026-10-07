/**
 * Tajrobeh · دستیار پاسخ‌گو، ویجت سایت (بات v170.23.11، assist.gs)
 *
 * بی افزونه. یک دکمهٔ کوچک در گوشه و یک پنجرهٔ سبک، راست‌به‌چپ، با فونت و رنگ تجربه.
 * مرورگر فقط با مسیر خود سایت (/wp-json/tj/v1/assist) حرف می‌زند؛ سرور سایت درخواست را با همان رمز فرم‌ها
 * (TJ_LEAD_SECRET در اسنیپت 501143، تابع tajrobeh_leads_signed_url) امضا می‌کند و به رابط وب واحد بات می‌فرستد:
 * action = assist.ask، ورودی channel، session_id، text (یا tap)، country؛ خروجی answer، topic، handoff، buttons.
 * نسخهٔ ۲ همین رابط را مستقیم صدا می‌زند. هیچ رمز یا شناسه‌ای به مرورگر نمی‌رسد و متن سؤال در سایت ذخیره نمی‌شود.
 * نصب: Cowork، به‌صورت «PHP، همه‌جا». تا وقتی ASSIST_ENABLED در بات روشن نیست، پاسخ «خاموش» است و ویجت چیزی نشان نمی‌دهد.
 */
if (!function_exists('tj_assist_ask')) {

	add_action('rest_api_init', function () {
		register_rest_route('tj/v1', '/assist', array(
			'methods'             => 'POST',
			'permission_callback' => '__return_true',
			'callback'            => 'tj_assist_ask',
		));
	});

	function tj_assist_ask($req) {
		$p   = (array) $req->get_json_params();
		$sid = preg_replace('/[^A-Za-z0-9_-]/', '', substr((string) ($p['session_id'] ?? ''), 0, 64));
		if ($sid === '') {
			return new WP_REST_Response(array('ok' => false, 'error' => 'session'), 400);
		}
		/* سقف ساده برای هر نشانی، کنار سقف هر session_id در خود بات */
		$ipk = 'tjas_' . md5((string) ($_SERVER['REMOTE_ADDR'] ?? '')) . '_' . gmdate('YmdH');
		$n   = (int) get_transient($ipk);
		if ($n >= 60) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'rate'), 429);
		}
		set_transient($ipk, $n + 1, 3700);
		if (!function_exists('tajrobeh_leads_signed_url')) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'bridge'), 503);
		}
		$country = strtoupper(preg_replace('/[^A-Za-z]/', '', (string) ($_SERVER['HTTP_CF_IPCOUNTRY'] ?? '')));
		$body    = wp_json_encode(array(
			'action'     => 'assist.ask',
			'channel'    => 'site',
			'session_id' => $sid,
			'text'       => mb_substr(wp_strip_all_tags((string) ($p['text'] ?? '')), 0, 500),
			'tap'        => preg_replace('/[^A-Za-z0-9:_-]/', '', substr((string) ($p['tap'] ?? ''), 0, 40)),
			'country'    => substr($country, 0, 2),
		));
		/* Apps Script بعد از doPost با ۳۰۲ به نشانی echo می‌فرستد و پاسخ JSON فقط با GET همان نشانی خوانده می‌شود.
		   دنبال کردن خودکار POST را دوباره به echo می‌فرستد و صفحهٔ HTML با ۴۰۵ می‌گیرد (همان error=bad). مثل 501143 ریدایرکت
		   خودکار دنبال نمی‌شود و فقط نشانی echo خود گوگل با GET خوانده می‌شود. */
		$r = wp_remote_post(tajrobeh_leads_signed_url($body), array(
			'timeout'     => 15,
			'redirection' => 0,
			'headers'     => array('Content-Type' => 'application/json'),
			'body'        => $body,
		));
		if (is_wp_error($r)) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'net'), 503);
		}
		$code = (int) wp_remote_retrieve_response_code($r);
		$loc  = (string) wp_remote_retrieve_header($r, 'location');
		if (in_array($code, array(301, 302, 303, 307), true)) {
			if (strpos($loc, 'https://script.googleusercontent.com/macros/echo') !== 0) {
				return new WP_REST_Response(array('ok' => false, 'error' => 'bad'), 502);
			}
			$r = wp_remote_get($loc, array('timeout' => 15, 'redirection' => 0));
			if (is_wp_error($r)) {
				return new WP_REST_Response(array('ok' => false, 'error' => 'net'), 503);
			}
		}
		$j = json_decode(wp_remote_retrieve_body($r), true);
		if (!is_array($j)) {
			return new WP_REST_Response(array('ok' => false, 'error' => 'bad'), 502);
		}
		$btns = array();
		foreach ((array) ($j['buttons'] ?? array()) as $b) {
			$btns[] = array(
				'id'   => isset($b['id']) ? (string) $b['id'] : '',
				'url'  => isset($b['url']) && strpos((string) $b['url'], 'https://t.me/tajrobehlife_bot') === 0 ? (string) $b['url'] : '',
				'text' => (string) ($b['text'] ?? ''),
			);
		}
		return new WP_REST_Response(array(
			'ok'      => !empty($j['ok']),
			'error'   => (string) ($j['error'] ?? ''),
			'answer'  => (string) ($j['answer'] ?? ''),
			'handoff' => !empty($j['handoff']),
			'buttons' => $btns,
		), 200);
	}

	add_action('wp_footer', function () {
		if (is_admin()) {
			return;
		}
		$api = esc_url_raw(rest_url('tj/v1/assist'));
		?>
<div id="tjas" dir="rtl" hidden>
	<button type="button" id="tjas-open" aria-label="دستیار تجربه">؟</button>
	<section id="tjas-box" role="dialog" aria-label="دستیار تجربه" hidden>
		<header><b>دستیار تجربه</b><button type="button" id="tjas-x" aria-label="بستن">×</button></header>
		<div id="tjas-log" aria-live="polite"></div>
		<form id="tjas-f"><input id="tjas-in" maxlength="500" autocomplete="off" placeholder="سؤالت را بنویس"><button type="submit">بفرست</button></form>
		<small>اطلاعات کاربر فقط در اختیار مسئول مربوطه در مرکز تجربه زندگی قرار می‌گیرد و بدون رضایت او منتشر یا با کسی به اشتراک گذاشته نمی‌شود.</small>
	</section>
</div>
<style>
#tjas{--tj-ink:#222222;--tj-paper:#fefefe;--tj-soft:#f5f5f8;--tj-line:#dfdfe2;--tj-mute:#676768;--tj-text:#0e0e0e;position:fixed;inset-block-end:16px;inset-inline-start:16px;z-index:9990;font-family:'Anjoman Max','Vazirmatn',system-ui,sans-serif;line-height:1.5;color:var(--tj-text)}
#tjas-open{inline-size:48px;block-size:48px;border-radius:50%;border:0;background:var(--tj-ink);color:var(--tj-paper);font:inherit;font-size:22px;cursor:pointer;box-shadow:0 4px 14px rgba(34,34,34,.18)}
#tjas-box{position:absolute;inset-block-end:60px;inset-inline-start:0;inline-size:min(340px,calc(100vw - 32px));max-block-size:min(520px,calc(100vh - 100px));display:flex;flex-direction:column;background:var(--tj-paper);border:1px solid var(--tj-line);border-radius:16px;box-shadow:0 10px 30px rgba(34,34,34,.14);overflow:hidden}
#tjas-box[hidden]{display:none}
#tjas header{display:flex;justify-content:space-between;align-items:center;padding-block:10px;padding-inline:14px;border-block-end:1px solid var(--tj-line)}
#tjas header button{border:0;background:none;font-size:22px;cursor:pointer;color:var(--tj-mute)}
#tjas-log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--tj-soft)}
#tjas .m{max-inline-size:88%;padding-block:8px;padding-inline:12px;border-radius:12px;white-space:pre-wrap;font-size:14px}
#tjas .bot{align-self:flex-start;background:var(--tj-paper);border:1px solid var(--tj-line)}
#tjas .me{align-self:flex-end;background:var(--tj-ink);color:var(--tj-paper)}
#tjas .bs{display:flex;flex-wrap:wrap;gap:6px}
#tjas .bs button,#tjas .bs a{font:inherit;font-size:13px;padding-block:5px;padding-inline:10px;border-radius:999px;border:1px solid var(--tj-ink);background:var(--tj-paper);color:var(--tj-ink);cursor:pointer;text-decoration:none}
#tjas form{display:flex;gap:6px;padding:10px;border-block-start:1px solid var(--tj-line)}
#tjas input{flex:1;font:inherit;font-size:14px;padding-block:8px;padding-inline:10px;border:1px solid var(--tj-line);border-radius:10px;min-inline-size:0}
#tjas form button{font:inherit;font-size:14px;border:0;border-radius:10px;background:var(--tj-ink);color:var(--tj-paper);padding-inline:14px;cursor:pointer}
#tjas small{display:block;font-size:11px;color:var(--tj-mute);padding-inline:12px;padding-block-end:8px}
@media (max-width:480px){#tjas-box{inset-block-end:56px}}
</style>
<script>
(function(){
  var api=<?php echo wp_json_encode($api); ?>,root=document.getElementById('tjas');if(!root||!window.fetch)return;
  var box=document.getElementById('tjas-box'),log=document.getElementById('tjas-log'),inp=document.getElementById('tjas-in'),last='',started=false,sid='';
  try{sid=sessionStorage.getItem('tjas')||'';}catch(e){}
  if(!sid){sid='w'+Math.random().toString(36).slice(2,12)+Date.now().toString(36);try{sessionStorage.setItem('tjas',sid);}catch(e){}}
  function add(t,who){var d=document.createElement('div');d.className='m '+who;d.textContent=t;log.appendChild(d);log.scrollTop=log.scrollHeight;return d;}
  function btns(list){if(!list||!list.length)return;var w=document.createElement('div');w.className='bs';list.forEach(function(b){var el;if(b.url){el=document.createElement('a');el.href=b.url;el.target='_blank';el.rel='noopener';}else{el=document.createElement('button');el.type='button';el.onclick=function(){ask('',b.id,b.text);};}el.textContent=b.text;w.appendChild(el);});log.appendChild(w);log.scrollTop=log.scrollHeight;}
  function ask(text,tap,label){
    if(text){add(text,'me');last=text;}else if(label&&tap&&!/^[yn]:/.test(tap))add(label,'me');
    var wait=add('…','bot');
    fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,text:text||last,tap:tap||''})})
      .then(function(r){return r.json();}).then(function(j){
        if(!j||!j.ok){if(j&&j.error==='off'){root.hidden=true;return;}wait.textContent=j&&j.error==='rate'?'کمی صبر کن و دوباره بپرس.':'الان جواب نرسید. کمی بعد دوباره امتحان کن.';return;}
        wait.textContent=j.answer;btns(j.buttons);
      }).catch(function(){wait.textContent='الان جواب نرسید. کمی بعد دوباره امتحان کن.';});
  }
  document.getElementById('tjas-open').onclick=function(){box.hidden=!box.hidden;if(!box.hidden&&!started){started=true;ask('', '', '');}if(!box.hidden)inp.focus();};
  document.getElementById('tjas-x').onclick=function(){box.hidden=true;};
  document.getElementById('tjas-f').onsubmit=function(e){e.preventDefault();var t=inp.value.trim();if(!t)return;inp.value='';ask(t,'','');};
  root.hidden=false;
})();
</script>
		<?php
	});
}
