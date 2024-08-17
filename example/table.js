import { pfusch, script, html } from '../pfusch.js';

pfusch("table-wrapper", { url: "/example/items.json", items: [], selectedId: null }, (state) => [
    script(async () => {
        const response = await fetch(`${state.url}`);
        setTimeout(() => {
            response.json().then((data) => {
                state.items = data;
            });
        }, 1000);
    }),
    html.tbody({
        id: "table-body",
    }, ...state.items.map(item => html.tr(
        html.td(item.name),
        html.td(item.price),
        html.td(item["in stock"] ? "yes" : "no")
    )))
]);
