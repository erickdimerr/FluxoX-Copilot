import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AIInputType, AIOption, Flow, WebhookPlatformInstructions } from "../types";

interface LocationState {
  flow: Flow;
  webhookUrl: string;
  webhookInstructions: WebhookPlatformInstructions[];
  firstMessage: {
    message: string;
    input_type: AIInputType;
    options?: AIOption[];
  };
}

export function WebhookSetupPage() {
  const { typeId, sessionId } = useParams<{ typeId: string; sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  if (!state) {
    return (
      <div className="chat-error">
        <p>Sessão não encontrada.</p>
        <button onClick={() => navigate("/")}>Voltar ao início</button>
      </div>
    );
  }

  const { webhookUrl, webhookInstructions, flow, firstMessage } = state;

  async function copyUrl() {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function goToChat() {
    navigate(`/automacao/${typeId}/chat/${sessionId}`, {
      state: { flow, firstMessage, webhookUrl },
    });
  }

  return (
    <div className="webhook-page">
      <div className="webhook-container">
        <button className="back-btn" onClick={() => navigate(`/automacao/${typeId}`)}>
          ← Voltar
        </button>

        <h1 className="webhook-title">Configuração do Webhook</h1>
        <p className="webhook-subtitle">
          Antes de criar seu fluxo, registre esta URL na sua plataforma de vendas para que os
          eventos sejam enviados ao FluxoX.
        </p>

        <div className="webhook-url-box">
          <label className="webhook-url-label">URL do Webhook</label>
          <div className="webhook-url-row">
            <code className="webhook-url-text">{webhookUrl}</code>
            <button className="copy-btn" onClick={copyUrl}>
              {copied ? "✓ Copiado!" : "Copiar"}
            </button>
          </div>
        </div>

        {webhookInstructions.length > 0 && (
          <div className="webhook-instructions">
            <h2>Passo a passo por plataforma</h2>

            <div className="platform-tabs">
              {webhookInstructions.map((instr, i) => (
                <button
                  key={instr.platform}
                  className={`platform-tab ${activeTab === i ? "active" : ""}`}
                  onClick={() => setActiveTab(i)}
                >
                  {instr.platform}
                </button>
              ))}
            </div>

            <div className="platform-steps">
              <ol>
                {webhookInstructions[activeTab].steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        )}

        <div className="webhook-actions">
          <button className="create-btn" onClick={goToChat}>
            Já configurei, continuar para o chat →
          </button>
        </div>
      </div>
    </div>
  );
}
