/* 小狗撲克復盤：單頁應用。路由 #/（首頁）、#/d=all、#/d=2026-11-26,2026-11-25、再加 &h=手號 打開單手視窗。
   單手視窗本身在 dialog.js（由 make_report 的視窗程式抽出，外觀與功能不動）。 */
(function(){
'use strict';
var BBV=0.05;
var POSN={UTG:'強抓位',UTG1:'EP',MP:'EP2',HJ:'MP',CO:'CO',BTN:'BTN',SB:'SB',BB:'BB'};
var POSORD=['UTG','UTG1','MP','HJ','CO','BTN','SB','BB'];
var SEATS=['UTG','UTG1','BB','MP','SB','HJ','BTN','CO'];
var SY={s:'♠',h:'♥',d:'♦',c:'♣'};
var RKS='AKQJT98765432';
var PTN={limp:'沒人加注',srp:'單一加注','3b':'3B','4b':'4B 以上'};
function $(i){return document.getElementById(i)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function any(o){for(var k in o)return true;return false}
var app=$('app'),jump=$('jump');

var DATA=null,HANDS=[],DAYS=[],byNo={},dayBy={};
var TPL={},dayLoad={},TBL=null,R={view:'home',dstr:'all',d:[],h:null},curKey='';
var F={big:0,res:'',err:0,sd:0,wp:0,pos:{},pt:{},np:{},cards:[],cm:'exact',sort:'no',dir:1,more:0,cp:0};
var RES=[],seatSel=null,infoOpen=false;

function jget(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(u+' '+r.status);return r.json()})}
function tget(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(u+' '+r.status);return r.text()})}

/* ---------- 路由 ---------- */
function parse(){
  var h=location.hash||'',m,o={view:'home',d:null,h:null};
  if(m=/^#h(\d+)$/.exec(h)){o.view='resolve';o.h=m[1];return o}
  if(h.indexOf('#/')!==0)return o;
  var q={};h.slice(2).split('&').forEach(function(kv){var i=kv.indexOf('=');if(i>0)q[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1))});
  if(q.h&&!q.d){o.view='resolve';o.h=q.h;return o}
  if(q.d){o.view='search';o.d=q.d}
  o.h=q.h||null;return o}
function hashFor(dstr,h){return '#/d='+dstr+(h?'&h='+h:'')}
function dstrOf(ids){ids=ids.slice().sort();return ids.length===DAYS.length?'all':ids.join(',')}
function idsOf(dstr){if(dstr==='all')return DAYS.map(function(d){return d.id});
  var a=dstr.split(',').filter(function(x){return dayBy[x]});return a.length?a.sort():DAYS.map(function(d){return d.id})}
function base(){return location.pathname+location.search}

var PPH=window.PPH={
  order:function(){return RES.map(function(h){return String(h.n)})},
  all:function(no){var h=byNo[no],s=h?h.s:null;var a=HANDS.filter(function(x){return !s||x.s===s}).map(function(x){return String(x.n)});return a.length?a:[String(no)]},
  tpl:function(no){return TPL[no]||null},
  ensure:function(no,cb){var h=byNo[no];if(!h)return;loadDay(h.s).then(function(){if(TPL[no])cb()},function(){toastErr()})},
  url:function(no){return base()+hashFor(R.dstr,no)},
  shareUrl:function(no){var h=byNo[no];return location.origin+location.pathname+hashFor(h?h.s:R.dstr,no)},
  curH:function(){return parse().h}
};
function toastErr(){alert('載入這一天的牌譜失敗，請檢查網路後再試。')}

function loadDay(id){
  if(dayLoad[id])return dayLoad[id];
  dayLoad[id]=tget('days/'+id+'.html').then(function(t){
    var doc=new DOMParser().parseFromString(t,'text/html');
    [].forEach.call(doc.querySelectorAll('template[data-no]'),function(x){TPL[x.dataset.no]=x})
  },function(e){delete dayLoad[id];throw e});
  return dayLoad[id]}

function loadData(){
  if(DATA)return Promise.resolve();
  return jget('hands.json').then(function(d){
    DATA=d;HANDS=d.hands;DAYS=d.days.slice().sort(function(a,b){return a.id<b.id?1:-1});
    HANDS.forEach(function(h){byNo[h.n]=h});DAYS.forEach(function(x){dayBy[x.id]=x})})}
function loadTbl(){return TBL?Promise.resolve():jget('tbl.json').then(function(d){TBL=d})}

