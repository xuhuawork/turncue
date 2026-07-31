# TurnCue

[中文](./README.md) | [English](./README.en.md)

TurnCue 是面向 Codex 桌面 App 的本地对话导航插件。每次正文回答完成后，它会在回答下方追加一个 MCP Widget，提供 3–5 个可编辑的下一步方向。

公开品牌为 **TurnCue**。为了兼容现有安装、配置和自动化，插件、Marketplace 与 MCP 的技术 ID 继续使用 `conversation-navigator`。

## 功能

- 正文完成后再显示建议卡片。
- 支持自动、中文和 English 三种语言设置。
- 支持创意脑暴、理性推演、感性共鸣三种导航人格。
- 每轮可选择 3、4 或 5 个建议。
- 每条建议包含当前目标、具体动作和可验证交付物。
- 单击建议后展开编辑框；修改后可以发送回当前任务。
- Hook、MCP 服务和 Widget 在本机运行，无需公网地址、OAuth、OpenAI API Key 或额外数据库。

## 语言与人格

Widget 右上角的偏好菜单提供三种语言设置：

- **自动**：优先跟随最近一条实质用户请求的语言；无法判断时使用 Codex 主机语言。
- **中文**：后续建议固定使用中文。
- **English**：后续建议固定使用英文。

语言切换会立即更新 Widget 的固定界面文案，并从下一轮开始影响新建议。已经生成的建议不会被自动翻译。

三种人格使用稳定的技术 ID，切换语言不会改变现有配置：

- **创意脑暴 / Brainstorm** (`brainstorm`)：强调发散、意外联系和明显不同的创意路径。
- **理性推演 / Rational** (`rational`)：强调事实、约束、风险、优先级和验证。
- **感性共鸣 / Empathic** (`empathic`)：强调受众感受、情绪、叙事语气和审美体验。

## 工作顺序

```text
Codex 完成正文 → Stop Hook 触发 → TurnCue 续回合调用 show_next_steps → Widget 出现在正文下方
```

该顺序已经在 macOS 与 Codex App 内置 CLI `0.146.0-alpha.9.2` 中做过端到端验证：正文 `agent_message` 先完成，随后才出现 `conversation-navigator/show_next_steps` 工具调用。

自动工具调用由模型执行，属于高召回设计。模型漏调、参数校验失败或 MCP 未加载时，卡片仍可能缺席。此时可以输入“显示建议卡片”“刷新下一步建议”或 “Show next steps”。

## 安装

要求：

- Codex 桌面 App；插件管理命令由带插件功能的 Codex CLI 提供。
- Node.js 22.13 或更高版本。
- 当前版本已在 macOS 验证；Windows 尚未验证。

先检查环境：

```bash
codex --version
node --version
```

然后安装 Marketplace 与插件：

```bash
codex plugin marketplace add xuhuawork/conversation-navigator
codex plugin add conversation-navigator@conversation-navigator
```

安装后：

1. 完全退出并重新打开 Codex。
2. 在 Codex 中打开 `/hooks`。
3. 核对命令为 `node "${PLUGIN_ROOT}/scripts/auto-navigation-stop-hook.mjs"`。
4. 信任并启用状态为“TurnCue 正在整理下一步 / Preparing next steps…”的 Hook。
5. 新建一个任务并正常提问。正文完成后，建议卡片会自动追加在下方。

安装或启用插件不会自动信任其中的 Hook。更新后的 Hook 定义发生变化时，也需要重新审阅和信任。

无需先说“开启 TurnCue”。这句话可以用于首次验收；手动入口可以在自动触发失败时恢复卡片。

## 快速验收

先确认插件已启用：

```bash
codex plugin list --json
```

新建任务后依次测试：

1. 发送“第一轮测试：请用一句话介绍 TurnCue。”
2. 确认正文先完整出现，随后出现 3 条建议。
3. 单击一条建议，修改草稿，再点击“发送到对话”。
4. 把语言切到 English、人格切到 Brainstorm、数量切到 5。
5. 等当前任务完成下一轮正文，确认新卡片包含 5 条英文建议。
6. 再切到中文、感性共鸣和 4 条，确认下一轮出现 4 条中文建议。
7. 切回自动，在中英文请求之间切换，确认建议跟随最近一条实质请求。

