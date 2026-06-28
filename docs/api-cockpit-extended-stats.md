# 驾驶舱扩展统计 API 汇总

以下接口与现有「区域进出统计 / 危险事件统计」等保持一致：**统一响应外壳 + `data` 载荷 + 按日/月/年粒度**（存储状况监控除外，见独立文档）。

统一响应外壳：

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": { }
}
```

Query 公共参数（除存储快照类接口外）：

| 参数 | 类型 | 说明 |
|------|------|------|
| `granularity` | `day` \| `month` \| `year` | 统计粒度 |
| `anchor` | string | day: `YYYY-MM-DD`；month: `YYYY-MM`；year: `YYYY` |

`data` 公共字段：`granularity`、`anchor`、`periodLabel`、`periodStart`、`periodEnd`、`granularityOptions`

---

## 1. 人员进出 — 事项分布

```
GET /api/personnel-access/matter-stats
```

**items[]（固定 5 类）**

| matterId | matterName |
|----------|------------|
| work | 进厂作业 |
| visit | 参观访问 |
| maintain | 设备维护 |
| logistics | 物资运送 |
| other | 其他 |

| 字段 | 类型 | 说明 |
|------|------|------|
| `matterId` | string | 事项编码 |
| `matterName` | string | 事项名称 |
| `count` | number | 次数 |
| `percentage` | number | 占比 0–100 |

**summary**：`{ totalCount }`

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {
    "granularity": "day",
    "anchor": "2026-06-06",
    "periodLabel": "2026年6月6日",
    "periodStart": "2026-06-06",
    "periodEnd": "2026-06-06",
    "granularityOptions": [
      { "value": "day", "label": "按日统计" },
      { "value": "month", "label": "按月统计" },
      { "value": "year", "label": "按年统计" }
    ],
    "items": [
      { "matterId": "work", "matterName": "进厂作业", "count": 42, "percentage": 33.1 },
      { "matterId": "visit", "matterName": "参观访问", "count": 31, "percentage": 24.4 },
      { "matterId": "maintain", "matterName": "设备维护", "count": 22, "percentage": 17.3 },
      { "matterId": "logistics", "matterName": "物资运送", "count": 19, "percentage": 15.0 },
      { "matterId": "other", "matterName": "其他", "count": 13, "percentage": 10.2 }
    ],
    "summary": { "totalCount": 127 }
  }
}
```

---

## 2. 人员进出 — 进出时间分布

```
GET /api/personnel-access/time-stats
```

**items[]（固定 12 个时段，两小时一档）**：`00-02` … `22-24`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slotId` | string | 时段编码，如 `h08` |
| `slotLabel` | string | 展示标签，如 `08-10` |
| `enterCount` | number | 进入人次 |
| `exitCount` | number | 离开人次（≤ enterCount） |

**summary**：`{ enterTotal, exitTotal, peakSlotLabel, peakTotal }`

---

## 3. 车辆进出 — 事项分布

```
GET /api/vehicle-access/matter-stats
```

**items[]（固定 5 类）**

| matterId | matterName |
|----------|------------|
| pickup | 提货 |
| delivery | 送货 |
| repair | 维修 |
| temp | 临时访问 |
| other | 其他 |

字段同人员事项分布。

---

## 4. 车辆进出 — 进出时间分布

```
GET /api/vehicle-access/time-stats
```

字段同人员进出时间分布（12 时段双柱：进入/离开）。

---

## 5. 行车监测 — 疲劳次数统计

```
GET /api/driving-monitor/fatigue-stats
```

**items[]（固定 5 台行车）**

| craneId | craneName |
|---------|-----------|
| c1 | 1号行车 |
| c2 | 2号行车 |
| c3 | 3号行车 |
| c4 | 4号行车 |
| c5 | 5号行车 |

| 字段 | 类型 | 说明 |
|------|------|------|
| `fatigueCount` | number | 疲劳告警次数 |

**summary**：`{ totalCount, maxCraneName, maxCount }`

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {
    "granularity": "day",
    "anchor": "2026-06-06",
    "periodLabel": "2026年6月6日",
    "items": [
      { "craneId": "c1", "craneName": "1号行车", "fatigueCount": 3 },
      { "craneId": "c2", "craneName": "2号行车", "fatigueCount": 5 },
      { "craneId": "c3", "craneName": "3号行车", "fatigueCount": 2 },
      { "craneId": "c4", "craneName": "4号行车", "fatigueCount": 7 },
      { "craneId": "c5", "craneName": "5号行车", "fatigueCount": 4 }
    ],
    "summary": {
      "totalCount": 21,
      "maxCraneName": "4号行车",
      "maxCount": 7
    }
  }
}
```

---

## 6. 行车监测 — 遮挡监测

```
GET /api/driving-monitor/occlusion-stats
```

**items[]（固定 6 路摄像头）**：`cam1`～`cam6`

| 字段 | 类型 | 说明 |
|------|------|------|
| `occlusionCount` | number | 遮挡事件次数 |
| `durationMinutes` | number | 遮挡累计时长（分钟） |
| `status` | string | `normal` \| `warning` \| `critical` |

状态建议：0 次 normal；1–3 次 warning；≥4 次 critical。

**summary**：`{ totalCount, totalDurationMinutes, alertCount }`

---

## 前端对接

| Tab | API | 类型 | Mock | 图表组件 |
|-----|-----|------|------|----------|
| 人员 — 事项分布 | `/api/personnel-access/matter-stats` | `personnel-access.ts` | `personnel-access-matter-stats.ts` | `PersonnelMatterStatsChart.vue` |
| 人员 — 时间分布 | `/api/personnel-access/time-stats` | 同上 | `personnel-access-time-stats.ts` | `PersonnelTimeStatsChart.vue` |
| 车辆 — 事项分布 | `/api/vehicle-access/matter-stats` | `vehicle-access.ts` | `vehicle-access-matter-stats.ts` | `VehicleMatterStatsChart.vue` |
| 车辆 — 时间分布 | `/api/vehicle-access/time-stats` | 同上 | `vehicle-access-time-stats.ts` | `VehicleTimeStatsChart.vue` |
| 行车 — 疲劳统计 | `/api/driving-monitor/fatigue-stats` | `driving-monitor.ts` | `driving-monitor-fatigue-stats.ts` | `FatigueStatsChart.vue` |
| 行车 — 遮挡监测 | `/api/driving-monitor/occlusion-stats` | 同上 | `driving-monitor-occlusion-stats.ts` | `OcclusionStatsChart.vue` |

接入真实 API：各图表/composable 内将 `{ useMock: true }` 改为 `false` 即可。
