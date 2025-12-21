import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Calendar, Wallet, Settings, Users, Clock, 
  MapPin, Droplets, Heart, Hammer, Moon, Info, RefreshCw,
  Beef, GraduationCap, ChevronRight, ArrowLeft, Megaphone, CalendarDays,
  Copy, CheckCircle, UserCircle, Shield, FileText, ExternalLink, MoonStar,
  Utensils, Tent, MessageCircle, Gift, Link as LinkIcon, Monitor, Maximize,
  Sun, Sunrise, Volume2, VolumeX, AlertTriangle, Play, Pause, Youtube,
  ChevronLeft, ChevronRight as ChevronRightIcon, Mic, BellOff, Image as ImageIcon,
  Wifi, WifiOff, ChevronDown, ChevronUp, BarChart3, TrendingUp, TrendingDown, Lock, LogOut,
  List, PieChart
} from 'lucide-react';

// --- CONFIGURATION ---
// ⚠️ PASTE URL BARU DARI DEPLOYMENT SAAS v21.0 DISINI ⚠️
const API_URL = "https://script.google.com/macros/s/AKfycbxLDuRPPj1EuijltnonqJe9mBE6Jz9lTaAn_nZrr_7C5h5An0aWz32RVaamnRVsmokC/exec"; 
const DEMO_SCRIPT_ID = "AKfycbzIaG893W90Lo9QQ7UGeC_iuK0kMJS_2pjXhGKnD-7MWN7nhiDntIfdtaqaMSYL_G7K";
const CACHE_KEY_PREFIX = "masjid_data_"; 

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50 text-slate-800">
          <AlertTriangle className="text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Terjadi Kesalahan Aplikasi</h2>
          <div className="bg-red-50 p-3 rounded-lg border border-red-100 mb-6 text-left w-full max-w-sm overflow-auto max-h-32">
            <p className="text-xs font-mono text-red-600 break-words">{this.state.error?.toString()}</p>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-lg">Reset & Muat Ulang</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- IMAGE OPTIMIZER ---
const optimizeImage = (url, width = 800) => {
  if (!url || typeof url !== 'string' || url.length < 5) return "https://images.unsplash.com/photo-1564769629178-580d6be2f6b9?q=80&w=1000"; 
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/); 
    if (idMatch && idMatch[1]) return `https://wsrv.nl/?url=${encodeURIComponent(`https://drive.google.com/uc?export=view&id=${idMatch[1]}`)}&w=${width}&q=80&output=webp`;
  }
  if (url.includes('wsrv.nl') || url.startsWith('data:')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=80&output=webp`;
};

// --- DATE HELPERS ---
const getHijriDate = () => {
  const date = new Intl.DateTimeFormat('id-ID-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(Date.now());
  return date.replace('Tahun', '').replace(/ H/g, '').trim() + " H";
};
const getMasehiDate = () => {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(Date.now()) + " M";
};

// --- TIME STATUS LOGIC ---
const calculateTimeStatus = (jadwal, config) => {
  if (!jadwal || !jadwal.subuh) return { status: 'loading', text: '--:--', next: null };
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const parse = (t) => { if(!t) return 9999; const [h, m] = t.split(':').map(Number); return h*60+m; };
  
  const times = [
    { name: 'Imsak', val: parse(jadwal.imsak) }, { name: 'Subuh', val: parse(jadwal.subuh) }, 
    { name: 'Syuruq', val: parse(jadwal.syuruq) }, { name: 'Dhuha', val: parse(jadwal.dhuha) }, 
    { name: 'Dzuhur', val: parse(jadwal.dzuhur) }, { name: 'Ashar', val: parse(jadwal.ashar) }, 
    { name: 'Maghrib', val: parse(jadwal.maghrib) }, { name: 'Isya', val: parse(jadwal.isya) }
  ];
  
  const sholatWajibNames = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
  const isAdzanNow = times.some(t => sholatWajibNames.includes(t.name) && t.val === currentTime);
  if (isAdzanNow) return { status: 'adzan', text: `ADZAN`, next: null };

  let lastPrayer = null;
  for (let i = times.length - 1; i >= 0; i--) {
    if (times[i].val < currentTime) { 
       if (sholatWajibNames.includes(times[i].name)) { lastPrayer = times[i]; break; }
    }
  }
  
  if (lastPrayer) {
      const minutesSinceAdzan = currentTime - lastPrayer.val;
      const iqomahDur = parseInt(config?.durasi_iqomah) || 10;
      const sholatDur = parseInt(config?.durasi_sholat) || 10; 
      const dzikirDur = parseInt(config?.durasi_dzikir) || 10; 

      if (minutesSinceAdzan < iqomahDur) {
          const secondsLeft = (iqomahDur * 60) - (minutesSinceAdzan * 60 + now.getSeconds());
          const m = Math.floor(secondsLeft / 60);
          const s = secondsLeft % 60;
          return { status: 'iqomah', text: `${m}:${s < 10 ? '0'+s : s}`, next: lastPrayer };
      }
      if (minutesSinceAdzan < (iqomahDur + sholatDur)) return { status: 'sholat', text: 'SHOLAT', next: lastPrayer };
      if (minutesSinceAdzan < (iqomahDur + sholatDur + dzikirDur)) return { status: 'dzikir', text: 'DZIKIR', next: lastPrayer };
  }

  let next = times.find(t => t.val > currentTime);
  if (!next) next = times[1]; 
  return { status: 'normal', text: `${String(Math.floor(((next.val * 60) - (currentTime * 60 + now.getSeconds())) / 3600)).padStart(2,'0')}:${String(Math.floor((((next.val * 60) - (currentTime * 60 + now.getSeconds())) % 3600) / 60)).padStart(2,'0')}:${String(((next.val * 60) - (currentTime * 60 + now.getSeconds())) % 60).padStart(2,'0')}`, next: { name: next.name } };
};

// --- COMPONENTS ---
const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className} ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}>
    {children}
  </div>
);

const Badge = ({ children, type = "info", onClick }) => {
  const colors = { info: "bg-blue-100 text-blue-700", success: "bg-emerald-100 text-emerald-700", warning: "bg-amber-100 text-amber-700", danger: "bg-rose-100 text-rose-700", purple: "bg-purple-100 text-purple-700" };
  return <span onClick={onClick} className={`px-2 py-1 rounded-md text-xs font-semibold ${colors[type] || colors.info} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}>{children}</span>;
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-100">
      <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="flex items-center px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"><ChevronLeft size={14} className="mr-1"/> Prev</button>
      <span className="text-xs font-medium text-gray-500">Hal {currentPage} dari {totalPages}</span>
      <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="flex items-center px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors">Next <ChevronRightIcon size={14} className="ml-1"/></button>
    </div>
  );
};

