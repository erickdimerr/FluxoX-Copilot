import { v4 as uuidv4 } from "uuid";
import { Flow, FlowNode, ActionNode, ConditionNode, DelayNode } from "../types/flow.js";
import { touchFlow } from "./flowStore.js";

// Resolve "start" / "end" / id real para encadear nodes corretamente
function linkPrevious(flow: Flow, afterNodeId: string, newNodeId: string) {
  if (afterNodeId === "start") {
    flow.start_node_id = newNodeId;
    return;
  }

  const prev = flow.nodes.find((n) => n.id === afterNodeId);
  if (!prev) return;

  if (prev.type === "action" || prev.type === "delay") {
    (prev as ActionNode | DelayNode).next = newNodeId;
  } else if (prev.type === "condition") {
    // Por padrão conecta na branch "false" (caminho de quem não converteu),
    // a IA pode reconectar depois via connect_branch se necessário.
    (prev as ConditionNode).branches.false = newNodeId;
  }
}

interface ToolResult {
  ok: boolean;
  message: string;
}

export function applyToolCall(
  flow: Flow,
  toolName: string,
  input: any
): ToolResult {
  touchFlow(flow);

  switch (toolName) {
    case "set_trigger": {
      flow.trigger = {
        type: "webhook",
        event: input.event,
        delay: { unit: input.delay_unit, value: input.delay_value },
      };
      return { ok: true, message: "Trigger configurado." };
    }

    case "add_action_node": {
      const node: ActionNode = {
        id: uuidv4(),
        type: "action",
        channel: input.channel,
        config: {
          message_template: input.message_template,
          subject: input.subject,
        },
        next: "end",
      };
      flow.nodes.push(node);
      linkPrevious(flow, input.after_node_id, node.id);
      return { ok: true, message: `Node de ação (${input.channel}) adicionado: ${node.id}` };
    }

    case "add_condition_node": {
      const node: ConditionNode = {
        id: uuidv4(),
        type: "condition",
        config: {
          check: input.check,
          wait: { unit: input.wait_unit, value: input.wait_value },
        },
        branches: { true: "end", false: "end" },
      };
      flow.nodes.push(node);
      linkPrevious(flow, input.after_node_id, node.id);
      return { ok: true, message: `Node de condição adicionado: ${node.id}` };
    }

    case "add_delay_node": {
      const node: DelayNode = {
        id: uuidv4(),
        type: "delay",
        config: { unit: input.unit, value: input.value },
        next: "end",
      };
      flow.nodes.push(node);
      linkPrevious(flow, input.after_node_id, node.id);
      return { ok: true, message: `Node de espera adicionado: ${node.id}` };
    }

    case "connect_branch": {
      const node = flow.nodes.find(
        (n) => n.id === input.condition_node_id && n.type === "condition"
      ) as ConditionNode | undefined;

      if (!node) {
        return { ok: false, message: "Node de condição não encontrado." };
      }

      if (input.branch === "true") {
        node.branches.true = input.target_node_id;
      } else {
        node.branches.false = input.target_node_id;
      }

      return { ok: true, message: "Branch conectada." };
    }

    case "finish_flow": {
      flow.status = "draft"; // permanece draft até o usuário publicar
      return { ok: true, message: input.confirmation_message };
    }

    default:
      return { ok: false, message: `Tool desconhecida: ${toolName}` };
  }
}
