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

  /**
   * Reorder todos
   * @param {string[]} orderedIds
   * @returns {Promise<Object>}
   */
  async reorderTodos(orderedIds) {
    const response = await fetch(`${this.baseUrl}/api/todos/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderedIds }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
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
 * Manages todo list UI and interactions
 * @implements {TodoListManager}
 */
export class TodoListManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.todosContainer = document.getElementById('todos-container');
    this.quickAddForm = document.getElementById('quick-add-form');
    this.quickAddInput = document.getElementById('quick-add-input');
    this.quickAddPoints = document.getElementById('quick-add-points');
    this.pollingInterval = null;
    this.currentTodos = [];
    this.draggedElement = null;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for quick add form
   */
  setupEventListeners() {
    if (this.quickAddForm) {
      this.quickAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = this.quickAddInput.value.trim();
        const pointsValue = this.quickAddPoints?.value;
        const points = pointsValue ? parseInt(pointsValue, 10) : undefined;

        if (text) {
          await this.quickAddTodo(text, points);
          this.quickAddInput.value = '';
          if (this.quickAddPoints) this.quickAddPoints.value = '';
        }
      });
    }
  }

  /**
   * Render todos to the DOM (smart diff-based update to prevent flickering)
   * @param {Todo[]} todos
   */
  render(todos) {
    if (!this.todosContainer) return;

    this.currentTodos = todos;

    // Handle empty state
    if (todos.length === 0) {
      this.todosContainer.innerHTML = '';
      const emptyState = document.createElement('div');
      emptyState.className = 'text-center text-gray-400 py-8';
      emptyState.textContent = 'No todos yet. Add one to get started!';
      this.todosContainer.appendChild(emptyState);
      return;
    }

    // Remove empty state if present (transition from empty to filled)
    const emptyState = this.todosContainer.querySelector('.text-center');
    if (emptyState) {
      emptyState.remove();
    }

    // Get existing todo elements
    const existingElements = Array.from(this.todosContainer.querySelectorAll('.todo-item'));
    const existingIds = new Set(existingElements.map(el => el.dataset.id));
    const newIds = new Set(todos.map(t => t.id));

    // Remove todos that no longer exist
    existingElements.forEach(el => {
      if (!newIds.has(el.dataset.id)) {
        el.remove();
      }
    });

    // Add or update todos
    todos.forEach((todo, index) => {
      const existingElement = existingElements.find(el => el.dataset.id === todo.id);

      if (existingElement) {
        // Update existing element only if data changed
        this.updateTodoElement(existingElement, todo);

        // Reorder if necessary
        const currentIndex = Array.from(this.todosContainer.children).indexOf(existingElement);
        if (currentIndex !== index) {
          if (index === 0) {
            this.todosContainer.prepend(existingElement);
          } else {
            const prevElement = this.todosContainer.children[index];
            this.todosContainer.insertBefore(existingElement, prevElement);
          }
        }
      } else {
        // Create new element
        const newElement = this.createTodoElement(todo);
        if (index >= this.todosContainer.children.length) {
          this.todosContainer.appendChild(newElement);
        } else {
          this.todosContainer.insertBefore(newElement, this.todosContainer.children[index]);
        }
      }
    });
  }

  /**
   * Update an existing todo element without recreating it
   * @param {HTMLElement} element
   * @param {Todo} todo
   */
  updateTodoElement(element, todo) {
    // Update checkbox
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked !== todo.completed) {
      checkbox.checked = todo.completed;
    }

    // Update text and styling
    const textSpan = element.querySelector('span:first-of-type');
    if (textSpan) {
      textSpan.textContent = todo.text;
      textSpan.className = `flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`;
    }

    // Note: Priority and star badges are not updated dynamically for simplicity
    // They will be recreated on next full refresh if needed
  }

  /**
   * Create a todo DOM element
   * @param {Todo} todo
   * @returns {HTMLElement}
   */
  createTodoElement(todo) {
    const div = document.createElement('div');
    div.className = 'todo-item flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-move';
    div.dataset.id = todo.id;
    div.draggable = true;

    // Drag event listeners
    div.addEventListener('dragstart', (e) => this.handleDragStart(e));
    div.addEventListener('dragend', (e) => this.handleDragEnd(e));
    div.addEventListener('dragover', (e) => this.handleDragOver(e));
    div.addEventListener('drop', (e) => this.handleDrop(e));
    div.addEventListener('dragenter', (e) => this.handleDragEnter(e));
    div.addEventListener('dragleave', (e) => this.handleDragLeave(e));

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.className = 'w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500';
    checkbox.addEventListener('change', () => this.toggleComplete(todo.id, todo.completed));

    // Text
    const text = document.createElement('span');
    text.className = `flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`;
    text.textContent = todo.text;

    // Priority badge
    if (todo.priority && todo.priority <= 2) {
      const priority = document.createElement('span');
      priority.className = 'px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800';
      priority.textContent = `P${todo.priority}`;
      div.appendChild(priority);
    }

    // Points badge/editor
    const pointsContainer = this.createPointsEditor(todo);
    div.appendChild(pointsContainer);

    // Star button
    if (todo.starred) {
      const star = document.createElement('span');
      star.className = 'text-yellow-400';
      star.textContent = '⭐';
      div.appendChild(star);
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-red-500 hover:text-red-700 font-bold';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));

    div.appendChild(checkbox);
    div.appendChild(text);
    div.appendChild(deleteBtn);

    return div;
  }

  /**
   * Toggle todo completion status
   * @param {string} id
   * @param {boolean} currentStatus
   */
  async toggleComplete(id, currentStatus) {
    try {
      await this.apiClient.updateTodo(id, { completed: !currentStatus });
      await this.refresh();
    } catch (error) {
      console.error('Toggle complete error:', error);
    }
  }

  /**
   * Delete a todo
   * @param {string} id
   */
  async deleteTodo(id) {
    try {
      await this.apiClient.deleteTodo(id);
      await this.refresh();
    } catch (error) {
      console.error('Delete todo error:', error);
    }
  }


  /**
   * Update todo points
   * @param {string} id
   * @param {number|null} points
   */
  async updateTodoPoints(id, points) {
    try {
      await this.apiClient.updateTodo(id, { points: points || null });
      await this.refresh();
    } catch (error) {
      console.error('Update points error:', error);
    }
  }

  /**
   * Create points editor dropdown
   * @param {Todo} todo
   * @returns {HTMLElement}
   */
  createPointsEditor(todo) {
    const select = document.createElement('select');
    select.className = 'points-editor px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 border-0 cursor-pointer hover:bg-blue-200 transition-colors';
    select.title = 'Edit story points';

    // Add options
    const options = [
      { value: '', label: 'None' },
      { value: '1', label: '1 pt' },
      { value: '2', label: '2 pts' },
      { value: '3', label: '3 pts' },
      { value: '5', label: '5 pts' },
      { value: '8', label: '8 pts' },
      { value: '13', label: '13 pts' },
    ];

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if ((todo.points && opt.value === String(todo.points)) || (!todo.points && opt.value === '')) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Handle change
    select.addEventListener('change', (e) => {
      e.stopPropagation();
      const value = e.target.value;
      const points = value ? parseInt(value, 10) : null;
      this.updateTodoPoints(todo.id, points);
    });

    return select;
  }

  /**
   * Quick add a new todo
   * @param {string} text
   * @param {number} [points] - Optional story points
   */
  async quickAddTodo(text, points) {
    try {
      const data = { text };
      if (points !== undefined) {
        data.points = points;
      }
      await this.apiClient.createTodo(data);
      await this.refresh();
    } catch (error) {
      console.error('Quick add error:', error);
    }
  }

  /**
   * Refresh todos from server
   */
  async refresh() {
    try {
      const todos = await this.apiClient.getTodos();
      this.render(todos);
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }

  /**
   * Start polling for updates
   * @param {number} interval - Polling interval in milliseconds
   */
  startPolling(interval = 2000) {
    // Initial load
    this.refresh();

    // Poll for updates
    this.pollingInterval = setInterval(() => {
      this.refresh();
    }, interval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Drag and drop event handlers
   */
  handleDragStart(e) {
    this.draggedElement = e.target;
    e.target.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
  }

  handleDragEnd(e) {
    e.target.style.opacity = '1';

    // Remove all drag-over classes
    const items = this.todosContainer.querySelectorAll('.todo-item');
    items.forEach(item => {
      item.classList.remove('drag-over');
    });
  }

  handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  handleDragEnter(e) {
    if (e.target.classList.contains('todo-item')) {
      e.target.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    if (e.target.classList.contains('todo-item')) {
      e.target.classList.remove('drag-over');
    }
  }

  async handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (this.draggedElement !== e.target && e.target.classList.contains('todo-item')) {
      // Get all todo items
      const items = Array.from(this.todosContainer.querySelectorAll('.todo-item'));
      const draggedIndex = items.indexOf(this.draggedElement);
      const targetIndex = items.indexOf(e.target);

      // Reorder in DOM
      if (draggedIndex < targetIndex) {
        e.target.parentNode.insertBefore(this.draggedElement, e.target.nextSibling);
      } else {
        e.target.parentNode.insertBefore(this.draggedElement, e.target);
      }

      // Get new order of IDs
      const newOrder = Array.from(this.todosContainer.querySelectorAll('.todo-item'))
        .map(item => item.dataset.id);

      // Send reorder request to server
      try {
        await this.apiClient.reorderTodos(newOrder);
      } catch (error) {
        console.error('Failed to reorder todos:', error);
        // Refresh to restore original order on error
        await this.refresh();
      }
    }

    return false;
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
  const todoListManager = new TodoListManager(apiClient);

  let conversationHistory = [];

  // Load conversation history
  function loadHistory() {
    conversationHistory = conversationManager.load();
    conversationHistory.forEach(msg => {
      if (msg.role === 'user') {
        // Handle both string and array content
        const content = typeof msg.content === 'string'
          ? msg.content
          : msg.content[0]?.text || JSON.stringify(msg.content);
        uiManager.addMessage('user', content);
      } else if (msg.role === 'assistant') {
        // Handle array content for assistant messages
        const textContent = Array.isArray(msg.content)
          ? msg.content.find(block => block.type === 'text')
          : { text: msg.content };
        if (textContent && textContent.text) {
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

      // Trigger immediate todo list refresh after chat completes (likely modified todos)
      todoListManager.refresh();

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

  // Handle Clear Chat button
  const clearChatBtn = document.getElementById('clear-chat-btn');
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the chat history?')) {
        // Clear localStorage
        conversationManager.clear();

        // Reset conversation history
        conversationHistory = [];

        // Clear messages from UI
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
        }

        // Show success message
        uiManager.showStatus('Chat history cleared', 'success');
        setTimeout(() => uiManager.clearStatus(), 2000);
      }
    });
  }

  // Initialize
  loadHistory();
  checkHealth();
  messageInput.focus();

  // Start todo list polling (5 second interval - reduced from 2s to minimize visual glitching)
  todoListManager.startPolling(5000);
})();

// Load schemas for tests
if (typeof window === 'undefined') {
  await loadSchemas();
}
