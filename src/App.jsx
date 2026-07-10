import { useState, useEffect, useRef } from 'react';
import {
  PlaneTakeoff, PlaneLanding, Hotel, Luggage, Ship, Castle, Sparkles,
  ShoppingBag, Utensils, Gift, Zap, Train, Building2, Moon, Coffee,
  MapPin, X, Star
} from 'lucide-react';

/* ---------------------------------------------------------
   DATA — grounded in real places (verified via Places search)
--------------------------------------------------------- */

const AREAS = {
  bay: {
    key: 'bay', name: '東京灣・舞浜', short: '東京灣', color: '#1C7C8C', tint: '#E3F1F2',
    intro: '兩大迪士尼樂園跟飯店群都在舞浜車站周邊，園區外的 Ikspiari 是覓食、看電影、最後補貨的地方。',
    food: [
      { name: 'Monsoon Cafe', tag: 'Ikspiari 3F・泰越料理', note: '營業到 22:30，玩晚了也不怕餓肚子', rating: 4.3, placeId: 'ChIJyyO31hF9GGARhpUMZWBDxNQ' },
      { name: 'Rainforest Cafe', tag: 'Ikspiari 2F・美式主題餐廳', note: '叢林造景很有氣氛，適合放鬆拍照', rating: 4.0, placeId: 'ChIJyyO31hF9GGARyQTJU6OkWeo' },
      { name: 'Ikspiari Kitchen', tag: '美食街', note: '選擇多、出餐快，趕行程時的好選擇', rating: 3.4, placeId: 'ChIJPYu2AiZ9GGARKpMXFATtZmE' },
      { name: 'Cape Cod Cook-Off', tag: '迪士尼海洋・美式漢堡', note: '園內人氣速食，看秀配漢堡', rating: 4.1, placeId: 'ChIJfUIqYRN9GGARxjDrLwp3rMY' },
      { name: 'Restaurant Sakura', tag: '迪士尼樂園・和食', note: '園內少見的正餐選項，天婦羅定食不錯', rating: 4.0, placeId: 'ChIJFc3yGBN9GGARdLNhJV9e3Qs' },
    ],
    tips: [
      'Hilton Tokyo Bay 樓下就有 Lawson，消夜、飲料很方便',
      '兩個樂園都開到 21:00，出發前可以查一下當週的夜間遊行或煙火時段',
      '飯店有免費接駁電車連接兩個樂園入口，不用自己走',
    ],
  },
  daiba: {
    key: 'daiba', name: '台場・豐洲', short: '台場', color: '#6B4FA0', tint: '#EEE9F7',
    intro: 'Grand Nikko 所在的台場，跟 teamLab Planets 所在的豐洲，一條百合海鷗號就能串起來，沿路都是東京灣海景。',
    food: [
      { name: 'LaLaport Toyosu', tag: 'teamLab 步行 5 分鐘', note: '海濱商場，餐廳選擇最多，逛累了直接吃', rating: 3.9, placeId: 'ChIJRZuDqpiJGGARCb20R0epFcI' },
      { name: 'Monsoon Cafe', tag: 'Aqua City 4F・泰越料理', note: '東京灣景觀，晚餐氣氛很好', rating: 4.3, placeId: 'ChIJL8dbO_aJGGARpzmnVUUI4n4' },
      { name: 'YORIMICHI ODAIBA', tag: 'Aqua City・創作和食', note: '正對彩虹大橋，招牌布丁別錯過', rating: 4.0, placeId: 'ChIJqZfFV9GJGGARJG-2zHeyUdc' },
      { name: 'Sizzler', tag: 'Aqua City・牛排沙拉吧', note: '吃到飽沙拉吧＋海景，份量實在', rating: 4.1, placeId: 'ChIJ819zO_aJGGARsmspYwftPuw' },
      { name: 'Bills Odaiba', tag: 'Decks 3F・早午餐', note: '鬆餅名店，早午餐首選', rating: 4.2, placeId: 'ChIJgUkr0PaJGGARDPmzLJx3rLE' },
      { name: 'Tsukiji Sushiko', tag: 'Aqua City 1F・迴轉壽司', note: '平價壽司，不用跑築地也吃得到', rating: 3.8, placeId: 'ChIJv1K_OvaJGGARhFoExLbHJjA' },
    ],
    tips: [
      'teamLab Planets 要脫鞋涉水，建議穿快乾短褲／裙，置物櫃免費使用',
      'DiverCity 7 樓 Gundam Base 本館需線上抽選；門口的獨角獸鋼彈已展出近 9 年，2026 年 8 月底將正式撤展，這趟正好趕上最後身影',
      '台場—豐洲車程約 15-20 分鐘，安排單向動線比較不會走回頭路',
    ],
  },
  akiba: {
    key: 'akiba', name: '秋葉原', short: '秋葉原', color: '#D9622B', tint: '#FBEBE2',
    intro: '動漫、公仔、扭蛋跟電器的集散地，室內店家密集，就算天氣熱也逛得舒服。',
    food: [
      { name: 'Tsujita 沾麵', tag: '神田末広町・濃厚沾麵', note: '評價 4.9，秋葉原數一數二的沾麵', rating: 4.9, placeId: 'ChIJazjtQgCNGGARO606yF6kY7I' },
      { name: 'Kyushu Jangara', tag: '豚骨拉麵', note: '位子小但出餐快，也有素食選項', rating: 4.4, placeId: 'ChIJ99Gizh2MGGARuDpsme65T9s' },
      { name: 'Maidreamin 本店', tag: '女僕咖啡廳', note: '想體驗一次秋葉原限定文化的話', rating: 4.9, placeId: 'ChIJyR7AdR6MGGAROowxIYdMsj0' },
      { name: '牛かつ もと村', tag: '炸牛排定食', note: '石板自烤炸牛排，外酥內嫩', rating: 4.5, placeId: 'ChIJDzVfxB6MGGARhB5ZxD9XvUk' },
      { name: 'CoCo 壱番屋', tag: '秋葉原站前・咖哩飯', note: '快速方便，客製化辣度和配料', rating: 4.0, placeId: 'ChIJEUmZ7h6MGGARQdnl8F5c9ek' },
    ],
    tips: [
      '扭蛋會館整層都是機台，記得先換好百圓硬幣',
      'Mandarake Complex 有 8 層樓，慢慢挖寶可以待上一整個下午',
      'Yodobashi Akiba 冷氣強又能退稅，戰利品可以直接拖去新宿',
    ],
  },
  shinjuku: {
    key: 'shinjuku', name: '新宿', short: '新宿', color: '#33406B', tint: '#E7E9F0',
    intro: '從秋葉原跳一班車就到，百貨公司跟居酒屋巷弄並存，適合當一天的收尾。',
    food: [
      { name: '今半', tag: '高島屋 14F・壽喜燒', note: '逛完百貨不用再移動，直接吃晚餐', rating: null, placeId: 'ChIJMxx7bsWMGGARdrUfch90sVw' },
      { name: '思い出橫丁', tag: 'Omoide Yokocho・串燒小巷', note: '昭和氛圍的窄巷，跟白天的新宿很不一樣', rating: 4.2, placeId: 'ChIJP9eKBdeMGGAR0zzBXJNVj5A' },
      { name: '伊勢丹新宿', tag: '地下美食街', note: '熟食、甜點、伴手禮一次逛完', rating: null, placeId: null },
      { name: 'Fuunji', tag: '代代木・沾麵', note: '新宿站南口排隊名店，魚介濃厚湯底', rating: 4.6, placeId: 'ChIJr9-u0deMGGARjPLbKrW6QjI' },
      { name: '磯丸水產', tag: '新宿東口・海鮮居酒屋', note: '24 小時營業，桌上自烤海鮮', rating: 3.9, placeId: 'ChIJGcI8tcaMGGARf3t5M8u3Gpc' },
    ],
    tips: [
      'Don Quijote 新宿店 24 小時營業，最後一晚買伴手禮／藥妝很方便，記得帶護照退稅',
      '高島屋 Times Square 就在車站旁，逛街、晚餐、回飯店動線一次搞定',
    ],
  },
};

