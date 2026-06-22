import { prisma } from "../lib/prisma.js";
import { DEFAULT_USER_ID } from "../lib/constants.js";
import { Flow, FlowNode, FlowStatus, DelayUnit } from "../types/flow.js";

type PrismaFlow = NonNullable<Awaited<ReturnType<typeof prisma.flow.findUnique>>>;

function toFlow(record: PrismaFlow): Flow {
  return {
    flow_id: record.id,
    name: record.name,
    automation_type_id: record.automationType,
    webhook_token: record.webhookToken,
    status: record.status as FlowStatus,
    trigger: {
      type: "webhook",
      event: record.triggerEvent,
      delay: {
        unit: record.triggerDelayUnit as DelayUnit,
        value: record.triggerDelayValue,
      },
    },
    nodes: record.nodes as unknown as FlowNode[],
    start_node_id: record.startNodeId,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
}

export async function createEmptyFlow(
  name: string,
  automationTypeId: string,
  triggerEvent: string
): Promise<Flow> {
  const record = await prisma.flow.create({
    data: {
      userId: DEFAULT_USER_ID,
      name,
      automationType: automationTypeId,
      triggerEvent,
      triggerDelayUnit: "immediate",
      triggerDelayValue: 0,
      nodes: [],
      status: "draft",
    },
  });
  return toFlow(record);
}

// No-op: createEmptyFlow já persiste no banco
export async function storeFlow(_flow: Flow): Promise<void> {}

export async function updateStoredFlow(flow: Flow): Promise<void> {
  await prisma.flow.update({
    where: { id: flow.flow_id },
    data: {
      name: flow.name,
      status: flow.status,
      nodes: flow.nodes as object[],
      startNodeId: flow.start_node_id,
    },
  });
}

export async function getFlowsByType(typeId: string): Promise<Flow[]> {
  const records = await prisma.flow.findMany({
    where: { automationType: typeId, userId: DEFAULT_USER_ID },
    orderBy: { createdAt: "desc" },
  });
  return records.map(toFlow);
}

export async function getFlowById(id: string): Promise<Flow | null> {
  const record = await prisma.flow.findUnique({ where: { id } });
  return record ? toFlow(record) : null;
}

export async function activateFlow(flowId: string, automationType: string): Promise<void> {
  await prisma.flow.updateMany({
    where: { automationType, userId: DEFAULT_USER_ID, id: { not: flowId } },
    data: { status: "paused" },
  });
  await prisma.flow.update({
    where: { id: flowId },
    data: { status: "active" },
  });
}

// Atualiza updated_at no objeto em memória antes de salvar no banco
export function touchFlow(flow: Flow): void {
  flow.updated_at = new Date().toISOString();
}
