# 内网与WireGuard网关

## 访问入口

- LAN大屏：`http://192.168.10.11:8083/cockpit`
- WireGuard大屏：`http://10.13.0.8:8083/cockpit`
- LAN FastAPI：`http://192.168.10.11:19080/docs`
- WireGuard FastAPI：`http://10.13.0.8:19080/docs`

## Nginx路径

- `/api/`、`/parking-api/`、`/health` -> `PLATFORM_API_UPSTREAM`
- `/gateway/personnel/`、`/gateway/vehicle/` -> `ACCESS_GATEWAY_UPSTREAM`
- `/gateway/crane/` -> `CRANE_UPSTREAM`
- `/relay-api/` -> `RELAY_UPSTREAM`
- `/monitor-api/` -> `SMART_MONITOR_UPSTREAM`

所有上游地址在容器启动时由环境变量生成，不写入浏览器代码。LAN和WG用户只访问当前大屏
地址下的同源路径，不会被跳转到另一个网段。

FastAPI监听服务器全部网卡。Redis和PostgreSQL仅存在于后端Docker网络，没有宿主机端口映射。
端口5000的 `cpe-watchdog` 服务独立运行，不属于本项目，部署前后均不得停止、重建或修改。
