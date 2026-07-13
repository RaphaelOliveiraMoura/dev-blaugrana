/* La Masia — app v4 (vanilla JS, sem build)
   Central do culé brasileiro: Prompts · Estúdio · Ideias · Alvos */
'use strict';

/* ============================= estado ============================= */

const DEFAULT_STATE = () => ({
  meta: { startDate: '2026-07-08', handle: '@dev_blaugrana' },
  ideas: [
    { id: uid(), pillar: 'R', text: 'Recap semanal do radar: o que virou oficial e o que esfriou na semana' },
    { id: uid(), pillar: 'P2', text: 'xG do Lewandowski temporada a temporada — a queda é real?' },
    { id: uid(), pillar: 'P2', text: "Todos os 9 do Barça pós-Eto'o: gols por 90 min num gráfico só" },
    { id: uid(), pillar: 'P1', text: 'Quiz de carreira: craques que passaram pelo Barça e ninguém lembra' },
    { id: uid(), pillar: 'P1', text: 'Carreira em emojis: cada clube vira rebus (🔵🔴 → …) — post de texto puro' },
    { id: uid(), pillar: 'P3', text: 'Build in public: como o radar é montado com IA em 10 min por dia' },
  ],
  targets: DEFAULT_TARGETS(),
  radar: { rumors: [] },
});

function DEFAULT_TARGETS() {
  return [
    { tier: 'Tier 1 — Gigantes (reply só ao vivo)', sub: 'Durante jogos e assuntos quentes. Fora disso, a reply afunda.', rows: [
      { handle: '@futebol_info', size: '2,7M', v: 'ok', note: 'Planeta do Futebol — pergunta/pauta diária' },
      { handle: '@fcbarcelona_br', size: '1,5M', v: 'ok', note: 'Barça oficial em PT — escalação e gols' },
      { handle: '@DoentesPFutebol', size: '923K', v: 'ok', note: 'humor + memória afetiva, matchday' },
      { handle: '@SofascoreBR', size: '719K', v: 'ok', note: 'reply de contexto no dado = sua vitrine' },
      { handle: '@TNTSportsBR', size: '~mi', v: 'approx', note: 'cobertura ao vivo' },
      { handle: '@ESPNBrasil', size: '~mi', v: 'approx', note: 'cobertura ao vivo' },
    ]},
    { tier: 'Tier 2 — Médias de futebol (alvo principal)', sub: 'Conversa de verdade. 200–30K seguidores: sua reply aparece e o autor responde.', rows: [
      { handle: '@leonardotipster', size: '31K', v: 'ok', note: 'referência do quiz seriado — estude e converse' },
      { handle: '@barcapelobrasil', size: '20K', v: 'ok', note: 'sua comunidade natural, presença diária' },
      { handle: '@CuriosidadesBRL', size: '~100K', v: 'approx', note: 'dono do formato interativo BR' },
      { handle: '@BarcaArchive', size: '~var', v: 'approx', note: 'nicho culé histórico' },
      { handle: '@culersgrasroot_', size: '~var', v: 'approx', note: 'grassroots culé' },
      { handle: '@memorabilia1899', size: '~var', v: 'approx', note: 'colecionismo Barça' },
      { handle: '@DiarioGols', size: '~var', v: 'approx', note: 'pauta diária BR' },
    ]},
    { tier: 'Tier 3 — Bolha dev BR (build in public)', sub: 'Reply técnica com vivência real de projeto > opinião genérica.', rows: [
      { handle: '@AkitaOnRails', size: '85K', v: 'ok', note: 'pauta idêntica ao build — posts protegidos: siga, interaja quando abrir' },
      { handle: '@FilipeDeschamps', size: '35K', v: 'ok', note: 'replies com experiência concreta performam' },
      { handle: '@ErickWendel', size: '~K', v: 'approx', note: 'Node/JS BR' },
      { handle: '@maykbrito', size: '~K', v: 'approx', note: 'front/educação' },
      { handle: '@diego3g', size: '~K', v: 'approx', note: 'Rocketseat' },
    ]},
    { tier: 'Tier 4 — Indie/IA global (EN, ocasional)', sub: 'Quando o post de build tiver achado técnico de verdade.', rows: [
      { handle: '@levelsio', size: '~600K', v: 'approx', note: 'indie hacking, ship rápido' },
      { handle: '@swyx', size: '~var', v: 'approx', note: 'AI engineering' },
      { handle: '@simonw', size: '~var', v: 'approx', note: 'LLMs na prática' },
    ]},
  ];
}

let state = null;
let saveTimer = null;

function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

async function load(silent) {
  let data = null;
  try {
    const r = await fetch('/api/state');
    data = await r.json();
    state = data && data.meta ? data : DEFAULT_STATE();
  } catch {
    state = DEFAULT_STATE();
  }
  if (!data_ok(state)) state = DEFAULT_STATE();
  pruneState(state);
  renderAll();
  if (!silent) save();
}
function data_ok(s) { return s && s.meta && Array.isArray(s.ideas) && s.radar; }

// normaliza o que a v4 usa e descarta o que ficou pra trás (pipeline, placar, sync…)
function pruneState(s) {
  s.ideas = s.ideas || [];
  s.radar = s.radar || { rumors: [] };
  s.radar.rumors = s.radar.rumors || [];
  if (!Array.isArray(s.targets) || !s.targets.length) s.targets = DEFAULT_TARGETS();
  delete s.pipeline; delete s.weekly; delete s.days; delete s.sync; delete s.inbox;
  if (s.meta) { delete s.meta.quizCounter; delete s.meta.notify; }
  // seleção do card (sel): na 1ª vez, liga os 6 rumores ativos mais recentes
  const rum = s.radar.rumors;
  if (rum.length && rum.every((r) => r.sel === undefined)) {
    const ord = rum.filter((r) => !r.arquivado).sort((a, b) => (b.atualizado || '').localeCompare(a.atualizado || ''));
    const on = new Set(ord.slice(0, 6).map((r) => r.id));
    rum.forEach((r) => { r.sel = on.has(r.id); });
  } else {
    rum.forEach((r) => { if (r.sel === undefined) r.sel = false; });
  }
  return s;
}

function save() {
  const el = document.getElementById('save-status');
  el.classList.add('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
      el.classList.remove('saving', 'error');
      el.title = 'salvo ' + new Date().toLocaleTimeString('pt-BR');
    } catch {
      el.classList.remove('saving');
      el.classList.add('error');
      el.title = 'erro ao salvar — dados só em memória';
    }
  }, 400);
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) load(true); });
document.getElementById('btn-refresh').addEventListener('click', () => { load(true); toast('Dados recarregados do disco.'); });

/* ============================= tabs ============================= */

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b === btn));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + btn.dataset.tab));
});

function planWeek() {
  const start = new Date(state.meta.startDate + 'T00:00:00');
  return Math.max(1, Math.floor((new Date() - start) / (7 * 864e5)) + 1);
}

/* ============================= PROMPTS ============================= */

function buildBriefing() {
  const ativos = activeRumors();
  const lines = [];
  lines.push('# Contexto — @dev_blaugrana (' + new Date().toLocaleDateString('pt-BR') + ')');
  lines.push('\nSou um dev brasileiro, torcedor do Barcelona, tocando o perfil @dev_blaugrana no X como "central do culé brasileiro". Proposta: entregar valor real de graça, construído por um dev. Bio atual:');
  lines.push('"Central do culé brasileiro 🟦🟥 Radar de rumores com nota de confiabilidade · Estatísticas · Bolão com prêmios. Tudo grátis, construído por um dev".');
  lines.push('\n## As três frentes');
  lines.push('1. RADAR BLAUGRANA (no ar) — curadoria diária dos rumores do mercado do Barça com nota de confiabilidade A/B/C/D por fonte.');
  lines.push('2. LAMINE × MESSI na mesma idade (a construir) — tracker comparando os dois dia a dia, alinhado por idade.');
  lines.push('3. BOLÃO BLAUGRANA (estreia com La Liga, agosto) — bolão mensal com prêmios Pix (R$150/80/20).');
  lines.push('\n## Radar agora — ' + ativos.length + ' rumor(es) ativo(s)');
  for (const r of ativos.slice(0, 12)) {
    lines.push(`- ${r.jogador} (${r.direcao}/${r.estagio}, tier ${r.tier}, ${r.fonte})${r.nota ? ': ' + r.nota : ''}`);
  }
  if (state.ideas && state.ideas.length) {
    lines.push('\n## Ideias soltas no banco');
    for (const i of state.ideas.slice(0, 10)) lines.push('- ' + i.text);
  }
  lines.push('\n## Distribuição');
  lines.push('Reply é o motor (≈27× um like, ≈150× quando o autor responde). Link externo no post principal zera o alcance — link sempre na reply. Meta de 20–30 replies/dia nos alvos de futebol e da bolha dev.');
  lines.push('\n## O que eu quero de você');
  lines.push('Com base nesse contexto: (1) me dê 5 ideias NOVAS de post no meu tom, priorizando as três frentes; (2) aponte um ângulo que eu não estou explorando; (3) uma ideia fora da caixa pra ganhar alcance com conta pequena.');
  return lines.join('\n');
}

function buildRumoresPrompt() {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return [
    `Você é meu editor de mercado do FC Barcelona. Hoje é ${hoje}. Pesquise na web as notícias e rumores de transferência MAIS RECENTES envolvendo o Barcelona (masculino e feminino) — entradas, saídas e renovações.`,
    '',
    'Priorize e cruze estas fontes, da mais confiável para a menos:',
    '- Tier A: anúncios oficiais do FC Barcelona ou do jogador/clube envolvido',
    '- Tier B: Fabrizio Romano, David Ornstein (The Athletic), RAC1, Toni Juanmartí',
    '- Tier C: Sport, Mundo Deportivo, Marca, AS, Gerard Romero, imprensa estabelecida',
    '- Tier D: agregadores, caça-clique, "fontes próximas" sem assinatura',
    '',
    'Para cada história que for de fato um rumor/negócio de transferência (ignore análise tática, lesão, resultado), retorne UMA linha EXATAMENTE neste formato, sem numeração e sem nenhum texto antes ou depois:',
    '',
    'jogador | time | direção | estágio | fonte | tier | resumo | link',
    '',
    'Regras:',
    '- time: o clube diretamente ligado ao rumor (o de ORIGEM se o jogador chega ao Barça; o de DESTINO se o jogador sai do Barça; o atual se for renovação). Use o nome oficial pra bater o escudo, ex.: Atlético de Madrid, Manchester United, Al-Hilal. Se não houver clube claro, deixe vazio.',
    '- direção: chega, sai ou renova',
    '- estágio: especulação, interesse, negociação, acordo, oficial ou negado',
    '- tier: A, B, C ou D conforme a fonte de maior credibilidade que sustenta a história',
    '- fonte: o nome da fonte principal (ex.: Fabrizio Romano, Sport, FC Barcelona)',
    '- resumo: máx. 90 caracteres, em PT-BR — ele aparece INTEIRO no card, seja conciso e informativo',
    '- moeda: sempre a da reportagem original (€, £, US$) — NUNCA converta para reais',
    '- se a mesma história aparece em várias fontes, consolide na versão da fonte de tier mais alto',
    '- link: o link direto da reportagem original quando conseguir; senão deixe o campo vazio',
    '- traga no máximo 15 rumores, dos mais quentes/recentes; descarte o que já é velho e resolvido',
    '',
    'Retorne SÓ as linhas nesse formato. Vou colar direto no meu sistema.',
  ].join('\n');
}

