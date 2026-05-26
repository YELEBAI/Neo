@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo NeoTavern 一键清理卸载
echo.
echo 将清理：
echo - 本地聊天记录、消息、预设、角色、世界书、设置
echo - node_modules、dist、target、缓存和日志
echo.
echo 脚本会要求输入 DELETE 二次确认。
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall-project.ps1"

echo.
pause
