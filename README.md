# AgentRouter 每日自动登录

安装命令、可整段复制的部署脚本、全部运行源码和任务管理命令见：[部署与使用说明](./部署与使用说明.md)。

每天北京时间 09:00 后随机延迟 0–3599 秒，使用独立 Playwright 浏览器完成退出并通过 GitHub 重新登录。窗口会短暂出现，完成后自动关闭。

2026 年 10 月 19 日北京时间 10:36 已实测通过完整退出与重新登录流程。GitHub 登录会打开新标签页，脚本已监听该标签页并在其中验证控制台和账户菜单；首次登录脚本也已同步处理。

## 首次登录与会话恢复

在此目录执行 `npm.cmd run setup`，在专用浏览器中手动登录 GitHub，进入 AgentRouter 控制台后关闭浏览器。无需提供密码给脚本。GitHub 验证码、二次验证或新增 OAuth 授权需要本人处理。

## 手动检查

执行 `npm.cmd start`，立即测试完整流程；手动测试不受 09:00–10:00 限制。不要与首次登录窗口同时运行。

## 定时任务

任务名称：`AgentRouter-AutoLogin`。本机时区必须保持北京时间，Windows 用户需要处于已登录状态，电脑需开机并联网。错过窗口不会补执行；系统繁忙、网络延迟也可能影响实际完成时间。

注册：`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-task.ps1`。

暂停：`Disable-ScheduledTask -TaskName AgentRouter-AutoLogin`。

恢复：`Enable-ScheduledTask -TaskName AgentRouter-AutoLogin`。

移除定时任务：`Unregister-ScheduledTask -TaskName AgentRouter-AutoLogin`。

## 日志与隐私

`logs/last-result.json` 保存最新结果，`logs/runs.jsonl` 保存运行历史，失败截图为 `logs/last-failure.png`。截图可能包含账户信息，仅在本地检查。

`browser-profile/` 包含 GitHub 与 AgentRouter 登录会话，等同敏感凭据，不要上传或共享。浏览器运行时、会话和日志均保存在本目录；npm 自身可能使用系统既有缓存目录。

登录成功仅代表退出后重新进入控制台，不代表网站一定发放签到奖励。
