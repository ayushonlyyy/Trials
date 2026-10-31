(function(){
var C=window.FORM,KEY='bonten:'+C.id,MOD='https://www.instagram.com/shouryaxmod';
var ROLES=['Primary Rusher','Secondary Rusher','IGL (In-Game Leader)','Sniper','Support','Nader (Grenadier)','Flanker','Fragger','Assaulter','Scout','Anchor','Flex Player'];
var TEAMS=[];for(var i=1;i<=10;i++)TEAMS.push('Team '+i);
var S={},step=0,review=false,sending=false;
try{S=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){S={}}
var $=function(id){return document.getElementById(id)};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function h(t,a,k){var e=document.createElement(t);for(var x in a||{}){if(x==='text')e.textContent=a[x];else e.setAttribute(x,a[x])}(k||[]).forEach(function(c){if(c)e.appendChild(c)});return e}
var nonEmpty=function(v){return v!==undefined&&v!==null&&String(v).trim().length>0};
var T={
 name:function(v){return nonEmpty(v)&&String(v).trim().length>=2},
 uid:function(v){return /^\d{8,14}$/.test(String(v||'').trim())},
 age:function(v){var n=Number(v);return nonEmpty(v)&&Number.isInteger(n)&&n>=5&&n<=60},
 wa:function(v){var w=String(v||'').replace(/[\s-]/g,'');return /^(\+?91)?[6-9]\d{9}$/.test(w)||/^\+\d{10,14}$/.test(w)},
 two:function(v){return nonEmpty(v)&&String(v).trim().length>=2},
 roles:function(v){return Array.isArray(v)&&v.length>=1&&v.length<=2},
 yes:function(v){return v===true}
};
var steps=C.steps;
function vis(f){return !f.show||f.show(S)}
function ok(f){
 if(f.t==='note'||!vis(f))return true;
 var v=S[f.k];if(f.opt&&!nonEmpty(v))return true;
 return (f.v||nonEmpty)(v);
}
function clearBad(w){w.classList.remove('bad')}
function field(f){
 var w=h('div',{class:'field','data-k':f.k||''});
 if(f.t==='note'){
  var n=h('div',{class:'info'},[h('p',{text:f.text}),h('a',{class:'ghost',href:MOD,target:'_blank',rel:'noopener',text:'Contact moderator'})]);
  return n;
 }
 var lab=h('label',{for:'x_'+f.k,text:f.l});
 if(f.hint)lab.appendChild(h('span',{class:'hint',text:' '+f.hint}));
 if(f.t==='roles'||f.t==='seg'){lab=h('div',{class:'lbl',text:f.l});if(f.hint)lab.appendChild(h('span',{class:'hint',text:' '+f.hint}))}
 if(f.t==='check'){
  var cb=h('input',{type:'checkbox',id:'x_'+f.k});cb.checked=S[f.k]===true;
  cb.onchange=function(){S[f.k]=cb.checked;save();clearBad(w)};
  w.appendChild(h('label',{class:'agree',for:'x_'+f.k},[cb,h('span',{text:f.l})]));
 }else{
  w.appendChild(lab);
  if(f.note)w.appendChild(h('p',{class:'note',text:f.note}));
  if(f.t==='select'){
   var s=h('select',{id:'x_'+f.k});
   s.appendChild(h('option',{value:'',text:f.opt?'Skip (not added to any group)':'Select'}));
   f.opts.forEach(function(o){s.appendChild(h('option',{value:o,text:o}))});
   s.value=f.opts.indexOf(S[f.k])>-1?S[f.k]:'';
   s.onchange=function(){S[f.k]=s.value;save();clearBad(w)};w.appendChild(s);
  }else if(f.t==='roles'){
   var g=h('div',{class:'cards'}),sel=Array.isArray(S[f.k])?S[f.k].filter(function(r){return ROLES.indexOf(r)>-1}):[];S[f.k]=sel;
   var paint=function(){[].forEach.call(g.children,function(b){var on=sel.indexOf(b.value)>-1;b.setAttribute('aria-pressed',on);b.disabled=!on&&sel.length>=2})};
   ROLES.forEach(function(r){var b=h('button',{type:'button',class:'card',value:r,text:r});
    b.onclick=function(){var i=sel.indexOf(r);if(i>-1)sel.splice(i,1);else if(sel.length<2)sel.push(r);S[f.k]=sel;save();clearBad(w);paint()};g.appendChild(b)});
   paint();w.appendChild(g);
  }else if(f.t==='seg'){
   var q=h('div',{class:'seg'});
   f.opts.forEach(function(o){var b=h('button',{type:'button','aria-pressed':S[f.k]===o,text:o});
    b.onclick=function(){S[f.k]=o;if(f.k==='ageVerified'&&o!=='Yes')S.ageDoc='';save();draw(true)};q.appendChild(b)});
   w.appendChild(q);
  }else{
   var i=h('input',{type:f.t,id:'x_'+f.k,maxlength:f.max||60,placeholder:f.ph||'',autocomplete:f.ac||'off'});
   if(f.im)i.setAttribute('inputmode',f.im);if(f.cap)i.setAttribute('autocapitalize','off');
   i.value=S[f.k]||'';
   i.oninput=function(){S[f.k]=i.value;save();clearBad(w)};
   i.onblur=function(){if(nonEmpty(i.value))w.classList.toggle('bad',!ok(f))};
   w.appendChild(i);
  }
 }
 w.appendChild(h('p',{class:'err',text:f.m||'This field is required.'}));
 return w;
}
function draw(keep){
 var stage=$('stage'),nav=$('nav'),y=window.scrollY;
 stage.innerHTML='';nav.innerHTML='';$('st').textContent='';
 var total=steps.length+1,bars=h('div',{class:'bars'});
 for(var i=0;i<total;i++)bars.appendChild(h('i',{class:i<=step?'on':''}));
 var name=review?'Review':steps[step].title;
 $('prog').innerHTML='';$('prog').appendChild(bars);
 $('prog').appendChild(h('p',{class:'stepname',text:'Step '+(review?total:step+1)+' of '+total+': '+name}));
 stage.className='stage'+(keep?'':' in');
 if(review){
  var r=h('div',{class:'rv'});
  steps.forEach(function(s){s.fields.forEach(function(f){
   if(f.t==='note'||!vis(f)||f.t==='check')return;
   var v=S[f.k];if(Array.isArray(v))v=v.join(', ');
   if(!nonEmpty(v)&&f.opt)v='Skipped';
   r.appendChild(h('div',{},[h('span',{text:f.l}),h('span',{text:String(v||'')})]));
  })});
  stage.appendChild(r);
  nav.appendChild(h('button',{type:'button',class:'ghost',id:'back',text:'Edit'}));
  nav.appendChild(h('button',{type:'submit',class:'send',id:'btn',text:C.send}));
  $('back').onclick=function(){review=false;step=steps.length-1;draw()};
 }else{
  steps[step].fields.forEach(function(f){if(vis(f))stage.appendChild(field(f))});
  if(step>0){nav.appendChild(h('button',{type:'button',class:'ghost',id:'back',text:'Back'}));$('back').onclick=function(){step--;draw()}}
  nav.appendChild(h('button',{type:'button',class:'send',id:'next',text:step===steps.length-1?'Review':'Next'}));
  $('next').onclick=next;
 }
 if(keep)window.scrollTo(0,y);else window.scrollTo({top:$('prog').offsetTop-12,behavior:'smooth'});
}
function next(){
 var first=null;
 steps[step].fields.forEach(function(f){
  var good=ok(f),w=document.querySelector('[data-k="'+f.k+'"]');
  if(w){w.classList.remove('bad');if(!good){void w.offsetWidth;w.classList.add('bad');if(!first)first=w}}
 });
 if(first){first.scrollIntoView({behavior:'smooth',block:'center'});$('st').textContent='Fix the marked fields to continue.';return}
 if(step===steps.length-1)review=true;else step++;
 draw();
}
function payload(){
 var d={website:document.querySelector('.hp').value};
 steps.forEach(function(s){s.fields.forEach(function(f){if(f.k&&vis(f))d[f.k]=S[f.k]})});
 if(d.age!==undefined)d.age=String(d.age).trim();
 return d;
}
$('f').addEventListener('submit',function(e){
 e.preventDefault();if(sending||!review)return;
 var btn=$('btn'),st=$('st');sending=true;btn.disabled=true;btn.textContent='Sending';
 fetch(C.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())})
 .then(function(r){return r.json().catch(function(){return {}}).then(function(j){return {ok:r.ok,j:j}})})
 .then(function(x){
  if(!(x.ok&&x.j.ok))throw 0;
  try{localStorage.removeItem(KEY)}catch(e){}
  var first=String(S.realName||'').trim().split(/\s+/)[0],d=$('done');
  d.innerHTML='<svg viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="28"/><path d="M22 35l8 8 16-17"/></svg>';
  d.appendChild(h('h2',{text:first?'Form sent, '+first:'Form sent'}));
  d.appendChild(h('p',{text:C.doneText}));
  if(C.mod&&S.ageVerified==='No')d.appendChild(h('div',{class:'info'},[h('p',{text:'Next step: verification is done with our moderator. Send only your date of birth on your school/college ID or Aadhaar card and hide all other details.'}),h('a',{class:'ghost',href:MOD,target:'_blank',rel:'noopener',text:'Contact moderator'})]));
  document.body.classList.add('sent');window.scrollTo({top:0,behavior:'smooth'});
 })
 .catch(function(){sending=false;btn.disabled=false;btn.textContent=C.send;st.textContent='Not sent. Check your internet and press the button again. Your answers are saved.'});
});
if(steps.every(function(s){return s.fields.every(ok)})&&S.__done){review=true;step=steps.length-1}
draw();
})();
