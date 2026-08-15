// AUTORIZAÇÃO DO YOUTUBE, uma vez POR CANAL DA CASA.
//
//   node scripts/youtube-login.mjs --canal=devblaugrana
//   node scripts/youtube-login.mjs --canal=futgibi
//
// Cada perfil tem o próprio refresh token em ~/.sagafut/youtube-<canal>.json. Um token só
// mandaria o Short do @futgibi pro canal do Barça sem erro nenhum.
//
// ANTES DE RODAR, uma vez, no Google Cloud Console. O passo a passo completo, com o que aparece
// em cada tela, está em **saga-fut/docs/YOUTUBE.md**. O resumo:
//   1. console.cloud.google.com → novo projeto (nome livre)
//   2. APIs e Serviços → Biblioteca → ative a "YouTube Data API v3"
//   3. Google Auth Platform (ou "Tela de permissão OAuth") → tipo Externo → preencha o mínimo
//   4. **PUBLIQUE O APP** ("Em produção"). Não pule: em modo Teste o Google EXPIRA o refresh
//      token a cada 7 dias, e a automação morre em uma semana sem avisar. Publicar não exige
//      verificação nenhuma pra uso próprio, só mostra um aviso de "app não verificado" no login.
//   5. Credenciais → Criar credenciais → ID do cliente OAuth → tipo **App para computador**
//   6. Copie o ID do cliente e a Chave secreta e passe pra cá:
//
//   YT_CLIENT_ID=xxx YT_CLIENT_SECRET=yyy node scripts/youtube-login.mjs --canal=futgibi
//
// Passar por variável de ambiente e não por argumento é de propósito: argumento fica no histórico
// do shell, e isto é segredo.
import http from 'node:http'
import { spawn } from 'node:child_process'
import {
  urlDeConsentimento, trocarCodigo, gravarCredenciais, lerCredenciais, credencialBaixadaDoGoogle,
  arquivoYoutube, chavesDoApp,
} from '../server/lib/youtube.mjs'
import { CANAL_PADRAO, CANAIS, canalValido, fichaDoCanal } from '../shared/canais.mjs'

const PORTA = 4899
const REDIRECT = `http://localhost:${PORTA}/callback`

const canalArg = (process.argv.find((a) => a.startsWith('--canal=')) || '').slice('--canal='.length)
const canal = canalArg || CANAL_PADRAO
if (!canalValido(canal)) {
  console.error(`canal "${canal}" não existe. Use: ${CANAIS.map((c) => `--canal=${c.id}`).join(' ou ')}`)
  process.exit(1)
}

// ORDEM DE BUSCA: variável de ambiente vence tudo (é como se troca de projeto sem mexer em
// arquivo), depois o JSON baixado do Google Cloud, e por último o que já está salvo.
//
// O BAIXADO VENCE O SALVO, e isso é o contrário do que parece intuitivo. Largar um
// `client_secret_*.json` novo na pasta é uma ação DELIBERADA: significa "troquei de projeto".
// Na ordem inversa, o token salvo do projeto ANTIGO venceria calado e a reautorização inteira
// aconteceria no app errado, com o mesmo canal errado no fim. Aconteceu aqui em 12/08/2026,
// quando o canal mudou de conta e o arquivo novo foi ignorado pelo salvo.
const salvas = await lerCredenciais(canal)
const doApp = await chavesDoApp(canal)
const baixada = await credencialBaixadaDoGoogle()

const clientId = process.env.YT_CLIENT_ID || baixada?.client_id || doApp?.client_id
const clientSecret = process.env.YT_CLIENT_SECRET || baixada?.client_secret || doApp?.client_secret

if (baixada?.outros?.length) {
  console.log(`\nATENÇÃO: há mais de um client_secret na pasta. Usando o MAIS RECENTE:`)
  console.log(`  usado   : ${baixada.caminho}`)
  for (const o of baixada.outros) console.log(`  ignorado: ${o}`)
  console.log('  (apague os que não usa: dois arquivos é uma chance de autorizar no projeto errado)')
}

if (baixada && salvas?.client_id && baixada.client_id !== salvas.client_id) {
  console.log(`\nProjeto DIFERENTE do que estava salvo: a autorização anterior será substituída.`)
  console.log(`  antes: ${salvas.client_id.slice(0, 20)}…`)
  console.log(`  agora: ${baixada.client_id.slice(0, 20)}…${baixada.project_id ? `  (${baixada.project_id})` : ''}`)
}

