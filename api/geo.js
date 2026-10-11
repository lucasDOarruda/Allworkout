// Approximate location of the visitor, from Vercel's IP lookup headers (city level, no
// browser permission needed). The IP address itself is never returned or stored.
const header = (req, name) => {
  const v = req.headers.get(name)
  if (!v) return ''
  try {
    return decodeURIComponent(v).slice(0, 60)
  } catch {
    return v.slice(0, 60)
  }
}

export function GET(req) {
  const body = {
    country: header(req, 'x-vercel-ip-country'),
    region: header(req, 'x-vercel-ip-country-region'),
    city: header(req, 'x-vercel-ip-city'),
  }
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
