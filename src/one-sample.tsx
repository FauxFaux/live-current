import type { Sample } from './app.tsx';

const SAMPLES_PER_WAVE = 400;

export function OneSample({ sample, ma }: { sample: Sample; ma: number }) {
  const { ch1, ch2 } = sample;
  const ch2c = [...chunks(ch2, SAMPLES_PER_WAVE)];
  const reds = ['ff', 'dd', 'bb', '99', '77', '55', '33', '11'];
  const now = new Date();
  const maLine: [number, number][] = [];
  if (ma > 0) {
    for (let i = 0; i < ch2.length; i += ma) {
      maLine.push([
        ma,
        ch2.slice(i, i + ma).reduce((a, b) => a + b, 0) /
          Math.min(ma, ch2.length - i),
      ]);
    }
  }
  return (
    <svg
      width={SAMPLES_PER_WAVE}
      height="400"
      class={'one-sample'}
      viewBox={'0 0 ' + SAMPLES_PER_WAVE + ' 400'}
    >
      <line x1="0" x2={0} y1="0" y2="400" stroke="gray" strokeWidth="0.5" />
      <line
        x1="0"
        x2={SAMPLES_PER_WAVE}
        y1="200"
        y2="200"
        stroke="gray"
        strokeWidth="0.5"
      />
      <text x={10} y={20} fill={'#444444'}>
        {((now.getTime() - sample.date.getTime()) / 1000).toFixed(1)}s ago
      </text>
      <polyline
        fill="none"
        stroke="blue"
        strokeWidth="1"
        points={ch1
          .slice(0, SAMPLES_PER_WAVE)
          .map((v, i) => `${i},${200 - v * 100}`)
          .join(' ')}
      />
      {ch2c.reverse().map((wave, wi) => (
        <>
          <polyline
            fill="none"
            stroke={`#${reds[wi]}2424`}
            strokeWidth="1"
            points={wave.map((v, i) => `${i},${200 - v * 100}`).join(' ')}
          />
          <polyline
            fill="none"
            stroke="orange"
            strokeWidth="2"
            points={maLine
              .map(
                ([offset, v], i) =>
                  `${i * offset + offset / 2},${200 - v * 100}`,
              )
              .join(' ')}
          />
        </>
      ))}
    </svg>
  );
}

function* chunks<T>(arr: T[], n: number) {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}
