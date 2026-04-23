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

module.exports = validate;
