import { css } from 'https://matthiaskainer.github.io/pfusch/pfusch.min.js';

export const buttonStyle = (type) => css`
    button {
        background-color: var(--${type}-color);
        border-radius: 8px;
        border-style: none;
        box-sizing: border-box;
        color: #FFFFFF;
        cursor: pointer;
        display: inline-block;
        font-size: 14px;
        font-weight: 500;
        height: 40px;
        line-height: 20px;
        list-style: none;
        margin: 0;
        outline: none;
        padding: 10px 16px;
        position: relative;
        text-align: center;
        text-decoration: none;
        transition: color 100ms;
        vertical-align: baseline;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        margin: 0.1rem;
    }

    button:hover,
    button:focus {
        background-color: var(--${type}-color-state);
    }

    button:active { background-color: var(--${type}-color);color: var(--${type}-color-state); }
    
    @media screen and (max-width: 600px) {button { width: 100%; }}
    `;