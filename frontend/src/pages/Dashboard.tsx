import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AutomationType } from "../types";

const API_URL = "http://localhost:3001";

const TYPE_ICONS: Record<string, string> = {
  "carrinho-abandonado": "🛒",
  "pedido-pago": "💳",
  "rastreio-enviado": "📦",
  "recuperacao-pix": "⚡",
  "recuperacao-boleto": "📄",
};

export function Dashboard() {
  const [types, setTypes] = useState<AutomationType[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/automation-types`)
      .then((r) => r.json())
      .then(setTypes);
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title-row">
          <div>
            <h1>FluxoX</h1>
            <p>Escolha o tipo de automação que deseja criar</p>
          </div>
          <div className="dashboard-nav-btns">
            <button className="nav-connections-btn" onClick={() => navigate("/integracoes")}>
              🔗 Integração
            </button>
            <button className="nav-connections-btn" onClick={() => navigate("/connections")}>
              📱 Conexões
            </button>
          </div>
        </div>
      </header>
      <div className="type-grid">
        {types.map((type) => (
          <button
            key={type.id}
            className="type-card"
            onClick={() => navigate(`/automacao/${type.id}`)}
          >
            <span className="type-icon">{TYPE_ICONS[type.id] ?? "⚙️"}</span>
            <h2>{type.name}</h2>
            <p>{type.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
