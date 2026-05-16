import React, { useState, useEffect } from 'react';
import { Compass, Info, AlertTriangle, Crosshair, Calendar, Map, Clock, ArrowRight, Star } from 'lucide-react';
import { motion } from 'motion/react';

// --- PHONG THỦY DATA ---

const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];

const CAN_VALUE: Record<string, number> = {
  'Giáp': 1, 'Ất': 1, 'Bính': 2, 'Đinh': 2, 'Mậu': 3, 'Kỷ': 3, 'Canh': 4, 'Tân': 4, 'Nhâm': 5, 'Quý': 5
};
const CHI_VALUE: Record<string, number> = {
  'Tý': 0, 'Sửu': 0, 'Ngọ': 0, 'Mùi': 0,
  'Dần': 1, 'Mão': 1, 'Thân': 1, 'Dậu': 1,
  'Thìn': 2, 'Tỵ': 2, 'Tuất': 2, 'Hợi': 2
};
const MANG_MAP = { 1: 'Kim', 2: 'Thủy', 3: 'Hỏa', 4: 'Thổ', 5: 'Mộc' };

const CUNG_DIRECTIONS: Record<string, { tot: string[], xau: string[] }> = {
  'Khảm': {
    tot: ['Đông Nam (Sinh Khí)', 'Đông (Thiên Y)', 'Nam (Diên Niên)', 'Bắc (Phục Vị)'],
    xau: ['Tây Nam (Tuyệt Mệnh)', 'Đông Bắc (Ngũ Quỷ)', 'Tây Bắc (Lục Sát)', 'Tây (Họa Hại)']
  },
  'Ly': {
    tot: ['Đông (Sinh Khí)', 'Đông Nam (Thiên Y)', 'Bắc (Diên Niên)', 'Nam (Phục Vị)'],
    xau: ['Tây Bắc (Tuyệt Mệnh)', 'Tây (Ngũ Quỷ)', 'Tây Nam (Lục Sát)', 'Đông Bắc (Họa Hại)']
  },
  'Chấn': {
    tot: ['Nam (Sinh Khí)', 'Bắc (Thiên Y)', 'Đông Nam (Diên Niên)', 'Đông (Phục Vị)'],
    xau: ['Tây (Tuyệt Mệnh)', 'Tây Bắc (Ngũ Quỷ)', 'Đông Bắc (Lục Sát)', 'Tây Nam (Họa Hại)']
  },
  'Tốn': {
    tot: ['Bắc (Sinh Khí)', 'Nam (Thiên Y)', 'Đông (Diên Niên)', 'Đông Nam (Phục Vị)'],
    xau: ['Đông Bắc (Tuyệt Mệnh)', 'Tây Nam (Ngũ Quỷ)', 'Tây (Lục Sát)', 'Tây Bắc (Họa Hại)']
  },
  'Càn': {
    tot: ['Tây (Sinh Khí)', 'Đông Bắc (Thiên Y)', 'Tây Nam (Diên Niên)', 'Tây Bắc (Phục Vị)'],
    xau: ['Nam (Tuyệt Mệnh)', 'Đông (Ngũ Quỷ)', 'Bắc (Lục Sát)', 'Đông Nam (Họa Hại)']
  },
  'Khôn': {
    tot: ['Đông Bắc (Sinh Khí)', 'Tây (Thiên Y)', 'Tây Bắc (Diên Niên)', 'Tây Nam (Phục Vị)'],
    xau: ['Bắc (Tuyệt Mệnh)', 'Đông Nam (Ngũ Quỷ)', 'Nam (Lục Sát)', 'Đông (Họa Hại)']
  },
  'Cấn': {
    tot: ['Tây Nam (Sinh Khí)', 'Tây Bắc (Thiên Y)', 'Tây (Diên Niên)', 'Đông Bắc (Phục Vị)'],
    xau: ['Đông Nam (Tuyệt Mệnh)', 'Bắc (Ngũ Quỷ)', 'Đông (Lục Sát)', 'Nam (Họa Hại)']
  },
  'Đoài': {
    tot: ['Tây Bắc (Sinh Khí)', 'Tây Nam (Thiên Y)', 'Đông Bắc (Diên Niên)', 'Tây (Phục Vị)'],
    xau: ['Đông (Tuyệt Mệnh)', 'Nam (Ngũ Quỷ)', 'Đông Nam (Lục Sát)', 'Bắc (Họa Hại)']
  }
};

