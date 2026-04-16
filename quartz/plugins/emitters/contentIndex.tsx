import { Root } from "hast"
import { GlobalConfiguration } from "../../cfg"
import { getDate } from "../../components/Date"
import { escapeHTML } from "../../util/escape"
import { FilePath, FullSlug, SimpleSlug, joinSegments, simplifySlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { toHtml } from "hast-util-to-html"
import { write } from "./helpers"
import { i18n } from "../../i18n"

export type ContentIndexMap = Map<FullSlug, ContentDetails>
export type MetadataSourceType =
  | "official_policy"
  | "academy_summary"
  | "editorial_summary"
  | "secondary_selection"
  | "exam_recall"
  | "community"
  | "general"

export type ContentMetadata = {
  sourceType?: MetadataSourceType
  policyYear?: number[]
  academy?: string
  authority?: string
  isOfficial?: boolean
  faculty?: string
  campus?: string
}

export type ContentDetails = {
  slug: FullSlug
  filePath: FilePath
  title: string
  links: SimpleSlug[]
  tags: string[]
  content: string
  richContent?: string
  date?: Date
  description?: string
  metadata?: ContentMetadata
}

type FrontmatterLike = Record<string, unknown>

interface Options {
  enableSiteMap: boolean
  enableRSS: boolean
  rssLimit?: number
  rssFullHtml: boolean
  rssSlug: string
  includeEmptyFiles: boolean
}

const defaultOptions: Options = {
  enableSiteMap: true,
  enableRSS: true,
  rssLimit: 10,
  rssFullHtml: false,
  rssSlug: "index",
  includeEmptyFiles: true,
}

const metadataSourceTypes = new Set<MetadataSourceType>([
  "official_policy",
  "academy_summary",
  "editorial_summary",
  "secondary_selection",
  "exam_recall",
  "community",
  "general",
])

function readFrontmatterString(frontmatter: FrontmatterLike | undefined, key: string): string | undefined {
  const value = frontmatter?.[key]
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized === "" ? undefined : normalized
}

function readFrontmatterStringArray(frontmatter: FrontmatterLike | undefined, key: string): string[] | undefined {
  const value = frontmatter?.[key]
  if (!Array.isArray(value)) {
    return undefined
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item !== "")
}

function readFrontmatterBoolean(frontmatter: FrontmatterLike | undefined, key: string): boolean | undefined {
  const value = frontmatter?.[key]
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") {
      return true
    }

    if (normalized === "false") {
      return false
    }
  }

  return undefined
}

function normalizeFrontmatterYears(rawValues: unknown[]): number[] {
  return [...new Set(
    rawValues.flatMap((value) => {
      if (typeof value === "number" && Number.isInteger(value) && value >= 1000 && value <= 9999) {
        return [value]
      }

      if (typeof value === "string") {
        const normalized = value.trim()
        if (/^\d{4}$/.test(normalized)) {
          return [Number(normalized)]
        }
      }

      return []
    }),
  )].sort((a, b) => b - a)
}

function readFrontmatterYears(frontmatter: FrontmatterLike | undefined, key: string): number[] | undefined {
  const value = frontmatter?.[key]
  if (typeof value === "undefined" || value === null) {
    return undefined
  }

  const years = normalizeFrontmatterYears(Array.isArray(value) ? value : [value])
  return years.length > 0 ? years : undefined
}

export function extractContentMetadata(frontmatter: FrontmatterLike | undefined): ContentMetadata | undefined {
  const sourceType = readFrontmatterString(frontmatter, "sourceType")
  const metadata: ContentMetadata = {
    sourceType:
      sourceType && metadataSourceTypes.has(sourceType as MetadataSourceType)
        ? (sourceType as MetadataSourceType)
        : undefined,
    policyYear: readFrontmatterYears(frontmatter, "policyYear"),
    academy: readFrontmatterString(frontmatter, "academy"),
    authority: readFrontmatterString(frontmatter, "authority"),
    isOfficial: readFrontmatterBoolean(frontmatter, "isOfficial"),
    faculty: readFrontmatterString(frontmatter, "faculty"),
    campus: readFrontmatterString(frontmatter, "campus"),
  }

  return Object.values(metadata).some((value) => value !== undefined) ? metadata : undefined
}

