import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChatPanel } from "../components/ChatPanel";
import { FlowView } from "../components/FlowView";
import { AIChatResponse, AIInputType, AIOption, ChatBubble, Flow, FlowEvaluation } from "../types";

const API_URL = "http://localhost:3001";

interface LocationState {
  flow: Flow;
  firstMessage: {
    message: string;
    input_type: AIInputType;
    options?: AIOption[];
  };
  webhookUrl?: string;
}

export function ChatPage() {
  const { typeId, sessionId } = useParams<{ typeId: string; sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [flow, setFlow] = useState<Flow | null>(state?.flow ?? null);
  const [messages, setMessages] = useState<ChatBubble[]>(
    state?.firstMessage ? [{ role: "assistant", text: state.firstMessage.message }] : []
  );
  const [inputType, setInputType] = useState<AIInputType>(
    state?.firstMessage?.input_type ?? "text"
  );
  const [options, setOptions] = useState<AIOption[] | undefined>(state?.firstMessage?.options);
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [flowComplete, setFlowComplete] = useState(false);
  const [evaluation, setEvaluation] = useState<FlowEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  const webhookUrl = state?.webhookUrl;

  if (!state) {
    return (
      <div className="chat-error">
        <p>Sessão não encontrada.</p>
        <button onClick={() => navigate("/")}>Voltar ao início</button>
      </div>
    );
  }

  async function sendMessage(value: string, displayLabel?: string) {
    if (!sessionId) return;

    setMessages((prev) => [...prev, { role: "user", text: displayLabel ?? value }]);
    setTextInput("");
    setLoading(true);
    setOptions(undefined);

    const res = await fetch(`${API_URL}/api/flows/${sessionId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: value }),
    });

    const data: AIChatResponse = await res.json();

    setMessages((prev) => {
      const next: ChatBubble[] = [...prev, { role: "assistant", text: data.message }];
      if (data.tip) {
        next.push({ role: "assistant", text: data.tip, isTip: true });
      }
      return next;
    });
    setFlow(data.flow);
    setInputType(data.input_type);
    setOptions(data.options);
    setLoading(false);

    if (data.flow_complete && !flowComplete) {
      setFlowComplete(true);
      setEvaluating(true);
      try {
        const evalRes = await fetch(`${API_URL}/api/flows/${sessionId}/evaluate`, {
          method: "POST",
        });
        const evalData: FlowEvaluation = await evalRes.json();
        setEvaluation(evalData);
      } finally {
        setEvaluating(false);
      }
    }
  }

  async function handleActivate() {
    if (!flow) return;
    setActivating(true);
    await fetch(`${API_URL}/api/flows/${flow.flow_id}/activate`, { method: "PATCH" });
    setActivating(false);
    navigate(`/automacao/${typeId}`);
  }

  async function copyWebhookUrl() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  }

  return (
    <div className="app">
      <div className="left-panel">
        <div className="chat-page-header">
          <button className="back-btn" onClick={() => navigate(`/automacao/${typeId}`)}>
            ← Voltar
          </button>
          <h2>Construtor de Automação</h2>
          {webhookUrl && (
            <button className="webhook-pill-btn" onClick={() => setShowWebhookModal(true)}>
              🔗 Ver webhook
            </button>
          )}
        </div>

        <ChatPanel
          messages={messages}
          options={flowComplete ? undefined : options}
          inputType={flowComplete ? "text" : inputType}
          textInput={textInput}
          onTextInputChange={setTextInput}
          onSend={(value, label) => sendMessage(value, label ?? value)}
          loading={loading}
          disabled={flowComplete}
        />

        {flowComplete && (
          <div className="eval-panel">
            {evaluating && (
              <div className="eval-loading">
                <span className="eval-spinner" />
                Avaliando seu fluxo com IA...
              </div>
            )}
            {evaluation && (
              <>
                <div className="eval-header">
                  <span className="eval-title">Avaliação do Fluxo</span>
                  <span
                    className={`eval-score-badge ${
                      evaluation.score >= 75
                        ? "score-high"
                        : evaluation.score >= 50
                        ? "score-mid"
                        : "score-low"
                    }`}
                  >
                    {evaluation.score}%
                  </span>
                </div>
                <div className="eval-bar-track">
                  <div
                    className="eval-bar-fill"
                    style={{ width: `${evaluation.score}%` }}
                  />
                </div>
                {evaluation.strengths.length > 0 && (
                  <div className="eval-section">
                    <div className="eval-section-title">✅ Pontos fortes</div>
                    {evaluation.strengths.map((s, i) => (
                      <div key={i} className="eval-item">
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                {evaluation.improvements.length > 0 && (
                  <div className="eval-section">
                    <div className="eval-section-title">💡 O que melhorar</div>
                    {evaluation.improvements.map((s, i) => (
                      <div key={i} className="eval-item">
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="activate-eval-btn"
                  onClick={handleActivate}
                  disabled={activating}
                >
                  {activating ? "Ativando..." : "⚡ Ativar este fluxo"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="right-panel">
        {flow ? <FlowView flow={flow} /> : <p>Carregando fluxo...</p>}
      </div>

      {showWebhookModal && webhookUrl && (
        <div className="modal-backdrop" onClick={() => setShowWebhookModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>URL do Webhook</h3>
              <button className="modal-close" onClick={() => setShowWebhookModal(false)}>
                ✕
              </button>
            </div>
            <p className="modal-desc">
              Use esta URL na sua plataforma de vendas para enviar eventos ao FluxoX.
            </p>
            <div className="webhook-url-row">
              <code className="webhook-url-text">{webhookUrl}</code>
              <button className="copy-btn" onClick={copyWebhookUrl}>
                {webhookCopied ? "✓ Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
