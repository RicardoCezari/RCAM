const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/clientesController');
const validate = require('../middlewares/validate');

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Clientes
 *   description: Cadastro e consulta de clientes
 */

/**
 * @openapi
 * /api/clientes:
 *   get:
 *     tags: [Clientes]
 *     summary: Listar clientes
 *     description: Retorna lista paginada. Use `?q=` para buscar por nome, telefone ou CPF.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Texto para filtrar nome, telefone ou CPF
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
 *         description: Lista paginada de clientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListaClientes'
 *   post:
 *     tags: [Clientes]
 *     summary: Criar cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClienteInput'
 *     responses:
 *       201:
 *         description: Cliente criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cliente'
 *       409:
 *         description: Telefone ou CPF já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 *       422:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroValidacao'
 */
router.get('/', ctrl.listar);

// IMPORTANTE: estas rotas devem ficar antes de /:id para não ser capturadas como id
router.get('/telefone/:telefone', ctrl.buscarPorTelefone);
router.get('/cpf/:cpf', ctrl.buscarPorCpf);

/**
 * @openapi
 * /api/clientes/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Buscar cliente por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do cliente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cliente'
 *       404:
 *         description: Cliente não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 *   put:
 *     tags: [Clientes]
 *     summary: Atualizar cliente
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
 *             $ref: '#/components/schemas/ClienteInput'
 *     responses:
 *       200:
 *         description: Cliente atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cliente'
 *       404:
 *         description: Cliente não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 *   delete:
 *     tags: [Clientes]
 *     summary: Deletar cliente
 *     description: Falha com 409 se o cliente possuir ordens de serviço vinculadas.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Deletado com sucesso
 *       409:
 *         description: Cliente possui ordens de serviço cadastradas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 */
router.get('/:id', ctrl.buscarPorId);

router.post(
  '/',
  [
    body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
    body('telefone').trim().notEmpty().withMessage('Telefone é obrigatório'),
    body('cpf').optional({ nullable: true }).isLength({ min: 11, max: 11 }).withMessage('CPF deve ter 11 dígitos'),
    body('email').optional({ nullable: true }).isEmail().withMessage('E-mail inválido'),
    validate,
  ],
  ctrl.criar
);

router.put(
  '/:id',
  [
    body('nome').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'),
    body('cpf').optional({ nullable: true }).isLength({ min: 11, max: 11 }).withMessage('CPF deve ter 11 dígitos'),
    body('email').optional({ nullable: true }).isEmail().withMessage('E-mail inválido'),
    validate,
  ],
  ctrl.atualizar
);

router.delete('/:id', ctrl.deletar);

module.exports = router;
