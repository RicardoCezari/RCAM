const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');
const exigirDispositivo = require('../middlewares/dispositivo');
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

/**
 * @openapi
 * /api/auth/perfis:
 *   get:
 *     tags: [Auth]
 *     summary: Perfis para entrada rápida por PIN
 *     description: >
 *       Lista (id e nome) os usuários ativos que têm PIN, mais o tamanho do PIN. Exige um aparelho autorizado
 *       pelo administrador (cabeçalho `X-Dispositivo`); o login dos usuários não é exposto.
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Dispositivo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Perfis disponíveis
 *       401:
 *         description: Aparelho não autorizado
 */
router.get('/perfis', exigirDispositivo, authController.perfis);

/**
 * @openapi
 * /api/auth/pin:
 *   post:
 *     tags: [Auth]
 *     summary: Login por PIN
 *     description: >
 *       Autentica um perfil pelo PIN, apenas em aparelho autorizado (cabeçalho `X-Dispositivo`). Após 5 PINs
 *       incorretos seguidos o perfil fica bloqueado por 15 minutos (o login com senha continua disponível).
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Dispositivo
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario_id, pin]
 *             properties:
 *               usuario_id:
 *                 type: integer
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: PIN incorreto ou aparelho não autorizado
 *       429:
 *         description: Perfil bloqueado temporariamente
 */
router.post(
  '/pin',
  [
    exigirDispositivo,
    body('usuario_id').isInt({ min: 1 }).withMessage('Perfil inválido'),
    body('pin').isString().withMessage('Informe o PIN'),
    validate,
  ],
  authController.loginPorPin
);

/**
 * @openapi
 * /api/auth/pin/confirmar:
 *   post:
 *     tags: [Auth]
 *     summary: Reconfirmar o PIN do usuário logado
 *     description: >
 *       Confere o PIN de quem já está autenticado (usado para entrar na Administração). Compartilha o limite de
 *       5 tentativas e o bloqueio de 15 minutos do login por PIN.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pin]
 *             properties:
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: PIN correto
 *       401:
 *         description: PIN incorreto ou usuário sem PIN
 *       429:
 *         description: Perfil bloqueado temporariamente
 */
router.post(
  '/pin/confirmar',
  [authMiddleware, body('pin').isString().withMessage('Informe o PIN'), validate],
  authController.confirmarPin
);

/**
 * @openapi
 * /api/auth/senha/confirmar:
 *   post:
 *     tags: [Auth]
 *     summary: Reconfirmar a senha do usuário logado
 *     description: Usada quando o PIN foi esquecido, para liberar a Administração e permitir redefini-lo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [senha]
 *             properties:
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Senha correta
 *       401:
 *         description: Senha incorreta
 */
router.post(
  '/senha/confirmar',
  [authMiddleware, body('senha').isString().notEmpty().withMessage('Informe a senha'), validate],
  authController.confirmarSenha
);

module.exports = router;
