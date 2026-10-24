const { Router } = require('express');
const dashboardService = require('../services/dashboardService');

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Dashboard
 *   description: Indicadores gerenciais (somente administradores)
 */

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Indicadores das O.S. criadas no período
 *     description: >
 *       Todos os indicadores consideram as O.S. criadas entre inicio e fim (data_criacao). Concluídas = CONCLUIDO ou
 *       ENTREGUE; pendentes = ENTRADA, ORCAMENTO ou EM_ANDAMENTO. Serviços realizados e faturamento vêm dos itens
 *       concluídos ou entregues.
 *     parameters:
 *       - in: query
 *         name: inicio
 *         schema: { type: string, format: date }
 *         description: AAAA-MM-DD (padrão, 30 dias atrás)
 *       - in: query
 *         name: fim
 *         schema: { type: string, format: date }
 *         description: AAAA-MM-DD (padrão, hoje)
 *       - in: query
 *         name: usuarioId
 *         schema: { type: integer }
 *         description: Somente O.S. abertas por este usuário
 *       - in: query
 *         name: servicoId
 *         schema: { type: integer }
 *         description: Somente O.S. com este serviço (e itens deste serviço nos indicadores de serviço)
 *     responses:
 *       200:
 *         description: Resumo, série, distribuição por status, serviços e produtividade
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Apenas administradores
 */
router.get('/', async (req, res, next) => {
  try {
    const { inicio, fim, usuarioId, servicoId } = req.query;
    res.json(await dashboardService.obter({ inicio, fim, usuarioId, servicoId }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
