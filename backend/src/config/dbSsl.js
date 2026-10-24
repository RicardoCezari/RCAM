const fs = require('fs');

/*
 * Opções de TLS para o PostgreSQL (driver pg).
 *  - DB_SSL=true: liga o TLS e VALIDA o certificado do servidor (padrão seguro).
 *  - DB_SSL_CA (conteúdo PEM, aceita \n escapado) ou DB_SSL_CA_FILE (caminho): CA que assina o certificado
 *    (ex.: bundle do RDS/Cloud SQL, ou CA privada).
 *  - DB_SSL_REJECT_UNAUTHORIZED=false: só para diagnóstico em desenvolvimento; recusado em produção.
 * Sem DB_SSL=true o TLS fica desligado (banco local).
 */
function montarSsl(env = process.env) {
  if (env.DB_SSL !== 'true') return false;

  const rejeitar = env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
  if (!rejeitar && env.NODE_ENV === 'production') {
    throw new Error('DB_SSL_REJECT_UNAUTHORIZED=false não é permitido em produção: o certificado do banco precisa ser validado');
  }

  const ssl = { rejectUnauthorized: rejeitar };
  if (env.DB_SSL_CA) {
    ssl.ca = env.DB_SSL_CA.replace(/\\n/g, '\n');
  } else if (env.DB_SSL_CA_FILE) {
    try {
      ssl.ca = fs.readFileSync(env.DB_SSL_CA_FILE);
    } catch (err) {
      throw new Error(`DB_SSL_CA_FILE não pôde ser lido (${env.DB_SSL_CA_FILE}): ${err.code || err.message}`);
    }
  }
  return ssl;
}

module.exports = { montarSsl };
