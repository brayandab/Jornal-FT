import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resources, resolveUiLocale } from './index';

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [prefix + k] : flatten(v, `${prefix}${k}.`),
  );
}

/** Quita el sufijo de plural (_one, _other...) para comparar idiomas con reglas distintas (el japonés no tiene _one). */
const base = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '');

const reference = new Set(flatten(resources['en-US'].translation as Tree).map(base));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(f) && !f.endsWith('.test.ts') ? [p] : [];
  });
}

describe('traducciones', () => {
  for (const [locale, { translation }] of Object.entries(resources)) {
    it(`${locale} tiene todas las claves de en-US y ninguna de más`, () => {
      const keys = new Set(flatten(translation as Tree).map(base));
      expect([...reference].filter((k) => !keys.has(k))).toEqual([]);
      expect([...keys].filter((k) => !reference.has(k))).toEqual([]);
    });
  }

  it('cada clave fija usada en el código existe', () => {
    const used = new Set<string>();
    for (const file of sourceFiles(join(__dirname, '..'))) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
      for (const m of text.matchAll(/key: '([a-z]+\.[a-zA-Z]+)'/g)) used.add(m[1]);
    }
    expect([...used].filter((k) => !reference.has(k))).toEqual([]);
  });

  it('elige el idioma más cercano con respaldo a en-US', () => {
    expect(resolveUiLocale('pt-PT')).toBe('pt-BR');
    expect(resolveUiLocale('ja')).toBe('ja-JP');
    expect(resolveUiLocale('it-IT')).toBe('en-US');
  });
});
