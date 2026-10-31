const { Router } = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const { apenasAdmin } = require('../middlewares/admin');
const { uploadLogo } = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const service = require('../services/configuracoesService');
const { cnpjValido } = require('../utils/cnpj');

const router = Router();

const validarCampos = Object.entries(service.CAMPOS_TEXTO).map(([campo, max]) =>
  body(campo).optional({ nullable: true }).isString().isLength({ max }).withMessage(`Texto muito longo (máximo ${max} caracteres)`)
);

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
 *   description: Dados da empresa (nome, contatos, mensagem da nota e logo) usados no sistema e na impressão
 */

// Pública: a logo aparece também na tela de login
router.get('/', responder(() => service.obter()));

// O IP local nao deve aparecer na resposta publica usada pela tela de login.
router.get('/impressora', [authMiddleware, apenasAdmin], responder(() => service.obterImpressoraRede()));

router.put(
  '/impressora',
  [
    authMiddleware,
    apenasAdmin,
    body('tipoConexao').isIn(['ethernet', 'wifi']).withMessage('Selecione cabo de rede ou Wi-Fi'),
    body('enderecoIp')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 15 })
      .custom((valor, { req }) => {
        service.validarImpressoraRede({ tipoConexao: req.body.tipoConexao, enderecoIp: valor });
        return true;
      }),
    validate,
  ],
  responder((req) => service.atualizarImpressoraRede(req.body))
);

router.put(
  '/',
  [
    authMiddleware,
    apenasAdmin,
    ...validarCampos,
    body('empresa_cnpj')
      .optional({ values: 'falsy' })
      .custom((valor) => !String(valor).trim() || cnpjValido(valor))
      .withMessage('CNPJ inválido'),
    body('tema_cor')
      .optional({ nullable: true, checkFalsy: true })
      .matches(/^#[0-9a-fA-F]{6}$/)
      .withMessage('Cor inválida. Use o formato #rrggbb'),
    body('nota_layout')
      .optional({ nullable: true })
      .custom((valor) => {
        service.validarLayoutNota(valor);
        return true;
      }),
    validate,
  ],
  responder((req) => service.atualizar(req.body))
);

router.post('/logo', [authMiddleware, apenasAdmin, uploadLogo], responder((req) => service.trocarLogo(req.file)));

router.delete('/logo', [authMiddleware, apenasAdmin], responder(() => service.removerLogo()));

module.exports = router;
