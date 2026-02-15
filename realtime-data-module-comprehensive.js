/* ================================
   Bitcoin Intelligence Dashboard
   Production JavaScript
   ================================ */

// Configuration
const CONFIG = {
    refreshInterval: 60000, // 60 seconds
    apis: {
        coingecko: 'https://api.coingecko.com/api/v3',
        fearGreed: 'https://api.alternative.me/fng/'
    },
    lastHalvingDate: new Date('2024-04-20'), // Bitcoin halving date
    bitcoinATH: {
        price: 108353,
        date: '2025-01-20'
    }
};

// State Management
let refreshTimer = null;
let dashboardData = {
    bitcoin: null,
    stablecoins: null,
    fearGreed: null
};

/* ================================
   Initialization
   ================================ */

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        await fetchAllData();
        updateAllDisplays();
        hideLoadingOverlay();
        startAutoRefresh();
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        showError('Failed to initialize dashboard. Retrying...');
        setTimeout(initializeDashboard, 5000);
    }
}

/* ================================
   Data Fetching
   ================================ */

async function fetchAllData() {
    try {
        // Fetch all data in parallel
        const [bitcoinData, stablecoinData, fearGreedData] = await Promise.allSettled([
            fetchBitcoinData(),
            fetchStablecoinData(),
            fetchFearGreedIndex()
        ]);

        // Handle Bitcoin data
        if (bitcoinData.status === 'fulfilled') {
            dashboardData.bitcoin = bitcoinData.value;
        } else {
            console.error('Bitcoin data fetch failed:', bitcoinData.reason);
        }

        // Handle Stablecoin data
        if (stablecoinData.status === 'fulfilled') {
            dashboardData.stablecoins = stablecoinData.value;
        } else {
            console.error('Stablecoin data fetch failed:', stablecoinData.reason);
        }

        // Handle Fear & Greed data
        if (fearGreedData.status === 'fulfilled') {
            dashboardData.fearGreed = fearGreedData.value;
        } else {
            console.error('Fear & Greed data fetch failed:', fearGreedData.reason);
        }

        updateLastUpdateTime();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

async function fetchBitcoinData() {
    const response = await fetch(
        `${CONFIG.apis.coingecko}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
    );
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

async function fetchStablecoinData() {
    // Fetch USDT and USDC data
    const response = await fetch(
        `${CONFIG.apis.coingecko}/coins/markets?vs_currency=usd&ids=tether,usd-coin&order=market_cap_desc`
    );
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

async function fetchFearGreedIndex() {
    const response = await fetch(`${CONFIG.apis.fearGreed}?limit=1`);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data[0];
}

/* ================================
   Display Updates
   ================================ */

function updateAllDisplays() {
    updateLiveMetrics();
    updateLayer1();
    updateLayer2();
    updateLayer3();
    updateLayer4();
    updateLayer5();
    updateLayer6();
    updateLayer7();
    updateCycleScore();
}

function updateLiveMetrics() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const marketData = btc.market_data;

    // BTC Price
    updateElement('btcPrice', formatCurrency(marketData.current_price.usd));
    
    // 24h Change
    const change24h = marketData.price_change_percentage_24h;
    const changeElement = document.getElementById('change24h');
    const changeIndicator = document.getElementById('priceChange');
    
    updateElement('change24h', formatPercentage(change24h), change24h >= 0 ? 'text-green' : 'text-red');
    
    if (changeIndicator) {
        changeIndicator.textContent = change24h >= 0 ? '▲' : '▼';
        changeIndicator.className = `metric-change ${change24h >= 0 ? 'positive' : 'negative'}`;
    }

    // Market Cap
    updateElement('marketCap', formatLargeNumber(marketData.market_cap.usd));

    // 24h Volume
    updateElement('volume24h', formatLargeNumber(marketData.total_volume.usd));

    // Circulating Supply
    updateElement('circulatingSupply', `${formatNumber(marketData.circulating_supply)} BTC`);

    // BTC Dominance
    updateElement('btcDominance', `${marketData.market_cap_percentage?.btc?.toFixed(2) || '—'}%`);
}

function updateLayer1() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const marketData = btc.market_data;
    const currentPrice = marketData.current_price.usd;
    const ath = CONFIG.bitcoinATH.price;

    // Current Price
    updateElement('l1CurrentPrice', formatCurrency(currentPrice));

    // All-Time High
    updateElement('l1ATH', formatCurrency(ath));

    // % From ATH
    const fromATH = ((currentPrice - ath) / ath) * 100;
    updateElement('l1FromATH', formatPercentage(fromATH), fromATH >= 0 ? 'text-green' : 'text-red');

    // Days Since Halving
    const daysSinceHalving = Math.floor((new Date() - CONFIG.lastHalvingDate) / (1000 * 60 * 60 * 24));
    updateElement('l1DaysSinceHalving', `${daysSinceHalving} days`);

    // 200 Week MA (placeholder - calculated estimate)
    const estimated200MA = currentPrice * 0.45; // Rough estimate
    updateElement('l1MA200', formatCurrency(estimated200MA));
}

function updateLayer2() {
    // On-chain metrics (placeholders with realistic values)
    updateElement('l2MVRV', '1.85');
    updateElement('l2NUPL', '0.42');
    updateElement('l2RealizedCap', '$850B');
    updateElement('l2ExchangeBalance', '2.35M BTC');
}

function updateLayer3() {
    // Macro liquidity metrics (placeholders)
    updateElement('l3DXY', '106.42');
    updateElement('l3FedRate', '4.50%');
    updateElement('l3SP500', '5,950');
    updateElement('l3VIX', '14.25');
}

function updateLayer4() {
    // Institutional flow (placeholders)
    updateElement('l4ETFAUM', '$95.2B');
    updateElement('l4ETFInflow', '+$2.1B');
    updateElement('l4Holdings', '1.05M BTC');
}

function updateLayer5() {
    if (!dashboardData.stablecoins) {
        updateElement('l5TotalStable', 'Loading...');
        updateElement('l5USDT', 'Loading...');
        updateElement('l5USDC', 'Loading...');
        updateElement('l5StableDom', 'Loading...');
        return;
    }

    const usdt = dashboardData.stablecoins.find(coin => coin.id === 'tether');
    const usdc = dashboardData.stablecoins.find(coin => coin.id === 'usd-coin');

    if (usdt) {
        updateElement('l5USDT', formatLargeNumber(usdt.market_cap));
    }

    if (usdc) {
        updateElement('l5USDC', formatLargeNumber(usdc.market_cap));
    }

    if (usdt && usdc) {
        const totalStable = usdt.market_cap + usdc.market_cap;
        updateElement('l5TotalStable', formatLargeNumber(totalStable));
        
        // Calculate stablecoin dominance
        if (dashboardData.bitcoin) {
            const btcMarketCap = dashboardData.bitcoin.market_data.market_cap.usd;
            const totalCrypto = btcMarketCap * 2; // Rough estimate
            const stableDom = (totalStable / totalCrypto) * 100;
            updateElement('l5StableDom', `${stableDom.toFixed(2)}%`);
        }
    }
}

function updateLayer6() {
    // Derivatives metrics (placeholders)
    updateElement('l6OpenInterest', '$28.5B');
    updateElement('l6FundingRate', '0.0085%');
    updateElement('l6LongShort', '1.15');
    updateElement('l6Liquidations', '$95M/24h');
}

function updateLayer7() {
    // Fear & Greed Index
    if (dashboardData.fearGreed) {
        const fgValue = parseInt(dashboardData.fearGreed.value);
        const fgLabel = dashboardData.fearGreed.value_classification;
        
        updateElement('l7FearGreed', fgValue);
        updateElement('sentimentLabel', fgLabel);
        
        // Update sentiment bar
        const sentimentFill = document.getElementById('sentimentFill');
        if (sentimentFill) {
            sentimentFill.style.width = `${fgValue}%`;
        }
    } else {
        updateElement('l7FearGreed', '—');
        updateElement('sentimentLabel', 'Loading...');
    }

    // Correlation metrics (placeholders)
    updateElement('l7BTCSPXCorr', '0.68');
    updateElement('l7BTCGoldCorr', '0.42');
    updateElement('l7SocialVolume', 'High');
}

function updateCycleScore() {
    if (!dashboardData.bitcoin || !dashboardData.fearGreed) return;

    const btc = dashboardData.bitcoin;
    const currentPrice = btc.market_data.current_price.usd;
    const ath = CONFIG.bitcoinATH.price;
    const fromATH = ((currentPrice - ath) / ath) * 100;
    const fearGreed = parseInt(dashboardData.fearGreed.value);

    // Calculate composite score (0-100)
    // Factors: distance from ATH, fear & greed, momentum
    let score = 50; // Base neutral score

    // ATH factor (-50 to +30)
    if (fromATH < -60) score += 30;
    else if (fromATH < -40) score += 20;
    else if (fromATH < -20) score += 10;
    else if (fromATH > -10) score -= 20;

    // Fear & Greed factor (-20 to +20)
    if (fearGreed < 25) score += 20;
    else if (fearGreed < 45) score += 10;
    else if (fearGreed > 75) score -= 20;
    else if (fearGreed > 60) score -= 10;

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    const scoreElement = document.getElementById('cycleScore');
    if (scoreElement) {
        scoreElement.textContent = score;
        
        // Apply color coding
        scoreElement.classList.remove('accumulation', 'neutral', 'overheated');
        if (score < 40) {
            scoreElement.classList.add('accumulation');
        } else if (score < 65) {
            scoreElement.classList.add('neutral');
        } else {
            scoreElement.classList.add('overheated');
        }
    }
}

/* ================================
   Utility Functions
   ================================ */

function updateElement(id, value, className = '') {
    const element = document.getElementById(id);
    if (element) {
        // Add animation class
        element.classList.add('value-updating');
        
        // Update value
        element.textContent = value;
        
        // Update class
        if (className) {
            element.className = `data-value ${className}`;
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            element.classList.remove('value-updating');
        }, 500);
    }
}

function formatCurrency(value) {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatLargeNumber(value) {
    if (value === null || value === undefined) return '—';
    
    if (value >= 1e12) {
        return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
    } else {
        return formatCurrency(value);
    }
}

function formatNumber(value) {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
}

function formatPercentage(value) {
    if (value === null || value === undefined) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    updateElement('lastUpdate', `Last updated: ${timeString}`);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showError(message) {
    console.error(message);
    // You can add a toast notification here if desired
}

/* ================================
   Auto-Refresh
   ================================ */

function startAutoRefresh() {
    // Clear existing timer if any
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    // Set up new refresh timer
    refreshTimer = setInterval(async () => {
        try {
            await fetchAllData();
            updateAllDisplays();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }, CONFIG.refreshInterval);
}

/* ================================
   Error Handling & Recovery
   ================================ */

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});
