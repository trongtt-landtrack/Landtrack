import { useState, useEffect, useMemo } from 'react';
import { fetchConfiguredSheetData } from '../services/googleSheets';
import { Loader2, LayoutGrid, Home, Tag, BarChart2, PieChart, Layers, Database, ArrowRight, Info, Users, ExternalLink } from 'lucide-react';
import { STANDARD_HEADERS, MASTER_SHEET_URL } from '../constants';
import { motion } from 'motion/react';
import { Agent } from '../types';

interface DashboardTabProps {
  sheetUrl: string;
  headerRow?: number;
  dataStartRow?: number;
  dataEndRow?: number;
  requiredFields?: string[];
  statsFields?: string[];
  headerMatrix?: Record<string, string>;
  standardHeaders?: string[];
  projectName?: string;
  agents?: Agent[];
  onNavigate: (tab: string, filters: Record<string, string>) => void;
  initialData?: any[];
  initialLoading?: boolean;
}

export default function DashboardTab({ 
  sheetUrl, 
  headerRow, 
  dataStartRow, 
  dataEndRow, 
  requiredFields, 
  statsFields, 
  headerMatrix,
  standardHeaders = [],
  projectName,
  agents = [],
  onNavigate,
  initialData,
  initialLoading
}: DashboardTabProps) {
  const [data, setData] = useState<any[]>(initialData || []);
  const [loading, setLoading] = useState(initialLoading !== undefined ? initialLoading : true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setData(initialData);
      setLoading(false);
      return;
    }

    if (initialLoading !== undefined) {
      setLoading(initialLoading);
      if (initialLoading) return;
    }

    async function loadData() {
      try {
        setLoading(true);
        // Prioritize MASTER_SHEET_URL if projectName is provided
        const sourceUrl = projectName ? MASTER_SHEET_URL : (sheetUrl || '');
        
        if (!sourceUrl) {
          setError('Không có đường dẫn dữ liệu.');
          setLoading(false);
          return;
        }

        let result: any[];
        // Always use standard header config for Master Sheet
        if (projectName) {
          result = await fetchConfiguredSheetData<any>(MASTER_SHEET_URL, 1, 2, 0);
        } else if (headerRow !== undefined && dataStartRow !== undefined) {
          result = await fetchConfiguredSheetData<any>(sourceUrl, headerRow, dataStartRow, dataEndRow || 0, requiredFields, headerMatrix);
        } else {
          // Fallback to old method if config is missing
          const { fetchSheetData } = await import('../services/googleSheets');
          result = await fetchSheetData<any>(sourceUrl);
        }
        setData(result);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Không thể tải dữ liệu thống kê.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sheetUrl, headerRow, dataStartRow, dataEndRow, requiredFields, headerMatrix, projectName]);

  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const filteredData = useMemo(() => {
    if (!projectName || data.length === 0) return data;
    const normProjectName = removeAccents(projectName.toLowerCase().trim());
    return data.filter(item => {
      const possibleKeys = ['ProjectName', 'Dự án', 'Tên dự án', 'projectname', 'Project Name', 'DỰ ÁN'];
      const itemProject = possibleKeys
        .map(key => String(item[key] || '').trim())
        .find(val => val !== '') || '';
      return removeAccents(itemProject.toLowerCase()) === normProjectName;
    });
  }, [data, projectName]);

  const filteredAgents = useMemo(() => {
    return agents;
  }, [agents]);

  const half = Math.ceil(filteredAgents.length / 2);
  const leftAgents = filteredAgents.slice(0, half);
  const rightAgents = filteredAgents.slice(half);

  const renderAgentValue = (val: string | undefined) => {
    const str = String(val || '').trim();
    return str.toLowerCase() === 'n/a' ? '' : str;
  };

  const getUnitCount = (agentName: string) => {
    if (!agentName) return 0;
    const normAgentName = removeAccents(agentName.toLowerCase().trim());
    return filteredData.filter(unit => {
      const unitAgent = removeAccents(String(unit['TÊN ĐL'] || unit['Đại lý'] || '').toLowerCase().trim());
      return unitAgent === normAgentName;
    }).length;
  };

  const renderAgentTable = (agentList: Agent[], startIndex: number) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-primary/5">
            <th className="px-4 py-3 text-[10px] font-black text-primary/40 uppercase tracking-widest font-display">STT</th>
            <th className="px-4 py-3 text-[10px] font-black text-primary/40 uppercase tracking-widest font-display text-center">ĐL</th>
            <th className="px-4 py-3 text-[10px] font-black text-primary/40 uppercase tracking-widest font-display">Mã ĐL</th>
            <th className="px-4 py-3 text-[10px] font-black text-primary/40 uppercase tracking-widest font-display">TÊN ĐL</th>
            <th className="px-4 py-3 text-[10px] font-black text-primary/40 uppercase tracking-widest font-display text-center">Quỹ căn</th>
            <th className="px-4 py-3 text-[10px] font-black text-primary/40 uppercase tracking-widest font-display text-right">Link</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-primary/5">
          {agentList.map((agent, idx) => {
            const unitCount = getUnitCount(agent.name);
            return (
              <motion.tr 
                key={agent.id + (startIndex + idx)}
                whileHover={{ backgroundColor: 'rgba(217, 155, 40, 0.05)' }}
                className={`group transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-accent/5'}`}
              >
                <td className="px-4 py-3">
                  <span className="text-[10px] font-black text-primary/40 font-display">{startIndex + idx + 1}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block px-2 py-1 bg-accent/10 text-accent rounded-lg text-[9px] font-black uppercase tracking-widest font-display">
                    {renderAgentValue(agent.dlText)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-black text-primary font-display">{renderAgentValue(agent.id)}</span>
                </td>
                <td className="px-4 py-3 cursor-pointer" onClick={() => onNavigate('units', { 'TÊN ĐL': renderAgentValue(agent.name) })}>
                  <span className="text-xs font-black text-primary group-hover:text-accent transition-colors font-display">{renderAgentValue(agent.name)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-black text-primary font-display">
                    {unitCount === 0 ? '0 (*)' : unitCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {agent.link && agent.link.toLowerCase() !== 'n/a' ? (
                    <a 
                      href={agent.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-300 shadow-sm font-display"
                    >
                      CHI TIẾT
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[9px] font-black text-primary/20 uppercase tracking-widest font-display"></span>
                  )}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="text-primary/50 font-medium font-sans">Đang tổng hợp dữ liệu dự án...</p>
      </div>
  );
  
  if (error) return (
      <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <Info className="w-6 h-6" />
        </div>
        <p className="font-medium font-sans">{error}</p>
      </div>
  );

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-12">
      {/* Agents Table Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3rem] border border-primary/10 shadow-xl overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-500"
      >
        <div className="p-8 border-b border-primary/5 flex items-center justify-between bg-accent/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-white">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-black text-primary uppercase tracking-widest font-display">
                DANH SÁCH ĐẠI LÝ PHÂN PHỐI
              </h3>
              <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] mt-1 font-display">
                {agents.length} ĐỐI TÁC CHIẾN LƯỢC
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {agents.length > 0 ? (
            <>
              <div className="bg-white rounded-[2rem] border border-primary/10 shadow-sm overflow-hidden">
                {renderAgentTable(leftAgents, 0)}
              </div>
              <div className="bg-white rounded-[2rem] border border-primary/10 shadow-sm overflow-hidden">
                {renderAgentTable(rightAgents, half)}
              </div>
            </>
          ) : (
            <div className="col-span-2 px-8 py-12 text-center">
              <p className="text-primary/40 font-medium font-sans italic">Chưa có thông tin đại lý cho dự án này.</p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-8 py-4 bg-accent/5 border-t border-primary/5">
          <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest font-display italic">
            (*) Vui lòng Click để xem chi tiết trong Link Dự án
          </p>
        </div>
      </motion.section>
    </div>
  );
}
