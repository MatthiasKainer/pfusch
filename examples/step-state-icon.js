// A deliberately plain, dependency-free "motion engine": the kind of class a designer
// hands over next to a React wrapper. It owns a piece of DOM and animates it imperatively.
// pfusch hosts it through `keep` + `mount`/`unmount` — see examples/animation.html.

export const STEP_STATES = ['plan', 'run', 'done', 'error'];

const GLYPHS = {
    plan: 'M12 7.5v4.8l3.2 2',
    run: 'M10.2 8.2 16 12l-5.8 3.8z',
    done: 'M8 12.4l2.9 2.9L16.6 9.5',
    error: 'M9 9l6 6M15 9l-6 6'
};

const COLORS = { plan: '#7c8b9c', run: '#2563eb', done: '#16a34a', error: '#dc2626' };

const MARKUP = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle class="ring" cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.35"></circle>
  <path class="glyph" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="${GLYPHS.plan}"></path>
</svg>`;

const POP = [
    { transform: 'scale(0.72)', opacity: 0.35 },
    { transform: 'scale(1.08)', opacity: 1, offset: 0.6 },
    { transform: 'scale(1)', opacity: 1 }
];

export class StepStateIcon {
    constructor(host, { state = 'plan', duration = 260 } = {}) {
        this.host = host;
        this.duration = duration;
        this.state = null;
        this.animations = [];
        // Server-rendered markup wins: only build the DOM when there is none, so hydrating
        // over an existing <svg> does not throw the server's output away.
        if (!host.firstElementChild) host.innerHTML = MARKUP;
        this.svg = host.firstElementChild;
        this.glyph = this.svg.querySelector('.glyph');
        this.snapTo(state);
    }

    // Animated transition. A repeat of the current state is a no-op, so a parent that
    // re-renders for unrelated reasons never restarts the animation.
    set(next) {
        if (!GLYPHS[next] || next === this.state || !this.svg) return;
        this.#apply(next);
        this.animations = this.animations.filter(a => a.playState === 'running');
        this.animations.push(this.svg.animate(POP, { duration: this.duration, easing: 'cubic-bezier(.2,.8,.2,1)' }));
    }

    // Same visual result, no motion — what a reduced-motion viewer gets.
    snapTo(next) {
        if (!GLYPHS[next] || !this.svg) return;
        this.#apply(next);
    }

    destroy() {
        this.animations.forEach(a => { try { a.cancel(); } catch { } });
        this.animations = [];
        this.svg = this.glyph = null;
    }

    // The engine writes to its own subtree only. Attributes on the host belong to the
    // pfusch template, which removes anything it did not declare on the next render.
    #apply(next) {
        this.state = next;
        this.glyph.setAttribute('d', GLYPHS[next]);
        this.svg.style.color = COLORS[next];
        this.svg.setAttribute('data-state', next);
    }
}
