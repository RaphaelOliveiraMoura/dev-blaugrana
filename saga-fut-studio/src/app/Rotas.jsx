import React from 'react'
import Home from '../views/Home.jsx'
import SagasList from '../views/SagasList.jsx'
import SagaView from '../views/saga/index.jsx'
import EpView from '../views/episodio/index.jsx'
import QuadrinhosList from '../views/QuadrinhosList.jsx'
import QuadrinhoView from '../views/quadrinho/index.jsx'
import PersonagensView from '../views/Personagens.jsx'
import EstilosView from '../views/Estilos.jsx'
import RedesView from '../views/Redes.jsx'
import Melhorias from '../views/Melhorias.jsx'

// Qual view cada página abre. O resto do estado as views puxam do useStudio().
export function Rotas({ route }) {
  switch (route.page) {
    case 'sagas': return <SagasList />
    case 'quadrinhos': return <QuadrinhosList />
    case 'personagens': return <PersonagensView personagemId={route.personagemId} />
    case 'estilos': return <EstilosView />
    case 'redes': return <RedesView />
    case 'melhorias': return <Melhorias />
    // key: trocar de item remonta a view. Sem isso o React reusa o componente e o
    // estado local (ficha aberta, cena/painel expandido) vaza de um item pro outro.
    case 'saga': return <SagaView key={route.sagaId} sagaId={route.sagaId} />
    case 'ep': return <EpView key={route.epId} sagaId={route.sagaId} epId={route.epId} sub={route.sub || 'cenas'} />
    case 'quadrinho': return <QuadrinhoView key={route.quadId} quadId={route.quadId} />
    default: return <Home />
  }
}
