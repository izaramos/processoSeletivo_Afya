import { test, expect } from '@playwright/test';

test.describe('E2E - Validação Acessível de Adição ao Carrinho', () => {
  test('Deve autenticar e adicionar item ao carrinho com validação estrita', async ({ page }) => {
    await page.goto('https://www.saucedemo.com/');

    // 2. Preenchimento via locators estáveis por atributo data-test
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();

    await expect(page.locator('[data-test="title"]')).toHaveText('Products');

    const addToCartBtn = page.locator('[data-test="add-to-cart-sauce-labs-backpack"]');
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // 3. Navegação ao carrinho e validação do badge dinâmico
    const shoppingCartBadge = page.locator('[data-test="shopping-cart-badge"]');
    await expect(shoppingCartBadge).toHaveText('1');

    await page.locator('[data-test="shopping-cart-link"]').click();

    await expect(page.locator('[data-test="inventory-item-name"]')).toBeVisible();
    await expect(page.locator('[data-test="item-quantity"]')).toHaveText('1');
  });
});