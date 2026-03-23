import { useState, useEffect, useMemo } from 'react';
import { fetchSheetData } from '../services/googleSheets';
import { Loader2, FileText, Search } from 'lucide-react';

interface DocsTabProps {
  sheetUrl: string;
}

export default function DocsTab({ sheetUrl }: DocsTabProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadDocs() {
      if (!sheetUrl) {
        setError('Không có đường dẫn dữ liệu tài liệu.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const result = await fetchSheetData<any>(sheetUrl);
        setData(result);
      } catch (err) {
        console.error('Failed to load docs:', err);
        setError('Không thể tải dữ liệu tài liệu.');
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, [sheetUrl]);

  const filteredDocs = useMemo(() => {
    return data.filter(item => {
      const docLinkCol = Object.keys(item).find(key => key.toLowerCase().includes('tài liệu') || key.toLowerCase().includes('link'));
      const unitCodeCol = Object.keys(item).find(key => key.toLowerCase().includes('mã căn'));
      
      if (!docLinkCol || !unitCodeCol) return false;

      const docLink = item[docLinkCol];
      const unitCode = item[unitCodeCol];
      
      if (!docLink || !unitCode) return false;

      // Check if docLink is an image link matching the pattern
      const isImage = docLink.toLowerCase().endsWith('.jpg') || docLink.toLowerCase().endsWith('.png');
      const matchesName = docLink.toLowerCase().includes(unitCode.toLowerCase());

      if (!isImage || !matchesName) return false;

      if (searchTerm) {
        return unitCode.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [data, searchTerm]);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="relative w-full lg:w-64">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Tìm kiếm mã căn..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc, index) => {
          const unitCodeCol = Object.keys(doc).find(key => key.toLowerCase().includes('mã căn'));
          const docLinkCol = Object.keys(doc).find(key => key.toLowerCase().includes('tài liệu') || key.toLowerCase().includes('link'));
          
          return (
            <a 
              key={index} 
              href={doc[docLinkCol!]} 
              target="_blank" 
              rel="noopener noreferrer"
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="font-bold text-gray-900">{doc[unitCodeCol!]}</h3>
                <p className="text-sm text-gray-500">Tài liệu căn hộ</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
