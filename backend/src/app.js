require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { UPLOAD_DIR } = require('./services/storageService');

const app = express();

// ─── Segurança ──────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const REDE_LOCAL = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      // Permite requisições sem origin (Postman, apps mobile em dev, Swagger UI same-origin)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      // Em desenvolvimento, aceita qualquer IP da rede local (teste pelo celular)
      if (process.env.NODE_ENV !== 'production' && REDE_LOCAL.test(origin)) return cb(null, true);
      cb(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Rate limiting para rotas de auth (proteção contra brute-force)
app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  })
);

// ─── Body parsing ────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Swagger UI ──────────────────────────────────────
// Helmet bloqueia scripts inline do swagger-ui, então precisamos liberar
// apenas para essa rota específica
app.use(
  '/docs',
  (_req, _res, next) => {
    // Desativa CSP somente para a rota do Swagger
    _res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
    );
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Azteca OS — API Docs',
    swaggerOptions: { persistAuthorization: true },
  })
);

// Endpoint para consumir o JSON do spec (útil para ferramentas externas)
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// ─── Healthcheck ─────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Arquivos enviados (fotos e logo) ────────────────
// Helmet restringe recursos a "same-origin"; o frontend roda em outra porta
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(UPLOAD_DIR, { maxAge: '7d', index: false })
);

// ─── Rotas da API ────────────────────────────────────
app.use('/api', routes);

// ─── 404 ─────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada' }));

// ─── Tratamento global de erros ──────────────────────
app.use(errorHandler);

module.exports = app;
