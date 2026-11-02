export const LANGUAGES = ['pt-BR', 'en', 'es'];
export function suggestLanguage(saved, browserLanguage) {
  if (LANGUAGES.includes(saved)) return saved;
  const language = String(browserLanguage || '').toLowerCase();
  return language.startsWith('en') ? 'en' : language.startsWith('es') ? 'es' : 'pt-BR';
}
export function translation(dictionary, fallback, key) {
  return dictionary?.[key] ?? fallback?.[key] ?? key;
}
export class Localization {
  constructor() { this.language = 'pt-BR'; this.dictionaries = new Map(); this.version = 0; }
  async load(language) {
    if (this.dictionaries.has(language)) return this.dictionaries.get(language);
    const response = await fetch(`/locales/${language}.json`);
    if (!response.ok) throw Error('Locale unavailable');
    const dictionary = await response.json(); this.dictionaries.set(language, dictionary); return dictionary;
  }
  async select(language) {
    const version = ++this.version;
    language = LANGUAGES.includes(language) ? language : 'pt-BR';
    await this.load('pt-BR');
    try { await this.load(language); } catch { language = 'pt-BR'; }
    if (version !== this.version) return false;
    this.language = language; return true;
  }
  t(key) { return translation(this.dictionaries.get(this.language), this.dictionaries.get('pt-BR'), key); }
}