双击建议会立即发送，不会先停留在编辑框中。

## 使用

- 单击建议：填入 Widget 编辑框，允许修改后发送。
- 双击建议：立即发送原建议。
- `Command/Ctrl + Enter`：发送当前草稿。
- 外观菜单：跟随系统、浅色或深色，并可选择强调色。
- 偏好菜单：选择语言、人格和每轮 3–5 条建议。

偏好通过当前任务的模型上下文传递，从下一轮生成开始生效。当前版本没有跨任务的全局偏好保存。

## 更新

```bash
codex plugin marketplace upgrade conversation-navigator
codex plugin remove conversation-navigator@conversation-navigator
codex plugin add conversation-navigator@conversation-navigator
```

更新后：

1. 完全退出并重新打开 Codex。
2. 打开 `/hooks`，重新核对并信任 TurnCue Hook。
3. 新建任务测试。旧任务可能保留更新前的 MCP、工具或 Widget 快照。

## 停用与卸载

- 暂停自动追加：在 `/hooks` 中停用 TurnCue 的 Stop Hook。
- 移除插件：

  ```bash
  codex plugin remove conversation-navigator@conversation-navigator
  ```

- 如果以后不再使用这个仓库提供的任何插件，可继续移除 Marketplace：

  ```bash
  codex plugin marketplace remove conversation-navigator
  ```

Hook 的启用或停用是全局设置，当前没有逐任务开关。

## 故障排查

1. 运行 `codex plugin list`，确认 `conversation-navigator@conversation-navigator` 为 enabled。
2. 打开 `/hooks`，确认 TurnCue Hook 已信任并启用。
3. 完全重启 Codex，再新建任务。
4. 输入“显示建议卡片”或 “Show next steps”。能手动显示通常说明 MCP 正常，问题位于 Hook 信任或自动触发环节。
5. 检查 `node --version` 是否满足要求。
6. 更新后仍显示旧界面时，重新执行更新流程，并确认新任务读取 `widget-v16.html`。

## 隐私与数据边界

- Widget 的 CSP 外部域名白名单为空。
- Widget 不加载外链脚本、图片、字体，也不主动发起网络请求。
- MCP 服务在本机通过 stdio 运行；Stop Hook 在内存中处理 Codex 传入的事件，不读取 transcript 文件、不写入对话数据库。
- 插件不保存用户画像、API Key 或遥测数据。
- 当前任务内容、建议生成、语言偏好同步以及发送后的草稿仍会经过 Codex 主机和当前模型，并遵循用户现有的 Codex 数据设置。

安全问题请按 [SECURITY.md](./SECURITY.md) 私密报告。

## 已知限制

- 每次自动导航会增加一次模型续回合，因此会增加少量延迟和令牌使用。
- 自动工具调用由模型执行，无法保证每轮 100% 命中。
- Hook 会在每次非空回答后触发，简单确认或状态通知也可能出现建议卡片。
- Stop Hook 是全局开关；多个 Stop Hook 可能同时运行。
- 草稿、外观和导航偏好目前不会跨任务持久保存，重载或重启后可能恢复默认值。
- 自动语言判断在高度混合的中英文请求中可能选择错误，可用手动语言设置覆盖。
- 旧任务可能保留安装前的工具或 Widget 快照。
- Windows 尚未验证。

## 开发

```bash
npm ci
npm run validate
```

`npm run build:plugin` 会同步中英文 README、Widget 与 Hook，并将 MCP 服务及运行依赖打包到 `plugins/conversation-navigator/mcp/server.mjs`。安装用户无需执行构建或 `npm install`。

目录结构：

```text
.agents/plugins/marketplace.json       Codex Marketplace
mcp/                                   MCP 与 Widget 源码
scripts/                               Hook 与插件构建脚本
plugins/conversation-navigator/        可直接安装的插件包
tests/                                 Hook、资源和工具契约测试
```

## 兼容范围

自动追加依赖 Codex 的 `Stop` 生命周期 Hook。通用 ChatGPT MCP App 可以复用 Widget 和 `show_next_steps` 工具，但需要额外部署 Streamable HTTP MCP 服务，也无法获得相同的逐轮 Stop Hook 行为。当前仓库不能直接作为 ChatGPT App 安装。

## License

[MIT](./LICENSE)。打包依赖的许可证见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
