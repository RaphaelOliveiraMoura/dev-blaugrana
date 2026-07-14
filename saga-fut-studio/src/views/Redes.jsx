import React from 'react'

// Menu Redes Sociais: playbook de distribuição (espelha saga-fut/ESTRATEGIA-REDES.md)

const REDES = [
  {
    nome: 'TikTok', emoji: '🎵', cor: '#25F4EE',
    papel: 'A única rede que ignora seu nº de seguidores e distribui por descoberta pura. Foco principal (70% da energia). Testa todo vídeo num lote de 200-500 pessoas nos primeiros 30-60min; se o sinal for forte, escala em ondas. Precisa de ~70% de completude pra viralizar.',
    cadencia: 'Prioridade 1 · ~1/dia',
    funciona: [
      'Gancho de texto nos 3 primeiros segundos + caricatura reconhecível já no 1º.',
      'Função Séries/Playlist pra agrupar os capítulos.',
      'Responder comentário com VÍDEO-resposta (a maior alavanca de alcance, e gera os próximos capítulos).',
      'SEO de busca: palavra-chave (jogador, clube) nos 1ºs 150 caracteres da legenda, no texto da tela (o OCR lê) e falada em voz alta (o app transcreve).',
    ],
    evita: [
      'Depender de a pessoa ter visto o ep1, cada vídeo fisga um estranho sozinho.',
      'Abertura lenta / cena de estabelecimento antes do gancho.',
    ],
  },
  {
    nome: 'YouTube Shorts', emoji: '▶️', cor: '#FF0033',
    papel: 'Reaproveita o mesmo vertical, custo quase zero. Rampa atrasada: pode ficar 24-72h em views baixas e só então deslanchar, e acumula por semanas. Nunca mate um Short cedo. O sinal nº 1 é o swipe-through (a pessoa não pular pro próximo).',
    cadencia: 'Prioridade 1-B · em paralelo',
    funciona: [
      'Título com palavra-chave forte (a partir de 2026 tem busca só-Shorts, o SEO pesa de verdade).',
      'Primeiro frame forte: ele vira a capa (thumbnail) no feed de Shorts.',
      'Compilado longo horizontal da saga (8-20min): puxa quem quer maratonar e cresce inscritos ~3x mais rápido.',
      'Agrupar a saga numa playlist.',
    ],
    evita: [
      'Perder tempo com #Shorts (hoje é irrelevante, o YouTube detecta o formato pela proporção).',
      'Matar um Short cedo, ele tem cauda longa e ressurge semanas depois.',
    ],
  },
  {
    nome: 'Instagram', emoji: '📸', cor: '#E1306C',
    papel: 'O mais lento do zero (Reels de conta nova raramente passa de ~200 views). Só depois de ter episódios validados. Tração real em 4-8 semanas com consistência. Para quadrinhos: o CARROSSEL é o formato-rei aqui (save é o sinal nº 1 do algoritmo em 2026).',
    cadencia: 'Prioridade 2 · ~3-5/semana',
    funciona: [
      'O sinal mais forte hoje é ENVIO por DM: gancho "manda pro teu amigo que torce pro rival".',
      'Otimizar pra saves e shares ("salva pra ver o próximo", "marca um culé").',
      'Carrossel de quadrinho: cada slide um gancho, último = cliffhanger. Dwell time alto.',
      'Áudio em alta pesa mais que hashtag (usar faixa em ascensão antes de saturar).',
    ],
    evita: [
      'Listão de hashtags: desde dez/2025 o teto é 5, e específicas batem genéricas.',
      'Esperar viralização de descoberta como no TikTok, aqui é mais lento.',
    ],
  },
  {
    nome: 'X / Twitter', emoji: '✖️', cor: '#71767b',
    papel: 'Amplificação em jogo AO VIVO e comunidade, não descoberta. Suporte, não canal primário. Desde nov/2025 o feed é rankeado pela Grok, que sufoca tom combativo/negativo.',
    cadencia: 'Suporte · durante partidas reais',
    funciona: [
      'Responder perfis grandes de futebol no minuto do lance (reply vale mais que like).',
      '1º tweet = gancho da HISTÓRIA. Vídeo NATIVO, subir direto no X.',
      'Quote-tweet de momentos reais amarrando o enredo fictício. Provocação leve e celebratória.',
    ],
    evita: [
      'Link no corpo do post: derruba o alcance 50-90% (se precisar, joga na 1ª reply).',
      '"Olha, fiz com IA", vende a ferramenta, não a história (é público da conta dev).',
    ],
  },
]

