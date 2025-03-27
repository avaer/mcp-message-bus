// index.ts

import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { BaseChatAgent } from "./BaseChatAgent";
import { createChatResources } from "./chatResources";
import { DEFAULT_RESOURCE_URI } from "./chatSchemas";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

console.log("Starting index.ts");

/**
 * Example: a fake MCP client that logs calls,
 * simulates a new message event after some delay,
 * and properly tracks messages per roomRef.
 */
class FakeMcpClient {
  // Store messages by roomRef to simulate persistence
  private messagesByRoom: Map<string, Array<{ id: string, user: string, content: string, timestamp: number }>> = new Map();
  // Generate a random room name that will be consistent for this session
  private readonly randomRoomRef: string = `discord:channel:${Math.random().toString(36).substring(2, 10)}${Date.now().toString().substring(9)}`;
  
  constructor() {
    // Initialize with some example data
    this.messagesByRoom.set(this.randomRoomRef, [
      { id: "1", user: "Alice", content: "Hello agent!", timestamp: 1670000000 },
      { id: "2", user: "Bob", content: "Hello Bob!", timestamp: 1670000001 }
    ]);
    console.log(`[MCP] Initialized with random roomRef: ${this.randomRoomRef}`);
  }
  
  async call(method: string, params: any) {
    console.log("[MCP] call ->", method, params);

    if (method === "resources/read") {
      const uri = params.uri;
      // Extract roomRef from the resource URI or use a default
      const roomRef = this.getRoomRefFromUri(uri);
      
      // Return the messages for this room
      const messages = this.messagesByRoom.get(roomRef) || [];
      return {
        roomRef: roomRef, // Include roomRef in the response
        contents: [
          {
            json: [...messages]
          }
        ]
      };
    }
    
    if (method === "tools/send_message") {
      const { roomRef, content } = params;
      // Initialize room if it doesn't exist
      if (!this.messagesByRoom.has(roomRef)) {
        this.messagesByRoom.set(roomRef, []);
      }
      
      // Add agent message to room
      const roomMessages = this.messagesByRoom.get(roomRef)!;
      roomMessages.push({
        id: String(roomMessages.length + 100), // Different ID range for agent
        user: "Agent",
        content,
        timestamp: Date.now()
      });
      
      console.log(`[MCP] Agent message added to room ${roomRef}`);
    }

    return {}; // Stub response for other calls
  }
  
  on(eventName: string, handler: (notification: any) => void) {
    console.log(`[MCP] Registered handler for event: ${eventName}`);

    // Simulate a new message arriving 5 seconds later
    if (eventName === "notification") {
      setTimeout(() => {
        // Use the consistent randomRoomRef
        const resourceUri = DEFAULT_RESOURCE_URI;
        const roomRef = this.randomRoomRef;
        
        if (!this.messagesByRoom.has(roomRef)) {
          this.messagesByRoom.set(roomRef, []);
        }
        
        const roomMessages = this.messagesByRoom.get(roomRef)!;
        roomMessages.push({
          id: String(roomMessages.length + 1),
          user: "Charlie",
          content: "Hey, I'm new here!",
          timestamp: Date.now()
        });
        
        console.log(`[MCP] Simulating a new message event in room ${roomRef}`);
        handler({
          method: "notifications/resources/updated",
          params: { 
            uri: resourceUri,
            roomRef: roomRef // Include the roomRef in the notification
          }
        });
      }, 5000);
    }
  }
  
  // Helper to extract roomRef from resource URI
  private getRoomRefFromUri(uri: string): string {
    // Always return the consistent random roomRef instead of generating from URI
    return this.randomRoomRef;
  }
}

const fakeMcpClient = new FakeMcpClient();

// Initialize OpenAI client with API key from environment variables
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required but not set");
}
const baseURL = process.env.OPENAI_API_URL || "https://api.openai.com/v1";

const model = createOpenAI({
  baseURL,
  apiKey,
})("gpt-4o");

// Create your agent
const mastraAgent = new Agent({
  name: "DiscordAgent",
  instructions: "You are a helpful assistant responding only to new incoming messages in a Discord channel.",
  model
});

// Create the resources object from the fake client
const resources = createChatResources(fakeMcpClient);

// Instantiate our BaseChatAgent with the resources
const chatAgent = new BaseChatAgent({
  agent: mastraAgent,
  resources,
  resourceUri: DEFAULT_RESOURCE_URI
  // roomRef is now retrieved from the resource
});

// Start the agent
(async () => {
  console.log("Starting agent...");
  await chatAgent.start();
  console.log("Agent started, initial backlog loaded. Waiting for new messages...");
})();
