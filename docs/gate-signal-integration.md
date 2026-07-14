# 全高闸与道闸信号接入

前端不再依赖 `8084` 聚合接口，改为通过大屏 Nginx 的同源网关直接读取现有业务子系统。

## 车辆道闸

- 数据接口：`POST /gateway/vehicle/InParkRecord/GetParkOrderList`
- 请求格式：`application/x-www-form-urlencoded`
- 事件来源：订单中的进场、出场时间和车道名称
- 场景映射：7、8、9、10、11 号门分别映射到同号汽车道闸
- 播放策略：首次请求建立基线；出现新订单事件时开闸，2.5 秒后自动复位

停车平台目前能看到 7、8、10 号门的实时记录。9、11 号门网络可达，但平台设备状态仍为离线；
前端已支持这两个门，平台恢复上报后无需再改前端。

## 人员全高闸

- 数据接口：`GET /gateway/personnel/ControllerMonitor/GetNowInfo`
- 事件来源：智能识别、刷卡开门、按钮开门、远程开门等实时事件
- 播放策略：按设备序列号去重，新事件触发后 2.5 秒自动复位

人员平台没有维护 `X01` 至 `X04` 的现场点位名称，不能仅凭 IP 安全推断物理位置。
确认对应关系后，在 `src/config/cockpit-door-signal-map.ts` 的
`PERSONNEL_DEVICE_SCENE_DOOR_IDS` 中填写，例如：

```ts
export const PERSONNEL_DEVICE_SCENE_DOOR_IDS = {
  设备序列号: 'fullheight_X01',
}
```

当前在线设备的序列号和 IP 已记录在同一配置文件的 `PERSONNEL_DEVICES` 中。

## 容错

人员和车辆接口并行采集，单个子系统异常不会阻塞另一个子系统。首次读取只建立事件基线，
避免页面刷新时重放历史记录；同一门的新事件即使方向相同，也会按事件版本重新播放动画。
