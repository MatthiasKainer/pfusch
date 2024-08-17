import { pfusch, script, html } from "../pfusch.js";

pfusch("a-tab-item", () => [
    script((element) => {
        
    })
])

pfusch("a-tab-header", { click: (e) => {} }, () => [])

pfusch("a-tab", { activeIndex: 0 }, state => [
    html[`a-tab-header`]({
        as: "template",
        apply: (element, index) => {
            if (state.activeIndex === index) {
                element.classList.add("active");
            } else {
                element.classList.remove("active");
            }
        },
        click: (e) => {
            if (e.target.tagName !== "A-TAB-HEADER") 
                return;
            console.log("clicked", e.target);
            state.activeIndex = e.target.index;
        },
    }),
    html[`a-tab-item`]({
        as: "template",
        apply: (element, index) => {
            if (state.activeIndex === index) {
                element.classList.add("active");
            } else {
                element.classList.remove("active");
            }
        }
    })
])