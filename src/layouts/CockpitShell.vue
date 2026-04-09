<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import autofit from 'autofit.js'

const SCALE_TARGET = '#cockpit-scale-inner'

onMounted(() => {
  autofit.init({
    dw: 1920,
    dh: 1080,
    el: SCALE_TARGET,
    resize: true,
  })
})

onBeforeUnmount(() => {
  autofit.off()
})
</script>

<template>
  <div class="cockpit-viewport">
    <div id="cockpit-scale-inner" class="cockpit-scale-inner">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.cockpit-viewport {
  width: 100vw;
  height: 100vw;
  overflow: hidden;
  background: #050d18;
}

.cockpit-scale-inner {
  width: 1920px;
  height: 1080px;
  position: relative;
  transform-origin: left top;
}
</style>

