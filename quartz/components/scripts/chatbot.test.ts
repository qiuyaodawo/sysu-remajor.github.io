import assert from "node:assert/strict"
import test, { describe } from "node:test"

import { extractContentMetadata } from "../../plugins/emitters/contentIndex"
import {
  assistantHtml,
  buildEffectiveQuestion,
  buildKnowledgeBase,
  modelUnavailableAnswer,
  retrieveChunks,
} from "./chatbot.inline"

const DEFAULT_SOURCE_TYPES = [
  "official_policy",
  "academy_summary",
  "editorial_summary",
  "secondary_selection",
  "exam_recall",
  "community",
  "general",
] as const

const ORIGINAL_QUESTION_PREFIX = "\u539f\u95ee\u9898\uff1a"
const SUPPLEMENT_PREFIX = "\u8865\u5145\u4fe1\u606f\uff1a"

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    intent: "policy",
    academies: ["AI Academy"],
    years: ["2025"],
    topics: ["GPA"],
    compareMode: false,
    preferLatest: true,
    needClarification: false,
    clarificationQuestion: "",
    queryVariants: [],
    preferredSourceTypes: [...DEFAULT_SOURCE_TYPES],
    ...overrides,
  }
}

function makeKnowledgeBase() {
  return buildKnowledgeBase({
    "faq/summary": {
      slug: "faq/summary",
      filePath: "content/faq/summary.md",
      title: "FAQ Summary",
      links: [],
      tags: ["guide"],
      content:
        "AI Academy transfer summary collected by students. This guide mentions GPA requirement context but it is not an official source.",
      metadata: {
        sourceType: "editorial_summary",
        academy: "AI Academy",
        authority: "Student Editors",
        isOfficial: false,
        policyYear: [2024],
      },
    },
    "policies/2024": {
      slug: "policies/2024",
      filePath: "content/policies/2024.md",
      title: "AI Academy 2024 Policy",
      links: [],
      tags: ["policy"],
      content:
        "Official 2024 AI Academy policy. GPA requirement is 3.6 and applicants must pass the interview.",
      metadata: {
        sourceType: "official_policy",
        academy: "AI Academy",
        authority: "Academic Affairs Office",
        isOfficial: true,
        policyYear: [2024],
      },
    },
    "policies/latest": {
      slug: "policies/latest",
      filePath: "content/policies/latest.md",
      title: "AI Academy 2025 Policy",
      links: [],
      tags: ["policy"],
      content:
        "Official 2025 AI Academy policy. GPA requirement is 3.7, applicants must pass a written exam and an interview, and the latest rules apply this year.",
      metadata: {
        sourceType: "official_policy",
        academy: "AI Academy",
        authority: "Academic Affairs Office",
        isOfficial: true,
        policyYear: [2025],
      },
    },
    "faq/metadata-override": {
      slug: "FAQ/metadata-override",
      filePath: "content/faq/metadata-override.md",
      title: "Fallback Heuristic Title",
      links: [],
      tags: ["guide"],
      content:
        "This page exists to verify that structured metadata wins over slug and title heuristics inside the chatbot knowledge base.",
      metadata: {
        sourceType: "official_policy",
        academy: "AI Academy",
        authority: "Academic Affairs Office",
        isOfficial: true,
        policyYear: [2025],
        faculty: "Engineering",
        campus: "South Campus",
      },
    },
  } as any)
}

describe("chatbot multi-turn follow-up", () => {
  test("merges short supplement input into the previous user question", () => {
    const session = {
      profile: {
        academies: [],
        years: [],
        topics: [],
        preferredSourceTypes: [],
        compareMode: false,
      },
      history: [
        { role: "user", content: "\u4eba\u5de5\u667a\u80fd\u5b66\u9662\u600e\u4e48\u8003" },
        { role: "assistant", content: "\u8bf7\u8865\u5145\u4e00\u4e0b\u662f\u54ea\u4e00\u5e74" },
      ],
      rollingSummary: "",
    }

    const turn = buildEffectiveQuestion("2025", session as any)

    assert.equal(turn.isSupplement, true)
    assert.equal(
      turn.questionForModel,
      `${ORIGINAL_QUESTION_PREFIX}\u4eba\u5de5\u667a\u80fd\u5b66\u9662\u600e\u4e48\u8003\n${SUPPLEMENT_PREFIX}2025`,
    )
  })

  test("does not nest merged supplement prompts repeatedly", () => {
    const session = {
      profile: {
        academies: [],
        years: [],
        topics: [],
        preferredSourceTypes: [],
        compareMode: false,
      },
      history: [
        {
          role: "user",
          content:
            `${ORIGINAL_QUESTION_PREFIX}\u4eba\u5de5\u667a\u80fd\u5b66\u9662\u600e\u4e48\u8003\n` +
            `${SUPPLEMENT_PREFIX}\u8ba1\u7b97\u673a\u5b66\u9662`,
        },
        { role: "assistant", content: "\u8bf7\u8865\u5145\u4e00\u4e0b\u662f\u54ea\u4e00\u5e74" },
      ],
      rollingSummary: "",
    }

    const turn = buildEffectiveQuestion("2025", session as any)

    assert.equal(turn.isSupplement, true)
    assert.equal(
      turn.questionForModel,
      `${ORIGINAL_QUESTION_PREFIX}\u4eba\u5de5\u667a\u80fd\u5b66\u9662\u600e\u4e48\u8003\n` +
        `${SUPPLEMENT_PREFIX}\u8ba1\u7b97\u673a\u5b66\u9662\uff1b2025`,
    )
  })
})

