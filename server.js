import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// MCP client connection to our todo server
let mcpClient = null;
let mcpTools = [];

async function initializeMCPClient() {
  const serverProcess = spawn('node', ['./index.js']);

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./index.js'],
  });

  mcpClient = new Client({
    name: 'todo-web-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  await mcpClient.connect(transport);

  // Get available tools from MCP server
  const toolsResponse = await mcpClient.listTools();
  mcpTools = toolsResponse.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));

  console.log(`Connected to MCP server with ${mcpTools.length} tools`);
}

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build messages array with history
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    // Call Claude with tools
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      tools: mcpTools,
      messages,
    });

    // Handle tool calls
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(block => block.type === 'tool_use');

      if (!toolUse) break;

      // Call MCP tool
      const toolResult = await mcpClient.callTool({
        name: toolUse.name,
        arguments: toolUse.input,
      });

      // Add assistant response and tool result to messages
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult.content),
        }],
      });

      // Continue conversation with tool result
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        tools: mcpTools,
        messages,
      });
    }

    // Extract final text response
    const textContent = response.content.find(block => block.type === 'text');

    res.json({
      response: textContent?.text || 'No response',
      conversationHistory: [
        ...messages,
        { role: 'assistant', content: response.content },
      ],
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mcpConnected: mcpClient !== null,
    toolsAvailable: mcpTools.length,
  });
});

// Initialize and start server
async function start() {
  try {
    await initializeMCPClient();
    app.listen(port, () => {
      console.log(`Todo web server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
