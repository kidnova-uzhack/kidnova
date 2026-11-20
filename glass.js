// Liquid glass: pointer-following highlight on glass surfaces + animated language switch
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── highlight follows the pointer across whichever glass surface is under it
  const GLASS='.about-card,.problem-card,.vision-card,.workflow-detail,.status-column,.comparison-wrap,.customer-list,.revenue-list,.recurring-note,.arch-layer,.market-cards article,.expansion-path>div,.team-placeholder,.evidence-list,.contact-shell,.trust-grid article,.roadmap-tabs button,.roadmap-detail,.impact-metrics,.inquiry-list a';
  if(!reduced&&matchMedia('(hover: hover)').matches){
    let current=null,ev=null,raf=0;
    const clear=el=>{el.style.removeProperty('--mx');el.style.removeProperty('--my')};
    addEventListener('pointermove',e=>{ev=e;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;
      const el=ev.target instanceof Element?ev.target.closest(GLASS):null;
      if(el!==current){if(current)clear(current);current=el}
      if(!el)return;
      const r=el.getBoundingClientRect();
      el.style.setProperty('--mx',(ev.clientX-r.left).toFixed(0)+'px');
      el.style.setProperty('--my',(ev.clientY-r.top).toFixed(0)+'px');
    })},{passive:true});
    document.addEventListener('pointerleave',()=>{if(current){clear(current);current=null}});
  }

  // ── language switch: visible text fades out, swaps, then fades back in (top to bottom)
  const toggle=document.getElementById('languageToggle');
  if(toggle&&!reduced&&Element.prototype.animate){
    const SEL='[data-i18n],[data-i18n-html],#workflowDetailTitle,#workflowDetailText,#workflowNumber,.roadmap-detail>*';
    let passing=false,busy=false;
    document.addEventListener('click',e=>{
      if(passing||!(e.target instanceof Element)||!e.target.closest('#languageToggle'))return;
      e.preventDefault();e.stopImmediatePropagation();
      if(busy)return;busy=true;
      const target=e.target.closest('[data-lang]')||toggle;
      const vh=innerHeight;
      const shown=[...document.querySelectorAll(SEL)].map(el=>[el,el.getBoundingClientRect()]).filter(([,r])=>r.width&&r.bottom>-80&&r.top<vh+80);
      const outs=shown.map(([el])=>el.animate({opacity:0,translate:'0 -5px'},{duration:160,easing:'ease-in',fill:'forwards'}));
      setTimeout(()=>{
        // the page's own handler swaps the text; whatever happens there, never leave text faded out
        try{passing=true;target.click()}finally{passing=false;outs.forEach(a=>a.cancel())}
        // headings are re-rendered by the swap, so restore their underline state
        document.querySelectorAll('.section-heading h2 span,.impact-intro h2 span,.demo-intro h2 span').forEach(s=>s.classList.add('swept'));
        shown.forEach(([el,r])=>el.animate([{opacity:0,translate:'0 8px',offset:0}],{duration:480,delay:Math.max(0,Math.min(1,r.top/vh))*140,easing:'cubic-bezier(.22,.61,.36,1)',fill:'backwards'}));
        setTimeout(()=>{busy=false},400);
      },170);
    },true);
  }
})();