describe("chatbot metadata and retrieval", () => {
  test("extractContentMetadata normalizes multi-year frontmatter arrays", () => {
    const metadata = extractContentMetadata({
      sourceType: "official_policy",
      policyYear: [2023, "2025", "2024", "invalid", 2025],
      academy: "AI Academy",
      authority: "Academic Affairs Office",
      isOfficial: "true",
    })

    assert.ok(metadata)
    assert.equal(metadata.sourceType, "official_policy")
    assert.deepEqual(metadata.policyYear, [2025, 2024, 2023])
    assert.equal(metadata.academy, "AI Academy")
    assert.equal(metadata.authority, "Academic Affairs Office")
    assert.equal(metadata.isOfficial, true)
  })

  test("buildKnowledgeBase prefers structured metadata over slug heuristics", () => {
    const knowledgeBase = makeKnowledgeBase()
    const overriddenChunk = knowledgeBase.chunks.find((chunk) => chunk.slug === "faq/metadata-override")

    assert.ok(overriddenChunk)
    assert.equal(overriddenChunk.sourceType, "official_policy")
    assert.equal(overriddenChunk.academy, "AI Academy")
    assert.equal(overriddenChunk.authority, "Academic Affairs Office")
    assert.equal(overriddenChunk.isOfficial, true)
    assert.deepEqual(overriddenChunk.years, ["2025"])
    assert.equal(overriddenChunk.metadata.faculty, "Engineering")
    assert.equal(overriddenChunk.metadata.campus, "South Campus")
  })

  test("retrieveChunks ranks newer official evidence ahead of older summaries", () => {
    const knowledgeBase = makeKnowledgeBase()
    const retrieved = retrieveChunks(
      "2025 AI Academy GPA requirement",
      makePlan() as any,
      knowledgeBase,
    )

    assert.ok(retrieved.length > 0)
    assert.equal(retrieved[0].chunk.slug, "policies/latest")
    assert.equal(retrieved[0].chunk.sourceType, "official_policy")
    assert.ok(retrieved[0].score >= retrieved[1].score)
  })
})

describe("chatbot rendering and fallback", () => {
  test("assistantHtml renders citations with labels, links, academy, and year", () => {
    const previousLocation = (globalThis as typeof globalThis & { location?: URL }).location
    Object.defineProperty(globalThis, "location", {
      value: new URL("https://example.com/chat/"),
      configurable: true,
    })

    try {
      const html = assistantHtml(
        {
          role: "assistant",
          content: "See [E1] for the latest policy.",
          meta: {
            citations: [
              {
                label: "E1",
                chunkId: "policies/latest#1",
                slug: "policies/latest",
                title: "AI Academy 2025 Policy",
                sourceType: "official_policy",
                academy: "AI Academy",
                years: ["2025"],
              },
            ],
            conflicts: [],
            missingOfficialEvidence: false,
            confidence: "medium",
          },
        } as any,
        "faq/current" as any,
      )

      assert.match(html, /AI Academy 2025 Policy/)
      assert.match(html, /\[E1\]/)
      assert.match(html, /AI Academy/)
      assert.match(html, /2025/)
      assert.match(html, /href="https:\/\/example.com/)
    } finally {
      if (typeof previousLocation === "undefined") {
        delete (globalThis as typeof globalThis & { location?: URL }).location
      } else {
        Object.defineProperty(globalThis, "location", {
          value: previousLocation,
          configurable: true,
        })
      }
    }
  })

  test("modelUnavailableAnswer falls back to local evidence summary", () => {
    const knowledgeBase = makeKnowledgeBase()
    const latestChunk = knowledgeBase.chunks.find((chunk) => chunk.slug === "policies/latest")
    assert.ok(latestChunk)

    const answer = modelUnavailableAnswer(
      "\u8bf7\u6c42\u5931\u8d25 (503)",
      "2025 AI Academy GPA requirement",
      makePlan() as any,
      [{ label: "E1", chunk: latestChunk }] as any,
      {
        approvedIds: [latestChunk.id],
        rejectedIds: [],
        conflicts: [],
        missingOfficialEvidence: false,
        confidence: "medium",
        answerStrategy: "summarize",
      } as any,
    )

    assert.match(answer, /\u8bf7\u6c42\u5931\u8d25/)
    assert.match(answer, /AI Academy 2025 Policy/)
    assert.match(answer, /\[E1\]/)
  })
})
