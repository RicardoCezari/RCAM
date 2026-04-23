const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/usuariosController');
const validate = require('../middlewares/validate');

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Usuários
 *   description: Gerenciamento de funcionários do sistema
 */

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     tags: [Usuários]
 *     summary: Listar usuários
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *   post:
 *     tags: [Usuários]
 *     summary: Criar usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioInput'
 *     responses:
 *       201:
 *         description: Usuário criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       409:
 *         description: Login já está em uso
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

/**
 * @openapi
 * /api/usuarios/{id}:
 *   get:
 *     tags: [Usuários]
 *     summary: Buscar usuário por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 *   put:
 *     tags: [Usuários]
 *     summary: Atualizar usuário
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
 *               nome:
 *                 type: string
 *               login:
 *                 type: string
 *               ativo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Não encontrado
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
    body('login').trim().notEmpty().withMessage('Login é obrigatório'),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
    validate,
  ],
  ctrl.criar
);

router.put(
  '/:id',
  [
    body('nome').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'),
    body('login').optional().trim().notEmpty().withMessage('Login não pode ser vazio'),
    validate,
  ],
  ctrl.atualizar
);

/**
 * @openapi
 * /api/usuarios/{id}/senha:
 *   patch:
 *     tags: [Usuários]
 *     summary: Trocar senha
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
 *             required: [senhaAtual, novaSenha]
 *             properties:
 *               senhaAtual:
 *                 type: string
 *                 format: password
 *               novaSenha:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *       400:
 *         description: Senha atual incorreta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 */
router.patch(
  '/:id/senha',
  [
    body('senhaAtual').notEmpty().withMessage('Senha atual é obrigatória'),
    body('novaSenha').isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres'),
    validate,
  ],
  ctrl.trocarSenha
);

module.exports = router;
