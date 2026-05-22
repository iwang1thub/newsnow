// API: fetch article content via Cloudflare Worker proxy
import { myFetch } from "~/server/utils/fetch"

function cleanHTML(html: string): string {
  if (!html) return ""
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "")
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "")
  html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
  html = html.replace(/<nav[\s\S]*?<\/nav>/gi, "")
  html = html.replace(/<footer[\s\S]*?<\/footer>/gi, "")
  html = html.replace(/<header[\s\S]*?<\/header>/gi, "")
  html = html.replace(/<aside[\s\S]*?<\/aside>/gi, "")
  html = html.replace(/<svg[\s\S]*?<\/svg>/gi, "")
  html = html.replace(/<form[\s\S]*?<\/form>/gi, "")
  html = html.replace(/<!--[\s\S]*?-->/g, "")
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch && articleMatch[1].length > 200) html = articleMatch[1]
  else {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) html = bodyMatch[1]
  }
  if (html.length > 100000) html = html.substring(0, 100000)
  return html
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const url = query.url as string
    const title = (query.title as string) || ""
    if (!url) return { status: "error", message: "missing url" }
    const targetUrl = url.startsWith("http") ? url : "https://" + url
    const html = await myFetch(targetUrl, {
      headers: { "Accept": "text/html,application/xhtml+xml", "Accept-Language": "zh-CN,zh;q=0.9" },
      responseType: "text",
      timeout: 15000,
    })
    if (!html || (html as string).length < 100) {
      return { status: "ok", title, url, html: "", note: "empty content" }
    }
    const cleaned = cleanHTML(html as string)
    return { status: "ok", title, url, html: cleaned }
  } catch (err: any) {
    return { status: "error", message: "fetch failed: " + err.message }
  }
})
