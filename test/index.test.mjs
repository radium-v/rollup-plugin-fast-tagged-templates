import dedent from "dedent";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { rollup } from "rollup";
import FASTTaggedTemplates from "../index.mjs";

const realFs = (folderName = "", files = []) => {
    const tmpDir = path.join(import.meta.dirname, ".temp", folderName);
    Object.keys(files).forEach(file => {
        const absolute = path.join(tmpDir, file);
        fs.mkdirSync(path.dirname(absolute), { recursive: true });
        fs.writeFileSync(absolute, files[file], "utf8");
    });
    return tmpDir;
};

const getTestName = t => (t.fullName || "").split(" > ").slice(1).join(" ");

const build = async ({
    input = "./fixture/index.js",
    sourcemap = false,
    plugins = [],
    dir = ".",
    format = "esm",
    external,
} = {}) => {
    const build = await rollup({
        input: [...(Array.isArray(input) ? input : [input])].map(v =>
            path.resolve(dir, v)
        ),
        plugins,
        external,
    });
    const { output } = await build.generate({
        format,
        sourcemap,
        exports: "auto",
    });
    return output;
};

describe("FASTTaggedTemplates", () => {
    test("should return a Rollup plugin object", async () => {
        const plugin = FASTTaggedTemplates();

        assert.strictEqual(typeof plugin, "object");
        assert.strictEqual(plugin.name, "rollup-plugin-fast-tagged-templates");
        assert.strictEqual(typeof plugin.transform, "function");
    });

    test("should transform contents of the css tagged template literal", async t => {
        const plugins = FASTTaggedTemplates();
        const input = "component.styles.js";

        const dir = realFs(getTestName(t), {
            [input]: dedent`
                export const styles = css\`
                    :host {
                        color: red;
                    }
                \`;\n
            `,
        });

        const output = await build({ dir, input, plugins });

        const [{ code }] = output;

        assert.match(code, /css\`:host\{color:red\}\`;/);
    });

    test("should transform contents of the css.partial tagged template literal", async t => {
        const plugins = FASTTaggedTemplates();
        const input = "component.styles.js";

        const dir = realFs(getTestName(t), {
            [input]: dedent`
                export const styles = css.partial\`
                    :host {
                        color: red;
                    }
                \`;\n
            `,
        });

        const output = await build({ dir, input, plugins });

        const [{ code }] = output;

        assert.match(code, /css\.partial`:host\{color:red\}`/);
    });

    test("should transform contents of a css tagged template literal with expressions", async t => {
        const plugins = FASTTaggedTemplates();
        const input = "component.styles.js";

        const dir = realFs(getTestName(t), {
            [input]: dedent`
                export const styles = css\`
                    :host {
                        color: \${color};
                    }
                \`;\n
            `,
        });

        const output = await build({ dir, input, plugins });

        const [{ code }] = output;

        assert.match(code, /css\`:host\{color:\$\{color\}\}\`;/);
    });

    test("should maintain the correct selector chain in a css tagged template literal with expressions", async t => {
        const plugins = FASTTaggedTemplates();
        const input = "component.styles.js";

        const dir = realFs(getTestName(t), {
            [input]: dedent`
                export const styles = css\`
                    :host(\${selector}) ::slotted(*) {
                        color: red;
                    }
                \`;\n
            `,
        });

        const output = await build({ dir, input, plugins });

        const [{ code }] = output;

        assert.match(code, /css\`:host\(\${selector}\) ::slotted\(\*\){color:red}\`;/);
    });

    test("should remove comments from contents of the css tagged template literal", async t => {
        const plugins = FASTTaggedTemplates();
        const input = "component.styles.js";

        const dir = realFs(getTestName(t), {
            [input]: dedent`
                export const styles = css\`
                    /* comment */
                    :host {
                        /* comment */
                        color: red;
                        /* comment */
                    }
                \`;\n
            `,
        });

        const output = await build({ dir, input, plugins });

        const [{ code }] = output;

        assert.match(code, /css\`:host\{color:red\}\`;/);
    });

    test("should NOT remove comments that contain the replacer token from contents of the css tagged template literal", async t => {
        const plugins = FASTTaggedTemplates();
        const input = "component.styles.js";

        const dir = realFs(getTestName(t), {
            [input]: dedent`
                export const styles = css\`
                    /* \${"a"} */
                    :host {
                        /* \${"b"} */
                        color: red;
                        /* \${"c"} */
                    }
                \`;\n
            `,
        });

        const output = await build({ dir, input, plugins });

        const [{ code }] = output;

        assert.match(
            code,
            /css\`\/\* \$\{"a"\} \*\/:host\{\/\* \$\{"b"\} \*\/color:red;\/\* \$\{"c"\} \*\/\}`;/
        );
    });

    test("should transform contents of the html tagged template literal", async t => {
        const plugins = FASTTaggedTemplates();
        const input = "component.template.js";

        const dir = realFs(getTestName(t), {
            [input]: dedent`
                export const template = html\`
                    <div>
                        <slot></slot>
                    </div>
                \`;\n
            `,
        });

        const output = await build({ dir, input, plugins });

        const [{ code }] = output;

        assert.match(code, /html\`<div><slot><\/slot><\/div>\`;/);
    });

    test("should transform contents of the html.partial tagged template literal", async t => {
        const plugins = FASTTaggedTemplates();
        const input = "component.template.js";

        const dir = realFs(getTestName(t), {
            [input]: dedent`
                export const template = html.partial(\`
                    <div>
                        <slot></slot>
                    </div>
                \`);\n
            `,
        });

        const output = await build({ dir, input, plugins });

        const [{ code }] = output;

        assert.match(code, /html.partial\(\`<div><slot><\/slot><\/div>\`\);/);
    });
});
