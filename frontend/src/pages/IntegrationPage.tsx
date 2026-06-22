import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3001";

interface Platform {
  name: string;
  slug: string;
  steps: string[];
  note?: string;
  comingSoon?: boolean;
}

const PLATFORMS: Platform[] = [
  {
    name: "Shopify",
    slug: "shopify",
    steps: [
      "Acesse o painel do Shopify e vá em Configurações → Notificações.",
      "Role até a seção \"Webhooks\" e clique em \"Criar webhook\".",
      "Selecione o evento desejado (ex: Checkout abandonado, Pedido pago).",
      "Cole a URL específica do Shopify no campo URL e selecione o formato JSON.",
      "Repita para cada evento que quiser automatizar.",
      "Clique em \"Salvar webhook\" e teste o envio.",
    ],
  },
  {
    name: "Hotmart",
    slug: "hotmart",
    steps: [
      "Acesse o produto na Hotmart e vá em Ferramentas → Webhooks.",
      "Clique em \"Adicionar\" e cole a URL específica da Hotmart.",
      "Selecione os eventos desejados (Compra aprovada, Compra abandonada, Envio).",
      "Salve e ative o webhook.",
    ],
  },
  {
    name: "Kiwify",
    slug: "kiwify",
    steps: [
      "Na Kiwify, vá em Integrações → Webhooks e clique em \"Novo Webhook\".",
      "Cole a URL específica da Kiwify no campo indicado.",
      "Selecione os eventos que deseja receber.",
      "Salve e ative a integração.",
    ],
  },
  {
    name: "Eduzz",
    slug: "eduzz",
    steps: [
      "Acesse o produto na Eduzz e vá em Ferramentas → Postback.",
      "Clique em \"Adicionar Postback\" e cole a URL específica da Eduzz.",
      "Selecione os eventos desejados (Venda Aprovada, Carrinho Abandonado, Envio Rastreado).",
      "Salve e ative.",
    ],
  },
  {
    name: "Monetizze",
    slug: "monetizze",
    steps: [
      "Na Monetizze, acesse o produto e vá em Configurações → Postback (IPN).",
      "Cole a URL específica da Monetizze no campo de postback.",
      "Salve. A Monetizze enviará notificações para todos os eventos automaticamente.",
    ],
  },
  {
    name: "Braip",
    slug: "braip",
    steps: [
      "Na Braip, acesse Configurações → Webhook.",
      "Cole a URL específica da Braip.",
      "Selecione os eventos desejados e salve.",
    ],
  },
  {
    name: "PerfectPay",
    slug: "perfectpay",
    steps: [
      "Na PerfectPay, acesse o produto e vá em Ferramentas → Postback.",
      "Cole a URL específica da PerfectPay no campo indicado.",
      "Selecione os eventos (Venda Aprovada, Carrinho Abandonado, Rastreio).",
      "Salve e ative.",
    ],
  },
  {
    name: "Yampi",
    slug: "yampi",
    steps: [
      "Na Yampi, acesse Configurações → API & Webhooks.",
      "Na seção Webhooks, clique em \"Adicionar endpoint\".",
      "Cole a URL específica da Yampi.",
      "Selecione os eventos desejados e salve.",
    ],
  },
  {
    name: "CartPanda",
    slug: "cartpanda",
    steps: [
      "Na CartPanda, vá em Configurações → Integrações → Webhooks.",
      "Clique em \"Adicionar Webhook\" e cole a URL específica da CartPanda.",
      "Selecione os eventos desejados (Pedido Pago, Carrinho Abandonado, Envio).",
      "Salve e ative.",
    ],
  },
  {
    name: "Appmax",
    slug: "appmax",
    steps: [
      "Na Appmax, acesse Configurações → Webhooks.",
      "Clique em \"Adicionar Endpoint\" e cole a URL específica da Appmax.",
      "Selecione os eventos desejados e salve.",
    ],
  },
  {
    name: "Nuvem Shop",
    slug: "nuvemshop",
    steps: [],
    comingSoon: true,
  },
];

