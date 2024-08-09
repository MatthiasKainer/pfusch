import { pfusch, html } from 'https://matthiaskainer.github.io/pfusch/pfusch.js';

pfusch("hello-world", () => [
    html.div(
        html.h1`hello`,
        html.p`world!`
    )
]);