const DAYS = [
  {
    id: 1, date: '08/19', weekday: '週三', areaKeys: ['bay'], title: '抵達東京・海洋日',
    events: [
      { time: '09:00', icon: PlaneTakeoff, title: '中華航空 桃園 → 羽田', desc: '國際線建議提前 2.5 小時抵達機場', type: 'flight' },
      { time: '13:10', icon: PlaneLanding, title: '抵達羽田機場', desc: '入境審查＋提領行李，預留 40-60 分鐘', type: 'flight' },
      { time: '約 15:00', icon: Hotel, title: 'Hilton Tokyo Bay', desc: '先寄放行李，正式入住晚點再辦理', area: 'bay' },
      { time: '16:00', icon: Ship, title: '東京迪士尼海洋', desc: '開放到 21:00，夜間的威尼斯貢多拉很值得', area: 'bay' },
      { time: '21:30', icon: Moon, title: '返回 Hilton Tokyo Bay', desc: '第一晚住宿', area: 'bay', showBadge: false },
    ],
  },
  {
    id: 2, date: '08/20', weekday: '週四', areaKeys: ['bay'], title: '迪士尼陸地全日',
    events: [
      { time: '08:30', icon: Castle, title: '東京迪士尼樂園', desc: '全日暢玩，建議提早入園搶熱門設施', area: 'bay' },
      { time: '21:00', icon: Moon, title: '返回 Hilton Tokyo Bay', desc: '第二晚住宿', area: 'bay', showBadge: false },
    ],
  },
  {
    id: 3, date: '08/21', weekday: '週五', areaKeys: ['daiba'], title: '移師台場・數位藝術',
    events: [
      { time: '11:00', icon: Luggage, title: '退房，前往台場', desc: '舞浜到台場車程約 40-50 分鐘', type: 'transit' },
      { time: '約 12:30', icon: Hotel, title: 'Grand Nikko Tokyo Daiba', desc: '先寄放行李，不急著正式入住', area: 'daiba' },
      { time: '14:00', icon: Sparkles, title: 'teamLab Planets TOKYO', desc: '豐洲館，赤腳涉水的沉浸式展覽', area: 'daiba' },
      { time: '16:30', icon: ShoppingBag, title: 'LaLaport Toyosu', desc: '就在 teamLab 隔壁，海濱商場慢慢逛', area: 'daiba' },
      { time: '19:00', icon: Utensils, title: '台場晚餐', desc: 'Aqua City／DiverCity，配彩虹大橋夜景', area: 'daiba', showBadge: false },
    ],
  },
  {
    id: 4, date: '08/22', weekday: '週六', areaKeys: ['akiba', 'shinjuku'], title: '秋葉原尋寶・新宿收尾',
    events: [
      { time: '10:00', icon: Gift, title: '秋葉原：扭蛋・動漫店', desc: '扭蛋會館、Mandarake、Animate 一次逛', area: 'akiba' },
      { time: '12:30', icon: Utensils, title: '秋葉原午餐', desc: '拉麵一級戰區，排隊也值得', area: 'akiba', showBadge: false },
      { time: '14:00', icon: Zap, title: 'Yodobashi Akiba', desc: '電器街，退稅、戰利品打包', area: 'akiba' },
      { time: '15:30', icon: Train, title: '搭車前往新宿', desc: '約 15-20 分鐘直達', type: 'transit' },
      { time: '16:00', icon: Building2, title: '新宿逛街', desc: '伊勢丹、Don Quijote，補伴手禮／藥妝', area: 'shinjuku' },
      { time: '19:00', icon: Utensils, title: '新宿晚餐', desc: '今半壽喜燒，或思い出橫丁串燒', area: 'shinjuku', showBadge: false },
      { time: '21:30', icon: Moon, title: '返回 Grand Nikko Tokyo Daiba', desc: '最後一晚住宿', area: 'daiba', showBadge: false },
    ],
  },
  {
    id: 5, date: '08/23', weekday: '週日', areaKeys: ['daiba'], title: '台場輕鬆早晨・賦歸',
    events: [
      { time: '09:00', icon: Coffee, title: '台場周邊悠閒早晨', desc: '退房前最後採買，Aqua City／DiverCity 就在飯店旁', area: 'daiba' },
      { time: '11:00', icon: Luggage, title: '退房，前往羽田機場', desc: '車程約 30 分鐘', type: 'transit' },
      { time: '14:30', icon: PlaneTakeoff, title: '羽田 → 桃園 起飛', desc: '國際線登機門常較早關閉，預留充裕時間', type: 'flight' },
    ],
  },
];