if (doApp?.origem && doApp.origem !== canal && !baixada && !process.env.YT_CLIENT_ID) {
  console.log(`\nReusando as chaves do app já autorizado em ${fichaDoCanal(doApp.origem).nome}.`)
  console.log('Só o client_id/secret: o token daquele canal NÃO entra neste login.')
}

if (!clientId || !clientSecret) {
  console.error(`
Faltam as credenciais do app. Duas formas, escolha uma:

  a) Baixe o JSON da credencial no Google Cloud (Credenciais → ícone de download no seu
     "ID do cliente OAuth") e deixe na pasta do projeto. Este comando acha sozinho.

  b) YT_CLIENT_ID=xxx YT_CLIENT_SECRET=yyy node scripts/youtube-login.mjs --canal=${canal}

Passo a passo completo em saga-fut/docs/YOUTUBE.md.
`)
  process.exit(1)
}

if (baixada && !process.env.YT_CLIENT_ID && !salvas?.client_id) {
  console.log(`Credencial lida de ${baixada.caminho}${baixada.project_id ? `  (projeto ${baixada.project_id})` : ''}`)
  if (baixada.tipo === 'web') {
    console.error(`
PARE: essa credencial é do tipo "Aplicativo da Web", e o fluxo daqui é de app instalado.

No tipo Web o Google exige que ${REDIRECT} esteja registrado EXATAMENTE nos "URIs de
redirecionamento autorizados", senão volta redirect_uri_mismatch. O caminho limpo é criar outra
credencial do tipo "App para computador" (docs/YOUTUBE.md §4) e baixar o JSON dela.

Se preferir insistir nesta, registre a URI acima no console e rode de novo.
`)
    process.exit(1)
  }
}

console.log(`
Canal da casa: ${fichaDoCanal(canal).nome}  (--canal=${canal})
Credenciais em: ${arquivoYoutube(canal)}
Redirecionamento usado: ${REDIRECT}

No tipo "App para computador" o Google aceita localhost em qualquer porta e a tela de criação
nem mostra o campo de URIs: se não apareceu pra você, está certo, siga em frente. Se o seu
cliente for do tipo "Aplicativo da Web", aí o campo existe e precisa conter exatamente a URL
acima, senão volta redirect_uri_mismatch.
`)

const url = urlDeConsentimento(clientId, REDIRECT)

const servidor = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORTA}`)
  if (u.pathname !== '/callback') { res.writeHead(404).end(); return }

  const erro = u.searchParams.get('error')
  const code = u.searchParams.get('code')
  const responde = (txt) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<meta charset="utf-8"><body style="font:16px system-ui;padding:40px">${txt}</body>`)
  }

  if (erro) {
    responde(`<h2>Autorização negada</h2><p>${erro}</p><p>Pode fechar esta aba.</p>`)
    console.error(`\nO Google recusou: ${erro}`)
    servidor.close(); process.exit(1)
  }

  try {
    const tokens = await trocarCodigo({ clientId, clientSecret, code, redirect: REDIRECT })
    const arq = await gravarCredenciais({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
      // guardado só como informação; o access_token real é pedido de novo a cada uso
      escopo: tokens.scope,
      canal,
    }, canal)
    responde(`<h2>Pronto ✅</h2><p>O studio já pode agendar no YouTube em ${fichaDoCanal(canal).nome}. Pode fechar esta aba.</p>`)
    console.log(`\nAutorizado para ${fichaDoCanal(canal).nome}. Credenciais em ${arq} (permissão 600, fora do repositório).`)
    console.log('Na aba Publicar, o Short desta peça vai pra ESTE canal do Google, não pro outro perfil da casa.')
    if (baixada) {
      console.log(`\nO client_id e o client_secret foram copiados pra ${arq}, então o arquivo`)
      console.log(`  ${baixada.caminho}`)
      console.log('não é mais necessário e pode ser apagado. Ele está no .gitignore, mas segredo')
      console.log('dentro da árvore de código vaza no dia em que alguém faz um zip do projeto.')
    }
    console.log('')
    servidor.close(); process.exit(0)
  } catch (e) {
    responde(`<h2>Falhou</h2><pre>${e.message}</pre>`)
    console.error(`\n${e.message}`)
    servidor.close(); process.exit(1)
  }
})

servidor.listen(PORTA, () => {
  console.log(`Abrindo o navegador pra você autorizar...\nSe não abrir, cole esta URL:\n\n${url}\n`)
  const abrir = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  spawn(abrir, [url], { stdio: 'ignore', detached: true }).unref()
})
