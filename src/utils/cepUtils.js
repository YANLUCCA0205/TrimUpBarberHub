/**
 * Utilitários para manipulação de CEP (Código de Endereçamento Postal)
 */

/**
 * Formata um valor de CEP no padrão 00000-000
 * @param {string} value - Valor bruto de entrada
 * @returns {string} CEP formatado
 */
export function formatCEP(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Valida se o CEP possui exatamente 8 dígitos
 * @param {string} cep - CEP a ser validado
 * @returns {boolean} true se válido
 */
export function validateCEP(cep) {
  const digits = String(cep).replace(/\D/g, '');
  return digits.length === 8;
}

/**
 * Busca endereço pelo CEP utilizando a API ViaCEP
 * @param {string} cep - CEP para consulta
 * @returns {Promise<Object|null>} Dados do endereço ou null em caso de erro
 */
export async function fetchAddressByCEP(cep) {
  const cleanCep = String(cep).replace(/\D/g, '');

  if (cleanCep.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      return null;
    }

    return {
      logradouro: data.logradouro,
      bairro: data.bairro,
      localidade: data.localidade,
      uf: data.uf,
      erro: data.erro,
    };
  } catch (error) {
    console.error('Erro ao buscar endereço pelo CEP:', error);
    return null;
  }
}
