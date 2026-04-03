import fs from 'fs';
import https from 'https';

const url = "https://raw.githubusercontent.com/trongtt-landtrack/Anh-Logo/main/xql6xl4b.png";
const dest = "public/logo.png";

const file = fs.createWriteStream(dest);
https.get(url, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log("Logo downloaded successfully.");
  });
}).on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error("Error downloading logo:", err.message);
});
