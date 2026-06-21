import { prisma } from "../lib/prisma.js";
import { Flow, ChatMessage } from "../types/flow.js";

interface Session {
  flow: Flow;
  history: ChatMessage[];
  systemPrompt: string;
}

interface SessionRecord extends Session {
  savedCount: number;
}

const sessions = new Map<string, SessionRecord>();

export async function getSession(id: string): Promise<Session | undefined> {
  return sessions.get(id);
}

export async function setSession(id: string, session: Session): Promise<void> {
  const existing = sessions.get(id);
  const savedCount = existing?.savedCount ?? 0;
  const newMessages = session.history.slice(savedCount);

  if (newMessages.length > 0) {
    await prisma.flowChatMessage.createMany({
      data: newMessages.map((m) => ({
        flowId: session.flow.flow_id,
        role: m.role,
        content: m.content,
      })),
    });
  }

  sessions.set(id, { ...session, savedCount: session.history.length });
}
