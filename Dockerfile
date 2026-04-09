# 第1阶段：构建前端
FROM node:20-alpine AS builder

WORKDIR /app

# 先拷贝依赖清单，提高缓存命中
COPY package*.json ./
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry ${NPM_REGISTRY} \
    && if [ -f package-lock.json ]; then npm ci --no-audit --prefer-offline; else npm install --no-audit --prefer-offline; fi

# 再拷贝项目源码并打包
COPY . .
RUN npm run build

# 第2阶段：Nginx 提供静态资源
FROM nginx:alpine

# 将打包产物复制到 nginx 默认站点目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]