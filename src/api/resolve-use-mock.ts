export type MockOptions = { useMock?: boolean }

/**
 * 是否走本地 Mock。默认 Mock（后端未就绪时不 404）；
 * 设置 VITE_USE_MOCK=false 可全局切真实 API。
 */
export function resolveUseMock(options?: MockOptions): boolean {
  const env = import.meta.env.VITE_USE_MOCK
  if (env === 'false' || env === '0') return false
  if (env === 'true' || env === '1') return true
  return options?.useMock !== false
}
