# 智慧监控 — 存储状况监控 API

用于大屏「智慧监控概况 → 存储状况监控」Tab，横向柱状图展示各存储节点容量使用率（**实时快照**，无按日/月/年切换）。

## 请求

```
GET /api/smart-monitor/storage-status
```

无 Query 参数。

### 请求示例

```http
GET /api/smart-monitor/storage-status
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
| `snapshotAt` | string | 快照时间，ISO8601 |
| `snapshotLabel` | string | 展示文案，如 `2026年6月6日 14:30` |
| `items` | array | **固定 4 个**存储节点 |
| `summary` | object | 汇总 |

### items[] 元素（固定顺序）

| 字段 | 类型 | 说明 |
|------|------|------|
| `storageId` | string | 节点编码：`core-a` `core-b` `video-pool` `backup-pool` |
| `storageName` | string | 节点名称 |
| `totalCapacityTb` | number | 总容量（TB） |
| `usedCapacityTb` | number | 已用容量（TB） |
| `usagePercent` | number | 使用率 0–100 |
| `status` | string | `normal` \| `warning` \| `critical` |

### 状态阈值（建议）

| status | 条件 | 含义 |
|--------|------|------|
| `normal` | 使用率 &lt; 75% | 正常 |
| `warning` | 75% ≤ 使用率 &lt; 90% | 预警 |
| `critical` | 使用率 ≥ 90% | 告警 |

### summary

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalCapacityTb` | number | 全部节点总容量（TB） |
| `usedCapacityTb` | number | 全部节点已用容量（TB） |
| `avgUsagePercent` | number | 平均使用率 |
| `alertCount` | number | 预警 + 告警节点数 |

## 响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {
    "snapshotAt": "2026-06-06T14:30:00+08:00",
    "snapshotLabel": "2026年6月6日 14:30",
    "items": [
      {
        "storageId": "core-a",
        "storageName": "核心区存储A",
        "totalCapacityTb": 48,
        "usedCapacityTb": 27.8,
        "usagePercent": 57.9,
        "status": "normal"
      },
      {
        "storageId": "core-b",
        "storageName": "核心区存储B",
        "totalCapacityTb": 48,
        "usedCapacityTb": 34.6,
        "usagePercent": 72.1,
        "status": "normal"
      },
      {
        "storageId": "video-pool",
        "storageName": "监控录像池",
        "totalCapacityTb": 96,
        "usedCapacityTb": 79.7,
        "usagePercent": 83.0,
        "status": "warning"
      },
      {
        "storageId": "backup-pool",
        "storageName": "备份归档池",
        "totalCapacityTb": 120,
        "usedCapacityTb": 111.6,
        "usagePercent": 93.0,
        "status": "critical"
      }
    ],
    "summary": {
      "totalCapacityTb": 312,
      "usedCapacityTb": 253.7,
      "avgUsagePercent": 76.5,
      "alertCount": 2
    }
  }
}
```

## 前端对接

- 类型：`src/types/smart-monitor.ts`
- Mock：`src/mocks/smart-monitor-storage-status.ts`
- 客户端：`src/api/smart-monitor.ts`（`useMock: true` 时走本地 Mock）
- 图表：`src/components/cockpit/StorageStatusChart.vue`

接入真实 API 后，将图表内 `getStorageStatus({ useMock: false })` 即可。
