const {parsers: babelParsers} = require('prettier/plugins/babel');
const {parsers: typescriptParsers} = require('prettier/plugins/typescript');

const parser = require('@babel/parser');
const _traverse = require('@babel/traverse');
const _generate = require('@babel/generator');

const generate = _generate.default;
const traverse = _traverse.default;

function removeUnusedImports(code: string): string {
    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
    });

    const usedIdentifiers = new Set<string>();

    traverse(ast, {
        Identifier(path: any) {
            if (path.isReferencedIdentifier()) {
                usedIdentifiers.add(path.node.name);
            }
        },
        JSXIdentifier(path: any) {
            if (path.isReferencedIdentifier()) {
                usedIdentifiers.add(path.node.name);
            }
        },
    });

    traverse(ast, {
        ImportDeclaration(path: any) {
            // Keep imports that don't import any specific thing
            if (path.node.specifiers.length === 0) {
                return;
            }

            path.node.specifiers = path.node.specifiers.filter(
                (specifier: any) =>
                    specifier.type === 'ImportDefaultSpecifier' || usedIdentifiers.has(specifier.local.name)
            );

            // Keep the 'React' import
            if (path.node.source.value === 'react') {
                return;
            }

            if (path.node.specifiers.length === 0) {
                path.remove();
            }
        },
    });

    const {code: transformedCode} = generate(ast, {retainLines: true});

    return transformedCode;
}

const preprocess = (code: string): string => {
    const transformedCode = removeUnusedImports(code);
    return transformedCode;
};

module.exports = {
    parsers: {
        babel: {
            ...babelParsers.babel,
            preprocess,
        },
        typescript: {
            ...typescriptParsers.typescript,
            preprocess,
        },
    },
};
