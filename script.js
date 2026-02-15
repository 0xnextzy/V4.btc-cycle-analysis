/* ========================================
   Bitcoin Intelligence Dashboard
   Real-Time Data Integration
   ======================================== */

// API Endpoints
const API_ENDPOINTS = {
    bitcoin: 'https://api.coingecko.com/api/v3/coins/bitcoin',
    global: 'https://api.coingecko.com/api/v3/global',
    usdt: 'https://api.coingecko.com/api/v3/coins/tether',
    usdc: 'https://api.coingecko.com/api/v3/coins/usd-coin',
    fearGreed: 'https://api.alternative.me/fng/'
};

// Global state
let dashboardData = {
    bitcoin: null,
    global: null,
    stablecoins: null,
    fearGreed: null
};

// Constants
const HALVING_DATE = new Date('2024-04-20');
const UPDATE_INTERVAL = 60000; // 60 seconds

/* ========================================
   API Fetch Functions
   ======================================== */

async function fetchBitcoinData() {
    try {
        const response = await fetch(API_ENDPOINTS.bitcoin);
        if (!response.ok) throw new Error('Bitcoin API failed');
        const data = await response.json();
        dashboardData.bitcoin = data;
        return data;
    } catch (error) {
        console.error('Error fetching Bitcoin data:', error);
        return null;
    }
}

async function fetchGlobalData() {
    try {
        const response = await fetch(API_ENDPOINTS.global);
        if (!response.ok) throw new Error('Global API failed');
        const data = await response.json();
        dashboardData.global = data;
        return data;
    } catch (error) {
        console.error('Error fetching global data:', error);
        return null;
    }
}

async function fetchStablecoinData() {
    try {
        const [usdtResponse, usdcResponse] = await Promise.all([
            fetch(API_ENDPOINTS.usdt),
            fetch(API_ENDPOINTS.usdc)
        ]);
        
        if (!usdtResponse.ok || !usdcResponse.ok) {
            throw new Error('Stablecoin API failed');
        }
        
        const [usdtData, usdcData] = await Promise.all([
            usdtResponse.json(),
            usdcResponse.json()
        ]);
        
        dashboardData.stablecoins = {
            usdt: usdtData,
            usdc: usdcData
        };
        
        return dashboardData.stablecoins;
    } catch (error) {
        console.error('Error fetching stablecoin data:', error);
        return null;
    }
}

async function fetchFearGreedIndex() {
    try {
        const response = await fetch(API_ENDPOINTS.fearGreed);
        if (!response.ok) throw new Error('Fear & Greed API failed');
        const data = await response.json();
        dashboardData.fearGreed = data;
        return data;
    } catch (error) {
        console.error('Error fetching Fear & Greed data:', error);
        return null;
    }
}

/* ========================================
   Calculation Functions
   ======================================== */

function calculatePercentFromATH(currentPrice, athPrice) {
    if (!currentPrice || !athPrice) return 0;
    return ((currentPrice - athPrice) / athPrice) * 100;
}

