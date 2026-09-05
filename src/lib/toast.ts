import { toast as toastManager } from "@/components/ui/toast"

type ToastOptions = {
  description?: string
  timeout?: number
}

type PromiseMessage<Value> = string | ((value: Value) => string)

/**
 * Sonner-style wrapper around the base-ui toast manager. Import this
 * anywhere (`import { toast } from "@/lib/toast"`) instead of touching
 * `@/components/ui/toast` directly, so every toast in the app looks
 * and behaves the same.
 */
export const toast = {
  message: (title: string, options?: ToastOptions) => toastManager.add({ title, ...options }),
  success: (title: string, options?: ToastOptions) =>
    toastManager.add({ type: "success", title, ...options }),
  error: (title: string, options?: ToastOptions) =>
    toastManager.add({ type: "error", title, ...options }),
  info: (title: string, options?: ToastOptions) =>
    toastManager.add({ type: "info", title, ...options }),
  warning: (title: string, options?: ToastOptions) =>
    toastManager.add({ type: "warning", title, ...options }),
  dismiss: (id?: string) => toastManager.close(id),
  promise: <Value>(
    promise: Promise<Value>,
    options: {
      loading: string
      success: PromiseMessage<Value>
      error: PromiseMessage<unknown>
    }
  ) =>
    toastManager.promise(promise, {
      loading: options.loading,
      success: (value) =>
        typeof options.success === "function" ? options.success(value) : options.success,
      error: (err) => (typeof options.error === "function" ? options.error(err) : options.error),
    }),
}