function buildStatsPrompt() {
  return [
    'Você é meu analista de dados de futebol. Quero um comparativo "na mesma idade" entre Lamine Yamal e Lionel Messi, para eu montar um card de comparação.',
    '',
    'Considere a carreira de cada um ATÉ a idade que o Lamine tem hoje (alinhe por idade, não por temporada). Pesquise em fontes confiáveis (FBref, Transfermarkt, Sofascore) e me diga a data de corte que usou.',
    '',
    'Retorne DUAS coisas:',
    '',
    '1) As métricas no formato exato abaixo, uma por linha, sem texto extra (é o que meu template lê):',
    'rótulo | valor Lamine | valor Messi',
    '',
    'Use estas métricas (todas pelo clube, no período alinhado por idade):',
    '- Jogos pelo clube',
    '- Gols',
    '- Assistências',
    '- Minutos em campo',
    '- Títulos',
    '',
    '2) DEPOIS das linhas, um bloco "FONTES:" com a fonte e a data de cada número, para eu conferir antes de postar.',
    '',
    'Se algum dado for incerto ou estimado, marque com (~) e explique nas fontes. Precisão é essencial — fato errado nesse nicho custa caro.',
  ].join('\n');
}

function buildBolaoPrompt() {
  return [
    'Você é meu produtor do "Bolão Blaugrana": um bolão mensal e gratuito de palpites dos jogos do Barcelona, com prêmios simbólicos via Pix (R$150 / R$80 / R$20 para o pódio do mês). Estreia na 1ª rodada de La Liga (agosto/2026). Os palpites entram por reply no X; eu apuro na mão.',
    '',
    'Preciso de ajuda para preparar a PRÓXIMA rodada. Pesquise na web e me entregue:',
    '',
    '1) Os jogos do Barcelona no período (data, adversário, competição, mando de campo).',
    '2) Um formato enxuto de palpite que caiba numa reply (ex.: placar exato de cada jogo).',
    '3) Um sistema de pontuação simples e justo (ex.: X pts placar exato, Y pts acertar o vencedor).',
    '4) O texto do post de abertura da rodada, no meu tom (direto, culé, sem forçar).',
    '5) Um rascunho curto de REGULAMENTO que deixe claro: participação gratuita, sem pagamento para jogar, prêmio como cortesia (concurso recreativo, sem sorteio de azar — Lei 5.768/71), 1 conta por pessoa, prazo = início do primeiro jogo, critério de desempate.',
    '',
    'Seja objetivo e me devolva pronto para copiar.',
  ].join('\n');
}

const PROMPTS = [
  { id: 'rumores', nome: 'Coletar rumores de transferência', tag: 'Radar', quando: 'Toda vez que for montar o RADAR do dia. O Claude pesquisa as fontes e devolve as linhas prontas pro "Importar da IA" no Estúdio.', build: buildRumoresPrompt },
  { id: 'stats', nome: 'Comparativo de estatísticas', tag: 'Lamine × Messi', quando: 'Pra montar o card Versus com números conferidos e alinhados por idade.', build: buildStatsPrompt },
  { id: 'bolao', nome: 'Estruturar a rodada do Bolão', tag: 'Bolão', quando: 'Pra preparar a rodada: jogos, formato de palpite, pontuação, post de abertura e regulamento.', build: buildBolaoPrompt },
  { id: 'bingo', nome: 'Gerar eventos do Bingo', tag: 'Bingo', quando: 'Pra montar o menu de eventos + AURA de um jogo específico. Preencha os times no Estúdio → Bingo antes de copiar.', build: buildBingoPrompt },
  { id: 'briefing', nome: 'Briefing do estado', tag: 'Contexto', quando: 'Pra começar uma conversa nova com o Claude já com todo o contexto do perfil e pedir ideias.', build: buildBriefing },
];

function renderPrompts() {
  const el = document.getElementById('prompts-list');
  el.innerHTML = PROMPTS.map((p) => `
    <div class="prompt-card" data-id="${p.id}">
      <div class="prompt-head">
        <div>
          <span class="prompt-tag">${esc(p.tag)}</span>
          <h2>${esc(p.nome)}</h2>
          <p class="muted small">${esc(p.quando)}</p>
        </div>
        <button class="primary prompt-copy" data-id="${p.id}">Copiar prompt</button>
      </div>
      <details class="prompt-fold">
        <summary>ver o prompt</summary>
        <pre class="prompt-pre">${esc(p.build())}</pre>
      </details>
    </div>`).join('');
  el.querySelectorAll('.prompt-copy').forEach((b) => b.addEventListener('click', async () => {
    const p = PROMPTS.find((x) => x.id === b.dataset.id);
    await navigator.clipboard.writeText(p.build());
    toast('Prompt copiado — cole no Claude.');
  }));
}

/* ============================= ESTÚDIO ============================= */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const PALETTES = {
  casa: {
    bg1: '#141824', bg2: '#0E1119', blau: '#5B8FD0', grana: '#C4436F',
    text: '#F2F3F7', dim: 'rgba(255,255,255,0.45)', gold: '#D2A94B', pink: '#E27A9B',
    line: 'rgba(255,255,255,0.20)', faint: 'rgba(255,255,255,0.08)', plate: 'rgba(255,255,255,0.94)',
  },
  fora: {
    bg1: '#F7F5EE', bg2: '#EAE7DC', blau: '#0F4C92', grana: '#A50044',
    text: '#1D2433', dim: 'rgba(29,36,51,0.52)', gold: '#9C7514', pink: '#A50044',
    line: 'rgba(29,36,51,0.25)', faint: 'rgba(29,36,51,0.10)', plate: 'rgba(255,255,255,0.96)',
  },
};
let CV = { ...PALETTES.casa };

function cvBase() {
  const W = canvas.width, H = canvas.height;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, CV.bg1);
  g.addColorStop(1, CV.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0F4C92'; ctx.fillRect(0, 0, 14, H);
  ctx.fillStyle = '#A50044'; ctx.fillRect(14, 0, 14, H);
  ctx.fillStyle = CV.dim;
  ctx.font = '600 22px "Avenir Next", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('@dev_blaugrana', W - 40, H - 37);
  ctx.textAlign = 'left';
}

/* ---- escudos ---- */
const BADGE_ALIAS = {
  'psg': 'Paris Saint Germain', 'paris saint-germain': 'Paris Saint Germain',
  'inter de milão': 'Inter Milan', 'inter de milao': 'Inter Milan', 'inter': 'Inter Milan',
  'milan': 'AC Milan',
  'atlético-mg': 'Atletico Mineiro', 'atletico-mg': 'Atletico Mineiro', 'atlético mineiro': 'Atletico Mineiro',
  'bayern': 'Bayern Munich', 'bayern de munique': 'Bayern Munich',
  'deportivo la coruña': 'Deportivo La Coruna',
  'lille': 'Lille OSC', 'losc': 'Lille OSC',
  'vasco': 'Vasco da Gama',
  'grêmio': 'Gremio',
  'querétaro': 'Queretaro',
  'city': 'Manchester City', 'united': 'Manchester United',
  'atlético de madrid': 'Atletico Madrid', 'atletico de madrid': 'Atletico Madrid',
  'são paulo': 'Sao Paulo', 'sao paulo': 'Sao Paulo',
  'athletico-pr': 'Athletico Paranaense',
  'espanha': 'Spain', 'spain': 'Spain', 'seleção espanhola': 'Spain',
  'bélgica': 'Belgium', 'belgica': 'Belgium', 'belgium': 'Belgium',
  'real madrid': 'Real Madrid', 'madrid': 'Real Madrid',
};
const badgeCache = new Map();

function badgeKey(club) { return club.toLowerCase().trim(); }

function loadBadge(club) {
  if (!club) return Promise.resolve(null);
  const key = badgeKey(club);
  if (badgeCache.has(key)) return Promise.resolve(badgeCache.get(key));
  const apiName = BADGE_ALIAS[key] || club;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { badgeCache.set(key, img); resolve(img); };
    img.onerror = () => { badgeCache.set(key, null); resolve(null); };
    img.src = '/api/badge?team=' + encodeURIComponent(apiName);
  });
}

async function preloadBadges(clubs) {
  await Promise.all(clubs.map((c) => loadBadge(typeof c === 'string' ? c : c.club)));
}

// placa clara + escudo (ou iniciais) — usado por timeline, placar, versus e top5
function drawBadge(x, y, R, club) {
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = CV.plate;
  ctx.fill();
  ctx.lineWidth = Math.max(2, R / 14);
  ctx.strokeStyle = CV.gold;
  ctx.stroke();

  const img = club ? badgeCache.get(badgeKey(club)) : null;
  if (img) {
    const s = (R - Math.max(5, R / 7)) * 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, R - Math.max(4, R / 9), 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
    ctx.restore();
  } else {
    const initials = (club || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
    ctx.fillStyle = '#141824';
    ctx.font = `800 ${Math.round(R * 0.8)}px "Avenir Next Condensed", "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(initials, x, y + R * 0.28);
    ctx.textAlign = 'left';
  }
}

// escudo sem placa/anel — desenha só a arte (crest transparente do TheSportsDB).
// usado pelo Barça em destaque no topo do radar
function drawLogoPlain(x, y, R, club) {
  const img = club ? badgeCache.get(badgeKey(club)) : null;
  if (img) {
    const ratio = img.width && img.height ? img.width / img.height : 1;
    let w = R * 2, h = R * 2;
    if (ratio >= 1) h = w / ratio; else w = h * ratio;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  } else {
    const initials = (club || '?').split(/\s+/).map((s) => s[0]).join('').slice(0, 3).toUpperCase();
    ctx.fillStyle = CV.text;
    ctx.font = `800 ${Math.round(R * 0.95)}px "Avenir Next Condensed", "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(initials, x, y + R * 0.3);
    ctx.textAlign = 'left';
  }
}

function drawTitle(text, y = 78, size = 34) {
  ctx.textAlign = 'center';
  ctx.fillStyle = CV.pink;
  ctx.font = `700 ${size}px "Avenir Next Condensed", "Arial Narrow", sans-serif`;
  ctx.fillText(text, 600, y);
  ctx.textAlign = 'left';
}

/* ---- template: carreira na timeline ---- */
function getClubs() {
  return val('q-clubs').split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => { const [club, years] = l.split('|').map((s) => (s || '').trim()); return { club, years }; });
}
function timelineTitle() {
  return val('q-modo') === 'mentira' ? 'UMA DESSAS PASSAGENS É MENTIRA' : 'DE QUEM É ESSA CARREIRA?';
}

