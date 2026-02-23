document.addEventListener('DOMContentLoaded', () => {

  // ── Header scroll effect ──
  const header = document.getElementById('header');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    header.classList.toggle('header--scrolled', currentScroll > 60);
    lastScroll = currentScroll;
  });

  // ── Mobile menu ──
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  burger.addEventListener('click', () => {
    burger.classList.toggle('burger--active');
    nav.classList.toggle('nav--open');
    document.body.style.overflow = nav.classList.contains('nav--open') ? 'hidden' : '';
  });

  nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      burger.classList.remove('burger--active');
      nav.classList.remove('nav--open');
      document.body.style.overflow = '';
    });
  });

  // ── Counter animation ──
  function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const duration = 2000;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = current.toLocaleString('ru-RU');
        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
    });
  }

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        statsObserver.disconnect();
      }
    });
  }, { threshold: 0.5 });

  const statsEl = document.querySelector('.hero__stats');
  if (statsEl) statsObserver.observe(statsEl);

  // ── Problem cards toggle ──
  document.querySelectorAll('.problem-card').forEach(card => {
    card.addEventListener('click', () => {
      const wasActive = card.classList.contains('problem-card--active');
      document.querySelectorAll('.problem-card').forEach(c =>
        c.classList.remove('problem-card--active')
      );
      if (!wasActive) card.classList.add('problem-card--active');
    });
  });

  // ── Reviews carousel ──
  const track = document.getElementById('reviewsTrack');
  const cards = track ? Array.from(track.children) : [];
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
    const pages = getTotalPages();
    currentSlide = Math.max(0, Math.min(index, pages - 1));
    const cardEl = cards[0];
    if (!cardEl) return;
    const gap = 24;
    const cardWidth = cardEl.offsetWidth + gap;
    track.style.transform = `translateX(-${currentSlide * cardWidth}px)`;
    buildDots();
  }

  function initCarousel() {
    slidesPerView = getVisibleSlides();
    currentSlide = Math.min(currentSlide, getTotalPages() - 1);
    goToSlide(currentSlide);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

  initCarousel();
  window.addEventListener('resize', initCarousel);

  // Touch swipe for carousel
  let touchStartX = 0;
  let touchEndX = 0;

  if (track) {
    track.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goToSlide(currentSlide + 1);
        else goToSlide(currentSlide - 1);
      }
    }, { passive: true });
  }

  // ── Modal ──
  const modal = document.getElementById('bookingModal');
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
      if (form) form.reset();
      if (form) form.style.display = '';
      if (formSuccess) formSuccess.classList.remove('form__success--visible');
    }, 300);
  }

  document.querySelectorAll('[data-modal="booking"]').forEach(btn => {
    btn.addEventListener('click', openModal);
  });

  modal.querySelector('.modal__overlay').addEventListener('click', closeModal);
  modal.querySelector('.modal__close').addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('modal--active')) {
      closeModal();
    }
  });

  // ── Form submission ──
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
      }, 1200);
    });
  }

  // ── Phone mask ──
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
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
  const fadeElements = document.querySelectorAll(
    '.problem-card, .service-card, .review-card, .contact-item, .section-title, .section-subtitle'
  );

  fadeElements.forEach(el => el.classList.add('fade-in'));

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in--visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  fadeElements.forEach(el => fadeObserver.observe(el));

  // ── Hero particles ──
  const particlesContainer = document.getElementById('particles');

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
    particlesContainer.appendChild(particle);
    setTimeout(() => particle.remove(), duration * 1000);
  }

  if (particlesContainer) {
    setInterval(createParticle, 400);
    for (let i = 0; i < 15; i++) {
      setTimeout(createParticle, i * 200);
    }
  }

  // ── Active nav link highlight on scroll ──
  const sections = document.querySelectorAll('section[id]');

  function highlightNav() {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = document.querySelector(`.nav__link[href="#${id}"]`);
      if (link) {
        if (scrollY >= top && scrollY < top + height) {
          link.style.color = 'var(--color-text)';
        } else {
          link.style.color = '';
        }
      }
    });
  }

  window.addEventListener('scroll', highlightNav);
});
