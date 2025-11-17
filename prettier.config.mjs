/** @type {import('prettier').Config} */
const prettierConfig = {
  semi: true,
  printWidth: 140,
  singleQuote: true,
  trailingComma: 'es5',
  arrowParens: 'always',
  bracketSameLine: true,

  importOrder: ['^node', '<THIRD_PARTY_MODULES>', '^\\.{1,2}/'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  plugins: ['@trivago/prettier-plugin-sort-imports'],
};

export default prettierConfig;
