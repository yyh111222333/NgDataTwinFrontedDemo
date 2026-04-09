<template>
  <!-- 场景层：后续地图统一挂载到 #cockpit-map-mount -->
  <main class="cockpit-scene" aria-label="3D 场景占位">
    <div id="cockpit-map-mount" class="cockpit-scene__mount">
      <span class="cockpit-scene__label">3D / 地图画布挂载点</span>
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
.cockpit-scene__mount { width: 100%; height: 100%; }
.cockpit-scene__label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  color: rgba(126, 232, 255, 0.75);
  letter-spacing: 0.12em;
  pointer-events: none;
}
</style>

