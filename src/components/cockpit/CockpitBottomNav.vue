<script setup lang="ts">
// 底部导航组件：接收菜单与激活态，点击后抛出事件由父组件决定跳转逻辑。
defineProps<{
  menus: readonly { label: string; url: string }[]
  activeMenu: string | null
}>()

const emit = defineEmits<{
  (e: 'menu-click', item: { label: string; url: string }): void
}>()
</script>

<template>
  <div class="cockpit-bottom-nav">
    <!-- 底部线条闪光 SVG 动画定义 -->
    <svg class="cockpit-bottom-nav__line-defs" aria-hidden="true">
      <symbol id="cockpitBottomLineSymbol" viewBox="0 0 721 57">
        <defs>
          <radialGradient id="cockpitBottomLineGrad" cx="50%" cy="50%" fx="100%" fy="50%" r="50%">
            <stop offset="0%" stop-color="#fff" stop-opacity="1" />
            <stop offset="100%" stop-color="#fff" stop-opacity="0" />
          </radialGradient>
          <mask id="cockpitBottomLineMask">
            <circle r="50" cx="0" cy="0" fill="url(#cockpitBottomLineGrad)">
              <animateMotion
                begin="0s"
                dur="3s"
                path="M1 56.6105C1 31.5123 185.586 10.0503 451.904 1.35519C458.942 1.12543 465.781 4.00883 470.505 9.22964L484.991 25.2383C487.971 28.4775 492.938 30.4201 498.254 30.4201H720.142"
                rotate="auto"
                keyPoints="0;1"
                keyTimes="0;1"
                repeatCount="indefinite"
              />
            </circle>
          </mask>
        </defs>
        <path
          class="cockpit-bottom-nav__line-glow"
          d="M1 56.6105C1 31.5123 185.586 10.0503 451.904 1.35519C458.942 1.12543 465.781 4.00883 470.505 9.22964L484.991 25.2383C487.971 28.4775 492.938 30.4201 498.254 30.4201H720.142"
          stroke="#30DCFF"
          stroke-width="2"
          mask="url(#cockpitBottomLineMask)"
        />
      </symbol>
    </svg>
    <!-- 左右两侧复用同一路径，右侧做镜像 -->
    <svg class="cockpit-bottom-nav__svg-line cockpit-bottom-nav__svg-line--left" viewBox="0 0 721 57" preserveAspectRatio="none" aria-hidden="true">
      <use href="#cockpitBottomLineSymbol" />
    </svg>
    <svg class="cockpit-bottom-nav__svg-line cockpit-bottom-nav__svg-line--right" viewBox="0 0 721 57" preserveAspectRatio="none" aria-hidden="true">
      <use href="#cockpitBottomLineSymbol" />
    </svg>
    <div class="cockpit-bottom-nav__arrow cockpit-bottom-nav__arrow--reverse" aria-hidden="true">
      <img src="@/assets/bottom-menu-arrow-big.svg" alt="" />
      <img src="@/assets/bottom-menu-arrow-small.svg" alt="" />
    </div>
    <div class="cockpit-bottom-nav__menu">
      <button
        v-for="item in menus"
        :key="item.url"
        type="button"
        class="cockpit-bottom-nav__menu-item"
        :class="{ 'is-active': activeMenu === item.label }"
        @click="emit('menu-click', item)"
      >
        <span>{{ item.label }}</span>
      </button>
    </div>
    <div class="cockpit-bottom-nav__arrow" aria-hidden="true">
      <img src="@/assets/bottom-menu-arrow-big.svg" alt="" />
      <img src="@/assets/bottom-menu-arrow-small.svg" alt="" />
    </div>
  </div>
</template>

<style scoped>
.cockpit-bottom-nav { --bottom-scale: 1.8; position: absolute; left: 50%; bottom: 0; z-index: 3; transform: translateX(-50%) scale(var(--bottom-scale)); transform-origin: center bottom; width: 1920px; height: 90px; box-sizing: border-box; padding-top: 20px; display: flex; justify-content: center; background: url('@/assets/bottom-menu-bg.png') no-repeat; background-size: contain; }
.cockpit-bottom-nav__line-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.cockpit-bottom-nav__svg-line { position: absolute; right: 50%; width: 721px; height: 57px; margin-right: -5px; bottom: -21px; pointer-events: none; }
.cockpit-bottom-nav__svg-line--right { transform: scaleX(-1); left: 50%; right: auto; margin-right: 0; margin-left: -5px; }
.cockpit-bottom-nav__line-glow { fill: none; mix-blend-mode: screen; }
.cockpit-bottom-nav__arrow { display: flex; align-items: center; height: 30px; }
.cockpit-bottom-nav__arrow--reverse { transform: scaleX(-1); }
.cockpit-bottom-nav__arrow img { animation: cockpit-arrow-1 2s ease-in-out infinite; }
.cockpit-bottom-nav__arrow img:last-child { animation: cockpit-arrow-2 2s ease-in-out infinite; }
.cockpit-bottom-nav__menu { display: flex; padding: 0 20px; }
.cockpit-bottom-nav__menu-item { width: 100px; height: 32px; border: 0; padding: 0; margin: 0; background: url('@/assets/bottom-menu-btn.png') no-repeat; background-size: 100%; font-size: 15px; letter-spacing: 1.6px; text-align: center; line-height: 30px; cursor: pointer; pointer-events: all; }
.cockpit-bottom-nav__menu-item span { display: block; width: 100px; height: 32px; font-weight: 700; background: -webkit-linear-gradient(rgba(117, 232, 255, 1), rgba(255, 255, 255, 1)); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
.cockpit-bottom-nav__menu-item:hover, .cockpit-bottom-nav__menu-item.is-active { background: url('@/assets/bottom-menu-btn-hover.png') no-repeat; background-size: 100%; }
@keyframes cockpit-arrow-1 { 0% { transform: translateX(0); } 50% { transform: translateX(100%); } 100% { transform: translateX(0); } }
@keyframes cockpit-arrow-2 { 0% { transform: translateX(0); } 50% { transform: translateX(90%); } 100% { transform: translateX(0); } }
</style>

