import { apiClient } from '@/api/client'

export interface NanjingWeather {
  city: string
  condition: string
  temperature_c: number
  weather_code: number
  observed_at: string
  updated_at: string
  source: string
  stale: boolean
}

export async function getNanjingWeather(): Promise<NanjingWeather> {
  const { data } = await apiClient.get<NanjingWeather>('/api/public/weather', {
    timeout: 8_000,
    headers: { 'Cache-Control': 'no-cache' },
  })
  return data
}
