# AgentRouter 每日自动登录

本文包含首次安装、启动和定时任务管理命令。以下命令均在 Windows PowerShell 中执行。

每天北京时间 09:00 后随机延迟 0–3599 秒，使用独立 Playwright 浏览器完成退出并通过 GitHub 重新登录。窗口会短暂出现，完成后自动关闭。

2026 年 10 月 19 日北京时间 10:36 已实测通过完整退出与重新登录流程。GitHub 登录会打开新标签页，脚本已监听该标签页并在其中验证控制台和账户菜单；首次登录脚本也已同步处理。

## 首次安装与启动

安装 Node.js 20 或更高版本（建议使用仍受支持的 LTS 版本），重新打开 PowerShell，进入下载或克隆后的项目根目录（包含 `package.json` 的目录）。安装需要联网，浏览器下载可能耗时较长。

在项目根目录整段复制执行以下脚本；任一步失败都会停止，请处理报错后重试：

```powershell
& {
    $ErrorActionPreference = 'Stop'
    node.exe --version
    if ($LASTEXITCODE -ne 0) { throw 'Node.js check failed.' }

    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }

    $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $PWD.Path 'browser-runtime'
    npx.cmd playwright install chromium
    if ($LASTEXITCODE -ne 0) { throw 'Chromium installation failed.' }

    npm.cmd run setup
    if ($LASTEXITCODE -ne 0) { throw 'Initial login failed.' }
}
```

`setup` 会打开专用浏览器，请手动完成 GitHub 登录。终端提示“已进入控制台。关闭浏览器后保存会话。”后，关闭该浏览器，再执行：

```powershell
npm.cmd start
```

确认手动运行成功后，再按下文注册定时任务。

### 下载项目后缺少目录是否正常

以下目录均由安装或运行过程生成，已通过 `.gitignore` 排除，不需要从作者电脑复制：

| 目录 | 用途 | 生成方式 |
| --- | --- | --- |
| `node_modules/` | Node.js 依赖 | `npm.cmd ci` |
| `browser-runtime/` | Playwright 使用的 Chromium 浏览器 | 上述设置环境变量及浏览器安装命令 |
| `browser-profile/` | 当前使用者的 GitHub、AgentRouter 登录会话 | 首次启动专用浏览器时创建，登录后保存会话 |
| `logs/` | 运行日志、结果与失败截图 | `setup` 或手动启动时自动创建 |

必须先安装依赖和浏览器，才能运行 `setup` 或 `start`。只安装电脑上的 Chrome 不能替代上述 Chromium 安装步骤。下载浏览器前必须设置 `PLAYWRIGHT_BROWSERS_PATH`，使下载位置与源码使用的项目内路径一致；日常启动时源码会自动设置该路径。

## 首次登录与会话恢复

在此目录执行 `npm.cmd run setup`，在专用浏览器中手动登录 GitHub，进入 AgentRouter 控制台后关闭浏览器。无需提供密码给脚本。GitHub 验证码、二次验证或新增 OAuth 授权需要本人处理。

## 手动检查

执行 `npm.cmd start`，立即测试完整流程；手动测试不受 09:00–10:00 限制。不要与首次登录窗口同时运行。

启动时请注意：

- 所有命令都应在项目根目录执行；使用 `npm.cmd`、`npx.cmd` 可避免 PowerShell 对同名 `.ps1` 脚本的执行策略限制。
- 每位使用者都需要执行 `npm.cmd run setup` 完成自己的首次登录；登录过期、出现验证码或二次验证时，也需重新运行该命令处理。
- 同一时间只运行一个首次登录或自动登录流程，避免同时占用 `browser-profile/`。
- 若提示浏览器可执行文件不存在，在项目根目录重新执行上述设置 `PLAYWRIGHT_BROWSERS_PATH` 和安装 Chromium 的命令。

## 定时任务

任务名称：`AgentRouter-AutoLogin`。本机时区必须保持北京时间，Windows 用户需要处于已登录状态，电脑需开机并联网。错过窗口不会补执行；系统繁忙、网络延迟也可能影响实际完成时间。

必须先完成首次登录和手动检查，再注册任务：`run.ps1` 会先向 `logs/` 输出日志，因此该目录应已由首次登录流程创建。定时任务需在每位使用者自己的电脑上单独注册；项目移动位置或 Node.js 安装路径改变后，应移除旧任务并在新位置重新注册。若提示任务已存在，先检查现有任务，确认需要替换后再移除并注册。

注册：`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-task.ps1`。

暂停：`Disable-ScheduledTask -TaskName AgentRouter-AutoLogin`。

恢复：`Enable-ScheduledTask -TaskName AgentRouter-AutoLogin`。

移除定时任务：`Unregister-ScheduledTask -TaskName AgentRouter-AutoLogin`。

## 日志与隐私

`logs/last-result.json` 保存最新结果，`logs/runs.jsonl` 保存运行历史，失败截图为 `logs/last-failure.png`。截图可能包含账户信息，仅在本地检查。

`browser-profile/` 包含 GitHub 与 AgentRouter 登录会话，等同敏感凭据，不要上传或共享。浏览器运行时、会话和日志均保存在本目录；npm 自身可能使用系统既有缓存目录。

登录成功仅代表退出后重新进入控制台，不代表网站一定发放签到奖励。
