import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Flow } from "../types";

const API_URL = "http://localhost:3001";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
};

export function FlowList() {
  const { typeId } = useParams<{ typeId: string }>();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [creating, setCreating] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  async function loadFlows() {
    const res = await fetch(`${API_URL}/api/automation-types/${typeId}/flows`);
    const data = await res.json();
    setFlows(data.flows ?? []);
  }

  useEffect(() => {
    loadFlows();
  }, [typeId]);

  async function handleCreate() {
    setCreating(true);
    const res = await fetch(`${API_URL}/api/automation-types/${typeId}/flows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    navigate(`/automacao/${typeId}/webhook/${data.session_id}`, {
      state: {
        flow: data.flow,
        webhookUrl: data.webhook_url,
        webhookInstructions: data.webhook_instructions,
        firstMessage: data.first_message,
      },
    });
  }

  async function handleActivate(flowId: string) {
    setActivatingId(flowId);
    await fetch(`${API_URL}/api/flows/${flowId}/activate`, { method: "PATCH" });
    await loadFlows();
    setActivatingId(null);
  }

  return (
    <div className="flow-list-page">
      <div className="flow-list-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          ← Voltar
        </button>
        <h1>Fluxos</h1>
        <button className="create-btn" onClick={handleCreate} disabled={creating}>
          {creating ? "Criando..." : "+ Criar novo"}
        </button>
      </div>

      {flows.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum fluxo criado ainda.</p>
          <p>Clique em "Criar novo" para começar.</p>
        </div>
      ) : (
        <div className="flow-cards">
          {flows.map((flow) => (
            <div
              key={flow.flow_id}
              className={`flow-card ${flow.status === "active" ? "flow-card-active" : ""}`}
            >
              <div className="flow-card-top">
                <div className="flow-card-name">{flow.name}</div>
                {flow.status === "active" && (
                  <span className="active-indicator">● Ativo</span>
                )}
              </div>
              <div className="flow-card-meta">
                <span className={`flow-badge status-${flow.status}`}>
                  {STATUS_LABEL[flow.status] ?? flow.status}
                </span>
                <span className="flow-card-nodes">{flow.nodes.length} nó(s)</span>
              </div>
              <div className="flow-card-date">
                Criado em {new Date(flow.created_at).toLocaleDateString("pt-BR")}
              </div>
              {flow.status !== "active" && (
                <button
                  className="activate-flow-btn"
                  disabled={activatingId === flow.flow_id}
                  onClick={() => handleActivate(flow.flow_id)}
                >
                  {activatingId === flow.flow_id ? "Ativando..." : "⚡ Ativar este fluxo"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
