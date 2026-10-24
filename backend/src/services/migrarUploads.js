/*
 * Copia os arquivos da pasta local de uploads para o driver S3 (migração de fotos para a nuvem).
 *
 *  - Modo simulação (padrão): só lista o que seria enviado.
 *  - Nunca apaga nada, nem local nem no bucket; pode ser repetido (pula o que já existe com o mesmo tamanho).
 *  - Só envia arquivos que são imagens JPG/PNG/WEBP de verdade (magic bytes); o resto é relatado em `invalidos`.
 *  - Compara com as URLs do banco: `semArquivo` = referenciadas no banco mas ausentes na pasta local.
 */
const fs = require('fs/promises');
const path = require('path');
const { detectarTipoImagem } = require('../utils/tipoImagem');

async function listar(dir, base = dir) {
  const itens = [];
  let entradas;
  try {
    entradas = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return itens;
    throw err;
  }
  for (const e of entradas) {
    const caminho = path.join(dir, e.name);
    if (e.isDirectory()) itens.push(...(await listar(caminho, base)));
    else if (e.isFile()) itens.push({ caminho, chave: path.relative(base, caminho).split(path.sep).join('/') });
  }
  return itens;
}

async function migrarUploads({ dirOrigem, driver, aplicar = false, urlsBanco = [], log = () => {} }) {
  const resumo = { total: 0, enviados: 0, jaExistiam: 0, invalidos: [], semArquivo: [], falhas: [], aplicou: aplicar };
  const arquivos = await listar(dirOrigem);
  resumo.total = arquivos.length;
  const locais = new Set(arquivos.map((a) => a.chave));

  for (const url of urlsBanco) {
    if (typeof url === 'string' && url.startsWith('/uploads/') && !locais.has(url.slice('/uploads/'.length))) {
      resumo.semArquivo.push(url);
    }
  }

  for (const { caminho, chave } of arquivos) {
    try {
      const buffer = await fs.readFile(caminho);
      const tipo = detectarTipoImagem(buffer);
      if (!tipo) {
        resumo.invalidos.push(chave);
        continue;
      }
      const remoto = await driver.tamanho(chave);
      if (remoto === buffer.length) {
        resumo.jaExistiam += 1;
        continue;
      }
      if (aplicar) {
        await driver.gravar(chave, buffer, tipo.mimetype);
        log(`enviado ${chave}`);
      } else {
        log(`enviaria ${chave}`);
      }
      resumo.enviados += 1;
    } catch (err) {
      resumo.falhas.push({ chave, erro: err.message });
    }
  }
  return resumo;
}

module.exports = { migrarUploads };