function generateSiteMap(cfg: GlobalConfiguration, idx: ContentIndexMap): string {
  const base = cfg.baseUrl ?? ""
  const createURLEntry = (slug: SimpleSlug, content: ContentDetails): string => `<url>
    <loc>https://${joinSegments(base, encodeURI(slug))}</loc>
    ${content.date && `<lastmod>${content.date.toISOString()}</lastmod>`}
  </url>`
  const urls = Array.from(idx)
    .map(([slug, content]) => createURLEntry(simplifySlug(slug), content))
    .join("")
  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`
}

function generateRSSFeed(cfg: GlobalConfiguration, idx: ContentIndexMap, limit?: number): string {
  const base = cfg.baseUrl ?? ""

  const createURLEntry = (slug: SimpleSlug, content: ContentDetails): string => `<item>
    <title>${escapeHTML(content.title)}</title>
    <link>https://${joinSegments(base, encodeURI(slug))}</link>
    <guid>https://${joinSegments(base, encodeURI(slug))}</guid>
    <description><![CDATA[ ${content.richContent ?? content.description} ]]></description>
    <pubDate>${content.date?.toUTCString()}</pubDate>
  </item>`

  const items = Array.from(idx)
    .sort(([_, f1], [__, f2]) => {
      if (f1.date && f2.date) {
        return f2.date.getTime() - f1.date.getTime()
      } else if (f1.date && !f2.date) {
        return -1
      } else if (!f1.date && f2.date) {
        return 1
      }

      return f1.title.localeCompare(f2.title)
    })
    .map(([slug, content]) => createURLEntry(simplifySlug(slug), content))
    .slice(0, limit ?? idx.size)
    .join("")

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
    <channel>
      <title>${escapeHTML(cfg.pageTitle)}</title>
      <link>https://${base}</link>
      <description>${!!limit ? i18n(cfg.locale).pages.rss.lastFewNotes({ count: limit }) : i18n(cfg.locale).pages.rss.recentNotes} on ${escapeHTML(
        cfg.pageTitle,
      )}</description>
      <generator>Quartz -- quartz.jzhao.xyz</generator>
      ${items}
    </channel>
  </rss>`
}

export const ContentIndex: QuartzEmitterPlugin<Partial<Options>> = (opts) => {
  opts = { ...defaultOptions, ...opts }
  return {
    name: "ContentIndex",
    async *emit(ctx, content) {
      const cfg = ctx.cfg.configuration
      const linkIndex: ContentIndexMap = new Map()
      for (const [tree, file] of content) {
        const slug = file.data.slug!
        const date = getDate(ctx.cfg.configuration, file.data) ?? new Date()
        const frontmatter = file.data.frontmatter as FrontmatterLike | undefined
        if (opts?.includeEmptyFiles || (file.data.text && file.data.text !== "")) {
          linkIndex.set(slug, {
            slug,
            filePath: file.data.relativePath!,
            title: readFrontmatterString(frontmatter, "title") ?? "",
            links: file.data.links ?? [],
            tags: readFrontmatterStringArray(frontmatter, "tags") ?? [],
            content: file.data.text ?? "",
            richContent: opts?.rssFullHtml
              ? escapeHTML(toHtml(tree as Root, { allowDangerousHtml: true }))
              : undefined,
            date: date,
            description: file.data.description ?? "",
            metadata: extractContentMetadata(frontmatter),
          })
        }
      }

      if (opts?.enableSiteMap) {
        yield write({
          ctx,
          content: generateSiteMap(cfg, linkIndex),
          slug: "sitemap" as FullSlug,
          ext: ".xml",
        })
      }

      if (opts?.enableRSS) {
        yield write({
          ctx,
          content: generateRSSFeed(cfg, linkIndex, opts.rssLimit),
          slug: (opts?.rssSlug ?? "index") as FullSlug,
          ext: ".xml",
        })
      }

      const fp = joinSegments("static", "contentIndex") as FullSlug
      const simplifiedIndex = Object.fromEntries(
        Array.from(linkIndex).map(([slug, content]) => {
          // remove description and from content index as nothing downstream
          // actually uses it. we only keep it in the index as we need it
          // for the RSS feed
          delete content.description
          delete content.date
          return [slug, content]
        }),
      )

      yield write({
        ctx,
        content: JSON.stringify(simplifiedIndex),
        slug: fp,
        ext: ".json",
      })
    },
    externalResources: (ctx) => {
      if (opts?.enableRSS) {
        return {
          additionalHead: [
            <link
              rel="alternate"
              type="application/rss+xml"
              title="RSS Feed"
              href={`https://${ctx.cfg.configuration.baseUrl}/index.xml`}
            />,
          ],
        }
      }
    },
  }
}
