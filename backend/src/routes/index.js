const { Router } = require('express');
const authMiddleware = require('../middlewares/auth');
const { apenasAdmin, escritaApenasAdmin } = require('../middlewares/admin');

const authRoutes       = require('./authRoutes');
const configuracoesRoutes = require('./configuracoesRoutes');
const usuariosRoutes   = require('./usuariosRoutes');
const clientesRoutes   = require('./clientesRoutes');
const tiposObjetoRoutes = require('./tiposObjetoRoutes');
const servicosRoutes   = require('./servicosRoutes');
const ordensRoutes     = require('./ordensServicoRoutes');
const backupRoutes     = require('./backupRoutes');
const dashboardRoutes  = require('./dashboardRoutes');
const dispositivosRoutes = require('./dispositivosRoutes');

const router = Router();

// Rotas públicas
router.use('/auth', authRoutes);
// Leitura pública (logo na tela de login); alterações exigem administrador
router.use('/configuracoes', configuracoesRoutes);

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

router.use('/usuarios',    apenasAdmin, usuariosRoutes);
router.use('/clientes',    clientesRoutes);
router.use('/tipos-objeto', escritaApenasAdmin, tiposObjetoRoutes);
router.use('/servicos',    escritaApenasAdmin, servicosRoutes);
router.use('/ordens',      ordensRoutes);
router.use('/backup',      apenasAdmin, backupRoutes);
router.use('/dashboard',   apenasAdmin, dashboardRoutes);
router.use('/dispositivos', apenasAdmin, dispositivosRoutes);

module.exports = router;
