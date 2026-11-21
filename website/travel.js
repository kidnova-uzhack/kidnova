// Travelling robot. On scroll the robot leaves its hero card and makes its way through the page:
//   · flies out of the card and parks beside each section, turning its head toward the pointer
//   · spins with arms out when it crosses to the next section, waves when it lands and says a line
//   · rides the orbit ring in the solution section, and stands on the active roadmap tab
//   · hops along the workflow timeline, one step at a time, as the stages fill
//   · dives into the demo screen and climbs back out afterwards
//   · leans and swings its arms with scroll speed; waves goodbye at the contact section
//   · perks up when the pointer reaches it, and does a spin-jump when clicked (in the hero card too)
//   · optional sounds, off until switched on with the speaker button in the header
// It is the hero robot's own renderer drawing into a small fixed canvas (never both at once).
(()=>{
  const api=window.__kidnovaRobot,stage=document.querySelector('.robot-stage');
  if(!api||!stage||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const wide=matchMedia('(min-width:1051px)'),root=document.documentElement;
  const FACE_RIGHT=.6,FACE_LEFT=-.6,TAU=Math.PI*2;
  const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>t*t*(3-2*t);

  // ── what the robot says (one line per section, plus a few for clicks)
  const LINES={
    en:{about:'Hi! I’m the KidNova robot. Scroll on and I’ll come along.',vision:'This is where we’re heading.',problem:'These are the gaps we want to close.',
      solution:'Watch: everything connects around one profile.',mvp:'This is what already works today.',future:'Smart Nutrition: a working calculator MVP with approximate data.',roadmap:'Three stages. We’re on the first.',
      compare:'Integration is the idea being tested.',business:'Prices aren’t validated yet.',technician:'Local technicians would keep stations running.',
      technology:'The software exists. The hardware is still proposed.',trust:'Staff stay in charge. I don’t diagnose.',market:'We start small, in Fergana.',
      research:'Early signals, not proof yet.',impact:'We’ll measure before we claim.',team:'Meet the team.',contact:'Thanks for visiting! Let’s talk.',
      click:['Hi! 👋','That tickles!','Keep scrolling, I’ll follow.','Try the live demo!'],drag:['Whee!','Where are we going?']},
    uz:{about:'Salom! Men KidNova robotiman. Pastga suring, men ham siz bilan boraman.',vision:'Biz shu tomonga intilyapmiz.',problem:'Biz ana shu bo‘shliqlarni to‘ldirmoqchimiz.',
      solution:'Qarang: hammasi bitta profil atrofida bog‘lanadi.',mvp:'Bugun allaqachon ishlayotgan qismlar shular.',future:'Smart Nutrition: taxminiy ma’lumotli ishlaydigan kalkulyator MVP.',roadmap:'Uch bosqich. Hozir birinchisidamiz.',
      compare:'Sinovdan o‘tkazilayotgan g‘oya: integratsiya.',business:'Narxlar hali tasdiqlanmagan.',technician:'Mahalliy texniklar stansiyalarni ishchi holatda saqlaydi.',
      technology:'Dasturiy qism mavjud. Qurilma hali taklif bosqichida.',trust:'Qarorni xodimlar qabul qiladi. Men tashxis qo‘ymayman.',market:'Kichikdan boshlaymiz: Farg‘onadan.',
      research:'Bular dastlabki belgilar, hali isbot emas.',impact:'Avval o‘lchaymiz, keyin da’vo qilamiz.',team:'Jamoa bilan tanishing.',contact:'Tashrifingiz uchun rahmat! Keling, gaplashamiz.',
      click:['Salom! 👋','Qitig‘im keldi!','Davom eting, men ortingizdan boraman.','Jonli namoyishni sinab ko‘ring!'],drag:['Voy!','Qayerga ketyapmiz?']}
  };
  const lines=()=>LINES[root.lang]||(root.lang==='ru'&&window.KIDNOVA_RU?.robotLines)||LINES.en;
  const nameOf=sec=>sec.id||['compare','technician','trust','market','research','impact'].find(c=>sec.classList.contains(c+'-section'))||'';

  // the companion needs a second GPU canvas; without one the robot simply stays in its card
  let buddy=null;
  if(api.gpu){
    buddy=document.createElement('canvas');
    buddy.className='kn-buddy';buddy.setAttribute('aria-hidden','true');
    document.body.append(buddy);
  }
  const bubble=document.createElement('div');
  bubble.className='kn-bubble';bubble.setAttribute('role','status');
  document.body.append(bubble);

  let keys=[],s0=0,s1=0,bw=0,bh=0,xL=0,xR=0,yDock=0,active=false,cur=null;
  let px=null,py=null,lastS=scrollY,lastT=0,vel=0,headYaw=0,headPitch=0,parkedAt=-1,waveUntil=0,hover=false,downAt=null;
  let sayUntil=0,clickLine=0,tabX=null,lastStep=-1,wasHidden=false;
  const seen=new Set(),steps=[...document.querySelectorAll('.workflow-step')];

  // ── sound: tiny synthesised chirps, nothing to download; silent until the visitor switches it on
  let audio=null,soundOn=false,lastSfx=0;
  function tone(freq,at,dur,vol,to){
    const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+at;
    o.type='sine';o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(audio.destination);o.start(t);o.stop(t+dur+.02);
  }
  function sfx(kind){
    if(!soundOn||!audio)return;
    const now=performance.now();if(kind!=='click'&&now-lastSfx<220)return;lastSfx=now;
    if(kind==='click'){tone(660,0,.09,.07);tone(990,.07,.09,.07);tone(1320,.14,.16,.06)}
    else if(kind==='land'){tone(740,0,.07,.035);tone(988,.08,.1,.035)}
    else if(kind==='hop')tone(880,0,.05,.03,1100);
    else if(kind==='dive')tone(900,0,.28,.04,220);
    else if(kind==='rise')tone(240,0,.26,.04,880);
  }
  const toggle=document.getElementById('languageToggle');
  if(toggle){
    const sb=document.createElement('button');
    sb.type='button';sb.id='soundToggle';sb.className='sound-toggle';sb.setAttribute('aria-pressed','false');
    sb.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="on" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="off" d="m16 9.5 5 5m0-5-5 5"/></svg>';
    const label=()=>{const t=soundOn?window.kidnovaT('Turn robot sounds off','Robot ovozini o‘chirish','Выключить звуки робота'):window.kidnovaT('Turn robot sounds on','Robot ovozini yoqish','Включить звуки робота');sb.setAttribute('aria-label',t);sb.title=t};
    sb.addEventListener('click',()=>{
      soundOn=!soundOn;sb.setAttribute('aria-pressed',String(soundOn));label();
      if(soundOn){audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume();sfx('click')}
    });
    document.addEventListener('kidnova:language',label);
    label();toggle.after(sb);
  }

  // ── speech bubble
  function say(text,ms=4300){if(!text)return;bubble.textContent=text;bubble.classList.add('on');sayUntil=performance.now()+ms}
  const hush=()=>{bubble.classList.remove('on');sayUntil=0};
  document.addEventListener('kidnova:language',hush);

  // ── places the robot can be: {x,y} is its centre in the viewport, k its size, f the way it faces
  const dock=(side,k=1)=>({x:(side?xR:xL)+bw/2,y:yDock+bh/2-(k-1)*bh*.3,k,f:side?FACE_LEFT:FACE_RIGHT});
  const mix=(A,B,w)=>({x:lerp(A.x,B.x,w),y:lerp(A.y,B.y,w),k:lerp(A.k,B.k,w),f:lerp(A.f,B.f,w),fly:(B.fly||0)*w,point:!!B.point&&w>.6});
  const inView=(y,band)=>smooth(clamp(1.3-Math.abs(y-innerHeight*.47)/(innerHeight*band),0,1));   // 1 when y is near mid-screen
  function onStep(i){                                   // standing on top of a workflow step
    const el=steps[clamp(i,0,steps.length-1)];if(!el)return dock(0);
    const r=el.getBoundingClientRect(),k=clamp(96/bh,.42,.8);
    return {x:r.left+r.width/2,y:r.top-2-.277*bh*k,k,f:.45};
  }
  function inDemo(){                                    // shrunk into the demo screen's logo
    const el=document.querySelector('.demo-brand .brand-mark')||document.querySelector('.demo-app');
    if(!el)return dock(1,.1);
    const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,k:.1,f:0};
  }
  function onOrbit(side){                               // riding the solution map's ring, between two of its cards
    const d=dock(side),shell=document.querySelector('.solution-shell'),n1=shell&&shell.querySelector('.solution-node.n1');
    if(!n1||!n1.style.transform)return d;               // the ring only turns on desktop with motion on
    const s=shell.getBoundingClientRect(),n=n1.getBoundingClientRect();
    const cx=s.left+s.width/2,cy=s.top+s.height/2,rx=s.width*.375,ry=s.height*.36;
    const a=Math.atan2((n.top+n.height/2-cy)/ry,(n.left+n.width/2-cx)/rx)+Math.PI/6,k=clamp(104/bh,.45,.8);
    return mix(d,{x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry-.1*bh*k,k,f:-Math.sin(a)*.6,fly:.45},inView(cy,.4));
  }
  function onTab(side){                                 // standing in the active roadmap tab; hops when the tab changes
    const d=dock(side),tab=document.querySelector('.roadmap-tabs button.active');
    if(!tab)return d;
    const r=tab.getBoundingClientRect(),k=clamp(r.height*1.05/(.7*bh),.3,.7),tx=r.right-.27*bw*k-12;
    if(tabX===null||Math.abs(tabX-tx)>root.clientWidth)tabX=tx;
    const dx=tx-tabX;tabX+=dx*.14;
    return mix(d,{x:tabX,y:r.bottom-5-.277*bh*k-Math.min(1,Math.abs(dx)/160)*26,k,f:-.35,point:true},inView(r.top+r.height/2,.42));
  }

  // ── where along the scroll each place applies
  function build(){
    if(!buddy)return;
    const vw=root.clientWidth,vh=innerHeight,y=scrollY;
    bw=clamp(vw*.1,110,170);bh=bw*1.13;
    buddy.style.width=bw+'px';buddy.style.height=bh+'px';
    const box=document.querySelector('main .container')||document.body;
    xL=Math.max(4,(vw-box.clientWidth)/2-bw-8);xR=vw-bw-xL;yDock=vh-bh-14;

    const sr=stage.getBoundingClientRect();
    s0=Math.max(0,sr.top+y+sr.height/2-vh*.4);          // the robot starts to leave its card here…
    s1=s0+vh*.55;                                         // …and has reached the side by here

    const secs=[...document.querySelectorAll('main section')].filter(s=>!s.classList.contains('hero'));
    const side=1;                                         // the robot keeps to the right-hand side; it only leaves it for its tricks
    keys=[{y:s1,at:()=>dock(1),o:1,sec:0,name:secs[0]?nameOf(secs[0]):'',plain:true}];
    secs.forEach((sec,i)=>{
      const r=sec.getBoundingClientRect(),top=r.top+y,h=r.height,last=i===secs.length-1,name=nameOf(sec);
      if(sec.classList.contains('kn-pin')&&steps.length>1){
        keys.push({y:top,at:()=>onStep(0),o:1,sec:i,walk:true},{y:top+h-vh,at:()=>onStep(steps.length-1),o:1,sec:i});
      }else if(sec.id==='demo'){
        keys.push({y:top+h*.2-vh/2,at:inDemo,o:0,sec:i},{y:top+h*.8-vh/2,at:inDemo,o:0,sec:i});
      }else{
        const at=name==='solution'?()=>onOrbit(side):name==='roadmap'?()=>onTab(side):()=>dock(side,last?1.25:1);
        const plain=!last&&name!=='solution'&&name!=='roadmap';   // ordinary sections: the robot is free to wander
        keys.push({y:top+h*.14-vh/2,at,o:1,sec:i,name,wave:last,plain},{y:top+h*.86-vh/2,at,o:1,sec:i,name,wave:last,plain});
      }
    });
    for(let i=1;i<keys.length;i++)keys[i].y=Math.max(keys[i].y,keys[i-1].y+1);
    if(active)api.resize();
  }

  function setActive(on){
    if(on===active)return;active=on;
    stage.classList.toggle('kn-robot-out',on);
    buddy.classList.toggle('on',on);
    if(on){api.use(buddy);roam.next=performance.now()+4000}else{api.yaw=null;api.pose=null;api.asleep=false;api.use(api.hero);parkedAt=-1;cur=null;hush();roam.kind='base';roam.from=null;endDrag()}
  }

  // ── wandering: in ordinary sections the robot leaves its corner now and then for a random seat
  //    on top of a card that is on screen, and can be picked up and dropped anywhere
  const PERCH='.about-card,.vision-card,.problem-card,.status-column,.comparison-wrap,.customer-list,.revenue-list,.business-core,.recurring-note,.arch-layer,.trust-grid article,.market-cards article,.expansion-path>div,.team-placeholder,.evidence-list,.impact-metrics,.network-node,.network-center,.values-row';
  const roam={kind:'base',el:null,fx:.5,spot:null,from:null,t0:0,dur:1,next:0,landed:true};
  let drag=null,justDragged=false,curYaw=0;
  function perch(){
    const r=roam.el.getBoundingClientRect(),k=clamp(100/bh,.42,.8),x=r.left+r.width*roam.fx;
    return {x,y:r.top+3-.277*bh*k,k,f:x<root.clientWidth/2?.4:-.4};
  }
  const seatOk=r=>r.width>90&&r.top>200&&r.top<innerHeight-70&&r.left>=0&&r.right<=root.clientWidth;
  function pickSeat(){
    const c=[...document.querySelectorAll(PERCH)].filter(e=>e!==roam.el&&seatOk(e.getBoundingClientRect()));
    if(!c.length)return false;
    const el=c[Math.floor(Math.random()*c.length)],w=el.getBoundingClientRect().width,pad=Math.min(44,w*.22);
    roam.el=el;roam.fx=(pad+Math.random()*(w-2*pad))/w;return true;
  }
  function go(kind,now,dur){
    roam.from=cur?{x:cur.cx,y:cur.cy,k:cur.k,yaw:curYaw}:null;
    roam.kind=kind;roam.t0=now;roam.dur=dur;roam.landed=false;
  }
  function endDrag(){if(!drag)return;drag=null;root.classList.remove('kn-robot-drag')}

  // ── the travelling companion: position, facing and pose for the current scroll position
  function travel(s,now){
    let cx,cy,k=1,o=1,yaw=0,lean=0,fly=0,parked=-1,wave=false,name='',point=false,free=false;
    if(s<s1){
      // leaving the hero card: from where the robot sits in the card to the side of the page
      const t=smooth((s-s0)/(s1-s0)),r=stage.getBoundingClientRect(),d=dock(1);
      cx=lerp(r.left+r.width/2,d.x,t);cy=lerp(r.top+r.height/2,d.y,t)-Math.sin(Math.PI*t)*30;
      k=lerp(Math.min(r.width/390,r.height/440)/Math.min(bw/390,bh/440),1,t);
      const h=api.heroYaw,near=d.f+Math.atan2(Math.sin(h-d.f),Math.cos(h-d.f));
      yaw=lerp(near,d.f,t);fly=Math.sin(Math.PI*t)*.7;lean=-Math.sin(Math.PI*t)*6;
    }else{
      let i=keys.length-1;
      for(let n=1;n<keys.length;n++){if(s<keys[n].y){i=n-1;break}}
      const a=keys[i],b=keys[Math.min(i+1,keys.length-1)],raw=b===a?0:clamp((s-a.y)/(b.y-a.y),0,1);
      if(a.walk){
        // hop from one workflow step to the next as the line fills
        const n=steps.length-1,pos=raw*n,j=Math.min(n-1,Math.floor(pos)),f=pos-j,A=onStep(j),B=onStep(j+1),hop=Math.sin(Math.PI*f);
        cx=lerp(A.x,B.x,smooth(f));cy=lerp(A.y,B.y,f)-hop*34;k=A.k;
        yaw=A.f;fly=hop*.8;lean=hop*7;
        const at=Math.round(pos);if(at!==lastStep){if(lastStep>=0)sfx('hop');lastStep=at}
      }else{
        const A=a.at(),B=b.at===a.at?A:b.at(),t=smooth(raw),crossing=a.sec!==b.sec&&raw>0&&raw<1;
        cx=lerp(A.x,B.x,t);cy=lerp(A.y,B.y,t);k=lerp(A.k,B.k,t);
        o=a.o===b.o?a.o:(b.o<a.o?1-raw*raw*raw:1-Math.pow(1-raw,3));   // fade late when diving in, early when climbing out
        yaw=lerp(A.f,B.f,t);
        if(crossing){
          const dir=B.x>=A.x?1:-1,arc=Math.sin(Math.PI*t);
          if(Math.hypot(B.x-A.x,B.y-A.y)>60){
            cy-=arc*56;yaw+=dir*TAU*t;fly=arc;lean=arc*dir*9;           // really going somewhere: one spin, arms out
          }else{
            // staying put between two ordinary sections: just a small hop, then greet the new section
            const at=raw<.5?a:b;
            cy-=arc*14;fly=arc*.25;parked=at.sec;wave=!!at.wave;name=at.name||'';free=!!at.plain;
          }
        }else{parked=a.sec;wave=!!a.wave;name=a.name||'';fly=A.fly||0;point=!!A.point;free=!!a.plain}
        lastStep=-1;
      }
    }

    if(drag){
      // held by the pointer: dangle from it, swinging with the hand's speed
      const vw=root.clientWidth;
      cx=clamp(px+drag.dx,40,vw-40);cy=clamp(py+drag.dy,120,innerHeight-50);k=drag.k;
      drag.vx=lerp(drag.vx,px-drag.lastX,.25);drag.lastX=px;
      yaw=0;fly=1.1;lean=clamp(-drag.vx*1.8,-30,30);
    }else{
      const bx=cx,by=cy,bk=k,quiet=free&&o>.9;
      if(roam.kind!=='base'&&!quiet)go('base',now,650);                     // a trick is starting: back to the script
      if(quiet&&!hover&&Math.abs(vel)<30&&now>roam.next){                    // time for a change of scene
        if(roam.kind!=='base'&&Math.random()<.25)go('base',now,1100);
        else if(pickSeat())go('perch',now,1100);
        roam.next=now+5200+Math.random()*4500;
      }
      if(roam.kind==='perch'&&(!roam.el.isConnected||!seatOk(roam.el.getBoundingClientRect()))){   // the seat scrolled away
        if(quiet&&pickSeat())go('perch',now,900);else go('base',now,800);
      }
      const T=roam.kind==='perch'?perch():roam.kind==='spot'?roam.spot:null;
      const tx=T?T.x:bx,ty=T?T.y:by,tk=T?T.k:bk,tf=T?T.f:yaw;
      if(roam.from){
        const p=clamp((now-roam.t0)/roam.dur,0,1),e=smooth(p),dir=tx>=roam.from.x?1:-1,dist=Math.hypot(tx-roam.from.x,ty-roam.from.y),arc=Math.sin(Math.PI*e);
        cx=lerp(roam.from.x,tx,e);cy=lerp(roam.from.y,ty,e)-arc*Math.min(90,dist*.22);k=lerp(roam.from.k,tk,e);
        yaw=lerp(roam.from.yaw,tf,e)+(dist>260?dir*TAU*e:0);
        if(p<1){fly=Math.max(fly,arc);lean+=arc*dir*8}
        else{roam.from=null;if(!roam.landed){roam.landed=true;waveUntil=now+900;sfx('land')}}
      }else{cx=tx;cy=ty;k=tk;yaw=tf}
    }
    curYaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));
    cur={cx,cy,k,o};
    const hidden=o<.5;
    if(hidden!==wasHidden){sfx(hidden?'dive':'rise');wasHidden=hidden}

    // landing somewhere new earns a wave, a chirp and (the first time) a line
    if(parked!==parkedAt){
      parkedAt=parked;
      if(parked>=0&&o>.5){waveUntil=now+1500;sfx('land');if(name&&!seen.has(name)&&!point){seen.add(name);say(lines()[name])}}   // no bubble on the roadmap tab: it would cover the heading
      else hush();
    }
    const waving=parked>=0&&(wave||now<waveUntil);

    // head follows the pointer while parked
    let ty=0,tp=0;
    if(parked>=0&&px!==null){ty=clamp(clamp((px-cx)/380,-1,1)*.9-yaw,-.75,.75);tp=-clamp((py-cy)/520,-.3,.3)}
    headYaw=lerp(headYaw,ty,.12);headPitch=lerp(headPitch,tp,.12);

    const swing=clamp(-vel*.02,-.7,.7),raise=fly*1.15;
    api.yaw=yaw;api.asleep=o<.02;
    api.pose={head:[headYaw,headPitch],arms:[point?1.05:raise,point?0:swing,waving?2.35+Math.sin(now*.011)*.38:raise,waving?0:swing]};
    lean+=clamp(vel*.22,-13,13);
    buddy.style.opacity=o.toFixed(3);
    buddy.style.transform=`translate3d(${(cx-bw/2).toFixed(1)}px,${(cy-bh/2).toFixed(1)}px,0) scale(${k.toFixed(3)}) rotate(${lean.toFixed(2)}deg)`;
  }

  // ── where the robot's body is on screen right now (centre and half-sizes), or null if it is hidden
  function body(){
    if(active){
      if(!cur||cur.o<.5)return null;
      const u=Math.min(bw/390,bh/440)*cur.k;
      return {x:cur.cx,y:cur.cy-.03*bh*cur.k-17*u,rx:112*u,ry:158*u};
    }
    const r=stage.getBoundingClientRect();
    if(r.bottom<0||r.top>innerHeight)return null;
    const u=Math.min(r.width/390,r.height/440);
    return {x:r.left+r.width/2,y:r.top+r.height*.47-17*u,rx:112*u,ry:158*u};
  }
  const hit=(x,y)=>{const b=body();return !!b&&((x-b.x)/b.rx)**2+((y-b.y)/b.ry)**2<1};

  function tick(now){
    requestAnimationFrame(tick);
    const s=scrollY,dt=Math.max(1,now-lastT);lastT=now;
    vel=lerp(vel,(s-lastS)/dt*16.7,.2);lastS=s;        // scroll speed in px per frame, smoothed
    if(buddy){
      const on=wide.matches&&s>s0;
      setActive(on);
      if(on)travel(s,now);
    }
    // pointer over the robot: it perks up
    const h=px!==null&&hit(px,py);
    if(h!==hover){hover=h;api.excited=h;root.classList.toggle('kn-robot-hover',h&&active)}

    // keep the speech bubble beside the robot's head
    if(sayUntil){
      const b=body();
      if(!b||now>sayUntil)hush();
      else{
        const w=bubble.offsetWidth,hgt=bubble.offsetHeight,vw=root.clientWidth,right=b.x>vw/2;
        const x=clamp(right?b.x+18-w:b.x-18,8,vw-w-8),y=Math.max(84,b.y-b.ry-hgt-12);
        bubble.classList.toggle('right',right);
        bubble.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      }
    }
  }

  // click on the robot: a spin-jump, a ring burst, a chirp and a few words
  function burst(){
    const b=body();if(!b)return;
    for(const c of ['kn-ping','kn-ping b']){
      const el=document.createElement('span');el.className=c;el.style.cssText=`left:${b.x}px;top:${b.y}px;--s:${(b.ry*1.5).toFixed(0)}px`;
      document.body.append(el);el.addEventListener('animationend',()=>el.remove());
    }
  }
  // press and hold on the travelling robot to carry it; it stays where it is dropped for a while
  addEventListener('pointerdown',e=>{
    downAt=[e.clientX,e.clientY];
    if(!active||!cur||e.button!==0||e.pointerType==='touch'||!hit(e.clientX,e.clientY))return;
    e.preventDefault();                                   // no text selection while carrying
    px=e.clientX;py=e.clientY;
    drag={dx:cur.cx-px,dy:cur.cy-py,k:cur.k,vx:0,lastX:px,moved:false};
    root.classList.add('kn-robot-drag');
  },{capture:true});
  addEventListener('mousedown',e=>{if(drag)e.preventDefault()},{capture:true});
  addEventListener('pointermove',e=>{
    if(!drag||drag.moved||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])<=6)return;
    drag.moved=true;hush();const c=lines().drag;say(c[Math.floor(Math.random()*c.length)],2200);
  },{passive:true});
  const drop=()=>{
    if(!drag)return;
    const moved=drag.moved;endDrag();
    if(!moved||!cur)return;                               // a plain click: the click handler takes it
    const now=performance.now();
    roam.kind='spot';roam.spot={x:cur.cx,y:cur.cy,k:1,f:cur.cx<root.clientWidth/2?FACE_RIGHT:FACE_LEFT};
    roam.from={x:cur.cx,y:cur.cy,k:cur.k,yaw:curYaw};roam.t0=now;roam.dur=380;roam.landed=false;
    roam.next=now+12000;                                  // stays put for a while before wandering again
    justDragged=true;setTimeout(()=>{justDragged=false},60);
  };
  addEventListener('pointerup',drop,{capture:true});
  addEventListener('pointercancel',drop,{capture:true});
  document.addEventListener('click',e=>{
    if(justDragged){e.preventDefault();e.stopPropagation();return}                 // the end of a carry is not a click
    if(!hit(e.clientX,e.clientY))return;
    if(downAt&&Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>6)return;     // that was a drag to rotate, not a click
    if(e.target instanceof Element&&e.target.closest('button,a,.floating-card')&&!active)return;
    if(active){e.preventDefault();e.stopPropagation()}                              // don't also click what is underneath
    api.react();burst();sfx('click');
    const c=lines().click;say(c[clickLine++%c.length],2600);
  },true);

  addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY},{passive:true});
  document.addEventListener('pointerleave',()=>{px=py=null});
  let rebuild=0;
  const relayout=()=>{clearTimeout(rebuild);rebuild=setTimeout(build,120)};
  addEventListener('resize',relayout);
  new ResizeObserver(relayout).observe(document.body);    // page height changes (fonts, pinned section, language)

  build();
  if(buddy){
    if(api.use(buddy))api.use(api.hero);
    else{buddy.remove();buddy=null}                       // no second GPU canvas available: keep the hero robot only
  }
  requestAnimationFrame(tick);
})();
