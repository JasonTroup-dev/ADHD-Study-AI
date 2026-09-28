import {
  ArrowUp,
  FileText,
  ImageIcon,
  LoaderCircle,
  Plus,
  Square,
  X,
} from "lucide-react";
import { useLayoutEffect, useRef, type ClipboardEvent, type RefObject } from "react";

import AiMarkdown from "@/components/AiMarkdown";
import { getClipboardFiles } from "@/lib/files/clipboardFiles";
import { STUDY_FILE_ACCEPT } from "@/lib/files/uploadConstraints";

export default function InputBar({
  input,
  setInput,
  handleSend,
  onStopResponse,
  textareaRef,
  selectedQuote,
  onRemoveQuote,
  files,
  onFilesSelected,
  onFilesPasted,
  onRemoveFile,
  status,
  error,
  notice,
  accept = STUDY_FILE_ACCEPT,
  multiple = true,
  attachmentDisabled = false,
  attachmentLabel = "Attach study files",
  placeholder = "Ask anything",
  disabled = false,
}: {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  onStopResponse?: () => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  selectedQuote?: string | null;
  onRemoveQuote?: () => void;
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onFilesPasted?: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  status?: string;
  error?: string | null;
  notice?: string | null;
  accept?: string;
  multiple?: boolean;
  attachmentDisabled?: boolean;
  attachmentLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = textareaRef ?? internalTextareaRef;
  const canSend = input.trim().length > 0 || files.length > 0;
  const canStopResponse = disabled && Boolean(onStopResponse);

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    resize();
    let previousWidth = textarea.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.target.getBoundingClientRect().width;
      if (width !== previousWidth) {
        previousWidth = width;
        resize();
      }
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [input, inputRef, disabled, status, placeholder]);

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (disabled || attachmentDisabled) return;

    const pastedFiles = getClipboardFiles(event.clipboardData);
    if (pastedFiles.length === 0) return;

    event.preventDefault();
    const files = multiple ? pastedFiles : pastedFiles.slice(0, 1);
    (onFilesPasted ?? onFilesSelected)(files);
  }

  return (
    <div className="mt-12 mb-8 w-full max-w-2xl lg:max-w-xl xl:max-w-4xl">
      <div className="rounded-[2rem] border border-gray-200 bg-white px-4 py-3 shadow-sm">
        {selectedQuote ? (
          <div className="mb-3 flex items-start gap-3 rounded-xl border-l-4 border-blue-500 bg-blue-50 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-blue-700">Referencing tutor response</p>
              <blockquote className="mt-1 break-words text-sm text-gray-700">
                <AiMarkdown className="[&_p]:mb-0 [&_p]:leading-6" variant="tutor">
                  {selectedQuote}
                </AiMarkdown>
              </blockquote>
            </div>
            <button type="button" onClick={onRemoveQuote} disabled={disabled} aria-label="Remove quoted passage" className="rounded-full p-1 text-gray-500 hover:bg-blue-100 disabled:opacity-50">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {files.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2 px-1">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                className="flex max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              >
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-gray-500" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                )}
                <span className="max-w-52 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                  className="rounded-full p-0.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled || attachmentDisabled}
            onChange={(event) => {
              onFilesSelected(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
            className="sr-only"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled || attachmentDisabled}
            aria-label={attachmentLabel}
            title={attachmentLabel}
          >
            <Plus size={22} strokeWidth={2} />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
                && !event.shiftKey
                && !event.nativeEvent.isComposing
                && !disabled
              ) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder={disabled ? status ?? "Waiting for AI..." : placeholder}
            rows={1}
            className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
            disabled={disabled}
            aria-label="Message the AI Tutor"
          />

          <button
            type="button"
            onClick={canStopResponse ? onStopResponse : handleSend}
            disabled={!canStopResponse && (disabled || !canSend)}
            aria-label={canStopResponse ? "Stop response" : "Send message"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-black hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {canStopResponse ? (
              <Square className="h-4 w-4 fill-white text-white" />
            ) : disabled ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-white" />
            ) : (
              <ArrowUp className="text-white" />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-2 px-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {!error && notice ? (
        <p className="mt-2 px-3 text-sm text-gray-500">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
