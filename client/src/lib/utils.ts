import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um número de telefone para o padrão brasileiro +55 (XX) X XXXX-XXXX
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se já tem código do país (55), remove
  let number = cleaned;
  if (number.startsWith('55') && number.length > 11) {
    number = number.substring(2);
  }
  
  // Aplica a formatação baseada no tamanho
  if (number.length === 11) {
    // Celular: (XX) X XXXX-XXXX
    return `+55 (${number.substring(0, 2)}) ${number.substring(2, 3)} ${number.substring(3, 7)}-${number.substring(7)}`;
  } else if (number.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `+55 (${number.substring(0, 2)}) ${number.substring(2, 6)}-${number.substring(6)}`;
  } else if (number.length === 9) {
    // Celular sem DDD: X XXXX-XXXX
    return `+55 (11) ${number.substring(0, 1)} ${number.substring(1, 5)}-${number.substring(5)}`;
  } else if (number.length === 8) {
    // Fixo sem DDD: XXXX-XXXX
    return `+55 (11) ${number.substring(0, 4)}-${number.substring(4)}`;
  }
  
  // Se não conseguir formatar, retorna o número original
  return phone;
}
