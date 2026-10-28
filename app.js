(() => {
  const form = document.querySelector('#order-form');
  const status = document.querySelector('#form-status');
  if (!form || !status) return;
  const endpoint = (form.dataset.sheetEndpoint || '').trim();
  const setStatus = (message, type) => { status.textContent = message; status.className = `form-status is-visible ${type}`; };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const phone = String(data.phone || '').replace(/[^\d+]/g, '');
    if (phone.length < 9) { setStatus('Vui lòng kiểm tra lại số điện thoại.', 'error'); return; }
    const order = { created_at: new Date().toISOString(), name: String(data.name || '').trim(), phone, model: String(data.model || '').trim(), city: String(data.city || '').trim(), note: String(data.note || '').trim(), source: 'landing-nex-ev' };
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true; submit.innerHTML = 'Đang gửi…';
    try {
      if (!endpoint) throw new Error('Missing endpoint');
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(order) });
      setStatus('Đã nhận thông tin. NexEV sẽ gọi lại cho bạn trong hôm nay.', 'success'); form.reset();
    } catch (error) { setStatus('Chưa gửi được. Gọi 0818 574 833 để được hỗ trợ ngay.', 'error'); }
    finally { submit.disabled = false; submit.innerHTML = 'Gửi thông tin đơn <span>↗</span>'; }
  });
})();

(() => {
  const items = document.querySelectorAll('.section-head, .mode-grid article, .real-copy, .real-media, .spec-grid article, .video-copy, .video-frame, .price-table, .order-grid > div, .order-form, .gallery-card');
  items.forEach((item) => item.classList.add('reveal-ready'));
  if (!('IntersectionObserver' in window)) { items.forEach((item) => item.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => { if (!entry.isIntersecting) return; entry.target.classList.add('is-visible'); obs.unobserve(entry.target); });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  items.forEach((item, index) => { item.style.animationDelay = `${Math.min(index % 4, 3) * 70}ms`; observer.observe(item); });
})();
