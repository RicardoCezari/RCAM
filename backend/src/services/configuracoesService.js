const AppError = require('../utils/AppError');
const repository = require('../repositories/configuracoesRepository');
const storage = require('./storageService');
const { tamanhoPin } = require('../utils/pin');
const { HEX, CONTRASTE_MINIMO, contrasteComBranco } = require('../utils/cor');
const { isIPv4 } = require('node:net');

const PADRAO_IMPRESSORA_REDE = Object.freeze({ tipoConexao: 'ethernet', enderecoIp: '' });

const BLOCOS_NOTA = new Set([
  'logo', 'dadosEmpresa', 'cliente', 'telefone', 'numeroOs', 'itens', 'total',
  'observacoes', 'mensagem', 'assinatura', 'rodape',
]);
const BLOCOS_NOTA_CLIENTE = new Set(['logo', 'dadosEmpresa', 'cliente', 'telefone', 'numeroOs', 'itens', 'total', 'mensagem', 'rodape']);
const BLOCOS_NOTA_LOJA = new Set([...BLOCOS_NOTA, 'observacoes']);
const PADRAO_LAYOUT_NOTA = Object.freeze({
  larguraMm: 80,
  espacamento: 'normal',
  cliente: ['logo', 'dadosEmpresa', 'cliente', 'telefone', 'numeroOs', 'itens', 'total', 'rodape', 'mensagem'],
  loja: ['cliente', 'telefone', 'numeroOs', 'itens', 'total', 'observacoes', 'assinatura', 'rodape'],
});

// Campos de texto da empresa (chave no banco -> tamanho máximo). Vazio = não aparece na nota.
const CAMPOS_TEXTO = {
  empresa_nome: 80,
  empresa_cnpj: 18,
  empresa_endereco: 160,
  empresa_numero: 20,
  empresa_complemento: 60,
  empresa_bairro: 60,
  empresa_telefone: 40,
  empresa_whatsapp: 40,
  empresa_instagram: 60,
  nota_mensagem: 300,
};

async function obter() {
  const config = await repository.listar();
  const dados = Object.fromEntries(Object.keys(CAMPOS_TEXTO).map((chave) => [chave, config[chave] || '']));
  return {
    ...dados,
    logo_url: config.logo_url || null,
    tema_cor: config.tema_cor || null,
    nota_layout: lerLayoutNota(config.nota_layout),
    pin_tamanho: tamanhoPin(),
  };
}

async function obterImpressoraRede() {
  const valor = await repository.buscar('impressora_rede');
  if (!valor) return { ...PADRAO_IMPRESSORA_REDE };
  try {
    return validarImpressoraRede(JSON.parse(valor));
  } catch {
    return { ...PADRAO_IMPRESSORA_REDE };
  }
}

function validarImpressoraRede(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw AppError.badRequest('Configuração da impressora inválida');
  }
  if (!['ethernet', 'wifi'].includes(config.tipoConexao)) {
    throw AppError.badRequest('Selecione cabo de rede ou Wi-Fi');
  }
  const enderecoIp = String(config.enderecoIp ?? '').trim();
  if (enderecoIp && !isIPv4(enderecoIp)) {
    throw AppError.badRequest('Informe um endereço IPv4 válido para a impressora');
  }
  return { tipoConexao: config.tipoConexao, enderecoIp };
}

async function atualizarImpressoraRede(config) {
  const validada = validarImpressoraRede(config);
  await repository.aplicar([{ chave: 'impressora_rede', valor: JSON.stringify(validada) }]);
  return validada;
}

function lerLayoutNota(valor) {
  if (!valor) return PADRAO_LAYOUT_NOTA;
  try {
    const layout = JSON.parse(valor);
    return validarLayoutNota(layout);
  } catch {
    return PADRAO_LAYOUT_NOTA;
  }
}

function validarOrdemBlocos(blocos, permitidos, nomeVia) {
  if (!Array.isArray(blocos) || blocos.length > permitidos.size ||
      blocosDuplicados(blocos) || blocosInvalidos(blocos, permitidos)) {
    throw AppError.badRequest(`Layout inválido para a via ${nomeVia}`);
  }
  return blocos
}

function blocosDuplicados(blocos) {
  return new Set(blocos).size !== blocos.length;
}

function blocosInvalidos(blocos, permitidos) {
  return blocos.some((bloco) => typeof bloco !== 'string' || !permitidos.has(bloco));
}

function validarLayoutNota(layout) {
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
    throw AppError.badRequest('Layout da nota inválido');
  }
  if (!Number.isInteger(layout.larguraMm) || layout.larguraMm < 48 || layout.larguraMm > 100) {
    throw AppError.badRequest('A largura da nota deve ficar entre 48 e 100 mm');
  }
  if (!['compacto', 'normal', 'amplo'].includes(layout.espacamento)) {
    throw AppError.badRequest('Espaçamento da nota inválido');
  }
  const cliente = validarOrdemBlocos(layout.cliente, BLOCOS_NOTA_CLIENTE, 'cliente');
  const loja = validarOrdemBlocos(layout.loja, BLOCOS_NOTA_LOJA, 'loja');
  return { larguraMm: layout.larguraMm, espacamento: layout.espacamento, cliente, loja };
}

// Cor de destaque do sistema: vazia volta ao padrão (preto). Precisa ter contraste suficiente com o texto branco.
function validarTemaCor(valor) {
  const cor = String(valor ?? '').trim().toLowerCase();
  if (!cor) return '';
  if (!HEX.test(cor)) throw AppError.badRequest('Cor inválida. Use o formato #rrggbb');
  if (contrasteComBranco(cor) < CONTRASTE_MINIMO) {
    throw AppError.badRequest('Cor muito clara: o texto branco não ficaria legível sobre ela. Escolha um tom mais escuro');
  }
  return cor;
}

// Atualiza apenas os campos enviados; texto vazio remove a configuração
async function atualizar(dados) {
  const alteracoes = Object.keys(CAMPOS_TEXTO)
    .filter((chave) => dados[chave] !== undefined)
    .map((chave) => ({ chave, valor: String(dados[chave] ?? '').trim() }));
  if (dados.tema_cor !== undefined) alteracoes.push({ chave: 'tema_cor', valor: validarTemaCor(dados.tema_cor) });
  if (dados.nota_layout !== undefined) {
    const valor = dados.nota_layout === null ? '' : JSON.stringify(validarLayoutNota(dados.nota_layout));
    alteracoes.push({ chave: 'nota_layout', valor });
  }
  await repository.aplicar(alteracoes);
  return obter();
}

async function trocarLogo(arquivo) {
  if (!arquivo) throw AppError.badRequest('Envie a imagem da logo');

  const anterior = await repository.buscar('logo_url');
  const url = await storage.salvar(arquivo.buffer, arquivo.mimetype, 'logo');
  await repository.salvar('logo_url', url);
  await storage.remover(anterior);
  return obter();
}

async function removerLogo() {
  const anterior = await repository.buscar('logo_url');
  await repository.remover('logo_url');
  await storage.remover(anterior);
  return obter();
}

module.exports = {
  obter, atualizar, trocarLogo, removerLogo, CAMPOS_TEXTO,
  PADRAO_LAYOUT_NOTA, validarLayoutNota,
  PADRAO_IMPRESSORA_REDE, obterImpressoraRede, atualizarImpressoraRede, validarImpressoraRede,
};
