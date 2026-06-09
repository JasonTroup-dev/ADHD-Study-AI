import { Plus, ArrowUp } from "lucide-react";

export default function InputBar({
  input,
  setInput,
  handleSend,
  disabled = false,
}: {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-full max-w-2xl lg:max-w-xl xl:max-w-4xl mt-12 mb-8 rounded-full bg-white border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
      <button
        className="rounded-full p-2 hover:bg-gray-100 transition disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
      >
        <Plus size={22} strokeWidth={2} />
      </button>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={disabled ? "Waiting for AI..." : "Ask anything"}
        rows={1}
        className="flex-1 resize-none bg-transparent outline-none text-gray-900 placeholder:text-gray-400 disabled:cursor-not-allowed"
        disabled={disabled}
      />

      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="h-10 w-10 border rounded-full bg-black hover:bg-gray-700 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowUp className="text-white" />
      </button>
    </div>
  );
}