function calculateDaysSinceHalving() {
    const now = new Date();
    const diffTime = Math.abs(now - HALVING_DATE);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function calculateCompositeRiskScore(data) {
    if (!data.bitcoin || !data.fearGreed) return 0;
    
    const btcData = data.bitcoin;
    const marketData = btcData.market_data;
    
    // Calculate % from ATH (normalize to 0-100)
    const currentPrice = marketData.current_price.usd;
    const athPrice = marketData.ath.usd;
    const fromATH = calculatePercentFromATH(currentPrice, athPrice);
    const athScore = Math.max(0, Math.min(100, 100 + fromATH)); // Closer to ATH = higher score
    
    // Fear & Greed (already 0-100, higher = more greedy)
    const fgScore = parseInt(data.fearGreed.data[0].value);
    
    // 24h change (normalize to 0-100)
    const priceChange24h = marketData.price_change_percentage_24h || 0;
    const changeScore = Math.max(0, Math.min(100, 50 + (priceChange24h * 2)));
    
    // BTC Dominance (normalize - lower dominance might indicate altcoin season/higher risk)
    const btcDominance = data.global?.data?.market_cap_percentage?.btc || 50;
    const dominanceScore = Math.max(0, Math.min(100, 100 - btcDominance));
    
    // Weighted composite score
    const compositeScore = (
        (athScore * 0.35) +
        (fgScore * 0.40) +
        (changeScore * 0.15) +
        (dominanceScore * 0.10)
    );
    
    return Math.round(compositeScore);
}

function getRiskZone(score) {
    if (score <= 30) return { zone: 'Accumulation', class: 'low' };
    if (score <= 70) return { zone: 'Neutral', class: 'medium' };
    return { zone: 'Overheated', class: 'high' };
}

function getSentimentInterpretation(value) {
    if (value <= 25) return 'Extreme Fear';
    if (value <= 45) return 'Fear';
    if (value <= 55) return 'Neutral';
    if (value <= 75) return 'Greed';
    return 'Extreme Greed';
}

function getSentimentSignal(value) {
    if (value <= 25) return 'Buy Signal';
    if (value <= 45) return 'Accumulate';
    if (value <= 55) return 'Hold';
    if (value <= 75) return 'Take Profits';
    return 'Sell Signal';
}

/* ========================================
   Number Formatting Functions
   ======================================== */

function formatPrice(num) {
    if (!num) return '$0';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

function formatLargeNumber(num) {
    if (!num) return '0';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString('en-US');
}

function formatPercentage(num, decimals = 2) {
    if (num === null || num === undefined) return '0%';
    return num.toFixed(decimals) + '%';
}

function formatSupply(num) {
    if (!num) return '0';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num) + ' BTC';
}

/* ========================================
   Smooth Number Animation
   ======================================== */

function animateValue(element, start, end, duration = 600) {
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        
        // Update based on element's data type
        const dataType = element.getAttribute('data-type');
        if (dataType === 'price') {
            element.textContent = formatPrice(current);
        } else if (dataType === 'percentage') {
            element.textContent = formatPercentage(current);
        } else if (dataType === 'number') {
            element.textContent = Math.round(current);
        } else {
            element.textContent = current.toFixed(2);
        }
    }, 16);
}

/* ========================================
   UI Update Functions
   ======================================== */

function updateLiveMarketOverview(btcData, globalData) {
    if (!btcData) return;
    
    const marketData = btcData.market_data;
    
    // Price
    const priceElement = document.getElementById('btcPrice');
    priceElement.textContent = formatPrice(marketData.current_price.usd);
    
    // 24h Change
    const changeElement = document.getElementById('priceChange');
    const change24h = marketData.price_change_percentage_24h;
    changeElement.textContent = formatPercentage(change24h);
    changeElement.className = 'card-change ' + (change24h >= 0 ? 'positive' : 'negative');
    
    // Market Cap
    document.getElementById('marketCap').textContent = formatPrice(marketData.market_cap.usd);
    document.getElementById('marketCapRank').textContent = btcData.market_cap_rank || '-';
    
    // 24h Volume
    document.getElementById('volume24h').textContent = formatPrice(marketData.total_volume.usd);
    
    // BTC Dominance
    if (globalData?.data) {
        const dominance = globalData.data.market_cap_percentage?.btc || 0;
        document.getElementById('btcDominance').textContent = formatPercentage(dominance, 1);
    }
}

function updateLayer1(btcData) {
    if (!btcData) return;
    
    const marketData = btcData.market_data;
    
    // Current Price
    document.getElementById('layer1Price').textContent = formatPrice(marketData.current_price.usd);
    
    // ATH Price
    const athPrice = marketData.ath.usd;
    document.getElementById('athPrice').textContent = formatPrice(athPrice);
    
    // ATH Date
    const athDate = new Date(marketData.ath_date.usd);
    const formattedDate = athDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
    document.getElementById('athDate').textContent = formattedDate;
    
    // % From ATH
    const fromATH = calculatePercentFromATH(marketData.current_price.usd, athPrice);
    const fromATHElement = document.getElementById('fromATH');
    fromATHElement.textContent = formatPercentage(fromATH);
    fromATHElement.className = 'card-value ' + (fromATH >= 0 ? 'text-green' : 'text-red');
    
    // Days Since Halving
    document.getElementById('daysSinceHalving').textContent = calculateDaysSinceHalving();
    
    // Circulating Supply
    document.getElementById('circulatingSupply').textContent = formatSupply(marketData.circulating_supply);
    
    // Risk Score
    updateRiskScore();
}

