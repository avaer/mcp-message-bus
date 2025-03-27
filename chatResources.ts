// chatResources.ts

import { ChatMessage, ChatMessagesSchema } from "./chatSchemas";

/**
 * The resources object will contain the following methods:
 *   - subscribe(resourceUri): subscribe to new message notifications
 *   - onResourceUpdated(cb): register a callback for updates
 *   - readResource(resourceUri): read the current conversation
 *   - sendMessage(channelId, content): post a reply
 */
export interface ChatResources {
  subscribe: (resourceUri: string) => Promise<void>;
  onResourceUpdated: (handler: (resourceUri: string, roomRef: string) => void) => void;
  readResource: (resourceUri: string) => Promise<{ messages: ChatMessage[], roomRef: string }>;
  sendMessage: (roomRef: string, content: string) => Promise<void>;
}

/** 
 * Example “fake” MCP client: 
 * In real usage, you'd implement the actual calls to your MCP server 
 * or pass in a real MCP client here. 
 */
interface FakeMCPClient {
  call(method: string, params: any): Promise<any>;
  on(eventName: string, handler: (notification: any) => void): void;
}

/**
 * Build a ChatResources object using a fake or real MCP client.
 */
export function createChatResources(mcpClient: FakeMCPClient): ChatResources {
  return {
    async subscribe(resourceUri: string) {
      console.log(`Subscribing to resource: ${resourceUri}`);
      await mcpClient.call("resources/subscribe", { uri: resourceUri });
    },

    onResourceUpdated(handler: (resourceUri: string, roomRef: string) => void) {
      // Hook into 'notification' events from the MCP client
      mcpClient.on("notification", (notification) => {
        if (notification.method === "notifications/resources/updated") {
          const updatedUri = notification.params.uri;
          const roomRef = notification.params.roomRef || '';
          handler(updatedUri, roomRef);
        }
      });
    },

    async readResource(resourceUri: string) {
      console.log(`Reading resource: ${resourceUri}`);
      const resp = await mcpClient.call("resources/read", { uri: resourceUri });
      // We assume the JSON array is in resp.contents[0].json:
      if (!resp.contents?.[0]?.json) return { messages: [], roomRef: '' };
      const raw = resp.contents[0].json;
      // Get roomRef from response
      const roomRef = resp.roomRef || '';
      // Validate with Zod
      return { 
        messages: ChatMessagesSchema.parse(raw),
        roomRef
      };
    },

    async sendMessage(roomRef: string, content: string) {
      console.log(`Sending message to Discord channel [${roomRef}]: ${content}`);
      await mcpClient.call("tools/send_message", {
        roomRef, // Discord channel ID in format "discord:channel:1234567890123456789"
        content
      });
    }
  };
}
