# Development Philosophy

## Core Principles

### 1. User Story First
Development starts with the user need, not the implementation:

1. **User Story**: "What do I need as a user?"
2. **API Research**: Check external API documentation - does this functionality exist?
3. **Types (JSDoc)**: Define data structures in `types.js`
4. **Zod Schemas**: Runtime validation contracts
5. **Tests**: Architecture tool that scopes clear requirements for AI
6. **Implementation**: AI builds to satisfy the tests

Tests are **guardrails**, not drivers. They translate user stories into executable specifications that keep AI implementation on track.

### 2. Type Safety Without Build Complexity
- **JSDoc** for IDE autocomplete and static analysis
- **Zod** for runtime validation (catches what static types can't)
- No TypeScript compilation - keep iteration fast

### 3. No Build Step
- Vanilla JavaScript + CDN dependencies (Tailwind via CDN)
- Server: ES modules with Node.js native support
- Client: Direct script tags, no bundling
- Rationale: Faster iteration, simpler deployment, fewer moving parts

### 4. Stateless HTTP, Stateful Data
Important distinction:

**Stateless HTTP Server**:
- No session cookies
- No server-side conversation history
- Client sends full context with each request
- Any request can hit any server instance

**Stateful Data Layer**:
- SQLite persists todo items
- Database survives server restarts
- Client manages conversation context (localStorage)

Benefits: Server can restart/scale without losing todos. No session affinity needed.

### 5. Living on the Edge
Automated pre-push hook keeps dependencies current:
- `ncu -u` updates all dependencies to latest
- `npm install` applies updates
- Full test suite validates compatibility
- Push blocked if tests fail

Accepted trade-offs:
- Longer push times (~30-60s)
- Occasional breaking changes caught immediately
- Zero security debt from stale dependencies
- Always compatible with latest API features

### 6. Test Locally Before Deploying
- Build and run Docker containers locally
- Verify with actual HTTP requests
- Only deploy after local validation
- No "works on my machine" surprises

## Testing Strategy

### Tests as Architecture Tools
Tests define **what** to build, not **how** to build it:
- Translate user stories into executable specs
- Provide clear success criteria for AI
- Catch regressions during dependency updates
- Enable confident refactoring

### Unit Tests (Vitest)
- Business logic: `todoService.js`
- DOM logic: `public/app.js`
- Mock external dependencies
- Fast feedback (<1s)

### E2E Tests (Playwright)
- Full user workflows through browser
- Real MCP server + Claude API
- Integration validation
- Slower but comprehensive

### Git Hooks
**Pre-commit**: Unit tests only (fast feedback)
**Pre-push**: Everything (dependency updates + full test suite)

## Architecture Decisions

### Why Express + Custom MCP Client?
- Direct control over Claude tool calling
- Can inspect/log all MCP interactions
- Simpler than framework abstractions
- Clear request/response flow

### Why SQLite?
- Zero configuration overhead
- Single file = trivial backups
- Sufficient for current scale
- Can migrate to Postgres if needed
- better-sqlite3 is synchronous (simpler code)

### Why No Frontend Framework?
- Chat interface fits vanilla JS complexity budget
- Tailwind provides styling utilities
- No framework bundle overhead
- Faster page loads
- No framework lock-in

### Why Fly.io?
- Docker-native deployment
- Persistent volumes for SQLite
- Auto-scale to zero (cost-effective)
- Global edge network
- Simple CLI workflow

## What We Don't Do

### No Microservices
Monolith is simpler and sufficient. Split when pain is clear, not preemptively.

### No ORM
Direct SQL is transparent and fast for simple queries. ORMs add complexity we don't need.

### No State Management Library
localStorage + vanilla JS handles our client state needs.

### No CI/CD Platform (Yet)
Git hooks automate what matters now. Add GitHub Actions when team grows.

## When to Revisit Decisions

### Add TypeScript When:
- Codebase exceeds ~5k LOC
- Complex type transformations needed
- Team grows beyond 2-3 developers

### Add Framework When:
- UI complexity requires component reusability
- State management exceeds localStorage capabilities
- Multiple complex user flows emerge

### Switch Database When:
- Concurrent writes exceed ~100 req/s
- Need full-text search beyond SQLite FTS5
- Require multi-region distribution
- Team needs separate DB admin role

### Add CI/CD When:
- Multiple developers coordinate deployments
- Need PR deployment previews
- Git hooks become team bottleneck
- Require deployment approval workflows
