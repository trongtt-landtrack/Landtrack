import Papa from 'papaparse';

const cache = new Map<string, { data: any, timestamp: number }>();
const MEMORY_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const PERSISTENT_CACHE_PREFIX = 'sheet_cache_v1_';

export function clearCache() {
  cache.clear();
  // Clear all localStorage entries with our prefix
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PERSISTENT_CACHE_PREFIX)) {
      localStorage.removeItem(key);
      i--; // Adjust index after removal
    }
  }
}

export function getCsvUrl(url: string) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    const id = match[1];
    let gid = '0';
    const gidMatch = url.match(/gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }
    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
  }
  return null;
}

export const normalize = (str: string) => 
  str.normalize('NFD')
     .replace(/[\u0300-\u036f]/g, '')
     .toLowerCase()
     .trim()
     .replace(/\s+/g, ' ');

export async function fetchSheetData<T>(url: string): Promise<T[]> {
  const csvUrl = getCsvUrl(url);
  if (!csvUrl) {
    throw new Error('Invalid Google Sheet URL');
  }

  // Kiểm tra cache
  const cached = cache.get(csvUrl);
  if (cached && (Date.now() - cached.timestamp < MEMORY_CACHE_DURATION)) {
    return cached.data as T[];
  }

  return new Promise(async (resolve, reject) => {
    // Thiết lập timeout 30 giây cho yêu cầu fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(csvUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      
      if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error('Google Sheet is not public. Please change sharing settings to "Anyone with the link can view".');
      }

      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows.length === 0) {
            resolve([]);
            return;
          }

          // Detect header row index
          let actualHeaderRowIndex = 0;
          let maxScore = -1;
          
          const headerKeywords = ['mã căn', 'phân khu', 'loại hình', 'giá', 'diện tích', 'hướng', 'tầng', 'email', 'tên', 'vai trò'];

          for (let i = 0; i < Math.min(20, rows.length); i++) {
            const row = rows[i];
            const nonEmptyCount = row.filter(cell => cell && cell.trim() !== '').length;
            if (nonEmptyCount < 2) continue;

            const rowText = normalize(row.join(' '));
            let keywordMatches = 0;
            headerKeywords.forEach(keyword => {
              if (rowText.includes(normalize(keyword))) keywordMatches++;
            });

            let score = (keywordMatches * 100) + nonEmptyCount;

            if (score > maxScore) {
              maxScore = score;
              actualHeaderRowIndex = i;
            }
          }
          
          if (rows.length <= actualHeaderRowIndex) {
            resolve([]);
            return;
          }

          const headers = rows[actualHeaderRowIndex].map(h => h ? h.trim() : '');
          
          const headerCounts: Record<string, number> = {};
          const uniqueHeaders = headers.map(header => {
            if (!header) return '';
            if (headerCounts[header]) {
              headerCounts[header]++;
              return `${header} (${headerCounts[header]})`;
            } else {
              headerCounts[header] = 1;
              return header;
            }
          });
          
          const data: T[] = [];
          for (let i = actualHeaderRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.every(cell => !cell || cell.trim() === '')) continue;
            
            // Skip rows that look like notes or separators (only 1 cell filled)
            if (row.filter(cell => cell && cell.trim() !== '').length < 2) continue;

            const obj: any = {};
            uniqueHeaders.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] ? row[index].trim() : '';
              }
            });
            data.push(obj as T);
          }

          // Lưu vào cache
          cache.set(csvUrl, { data, timestamp: Date.now() });
          resolve(data);
        },
        error: (error) => {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function fetchConfiguredSheetData<T>(
  url: string,
  headerRow: number,
  dataStartRow: number,
  dataEndRow: number,
  requiredFields?: string[],
  headerMatrix?: Record<string, string>,
  persistentCacheDuration: number = 0 // Duration in ms, 0 means no persistent cache
): Promise<T[]> {
  const csvUrl = getCsvUrl(url);
  const cacheKey = `${csvUrl}_${headerRow}_${dataStartRow}_${dataEndRow}`;
  const now = Date.now();
  
  // 1. Check Memory Cache
  const cached = cache.get(cacheKey);
  if (cached && (now - cached.timestamp < MEMORY_CACHE_DURATION)) {
    return cached.data as T[];
  }

  // 2. Check Persistent Cache (localStorage)
  if (persistentCacheDuration > 0) {
    const storageKey = PERSISTENT_CACHE_PREFIX + cacheKey;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const { data, timestamp } = JSON.parse(stored);
        if (now - timestamp < persistentCacheDuration) {
          // Update memory cache
          cache.set(cacheKey, { data, timestamp });
          return data as T[];
        }
      } catch (e) {
        console.error('Error parsing persistent cache:', e);
      }
    }
  }
  
  // 3. Check GAS API
  const gasApiUrl = import.meta.env.VITE_DATA_CLEAN_GAS_URL || 'https://script.google.com/macros/s/AKfycbzpFlOTImhFD5EUv0CnmPNREnvyG4koJbeEI9JrJpM2P4DX2h0-QaZQz8EnkkUQ0BfYSA/exec';
  if (gasApiUrl) {
    console.log('Đang sử dụng GAS API để làm sạch dữ liệu từ:', url);
    try {
      const response = await fetch(`${gasApiUrl}?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`Lỗi mạng khi gọi GAS API: ${response.status}`);
      }
      const text = await response.text();
      if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error('GAS API returned HTML instead of JSON. Please check the GAS deployment and URL.');
      }
      const json = JSON.parse(text);
      if (json.success) {
        console.log(`GAS API xử lý thành công sheet: ${json.sheetName}, ${json.totalRows} dòng.`);
        return json.data as T[];
      } else {
        throw new Error(json.error || 'Lỗi không xác định từ GAS API');
      }
    } catch (error) {
      console.error("Lỗi khi gọi GAS API, chuyển sang cách tải CSV cũ:", error);
      // Fallback xuống cách cũ nếu GAS lỗi
    }
  }

  // 2. Fallback: Cách cũ (Tải CSV trực tiếp - không lọc được dòng ẩn)
  if (!csvUrl) {
    throw new Error('Invalid Google Sheet URL');
  }

  // Thiết lập timeout 30 giây cho yêu cầu fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(csvUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    
    if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
      throw new Error('Google Sheet is not public. Please change sharing settings to "Anyone with the link can view".');
    }

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        const rows = results.data as string[][];
        
        // Detect header row index dynamically to account for gviz stripping rows
        let actualHeaderRowIndex = -1;
        let maxScore = -1;
        
        // Use requiredFields as keywords if available, otherwise default keywords
        const headerKeywords = (requiredFields && requiredFields.length > 0) 
          ? requiredFields.map(f => f.toLowerCase()) 
          : ['mã căn', 'mã sp', 'phân khu', 'loại hình', 'giá', 'diện tích', 'hướng', 'tầng', 'tình trạng', 'tên đl', 'đại lý'];

        // First, try the configured header row (with a small buffer for gviz shifts)
        const configuredIndex = headerRow - 1;
        const searchRange = [
          configuredIndex, 
          configuredIndex - 1, 
          configuredIndex - 2, 
          0, 1, 2, 3, 4, 5
        ].filter(i => i >= 0 && i < rows.length);

        // Remove duplicates from searchRange
        const uniqueSearchRange = Array.from(new Set(searchRange));

        for (const i of uniqueSearchRange) {
          const row = rows[i];
          const nonEmptyCells = row.filter(cell => cell && cell.trim() !== '');
          const nonEmptyCount = nonEmptyCells.length;
          
          if (nonEmptyCount < 2) continue;

          // Penalty for rows with very long strings (likely titles/notes)
          const hasVeryLongString = nonEmptyCells.some(cell => cell.length > 50);
          
          const rowText = normalize(row.join(' '));
          let keywordMatches = 0;
          headerKeywords.forEach(keyword => {
            if (rowText.includes(normalize(keyword))) keywordMatches++;
          });

          // Score calculation
          let score = (keywordMatches * 100) + nonEmptyCount;
          if (hasVeryLongString) score -= 500; // Heavy penalty for title-like rows
          
          // Boost if it's exactly the configured row
          if (i === configuredIndex) score += 50;

          if (score > maxScore) {
            maxScore = score;
            actualHeaderRowIndex = i;
          }
        }

        // Fallback if no good header found
        if (actualHeaderRowIndex === -1) actualHeaderRowIndex = Math.max(0, headerRow - 1);

        const headers = rows[actualHeaderRowIndex].map(h => {
          const trimmed = h ? h.trim() : '';
          return trimmed.length > 60 ? '' : trimmed;
        });

        // Header Normalization Matrix - Expanded for more variations
        const NORMALIZATION_MAP: Record<string, string[]> = {
          'Mã căn': ['mã căn', 'mã sp', 'unit code', 'số căn', 'mã sản phẩm', 'căn số', 'mã sp'],
          'Phân khu': ['phân khu', 'khu', 'block', 'tòa', 'zone', 'subdivision'],
          'Loại hình': ['loại hình', 'loại căn hộ', 'loại sp', 'type', 'product type'],
          'Diện tích đất': ['dt đất', 'diện tích đất', 'dt đất (m2)', 'dtđ', 'land area', 'diện tích'],
          'Diện tích XD': ['dtxd', 'dtcd', 'diện tích xây dựng', 'dtxd (m2)', 'construction area', 'tiền xây dựng', 'tổng tiền xây dựng'],
          'Giá bán': ['giá bán', 'giá tts', 'giá gồm vat', 'giá niêm yết', 'tổng giá', 'giá bán trước vat', 'giá tts (gồm vat)'],
          'Hướng': ['hướng', 'hướng cửa', 'hướng ban công', 'view', 'orientation'],
          'Tầng': ['tầng', 'floor', 'số tầng'],
          'Tình trạng': ['tình trạng', 'trạng thái', 'status', 'booking', 'giỏ hàng'],
          'Link PTG': ['link ptg', 'ptg & chi can', 'ptg', 'link tai lieu', 'ptg & chỉ căn'],
          'Thanh toán': ['tts', 'tttd', 'vay', 'phương thức thanh toán', 'pttt'],
          'Tiền đất': ['tiền đất', 'tổng tiền đất', 'giá đất']
        };

        // Header Normalization Matrix - Aligned with User's proposed Standard Matrix
        const HEADER_MATRIX: Record<string, string[]> = {
          'TÊN ĐL': ['tên đl', 'tên đại lý', 'agent name', 'full agent name', 'đại lý phân phối'],
          'Mã ĐL': ['mã đl', 'mã đại lý', 'agent id', 'agent code', 'đl'],
          'Mã căn': ['mã căn', 'mã sp', 'unit code', 'số căn', 'mã sản phẩm', 'căn số', 'mã sp', 'mã căn hộ', 'mã'],
          'Phân khu': ['phân khu', 'khu', 'block', 'tòa', 'zone', 'subdivision', 'phân khu/tòa'],
          'Loại hình': ['loại hình', 'loại căn hộ', 'loại sp', 'type', 'product type', 'loại sản phẩm', 'sản phẩm', 'loại'],
          'TCBG': ['tcbg', 'tiêu chuẩn bàn giao', 'bàn giao', 'tiêu chuẩn', 'tình trạng bàn giao', 'handover'],
          'Số tầng': ['số tầng', 'tầng', 'floor', 'tầng cao'],
          'Hướng': ['hướng', 'hướng cửa', 'hướng ban công', 'view', 'orientation', 'hướng chính'],
          'DT Đất': ['dt đất', 'diện tích đất', 'dt đất (m2)', 'dtđ', 'land area', 'diện tích', 'dt'],
          'DTXD': ['dtxd', 'dtcd', 'diện tích xây dựng', 'dtxd (m2)', 'construction area', 'diện tích sàn', 'dt xây dựng'],
          'Giá gồm VAT': ['giá gồm vat', 'giá niêm yết', 'giá gồm vat và kpbt', 'giá gồm vat & kpbt', 'tổng giá', 'giá bán', 'giá', 'price', 'list price', 'giá có vat'],
          'TTS': ['tts', 'giá thanh toán sớm', 'giá tts', 'giá tts (gồm vat)', 'giá chiết khấu', 'giá tts (có vat)'],
          'Tiền đất': ['tiền đất', 'tổng tiền đất', 'giá đất', 'tiền đất (theo tts)'],
          'Tiền xây': ['tiền xây', 'tổng tiền xây dựng', 'tiền xây dựng', 'tổng tiền xây'],
          'Giá/m2': ['giá/m2', 'đơn giá/m2', 'giá/m2 (theo tts)', 'đơn giá', 'unit price', 'giá/m2'],
          'Vay': ['vay', 'vay ngân hàng', 'htls', 'chính sách vay', 'vay vốn'],
          'TTTĐ': ['tttd', 'tt tiến độ', 'thanh toán tiến độ', 'tiến độ thanh toán', 'tiến độ'],
          'Tình trạng': ['tình trạng', 'trạng thái', 'status', 'booking', 'giỏ hàng', 'availability'],
          'Quỹ': ['quỹ', 'quỹ hàng', 'nguồn', 'rổ hàng'],
          'CSBH': ['csbh', 'chính sách bán hàng', 'chính sách', 'csbh mới nhất'],
          'Quà tặng': ['quà tặng', 'khuyến mãi', 'voucher', 'ưu đãi'],
          'Ngày ký HĐ': ['ngày ký hđ', 'ngày ký ttđc/ttkq', 'ngày ký', 'ttđc/ttkq', 'ngày ký hợp đồng'],
          'PTG': ['ptg', 'link tài liệu', 'link ptg', 'ptg & chi can', 'ptg & chỉ căn', 'link tải tài liệu', 'link docs', 'tài liệu', 'ptg & cc'],
          'imageUrl': ['imageurl', 'ảnh', 'hình ảnh', 'image', 'picture', 'anh', 'hinh anh', 'ảnh căn'],
          'Ghi chú': ['ghi chú', 'note', 'nội dung', 'ghi chú thêm', 'notes'],
          'ProjectName': ['projectname', 'tên dự án', 'dự án', 'dự án ', 'project name', 'dự án/phân khu', 'tên'],
          'SpreadsheetID': ['spreadsheetid', 'link đối chiếu', 'link sheet', 'spreadsheet id']
        };

        const getStandardHeader = (header: string) => {
          const norm = normalize(header);

          // 1. Check project-specific matrix first (from Management Sheet)
          if (headerMatrix) {
            for (const [standard, projectHeader] of Object.entries(headerMatrix)) {
              if (projectHeader && normalize(projectHeader) === norm) {
                return standard;
              }
            }
          }

          // 2. Fallback to global HEADER_MATRIX synonyms
          for (const [standard, synonyms] of Object.entries(HEADER_MATRIX)) {
            if (synonyms.some(syn => {
              const normSyn = normalize(syn);
              return norm === normSyn || 
                     norm.startsWith(normSyn + ' ') || 
                     norm.endsWith(' ' + normSyn) || 
                     norm.includes(' ' + normSyn + ' ');
            })) {
              return standard;
            }
          }
          return header;
        };

        const data: T[] = [];
        
        // Calculate shift between user's configured header row and actual header row
        const configuredHeaderIndex = headerRow - 1;
        const shift = configuredHeaderIndex - actualHeaderRowIndex;
        
        // Apply shift to dataStartRow and dataEndRow
        const startRowIndex = Math.max(actualHeaderRowIndex + 1, dataStartRow - 1 - shift);
        let endRowIndex = rows.length;
        if (dataEndRow > 0) {
          endRowIndex = Math.min(dataEndRow - shift, rows.length);
        }

        for (let i = startRowIndex; i < endRowIndex; i++) {
          const row = rows[i];
          if (!row || row.every(cell => !cell || cell.trim() === '')) continue;
          if (row.filter(cell => cell && cell.trim() !== '').length < 2) continue;

          const obj: any = {};
          
          // Extract and standardize ALL columns found in the sheet
          headers.forEach((header, index) => {
            if (header) {
              const standardHeader = getStandardHeader(header);
              const cleanHeader = standardHeader.replace(/\n/g, ' ').trim();
              const value = row[index] ? row[index].trim() : '';
              
              // Priority logic for 'TÊN ĐL'
              // If we find 'Tên ĐL' (full name), we want it to overwrite 'ĐL' (short code)
              const isFullNameHeader = header.toLowerCase().includes('tên');
              const isShortCodeHeader = header.toLowerCase() === 'đl';
              
              if (!obj[cleanHeader] || (obj[cleanHeader] === '' && value !== '') || (cleanHeader === 'TÊN ĐL' && isFullNameHeader)) {
                obj[cleanHeader] = value;
              }
            }
          });

          // If requiredFields are specified, we use them to validate the row
          // but we return the full standardized object
          let isValidRow = true;
          if (requiredFields && requiredFields.length > 0) {
            isValidRow = requiredFields.every(field => {
              const standardField = getStandardHeader(field);
              const value = obj[standardField] || obj[field];
              return value && value.trim() !== '';
            });
          }

          if (isValidRow && Object.values(obj).some(val => val !== '')) {
            data.push(obj as T);
          }
        }

        // Save to memory cache
        cache.set(cacheKey, { data, timestamp: now });

        // Save to persistent cache if requested
        if (persistentCacheDuration > 0) {
          try {
            const storageKey = PERSISTENT_CACHE_PREFIX + cacheKey;
            localStorage.setItem(storageKey, JSON.stringify({ data, timestamp: now }));
          } catch (e) {
            console.error('Error saving to persistent cache:', e);
          }
        }

        resolve(data);
      },
      error: (error) => reject(error)
    });
  });
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
