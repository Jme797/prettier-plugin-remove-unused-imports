import * as prettier from 'prettier';
import {parsers} from '../src/index';

const format = async (code: string) => {
    return await prettier.format(code, {
        parser: 'typescript',
        plugins: [{parsers}],
        singleQuote: true,
        tabWidth: 4,
    });
};

describe('Prettier Plugin Remove Unused Imports', () => {
    it('removes named imports from react but not the React default import', async () => {
        const code = `
            import React, { useState, useEffect } from 'react';
            const App = () => <div>Hello World</div>;
        `;
        const formatted = await format(code);
        expect(formatted).toBe(`import React from 'react';\n` + `\n` + `const App = () => <div>Hello World</div>;\n`);
    });

    it("removes named imports that aren't used in the document", async () => {
        const code = `
            import { useState, useEffect } from 'react';
            const App = () => <div>Hello World</div>;
        `;
        const formatted = await format(code);
        expect(formatted).toBe(`const App = () => <div>Hello World</div>;\n`);
    });

    it("doesn't remove imports that are used", async () => {
        const code = `
            import { useState, useEffect } from 'react';
            const App = () => {
                const [state, setState] = useState(0);
                useEffect(() => {
                    console.log(state);
                }, [state]);
                return <div>Hello World</div>;
            };
        `;
        const formatted = await format(code);
        expect(formatted).toBe(
            `import { useState, useEffect } from 'react';\n` +
                `\n` +
                `const App = () => {\n` +
                `    const [state, setState] = useState(0);\n` +
                `    useEffect(() => {\n` +
                `        console.log(state);\n` +
                `    }, [state]);\n` +
                `    return <div>Hello World</div>;\n` +
                `};\n`
        );
    });

    it("doesn't remove type imports that are used", async () => {
        const code = `
            import { FC } from 'react';
            const App: FC = () => <div>Hello World</div>;
        `;
        const formatted = await format(code);
        expect(formatted).toBe(
            `import { FC } from 'react';\n` + `\n` + `const App: FC = () => <div>Hello World</div>;\n`
        );
    });

    it("removes type imports that aren't used", async () => {
        const code = `
            import { FC, ReactNode } from 'react';
            const App: FC = () => <div>Hello World</div>;
        `;
        const formatted = await format(code);
        expect(formatted).toBe(
            `import { FC } from 'react';\n` + `\n` + `const App: FC = () => <div>Hello World</div>;\n`
        );
    });

    it("doesn't change the formatting of anything outside the top level import statements", async () => {
        const code = `
            import { useState, useEffect } from 'react';
            const App = () => {
                const [state, setState] = useState(0);
                useEffect(() => {
                    console.log(state);
                }, [state]);
                return <div>Hello World</div>;
            };
        `;
        const formatted = await format(code);
        expect(formatted).toBe(
            `import { useState, useEffect } from 'react';\n` +
                `\n` +
                `const App = () => {\n` +
                `    const [state, setState] = useState(0);\n` +
                `    useEffect(() => {\n` +
                `        console.log(state);\n` +
                `    }, [state]);\n` +
                `    return <div>Hello World</div>;\n` +
                `};\n`
        );
    });
});
