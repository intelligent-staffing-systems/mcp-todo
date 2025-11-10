# Todo App

A todo application with natural language interface powered by Claude AI and MCP (Model Context Protocol).

## Features

- 💬 Natural language todo management via chat interface
- 🔧 Backend MCP server for todo operations (create, read, update, delete)
- 💾 SQLite database for persistence
- 🔒 Type-safe with JSDoc types and Zod runtime validation
- ✅ Comprehensive test coverage (Vitest unit tests + Playwright E2E)
- 🚀 **Living on the Edge**: Automatic dependency updates via pre-push hook

## Quick Start

### Setup

```bash
npm install
```

Create a `.env` file with your Anthropic API key:

```
ANTHROPIC_API_KEY=your-key-here
```

### Run the Application

```bash
npm start
```

Open http://localhost:3000 and start chatting with your AI todo assistant!

## Development

### Testing

```bash
# Run unit tests (Vitest)
npm test

# Run E2E tests (Playwright)
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all

# Watch mode for unit tests
npm run test:watch
```

### Git Hooks

This project uses Husky for git hooks:

#### Pre-Commit Hook
- Runs unit tests before each commit
- Ensures code quality with every commit

#### Pre-Push Hook (Living on the Edge 🚀)
The pre-push hook automatically:

1. **Updates all dependencies** to their latest versions (`ncu -u`)
2. **Installs updated dependencies** (`npm install`)
3. **Runs all tests** (unit + E2E) to catch breaking changes
4. **Only allows push if tests pass**

This ensures the codebase always stays current with minimal manual intervention.

**Skip in emergencies:**
```bash
git push --no-verify
```

**Trade-offs:**
- ✅ Always on latest versions
- ✅ Breaking changes caught before reaching remote
- ⚠️ Pushes take longer (~30-60s for updates + tests)
- ⚠️ May introduce unexpected breaking changes

## Architecture

### Frontend
- Vanilla JavaScript + Tailwind CSS (no build step)
- Client-managed conversation history (localStorage)
- Zod validation for API responses (optional in browser, required in tests)

### Backend
- Express.js server
- Custom MCP client for tool calling
- Anthropic Claude API integration
- Stateless design (no server-side session storage)

### Database
- SQLite with better-sqlite3
- Simple schema: todos table with id, title, completed, created_at

## Development Philosophy

1. **TDD First**: Tests drive implementation
   - types.js (JSDoc) → Zod schemas → failing tests → implementation
2. **Type Safety**: JSDoc for IDE support, Zod for runtime validation
3. **No Build Step**: Keep it simple with vanilla JS + CDN
4. **Stateless Backend**: Client manages conversation context
5. **Living on the Edge**: Always use latest dependency versions
