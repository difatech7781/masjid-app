import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Calendar, Wallet, Settings, Users, Clock, 
  MapPin, Droplets, Heart, Hammer, Moon, Info, RefreshCw,
  Beef, GraduationCap, ChevronRight, ArrowLeft, Megaphone, CalendarDays,
  Copy, CheckCircle, UserCircle, Shield, FileText, ExternalLink, MoonStar,
  Utensils, Tent, MessageCircle, Gift, Link as LinkIcon, Monitor, Maximize,
  Sun, Sunrise, Volume2, VolumeX, AlertTriangle, Play, Pause, Youtube,
  ChevronLeft, ChevronRight as ChevronRightIcon, Mic, BellOff, Image as ImageIcon,
  Wifi, WifiOff, ChevronDown, ChevronUp, BarChart3, TrendingUp, TrendingDown, 
  Lock, LogOut, List, PieChart, Eye, EyeOff, Plus, X, Edit
} from 'lucide-react';

// --- CONFIGURATION ---
// ⚠️ GANTI DENGAN URL DEPLOYMENT GOOGLE SCRIPT TERBARU ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbxLDuRPPj1EuijltnonqJe9mBE6Jz9lTaAn_nZrr_7C5h5An0aWz32RVaamnRVsmokC/exec"; 
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

