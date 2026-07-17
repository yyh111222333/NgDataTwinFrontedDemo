# 闸机 SVG 命名规则

## 门 ID

门级主键统一使用：

```text
gate_<type>_<area>_<index>
```

- `type`：门型，例如 `tripod`、`person`、`fullheight`。
- `area`：区域，例如 `A`、`B`、`F`。
- `index`：同区域门序号，例如 `01`、`02`。

示例：

```text
gate_tripod_A_01
gate_person_A_01
gate_fullheight_A_01
```

## 三辊闸机

部件命名格式：

```text
gate_tripod_<area>_<index>_<part>
```

`part` 约定：

- 轨迹：`route_01`、`route_02`、`route_03`。
- 三根杆：`rotor_01`、`rotor_02`、`rotor_03`。
- 旋转中心：`pivot`。
- 外框静态：`static`。
- 内框静态：`static-2`。
- 外框补线：`static-3` 至 `static-6`。

## 人员门

部件命名格式：

```text
gate_person_<area>_<index>_<part>
```

- 可动门扇：`leaf`。
- 旋转中心：`pivot`。

## 全高闸机

部件命名格式：

```text
gate_fullheight_<area>_<index>_<part>
```

- 多根同轴旋转杆：`leaf_01`、`leaf_02` 等，两位序号与 SVG 保持一致。
- 旋转中心：`pivot`。
- 静态外形：`static`、`static-2` 等。

## 静态墙体

墙体使用 `wall` 前缀，例如 `wall`、`wall-2`、`wall-3`。

## 约束

- 所有 SVG 元素 `id` 必须全局唯一。
- 可动部件和关键静态元素应包含所属门的完整前缀。
- 门选择使用门级 ID，例如 `gate_person_A_01`。