const AUTOMATION_EVENTS = [
  { id: "carrinho-abandonado", name: "Carrinho Abandonado", icon: "🛒", events: ["cart_abandoned", "checkout/create", "order.abandoned", "ABANDONED_CART"] },
  { id: "pedido-pago", name: "Pedido Pago", icon: "💳", events: ["order_paid", "order.paid", "purchase.approved", "PURCHASE_APPROVED"] },
  { id: "rastreio-enviado", name: "Rastreio Enviado", icon: "📦", events: ["order_shipped", "orders/fulfilled", "order.shipped", "PURCHASE_SHIPPED"] },
  { id: "recuperacao-pix", name: "Recuperação de Pix", icon: "⚡", events: ["pix_expired", "pix.expired", "order.pix_expired"] },
  { id: "recuperacao-boleto", name: "Recuperação de Boleto", icon: "📄", events: ["boleto_unpaid", "boleto.expired", "order.boleto_expired"] },
];

export function IntegrationPage() {
  const navigate = useNavigate();
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("shopify");

  useEffect(() => {
    fetch(`${API_URL}/api/integration`)
      .then((r) => r.json())
      .then((data) => setWebhookUrls(data.webhook_urls ?? {}));
  }, []);

  const activePlatform = PLATFORMS.find((p) => p.slug === activeTab) ?? PLATFORMS[0];
  const activeUrl = webhookUrls[activeTab] ?? "";

  async function copyUrl() {
    if (!activeUrl) return;
    await navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="integration-page">
      <div className="integration-header">
        <button className="back-btn" onClick={() => navigate("/")}>← Voltar</button>
        <div>
          <h1>Integração com E-commerce</h1>
          <p className="integration-subtitle">Configure uma única URL no seu e-commerce para receber todos os eventos automaticamente.</p>
        </div>
      </div>

      <div className="integration-body">
        {/* Webhook URL por plataforma */}
        <section className="integration-section">
          <h2 className="integration-section-title">🔗 URL de Webhook por Plataforma</h2>
          <p className="integration-section-desc">
            Cada plataforma tem sua própria URL — assim o FluxoX sabe exatamente como extrair os dados do cliente de cada payload. Selecione a aba da sua plataforma e copie a URL correspondente.
          </p>
          <div className="platform-tabs">
            {PLATFORMS.map((p) => (
              <button
                key={p.slug}
                className={`platform-tab ${activeTab === p.slug ? "active" : ""} ${p.comingSoon ? "coming-soon" : ""}`}
                onClick={() => { setActiveTab(p.slug); setCopied(false); }}
              >
                {p.name}
                {p.comingSoon && <span className="coming-soon-badge">em breve</span>}
              </button>
            ))}
          </div>
          {activePlatform.comingSoon ? (
            <div className="coming-soon-box">
              <span className="coming-soon-icon">🚧</span>
              <p>Integração com <strong>Nuvem Shop</strong> em breve.</p>
              <p>Os webhooks da Nuvem Shop não incluem dados do cliente no payload — a integração requer uma chamada adicional à API deles para buscar nome e telefone. Estamos trabalhando nisso.</p>
            </div>
          ) : (
            <div className="webhook-url-box">
              <code className="webhook-url-code">{activeUrl || "Carregando..."}</code>
              <button className="copy-btn" onClick={copyUrl} disabled={!activeUrl}>
                {copied ? "✓ Copiado!" : "Copiar"}
              </button>
            </div>
          )}
          {activePlatform.note && (
            <p className="platform-note">ℹ️ {activePlatform.note}</p>
          )}
        </section>

        {/* Event mapping */}
        <section className="integration-section">
          <h2 className="integration-section-title">📡 Como funciona o roteamento</h2>
          <p className="integration-section-desc">
            O FluxoX detecta automaticamente o tipo de evento pelo campo <code>event</code>, <code>event_type</code> ou <code>type</code> do payload e executa o fluxo ativo correspondente.
          </p>
          <div className="event-map-grid">
            {AUTOMATION_EVENTS.map((a) => (
              <div key={a.id} className="event-map-card">
                <div className="event-map-header">
                  <span className="event-map-icon">{a.icon}</span>
                  <span className="event-map-name">{a.name}</span>
                </div>
                <div className="event-map-tags">
                  {a.events.map((e) => (
                    <code key={e} className="event-tag">{e}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Platform instructions */}
        {!activePlatform.comingSoon && (
          <section className="integration-section">
            <h2 className="integration-section-title">📋 Passo a passo — {activePlatform.name}</h2>
            <ol className="platform-steps">
              {activePlatform.steps.map((step, i) => (
                <li key={i} className="platform-step">{step}</li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
