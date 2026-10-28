(()=>{
  /* ============ ANTISPAM + SECURITY LAYER ============ */
  const SPAM_KEYWORDS = ['http://','https://','www.','<a href','[url','viagra','casino','loan','crypto','seo service','backlink','xxx','porn'];
  const MAX_LEN = {name:80, phone:20, model:80, city:60, note:500};
  const RATE_LIMIT = {max:3, windowMs:5*60*1000, storageKey:'nexev_form_rate'};
  const BLOCK_KEY = 'nexev_form_blocked';
  const MIN_FILL_MS = 3000; // phai o tren form it nhat 3 giay

  const stripTags = (v) => String(v||'').replace(/<[^>]*>/g,'').trim();
  const clamp = (v, max) => stripTags(v).slice(0, max);
  const isSpam = (v) => SPAM_KEYWORDS.some(k => v.toLowerCase().includes(k));

  function getRate(){
    try{
      const raw = JSON.parse(localStorage.getItem(RATE_LIMIT) || '{"times":[]}');
      const now = Date.now();
      const times = (raw.times||[]).filter(t => now - t < RATE_LIMIT.windowMs);
      return {times, count: times.length};
    }catch(e){ return {times:[], count:0}; }
  }
  function pushRate(){
    try{
      const {times} = getRate();
      times.push(Date.now());
      localStorage.setItem(RATE_LIMIT, JSON.stringify({times}));
    }catch(e){}
  }
  function isBlocked(){
    try{
      const until = Number(localStorage.getItem(BLOCK_KEY) || 0);
      return Date.now() < until ? until : 0;
    }catch(e){ return 0; }
  }
  function blockFor(ms, reason){
    try{ localStorage.setItem(BLOCK_KEY, String(Date.now() + ms)); }catch(e){}
  }

  // honeypot: them field an vao moi form
  document.querySelectorAll('form[data-sheet-endpoint]').forEach(form => {
    if (form.querySelector('input[name="website_hp"]')) return;
    const hp = document.createElement('input');
    hp.type = 'text';
    hp.name = 'website_hp';
    hp.tabIndex = -1;
    hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden','true');
    hp.style.cssText = 'position:absolute !important;left:-9999px !important;width:1px;height:1px;opacity:0;pointer-events:none';
    form.appendChild(hp);
    form.dataset.openTime = String(Date.now());
  });

  // ============ FORM SUBMIT HANDLER (co bao mat) ============
  document.querySelectorAll('form[data-sheet-endpoint]').forEach(form=>{
    const status=form.querySelector('.form-status'),btn=form.querySelector('button[type=submit]'),endpoint=form.dataset.sheetEndpoint;
    form.addEventListener('submit',async e=>{
      e.preventDefault();

      // 1. Blocked?
      const blockedUntil = isBlocked();
      if (blockedUntil) {
        const mins = Math.ceil((blockedUntil - Date.now())/60000);
        status.textContent = `Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ${mins} phút hoặc gọi 0818 574 833.`;
        status.className = 'form-status show bad';
        return;
      }

      // 2. Honeypot check (bot thuong dien vao)
      const hp = form.querySelector('input[name="website_hp"]');
      if (hp && hp.value.trim() !== '') {
        console.warn('spam detected');
        status.textContent = 'Có lỗi xảy ra. Vui lòng gọi 0818 574 833.';
        status.className = 'form-status show bad';
        blockFor(30*60*1000); // block 30 phut
        return;
      }

      // 3. Time gate (bot submit tuc thi sau khi load)
      const openTime = Number(form.dataset.openTime || 0);
      if (openTime && Date.now() - openTime < MIN_FILL_MS) {
        status.textContent = 'Bạn thao tác quá nhanh. Vui lòng điền đầy đủ rồi gửi lại.';
        status.className = 'form-status show bad';
        return;
      }

      // 4. Rate limit
      const rate = getRate();
      if (rate.count >= RATE_LIMIT.max) {
        blockFor(15*60*1000);
        status.textContent = 'Bạn đã gửi nhiều đơn trong thời gian ngắn. Vui lòng đợi vài phút hoặc gọi 0818 574 833.';
        status.className = 'form-status show bad';
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());

      // 5. Sanitize + validate
      const name = clamp(data.name, MAX_LEN.name);
      const rawPhone = String(data.phone||'');
      const phone = rawPhone.replace(/[^\d+]/g,'').slice(0, MAX_LEN.phone);
      const model = clamp(data.model, MAX_LEN.model);
      const city = clamp(data.city, MAX_LEN.city);
      const note = clamp(data.note, MAX_LEN.note);

      if (name.length < 2) {
        status.textContent = 'Vui lòng nhập họ tên đầy đủ.'; status.className='form-status show bad'; return;
      }
      if (phone.replace(/\D/g,'').length < 9 || phone.replace(/\D/g,'').length > 12) {
        status.textContent = 'Số điện thoại không hợp lệ (9–12 số).'; status.className='form-status show bad'; return;
      }
      if (city.length < 2) {
        status.textContent = 'Vui lòng nhập tỉnh / thành phố.'; status.className='form-status show bad'; return;
      }

      // 6. Spam keywords check
      const allText = [name, model, city, note].join(' ');
      if (isSpam(allText)) {
        blockFor(60*60*1000); // block 1 gio
        status.textContent = 'Nội dung chứa từ không hợp lệ. Vui lòng gọi 0818 574 833.';
        status.className = 'form-status show bad';
        return;
      }

      // 7. Duplicate check (localStorage)
      const dupKey = 'nexev_last_' + phone;
      const lastSent = Number(localStorage.getItem(dupKey) || 0);
      if (lastSent && Date.now() - lastSent < 10*60*1000) {
        status.textContent = 'Bạn đã gửi đơn với số này cách đây không lâu. Chúng tôi sẽ gọi lại sớm — không cần gửi lại.';
        status.className = 'form-status show bad';
        return;
      }

      // 8. Confirm truoc khi gui (chong click nham + bot khong confirm duoc)
      const confirmMsg = `Xác nhận gửi thông tin?\n\nHọ tên: ${name}\nSĐT: ${phone}\nMẫu xe: ${model}\nTỉnh/TP: ${city}`;
      if (!confirm(confirmMsg)) return;

      // === GUI ===
      btn.disabled=true;btn.textContent='Đang gửi…';
      try{
        await fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({
          created_at:new Date().toISOString(),
          name, phone, model, city, note,
          source:location.pathname,
          ua: navigator.userAgent.slice(0,100),
          submittedAt: Date.now()
        })});
        pushRate();
        try{ localStorage.setItem(dupKey, String(Date.now())); }catch(e){}
        status.textContent='Đã nhận thông tin. NexEV sẽ gọi lại trong hôm nay.';
        status.className='form-status show ok';
        form.reset();
        form.dataset.openTime = String(Date.now()); // reset time gate cho lan sau
      }catch(err){
        status.textContent='Chưa gửi được. Gọi 0818 574 833 để được hỗ trợ ngay.';
        status.className='form-status show bad';
      }finally{btn.disabled=false;btn.textContent='Gửi thông tin đơn ↗'}
    });
  });
})();

