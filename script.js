// ===================================
// Bitcoin Intelligence Dashboard
// JavaScript - API Integration & Logic
// ===================================

// Global state
let dashboardData = {
    bitcoin: null,
    global: null,
    stablecoins: null,
    fearGreed: null,
    lastUpdate: null
};

// Constants
const HALVING_DATE = new Date('2024-04-20');
const UPDATE_INTERVAL = 60000; // 60 seconds

// API Endpoints
const API = {
    bitcoin: 'https://api.coingecko.com/api/v3/coins/bitcoin',
    global: 'https://api.coingecko.com/api/v3/global',
    usdt: 'https://api.coingecko.com/api/v3/coins/tether',
    usdc: 'https://api.coingecko.com/api/v3/coins/usd-coin',
    fearGreed: 'https://api.alternative.me/fng/'
};

// ===================================
// Utility Functions
// ===================================

/**
 * Format number with commas and specified decimal places
 */
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Format large numbers with K, M, B suffixes
 */
function formatLargeNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    
    if (num >= 1e12) {
        return '$' + (num / 1e12).toFixed(decimals) + 'T';
    } else if (num >= 1e9) {
        return '$' + (num / 1e9).toFixed(decimals) + 'B';
    } else if (num >= 1e6) {
        return '$' + (num / 1e6).toFixed(decimals) + 'M';
    } else if (num >= 1e3) {
        return '$' + (num / 1e3).toFixed(decimals) + 'K';
    }
    return '$' + num.toFixed(decimals);
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2 - date1) / oneDay);
}

/**
 * Update element with smooth animation
 */
function updateElement(elementId, value, animate = true) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        if (animate) {
            element.classList.remove('animate-in');
            void element.offsetWidth; // Trigger reflow
            element.classList.add('animate-in');
        }
    }
}

/**
 * Format timestamp
 */
function formatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
    });
}

// ===================================
// API Fetch Functions
// ===================================

/**
 * Fetch Bitcoin data from CoinGecko
 */
async function fetchBitcoinData() {
    try {
        const response = await fetch(API.bitcoin);
        if (!response.ok) throw new Error('Failed to fetch Bitcoin data');
        const data = await response.json();
        dashboardData.bitcoin = data;
        return data;
    } catch (error) {
        console.error('Bitcoin API Error:', error);
        return null;
    }
}

/**
 * Fetch global crypto data from CoinGecko
 */
async function fetchGlobalData() {
    try {
        const response = await fetch(API.global);
        if (!response.ok) throw new Error('Failed to fetch global data');
        const data = await response.json();
        dashboardData.global = data;
        return data;
    } catch (error) {
        console.error('Global API Error:', error);
        return null;
    }
}

/**
 * Fetch stablecoin data
 */
async function fetchStablecoinData() {
    try {
        const [usdtResponse, usdcResponse] = await Promise.all([
            fetch(API.usdt),
            fetch(API.usdc)
        ]);
        
        if (!usdtResponse.ok || !usdcResponse.ok) {
            throw new Error('Failed to fetch stablecoin data');
        }
        
        const usdtData = await usdtResponse.json();
        const usdcData = await usdcResponse.json();
        
        dashboardData.stablecoins = {
            usdt: usdtData.market_data.market_cap.usd,
            usdc: usdcData.market_data.market_cap.usd
        };
        
        return dashboardData.stablecoins;
    } catch (error) {
        console.error('Stablecoin API Error:', error);
        return null;
    }
}

/**
 * Fetch Fear & Greed Index
 */
async function fetchFearGreedData() {
    try {
        const response = await fetch(API.fearGreed);
        if (!response.ok) throw new Error('Failed to fetch Fear & Greed data');
        const data = await response.json();
        dashboardData.fearGreed = data.data[0];
        return data.data[0];
    } catch (error) {
        console.error('Fear & Greed API Error:', error);
        return null;
    }
}

// ===================================
// Calculation Functions
// ===================================

/**
 * Calculate percentage from ATH
 */
function calculateATHDistance(currentPrice, athPrice) {
    if (!currentPrice || !athPrice) return null;
    return ((currentPrice - athPrice) / athPrice) * 100;
}

/**
 * Calculate days since last halving
 */
function calculateDaysSinceHalving() {
    const today = new Date();
    return daysBetween(HALVING_DATE, today);
}

/**
 * Calculate composite risk score (0-100)
 * Based on weighted formula:
 * - % From ATH (40%)
 * - Fear & Greed (30%)
 * - 24h Change % (15%)
 * - BTC Dominance deviation (15%)
 */
