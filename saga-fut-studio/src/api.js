export async function getDados() {
  const res = await fetch('/api/dados')
  if (!res.ok) throw new Error((await res.json()).error || 'Erro ao carregar')
  return res.json()
}

export async function saveDados(dados) {
  const res = await fetch('/api/dados', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar')
  return res.json()
}
