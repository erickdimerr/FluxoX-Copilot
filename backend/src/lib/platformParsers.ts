export interface NormalizedPayload {
  platform: string;
  customer_name: string | null;
  customer_phone: string | null; // E.164 sem +: 5511999999999
  customer_email: string | null;
  order_id: string | null;
  order_total: number | null; // em BRL
  product_name: string | null;
  tracking_code: string | null;
  pix_code: string | null;
  boleto_url: string | null;
  raw: Record<string, unknown>;
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length === 12 || digits.length === 13) return digits;
  return digits.length > 0 ? digits : null;
}

function str(v: unknown): string | null {
  return v != null && v !== "" ? String(v) : null;
}

function num(v: unknown): number | null {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? null : n;
}

function dig(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

// ---------------------------------------------------------------------------
// Shopify
// Eventos: checkout/create (carrinho), orders/paid, orders/fulfilled
// ---------------------------------------------------------------------------
function shopifyParser(body: Record<string, unknown>): NormalizedPayload {
  const customer = dig(body, "customer") as Record<string, unknown> | null ?? {};
  const billing = dig(body, "billing_address") as Record<string, unknown> | null ?? {};
  const shipping = dig(body, "shipping_address") as Record<string, unknown> | null ?? {};
  const lineItems = (body["line_items"] as unknown[]) ?? [];
  const firstItem = (lineItems[0] ?? {}) as Record<string, unknown>;
  const fulfillments = (body["fulfillments"] as unknown[]) ?? [];
  const firstFulfillment = (fulfillments[0] ?? {}) as Record<string, unknown>;

  const firstName = str(customer["first_name"]) ?? "";
  const lastName = str(customer["last_name"]) ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") ||
    str(billing["name"]) || str(shipping["name"]);

  const phone = str(customer["phone"]) || str(billing["phone"]) || str(shipping["phone"]);

  return {
    platform: "shopify",
    customer_name: fullName || null,
    customer_phone: normalizePhone(phone),
    customer_email: str(body["email"]) || str(customer["email"]),
    order_id: str(body["name"]) || str(body["id"]),
    order_total: num(body["total_price"]),
    product_name: str(firstItem["title"]),
    tracking_code: str(firstFulfillment["tracking_number"]),
    pix_code: null,
    boleto_url: null,
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Hotmart
// Eventos: PURCHASE_APPROVED, ABANDONED_CART, PURCHASE_SHIPPED, etc.
// ---------------------------------------------------------------------------
function hotmartParser(body: Record<string, unknown>): NormalizedPayload {
  const data = (body["data"] ?? {}) as Record<string, unknown>;
  const buyer = (dig(data, "buyer") ?? {}) as Record<string, unknown>;
  const purchase = (dig(data, "purchase") ?? {}) as Record<string, unknown>;
  const product = (dig(data, "product") ?? {}) as Record<string, unknown>;
  const price = (dig(purchase, "price") ?? {}) as Record<string, unknown>;
  const shippingDetails = (dig(purchase, "shipping_details") ?? {}) as Record<string, unknown>;

  return {
    platform: "hotmart",
    customer_name: str(buyer["name"]),
    customer_phone: normalizePhone(str(buyer["phone"])),
    customer_email: str(buyer["email"]),
    order_id: str(purchase["order_key"]) || str(purchase["transaction"]),
    order_total: num(price["value"]),
    product_name: str(product["name"]),
    tracking_code: str(shippingDetails["tracking_code"]),
    pix_code: null,
    boleto_url: null,
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Kiwify
// Eventos: order.paid, order.abandoned, order.shipped
// Valor vem em centavos (inteiro) ou reais (float) — detectamos pelo tamanho
// ---------------------------------------------------------------------------
function kiwifyParser(body: Record<string, unknown>): NormalizedPayload {
  const customer = (dig(body, "Customer") ?? {}) as Record<string, unknown>;
  const payment = (dig(body, "payment") ?? {}) as Record<string, unknown>;
  const shippingInfo = (dig(body, "Shipping") ?? {}) as Record<string, unknown>;

  const saleRaw = body["sale_amount"];
  let orderTotal: number | null = null;
  if (typeof saleRaw === "number") {
    // Kiwify envia em centavos quando é número inteiro grande (> 1000)
    orderTotal = saleRaw > 1000 ? saleRaw / 100 : saleRaw;
  } else {
    orderTotal = num(saleRaw);
  }

  return {
    platform: "kiwify",
    customer_name: str(customer["full_name"]),
    customer_phone: normalizePhone(str(customer["mobile"])),
    customer_email: str(customer["email"]),
    order_id: str(body["order_id"]) || str(body["sale_id"]),
    order_total: orderTotal,
    product_name: str(dig(body, "Product", "name")),
    tracking_code: str(shippingInfo["tracking_code"]),
    pix_code: str(payment["pix_code"]),
    boleto_url: str(payment["boleto_url"]),
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Yampi
// Eventos: order.paid, order.abandoned, order.shipped
// Telefone vem separado em ddd + number
// ---------------------------------------------------------------------------
function yampiParser(body: Record<string, unknown>): NormalizedPayload {
  const resource = (body["resource"] ?? {}) as Record<string, unknown>;
  const customerData = (dig(resource, "customer", "data") ?? {}) as Record<string, unknown>;
  const phones = (customerData["phones"] as unknown[]) ?? [];
  const firstPhone = (phones[0] ?? {}) as Record<string, unknown>;
  const items = (dig(resource, "items", "data") as unknown[]) ?? [];
  const firstItem = (items[0] ?? {}) as Record<string, unknown>;

  const firstName = str(customerData["first_name"]) ?? "";
  const lastName = str(customerData["last_name"]) ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const ddd = str(firstPhone["ddd"]) ?? "";
  const phoneNum = str(firstPhone["number"]) ?? "";
  const rawPhone = ddd + phoneNum || null;

  return {
    platform: "yampi",
    customer_name: fullName || null,
    customer_phone: normalizePhone(rawPhone),
    customer_email: str(customerData["email"]),
    order_id: str(resource["number"]) || str(resource["id"]),
    order_total: num(resource["value"]),
    product_name: str(dig(firstItem, "product", "name")),
    tracking_code: str(resource["tracking_code"]),
    pix_code: null,
    boleto_url: null,
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Eduzz
// Eventos: body["key"] → SALE_APPROVED, ABANDONED_CART, SALE_SHIPPED
// ---------------------------------------------------------------------------
function eduzzParser(body: Record<string, unknown>): NormalizedPayload {
  const data = (body["data"] ?? {}) as Record<string, unknown>;
  return {
    platform: "eduzz",
    customer_name: str(data["client_name"]),
    customer_phone: normalizePhone(str(data["client_cellphone"]) || str(data["client_phone"])),
    customer_email: str(data["client_email"]),
    order_id: str(data["invoice_key"]) || str(data["invoice_number"]),
    order_total: num(data["total"]),
    product_name: str(data["product_name"]),
    tracking_code: str(data["tracking_code"]),
    pix_code: null,
    boleto_url: null,
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Monetizze
// Eventos: body["tipoPostback"] → venda_aprovada, abandono_de_carrinho, etc.
// ---------------------------------------------------------------------------
function monetizzeParser(body: Record<string, unknown>): NormalizedPayload {
  const comprador = (body["comprador"] ?? {}) as Record<string, unknown>;
  const produto = (body["produto"] ?? {}) as Record<string, unknown>;
  const venda = (body["venda"] ?? {}) as Record<string, unknown>;
  return {
    platform: "monetizze",
    customer_name: str(comprador["nome"]),
    customer_phone: normalizePhone(str(comprador["telefone"])),
    customer_email: str(comprador["email"]),
    order_id: str(venda["codigo"]),
    order_total: num(produto["valor"]),
    product_name: str(produto["nome"]),
    tracking_code: str(venda["tracking_code"]),
    pix_code: null,
    boleto_url: str(venda["boleto_url"]),
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Braip
// Eventos: body["event"] → sale_approved, abandoned_cart, sale_shipped
// Valor vem em centavos
// ---------------------------------------------------------------------------
function braipParser(body: Record<string, unknown>): NormalizedPayload {
  const customer = (body["customer"] ?? {}) as Record<string, unknown>;
  const product = (body["product"] ?? {}) as Record<string, unknown>;
  const sale = (body["sale"] ?? {}) as Record<string, unknown>;
  const amountRaw = sale["amount"];
  const orderTotal = typeof amountRaw === "number" && amountRaw > 1000
    ? amountRaw / 100
    : num(amountRaw);
  return {
    platform: "braip",
    customer_name: str(customer["name"]),
    customer_phone: normalizePhone(str(customer["phone"])),
    customer_email: str(customer["email"]),
    order_id: str(sale["code"]) || str(body["order_id"]),
    order_total: orderTotal,
    product_name: str(product["name"]),
    tracking_code: str(body["tracking_code"]),
    pix_code: null,
    boleto_url: null,
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// CartPanda
// Eventos: body["event"] → order/paid, checkout/abandoned, order/shipped
// ---------------------------------------------------------------------------
function cartpandaParser(body: Record<string, unknown>): NormalizedPayload {
  const order = (body["order"] ?? body) as Record<string, unknown>;
  const customer = (dig(order, "customer") ?? dig(order, "billing") ?? {}) as Record<string, unknown>;
  const lineItems = (order["line_items"] as unknown[]) ?? [];
  const firstItem = (lineItems[0] ?? {}) as Record<string, unknown>;
  const firstName = str(customer["first_name"]) ?? "";
  const lastName = str(customer["last_name"]) ?? "";
  const fullName = str(customer["name"]) || [firstName, lastName].filter(Boolean).join(" ");
  return {
    platform: "cartpanda",
    customer_name: fullName || null,
    customer_phone: normalizePhone(str(customer["phone"])),
    customer_email: str(customer["email"]) || str(order["email"]),
    order_id: str(order["id"]) || str(order["number"]),
    order_total: num(order["total"]),
    product_name: str(firstItem["title"]) || str(firstItem["name"]),
    tracking_code: null,
    pix_code: null,
    boleto_url: null,
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Appmax
// Eventos: body["event"] → order.approved, order.abandoned, order.delivered
// ---------------------------------------------------------------------------
function appmaxParser(body: Record<string, unknown>): NormalizedPayload {
  const data = (body["data"] ?? body) as Record<string, unknown>;
  const customer = (dig(data, "customer") ?? {}) as Record<string, unknown>;
  const products = (data["products"] as unknown[]) ?? [];
  const firstProduct = (products[0] ?? {}) as Record<string, unknown>;
  const firstName = str(customer["firstname"]) ?? str(customer["first_name"]) ?? "";
  const lastName = str(customer["lastname"]) ?? str(customer["last_name"]) ?? "";
  const fullName = str(customer["name"]) || [firstName, lastName].filter(Boolean).join(" ");
  return {
    platform: "appmax",
    customer_name: fullName || null,
    customer_phone: normalizePhone(str(customer["cellphone"]) || str(customer["phone"])),
    customer_email: str(customer["email"]),
    order_id: str(data["id"]) || str(data["order_id"]),
    order_total: num(data["total"]) || num(data["amount"]),
    product_name: str(firstProduct["name"]) || str(firstProduct["title"]),
    tracking_code: null,
    pix_code: str(dig(data, "payment", "pix_code")),
    boleto_url: str(dig(data, "payment", "boleto_url")),
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// PerfectPay
// Eventos: body["sale_status_enum"] → PAID, ABANDONED, SHIPPED
// Payload é flat — todos os campos no nível raiz
// ---------------------------------------------------------------------------
function perfectpayParser(body: Record<string, unknown>): NormalizedPayload {
  return {
    platform: "perfectpay",
    customer_name: str(body["customer_name"]),
    customer_phone: normalizePhone(str(body["customer_phone"]) || str(body["customer_cellphone"])),
    customer_email: str(body["customer_email"]),
    order_id: str(body["order_code"]) || str(body["sale_code"]),
    order_total: num(body["sale_amount"]) || num(body["order_total"]),
    product_name: str(body["product_name"]),
    tracking_code: str(body["tracking_code"]),
    pix_code: str(body["pix_code"]),
    boleto_url: str(body["boleto_url"]),
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Nuvem Shop (Tiendanube)
// Webhooks são minimalistas: só enviam store_id, event e id do recurso.
// Dados do cliente precisam ser buscados via API REST da plataforma (Phase 2).
// ---------------------------------------------------------------------------
function nuvemshopParser(body: Record<string, unknown>): NormalizedPayload {
  return {
    platform: "nuvemshop",
    customer_name: null,
    customer_phone: null,
    customer_email: null,
    order_id: str(body["id"]),
    order_total: null,
    product_name: null,
    tracking_code: null,
    pix_code: null,
    boleto_url: null,
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
const PARSERS: Record<string, (body: Record<string, unknown>) => NormalizedPayload> = {
  shopify: shopifyParser,
  hotmart: hotmartParser,
  kiwify: kiwifyParser,
  eduzz: eduzzParser,
  monetizze: monetizzeParser,
  braip: braipParser,
  perfectpay: perfectpayParser,
  yampi: yampiParser,
  cartpanda: cartpandaParser,
  appmax: appmaxParser,
  nuvemshop: nuvemshopParser,
};

export const SUPPORTED_PLATFORMS = Object.keys(PARSERS);

export function parseWebhookPayload(
  platform: string,
  body: Record<string, unknown>
): NormalizedPayload | null {
  const parser = PARSERS[platform];
  if (!parser) return null;
  return parser(body);
}
