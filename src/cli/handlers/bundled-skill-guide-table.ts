import { RuntimeClientError } from '../runtime-client'
import { brandCliDocumentation, isForflowCli } from '../cli-product'
import { FORFLOW_BUNDLED_SKILLS, forflowSkillName } from '../../shared/forflow-bundled-skills'

export type BundledSkillGuideReference = {
  name: string
  markdown: string
}

export type BundledSkillGuide = {
  name: string
  description: string
  markdown: string
  fullMarkdown: string
  aliases: readonly string[]
  references: readonly BundledSkillGuideReference[]
}

function canonicalGuides(guides: readonly BundledSkillGuide[]): BundledSkillGuide[] {
  return [...guides].sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0
  )
}

/**
 * Load the embedded guide table in canonical order. Deferred because the table is
 * large and unrelated CLI commands must not pay its module-load cost at startup.
 */
export async function loadCanonicalGuides(): Promise<BundledSkillGuide[]> {
  const { BUNDLED_SKILL_GUIDES } = await import('../bundled-skill-guides.js')
  const guides = canonicalGuides(BUNDLED_SKILL_GUIDES)
  if (!isForflowCli()) return guides
  return guides.map(guide => ({
    ...guide,
    name: forflowSkillName(guide.name),
    aliases: [...guide.aliases, guide.name],
    description: Object.entries(FORFLOW_BUNDLED_SKILLS).find(([name]) => name === guide.name)?.[1]
      ?? brandCliDocumentation(guide.description),
    markdown: brandGuide(guide.markdown),
    fullMarkdown: brandGuide(guide.fullMarkdown),
    references: guide.references.map(reference => ({ ...reference, markdown: brandGuide(reference.markdown) }))
  }))
}

function brandGuide(markdown: string): string {
  let result = brandCliDocumentation(markdown)
  for (const name of Object.keys(FORFLOW_BUNDLED_SKILLS)) {
    result = result.replaceAll(`\`${name}\``, `\`${forflowSkillName(name)}\``)
      .replaceAll(`name: ${name}\n`, `name: ${forflowSkillName(name)}\n`)
  }
  return result
}

export function requireTopic(
  flags: Map<string, string | boolean>,
  guides: BundledSkillGuide[]
): BundledSkillGuide {
  const availableTopics = guides.map((guide) => guide.name).join(', ')
  const topic = flags.get('topic')
  if (typeof topic !== 'string' || topic.length === 0) {
    throw new RuntimeClientError(
      'invalid_argument',
      `Missing skill topic. Available topics: ${availableTopics}`
    )
  }
  // Why: installed stubs may retain an old topic forever, so aliases and canonical
  // names share one lookup table instead of being treated as transient CLI aliases.
  const guideByTopic = new Map<string, BundledSkillGuide>(
    guides.flatMap((guide) => [guide.name, ...guide.aliases].map((name) => [name, guide]))
  )
  const guide = guideByTopic.get(topic)
  if (!guide) {
    throw new RuntimeClientError(
      'invalid_argument',
      `Unknown skill topic "${topic}". Available topics: ${availableTopics}`
    )
  }
  return guide
}
