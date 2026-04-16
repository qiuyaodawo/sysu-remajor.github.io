import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import { FullSlug, getFullSlug, resolveRelative } from "../../util/path"

type ContentIndex = Record<FullSlug, ContentDetails>
type ChatRole = "user" | "assistant"
type IntentType =
  | "policy"
  | "eligibility"
  | "process"
  | "timeline"
  | "academy_info"
  | "academy_compare"
  | "exam"
  | "secondary_selection"
  | "community"
  | "general"
type SourceType =
  | "official_policy"
  | "academy_summary"
  | "editorial_summary"
  | "secondary_selection"
  | "exam_recall"
  | "community"
  | "general"
type ReviewConfidence = "high" | "medium" | "low"
type EvidenceFacet = "eligibility" | "exam" | "process" | "timeline" | "quota" | "grade" | "general"
type MetadataPrimitive = string | number | boolean

interface RawChatbotDocumentMetadata {
  sourceType?: MetadataPrimitive
  policyYear?: MetadataPrimitive | MetadataPrimitive[]
  academy?: MetadataPrimitive
  authority?: MetadataPrimitive
  isOfficial?: MetadataPrimitive
  faculty?: MetadataPrimitive
  campus?: MetadataPrimitive
}

interface ChatbotDocumentMetadata {
  sourceType?: SourceType
  policyYear?: string[]
  academy?: string
  authority?: string
  isOfficial?: boolean
  faculty?: string
  campus?: string
}

type ContentDocument = ContentDetails & { metadata?: RawChatbotDocumentMetadata }

interface SessionProfile {
  academies: string[]
  years: string[]
  topics: string[]
  preferredSourceTypes: SourceType[]
  compareMode: boolean
}

interface StoredCitation {
  label?: string
  chunkId: string
  slug: FullSlug
  title: string
  sourceType: SourceType
  academy: string
  years: string[]
}

interface StoredAssistantMeta {
  citations: StoredCitation[]
  conflicts: string[]
  missingOfficialEvidence: boolean
  confidence: ReviewConfidence
}

interface StoredMessage {
  role: ChatRole
  content: string
  meta?: StoredAssistantMeta
}

interface StoredSession {
  profile: SessionProfile
  history: StoredMessage[]
  rollingSummary?: string
}

interface PlannerResult {
  intent: IntentType
  academies: string[]
  years: string[]
  topics: string[]
  compareMode: boolean
  preferLatest: boolean
  needClarification: boolean
  clarificationQuestion: string
  queryVariants: string[]
  preferredSourceTypes: SourceType[]
}

interface ContextualizedPlan extends PlannerResult {
  standaloneQuestion: string
  rollingSummary: string
}

interface EffectiveTurn {
  questionForModel: string
  isSupplement: boolean
}

interface KnowledgeChunk {
  id: string
  slug: FullSlug
  title: string
  content: string
  preview: string
  sourceType: SourceType
  academy: string
  authority: string
  isOfficial: boolean
  years: string[]
  maxYear: number
  tags: string[]
  metadata: ChatbotDocumentMetadata
  titleTokens: Set<string>
  contentTokens: Set<string>
  normalizedTitle: string
  normalizedContent: string
}

interface RetrievedChunk {
  chunk: KnowledgeChunk
  score: number
  reasons: string[]
}

interface ReviewResult {
  approvedIds: string[]
  rejectedIds: string[]
  conflicts: string[]
  missingOfficialEvidence: boolean
  confidence: ReviewConfidence
  answerStrategy: string
}

interface EvidenceCard {
  label: string
  chunk: KnowledgeChunk
}

interface KnowledgeBase {
  chunks: KnowledgeChunk[]
  chunksById: Map<string, KnowledgeChunk>
  academies: string[]
  academyAliases: Map<string, string[]>
  tokenDocumentFrequency: Map<string, number>
}

interface ChatConfig {
  apiKey: string
  apiBase: string
  model: string
}

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface ChatbotState {
  knowledgeBasePromise?: Promise<KnowledgeBase>
  runtime?: ChatbotRuntime | null
}

const STORAGE_KEY = "sysu-remajor-chatbot-v2"
const MAX_HISTORY = 12
const MAX_RETRIEVED = 12
const MAX_APPROVED = 6
const CHUNK_MIN = 320
const CHUNK_MAX = 860
const INTENT_VALUES: IntentType[] = [
  "policy",
  "eligibility",
  "process",
  "timeline",
  "academy_info",
  "academy_compare",
  "exam",
  "secondary_selection",
  "community",
  "general",
]
const SOURCE_TYPE_VALUES: SourceType[] = [
  "official_policy",
  "academy_summary",
  "editorial_summary",
  "secondary_selection",
  "exam_recall",
  "community",
  "general",
]
const REVIEW_CONFIDENCE_VALUES: ReviewConfidence[] = ["high", "medium", "low"]
const SOURCE_LABELS: Record<SourceType, string> = {
  official_policy: "官方政策",
  academy_summary: "学院页面",
  editorial_summary: "站内整理",
  secondary_selection: "二次遴选",
  exam_recall: "历年真题/回忆",
  community: "经验社区",
  general: "其他资料",
}
const TOPIC_HINTS = [
  "转专业",
  "转入",
  "转出",
  "资格",
  "要求",
  "条件",
  "流程",
  "时间",
  "名额",
  "GPA",
  "绩点",
  "排名",
  "材料",
  "面试",
  "笔试",
  "考核",
  "复习",
  "真题",
  "保研",
  "二次遴选",
]
const MANUAL_ALIAS_OVERRIDES: Record<string, string[]> = {
  计算机学院: ["计算机", "计院", "转计", "计科"],
  数学学院: ["数学", "数院"],
  物理学院: ["物理", "物院"],
  化学学院: ["化学", "化院"],
  生命科学学院: ["生科", "生命科学"],
  管理学院: ["管院", "管理"],
  外国语学院: ["外院", "外国语"],
}
const SOURCE_LABELS_ZH: Record<SourceType, string> = {
  official_policy: "官方政策",
  academy_summary: "学院页面",
  editorial_summary: "站内整理",
  secondary_selection: "二次遴选",
  exam_recall: "历年真题/回忆",
  community: "经验社区",
  general: "其他资料",
}
const TOPIC_HINTS_ZH = [
  "转专业",
  "转入",
  "转出",
  "资格",
  "要求",
  "条件",
  "流程",
  "时间",
  "名额",
  "GPA",
  "绩点",
  "排名",
  "材料",
  "面试",
  "笔试",
  "考核",
  "备考",
  "真题",
  "保研",
  "二次遴选",
]
const MANUAL_ALIAS_OVERRIDES_ZH: Record<string, string[]> = {
  计算机学院: ["计算机", "计院", "转计", "计科"],
  数学学院: ["数学", "数院"],
  物理学院: ["物理", "物院"],
  化学学院: ["化学", "化院"],
  生命科学学院: ["生科", "生命科学"],
  管理学院: ["管院", "管理"],
  外国语学院: ["外院", "外国语"],
}
const EMPTY_PROFILE: SessionProfile = {
  academies: [],
  years: [],
  topics: [],
  preferredSourceTypes: [],
  compareMode: false,
}
const STOP_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>'

const chatbotState = globalThis as typeof globalThis &
  Window & { __sysuRemajorChatbotState?: ChatbotState }

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/\r/g, "\n")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[，。！？；：、（）【】《》]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripMarkupNoise(input: string): string {
  return input.replace(/\s+/g, " ").replace(/\[[^\]]+\]\([^)]+\)/g, " ").trim()
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function sourceLabel(sourceType: SourceType): string {
  return SOURCE_LABELS_ZH[sourceType] ?? SOURCE_LABELS[sourceType] ?? sourceType
}

function mergeLimited(current: string[], incoming: string[], limit: number): string[] {
  return unique([...incoming, ...current]).filter(Boolean).slice(0, limit)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function recentConversationSummary(history: StoredMessage[], limit = 4): string {
  return history
    .slice(-limit)
    .map((message) => `${message.role === "user" ? "用户" : "助手"}: ${stripMarkupNoise(message.content)}`)
    .join("\n")
}

function looksLikeClarificationRequest(text: string): boolean {
  const normalized = normalizeText(text)
  return [
    "请补充",
    "补充一下",
    "发我",
    "告诉我",
    "课程正式名称",
    "具体是哪个",
    "具体是哪一门",
    "哪一年",
    "哪个学院",
    "请说明",
    "我可以继续帮你判断得更准一点",
  ].some((pattern) => normalized.includes(normalizeText(pattern)))
}

function isLikelySupplementInput(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.length > 32) return false
  if (/[\n]/.test(trimmed)) return false
  if (/[?？]/.test(trimmed)) return false
  if (/^(为什么|怎么|如何|能不能|可不可以|是不是|是什么|多少|几点|几号)/.test(trimmed)) return false

  return (
    /^(20\d{2}|大一|大二|高等数学[一二三上下]?|数学分析|医科数学|计算机学院|计算机|计院|86分|\d{2,3}分)$/.test(trimmed) ||
    trimmed.length <= 12
  )
}

function mergeSupplementQuestion(previousQuestion: string, supplement: string): string {
  const normalizedPrevious = previousQuestion.trim()
  const normalizedSupplement = supplement.trim()
  const nestedMatch = /^原问题：([\s\S]+?)\n补充信息：([\s\S]+)$/.exec(normalizedPrevious)
  if (!nestedMatch) {
    return `原问题：${normalizedPrevious}\n补充信息：${normalizedSupplement}`
  }

  const originalQuestion = nestedMatch[1].trim()
  const existingSupplement = nestedMatch[2].trim()
  const mergedSupplement = existingSupplement.includes(normalizedSupplement)
    ? existingSupplement
    : `${existingSupplement}；${normalizedSupplement}`

  return `原问题：${originalQuestion}\n补充信息：${mergedSupplement}`
}

function buildEffectiveQuestion(
  currentInput: string,
  session: StoredSession,
): EffectiveTurn {
  const trimmed = currentInput.trim()
  const previousUser = [...session.history].reverse().find((message) => message.role === "user")
  const lastAssistant = [...session.history].reverse().find((message) => message.role === "assistant")

  if (
    previousUser &&
    lastAssistant &&
    looksLikeClarificationRequest(lastAssistant.content) &&
    isLikelySupplementInput(trimmed)
  ) {
    return {
      questionForModel: mergeSupplementQuestion(previousUser.content, trimmed),
      isSupplement: true,
    }
  }

  return {
    questionForModel: trimmed,
    isSupplement: false,
  }
}

function truncateSummary(text: string, maxLength = 260): string {
  const cleaned = stripMarkupNoise(text).replace(/\s+/g, " ").trim()
  if (!cleaned) return ""
  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength - 1)}…`
}

function buildRollingSummary(session: StoredSession): string {
  const facts = [
    session.profile.academies.length > 0 ? `关注学院：${session.profile.academies.join("、")}` : "",
    session.profile.years.length > 0 ? `关注年份：${session.profile.years.join("、")}` : "",
    session.profile.topics.length > 0 ? `关注问题：${session.profile.topics.slice(0, 5).join("、")}` : "",
  ].filter(Boolean)

  const recent = session.history.length > 0 ? recentConversationSummary(session.history, 4) : ""
  return truncateSummary(
    [
      session.rollingSummary ? `历史摘要：${session.rollingSummary}` : "",
      facts.join("；"),
      recent ? `最近对话：\n${recent}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  )
}

