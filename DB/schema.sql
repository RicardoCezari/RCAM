-- =============================================================================
-- Azteca O.S. - Schema do banco (PostgreSQL). UNICO arquivo de schema do projeto.
--
-- Uso:  psql -d NOME_DO_BANCO -f DB/schema.sql
-- Idempotente: pode ser executado de novo em banco novo ou existente, sem apagar dados.
-- A API nunca executa este arquivo sozinha; os testes o aplicam apenas em bancos *_test.
--
-- Ao mudar o banco, edite ESTE arquivo (de forma idempotente: IF NOT EXISTS, CREATE OR REPLACE)
-- e rode-o no banco desejado. Faca backup antes de rodar em banco com dados reais.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Usuarios
--   perfil: ADMIN  -> acesso total (servicos, tipos de objeto, administracao)
--           EDITOR -> nova O.S., listar clientes e listar O.S.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id               SERIAL PRIMARY KEY,
  nome             VARCHAR(150) NOT NULL,
  login            VARCHAR(100) NOT NULL UNIQUE,
  senha            VARCHAR(255),
  ativo            BOOLEAN   DEFAULT TRUE,
  data_criacao     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  perfil           VARCHAR(20) NOT NULL DEFAULT 'EDITOR'
);

-- Entrada rapida por PIN (somente em aparelhos autorizados, ver tabela dispositivos).
--   pin_hash: HMAC do PIN com o segredo da API + bcrypt (nunca o PIN em texto)
--   pin_tentativas / pin_bloqueado_ate: bloqueio temporario apos erros seguidos
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin_hash          VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin_tentativas    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin_bloqueado_ate TIMESTAMPTZ;

-- Foto de perfil (opcional): caminho "/uploads/usuarios/<arquivo>"
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500);


-- -----------------------------------------------------------------------------
-- Aparelhos autorizados (ex.: o celular compartilhado da loja)
--   Somente um aparelho autorizado pelo administrador mostra a lista de perfis e aceita login por PIN.
--   O token fica no aparelho; aqui guarda-se apenas o SHA-256 dele. Revogar = apagar a linha.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispositivos (
  id           SERIAL PRIMARY KEY,
  nome         VARCHAR(80) NOT NULL,
  token_hash   CHAR(64)    NOT NULL UNIQUE,
  criado_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_uso   TIMESTAMP
);


-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id                   SERIAL PRIMARY KEY,
  nome                 VARCHAR(200) NOT NULL,
  telefone             VARCHAR(20)  NOT NULL UNIQUE,
  cpf                  VARCHAR(11)  UNIQUE,
  email                VARCHAR(150),
  informacao_adicional TEXT,
  data_criacao         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Telefone somente com digitos (coluna gerada; nao altera o dado original)
  telefone_digitos     VARCHAR(20) GENERATED ALWAYS AS (regexp_replace(telefone, '[^0-9]', '', 'g')) STORED
);

CREATE INDEX IF NOT EXISTS idx_cliente_nome ON clientes (nome);

