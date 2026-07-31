# 对话导航

一个面向 Codex 桌面 App 的本地插件。安装并信任 Stop Hook 后，它会在正文回答完成时追加中文下一步建议，并提供可编辑、可发送的 MCP Widget。

## 能力

- 创意脑暴、理性推演、感性共鸣三种导航性格。
- 每轮生成 3–5 个与当前目标相关的下一步任务。
- 单击建议后展开编辑框，修改后发送回当前任务。
- Stop Hook 在正文完成后启动导航续回合。
- MCP 服务已经打包，安装用户无需运行 `npm install`。

## 从 GitHub 安装

要求本机可以执行 Node.js 22.13 或更高版本。

```bash
codex plugin marketplace add xuhuawork/conversation-navigator
codex plugin add conversation-navigator@conversation-navigator
```

完全退出并重新打开 Codex，然后：

1. 打开 `/hooks`。
2. 核对命令 `node "${PLUGIN_ROOT}/scripts/auto-navigation-stop-hook.mjs"`。
3. 信任并启用“正在把下一步建议放到回答底部”对应的 Hook。
4. 新建任务并正常提问。

Hook 生效后，每次正文回答完成，卡片会自动出现在回复下方；无需每轮手动调用。输入“显示建议卡片”可以手动显示，输入“刷新下一步建议”可以手动刷新。

## 关闭

在 `/hooks` 中停用该 Stop Hook，即可停止自动追加。当前版本没有单独保存每个任务的开关状态。

## 开发与重新打包

在仓库根目录运行：

```bash
npm ci
npm run build:plugin
npm test
```

## 运行边界

- 本地 Codex 使用无需公网地址、ChatGPT Developer Mode、OAuth 或 OpenAI API Key。
- Widget 不请求外部域名，CSP allowlist 为空。
- 普通 ChatGPT MCP App 可以使用 Widget；逐轮自动追加依赖 Codex Stop Hook。
