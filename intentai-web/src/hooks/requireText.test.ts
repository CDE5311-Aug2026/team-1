import { expect, test } from 'vitest';
import { requireText } from './requireText';

function formWith(value: string) {
  const form = document.createElement('form');
  const input = document.createElement('textarea');
  input.name = 'message';
  input.value = value;
  form.appendChild(input);
  document.body.appendChild(form);
  return { form, input };
}

test('returns trimmed text', () => {
  const { form } = formWith('  hello ');
  expect(requireText(form, 'message')).toBe('hello');
  form.remove();
});

test('blank or spaces-only input is flagged on the field and focused', () => {
  const { form, input } = formWith('   ');
  expect(requireText(form, 'message')).toBeNull();
  expect(input.validationMessage).toBe('Please write something first.');
  expect(document.activeElement).toBe(input);
  input.dispatchEvent(new Event('input'));
  expect(input.validationMessage).toBe('');
  form.remove();
});
