import {
  a11y,
  base,
  browser,
  ignores,
  react,
  sorted,
  stylistic,
  stylisticJsx,
  typescript
} from '@moonstar-x/eslint-config';
import pluginQuery from '@tanstack/eslint-plugin-query';

export default [
  ...ignores,
  ...base,
  ...typescript,
  ...browser,
  ...react,
  ...a11y(),
  ...stylistic,
  ...stylisticJsx,
  ...sorted,
  ...pluginQuery.configs['flat/recommended-strict'],
  {
    name: 'ignore-third-party',
    files: ['src/components/ui/third-party/**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'jsx-a11y/prefer-tag-over-role': 'off'
    }
  }
];
