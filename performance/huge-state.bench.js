import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { setupDomStubs } from '../unit-tests/pfusch-stubs.js';

const FORM_STATE_ENTRY_COUNT = 25_000;
const FAST_STATE_ENTRY_COUNT = 2_500_000;
const UPDATES_PER_SAMPLE = 40;
const WARMUP_UPDATES = 5;
const SAMPLE_COUNT = 9;
const source = await readFile(new URL('../pfusch.js', import.meta.url), 'utf8');
const sourceHash = createHash('sha256').update(source).digest('hex');
const { restore } = setupDomStubs();
const { pfusch, html } = await import(`../pfusch.js?benchmark=${sourceHash}`);

const percentile = (sorted, ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
const summarize = samples => {
  const sorted = [...samples].sort((a, b) => a - b);
  const totalMs = samples.reduce((total, sample) => total + sample, 0);
  return {
    samplesMs: samples.map(sample => Number(sample.toFixed(3))),
    medianMs: Number(percentile(sorted, 0.5).toFixed(3)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(3)),
    meanMs: Number((totalMs / samples.length).toFixed(3)),
    medianPerUpdateMs: Number((percentile(sorted, 0.5) / UPDATES_PER_SAMPLE).toFixed(4))
  };
};

const flushRender = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const measureScenario = async ({ tagName, formAssociated }) => {
  const huge = Object.fromEntries(Array.from(
    { length: formAssociated ? FORM_STATE_ENTRY_COUNT : FAST_STATE_ENTRY_COUNT },
    (_, index) => [`entry${index}`, `value-${index}`]
  ));
  pfusch(tagName, { tick: 0, huge }, state => [html.span(String(state.tick))]);
  const component = document.createElement(tagName);
  if (formAssociated) component.setAttribute('name', 'benchmark');
  document.body.appendChild(component);

  for (let index = 0; index < WARMUP_UPDATES; index++) {
    component.state.tick++;
    await flushRender();
  }

  const samples = [];
  for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
    const startedAt = performance.now();
    for (let update = 0; update < UPDATES_PER_SAMPLE; update++) {
      component.state.tick++;
      await flushRender();
    }
    samples.push(performance.now() - startedAt);
  }

  component.remove();
  await flushRender();
  return summarize(samples);
};

const result = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  runtime: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch
  },
  source: {
    path: 'pfusch.js',
    sha256: sourceHash
  },
  workload: {
    stateEntryCount: { "namedFormControl": FORM_STATE_ENTRY_COUNT, "unnamedComponent": FAST_STATE_ENTRY_COUNT },
    updatesPerSample: UPDATES_PER_SAMPLE,
    warmupUpdates: WARMUP_UPDATES,
    sampleCount: SAMPLE_COUNT,
    templateReads: ['tick']
  },
  scenarios: {
    unnamedComponent: await measureScenario({ tagName: 'perf-unnamed-state', formAssociated: false }),
    namedFormControl: await measureScenario({ tagName: 'perf-named-state', formAssociated: true })
  }
};

restore();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
