import { useState, useEffect, useRef, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PlaneTakeoff, PlaneLanding, Hotel, Luggage, Ship, Castle, Sparkles,
  ShoppingBag, Utensils, Gift, Zap, Train, Building2, Moon, Coffee,
  MapPin, X, Star, Map as MapIcon, List, Landmark, Camera, TreePine,
  Fish, Drama, Palette, PawPrint, Music, Mountain
} from 'lucide-react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/* ---------------------------------------------------------
   DATA — grounded in real places (verified via Places search)
--------------------------------------------------------- */

const AREAS = {
  bay: {
    key: 'bay', name: '東京灣・舞浜', short: '東京灣', color: '#1C7C8C', tint: '#E3F1F2',
    intro: '兩大迪士尼樂園跟飯店群都在舞浜車站周邊，園區外的 Ikspiari 是覓食、看電影、最後補貨的地方。',
    food: [
      { name: 'Monsoon Cafe', tag: 'Ikspiari 3F・泰越料理', note: '營業到 22:30，玩晚了也不怕餓肚子', rating: 4.3, placeId: 'ChIJyyO31hF9GGARhpUMZWBDxNQ', lat: 35.6360, lng: 139.8852 },
      { name: 'Rainforest Cafe', tag: 'Ikspiari 2F・美式主題餐廳', note: '叢林造景很有氣氛，適合放鬆拍照', rating: 4.0, placeId: 'ChIJyyO31hF9GGARyQTJU6OkWeo', lat: 35.6354, lng: 139.8840 },
      { name: 'Ikspiari Kitchen', tag: '美食街', note: '選擇多、出餐快，趕行程時的好選擇', rating: 3.4, placeId: 'ChIJPYu2AiZ9GGARKpMXFATtZmE', lat: 35.6363, lng: 139.8842 },
      { name: 'Cape Cod Cook-Off', tag: '迪士尼海洋・美式漢堡', note: '園內人氣速食，看秀配漢堡', rating: 4.1, placeId: null, lat: 35.6255, lng: 139.8862 },
      { name: 'Restaurant Sakura', tag: '東京迪士尼海洋・和食', note: '園內少見的正餐選項，天婦羅定食不錯', rating: 4.0, placeId: null, lat: 35.6252, lng: 139.8834 },
      { name: '築地玉寿司 イクスピアリ店', tag: 'Ikspiari 4F・壽司', note: '築地起家的老字號，玩完樂園想吃壽司就靠它', rating: 4.0, placeId: null, lat: 35.6351, lng: 139.8850 },
    ],
    shops: [
      { name: 'Bon Voyage', tag: '舞浜站旁・迪士尼官方商店', note: '園區外最大的迪士尼商品店，來不及在園內買的紀念品這裡補' },
      { name: 'Ikspiari', tag: '舞浜站直結・購物中心', note: '服飾、雜貨、超市和電影院，回飯店前順路逛' },
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
      { name: 'Monsoon Cafe', tag: 'Aqua City 4F・泰越料理', note: '東京灣景觀，晚餐氣氛很好', rating: 4.3, placeId: 'ChIJL8dbO_aJGGARpzmnVUUI4n4', lat: 35.6292, lng: 139.7733 },
      { name: 'YORIMICHI ODAIBA', tag: 'Aqua City・創作和食', note: '正對彩虹大橋，招牌布丁別錯過', rating: 4.0, placeId: 'ChIJqZfFV9GJGGARJG-2zHeyUdc', lat: 35.6288, lng: 139.7729 },
      { name: 'Sizzler', tag: 'Aqua City・牛排沙拉吧', note: '吃到飽沙拉吧＋海景，份量實在', rating: 4.1, placeId: 'ChIJ819zO_aJGGARsmspYwftPuw', lat: 35.6294, lng: 139.7741 },
      { name: 'bills お台場', tag: 'Decks 3F・早午餐', note: '鬆餅名店，早午餐首選', rating: 4.2, placeId: null, lat: 35.6297, lng: 139.7752 },
      { name: '築地寿司清', tag: 'Aqua City・壽司', note: '平價壽司，不用跑築地也吃得到', rating: 3.8, placeId: null, lat: 35.6286, lng: 139.7737 },
      { name: '東京ラーメン国技館 舞', tag: 'Aqua City 5F・拉麵主題館', note: '六家人氣拉麵店同場競技，配東京灣海景吃麵', rating: 3.8, placeId: null, lat: 35.6291, lng: 139.7745 },
      { name: 'KUA`AINA アクアシティお台場店', tag: 'Aqua City 4F・夏威夷漢堡', note: '夏威夷來的酪梨漢堡名店，份量十足', rating: 4.0, placeId: null, lat: 35.6287, lng: 139.7731 },
    ],
    shops: [
      { name: 'THE GUNDAM BASE TOKYO', tag: 'DiverCity 7F・鋼普拉', note: '鋼普拉旗艦店，本館要事前抽選，Annex 可以直接逛' },
      { name: '台場一丁目商店街', tag: 'Decks 4F・昭和復古街', note: '復古糖果店、懷舊遊戲機台，很好殺時間' },
      { name: 'DiverCity Tokyo Plaza', tag: '大型購物中心', note: '門口就是獨角獸鋼彈立像，定時有變身演出' },
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
      { name: 'Tsujita 沾麵', tag: '神田末広町・濃厚沾麵', note: '評價 4.9，秋葉原數一數二的沾麵', rating: 4.9, placeId: 'ChIJazjtQgCNGGARO606yF6kY7I', lat: 35.7027, lng: 139.7719 },
      { name: 'Kyushu Jangara', tag: '豚骨拉麵', note: '位子小但出餐快，也有素食選項', rating: 4.4, placeId: 'ChIJ99Gizh2MGGARuDpsme65T9s', lat: 35.7010, lng: 139.7720 },
      { name: 'Maidreamin 本店', tag: '女僕咖啡廳', note: '想體驗一次秋葉原限定文化的話', rating: 4.9, placeId: 'ChIJyR7AdR6MGGAROowxIYdMsj0', lat: 35.6999, lng: 139.7705 },
      { name: '牛かつ もと村 秋葉原店', tag: '炸牛排定食', note: '石板自烤炸牛排，外酥內嫩', rating: 4.5, placeId: null, lat: 35.6980, lng: 139.7718 },
      { name: 'CoCo壱番屋 秋葉原駅前店', tag: '咖哩飯', note: '快速方便，客製化辣度和配料', rating: 4.0, placeId: null, lat: 35.6987, lng: 139.7738 },
      { name: 'とんかつ 丸五', tag: '炸豬排', note: '秋葉原豬排名店，厚切里肌外酥內嫩，開店前就開始排', rating: 4.4, placeId: null, lat: 35.6992, lng: 139.7713 },
      { name: '牛丼専門サンボ', tag: '牛丼', note: '秋葉原傳說級牛丼，便宜大碗、翻桌超快', rating: 4.2, placeId: null, lat: 35.7002, lng: 139.7699 },
    ],
    shops: [
      { name: 'アニメイト秋葉原本館', tag: 'Animate・動漫周邊', note: '漫畫、BD、角色周邊最齊全的旗艦店' },
      { name: '秋葉原ラジオ会館', tag: 'Radio Kaikan・公仔大樓', note: '10 層樓公仔聖地，海洋堂、K-BOOKS 都在這' },
      { name: 'Mandarake Complex', tag: '中古同人・公仔', note: '8 層樓挖寶天堂，絕版品和中古公仔' },
      { name: '秋葉原ガチャポン会館', tag: '扭蛋會館', note: '數百台扭蛋機一次轉個夠，先換好百圓硬幣' },
      { name: 'コトブキヤ秋葉原館', tag: 'Kotobukiya・模型公仔', note: '壽屋直營店，原創模型系列很齊' },
      { name: 'TAMASHII NATIONS STORE TOKYO', tag: '萬代官方直營', note: 'S.H.Figuarts、超合金魂，限定品最多' },
      { name: 'スーパーポテト秋葉原店', tag: 'Super Potato・懷舊遊戲', note: '紅白機、GB、老 PS 遊戲，任天堂懷舊迷必逛' },
      { name: 'GiGO 秋葉原1号館', tag: '電玩遊樂場', note: '夾娃娃和大型機台，1～5 號館沿路都是' },
      { name: 'ヨドバシAkiba', tag: 'Yodobashi・電器', note: 'Switch、PS5 遊戲和電器一次買齊，可退稅' },
      { name: 'ビックカメラAKIBA', tag: 'Bic Camera・電器', note: '跟 Yodobashi 比價用，遊戲、相機、藥妝都有' },
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
      { name: '今半', tag: '高島屋 14F・壽喜燒', note: '逛完百貨不用再移動，直接吃晚餐', rating: null, placeId: 'ChIJMxx7bsWMGGARdrUfch90sVw', lat: 35.6873, lng: 139.7028 },
      { name: '思い出橫丁', tag: 'Omoide Yokocho・串燒小巷', note: '昭和氛圍的窄巷，跟白天的新宿很不一樣', rating: 4.2, placeId: 'ChIJP9eKBdeMGGAR0zzBXJNVj5A', lat: 35.6934, lng: 139.6996 },
      { name: '伊勢丹新宿', tag: '地下美食街', note: '熟食、甜點、伴手禮一次逛完', rating: null, placeId: null },
      { name: '風雲児 新宿', tag: '代代木・沾麵', note: '新宿站南口排隊名店，魚介濃厚湯底', rating: 4.6, placeId: null, lat: 35.6853, lng: 139.6995 },
      { name: '磯丸水産 新宿東口店', tag: '海鮮居酒屋', note: '24 小時營業，桌上自烤海鮮', rating: 3.9, placeId: null, lat: 35.6938, lng: 139.7015 },
      { name: '六歌仙', tag: '西新宿・和牛燒肉', note: '和牛燒肉＋涮涮鍋吃到飽，熱門時段建議先訂位', rating: 4.3, placeId: null, lat: 35.6938, lng: 139.6975 },
      { name: '名代とんかつ かつくら 新宿高島屋店', tag: '高島屋 14F・炸豬排', note: '京都來的豬排名店，現磨芝麻沾醬很講究', rating: 4.1, placeId: null, lat: 35.6877, lng: 139.7022 },
      { name: 'うなぎ 登亭 新宿店', tag: '鰻魚飯', note: '老字號平價鰻魚飯，鰻重不用排大隊也吃得到', rating: 4.0, placeId: null, lat: 35.6910, lng: 139.7040 },
      { name: 'すしざんまい 新宿東口店', tag: '壽司', note: '24 小時營業，鮪魚中腹大腹 CP 值高', rating: 4.0, placeId: null, lat: 35.6931, lng: 139.7030 },
      { name: '麺屋武蔵 新宿本店', tag: '拉麵', note: '新宿拉麵代表店，沾麵大盛免費加量', rating: 4.1, placeId: null, lat: 35.6950, lng: 139.6995 },
      { name: '京はやしや 新宿高島屋店', tag: '高島屋 13F・抹茶甜點', note: '宇治抹茶老舖，抹茶聖代和刨冰必點', rating: 3.9, placeId: null, lat: 35.6871, lng: 139.7024 },
      { name: '新宿高野本店', tag: '水果甜點', note: '百年水果專門店，哈密瓜聖代是招牌', rating: 4.1, placeId: null, lat: 35.6913, lng: 139.7014 },
    ],
    shops: [
      { name: 'ビックカメラ 新宿東口店', tag: 'Bic Camera・電器', note: '東口出站就到，遊戲主機、相機、藥妝都有' },
      { name: '紀伊國屋書店 新宿本店', tag: '書店', note: '老字號大型書店，漫畫、畫冊、文具' },
      { name: 'アニメイト新宿', tag: 'Animate・動漫周邊', note: '東口徒步圈，回飯店前最後補動漫周邊' },
      { name: 'ドン・キホーテ 新宿東南口店', tag: '唐吉訶德・藥妝雜貨', note: '24 小時營業，伴手禮最後衝刺，記得帶護照退稅' },
    ],
    tips: [
      'Don Quijote 新宿店 24 小時營業，最後一晚買伴手禮／藥妝很方便，記得帶護照退稅',
      '高島屋 Times Square 就在車站旁，逛街、晚餐、回飯店動線一次搞定',
      '想買任天堂／寶可夢官方商品：Nintendo TOKYO 和 Pokémon Center 澀谷店都在澀谷 PARCO 6F，從新宿搭山手線兩站就到',
    ],
  },
};

