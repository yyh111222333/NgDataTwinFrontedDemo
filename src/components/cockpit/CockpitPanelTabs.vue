<!-- 看板内三 Tab 切换 + 图表占位区（人员/车辆/行车/智慧监控等复用）。 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export type PanelTabItem = {
  key: string
  label: string
}

const props = withDefaults(
  defineProps<{
    tabs: PanelTabItem[]
    ariaLabel: string
    bodyMinHeight?: number
  }>(),
  {
    bodyMinHeight: 80,
  },
)

const activeTab = ref(props.tabs[0]?.key ?? '')

watch(
  () => props.tabs,
  (tabs) => {
    if (!tabs.some((t) => t.key === activeTab.value)) {
      activeTab.value = tabs[0]?.key ?? ''
    }
  },
  { deep: true },
)

const activeLabel = computed(
  () => props.tabs.find((t) => t.key === activeTab.value)?.label ?? '',
)
</script>

<template>
  <div class="panel-tabs">
    <div class="panel-tabs__bar" role="tablist" :aria-label="ariaLabel">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="panel-tabs__tab"
        :class="{ 'is-active': activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >
        <span class="panel-tabs__tab-text">{{ tab.label }}</span>
      </button>
    </div>

    <div
      class="panel-tabs__body"
      role="tabpanel"
      :aria-label="activeLabel"
      :style="{ minHeight: `${bodyMinHeight}px` }"
    >
      <span class="panel-tabs__corner panel-tabs__corner--tl" aria-hidden="true" />
      <span class="panel-tabs__corner panel-tabs__corner--br" aria-hidden="true" />
      <div
        class="panel-tabs__chart-frame"
        :class="{ 'is-custom': !!$slots.default }"
        :style="{ minHeight: `${bodyMinHeight}px` }"
      >
        <slot :active-tab="activeTab">
          <p class="panel-tabs__placeholder">{{ activeLabel }}</p>
          <span class="panel-tabs__placeholder-hint">图表数据待接入</span>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-tabs {
  --cyan-dim: rgba(48, 200, 255, 0.45);
  --amber: #e8a84a;

  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  height: 100%;
  color: #e8fbff;
}

.panel-tabs__bar {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  padding: 3px;
  border-radius: 5px;
  border: 1px solid rgba(48, 220, 255, 0.14);
  background: rgba(4, 12, 22, 0.65);
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.2);
}

.panel-tabs__tab {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  padding: 7px 4px 8px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: rgba(170, 210, 228, 0.72);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1.35;
  text-align: center;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.panel-tabs__tab-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-tabs__tab:hover {
  color: rgba(220, 245, 255, 0.9);
  background: rgba(48, 200, 255, 0.06);
  border-color: rgba(48, 200, 255, 0.12);
}

.panel-tabs__tab.is-active {
  color: #f0fcff;
  background: linear-gradient(
    180deg,
    rgba(92, 232, 255, 0.2) 0%,
    rgba(48, 200, 255, 0.08) 100%
  );
  border-color: rgba(48, 200, 255, 0.32);
  box-shadow:
    0 0 12px rgba(48, 200, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.panel-tabs__tab.is-active::after {
  content: '';
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 2px;
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(90deg, transparent, var(--amber) 20%, var(--amber) 80%, transparent);
  box-shadow: 0 0 6px rgba(232, 168, 74, 0.45);
}

.panel-tabs__body {
  position: relative;
  flex: 1;
  overflow: hidden;
  border-radius: 5px;
  border: 1px solid rgba(48, 220, 255, 0.12);
  background:
    linear-gradient(rgba(48, 200, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(48, 200, 255, 0.04) 1px, transparent 1px),
    radial-gradient(ellipse 80% 70% at 50% 100%, rgba(48, 200, 255, 0.06) 0%, transparent 55%),
    rgba(4, 12, 22, 0.5);
  background-size:
    16px 16px,
    16px 16px,
    auto,
    auto;
}

.panel-tabs__corner {
  position: absolute;
  width: 7px;
  height: 7px;
  pointer-events: none;
  opacity: 0.4;
}

.panel-tabs__corner--tl {
  top: 0;
  left: 0;
  border-top: 1px solid var(--cyan-dim);
  border-left: 1px solid var(--cyan-dim);
  border-radius: 5px 0 0 0;
}

.panel-tabs__corner--br {
  right: 0;
  bottom: 0;
  border-right: 1px solid rgba(48, 200, 255, 0.2);
  border-bottom: 1px solid rgba(48, 200, 255, 0.2);
  border-radius: 0 0 5px 0;
}

.panel-tabs__chart-frame {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  box-sizing: border-box;
}

.panel-tabs__chart-frame.is-custom {
  align-items: stretch;
  justify-content: stretch;
  gap: 0;
  padding: 4px 6px 6px;
}

.panel-tabs__chart-frame:not(.is-custom)::before {
  content: '';
  position: absolute;
  inset: 12px 16px 18px 24px;
  border-left: 1px solid rgba(48, 200, 255, 0.12);
  border-bottom: 1px solid rgba(48, 200, 255, 0.12);
  pointer-events: none;
  opacity: 0.6;
}

.panel-tabs__placeholder {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(200, 238, 252, 0.75);
  text-shadow: 0 0 10px rgba(48, 200, 255, 0.15);
}

.panel-tabs__placeholder-hint {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: rgba(140, 185, 205, 0.45);
}
</style>
