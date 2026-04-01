import { getCsvUrl, normalize } from './googleSheets';
import Papa from 'papaparse';
import { ProjectConfig } from '../types';
import { STANDARD_HEADERS } from '../constants';

const CONFIG_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/edit?gid=0#gid=0';
const LOCAL_STORAGE_KEY = 'project_configs_cache_v1';
const PERSISTENT_CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

let cachedConfigs: ProjectConfig[] | null = null;
let lastFetchTime = 0;
const MEMORY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function clearConfigCache() {
  cachedConfigs = null;
  lastFetchTime = 0;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export async function getProjectConfigs(forceRefresh = false): Promise<ProjectConfig[]> {
  const now = Date.now();
  
  if (!forceRefresh && cachedConfigs && (now - lastFetchTime < MEMORY_CACHE_DURATION)) {
    return cachedConfigs;
  }

  // Try loading from localStorage if not force refreshing
  if (!forceRefresh) {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const { data, timestamp } = JSON.parse(stored);
        if (now - timestamp < PERSISTENT_CACHE_DURATION) {
          cachedConfigs = data;
          lastFetchTime = timestamp;
          return data;
        }
      } catch (e) {
        console.error('Error parsing stored configs:', e);
      }
    }
  }

  const csvUrl = getCsvUrl(CONFIG_SHEET_URL);
  if (!csvUrl) throw new Error('Invalid Config Sheet URL');

  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error('Failed to fetch config sheet');
  
  const text = await response.text();
  
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

        const normalizeForComparison = (s: string) => 
          normalize(s).replace(/[^a-z0-9]/g, '');

        // 1. Find the Standard Header Row
        let standardHeaderIndex = -1;
        for (let i = 0; i < Math.min(20, rows.length); i++) {
          const normalizedRow = rows[i].map(normalizeForComparison);
          const hasProjectId = normalizedRow.includes('projectid');
          const hasProjectName = normalizedRow.includes('projectname');
          const hasSheetUrl = normalizedRow.includes('sheeturl');

          if (hasProjectId && hasProjectName && hasSheetUrl) {
            standardHeaderIndex = i;
            break;
          }
        }

        if (standardHeaderIndex === -1) {
          for (let i = 0; i < Math.min(20, rows.length); i++) {
            const normalizedRow = rows[i].map(normalizeForComparison);
            const hasSheetUrl = normalizedRow.some(h => h.includes('sheeturl') || h.includes('linkquantri') || h.includes('linktonghop'));
            const hasProjectId = normalizedRow.some(h => h.includes('projectid') || h.includes('maduan') || h.includes('madinhdanh'));
            const hasProjectName = normalizedRow.some(h => h.includes('name') || h.includes('tenduan'));

            if (hasSheetUrl && (hasProjectId || hasProjectName)) {
              standardHeaderIndex = i;
              break;
            }
          }
        }

        if (standardHeaderIndex === -1) {
          resolve([]);
          return;
        }

        const standardHeaders = rows[standardHeaderIndex].map(h => h ? h.trim() : '');
        const configs: ProjectConfig[] = [];

        // Map standard indices for absolute accuracy by searching top rows
        const findColumnIndex = (names: string[]) => {
          const normalizedNames = names.map(normalizeForComparison);
          for (let i = 0; i < Math.min(5, rows.length); i++) {
            const row = rows[i];
            for (let j = 0; j < row.length; j++) {
              if (row[j] && normalizedNames.includes(normalizeForComparison(row[j]))) {
                return j;
              }
            }
          }
          return -1;
        };

        const idx = {
          projectId: findColumnIndex(['Project_ID', 'ID', 'Mã dự án', 'Mã định danh cho dự án']),
          projectName: findColumnIndex(['ProjectName', 'Name', 'Tên dự án']),
          slogan: findColumnIndex(['Slogan', 'Khẩu hiệu']),
          location: findColumnIndex(['location', 'Vị trí', 'Địa chỉ']),
          developer: findColumnIndex(['developer', 'Chủ đầu tư', 'CĐT']),
          type: findColumnIndex(['type', 'Loại hình', 'Loại hình dự án']),
          status: findColumnIndex(['status', 'Trạng thái', 'Tình trạng']),
          imageUrl: findColumnIndex(['imageUrl', 'Ảnh', 'Hình ảnh', 'Hình ảnh dự án']),
          sheetUrl: findColumnIndex(['sheetUrl', 'Link tổng hợp', 'Link tổng hợp dự án']),
          isHot: findColumnIndex(['isHot', 'Hot', 'Status']),
          dl: findColumnIndex(['ĐL', 'DL']),
          madl: findColumnIndex(['Mã ĐL', 'Ma DL']),
          tendl: findColumnIndex(['Tên ĐL', 'Ten DL']),
          linkduan: findColumnIndex(['Link dự án', 'Link du an'])
        };

        const technicalKeywords = [
          'projectid', 'projectname', 'slogan', 'location', 'developer', 'type', 'status', 'imageurl', 'sheeturl', 'ishot',
          'madinhdanhchoduan', 'tenduan', 'vitri', 'chudautu', 'loaihinhduan', 'trangthai', 'hinhanhduan', 'linktonghopduan',
          'madinhdanh', 'loaihinh', 'hinhanh', 'linktonghop', 'ploaihinh', 'project', 'name', 'id'
        ];

        // Pre-group agents by ProjectName from columns HA-HF
        // HA (208): ProjectName ref
        // HB (209): ĐL (Link)
        // HC (210): Link Đại lý
        // HE (212): Mã ĐL
        // HF (213): Tên ĐL
        const agentsByProject: Record<string, any[]> = {};
        rows.forEach((r, rIdx) => {
          const agentProjectName = r[208]?.trim();
          if (agentProjectName) {
            const normName = normalizeForComparison(agentProjectName);
            // Skip header-like values
            if (normName === 'projectname' || normName === 'tenduan' || normName === 'name') return;

            if (!agentsByProject[normName]) agentsByProject[normName] = [];
            
            const dlText = r[209]?.trim(); // HB
            const agentLink = r[210]?.trim(); // HC
            const agentId = r[212]?.trim(); // HE
            const agentName = r[213]?.trim(); // HF
            
            if (agentId || agentName || dlText || agentLink) {
              agentsByProject[normName].push({
                id: agentId || `agent-${rIdx}`,
                name: agentName || agentId || 'Đại lý',
                link: agentLink || '',
                dlText: dlText || '',
                projectLink: agentLink || ''
              });
            }
          }
        });

        // 2. Parse Project Rows
        for (let i = standardHeaderIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(cell => !cell || cell.trim() === '')) continue;
          
          const rowData: any = {};
          standardHeaders.forEach((header, index) => {
            if (header) {
              rowData[header] = row[index] ? row[index].trim() : '';
            }
          });

          const projectId = idx.projectId !== -1 ? row[idx.projectId]?.trim() : '';
          const projectName = idx.projectName !== -1 ? row[idx.projectName]?.trim() : '';

          // Skip if this row is a header row (Technical check)
          const firstCellNorm = normalizeForComparison(projectId || '');
          const secondCellNorm = normalizeForComparison(projectName || '');
          
          if (!projectId || 
              technicalKeywords.includes(firstCellNorm) || 
              technicalKeywords.includes(secondCellNorm) ||
              firstCellNorm === 'id' || 
              secondCellNorm === 'name') {
            continue;
          }

          const sheetUrl = idx.sheetUrl !== -1 ? row[idx.sheetUrl]?.trim() : '';
          const isHotValue = idx.isHot !== -1 ? String(row[idx.isHot]).toLowerCase().trim() : '';
          const isHot = isHotValue === 'true' || isHotValue === 'hot' || isHotValue === 'yes' || isHotValue === '1';

          // Extract Agents from pre-grouped data
          const projectAgents = agentsByProject[normalizeForComparison(projectName || projectId)] || [];

          const headerMatrix: Record<string, string> = {};
          const standardHeadersList: string[] = [];
          const technicalCols = ['sheetUrl', 'Header_Row', 'Data_Start_Row', 'Data_End_Row', 'Required_Fields', 'HĐ', 'Stats_Fields', 'Filter_Fields', 'Project_ID', 'Name', 'Slogan', 'Ảnh', 'imageUrl', 'Hot', 'Chủ đầu tư', 'Vị trí', 'Trạng thái', 'Thống kê tài liệu', 'Tài liệu', 'isHot', 'ProjectName', 'location', 'developer', 'type', 'status'];
          const technicalColsNorm = technicalCols.map(normalizeForComparison);
          
          standardHeaders.forEach((header, index) => {
            const normHeader = normalizeForComparison(header);
            if (header && !technicalCols.includes(header) && !technicalColsNorm.includes(normHeader)) {
              standardHeadersList.push(header);
              const value = row[index] ? row[index].trim() : '';
              if (value) {
                headerMatrix[header] = value;
              }
            }
          });

          configs.push({
            projectId,
            name: projectName || projectId,
            slogan: idx.slogan !== -1 ? row[idx.slogan]?.trim() : '',
            developer: idx.developer !== -1 ? row[idx.developer]?.trim() : '',
            location: idx.location !== -1 ? row[idx.location]?.trim() : '',
            type: idx.type !== -1 ? row[idx.type]?.trim() : '',
            status: idx.status !== -1 ? row[idx.status]?.trim() : '',
            imageUrl: formatImageUrl(idx.imageUrl !== -1 ? row[idx.imageUrl]?.trim() : ''),
            sheetUrl: sheetUrl,
            isHot: isHot,
            headerRow: 1, // Default to 1 for project sheets
            dataStartRow: 2,
            dataEndRow: 0,
            requiredFields: [],
            statsFields: ['Phân khu', 'Loại hình', 'Tình trạng', 'Hướng'],
            filterFields: ['Phân khu', 'Loại hình', 'Hướng'],
            docStatsField: 'Loại hình',
            docLinkField: 'Link tài liệu',
            headerMatrix,
            standardHeaders: standardHeadersList,
            agents: projectAgents
          });
        }

        cachedConfigs = configs;
        lastFetchTime = now;
        
        // Save to localStorage for persistence
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            data: configs,
            timestamp: now
          }));
        } catch (e) {
          console.error('Error saving configs to localStorage:', e);
        }
        
        resolve(configs);
      },
      error: (error) => reject(error)
    });
  });
}

function formatImageUrl(url: string): string {
  if (!url) return 'https://picsum.photos/seed/project/800/600';
  
  // Handle Google Drive links
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?id=${fileIdMatch[1]}`;
    }
  }
  
  return url;
}

export async function getProjectConfig(projectId: string): Promise<ProjectConfig | undefined> {
  const configs = await getProjectConfigs();
  return configs.find(c => c.projectId === projectId);
}
