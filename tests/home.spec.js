const { test, expect } = require('@playwright/test');

const API = 'http://localhost:3000';

// ── Тест 1: Пользователь заходит на сайт и попадает на главную страницу ──

test.describe('Главная страница', () => {
  test('загружается и показывает ключевые секции', async ({ page }) => {
    const response = await page.goto('/');

    expect(response.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/Уютный дом/);

    await expect(page.getByRole('heading', { name: 'Наши услуги' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Знакомые проблемы?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Отзывы клиентов' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Контакты' })).toBeVisible();
  });
});

// ── Тест 2: Пользователь создаёт заявку, она уходит на бэкенд ──

test.describe('Отправка заявки', () => {
  test('заявка успешно отправляется через форму', async ({ page }) => {
    await page.goto('/');

    await page.locator('button[data-modal="booking"]').first().click();
    await expect(page.locator('#bookingModal')).toHaveClass(/modal--active/);

    await page.fill('#name', 'Тестовый Пользователь');
    await page.fill('#phone', '9001234567');
    await page.selectOption('#problem', 'draft');

    const [apiRequest] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes('/leads') && req.method() === 'POST',
      ),
      page.click('#bookingForm button[type="submit"]'),
    ]);

    const body = apiRequest.postDataJSON();
    expect(body.name).toBe('Тестовый Пользователь');
    expect(body.phone).toBeTruthy();

    const apiResponse = await apiRequest.response();
    expect(apiResponse.status()).toBeLessThan(400);

    await expect(page.locator('#formSuccess')).toHaveClass(
      /form__success--visible/,
      { timeout: 5000 },
    );
  });
});

// ── Тест 3: Нельзя отправить форму с пустым обязательным полем ──

test.describe('Валидация формы', () => {
  test('форма не отправляется без обязательных полей', async ({ page }) => {
    await page.goto('/');

    await page.locator('button[data-modal="booking"]').first().click();
    await expect(page.locator('#bookingModal')).toHaveClass(/modal--active/);

    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/leads') && req.method() === 'POST') {
        apiCalled = true;
      }
    });

    // Нажимаем «Отправить» с полностью пустой формой
    await page.click('#bookingForm button[type="submit"]');
    await page.waitForTimeout(500);

    expect(apiCalled).toBe(false);
    await expect(page.locator('#bookingForm')).toBeVisible();
    await expect(page.locator('#formSuccess')).not.toHaveClass(
      /form__success--visible/,
    );

    // Заполняем только имя — телефон пустой
    await page.fill('#name', 'Только Имя');
    await page.click('#bookingForm button[type="submit"]');
    await page.waitForTimeout(500);

    expect(apiCalled).toBe(false);
    await expect(page.locator('#bookingForm')).toBeVisible();
  });
});

// ── Тест 4: Без авторизации не видны защищённые данные ──

test.describe('Защита данных без авторизации', () => {
  test('админ-секция скрыта для обычного пользователя', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#adminSection')).toBeHidden();
  });

  test('API GET /leads возвращает 401 без токена', async ({ request }) => {
    const response = await request.get(API + '/leads');
    expect(response.status()).toBe(401);
  });
});
