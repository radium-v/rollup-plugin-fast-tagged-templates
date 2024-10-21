import { asyncWalk } from "estree-walker";
import { minify as minifyHTML } from "html-minifier-terser";
import MagicString from "magic-string";

/** @returns {import("rollup").Plugin} */
export default function FASTTaggedTemplates(
    options = {
        html: true,
        css: true,
        minifyHTMLOptions: {},
    }
) {
    /** @type {string} */
    const replacer = "🦄";

    /** @returns {Promise<string>} */
    async function html(/** @type {string} */ source) {
        source = await minifyHTML(source, {
            collapseWhitespace: true,
            removeComments: true,
            removeAttributeQuotes: true,
            ignoreCustomComments: [new RegExp(replacer)],
            ...options.minifyHTMLOptions,
        });

        source = source.trim();

        return source;
    }

    /** @returns {Promise<string>} */
    async function css(/** @type {string} */ source) {
        // remove comments, unless they contain a replacer token
        source = source.replace(/\/\*[\s\S]*?\*\//g, match =>
            match.includes(replacer) ? match : ""
        );

        // Remove spaces before and after the following characters: + ~ > : , / { }
        source = source.replace(/\s*([+~>:,;/{}])\s+/g, "$1");

        // Remove the last semicolon in each block
        source = source.replace(/;}/g, "}");

        // Collapse all remaining sequences to a single space
        source = source.replace(/\s+/g, " ");

        // Remove leading and trailing spaces
        source = source.trim();

        return Promise.resolve(source);
    }

    return {
        name: "rollup-plugin-fast-tagged-templates",
        async transform(code, id) {
            /** @type {{ [key: string]: (source: string) => Promise<string> }} */
            const transformers = {};

            if (typeof options.html === "boolean" && options.html) {
                transformers.html = html;
            } else if (typeof options.html === "function") {
                transformers.html = options.html;
            }

            if (typeof options.css === "boolean" && options.css) {
                transformers.css = css;
            } else if (typeof options.css === "function") {
                transformers.css = options.css;
            }

            const magicString = new MagicString(code);
            const ast = this.parse(code);

            await asyncWalk(ast, {
                async enter(node) {
                    /** @type {string} */
                    let name;

                    if (
                        node.type === "TaggedTemplateExpression" ||
                        node.type === "CallExpression"
                    ) {
                        /** @type {import("estree").Identifier | import("estree").MemberExpression} */
                        const tag = node.tag ?? node.callee;

                        if (tag.type === "Identifier") {
                            name = tag.name;
                        }

                        if (
                            tag.type === "MemberExpression" &&
                            tag.property.name === "partial"
                        ) {
                            name = tag.object.name;
                        }
                    }

                    /** @type {import("rollup").RollupAstNode<import("estree").TemplateElement>[]} */
                    const quasis = node.quasi?.quasis ?? node.arguments?.[0]?.quasis;

                    if (!name || !quasis) {
                        return;
                    }

                    const replacedString = quasis
                        .map(({ value: { raw } }) => raw)
                        .join(replacer);
                    const newValue = (await transformers[name](replacedString)).split(
                        replacer
                    );

                    for (let i = 0; i < quasis.length; i++) {
                        const { start, end } = quasis[i];
                        if (start !== end) {
                            magicString.overwrite(start, end, newValue[i]);
                            continue;
                        }
                    }
                },
            });

            return {
                code: magicString.toString(),
                map: magicString.generateMap({ hires: true }),
            };
        },
    };
}
