/**
 * Gerador de Números de Protocolo de Atendimento
 * Formato: DDMMAA + número sequencial (ex: 0910250001)
 */

export class ProtocolGenerator {
  /**
   * Gera um número de protocolo único baseado na data atual
   * @param companyId ID da empresa para isolamento
   * @returns Número de protocolo no formato DDMMAA + sequencial
   */
  static generateProtocolNumber(companyId: string): string {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    
    // Formato base: DDMMAA
    const datePrefix = `${day}${month}${year}`;
    
    // Para produção, você pode implementar um contador baseado no banco
    // Por enquanto, usaremos timestamp para garantir unicidade
    const timestamp = Date.now().toString().slice(-4);
    
    return `${datePrefix}${timestamp}`;
  }

  /**
   * Valida se um número de protocolo está no formato correto
   * @param protocolNumber Número de protocolo para validar
   * @returns true se o formato estiver correto
   */
  static isValidProtocolNumber(protocolNumber: string): boolean {
    // Formato: DDMMAA + 4 dígitos = 10 caracteres
    const protocolRegex = /^\d{10}$/;
    return protocolRegex.test(protocolNumber);
  }

  /**
   * Extrai a data de um número de protocolo
   * @param protocolNumber Número de protocolo
   * @returns Data extraída ou null se inválido
   */
  static extractDateFromProtocol(protocolNumber: string): Date | null {
    if (!this.isValidProtocolNumber(protocolNumber)) {
      return null;
    }

    const day = parseInt(protocolNumber.substring(0, 2));
    const month = parseInt(protocolNumber.substring(2, 4)) - 1; // Mês é 0-indexado
    const year = 2000 + parseInt(protocolNumber.substring(4, 6));

    try {
      return new Date(year, month, day);
    } catch {
      return null;
    }
  }

  /**
   * Gera um número de protocolo com contador sequencial baseado no banco
   * @param companyId ID da empresa
   * @param storage Instância do storage para consultar o banco
   * @returns Número de protocolo único
   */
  static async generateSequentialProtocolNumber(
    companyId: string, 
    storage: any
  ): Promise<string> {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    
    const datePrefix = `${day}${month}${year}`;
    
    try {
      // Buscar o último protocolo do dia
      const lastProtocol = await storage.getLastProtocolOfDay(companyId, datePrefix);
      
      let sequenceNumber = 1;
      if (lastProtocol) {
        const lastSequence = parseInt(lastProtocol.substring(6));
        sequenceNumber = lastSequence + 1;
      }
      
      // Garantir que o número tenha 4 dígitos
      const sequenceStr = sequenceNumber.toString().padStart(4, '0');
      
      return `${datePrefix}${sequenceStr}`;
    } catch (error) {
      console.error('Erro ao gerar protocolo sequencial:', error);
      // Fallback para timestamp
      const timestamp = Date.now().toString().slice(-4);
      return `${datePrefix}${timestamp}`;
    }
  }
}







