# Automation Platform — MVP

Plataforma de criação de automações (ex: carrinho abandonado) guiada por IA,
que monta o fluxo conversando com o usuário e gera um JSON estruturado.

## Estrutura

```
automation-platform/
├── backend/   # Fastify + TypeScript + Claude API (function calling)
└── frontend/  # React + Vite (chat + visualização do fluxo)
```

## Como rodar

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edite .env e coloque sua ANTHROPIC_API_KEY
npm run dev
```

O servidor sobe em `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Como funciona

1. Ao abrir o frontend, uma sessão é criada (`POST /api/flows`) e o fluxo
   começa vazio (`draft`).
2. A IA faz perguntas (ex: "quando o fluxo deve iniciar?") com opções
   pré-definidas, renderizadas como botões.
3. Cada resposta do usuário é enviada para `POST /api/flows/:sessionId/chat`,
   onde a IA (Claude com tool use) decide:
   - chamar uma tool (`set_trigger`, `add_action_node`, `add_condition_node`,
     `add_delay_node`, `connect_branch`, `finish_flow`) que modifica o JSON
     do fluxo, e/ou
   - responder com a próxima pergunta + tipo de input (`options`, `text`,
     `confirmation`).
4. O fluxo é exibido em tempo real no painel direito conforme é montado.

## Próximos passos sugeridos

- Persistir sessões/fluxos em Postgres em vez de memória.
- Implementar o **engine de execução**: ao receber o webhook real
  (`cart_abandoned`), processar o JSON do fluxo (filas com BullMQ/Redis para
  os delays, integração com WhatsApp/Email).
- Adicionar autenticação e multi-tenant (cada cliente com seus próprios
  fluxos e webhooks).
- Permitir edição manual do fluxo gerado (drag-and-drop) além da conversa
  com a IA.
- Validar o JSON do fluxo (schema completo, sem branches soltas) antes de
  permitir "publicar".
