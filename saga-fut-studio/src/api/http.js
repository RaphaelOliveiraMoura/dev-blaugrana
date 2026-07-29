// Cliente HTTP da API do studio. Toda chamada passa por aqui: erro do servidor
// (campo `error` do JSON) vira exceção, então quem chama só trata o caminho feliz.

async function req(url, options) {
  const res = await fetch(url, options)
  let body = null
  try { body = await res.json() } catch {}
  if (!res.ok || body?.error) {
    const err = new Error(body?.error || `Erro ${res.status} em ${url}`)
    err.body = body // preserva payload (ex.: { erros, avisos } do gate de validação)
    err.status = res.status
    throw err
  }
  return body
}

export function getJSON(url) {
  return req(url)
}

export function sendJSON(url, data, method = 'POST') {
  return req(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
