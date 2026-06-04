<!-- 顶栏组件：展示 Logo、标题、右侧时间与天气/服务状态。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    dateText: string
    timeText: string
    weekText: string
    weatherText?: string
    /** null：首次检测前；true/false：GET /health 结果 */
    backendOnline?: boolean | null
    backendHealthHint?: string | null
  }>(),
  {
    weatherText: '多云 22°C',
  },
)
</script>

<template>
  <header class="cockpit-header">
    <div class="cockpit-header__logo">
      <img
        class="cockpit-header__logo-img"
        src="@/assets/nanjing-steel-logo.png"
        alt="南京钢铁集团有限公司"
      />
      <p class="cockpit-header__logo-sub">
        <span class="cockpit-header__logo-sub-text">板材事业部中厚板卷厂</span>
      </p>
    </div>

    <div class="cockpit-header__brand">
      <span class="cockpit-header__brand-bg" aria-hidden="true" />
      <span class="cockpit-header__brand-glow" aria-hidden="true" />

      <h1 class="cockpit-header__title">
        <span class="cockpit-header__title-main">中厚板卷厂成品库数字化监控平台</span>
      </h1>
    </div>

    <div class="cockpit-header__right">
      <div class="cockpit-header__clock">
        <div class="cockpit-header__clock-time">{{ timeText }}</div>
        <div class="cockpit-header__clock-date">{{ dateText }} {{ weekText }}</div>
      </div>
      <div class="cockpit-header__meta">
        <div class="cockpit-header__weather">
          <svg class="cockpit-header__weather-icon" viewBox="0 0 48 32" aria-hidden="true">
            <circle cx="14" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2" />
            <path
              d="M6 22h30a8 8 0 0 0 0-16 10 10 0 0 0-19.2 3.2A7 7 0 0 0 6 22z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </svg>
          <span>{{ weatherText }}</span>
        </div>
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
      </div>
    </div>
  </header>
</template>

<style scoped>
.cockpit-header {
  position: relative;
  height: 96px;
  flex-shrink: 0;
  /* 高于 cockpit__main，避免放大后的底图下垂部分被侧栏/主区遮住 */
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-sizing: border-box;
  overflow: visible;
}

.cockpit-header__logo {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  max-width: 380px;
}

.cockpit-header__logo-img {
  display: block;
  height: 36px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  object-position: left center;
}

.cockpit-header__logo-sub {
  margin: 0;
  padding: 0 4px;
  text-align: center;
  line-height: 1.2;
}

.cockpit-header__logo-sub-text {
  display: inline-block;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Source Han Sans SC', 'Helvetica Neue', Arial, sans-serif;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.8px;
  background: linear-gradient(180deg, #e4eaef 0%, #aab4be 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.cockpit-header__brand {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  width: min(1920px, 100%);
  height: 90px;
  z-index: 1;
  box-sizing: border-box;
  pointer-events: none;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 8px;
}

.cockpit-header__brand-bg {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  width: 100%;
  /* 独立绘制区：135% 高度 + 顶部锚点，避免在 90px 内被裁切 */
  height: calc(90px * 1.35);
  background: url('@/assets/header-bg.png') no-repeat center top;
  background-size: auto 100%;
  pointer-events: none;
}

.cockpit-header__brand-glow {
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: min(900px, 70%);
  height: 28px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center, rgba(48, 200, 255, 0.35) 0%, transparent 72%);
  pointer-events: none;
  filter: blur(4px);
}

.cockpit-header__title {
  position: relative;
  z-index: 1;
  margin: 0;
  padding-top: 14px;
  flex-shrink: 0;
  text-align: center;
  line-height: 1.1;
}

.cockpit-header__title-main {
  display: block;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: 4px;
  white-space: nowrap;
  background: linear-gradient(180deg, #e8fcff 0%, #ffffff 42%, #9ae8ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 16px rgba(72, 220, 255, 0.3));
}

.cockpit-header__right {
  position: relative;
  display: flex;
  align-items: center;
  gap: 28px;
  z-index: 2;
  flex-shrink: 0;
  margin-left: auto;
}

.cockpit-header__clock {
  text-align: right;
}

.cockpit-header__clock-time {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 1px;
  color: #5ce8ff;
  font-variant-numeric: tabular-nums;
}

.cockpit-header__clock-date {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(232, 251, 255, 0.9);
  line-height: 1.2;
  white-space: nowrap;
}

.cockpit-header__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.cockpit-header__weather {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(232, 251, 255, 0.95);
  white-space: nowrap;
}

.cockpit-header__weather-icon {
  width: 40px;
  height: 26px;
  color: #8cefff;
  flex-shrink: 0;
}

.cockpit-header__health {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(196, 243, 254, 0.9);
  user-select: none;
}

.cockpit-header__health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: #cccccc;
}

.cockpit-header__health-dot.is-online {
  background-color: #00ff00;
}

.cockpit-header__health-dot.is-offline {
  background-color: #ff0000;
}

.cockpit-header__health-dot.is-unknown {
  background-color: #cccccc;
}

.cockpit-header__health-text {
  white-space: nowrap;
}

@media (max-width: 1600px) {
  .cockpit-header__title-main {
    font-size: 34px;
    letter-spacing: 2px;
  }

  .cockpit-header__title {
    padding-top: 12px;
  }
}
</style>
