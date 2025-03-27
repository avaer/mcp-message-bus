// chatSchemas.ts
import { z } from "zod";

/**
 * Each chat message is represented as a JSON object:
 */
export const ChatMessageSchema = z.object({
  id: z.string(),
  user: z.string(),
  content: z.string(),
  timestamp: z.number()
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/** 
 * A list of chat messages (the entire conversation) 
 */
export const ChatMessagesSchema = z.array(ChatMessageSchema);
export type ChatMessages = z.infer<typeof ChatMessagesSchema>;

/**
 * Example resource URIs or connection strings:
 */
export const DEFAULT_RESOURCE_URI = "chat://channel/general/messages";
