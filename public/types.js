/**
 * Frontend Type Definitions for Todo Chat Application
 * Defines API contracts and UI state structures
 */

/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'} role - Message sender role
 * @property {string|Object[]} content - Message content (string for user, array for assistant)
 */

/**
 * @typedef {Object} ChatRequest
 * @property {string} message - User's message text
 * @property {ChatMessage[]} conversationHistory - Previous conversation messages
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string} response - Assistant's text response
 * @property {ChatMessage[]} conversationHistory - Updated conversation history
 */

/**
 * @typedef {Object} HealthResponse
 * @property {string} status - Server health status
 * @property {boolean} mcpConnected - MCP client connection status
 * @property {number} toolsAvailable - Number of MCP tools available
 */

/**
 * @typedef {Object} ConversationState
 * @property {ChatMessage[]} messages - All chat messages
 * @property {boolean} isLoading - Loading state for API calls
 * @property {string|null} error - Error message if any
 */

/**
 * @typedef {Object} ApiClient
 * @property {function(string, ChatMessage[]): Promise<ChatResponse>} sendMessage - Send chat message
 * @property {function(): Promise<HealthResponse>} checkHealth - Check server health
 */

/**
 * @typedef {Object} ConversationManager
 * @property {function(): ChatMessage[]} load - Load conversation from localStorage
 * @property {function(ChatMessage[]): void} save - Save conversation to localStorage
 * @property {function(): void} clear - Clear conversation from localStorage
 */

/**
 * @typedef {Object} UIManager
 * @property {function(string, string): void} addMessage - Add message to UI
 * @property {function(string, string): void} showStatus - Show status message
 * @property {function(): void} clearStatus - Clear status message
 * @property {function(boolean): void} setLoading - Set loading state
 */
