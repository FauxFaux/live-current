import { useEffect, useState } from 'preact/hooks';
import { OneSample } from './one-sample.tsx';

export interface Sample {
  date: Date;
  ch1: number[];
  ch2: number[];
}

function parseLine(line: string): Sample {
  const [date, ch1r, ch2r] = line.split('\t');
  const ch1 = ch1r
    .trim()
    .split(' ')
    .map((v) => parseFloat(v));
  const ch2 = ch2r
    .trim()
    .split(' ')
    .map((v) => parseFloat(v));
  return { date: new Date(date), ch1, ch2 };
}

export function App() {
  const [samples, setSamples] = useState([] as Sample[]);
  const [captured, setCaptured] = useState([] as Sample[]);
  const [ma, setMa] = useState(30);
  const [fftCut, setFftCut] = useState(16);
  const [diffAgainst, setDiffAgainst] = useState<Sample | null>(null);

  useEffect(() => {
    // const es = new EventSource('/events');
    const es = new EventSource(
      (import.meta.env.VITE_EVENT_HOST ?? '') + '/events',
    );
    es.onmessage = (event) => {
      const v = parseLine(event.data);
      setSamples((o) => [v, ...o].slice(0, 20));
    };
    return () => es.close();
  }, []);

  const hd = (sample: Sample) => {
    if (!diffAgainst) return sample;
    return {
      date: sample.date,
      ch1: sample.ch1.map((v, i) => v - (diffAgainst?.ch1[i] ?? 0)),
      ch2: sample.ch2.map((v, i) => v - (diffAgainst?.ch2[i] ?? 0)),
    };
  };

  return (
    <>
      <p>
        Compute a <span style={'color: orange'}>moving average</span> with a
        window of{' '}
        <input
          type={'number'}
          min={0}
          max={400}
          step={1}
          value={ma}
          onInput={(e) => {
            setMa(parseInt(e.currentTarget.value));
          }}
          size={3}
        />{' '}
        over <span style={'color: #dd2424'}>the current waveform</span>.
      </p>
      <p>
        Apply <span style={'color: green'}>FFT filtering</span> by keeping only{' '}
        <input
          type={'number'}
          min={0}
          max={512}
          step={1}
          value={fftCut}
          onInput={(e) => {
            setFftCut(parseInt(e.currentTarget.value));
          }}
          size={3}
        />{' '}
        frequency bins (of 1024).
      </p>
      <h2>live</h2>
      {samples.map((sample, index) => (
        <span
          key={index}
          style={'float: left'}
          onClick={() => {
            setCaptured((o) => [sample, ...o]);
          }}
        >
          <OneSample sample={hd(sample)} ma={ma} fftCut={fftCut} />
        </span>
      ))}
      <hr />
      <h2>captures</h2>
      {captured
        .filter((v) => v !== diffAgainst)
        .map((sample, index) => (
          <span
            key={index}
            style={'float: left'}
            onClick={() => {
              setDiffAgainst(sample);
            }}
          >
            <OneSample sample={hd(sample)} ma={ma} fftCut={fftCut} />
          </span>
        ))}
      {captured.length === 0 && <p>(click a live sample to capture)</p>}
      {diffAgainst && (
        <p style={'cursor: pointer'} onClick={() => setDiffAgainst(null)}>
          Clear diffing.
        </p>
      )}
    </>
  );
}
