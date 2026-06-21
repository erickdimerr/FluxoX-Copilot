import { Flow, FlowNode } from "../types";

function describeNode(node: FlowNode): string {
  if (node.type === "action") {
    const channel = node.channel?.toUpperCase();
    return `📩 Enviar ${channel}${node.config.subject ? ` — "${node.config.subject}"` : ""}`;
  }
  if (node.type === "condition") {
    const waitLabel = `${node.config.wait?.value} ${node.config.wait?.unit}`;
    return `❓ Verificar "${node.config.check}" após ${waitLabel}`;
  }
  if (node.type === "delay") {
    return `⏱️ Esperar ${node.config.value} ${node.config.unit}`;
  }
  return "Node desconhecido";
}

export function FlowView({ flow }: { flow: Flow }) {
  const delay = flow.trigger.delay;
  const delayLabel =
    delay.unit === "immediate" ? "imediatamente" : `${delay.value} ${delay.unit}`;

  return (
    <div className="flow-view">
      <h3>{flow.name}</h3>
      <div className="flow-node trigger">
        🚀 Trigger: <strong>{flow.trigger.event}</strong> (início: {delayLabel})
      </div>

      {flow.nodes.length === 0 && (
        <p className="empty-hint">O fluxo ainda está sendo montado...</p>
      )}

      {flow.nodes.map((node) => (
        <div key={node.id} className={`flow-node ${node.type}`}>
          <div>{describeNode(node)}</div>
          {node.type === "condition" && node.branches && (
            <div className="branches">
              <span>✅ Verdadeiro → {node.branches.true}</span>
              <span>❌ Falso → {node.branches.false}</span>
            </div>
          )}
        </div>
      ))}

      <div className={`flow-status ${flow.status}`}>Status: {flow.status}</div>
    </div>
  );
}
