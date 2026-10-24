const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/clientesController');
const validate = require('../middlewares/validate');

const { validarIdParam } = require('../middlewares/validate');

const router = Router();
router.param('id', validarIdParam);

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
 *     description: Retorna lista paginada. `q` faz busca global (nome, e-mail, observações e, quando numérico, telefone/CPF); `nome`, `telefone`, `cpf`, `email` e `observacoes` filtram por coluna (parcial, combinados com AND).
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Busca global (máx. 100 caracteres)
 *       - in: query
 *         name: nome
 *         schema: { type: string }
 *       - in: query
 *         name: telefone
 *         schema: { type: string }
 *         description: Compara apenas os dígitos
 *       - in: query
 *         name: cpf
 *         schema: { type: string }
 *         description: Compara apenas os dígitos
 *       - in: query
 *         name: email
 *         schema: { type: string }
 *       - in: query
 *         name: observacoes
 *         schema: { type: string }
 *       - in: query
 *         name: ordenarPor
 *         schema:
 *           type: string
 *           enum: [nome, cpf, telefone, email, cadastro]
 *       - in: query
 *         name: direcao
 *         schema:
 *           type: string
 *           enum: [asc, desc]
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

const validarTelefone = (v) => {
  const d = String(v).replace(/\D/g, '');
  if (d.length < 10 || d.length > 11) throw new Error('Telefone deve ter 10 ou 11 dígitos (com DDD)');
  if (d.length === 10 && d[2] === '9') throw new Error('Celular incompleto: falta o 9 obrigatório após o DDD.');
  return true;
};
const validarCpf = (v) => {
  if (String(v).replace(/\D/g, '').length !== 11) throw new Error('CPF deve ter 11 dígitos');
  return true;
};

router.post(
  '/',
  [
    body('nome').isString().trim().notEmpty().withMessage('Nome é obrigatório')
      .isLength({ max: 200 }).withMessage('Nome deve ter no máximo 200 caracteres'),
    body('telefone').isString().withMessage('Telefone é obrigatório').bail().trim().notEmpty()
      .withMessage('Telefone é obrigatório').bail().custom(validarTelefone),
    body('cpf').optional({ values: 'falsy' }).custom(validarCpf),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('E-mail inválido')
      .isLength({ max: 150 }).withMessage('E-mail deve ter no máximo 150 caracteres'),
    validate,
  ],
  ctrl.criar
);

router.put(
  '/:id',
  [
    body('nome').optional().isString().trim().notEmpty().withMessage('Nome não pode ser vazio')
      .isLength({ max: 200 }).withMessage('Nome deve ter no máximo 200 caracteres'),
    body('telefone').optional().isString().withMessage('Telefone inválido').bail().custom(validarTelefone),
    body('cpf').optional({ values: 'falsy' }).custom(validarCpf),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('E-mail inválido')
      .isLength({ max: 150 }).withMessage('E-mail deve ter no máximo 150 caracteres'),
    validate,
  ],
  ctrl.atualizar
);

router.delete('/:id', ctrl.deletar);

module.exports = router;
