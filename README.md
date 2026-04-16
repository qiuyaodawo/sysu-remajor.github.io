# SYSU-ReMajor

中山大学非官方转专业信息交流站点，基于 Quartz 构建。

## 项目信息

- 网站: [http://sysu-remajor.github.io](http://sysu-remajor.github.io)
- 邮箱: [sysu-remajor@proton.me](mailto:sysu-remajor@proton.me)
- 地区: China

## 仓库结构

- `content/`: 内容主目录，同时也是 Obsidian Vault
- `content/assert/`: 图片、PDF 等静态资源目录
- `content/template/`: Obsidian 模板目录

> [!NOTE]
> `content/.obsidian` 已配置：
>
> - `attachmentFolderPath = assert`
> - templates folder = `template`

## 本地开发

```bash
npm ci
npx quartz build --serve
```

## 构建

```bash
npx quartz build
```

构建产物位于 `public/`。

## 部署

仓库使用 GitHub Actions 自动部署到 GitHub Pages。

- 工作流文件：`.github/workflows/deploy-pages.yml`
- 触发条件：推送到 `main` 分支或手动触发

## Chatbot 环境变量

Chatbot 当前依赖以下 3 个环境变量：

- `CHATBOT_API_KEY`
- `CHATBOT_API_BASE`
- `CHATBOT_MODEL`

本地开发时，可参考仓库根目录下的 [`.env.example`](.env.example) 新建 `.env`：

```env
CHATBOT_API_KEY=your_chatbot_api_key_here
CHATBOT_API_BASE=https://your-domain.com/v1
CHATBOT_MODEL=gpt-5.4-mini
```

GitHub Pages 部署时，请在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

- `CHATBOT_API_KEY`：建议放在 `Secrets`
- `CHATBOT_API_BASE`：可放在 `Variables`，也可放在 `Secrets`
- `CHATBOT_MODEL`：可放在 `Variables`，也可放在 `Secrets`

当前工作流会在构建前校验这 3 个变量是否存在，并要求 `CHATBOT_API_BASE` 使用 `https://`。

注意：当前项目是纯前端静态部署，构建时注入到页面里的配置最终会暴露给浏览器端。若要避免 API Key 暴露，需要额外使用代理层，例如 Cloudflare Worker。

## 贡献入口

详细规范请看 [`content/如何参与贡献.md`](content/如何参与贡献.md)
