/**
 * @typedef {Object} Todo
 * @property {string} id - Unique identifier for the todo
 * @property {string} text - The todo item text
 * @property {boolean} completed - Whether the todo is completed
 * @property {boolean} starred - Whether the todo is starred/favorited
 * @property {number} priority - Priority tier (1=highest, 5=lowest)
 * @property {string[]} tags - Tags/categories for organization (e.g., ['work', 'pure-earth-labs'])
 * @property {Date|null} dueDate - Optional due date
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

export {};
