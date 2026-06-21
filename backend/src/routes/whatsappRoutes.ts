import { FastifyInstance } from "fastify";
import { WhatsAppConnection } from "../types/whatsapp.js";
import {
  createConnection,
  getConnection,
  listConnections,
  removeConnection,
  updateConnectionStatus,
} from "../services/whatsapp/connectionStore.js";
import {
  createEvolutionInstance,
  deleteEvolutionInstance,
  EvolutionProvider,
  getEvolutionQrCode,
} from "../services/whatsapp/EvolutionProvider.js";

export async function whatsappRoutes(app: FastifyInstance) {
  // Lista conexões
  app.get("/api/connections", async (_req, reply) => {
    return reply.send({ connections: await listConnections() });
  });

  // Cria nova conexão (cria instância no Evolution e retorna QR code)
  app.post("/api/connections", async (req, reply) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      return reply.status(400).send({ error: "Nome é obrigatório." });
    }

    const instanceName = `fluxox-${Date.now()}`;

    try {
      await createEvolutionInstance(instanceName);
    } catch {
      app.log.warn("Evolution API não configurada ou indisponível — instância não criada remotamente");
    }

    const connection = await createConnection(name.trim(), instanceName);

    let qrCode: string | null = null;
    try {
      qrCode = await getEvolutionQrCode(instanceName);
    } catch {
      app.log.warn("Não foi possível obter QR code da Evolution API");
    }

    return reply.send({ connection, qr_code: qrCode });
  });

  // Retorna status atual (para polling do frontend)
  app.get("/api/connections/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const conn = await getConnection(id);
    if (!conn) {
      return reply.status(404).send({ error: "Conexão não encontrada." });
    }

    if (conn.evolution_instance_name) {
      try {
        const provider = new EvolutionProvider(conn.evolution_instance_name);
        const rawStatus = await provider.getStatus();
        const normalized: WhatsAppConnection["status"] =
          rawStatus === "open" ? "connected" : "disconnected";
        if (normalized !== conn.status) {
          await updateConnectionStatus(id, normalized);
        }
        return reply.send({ status: normalized });
      } catch {
        // Evolution inacessível — retorna status em memória
      }
    }

    return reply.send({ status: conn.status });
  });

  // Remove conexão
  app.delete("/api/connections/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const conn = await getConnection(id);
    if (!conn) {
      return reply.status(404).send({ error: "Conexão não encontrada." });
    }

    if (conn.evolution_instance_name) {
      try {
        await deleteEvolutionInstance(conn.evolution_instance_name);
      } catch {
        app.log.warn("Não foi possível remover instância do Evolution");
      }
    }

    await removeConnection(id);
    return reply.send({ deleted: true });
  });
}
