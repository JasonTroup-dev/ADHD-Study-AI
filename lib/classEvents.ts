export const CLASSES_CHANGED_EVENT = "classes-changed";

export function notifyClassesChanged() {
  window.dispatchEvent(new Event(CLASSES_CHANGED_EVENT));
}
