const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Azteca OS API',
      version: '1.0.0',
      description: 'API do sistema de ordens de serviço para relojoaria **Azteca OS**.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desenvolvimento local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Informe o token retornado pelo endpoint **/api/auth/login**',
        },
      },
      schemas: {
        // ── Auth ──────────────────────────────────────────────
        LoginInput: {
          type: 'object',
          required: ['login', 'senha'],
          properties: {
            login: { type: 'string', example: 'ricardo' },
            senha: { type: 'string', format: 'password', example: 'minhasenha123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            usuario: { $ref: '#/components/schemas/UsuarioResumo' },
          },
        },
        // ── Usuarios ──────────────────────────────────────────
        UsuarioResumo: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 4 },
            nome: { type: 'string', example: 'Ricardo' },
            login: { type: 'string', example: 'ricardo' },
          },
        },
        Usuario: {
          allOf: [
            { $ref: '#/components/schemas/UsuarioResumo' },
            {
              type: 'object',
              properties: {
                ativo: { type: 'boolean', example: true },
                data_criacao: { type: 'string', format: 'date-time' },
              },
            },
          ],
        },
        UsuarioInput: {
          type: 'object',
          required: ['nome', 'login', 'senha'],
          properties: {
            nome: { type: 'string', example: 'Novo Funcionário' },
            login: { type: 'string', example: 'funcionario' },
            senha: { type: 'string', format: 'password', example: 'senha123' },
            ativo: { type: 'boolean', default: true },
          },
        },
        // ── Clientes ──────────────────────────────────────────
        Cliente: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nome: { type: 'string', example: 'Carlos Oliveira' },
            telefone: { type: 'string', example: '(11) 98765-4321' },
            cpf: { type: 'string', nullable: true, example: '12345678901' },
            email: { type: 'string', nullable: true, example: 'carlos@email.com' },
            informacao_adicional: { type: 'string', nullable: true, example: 'Cliente VIP' },
            data_criacao: { type: 'string', format: 'date-time' },
          },
        },
        ClienteInput: {
          type: 'object',
          required: ['nome', 'telefone'],
          properties: {
            nome: { type: 'string', example: 'Carlos Oliveira' },
            telefone: { type: 'string', example: '(11) 98765-4321' },
            cpf: { type: 'string', nullable: true, example: '12345678901' },
            email: { type: 'string', nullable: true, example: 'carlos@email.com' },
            informacao_adicional: { type: 'string', nullable: true },
          },
        },
        ListaClientes: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Cliente' } },
            total: { type: 'integer', example: 42 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
          },
        },
        // ── Tipos de Objeto ────────────────────────────────────
        TipoObjeto: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nome: { type: 'string', example: 'Relógio de Pulso' },
            descricao: { type: 'string', nullable: true },
            data_criacao: { type: 'string', format: 'date-time' },
          },
        },
        TipoObjetoInput: {
          type: 'object',
          required: ['nome'],
          properties: {
            nome: { type: 'string', example: 'Relógio de Pulso' },
            descricao: { type: 'string', nullable: true },
          },
        },
        // ── Serviços ──────────────────────────────────────────
        Servico: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nome: { type: 'string', example: 'Bateria' },
            valor: { type: 'number', format: 'float', example: 25.00 },
            descricao: { type: 'string', nullable: true },
            ativo: { type: 'boolean', example: true },
            data_criacao: { type: 'string', format: 'date-time' },
          },
        },
        ServicoInput: {
          type: 'object',
          required: ['nome', 'valor'],
          properties: {
            nome: { type: 'string', example: 'Bateria' },
            valor: { type: 'number', format: 'float', example: 25.00 },
            descricao: { type: 'string', nullable: true },
            ativo: { type: 'boolean', default: true },
          },
        },
        // ── Ordens de Serviço ──────────────────────────────────
        ItemOS: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            ordem_id: { type: 'integer' },
            tipo_objeto_id: { type: 'integer' },
            tipo_objeto_nome: { type: 'string', example: 'Relógio de Pulso' },
            servico_id: { type: 'integer' },
            servico_nome: { type: 'string', example: 'Bateria' },
            quantidade: { type: 'integer', example: 1 },
            valor_unitario: { type: 'number', example: 25.00 },
            valor_total: { type: 'number', example: 25.00 },
            eh_orcamento: { type: 'boolean', example: false },
            estado: { type: 'string', enum: ['CADASTRADO', 'EM_ANDAMENTO', 'CANCELADO', 'CONCLUIDO'] },
            data_entrega: { type: 'string', format: 'date', nullable: true },
            hora_entrega: { type: 'string', nullable: true, example: '18:00' },
            foto_url: { type: 'string', nullable: true },
            observacoes: { type: 'string', nullable: true },
          },
        },
        ItemOSInput: {
          type: 'object',
          required: ['tipo_objeto_id', 'servico_id'],
          properties: {
            tipo_objeto_id: { type: 'integer', example: 1 },
            servico_id: { type: 'integer', example: 1 },
            quantidade: { type: 'integer', minimum: 1, maximum: 10, default: 1 },
            valor_unitario: { type: 'number', default: 0, description: 'Se 0, usa o valor cadastrado no serviço' },
            eh_orcamento: { type: 'boolean', default: false },
            observacoes: { type: 'string', nullable: true },
            foto_url: { type: 'string', nullable: true },
          },
        },
        OrdemServico: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            numero: { type: 'integer', example: 42 },
            estado: { type: 'string', enum: ['ENTRADA', 'ORCAMENTO', 'EM_ANDAMENTO', 'CANCELADO', 'CONCLUIDO'] },
            cliente_id: { type: 'integer' },
            cliente_nome: { type: 'string', example: 'Carlos Oliveira' },
            cliente_telefone: { type: 'string', example: '(11) 98765-4321' },
            usuario_id: { type: 'integer' },
            usuario_nome: { type: 'string', example: 'Ricardo' },
            data_criacao: { type: 'string', format: 'date-time' },
            data_entrega: { type: 'string', format: 'date', example: '2026-04-15' },
            hora_entrega: { type: 'string', nullable: true, example: '18:00' },
            valor_total: { type: 'number', example: 75.00 },
            valor_orcamento: { type: 'number', example: 0.00 },
            observacoes: { type: 'string', nullable: true },
            itens: { type: 'array', items: { $ref: '#/components/schemas/ItemOS' } },
          },
        },
        OrdemServicoInput: {
          type: 'object',
          required: ['cliente_id', 'data_entrega'],
          properties: {
            cliente_id: { type: 'integer', example: 1 },
            usuario_id: { type: 'integer', nullable: true, description: 'Se omitido, usa o usuário logado' },
            data_entrega: { type: 'string', format: 'date', example: '2026-04-15' },
            hora_entrega: { type: 'string', nullable: true, example: '18:00' },
            observacoes: { type: 'string', nullable: true },
            itens: { type: 'array', items: { $ref: '#/components/schemas/ItemOSInput' } },
          },
        },
        ListaOrdens: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/OrdemServico' } },
            total: { type: 'integer', example: 10 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
          },
        },
        // ── Erros ──────────────────────────────────────────────
        ErroSimples: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Recurso não encontrado' },
          },
        },
        ErroValidacao: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Dados inválidos' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'telefone' },
                  message: { type: 'string', example: 'Telefone é obrigatório' },
                },
              },
            },
          },
        },
      },
    },
    // Autenticação padrão para todos os endpoints (exceto /auth/login)
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, '../routes/*.js')],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
