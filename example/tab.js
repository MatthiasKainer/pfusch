import { pfusch, html } from "../pfusch.js";

const setTabActivityState = (state) => (element, index) => {
    if (state.activeIndex === index) {
        element.classList.add("active");
    } else {
        element.classList.remove("active");
    }
}

pfusch("a-tab", { activeIndex: 0 }, state => [
    html[`a-tab-header`]({
        as: "interactive",
        apply: setTabActivityState(state),
        click: (e) => {
            state.activeIndex = e.target.index;
            console.log(state.activeIndex);
        },
    }),
    html[`a-tab-item`]({
        as: "interactive",
        apply: setTabActivityState(state)
    })
])