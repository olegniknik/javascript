document.addEventListener('DOMContentLoaded', () => {

  const SCROLL_THRESHOLD = 60;
  const COUNTER_DURATION = 2000;
  const CAROUSEL_GAP = 24;
  const SWIPE_MIN_DISTANCE = 50;
  const PARTICLE_INTERVAL = 400;
  const PARTICLE_INITIAL_COUNT = 15;
  const MODAL_RESET_DELAY = 300;
  const FORM_SUBMIT_DELAY = 1200;
  const NAV_SCROLL_OFFSET = 100;

  // ── Helper: safe querySelector with optional event binding ──
  function bindClick(parent, selector, handler) {
    const el = parent.querySelector(selector);
    if (el) el.addEventListener('click', handler);
    return el;
  }

  // ── Header scroll effect ──
  function initHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    window.addEventListener('scroll', () => {
      header.classList.toggle('header--scrolled', window.scrollY > SCROLL_THRESHOLD);
    });
  }

  // ── Mobile menu ──
  function initMobileMenu() {
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');
    if (!burger || !nav) return;

    function closeMenu() {
      burger.classList.remove('burger--active');
      nav.classList.remove('nav--open');
      document.body.style.overflow = '';
    }

    burger.addEventListener('click', () => {
      burger.classList.toggle('burger--active');
      nav.classList.toggle('nav--open');
      document.body.style.overflow = nav.classList.contains('nav--open') ? 'hidden' : '';
    });

    nav.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  }

  // ── Counter animation ──
  function initCounters() {
    const statsEl = document.querySelector('.hero__stats');
    if (!statsEl) return;

    function animateCounters() {
      document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count, 10);
        const start = performance.now();

        function update(now) {
          const progress = Math.min((now - start) / COUNTER_DURATION, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target).toLocaleString('ru-RU');
          if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounters();
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });

    observer.observe(statsEl);
  }

  // ── Problem cards toggle ──
  function initProblemCards() {
    const cards = document.querySelectorAll('.problem-card');
    if (!cards.length) return;

    cards.forEach(card => {
      card.addEventListener('click', () => {
        const wasActive = card.classList.contains('problem-card--active');
        cards.forEach(c => c.classList.remove('problem-card--active'));
        if (!wasActive) card.classList.add('problem-card--active');
      });
    });
  }

  // ── Accessories tabs ──
  function initAccessoriesTabs() {
    const tabs = document.querySelectorAll('.accessories__tab');
    const panels = document.querySelectorAll('.accessories__panel');
    if (!tabs.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const wasActive = tab.classList.contains('accessories__tab--active');

        tabs.forEach(t => t.classList.remove('accessories__tab--active'));
        panels.forEach(p => p.classList.remove('accessories__panel--active'));

        if (!wasActive) {
          tab.classList.add('accessories__tab--active');
          const panel = document.querySelector(`.accessories__panel[data-panel="${tab.dataset.tab}"]`);
          if (panel) panel.classList.add('accessories__panel--active');
        }
      });
    });
  }

  // ── Reviews carousel ──
  function initReviewsCarousel() {
    const track = document.getElementById('reviewsTrack');
    if (!track) return;

    const cards = Array.from(track.children);
    const dotsContainer = document.getElementById('reviewsDots');
    const prevBtn = document.getElementById('prevReview');
    const nextBtn = document.getElementById('nextReview');
    let currentSlide = 0;
    let slidesPerView = 3;

    function getVisibleSlides() {
      const w = window.innerWidth;
      if (w <= 768) return 1;
      if (w <= 1024) return 2;
      return 3;
    }

    function getTotalPages() {
      return Math.max(1, cards.length - slidesPerView + 1);
    }

    function buildDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      const pages = getTotalPages();
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement('button');
        dot.className = 'reviews__dot' + (i === currentSlide ? ' reviews__dot--active' : '');
        dot.setAttribute('aria-label', `Слайд ${i + 1}`);
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
      }
    }

    function goToSlide(index) {
      currentSlide = Math.max(0, Math.min(index, getTotalPages() - 1));
      const cardEl = cards[0];
      if (!cardEl) return;
      const cardWidth = cardEl.offsetWidth + CAROUSEL_GAP;
      track.style.transform = `translateX(-${currentSlide * cardWidth}px)`;
      buildDots();
    }

    function refresh() {
      slidesPerView = getVisibleSlides();
      currentSlide = Math.min(currentSlide, getTotalPages() - 1);
      goToSlide(currentSlide);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    // Touch swipe
    let touchStartX = 0;

    track.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > SWIPE_MIN_DISTANCE) {
        goToSlide(currentSlide + (diff > 0 ? 1 : -1));
      }
    }, { passive: true });

    refresh();
    window.addEventListener('resize', refresh);
  }

  // ── Modal ──
  function initModal() {
    const modal = document.getElementById('bookingModal');
    if (!modal) return;

    const form = document.getElementById('bookingForm');
    const formSuccess = document.getElementById('formSuccess');

    function openModal() {
      modal.classList.add('modal--active');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('modal--active');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (form) { form.reset(); form.style.display = ''; }
        if (formSuccess) formSuccess.classList.remove('form__success--visible');
      }, MODAL_RESET_DELAY);
    }

    document.querySelectorAll('[data-modal="booking"]').forEach(btn => {
      btn.addEventListener('click', openModal);
    });

    bindClick(modal, '.modal__overlay', closeModal);
    bindClick(modal, '.modal__close', closeModal);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('modal--active')) {
        closeModal();
      }
    });

    // Form submission
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.textContent = 'Отправляем...';
        btn.disabled = true;

        setTimeout(() => {
          form.style.display = 'none';
          formSuccess.classList.add('form__success--visible');
          btn.textContent = 'Отправить заявку';
          btn.disabled = false;
        }, FORM_SUBMIT_DELAY);
      });
    }
  }

  // ── Phone mask ──
  function initPhoneMask() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', e => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length === 0) { e.target.value = ''; return; }
      if (val[0] === '8') val = '7' + val.slice(1);
      if (val[0] !== '7') val = '7' + val;

      let formatted = '+7';
      if (val.length > 1) formatted += ' (' + val.slice(1, 4);
      if (val.length > 4) formatted += ') ' + val.slice(4, 7);
      if (val.length > 7) formatted += '-' + val.slice(7, 9);
      if (val.length > 9) formatted += '-' + val.slice(9, 11);

      e.target.value = formatted;
    });
  }

  // ── Scroll reveal ──
  function initScrollReveal() {
    const fadeElements = document.querySelectorAll(
      '.problem-card, .service-card, .accessory-card, .review-card, .contact-item, .section-title, .section-subtitle'
    );
    if (!fadeElements.length) return;

    fadeElements.forEach(el => el.classList.add('fade-in'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in--visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    fadeElements.forEach(el => observer.observe(el));
  }

  // ── Hero particles ──
  function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    function createParticle() {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = Math.random() * 6 + 2;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.bottom = '-10px';
      const duration = Math.random() * 6 + 4;
      particle.style.animationDuration = duration + 's';
      container.appendChild(particle);
      setTimeout(() => particle.remove(), duration * 1000);
    }

    setInterval(createParticle, PARTICLE_INTERVAL);
    for (let i = 0; i < PARTICLE_INITIAL_COUNT; i++) {
      setTimeout(createParticle, i * 200);
    }
  }

  // ── Active nav link highlight on scroll ──
  function initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY + NAV_SCROLL_OFFSET;
      sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const link = document.querySelector(`.nav__link[href="#${section.id}"]`);
        if (link) {
          link.style.color = (scrollY >= top && scrollY < top + height)
            ? 'var(--color-text)'
            : '';
        }
      });
    });
  }

  // ── Launch ──
  initHeader();
  initMobileMenu();
  initCounters();
  initProblemCards();
  initAccessoriesTabs();
  initReviewsCarousel();
  initModal();
  initPhoneMask();
  initScrollReveal();
  initParticles();
  initNavHighlight();

});