function drawTimeline(clubs, upTo) {
  const n = clubs.length;
  if (!n) return;
  const x0 = 120, x1 = 1080, axisY = 380;
  const step = n > 1 ? (x1 - x0) / (n - 1) : 0;
  const R = step && step < 125 ? 30 : 36;

  ctx.strokeStyle = CV.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0 - 26, axisY);
  ctx.lineTo(x1 + 26, axisY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1 + 26, axisY);
  ctx.lineTo(x1 + 14, axisY - 7);
  ctx.moveTo(x1 + 26, axisY);
  ctx.lineTo(x1 + 14, axisY + 7);
  ctx.stroke();

  const fsClub = step && step < 125 ? 23 : 27;
  const shown = upTo == null ? n : Math.min(upTo, n);

  for (let i = 0; i < n; i++) {
    const x = n > 1 ? x0 + i * step : (x0 + x1) / 2;
    const above = i % 2 === 0;
    const visible = i < shown;

    if (!visible) {
      ctx.beginPath();
      ctx.arc(x, axisY, 8, 0, Math.PI * 2);
      ctx.fillStyle = CV.faint;
      ctx.fill();
      continue;
    }

    drawBadge(x, axisY, R, clubs[i].club);

    let club = clubs[i].club || '';
    if (club.length > 15) club = club.slice(0, 14) + '…';
    const nameY = above ? axisY - R - 34 : axisY + R + 44;
    const yearY = above ? nameY - 28 : nameY + 28;
    ctx.textAlign = 'center';
    ctx.fillStyle = CV.text;
    ctx.font = `700 ${fsClub}px "Avenir Next Condensed", "Arial Narrow", sans-serif`;
    ctx.fillText(club, x, nameY);
    if (clubs[i].years) {
      ctx.fillStyle = CV.dim;
      ctx.font = '500 18px ui-monospace, Menlo, monospace';
      ctx.fillText(clubs[i].years, x, yearY);
    }
    ctx.textAlign = 'left';
  }
}

async function renderQuizCanvas() {
  const clubs = getClubs();
  await preloadBadges(clubs);
  cvBase();
  drawTitle(timelineTitle());
  drawTimeline(clubs, null);
  const tempero = val('q-tempero');
  if (tempero) {
    ctx.textAlign = 'center';
    ctx.fillStyle = CV.dim;
    ctx.font = 'italic 500 24px "Avenir Next", system-ui, sans-serif';
    ctx.fillText(tempero, 600, 624);
    ctx.textAlign = 'left';
  }
}

function quizPostText() {
  const num = String(val('q-num') || 1).padStart(3, '0');
  const lines = getClubs().map((c) => `▸ ${c.club}${c.years ? ' (' + c.years + ')' : ''}`);
  const tempero = val('q-tempero');
  if (val('q-modo') === 'mentira') {
    return `DE QUEM É ESSA CARREIRA? #${num}\n\n⚠️ uma dessas passagens é MENTIRA\n\n${lines.join('\n')}\n\n${tempero ? tempero + ' ' : ''}Qual é a farsa? Resposta às 21h nas replies.`;
  }
  return `DE QUEM É ESSA CARREIRA? #${num}\n\n${lines.join('\n')}\n\n${tempero ? tempero + ' ' : ''}Sem Google. Resposta hoje às 21h aqui nas replies.`;
}

/* ---- vídeo revelação (timeline) ---- */
let recording = false;

function drawRevealFrame(tMs, clubs) {
  const INTRO = 1600, PER = 1400, HOLD = 1600, OUTRO = 2200;
  const n = clubs.length;
  const total = INTRO + n * PER + HOLD + OUTRO;

  cvBase();

  if (tMs < INTRO) {
    const a = Math.min(1, tMs / 400);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = CV.pink;
    ctx.font = '700 58px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.fillText(timelineTitle(), 600, 320);
    ctx.fillStyle = CV.dim;
    ctx.font = '500 28px "Avenir Next", system-ui, sans-serif';
    ctx.fillText('⏱ pausa quando souber', 600, 400);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  } else if (tMs < INTRO + n * PER + HOLD) {
    const k = Math.min(n, Math.floor((tMs - INTRO) / PER) + 1);
    drawTitle(timelineTitle());
    drawTimeline(clubs, k);
    ctx.fillStyle = CV.dim;
    ctx.font = '600 26px ui-monospace, Menlo, monospace';
    ctx.fillText(`${k}/${n}`, 80, 624);
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = CV.text;
    ctx.font = '700 56px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.fillText('E aí, quem é? 👇', 600, 330);
    ctx.fillStyle = CV.gold;
    ctx.font = '700 32px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.fillText('@dev_blaugrana', 600, 410);
    ctx.textAlign = 'left';
  }
  return tMs < total;
}

async function recordQuizVideo() {
  if (recording) return;
  const clubs = getClubs();
  if (!clubs.length) return toast('Preencha a carreira primeiro.');
  const status = document.getElementById('q-video-status');

  const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
    .find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
  if (!mime) { status.textContent = 'Este navegador não suporta gravação de canvas.'; return; }
  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';

  recording = true;
  status.textContent = 'Carregando escudos…';
  await preloadBadges(clubs);
  status.textContent = 'Gravando… (o preview mostra a animação em tempo real)';
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((res) => { rec.onstop = res; });
  rec.start(200);

  const t0 = performance.now();
  await new Promise((resolve) => {
    const loop = () => {
      const alive = drawRevealFrame(performance.now() - t0, clubs);
      if (alive && recording) requestAnimationFrame(loop);
      else resolve();
    };
    requestAnimationFrame(loop);
  });

  rec.stop();
  await stopped;
  recording = false;

  const blob = new Blob(chunks, { type: mime });
  const num = String(val('q-num') || 1).padStart(3, '0');
  const a = document.createElement('a');
  a.download = `quiz-${num}.${ext}`;
  a.href = URL.createObjectURL(blob);
  a.click();
  status.textContent = ext === 'mp4'
    ? `Vídeo salvo (quiz-${num}.mp4) — pronto para anexar no X.`
    : `Vídeo salvo em WebM (o X não aceita WebM). Converta: ffmpeg -i quiz-${num}.webm -c:v libx264 -pix_fmt yuv420p quiz-${num}.mp4`;
  activeTpl.render();
}

/* ---- template: que jogo é esse? ---- */
async function renderPlacarTpl() {
  const A = val('p-timeA'), B = val('p-timeB');
  await preloadBadges([A, B]);
  cvBase();
  const misterio = val('p-modo') === 'misterio';
  drawTitle(misterio ? 'QUE JOGO É ESSE?' : (val('p-titulo') || 'FIM DE JOGO').toUpperCase(), 90, 42);

  drawBadge(300, 350, 88, A);
  drawBadge(900, 350, 88, B);

  ctx.textAlign = 'center';
  ctx.fillStyle = CV.gold;
  ctx.font = '800 130px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  ctx.fillText(`${val('p-golsA') || '?'} × ${val('p-golsB') || '?'}`, 600, 395);

  if (!misterio) {
    ctx.fillStyle = CV.text;
    ctx.font = '700 30px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    let a = A, b = B;
    if (a.length > 16) a = a.slice(0, 15) + '…';
    if (b.length > 16) b = b.slice(0, 15) + '…';
    ctx.fillText(a, 300, 496);
    ctx.fillText(b, 900, 496);
  }

  const dica = val('p-dica');
  if (dica) {
    ctx.fillStyle = CV.dim;
    ctx.font = 'italic 500 27px "Avenir Next", system-ui, sans-serif';
    ctx.fillText(dica, 600, 574);
  }
  ctx.textAlign = 'left';
}
function placarPostText() {
  const misterio = val('p-modo') === 'misterio';
  if (misterio) return `QUE JOGO É ESSE? 🧠\n\n${val('p-dica')}\n\nResposta às 21h nas replies.`;
  return `${val('p-timeA')} ${val('p-golsA')} × ${val('p-golsB')} ${val('p-timeB')}\n\n${val('p-dica')}`;
}

/* ---- template: bingo blaugrana ---- */
function parseBingoSel(s) {
  const t = String(s || '').trim().toLowerCase();
  return t === '✓' || t === 'x' || t === '1' || t === 'sim' || t === 's' || t === 'yes' || t === 'y';
}

function getBingoEvents() {
  const lines = val('bg-eventos').split('\n');
  const events = [];
  for (let i = 0; i < lines.length; i++) {
    const trim = lines[i].trim();
    if (!trim) continue;
    const parts = trim.split('|').map((s) => (s || '').trim());
    events.push({
      evento: parts[0] || '',
      aura: parseInt(parts[1], 10) || 0,
      sel: parts.length >= 3 ? parseBingoSel(parts[2]) : false,
      lineIdx: i,
    });
  }
  return events;
}

function getBingoCard() {
  return getBingoEvents().filter((e) => e.sel);
}

function wrapBingoText(text, maxW, maxLines, font) {
  ctx.font = font;
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  const full = words.join(' ');
  if (lines.join(' ') !== full && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    lines[lines.length - 1] = last + '…';
  }
  return lines;
}

function drawBingoCell(x, y, w, h, evento, aura) {
  ctx.fillStyle = CV.faint;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();

  // AURA no topo — grande e dourado
  ctx.fillStyle = CV.gold;
  ctx.font = '800 28px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`+${aura}`, x + w / 2, y + 38);

  ctx.fillStyle = CV.dim;
  ctx.font = '700 14px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('AURA', x + w / 2, y + 56);

  // evento — tipografia grande pra ler no celular
  const font = '700 26px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  const lines = wrapBingoText(evento, w - 36, 3, font);
  ctx.fillStyle = CV.text;
  ctx.font = font;
  const lineH = 32;
  const blockH = lines.length * lineH;
  const textAreaTop = y + 72;
  const textAreaH = h - 88;
  let ty = textAreaTop + Math.max(0, (textAreaH - blockH) / 2) + 24;
  for (const ln of lines) {
    ctx.fillText(ln, x + w / 2, ty);
    ty += lineH;
  }
  ctx.textAlign = 'left';
}

function renderBingoSummary() {
  const el = document.getElementById('bingo-summary');
  if (!el) return;
  const all = getBingoEvents();
  const card = getBingoCard();
  const pick = parseInt(val('bg-pick'), 10) || 9;
  const totalAura = card.reduce((s, e) => s + e.aura, 0);
  const warn = card.length !== pick
    ? `<span class="bingo-warn">${card.length} marcados — o post pede ${pick}</span>`
    : `<span class="bingo-ok">${card.length} eventos na cartela</span>`;
  el.innerHTML = `
    <div class="bingo-sum-row">${warn} · <b>+${totalAura} AURA</b> se acertar tudo · ${all.length} eventos no menu</div>
    <div class="bingo-chips">${all.map((e) =>
      `<button type="button" class="bingo-chip ${e.sel ? 'on' : ''}" data-line="${e.lineIdx}">${esc(e.evento)} <b>+${e.aura} AURA</b></button>`
    ).join('')}</div>`;
  el.querySelectorAll('.bingo-chip').forEach((b) => b.addEventListener('click', () => toggleBingoEvent(+b.dataset.line)));
}