// --- ACTIVITY SLIDER ---
const ActivitySlider = ({ slides = [] }) => {
  const validSlides = Array.isArray(slides) ? slides.filter(item => {
    const url = typeof item === 'string' ? item : item?.url;
    return url && url.length > 5;
  }) : [];

  const displaySlides = validSlides.length > 0 ? validSlides : [
    { url: "https://images.unsplash.com/photo-1564769629178-580d6be2f6b9?q=80&w=1000", caption: "Masjid Digital" }
  ];

  return (
    <div className="mb-4">
       <h3 className="font-bold text-gray-800 mb-3 px-4 flex items-center gap-2"><ImageIcon size={16} className="text-emerald-600"/> Galeri Aktivitas</h3>
       <div className="flex overflow-x-auto gap-3 px-4 pb-4 snap-x hide-scrollbar">
          {displaySlides.map((item, idx) => {
             const url = typeof item === 'string' ? item : item.url;
             const caption = typeof item === 'string' ? `Slide ${idx+1}` : item.caption;
             return (
               <div key={idx} className="min-w-[280px] h-40 rounded-xl overflow-hidden shadow-md snap-center relative border border-gray-100 shrink-0 group">
                  <img src={optimizeImage(url, 400)} alt={`Slide ${idx}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  {caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6">
                       <p className="text-white text-xs font-medium leading-tight line-clamp-2 drop-shadow-md">{caption}</p>
                    </div>
                  )}
               </div>
             );
          })}
       </div>
    </div>
  );
};

// --- HEADER ---
const Header = ({ profile, config, setView, timeStatus, isOffline, currentUser }) => {
  const [showHijri, setShowHijri] = useState(false);
  useEffect(() => {
    const duration = (config?.durasi_slide_date || 5) * 1000;
    const interval = setInterval(() => setShowHijri(prev => !prev), duration);
    return () => clearInterval(interval);
  }, [config]);

  const bgImage = profile?.bg_utama || "https://images.unsplash.com/photo-1542042956-654e99092d6e?q=80&w=1000";

  return (
    <header className={`relative pt-6 pb-20 px-4 rounded-b-[2rem] overflow-hidden shadow-lg transition-all duration-500`}>
      <div className="absolute inset-0 z-0">
         <img src={optimizeImage(bgImage, 800)} alt="Masjid" className="w-full h-full object-cover" />
         <div className={`absolute inset-0 ${['iqomah', 'adzan'].includes(timeStatus.status) ? 'bg-red-900/90' : 'bg-gradient-to-b from-emerald-900/80 to-emerald-800/90'}`}></div>
      </div>
      
      <div className="relative z-10 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
             {profile?.logo_url ? (
               <img src={optimizeImage(profile.logo_url, 100)} alt="Logo" className="w-12 h-12 rounded-full bg-white p-1 object-contain shadow-lg" />
             ) : (
               <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-bold text-lg border border-white/30">
                 {profile?.nama ? profile.nama.charAt(0) : 'M'}
               </div>
             )}
             <div>
               <h1 className="text-xl font-bold leading-tight shadow-sm">{profile?.nama}</h1>
               <p className="text-emerald-100 text-xs flex items-center gap-1 mt-1 opacity-90"><MapPin size={10} /> {profile?.alamat}</p>
             </div>
          </div>
          <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
             {isOffline && <div className="bg-red-500/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><WifiOff size={10}/> OFFLINE</div>}
             {currentUser && <div className="bg-blue-600/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><UserCircle size={10}/> {currentUser.role}</div>}
             {config?.siklus === 'RAMADHAN' && <Badge type="warning" onClick={() => setView('ramadhan')}>RAMADHAN</Badge>}
             {config?.siklus === 'IDUL_FITRI' && <Badge type="green" onClick={() => setView('idul_fitri')}>IDUL FITRI</Badge>}
             {config?.siklus === 'QURBAN' && <Badge type="danger" onClick={() => setView('qurban')}>IDUL ADHA</Badge>}
          </div>
        </div>
        <div className="mt-8 flex items-end justify-between">
          <div>
            <p className="text-emerald-100 text-[10px] uppercase tracking-wider font-semibold mb-1 opacity-80">
              {['iqomah', 'adzan'].includes(timeStatus.status) ? 'Menuju Sholat' : `Menuju ${timeStatus.next?.name || 'Sholat'}`}
            </p>
            <h2 className={`text-4xl font-bold font-mono leading-none ${['iqomah', 'adzan'].includes(timeStatus.status) ? 'animate-pulse text-red-200' : 'text-white'}`}>
              {timeStatus.text}
            </h2>
          </div>
          {!['iqomah', 'adzan'].includes(timeStatus.status) && (
            <div className="text-right bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-white/10 min-w-[100px]">
               <p className="text-emerald-100 text-[10px] opacity-80 mb-0.5">{showHijri ? 'Hijriah' : 'Masehi'}</p>
               <p className="font-semibold text-xs leading-tight truncate max-w-[150px]">{showHijri ? getHijriDate() : getMasehiDate()}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// --- VIEW HOME ---
const ViewHome = ({ data, setView, timeStatus, currentUser }) => {
  const [showExtras, setShowExtras] = useState(false);
  const [transPage, setTransPage] = useState(1);
  
  const transPerPage = 3;
  const transactions = data?.keuangan?.history || [];
  const totalTransPages = Math.ceil(transactions.length / transPerPage);
  const displayedTrans = transactions.slice((transPage - 1) * transPerPage, transPage * transPerPage);

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  const jadwalUtama = { Subuh: data?.jadwal?.subuh, Dzuhur: data?.jadwal?.dzuhur, Ashar: data?.jadwal?.ashar, Maghrib: data?.jadwal?.maghrib, Isya: data?.jadwal?.isya };
  const jadwalExtra = { Imsak: data?.jadwal?.imsak, Syuruq: data?.jadwal?.syuruq, Dhuha: data?.jadwal?.dhuha };
  const activePembangunan = data?.pembangunan?.active;

  // RBAC Helper
  const hasAccess = (feature) => {
    if (!currentUser) return true; 
    const r = currentUser.role.toUpperCase();
    if (r === 'ADMIN') return true;
    if (r === 'BENDAHARA' && ['donasi','keuangan','pembangunan','qurban'].includes(feature)) return true;
    if (r === 'SEKRETARIS' && ['kegiatan','tpa','petugas'].includes(feature)) return true;
    return false;
  };

  return (
    <div className="pb-32 -mt-12 px-4 relative z-20 space-y-5">
      
      {/* JADWAL CARD */}
      <Card className="shadow-lg border-0 ring-1 ring-black/5 overflow-hidden transition-all duration-300">
        <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-4 text-center">Jadwal Sholat Fardhu</h3>
        <div className="flex justify-between text-center relative z-10 pb-2">
          {Object.entries(jadwalUtama).map(([waktu, jam]) => {
            const isActive = timeStatus.next?.name === waktu && !['iqomah', 'adzan', 'sholat', 'dzikir'].includes(timeStatus.status);
            const isAlert = ['iqomah', 'adzan'].includes(timeStatus.status) && timeStatus.next?.name === waktu;
            return (
              <div key={waktu} className={`flex flex-col items-center p-2 rounded-lg transition-all ${isActive ? 'bg-emerald-50 -translate-y-1' : ''}`}>
                <span className={`text-[10px] capitalize mb-1 ${isActive ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>{waktu}</span>
                <span className={`font-bold text-sm ${isActive ? 'text-emerald-600' : (isAlert ? 'text-red-600 animate-pulse' : 'text-gray-700')}`}>{jam}</span>
              </div>
            );
          })}
        </div>
        <div onClick={() => setShowExtras(!showExtras)} className="flex items-center justify-center gap-1 py-2 cursor-pointer bg-gray-50 border-t border-gray-100 hover:bg-gray-100 transition-colors">
          <span className="text-[10px] text-gray-500 font-medium">Waktu Sunnah & Imsakiyah</span>
          {showExtras ? <ChevronUp size={12} className="text-gray-400"/> : <ChevronDown size={12} className="text-gray-400"/>}
        </div>
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showExtras ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
           <div className="flex justify-center gap-6 py-3 bg-gray-50/50">
             {Object.entries(jadwalExtra).map(([key, val]) => (
               <div key={key} className="text-center">
                 <span className="text-[10px] text-gray-400 block mb-0.5">{key}</span>
                 <span className="text-xs font-bold text-gray-600">{val}</span>
               </div>
             ))}
           </div>
        </div>
      </Card>

      <ActivitySlider slides={data?.profile?.slide_kegiatan} />

      {/* SIKLUS CARD (RBAC Protected) */}
      {data?.config?.siklus === 'RAMADHAN' && <Card onClick={() => setView('ramadhan')} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-lg transform hover:scale-[1.02] transition-transform"><div className="flex justify-between items-center"><div><h3 className="font-bold flex items-center gap-2"><MoonStar size={18}/> Spesial Ramadhan</h3><p className="text-xs text-purple-100 mt-1">Cek Imsakiyah & Jadwal I'tikaf</p></div><ChevronRight className="text-purple-200" size={20}/></div></Card>}
      {data?.config?.siklus === 'IDUL_FITRI' && <Card onClick={() => setView('idul_fitri')} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-lg transform hover:scale-[1.02] transition-transform"><div className="flex justify-between items-center"><div><h3 className="font-bold flex items-center gap-2"><Gift size={18}/> Gema Idul Fitri</h3><p className="text-xs text-emerald-100 mt-1">Info Sholat Ied & Zakat</p></div><ChevronRight className="text-emerald-200" size={20}/></div></Card>}
      {data?.config?.siklus === 'QURBAN' && hasAccess('qurban') && <Card onClick={() => setView('qurban')} className="bg-red-50 border-red-100"><div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-red-100 p-2 rounded-full text-red-600"><Beef size={20}/></div><div><h3 className="font-bold text-red-900">Info Qurban</h3><p className="text-xs text-red-700">Cek data shohibul qurban</p></div></div><ChevronRight className="text-red-400" size={20}/></div></Card>}

      {/* PEMBANGUNAN CARD (Active Project) - RBAC Protected */}
      {activePembangunan && hasAccess('pembangunan') && (
        <Card onClick={() => setView('pembangunan')} className="border-l-4 border-l-orange-500 overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Hammer size={16} className="text-orange-500" />Pembangunan/Renovasi Masjid</h3>
            <span className="text-xs text-gray-500">{activePembangunan.lastupdate}</span>
          </div>
          {activePembangunan.foto_url && (
            <div className="w-full h-32 rounded-lg overflow-hidden mb-3">
               <img src={optimizeImage(activePembangunan.foto_url, 600)} className="w-full h-full object-cover" alt="Progres" />
            </div>
          )}
          <p className="text-sm font-semibold text-gray-800 mb-1">{activePembangunan.tahap}</p>
          <p className="text-xs text-gray-600 mb-2">{activePembangunan.keterangan}</p>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1 relative overflow-hidden">
            <div className="bg-orange-500 h-2 rounded-full text-center transition-all duration-1000" style={{ width: `${activePembangunan.progress}%` }}></div>
          </div>
          <div className="flex justify-between text-xs font-bold"><span className="text-orange-600">{activePembangunan.progress}% Selesai</span><span className="text-blue-600 font-semibold">Lihat Detail & Laporan →</span></div>
        </Card>
      )}

      {/* KEUANGAN SECTION - RBAC Protected */}
      {hasAccess('keuangan') && (
        <div>
          <div className="flex justify-between items-center mb-2 px-1"><h3 className="font-bold text-gray-800">Keuangan Umat</h3></div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="bg-emerald-50 border-emerald-100">
              <p className="text-xs text-gray-500 mb-1">Kas Operasional</p>
              <p className="font-bold text-gray-800 text-sm">{fmt(data?.keuangan?.saldo_operasional)}</p>
            </Card>
            <Card className="bg-blue-50 border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Dana Pembangunan</p>
              <p className="font-bold text-gray-800 text-sm">{fmt(data?.keuangan?.saldo_pembangunan)}</p>
            </Card>
          </div>
          <Card>
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Transaksi Terakhir</h4>
            <div className="space-y-3">
              {displayedTrans.length > 0 ? displayedTrans.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start gap-3 flex-1 overflow-hidden">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.tipe === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {item.tipe === 'IN' ? <Droplets size={14}/> : <Wallet size={14}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-xs leading-tight mb-0.5 break-words line-clamp-2">{item.ket}</p>
                      <p className="text-[10px] text-gray-400">{item.tgl}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ml-2 ${item.tipe === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.tipe === 'IN' ? '+' : '-'}{fmt(item.nominal)}
                  </span>
                </div>
              )) : <p className="text-xs text-center text-gray-400 py-2">Belum ada transaksi</p>}
            </div>
            <Pagination currentPage={transPage} totalPages={totalTransPages} onPageChange={setTransPage} />
          </Card>
        </div>
      )}

      {/* MENU GRID LAYANAN DIGITAL - RBAC FILTERED */}
      <div className="pb-8">
        <h3 className="font-bold text-gray-800 mb-3 px-1">Layanan Digital</h3>
        <div className="grid grid-cols-4 gap-3">
          {hasAccess('tpa') && <div onClick={() => setView('tpa')} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"><div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-yellow-100 text-yellow-600 border border-yellow-200"><GraduationCap size={20}/></div><span className="text-[10px] text-gray-600 text-center font-medium leading-tight">TPA/TPQ</span></div>}
          {hasAccess('kegiatan') && <div onClick={() => setView('kegiatan')} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"><div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-purple-100 text-purple-600 border border-purple-200"><CalendarDays size={20}/></div><span className="text-[10px] text-gray-600 text-center font-medium leading-tight">Agenda</span></div>}
          {hasAccess('petugas') && <div onClick={() => setView('petugas')} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"><div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-blue-100 text-blue-600 border border-blue-200"><Users size={20}/></div><span className="text-[10px] text-gray-600 text-center font-medium leading-tight">Petugas</span></div>}
          {hasAccess('donasi') && <div onClick={() => setView('donasi')} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"><div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-pink-100 text-pink-600 border border-pink-200"><Heart size={20}/></div><span className="text-[10px] text-gray-600 text-center font-medium leading-tight">ZISWAF</span></div>}
        </div>
      </div>
    </div>
  );
};

// --- SUB PAGES & TV ---

// 1. TPA (UPDATED: Stats & List)
const ViewTPA = ({ data, onBack }) => { 
  const openWA = () => { window.open(`https://wa.me/${data?.profile?.wa_admin}?text=Assalamualaikum%2C%20saya%20ingin%20mendaftar%20TPA`, '_blank'); }; 
  const stats = data?.tpa?.stats || { total: 0, ikhwan: 0, akhwat: 0 };
  const list = data?.tpa?.list || [];
  const [page, setPage] = useState(1);
  const perPage = 3;
  const totalPages = Math.ceil(list.length / perPage);
  const displayList = list.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">TPA/TPQ</h2>
      
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 text-center"><p className="text-[10px] text-yellow-700">Total Santri</p><p className="font-bold text-yellow-800 text-lg">{stats.total}</p></div>
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center"><p className="text-[10px] text-blue-700">Ikhwan</p><p className="font-bold text-blue-800 text-lg">{stats.ikhwan}</p></div>
        <div className="bg-pink-50 p-3 rounded-xl border border-pink-200 text-center"><p className="text-[10px] text-pink-700">Akhwat</p><p className="font-bold text-pink-800 text-lg">{stats.akhwat}</p></div>
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-gray-800 mb-2">Grafik Santri</h3>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-100">
          <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${stats.total ? (stats.ikhwan / stats.total) * 100 : 0}%` }}></div>
          <div className="bg-pink-500 h-full transition-all duration-1000" style={{ width: `${stats.total ? (stats.akhwat / stats.total) * 100 : 0}%` }}></div>
        </div>
        <div className="flex justify-between text-[10px] mt-1 text-gray-500">
          <span>Ikhwan ({stats.total ? Math.round((stats.ikhwan / stats.total) * 100) : 0}%)</span>
          <span>Akhwat ({stats.total ? Math.round((stats.akhwat / stats.total) * 100) : 0}%)</span>
        </div>
      </div>

      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Users size={16} className="text-emerald-600"/> Daftar Santri</h3>
      <div className="space-y-3 mb-6">
        {displayList.length > 0 ? displayList.map((item, idx) => (
          <Card key={idx} className="flex justify-between items-center py-3">
            <div><p className="font-bold text-sm text-gray-800">{item.nama}</p><p className="text-xs text-gray-500">{item.jenis_kelamin}</p></div>
            <Badge type="success">{item.status}</Badge>
          </Card>
        )) : (<p className="text-center text-sm text-gray-400 py-4">Belum ada data santri.</p>)}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <button onClick={openWA} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700">
        <MessageCircle size={20}/> Pendaftaran Santri via WA
      </button>
    </div>
  ); 
};

// 2. DONASI / ZISWAF (UPDATED: Tabs & Charts)
const ViewDonasi = ({ data, onBack }) => {
  const [activeTab, setActiveTab] = useState('transfer'); // transfer | list
  const [customAmount, setCustomAmount] = useState(''); 
  const [copied, setCopied] = useState(false);
  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  
  const copyRekening = () => { navigator.clipboard.writeText(data?.profile?.rekening); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const openWA = (amount) => { 
    const val = amount || customAmount;
    const msg = val ? `Konfirmasi donasi sebesar ${val}` : `Konfirmasi donasi`; 
    window.open(`https://wa.me/${data?.profile?.wa_admin}?text=${encodeURIComponent(msg)}`, '_blank'); 
  };

  const ziswafList = data?.ziswaf?.list || [];
  const ziswafStats = data?.ziswaf?.stats || {};
  const [page, setPage] = useState(1);
  const perPage = 5;
  const totalPages = Math.ceil(ziswafList.length / perPage);
  const displayList = ziswafList.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button>
      <div className="text-center mb-6"><div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-pink-600"><Heart size={32}/></div><h2 className="text-xl font-bold text-gray-800">Infaq & ZISWAF</h2><p className="text-sm text-gray-500">Salurkan donasi terbaik anda</p></div>
      
      {/* TABS */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
        <button onClick={() => setActiveTab('transfer')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'transfer' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Transfer/QRIS</button>
        <button onClick={() => setActiveTab('list')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'list' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Daftar Donatur</button>
      </div>

      {activeTab === 'transfer' ? (
        <div className="space-y-4 animate-fade-in">
          <Card className="text-center border-emerald-200 bg-emerald-50">
            <h3 className="font-bold text-emerald-800 mb-2">Scan QRIS</h3>
            {data?.profile?.qris_url ? (<img src={optimizeImage(data.profile.qris_url, 400)} alt="QRIS" className="w-48 h-48 mx-auto object-cover rounded-lg mix-blend-multiply" />) : (<div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">QRIS Belum Tersedia</div>)}
            <p className="text-xs text-emerald-600 mt-2 font-medium">Otomatis terdeteksi seluruh E-Wallet</p>
          </Card>
          <Card>
            <h3 className="font-bold text-gray-800 mb-2">Transfer Bank</h3>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center mb-4">
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Rekening Resmi</p><p className="text-lg font-mono font-bold text-gray-800 my-1">{data?.profile?.rekening}</p><p className="text-xs text-gray-600">a.n {data?.profile?.nama}</p></div>
              <button onClick={copyRekening} className={`p-2 border rounded-lg transition-all ${copied ? 'bg-emerald-100 border-emerald-500 text-emerald-600' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}>{copied ? <CheckCircle size={20}/> : <Copy size={20}/>}</button>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">Pilih Nominal Konfirmasi:</p>
              <div className="flex gap-2 justify-center mb-3">
                <button onClick={() => openWA("Rp 50.000")} className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 hover:bg-green-100">50rb</button>
                <button onClick={() => openWA("Rp 100.000")} className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 hover:bg-green-100">100rb</button>
                <button onClick={() => openWA("Rp 500.000")} className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 hover:bg-green-100">500rb</button>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 mb-2">Nominal Lainnya:</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Contoh: 150000" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  <button onClick={() => openWA(customAmount ? `Rp ${new Intl.NumberFormat('id-ID').format(customAmount)}` : '')} disabled={!customAmount} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700">Kirim Bukti</button>
                </div>
              </div>
              <button onClick={() => openWA("")} className="w-full mt-4 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-gray-200"><MessageCircle size={20}/> Chat Manual Admin</button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* STATS */}
          <div className="grid grid-cols-2 gap-2">
             {Object.entries(ziswafStats).map(([key, val]) => (
                <div key={key} className="bg-white p-3 rounded-xl border border-gray-100 text-center shadow-sm">
                   <p className="text-[10px] text-gray-500 mb-1 capitalize">{key}</p>
                   <p className="font-bold text-gray-800 text-xs">{fmt(val)}</p>
                </div>
             ))}
          </div>
          
          {/* LIST */}
          <Card>
            <h4 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-2"><List size={14}/> Riwayat Donasi</h4>
            <div className="space-y-3">
              {displayList.length > 0 ? displayList.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-700 text-xs">{d.nama}</p>
                    <Badge type="info">{d.jenis}</Badge>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">{fmt(d.nominal)}</span>
                </div>
              )) : <p className="text-center text-xs text-gray-400 py-2">Belum ada data donasi.</p>}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </Card>
        </div>
      )}
    </div>
  );
};

// 3. PETUGAS (UPDATED: Use DB Data)
const ViewPetugas = ({ data, onBack }) => {
  const items = data?.penceramah || [];
  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex items-center text-sm font-semibold text-gray-600 hover:text-emerald-600"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <div className="text-center mb-6"><div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600"><Users size={32}/></div><h2 className="text-xl font-bold text-gray-800">Petugas Masjid</h2><p className="text-sm text-gray-500">Imam, Khotib & Pemateri</p></div>
      <div className="space-y-4">
        {items.length > 0 ? (
          items.map((p, idx) => (
            <Card key={idx} className="flex items-center gap-4">
              <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-gray-400"><UserCircle size={32}/></div>
              <div><h3 className="font-bold text-gray-800">{p.nama}</h3><Badge type="blue">{p.spesialisasi || "Pemateri"}</Badge></div>
            </Card>
          ))
        ) : (<p className="text-center text-gray-400 text-sm">Belum ada data petugas.</p>)}
      </div>
    </div>
  );
};

// 4. PEMBANGUNAN (UPDATED: 3 Tabs)
const ViewPembangunan = ({ data, onBack }) => {
  const [activeTab, setActiveTab] = useState('laporan'); // laporan | keuangan | donatur
  
  const listPembangunan = data?.pembangunan?.list || [];
  const stats = data?.pembangunan?.stats || { total_masuk: 0, total_keluar: 0, saldo_akhir: 0 };
  const donors = data?.pembangunan?.donors || [];
  
  const [donorPage, setDonorPage] = useState(1);
  const perPage = 5;
  const totalPages = Math.ceil(donors.length / perPage);
  const displayDonors = donors.slice((donorPage - 1) * perPage, donorPage * perPage);
  
  const maxVal = Math.max(stats.total_masuk, stats.total_keluar, 1);
  const wIn = (stats.total_masuk / maxVal) * 100;
  const wOut = (stats.total_keluar / maxVal) * 100;
  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  
  const [expandedIndex, setExpandedIndex] = useState(null);
  const toggleAccordion = (index) => setExpandedIndex(expandedIndex === index ? null : index);

  const ConstructionSlider = ({ stages }) => {
    const [idx, setIdx] = useState(0);
    const validStages = stages.filter(s => s.foto_url && s.foto_url.length > 5);
    return (
      <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden mb-6 group shadow-md">
        {validStages.length > 0 ? (
          <>
            <img src={optimizeImage(validStages[idx].foto_url, 800)} className="w-full h-full object-cover transition-all duration-500" alt="Progress" />
            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-3 text-white">
              <div className="flex justify-between items-center"><span className="font-bold text-sm">Tahap {validStages[idx].tahap}</span><span className="text-xs bg-orange-500 px-2 py-0.5 rounded">{validStages[idx].progress}%</span></div>
              <p className="text-xs opacity-90 truncate">{validStages[idx].keterangan}</p>
            </div>
            {validStages.length > 1 && (<><button onClick={(e) => { e.stopPropagation(); setIdx((prev) => (prev - 1 + validStages.length) % validStages.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-1 rounded-full"><ChevronLeft size={20} className="text-white"/></button><button onClick={(e) => { e.stopPropagation(); setIdx((prev) => (prev + 1) % validStages.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-1 rounded-full"><ChevronRight size={20} className="text-white"/></button></>)}
          </>
        ) : (<div className="flex items-center justify-center h-full text-gray-400 text-xs">Belum ada foto dokumentasi</div>)}
      </div>
    );
  };

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button>
      <div className="mb-4"><h2 className="text-2xl font-bold text-gray-800 mb-1">Renovasi Masjid</h2><p className="text-xs text-gray-500">Transparansi Dana & Progres Fisik</p></div>
      
      {/* TABS NAVIGATION */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
        <button onClick={() => setActiveTab('laporan')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'laporan' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Laporan Pembangunan</button>
        <button onClick={() => setActiveTab('keuangan')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'keuangan' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Laporan Keuangan</button>
        <button onClick={() => setActiveTab('donatur')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'donatur' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Daftar Wakaf</button>
      </div>

      {/* TAB 1: LAPORAN FISIK */}
      {activeTab === 'laporan' && (
        <div className="animate-fade-in">
          <ConstructionSlider stages={listPembangunan} />
          <div className="space-y-3">
            {listPembangunan.map((item, idx) => {
              const isOpen = expandedIndex === idx;
              return (
                <Card key={idx} className="p-0 overflow-hidden transition-all duration-300">
                   <div onClick={() => toggleAccordion(idx)} className={`p-4 flex justify-between items-center cursor-pointer ${isOpen ? 'bg-gray-50 border-b border-gray-100' : 'bg-white'}`}><div className="flex items-center gap-3"><div className="bg-orange-100 p-2 rounded-lg text-orange-600 font-bold text-xs">{item.tahap}</div><h3 className="font-bold text-gray-800 text-sm">{item.keterangan || "Detail Pembangunan"}</h3></div><div className="flex items-center gap-2"><Badge type="blue">{item.progress}%</Badge>{isOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}</div></div>
                   <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}><div className="p-4 bg-white">{item.foto_url && (<div className="mb-3 rounded-lg overflow-hidden border border-gray-100"><img src={optimizeImage(item.foto_url, 800)} alt="Foto Proyek" className="w-full h-40 object-cover" /></div>)}<p className="text-xs text-gray-500 mb-2">Update Terakhir: {item.lastupdate}</p><div className="w-full bg-gray-200 rounded-full h-2 mb-1"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${item.progress}%` }}></div></div><p className="text-right text-xs font-bold text-orange-600">{item.progress}% Selesai</p></div></div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LAPORAN KEUANGAN */}
      {activeTab === 'keuangan' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-1 gap-3">
             <Card className="bg-emerald-50 border-emerald-100 text-center"><p className="text-xs text-emerald-700 mb-1">Total Dana Masuk</p><p className="font-bold text-emerald-800 text-xl">{fmt(stats.total_masuk)}</p></Card>
             <Card className="bg-red-50 border-red-100 text-center"><p className="text-xs text-red-700 mb-1">Total Dana Keluar</p><p className="font-bold text-red-800 text-xl">{fmt(stats.total_keluar)}</p></Card>
             <Card className="bg-blue-50 border-blue-100 text-center shadow-md"><p className="text-xs text-blue-700 mb-1">Sisa Saldo Pembangunan</p><p className="font-bold text-blue-800 text-2xl">{fmt(stats.saldo_akhir)}</p></Card>
          </div>
          <Card>
            <h4 className="text-xs font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={14}/> Grafik Arus Kas</h4>
            <div className="space-y-4">
              <div><div className="flex justify-between text-[10px] mb-1"><span>Pemasukan</span><span className="font-bold">{Math.round(wIn)}%</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${wIn}%` }}></div></div></div>
              <div><div className="flex justify-between text-[10px] mb-1"><span>Pengeluaran</span><span className="font-bold">{Math.round(wOut)}%</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${wOut}%` }}></div></div></div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: DAFTAR WAKAF */}
      {activeTab === 'donatur' && (
        <div className="animate-fade-in">
          <Card>
            <h4 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-2"><Users size={14}/> Para Wakif / Donatur</h4>
            <div className="space-y-3">
              {displayDonors.length > 0 ? displayDonors.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <div><p className="font-medium text-gray-700 text-xs">{d.nama}</p><p className="text-[10px] text-gray-400">{d.tgl}</p></div>
                  <span className="text-xs font-bold text-emerald-600">{fmt(d.nominal)}</span>
                </div>
              )) : <p className="text-center text-xs text-gray-400 py-2">Belum ada data wakaf.</p>}
            </div>
            <Pagination currentPage={donorPage} totalPages={totalPages} onPageChange={setDonorPage} />
          </Card>
        </div>
      )}
    </div>
  ); 
};

// 5. KEGIATAN
const ViewKegiatan = ({ data, onBack }) => {
  const items = data?.kegiatan || [];
  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button>
      <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="text-purple-600"/> Agenda Kegiatan</h2></div>
      <div className="space-y-3">
        {items.length > 0 ? items.map((item, idx) => (
          <Card key={idx} className="flex gap-4">
            <div className="flex flex-col items-center justify-center bg-purple-50 w-14 h-14 rounded-lg text-purple-700 shrink-0"><span className="text-[10px] font-bold uppercase">{item.waktu.split(' ')[1]}</span><span className="text-xl font-bold">{item.waktu.split(' ')[0]}</span></div>
            <div><Badge type="purple">{item.tipe || "Kajian"}</Badge><h3 className="font-bold text-gray-800 mt-1">{item.judul}</h3><p className="text-sm text-gray-600">{item.ustadz}</p><div className="flex items-center gap-1 mt-2 text-xs text-gray-400"><Clock size={12}/> {item.jam || "Ba'da Maghrib"}</div></div>
          </Card>
        )) : <p className="text-center text-sm text-gray-400 py-10">Tidak ada agenda.</p>}
      </div>
    </div>
  );
};

// Sub-pages lainnya (Qurban, Ramadhan, Idul Fitri, Admin) tetap sama seperti sebelumnya...
const ViewAdmin = ({ data, onBack, setView, onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!data?.users) { alert("Data user tidak ditemukan di database."); return; }
    
    // Cari user yang cocok
    const foundUser = data.users.find(u => 
      String(u.username).toLowerCase() === String(username).toLowerCase() && 
      String(u.password) === String(password)
    );

    if (foundUser) {
      setUser(foundUser);
      setIsLoggedIn(true);
      onLogin(foundUser); // Update state di Parent App
    } else {
      alert("Username atau Password Salah");
    }
  };

  const sheetUrl = data?.meta?.spreadsheet_url || "https://docs.google.com/spreadsheets";

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex items-center text-sm font-semibold text-gray-600 hover:text-emerald-600"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <div className="text-center mb-6"><div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-600"><Shield size={32}/></div><h2 className="text-xl font-bold text-gray-800">Login Pengurus</h2></div>
      
      {!isLoggedIn ? (
        <Card className="max-w-xs mx-auto">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="ketua / bendahara"/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="••••••"/>
            </div>
            <button type="submit" className="w-full bg-gray-800 text-white py-2 rounded-lg font-bold hover:bg-gray-700 transition">Masuk</button>
          </form>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-emerald-50 border-emerald-200">
            <div className="flex items-start gap-3"><CheckCircle className="text-emerald-600 mt-1" size={20}/>
            <div><h3 className="font-bold text-emerald-800">Login Berhasil</h3><p className="text-sm text-emerald-700">Halo, {user.nama} ({user.role})</p></div></div>
          </Card>
          
          {/* Menu Khusus Admin (TV & Database) */}
          {user.role === 'ADMIN' && (
            <>
              <Card onClick={() => setView('tv')} className="flex items-center justify-between cursor-pointer border-purple-200 bg-purple-50 hover:bg-purple-100 transition"><div className="flex items-center gap-3"><div className="bg-purple-200 p-2 rounded-lg text-purple-700"><Monitor size={20}/></div><div><h4 className="font-bold text-gray-800">Buka Mode Layar TV</h4><p className="text-xs text-gray-500">Digital Signage Landscape</p></div></div><Maximize size={16} className="text-purple-400"/></Card>
              <a href={sheetUrl} target="_blank" rel="noreferrer" className="block"><Card className="flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"><div className="flex items-center gap-3"><div className="bg-green-100 p-2 rounded-lg text-green-700"><FileText size={20}/></div><div><h4 className="font-bold text-gray-800">Database Google Sheets</h4><p className="text-xs text-gray-500">Edit Data Realtime</p></div></div><ExternalLink size={16} className="text-gray-400"/></Card></a>
            </>
          )}

          <button onClick={() => { setIsLoggedIn(false); onLogin(null); }} className="w-full mt-6 text-red-600 text-sm font-bold border border-red-100 py-3 rounded-xl hover:bg-red-50 flex items-center justify-center gap-2"><LogOut size={16}/> Logout</button>
        </div>
      )}
    </div>
  );
};

