(()=>{const io='IntersectionObserver'in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -8%'}):null;document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${(i%4)*70}ms`;if(io)io.observe(el);else el.classList.add('in')});document.querySelectorAll('form[data-sheet-endpoint]').forEach(form=>{const status=form.querySelector('.form-status'),btn=form.querySelector('button[type=submit]'),endpoint=form.dataset.sheetEndpoint;form.addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());const phone=String(data.phone||'').replace(/[^\d+]/g,'');if(phone.length<9){status.textContent='Vui lòng kiểm tra lại số điện thoại.';status.className='form-status show bad';return}btn.disabled=true;btn.textContent='Đang gửi…';try{await fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({created_at:new Date().toISOString(),name:String(data.name||'').trim(),phone,model:String(data.model||'').trim(),city:String(data.city||'').trim(),note:String(data.note||'').trim(),source:location.pathname})});status.textContent='Đã nhận thông tin. NexEV sẽ gọi lại trong hôm nay.';status.className='form-status show ok';form.reset()}catch(err){status.textContent='Chưa gửi được. Gọi 0818 574 833 để được hỗ trợ ngay.';status.className='form-status show bad'}finally{btn.disabled=false;btn.textContent='Gửi thông tin đơn ↗'}})})})();

/* image interaction: auto-rotate every 3s, pause on hover/focus/click */
(()=>{
  document.querySelectorAll('[data-carousel]').forEach(root=>{
    const slides=[...root.querySelectorAll('.carousel-slide')];
    const dots=root.querySelector('.carousel-dots');
    const pause=root.querySelector('.carousel-pause');
    if(!slides.length)return;
    let active=0, hover=false, pinned=false;
    const setActive=(index)=>{active=(index+slides.length)%slides.length;slides.forEach((s,i)=>s.classList.toggle('is-active',i===active));dots?.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('is-active',i===active));};
    slides.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Xem ảnh ${i+1}`);b.addEventListener('click',e=>{e.stopPropagation();setActive(i);pinned=true;pause?.classList.add('is-pinned')});dots?.appendChild(b)});setActive(0);
    const timer=setInterval(()=>{if(!hover&&!pinned)setActive(active+1)},3000);
    root.addEventListener('pointerenter',()=>{hover=true});root.addEventListener('pointerleave',()=>{hover=false});root.addEventListener('focusin',()=>{hover=true});root.addEventListener('focusout',()=>{hover=false});
    pause?.addEventListener('click',e=>{e.stopPropagation();pinned=!pinned;pause.classList.toggle('is-pinned',pinned);pause.setAttribute('aria-label',pinned?'Chạy lại ảnh':'Tạm dừng ảnh')});
    root.addEventListener('click',()=>{pinned=true;pause?.classList.add('is-pinned')});
    root.addEventListener('touchstart',()=>{pinned=true;pause?.classList.add('is-pinned')},{passive:true});
  });
  document.querySelectorAll('[data-marquee]').forEach(root=>{
    const pause=root.querySelector('.marquee-pause');let pinned=false,hover=false;
    root.addEventListener('pointerenter',()=>{hover=true;root.classList.add('is-paused')});
    root.addEventListener('pointerleave',()=>{hover=false;if(!pinned)root.classList.remove('is-paused')});
    root.addEventListener('focusin',()=>{hover=true;root.classList.add('is-paused')});
    root.addEventListener('focusout',()=>{hover=false;if(!pinned)root.classList.remove('is-paused')});
    root.addEventListener('click',e=>{if(e.target.closest('button'))return;pinned=!pinned;root.classList.toggle('is-paused',pinned);pause?.classList.toggle('is-pinned',pinned)});
    pause?.addEventListener('click',()=>{pinned=!pinned;root.classList.toggle('is-paused',pinned);pause.classList.toggle('is-pinned',pinned);pause.setAttribute('aria-label',pinned?'Chạy lại dải ảnh':'Tạm dừng dải ảnh')});
    root.addEventListener('touchstart',()=>{pinned=true;root.classList.add('is-paused');pause?.classList.add('is-pinned')},{passive:true});
  });
})();
