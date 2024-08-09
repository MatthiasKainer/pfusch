import { pfusch, html } from '../pfusch.js';

pfusch("hello-world", () => [
    html.div(
        html.h1`hello`,
        html.p`world!`
    )
]);