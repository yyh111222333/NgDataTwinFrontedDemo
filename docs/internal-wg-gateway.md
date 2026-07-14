# Internal and WireGuard Gateway Notes

This deployment keeps the cockpit usable from both the plant LAN and the WireGuard network by avoiding hard-coded browser-facing IP addresses.

## Browser entry points

- LAN cockpit: `http://192.168.10.11:8083/cockpit`
- WireGuard cockpit: `http://10.13.0.8:8083/cockpit`
- LAN monitoring dashboard: `http://192.168.10.11:9001/dashboard`
- WireGuard monitoring dashboard: `http://10.13.0.8:9001/dashboard`
- LAN vehicle backend mapping: `http://192.168.10.11:8888/`
- WireGuard vehicle backend mapping: `http://10.13.0.8:8888/`

## Cockpit footer links

The cockpit footer uses same-origin links where possible:

- Personnel: `/gateway/personnel/`
- Vehicle: `/gateway/vehicle/`
- Crane: `/gateway/crane/`
- Smart monitoring: current hostname on port `9001`, path `/dashboard`

The monitoring dashboard is opened on port `9001` rather than under `/gateway/monitor/` because it serves root-relative `/static` assets and connects to video streams on port `9002`.

## Nginx proxy map

The frontend nginx config proxies these paths:

- `/api` -> legacy endpoint retired (HTTP 404; cockpit panels use mock data)
- `/health` -> `http://192.168.10.11:18050/_gateway/health`
- `/relay-api/` -> `http://192.168.10.11:18999/api/`
- `/gateway/personnel/` -> `http://192.168.10.11:18050/s/personnel/`
- `/gateway/vehicle/` -> `http://192.168.10.11:18050/s/vehicle/`
- `/gateway/crane/` -> `http://192.168.10.11:8000/`

The config also rewrites upstream redirects from both `192.168.10.11` and `10.13.0.8` so a browser stays on the entry host it used.

Gate animation signals are read directly from the personnel and vehicle gateway routes. Port `8084` is no longer part of the cockpit runtime.

## Related runtime changes outside this repository

These were applied on the server but belong to other runtime components:

- `win10-platform-proxy` maps `:8888` on `ngserver1-2404` to the Windows vehicle platform on `ngserver1-win10`.
- The monitoring dashboard template was adjusted to build `18051` API URLs and `9002` WebSocket video URLs from the browser's current hostname.
- The `cpe-watchdog` container was stopped so port `5000` is no longer published.
