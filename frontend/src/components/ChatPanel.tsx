import { ChatBubble, AIOption, AIInputType } from "../types";

interface Props {
  messages: ChatBubble[];
  options?: AIOption[];
  inputType: AIInputType;
  textInput: string;
  onTextInputChange: (value: string) => void;
  onSend: (value: string, label?: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export function ChatPanel({
  messages,
  options,
  inputType,
  textInput,
  onTextInputChange,
  onSend,
  loading,
  disabled = false,
}: Props) {
  return (
    <div className="chat-panel">
      <div className="messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`bubble ${m.role}${m.isTip ? " tip" : ""}`}
          >
            {m.isTip && <span className="tip-icon">💡</span>}
            {m.text}
          </div>
        ))}
        {loading && <div className="bubble assistant loading">Digitando...</div>}
      </div>

      <div className={`input-area${disabled ? " input-disabled" : ""}`}>
        {inputType === "options" && options && (
          <div className="options">
            {options.map((opt) => (
              <button
                key={opt.value}
                disabled={loading}
                onClick={() => onSend(opt.value, opt.label)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {inputType === "confirmation" && options && (
          <div className="options">
            {options.map((opt) => (
              <button
                key={opt.value}
                disabled={loading}
                onClick={() => onSend(opt.value, opt.label)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {inputType === "text" && (
          <div className="text-input">
            <input
              type="text"
              value={textInput}
              disabled={loading}
              placeholder="Digite sua resposta..."
              onChange={(e) => onTextInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && textInput.trim()) {
                  onSend(textInput.trim());
                }
              }}
            />
            <button
              disabled={loading || !textInput.trim()}
              onClick={() => onSend(textInput.trim())}
            >
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