function toggleBingoEvent(lineIdx) {
  const lines = val('bg-eventos').split('\n');
  if (lineIdx < 0 || lineIdx >= lines.length) return;
  const trim = lines[lineIdx].trim();
  if (!trim) return;
  const parts = trim.split('|').map((s) => (s || '').trim());
  while (parts.length < 3) parts.push('');
  parts[2] = parseBingoSel(parts[2]) ? '' : '✓';
  lines[lineIdx] = parts.join(' | ');
  document.getElementById('bg-eventos').value = lines.join('\n');
  renderBingoSummary();
  if (activeTpl.id === 'bingo') void renderBingoTpl();
}

function bindBingoUI() {
  document.querySelectorAll('.bingo-preset').forEach((b) => b.addEventListener('click', () => {
    document.getElementById('bg-timeA').value = b.dataset.a;
    document.getElementById('bg-timeB').value = b.dataset.b;
    if (activeTpl.id === 'bingo') void renderBingoTpl();
  }));
  document.getElementById('bg-eventos').addEventListener('input', () => {
    renderBingoSummary();
    if (activeTpl.id === 'bingo') void renderBingoTpl();
  });
  document.getElementById('bg-pick').addEventListener('change', () => {
    const pick = val('bg-pick');
    const lbl = document.getElementById('bg-pick-label');
    if (lbl) lbl.textContent = pick;
    if (activeTpl.id === 'bingo') void renderBingoTpl();
  });
  renderBingoSummary();
}
bindBingoUI();

async function renderBingoTpl() {
  // vertical 4:5 — ocupa o feed no celular (mesmo formato do Radar)
  canvas.width = 1080;
  canvas.height = 1350;
  const W = canvas.width, H = canvas.height;
  const M = 56;

  const ptitle = document.getElementById('preview-title');
  if (ptitle) ptitle.innerHTML = 'Preview <span class="muted small">1080×1350 · vertical 4:5 (celular)</span>';

  const A = val('bg-timeA'), B = val('bg-timeB');
  await preloadBadges([A, B]);
  cvBase();

  const num = String(val('bg-num') || 1).padStart(3, '0');
  const ctxo = val('bg-contexto');
  const modo = val('bg-modo');
  const all = getBingoEvents();
  const card = getBingoCard();
  const pick = val('bg-pick');

  // ── título ──
  ctx.fillStyle = CV.pink;
  ctx.font = '700 44px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('BINGO BLAUGRANA', M, 78);
  ctx.fillStyle = CV.gold;
  ctx.font = '700 32px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`#${num}`, W - M, 78);
  ctx.textAlign = 'left';

  // ── partida: escudos grandes + nomes ──
  const matchY = 170;
  const badgeR = 48;
  const leftX = W * 0.28;
  const rightX = W * 0.72;
  drawBadge(leftX, matchY, badgeR, A);
  drawBadge(rightX, matchY, badgeR, B);

  ctx.textAlign = 'center';
  ctx.fillStyle = CV.gold;
  ctx.font = '800 36px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('×', W / 2, matchY + 12);

  let aName = A, bName = B;
  if (aName.length > 16) aName = aName.slice(0, 15) + '…';
  if (bName.length > 16) bName = bName.slice(0, 15) + '…';
  ctx.fillStyle = CV.text;
  ctx.font = '700 28px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  ctx.fillText(aName, leftX, matchY + badgeR + 36);
  ctx.fillText(bName, rightX, matchY + badgeR + 36);

  if (ctxo) {
    ctx.fillStyle = CV.dim;
    ctx.font = 'italic 500 22px "Avenir Next", system-ui, sans-serif';
    ctx.fillText(ctxo, W / 2, matchY + badgeR + 68);
  }
  ctx.textAlign = 'left';

  const afterMatch = matchY + badgeR + (ctxo ? 90 : 56);

  if (modo === 'menu') {
    // instrução
    ctx.fillStyle = CV.dim;
    ctx.font = '600 22px "Avenir Next", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Escolha ${pick} eventos · cada acerto soma AURA`, W / 2, afterMatch + 8);
    ctx.textAlign = 'left';

    if (!all.length) return;
    const y0 = afterMatch + 40;
    const avail = H - 90 - y0;
    const rowH = Math.min(52, avail / all.length);
    for (let i = 0; i < all.length; i++) {
      const e = all[i];
      const y = y0 + i * rowH + rowH * 0.68;
      ctx.fillStyle = e.sel ? CV.gold : CV.dim;
      ctx.font = '700 24px "Avenir Next", system-ui, sans-serif';
      ctx.fillText(e.sel ? '▸' : '·', M, y);
      ctx.fillStyle = e.sel ? CV.text : CV.dim;
      ctx.font = `${e.sel ? '700' : '500'} 28px "Avenir Next Condensed", "Arial Narrow", sans-serif`;
      let ev = e.evento;
      while (ev.length > 4 && ctx.measureText(ev).width > W - M * 2 - 180) ev = ev.slice(0, -1);
      if (ev !== e.evento) ev += '…';
      ctx.fillText(ev, M + 36, y);
      ctx.fillStyle = CV.gold;
      ctx.font = '800 26px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`+${e.aura}`, W - M, y);
      ctx.textAlign = 'left';
    }
    return;
  }

  // ── cartela ──
  const items = card;
  // instrução clara
  ctx.fillStyle = CV.dim;
  ctx.font = '600 22px "Avenir Next", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Monte sua cartela · acerte = ganhe AURA', W / 2, afterMatch + 8);
  ctx.textAlign = 'left';

  if (!items.length) {
    ctx.textAlign = 'center';
    ctx.fillStyle = CV.dim;
    ctx.font = '500 26px "Avenir Next", system-ui, sans-serif';
    ctx.fillText('Marque eventos com ✓ para montar a cartela', W / 2, afterMatch + 120);
    ctx.textAlign = 'left';
    return;
  }

  const cols = items.length <= 4 ? 2 : 3;
  const rows = Math.ceil(items.length / cols);
  const gap = 12;
  const gridTop = afterMatch + 36;
  const gridBottom = H - 100;
  const gridW = W - M * 2;
  const gridH = gridBottom - gridTop;
  const cellW = (gridW - gap * (cols - 1)) / cols;
  const cellH = (gridH - gap * (rows - 1)) / rows;

  for (let i = 0; i < items.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    drawBingoCell(
      M + col * (cellW + gap),
      gridTop + row * (cellH + gap),
      cellW, cellH,
      items[i].evento, items[i].aura,
    );
  }

  const totalAura = items.reduce((s, e) => s + e.aura, 0);
  ctx.textAlign = 'center';
  ctx.fillStyle = CV.gold;
  ctx.font = '800 28px ui-monospace, Menlo, monospace';
  ctx.fillText(`BINGO = +${totalAura} AURA`, W / 2, H - 52);
  ctx.textAlign = 'left';
}

function bingoPostText() {
  const num = String(val('bg-num') || 1).padStart(3, '0');
  const A = val('bg-timeA'), B = val('bg-timeB');
  const pick = val('bg-pick');
  const all = getBingoEvents();
  const card = getBingoCard();
  const ctxo = val('bg-contexto');

  const lines = [
    `BINGO BLAUGRANA #${num} ⚽`,
    '',
    `${A} × ${B}`,
    ctxo,
    '',
    `Monte sua cartela com ${pick} eventos do menu abaixo.`,
    'Cada acerto soma AURA 👇',
    '',
    ...all.map((e) => `· ${e.evento} (+${e.aura} AURA)${e.sel ? ' ☑' : ''}`),
    '',
    `Responda com seus ${pick} palpites antes do apito inicial!`,
  ];
  if (card.length) {
    lines.push('', '—', 'Cartela sugerida (opcional):', ...card.map((e) => `☐ ${e.evento}`));
  }
  return lines.join('\n');
}

function buildBingoPrompt() {
  const A = val('bg-timeA') || 'Time A';
  const B = val('bg-timeB') || 'Time B';
  const ctxo = val('bg-contexto') || 'competição e horário';
  return [
    `Você é meu produtor do "Bingo Blaugrana": um jogo diário onde a audiência monta uma cartela de eventos que podem acontecer numa partida. Cada evento tem um valor de AURA (pontos) baseado na raridade — quanto mais improvável, mais AURA.`,
    '',
    `Partida: ${A} × ${B}`,
    `Contexto: ${ctxo}`,
    '',
    'Me entregue uma lista de 12–16 eventos possíveis, no formato:',
    'evento | aura | ✓',
    '',
    'Onde:',
    '- aura = pontos se acertar (10 = comum, 15–25 = moderado, 30–40 = raro, 50+ = muito raro)',
    '- ✓ = eventos sugeridos para a cartela oficial (marque exatamente 9 com ✓)',
    '',
    'Inclua mix de: resultado, gols de jogadores específicos, eventos raros (hat-trick, gol contra, defesaça, pênalti, etc.), cartões, substituições.',
    'Seja criativo mas realista para ESTA partida específica. Pesquise elencos recentes se necessário.',
    'Responda só com as linhas, prontas para colar no Estúdio.',
  ].join('\n');
}

/* ---- template: versus ---- */
function parseNum(s) {
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function getVersusStats() {
  return val('v-stats').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [label, a, b] = l.split('|').map((s) => (s || '').trim());
    return { label, a, b, na: parseNum(a), nb: parseNum(b) };
  });
}

async function renderVersusTpl() {
  const cA = val('v-clubeA'), cB = val('v-clubeB');
  await preloadBadges([cA, cB]);
  cvBase();
  drawTitle(val('v-titulo').toUpperCase() || 'VERSUS', 76, 38);

  // cabeçalho dos lados
  if (cA) drawBadge(96, 148, 26, cA);
  if (cB) drawBadge(1104, 148, 26, cB);
  ctx.fillStyle = CV.grana;
  ctx.font = '700 40px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  ctx.fillText(val('v-nomeA') || 'A', cA ? 138 : 90, 162);
  ctx.fillStyle = CV.blau;
  ctx.textAlign = 'right';
  ctx.fillText(val('v-nomeB') || 'B', cB ? 1062 : 1110, 162);
  ctx.textAlign = 'left';

  const stats = getVersusStats();
  if (!stats.length) return;
  const y0 = 235, rowH = Math.min(96, 400 / stats.length);
  const maxW = 380, cx = 600, gap = 14;

  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const y = y0 + i * rowH;
    ctx.textAlign = 'center';
    ctx.fillStyle = CV.dim;
    ctx.font = '600 21px "Avenir Next", system-ui, sans-serif';
    ctx.fillText(s.label.toUpperCase(), cx, y - 26);
    ctx.textAlign = 'left';

    if (s.na != null && s.nb != null) {
      const max = Math.max(s.na, s.nb) || 1;
      const wA = Math.max(6, (s.na / max) * maxW);
      const wB = Math.max(6, (s.nb / max) * maxW);
      ctx.globalAlpha = s.na >= s.nb ? 1 : 0.42;
      ctx.fillStyle = CV.grana;
      ctx.beginPath(); ctx.roundRect(cx - gap - wA, y - 14, wA, 24, 5); ctx.fill();
      ctx.globalAlpha = s.nb >= s.na ? 1 : 0.42;
      ctx.fillStyle = CV.blau;
      ctx.beginPath(); ctx.roundRect(cx + gap, y - 14, wB, 24, 5); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = CV.text;
      ctx.font = `${s.na >= s.nb ? '700' : '500'} 26px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(s.a, cx - gap - wA - 14, y + 6);
      ctx.font = `${s.nb >= s.na ? '700' : '500'} 26px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(s.b, cx + gap + wB + 14, y + 6);
    } else {
      ctx.fillStyle = CV.text;
      ctx.font = '700 28px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(s.a, cx - 40, y + 6);
      ctx.textAlign = 'left';
      ctx.fillText(s.b, cx + 40, y + 6);
    }
  }
  ctx.textAlign = 'left';
}
function versusPostText() {
  const lines = getVersusStats().map((s) => `▸ ${s.label}: ${s.a} × ${s.b}`);
  return `${val('v-titulo')}\n\n${val('v-nomeA')} × ${val('v-nomeB')}\n\n${lines.join('\n')}\n\nQuem leva? 👇`;
}

