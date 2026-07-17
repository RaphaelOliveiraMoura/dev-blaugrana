// Cronograma de posts: helpers de data (semana rolante) e a normalização dos
// itens do projeto num "post" agendável único. O agendamento mora no próprio
// item (q.agenda / ep.agenda, uma data 'YYYY-MM-DD'): assim o writeColecao já
// persiste sem tabela paralela, e "pendente" é só o item sem data.

import { quadProgress, epProgress } from './progresso.js'

const DIAS_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Chave local YYYY-MM-DD montada dos componentes, NUNCA de toISOString(): o ISO
// usa UTC e, no fuso do Brasil, jogaria o post pro dia anterior perto da meia-noite.
export function chaveData(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export function hojeChave() { return chaveData(new Date()) }

// Data "limpa" (meia-noite local), pra somar dias sem herdar hora/fuso.
function limpa(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

export function addDias(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

// Segunda-feira da semana que contém `d`. Semana começa na segunda de propósito:
// mantém o fim de semana (onde caem os jogos) junto no fim da faixa, não partido.
export function inicioSemana(d) {
  const x = limpa(d)
  const dow = (x.getDay() + 6) % 7 // 0 = segunda
  return addDias(x, -dow)
}

export function diasDaSemana(inicio) {
  return Array.from({ length: 7 }, (_, i) => addDias(inicio, i))
}

export function rotuloDiaCurto(d) { return DIAS_CURTO[d.getDay()] }

// Faixa da semana pro cabeçalho: "14–20 jul" ou "28 jul – 3 ago" quando vira o mês.
export function rotuloIntervalo(ini, fim) {
  const mi = MESES[ini.getMonth()], mf = MESES[fim.getMonth()]
  if (mi === mf) return `${ini.getDate()}–${fim.getDate()} ${mf}`
  return `${ini.getDate()} ${mi} – ${fim.getDate()} ${mf}`
}

// Rótulo dos tipos de post, pro selinho do card.
const TIPO_LABEL = { charge: 'Charge', tirinha: 'Tirinha', carrossel: 'Carrossel' }

// Achata quadrinhos + episódios num post normalizado. `progress` (opcional) marca
// o que já está pronto pra sair, pra decisão de agendar não depender de abrir o item.
export function postsDoProjeto(dados, progress) {
  const posts = []

  for (const q of dados.quadrinhos || []) {
    const pr = quadProgress(q, progress)
    posts.push({
      key: 'q:' + q.id,
      tipo: 'quadrinho',
      id: q.id,
      titulo: q.titulo,
      selo: q.selo || '',
      formato: TIPO_LABEL[q.tipo] || q.tipo,
      capa: (q.paineis || [])[0]?.imagem || null,
      pronto: pr.done,
      progresso: `${pr.img}/${pr.total}`,
      agenda: q.agenda || null,
      postado: !!q.postado,
    })
  }

  for (const s of dados.sagas || []) {
    for (const ep of s.episodios || []) {
      const pr = epProgress(ep, progress)
      posts.push({
        key: 'e:' + s.id + ':' + ep.id,
        tipo: 'episodio',
        id: ep.id,
        sagaId: s.id,
        titulo: ep.titulo,
        selo: s.selo || '',
        formato: 'Episódio',
        // preview do vídeo = primeiro frame (imagem da 1ª cena); o Card põe o play por cima
        capa: (ep.cenas || [])[0]?.imagem || null,
        pronto: pr.done,
        progresso: `${pr.img}/${pr.total}`,
        agenda: ep.agenda || null,
        postado: !!ep.postado,
      })
    }
  }

  return posts
}
