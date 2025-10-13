/**
 * Utilitário para normalização de números de telefone brasileiros
 * Padrão: +55 11 99999-9999
 */

export interface PhoneNormalizationResult {
  raw: string;
  normalized: string;
  formatted: string;
  isValid: boolean;
}

/**
 * Normaliza um número de telefone para o formato brasileiro padrão
 * @param phone - Número de telefone em qualquer formato
 * @returns Objeto com informações de normalização
 */
export function normalizePhoneNumber(phone: string): PhoneNormalizationResult {
  if (!phone) {
    return {
      raw: phone,
      normalized: '',
      formatted: '',
      isValid: false
    };
  }

  // Remover todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  let normalized = cleanPhone;
  let isValid = false;
  
  // Padronizar para formato brasileiro
  if (cleanPhone.startsWith('55')) {
    // Já tem código do país, remover e manter apenas o DDD + número
    normalized = cleanPhone.substring(2);
  } else if (cleanPhone.startsWith('11') && cleanPhone.length >= 10) {
    // Já tem DDD 11, manter como está
    normalized = cleanPhone;
  } else if (cleanPhone.length >= 9) {
    // Adicionar DDD 11 se não tiver
    normalized = '11' + cleanPhone;
  }
  
  // Garantir formato correto: 11 + 9 dígitos
  if (normalized.length === 10) {
    normalized = normalized.substring(0, 2) + '9' + normalized.substring(2);
  }
  
  // Validar se está no formato correto
  isValid = normalized.length === 11 && normalized.startsWith('11');
  
  // Formatar para exibição: +55 11 99999-9999
  const formatted = normalized.length === 11 
    ? `+55 ${normalized.substring(0, 2)} ${normalized.substring(2, 7)}-${normalized.substring(7)}`
    : `+55 11 ${normalized}`;
  
  return {
    raw: phone,
    normalized,
    formatted,
    isValid
  };
}

/**
 * Normaliza número para busca no banco de dados (sem formatação)
 * @param phone - Número de telefone
 * @returns Número normalizado para busca
 */
export function normalizePhoneForSearch(phone: string): string {
  const result = normalizePhoneNumber(phone);
  return result.normalized;
}

/**
 * Formata número para exibição
 * @param phone - Número de telefone
 * @returns Número formatado para exibição
 */
export function formatPhoneForDisplay(phone: string): string {
  const result = normalizePhoneNumber(phone);
  return result.formatted;
}

/**
 * Valida se um número de telefone está no formato correto
 * @param phone - Número de telefone
 * @returns true se válido, false caso contrário
 */
export function isValidPhoneNumber(phone: string): boolean {
  const result = normalizePhoneNumber(phone);
  return result.isValid;
}

/**
 * Extrai número do WhatsApp (remove @whatsapp.net e normaliza)
 * @param whatsappNumber - Número do WhatsApp com sufixo
 * @returns Número normalizado
 */
export function extractWhatsAppNumber(whatsappNumber: string): string {
  if (!whatsappNumber) return '';
  
  // Remover sufixo @whatsapp.net ou similar
  const cleanNumber = whatsappNumber.replace(/@.*$/, '');
  
  // Normalizar
  return normalizePhoneForSearch(cleanNumber);
}
