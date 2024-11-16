import { css } from '../pfusch.js';

export const todoItemStyle = css`
        li {
            list-style: none;
            background-color: hsl(0, 0%, 50%);
            border-radius: 0.5rem;
            padding: 1rem;
            margin: 0.5rem;
            cursor: pointer;
        }
        li:hover { 
            background-color: hsl(0, 0%, 40%);
            color: var(--accent-color); 
        }
        li:active {
            background-color: hsl(0, 0%, 45%); 
        }
        li.completed {
            text-decoration: line-through;
            color: var(--primary-background-color); 
        }
    `;

export const todoAddStyle = css`
input {
    font-family: var(--font-family);
    border: 1px solid hsl(0, 0%, 50%);
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 0.5rem;
    cursor: pointer;
}

input:hover {
    background-color: hsl(0, 0%, 40%);
    color: var(--accent-color);
}

input:active {
    background-color: hsl(0, 0%, 45%);
}
`;