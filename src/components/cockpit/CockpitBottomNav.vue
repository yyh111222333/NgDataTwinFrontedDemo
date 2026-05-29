<!-- 底部导航：玻璃质感科技风，四个子系统入口。 -->
<script setup lang="ts">
defineProps<{
  menus: readonly { label: string; url: string }[]
  activeMenu: string | null
}>()

const emit = defineEmits<{
  (e: 'menu-click', item: { label: string; url: string }): void
}>()
</script>

<template>
  <nav class="cockpit-bottom-nav" aria-label="子系统入口">
    <div class="cockpit-bottom-nav__shell">
      <span class="cockpit-bottom-nav__shell-glow" aria-hidden="true" />
      <span class="cockpit-bottom-nav__shell-line" aria-hidden="true" />
      <div class="cockpit-bottom-nav__rail">
        <button
          v-for="item in menus"
          :key="item.label"
          type="button"
          class="cockpit-bottom-nav__item"
          :class="{ 'is-active': activeMenu === item.label }"
          @click="emit('menu-click', item)"
        >
          <span class="cockpit-bottom-nav__item-glass" aria-hidden="true" />
          <span class="cockpit-bottom-nav__item-shine" aria-hidden="true" />
          <span class="cockpit-bottom-nav__item-edge" aria-hidden="true" />
          <span class="cockpit-bottom-nav__item-label">{{ item.label }}</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.cockpit-bottom-nav {
  width: 100%;
  box-sizing: border-box;
}

.cockpit-bottom-nav__shell {
  position: relative;
  margin: 0 4px 18px;
  padding: 10px 12px;
  border-radius: 18px;
  background: linear-gradient(
    165deg,
    rgba(18, 42, 68, 0.42) 0%,
    rgba(6, 14, 28, 0.58) 48%,
    rgba(4, 10, 22, 0.72) 100%
  );
  border: 1px solid rgba(120, 210, 255, 0.22);
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(22px) saturate(1.45);
  -webkit-backdrop-filter: blur(22px) saturate(1.45);
}

.cockpit-bottom-nav__shell-glow {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: -8px;
  height: 40px;
  background: radial-gradient(ellipse at center, rgba(48, 180, 255, 0.22) 0%, transparent 72%);
  filter: blur(10px);
  pointer-events: none;
}

.cockpit-bottom-nav__shell-line {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(160, 235, 255, 0.85), transparent);
  pointer-events: none;
}

.cockpit-bottom-nav__rail {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.cockpit-bottom-nav__item {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.28s ease;
}

.cockpit-bottom-nav__item-glass {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    155deg,
    rgba(255, 255, 255, 0.14) 0%,
    rgba(72, 140, 190, 0.08) 38%,
    rgba(8, 20, 36, 0.55) 100%
  );
  border: 1px solid rgba(130, 210, 255, 0.2);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -8px 16px rgba(0, 0, 0, 0.22),
    0 4px 14px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(14px) saturate(1.35);
  -webkit-backdrop-filter: blur(14px) saturate(1.35);
  transition:
    background 0.28s ease,
    border-color 0.28s ease,
    box-shadow 0.28s ease;
  pointer-events: none;
}

.cockpit-bottom-nav__item-shine {
  position: absolute;
  top: 1px;
  left: 12%;
  right: 12%;
  height: 42%;
  border-radius: 10px 10px 50% 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, transparent 100%);
  opacity: 0.55;
  pointer-events: none;
  transition: opacity 0.28s ease;
}

.cockpit-bottom-nav__item-edge {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(92, 232, 255, 0.35), transparent);
  opacity: 0;
  transition: opacity 0.28s ease;
  pointer-events: none;
}

.cockpit-bottom-nav__item-label {
  position: relative;
  z-index: 1;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(196, 232, 248, 0.88);
  text-shadow: 0 0 12px rgba(48, 160, 220, 0.15);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    color 0.28s ease,
    text-shadow 0.28s ease;
}

.cockpit-bottom-nav__item:hover {
  transform: translateY(-2px);
}

.cockpit-bottom-nav__item:hover .cockpit-bottom-nav__item-glass {
  background: linear-gradient(
    155deg,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(64, 150, 210, 0.16) 42%,
    rgba(10, 28, 48, 0.5) 100%
  );
  border-color: rgba(150, 225, 255, 0.38);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.26),
    inset 0 -6px 14px rgba(0, 0, 0, 0.2),
    0 8px 22px rgba(24, 120, 180, 0.22);
}

.cockpit-bottom-nav__item:hover .cockpit-bottom-nav__item-shine {
  opacity: 0.75;
}

.cockpit-bottom-nav__item:hover .cockpit-bottom-nav__item-edge {
  opacity: 0.65;
}

.cockpit-bottom-nav__item:hover .cockpit-bottom-nav__item-label {
  color: rgba(245, 252, 255, 0.98);
  text-shadow: 0 0 18px rgba(92, 232, 255, 0.35);
}

.cockpit-bottom-nav__item.is-active {
  transform: translateY(-1px);
}

.cockpit-bottom-nav__item.is-active .cockpit-bottom-nav__item-glass {
  background: linear-gradient(
    155deg,
    rgba(120, 210, 255, 0.28) 0%,
    rgba(48, 120, 170, 0.22) 35%,
    rgba(12, 36, 58, 0.62) 100%
  );
  border-color: rgba(160, 235, 255, 0.52);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.32),
    inset 0 0 24px rgba(64, 180, 240, 0.14),
    0 0 20px rgba(48, 180, 255, 0.2),
    0 6px 24px rgba(0, 0, 0, 0.28);
}

.cockpit-bottom-nav__item.is-active .cockpit-bottom-nav__item-shine {
  opacity: 0.9;
}

.cockpit-bottom-nav__item.is-active::before {
  content: '';
  position: absolute;
  top: 5px;
  left: 14%;
  right: 14%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, #b8f0ff, transparent);
  box-shadow: 0 0 10px rgba(140, 230, 255, 0.65);
  pointer-events: none;
}

.cockpit-bottom-nav__item.is-active .cockpit-bottom-nav__item-edge {
  opacity: 1;
  background: linear-gradient(90deg, transparent, #7ee8ff, transparent);
  box-shadow: 0 0 12px rgba(92, 232, 255, 0.55);
}

.cockpit-bottom-nav__item.is-active .cockpit-bottom-nav__item-label {
  color: #fff;
  font-weight: 700;
  text-shadow: 0 0 20px rgba(120, 230, 255, 0.45);
}

@media (max-width: 1600px) {
  .cockpit-bottom-nav__item {
    height: 62px;
  }

  .cockpit-bottom-nav__item-label {
    font-size: 17px;
    letter-spacing: 0.05em;
  }

  .cockpit-bottom-nav__rail {
    gap: 8px;
  }
}
</style>