-- Unicidade do telefone independente da formatacao. Se ja houver duplicados, cria apenas indice comum.
DO $$
BEGIN
  IF to_regclass('public.uq_clientes_telefone_digitos') IS NOT NULL THEN
    NULL;
  ELSIF NOT EXISTS (SELECT 1 FROM clientes GROUP BY telefone_digitos HAVING COUNT(*) > 1) THEN
    CREATE UNIQUE INDEX uq_clientes_telefone_digitos ON clientes (telefone_digitos);
  ELSE
    RAISE WARNING 'clientes com telefones duplicados (mesmos digitos): indice unico nao criado';
    CREATE INDEX IF NOT EXISTS idx_clientes_telefone_digitos ON clientes (telefone_digitos);
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- Tipos de objeto, servicos e relacao N:N entre eles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tipos_objeto (
  id           SERIAL PRIMARY KEY,
  nome         VARCHAR(100) NOT NULL UNIQUE,
  descricao    TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicos (
  id           SERIAL PRIMARY KEY,
  nome         VARCHAR(150)  NOT NULL UNIQUE,
  valor        NUMERIC(10,2) NOT NULL,
  descricao    TEXT,
  ativo        BOOLEAN   DEFAULT TRUE,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_servico_ativo ON servicos (ativo);
CREATE INDEX IF NOT EXISTS idx_servico_nome  ON servicos (nome);

CREATE TABLE IF NOT EXISTS tipo_objeto_servicos (
  tipo_objeto_id INTEGER NOT NULL REFERENCES tipos_objeto(id) ON DELETE CASCADE,
  servico_id     INTEGER NOT NULL REFERENCES servicos(id)     ON DELETE CASCADE,
  valor          NUMERIC(10,2),  -- preco do servico por tipo de objeto (NULL = usa o valor padrao do servico)
  PRIMARY KEY (tipo_objeto_id, servico_id)
);

CREATE INDEX IF NOT EXISTS idx_tos_tipo_objeto ON tipo_objeto_servicos (tipo_objeto_id);
CREATE INDEX IF NOT EXISTS idx_tos_servico     ON tipo_objeto_servicos (servico_id);


-- -----------------------------------------------------------------------------
-- Ordens de servico
--   estado: ENTRADA | ORCAMENTO | EM_ANDAMENTO | CANCELADO | CONCLUIDO (pronto) | ENTREGUE
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS ordens_servico_numero_seq;

CREATE TABLE IF NOT EXISTS ordens_servico (
  id               SERIAL PRIMARY KEY,
  numero           INTEGER NOT NULL UNIQUE DEFAULT nextval('ordens_servico_numero_seq'),
  cliente_id       INTEGER NOT NULL REFERENCES clientes(id),
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id),
  data_criacao     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_entrega     DATE NOT NULL,
  hora_entrega     TIME,
  valor_total      NUMERIC(10,2) DEFAULT 0,
  valor_orcamento  NUMERIC(10,2) DEFAULT 0,
  estado           VARCHAR(50) DEFAULT 'ENTRADA',
  observacoes      TEXT,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_entregue    TIMESTAMP,
  entregue_por     INTEGER REFERENCES usuarios(id),
  CONSTRAINT ordens_servico_estado_check
    CHECK (estado IN ('ENTRADA', 'ORCAMENTO', 'EM_ANDAMENTO', 'CANCELADO', 'CONCLUIDO', 'ENTREGUE'))
);

ALTER SEQUENCE ordens_servico_numero_seq OWNED BY ordens_servico.numero;

CREATE INDEX IF NOT EXISTS idx_os_cliente         ON ordens_servico (cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_usuario         ON ordens_servico (usuario_id);
CREATE INDEX IF NOT EXISTS idx_os_numero          ON ordens_servico (numero);
CREATE INDEX IF NOT EXISTS idx_os_estado          ON ordens_servico (estado);
CREATE INDEX IF NOT EXISTS idx_os_entrega         ON ordens_servico (data_entrega);
CREATE INDEX IF NOT EXISTS idx_os_entrega_estado  ON ordens_servico (data_entrega, estado);
CREATE INDEX IF NOT EXISTS idx_os_usuario_estado  ON ordens_servico (usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_os_criacao         ON ordens_servico (data_criacao DESC, id DESC);


-- -----------------------------------------------------------------------------
-- Itens da ordem de servico
--   estado: CADASTRADO (entrada) | ORCAMENTO (ligar p/ cliente) | AUTORIZADO | EM_ANDAMENTO | CANCELADO | CONCLUIDO (pronto) | ENTREGUE
--   eh_orcamento acompanha o estado: TRUE somente quando estado = ORCAMENTO
--   valor_total e calculado (quantidade x valor_unitario)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itens_ordem_servico (
  id             SERIAL PRIMARY KEY,
  ordem_id       INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo_objeto_id INTEGER NOT NULL REFERENCES tipos_objeto(id),
  servico_id     INTEGER NOT NULL REFERENCES servicos(id),
  quantidade     INTEGER DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total    NUMERIC(10,2) GENERATED ALWAYS AS (quantidade::numeric * valor_unitario) STORED,
  eh_orcamento   BOOLEAN DEFAULT FALSE,
  estado         VARCHAR(20) DEFAULT 'CADASTRADO',
  objeto_indice  INTEGER DEFAULT 1,
  data_entrega   DATE,
  hora_entrega   TIME,
  foto_url       VARCHAR(500),
  observacoes    TEXT,
  data_criacao   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_entregue  TIMESTAMP,
  entregue_por   INTEGER REFERENCES usuarios(id),
  CONSTRAINT itens_ordem_servico_estado_check
    CHECK (estado IN ('CADASTRADO', 'ORCAMENTO', 'AUTORIZADO', 'EM_ANDAMENTO', 'CANCELADO', 'CONCLUIDO', 'ENTREGUE')),
  CONSTRAINT itens_ordem_servico_quantidade_check
    CHECK (quantidade >= 1 AND quantidade <= 10),
  CONSTRAINT itens_valor_unitario_check
    CHECK ((eh_orcamento = FALSE AND valor_unitario > 0) OR (eh_orcamento = TRUE AND valor_unitario >= 0))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'itens_ordem_servico' AND column_name = 'objeto_indice'
  ) THEN
    ALTER TABLE itens_ordem_servico ADD COLUMN objeto_indice INTEGER DEFAULT 1;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_ordem        ON itens_ordem_servico (ordem_id);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'itens_ordem_servico' AND column_name = 'objeto_indice'
  ) THEN
    ALTER TABLE itens_ordem_servico ADD COLUMN objeto_indice INTEGER DEFAULT 1;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_ordem_objeto ON itens_ordem_servico (ordem_id, objeto_indice);
CREATE INDEX IF NOT EXISTS idx_items_objeto       ON itens_ordem_servico (tipo_objeto_id);
CREATE INDEX IF NOT EXISTS idx_items_servico      ON itens_ordem_servico (servico_id);
CREATE INDEX IF NOT EXISTS idx_items_estado       ON itens_ordem_servico (estado);
CREATE INDEX IF NOT EXISTS idx_items_eh_orcamento ON itens_ordem_servico (eh_orcamento);
CREATE INDEX IF NOT EXISTS idx_items_entrega      ON itens_ordem_servico (data_entrega, hora_entrega);




-- -----------------------------------------------------------------------------
-- Fotos da O.S. (item_id nulo = foto geral da O.S.; preenchido = foto do objeto)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ordem_fotos (
  id           SERIAL PRIMARY KEY,
  ordem_id     INTEGER NOT NULL REFERENCES ordens_servico(id)     ON DELETE CASCADE,
  item_id      INTEGER REFERENCES itens_ordem_servico(id)         ON DELETE CASCADE,
  url          TEXT NOT NULL,
  etapa        VARCHAR(10) NOT NULL DEFAULT 'ENTRADA',  -- ENTRADA | ENTREGA
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ordem_fotos_ordem ON ordem_fotos (ordem_id);
-- item_id e FK com ON DELETE CASCADE: sem indice, cada exclusao de item varre a tabela inteira
CREATE INDEX IF NOT EXISTS idx_ordem_fotos_item  ON ordem_fotos (item_id) WHERE item_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- Historico de mudancas de estado (item_id nulo = mudanca da O.S. inteira)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ordem_historico (
  id              SERIAL PRIMARY KEY,
  ordem_id        INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  item_id         INTEGER REFERENCES itens_ordem_servico(id)     ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_novo     VARCHAR(50) NOT NULL,
  usuario_id      INTEGER REFERENCES usuarios(id),
  observacao      TEXT,
  data_mudanca    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ordem_historico_ordem ON ordem_historico (ordem_id, data_mudanca);
CREATE INDEX IF NOT EXISTS idx_ordem_historico_item  ON ordem_historico (item_id) WHERE item_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- Configuracoes da empresa (chaves: empresa_nome, empresa_cnpj, empresa_endereco, empresa_numero, empresa_complemento, empresa_bairro,
-- empresa_telefone, empresa_whatsapp,
-- empresa_instagram, nota_mensagem, logo_url, tema_cor)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracoes (
  chave VARCHAR(50) PRIMARY KEY,
  valor TEXT
);


-- -----------------------------------------------------------------------------
-- Busca por texto (ILIKE '%x%') com indices trigram. Exige a extensao pg_trgm (se o usuario do banco nao
-- puder cria-la, o bloco apenas avisa e as buscas continuam funcionando, so que mais lentas).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS idx_clientes_nome_trgm     ON clientes USING gin (nome gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_clientes_telefone_trgm ON clientes USING gin (telefone_digitos gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_clientes_cpf_trgm      ON clientes USING gin (cpf gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_clientes_email_trgm    ON clientes USING gin (email gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_clientes_info_trgm     ON clientes USING gin (informacao_adicional gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_os_observacoes_trgm    ON ordens_servico USING gin (observacoes gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'indices trigram nao criados: %', SQLERRM;
END $$;


-- -----------------------------------------------------------------------------
-- Funcoes e triggers dos itens
-- -----------------------------------------------------------------------------

-- Se a data/hora de entrega do item nao for informada, usa a da O.S.
CREATE OR REPLACE FUNCTION itens_default_data_entrega_from_ordem()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.data_entrega IS NULL THEN
    SELECT data_entrega INTO NEW.data_entrega FROM ordens_servico WHERE id = NEW.ordem_id;
  END IF;

  IF NEW.hora_entrega IS NULL THEN
    SELECT hora_entrega INTO NEW.hora_entrega FROM ordens_servico WHERE id = NEW.ordem_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Se o valor unitario for 0/nulo, usa o preco do servico para o tipo de objeto (ou o valor padrao do servico)
CREATE OR REPLACE FUNCTION itens_set_valor_unitario_from_servico()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.valor_unitario IS NULL OR NEW.valor_unitario = 0 THEN
    SELECT COALESCE(tos.valor, s.valor) INTO NEW.valor_unitario
      FROM servicos s
      LEFT JOIN tipo_objeto_servicos tos
             ON tos.servico_id = s.id AND tos.tipo_objeto_id = NEW.tipo_objeto_id
     WHERE s.id = NEW.servico_id;

    IF NEW.valor_unitario IS NULL THEN
      RAISE EXCEPTION 'Servico ID % nao encontrado ou sem valor padrao', NEW.servico_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recalcula os totais da O.S. (valor_total = itens fora de orcamento; valor_orcamento = itens em orcamento; cancelados nao entram)
CREATE OR REPLACE FUNCTION recompute_ordem_totais()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  sum_nao_orcamento NUMERIC(12,2);
  sum_orcamento     NUMERIC(12,2);
  target_ordem      INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_ordem := OLD.ordem_id;
  ELSE
    target_ordem := NEW.ordem_id;
  END IF;

  SELECT COALESCE(SUM(valor_total), 0) INTO sum_nao_orcamento
    FROM itens_ordem_servico WHERE ordem_id = target_ordem AND eh_orcamento = FALSE AND estado <> 'CANCELADO';

  SELECT COALESCE(SUM(valor_total), 0) INTO sum_orcamento
    FROM itens_ordem_servico WHERE ordem_id = target_ordem AND eh_orcamento = TRUE AND estado <> 'CANCELADO';

  UPDATE ordens_servico
     SET valor_total      = sum_nao_orcamento,
         valor_orcamento  = sum_orcamento,
         data_atualizacao = CURRENT_TIMESTAMP
   WHERE id = target_ordem;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_itens_default_data_entrega ON itens_ordem_servico;
CREATE TRIGGER trg_itens_default_data_entrega
  BEFORE INSERT ON itens_ordem_servico
  FOR EACH ROW EXECUTE FUNCTION itens_default_data_entrega_from_ordem();

DROP TRIGGER IF EXISTS trg_itens_set_valor_unitario ON itens_ordem_servico;
CREATE TRIGGER trg_itens_set_valor_unitario
  BEFORE INSERT OR UPDATE ON itens_ordem_servico
  FOR EACH ROW EXECUTE FUNCTION itens_set_valor_unitario_from_servico();

DROP TRIGGER IF EXISTS trg_itens_recompute_totals_ins ON itens_ordem_servico;
CREATE TRIGGER trg_itens_recompute_totals_ins
  AFTER INSERT ON itens_ordem_servico
  FOR EACH ROW EXECUTE FUNCTION recompute_ordem_totais();

DROP TRIGGER IF EXISTS trg_itens_recompute_totals_upd ON itens_ordem_servico;
CREATE TRIGGER trg_itens_recompute_totals_upd
  AFTER UPDATE ON itens_ordem_servico
  FOR EACH ROW EXECUTE FUNCTION recompute_ordem_totais();

DROP TRIGGER IF EXISTS trg_itens_recompute_totals_del ON itens_ordem_servico;
CREATE TRIGGER trg_itens_recompute_totals_del
  AFTER DELETE ON itens_ordem_servico
  FOR EACH ROW EXECUTE FUNCTION recompute_ordem_totais();


-- -----------------------------------------------------------------------------
-- Perfis de acesso (consultas uteis)
-- -----------------------------------------------------------------------------
-- UPDATE usuarios SET perfil = 'ADMIN'  WHERE login = 'fulano';
-- UPDATE usuarios SET perfil = 'EDITOR' WHERE login = 'fulano';
