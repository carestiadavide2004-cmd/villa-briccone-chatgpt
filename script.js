/* ==========================================================================
   VILLA BRICCONE — script.js
   Vanilla JavaScript, no dependencies.
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIG — edit contact details here, once.
   Every [data-phone], [data-email], [data-phone-link], [data-email-link]
   in the page is filled from these values.
   -------------------------------------------------------------------------- */
const CONFIG = {
  phoneDisplay: "[TELEFONO]",   // as shown on the page, e.g. "+39 085 000 0000"
  phoneDial: "",                // digits for tel: links, e.g. "+390850000000"
  email: "[EMAIL]",             // e.g. "info@villabriccone.it"

  // Social profiles: leave empty until real links are provided.
  // Example: { label: "Instagram", url: "https://www.instagram.com/..." }
  social: []
};

(function () {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isSmall = window.matchMedia("(max-width: 760px)");

  /* ------------------------------------------------------------------------
     Contact details
     ------------------------------------------------------------------------ */
  function applyContacts() {
    const hasPhone = CONFIG.phoneDial.trim() !== "";
    const hasEmail = CONFIG.email.trim() !== "" && CONFIG.email.indexOf("@") > -1;

    document.querySelectorAll("[data-phone]").forEach(el => { el.textContent = CONFIG.phoneDisplay; });
    document.querySelectorAll("[data-email]").forEach(el => { el.textContent = CONFIG.email; });

    // Until real values exist, links scroll to the contact section instead of opening an empty dialer.
    document.querySelectorAll("[data-phone-link]").forEach(el => {
      el.setAttribute("href", hasPhone ? "tel:" + CONFIG.phoneDial.replace(/\s+/g, "") : "#contatti");
    });
    document.querySelectorAll("[data-email-link]").forEach(el => {
      el.setAttribute("href", hasEmail ? "mailto:" + CONFIG.email.trim() : "#contatti");
    });

    const socialBox = document.querySelector("[data-social]");
    if (socialBox && CONFIG.social.length) {
      CONFIG.social.forEach(s => {
        const a = document.createElement("a");
        a.href = s.url; a.textContent = s.label; a.target = "_blank"; a.rel = "noopener";
        socialBox.appendChild(a);
      });
      socialBox.hidden = false;
    }

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }
  applyContacts();

  /* ------------------------------------------------------------------------
     Opening: lift the curtain once the hero image is ready
     (with a safety timeout so the page never stays covered)
     ------------------------------------------------------------------------ */
  function reveal() { root.classList.add("is-loaded"); }
  const heroImg = document.querySelector(".hero__img");
  if (reduceMotion.matches) {
    reveal();
  } else if (heroImg && !heroImg.complete) {
    heroImg.addEventListener("load", () => setTimeout(reveal, 250), { once: true });
    heroImg.addEventListener("error", reveal, { once: true });
    setTimeout(reveal, 2600);
  } else {
    setTimeout(reveal, 450);
  }

  /* ------------------------------------------------------------------------
     Navigation: transparent over hero → ivory on scroll; hides while
     scrolling down far into the page, returns when scrolling up.
     ------------------------------------------------------------------------ */
  const nav = document.getElementById("nav");
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.getElementById("menu");
  const callbar = document.querySelector(".callbar");
  let lastY = window.scrollY;

  function updateNav(y) {
    nav.classList.toggle("is-scrolled", y > 40);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (!body.classList.contains("menu-open")) {
      if (goingDown && y > window.innerHeight * 1.2) nav.classList.add("is-hidden");
      else if (goingUp || y < 200) nav.classList.remove("is-hidden");
    }
    if (callbar) callbar.classList.toggle("is-visible", y > window.innerHeight * 0.8);
    lastY = y;
  }

  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
    menu.setAttribute("aria-hidden", String(!open));
    body.style.overflow = open ? "hidden" : "";
    if (open) {
      nav.classList.remove("is-hidden");
      setTimeout(() => { const first = menu.querySelector("a"); if (first) first.focus({ preventScroll: true }); }, 350);
    }
  }
  // Menu links are not focusable while closed
  function syncMenuTabbing() {
    const open = body.classList.contains("menu-open");
    menu.querySelectorAll("a, button").forEach(el => el.setAttribute("tabindex", open ? "0" : "-1"));
  }
  toggle.addEventListener("click", () => { setMenu(!body.classList.contains("menu-open")); syncMenuTabbing(); });
  menu.addEventListener("click", e => { if (e.target.closest("a")) { setMenu(false); syncMenuTabbing(); } });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && body.classList.contains("menu-open")) { setMenu(false); syncMenuTabbing(); toggle.focus(); }
  });
  syncMenuTabbing();

  // Highlight the current section in the desktop nav
  const navLinks = Array.from(document.querySelectorAll(".nav__links a"));
  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle("is-current", a.getAttribute("href") === "#" + entry.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["villa", "ristorante", "eventi", "galleria", "contatti"].forEach(id => {
    const s = document.getElementById(id); if (s) sectionIO.observe(s);
  });

  /* ------------------------------------------------------------------------
     Scroll reveals (text + photographs)
     Elements get .is-in once, when ~15% inside the viewport.
     ------------------------------------------------------------------------ */
  const revealTargets = document.querySelectorAll("[data-reveal], [data-media]");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add("is-in"));
  }

  /* ------------------------------------------------------------------------
     SCROLL-DRIVEN MOTION
     One rAF-throttled handler per scroll frame (no permanent loop):
       1. Hero: image drifts down & slightly scales, text rises and fades
          faster → two depth planes.
       2. Parallax: images with data-parallax="k" translate by
          (centre offset × k), only while their frame is near the viewport.
       3. Day → Night: sticky stage; section progress p ∈ [0,1] drives
          the crossfade (--night), the second title line (--l2) and the bar.
     ------------------------------------------------------------------------ */
  const hero = document.querySelector(".hero");
  const heroContent = document.querySelector(".hero__content");
  const heroFoot = document.querySelector(".hero__foot");
  const daynight = document.querySelector(".daynight");

  const parallaxItems = Array.from(document.querySelectorAll("[data-parallax]")).map(img => ({
    img,
    frame: img.parentElement,
    k: parseFloat(img.dataset.parallax) || 0.08,
    visible: false
  }));

  // Only compute parallax for frames close to the viewport
  const pIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const item = parallaxItems.find(p => p.frame === entry.target);
      if (item) item.visible = entry.isIntersecting;
    });
  }, { rootMargin: "20% 0px 20% 0px" });
  parallaxItems.forEach(p => pIO.observe(p.frame));

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // smoothstep for soft, film-like interpolation
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function motionAllowed() { return !reduceMotion.matches; }

  function updateHero(y) {
    if (!hero) return;
    const h = hero.offsetHeight;
    if (y > h) return;
    const p = y / h;
    if (motionAllowed()) {
      const factor = isSmall.matches ? 0.18 : 0.32;
      heroImg.style.transform = "translate3d(0," + (y * factor).toFixed(1) + "px,0) scale(" + (1 + p * 0.06).toFixed(4) + ")";
      heroContent.style.transform = "translate3d(0," + (y * -0.12).toFixed(1) + "px,0)";
    }
    heroContent.style.opacity = clamp(1 - p * 1.6, 0, 1).toFixed(3);
    if (root.classList.contains("is-loaded")) heroFoot.style.opacity = clamp(1 - p * 3, 0, 1).toFixed(3);
  }

  function updateParallax() {
    if (!motionAllowed() || isSmall.matches) return;
    const vh = window.innerHeight;
    parallaxItems.forEach(item => {
      if (!item.visible) return;
      const r = item.frame.getBoundingClientRect();
      // -1 (frame below viewport centre) … +1 (above)
      const offset = ((vh / 2) - (r.top + r.height / 2)) / (vh / 2 + r.height / 2);
      const shift = clamp(offset, -1, 1) * item.k * r.height * 0.6;
      item.img.style.translate = "0 " + shift.toFixed(1) + "px";
    });
  }

  function updateDayNight() {
    if (!daynight) return;
    const r = daynight.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) return;
    const p = clamp(-r.top / (r.height - vh), 0, 1);
    const night = smooth(0.28, 0.68, p);
    daynight.style.setProperty("--p", p.toFixed(4));
    daynight.style.setProperty("--night", night.toFixed(4));
    daynight.style.setProperty("--l2", smooth(0.5, 0.82, p).toFixed(4));
    daynight.classList.toggle("is-night", night > 0.5);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      updateNav(y);
      updateHero(y);
      updateParallax();
      updateDayNight();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  reduceMotion.addEventListener && reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) {
      heroImg.style.transform = ""; heroContent.style.transform = "";
      parallaxItems.forEach(p => { p.img.style.translate = ""; });
      revealTargets.forEach(el => el.classList.add("is-in"));
    }
    onScroll();
  });
  onScroll();

  /* ------------------------------------------------------------------------
     Occasions (Matrimoni & Eventi): hover / focus / tap swaps the preview
     ------------------------------------------------------------------------ */
  const occasions = document.querySelectorAll(".occasion");
  const occImgs = document.querySelectorAll("[data-occasion-img]");
  function activate(i) {
    occasions.forEach(o => o.classList.toggle("is-active", o.dataset.occasion === i));
    occImgs.forEach(img => img.classList.toggle("is-active", img.dataset.occasionImg === i));
  }
  occasions.forEach(o => {
    const i = o.dataset.occasion;
    o.addEventListener("mouseenter", () => activate(i));
    o.addEventListener("focus", () => activate(i));
    o.addEventListener("click", () => activate(i));
  });

  /* ------------------------------------------------------------------------
     Lightbox gallery — next / prev / close, keyboard, swipe, focus trap
     ------------------------------------------------------------------------ */
  const items = Array.from(document.querySelectorAll(".g-item"));
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector(".lightbox__img");
  const lbCount = lb.querySelector(".lightbox__count");
  const lbCaption = lb.querySelector(".lightbox__caption");
  const btnClose = lb.querySelector(".lightbox__close");
  const btnPrev = lb.querySelector(".lightbox__prev");
  const btnNext = lb.querySelector(".lightbox__next");
  let current = 0;
  let lastFocus = null;

  const pad = n => String(n).padStart(2, "0");

  function show(i, instant) {
    current = (i + items.length) % items.length;
    const item = items[current];
    const src = item.dataset.full;
    const alt = item.querySelector("img").alt;
    const apply = () => {
      lbImg.src = src;
      lbImg.alt = alt;
      lbCount.textContent = pad(current + 1) + " / " + pad(items.length);
      lbCaption.textContent = item.dataset.caption || "";
      const done = () => lbImg.classList.remove("is-switching");
      if (lbImg.complete) requestAnimationFrame(done); else lbImg.onload = done;
    };
    if (instant) { apply(); return; }
    lbImg.classList.add("is-switching");
    setTimeout(apply, reduceMotion.matches ? 0 : 280);
    // Preload neighbours
    [current + 1, current - 1].forEach(n => { const im = new Image(); im.src = items[(n + items.length) % items.length].dataset.full; });
  }

  function open(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    body.style.overflow = "hidden";
    show(i, true);
    requestAnimationFrame(() => lb.classList.add("is-open"));
    btnClose.focus();
  }
  function close() {
    lb.classList.remove("is-open");
    body.style.overflow = "";
    setTimeout(() => { lb.hidden = true; lbImg.removeAttribute("src"); }, reduceMotion.matches ? 0 : 500);
    if (lastFocus) lastFocus.focus();
  }

  items.forEach((item, i) => item.addEventListener("click", () => open(i)));
  btnClose.addEventListener("click", close);
  btnPrev.addEventListener("click", () => show(current - 1));
  btnNext.addEventListener("click", () => show(current + 1));
  lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lightbox__stage")) close(); });

  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(current + 1);
    else if (e.key === "ArrowLeft") show(current - 1);
    else if (e.key === "Tab") {
      // keep focus inside the dialog
      const f = [btnClose, btnPrev, btnNext];
      const idx = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  // Horizontal swipe (touch / pen)
  let startX = null, startY = null;
  lb.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") { startX = e.clientX; startY = e.clientY; } });
  lb.addEventListener("pointerup", e => {
    if (startX === null) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
    startX = startY = null;
  });
})();
