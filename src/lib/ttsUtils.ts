/**
 * Sanitize text before sending to TTS.
 * Strips markdown code blocks, inline code, error messages,
 * URLs, and other content that sounds terrible when read aloud.
 */
export function sanitizeForTTS(text: string): string {
  let cleaned = text;

  // Remove fenced code blocks (```...```) entirely
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' (code block omitted) ');

  // Remove inline code (`...`)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Remove error-like prefixes/messages
  cleaned = cleaned.replace(/^Error:\s*.*/gm, '');
  cleaned = cleaned.replace(/^Sorry, something went wrong:.*/gm, '');
  cleaned = cleaned.replace(/\b(TypeError|ReferenceError|SyntaxError|Error|ENOENT|EACCES|EPERM):\s*[^\n]+/g, '');

  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, ' (link) ');

  // Remove markdown bold/italic markers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

  // Remove markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // Remove markdown bullet points but keep text
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');

  // Collapse multiple whitespace/newlines
  cleaned = cleaned.replace(/\n{2,}/g, '. ');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  return cleaned.trim();
}