const TRACH_MAP: Record<string, string> = {
  'Khảm': 'Đông Tứ Mệnh', 'Ly': 'Đông Tứ Mệnh', 'Chấn': 'Đông Tứ Mệnh', 'Tốn': 'Đông Tứ Mệnh',
  'Càn': 'Tây Tứ Mệnh', 'Khôn': 'Tây Tứ Mệnh', 'Cấn': 'Tây Tứ Mệnh', 'Đoài': 'Tây Tứ Mệnh'
};

const BAGUA_DIRECTIONS = [
  { name: 'Bắc', angle: 0, range: [337.5, 360], range2: [0, 22.5] },
  { name: 'Đông Bắc', angle: 45, range: [22.5, 67.5] },
  { name: 'Đông', angle: 90, range: [67.5, 112.5] },
  { name: 'Đông Nam', angle: 135, range: [112.5, 157.5] },
  { name: 'Nam', angle: 180, range: [157.5, 202.5] },
  { name: 'Tây Nam', angle: 225, range: [202.5, 247.5] },
  { name: 'Tây', angle: 270, range: [247.5, 292.5] },
  { name: 'Tây Bắc', angle: 315, range: [292.5, 337.5] }
];

export default function FengShuiPage() {
  const [activeTab, setActiveTab] = useState<'laban' | 'tuvan'>('tuvan');
  
  // Compass State
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);

  // Consulting State
  const [birthYear, setBirthYear] = useState<string>('1990');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  
  const [result, setResult] = useState<any>(null);
  const [goodDays, setGoodDays] = useState<any[]>([]);

  // --- COMPASS LOGIC ---
  useEffect(() => {
    if (!window.DeviceOrientationEvent) setBrowserSupported(false);
  }, []);

  const requestAccess = async () => {
    try {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          startCompass();
        } else {
          setPermissionGranted(false);
          alert('Vui lòng cấp quyền truy cập cảm biến để sử dụng la bàn!');
        }
      } else {
        setPermissionGranted(true);
        startCompass();
      }
    } catch (error) {
      console.error('Error requesting orientation permission:', error);
      setPermissionGranted(false);
    }
  };

  const startCompass = () => {
    window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
    window.addEventListener('deviceorientation', handleOrientation as any, true);
  };

  const handleOrientation = (event: DeviceOrientationEvent) => {
    let compassHeading = null;
    if ((event as any).webkitCompassHeading) {
      compassHeading = (event as any).webkitCompassHeading;
    } else if (event.absolute && event.alpha !== null) {
      compassHeading = 360 - event.alpha;
    }
    if (compassHeading !== null) {
      setHeading(Math.round(compassHeading));
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true);
      window.removeEventListener('deviceorientation', handleOrientation as any, true);
    };
  }, []);

  const getDirectionName = (h: number) => {
    const dir = BAGUA_DIRECTIONS.find(d => {
      if (d.range2) return (h >= d.range[0] && h <= d.range[1]) || (h >= d.range2[0] && h <= d.range2[1]);
      return h >= d.range[0] && h <= d.range[1];
    });
    return dir ? dir.name : '';
  };

  // --- FENG SHUI LOGIC ---
  const calculateFengShui = () => {
    const y = parseInt(birthYear);
    if (isNaN(y) || y < 1900 || y > 2100) return;

    // 1. Can Chi & Ngũ Hành
    const can = CAN[y % 10];
    const chi = CHI[y % 12];
    let v = CAN_VALUE[can] + CHI_VALUE[chi];
    if (v > 5) v -= 5;
    const mang = MANG_MAP[v as keyof typeof MANG_MAP];

    // 2. Cung phi
    const lastTwoDigits = y % 100;
    let sum = lastTwoDigits.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    while (sum > 9) sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    if (sum === 0) sum = 9; // For years like 2000

    let res;
    if (y < 2000) {
      res = gender === 'male' ? 10 - sum : 5 + sum;
    } else {
      res = gender === 'male' ? 9 - sum : 6 + sum;
    }
    while (res > 9) res -= 9;
    if (res === 0) res = 9;

    const CUNG_ENUM: Record<number, string> = {
      1: 'Khảm', 2: 'Khôn', 3: 'Chấn', 4: 'Tốn', 
      5: gender === 'male' ? 'Khôn' : 'Cấn', 
      6: 'Càn', 7: 'Đoài', 8: 'Cấn', 9: 'Ly'
    };

    const cung = CUNG_ENUM[res] || 'Khảm';

    setResult({
      canChi: `${can} ${chi}`,
      mang,
      cung,
      trach: TRACH_MAP[cung],
      huongTot: CUNG_DIRECTIONS[cung].tot,
      huongXau: CUNG_DIRECTIONS[cung].xau
    });

    // 3. Generate Simulated Good Dates in current month matching Cung
    const dates = [];
    const now = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const hash = (d.getDate() + y) % 7;
      if (hash === 2 || hash === 5) {
        dates.push({
          date: d,
          title: hash === 2 ? 'Ngày Hoàng Đạo (Tốc Hỷ)' : 'Ngày Đại An',
          hours: 'Tý (23h-1h), Sửu (1h-3h), Thìn (7h-9h), Tỵ (9h-11h)',
          desc: 'Thích hợp: Ký hợp đồng, đặt cọc, nhập trạch, chuyển nhà.'
        });
      }
      if (dates.length >= 4) break;
    }
    setGoodDays(dates);
  };

  useEffect(() => {
    // Không tự động tính toán, để user thấy form chuyên nghiệp trước
    // if (!result) calculateFengShui();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-24">
      <h1 className="text-3xl lg:text-4xl font-display font-black text-primary text-center uppercase tracking-wider mb-8">
        Chuyên Gia Phong Thuỷ
      </h1>

      <div className="flex bg-gray-100 p-1.5 rounded-2xl max-w-sm mx-auto mb-8 relative">
        <button
          onClick={() => setActiveTab('tuvan')}
          className={`flex-1 py-3 text-sm font-bold font-display uppercase tracking-widest rounded-xl transition-all z-10 ${
            activeTab === 'tuvan' ? 'text-primary shadow-sm bg-white' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          Tư vấn Bát Trạch
        </button>
        <button
          onClick={() => setActiveTab('laban')}
          className={`flex-1 py-3 text-sm font-bold font-display uppercase tracking-widest rounded-xl transition-all z-10 ${
            activeTab === 'laban' ? 'text-primary shadow-sm bg-white' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          La Bàn
        </button>
      </div>

      {activeTab === 'laban' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 max-w-5xl mx-auto">
          {/* Compass Section */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
            {!browserSupported ? (
              <div className="text-center p-6 bg-red-50 text-red-600 rounded-2xl">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-80" />
                <p>Thiết bị hoặc trình duyệt của bạn không hỗ trợ cảm biến hướng.</p>
              </div>
            ) : permissionGranted === null ? (
              <div className="text-center p-8 bg-gray-50 rounded-2xl w-full">
                <Compass className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-6 font-sans text-sm block">
                  Cấp quyền cảm biến để xem tọa độ thực tế tại dự án. Để điện thoại nằm ngang hình số 8.
                </p>
                <button 
                  onClick={requestAccess}
                  className="px-6 py-3 bg-accent text-white font-display font-bold rounded-xl hover:bg-yellow-600 transition-colors shadow-lg"
                >
                  Kích hoạt La Bàn
                </button>
              </div>
            ) : permissionGranted === false ? (
              <div className="text-center p-6 bg-orange-50 text-orange-600 rounded-2xl">
                <p>Quyền bị từ chối. Vui lòng cấp quyền trong cài đặt.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full relative">
                <p className="text-6xl font-display font-black text-primary mb-2 tracking-tighter tabular-nums drop-shadow-sm">
                  {heading !== null ? `${heading}°` : '--°'}
                </p>
                <p className="text-2xl font-display font-bold text-accent uppercase tracking-widest mb-10">
                  {heading !== null ? getDirectionName(heading) : 'Đang tải...'}
                </p>
                
                <div className="relative w-[300px] h-[300px] flex items-center justify-center bg-gray-50 rounded-full inset-shadow-sm">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-100 mix-blend-multiply">
                    {BAGUA_DIRECTIONS.map((dir) => (
                      <div 
                        key={dir.name}
                        className="absolute inset-0 flex items-start justify-center text-sm font-display font-black text-gray-300 py-2 pt-4"
                        style={{ transform: `rotate(${dir.angle}deg)` }}
                      >
                        <span style={{ transform: `rotate(${-dir.angle}deg)` }}>
                          {dir.name === 'Bắc' ? 'N' : dir.name === 'Nam' ? 'S' : dir.name === 'Đông' ? 'E' : dir.name === 'Tây' ? 'W' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Current Heading Marker */}
                  <div className="absolute top-0 w-1.5 h-6 bg-red-500 rounded-full -mt-3 z-20 shadow-md"></div>

                  {/* Rotating Compass Needle */}
                  <motion.div 
                    className="w-[260px] h-[260px] rounded-full border-[6px] border-white bg-gradient-to-br from-white to-gray-50 shadow-2xl flex items-center justify-center relative origin-center"
                    animate={{ rotate: heading !== null ? -heading : 0 }}
                    transition={{ type: "spring", stiffness: 40, damping: 20 }}
                  >
                    <div className="absolute w-2 h-[180px] bg-gradient-to-t from-transparent via-gray-300 to-red-500 rounded-full"></div>
                    <div className="w-6 h-6 bg-primary rounded-full shadow-lg z-10 border-4 border-white"></div>
                    
                    <div className="absolute top-8 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[20px] border-l-transparent border-r-transparent border-b-red-500 shadow-sm"></div>
                    <div className="absolute bottom-8 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-gray-400"></div>
                  </motion.div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col justify-center">
            <h2 className="text-xl font-display font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Info className="text-primary w-6 h-6" /> Cách sử dụng & Chú ý
            </h2>
            <div className="space-y-4 text-sm font-sans text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-2xl">
              <p>
                <strong>Bảo mật & Độ chính xác:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Đứng cách xa các vật kim loại lớn, trụ điện, loa hoặc thiết bị từ tính.</li>
                <li>Mở cửa chính, đứng từ tâm nhà hoặc tâm lô đất nhìn thẳng ra ngoài.</li>
                <li>Kết quả từ la bàn điện thoại mang tính chất tham khảo, có thể sai số 5-10 độ so với la bàn chuyên dụng (La Kinh).</li>
              </ul>
            </div>
            
            {result && (
              <div className="mt-6 p-6 border-2 border-accent/20 bg-accent/5 rounded-2xl text-center">
                <p className="text-sm text-gray-600 mb-2 font-display uppercase tracking-widest">Gợi ý cho KH tuổi {birthYear}</p>
                <p className="font-sans text-sm">
                  Theo thông tin tư vấn, hãy hướng la bàn về các góc: <br/> 
                  <strong className="text-accent">{result.huongTot.map((h: string) => h.split(' ')[0]).join(', ')}</strong> để chỉ cho khách hàng vị trí đón Sinh Khí.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tuvan' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 w-full space-y-8">
          {/* Form */}
          <div className={`transition-all duration-500 ${!result ? 'max-w-3xl mx-auto mt-12' : 'w-full'}`}>
            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl border border-gray-100 relative overflow-hidden">
              <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-display font-black text-primary uppercase tracking-widest mb-2">Hồ Sơ Cung Mệnh</h2>
                  <p className="text-sm font-sans text-gray-500">Tra cứu bát trạch, hướng nhà và ngày giờ tốt theo tuổi</p>
                </div>
                
                <div className={`flex flex-col ${result ? 'md:flex-row md:items-end' : ''} gap-6`}>
                  <div className="flex-1">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Năm sinh âm lịch (Của Chủ Sự)</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-accent/30 rounded-2xl px-5 py-4 text-primary text-xl font-display font-black text-center focus:outline-none transition-all"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="VD: 1990"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 text-center md:text-left">Giới tính</label>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setGender('male')}
                        className={`flex-1 py-4 rounded-2xl font-display font-black text-lg transition-all border-2 ${gender === 'male' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-transparent text-gray-400 hover:bg-gray-50 border-gray-100'}`}
                      >
                        Nam
                      </button>
                      <button 
                        onClick={() => setGender('female')}
                        className={`flex-1 py-4 rounded-2xl font-display font-black text-lg transition-all border-2 ${gender === 'female' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-transparent text-gray-400 hover:bg-gray-50 border-gray-100'}`}
                      >
                        Nữ
                      </button>
                    </div>
                  </div>
                  
                  <div className={`${result ? 'md:w-64' : 'mt-4'}`}>
                    <button 
                      onClick={calculateFengShui}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent to-yellow-600 hover:from-yellow-600 hover:to-accent text-white font-display font-black text-lg shadow-xl shadow-accent/20 transition-all flex items-center justify-center gap-2"
                    >
                      Luận Giải <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8">
              <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-gray-100">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-black text-gray-800 uppercase tracking-widest">Phân tích Bát Trạch</h2>
                    <p className="text-sm font-sans text-gray-500">Kết quả phi cung mệnh theo năm sinh {birthYear}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-8 mb-10">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 rounded-3xl border border-gray-200 text-center lg:text-left relative overflow-hidden group hover:border-gray-300 transition-colors">
                    <p className="text-xs sm:text-sm font-black text-gray-500 uppercase tracking-widest mb-2">Can Chi</p>
                    <p className="text-xl sm:text-2xl xl:text-3xl font-display font-black text-primary truncate leading-tight py-1">{result.canChi}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-6 rounded-3xl border border-accent/20 text-center lg:text-left relative overflow-hidden group hover:border-accent/40 transition-colors">
                    <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-accent/10 rounded-full blur-xl group-hover:bg-accent/20 transition-all"></div>
                    <p className="text-xs sm:text-sm font-black text-accent/80 uppercase tracking-widest mb-2">Ngũ Hành</p>
                    <p className="text-xl sm:text-2xl xl:text-3xl font-display font-black text-accent truncate leading-tight py-1">Mệnh {result.mang}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-3xl border border-blue-100 text-center lg:text-left hover:border-blue-200 transition-colors">
                    <p className="text-xs sm:text-sm font-black text-blue-700/60 uppercase tracking-widest mb-2">Cung Phi</p>
                    <p className="text-xl sm:text-2xl xl:text-3xl font-display font-black text-blue-700 truncate leading-tight py-1">Cung {result.cung}</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-6 rounded-3xl border border-emerald-100 text-center lg:text-left hover:border-emerald-200 transition-colors">
                    <p className="text-xs sm:text-sm font-black text-emerald-700/60 uppercase tracking-widest mb-2">Thiên Hướng</p>
                    <p className="text-lg sm:text-xl xl:text-2xl font-display font-black text-emerald-700 truncate leading-tight py-1 mt-1">{result.trach}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-10">
                  <div className="bg-emerald-50/40 p-6 sm:p-8 rounded-[2rem] border border-emerald-100/60 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-bl-full pointer-events-none"></div>
                    <h3 className="font-display font-black text-emerald-800 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Hướng Cát (Nên Chọn)
                    </h3>
                    <ul className="space-y-4 relative z-10">
                      {result.huongTot.map((h: string, idx: number) => {
                        const [dir, meaning] = h.split(' (');
                        return (
                          <li key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0 group">
                            <span className="font-bold text-gray-700 text-lg group-hover:text-emerald-700 transition-colors">{dir}</span>
                            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-200/50 self-start sm:self-auto text-center">{meaning.replace(')', '')}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  
                  <div className="bg-red-50/40 p-6 sm:p-8 rounded-[2rem] border border-red-100/60 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/20 rounded-bl-full pointer-events-none"></div>
                    <h3 className="font-display font-black text-red-800 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-red-400"></div> Hướng Hung (Nên Tránh)
                    </h3>
                    <ul className="space-y-4 relative z-10">
                      {result.huongXau.map((h: string, idx: number) => {
                        const [dir, meaning] = h.split(' (');
                        return (
                          <li key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0 group">
                            <span className="font-bold text-gray-700 text-lg group-hover:text-red-700 transition-colors">{dir}</span>
                            <span className="text-xs font-black text-red-700 bg-red-100 px-4 py-2 rounded-xl border border-red-200/50 self-start sm:self-auto text-center">{meaning.replace(')', '')}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-gray-100">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-black text-gray-800 uppercase tracking-widest">Ngày Giờ Hoàng Đạo</h2>
                    <p className="text-sm font-sans text-gray-500">Các ngày tốt trong tháng hợp với Mệnh {result.mang} ({result.canChi})</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
                  {goodDays.map((day, idx) => (
                    <div key={idx} className="bg-white border-2 border-gray-100 p-6 md:p-8 rounded-[2rem] hover:border-accent/40 transition-all hover:shadow-xl hover:shadow-accent/5 group">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                        <div>
                          <p className="text-xs sm:text-sm font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-accent" />
                            {day.date.toLocaleDateString('vi-VN')}
                          </p>
                          <p className="text-xl sm:text-2xl xl:text-3xl font-display font-black text-primary">{day.title}</p>
                        </div>
                        <div className="bg-gradient-to-r from-accent to-yellow-500 px-4 py-2 rounded-xl shadow-sm inline-block self-start">
                           <span className="text-xs font-black text-white uppercase tracking-wider">Hợp {result.mang}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl mb-4 text-gray-700">
                        <div className="flex items-start gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="pt-1.5">
                            <strong className="block mb-1 text-gray-900">Giờ tốt:</strong> 
                            <span className="text-gray-600 leading-relaxed block">{day.hours}</span>
                          </div>
                        </div>
                      </div>

                       <div className="flex items-start gap-3 mt-4">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <Star className="w-4 h-4 text-accent" />
                          </div>
                          <p className="text-sm text-gray-600 pt-1.5 leading-relaxed">{day.desc}</p>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
