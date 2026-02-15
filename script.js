// ===================================
// Bitcoin Intelligence Dashboard
// Real-Time Data Integration
// ===================================

// Global state
let dashboardData = {
    bitcoin: null,
    global: null,
    fearGreed: null,
    stablecoins: {
        usdt: null,
        usdc: null
    }
};

// Constants
const HALVING_DATE = new Date('2024-04-20');
const UPDATE_INTERVAL = 60000; // 60 seconds
let updateTimer = null;

// ===================================
// API Fetch Functions
// ===================================

/**
 * Fetch Bitcoin market data from CoinGecko
 */
async function fetchBitcoinData() {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false'
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        dashboardData.bitcoin = data;
        return data;
    } catch (error) {
        console.error('Error fetching Bitcoin data:', error);
        updateStatusIndicator('error', 'Connection Error');
        return null;
    }
}

/**
 * Fetch global crypto market data from CoinGecko
 */
async function fetchGlobalData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/global');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        dashboardData.global = data.data;
        return data.data;
    } catch (error) {
        console.error('Error fetching global data:', error);
        return null;
    }
}

/**
 * Fetch Fear & Greed Index
 */
async function fetchFearGreedIndex() {
    try {
        const response = await fetch('https://api.alternative.me/fng/');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        dashboardData.fearGreed = data.data[0];
        return data.data[0];
    } catch (error) {
        console.error('Error fetching Fear & Greed data:', error);
        return null;
    }
}

/**
 * Fetch stablecoin data (USDT and USDC)
 */
async function fetchStablecoinData() {
    try {
        const [usdtResponse, usdcResponse] = await Promise.all([
            fetch('https://api.coingecko.com/api/v3/coins/tether?localization=false&tickers=false&community_data=false&developer_data=false'),
            fetch('https://api.coingecko.com/api/v3/coins/usd-coin?localization=false&tickers=false&community_data=false&developer_data=false')
        ]);
        
        if (!usdtResponse.ok || !usdcResponse.ok) {
            throw new Error('Failed to fetch stablecoin data');
        }
        
        const [usdtData, usdcData] = await Promise.all([
            usdtResponse.json(),
            usdcResponse.json()
        ]);
        
        dashboardData.stablecoins.usdt = usdtData;
        dashboardData.stablecoins.usdc = usdcData;
        
        return {
            usdt: usdtData,
            usdc: usdcData
        };
    } catch (error) {
        console.error('Error fetching stablecoin data:', error);
        return null;
    }
}

// ===================================
// Data Processing & Calculations
// ===================================

/**
 * Calculate percentage from All-Time High
 */
function calculateFromATH(currentPrice, athPrice) {
    if (!currentPrice || !athPrice) return null;
    return ((currentPrice - athPrice) / athPrice) * 100;
}

/**
 * Calculate days since last halving
 */
