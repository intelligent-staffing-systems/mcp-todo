/**
 * Frontend Zod Schemas for API Validation
 * Validates API responses to ensure contract compliance
 */

import { z } from 'https://cdn.jsdelivr.net/npm/zod@3.23.8/+esm';

/**
 * Schema for chat message content blocks (assistant messages)
 */
export const ContentBlockSchema = z.object({
  type: z.enum(['text', 'tool_use', 'tool_result']),
  text: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  input: z.any().optional(),
});

/**
 * Schema for individual chat messages
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.string(),
    z.array(ContentBlockSchema),
  ]),
});

/**
 * Schema for chat request payload
 */
export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationHistory: z.array(ChatMessageSchema).optional().default([]),
});

/**
 * Schema for chat response
 */
export const ChatResponseSchema = z.object({
  response: z.string(),
  conversationHistory: z.array(ChatMessageSchema),
});

/**
 * Schema for health check response
 */
export const HealthResponseSchema = z.object({
  status: z.string(),
  mcpConnected: z.boolean(),
  toolsAvailable: z.number(),
});

/**
 * Schema for error response
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});
