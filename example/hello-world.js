import { pfusch, html } from 'https://github.com/MatthiasKainer/pfusch/blob/main/pfusch.js';

pfusch("hello-world", () => [
    html.div(
        html.h1`hello`,
        html.p`world!`
    )
]);