# 智慧监控 — 危险事件统计 API

用于大屏「智慧监控概况 → 危险事件统计」Tab，饼图展示各事件类型占比，支持 **按日 / 按月 / 按年** 切换。

## 请求

```
GET /api/smart-monitor/danger-event-stats
```

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `granularity` | `day` \| `month` \| `year` | 是 | 统计粒度 |
| `anchor` | string | 是 | 统计锚点，格式随粒度变化 |

### anchor 格式

| granularity | anchor 示例 | 含义 |
|-------------|-------------|------|
| `day` | `2026-05-29` | 统计该自然日 |
| `month` | `2026-05` | 统计该自然月 |
| `year` | `2026` | 统计该自然年 |

### 请求示例

```http
GET /api/smart-monitor/danger-event-stats?granularity=day&anchor=2026-05-29
GET /api/smart-monitor/danger-event-stats?granularity=month&anchor=2026-05
GET /api/smart-monitor/danger-event-stats?granularity=year&anchor=2026
```

## 响应

统一外壳（与现有大屏接口一致）：

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": { }
}
```

### data 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `granularity` | string | 当前粒度，回显请求值 |
| `anchor` | string | 当前锚点，回显请求值 |
| `periodLabel` | string | 展示文案，如 `2026年5月29日` |
| `periodStart` | string | 统计区间起 `YYYY-MM-DD`（含） |
| `periodEnd` | string | 统计区间止 `YYYY-MM-DD`（含） |
| `granularityOptions` | array | 粒度选项（按日/月/年） |
| `items` | array | **固定 6 类**事件分布 |
| `summary` | object | 汇总 |

### items[] 元素（固定顺序）

| 字段 | 类型 | 说明 |
|------|------|------|
| `eventId` | string | 事件编码：`A` `B` `C` `D` `E` `F` |
| `eventName` | string | 事件名称，如 `事件A` |
| `count` | number | 该类型事件发生次数 |
| `percentage` | number | 占比（0–100，建议保留一位小数） |

### 事件类型

| eventId | eventName | 风险等级（建议） |
|---------|-----------|------------------|
| `A` | 事件A | 一般 |
| `B` | 事件B | 一般 |
| `C` | 事件C | 一般 |
| `D` | 事件D | 中等 |
| `E` | 事件E | 高 |
| `F` | 事件F | 高 |

### summary

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalCount` | number | 统计周期内危险事件总数 |
| `highRiskCount` | number | 高风险事件数（事件 E + F 合计） |

## 响应示例（按日）

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {
    "granularity": "day",
    "anchor": "2026-05-29",
    "periodLabel": "2026年5月29日",
    "periodStart": "2026-05-29",
    "periodEnd": "2026-05-29",
    "granularityOptions": [
      { "value": "day", "label": "按日统计" },
      { "value": "month", "label": "按月统计" },
      { "value": "year", "label": "按年统计" }
    ],
    "items": [
      { "eventId": "A", "eventName": "事件A", "count": 17, "percentage": 17.9 },
      { "eventId": "B", "eventName": "事件B", "count": 21, "percentage": 22.1 },
      { "eventId": "C", "eventName": "事件C", "count": 19, "percentage": 20.0 },
      { "eventId": "D", "eventName": "事件D", "count": 15, "percentage": 15.8 },
      { "eventId": "E", "eventName": "事件E", "count": 13, "percentage": 13.7 },
      { "eventId": "F", "eventName": "事件F", "count": 10, "percentage": 10.5 }
    ],
    "summary": {
      "totalCount": 95,
      "highRiskCount": 23
    }
  }
}
```

## 前端对接

- 类型：`src/types/smart-monitor.ts`
- Mock：`src/mocks/smart-monitor-danger-event-stats.ts`
- 客户端：`src/api/smart-monitor.ts`（`useMock: true` 时走本地 Mock）
- 图表：`src/components/cockpit/DangerEventStatsChart.vue`

接入真实 API 后，将图表内 `getDangerEventStats(..., { useMock: false })` 即可。
