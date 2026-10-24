# Azteca OS

Sistema de gestão de ordens de serviço para relojoaria, com cadastro de clientes, usuários, serviços, tipos de objeto e controle completo do fluxo operacional das ordens.

## Visão geral

Este projeto foi estruturado em duas partes:

- Backend em Node.js + Express
- Frontend em Vue 3 + Vite

O sistema permite:

- autenticação de usuários com JWT
- cadastro e consulta de clientes
- gerenciamento de tipos de objeto
- cadastro de serviços e associação com tipos de objeto
- criação de ordens de serviço com múltiplos itens
- acompanhamento de estados da ordem
- consulta e manutenção dos dados por painel web

---

## Funcionalidades principais

- Cadastro de clientes com validação de telefone único
- Cadastro de usuários com senha protegida por hash
- Autenticação via JWT com expiração configurável
- Login protegido por rate limiting
- Cadastro de tipos de objeto e serviços
- Associação N:N entre tipos de objeto e serviços
- Criação de ordens de serviço com itens e observações
- Estados de OS: ENTRADA, ORCAMENTO, AUTORIZADO, PENDENTE, CONCLUIDO, CANCELADO
- Swagger para documentação da API
- Frontend para operação do sistema
- Dashboard gerencial na Administração (somente administradores), `GET /api/dashboard`
- Entrada rápida por PIN em aparelhos autorizados (celular compartilhado da loja)

### Entrada rápida por PIN (celular compartilhado)

Para um celular usado por vários funcionários: a tela de login mostra os perfis (só nome e iniciais) e cada um toca no seu e digita um PIN num teclado numérico.

1. O administrador abre **Administração → Aparelhos** no celular da loja e toca em **Autorizar este aparelho**. O navegador guarda um token do aparelho; o servidor guarda só o hash dele.
2. Em **Administração → Usuários**, define o PIN de cada funcionário. Quem não tem PIN não aparece na tela de perfis.
3. Fora de aparelhos autorizados só existe o login com usuário e senha. O link "Entrar com usuário e senha" continua disponível no próprio aparelho. "Revogar" na aba Aparelhos desativa o celular na hora (perda ou roubo).

Segurança: o PIN é guardado com HMAC (`JWT_SECRET`) + bcrypt; 5 PINs errados bloqueiam o perfil por 15 minutos (o login com senha segue funcionando; redefinir o PIN desbloqueia) e a API limita as tentativas por IP. O tamanho do PIN é `PIN_TAMANHO` (2 a 6, padrão 4). Com 2 dígitos são só 100 combinações: o bloqueio e a autorização do aparelho reduzem o risco, mas 4 dígitos é o recomendado. Trocar `PIN_TAMANHO` exige redefinir os PINs já cadastrados.

Endpoints: `GET /api/auth/perfis` e `POST /api/auth/pin` (cabeçalho `X-Dispositivo`); `GET/POST/DELETE /api/dispositivos` e `PUT/DELETE /api/usuarios/:id/pin` (administradores). Esta funcionalidade adicionou colunas em `usuarios` e a tabela `dispositivos`: aplique `DB/schema.sql` no banco existente (idempotente).

### Dashboard gerencial: critérios

- **Período**: todas as métricas partem das O.S. **criadas** no período (`ordens_servico.data_criacao`, dia final incluído). Filtros: período (hoje, 7 dias, 30 dias, mês atual, personalizado), funcionário (quem **abriu** a O.S., `usuario_id`) e serviço (O.S. com ao menos um item do serviço; nos gráficos de serviço, só itens dele).
- **Concluídas** = estados `CONCLUIDO` (Pronto) e `ENTREGUE`; **pendentes** = `ENTRADA`, `ORCAMENTO` e `EM_ANDAMENTO`; canceladas aparecem só na distribuição por status.
- **Serviços realizados / faturamento / rentáveis**: itens (`itens_ordem_servico`) em `CONCLUIDO` ou `ENTREGUE`; faturamento = soma de `valor_total` desses itens; ticket médio = faturamento ÷ O.S. distintas com item concluído.
- **Produtividade**: executor = usuário da última mudança do item para `CONCLUIDO` em `ordem_historico` (ou, na falta, `entregue_por`); serviços sem nenhum desses registros aparecem como "Sem registro do executor". O sistema não tem campo de funcionário responsável pela execução: este é o melhor registro existente.
- **Avaliação de funcionários não existe**: não há tabela de avaliações no banco, então esse indicador não foi implementado.
- Série: por dia (até 31 dias), por semana (até ~6 meses) ou por mês; períodos sem O.S. entram com zero. Toda a agregação é feita no PostgreSQL.

---

## Tecnologias

### Backend
- Node.js
- Express
- PostgreSQL
- JWT
- bcryptjs
- helmet
- cors
- express-rate-limit
- swagger-ui-express
- pg

### Frontend
- Vue 3
- Vite
- Vue Router
- Pinia
- Axios
- TailwindCSS

---

## Estrutura do projeto

