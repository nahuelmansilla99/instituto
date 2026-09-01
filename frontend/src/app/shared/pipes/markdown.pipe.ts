import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import katex from 'katex';

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    try {
      const mathPlaceholders: string[] = [];

      // 1. Extraer fórmulas en bloque: $$ ... $$ y \[ ... \]
      let cleanText = value.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
        try {
          const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
          const idx = mathPlaceholders.length;
          mathPlaceholders.push(rendered);
          return `<!--KATEX_BLOCK_${idx}-->`;
        } catch {
          return `$$${math}$$`;
        }
      });

      cleanText = cleanText.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => {
        try {
          const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
          const idx = mathPlaceholders.length;
          mathPlaceholders.push(rendered);
          return `<!--KATEX_BLOCK_${idx}-->`;
        } catch {
          return `\\[${math}\\]`;
        }
      });

      // 2. Extraer fórmulas en línea: \( ... \)
      cleanText = cleanText.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => {
        try {
          const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
          const idx = mathPlaceholders.length;
          mathPlaceholders.push(rendered);
          return `<!--KATEX_INLINE_${idx}-->`;
        } catch {
          return `\\(${math}\\)`;
        }
      });

      // 3. Extraer fórmulas en línea: $ ... $ (ej: $R$, $R = \frac{V}{I}$)
      cleanText = cleanText.replace(/\$([^\$\n\r]+?)\$/g, (match, math) => {
        // Evitar falsos positivos como símbolos de dinero "$50"
        if (/^\s*\d+([.,]\d+)?\s*$/.test(math) || math.startsWith(' ') || math.endsWith(' ')) {
          return match;
        }
        try {
          const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
          const idx = mathPlaceholders.length;
          mathPlaceholders.push(rendered);
          return `<!--KATEX_INLINE_${idx}-->`;
        } catch {
          return match;
        }
      });

      // 4. Parsear Markdown estándar con marked
      let html = marked.parse(cleanText, { breaks: true, gfm: true }) as string;

      // 5. Restaurar las fórmulas renderizadas por KaTeX
      html = html.replace(/<!--KATEX_(BLOCK|INLINE)_(\d+)-->/g, (_, type, idxStr) => {
        const idx = parseInt(idxStr, 10);
        return mathPlaceholders[idx] || '';
      });

      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (err) {
      console.warn('Error parsing markdown/katex:', err);
      return value;
    }
  }
}
