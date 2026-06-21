export type ConnectionStatus = "connected" | "disconnected" | "pending";
export type ProviderType = "evolution" | "cloud_api";

export interface WhatsAppConnection {
  id: string;
  name: string;
  provider_type: ProviderType;
  status: ConnectionStatus;
  evolution_instance_name?: string;
  created_at: string;
}
