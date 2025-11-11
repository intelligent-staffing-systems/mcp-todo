/**
 * Frontend Unit Tests (TDD)
 * Tests for ConversationManager, ApiClient, and UIManager classes
 * These tests SHOULD FAIL until we implement app.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { ConversationManager, ApiClient, UIManager } from './app.js';

// Setup DOM environment for tests
let dom;
let window;
let document;
let localStorage;

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="messages"></div><div id="status"></div></body></html>', {
    url: 'http://localhost:3000',
  });
  window = dom.window;
  document = window.document;
  localStorage = window.localStorage;

  // Make globals available
  global.window = window;
  global.document = document;
  global.localStorage = localStorage;
  global.fetch = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('ConversationManager', () => {
  it('should save conversation to localStorage', () => {
    const manager = new ConversationManager();
    const conversation = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
    ];

    manager.save(conversation);
    const saved = JSON.parse(localStorage.getItem('conversationHistory'));

    expect(saved).toEqual(conversation);
    expect(saved).toHaveLength(2);
  });

  it('should load conversation from localStorage', () => {
    const manager = new ConversationManager();
    const conversation = [
      { role: 'user', content: 'Test message' },
    ];

    localStorage.setItem('conversationHistory', JSON.stringify(conversation));
    const loaded = manager.load();

    expect(loaded).toEqual(conversation);
  });

  it('should return empty array when no conversation exists', () => {
    const manager = new ConversationManager();
    const loaded = manager.load();

    expect(loaded).toEqual([]);
  });

  it('should clear conversation from localStorage', () => {
    const manager = new ConversationManager();
    localStorage.setItem('conversationHistory', JSON.stringify([{ role: 'user', content: 'test' }]));

    manager.clear();

    expect(localStorage.getItem('conversationHistory')).toBeNull();
  });
});

describe('ApiClient', () => {
  it('should send chat message and return validated response', async () => {
    const client = new ApiClient();
    const mockResponse = {
      response: 'Test response',
      conversationHistory: [
        { role: 'user', content: 'Test' },
        { role: 'assistant', content: [{ type: 'text', text: 'Test response' }] },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.sendMessage('Test', []);

    expect(fetch).toHaveBeenCalledWith('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Test',
        conversationHistory: [],
      }),
    });
    expect(result).toEqual(mockResponse);
  });

  it('should throw error on API failure', async () => {
    const client = new ApiClient();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(client.sendMessage('Test', [])).rejects.toThrow();
  });

  it('should check server health', async () => {
    const client = new ApiClient();
    const mockHealth = {
      status: 'ok',
      mcpConnected: true,
      toolsAvailable: 7,
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealth,
    });

    const health = await client.checkHealth();

    expect(health).toEqual(mockHealth);
    expect(health.mcpConnected).toBe(true);
  });

  it('should get all todos', async () => {
    const client = new ApiClient();
    const mockTodos = [
      { id: '1', text: 'Test todo 1', completed: false },
      { id: '2', text: 'Test todo 2', completed: true },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTodos,
    });

    const todos = await client.getTodos();

    expect(global.fetch).toHaveBeenCalledWith('/api/todos');
    expect(todos).toEqual(mockTodos);
    expect(todos).toHaveLength(2);
  });

  it('should get todos with filters', async () => {
    const client = new ApiClient();
    const mockTodos = [{ id: '1', text: 'Starred todo', starred: true }];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTodos,
    });

    const todos = await client.getTodos({ starred: true });

    expect(global.fetch).toHaveBeenCalledWith('/api/todos?starred=true');
    expect(todos).toEqual(mockTodos);
  });

  it('should create a new todo', async () => {
    const client = new ApiClient();
    const newTodo = { text: 'New todo', starred: true };
    const mockResponse = { id: '123', ...newTodo, completed: false };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.createTodo(newTodo);

    expect(global.fetch).toHaveBeenCalledWith('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTodo),
    });
    expect(result).toEqual(mockResponse);
    expect(result.id).toBe('123');
  });

  it('should update a todo', async () => {
    const client = new ApiClient();
    const updates = { text: 'Updated text', completed: true };
    const mockResponse = { id: '123', ...updates };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.updateTodo('123', updates);

    expect(global.fetch).toHaveBeenCalledWith('/api/todos/123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    expect(result).toEqual(mockResponse);
  });

  it('should delete a todo', async () => {
    const client = new ApiClient();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await client.deleteTodo('123');

    expect(global.fetch).toHaveBeenCalledWith('/api/todos/123', {
      method: 'DELETE',
    });
  });

  it('should handle error when creating todo', async () => {
    const client = new ApiClient();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(client.createTodo({ text: '' })).rejects.toThrow();
  });

  it('should reorder todos', async () => {
    const client = new ApiClient();
    const orderedIds = ['id-3', 'id-1', 'id-2'];
    const mockResponse = { success: true, message: 'Todos reordered successfully' };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.reorderTodos(orderedIds);

    expect(global.fetch).toHaveBeenCalledWith('/api/todos/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
    expect(result).toEqual(mockResponse);
    expect(result.success).toBe(true);
  });

  it('should handle error when reordering todos', async () => {
    const client = new ApiClient();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(client.reorderTodos(['invalid-id'])).rejects.toThrow('HTTP 400: Bad Request');
  });
});

describe('UIManager', () => {
  it('should add user message to DOM', () => {
    const ui = new UIManager();

    ui.addMessage('user', 'Hello world');

    const messages = document.getElementById('messages');
    expect(messages.children).toHaveLength(1);
    expect(messages.querySelector('.message.user')).toBeTruthy();
    expect(messages.querySelector('.message-content').textContent).toBe('Hello world');
  });

  it('should add assistant message to DOM', () => {
    const ui = new UIManager();

    ui.addMessage('assistant', 'Hi there!');

    const messages = document.getElementById('messages');
    expect(messages.children).toHaveLength(1);
    expect(messages.querySelector('.message.assistant')).toBeTruthy();
  });

  it('should show status message', () => {
    const ui = new UIManager();

    ui.showStatus('Loading...', 'info');

    const status = document.getElementById('status');
    expect(status.textContent).toBe('Loading...');
  });

  it('should clear status message', () => {
    const ui = new UIManager();

    ui.showStatus('Error occurred', 'error');
    ui.clearStatus();

    const status = document.getElementById('status');
    expect(status.textContent).toBe('');
  });

  it('should disable input when loading', () => {
    const ui = new UIManager();
    document.body.innerHTML += '<input id="message-input"><button type="submit">Send</button>';

    ui.setLoading(true);

    expect(document.getElementById('message-input').disabled).toBe(true);
    expect(document.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('should enable input when not loading', () => {
    const ui = new UIManager();
    document.body.innerHTML += '<input id="message-input"><button type="submit">Send</button>';

    ui.setLoading(false);

    expect(document.getElementById('message-input').disabled).toBe(false);
    expect(document.querySelector('button[type="submit"]').disabled).toBe(false);
  });
});

describe('TodoListManager', () => {
  let apiClient, todoListManager;

  beforeEach(() => {
    // Setup todos container in DOM
    document.body.innerHTML = `
      <div id="todos-container"></div>
      <form id="quick-add-form">
        <input id="quick-add-input">
      </form>
    `;
    apiClient = new ApiClient();
    global.fetch = vi.fn();
  });

  it('should render todos to DOM', async () => {
    const { TodoListManager } = await import('./app.js');
    todoListManager = new TodoListManager(apiClient);

    const mockTodos = [
      { id: '1', text: 'Test todo 1', completed: false, starred: false, priority: 3, tags: [] },
      { id: '2', text: 'Test todo 2', completed: true, starred: true, priority: 1, tags: ['work'] },
    ];

    todoListManager.render(mockTodos);

    const container = document.getElementById('todos-container');
    expect(container.children).toHaveLength(2);
  });

  it('should handle todo checkbox toggle', async () => {
    const { TodoListManager } = await import('./app.js');
    todoListManager = new TodoListManager(apiClient);

    const mockTodo = { id: '1', text: 'Test todo', completed: false, starred: false, priority: 3, tags: [] };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockTodo, completed: true }),
    });

    await todoListManager.toggleComplete('1', false);

    expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    });
  });

  it('should handle todo deletion', async () => {
    const { TodoListManager } = await import('./app.js');
    todoListManager = new TodoListManager(apiClient);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await todoListManager.deleteTodo('1');

    expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
      method: 'DELETE',
    });
  });

  it('should handle quick add form submission', async () => {
    const { TodoListManager } = await import('./app.js');
    todoListManager = new TodoListManager(apiClient);

    const mockNewTodo = { id: '123', text: 'New quick todo', completed: false };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockNewTodo,
    });

    await todoListManager.quickAddTodo('New quick todo');

    expect(global.fetch).toHaveBeenCalledWith('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'New quick todo' }),
    });
  });

  it('should start and stop polling', async () => {
    const { TodoListManager } = await import('./app.js');
    todoListManager = new TodoListManager(apiClient);

    vi.useFakeTimers();

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    todoListManager.startPolling(1000);

    expect(todoListManager.pollingInterval).toBeDefined();

    todoListManager.stopPolling();

    expect(todoListManager.pollingInterval).toBeNull();

    vi.useRealTimers();
  });

  it('should create todo with points from quick add form with dropdown', async () => {
    const { TodoListManager } = await import('./app.js');
    todoListManager = new TodoListManager(apiClient);

    const mockNewTodo = { id: '123', text: 'New todo with points', completed: false, points: 5 };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockNewTodo,
    });

    // Simulate selecting 5 points from dropdown
    await todoListManager.quickAddTodo('New todo with points', 5);

    expect(global.fetch).toHaveBeenCalledWith('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'New todo with points', points: 5 }),
    });
  });

  it('should render points dropdown in todo element for editing', async () => {
    const { TodoListManager } = await import('./app.js');
    todoListManager = new TodoListManager(apiClient);

    const mockTodo = { id: '1', text: 'Test todo', completed: false, starred: false, priority: 3, tags: [], points: 3 };

    todoListManager.render([mockTodo]);

    const todoElement = document.querySelector('[data-id="1"]');
    expect(todoElement).toBeTruthy();

    // Should have a points badge or clickable area to edit
    const pointsElement = todoElement.querySelector('.points-badge, .points-editor');
    expect(pointsElement).toBeTruthy();
  });

  it('should update todo points when clicking points badge', async () => {
    const { TodoListManager } = await import('./app.js');
    todoListManager = new TodoListManager(apiClient);

    const mockTodo = { id: '1', text: 'Test todo', completed: false, starred: false, priority: 3, tags: [], points: 3 };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockTodo, points: 8 }),
    });

    await todoListManager.updateTodoPoints('1', 8);

    expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: 8 }),
    });
  });

  it('should display points dropdown with all Fibonacci values', async () => {
    const { TodoListManager } = await import('./app.js');
    todoListManager = new TodoListManager(apiClient);

    const mockTodo = { id: '1', text: 'Test todo', completed: false, starred: false, priority: 3, tags: [], points: null };

    todoListManager.render([mockTodo]);

    // Trigger points editor (this will be implemented)
    const pointsEditor = todoListManager.createPointsEditor(mockTodo);
    document.body.appendChild(pointsEditor);

    const options = pointsEditor.querySelectorAll('option');
    const values = Array.from(options).map(opt => opt.value);

    expect(values).toContain('');  // None option
    expect(values).toContain('1');
    expect(values).toContain('2');
    expect(values).toContain('3');
    expect(values).toContain('5');
    expect(values).toContain('8');
    expect(values).toContain('13');
  });
});
