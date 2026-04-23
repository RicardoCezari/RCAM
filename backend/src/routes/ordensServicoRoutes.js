const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/ordensServicoController');
const validate = require('../middlewares/validate');

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Ordens de Serviço
 *   description: Gerenciamento completo das ordens de serviço
 */

/**
 * @openapi
 * /api/ordens:
 *   get:
 *     tags: [Ordens de Serviço]
 *     summary: Listar ordens de serviço
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [ENTRADA, ORCAMENTO, EM_ANDAMENTO, CANCELADO, CONCLUIDO]
 *       - in: query
 *         name: clienteId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: usuarioId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: dataInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar data_entrega >= dataInicio
 *       - in: query
 *         name: dataFim
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar data_entrega <= dataFim
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista paginada de ordens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListaOrdens'
 *   post:
 *     tags: [Ordens de Serviço]
 *     summary: Criar ordem de serviço
 *     description: Cria a OS e opcionalmente já insere itens. O `usuario_id` padrão é o do usuário logado.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrdemServicoInput'
 *     responses:
 *       201:
 *         description: OS criada com seus itens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdemServico'
 *       422:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroValidacao'
 */
// ─── Listagem e busca ───────────────────────────────
router.get('/', ctrl.listar);

/**
 * @openapi
 * /api/ordens/{id}:
 *   get:
 *     tags: [Ordens de Serviço]
 *     summary: Buscar OS por ID (com itens)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OS completa com itens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdemServico'
 *       404:
 *         description: Não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 *   put:
 *     tags: [Ordens de Serviço]
 *     summary: Atualizar dados gerais da OS
 *     description: Atualiza data de entrega, hora e observações. Para itens use os endpoints específicos.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data_entrega:
 *                 type: string
 *                 format: date
 *               hora_entrega:
 *                 type: string
 *                 nullable: true
 *               observacoes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: OS atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdemServico'
 */
router.get('/:id', ctrl.buscarPorId);

// ─── Criar OS ──────────────────────────────────────
router.post(
  '/',
  [
    body('cliente_id').isInt({ min: 1 }).withMessage('cliente_id inválido'),
    body('data_entrega').isDate().withMessage('data_entrega inválida (formato: YYYY-MM-DD)'),
    body('itens').optional().isArray().withMessage('itens deve ser um array'),
    body('itens.*.tipo_objeto_id').if(body('itens').exists()).isInt({ min: 1 }).withMessage('tipo_objeto_id inválido'),
    body('itens.*.servico_id').if(body('itens').exists()).isInt({ min: 1 }).withMessage('servico_id inválido'),
    validate,
  ],
  ctrl.criar
);

// ─── Atualizar OS ──────────────────────────────────
router.put(
  '/:id',
  [
    body('data_entrega').optional().isDate().withMessage('data_entrega inválida (formato: YYYY-MM-DD)'),
    validate,
  ],
  ctrl.atualizar
);

// ─── Mudar estado ──────────────────────────────────

/**
 * @openapi
 * /api/ordens/{id}/estado:
 *   patch:
 *     tags: [Ordens de Serviço]
 *     summary: Mudar estado da OS
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [ENTRADA, ORCAMENTO, EM_ANDAMENTO, CANCELADO, CONCLUIDO]
 *     responses:
 *       200:
 *         description: Estado alterado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 numero:
 *                   type: integer
 *                 estado:
 *                   type: string
 *       404:
 *         description: OS não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 */
router.patch(
  '/:id/estado',
  [
    body('estado')
      .notEmpty()
      .isIn(['ENTRADA', 'ORCAMENTO', 'EM_ANDAMENTO', 'CANCELADO', 'CONCLUIDO'])
      .withMessage('Estado inválido'),
    validate,
  ],
  ctrl.mudarEstado
);

// ─── Itens da OS ───────────────────────────────────

/**
 * @openapi
 * /api/ordens/{id}/itens:
 *   post:
 *     tags: [Ordens de Serviço]
 *     summary: Adicionar item à OS
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da ordem de serviço
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ItemOSInput'
 *     responses:
 *       201:
 *         description: Item adicionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ItemOS'
 *       404:
 *         description: OS não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 */

/**
 * @openapi
 * /api/ordens/{id}/itens/{itemId}:
 *   put:
 *     tags: [Ordens de Serviço]
 *     summary: Atualizar item da OS
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantidade:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               valor_unitario:
 *                 type: number
 *               eh_orcamento:
 *                 type: boolean
 *               estado:
 *                 type: string
 *                 enum: [CADASTRADO, EM_ANDAMENTO, CANCELADO, CONCLUIDO]
 *               observacoes:
 *                 type: string
 *                 nullable: true
 *               foto_url:
 *                 type: string
 *                 nullable: true
 *               data_entrega:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               hora_entrega:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Item atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ItemOS'
 *       404:
 *         description: Item não encontrado nesta ordem
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 *   delete:
 *     tags: [Ordens de Serviço]
 *     summary: Remover item da OS
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Item removido
 *       404:
 *         description: Item não encontrado nesta ordem
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 */
router.post(
  '/:id/itens',
  [
    body('tipo_objeto_id').isInt({ min: 1 }).withMessage('tipo_objeto_id inválido'),
    body('servico_id').isInt({ min: 1 }).withMessage('servico_id inválido'),
    body('quantidade').optional().isInt({ min: 1, max: 10 }).withMessage('quantidade deve ser entre 1 e 10'),
    validate,
  ],
  ctrl.adicionarItem
);

router.put('/:id/itens/:itemId', ctrl.atualizarItem);
router.delete('/:id/itens/:itemId', ctrl.removerItem);

module.exports = router;
