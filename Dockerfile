# 构建前端 docker build -t ngdtdemo-frontend:1.0.2 .

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
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8083

CMD ["nginx", "-g", "daemon off;"]

# 运行  
# docker stop ngdtdemo-frontend || true
# docker rm ngdtdemo-frontend || true
# docker run -d --name ngdtdemo-frontend -p 8083:8083 --restart always ngdtdemo-frontend:1.0.2
