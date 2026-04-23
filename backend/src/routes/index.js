const { Router } = require('express');
const authMiddleware = require('../middlewares/auth');

const authRoutes       = require('./authRoutes');
const usuariosRoutes   = require('./usuariosRoutes');
const clientesRoutes   = require('./clientesRoutes');
const tiposObjetoRoutes = require('./tiposObjetoRoutes');
const servicosRoutes   = require('./servicosRoutes');
const ordensRoutes     = require('./ordensServicoRoutes');

const router = Router();

// Rotas públicas
router.use('/auth', authRoutes);

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

router.use('/usuarios',    usuariosRoutes);
router.use('/clientes',    clientesRoutes);
router.use('/tipos-objeto', tiposObjetoRoutes);
router.use('/servicos',    servicosRoutes);
router.use('/ordens',      ordensRoutes);

module.exports = router;
