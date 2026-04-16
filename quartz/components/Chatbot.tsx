import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/chatbot.scss"
// @ts-ignore
import script from "./scripts/chatbot.inline"
import { classNames } from "../util/lang"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const CHATBOT_ENV_KEYS = ["CHATBOT_API_KEY", "CHATBOT_API_BASE", "CHATBOT_MODEL"] as const

function loadEnvIfNeeded() {
  if (CHATBOT_ENV_KEYS.every((key) => (process.env[key] ?? "").trim())) {
    return
  }

  try {
    const envPath = resolve(process.cwd(), ".env")
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eqIndex = trimmed.indexOf("=")
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim()
          const value = trimmed.slice(eqIndex + 1).trim()
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      }
    }
  } catch {
    // Ignore .env parse failures in CI/CD. GitHub Actions should provide env vars.
  }
}

loadEnvIfNeeded()

export default (() => {
  const Chatbot: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    const apiKey = (process.env.CHATBOT_API_KEY ?? "").trim()
    const apiBase = (process.env.CHATBOT_API_BASE ?? "").trim()
    const model = (process.env.CHATBOT_MODEL ?? "").trim()

    return (
      <div
        class={classNames(displayClass, "chatbot-page")}
        data-api-key={apiKey}
        data-api-base={apiBase}
        data-model={model}
      >
        <div class="chatbot-chat">
          <div class="chatbot-messages" id="chatbot-messages">
            <div class="chatbot-welcome">
              <div class="chatbot-welcome-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"></path>
                </svg>
              </div>
              <h3>你好！我是转专业 AI 助手 ✨</h3>
              <p>
                我可以根据站内知识库回答你关于中山大学转专业的各类问题。
                <br />
                请注意，我的回答仅供参考，具体政策请以教务部和学院当年通知为准。
              </p>
            </div>
            <div class="chatbot-presets" id="chatbot-presets">
              <button class="chatbot-preset-btn" data-question="转专业的基本流程是什么？">
                <span class="chatbot-preset-icon">📋</span>
                <span>转专业的基本流程</span>
              </button>
              <button class="chatbot-preset-btn" data-question="计算机学院的转入要求是什么？">
                <span class="chatbot-preset-icon">💻</span>
                <span>计算机学院转入要求</span>
              </button>
              <button class="chatbot-preset-btn" data-question="转专业会影响保研吗？">
                <span class="chatbot-preset-icon">🎯</span>
                <span>转专业与保研</span>
              </button>
              <button class="chatbot-preset-btn" data-question="2024到2025年转专业政策有哪些主要变化？">
                <span class="chatbot-preset-icon">📊</span>
                <span>近年政策变化速览</span>
              </button>
              <button class="chatbot-preset-btn" data-question="有哪些学院可以转入？各学院的接收计划是怎样的？">
                <span class="chatbot-preset-icon">🏫</span>
                <span>各学院接收计划</span>
              </button>
              <button class="chatbot-preset-btn" data-question="转专业考核一般考什么？如何准备笔试和面试？">
                <span class="chatbot-preset-icon">📝</span>
                <span>考核内容与备考</span>
              </button>
            </div>
          </div>

          <div class="chatbot-input-area">
            <div class="chatbot-input-wrapper">
              <textarea
                class="chatbot-input"
                id="chatbot-input"
                placeholder="向“转专业助手”提问 (Shift+Enter 换行)..."
                rows={1}
              ></textarea>
              <div class="chatbot-actions-group">
                <button class="chatbot-clear" id="chatbot-clear" aria-label="清空对话" title="新对话">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <button class="chatbot-send" id="chatbot-send" aria-label="发送">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
            <div class="chatbot-disclaimer">
              基于站内知识库 · 回答仅供参考 · 以教务部当年通知为准
            </div>
          </div>
        </div>
      </div>
    )
  }

  Chatbot.css = style
  Chatbot.afterDOMLoaded = script
  return Chatbot
}) satisfies QuartzComponentConstructor
