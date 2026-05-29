<!-- KPI 环形指标：用于系统运行总览等看板内展示。 -->
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  items: Array<{ value: string | number; label: string }>
}>()

const toneClass = (label: string, value: string | number) => {
  if (label === '异常警告') return 'tone-warning'
  if (label !== '火车道状态') return 'tone-primary'
  if (value === '空闲') return 'tone-idle'
  if (value === '占用') return 'tone-busy'
  return 'tone-primary'
}

const formatValue = (label: string, value: string | number) => {
  const raw = String(value)
  if (label === '火车道状态') return raw
  if (label === '在线门禁' || label === '异常警告') return `${raw}个`
  if (label === '区域总人数') return `${raw}人`
  if (label === '车辆在场') return `${raw}辆`
  return raw
}

const gridLayoutClass = computed(() =>
  props.items.length >= 5 ? 'cockpit-stats__grid--five' : '',
)
</script>

<template>
  <div class="cockpit-stats">
    <div class="cockpit-stats__bg" aria-hidden="true">
      <span class="cockpit-stats__vignette" />
      <span class="cockpit-stats__grid-lines" />
      <div class="cockpit-stats__fx">
        <span class="cockpit-stats__ambient" />
        <span class="cockpit-stats__scan-band" />
        <span class="cockpit-stats__ripple cockpit-stats__ripple--a" />
        <span class="cockpit-stats__ripple cockpit-stats__ripple--b" />
        <span class="cockpit-stats__platform cockpit-stats__platform--wide" />
        <span class="cockpit-stats__platform cockpit-stats__platform--core" />
      </div>
    </div>

    <div class="cockpit-stats__grid" :class="gridLayoutClass">
      <div
        v-for="(item, idx) in items"
        :key="idx"
        class="cockpit-stats__item"
        :class="toneClass(item.label, item.value)"
      >
        <div class="cockpit-stats__pedestal">
          <span class="cockpit-stats__halo cockpit-stats__halo--outer" aria-hidden="true" />
          <span class="cockpit-stats__halo cockpit-stats__halo--mid" aria-hidden="true" />
          <span class="cockpit-stats__halo cockpit-stats__halo--inner" aria-hidden="true" />
          <span class="cockpit-stats__halo cockpit-stats__halo--glow" aria-hidden="true" />
          <div class="cockpit-stats__ring">
            <span class="cockpit-stats__ring-orbit" aria-hidden="true" />
            <span class="cockpit-stats__ring-ticks" aria-hidden="true" />
            <span class="cockpit-stats__value">{{ formatValue(item.label, item.value) }}</span>
          </div>
        </div>
        <span class="cockpit-stats__label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cockpit-stats {
  position: relative;
  width: 100%;
  height: auto;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2px 4px 4px;
  box-sizing: border-box;
  overflow: hidden;
}

.cockpit-stats__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.cockpit-stats__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 85% 70% at 50% 42%, transparent 40%, rgba(2, 8, 18, 0.4) 100%);
}

.cockpit-stats__grid-lines {
  position: absolute;
  inset: 4% 6% 18%;
  opacity: 0.26;
  background-image:
    linear-gradient(rgba(48, 200, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(48, 200, 255, 0.05) 1px, transparent 1px);
  background-size: 18px 18px;
  mask-image: radial-gradient(ellipse 80% 65% at 50% 40%, #000 20%, transparent 78%);
  animation: cockpit-stats-grid-breathe 7s ease-in-out infinite;
}

/* 动画限定在 KPI 下方，避免压在「车辆在场」「火车道状态」圆环后 */
.cockpit-stats__fx {
  position: absolute;
  left: 0;
  right: 0;
  top: 86%;
  bottom: 0;
  overflow: hidden;
  mask-image: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.65) 28%, #000 50%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.65) 28%, #000 50%);
}

.cockpit-stats__ambient {
  position: absolute;
  left: 50%;
  top: 58%;
  width: 82%;
  height: 90%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(48, 200, 255, 0.16) 0%, transparent 68%);
  animation: cockpit-stats-ambient 6s ease-in-out infinite;
}

.cockpit-stats__scan-band {
  position: absolute;
  left: 6%;
  right: 6%;
  top: -40%;
  height: 70%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(48, 200, 255, 0.02) 30%,
    rgba(92, 232, 255, 0.1) 50%,
    rgba(48, 200, 255, 0.02) 70%,
    transparent 100%
  );
  filter: blur(3px);
  animation: cockpit-stats-scan-band 9s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.cockpit-stats__ripple {
  position: absolute;
  left: 50%;
  bottom: 8%;
  width: 76%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(48, 200, 255, 0.2);
  transform: translateX(-50%) scaleY(0.22);
  opacity: 0;
  pointer-events: none;
}

