import Anthropic from "@anthropic-ai/sdk";
import { Flow, ChatMessage, AIChatResponse, AIOption } from "../types/flow.js";
import { flowTools } from "./flowTools.js";
import { applyToolCall } from "./flowEngine.js";

const anthropic = new Anthropic(); // usa ANTHROPIC_API_KEY do ambiente


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
      system: systemPrompt,
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

  return {
    message: finalText,
    input_type: finalUi.input_type,
    options: finalUi.options,
    flow,
    flow_complete: flowComplete,
  };
}
