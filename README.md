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
│   └── migration_tipo_objeto_servicos.sql
├── package.json
└── README.md

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

