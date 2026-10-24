require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { pool } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const storage = require('./services/storageService');

const app = express();

// Atrás de proxy/balanceador (nuvem), informe quantos saltos são confiáveis (ex.: TRUST_PROXY=1);
// sem isso o rate limit enxerga o IP do proxy e não o do cliente. Evite TRUST_PROXY=true (aceita X-Forwarded-For forjado).
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(v) ? Number(v) : v === 'true' ? true : v === 'false' ? false : v);
}

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

// Compressão das respostas JSON (listas grandes caem para uma fração do tamanho)
app.use(compression());

// Limite geral por IP: protege a API contra excesso de requisições (generoso para uso interno normal)
if (process.env.NODE_ENV !== 'test') {
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: Number(process.env.RATE_LIMIT_POR_MINUTO) || 600,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Muitas requisições. Tente novamente em instantes.' },
    })
  );
}

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

// Login por PIN: só conta tentativas que falham (o bloqueio por perfil fica no banco, em authRepository)
app.use(
  '/api/auth/pin',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas tentativas de PIN. Aguarde 15 minutos.' },
  })
);

// Reconfirmação da senha de quem já está logado ("esqueci o PIN"): só conta tentativas que falham
app.use(
  '/api/auth/senha',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas tentativas de senha. Aguarde 15 minutos.' },
  })
);

// ─── Body parsing ────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Swagger UI ──────────────────────────────────────
// Em produção a documentação fica desligada por padrão (DOCS_ENABLED=true para ligar).
const docsAtivo = process.env.DOCS_ENABLED
  ? process.env.DOCS_ENABLED === 'true'
  : process.env.NODE_ENV !== 'production';

if (docsAtivo) {
  // Helmet bloqueia scripts inline do swagger-ui, então precisamos liberar apenas para essa rota
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
      customSiteTitle: 'API Docs — Ordens de Serviço',
      swaggerOptions: { persistAuthorization: true },
    })
  );

  // Endpoint para consumir o JSON do spec (útil para ferramentas externas)
  app.get('/docs.json', (_req, res) => res.json(swaggerSpec));
}

// ─── Healthcheck ─────────────────────────────────────
// /health: o processo está vivo (liveness). /ready: também consegue falar com o banco (readiness).
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', banco: 'ok', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'indisponivel', banco: 'falha' });
  }
});

// ─── Arquivos enviados (fotos e logo) ────────────────
// Helmet restringe recursos a "same-origin"; o frontend roda em outra porta
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  storage.middlewareUploads()
);

// ─── Rotas da API ────────────────────────────────────
app.use('/api', routes);

// ─── 404 ─────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada' }));

// ─── Tratamento global de erros ──────────────────────
app.use(errorHandler);

module.exports = app;
