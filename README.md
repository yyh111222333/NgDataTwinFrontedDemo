### 门禁命名结构

####  门 ID（门级主键）
统一格式：

`gate_<type>_<area>_<index>`

> `type`：门型（如 `tripod`、`person`）
> `area`：区域（如 `A`、`B`、`F`）
> `index`：同区域门序号（如 `01`、`02`）

示例：
> `gate_tripod_A_01`
> `gate_person_A_01`

####  三辊闸机（tripod）部件命名
格式：

`gate_tripod_<area>_<index>_<part>`

其中 `part` 约定如下：
>轨迹：`route_01`、`route_02`、`route_03`
>三根杆：`rotor_01`、`rotor_02`、`rotor_03`
>旋转中心：`pivot`
>外框静态：`static`
>内框静态：`static-2`
>外框补线：`static-3` ~ `static-6`

示例：

>`gate_tripod_A_01_route_01`
>`gate_tripod_A_01_rotor_02`
>`gate_tripod_A_01_pivot`
>`gate_tripod_A_01_static-4`

####  人员门（person）部件命名
格式：

`gate_person_<area>_<index>_<part>`

其中 `part` 约定如下：

>可动门扇：`leaf`
>旋转中心：`pivot`

示例：

>`gate_person_A_01_leaf`
>`gate_person_A_01_pivot`

####  静态墙体命名
墙体使用 `wall` 前缀即可：

>`wall`
>`wall-2`
>`wall-3`

####  约束与说明

>所有元素 `id` 必须全局唯一。
>推荐“每个可动/关键静态元素都带门前缀”，便于解析和调试。
>门选择使用门级 ID（如 `gate_person_A_01`）。