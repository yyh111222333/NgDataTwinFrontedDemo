import { getNanjingWeather, type NanjingWeather } from '@/api/weather'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const POLL_MS = 10 * 60_000

type RealtimeEnvelope = {
  type: string
  data: NanjingWeather
}

export function useNanjingWeather() {
  const weather = ref<NanjingWeather | null>(null)
  const weatherError = ref<string | null>(null)
  let timer: number | null = null
  let events: EventSource | null = null

  const refresh = async () => {
    try {
      weather.value = await getNanjingWeather()
      weatherError.value = null
    } catch (error) {
      weatherError.value = error instanceof Error ? error.message : String(error)
    }
  }

  const handleWeatherEvent = (event: MessageEvent<string>) => {
    try {
      const envelope = JSON.parse(event.data) as RealtimeEnvelope
      if (envelope.type !== 'weather.updated' || !envelope.data) return
      weather.value = envelope.data
      weatherError.value = null
    } catch {
      // 定时查询仍会刷新天气，忽略单条格式异常的实时消息。
    }
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') void refresh()
  }

  onMounted(() => {
    void refresh()
    timer = window.setInterval(() => void refresh(), POLL_MS)
    events = new EventSource('/api/public/realtime/stream')
    events.addEventListener('weather.updated', handleWeatherEvent as EventListener)
    document.addEventListener('visibilitychange', handleVisibility)
  })

  onBeforeUnmount(() => {
    if (timer !== null) window.clearInterval(timer)
    if (events) {
      events.removeEventListener('weather.updated', handleWeatherEvent as EventListener)
      events.close()
    }
    document.removeEventListener('visibilitychange', handleVisibility)
  })

  const weatherText = computed(() => {
    const current = weather.value
    if (!current) return '南京 --°C'
    const temperature = Number.isInteger(current.temperature_c)
      ? current.temperature_c.toFixed(0)
      : current.temperature_c.toFixed(1)
    return `${current.city} ${current.condition} ${temperature}°C`
  })

  return {
    weather,
    weatherCode: computed(() => weather.value?.weather_code ?? null),
    weatherText,
    weatherError,
    refresh,
  }
}
