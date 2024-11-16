import { html, pfusch, script } from "../pfusch.js";

pfusch("show-if", { query: "", show: false, as: "slotted" }, (state) => [
    script(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const query = state.query.startsWith('!') ? state.query.slice(1) : state.query;
        const show = urlParams.get(query);
        state.show = state.query.startsWith('!') ? !show : show;
    }),
    state.show ? html.slot() : "hidden",
]);