function calculateRiskScore(btcData, globalData, fearGreedData) {
    try {
        // Default values if data is missing
        let score = 50; // Neutral default
        
        if (!btcData || !fearGreedData) return score;
        
        const currentPrice = btcData.market_data.current_price.usd;
        const athPrice = btcData.market_data.ath.usd;
        const change24h = btcData.market_data.price_change_percentage_24h;
        const fearGreedValue = parseFloat(fearGreedData.value);
        
        // Component 1: Distance from ATH (40% weight)
        // Closer to ATH = Higher risk
        const athDistance = Math.abs(calculateATHDistance(currentPrice, athPrice));
        const athScore = Math.max(0, 100 - athDistance); // Inverted so closer to ATH = higher score
        
        // Component 2: Fear & Greed (30% weight)
        // Higher F&G = Higher risk
        const fgScore = fearGreedValue;
        
        // Component 3: 24h Change (15% weight)
        // Large positive change = Higher risk
        const changeScore = Math.min(100, Math.max(0, 50 + (change24h * 2)));
        
        // Component 4: BTC Dominance (15% weight)
        // Deviation from historical average (~45%) indicates risk
        let domScore = 50;
        if (globalData && globalData.data.market_cap_percentage.btc) {
            const btcDom = globalData.data.market_cap_percentage.btc;
            const domDeviation = Math.abs(btcDom - 45); // 45% is historical average
            domScore = Math.min(100, 50 + (domDeviation * 3));
        }
        
        // Weighted calculation
        score = (athScore * 0.40) + (fgScore * 0.30) + (changeScore * 0.15) + (domScore * 0.15);
        
        return Math.round(Math.min(100, Math.max(0, score)));
        
    } catch (error) {
        console.error('Risk calculation error:', error);
        return 50; // Return neutral if calculation fails
    }
}

/**
 * Get risk zone classification
 */
function getRiskZone(score) {
    if (score <= 30) return { label: 'Accumulation Zone', class: 'low' };
    if (score <= 70) return { label: 'Neutral Zone', class: 'medium' };
    return { label: 'Overheated Zone', class: 'high' };
}

/**
 * Get sentiment interpretation
 */
function getSentimentInterpretation(value) {
    const val = parseFloat(value);
    if (val <= 25) return 'Extreme Fear - Potential opportunity for long-term accumulation';
    if (val <= 45) return 'Fear - Market showing caution, possible buying opportunity';
    if (val <= 55) return 'Neutral - Market balanced, consolidation phase';
    if (val <= 75) return 'Greed - Market heating up, exercise caution';
    return 'Extreme Greed - Market euphoria, consider risk management';
}

/**
 * Get sentiment classification
 */
function getSentimentClass(value) {
    const val = parseFloat(value);
    if (val <= 25) return 'extreme-fear';
    if (val <= 45) return 'fear';
    if (val <= 55) return 'neutral';
    if (val <= 75) return 'greed';
    return 'extreme-greed';
}

// ===================================
// UI Update Functions
// ===================================

/**
 * Update Live Market Overview section
 */
function updateMarketOverview(btcData, globalData) {
    if (!btcData) {
        updateElement('btcPrice', 'API Error');
        return;
    }
    
    try {
        const price = btcData.market_data.current_price.usd;
        const change24h = btcData.market_data.price_change_percentage_24h;
        const marketCap = btcData.market_data.market_cap.usd;
        const volume = btcData.market_data.total_volume.usd;
        const rank = btcData.market_cap_rank;
        
        // Update price
        updateElement('btcPrice', '$' + formatNumber(price, 2));
        
        // Update 24h change
        const changeElement = document.getElementById('priceChange');
        if (changeElement) {
            const changeText = (change24h >= 0 ? '+' : '') + formatNumber(change24h, 2) + '%';
            changeElement.textContent = changeText;
            changeElement.className = 'metric-change ' + (change24h >= 0 ? 'positive' : 'negative');
        }
        
        // Update market cap
        updateElement('marketCap', formatLargeNumber(marketCap, 2));
        updateElement('marketCapRank', rank);
        
        // Update volume
        updateElement('volume24h', formatLargeNumber(volume, 2));
        
        // Update BTC dominance
        if (globalData && globalData.data.market_cap_percentage.btc) {
            const dominance = globalData.data.market_cap_percentage.btc;
            updateElement('btcDominance', formatNumber(dominance, 2) + '%');
        }
        
    } catch (error) {
        console.error('Market overview update error:', error);
    }
}

/**
 * Update Layer 1: Price & Cycle section
 */
