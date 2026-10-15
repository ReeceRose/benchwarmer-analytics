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

const chartColourRoles = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Chart slots 2-5 only through a role (CHART_COLOURS in order, ZONE_COLOURS, UNIT_COLOURS, teamColour). See docs/DESIGN_SYSTEM.md.',
    },
  },
  create(context) {
    const slotPattern = /(--|\b(?:bg|text|border|fill|stroke|ring)-)chart-[2-5]\b/
    const message =
      'Pick chart colours by role (CHART_COLOURS, ZONE_COLOURS, UNIT_COLOURS, STATUS_COLOURS or teamColour), not a raw chart slot.'
    const check = (node, value) => {
      if (typeof value === 'string' && slotPattern.test(value)) context.report({ node, message })
    }
    return {
      Literal(node) {
        check(node, node.value)
      },
      TemplateElement(node) {
        check(node, node.value.raw)
      },
      MemberExpression(node) {
        if (
          node.computed &&
          node.object.type === 'Identifier' &&
          node.object.name === 'CHART_COLOURS' &&
          node.property.type === 'Literal' &&
          typeof node.property.value === 'number' &&
          node.property.value > 0
        ) {
          context.report({
            node,
            message:
              'CHART_COLOURS[n] for n > 0 picks a slot by hand. Use a role (ZONE_COLOURS, UNIT_COLOURS) or index series in order.',
          })
        }
      },
    }
  },
}

export default defineConfig([
  globalIgnores(['dist', '.output', '.nitro', '.tanstack', 'src/routeTree.gen.ts']),
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
    plugins: {
      colours: { rules: { 'chart-colour-roles': chartColourRoles } },
    },
    rules: {
      'colours/chart-colour-roles': 'error',
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
    // The role definitions and the side-colour picker are where slots are named.
    files: [
      'src/lib/chart-colours.ts',
      'src/components/game-live/live-utils.ts',
      'src/components/game-live/useSideColours.ts',
    ],
    rules: { 'colours/chart-colour-roles': 'off' },
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