.cockpit-stats__ripple--a {
  animation: cockpit-stats-ripple 5.5s ease-out infinite;
}

.cockpit-stats__ripple--b {
  animation: cockpit-stats-ripple 5.5s ease-out 2.75s infinite;
}

.cockpit-stats__platform {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 50%;
}

.cockpit-stats__platform--wide {
  bottom: 2%;
  width: 92%;
  height: 85%;
  transform: translateX(-50%) scaleY(0.22);
  border: 1px solid rgba(48, 200, 255, 0.12);
  box-shadow: 0 0 20px rgba(48, 200, 255, 0.08);
}

.cockpit-stats__platform--core {
  bottom: 10%;
  width: 78%;
  height: 75%;
  transform: translateX(-50%) scaleY(0.24);
  background: radial-gradient(ellipse at center, rgba(48, 200, 255, 0.22) 0%, transparent 70%);
  animation: cockpit-stats-platform-breathe 5s ease-in-out infinite;
}

.cockpit-stats__grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 8px;
  width: 100%;
  max-width: 292px;
}

/* 5 项：上 2 下 3（与气象概况布局一致） */
.cockpit-stats__grid--five {
  grid-template-columns: repeat(6, 1fr);
  gap: 10px 5px;
  max-width: 306px;
}

.cockpit-stats__grid--five .cockpit-stats__item:nth-child(1) {
  grid-column: 2 / 4;
  grid-row: 1;
}

.cockpit-stats__grid--five .cockpit-stats__item:nth-child(2) {
  grid-column: 4 / 6;
  grid-row: 1;
}

.cockpit-stats__grid--five .cockpit-stats__item:nth-child(3) {
  grid-column: 1 / 3;
  grid-row: 2;
}

.cockpit-stats__grid--five .cockpit-stats__item:nth-child(4) {
  grid-column: 3 / 5;
  grid-row: 2;
}

.cockpit-stats__grid--five .cockpit-stats__item:nth-child(5) {
  grid-column: 5 / 7;
  grid-row: 2;
}

.cockpit-stats__grid--five .cockpit-stats__item {
  gap: 6px;
}

.cockpit-stats__grid--five .cockpit-stats__pedestal {
  width: 76px;
  height: 70px;
}

.cockpit-stats__grid--five .cockpit-stats__ring {
  width: 62px;
  height: 62px;
}

.cockpit-stats__grid--five .cockpit-stats__value {
  font-size: 18px;
}

.cockpit-stats__grid--five .cockpit-stats__label {
  font-size: 11px;
  letter-spacing: 0.08em;
}

.cockpit-stats__grid--five .cockpit-stats__halo--outer {
  width: 68px;
  height: 68px;
  bottom: 0;
}

.cockpit-stats__grid--five .cockpit-stats__halo--mid {
  width: 56px;
  height: 56px;
  bottom: 4px;
}

.cockpit-stats__grid--five .cockpit-stats__halo--inner {
  width: 44px;
  height: 44px;
  bottom: 7px;
}

.cockpit-stats__grid--five .cockpit-stats__halo--glow {
  width: 60px;
  height: 60px;
  bottom: 5px;
}

