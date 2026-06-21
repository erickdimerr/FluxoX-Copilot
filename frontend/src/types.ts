export interface AutomationType {
  id: string;
  name: string;
  description: string;
}

export interface WebhookPlatformInstructions {
  platform: string;
  steps: string[];
}

export interface AIOption {
  label: string;
  value: string;
}

export type AIInputType = "options" | "text" | "confirmation";

export interface FlowNode {
  id: string;
  type: "action" | "condition" | "delay";
  channel?: string;
  config: Record<string, any>;
  next?: string;
  branches?: { true: string; false: string };
}

export interface Flow {
  flow_id: string;
  name: string;
  automation_type_id: string;
  webhook_token: string;
  status: string;
  trigger: {
    type: string;
    event: string;
    delay: { unit: string; value: number };
  };
  nodes: FlowNode[];
  start_node_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIChatResponse {
  message: string;
  input_type: AIInputType;
  options?: AIOption[];
  flow: Flow;
  flow_complete: boolean;
}

export interface ChatBubble {
  role: "user" | "assistant";
  text: string;
}

export type ConnectionStatus = "connected" | "disconnected" | "pending";

export interface WhatsAppConnection {
  id: string;
  name: string;
  provider_type: "evolution" | "cloud_api";
  status: ConnectionStatus;
  evolution_instance_name?: string;
  created_at: string;
}
