const { pool } = require('./database');

/*
 * Ajustes de schema idempotentes, executados na inicialização.
 * - usuarios.perfil: separa administradores de usuários comuns
 * - configuracoes: dados da empresa (nome, logo)
 * - ordem_fotos: fotos da O.S. (da O.S. inteira ou de um item específico)
 */
async function garantirSchema() {
  await pool.query(`
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil VARCHAR(20) NOT NULL DEFAULT 'EDITOR';
    ALTER TABLE usuarios ALTER COLUMN perfil SET DEFAULT 'EDITOR';
    UPDATE usuarios SET perfil = 'EDITOR' WHERE perfil NOT IN ('ADMIN', 'EDITOR');

    UPDATE usuarios SET perfil = 'ADMIN'
     WHERE id = (SELECT MIN(id) FROM usuarios)
       AND NOT EXISTS (SELECT 1 FROM usuarios WHERE perfil = 'ADMIN');

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave VARCHAR(50) PRIMARY KEY,
      valor TEXT
    );

    CREATE TABLE IF NOT EXISTS ordem_fotos (
      id           SERIAL PRIMARY KEY,
      ordem_id     INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
      item_id      INTEGER REFERENCES itens_ordem_servico(id) ON DELETE CASCADE,
      url          TEXT NOT NULL,
      data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ordem_fotos_ordem ON ordem_fotos (ordem_id);
  `);
}

module.exports = { garantirSchema };
