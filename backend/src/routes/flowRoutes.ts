import { FastifyInstance } from "fastify";
import { automationTypes, getAutomationTypeById } from "../automationTypes.js";
import { createEmptyFlow, storeFlow, updateStoredFlow, getFlowsByType, getFlowById, activateFlow } from "../services/flowStore.js";
import { getSession, setSession } from "../services/sessionStore.js";
import { processChatMessage, evaluateFlow } from "../services/aiService.js";
import { prisma } from "../lib/prisma.js";
import { DEFAULT_USER_ID } from "../lib/constants.js";
import { detectEventType, EVENT_TYPE_MAP } from "../lib/eventMapping.js";
import { parseWebhookPayload, SUPPORTED_PLATFORMS } from "../lib/platformParsers.js";
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

  // Ativa um fluxo e pausa os outros do mesmo tipo de automação
  app.patch("/api/flows/:flowId/activate", async (req, reply) => {
    const { flowId } = req.params as { flowId: string };
    const flow = await getFlowById(flowId);
    if (!flow) return reply.status(404).send({ error: "Fluxo não encontrado." });
    await activateFlow(flowId, flow.automation_type_id);
    return reply.send({ ok: true });
  });

  // Avalia o fluxo com IA e retorna score + pontos fortes + melhorias
  app.post("/api/flows/:sessionId/evaluate", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = await getSession(sessionId);
    if (!session) return reply.status(404).send({ error: "Sessão não encontrada." });
    const evaluation = await evaluateFlow(session.flow);
    return reply.send(evaluation);
  });

  // Retorna informações de integração: URL por plataforma + mapeamento de eventos
  app.get("/api/integration", async (_req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } });
    if (!user) return reply.status(404).send({ error: "Usuário não encontrado." });

    const base = `${BASE_URL}/webhook/receive/${user.webhookToken}`;
    return reply.send({
      webhook_urls: Object.fromEntries(
        SUPPORTED_PLATFORMS.map((p) => [p, `${base}/${p}`])
      ),
      event_mapping: EVENT_TYPE_MAP,
    });
  });

  // Recebe eventos do webhook — URL inclui a plataforma para saber qual parser usar
  app.post("/webhook/receive/:userToken/:platform", async (req, reply) => {
    const { userToken, platform } = req.params as { userToken: string; platform: string };
    const body = req.body as Record<string, unknown>;

    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return reply.status(400).send({ error: `Plataforma não suportada: ${platform}` });
    }

    const user = await prisma.user.findUnique({ where: { webhookToken: userToken } });
    if (!user) {
      app.log.warn({ userToken }, "Webhook recebido com token inválido");
      return reply.status(404).send({ error: "Token inválido." });
    }

    const automationTypeId = detectEventType(body);
    app.log.info({ userToken, platform, automationTypeId }, "Webhook recebido");

    if (!automationTypeId) {
      return reply.send({ received: true, matched: false, reason: "event_type não reconhecido" });
    }

    const activeFlow = await prisma.flow.findFirst({
      where: { userId: user.id, automationType: automationTypeId, status: "active" },
    });

    if (!activeFlow) {
      return reply.send({ received: true, matched: true, automationTypeId, executed: false, reason: "nenhum fluxo ativo" });
    }

    const normalized = parseWebhookPayload(platform, body);
    const customerPhone = normalized?.customer_phone ?? null;

    // Deduplicação: evita executar o mesmo fluxo duas vezes para o mesmo cliente
    // quando múltiplas plataformas (ex: Shopify + Appmax) disparam o mesmo tipo de evento
    if (customerPhone) {
      const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
      const since = new Date(Date.now() - DEDUP_WINDOW_MS);

      const duplicate = await prisma.flowExecution.findFirst({
        where: {
          userId: user.id,
          automationTypeId,
          customerPhone,
          executedAt: { gte: since },
        },
      });

      if (duplicate) {
        app.log.info({ flowId: activeFlow.id, automationTypeId, platform, duplicateId: duplicate.id }, "Webhook deduplicado");
        return reply.send({
          received: true,
          matched: true,
          automationTypeId,
          executed: false,
          deduplicated: true,
          reason: `Evento já processado pela plataforma "${duplicate.platform}" nos últimos 10 minutos`,
        });
      }

      await prisma.flowExecution.create({
        data: { userId: user.id, automationTypeId, customerPhone, platform, flowId: activeFlow.id },
      });
    }

    app.log.info({ flowId: activeFlow.id, automationTypeId, platform, phone: customerPhone }, "Fluxo ativo encontrado — aguardando Flow Runner");

    return reply.send({
      received: true,
      matched: true,
      automationTypeId,
      executed: false,
      flowId: activeFlow.id,
      customer: normalized
        ? { name: normalized.customer_name, phone: normalized.customer_phone }
        : null,
    });
  });
}
