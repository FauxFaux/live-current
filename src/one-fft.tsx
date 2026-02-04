import type { LongFft } from './app.tsx';
import { range } from './ts.ts';

export function OneFft({ ffts }: { ffts: LongFft[] }) {
  const mags = range(1000).map((_) => 0);
  const mins = range(1000).map((_) => Infinity);
  const maxs = range(1000).map((_) => -Infinity);
  for (const fft of ffts) {
    for (let i = 0; i < mags.length; i++) {
      mags[i] += fft.mags[i] / ffts.length;
      mins[i] = Math.min(mins[i], fft.mags[i]);
      maxs[i] = Math.max(maxs[i], fft.mags[i]);
    }
  }
  const c = (v: number) => 400 - (v / 800) * 400;
  return (
    <svg width={1000} height={400} viewBox={'0 0 1000 400'}>
      {mags.map((v, i) => {
        return (
          <>
            <line
              x1={i}
              x2={i}
              y1={c(mins[i])}
              y2={c(maxs[i])}
              stroke={'#141'}
            />
            <circle cx={i} cy={c(v)} r={2} fill="#88f">
              <title>{i / 2}Hz</title>
            </circle>
          </>
        );
      })}
      {range(10).map((i) => (
        <>
          <line
            x1={i * 100}
            x2={i * 100}
            y1={18}
            y2={400}
            stroke="#969696"
            stroke-width={0.5}
          />
          <line
            x1={i * 100 + 50}
            x2={i * 100 + 50}
            y1={0}
            y2={400}
            stroke="#383838"
            stroke-width={0.5}
          />
          <text x={i * 100 - 14} y={14} fill="#444444">
            {i * 50}
          </text>
        </>
      ))}
    </svg>
  );
}
