import https from 'https';

https.get('https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/export?format=csv&gid=0', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(data.split('\n').slice(0, 15).join('\n'));
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});