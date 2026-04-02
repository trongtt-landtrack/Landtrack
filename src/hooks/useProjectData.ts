import { useQuery } from '@tanstack/react-query';
import { fetchConfiguredSheetData } from '../services/googleSheets';
import { MASTER_SHEET_URL } from '../constants';

interface ProjectDataParams {
  sheetUrl: string;
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number;
  requiredFields?: string[];
  headerMatrix?: Record<string, string>;
  projectName?: string;
  projectId?: string;
}

export function useProjectData({
  sheetUrl,
  headerRow,
  dataStartRow,
  dataEndRow,
  requiredFields,
  headerMatrix,
  projectName,
  projectId
}: ProjectDataParams) {
  return useQuery({
    queryKey: ['projectData', projectId || projectName || sheetUrl],
    queryFn: async () => {
      const sourceUrl = projectName ? MASTER_SHEET_URL : (sheetUrl || '');
      if (!sourceUrl) return [];

      if (projectName) {
        // Master sheet always uses standard config
        return await fetchConfiguredSheetData<any>(MASTER_SHEET_URL, 1, 2, 0);
      } else {
        return await fetchConfiguredSheetData<any>(
          sourceUrl,
          headerRow,
          dataStartRow,
          dataEndRow || 0,
          requiredFields,
          headerMatrix
        );
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
