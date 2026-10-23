const multer = require('multer');
const AppError = require('../utils/AppError');
const { EXTENSOES } = require('../services/storageService');

const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSOES[file.mimetype]) return cb(null, true);
    cb(AppError.badRequest('Envie apenas imagens JPG, PNG ou WEBP'));
  },
});

// Converte erros do multer em respostas 400 amigáveis
function tratarUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') return next(AppError.badRequest('Imagem maior que 10 MB'));
      if (err.name === 'MulterError') return next(AppError.badRequest('Falha ao enviar o arquivo'));
      next(err);
    });
  };
}

module.exports = {
  uploadFotos: tratarUpload(upload.array('fotos', 10)),
  uploadLogo: tratarUpload(upload.single('logo')),
};
