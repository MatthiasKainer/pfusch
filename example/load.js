import { html, pfusch } from "../pfusch.js";
import { buttonStyle } from './button.style.js';

pfusch("load-script", {load: "", src: ""}, ({load, src}) => [
    buttonStyle("primary"),
    html.button({
        id: load,
        click: () => {
            const script = document.createElement("script");
            script.src = src;
            script.type = "module";
            document.head.appendChild(script);
        }
    }, "Load web component (this will only work once)")
])