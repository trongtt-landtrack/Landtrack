import { useState, useEffect, useMemo } from 'react';
import { FileText, Search, ExternalLink, Info, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjectData } from '../hooks/useProjectData';
import { Skeleton } from './ui/Skeleton';
import GuestWarningModal from './GuestWarningModal';
import { auth } from '../firebase';

interface DocsTabProps {
  sheetUrl: string;
  headerRow?: number;
  dataStartRow?: number;
  dataEndRow?: number;
  requiredFields?: string[];
  docStatsField?: string;
  docLinkField?: string;
  headerMatrix?: Record<string, string>;
  projectName?: string;
  initialSearchTerm?: string;
  initialData?: any[];
  initialLoading?: boolean;
}

export default function DocsTab({ 
  sheetUrl, 
  headerRow, 
  dataStartRow, 
  dataEndRow, 
  requiredFields, 
  docStatsField, 
  docLinkField,
  headerMatrix,
  projectName,
  initialSearchTerm = '',
  initialData
}: DocsTabProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [showGuestWarning, setShowGuestWarning] = useState(false);

  const { 
    data = [], 
    isLoading: loading, 
    isError, 
    error: queryError,
    refetch,
    isRefetching
  } = useProjectData({
    projectName,
    sheetUrl,
    headerRow,
    dataStartRow,
    dataEndRow,
    requiredFields,
    headerMatrix
  });

  const error = isError ? (queryError?.message || 'Không thể tải dữ liệu tài liệu.') : null;

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const filteredData = useMemo(() => {
    if (!projectName || data.length === 0) return data;
    const normProjectName = removeAccents(projectName.toLowerCase().trim());
    
    return data.filter(item => {
      // Kiểm tra tất cả các trường có thể chứa tên dự án
      const possibleProjectKeys = ['ProjectName', 'Dự án', 'Tên dự án', 'projectname', 'Project Name', 'DỰ ÁN'];
      const itemProject = possibleProjectKeys
        .map(key => String(item[key] || '').trim())
        .find(val => val !== '') || '';
        
      return removeAccents(itemProject.toLowerCase()) === normProjectName;
    });
  }, [data, projectName]);

  const docItems = useMemo(() => {
    if (filteredData.length === 0) return [];

    const items: { unitCode: string, link: string, zone: string, type: string }[] = [];
    const seen = new Set<string>();

    filteredData.forEach(item => {
      // Ưu tiên lấy link từ cột PTG, sau đó đến các cột link khác
      const possibleLinkKeys = ['PTG', 'Link tài liệu', 'Link PTG', 'Link tài liệu đính kèm', 'Link', 'docLink'];
      if (docLinkField) possibleLinkKeys.unshift(docLinkField);
      
      const link = possibleLinkKeys
        .map(key => String(item[key] || '').trim())
        .find(val => val.toLowerCase().startsWith('http')) || '';
        
      const unitCode = String(item['Mã căn'] || item['Mã SP'] || item['Mã sản phẩm'] || item['Số căn'] || '').trim();
      
      // Nếu không có link hoặc không có mã căn, bỏ qua
      if (!link || !unitCode || unitCode === '-' || unitCode === '') return;

      const key = `${unitCode}-${link}`;
      if (seen.has(key)) return;
      seen.add(key);

      items.push({
        unitCode,
        link,
        zone: String(item['Phân khu'] || item['Khu'] || item['Block'] || '').trim(),
        type: String(item['Loại hình'] || item['Loại căn hộ'] || item['Type'] || '').trim()
      });
    });

    return items;
  }, [filteredData, docLinkField]);

  const searchedDocs = useMemo(() => {
    if (!searchTerm) return docItems;
    const term = searchTerm.toLowerCase();
    return docItems.filter(doc => 
      doc.unitCode.toLowerCase().includes(term) || 
      doc.zone.toLowerCase().includes(term) || 
      doc.type.toLowerCase().includes(term)
    );
  }, [docItems, searchTerm]);

  const groupedDocs: Record<string, { unitCode: string, link: string, zone: string, type: string }[]> = useMemo(() => {
    const result: Record<string, { unitCode: string, link: string, zone: string, type: string }[]> = {};
    searchedDocs.forEach(doc => {
      const groupName = doc.zone || doc.type || 'Tài liệu chung';
      if (!result[groupName]) result[groupName] = [];
      result[groupName].push(doc);
    });
    return result;
  }, [searchedDocs]);

  if (loading) {
    return (
      <div className="space-y-10 max-w-7xl mx-auto pb-12">
        <div className="text-center mb-10 space-y-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-xl flex items-center gap-4 max-w-2xl mx-auto">
        <Info className="w-6 h-6" />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  if (docItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 max-w-4xl mx-auto">
        <FileText className="w-16 h-16 mb-6 opacity-20" />
        <h3 className="text-xl font-bold text-gray-600 mb-2">Chưa có tài liệu</h3>
        <p className="max-w-xs text-center text-sm">Hệ thống chưa tìm thấy liên kết tài liệu cho các mã căn thuộc dự án này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-primary uppercase inline-block relative pb-3 font-display">
          TÀI LIỆU THEO MÃ CĂN
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-accent"></div>
          <button 
            onClick={() => refetch()}
            disabled={isRefetching}
            className="absolute -right-12 top-0 p-2 bg-white border border-gray-100 text-primary rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </h2>
        <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
          Tra cứu nhanh tài liệu pháp lý, thiết kế và thông tin chi tiết cho từng mã căn hộ.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-accent transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Tìm kiếm theo mã căn, phân khu hoặc loại hình..."
          className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-sm font-sans"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-600"
          >
            <span className="text-xs font-bold uppercase tracking-tighter">Xóa</span>
          </button>
        )}
      </div>

      <div className="space-y-12">
        <AnimatePresence mode="popLayout">
          {Object.entries(groupedDocs).length > 0 ? (
            Object.entries(groupedDocs).map(([group, docs], groupIdx) => (
              <motion.div 
                key={group}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: groupIdx * 0.05 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="h-8 w-1 bg-accent rounded-full"></div>
                  <h3 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-3 font-display">
                    {group}
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-sans">
                      {docs.length}
                    </span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {docs.map((doc, idx) => (
                    <motion.button 
                      key={`${doc.unitCode}-${idx}`}
                      onClick={() => {
                        if (!auth.currentUser) {
                          setShowGuestWarning(true);
                        } else {
                          window.open(doc.link, '_blank');
                        }
                      }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-accent/30 transition-all group w-full text-left"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-primary text-accent flex items-center justify-center flex-shrink-0 shadow-inner group-hover:bg-accent group-hover:text-white transition-colors">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 font-display">Mã căn</p>
                          <h4 className="font-black text-primary group-hover:text-accent transition-colors truncate text-lg font-display">
                            {doc.unitCode}
                          </h4>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-accent/10 group-hover:text-accent transition-all flex-shrink-0">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-gray-400"
            >
              <p>Không tìm thấy tài liệu phù hợp với từ khóa "{searchTerm}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Footer */}
      <div className="bg-primary rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl mt-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-start gap-4 max-w-xl">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Info className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h4 className="text-lg font-bold mb-1 font-display uppercase tracking-tight">Hướng dẫn tra cứu</h4>
              <p className="text-blue-200/60 text-sm leading-relaxed font-sans">
                Tài liệu được liên kết trực tiếp với từng mã căn hộ. Bạn có thể sử dụng thanh tìm kiếm để tìm nhanh tài liệu theo mã căn hoặc phân khu mong muốn.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-black text-accent font-display">{docItems.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50 mt-1 font-display">Tổng tài liệu</p>
            </div>
            <div className="h-10 w-px bg-white/10"></div>
            <div className="text-center">
              <p className="text-3xl font-black text-white font-display">{Object.keys(groupedDocs).length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50 mt-1 font-display">Phân khu</p>
            </div>
          </div>
        </div>
      </div>
      {/* Guest Warning Modal */}
      <GuestWarningModal 
        isOpen={showGuestWarning} 
        onClose={() => setShowGuestWarning(false)} 
      />
    </div>
  );
}
