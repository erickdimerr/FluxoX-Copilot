import Anthropic from "@anthropic-ai/sdk";
import { Flow, ChatMessage, AIChatResponse, AIOption, FlowEvaluation } from "../types/flow.js";
import { flowTools } from "./flowTools.js";
import { applyToolCall } from "./flowEngine.js";

const anthropic = new Anthropic(); // usa ANTHROPIC_API_KEY do ambiente

const TIP_INSTRUCTION = `

Quando identificar uma oportunidade de melhoria importante no fluxo que o usuário está montando (ex: verificar se conversão já ocorreu, evitar spam, boas práticas de timing, mensagem de fallback), inclua uma dica no formato <tip>texto da dica</tip> APÓS sua mensagem principal. Use com moderação — no máximo uma dica por resposta, somente quando agregar valor real.`;

function extractTip(text: string): { cleanText: string; tip?: string } {
  const match = text.match(/<tip>([\s\S]*?)<\/tip>/);
  if (!match) return { cleanText: text };
  return {
    cleanText: text.replace(/<tip>[\s\S]*?<\/tip>/, "").trim(),
    tip: match[1].trim(),
  };
}

function extractUiBlock(text: string): {
  cleanText: string;
  input_type: AIChatResponse["input_type"];
  options?: AIOption[];
} {
  const match = text.match(/<ui>([\s\S]*?)<\/ui>/);
  let input_type: AIChatResponse["input_type"] = "text";
  let options: AIOption[] | undefined;

  if (match) {
    try {
      const parsed = JSON.parse(match[1].trim());
      input_type = parsed.input_type ?? "text";
      options = parsed.options;
    } catch {
      // fallback silencioso, mantém input_type "text"
    }
  }

  const cleanText = text.replace(/<ui>[\s\S]*?<\/ui>/, "").trim();
  return { cleanText, input_type, options };
}

export async function processChatMessage(
  flow: Flow,
  history: ChatMessage[],
  userMessage: string,
  systemPrompt: string
): Promise<AIChatResponse> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const systemWithTip = systemPrompt + TIP_INSTRUCTION;

  let flowComplete = false;
  let finalText = "";
  let finalUi: { input_type: AIChatResponse["input_type"]; options?: AIOption[] } = {
    input_type: "text",
  };

  // Loop de tool use: a IA pode chamar várias tools antes da resposta final
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemWithTip,
      tools: flowTools,
      messages,
    });

    const textBlocks = response.content.filter((b) => b.type === "text");
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");

    const rawText = textBlocks.map((b: any) => b.text).join("\n");

    if (toolBlocks.length === 0) {
      // Resposta final em texto puro
      const { cleanText, input_type, options } = extractUiBlock(rawText);
      finalText = cleanText;
      finalUi = { input_type, options };
      break;
    }

    // Aplica cada tool call no fluxo e prepara tool_results
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolBlocks) {
      if (block.type !== "tool_use") continue;

      if (block.name === "finish_flow") {
        flowComplete = true;
      }

      const result = applyToolCall(flow, block.name, block.input);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.message,
      });
    }

    messages.push({ role: "user", content: toolResults });

    // Se houve texto junto com as tool calls, pode ser usado como fallback
    if (rawText.trim()) {
      const { cleanText, input_type, options } = extractUiBlock(rawText);
      finalText = cleanText;
      finalUi = { input_type, options };
    }
  }

  const { cleanText, tip } = extractTip(finalText);

  return {
    message: cleanText,
    tip,
    input_type: finalUi.input_type,
    options: finalUi.options,
    flow,
    flow_complete: flowComplete,
  };
}

export async function evaluateFlow(flow: Flow): Promise<FlowEvaluation> {
  const prompt = `Você é um especialista em automação de marketing via WhatsApp. Avalie este fluxo de automação e retorne uma análise em JSON.

Fluxo:
${JSON.stringify(flow, null, 2)}

Retorne APENAS um objeto JSON válido neste formato exato (sem markdown, sem texto fora do JSON):
{
  "score": <inteiro de 0 a 100 representando a qualidade do fluxo>,
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["sugestão de melhoria 1", "sugestão de melhoria 2"]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  return JSON.parse(text) as FlowEvaluation;
}