function updateRiskScore() {
    const score = calculateCompositeRiskScore(dashboardData);
    const riskInfo = getRiskZone(score);
    
    document.getElementById('riskScore').textContent = score;
    
    const riskBarFill = document.getElementById('riskBarFill');
    riskBarFill.style.width = score + '%';
    riskBarFill.className = 'risk-bar-fill ' + riskInfo.class;
    
    const riskZoneElement = document.getElementById('riskZone');
    riskZoneElement.textContent = riskInfo.zone;
    riskZoneElement.className = 'card-sublabel text-' + (riskInfo.class === 'low' ? 'green' : riskInfo.class === 'medium' ? 'yellow' : 'red');
}

function updateLayer5(stablecoinData) {
    if (!stablecoinData) return;
    
    const usdtCap = stablecoinData.usdt?.market_data?.market_cap?.usd || 0;
    const usdcCap = stablecoinData.usdc?.market_data?.market_cap?.usd || 0;
    const totalCap = usdtCap + usdcCap;
    
    document.getElementById('usdtCap').textContent = formatPrice(usdtCap);
    document.getElementById('usdcCap').textContent = formatPrice(usdcCap);
    document.getElementById('totalStablecoinCap').textContent = formatPrice(totalCap);
}

function updateLayer7(fearGreedData) {
    if (!fearGreedData?.data?.[0]) return;
    
    const fgData = fearGreedData.data[0];
    const value = parseInt(fgData.value);
    
    document.getElementById('fearGreedValue').textContent = value;
    document.getElementById('fearGreedClassification').textContent = fgData.value_classification;
    
    // Sentiment Interpretation
    document.getElementById('sentimentInterpretation').textContent = getSentimentInterpretation(value);
    
    // Sentiment Signal
    const signalElement = document.getElementById('sentimentSignal');
    signalElement.textContent = getSentimentSignal(value);
    
    // Color coding
    if (value <= 30) {
        signalElement.className = 'card-value text-green';
    } else if (value >= 70) {
        signalElement.className = 'card-value text-red';
    } else {
        signalElement.className = 'card-value text-yellow';
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
    });
    document.getElementById('lastUpdate').textContent = `Last updated: ${timeString}`;
}

/* ========================================
   Main Data Fetch & Update
   ======================================== */

async function fetchAllData() {
    console.log('Fetching dashboard data...');
    
    try {
        // Fetch all data in parallel
        const [bitcoin, global, stablecoins, fearGreed] = await Promise.all([
            fetchBitcoinData(),
            fetchGlobalData(),
            fetchStablecoinData(),
            fetchFearGreedIndex()
        ]);
        
        // Update UI with fetched data
        if (bitcoin) {
            updateLiveMarketOverview(bitcoin, global);
            updateLayer1(bitcoin);
        }
        
        if (stablecoins) {
            updateLayer5(stablecoins);
        }
        
        if (fearGreed) {
            updateLayer7(fearGreed);
        }
        
        // Update timestamp
        updateLastUpdateTime();
        
        console.log('Dashboard updated successfully');
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        document.getElementById('lastUpdate').textContent = 'Update failed - retrying...';
    }
}

/* ========================================
   Initialization
   ======================================== */

async function initDashboard() {
    console.log('Initializing Bitcoin Intelligence Dashboard...');
    
    // Initial data fetch
    await fetchAllData();
    
    // Set up auto-refresh every 60 seconds
    setInterval(fetchAllData, UPDATE_INTERVAL);
    
    console.log('Dashboard initialized. Auto-refresh enabled (60s interval)');
}

// Start the dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
