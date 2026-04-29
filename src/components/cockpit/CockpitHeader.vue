<script setup lang="ts">
// 顶栏组件：仅负责展示，时间与健康检测状态由父组件提供。
defineProps<{
  dateText: string
  timeText: string
  weekText: string
  /** null：首次检测前；true/false：GET /health 结果 */
  backendOnline?: boolean | null
  backendHealthHint?: string | null
}>()
</script>

<template>
  <header class="cockpit-header">
    <!-- 左上时间 -->
    <div class="cockpit-header__time">
      <span>{{ dateText }}</span>
      <span>{{ timeText }} {{ weekText }}</span>
    </div>
    <!-- 中间标题 + 两侧线条动画 -->
    <div class="cockpit-header__brand">
      <svg class="cockpit-header__line-defs" aria-hidden="true">
        <symbol id="cockpitLineSymbol" viewBox="0 0 961 79">
          <defs>
            <radialGradient id="cockpitLineGrad" cx="50%" cy="50%" fx="100%" fy="50%" r="50%">
              <stop offset="0%" stop-color="#fff" stop-opacity="1" />
              <stop offset="100%" stop-color="#fff" stop-opacity="0" />
            </radialGradient>
            <mask id="cockpitLineMask">
              <circle r="100" cx="0" cy="0" fill="url(#cockpitLineGrad)">
                <animateMotion
                  begin="0s"
                  dur="3s"
                  path="M1 1.52783L535 25.6808C552.73 26.5835 571.454 31.3851 588.834 39.2194C593.758 41.4385 598.692 43.7289 603.643 46.0273C633.567 59.9182 664.121 74.1016 696.754 74.6262C696.765 74.6264 696.775 74.6265 696.786 74.6267C821.602 76.5993 879.336 78 961 78"
                  rotate="auto"
                  keyPoints="0;1"
                  keyTimes="0;1"
                  repeatCount="indefinite"
                />
              </circle>
            </mask>
          </defs>
          <path
            class="cockpit-header__line-glow"
            d="M1 1.52783L535 25.6808C552.73 26.5835 571.454 31.3851 588.834 39.2194C593.758 41.4385 598.692 43.7289 603.643 46.0273C633.567 59.9182 664.121 74.1016 696.754 74.6262C696.765 74.6264 696.775 74.6265 696.786 74.6267C821.602 76.5993 879.336 78 961 78"
            stroke="#30DCFF"
            stroke-width="2"
            mask="url(#cockpitLineMask)"
          />
        </symbol>
      </svg>
      <svg class="cockpit-header__line cockpit-header__line--left" viewBox="0 0 961 79" preserveAspectRatio="none" aria-hidden="true">
        <use href="#cockpitLineSymbol" />
      </svg>
      <h1 class="cockpit-header__title">
        <span class="cockpit-header__title-main">厂区综合管控大屏总览</span>
        <span class="cockpit-header__title-sub">Factory Integrated Control Dashboard Overview</span>
      </h1>
      <svg
        class="cockpit-header__line cockpit-header__line--right"
        viewBox="0 0 961 79"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <use href="#cockpitLineSymbol" />
      </svg>
    </div>
    <!-- 右上操作区 -->
    <div class="cockpit-header__actions">
      <div class="cockpit-header__health">
        <span 
        class="cockpit-header__health-dot"
        :class="{
          'is-unknown': backendOnline === null,
          'is-online': backendOnline === true,
          'is-offline': backendOnline === false,
        }"
      />
      <span class="cockpit-header__health-text">
        {{ backendOnline === null ? '检测中' : backendOnline ? '服务在线' : '服务离线' }}
      </span>
    </div>
      <span class="cockpit-header__admin-placeholder">admin登录</span>
      <button class="cockpit-header__msg-btn" type="button" aria-label="消息占位">
        <img src="@/assets/icon-massage.png" alt="消息" />
      </button>
      <button class="cockpit-header__backend-btn" type="button">进入后台</button>
    </div>
  </header>
</template>

<style scoped>
.cockpit-header { position: relative; height: 90px; flex-shrink: 0; z-index: 3; }
.cockpit-header__time { position: absolute; left: 32px; top: 30px; z-index: 2; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.cockpit-header__time span { color: #c4f3fe; font-size: 14px; line-height: 1.1; }
.cockpit-header__brand { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: min(1920px, 100%); height: 90px; text-align: center; box-sizing: border-box; padding-top: 10px; background: url('@/assets/header-bg.png') no-repeat center center; background-size: 100% 100%; }
.cockpit-header__actions { position: absolute; right: 28px; top: 35px; z-index: 2; display: flex; align-items: center; gap: 18px; }
.cockpit-header__health { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(196, 243, 254, 0.9); user-select: none; }
.cockpit-header__health-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background-color: #cccccc; }
.cockpit-header__health-dot.is-online { background-color: #00ff00; }
.cockpit-header__health-dot.is-offline { background-color: #ff0000; }
.cockpit-header__health-dot.is-unknown { background-color: #cccccc; }
.cockpit-header__health-text { white-space: nowrap; }
.cockpit-header__admin-placeholder { font-size: 14px; color: #c4f3fe; }
.cockpit-header__msg-btn { width: 30px; height: 30px; border: 1px solid rgba(48, 220, 255, 0.35); border-radius: 50%; background: rgba(48, 220, 255, 0.08); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
.cockpit-header__msg-btn img { width: 15px; height: 15px; object-fit: contain; }
.cockpit-header__backend-btn { height: 30px; padding: 0 12px; border: 1px solid rgba(48, 220, 255, 0.45); border-radius: 4px; background: rgba(48, 220, 255, 0.12); color: #b7f4ff; font-size: 13px; cursor: pointer; }
.cockpit-header__line { position: absolute; top: 11px; width: 961px; height: 79px; pointer-events: none; }
.cockpit-header__line--left { right: 50%; margin-right: 14px; }
.cockpit-header__line--right { left: 50%; margin-left: -14px; transform: scaleX(-1); }
.cockpit-header__line-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.cockpit-header__line-glow { fill: none; mix-blend-mode: screen; filter: drop-shadow(0 0 6px rgba(118, 232, 255, 0.8)); }
.cockpit-header__title { position: relative; z-index: 1; margin: 0; text-align: center; line-height: 1.1; }
.cockpit-header__title-main { display: block; font-size: 44px; font-weight: 700; letter-spacing: 1px; background: -webkit-linear-gradient(rgba(117, 232, 255, 1), rgba(255, 255, 255, 1)); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
.cockpit-header__title-sub { display: block; margin-top: 6px; font-size: 12px; letter-spacing: 3px; font-weight: 300; color: rgba(196, 243, 254, 0.64); }
</style>