/* image interaction: labeled slide transition, auto-rotate every 3s, pause on hover/focus/touch */
(()=>{
  document.querySelectorAll('[data-carousel]').forEach(root=>{
    const slides=[...root.querySelectorAll('.carousel-slide')],dots=root.querySelector('.carousel-dots'),meta=root.querySelector('.carousel-meta');
    if(!slides.length)return; let active=0,hover=false,holdTimer;
    const render=()=>{const current=slides[active],label=current.dataset.label||current.alt||'';if(meta){meta.innerHTML=`<b>${String(active+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}</b><span>${label}</span>`}dots?.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('is-active',i===active))};
    const setActive=index=>{const previous=active;active=(index+slides.length)%slides.length;if(previous!==active){slides[previous].classList.remove('is-active');slides[previous].classList.add('is-leaving');slides[active].classList.remove('is-leaving');requestAnimationFrame(()=>slides[active].classList.add('is-active'));setTimeout(()=>slides[previous].classList.remove('is-leaving'),900)}render()};
    slides.forEach((slide,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Xem ảnh ${i+1}: ${slide.dataset.label||slide.alt||''}`);b.addEventListener('click',e=>{e.stopPropagation();setActive(i)});dots?.appendChild(b)});render();
    setInterval(()=>{if(!hover)setActive(active+1)},3000);
    root.addEventListener('pointerenter',()=>hover=true);root.addEventListener('pointerleave',()=>hover=false);root.addEventListener('focusin',()=>hover=true);root.addEventListener('focusout',()=>hover=false);const holdBriefly=()=>{hover=true;clearTimeout(holdTimer);holdTimer=setTimeout(()=>{hover=false},3000)};root.addEventListener('click',holdBriefly);root.addEventListener('touchstart',holdBriefly,{passive:true});
  });
  document.querySelectorAll('[data-marquee]').forEach(root=>{
    let pinned=false;root.addEventListener('pointerenter',()=>root.classList.add('is-paused'));root.addEventListener('pointerleave',()=>{if(!pinned)root.classList.remove('is-paused')});root.addEventListener('focusin',()=>root.classList.add('is-paused'));root.addEventListener('focusout',()=>{if(!pinned)root.classList.remove('is-paused')});root.addEventListener('click',()=>{pinned=!pinned;root.classList.toggle('is-paused',pinned)});root.addEventListener('touchstart',()=>{pinned=true;root.classList.add('is-paused')},{passive:true});
  });
})();
/* JS-driven rail so the gallery keeps moving even when CSS motion is reduced */
(()=>{document.querySelectorAll('[data-marquee]').forEach(root=>{const track=root.querySelector('.marquee-track');if(!track)return;let offset=0,last=performance.now();const tick=now=>{const half=track.scrollWidth/2;const stopped=root.classList.contains('is-paused')||root.matches(':hover');if(half>0&&!stopped){offset-=((now-last)*0.055);if(offset<=-half)offset+=half;track.style.transform=`translate3d(${offset}px,0,0)`}last=now;requestAnimationFrame(tick)};requestAnimationFrame(tick)})})();

/* click any product photo to open it in a focused lightbox */
(()=>{
  const sources=[...document.querySelectorAll('.carousel-slide,.marquee-set img')];
  if(!sources.length)return;
  const overlay=document.createElement('div');
  overlay.className='image-lightbox';
  overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML='<button class="image-lightbox-close" type="button" aria-label="Đóng ảnh">×</button><figure><img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(overlay);
  const preview=overlay.querySelector('img'),caption=overlay.querySelector('figcaption'),close=()=>{overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('lightbox-open');sources.forEach(source=>source.closest('[data-carousel]')?.classList.remove('is-lightbox-open'))};
  const open=source=>{preview.src=source.currentSrc||source.src;preview.alt=source.alt||'';caption.textContent=source.dataset.label||source.alt||'';overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open');source.closest('[data-carousel]')?.classList.add('is-lightbox-open')};
  sources.forEach(source=>{source.tabIndex=0;source.addEventListener('click',event=>{event.stopPropagation();open(source)});source.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open(source)}})});
  overlay.addEventListener('click',event=>{if(event.target===overlay||event.target===overlay.querySelector('.image-lightbox-close'))close()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay.classList.contains('is-open'))close()});
})();



