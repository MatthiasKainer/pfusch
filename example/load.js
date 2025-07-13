import { html, pfusch } from "../pfusch.js";
import { buttonStyle } from './button.style.js';

pfusch("load-script", {load: "", src: "", as: "interactive"}, (state) => [
    buttonStyle("primary"),
    html.button({
        id: state.load,
        click: () => {
            const script = document.createElement("script");
            script.src = state.src;
            script.type = "module";
            document.head.appendChild(script);
        }
    }, "Load web component (this will only work once)")
])