```text
workflow/
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── swagger.js
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── scripts/
│   ├── .env.example
│   ├── package.json
│   └── ...
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── DB/
│   └── schema.sql        (único arquivo de schema do banco)
├── package.json
└── README.md

## Testes, carga e utilitários (backend)

Os testes e o benchmark usam um banco separado (`azteca_test`), nunca o banco de desenvolvimento.

| Comando (em `backend/`) | Função |
| --- | --- |
| `npm test` | Suíte de integração (API, schema, armazenamento, busca/filtros, concorrência, retenção) contra `azteca_test` (ou `TEST_DB_NAME`, sempre terminado em `_test`) |
| `npm run db:teste` | Cria o banco de teste e aplica `DB/schema.sql` |
| `npm run seed:carga` | Popula `azteca_test` com volume de carga (10 mil clientes, 100 mil O.S.) |
| `npm run benchmark` | Mede latência e concorrência dos endpoints principais (serviços chamados direto, sem HTTP) |
| `npm run explain` | `EXPLAIN (ANALYZE, BUFFERS)` das consultas reais das listagens; aponta varreduras sequenciais |
| `npm run soak -- --duracao=300 --usuarios=50` | Carga prolongada via HTTP (API em processo separado); mede RSS, conexões, erros e latência |
| `npm run uploads:s3` | Copia as fotos locais para o S3 (simulação por padrão; `--aplicar` envia; nunca apaga) |
| `npm run historico:relatorio` / `historico:exportar -- --ate=AAAA-MM-DD` | Relatório e exportação CSV do histórico; **nada é apagado automaticamente** |
| `node scripts/seed-usuario.js <login> "<Nome>" [ADMIN\|EDITOR]` | Cria um usuário; senha via `SEED_SENHA` ou gerada aleatoriamente. Não altera usuários existentes sem `--redefinir-senha` |

No navegador (`frontend/`): `npx playwright test` sobe uma API em `azteca_test` (porta 3100) e o Vite (5174) e executa 31 cenários de Clientes, O.S., Dashboard e PIN. O CI (`.github/workflows/ci.yml`) roda backend, build do frontend e E2E.

### Schema do banco

`DB/schema.sql` é o **único** arquivo de schema. É idempotente: roda em banco novo ou existente sem apagar dados (`psql -d NOME_DO_BANCO -f DB/schema.sql`; faça backup antes em banco com dados reais). A API nunca altera o schema sozinha; os testes só aplicam o arquivo em bancos terminados em `_test`. Para mudar o banco, edite o arquivo de forma idempotente e rode-o.

### Variáveis de ambiente (backend)

| Variável | Uso |
| --- | --- |
| `JWT_SECRET` | Obrigatório, mínimo 32 caracteres. Os tokens passaram a trazer `iss`/`aud`/versão de senha: **todos precisam fazer login de novo após esta atualização** |
| `CORS_ORIGINS` | Obrigatório em produção (origens separadas por vírgula) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexão com o PostgreSQL |
| `DB_SSL=true` | Ativa TLS com validação do certificado (obrigatório em produção para banco remoto) |
| `DB_SSL_CA` / `DB_SSL_CA_FILE` | Certificado da CA (conteúdo ou caminho) quando a CA não é pública |
| `DB_SSL_REJECT_UNAUTHORIZED=false` | Só para diagnóstico: desativa a validação (não use em produção) |
| `DB_POOL_MAX` | Conexões por instância (padrão 20); instâncias x `DB_POOL_MAX` deve caber em `max_connections` |
| `DB_STATEMENT_TIMEOUT_MS` | Padrão 30000; `0` desativa |
| `TRUST_PROXY` | Número de proxies confiáveis à frente da API (necessário atrás de Nginx/ALB para IP real e rate limit) |
| `DOCS_ENABLED` | Swagger em `/docs` (desligado por padrão em produção) |
| `STORAGE_DRIVER=local\|s3` e `S3_*` | Armazenamento das fotos (padrão local); detalhes em `backend/.env.example` |
| `RATE_LIMIT_POR_MINUTO` | Limite geral da API (o de login é separado; contadores em memória, por instância) |
| `PIN_TAMANHO` | Dígitos do PIN de entrada rápida (2 a 6, padrão 4) |

Endpoints de saúde: `GET /health` (processo vivo) e `GET /ready` (consulta o banco; 503 se falhar).

Documentos: [docs/OPERACAO_E_VALIDACAO.md](docs/OPERACAO_E_VALIDACAO.md) (metodologia, resultados medidos, retenção, limitações) e [docs/MIGRACAO_NUVEM.md](docs/MIGRACAO_NUVEM.md) (plano de migração para a nuvem; **não executado**).

Listagens (`/api/clientes`, `/api/ordens`) são paginadas no servidor (`page`, `limit` com teto de 100), com busca (`q`), filtros por coluna e `ordenarPor`/`direcao` em colunas permitidas.

Regras de negócio
1. Autenticação
O sistema usa autenticação por JWT.
A rota de login é pública.
As demais rotas exigem token válido no header Authorization.
O token é gerado com informações do usuário e expira em 8 horas por padrão.
Login com credenciais inválidas retorna erro de autenticação.
O backend aplica rate limiting na rota de login para evitar brute force.
2. Usuários
Usuário possui nome, login e senha.
A senha não é armazenada em texto puro; é armazenada em hash com bcrypt.
O login é usado como identificador de acesso.
Usuários podem ser ativados ou desativados.
A troca de senha exige a senha atual.
3. Clientes
Cliente possui nome, telefone, CPF, e-mail e informação adicional.
O telefone deve ser único no sistema.
Caso tente cadastrar um cliente com telefone já existente, a operação deve falhar.
Não é permitido excluir um cliente que tenha ordens de serviço vinculadas.
O sistema faz busca por texto, CPF e telefone.
4. Serviços
Cada serviço tem nome, valor e descrição.
O serviço pode estar ativo ou inativo.
Um serviço pode estar associado a vários tipos de objeto.
Se o serviço estiver em uso em itens de ordem, a exclusão não é imediata; ele pode ser desativado em vez de removido fisicamente.
5. Tipos de objeto
Representam categorias de objetos a serem atendidos.
Podem ser associados a vários serviços.
A relação é feita por tabela N:N.
6. Ordens de serviço
A ordem de serviço é o principal fluxo do sistema.

Estados válidos
ENTRADA
ORCAMENTO
AUTORIZADO
PENDENTE
CONCLUIDO
CANCELADO
Regras do fluxo
Estado inicial permitido: ENTRADA ou ORCAMENTO.
O sistema aceita a criação de ordem em um destes estados iniciais.
A ordem possui cliente e usuário responsável.
A ordem pode conter vários itens.
Cada item da ordem pode ter:
tipo de objeto
serviço
quantidade
valor unitário
se é orçamento
observações
foto
data e hora de entrega
A ordem também registra data de criação e atualização.
A criação de uma ordem com vários itens é feita dentro de uma transação de banco.
7. Itens da ordem
Cada item representa um serviço aplicado a um tipo de objeto dentro da ordem.
O item pode ser atualizado individualmente.
O item pode ser removido da ordem.
O valor pode ser informado por item e não necessariamente herdar do serviço.
8. Segurança
Uso de Helmet para proteção HTTP
CORS configurável por ambiente
Rate limiting na rota de login
Validação de entrada e erros centralizados
Tratamento global de exceções
Pré-requisitos
Node.js 18+ para backend
Node.js 20+ para frontend
PostgreSQL
npm

Fluxo de uso típico
Criar usuário
Fazer login
Cadastrar cliente
Cadastrar tipos de objeto
Cadastrar serviços
Associar serviços aos tipos de objeto
Criar ordem de serviço
Adicionar itens à ordem
Atualizar estado conforme o processo
Encerrar a ordem
Endpoints principais
Autenticação
POST /api/auth/login
GET /api/auth/me
Clientes
GET /api/clientes
POST /api/clientes
GET /api/clientes/:id
PUT /api/clientes/:id
DELETE /api/clientes/:id
Usuários
GET /api/usuarios
POST /api/usuarios
GET /api/usuarios/:id
PUT /api/usuarios/:id
POST /api/usuarios/:id/senha
Tipos de objeto
GET /api/tipos-objeto
POST /api/tipos-objeto
GET /api/tipos-objeto/:id
PUT /api/tipos-objeto/:id
DELETE /api/tipos-objeto/:id
Serviços
GET /api/servicos
POST /api/servicos
GET /api/servicos/:id
PUT /api/servicos/:id
DELETE /api/servicos/:id
Ordens de serviço
GET /api/ordens
POST /api/ordens
GET /api/ordens/:id
PUT /api/ordens/:id
PUT /api/ordens/:id/estado
POST /api/ordens/:id/itens
PUT /api/ordens/:id/itens/:itemId
DELETE /api/ordens/:id/itens/:itemId
Observações importantes
O sistema foi pensado para operação de oficina/relojoaria e fluxo de ordem de serviço.
O padrão de trabalho está centrado em um usuário autenticado responsável pela ordem.
O cliente pode ter relações com várias ordens, mas não pode ser removido se estiver vinculado a alguma OS.
A exclusão de serviço com itens em uso é convertida em desativação para preservar integridade.
Cada ordem pode incluir diversos itens e fotos, permitindo acompanhamento do atendimento.

Dicas de uso
Crie primeiro o usuário admin
Configure as variáveis de ambiente antes de iniciar
Execute a migration do banco antes de testar os módulos
Use a documentação Swagger para testar os endpoints com facilidade
Sempre mantenha o backend acessível antes de utilizar o frontend
Licença
Este projeto foi desenvolvido como aplicação interna de gestão de ordem de serviço. Ajustes de licença podem ser definidos conforme o uso final do cliente.

Resumo
Este projeto combina backend robusto, autenticação segura, banco relacional e frontend moderno para uma operação completa de oficina de relojoaria. O principal domínio de negócio está em torno do cliente, dos serviços, dos tipos de objeto e das ordens de serviço com workflow de acompanhamento.

