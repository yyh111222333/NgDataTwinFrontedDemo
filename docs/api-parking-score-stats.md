# 行车监测 — 停车评分统计 API

用于大屏「行车监测概况 → 停车评分统计」Tab，饼图展示各评分档位占比，支持 **按日 / 按月 / 按年** 切换。

## 请求

```
GET /api/driving-monitor/parking-score-stats
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
GET /api/driving-monitor/parking-score-stats?granularity=day&anchor=2026-05-29
GET /api/driving-monitor/parking-score-stats?granularity=month&anchor=2026-05
GET /api/driving-monitor/parking-score-stats?granularity=year&anchor=2026
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
| `items` | array | **固定 5 档**评分分布 |
| `summary` | object | 汇总 |

### items[] 元素（固定顺序）

| 字段 | 类型 | 说明 |
|------|------|------|
| `gradeId` | string | 档位编码：`excellent` `good` `pass` `warning` `fail` |
| `gradeName` | string | 档位名称，如 `优秀(≥90分)` |
| `count` | number | 该档位停车记录数 |
| `percentage` | number | 占比（0–100，建议保留一位小数） |

### 档位定义

| gradeId | gradeName | 分数区间 |
|---------|-----------|----------|
| `excellent` | 优秀(≥90分) | ≥ 90 |
| `good` | 良好(80-89分) | 80 – 89 |
| `pass` | 合格(70-79分) | 70 – 79 |
| `warning` | 预警(60-69分) | 60 – 69 |
| `fail` | 不合格(<60分) | < 60 |

### summary

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalCount` | number | 统计周期内停车记录总数 |
| `averageScore` | number | 加权平均分（0–100） |

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
      { "gradeId": "excellent", "gradeName": "优秀(≥90分)", "count": 31, "percentage": 31.6 },
      { "gradeId": "good", "gradeName": "良好(80-89分)", "count": 28, "percentage": 28.6 },
      { "gradeId": "pass", "gradeName": "合格(70-79分)", "count": 22, "percentage": 22.4 },
      { "gradeId": "warning", "gradeName": "预警(60-69分)", "count": 12, "percentage": 12.2 },
      { "gradeId": "fail", "gradeName": "不合格(<60分)", "count": 5, "percentage": 5.1 }
    ],
    "summary": {
      "totalCount": 98,
      "averageScore": 82.4
    }
  }
}
```

## 前端对接

- 类型：`src/types/driving-monitor.ts`
- Mock：`src/mocks/driving-monitor-parking-score-stats.ts`
- 客户端：`src/api/driving-monitor.ts`（`useMock: true` 时走本地 Mock）
- 图表：`src/components/cockpit/ParkingScoreStatsChart.vue`

接入真实 API 后，将图表内 `getParkingScoreStats(..., { useMock: false })` 即可。
