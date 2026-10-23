const { Router } = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const { apenasAdmin } = require('../middlewares/admin');
const { uploadLogo } = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const service = require('../services/configuracoesService');

const router = Router();

const responder = (acao) => async (req, res, next) => {
  try {
    res.json(await acao(req));
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * tags:
 *   name: Configurações
 *   description: Dados da empresa (nome e logo) usados no sistema e na impressão
 */

// Pública: a logo aparece também na tela de login
router.get('/', responder(() => service.obter()));

router.put(
  '/',
  [authMiddleware, apenasAdmin, body('empresa_nome').optional({ nullable: true }).isLength({ max: 80 }).withMessage('Nome muito longo'), validate],
  responder((req) => service.atualizar(req.body))
);

router.post('/logo', [authMiddleware, apenasAdmin, uploadLogo], responder((req) => service.trocarLogo(req.file)));

router.delete('/logo', [authMiddleware, apenasAdmin], responder(() => service.removerLogo()));

module.exports = router;
