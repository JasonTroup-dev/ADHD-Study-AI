"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const BLOCK_ELEMENTS = new Set([
  "BLOCKQUOTE",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "OL",
  "P",
  "PRE",
  "UL",
]);

function serializeSelection(range: Range, response: Element) {
  function read(node: Node): string {
    if (!range.intersectsNode(node)) return "";

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const start = node === range.startContainer ? range.startOffset : 0;
      const end = node === range.endContainer ? range.endOffset : text.length;
      return text.slice(start, end);
    }
    if (!(node instanceof Element)) return "";

    if (node.classList.contains("katex")) {
      const source = node
        .querySelector("annotation[encoding='application/x-tex']")
        ?.textContent
        ?.trim();
      return source ? `$${source}$` : "";
    }

    const content = Array.from(node.childNodes, read).join("");
    if (node.tagName === "BR") return "\n";
    if (!content) return "";
    return BLOCK_ELEMENTS.has(node.tagName)
      ? `\n${content}\n`
      : content;
  }

  return read(response)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * KaTeX renders both an accessibility tree and a visual tree. Native
 * Selection#toString includes pieces of both, so serialize each selected
 * equation from KaTeX's original TeX annotation instead.
 */
export function getTutorSelectionText(selection: Selection, response: Element) {
  if (selection.isCollapsed || !selection.rangeCount) return "";

  return serializeSelection(selection.getRangeAt(0), response);
}

export default function ResponseSelection({ children, onAskTutor }: {
  children: ReactNode;
  onAskTutor?: (quote: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<{ text: string; left: number; top: number } | null>(null);

  useEffect(() => {
    if (!onAskTutor) return;
    function updateSelection() {
      const selected = window.getSelection();
      const root = rootRef.current;
      if (!root || !selected || selected.isCollapsed || !selected.rangeCount) {
        // Keep the action reachable when keyboard focus moves to it.
        if (document.activeElement !== buttonRef.current) setSelection(null);
        return;
      }
      const range = selected.getRangeAt(0);
      const closestResponse = (node: Node) => (
        node instanceof Element
          ? node.closest("[data-tutor-response]")
          : node.parentElement?.closest("[data-tutor-response]")
      );
      const start = closestResponse(range.startContainer);
      const end = closestResponse(range.endContainer);
      if (!start || start !== end || !root.contains(start)) {
        setSelection(null);
        return;
      }
      const text = getTutorSelectionText(selected, start);
      if (!text) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSelection({ text, left: Math.max(8, Math.min(rect.left, window.innerWidth - 128)), top: Math.max(8, Math.min(rect.top - 44, window.innerHeight - 48)) });
    }
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") setSelection(null);
    }
    document.addEventListener("selectionchange", updateSelection);
    window.addEventListener("scroll", updateSelection, true);
    window.addEventListener("resize", updateSelection);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      window.removeEventListener("scroll", updateSelection, true);
      window.removeEventListener("resize", updateSelection);
      document.removeEventListener("keydown", dismiss);
    };
  }, [onAskTutor]);

  return (
    <div ref={rootRef}>
      {children}
      {selection && onAskTutor ? (
        <button
          ref={buttonRef}
          type="button"
          className="fixed z-50 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-lg hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-blue-600"
          style={{ left: selection.left, top: selection.top }}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            onAskTutor(selection.text);
            window.getSelection()?.removeAllRanges();
            setSelection(null);
            requestAnimationFrame(() => {
              rootRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
            });
          }}
        >
          Ask tutor
        </button>
      ) : null}
    </div>
  );
}
