# rollup-plugin-fast-tagged-templates

This Rollup plugin compresses tagged template literals for [FAST Element](https://fast.design/) templates and styles.

## Supported tags

Tagged template literals:

- [`html`](https://fast.design/docs/getting-started/html-templates)
- [`css`](https://fast.design/docs/getting-started/css-templates)

Additionally, the `css.partial` tagged template literal and `html.partial()` function are supported.

## Installation

```bash
npm install --save-dev rollup-plugin-fast-tagged-templates
```

## Usage

`css` templates are compressed with a custom minifier, which removes whitespace and comments. `html` templates are compressed with [html-minifier-terser](https://github.com/terser/html-minifier-terser). The default options are intentionally set to be conservative, with only `collapseWhitespace` and `removeComments` enabled. For both CSS and HTML, comments are preserved if they contain expressions.

### Basic usage

By default, the plugin will compress both HTML and CSS tagged templates:

```js
import { rollup } from "rollup";
import fastTaggedTemplates from "rollup-plugin-fast-tagged-templates";

rollup({
  input: "src/index.js",
  plugins: [fastTaggedTemplates()],
});
```

#### Minification examples

##### HTML

```diff
- html`
-   <template
-     @click="${(x, c) => x.clickHandler(c.event)}"
-   >
-     <slot ${ref("slot")}></slot>
-   </template>
- `;
+ html`<template @click="${(x,c)=>x.clickHandler(c.event)}"><slot ${ref("slot")}></slot></template>`;
```

##### CSS

```diff
- export const styles = css`
-   ${display("block")}
-   :host {
-     padding: ${paddingToken};
-   }
-
-   :host(${focusVisible}) ::slotted(*) {
-     outline: 2px solid ${focusVisible};
-   }
- `;
+ export const styles = css`${display("block")} :host{padding:${paddingToken}}:host(${focusVisible}) ::slotted(*){outline:2px solid ${focusVisible}}`;
```

### Disabling compression

To disable compression for either type, set the `html` or `css` options to `false`:

```js
import { rollup } from "rollup";
import fastTaggedTemplates from "rollup-plugin-fast-tagged-templates";

rollup({
  input: "src/index.js",
  plugins: [
    fastTaggedTemplates({
      // Disable compression for HTML templates
      html: false,
    }),
  ],
});
```

### HTML minification options

Options for `html-minifier-terser` can be passed to the `minifyHTMLOptions` option. These will be merged with the default options.

```js
import { rollup } from "rollup";
import fastTaggedTemplates from "rollup-plugin-fast-tagged-templates";

rollup({
  input: "src/index.js",
  plugins: [
    fastTaggedTemplates({
      minifyHTMLOptions: {
        removeAttributeQuotes: true,
      },
    }),
  ],
});
```

### Overriding the default transformations

To override the default minification functions entirely, pass a custom function to the corresponding option. Each function should take the source string as an argument and return the compressed string.

```js
import { rollup } from "rollup";
import fastTaggedTemplates from "rollup-plugin-fast-tagged-templates";

rollup({
  input: "src/index.js",
  plugins: [
    fastTaggedTemplates({
      html(source) {
        // Replace the default minification function for html templates
        return source;
      },

      css(source) {
        // Replace the default minification function for css templates
        return source;
      },
    }),
  ],
});
```

### Using with TypeScript

If you're using `@rollup/plugin-typescript` or `rollup-plugin-esbuild`, make sure to use the plugin after transpiling:

```js
import typescript from "@rollup/plugin-typescript";
import fastTaggedTemplates from "rollup-plugin-fast-tagged-templates";

rollup({
  input: "src/index.ts",
  plugins: [typescript(), fastTaggedTemplates()],
});
```

Additionally, minification has to be handled after the plugin transforms the source. For plugins like `rollup-plugin-esbuild`, the `minify` option should be set to `false` and the separate `minify` plugin should be used. See the [`rollup-plugin-esbuild` README](https://github.com/egoist/rollup-plugin-esbuild?tab=readme-ov-file#standalone-minify-plugin) for more information.

```js
import esbuild, { minify } from "rollup-plugin-esbuild";
import fastTaggedTemplates from "rollup-plugin-fast-tagged-templates";

rollup({
  input: "src/index.ts",
  plugins: [esbuild({ minify: false }), fastTaggedTemplates(), minify()],
});
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more information.

## License

MIT
