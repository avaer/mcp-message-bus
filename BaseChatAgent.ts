// BaseChatAgent.ts

import { Agent } from "@mastra/core/agent";
import { ChatMessage } from "./chatSchemas";
import { ChatResources } from "./chatResources";

export interface BaseChatAgentOptions {
  agent: Agent;
  resources: ChatResources;  // The object with subscribe, read, send, etc.
  resourceUri: string;
  // roomRef is no longer needed as we'll get it from the resource
}

/**
 * A generic class that:
 *  - Subscribes to a JSON-based chat resource,
 *  - Tracks known messages but SKIPS generating responses for the initial backlog,
 *  - Responds to newly arrived messages only.
 */
export class BaseChatAgent {
  private agent: Agent;
  private resources: ChatResources;
  private resourceUri: string;
  private roomRef: string = ''; // This will be populated from the resource

  private knownMessages: ChatMessage[] = [];
  private knownMessageIds: Set<string> = new Set();

  constructor(opts: BaseChatAgentOptions) {
    this.agent = opts.agent;
    this.resources = opts.resources;
    this.resourceUri = opts.resourceUri;
    
    this.handleResourceUpdate = this.handleResourceUpdate.bind(this);
  }

  /**
   * Start the agent: 
   *  - subscribe to the resource,
   *  - set up event listener,
   *  - perform an initial read (no generation).
   */
  public async start(): Promise<void> {
    await this.resources.subscribe(this.resourceUri);

    this.resources.onResourceUpdated(this.handleResourceUpdate);

    // Read existing backlog but do NOT generate responses
    const { messages: initialMessages, roomRef } = await this.resources.readResource(this.resourceUri);
    // Set the roomRef from the resource
    this.roomRef = roomRef;
    this.knownMessages = initialMessages;
    
    // Store message IDs in the Set for faster lookups
    initialMessages.forEach(msg => this.knownMessageIds.add(msg.id));

    console.log("Initial backlog loaded:", this.knownMessages.length, "messages for room:", this.roomRef);
  }

  /**
   * Called when 'notifications/resources/updated' fires for our resource.
   * We read the new messages, find newly arrived ones, and respond only to those.
   */
  private async handleResourceUpdate(updatedUri: string, roomRef: string) {
    if (updatedUri !== this.resourceUri) return;

    // Update roomRef if provided in the notification
    if (roomRef) {
      this.roomRef = roomRef;
    }
    
    console.log(`[BaseChatAgent] Resource updated: ${updatedUri} for room: ${this.roomRef}`);
    const { messages: latestMessages, roomRef: updatedRoomRef } = await this.resources.readResource(this.resourceUri);
    
    // Update roomRef if provided in the response
    if (updatedRoomRef) {
      this.roomRef = updatedRoomRef;
    }

    // Filter messages to find only the ones we haven't seen before
    const newMessages = latestMessages.filter(msg => !this.knownMessageIds.has(msg.id));
    
    if (newMessages.length === 0) {
      console.log("No new messages found");
      return;
    }

    // Update our local cache with all the latest messages
    this.knownMessages = latestMessages;
    
    // Update our set of known message IDs
    newMessages.forEach(msg => this.knownMessageIds.add(msg.id));

    for (const msg of newMessages) {
      console.log("New user message arrived:", msg);

      // Generate a reply from the Mastra agent
      const historyMessages = this.knownMessages.map(msg => ({
        role: 'user' as const,
        content: `${msg.user}: ${msg.content}`
      }));
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant responding only to new incoming messages.' },
        ...historyMessages,
        { role: 'user' as const, content: `New message from ${msg.user}: ${msg.content}` }
      ];
      const response = await this.agent.generate(messages);
      console.log("Agent reply:", response);

      // Send to room
      await this.resources.sendMessage(this.roomRef, response.text);

      // Optionally, you might add the agent's reply to knownMessages
      // if the server expects to see the agent's message in subsequent reads.
      // That typically requires you to re-fetch the resource or
      // rely on a separate mechanism to inject the agent's messages.
    }
  }

  /**
   * Convert the entire conversation to a text transcript for the agent.
   */
  private messagesToText(messages: ChatMessage[]): string {
    return messages.map(m => `${m.user}: ${m.content}`).join("\n");
  }
}