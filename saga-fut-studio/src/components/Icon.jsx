import React from 'react'

// Ícones de traço, um peso só, cor herdada do texto (currentColor). É o que faz
// eles parecerem um conjunto, coisa que emoji nunca consegue: cada um vem com
// cor, peso e alinhamento próprios da fonte do sistema.
//
// Uso: <Icon name="sagas" /> ou <Icon name="trash" size={14} />

const PATHS = {
  // navegação
  home: 'M3 10.2 12 3l9 7.2M5 9.5V20a1 1 0 0 0 1 1h3.5v-6h5v6H18a1 1 0 0 0 1-1V9.5',
  sagas: 'M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM8.5 3.5 12 8l3.5-4.5',
  quadrinhos: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Z',
  personagens: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-1.5a4 4 0 0 0-3-3.9M16.5 3.6a3.5 3.5 0 0 1 0 6.8',
  estilos: 'M12 21a9 9 0 1 1 9-9c0 1.7-1.3 3-3 3h-1.5a2 2 0 0 0-1.4 3.4c.3.3.4.7.4 1.1 0 .8-.7 1.5-1.5 1.5H12ZM7.5 11.5h.01M10.5 7.5h.01M15 7.5h.01',
  redes: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 10.5l6.8-3.4M8.6 13.5l6.8 3.4',
  melhorias: 'M14.5 6.5a3.5 3.5 0 0 0 4.6 4.6l-8.2 8.2a2.4 2.4 0 1 1-3.4-3.4l8.2-8.2a3.5 3.5 0 0 0-1.2-1.2ZM14.5 6.5 18 3l3 3-3.5 3.5',

  // sub-abas do episódio
  cenas: 'M3 5h18v14H3zM3 9.5h18M3 14.5h18M8 5v14M16 5v14',
  previa: 'M8 5.5v13l11-6.5-11-6.5Z',
  narracao: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11.5A6.5 6.5 0 0 0 12 18a6.5 6.5 0 0 0 6.5-6.5M12 18v3',
  montar: 'M6.5 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6.5 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 7.5 20 18M9 16.5 20 6',
  publicar: 'M4 11.5 20.5 4l-7 16.5-2-7-7.5-2Z',

  // ações
  gerar: 'M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8Z',
  copiar: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  duplicar: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  trash: 'M4 6.5h16M9.5 6.5V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 6.5 7 20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13.5M10 10.5v6M14 10.5v6',
  plus: 'M12 5v14M5 12h14',
  salvar: 'M5 3h11l3 3v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8 3v6h7V3M8 21v-6h8v6',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  x: 'M6 6l12 12M18 6 6 18',
  alerta: 'M12 3.5 22 20H2L12 3.5ZM12 9.5v5M12 17.2h.01',
  pasta: 'M3 6.5a1 1 0 0 1 1-1h5l2 2.5h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-12Z',
  imagem: 'M3.5 4.5h17a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1ZM8 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM2.5 16l5-4.5 6 5.5M13.5 13l3-2.5 5 4',
  video: 'M3 6.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11ZM14 10l7-4v12l-7-4',
  musica: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5.5l3.5 2',
  chevron: 'M9 5.5 15.5 12 9 18.5',
  editar: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5l-4 1 1-4 12-12Z',
  baixar: 'M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16',
}

export function Icon({ name, size = 16, className = '', ...rest }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      className={'icon ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}
