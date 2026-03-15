(function () {
  const API = window.location.origin;
  const TOKEN_KEY = 'admin_token';
  const EMAIL_KEY = 'admin_email';

  const $ = (id) => document.getElementById(id);
  const show = (id) => {
    $(id).classList.remove('hidden');
  };
  const hide = (id) => {
    $(id).classList.add('hidden');
  };

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token, email) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EMAIL_KEY, email || '');
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    }
  }

  async function api(path, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: 'Bearer ' + token }),
      ...options.headers,
    };
    const res = await fetch(API + path, { ...options, headers });
    if (res.status === 401) {
      setToken(null);
      showLogin();
      throw new Error('Сессия истекла');
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.message || res.statusText || 'Ошибка');
    return data;
  }

  function showLogin() {
    hide('main-screen');
    show('login-screen');
    $('login-error').textContent = '';
  }

  function showMain() {
    hide('login-screen');
    show('main-screen');
    $('header-email').textContent = localStorage.getItem(EMAIL_KEY) || '';
    loadUsers();
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('login-error');
    errEl.textContent = '';
    const email = $('login-email').value.trim();
    const password = $('login-password').value;
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token, email);
      showMain();
    } catch (err) {
      errEl.textContent = err.message || 'Неверный email или пароль';
    }
  });

  $('btn-logout').addEventListener('click', () => {
    setToken(null);
    showLogin();
  });

  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $('panel-' + tab).classList.add('active');
      if (tab === 'users') loadUsers();
      else if (tab === 'clinics') loadClinics();
      else if (tab === 'packages') loadPackages();
      else if (tab === 'bookings') loadBookings();
    });
  });

  function roleBadge(role) {
    const c = { ADMIN: 'badge-admin', MANAGER: 'badge-manager', CLIENT: 'badge-client' }[role] || '';
    return '<span class="badge ' + c + '">' + role + '</span>';
  }

  function statusBadge(s) {
    const c = { PENDING: 'badge-pending', CONFIRMED: 'badge-confirmed', COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled' }[s] || '';
    return '<span class="badge ' + c + '">' + s + '</span>';
  }

  function paymentBadge(s) {
    const c = { PAID: 'badge-paid', UNPAID: 'badge-unpaid', REFUNDED: 'badge-cancelled' }[s] || '';
    return '<span class="badge ' + c + '">' + s + '</span>';
  }

  async function loadUsers(cursor) {
    const listEl = $('users-list');
    const loadingEl = $('users-loading');
    const moreEl = $('users-more');
    if (!cursor) {
      listEl.innerHTML = '';
      loadingEl.classList.remove('hidden');
      moreEl.innerHTML = '';
    }
    try {
      let path = '/users?limit=20';
      if (cursor) path += '&cursor=' + encodeURIComponent(cursor);
      const data = await api(path);
      loadingEl.classList.add('hidden');
      if (!cursor) {
        listEl.innerHTML =
          '<table><thead><tr><th>Email</th><th>Роль</th><th>Активен</th><th>Создан</th></tr></thead><tbody>' +
          data.items
            .map(
              (u) =>
                '<tr><td>' +
                escapeHtml(u.email) +
                '</td><td>' +
                roleBadge(u.role) +
                '</td><td>' +
                (u.isActive ? 'Да' : 'Нет') +
                '</td><td>' +
                formatDate(u.createdAt) +
                '</td></tr>'
            )
            .join('') +
          '</tbody></table>';
      } else {
        const tbody = listEl.querySelector('tbody');
        data.items.forEach((u) => {
          tbody.insertAdjacentHTML(
            'beforeend',
            '<tr><td>' +
              escapeHtml(u.email) +
              '</td><td>' +
              roleBadge(u.role) +
              '</td><td>' +
              (u.isActive ? 'Да' : 'Нет') +
              '</td><td>' +
              formatDate(u.createdAt) +
              '</td></tr>'
          );
        });
      }
      if (data.nextCursor) {
        moreEl.innerHTML = '<button type="button" data-cursor="' + escapeHtml(data.nextCursor) + '">Ещё</button>';
        moreEl.querySelector('button').onclick = () => loadUsers(data.nextCursor);
      } else {
        moreEl.innerHTML = '';
      }
    } catch (err) {
      loadingEl.classList.add('hidden');
      listEl.innerHTML = '<p class="error">' + escapeHtml(err.message) + '</p>';
    }
  }

  async function loadClinics() {
    const listEl = $('clinics-list');
    const loadingEl = $('clinics-loading');
    listEl.innerHTML = '';
    loadingEl.classList.remove('hidden');
    try {
      const data = await api('/clinics');
      loadingEl.classList.add('hidden');
      listEl.innerHTML =
        '<table><thead><tr><th>Название</th><th>Адрес</th><th>Телефон</th></tr></thead><tbody>' +
        (Array.isArray(data)
          ? data
              .map(
                (c) =>
                  '<tr><td>' +
                  escapeHtml(c.name) +
                  '</td><td>' +
                  escapeHtml(c.address || '—') +
                  '</td><td>' +
                  escapeHtml(c.phone || '—') +
                  '</td></tr>'
              )
              .join('')
          : '') +
        '</tbody></table>';
    } catch (err) {
      loadingEl.classList.add('hidden');
      listEl.innerHTML = '<p class="error">' + escapeHtml(err.message) + '</p>';
    }
  }

  async function loadPackages() {
    const listEl = $('packages-list');
    const loadingEl = $('packages-loading');
    listEl.innerHTML = '';
    loadingEl.classList.remove('hidden');
    try {
      const data = await api('/packages');
      loadingEl.classList.add('hidden');
      listEl.innerHTML =
        '<table><thead><tr><th>Название</th><th>Клиника</th><th>Цена (¢)</th><th>Длительность</th><th>Активен</th></tr></thead><tbody>' +
        (Array.isArray(data)
          ? data
              .map(
                (p) =>
                  '<tr><td>' +
                  escapeHtml(p.title) +
                  '</td><td>' +
                  escapeHtml(p.clinic?.name || p.clinicId) +
                  '</td><td>' +
                  (p.price_cents ?? '—') +
                  '</td><td>' +
                  (p.duration_minutes ?? '—') +
                  ' мин</td><td>' +
                  (p.active ? 'Да' : 'Нет') +
                  '</td></tr>'
              )
              .join('')
          : '') +
        '</tbody></table>';
    } catch (err) {
      loadingEl.classList.add('hidden');
      listEl.innerHTML = '<p class="error">' + escapeHtml(err.message) + '</p>';
    }
  }

  async function loadBookings(cursor) {
    const listEl = $('bookings-list');
    const loadingEl = $('bookings-loading');
    const moreEl = $('bookings-more');
    if (!cursor) {
      listEl.innerHTML = '';
      loadingEl.classList.remove('hidden');
      moreEl.innerHTML = '';
    }
    try {
      let path = '/bookings?limit=20';
      if (cursor) path += '&cursor=' + encodeURIComponent(cursor);
      const data = await api(path);
      loadingEl.classList.add('hidden');
      const items = data.items || [];
      if (!cursor) {
        const rows =
          items.length === 0
            ? '<tr><td colspan="5" class="empty">Нет заявок</td></tr>'
            : items
                .map(
                  (b) =>
                    '<tr><td>' +
                    escapeHtml(b.user?.email || b.userId) +
                    '</td><td>' +
                    escapeHtml(b.package?.title || b.packageId) +
                    '</td><td>' +
                    formatDate(b.start_at) +
                    '</td><td>' +
                    statusBadge(b.status) +
                    '</td><td>' +
                    paymentBadge(b.payment_status) +
                    '</td></tr>'
                )
                .join('');
        listEl.innerHTML =
          '<table><thead><tr><th>Пользователь</th><th>Услуга</th><th>Начало</th><th>Статус</th><th>Оплата</th></tr></thead><tbody>' +
          rows +
          '</tbody></table>';
      } else {
        const tbody = listEl.querySelector('tbody');
        items.forEach((b) => {
          tbody.insertAdjacentHTML(
            'beforeend',
            '<tr><td>' +
              escapeHtml(b.user?.email || b.userId) +
              '</td><td>' +
              escapeHtml(b.package?.title || b.packageId) +
              '</td><td>' +
              formatDate(b.start_at) +
              '</td><td>' +
              statusBadge(b.status) +
              '</td><td>' +
              paymentBadge(b.payment_status) +
              '</td></tr>'
          );
        });
      }
      if (data.nextCursor) {
        moreEl.innerHTML = '<button type="button">Ещё</button>';
        moreEl.querySelector('button').onclick = () => loadBookings(data.nextCursor);
      } else {
        moreEl.innerHTML = '';
      }
    } catch (err) {
      loadingEl.classList.add('hidden');
      const msg =
        err.message && err.message.indexOf('cursor') !== -1
          ? 'Не удалось загрузить заявки. На сервере должен быть задан CURSOR_SECRET (в .env).'
          : err.message;
      listEl.innerHTML = '<p class="error">' + escapeHtml(msg) + '</p>';
    }
  }

  function formatDate(s) {
    if (!s) return '—';
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString('ru');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  if (getToken()) {
    showMain();
  } else {
    showLogin();
  }
})();
