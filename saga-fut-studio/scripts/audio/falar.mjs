#!/usr/bin/env node
// A VOZ DA CASA. Gera o MP3 de uma fala com o `say` do macOS, e é a única porta pra isso.
//
//   node scripts/audio/falar.mjs "fiz o gol do titulo"
//   node scripts/audio/falar.mjs "e agora?" --quem=laporta
//   node scripts/audio/falar.mjs --elenco        # prova de todos os timbres, num arquivo só
//
// ## Por que Eddy e por que o nome completo
//
// A voz foi escolhida OUVINDO, em 13/08/2026, contra sete alternativas (Reed, Rocko, Grandpa,
// Luciana grave, e as neurais do edge-tts). Custo zero, offline, licença sem nenhuma dúvida.
//
// E tem uma armadilha que quase reprovou a voz certa: `say -v Eddy` pega a Eddy INGLESA, que lê
// português com fonética de inglês e erra palavra atrás de palavra. A máquina tem as duas
// instaladas e o nome curto resolve pela errada. Por isso o nome aqui é sempre o completo, com o
// locale, e por isso ele mora numa constante em vez de ser digitado em cada chamada.
//
// ## Timbre por personagem sem instalar nada
//
// `[[pbas N]]` muda o tom BASE dentro do sintetizador (não é pitch shift depois, então a
// articulação não sofre) e `-r` muda a velocidade. Com os dois, a mesma Eddy dá um elenco inteiro
// de vozes distinguíveis. É de graça, e evita a alternativa real, que seria uma voz baixada por
// personagem.

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const FALAS_DIR = path.resolve(__dirname, '../../../saga-fut/assets/falas')

export const VOZ_PADRAO = 'Eddy (Portuguese (Brazil))'
const LUFS_VOZ = -16   // acima dos -20 dos efeitos: a voz manda, o resto acompanha

// O ELENCO DE TIMBRES. Um personagem sempre soa igual porque o timbre está AQUI, não no roteiro:
// se cada cena escolhesse pbas na mão, o mesmo personagem mudaria de voz entre shots e ninguém
// perceberia até o vídeo pronto.
export const TIMBRES = {
  narrador: { pbas: 42, rate: 190 },   // neutro, é o padrão
  ferran: { pbas: 52, rate: 200 },     // mais agudo e apressado: o cara está eufórico
  laporta: { pbas: 30, rate: 168 },    // grave e lento: dirigente não tem pressa nenhuma
  torcedor: { pbas: 46, rate: 205 },
  rodri: { pbas: 38, rate: 178 },      // grave e calmo: o volante que fala pouco
  velho: { pbas: 22, rate: 150 },
}

const hash = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 12)

/** Gera (ou reaproveita) o MP3 de uma fala. Devolve { arquivo, caminho, seg, cacheado }. */
export async function gerarFala (texto, { quem = 'narrador', voz = VOZ_PADRAO } = {}) {
  const t = TIMBRES[quem] || TIMBRES.narrador
  const limpo = String(texto || '').trim()
  if (!limpo) throw new Error('fala vazia')

  // O cache é por CONTEÚDO (texto + timbre + voz). Trocar uma vírgula gera um arquivo novo e o
  // antigo continua lá, o que é o comportamento certo: render antigo não muda sozinho.
  const id = hash(`${voz}|${t.pbas}|${t.rate}|${limpo}`)
  const arquivo = `${id}.mp3`
  const caminho = path.join(FALAS_DIR, arquivo)

  const ja = await fs.stat(caminho).catch(() => null)
  if (!ja) {
    await fs.mkdir(FALAS_DIR, { recursive: true })
    const bruto = path.join(FALAS_DIR, `.tmp-${id}.aiff`)
    await run('say', ['-v', voz, '-r', String(t.rate), '-o', bruto, `[[pbas ${t.pbas}]] ${limpo}`])
    await run('ffmpeg', ['-v', 'error', '-y', '-i', bruto,
      '-af', `loudnorm=I=${LUFS_VOZ}:TP=-1.5:LRA=11`, '-ar', '44100', '-ac', '2', '-b:a', '160k', caminho])
    await fs.rm(bruto, { force: true })
  }

  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', caminho])
  return { arquivo, caminho, seg: +(+stdout.trim()).toFixed(2), cacheado: !!ja }
}

/** Quantos FRAMES uma fala vai ocupar. Serve pra dimensionar o shot antes de gerar o áudio. */
export async function framesDaFala (texto, opts = {}, fps = 30) {
  const { seg } = await gerarFala(texto, opts)
  return Math.ceil(seg * fps)
}

async function main () {
  const argv = process.argv.slice(2)
  const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]
  }))
  const texto = argv.filter(a => !a.startsWith('--')).join(' ')

  if (flags.elenco) {
    const frase = texto || 'agora eu quero ver esse clube mostrar o amor que sente por mim'
    for (const quem of Object.keys(TIMBRES)) {
      const r = await gerarFala(`${quem}. ${frase}`, { quem })
      console.log(`${quem.padEnd(10)} ${r.seg}s  ${r.caminho}`)
    }
    return
  }
  if (!texto) {
    console.log('uso: node scripts/audio/falar.mjs "<texto>" [--quem=narrador|ferran|laporta|torcedor|velho]')
    console.log('     node scripts/audio/falar.mjs --elenco')
    process.exit(1)
  }
  const r = await gerarFala(texto, { quem: flags.quem })
  console.log(`${r.seg}s (${Math.ceil(r.seg * 30)} frames a 30fps) ${r.cacheado ? '[cache]' : ''}`)
  console.log(r.caminho)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e.message); process.exit(1) })
