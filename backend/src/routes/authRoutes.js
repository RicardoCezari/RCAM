const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Autenticação de usuários
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     description: Autentica um usuário e retorna um token JWT válido por 8 horas.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciais inválidas
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
router.post(
  '/login',
  [
    body('login').trim().notEmpty().withMessage('Login é obrigatório'),
    body('senha').notEmpty().withMessage('Senha é obrigatória'),
    validate,
  ],
  authController.login
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil do usuário logado
 *     description: Retorna os dados do usuário autenticado pelo token JWT.
 *     responses:
 *       200:
 *         description: Dados do usuário logado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 */
router.get('/me', authMiddleware, authController.me);

module.exports = router;
