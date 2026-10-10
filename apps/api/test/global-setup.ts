import { MongoBinary } from 'mongodb-memory-server-core';

// Download/cache the pinned MongoDB binary once, before test workers start,
// instead of every worker racing to download it in parallel.
export default async function setup() {
  await MongoBinary.getPath();
}
