/**
 * Utilitários de validação e formatação de CPF e CNPJ
 * Conformidade LGPD: usar hashDocument() para armazenamento seguro
 */

// ======= VALIDAÇÃO =======

/**
 * Valida CPF usando algoritmo oficial (2 dígitos verificadores)
 * @param {string} cpf - CPF com ou sem máscara
 * @returns {boolean}
 */
export function validateCPF(cpf) {
  if (!cpf) return false;
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;

  // Rejeitar CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Cálculo do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cleaned.charAt(9))) return false;

  // Cálculo do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

/**
 * Valida CNPJ usando algoritmo oficial (2 dígitos verificadores)
 * @param {string} cnpj - CNPJ com ou sem máscara
 * @returns {boolean}
 */
export function validateCNPJ(cnpj) {
  if (!cnpj) return false;
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;

  // Rejeitar CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  // Cálculo do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let rest = sum % 11;
  const digit1 = rest < 2 ? 0 : 11 - rest;
  if (digit1 !== parseInt(cleaned.charAt(12))) return false;

  // Cálculo do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  rest = sum % 11;
  const digit2 = rest < 2 ? 0 : 11 - rest;
  if (digit2 !== parseInt(cleaned.charAt(13))) return false;

  return true;
}

// ======= FORMATAÇÃO / MÁSCARA =======

/**
 * Aplica máscara de CPF: 000.000.000-00
 * @param {string} value - Valor do input
 * @returns {string}
 */
export function formatCPF(value) {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Aplica máscara de CNPJ: 00.000.000/0000-00
 * @param {string} value - Valor do input
 * @returns {string}
 */
export function formatCNPJ(value) {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  return cleaned
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Remove a máscara e retorna apenas os dígitos
 * @param {string} value
 * @returns {string}
 */
export function cleanDocument(value) {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

// ======= SEGURANÇA (LGPD) =======

/**
 * Gera hash SHA-256 do documento para armazenamento seguro
 * @param {string} doc - CPF ou CNPJ (com ou sem máscara)
 * @returns {Promise<string>} hash hexadecimal
 */
export async function hashDocument(doc) {
  if (!doc) return null;
  const cleaned = doc.replace(/\D/g, '');
  const encoder = new TextEncoder();
  const data = encoder.encode(cleaned);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Retorna máscara de exibição do documento
 * CPF: ***.***. ***-34
 * CNPJ: **.***.***/****-56
 * @param {string} doc - CPF ou CNPJ
 * @returns {string}
 */
export function maskDocument(doc) {
  if (!doc) return '';
  const cleaned = doc.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `***.***.*${cleaned.slice(7, 8)}*-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 14) {
    return `**.***.***/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }
  return cleaned;
}

/**
 * Retorna os últimos 4 dígitos do documento para armazenamento de exibição
 * @param {string} doc
 * @returns {string}
 */
export function getLast4Digits(doc) {
  if (!doc) return '';
  const cleaned = doc.replace(/\D/g, '');
  return cleaned.slice(-4);
}