const DAYS = [
  {
    id: 1, date: '08/19', weekday: '週三', areaKeys: ['bay'], title: '抵達東京・海洋日',
    events: [
      { time: '09:00', icon: PlaneTakeoff, title: '中華航空 CI220 松山 → 羽田', desc: '國際線建議提前 2.5 小時抵達機場', type: 'flight', maps: '台北松山機場' },
      { time: '13:10', icon: PlaneLanding, title: '抵達羽田機場', desc: '入境審查＋提領行李，預留 40-60 分鐘', type: 'flight', maps: '羽田空港 第3ターミナル' },
      { time: '約 15:00', icon: Hotel, title: 'Hilton Tokyo Bay', desc: '先寄放行李，正式入住晚點再辦理', area: 'bay', maps: 'Hilton Tokyo Bay' },
      { time: '16:00', icon: Ship, title: '東京迪士尼海洋', desc: '開放到 21:00，夜間的威尼斯貢多拉很值得', area: 'bay', maps: '東京ディズニーシー' },
      { time: '21:30', icon: Moon, title: '返回 Hilton Tokyo Bay', desc: '第一晚住宿', area: 'bay', showBadge: false, maps: 'Hilton Tokyo Bay' },
    ],
  },
  {
    id: 2, date: '08/20', weekday: '週四', areaKeys: ['bay'], title: '迪士尼陸地全日',
    events: [
      { time: '08:30', icon: Castle, title: '東京迪士尼樂園', desc: '全日暢玩，建議提早入園搶熱門設施', area: 'bay', maps: '東京ディズニーランド' },
      { time: '21:00', icon: Moon, title: '返回 Hilton Tokyo Bay', desc: '第二晚住宿', area: 'bay', showBadge: false, maps: 'Hilton Tokyo Bay' },
    ],
  },
  {
    id: 3, date: '08/21', weekday: '週五', areaKeys: ['daiba'], title: '移師台場・數位藝術',
    events: [
      { time: '11:00', icon: Luggage, title: '退房，前往台場', desc: '舞浜到台場車程約 40-50 分鐘', type: 'transit', maps: '舞浜駅' },
      { time: '約 12:30', icon: Hotel, title: 'Grand Nikko Tokyo Daiba', desc: '先寄放行李，不急著正式入住', area: 'daiba', maps: 'グランドニッコー東京 台場' },
      { time: '14:00', icon: Sparkles, title: 'teamLab Planets TOKYO', desc: '豐洲館，赤腳涉水的沉浸式展覽', area: 'daiba', maps: 'teamLab Planets TOKYO' },
      { time: '16:30', icon: ShoppingBag, title: 'LaLaport Toyosu', desc: '就在 teamLab 隔壁，海濱商場慢慢逛', area: 'daiba', maps: 'ららぽーと豊洲' },
      { time: '19:00', icon: Utensils, title: '台場晚餐', desc: 'Aqua City／DiverCity，配彩虹大橋夜景', area: 'daiba', showBadge: false, maps: 'アクアシティお台場' },
    ],
  },
  {
    id: 4, date: '08/22', weekday: '週六', areaKeys: ['akiba', 'shinjuku'], title: '秋葉原尋寶・新宿收尾',
    events: [
      { time: '10:00', icon: Gift, title: '秋葉原：扭蛋・動漫店', desc: '扭蛋會館、Mandarake、Animate 一次逛', area: 'akiba', maps: '秋葉原電気街' },
      { time: '12:30', icon: Utensils, title: '秋葉原午餐', desc: '拉麵一級戰區，排隊也值得', area: 'akiba', showBadge: false },
      { time: '14:00', icon: Zap, title: 'Yodobashi Akiba', desc: '電器街，退稅、戰利品打包', area: 'akiba', maps: 'ヨドバシAkiba' },
      { time: '15:30', icon: Train, title: '搭車前往新宿', desc: '約 15-20 分鐘直達', type: 'transit', maps: '新宿駅' },
      { time: '16:00', icon: Building2, title: '新宿逛街', desc: '伊勢丹、Don Quijote，補伴手禮／藥妝', area: 'shinjuku', maps: '伊勢丹新宿店' },
      { time: '19:00', icon: Utensils, title: '新宿晚餐', desc: '今半壽喜燒，或思い出橫丁串燒', area: 'shinjuku', showBadge: false },
      { time: '21:30', icon: Moon, title: '返回 Grand Nikko Tokyo Daiba', desc: '最後一晚住宿', area: 'daiba', showBadge: false, maps: 'グランドニッコー東京 台場' },
    ],
  },
  {
    id: 5, date: '08/23', weekday: '週日', areaKeys: ['daiba'], title: '台場輕鬆早晨・賦歸',
    events: [
      { time: '09:00', icon: Coffee, title: '台場周邊悠閒早晨', desc: '退房前最後採買，Aqua City／DiverCity 就在飯店旁', area: 'daiba', maps: 'アクアシティお台場' },
      { time: '11:00', icon: Luggage, title: '退房，前往羽田機場', desc: '車程約 30 分鐘', type: 'transit', maps: '羽田空港 第3ターミナル' },
      { time: '14:30', icon: PlaneTakeoff, title: '中華航空 CI221 羽田 → 松山', desc: '國際線登機門常較早關閉，預留充裕時間', type: 'flight', maps: '羽田空港 第3ターミナル' },
    ],
  },
];

