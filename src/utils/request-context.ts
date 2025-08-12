import { AsyncLocalStorage } from "async_hooks"

export interface RequestContextValue {
  headers?: Record<string, string | string[] | undefined>
  sessionId?: string
}

const storage = new AsyncLocalStorage<RequestContextValue>()

export function runWithRequestContext<T>(
  context: RequestContextValue,
  callback: () => T,
): T {
  return storage.run(context, callback)
}

export function getRequestContext(): RequestContextValue | undefined {
  return storage.getStore()
}