const PADROES = [
  ['Gancho de abertura em TODO vídeo', 'Texto grande sobre a 1ª cena nos ~3s iniciais (toggle 🪝 no Montar), no frame 1, máx. ~7 palavras. Duas fórmulas de maior retenção: chamada de identidade ("se você é do Barça, isso vai doer") ou lacuna de curiosidade (abre uma pergunta e não responde). Teste no mudo: se o 1º frame sozinho não passa tensão, falhou.'],
  ['Caricatura reconhecível no 1º segundo', 'Teste do scroll aplicado ao vídeo: em 0,5s o feed tem que entender "é futebol + quem é o jogador".'],
  ['A novela NUNCA menciona "IA"', 'A saga vende a HISTÓRIA, não a ferramenta. Os bastidores de "fiz com IA" são outro público (a conta dev). Não misturar.'],
  ['Capítulo que termina em suspense, postado perto de um jogo real', 'Um final em aberto (o "cliffhanger") sincronizado com uma partida de verdade cola a história no assunto do momento. O cliffhanger tem que ser NOMEADO, não vago. Bônus: o último frame conecta de volta ao primeiro (loop) e a completude passa de 100%. É a vantagem única do formato "capítulo no dia seguinte ao jogo".'],
]

const CADENCIA = [
  ['Episódio (a história em si)', '~1 por dia', 'TikTok + Shorts + Reels'],
  ['Capítulo que termina em suspense, perto de um jogo real', 'toda partida relevante', 'TikTok + X (ao vivo)'],
  ['Quadrinho/tirinha (motor barato)', '3-5 por semana', 'Instagram (carrossel) + X'],
  ['Vídeo longo com a saga inteira', '1 por saga', 'YouTube'],
  ['Bastidores / enquete', '2-3 por semana', 'Instagram Stories'],
]

const CHECKLIST = [
  'Gancho no frame 1 (chamada-de-identidade ou lacuna-de-curiosidade) e legível no mudo?',
  'Caricatura reconhecível aparece no 1º segundo?',
  'Legenda/descrição sem NENHUMA menção a "IA"?',
  'Palavra-chave (jogador/clube) na legenda, no texto da tela E falada (SEO de busca)?',
  'Cliffhanger NOMEADO no fim (não vago) e sem tela preta morta (loop preservado)?',
  'Dá pra postar um capítulo que termina em suspense perto de um jogo real desta semana?',
  'Episódio adicionado à Playlist/Série da saga (TikTok e YouTube)?',
  '"Parte X" (aberto) no título e nas legendas? #sagafut como 1ª hashtag?',
]

