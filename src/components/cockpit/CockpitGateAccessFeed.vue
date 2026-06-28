<!-- F8 调试面板内：实时展示后端推送的过门事件（进/出） -->
<script setup lang="ts">
import { groupSceneDoorLabel } from '@/components/cockpit/sceneMount/sceneDoorIds'
import type { GateAccessEvent } from '@/types/gate-access'
import { computed } from 'vue'

const props = defineProps<{
  events: GateAccessEvent[]
}>()

const visibleEvents = computed(() => props.events.slice(0, 8))

const formatTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

const directionLabel = (direction: GateAccessEvent['direction']) =>
  direction === 'in' ? '进' : '出'
</script>

<template>
  <section class="gate-access-feed" aria-label="门禁过门事件">
    <div class="gate-access-feed__title">实时过门</div>
    <p v-if="visibleEvents.length === 0" class="gate-access-feed__empty">暂无过门事件（Mock 约 3s 轮询）</p>
    <ul v-else class="gate-access-feed__list">
      <li
        v-for="event in visibleEvents"
        :key="event.eventId"
        class="gate-access-feed__item"
        :class="event.direction === 'in' ? 'gate-access-feed__item--in' : 'gate-access-feed__item--out'"
      >
        <span class="gate-access-feed__door">{{ groupSceneDoorLabel(event.doorId) }} · {{ event.doorId }}</span>
        <span class="gate-access-feed__direction">{{ directionLabel(event.direction) }}</span>
        <span v-if="event.personName" class="gate-access-feed__person">{{ event.personName }}</span>
        <span class="gate-access-feed__time">{{ formatTime(event.occurredAt) }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.gate-access-feed {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(48, 220, 255, 0.2);
}

.gate-access-feed__title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #9fefff;
}

.gate-access-feed__empty {
  margin: 0;
  font-size: 11px;
  color: rgba(160, 210, 230, 0.65);
}

.gate-access-feed__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
}

.gate-access-feed__item {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  color: rgba(220, 245, 255, 0.92);
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(8, 28, 44, 0.65);
}

.gate-access-feed__item--in .gate-access-feed__direction {
  color: #7dffb0;
}

.gate-access-feed__item--out .gate-access-feed__direction {
  color: #ffb86c;
}

.gate-access-feed__door {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gate-access-feed__direction {
  font-weight: 700;
  min-width: 1em;
  text-align: center;
}

.gate-access-feed__person {
  color: rgba(180, 220, 240, 0.85);
  max-width: 4em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gate-access-feed__time {
  color: rgba(150, 200, 220, 0.72);
  font-variant-numeric: tabular-nums;
}
</style>
