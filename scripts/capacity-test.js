import { io } from 'socket.io-client';

const n = Number(process.argv[2] || 100);
const url = process.argv[3] || 'http://localhost:3000';
let connected = 0;
const sockets = [];

for (let i = 0; i < n; i++) {
  const s = io(url, { auth: { display: true }, transports: ['websocket'], reconnection: false });
  s.on('connect', () => {
    connected++;
    if (connected === n) console.log(`connected ${connected}/${n}`);
  });
  s.on('connect_error', err => console.error('connect_error', i, err.message));
  sockets.push(s);
}

setTimeout(() => {
  console.log(`final connected: ${connected}/${n}`);
  sockets.forEach(s => s.close());
  process.exit(0);
}, Number(process.argv[4] || 20000));
