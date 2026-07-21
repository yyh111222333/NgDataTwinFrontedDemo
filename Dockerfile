# 构建前端 docker build -t ngdtdemo-frontend:3.0.0 .

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry ${NPM_REGISTRY} \
    && if [ -f package-lock.json ]; then npm ci --no-audit --prefer-offline; else npm install --no-audit --prefer-offline; fi

# 留空表示同源请求，由 nginx 代理各业务子系统和健康检查
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/templates/default.conf.template

ENV NGINX_ENVSUBST_FILTER="^(PLATFORM_API_UPSTREAM|ACCESS_GATEWAY_UPSTREAM|CRANE_UPSTREAM|MONITOR_UPSTREAM|RELAY_UPSTREAM|TRAIN_BARRIER_UPSTREAM|SMART_MONITOR_UPSTREAM)$" \
    PLATFORM_API_UPSTREAM="http://192.168.10.11:19080" \
    ACCESS_GATEWAY_UPSTREAM="http://192.168.10.11:18050" \
    CRANE_UPSTREAM="http://192.168.10.11:8000" \
    MONITOR_UPSTREAM="http://192.168.10.11:9001" \
    RELAY_UPSTREAM="http://192.168.10.11:18999" \
    TRAIN_BARRIER_UPSTREAM="http://192.168.10.11:5001" \
    SMART_MONITOR_UPSTREAM="http://192.168.10.11:18051"

EXPOSE 8083

CMD ["nginx", "-g", "daemon off;"]
