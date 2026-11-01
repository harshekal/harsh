import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { createAccount, openStore } from './server.js';

let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const prompt = createInterface({
  input: process.stdin,
  output,
  terminal: Boolean(process.stdin.isTTY),
});
let db;
try {
  if (!process.stdin.isTTY)
    throw new Error('Run this command in an interactive terminal.');
  const name = await prompt.question('Police administrator name: ');
  const email = await prompt.question('Police administrator email: ');
  process.stdout.write('Password (12-128 characters, hidden): ');
  muted = true;
  const password = await prompt.question('');
  muted = false;
  process.stdout.write('\nConfirm password (hidden): ');
  muted = true;
  const confirmation = await prompt.question('');
  muted = false;
  process.stdout.write('\n');
  if (password !== confirmation) throw new Error('Passwords do not match.');
  db = openStore();
  const account = await createAccount(db, { name, email, password }, 'admin');
  console.log(`Police administrator created: ${account.email}`);
} catch (error) {
  muted = false;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  prompt.close();
  db?.close();
}