function contextualizeFallback(
  currentInput: string,
  session: StoredSession,
  knowledgeBase: KnowledgeBase,
  preparedTurn?: EffectiveTurn,
): ContextualizedPlan {
  const effectiveTurn = preparedTurn ?? buildEffectiveQuestion(currentInput, session)
  const plan = plannerFallback(effectiveTurn.questionForModel, session, knowledgeBase)

  return {
    ...plan,
    standaloneQuestion: effectiveTurn.questionForModel,
    rollingSummary: buildRollingSummary(session),
  }
}

function normalizeContextualizedPlan(
  raw: unknown,
  fallback: ContextualizedPlan,
  knowledgeBase: KnowledgeBase,
): ContextualizedPlan {
  const candidate = raw && typeof raw === "object" ? (raw as Partial<ContextualizedPlan>) : {}
  const normalizedPlan = normalizePlannerResult(candidate, fallback, knowledgeBase)
  const standaloneQuestion =
    typeof candidate.standaloneQuestion === "string"
      ? stripMarkupNoise(candidate.standaloneQuestion)
      : fallback.standaloneQuestion
  const rollingSummary =
    typeof candidate.rollingSummary === "string"
      ? truncateSummary(candidate.rollingSummary)
      : fallback.rollingSummary

  return {
    ...normalizedPlan,
    standaloneQuestion: standaloneQuestion.length >= 2 ? standaloneQuestion : fallback.standaloneQuestion,
    rollingSummary: rollingSummary || fallback.rollingSummary,
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function isMixedContentRequest(apiBase: string): boolean {
  return chatbotState.location?.protocol === "https:" && /^http:\/\//i.test(apiBase)
}

function normalizeChatEndpoint(apiBase: string): string {
  const trimmed = apiBase.trim().replace(/\/+$/, "")
  if (!trimmed) {
    throw new Error("聊天模型未配置，请在构建时注入 CHATBOT_API_BASE 和 CHATBOT_MODEL。")
  }
  if (isMixedContentRequest(trimmed)) {
    throw new Error("当前站点通过 HTTPS 打开，CHATBOT_API_BASE 不能使用 http:// 地址，否则浏览器会拦截混合内容请求。")
  }

  const rawEndpoint = trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`

  try {
    return new URL(rawEndpoint).toString()
  } catch {
    throw new Error("CHATBOT_API_BASE 不是合法 URL。")
  }
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text)
  if (!normalized) return []

  const tokens = new Set<string>()
  const latinWords = normalized.match(/[a-z0-9][a-z0-9._/-]{1,}/g) ?? []
  for (const word of latinWords) {
    tokens.add(word)
  }

  const cjkSequences = normalized.match(/[\u4e00-\u9fff]+/g) ?? []
  for (const sequence of cjkSequences) {
    if (sequence.length <= 6) {
      tokens.add(sequence)
    }
    if (sequence.length === 1) {
      tokens.add(sequence)
      continue
    }
    for (let i = 0; i < sequence.length - 1; i++) {
      tokens.add(sequence.slice(i, i + 2))
    }
    for (let i = 0; i < sequence.length - 2; i++) {
      tokens.add(sequence.slice(i, i + 3))
    }
  }

  return [...tokens]
}

function extractYears(...inputs: string[]): string[] {
  const years = new Set<string>()
  for (const input of inputs) {
    const matches = input.match(/20\d{2}/g) ?? []
    for (const year of matches) {
      years.add(year)
    }
  }
  return [...years].sort((a, b) => Number(b) - Number(a))
}

function normalizeMetadataText(value: unknown): string {
  if (typeof value === "number") return String(value)
  if (typeof value !== "string") return ""
  return stripMarkupNoise(value).replace(/\s+/g, " ").trim()
}

function normalizeMetadataBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (typeof value !== "string") return undefined

  const normalized = value.trim().toLowerCase()
  if (["true", "yes", "y", "1"].includes(normalized)) return true
  if (["false", "no", "n", "0"].includes(normalized)) return false
  return undefined
}

function normalizeMetadataYears(value: unknown): string[] {
  const rawValues = Array.isArray(value) ? value : [value]
  return unique(
    rawValues
      .flatMap((item) => extractYears(normalizeMetadataText(item)))
      .filter((year) => /^20\d{2}$/.test(year)),
  ).sort((a, b) => Number(b) - Number(a))
}

function normalizeDocumentMetadata(raw: unknown): ChatbotDocumentMetadata {
  const candidate = raw && typeof raw === "object" ? (raw as RawChatbotDocumentMetadata) : {}
  const sourceType = isSourceType(candidate.sourceType) ? candidate.sourceType : undefined
  const policyYear = normalizeMetadataYears(candidate.policyYear)
  const academy = normalizeMetadataText(candidate.academy)
  const authority = normalizeMetadataText(candidate.authority)
  const faculty = normalizeMetadataText(candidate.faculty)
  const campus = normalizeMetadataText(candidate.campus)
  const isOfficial = normalizeMetadataBoolean(candidate.isOfficial)

  return {
    ...(sourceType ? { sourceType } : {}),
    ...(policyYear.length > 0 ? { policyYear } : {}),
    ...(academy ? { academy } : {}),
    ...(authority ? { authority } : {}),
    ...(typeof isOfficial === "boolean" ? { isOfficial } : {}),
    ...(faculty ? { faculty } : {}),
    ...(campus ? { campus } : {}),
  }
}

function isSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && SOURCE_TYPE_VALUES.includes(value as SourceType)
}

function maxYear(years: string[]): number {
  if (years.length === 0) return 0
  return Math.max(...years.map((year) => Number(year)))
}

function normalizeEntityName(input: string): string {
  return input.replace(/[()（）]/g, " ").replace(/\s+/g, " ").trim()
}

function collectAliases(name: string): string[] {
  const cleaned = normalizeEntityName(name)
  const aliases = new Set<string>([cleaned])
  aliases.add(cleaned.replace(/学院|学部|系$/g, "").trim())
  aliases.add(cleaned.replace(/\s+/g, ""))

  const manual = [...(MANUAL_ALIAS_OVERRIDES[cleaned] ?? []), ...(MANUAL_ALIAS_OVERRIDES_ZH[cleaned] ?? [])]
  for (const alias of manual) {
    aliases.add(alias)
  }

  return [...aliases].filter((alias) => alias.length >= 2)
}

function detectSourceType(slug: FullSlug): SourceType {
  if (slug.startsWith("政策与细则/")) return "official_policy"
  if (slug.startsWith("学院/") && slug.includes("/历年政策/")) return "official_policy"
  if (slug.startsWith("学院/") && slug.includes("/历年真题/")) return "exam_recall"
  if (slug.startsWith("学院/")) return "academy_summary"
  if (slug.startsWith("经验与社区/")) return "community"
  if (slug.startsWith("9月二次遴选/")) return "secondary_selection"
  if (slug.startsWith("FAQ") || slug.startsWith("5月转院系专业/")) return "editorial_summary"
  return "general"
}

function resolveSourceType(slug: FullSlug, metadata: ChatbotDocumentMetadata): SourceType {
  return metadata.sourceType ?? detectSourceType(slug)
}

function detectAcademy(slug: FullSlug, title: string): string {
  const slugMatch = /^学院\/([^/]+)/.exec(slug)
  if (slugMatch) {
    return normalizeEntityName(slugMatch[1])
  }

  const titleMatches = title.match(/[\u4e00-\u9fffA-Za-z0-9]+(?:学院|学部|系)/g) ?? []
  const firstMatch = titleMatches[0]
  return firstMatch ? normalizeEntityName(firstMatch) : ""
}

function resolveAcademy(slug: FullSlug, title: string, metadata: ChatbotDocumentMetadata): string {
  return metadata.academy ? normalizeEntityName(metadata.academy) : detectAcademy(slug, title)
}

function resolveYears(
  slug: FullSlug,
  title: string,
  tags: string[],
  content: string,
  metadata: ChatbotDocumentMetadata,
): string[] {
  const metadataYears = metadata.policyYear ?? []
  if (metadataYears.length > 0) {
    return metadataYears
  }

  return extractYears(slug, title, tags.join(" "), content.slice(0, 800))
}

function resolveAuthority(
  metadata: ChatbotDocumentMetadata,
  academy: string,
  title: string,
  sourceType: SourceType,
): string {
  if (metadata.authority) return metadata.authority
  if (sourceType === "official_policy") {
    return academy || title
  }
  return ""
}

function splitLongText(text: string): string[] {
  if (text.length <= CHUNK_MAX) return [text]

  const pieces: string[] = []
  let current = ""
  const sentences = text.split(/(?<=[。！？；])/)

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue
    if ((current + trimmed).length > CHUNK_MAX && current) {
      pieces.push(current.trim())
      current = trimmed
    } else {
      current += `${trimmed} `
    }
  }

  if (current.trim()) {
    pieces.push(current.trim())
  }

  return pieces
}

function chunkDocument(text: string): string[] {
  const normalized = text.replace(/\r/g, "\n").replace(/\t/g, " ").trim()
  if (!normalized) return []

  const rawSections = normalized
    .split(/\n{2,}|(?=\n[一二三四五六七八九十]+、)|(?=\n\d+[.、])|(?=\n[-*]\s)/)
    .flatMap((section) => splitLongText(section.trim()))
    .filter(Boolean)

  const chunks: string[] = []
  let buffer = ""

  for (const section of rawSections) {
    if (!buffer) {
      buffer = section
      continue
    }

    if ((buffer + "\n" + section).length <= CHUNK_MAX) {
      buffer += `\n${section}`
      continue
    }

    chunks.push(buffer.trim())
    buffer = section
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim())
  }

  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1]
    if (last.length < CHUNK_MIN) {
      chunks[chunks.length - 2] = `${chunks[chunks.length - 2]}\n${last}`.trim()
      chunks.pop()
    }
  }

  return chunks.filter((chunk) => chunk.length > 40)
}

function buildKnowledgeBase(data: ContentIndex): KnowledgeBase {
  const chunks: KnowledgeChunk[] = []
  const chunksById = new Map<string, KnowledgeChunk>()
  const academies = new Set<string>()
  const academyAliases = new Map<string, string[]>()
  const tokenDocumentFrequency = new Map<string, number>()

  for (const [slug, doc] of Object.entries<ContentDetails>(data) as Array<[FullSlug, ContentDetails]>) {
    const title = doc.title ?? slug
    const metadata = normalizeDocumentMetadata((doc as ContentDocument).metadata)
    const sourceType = resolveSourceType(slug, metadata)
    const academy = resolveAcademy(slug, title, metadata)
    const years = resolveYears(slug, title, doc.tags ?? [], doc.content, metadata)
    const authority = resolveAuthority(metadata, academy, title, sourceType)
    const isOfficial = metadata.isOfficial ?? sourceType === "official_policy"
    const allChunks = chunkDocument(doc.content)

    if (academy) {
      academies.add(academy)
      academyAliases.set(academy, collectAliases(academy))
    }

    const materializedChunks = allChunks.length > 0 ? allChunks : [doc.content]
    materializedChunks.forEach((content, index) => {
      const id = `${slug}#${index + 1}`
      const preview = content.replace(/\s+/g, " ").slice(0, 180)
      const chunk: KnowledgeChunk = {
        id,
        slug,
        title,
        content,
        preview,
        sourceType,
        academy,
        authority,
        isOfficial,
        years,
        maxYear: maxYear(years),
        tags: doc.tags ?? [],
        metadata,
        titleTokens: new Set(tokenize(`${title} ${(doc.tags ?? []).join(" ")} ${academy}`)),
        contentTokens: new Set(tokenize(content)),
        normalizedTitle: normalizeText(title),
        normalizedContent: normalizeText(content),
      }

      chunks.push(chunk)
      chunksById.set(chunk.id, chunk)

      const combinedTokens = new Set<string>([...chunk.titleTokens, ...chunk.contentTokens])
      for (const token of combinedTokens) {
        tokenDocumentFrequency.set(token, (tokenDocumentFrequency.get(token) ?? 0) + 1)
      }
    })
  }

  return {
    chunks,
    chunksById,
    academies: [...academies].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
    academyAliases,
    tokenDocumentFrequency,
  }
}

