import Anthropic from "@anthropic-ai/sdk";

// Tools que a IA pode chamar para montar/editar o fluxo incrementalmente.
// Cada tool corresponde a uma operação estrutural no JSON do Flow.

export const flowTools: Anthropic.Tool[] = [
  {
    name: "set_trigger",
    description:
      "Define o evento de gatilho do fluxo e o delay inicial antes da primeira ação. Use isso assim que o usuário responder sobre quando o fluxo deve começar.",
    input_schema: {
      type: "object",
      properties: {
        event: {
          type: "string",
          enum: ["cart_abandoned"],
          description: "Evento que dispara o fluxo",
        },
        delay_unit: {
          type: "string",
          enum: ["immediate", "minutes", "hours", "days"],
        },
        delay_value: {
          type: "number",
          description: "0 se delay_unit for 'immediate'",
        },
      },
      required: ["event", "delay_unit", "delay_value"],
    },
  },
  {
    name: "add_action_node",
    description:
      "Adiciona um node de envio de mensagem (whatsapp, email ou sms) ao fluxo, conectando-o após o node anterior.",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["whatsapp", "email", "sms"] },
        message_template: {
          type: "string",
          description:
            "Texto base da mensagem, pode usar placeholders como {{nome}}, {{produto}}, {{link_carrinho}}",
        },
        subject: {
          type: "string",
          description: "Assunto do email, obrigatório se channel for 'email'",
        },
        after_node_id: {
          type: "string",
          description:
            "ID do node anterior ao qual este node se conecta, ou 'start' se for o primeiro node do fluxo",
        },
      },
      required: ["channel", "message_template", "after_node_id"],
    },
  },
  {
    name: "add_condition_node",
    description:
      "Adiciona um node de condição que verifica algo (ex: se a compra foi concluída) após um tempo de espera, e ramifica o fluxo em dois caminhos (true/false).",
    input_schema: {
      type: "object",
      properties: {
        check: {
          type: "string",
          enum: ["purchase_completed", "link_clicked", "message_replied"],
        },
        wait_unit: {
          type: "string",
          enum: ["immediate", "minutes", "hours", "days"],
        },
        wait_value: { type: "number" },
        after_node_id: {
          type: "string",
          description: "ID do node anterior, ou 'start'",
        },
      },
      required: ["check", "wait_unit", "wait_value", "after_node_id"],
    },
  },
  {
    name: "add_delay_node",
    description:
      "Adiciona um node de espera/pausa simples no meio do fluxo, sem condição associada.",
    input_schema: {
      type: "object",
      properties: {
        unit: { type: "string", enum: ["minutes", "hours", "days"] },
        value: { type: "number" },
        after_node_id: { type: "string" },
      },
      required: ["unit", "value", "after_node_id"],
    },
  },
  {
    name: "connect_branch",
    description:
      "Conecta uma branch (true/false) de um node de condição existente a outro node, ou marca como 'end' para finalizar aquele ramo.",
    input_schema: {
      type: "object",
      properties: {
        condition_node_id: { type: "string" },
        branch: { type: "string", enum: ["true", "false"] },
        target_node_id: {
          type: "string",
          description: "ID do node de destino, ou 'end'",
        },
      },
      required: ["condition_node_id", "branch", "target_node_id"],
    },
  },
  {
    name: "finish_flow",
    description:
      "Marca o fluxo como completo. Use somente quando o usuário confirmar que não quer adicionar mais etapas.",
    input_schema: {
      type: "object",
      properties: {
        confirmation_message: {
          type: "string",
          description: "Mensagem final de resumo para o usuário",
        },
      },
      required: ["confirmation_message"],
    },
  },
];
