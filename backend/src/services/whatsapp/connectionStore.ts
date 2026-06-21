import { prisma } from "../../lib/prisma.js";
import { DEFAULT_USER_ID } from "../../lib/constants.js";
import { WhatsAppConnection } from "../../types/whatsapp.js";

type PrismaConn = NonNullable<Awaited<ReturnType<typeof prisma.whatsappConnection.findUnique>>>;

function toConnection(record: PrismaConn): WhatsAppConnection {
  return {
    id: record.id,
    name: record.name,
    provider_type: record.providerType as WhatsAppConnection["provider_type"],
    status: record.status as WhatsAppConnection["status"],
    evolution_instance_name: record.evolutionInstanceName ?? undefined,
    created_at: record.createdAt.toISOString(),
  };
}

export async function listConnections(): Promise<WhatsAppConnection[]> {
  const records = await prisma.whatsappConnection.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: { createdAt: "desc" },
  });
  return records.map(toConnection);
}

export async function getConnection(id: string): Promise<WhatsAppConnection | undefined> {
  const record = await prisma.whatsappConnection.findUnique({ where: { id } });
  return record ? toConnection(record) : undefined;
}

export async function createConnection(
  name: string,
  instanceName: string
): Promise<WhatsAppConnection> {
  const record = await prisma.whatsappConnection.create({
    data: {
      userId: DEFAULT_USER_ID,
      name,
      providerType: "evolution",
      status: "pending",
      evolutionInstanceName: instanceName,
    },
  });
  return toConnection(record);
}

export async function updateConnectionStatus(
  id: string,
  status: WhatsAppConnection["status"]
): Promise<void> {
  await prisma.whatsappConnection.update({ where: { id }, data: { status } });
}

export async function removeConnection(id: string): Promise<boolean> {
  await prisma.whatsappConnection.delete({ where: { id } });
  return true;
}
