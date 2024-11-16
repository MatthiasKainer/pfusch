import { pfusch, css, html, script } from '../pfusch.js';


pfusch("star-rating", { id: "rating", count: 5, value: 0, name: "rating" }, (state) => [
    css`
    :host {
        display: flex;
        flex-direction: row-reverse;
        justify-content: center;
        padding: 10px;
        width: 100%;
        height: 50px;
    }
    input {
        display: none;
    }
    label {
        font-size: 50px;
        color: #ccc;
        cursor: pointer;
        transition: color 0.5s;
    }
    input:checked ~ label, label:hover, label:hover ~ label {
        color: #f5b301;
    }
    `,
    ...Array.from({ length: state.count }, (_, i) => {
        const value = state.count - i;
        return [
            html.input({
                type: "radio",
                id: `${state.id}-star-${value}`,
                name: state.name,
                value,
                change: (e) => state.value = e.target.value,
                ...state.value == value && { checked: true }
            }),
            html.label({ for: `${state.id}-star-${value}` }, "★")
        ];
    }).flat()
])

function tryGetRating() {
    const rating = new URLSearchParams(window.location.search).get("rating");
    return rating ? JSON.parse(rating) : null;
}

pfusch("result-rating", {value: tryGetRating()}, (state) => [
    html.div(
        html.span(state.value?.value ?? "unknown"),
    )
])

pfusch("result-comment", {value: new URLSearchParams(window.location.search).get("comment")}, (state) => [
    html.div(state.value)
])