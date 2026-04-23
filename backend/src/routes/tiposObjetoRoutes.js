const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/tiposObjetoController');
const validate = require('../middlewares/validate');

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Tipos de Objeto
 *   description: Categorias de objetos recebidos para serviço (relógios, anéis, etc.)
 */

/**
 * @openapi
 * /api/tipos-objeto:
 *   get:
 *     tags: [Tipos de Objeto]
 *     summary: Listar tipos de objeto
 *     responses:
 *       200:
 *         description: Lista de tipos de objeto
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TipoObjeto'
 *   post:
 *     tags: [Tipos de Objeto]
 *     summary: Criar tipo de objeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TipoObjetoInput'
 *     responses:
 *       201:
 *         description: Tipo de objeto criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TipoObjeto'
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
 * /api/tipos-objeto/{id}:
 *   get:
 *     tags: [Tipos de Objeto]
 *     summary: Buscar tipo de objeto por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tipo de objeto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TipoObjeto'
 *       404:
 *         description: Não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 *   put:
 *     tags: [Tipos de Objeto]
 *     summary: Atualizar tipo de objeto
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
 *             $ref: '#/components/schemas/TipoObjetoInput'
 *     responses:
 *       200:
 *         description: Atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TipoObjeto'
 *   delete:
 *     tags: [Tipos de Objeto]
 *     summary: Deletar tipo de objeto
 *     description: Falha com 409 se houver itens de OS vinculados a este tipo.
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
 *         description: Tipo vinculado a itens existentes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSimples'
 */
router.get('/:id', ctrl.buscarPorId);

router.post(
  '/',
  [body('nome').trim().notEmpty().withMessage('Nome é obrigatório'), validate],
  ctrl.criar
);

router.put(
  '/:id',
  [body('nome').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'), validate],
  ctrl.atualizar
);

router.delete('/:id', ctrl.deletar);

module.exports = router;
