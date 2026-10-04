/* tj-faq v2: رفتار یکسان همهٔ پرسش‌های پرتکرار سایت (۴ مهر ۱۴۰۵). باز و بسته شدن نرم، یک سؤال باز در هر فهرست، کلیدهای جهت‌نما، لینک مستقیم به هر سؤال (#faq-n). */
(function(){
var SEL='.tj2 .faq-list>details,.tjl .faq>details,.tjx-faq>details';
var reduce=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)').matches:false;
function body(d){
  var els=[].slice.call(d.children).filter(function(n){return n.tagName!=='SUMMARY';});
  if(els.length===1){if(els[0].tagName==='DIV'){return els[0];}}
  var b=document.createElement('div');b.className='tj-faq-body';
  [].slice.call(d.childNodes).forEach(function(n){if(n.nodeType===1){if(n.tagName==='SUMMARY'){return;}}b.appendChild(n);});
  d.appendChild(b);return b;
}
function closeNow(d,anim){
  if(!d.open){return;}
  var a=body(d);
  if(reduce||!anim){d.open=false;return;}
  d.setAttribute('data-anim','1');
  a.style.height=a.offsetHeight+'px';a.style.transition='height .3s ease';
  requestAnimationFrame(function(){a.style.height='0px';});
  setTimeout(function(){d.open=false;a.style.height='';a.style.transition='';d.removeAttribute('data-anim');},300);
}
function openNow(d,anim){
  if(d.open){return;}
  var a=body(d);
  if(reduce||!anim){d.open=true;return;}
  d.setAttribute('data-anim','1');
  d.open=true;var h=a.offsetHeight;a.style.height='0px';a.style.transition='height .32s ease';
  requestAnimationFrame(function(){a.style.height=h+'px';});
  setTimeout(function(){a.style.height='';a.style.transition='';d.removeAttribute('data-anim');},330);
}
function siblings(d){return [].slice.call(d.parentElement.children).filter(function(x){return x.tagName==='DETAILS';});}
function setHash(d){
  if(!d.id){return;}
  try{history.replaceState(null,'','#'+d.id);}catch(e){}
}
document.addEventListener('click',function(e){
  var s=e.target.closest?e.target.closest('summary'):null;
  if(!s){return;}
  var d=s.parentElement;
  if(!d){return;}
  if(!d.matches(SEL)){return;}
  var a=e.target.closest('a');
  if(a){if(a!==s){return;}}
  e.preventDefault();e.stopImmediatePropagation();
  if(d.getAttribute('data-anim')){return;}
  if(d.open){closeNow(d,true);return;}
  siblings(d).forEach(function(x){if(x!==d){closeNow(x,true);}});
  openNow(d,true);setHash(d);
},true);
document.addEventListener('keydown',function(e){
  var s=e.target;
  if(!s){return;}if(s.tagName!=='SUMMARY'){return;}
  var d=s.parentElement;if(!d){return;}if(!d.matches(SEL)){return;}
  var list=siblings(d),i=list.indexOf(d),to=-1;
  if(e.key==='ArrowDown'){to=Math.min(list.length-1,i+1);}
  else if(e.key==='ArrowUp'){to=Math.max(0,i-1);}
  else if(e.key==='Home'){to=0;}
  else if(e.key==='End'){to=list.length-1;}
  if(to<0){return;}
  e.preventDefault();
  var t=list[to].querySelector('summary');if(t){t.focus();}
});
function ids(){
  var n=0;
  document.querySelectorAll(SEL).forEach(function(d){
    n++;
    if(!d.id){d.id='faq-'+n;}
  });
}
function fromHash(){
  var h=decodeURIComponent((location.hash||'').slice(1));
  if(!h){return;}
  var d=document.getElementById(h);
  if(!d){return;}if(!d.matches(SEL)){return;}
  siblings(d).forEach(function(x){if(x!==d){closeNow(x,false);}});
  openNow(d,false);
  setTimeout(function(){var r=d.getBoundingClientRect();window.scrollTo({top:r.top+window.scrollY-110,behavior:'smooth'});},250);
}
function init(){ids();fromHash();}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
window.addEventListener('hashchange',fromHash);
})();
