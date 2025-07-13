import { pfusch, html, script, toElem } from "../pfusch.js";

const setTabActivityState = (state) => (element, index) => {
    if (state.activeIndex === index) {
        element.classList.add("active");
    } else {
        element.classList.remove("active");
    }
}

/*
<tab-panel>
    <tab-item header="Tab 1">Content</tab-item>
    <tab-item header="Tab 2">Content</tab-item>
    <tab-item header="Tab 3">Content</tab-item>
</tab-panel>

=>

<tab-panel>
    #shadow-root
        ul(role="tablist")
            li a(role="tab", aria-selected="true") Tab 1
            li a(role="tab", aria-selected="false") Tab 2
            li a(role="tab", aria-selected="false") Tab 3
        section(role="tabpanel", 'aria-labeledby'="Tab 1") Content
        section(role="tabpanel", 'aria-labeledby'="Tab 2", hidden) Content
        section(role="tabpanel", 'aria-labeledby'="Tab 3", hidden) Content
*/

pfusch("tab-panel", { activeIndex: 0, as: "slotted" }, (state, trigger, children) => [
    script(() => {
        // if we have a hash, set the activeIndex to that value
        const hash = window.location.hash;
        if (hash) {
            // urldecode the hash
            const decoded = decodeURIComponent(hash); 

            const index = [...children]
                .filter(child => child.tagName === "TAB-ITEM")
                .findIndex(item => item.getAttribute("header") === decoded.slice(1));
            if (index > -1) {
                state.activeIndex = index;
            }
        }
    }),
    ...children
        .filter(child => child.tagName === "TAB-ITEM")
        .reduce((acc, child, index) => {
            console.log("Adding child to tabs", child, index, state.activeIndex);
            const header = child.getAttribute("header");
            const selected = state.activeIndex === index;
            acc[0].add(html.li({ role: "presentation" },
                html.a({
                    role: "tab",
                    id: header,
                    href: `#${header}`,
                    "aria-selected": selected,
                    click: () => {
                        state.activeIndex = index;
                    }
                }, header)));
            acc[1].push(
                html.section({
                    role: "tabpanel",
                    ...(selected ? { "aria-hidden": "false" } : { hidden: true, "aria-hidden": "true" }),
                    "aria-labelledby": header
                }, ...(selected ? [...child.childNodes].map(toElem) : [])));
            return acc;
        }, [html.ul({ role: "tablist" }), []])
        .flat(),
])