export default function RedesView() {
  return (
    <div>
      <div className="panel">
        <h3>📱 Redes Sociais: estratégia e padrões da casa</h3>
        <p className="muted" style={{ marginBottom: 8 }}>
          Diagnóstico da 1ª saga (dia 1): no TikTok, retenção média de <strong>3-4s</strong> em
          vídeos de 40-70s e completude <strong>0-3%</strong>, quase ninguém passa do 3º segundo.
          O gargalo não é distribuição: é o <strong>gancho de abertura</strong>. Retenção é a
          métrica-mãe; view é consequência. Playbook completo em <code>saga-fut/ESTRATEGIA-REDES.md</code>;
          pesquisa de formatos em <code>saga-fut/PESQUISA-VIRALIZACAO.md</code>.
        </p>
        <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
          <strong>Hierarquia de sinais (TikTok, Shorts e Reels, do mais forte ao mais fraco):</strong> tempo
          assistido &gt; completude &gt; re-watch/loop &gt; compartilhamento e save &gt; comentário &gt; like.
          Like é o mais fraco desde 2025. Otimize cada vídeo pra tempo assistido e loop, nunca pra curtida.
        </p>
      </div>

      <div className="panel">
        <h3>Os 4 padrões inegociáveis <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(valem para vídeos antigos e novos)</span></h3>
        <ol style={{ margin: '6px 0 0', paddingLeft: 20, display: 'grid', gap: 8 }}>
          {PADROES.map(([t, d], i) => (
            <li key={i}><strong>{t}.</strong> <span className="muted">{d}</span></li>
          ))}
        </ol>
      </div>

      <div className="panel">
        <h3>Cadência-alvo <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(mais agressiva que 1/dia, sem queimar produção)</span></h3>
        <table className="tools-table" style={{ width: '100%' }}>
          <thead><tr><th>Peça</th><th>Frequência</th><th>Onde</th></tr></thead>
          <tbody>
            {CADENCIA.map(([p, f, o], i) => (
              <tr key={i}><td>{p}</td><td className="muted">{f}</td><td className="muted">{o}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          O "post diário" morreu como meta: consistência com boa retenção bate volume bruto. O que funciona é
          <strong> gravar a saga inteira (3 a 5 episódios) ANTES de lançar a Parte 1</strong> e soltar de 24 a 72h
          entre capítulos. Regra: acerte o gancho <strong>antes</strong> de aumentar a frequência. Postar mais vídeo
          com abertura fraca só desperdiça as entregas que o algoritmo te dá.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        {REDES.map((r) => (
          <div className="panel" key={r.nome} style={{ borderTop: `3px solid ${r.cor}`, margin: 0 }}>
            <h3 style={{ margin: 0 }}>{r.emoji} {r.nome}</h3>
            <p className="muted" style={{ margin: '4px 0 10px' }}>{r.papel}</p>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <span style={{ border: `1px solid ${r.cor}`, color: r.cor, borderRadius: 6, padding: '2px 8px' }}>⏱ {r.cadencia}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3fb950', marginBottom: 4 }}>✓ Funciona</div>
            <ul style={{ margin: '0 0 10px', paddingLeft: 18, display: 'grid', gap: 4 }}>
              {r.funciona.map((f, i) => <li key={i} className="muted" style={{ fontSize: 13 }}>{f}</li>)}
            </ul>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f85149', marginBottom: 4 }}>✕ Evita</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              {r.evita.map((f, i) => <li key={i} className="muted" style={{ fontSize: 13 }}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h3>✅ Checklist antes de postar</h3>
        <ul style={{ margin: '6px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
          {CHECKLIST.map((c, i) => <li key={i} className="muted">{c}</li>)}
        </ul>
      </div>

      <div className="panel">
        <h3>⚡ Velocidade: carona no jogo real (a maior alavanca que falta)</h3>
        <p className="muted" style={{ margin: '0 0 8px' }}>
          O 442oons (4,5M inscritos) provou o nicho com <strong>velocidade sobre perfeição</strong>: cartoon de
          um dia pro outro reagindo à rodada. A vantagem do SagaFut é juntar três coisas que bombam e quase
          ninguém combina: animação de futebol + micro-drama serial + carona no jogo real.
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li className="muted"><strong>Banco de cenas/personagens pré-renderizado</strong> pra montar um episódio-reação em horas. Janela de ouro: 0 a 2h após o assunto estourar.</li>
          <li className="muted"><strong>Calendário preso ao Barça:</strong> Clásico, Champions, janela de transferência e Copa 2026 (torneios fizeram o 442oons saltar de 900k pra 1M). Um especial por marco.</li>
          <li className="muted"><strong>Charge/tirinha de reação</strong> (imagem, motor barato) pra reagir a notícia quente sem esperar o render de vídeo.</li>
        </ul>
      </div>

      <div className="panel">
        <h3>⚠️ Risco de monetização (política de IA do YouTube)</h3>
        <p className="muted" style={{ margin: 0 }}>
          Em 15/07/2025 o YouTube trocou "conteúdo repetitivo" por <strong>"conteúdo inautêntico"</strong> e já
          encerrou canais 100% automatizados. IA NÃO é banida: a linha é <strong>IA como aumento vs. IA como
          substituição</strong> da criatividade humana. O SagaFut está do lado seguro (roteiro autoral, curadoria,
          olhar de torcedor, personagens próprios), mas precisa manter isso vivo e nunca virar pipeline cego.
          Reforça a regra dos dois públicos: a novela vende a história, o making-of "com IA" é a conta dev.
        </p>
      </div>
    </div>
  )
}
