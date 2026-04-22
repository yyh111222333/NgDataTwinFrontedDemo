import axios from 'axios'

// 定义一个工具函数，用于删除字符串末尾的斜杠 /
const trimTrailingSlash = (s: string) => s.replace(/\/$/, '')

/** 与 Vite `VITE_API_BASE_URL` 对齐；请求路径需带前导 `/`，例如 `/api/...`、`/health` */
export const apiClient = axios.create({
  baseURL: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? ''),
  timeout: 30_000,
})
