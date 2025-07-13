import { css } from '../pfusch.js';

export const todoItemStyle = css`
        li {
            list-style: none;
            background-color: hsl(0, 0%, 50%);
            border-radius: 0.5rem;
            margin: 0.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
        }
        li:hover { 
            background-color: hsl(0, 0%, 40%);
            color: var(--accent-color); 
        }
        li:active {
            background-color: hsl(0, 0%, 45%); 
        }
        li label, li button {
            cursor: pointer;
        }
        li input {
            margin-left: 1rem;
        }
        li label {
            width: 100%;
            padding: 2rem 1rem;
        }
        li button {
            background-color: hsl(0, 0%, 50%);
            border: none;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-left: auto;
            cursor: pointer;
        }
        :checked + label {
            text-decoration: line-through;
            color: var(--primary-background-color); 
        }
    `;

export const todoAddStyle = css`
:host form {
    display: flex;
    justify-content: left;
    align-items: center;
    flex-direction: row;
    gap: 0;
    position: relative;
}
i {
    position: absolute;
    left: 1rem;
}
input {
    font-family: var(--font-family);
    border: 1px solid hsl(0, 0%, 50%);
    border-radius: 0.5rem;
    padding: 1rem;
    padding-left: 3rem;
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