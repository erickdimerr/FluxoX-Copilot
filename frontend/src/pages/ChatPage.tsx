import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChatPanel } from "../components/ChatPanel";
import { FlowView } from "../components/FlowView";
import { AIChatResponse, AIInputType, AIOption, ChatBubble, Flow } from "../types";

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

    setMessages((prev) => [...prev, { role: "assistant", text: data.message }]);
    setFlow(data.flow);
    setInputType(data.input_type);
    setOptions(data.options);
    setFlowComplete(data.flow_complete);
    setLoading(false);
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
          options={options}
          inputType={inputType}
          textInput={textInput}
          onTextInputChange={setTextInput}
          onSend={(value, label) => sendMessage(value, label ?? value)}
          loading={loading}
        />

        {flowComplete && (
          <div className="finish-banner">✅ Fluxo concluído! Pronto para publicar.</div>
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
