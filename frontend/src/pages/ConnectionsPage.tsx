import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WhatsAppConnection } from "../types";

const API_URL = "http://localhost:3001";

const STATUS_LABEL: Record<WhatsAppConnection["status"], string> = {
  connected: "Conectado",
  disconnected: "Desconectado",
  pending: "Aguardando",
};

export function ConnectionsPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<"form" | "qr">("form");
  const [nameInput, setNameInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<WhatsAppConnection["status"] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  function loadConnections() {
    fetch(`${API_URL}/api/connections`)
      .then((r) => r.json())
      .then((data) => setConnections(data.connections ?? []));
  }

  function openModal() {
    setNameInput("");
    setQrCode(null);
    setPendingId(null);
    setPollingStatus(null);
    setModalStep("form");
    setShowModal(true);
  }

  function closeModal() {
    if (pollRef.current) clearInterval(pollRef.current);
    setShowModal(false);
    loadConnections();
  }

  async function handleCreate() {
    if (!nameInput.trim()) return;
    setCreating(true);
    const res = await fetch(`${API_URL}/api/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    setQrCode(data.qr_code ?? null);
    setPendingId(data.connection?.id ?? null);
    setPollingStatus("pending");
    setModalStep("qr");
    startPolling(data.connection?.id);
  }

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/connections/${id}/status`);
        const data = await res.json();
        setPollingStatus(data.status);
        if (data.status === "connected") {
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(closeModal, 1500);
        }
      } catch {
        // silencioso
      }
    }, 3000);
  }

  async function handleDelete(id: string) {
    await fetch(`${API_URL}/api/connections/${id}`, { method: "DELETE" });
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="connections-page">
      <div className="connections-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          ← Voltar
        </button>
        <h1>Conexões WhatsApp</h1>
        <button className="create-btn" onClick={openModal}>
          + Conectar número
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum número conectado ainda.</p>
          <p>Clique em "Conectar número" para adicionar.</p>
        </div>
      ) : (
        <div className="connection-cards">
          {connections.map((conn) => (
            <div key={conn.id} className="connection-card">
              <div className="connection-card-left">
                <span className="connection-icon">📱</span>
                <div>
                  <div className="connection-name">{conn.name}</div>
                  <div className="connection-date">
                    Adicionado em {new Date(conn.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
              <div className="connection-card-right">
                <span className={`conn-badge status-${conn.status}`}>
                  {STATUS_LABEL[conn.status]}
                </span>
                <button className="delete-btn" onClick={() => handleDelete(conn.id)}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalStep === "form" ? "Conectar novo número" : "Escaneie o QR Code"}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            {modalStep === "form" && (
              <div className="modal-form">
                <label className="modal-label">Nome da conexão</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="Ex: Loja Principal"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
                <button
                  className="create-btn"
                  style={{ marginTop: 16, width: "100%" }}
                  onClick={handleCreate}
                  disabled={creating || !nameInput.trim()}
                >
                  {creating ? "Gerando QR..." : "Gerar QR Code"}
                </button>
              </div>
            )}

            {modalStep === "qr" && (
              <div className="modal-qr">
                {qrCode ? (
                  <img
                    src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="qr-image"
                  />
                ) : (
                  <div className="qr-placeholder">
                    <p>QR code não disponível.</p>
                    <p className="qr-hint">
                      Certifique-se de que a Evolution API está configurada e tente novamente.
                    </p>
                  </div>
                )}

                <div className={`conn-badge status-${pollingStatus ?? "pending"} qr-status`}>
                  {pollingStatus === "connected"
                    ? "✓ Conectado!"
                    : pollingStatus === "disconnected"
                    ? "Desconectado"
                    : "Aguardando leitura..."}
                </div>

                {pollingStatus !== "connected" && (
                  <p className="qr-hint">
                    Abra o WhatsApp → Aparelhos conectados → Conectar aparelho
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
