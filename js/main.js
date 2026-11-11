/* Revanth Umakanth — portfolio interactions */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- nav: scrolled state, progress, mobile menu ---------- */
  const nav = $(".nav");
  const progress = $(".scroll-progress span");
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 12);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const toggle = $(".nav__toggle");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$(".nav__links a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // active section highlight
  const links = new Map($$(".nav__links a").map((a) => [a.getAttribute("href").slice(1), a]));
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove("is-active"));
      const a = links.get(e.target.id);
      if (a) a.classList.add("is-active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => secObs.observe(s));

  /* ---------- reveal on scroll + counters ---------- */
  const fmt = (n, dec) => n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const runCounter = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const pre = el.dataset.prefix || "";
    const suf = el.dataset.suffix || "";
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(target * e, dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add("is-in");
      $$("[data-count]", el).forEach(runCounter);
      if (el.classList.contains("reveal-group")) setTimeout(() => el.classList.add("is-done"), 1300);
      revObs.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal, .reveal-group").forEach((el) => revObs.observe(el));

  /* ---------- card spotlight + tilt ---------- */
  if (finePointer) {
    document.addEventListener("pointermove", (ev) => {
      const card = ev.target.closest(".card-glow");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${ev.clientX - r.left}px`);
      card.style.setProperty("--my", `${ev.clientY - r.top}px`);
    }, { passive: true });

    if (!reduceMotion) {
      $$(".tilt").forEach((card) => {
        card.addEventListener("pointermove", (ev) => {
          const r = card.getBoundingClientRect();
          const x = (ev.clientX - r.left) / r.width - 0.5;
          const y = (ev.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(1000px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-4px)`;
        });
        card.addEventListener("pointerleave", () => {
          card.style.transition = "transform .6s cubic-bezier(.2,.7,.2,1), border-color .3s, box-shadow .4s";
          card.style.transform = "";
          setTimeout(() => (card.style.transition = ""), 600);
        });
      });
    }
  }

  /* ---------- modals (resume, project details) + lightbox ---------- */
  const lock = () => document.body.classList.toggle("is-locked", !!$(".modal:not([hidden]), .lightbox:not([hidden])"));
  const focusStack = [];
  const open = (dlg) => {
    focusStack.push(document.activeElement);
    dlg.hidden = false; lock();
    $("[data-close].modal__close, .lightbox__close", dlg)?.focus();
    setMenu(false);
  };
  const close = (dlg) => {
    dlg.hidden = true; lock();
    focusStack.pop()?.focus();
  };

  $$("[data-open-modal]").forEach((b) => b.addEventListener("click", () => open($("#" + b.dataset.openModal))));
  $$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(m); }));

  const lb = $("#lightbox");
  const lbImg = $("img", lb);
  const lbCap = $("figcaption", lb);
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-lightbox]");
    if (!t) return;
    e.preventDefault();
    lbImg.src = t.dataset.lightbox;
    lbImg.alt = $("img", t)?.alt || t.dataset.caption || "";
    lbCap.textContent = t.dataset.caption || "";
    open(lb);
  });
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest("[data-close]")) { close(lb); lbImg.src = ""; } });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!lb.hidden) { close(lb); lbImg.src = ""; return; }
    const m = $(".modal:not([hidden])");
    if (m) close(m);
    else if (nav.classList.contains("is-open")) setMenu(false);
  });

  /* ---------- copy email ---------- */
  const toast = $("#toast");
  let toastT;
  const say = (msg) => { toast.textContent = msg; toast.classList.add("is-on"); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("is-on"), 1800); };
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); say("Email copied"); }
    catch { say(b.dataset.copy); }
  }));

  /* ---------- route card: truck along best route ---------- */
  const route = $(".route--best");
  const truck = $(".truck");
  if (route && truck) {
    const len = route.getTotalLength();
    let t0 = null, visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(drive); }, { threshold: 0.2 }).observe(route.closest("svg"));
    const drive = (t) => {
      if (!visible) { t0 = null; return; }
      if (t0 === null) t0 = t;
      const p = ((t - t0) / 6000) % 1;
      const a = route.getPointAtLength(p * len);
      const b = route.getPointAtLength(Math.min(p * len + 1, len));
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      truck.setAttribute("transform", `translate(${a.x} ${a.y}) rotate(${ang})`);
      requestAnimationFrame(drive);
    };
  }

  $("#year").textContent = new Date().getFullYear();
})();
