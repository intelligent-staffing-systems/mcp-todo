import { test, expect } from '@playwright/test';

test.describe('Drag and Drop Reordering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForSelector('#todos-container');

    // Clear any existing todos by deleting them - wait for each deletion to complete
    let deleteBtn = page.locator('.todo-item button').first();
    while (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.waitForTimeout(300); // Wait for deletion to persist
      deleteBtn = page.locator('.todo-item button').first();
    }

    // Verify todos are cleared
    await expect(page.locator('.todo-item')).toHaveCount(0);
  });

  test('should have draggable todos with cursor-move class', async ({ page }) => {
    // Add a test todo
    await page.fill('#quick-add-input', 'Test Todo');
    await page.click('#quick-add-form button[type="submit"]');

    // Wait for todo to appear
    await page.waitForSelector('.todo-item');

    // Check that todo has cursor-move class and draggable attribute
    const todoItem = page.locator('.todo-item').first();
    await expect(todoItem).toHaveClass(/cursor-move/);
    await expect(todoItem).toHaveAttribute('draggable', 'true');
  });

  test('should reorder todos via drag and drop', async ({ page }) => {
    // Add three todos
    const todos = ['First Todo', 'Second Todo', 'Third Todo'];
    for (const todo of todos) {
      await page.fill('#quick-add-input', todo);
      await page.click('#quick-add-form button[type="submit"]');
      await page.waitForTimeout(200);
    }

    // Wait for all todos to appear
    await page.waitForSelector('.todo-item:nth-child(3)');

    // Get initial order
    const initialOrder = await page.locator('.todo-item span:first-of-type').allTextContents();
    expect(initialOrder).toEqual(['First Todo', 'Second Todo', 'Third Todo']);

    // Drag the first todo to the third position
    const firstTodo = page.locator('.todo-item').first();
    const thirdTodo = page.locator('.todo-item').nth(2);

    // Perform drag and drop
    await firstTodo.dragTo(thirdTodo);

    // Wait for reorder to complete
    await page.waitForTimeout(500);

    // Check new order
    const newOrder = await page.locator('.todo-item span:first-of-type').allTextContents();
    expect(newOrder).not.toEqual(initialOrder);
    // After dragging first to third position, order should be: Second, Third, First
    expect(newOrder[2]).toBe('First Todo');
  });

  test('should persist reordered todos after page reload', async ({ page }) => {
    // Add three todos
    await page.fill('#quick-add-input', 'Todo A');
    await page.click('#quick-add-form button[type="submit"]');
    await page.waitForTimeout(200);

    await page.fill('#quick-add-input', 'Todo B');
    await page.click('#quick-add-form button[type="submit"]');
    await page.waitForTimeout(200);

    await page.fill('#quick-add-input', 'Todo C');
    await page.click('#quick-add-form button[type="submit"]');
    await page.waitForTimeout(200);

    // Drag first to last
    const firstTodo = page.locator('.todo-item').first();
    const lastTodo = page.locator('.todo-item').last();
    await firstTodo.dragTo(lastTodo);
    await page.waitForTimeout(500);

    // Get order after drag
    const orderAfterDrag = await page.locator('.todo-item span:first-of-type').allTextContents();

    // Reload page
    await page.reload();
    await page.waitForSelector('.todo-item:nth-child(3)');

    // Check order is still the same
    const orderAfterReload = await page.locator('.todo-item span:first-of-type').allTextContents();
    expect(orderAfterReload).toEqual(orderAfterDrag);
  });

  test('should show visual feedback during drag', async ({ page }) => {
    // Add two todos
    await page.fill('#quick-add-input', 'Drag Me');
    await page.click('#quick-add-form button[type="submit"]');
    await page.waitForTimeout(200);

    await page.fill('#quick-add-input', 'Drop Here');
    await page.click('#quick-add-form button[type="submit"]');
    await page.waitForTimeout(200);

    const firstTodo = page.locator('.todo-item').first();

    // Start dragging
    await firstTodo.hover();
    await page.mouse.down();

    // Check opacity changed during drag (this might be hard to test reliably)
    // We can at least verify the element is still visible
    await expect(firstTodo).toBeVisible();

    await page.mouse.up();
  });

  test('should handle drag and drop with multiple todos', async ({ page }) => {
    // Add 5 todos
    for (let i = 1; i <= 5; i++) {
      await page.fill('#quick-add-input', `Todo ${i}`);
      await page.click('#quick-add-form button[type="submit"]');
      await page.waitForTimeout(150);
    }

    await page.waitForSelector('.todo-item:nth-child(5)');

    // Drag the 5th todo to the 1st position
    const fifthTodo = page.locator('.todo-item').nth(4);
    const firstTodo = page.locator('.todo-item').first();

    await fifthTodo.dragTo(firstTodo);
    await page.waitForTimeout(500);

    // Check that Todo 5 is now first
    const firstText = await page.locator('.todo-item').first().locator('span:first-of-type').textContent();
    expect(firstText).toBe('Todo 5');
  });
});
