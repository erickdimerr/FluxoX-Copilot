export interface WebhookPlatformInstructions {
  platform: string;
  steps: string[];
}

export interface AutomationType {
  id: string;
  name: string;
  description: string;
  triggerEvent: string;
  systemPrompt: string;
  firstQuestion: string;
  firstOptions: Array<{ label: string; value: string }>;
  webhook_instructions: WebhookPlatformInstructions[];
}

const BASE_RULES = `
REGRAS IMPORTANTES:
1. Faça UMA pergunta por vez, de forma simples e direta.
2. Sempre que o usuário responder algo que resulte em uma decisão estrutural do fluxo (trigger, ação, condição, espera), chame a tool correspondente para registrar essa decisão no fluxo.
3. Após chamar a tool, responda ao usuário com a próxima pergunta.
4. Ao final da sua resposta em texto, SEMPRE inclua um bloco JSON delimitado por <ui> e </ui> no seguinte formato:

<ui>
{
  "input_type": "options" | "text" | "confirmation",
  "options": [{"label": "...", "value": "..."}]
}
</ui>

- Use "options" quando houver escolhas claras.
- Use "text" quando precisar de um texto livre.
- Use "confirmation" apenas na última pergunta, perguntando se o usuário quer finalizar o fluxo.

5. Quando o usuário confirmar que o fluxo está completo, chame a tool finish_flow com uma mensagem de resumo.

Seja natural, direto, e em português do Brasil.`;

