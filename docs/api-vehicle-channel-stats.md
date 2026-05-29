# 车辆进出 — 通道进出统计 API

用于大屏「车辆进出概况 → 通道进出统计」Tab，与人员区域进出统计逻辑一致。

## 请求

```
GET /api/vehicle-access/channel-stats
```

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `granularity` | `day` \| `month` \| `year` | 是 | 统计粒度 |
| `anchor` | string | 是 | day: `YYYY-MM-DD`；month: `YYYY-MM`；year: `YYYY` |

## 响应 data

固定 **6 个通道**（顺序）：六号门、七号门、八号门、九号门、十号门、十一号门。

| 字段 | 说明 |
|------|------|
| `items[].channelId` | `6`～`11` |
| `items[].channelName` | 六号门～十一号门 |
| `items[].enterCount` | 进入车次/辆次 |
| `items[].exitCount` | 离开车次/辆次 |
| `summary` | 全通道合计 |

**展示约定**：按日/月/年各一张图，横轴为 6 个通道，不是时间序列。

## 示例

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
      { "channelId": "6", "channelName": "六号门", "enterCount": 52, "exitCount": 48 },
      { "channelId": "7", "channelName": "七号门", "enterCount": 61, "exitCount": 55 },
      { "channelId": "8", "channelName": "八号门", "enterCount": 58, "exitCount": 54 },
      { "channelId": "9", "channelName": "九号门", "enterCount": 47, "exitCount": 50 },
      { "channelId": "10", "channelName": "十号门", "enterCount": 44, "exitCount": 42 },
      { "channelId": "11", "channelName": "十一号门", "enterCount": 39, "exitCount": 41 }
    ],
    "summary": {
      "enterTotal": 301,
      "exitTotal": 290,
      "netIn": 11
    }
  }
}
```

## 前端 Mock

```ts
import { getVehicleChannelStats } from '@/api/vehicle-access'

await getVehicleChannelStats({ granularity: 'day', anchor: '2026-05-29' }, { useMock: true })
```

类型：`src/types/vehicle-access.ts`