const NEUTRAL = '#A9A398';
const NEUTRAL_TINT = '#EFEDE7';

const placeSearchLink = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const mapLink = (f) => {
  const base = placeSearchLink(`${f.name} ${f.tag || ''}`.trim());
  return f.placeId ? `${base}&query_place_id=${f.placeId}` : base;
};

/* ---------------------------------------------------------
   MAP DATA — POIs, restaurants, and transit (approx coords)
--------------------------------------------------------- */

const AIRPORT_COLOR = '#1C1F26';

const PLACE_TYPES = [
  { key: 'sight', label: '景點', icon: Sparkles },
  { key: 'hotel', label: '住宿', icon: Hotel },
  { key: 'food', label: '美食', icon: Utensils },
  { key: 'shopping', label: '購物', icon: ShoppingBag },
  { key: 'transit', label: '交通', icon: Train },
];

const MAP_POIS = [
  { name: '東京迪士尼樂園', tag: '主題樂園・Day 2', areaKey: 'bay', type: 'sight', icon: Castle, lat: 35.6329, lng: 139.8804 },
  { name: '東京迪士尼海洋', tag: '主題樂園・Day 1', areaKey: 'bay', type: 'sight', icon: Ship, lat: 35.6267, lng: 139.8850 },
  { name: 'Hilton Tokyo Bay', tag: '住宿・Day 1-2', areaKey: 'bay', type: 'hotel', icon: Hotel, lat: 35.6273, lng: 139.8907 },
  { name: 'Ikspiari', tag: '購物・美食', areaKey: 'bay', type: 'shopping', icon: ShoppingBag, lat: 35.6357, lng: 139.8846 },
  { name: 'グランドニッコー東京 台場', tag: '住宿・Day 3-4', areaKey: 'daiba', type: 'hotel', icon: Hotel, lat: 35.6242, lng: 139.7752 },
  { name: 'teamLab Planets TOKYO', tag: '數位藝術・Day 3', areaKey: 'daiba', type: 'sight', icon: Sparkles, lat: 35.6491, lng: 139.7897 },
  { name: 'ららぽーと豊洲', tag: '購物中心・美食街', areaKey: 'daiba', type: 'shopping', icon: ShoppingBag, lat: 35.6553, lng: 139.7926 },
  { name: 'DiverCity Tokyo Plaza', tag: '獨角獸鋼彈・購物', areaKey: 'daiba', type: 'shopping', icon: ShoppingBag, lat: 35.6249, lng: 139.7756 },
  { name: 'アクアシティお台場', tag: '購物・美食・彩虹大橋景', areaKey: 'daiba', type: 'shopping', icon: ShoppingBag, lat: 35.6290, lng: 139.7737 },
  { name: '秋葉原電気街', tag: '動漫・扭蛋・電器・Day 4', areaKey: 'akiba', type: 'shopping', icon: Gift, lat: 35.7005, lng: 139.7712 },
  { name: '高島屋タイムズスクエア', tag: '百貨・晚餐・Day 4', areaKey: 'shinjuku', type: 'shopping', icon: Building2, lat: 35.6875, lng: 139.7025 },
  { name: '羽田機場 第3航廈', tag: '國際線・Day 1 / Day 5', areaKey: null, type: 'transit', icon: PlaneTakeoff, lat: 35.5447, lng: 139.7676 },
];

