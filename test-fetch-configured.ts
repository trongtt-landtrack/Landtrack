import { fetchConfiguredSheetData } from './src/services/googleSheets.ts';

async function test() {
  const url = 'https://docs.google.com/spreadsheets/d/1hoAC_2Qf_8wNZzHtFaVdPhC_AhjC-Xj-eOdUEBSPrps/edit?gid=0#gid=0';
  const headerRow = 2;
  const dataStartRow = 3;
  const dataEndRow = 132;
  const requiredFields = [
    "STT", "Mã căn", "Loại hình", "TCBG", "Hướng", "DT đất (m2)", "DTXD (m2)",
    "Giá gồm VAT và KPBT", "Giá TTS (gồm VAT)", "Tiền đất (theo TTS)", "Tiền xây",
    "Giá/m2 (theo TTS)", "Quỹ", "CSBH", "Link PTG", "NOTE"
  ];
  
  try {
    const data = await fetchConfiguredSheetData(url, headerRow, dataStartRow, dataEndRow, requiredFields);
    console.log(`Found ${data.length} rows`);
    if (data.length > 0) {
      console.log('Last 5 rows:', data.slice(-5));
    }
  } catch (err) {
    console.error(err);
  }
}

test();
