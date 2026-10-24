# Operação e validação - Azteca OS

Este documento reúne a metodologia, os resultados **medidos** e as limitações das validações de segurança, integridade e desempenho. Números aqui vêm de execuções reais em `azteca_test` (máquina de desenvolvimento: Windows, 16 CPUs, 15,8 GB de RAM, PostgreSQL 18.1 local, API e gerador de carga na mesma máquina). Não são estimativas para produção: servidor, rede e dados reais mudam os valores. A única extrapolação que este documento faz está marcada como tal.

## 1. Como validar (comandos)

Todos em `backend/`, sempre sobre banco terminado em `_test` (os scripts recusam outros nomes):

| Objetivo | Comando |
| --- | --- |
| Preparar o banco de teste (aplica `DB/schema.sql`) | `npm run db:teste` |
| Povoar volume (10.012 clientes, 100.009 O.S., 450.044 itens, ~100 mil registros de histórico) | `npm run seed:carga` |
| Testes de integração (103 testes) | `npm test` |
| Planos de execução | `npm run explain` (opcional `-- --json=saida.json`) |
| Latência e concorrência (serviços direto, sem HTTP) | `npm run benchmark -- 15` |
| Carga prolongada via HTTP | `npm run soak -- --duracao=300 --usuarios=50` |
| Navegador (26 cenários) | em `frontend/`: `npx playwright test` |

Remoção dos dados criados pelos testes E2E: `node scripts/e2e-limpar.js`.

## 2. Metodologia de desempenho

- **EXPLAIN**: `scripts/explain.js` captura o SQL real gerado pelos serviços (não uma cópia escrita à mão), roda `EXPLAIN (ANALYZE, BUFFERS)` e lista índices usados e varreduras sequenciais. Executa `ANALYZE` nas tabelas antes, para estatísticas atuais.
- **Benchmark**: `scripts/benchmark.js` mede p50/p95 de cada operação (15 rodadas, após aquecimento) e depois uma mistura de operações com 10, 50 e 100 usuários simultâneos por 8 s cada nível.
- **Soak**: `scripts/soak.js` sobe a API em processo separado e envia requisições HTTP reais (mistura: 40% lista de O.S. pendentes, 15% detalhe, 15% clientes com busca, 10% busca global de O.S., 5% filtros de data/valor, 10% `/ready`, 5% criação de cliente + O.S.). A cada 10 s registra vazão, p50/p95/p99, memória (RSS) da API e conexões no PostgreSQL (`pg_stat_activity`). Ao final remove tudo que criou.
- **Limites da medição**: gerador de carga, API e banco dividem a mesma CPU; variação entre execuções é grande (ver 3.3). Use os números para comparar antes/depois na mesma máquina, não como capacidade de produção.

## 3. Resultados medidos

### 3.1 EXPLAIN (azteca_test, 100 mil O.S.)

Problema comprovado: a busca global de O.S. (`q`) usava varredura sequencial em `ordens_servico` porque um `OR` entre colunas de tabelas diferentes impede o uso de índices. A consulta foi reescrita como `os.id IN (ramo1 UNION ALL ramo2 ...)`, cada ramo usando seu índice (trigram para nome/e-mail/observações, índice de data, etc.).

| Consulta (contagem) | Antes | Depois |
| --- | --- | --- |
| `q = "silva"` | 220 ms | 14,6 ms |
| `q` = e-mail | 110 ms | 4,6 ms |
| `q` = trecho de observação | 68 ms | 5 ms |
| `q = "15/03/2025"` | 110 ms | 4,6 ms |

Contrapartida (medida): a consulta de dados de `q = "silva"` passou de 5,1 para 24,6 ms, porque a versão antiga parava cedo quando muitos registros casavam. Buscas muito amplas (que casam com grande parte da tabela) ficam mais lentas; as seletivas ficam muito mais rápidas. Caso extremo medido: `q = "1190000"` casa com 100% dos clientes sintéticos (os telefones do seed são `119` seguido de zeros à esquerda e do número do cliente), p50 de 494-555 ms (antes ~88 ms de contagem + ~11 ms de dados). Uma busca numérica seletiva (`"54321"`) tem p50 de 23,5 ms. Em dados reais, um número de 7 dígitos dificilmente casa com todos os clientes; ainda assim é um limite conhecido.

