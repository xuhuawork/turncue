# Conversation Navigator / 对话导航

一个面向 Codex 桌面 App 的中文对话导航插件。每次正文回答完成后，它会在回答下方追加一个 MCP Widget，提供 3–5 个可编辑的下一步方向。

## 功能

- 正文完成后再显示建议卡片，不抢在回答前面。
- 支持创意脑暴、理性推演、感性共鸣三种导航性格。
- 每轮可选择 3、4 或 5 个建议。
- 每条建议包含明确目标、具体动作和可验证交付物。
- 点击建议后展开编辑框，修改后发送回当前任务。
- 本地运行，不需要公网地址、OAuth、OpenAI API Key 或额外数据库。

## 工作顺序

```text
Codex 完成正文 → Stop Hook 触发 → 导航续回合调用 show_next_steps → Widget 出现在正文下方
```

该顺序已经使用 Codex CLI `0.146.0-alpha.9.2` 做过端到端验证：日志中的正文 `agent_message` 先完成，随后才出现 `conversation-navigator/show_next_steps` 工具调用。

自动工具调用由模型执行，属于高召回设计。Hook 已把指令限制为只调用工具，实际测试通过；模型漏调、参数校验失败或 MCP 未加载时，卡片仍可能缺席。此时可以输入“显示建议卡片”或“刷新下一步建议”。

## 安装

要求：

- Codex 桌面 App 或包含插件功能的 Codex CLI。
- Node.js 22.13 或更高版本。

运行：

```bash
codex plugin marketplace add xuhuawork/conversation-navigator
codex plugin add conversation-navigator@conversation-navigator
```

安装后：

1. 完全退出并重新打开 Codex。
2. 在 Codex 中打开 `/hooks`。
3. 核对命令为 `node "${PLUGIN_ROOT}/scripts/auto-navigation-stop-hook.mjs"`。
4. 信任并启用状态为“正在把下一步建议放到回答底部”的 Hook。
5. 新建一个任务并正常提问。正文完成后，建议卡片会自动追加在下方。

无需先说“开启对话导航”。这句话可以用于首次验收；“显示建议卡片”和“刷新下一步建议”是手动入口。

## 使用

Widget 右上角可以切换导航性格和建议数量：

- 创意脑暴：强调发散、意外联系和明显不同的创意路径。
- 理性推演：强调事实、约束、风险、优先级和验证。
- 感性共鸣：强调受众感受、情绪、叙事语气和审美体验。

单击建议会展开编辑框。确认文字后再发送，发送内容会回到当前 Codex 任务。

## 停用与卸载

- 暂停自动追加：在 `/hooks` 中停用对话导航的 Stop Hook。
- 完全卸载：

  ```bash
  codex plugin remove conversation-navigator@conversation-navigator
  ```

当前版本没有保存每个任务的开关状态；对 Hook 的启用或停用是全局设置。

## 故障排查

1. 运行 `codex plugin list`，确认 `conversation-navigator@conversation-navigator` 为 enabled。
2. 打开 `/hooks`，确认 Hook 已信任并启用。
3. 完全重启 Codex，再新建任务；旧任务可能保留安装前的工具快照。
4. 输入“显示建议卡片”。能手动显示通常说明 MCP 正常，问题位于 Hook 信任或自动触发环节。
5. 检查本机 `node --version` 是否满足要求。

## 数据边界

- Widget 的 CSP 外部域名白名单为空。
- Widget 不加载外链脚本、图片、字体，也不主动发起网络请求。
- MCP 服务在本机通过 stdio 运行，建议内容由当前 Codex 模型根据当前任务生成。
- 插件不保存用户画像、对话数据库或 API Key。

## 开发

```bash
npm ci
npm run validate
```

`npm run build:plugin` 会同步 Widget 与 Hook，并将 MCP 服务及运行依赖打包到 `plugins/conversation-navigator/mcp/server.mjs`。安装插件的普通用户无需执行构建或 `npm install`。

目录结构：

```text
.agents/plugins/marketplace.json       Codex marketplace
mcp/                                   MCP 源码与 Widget 源码
scripts/                               Hook 与插件构建脚本
plugins/conversation-navigator/        可直接安装的插件包
tests/                                 Hook、资源和工具契约测试
```

## 兼容范围

自动追加依赖 Codex 的 `Stop` 生命周期 Hook。通用 ChatGPT MCP App 可以复用 Widget 和 `show_next_steps` 工具，但无法获得同样的逐轮 Stop Hook 行为。

## License

[MIT](./LICENSE)。打包依赖的许可证见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
