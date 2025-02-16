import {parsers as babelParsers} from 'prettier/plugins/babel';
import {parsers as typescriptParsers} from 'prettier/plugins/typescript';
import * as parser from '@babel/parser';
import * as _traverse from '@babel/traverse';
import * as _generate from '@babel/generator';

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
            // Keep the 'React' import
            if (path.node.source.value === 'react') {
                return;
            }

            // Keep imports that don't import any specific thing
            if (path.node.specifiers.length === 0) {
                return;
            }

            path.node.specifiers = path.node.specifiers.filter((specifier: any) => {
                return specifier.type === 'ImportDefaultSpecifier' || usedIdentifiers.has(specifier.local.name);
            });

            if (path.node.specifiers.length === 0) {
                path.remove();
            }
        },
    });

    const {code: transformedCode} = generate(ast, {retainLines: true});

    return transformedCode;
}

const preprocess = (code: string): string => {
    // Transform the code to remove unused imports
    const transformedCode = removeUnusedImports(code);

    // Split the transformed code into lines
    const transformedLines = transformedCode.split('\n');

    // Find the line where the import statements end
    let importEndLine = 0;
    let insideImport = false;
    for (let i = 0; i < transformedLines.length; i++) {
        const line = transformedLines[i].trim();
        if (line.startsWith('import') || line.startsWith('//') || line.startsWith('/*') || insideImport) {
            if (line.endsWith(';') || line.endsWith('*/')) {
                insideImport = false;
            } else if (line.startsWith('import') || line.startsWith('/*')) {
                insideImport = true;
            }
        } else if (line !== '') {
            importEndLine = i;
            break;
        }
    }

    // Extract the processed import statements
    const processedImports = transformedLines.slice(0, importEndLine).join('\n');

    // Extract the rest of the original code
    const originalLines = code.split('\n');
    const nonImportCode = originalLines.slice(importEndLine).join('\n');

    // Combine processed imports with the rest of the original code
    const finalCode = `${processedImports}\n${nonImportCode}`;

    return finalCode;
};

export const parsers = {
    babel: {
        ...babelParsers.babel,
        preprocess,
    },
    typescript: {
        ...typescriptParsers.typescript,
        preprocess,
    },
};
