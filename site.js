/* Visional site.js v0.8: attribuutmodules. Bron: site/site.js in de repo, lijst in docs/site-code.md. Elke module start alleen als zijn data-v-attribuut op de pagina staat. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function num(el, attr, fallback) { var v = parseFloat(el.getAttribute(attr)); return isNaN(v) ? fallback : v; }

  /* data-v-year: zet het huidige jaar (copyright in de footer) */
  each('[data-v-year]', function (el) { el.textContent = new Date().getFullYear(); });

  /* data-v-form: eigen formuliernaam en redirect per instantie (Section - Form). Naam en redirect van een
     formulier in een component zijn niet aan props te koppelen; webflow.js leest data-name bij verzenden en
     data-redirect bij het starten, dus dit moet vóór Webflow.ready draaien (site.js staat in de footer). */
  each('[data-v-form-name], [data-v-form-redirect]', function (wrap) {
    var form = wrap.querySelector('form');
    if (!form) return;
    var name = (wrap.getAttribute('data-v-form-name') || '').trim();
    var redirect = (wrap.getAttribute('data-v-form-redirect') || '').trim();
    if (name) form.setAttribute('data-name', name);
    // Alleen paden op deze site ("/..."), geen externe of protocol-relatieve URL's ("//" of "/\", dat browsers als "//" lezen)
    if (/^\/(?![\/\\])/.test(redirect)) { form.setAttribute('data-redirect', redirect); form.setAttribute('redirect', redirect); }
  });

  /* data-v-before-after: sleepbare voor/na-vergelijking (Section - Before After) */
  each('[data-v-before-after="wrap"]', function (wrap) {
    var after = wrap.querySelector('[data-v-before-after="after"]');
    var handle = wrap.querySelector('[data-v-before-after="handle"]');
    if (!after || !handle) return;
    var pct;
    function set(v) {
      pct = clamp(v, 0, 100);
      handle.style.left = pct + '%';
      after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      handle.setAttribute('aria-valuenow', Math.round(pct));
    }
    function fromPointer(e) { var r = wrap.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); }
    handle.setAttribute('role', 'slider');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    if (!handle.hasAttribute('aria-label')) handle.setAttribute('aria-label', 'Vergelijk voor en na');
    wrap.style.touchAction = 'pan-y';
    wrap.addEventListener('dragstart', function (e) { e.preventDefault(); });
    // Muis: springt naar de klik. Touch: volgt de beweging vanaf de huidige stand, zodat een verticale veeg (scrollen) niets verschuift
    var start = null;
    wrap.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      wrap.setPointerCapture(e.pointerId);
      start = { id: e.pointerId, x: e.clientX, pct: pct, touch: e.pointerType === 'touch' };
      if (!start.touch) fromPointer(e);
      handle.focus({ preventScroll: true });
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!start || start.id !== e.pointerId) return;
      if (start.touch) set(start.pct + (e.clientX - start.x) / wrap.getBoundingClientRect().width * 100);
      else fromPointer(e);
    });
    wrap.addEventListener('pointerup', function () { start = null; });
    wrap.addEventListener('pointercancel', function () { if (start && start.touch) set(start.pct); start = null; });
    handle.addEventListener('keydown', function (e) {
      var keys = { ArrowLeft: pct - 5, ArrowDown: pct - 5, ArrowRight: pct + 5, ArrowUp: pct + 5, Home: 0, End: 100 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      set(keys[e.key]);
    });
    set(num(wrap, 'data-v-before-after-initial', 50));
  });

  /* data-v-slider: kaartenslider met vorige/volgende en swipen (Section - Reviews), gedrag als Swiper op live.
     Het aantal zichtbare kaarten komt uit de CSS van de items (flex-basis per breakpoint). */
  each('[data-v-slider="wrap"]', function (wrap) {
    var track = wrap.querySelector('[data-v-slider="track"]');
    if (!track || !track.children.length) return;
    var items = track.children;
    var view = track.parentElement;
    var prev = wrap.querySelector('[data-v-slider="prev"]');
    var next = wrap.querySelector('[data-v-slider="next"]');
    var index = 0, stride = 0, max = 0, drag = null, dragged = false;
    function measure() {
      stride = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : items[0].offsetWidth;
      var gap = stride - items[0].offsetWidth;
      max = Math.max(0, items.length - Math.max(1, Math.round((view.clientWidth + gap) / stride)));
    }
    function move(x, animate) {
      track.style.transition = animate && !reduce.matches ? 'transform 300ms ease' : 'none';
      track.style.transform = 'translate3d(' + x + 'px, 0, 0)';
    }
    function button(el, off) {
      if (!el) return;
      el.setAttribute('aria-disabled', off);
      el.setAttribute('tabindex', off ? '-1' : '0');
      el.style.opacity = off ? '0.2' : '';
      el.style.cursor = off ? 'not-allowed' : '';
      el.style.display = max ? '' : 'none';
    }
    function go(i, animate) {
      index = clamp(i, 0, max);
      move(-index * stride, animate);
      button(prev, index === 0);
      button(next, index === max);
    }
    [[prev, -1], [next, 1]].forEach(function (b) {
      if (!b[0]) return;
      b[0].setAttribute('role', 'button');
      b[0].addEventListener('click', function () { go(index + b[1], true); });
      b[0].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(index + b[1], true); }
      });
    });
    track.setAttribute('aria-live', 'polite');
    [].forEach.call(items, function (item, i) {
      item.setAttribute('role', 'group');
      item.setAttribute('aria-label', (i + 1) + ' / ' + items.length);
    });
    view.style.overflow = 'hidden';
    view.style.touchAction = 'pan-y';
    view.addEventListener('dragstart', function (e) { e.preventDefault(); });
    view.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !max) return;
      if (e.pointerType === 'mouse') e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, t: Date.now() };
      dragged = false;
      view.setPointerCapture(e.pointerId);
    });
    view.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) dragged = true;
      move(-index * stride + dx, false);
    });
    function end(e) {
      if (!drag || drag.id !== e.pointerId) return;
      // pointercancel (bijv. verticaal scrollen op touch): terug naar de huidige kaart
      var dx = e.type === 'pointercancel' ? 0 : e.clientX - drag.x;
      var steps = Math.round(-dx / stride);
      // Korte, snelle veeg gaat ook een kaart verder (zoals Swiper)
      if (!steps && Date.now() - drag.t < 300 && Math.abs(dx) > 10) steps = dx < 0 ? 1 : -1;
      drag = null;
      go(index + steps, true);
    }
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    view.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    window.addEventListener('resize', function () { measure(); go(index, false); });
    measure();
    go(0, false);
  });

  /* data-v-video: achtergrondvideo (Section - Hero Home). De URL staat in data-v-video en niet in src, met autoplay eraf: zo speelt
     de Designer hem niet af (geluid, half gevuld); daar staat de poster eronder. Hier zetten we muted als property, dan pas src.
     Bij prefers-reduced-motion blijft de poster staan. */
  each('video[data-v-video]', function (v) {
    if (reduce.matches) return;
    v.muted = true;
    v.src = v.getAttribute('data-v-video');
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  });

  /* data-v-parallax: achtergrond schuift mee bij scrollen (Section - Hero Home), zoals live data-parallax met GSAP.
     Verschuiving in % van de eigen hoogte, van data-v-parallax-start (0) naar data-v-parallax-end (8),
     terwijl de ouder van zijn bovenkant (of het begin van de pagina) tot zijn onderkant door de bovenrand van het scherm gaat. */
  var parallax = document.querySelectorAll('[data-v-parallax]');
  if (parallax.length) {
    var ticking = false;
    var update = function () {
      ticking = false;
      [].forEach.call(parallax, function (el) {
        if (reduce.matches) { el.style.transform = ''; return; }
        var r = el.parentElement.getBoundingClientRect();
        var top = r.top + window.scrollY;
        var start = Math.max(0, top), end = top + r.height;
        var p = end > start ? clamp((window.scrollY - start) / (end - start), 0, 1) : 0;
        var from = num(el, 'data-v-parallax-start', 0), to = num(el, 'data-v-parallax-end', 8);
        el.style.transform = 'translate3d(0, ' + (from + (to - from) * p) + '%, 0)';
      });
    };
    var request = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    if (reduce.addEventListener) reduce.addEventListener('change', request);
    update();
  }

  /* GSAP: Webflow laadt gsap al voor de Interactions (IX3) van de nav. Ontbreekt het op een pagina, dan laden we
     dezelfde versie als visional.nl van het Webflow-CDN. */
  function withGsap(fn) {
    if (window.gsap) return fn(window.gsap);
    var s = document.createElement('script');
    s.src = 'https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js';
    s.onload = function () { if (window.gsap) fn(window.gsap); };
    document.head.appendChild(s);
  }

  /* data-v-hover: hover-animatie met GSAP, alleen op desktop met muis (zoals de Interactions op live).
     data-v-hover op het element waar je overheen gaat; kinderen met data-v-hover-x en/of -y (rem, px of %) en/of
     data-v-hover-scale bewegen mee. Duur in seconden: data-v-hover-duration (standaard 0.6) en -duration-out (0.4).
     Na het teruggaan neemt de class de stijl weer over (clearProps). */
  var hovers = document.querySelectorAll('[data-v-hover]');
  if (hovers.length) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
    function axis(t, name, vars) {
      var v = t.getAttribute('data-v-hover-' + name);
      if (v === null) return;
      var pct = /%$/.test(v);
      vars[name] = pct ? 0 : v;
      vars[name + 'Percent'] = pct ? parseFloat(v) : 0;
    }
    [].forEach.call(hovers, function (trigger) {
      var targets = [].filter.call(trigger.querySelectorAll('[data-v-hover-x], [data-v-hover-y], [data-v-hover-scale]'), function (t) {
        return t.closest('[data-v-hover]') === trigger;
      });
      if (!targets.length) return;
      trigger.addEventListener('mouseenter', function () {
        if (!desktop.matches || reduce.matches) return;
        targets.forEach(function (t) {
          // Ruststand uit de class (ook een translate in %) onthouden, zodat het terugkeren klopt
          if (!t._vRest) t._vRest = { x: gsap.getProperty(t, 'x'), y: gsap.getProperty(t, 'y'), xPercent: gsap.getProperty(t, 'xPercent'), yPercent: gsap.getProperty(t, 'yPercent'), scale: gsap.getProperty(t, 'scale') };
          var vars = { duration: num(t, 'data-v-hover-duration', 0.6), ease: 'expo.out', overwrite: true };
          axis(t, 'x', vars);
          axis(t, 'y', vars);
          if (t.hasAttribute('data-v-hover-scale')) vars.scale = num(t, 'data-v-hover-scale', 1);
          gsap.to(t, vars);
        });
      });
      trigger.addEventListener('mouseleave', function () {
        targets.forEach(function (t) {
          var rest = t._vRest;
          if (!rest) return;
          gsap.to(t, { x: rest.x, y: rest.y, xPercent: rest.xPercent, yPercent: rest.yPercent, scale: rest.scale, duration: num(t, 'data-v-hover-duration-out', 0.4), ease: 'expo.out', overwrite: true,
            onComplete: function () { gsap.set(t, { clearProps: 'transform' }); t._vRest = null; } });
        });
      });
    });
  });

  /* data-v-counter: telt het getal op van 0 tot de waarde als het in beeld komt, in 1 seconde (zoals counterUp op live).
     Op de titel van Item - Feature, aan met de prop Tel op (Webflow schrijft data-v-counter="True"). Alleen hele getallen. */
  var counters = [].filter.call(document.querySelectorAll('[data-v-counter="true" i]'), function (el) { return /^\d+$/.test(el.textContent.trim()); });
  if (counters.length && !reduce.matches && 'IntersectionObserver' in window) withGsap(function (gsap) {
    counters.forEach(function (el) {
      var end = parseInt(el.textContent.trim(), 10), n = { v: 0 };
      // Het echte getal blijft staan tot het tellen begint (zoeken en voorlezen zien zo nooit een 0)
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        el.textContent = '0';
        gsap.to(n, { v: end, duration: 1, ease: 'none', onUpdate: function () { el.textContent = Math.round(n.v); } });
      });
      io.observe(el);
    });
  });

  /* data-v-sticky: vaste foto naast tekstblokken (Section - Sticky Image), zoals Layout 348 op live /samenwerken.
     De foto van het blok dat het midden van het scherm raakt, fadet in (0.5 s); de andere uit. De n-de
     data-v-sticky="image" hoort bij het n-de data-v-sticky="block". Op mobiel is de vaste kolom verborgen (CSS). */
  each('[data-v-sticky="wrap"]', function (wrap) {
    var images = wrap.querySelectorAll('[data-v-sticky="image"]');
    var blocks = [].slice.call(wrap.querySelectorAll('[data-v-sticky="block"]'));
    if (!images.length || !blocks.length || !('IntersectionObserver' in window)) return;
    withGsap(function (gsap) {
      gsap.set(images, { opacity: 0 });
      // Een lijn van 0 px hoog op het midden van het scherm: een blok is actief zolang die lijn erdoor loopt
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var img = images[blocks.indexOf(e.target)];
          if (img) gsap.to(img, { opacity: e.isIntersecting ? 1 : 0, duration: reduce.matches ? 0 : 0.5, ease: 'power1.inOut', overwrite: true });
        });
      }, { rootMargin: '-50% 0px -50% 0px' });
      blocks.forEach(function (b) { io.observe(b); });
    });
  });

  /* data-v-calculator: rendementscalculator in 3 stappen (Section - Calculator). Toont één stap tegelijk, controleert de
     velden per stap en rekent de demo-indicatie uit: woonoppervlak = m2 x ratio / aantal, huur = woonoppervlak x tarief.
     Tarief (euro per m2 per maand) en ratio staan als attribuut op de sectie. De uitkomst gaat als verborgen velden mee
     met het Webflow-formulier. Stijl van de actieve stap inline, zodat site.css niet hoeft te wijzigen. */
  each('[data-v-calculator="wrap"]', function (wrap) {
    var form = wrap.querySelector('form[data-v-calculator="form"]');
    var steps = wrap.querySelectorAll('[data-v-calculator-step]');
    if (!form || !steps.length) return;
    var progress = wrap.querySelectorAll('[data-v-calculator-progress]');
    var last = steps.length, current = 1;
    var money = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    function step(n) { return wrap.querySelector('[data-v-calculator-step="' + n + '"]'); }
    function input(name) { return form.querySelector('[data-v-calculator-input="' + name + '"]'); }
    function output(name, text) { var el = wrap.querySelector('[data-v-calculator-output="' + name + '"]'); if (el) el.textContent = text; }
    function hidden(name, value) {
      var el = form.querySelector('input[type="hidden"][name="' + name + '"]');
      if (!el) { el = document.createElement('input'); el.type = 'hidden'; el.name = name; form.appendChild(el); }
      el.value = value;
    }
    function show(n, focus) {
      current = n;
      [].forEach.call(steps, function (s) { s.style.display = s.getAttribute('data-v-calculator-step') === String(n) ? '' : 'none'; });
      [].forEach.call(progress, function (p) {
        var i = parseInt(p.getAttribute('data-v-calculator-progress'), 10);
        if (i === n) p.setAttribute('aria-current', 'step'); else p.removeAttribute('aria-current');
        p.style.borderTopColor = i <= n ? 'var(--_theme---action--primary)' : '';
        p.style.color = i <= n ? 'var(--_theme---text--primary)' : '';
      });
      if (!focus) return;
      var title = step(n).querySelector('h3');
      if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
      if (wrap.querySelector('[data-v-calculator-progress]').getBoundingClientRect().top < 0) {
        (progress[0] || form).scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
      }
    }
    function valid(n) {
      var fields = step(n).querySelectorAll('input, select, textarea');
      for (var i = 0; i < fields.length; i++) {
        if (!fields[i].checkValidity()) { fields[i].reportValidity(); return false; }
      }
      return true;
    }
    function calculate() {
      var project = input('project').value;
      var rate = num(wrap, 'data-v-calculator-rate-' + project.toLowerCase(), 0);
      var ratio = num(wrap, 'data-v-calculator-ratio', 0.85);
      var m2 = parseFloat(input('m2').value), units = parseInt(input('units').value, 10);
      var size = m2 * ratio / units;
      // Huur afgerond op 5 euro: een indicatie, geen exacte prijs
      var rent = Math.round(size * rate / 5) * 5;
      var year = rent * units * 12;
      output('size', Math.round(size) + ' m²');
      output('rent', money.format(rent) + ' /mnd');
      output('year', money.format(year));
      hidden('Woonoppervlak per appartement', Math.round(size) + ' m2');
      hidden('Huur per appartement', money.format(rent) + ' per maand');
      hidden('Totale huur per jaar', money.format(year));
    }
    function go(dir) {
      if (dir > 0) {
        if (!valid(current)) return;
        if (current === last - 1) calculate();
      }
      var n = clamp(current + dir, 1, last);
      if (n !== current) show(n, true);
    }
    [].forEach.call(wrap.querySelectorAll('[data-v-calculator="next"], [data-v-calculator="prev"]'), function (b) {
      b.setAttribute('role', 'button');
      b.setAttribute('tabindex', '0');
      b.addEventListener('click', function (e) { e.preventDefault(); go(b.getAttribute('data-v-calculator') === 'next' ? 1 : -1); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); }
      });
    });
    // Enter in een veld gaat naar de volgende stap in plaats van het formulier te verzenden
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || current === last || e.target.tagName === 'TEXTAREA') return;
      if (e.target.matches('[data-v-calculator="next"], [data-v-calculator="prev"]')) return;
      e.preventDefault();
      go(1);
    });
    // Vangnet: verzenden kan alleen vanuit de laatste stap (webflow.js luistert op document, dus stopPropagation houdt het tegen)
    form.addEventListener('submit', function (e) {
      if (current === last) return;
      e.preventDefault();
      e.stopPropagation();
      go(1);
    }, true);
    show(1, false);
  });

  /* data-v-embed: auto-hoogte en dataLayer voor de projectcheck-iframe (Section - Embed), zoals live.
     De allowlist staat bewust hier en niet in een attribuut: alleen deze origins mogen de hoogte zetten of events sturen. */
  var frames = document.querySelectorAll('iframe[data-v-embed]');
  if (frames.length) {
    var ORIGINS = ['https://visionalprojectscan.lovable.app'];
    // GA4 kapt parameterwaarden af op 100 tekens; zelf afkappen houdt de rapporten leesbaar
    var clip = function (v) {
      if (v === undefined || v === null) return undefined;
      return typeof v === 'boolean' ? v : String(v).slice(0, 100);
    };
    window.addEventListener('message', function (e) {
      if (ORIGINS.indexOf(e.origin) === -1) return;
      var d = e.data;
      if (!d || typeof d !== 'object' || d.source !== 'visional_projectcheck') return;
      if (d.type === 'resize' || d.event === 'resize') {
        if (typeof d.height !== 'number' || !(d.height > 0)) return;
        [].forEach.call(frames, function (f) { if (f.contentWindow === e.source) f.style.height = Math.ceil(d.height) + 'px'; });
        return;
      }
      if (typeof d.event !== 'string' || d.event.indexOf('projectcheck_') !== 0) return;
      // Alle pc_-keys altijd meesturen (ook leeg), zodat geen waarde van een vorig event in het GTM-datamodel blijft hangen
      (window.dataLayer = window.dataLayer || []).push({
        event: d.event,
        pc_variant: clip(d.variant),
        pc_step: clip(d.step),
        pc_step_name: clip(d.step_name),
        pc_property_type: clip(d.property_type),
        pc_intervention: clip(d.intervention),
        pc_phase: clip(d.phase),
        pc_has_files: clip(d.has_files),
        pc_message: clip(d.message)
      });
    });
  }
})();