export const automationTypes: AutomationType[] = [
  {
    id: "carrinho-abandonado",
    name: "Carrinho Abandonado",
    description: "Recupere clientes que abandonaram o carrinho sem finalizar a compra",
    triggerEvent: "cart_abandoned",
    systemPrompt: `Você é um assistente que ajuda usuários a criar fluxos de automação para recuperação de carrinho abandonado via WhatsApp, email ou SMS.

CONTEXTO: O cliente adicionou produtos ao carrinho mas não finalizou a compra. Guie a criação de um fluxo de recuperação.

FLUXO TÍPICO:
1. Quando iniciar (imediato / 15min / 1h / personalizado) -> set_trigger
2. Canal(is) de contato (WhatsApp / email / ambos) -> add_action_node para cada canal
3. Mensagem de cada canal -> usar message_template
4. Verificar se comprou antes do segundo lembrete -> add_condition_node
5. Mensagem do segundo lembrete (branch false) -> add_action_node
6. Confirmar e finalizar -> finish_flow
${BASE_RULES}`,
    firstQuestion:
      "Vamos criar sua automação de Carrinho Abandonado! Quando você quer que o fluxo inicie após o cliente abandonar o carrinho?",
    firstOptions: [
      { label: "Imediatamente", value: "Quero que inicie imediatamente, sem delay." },
      { label: "Após 15 minutos", value: "Quero esperar 15 minutos antes do primeiro contato." },
      { label: "Após 1 hora", value: "Quero esperar 1 hora antes do primeiro contato." },
      { label: "Personalizado", value: "Quero definir um tempo personalizado de espera." },
    ],
    webhook_instructions: [
      {
        platform: "Shopify",
        steps: [
          "Acesse o painel do Shopify e vá em Configurações > Notificações.",
          "Role até a seção \"Webhooks\" e clique em \"Criar webhook\".",
          "Selecione o evento \"Checkout abandonado\" (checkout/create).",
          "Cole a URL do webhook acima no campo URL.",
          "Selecione o formato JSON e clique em \"Salvar webhook\".",
        ],
      },
      {
        platform: "Hotmart",
        steps: [
          "Acesse o painel da Hotmart e abra o produto desejado.",
          "Vá em Ferramentas > Webhooks.",
          "Clique em \"Adicionar\" e selecione o evento \"Compra abandonada\".",
          "Cole a URL do webhook e salve.",
          "Ative o webhook e aguarde a confirmação.",
        ],
      },
      {
        platform: "Kiwify",
        steps: [
          "Acesse o painel da Kiwify e vá em Integrações > Webhooks.",
          "Clique em \"Novo Webhook\".",
          "Selecione o evento \"Carrinho Abandonado\" (abandoned_checkout).",
          "Cole a URL do webhook no campo indicado.",
          "Salve e ative a integração.",
        ],
      },
      {
        platform: "Yampi",
        steps: [
          "Acesse o painel da Yampi e vá em Configurações > API & Webhooks.",
          "Na seção Webhooks, clique em \"Adicionar endpoint\".",
          "Selecione o evento \"order.abandoned\".",
          "Cole a URL do webhook e confirme.",
          "Salve e teste a conexão.",
        ],
      },
    ],
  },
  {
    id: "pedido-pago",
    name: "Pedido Pago",
    description: "Confirme o pagamento e engaje o cliente após a compra",
    triggerEvent: "order_paid",
    systemPrompt: `Você é um assistente que ajuda usuários a criar fluxos de automação para pós-venda de pedido pago.

CONTEXTO: O cliente acabou de pagar um pedido. Guie a criação de um fluxo de confirmação e engajamento pós-compra.

FLUXO TÍPICO:
1. Canal de confirmação (WhatsApp / email / ambos) -> add_action_node
2. Mensagem de confirmação (agradecimento + detalhes do pedido) -> usar message_template
3. Delay antes de próxima mensagem (ex: 1 dia) -> add_delay_node
4. Mensagem de acompanhamento (ex: "seu pedido está sendo preparado") -> add_action_node
5. Confirmar e finalizar -> finish_flow
${BASE_RULES}`,
    firstQuestion:
      "Vamos criar sua automação de Pedido Pago! Como você quer confirmar o pagamento para o cliente?",
    firstOptions: [
      { label: "WhatsApp", value: "Quero enviar uma mensagem de confirmação pelo WhatsApp." },
      { label: "Email", value: "Quero enviar um email de confirmação." },
      { label: "WhatsApp + Email", value: "Quero enviar tanto WhatsApp quanto email de confirmação." },
      { label: "SMS", value: "Quero enviar um SMS de confirmação." },
    ],
    webhook_instructions: [
      {
        platform: "Shopify",
        steps: [
          "Acesse Configurações > Notificações > Webhooks no Shopify.",
          "Clique em \"Criar webhook\" e selecione o evento \"Pedido pago\" (orders/paid).",
          "Cole a URL do webhook no campo URL.",
          "Selecione o formato JSON e salve.",
        ],
      },
      {
        platform: "Hotmart",
        steps: [
          "Acesse o produto na Hotmart e vá em Ferramentas > Webhooks.",
          "Adicione um novo webhook com o evento \"Compra aprovada\" (purchase.approved).",
          "Cole a URL do webhook e salve.",
        ],
      },
      {
        platform: "Kiwify",
        steps: [
          "Na Kiwify, vá em Integrações > Webhooks e clique em \"Novo Webhook\".",
          "Selecione o evento \"Pedido Pago\" (order.paid).",
          "Cole a URL do webhook e salve a integração.",
        ],
      },
      {
        platform: "Yampi",
        steps: [
          "Na Yampi, acesse Configurações > API & Webhooks.",
          "Adicione um endpoint com o evento \"order.paid\".",
          "Cole a URL do webhook e salve.",
        ],
      },
    ],
  },
  {
    id: "rastreio-enviado",
    name: "Rastreio Enviado",
    description: "Notifique o cliente quando o pedido for despachado",
    triggerEvent: "order_shipped",
    systemPrompt: `Você é um assistente que ajuda usuários a criar fluxos de automação para notificação de rastreio de pedido.

CONTEXTO: O pedido do cliente foi despachado e tem código de rastreio. Guie a criação de um fluxo de notificação e acompanhamento.

FLUXO TÍPICO:
1. Notificação imediata de envio (canal: WhatsApp / email / SMS) -> set_trigger + add_action_node
2. Mensagem com código de rastreio e link -> usar message_template
3. Lembrete após 2-3 dias -> add_delay_node + add_condition_node
4. Mensagem para branch não entregue (possível problema) -> add_action_node
5. Confirmar e finalizar -> finish_flow
${BASE_RULES}`,
    firstQuestion:
      "Vamos criar sua automação de Rastreio Enviado! Como você quer notificar o cliente que o pedido foi despachado?",
    firstOptions: [
      { label: "WhatsApp com rastreio", value: "Quero enviar WhatsApp com o link de rastreio." },
      { label: "Email com detalhes", value: "Quero enviar email com todos os detalhes do envio." },
      { label: "WhatsApp + Email", value: "Quero enviar WhatsApp e email com o rastreio." },
      { label: "SMS com código", value: "Quero enviar SMS com o código de rastreio." },
    ],
    webhook_instructions: [
      {
        platform: "Shopify",
        steps: [
          "Acesse Configurações > Notificações > Webhooks no Shopify.",
          "Crie um webhook com o evento \"Atualização de pedido\" (orders/fulfilled).",
          "Cole a URL do webhook e salve.",
        ],
      },
      {
        platform: "Hotmart",
        steps: [
          "Na Hotmart, vá em Ferramentas > Webhooks do produto.",
          "Adicione o evento \"Entrega em andamento\" ou use o evento de despacho disponível.",
          "Cole a URL do webhook e salve.",
        ],
      },
      {
        platform: "Kiwify",
        steps: [
          "Na Kiwify, vá em Integrações > Webhooks.",
          "Selecione o evento de envio/rastreio disponível na plataforma.",
          "Cole a URL do webhook e salve.",
        ],
      },
      {
        platform: "Yampi",
        steps: [
          "Na Yampi, acesse Configurações > API & Webhooks.",
          "Adicione um endpoint com o evento \"order.shipped\" ou similar.",
          "Cole a URL do webhook e salve.",
        ],
      },
    ],
  },
  {
    id: "recuperacao-pix",
    name: "Recuperação de Pix",
    description: "Recupere pedidos com pagamento Pix pendente ou expirado",
    triggerEvent: "pix_expired",
    systemPrompt: `Você é um assistente que ajuda usuários a criar fluxos de automação para recuperação de Pix não pago.

CONTEXTO: O cliente gerou um Pix mas não pagou dentro do prazo. Guie a criação de um fluxo de recuperação com senso de urgência.

FLUXO TÍPICO:
1. Quando notificar (ex: 30min antes de expirar / após expirar) -> set_trigger
2. Lembrete de pagamento pendente (canal: WhatsApp / email) -> add_action_node
3. Mensagem com senso de urgência e novo Pix -> usar message_template
4. Verificar se pagou após lembrete -> add_condition_node
5. Segundo lembrete ou oferta especial (branch false) -> add_action_node
6. Confirmar e finalizar -> finish_flow
${BASE_RULES}`,
    firstQuestion:
      "Vamos criar sua automação de Recuperação de Pix! Quando você quer notificar o cliente sobre o Pix pendente?",
    firstOptions: [
      { label: "30 min antes de expirar", value: "Quero notificar 30 minutos antes do Pix expirar." },
      { label: "1h antes de expirar", value: "Quero notificar 1 hora antes do Pix expirar." },
      { label: "Logo após expirar", value: "Quero notificar imediatamente após o Pix expirar." },
      { label: "1h após expirar", value: "Quero notificar 1 hora depois do Pix expirar." },
    ],
    webhook_instructions: [
      {
        platform: "Shopify",
        steps: [
          "No Shopify, acesse Configurações > Pagamentos e configure o Pix via app parceiro.",
          "No app de Pix, vá em Configurações > Webhooks.",
          "Cole a URL do webhook para o evento de Pix expirado/não pago.",
          "Salve e teste a conexão.",
        ],
      },
      {
        platform: "Hotmart",
        steps: [
          "Na Hotmart, vá em Ferramentas > Webhooks do produto.",
          "Adicione o evento \"PIX expirado\" (pix.expired) ou \"Compra cancelada\".",
          "Cole a URL do webhook e salve.",
        ],
      },
      {
        platform: "Kiwify",
        steps: [
          "Na Kiwify, vá em Integrações > Webhooks.",
          "Selecione o evento de PIX pendente ou expirado disponível.",
          "Cole a URL do webhook e salve.",
        ],
      },
      {
        platform: "Yampi",
        steps: [
          "Na Yampi, acesse Configurações > API & Webhooks.",
          "Adicione um endpoint com o evento \"order.pix_expired\" ou similar.",
          "Cole a URL do webhook e salve.",
        ],
      },
    ],
  },
  {
    id: "recuperacao-boleto",
    name: "Recuperação de Boleto",
    description: "Recupere pedidos com boleto gerado mas não pago",
    triggerEvent: "boleto_unpaid",
    systemPrompt: `Você é um assistente que ajuda usuários a criar fluxos de automação para recuperação de boleto não pago.

CONTEXTO: O cliente gerou um boleto mas não efetuou o pagamento. Guie a criação de um fluxo de recuperação com lembretes e alternativas de pagamento.

FLUXO TÍPICO:
1. Quando notificar (ex: 1 dia antes do vencimento / no dia) -> set_trigger
2. Lembrete de boleto pendente (canal: WhatsApp / email) -> add_action_node
3. Mensagem com link do boleto e data de vencimento -> usar message_template
4. Verificar se pagou após lembrete -> add_condition_node
5. Segunda mensagem com alternativa (Pix / cartão) na branch false -> add_action_node
6. Confirmar e finalizar -> finish_flow
${BASE_RULES}`,
    firstQuestion:
      "Vamos criar sua automação de Recuperação de Boleto! Quando você quer lembrar o cliente sobre o boleto?",
    firstOptions: [
      { label: "2 dias antes do vencimento", value: "Quero lembrar 2 dias antes do vencimento." },
      { label: "1 dia antes do vencimento", value: "Quero lembrar 1 dia antes do vencimento." },
      { label: "No dia do vencimento", value: "Quero lembrar no dia do vencimento." },
      { label: "Após o vencimento", value: "Quero lembrar após o boleto vencer." },
    ],
    webhook_instructions: [
      {
        platform: "Shopify",
        steps: [
          "No Shopify, configure o boleto via app parceiro (ex: Asaas, PagSeguro).",
          "No app de boleto, vá em Configurações > Webhooks.",
          "Cole a URL do webhook para o evento de boleto não pago/vencido.",
          "Salve e ative.",
        ],
      },
      {
        platform: "Hotmart",
        steps: [
          "Na Hotmart, vá em Ferramentas > Webhooks do produto.",
          "Adicione o evento \"Boleto não pago\" ou \"Compra cancelada por boleto\".",
          "Cole a URL do webhook e salve.",
        ],
      },
      {
        platform: "Kiwify",
        steps: [
          "Na Kiwify, vá em Integrações > Webhooks.",
          "Selecione o evento de boleto pendente ou não pago.",
          "Cole a URL do webhook e salve.",
        ],
      },
      {
        platform: "Yampi",
        steps: [
          "Na Yampi, acesse Configurações > API & Webhooks.",
          "Adicione um endpoint com o evento \"order.boleto_expired\" ou similar.",
          "Cole a URL do webhook e salve.",
        ],
      },
    ],
  },
];

export function getAutomationTypeById(id: string): AutomationType | undefined {
  return automationTypes.find((t) => t.id === id);
}
