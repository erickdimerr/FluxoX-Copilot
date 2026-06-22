export const EVENT_TYPE_MAP: Record<string, string> = {
  // ── Carrinho Abandonado ─────────────────────────────────────────────────
  cart_abandoned: "carrinho-abandonado",        // genérico
  "checkout/create": "carrinho-abandonado",     // Shopify
  "checkout.created": "carrinho-abandonado",    // Shopify
  abandoned_checkout: "carrinho-abandonado",    // Shopify
  "order.abandoned": "carrinho-abandonado",     // Kiwify / Appmax / Yampi
  ABANDONED_CART: "carrinho-abandonado",        // Hotmart / Eduzz
  abandoned_cart: "carrinho-abandonado",        // Braip
  "checkout/abandoned": "carrinho-abandonado",  // CartPanda
  abandono_de_carrinho: "carrinho-abandonado",  // Monetizze
  ABANDONED: "carrinho-abandonado",             // PerfectPay (sale_status_enum)

  // ── Pedido Pago ─────────────────────────────────────────────────────────
  order_paid: "pedido-pago",                    // genérico
  "orders/paid": "pedido-pago",                 // Shopify
  "order.paid": "pedido-pago",                  // Kiwify / Yampi
  "order/paid": "pedido-pago",                  // CartPanda
  "order.approved": "pedido-pago",              // Appmax / Yampi
  "purchase.approved": "pedido-pago",           // Kiwify / GreennPay
  PURCHASE_APPROVED: "pedido-pago",             // Hotmart
  PURCHASE_COMPLETE: "pedido-pago",             // Hotmart
  SALE_APPROVED: "pedido-pago",                 // Eduzz (body["key"])
  sale_approved: "pedido-pago",                 // Braip
  venda_aprovada: "pedido-pago",                // Monetizze (body["tipoPostback"])
  PAID: "pedido-pago",                          // PerfectPay (sale_status_enum)

  // ── Rastreio Enviado ────────────────────────────────────────────────────
  order_shipped: "rastreio-enviado",            // genérico
  "orders/fulfilled": "rastreio-enviado",       // Shopify
  "order.shipped": "rastreio-enviado",          // Kiwify / Yampi
  "order/shipped": "rastreio-enviado",          // CartPanda
  "order.delivered": "rastreio-enviado",        // Appmax
  PURCHASE_SHIPPED: "rastreio-enviado",         // Hotmart
  SALE_SHIPPED: "rastreio-enviado",             // Eduzz (body["key"])
  sale_shipped: "rastreio-enviado",             // Braip
  venda_enviada_para_entrega: "rastreio-enviado", // Monetizze
  SHIPPED: "rastreio-enviado",                  // PerfectPay

  // ── Recuperação PIX ─────────────────────────────────────────────────────
  pix_expired: "recuperacao-pix",
  "pix.expired": "recuperacao-pix",
  "order.pix_expired": "recuperacao-pix",
  "payment.pix_expired": "recuperacao-pix",
  PURCHASE_PIX_CHARGEBACK: "recuperacao-pix",
  pix_nao_pago: "recuperacao-pix",              // Monetizze
  PIX_EXPIRED: "recuperacao-pix",               // PerfectPay

  // ── Recuperação Boleto ──────────────────────────────────────────────────
  boleto_unpaid: "recuperacao-boleto",
  "boleto.expired": "recuperacao-boleto",
  "order.boleto_expired": "recuperacao-boleto",
  "payment.boleto_expired": "recuperacao-boleto",
  PURCHASE_BILLET_PRINTED: "recuperacao-boleto",
  boleto_nao_pago: "recuperacao-boleto",        // Monetizze
  BOLETO_EXPIRED: "recuperacao-boleto",         // PerfectPay
};

export function detectEventType(body: Record<string, unknown>): string | null {
  const candidates = [
    body["event"],
    body["event_type"],
    body["type"],
    body["action"],
    body["topic"],
    body["key"],              // Eduzz
    body["tipoPostback"],     // Monetizze
    body["sale_status_enum"], // PerfectPay
    (body["data"] as Record<string, unknown>)?.["event"],
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && EVENT_TYPE_MAP[candidate]) {
      return EVENT_TYPE_MAP[candidate];
    }
  }
  return null;
}
