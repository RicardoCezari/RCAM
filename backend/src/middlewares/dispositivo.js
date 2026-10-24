const dispositivosService = require('../services/dispositivosService');

// Exige um aparelho autorizado pelo administrador (cabeçalho X-Dispositivo)
async function exigirDispositivo(req, _res, next) {
  try {
    req.dispositivo = await dispositivosService.validar(req.get('X-Dispositivo'));
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = exigirDispositivo;
