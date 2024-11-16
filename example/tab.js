import { pfusch, html, script } from "../pfusch.js";

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
        },
    }),
    html[`a-tab-item`]({
        as: "interactive",
        apply: setTabActivityState(state)
    }),
    script(() => {
        // if we have a query parameter a-tab-index, set the activeIndex to that value
        const urlParams = new URLSearchParams(window.location.search);
        const tabIndex = urlParams.get('a-tab-index');
        if (tabIndex) {
            state.activeIndex = parseInt(tabIndex);
        }  
    })
])