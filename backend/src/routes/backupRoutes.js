const { Router } = require('express');
const backupService = require('../services/backupService');

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Backup
 *   description: Backup do banco e das fotos (somente administradores)
 */

/**
 * @openapi
 * /api/backup:
 *   get:
 *     tags: [Backup]
 *     summary: Situação do backup e lista de backups do banco
 *     responses:
 *       200:
 *         description: Pasta de destino, último resultado e backups existentes
 *   post:
 *     tags: [Backup]
 *     summary: Efetuar backup agora (dump do banco + cópia das fotos)
 *     responses:
 *       201:
 *         description: Backup concluído
 *       409:
 *         description: Já existe um backup em andamento
 */
router.get('/', async (_req, res, next) => {
  try {
    res.json(await backupService.listar());
  } catch (err) {
    next(err);
  }
});

router.post('/', async (_req, res, next) => {
  try {
    res.status(201).json(await backupService.executar('manual'));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/backup/{nome}/download:
 *   get:
 *     tags: [Backup]
 *     summary: Baixar o arquivo .sql de um backup do banco
 *     parameters:
 *       - in: path
 *         name: nome
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Arquivo SQL
 *       404:
 *         description: Backup não encontrado
 */
router.get('/:nome/download', (req, res, next) => {
  try {
    res.download(backupService.caminhoDoBackup(req.params.nome), req.params.nome);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
