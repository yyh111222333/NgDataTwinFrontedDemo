<!-- 通用看板卡片：提供统一标题与外框样式。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    dim?: boolean
    hideTitle?: boolean
    flex?: number
    variant?: 'default' | 'overview'
    compact?: boolean
  }>(),
  {
    dim: false,
    hideTitle: false,
    flex: 1,
    variant: 'default',
    compact: false,
  },
)
</script>

<template>
  <section
    class="cockpit-panel-card"
    :class="{
      'is-dim': dim,
      'is-title-hidden': hideTitle,
      'is-overview': variant === 'overview',
      'is-compact': compact,
    }"
    :style="{ flex: `${flex} 1 0` }"
  >
    <header v-if="!hideTitle" class="cockpit-panel-card__header">
      <span class="cockpit-panel-card__accent" aria-hidden="true" />
      <span v-if="variant === 'overview'" class="cockpit-panel-card__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" stroke-width="1.2" />
          <path d="M4 10V8.5L6 7l2 2 3-3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <h3 class="cockpit-panel-card__title">{{ title }}</h3>
    </header>
    <div class="cockpit-panel-card__body">
      <slot />
    </div>
    <span class="cockpit-panel-card__corner cockpit-panel-card__corner--tl" aria-hidden="true" />
    <span class="cockpit-panel-card__corner cockpit-panel-card__corner--br" aria-hidden="true" />
  </section>
</template>

<style scoped>
.cockpit-panel-card {
  --panel-border: rgba(48, 220, 255, 0.14);

  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  border-radius: 6px;
  border: 1px solid var(--panel-border);
  background: rgba(5, 13, 24, 0.52);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  overflow: hidden;
}

.cockpit-panel-card.is-dim {
  opacity: 0.92;
}

.cockpit-panel-card.is-title-hidden {
  padding-top: 0;
}

.cockpit-panel-card.is-title-hidden .cockpit-panel-card__body {
  padding-top: 12px;
}

.cockpit-panel-card__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px 8px;
  border-bottom: 1px solid rgba(48, 220, 255, 0.1);
  background: linear-gradient(
    90deg,
    rgba(92, 232, 255, 0.28) 0%,
    rgba(48, 220, 255, 0.14) 28%,
    rgba(20, 55, 82, 0.12) 55%,
    rgba(5, 13, 24, 0.04) 100%
  );
}

.cockpit-panel-card__accent {
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: rgba(92, 232, 255, 0.55);
  flex-shrink: 0;
}

.cockpit-panel-card__title {
  margin: 0;
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: rgba(220, 245, 255, 0.92);
}

.cockpit-panel-card__body {
  flex: 1;
  min-height: 0;
  padding: 10px 12px 12px;
  overflow: hidden;
}

.cockpit-panel-card__corner {
  position: absolute;
  width: 8px;
  height: 8px;
  pointer-events: none;
  opacity: 0.35;
}

.cockpit-panel-card__corner--tl {
  top: 0;
  left: 0;
  border-top: 1px solid rgba(92, 232, 255, 0.35);
  border-left: 1px solid rgba(92, 232, 255, 0.35);
  border-radius: 6px 0 0 0;
}

.cockpit-panel-card__corner--br {
  right: 0;
  bottom: 0;
  border-right: 1px solid rgba(92, 232, 255, 0.2);
  border-bottom: 1px solid rgba(92, 232, 255, 0.2);
  border-radius: 0 0 6px 0;
}

.cockpit-panel-card.is-compact {
  flex: 0 0 auto !important;
  min-height: 0;
}

.cockpit-panel-card.is-compact .cockpit-panel-card__header {
  padding: 7px 10px 6px;
}

.cockpit-panel-card.is-compact .cockpit-panel-card__body {
  flex: 0 1 auto;
  min-height: 0;
  padding: 6px 8px 8px;
  overflow: visible;
}

.cockpit-panel-card.is-overview {
  --panel-border: rgba(48, 220, 255, 0.22);
  flex: 0 0 auto !important;
  border-color: var(--panel-border);
  background: linear-gradient(165deg, rgba(8, 22, 40, 0.72) 0%, rgba(4, 12, 24, 0.58) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.03),
    0 0 20px rgba(48, 200, 255, 0.06);
}

.cockpit-panel-card.is-overview .cockpit-panel-card__header {
  padding: 9px 12px 8px;
  border-bottom-color: rgba(48, 220, 255, 0.14);
  background: linear-gradient(
    90deg,
    rgba(92, 232, 255, 0.32) 0%,
    rgba(48, 220, 255, 0.16) 24%,
    rgba(18, 48, 72, 0.1) 50%,
    rgba(5, 13, 24, 0.02) 100%
  );
}

.cockpit-panel-card.is-overview .cockpit-panel-card__accent {
  width: 4px;
  height: 14px;
  background: linear-gradient(180deg, #8ef4ff 0%, rgba(48, 200, 255, 0.5) 100%);
  box-shadow: 0 0 8px rgba(92, 232, 255, 0.4);
}

.cockpit-panel-card.is-overview .cockpit-panel-card__title {
  font-size: 15px;
  letter-spacing: 0.06em;
  text-shadow: 0 0 12px rgba(48, 200, 255, 0.15);
}

.cockpit-panel-card.is-overview .cockpit-panel-card__body {
  flex: 0 1 auto;
  padding: 4px 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background:
    radial-gradient(ellipse 90% 80% at 50% 100%, rgba(48, 200, 255, 0.08) 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 50% 40%, rgba(20, 60, 95, 0.15) 0%, transparent 70%);
}

.cockpit-panel-card.is-overview .cockpit-panel-card__corner {
  opacity: 0.55;
}

.cockpit-panel-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: rgba(180, 240, 255, 0.9);
  flex-shrink: 0;
}

.cockpit-panel-card__icon svg {
  width: 16px;
  height: 16px;
}

</style>
