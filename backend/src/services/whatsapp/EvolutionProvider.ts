import { WhatsAppProvider } from "./WhatsAppProvider.js";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

function headers() {
  return { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY };
}

export class EvolutionProvider implements WhatsAppProvider {
  constructor(private instanceName: string) {}

  async sendMessage(to: string, message: string): Promise<void> {
    // POST /message/sendText/{instanceName}
    await fetch(`${EVOLUTION_API_URL}/message/sendText/${this.instanceName}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ number: to, text: message }),
    });
  }

  async getStatus(): Promise<string> {
    // GET /instance/connectionState/{instanceName}
    const res = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${this.instanceName}`,
      { headers: headers() }
    );
    if (!res.ok) return "disconnected";
    const data = (await res.json()) as { instance?: { state?: string } };
    return data?.instance?.state ?? "disconnected";
  }
}

export async function createEvolutionInstance(instanceName: string): Promise<void> {
  // POST /instance/create
  await fetch(`${EVOLUTION_API_URL}/instance/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ instanceName, integration: "WHATSAPP-BAILEYS" }),
  });
}

export async function getEvolutionQrCode(instanceName: string): Promise<string | null> {
  // GET /instance/connect/{instanceName}
  const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
    headers: headers(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { base64?: string; code?: string };
  return data?.base64 ?? null;
}

export async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  // DELETE /instance/delete/{instanceName}
  await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
    method: "DELETE",
    headers: headers(),
  });
}
