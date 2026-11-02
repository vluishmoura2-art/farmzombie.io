export function validateNickname(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) return { ok: false, key: 'validation.required' };
  const length = [...name].length;
  if (length < 3) return { ok: false, key: 'validation.tooShort' };
  if (length > 16) return { ok: false, key: 'validation.tooLong' };
  if (!/^[\p{L}\p{N}_]+$/u.test(name)) return { ok: false, key: 'validation.characters' };
  return { ok: true, name };
}
