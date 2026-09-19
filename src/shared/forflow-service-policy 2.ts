const UPSTREAM_HOSTS = ['onorca.dev', 'orca.dev', 'stably.ai']

export function isUpstreamServiceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    return (
      UPSTREAM_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`)) ||
      (host === 'github.com' && /^\/stablyai\/orca(?:[-/.]|$)/i.test(url.pathname))
    )
  } catch {
    return false
  }
}

export function normalizeForflowServiceUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new Error('请输入完整的 Forflow 服务地址。')
  }
  if (isUpstreamServiceUrl(url.href)) {
    throw new Error('Forflow One 不接受 Orca 上游服务地址。')
  }
  const loopback = ['127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('服务地址必须使用 HTTPS；仅本机回环地址允许 HTTP。')
  }
  if (url.username || url.password || url.search || url.hash || url.hostname.endsWith('.')) {
    throw new Error('服务地址不能包含账号、密码、查询参数或片段。')
  }
  return url.href.replace(/\/+$/, '')
}
