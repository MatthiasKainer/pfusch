import { html, pfusch } from "../pfusch.js";
import { buttonStyle } from './button.style.js';

pfusch("load-script", {src: ""}, ({src}) => [
    buttonStyle("primary"),
    html.button({
        click: () => {
            const script = document.createElement("script");
            script.src = src;
            script.type = "module";
            document.head.appendChild(script);
        }
    }, "Load script (this will only work once)")
])