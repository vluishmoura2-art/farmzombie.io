// The newest published release is the sole source of the displayed game version.
export function publishedReleases(entries) {
  return [...entries].sort((a,b) => b.date.localeCompare(a.date) || b.version.localeCompare(a.version, 'en', {numeric:true}));
}
export const localized = (value, language) => typeof value === 'string' ? value : value?.[language] ?? value?.['pt-BR'] ?? value?.en ?? '';
export async function loadGameConfig() {
  const response = await fetch('/data/changelog.json', {cache:'no-cache'});
  if (!response.ok) throw Error('Changelog unavailable');
  const releases = publishedReleases(await response.json());
  if (!releases.length) throw Error('No published releases');
  return {version:releases[0].version, releases};
}
