import { useState, useEffect, useMemo } from 'react';
import { fetchConfiguredSheetData } from '../services/googleSheets';
import { Loader2, FileText, Search, ExternalLink, Info } from 'lucide-react';

interface DocsTabProps {
  sheetUrl: string;
  headerRow?: number;
  dataStartRow?: number;
  dataEndRow?: number;
  requiredFields?: string[];
  docStatsField?: string;
  docLinkField?: string;
}

export default function DocsTab({ sheetUrl, headerRow, dataStartRow, dataEndRow, requiredFields, docStatsField, docLinkField }: DocsTabProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocs() {
      if (!sheetUrl) {
        setError('Không có đường dẫn dữ liệu tài liệu.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        let result: any[];
        if (headerRow !== undefined && dataStartRow !== undefined) {
          result = await fetchConfiguredSheetData<any>(sheetUrl, headerRow, dataStartRow, dataEndRow || 0, requiredFields);
        } else {
          // Fallback to old method if config is missing
          const { fetchSheetData } = await import('../services/googleSheets');
          result = await fetchSheetData<any>(sheetUrl);
        }
        setData(result);
      } catch (err) {
        console.error('Failed to load docs:', err);
        setError('Không thể tải dữ liệu tài liệu.');
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, [sheetUrl, headerRow, dataStartRow, dataEndRow, requiredFields]);

  const groupedDocs = useMemo(() => {
    if (data.length === 0) return {};

    const linkField = docLinkField || 'Link PTG';
    const statsField = docStatsField || 'Loại hình';

    const result: Record<string, { name: string, link: string }[]> = {};

    // Find actual column names
    const actualLinkCol = Object.keys(data[0] || {}).find(key => key.toLowerCase().includes(linkField.toLowerCase()));
    const actualStatsCol = Object.keys(data[0] || {}).find(key => key.toLowerCase().includes(statsField.toLowerCase()));
    const unitCodeCol = Object.keys(data[0] || {}).find(key => key.toLowerCase().includes('mã căn'));

    if (!actualLinkCol) return {};

    // Use a Set to keep track of unique links to avoid duplicates
    const uniqueLinks = new Set<string>();

    data.forEach(item => {
      const link = item[actualLinkCol];
      if (!link || !link.toLowerCase().startsWith('http')) return;

      // Skip if we've already added this exact link
      if (uniqueLinks.has(link)) return;
      uniqueLinks.add(link);

      const groupName = actualStatsCol ? (item[actualStatsCol] || 'Khác') : 'Tài liệu chung';
      const docName = unitCodeCol && item[unitCodeCol] ? `Tài liệu ${item[unitCodeCol]}` : 'Tài liệu dự án';

      if (!result[groupName]) {
        result[groupName] = [];
      }

      result[groupName].push({
        name: docName,
        link: link
      });
    });

    return result;
  }, [data, docLinkField, docStatsField]) as Record<string, { name: string, link: string }[]>;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500">Đang tải tài liệu...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (Object.keys(groupedDocs).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mb-4 text-gray-300" />
        <p>Chưa có tài liệu nào được cập nhật cho dự án này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#0f284f] uppercase inline-block relative pb-3">
          TÀI LIỆU DỰ ÁN
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-[#d99b28]"></div>
        </h2>
      </div>

      {Object.entries(groupedDocs).map(([group, docs]) => (
        <div key={group} className="mb-8">
          <h3 className="text-xl font-bold text-[#0f284f] uppercase mb-4">{group}</h3>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {docs.map((doc, index) => (
                <a 
                  key={index} 
                  href={doc.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group border-b border-r border-gray-100 last:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0 md:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#d99b28] text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm">
                      {index + 1}
                    </div>
                    <span className="font-bold text-gray-800 group-hover:text-[#d99b28] transition-colors line-clamp-2 uppercase text-sm">
                      {doc.name}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600 transition-colors flex-shrink-0">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="bg-[#fdfcf0] border border-gray-100 rounded-lg overflow-hidden mt-8 flex items-stretch shadow-sm">
        <div className="w-1.5 bg-[#d99b28] flex-shrink-0"></div>
        <div className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">
            <span className="font-bold text-[#d99b28]">Lưu ý:</span> Thông tin tài liệu dự án ban đầu có thể được cập nhật, chỉnh sửa theo từng đợt.
          </p>
        </div>
      </div>
    </div>
  );
}
