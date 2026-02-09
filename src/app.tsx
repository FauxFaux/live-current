import { useEffect, useState } from 'preact/hooks';
import { avgPowerOfChunk, OneSample, SAMPLES_PER_WAVE } from './one-sample.tsx';
import { OneFft } from './one-fft.tsx';

export type ParsedLine = Sample | LongFft;

export interface Sample {
  date: Date;
  kind: '2chvc';
  ch1: number[];
  ch2: number[];
}

export interface LongFft {
  date: Date;
  kind: 'long-fft';
  mags: number[];
}

function parseLine(line: string): ParsedLine {
  let [date, kind, ch1r, ch2r] = line.split('\t');

  // pre-tag format
  if (kind.length > 10) {
    ch2r = ch1r;
    ch1r = kind;
    // default tag
    kind = '2chvc';
  }

  switch (kind) {
    case '2chvc':
      const ch1 = ch1r
        .trim()
        .split(' ')
        .map((v) => parseFloat(v));
      const ch2 = ch2r
        .trim()
        .split(' ')
        .map((v) => parseFloat(v));
      return { date: new Date(date), kind: '2chvc', ch1, ch2 };
    case 'long-fft':
      const mags = ch1r
        .trim()
        .split(' ')
        .map((v) => parseFloat(v));
      return { date: new Date(date), kind: 'long-fft', mags };
    default:
      throw new Error('unknown kind ' + kind);
  }
}

export function App() {
  const [samples, setSamples] = useState({ vals: [] as Sample[], idx: 0 });
  const [longFfts, setLongFfts] = useState([] as LongFft[]);
  const [captured, setCaptured] = useState([] as Sample[]);
  const [ma, setMa] = useState(30);
  const [fftCut, setFftCut] = useState(16);
  const [currentScale, setCurrentScale] = useState(1);
  const [diffAgainst, setDiffAgainst] = useState<Sample | null>(null);

  useEffect(() => {
    const es = new EventSource(
      (import.meta.env.VITE_EVENT_HOST ?? '') + '/events',
    );
    es.onmessage = (event) => {
      const v = parseLine(event.data);
      switch (v.kind) {
        case '2chvc':
          setSamples((o) => {
            if (o.vals.length < 20) return { vals: [...o.vals, v], idx: o.idx };
            const nv = [...o.vals];
            nv[o.idx] = v;
            return {
              vals: nv,
              idx: (o.idx + 1) % nv.length,
            };
          });
          break;
        case 'long-fft':
          setLongFfts((o) => [v, ...o].slice(0, 20));
          break;
      }
    };
    return () => es.close();
  }, []);

  const hd = (sample: Sample): Sample => {
    if (!diffAgainst) return sample;
    return {
      date: sample.date,
      kind: '2chvc',
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
      <p>
        Scale the waveform vertically by{' '}
        <input
          type={'number'}
          min={0.1}
          max={10}
          step={0.1}
          value={currentScale}
          onInput={(e) => {
            setCurrentScale(parseFloat(e.currentTarget.value));
          }}
          size={3}
        />
        .
      </p>
      <h2>power (estimate)</h2>
      {chronoSamples(samples.vals)
        .reverse()
        .map((sample) =>
          Math.round(
            avgPowerOfChunk(sample.ch2.slice(0, SAMPLES_PER_WAVE * 4)),
          ),
        )
        .join(', ')}
      <h2>live</h2>
      {samples.vals.map((sample, index) => (
        <span
          key={index}
          style={
            'float: left; opacity: ' +
            (((index - samples.idx + samples.vals.length) %
              samples.vals.length) /
              samples.vals.length +
              0.5)
          }
          onClick={() => {
            setCaptured((o) => [sample, ...o]);
          }}
        >
          <OneSample
            sample={hd(sample)}
            ma={ma}
            fftCut={fftCut}
            currentScale={currentScale}
          />
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
            <OneSample
              sample={hd(sample)}
              ma={ma}
              fftCut={fftCut}
              currentScale={currentScale}
            />
          </span>
        ))}
      {captured.length === 0 && <p>(click a live sample to capture)</p>}
      {diffAgainst && (
        <p style={'cursor: pointer'} onClick={() => setDiffAgainst(null)}>
          Clear diffing.
        </p>
      )}
      <hr />
      <h2>fft</h2>
      <OneFft ffts={longFfts} />
      <hr />
      <p style={'min-height: 400px'}></p>
    </>
  );
}

function chronoSamples(samples: Sample[]) {
  return [...samples].sort((a, b) => a.date.getTime() - b.date.getTime());
}
