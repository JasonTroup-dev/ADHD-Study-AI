type UploadFormDataOptions = {
  signal?: AbortSignal;
  onUploadProgress?: (progress: number) => void;
};

export type UploadFormDataResult<T> = {
  data: T | null;
  ok: boolean;
  status: number;
};

/**
 * XMLHttpRequest is used here because fetch does not expose browser upload
 * progress. The API response is still parsed as JSON just like a fetch call.
 */
export function uploadFormData<T>(
  url: string,
  formData: FormData,
  { signal, onUploadProgress }: UploadFormDataOptions = {},
): Promise<UploadFormDataResult<T>> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    function cleanUp() {
      signal?.removeEventListener("abort", handleSignalAbort);
    }

    function handleSignalAbort() {
      request.abort();
    }

    if (signal?.aborted) {
      reject(new DOMException("The upload was canceled.", "AbortError"));
      return;
    }

    request.open("POST", url);
    onUploadProgress?.(0);

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        onUploadProgress?.(Math.min(event.loaded / event.total, 1));
      }
    });
    request.upload.addEventListener("load", () => onUploadProgress?.(1));

    request.addEventListener("load", () => {
      cleanUp();

      let data: T | null = null;
      try {
        data = JSON.parse(request.responseText) as T;
      } catch {
        // Callers already handle incomplete or non-JSON responses.
      }

      resolve({
        data,
        ok: request.status >= 200 && request.status < 300,
        status: request.status,
      });
    });

    request.addEventListener("error", () => {
      cleanUp();
      reject(new Error("The upload could not be completed."));
    });

    request.addEventListener("abort", () => {
      cleanUp();
      reject(new DOMException("The upload was canceled.", "AbortError"));
    });

    signal?.addEventListener("abort", handleSignalAbort, { once: true });
    request.send(formData);
  });
}
