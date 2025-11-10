/**
 * Frontend Application Logic
 * Implements ConversationManager, ApiClient, and UIManager
 */

// Global schemas - will be loaded async
let ChatResponseSchema, HealthResponseSchema;

// Load Zod schemas
async function loadSchemas() {
  if (typeof window !== 'undefined') {
    // Browser environment - import from CDN
    const schemasModule = await import('./schemas.js');
    ChatResponseSchema = schemasModule.ChatResponseSchema;
    HealthResponseSchema = schemasModule.HealthResponseSchema;
  } else {
    // Test environment - use zod package
    const { z } = await import('zod');

    const ContentBlockSchema = z.object({
      type: z.enum(['text', 'tool_use', 'tool_result']),
      text: z.string().optional(),
    });

    const ChatMessageSchema = z.object({
      role: z.enum(['user', 'assistant']),
      content: z.union([z.string(), z.array(ContentBlockSchema)]),
    });

    ChatResponseSchema = z.object({
      response: z.string(),
      conversationHistory: z.array(ChatMessageSchema),
    });

    HealthResponseSchema = z.object({
      status: z.string(),
      mcpConnected: z.boolean(),
      toolsAvailable: z.number(),
    });
  }
}

/**
 * Manages conversation history in localStorage
 * @implements {ConversationManager}
 */
export class ConversationManager {
  constructor() {
    this.storageKey = 'conversationHistory';
  }

  /**
   * Load conversation from localStorage
   * @returns {ChatMessage[]}
   */
  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load conversation:', e);
      return [];
    }
  }

  /**
   * Save conversation to localStorage
   * @param {ChatMessage[]} messages
   */
  save(messages) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save conversation:', e);
    }
  }

  /**
   * Clear conversation from localStorage
   */
  clear() {
    localStorage.removeItem(this.storageKey);
  }
}

/**
 * Handles API communication with backend
 * @implements {ApiClient}
 */
export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Send chat message to backend
   * @param {string} message
   * @param {ChatMessage[]} conversationHistory
   * @returns {Promise<ChatResponse>}
   */
  async sendMessage(message, conversationHistory) {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response with Zod if available (tests), otherwise just return
    return ChatResponseSchema ? ChatResponseSchema.parse(data) : data;
  }

  /**
   * Check server health
   * @returns {Promise<HealthResponse>}
   */
  async checkHealth() {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response with Zod if available (tests), otherwise just return
    return HealthResponseSchema ? HealthResponseSchema.parse(data) : data;
  }

  /**
   * Get all todos
   * @param {Object} filters
   * @returns {Promise<Todo[]>}
   */
  async getTodos(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value);
    });

    const url = `${this.baseUrl}/api/todos${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create a new todo
   * @param {Object} todoData
   * @returns {Promise<Todo>}
   */
  async createTodo(todoData) {
    const response = await fetch(`${this.baseUrl}/api/todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(todoData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update a todo
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Todo>}
   */
  async updateTodo(id, updates) {
    const response = await fetch(`${this.baseUrl}/api/todos/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete a todo
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteTodo(id) {
    const response = await fetch(`${this.baseUrl}/api/todos/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
}

/**
 * Manages UI updates and interactions
 * @implements {UIManager}
 */
export class UIManager {
  constructor() {
    this.messagesContainer = document.getElementById('messages');
    this.statusDiv = document.getElementById('status');
    this.messageInput = document.getElementById('message-input');
    this.submitButton = document.querySelector('button[type="submit"]');
  }

  /**
   * Add message to UI
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message text
   */
  addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role} flex gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0';
    avatar.style.backgroundColor = role === 'user' ? '#6366f1' : '#10b981';
    avatar.textContent = role === 'user' ? 'U' : 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = `message-content max-w-[70%] px-4 py-3 rounded-lg ${
      role === 'user'
        ? 'bg-indigo-600 text-white rounded-br-sm'
        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
    }`;
    contentDiv.textContent = content;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    this.messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Show status message
   * @param {string} message
   * @param {string} type - 'info', 'error', 'success'
   */
  showStatus(message, type = 'info') {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `px-6 py-2 text-sm border-t border-gray-200 min-h-[40px] flex items-center justify-center ${
      type === 'error' ? 'bg-red-50 text-red-700' :
      type === 'success' ? 'bg-green-50 text-green-700' :
      'text-gray-600'
    }`;
  }

  /**
   * Clear status message
   */
  clearStatus() {
    this.statusDiv.textContent = '';
    this.statusDiv.className = 'px-6 py-2 text-sm border-t border-gray-200 min-h-[40px] flex items-center justify-center';
  }

  /**
   * Set loading state
   * @param {boolean} loading
   */
  setLoading(loading) {
    // Get elements dynamically in case they weren't available at construction
    const input = this.messageInput || document.getElementById('message-input');
    const button = this.submitButton || document.querySelector('button[type="submit"]');

    if (input) {
      input.disabled = loading;
    }
    if (button) {
      button.disabled = loading;
    }
  }
}

/**
 * Main application initialization
 */
(async function initApp() {
  // Wait for DOM
  if (typeof window === 'undefined' || !document.getElementById('chat-form')) {
    return;
  }

  // Try to load schemas but don't block on it (optional for browser)
  loadSchemas().catch(e => console.warn('Zod schemas not loaded:', e));

  const conversationManager = new ConversationManager();
  const apiClient = new ApiClient();
  const uiManager = new UIManager();

  let conversationHistory = [];

  // Load conversation history
  function loadHistory() {
    conversationHistory = conversationManager.load();
    conversationHistory.forEach(msg => {
      if (msg.role === 'user') {
        uiManager.addMessage('user', msg.content);
      } else if (msg.role === 'assistant') {
        const textContent = msg.content.find(block => block.type === 'text');
        if (textContent) {
          uiManager.addMessage('assistant', textContent.text);
        }
      }
    });
  }

  // Send message
  async function sendMessage(message) {
    if (!message.trim()) return;

    // Add user message to UI
    uiManager.addMessage('user', message);

    // Disable input
    uiManager.setLoading(true);
    uiManager.showStatus('Thinking...');

    try {
      const data = await apiClient.sendMessage(message, conversationHistory);

      // Update conversation history
      conversationHistory = data.conversationHistory;
      conversationManager.save(conversationHistory);

      // Add assistant response to UI
      uiManager.addMessage('assistant', data.response);
      uiManager.clearStatus();

    } catch (error) {
      console.error('Chat error:', error);
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      uiManager.addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
    } finally {
      uiManager.setLoading(false);
    }
  }

  // Check server health
  async function checkHealth() {
    try {
      const health = await apiClient.checkHealth();
      if (health.status === 'ok' && health.mcpConnected) {
        uiManager.showStatus(`Connected (${health.toolsAvailable} tools available)`, 'success');
      } else {
        uiManager.showStatus('Server connected but MCP not ready', 'error');
      }
    } catch (error) {
      uiManager.showStatus('Cannot connect to server', 'error');
    }
  }

  // Handle form submission
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value;
    messageInput.value = '';
    sendMessage(message);
  });

  // Initialize
  loadHistory();
  checkHealth();
  messageInput.focus();
})();

// Load schemas for tests
if (typeof window === 'undefined') {
  await loadSchemas();
}
