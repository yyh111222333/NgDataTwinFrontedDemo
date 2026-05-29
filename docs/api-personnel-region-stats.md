# 人员进出 — 区域进出统计 API

用于大屏「人员进出概况 → 区域进出统计」Tab，支持 **按日 / 按月 / 按年** 切换。

## 请求

```
GET /api/personnel-access/region-stats
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
GET /api/personnel-access/region-stats?granularity=day&anchor=2026-05-29
GET /api/personnel-access/region-stats?granularity=month&anchor=2026-05
GET /api/personnel-access/region-stats?granularity=year&anchor=2026
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
| `granularityOptions` | array | 前端可渲染的粒度选项（按日/月/年） |
| `items` | array | **固定 7 区**，顺序：A区、F区、E区、D区、H区、K区、J区 |
| `summary` | object | 全厂合计 |

### items[] 元素

| 字段 | 类型 | 说明 |
|------|------|------|
| `regionId` | string | 区域编码：`A` `F` `E` `D` `H` `K` `J` |
| `regionName` | string | 区域名称：`A区` … `J区` |
| `enterCount` | number | 进入人次 |
| `exitCount` | number | 离开人次 |

### summary

| 字段 | 类型 | 说明 |
|------|------|------|
| `enterTotal` | number | 进入合计 |
| `exitTotal` | number | 离开合计 |
| `netIn` | number | 净进入 `enterTotal - exitTotal` |

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
      { "regionId": "A", "regionName": "A区", "enterCount": 86, "exitCount": 79 },
      { "regionId": "F", "regionName": "F区", "enterCount": 102, "exitCount": 95 },
      { "regionId": "E", "regionName": "E区", "enterCount": 118, "exitCount": 110 },
      { "regionId": "D", "regionName": "D区", "enterCount": 94, "exitCount": 88 },
      { "regionId": "H", "regionName": "H区", "enterCount": 76, "exitCount": 82 },
      { "regionId": "K", "regionName": "K区", "enterCount": 65, "exitCount": 71 },
      { "regionId": "J", "regionName": "J区", "enterCount": 58, "exitCount": 54 }
    ],
    "summary": {
      "enterTotal": 599,
      "exitTotal": 579,
      "netIn": 20
    }
  }
}
```

按月、按年结构相同，仅 `granularity`、`anchor`、`periodLabel`、`periodStart`、`periodEnd` 与 `items` 中数值（汇总尺度更大）不同。

## 前端本地 Mock

未接后端时可在前端直接生成测试数据：

```ts
import { buildPersonnelRegionStatsMock } from '@/mocks/personnel-access-region-stats'

const dayData = buildPersonnelRegionStatsMock('day', '2026-05-29')
const monthData = buildPersonnelRegionStatsMock('month', '2026-05')
const yearData = buildPersonnelRegionStatsMock('year', '2026')
```

或走 API 封装并开启 mock：

```ts
import { getPersonnelRegionStats } from '@/api/personnel-access'

const data = await getPersonnelRegionStats(
  { granularity: 'month', anchor: '2026-05' },
  { useMock: true },
)
```

类型定义见：`src/types/personnel-access.ts`。
