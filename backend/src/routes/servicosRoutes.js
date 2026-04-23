const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/servicosController');
const validate = require('../middlewares/validate');

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Serviços
 *   description: Catálogo de serviços e preços
 */

/**
 * @openapi
 * /api/servicos:
 *   get:
 *     tags: [Serviços]
 *     summary: Listar serviços
 *     parameters:
 *       - in: query
 *         name: ativo
 *         schema:
 *           type: boolean
 *         description: Filtrar por status ativo/inativo
 *     responses:
 *       200:
 *         description: Lista de serviços
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Servico'
 *   post:
 *     tags: [Serviços]
 *     summary: Criar serviço
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServicoInput'
 *     responses:
 *       201:
 *         description: Serviço criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Servico'
 *       422:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroValidacao'
 */
router.get('/', ctrl.listar);

/**
 * @openapi
 * /api/servicos/{id}:
 *   get:
 *     tags: [Serviços]
 *     summary: Buscar serviço por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do serviço
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Servico'
 *       404:
 *         description: Não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 *   put:
 *     tags: [Serviços]
 *     summary: Atualizar serviço
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
 *             $ref: '#/components/schemas/ServicoInput'
 *     responses:
 *       200:
 *         description: Serviço atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Servico'
 *   delete:
 *     tags: [Serviços]
 *     summary: Deletar ou desativar serviço
 *     description: Se o serviço tiver itens vinculados, é **desativado** (soft delete) em vez de excluído.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Excluído com sucesso
 *       200:
 *         description: Desativado (tinha itens vinculados)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 servico:
 *                   $ref: '#/components/schemas/Servico'
 */
router.get('/:id', ctrl.buscarPorId);

router.post(
  '/',
  [
    body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
    body('valor').isFloat({ min: 0 }).withMessage('Valor deve ser maior ou igual a 0'),
    validate,
  ],
  ctrl.criar
);

router.put(
  '/:id',
  [
    body('nome').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'),
    body('valor').optional().isFloat({ min: 0 }).withMessage('Valor deve ser maior ou igual a 0'),
    validate,
  ],
  ctrl.atualizar
);

router.delete('/:id', ctrl.deletar);

module.exports = router;
