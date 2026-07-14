import React from 'react'
import Home from '../views/Home.jsx'
import SagasList from '../views/SagasList.jsx'
import SagaView from '../views/Saga.jsx'
import EpView from '../views/Episodio.jsx'
import QuadrinhosList from '../views/QuadrinhosList.jsx'
import QuadrinhoView from '../views/Quadrinho.jsx'
import PersonagensView from '../views/Personagens.jsx'
import EstilosView from '../views/Estilos.jsx'
import RedesView from '../views/Redes.jsx'
import Melhorias from '../views/Melhorias.jsx'

// Qual view cada página abre. O resto do estado as views puxam do useStudio().
export function Rotas({ route }) {
  switch (route.page) {
    case 'sagas': return <SagasList />
    case 'quadrinhos': return <QuadrinhosList />
    case 'personagens': return <PersonagensView />
    case 'estilos': return <EstilosView />
    case 'redes': return <RedesView />
    case 'melhorias': return <Melhorias />
    case 'saga': return <SagaView si={route.si} />
    case 'ep': return <EpView si={route.si} ei={route.ei} sub={route.sub || 'cenas'} />
    case 'quadrinho': return <QuadrinhoView qi={route.qi} />
    default: return <Home />
  }
}
