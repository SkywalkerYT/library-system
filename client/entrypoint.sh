#!/bin/bash
# ============================================
# Sealos 前端 DevBox 启动入口
# - 用 server.js 提供静态文件 + /api 反代
# ============================================
set -e
cd /home/devbox/project
exec node server.js