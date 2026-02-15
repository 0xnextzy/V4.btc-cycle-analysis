/* ============================================
   Bitcoin Intelligence Dashboard - JavaScript
   Real-Time Data Integration & Calculations
   ============================================ */

// ========== CONFIGURATION ==========
const HALVING_DATE = new Date('2024-04-20');
const UPDATE_INTERVAL = 60000; // 60 seconds
const API_ENDPOINTS = {
    bitcoin: 'https://api.coingecko.com/api/v3/coins/bitcoin',
    global: 'https://api.coingecko.com/api/v3/global',
    usdt: 'https://api.coingecko.com/api/v3/coins/tether',
    usdc: 'https://api.coingecko.com/api/v3/coins/usd-coin',
    fearGreed: 'https://api.alternative.me/fng/'
};

// ========== STATE ==========
let marketData = {
    bitcoin: null,
    global: null,
    stablecoins: null,
    sentiment: null
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Format number with commas and optional decimals
 */
function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

/**
 * Format large numbers with K, M, B, T suffixes
 */
function formatLargeNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return `$${(num / 1e12).toFixed(decimals)}T`;
    if (absNum >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (absNum >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (absNum >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
}

/**
 * Format percentage with sign
 */
function formatPercentage(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(decimals)}%`;
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Update element with smooth transition
 */
function updateElement(elementId, value, applyClass = null) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.style.opacity = '0.5';
    setTimeout(() => {
        element.textContent = value;
        if (applyClass) {
            element.className = applyClass;
        }
        element.style.opacity = '1';
    }, 150);
}

// ========== API FETCH FUNCTIONS ==========

/**
 * Fetch Bitcoin data from CoinGecko
 */
async function fetchBitcoinData() {
    try {
        const response = await fetch(API_ENDPOINTS.bitcoin);
        if (!response.ok) throw new Error('Bitcoin API request failed');
        const data = await response.json();
        marketData.bitcoin = data;
        return data;
    } catch (error) {
        console.error('Error fetching Bitcoin data:', error);
        return null;
    }
}

/**
 * Fetch global market data from CoinGecko
 */
async function fetchGlobalData() {
    try {
        const response = await fetch(API_ENDPOINTS.global);
        if (!response.ok) throw new Error('Global API request failed');
        const data = await response.json();
        marketData.global = data;
        return data;
    } catch (error) {
        console.error('Error fetching global data:', error);
        return null;
    }
}

/**
 * Fetch stablecoin data
 */
async function fetchStablecoinData() {
    try {
        const [usdtResponse, usdcResponse] = await Promise.all([
            fetch(API_ENDPOINTS.usdt),
            fetch(API_ENDPOINTS.usdc)
        ]);
        
        if (!usdtResponse.ok || !usdcResponse.ok) {
            throw new Error('Stablecoin API request failed');
        }
        
        const usdtData = await usdtResponse.json();
        const usdcData = await usdcResponse.json();
        
        marketData.stablecoins = {
            usdt: usdtData.market_data.market_cap.usd,
            usdc: usdcData.market_data.market_cap.usd,
            total: usdtData.market_data.market_cap.usd + usdcData.market_data.market_cap.usd
        };
        
        return marketData.stablecoins;
    } catch (error) {
        console.error('Error fetching stablecoin data:', error);
        return null;
    }
}

/**
 * Fetch Fear & Greed Index
 */
async function fetchFearGreedIndex() {
    try {
        const response = await fetch(API_ENDPOINTS.fearGreed);
        if (!response.ok) throw new Error('Fear & Greed API request failed');
        const data = await response.json();
        marketData.sentiment = data.data[0];
        return data.data[0];
    } catch (error) {
        console.error('Error fetching Fear & Greed data:', error);
        return null;
    }
}

// ========== CALCULATION FUNCTIONS ==========

/**
 * Calculate percentage from ATH
 */
function calculatePercentFromATH(currentPrice, ath) {
    if (!currentPrice || !ath) return null;
    return ((currentPrice - ath) / ath) * 100;
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
 * Weighted formula based on:
 * - % From ATH (40% weight)
 * - Fear & Greed Index (30% weight)
 * - 24h Change % (15% weight)
 * - BTC Dominance (15% weight)
 */
function calculateCompositeRiskScore(btcData, globalData, sentimentData) {
    try {
        if (!btcData || !globalData || !sentimentData) return null;
        
        const currentPrice = btcData.market_data.current_price.usd;
        const ath = btcData.market_data.ath.usd;
        const change24h = btcData.market_data.price_change_percentage_24h;
        const btcDominance = globalData.data.market_cap_percentage.btc;
        const fearGreed = parseInt(sentimentData.value);
        
        // Normalize % from ATH (closer to ATH = higher risk)
        const percentFromATH = calculatePercentFromATH(currentPrice, ath);
        const athScore = Math.max(0, Math.min(100, 100 + percentFromATH)); // -50% = 50, 0% = 100
        
        // Fear & Greed already 0-100
        const sentimentScore = fearGreed;
        
        // Normalize 24h change (-10% to +10% range mapped to 0-100)
        const changeScore = Math.max(0, Math.min(100, 50 + (change24h * 5)));
        
        // Normalize BTC Dominance (40-70% range, higher = lower risk)
        const dominanceScore = Math.max(0, Math.min(100, 100 - ((btcDominance - 40) * 2)));
        
        // Weighted composite
        const compositeScore = (
            athScore * 0.40 +
            sentimentScore * 0.30 +
            changeScore * 0.15 +
            dominanceScore * 0.15
        );
        
        return Math.round(compositeScore);
    } catch (error) {
        console.error('Error calculating risk score:', error);
        return null;
    }
}

/**
 * Get risk zone classification
 */
function getRiskZone(score) {
    if (score === null || score === undefined) return { zone: 'Unknown', class: '' };
    
    if (score <= 30) {
        return { zone: 'Accumulation', class: 'accumulation' };
    } else if (score <= 70) {
        return { zone: 'Neutral', class: 'neutral' };
    } else {
        return { zone: 'Overheated', class: 'overheated' };
    }
}

/**
 * Get risk bar color based on score
 */
function getRiskBarColor(score) {
    if (score <= 30) return '#10b981'; // Green
    if (score <= 70) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
}

// ========== UI UPDATE FUNCTIONS ==========

/**
 * Update Live Market Overview section
 */
function updateMarketOverview(btcData, globalData) {
    if (!btcData) {
        console.warn('No Bitcoin data available for market overview');
        return;
    }
    
    const price = btcData.market_data.current_price.usd;
    const change24h = btcData.market_data.price_change_percentage_24h;
    const marketCap = btcData.market_data.market_cap.usd;
    const volume = btcData.market_data.total_volume.usd;
    const supply = btcData.market_data.circulating_supply;
    const ath = btcData.market_data.ath.usd;
    const athDate = btcData.market_data.ath_date.usd;
    const rank = btcData.market_cap_rank;
    
    updateElement('currentPrice', `$${formatNumber(price, 2)}`);
    updateElement('marketCap', formatLargeNumber(marketCap));
    updateElement('volume24h', formatLargeNumber(volume));
    updateElement('circulatingSupply', `${formatNumber(supply, 0)} BTC`);
    updateElement('allTimeHigh', `$${formatNumber(ath, 2)}`);
    updateElement('athDate', formatDate(athDate));
    updateElement('marketCapRank', rank);
    
    // 24h change with color
    const changeElement = document.getElementById('priceChange24h');
    if (changeElement) {
        changeElement.textContent = formatPercentage(change24h);
        changeElement.className = change24h >= 0 ? 'card-change positive' : 'card-change negative';
    }
    
    // BTC Dominance
    if (globalData && globalData.data) {
        const dominance = globalData.data.market_cap_percentage.btc;
        updateElement('btcDominance', `${dominance.toFixed(2)}%`);
    }
}

/**
 * Update Layer 1: Price & Cycle
 */
function updatePriceCycle(btcData, globalData, sentimentData) {
    if (!btcData) return;
    
    const price = btcData.market_data.current_price.usd;
    const ath = btcData.market_data.ath.usd;
    const percentFromATH = calculatePercentFromATH(price, ath);
    const daysSinceHalving = calculateDaysSinceHalving();
    
    updateElement('layer1Price', `$${formatNumber(price, 2)}`);
    updateElement('layer1ATH', `$${formatNumber(ath, 2)}`);
    updateElement('percentFromATH', formatPercentage(percentFromATH));
    updateElement('daysSinceHalving', formatNumber(daysSinceHalving));
    
    // Composite Risk Score
    const riskScore = calculateCompositeRiskScore(btcData, globalData, sentimentData);
    if (riskScore !== null) {
        const { zone, class: zoneClass } = getRiskZone(riskScore);
        
        updateElement('riskScore', riskScore);
        
        const riskZoneElement = document.getElementById('riskZone');
        if (riskZoneElement) {
            riskZoneElement.textContent = zone;
            riskZoneElement.className = `risk-zone ${zoneClass}`;
        }
        
        // Update risk bar
        const riskBar = document.getElementById('riskBar');
        if (riskBar) {
            riskBar.style.width = `${riskScore}%`;
            riskBar.style.backgroundColor = getRiskBarColor(riskScore);
        }
    }
}

/**
 * Update Layer 5: Stablecoin Liquidity
 */
function updateStablecoinLiquidity(stablecoinData) {
    if (!stablecoinData) {
        console.warn('No stablecoin data available');
        return;
    }
    
    updateElement('usdtMarketCap', formatLargeNumber(stablecoinData.usdt));
    updateElement('usdcMarketCap', formatLargeNumber(stablecoinData.usdc));
    updateElement('totalStablecoinCap', formatLargeNumber(stablecoinData.total));
}

/**
 * Update Layer 7: Sentiment
 */
function updateSentiment(sentimentData) {
    if (!sentimentData) {
        console.warn('No sentiment data available');
        return;
    }
    
    const value = parseInt(sentimentData.value);
    const classification = sentimentData.value_classification;
    
    updateElement('fearGreedValue', value);
    
    const classElement = document.getElementById('fearGreedClassification');
    if (classElement) {
        classElement.textContent = classification;
        classElement.className = 'sentiment-label';
        
        // Apply color based on classification
        if (classification.toLowerCase().includes('fear')) {
            classElement.style.background = 'rgba(239, 68, 68, 0.15)';
            classElement.style.color = '#ef4444';
        } else if (classification.toLowerCase().includes('greed')) {
            classElement.style.background = 'rgba(16, 185, 129, 0.15)';
            classElement.style.color = '#10b981';
        } else {
            classElement.style.background = 'rgba(245, 158, 11, 0.15)';
            classElement.style.color = '#f59e0b';
        }
    }
    
    // Sentiment interpretation
    let interpretation = '';
    if (value < 25) {
        interpretation = 'Market shows extreme fear. Historically favorable for accumulation.';
    } else if (value < 45) {
        interpretation = 'Market sentiment is fearful. Potential buying opportunity.';
    } else if (value < 55) {
        interpretation = 'Market sentiment is neutral. Balanced risk/reward.';
    } else if (value < 75) {
        interpretation = 'Market sentiment is greedy. Caution advised.';
    } else {
        interpretation = 'Market shows extreme greed. High risk territory.';
    }
    updateElement('sentimentInterpretation', interpretation);
    
    // Sentiment signal
    const signalElement = document.getElementById('sentimentSignal');
    if (signalElement) {
        if (value < 30) {
            signalElement.textContent = '🟢 Contrarian Buy Zone';
            signalElement.style.background = 'rgba(16, 185, 129, 0.15)';
            signalElement.style.color = '#10b981';
        } else if (value < 70) {
            signalElement.textContent = '🟡 Neutral Zone';
            signalElement.style.background = 'rgba(245, 158, 11, 0.15)';
            signalElement.style.color = '#f59e0b';
        } else {
            signalElement.textContent = '🔴 Caution Zone';
            signalElement.style.background = 'rgba(239, 68, 68, 0.15)';
            signalElement.style.color = '#ef4444';
        }
    }
}

/**
 * Update last update timestamp
 */
function updateTimestamp() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    updateElement('lastUpdateTime', timeString);
}

// ========== MAIN DATA FETCH & UPDATE ==========

/**
 * Fetch all data and update dashboard
 */
async function updateDashboard() {
    console.log('Fetching dashboard data...');
    
    try {
        // Fetch all data in parallel
        const [btcData, globalData, stablecoinData, sentimentData] = await Promise.all([
            fetchBitcoinData(),
            fetchGlobalData(),
            fetchStablecoinData(),
            fetchFearGreedIndex()
        ]);
        
        // Update all sections
        if (btcData && globalData) {
            updateMarketOverview(btcData, globalData);
            updatePriceCycle(btcData, globalData, sentimentData);
        }
        
        if (stablecoinData) {
            updateStablecoinLiquidity(stablecoinData);
        }
        
        if (sentimentData) {
            updateSentiment(sentimentData);
        }
        
        updateTimestamp();
        console.log('Dashboard updated successfully');
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        // Dashboard will show last successful data or fallback values
    }
}

// ========== INITIALIZATION ==========

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Bitcoin Intelligence Dashboard initialized');
    
    // Initial data fetch
    updateDashboard();
    
    // Set up auto-refresh every 60 seconds
    setInterval(updateDashboard, UPDATE_INTERVAL);
    
    console.log(`Auto-refresh enabled: every ${UPDATE_INTERVAL / 1000} seconds`);
});

// ========== ERROR HANDLING ==========

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
