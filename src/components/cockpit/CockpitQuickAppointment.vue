<!-- 进场快捷预约：静态样式，与看板统一，无业务逻辑。 -->
<script setup lang="ts">
type FieldItem = { key: string; label: string }

const personFields: FieldItem[] = [
  { key: 'name', label: '姓名' },
  { key: 'phone', label: '电话' },
  { key: 'reason', label: '进厂事由' },
  { key: 'time', label: '许可时间' },
]

const vehicleFields: FieldItem[] = [
  { key: 'name', label: '姓名' },
  { key: 'phone', label: '电话' },
  { key: 'plate', label: '车牌号' },
  { key: 'reason', label: '进厂事由' },
  { key: 'time', label: '许可时间' },
]
</script>

<template>
  <div class="quick-appt">
    <div class="quick-appt__forms">
      <section class="quick-appt__panel">
        <header class="quick-appt__panel-head">
          <span class="quick-appt__panel-accent" aria-hidden="true" />
          <h4 class="quick-appt__panel-title">人员进厂预约</h4>
        </header>
        <div class="quick-appt__panel-body">
          <div v-for="field in personFields" :key="field.key" class="quick-appt__field">
            <div class="quick-appt__field-label-row">
              <span class="quick-appt__field-icon" aria-hidden="true">
                <svg v-if="field.key === 'name'" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M5 20c1.5-4 13.5-4 14 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
                <svg v-else-if="field.key === 'phone'" viewBox="0 0 24 24">
                  <path
                    d="M6 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l5 2v4c0 1-1 2-2 2A14 14 0 0 1 4 6c0-1 1-2 2-2z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linejoin="round"
                  />
                </svg>
                <svg v-else-if="field.key === 'reason'" viewBox="0 0 24 24">
                  <path d="M7 4h10v16H7z" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
                <svg v-else viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              </span>
              <span class="quick-appt__field-label">{{ field.label }}</span>
            </div>
            <div class="quick-appt__field-input" />
          </div>
          <button type="button" class="quick-appt__btn quick-appt__btn--primary">提交</button>
        </div>
      </section>

      <section class="quick-appt__panel">
        <header class="quick-appt__panel-head">
          <span class="quick-appt__panel-accent" aria-hidden="true" />
          <h4 class="quick-appt__panel-title">车辆进厂预约</h4>
        </header>
        <div class="quick-appt__panel-body">
          <div v-for="field in vehicleFields" :key="field.key" class="quick-appt__field">
            <div class="quick-appt__field-label-row">
              <span class="quick-appt__field-icon" aria-hidden="true">
                <svg v-if="field.key === 'name'" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M5 20c1.5-4 13.5-4 14 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
                <svg v-else-if="field.key === 'phone'" viewBox="0 0 24 24">
                  <path
                    d="M6 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l5 2v4c0 1-1 2-2 2A14 14 0 0 1 4 6c0-1 1-2 2-2z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linejoin="round"
                  />
                </svg>
                <svg v-else-if="field.key === 'plate'" viewBox="0 0 24 24">
                  <path d="M4 10h16v6H4z" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M7 13h3M14 13h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
                <svg v-else-if="field.key === 'reason'" viewBox="0 0 24 24">
                  <path d="M7 4h10v16H7z" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
                <svg v-else viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              </span>
              <span class="quick-appt__field-label">{{ field.label }}</span>
            </div>
            <div class="quick-appt__field-input" />
          </div>
          <button type="button" class="quick-appt__btn quick-appt__btn--primary">提交</button>
        </div>
      </section>
    </div>

    <button type="button" class="quick-appt__btn quick-appt__btn--block">许可批量导入</button>
  </div>
</template>

<style scoped>
.quick-appt {
  --panel-border: rgba(48, 220, 255, 0.38);
  --panel-cyan: #8cefff;

  display: flex;
  flex-direction: column;
  gap: 5px;
  height: auto;
  padding-bottom: 2px;
  box-sizing: border-box;
  color: #e8fbff;
}

.quick-appt__forms {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.quick-appt__panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-radius: 5px;
  border: 1px solid rgba(48, 220, 255, 0.12);
  background: rgba(5, 13, 24, 0.4);
  overflow: hidden;
}

.quick-appt__panel-head {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(48, 220, 255, 0.08);
  background: linear-gradient(
    90deg,
    rgba(92, 232, 255, 0.24) 0%,
    rgba(48, 220, 255, 0.12) 30%,
    rgba(20, 55, 82, 0.1) 58%,
    rgba(5, 13, 24, 0.03) 100%
  );
}

.quick-appt__panel-accent {
  width: 3px;
  height: 11px;
  border-radius: 2px;
  background: rgba(92, 232, 255, 0.5);
  flex-shrink: 0;
}

.quick-appt__panel-title {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: rgba(220, 245, 255, 0.9);
}

.quick-appt__panel-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 5px 6px 6px;
}

.quick-appt__field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-appt__field-label-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.quick-appt__field-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--panel-cyan);
  flex-shrink: 0;
}

.quick-appt__field-icon svg {
  width: 12px;
  height: 12px;
}

.quick-appt__field-label {
  font-size: 11px;
  color: rgba(220, 245, 255, 0.85);
}

.quick-appt__field-input {
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(48, 220, 255, 0.12);
  background: rgba(3, 10, 20, 0.45);
}

.quick-appt__field:hover .quick-appt__field-input {
  border-color: rgba(92, 232, 255, 0.22);
}

.quick-appt__btn {
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: default;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.quick-appt__btn--primary {
  margin-top: 2px;
  height: 24px;
  border: 1px solid rgba(48, 220, 255, 0.18);
  background: rgba(8, 28, 48, 0.65);
  color: rgba(220, 245, 255, 0.92);
}

.quick-appt__btn--primary:hover {
  border-color: rgba(92, 232, 255, 0.28);
  background: rgba(12, 36, 58, 0.75);
}

.quick-appt__btn--block {
  flex-shrink: 0;
  height: 26px;
  border: 1px solid rgba(48, 220, 255, 0.18);
  background: rgba(8, 28, 48, 0.65);
  color: rgba(220, 245, 255, 0.92);
}

.quick-appt__btn--block:hover {
  border-color: rgba(92, 232, 255, 0.28);
  background: rgba(12, 36, 58, 0.75);
}
</style>