const NEUTRAL = '#A9A398';
const NEUTRAL_TINT = '#EFEDE7';

const mapLink = (f) =>
  f.placeId
    ? `https://www.google.com/maps/place/?q=place_id:${f.placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name + ' ' + (f.tag || ''))}`;

/* ---------------------------------------------------------
   SUBCOMPONENTS
--------------------------------------------------------- */

function DayTab({ day, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-2xl px-3 py-3 text-left transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        active ? 'text-white shadow-lg scale-[1.02]' : 'bg-white text-stone-700 hover:shadow-md hover:scale-[1.01]'
      }`}
      style={{ width: '74px', backgroundColor: active ? '#1C1F26' : undefined }}
    >
      <div className="text-xs opacity-60 tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>DAY</div>
      <div className="text-2xl font-bold leading-none mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{day.id}</div>
      <div className="text-[10px] mt-1.5 opacity-70 leading-tight">{day.date}<br />{day.weekday}</div>
      <div className="flex gap-1 mt-2">
        {day.areaKeys.map((k) => (
          <span key={k} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AREAS[k].color }} />
        ))}
      </div>
    </button>
  );
}

function EventRow({ ev, isLast, onAreaClick, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const area = ev.area ? AREAS[ev.area] : null;
  const nodeColor = area ? area.color : NEUTRAL;
  const nodeTint = area ? area.tint : NEUTRAL_TINT;

  return (
    <div
      ref={ref}
      className="flex gap-4 transition-all duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay: `${index * 60}ms`,
      }}
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110"
          style={{ backgroundColor: nodeColor, boxShadow: '0 0 0 4px #F5F4EF' }}
        >
          <ev.icon size={17} color="#FFFFFF" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 transition-all duration-700" style={{ backgroundColor: nodeTint === NEUTRAL_TINT ? NEUTRAL : nodeColor, opacity: area ? 0.55 : 0.45, minHeight: '1.75rem' }} />}
      </div>
      <div className="flex-1 pb-7 pt-1.5 min-w-0">
        <span className="text-sm text-stone-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{ev.time}</span>
        <h4 className={`mt-0.5 ${ev.type ? 'font-medium text-stone-600' : 'font-bold text-stone-800'}`}>{ev.title}</h4>
        <p className="text-xs text-stone-500 mt-1 leading-relaxed">{ev.desc}</p>
        {area && ev.showBadge !== false && (
          <button
            onClick={() => onAreaClick(ev.area)}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:shadow-md hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2"
            style={{ backgroundColor: area.tint, color: area.color }}
          >
            <Utensils size={12} />
            <span className="truncate max-w-[140px]">{area.short} 美食地圖</span>
          </button>
        )}
      </div>
    </div>
  );
}

function AreaModal({ area, onClose }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!area) { setShow(false); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)));
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [area]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 280);
  };

  if (!area) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-all duration-300"
        style={{ backgroundColor: show ? 'rgba(28,31,38,0.5)' : 'rgba(28,31,38,0)' }}
        onClick={handleClose}
      />
      <div
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-y-auto transition-all duration-300 ease-out"
        style={{
          maxHeight: '85vh',
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)',
        }}
      >
        <div className="sticky top-0 px-6 pt-6 pb-5 rounded-t-3xl" style={{ backgroundColor: area.color }}>
          <button
            onClick={handleClose}
            aria-label="關閉"
            className="absolute right-5 top-5 text-white/80 hover:text-white transition-all duration-200 hover:scale-110 hover:rotate-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
          >
            <X size={22} />
          </button>
          <div className="text-white/70 text-xs tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AREA</div>
          <h3 className="text-white text-2xl font-bold mt-1">{area.name}</h3>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-stone-600 leading-relaxed mb-6">{area.intro}</p>

          <div className="mb-6">
            <h4 className="text-xs tracking-widest text-stone-400 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>FOOD・沿線美食</h4>
            <div className="space-y-2.5">
              {area.food.map((f, i) => (
                <a
                  key={i}
                  href={mapLink(f)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-all duration-200 hover:shadow-sm hover:translate-x-0.5 focus:outline-none focus-visible:ring-2"
                  style={{
                    opacity: show ? 1 : 0,
                    transform: show ? 'translateY(0)' : 'translateY(8px)',
                    transition: `all 0.3s ease-out ${150 + i * 50}ms`,
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-800 text-sm">{f.name}</span>
                      {f.rating && (
                        <span className="text-xs text-amber-600 flex items-center gap-0.5 flex-shrink-0">
                          <Star size={10} fill="currentColor" />{f.rating}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">{f.tag}</div>
                    <div className="text-xs text-stone-500 mt-1">{f.note}</div>
                  </div>
                  <MapPin size={16} className="text-stone-300 mt-1 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs tracking-widest text-stone-400 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>TIPS・小提醒</h4>
            <ul className="space-y-2.5">
              {area.tips.map((t, i) => (
                <li key={i} className="text-sm text-stone-600 leading-relaxed flex gap-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: area.color }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   MAIN APP
--------------------------------------------------------- */

export default function TokyoTripPlanner() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [activeArea, setActiveArea] = useState(null);
  const [dayKey, setDayKey] = useState(0);
  const day = DAYS.find((d) => d.id === selectedDay);

  const handleDayChange = (id) => {
    setSelectedDay(id);
    setDayKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-stone-100" style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (prefers-reduced-motion: reduce) {
          * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }
      `}</style>

      <div className="max-w-xl mx-auto bg-stone-100 min-h-screen sm:min-h-0 sm:my-6 sm:rounded-3xl sm:shadow-xl overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-8 pb-6 rounded-b-3xl" style={{ backgroundColor: '#1C1F26' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-white/40 text-xs tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>TOKYO ITINERARY</div>
              <h1 className="text-white text-2xl font-bold mt-1">東京五日行</h1>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-white/40 text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>2026</div>
              <div className="text-white text-lg font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>08.19–08.23</div>
            </div>
          </div>

          {/* area legend */}
          <div className="flex items-center gap-2 mt-5 overflow-x-auto no-scrollbar pb-1">
            {Object.values(AREAS).map((a) => (
              <button
                key={a.key}
                onClick={() => setActiveArea(a.key)}
                className="flex items-center gap-1.5 flex-shrink-0 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 transition-all duration-200 hover:scale-[1.04] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-white/80 text-xs whitespace-nowrap">{a.short}</span>
              </button>
            ))}
          </div>

          {/* flight tags */}
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-white/80 text-xs whitespace-nowrap flex-shrink-0">
              <PlaneTakeoff size={12} /> CI・桃園→羽田・09:00
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-white/80 text-xs whitespace-nowrap flex-shrink-0">
              <PlaneLanding size={12} /> 羽田→桃園・14:30
            </div>
          </div>
        </div>

        {/* Day selector */}
        <div className="flex gap-2 px-5 -mt-3 pb-1 overflow-x-auto no-scrollbar">
          {DAYS.map((d) => (
            <DayTab key={d.id} day={d} active={selectedDay === d.id} onClick={() => handleDayChange(d.id)} />
          ))}
        </div>

        {/* Day title */}
        <div className="px-5 pt-5 pb-1">
          <h2 className="text-lg font-bold text-stone-800 transition-all duration-300">{day.title}</h2>
        </div>

        {/* Timeline */}
        <div className="px-5 pt-4" key={dayKey}>
          {day.events.map((ev, idx) => (
            <EventRow key={idx} ev={ev} isLast={idx === day.events.length - 1} onAreaClick={setActiveArea} index={idx} />
          ))}
        </div>

        {selectedDay === 5 && (
          <div className="text-center pb-10 px-5 -mt-2">
            <p className="text-stone-400 text-sm">五天四夜東京行，一路平安 🎌</p>
          </div>
        )}
        {selectedDay !== 5 && <div className="pb-6" />}
      </div>

      <AreaModal area={activeArea ? AREAS[activeArea] : null} onClose={() => setActiveArea(null)} />
    </div>
  );
}
