import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import './BuyerDashboard.css';
import './GlassDashboard.css';

/**
 * SolarSettle Buyer Dashboard
 * --------------------------------------------
 * Interactive marketplace + provider analytics.
 *
 * Mount:
 *   <div id="solarsettle-buyer-dashboard"></div>
 *
 * Then:
 *   <link rel="stylesheet" href="./solarsettle_buyer_dashboard.css">
 *   <script type="module" src="./solarsettle_buyer_dashboard.js"></script>
 *
 * IMPORTANT:
 * This demo layer is intentionally isolated from:
 * - wallet logic
 * - smart contracts
 * - settlement
 * - authentication
 * - existing API calls
 *
 * Replace the mock provider adapter with your existing backend
 * once the real provider API is available.
 */

const APP_ROOT_ID = "solarsettle-buyer-dashboard";

const PROVIDER_SEEDS = [
  { id:"provider-greenray", name:"GreenRay Solar", locality:"Sector Delta II, Greater Noida, Uttar Pradesh", city:"Greater Noida", stateName:"Uttar Pradesh", capacityKw:5.2, trustScore:94, price:4.20, reliability:96, verified:true, gridEligible:true, connectionAvailable:true, seed:1201, panelType:"Mono PERC 540W", inverter:"Sungrow 5 kW", meterStatus:"Smart meter verified", serviceSince:"2022", profile:"Residential rooftop prosumer with strong daytime surplus and consistent metering history." },
  { id:"provider-sungrid-delhi", name:"SunGrid Dwarka", locality:"Sector 12, Dwarka, New Delhi", city:"New Delhi", stateName:"Delhi", capacityKw:7.4, trustScore:96, price:4.38, reliability:98, verified:true, gridEligible:true, connectionAvailable:true, seed:2207, panelType:"TOPCon 575W", inverter:"SMA Sunny Boy", meterStatus:"AMI meter verified", serviceSince:"2021", profile:"High-efficiency rooftop system serving a mixed residential load with strong reliability." },
  { id:"provider-ecopower-bengaluru", name:"EcoPower Whitefield", locality:"Whitefield, Bengaluru, Karnataka", city:"Bengaluru", stateName:"Karnataka", capacityKw:10.0, trustScore:97, price:4.52, reliability:98, verified:true, gridEligible:true, connectionAvailable:false, seed:3311, panelType:"Mono crystalline 550W", inverter:"Fronius Primo", meterStatus:"Generation telemetry active", serviceSince:"2020", profile:"Large rooftop installation with detailed inverter telemetry and strong annual generation." },
  { id:"provider-suryalink-mumbai", name:"SuryaLink Andheri", locality:"Andheri East, Mumbai, Maharashtra", city:"Mumbai", stateName:"Maharashtra", capacityKw:6.0, trustScore:92, price:4.48, reliability:94, verified:true, gridEligible:true, connectionAvailable:true, seed:4417, panelType:"Mono PERC 535W", inverter:"Huawei SUN2000", meterStatus:"Smart meter verified", serviceSince:"2022", profile:"Urban rooftop prosumer optimized for Mumbai's variable cloud cover and peak daytime usage." },
  { id:"provider-rayvolt-hyderabad", name:"RayVolt Jubilee", locality:"Jubilee Hills, Hyderabad, Telangana", city:"Hyderabad", stateName:"Telangana", capacityKw:12.5, trustScore:95, price:4.16, reliability:97, verified:true, gridEligible:true, connectionAvailable:true, seed:5521, panelType:"TOPCon 580W", inverter:"GoodWe 12 kW", meterStatus:"AMI meter verified", serviceSince:"2019", profile:"High-capacity rooftop system with dependable surplus and established operating history." },
  { id:"provider-brightroof-pune", name:"BrightRoof Baner", locality:"Baner, Pune, Maharashtra", city:"Pune", stateName:"Maharashtra", capacityKw:8.2, trustScore:93, price:4.12, reliability:95, verified:true, gridEligible:true, connectionAvailable:true, seed:6637, panelType:"Mono PERC 545W", inverter:"Growatt MOD 8K", meterStatus:"Smart meter verified", serviceSince:"2021", profile:"Commercial-residential rooftop mix with predictable weekday generation." },
  { id:"provider-amber-jaipur", name:"Amber Solar Jaipur", locality:"Malviya Nagar, Jaipur, Rajasthan", city:"Jaipur", stateName:"Rajasthan", capacityKw:15.0, trustScore:98, price:3.92, reliability:99, verified:true, gridEligible:true, connectionAvailable:true, seed:7741, panelType:"Mono PERC 545W", inverter:"SMA Core1", meterStatus:"AMI meter verified", serviceSince:"2018", profile:"High-irradiance Rajasthan installation with one of the strongest availability profiles in the marketplace." },
  { id:"provider-solaris-ahmedabad", name:"Solaris Satellite", locality:"Satellite, Ahmedabad, Gujarat", city:"Ahmedabad", stateName:"Gujarat", capacityKw:11.4, trustScore:96, price:4.04, reliability:97, verified:true, gridEligible:true, connectionAvailable:true, seed:8857, panelType:"TOPCon 570W", inverter:"Sungrow SG10RT", meterStatus:"Generation telemetry active", serviceSince:"2020", profile:"Established rooftop system with strong generation consistency and verified monitoring." },
  { id:"provider-kaveri-chennai", name:"Kaveri Solar Adyar", locality:"Adyar, Chennai, Tamil Nadu", city:"Chennai", stateName:"Tamil Nadu", capacityKw:9.0, trustScore:91, price:4.26, reliability:93, verified:true, gridEligible:true, connectionAvailable:true, seed:9967, panelType:"Mono PERC 540W", inverter:"Fronius Symo", meterStatus:"Smart meter verified", serviceSince:"2021", profile:"Coastal rooftop installation with weather-aware production history and stable availability." },
  { id:"provider-ganga-kolkata", name:"Ganga Solar Salt Lake", locality:"Salt Lake, Kolkata, West Bengal", city:"Kolkata", stateName:"West Bengal", capacityKw:7.8, trustScore:90, price:4.08, reliability:92, verified:true, gridEligible:true, connectionAvailable:false, seed:11003, panelType:"Mono PERC 535W", inverter:"Solis 7.6K", meterStatus:"Meter verification complete", serviceSince:"2022", profile:"Compact urban rooftop system with a conservative availability schedule during monsoon periods." },
  { id:"provider-gomti-lucknow", name:"Gomti Green Energy", locality:"Gomti Nagar, Lucknow, Uttar Pradesh", city:"Lucknow", stateName:"Uttar Pradesh", capacityKw:6.8, trustScore:94, price:4.00, reliability:95, verified:true, gridEligible:true, connectionAvailable:true, seed:12011, panelType:"TOPCon 565W", inverter:"GoodWe 6.5 kW", meterStatus:"AMI meter verified", serviceSince:"2021", profile:"Well-maintained residential installation with balanced consumption and export patterns." },
  { id:"provider-ncr-gurugram", name:"NCR SunWorks", locality:"Golf Course Road, Gurugram, Haryana", city:"Gurugram", stateName:"Haryana", capacityKw:18.0, trustScore:97, price:4.34, reliability:98, verified:true, gridEligible:true, connectionAvailable:true, seed:13007, panelType:"TOPCon 580W", inverter:"Huawei SUN2000 17K", meterStatus:"AMI + inverter telemetry", serviceSince:"2018", profile:"Large commercial rooftop with high daytime production and mature monitoring infrastructure." },
  { id:"provider-riverfront-kochi", name:"Riverfront Solar Kochi", locality:"Kakkanad, Kochi, Kerala", city:"Kochi", stateName:"Kerala", capacityKw:5.8, trustScore:89, price:4.18, reliability:91, verified:true, gridEligible:true, connectionAvailable:true, seed:14009, panelType:"Mono PERC 530W", inverter:"Solis 5K", meterStatus:"Smart meter verified", serviceSince:"2023", profile:"Newer rooftop installation with high rainfall sensitivity and live generation monitoring." },
  { id:"provider-heritage-chandigarh", name:"Heritage Solar Chandigarh", locality:"Sector 17, Chandigarh", city:"Chandigarh", stateName:"Chandigarh", capacityKw:8.6, trustScore:93, price:4.10, reliability:95, verified:true, gridEligible:true, connectionAvailable:true, seed:15013, panelType:"Mono PERC 540W", inverter:"Sungrow 8 kW", meterStatus:"AMI meter verified", serviceSince:"2020", profile:"Established rooftop system with dependable winter generation and clean monitoring records." }
];

const state = {
  page: "overview",

  selectedProviderId: "provider-greenray",

  search: "",

  minTrust: 0,

  maxPrice: Infinity,

  minAvailable: 0,

  verifiedOnly: false,

  gridOnly: false,

  connectionOnly: false,

  sort: "recommended",

  chartRange: "30D",

  activeSeries: {
    generation: true,
    consumption: true,
    surplus: true
  },

  purchaseProviderId: null,

  purchaseAmount: 50,

  purchaseSupply: "next-day",

  purchaseSettlement: "wallet",

  buyerTransactions: [],

  connectionRequests: [],

  location: "Greater Noida, Uttar Pradesh",

  theme: "light",

  weather: {
    status: "loading",
    data: null,
    location: "Greater Noida, Uttar Pradesh"
  }
};

const MARKETPLACE_COORDINATES = {
  "Greater Noida, Uttar Pradesh": [28.4744, 77.5040],
  "New Delhi, Delhi": [28.6139, 77.2090],
  "Gurugram, Haryana": [28.4595, 77.0266],
  "Mumbai, Maharashtra": [19.0760, 72.8777],
  "Pune, Maharashtra": [18.5204, 73.8567],
  "Bengaluru, Karnataka": [12.9716, 77.5946],
  "Hyderabad, Telangana": [17.3850, 78.4867],
  "Chennai, Tamil Nadu": [13.0827, 80.2707],
  "Ahmedabad, Gujarat": [23.0225, 72.5714],
  "Jaipur, Rajasthan": [26.9124, 75.7873],
  "Kolkata, West Bengal": [22.5726, 88.3639],
  "Lucknow, Uttar Pradesh": [26.8467, 80.9462],
  "Kochi, Kerala": [9.9312, 76.2673],
  "Chandigarh": [30.7333, 76.7794]
};

const charts = new Map();

/* =========================================================
   UTILITIES
========================================================= */

function seededRandom(seed) {
  let t = seed >>> 0;

  return () => {
    t += 0x6D2B79F5;

    let r = Math.imul(
      t ^ (t >>> 15),
      1 | t
    );

    r ^= r + Math.imul(
      r ^ (r >>> 7),
      61 | r
    );

    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 1) {
  const power = 10 ** digits;

  return Math.round(value * power) / power;
}

function money(value) {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function kwh(value) {
  return `${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 1
  })} kWh`;
}

function dateLabel(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short"
  }).format(date);
}

