import { FastifyInstance } from "fastify";
import { automationTypes, getAutomationTypeById } from "../automationTypes.js";
import { createEmptyFlow, storeFlow, updateStoredFlow, getFlowsByType } from "../services/flowStore.js";
import { getSession, setSession } from "../services/sessionStore.js";
import { processChatMessage } from "../services/aiService.js";
import { v4 as uuidv4 } from "uuid";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

function webhookUrl(token: string) {
  return `${BASE_URL}/webhook/receive/${token}`;
}

export async function flowRoutes(app: FastifyInstance) {
  // Lista todos os tipos de automação
  app.get("/api/automation-types", async (_req, reply) => {
    return reply.send(
      automationTypes.map(({ id, name, description }) => ({ id, name, description }))
    );
  });

  // Lista os fluxos de um tipo
  app.get("/api/automation-types/:typeId/flows", async (req, reply) => {
    const { typeId } = req.params as { typeId: string };
    if (!getAutomationTypeById(typeId)) {
      return reply.status(404).send({ error: "Tipo de automação não encontrado." });
    }
    return reply.send({ flows: await getFlowsByType(typeId) });
  });

  // Cria nova sessão para um tipo de automação
  app.post("/api/automation-types/:typeId/flows", async (req, reply) => {
    const { typeId } = req.params as { typeId: string };
    const automationType = getAutomationTypeById(typeId);
    if (!automationType) {
      return reply.status(404).send({ error: "Tipo de automação não encontrado." });
    }

    const body = req.body as { name?: string };
    const flow = await createEmptyFlow(
      body?.name ?? automationType.name,
      automationType.id,
      automationType.triggerEvent
    );
    const sessionId = uuidv4();

    await storeFlow(flow);
    await setSession(sessionId, { flow, history: [], systemPrompt: automationType.systemPrompt });

    return reply.send({
      session_id: sessionId,
      flow,
      webhook_url: webhookUrl(flow.webhook_token),
      webhook_instructions: automationType.webhook_instructions,
      first_message: {
        message: automationType.firstQuestion,
        input_type: "options",
        options: automationType.firstOptions,
      },
    });
  });

  // Envia mensagem do usuário e retorna próxima etapa
  app.post("/api/flows/:sessionId/chat", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const { message } = req.body as { message: string };

    const session = await getSession(sessionId);
    if (!session) {
      return reply.status(404).send({ error: "Sessão não encontrada." });
    }

    const result = await processChatMessage(
      session.flow,
      session.history,
      message,
      session.systemPrompt
    );

    session.history.push({ role: "user", content: message });
    session.history.push({ role: "assistant", content: result.message });
    await setSession(sessionId, session);
    await updateStoredFlow(result.flow);
    return reply.send(result);
  });

  // Retorna o fluxo atual de uma sessão
  app.get("/api/flows/:sessionId", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = await getSession(sessionId);

    if (!session) {
      return reply.status(404).send({ error: "Sessão não encontrada." });
    }

    return reply.send({
      flow: session.flow,
      webhook_url: webhookUrl(session.flow.webhook_token),
    });
  });

  // Placeholder: recebe eventos do webhook
  app.post("/webhook/receive/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    app.log.info({ token, payload: req.body }, "Webhook recebido");
    return reply.send({ received: true });
  });
}
