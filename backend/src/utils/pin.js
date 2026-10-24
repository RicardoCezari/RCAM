const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/*
 * PIN de entrada rápida. Tamanho configurável em PIN_TAMANHO (2 a 6 dígitos, padrão 4).
 * O PIN passa por HMAC com o segredo da API antes do bcrypt: quem obtiver só o banco não consegue
 * testar as poucas combinações possíveis offline.
 */
const TAMANHO_MINIMO = 2;
const TAMANHO_MAXIMO = 6;
const TAMANHO_PADRAO = 4;
const RODADAS_BCRYPT = 10;

function tamanhoPin() {
  const n = parseInt(process.env.PIN_TAMANHO, 10);
  if (!Number.isInteger(n)) return TAMANHO_PADRAO;
  return Math.min(TAMANHO_MAXIMO, Math.max(TAMANHO_MINIMO, n));
}

function pinValido(pin) {
  return typeof pin === 'string' && new RegExp(`^\\d{${tamanhoPin()}}$`).test(pin);
}

const embaralhar = (pin) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(pin).digest('hex');

const gerarHash = (pin) => bcrypt.hash(embaralhar(pin), RODADAS_BCRYPT);
const conferir = (pin, hash) => bcrypt.compare(embaralhar(pin), hash);

// Hash descartável: mantém o tempo de resposta igual quando o perfil não existe ou não tem PIN
let hashFalso;
const conferirFalso = (pin) => {
  hashFalso = hashFalso || bcrypt.hashSync('00', RODADAS_BCRYPT);
  return conferir(pin, hashFalso);
};

module.exports = { tamanhoPin, pinValido, gerarHash, conferir, conferirFalso };
