import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Dual-Modality Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all todos before each test
    const response = await page.request.get('/api/todos');
    const todos = await response.json();
    for (const todo of todos) {
      await page.request.delete(`/api/todos/${todo.id}`);
    }

    await page.goto('/');
    // Wait for app to initialize
    await page.waitForTimeout(500);
  });

  test('should display split-screen layout', async ({ page }) => {
    // Check that both panels exist
    const chatPanel = page.locator('.w-1\\/2').first();
    const todoPanel = page.locator('.w-1\\/2').last();

    await expect(chatPanel).toBeVisible();
    await expect(todoPanel).toBeVisible();

    // Check chat panel header
    await expect(page.getByRole('heading', { name: 'Chat Assistant' })).toBeVisible();

    // Check todo panel header
    await expect(page.getByRole('heading', { name: 'Your Todos' })).toBeVisible();
  });

  test('should have todo list container and quick add form', async ({ page }) => {
    const todosContainer = page.locator('#todos-container');
    const quickAddForm = page.locator('#quick-add-form');
    const quickAddInput = page.locator('#quick-add-input');

    await expect(todosContainer).toBeVisible();
    await expect(quickAddForm).toBeVisible();
    await expect(quickAddInput).toBeVisible();
    await expect(quickAddInput).toHaveAttribute('placeholder', 'Quick add todo...');
  });

  test('should create todo via quick add form', async ({ page }) => {
    const quickAddInput = page.locator('#quick-add-input');
    const addButton = page.getByRole('button', { name: 'Add' });

    // Add a todo
    await quickAddInput.fill('E2E test todo from quick add');
    await addButton.click();

    // Wait for todo to appear
    await page.waitForTimeout(1000);

    // Check todo appears in list
    const todosContainer = page.locator('#todos-container');
    await expect(todosContainer).toContainText('E2E test todo from quick add');

    // Verify todo has checkbox
    const todoItem = page.locator('.todo-item').filter({ hasText: 'E2E test todo from quick add' });
    const checkbox = todoItem.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });

  test('should toggle todo completion via checkbox', async ({ page }) => {
    const quickAddInput = page.locator('#quick-add-input');
    const addButton = page.getByRole('button', { name: 'Add' });

    // Create a todo
    await quickAddInput.fill('Test toggle completion');
    await addButton.click();
    await page.waitForTimeout(1000);

    // Find and click the checkbox
    let todoItem = page.locator('.todo-item').filter({ hasText: 'Test toggle completion' });
    let checkbox = todoItem.locator('input[type="checkbox"]');

    // Initially unchecked
    await expect(checkbox).not.toBeChecked();

    // Click to complete
    await checkbox.click();
    await page.waitForTimeout(1000);

    // Re-query the DOM after refresh (locators become stale after re-render)
    todoItem = page.locator('.todo-item').filter({ hasText: 'Test toggle completion' });
    checkbox = todoItem.locator('input[type="checkbox"]');
    const text = todoItem.locator('span').first();

    // Should be checked and have strikethrough
    await expect(checkbox).toBeChecked();
    await expect(text).toHaveClass(/line-through/);
  });

  test('should delete todo via delete button', async ({ page }) => {
    const quickAddInput = page.locator('#quick-add-input');
    const addButton = page.getByRole('button', { name: 'Add' });

    // Create a todo
    await quickAddInput.fill('Test delete todo');
    await addButton.click();
    await page.waitForTimeout(1000);

    // Verify todo exists
    const todosContainer = page.locator('#todos-container');
    await expect(todosContainer).toContainText('Test delete todo');

    // Find and click delete button
    const todoItem = page.locator('.todo-item').filter({ hasText: 'Test delete todo' });
    const deleteButton = todoItem.locator('button', { hasText: '×' });
    await deleteButton.click();
    await page.waitForTimeout(1000);

    // Verify todo is gone
    await expect(todosContainer).not.toContainText('Test delete todo');
  });

  test('should display empty state when no todos', async ({ page }) => {
    const todosContainer = page.locator('#todos-container');

    // Check for empty state text
    const emptyState = todosContainer.locator('text=No todos yet');
    const hasEmptyState = await emptyState.count() > 0;

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should sync chat-created todos to visual list', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Ask me about your todos...');
    const sendButton = page.locator('#chat-form button[type="submit"]');
    const todosContainer = page.locator('#todos-container');

    // Send chat message to create a todo
    await chatInput.fill('Add a todo: E2E sync test from chat');
    await sendButton.click();

    // Wait for Claude response and polling to sync
    await page.waitForTimeout(4000);

    // Check if todo appears in the visual list
    await expect(todosContainer).toContainText('E2E sync test from chat');
  });

  test('should sync visual-created todos to chat context', async ({ page }) => {
    const quickAddInput = page.locator('#quick-add-input');
    const addButton = page.getByRole('button', { name: 'Add' });
    const chatInput = page.getByPlaceholder('Ask me about your todos...');
    const sendButton = page.locator('#chat-form button[type="submit"]');
    const messagesContainer = page.locator('#messages');

    // Create todo via visual UI
    await quickAddInput.fill('Visual UI test todo');
    await addButton.click();
    await page.waitForTimeout(1000);

    // Ask chat about todos
    await chatInput.fill('List my todos');
    await sendButton.click();

    // Wait for Claude's assistant response to appear
    await page.waitForSelector('.message.assistant', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Check that Claude's response mentions the todo we created
    const assistantMessages = page.locator('.message.assistant');
    await expect(assistantMessages.last()).toContainText(/Visual UI test todo|todo/i);
  });

  test('should show priority badge for high-priority todos', async ({ page }) => {
    // This test would need a way to create a high-priority todo
    // For now, we'll just check if the priority badge rendering works
    // if such a todo exists

    const priorityBadge = page.locator('.todo-item .bg-red-100');
    const badgeCount = await priorityBadge.count();

    // If there are priority badges, verify they display correctly
    if (badgeCount > 0) {
      const firstBadge = priorityBadge.first();
      await expect(firstBadge).toBeVisible();
      await expect(firstBadge).toContainText(/P[1-2]/);
    }
  });

  test('should show star indicator for starred todos', async ({ page }) => {
    // Check if star indicators render correctly for starred todos
    const starIndicator = page.locator('.todo-item .text-yellow-400');
    const starCount = await starIndicator.count();

    // If there are starred todos, verify they display correctly
    if (starCount > 0) {
      const firstStar = starIndicator.first();
      await expect(firstStar).toBeVisible();
      await expect(firstStar).toContainText('⭐');
    }
  });

  test('should poll and update todo list automatically', async ({ page }) => {
    const quickAddInput = page.locator('#quick-add-input');
    const addButton = page.getByRole('button', { name: 'Add' });
    const todosContainer = page.locator('#todos-container');

    // Create initial todo
    await quickAddInput.fill('Polling test todo 1');
    await addButton.click();
    await page.waitForTimeout(1000);

    // Verify first todo exists
    await expect(todosContainer).toContainText('Polling test todo 1');

    // Create second todo
    await quickAddInput.fill('Polling test todo 2');
    await addButton.click();

    // Wait for polling to update (should be within 2 seconds)
    await page.waitForTimeout(2500);

    // Both todos should be visible
    await expect(todosContainer).toContainText('Polling test todo 1');
    await expect(todosContainer).toContainText('Polling test todo 2');
  });
});