.cockpit-stats__item {
  --ring-color: #5ce8ff;
  --ring-glow: rgba(48, 200, 255, 0.5);
  --halo-color: rgba(72, 220, 255, 0.65);
  --halo-soft: rgba(48, 200, 255, 0.16);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cockpit-stats__item.tone-idle {
  --ring-color: #55ef96;
  --ring-glow: rgba(85, 239, 150, 0.45);
  --halo-color: rgba(85, 239, 150, 0.55);
  --halo-soft: rgba(85, 239, 150, 0.14);
}

.cockpit-stats__item.tone-busy {
  --ring-color: #ff6b6b;
  --ring-glow: rgba(255, 90, 90, 0.48);
  --halo-color: rgba(255, 110, 110, 0.55);
  --halo-soft: rgba(255, 90, 90, 0.14);
}

.cockpit-stats__item.tone-warning {
  --ring-color: #ffd54f;
  --ring-glow: rgba(255, 213, 79, 0.48);
  --halo-color: rgba(255, 200, 60, 0.6);
  --halo-soft: rgba(255, 200, 60, 0.16);
}

.cockpit-stats__pedestal {
  position: relative;
  width: 86px;
  height: 80px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.cockpit-stats__halo {
  position: absolute;
  left: 50%;
  border-radius: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}

.cockpit-stats__halo--outer {
  bottom: 1px;
  width: 80px;
  height: 80px;
  transform: translateX(-50%) scaleY(0.27);
  border: 1px solid rgba(92, 220, 255, 0.2);
  box-shadow: 0 0 10px var(--halo-soft);
}

.cockpit-stats__halo--mid {
  bottom: 5px;
  width: 66px;
  height: 66px;
  transform: translateX(-50%) scaleY(0.29);
  border: 1px dashed rgba(92, 220, 255, 0.26);
  opacity: 0.9;
}

.cockpit-stats__halo--inner {
  bottom: 9px;
  width: 52px;
  height: 52px;
  transform: translateX(-50%) scaleY(0.31);
  border: 1.5px solid var(--halo-color);
  box-shadow:
    0 0 12px var(--halo-soft),
    inset 0 0 14px var(--halo-soft);
}

.cockpit-stats__halo--glow {
  bottom: 7px;
  width: 70px;
  height: 70px;
  transform: translateX(-50%) scaleY(0.25);
  background: radial-gradient(ellipse at center, var(--halo-soft) 0%, transparent 74%);
}

.cockpit-stats__ring {
  position: relative;
  z-index: 2;
  width: 70px;
  height: 70px;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid var(--ring-color);
  box-shadow:
    0 0 14px var(--ring-glow),
    0 0 2px rgba(255, 255, 255, 0.15) inset,
    inset 0 0 18px rgba(48, 200, 255, 0.12);
  background:
    radial-gradient(circle at 50% 38%, rgba(92, 232, 255, 0.12) 0%, transparent 45%),
    radial-gradient(circle at 50% 55%, rgba(14, 42, 68, 0.7) 0%, rgba(4, 12, 22, 0.88) 100%);
}

.cockpit-stats__ring-orbit {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1px dashed rgba(92, 220, 255, 0.28);
  opacity: 0.75;
}

.cockpit-stats__ring-ticks {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: repeating-conic-gradient(
    from 0deg,
    transparent 0deg 8deg,
    rgba(92, 232, 255, 0.14) 8deg 9deg
  );
  mask: radial-gradient(circle, transparent 62%, #000 63%);
  opacity: 0.55;
}

.cockpit-stats__value {
  position: relative;
  z-index: 1;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  color: #f4fcff;
  text-shadow:
    0 0 10px var(--ring-glow),
    0 1px 0 rgba(0, 0, 0, 0.35);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.cockpit-stats__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: rgba(220, 245, 255, 0.9);
  white-space: nowrap;
}

.cockpit-stats__item.tone-idle .cockpit-stats__label {
  color: rgba(170, 255, 200, 0.92);
}

.cockpit-stats__item.tone-busy .cockpit-stats__label {
  color: rgba(255, 180, 180, 0.92);
}

.cockpit-stats__item.tone-warning .cockpit-stats__label {
  color: rgba(255, 228, 150, 0.95);
}

@keyframes cockpit-stats-grid-breathe {
  0%,
  100% {
    opacity: 0.22;
  }
  50% {
    opacity: 0.34;
  }
}

@keyframes cockpit-stats-ambient {
  0%,
  100% {
    opacity: 0.45;
    transform: translate(-50%, -50%) scale(0.98);
  }
  50% {
    opacity: 0.72;
    transform: translate(-50%, -50%) scale(1.03);
  }
}

@keyframes cockpit-stats-scan-band {
  0% {
    transform: translateY(-5%);
    opacity: 0;
  }
  12% {
    opacity: 0.5;
  }
  60% {
    transform: translateY(85%);
    opacity: 0.25;
  }
  100% {
    transform: translateY(115%);
    opacity: 0;
  }
}

@keyframes cockpit-stats-ripple {
  0% {
    transform: translateX(-50%) scaleY(0.22) scale(0.88);
    opacity: 0.42;
  }
  100% {
    transform: translateX(-50%) scaleY(0.22) scale(1.12);
    opacity: 0;
  }
}

@keyframes cockpit-stats-platform-breathe {
  0%,
  100% {
    opacity: 0.5;
    filter: brightness(0.95);
  }
  50% {
    opacity: 0.82;
    filter: brightness(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cockpit-stats__grid-lines,
  .cockpit-stats__fx .cockpit-stats__ambient,
  .cockpit-stats__fx .cockpit-stats__scan-band,
  .cockpit-stats__fx .cockpit-stats__ripple,
  .cockpit-stats__fx .cockpit-stats__platform--core {
    animation: none;
  }
}
</style>
