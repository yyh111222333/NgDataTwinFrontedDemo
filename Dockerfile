# 第1阶段：构建前端 docker build -t ngdtdemo-frontend:1.0.0 .
FROM node:20-alpine AS builder

WORKDIR /app

# 先拷贝依赖清单，提高缓存命中
COPY package*.json ./
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry ${NPM_REGISTRY} \
    && if [ -f package-lock.json ]; then npm ci --no-audit --prefer-offline; else npm install --no-audit --prefer-offline; fi

# 构建时注入前端环境变量（Vite 仅会暴露 VITE_*）
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 再拷贝项目源码并打包
COPY . .
RUN npm run build

# 第2阶段：Nginx 提供静态资源
FROM nginx:alpine

# 将打包产物复制到 nginx 默认站点目录
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 8083

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]

# 运行  docker run -d --name scp-frontend -p 8083:8083 --restart always ngdtdemo-frontend:1.0.0