const MAP_STATIONS = [
  { name: '舞浜駅', line: 'JR 京葉線・迪士尼門戶', areaKey: 'bay', lat: 35.6363, lng: 139.8836 },
  { name: '東京駅', line: 'JR 各線轉乘樞紐', areaKey: null, lat: 35.6812, lng: 139.7671 },
  { name: '新橋駅', line: 'JR・百合海鷗號起點', areaKey: null, lat: 35.6663, lng: 139.7583 },
  { name: '台場駅', line: '百合海鷗號・飯店最近站', areaKey: 'daiba', lat: 35.6266, lng: 139.7740 },
  { name: '東京テレポート駅', line: '臨海線', areaKey: 'daiba', lat: 35.6276, lng: 139.7793 },
  { name: '新豊洲駅', line: '百合海鷗號・teamLab 最近站', areaKey: 'daiba', lat: 35.6444, lng: 139.7907 },
  { name: '豊洲駅', line: '有楽町線・百合海鷗號', areaKey: 'daiba', lat: 35.6547, lng: 139.7957 },
  { name: '秋葉原駅', line: 'JR 山手線・日比谷線', areaKey: 'akiba', lat: 35.6984, lng: 139.7731 },
  { name: '新宿駅', line: 'JR 山手線・中央線', areaKey: 'shinjuku', lat: 35.6896, lng: 139.7006 },
];