/* ---------- 共用小零件 ---------- */
function cardsHTML(c){var o='';for(var i=0;i+1<c.length;i+=2)o+='<span class="cd '+c[i+1]+'">'+c[i]+SY[c[i+1]]+'</span>';return o}
function usd(x,sign){var s=Math.abs(x).toFixed(2);return(sign===false?'':x>0?'+':x<0?'−':'')+'$'+s}
function netSpan(bb){var x=bb*BBV;return'<span class="'+(x>0?'win':x<0?'lose':'')+'">'+usd(x)+'</span>'}
function f1(x){return(x>=0?'+':'−')+Math.abs(x).toFixed(1)}
function cls(x){return x>0?'p':x<0?'m':''}
function sel(){return R.d}

/* ---------- 首頁 ---------- */
function renderHome(){
  document.title='小狗撲克復盤';jump.innerHTML='';$('back').hidden=true;
  var tot=DAYS.reduce(function(a,d){return{h:a.h+d.hands,n:a.n+d.net}},{h:0,n:0});
  var cards=DAYS.map(function(d){
    var errs=d.big+d.small;
    return'<div class="dcard" data-id="'+d.id+'"><a class="dmain" href="'+hashFor(d.id)+'"><div class="dt1"><b>'+esc(d.label)+'</b><span class="dnet '+cls(d.net)+'">'+usd(d.net)+'</span></div>'+
      '<div class="dt2">'+d.hands+' 手・WPT 明顯錯 '+d.lacking+'・求解器抓到 '+errs+' 個錯</div></a>'+
      '<label class="ck" title="勾選後可一次看多天"><input type="checkbox" data-ck="'+d.id+'" aria-label="選取 '+esc(d.label)+'"></label></div>'}).join('');
  app.innerHTML='<h1>小狗撲克復盤</h1><p class="mute" style="margin:0">WPT Global 現金桌實戰，每一手都用求解器對照。先選要覆盤哪一天。</p>'+
    '<section><h2>選日期</h2><p class="mute sm">點一天直接進去；想一次看好幾天，勾右邊的框，再按下面的按鈕。</p><div class="dlist">'+cards+'</div></section>'+
    '<a class="btn" href="'+hashFor('all')+'">看全部日期（'+DAYS.length+' 天・'+tot.h+' 手）</a>'+
    '<div class="pickbar" id="pickbar" hidden><a class="btn" id="pickgo" href="#">看選的日期</a></div>'+
    '<p class="mute sm">求解器對手範圍是估的，三人底池與 3bet 底池只看方向。對手暱稱一律換成代號。手牌紀錄與求解僅供學習。</p>';
  PPH.conv(app)}
function updatePick(){
  var ids=[].map.call(app.querySelectorAll('input[data-ck]:checked'),function(i){return i.dataset.ck});
  [].forEach.call(app.querySelectorAll('.dcard'),function(c){c.classList.toggle('on',ids.indexOf(c.dataset.id)>=0)});
  var pb=$('pickbar');if(!pb)return;pb.hidden=!ids.length;
  if(ids.length){var g=$('pickgo');g.href=hashFor(dstrOf(ids));g.textContent='看選的 '+ids.length+' 天 →'}}

