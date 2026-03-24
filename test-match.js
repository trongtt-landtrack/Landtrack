const headers = [
  "STT", "Mã căn", "BẢNG HÀNG ĐỘC QUYỀN VINHOME GOLDEN CITY Loại hình PHÂN KHU ÁNH SAO",
  "TCBG", "Hướng", "DT đất (m2)", "DTXD (m2)", "Giá bán trước VAT", "VAT", "KPBT",
  "Giá gồm VAT và KPBT", "Giá TTS (gồm VAT)", "Xây trước VAT", "VAT", "KPBT",
  "Tiền đất (theo TTS)", "Giá TTS", "Tiền xây", "Đất trước VAT", "VAT", "KPBT",
  "Giá/m2", "Giá/m2 (theo TTS)", "GĐDA: Đỗ Quang Đông - 0941.222.666\nQLSP: Thúy An - 0795.265.519 Quỹ",
  "CSBH", "Link PTG", "Cơ chế net", "", "NOTE", "", "", "", "", ""
];

const requiredFields = [
  "STT", "Mã căn", "Loại hình", "TCBG", "Hướng", "DT đất (m2)", "DTXD (m2)",
  "Giá gồm VAT và KPBT", "Giá TTS (gồm VAT)", "Tiền đất (theo TTS)", "Tiền xây",
  "Giá/m2 (theo TTS)", "Quỹ", "CSBH", "Link PTG", "NOTE"
];

const normalize = (str) => str.normalize('NFC').toLowerCase().trim();

requiredFields.forEach(field => {
  const normalizedField = normalize(field);
  const index = headers.findIndex(h => normalize(h).includes(normalizedField));
  console.log(`Field: ${field} -> Index: ${index} (${index !== -1 ? headers[index] : 'NOT FOUND'})`);
});
