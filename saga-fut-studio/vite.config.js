import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // ABERTO NA REDE LOCAL, pra abrir o studio no CELULAR e postar de lá (aba Postar).
    // O caminho de publicação termina no telefone de qualquer jeito: Instagram e TikTok só
    // aceitam música nativa pelo app, então o material precisa chegar lá. Antes ele ia por
    // WhatsApp Web, que reordena imagem, recomprime e obriga a copiar texto de dentro de um
    // balão de conversa. Com o studio na rede, o celular abre a peça direto na fonte.
    //
    // Só a porta do VITE precisa disto: o proxy abaixo roda no Node, não no browser, então a
    // API continua fechada em localhost e nada além do studio fica exposto.
    //
    // O terminal imprime o IP no boot ("Network: http://192.168.x.x:4610"). Vale só dentro da
    // sua rede: fora dela não responde, e é assim que tem que ser.
    host: true,
    proxy: {
      '/api': 'http://localhost:4600',
      '/files': 'http://localhost:4600',
    },
  },
})