/* 觀光推薦 — 出自 gltjp.com 東京必去景點特輯（q = Google Maps 搜尋字串） */

const EXTRA_REGIONS = {
  more: { key: 'more', label: '更多東京', color: '#5B8A72' },
  daytrip: { key: 'daytrip', label: '近郊', color: '#B08968' },
};

const EXTRA_POIS = [
  // 經典景點
  { name: '明治神宮', tag: '神社・原宿站旁', areaKey: 'more', type: 'sight', icon: Landmark, lat: 35.6764, lng: 139.6993 },
  { name: '淺草寺', tag: '東京最古老寺院・雷門', areaKey: 'more', type: 'sight', icon: Landmark, lat: 35.7148, lng: 139.7967, q: '浅草寺' },
  { name: '東京晴空塔', tag: '634m 展望塔', areaKey: 'more', type: 'sight', icon: Camera, lat: 35.7101, lng: 139.8107, q: '東京スカイツリー' },
  { name: '墨田水族館', tag: '晴空塔城內・水族館', areaKey: 'more', type: 'sight', icon: Fish, lat: 35.7098, lng: 139.8095, q: 'すみだ水族館' },
  { name: '上野動物園', tag: '熊貓・日本最老動物園', areaKey: 'more', type: 'sight', icon: PawPrint, lat: 35.7156, lng: 139.7714 },
  { name: '上野公園', tag: '春季櫻花祭會場', areaKey: 'more', type: 'sight', icon: TreePine, lat: 35.7141, lng: 139.7734, q: '上野恩賜公園' },
  { name: '新宿御苑', tag: '庭園・楓紅櫻花名所', areaKey: 'shinjuku', type: 'sight', icon: TreePine, lat: 35.6852, lng: 139.7100 },
  { name: '東京鐵塔', tag: '333m 經典地標', areaKey: 'more', type: 'sight', icon: Camera, lat: 35.6586, lng: 139.7454, q: '東京タワー' },
  { name: '澀谷十字路口', tag: '世界最繁忙十字路口', areaKey: 'more', type: 'sight', icon: Camera, lat: 35.6595, lng: 139.7005, q: '渋谷スクランブル交差点' },
  { name: 'SHIBUYA SKY', tag: '澀谷 229m 露天展望台', areaKey: 'more', type: 'sight', icon: Camera, lat: 35.6585, lng: 139.7025 },
  { name: '歌舞伎座', tag: '銀座・歌舞伎劇場', areaKey: 'more', type: 'sight', icon: Drama, lat: 35.6697, lng: 139.7679 },
  { name: '三鷹之森吉卜力美術館', tag: '宮崎駿・需預約', areaKey: 'more', type: 'sight', icon: Palette, lat: 35.6962, lng: 139.5704, q: '三鷹の森ジブリ美術館' },
  { name: '東京哈利波特影城', tag: '豐島園・需預約', areaKey: 'more', type: 'sight', icon: Sparkles, lat: 35.7420, lng: 139.6497, q: 'ワーナー ブラザース スタジオツアー東京' },
  { name: '柴又帝釋天參道', tag: '昭和下町老街', areaKey: 'more', type: 'sight', icon: Landmark, lat: 35.7587, lng: 139.8777, q: '柴又帝釈天' },
  { name: '東京車站丸之內站舍', tag: '百年紅磚車站', areaKey: 'more', type: 'sight', icon: Landmark, lat: 35.6809, lng: 139.7649, q: '東京駅丸の内駅舎' },
  { name: '彩虹大橋', tag: '台場地標・可步行', areaKey: 'daiba', type: 'sight', icon: Camera, lat: 35.6365, lng: 139.7632, q: 'レインボーブリッジ' },
  { name: '築地場外市場', tag: '海鮮早餐・小吃', areaKey: 'more', type: 'food', icon: Fish, lat: 35.6654, lng: 139.7707 },
  { name: '豐洲市場', tag: '鮪魚拍賣見學', areaKey: 'daiba', type: 'food', icon: Fish, lat: 35.6455, lng: 139.7857, q: '豊洲市場' },
  { name: '麻布台之丘', tag: '新地標・teamLab Borderless', areaKey: 'more', type: 'shopping', icon: Building2, lat: 35.6604, lng: 139.7413, q: '麻布台ヒルズ' },
  { name: '都廳回憶鋼琴', tag: '免費展望台・街頭鋼琴', areaKey: 'shinjuku', type: 'sight', icon: Music, lat: 35.6896, lng: 139.6921, q: '東京都庁舎 展望室' },
  { name: '淺草時代屋', tag: '人力車・和服體驗', areaKey: 'more', type: 'sight', icon: Landmark, lat: 35.7115, lng: 139.7935, q: '浅草 時代屋' },
  { name: '交響樂號遊輪', tag: '東京灣晚餐郵輪・日之出埠頭', areaKey: 'more', type: 'sight', icon: Ship, lat: 35.6494, lng: 139.7608, q: 'シンフォニークルーズ 日の出埠頭' },
  { name: '淺草鷲神社', tag: '11 月酉之市', areaKey: 'more', type: 'sight', icon: Landmark, lat: 35.7222, lng: 139.7929, q: '浅草 鷲神社' },
  // 名店美食
  { name: '鰻 宮川', tag: '大塚・鰻魚飯老舖', areaKey: 'more', type: 'food', icon: Utensils, lat: 35.7318, lng: 139.7288, q: 'うなぎ 宮川 大塚' },
  { name: '壽司大', tag: '豐洲市場・排隊壽司', areaKey: 'daiba', type: 'food', icon: Utensils, lat: 35.6459, lng: 139.7867, q: '寿司大 豊洲' },
  { name: '天婦羅近藤', tag: '銀座・米其林天婦羅', areaKey: 'more', type: 'food', icon: Utensils, lat: 35.6699, lng: 139.7625, q: 'てんぷら近藤 銀座' },
  { name: '更科堀井', tag: '麻布十番・蕎麥麵老舖', areaKey: 'more', type: 'food', icon: Utensils, lat: 35.6559, lng: 139.7365, q: '更科堀井 麻布十番' },
  { name: '人形町今半 本店', tag: '壽喜燒百年老店', areaKey: 'more', type: 'food', icon: Utensils, lat: 35.6862, lng: 139.7824, q: '人形町今半 本店' },
  { name: '東京拉麵街', tag: '東京站一番街 B1', areaKey: 'more', type: 'food', icon: Utensils, lat: 35.6803, lng: 139.7687, q: '東京ラーメンストリート' },
  // 購物・伴手禮
  { name: '阿美橫丁', tag: '上野・平價商店街', areaKey: 'more', type: 'shopping', icon: ShoppingBag, lat: 35.7106, lng: 139.7745, q: 'アメ横' },
  { name: '竹下通', tag: '原宿・青少年潮流街', areaKey: 'more', type: 'shopping', icon: ShoppingBag, lat: 35.6716, lng: 139.7031, q: '竹下通り' },
  { name: '戶越銀座商店街', tag: '東京最長商店街', areaKey: 'more', type: 'shopping', icon: ShoppingBag, lat: 35.6160, lng: 139.7156, q: '戸越銀座商店街' },
  { name: '銀座三越', tag: '百貨・銀座地標', areaKey: 'more', type: 'shopping', icon: Building2, lat: 35.6717, lng: 139.7650 },
  { name: '表參道之丘', tag: '安藤忠雄設計・精品', areaKey: 'more', type: 'shopping', icon: Building2, lat: 35.6672, lng: 139.7086, q: '表参道ヒルズ' },
  { name: '東京站一番街', tag: '動漫街・伴手禮', areaKey: 'more', type: 'shopping', icon: Gift, lat: 35.6798, lng: 139.7694, q: '東京駅一番街' },
  { name: '伊勢丹新宿店', tag: '百貨・地下美食街', areaKey: 'shinjuku', type: 'shopping', icon: Building2, lat: 35.6917, lng: 139.7046, q: '伊勢丹新宿店' },
  // 近郊小旅行
  { name: '橫濱', tag: '一日遊・港未來 21', areaKey: 'daytrip', type: 'sight', icon: Camera, lat: 35.4548, lng: 139.6317, q: '横浜みなとみらい' },
  { name: '鎌倉', tag: '一日遊・大佛與古都', areaKey: 'daytrip', type: 'sight', icon: Landmark, lat: 35.3192, lng: 139.5497, q: '鎌倉駅' },
  { name: '河口湖', tag: '兩天一夜・富士山景', areaKey: 'daytrip', type: 'sight', icon: Mountain, lat: 35.5036, lng: 138.7644, q: '河口湖' },
  { name: '箱根', tag: '兩天一夜・溫泉', areaKey: 'daytrip', type: 'sight', icon: Mountain, lat: 35.2329, lng: 139.1058, q: '箱根湯本' },
  { name: '輕井澤', tag: '兩天一夜・避暑勝地', areaKey: 'daytrip', type: 'sight', icon: TreePine, lat: 36.3428, lng: 138.6353, q: '軽井沢駅' },
];