Outros planos (depois da reescrita, ms): pendentes 0,5 (dados) / 6,5 (contagem); período de entrega 0,3 / 20,8 (53 mil blocos); período de abertura 0,3 / 0,4; por cliente 0,0 / 0,2; detalhe 0,1; clientes `q = "silva"` 0,5 / 0,8 (trigram). Sem índice (varredura sequencial, medida): faixa de valor (contagem 14,2 ms) e paginação muito profunda (página 5000: 153 ms para os dados).

### 3.2 Benchmark (15 rodadas; p50 / p95 em ms; serviços chamados direto)

| Operação | p50 | p95 |
| --- | --- | --- |
| O.S. pendentes | 6,5 | 7,5 |
| O.S. todas / entregues | 4,3 / 4,3 | 4,9 / 5,3 |
| O.S. `limit=1000` (529 KB) | 9,9 | 15,6 |
| Busca `"silva"` | 22,6 | 42,2 |
| Busca por e-mail | 17,3 | 32,1 |
| Busca por observação | 18,1 | 29,5 |
| Data / período de entrega | 18,0 / 42,9 | 25,5 / 86,2 |
| Faixa de valor | 36,1 | 72,7 |
| Paginação profunda (pág. 5000) | 262,2 | 330,5 |
| Detalhe da O.S. | 5,5 | 8,7 |
| Clientes pág. 1 / busca `"silva"` | 1,6 / 3,6 | 4,0 / 7,3 |
| Cliente por telefone / CPF | 0,6 / 1,3 | 2,6 / 3,1 |

Concorrência (mistura, 8 s por nível), duas execuções distintas:

| Usuários | Execução 1 | Execução 2 |
| --- | --- | --- |
| 10 | 451 req/s, p95 115 ms | 479 req/s, p95 85 ms |
| 50 | 299 req/s, p95 344 ms | 213 req/s, p95 545 ms |
| 100 | 286 req/s, p95 794 ms | 191 req/s, p95 1.199 ms |

Erros: 0 em todas. A diferença entre execuções (até 33% de vazão) é variação real da máquina, que também executa outros processos. Uma medição anterior (840/603/506 req/s) não é comparável: a mistura não incluía a busca global de O.S. e a busca não tinha os ramos de e-mail/observações.

### 3.3 Soak (HTTP real, 50 usuários, azteca_test)

Duração real: 300 s. Requisições: 115.014 (383 req/s em média; por janela de 10 s variou de 283 a 553).

- Status: 109.224 x 200 e 5.790 x 201; **0 respostas fora de 2xx**.
- Latência geral: p50 116,5 ms, p95 276,4 ms, p99 431,1 ms, máximo 804 ms. Por operação (p95): lista pendentes 189 ms, clientes 191 ms, filtros 175 ms, detalhe 271 ms, busca global de O.S. 319 ms, criação de cliente + O.S. 504 ms.
- Memória da API (RSS): 76 MB ao iniciar; média de 155,6 MB no primeiro quarto e 157,4 MB no último; máximo 168 MB. Sem tendência de crescimento nesta janela de 5 minutos (isto **não** prova ausência de vazamento em dias de execução).
- Conexões no PostgreSQL: máximo 22 (pool de 20 da API + conexões auxiliares da sonda/teste); nenhuma espera de pool registrada como erro.
- Vazão e p95 do primeiro e do último quarto: 379 e 437 req/s; p95 de 285 e 258 ms (sem degradação ao longo do tempo).

Problema encontrado pelo soak: a limpeza final (apagar ~5.800 O.S. criadas) estourou o `statement_timeout` de 30 s e levou 204 s depois de refeita sem limite (~35 ms por O.S.). Causa: `ordem_historico.item_id` e `ordem_fotos.item_id` são chaves estrangeiras com `ON DELETE CASCADE` **sem índice**, então cada exclusão de item varria as tabelas inteiras. Medido antes da correção: 26 a 89 ms para excluir os itens de uma O.S.; depois do índice (`idx_ordem_historico_item`): 1,1 a 2,1 ms (um caso isolado de 17 ms). Isso afetava também a remoção de item pela tela, que mantém bloqueio da O.S. durante a exclusão. Um novo soak de 30 s (20 usuários) encerrou, com limpeza, em 31,8 s no total, ou seja, a limpeza deixou de ser relevante. O soak completo de 5 min **não foi repetido** depois do índice.

