import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Only allows safe tags like br, strong, em, p, ul, li, ol.
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['br', 'strong', 'em', 'p', 'ul', 'li', 'ol', 'b', 'i', 'span'],
    ALLOWED_ATTR: []
  });
}

/**
 * Processes text content for safe HTML display:
 * - Converts newlines to <br/>
 * - Converts markdown bold (**text**) to <strong>
 * - Converts bullet points to HTML entities
 * - Sanitizes result to prevent XSS
 */
export function processAndSanitize(text: string | null | undefined): string {
  if (!text) return '';
  
  const processed = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/•/g, '&#8226;')
    .replace(/⚠️/g, '⚠️ ');
  
  return sanitizeHTML(processed);
}