/* ---- template: top 5 ---- */
function getTop5Rows() {
  return val('t5-rows').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 5).map((l) => {
    const [nome, valor, clube] = l.split('|').map((s) => (s || '').trim());
    return { nome, valor, clube, n: parseNum(valor) };
  });
}
async function renderTop5Tpl() {
  const rows = getTop5Rows();
  await preloadBadges(rows.map((r) => r.clube).filter(Boolean));
  cvBase();
  ctx.fillStyle = CV.pink;
  ctx.font = '700 38px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  ctx.fillText(val('t5-titulo').toUpperCase() || 'TOP 5', 80, 90);

  if (!rows.length) return;
  const y0 = 150, rowH = Math.min(96, 460 / rows.length);
  const max = Math.max(...rows.map((r) => r.n || 0)) || 1;
  const unidade = val('t5-unidade');

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = y0 + i * rowH + rowH / 2;

    ctx.fillStyle = i === 0 ? CV.gold : CV.dim;
    ctx.font = '800 44px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(i + 1), 112, y + 14);
    ctx.textAlign = 'left';

    if (r.clube) drawBadge(168, y, 26, r.clube);

    ctx.fillStyle = CV.text;
    ctx.font = '700 32px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.fillText(r.nome, 220, y + 2);

    if (r.n != null) {
      const w = Math.max(6, (r.n / max) * 560);
      ctx.fillStyle = i === 0 ? CV.gold : CV.blau;
      ctx.globalAlpha = i === 0 ? 0.55 : 0.35;
      ctx.beginPath(); ctx.roundRect(220, y + 14, w, 10, 5); ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = i === 0 ? CV.gold : CV.text;
    ctx.font = '700 32px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(r.valor, unidade ? 1030 : 1110, y + 12);
    ctx.textAlign = 'left';
    if (unidade) {
      ctx.fillStyle = CV.dim;
      ctx.font = '500 20px "Avenir Next", system-ui, sans-serif';
      ctx.fillText(unidade, 1042, y + 12);
    }
  }
}
function top5PostText() {
  const unidade = val('t5-unidade');
  const lines = getTop5Rows().map((r, i) => `${i + 1}. ${r.nome} — ${r.valor}${unidade ? ' ' + unidade : ''}`);
  return `${val('t5-titulo')}\n\n${lines.join('\n')}\n\nQuem entra no lugar de quem? 👇`;
}

/* ---- template: antes/depois ---- */
const adImgs = { a: null, b: null };
function bindAdInput(id, slot) {
  document.getElementById(id).addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => { adImgs[slot] = img; activeTpl.render(); };
    img.src = URL.createObjectURL(f);
  });
}
bindAdInput('ad-imgA', 'a');
bindAdInput('ad-imgB', 'b');

