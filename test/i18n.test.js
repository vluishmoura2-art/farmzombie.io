import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { i18n, t, reasonText, equipmentName } from '../client/js/i18n.js';
import { BUILDING_TYPES } from '../client/js/building-config.js';

const load = language => JSON.parse(readFileSync(new URL(`../client/locales/${language}.json`, import.meta.url), 'utf8'));
for (const language of ['pt-BR', 'en', 'es']) i18n.dictionaries.set(language, load(language));

test('game text interpolates values and follows the selected language', () => {
  i18n.language = 'pt-BR';
  assert.equal(t('hud.goldGain', { amount: 16 }), '+16 ouro');
  assert.equal(equipmentName({ id: 'pickaxe', tier: 1 }), 'Picareta de Madeira');
  i18n.language = 'en';
  assert.equal(equipmentName({ id: 'sword', tier: 7 }), 'Diamond Sword');
});

test('English rule and server reasons are shown translated', () => {
  i18n.language = 'pt-BR';
  assert.equal(reasonText('Not enough gold.'), 'Ouro insuficiente.');
  assert.equal(reasonText('Leader has not granted building permission'), t('reason.permission'));
  assert.equal(reasonText('Defeated by Ana_99'), 'Derrubado por Ana_99.');
  assert.equal(reasonText('Some new server message'), 'Some new server message');
});

test('every building has a translated name and description', () => {
  for (const language of ['pt-BR', 'en', 'es']) {
    const dictionary = load(language);
    for (const type of Object.keys(BUILDING_TYPES)) {
      assert.ok(dictionary[`building.${type}.name`], `${language} ${type} name`);
      assert.ok(dictionary[`building.${type}.description`], `${language} ${type} description`);
    }
  }
});

test('client sources are valid UTF-8', () => {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  for (const file of readdirSync(new URL('../client/js/', import.meta.url))) {
    assert.doesNotThrow(() => decoder.decode(readFileSync(new URL(`../client/js/${file}`, import.meta.url))), file);
  }
});
