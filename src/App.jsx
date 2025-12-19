import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Calendar, Wallet, Settings, Users, Clock, 
  MapPin, Droplets, Heart, Hammer, Moon, Info, RefreshCw,
  Beef, GraduationCap, ChevronRight, ArrowLeft, Megaphone, CalendarDays,
  Copy, CheckCircle, UserCircle, Shield, FileText, ExternalLink, MoonStar,
  Utensils, Tent, MessageCircle, Gift, Link as LinkIcon, Monitor, Maximize,
  Sun, Sunrise, Volume2, VolumeX, AlertTriangle, Play, Pause, Youtube,
  ChevronLeft, ChevronRight as ChevronRightIcon, Mic, BellOff, Image as ImageIcon,
  Wifi, WifiOff
} from 'lucide-react';

// --- CONFIGURATION ---
const DEMO_SCRIPT_ID = "AKfycbyq83asL-6eJenpA5rAoGBvrk4I_cHv8NkvOoJ9oHHGKSPd_AbLL8rvgPrs93VNwEyh"; 
const CACHE_KEY = "masjid_app_data_cache"; 

const getApiUrl = () => {
  const BASE_URL = "https://script.google.com/macros/s/";
  const params = new URLSearchParams(window.location.search);
  const dynamicId = params.get('id');
  const targetId = dynamicId || DEMO_SCRIPT_ID;
  return `${BASE_URL}${targetId}/exec`;
};

const API_URL = getApiUrl();

// --- DATE HELPERS (FIXED: Removing redundant suffix here if handled in UI) ---
const getHijriDate = () => {
  const date = new Intl.DateTimeFormat('id-ID-u-ca-islamic', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(Date.now());
  return `${date} H`;
};

const getMasehiDate = () => {
  const date = new Intl.DateTimeFormat('id-ID', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(Date.now());
  return `${date} M`;
};

// --- HELPER TIME STATUS (CORE LOGIC) ---
const calculateTimeStatus = (jadwal, config) => {
  if (!jadwal || !jadwal.subuh) return { status: 'loading', text: '--:--', next: null, adzanNow: false };

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();
  
  const parse = (t) => { if(!t) return 9999; const [h, m] = t.split(':').map(Number); return h*60+m; };
  
  const times = [
    { name: 'Imsak', val: parse(jadwal.imsak) }, 
    { name: 'Subuh', val: parse(jadwal.subuh) }, 
    { name: 'Syuruq', val: parse(jadwal.syuruq) }, 
    { name: 'Dhuha', val: parse(jadwal.dhuha) }, 
    { name: 'Dzuhur', val: parse(jadwal.dzuhur) }, 
    { name: 'Ashar', val: parse(jadwal.ashar) }, 
    { name: 'Maghrib', val: parse(jadwal.maghrib) }, 
    { name: 'Isya', val: parse(jadwal.isya) }
  ];
  
  const sholatWajibNames = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
  
  // 1. Check Adzan (Exact Minute Match)
  const isAdzanNow = times.some(t => sholatWajibNames.includes(t.name) && t.val === currentTime);
  if (isAdzanNow) {
     return { status: 'adzan', text: `ADZAN`, next: null, adzanNow: true };
  }

  // 2. Check Iqomah, Sholat, & Dzikir Phase
  let lastPrayer = null;
  for (let i = times.length - 1; i >= 0; i--) {
    if (times[i].val < currentTime) { 
       if (sholatWajibNames.includes(times[i].name)) {
         lastPrayer = times[i];
         break; 
       }
    }
  }
  
  if (lastPrayer) {
      const minutesSinceAdzan = currentTime - lastPrayer.val;
      
      const iqomahDur = parseInt(config?.durasi_iqomah) || 10;
      const sholatDur = parseInt(config?.durasi_sholat) || 10; 
      const dzikirDur = parseInt(config?.durasi_dzikir) || 10; 

      // Phase A: IQOMAH (Countdown)
      if (minutesSinceAdzan < iqomahDur) {
          const totalSecondsIqomah = iqomahDur * 60;
          const secondsPassed = minutesSinceAdzan * 60 + currentSeconds;
          const secondsLeft = totalSecondsIqomah - secondsPassed;
          
          const m = Math.floor(secondsLeft / 60);
          const s = secondsLeft % 60;
          return { status: 'iqomah', text: `${m}:${s < 10 ? '0'+s : s}`, next: lastPrayer, adzanNow: false };
      }
      
      // Phase B: SHOLAT (Dark Screen)
      if (minutesSinceAdzan < (iqomahDur + sholatDur)) {
          return { status: 'sholat', text: 'SHOLAT', next: lastPrayer, adzanNow: false };
      }

      // Phase C: DZIKIR (Calm Slider)
      if (minutesSinceAdzan < (iqomahDur + sholatDur + dzikirDur)) {
          return { status: 'dzikir', text: 'DZIKIR', next: lastPrayer, adzanNow: false };
      }
  }

  // 3. Normal Countdown to Next Prayer
  let next = times.find(t => t.val > currentTime);
  if (!next) next = times[1]; 
  
  let diffSec = (next.val * 60) - (currentTime * 60 + currentSeconds);
  if (diffSec < 0) diffSec += 24 * 3600; 
  
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;

  return { status: 'normal', text: `${h>0?h+':':''}${m<10?'0'+m:m}:${s<10?'0'+s:s}`, next: { name: next.name }, adzanNow: false };
};


// --- UI COMPONENTS ---

const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className} ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}>
    {children}
  </div>
);

