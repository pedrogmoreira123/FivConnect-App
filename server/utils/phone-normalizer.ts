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
 * Suporta TODOS os DDDs do Brasil
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

  // Remover domínio WhatsApp se existir
  let cleanPhone = phone.replace(/@s\.whatsapp\.net|@c\.us/g, '');
  
  // Remover todos os caracteres não numéricos
  cleanPhone = cleanPhone.replace(/\D/g, '');
  
  let normalized = cleanPhone;
  let ddd = '';
  let numero = '';
  
  // Se começa com 55 (código do Brasil), remover
  if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
    cleanPhone = cleanPhone.substring(2); // Remove o DDI 55
  }
  
  // Extrair DDD (primeiros 2 dígitos)
  if (cleanPhone.length >= 10) {
    ddd = cleanPhone.substring(0, 2);
    numero = cleanPhone.substring(2);
    
    // Aceitar tanto números de 8 quanto de 9 dígitos
    // Não forçar adição do 9 automaticamente
    normalized = ddd + numero;
  } else {
    // Número muito curto, inválido
    return {
      raw: phone,
      normalized: cleanPhone,
      formatted: phone,
      isValid: false
    };
  }
  
  // Validar: DDD válido (11-99) + 8 ou 9 dígitos
  const dddNum = parseInt(ddd);
  const isValid = dddNum >= 11 && dddNum <= 99 && (numero.length === 8 || numero.length === 9);
  
  // Formatar: +55 (DDD) 99999-9999 ou +55 (DDD) 9999-9999
  const formatted = isValid
    ? numero.length === 9 
      ? `+55 ${ddd} ${numero.substring(0, 5)}-${numero.substring(5)}`  // 9 dígitos: 99999-9999
      : `+55 ${ddd} ${numero.substring(0, 4)}-${numero.substring(4)}`  // 8 dígitos: 9999-9999
    : `+55 ${normalized}`;
  
  return {
    raw: phone,
    normalized: normalized, // Ex: 42984246697
    formatted: formatted,   // Ex: +55 42 98424-6697
    isValid: isValid
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
 * Normaliza número para envio (formato internacional Whapi.Cloud)
 * Retorna: 5542984246697 (sem espaços, sem +)
 */
export function normalizePhoneForWhapi(phone: string): string {
  const result = normalizePhoneNumber(phone);
  if (!result.isValid) {
    throw new Error(`Número de telefone inválido: ${phone}`);
  }
  
  // Retornar no formato: DDI + DDD + Número (ex: 5542984246697)
  return '55' + result.normalized;
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
