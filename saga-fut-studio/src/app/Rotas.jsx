import React from 'react'
import SagasList from '../views/SagasList.jsx'
import SagaView from '../views/saga/index.jsx'
import EpView from '../views/episodio/index.jsx'
import QuadrinhosList from '../views/QuadrinhosList.jsx'
import QuadrinhoView from '../views/quadrinho/index.jsx'
import VideosList from '../views/VideosList.jsx'
import VideoView from '../views/video/index.jsx'
import PersonagensView from '../views/Personagens.jsx'
import EstilosView from '../views/Estilos.jsx'
import RedesView from '../views/Redes.jsx'
import Cronograma from '../views/Cronograma.jsx'
import Melhorias from '../views/Melhorias.jsx'
import Baixar from '../views/Baixar.jsx'

// Qual view cada página abre. O resto do estado as views puxam do useStudio().
export function Rotas({ route }) {
  switch (route.page) {
    case 'sagas': return <SagasList />
    case 'quadrinhos': return <QuadrinhosList />
    case 'videos': return <VideosList />
    case 'personagens': return <PersonagensView personagemId={route.personagemId} />
    case 'estilos': return <EstilosView />
    case 'cronograma': return <Cronograma />
    case 'redes': return <RedesView />
    case 'melhorias': return <Melhorias />
    case 'baixar': return <Baixar />
    // key: trocar de item remonta a view. Sem isso o React reusa o componente e o
    // estado local (ficha aberta, cena/painel expandido) vaza de um item pro outro.
    case 'saga': return <SagaView key={route.sagaId} sagaId={route.sagaId} />
    case 'ep': return <EpView key={route.epId} sagaId={route.sagaId} epId={route.epId} sub={route.sub || 'cenas'} />
    case 'quadrinho': return <QuadrinhoView key={route.quadId} quadId={route.quadId} sub={route.sub || 'conteudo'} />
    case 'video': return <VideoView key={route.videoId} videoId={route.videoId} sub={route.sub || 'render'} />
    // QUADRINHOS é a primeira tela: a Home foi removida (era um painel de atalhos que
    // deixou de ser usado). Rota desconhecida cai aqui em vez de numa tela morta.
    default: return <QuadrinhosList />
  }
}