function getKnowledgeBase(): Promise<KnowledgeBase> {
  if (!chatbotState.__sysuRemajorChatbotState) {
    chatbotState.__sysuRemajorChatbotState = {}
  }

  const state = chatbotState.__sysuRemajorChatbotState

  if (!state.knowledgeBasePromise) {
    state.knowledgeBasePromise = fetchData
      .then((data) => buildKnowledgeBase(data as ContentIndex))
      .catch((error) => {
        state.knowledgeBasePromise = undefined
        throw error
      })
  }

  return state.knowledgeBasePromise
}

function defaultPreferredSourceTypes(intent: IntentType): SourceType[] {
  switch (intent) {
    case "policy":
    case "eligibility":
    case "process":
    case "timeline":
      return ["official_policy", "academy_summary", "editorial_summary"]
    case "academy_compare":
    case "academy_info":
      return ["official_policy", "academy_summary", "editorial_summary"]
    case "exam":
      return ["official_policy", "editorial_summary", "exam_recall", "community"]
    case "secondary_selection":
      return ["secondary_selection", "official_policy", "editorial_summary"]
    case "community":
      return ["community", "editorial_summary", "official_policy"]
    default:
      return ["official_policy", "academy_summary", "editorial_summary"]
  }
}

function heuristicIntent(question: string): IntentType {
  if (/二次遴选/.test(question)) return "secondary_selection"
  if (/比较|对比|区别|哪个好|哪家|谁更/.test(question)) return "academy_compare"
  if (/真题|笔试|面试|考核|复习|备考|怎么考|如何考|怎么准备|如何准备/.test(question)) return "exam"
  if (/资格|条件|要求|绩点|gpa|排名|保研/.test(question.toLowerCase())) return "eligibility"
  if (/流程|步骤|怎么转|怎么办|申请/.test(question)) return "process"
  if (/时间|什么时候|几月|截止|节点/.test(question)) return "timeline"
  if (/经验|建议|社区|上岸/.test(question)) return "community"
  if (/学院|专业|接收|名额/.test(question)) return "academy_info"
  if (/政策|细则|通知|办法/.test(question)) return "policy"
  return "general"
}

function heuristicTopics(question: string): string[] {
  const topics = unique([
    ...TOPIC_HINTS.filter((hint) => question.includes(hint)),
    ...TOPIC_HINTS_ZH.filter((hint) => question.includes(hint)),
  ])
  const tokens = tokenize(question).filter((token) => token.length >= 2 && token.length <= 8)
  return unique([...topics, ...tokens]).slice(0, 8)
}

function detectAcademiesFromQuestion(question: string, knowledgeBase: KnowledgeBase): string[] {
  const hits: Array<{ academy: string; alias: string }> = []

  for (const [academy, aliases] of knowledgeBase.academyAliases.entries()) {
    for (const alias of aliases) {
      if (question.includes(alias)) {
        hits.push({ academy, alias })
      }
    }
  }

  return unique(
    hits
      .sort((a, b) => b.alias.length - a.alias.length)
      .map((item) => item.academy),
  ).slice(0, 4)
}

function heuristicPlan(
  question: string,
  session: StoredSession,
  knowledgeBase: KnowledgeBase,
): PlannerResult {
  const academies = detectAcademiesFromQuestion(question, knowledgeBase)
  const fallbackAcademies =
    academies.length > 0 || !/这个|该院|这边|它/.test(question)
      ? academies
      : session.profile.academies.slice(0, 2)
  const years = extractYears(question)
  const intent = heuristicIntent(question)
  const compareMode = /比较|对比|区别|哪个好|哪家|谁更/.test(question) || fallbackAcademies.length > 1
  const preferLatest =
    /最新|当前|现在|今年|近年|最近/.test(question) ||
    (years.length === 0 && ["policy", "eligibility", "process", "timeline"].includes(intent))
  const needClarification =
    fallbackAcademies.length === 0 &&
    (intent === "academy_info" || intent === "academy_compare" || /哪个学院|哪个专业/.test(question))

  return {
    intent,
    academies: fallbackAcademies,
    years,
    topics: heuristicTopics(question),
    compareMode,
    preferLatest,
    needClarification,
    clarificationQuestion: needClarification ? "你想问哪个学院或专业？最好带上年份。" : "",
    queryVariants: unique(
      [
        question,
        ...fallbackAcademies,
        ...years,
        ...heuristicTopics(question).slice(0, 4),
        ...session.profile.topics.slice(0, 2),
      ].filter(Boolean),
    ).slice(0, 6),
    preferredSourceTypes:
      session.profile.preferredSourceTypes.length > 0
        ? unique([
            ...defaultPreferredSourceTypes(intent),
            ...session.profile.preferredSourceTypes,
          ]).slice(0, 5) as SourceType[]
        : defaultPreferredSourceTypes(intent),
    }
}

function idf(token: string, knowledgeBase: KnowledgeBase): number {
  const df = knowledgeBase.tokenDocumentFrequency.get(token) ?? 0
  const total = Math.max(knowledgeBase.chunks.length, 1)
  return Math.log(1 + total / (1 + df))
}

function scoreChunk(
  chunk: KnowledgeChunk,
  question: string,
  plan: PlannerResult,
  knowledgeBase: KnowledgeBase,
): RetrievedChunk | null {
  const reasons: string[] = []
  let score = 0
  const queryTokens = unique(
    tokenize(
      [
        question,
        ...plan.queryVariants,
        ...plan.topics,
        ...plan.academies,
        ...plan.years,
      ].join(" "),
    ),
  )

  for (const token of queryTokens) {
    if (chunk.titleTokens.has(token)) {
      score += idf(token, knowledgeBase) * 2.1
    }
    if (chunk.contentTokens.has(token)) {
      score += idf(token, knowledgeBase) * 1.15
    }
  }

  for (const phrase of unique([question, ...plan.queryVariants])) {
    const normalizedPhrase = normalizeText(phrase)
    if (!normalizedPhrase || normalizedPhrase.length < 2) continue
    if (chunk.normalizedTitle.includes(normalizedPhrase)) {
      score += 8
      reasons.push(`标题命中“${phrase}”`)
    } else if (chunk.normalizedContent.includes(normalizedPhrase)) {
      score += 4
      reasons.push(`正文命中“${phrase}”`)
    }
  }

  if (plan.academies.length > 0 && plan.academies.includes(chunk.academy)) {
    score += 12
    reasons.push(`学院匹配 ${chunk.academy}`)
  }

  if (plan.years.length > 0) {
    const overlapYears = plan.years.filter((year) => chunk.years.includes(year))
    if (overlapYears.length > 0) {
      score += 9 + overlapYears.length * 2
      reasons.push(`年份匹配 ${overlapYears.join("、")}`)
    } else if (chunk.years.length > 0 && ["policy", "eligibility", "timeline"].includes(plan.intent)) {
      score -= 4
    }
  } else if (plan.preferLatest) {
    if (chunk.maxYear > 0) {
      const recencyWeight = ["policy", "eligibility", "process", "timeline"].includes(plan.intent) ? 2.1 : 1.2
      const recencyCap = ["policy", "eligibility", "process", "timeline"].includes(plan.intent) ? 11 : 6
      score += clamp((chunk.maxYear - 2021) * recencyWeight, 0, recencyCap)
      reasons.push(`preferLatest ${chunk.maxYear}`)
    } else if (
      ["policy", "eligibility", "process", "timeline"].includes(plan.intent) &&
      chunk.sourceType !== "official_policy"
    ) {
      score -= 1.5
    }
  }

  if (plan.preferredSourceTypes.includes(chunk.sourceType)) {
    const rank = plan.preferredSourceTypes.indexOf(chunk.sourceType)
    score += clamp(7 - rank * 1.5, 1.5, 7)
    reasons.push(`来源优先级 ${sourceLabel(chunk.sourceType)}`)
  }

  if (
    ["policy", "eligibility", "process", "timeline"].includes(plan.intent) &&
    chunk.sourceType === "official_policy"
  ) {
    score += 6
  }

  if (chunk.isOfficial) {
    score += 1.5
    reasons.push("官方口径")
  }

  if (plan.intent === "exam" && chunk.sourceType === "exam_recall") {
    score += 5
  }

  if (plan.intent === "exam" && chunk.sourceType === "editorial_summary") {
    score += 4
  }

  if (score <= 0) {
    return null
  }

  return { chunk, score, reasons: unique(reasons).slice(0, 4) }
}

function retrieveChunks(
  question: string,
  plan: PlannerResult,
  knowledgeBase: KnowledgeBase,
): RetrievedChunk[] {
  const ranked = knowledgeBase.chunks
    .map((chunk) => scoreChunk(chunk, question, plan, knowledgeBase))
    .filter((item): item is RetrievedChunk => item !== null)
    .sort((a, b) => {
      const scoreDiff = b.score - a.score
      if (plan.preferLatest) {
        const yearDiff = b.chunk.maxYear - a.chunk.maxYear
        if (yearDiff !== 0 && Math.abs(scoreDiff) < 8) {
          return yearDiff
        }
      }
      if (scoreDiff !== 0) {
        return scoreDiff
      }
      return b.chunk.maxYear - a.chunk.maxYear
    })

  const chosen: RetrievedChunk[] = []
  const seenChunks = new Set<string>()
  const slugCounts = new Map<FullSlug, number>()

  for (const candidate of ranked) {
    if (seenChunks.has(candidate.chunk.id)) continue
    if ((slugCounts.get(candidate.chunk.slug) ?? 0) >= 2) continue
    chosen.push(candidate)
    seenChunks.add(candidate.chunk.id)
    slugCounts.set(candidate.chunk.slug, (slugCounts.get(candidate.chunk.slug) ?? 0) + 1)
    if (chosen.length >= MAX_RETRIEVED) break
  }

  if (chosen.length < Math.min(MAX_RETRIEVED, ranked.length)) {
    for (const candidate of ranked) {
      if (seenChunks.has(candidate.chunk.id)) continue
      chosen.push(candidate)
      seenChunks.add(candidate.chunk.id)
      if (chosen.length >= MAX_RETRIEVED) break
    }
  }

  return chosen
}