// --- UTILS & HELPERS ---
const optimizeImage = (url, width = 800) => {
  if (!url || typeof url !== 'string' || url.length < 5) return "https://images.unsplash.com/photo-1564769629178-580d6be2f6b9?q=80&w=1000"; 
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/); 
    if (idMatch && idMatch[1]) return `https://wsrv.nl/?url=${encodeURIComponent(`https://drive.google.com/uc?export=view&id=${idMatch[1]}`)}&w=${width}&q=80&output=webp`;
  }
  if (url.includes('wsrv.nl') || url.startsWith('data:')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=80&output=webp`;
};

const getHijriDate = () => {
  const date = new Intl.DateTimeFormat('id-ID-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(Date.now());
  return date.replace('Tahun', '').replace(/ H/g, '').trim() + " H";
};

const getMasehiDate = () => {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(Date.now()) + " M";
};

const calculateTimeStatus = (jadwal, config) => {
  if (!jadwal || !jadwal.subuh) return { status: 'loading', text: '--:--', next: null };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const parse = (t) => { if(!t) return 9999; const [h, m] = t.split(':').map(Number); return h*60+m; };
  
  const times = [
    { name: 'Imsak', val: parse(jadwal.imsak) }, { name: 'Subuh', val: parse(jadwal.subuh) }, 
    { name: 'Syuruq', val: parse(jadwal.syuruq) }, { name: 'Dhuha', val: parse(jadwal.dhuha) }, 
    { name: 'Dzuhur', val: parse(jadwal.dzuhur) }, { name: 'Ashar', val: parse(jadwal.ashar) }, 
    { name: 'Maghrib', val: parse(jadwal.maghrib) }, { name: 'Isya', val: parse(jadwal.isya) }
  ];
  
  // Logic Anti Minus: Cari waktu berikutnya. Jika habis, ambil Subuh besok.
  let next = times.find(t => t.val > currentMinutes);
  let isTomorrow = false;
  if (!next) { next = times[1]; isTomorrow = true; } // times[1] is Subuh (times[0] is Imsak)

  let diffMinutes = next.val - currentMinutes;
  if (isTomorrow) { diffMinutes = (24 * 60 - currentMinutes) + next.val; }
  
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  const s = 59 - now.getSeconds();
  
  const text = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return { status: 'normal', text, next };
};

// --- UI COMPONENTS ---
const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className} ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}>
    {children}
  </div>
);

const Badge = ({ children, type = "info" }) => {
  const colors = { info: "bg-blue-100 text-blue-700", success: "bg-emerald-100 text-emerald-700", warning: "bg-amber-100 text-amber-700", danger: "bg-rose-100 text-rose-700", purple: "bg-purple-100 text-purple-700" };
  return <span className={`px-2 py-1 rounded-md text-xs font-semibold ${colors[type] || colors.info}`}>{children}</span>;
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

const ModalInput = ({ isOpen, onClose, title, onSubmit, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full sm:w-full max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl transform transition-all">
        <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold mt-2 shadow-lg hover:bg-emerald-700 active:scale-95 transition-all">Simpan Data</button>
        </form>
      </div>
    </div>
  );
};

const ActivitySlider = ({ slides = [] }) => {
  const validSlides = Array.isArray(slides) ? slides.filter(item => (typeof item === 'string' ? item : item?.url)) : [];
  const displaySlides = validSlides.length > 0 ? validSlides : [{ url: "https://images.unsplash.com/photo-1564769629178-580d6be2f6b9?q=80&w=1000", caption: "Masjid Digital" }];
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
                  {caption && (<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6"><p className="text-white text-xs font-medium leading-tight line-clamp-2 drop-shadow-md">{caption}</p></div>)}
               </div>
             );
          })}
       </div>
    </div>
  );
};

// --- DASHBOARD PANELS ---
const DashboardAdmin = ({ data }) => (
  <div className="space-y-3"><Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm"><div className="flex items-center gap-3"><div className="bg-blue-100 p-2 rounded-lg text-blue-700"><Shield size={24}/></div><div><h3 className="font-bold text-blue-800">Panel Ketua (Admin)</h3><p className="text-xs text-blue-600">Akses Penuh ke seluruh sistem</p></div></div></Card></div>
);
const DashboardSekretaris = ({ onAddKegiatan, onAddSantri }) => (
  <div className="space-y-3"><Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-200 shadow-sm"><div className="flex items-center gap-3"><div className="bg-purple-100 p-2 rounded-lg text-purple-700"><FileText size={24}/></div><div><h3 className="font-bold text-purple-800">Panel Sekretaris</h3><p className="text-xs text-purple-600">Manajemen Jadwal & Santri</p></div></div></Card><div className="grid grid-cols-2 gap-3"><button onClick={onAddKegiatan} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-200 transition-all shadow-sm"><div className="bg-purple-100 p-2 rounded-full text-purple-600"><Plus size={20}/></div><span className="text-xs font-bold text-gray-700">Tambah Jadwal</span></button><button onClick={onAddSantri} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-200 transition-all shadow-sm"><div className="bg-purple-100 p-2 rounded-full text-purple-600"><Plus size={20}/></div><span className="text-xs font-bold text-gray-700">Tambah Santri</span></button></div></div>
);
const DashboardBendahara = ({ onAddTransaksi, onAddZiswaf }) => (
  <div className="space-y-3"><Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-sm"><div className="flex items-center gap-3"><div className="bg-emerald-100 p-2 rounded-lg text-emerald-700"><Wallet size={24}/></div><div><h3 className="font-bold text-emerald-800">Panel Bendahara</h3><p className="text-xs text-emerald-600">Manajemen Kas & Ziswaf</p></div></div></Card><div className="grid grid-cols-2 gap-3"><button onClick={onAddTransaksi} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"><div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><Plus size={20}/></div><span className="text-xs font-bold text-gray-700">Catat Transaksi</span></button><button onClick={onAddZiswaf} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"><div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><Plus size={20}/></div><span className="text-xs font-bold text-gray-700">Input ZISWAF</span></button></div></div>
);

// --- MAIN VIEWS ---

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
      <div className="absolute inset-0 z-0"><img src={optimizeImage(bgImage, 800)} alt="Masjid" className="w-full h-full object-cover" /><div className={`absolute inset-0 ${['iqomah', 'adzan'].includes(timeStatus.status) ? 'bg-red-900/90' : 'bg-gradient-to-b from-emerald-900/80 to-emerald-800/90'}`}></div></div>
      <div className="relative z-10 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
             {profile?.logo_url ? <img src={optimizeImage(profile.logo_url, 100)} alt="Logo" className="w-12 h-12 rounded-full bg-white p-1 object-contain shadow-lg" /> : <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-bold text-lg border border-white/30">{profile?.nama ? profile.nama.charAt(0) : 'M'}</div>}
             <div><h1 className="text-xl font-bold leading-tight shadow-sm">{profile?.nama}</h1><p className="text-emerald-100 text-xs flex items-center gap-1 mt-1 opacity-90"><MapPin size={10} /> {profile?.alamat}</p></div>
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
          <div><p className="text-emerald-100 text-[10px] uppercase tracking-wider font-semibold mb-1 opacity-80">{['iqomah', 'adzan'].includes(timeStatus.status) ? 'Menuju Sholat' : `Menuju ${timeStatus.next?.name || 'Sholat'}`}</p><h2 className={`text-4xl font-bold font-mono leading-none ${['iqomah', 'adzan'].includes(timeStatus.status) ? 'animate-pulse text-red-200' : 'text-white'}`}>{timeStatus.text}</h2></div>
          {!['iqomah', 'adzan'].includes(timeStatus.status) && (<div className="text-right bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-white/10 min-w-[100px]"><p className="text-emerald-100 text-[10px] opacity-80 mb-0.5">{showHijri ? 'Hijriah' : 'Masehi'}</p><p className="font-semibold text-xs leading-tight truncate max-w-[150px]">{showHijri ? getHijriDate() : getMasehiDate()}</p></div>)}
        </div>
      </div>
    </header>
  );
};

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

  const hasAccess = (feature) => {
    if (!currentUser) return true; 
    const r = currentUser.role.toUpperCase();
    if (r === 'ADMIN' || r === 'SUPERADMIN') return true;
    if (r.includes('BENDAHARA') && ['donasi','keuangan','pembangunan','qurban'].includes(feature)) return true;
    if (r === 'SEKRETARIS' && ['kegiatan','tpa','petugas'].includes(feature)) return true;
    return false;
  };

  return (
    <div className="pb-32 -mt-12 px-4 relative z-20 space-y-5">
      <Card className="shadow-lg border-0 ring-1 ring-black/5 overflow-hidden transition-all duration-300">
        <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-4 text-center">Jadwal Sholat Fardhu</h3>
        <div className="flex justify-between text-center relative z-10 pb-2">
          {Object.entries(jadwalUtama).map(([waktu, jam]) => {
            const isActive = timeStatus.next?.name === waktu && !['iqomah', 'adzan', 'sholat', 'dzikir'].includes(timeStatus.status);
            return (<div key={waktu} className={`flex flex-col items-center p-2 rounded-lg transition-all ${isActive ? 'bg-emerald-50 -translate-y-1' : ''}`}><span className={`text-[10px] capitalize mb-1 ${isActive ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>{waktu}</span><span className={`font-bold text-sm ${isActive ? 'text-emerald-600' : 'text-gray-700'}`}>{jam}</span></div>);
          })}
        </div>
        <div onClick={() => setShowExtras(!showExtras)} className="flex items-center justify-center gap-1 py-2 cursor-pointer bg-gray-50 border-t border-gray-100 hover:bg-gray-100 transition-colors"><span className="text-[10px] text-gray-500 font-medium">Waktu Sunnah & Imsakiyah</span>{showExtras ? <ChevronUp size={12} className="text-gray-400"/> : <ChevronDown size={12} className="text-gray-400"/>}</div>
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showExtras ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}><div className="flex justify-center gap-6 py-3 bg-gray-50/50">{Object.entries(jadwalExtra).map(([key, val]) => (<div key={key} className="text-center"><span className="text-[10px] text-gray-400 block mb-0.5">{key}</span><span className="text-xs font-bold text-gray-600">{val}</span></div>))}</div></div>
      </Card>

      <ActivitySlider slides={data?.profile?.slide_kegiatan} />

      {data?.config?.siklus === 'RAMADHAN' && <Card onClick={() => setView('ramadhan')} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-lg transform hover:scale-[1.02] transition-transform"><div className="flex justify-between items-center"><div><h3 className="font-bold flex items-center gap-2"><MoonStar size={18}/> Spesial Ramadhan</h3><p className="text-xs text-purple-100 mt-1">Cek Imsakiyah & Jadwal I'tikaf</p></div><ChevronRight className="text-purple-200" size={20}/></div></Card>}
      {data?.config?.siklus === 'IDUL_FITRI' && <Card onClick={() => setView('idul_fitri')} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-lg transform hover:scale-[1.02] transition-transform"><div className="flex justify-between items-center"><div><h3 className="font-bold flex items-center gap-2"><Gift size={18}/> Gema Idul Fitri</h3><p className="text-xs text-emerald-100 mt-1">Info Sholat Ied & Zakat</p></div><ChevronRight className="text-emerald-200" size={20}/></div></Card>}
      {data?.config?.siklus === 'QURBAN' && hasAccess('qurban') && <Card onClick={() => setView('qurban')} className="bg-red-50 border-red-100"><div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-red-100 p-2 rounded-full text-red-600"><Beef size={20}/></div><div><h3 className="font-bold text-red-900">Info Qurban</h3><p className="text-xs text-red-700">Cek data shohibul qurban</p></div></div><ChevronRight className="text-red-400" size={20}/></div></Card>}

      {activePembangunan && hasAccess('pembangunan') && (
        <Card onClick={() => setView('pembangunan')} className="border-l-4 border-l-orange-500 overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Hammer size={16} className="text-orange-500" />Pembangunan/Renovasi</h3><span className="text-xs text-gray-500">{activePembangunan.lastupdate}</span></div>
          {activePembangunan.foto_url && (<div className="w-full h-32 rounded-lg overflow-hidden mb-3"><img src={optimizeImage(activePembangunan.foto_url, 600)} className="w-full h-full object-cover" alt="Progres" /></div>)}
          <p className="text-sm font-semibold text-gray-800 mb-1">{activePembangunan.tahap}</p><p className="text-xs text-gray-600 mb-2">{activePembangunan.keterangan}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1 relative overflow-hidden"><div className="bg-orange-500 h-2 rounded-full text-center transition-all duration-1000" style={{ width: `${activePembangunan.progress}%` }}></div></div>
          <div className="flex justify-between text-xs font-bold"><span className="text-orange-600">{activePembangunan.progress}% Selesai</span><span className="text-blue-600 font-semibold">Lihat Detail & Laporan →</span></div>
        </Card>
      )}

      {hasAccess('keuangan') && (
        <div>
          <div className="flex justify-between items-center mb-2 px-1"><h3 className="font-bold text-gray-800">Keuangan Umat</h3></div>
          <div className="grid grid-cols-2 gap-3 mb-4"><Card className="bg-emerald-50 border-emerald-100"><p className="text-xs text-gray-500 mb-1">Kas Operasional</p><p className="font-bold text-gray-800 text-sm">{fmt(data?.keuangan?.saldo_operasional)}</p></Card><Card className="bg-blue-50 border-blue-100"><p className="text-xs text-gray-500 mb-1">Dana Pembangunan</p><p className="font-bold text-gray-800 text-sm">{fmt(data?.keuangan?.saldo_pembangunan)}</p></Card></div>
          <Card>
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Transaksi Terakhir</h4>
            <div className="space-y-3">
              {displayedTrans.map((item, idx) => (<div key={idx} className="flex justify-between items-start text-sm border-b border-gray-50 last:border-0 pb-3 last:pb-0"><div className="flex items-start gap-3 flex-1 overflow-hidden"><div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.tipe === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{item.tipe === 'IN' ? <Droplets size={14}/> : <Wallet size={14}/>}</div><div className="flex-1 min-w-0"><p className="font-medium text-gray-800 text-xs leading-tight mb-0.5 break-words line-clamp-2">{item.ket}</p><p className="text-[10px] text-gray-400">{item.tgl}</p></div></div><span className={`text-xs font-bold flex-shrink-0 ml-2 ${item.tipe === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.tipe === 'IN' ? '+' : '-'}{fmt(item.nominal)}</span></div>))}
            </div>
            <Pagination currentPage={transPage} totalPages={totalTransPages} onPageChange={setTransPage} />
          </Card>
        </div>
      )}

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
// --- SUB PAGES ---

const ViewTPA = ({ data, onBack }) => { 
  const openWA = () => { window.open(`https://wa.me/${data?.profile?.wa_admin}?text=Assalamualaikum%2C%20saya%20ingin%20mendaftar%20TPA`, '_blank'); }; 
  const stats = data?.tpa?.stats || { total: 0, ikhwan: 0, akhwat: 0 };
  const list = data?.tpa?.list || [];
  const [page, setPage] = useState(1);
  const perPage = 5;
  const totalPages = Math.ceil(list.length / perPage);
  const displayList = list.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600 hover:text-emerald-600 transition-colors"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><GraduationCap className="text-yellow-500"/> Data TPA/TPQ</h2>
      
      {/* STATISTIK SANTRI */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 text-center shadow-sm">
          <p className="text-[10px] text-yellow-700 uppercase font-bold tracking-wider">Total Santri</p>
          <p className="font-bold text-yellow-800 text-2xl mt-1">{stats.total}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center shadow-sm">
          <p className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">Ikhwan</p>
          <p className="font-bold text-blue-800 text-2xl mt-1">{stats.ikhwan}</p>
        </div>
        <div className="bg-pink-50 p-3 rounded-xl border border-pink-200 text-center shadow-sm">
          <p className="text-[10px] text-pink-700 uppercase font-bold tracking-wider">Akhwat</p>
          <p className="font-bold text-pink-800 text-2xl mt-1">{stats.akhwat}</p>
        </div>
      </div>

      {/* GRAFIK SANTRI */}
      <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3 text-sm">Komposisi Santri</h3>
        <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-gray-100">
          <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${stats.total ? (stats.ikhwan / stats.total) * 100 : 0}%` }}></div>
          <div className="bg-pink-500 h-full transition-all duration-1000" style={{ width: `${stats.total ? (stats.akhwat / stats.total) * 100 : 0}%` }}></div>
        </div>
        <div className="flex justify-between text-[10px] mt-2 text-gray-500 font-medium">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Ikhwan ({stats.total ? Math.round((stats.ikhwan / stats.total) * 100) : 0}%)</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"></div> Akhwat ({stats.total ? Math.round((stats.akhwat / stats.total) * 100) : 0}%)</span>
        </div>
      </div>

      {/* LIST SANTRI */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"><List size={16} className="text-emerald-600"/> Daftar Santri Aktif</h3>
        <div className="space-y-2">
          {displayList.length > 0 ? displayList.map((item, idx) => (
            <Card key={idx} className="flex justify-between items-center py-3 px-4 hover:bg-gray-50 transition-colors border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${item.jenis_kelamin === 'L' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                  {item.nama.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-800 leading-tight">{item.nama}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                </div>
              </div>
              <Badge type="success">Aktif</Badge>
            </Card>
          )) : (
            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-sm text-gray-400">Belum ada data santri.</p>
            </div>
          )}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <button onClick={openWA} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all">
        <MessageCircle size={20}/> Pendaftaran Santri via WA
      </button>
    </div>
  ); 
};

const ViewDonasi = ({ data, onBack }) => {
  const [activeTab, setActiveTab] = useState('transfer');
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
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600 hover:text-emerald-600 transition-colors"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <div className="text-center mb-6">
        <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-pink-600 shadow-sm"><Heart size={32}/></div>
        <h2 className="text-xl font-bold text-gray-800">Infaq & ZISWAF</h2>
        <p className="text-sm text-gray-500">Salurkan donasi terbaik anda</p>
      </div>
      
      {/* TABS */}
      <div className="flex p-1 bg-gray-200 rounded-xl mb-6 shadow-inner">
        <button onClick={() => setActiveTab('transfer')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'transfer' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Transfer/QRIS</button>
        <button onClick={() => setActiveTab('list')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'list' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Daftar Donatur</button>
      </div>

      {activeTab === 'transfer' ? (
        <div className="space-y-4 animate-fade-in">
          <Card className="text-center border-emerald-200 bg-emerald-50">
            <h3 className="font-bold text-emerald-800 mb-2 text-sm uppercase tracking-wide">Scan QRIS</h3>
            {data?.profile?.qris_url ? (
              <img src={optimizeImage(data.profile.qris_url, 400)} alt="QRIS" className="w-48 h-48 mx-auto object-cover rounded-lg mix-blend-multiply border border-white shadow-sm" />
            ) : (
              <div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">QRIS Belum Tersedia</div>
            )}
            <p className="text-xs text-emerald-600 mt-2 font-medium">Otomatis terdeteksi seluruh E-Wallet</p>
          </Card>
          <Card>
            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Transfer Bank</h3>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center mb-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Rekening Resmi</p>
                <p className="text-lg font-mono font-bold text-gray-800 my-1 leading-tight">{data?.profile?.rekening}</p>
                <p className="text-xs text-gray-600 font-medium">a.n {data?.profile?.nama}</p>
              </div>
              <button onClick={copyRekening} className={`p-2 border rounded-lg transition-all active:scale-95 ${copied ? 'bg-emerald-100 border-emerald-500 text-emerald-600' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                {copied ? <CheckCircle size={20}/> : <Copy size={20}/>}
              </button>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2 font-medium">Pilih Nominal Konfirmasi:</p>
              <div className="flex gap-2 justify-center mb-4">
                <button onClick={() => openWA("Rp 50.000")} className="px-4 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200 hover:bg-green-100 transition-colors">50rb</button>
                <button onClick={() => openWA("Rp 100.000")} className="px-4 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200 hover:bg-green-100 transition-colors">100rb</button>
                <button onClick={() => openWA("Rp 500.000")} className="px-4 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200 hover:bg-green-100 transition-colors">500rb</button>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 mb-2 font-medium text-left">Nominal Lainnya:</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Contoh: 150000" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                  <button onClick={() => openWA(customAmount ? `Rp ${new Intl.NumberFormat('id-ID').format(customAmount)}` : '')} disabled={!customAmount} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors">Kirim Bukti</button>
                </div>
              </div>
              <button onClick={() => openWA("")} className="w-full mt-4 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                <MessageCircle size={20}/> Chat Manual Admin
              </button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* ZISWAF STATS */}
          <div className="grid grid-cols-2 gap-3">
             {Object.entries(ziswafStats).map(([key, val]) => (
                <div key={key} className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm">
                   <p className="text-[10px] text-gray-500 mb-1 capitalize tracking-wider font-bold">{key}</p>
                   <p className="font-bold text-gray-800 text-sm truncate">{fmt(val)}</p>
                </div>
             ))}
          </div>
          
          {/* LIST */}
          <Card>
            <h4 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-2 uppercase tracking-wide"><List size={14} className="text-emerald-600"/> Riwayat Donasi Terbaru</h4>
            <div className="space-y-2">
              {displayList.length > 0 ? displayList.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-3 last:pb-0 hover:bg-gray-50 p-2 rounded transition-colors">
                  <div>
                    <p className="font-bold text-xs text-gray-700 mb-1">{d.nama}</p>
                    <Badge type="info">{d.jenis}</Badge>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">{fmt(d.nominal)}</span>
                </div>
              )) : <p className="text-center text-xs text-gray-400 py-6">Belum ada data donasi.</p>}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </Card>
        </div>
      )}
    </div>
  );
};

const ViewPetugas = ({ data, onBack }) => {
  const items = data?.penceramah || [];
  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex items-center text-sm font-semibold text-gray-600 hover:text-emerald-600 transition-colors"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <div className="text-center mb-6"><div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600 shadow-sm"><Users size={32}/></div><h2 className="text-xl font-bold text-gray-800">Petugas Masjid</h2><p className="text-sm text-gray-500">Imam, Khotib & Pemateri</p></div>
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((p, idx) => (
            <Card key={idx} className="flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
              <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-gray-500 shrink-0"><UserCircle size={32}/></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{p.nama}</h3>
                <div className="flex justify-between items-center mt-1">
                   <Badge type="blue">{p.spesialisasi || "Pemateri"}</Badge>
                   {p.no_wa && <a href={`https://wa.me/${p.no_wa}`} target="_blank" className="text-emerald-600 text-xs flex items-center gap-1 hover:underline font-medium"><MessageCircle size={12}/> Hubungi</a>}
                </div>
              </div>
            </Card>
          ))
        ) : (<p className="text-center text-gray-400 text-sm py-10 bg-white rounded-xl border border-dashed">Belum ada data petugas.</p>)}
      </div>
    </div>
  );
};

const ViewKegiatan = ({ data, onBack }) => {
  const items = data?.kegiatan || [];
  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600 hover:text-emerald-600 transition-colors"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="text-purple-600"/> Agenda Kegiatan</h2></div>
      <div className="space-y-3">
        {items.length > 0 ? items.map((item, idx) => (
          <Card key={idx} className="flex gap-4 hover:shadow-md transition-all duration-300 border-l-4 border-l-purple-500">
            <div className="flex flex-col items-center justify-center bg-purple-50 w-14 h-14 rounded-lg text-purple-700 shrink-0 border border-purple-100">
               <span className="text-[10px] font-bold uppercase tracking-wider">TGL</span>
               <span className="text-xl font-bold">{item.waktu ? item.waktu.split(' ')[0].substring(0,2) : '--'}</span>
            </div>
            <div className="flex-1">
               <div className="flex justify-between items-start">
                 <Badge type="purple">Kajian</Badge>
               </div>
               <h3 className="font-bold text-gray-800 mt-1 text-sm leading-snug">{item.judul}</h3>
               <p className="text-xs text-gray-600 mt-1 flex items-center gap-1 font-medium"><UserCircle size={12} className="text-purple-400"/> {item.ustadz || item['ustadz/pic']}</p>
               <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded w-fit"><Clock size={10}/> {item.waktu}</div>
            </div>
          </Card>
        )) : <p className="text-center text-sm text-gray-400 py-10 bg-white rounded-xl border border-dashed">Tidak ada agenda aktif.</p>}
      </div>
    </div>
  );
};

