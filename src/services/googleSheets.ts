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
      
      // Check if the response is HTML (e.g., a login page or error page)
      if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error('Google Sheet is not public. Please change sharing settings to "Anyone with the link can view".');
      }

      Papa.parse(text, {
        header: false, // Parse as array of arrays first
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows.length === 0) {
            resolve([]);
            return;
          }

          // Find the header row (the first row with a significant number of non-empty cells)
          // Usually, a title row has only 1 or 2 non-empty cells.
          let headerRowIndex = 0;
          let maxNonEmpty = 0;
          
          for (let i = 0; i < Math.min(10, rows.length); i++) {
            const nonEmptyCount = rows[i].filter(cell => cell && cell.trim() !== '').length;
            // If we find a row with > 3 columns, it's likely the header. Or just the one with max columns.
            if (nonEmptyCount > maxNonEmpty) {
              maxNonEmpty = nonEmptyCount;
              headerRowIndex = i;
            }
          }

          const headers = rows[headerRowIndex].map(h => h ? h.trim() : '');
          
          // Handle duplicate headers by appending a number
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
          
          // Map the rest of the rows to objects
          const data: T[] = [];
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            // Skip completely empty rows
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
