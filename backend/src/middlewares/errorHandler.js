const AppError = require('../utils/AppError');

// Mapeia erros do PostgreSQL para mensagens amigáveis
function pgErrorMessage(err) {
  switch (err.code) {
    case '23505': {
      // unique_violation
      const detail = err.detail || '';
      if (detail.includes('telefone')) return 'Telefone já cadastrado';
      if (detail.includes('cpf')) return 'CPF já cadastrado';
      if (detail.includes('login')) return 'Login já está em uso';
      if (detail.includes('nome')) return 'Nome já cadastrado';
      return 'Registro duplicado';
    }
    case '23503':
      return 'Referência inválida: registro relacionado não existe';
    case '23502':
      return 'Campo obrigatório não informado';
    case '23514':
      return `Valor fora dos limites permitidos: ${err.constraint || ''}`;
    case '22001':
      return 'Valor muito longo para o campo';
    default:
      return null;
  }
}

function errorHandler(err, req, res, _next) {
  // Erros operacionais (AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Erros do PostgreSQL
  const pgMsg = pgErrorMessage(err);
  if (pgMsg) {
    return res.status(409).json({ message: pgMsg });
  }

  // Erros de validação do express-validator (chamados via validationResult)
  if (err.type === 'validation') {
    return res.status(422).json({ message: 'Dados inválidos', errors: err.errors });
  }

  // Erros inesperados - não vaza detalhes em produção
  console.error('[ERROR]', err);

  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ message: 'Erro interno no servidor' });
  }

  return res.status(500).json({ message: err.message, stack: err.stack });
}

module.exports = errorHandler;
