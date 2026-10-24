/*
 * Gera dados sintéticos no banco de TESTE para medir desempenho.
 * Uso: node scripts/seed-carga.js [clientes=10000] [ordens=100000]
 * Recusa-se a rodar fora de um banco que termine em _test.
 */
const bcrypt = require('bcryptjs');
process.env.DB_STATEMENT_TIMEOUT_MS = '0'; // cargas em lote podem passar do limite padrão de 30 s
const { prepararBancoDeTeste, NOME_BANCO_TESTE } = require('./teste-db');

const NUM_CLIENTES = Number(process.argv[2]) || 10000;
const NUM_ORDENS = Number(process.argv[3]) || 100000;

async function main() {
  const pool = await prepararBancoDeTeste();
  const t0 = Date.now();
  const passo = async (nome, sql, params) => {
    const t = Date.now();
    const r = await pool.query(sql, params);
    console.log(`  ${nome}: ${r.rowCount ?? ''} linhas em ${Date.now() - t} ms`);
  };

  const { rows: [{ n }] } = await pool.query('SELECT COUNT(*)::int AS n FROM ordens_servico');
  if (n > 0) {
    console.log(`[SEED] ${NOME_BANCO_TESTE} já possui ${n} ordens. Nada a fazer (apague o banco para recriar).`);
    return pool.end();
  }

  console.log(`[SEED] Gerando ${NUM_CLIENTES} clientes e ${NUM_ORDENS} ordens em ${NOME_BANCO_TESTE}...`);
  const hash = await bcrypt.hash('teste123', 4);

  await passo('usuarios',
    `INSERT INTO usuarios (nome, login, senha, ativo, perfil)
     SELECT 'Usuario ' || g, 'user' || g, $1, TRUE, CASE WHEN g = 1 THEN 'ADMIN' ELSE 'EDITOR' END
       FROM generate_series(1, 5) g
     ON CONFLICT (login) DO NOTHING`, [hash]);

  await passo('tipos_objeto',
    `INSERT INTO tipos_objeto (nome) SELECT 'Tipo ' || g FROM generate_series(1, 12) g ON CONFLICT DO NOTHING`);
  await passo('servicos',
    `INSERT INTO servicos (nome, valor) SELECT 'Servico ' || g, 20 + g * 5 FROM generate_series(1, 30) g ON CONFLICT DO NOTHING`);
  await passo('tipo_objeto_servicos',
    `INSERT INTO tipo_objeto_servicos (tipo_objeto_id, servico_id)
     SELECT t.id, s.id FROM tipos_objeto t CROSS JOIN servicos s ON CONFLICT DO NOTHING`);

  await passo('clientes',
    `INSERT INTO clientes (nome, telefone, cpf, email)
     SELECT (ARRAY['Ana','Bruno','Carlos','Daniela','Eduardo','Fernanda','Gustavo','Helena','Igor','Julia',
                   'Kleber','Larissa','Marcos','Natalia','Otavio','Patricia','Rafael','Sandra','Thiago','Vanessa'])[1 + g % 20]
            || ' ' ||
            (ARRAY['Silva','Santos','Oliveira','Souza','Lima','Pereira','Costa','Ribeiro','Almeida','Carvalho',
                   'Gomes','Martins','Rocha','Dias','Nunes'])[1 + (g / 20) % 15]
            || ' ' || g,
            CASE WHEN g % 2 = 0 THEN '119' || lpad(g::text, 8, '0')
                 ELSE '(11) 9' || substr(lpad(g::text, 8, '0'), 1, 4) || '-' || substr(lpad(g::text, 8, '0'), 5, 4) END,
            CASE WHEN g % 5 = 0 THEN NULL ELSE lpad(g::text, 11, '0') END,
            NULL
       FROM generate_series(1, $1::int) g`, [NUM_CLIENTES]);

  await pool.query('ALTER TABLE itens_ordem_servico DISABLE TRIGGER USER');

  await passo('ordens_servico',
    `INSERT INTO ordens_servico (cliente_id, usuario_id, estado, data_criacao, data_entrega, hora_entrega)
     SELECT 1 + (g * 7919) % $1::int,
            (SELECT MIN(id) FROM usuarios WHERE login LIKE 'user%') + (g % 5),
            CASE WHEN g % 100 < 85 THEN 'ENTREGUE'
                 WHEN g % 100 < 90 THEN 'CANCELADO'
                 WHEN g % 100 < 94 THEN 'ENTRADA'
                 WHEN g % 100 < 96 THEN 'ORCAMENTO'
                 WHEN g % 100 < 98 THEN 'EM_ANDAMENTO'
                 ELSE 'CONCLUIDO' END,
            NOW() - (g::numeric / $2::numeric) * INTERVAL '3 years',
            (NOW() - (g::numeric / $2::numeric) * INTERVAL '3 years' + INTERVAL '7 days')::date,
            '15:00'
       FROM generate_series(1, $2::int) g`, [NUM_CLIENTES, NUM_ORDENS]);

  await passo('itens_ordem_servico',
    `INSERT INTO itens_ordem_servico (ordem_id, tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, estado, data_entrega, hora_entrega)
     SELECT os.id,
            tp.ids[1 + (os.id + k) % array_length(tp.ids, 1)],
            sv.ids[1 + (os.id * 3 + k) % array_length(sv.ids, 1)],
            1 + k % 3,
            20 + (os.id + k * 13) % 200,
            os.estado = 'ORCAMENTO',
            CASE os.estado WHEN 'ENTRADA' THEN 'CADASTRADO' ELSE os.estado END,
            os.data_entrega, os.hora_entrega
       FROM ordens_servico os
      CROSS JOIN (SELECT array_agg(id ORDER BY id) AS ids FROM tipos_objeto) tp
      CROSS JOIN (SELECT array_agg(id ORDER BY id) AS ids FROM servicos) sv
      CROSS JOIN LATERAL generate_series(1, 1 + os.id % 8) k`);

  await passo('ordem_fotos',
    `INSERT INTO ordem_fotos (ordem_id, item_id, url, etapa)
     SELECT i.ordem_id, CASE WHEN i.id % 3 = 0 THEN NULL ELSE i.id END, '/uploads/teste-' || i.id || '.jpg', 'ENTRADA'
       FROM itens_ordem_servico i WHERE i.id % 4 = 0`);

  await passo('ordem_historico',
    `INSERT INTO ordem_historico (ordem_id, estado_anterior, estado_novo, usuario_id, data_mudanca)
     SELECT os.id, 'ENTRADA', os.estado, os.usuario_id, os.data_criacao + INTERVAL '1 day' FROM ordens_servico os`);

  await pool.query('ALTER TABLE itens_ordem_servico ENABLE TRIGGER USER');

  await passo('totais das ordens',
    `UPDATE ordens_servico os
        SET valor_total = COALESCE(t.nao_orc, 0), valor_orcamento = COALESCE(t.orc, 0)
       FROM (SELECT ordem_id,
                    SUM(valor_total) FILTER (WHERE NOT eh_orcamento AND estado <> 'CANCELADO') AS nao_orc,
                    SUM(valor_total) FILTER (WHERE eh_orcamento AND estado <> 'CANCELADO') AS orc
               FROM itens_ordem_servico GROUP BY ordem_id) t
      WHERE t.ordem_id = os.id`);

  await pool.query('ANALYZE');
  console.log(`[SEED] Concluído em ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
  await pool.end();
}

main().catch((err) => {
  console.error('[SEED] Falha:', err.message);
  process.exit(1);
});
