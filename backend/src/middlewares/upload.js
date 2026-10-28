const multer = require('multer');
const AppError = require('../utils/AppError');
const { EXTENSOES } = require('../services/storageService');

const MB = 1024 * 1024;
const LIMITE_FOTO_MB = 30; // o servidor reduz a foto antes de guardar
const LIMITE_LOGO_MB = 10;

const criarUpload = (limiteMb) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: limiteMb * MB, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSOES[file.mimetype]) return cb(null, true);
    cb(AppError.badRequest('Envie apenas imagens JPG, PNG ou WEBP'));
  },
});

// Converte erros do multer em respostas 400 amigáveis
function tratarUpload(middleware, limiteMb) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') return next(AppError.badRequest(`Imagem maior que ${limiteMb} MB`));
      if (err.name === 'MulterError') return next(AppError.badRequest('Falha ao enviar o arquivo'));
      next(err);
    });
  };
}

const uploadDeFotos = criarUpload(LIMITE_FOTO_MB);
const uploadDeLogo = criarUpload(LIMITE_LOGO_MB);

module.exports = {
  uploadFotos: tratarUpload(uploadDeFotos.array('fotos', 10), LIMITE_FOTO_MB),
  uploadLogo: tratarUpload(uploadDeLogo.single('logo'), LIMITE_LOGO_MB),
  uploadFotoUsuario: tratarUpload(uploadDeFotos.single('foto'), LIMITE_FOTO_MB),
};
