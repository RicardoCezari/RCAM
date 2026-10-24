const { validationResult } = require('express-validator');

function validate(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const err = new Error('Dados inválidos');
    err.type = 'validation';
    err.errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(err);
  }
  next();
}

const INT_MAX = 2147483647; // limite do tipo INTEGER do PostgreSQL

// Uso: router.param('id', validarIdParam). Rejeita ids não numéricos ou fora do intervalo do INTEGER
// com 422, em vez de deixar o PostgreSQL falhar (erro 500).
function validarIdParam(_req, _res, next, valor, nome) {
  const numero = Number(valor);
  if (!/^\d{1,10}$/.test(valor) || numero < 1 || numero > INT_MAX) {
    const err = new Error('Dados inválidos');
    err.type = 'validation';
    err.errors = [{ field: nome, message: `${nome} inválido` }];
    return next(err);
  }
  next();
}

module.exports = validate;
module.exports.validarIdParam = validarIdParam;