function drawCover(img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

async function renderAntesDepoisTpl() {
  cvBase();
  drawTitle(val('ad-titulo').toUpperCase() || 'ANTES / DEPOIS', 72, 36);
  const boxes = [
    { img: adImgs.a, x: 40, label: val('ad-labelA') || 'ANTES' },
    { img: adImgs.b, x: 610, label: val('ad-labelB') || 'DEPOIS' },
  ];
  for (const b of boxes) {
    if (b.img) {
      drawCover(b.img, b.x, 105, 550, 495);
    } else {
      ctx.fillStyle = CV.faint;
      ctx.beginPath(); ctx.roundRect(b.x, 105, 550, 495, 12); ctx.fill();
      ctx.fillStyle = CV.dim;
      ctx.font = '500 24px "Avenir Next", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('selecione a imagem', b.x + 275, 360);
      ctx.textAlign = 'left';
    }
    // rótulo
    ctx.font = '700 20px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    const w = ctx.measureText(b.label).width + 28;
    ctx.fillStyle = 'rgba(10,12,18,0.72)';
    ctx.beginPath(); ctx.roundRect(b.x + 14, 119, w, 34, 17); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(b.label, b.x + 28, 142);
  }
  // divisor blaugrana
  ctx.fillStyle = '#0F4C92'; ctx.fillRect(596, 105, 4, 495);
  ctx.fillStyle = '#A50044'; ctx.fillRect(600, 105, 4, 495);
}
function adPostText() { return `${val('ad-titulo')}\n\n👇`; }

/* ---- template: fato empacotado ---- */
async function renderFatoTpl() {
  cvBase();
  const num = val('f-num');
  const fato = val('f-fato');
  const sint = val('f-sintese');

  ctx.fillStyle = CV.gold;
  let fs = 84;
  ctx.font = `800 ${fs}px "Avenir Next Condensed", "Arial Narrow", sans-serif`;
  while (ctx.measureText(num).width > 1040 && fs > 40) { fs -= 4; ctx.font = `800 ${fs}px "Avenir Next Condensed", "Arial Narrow", sans-serif`; }
  ctx.fillText(num, 80, 200);

  ctx.fillStyle = CV.text;
  ctx.font = '500 32px "Avenir Next", system-ui, sans-serif';
  wrapText(fato, 80, 280, 1040, 46);

  ctx.fillStyle = CV.pink;
  ctx.font = '700 40px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  ctx.fillText(sint, 80, 590);
}
function wrapText(text, x, y, maxW, lineH) {
  const words = text.split(/\s+/);
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lineH; line = w;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}
function fatoPostText() {
  return `${val('f-num')} — ${val('f-fato')}\n\n${val('f-sintese')}`;
}

/* ============================= RADAR DE RUMORES ============================= */

const DIRECAO_META = {
  chega: { seta: '⬆', rotulo: 'chega', cor: () => CV.blau },
  sai: { seta: '⬇', rotulo: 'sai', cor: () => CV.grana },
  renova: { seta: '↻', rotulo: 'renova', cor: () => CV.gold },
};

let editingRumor = null;

function activeRumors() {
  return (state.radar.rumors || [])
    .filter((r) => !r.arquivado)
    .sort((a, b) => (b.atualizado || '').localeCompare(a.atualizado || ''));
}

// os que o usuário marcou para aparecer no card
function selectedRumors() {
  return activeRumors().filter((r) => r.sel);
}

// recarrega a lista de rumores E redesenha o card se o template Radar estiver ativo
function refreshRadar() {
  renderRadar();
  updateRadarRefs();
  if (activeTpl && activeTpl.id === 'radar') activeTpl.render();
}

function updateRadarCount() {
  const el = document.getElementById('radar-count');
  if (!el) return;
  const n = activeRumors().length, m = selectedRumors().length;
  el.textContent = n ? `— ${n} no radar · ${m} no card` : '';
}

function renderRadar() {
  const el = document.getElementById('radar-list');
  if (!el) return;
  const ativos = activeRumors();
  const arquivados = (state.radar.rumors || []).filter((r) => r.arquivado);
  updateRadarCount();
  el.innerHTML = (ativos.map((r) => `
    <div class="rumor-row ${r.sel ? '' : 'off'}" data-id="${r.id}">
      <label class="rsel" title="aparece no card do dia"><input type="checkbox" class="r-sel" ${r.sel ? 'checked' : ''}></label>
      <span class="rumor-seta ${r.direcao}">${DIRECAO_META[r.direcao].seta}</span>
      <div class="rumor-main">
        <b>${esc(r.jogador)}</b>${r.time ? ` <span class="rumor-time">${esc(r.time)}</span>` : ''} <span class="estagio-pill">${esc(r.estagio)}</span>
        <p class="muted small">${esc(r.fonte)} <span class="tier-chip tier-${r.tier}">${r.tier}</span>${r.nota ? ' · ' + esc(r.nota) : ''}</p>
      </div>
      <span class="rumor-actions">
        <button class="ghost r-edit" title="Editar">✎</button>
        <button class="ghost r-arch" title="Arquivar (saiu do radar)">▣</button>
        <button class="ghost r-del" title="Excluir">✕</button>
      </span>
    </div>`).join('') || '<p class="muted small">Nenhum rumor ativo. Use o "Importar da IA" acima ou o formulário manual.</p>')
    + (arquivados.length ? `<p class="muted small" style="margin-top:10px">${arquivados.length} arquivado(s)</p>` : '');

  el.querySelectorAll('.rumor-row').forEach((row) => {
    const id = row.dataset.id;
    const cb = row.querySelector('.r-sel');
    if (cb) cb.addEventListener('change', () => {
      const r = state.radar.rumors.find((x) => x.id === id);
      if (!r) return;
      r.sel = cb.checked;
      row.classList.toggle('off', !cb.checked);
      save();
      if (activeTpl && activeTpl.id === 'radar') activeTpl.render();
      updateRadarCount();
      updateRadarRefs();
    });
    row.querySelector('.r-edit').addEventListener('click', () => {
      const r = state.radar.rumors.find((x) => x.id === id);
      if (!r) return;
      editingRumor = id;
      const fold = row.closest('#form-radar').querySelector('.radar-fold');
      if (fold) fold.open = true;
      document.getElementById('radar-form-title').textContent = 'Editando: ' + r.jogador;
      document.getElementById('r-jogador').value = r.jogador;
      document.getElementById('r-direcao').value = r.direcao;
      document.getElementById('r-estagio').value = r.estagio;
      document.getElementById('r-tier').value = r.tier;
      document.getElementById('r-fonte').value = r.fonte;
      document.getElementById('r-link').value = r.link || '';
      document.getElementById('r-time').value = r.time || '';
      document.getElementById('r-nota').value = r.nota || '';
      document.getElementById('r-cancel').classList.remove('hidden');
      // feedback: o form fica lá embaixo — rola até ele e foca
      if (fold) fold.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const jf = document.getElementById('r-jogador');
      jf.focus({ preventScroll: true });
    });
    row.querySelector('.r-arch').addEventListener('click', () => {
      const r = state.radar.rumors.find((x) => x.id === id);
      if (r) { r.arquivado = true; save(); refreshRadar(); }
    });
    row.querySelector('.r-del').addEventListener('click', () => {
      state.radar.rumors = state.radar.rumors.filter((x) => x.id !== id);
      save(); refreshRadar();
    });
  });
}

function clearRumorForm() {
  editingRumor = null;
  document.getElementById('radar-form-title').textContent = 'Novo rumor';
  ['r-jogador', 'r-fonte', 'r-link', 'r-time', 'r-nota'].forEach((id) => (document.getElementById(id).value = ''));
  document.getElementById('r-cancel').classList.add('hidden');
}

document.getElementById('r-save').addEventListener('click', () => {
  const jogador = val('r-jogador');
  if (!jogador) return toast('Preencha o jogador.');
  const data = {
    jogador,
    time: val('r-time'),
    direcao: val('r-direcao'),
    estagio: val('r-estagio'),
    tier: val('r-tier'),
    fonte: val('r-fonte') || '—',
    link: val('r-link'),
    nota: val('r-nota'),
    atualizado: new Date().toISOString(),
  };
  if (editingRumor) {
    const r = state.radar.rumors.find((x) => x.id === editingRumor);
    if (r) Object.assign(r, data);
  } else {
    state.radar.rumors.push({ id: uid(), arquivado: false, sel: true, ...data });
  }
  save(); refreshRadar(); clearRumorForm();
  toast('Rumor salvo.');
});
document.getElementById('r-cancel').addEventListener('click', clearRumorForm);

/* ---- importar output da IA (live editor) ---- */
const DIRECAO_NORM = { chega: 'chega', entra: 'chega', chegada: 'chega', in: 'chega', sai: 'sai', saída: 'sai', saida: 'sai', venda: 'sai', out: 'sai', renova: 'renova', renovação: 'renova', renovacao: 'renova' };
const ESTAGIOS_VALIDOS = ['especulação', 'interesse', 'negociação', 'acordo', 'oficial', 'negado'];

function normDirecao(s) { return DIRECAO_NORM[(s || '').toLowerCase().replace(/[⬆⬇↻🔵🔴🔄\s]/g, '')] || null; }

function parseIaLines(raw) {
  const ok = [];
  const erros = [];
  for (const linha of raw.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (/^(jogador|#|--|\|?\s*jogador)/i.test(linha)) continue; // cabeçalho/tabela md
    const parts = linha.replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
    if (parts.length < 5) { erros.push(linha.slice(0, 60)); continue; }
    // formato novo: jogador | time | direção | ... ; formato antigo: jogador | direção | ...
    // detecta pela 2ª coluna: se já é uma direção válida, não há coluna "time"
    let jogador, time, direcaoRaw, estagioRaw, fonte, tierRaw, resumo, link;
    if (normDirecao(parts[1])) {
      [jogador, direcaoRaw, estagioRaw, fonte, tierRaw, resumo = '', link = ''] = parts;
      time = '';
    } else {
      [jogador, time, direcaoRaw, estagioRaw, fonte, tierRaw, resumo = '', link = ''] = parts;
    }
    const direcao = normDirecao(direcaoRaw);
    const estagio = ESTAGIOS_VALIDOS.find((e) => (estagioRaw || '').toLowerCase().includes(e.slice(0, 6)));
    const tier = (tierRaw || '').toUpperCase().replace(/[^A-D]/g, '').charAt(0);
    if (!jogador || !direcao || !estagio || !tier) { erros.push(linha.slice(0, 60)); continue; }
    ok.push({ jogador, time: time || '', direcao, estagio, tier, fonte: fonte || '—', nota: (resumo || '').slice(0, 140), link: link || '' });
  }
  return { ok, erros };
}

let iaParsed = null;

document.getElementById('ia-parse').addEventListener('click', () => {
  const raw = document.getElementById('ia-input').value;
  if (!raw.trim()) return toast('Cole o output da IA primeiro.');
  iaParsed = parseIaLines(raw);
  const el = document.getElementById('ia-preview');
  const existentes = new Set(state.radar.rumors.map((r) => r.jogador.toLowerCase()));
  el.innerHTML = iaParsed.ok.map((r) => `
    <div class="rumor-row">
      <span class="rumor-seta ${r.direcao}">${DIRECAO_META[r.direcao].seta}</span>
      <div class="rumor-main">
        <b>${esc(r.jogador)}</b>${r.time ? ` <span class="rumor-time">${esc(r.time)}</span>` : ''} <span class="estagio-pill">${esc(r.estagio)}</span>
        <span class="chip ${existentes.has(r.jogador.toLowerCase()) ? 'approx' : 'ok'}">${existentes.has(r.jogador.toLowerCase()) ? 'atualiza' : 'novo'}</span>
        <p class="muted small">${esc(r.fonte)} <span class="tier-chip tier-${r.tier}">${r.tier}</span> · ${esc(r.nota)}</p>
      </div>
    </div>`).join('')
    + (iaParsed.erros.length ? `<p class="muted small" style="color:var(--bad)">⚠ ${iaParsed.erros.length} linha(s) não entendidas: ${esc(iaParsed.erros.join(' · ').slice(0, 120))}…</p>` : '')
    + (iaParsed.ok.length ? '' : '<p class="muted small">Nenhuma linha válida. O formato esperado é: jogador | direção | estágio | fonte | tier | resumo | link</p>');
  document.getElementById('ia-apply').classList.toggle('hidden', !iaParsed.ok.length);
});

document.getElementById('ia-apply').addEventListener('click', () => {
  if (!iaParsed || !iaParsed.ok.length) return;
  const now = new Date().toISOString();
  let novos = 0, atualizados = 0;
  for (const r of iaParsed.ok) {
    const existente = state.radar.rumors.find((x) => x.jogador.toLowerCase() === r.jogador.toLowerCase());
    if (existente) {
      Object.assign(existente, r, { atualizado: now, arquivado: false });
      atualizados++;
    } else {
      state.radar.rumors.push({ id: uid(), arquivado: false, sel: true, atualizado: now, ...r });
      novos++;
    }
  }
  save(); refreshRadar();
  document.getElementById('ia-input').value = '';
  document.getElementById('ia-preview').innerHTML = '';
  document.getElementById('ia-apply').classList.add('hidden');
  iaParsed = null;
  toast(`Radar atualizado: ${novos} novo(s), ${atualizados} atualizado(s).`);
});

document.getElementById('radar-copytext').addEventListener('click', async () => {
  await navigator.clipboard.writeText(radarPostText());
  toast('Texto do radar copiado.');
});
document.getElementById('radar-copyfontes').addEventListener('click', async () => {
  await navigator.clipboard.writeText(radarFontesText());
  toast('Fio de fontes copiado — postar como reply do radar.');
});

function radarFontesText() {
  const rumores = selectedRumors();
  if (!rumores.length) return '';
  const linhas = rumores.map((r, i) => {
    const base = `${i + 1}. ${r.jogador} — ${r.fonte} [${r.tier}]`;
    return r.link ? `${base}\n${r.link}` : base;
  });
  return `📎 Fontes do radar de hoje:\n\n${linhas.join('\n\n')}`;
}

function updateRadarRefs() {
  const pre = document.getElementById('radar-refs-pre');
  if (pre) pre.textContent = radarFontesText() || '(marque rumores na lista para gerar as fontes)';
}

/* ---- template estúdio: card do radar ---- */
// quebra texto em linhas por largura medida (sem cortar palavra)
function splitLines(text, font, maxW, maxLines) {
  ctx.save();
  ctx.font = font;
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  // se estourou, sinaliza reticências só na última linha (caso raro)
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxW && last.includes(' ')) {
      last = last.slice(0, last.lastIndexOf(' '));
    }
    lines[maxLines - 1] = last + '…';
  }
  ctx.restore();
  return lines;
}

const ESTAGIO_CV = {
  'oficial': () => CV.gold, 'acordo': () => CV.blau, 'negado': () => CV.grana,
};

const TIER_CV = { A: () => CV.gold, B: () => CV.blau, C: () => CV.pink, D: () => CV.dim };

// formato do card: vertical 4:5 (padrão, recomendado p/ celular) ou paisagem 16:9
function radarFormat() {
  return val('rd-format') === '169' ? { w: 1200, h: 675 } : { w: 1080, h: 1350 };
}

async function renderRadarTpl() {
  const sel = selectedRumors();
  await preloadBadges(['Barcelona', ...sel.map((r) => r.time).filter(Boolean)]);

  const FMT = radarFormat();
  canvas.width = FMT.w;
  canvas.height = FMT.h;
  const W = canvas.width, H = canvas.height;
  const M = 68;              // margem lateral útil
  const RIGHT = W - M;

  const ptitle = document.getElementById('preview-title');
  if (ptitle) ptitle.innerHTML = 'Preview <span class="muted small">' + W + '×' + H + (FMT.w === 1080 ? ' · vertical 4:5 (celular)' : ' · paisagem 16:9') + '</span>';

  cvBase();

  // topo: escudo do Barça (só a arte, sem placa) + título + data
  const headY = 72;
  drawLogoPlain(M + 22, headY, 30, 'Barcelona');
  ctx.fillStyle = CV.pink;
  ctx.font = '700 40px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('RADAR BLAUGRANA', M + 62, headY + 14);
  const dataTxt = val('rd-data') || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  ctx.fillStyle = CV.gold;
  ctx.font = '700 26px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(dataTxt, RIGHT, headY + 8);
  ctx.textAlign = 'left';
  ctx.fillStyle = CV.dim;
  ctx.font = 'italic 500 20px "Avenir Next", system-ui, sans-serif';
  ctx.fillText('o mercado do Barça, com nota de confiabilidade por fonte', M, headY + 44);

  updateRadarRefs();

  if (!sel.length) {
    ctx.fillStyle = CV.dim;
    ctx.font = '500 26px "Avenir Next", system-ui, sans-serif';
    ctx.fillText('Nenhum rumor marcado — use o ☑ na lista ao lado.', M, 200);
    return;
  }

  // layout uniforme: mostra TODOS os marcados; a altura da linha se adapta à quantidade e ao formato
  const NOTA_FONT = '500 19px "Avenir Next", system-ui, sans-serif';
  const badgeX = M + 20, setaX = M + 54, nameX = M + 88;
  const fonteRight = RIGHT - 44, chipX = RIGHT - 32;
  const notaW = W - nameX - M;
  const top = 138, bottom = H - 44;
  const AVAIL = bottom - top;
  const n = sel.length;
  const rowH = Math.max(46, Math.min(168, AVAIL / n));
  const notaLines = rowH >= 96 ? 2 : (rowH >= 62 ? 1 : 0);
  const startY = top + Math.max(0, (AVAIL - n * rowH) / 2);

  sel.forEach((r, i) => {
    const yTop = startY + i * rowH;
    const y = yTop + Math.min(34, rowH / 2 + 8); // baseline da linha 1
    const meta = DIRECAO_META[r.direcao] || DIRECAO_META.chega;

    // escudo do time relacionado
    if (r.time) drawBadge(badgeX, y - 9, 20, r.time);

    // seta de direção
    ctx.fillStyle = meta.cor();
    ctx.font = '700 28px "Avenir Next", system-ui, sans-serif';
    ctx.fillText(meta.seta, setaX, y);

    // nome (trunca pra não invadir a coluna da fonte) + estágio
    ctx.fillStyle = CV.text;
    ctx.font = '700 30px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    let nome = r.jogador;
    const maxNameW = fonteRight - nameX - 150; // reserva p/ estágio + fonte à direita
    while (nome.length > 4 && ctx.measureText(nome + '…').width > maxNameW) nome = nome.slice(0, -1);
    if (nome !== r.jogador) nome += '…';
    ctx.fillText(nome, nameX, y);
    const nw = ctx.measureText(nome).width;
    ctx.fillStyle = (ESTAGIO_CV[r.estagio] || (() => CV.dim))();
    ctx.font = '700 15px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.fillText(r.estagio.toUpperCase(), nameX + nw + 12, y - 1);

    // fonte + chip do tier (direita)
    ctx.textAlign = 'right';
    ctx.fillStyle = CV.text;
    ctx.font = '600 20px "Avenir Next", system-ui, sans-serif';
    ctx.fillText(r.fonte.slice(0, 22), fonteRight, y - 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = TIER_CV[r.tier] ? TIER_CV[r.tier]() : CV.dim;
    ctx.beginPath(); ctx.roundRect(chipX, y - 22, 30, 30, 7); ctx.fill();
    ctx.fillStyle = CV.bg2;
    ctx.font = '800 20px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.fillText(r.tier, chipX + 7, y + 1);

    // nota (só quando há espaço)
    if (notaLines && r.nota) {
      const linhas = splitLines(r.nota, NOTA_FONT, notaW, notaLines);
      ctx.fillStyle = CV.dim;
      ctx.font = NOTA_FONT;
      linhas.forEach((l, li) => ctx.fillText(l, nameX, y + 24 + li * 22));
    }

    // divisor entre linhas
    if (i < n - 1) {
      ctx.strokeStyle = CV.faint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(M, yTop + rowH - 3);
      ctx.lineTo(RIGHT, yTop + rowH - 3);
      ctx.stroke();
    }
  });

  ctx.fillStyle = CV.dim;
  ctx.font = '500 16px "Avenir Next", system-ui, sans-serif';
  ctx.fillText('confiabilidade da fonte:  A oficial · B confiável · C mídia catalã · D ruído', M, H - 18);
}

function radarPostText() {
  const rumores = selectedRumors();
  const dataTxt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  const linhas = rumores.map((r) => {
    const emoji = r.direcao === 'chega' ? '🔵' : r.direcao === 'sai' ? '🔴' : '🔄';
    const alvo = r.time ? ` (${r.time})` : '';
    return `${emoji} ${r.jogador}${alvo} — ${r.estagio}\n   ${r.fonte} [tier ${r.tier}]${r.nota ? ': ' + r.nota : ''}`;
  });
  return `RADAR BLAUGRANA — ${dataTxt}\n\nO mercado do Barça agora, com a confiabilidade de cada fonte:\n\n${linhas.join('\n\n')}\n\nTiers: A oficial · B confiável · C mídia catalã · D ruído`;
}

/* ---- template: posts de texto ---- */
function textoPostText() {
  const type = val('tx-type');
  if (type === 'emojis') {
    const seq = val('tx-emojis').split('\n').map((l) => l.trim()).filter(Boolean).join(' → ');
    return `DE QUEM É ESSA CARREIRA? (versão emoji)\n\n${seq}\n\n${val('tx-emoji-extra') || 'quem é? 👇'}`;
  }
  if (type === 'quemsou') {
    const pistas = val('tx-pistas').split('\n').map((l) => l.trim()).filter(Boolean).map((p) => `▸ ${p}`);
    return `QUEM SOU EU?\n\n${pistas.join('\n')}\n\nquem é? 👇`;
  }
  const ops = val('tx-ops').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 4);
  return `${val('tx-pergunta')}\n\n${ops.map((o) => '· ' + o).join('\n')}\n\n(criar como enquete nativa no X — as opções acima viram as alternativas)`;
}
async function renderTextoTpl() {
  document.getElementById('text-preview').textContent = textoPostText();
}
document.getElementById('tx-type').addEventListener('change', () => {
  const t = val('tx-type');
  document.getElementById('tx-sub-emojis').classList.toggle('hidden', t !== 'emojis');
  document.getElementById('tx-sub-quemsou').classList.toggle('hidden', t !== 'quemsou');
  document.getElementById('tx-sub-enquete').classList.toggle('hidden', t !== 'enquete');
  activeTpl.render();
});

/* ---- registry ---- */
const TEMPLATES = [
  { id: 'radar', nome: 'Radar Blaugrana', pilar: 'R', desc: 'o card diário do mercado — gerido aqui mesmo', form: 'form-radar', kind: 'canvas', render: renderRadarTpl, text: radarPostText,
    title: () => 'Radar Blaugrana — ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) },
  { id: 'versus', nome: 'Versus', pilar: 'P2', desc: 'dois jogadores/times lado a lado — Lamine × Messi', form: 'form-versus', kind: 'canvas', render: renderVersusTpl, text: versusPostText,
    title: () => val('v-titulo') || 'Versus' },
  { id: 'timeline', nome: 'Carreira', pilar: 'P1', desc: 'quiz na linha do tempo · tem vídeo', form: 'form-timeline', kind: 'canvas', video: true, render: renderQuizCanvas, text: quizPostText,
    title: () => `Quiz #${String(val('q-num') || 1).padStart(3, '0')}${val('q-resposta') ? ' — ' + val('q-resposta') : ''}${val('q-modo') === 'mentira' ? ' (1 mentira)' : ''}` },
  { id: 'placar', nome: 'Que jogo é esse?', pilar: 'P1', desc: 'escudos + placar misterioso ou card de resultado', form: 'form-placar', kind: 'canvas', render: renderPlacarTpl, text: placarPostText,
    title: () => `Placar — ${val('p-timeA')} × ${val('p-timeB')}` },
  { id: 'bingo', nome: 'Bingo Blaugrana', pilar: 'P1', desc: 'cartela de eventos do jogo · AURA por raridade', form: 'form-bingo', kind: 'canvas', render: renderBingoTpl, text: bingoPostText,
    title: () => `Bingo #${String(val('bg-num') || 1).padStart(3, '0')} — ${val('bg-timeA')} × ${val('bg-timeB')}` },
  { id: 'top5', nome: 'Top 5', pilar: 'P2', desc: 'ranking com escudos e barras', form: 'form-top5', kind: 'canvas', render: renderTop5Tpl, text: top5PostText,
    title: () => val('t5-titulo') || 'Top 5' },
  { id: 'fato', nome: 'Fato empacotado', pilar: 'P2', desc: 'número gigante + fato + síntese', form: 'form-fato', kind: 'canvas', render: renderFatoTpl, text: fatoPostText,
    title: () => 'Fato — ' + val('f-num').slice(0, 40) },
  { id: 'antesdepois', nome: 'Antes / Depois', pilar: 'P3', desc: 'duas imagens lado a lado — build in public', form: 'form-antesdepois', kind: 'canvas', render: renderAntesDepoisTpl, text: adPostText,
    title: () => val('ad-titulo') || 'Antes/Depois' },
  { id: 'texto', nome: 'Posts de texto', pilar: 'P1', desc: 'emoji quiz · quem sou eu · enquete', form: 'form-texto', kind: 'text', render: renderTextoTpl, text: textoPostText,
    title: () => textoPostText().split('\n')[0].slice(0, 50) },
];
let activeTpl = TEMPLATES[0];

function renderGallery() {
  const el = document.getElementById('tpl-gallery');
  el.innerHTML = TEMPLATES.map((t) => `
    <button class="tpl-card ${t.id === activeTpl.id ? 'active' : ''}" data-tpl="${t.id}">
      <span class="pillar-chip pillar-${t.pilar}">${t.pilar}</span>
      <b>${esc(t.nome)}</b>
      <small>${esc(t.desc)}</small>
    </button>`).join('');
  el.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => selectTpl(b.dataset.tpl)));
}

