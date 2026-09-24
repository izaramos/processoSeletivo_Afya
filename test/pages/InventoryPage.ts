import { Page, Locator } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;
  readonly title: Locator;
  readonly sortSelect: Locator;
  readonly inventoryItems: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('.title');
    this.sortSelect = page.locator('[data-test="product-sort-container"]');
    this.inventoryItems = page.locator('.inventory_item');
    this.cartBadge = page.locator('.shopping_cart_badge');
  }

  async addProductToCart(productDataTest: string) {
    await this.page.locator(`[data-test="add-to-cart-${productDataTest}"]`).click();
  }

  async removeProductFromCart(productDataTest: string) {
    await this.page.locator(`[data-test="remove-${productDataTest}"]`).click();
  }

  async getPrices(): Promise<number[]> {
    const priceElements = await this.page.locator('.inventory_item_price').allTextContents();
    return priceElements.map(p => Math.round(parseFloat(p.replace('$', '')) * 100));
  }

  async sortProducts(option: string) {
    await this.sortSelect.selectOption(option);
  }
}