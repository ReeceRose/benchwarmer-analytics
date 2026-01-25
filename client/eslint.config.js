import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const noJsxComments = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow JSX comments ({/* */})',
    },
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode
        const text = sourceCode.getText()
        const comments = sourceCode.getAllComments()
        for (const comment of comments) {
          if (comment.type === 'Block') {
            // Check if preceded by { (JSX comment pattern)
            const startIndex = comment.range[0]
            const before = text.slice(Math.max(0, startIndex - 10), startIndex)
            if (/\{\s*$/.test(before)) {
              context.report({
                loc: comment.loc,
                message: 'JSX comments ({/* */}) are not allowed.',
              })
            }
          }
        }
      },
    }
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./*', '../*'],
              message: 'Use path alias imports (@/) instead of relative imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: {
      custom: {
        rules: {
          'no-jsx-comments': noJsxComments,
        },
      },
    },
    rules: {
      'custom/no-jsx-comments': 'error',
    },
  },
])
