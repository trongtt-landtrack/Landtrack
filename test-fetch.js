import https from 'https';

https.get('https://docs.google.com/spreadsheets/d/1hoAC_2Qf_8wNZzHtFaVdPhC_AhjC-Xj-eOdUEBSPrps/gviz/tq?tqx=out:csv&gid=0', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(data.substring(0, 1000));
  });
});
