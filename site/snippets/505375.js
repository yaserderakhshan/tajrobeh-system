/* tj-form v1: رفتار یکسان همهٔ فرم‌های سایت (۴ مهر ۱۴۰۵). استایل در اسنیپت 504035 بخش tj-form v1.
   لیبل شناور، جملهٔ حریم خصوصی، کد کشور برای شمارهٔ واتس‌اپ، فرم چندمرحله‌ای برای فرم‌های بلند، کارت موفقیت. */
(function(){
var FA='۰۱۲۳۴۵۶۷۸۹';
function fa(n){return String(n).replace(/\d/g,function(d){return FA[d];});}
function isEn(form){return (document.documentElement.lang||'').indexOf('en')===0 || form.closest('[dir=ltr],[lang^=en]')!==null;}
var PRIV_FA='اطلاعات شما فقط در اختیار مسئول مربوطه در مرکز تجربه زندگی قرار می‌گیرد و بدون رضایت شما منتشر یا با کسی به اشتراک گذاشته نمی‌شود.';
var PRIV_EN='Your details are shared only with the responsible person at Tajrobeh Life Center and are never published or shared with anyone without your consent.';
var LOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

/* ۱. لیبل شناور برای فیلدهایی که لیبل دیده‌شونده ندارند */
function floatLabels(form){
  form.querySelectorAll('.ff-el-group').forEach(function(g){
    if(g.getAttribute('data-tjf')){return;}
    var box=g.querySelector(':scope>.ff-el-input--content');
    if(!box){return;}
    var el=box.querySelector(':scope>input.ff-el-form-control,:scope>textarea.ff-el-form-control,:scope>select.ff-el-form-control');
    if(!el){return;}
    var lab=g.querySelector(':scope>.ff-el-input--label');
    if(lab){if(lab.offsetHeight>0){return;}}
    var text='';
    if(el.tagName==='SELECT'){
      var o=el.querySelector('option[value=""]')||el.options[0];
      text=o?o.textContent.trim():'';
      var sync=function(){el.classList.toggle('tjf-empty',!el.value);};
      el.addEventListener('change',sync);sync();
      g.setAttribute('data-tjf','1');
      if(!el.getAttribute('aria-label')){if(text){el.setAttribute('aria-label',text);}}
      return;
    }
    text=(el.getAttribute('placeholder')||'').trim();
    if(!text){return;}
    g.setAttribute('data-tjf','1');
    box.classList.add('tjf-fl');
    var l=document.createElement('label');
    l.className='tjf-lbl';
    if(el.id){l.setAttribute('for',el.id);}
    var m=text.match(/^(.*?)\s*(\((?:اختیاری|optional)[^)]*\))\s*$/i);
    if(m){l.textContent=m[1]+' ';var s=document.createElement('span');s.className='tjf-opt';s.textContent=m[2];l.appendChild(s);}
    else{l.textContent=text;}
    box.insertBefore(l,box.firstChild);
    if(!el.getAttribute('aria-label')){el.setAttribute('aria-label',text);}
    var upd=function(){box.classList.toggle('is-filled',!!el.value);};
    el.addEventListener('input',upd);el.addEventListener('change',upd);upd();
    setTimeout(upd,1600);
  });
}

/* ۲. جملهٔ حریم خصوصی زیر دکمه */
function privacy(form){
  if(form.querySelector('.tjf-privacy')){return;}
  if(form.textContent.indexOf('بدون رضایت')>-1){return;}
  if(/without your consent/i.test(form.textContent)){return;}
  var wrap=form.querySelector('.ff_submit_btn_wrapper');
  if(!wrap){return;}
  var p=document.createElement('p');
  p.className='tjf-privacy';
  var en=isEn(form);
  if(en){p.setAttribute('dir','ltr');}
  p.innerHTML=LOCK+'<span></span>';
  p.querySelector('span').textContent=en?PRIV_EN:PRIV_FA;
  wrap.appendChild(p);
}

/* ۳. کد کشور برای شمارهٔ واتس‌اپ / شمارهٔ خارج از ایران */
var CC=[['+49','🇩🇪 +49'],['+43','🇦🇹 +43'],['+1','🇨🇦 +1'],['+1','🇺🇸 +1'],['+44','🇬🇧 +44'],['+31','🇳🇱 +31'],['+46','🇸🇪 +46'],['+90','🇹🇷 +90'],['+61','🇦🇺 +61'],['+64','🇳🇿 +64'],['+33','🇫🇷 +33'],['+39','🇮🇹 +39'],['+45','🇩🇰 +45'],['+47','🇳🇴 +47'],['+41','🇨🇭 +41'],['+971','🇦🇪 +971'],['+98','🇮🇷 +98'],['','+ …']];
var PATHCC={germany:'+49',berlin:'+49',hamburg:'+49',munich:'+49',austria:'+43',canada:'+1',toronto:'+1',vancouver:'+1',usa:'+1',uk:'+44',netherlands:'+31',sweden:'+46',turkey:'+90',australia:'+61','new-zealand':'+64'};
var TZCC={'Europe/Berlin':'+49','Europe/Vienna':'+43','America/Toronto':'+1','America/Vancouver':'+1','America/New_York':'+1','America/Los_Angeles':'+1','America/Chicago':'+1','Europe/London':'+44','Europe/Amsterdam':'+31','Europe/Stockholm':'+46','Europe/Istanbul':'+90','Australia/Sydney':'+61','Australia/Melbourne':'+61','Pacific/Auckland':'+64','Europe/Paris':'+33','Europe/Rome':'+39','Europe/Copenhagen':'+45','Europe/Oslo':'+47','Europe/Zurich':'+41','Asia/Dubai':'+971','Asia/Tehran':'+98'};
function defaultCC(){
  var parts=location.pathname.split('/');
  for(var i=0;i<parts.length;i++){if(PATHCC[parts[i]]){return PATHCC[parts[i]];}}
  var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){}
  return TZCC[tz]||'+49';
}
function toLatin(s){return String(s).replace(/[۰-۹]/g,function(c){return FA.indexOf(c);}).replace(/[٠-٩]/g,function(c){return '٠١٢٣٤٥٦٧٨٩'.indexOf(c);}).replace(/[\s\-()]/g,'');}
function phoneCC(form){
  form.querySelectorAll('input.ff-el-form-control').forEach(function(el){
    if(el.getAttribute('data-tjcc')){return;}
    var n=(el.name||'').toLowerCase();
    var ph=el.getAttribute('placeholder')||'';
    if(n.indexOf('whatsapp')<0){if(!/^\+\d/.test(ph)){return;}}
    el.setAttribute('data-tjcc','1');
    var box=el.closest('.ff-el-input--content');
    if(!box){return;}
    var row=document.createElement('div');row.className='tjf-phone';
    var sel=document.createElement('select');sel.className='tjf-cc';sel.setAttribute('aria-label',isEn(form)?'Country code':'کد کشور');
    var def=defaultCC(),picked=false;
    CC.forEach(function(c){var o=document.createElement('option');o.value=c[0];o.textContent=c[1];if(!picked){if(c[0]===def){o.selected=true;picked=true;}}sel.appendChild(o);});
    var fl=box.classList.contains('tjf-fl');
    if(fl){
      var inner=document.createElement('div');inner.className='tjf-fl';
      while(box.firstChild){inner.appendChild(box.firstChild);}
      box.classList.remove('tjf-fl');
      row.appendChild(sel);row.appendChild(inner);box.appendChild(row);
      el.addEventListener('input',function(){inner.classList.toggle('is-filled',!!el.value);});
    }else{
      box.insertBefore(row,el);row.appendChild(sel);row.appendChild(el);
    }
    el.setAttribute('placeholder','170 1234567');
    el.setAttribute('inputmode','tel');
  });
}
document.addEventListener('submit',function(e){
  var f=e.target;if(!f){return;}if(!f.querySelectorAll){return;}
  f.querySelectorAll('input[data-tjcc]').forEach(function(el){
    var v=toLatin(el.value);if(!v){return;}
    var sel=el.closest('.tjf-phone');sel=sel?sel.querySelector('select.tjf-cc'):null;
    if(/^\+/.test(v)){el.value=v;return;}
    if(/^00/.test(v)){el.value='+'+v.slice(2);return;}
    if(sel){if(sel.value){v=sel.value+v.replace(/^0+/,'');}}
    el.value=v;
  });
},true);

