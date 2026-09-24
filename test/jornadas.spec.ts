import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';

test.describe('Suíte de Testes SauceDemo - Afya QA Challenge', () => {

  test.beforeEach(async ({ page }) => {
    // Bloqueia scripts de rastreamento externos que causam timeout no SauceDemo
    await page.route('**/events.backtrace.io/**', route => route.abort());
  });

  // WEB01: Compra completa
  test('WEB01 - Compra completa com validação matemática em cêntimos', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await loginPage.navigate();
    await loginPage.login('standard_user', 'secret_sauce');

    // Preços conhecidos dos produtos em cêntimos: Backpack ($29.99 = 2999) e Bike Light ($9.99 = 999)
    const priceBackpackCents = 2999;
    const priceBikeLightCents = 999;
    const expectedSubtotalCents = priceBackpackCents + priceBikeLightCents; // 3998 cêntimos ($39.98)

    await inventoryPage.addProductToCart('sauce-labs-backpack');
    await inventoryPage.addProductToCart('sauce-labs-bike-light');
    await page.locator('.shopping_cart_link').click();

    await expect(cartPage.cartItems).toHaveCount(2);
    await cartPage.checkoutButton.click();

    await checkoutPage.firstNameInput.fill('Ana');
    await checkoutPage.lastNameInput.fill('Silva');
    await checkoutPage.postalCodeInput.fill('37200-000');
    await checkoutPage.continueButton.click();

    // Validações Matemáticas (Valores em cêntimos)
    const subtotalText = await checkoutPage.subtotalLabel.textContent() || '';
    const taxText = await checkoutPage.taxLabel.textContent() || '';
    const totalText = await checkoutPage.totalLabel.textContent() || '';

    const actualSubtotalCents = checkoutPage.parseValueInCents(subtotalText);
    const taxCents = checkoutPage.parseValueInCents(taxText);
    const actualTotalCents = checkoutPage.parseValueInCents(totalText);

    // Asserções numéricas estritas
    expect(actualSubtotalCents).toBe(expectedSubtotalCents);
    expect(actualTotalCents).toBe(actualSubtotalCents + taxCents);

    await checkoutPage.finishButton.click();
    await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
  });

  // WEB02: Edição do carrinho
  test('WEB02 - Edição e persistência do carrinho', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    await loginPage.navigate();
    await loginPage.login('standard_user', 'secret_sauce');

    await inventoryPage.addProductToCart('sauce-labs-backpack');
    await inventoryPage.addProductToCart('sauce-labs-bike-light');
    await expect(inventoryPage.cartBadge).toHaveText('2');

    await inventoryPage.removeProductFromCart('sauce-labs-bike-light');
    await expect(inventoryPage.cartBadge).toHaveText('1');

    await page.locator('.shopping_cart_link').click();
    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(page.locator('.inventory_item_name')).toHaveText('Sauce Labs Backpack');

    await cartPage.continueShoppingButton.click();
    await expect(inventoryPage.title).toHaveText('Products');
  });

  // WEB03: Ordenação
  test('WEB03 - Ordenação numérica de preços (Crescente e Decrescente)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.navigate();
    await loginPage.login('standard_user', 'secret_sauce');

    // Ordenação Crescente (lohi)
    await inventoryPage.sortProducts('lohi');
    const pricesAsc = await inventoryPage.getPrices();
    const sortedAsc = [...pricesAsc].sort((a, b) => a - b);
    expect(pricesAsc).toEqual(sortedAsc);

    // Ordenação Decrescente (hilo)
    await inventoryPage.sortProducts('hilo');
    const pricesDesc = await inventoryPage.getPrices();
    const sortedDesc = [...pricesDesc].sort((a, b) => b - a);
    expect(pricesDesc).toEqual(sortedDesc);
  });

  // WEB04: Credenciais inválidas
  test('WEB04 - Validação de credenciais inválidas', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigate();
    await loginPage.login('standard_user', 'senha_incorreta');

    await expect(loginPage.errorMessage).toContainText('Username and password do not match');
    await expect(page).toHaveURL('https://www.saucedemo.com/');
  });

  // WEB05: Usuário bloqueado
  test('WEB05 - Validação de usuário bloqueado', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigate();
    await loginPage.login('locked_out_user', 'secret_sauce');

    await expect(loginPage.errorMessage).toContainText('Sorry, this user has been locked out.');
    await expect(page).toHaveURL('https://www.saucedemo.com/');
  });

  // WEB06: Formulário de checkout
  test('WEB06 - Validação de obrigatoriedade de campos no checkout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await loginPage.navigate();
    await loginPage.login('standard_user', 'secret_sauce');

    await inventoryPage.addProductToCart('sauce-labs-backpack');
    await page.locator('.shopping_cart_link').click();
    await cartPage.checkoutButton.click();

    // 1. Validar sem preencher nada
    await checkoutPage.continueButton.click();
    await expect(checkoutPage.errorMessage).toContainText('Error: First Name is required');

    // 2. Preencher Primeiro Nome e tentar avançar
    await checkoutPage.firstNameInput.fill('Izabelle');
    await checkoutPage.continueButton.click();
    await expect(checkoutPage.errorMessage).toContainText('Error: Last Name is required');

    // 3. Preencher Apelido e tentar avançar
    await checkoutPage.lastNameInput.fill('Ramos');
    await checkoutPage.continueButton.click();
    await expect(checkoutPage.errorMessage).toContainText('Error: Postal Code is required');

    // 4. Preencher Código Postal e avançar com sucesso
    await checkoutPage.postalCodeInput.fill('37200-000');
    await checkoutPage.continueButton.click();
    await expect(page.locator('.title')).toHaveText('Checkout: Overview');
  });

});