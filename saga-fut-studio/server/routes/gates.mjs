// gates.mjs — A BANCADA DE CALIBRAGEM DOS GATES.
//
// POR QUE EXISTE: os limiares deste projeto foram ajustados cinco vezes contra veredito humano, e
// nas cinco uma régua que parecia certa na teoria reprovou arte boa. Isso só apareceu porque alguém
// estava olhando o terminal no momento certo. Aqui as reprovações viram uma FILA que sobrevive à
// sessão, com a folha guardada ao lado, pra que "esse gate está calibrado?" seja uma pergunta que
// se responde olhando, não lembrando.
//
// O número que importa nesta tela não é quantas reprovações houve, é a TAXA DE FALSO POSITIVO por
// gate. Um gate que reprova muito e acerta sempre está fazendo o trabalho dele; um que reprova
// pouco mas erra metade das vezes está treinando todo mundo a usar `--forcar`.
import { Router } from 'express';
import { lerGates, julgarGate } from '../../scripts/sprites/registro-gate.mjs';

export const gatesRouter = Router();

gatesRouter.get('/gates', async (_req, res) => {
  try {
    const registros = await lerGates();
    // agregado POR GATE: é o que diz qual régua precisa de conserto, e a conta ignora o que ainda
    // não foi julgado em vez de contar como acerto (senão um gate novo nasce com 100% de acerto).
    const porGate = {};
    for (const r of registros) {
      const g = (porGate[r.gate] ||= { gate: r.gate, total: 0, julgados: 0, reais: 0, falsos: 0, fails: 0, avisos: 0 });
      g.total++;
      if (r.nivel === 'fail') g.fails++; else g.avisos++;
      if (r.veredito === 'real') { g.julgados++; g.reais++; }
      if (r.veredito === 'falso-positivo') { g.julgados++; g.falsos++; }
    }
    for (const g of Object.values(porGate)) {
      g.taxaFalsoPositivo = g.julgados ? g.falsos / g.julgados : null;
    }
    res.json({
      registros,
      resumo: Object.values(porGate).sort((a, b) => b.total - a.total),
      pendentes: registros.filter((r) => !r.veredito).length,
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

gatesRouter.post('/gates/:id/veredito', async (req, res) => {
  try {
    const { veredito, observacao } = req.body || {};
    await julgarGate(req.params.id, veredito, observacao || null);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ erro: e.message }); }
});
