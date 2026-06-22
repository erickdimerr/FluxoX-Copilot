import { Flow, FlowNode, ActionNode, ConditionNode, DelayNode } from "../types";

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function buildNodeMap(nodes: FlowNode[]): Map<string, FlowNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}

function TriggerCard({ flow }: { flow: Flow }) {
  const { delay, event } = flow.trigger;
  const delayLabel =
    delay.unit === "immediate" ? "imediatamente" : `${delay.value} ${delay.unit}`;
  return (
    <div className="diagram-node trigger-node">
      <span className="node-icon">🚀</span>
      <div className="node-body">
        <span className="node-type">Gatilho</span>
        <span className="node-title">{event}</span>
        <span className="node-sub">Início: {delayLabel}</span>
      </div>
    </div>
  );
}

function ActionCard({ node }: { node: ActionNode }) {
  return (
    <div className="diagram-node action-node">
      <span className="node-icon">📩</span>
      <div className="node-body">
        <span className="node-type">Ação · {node.channel.toUpperCase()}</span>
        {node.config.message_template && (
          <span className="node-title">{truncate(node.config.message_template, 55)}</span>
        )}
      </div>
    </div>
  );
}

function ConditionCard({ node }: { node: ConditionNode }) {
  const waitLabel = `${node.config.wait.value} ${node.config.wait.unit}`;
  return (
    <div className="diagram-node condition-node">
      <span className="node-icon">❓</span>
      <div className="node-body">
        <span className="node-type">Condição</span>
        <span className="node-title">{node.config.check}</span>
        <span className="node-sub">Aguardar {waitLabel}</span>
      </div>
    </div>
  );
}

function DelayCard({ node }: { node: DelayNode }) {
  return (
    <div className="diagram-node delay-node">
      <span className="node-icon">⏱️</span>
      <div className="node-body">
        <span className="node-type">Aguardar</span>
        <span className="node-title">
          {node.config.value} {node.config.unit}
        </span>
      </div>
    </div>
  );
}

function EndCard() {
  return (
    <div className="diagram-node end-node">
      <span className="node-icon">⏹</span>
      <div className="node-body">
        <span className="node-type">Fim do fluxo</span>
      </div>
    </div>
  );
}

function Arrow() {
  return <div className="diagram-arrow" />;
}

function FlowPath({
  nodeId,
  nodeMap,
  visited = new Set<string>(),
}: {
  nodeId: string | null | undefined;
  nodeMap: Map<string, FlowNode>;
  visited?: Set<string>;
}): JSX.Element {
  if (!nodeId || nodeId === "end") return <EndCard />;
  if (visited.has(nodeId)) return <div className="diagram-cycle">⚠️ ciclo</div>;

  const node = nodeMap.get(nodeId);
  if (!node) return <EndCard />;

  const seen = new Set(visited);
  seen.add(nodeId);

  if (node.type === "condition") {
    const cond = node as ConditionNode;
    return (
      <>
        <ConditionCard node={cond} />
        <div className="diagram-branches">
          <div className="diagram-branch">
            <span className="branch-label true-label">✅ Sim</span>
            <Arrow />
            <FlowPath nodeId={cond.branches.true} nodeMap={nodeMap} visited={seen} />
          </div>
          <div className="diagram-branch-sep" />
          <div className="diagram-branch">
            <span className="branch-label false-label">❌ Não</span>
            <Arrow />
            <FlowPath nodeId={cond.branches.false} nodeMap={nodeMap} visited={seen} />
          </div>
        </div>
      </>
    );
  }

  if (node.type === "action") {
    const act = node as ActionNode;
    return (
      <>
        <ActionCard node={act} />
        <Arrow />
        <FlowPath nodeId={act.next} nodeMap={nodeMap} visited={seen} />
      </>
    );
  }

  const del = node as DelayNode;
  return (
    <>
      <DelayCard node={del} />
      <Arrow />
      <FlowPath nodeId={del.next} nodeMap={nodeMap} visited={seen} />
    </>
  );
}

export function FlowView({ flow }: { flow: Flow }) {
  const nodeMap = buildNodeMap(flow.nodes);

  return (
    <div className="flow-diagram">
      <div className="diagram-scroll">
        <TriggerCard flow={flow} />
        {flow.nodes.length === 0 ? (
          <p className="diagram-empty">O fluxo está sendo montado...</p>
        ) : (
          <>
            <Arrow />
            <FlowPath nodeId={flow.start_node_id} nodeMap={nodeMap} />
          </>
        )}
      </div>
    </div>
  );
}