## 4. Schema do banco

- `DB/schema.sql` é o único arquivo de schema (idempotente). A API não altera o schema sozinha; os testes só o aplicam em bancos `*_test` e `tests/schema.test.js` valida criação em banco vazio e reexecução.
- Rodar em banco real: backup (`pg_dump`), depois `psql -d NOME_DO_BANCO -f DB/schema.sql`. Os índices trigram e de chave estrangeira são criados sem `CONCURRENTLY` (bloqueiam gravações na tabela durante a criação); em banco grande, rode fora do horário de uso.
- Índices criados anteriormente por um sistema de migrações já removido continuam no banco; a tabela `schema_migrations` ficou sem uso e pode ser apagada manualmente (`DROP TABLE schema_migrations`). O índice experimental `idx_os_numero_trgm` (busca numérica, descartado por piorar o desempenho) pode ser removido com `DROP INDEX IF EXISTS idx_os_numero_trgm`.

## 5. Retenção do histórico (sem exclusão automática)

Nada apaga histórico automaticamente. Para acompanhar o crescimento e arquivar:

- `npm run historico:relatorio`: total, registro mais antigo, tamanho (tabela + índices) e contagem por ano. Medido em azteca_test: 100.044 registros, 11,94 MB.
- `npm run historico:exportar -- --ate=AAAA-MM-DD [--saida=arquivo.csv]`: exporta em lotes por `id` (memória constante), neutraliza fórmulas de planilha (CSV injection), não sobrescreve arquivo existente e **não apaga nada**. A decisão de remover registros exportados fica com o responsável, manualmente e depois de conferir o arquivo.

## 6. Itens de segurança e integridade (estado)

- Banco: TLS com validação do certificado (`DB_SSL=true`, `DB_SSL_CA`/`DB_SSL_CA_FILE`); `rejectUnauthorized:false` deixou de ser o comportamento. Em produção, banco remoto sem `DB_SSL=true` impede a API de subir. **Não foi testado contra um servidor PostgreSQL com TLS real** (apenas lógica de montagem e testes unitários).
- Uploads: o conteúdo é validado por assinatura (bytes mágicos); imagens falsas com extensão válida são recusadas. Fotos de itens removidos são apagadas.
- Autenticação: JWT HS256 com emissor, público e versão de senha (troca de senha invalida tokens antigos); login com limite de tentativas. Contadores do rate limit são **em memória** (por instância).
- XSS: a interface usa renderização escapada do Vue; não há `v-html` com dados do usuário; CSV é neutralizado.
- Transações: criação de O.S. (cliente + itens), atualização de configurações e movimentações de item usam transação; concorrência entre atualização de item e de O.S. causava deadlock (52 de 105 respostas 5xx num teste dirigido; 0 depois de `travarOrdem` com ordem de bloqueio consistente).

## 7. Limitações e riscos remanescentes

- Nenhum teste foi feito contra S3 real, RDS ou PostgreSQL com TLS real; o driver S3 foi validado só com cliente simulado e assinatura offline.
- O pipeline de CI (`.github/workflows/ci.yml`) teve o YAML validado e os mesmos comandos executados localmente (103 testes e 26 cenários E2E em banco vazio), mas **não foi executado no GitHub**.
- O schema não foi aplicado em produção por este trabalho; o `azteca_bd` de desenvolvimento não foi tocado pelos testes (só `*_test`).
- Buscas amplas que casam com grande parte da tabela e paginação muito profunda continuam lentas (centenas de ms em 100 mil O.S.).
- Todos os usuários precisam entrar de novo após a atualização do JWT; não há logout com revogação nem refresh token.
- `PUT /configuracoes` com caractere NUL no texto ainda retorna erro 5xx (o banco recusa o byte).
- Excluir um item apaga também o histórico daquele item (`ON DELETE CASCADE`).
- URLs de `/uploads` são públicas por capacidade (nome aleatório); no modo S3 o redirecionamento também não exige login.
- Ver o plano de nuvem em [MIGRACAO_NUVEM.md](MIGRACAO_NUVEM.md).
