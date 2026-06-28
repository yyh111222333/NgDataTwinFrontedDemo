# 系统运行总览 API

用于大屏 **智慧监控概况 → 设备在位统计** Tab：区域/设备类型筛选 + 在线/离线饼图。

上方 KPI 仍来自 `GET /api/dashboard/overview`；设备明细字段供本 Tab 使用。

前端默认走 Mock（`resolveUseMock`）；接入真实后端后设置 `VITE_USE_MOCK=false`，或在调试面板切换为「接口」。

**轮询**：概览数据每 **30 秒** 自动刷新一次。

---

## 1. 大屏概览

```
GET /api/dashboard/overview
```

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
| `onlineAccess` | number | 在线门禁数量 |
| `areaTotal` | number | 区域总人数 |
| `vehiclesOnSite` | number | 车辆在场数量 |
| `railStatus` | `"空闲"` \| `"占用"` | **火车道状态（请返回中文）** |
| `alarmCount` | number | 异常警告数量 |
| `deviceRegions` | string[] | 设备统计可用区域列表 |
| `deviceTypes` | string[] | 设备统计可用类型列表 |
| `deviceRecords` | array | 各区域×设备类型的在线/异常/离线明细 |
| `updatedAt` | string | 可选，ISO 8601 更新时间 |

### deviceRecords[]

| 字段 | 类型 | 说明 |
|------|------|------|
| `region` | string | 区域名称，如 `A区` |
| `device` | string | 设备类型名称 |
| `online` | number | 在线数量 |
| `abnormal` | number | 异常数量 |
| `offline` | number | 离线数量 |

### 示例

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {
    "onlineAccess": 24,
    "areaTotal": 134,
    "vehiclesOnSite": 22,
    "railStatus": "空闲",
    "alarmCount": 0,
    "updatedAt": "2026-06-01T12:00:00.000+08:00",
    "deviceRegions": ["A区", "F区", "E区", "D区", "H区", "K区", "J区", "L区", "火车道", "道路"],
    "deviceTypes": [
      "连锁管控门",
      "火车道管控门",
      "人脸门禁",
      "汽车道闸",
      "火车道闸",
      "摄像机",
      "声光报警",
      "光电报警",
      "烟感器",
      "温感器"
    ],
    "deviceRecords": [
      { "region": "A区", "device": "连锁管控门", "online": 9, "abnormal": 0, "offline": 1 },
      { "region": "A区", "device": "人脸门禁", "online": 8, "abnormal": 0, "offline": 1 },
      { "region": "道路", "device": "汽车道闸", "online": 4, "abnormal": 0, "offline": 1 },
      { "region": "火车道", "device": "火车道闸", "online": 2, "abnormal": 0, "offline": 0 },
      { "region": "火车道", "device": "火车道管控门", "online": 1, "abnormal": 0, "offline": 0 }
    ]
  }
}
```

### 火车道状态约定

- 请后端 **直接返回中文**：`空闲` 或 `占用`
- 前端会对历史英文字段做兼容映射（如 `idle`→`空闲`，`passing`/`occupied`→`占用`），**新接口请勿再使用英文**

---

## 2. 设备筛选项

```
GET /api/device-status/options?regionId=all
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `regionId` | string | `all` 或具体区域 id（与 `deviceRegions` 中名称一致） |

**响应约定**：

- `regions`：**始终返回完整区域列表**（含全部可选区），便于用户切换区域时无需先选「全部」
- `deviceTypes`：随 `regionId` 联动，见下表

**区域 → 设备类型规则**（`regionId` 非 `all` 时，`deviceTypes` 仅返回该区域可用项）：

| 区域 | 可用设备 |
|------|----------|
| A区～L区（室内字母区） | 连锁管控门、人脸门禁、摄像机、声光报警、光电报警、烟感器、温感器 |
| 火车道 | 火车道管控门、火车道闸 |
| 道路 | 汽车道闸 |
| `all` | 全部 10 类设备 |

### Mock 全厂设备台数（online + abnormal + offline 合计）

Mock **优先生成 5 类真实台账**；室内另附少量传感器 Mock（每区约 7 台），待后端接入后可替换。

| 设备类型 | 台数 | 区域分配说明 |
|----------|------|----------------|
| 连锁管控门 | 30 | A1、F3、E7、D6、H2、K7、J4、L0 |
| 火车道管控门 | 4 | 火车道 |
| 人脸门禁 | 4 | A/F/E/L区各1 |
| 汽车道闸 | 6 | 道路 |
| 火车道闸 | 2 | 火车道 |
| 摄像机 / 声光 / 光电 / 烟感 / 温感 | 室内每区约 7 台 | 每区 Mock：摄像2、声光1、光电1、烟感2、温感1 |

单区示例（设备选「全部」）：A区约 8 台、E区约 14 台、L区约 8 台（含传感器）。

Mock 每 30s 刷新时仅微调在线/离线台数，**各类型总台数保持不变**；Mock 阶段 **abnormal 恒为 0**。

### data 示例

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {
    "regions": [
      { "id": "A区", "name": "A区" },
      { "id": "F区", "name": "F区" },
      { "id": "火车道", "name": "火车道" },
      { "id": "道路", "name": "道路" }
    ],
    "deviceTypes": [
      { "id": "连锁管控门", "name": "连锁管控门" },
      { "id": "人脸门禁", "name": "人脸门禁" }
    ]
  }
}
```

> 上例为 `regionId=E区` 时的响应：`regions` 仍为完整列表；`deviceTypes` 仅含 E 区可用设备。前端会自行追加「全部」选项。

---

## 前端文件

| 文件 | 说明 |
|------|------|
| `src/types/dashboard.ts` | 类型定义 |
| `src/config/device-status-catalog.ts` | 区域/设备目录与区域→设备映射 |
| `src/mocks/device-status-inventory.ts` | Mock 台账：按区域分配台数，全厂合计固定 |
| `src/mocks/dashboard-overview.ts` | 概览 Mock |
| `src/mocks/device-status-options.ts` | 筛选项 Mock |
| `src/api/dashboard.ts` | 请求封装 |
| `src/api/dashboard-rail-status.ts` | 火车道状态中文化 |
| `src/views/cockpit/CockpitView.vue` | 30s 轮询 + KPI 编排 |
| `src/components/cockpit/CockpitSmartMonitorOverview.vue` | 设备在位统计 Tab 展示 |

接入真实 API：环境变量 `VITE_USE_MOCK=false`，或 F8 调试面板切换「接口」。
