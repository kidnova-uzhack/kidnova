(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  // rising particles in the hero (few, CSS-animated)
  const hero=document.querySelector('.hero');
  if(hero){
    const box=document.createElement('div');box.className='kn-particles';
    for(let i=0;i<10;i++){const p=document.createElement('i');
      p.style.cssText=`left:${Math.random()*100}%;--s:${4+Math.random()*7}px;--t:${9+Math.random()*10}s;--dl:${-Math.random()*14}s;--x:${(Math.random()-.5)*120}px`;
      box.append(p)}
    if(getComputedStyle(hero).position==='static')hero.style.position='relative';
    hero.prepend(box);
  }

  // scroll reveals for section headings and lead copy; alternate sides for two-column blocks
  const targets=$$('.section-heading > *,.impact-intro > *,.demo-intro > *');
  targets.forEach(el=>el.classList.add('kn-rise'));
  $$('.split > :first-child,.about-grid > :first-child').forEach(el=>el.classList.add('kn-left'));
  $$('.split > :last-child,.about-grid > :last-child').forEach(el=>el.classList.add('kn-right'));
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting)return;io.unobserve(e.target);
    e.target.style.transitionDelay=(e.target.dataset.kd||0)+'ms';e.target.classList.add('kn-in');
  }),{threshold:.15,rootMargin:'0px 0px -5% 0px'});
  $$('.kn-rise,.kn-left,.kn-right').forEach((el,i)=>{el.dataset.kd=(i%3)*80;io.observe(el)});

  // magnetic primary buttons (desktop only)
  if(matchMedia('(hover: hover)').matches)$$('.button-primary').forEach(b=>{
    b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.translate=`${(e.clientX-r.left-r.width/2)*.12}px ${(e.clientY-r.top-r.height/2)*.18}px`});
    b.addEventListener('pointerleave',()=>b.style.translate='');
  });
})();

// solution map: nodes orbit around the KidNova core (desktop layout only)
(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const shell=document.querySelector('.solution-shell');if(!shell)return;
  const by=n=>shell.querySelector('.solution-node.n'+n);
  const nodes=[1,2,4,6,5,3].map(by).filter(Boolean);
  if(!nodes.length)return;
  let visible=false,hover=false,t=0,prev=0;
  new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(shell);
  shell.addEventListener('pointerenter',()=>hover=true);shell.addEventListener('pointerleave',()=>hover=false);
  const mq=matchMedia('(min-width:761px)');
  function place(){
    if(!mq.matches){nodes.forEach(n=>{n.style.removeProperty('inset');n.style.left=n.style.top=n.style.transform=''});return false}
    const w=shell.clientWidth,h=shell.clientHeight,rx=w*.375,ry=h*.36;
    nodes.forEach((n,i)=>{
      const a=-Math.PI*.75+i*Math.PI*2/nodes.length+t;
      n.style.setProperty('inset','auto','important');n.style.left='50%';n.style.top='50%';
      n.style.transform=`translate(-50%,-50%) translate(${Math.cos(a)*rx}px,${Math.sin(a)*ry}px)`;
    });return true;
  }
  place();
  addEventListener('resize',place);
  (function frame(now){
    const d=Math.min(now-prev,50);prev=now;
    if(visible&&!hover&&!document.hidden){t+=d*.00011;place()}
    requestAnimationFrame(frame);
  })(0);
})();

// workflow: pinned section, scrolling fills the line and advances the stage (desktop only)
(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const sec=document.querySelector('.workflow-section'),wf=sec&&sec.querySelector('.workflow');if(!sec||!wf)return;
  const steps=[...wf.querySelectorAll('.workflow-step')],mq=matchMedia('(min-width:1051px)');
  let cur=-1,ticking=false;
  const range=()=>sec.offsetHeight-innerHeight;
  function update(){
    ticking=false;
    if(!mq.matches){sec.classList.remove('kn-pin');wf.style.removeProperty('--wf');steps.forEach(s=>s.classList.remove('done'));cur=-1;return}
    sec.classList.add('kn-pin');
    const p=Math.max(0,Math.min(1,-sec.getBoundingClientRect().top/range()));
    wf.style.setProperty('--wf',p);
    const i=Math.min(steps.length-1,Math.round(p*(steps.length-1)));
    steps.forEach((s,k)=>s.classList.toggle('done',k<i));
    if(i!==cur){cur=i;steps[i].dispatchEvent(new MouseEvent('click',{bubbles:true}))}
  }
  const req=()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}};
  addEventListener('scroll',req,{passive:true});addEventListener('resize',req);
  // clicking a stage scrolls to it
  steps.forEach((s,k)=>s.addEventListener('click',e=>{
    if(!e.isTrusted||!mq.matches)return;
    scrollTo({top:sec.getBoundingClientRect().top+scrollY+range()*k/(steps.length-1),behavior:'smooth'});
  }));
  update();
})();


