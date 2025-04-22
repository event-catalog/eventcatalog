export default function() {
  console.log({ filename: import.meta.filename, cwd: process.cwd() });
  console.log('Hello, world!');
}