function fullDateLabel(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function avg(values) {
  if (!values.length) return 0;

  return values.reduce(
    (sum, value) => sum + value,
    0
  ) / values.length;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   MOCK PROVIDER DATA
========================================================= */

function generateProvider(seedConfig) {

  const random = seededRandom(seedConfig.seed);

  const monthlySeason = [
    0.92,
    0.94,
    1.02,
    1.08,
    1.12,
    1.08,
    0.97,
    0.94,
    0.89,
    0.86,
    0.90,
    0.94
  ];

  const daily = [];

  const now = new Date();

  /*
   * Generate 365 days of deterministic data.
   *
   * Every provider has:
   *
   * generation
   * consumption
   * surplus
   * committed
   * available
   * price
   * weather/cloud cover
   */

  for (let i = 364; i >= 0; i--) {

    const date = new Date(now);

    date.setDate(
      now.getDate() - i
    );

    const monthFactor =
      monthlySeason[date.getMonth()];

    const weekendFactor =
      [0, 6].includes(date.getDay())
        ? 0.95
        : 1;

    const cloud =
      Math.round(random() * 80);

    const weatherFactor =
      1 - cloud / 220;

    const baseGeneration =
      seedConfig.capacityKw * 4;

    const generation =
      Math.max(
        0,

        baseGeneration *
          monthFactor *
          weekendFactor *
          weatherFactor *
          (0.88 + random() * 0.22)
      );

    const morning =
      2.2 + random() * 1.3;

    const evening =
      4.0 + random() * 2.0;

    const consumption =
      (
        morning +
        evening +
        seedConfig.capacityKw *
          (0.45 + random() * 0.22)
      ) *
      (0.92 + random() * 0.18);

    const surplus =
      Math.max(
        generation - consumption,
        0
      );

    const committed =
      surplus *
      (0.20 + random() * 0.25);

    const available =
      Math.max(
        surplus - committed,
        0
      );

    daily.push({

      date,

      generationKwh:
        round(generation, 2),

      consumptionKwh:
        round(consumption, 2),

      surplusKwh:
        round(surplus, 2),

      committedKwh:
        round(committed, 2),

      availableKwh:
        round(available, 2),

      price:
        round(
          seedConfig.price +
          (random() - 0.5) * 0.42,
          2
        ),

      cloudCover:
        cloud
    });
  }

  /*
   * 24 hour profile.
   */

  const hourly = [];

  for (let hour = 0; hour < 24; hour++) {

    const daylight =
      hour < 6 || hour > 18
        ? 0
        : Math.sin(
            ((hour - 6) / 12) *
            Math.PI
          );

    const weatherFactor =
      0.82 + random() * 0.18;

    const generation =
      Math.max(
        0,

        seedConfig.capacityKw *
          daylight *
          (0.72 + random() * 0.22) *
          weatherFactor
      );

    let consumption;

    if (hour >= 18 && hour <= 22) {

      consumption =
        seedConfig.capacityKw *
        (0.75 + random() * 0.45);

    } else if (hour >= 7 && hour <= 10) {

      consumption =
        seedConfig.capacityKw *
        (0.55 + random() * 0.28);

    } else {

      consumption =
        seedConfig.capacityKw *
        (0.32 + random() * 0.18);
    }

    const surplus =
      Math.max(
        generation - consumption,
        0
      );

    hourly.push({

      hour,

      generationKwh:
        round(generation, 2),

      consumptionKwh:
        round(consumption, 2),

      surplusKwh:
        round(surplus, 2)
    });
  }

  /*
   * Monthly analytics.
   */

  const months = [];

  for (
    let monthOffset = 11;
    monthOffset >= 0;
    monthOffset--
  ) {

    const monthDate =
      new Date(
        now.getFullYear(),
        now.getMonth() -
          monthOffset,
        1
      );

    const year =
      monthDate.getFullYear();

    const month =
      monthDate.getMonth();

    const records =
      daily.filter(
        item =>
          item.date.getFullYear() === year &&
          item.date.getMonth() === month
      );

    const generation =
      records.reduce(
        (sum, item) =>
          sum + item.generationKwh,
        0
      );

    const consumption =
      records.reduce(
        (sum, item) =>
          sum + item.consumptionKwh,
        0
      );

    const surplus =
      Math.max(
        generation - consumption,
        0
      );

    const sold =
      surplus * 0.60;

    months.push({

      date: monthDate,

      label:
        monthDate.toLocaleString(
          "en-IN",
          { month: "short" }
        ),

      generationKwh:
        round(generation, 1),

      consumptionKwh:
        round(consumption, 1),

      surplusKwh:
        round(surplus, 1),

      soldKwh:
        round(sold, 1),

      averagePrice:
        round(
          seedConfig.price +
          Math.sin(
            month +
            seedConfig.seed
          ) * 0.12,
          2
        )
    });
  }

  const latest =
    daily[daily.length - 1];

  const last30 =
    daily.slice(-30);

  const totalGeneration =
    daily.reduce(
      (sum, item) =>
        sum + item.generationKwh,
      0
    );

  const totalConsumption =
    daily.reduce(
      (sum, item) =>
        sum + item.consumptionKwh,
      0
    );

  const totalSurplus =
    Math.max(
      totalGeneration -
      totalConsumption,
      0
    );

  const currentAvailable =
    round(
      clamp(
        last30.reduce(
          (sum, item) =>
            sum + item.availableKwh,
          0
        ) / 30,

        30,

        seedConfig.capacityKw *
          55
      ),

      1
    );

  /*
   * Energy distribution is a real partition:
   *
   * self consumed
   * sold
   * available
   *
   * so donut chart does not double count.
   */

  const selfConsumed =
    totalGeneration * 0.62;

  const sold =
    totalGeneration * 0.20;

  const availableDistribution =
    Math.max(
      totalGeneration -
        selfConsumed -
        sold,

      totalGeneration * 0.01
    );

  const transactions = [

    {
      id:
        `${seedConfig.id}-tx-001`,

      date:
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 2
        ),

      energy: 40,

      amount:
        round(
          40 * seedConfig.price,
          2
        ),

      status: "Settled"
    },

    {
      id:
        `${seedConfig.id}-tx-002`,

      date:
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 8
        ),

      energy: 65,

      amount:
        round(
          65 *
          (seedConfig.price - 0.04),
          2
        ),

      status: "Completed"
    },

    {
      id:
        `${seedConfig.id}-tx-003`,

      date:
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 19
        ),

      energy: 35,

      amount:
        round(
          35 *
          (seedConfig.price + 0.06),
          2
        ),

      status: "Settled"
    }
  ];

  return {

    ...seedConfig,

    currentGenerationKwh:
      latest.generationKwh,

    currentConsumptionKwh:
      latest.consumptionKwh,

    currentSurplusKwh:
      latest.surplusKwh,

    availableEnergyKwh:
      currentAvailable,

    committedEnergyKwh:
      round(
        currentAvailable * 0.24,
        1
      ),

    totalGenerationKwh:
      round(totalGeneration, 1),

    totalConsumptionKwh:
      round(totalConsumption, 1),

    totalSurplusKwh:
      round(totalSurplus, 1),

    historicalData: {

      daily,

      hourly,

      monthly: months

    },

    energyDistribution: {

      selfConsumed:
        round(selfConsumed, 1),

      sold:
        round(sold, 1),

      available:
        round(
          availableDistribution,
          1
        )
    },

    transactions
  };
}

const PROVIDERS =
  PROVIDER_SEEDS.map(
    generateProvider
  );

/* =========================================================
   BUYER-SIDE STATE + REALISTIC ORDER MODEL
========================================================= */

const TRANSACTION_CONFIG = {
  serviceFeeRate: 0.015,
  referenceGridRate: 5.10,
  co2KgPerKwh: 0.775
};

function createBuyerTransactions() {
  const p = PROVIDER_SEEDS;
  return [
    { id:"SS-ORD-2026-0817-A1", providerId:p[0].id, date:new Date(Date.now()-3*86400000), energy:42, price:4.20, energyCost:176.40, serviceFee:2.65, networkCharge:0, total:179.05, status:"Settled", settlement:"Wallet", supply:"Completed" },
    { id:"SS-ORD-2026-0809-B4", providerId:p[5].id, date:new Date(Date.now()-11*86400000), energy:65, price:4.12, energyCost:267.80, serviceFee:4.02, networkCharge:0, total:271.82, status:"Completed", settlement:"Wallet", supply:"Completed" },
    { id:"SS-ORD-2026-0728-C9", providerId:p[7].id, date:new Date(Date.now()-23*86400000), energy:80, price:4.04, energyCost:323.20, serviceFee:4.85, networkCharge:0, total:328.05, status:"Settled", settlement:"Wallet", supply:"Completed" }
  ];
}

function buyerTransactions() {
  if (!state.buyerTransactions.length) state.buyerTransactions = createBuyerTransactions();
  return state.buyerTransactions;
}

function buyerProvider(tx) { return getProvider(tx.providerId); }
function buyerPurchasedKwh() { return buyerTransactions().reduce((s,t)=>s+Number(t.energy||0),0); }
function buyerSpend() { return buyerTransactions().reduce((s,t)=>s+Number(t.total||0),0); }
function buyerAveragePrice() { const q=buyerPurchasedKwh(); return q ? buyerSpend()/q : 0; }
function buyerSavings() { return buyerTransactions().reduce((s,t)=>s+Math.max(0,(TRANSACTION_CONFIG.referenceGridRate-t.price)*t.energy,0),0); }
function buyerCO2() { return buyerPurchasedKwh()*TRANSACTION_CONFIG.co2KgPerKwh; }

/* =========================================================
   PROVIDER HELPERS
========================================================= */

function getProvider(
  id = state.selectedProviderId
) {

  return (
    PROVIDERS.find(
      provider =>
        provider.id === id
    ) ||
    PROVIDERS[0]
  );
}