const Badge = ({ children, type = "info", onClick }) => {
  const colors = {
    info: "bg-blue-100 text-blue-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    purple: "bg-purple-100 text-purple-700",
    yellow: "bg-yellow-100 text-yellow-700",
    pink: "bg-pink-100 text-pink-700",
    green: "bg-green-100 text-green-700",
    gray: "bg-gray-100 text-gray-700"
  };
  return (
    <span onClick={onClick} className={`px-2 py-1 rounded-md text-xs font-semibold ${colors[type] || colors.info} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}>
      {children}
    </span>
  );
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

// --- COMPONENT: ACTIVITY SLIDER (NEW) ---
const ActivitySlider = ({ config }) => {
  const slides = Object.keys(config)
    .filter(key => key.startsWith('slide_') && !key.includes('dzikir'))
    .map(key => config[key])
    .filter(url => url && url.startsWith('http'));

  const finalSlides = slides.length > 0 ? slides : [
    "https://images.unsplash.com/photo-1564769629178-580d6be2f6b9?q=80&w=1000",
    "https://images.unsplash.com/photo-1584646098378-0874589d76e7?q=80&w=1000"
  ];

  return (
    <div className="mb-4">
       <h3 className="font-bold text-gray-800 mb-3 px-4 flex items-center gap-2"><ImageIcon size={16} className="text-emerald-600"/> Galeri Aktivitas</h3>
       <div className="flex overflow-x-auto gap-3 px-4 pb-4 snap-x hide-scrollbar">
          {finalSlides.map((url, idx) => (
             <div key={idx} className="min-w-[280px] h-40 rounded-xl overflow-hidden shadow-md snap-center relative border border-gray-100 shrink-0">
                <img src={url} alt={`Slide ${idx}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                   <p className="text-white text-xs font-medium">Dokumentasi Kegiatan</p>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};

// --- COMPONENT HEADER (FIXED: DATE LABEL) ---
const Header = ({ profile, config, setView, timeStatus, isOffline }) => {
  const [showHijri, setShowHijri] = useState(false);

  useEffect(() => {
    const duration = (config.durasi_slide_date || 5) * 1000;
    const interval = setInterval(() => setShowHijri(prev => !prev), duration);
    return () => clearInterval(interval);
  }, [config.durasi_slide_date]);

  const activeSiklus = (config.siklus || 'NORMAL').trim().toUpperCase();
  const bgImage = config.foto_masjid || "https://images.unsplash.com/photo-1542042956-654e99092d6e?q=80&w=1000";

  return (
    <header className={`relative pt-6 pb-20 px-4 rounded-b-[2rem] overflow-hidden shadow-lg transition-all duration-500`}>
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
         <img src={bgImage} alt="Masjid" className="w-full h-full object-cover" />
         <div className={`absolute inset-0 ${['iqomah', 'adzan'].includes(timeStatus.status) ? 'bg-red-900/90' : 'bg-gradient-to-b from-emerald-900/80 to-emerald-800/90'}`}></div>
      </div>
      
      <div className="relative z-10 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
             <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-bold text-lg border border-white/30">
               {profile.nama.charAt(0)}
             </div>
             <div>
               <h1 className="text-xl font-bold leading-tight shadow-sm">{profile.nama}</h1>
               <p className="text-emerald-100 text-xs flex items-center gap-1 mt-1 opacity-90"><MapPin size={10} /> {profile.alamat}</p>
             </div>
          </div>
          <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
             {isOffline && <div className="bg-red-500/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><WifiOff size={10}/> OFFLINE</div>}
             {activeSiklus === 'RAMADHAN' && <Badge type="warning" onClick={() => setView('ramadhan')}>RAMADHAN</Badge>}
             {activeSiklus === 'IDUL_FITRI' && <Badge type="green" onClick={() => setView('idul_fitri')}>IDUL FITRI</Badge>}
             {activeSiklus === 'QURBAN' && <Badge type="danger" onClick={() => setView('qurban')}>IDUL ADHA</Badge>}
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
               <p className="font-semibold text-xs leading-tight truncate max-w-[150px]">
                 {showHijri ? getHijriDate() : getMasehiDate()}
               </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// --- VIEW HOME ---
const ViewHome = ({ data, setView, timeStatus }) => {
  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  const jadwalUtama = { Subuh: data.jadwal.subuh, Dzuhur: data.jadwal.dzuhur, Ashar: data.jadwal.ashar, Maghrib: data.jadwal.maghrib, Isya: data.jadwal.isya };
  const activeSiklus = (data.config.siklus || 'NORMAL').trim().toUpperCase();

  return (
    <div className="pb-24 -mt-12 px-4 relative z-20 space-y-5">
      <Card className="shadow-lg border-0 ring-1 ring-black/5">
        <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-4 text-center">Jadwal Sholat Hari Ini</h3>
        <div className="flex justify-between text-center relative z-10">
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
        <div className="flex justify-center gap-4 mt-3 border-t border-gray-100 pt-2">
           <div className="text-center"><span className="text-[10px] text-gray-400 block">Imsak</span><span className="text-xs font-medium text-gray-600">{data.jadwal.imsak}</span></div>
           <div className="text-center"><span className="text-[10px] text-gray-400 block">Syuruq</span><span className="text-xs font-medium text-gray-600">{data.jadwal.syuruq}</span></div>
           <div className="text-center"><span className="text-[10px] text-gray-400 block">Dhuha</span><span className="text-xs font-medium text-gray-600">{data.jadwal.dhuha}</span></div>
        </div>
      </Card>

      <ActivitySlider config={data.config} />

      {activeSiklus === 'RAMADHAN' && <Card onClick={() => setView('ramadhan')} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-lg transform hover:scale-[1.02] transition-transform"><div className="flex justify-between items-center"><div><h3 className="font-bold flex items-center gap-2"><MoonStar size={18}/> Spesial Ramadhan</h3><p className="text-xs text-purple-100 mt-1">Cek Imsakiyah & Jadwal I'tikaf</p></div><ChevronRight className="text-purple-200" size={20}/></div></Card>}
      {activeSiklus === 'IDUL_FITRI' && <Card onClick={() => setView('idul_fitri')} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-lg transform hover:scale-[1.02] transition-transform"><div className="flex justify-between items-center"><div><h3 className="font-bold flex items-center gap-2"><Gift size={18}/> Gema Idul Fitri</h3><p className="text-xs text-emerald-100 mt-1">Info Sholat Ied & Zakat</p></div><ChevronRight className="text-emerald-200" size={20}/></div></Card>}
      {activeSiklus === 'QURBAN' && <Card onClick={() => setView('qurban')} className="bg-red-50 border-red-100"><div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-red-100 p-2 rounded-full text-red-600"><Beef size={20}/></div><div><h3 className="font-bold text-red-900">Info Qurban</h3><p className="text-xs text-red-700">Cek data shohibul qurban</p></div></div><ChevronRight className="text-red-400" size={20}/></div></Card>}

      {data.pembangunan && (
        <Card onClick={() => setView('pembangunan')} className="border-l-4 border-l-orange-500">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Hammer size={16} className="text-orange-500" />Renovasi Masjid</h3>
            <span className="text-xs text-gray-500">{data.pembangunan.last_update}</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{data.pembangunan.tahap}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1 relative overflow-hidden">
            <div className="bg-orange-500 h-2 rounded-full text-center transition-all duration-1000" style={{ width: `${data.pembangunan.progress}%` }}></div>
          </div>
          <div className="flex justify-between text-xs font-bold"><span className="text-orange-600">{data.pembangunan.progress}% Selesai</span><span className="text-blue-600 font-semibold">Lihat Detail →</span></div>
        </Card>
      )}

      <div>
        <div className="flex justify-between items-center mb-2 px-1"><h3 className="font-bold text-gray-800">Keuangan Umat</h3></div>
        <div className="grid grid-cols-2 gap-3 mb-4"><Card className="bg-emerald-50 border-emerald-100"><p className="text-xs text-gray-500 mb-1">Kas Operasional</p><p className="font-bold text-gray-800 text-sm">{fmt(data.keuangan.saldo_operasional)}</p></Card><Card className="bg-blue-50 border-blue-100"><p className="text-xs text-gray-500 mb-1">Dana Pembangunan</p><p className="font-bold text-gray-800 text-sm">{fmt(data.keuangan.saldo_pembangunan)}</p></Card></div>
        <Card><h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Transaksi Terakhir</h4><div className="space-y-3">{data.keuangan.history.slice(0, 3).map((item, idx) => (<div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.tipe === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{item.tipe === 'IN' ? <Droplets size={14}/> : <Wallet size={14}/>}</div><div><p className="font-medium text-gray-800 truncate w-32">{item.ket}</p><p className="text-xs text-gray-400">{item.tgl}</p></div></div><span className={`font-semibold ${item.tipe === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.tipe === 'IN' ? '+' : '-'}{fmt(item.nominal)}</span></div>))}</div></Card>
      </div>

      <div className="pb-8">
        <h3 className="font-bold text-gray-800 mb-3 px-1">Layanan Digital</h3>
        <div className="grid grid-cols-4 gap-3">
          <div onClick={() => setView('tpa')} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"><div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-yellow-100 text-yellow-600 border border-yellow-200"><GraduationCap size={20}/></div><span className="text-[10px] text-gray-600 text-center font-medium leading-tight">TPA/TPQ</span></div>
          <div onClick={() => setView('kegiatan')} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"><div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-purple-100 text-purple-600 border border-purple-200"><CalendarDays size={20}/></div><span className="text-[10px] text-gray-600 text-center font-medium leading-tight">Agenda</span></div>
          <div onClick={() => setView('petugas')} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"><div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-blue-100 text-blue-600 border border-blue-200"><Users size={20}/></div><span className="text-[10px] text-gray-600 text-center font-medium leading-tight">Petugas</span></div>
          <div onClick={() => setView('donasi')} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"><div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-pink-100 text-pink-600 border border-pink-200"><Heart size={20}/></div><span className="text-[10px] text-gray-600 text-center font-medium leading-tight">ZISWAF</span></div>
        </div>
      </div>
    </div>
  );
};

const ViewQurban = ({ data, onBack }) => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const items = data.qurban?.hewan || [];
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const displayedItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const openWA = () => { window.open(`https://wa.me/${data.config.wa_admin}?text=${encodeURIComponent(`Assalamualaikum, daftar qurban`)}`, '_blank'); };
  
  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button>
      <h2 className="text-2xl font-bold text-gray-800 mb-4"><Beef/> Data Qurban</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {data.qurban.statistik.map((stat, idx) => (
          <Card key={idx} className="bg-white border-red-100 border-b-4 border-b-red-500">
            <p className="text-xs text-gray-500 mb-1">{stat.jenis}</p>
            <div className="flex items-end gap-1"><span className="text-2xl font-bold text-gray-800">{stat.jumlah}</span><span className="text-xs text-gray-400 mb-1">Ekor</span></div>
            <p className="text-[10px] text-emerald-600 mt-2">Tersedia: {stat.tersedia}</p>
          </Card>
        ))}
      </div>
      <Card className="mb-6">
        <h3 className="font-bold text-gray-800 mb-4">Daftar Shohibul Qurban</h3>
        <div className="space-y-4">
          {displayedItems.length > 0 ? displayedItems.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start border-b border-gray-100 pb-3 last:border-0">
              <div><p className="font-bold text-gray-800">{item.namashohib || item.nama_shohib}</p><p className="text-xs text-gray-500">{item.jenishewan || item.jenis_hewan} • {item.permintaandaging || item.permintaan_daging}</p></div>
              <Badge type={(item.statusbayar || item.status_bayar) === 'LUNAS' ? 'success' : 'warning'}>{item.statusbayar || item.status_bayar}</Badge>
            </div>
          )) : <p className="text-sm text-gray-400 text-center">Belum ada data.</p>}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>
      <button onClick={openWA} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold">Daftar via WA</button>
    </div>
  );
};

const ViewTPA = ({ data, onBack }) => { const openWA = () => { window.open(`https://wa.me/${data.config.wa_admin}?text=${encodeURIComponent(`Assalamualaikum, daftar TPA`)}`, '_blank'); }; return (<div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in"><button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button><h2 className="text-2xl font-bold text-gray-800 mb-4">TPA/TPQ</h2><div className="text-center mb-6"><div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-yellow-600"><GraduationCap size={32}/></div><h2 className="text-xl font-bold text-gray-800">TPA/TPQ Masjid</h2><p className="text-sm text-gray-500">Pendidikan Anak Usia Dini</p></div><h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Megaphone size={16} className="text-emerald-600"/> Pengumuman</h3><div className="space-y-3 mb-6">{data.tpa?.pengumuman?.length > 0 ? data.tpa.pengumuman.map((info, idx) => (<Card key={idx} className="border-l-4 border-l-yellow-400"><h4 className="font-bold text-gray-800 text-sm">{info.judul}</h4><p className="text-sm text-gray-600 mt-1">{info.isipesan}</p></Card>)) : (<p className="text-center text-sm text-gray-400 py-4">Belum ada pengumuman.</p>)}</div><button onClick={openWA} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700"><MessageCircle size={20}/> Pendaftaran Santri via WA</button></div>); };

const ViewKegiatan = ({ data, onBack }) => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const items = data.kegiatan || [];
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const displayedItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button>
      <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="text-purple-600"/> Agenda Kegiatan</h2></div>
      <div className="space-y-3">
        {displayedItems.length > 0 ? displayedItems.map((item, idx) => (
          <Card key={idx} className="flex gap-4">
            <div className="flex flex-col items-center justify-center bg-purple-50 w-14 h-14 rounded-lg text-purple-700 shrink-0">
              <span className="text-[10px] font-bold uppercase">{item.waktu.split(' ')[1]}</span>
              <span className="text-xl font-bold">{item.waktu.split(' ')[0]}</span>
            </div>
            <div>
              <Badge type="purple">{item.tipe || "Kajian"}</Badge>
              <h3 className="font-bold text-gray-800 mt-1">{item.judul}</h3>
              <p className="text-sm text-gray-600">{item.ustadz}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400"><Clock size={12}/> {item.jam || "Ba'da Maghrib"}</div>
            </div>
          </Card>
        )) : <p className="text-center text-sm text-gray-400 py-10">Tidak ada agenda.</p>}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

const ViewDonasi = ({ data, onBack }) => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;
  const items = data.keuangan?.history || [];
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const displayedItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  const [copied, setCopied] = useState(false);
  const copyRekening = () => { navigator.clipboard.writeText(data.profile.rekening); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const openWA = (amount = "") => { const msg = amount ? `Assalamualaikum, saya ingin konfirmasi donasi sebesar ${amount} ke ${data.profile.nama}. Mohon dicek. Terima kasih.` : `Assalamualaikum, saya ingin konfirmasi donasi ke ${data.profile.nama}.`; window.open(`https://wa.me/${data.config.wa_admin}?text=${encodeURIComponent(msg)}`, '_blank'); };
  
  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex text-sm text-gray-600"><ArrowLeft size={16}/> Kembali</button>
      <div className="text-center mb-6"><div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-pink-600"><Heart size={32}/></div><h2 className="text-xl font-bold text-gray-800">Infaq & ZISWAF</h2><p className="text-sm text-gray-500">Salurkan donasi terbaik anda</p></div>
      <div className="space-y-4">
        <Card className="text-center border-emerald-200 bg-emerald-50"><h3 className="font-bold text-emerald-800 mb-2">Scan QRIS</h3>{data.profile.qris_url ? (<img src={data.profile.qris_url} alt="QRIS" className="w-48 h-48 mx-auto object-cover rounded-lg mix-blend-multiply" />) : (<div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">QRIS Image Placeholder</div>)}<p className="text-xs text-emerald-600 mt-2 font-medium">Otomatis terdeteksi seluruh E-Wallet</p></Card>
        <Card><h3 className="font-bold text-gray-800 mb-2">Transfer Bank</h3><div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center mb-4"><div><p className="text-xs text-gray-500 uppercase tracking-wider">Rekening Resmi</p><p className="text-lg font-mono font-bold text-gray-800 my-1">{data.profile.rekening}</p><p className="text-xs text-gray-600">a.n {data.profile.nama}</p></div><button onClick={copyRekening} className={`p-2 border rounded-lg transition-all ${copied ? 'bg-emerald-100 border-emerald-500 text-emerald-600' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}>{copied ? <CheckCircle size={20}/> : <Copy size={20}/>}</button></div><div className="text-center"><p className="text-xs text-gray-500 mb-2">Konfirmasi Cepat via WhatsApp:</p><div className="flex gap-2 justify-center mb-3"><button onClick={() => openWA("Rp 50.000")} className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 hover:bg-green-100">50rb</button><button onClick={() => openWA("Rp 100.000")} className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 hover:bg-green-100">100rb</button><button onClick={() => openWA("Rp 500.000")} className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 hover:bg-green-100">500rb</button></div><button onClick={() => openWA()} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-emerald-700"><MessageCircle size={20}/> Chat Manual</button></div></Card>
        <div>
          <h3 className="font-bold text-gray-800 mb-3 mt-6">Laporan Transparansi</h3>
          <div className="grid grid-cols-2 gap-3 mb-3"><div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm"><p className="text-[10px] text-gray-500">Total Operasional</p><p className="text-sm font-bold text-emerald-600">{fmt(data.keuangan.saldo_operasional)}</p></div><div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm"><p className="text-[10px] text-gray-500">Total Pembangunan</p><p className="text-sm font-bold text-blue-600">{fmt(data.keuangan.saldo_pembangunan)}</p></div></div>
          <Card>
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Mutasi Terakhir</h4>
            <div className="space-y-3">
              {displayedItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.tipe === 'IN' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <p className="font-medium text-gray-700 truncate w-32">{item.ket}</p>
                  </div>
                  <span className={`text-xs font-bold ${item.tipe === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>{item.tipe === 'IN' ? '+' : '-'}{fmt(item.nominal)}</span>
                </div>
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </Card>
        </div>
      </div>
    </div>
  );
};

const ViewPetugas = ({ data, onBack }) => {
  const uniqueUstadz = [...new Set(data.kegiatan?.map(k => k.ustadz))].filter(u => u !== '-');
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  const items = uniqueUstadz || [];
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const displayedItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex items-center text-sm font-semibold text-gray-600 hover:text-emerald-600"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <div className="text-center mb-6"><div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600"><Users size={32}/></div><h2 className="text-xl font-bold text-gray-800">Petugas Masjid</h2><p className="text-sm text-gray-500">Imam, Khotib & Pemateri</p></div>
      <div className="space-y-4">
        {displayedItems.length > 0 ? (
          displayedItems.map((nama, idx) => (
            <Card key={idx} className="flex items-center gap-4">
              <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-gray-400"><UserCircle size={32}/></div>
              <div><h3 className="font-bold text-gray-800">{nama}</h3><Badge type="blue">Pemateri Rutin</Badge></div>
            </Card>
          ))
        ) : (<p className="text-center text-gray-400 text-sm">Belum ada data petugas bulan ini.</p>)}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

const ViewAdmin = ({ data, onBack, setView }) => {
  if (!data) return <div className="p-4 text-center text-gray-500">Memuat data admin...</div>;

  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const currentId = params.get('id') || DEMO_SCRIPT_ID;
  
  const adminPin = data.config.admin_pin || "1234";

  const handleLogin = (e) => { 
    e.preventDefault(); 
    if (pin === adminPin) { 
      setUnlocked(true); 
    } else { 
      alert("PIN Salah"); 
      setPin(""); 
    } 
  };
  
  const copyUrl = () => { navigator.clipboard.writeText(window.location.href); alert("Link disalin!"); };

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in">
      <button onClick={onBack} className="mb-4 flex items-center text-sm font-semibold text-gray-600 hover:text-emerald-600"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
      <div className="text-center mb-6"><div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-600"><Shield size={32}/></div><h2 className="text-xl font-bold text-gray-800">Tata Kelola Masjid</h2></div>
      {!unlocked ? (
        <Card className="max-w-xs mx-auto"><h3 className="text-center font-bold text-gray-700 mb-4">Masukkan PIN Akses</h3><form onSubmit={handleLogin} className="space-y-4"><input type="password" maxLength="4" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full text-center text-2xl tracking-widest p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="••••"/><button type="submit" className="w-full bg-gray-800 text-white py-2 rounded-lg font-bold">Buka Akses</button></form></Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-emerald-50 border-emerald-200"><div className="flex items-start gap-3"><CheckCircle className="text-emerald-600 mt-1" size={20}/><div><h3 className="font-bold text-emerald-800">Akses Diterima</h3><p className="text-sm text-emerald-700">Selamat datang, Admin.</p></div></div></Card>
          <Card onClick={() => setView('tv')} className="flex items-center justify-between cursor-pointer border-purple-200 bg-purple-50 hover:bg-purple-100"><div className="flex items-center gap-3"><div className="bg-purple-200 p-2 rounded-lg text-purple-700"><Monitor size={20}/></div><div><h4 className="font-bold text-gray-800">Buka Mode Layar TV</h4><p className="text-xs text-gray-500">Tampilan landscape untuk Digital Signage</p></div></div><Maximize size={16} className="text-purple-400"/></Card>
          <a href={data.meta?.spreadsheet_url || "https://docs.google.com/spreadsheets"} target="_blank" rel="noreferrer" className="block"><Card className="flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"><div className="flex items-center gap-3"><div className="bg-green-100 p-2 rounded-lg text-green-700"><FileText size={20}/></div><div><h4 className="font-bold text-gray-800">Buka Google Sheets</h4><p className="text-xs text-gray-500">CMS Database Masjid</p></div></div><ExternalLink size={16} className="text-gray-400"/></Card></a>
          <button onClick={() => setUnlocked(false)} className="w-full mt-6 text-red-600 text-sm font-bold">Logout Admin</button>
        </div>
      )}
    </div>
  );
};

// --- ENTERPRISE TV FEATURE: PLAYLIST ENGINE WITH BEEP & DZIKIR ---
const ViewTV = ({ data, onBack, timeStatus }) => {
  const [time, setTime] = useState(new Date());
  const [showHijri, setShowHijri] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0); 
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const audioRef = useRef(null);
  const lastBeepSecond = useRef(-1); 
  
  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  const SLIDE_DURATION = (data.config.playlist_interval || 15) * 1000;
  const EMERGENCY_MODE = data.config.emergency_mode || false;
  const EMERGENCY_MSG = data.config.emergency_message || "Keadaan Darurat - Harap Tenang";

  const isFriday = time.getDay() === 5;
  const currentMinutes = time.getHours() * 60 + time.getMinutes();
  const startJumat = 11 * 60; 
  const endJumat = 13 * 60 + 30; 
  const isJumatTime = isFriday && currentMinutes >= startJumat && currentMinutes <= endJumat;

  const handleAudioInit = () => {
    setAudioEnabled(true);
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    ctx.resume();
  };

  const playBeep = () => {
    if (!audioEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine'; 
      osc.frequency.value = 880; 
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.error("Beep error:", e);
    }
  };

  useEffect(() => {
    if (timeStatus.status === 'iqomah') {
       const parts = timeStatus.text.split(':');
       if (parts.length === 2) {
         const totalSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
         if (totalSeconds > 0 && totalSeconds <= 5 && lastBeepSecond.current !== totalSeconds) {
            playBeep();
            lastBeepSecond.current = totalSeconds;
         }
       }
    }
  }, [timeStatus, audioEnabled]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const dateInterval = setInterval(() => setShowHijri(prev => !prev), 5000);
    const refreshInterval = setInterval(() => window.location.reload(), 30 * 60 * 1000);
    return () => { clearInterval(timer); clearInterval(dateInterval); clearInterval(refreshInterval); };
  }, []);

  useEffect(() => {
    // Stop playlist rotation during specific phases
    if (['iqomah', 'adzan', 'sholat', 'dzikir'].includes(timeStatus.status) || EMERGENCY_MODE || isJumatTime) return; 
    if (isPlayingVideo) return; 

    const slides = ['dashboard', 'info', 'donasi', 'video'];
    const interval = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % slides.length);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [timeStatus.status, isPlayingVideo, SLIDE_DURATION, EMERGENCY_MODE, isJumatTime]);

  let CurrentSlide = 'dashboard';
  // PRIORITY LOGIC FOR TV STATUS
  if (EMERGENCY_MODE) CurrentSlide = 'emergency';
  else if (isJumatTime) CurrentSlide = 'khutbah';
  else if (timeStatus.status === 'sholat') CurrentSlide = 'sholat'; 
  else if (timeStatus.status === 'dzikir') CurrentSlide = 'dzikir'; 
  else if (timeStatus.status === 'iqomah') CurrentSlide = 'iqomah';
  else if (timeStatus.status === 'adzan') CurrentSlide = 'adzan';
  else {
    const slides = ['dashboard', 'info', 'donasi', 'video'];
    let safeIndex = slideIndex;
    if (slides[slideIndex] === 'video' && !data.config.video_url) safeIndex = 0;
    CurrentSlide = slides[safeIndex];
  }

  // --- SUB-COMPONENTS FOR TV (ABSOLUTE POS) ---
  
  const SlideDashboard = () => (
    <div className="w-full h-full flex p-8 gap-8">
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-slate-800/80 backdrop-blur rounded-3xl p-6 border border-slate-700 shadow-2xl flex-1 flex flex-col justify-center">
          <h2 className="text-center text-slate-400 uppercase tracking-[0.3em] mb-6 text-xl font-bold">Jadwal Sholat</h2>
          <div className="space-y-4">
            {['Subuh', 'Syuruq', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].map((waktu) => {
              const key = waktu.toLowerCase();
              const val = data.jadwal[key];
              const isActive = timeStatus.next?.name === waktu;
              return (
                <div key={key} className={`flex justify-between items-center p-5 rounded-2xl transition-all duration-500 ${isActive ? 'bg-emerald-600 scale-105 shadow-emerald-500/20 shadow-lg' : 'bg-slate-700/30'}`}>
                  <span className={`text-2xl font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>{waktu}</span>
                  <span className={`text-4xl font-bold font-mono ${isActive ? 'text-white' : 'text-emerald-400'}`}>{val}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="w-2/3 flex flex-col gap-6">
         <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-3xl p-10 border border-emerald-800 shadow-2xl flex-1 relative overflow-hidden flex flex-col justify-center items-center text-center">
            <div className="absolute top-0 right-0 p-8 opacity-5"><CalendarDays size={400}/></div>
            <p className="text-emerald-300 text-2xl uppercase tracking-widest mb-4 font-semibold">Menuju Waktu {timeStatus.next?.name}</p>
            <div className="text-[10rem] font-bold font-mono text-white leading-none tracking-tighter drop-shadow-2xl">{timeStatus.text}</div>
            <div className="mt-12 w-full">
               <h3 className="text-slate-400 text-lg uppercase tracking-widest mb-4">Agenda Berikutnya</h3>
               {data.kegiatan?.slice(0,1).map((k, i) => (
                 <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/10 flex items-center gap-6 text-left mx-auto max-w-2xl">
                   <div className="bg-emerald-600 p-4 rounded-xl text-center min-w-[100px]">
                     <span className="block text-3xl font-bold text-white">{k.waktu.split(' ')[0].split('-')[2] || 'Hari'}</span>
                     <span className="text-xs uppercase text-emerald-100 font-bold">Ini</span>
                   </div>
                   <div>
                     <h4 className="text-3xl font-bold text-white mb-1">{k.judul}</h4>
                     <p className="text-xl text-emerald-300 flex items-center gap-2"><UserCircle/> {k.ustadz}</p>
                   </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );

  const SlideInfo = () => (
    <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center relative bg-slate-900">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      <Megaphone size={120} className="text-emerald-500 mb-8 animate-bounce"/>
      <h2 className="text-6xl font-bold text-white mb-8 leading-tight max-w-5xl">{data.config.visi || "Mari makmurkan masjid dengan sholat berjamaah"}</h2>
      {data.tpa?.pengumuman?.[0] && (
        <div className="bg-slate-800 p-8 rounded-3xl border-l-8 border-yellow-500 max-w-4xl shadow-2xl">
          <h3 className="text-3xl font-bold text-yellow-500 mb-2">Info TPA/Pendidikan</h3>
          <p className="text-2xl text-slate-200">{data.tpa.pengumuman[0].isipesan}</p>
        </div>
      )}
    </div>
  );

  const SlideDonasi = () => (
    <div className="w-full h-full flex items-center p-12 gap-12 bg-gradient-to-r from-slate-900 to-slate-800">
      <div className="w-1/2 flex justify-center">
         <div className="bg-white p-6 rounded-3xl shadow-2xl transform rotate-2 transition-transform duration-1000 scale-110">
           {data.profile.qris_url ? <img src={data.profile.qris_url} className="w-[500px] h-[500px] object-cover rounded-xl" /> : <div className="w-[500px] h-[500px] bg-gray-200 flex items-center justify-center text-slate-500">QRIS Placeholder</div>}
         </div>
      </div>
      <div className="w-1/2 text-left">
         <h2 className="text-6xl font-bold text-white mb-6">Infaq & Shodaqoh</h2>
         <p className="text-3xl text-emerald-400 mb-10">Scan QRIS untuk donasi operasional masjid</p>
         <div className="bg-slate-800 p-8 rounded-3xl border border-slate-600 mb-8">
           <p className="text-slate-400 text-xl uppercase tracking-widest mb-2">Rekening Bank</p>
           <p className="text-5xl font-mono font-bold text-white tracking-wider">{data.profile.rekening}</p>
           <p className="text-2xl text-emerald-500 mt-2">a.n {data.profile.nama}</p>
         </div>
         <div className="flex gap-6">
           <div className="flex-1 bg-emerald-900/50 p-6 rounded-2xl border border-emerald-500/30">
             <p className="text-emerald-400 text-sm uppercase">Kas Operasional</p>
             <p className="text-3xl font-bold text-white">{fmt(data.keuangan.saldo_operasional)}</p>
           </div>
           <div className="flex-1 bg-blue-900/50 p-6 rounded-2xl border border-blue-500/30">
             <p className="text-blue-400 text-sm uppercase">Pembangunan</p>
             <p className="text-3xl font-bold text-white">{fmt(data.keuangan.saldo_pembangunan)}</p>
           </div>
         </div>
      </div>
    </div>
  );

  const SlideVideo = () => (
    <div className="w-full h-full bg-black relative">
      <iframe className="w-full h-full absolute inset-0" src={`https://www.youtube.com/embed/${data.config.video_id}?autoplay=1&mute=1&controls=0&loop=1`} title="Video Masjid" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
      <div className="absolute bottom-10 right-10 bg-black/50 px-4 py-2 rounded text-white text-sm backdrop-blur">Video Ceramah</div>
    </div>
  );

  const SlideKhutbah = () => (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center text-center">
      <div className="animate-pulse mb-8"><Mic size={100} className="text-emerald-700"/></div>
      <h1 className="text-6xl font-bold text-emerald-800 tracking-[0.2em] uppercase mb-6">KHUTBAH JUMAT</h1>
      <p className="text-2xl text-emerald-900/50 uppercase tracking-widest">Harap Tenang & Dengarkan Khatib</p>
      <div className="absolute bottom-10 right-10 flex items-center gap-4 text-emerald-900/30">
        <BellOff size={32}/> <span className="text-3xl font-mono">{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );

  const SlideSholat = () => (
    <div className="w-full h-full bg-black flex items-center justify-center">
       <p className="text-emerald-900/20 font-bold text-4xl animate-pulse">SHOLAT SEDANG BERLANGSUNG</p>
    </div>
  );

  // NEW DZIKIR SLIDE
  const SlideDzikir = () => {
    const [dIndex, setDIndex] = useState(0);
    
    // Auto rotate dzikir slides if multiple keys (slide_dzikir_1, slide_dzikir_2) exist
    const dzikirSlides = Object.keys(data.config)
      .filter(key => key.startsWith('slide_dzikir_'))
      .map(key => data.config[key])
      .filter(url => url);

    // Fallback if no specific dzikir slides
    const finalDzikirSlides = dzikirSlides.length > 0 ? dzikirSlides : [
        "https://images.unsplash.com/photo-1596920959820-2f638843930b?q=80&w=1920", 
    ];

    useEffect(() => {
        if (finalDzikirSlides.length <= 1) return;
        const interval = setInterval(() => {
            setDIndex(prev => (prev + 1) % finalDzikirSlides.length);
        }, 10000); 
        return () => clearInterval(interval);
    }, [finalDzikirSlides.length]);

    return (
        <div className="w-full h-full relative bg-slate-900">
            <img src={finalDzikirSlides[dIndex]} alt="Dzikir" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <h2 className="text-6xl font-bold text-white mb-4 tracking-widest drop-shadow-lg">DZIKIR & WIRID</h2>
                <p className="text-2xl text-emerald-100 font-light max-w-4xl leading-relaxed drop-shadow-md">
                    "Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram." (QS. Ar-Ra'd: 28)
                </p>
            </div>
        </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col font-sans overflow-hidden bg-slate-900 text-white`}>
      {CurrentSlide === 'emergency' && (<div className="absolute inset-0 z-[200] bg-red-700 flex flex-col items-center justify-center text-center p-20 animate-pulse"><AlertTriangle size={200} className="text-white mb-10"/><h1 className="text-8xl font-black text-white uppercase mb-8">PENGUMUMAN PENTING</h1><p className="text-5xl text-white font-medium leading-relaxed">{EMERGENCY_MSG}</p></div>)}
      
      {/* OVERLAY LAYERS */}
      {CurrentSlide === 'sholat' && <div className="absolute inset-0 z-[200] bg-black"><SlideSholat/></div>}
      {CurrentSlide === 'dzikir' && <div className="absolute inset-0 z-[190] bg-slate-900"><SlideDzikir/></div>}
      {CurrentSlide === 'khutbah' && <div className="absolute inset-0 z-[190] bg-black"><SlideKhutbah/></div>}

      {CurrentSlide === 'iqomah' && (<div className="absolute inset-0 z-[150] bg-slate-900 flex flex-col items-center justify-center text-center"><h2 className="text-6xl font-bold text-red-500 mb-8 tracking-widest uppercase">Menuju Iqomah</h2><div className="text-[15rem] font-bold font-mono text-white leading-none">{timeStatus.text.replace('IQOMAH ', '')}</div><div className="mt-16 text-3xl bg-red-900/50 px-10 py-4 rounded-full text-red-200 border border-red-500/50">Mohon Matikan Alat Komunikasi</div></div>)}
      
      {['dashboard', 'info', 'donasi', 'adzan'].includes(CurrentSlide) && (
        <div className="flex justify-between items-center p-6 bg-slate-900/90 backdrop-blur-md shadow-2xl border-b border-slate-800 relative z-50">
          <div className="flex items-center gap-6"><div onClick={onBack} className="cursor-pointer bg-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-900/50"><Moon size={48} className="text-white"/></div><div><h1 className="text-4xl font-bold text-white tracking-tight leading-none mb-1">{data.profile.nama}</h1><p className="text-xl text-slate-400 flex items-center gap-2"><MapPin size={20}/> {data.profile.alamat}</p></div></div>
          <div className="text-right flex items-center gap-8">{!audioEnabled ? (<button onClick={handleAudioInit} className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full text-lg font-bold flex items-center gap-2 animate-pulse shadow-lg"><VolumeX/> Aktifkan Suara</button>) : (<div className="text-emerald-500 flex items-center gap-2"><Volume2/> Audio ON</div>)}<div><div className="text-7xl font-bold font-mono tracking-widest text-white leading-none drop-shadow-lg">{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}<span className="text-3xl text-slate-500 ml-3">{time.getSeconds()}</span></div><div className="flex items-center justify-end gap-4 mt-2"><p className="text-2xl font-medium text-emerald-400">{time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><span className="bg-slate-700 px-3 py-1 rounded-lg text-lg text-white font-bold border border-slate-600 transition-all duration-500">{showHijri ? getHijriDate() + " H" : getMasehiDate() + " M"}</span></div></div></div>
        </div>
      )}
      <div className="flex-1 relative bg-slate-900 overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${CurrentSlide === 'dashboard' || CurrentSlide === 'adzan' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}><SlideDashboard /></div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${CurrentSlide === 'info' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}><SlideInfo /></div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${CurrentSlide === 'donasi' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}><SlideDonasi /></div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${CurrentSlide === 'video' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>{CurrentSlide === 'video' && <SlideVideo />}</div>
      </div>
      {['dashboard', 'info', 'donasi', 'adzan'].includes(CurrentSlide) && (<div className="bg-emerald-800 p-4 overflow-hidden whitespace-nowrap relative border-t-4 border-yellow-500 z-50"><div className="inline-block animate-[marquee_25s_linear_infinite] text-3xl font-medium text-white px-4">{data.config.visi ? `📢 ${data.config.visi}  ✦  ` : "Selamat Datang  ✦  "}{data.pembangunan ? `🔨 Renovasi: ${data.pembangunan.tahap} (${data.pembangunan.progress}%)  ✦  ` : ""}{data.kegiatan?.[0] ? `🗓️ Agenda: ${data.kegiatan[0].judul} bersama ${data.kegiatan[0].ustadz}  ✦  ` : ""} Mari luruskan dan rapatkan shaf  ✦  Matikan HP saat sholat</div></div>)}
      <audio ref={audioRef} src="https://www.soundjay.com/human/sounds/man-coughing-01.mp3" preload="auto" />
      <style>{`@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } } .animate-fade-in { animation: fadeIn 1s ease-in-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
};

const ViewRamadhan = ({ data, onBack }) => ( <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 animate-fade-in bg-gradient-to-b from-purple-50 to-white"><button onClick={onBack} className="mb-4 flex items-center text-sm font-semibold text-gray-600 hover:text-purple-600"><ArrowLeft size={16} className="mr-1"/> Kembali</button><div className="text-center mb-6"><div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-purple-600 animate-pulse"><MoonStar size={32}/></div><h2 className="text-xl font-bold text-gray-800">Semarak Ramadhan</h2><p className="text-sm text-gray-500">Raih pahala tanpa batas</p></div><div className="space-y-4"><Card className="bg-white border border-purple-100 shadow-sm"><h3 className="font-bold text-center mb-4 text-purple-800">Jadwal Imsakiyah Hari Ini</h3><div className="flex justify-between items-center text-center"><div><p className="text-xs text-purple-400 uppercase">Imsak</p><p className="text-2xl font-bold font-mono text-gray-800">04:32</p></div><div><p className="text-xs text-purple-400 uppercase">Subuh</p><p className="text-2xl font-bold font-mono text-gray-800">{data.jadwal.subuh}</p></div><div><p className="text-xs text-purple-400 uppercase">Maghrib</p><p className="text-2xl font-bold font-mono text-gray-800">{data.jadwal.maghrib}</p></div></div><p className="text-[10px] text-center mt-4 text-purple-400">*Waktu Imsak 10 menit sebelum Subuh</p></Card><div className="grid grid-cols-2 gap-3"><Card className="text-center"><Utensils className="mx-auto text-orange-500 mb-2" size={24}/><h4 className="font-bold text-sm">Buka Puasa</h4><p className="text-xs text-gray-500">Tersedia: 150 Porsi</p></Card><Card className="text-center"><Tent className="mx-auto text-blue-500 mb-2" size={24}/><h4 className="font-bold text-sm">I'tikaf</h4><p className="text-xs text-gray-500">Quota: 50 Jamaah</p></Card></div><Card><h4 className="font-bold text-gray-800 mb-3">Agenda Spesial</h4><div className="space-y-3"><div className="flex gap-3 items-center border-b border-gray-50 pb-2"><Badge type="purple">Kultum</Badge><div><p className="text-sm font-bold text-gray-800">Keutamaan Lailatul Qadar</p><p className="text-xs text-gray-500">Ust. Abdullah • Tarawih Malam 21</p></div></div></div></Card></div></div>);
const ViewIdulFitri = ({ data, onBack }) => { const openMap = () => window.open(data.profile.map_url || "https://maps.google.com", "_blank"); return (<div className="pb-24 pt-4 px-4 min-h-screen bg-emerald-50 animate-fade-in"><button onClick={onBack} className="mb-4 flex items-center text-sm font-semibold text-emerald-700 hover:text-emerald-900"><ArrowLeft size={16} className="mr-1"/> Kembali</button><div className="text-center mb-8 relative"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-emerald-100 blur-3xl opacity-50 -z-10"></div><div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-lg border-4 border-white"><Gift size={40}/></div><h2 className="text-2xl font-bold text-emerald-900">Idul Fitri 1447H</h2><p className="text-emerald-600">Taqabbalallahu Minna Wa Minkum</p></div><div className="space-y-4"><Card className="border-emerald-200 shadow-md"><h3 className="font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Pelaksanaan Sholat Ied</h3><div className="grid grid-cols-2 gap-4 text-center"><div><p className="text-xs text-gray-500 uppercase">Imam</p><p className="font-bold text-emerald-800">Ust. H. Ahmad</p></div><div><p className="text-xs text-gray-500 uppercase">Khotib</p><p className="font-bold text-emerald-800">KH. Zainuddin</p></div><div><p className="text-xs text-gray-500 uppercase">Jam Mulai</p><p className="font-bold text-emerald-800">06:30 WITA</p></div><div><p className="text-xs text-gray-500 uppercase">Lokasi</p><p className="font-bold text-emerald-800 cursor-pointer underline" onClick={openMap}>Lapangan Utama</p></div></div></Card><Card className="bg-white border border-emerald-200 shadow-sm"><div className="flex items-center gap-2 mb-4"><CheckCircle className="text-emerald-500"/><h3 className="font-bold text-gray-800">Laporan Zakat Fitrah</h3></div><div className="space-y-4"><div className="flex justify-between items-center border-b border-gray-100 pb-2"><span>Zakat Beras</span><span className="font-mono font-bold text-xl text-gray-800">450 Kg</span></div><div className="flex justify-between items-center border-b border-gray-100 pb-2"><span>Zakat Uang</span><span className="font-mono font-bold text-xl text-gray-800">Rp 15.000.000</span></div><div className="text-center pt-2"><span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">Siap Disalurkan ke 150 Mustahik</span></div></div></Card></div></div>); };

// --- MAIN APP ---
export default function App() {
  const [view, setView] = useState('home'); 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeStatus, setTimeStatus] = useState({ status: 'loading', text: '--:--' });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?nocache=${Date.now()}`);
      if (!response.ok) throw new Error("Server Error");
      const json = await response.json();
      setData(json);
      localStorage.setItem(CACHE_KEY, JSON.stringify(json));
      setIsOffline(false);
    } catch (err) { 
      console.error(err); 
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setData(JSON.parse(cached));
        setIsOffline(true);
        console.log("Loaded from cache");
      } else {
        setError("Gagal terhubung ke Database Masjid.");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if(!data) return;
    const tick = setInterval(() => {
      // PASS WHOLE CONFIG TO HELPER
      setTimeStatus(calculateTimeStatus(data.jadwal, data.config));
    }, 1000);
    return () => clearInterval(tick);
  }, [data]);

  if (loading) return (<div className="min-h-screen flex flex-col items-center justify-center text-emerald-600"><RefreshCw className="animate-spin mb-2"/><p className="text-xs font-medium text-gray-400">Memuat Data Masjid...</p></div>);
  if (error) return (<div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"><Info className="text-red-500 mb-2" size={32}/><p className="text-gray-800 font-bold">{error}</p><button onClick={fetchData} className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">Coba Lagi</button></div>);

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans text-slate-800">
      {view === 'tv' ? (
        <ViewTV data={data} onBack={() => setView('admin')} timeStatus={timeStatus} />
      ) : (
        <>
          {view === 'home' && <Header profile={data.profile} config={data.config} setView={setView} timeStatus={timeStatus} isOffline={isOffline} />}
          <main className="animate-fade-in">
            {view === 'home' && <ViewHome data={data} setView={setView} timeStatus={timeStatus} />}
            {view === 'qurban' && <ViewQurban data={data} onBack={() => setView('home')} />}
            {view === 'pembangunan' && <ViewPembangunan data={data} onBack={() => setView('home')} />}
            {view === 'tpa' && <ViewTPA data={data} onBack={() => setView('home')} />}
            {view === 'kegiatan' && <ViewKegiatan data={data} onBack={() => setView('home')} />}
            {view === 'donasi' && <ViewDonasi data={data} onBack={() => setView('home')} />}
            {view === 'petugas' && <ViewPetugas data={data} onBack={() => setView('home')} />}
            {view === 'admin' && <ViewAdmin data={data} onBack={() => setView('home')} setView={setView} />}
            {view === 'ramadhan' && <ViewRamadhan data={data} onBack={() => setView('home')} />}
            {view === 'idul_fitri' && <ViewIdulFitri data={data} onBack={() => setView('home')} />}
          </main>
          
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-between items-center z-50 max-w-md mx-auto">
            <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 p-2 ${view === 'home' ? 'text-emerald-600' : 'text-gray-400'}`}><Home size={20}/><span className="text-[10px] font-medium">Beranda</span></button>
            <button onClick={() => setView('donasi')} className={`flex flex-col items-center gap-1 p-2 ${view === 'donasi' ? 'text-emerald-600' : 'text-gray-400'}`}><Wallet size={20}/><span className="text-[10px] font-medium">Donasi</span></button>
            <button onClick={() => setView('kegiatan')} className={`flex flex-col items-center gap-1 p-2 ${view === 'kegiatan' ? 'text-emerald-600' : 'text-gray-400'}`}><Calendar size={20}/><span className="text-[10px] font-medium">Jadwal</span></button>
            <button onClick={() => setView('admin')} className={`flex flex-col items-center gap-1 p-2 ${view === 'admin' ? 'text-emerald-600' : 'text-gray-400'}`}><Settings size={20}/><span className="text-[10px] font-medium">Admin</span></button>
          </div>
        </>
      )}
    </div>
  );
}