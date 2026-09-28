import { reportClientError } from "@/lib/monitoring/client";

window.addEventListener("error", (event) => {
  reportClientError("uncaught-error", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  reportClientError("unhandled-rejection", event.reason);
});
