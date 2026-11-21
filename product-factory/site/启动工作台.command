#!/bin/bash
cd "$(dirname "$0")"
echo "正在启动产品工厂工作台..."
echo "数据保存在本目录的 data.json 文件中"
echo ""

# 检查 8210 端口是否已被占用
if curl -s --max-time 2 http://127.0.0.1:8210/ >/dev/null 2>&1; then
  echo "工作台已经在运行了。"
else
  python3 server.py 8210 &
  sleep 1
fi

echo "正在打开浏览器..."
open "http://127.0.0.1:8210/index.html"
echo ""
echo "工作台运行中。关闭这个窗口不会停止服务。"
echo "如需停止服务，在终端执行: pkill -f 'server.py 8210'"