/* ۴. فرم چندمرحله‌ای برای فرم‌های بلند */
var MIN=10;
function topGroups(form){
  return [].slice.call(form.querySelectorAll('.ff-el-group')).filter(function(g){
    if(g.classList.contains('ff_submit_btn_wrapper')){return false;}
    var p=g.parentElement?g.parentElement.closest('.ff-el-group'):null;
    if(p){return false;}
    if(!g.querySelector('input:not([type=hidden]),select,textarea')){return g.classList.contains('ff-custom_html')?true:false;}
    return true;
  });
}
function stepify(form){
  if(form.getAttribute('data-tjs')){return;}
  var gs=topGroups(form);
  var real=gs.filter(function(g){return !!g.querySelector('input:not([type=hidden]),select,textarea');});
  if(real.length<MIN){return;}
  form.setAttribute('data-tjs','1');
  var NS=Math.ceil(real.length/5),PER=Math.ceil(real.length/NS);
  var steps=[],cur=[],count=0;
  gs.forEach(function(g){cur.push(g);if(g.querySelector('input:not([type=hidden]),select,textarea')){count++;}if(count===PER){steps.push(cur);cur=[];count=0;}});
  if(cur.length){if(count===0){if(steps.length){steps[steps.length-1]=steps[steps.length-1].concat(cur);}else{steps.push(cur);}}else{steps.push(cur);}}
  var N=steps.length,idx=0,en=isEn(form);
  var prog=document.createElement('div');prog.className='tjs-prog';
  var seg='<div class="tjs-seg" aria-hidden="true">';for(var i=0;i<N;i++){seg+='<i></i>';}seg+='</div>';
  prog.innerHTML=seg+'<div class="tjs-cap" aria-live="polite"><span class="tjs-now"></span><span class="tjs-left"></span></div>';
  var host=form.querySelector('fieldset')||form;
  var firstEl=null;[].slice.call(host.children).forEach(function(ch){if(!firstEl){if(ch.matches('.ff-t-container,.ff-el-group,.ff-field_container')){firstEl=ch;}}});
  host.insertBefore(prog,firstEl||host.firstChild);
  var subw=form.querySelector('.ff_submit_btn_wrapper');
  var nav=document.createElement('div');nav.className='tjs-nav';
  nav.innerHTML='<button type="button" class="tjs-prev"></button><button type="button" class="tjs-next"></button>';
  var prev=nav.querySelector('.tjs-prev'),next=nav.querySelector('.tjs-next');
  prev.textContent=en?'Back':'قبلی';next.textContent=en?'Next':'بعدی';
  subw.parentElement.insertBefore(nav,subw);
  function show(k,focus){
    idx=k;
    steps.forEach(function(s,j){s.forEach(function(g){g.classList.toggle('tjs-hide',j!==k);if(j===k){g.classList.remove('tjs-step-in');void g.offsetWidth;g.classList.add('tjs-step-in');}});});
    form.querySelectorAll('.ff-t-container').forEach(function(c){
      var vis=[].slice.call(c.querySelectorAll('.ff-el-group')).some(function(g){if(g.classList.contains('tjs-hide')){return false;}return !g.classList.contains('ff_submit_btn_wrapper');});
      var has=c.querySelector('.ff-el-group:not(.ff_submit_btn_wrapper)');
      if(has){c.classList.toggle('tjs-hide',!vis);}
    });
    prog.querySelectorAll('.tjs-seg i').forEach(function(x,j){x.classList.toggle('on',j<=k);});
    prog.querySelector('.tjs-now').innerHTML=en?('Step <b>'+(k+1)+'</b> of '+N):('مرحلهٔ <b>'+fa(k+1)+'</b> از '+fa(N));
    prog.querySelector('.tjs-left').textContent=k===N-1?(en?'Last step':'مرحلهٔ آخر'):'';
    prev.classList.toggle('tjs-hide',k===0);
    next.classList.toggle('tjs-hide',k===N-1);
    subw.classList.toggle('tjs-hide',k!==N-1);
    if(focus){
      var top=prog.getBoundingClientRect().top+window.scrollY-110;
      if(Math.abs(window.scrollY-top)>40){window.scrollTo({top:top,behavior:'smooth'});}
      var fi=steps[k][0].querySelector('input:not([type=hidden]),select,textarea');
      if(fi){try{fi.focus({preventScroll:true});}catch(e){}}
    }
  }
  function valid(k){
    var ok=true,firstBad=null;
    steps[k].forEach(function(g){
      g.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(function(el){
        var req=el.getAttribute('aria-required')==='true'||el.required;
        var v=(el.value||'').trim(),bad='';
        if(el.type==='checkbox'||el.type==='radio'){
          if(req){var any=g.querySelector('input:checked');if(!any){bad=en?'Please choose an option.':'یکی از گزینه‌ها را انتخاب کنید.';}}
        }else{
          if(req){if(!v){bad=en?'This field is required.':'این مورد لازم است.';}}
          if(!bad){if(v){if(el.type==='email'){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){bad=en?'Please enter a valid email.':'نشانی ایمیل درست نیست.';}}}}
        }
        var old=g.querySelector(':scope .tjs-err');if(old){old.remove();}
        if(bad){
          ok=false;g.classList.add('ff-el-is-error');
          var d=document.createElement('div');d.className='error text-danger tjs-err';d.textContent=bad;
          (el.closest('.ff-el-input--content')||g).appendChild(d);
          if(!firstBad){firstBad=el;}
          var clear=function(){g.classList.remove('ff-el-is-error');var o=g.querySelector('.tjs-err');if(o){o.remove();}};
          el.addEventListener('input',clear,{once:true});el.addEventListener('change',clear,{once:true});
        }
      });
    });
    if(firstBad){try{firstBad.focus();}catch(e){}}
    return ok;
  }
  next.addEventListener('click',function(){if(idx>=N-1){return;}if(valid(idx)){show(idx+1,true);}});
  prev.addEventListener('click',function(){if(idx<=0){return;}show(idx-1,true);});
  form.addEventListener('keydown',function(e){
    if(e.key!=='Enter'){return;}
    var t=e.target;if(!t){return;}if(t.tagName==='TEXTAREA'){return;}if(t.tagName==='BUTTON'){return;}
    if(idx<N-1){e.preventDefault();next.click();}
  });
  /* اگر بعد از ارسال، خطا در مرحلهٔ دیگری بود، به همان مرحله برگرد */
  var mo=new MutationObserver(function(){
    var bad=form.querySelector('.ff-el-is-error');if(!bad){return;}
    for(var j=0;j<steps.length;j++){if(steps[j].some(function(g){return g===bad||g.contains(bad);})){if(j!==idx){show(j,true);}break;}}
  });
  mo.observe(form,{subtree:true,attributes:true,attributeFilter:['class']});
  show(0,false);
}

