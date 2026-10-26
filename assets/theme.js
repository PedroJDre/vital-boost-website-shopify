/* Vital Boost 2026 — theme behaviour. No dependencies. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const VB = window.VB || { routes: { root: '/', cartAdd: '/cart/add.js', cartChange: '/cart/change.js', cart: '/cart' } };
  const root = (VB.routes.root || '/').replace(/\/?$/, '/');

  /* ---------- Money ---------- */
  function formatMoney(cents) {
    const fmt = VB.moneyFormat || '${{amount_no_decimals_with_comma_separator}}';
    const value = Math.round(Number(cents) || 0);
    const withDelims = (n, dec, th, ds) => {
      const fixed = (n / 100).toFixed(dec);
      const [int, frac] = fixed.split('.');
      return int.replace(/\B(?=(\d{3})+(?!\d))/g, th) + (frac && dec ? ds + frac : '');
    };
    // Always drop trailing zeros, like money_without_trailing_zeros
    const hasCents = value % 100 !== 0;
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      if (key.includes('comma_separator')) return withDelims(value, hasCents ? 2 : 0, '.', ',');
      if (key.includes('apostrophe')) return withDelims(value, hasCents ? 2 : 0, "'", '.');
      if (key.includes('space')) return withDelims(value, hasCents ? 2 : 0, ' ', ',');
      return withDelims(value, hasCents ? 2 : 0, ',', '.');
    });
  }

  /* ---------- Focus helpers for dialogs ---------- */
  let lastFocus = null;
  function trapFocus(container, e) {
    const f = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', container).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openLayer(layer, panelSel) {
    lastFocus = document.activeElement;
    layer.classList.add('is-open');
    document.body.classList.add('is-locked');
    const panel = $(panelSel, layer);
    setTimeout(() => panel && panel.focus(), 50);
  }
  function closeLayer(layer) {
    layer.classList.remove('is-open');
    if (!$('.drawer.is-open, .menu-drawer.is-open')) document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- Header ---------- */
  const header = $('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Announcement rotation ---------- */
  const ann = $('[data-announce]');
  if (ann && !reduceMotion) {
    const items = $$('.announce__item', ann);
    if (items.length > 1) {
      let i = 0;
      setInterval(() => {
        items[i].classList.remove('is-active');
        i = (i + 1) % items.length;
        items[i].classList.add('is-active');
      }, 4000);
    }
  }

  /* ---------- Menu drawer ---------- */
  const menu = $('[data-menu-drawer]');
  if (menu) {
    const btn = $('[data-menu-open]');
    btn && btn.addEventListener('click', () => { openLayer(menu, '.menu-drawer__panel'); btn.setAttribute('aria-expanded', 'true'); });
    $$('[data-menu-close]', menu).forEach((el) => el.addEventListener('click', () => { closeLayer(menu); btn && btn.setAttribute('aria-expanded', 'false'); }));
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeLayer(menu); btn && btn.setAttribute('aria-expanded', 'false'); }
      if (e.key === 'Tab') trapFocus(menu, e);
    });
    $$('a', menu).forEach((a) => a.addEventListener('click', () => closeLayer(menu)));
  }

  /* ---------- Cart drawer ---------- */
  const isCartPage = document.body.classList.contains('template-cart');
  function drawer() { return $('[data-cart-drawer]'); }
  function openCart() { const d = drawer(); if (d) openLayer(d, '.drawer__panel'); }
  function bindDrawer() {
    const d = drawer();
    if (!d || d.dataset.bound) return;
    d.dataset.bound = '1';
    d.addEventListener('click', (e) => { if (e.target.closest('[data-drawer-close]')) closeLayer(d); });
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLayer(d);
      if (e.key === 'Tab') trapFocus(d, e);
    });
  }
  bindDrawer();

  function renderDrawer(html) {
    const d = drawer();
    if (!d || !html) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const fresh = $('[data-cart-drawer]', tmp);
    if (!fresh) return;
    const wasOpen = d.classList.contains('is-open');
    // Swap only the panel contents so the open state and listeners survive.
    $('.drawer__panel', d).innerHTML = $('.drawer__panel', fresh).innerHTML;
    if (wasOpen) d.classList.add('is-open');
    const count = Number(fresh.dataset.count || 0);
    $$('[data-cart-count]').forEach((el) => { el.dataset.count = count; el.textContent = count > 0 ? count : ''; });
  }

  $$('[data-cart-open]').forEach((a) => a.addEventListener('click', (e) => {
    if (isCartPage || !drawer()) return;
    e.preventDefault();
    openCart();
  }));

  async function changeLine(key, quantity, lineEl) {
    lineEl && lineEl.style.setProperty('opacity', '.5');
    try {
      const res = await fetch(VB.routes.cartChange, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: Math.max(0, quantity), sections: 'cart-drawer' })
      });
      let data = null;
      try { data = await res.json(); } catch (_) { /* not JSON */ }
      if (!data) { window.location.href = VB.routes.cart; return; }
      if (!res.ok) throw new Error(data.description || data.message || 'No pudimos actualizar el carrito.');
      if (isCartPage) { window.location.reload(); return; }
      renderDrawer(data.sections && data.sections['cart-drawer']);
    } catch (err) {
      lineEl && lineEl.style.removeProperty('opacity');
      if (err instanceof TypeError) { window.location.href = VB.routes.cart; return; }
      alert(err.message);
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qty-change]');
    if (!btn) return;
    const line = btn.closest('[data-key]');
    if (!line) return;
    changeLine(line.dataset.key, Number(btn.dataset.qtyChange), line);
  });
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-qty-input]');
    if (!input) return;
    const line = input.closest('[data-key]');
    changeLine(line.dataset.key, Number(input.value), line);
  });

  /* ---------- Buy forms ---------- */
  function updatePackPrices(form, unitPrice) {
    const discs = VB.packDiscounts || [];
    $$('.pack', form).forEach((label) => {
      const input = $('input', label);
      const q = Number(input.dataset.qty || input.value);
      const d = Number(input.dataset.discount || 0);
      const full = unitPrice * q;
      const total = Math.floor(full * (100 - d) / 100);
      const t = $('[data-pack-total]', label); if (t) t.textContent = formatMoney(total);
      const f = $('[data-pack-full]', label); if (f) f.textContent = formatMoney(full);
      const each = $('.pack__each', label); if (each) each.textContent = formatMoney(Math.floor(total / q)) + ' c/u';
    });
    return discs;
  }

  function selectedTotal(form) {
    const checked = $('[data-packs] input[name="vb_pack"]:checked', form);
    const label = checked && checked.closest('.pack');
    const t = label && $('[data-pack-total]', label);
    return t ? t.textContent : '';
  }

  // Third-party pack widgets (Bundler) inject their own quantity inputs into
  // product forms. Our selector replaces them, so strip anything they add.
  const strip = (form) => form.querySelectorAll('.bundler-volume-target-element, [class*="bndlr-"]').forEach((n) => n.remove());
  $$('[data-buy-form]').forEach((form) => {
    strip(form);
    new MutationObserver(() => strip(form)).observe(form, { childList: true, subtree: true });
    const select = $('[data-variant-select]', form);
    if (select) {
      select.addEventListener('change', () => {
        $('input[name="id"]', form).value = select.value;
        const opt = select.selectedOptions[0];
        updatePackPrices(form, Number(opt.dataset.price));
      });
    }

    form.addEventListener('change', (e) => {
      if (e.target.name === 'vb_pack') {
        const sp = $('[data-sticky-price]');
        if (sp && form.closest('[data-main-buy]')) sp.textContent = selectedTotal(form);
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitter = e.submitter || $('[data-add-to-cart]', form);
      const buyNow = submitter && submitter.hasAttribute('data-buy-now');
      const err = $('[data-buy-error]', form);
      const id = Number($('input[name="id"]', form).value);
      const qInput = $('[data-packs] input[name="vb_pack"]:checked', form);
      const quantity = qInput ? Number(qInput.dataset.qty || qInput.value) : 1;
      const hiddenQty = $('[data-qty-hidden]', form);
      if (hiddenQty) hiddenQty.value = quantity;
      err && (err.hidden = true);
      submitter && submitter.classList.add('is-loading');
      try {
        const res = await fetch(VB.routes.cartAdd, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id, quantity }], sections: buyNow ? undefined : 'cart-drawer' })
        });
        let data = null;
        try { data = await res.json(); } catch (_) { /* not JSON: bot check or outage */ }
        if (!data) throw new Error('fallback');
        if (!res.ok) throw new Error(data.description || data.message || 'No pudimos agregarlo al carrito.');
        if (buyNow) { window.location.href = root + 'checkout'; return; }
        renderDrawer(data.sections && data.sections['cart-drawer']);
        openCart();
      } catch (ex) {
        if (ex.message === 'fallback' || ex instanceof TypeError) {
          // Let Shopify handle it with a normal form post.
          if (buyNow) {
            const r = document.createElement('input');
            r.type = 'hidden'; r.name = 'return_to'; r.value = '/checkout';
            form.appendChild(r);
          }
          form.submit();
          return;
        }
        if (err) { err.textContent = ex.message; err.hidden = false; }
      } finally {
        if (!buyNow) submitter && submitter.classList.remove('is-loading');
      }
    });
  });

  // Back/forward cache: clear loading state if the shopper comes back from checkout.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) $$('.is-loading').forEach((b) => b.classList.remove('is-loading'));
  });

  /* ---------- Formula picker ---------- */
  $$('[data-picker]').forEach((picker) => {
    const tabs = $$('[role="tab"]', picker);
    const panels = $$('[data-panel]', picker);
    function select(i, focus) {
      tabs.forEach((t) => {
        const on = t.dataset.tab === String(i);
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panels.forEach((p) => {
        const on = p.dataset.panel === String(i);
        p.hidden = !on;
        if (on) {
          picker.setAttribute('style', p.dataset.style);
          const img = $('.stage__img', p);
          if (img && !reduceMotion) { img.style.animation = 'none'; img.offsetHeight; img.style.animation = ''; }
        }
      });
    }
    tabs.forEach((t, idx) => {
      t.addEventListener('click', () => select(t.dataset.tab));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight') n = (idx + 1) % tabs.length;
        if (e.key === 'ArrowLeft') n = (idx - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(tabs[n].dataset.tab, true); }
      });
    });
    // Deep link: /#formulas-belleza or ?formula=2
    const params = new URLSearchParams(location.search);
    const want = params.get('formula');
    if (want) {
      const t = tabs.find((x) => x.dataset.tab === want || x.textContent.trim().toLowerCase().startsWith(want.toLowerCase()));
      if (t) select(t.dataset.tab);
    }
  });

  /* ---------- Gallery ---------- */
  $$('[data-gallery]').forEach((g) => {
    const track = $('[data-gallery-track]', g);
    const thumbs = $$('[data-thumb]', g);
    thumbs.forEach((th) => th.addEventListener('click', () => {
      const i = Number(th.dataset.thumb);
      track.scrollTo({ left: track.clientWidth * i, behavior: reduceMotion ? 'auto' : 'smooth' });
    }));
    let raf;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        thumbs.forEach((th) => th.setAttribute('aria-current', th.dataset.thumb === String(i)));
        const cur = thumbs[i];
        if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    }, { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
    });
  });

  /* ---------- Sticky buy bar ---------- */
  const sticky = $('[data-sticky-buy]');
  const mainBuy = $('[data-main-buy]');
  if (sticky && mainBuy && 'IntersectionObserver' in window) {
    const form = $('[data-buy-form]', mainBuy);
    const sp = $('[data-sticky-price]', sticky);
    if (sp && form) sp.textContent = selectedTotal(form);
    const io = new IntersectionObserver(([entry]) => {
      const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sticky.classList.toggle('is-visible', show);
      sticky.setAttribute('aria-hidden', String(!show));
      $('[data-sticky-go]', sticky).tabIndex = show ? 0 : -1;
      document.body.classList.toggle('has-sticky-buy', show);
    });
    io.observe(mainBuy);
    $('[data-sticky-go]', sticky).addEventListener('click', () => {
      const btn = form && $('[data-buy-now]', form);
      if (btn) form.requestSubmit ? form.requestSubmit(btn) : btn.click();
    });
  }

  /* ---------- Lazy theme videos ---------- */
  const lazyVideos = $$('video[data-lazy-video]');
  const attach = (v) => { if (!v.getAttribute('src')) { v.src = v.dataset.lazyVideo; v.preload = 'auto'; } };
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          attach(v);
          if (!v.hasAttribute('data-manual') && !reduceMotion) v.play().catch(() => {});
        } else if (!v.hasAttribute('data-manual')) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px' });
    lazyVideos.forEach((v) => vio.observe(v));
  } else {
    lazyVideos.forEach(attach);
  }

  /* ---------- Video reels ---------- */
  $$('[data-reel]').forEach((reel) => {
    const video = $('video', reel);
    const btn = $('.reel__play', reel);
    if (!video || !btn) return;
    video.removeAttribute('controls');
    const toggle = () => {
      if (video.paused) {
        $$('[data-reel] video').forEach((v) => { if (v !== video) { v.pause(); v.closest('[data-reel]').classList.remove('is-playing'); } });
        attach(video);
        video.muted = false;
        video.play().catch(() => {});
        reel.classList.add('is-playing');
      } else {
        video.pause();
        reel.classList.remove('is-playing');
      }
    };
    btn.addEventListener('click', toggle);
    video.addEventListener('click', toggle);
    video.addEventListener('ended', () => reel.classList.remove('is-playing'));
  });
})();