const ViewRamadhan = ({ data, onBack }) => (<div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50"><button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button><h2 className="text-2xl font-bold text-gray-800 mb-4">Ramadhan</h2><Card><p className="text-center">Jadwal Imsakiyah</p></Card></div>);
const ViewIdulFitri = ({ data, onBack }) => (<div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50"><button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button><h2 className="text-2xl font-bold text-gray-800 mb-4">Idul Fitri</h2><Card><p className="text-center">Info Sholat Ied</p></Card></div>);

const ViewTV = ({ data, onBack, timeStatus }) => {
  const [time, setTime] = useState(new Date());
  const [slideIndex, setSlideIndex] = useState(0); 
  const bgImage = data?.profile?.bg_utama || "https://images.unsplash.com/photo-1542042956-654e99092d6e?q=80&w=1920";
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (['iqomah', 'adzan', 'sholat', 'dzikir'].includes(timeStatus.status)) return; 
    const interval = setInterval(() => {
      if (data?.profile?.slide_kegiatan?.length > 0) {
        setSlideIndex(prev => (prev + 1) % data.profile.slide_kegiatan.length);
      }
    }, (data?.config?.durasi_slide || 15) * 1000);
    return () => clearInterval(interval);
  }, [timeStatus.status, data?.profile?.slide_kegiatan]);

  if (timeStatus.status === 'iqomah') {
    return (
      <div className="fixed inset-0 bg-red-900 text-white flex flex-col items-center justify-center animate-pulse">
         <h1 className="text-9xl font-bold font-mono">{timeStatus.text}</h1>
         <p className="text-4xl mt-8">LURUSKAN & RAPATKAN SHAF</p>
      </div>
    );
  }

  if (timeStatus.status === 'sholat') {
    return <div className="fixed inset-0 bg-black"></div>;
  }

  const currentSlide = data?.profile?.slide_kegiatan?.[slideIndex] || {};
  const slideUrl = typeof currentSlide === 'string' ? currentSlide : currentSlide.url;
  const slideCaption = typeof currentSlide === 'string' ? "" : currentSlide.caption;

  return (
    <div className="fixed inset-0 bg-slate-900 text-white overflow-hidden font-sans">
       <div className="absolute inset-0 z-0">
         <img src={optimizeImage(bgImage, 1280)} className="w-full h-full object-cover opacity-30"/>
       </div>
       <div className="absolute inset-0 z-10 flex flex-col p-10">
         <div className="flex justify-between items-start mb-10">
            <div className="flex items-center gap-6">
              {data.profile.logo_url && <img src={optimizeImage(data.profile.logo_url, 200)} alt="Logo" className="w-24 h-24 rounded-full bg-white p-2 object-contain" />}
              <div>
                <h1 className="text-6xl font-bold text-emerald-400">{data?.profile?.nama}</h1>
                <p className="text-3xl text-gray-300 mt-2">{data?.profile?.alamat}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-8xl font-mono font-bold">{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-3xl text-emerald-400 mt-2">{getHijriDate()}</div>
            </div>
         </div>
         <div className="flex-1 grid grid-cols-12 gap-10">
            <div className="col-span-4 bg-black/40 backdrop-blur rounded-3xl p-6 flex flex-col justify-between border border-white/10">
               {['Subuh', 'Syuruq', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].map(waktu => {
                 const isActive = timeStatus.next?.name === waktu;
                 return (
                   <div key={waktu} className={`flex justify-between items-center p-4 rounded-xl ${isActive ? 'bg-emerald-600 scale-105' : 'bg-white/5'}`}>
                     <span className="text-2xl font-medium">{waktu}</span>
                     <span className="text-4xl font-bold font-mono">{data?.jadwal?.[waktu.toLowerCase()]}</span>
                   </div>
                 )
               })}
            </div>
            <div className="col-span-8 bg-black/40 backdrop-blur rounded-3xl p-8 border border-white/10 flex items-center justify-center relative overflow-hidden">
               {slideIndex === -1 ? (
                 <div className="text-center">
                   <h2 className="text-5xl font-bold text-yellow-400 mb-6">MENUJU WAKTU {timeStatus.next?.name?.toUpperCase()}</h2>
                   <div className="text-[10rem] font-bold font-mono leading-none">{timeStatus.text}</div>
                 </div>
               ) : (
                 <>
                   <img src={optimizeImage(slideUrl, 1280)} className="w-full h-full object-cover rounded-xl"/>
                   {slideCaption && (
                     <div className="absolute bottom-8 left-8 right-8 bg-black/70 p-4 rounded-xl">
                       <p className="text-3xl text-white text-center font-medium">{slideCaption}</p>
                     </div>
                   )}
                 </>
               )}
            </div>
         </div>
         <div className="mt-10 bg-emerald-900/80 p-4 rounded-xl overflow-hidden">
            <div className="whitespace-nowrap text-3xl font-medium animate-[marquee_20s_linear_infinite]">
              +++ {data?.profile?.visi} +++ Info Kajian: {data?.kegiatan?.[0]?.judul || "Belum ada"} +++ Mohon Matikan HP Saat Sholat +++
            </div>
         </div>
       </div>
       <style>{`@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }`}</style>
    </div>
  );
};