function filteredProviders() {

  const query =
    state.search
      .trim()
      .toLowerCase();

  let list =
    PROVIDERS.filter(provider => {

      if (
        query &&
        !`${provider.name} ${provider.locality}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }

      if (
        provider.trustScore <
        state.minTrust
      ) {
        return false;
      }

      if (
        provider.price >
        state.maxPrice
      ) {
        return false;
      }

      if (
        provider.availableEnergyKwh <
        state.minAvailable
      ) {
        return false;
      }

      if (
        state.verifiedOnly &&
        !provider.verified
      ) {
        return false;
      }

      if (
        state.gridOnly &&
        !provider.gridEligible
      ) {
        return false;
      }

      if (
        state.connectionOnly &&
        !provider.connectionAvailable
      ) {
        return false;
      }

      return true;
    });

  list = [...list];

  switch (state.sort) {

    case "price":

      list.sort(
        (a, b) =>
          a.price - b.price
      );

      break;

    case "availability":

      list.sort(
        (a, b) =>
          b.availableEnergyKwh -
          a.availableEnergyKwh
      );

      break;

    case "trust":

      list.sort(
        (a, b) =>
          b.trustScore -
          a.trustScore
      );

      break;

    case "reliability":

      list.sort(
        (a, b) =>
          b.reliability -
          a.reliability
      );

      break;

    default:
      break;
  }

  return list;
}

/* =========================================================
   CHART MANAGEMENT
========================================================= */

function destroyCharts() {

  for (
    const chart of charts.values()
  ) {

    try {
      chart.destroy();
    } catch {}
  }

  charts.clear();
}

function ensureChartJs() {

  if (window.Chart) {
    return Promise.resolve(
      window.Chart
    );
  }

  return new Promise(
    (resolve, reject) => {

      const existing =
        document.querySelector(
          'script[data-solarsettle-chartjs]'
        );

      if (existing) {

        existing.addEventListener(
          "load",
          () => resolve(
            window.Chart
          )
        );

        existing.addEventListener(
          "error",
          reject
        );

        return;
      }

      const script =
        document.createElement(
          "script"
        );

      script.src =
        "https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js";

      script.dataset.solarsettleChartjs =
        "true";

      script.onload =
        () => resolve(
          window.Chart
        );

      script.onerror =
        reject;

      document.head.appendChild(
        script
      );
    }
  );
}

/* =========================================================
   ICONS
========================================================= */

function icon(name) {

  const icons = {

    home: "⌂",

    market: "◫",

    connection: "⌁",

    energy: "◉",

    transaction: "↔",

    impact: "♧",

    settings: "⚙",

    search: "⌕",

    bell: '<svg class="ss-header-bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4"/></svg>',

    sun: '<svg class="ss-brand-sun" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="7"/><path d="M20 2v7M20 31v7M2 20h7M31 20h7M7.3 7.3l5 5M27.7 27.7l5 5M32.7 7.3l-5 5M12.3 27.7l-5 5"/></svg>',

    verified: "✓",

    location: "⌖",

    arrow: "→",

    bolt: "ϟ"
  };

  return icons[name] || "•";
}

/* =========================================================
   IMAGES
========================================================= */

function providerImage(provider) {
  const images = {
    "provider-greenray": "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=82",
    "provider-sungrid-delhi": "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=900&q=82",
    "provider-ecopower-bengaluru": "/provider-images/ecopower-whitefield.jpeg",
    "provider-suryalink-mumbai": "/provider-images/floating-solar.jpeg",
    "provider-rayvolt-hyderabad": "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=900&q=82",
    "provider-brightroof-pune": "/provider-images/solar-field.webp",
    "provider-amber-jaipur": "/provider-images/desert-solar.webp",
    "provider-solaris-ahmedabad": "/provider-images/sunset-solar.jpg",
    "provider-kaveri-chennai": "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=901&q=82",
    "provider-ganga-kolkata": "/provider-images/ganga-solar-salt-lake.webp",
    "provider-gomti-lucknow": "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=901&q=82",
    "provider-ncr-gurugram": "/provider-images/sunset-solar.jpg",
    "provider-riverfront-kochi": "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=900&q=82",
    "provider-heritage-chandigarh": "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=902&q=82"
  };
  return images[provider.id] || images["provider-greenray"];
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

function weatherDescription(code) {
  const descriptions = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
    55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers",
    81: "Rain showers", 82: "Heavy showers", 95: "Thunderstorm"
  };
  return descriptions[code] || "Current conditions";
}

function solarOutlook(cloudCover) {
  if (cloudCover <= 25) return "Excellent";
  if (cloudCover <= 55) return "Good";
  if (cloudCover <= 75) return "Moderate";
  return "Limited";
}

function formatWeatherTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(value));
}

async function loadWeather(location) {
  const coordinates = MARKETPLACE_COORDINATES[location];
  if (!coordinates) return;

  state.weather = { status: "loading", data: null, location };
  if (state.page === "overview") render();

  const [latitude, longitude] = coordinates;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude, longitude,
    current: "temperature_2m,cloud_cover,weather_code",
    daily: "sunrise,sunset",
    timezone: "auto",
    forecast_days: "1"
  });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather service unavailable");
    const forecast = await response.json();
    if (!forecast.current || !forecast.daily) throw new Error("Incomplete weather data");
    if (state.location !== location) return;

    state.weather = {
      status: "ready",
      location,
      data: {
        temperature: Math.round(forecast.current.temperature_2m),
        cloudCover: forecast.current.cloud_cover,
        description: weatherDescription(forecast.current.weather_code),
        sunrise: forecast.daily.sunrise?.[0],
        sunset: forecast.daily.sunset?.[0]
      }
    };
  } catch (error) {
    if (state.location !== location) return;
    state.weather = { status: "error", data: null, location };
  }

  if (state.page === "overview") render();
}

function weatherCard() {
  const { status, data, location } = state.weather;
  const city = location.split(",")[0];
  const loading = status === "loading";
  const unavailable = status === "error" || !data;
  const outlook = unavailable ? "—" : solarOutlook(data.cloudCover);

  return `
    <div class="ss-card ss-weather-card">
      <div class="ss-card-head">
        <div>
          <span class="ss-label">Weather & Solar Conditions</span>
          <h2>${loading ? "Loading local forecast…" : unavailable ? "Forecast unavailable" : `${outlook} conditions for solar`}</h2>
        </div>
        <button class="ss-small-button" data-action="toggle-theme">☼ / ☾</button>
      </div>
      <div class="ss-weather-main">
        <div class="ss-weather-temp">${unavailable ? "—" : `${data.temperature}°`}</div>
        <div>
          <strong>${loading ? "Fetching live weather" : unavailable ? "Try again shortly" : data.description}</strong>
          <span>${escapeHtml(city)} · Today</span>
        </div>
      </div>
      <div class="ss-weather-stats">
        <div><span>Cloud cover</span><strong>${unavailable ? "—" : `${data.cloudCover}%`}</strong></div>
        <div><span>Sunrise</span><strong>${unavailable ? "—" : formatWeatherTime(data.sunrise)}</strong></div>
        <div><span>Sunset</span><strong>${unavailable ? "—" : formatWeatherTime(data.sunset)}</strong></div>
        <div><span>Solar outlook</span><strong class="${outlook === "Excellent" || outlook === "Good" ? "ss-positive" : ""}">${outlook}</strong></div>
      </div>
    </div>
  `;
}

/* =========================================================
   COMMON UI
========================================================= */

function statusBadge(
  text,
  type = "success"
) {

  return `
    <span class="ss-badge ${type}">
      <span class="ss-status-dot"></span>
      ${escapeHtml(text)}
    </span>
  `;
}

function metricCard(
  label,
  value,
  sub = "",
  trend = ""
) {

  return `
    <div class="ss-card ss-metric-card">

      <span class="ss-label">
        ${escapeHtml(label)}
      </span>

      <strong>
        ${value}
      </strong>

      ${
        sub
          ? `<span class="ss-muted">
               ${escapeHtml(sub)}
             </span>`
          : ""
      }

      ${
        trend
          ? `<span class="ss-trend">
               ${escapeHtml(trend)}
             </span>`
          : ""
      }

    </div>
  `;
}

/* =========================================================
   APP SHELL
========================================================= */

function appShell(content) {

  return `
    <div class="ss-app">

      <aside class="ss-sidebar">

        <div class="ss-brand">

          <div class="ss-brand-mark">
            ${icon("sun")}
          </div>

          <div>
            <strong>
              SolarSettle
            </strong>

            <span>
              Clean energy. Trusted together.
            </span>
          </div>

        </div>

        <nav class="ss-nav">

          ${navItem(
            "overview",
            "home",
            "Overview"
          )}

          ${navItem(
            "marketplace",
            "market",
            "Marketplace"
          )}

          ${navItem(
            "connections",
            "connection",
            "Connections"
          )}

          ${navItem(
            "energy",
            "energy",
            "My Energy"
          )}

          ${navItem(
            "transactions",
            "transaction",
            "Transactions"
          )}

          ${navItem(
            "impact",
            "impact",
            "Impact"
          )}

          ${navItem(
            "settings",
            "settings",
            "Settings"
          )}

        </nav>

        <div class="ss-sidebar-help">

          <span>
            Need help?
          </span>

          <button
            data-action="support"
          >
            Support Center
          </button>

        </div>

        <button
          class="ss-logout"
          data-action="logout"
        >
          ↪ Log Out
        </button>

      </aside>

      <main class="ss-main">

        <header class="ss-header">

          <div
            class="ss-mobile-menu"
            data-action="mobile-menu"
          >
            ☰
          </div>

          <div class="ss-search">

            <span>
              ${icon("search")}
            </span>

            <input
              id="ss-global-search"
              value="${escapeHtml(state.search)}"
              placeholder="Search providers, locations..."
              data-action="search"
            />

          </div>

          <div class="ss-header-actions">

            <button
              class="ss-icon-button"
              data-action="notification"
            >
              ${icon("bell")}
            </button>

            <button
              class="ss-avatar"
              data-action="profile"
            >
              SS
            </button>

          </div>

        </header>

        <div class="ss-content">

          ${content}

        </div>

      </main>

    </div>
  `;
}

function navItem(
  page,
  iconName,
  label
) {

  return `
    <button
      class="ss-nav-item ${
        state.page === page
          ? "active"
          : ""
      }"
      data-page="${page}"
    >

      <span class="ss-nav-icon">
        ${icon(iconName)}
      </span>

      <span>
        ${label}
      </span>

    </button>
  `;
}

/* =========================================================
   OVERVIEW
========================================================= */

function overviewPage() {

  const available =
    PROVIDERS.reduce(
      (sum, provider) =>
        sum +
        provider.availableEnergyKwh,
      0
    );

  const purchased = buyerPurchasedKwh();

  const co2 =
    round(
      purchased * 0.775,
      0
    );

  const savings =
    round(
      buyerSavings(),
      0
    );

  const recommended =
    [...PROVIDERS]
      .sort(
        (a, b) =>
          (
            b.trustScore +
            b.reliability
          ) -
          (
            a.trustScore +
            a.reliability
          )
      )
      .slice(0, 3);

  return `

    <section class="ss-page-head">

      <div>

        <div class="ss-eyebrow">
          BUYER DASHBOARD
        </div>

        <h1>
          ${timeGreeting()}
        </h1>

        <p>
          Find clean, affordable solar energy
          from verified prosumers.
        </p>

      </div>

      <div class="ss-location-pill">

        ${icon("location")}

        ${escapeHtml(state.location)}

        <button
          data-action="change-location"
        >
          Change
        </button>

      </div>

    </section>

    <section class="ss-action-grid">

      <button
        class="ss-action-card primary-action"
        data-page="marketplace"
      >

        <span
          class="ss-action-icon blue"
        >
          ${icon("bolt")}
        </span>

        <span>

          <strong>
            Buy Solar Energy
          </strong>

          <small>
            Purchase verified surplus solar energy.
          </small>

        </span>

        <span class="ss-arrow">
          ${icon("arrow")}
        </span>

      </button>

      <button
        class="ss-action-card"
        data-page="connections"
      >

        <span
          class="ss-action-icon green"
        >
          ⌁
        </span>

        <span>

          <strong>
            Find a Prosumer
          </strong>

          <small>
            Explore solar connection opportunities.
          </small>

        </span>

        <span class="ss-arrow">
          ${icon("arrow")}
        </span>

      </button>

    </section>

    <section class="ss-metrics-grid">

      ${metricCard(
        "Available Solar",
        kwh(available),
        "Across eligible providers",
        "↑ 12% vs last week"
      )}

      ${metricCard(
        "Purchased Energy",
        `${round(purchased, 1)} kWh`,
        "Recorded purchases",
        "Buyer transaction history"
      )}

      ${metricCard(
        "CO₂ Avoided",
        `${co2} kg`,
        "Estimated impact",
        "↑ 12 trees equivalent"
      )}

      ${metricCard(
        "Estimated Savings",
        money(savings),
        "This month",
        "↑ 10% lower cost"
      )}

    </section>

    <section class="ss-grid-two">

      ${weatherCard()}

      <div class="ss-card">

        <div class="ss-card-head">

          <div>

            <span class="ss-label">
              Marketplace Snapshot
            </span>

            <h2>
              Energy available now
            </h2>

          </div>

          <button
            class="ss-link-button"
            data-page="marketplace"
          >
            View marketplace →
          </button>

        </div>

        <div class="ss-snapshot-list">

          ${recommended
            .map(provider => `

              <button
                class="ss-mini-provider"
                data-provider="${provider.id}"
              >

                <img
                  src="${providerImage(provider)}"
                  alt=""
                />

                <span
                  class="ss-mini-provider-info"
                >

                  <strong>
                    ${escapeHtml(provider.name)}
                  </strong>

                  <small>
                    ${escapeHtml(provider.locality)}
                  </small>

                </span>

                <span>

                  <strong>
                    ${kwh(
                      provider.availableEnergyKwh
                    )}
                  </strong>

                  <small>
                    ${money(provider.price)}/kWh
                  </small>

                </span>

                <span class="ss-trust">
                  ${provider.trustScore}
                </span>

              </button>

            `)
            .join("")}

        </div>

      </div>

    </section>

    <section class="ss-card">

      <div class="ss-card-head">

        <div>

          <span class="ss-label">
            Recommended Providers
          </span>

          <h2>
            Best current matches
          </h2>

        </div>

        <button
          class="ss-link-button"
          data-page="marketplace"
        >
          Explore all →
        </button>

      </div>

      <div class="ss-provider-grid">

        ${recommended
          .map(providerCard)
          .join("")}

      </div>

    </section>

  `;
}

/* =========================================================
   PROVIDER CARD
========================================================= */

function providerCard(provider) {

  return `

    <article class="ss-provider-card">

      <img
        class="ss-provider-image"
        src="${providerImage(provider)}"
        alt=""
      />

      <div class="ss-provider-card-body">

        <div class="ss-provider-title-row">

          <div>

            <h3>
              ${escapeHtml(provider.name)}
            </h3>

            <p>
              ${escapeHtml(provider.locality)}
            </p>

            <p class="ss-provider-profile">${escapeHtml(provider.profile)}</p>

          </div>

          ${statusBadge(
            "Verified"
          )}

        </div>

        <div class="ss-badge-row">

          ${
            provider.gridEligible
              ? statusBadge(
                  "Grid eligible"
                )
              : ""
          }

          ${
            provider.connectionAvailable
              ? statusBadge(
                  "Connection",
                  "info"
                )
              : ""
          }

          ${
            provider.availableEnergyKwh > 0
              ? statusBadge(
                  "Surplus available"
                )
              : statusBadge(
                  "Unavailable",
                  "warning"
                )
          }

        </div>

        <div class="ss-provider-values">

          <div>

            <strong>
              ${kwh(
                provider.availableEnergyKwh
              )}
            </strong>

            <span>
              Available
            </span>

          </div>

          <div>

            <strong>
              ${money(provider.price)}
            </strong>

            <span>
              Price / kWh
            </span>

          </div>

          <div>

            <strong>
              ${provider.trustScore}/100
            </strong>

            <span>
              Trust
            </span>

          </div>

        </div>

        <div class="ss-provider-actions">

          <button
            class="ss-button secondary"
            data-provider="${provider.id}"
          >
            View Provider
          </button>

          <button
            class="ss-button primary"
            data-buy="${provider.id}"
          >
            Buy Energy
          </button>

        </div>

      </div>

    </article>

  `;
}

/* =========================================================
   MARKETPLACE
========================================================= */

function marketplacePage() {

  const list =
    filteredProviders();

  const totalAvailable =
    list.reduce(
      (sum, provider) =>
        sum +
        provider.availableEnergyKwh,
      0
    );

  return `

    <section class="ss-page-head">

      <div>

        <div class="ss-eyebrow">
          ENERGY MARKETPLACE
        </div>

        <h1>
          Buy Solar Energy
        </h1>

        <p>
          Compare verified surplus from
          eligible nearby prosumers.
        </p>

      </div>

      <div class="ss-market-summary">

        <strong>
          ${kwh(totalAvailable)}
        </strong>

        <span>
          available in current results
        </span>

      </div>

    </section>

    <section class="ss-card ss-filters">

      <div class="ss-filter-search">

        ${icon("search")}

        <input
          value="${escapeHtml(state.search)}"
          placeholder="Search provider or locality..."
          data-action="market-search"
        />

      </div>

      <select data-filter="sort">

        <option
          value="recommended"
          ${state.sort === "recommended" ? "selected" : ""}
        >
          Recommended
        </option>

        <option
          value="price"
          ${state.sort === "price" ? "selected" : ""}
        >
          Lowest Price
        </option>

        <option
          value="availability"
          ${state.sort === "availability" ? "selected" : ""}
        >
          Highest Availability
        </option>

        <option
          value="trust"
          ${state.sort === "trust" ? "selected" : ""}
        >
          Highest Trust
        </option>

        <option
          value="reliability"
          ${state.sort === "reliability" ? "selected" : ""}
        >
          Most Reliable
        </option>

      </select>

      <select data-filter="trust">

        <option value="0">
          Any Trust
        </option>

        <option
          value="90"
          ${state.minTrust === 90 ? "selected" : ""}
        >
          90+
        </option>

        <option
          value="95"
          ${state.minTrust === 95 ? "selected" : ""}
        >
          95+
        </option>

      </select>

      <select data-filter="price">

        <option value="Infinity">
          Any Price
        </option>

        <option
          value="4"
          ${state.maxPrice === 4 ? "selected" : ""}
        >
          Under ₹4.00
        </option>

        <option
          value="4.25"
          ${state.maxPrice === 4.25 ? "selected" : ""}
        >
          Under ₹4.25
        </option>

        <option
          value="4.5"
          ${state.maxPrice === 4.5 ? "selected" : ""}
        >
          Under ₹4.50
        </option>

      </select>

      <label class="ss-check">

        <input
          type="checkbox"
          data-filter="verified"
          ${state.verifiedOnly ? "checked" : ""}
        />

        Verified

      </label>

      <label class="ss-check">

        <input
          type="checkbox"
          data-filter="grid"
          ${state.gridOnly ? "checked" : ""}
        />

        Grid eligible

      </label>

      <label class="ss-check">

        <input
          type="checkbox"
          data-filter="connection"
          ${state.connectionOnly ? "checked" : ""}
        />

        Connection

      </label>

    </section>

    <div class="ss-results-row">

      <span>
        ${list.length}
        provider${list.length === 1 ? "" : "s"}
        found
      </span>

      <button
        class="ss-link-button"
        data-action="reset-filters"
      >
        Reset filters
      </button>

    </div>

    <section class="ss-provider-grid marketplace-grid">

      ${
        list.length

          ? list
              .map(providerCard)
              .join("")

          : `

            <div class="ss-card ss-empty-state">

              <div class="ss-empty-icon">
                ⌕
              </div>

              <h2>
                No providers found
              </h2>

              <p>
                Try changing your search
                area or filters.
              </p>

              <button
                class="ss-button primary"
                data-action="reset-filters"
              >
                Reset Filters
              </button>

            </div>
          `
      }

    </section>

  `;
}

/* =========================================================
   PROVIDER DETAIL
========================================================= */

function providerDetailPage() {

  const provider =
    getProvider();

  return `

    <section class="ss-provider-detail-head">

      <button
        class="ss-back"
        data-page="marketplace"
      >
        ← Marketplace
      </button>

      <div class="ss-provider-hero">

        <img
          src="${providerImage(provider)}"
          alt=""
        />

        <div>

          <div class="ss-provider-hero-title">

            <h1>
              ${escapeHtml(provider.name)}
            </h1>

            ${statusBadge(
              "Verified"
            )}

          </div>

          <p>
            ${icon("location")}
            ${escapeHtml(provider.locality)}
          </p>

          <div class="ss-badge-row">

            ${
              provider.gridEligible
                ? statusBadge(
                    "Grid eligible"
                  )
                : ""
            }

            ${
              provider.connectionAvailable
                ? statusBadge(
                    "Connection available",
                    "info"
                  )
                : ""
            }

          </div>

        </div>

        <div class="ss-provider-hero-actions">

          <button
            class="ss-button secondary"
            data-provider-connection="${provider.id}"
          >
            Request Connection
          </button>

          <button
            class="ss-button primary"
            data-buy="${provider.id}"
          >
            Buy Energy
          </button>

        </div>

      </div>

    </section>

    <section class="ss-provider-switcher">

      <label>
        Viewing provider
      </label>

      <select data-provider-select>

        ${PROVIDERS
          .map(providerItem => `

            <option
              value="${providerItem.id}"
              ${
                providerItem.id ===
                provider.id
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(
                providerItem.name
              )}
            </option>

          `)
          .join("")}

      </select>

    </section>

    <section class="ss-metrics-grid ss-provider-metrics">

      ${metricCard(
        "Total Generation",
        kwh(provider.totalGenerationKwh),
        "Last 12 months"
      )}

      ${metricCard(
        "Available Surplus",
        kwh(provider.availableEnergyKwh),
        "Available now"
      )}

      ${metricCard(
        "Solar Capacity",
        `${provider.capacityKw} kW`,
        "Installed capacity"
      )}

      ${metricCard(
        "Trust Score",
        `${provider.trustScore}/100`,
        "Verified provider"
      )}

      ${metricCard(
        "Reliability",
        `${provider.reliability}%`,
        "Last 90 days"
      )}

    </section>

    <section class="ss-analytics-layout">

      <div class="ss-card ss-chart-large">

        <div class="ss-card-head">

          <div>

            <span class="ss-label">
              Energy Production
            </span>

            <h2>
              Generation vs Consumption
            </h2>

            <span class="ss-muted">
              Hover points for exact
              provider data
            </span>

          </div>

          <select
            class="ss-chart-range"
            data-chart-range
          >

            ${
              [
                "24H",
                "7D",
                "30D",
                "3M",
                "6M",
                "1Y"
              ]
                .map(
                  range => `
                    <option
                      ${
                        state.chartRange ===
                        range
                          ? "selected"
                          : ""
                      }
                    >
                      ${range}
                    </option>
                  `
                )
                .join("")
            }

          </select>

        </div>

        <div class="ss-chart-legend">

          ${legendButton(
            "generation",
            "Generation",
            "blue"
          )}

          ${legendButton(
            "consumption",
            "Consumption",
            "orange"
          )}

          ${legendButton(
            "surplus",
            "Surplus",
            "green"
          )}

        </div>

        <div
          class="ss-chart-container large"
        >

          <canvas
            id="ss-generation-chart"
          ></canvas>

        </div>

      </div>

      <div class="ss-card">

        <div class="ss-card-head">

          <div>

            <span class="ss-label">
              Energy Distribution
            </span>

            <h2>
              Current allocation
            </h2>

          </div>

        </div>

        <div
          class="ss-chart-container donut"
        >

          <canvas
            id="ss-distribution-chart"
          ></canvas>

        </div>

        <div
          class="ss-distribution-summary"
        >

          <div>

            <span>
              <i class="dot blue"></i>
              Self consumed
            </span>

            <strong>
              ${kwh(
                provider.energyDistribution
                  .selfConsumed
              )}
            </strong>

          </div>

          <div>

            <span>
              <i class="dot purple"></i>
              Sold
            </span>

            <strong>
              ${kwh(
                provider.energyDistribution
                  .sold
              )}
            </strong>

          </div>

          <div>

            <span>
              <i class="dot green"></i>
              Available
            </span>

            <strong>
              ${kwh(
                provider.energyDistribution
                  .available
              )}
            </strong>

          </div>

        </div>

      </div>

    </section>

    <section class="ss-analytics-grid">

      <div class="ss-card">

        <div class="ss-card-head">

          <div>

            <span class="ss-label">
              Today's Profile
            </span>

            <h2>
              Hourly Generation
            </h2>

          </div>

        </div>

        <div
          class="ss-chart-container medium"
        >

          <canvas
            id="ss-hourly-chart"
          ></canvas>

        </div>

      </div>

      <div class="ss-card">

        <div class="ss-card-head">

          <div>

            <span class="ss-label">
              Performance
            </span>

            <h2>
              Monthly Energy
            </h2>

          </div>

        </div>

        <div
          class="ss-chart-container medium"
        >

          <canvas
            id="ss-monthly-chart"
          ></canvas>

        </div>

      </div>

    </section>

    <section class="ss-analytics-grid">

      <div class="ss-card">

        <div class="ss-card-head">

          <div>

            <span class="ss-label">
              Market Analytics
            </span>

            <h2>
              Energy Price History
            </h2>

          </div>

        </div>

        <div class="ss-price-summary">

          <div>
            <span>Current</span>
            <strong>
              ${money(provider.price)}/kWh
            </strong>
          </div>

          <div>
            <span>30-day avg</span>
            <strong>
              ${money(
                avg(
                  provider
                    .historicalData
                    .daily
                    .slice(-30)
                    .map(
                      item =>
                        item.price
                    )
                )
              )}
            </strong>
          </div>

          <div>
            <span>Lowest</span>
            <strong>
              ${money(
                Math.min(
                  ...provider
                    .historicalData
                    .daily
                    .slice(-30)
                    .map(
                      item =>
                        item.price
                    )
                )
              )}
            </strong>
          </div>

          <div>
            <span>Highest</span>
            <strong>
              ${money(
                Math.max(
                  ...provider
                    .historicalData
                    .daily
                    .slice(-30)
                    .map(
                      item =>
                        item.price
                    )
                )
              )}
            </strong>
          </div>

        </div>

        <div
          class="ss-chart-container small"
        >

          <canvas
            id="ss-price-chart"
          ></canvas>

        </div>

      </div>

      <div class="ss-card">

        <div class="ss-card-head">

          <div>

            <span class="ss-label">
              Trust & Verification
            </span>

            <h2>
              ${provider.trustScore}/100
            </h2>

          </div>

          ${statusBadge(
            "Trusted"
          )}

        </div>

        <div class="ss-trust-score">

          <div
            class="ss-score-ring"
            style="
              --score:
                ${provider.trustScore * 3.6}deg
            "
          >

            <strong>
              ${provider.trustScore}
            </strong>

            <span>
              /100
            </span>

          </div>

          <div class="ss-trust-bars">

            ${trustBar(
              "Verification",
              100
            )}

            ${trustBar(
              "Reliability",
              provider.reliability
            )}

            ${trustBar(
              "Transaction history",
              clamp(
                provider.trustScore - 1,
                0,
                100
              )
            )}

            ${trustBar(
              "Availability",
              clamp(
                provider.trustScore - 3,
                0,
                100
              )
            )}

          </div>

        </div>

      </div>

    </section>

    <section class="ss-grid-two">

      <div class="ss-card">

        <div class="ss-card-head">

          <div>

            <span class="ss-label">
              Provider Information
            </span>

            <h2>
              About this prosumer
            </h2>

          </div>

        </div>

        <div class="ss-info-grid">

          <div>
            <span>Name</span>
            <strong>
              ${escapeHtml(
                provider.name
              )}
            </strong>
          </div>

          <div>
            <span>Area</span>
            <strong>
              ${escapeHtml(
                provider.locality
              )}
            </strong>
          </div>

          <div>
            <span>Solar capacity</span>
            <strong>
              ${provider.capacityKw} kW
            </strong>
          </div>

          <div>
            <span>Reliability</span>
            <strong>
              ${provider.reliability}%
            </strong>
          </div>

          <div>
            <span>Grid eligibility</span>
            <strong>
              ${
                provider.gridEligible
                  ? "Eligible"
                  : "Not eligible"
              }
            </strong>
          </div>

          <div>
            <span>Connection</span>
            <strong>
              ${
                provider.connectionAvailable
                  ? "Available"
                  : "Unavailable"
              }
            </strong>
          </div>

          <div><span>Panel technology</span><strong>${escapeHtml(provider.panelType)}</strong></div>
          <div><span>Inverter</span><strong>${escapeHtml(provider.inverter)}</strong></div>
          <div><span>Meter status</span><strong>${escapeHtml(provider.meterStatus)}</strong></div>
          <div><span>Active since</span><strong>${escapeHtml(provider.serviceSince)}</strong></div>
          <div class="ss-info-wide"><span>Provider profile</span><strong>${escapeHtml(provider.profile)}</strong></div>

        </div>

      </div>

      <div class="ss-card">

        <div class="ss-card-head">

          <div>

            <span class="ss-label">
              Performance Insight
            </span>

            <h2>
              What the data says
            </h2>

          </div>

        </div>

        ${providerInsight(
          provider
        )}

      </div>

    </section>

    <section class="ss-card">

      <div class="ss-card-head">

        <div>

          <span class="ss-label">
            Recent Activity
          </span>

          <h2>
            Energy transactions
          </h2>

        </div>

        <button
          class="ss-link-button"
          data-page="transactions"
        >
          View all →
        </button>

      </div>

      ${transactionTable(
        provider.transactions
      )}

    </section>

  `;
}

function legendButton(
  key,
  label,
  color
) {

  return `

    <button
      class="
        ss-legend-button
        ${
          state.activeSeries[key]
            ? "active"
            : "muted"
        }
      "
      data-series="${key}"
    >

      <span
        class="legend-dot ${color}"
      ></span>

      ${label}

    </button>
  `;
}

function trustBar(
  label,
  value
) {

  return `

    <div class="ss-trust-row">

      <div>

        <span>
          ${escapeHtml(label)}
        </span>

        <strong>
          ${value}%
        </strong>

      </div>

      <div class="ss-progress">

        <span
          style="width:${value}%"
        ></span>

      </div>

    </div>
  `;
}

function providerInsight(provider) {

  const data =
    provider
      .historicalData
      .daily;

  const recent =
    data.slice(-30);

  const previous =
    data.slice(-60, -30);

  const recentGeneration =
    recent.reduce(
      (sum, item) =>
        sum +
        item.generationKwh,
      0
    );

  const previousGeneration =
    previous.reduce(
      (sum, item) =>
        sum +
        item.generationKwh,
      0
    );

  const change =
    previousGeneration
      ? (
          (
            recentGeneration -
            previousGeneration
          ) /
          previousGeneration
        ) *
        100
      : 0;

  const peak =
    provider
      .historicalData
      .hourly
      .reduce(
        (best, item) =>
          item.generationKwh >
          best.generationKwh
            ? item
            : best,

        provider
          .historicalData
          .hourly[0]
      );

  return `

    <div class="ss-insight">

      <div class="ss-insight-icon">
        ☀
      </div>

      <div>

        <strong>
          ${
            change >= 0
              ? "Generation is improving"
              : "Generation has softened"
          }
        </strong>

        <p>
          Generation is
          ${Math.abs(
            round(change, 1)
          )}%
          ${
            change >= 0
              ? "higher"
              : "lower"
          }
          over the last 30 days
          compared with the previous period.
        </p>

        <p>
          Peak hourly production is around
          <strong>
            ${String(
              peak.hour
            ).padStart(2, "0")}:00
          </strong>.
        </p>

      </div>

    </div>
  `;
}

/* =========================================================
   TRANSACTIONS
========================================================= */

function transactionTable(
  transactions
) {

  return `

    <div class="ss-table-wrap">

      <table class="ss-table">

        <thead>

          <tr>

            <th>
              Date
            </th>

            <th>
              Energy
            </th>

            <th>
              Price
            </th>

            <th>
              Amount
            </th>

            <th>
              Status
            </th>

            <th>
              Transaction
            </th>

          </tr>

        </thead>

        <tbody>

          ${transactions
            .map(
              transaction => `

                <tr>

                  <td>
                    ${fullDateLabel(
                      transaction.date
                    )}
                  </td>

                  <td>
                    ${transaction.energy}
                    kWh
                  </td>

                  <td>
                    ${money(
                      transaction.amount /
                      transaction.energy
                    )}/kWh
                  </td>

                  <td>
                    ${money(
                      transaction.amount
                    )}
                  </td>

                  <td>
                    ${statusBadge(
                      transaction.status
                    )}
                  </td>

                  <td>

                    <button
                      class="ss-tx-id"
                      data-action="copy"
                      data-copy="${transaction.id}"
                    >

                      ${transaction.id.slice(
                        0,
                        10
                      )}...

                      <span>
                        copy
                      </span>

                    </button>

                  </td>

                </tr>
              `
            )
            .join("")}

        </tbody>

      </table>

    </div>
  `;
}

/* =========================================================
   CONNECTIONS
========================================================= */

function connectionsPage() {

  const providers =
    PROVIDERS.filter(
      provider =>
        provider.connectionAvailable
    );

  return `

    <section class="ss-page-head">

      <div>

        <div class="ss-eyebrow">
          PROSUMER NETWORK
        </div>

        <h1>
          Find a Prosumer
        </h1>

        <p>
          Explore eligible prosumers
          for potential solar connection
          opportunities.
        </p>

      </div>

    </section>

    <section class="ss-card ss-connection-banner">

      <div>

        <span class="ss-label">
          How it works
        </span>

        <h2>
          Find an eligible local prosumer
        </h2>

        <p>
          SolarSettle helps with discovery,
          verification and digital coordination.
          Physical connection remains subject
          to technical and grid eligibility.
        </p>

      </div>

      <button
        class="ss-button primary"
        data-action="connection-request"
      >
        Start Request
      </button>

    </section>

    <section class="ss-provider-grid">

      ${providers
        .map(providerCard)
        .join("")}

    </section>
  `;
}

/* =========================================================
   TRANSACTION PAGE
========================================================= */

function transactionsPage() {
  const transactions=buyerTransactions().sort((a,b)=>b.date-a.date);
  return `<section class="ss-page-head"><div><div class="ss-eyebrow">TRANSACTIONS</div><h1>Energy transaction history</h1><p>Buyer-side orders, settlement status and recorded energy allocations.</p></div></section>
  <section class="ss-card"><div class="ss-table-wrap"><table class="ss-table"><thead><tr><th>Date</th><th>Order</th><th>Provider</th><th>Energy</th><th>Rate</th><th>Total</th><th>Status</th><th>Transaction</th></tr></thead><tbody>${transactions.map(t=>{const provider=buyerProvider(t);return `<tr><td>${fullDateLabel(t.date)}</td><td><strong>${t.id}</strong><br><span class="ss-muted">${escapeHtml(t.supply)}</span></td><td><strong>${escapeHtml(provider.name)}</strong><br><span class="ss-muted">${escapeHtml(provider.locality)}</span></td><td>${t.energy} kWh</td><td>${money(t.price)}/kWh</td><td>${money(t.total)}</td><td>${statusBadge(t.status,t.status==="Pending"?"warning":"success")}</td><td><button class="ss-tx-id" data-action="copy" data-copy="${t.id}">${t.id.slice(0,12)}... <span>copy</span></button></td></tr>`}).join("")}</tbody></table></div></section>`;
}

/* =========================================================
   MY ENERGY
========================================================= */

function energyPage() {
  const purchased = buyerPurchasedKwh();
  const spend = buyerSpend();
  const avgPrice = buyerAveragePrice();
  const co2 = buyerCO2();
  const savings = buyerSavings();
  const referenceUsage = Math.max(1, purchased * 1.39);
  return `
    <section class="ss-page-head"><div><div class="ss-eyebrow">MY ENERGY</div><h1>Your solar energy activity</h1><p>Track recorded purchases, settlement totals and clean-energy impact.</p></div></section>
    <section class="ss-metrics-grid">
      ${metricCard("Purchased", `${round(purchased,1)} kWh`, "Recorded orders")}
      ${metricCard("Average Price", `${money(avgPrice)}/kWh`, "Blended order price")}
      ${metricCard("CO₂ Avoided", `${round(co2,0)} kg`, "Estimated")}
      ${metricCard("Savings", money(savings), "Against reference grid rate")}
    </section>
    <section class="ss-grid-two">
      <div class="ss-card"><div class="ss-card-head"><div><span class="ss-label">ENERGY ALLOCATION</span><h2>Recorded clean-energy share</h2></div></div>
        <div class="ss-progress-stack">
          <div><span>Purchased solar</span><strong>${round(purchased,1)} kWh</strong><div class="ss-progress"><span style="width:${clamp(purchased/referenceUsage*100,0,100)}%"></span></div></div>
          <div><span>Reference household usage</span><strong>${round(referenceUsage,1)} kWh</strong><div class="ss-progress"><span style="width:100%"></span></div></div>
          <div><span>Estimated remainder</span><strong>${round(Math.max(referenceUsage-purchased,0),1)} kWh</strong><div class="ss-progress"><span style="width:${clamp((Math.max(referenceUsage-purchased,0)/referenceUsage)*100,0,100)}%"></span></div></div>
        </div>
      </div>
      <div class="ss-card"><div class="ss-card-head"><div><span class="ss-label">SETTLEMENT SUMMARY</span><h2>Buyer account activity</h2></div></div>
        <div class="ss-info-grid"><div><span>Orders</span><strong>${buyerTransactions().length}</strong></div><div><span>Total spend</span><strong>${money(spend)}</strong></div><div><span>Avg. price</span><strong>${money(avgPrice)}/kWh</strong></div><div><span>CO₂ avoided</span><strong>${round(co2,0)} kg</strong></div></div>
      </div>
    </section>`;
}

/* =========================================================
   IMPACT
========================================================= */

function impactPage() {
  const purchased=buyerPurchasedKwh(), co2=buyerCO2(), savings=buyerSavings();
  return `
    <section class="ss-page-head"><div><div class="ss-eyebrow">IMPACT</div><h1>Your clean-energy impact</h1><p>Impact estimates are calculated from recorded buyer transactions.</p></div></section>
    <section class="ss-metrics-grid">${metricCard("Solar Purchased",`${round(purchased,1)} kWh`,"Recorded purchases")}${metricCard("CO₂ Avoided",`${round(co2,0)} kg`,'Estimated at ' + TRANSACTION_CONFIG.co2KgPerKwh + ' kg/kWh')}${metricCard("Estimated Savings",money(savings),"Compared with reference tariff")}${metricCard("Orders",buyerTransactions().length,"Recorded buyer orders")}</section>
    <section class="ss-card"><div class="ss-impact-panel"><div class="ss-impact-icon">☀</div><div><h2>Every verified purchase builds a cleaner energy trail.</h2><p>SolarSettle records the buyer-side order, provider, energy quantity and settlement state. Physical delivery remains subject to the applicable grid and eligibility framework.</p></div></div></section>`;
}

/* =========================================================
   SETTINGS
========================================================= */

function settingsPage() {

  return `

    <section class="ss-page-head">

      <div>

        <div class="ss-eyebrow">
          SETTINGS
        </div>

        <h1>
          Dashboard preferences
        </h1>

        <p>
          Configure your buyer experience.
        </p>

      </div>

    </section>

    <section class="ss-card ss-settings">

      <div class="ss-setting-row">

        <div>

          <strong>
            Appearance
          </strong>

          <span>
            Use dashboard day/night theme.
          </span>

        </div>

        <button
          class="ss-button secondary"
          data-action="toggle-theme"
        >

          ${
            state.theme === "light"
              ? "Switch to dark"
              : "Switch to light"
          }

        </button>

      </div>

      <div class="ss-setting-row">

        <div>

          <strong>
            Location
          </strong>

          <span>
            ${escapeHtml(state.location)}
          </span>

        </div>

        <button
          class="ss-button secondary"
          data-action="change-location"
        >
          Change
        </button>

      </div>

      <div class="ss-setting-row">

        <div>

          <strong>
            Notifications
          </strong>

          <span>
            Marketplace and transaction updates
          </span>

        </div>

        <label class="ss-switch">

          <input
            type="checkbox"
            checked
          />

          <span></span>

        </label>

      </div>

    </section>

  `;
}

/* =========================================================
   RENDER
========================================================= */

function render() {

  destroyCharts();

  const root =
    document.getElementById(
      APP_ROOT_ID
    );

  if (!root) return;

  let content;

  switch (state.page) {

    case "marketplace":
      content =
        marketplacePage();
      break;

    case "provider":
      content =
        providerDetailPage();
      break;

    case "connections":
      content =
        connectionsPage();
      break;

    case "transactions":
      content =
        transactionsPage();
      break;

    case "energy":
      content =
        energyPage();
      break;

    case "impact":
      content =
        impactPage();
      break;

    case "settings":
      content =
        settingsPage();
      break;

    default:
      content =
        overviewPage();
  }

  root.innerHTML =
    appShell(content);

  root.classList.toggle(
    "dark",
    state.theme === "dark"
  );

  bindEvents();

  if (
    state.page === "provider"
  ) {

    ensureChartJs()

      .then(() => {

        requestAnimationFrame(
          () =>
            renderProviderCharts(
              getProvider()
            )
        );

      })

      .catch(
        showChartError
      );
  }
}

function showChartError() {

  document
    .querySelectorAll(
      ".ss-chart-container"
    )
    .forEach(container => {

      if (
        container.querySelector(
          "canvas"
        )
      ) {

        container.insertAdjacentHTML(
          "beforeend",

          `
            <div
              class="ss-chart-error"
            >
              Interactive charts could not
              be loaded. Check your network
              or install Chart.js locally.
            </div>
          `
        );
      }

    });
}

/* =========================================================
   CHART DATA RANGE
========================================================= */

function rangeData(provider) {

  const range =
    state.chartRange;

  if (
    range === "24H"
  ) {
    return provider
      .historicalData
      .hourly;
  }

  if (
    range === "7D"
  ) {
    return provider
      .historicalData
      .daily
      .slice(-7);
  }

  if (
    range === "30D"
  ) {
    return provider
      .historicalData
      .daily
      .slice(-30);
  }

  if (
    range === "3M"
  ) {
    return provider
      .historicalData
      .daily
      .slice(-90);
  }

  if (
    range === "6M"
  ) {
    return provider
      .historicalData
      .daily
      .slice(-180);
  }

  return provider
    .historicalData
    .daily;
}

/* =========================================================
   CHART OPTIONS
========================================================= */

function chartBaseOptions() {

  return {

    responsive: true,

    maintainAspectRatio: false,

    interaction: {

      mode: "index",

      intersect: false

    },

    plugins: {

      legend: {
        display: false
      },

      tooltip: {

        enabled: true,

        backgroundColor:
          "#111827",

        titleColor:
          "#ffffff",

        bodyColor:
          "#e5e7eb",

        padding: 12,

        cornerRadius: 10,

        displayColors: true
      }

    },

    scales: {

      x: {

        grid: {
          display: false
        },

        ticks: {

          color:
            "#64748b",

          maxRotation: 0
        }

      },

      y: {

        beginAtZero: true,

        grid: {

          color:
            "rgba(148,163,184,.18)"
        },

        ticks: {

          color:
            "#64748b"
        }

      }

    }
  };
}

/* =========================================================
   RENDER ALL PROVIDER CHARTS
========================================================= */

function renderProviderCharts(
  provider
) {

  const Chart =
    window.Chart;

  if (!Chart) return;

  const data =
    rangeData(provider);

  const isHourly =
    state.chartRange ===
    "24H";

  const labels =
    data.map(item => {

      if (isHourly) {

        return `${String(
          item.hour
        ).padStart(2, "0")}:00`;
      }

      return dateLabel(
        item.date
      );
    });

  const baseOptions =
    chartBaseOptions();

  /* =======================================================
     MAIN GENERATION CHART
  ======================================================= */

  const generationCanvas =
    document.getElementById(
      "ss-generation-chart"
    );

  if (generationCanvas) {

    charts.set(
      "generation",

      new Chart(
        generationCanvas,
        {

          type: "line",

          data: {

            labels,

            datasets: [

              {

                label:
                  "Generation",

                data:
                  data.map(
                    item =>
                      item.generationKwh
                  ),

                borderColor:
                  "#2563eb",

                backgroundColor:
                  "rgba(37,99,235,.10)",

                fill: true,

                tension: .35,

                pointRadius: 0,

                pointHoverRadius: 5,

                hidden:
                  !state
                    .activeSeries
                    .generation

              },

              {

                label:
                  "Consumption",

                data:
                  data.map(
                    item =>
                      item.consumptionKwh
                  ),

                borderColor:
                  "#f59e0b",

                backgroundColor:
                  "rgba(245,158,11,.04)",

                fill: true,

                tension: .35,

                pointRadius: 0,

                pointHoverRadius: 5,

                hidden:
                  !state
                    .activeSeries
                    .consumption

              },

              {

                label:
                  "Surplus",

                data:
                  data.map(
                    item =>
                      item.surplusKwh
                  ),

                borderColor:
                  "#16a34a",

                backgroundColor:
                  "rgba(22,163,74,.06)",

                fill: true,

                tension: .35,

                pointRadius: 0,

                pointHoverRadius: 5,

                hidden:
                  !state
                    .activeSeries
                    .surplus

              }

            ]

          },

          options: {

            ...baseOptions,

            plugins: {

              ...baseOptions.plugins,

              tooltip: {

                ...baseOptions
                  .plugins
                  .tooltip,

                callbacks: {

                  title(items) {

                    const index =
                      items[0]
                        ?.dataIndex ??
                      0;

                    if (
                      isHourly
                    ) {

                      return `${String(
                        data[index]
                          .hour
                      ).padStart(
                        2,
                        "0"
                      )}:00`;
                    }

                    return fullDateLabel(
                      data[index]
                        .date
                    );
                  },

                  label(context) {

                    return `
                      ${context.dataset.label}:
                      ${context.parsed.y.toFixed(2)}
                      kWh
                    `;
                  },

                  afterBody(items) {

                    if (
                      isHourly
                    ) {
                      return "";
                    }

                    const index =
                      items[0]
                        ?.dataIndex ??
                      0;

                    const item =
                      data[index];

                    return [

                      `Available:
                       ${item.availableKwh.toFixed(2)}
                       kWh`,

                      `Price:
                       ${money(item.price)}/kWh`,

                      `Cloud cover:
                       ${item.cloudCover}%`
                    ];
                  }

                }

              }

            }

          }

        }
      )
    );
  }

  /* =======================================================
     DONUT
  ======================================================= */

  const donutCanvas =
    document.getElementById(
      "ss-distribution-chart"
    );

  if (donutCanvas) {

    const distribution =
      provider.energyDistribution;

    charts.set(

      "distribution",

      new Chart(
        donutCanvas,
        {

          type: "doughnut",

          data: {

            labels: [
              "Self Consumed",
              "Sold",
              "Available"
            ],

            datasets: [

              {

                data: [

                  distribution
                    .selfConsumed,

                  distribution
                    .sold,

                  distribution
                    .available

                ],

                backgroundColor: [

                  "#2563eb",

                  "#9333ea",

                  "#16a34a"

                ],

                borderWidth: 0,

                hoverOffset: 7
              }

            ]

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "70%",

            plugins: {

              legend: {
                display: false
              },

              tooltip: {

                callbacks: {

                  label(context) {

                    const total =
                      context
                        .dataset
                        .data
                        .reduce(
                          (a, b) =>
                            a + b,
                          0
                        );

                    const value =
                      context.parsed;

                    const percentage =
                      total
                        ? value /
                          total *
                          100
                        : 0;

                    return `
                      ${value.toFixed(1)}
                      kWh
                      (${percentage.toFixed(1)}%)
                    `;
                  }

                }

              }

            }

          }

        }
      )
    );
  }

  /* =======================================================
     HOURLY
  ======================================================= */

  const hourlyCanvas =
    document.getElementById(
      "ss-hourly-chart"
    );

  if (hourlyCanvas) {

    const hourly =
      provider
        .historicalData
        .hourly;

    charts.set(

      "hourly",

      new Chart(
        hourlyCanvas,
        {

          type: "bar",

          data: {

            labels:
              hourly.map(
                item =>
                  `${String(
                    item.hour
                  ).padStart(
                    2,
                    "0"
                  )}:00`
              ),

            datasets: [

              {

                label:
                  "Generation",

                data:
                  hourly.map(
                    item =>
                      item.generationKwh
                  ),

                backgroundColor:
                  "rgba(37,99,235,.78)",

                borderRadius: 5
              }

            ]

          },

          options: {

            ...baseOptions,

            plugins: {

              ...baseOptions.plugins,

              tooltip: {

                ...baseOptions
                  .plugins
                  .tooltip,

                callbacks: {

                  label(context) {

                    return `
                      Generation:
                      ${context.parsed.y.toFixed(2)}
                      kWh
                    `;
                  }

                }

              }

            }

          }

        }
      )
    );
  }

  /* =======================================================
     MONTHLY
  ======================================================= */

  const monthlyCanvas =
    document.getElementById(
      "ss-monthly-chart"
    );

  if (monthlyCanvas) {

    const monthly =
      provider
        .historicalData
        .monthly;

    charts.set(

      "monthly",

      new Chart(
        monthlyCanvas,
        {

          type: "bar",

          data: {

            labels:
              monthly.map(
                item =>
                  item.label
              ),

            datasets: [

              {

                label:
                  "Generation",

                data:
                  monthly.map(
                    item =>
                      item.generationKwh
                  ),

                backgroundColor:
                  "rgba(37,99,235,.80)",

                borderRadius: 5

              },

              {

                label:
                  "Consumption",

                data:
                  monthly.map(
                    item =>
                      item.consumptionKwh
                  ),

                backgroundColor:
                  "rgba(245,158,11,.75)",

                borderRadius: 5

              },

              {

                label:
                  "Surplus",

                data:
                  monthly.map(
                    item =>
                      item.surplusKwh
                  ),

                backgroundColor:
                  "rgba(22,163,74,.72)",

                borderRadius: 5

              }

            ]

          },

          options: {

            ...baseOptions,

            plugins: {

              ...baseOptions.plugins,

              tooltip: {

                ...baseOptions
                  .plugins
                  .tooltip,

                callbacks: {

                  label(context) {

                    return `
                      ${context.dataset.label}:
                      ${context.parsed.y.toFixed(1)}
                      kWh
                    `;
                  }

                }

              }

            }

          }

        }
      )
    );
  }

  /* =======================================================
     PRICE HISTORY
  ======================================================= */

  const priceCanvas =
    document.getElementById(
      "ss-price-chart"
    );

  if (priceCanvas) {

    const priceData =
      provider
        .historicalData
        .daily
        .slice(-30);

    charts.set(

      "price",

      new Chart(
        priceCanvas,
        {

          type: "line",

          data: {

            labels:
              priceData.map(
                item =>
                  dateLabel(
                    item.date
                  )
              ),

            datasets: [

              {

                label:
                  "Price",

                data:
                  priceData.map(
                    item =>
                      item.price
                  ),

                borderColor:
                  "#9333ea",

                backgroundColor:
                  "rgba(147,51,234,.08)",

                fill: true,

                tension: .35,

                pointRadius: 0,

                pointHoverRadius: 5

              }

            ]

          },

          options: {

            ...baseOptions,

            scales: {

              ...baseOptions.scales,

              y: {

                ...baseOptions
                  .scales
                  .y,

                ticks: {

                  color:
                    "#64748b",

                  callback:
                    value =>
                      `₹${Number(
                        value
                      ).toFixed(2)}`
                }

              }

            },

            plugins: {

              ...baseOptions.plugins,

              tooltip: {

                ...baseOptions
                  .plugins
                  .tooltip,

                callbacks: {

                  label(context) {

                    return `
                      Price:
                      ₹${context.parsed.y.toFixed(2)}
                      /kWh
                    `;
                  }

                }

              }

            }

          }

        }
      )
    );
  }
}

/* =========================================================
   EVENT HANDLING
========================================================= */

function bindEvents() {

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          state.page =
            element.dataset.page;

          render();
        }
      );

    });

  /* Provider selection */

  document
    .querySelectorAll(
      "[data-provider]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          state.selectedProviderId =
            element.dataset.provider;

          state.page =
            "provider";

          state.chartRange =
            "30D";

          render();

        }
      );

    });

  /* Buy buttons */

  document
    .querySelectorAll(
      "[data-buy]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          openPurchaseModal(
            element.dataset.buy
          );

        }
      );

    });

  /* Connection */

  document
    .querySelectorAll(
      "[data-provider-connection]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          openConnectionModal(
            element.dataset
              .providerConnection
          );

        }
      );

    });

  /* Provider switcher */

  const providerSelect =
    document.querySelector(
      "[data-provider-select]"
    );

  if (providerSelect) {

    providerSelect.addEventListener(
      "change",
      event => {

        state.selectedProviderId =
          event.target.value;

        state.page =
          "provider";

        render();

      }
    );

  }

  /* Chart range */

  const range =
    document.querySelector(
      "[data-chart-range]"
    );

  if (range) {

    range.addEventListener(
      "change",
      event => {

        state.chartRange =
          event.target.value;

        render();

      }
    );

  }

  /* Chart series toggles */

  document
    .querySelectorAll(
      "[data-series]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          const key =
            element.dataset.series;

          state.activeSeries[key] =
            !state
              .activeSeries[key];

          render();

        }
      );

    });

  /* Filters */

  document
    .querySelectorAll(
      "[data-filter]"
    )
    .forEach(element => {

      element.addEventListener(
        "change",
        event => {

          const key =
            event.target.dataset
              .filter;

          if (
            key === "sort"
          ) {

            state.sort =
              event.target.value;
          }

          if (
            key === "trust"
          ) {

            state.minTrust =
              Number(
                event.target.value
              );
          }

          if (
            key === "price"
          ) {

            state.maxPrice =
              event.target.value ===
              "Infinity"

                ? Infinity

                : Number(
                    event.target
                      .value
                  );
          }

          if (
            key === "verified"
          ) {

            state.verifiedOnly =
              event.target.checked;
          }

          if (
            key === "grid"
          ) {

            state.gridOnly =
              event.target.checked;
          }

          if (
            key === "connection"
          ) {

            state.connectionOnly =
              event.target.checked;
          }

          render();

        }
      );

    });

  /* Mobile sidebar */
  document.querySelectorAll('[data-action="mobile-menu"]').forEach(element => {
    element.addEventListener("click", () => {
      const sidebar=document.querySelector(".ss-sidebar");
      if(sidebar) sidebar.classList.toggle("mobile-open");
    });
  });

  document.querySelectorAll(".ss-sidebar .ss-nav-item").forEach(element => {
    element.addEventListener("click", () => {
      const sidebar=document.querySelector(".ss-sidebar");
      if(sidebar) sidebar.classList.remove("mobile-open");
    });
  });

  /* Marketplace search */

  const marketSearch =
    document.querySelector(
      '[data-action="market-search"]'
    );

  if (marketSearch) {

    marketSearch.addEventListener(
      "input",
      event => {

        state.search =
          event.target.value;

        render();

        const input =
          document.querySelector(
            '[data-action="market-search"]'
          );

        if (input) {

          input.focus();

          input.setSelectionRange(
            input.value.length,
            input.value.length
          );

        }

      }
    );

  }

  /* Global search */

  const globalSearch =
    document.querySelector(
      '[data-action="search"]'
    );

  if (globalSearch) {

    globalSearch.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          state.search =
            event.target.value;

          state.page =
            "marketplace";

          render();

        }

      }
    );

  }

  /* Reset */

  document
    .querySelectorAll(
      '[data-action="reset-filters"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          state.search = "";

          state.minTrust = 0;

          state.maxPrice =
            Infinity;

          state.minAvailable =
            0;

          state.verifiedOnly =
            false;

          state.gridOnly =
            false;

          state.connectionOnly =
            false;

          state.sort =
            "recommended";

          render();

        }
      );

    });

  /* Theme */

  document
    .querySelectorAll(
      '[data-action="toggle-theme"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          state.theme =
            state.theme ===
            "light"

              ? "dark"

              : "light";

          localStorage.setItem(
            "solarsettle-theme",
            state.theme
          );

          render();

        }
      );

    });

  /* Copy transaction */

  document
    .querySelectorAll(
      '[data-action="copy"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        async () => {

          try {

            await navigator
              .clipboard
              .writeText(
                element.dataset.copy
              );

            const old =
              element.innerHTML;

            element.innerHTML =
              "Copied ✓";

            setTimeout(
              () => {

                element.innerHTML =
                  old;

              },

              1000
            );

          } catch {

            openInfoModal("Transaction ID", element.dataset.copy);

          }

        }
      );

    });

  /* Existing app integration placeholders */

  document
    .querySelectorAll(
      '[data-action="change-location"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          openLocationModal();

        }
      );

    });

  document
    .querySelectorAll(
      '[data-action="support"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          openInfoModal("Support Center", "Review marketplace eligibility, transaction records, provider verification and connection-request status here. For production, this panel can be wired to your existing support backend.");

        }
      );

    });

  document
    .querySelectorAll(
      '[data-action="profile"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          openProfileModal();

        }
      );

    });

  document
    .querySelectorAll(
      '[data-action="notification"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          openInfoModal("Notifications", buyerTransactions().slice(0,3).map(t => t.id + " — " + t.status).join("\n"));

        }
      );

    });

  document
    .querySelectorAll(
      '[data-action="logout"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          requestLogout();

        }
      );

    });

  document
    .querySelectorAll(
      '[data-action="connection-request"]'
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          openConnectionModal(
            state.selectedProviderId
          );

        }
      );

    });
}

function openInfoModal(title, message) {
  const old=document.getElementById("ss-modal-root"); if(old) old.remove();
  const root=document.createElement("div"); root.id="ss-modal-root";
  root.innerHTML=`<div class="ss-modal-backdrop" data-modal-close><div class="ss-modal" role="dialog" aria-modal="true"><button class="ss-modal-close" data-modal-close>×</button><div class="ss-eyebrow">SOLARSETTLE</div><h2>${escapeHtml(title)}</h2><div class="ss-info-modal-message">${escapeHtml(message).replaceAll("\n","<br>")}</div><button class="ss-button primary full" data-modal-close>Close</button></div></div>`;
  document.body.appendChild(root);
  root.querySelectorAll("[data-modal-close]").forEach(el=>el.addEventListener("click",e=>{if(e.target===el||el.classList.contains("ss-modal-close"))root.remove();}));
}

function requestLogout() {
  window.dispatchEvent(new Event("solarsettle:logout"));
}

function openProfileModal() {
  const old = document.getElementById("ss-modal-root");
  if (old) old.remove();

  const root = document.createElement("div");
  root.id = "ss-modal-root";
  root.innerHTML = `<div class="ss-modal-backdrop" data-modal-close><div class="ss-modal" role="dialog" aria-modal="true" aria-labelledby="ss-profile-title"><button class="ss-modal-close" data-modal-close aria-label="Close">×</button><div class="ss-eyebrow">BUYER PROFILE</div><h2 id="ss-profile-title">Buyer account</h2><div class="ss-info-modal-message">Location: ${escapeHtml(state.location)}<br>Orders: ${buyerTransactions().length}<br>Energy purchased: ${round(buyerPurchasedKwh(), 1)} kWh</div><button class="ss-button primary full" data-profile-logout>Log out</button></div></div>`;
  document.body.appendChild(root);
  root.querySelectorAll("[data-modal-close]").forEach(element => element.addEventListener("click", event => {
    if (event.target === element || element.classList.contains("ss-modal-close")) root.remove();
  }));
  root.querySelector("[data-profile-logout]").addEventListener("click", requestLogout);
}

function openLocationModal(){
  const locations=["Greater Noida, Uttar Pradesh","New Delhi, Delhi","Gurugram, Haryana","Mumbai, Maharashtra","Pune, Maharashtra","Bengaluru, Karnataka","Hyderabad, Telangana","Chennai, Tamil Nadu","Ahmedabad, Gujarat","Jaipur, Rajasthan","Kolkata, West Bengal","Lucknow, Uttar Pradesh","Kochi, Kerala","Chandigarh"];
  const old=document.getElementById("ss-modal-root"); if(old)old.remove(); const root=document.createElement("div"); root.id="ss-modal-root";
  root.innerHTML=`<div class="ss-modal-backdrop" data-modal-close><div class="ss-modal"><button class="ss-modal-close" data-modal-close>×</button><div class="ss-eyebrow">MARKET AREA</div><h2>Choose your marketplace area</h2><p class="ss-muted">This changes provider discovery. It does not claim physical grid connectivity.</p><select id="ss-location-select" class="ss-text-input">${locations.map(x=>`<option ${x===state.location?"selected":""}>${x}</option>`).join("")}</select><button class="ss-button primary full" id="ss-save-location">Apply location</button></div></div>`;
  document.body.appendChild(root); root.querySelectorAll("[data-modal-close]").forEach(el=>el.addEventListener("click",e=>{if(e.target===el||el.classList.contains("ss-modal-close"))root.remove();})); root.querySelector("#ss-save-location").addEventListener("click",()=>{state.location=root.querySelector("#ss-location-select").value; root.remove(); loadWeather(state.location);});
}

/* =========================================================
   PURCHASE MODAL
========================================================= */

function openPurchaseModal(
  providerId
) {

  const provider =
    getProvider(providerId);

  state.purchaseProviderId =
    providerId;

  state.purchaseAmount =
    Math.min(
      50,
      Math.max(
        1,
        Math.floor(
          provider.availableEnergyKwh
        )
      )
    );

  const existing =
    document.getElementById(
      "ss-modal-root"
    );

  if (existing) {
    existing.remove();
  }

  const root =
    document.createElement(
      "div"
    );

  root.id =
    "ss-modal-root";

  root.innerHTML = `

    <div
      class="ss-modal-backdrop"
      data-modal-close
    >

      <div
        class="ss-modal"
        role="dialog"
        aria-modal="true"
      >

        <button
          class="ss-modal-close"
          data-modal-close
        >
          ×
        </button>

        <div class="ss-eyebrow">
          BUY SOLAR ENERGY
        </div>

        <h2>
          Purchase from
          ${escapeHtml(
            provider.name
          )}
        </h2>

        <p class="ss-muted">
          ${escapeHtml(
            provider.locality
          )}
        </p>

        <div
          class="ss-purchase-available"
        >

          <span>
            Available now
          </span>

          <strong>
            ${kwh(
              provider.availableEnergyKwh
            )}
          </strong>

        </div>

        <label class="ss-input-label">
          Energy required
        </label>

        <div class="ss-energy-input">

          <input
            id="ss-purchase-amount"
            type="number"
            min="1"
            max="${Math.floor(
              provider.availableEnergyKwh
            )}"
            value="${state.purchaseAmount}"
          />

          <span>
            kWh
          </span>

        </div>

        <input
          id="ss-purchase-slider"
          type="range"
          min="1"
          max="${Math.max(
            1,
            Math.floor(
              provider.availableEnergyKwh
            )
          )}"
          value="${state.purchaseAmount}"
        />

        <div class="ss-order-options">
          <label>Supply preference<select id="ss-purchase-supply" class="ss-text-input"><option value="next-day">Next available delivery window</option><option value="same-day">Same-day window, if eligible</option><option value="scheduled">Scheduled allocation</option></select></label>
          <label>Settlement method<select id="ss-purchase-settlement" class="ss-text-input"><option value="wallet">Connected wallet / settlement account</option><option value="account">SolarSettle account balance</option></select></label>
        </div>

        <div
          class="ss-purchase-summary"
        >

          <div>

            <span>
              Price
            </span>

            <strong>
              ${money(
                provider.price
              )}/kWh
            </strong>

          </div>

          <div>

            <span>
              Energy cost
            </span>

            <strong
              id="ss-purchase-cost"
            >
              ${money(
                state.purchaseAmount *
                provider.price
              )}
            </strong>

          </div>

          <div class="total">

            <span>
              Estimated total
            </span>

            <strong
              id="ss-purchase-total"
            >
              ${money(
                state.purchaseAmount *
                provider.price
              )}
            </strong>

          </div>

        </div>

        <button
          class="ss-button primary full"
          data-action="confirm-purchase"
        >
          Review Purchase
        </button>

      </div>

    </div>

  `;

  document.body.appendChild(
    root
  );

  const amount =
    root.querySelector(
      "#ss-purchase-amount"
    );

  const slider =
    root.querySelector(
      "#ss-purchase-slider"
    );

  function updateAmount(
    value
  ) {

    const safe =
      clamp(
        Number(value) || 1,
        1,
        Math.floor(
          provider.availableEnergyKwh
        )
      );

    amount.value =
      safe;

    slider.value =
      safe;

    state.purchaseAmount =
      safe;

    root.querySelector(
      "#ss-purchase-cost"
    ).textContent =
      money(
        safe *
        provider.price
      );

    root.querySelector(
      "#ss-purchase-total"
    ).textContent =
      money(
        safe *
        provider.price
      );
  }

  amount.addEventListener(
    "input",
    event =>
      updateAmount(
        event.target.value
      )
  );

  slider.addEventListener(
    "input",
    event =>
      updateAmount(
        event.target.value
      )
  );

  root.querySelector("#ss-purchase-supply").value=state.purchaseSupply;
  root.querySelector("#ss-purchase-settlement").value=state.purchaseSettlement;
  root.querySelector("#ss-purchase-supply").addEventListener("change", e => state.purchaseSupply=e.target.value);
  root.querySelector("#ss-purchase-settlement").addEventListener("change", e => state.purchaseSettlement=e.target.value);

  root
    .querySelectorAll(
      "[data-modal-close]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        event => {

          if (
            event.target === element ||
            element.classList.contains(
              "ss-modal-close"
            )
          ) {

            root.remove();

          }

        }
      );

    });

  root
    .querySelector(
      '[data-action="confirm-purchase"]'
    )
    .addEventListener(
      "click",
      () =>
        showPurchaseReview(
          root,
          provider
        )
    );
}

function showPurchaseReview(
  root,
  provider
) {

  const amount =
    state.purchaseAmount;

  const total =
    amount *
    provider.price;

  root.querySelector(
    ".ss-modal"
  ).innerHTML = `

    <button
      class="ss-modal-close"
      data-modal-close
    >
      ×
    </button>

    <div class="ss-eyebrow">
      REVIEW PURCHASE
    </div>

    <h2>
      Confirm your energy purchase
    </h2>

    <div class="ss-review-list">

      <div>

        <span>
          Provider
        </span>

        <strong>
          ${escapeHtml(
            provider.name
          )}
        </strong>

      </div>

      <div>

        <span>
          Energy
        </span>

        <strong>
          ${amount} kWh
        </strong>

      </div>

      <div>

        <span>
          Price
        </span>

        <strong>
          ${money(
            provider.price
          )}/kWh
        </strong>

      </div>

      <div>

        <span>
          Energy cost
        </span>

        <strong>
          ${money(total)}
        </strong>

      </div>

      <div class="total">

        <span>
          Estimated total
        </span>

        <strong>
          ${money(total)}
        </strong>

      </div>

    </div>

    <div class="ss-order-breakdown"><div><span>Energy cost</span><strong>${money(total)}</strong></div><div><span>SolarSettle service fee (1.5%)</span><strong>${money(total*TRANSACTION_CONFIG.serviceFeeRate)}</strong></div><div><span>Network / utility charges</span><strong>Calculated at settlement</strong></div><div class="total"><span>Estimated payable</span><strong>${money(total*(1+TRANSACTION_CONFIG.serviceFeeRate))}</strong></div></div>
    <p class="ss-warning">This order records an energy allocation request. Applicable open-access, network, utility and settlement requirements are determined by the connected market/utility process; this dashboard does not claim physical electricity delivery merely from an order confirmation.</p>

    <div class="ss-modal-actions">

      <button
        class="ss-button secondary"
        data-modal-close
      >
        Cancel
      </button>

      <button
        class="ss-button primary"
        data-action="submit-existing-purchase"
      >
        Confirm Purchase
      </button>

    </div>

  `;

  root
    .querySelectorAll(
      "[data-modal-close]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () =>
          root.remove()
      );

    });

  root
    .querySelector(
      '[data-action="submit-existing-purchase"]'
    )
    .addEventListener(
      "click",
      () => {

        const submitButton = root.querySelector('[data-action="submit-existing-purchase"]');
        submitButton.disabled = true;
        submitButton.textContent = "Submitting order…";
        const energyCost = amount * provider.price;
        const serviceFee = energyCost * TRANSACTION_CONFIG.serviceFeeRate;
        const networkCharge = 0;
        const order = {
          providerId: provider.id, providerName: provider.name, quantityKwh: amount,
          unitPrice: provider.price, energyCost, serviceFee, networkCharge,
          total: energyCost + serviceFee + networkCharge,
          supplyPreference: state.purchaseSupply, settlementMethod: state.purchaseSettlement,
          location: state.location, createdAt: new Date().toISOString()
        };
        Promise.resolve(window.SolarSettleBridge?.purchaseEnergy?.(order))
          .then(result => {
            const tx = { id: `SS-ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, providerId: provider.id, date:new Date(), energy:amount, price:provider.price, energyCost:round(energyCost,2), serviceFee:round(serviceFee,2), networkCharge:0, total:round(order.total,2), status: result ? "Submitted" : "Recorded", settlement:state.purchaseSettlement === "wallet" ? "Wallet" : "Account", supply:state.purchaseSupply };
            buyerTransactions().unshift(tx);
            provider.availableEnergyKwh = round(Math.max(0, provider.availableEnergyKwh - amount), 1);
            provider.committedEnergyKwh = round((provider.committedEnergyKwh || 0) + amount, 1);
            root.remove();
            state.page="transactions";
            render();
            openInfoModal("Order submitted", `${tx.id}\n\n${amount} kWh from ${provider.name}\nTotal: ${money(tx.total)}\nStatus: ${tx.status}\n\nPhysical delivery/settlement remains subject to the applicable grid, connection and eligibility process.`);
          })
          .catch(error => { submitButton.disabled=false; submitButton.textContent="Confirm Purchase"; openInfoModal("Order could not be submitted", error?.message || "The connected transaction service rejected the request."); });

      }
    );
}

