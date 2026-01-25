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

const noArbitraryTailwind = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow arbitrary Tailwind size values (e.g., w-[200px]). Use canonical classes instead.',
    },
  },
  create(context) {
    // Pattern: size utility with simple numeric value (px, rem, %, etc.)
    // Skip calc(), var(), and other complex expressions
    const arbitraryPattern = /\b(w|h|min-w|max-w|min-h|max-h|size)-\[(\d+(?:\.\d+)?(?:px|rem|em|%)?)\]/g

    function checkForArbitraryValues(node, value) {
      if (typeof value !== 'string') return

      let match
      while ((match = arbitraryPattern.exec(value)) !== null) {
        const [fullMatch] = match
        context.report({
          node,
          message: `Arbitrary Tailwind value "${fullMatch}" is not allowed. Use a canonical Tailwind class instead.`,
        })
      }
      // Reset regex lastIndex for next call
      arbitraryPattern.lastIndex = 0
    }

    return {
      // Check className="..." and class="..."
      JSXAttribute(node) {
        if (
          node.name &&
          (node.name.name === 'className' || node.name.name === 'class') &&
          node.value
        ) {
          if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
            checkForArbitraryValues(node.value, node.value.value)
          }
        }
      },
      // Check template literals in className={`...`}
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          checkForArbitraryValues(quasi, quasi.value.raw)
        }
      },
      // Check string literals in cn(), clsx(), twMerge() calls
      Literal(node) {
        if (typeof node.value === 'string' && node.parent) {
          if (
            node.parent.type === 'CallExpression' &&
            node.parent.callee &&
            node.parent.callee.name &&
            ['cn', 'clsx', 'classNames', 'twMerge'].includes(node.parent.callee.name)
          ) {
            checkForArbitraryValues(node, node.value)
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
          'no-arbitrary-tailwind': noArbitraryTailwind,
        },
      },
    },
    rules: {
      'custom/no-jsx-comments': 'error',
      'custom/no-arbitrary-tailwind': 'error',
    },
  },
])
