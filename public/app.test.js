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