/* ۵. کارت موفقیت */
function successCard(root){
  (root||document).querySelectorAll('.ff-message-success').forEach(function(m){
    if(m.getAttribute('data-tjok')){return;}
    m.setAttribute('data-tjok','1');
    var body=document.createElement('div');body.className='tjf-msg';
    while(m.firstChild){body.appendChild(m.firstChild);}
    var ic=document.createElement('span');ic.className='tjf-ok';ic.innerHTML=CHECK;
    m.appendChild(ic);m.appendChild(body);
    m.setAttribute('role','status');
    try{var r=m.getBoundingClientRect();if(r.top<0||r.top>window.innerHeight-80){window.scrollTo({top:r.top+window.scrollY-120,behavior:'smooth'});}}catch(e){}
  });
}

function init(){
  document.querySelectorAll('form.frm-fluent-form').forEach(function(f){
    try{floatLabels(f);}catch(e){}
    try{phoneCC(f);}catch(e){}
    try{privacy(f);}catch(e){}
    try{stepify(f);}catch(e){}
  });
  successCard(document);
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
setTimeout(init,1200);
new MutationObserver(function(ms){
  for(var i=0;i<ms.length;i++){
    var a=ms[i].addedNodes;
    for(var j=0;j<a.length;j++){
      var n=a[j];if(n.nodeType!==1){continue;}
      if(n.classList.contains('ff-message-success')){successCard(n.parentElement);return;}
      if(n.querySelector){if(n.querySelector('.ff-message-success,form.frm-fluent-form')){init();return;}}
    }
  }
}).observe(document.body,{childList:true,subtree:true});
})();
