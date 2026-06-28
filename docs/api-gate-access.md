# 门禁过门事件 API

模拟后端推送「哪扇门、进还是出」，驱动大屏地图门禁动画，并在底部展示实时过门列表。

前端默认 Mock（`resolveUseMock`）；接入真实后端后设置 `VITE_USE_MOCK=false`。

**轮询**：每 **3 秒** 增量拉取一次（`GET /api/gate-access/events`）。

---

## 1. 增量拉取过门事件

```
GET /api/gate-access/events?cursor=evt_000012&limit=20
```

### Query

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cursor` | string | 否 | 上次响应中的 `cursor`；首次不传 |
| `limit` | number | 否 | 单批最大条数，默认 20 |

### 响应外壳

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": { }
}
```

### data 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `events` | array | 自 `cursor` 之后的新事件（时间升序） |
| `cursor` | string | 本批最后一条 `eventId`；下次请求带上 |

### events[]

| 字段 | 类型 | 说明 |
|------|------|------|
| `eventId` | string | 事件唯一 ID |
| `doorId` | string | 场景门 ID，见下文 |
| `direction` | `"in"` \| `"out"` | 过门方向：`in` 进 / `out` 出 |
| `occurredAt` | string | ISO 8601 发生时间 |
| `personId` | string | 可选，人员 ID |
| `personName` | string | 可选，展示姓名 |

### doorId 约定

推荐使用 SVG 场景门 ID（与动画绑定一致）：

| 门型 | 示例 |
|------|------|
| 连锁管控门 | `person_A01` |
| 火车道管控门 | `tripod_S01` |
| 人脸门禁 | `fullheight_X01` |
| 汽车道闸 | `vehicleBarrier_10` |
| 火车道闸 | `trainBarrier_01` |

也支持别名（前端会自动规范化）：

- `gate_person_A_01` → `person_A01`
- `person_A_01` → `person_A01`

### direction 兼容值

后端可返回以下任意一种，前端会规范为 `in` / `out`：

| 进 | 出 |
|----|-----|
| `in` | `out` |
| `enter` | `exit` |
| `进` | `出` |

---

## 2. 返回体示例

### 首次拉取（无 cursor）

**Request**

```
GET /api/gate-access/events
```

**Response**

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {
    "events": [
      {
        "eventId": "evt_000001",
        "doorId": "person_A01",
        "direction": "in",
        "occurredAt": "2026-05-29T14:03:12.000+08:00",
        "personId": "P1001",
        "personName": "张三"
      },
      {
        "eventId": "evt_000002",
        "doorId": "tripod_S01",
        "direction": "out",
        "occurredAt": "2026-05-29T14:03:18.000+08:00",
        "personId": "P1002",
        "personName": "李四"
      }
    ],
    "cursor": "evt_000002"
  }
}
```

### 增量拉取（带 cursor）

**Request**

```
GET /api/gate-access/events?cursor=evt_000002&limit=20
```

**Response（暂无新事件）**

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {
    "events": [],
    "cursor": "evt_000002"
  }
}
```

**Response（有新事件）**

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {
    "events": [
      {
        "eventId": "evt_000003",
        "doorId": "gate_person_F_03",
        "direction": "out",
        "occurredAt": "2026-05-29T14:03:25.000+08:00",
        "personId": "P1003",
        "personName": "王五"
      }
    ],
    "cursor": "evt_000003"
  }
}
```

---

## 3. 前端接入说明

| 模块 | 路径 |
|------|------|
| 类型 | `src/types/gate-access.ts` |
| API | `src/api/gate-access.ts` |
| Mock | `src/mocks/gate-access-events.ts` |
| 轮询 | `src/composables/useGateAccessEvents.ts` |
| 状态应用 | `src/utils/apply-gate-access-event.ts` |
| 展示 | `src/components/cockpit/CockpitGateAccessFeed.vue` |

接入真实 API：

1. 实现 `GET /api/gate-access/events`，响应结构与上文一致。
2. 设置 `VITE_USE_MOCK=false`（或调试面板切「接口」）。
3. 无需改动画逻辑：收到事件后会设置 `direction` 并 toggle 门状态触发动画。

Mock 模式下约每 3 秒有 45% 概率随机推送一条过门事件，便于联调。
