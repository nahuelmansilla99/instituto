import { Injectable, Logger } from '@nestjs/common';
const pdfParse = require('pdf-parse');

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);

  /**
   * Extrae el texto legible de un Buffer de PDF.
   * Si ocurre un error o el PDF es sólo imágenes escaneadas, retorna una cadena limpia o null.
   */
  async extractText(buffer: Buffer): Promise<string | null> {
    try {
      if (!buffer || buffer.length === 0) {
        return null;
      }

      const data = await pdfParse(buffer);
      const text = data.text ? data.text.trim() : '';

      if (!text) {
        this.logger.warn('El PDF no contiene texto extraíble (puede estar escaneado como imagen).');
        return null;
      }

      // Limpieza básica de espacios en blanco repetitivos
      const cleanedText = text
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      this.logger.log(`Texto extraído exitosamente de PDF (${cleanedText.length} caracteres).`);
      return cleanedText;
    } catch (error) {
      this.logger.error('Error al extraer texto del PDF:', error);
      return null;
    }
  }
}
