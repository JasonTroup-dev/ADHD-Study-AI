import { describe, expect, it, vi } from "vitest";

import { getClipboardFiles } from "@/lib/files/clipboardFiles";

describe("getClipboardFiles", () => {
  it("returns pasted files and gives clipboard images a useful name", () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);
    const image = new File([new Uint8Array([1, 2, 3])], "image.png", {
      type: "image/png",
    });
    const document = new File(["notes"], "notes.pdf", {
      type: "application/pdf",
    });

    const files = getClipboardFiles({
      items: [clipboardItem(image), clipboardItem(document)] as unknown as DataTransferItemList,
      files: [] as unknown as FileList,
    });

    expect(files.map((file) => file.name)).toEqual([
      "clipboard-image-1234-1.png",
      "notes.pdf",
    ]);
  });

  it("falls back to the clipboard file list when items are unavailable", () => {
    const document = new File(["notes"], "notes.txt", { type: "text/plain" });

    expect(getClipboardFiles({
      items: [] as unknown as DataTransferItemList,
      files: [document] as unknown as FileList,
    })).toEqual([document]);
  });

});

function clipboardItem(file: File) {
  return {
    kind: "file",
    type: file.type,
    getAsFile: () => file,
  };
}
