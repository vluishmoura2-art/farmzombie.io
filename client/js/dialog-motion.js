const pending = new WeakMap();
export function showDialog(dialog) {
  clearTimeout(pending.get(dialog)); pending.delete(dialog); dialog.classList.remove('closing');
  if (!dialog.open) dialog.showModal();
}
export function closeDialog(dialog, onClose) {
  if (pending.has(dialog) || !dialog.open) return;
  const finish = () => { pending.delete(dialog); dialog.classList.remove('closing'); dialog.close(); onClose(); };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
  dialog.classList.add('closing'); pending.set(dialog, setTimeout(finish, 110));
}