// --- MAIN APP (State Management Updated for RBAC & Cache Logic) ---
export default function App() {
  const [view, setView] = useState('home'); 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeStatus, setTimeStatus] = useState({ status: 'loading', text: '--:--' });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [currentUser, setCurrentUser] = useState(null);
  
  const queryParams = new URLSearchParams(window.location.search);
  const masjidId = queryParams.get('id');

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    if (!masjidId) {
      setLoading(false);
      setError("Selamat Datang. Silakan gunakan link khusus masjid Anda (contoh: /?id=nama_masjid)."); 
      return;
    }

    try {
      const response = await fetch(`${API_URL}?id=${masjidId}&nocache=${Date.now()}`);
      if (!response.ok) throw new Error("Gagal terhubung ke Server (Network Error).");

      const json = await response.json();
      
      // KILL SWITCH: Jika Backend bilang Error (Blocked/Not Found), hapus cache.
      if (json.status === 'error') {
        localStorage.removeItem(CACHE_KEY_PREFIX + masjidId);
        throw new Error("BLOCKED: " + json.message); 
      }

      setData(json);
      localStorage.setItem(CACHE_KEY_PREFIX + masjidId, JSON.stringify(json));
      setIsOffline(false);

    } catch (err) { 
      console.error(err); 
      const errorMessage = err.message || "";
      const isBlocked = errorMessage.includes("BLOCKED") || errorMessage.includes("tidak ditemukan") || errorMessage.includes("tidak terdaftar");
      
      if (!isBlocked) {
        const cached = localStorage.getItem(CACHE_KEY_PREFIX + masjidId);
        if (cached) { 
          setData(JSON.parse(cached)); 
          setIsOffline(true); 
        } else {
          setError(errorMessage || "Gagal terhubung ke Database Masjid."); 
        }
      } else {
        setError(errorMessage);
        setData(null); 
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [masjidId]);

  useEffect(() => {
    if(!data) return;
    const tick = setInterval(() => { setTimeStatus(calculateTimeStatus(data.jadwal, data.config)); }, 1000);
    return () => clearInterval(tick);
  }, [data]);

  if (loading) return (<div className="min-h-screen flex flex-col items-center justify-center text-emerald-600"><RefreshCw className="animate-spin mb-2"/><p className="text-xs font-medium text-gray-400">Memuat Data Masjid {masjidId}...</p></div>);
  
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <Info className="text-red-500 mb-2" size={32}/>
      <p className="text-gray-800 font-bold mb-2">{error}</p>
      {masjidId && <button onClick={fetchData} className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">Coba Lagi</button>}
    </div>
  );

  // SAFETY GUARD: Cegah render jika data kosong
  if (!data && !loading && !error) return null;

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans text-slate-800">
      {view === 'tv' ? ( <ViewTV data={data} onBack={() => setView('admin')} timeStatus={timeStatus} /> ) : (
        <ErrorBoundary>
          {view === 'home' && <Header profile={data?.profile} config={data?.config} setView={setView} timeStatus={timeStatus} isOffline={isOffline} currentUser={currentUser} />}
          <main className="animate-fade-in">
            {view === 'home' && <ViewHome data={data} setView={setView} timeStatus={timeStatus} currentUser={currentUser} />}
            {view === 'qurban' && <ViewQurban data={data} onBack={() => setView('home')} />}
            {view === 'pembangunan' && <ViewPembangunan data={data} onBack={() => setView('home')} />}
            {view === 'tpa' && <ViewTPA data={data} onBack={() => setView('home')} />}
            {view === 'kegiatan' && <ViewKegiatan data={data} onBack={() => setView('home')} />}
            {view === 'donasi' && <ViewDonasi data={data} onBack={() => setView('home')} />}
            {view === 'petugas' && <ViewPetugas data={data} onBack={() => setView('home')} />}
            {view === 'admin' && <ViewAdmin data={data} onBack={() => setView('home')} setView={setView} onLogin={setCurrentUser} />}
            {view === 'ramadhan' && <ViewRamadhan data={data} onBack={() => setView('home')} />}
            {view === 'idul_fitri' && <ViewIdulFitri data={data} onBack={() => setView('home')} />}
          </main>
          
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-between items-center z-50 max-w-md mx-auto">
            <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 p-2 ${view === 'home' ? 'text-emerald-600' : 'text-gray-400'}`}><Home size={20}/><span className="text-[10px] font-medium">Beranda</span></button>
            <button onClick={() => setView('donasi')} className={`flex flex-col items-center gap-1 p-2 ${view === 'donasi' ? 'text-emerald-600' : 'text-gray-400'}`}><Wallet size={20}/><span className="text-[10px] font-medium">Donasi</span></button>
            <button onClick={() => setView('kegiatan')} className={`flex flex-col items-center gap-1 p-2 ${view === 'kegiatan' ? 'text-emerald-600' : 'text-gray-400'}`}><Calendar size={20}/><span className="text-[10px] font-medium">Jadwal</span></button>
            
            <button onClick={() => setView('admin')} className={`flex flex-col items-center gap-1 p-2 ${view === 'admin' ? 'text-emerald-600' : 'text-gray-400'}`}>
              {currentUser ? <Settings size={20}/> : <Lock size={20}/>}
              <span className="text-[10px] font-medium">{currentUser ? 'Admin' : 'Login'}</span>
            </button>
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}