# Conversation Navigator / 对话导航

一个面向 Codex 桌面 App 的中文对话导航插件。每次正文回答完成后，它会在回答下方追加一个 MCP Widget，提供 3–5 个可编辑的下一步方向。

## 功能

- 正文完成后再显示建议卡片，不抢在回答前面。
- 支持创意脑暴、理性推演、感性共鸣三种导航性格。
- 每轮可选择 3、4 或 5 个建议。
- 每条建议包含明确目标、具体动作和可验证交付物。
- 点击建议后展开编辑框，修改后发送回当前任务。
- Hook、MCP 服务和 Widget 在本机运行，不需要公网地址、OAuth、OpenAI API Key 或额外数据库。

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
- 当前版本已在 macOS 和 Codex App 内置 CLI `0.146.0-alpha.9.2` 验证；Windows 尚未验证。

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

### 两轮快速验收

新建任务后依次发送：

```text
第一轮测试：请用一句话介绍这个项目。
```

等建议卡片出现后，再发送：

```text
第二轮测试：请说明这个项目目前最大的限制。
```

两次正文下方都出现新的建议卡片，即表示 MCP、Stop Hook 和连续调用均已生效。

## 使用

Widget 右上角可以切换导航性格和建议数量：

- 创意脑暴：强调发散、意外联系和明显不同的创意路径。
- 理性推演：强调事实、约束、风险、优先级和验证。
- 感性共鸣：强调受众感受、情绪、叙事语气和审美体验。

单击建议会展开编辑框。确认文字后再发送，发送内容会回到当前 Codex 任务。双击建议会立即发送，请在无需修改建议时使用。

## 更新

```bash
codex plugin marketplace upgrade conversation-navigator
codex plugin remove conversation-navigator@conversation-navigator
codex plugin add conversation-navigator@conversation-navigator
```

插件升级后请重新打开 `/hooks`。Hook 定义发生变化时，Codex 会要求重新审阅和信任。

## 停用与卸载

- 暂停自动追加：在 `/hooks` 中停用对话导航的 Stop Hook。
- 完全卸载：

  ```bash
  codex plugin remove conversation-navigator@conversation-navigator
  ```

- 如果以后不再使用这个仓库提供的任何插件，可继续移除 Marketplace：

  ```bash
  codex plugin marketplace remove conversation-navigator
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
- 当前任务内容、建议生成以及发送后的草稿仍会经过 Codex 主机和当前模型，并遵循用户现有的 Codex 数据设置。

## 已知限制

- 每次自动导航会增加一次模型续回合，因此会增加少量延迟和令牌使用。
- Stop Hook 是全局开关，当前没有逐任务启停设置；多个 Stop Hook 可能同时运行。
- 自动工具调用由模型执行，无法保证每轮 100% 命中，手动入口可用于恢复。
- Hook 会在每次非空回答后触发，简单确认或状态通知也可能出现建议卡片。
- Widget 草稿、性格和数量偏好当前没有跨实例持久化，重载、重启或新任务后可能恢复默认值。
- 旧任务可能保留安装前的 MCP 或 Widget 快照，升级后应新建任务验证。

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

自动追加依赖 Codex 的 `Stop` 生命周期 Hook。通用 ChatGPT MCP App 可以复用 Widget 和 `show_next_steps` 工具，但需要额外部署 Streamable HTTP MCP 服务，也无法获得同样的逐轮 Stop Hook 行为。当前仓库不能直接作为 ChatGPT App 安装。

## License

[MIT](./LICENSE)。打包依赖的许可证见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
