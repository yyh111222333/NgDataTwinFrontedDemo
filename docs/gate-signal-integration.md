# 全高闸与道闸信号接入

前端每秒轮询同源接口：

`GET /api/cockpit/v1/door-states`

## 当前数据流

1. `useCockpitDoorSignals` 首次请求只记录每个源门的版本，不播放历史测试数据。
2. 后续检测 `updatedAt + open + flowDirection` 变化。
3. `cockpit-door-signal.ts` 将旧 SVG 门号映射到当前地图门号。
4. `CockpitSceneMount` 按状态变化或信号版本变化播放动画。

同一门连续收到相同的 `open` 和方向时，只要 `updatedAt` 更新，也会重新播放动画。

## 后续设备约定

推荐后端直接返回当前地图 `sceneDoorId`，例如：

```json
{
  "doorId": "vehicleBarrier_9",
  "open": true,
  "flowDirection": "in",
  "online": true,
  "updatedAt": "2026-07-14T19:40:00+08:00"
}
```

全高闸使用 `fullheight_*`，汽车道闸使用 `vehicleBarrier_*`，火车道闸使用
`trainBarrier_*`。新设备直接使用这些 ID 时，前端无需改代码；若只能返回旧编号或厂商
编号，在 `src/config/cockpit-door-signal-map.ts` 增加一条映射即可。
