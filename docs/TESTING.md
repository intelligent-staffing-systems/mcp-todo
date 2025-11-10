# Testing Strategy

## Philosophy

Tests are **architecture tools** that translate user stories into executable specifications. They:
- Define **what** to build, not **how**
- Provide clear success criteria for AI implementation
- Catch regressions during dependency updates
- Enable confident refactoring

## Test Types

### Unit Tests (Vitest)

Fast tests of isolated business logic.

#### Location
- `todoService.test.js` - Database operations and business logic
- `public/app.test.js` - Client-side DOM manipulation

#### Run Commands
```bash
# Single run
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# UI mode (visual test runner)
npm run test:ui
```

#### Example: todoService.test.js

```javascript
describe('TodoService', () => {
  it('creates a todo with text', () => {
    const service = new TodoServiceImpl(':memory:');
    const todo = service.createTodo('Buy milk');

    expect(todo.text).toBe('Buy milk');
    expect(todo.completed).toBe(false);
  });
});
```

Key patterns:
- Use `:memory:` database for isolation
- Each test creates fresh service instance
- No mocking of SQLite (it's fast enough)
- Test actual SQL queries, not implementation details

#### Example: app.test.js

```javascript
describe('App', () => {
  it('displays user message in chat', () => {
    document.body.innerHTML = '<div id="chat-messages"></div>';

    displayMessage('Hello', 'user');

    const message = document.querySelector('.message');
    expect(message.textContent).toContain('Hello');
    expect(message.classList.contains('user')).toBe(true);
  });
});
```

Key patterns:
- Setup DOM before each test
- Use jsdom environment (configured in vitest.config.js)
- Test user-visible behavior, not implementation
- Clean up DOM after tests

### E2E Tests (Playwright)

Full user workflows through real browser.

#### Location
- `e2e/chat.spec.js` - Chat interface workflows

#### Run Commands
```bash
# Headless mode
npm run test:e2e

# UI mode (watch tests run)
npm run test:e2e:ui
```

#### Example: chat.spec.js

```javascript
test('should display user message in chat', async ({ page }) => {
  await page.goto('http://localhost:3000');

  await page.fill('#user-input', 'Create a todo: Buy milk');
  await page.click('#send-button');

  const userMessage = page.locator('.message.user');
  await expect(userMessage).toContainText('Create a todo: Buy milk');
});
```

Key patterns:
- Assumes server running on localhost:3000
- Uses real Claude API (requires ANTHROPIC_API_KEY)
- Tests full MCP integration
- Waits for async operations (thinking status, responses)

#### Server Must Be Running

E2E tests require the server to be running:

```bash
# Terminal 1
npm start

# Terminal 2
npm run test:e2e
```

## Git Hooks

### Pre-Commit Hook

Runs **unit tests only** before allowing commit.

```bash
# .husky/pre-commit
npm test
```

Why unit tests only?
- Fast feedback (<1s)
- Catches logic errors before commit
- E2E tests too slow for commit hook

### Pre-Push Hook

Runs **everything** before allowing push.

```bash
# .husky/pre-push
#!/bin/sh

# Update dependencies
ncu -u
npm install

# Run all tests
npm run test:all  # unit + E2E
```

Why update dependencies here?
- Catches breaking changes before they reach main
- Ensures tests pass with latest versions
- Forces immediate fix of compatibility issues

## Test Coverage

### What We Test

**Business Logic** (todoService.js):
- CRUD operations
- Filtering (starred, priority, tags, completed)
- Data validation
- Edge cases (empty strings, missing fields)

**UI Logic** (app.js):
- Message display (user vs assistant)
- Input handling
- Conversation history management
- Error states

**Integration** (E2E):
- Full chat workflow
- MCP tool calling
- Database persistence
- Multi-turn conversations

### What We Don't Test

**Third-party libraries**:
- better-sqlite3 (trust the library)
- Express middleware
- Playwright itself

**Styling**:
- CSS classes present/absent (too brittle)
- Visual appearance (no screenshot testing)

**Infrastructure**:
- Docker build process (manual verification)
- Fly.io deployment (manual smoke testing)

## Writing New Tests

### User Story → Test

1. **Start with user story**
   ```
   As a user, I want to star important todos
   So that I can see them at the top of my list
   ```

2. **Write failing test**
   ```javascript
   test('starred todos appear first', () => {
     const service = new TodoServiceImpl(':memory:');
     service.createTodo('Buy milk', { starred: false });
     service.createTodo('Important task', { starred: true });

     const todos = service.getTodos();
     expect(todos[0].starred).toBe(true);
   });
   ```

3. **Run test (should fail)**
   ```bash
   npm test
   ```

4. **Implement minimal code to pass**

5. **Verify test passes**

### Test Naming

Use descriptive names that explain **what** happens:

```javascript
// Good
test('filters todos by priority level')
test('displays thinking status while waiting for response')

// Bad
test('getTodos works')
test('test chat')
```

### Arrange-Act-Assert Pattern

```javascript
test('example test', () => {
  // Arrange - setup
  const service = new TodoServiceImpl(':memory:');
  service.createTodo('Task 1');

  // Act - do the thing
  const todos = service.getTodos();

  // Assert - verify result
  expect(todos).toHaveLength(1);
});
```

## Running Tests in CI/CD

Currently using git hooks. When adding GitHub Actions:

```yaml
# .github/workflows/test.yml (future)
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Debugging Tests

### Unit Tests

Use vitest UI for interactive debugging:
```bash
npm run test:ui
```

Or add `debugger` statement:
```javascript
test('debug this', () => {
  debugger;  // Node will pause here
  // ...
});
```

Then run with inspector:
```bash
node --inspect-brk node_modules/.bin/vitest run
```

### E2E Tests

Run in headed mode to watch browser:
```bash
npx playwright test --headed
```

Or use UI mode for step-through:
```bash
npm run test:e2e:ui
```

Add `await page.pause()` to stop execution:
```javascript
test('debug this', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.pause();  // Opens inspector
  // ...
});
```

## Test Performance

### Current Baseline

- **Unit tests**: ~850ms (32 tests)
- **E2E tests**: ~14s (9 tests)
- **Total (test:all)**: ~15s

### Optimization Tips

**Unit tests**:
- Already fast, don't optimize prematurely
- Use `:memory:` database (faster than file)
- Avoid unnecessary setup/teardown

**E2E tests**:
- Run in parallel (Playwright default: 4 workers)
- Share browser context where possible
- Don't test every permutation, test happy paths + edge cases

## Test Data Management

### Unit Tests

Create fresh data per test:
```javascript
test('example', () => {
  const service = new TodoServiceImpl(':memory:');
  // Each test gets clean database
});
```

No shared state between tests.

### E2E Tests

Tests may create real todos in database. Current strategy:
- Tests don't clean up (simplicity)
- Local database gets real test data
- Production database isolated

Future: Add cleanup or use test-specific database.

## Common Issues

### E2E Tests Fail: Server Not Running

```bash
# Start server in separate terminal
npm start

# Then run E2E tests
npm run test:e2e
```

### E2E Tests Fail: ANTHROPIC_API_KEY Missing

```bash
# Ensure .env file exists
cat .env
ANTHROPIC_API_KEY=sk-ant-...

# Or set for single run
ANTHROPIC_API_KEY=sk-ant-... npm run test:e2e
```

### Tests Pass Locally, Fail in Hook

Pre-push hook updates dependencies. If tests fail:
1. Check what changed: `git diff package.json`
2. Fix breaking changes or pin dependency version
3. Commit fix
4. Try push again

### Flaky E2E Tests

Playwright tests may flake due to timing. Add explicit waits:

```javascript
// Bad - may flake
await page.click('button');
const text = await page.textContent('.result');

// Good - wait for state
await page.click('button');
await page.waitForSelector('.result');
const text = await page.textContent('.result');
```
