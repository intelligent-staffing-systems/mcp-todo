import { test, expect } from '@playwright/test';

test.describe('Todo Chat Application', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Check header is visible (updated for dual-modality interface)
    await expect(page.getByRole('heading', { name: 'Chat Assistant' })).toBeVisible();
    await expect(page.getByText('Powered by Claude & MCP')).toBeVisible();

    // Check input form is present
    await expect(page.getByPlaceholder('Ask me about your todos...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  test('should show server health status', async ({ page }) => {
    await page.goto('/');

    // Wait for health check to complete
    await page.waitForTimeout(1000);

    // Status should show connection info
    const status = page.locator('#status');
    await expect(status).toContainText(/Connected|tools available/i);
  });

  test('should accept user input', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Ask me about your todos...');

    // Type a message
    await input.fill('Hello');

    // Input should contain the text
    await expect(input).toHaveValue('Hello');
  });

  test('should clear input after submission', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Ask me about your todos...');
    const sendButton = page.getByRole('button', { name: 'Send' });

    // Type and submit
    await input.fill('Test message');
    await sendButton.click();

    // Input should be cleared
    await expect(input).toHaveValue('');
  });

  test('should display user message in chat', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Ask me about your todos...');
    const sendButton = page.getByRole('button', { name: 'Send' });

    // Send a message
    await input.fill('Create a todo for testing');
    await sendButton.click();

    // User message should appear immediately (added synchronously)
    // Wait for it with a reasonable timeout
    await page.waitForSelector('.message.user', { timeout: 5000 });

    const messages = page.locator('#messages');
    await expect(messages.locator('.message.user')).toBeVisible();
    await expect(messages).toContainText('Create a todo for testing');
  });

  test('should receive assistant response', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Ask me about your todos...');
    const sendButton = page.getByRole('button', { name: 'Send' });

    // Send a message
    await input.fill('List my todos');
    await sendButton.click();

    // Wait for assistant response (Claude API can take time)
    const assistantMessage = page.locator('#messages .message.assistant');
    await expect(assistantMessage).toBeVisible({ timeout: 30000 });
  });

  test('should show thinking status while waiting', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Ask me about your todos...');
    const sendButton = page.getByRole('button', { name: 'Send' });

    // Intercept the request to delay it so we can see the thinking status
    await page.route('**/chat', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });

    // Send a message
    await input.fill('What are my todos?');
    await sendButton.click();

    // Should show thinking status immediately after clicking
    const status = page.locator('#status');
    await expect(status).toContainText('Thinking...', { timeout: 500 });
  });

  test('should persist conversation history', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Ask me about your todos...');
    const sendButton = page.getByRole('button', { name: 'Send' });

    // Clear any existing history first
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Send a message
    await input.fill('Create a todo for persistence test');
    await sendButton.click();

    // Wait for assistant response
    await expect(page.locator('#messages .message.assistant')).toBeVisible({ timeout: 30000 });

    // Reload page
    await page.reload();

    // Wait for page to reload and history to load
    await page.waitForSelector('#messages .message.user', { timeout: 5000 });

    // Messages should still be visible
    const messages = page.locator('#messages');
    await expect(messages).toContainText('Create a todo for persistence test');
  });

  test('should handle multiple messages', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Ask me about your todos...');
    const sendButton = page.getByRole('button', { name: 'Send' });

    // Send first message
    await input.fill('First message');
    await sendButton.click();

    // Wait for assistant response to first message
    await expect(page.locator('#messages .message.assistant').first()).toBeVisible({ timeout: 30000 });

    // Send second message
    await input.fill('Second message');
    await sendButton.click();

    // Wait a moment for second user message to appear
    await page.waitForTimeout(500);

    // Should have multiple user messages
    const userMessages = page.locator('#messages .message.user');
    await expect(userMessages).toHaveCount(2, { timeout: 5000 });
  });
});