// site-wide motion pass
(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  // pause looping animations in off-screen sections
  const offIO=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('kn-off',!e.isIntersecting)),{rootMargin:'400px 0px'});
  $$('section:not(#demo), footer').forEach(s=>offIO.observe(s));   // the demo runs its own one-shot animations

  // staggered entrances: [container, items, horizontal?]
  const groups=[
    ['.values-row','span'],['.status-column','li',1],['.comparison-wrap tbody','tr',1],
    ['.expansion-path',':scope > *'],['.benefit-strip','span'],
    ['.roadmap-tabs','button'],['.evidence-list','details'],['.inquiry-list','a',1],
    ['.people-row','span'],['.footer-grid',':scope > div'],['.customer-list','span',1],['.revenue-list','span',1]
  ];
  const stIO=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting)return;stIO.unobserve(e.target);
    const items=e.target.__knItems;e.target.classList.add('kn-go');
    // hand the elements back to their own styles once the entrance is done
    setTimeout(()=>{items.forEach(el=>el.classList.remove('kn-st','kn-x'));e.target.classList.remove('kn-go')},900+items.length*70);
  }),{threshold:.15,rootMargin:'0px 0px -6% 0px'});
  groups.forEach(([c,i,x])=>$$(c).forEach(box=>{
    const items=$$(i,box);if(!items.length)return;
    items.forEach((el,k)=>{el.style.setProperty('--i',Math.min(k,9));el.classList.add('kn-st');if(x)el.classList.add('kn-x')});
    box.__knItems=items;stIO.observe(box);
  }));

  // large panels follow scroll position as they enter
  $$('.solution-shell,.comparison-wrap,.contact-shell,.architecture-map,.network-visual,.roadmap-detail').forEach(el=>el.classList.add('kn-view'));

  // drifting glow in the dark sections
  $$('.roadmap-section,.technician-section,.trust-section,.impact-section').forEach(sec=>{
    sec.classList.add('kn-lit');
    for(const c of ['kn-glow','kn-glow b']){const g=document.createElement('span');g.className=c;g.setAttribute('aria-hidden','true');sec.prepend(g)}
  });

  // nav highlights the section in view
  const links=new Map($$('.desktop-nav a[href^="#"]').map(a=>[a.getAttribute('href').slice(1),a]));
  const spy=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting)return;
    links.forEach(a=>a.classList.remove('kn-current'));
    const a=links.get(e.target.id);if(a)a.classList.add('kn-current');
  }),{rootMargin:'-45% 0px -50% 0px'});
  $$('section[id]').forEach(s=>spy.observe(s));

  // content swaps: replay a short fade when the workflow stage or roadmap tab changes
  const replay=el=>{el.classList.remove('kn-swap');void el.offsetWidth;el.classList.add('kn-swap')};
  const wd=document.querySelector('.workflow-detail > div');
  if(wd)new MutationObserver(()=>replay(wd)).observe(wd,{childList:true,subtree:true,characterData:true});
  const rd=document.querySelector('.roadmap-detail');
  if(rd){
    let queued=false;
    new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;
      $$('li',rd).forEach((li,k)=>li.style.setProperty('--i',k));
      $$(':scope > *',rd).forEach(replay)})}).observe(rd,{childList:true,subtree:true,characterData:true});
  }

  // hero depth: floating cards shift slightly against the pointer
  const hero=document.querySelector('.hero');
  if(hero&&matchMedia('(hover: hover) and (min-width:1051px)').matches){
    const cards=$$('.floating-card',hero);let raf=0,ev;
    hero.addEventListener('pointermove',e=>{ev=e;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;
      const r=hero.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;
      cards.forEach((c,k)=>{const d=k?-16:12;c.style.setProperty('--px',x*d+'px');c.style.setProperty('--py',y*d+'px')});
    })});
    hero.addEventListener('pointerleave',()=>cards.forEach(c=>{c.style.setProperty('--px','0px');c.style.setProperty('--py','0px')}));
  }
})();


// glass header: the top highlight follows the pointer
(()=>{
  const shell=document.querySelector('.nav-shell');if(!shell||!matchMedia('(hover: hover)').matches)return;
  let raf=0,x=0;
  shell.addEventListener('pointermove',e=>{x=e.clientX;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;
    const r=shell.getBoundingClientRect();shell.style.setProperty('--gx',((x-r.left)/r.width*100).toFixed(1)+'%')})});
})();
