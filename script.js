document.addEventListener('DOMContentLoaded', () => {

  // API бэкенда (booking-scaffold). Для продакшена заменить на ваш URL.
  const API_URL = window.API_URL || 'http://localhost:3000';
  const ADMIN_TOKEN_KEY = 'admin_token';

  function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }
  function setAdminToken(token) {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  }

  // ── Админка: вход и показ заявок ──
  const adminSection = document.getElementById('adminSection');
  const adminLoginModal = document.getElementById('adminLoginModal');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminLoginError = document.getElementById('adminLoginError');
  const adminLoginModalClose = document.getElementById('adminLoginModalClose');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const adminLeadsLoading = document.getElementById('adminLeadsLoading');
  const adminLeadsList = document.getElementById('adminLeadsList');

  function openAdminLoginModal() {
    if (adminLoginModal) {
      adminLoginModal.classList.add('modal--active');
      document.body.style.overflow = 'hidden';
      if (adminLoginError) adminLoginError.textContent = '';
    }
  }
  // Перезаписываем глобальную функцию из inline-скрипта — эта версия ещё и сбрасывает ошибку
  window.openAdminModal = openAdminLoginModal;

  function closeAdminLoginModal() {
    if (adminLoginModal) {
      adminLoginModal.classList.remove('modal--active');
      document.body.style.overflow = '';
    }
  }

  // XSS-безопасная замена спецсимволов без создания DOM-элемента на каждый вызов
  const _escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, ch => _escapeMap[ch]);
  }

  function formatDate(s) {
    if (!s) return '—';
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString('ru');
  }

  async function loadAdminLeads() {
    if (!adminLeadsLoading || !adminLeadsList) return;
    const token = getAdminToken();
    if (!token) return;
    adminLeadsLoading.hidden = false;
    adminLeadsList.innerHTML = '';
    try {
      const res = await fetch(API_URL + '/api/leads', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.status === 401) {
        setAdminToken(null);
        adminSection.hidden = true;
        return;
      }
      const data = await res.json();
      adminLeadsLoading.hidden = true;
      if (!Array.isArray(data) || data.length === 0) {
        adminLeadsList.innerHTML = '<p style="color:var(--color-text-muted);padding:24px 0;">Нет заявок</p>';
        return;
      }
      const rows = data
        .map(
          (l) =>
            '<tr><td>' + escapeHtml(l.name) + '</td><td>' + escapeHtml(l.phone) + '</td><td>' + escapeHtml(l.problem || '—') + '</td><td>' + formatDate(l.createdAt) + '</td></tr>'
        )
        .join('');
      adminLeadsList.innerHTML =
        '<table><thead><tr><th>Имя</th><th>Телефон</th><th>Проблема</th><th>Дата</th></tr></thead><tbody>' + rows + '</tbody></table>';
    } catch (e) {
      adminLeadsLoading.hidden = true;
      adminLeadsList.innerHTML = '<p style="color:#ef4444;">Не удалось загрузить заявки. Проверьте, что бэкенд запущен по адресу ' + API_URL + '</p>';
    }
  }

  // Закрытие модалки: кнопка-крестик и overlay
  if (adminLoginModalClose) {
    adminLoginModalClose.addEventListener('click', closeAdminLoginModal);
  }
  if (adminLoginModal) {
    const overlay = adminLoginModal.querySelector('.modal__overlay');
    if (overlay) overlay.addEventListener('click', closeAdminLoginModal);
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      if (adminLoginError) adminLoginError.textContent = '';
      try {
        const res = await fetch(API_URL + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (adminLoginError) adminLoginError.textContent = data.message || 'Неверный email или пароль';
          return;
        }
        setAdminToken(data.access_token);
        closeAdminLoginModal();
        adminSection.hidden = false;
        loadAdminLeads();
        adminSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        if (adminLoginError) adminLoginError.textContent = 'Ошибка сети. Запущен ли бэкенд по адресу ' + API_URL + '?';
      }
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      setAdminToken(null);
      adminSection.hidden = true;
    });
  }

  // Если токен уже есть — проверяем и показываем админку
  (async function checkAdminOnLoad() {
    const token = getAdminToken();
    if (!token || !adminSection) return;
    try {
      const res = await fetch(API_URL + '/api/leads', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.status === 200) {
        adminSection.hidden = false;
        loadAdminLeads();
      } else {
        setAdminToken(null);
      }
    } catch {
      setAdminToken(null);
    }
  })();

  // ── Header scroll + active nav — один обработчик вместо двух ──
  const header = document.getElementById('header');
  const sections = document.querySelectorAll('section[id]');

  function onScroll() {
    const scrollY = window.scrollY;
    // Эффект шапки
    header.classList.toggle('header--scrolled', scrollY > 60);
    // Подсветка текущей секции в навигации
    const offset = scrollY + 100;
    sections.forEach(section => {
      const top = section.offsetTop;
      const id = section.getAttribute('id');
      const link = document.querySelector('.nav__link[href="#' + id + '"]');
      if (link) {
        link.classList.toggle('nav__link--active', offset >= top && offset < top + section.offsetHeight);
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

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
        el.textContent = Math.round(eased * target).toLocaleString('ru-RU');
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

  // ── Accessories tabs ──
  const accTabs = document.querySelectorAll('.accessories__tab');
  const accPanels = document.querySelectorAll('.accessories__panel');

  accTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      const wasActive = tab.classList.contains('accessories__tab--active');

      accTabs.forEach(t => t.classList.remove('accessories__tab--active'));
      accPanels.forEach(p => p.classList.remove('accessories__panel--active'));

      if (!wasActive) {
        tab.classList.add('accessories__tab--active');
        const panel = document.querySelector(`.accessories__panel[data-panel="${target}"]`);
        if (panel) panel.classList.add('accessories__panel--active');
      }
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
      dot.setAttribute('aria-label', 'Слайд ' + (i + 1));
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  function goToSlide(index) {
    const pages = getTotalPages();
    currentSlide = Math.max(0, Math.min(index, pages - 1));
    const cardEl = cards[0];
    if (!cardEl) return;
    const cardWidth = cardEl.offsetWidth + 24;
    track.style.transform = 'translateX(-' + (currentSlide * cardWidth) + 'px)';
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

  // Touch swipe для карусели
  let touchStartX = 0;

  if (track) {
    track.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        goToSlide(currentSlide + (diff > 0 ? 1 : -1));
      }
    }, { passive: true });
  }

  // ── Booking Modal ──
  const modal = document.getElementById('bookingModal');
  const form = document.getElementById('bookingForm');
  const formSuccess = document.getElementById('formSuccess');

  function openModal() {
    if (modal) {
      modal.classList.add('modal--active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('modal--active');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (form) { form.reset(); form.style.display = ''; }
      if (formSuccess) formSuccess.classList.remove('form__success--visible');
    }, 300);
  }

  document.querySelectorAll('[data-modal="booking"]').forEach(btn => {
    btn.addEventListener('click', openModal);
  });

  if (modal) {
    const overlay = modal.querySelector('.modal__overlay');
    const closeBtn = modal.querySelector('.modal__close');
    if (overlay) overlay.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }

  // Escape закрывает любую открытую модалку
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (modal && modal.classList.contains('modal--active')) closeModal();
      if (adminLoginModal && adminLoginModal.classList.contains('modal--active')) closeAdminLoginModal();
    }
  });

  // ── Form submission: отправка заявки в бэкенд ──
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const problem = document.getElementById('problem').value.trim() || undefined;

      btn.textContent = 'Отправляем...';
      btn.disabled = true;

      try {
        const res = await fetch(API_URL + '/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, problem }),
        });
        if (res.ok) {
          form.style.display = 'none';
          formSuccess.classList.add('form__success--visible');
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.message || 'Не удалось отправить заявку. Попробуйте позже.');
        }
      } catch (err) {
        alert('Ошибка сети. Проверьте, что бэкенд запущен по адресу ' + API_URL);
      }
      btn.textContent = 'Отправить заявку';
      btn.disabled = false;
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

  // ── Scroll reveal (появление элементов при прокрутке) ──
  const fadeElements = document.querySelectorAll(
    '.problem-card, .service-card, .accessory-card, .review-card, .contact-item, .section-title, .section-subtitle'
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

  // ── Hero particles — создаём только когда секция видна ──
  const particlesContainer = document.getElementById('particles');

  if (particlesContainer) {
    let particleInterval = null;

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

    const heroSection = document.getElementById('hero');
    const particleObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!particleInterval) {
            particleInterval = setInterval(createParticle, 400);
          }
        } else {
          clearInterval(particleInterval);
          particleInterval = null;
        }
      });
    }, { threshold: 0 });

    if (heroSection) {
      particleObserver.observe(heroSection);
      // Стартовая порция частиц
      for (let i = 0; i < 15; i++) {
        setTimeout(createParticle, i * 200);
      }
    }
  }
});