function sanitizeConflicts(conflicts: string[]): string[] {
  return unique(
    conflicts
      .map((conflict) => stripMarkupNoise(conflict).replace(/\s+/g, " ").trim())
      .filter((conflict) => conflict.length >= 8)
      .filter((conflict) => !/[A-Za-z0-9\u4e00-\u9fff_-]+\/[A-Za-z0-9\u4e00-\u9fff_-]+#\d+/.test(conflict))
      .filter((conflict) => !/^无[。.]?$/.test(conflict)),
  ).slice(0, 5)
}

function questionFacets(question: string, plan: PlannerResult): EvidenceFacet[] {
  const normalized = question.toLowerCase()
  const facets: EvidenceFacet[] = []

  if (/要求|条件|资格|门槛|绩点|gpa|平均分|均分|课程|限制|能不能|可不可以|院内|申请前提/.test(normalized)) {
    facets.push("eligibility")
  }
  if (/怎么考|考什么|考核|初试|笔试|机试|面试|复试|总成绩|双随机|准备|备考/.test(normalized)) {
    facets.push("exam")
  }
  if (/流程|步骤|申请|报名|提交|审核|录取|公示/.test(normalized)) {
    facets.push("process")
  }
  if (/时间|什么时候|几月|截止|节点|日期|公示/.test(normalized)) {
    facets.push("timeline")
  }
  if (/名额|计划|接收|招收|人数/.test(normalized)) {
    facets.push("quota")
  }
  if (/降级|年级/.test(normalized)) {
    facets.push("grade")
  }

  switch (plan.intent) {
    case "eligibility":
      facets.push("eligibility")
      break
    case "exam":
      facets.push("exam")
      break
    case "process":
      facets.push("process")
      break
    case "timeline":
      facets.push("timeline")
      break
    case "academy_info":
    case "academy_compare":
      facets.push("quota")
      break
    default:
      break
  }

  if (facets.length === 0) {
    facets.push("general")
  }

  return unique(facets).slice(0, 4)
}

function facetTerms(facet: EvidenceFacet): string[] {
  switch (facet) {
    case "eligibility":
      return ["要求", "条件", "资格", "课程", "平均分", "均分", "绩点", "限制", "不能", "不接受"]
    case "exam":
      return ["考核", "初试", "笔试", "机试", "面试", "总成绩", "双随机", "程序设计", "高等数学", "备考"]
    case "process":
      return ["流程", "步骤", "申请", "报名", "提交", "审核", "录取", "公示", "名单"]
    case "timeline":
      return ["时间", "日期", "截止", "公示", "报名", "考核", "公布"]
    case "quota":
      return ["接收计划", "计划数", "接收", "名额", "人数", "专业", "年级"]
    case "grade":
      return ["转入年级", "降级", "一年级", "二年级", "年级"]
    default:
      return ["转专业", "申请", "考核", "学院"]
  }
}

function scoreTextAgainstFacet(text: string, facet: EvidenceFacet): number {
  const normalized = normalizeText(text)
  if (!normalized) return 0

  let score = 0
  for (const term of facetTerms(facet)) {
    const normalizedTerm = normalizeText(term)
    if (!normalizedTerm) continue
    if (normalized.includes(normalizedTerm)) {
      score += normalizedTerm.length >= 4 ? 4 : 2
    }
  }

  return score
}

function scoreFacetCoverage(chunk: KnowledgeChunk, facet: EvidenceFacet): number {
  let score = scoreTextAgainstFacet(chunk.title, facet) * 1.6 + scoreTextAgainstFacet(chunk.content, facet)

  if (facet !== "general" && chunk.sourceType === "official_policy") {
    score += 2
  }
  if (facet === "exam" && chunk.sourceType === "exam_recall") {
    score += 1.5
  }
  if (facet === "quota" && chunk.sourceType === "academy_summary") {
    score += 1
  }

  return score
}

function facetAwareApprovalIds(
  question: string,
  plan: PlannerResult,
  retrieved: RetrievedChunk[],
): string[] {
  const ranked = [...retrieved].sort((a, b) => {
    const aRank = plan.preferredSourceTypes.indexOf(a.chunk.sourceType)
    const bRank = plan.preferredSourceTypes.indexOf(b.chunk.sourceType)
    if (aRank !== bRank) {
      return aRank - bRank
    }
    return b.score - a.score || b.chunk.maxYear - a.chunk.maxYear
  })

  const picked: string[] = []

  for (const facet of questionFacets(question, plan)) {
    const best = ranked
      .map((item) => ({
        item,
        facetScore: scoreFacetCoverage(item.chunk, facet),
      }))
      .filter((candidate) => candidate.facetScore > 0)
      .sort((a, b) => {
        const facetDiff = b.facetScore - a.facetScore
        if (facetDiff !== 0) return facetDiff
        return b.item.score - a.item.score || b.item.chunk.maxYear - a.item.chunk.maxYear
      })[0]

    if (best) {
      picked.push(best.item.chunk.id)
    }
  }

  const needsOfficial = ["policy", "eligibility", "process", "timeline", "exam"].includes(plan.intent)
  if (
    needsOfficial &&
    !picked.some(
      (id) => retrieved.find((item) => item.chunk.id === id)?.chunk.sourceType === "official_policy",
    )
  ) {
    const official = ranked.find((item) => item.chunk.sourceType === "official_policy")
    if (official) {
      picked.unshift(official.chunk.id)
    }
  }

  for (const candidate of ranked) {
    if (picked.length >= MAX_APPROVED) break
    if (picked.includes(candidate.chunk.id)) continue
    picked.push(candidate.chunk.id)
  }

  return unique(picked).slice(0, MAX_APPROVED)
}

function isOfficialChunk(chunk: KnowledgeChunk): boolean {
  return chunk.isOfficial || chunk.sourceType === "official_policy"
}

function facetLabel(facet: EvidenceFacet): string {
  switch (facet) {
    case "eligibility":
      return "资格要求"
    case "exam":
      return "考核方式"
    case "process":
      return "申请流程"
    case "timeline":
      return "时间节点"
    case "quota":
      return "名额计划"
    case "grade":
      return "年级限制"
    default:
      return "一般信息"
  }
}

function approvedChunksFromIds(approvedIds: string[], retrieved: RetrievedChunk[]): KnowledgeChunk[] {
  return approvedIds
    .map((id) => retrieved.find((item) => item.chunk.id === id)?.chunk)
    .filter((chunk): chunk is KnowledgeChunk => Boolean(chunk))
}

function maxFacetCoverage(chunk: KnowledgeChunk, facets: EvidenceFacet[]): number {
  return Math.max(...facets.map((facet) => scoreFacetCoverage(chunk, facet)), 0)
}

function detectEvidenceConflicts(
  question: string,
  plan: PlannerResult,
  retrieved: RetrievedChunk[],
  approvedIds: string[],
): string[] {
  const conflicts: string[] = []
  const facets = questionFacets(question, plan)
  const requestedYears = new Set(plan.years)
  const approvedChunks = approvedChunksFromIds(approvedIds, retrieved)

  for (const facet of facets) {
    const facetCandidates = retrieved
      .map((item) => ({
        chunk: item.chunk,
        score: scoreFacetCoverage(item.chunk, facet),
      }))
      .filter((candidate) => candidate.score >= 4)
      .sort((a, b) => b.score - a.score || b.chunk.maxYear - a.chunk.maxYear)
      .slice(0, 4)

    if (facetCandidates.length < 2) continue

    const facetYears = unique(facetCandidates.flatMap((candidate) => candidate.chunk.years))
    if (requestedYears.size === 0 && facetYears.length >= 2) {
      conflicts.push(
        `${facetLabel(facet)}同时命中了 ${facetYears.slice(0, 3).join("、")} 等不同年份材料，回答时应优先参考较新的口径。`,
      )
    }

    const hasOfficial = facetCandidates.some((candidate) => isOfficialChunk(candidate.chunk))
    const hasNonOfficial = facetCandidates.some((candidate) => !isOfficialChunk(candidate.chunk))
    if (hasOfficial && hasNonOfficial) {
      conflicts.push(
        `${facetLabel(facet)}同时命中了官方与非官方资料，硬性规则应以官方材料为准，经验内容只能作为补充。`,
      )
    }
  }

  if (
    approvedChunks.length > 0 &&
    approvedChunks.some(isOfficialChunk) &&
    approvedChunks.some((chunk) => !isOfficialChunk(chunk))
  ) {
    conflicts.push("最终证据同时包含官方与非官方材料，回答时需要显式区分硬性规则和经验补充。")
  }

  return sanitizeConflicts(conflicts)
}

function deriveRejectedIds(
  question: string,
  plan: PlannerResult,
  retrieved: RetrievedChunk[],
  approvedIds: string[],
): string[] {
  const approvedSet = new Set(approvedIds)
  const facets = questionFacets(question, plan)
  const approvedChunks = approvedChunksFromIds(approvedIds, retrieved)
  const needsOfficial = ["policy", "eligibility", "process", "timeline", "exam"].includes(plan.intent)
  const hasApprovedOfficial = approvedChunks.some(isOfficialChunk)
  const newestApprovedByGroup = new Map<string, number>()

  for (const chunk of approvedChunks) {
    const groupKey = `${chunk.academy}|${chunk.sourceType}`
    const current = newestApprovedByGroup.get(groupKey) ?? 0
    newestApprovedByGroup.set(groupKey, Math.max(current, chunk.maxYear))
  }

  return retrieved
    .filter((item) => !approvedSet.has(item.chunk.id))
    .filter((item) => {
      if (maxFacetCoverage(item.chunk, facets) <= 0) {
        return true
      }

      if (needsOfficial && hasApprovedOfficial && plan.intent !== "exam" && !isOfficialChunk(item.chunk)) {
        return true
      }

      if (plan.years.length === 0) {
        const groupKey = `${item.chunk.academy}|${item.chunk.sourceType}`
        const newestApproved = newestApprovedByGroup.get(groupKey) ?? 0
        if (newestApproved > 0 && item.chunk.maxYear > 0 && newestApproved > item.chunk.maxYear) {
          return true
        }
      }

      return false
    })
    .map((item) => item.chunk.id)
    .slice(0, MAX_RETRIEVED)
}

function deriveReviewConfidence(
  question: string,
  plan: PlannerResult,
  approvedChunks: KnowledgeChunk[],
  conflicts: string[],
  missingOfficialEvidence: boolean,
): ReviewConfidence {
  const facets = questionFacets(question, plan)
  const coveredFacets = facets.filter((facet) =>
    approvedChunks.some((chunk) => scoreFacetCoverage(chunk, facet) >= 3),
  )

  if (coveredFacets.length === facets.length && !missingOfficialEvidence && conflicts.length === 0) {
    return "high"
  }

  if (coveredFacets.length >= Math.max(1, facets.length - 1) && !missingOfficialEvidence) {
    return "medium"
  }

  if (coveredFacets.length > 0 && (plan.intent === "exam" || conflicts.length === 0)) {
    return "medium"
  }

  return "low"
}

function deriveAnswerStrategy(
  plan: PlannerResult,
  missingOfficialEvidence: boolean,
  conflicts: string[],
): string {
  if (missingOfficialEvidence) {
    return "先说明哪些硬性规则缺少充分官方证据，再只回答当前可确认的部分。"
  }
  if (conflicts.length > 0) {
    return "先给出更稳妥的结论，并明确不同材料之间的口径差异。"
  }
  if (plan.intent === "exam") {
    return "先回答官方考核规则，再补充回忆题和准备建议。"
  }
  return "直接回答。"
}

function extractJsonPayload(text: string): string | null {
  const fencedMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const source = (fencedMatch?.[1] ?? text).trim()
  if (!source) return null
  if (source.startsWith("{") && source.endsWith("}")) return source

  const start = source.indexOf("{")
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < source.length; index++) {
    const char = source[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }
    if (char === "{") {
      depth += 1
      continue
    }
    if (char === "}") {
      depth -= 1
      if (depth === 0) {
        return source.slice(start, index + 1)
      }
    }
  }

  return null
}

