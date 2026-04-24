-- Migration: Tabela pivô para relacionamento N:N entre tipos_objeto e servicos
-- Execute este script no banco azteca_os antes de iniciar o backend.

CREATE TABLE IF NOT EXISTS tipo_objeto_servicos (
  tipo_objeto_id INTEGER NOT NULL REFERENCES tipos_objeto(id) ON DELETE CASCADE,
  servico_id     INTEGER NOT NULL REFERENCES servicos(id)     ON DELETE CASCADE,
  PRIMARY KEY (tipo_objeto_id, servico_id)
);

CREATE INDEX IF NOT EXISTS idx_tos_tipo_objeto ON tipo_objeto_servicos(tipo_objeto_id);
CREATE INDEX IF NOT EXISTS idx_tos_servico     ON tipo_objeto_servicos(servico_id);
