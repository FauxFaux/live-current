import { useEffect, useState } from 'preact/hooks';
import { parseLine, type Sample } from './app.tsx';

export function Hist() {
  const [rawLines, setRawLines] = useState([] as Sample[]);

  useEffect(() => {
    fetch((import.meta.env.VITE_EVENT_HOST ?? '') + '/capture.log')
      .then((res) => res.text())
      .then((text) =>
        setRawLines(
          text
            .split('\n')
            .filter((line) => line.startsWith('2'))
            .filter((line) => !line.includes('long-fft'))
            .map((line) => parseLine(line) as Sample),
        ),
      );
  }, []);

  if (rawLines.length === 0) {
    return <p>Loading...</p>;
  }

  return <p>{rawLines.length}</p>;
}
