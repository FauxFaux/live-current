import express from 'express';
import split from 'split';

const app = express();

app.use(express.static('dist'));

let id = 0;
const handlers: Record<number, (v: string) => void> = [];
const buffer: string[] = [];
const buffered = 20;
process.stdin.pipe(split()).on('data', (line: string) => {
  buffer.push(line);
  if (buffer.length > buffered) {
    buffer.shift();
  }

  for (const handler of Object.values(handlers)) {
    handler(line);
  }
});

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const currentId = id++;
  console.log('client connected', currentId);

  const handler = (line: string) => {
    res.write(`data: ${line}\n\n`);
  };
  handlers[currentId] = handler;
  for (const line of buffer) {
    handler(line);
  }

  // When client closes connection, stop sending events
  req.on('close', () => {
    console.log('client disconnected', currentId);
    delete handlers[currentId];
    res.end();
  });
});

app.listen(4499, () => {
  console.log('http://localhost:4499/events');
});
