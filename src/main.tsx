import { render } from 'preact';
import './index.css';
import { App } from './app.tsx';
import { Hist } from './hist.tsx';

render(
  window.location.hash === '#hist' ? <Hist /> : <App />,
  document.getElementById('app')!,
);
