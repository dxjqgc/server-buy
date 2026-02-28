# 用「远程调试端口」启动 Chrome，供 buy-cdp.js 连接
# 使用独立用户数据目录，这样即使已有 Chrome 在运行，也会新开一个监听 9222 的实例
# 用法：在 PowerShell 中执行 .\start-chrome-debug.ps1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$userDataDir = Join-Path $scriptDir "chrome-debug-profile"
if (-not (Test-Path $userDataDir)) {
    New-Item -ItemType Directory -Path $userDataDir | Out-Null
}

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
}
if (-not (Test-Path $chromePath)) {
    Write-Host "未找到 Chrome，请修改本脚本中的路径。" -ForegroundColor Red
    exit 1
}

$activityUrl = "https://cloud.tencent.com/act/pro/spring2026"

Write-Host "正在启动 Chrome（调试端口 9222）..." -ForegroundColor Green
Write-Host "将直接打开活动页，请在该窗口中登录（若未登录）后运行: node buy-cdp.js" -ForegroundColor Yellow
Write-Host "验证 9222 是否生效：在地址栏打开 http://127.0.0.1:9222/json 应能看到 JSON。" -ForegroundColor Gray
& $chromePath --remote-debugging-port=9222 --user-data-dir="$userDataDir" `
  --no-first-run --no-default-browser-check `
  $activityUrl
