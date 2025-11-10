/**
 * @typedef {Object} Todo
 * @property {string} id - Unique identifier for the todo
 * @property {string} text - The todo item text
 * @property {boolean} completed - Whether the todo is completed
 * @property {boolean} starred - Whether the todo is starred/favorited
 * @property {number} priority - Priority tier (1=highest, 5=lowest)
 * @property {string[]} tags - Tags/categories for organization (e.g., ['work', 'pure-earth-labs'])
 * @property {Date|null} dueDate - Optional due date
 * @property {number} displayOrder - Order for displaying todos (lower numbers appear first)
 * @property {Date} createdAt - When the todo was created
 * @property {Date} updatedAt - When the todo was last updated
 */

/**
 * @typedef {Object} TodoService
 * @property {function(Object): Todo[]} getTodos - Get todos with optional filters (tags, starred, priority)
 * @property {function(string, Object): Todo} createTodo - Create a new todo with text and optional metadata
 * @property {function(string, Object): Todo} updateTodo - Update todo properties
 * @property {function(string): boolean} deleteTodo - Delete a todo
 * @property {function(string, boolean): Todo} toggleStarred - Star/unstar a todo
 * @property {function(string, number): Todo} setPriority - Set priority tier for a todo
 * @property {function(string, string[]): Todo} setTags - Set tags for a todo
 */

/**
 * @typedef {Object} CreateTodoRequest
 * @property {string} text - The todo item text
 * @property {boolean} [starred] - Whether the todo is starred
 * @property {number} [priority] - Priority tier (1-5)
 * @property {string[]} [tags] - Tags for organization
 * @property {string} [dueDate] - Due date in ISO format
 */

/**
 * @typedef {Object} UpdateTodoRequest
 * @property {string} [text] - Updated todo text
 * @property {boolean} [completed] - Completion status
 * @property {boolean} [starred] - Starred status
 * @property {number} [priority] - Priority tier (1-5)
 * @property {string[]} [tags] - Tags
 * @property {string} [dueDate] - Due date in ISO format
 * @property {number} [displayOrder] - Display order
 */

/**
 * @typedef {Object} TodoFilters
 * @property {boolean} [starred] - Filter by starred status
 * @property {boolean} [completed] - Filter by completion status
 * @property {number} [priority] - Filter by priority tier
 * @property {string[]} [tags] - Filter by tags
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error message
 * @property {string} [details] - Additional error details
 */

/**
 * @typedef {'chat'|'todos'} TabName
 * Tab identifier for mobile view
 */

/**
 * @typedef {Object} MobileTabManager
 * @property {TabName} activeTab - Currently active tab ('chat' or 'todos')
 * @property {HTMLElement} chatPanel - Chat panel DOM element
 * @property {HTMLElement} todosPanel - Todos panel DOM element
 * @property {HTMLElement} chatTabButton - Chat tab button DOM element
 * @property {HTMLElement} todosTabButton - Todos tab button DOM element
 * @property {function(): void} init - Initialize tab manager and set up event listeners
 * @property {function(TabName): void} switchTab - Switch to specified tab
 * @property {function(): boolean} isMobile - Check if viewport is mobile size (< 768px)
 */

export {};
