import { getCsvUrl } from './googleSheets';
import Papa from 'papaparse';
import { ProjectConfig } from '../types';

const CONFIG_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/edit?gid=0#gid=0';

export async function getProjectConfigs(): Promise<ProjectConfig[]> {
  const csvUrl = getCsvUrl(CONFIG_SHEET_URL);
  if (!csvUrl) throw new Error('Invalid Config Sheet URL');

  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error('Failed to fetch config sheet');
  
  const text = await response.text();
  if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
    throw new Error('Config Sheet is not public. Please change sharing settings to "Anyone with the link can view".');
  }

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length === 0) {
          resolve([]);
          return;
        }

        // Find the header row dynamically
        let headerIndex = 0;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const rowText = rows[i].join(' ').toLowerCase();
          if (rowText.includes('project_id') || rowText.includes('sheeturl') || rowText.includes('tên dự án')) {
            headerIndex = i;
            break;
          }
        }

        const headers = rows[headerIndex].map(h => h ? h.trim() : '');
        const data: any[] = [];

        for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(cell => !cell || cell.trim() === '')) continue;
          
          const obj: any = {};
          headers.forEach((header, index) => {
            if (header) {
              obj[header] = row[index] ? row[index].trim() : '';
            }
          });
          data.push(obj);
        }

        const configs = data.map((row: any) => {
          const getVal = (keys: string[]) => {
            // Check exact matches first
            for (const key of keys) {
              if (row[key] !== undefined) return row[key];
            }
            // Check partial matches (e.g., "Mã định danh cho dự án Project_ID" contains "Project_ID")
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const matchedKey = rowKeys.find(rk => rk.toLowerCase().includes(key.toLowerCase()));
              if (matchedKey) return row[matchedKey];
            }
            return '';
          };

          return {
            projectId: getVal(['Project_ID', 'Project ID', 'id']),
            name: getVal(['Name', 'name', 'Tên dự án']),
            slogan: getVal(['Slogan', 'slogan']),
            developer: getVal(['developer', 'Developer', 'Chủ đầu tư']),
            location: getVal(['location', 'Location', 'Vị trí']),
            type: getVal(['type', 'Type', 'Loại hình']),
            status: getVal(['status', 'Status', 'Trạng thái']),
            imageUrl: getVal(['imageUrl', 'Image URL', 'Ảnh']),
            sheetUrl: getVal(['sheetUrl', 'Sheet URL', 'Link Data', 'Link dự án']),
            isHot: String(getVal(['isHot', 'Is Hot', 'Hot'])).toLowerCase() === 'true',
            headerRow: parseInt(getVal(['Header_Row', 'Header Row', 'Dòng tiêu đề'])) || 1,
            dataStartRow: parseInt(getVal(['Data_Start_Row', 'Data Start Row', 'Dòng bắt đầu'])) || 2,
            dataEndRow: parseInt(getVal(['Data_End_Row', 'Data End Row', 'Dòng kết thúc'])) || 0,
            requiredFields: getVal(['Required_Fields', 'Required Fields', 'Các trường bắt buộc', 'tiêu đề cột'])
              ? String(getVal(['Required_Fields', 'Required Fields', 'Các trường bắt buộc', 'tiêu đề cột'])).split(',').map((f: string) => f.trim()).filter(Boolean)
              : [],
            statsFields: getVal(['Stats_Fields', 'Stats Fields', 'Cột thống kê', 'Thống kê'])
              ? String(getVal(['Stats_Fields', 'Stats Fields', 'Cột thống kê', 'Thống kê'])).split(',').map((f: string) => f.trim()).filter(Boolean)
              : [],
            filterFields: getVal(['Filter_Fields', 'Filter Fields', 'Cột bộ lọc', 'Bộ lọc'])
              ? String(getVal(['Filter_Fields', 'Filter Fields', 'Cột bộ lọc', 'Bộ lọc'])).split(',').map((f: string) => f.trim()).filter(Boolean)
              : [],
            docStatsField: getVal(['Thống kê tài liệu', 'Doc Stats Field']),
            docLinkField: getVal(['Tài liệu', 'Doc Link Field'])
          };
        }).filter(config => config.projectId && config.name);

        resolve(configs);
      },
      error: (error) => reject(error)
    });
  });
}

export async function getProjectConfig(projectId: string): Promise<ProjectConfig | undefined> {
  const configs = await getProjectConfigs();
  return configs.find(c => c.projectId === projectId);
}
