(function(){
  var dlg=document.getElementById('hv'),box=document.getElementById('hvbody'),cnt=document.getElementById('hvcnt');
  var prev=document.getElementById('hvprev'),next=document.getElementById('hvnext');
  var cur=-1,unit='usd',BB=0.05;
  try{if(localStorage.getItem('unit')==='bb')unit='bb'}catch(_){}
  function conv(root){
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n,list=[];
    while(n=w.nextNode()){if(n.parentNode&&(/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName)||(n.parentNode.closest&&n.parentNode.closest('.noconv'))))continue;list.push(n)}
    list.forEach(function(n){
      if(n.__o===undefined){if(n.nodeValue.indexOf('$')<0)return;n.__o=n.nodeValue}
      n.nodeValue=unit==='usd'?n.__o:n.__o.replace(/\$(\d+(?:\.\d+)?)/g,function(_,x){var v=Math.round(parseFloat(x)/BB*10)/10;return v+' BB'});
    });
  }
  var RK='AKQJT98765432';
  function acol(a,acts){var k=a.split('(')[0];if(k==='Fold')return'var(--fo)';if(k==='Check'||k==='Call')return'var(--ck)';if(k==='AllIn')return'var(--ai)';
    var bs=acts.filter(function(x){return /^(Bet|Raise)/.test(x)}),i=bs.indexOf(a);return['var(--b1)','var(--b2)','var(--b3)'][Math.min(2,Math.round(i*2/Math.max(1,bs.length-1)))]||'var(--b1)'}
  function cellOf(h){var r1=RK.indexOf(h[0]),r2=RK.indexOf(h[2]);var hi=Math.min(r1,r2),lo=Math.max(r1,r2);
    if(r1===r2)return[hi,hi,RK[hi]+RK[hi]];if(h[1]===h[3])return[hi,lo,RK[hi]+RK[lo]+'s'];return[lo,hi,RK[hi]+RK[lo]+'o']}
  function possible(i,j,board){var S='cdhs',n=0,bd=[];for(var k=0;k<board.length;k+=2)bd.push(board.substr(k,2));
    for(var a=0;a<4;a++)for(var b=0;b<4;b++){var c1=RK[Math.min(i,j)]+S[a],c2=RK[Math.max(i,j)]+S[b];
      if(i===j&&b<=a)continue;if(i<j&&a!==b)continue;if(i>j&&a===b)continue;if(bd.indexOf(c1)<0&&bd.indexOf(c2)<0)n++}return n}
  function money2(c){return(c<0?'−':'')+'$'+(Math.abs(c)/100).toFixed(2)}
  function drawRange(w){
    var D=JSON.parse(w.dataset.g),A=D.a,L=D.l,cols=A.map(function(a){return acol(a,A)});
    var cells={},tot=0,ta=A.map(function(){return 0});
    D.g.forEach(function(x){var c=cellOf(x[0]),k=c[0]+','+c[1];(cells[k]=cells[k]||{n:c[2],i:c[0],j:c[1],c:0,s:A.map(function(){return 0}),l:[]});
      var C=cells[k];C.c+=x[1];x[2].forEach(function(p,ai){C.s[ai]+=x[1]*p/100;ta[ai]+=x[1]*p/100});C.l.push(x);tot+=x[1]});
    var hc=cellOf(D.h),h=[];
    h.push('<div class="rgsum">');A.forEach(function(a,ai){h.push('<div style="background:'+cols[ai]+'"><b>'+L[ai]+'</b><i>'+(tot?(ta[ai]/tot*100).toFixed(1):'0')+'%</i><small>'+ta[ai].toFixed(1)+' 組</small></div>')});
    h.push('</div><div class="rgbar">');A.forEach(function(a,ai){h.push('<span style="flex:'+ta[ai]+';background:'+cols[ai]+'"></span>')});h.push('</div><div class="rgg">');
    for(var i=0;i<13;i++)for(var j=0;j<13;j++){var C=cells[i+','+j],nm=i===j?RK[i]+RK[i]:i<j?RK[i]+RK[j]+'s':RK[j]+RK[i]+'o';
      var me=(hc[0]===i&&hc[1]===j)?' me':'';
      if(!C||C.c<0.005){h.push('<button class="rgc no'+me+'" disabled><em>'+nm+'</em></button>');continue}
      var pos=possible(i,j,D.b)||1,ht=Math.min(100,C.c/pos*100),f='';
      A.forEach(function(a,ai){if(C.s[ai]>0)f+='<span style="flex:'+C.s[ai]+';background:'+cols[ai]+'"></span>'});
      h.push('<button class="rgc'+me+'" data-k="'+i+','+j+'" aria-label="'+nm+'"><span class="f" style="height:'+ht+'%">'+f+'</span><em>'+nm+'</em></button>')}
    h.push('</div><div class="rgdet" aria-live="polite"></div><div class="rgnote">格子高度＝這種牌還剩多少組合走到這裡，顏色＝各動作比例。黃框是你的牌，點格子看各花色。</div>');
    w.innerHTML=h.join('');
    var det=w.querySelector('.rgdet');
    function showCell(k,btn){[].forEach.call(w.querySelectorAll('.rgc.sel'),function(x){x.classList.remove('sel')});if(btn)btn.classList.add('sel');
      var C=cells[k];if(!C){det.innerHTML='';return}
      det.innerHTML=C.l.map(function(x){var bar=x[2].map(function(p,ai){return'<span style="flex:'+p+';background:'+cols[ai]+'"></span>'}).join('');
        var rows=A.map(function(a,ai){return'<tr><td>'+L[ai]+'</td><td>'+x[2][ai]+'%</td><td>'+(x[3]?money2(x[3][ai]):'')+'</td></tr>'}).join('');
        return'<div><div class="hb">'+bar+'</div><div class="hd">'+x[0].replace(/([2-9TJQKA])([cdhs])/g,function(_,r,s){return r+{c:'♣',d:'♦',h:'♥',s:'♠'}[s]})+(x[1]<0.99?' <small>（剩 '+Math.round(x[1]*100)+'%）</small>':'')+'</div><table>'+rows+'</table></div>'}).join('');
      conv(det)}
    w.addEventListener('click',function(ev){var b=ev.target.closest('.rgc[data-k]');if(b)showCell(b.dataset.k,b)});
    var k0=hc[0]+','+hc[1];if(cells[k0])showCell(k0,w.querySelector('[data-k="'+k0+'"]'));
  }
  document.addEventListener('toggle',function(ev){var d=ev.target;if(d.classList&&d.classList.contains('rg')&&d.open){var w=d.querySelector('.rgw');if(w&&!w.firstChild)drawRange(w)}},true);
  function setUnit(u){
    unit=u;try{localStorage.setItem('unit',u)}catch(_){}
    [].forEach.call(document.querySelectorAll('.chip.u'),function(x){x.setAttribute('aria-pressed',x.dataset.u===u?'true':'false')});
    document.getElementById('hvunit').textContent=u==='usd'?'改看 BB':'改看 $';
    conv(document.body);
  }
  function visible(){var v=PPH.order();return v&&v.length?v:PPH.all()}
  var PTO=['SB','BB','UTG','UTG1','MP','HJ','CO','BTN'],PTS={s:'♠',h:'♥',d:'♦',c:'♣'};
  var PTA={Fold:'棄牌',Check:'過牌',Call:'跟注',Bet:'下注',Raise:'加注到','All-in':'全下'};
  function ptCard(c){return c?'<span class="pc '+c[1]+'">'+(c[0]==='T'?'10':c[0])+PTS[c[1]]+'</span>':'<span class="pc bk"></span>'}
  function ptCards(s){var o='';for(var i=0;i<s.length;i+=2)o+=ptCard(s.substr(i,2));return o}
  function ptM(x){return '$'+(Math.round(x*100)/100).toFixed(2)}
  function ptSteps(D){
    var st={},out=[],folded={},board='',collected=D.base,com={},lastStreet=-1;
    D.pl.forEach(function(p){st[p.pos]=p.st-D.ante;if(p.pa){com[p.pos]=p.pa;st[p.pos]-=p.pa}});
    function snap(txt,actor,si,fin){var c={};for(var k in com)c[k]=com[k];var s={};for(var k2 in st)s[k2]=Math.max(0,st[k2]);var f={};for(var k3 in folded)f[k3]=1;
      var pot=collected;for(var k4 in com)pot+=com[k4];out.push({t:txt,a:actor,b:board,c:c,s:s,f:f,pot:pot,si:si,fin:fin})}
    snap('發牌',null,0);
    D.s.forEach(function(S,si){
      if(si>0){for(var k in com)collected+=com[k];com={};board+=S.c;collected=S.p;snap(S.n+' '+(S.c?'':''),null,si)}
      S.a.forEach(function(x){
        var prev=com[x.pos]||0;
        if(x.a==='Fold')folded[x.pos]=1;
        else if(x.m!=null){if(x.a==='Call'||x.a==='All-in'){com[x.pos]=prev+x.m;st[x.pos]-=x.m}else{com[x.pos]=x.m;st[x.pos]-=x.m-prev}}
        var who=x.pos===D.hero?'你':(D.pl.filter(function(p){return p.pos===x.pos})[0]||{}).lab||x.pos;
        snap(who+' '+(PTA[x.a]||x.a)+(x.m!=null?' '+ptM(x.m):''),x.pos,si)});
    });
    var s2={};D.pl.forEach(function(p){s2[p.pos]=p.st+p.net});
    var fin={t:'結果',a:null,b:board,c:{},s:s2,f:out[out.length-1].f,pot:0,si:D.s.length-1,fin:true};out.push(fin);
    return out}
  function ptInit(root){
    var host=root.querySelector('.ptbl');if(!host)return;var D=JSON.parse(host.querySelector('.ptd').textContent);
    var steps=ptSteps(D),i=steps.length-1,sel=null,hi=PTO.indexOf(D.hero);
    function xy(pos,r){var k=((PTO.indexOf(pos)-hi)%8+8)%8,ang=(90+k*45)*Math.PI/180;return[50+r*40*Math.cos(ang),50+r*44*Math.sin(ang)]}
    function draw(){
      var S=steps[i],h=['<div class="pt-wrap"><div class="pt-felt"></div>'];
      var btn=D.pl.filter(function(p){return p.pos==='BTN'})[0];
      h.push('<div class="pt-mid"><div class="stn">'+(S.fin?'結果':D.s[S.si].n)+'</div><div class="bd">'+ptCards(S.b)+'</div>'+(S.fin?'':'<div class="pot">底池 '+ptM(S.pot)+'</div>')+'<div class="now">'+(i===0||S.fin?'':S.t)+'</div></div>');
      D.pl.forEach(function(p){var q=xy(p.pos,1),cls='pt-seat'+(p.me?' me':'')+(S.f[p.pos]?' fold':'')+(S.a===p.pos?' act':'')+(sel===p.pos?' sel':'');
        var cs=p.me?ptCards(D.cards):(S.fin&&p.show&&!S.f[p.pos]?ptCards(p.show):'');
        var nt=S.fin&&(p.net>=0.05||p.net<=-0.05)?'<span class="n '+(p.net>0?'w':'l')+'">'+(p.net>0?'+':'−')+ptM(Math.abs(p.net)).slice(0)+'</span>':'';
        var kk=((PTO.indexOf(p.pos)-hi)%8+8)%8;h.push('<div class="'+cls+'" data-pos="'+p.pos+'" data-k="'+kk+'" style="left:'+q[0]+'%;top:'+q[1]+'%">'+(cs?'<div class="cs">'+cs+'</div>':'')+'<b>'+p.lab+'</b>'+(p.me?' 你':'')+'<span class="s">'+ptM(S.s[p.pos])+'</span>'+nt+(p.vp&&!p.me?'<span class="v">'+p.vp[0]+'/'+p.vp[1]+'</span>':(p.me&&p.vp?'<span class="v">'+p.vp[0]+'/'+p.vp[1]+'</span>':''))+(p.pos==='BTN'?'<span class="pt-btn">D</span>':'')+'</div>');
        var c=S.c[p.pos];if(c){var b=xy(p.pos,p.pos==='BTN'?.5:.6);h.push('<span class="pt-bet" style="left:'+b[0]+'%;top:'+b[1]+'%">'+ptM(c)+'</span>')}});
      h.push('</div><div class="pt-ctl"><button data-g="0" aria-label="回到開頭">⏮</button><button data-g="-1" aria-label="上一步">‹</button><span class="cnt">'+(i+1)+' / '+steps.length+'</span><button data-g="1" aria-label="下一步">›</button><button data-g="9" aria-label="跳到結果">⏭</button></div><div class="pt-det"></div>');
      host.querySelectorAll('.pt-wrap,.pt-ctl,.pt-det').forEach(function(x){x.remove()});
      host.insertAdjacentHTML('beforeend',h.join(''));
      function lay(){host.querySelectorAll('.pt-seat').forEach(function(se){
        var an=(90+(+se.dataset.k)*45)*Math.PI/180,dx=-Math.cos(an),dy=-Math.sin(an);
        if(Math.abs(dx)<1e-6)dx=0;if(Math.abs(dy)<1e-6)dy=0;
        function ext(w,h){return Math.min(dx?w/2/Math.abs(dx):1e9,dy?h/2/Math.abs(dy):1e9)}
        var W=se.offsetWidth,H=se.offsetHeight,d=ext(W,H)+2;
        se.querySelectorAll('.pt-btn').forEach(function(el){var e2=ext(el.offsetWidth,el.offsetHeight);d+=e2;
          el.style.left=(W/2+dx*d)+'px';el.style.top=(H/2+dy*d)+'px';d+=e2+2})})}
      lay();requestAnimationFrame(lay);
      var det=host.querySelector('.pt-det');
      if(sel){var p=D.pl.filter(function(x){return x.pos===sel})[0];det.innerHTML='<b>'+p.lab+'</b> '+p.nm+'　起始 '+ptM(p.st)+(p.post?'　'+({SB:'小盲',BB:'大盲',STR:'強抓'}[p.post]||p.post)+' '+ptM(p.pa):'')+'<br>'+(p.d||'沒有數據')}
      host.querySelectorAll('.pt-ctl button').forEach(function(b){var g=+b.dataset.g;b.disabled=(g<=0&&i===0)||(g>=1&&i===steps.length-1)});
      conv(host)}
    host.addEventListener('click',function(ev){var b=ev.target.closest('.pt-ctl button');
      if(b){var g=+b.dataset.g;i=g===0?0:g===9?steps.length-1:Math.max(0,Math.min(steps.length-1,i+g));draw();return}
      var s=ev.target.closest('.pt-seat');if(s){sel=sel===s.dataset.pos?null:s.dataset.pos;draw()}});
    draw()}
  function show(no){
    var t=PPH.tpl(no);if(!t){PPH.ensure(no,function(){show(no)});return}
    var list=visible();if(list.indexOf(String(no))<0)list=PPH.all(no);
    cur=list.indexOf(String(no));
    box.replaceChildren(t.content.cloneNode(true));box.scrollTop=0;conv(box);ptInit(box);
    cnt.textContent=(cur+1)+' / '+list.length;cnt.dataset.no=no;navState(no);
    prev.disabled=cur<=0;next.disabled=cur>=list.length-1;
    prev.onclick=function(){if(cur>0)show(list[cur-1])};
    next.onclick=function(){if(cur<list.length-1)show(list[cur+1])};
    if(!dlg.open){if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','')}
  }
  document.addEventListener('click',function(ev){
    var a=ev.target.closest&&ev.target.closest('[data-h]');
    if(a){ev.preventDefault();show(a.dataset.h);return}
    var uu=ev.target.closest&&ev.target.closest('.chip.u');
    if(uu){setUnit(uu.dataset.u);return}
  });
  document.getElementById('hvunit').onclick=function(){setUnit(unit==='usd'?'bb':'usd')};
  setUnit(unit);
  document.getElementById('hvclose').onclick=function(){closeHv()};
  dlg.addEventListener('click',function(ev){if(ev.target===dlg)closeHv()});
  var tx=0,ty=0,tok=false,edge=false,dragging=false,lastX=0,lastY=0;
  function resetDrag(anim){dlg.style.transition=anim?'transform .18s ease-out,opacity .18s':'';dlg.style.transform='';dlg.style.opacity=''}
  dlg.addEventListener('touchstart',function(ev){if(ev.touches.length>1){tok=false;edge=false;return}var t=ev.touches[0];tx=lastX=t.clientX;ty=lastY=t.clientY;dragging=false;edge=standalone&&tx<=28;tok=!(ev.target.closest&&ev.target.closest('.seats,.ptbl,.rgg,.rgdet,pre'))},{passive:true});
  dlg.addEventListener('touchmove',function(ev){var t=ev.touches[0];lastX=t.clientX;lastY=t.clientY;if(!tok||edge)return;var dx=lastX-tx,dy=lastY-ty;
    if(!dragging&&dx<-12&&Math.abs(dx)>Math.abs(dy))dragging=true;
    if(dragging){var d=Math.min(0,dx);dlg.style.transition='none';dlg.style.transform='translateX('+d+'px)';dlg.style.opacity=String(Math.max(.4,1+d/600))}},{passive:true});
  function endTouch(ev){var t=ev.changedTouches&&ev.changedTouches[0],x=t?t.clientX:lastX,y=t?t.clientY:lastY,dx=x-tx,dy=y-ty;
    if(edge){edge=false;if(dx>60&&Math.abs(dx)>1.5*Math.abs(dy))closeHv();return}
    if(tok&&(dragging||Math.abs(dx)>Math.abs(dy))&&dx<-60&&Math.abs(dx)>1.2*Math.abs(dy)){resetDrag(false);closeHv()}else if(dragging)resetDrag(true);dragging=false}
  dlg.addEventListener('touchend',endTouch,{passive:true});
  dlg.addEventListener('touchcancel',function(ev){if(dragging&&lastX-tx<-60){resetDrag(false);closeHv()}else resetDrag(true);dragging=false},{passive:true});
  dlg.addEventListener('keydown',function(ev){if(ev.key==='ArrowLeft')prev.click();if(ev.key==='ArrowRight')next.click()});
    var shared=false,closeBtn=document.getElementById('hvclose'),toastT=0;
  function toast(html,ms){var t=document.getElementById('hvtoast');if(!t){t=document.createElement('div');t.id='hvtoast';t.setAttribute('role','status');dlg.appendChild(t)}
    t.innerHTML=html;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},ms||2200);return t}
  function setHash(h){try{history.replaceState(null,'',h||PPH.url(null))}catch(_){}}
  function navState(no){var u=PPH.url(no);try{if(backing){pendingNo=no;return}if(history.state&&history.state.hv)history.replaceState({hv:1},'',u);else history.pushState({hv:1},'',u)}catch(_){}}
  var standalone=!!(navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches));
  document.getElementById('hvcopy').onclick=function(){
    var sc=box.querySelector('.cptxt');if(!sc)return;var txt=JSON.parse(sc.textContent);
    function manual(){var t=toast('長按全選複製：<br><textarea readonly rows="8" style="width:min(80vw,460px);font:inherit;margin-top:6px"></textarea>',15000);var a=t.querySelector('textarea');a.value=txt;a.focus();a.select()}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast('已複製這手的文字，貼上後補你的想法')},manual)}else manual();
  };
  document.getElementById('hvshare').onclick=function(){
    var no=(cnt.dataset.no||''),url=PPH.shareUrl(no);
    function manual(){var t=toast('複製這個連結傳給朋友：<br><input readonly value="'+url+'">',9000);var i=t.querySelector('input');i.focus();i.select()}
    function copy(){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(function(){toast('已複製這手的連結，貼給朋友就好')},manual)}else manual()}
    if(navigator.share){navigator.share({title:'#'+no+' 這手牌',url:url}).catch(function(e){if(!e||e.name!=='AbortError')copy()})}else copy();
  };
  var backing=false,pendingNo=null;window.addEventListener('popstate',function(){var n=pendingNo;backing=false;pendingNo=null;if(n){try{history.pushState({hv:1},'',PPH.url(n))}catch(_){}}});
  function afterClose(nav){if(nav){if(history.state&&history.state.hv&&!backing){backing=true;try{history.back()}catch(_){}}else if(!backing)setHash('')}if(shared){shared=false;closeBtn.textContent='✕ 關閉';window.scrollTo(0,0)}}
  function closeHv(){if(!dlg.open)return;dlg.close();afterClose(true)}
  dlg.addEventListener('cancel',function(ev){ev.preventDefault();closeHv()});
  window.addEventListener('popstate',function(){if(pendingNo)return;var hh=PPH.curH();if(hh){if(!dlg.open||cnt.dataset.no!==hh)show(hh)}else if(dlg.open){dlg.close();afterClose(false)}});
  PPH.openShared=function(no){shared=true;closeBtn.textContent='☰ 全部';setHash('');show(no);return true};
  PPH.open=function(no){if(!dlg.open||cnt.dataset.no!==String(no))show(no);return true};
  PPH.close=function(){if(dlg.open){dlg.close();afterClose(false)}};
  PPH.conv=conv;
  PPH.isOpen=function(){return dlg.open};
  PPH.setUnit=setUnit;
})();
