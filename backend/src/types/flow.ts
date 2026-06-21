// Tipos do schema de fluxo de automação

export type DelayUnit = "immediate" | "minutes" | "hours" | "days";

export interface TriggerConfig {
  type: "webhook";
  event: string; // ex: "cart_abandoned"
  delay: {
    unit: DelayUnit;
    value: number; // 0 quando immediate
  };
}

export type ChannelType = "whatsapp" | "email" | "sms";

export interface ActionNode {
  id: string;
  type: "action";
  channel: ChannelType;
  config: {
    message_template?: string;
    subject?: string; // usado em email
  };
  next: string | "end";
}

export type ConditionCheck =
  | "purchase_completed"
  | "link_clicked"
  | "message_replied";

export interface ConditionNode {
  id: string;
  type: "condition";
  config: {
    check: ConditionCheck;
    wait: {
      unit: DelayUnit;
      value: number;
    };
  };
  branches: {
    true: string | "end";
    false: string | "end";
  };
}

export interface DelayNode {
  id: string;
  type: "delay";
  config: {
    unit: DelayUnit;
    value: number;
  };
  next: string | "end";
}

export type FlowNode = ActionNode | ConditionNode | DelayNode;

export type FlowStatus = "draft" | "active" | "paused";

export interface Flow {
  flow_id: string;
  name: string;
  automation_type_id: string;
  webhook_token: string;
  status: FlowStatus;
  trigger: TriggerConfig;
  nodes: FlowNode[];
  start_node_id: string | null;
  created_at: string;
  updated_at: string;
}

// ----- Tipos da resposta estruturada da IA para o frontend -----

export interface AIOption {
  label: string;
  value: string;
}

export type AIInputType = "options" | "text" | "confirmation";

export interface AIChatResponse {
  message: string;
  input_type: AIInputType;
  options?: AIOption[];
  flow: Flow; // estado atual do fluxo após processar a mensagem
  flow_complete: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
