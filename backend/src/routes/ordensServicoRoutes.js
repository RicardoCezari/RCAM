const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/ordensServicoController');
const validate = require('../middlewares/validate');
const { uploadFotos } = require('../middlewares/upload');

const { validarIdParam } = require('../middlewares/validate');

const router = Router();
router.param('id', validarIdParam);
router.param('itemId', validarIdParam);
router.param('fotoId', validarIdParam);
router.param('clienteId', validarIdParam);

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
 *         description: Um ou mais estados separados por vírgula (ENTRADA, ORCAMENTO, EM_ANDAMENTO, CONCLUIDO, ENTREGUE, CANCELADO)
 *       - in: query
 *         name: situacao
 *         schema:
 *           type: string
 *           enum: [pendentes, entregues, canceladas]
 *         description: Pendentes = não entregues, incluindo canceladas ainda não devolvidas ao cliente; Entregues = entregues e canceladas já devolvidas
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Busca global (número, cliente, e-mail e telefone do cliente, usuário, tipo de objeto, observações e datas dd/mm[/aaaa])
 *       - in: query
 *         name: numero
 *         schema:
 *           type: string
 *       - in: query
 *         name: cliente
 *         schema:
 *           type: string
 *       - in: query
 *         name: telefone
 *         schema:
 *           type: string
 *       - in: query
 *         name: usuario
 *         schema:
 *           type: string
 *       - in: query
 *         name: ordenarPor
 *         schema:
 *           type: string
 *           enum: [numero, cliente, telefone, cadastro, entrega, usuario, estado, total]
 *       - in: query
 *         name: direcao
 *         schema:
 *           type: string
 *           enum: [asc, desc]
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
 *         name: criacaoInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar data de abertura >= criacaoInicio (dia incluído)
 *       - in: query
 *         name: criacaoFim
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar data de abertura até o fim do dia criacaoFim
 *       - in: query
 *         name: valorMin
 *         schema:
 *           type: number
 *         description: Valor exibido (total ou, sem total, orçamento) >= valorMin
 *       - in: query
 *         name: valorMax
 *         schema:
 *           type: number
 *         description: Valor exibido <= valorMax
 *       - in: query
 *         name: objeto
 *         schema:
 *           type: string
 *         description: Tipo de objeto (parcial)
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
 * /api/ordens/cliente/{clienteId}/historico:
 *   get:
 *     tags: [Ordens de Serviço]
 *     summary: Histórico de itens de um cliente (com fotos de entrada e de entrega)
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Itens já registrados para o cliente, do mais recente ao mais antigo
 */
router.get('/cliente/:clienteId(\\d+)/historico', ctrl.historicoCliente);

/**
 * @openapi
 * /api/ordens/{id}/historico:
 *   get:
 *     tags: [Ordens de Serviço]
 *     summary: Histórico de mudanças de estado da OS e de seus itens
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de mudanças de estado, da mais recente à mais antiga
 */
router.get('/:id(\\d+)/historico', ctrl.historicoOrdem);

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
    body('itens.*.quantidade').if(body('itens').exists()).optional({ nullable: true }).isInt({ min: 1, max: 10 }).withMessage('quantidade deve ser entre 1 e 10'),
    body('itens.*.valor_unitario').if(body('itens').exists()).optional({ nullable: true }).isFloat({ min: 0 }).withMessage('valor_unitario inválido'),
    body('itens.*.objeto_indice').if(body('itens').exists()).optional({ nullable: true }).isInt({ min: 1 }).withMessage('objeto_indice inválido'),
    body('itens.*.observacoes').if(body('itens').exists()).optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('observacoes deve ter até 500 caracteres'),
    body('estado').optional().isString().withMessage('estado inválido'),
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
 *     summary: Aplicar um estado a todos os itens da OS (ignora itens cancelados e já entregues)
 *     description: O estado da OS é calculado a partir dos estados dos itens. Em OS sem itens o estado é gravado diretamente.
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
 *                 enum: [ENTRADA, ORCAMENTO, EM_ANDAMENTO, CONCLUIDO, ENTREGUE, CANCELADO]
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
      .isIn(['ENTRADA', 'ORCAMENTO', 'AUTORIZADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO'])
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
 *                 enum: [CADASTRADO, ORCAMENTO, AUTORIZADO, EM_ANDAMENTO, CONCLUIDO, ENTREGUE, CANCELADO]
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
    body('quantidade').optional({ nullable: true }).isInt({ min: 1, max: 10 }).withMessage('quantidade deve ser entre 1 e 10'),
    body('valor_unitario').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('valor_unitario inválido'),
    body('objeto_indice').optional({ nullable: true }).isInt({ min: 1 }).withMessage('objeto_indice inválido'),
    body('observacoes').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('observacoes deve ter até 500 caracteres'),
    validate,
  ],
  ctrl.adicionarItem
);

router.put(
  '/:id/itens/:itemId',
  [
    body('quantidade').optional({ nullable: true }).isInt({ min: 1, max: 10 }).withMessage('quantidade deve ser entre 1 e 10'),
    body('valor_unitario').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('valor_unitario inválido'),
    body('estado').optional().isString().withMessage('estado inválido'),
    body('eh_orcamento').optional({ nullable: true }).isBoolean().withMessage('eh_orcamento inválido'),
    body('observacoes').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('observacoes deve ter até 500 caracteres'),
    body('data_entrega').optional({ values: 'falsy' }).isDate().withMessage('data_entrega inválida (formato: YYYY-MM-DD)'),
    body('objeto_indice').optional({ nullable: true }).isInt({ min: 1 }).withMessage('objeto_indice inválido'),
    validate,
  ],
  ctrl.atualizarItem
);
router.delete('/:id/itens/:itemId', ctrl.removerItem);

// ─── Fotos da OS ─────────────────────────────────────────────
// multipart/form-data: campo "fotos" (até 10 imagens) e "item_id" opcional
router.post(
  '/:id/fotos',
  [uploadFotos, body('item_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('item_id inválido'),
    body('etapa').optional({ values: 'falsy' }).isIn(['ENTRADA', 'ENTREGA']).withMessage('etapa inválida'), validate],
  ctrl.adicionarFotos
);
router.delete('/:id/fotos/:fotoId', ctrl.removerFoto);

module.exports = router;