function calculateDaysSinceHalving() {
    const now = new Date();
    const diffTime = Math.abs(now - HALVING_DATE);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Calculate Composite Risk Score (0-100)
 * Weighted formula based on multiple factors
 */
function calculateRiskScore(btcData, fearGreedValue, globalData) {
    if (!btcData || !fearGreedValue || !globalData) return null;
    
    const price = btcData.market_data.current_price.usd;
    const ath = btcData.market_data.ath.usd;
    const change24h = btcData.market_data.price_change_percentage_24h;
    const btcDominance = globalData.market_cap_percentage.btc;
    
    // Factor 1: Distance from ATH (0-100, inverted - closer to ATH = higher risk)
    const athDistance = ((price / ath) * 100);
    const athScore = athDistance; // Close to ATH = high score
    
    // Factor 2: Fear & Greed (0-100, direct)
    const fearGreedScore = parseFloat(fearGreedValue);
    
    // Factor 3: 24h change (normalized to 0-100)
    // High positive change = higher risk, high negative = lower risk
    const changeScore = Math.min(100, Math.max(0, (change24h + 10) * 5));
    
    // Factor 4: BTC Dominance (normalized)
    // Lower dominance often means alt season / late cycle
    const dominanceScore = 100 - btcDominance;
    
    // Weighted average
    const riskScore = (
        (athScore * 0.35) +           // 35% weight
        (fearGreedScore * 0.35) +     // 35% weight
        (changeScore * 0.15) +        // 15% weight
        (dominanceScore * 0.15)       // 15% weight
    );
    
    return Math.round(Math.min(100, Math.max(0, riskScore)));
}

/**
 * Get risk zone classification
 */
function getRiskZone(score) {
    if (score <= 30) {
        return { zone: 'Accumulation', class: 'accumulation' };
    } else if (score <= 70) {
        return { zone: 'Neutral', class: 'neutral' };
    } else {
        return { zone: 'Overheated', class: 'overheated' };
    }
}

/**
 * Get sentiment interpretation
 */
function getSentimentInterpretation(value) {
    const v = parseInt(value);
    if (v <= 20) return 'Extreme Fear';
    if (v <= 40) return 'Fear Phase';
    if (v <= 60) return 'Neutral Zone';
    if (v <= 80) return 'Greed Phase';
    return 'Extreme Greed';
}

// ===================================
// UI Update Functions
// ===================================

/**
 * Update status indicator
 */
function updateStatusIndicator(status, text) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (status === 'live') {
        statusDot.style.background = 'var(--accent-green)';
        statusText.textContent = text || 'Live';
        statusText.style.color = 'var(--accent-green)';
    } else if (status === 'updating') {
        statusDot.style.background = 'var(--accent-yellow)';
        statusText.textContent = text || 'Updating...';
        statusText.style.color = 'var(--accent-yellow)';
    } else if (status === 'error') {
        statusDot.style.background = 'var(--accent-red)';
        statusText.textContent = text || 'Error';
        statusText.style.color = 'var(--accent-red)';
    }
}

/**
 * Update last update timestamp
 */
function updateTimestamp() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = timeString;
    }
}

/**
 * Format number with commas
 */
function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined) return '--';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Format currency
 */
function formatCurrency(num, decimals = 0) {
    if (num === null || num === undefined) return '$--';
    return '$' + formatNumber(num, decimals);
}

/**
 * Format percentage
 */
function formatPercentage(num, decimals = 2) {
    if (num === null || num === undefined) return '--%';
    const sign = num >= 0 ? '+' : '';
    return sign + num.toFixed(decimals) + '%';
}

/**
 * Format large numbers (billions, millions)
 */
function formatLargeNumber(num, decimals = 2) {
    if (num === null || num === undefined) return '--';
    
    if (num >= 1e9) {
        return formatNumber(num / 1e9, decimals) + ' B';
    } else if (num >= 1e6) {
        return formatNumber(num / 1e6, decimals) + ' M';
    }
    return formatNumber(num, decimals);
}

/**
 * Update Market Overview section
 */
function updateMarketOverview() {
    const btc = dashboardData.bitcoin;
    const global = dashboardData.global;
    
    if (!btc || !global) return;
    
    const marketData = btc.market_data;
    
    // Current Price
    const priceElement = document.getElementById('currentPrice');
    if (priceElement) {
        priceElement.textContent = formatCurrency(marketData.current_price.usd, 0);
    }
    
    // 24h Change
    const changeElement = document.getElementById('priceChange');
    if (changeElement) {
        const change = marketData.price_change_percentage_24h;
        changeElement.textContent = formatPercentage(change);
        changeElement.className = 'card-change ' + (change >= 0 ? 'positive' : 'negative');
    }
    
    // Market Cap
    const mcapElement = document.getElementById('marketCap');
    if (mcapElement) {
        mcapElement.textContent = '$' + formatLargeNumber(marketData.market_cap.usd, 2);
    }
    
    // Market Cap Rank
    const rankElement = document.getElementById('marketCapRank');
    if (rankElement) {
        rankElement.textContent = btc.market_cap_rank || '1';
    }
    
    // 24h Volume
    const volumeElement = document.getElementById('volume24h');
    if (volumeElement) {
        volumeElement.textContent = '$' + formatLargeNumber(marketData.total_volume.usd, 2);
    }
    
    // BTC Dominance
    const dominanceElement = document.getElementById('btcDominance');
    if (dominanceElement) {
        const dominance = global.market_cap_percentage.btc;
        dominanceElement.textContent = dominance.toFixed(2) + '%';
    }
}