const POI_MARKER_PX = 32;
const FOOD_MARKER_PX = 25;
const STATION_MARKER_PX = 20;

const makeMarkerIcon = (color, IconComp, sizePx) =>
  L.divIcon({
    className: '',
    html: renderToStaticMarkup(
      <div style={{
        width: sizePx, height: sizePx, backgroundColor: color,
        borderRadius: '9999px', border: '2px solid #FFFFFF',
        boxShadow: '0 2px 8px rgba(28,31,38,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconComp size={Math.round(sizePx * 0.5)} color="#FFFFFF" />
      </div>
    ),
    iconSize: [sizePx, sizePx],
    iconAnchor: [sizePx / 2, sizePx / 2],
    popupAnchor: [0, -sizePx / 2 - 2],
  });

const STATION_ICON = L.divIcon({
  className: '',
  html: renderToStaticMarkup(
    <div style={{
      width: STATION_MARKER_PX, height: STATION_MARKER_PX, backgroundColor: '#FFFFFF',
      borderRadius: '9999px', border: '2px solid #78716C',
      boxShadow: '0 1px 4px rgba(28,31,38,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Train size={11} color="#57534E" />
    </div>
  ),
  iconSize: [STATION_MARKER_PX, STATION_MARKER_PX],
  iconAnchor: [STATION_MARKER_PX / 2, STATION_MARKER_PX / 2],
  popupAnchor: [0, -STATION_MARKER_PX / 2 - 2],
});

const FOOD_ICONS = Object.fromEntries(
  Object.values(AREAS).map((a) => [a.key, makeMarkerIcon(a.color, Utensils, FOOD_MARKER_PX)])
);

const regionColor = (areaKey) =>
  AREAS[areaKey]?.color ?? EXTRA_REGIONS[areaKey]?.color ?? AIRPORT_COLOR;

const ALL_MARKERS = [
  ...[...MAP_POIS, ...EXTRA_POIS].map((p) => ({
    ...p,
    href: placeSearchLink(p.q || p.name),
    markerIcon: makeMarkerIcon(regionColor(p.areaKey), p.icon, p.type === 'food' ? FOOD_MARKER_PX : POI_MARKER_PX),
  })),
  ...Object.values(AREAS).flatMap((a) =>
    a.food.filter((f) => f.lat != null).map((f) => ({
      name: f.name, tag: f.tag, rating: f.rating, areaKey: a.key, type: 'food',
      lat: f.lat, lng: f.lng, href: mapLink(f), markerIcon: FOOD_ICONS[a.key],
    }))
  ),
  ...MAP_STATIONS.map((s) => ({
    name: s.name, tag: s.line, areaKey: s.areaKey, type: 'transit',
    lat: s.lat, lng: s.lng, href: placeSearchLink(s.name), markerIcon: STATION_ICON,
  })),
];

const REGION_FILTERS = [
  { key: 'all', label: '全部區域' },
  ...Object.values(AREAS).map((a) => ({ key: a.key, label: a.short, color: a.color, dot: a.color })),
  ...Object.values(EXTRA_REGIONS).map((r) => ({ key: r.key, label: r.label, color: r.color, dot: r.color })),
];

const TYPE_FILTERS = [
  { key: 'all', label: '全部類型' },
  ...PLACE_TYPES,
];

/* ---------------------------------------------------------
   SUBCOMPONENTS
--------------------------------------------------------- */

function DayTab({ day, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-2xl px-3 py-3 text-left transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        active ? 'text-white shadow-lg' : 'bg-white text-stone-700 hover:shadow-md'
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
      className="flex gap-4"
      style={{
        opacity: 0,
        animation: visible ? `fadeUp 0.5s ease-out ${index * 60}ms both` : 'none',
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
        <h4 className={`mt-0.5 ${ev.type ? 'font-medium text-stone-600' : 'font-bold text-stone-800'}`}>
          {ev.maps ? (
            <a
              href={placeSearchLink(ev.maps)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 rounded"
            >
              <span className="underline decoration-dotted decoration-stone-300 underline-offset-4 group-hover:decoration-stone-500 transition-colors">{ev.title}</span>
              <MapPin size={13} className="text-stone-300 group-hover:text-stone-500 transition-colors flex-shrink-0" />
            </a>
          ) : ev.title}
        </h4>
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

const CARD_STAGGER_BASE_MS = 150;
const CARD_STAGGER_STEP_MS = 50;
const CARD_STAGGER_MAX_STEPS = 8;

const cardDelay = (i) => CARD_STAGGER_BASE_MS + Math.min(i, CARD_STAGGER_MAX_STEPS) * CARD_STAGGER_STEP_MS;

function PlaceCard({ place, delay }) {
  return (
    <a
      href={mapLink(place)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-3 p-3 rounded-xl bg-stone-50 hover:bg-stone-100 hover:shadow-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2"
      style={{ animation: `fadeUp 0.35s ease-out ${delay}ms both` }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-stone-800 text-sm">{place.name}</span>
          {place.rating && (
            <span className="text-xs text-amber-600 flex items-center gap-0.5 flex-shrink-0">
              <Star size={10} fill="currentColor" />{place.rating}
            </span>
          )}
        </div>
        <div className="text-xs text-stone-400 mt-0.5">{place.tag}</div>
        <div className="text-xs text-stone-500 mt-1">{place.note}</div>
      </div>
      <MapPin size={16} className="text-stone-300 mt-1 flex-shrink-0" />
    </a>
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
        <div className="sticky top-0 z-10 px-6 pt-6 pb-5 rounded-t-3xl" style={{ backgroundColor: area.color }}>
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
                <PlaceCard key={i} place={f} delay={cardDelay(i)} />
              ))}
            </div>
          </div>

          {area.shops && (
            <div className="mb-6">
              <h4 className="text-xs tracking-widest text-stone-400 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SHOP・逛街購物</h4>
              <div className="space-y-2.5">
                {area.shops.map((s, i) => (
                  <PlaceCard key={i} place={s} delay={cardDelay(i)} />
                ))}
              </div>
            </div>
          )}

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

function MarkerPopupContent({ title, subtitle, rating, href }) {
  return (
    <div style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif", minWidth: '150px' }}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-stone-800">{title}</span>
        {rating && (
          <span className="text-xs text-amber-600 flex items-center gap-0.5 flex-shrink-0">
            <Star size={10} fill="currentColor" />{rating}
          </span>
        )}
      </div>
      <div className="text-xs text-stone-500 mt-0.5">{subtitle}</div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium inline-block mt-1.5"
        style={{ color: '#1C7C8C' }}
      >
        在 Google Maps 開啟 ↗
      </a>
    </div>
  );
}

function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      {options.map((o) => {
        const isActive = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 ${
              isActive ? 'text-white' : 'bg-white text-stone-600 hover:bg-stone-50'
            }`}
            style={{ backgroundColor: isActive ? (o.color || '#1C1F26') : undefined }}
          >
            {o.icon && <o.icon size={12} />}
            {o.dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? '#FFFFFF' : o.dot }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function FitToMarkers({ markers, filterKey }) {
  const map = useMap();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!markers.length) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng])).pad(0.15);
    map.flyToBounds(bounds, { duration: 0.7, maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return null;
}

function MapView() {
  const [region, setRegion] = useState('all');
  const [placeType, setPlaceType] = useState('all');

  const bounds = useMemo(
    () => L.latLngBounds(
      ALL_MARKERS.filter((m) => m.areaKey !== 'daytrip').map((p) => [p.lat, p.lng])
    ).pad(0.06),
    []
  );

  const visibleMarkers = ALL_MARKERS.filter((m) =>
    (region === 'all' || m.areaKey === region) &&
    (placeType === 'all' || m.type === placeType)
  );

  return (
    <div className="px-5 pt-4 pb-24" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
      <div className="space-y-2 mb-3">
        <FilterChips options={REGION_FILTERS} value={region} onChange={setRegion} />
        <FilterChips options={TYPE_FILTERS} value={placeType} onChange={setPlaceType} />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-md relative isolate" style={{ height: '54vh', minHeight: '400px' }}>
        <MapContainer
          bounds={bounds}
          scrollWheelZoom
          zoomSnap={0.25}
          zoomDelta={0.5}
          wheelPxPerZoomLevel={120}
          bounceAtZoomLimits={false}
          style={{ width: '100%', height: '100%', backgroundColor: '#EDEDEB' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            updateWhenZooming={false}
            keepBuffer={8}
          />
          <FitToMarkers
            markers={region === 'all' ? visibleMarkers.filter((m) => m.areaKey !== 'daytrip') : visibleMarkers}
            filterKey={`${region}-${placeType}`}
          />
          {visibleMarkers.map((m) => (
            <Marker key={`${m.areaKey}-${m.name}`} position={[m.lat, m.lng]} icon={m.markerIcon}>
              <Popup>
                <MarkerPopupContent title={m.name} subtitle={m.tag} rating={m.rating} href={m.href} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="text-xs text-stone-400 mt-3">
        顯示 {visibleMarkers.length} 個地點・點標記看資訊，再點「在 Google Maps 開啟」導航・餐廳位置為約略標示
      </p>
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
  const [view, setView] = useState('timeline');
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
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-delay: 0.01ms !important; }
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
              <PlaneTakeoff size={12} /> CI220・松山→羽田・09:00
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-white/80 text-xs whitespace-nowrap flex-shrink-0">
              <PlaneLanding size={12} /> CI221・羽田→松山・14:30
            </div>
          </div>
        </div>

        {view === 'timeline' ? (
          <>
            {/* Day selector */}
            <div className="flex gap-2 px-5 -mt-3 pb-1 overflow-x-auto no-scrollbar">
              {DAYS.map((d) => (
                <DayTab key={d.id} day={d} active={selectedDay === d.id} onClick={() => handleDayChange(d.id)} />
              ))}
            </div>

            {/* Day title */}
            <div className="px-5 pt-5 pb-1">
              <h2 key={dayKey} className="text-lg font-bold text-stone-800" style={{ animation: 'fadeUp 0.4s ease-out both' }}>{day.title}</h2>
            </div>

            {/* Timeline */}
            <div className="px-5 pt-4" key={dayKey}>
              {day.events.map((ev, idx) => (
                <EventRow key={idx} ev={ev} isLast={idx === day.events.length - 1} onAreaClick={setActiveArea} index={idx} />
              ))}
            </div>

            {selectedDay === 5 ? (
              <div className="text-center pb-24 px-5 -mt-2">
                <p className="text-stone-400 text-sm">五天四夜東京行，一路平安 🎌</p>
              </div>
            ) : (
              <div className="pb-24" />
            )}
          </>
        ) : (
          <MapView />
        )}
      </div>

      {/* View toggle */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full p-1 shadow-xl"
        style={{ backgroundColor: '#1C1F26' }}
      >
        <button
          onClick={() => setView('timeline')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            view === 'timeline' ? 'bg-white text-stone-900' : 'text-white/70 hover:text-white'
          }`}
        >
          <List size={14} /> 行程
        </button>
        <button
          onClick={() => setView('map')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            view === 'map' ? 'bg-white text-stone-900' : 'text-white/70 hover:text-white'
          }`}
        >
          <MapIcon size={14} /> 地圖
        </button>
      </div>

      <AreaModal area={activeArea ? AREAS[activeArea] : null} onClose={() => setActiveArea(null)} />
    </div>
  );
}
