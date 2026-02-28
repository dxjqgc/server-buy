# 使用 CDP 模式避免提交页购买按钮被隐藏

当脚本自动打开的浏览器在「确认/提交页」不显示购买按钮时，可改用 **CDP 模式**：在**你手动打开的 Chrome** 里跑脚本，页面会认为是真人操作，购买按钮会正常显示。

## 步骤

### 1. 用调试端口启动 Chrome

在项目目录的 PowerShell 中执行：

```powershell
.\start-chrome-debug.ps1
```

脚本会使用**独立配置目录**（`chrome-debug-profile`）启动一个**新的 Chrome 窗口**，与日常使用的 Chrome 互不影响，无需先关掉已有 Chrome。该窗口会监听 9222 端口。

**验证**：在新 Chrome 地址栏打开 `http://127.0.0.1:9222/json`（根路径 `/` 可能空白），应能看到 JSON 列表。

### 2. 在此 Chrome 里登录并打开活动页

- 在该窗口中访问腾讯云并登录；
- 再打开活动页：<https://cloud.tencent.com/act/pro/spring2026>

（或先打开活动页再登录也可以。）

### 3. 运行 CDP 抢购脚本

在项目目录执行：

```bash
node buy-cdp.js
```

脚本会连接到刚打开的 Chrome，在当前活动页上轮询并点击「立即抢购」，之后在**同一浏览器**里打开提交页，购买按钮应会正常显示，你可在该窗口里完成下单。

---

若你当前要抢的商品不是「约3.17元/月」那档，请修改 `buy-cdp.js` 里这一行的文案为你的目标价格：

```js
const card = page.locator('.uno3-buy-card__ft').filter({ has: page.getByText('约3.17元/月') });
```