/**
 * Update Layer 1: Price & Cycle
 */
function updateLayer1() {
    const btc = dashboardData.bitcoin;
    const fearGreed = dashboardData.fearGreed;
    const global = dashboardData.global;
    
    if (!btc) return;
    
    const marketData = btc.market_data;
    
    // Current Price
    const layer1PriceElement = document.getElementById('layer1Price');
    if (layer1PriceElement) {
        layer1PriceElement.textContent = formatCurrency(marketData.current_price.usd, 0);
    }
    
    // All-Time High
    const athPriceElement = document.getElementById('athPrice');
    if (athPriceElement) {
        athPriceElement.textContent = formatCurrency(marketData.ath.usd, 0);
    }
    
    const athDateElement = document.getElementById('athDate');
    if (athDateElement && marketData.ath_date.usd) {
        const athDate = new Date(marketData.ath_date.usd);
        athDateElement.textContent = athDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    // % From ATH
    const fromAthValue = calculateFromATH(marketData.current_price.usd, marketData.ath.usd);
    const fromAthElement = document.getElementById('fromAth');
    const fromAthLabelElement = document.getElementById('fromAthLabel');
    
    if (fromAthElement && fromAthValue !== null) {
        fromAthElement.textContent = formatPercentage(fromAthValue);
        
        if (fromAthLabelElement) {
            if (fromAthValue >= -5) {
                fromAthLabelElement.textContent = 'Near Peak';
                fromAthElement.style.color = 'var(--accent-red)';
            } else if (fromAthValue >= -30) {
                fromAthLabelElement.textContent = 'Strong Zone';
                fromAthElement.style.color = 'var(--accent-yellow)';
            } else {
                fromAthLabelElement.textContent = 'Accumulation Zone';
                fromAthElement.style.color = 'var(--accent-green)';
            }
        }
    }
    
    // Days Since Halving
    const daysSinceHalvingElement = document.getElementById('daysSinceHalving');
    if (daysSinceHalvingElement) {
        const days = calculateDaysSinceHalving();
        daysSinceHalvingElement.textContent = formatNumber(days, 0);
    }
    
    // Circulating Supply
    const supplyElement = document.getElementById('circulatingSupply');
    if (supplyElement) {
        const supply = marketData.circulating_supply;
        supplyElement.textContent = formatNumber(supply / 1e6, 2) + ' M';
    }
    
    // Composite Risk Score
    if (fearGreed && global) {
        const riskScore = calculateRiskScore(btc, fearGreed.value, global);
        const riskScoreElement = document.getElementById('riskScore');
        const riskBarFillElement = document.getElementById('riskBarFill');
        const riskZoneElement = document.getElementById('riskZone');
        
        if (riskScore !== null && riskScoreElement) {
            riskScoreElement.textContent = riskScore;
            
            if (riskBarFillElement) {
                riskBarFillElement.style.width = riskScore + '%';
                
                const { zone, class: zoneClass } = getRiskZone(riskScore);
                riskBarFillElement.className = 'risk-bar-fill ' + zoneClass;
                
                if (riskZoneElement) {
                    riskZoneElement.textContent = zone;
                }
            }
        }
    }
}

/**
 * Update Layer 5: Stablecoin Liquidity
 */
function updateLayer5() {
    const { usdt, usdc } = dashboardData.stablecoins;
    
    if (!usdt || !usdc) return;
    
    // USDT Market Cap
    const usdtElement = document.getElementById('usdtMarketCap');
    if (usdtElement) {
        const usdtMcap = usdt.market_data.market_cap.usd;
        usdtElement.textContent = '$' + formatLargeNumber(usdtMcap, 2);
    }
    
    // USDC Market Cap
    const usdcElement = document.getElementById('usdcMarketCap');
    if (usdcElement) {
        const usdcMcap = usdc.market_data.market_cap.usd;
        usdcElement.textContent = '$' + formatLargeNumber(usdcMcap, 2);
    }
    
    // Total Stablecoin
    const totalElement = document.getElementById('totalStablecoin');
    if (totalElement) {
        const total = usdt.market_data.market_cap.usd + usdc.market_data.market_cap.usd;
        totalElement.textContent = '$' + formatLargeNumber(total, 2);
    }
}

/**
 * Update Layer 7: Sentiment
 */
function updateLayer7() {
    const fearGreed = dashboardData.fearGreed;
    
    if (!fearGreed) return;
    
    const value = parseInt(fearGreed.value);
    
    // Fear & Greed Value
    const valueElement = document.getElementById('fearGreedValue');
    if (valueElement) {
        valueElement.textContent = value;
    }
    
    // Sentiment Bar
    const barElement = document.getElementById('sentimentBarFill');
    if (barElement) {
        barElement.style.width = value + '%';
    }
    
    // Classification
    const classElement = document.getElementById('fearGreedClassification');
    if (classElement) {
        classElement.textContent = fearGreed.value_classification;
    }
    
    // Fear & Greed Label
    const labelElement = document.getElementById('fearGreedLabel');
    if (labelElement) {
        if (value <= 25) {
            labelElement.textContent = 'Extreme Fear - Strong Buy Signal';
        } else if (value <= 45) {
            labelElement.textContent = 'Fear - Accumulation Phase';
        } else if (value <= 55) {
            labelElement.textContent = 'Neutral - Market Balance';
        } else if (value <= 75) {
            labelElement.textContent = 'Greed - Caution Advised';
        } else {
            labelElement.textContent = 'Extreme Greed - High Risk';
        }
    }
    
    // Interpretation
    const interpElement = document.getElementById('sentimentInterpretation');
    if (interpElement) {
        interpElement.textContent = getSentimentInterpretation(value);
    }
}

/**
 * Update all dashboard sections
 */
function updateDashboard() {
    updateMarketOverview();
    updateLayer1();
    updateLayer5();
    updateLayer7();
    updateTimestamp();
}

// ===================================
// Main Data Fetch & Update Flow
// ===================================

/**
 * Fetch all data and update dashboard
 */
async function fetchAllData() {
    updateStatusIndicator('updating', 'Updating...');
    
    try {
        // Fetch all data in parallel
        await Promise.all([
            fetchBitcoinData(),
            fetchGlobalData(),
            fetchFearGreedIndex(),
            fetchStablecoinData()
        ]);
        
        // Update dashboard with new data
        updateDashboard();
        
        // Update status
        updateStatusIndicator('live', 'Live');
        
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        updateStatusIndicator('error', 'Update Failed');
    }
}

/**
 * Initialize dashboard
 */
async function initDashboard() {
    console.log('Initializing Bitcoin Intelligence Dashboard...');
    
    // Initial data fetch
    await fetchAllData();
    
    // Set up auto-refresh
    if (updateTimer) {
        clearInterval(updateTimer);
    }
    
    updateTimer = setInterval(() => {
        fetchAllData();
    }, UPDATE_INTERVAL);
    
    console.log(`Dashboard initialized. Auto-refresh every ${UPDATE_INTERVAL / 1000} seconds.`);
}

// ===================================
// Initialize on Page Load
// ===================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    // DOM is already ready
    initDashboard();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
});
