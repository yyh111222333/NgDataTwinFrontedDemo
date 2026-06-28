<script setup lang="ts">
import { bottomMenus } from '@/config/cockpit'
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const subsystem = computed(() => {
  const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  return bottomMenus.find((item) => item.id === id) ?? null
})

const openInNewWindow = () => {
  if (!subsystem.value) return
  window.open(subsystem.value.url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <main class="subsystem-frame">
    <div class="subsystem-frame__toolbar">
      <RouterLink class="subsystem-frame__action" :to="{ name: 'cockpit' }">
        返回大屏
      </RouterLink>
      <button
        v-if="subsystem"
        class="subsystem-frame__action subsystem-frame__action--secondary"
        type="button"
        @click="openInNewWindow"
      >
        新窗口打开
      </button>
    </div>

    <iframe
      v-if="subsystem"
      class="subsystem-frame__iframe"
      :src="subsystem.url"
      :title="subsystem.label"
    />
    <section v-else class="subsystem-frame__empty">
      <p>未找到对应的子系统入口</p>
      <RouterLink class="subsystem-frame__action" :to="{ name: 'cockpit' }">
        返回大屏
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.subsystem-frame {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #050d18;
}

.subsystem-frame__toolbar {
  position: fixed;
  top: 18px;
  left: 18px;
  z-index: 10;
  display: flex;
  gap: 10px;
  align-items: center;
}

.subsystem-frame__action {
  min-width: 104px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(126, 232, 255, 0.55);
  border-radius: 8px;
  background: rgba(5, 16, 32, 0.82);
  color: #eaf9ff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  line-height: 38px;
  text-align: center;
  text-decoration: none;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.subsystem-frame__action--secondary {
  color: rgba(234, 249, 255, 0.88);
  background: rgba(5, 16, 32, 0.62);
}

.subsystem-frame__action:hover {
  border-color: rgba(184, 240, 255, 0.9);
  background: rgba(10, 34, 58, 0.9);
}

.subsystem-frame__iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.subsystem-frame__empty {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #eaf9ff;
  font-size: 18px;
}
</style>