function updateLayer1(btcData, globalData, fearGreedData) {
    if (!btcData) return;
    
    try {
        const price = btcData.market_data.current_price.usd;
        const ath = btcData.market_data.ath.usd;
        const athDate = new Date(btcData.market_data.ath_date.usd);
        const circulatingSupply = btcData.market_data.circulating_supply;
        
        // Update current price
        updateElement('layer1Price', '$' + formatNumber(price, 2));
        
        // Update ATH
        updateElement('athPrice', '$' + formatNumber(ath, 2));
        updateElement('athDate', athDate.toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
        }));
        
        // Calculate and update ATH distance
        const athDistance = calculateATHDistance(price, ath);
        if (athDistance !== null) {
            updateElement('athDistance', formatNumber(athDistance, 2) + '%');
        }
        
        // Update days since halving
        const daysSinceHalving = calculateDaysSinceHalving();
        updateElement('daysSinceHalving', formatNumber(daysSinceHalving, 0) + ' days');
        
        // Update circulating supply
        updateElement('circulatingSupply', formatNumber(circulatingSupply, 0) + ' BTC');
        
        // Calculate and update risk score
        const riskScore = calculateRiskScore(btcData, globalData, fearGreedData);
        updateElement('riskScore', riskScore + '/100');
        
        // Update risk bar
        const riskZone = getRiskZone(riskScore);
        const riskBarFill = document.getElementById('riskBarFill');
        if (riskBarFill) {
            riskBarFill.style.width = riskScore + '%';
            riskBarFill.className = 'risk-bar-fill ' + riskZone.class;
        }
        
        updateElement('riskZone', riskZone.label);
        
    } catch (error) {
        console.error('Layer 1 update error:', error);
    }
}

/**
 * Update Layer 5: Stablecoin Liquidity section
 */
function updateLayer5(stablecoinData) {
    if (!stablecoinData) {
        updateElement('usdtMarketCap', 'Loading...');
        updateElement('usdcMarketCap', 'Loading...');
        updateElement('totalStablecoinCap', 'Loading...');
        return;
    }
    
    try {
        const usdtCap = stablecoinData.usdt;
        const usdcCap = stablecoinData.usdc;
        const totalCap = usdtCap + usdcCap;
        
        updateElement('usdtMarketCap', formatLargeNumber(usdtCap, 2));
        updateElement('usdcMarketCap', formatLargeNumber(usdcCap, 2));
        updateElement('totalStablecoinCap', formatLargeNumber(totalCap, 2));
        
    } catch (error) {
        console.error('Layer 5 update error:', error);
    }
}

/**
 * Update Layer 7: Sentiment section
 */
function updateLayer7(fearGreedData) {
    if (!fearGreedData) {
        updateElement('fearGreedValue', 'Loading...');
        return;
    }
    
    try {
        const value = fearGreedData.value;
        const classification = fearGreedData.value_classification;
        
        updateElement('fearGreedValue', value);
        updateElement('fearGreedClassification', classification);
        
        // Update sentiment label with color
        const sentimentLabel = document.getElementById('fearGreedLabel');
        if (sentimentLabel) {
            sentimentLabel.textContent = classification;
            sentimentLabel.className = 'sentiment-label ' + getSentimentClass(value);
        }
        
        // Update interpretation
        const interpretation = getSentimentInterpretation(value);
        updateElement('sentimentInterpretation', interpretation);
        
    } catch (error) {
        console.error('Layer 7 update error:', error);
    }
}

/**
 * Update last update timestamp
 */
function updateLastUpdateTime() {
    updateElement('lastUpdateTime', formatTimestamp(), false);
}

// ===================================
// Main Dashboard Functions
// ===================================

/**
 * Fetch all data from APIs
 */
async function fetchAllData() {
    console.log('Fetching dashboard data...');
    
    // Fetch all data in parallel
    const [btcData, globalData, stablecoinData, fearGreedData] = await Promise.all([
        fetchBitcoinData(),
        fetchGlobalData(),
        fetchStablecoinData(),
        fetchFearGreedData()
    ]);
    
    dashboardData.lastUpdate = new Date();
    
    return {
        btcData,
        globalData,
        stablecoinData,
        fearGreedData
    };
}

/**
 * Update entire dashboard UI
 */
function updateDashboard(data) {
    const { btcData, globalData, stablecoinData, fearGreedData } = data;
    
    // Update all sections
    updateMarketOverview(btcData, globalData);
    updateLayer1(btcData, globalData, fearGreedData);
    updateLayer5(stablecoinData);
    updateLayer7(fearGreedData);
    
    // Update timestamp
    updateLastUpdateTime();
    
    console.log('Dashboard updated successfully');
}

/**
 * Initialize dashboard
 */
async function initDashboard() {
    console.log('Initializing Bitcoin Intelligence Dashboard...');
    
    try {
        // Initial data fetch
        const data = await fetchAllData();
        updateDashboard(data);
        
        // Set up auto-refresh
        setInterval(async () => {
            try {
                const data = await fetchAllData();
                updateDashboard(data);
            } catch (error) {
                console.error('Auto-refresh error:', error);
            }
        }, UPDATE_INTERVAL);
        
        console.log('Dashboard initialized. Auto-refresh every 60 seconds.');
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        
        // Show error message in UI
        updateElement('btcPrice', 'Failed to load data');
        updateElement('lastUpdateTime', 'Error - Please refresh page');
    }
}

// ===================================
// Initialize on page load
// ===================================

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
