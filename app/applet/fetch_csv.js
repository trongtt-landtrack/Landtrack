import https from 'https';
import { URL } from 'url';

function fetchUrl(urlStr, redirectCount = 0) {
  if (redirectCount > 10) {
    console.log('Too many redirects');
    return;
  }
  const parsedUrl = new URL(urlStr);
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }
  };
  
  https.get(options, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const redirectUrl = new URL(res.headers.location, urlStr).href;
      fetchUrl(redirectUrl, redirectCount + 1);
    } else {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log("STATUS:", res.statusCode);
        console.log(data.split('\n').slice(0, 15).join('\n'));
      });
    }
  }).on('error', (err) => {
    console.log('Error: ' + err.message);
  });
}

fetchUrl('https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/export?format=csv&gid=0');