function parseJsonObject<T>(text: string): T | null {
  const payload = extractJsonPayload(text)
  if (!payload) return null

  try {
    return JSON.parse(payload) as T
  } catch {
    return null
  }
}

function resolveAcademyName(candidate: string, knowledgeBase: KnowledgeBase): string | null {
  const normalized = normalizeEntityName(candidate)
  if (!normalized) return null

  for (const academy of knowledgeBase.academies) {
    if (normalizeEntityName(academy) === normalized) {
      return academy
    }
  }

  for (const [academy, aliases] of knowledgeBase.academyAliases.entries()) {
    if (aliases.some((alias) => alias === normalized || alias.includes(normalized) || normalized.includes(alias))) {
      return academy
    }
  }

  return null
}

function normalizeSourceTypes(raw: unknown, fallback: SourceType[]): SourceType[] {
  const requested = Array.isArray(raw)
    ? raw.filter(
        (item): item is SourceType =>
          typeof item === "string" && SOURCE_TYPE_VALUES.includes(item as SourceType),
      )
    : []

  return unique([...(requested.length > 0 ? requested : fallback), ...fallback]).slice(0, 5) as SourceType[]
}

function normalizePlannerResult(
  raw: unknown,
  fallback: PlannerResult,
  knowledgeBase: KnowledgeBase,
): PlannerResult {
  const candidate = raw && typeof raw === "object" ? (raw as Partial<PlannerResult>) : {}
  const intent =
    typeof candidate.intent === "string" && INTENT_VALUES.includes(candidate.intent as IntentType)
      ? (candidate.intent as IntentType)
      : fallback.intent

  const academies = unique([
    ...((Array.isArray(candidate.academies) ? candidate.academies : [])
      .map((academy) => (typeof academy === "string" ? resolveAcademyName(academy, knowledgeBase) : null))
      .filter((academy): academy is string => Boolean(academy))),
    ...fallback.academies,
  ]).slice(0, 4)

  const years = unique([
    ...(Array.isArray(candidate.years)
      ? candidate.years.filter((year): year is string => typeof year === "string" && /^20\d{2}$/.test(year))
      : []),
    ...fallback.years,
  ]).sort((a, b) => Number(b) - Number(a))

  const topics = unique([
    ...(Array.isArray(candidate.topics)
      ? candidate.topics
          .filter((topic): topic is string => typeof topic === "string")
          .map((topic) => stripMarkupNoise(topic))
          .filter((topic) => topic.length >= 1 && topic.length <= 16)
      : []),
    ...fallback.topics,
  ]).slice(0, 8)

  const queryVariants = unique([
    ...(Array.isArray(candidate.queryVariants)
      ? candidate.queryVariants
          .filter((variant): variant is string => typeof variant === "string")
          .map((variant) => stripMarkupNoise(variant))
          .filter((variant) => variant.length >= 1)
      : []),
    ...fallback.queryVariants,
  ]).slice(0, 8)

  const compareMode =
    typeof candidate.compareMode === "boolean" ? candidate.compareMode : fallback.compareMode
  const preferLatest =
    typeof candidate.preferLatest === "boolean" ? candidate.preferLatest : fallback.preferLatest
  const needClarification = fallback.needClarification && candidate.needClarification === true
  const clarificationQuestion = needClarification
    ? (() => {
        const rawQuestion =
          typeof candidate.clarificationQuestion === "string"
            ? stripMarkupNoise(candidate.clarificationQuestion)
            : ""
        return rawQuestion.length >= 4 ? rawQuestion : fallback.clarificationQuestion
      })()
    : ""

  const preferredSourceTypes = normalizeSourceTypes(
    candidate.preferredSourceTypes,
    unique([...defaultPreferredSourceTypes(intent), ...fallback.preferredSourceTypes]).slice(0, 5) as SourceType[],
  )

  return {
    intent,
    academies,
    years,
    topics,
    compareMode,
    preferLatest,
    needClarification,
    clarificationQuestion,
    queryVariants,
    preferredSourceTypes,
  }
}

function plannerFallback(
  question: string,
  session: StoredSession,
  knowledgeBase: KnowledgeBase,
): PlannerResult {
  return heuristicPlan(question, session, knowledgeBase)
}

function reviewerFallback(question: string, plan: PlannerResult, retrieved: RetrievedChunk[]): ReviewResult {
  const approvedIds = facetAwareApprovalIds(question, plan, retrieved)
  const approvedChunks = approvedChunksFromIds(approvedIds, retrieved)
  const hasOfficial = approvedChunks.some(isOfficialChunk)
  const needsOfficial = ["policy", "eligibility", "process", "timeline", "exam"].includes(plan.intent)
  const missingOfficialEvidence = needsOfficial && !hasOfficial
  const conflicts = detectEvidenceConflicts(question, plan, retrieved, approvedIds)
  const rejectedIds = deriveRejectedIds(question, plan, retrieved, approvedIds)
  const confidence = deriveReviewConfidence(
    question,
    plan,
    approvedChunks,
    conflicts,
    missingOfficialEvidence,
  )

  return {
    approvedIds,
    rejectedIds,
    conflicts,
    missingOfficialEvidence,
    confidence,
    answerStrategy: deriveAnswerStrategy(plan, missingOfficialEvidence, conflicts),
  }
}

function normalizeReviewResult(
  raw: unknown,
  question: string,
  plan: PlannerResult,
  retrieved: RetrievedChunk[],
): ReviewResult {
  const fallback = reviewerFallback(question, plan, retrieved)
  const candidate = raw && typeof raw === "object" ? (raw as Partial<ReviewResult>) : {}
  const validIds = new Set(retrieved.map((item) => item.chunk.id))

  const approvedIds = unique([
    ...((Array.isArray(candidate.approvedIds) ? candidate.approvedIds : []).filter(
      (id): id is string => typeof id === "string" && validIds.has(id),
    )),
    ...fallback.approvedIds,
  ]).slice(0, MAX_APPROVED)

  const rejectedIds = Array.isArray(candidate.rejectedIds)
    ? candidate.rejectedIds.filter(
        (id): id is string => typeof id === "string" && validIds.has(id) && !approvedIds.includes(id),
      )
    : fallback.rejectedIds

  const approvedChunks = approvedChunksFromIds(approvedIds, retrieved)

  const hasOfficial = approvedChunks.some(isOfficialChunk)
  const needsOfficial = ["policy", "eligibility", "process", "timeline", "exam"].includes(plan.intent)
  const missingOfficialEvidence = needsOfficial && !hasOfficial
  const fallbackConflicts = fallback.conflicts

  const conflicts = sanitizeConflicts([
    ...fallbackConflicts,
    ...(Array.isArray(candidate.conflicts)
      ? candidate.conflicts.filter((conflict): conflict is string => typeof conflict === "string")
      : []),
  ])
  const confidence = deriveReviewConfidence(
    question,
    plan,
    approvedChunks,
    conflicts,
    missingOfficialEvidence,
  )

  return {
    approvedIds: approvedIds.length > 0 ? approvedIds : fallback.approvedIds,
    rejectedIds,
    conflicts,
    missingOfficialEvidence,
    confidence,
    answerStrategy: deriveAnswerStrategy(plan, missingOfficialEvidence, conflicts),
  }
}

function ensureTerminalPunctuation(text: string): string {
  if (!text) return text
  return /[。！？；.!?]$/.test(text) ? text : `${text}。`
}

