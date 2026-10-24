const { Router } = require('express');
const { body, param } = require('express-validator');
const validate = require('../middlewares/validate');
const service = require('../services/dispositivosService');

const router = Router();

const responder = (acao, status = 200) => async (req, res, next) => {
  try {
    const resultado = await acao(req);
    res.status(status).json(resultado);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * tags:
 *   name: Aparelhos
 *   description: Aparelhos autorizados pelo administrador para entrada rápida por PIN (somente administradores)
 */

/**
 * @openapi
 * /api/dispositivos:
 *   get:
 *     tags: [Aparelhos]
 *     summary: Lista os aparelhos autorizados
 *     responses:
 *       200:
 *         description: Lista de aparelhos
 *   post:
 *     tags: [Aparelhos]
 *     summary: Autoriza um aparelho
 *     description: Devolve o token do aparelho uma única vez; o servidor guarda apenas o hash.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome]
 *             properties:
 *               nome:
 *                 type: string
 *                 maxLength: 80
 *     responses:
 *       201:
 *         description: Aparelho autorizado
 */
router.get('/', responder(() => service.listar()));

router.post(
  '/',
  [body('nome').trim().notEmpty().withMessage('Informe um nome para o aparelho').isLength({ max: 80 }).withMessage('Nome muito longo'), validate],
  responder((req) => service.autorizar(req.body.nome, req.usuario.id), 201)
);

/**
 * @openapi
 * /api/dispositivos/{id}:
 *   delete:
 *     tags: [Aparelhos]
 *     summary: Revoga a autorização de um aparelho
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Autorização revogada
 *       404:
 *         description: Aparelho não encontrado
 */
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Aparelho inválido'), validate],
  responder(async (req) => {
    await service.revogar(Number(req.params.id));
    return { message: 'Autorização revogada' };
  })
);

module.exports = router;
