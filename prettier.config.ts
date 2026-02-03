import type { Config } from 'prettier';

const prettierConfig: Config = {
  // Formatting configuration
  semi: true,
  printWidth: 140,
  singleQuote: true,
  trailingComma: 'es5',
  arrowParens: 'always',
  bracketSameLine: true,

  // Imports sorting configuration
  importOrder: ['<THIRD_PARTY_MODULES>',  '^@/', '^\\.{1,2}/'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  plugins: ['@trivago/prettier-plugin-sort-imports'],
};

export default prettierConfig;