/* ---------- 教練總評 ---------- */
function coachBody(text){
  var lines=String(text).split('\n'),out=[],ol=false;
  function inl(s){return esc(s).replace(/#(\d{1,4})\b/g,function(m,n){return byNo[n]?'<a href="'+PPH.url(n)+'" data-h="'+n+'">#'+n+'</a>':m})}
  lines.slice(1).forEach(function(l){l=l.replace(/\s+$/,'');
    var m=/^\d+\.\s+(.*)$/.exec(l);
    if(m){if(!ol){out.push('<ol>');ol=true}out.push('<li>'+inl(m[1])+'</li>');return}
    if(ol){out.push('</ol>');ol=false}
    if(!l.trim())return;
    if(l.indexOf('## ')===0){out.push('<h4>'+inl(l.slice(3))+'</h4>');return}
    out.push('<p>'+inl(l)+'</p>')});
  if(ol)out.push('</ol>');return out.join('')}
function coachHTML(ids){
  var days=DAYS.filter(function(d){return ids.indexOf(d.id)>=0});
  return days.map(function(d,i){
    var open=days.length===1||i===0;
    var head=d.coach?String(d.coach).split('\n')[0]:'這天還沒有教練總評。';
    return'<details class="coach"'+(open?' open':'')+'><summary><span class="cd1">'+esc(d.label)+'</span><span class="cn '+cls(d.net)+'">'+usd(d.net)+'</span><span class="ch">'+inl2(head)+'</span></summary>'+
      (d.coach?'<div class="cbody">'+coachBody(d.coach)+'<div class="cat">更新：'+esc(d.coach_at||'')+'　（數字來自牌譜與求解資料庫）</div></div>':'')+'</details>'}).join('')}
function inl2(s){return esc(s)}

/* ---------- 牌桌（八個位置） ---------- */
function tRows(k){var ids=sel();return TBL.hands.filter(function(h){return ids.indexOf(h.s)>=0&&(k==null||h.pos===k)})}
function agg(rows){var a={n:0,net:0,v:0,p:0,o3:0,b3:0,lk:0,cl:0,sv:0,loss:0};rows.forEach(function(h){a.n++;a.net+=h.net;a.v+=h.v;a.p+=h.p;a.o3+=h.o3;a.b3+=h.b3;a.lk+=h.lk;a.cl+=h.cl;if(h.sv){a.sv++;a.loss+=h.ls}});return a}
function pct(a,b){return b?Math.round(100*a/b):null}
function tableHTML(){
  var seats=SEATS.map(function(k,i){return'<button type="button" class="ps s'+i+'" id="seat'+i+'" data-seat="'+k+'" aria-expanded="false"></button>'}).join('');
  return'<details class="fold tb" id="tbdet"'+(tbOpen()?' open':'')+'><summary>牌桌：你在每個位置的表現</summary>'+
    '<p class="mute sm" style="margin:8px 0 0">跟著上面選的日期變。點座位看詳細。數字是你自己在該位置的數據，1 BB = $0.05。</p>'+
    '<div class="mute" id="tsum" style="margin:8px 0 0"></div><div class="ptb"><div class="pfelt" id="pfelt"></div>'+seats+'</div><div class="tdetail" id="tdetail" hidden></div></details>'}
function tbOpen(){try{return localStorage.getItem('pp_tb')!=='0'}catch(_){return true}}
function drawTable(){
  if(!TBL||!$('tsum'))return;
  var tot=agg(tRows(null));
  $('tsum').innerHTML='合計 '+tot.n+' 手　<b class="'+cls(tot.net)+'">'+f1(tot.net/BBV)+' BB</b>（'+usd(tot.net)+'）　8 人桌有抓位';
  SEATS.forEach(function(k,i){var a=agg(tRows(k)),bb=a.net/BBV,el=$('seat'+i);
    el.className='ps s'+i+(a.n?(bb>=0?' win':' lose'):' none');
    el.setAttribute('aria-expanded',seatSel===k?'true':'false');
    el.setAttribute('aria-label',POSN[k]+'，'+a.n+'手，VPIP '+pct(a.v,a.n)+'，PFR '+pct(a.p,a.n)+'，'+f1(bb)+' BB');
    el.innerHTML='<div class="nm"><span>'+POSN[k]+(k==='BTN'?'<span class="dealer">D</span>':'')+'</span><small>'+a.n+'手</small></div>'+
      (a.n?'<div class="bb '+cls(bb)+'">'+f1(bb)+'<i>BB</i></div><div class="st"><div><em>VPIP</em>'+pct(a.v,a.n)+'%</div><div><em>PFR</em>'+pct(a.p,a.n)+'%</div></div>':'<div class="bb">—</div><div class="st"><div><em>這幾天沒有手</em></div></div>')});
  var d=$('tdetail');
  if(!seatSel){d.hidden=true;return}
  var a=agg(tRows(seatSel)),bb=a.net/BBV;d.hidden=false;
  var h='<div class="tcard"><h3>'+POSN[seatSel]+'<small class="mute">'+a.n+' 手</small></h3>';
  if(!a.n){d.innerHTML=h+'<p class="mute">選的日子沒有在這個位置打的牌。</p></div>';return}
  function cell(t,v){return'<div class="dcell"><span>'+t+'</span>'+v+'</div>'}
  h+='<div class="dgrid">'+cell('輸贏（BB）','<b class="'+cls(bb)+'">'+f1(bb)+' BB</b>')+cell('輸贏（美元）','<b class="'+cls(a.net)+'">'+usd(a.net)+'</b>')+
   cell('bb/100（每百手贏幾個大盲）','<b class="'+cls(bb)+'">'+f1(bb/a.n*100)+'</b>')+
   cell('VPIP（主動入池）','<b>'+pct(a.v,a.n)+'%</b><small>'+a.v+' / '+a.n+' 手</small>')+
   cell('PFR（翻前加注）','<b>'+pct(a.p,a.n)+'%</b><small>'+a.p+' / '+a.n+' 手</small>')+
   cell('3bet%','<b>'+(a.o3?pct(a.b3,a.o3)+'%':'—')+'</b><small>'+(a.o3?a.b3+' / '+a.o3+' 次有機會':'這位置沒有機會')+'</small>')+
   cell('WPT「明顯錯」','<b>'+a.lk+' 個</b><small>每百手 '+(a.lk/a.n*100).toFixed(1)+'</small>')+
   cell('WPT「邊緣」','<b>'+a.cl+' 個</b>')+
   cell('求解少賺','<b>'+(a.sv?'$'+a.loss.toFixed(2):'—')+'</b><small>'+(a.sv?'已求解 '+a.sv+' 手（兩人底池）':'這位置沒有求解資料')+'</small>')+'</div>'+
   '<button class="btn ghost" type="button" data-act="seatfilter">只看這個位置的手牌 ↓</button>'+
   '<p class="mute sm">VPIP：主動投錢入池的比例（抓位強制 $0.10、大盲沒人加注時過牌不算）。</p></div>';
  d.innerHTML=h}

/* ---------- 篩選與清單 ---------- */
function cardMatch(c){
  var s=F.cards;if(!s.length)return true;
  var a=[c[0],c[1]],b=[c[2],c[3]],suited=c[1]===c[3];
  var x=s[0],y=s[1];
  if(!y){
    if(F.cm==='exact')return(a[0]===x.r&&a[1]===x.s)||(b[0]===x.r&&b[1]===x.s);
    var has=a[0]===x.r||b[0]===x.r;if(!has)return false;
    return F.cm==='any'?true:F.cm==='suited'?suited:!suited}
  if(F.cm==='exact'){
    var m1=a[0]===x.r&&a[1]===x.s&&b[0]===y.r&&b[1]===y.s,m2=a[0]===y.r&&a[1]===y.s&&b[0]===x.r&&b[1]===x.s;return m1||m2}
  var rk=[a[0],b[0]].sort().join(''),want=[x.r,y.r].sort().join('');
  if(rk!==want)return false;
  return F.cm==='any'?true:F.cm==='suited'?suited:!suited}
function match(h){
  if(sel().indexOf(h.s)<0)return false;
  if(F.big&&h.pot<100)return false;
  if(F.res==='w'&&!(h.nb>0))return false;if(F.res==='l'&&!(h.nb<0))return false;
  if(F.err&&!(h.lv==='big'||h.lv==='small'))return false;
  if(F.sd&&!h.sd)return false;if(F.wp&&!h.wp)return false;
  if(any(F.pos)&&!F.pos[h.p])return false;
  if(any(F.pt)&&!F.pt[h.pt])return false;
  if(any(F.np)&&!F.np[h.np>=3?3:h.np])return false;
  return cardMatch(h.c)}
function compute(){
  var k={no:'n',pot:'pot',net:'nb'}[F.sort];
  RES=HANDS.filter(match);
  RES.sort(function(a,b){var d=(a[k]-b[k])*F.dir;return d||(a.n-b.n)})}
function rowHTML(h){
  var dl=dayBy[h.s]?dayBy[h.s].label:'';
  return'<a class="hr" href="'+base()+hashFor(R.dstr,h.n)+'" data-h="'+h.n+'"><span class="no">#'+h.n+'</span><span class="dt">'+esc(dl)+'</span>'+
    '<span class="who"><span class="ps1">'+POSN[h.p]+'</span>'+cardsHTML(h.c)+'</span>'+
    '<span class="sub">'+(h.f?'<span class="bd">'+cardsHTML(h.f)+'</span>':'<span class="bd mute">沒看翻牌</span>')+
    '<span class="tagz">'+h.tg.map(function(t){return'<span class="pill '+t[0]+'">'+esc(t[1])+'</span>'}).join('')+'</span></span>'+
    '<span class="pot">池 $'+(h.pot*BBV).toFixed(2)+'</span><span class="net">'+netSpan(h.nb)+'</span><span class="go">›</span></a>'}
function renderRows(){
  compute();
  var box=$('hrows');if(!box)return;
  box.innerHTML=RES.length?RES.map(rowHTML).join(''):'<div class="empty">沒有符合的手牌。放寬條件，或按「清除條件」。</div>';
  var tot=HANDS.filter(function(h){return sel().indexOf(h.s)>=0}).length;
  $('fcnt').innerHTML='符合 <b>'+RES.length+'</b> 手（這幾天共 '+tot+' 手可看）';
  [].forEach.call(document.querySelectorAll('.sorth button'),function(b){var on=F.sort===b.dataset.sort;b.setAttribute('aria-pressed',on?'true':'false');
    b.querySelector('i').textContent=on?(F.dir>0?'▲':'▼'):'↕';
    b.setAttribute('aria-label',b.dataset.name+(on?'，目前'+(F.dir>0?'小到大':'大到小')+'，再按一次反過來':'，按一下用這個排序'))});
  PPH.conv(box)}
function cardHint(){
  var s=F.cards;if(!s.length)return'點上面的牌，最多 2 張。';
  var nm=function(c){return(c.r==='T'?'10':c.r)+SY[c.s]},rn=function(c){return c.r==='T'?'10':c.r};
  if(s.length===1){
    if(F.cm==='exact')return'找手牌含 '+nm(s[0])+' 的手。';
    if(F.cm==='any')return'找手牌含 '+rn(s[0])+'（任何花色）的手。';
    return'找手牌含 '+rn(s[0])+'、且兩張'+(F.cm==='suited'?'同花':'不同花')+'的手。'}
  if(F.cm==='exact')return'找手牌剛好是 '+nm(s[0])+' '+nm(s[1])+' 的手。';
  var t=rn(s[0])+rn(s[1]);
  return F.cm==='any'?'找 '+t+'，不分花色（同花、不同花都算）。':F.cm==='suited'?'找 '+t+'s：同花。':'找 '+t+'o：不同花。'}
function pickHTML(){var s=F.cards;return s.length?s.map(function(c){return'<span class="cd '+c.s+'">'+(c.r==='T'?'10':c.r)+SY[c.s]+'</span>'}).join(''):'<span class="none">還沒選牌</span>'}
function cpanelHTML(){
  var h='<div class="pick" id="pick"></div><div class="modes" role="group" aria-label="花色條件">'+
    [['exact','指定花色'],['any','不分花色'],['suited','同花'],['off','不同花']].map(function(m){return'<button type="button" class="chip" data-cm="'+m[0]+'" aria-pressed="false">'+m[1]+'</button>'}).join('')+'</div>';
  h+='<div class="cgrid"><span></span>'+RKS.split('').map(function(r){return'<span class="rh">'+(r==='T'?'10':r)+'</span>'}).join('');
  'shdc'.split('').forEach(function(su){
    h+='<span class="sl '+su+'">'+SY[su]+'</span>';
    RKS.split('').forEach(function(r){h+='<button type="button" class="'+su+'" data-r="'+r+'" data-s="'+su+'" aria-pressed="false" aria-label="'+(r==='T'?'10':r)+SY[su]+'">'+(r==='T'?'10':r)+'</button>'})});
  h+='</div><p class="chint" id="chint"></p><div class="fbar"><button type="button" data-act="cclear">清除牌</button><button type="button" data-act="cdone">完成</button></div>';
  return h}
function syncCards(){
  var p=$('pick');if(!p)return;p.innerHTML=pickHTML();$('chint').textContent=cardHint();
  [].forEach.call(document.querySelectorAll('.cgrid button'),function(b){b.setAttribute('aria-pressed',F.cards.some(function(c){return c.r===b.dataset.r&&c.s===b.dataset.s})?'true':'false')});
  [].forEach.call(document.querySelectorAll('[data-cm]'),function(b){b.setAttribute('aria-pressed',b.dataset.cm===F.cm?'true':'false')})}
function nActive(){return(F.big?1:0)+(F.res?1:0)+(F.err?1:0)+(F.sd?1:0)+(F.wp?1:0)+Object.keys(F.pos).length+Object.keys(F.pt).length+Object.keys(F.np).length+(F.cards.length?1:0)}
function syncFilter(){
  var q=function(a,v){var e=document.querySelector('[data-q="'+a+'"]');if(e)e.setAttribute('aria-pressed',v?'true':'false')};
  q('big',F.big);q('w',F.res==='w');q('l',F.res==='l');q('err',F.err);q('sd',F.sd);q('wp',F.wp);
  [].forEach.call(document.querySelectorAll('[data-pos]'),function(b){b.setAttribute('aria-pressed',F.pos[b.dataset.pos]?'true':'false')});
  [].forEach.call(document.querySelectorAll('[data-pt]'),function(b){b.setAttribute('aria-pressed',F.pt[b.dataset.pt]?'true':'false')});
  [].forEach.call(document.querySelectorAll('[data-np]'),function(b){b.setAttribute('aria-pressed',F.np[b.dataset.np]?'true':'false')});
  var kb=document.querySelector('[data-act="cards"]');if(kb){kb.setAttribute('aria-pressed',F.cards.length?'true':'false');
    kb.textContent='🃏 牌面搜尋'+(F.cards.length?'：'+F.cards.map(function(c){return(c.r==='T'?'10':c.r)+SY[c.s]}).join(' '):'')}
  var mb=document.querySelector('[data-act="more"]');if(mb){var n=Object.keys(F.pos).length+Object.keys(F.pt).length+Object.keys(F.np).length+(F.wp?1:0);mb.textContent='更多條件'+(n?'（'+n+'）':'')+(F.more?' ▴':' ▾');mb.setAttribute('aria-expanded',F.more?'true':'false')}
  $('fpanel2').hidden=!F.more;$('cpanel').hidden=!F.cp;
  $('freset').hidden=!nActive();
  syncCards()}
function filterHTML(){
  var Q=function(k,t,c){return'<button type="button" class="chip'+(c||'')+'" data-q="'+k+'" aria-pressed="false">'+t+'</button>'};
  return'<div class="qbar" role="group" aria-label="快速條件">'+Q('big','大底池 ≥100BB')+Q('w','贏')+Q('l','輸')+Q('err','打錯')+Q('sd','有攤牌')+
    '<button type="button" class="chip k" data-act="cards" aria-pressed="false">🃏 牌面搜尋</button>'+
    '<button type="button" class="chip k" data-act="more" aria-expanded="false">更多條件 ▾</button></div>'+
    '<div class="cpanel" id="cpanel" hidden>'+cpanelHTML()+'</div>'+
    '<div class="fpanel2" id="fpanel2" hidden>'+
    '<div class="grp"><span>位置</span>'+POSORD.map(function(p){return'<button type="button" class="chip" data-pos="'+p+'" aria-pressed="false">'+POSN[p]+'</button>'}).join('')+'</div>'+
    '<div class="grp"><span>底池類型</span>'+['limp','srp','3b','4b'].map(function(p){return'<button type="button" class="chip" data-pt="'+p+'" aria-pressed="false">'+PTN[p]+'</button>'}).join('')+'</div>'+
    '<div class="grp"><span>人數</span>'+[[1,'沒人跟'],[2,'兩人'],[3,'三人以上']].map(function(p){return'<button type="button" class="chip" data-np="'+p[0]+'" aria-pressed="false">'+p[1]+'</button>'}).join('')+'</div>'+
    '<div class="grp"><span>求解</span>'+Q('wp','WPT 明顯錯')+'</div></div>'+
    '<div class="fbar"><span class="fcnt" id="fcnt"></span><button type="button" id="freset" data-act="reset" hidden>清除條件</button></div>'+
    '<div class="sorth" role="group" aria-label="排序">'+
    [['no','手號／日期'],['pot','底池'],['net','輸贏']].map(function(s){return'<button type="button" data-sort="'+s[0]+'" data-name="'+s[1]+'" aria-pressed="false">'+s[1]+' <i>↕</i></button>'}).join('')+'</div>'+
    '<div class="hrows" id="hrows"></div>'}

/* ---------- 說明與統計（依日期，打開才載入） ---------- */
function drawInfo(){
  var box=$('infobox');if(!box||!infoOpen)return;
  var pages={};sel().forEach(function(id){pages[dayBy[id].page]=1});
  box.innerHTML='<p class="mute">載入中…</p>';
  Promise.all(Object.keys(pages).map(function(p){return tget('info/'+p+'.html').then(function(t){return{p:p,t:t}})})).then(function(rs){
    var ids=sel(),out=document.createElement('div');out.className='infowrap';
    rs.forEach(function(r){
      var doc=new DOMParser().parseFromString(r.t,'text/html');
      [].forEach.call(doc.body.children,function(sec){
        var ds=(sec.dataset.days||'').split(' ').filter(Boolean);
        if(ds.length&&!ds.some(function(d){return ids.indexOf(d)>=0}))return;
        [].forEach.call(sec.querySelectorAll('[data-day]'),function(a){if(ids.indexOf(a.dataset.day)<0)a.remove()});
        out.appendChild(document.importNode(sec,true))})});
    box.replaceChildren(out);if(!out.children.length)box.innerHTML='<p class="mute">這幾天沒有額外說明。</p>';
    PPH.conv(box)},function(){box.innerHTML='<p class="mute">載入失敗，請稍後再試。</p>'})}

/* ---------- 搜尋頁 ---------- */
function renderSearch(){
  var ids=sel(),ds=DAYS.filter(function(d){return ids.indexOf(d.id)>=0});
  document.title='小狗撲克復盤｜'+ds.map(function(d){return d.label}).join('、');
  $('back').hidden=false;
  jump.innerHTML=[['coach','總評'],['tbsec','牌桌'],['list','手牌'],['info','說明']].map(function(j){return'<button type="button" data-jump="'+j[0]+'">'+j[1]+'</button>'}).join('');
  var allSel=ids.length===DAYS.length;
  var chips='<button type="button" class="chip" data-day="all" aria-pressed="'+allSel+'">全部</button>'+DAYS.map(function(d){return'<button type="button" class="chip" data-day="'+d.id+'" aria-pressed="'+(!allSel&&ids.indexOf(d.id)>=0)+'">'+esc(d.label)+'</button>'}).join('');
  var tot=ds.reduce(function(a,d){return{h:a.h+d.hands,n:a.n+d.net}},{h:0,n:0});
  app.innerHTML='<div><h1>小狗撲克復盤</h1><div class="dchips" role="group" aria-label="選日期" style="margin-top:8px">'+chips+'</div>'+
    '<p class="sumline">共 <b>'+tot.h+'</b> 手　牌譜加總 <b class="'+cls(tot.n)+'">'+usd(tot.n)+'</b>（'+f1(tot.n/BBV)+' BB）</p></div>'+
    '<section id="coach"><h2>教練總評</h2><div class="noconv">'+coachHTML(ids)+'</div></section>'+
    '<section id="tbsec">'+tableHTML()+'</section>'+
    '<section id="list"><h2>手牌</h2>'+filterHTML()+'</section>'+
    '<section id="info"><details class="fold" id="infodet"'+(infoOpen?' open':'')+'><summary>說明與統計</summary><div id="infobox"></div></details></section>';
  syncFilter();renderRows();PPH.conv(app);
  loadTbl().then(function(){drawTable();PPH.conv($('tbsec'))},function(){var s=$('tsum');if(s)s.textContent='牌桌資料載入失敗'});
  if(infoOpen)drawInfo()}

/* ---------- 主流程 ---------- */
function route(force){
  var o=parse(),first=(curKey==='');
  return loadData().then(function(){
    if(first&&o.h&&o.view==='search')o.shared=true;
    if(o.view==='resolve'){
      var h=byNo[o.h];
      if(!h){history.replaceState(null,'',base()+'#/');return route(true)}
      history.replaceState(null,'',base()+hashFor(h.s));o={view:'search',d:h.s,h:o.h,shared:true}}
    if(o.view==='home'){
      var k='home';if(!force&&k===curKey)return;curKey=k;R={view:'home',dstr:'all',d:[],h:null};
      PPH.close();renderHome();window.scrollTo(0,0);return}
    var ids=idsOf(o.d),dstr=dstrOf(ids);
    if(o.h&&byNo[o.h]&&ids.indexOf(byNo[o.h].s)<0){ids=ids.concat(byNo[o.h].s);dstr=dstrOf(ids)}
    var key='s:'+dstr;
    if(force||key!==curKey){curKey=key;R={view:'search',dstr:dstr,d:ids,h:o.h};
      if(location.hash!==hashFor(dstr,o.h)&&!o.h)history.replaceState(null,'',base()+hashFor(dstr));
      renderSearch();if(!o.shared)window.scrollTo(0,0)}
    R.h=o.h;
    if(o.h){if(o.shared||!PPH.isOpen())PPH.openShared&&(o.shared?PPH.openShared(o.h):PPH.open(o.h))}
    else PPH.close()})}

function changeDays(ids){
  var dstr=dstrOf(ids);history.replaceState(null,'',base()+hashFor(dstr));curKey='s:'+dstr;
  R={view:'search',dstr:dstr,d:idsOf(dstr),h:null};seatSel=null;renderSearch()}

document.addEventListener('click',function(ev){
  var t=ev.target;if(!t.closest)return;var b;
  if(app.contains(t)||t.closest('nav')){
    if(b=t.closest('[data-jump]')){var e=$(b.dataset.jump);if(e){if(b.dataset.jump==='info'){var dd=$('infodet');if(dd)dd.open=true}e.scrollIntoView({behavior:'smooth',block:'start'})}return}
    if(b=t.closest('[data-day]')){
      var id=b.dataset.day,ids=R.d.slice(),all=ids.length===DAYS.length;
      if(id==='all')ids=DAYS.map(function(d){return d.id});
      else if(all)ids=[id];
      else{var i=ids.indexOf(id);if(i>=0)ids.splice(i,1);else ids.push(id);if(!ids.length)ids=DAYS.map(function(d){return d.id})}
      changeDays(ids);return}
    if(b=t.closest('[data-q]')){var k=b.dataset.q;
      if(k==='big')F.big=F.big?0:1;else if(k==='w')F.res=F.res==='w'?'':'w';else if(k==='l')F.res=F.res==='l'?'':'l';
      else F[k]=F[k]?0:1;syncFilter();renderRows();return}
    if(b=t.closest('[data-pos]')){var p=b.dataset.pos;if(F.pos[p])delete F.pos[p];else F.pos[p]=1;syncFilter();renderRows();return}
    if(b=t.closest('[data-pt]')){var q=b.dataset.pt;if(F.pt[q])delete F.pt[q];else F.pt[q]=1;syncFilter();renderRows();return}
    if(b=t.closest('[data-np]')){var n=b.dataset.np;if(F.np[n])delete F.np[n];else F.np[n]=1;syncFilter();renderRows();return}
    if(b=t.closest('[data-cm]')){F.cm=b.dataset.cm;syncFilter();renderRows();return}
    if(b=t.closest('.cgrid button')){
      var c={r:b.dataset.r,s:b.dataset.s},i2=-1;F.cards.forEach(function(x,i){if(x.r===c.r&&x.s===c.s)i2=i});
      if(i2>=0)F.cards.splice(i2,1);else{F.cards.push(c);if(F.cards.length>2)F.cards.shift()}
      syncFilter();renderRows();return}
    if(b=t.closest('[data-sort]')){var s=b.dataset.sort;
      if(F.sort===s)F.dir=-F.dir;else{F.sort=s;F.dir=s==='no'?1:-1}
      renderRows();return}
    if(b=t.closest('[data-act]')){var a=b.dataset.act;
      if(a==='more'){F.more=F.more?0:1;syncFilter()}
      else if(a==='cards'){F.cp=F.cp?0:1;syncFilter()}
      else if(a==='cdone'){F.cp=0;syncFilter()}
      else if(a==='cclear'){F.cards=[];syncFilter();renderRows()}
      else if(a==='reset'){F.big=0;F.res='';F.err=0;F.sd=0;F.wp=0;F.pos={};F.pt={};F.np={};F.cards=[];syncFilter();renderRows()}
      else if(a==='seatfilter'){F.pos={};F.pos[seatSel]=1;F.more=1;syncFilter();renderRows();$('list').scrollIntoView({behavior:'smooth',block:'start'})}
      return}
    if(b=t.closest('[data-seat]')){var k2=b.dataset.seat;seatSel=seatSel===k2?null:k2;drawTable();if(seatSel)$('tdetail').scrollIntoView({behavior:'smooth',block:'nearest'});return}
  }
  if(b=t.closest('input[data-ck]')){updatePick();return}
});
document.addEventListener('toggle',function(ev){
  var d=ev.target;if(!d||!d.id)return;
  if(d.id==='infodet'){infoOpen=d.open;if(d.open)drawInfo()}
  if(d.id==='tbdet'){try{localStorage.setItem('pp_tb',d.open?'1':'0')}catch(_){}}},true);
function onNav(){route(false).catch(function(e){app.innerHTML='<p class="mute">資料載入失敗：'+esc(e.message)+'。請重新整理。</p>'})}
window.addEventListener('hashchange',onNav);
window.addEventListener('popstate',function(){setTimeout(onNav,0)});
PPH.start=function(){onNav()};
})();
