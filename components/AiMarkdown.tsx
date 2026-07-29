import { cn } from "@/lib/utils";
import { normalizeMathDelimiters } from "@/components/aiMarkdownText";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

type AiMarkdownVariant = "tutor" | "study-guide" | "flashcard";

type AiMarkdownProps = {
  children: string;
  className?: string;
  variant?: AiMarkdownVariant;
};

const tutorComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 text-3xl font-semibold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-5 text-2xl font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-7 text-gray-800">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-2 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-2 pl-6">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-7 text-gray-800">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-black">{children}</strong>
  ),
};

const studyGuideComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-6 text-3xl font-semibold tracking-tight text-slate-950">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 border-b border-slate-200 pb-1.5 text-lg font-semibold text-slate-950 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-semibold text-slate-900">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 max-w-3xl leading-6 text-slate-700">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 max-w-3xl list-disc space-y-1.5 pl-6 text-slate-700">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 max-w-3xl list-decimal space-y-1.5 pl-6 text-slate-700">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-6">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-950">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-blue-200 bg-blue-50 px-4 py-2 text-slate-700">
      {children}
    </blockquote>
  ),
};

const flashcardComponents: Components = {
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="mx-auto w-fit list-disc space-y-1 pl-5 text-left">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mx-auto w-fit list-decimal space-y-1 pl-5 text-left">
      {children}
    </ol>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
};

const componentsByVariant: Record<AiMarkdownVariant, Components> = {
  tutor: tutorComponents,
  "study-guide": studyGuideComponents,
  flashcard: flashcardComponents,
};

export default function AiMarkdown({
  children,
  className,
  variant = "tutor",
}: AiMarkdownProps) {
  return (
    <div
      className={cn(
        "ai-markdown min-w-0",
        `ai-markdown--${variant}`,
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={componentsByVariant[variant]}
      >
        {normalizeMathDelimiters(children)}
      </ReactMarkdown>
    </div>
  );
}
