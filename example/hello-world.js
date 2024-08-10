import { pfusch, html, css } from 'https://matthiaskainer.github.io/pfusch/pfusch.js';

pfusch("hello-world", () => [
    css(`h1, h2 { text-align: center; }`),
    html.div(
        html.h2`hello ${"world"}`,
        html.h1`pfusch!`
    )
]);