function splitCandidateSentences(text: string): string[] {
  return text
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .flatMap((block) => block.split(/(?<=[。！？；])/))
    .map((line) =>
      stripMarkupNoise(
        line
          .replace(/[>#*`|]/g, " ")
          .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    )
    .filter((line) => line.length >= 6)
}

function intentTerms(plan: PlannerResult): string[] {
  switch (plan.intent) {
    case "exam":
      return ["考核", "初试", "笔试", "机试", "面试", "备考", "复习", "高数", "程序设计", "双随机", "总成绩"]
    case "eligibility":
      return ["要求", "条件", "资格", "绩点", "排名", "申请", "不得", "不能", "降级"]
    case "process":
      return ["流程", "步骤", "申请", "报名", "提交", "审核", "考核", "公示"]
    case "timeline":
      return ["时间", "日期", "截止", "公示", "考核", "报名"]
    case "academy_info":
    case "academy_compare":
      return ["接收计划", "接收年级", "接收专业", "名额", "学院"]
    case "policy":
      return ["政策", "细则", "通知", "要求", "流程", "时间"]
    default:
      return ["转专业", "申请", "考核", "学院", "年份"]
  }
}

function scoreCandidateSentence(sentence: string, question: string, plan: PlannerResult, chunk: KnowledgeChunk): number {
  const normalizedSentence = normalizeText(sentence)
  if (!normalizedSentence) return 0

  let score = 0
  const facets = questionFacets(question, plan)
  const focusTerms = unique([
    ...tokenize(question).filter((token) => token.length >= 2 && token.length <= 8),
    ...plan.topics,
    ...plan.academies,
    ...plan.years,
    ...intentTerms(plan),
  ])

  for (const term of focusTerms) {
    const normalizedTerm = normalizeText(term)
    if (!normalizedTerm || normalizedTerm.length < 2) continue
    if (normalizedSentence.includes(normalizedTerm)) {
      score += normalizedTerm.length >= 4 ? 4 : 2
    }
  }

  if (chunk.academy && sentence.includes(chunk.academy)) {
    score += 2
  }

  for (const year of chunk.years) {
    if (sentence.includes(year)) {
      score += 1
    }
  }

  for (const facet of facets) {
    score += scoreTextAgainstFacet(sentence, facet)
  }

  if (plan.intent === "exam") {
    if (/面试/.test(sentence)) score += 4
    if (/初试|笔试|机试/.test(sentence)) score += 4
    if (/双随机|总成绩|低于\s*60|不予接收|1:1\.2|1:1\.5/.test(sentence)) score += 3
  }

  if (plan.intent === "eligibility" && /要求|条件|资格|绩点|排名|不能|不得|降级/.test(sentence)) {
    score += 4
  }

  if (plan.intent === "process" && /流程|步骤|报名|提交|审核|考核|公示/.test(sentence)) {
    score += 4
  }

  if (plan.intent === "timeline" && /时间|日期|截止|公示|考核|报名/.test(sentence)) {
    score += 4
  }

  return score
}

function pickRelevantExcerpt(question: string, plan: PlannerResult, chunk: KnowledgeChunk): string {
  const candidates = splitCandidateSentences(chunk.content)
    .map((sentence, index) => ({
      sentence,
      index,
      score: scoreCandidateSentence(sentence, question, plan, chunk),
    }))
    .filter((item) => item.score > 0)

  if (candidates.length === 0) {
    return ensureTerminalPunctuation(chunk.preview)
  }

  const chosen: Array<(typeof candidates)[number]> = []
  const pickedIndexes = new Set<number>()

  for (const facet of questionFacets(question, plan)) {
    const best = candidates
      .map((item) => ({
        ...item,
        facetScore: scoreTextAgainstFacet(item.sentence, facet),
      }))
      .filter((item) => item.facetScore > 0)
      .sort((a, b) => b.facetScore - a.facetScore || b.score - a.score || a.index - b.index)[0]

    if (best && !pickedIndexes.has(best.index)) {
      pickedIndexes.add(best.index)
      chosen.push(best)
    }
  }

  for (const item of candidates.sort((a, b) => b.score - a.score || a.index - b.index)) {
    if (chosen.length >= 4) break
    if (pickedIndexes.has(item.index)) continue
    pickedIndexes.add(item.index)
    chosen.push(item)
  }

  let excerpt = chosen
    .sort((a, b) => a.index - b.index)
    .slice(0, 4)
    .map((item) => item.sentence)
    .join(" ")
  if (excerpt.length > 360) {
    excerpt = `${excerpt.slice(0, 357).trim()}...`
  }

  return ensureTerminalPunctuation(excerpt)
}

function collectEvidenceLabels(items: Array<{ item: EvidenceCard }>): string {
  const labels = unique(items.map(({ item }) => `[${item.label}]`))
  return labels.join("")
}

function formatEvidenceYears(items: Array<{ item: EvidenceCard }>): string {
  const years = unique(
    items
      .flatMap(({ item }) => item.chunk.years)
      .filter((year) => /^\d{4}$/.test(year))
      .sort((a, b) => Number(a) - Number(b)),
  )

  if (years.length === 0) return "近年"
  if (years.length === 1) return `${years[0]} 年`
  return `${years.slice(-2).join("、")} 年`
}

function fallbackSummaryLines(
  plan: PlannerResult,
  evidenceWithExcerpt: Array<{ item: EvidenceCard; excerpt: string }>,
): string[] {
  const lines: string[] = []

  if (plan.intent === "exam") {
    const official = evidenceWithExcerpt.filter(({ item }) => item.chunk.sourceType === "official_policy")
    const withInterview = official.filter(({ excerpt }) => /面试/.test(excerpt))
    const withWritten = official.filter(({ excerpt }) => /初试|笔试|机试/.test(excerpt))
    const withThreshold = official.filter(({ excerpt }) =>
      /总成绩|低于\s*60|不予接收|1:1\.2|1:1\.5|双随机/.test(excerpt),
    )
    const prepHints = evidenceWithExcerpt.filter(({ excerpt }) =>
      /高数|程序设计|英文自我介绍|学习规划|专业志趣|项目|简历/.test(excerpt),
    )

    if (withInterview.length > 0 && withWritten.length > 0) {
      lines.push(
        `- 从 ${formatEvidenceYears([...withInterview, ...withWritten])} 命中的官方细则看，考核不是只看单一环节，而是“初试/笔试/机试 + 面试”或先初试后面试，面试会实际计入录取。${collectEvidenceLabels([...withInterview, ...withWritten])}`,
      )
    } else if (withInterview.length > 0) {
      lines.push(`- 当前命中的资料里明确出现了面试环节，所以不能按“只准备笔试”来理解。${collectEvidenceLabels(withInterview)}`)
    } else if (withWritten.length > 0) {
      lines.push(`- 当前命中的资料里明确出现了初试/笔试/机试环节，至少不能把考核理解成“纯面试”。${collectEvidenceLabels(withWritten)}`)
    }

    if (withThreshold.length > 0) {
      lines.push(
        `- 官方细则通常还会写明面试名单比例、总成绩构成或面试淘汰线，这意味着面试既是筛选环节，也是分数环节。${collectEvidenceLabels(withThreshold)}`,
      )
    }

    if (prepHints.length > 0) {
      lines.push(
        `- 备考建议可以拆成两条线：先补高数/程序设计等笔试或机试基础，再准备专业志趣、学习规划、项目经历和表达。${collectEvidenceLabels(prepHints)}`,
      )
    }
  }

  if (lines.length > 0) {
    return lines.slice(0, 3)
  }

  return evidenceWithExcerpt.slice(0, 3).map(
    ({ item, excerpt }) => `- ${item.chunk.title}：${excerpt}[${item.label}]`,
  )
}

function fallbackAnswer(
  question: string,
  plan: PlannerResult,
  evidence: EvidenceCard[],
  review: ReviewResult,
): string {
  if (evidence.length === 0) {
    return "站内知识库里没有检索到足够相关的资料。你可以把学院、年份或具体环节说得更细一些，我再继续查。"
  }

  const evidenceWithExcerpt = evidence.map((item) => ({
    item,
    excerpt: pickRelevantExcerpt(question, plan, item.chunk),
  }))
  const lines: string[] = []
  lines.push(...fallbackSummaryLines(plan, evidenceWithExcerpt))

  if (review.missingOfficialEvidence) {
    lines.push("")
    lines.push("当前站内缺少足够的官方政策原文佐证，下面只保留能直接从已收录页面确认的信息。")
  }

  if (review.conflicts.length > 0) {
    lines.push("")
    lines.push("需要注意：")
    lines.push(...review.conflicts.map((conflict) => `- ${conflict}`))
  }

  const excerptLines = evidenceWithExcerpt
    .slice(0, 3)
    .map(({ item, excerpt }) => `- ${item.chunk.title}：${excerpt}[${item.label}]`)

  if (excerptLines.length > 0) {
    lines.push("")
    lines.push("站内能直接核实到的相关依据：")
    lines.push(...excerptLines)
  }

  if (review.confidence === "low") {
    lines.push("")
    lines.push(`如果你愿意，我可以继续按“学院 + 年份 + ${question}”这个粒度往下收窄。`)
  }

  return lines.join("\n")
}

function normalizeModelFailureMessage(message: string): string {
  const cleaned = stripMarkupNoise(message)
  if (/未配置/.test(cleaned)) {
    return "当前没有注入可用的聊天模型配置。"
  }
  if (/CORS|HTTPS|浏览器/.test(cleaned)) {
    return "当前模型接口无法被浏览器直接访问，请检查 HTTPS 与 CORS 配置。"
  }
  if (/请求失败|不可用|返回内容为空/.test(cleaned)) {
    return cleaned
  }
  return "当前在线模型暂时不可用。"
}

function quickReply(question: string): string | null {
  const normalized = normalizeText(question)
  if (!normalized) return null

  if (/^(你好|您好|嗨|hi|hello)$/.test(normalized)) {
    return "你好，我是中山大学转专业咨询助手。你可以直接问我某个学院的转入要求、怎么考、时间节点，或者让我帮你对比几个学院。"
  }

  if (/你.*(是谁|叫啥|能干嘛)|你是什么|你可以做什么/.test(normalized)) {
    return "我是中山大学转专业咨询助手，主要帮你查站内整理过的转专业政策、学院要求、考核方式和历年真题线索。你直接说学院名和问题，我会尽量按最新官方口径回答。"
  }

  return null
}

function modelUnavailableAnswer(
  reason: string,
  question: string,
  plan: PlannerResult,
  evidence: EvidenceCard[],
  review: ReviewResult,
): string {
  return [
    `当前在线模型不可用：${normalizeModelFailureMessage(reason)}`,
    "下面是基于站内知识库生成的本地检索摘要，仅供参考。",
    "",
    fallbackAnswer(question, plan, evidence, review),
  ].join("\n")
}

function renderInlineMarkdown(text: string): string {
  let html = escapeHtml(text)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
  html = html.replace(/\[(E\d+)\]/g, "<strong>[$1]</strong>")
  return html
}

function markdownToHtml(markdown: string): string {
  const normalized = markdown.replace(/\r/g, "")
  const codeBlocks: string[] = []
  const protectedMarkdown = normalized.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const placeholder = `@@CODE_BLOCK_${codeBlocks.length}@@`
    const block = `<pre><code class="language-${escapeHtml(String(lang || "text"))}">${escapeHtml(
      String(code).trim(),
    )}</code></pre>`
    codeBlocks.push(block)
    return placeholder
  })

  const lines = protectedMarkdown.split("\n")
  const htmlParts: string[] = []
  let paragraph: string[] = []
  let listItems: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    htmlParts.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (listItems.length === 0) return
    htmlParts.push(`<ul>${listItems.join("")}</ul>`)
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const headingMatch = /^(#{2,4})\s+(.*)$/.exec(line)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length === 2 ? "h3" : "h4"
      htmlParts.push(`<${level}>${renderInlineMarkdown(headingMatch[2])}</${level}>`)
      continue
    }

    const listMatch = /^[-*]\s+(.*)$/.exec(line)
    if (listMatch) {
      flushParagraph()
      listItems.push(`<li class="chatbot-li">${renderInlineMarkdown(listMatch[1])}</li>`)
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()

  let html = htmlParts.join("")
  codeBlocks.forEach((block, index) => {
    html = html.replace(`@@CODE_BLOCK_${index}@@`, block)
  })
  return html
}

function assistantHtml(message: StoredMessage, currentSlug: FullSlug): string {
  const body = markdownToHtml(message.content)
  if (!message.meta) return body

  const notes: string[] = []
  if (message.meta.missingOfficialEvidence) {
    notes.push("当前回答缺少足够的官方政策原文佐证，已尽量只保留站内可核实信息。")
  }
  if (message.meta.conflicts.length > 0) {
    notes.push(...message.meta.conflicts.map((item) => `口径差异：${item}`))
  }
  if (message.meta.confidence === "low") {
    notes.push("证据相关性偏弱，建议继续限定学院、年份或具体问题。")
  }

  const notesHtml =
    notes.length === 0
      ? ""
      : `<h4>证据说明</h4><ul>${notes
          .map((note) => `<li class="chatbot-li">${renderInlineMarkdown(note)}</li>`)
          .join("")}</ul>`

  const normalizedCitations = message.meta.citations.map((citation, index) => ({
    ...citation,
    label: citation.label ?? `E${index + 1}`,
  }))

  const citationsHtml =
    normalizedCitations.length === 0
      ? ""
      : (() => {
          const dedupedCitations = unique(normalizedCitations.map((citation) => citation.label))
            .map((label) => normalizedCitations.find((citation) => citation.label === label))
            .filter((citation): citation is StoredCitation & { label: string } => Boolean(citation?.label))

          return `<h4>参考依据</h4><ul>${dedupedCitations
          .map((citation) => {
            const href = new URL(resolveRelative(currentSlug, citation.slug), location.toString()).toString()
            const yearLabel = citation.years.length > 0 ? ` · ${citation.years.join("、")}` : ""
            const academyLabel = citation.academy ? ` · ${citation.academy}` : ""
            return `<li class="chatbot-li">[${citation.label}] <a href="${href}">${escapeHtml(
              citation.title,
            )}</a> · ${SOURCE_LABELS[citation.sourceType]}${academyLabel}${yearLabel}</li>`
          })
          .join("")}</ul>`
        })()

  return `${body}${notesHtml}${citationsHtml}`
}

function userHtml(message: StoredMessage): string {
  return `<p>${escapeHtml(message.content).replace(/\n/g, "<br />")}</p>`
}

class ChatbotRuntime {
  private root: HTMLElement
  private messagesEl: HTMLElement | null
  private presetsEl: HTMLElement | null
  private clearButton: HTMLButtonElement | null
  private inputEl: HTMLTextAreaElement | null
  private sendButton: HTMLButtonElement | null
  private config: ChatConfig
  private session: StoredSession
  private activeController: AbortController | null = null
  private destroyed = false
  private typingEl: HTMLElement | null = null
  private clearButtonDefaultHtml = ""

  constructor(root: HTMLElement) {
    this.root = root
    this.messagesEl = root.querySelector("#chatbot-messages")
    this.presetsEl = root.querySelector("#chatbot-presets")
    this.clearButton = root.querySelector("#chatbot-clear")
    this.inputEl = root.querySelector("#chatbot-input")
    this.sendButton = root.querySelector("#chatbot-send")
    this.config = {
      apiKey: root.dataset.apiKey ?? "",
      apiBase: root.dataset.apiBase ?? "",
      model: root.dataset.model ?? "",
    }
    this.session = this.readSession()
    this.clearButtonDefaultHtml = this.clearButton?.innerHTML ?? ""
  }

  mount() {
    if (!this.messagesEl || !this.clearButton || !this.inputEl || !this.sendButton) return
    if (this.destroyed) return

    this.renderHistory()
    this.syncWelcomeState()
    this.bindEvents()
    this.resizeInput()
    this.updateSendState()
    void getKnowledgeBase().catch(() => undefined)
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    if (this.activeController) {
      this.activeController.abort()
      this.activeController = null
    }
    this.typingEl?.remove()
    this.typingEl = null
  }

  private readSession(): StoredSession {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return { profile: { ...EMPTY_PROFILE }, history: [], rollingSummary: "" }
      }
      const parsed = JSON.parse(raw) as StoredSession
      return {
        profile: {
          academies: parsed.profile?.academies ?? [],
          years: parsed.profile?.years ?? [],
          topics: parsed.profile?.topics ?? [],
          preferredSourceTypes: parsed.profile?.preferredSourceTypes ?? [],
          compareMode: Boolean(parsed.profile?.compareMode),
        },
        history: Array.isArray(parsed.history) ? parsed.history.slice(-MAX_HISTORY) : [],
        rollingSummary: typeof parsed.rollingSummary === "string" ? parsed.rollingSummary : "",
      }
    } catch {
      return { profile: { ...EMPTY_PROFILE }, history: [], rollingSummary: "" }
    }
  }

  private persistSession() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profile: this.session.profile,
          history: this.session.history.slice(-MAX_HISTORY),
          rollingSummary: this.session.rollingSummary,
        }),
      )
    } catch {
      // Ignore storage failures.
    }
  }

  private bindEvents() {
    if (!this.inputEl || !this.sendButton || !this.clearButton) return

    const onInput = () => {
      this.resizeInput()
      this.updateSendState()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return
      event.preventDefault()
      void this.submit()
    }
    const onSend = () => {
      void this.submit()
    }
    const onClear = () => {
      if (this.activeController) {
        this.activeController.abort()
        return
      }
      this.resetConversation()
    }

    this.inputEl.addEventListener("input", onInput)
    this.inputEl.addEventListener("keydown", onKeyDown)
    this.sendButton.addEventListener("click", onSend)
    this.clearButton.addEventListener("click", onClear)

    window.addCleanup(() => this.inputEl?.removeEventListener("input", onInput))
    window.addCleanup(() => this.inputEl?.removeEventListener("keydown", onKeyDown))
    window.addCleanup(() => this.sendButton?.removeEventListener("click", onSend))
    window.addCleanup(() => this.clearButton?.removeEventListener("click", onClear))

    const presetButtons = Array.from(this.root.querySelectorAll<HTMLButtonElement>(".chatbot-preset-btn"))
    presetButtons.forEach((button) => {
      const onPreset = () => {
        const question = button.dataset.question?.trim()
        if (!question) return
        if (this.inputEl) {
          this.inputEl.value = question
          this.resizeInput()
          this.updateSendState()
        }
        void this.submit(question)
      }
      button.addEventListener("click", onPreset)
      window.addCleanup(() => button.removeEventListener("click", onPreset))
    })
  }

  private resetConversation() {
    this.session = { profile: { ...EMPTY_PROFILE }, history: [], rollingSummary: "" }
    this.persistSession()

    if (!this.messagesEl) return
    Array.from(this.messagesEl.querySelectorAll(".chatbot-msg")).forEach((element) => element.remove())
    this.syncWelcomeState()
    this.scrollToBottom()
  }

  private renderHistory() {
    if (!this.messagesEl) return
    Array.from(this.messagesEl.querySelectorAll(".chatbot-msg")).forEach((element) => element.remove())
    const currentSlug = getFullSlug(window)
    for (const message of this.session.history) {
      if (message.role === "assistant") {
        this.appendMessage("assistant", assistantHtml(message, currentSlug))
      } else {
        this.appendMessage("user", userHtml(message))
      }
    }
    this.scrollToBottom()
  }

  private syncWelcomeState() {
    const welcome = this.root.querySelector<HTMLElement>(".chatbot-welcome")
    const hasHistory = this.session.history.length > 0
    if (welcome) {
      welcome.style.display = hasHistory ? "none" : ""
    }
    if (this.presetsEl) {
      this.presetsEl.style.display = hasHistory ? "none" : ""
    }
  }

  private appendMessage(role: ChatRole | "error", html: string): HTMLElement | null {
    if (!this.messagesEl) return null

    const row = document.createElement("div")
    row.className =
      role === "error"
        ? "chatbot-msg chatbot-msg-error"
        : `chatbot-msg chatbot-msg-${role === "assistant" ? "assistant" : "user"}`

    const bubble = document.createElement("div")
    bubble.className =
      role === "error" ? "chatbot-bubble chatbot-bubble-error" : "chatbot-bubble"
    bubble.innerHTML = html

    if (role === "assistant") {
      const avatar = document.createElement("div")
      avatar.className = "chatbot-msg-avatar"
      avatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"></path></svg>'
      row.appendChild(avatar)
    } else if (role === "user") {
      const avatar = document.createElement("div")
      avatar.className = "chatbot-msg-avatar"
      avatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
      row.appendChild(avatar)
    }

    row.appendChild(bubble)
    this.messagesEl.appendChild(row)
    this.scrollToBottom()
    return row
  }

  private showTyping() {
    this.removeTyping()
    const row = this.appendMessage(
      "assistant",
      '<div class="chatbot-dots"><span></span><span></span><span></span></div>',
    )
    this.typingEl = row
  }

  private removeTyping() {
    this.typingEl?.remove()
    this.typingEl = null
  }

  private setBusy(busy: boolean) {
    if (!this.clearButton || !this.inputEl || !this.sendButton) return
    this.clearButton.classList.toggle("stop-active", busy)
    this.clearButton.innerHTML = busy ? STOP_ICON : this.clearButtonDefaultHtml
    this.clearButton.title = busy ? "停止本次回答" : "清空对话"
    this.clearButton.setAttribute("aria-label", busy ? "停止本次回答" : "清空对话")
    this.inputEl.disabled = false
    this.sendButton.disabled = busy
    this.updateSendState()
  }

  private resizeInput() {
    if (!this.inputEl) return
    this.inputEl.style.height = "auto"
    this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 150)}px`
  }

  private updateSendState() {
    if (!this.inputEl || !this.sendButton) return
    const active = this.inputEl.value.trim().length > 0 && !this.activeController
    this.sendButton.classList.toggle("active", active)
  }

  private scrollToBottom() {
    this.messagesEl?.scrollTo({ top: this.messagesEl.scrollHeight, behavior: "smooth" })
  }

  private async submit(overrideQuestion?: string) {
    if (this.activeController) return
    if (!this.inputEl) return

    const question = (overrideQuestion ?? this.inputEl.value).trim()
    if (!question) return
    const effectiveTurn = buildEffectiveQuestion(question, this.session)

    this.inputEl.value = ""
    this.resizeInput()
    this.updateSendState()

    const userMessage: StoredMessage = { role: "user", content: question }
    this.session.history.push(userMessage)
    this.session.history = this.session.history.slice(-MAX_HISTORY)
    this.persistSession()
    this.syncWelcomeState()
    this.appendMessage("user", userHtml(userMessage))

    const instantReply = effectiveTurn.isSupplement ? null : quickReply(question)
    if (instantReply) {
      const assistantMessage: StoredMessage = { role: "assistant", content: instantReply }
      this.session.history.push(assistantMessage)
      this.session.history = this.session.history.slice(-MAX_HISTORY)
      this.persistSession()
      this.appendMessage("assistant", assistantHtml(assistantMessage, getFullSlug(window)))
      return
    }

    const controller = new AbortController()
    this.activeController = controller
    this.setBusy(true)
    this.showTyping()

    try {
      const knowledgeBase = await getKnowledgeBase()
      const contextualized = await this.contextualize(
        question,
        knowledgeBase,
        controller.signal,
        effectiveTurn,
      )

      if (contextualized.needClarification && contextualized.clarificationQuestion) {
        this.session.rollingSummary = contextualized.rollingSummary
        this.removeTyping()
        const clarification: StoredMessage = {
          role: "assistant",
          content: contextualized.clarificationQuestion,
        }
        this.session.history.push(clarification)
        this.session.history = this.session.history.slice(-MAX_HISTORY)
        this.persistSession()
        this.appendMessage("assistant", assistantHtml(clarification, getFullSlug(window)))
        return
      }

      const retrieved = retrieveChunks(contextualized.standaloneQuestion, contextualized, knowledgeBase)
      const review = await this.review(
        contextualized.standaloneQuestion,
        contextualized,
        retrieved,
      )
      const approved = this.materializeEvidence(review, retrieved)
      const answerText = await this.answer(
        contextualized.standaloneQuestion,
        contextualized,
        review,
        approved,
        controller.signal,
      )
      const assistantMessage: StoredMessage = {
        role: "assistant",
        content: answerText,
        meta: {
          citations: approved.map((item) => ({
            label: item.label,
            chunkId: item.chunk.id,
            slug: item.chunk.slug,
            title: item.chunk.title,
            sourceType: item.chunk.sourceType,
            academy: item.chunk.academy,
            years: item.chunk.years,
          })),
          conflicts: review.conflicts,
          missingOfficialEvidence: review.missingOfficialEvidence,
          confidence: review.confidence,
        },
      }

      this.session.rollingSummary = contextualized.rollingSummary
      this.mergeProfile(contextualized)
      this.session.history.push(assistantMessage)
      this.session.history = this.session.history.slice(-MAX_HISTORY)
      this.persistSession()
      this.removeTyping()
      this.appendMessage("assistant", assistantHtml(assistantMessage, getFullSlug(window)))
    } catch (error) {
      this.removeTyping()
      if (!isAbortError(error)) {
        const message =
          error instanceof Error ? error.message : "聊天请求失败，请稍后再试。"
        this.appendMessage("error", `<p>${escapeHtml(message)}</p>`)
      }
    } finally {
      this.activeController = null
      this.setBusy(false)
      this.updateSendState()
    }
  }

  private mergeProfile(plan: PlannerResult) {
    this.session.profile = {
      academies: mergeLimited(this.session.profile.academies, plan.academies, 4),
      years: mergeLimited(this.session.profile.years, plan.years, 4),
      topics: mergeLimited(this.session.profile.topics, plan.topics, 8),
      preferredSourceTypes: mergeLimited(
        this.session.profile.preferredSourceTypes,
        plan.preferredSourceTypes,
        5,
      ) as SourceType[],
      compareMode: plan.compareMode,
    }
  }

  private materializeEvidence(review: ReviewResult, retrieved: RetrievedChunk[]): EvidenceCard[] {
    const ordered: EvidenceCard[] = []
    const labelsBySlug = new Map<FullSlug, string>()
    let nextLabelIndex = 1
    const pickedIds =
      review.approvedIds.length > 0
        ? review.approvedIds
        : retrieved.slice(0, Math.min(MAX_APPROVED, retrieved.length)).map((item) => item.chunk.id)

    for (const candidateId of pickedIds) {
      const found = retrieved.find((item) => item.chunk.id === candidateId)
      if (!found) continue
      const label =
        labelsBySlug.get(found.chunk.slug) ??
        (() => {
          const created = `E${nextLabelIndex}`
          nextLabelIndex += 1
          labelsBySlug.set(found.chunk.slug, created)
          return created
        })()
      ordered.push({
        label,
        chunk: found.chunk,
      })
      if (ordered.length >= MAX_APPROVED) break
    }

    return ordered
  }

  private async contextualize(
    question: string,
    knowledgeBase: KnowledgeBase,
    signal: AbortSignal,
    preparedTurn?: EffectiveTurn,
  ): Promise<ContextualizedPlan> {
    const fallback = contextualizeFallback(question, this.session, knowledgeBase, preparedTurn)
    if (!this.config.model.trim()) {
      return fallback
    }

    const prompt = [
      "你是会话上下文化器兼检索规划器。你只能输出一个 JSON 对象。",
      "你的任务是把当前输入改写成单轮可理解问题，并生成检索规划。",
      "如果用户这轮只补充课程名、年份、分数、学院、是否面试等片段信息，必须结合历史上下文补全成完整问题。",
      "只有在缺少必要信息、确实无法继续检索时，才允许 needClarification=true。",
      "不要编造学院、年份、政策、考核方式或结论。",
      "字段: standaloneQuestion, rollingSummary, intent, academies, years, topics, compareMode, preferLatest, needClarification, clarificationQuestion, queryVariants, preferredSourceTypes。",
      "rollingSummary 用不超过 120 个汉字总结长期上下文，只保留后续检索还需要的信息。",
      "intent 只能是: policy, eligibility, process, timeline, academy_info, academy_compare, exam, secondary_selection, community, general。",
      "preferredSourceTypes 只能从: official_policy, academy_summary, editorial_summary, secondary_selection, exam_recall, community, general 中选择。",
      `当前输入: ${preparedTurn?.questionForModel ?? question}`,
      this.session.rollingSummary ? `已有摘要: ${this.session.rollingSummary}` : "已有摘要: 无",
      this.session.history.length > 0
        ? `最近对话:\n${recentConversationSummary(this.session.history, 6)}`
        : "最近对话: 无",
      `本地草案: ${JSON.stringify(fallback)}`,
    ]
      .filter(Boolean)
      .join("\n\n")

    try {
      const raw = await this.complete(
        [
          {
            role: "system",
            content: "你负责把多轮对话压缩成当前可检索的问题，并输出 JSON 对象。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        signal,
        0,
        900,
      )

      return normalizeContextualizedPlan(
        parseJsonObject<Partial<ContextualizedPlan>>(raw),
        fallback,
        knowledgeBase,
      )
    } catch (error) {
      if (isAbortError(error)) throw error
      return fallback
    }
  }

  private async review(
    question: string,
    plan: PlannerResult,
    retrieved: RetrievedChunk[],
  ): Promise<ReviewResult> {
    return normalizeReviewResult(reviewerFallback(question, plan, retrieved), question, plan, retrieved)
  }

  private async answer(
    question: string,
    plan: PlannerResult,
    review: ReviewResult,
    evidence: EvidenceCard[],
    signal: AbortSignal,
  ): Promise<string> {
    if (evidence.length === 0 && !/你(.*)(是谁|叫啥|能干嘛)|hello|你好|嗨|hi/i.test(question)) {
      return fallbackAnswer(question, plan, evidence, review)
    }

    const answerFacets = questionFacets(question, plan)
    const answerEvidenceSummary = evidence
      .slice(0, MAX_APPROVED)
      .map((item) =>
        [
          `[${item.label}] 标题: ${item.chunk.title}`,
          `[${item.label}] 学院: ${item.chunk.academy || "未标注"}`,
          `[${item.label}] 年份: ${item.chunk.years.join("、") || "无"}`,
          `[${item.label}] 来源类型: ${item.chunk.sourceType}`,
          `[${item.label}] 来源说明: ${sourceLabel(item.chunk.sourceType)}`,
          `[${item.label}] 相关摘录: ${pickRelevantExcerpt(question, plan, item.chunk)}`,
          `[${item.label}] 原文:\n${item.chunk.content.trim()}`,
        ].join("\n"),
      )
      .join("\n\n")

    const prompt = [
      "你是一个礼貌、热情、专业的大学转专业咨询助手。请用简体中文自然作答。",
      "你必须严格受证据约束，不能编造政策、年份、分数线、考核形式、流程或结论。",
      "回答规则：",
      "1. 第一段先直接回答用户当前最想知道的结论，不要先讲背景。",
      "2. 如果问题包含多个子问题，要在同一条自然回答里都覆盖到，不要只答一半。",
      "3. 默认用 2 到 4 段短段落；只有内容天然适合列点时才用短列表。",
      "4. 不要写成“结论 / 依据 / 不确定项 / 参考依据”这种模板，也不要机械重复材料标题。",
      "5. 涉及硬性规则、分数门槛、时间节点、考核结构时，优先引用官方证据；回忆版只能用于补充准备建议和历史情况。",
      "6. 只有具体事实后面才加 [E1] 这类标签，不要几乎每句都加。",
      "7. 如果证据不足，就明确说哪一部分不能确定，但仍先回答能确定的部分。",
      "8. 最后一段如果合适，可以补一句很具体的下一步建议。",
      `问题：${question}`,
      `意图：${plan.intent}`,
      answerFacets.length > 0 ? `问题侧面：${answerFacets.join("、")}` : "",
      plan.academies.length > 0 ? `目标学院：${plan.academies.join("、")}` : "",
      plan.years.length > 0 ? `涉及年份：${plan.years.join("、")}` : "",
      review.conflicts.length > 0 ? `已知口径差异：${review.conflicts.join(" | ")}` : "",
      review.missingOfficialEvidence
        ? "提示：至少有一部分问题缺少充分的官方原文证据，回答时要明确说清。"
        : "提示：已命中官方证据，涉及硬信息时应以官方证据为主。",
      `证据置信度：${review.confidence}`,
      `证据：\n${answerEvidenceSummary}`,
    ]
      .filter(Boolean)
      .join("\n\n")

    try {
      return await this.complete(
        [
          {
            role: "system",
            content:
              "你是一个礼貌、热情、专业的大学转专业咨询助手。请用简体中文自然作答，但所有结论都必须严格基于证据。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        signal,
        0.15,
        1200,
      )
    } catch (error) {
      if (isAbortError(error)) throw error
      return modelUnavailableAnswer(
        error instanceof Error ? error.message : "当前在线模型暂时不可用。",
        question,
        plan,
        evidence,
        review,
      )
    }
  }

  private async complete(
    messages: ChatCompletionMessage[],
    signal: AbortSignal,
    temperature: number,
    maxTokens: number,
  ): Promise<string> {
    const model = this.config.model.trim()
    if (!model) {
      throw new Error("聊天模型未配置，请在构建时注入 CHATBOT_API_BASE 和 CHATBOT_MODEL。")
    }

    const endpoint = normalizeChatEndpoint(this.config.apiBase)
    let response: Response

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal,
      })
    } catch (error) {
      if (isAbortError(error)) throw error
      if (error instanceof TypeError) {
        throw new Error("模型接口请求失败。请检查接口是否支持浏览器 CORS、是否为 HTTPS 地址，以及当前网络是否可达。")
      }
      throw error
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `模型请求失败 (${response.status})：${stripMarkupNoise(errorText).slice(0, 180) || "未知错误"}`,
      )
    }

    const payload = await response.json()
    const message = payload?.choices?.[0]?.message?.content

    if (typeof message === "string") {
      return message.trim()
    }

    if (Array.isArray(message)) {
      const text = message
        .map((part: { text?: string; type?: string }) => part.text ?? "")
        .join("")
        .trim()
      if (text) return text
    }

    if (typeof payload?.choices?.[0]?.text === "string") {
      return String(payload.choices[0].text).trim()
    }

    throw new Error("模型返回内容为空。")
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("nav", () => {
    const root = document.querySelector<HTMLElement>(".chatbot-page")
    if (!root) return

    chatbotState.__sysuRemajorChatbotState = chatbotState.__sysuRemajorChatbotState ?? {}

    if (chatbotState.__sysuRemajorChatbotState.runtime) {
      chatbotState.__sysuRemajorChatbotState.runtime.destroy()
    }

    const runtime = new ChatbotRuntime(root)
    chatbotState.__sysuRemajorChatbotState.runtime = runtime
    runtime.mount()

    window.addCleanup(() => {
      runtime.destroy()
      if (chatbotState.__sysuRemajorChatbotState?.runtime === runtime) {
        chatbotState.__sysuRemajorChatbotState.runtime = null
      }
    })
  })
}

export {
  assistantHtml,
  buildEffectiveQuestion,
  buildKnowledgeBase,
  contextualizeFallback,
  modelUnavailableAnswer,
  normalizeReviewResult,
  retrieveChunks,
  reviewerFallback,
}
