#!/bin/sh
# 设置默认值
export PORT=${PORT:-4000}
export NGINX_PORT=${NGINX_PORT:-80}
export EN=${EN:-false}

# 生成前端运行时配置 (支持运行时环境变量注入到前端)
echo "window._env_ = {" > /usr/share/nginx/html/env-config.js
echo "  EN: \"${EN}\"" >> /usr/share/nginx/html/env-config.js
echo "};" >> /usr/share/nginx/html/env-config.js

# 用环境变量替换模板
envsubst '${PORT} ${NGINX_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# 启动 Node API + nginx
node /api/index.js &
exec nginx -g 'daemon off;'