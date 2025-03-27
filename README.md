# MCP Message Bus Example

This project demonstrates a server-driven Mastra agent that responds on the message bus to the MCP Server, showcasing the agentic paradigm where the environment drives the agent, rather than the agent driving itself.

## Overview

The MCP Message Bus example simulates an environment where:

1. An agent subscribes to a chat resource (like a Discord channel)
2. The agent listens for new messages via notifications
3. The agent responds only to newly arrived messages while tracking conversation history
4. All interactions flow through a message bus architecture

This implementation pattern puts the environment (MCP Server) in control, where the agent's behavior is driven by external events rather than by the agent's internal logic.

## Prerequisites

- Node.js 16+ 
- pnpm
- OpenAI API key

## Getting Started

1. Clone this repository
2. Copy `.env.example` to `.env` and set your environment variables:

```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_URL=https://api.openai.com/v1  # Optional, defaults to OpenAI's API
```

3. Install dependencies:

```bash
pnpm install
```

4. Start the development server:

```bash
pnpm dev
```

## How It Works

1. The `FakeMcpClient` simulates an MCP server with:
   - Message persistence per channel/room
   - Event notifications
   - Message sending capabilities

2. The `BaseChatAgent` provides the core agent functionality:
   - Subscribing to chat resources
   - Processing notifications
   - Maintaining conversation state
   - Generating responses only for new messages

3. The demo automatically:
   - Loads an initial backlog of messages
   - Simulates a new message arriving after 5 seconds
   - Generates a response using the Mastra agent
   - Sends the response back to the chat resource

## Architecture

- `index.ts` - Main entry point and fake MCP client implementation
- `BaseChatAgent.ts` - Core agent implementation that handles subscriptions and responses
- `chatResources.ts` - Interface between the agent and MCP client
- `chatSchemas.ts` - Type definitions and validation for chat messages

## Customization

You can modify the agent's behavior by:

- Changing the model in `index.ts`
- Updating the system instructions
- Implementing your own MCP client for a real deployment

## License

ISC