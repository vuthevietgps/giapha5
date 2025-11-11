// Node 18+ has global fetch
(async () => {
  const base = 'http://localhost:3000/api';
  const fams = await (await fetch(base + '/families')).json();
  const test = fams.find((f) => (f.name || '').toLowerCase() === 'test');
  if (!test) {
    console.log('NOT_FOUND');
    process.exit(0);
  }
  const mems = await (await fetch(base + '/members/by-family/' + test.id)).json();
  console.log('Test family id:', test.id, 'count:', Array.isArray(mems) ? mems.length : 0);
})();