function selectTpl(id) {
  activeTpl = TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
  document.querySelectorAll('.tpl-card').forEach((c) => c.classList.toggle('active', c.dataset.tpl === activeTpl.id));
  document.querySelectorAll('.tpl-form').forEach((f) => f.classList.toggle('active', f.id === activeTpl.form));
  const isText = activeTpl.kind === 'text';
  canvas.classList.toggle('hidden', isText);
  document.getElementById('text-preview').classList.toggle('hidden', !isText);
  document.getElementById('act-video').classList.toggle('hidden', !activeTpl.video);
  document.getElementById('act-download').classList.toggle('hidden', isText);
  document.getElementById('act-mando').classList.toggle('hidden', isText);
  document.getElementById('radar-refs').classList.toggle('hidden', activeTpl.id !== 'radar');
  // Radar e Bingo controlam o próprio tamanho; os demais ficam em 1200×675
  if (activeTpl.id !== 'radar' && activeTpl.id !== 'bingo' && (canvas.width !== 1200 || canvas.height !== 675)) {
    canvas.width = 1200; canvas.height = 675;
  }
  document.getElementById('preview-title').innerHTML = isText
    ? 'Preview <span class="muted small">texto puro — o formato com maior engajamento mediano</span>'
    : activeTpl.id === 'bingo'
      ? 'Preview <span class="muted small">1080×1350 · vertical 4:5 (celular)</span>'
      : 'Preview <span class="muted small">1200×675 · render automático</span>';
  activeTpl.render();
}

// render ao vivo enquanto digita
let renderTimer = null;
document.getElementById('tpl-forms').addEventListener('input', () => {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => activeTpl.render(), 350);
});

