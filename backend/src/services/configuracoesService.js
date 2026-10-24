const AppError = require('../utils/AppError');
const repository = require('../repositories/configuracoesRepository');
const storage = require('./storageService');
const { tamanhoPin } = require('../utils/pin');
const { HEX, CONTRASTE_MINIMO, contrasteComBranco } = require('../utils/cor');

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
  return { ...dados, logo_url: config.logo_url || null, tema_cor: config.tema_cor || null, pin_tamanho: tamanhoPin() };
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

module.exports = { obter, atualizar, trocarLogo, removerLogo, CAMPOS_TEXTO };
