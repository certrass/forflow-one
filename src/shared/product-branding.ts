import forflowProduct from '../../resources/forflow/product.json'

// The CLI compiles shared files without the desktop global declaration file.
declare const FORFLOW_BRAND_ENABLED: boolean | undefined

export function isForflowBuild(): boolean {
  // oxlint-disable-next-line unicorn/no-typeof-undefined -- This compile-time macro is absent in the unbundled CLI; a direct read would throw.
  return typeof FORFLOW_BRAND_ENABLED !== 'undefined' && FORFLOW_BRAND_ENABLED === true
}

export function getProductIdentity(forflow = isForflowBuild()): {
  name: string
  appId: string
  dataDirectory: string
} {
  return forflow
    ? forflowProduct
    : { name: 'Orca', appId: 'com.stablyai.orca', dataDirectory: 'orca' }
}

export function brandProductText(text: string, forflow = isForflowBuild()): string {
  if (!forflow) {
    return text
  }
  // Preserve commands, links and interpolation slots before user values are inserted.
  return text
    .split(/(\{\{[\s\S]*?\}\}|(?:https?|wss?):\/\/\S+|`[^`]*`)/g)
    .map((part, index) =>
      index % 2 === 0 ? part.replace(/\b(?:Orca|ORCA)\b/g, forflowProduct.name) : part
    )
    .join('')
}

export function brandTranslationCatalog(
  catalog: Record<string, unknown>,
  forflow = isForflowBuild()
): Record<string, unknown> {
  if (!forflow) {
    return catalog
  }
  return Object.fromEntries(
    Object.entries(catalog).map(([key, value]) => [key, brandTranslationValue(value)])
  )
}

function brandTranslationValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return brandProductText(value, true)
  }
  if (Array.isArray(value)) {
    return value.map(brandTranslationValue)
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, brandTranslationValue(entry)])
    )
  }
  return value
}