const ViewPembangunan = ({ data, onBack }) => {
  const [activeTab, setActiveTab] = useState('laporan'); 
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
      <div className="relative w-full h-56 bg-gray-100 rounded-xl overflow-hidden mb-6 group shadow-lg border border-gray-200">
        {validStages.length > 0 ? (
          <>
            <img src={optimizeImage(validStages[idx].foto_url, 800)} className="w-full h-full object-cover transition-all duration-500" alt="Progress" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
              <div className="flex justify-between items-center mb-1">
                 <span className="font-bold text-sm bg-black/30 px-2 py-1 rounded backdrop-blur-sm border border-white/20">Tahap {validStages[idx].tahap}</span>
                 <span className="text-xs bg-orange-500 px-2 py-1 rounded font-bold shadow-sm">{validStages[idx].progress}%</span>
              </div>
              <p className="text-xs opacity-90 truncate font-medium">{validStages[idx].keterangan}</p>
            </div>
            {validStages.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setIdx((prev) => (prev - 1 + validStages.length) % validStages.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full backdrop-blur-sm transition-all"><ChevronLeft size={20} className="text-white"/></button>
                <button onClick={(e) => { e.stopPropagation(); setIdx((prev) => (prev + 1) % validStages.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full backdrop-blur-sm transition-all"><ChevronRight size={20} className="text-white"/></button>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs gap-2">
            <div className="bg-gray-200 p-3 rounded-full"><ImageIcon size={24}/></div>
            <p>Belum ada foto dokumentasi</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600 hover:text-emerald-600 transition-colors"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2"><Hammer className="text-orange-500"/> Renovasi Masjid</h2>
        <p className="text-xs text-gray-500">Transparansi Dana & Progres Fisik</p>
      </div>
      
      {/* TABS 3 */}
      <div className="flex p-1 bg-gray-200 rounded-xl mb-6 shadow-inner">
        <button onClick={() => setActiveTab('laporan')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'laporan' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Fisik</button>
        <button onClick={() => setActiveTab('keuangan')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'keuangan' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Keuangan</button>
        <button onClick={() => setActiveTab('donatur')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'donatur' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Wakaf</button>
      </div>

      {activeTab === 'laporan' && (
        <div className="animate-fade-in">
          <ConstructionSlider stages={listPembangunan} />
          <div className="space-y-3">
            {listPembangunan.map((item, idx) => {
              const isOpen = expandedIndex === idx;
              return (
                <Card key={idx} className="p-0 overflow-hidden transition-all duration-300 border border-gray-100">
                   <div onClick={() => toggleAccordion(idx)} className={`p-4 flex justify-between items-center cursor-pointer ${isOpen ? 'bg-orange-50 border-b border-orange-100' : 'bg-white hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                         <div className="bg-orange-100 w-8 h-8 flex items-center justify-center rounded-lg text-orange-600 font-bold text-xs shadow-sm">{item.tahap}</div>
                         <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{item.keterangan || "Detail Pembangunan"}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge type="blue">{item.progress}%</Badge>
                        {isOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                      </div>
                   </div>
                   <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="p-4 bg-white">
                         {item.foto_url && (<div className="mb-3 rounded-lg overflow-hidden border border-gray-100 shadow-sm"><img src={optimizeImage(item.foto_url, 800)} alt="Foto Proyek" className="w-full h-40 object-cover" /></div>)}
                         <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Clock size={10}/> Update Terakhir: {item.lastupdate}</p>
                         <div className="w-full bg-gray-200 rounded-full h-2 mb-1"><div className="bg-orange-500 h-2 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${item.progress}%` }}></div></div>
                         <p className="text-right text-xs font-bold text-orange-600">{item.progress}% Selesai</p>
                      </div>
                   </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'keuangan' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-1 gap-3">
             <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 text-center shadow-sm">
               <p className="text-xs text-emerald-700 mb-1 font-bold uppercase tracking-wider">Total Dana Masuk</p>
               <p className="font-bold text-emerald-800 text-xl font-mono">{fmt(stats.total_masuk)}</p>
             </Card>
             <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-100 text-center shadow-sm">
               <p className="text-xs text-red-700 mb-1 font-bold uppercase tracking-wider">Total Dana Keluar</p>
               <p className="font-bold text-red-800 text-xl font-mono">{fmt(stats.total_keluar)}</p>
             </Card>
             <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 text-center shadow-md ring-1 ring-blue-200">
               <p className="text-xs text-blue-700 mb-1 font-bold uppercase tracking-wider">Sisa Saldo Pembangunan</p>
               <p className="font-bold text-blue-800 text-2xl font-mono">{fmt(stats.saldo_akhir)}</p>
             </Card>
          </div>
          <Card>
            <h4 className="text-xs font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={14}/> Grafik Arus Kas</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-medium text-gray-600"><span>Pemasukan</span><span className="font-bold">{Math.round(wIn)}%</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${wIn}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-medium text-gray-600"><span>Pengeluaran</span><span className="font-bold">{Math.round(wOut)}%</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${wOut}%` }}></div></div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'donatur' && (
        <div className="animate-fade-in">
          <Card>
            <h4 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-2 uppercase tracking-wide"><Users size={14}/> Para Wakif / Donatur</h4>
            <div className="space-y-3">
              {displayDonors.length > 0 ? displayDonors.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0 hover:bg-gray-50 p-2 rounded transition-colors">
                  <div>
                    <p className="font-medium text-gray-700 text-xs mb-0.5">{d.nama}</p>
                    <p className="text-[10px] text-gray-400">{d.tgl}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">{fmt(d.nominal)}</span>
                </div>
              )) : <p className="text-center text-xs text-gray-400 py-6">Belum ada data wakaf.</p>}
            </div>
            <Pagination currentPage={donorPage} totalPages={totalPages} onPageChange={setDonorPage} />
          </Card>
        </div>
      )}
    </div>
  ); 
};

// --- RESTORED RAMADHAN VIEW ---
const ViewRamadhan = ({ data, onBack }) => {
  // Logic untuk filter agenda ramadhan (buka puasa/tarawih)
  const agendaRamadhan = data?.kegiatan?.filter(k => k.judul.toLowerCase().includes('tarawih') || k.judul.toLowerCase().includes('buka') || k.judul.toLowerCase().includes('sahur')) || [];
  
  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gradient-to-b from-purple-50 to-white animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600 hover:text-purple-600 transition-colors"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <div className="text-center mb-6">
        <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-purple-600 shadow-md ring-4 ring-purple-50"><MoonStar size={32}/></div>
        <h2 className="text-2xl font-bold text-gray-800">Bulan Suci Ramadhan</h2>
        <p className="text-sm text-gray-500">Marhaban Ya Ramadhan</p>
      </div>
      
      <Card className="mb-4 bg-white border-purple-200 border-l-4 border-l-purple-500 shadow-md">
         <h3 className="font-bold text-gray-800 mb-3 text-center text-sm uppercase tracking-wide">Jadwal Imsakiyah Hari Ini</h3>
         <div className="grid grid-cols-2 gap-4 text-center divide-x divide-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">Imsak</p>
              <p className="text-2xl font-bold text-purple-700 font-mono">{data?.jadwal?.imsak}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Maghrib (Buka)</p>
              <p className="text-2xl font-bold text-purple-700 font-mono">{data?.jadwal?.maghrib}</p>
            </div>
         </div>
      </Card>

      <Card>
         <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"><CalendarDays size={16} className="text-purple-600"/> Agenda Ramadhan</h3>
         <div className="space-y-3">
           {agendaRamadhan.length > 0 ? agendaRamadhan.map((item, idx) => (
             <div key={idx} className="border-b border-gray-100 pb-2 last:border-0 hover:bg-gray-50 p-2 rounded transition-colors">
               <div className="flex justify-between">
                 <p className="font-bold text-sm text-gray-800">{item.judul}</p>
                 <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">{item.waktu.split(' ')[0]}</span>
               </div>
               <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><UserCircle size={10}/> {item.ustadz || "Panitia"}</p>
             </div>
           )) : (
             <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-sm text-gray-400">Belum ada agenda khusus Ramadhan.</p>
                <p className="text-xs text-gray-400 mt-1">Silakan cek menu 'Jadwal' untuk kegiatan rutin.</p>
             </div>
           )}
         </div>
      </Card>
    </div>
  );
};

const ViewIdulFitri = ({ data, onBack }) => (
  <div className="pb-24 pt-4 px-4 min-h-screen bg-green-50 animate-fade-in">
    <button onClick={onBack} className="mb-4 flex text-sm text-gray-600 hover:text-green-600 transition-colors"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
    <div className="text-center mb-6">
       <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-green-600 shadow-md ring-4 ring-green-50"><Gift size={32}/></div>
       <h2 className="text-2xl font-bold text-gray-800">Idul Fitri</h2>
       <p className="text-sm text-gray-500">Taqabbalallahu Minna Wa Minkum</p>
    </div>
    <Card className="text-center p-6 bg-white shadow-lg border-green-100">
       <h3 className="font-bold text-lg text-gray-800 mb-2">Info Sholat Ied</h3>
       <p className="text-sm text-gray-600">Jadwal & Petugas akan diupdate menjelang hari H.</p>
       <div className="mt-4 p-4 bg-green-50 rounded-lg text-green-800 text-sm font-medium border border-green-200">
         Mohon pantau terus aplikasi untuk informasi zakat fitrah.
       </div>
    </Card>
  </div>
);

const ViewQurban = ({ data, onBack }) => { 
  const openWA = () => { window.open(`https://wa.me/${data?.profile?.wa_admin}?text=${encodeURIComponent(`Assalamualaikum, daftar qurban`)}`, '_blank'); }; 
  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600 hover:text-red-600 transition-colors"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Beef className="text-red-600"/> Data Qurban</h2>
      
      <div className="grid grid-cols-2 gap-3 mb-6">
        {data?.qurban?.statistik?.map((stat, idx) => (
          <Card key={idx} className="bg-white border-red-100 border-b-4 border-b-red-500 shadow-sm hover:-translate-y-1 transition-transform">
            <p className="text-xs text-gray-500 mb-1 font-bold uppercase">{stat.jenis}</p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-gray-800">{stat.jumlah}</span>
              <span className="text-xs text-gray-400 mb-2 font-medium">Ekor</span>
            </div>
            <p className="text-[10px] text-emerald-600 mt-2 bg-emerald-50 px-2 py-1 rounded inline-block">Tersedia: {stat.tersedia}</p>
          </Card>
        ))}
      </div>
      
      <Card className="mb-6">
        <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Daftar Shohibul Qurban</h3>
        <div className="space-y-4">
          {data?.qurban?.hewan?.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start border-b border-gray-100 pb-3 last:border-0 hover:bg-gray-50 p-2 rounded transition-colors">
              <div>
                <p className="font-bold text-gray-800 text-sm">{item.namashohib || item.nama_shohib}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.jenishewan || item.jenis_hewan} • <span className="italic">{item.permintaandaging || item.permintaan_daging}</span></p>
              </div>
              <Badge type={(item.statusbayar || item.status_bayar) === 'LUNAS' ? 'success' : 'warning'}>{item.statusbayar || item.status_bayar}</Badge>
            </div>
          ))}
        </div>
      </Card>
      
      <button onClick={openWA} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg active:scale-95 flex items-center justify-center gap-2">
        <MessageCircle size={20}/> Daftar Qurban via WA
      </button>
    </div>
  ); 
};

// --- TV MODE ---
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
      <div className="fixed inset-0 bg-red-900 text-white flex flex-col items-center justify-center animate-pulse z-50">
         <h1 className="text-9xl font-bold font-mono">{timeStatus.text}</h1>
         <p className="text-5xl mt-8 font-bold">LURUSKAN & RAPATKAN SHAF</p>
      </div>
    );
  }

  if (timeStatus.status === 'sholat') {
    return <div className="fixed inset-0 bg-black z-50"></div>;
  }

  const currentSlide = data?.profile?.slide_kegiatan?.[slideIndex] || {};
  const slideUrl = typeof currentSlide === 'string' ? currentSlide : currentSlide.url;
  const slideCaption = typeof currentSlide === 'string' ? "" : currentSlide.caption;

  return (
    <div className="fixed inset-0 bg-slate-900 text-white overflow-hidden font-sans">
       {/* Background */}
       <div className="absolute inset-0 z-0">
         <img src={optimizeImage(bgImage, 1280)} className="w-full h-full object-cover opacity-40"/>
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50"></div>
       </div>

       {/* Content Container */}
       <div className="absolute inset-0 z-10 flex flex-col p-12">
         {/* Top Bar */}
         <div className="flex justify-between items-start mb-12">
            <div className="flex items-center gap-8">
              {data?.profile?.logo_url && <img src={optimizeImage(data.profile.logo_url, 200)} alt="Logo" className="w-32 h-32 rounded-full bg-white p-2 object-contain shadow-2xl" />}
              <div>
                <h1 className="text-6xl font-bold text-emerald-400 tracking-tight drop-shadow-lg">{data?.profile?.nama}</h1>
                <p className="text-3xl text-gray-200 mt-2 font-light">{data?.profile?.alamat}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-9xl font-mono font-bold tracking-tighter drop-shadow-2xl">{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-4xl text-emerald-400 mt-2 font-medium">{getHijriDate()}</div>
            </div>
         </div>

         {/* Middle Section */}
         <div className="flex-1 grid grid-cols-12 gap-12">
            {/* Jadwal Sholat */}
            <div className="col-span-4 bg-black/40 backdrop-blur-md rounded-[2rem] p-8 flex flex-col justify-between border border-white/10 shadow-2xl">
               {['Subuh', 'Syuruq', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].map(waktu => {
                 const isActive = timeStatus.next?.name === waktu;
                 return (
                   <div key={waktu} className={`flex justify-between items-center p-5 rounded-2xl transition-all duration-500 ${isActive ? 'bg-emerald-600 scale-105 shadow-xl border border-emerald-400' : 'bg-white/5 border border-white/5'}`}>
                     <span className={`text-3xl font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>{waktu}</span>
                     <span className={`text-5xl font-bold font-mono ${isActive ? 'text-white' : 'text-emerald-400'}`}>{data?.jadwal?.[waktu.toLowerCase()]}</span>
                   </div>
                 )
               })}
            </div>

            {/* Slider / Countdown */}
            <div className="col-span-8 bg-black/40 backdrop-blur-md rounded-[2rem] p-4 border border-white/10 flex items-center justify-center relative overflow-hidden shadow-2xl">
               {slideIndex === -1 || !slideUrl ? (
                 <div className="text-center animate-pulse">
                   <h2 className="text-6xl font-bold text-yellow-400 mb-8 tracking-wider">MENUJU WAKTU {timeStatus.next?.name?.toUpperCase()}</h2>
                   <div className="text-[12rem] font-bold font-mono leading-none text-white drop-shadow-2xl">{timeStatus.text}</div>
                 </div>
               ) : (
                 <>
                   <img src={optimizeImage(slideUrl, 1280)} className="w-full h-full object-cover rounded-xl shadow-inner"/>
                   {slideCaption && (
                     <div className="absolute bottom-10 left-10 right-10 bg-black/80 p-6 rounded-2xl border-l-8 border-emerald-500">
                       <p className="text-4xl text-white text-left font-medium leading-relaxed">{slideCaption}</p>
                     </div>
                   )}
                 </>
               )}
            </div>
         </div>

         {/* Footer / Running Text */}
         <div className="mt-12 bg-emerald-900/90 p-5 rounded-2xl overflow-hidden border border-emerald-700/50 shadow-2xl">
            <div className="whitespace-nowrap text-4xl font-medium text-white animate-[marquee_25s_linear_infinite]">
              +++ {data?.profile?.visi} +++ Info Kajian: {data?.kegiatan?.[0]?.judul || "Belum ada agenda terdekat"} +++ Mohon Matikan Alat Komunikasi Saat Sholat Berlangsung +++
            </div>
         </div>
       </div>

       <style>{`@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }`}</style>
    </div>
  );
};

// --- LOGIN & ADMIN VIEW ---
const ViewAdmin = ({ data, onBack, setView, onLogin, currentUser, masjidId, sendData }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  
  // States for CRUD Modals
  const [showModalSantri, setShowModalSantri] = useState(false);
  const [showModalKegiatan, setShowModalKegiatan] = useState(false);
  const [showModalTrans, setShowModalTrans] = useState(false);
  const [showModalZiswaf, setShowModalZiswaf] = useState(false);
  
  const [formData, setFormData] = useState({});

  const handleLogin = (e) => {
    e.preventDefault();
    if (!data?.users) { alert("Data user tidak ditemukan."); return; }
    
    // Superadmin bypass (Opsional, bisa dihapus jika production)
    if (username === "vendor" && password === "admin123") { 
        onLogin({ role: "SUPERADMIN", nama: "Vendor Pusat" }); 
        return; 
    }

    const foundUser = data.users.find(u => 
      String(u.username).toLowerCase() === String(username).toLowerCase() && 
      String(u.password) === String(password)
    );

    if (foundUser) {
      onLogin(foundUser);
    } else {
      alert("Username atau Password Salah");
    }
  };

  const handleInput = (key, val) => setFormData({...formData, [key]: val});
  
  const submitData = async (action, payload) => {
    const success = await sendData(action, payload);
    if (success) {
      alert("Data Berhasil Disimpan! Silakan refresh halaman.");
      setShowModalSantri(false); setShowModalKegiatan(false); setShowModalTrans(false); setShowModalZiswaf(false);
      setFormData({});
    } else {
      alert("Gagal menyimpan data.");
    }
  };

  if (!currentUser) {
    return (
      <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
        <button onClick={onBack} className="mb-4 flex items-center text-sm font-semibold text-gray-600 hover:text-emerald-600"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
        <div className="text-center mb-6">
          <div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-600 shadow-inner"><Shield size={32}/></div>
          <h2 className="text-xl font-bold text-gray-800">Login Pengurus</h2>
          <p className="text-sm text-gray-500">Silakan masuk untuk mengelola data</p>
        </div>
        <Card className="max-w-xs mx-auto shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Input Username"/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Input Password"/>
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95">Masuk Dashboard</button>
          </form>
        </Card>
      </div>
    );
  }

  const r = currentUser.role;
  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
         <div>
           <h2 className="text-xl font-bold text-gray-800">Dashboard {r === 'ADMIN' ? 'Ketua' : (r === 'SUPERADMIN' ? 'Vendor' : (r.includes('BENDAHARA') ? 'Keuangan' : 'Sekretariat'))}</h2>
           <p className="text-xs text-gray-500">Halo, {currentUser.nama}</p>
         </div>
         <button onClick={() => onLogin(null)} className="text-red-500 bg-red-50 p-2 rounded-full hover:bg-red-100 transition shadow-sm"><LogOut size={20}/></button>
      </div>

      {/* DASHBOARD SWITCHER */}
      {(r === 'ADMIN' || r === 'SUPERADMIN') && <DashboardAdmin data={data} />}
      {(r === 'SEKRETARIS' || r === 'ADMIN' || r === 'SUPERADMIN') && <DashboardSekretaris onAddKegiatan={() => setShowModalKegiatan(true)} onAddSantri={() => setShowModalSantri(true)} />}
      {(r.includes('BENDAHARA') || r === 'ADMIN' || r === 'SUPERADMIN') && <DashboardBendahara onAddTransaksi={() => setShowModalTrans(true)} onAddZiswaf={() => setShowModalZiswaf(true)} />}

      {/* SPECIAL MENU */}
      {(r === 'ADMIN' || r === 'SUPERADMIN') && (
        <div className="mt-4 space-y-2">
          <Card onClick={() => setView('tv')} className="flex items-center justify-between cursor-pointer border-purple-200 bg-purple-50 hover:bg-purple-100 transition shadow-sm">
             <div className="flex items-center gap-3"><div className="bg-purple-200 p-2 rounded-lg text-purple-700"><Monitor size={20}/></div><div><h4 className="font-bold text-gray-800">Mode Layar TV</h4><p className="text-[10px] text-gray-600">Tampilan Landscape Fullscreen</p></div></div>
             <Maximize size={16} className="text-purple-400"/>
          </Card>
        </div>
      )}

      {/* MODALS */}
      <ModalInput isOpen={showModalSantri} onClose={() => setShowModalSantri(false)} title="Tambah Santri TPA" onSubmit={(e) => { e.preventDefault(); submitData("add_santri", formData); }}>
         <input type="text" placeholder="Nama Santri" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('nama', e.target.value)} required />
         <select className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('jenis_kelamin', e.target.value)}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
      </ModalInput>

      <ModalInput isOpen={showModalKegiatan} onClose={() => setShowModalKegiatan(false)} title="Tambah Jadwal" onSubmit={(e) => { e.preventDefault(); submitData("add_kegiatan", formData); }}>
         <input type="text" placeholder="Judul Kegiatan" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('judul', e.target.value)} required />
         <input type="text" placeholder="Ustadz/Pengisi" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('ustadz', e.target.value)} />
         <input type="text" placeholder="Waktu (Cth: Senin, Ba'da Isya)" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('waktu', e.target.value)} required />
      </ModalInput>

      <ModalInput isOpen={showModalTrans} onClose={() => setShowModalTrans(false)} title="Catat Transaksi" onSubmit={(e) => { e.preventDefault(); submitData("add_transaksi", formData); }}>
         <select className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('tipe', e.target.value)}><option value="IN">Pemasukan (IN)</option><option value="OUT">Pengeluaran (OUT)</option></select>
         <input type="number" placeholder="Nominal (Rp)" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('nominal', e.target.value)} required />
         <input type="text" placeholder="Keterangan Transaksi" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('keterangan', e.target.value)} required />
      </ModalInput>

      <ModalInput isOpen={showModalZiswaf} onClose={() => setShowModalZiswaf(false)} title="Input ZISWAF" onSubmit={(e) => { e.preventDefault(); submitData("add_ziswaf", formData); }}>
         <input type="text" placeholder="Nama Donatur" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('nama', e.target.value)} required />
         <select className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('jenis', e.target.value)}><option>Infaq</option><option>Zakat Maal</option><option>Sedekah</option><option>Waqaf</option></select>
         <input type="number" placeholder="Nominal (Rp)" className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" onChange={e => handleInput('nominal', e.target.value)} required />
      </ModalInput>
    </div>
  );
};

// --- MAIN APP ---
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

  const sendData = async (action, payload) => {
    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ masjid_id: masjidId, action, payload }) });
      const json = await response.json();
      return json.status === 'success';
    } catch (e) { console.error(e); return false; }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!masjidId) { setLoading(false); setError("ID Masjid tidak ditemukan."); return; }
      try {
        const response = await fetch(`${API_URL}?id=${masjidId}&nocache=${Date.now()}`);
        const json = await response.json();
        if (json.status === 'error') throw new Error(json.message);
        setData(json);
        localStorage.setItem(CACHE_KEY_PREFIX + masjidId, JSON.stringify(json));
      } catch (err) {
        const cached = localStorage.getItem(CACHE_KEY_PREFIX + masjidId);
        if (cached) setData(JSON.parse(cached));
        else setError(err.message);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [masjidId]);

  useEffect(() => {
    if(!data) return;
    const tick = setInterval(() => { setTimeStatus(calculateTimeStatus(data.jadwal, data.config)); }, 1000);
    return () => clearInterval(tick);
  }, [data]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-emerald-600"><RefreshCw className="animate-spin mb-2"/><p className="text-xs font-bold text-gray-500">Memuat Data...</p></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"><Info className="text-red-500 mb-2" size={32}/><p className="text-gray-800 font-bold mb-2">{error}</p></div>;
  if (!data) return null;

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
            {view === 'admin' && <ViewAdmin data={data} onBack={() => setView('home')} setView={setView} onLogin={setCurrentUser} currentUser={currentUser} masjidId={masjidId} sendData={sendData} />}
            {view === 'ramadhan' && <ViewRamadhan data={data} onBack={() => setView('home')} />}
            {view === 'idul_fitri' && <ViewIdulFitri data={data} onBack={() => setView('home')} />}
          </main>
          
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-between items-center z-50 max-w-md mx-auto">
            <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 p-2 active:scale-95 transition-transform ${view === 'home' ? 'text-emerald-600' : 'text-gray-400'}`}><Home size={20}/><span className="text-[10px] font-medium">Beranda</span></button>
            <button onClick={() => setView('donasi')} className={`flex flex-col items-center gap-1 p-2 active:scale-95 transition-transform ${view === 'donasi' ? 'text-emerald-600' : 'text-gray-400'}`}><Wallet size={20}/><span className="text-[10px] font-medium">Donasi</span></button>
            <button onClick={() => setView('kegiatan')} className={`flex flex-col items-center gap-1 p-2 active:scale-95 transition-transform ${view === 'kegiatan' ? 'text-emerald-600' : 'text-gray-400'}`}><Calendar size={20}/><span className="text-[10px] font-medium">Jadwal</span></button>
            <button onClick={() => setView('admin')} className={`flex flex-col items-center gap-1 p-2 active:scale-95 transition-transform ${view === 'admin' ? 'text-emerald-600' : 'text-gray-400'}`}>
              {currentUser ? <Settings size={20}/> : <Lock size={20}/>}
              <span className="text-[10px] font-medium">{currentUser ? 'Admin' : 'Login'}</span>
            </button>
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}