/* =========================================================
   CONNECTION MODAL
========================================================= */

function openConnectionModal(
  providerId
) {

  const provider =
    getProvider(providerId);

  const root =
    document.createElement(
      "div"
    );

  root.id =
    "ss-modal-root";

  root.innerHTML = `

    <div
      class="ss-modal-backdrop"
      data-close
    >

      <div
        class="ss-modal"
        role="dialog"
        aria-modal="true"
      >

        <button
          class="ss-modal-close"
          data-close
        >
          ×
        </button>

        <div class="ss-eyebrow">
          SOLAR CONNECTION
        </div>

        <h2>
          Request connection information
        </h2>

        <p class="ss-muted">
          ${escapeHtml(
            provider.name
          )}
          ·
          ${escapeHtml(
            provider.locality
          )}
        </p>

        <label class="ss-input-label">
          Monthly energy requirement
        </label>

        <input
          class="ss-text-input"
          type="number"
          value="250"
          min="1"
          placeholder="kWh per month"
        />

        <label class="ss-input-label">
          Property type
        </label>

        <select class="ss-text-input">

          <option>
            Residential
          </option>

          <option>
            Commercial
          </option>

          <option>
            Institutional
          </option>

        </select>

        <label class="ss-input-label">
          Rooftop status
        </label>

        <select class="ss-text-input">

          <option>
            Already installed
          </option>

          <option>
            Suitable for installation
          </option>

          <option>
            Need technical assessment
          </option>

        </select>

        <p class="ss-warning">

          A request does not guarantee
          a physical connection. Final
          connectivity depends on technical,
          grid and regulatory eligibility.

        </p>

        <button
          class="ss-button primary full"
          data-submit-connection
        >
          Submit Connection Request
        </button>

      </div>

    </div>

  `;

  document.body.appendChild(
    root
  );

  root
    .querySelectorAll(
      "[data-close]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        event => {

          if (
            event.target === element ||
            element.classList.contains(
              "ss-modal-close"
            )
          ) {

            root.remove();

          }

        }
      );

    });

  root
    .querySelector(
      "[data-submit-connection]"
    )
    .addEventListener(
      "click",
      () => {

        const req = { id:`CON-${Date.now()}`, providerId:provider.id, providerName:provider.name, createdAt:new Date(), status:"Submitted", monthlyKwh:Number(root.querySelector("input[type=number]").value||250), propertyType:root.querySelectorAll("select")[0].value, rooftopStatus:root.querySelectorAll("select")[1].value };
        Promise.resolve(window.SolarSettleBridge?.requestConnection?.(req)).then(() => {
          state.connectionRequests.unshift(req); root.remove(); openInfoModal("Connection request submitted", `${req.id}\n\n${provider.name}\nStatus: Submitted\n\nThe request is for digital discovery/coordination. Physical interconnection remains subject to technical, grid and regulatory approval.`);
        }).catch(error => openInfoModal("Request failed", error?.message || "Unable to submit connection request."));

      }
    );
}

/* =========================================================
   INITIALIZATION
========================================================= */

function initialize() {

  state.theme =
    localStorage.getItem(
      "solarsettle-theme"
    ) ||
    "light";

  render();
  loadWeather(state.location);
}

// React mounts the dashboard through the adapter below.

/* =========================================================
   OPTIONAL EXPORTS
========================================================= */

export {

  PROVIDERS,

  state,

  render,

  getProvider,

  generateProvider

};

export default function BuyerDashboard() {
  const { logout } = useWeb3();
  const navigate = useNavigate();

  useEffect(() => {
    initialize();
    const handleLogout = () => {
      logout();
      navigate('/login', { replace: true });
    };
    window.addEventListener('solarsettle:logout', handleLogout);

    return () => {
      window.removeEventListener('solarsettle:logout', handleLogout);
      destroyCharts();
      const root = document.getElementById(APP_ROOT_ID);
      if (root) root.innerHTML = '';
    };
  }, [logout, navigate]);

  return <div
    id={APP_ROOT_ID}
    className="glass-dashboard"
    style={{ '--ss-dashboard-image': `url(${process.env.PUBLIC_URL}/solarsettle-hero.png)` }}
  />;
}