/* ---- ações do preview ---- */
document.getElementById('act-mando').addEventListener('change', () => {
  CV = { ...PALETTES[val('act-mando')] };
  activeTpl.render();
});
document.getElementById('act-video').addEventListener('click', () => {
  if (activeTpl.video) recordQuizVideo();
});
document.getElementById('act-download').addEventListener('click', async () => {
  await activeTpl.render();
  const a = document.createElement('a');
  const suffix = activeTpl.id === 'timeline' ? String(val('q-num') || 1).padStart(3, '0') : todayKey();
  a.download = `${activeTpl.id}-${suffix}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
});
document.getElementById('act-copytext').addEventListener('click', async () => {
  await navigator.clipboard.writeText(activeTpl.text());
  toast('Texto do post copiado.');
});

/* ============================= IDEIAS ============================= */

const FRENTES = [
  {
    nome: 'Radar Blaugrana',
    status: 'No ar', kind: 'ativo',
    linha: 'A série diária: o mercado do Barça com nota de confiabilidade por fonte.',
    oque: 'Curadoria diária dos rumores de transferência do Barcelona (masculino e feminino), cada um com direção (chega/sai/renova), estágio e uma nota de confiabilidade A/B/C/D conforme a fonte.',
    motivacao: 'O mercado é ruído: dezenas de fontes, credibilidade variada, o culé brasileiro se perde. O diferencial não é "ter a notícia" — é dizer o quanto ela vale. A nota de confiabilidade é o produto.',
    impacto: 'Motivo pra voltar ao perfil todo dia (retenção). Janela quente até ~1º de setembro. É a frente que já está entregando.',
    comoRodar: 'Prompts → "Coletar rumores" → colar no Claude → colar a resposta no Estúdio (Importar da IA) → gerar o card → postar o card + o "fio de fontes" na reply. ~10 min.',
  },
  {
    nome: 'Lamine × Messi na mesma idade',
    status: 'A construir', kind: 'construir',
    linha: 'O comparativo mais fascinante do culé, alinhado dia a dia por idade.',
    oque: 'Um tracker que compara Lamine Yamal e Messi na MESMA idade — jogos, gols, assistências, minutos e títulos —, virando cards de comparação atualizáveis.',
    motivacao: 'É a discussão que todo culé quer ter, e o dado alinhado por idade quase ninguém compila. Some autoridade (dados conferidos) à paixão.',
    impacto: 'Conteúdo evergreen e recorrente: cada marco do Lamine vira post. O lado do Messi é estático (baseline histórico); só o lado do Lamine atualiza.',
    comoRodar: 'Prompts → "Comparativo de estatísticas" → colar no Claude → colar os números no template Versus do Estúdio. Conferir as fontes antes de postar.',
  },
  {
    nome: 'Bolão Blaugrana',
    status: 'Estreia em agosto', kind: 'futuro',
    linha: 'Bolão mensal dos jogos do Barça, com prêmios Pix pro pódio.',
    oque: 'Bolão gratuito de palpites dos jogos do Barcelona. Palpites entram por reply; ranking mensal com prêmios Pix (R$150 / R$80 / R$20 pro pódio do mês).',
    motivacao: 'Prêmio real gera participação, follow e recorrência — o ritual mensal que transforma seguidor em comunidade. É a maior alavanca de engajamento das três.',
    impacto: 'Loop de recorrência forte, mas custa apuração manual e exige regulamento. Estreia amarrada ao calendário: 1ª rodada de La Liga, agosto/2026.',
    comoRodar: 'Prompts → "Estruturar a rodada do Bolão" para preparar jogos, regras e o post. Enquadramento: concurso recreativo gratuito, sem pagamento pra jogar (Lei 5.768/71). Regulamento simples e publicado.',
  },
];

const FRENTE_KIND = { ativo: 'No ar', construir: 'A construir', futuro: 'Estreia em agosto' };

function renderFrentes() {
  const el = document.getElementById('frentes');
  el.innerHTML = FRENTES.map((f) => `
    <div class="frente frente-${f.kind}">
      <div class="frente-top">
        <h2>${esc(f.nome)}</h2>
        <span class="frente-status s-${f.kind}">${esc(f.status)}</span>
      </div>
      <p class="frente-linha">${esc(f.linha)}</p>
      <div class="frente-grid">
        <div><h4>O que é</h4><p>${esc(f.oque)}</p></div>
        <div><h4>Por que existe</h4><p>${esc(f.motivacao)}</p></div>
        <div><h4>Impacto esperado</h4><p>${esc(f.impacto)}</p></div>
        <div><h4>Como rodar</h4><p>${esc(f.comoRodar)}</p></div>
      </div>
    </div>`).join('');
}

const PILAR_CHIP_NOME = { R: 'Radar', P1: 'Quiz/post', P2: 'Estatística', P3: 'Build', P4: 'Matchday', X: 'Outro' };

function renderIdeas() {
  const el = document.getElementById('ideas-list');
  el.innerHTML = state.ideas.map((i) => `
    <div class="idea">
      <p>${esc(i.text)}</p>
      <div class="idea-foot">
        <span class="pillar-chip pillar-${i.pillar}">${esc(PILAR_CHIP_NOME[i.pillar] || i.pillar)}</span>
        <span class="idea-actions">
          <button data-del="${i.id}" title="Excluir">✕</button>
        </span>
      </div>
    </div>`).join('') || '<p class="muted">Sem ideias no banco. Adicione acima.</p>';
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    state.ideas = state.ideas.filter((i) => i.id !== b.dataset.del);
    save(); renderIdeas();
  }));
}
document.getElementById('idea-text').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const text = e.target.value.trim();
  if (!text) return;
  state.ideas.unshift({ id: uid(), pillar: document.getElementById('idea-pillar').value, text });
  e.target.value = '';
  save(); renderIdeas();
});

/* ============================= ALVOS ============================= */

function freshURL(handle) {
  return 'https://x.com/search?q=' + encodeURIComponent(`from:${handle.slice(1)} within_time:24h`) + '&src=typed_query&f=live';
}

function renderTargets() {
  const el = document.getElementById('targets');
  el.innerHTML = state.targets.map((t) => `
    <div class="tier">
      <h3>${esc(t.tier)}</h3>
      <p class="tier-sub">${esc(t.sub)}</p>
      ${t.rows.map((r) => `
        <div class="target-row">
          <a class="handle" href="https://x.com/${r.handle.slice(1)}" target="_blank" rel="noopener">${esc(r.handle)}</a>
          <a class="fresh" href="${freshURL(r.handle)}" target="_blank" rel="noopener" title="posts das últimas 24h">frescos ↗</a>
          <span class="t-size">${esc(r.size)} <span class="chip ${r.v}">${r.v === 'ok' ? '✓' : '~'}</span></span>
          <span class="t-note">${esc(r.note)}</span>
        </div>`).join('')}
    </div>`).join('');
}

/* ---- sessão guiada de replies ---- */
let sessionQueue = [];
let sessionIdx = 0;
let sessionReplies = 0;

document.getElementById('btn-session').addEventListener('click', () => {
  sessionQueue = state.targets
    .filter((t) => /Tier 2|Tier 3/.test(t.tier))
    .flatMap((t) => t.rows.map((r) => ({ ...r, tier: t.tier })));
  sessionIdx = 0;
  sessionReplies = 0;
  renderSession();
  document.getElementById('session-modal').showModal();
});

function renderSession() {
  const body = document.getElementById('session-body');
  if (sessionIdx >= sessionQueue.length) {
    body.innerHTML = `<h2>Sessão concluída 🔵🔴</h2>
      <p>${sessionReplies} replies registradas nesta sessão. Volte à noite para responder quem te respondeu — é o sinal de 150×.</p>
      <div class="btns"><button class="primary" id="sess-close">Fechar</button></div>`;
    body.querySelector('#sess-close').addEventListener('click', () => document.getElementById('session-modal').close());
    return;
  }
  const t = sessionQueue[sessionIdx];
  body.innerHTML = `
    <h2>Sessão de replies <span class="muted small">${sessionIdx + 1}/${sessionQueue.length}</span></h2>
    <p class="sess-handle"><a href="${freshURL(t.handle)}" target="_blank" rel="noopener">${esc(t.handle)} — abrir posts frescos ↗</a></p>
    <p class="muted small">${esc(t.tier)} · ${esc(t.size)} · ${esc(t.note)}</p>
    <p class="muted small">Regra: reply de 2–3 frases que adiciona dado, contexto ou piada boa. Nada de "verdade!".</p>
    <div class="btns">
      <button class="primary" id="sess-done">+1 reply feita → próximo</button>
      <button class="ghost" id="sess-skip">Pular</button>
      <button class="ghost" id="sess-end">Encerrar</button>
    </div>
    <p class="muted small">Replies nesta sessão: <b>${sessionReplies}</b></p>`;
  body.querySelector('#sess-done').addEventListener('click', () => { sessionReplies++; sessionIdx++; renderSession(); });
  body.querySelector('#sess-skip').addEventListener('click', () => { sessionIdx++; renderSession(); });
  body.querySelector('#sess-end').addEventListener('click', () => document.getElementById('session-modal').close());
}

/* ---- buscas estratégicas ---- */
const SEARCHES = [
  {
    group: 'Reply agora — conversas quentes para entrar',
    tip: 'Abrir 2–3× por dia. O nicho PT fora de pico roda com min_faves baixo — 10 a 30 já filtra o ruído.',
    items: [
      { label: 'Barça em PT, posts-raiz frescos', q: '(barcelona OR barça) lang:pt min_faves:20 -filter:replies within_time:12h' },
      { label: 'Mercado do Barça agora', q: '(barça OR barcelona) (fichaje OR contratação OR reforço OR transferência) min_faves:15 within_time:12h -filter:replies' },
      { label: 'Copa/futebol em PT agora', q: 'futebol lang:pt min_retweets:5 within_time:4h -filter:replies' },
    ],
  },
  {
    group: 'Radar do formato — quem faz quiz e como performa',
    tip: 'Monitore semanalmente: o que repete é o que funciona. E vigie se alguém copia o seu.',
    items: [
      { label: 'Seu formato (e cópias)', q: '"de quem é essa carreira"' },
      { label: 'Quizzes de futebol em alta', q: '(adivinhe OR quiz) (jogador OR futebol) lang:pt min_faves:30' },
      { label: 'Formato do leonardotipster', q: 'from:leonardotipster adivinhe' },
    ],
  },
  {
    group: 'Pilar dados — onde a reply técnica brilha',
    tip: 'Reply com contexto num post de estatística é a sua vitrine. Abra depois dos jogos.',
    items: [
      { label: 'Conversa de xG/estatística em PT', q: '(xg OR estatísticas OR "os números") futebol lang:pt min_faves:20' },
      { label: 'Sofascore fresco', q: 'from:SofascoreBR within_time:12h' },
    ],
  },
  {
    group: 'Bolha dev/IA — pilar build in public',
    tip: 'Reply com vivência real do seu projeto > opinião genérica.',
    items: [
      { label: 'IA para programar, em PT', q: '("claude code" OR cursor OR copilot OR agente) lang:pt min_faves:20 within_time:24h' },
      { label: 'Build in public BR', q: '("build in public" OR "construindo em público" OR "side project") lang:pt min_faves:10' },
      { label: 'Indie games BR', q: '(indie game OR "meu jogo") lang:pt min_faves:10 within_time:24h' },
    ],
  },
];

function renderSearchLib() {
  const el = document.getElementById('search-lib');
  el.innerHTML = SEARCHES.map((g) => `
    <div class="search-group">
      <h3>${esc(g.group)}</h3>
      <p class="tier-sub">${esc(g.tip)}</p>
      ${g.items.map((i) => `
        <div class="search-row">
          <a href="https://x.com/search?q=${encodeURIComponent(i.q)}&src=typed_query&f=live" target="_blank" rel="noopener">${esc(i.label)} ↗</a>
          <code>${esc(i.q)}</code>
          <button class="ghost copy-q" data-q="${esc(i.q)}">copiar</button>
        </div>`).join('')}
    </div>`).join('');
  el.querySelectorAll('.copy-q').forEach((b) => b.addEventListener('click', async () => {
    await navigator.clipboard.writeText(b.dataset.q);
    toast('Busca copiada.');
  }));
}

/* ============================= export/import ============================= */

document.getElementById('btn-export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = `la-masia-backup-${todayKey()}.json`;
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  a.click();
});
document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const obj = JSON.parse(await f.text());
    if (!data_ok(obj)) throw new Error('arquivo não parece um backup válido');
    state = pruneState(obj);
    save(); renderAll(); toast('Backup restaurado.');
  } catch (err) { toast('Erro ao importar: ' + err.message); }
  e.target.value = '';
});

/* ============================= util ============================= */

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtNum(n) { return new Intl.NumberFormat('pt-BR').format(n); }

let toastTimer = null;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 20px;border-radius:8px;font-size:13.5px;z-index:99;box-shadow:0 4px 16px rgba(0,0,0,.3)';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.style.display = 'none'), 2600);
}

function renderAll() {
  renderPrompts();
  renderGallery();
  selectTpl(activeTpl.id);
  renderRadar();
  renderFrentes();
  renderIdeas();
  renderTargets();
  renderSearchLib();
}

load();
