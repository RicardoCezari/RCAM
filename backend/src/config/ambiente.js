/*
 * Validação das variáveis de ambiente na inicialização.
 * Retorna { erros, avisos }: erros impedem a API de subir; avisos são só registrados.
 */
function validarAmbiente(env = process.env) {
  const erros = [];
  const avisos = [];
  const producao = env.NODE_ENV === 'production';

  if ((env.JWT_SECRET || '').length < 32) {
    erros.push('JWT_SECRET ausente ou curto demais (mínimo de 32 caracteres)');
  }
  const driver = (env.STORAGE_DRIVER || 'local').toLowerCase();
  if (!['local', 's3'].includes(driver)) erros.push(`STORAGE_DRIVER "${driver}" inválido (local ou s3)`);
  if (driver === 's3' && !env.S3_BUCKET) erros.push('STORAGE_DRIVER=s3 exige S3_BUCKET');

  if (producao) {
    if (!env.CORS_ORIGINS) erros.push('CORS_ORIGINS deve listar as origens do frontend em produção');
    if (env.JWT_SECRET && /troque|exemplo|changeme|secret/i.test(env.JWT_SECRET)) {
      erros.push('JWT_SECRET parece um valor de exemplo; gere um segredo aleatório');
    }
    const bancoRemoto = env.DB_HOST && !['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST);
    if (bancoRemoto && env.DB_SSL !== 'true') {
      erros.push('DB_SSL deve estar ativo ao usar um banco remoto em produção');
    }
    if (!env.TRUST_PROXY) {
      avisos.push('TRUST_PROXY não definido: atrás de balanceador o rate limit verá o IP do proxy');
    }
    if (env.STORAGE_DRIVER !== 's3') {
      avisos.push('Fotos em disco local: com mais de uma instância use STORAGE_DRIVER=s3');
    }
  }

  return { erros, avisos };
}

module.exports = { validarAmbiente };
