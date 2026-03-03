# 使用脚本辅助抢购腾讯云38元秒杀服务器

通过脚本模拟用户点击抢购和确认按钮，使用脚本的前提是先安装node和谷歌浏览器

## 步骤

### 0. clone项目到本地

克隆项目到本地，使用npm install安装依赖（只用到了一个依赖：playwright）

### 1. 用调试端口启动 Chrome

在项目目录的 PowerShell 中执行：

```powershell
.\start-chrome-debug.ps1
```

脚本会使用**独立配置目录**（`chrome-debug-profile`）启动一个**新的 Chrome 窗口**，并且自动加载活动页：https://cloud.tencent.com/act/pro/spring2026, 与日常使用的 Chrome 互不影响，无需先关掉已有 Chrome。该窗口会监听 9222 端口。

**验证**：在新 Chrome 地址栏打开 `http://127.0.0.1:9222/json`（根路径 `/` 可能空白），应能看到 JSON 列表。

### 2. 运行 CDP 抢购脚本

在项目目录执行：

```bash
node buy-cdp.js
```

脚本会连接到刚打开的 Chrome，在当前活动页上轮询并点击「立即抢购」，之后在**同一浏览器**里打开提交页，购买按钮应会正常显示，你可在该窗口里完成下单。

---

若你当前要抢的商品不是「约3.17元/月」那档，请修改 `buy-cdp.js` 里这一行的文案为你的目标价格('约3.17元/月'锁定的就是那台38元的秒杀服务器)：

```js
const card = page.locator('.uno3-buy-card__ft').filter({ has: page.getByText('约3.17元/月') });
```
