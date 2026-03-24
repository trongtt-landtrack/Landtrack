import Papa from 'papaparse';

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

export async function fetchSheetData<T>(url: string): Promise<T[]> {
  const csvUrl = getCsvUrl(url);
  if (!csvUrl) {
    throw new Error('Invalid Google Sheet URL');
  }

  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(csvUrl);
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
          let maxNonEmpty = 0;
          
          const headerKeywords = ['mã căn', 'phân khu', 'loại hình', 'giá', 'diện tích', 'hướng', 'tầng'];

          for (let i = 0; i < Math.min(15, rows.length); i++) {
            const row = rows[i];
            const nonEmptyCount = row.filter(cell => cell && cell.trim() !== '').length;
            const rowText = row.join(' ').toLowerCase();
            
            let score = nonEmptyCount;
            headerKeywords.forEach(keyword => {
              if (rowText.includes(keyword)) score += 5;
            });

            if (score > maxNonEmpty && nonEmptyCount > 2) {
              maxNonEmpty = score;
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
            
            const obj: any = {};
            uniqueHeaders.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] ? row[index].trim() : '';
              }
            });
            data.push(obj as T);
          }

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
  requiredFields?: string[]
): Promise<T[]> {
  const csvUrl = getCsvUrl(url);
  if (!csvUrl) {
    throw new Error('Invalid Google Sheet URL');
  }

  const response = await fetch(csvUrl);
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
        let actualHeaderRowIndex = 0;
        let maxNonEmpty = 0;
        
        // Use requiredFields as keywords if available, otherwise default keywords
        const headerKeywords = (requiredFields && requiredFields.length > 0) 
          ? requiredFields.map(f => f.toLowerCase()) 
          : ['mã căn', 'phân khu', 'loại hình', 'giá', 'diện tích', 'hướng', 'tầng'];

        for (let i = 0; i < Math.min(15, rows.length); i++) {
          const row = rows[i];
          const nonEmptyCount = row.filter(cell => cell && cell.trim() !== '').length;
          const rowText = row.join(' ').toLowerCase();
          
          let score = nonEmptyCount;
          headerKeywords.forEach(keyword => {
            if (rowText.includes(keyword)) score += 5;
          });

          if (score > maxNonEmpty && nonEmptyCount > 2) {
            maxNonEmpty = score;
            actualHeaderRowIndex = i;
          }
        }

        const headers = rows[actualHeaderRowIndex].map(h => h ? h.trim() : '');
        
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

        const normalize = (str: string) => str.normalize('NFC').toLowerCase().trim();

        for (let i = startRowIndex; i < endRowIndex; i++) {
          const row = rows[i];
          if (!row || row.every(cell => !cell || cell.trim() === '')) continue;
          
          const obj: any = {};
          
          if (requiredFields && requiredFields.length > 0) {
            requiredFields.forEach(field => {
              const normalizedField = normalize(field);
              const index = headers.findIndex(h => normalize(h).includes(normalizedField));
              if (index !== -1) {
                obj[field] = row[index] ? row[index].trim() : '';
              }
            });
          } else {
            // If no required fields specified, extract all columns with headers
            headers.forEach((header, index) => {
              if (header) {
                // Clean up header for object key (remove newlines)
                const cleanHeader = header.replace(/\n/g, ' ').trim();
                obj[cleanHeader] = row[index] ? row[index].trim() : '';
              }
            });
          }
          
          // Only add to data if the object has at least one non-empty value
          if (Object.values(obj).some(val => val !== '')) {
            data.push(obj as T);
          }
        }
        resolve(data);
      },
      error: (error) => reject(error)
    });
  });
}
