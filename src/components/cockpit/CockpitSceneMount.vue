<script setup lang="ts">
defineProps<{
  doorOpen: boolean
}>()
</script>

<template>
  <main class="cockpit-scene" aria-label="厂区地图 - 开关门">
    <div id="cockpit-map-mount" class="cockpit-scene__mount">
      <svg viewBox="0 0 800 400" class="cockpit-scene__svg" role="img" aria-label="回形外墙带门">
        <!-- 左段下墙 -->
        <path class="wall-segment" d="M80 320 L372 320" />
        <!-- 右段下墙 -->
        <path class="wall-segment" d="M428 320 L720 320" />
        <!-- 其余三面墙 -->
        <path class="wall-loop" d="M80 80 H720 V320 M80 80 V320" />

        <!-- 门扇：绕(372, 320)旋转，关门0°，开门-90°（逆时针向内） -->
        <g :transform="`rotate(${doorOpen ? -90 : 0}, 372, 320)`">
          <rect
            x="372"
            y="318.5"
            width="56"
            height="3"
            class="door-leaf"
          />
        </g>
      </svg>
    </div>
  </main>
</template>

<style scoped>
.cockpit-scene {
  position: absolute;
  inset: 0;
  z-index: 1;
  min-width: 0;
  background: radial-gradient(ellipse at center, rgba(20, 80, 120, 0.25) 0%, #020810 70%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cockpit-scene__mount {
  width: min(68vw, 1200px);
  aspect-ratio: 2 / 1;
}
.cockpit-scene__svg {
  width: 100%;
  height: 100%;
  user-select: none;
}
.cockpit-scene__title {
  fill: #bdefff;
  font-size: 18px;
  letter-spacing: 2px;
}
.wall-loop {
  fill: none;
  stroke: #55ddff;
  stroke-width: 3;
}
.wall-segment {
  fill: none;
  stroke: #55ddff;
  stroke-width: 3;
}
.door-leaf {
  fill: #79ebff;
  stroke: #c7f7ff;
  stroke-width: 1;
}
</style>

