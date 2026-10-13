const MESSAGE = 'Please write something first.';

/**
 * Reads a trimmed text field from a form. If it is blank (or only spaces, which `required` lets
 * through), shows the browser's validation message on that field and returns null.
 */
export function requireText(form: HTMLFormElement, name: string): string | null {
  const field = form.elements.namedItem(name);
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return null;
  const value = field.value.trim();
  if (value) return value;
  field.setCustomValidity(MESSAGE);
  field.reportValidity();
  field.addEventListener('input', () => field.setCustomValidity(''), { once: true });
  field.focus();
  return null;
}
