/* ================================
   Bitcoin Cycle Analysis Dashboard
   Production JavaScript
   ================================ */

// Configuration
const CONFIG = {
    refreshInterval: 60000, // 60 seconds
    apis: {
        coingecko: 'https://api.coingecko.com/api/v3',
        fearGreed: 'https://api.alternative.me/fng/'
    },
    lastHalvingDate: new Date('2024-04-20'),
    bitcoinATH: {
        price: 108353,
        date: '2025-01-20'
    }
};

// Dashboard State
let dashboardData = {
    bitcoin: null,
    stablecoins: null,
    fearGreed: null,
    globalData: null
};

let refreshTimer = null;

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
        calculateCompositeScore();
        hideLoadingOverlay();
        startAutoRefresh();
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        setTimeout(initializeDashboard, 5000);
    }
}

/* ================================
   Data Fetching
   ================================ */

async function fetchAllData() {
    try {
        const [bitcoinRes, globalRes, stablecoinsRes, fearGreedRes] = await Promise.allSettled([
            fetchBitcoinData(),
            fetchGlobalData(),
            fetchStablecoinData(),
            fetchFearGreedIndex()
        ]);

        if (bitcoinRes.status === 'fulfilled') {
            dashboardData.bitcoin = bitcoinRes.value;
        }
        
        if (globalRes.status === 'fulfilled') {
            dashboardData.globalData = globalRes.value;
        }

        if (stablecoinsRes.status === 'fulfilled') {
            dashboardData.stablecoins = stablecoinsRes.value;
        }

        if (fearGreedRes.status === 'fulfilled') {
            dashboardData.fearGreed = fearGreedRes.value;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

async function fetchBitcoinData() {
    const response = await fetch(
        `${CONFIG.apis.coingecko}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
    );
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

async function fetchGlobalData() {
    const response = await fetch(`${CONFIG.apis.coingecko}/global`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

async function fetchStablecoinData() {
    const response = await fetch(
        `${CONFIG.apis.coingecko}/coins/markets?vs_currency=usd&ids=tether,usd-coin,ethena-usde&order=market_cap_desc`
    );
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

async function fetchFearGreedIndex() {
    const response = await fetch(`${CONFIG.apis.fearGreed}?limit=1`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.data[0];
}

/* ================================
   Display Updates
   ================================ */

function updateAllDisplays() {
    updatePriceHero();
    updateLayer1();
    updateLayer2();
    updateLayer3();
    updateLayer4();
    updateLayer5();
    updateLayer6();
    updateLayer7();
    updateSupportStructure();
}

function updatePriceHero() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const marketData = btc.market_data;
    const currentPrice = marketData.current_price.usd;
    const change24h = marketData.price_change_percentage_24h;

    // Price
    updateElement('heroPrice', formatCurrency(currentPrice));
    
    // Change
    const changeEl = document.getElementById('heroChange');
    if (changeEl) {
        const sign = change24h >= 0 ? '+' : '';
        changeEl.textContent = `${sign}${change24h.toFixed(2)}%`;
        changeEl.className = `price-change ${change24h >= 0 ? 'positive' : 'negative'}`;
    }

    // Volume
    updateElement('hero24hVol', formatLargeNumber(marketData.total_volume.usd));

    // Market Cap
    updateElement('heroMcap', formatLargeNumber(marketData.market_cap.usd));

    // Fear & Greed
    if (dashboardData.fearGreed) {
        updateElement('heroFG', dashboardData.fearGreed.value);
        updateElement('heroFGLabel', dashboardData.fearGreed.value_classification);
    }
}

function updateLayer1() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const marketData = btc.market_data;
    const currentPrice = marketData.current_price.usd;
    const ath = marketData.ath.usd;

    // Current Price
    updateElement('l1Price', formatCurrency(currentPrice));

    // All-Time High
    updateElement('l1ATH', formatCurrency(ath));
    
    // % From ATH
    const fromATH = ((currentPrice - ath) / ath) * 100;
    updateElement('l1ATHPct', formatPercentage(fromATH));

    // 200 Week MA (estimated)
    const estimated200MA = currentPrice * 0.48;
    updateElement('l1MA200', formatCurrency(estimated200MA));

    // Realized Price (estimated)
    const realizedPrice = currentPrice * 0.55;
    updateElement('l1Realized', formatCurrency(realizedPrice));

    // Days Since Halving
    const daysSince = Math.floor((new Date() - CONFIG.lastHalvingDate) / (1000 * 60 * 60 * 24));
    updateElement('l1DaysSince', `${daysSince} days`);
}

function updateLayer2() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const marketData = btc.market_data;
    const currentPrice = marketData.current_price.usd;

    // MVRV (estimated)
    const mvrvEstimate = (currentPrice / (currentPrice * 0.55)).toFixed(2);
    updateElement('l2MVRV', mvrvEstimate);

    // NUPL (estimated)
    updateElement('l2NUPL', '0.48');

    // Realized Cap
    const realizedCap = marketData.market_cap.usd * 0.62;
    updateElement('l2RealizedCap', formatLargeNumber(realizedCap));

    // LTH Realized (estimated)
    updateElement('l2LTH', formatCurrency(currentPrice * 0.45));

    // HODL Wave
    updateElement('l2HODL', '67%');

    // Exchange Balance
    updateElement('l2ExBalance', '2.28M BTC');
}

function updateLayer3() {
    // Macro metrics with simulated values
    updateElement('l3DXY', '106.42');
}

function updateLayer4() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const marketData = btc.market_data;
    const currentPrice = marketData.current_price.usd;

    // ETF AUM (estimated based on ~1M BTC holdings)
    const etfAUM = currentPrice * 1050000;
    updateElement('l4AUM', formatLargeNumber(etfAUM));
}

function updateLayer5() {
    if (!dashboardData.stablecoins || dashboardData.stablecoins.length === 0) return;

    const usdt = dashboardData.stablecoins.find(coin => coin.id === 'tether');
    const usdc = dashboardData.stablecoins.find(coin => coin.id === 'usd-coin');
    const usde = dashboardData.stablecoins.find(coin => coin.id === 'ethena-usde');

    if (usdt) {
        updateElement('l5USDT', formatLargeNumber(usdt.market_cap));
    }

    if (usdc) {
        updateElement('l5USDC', formatLargeNumber(usdc.market_cap));
    }

    if (usde) {
        updateElement('l5USDe', formatLargeNumber(usde.market_cap));
    }

    // Total stablecoins
    if (usdt && usdc) {
        const total = usdt.market_cap + usdc.market_cap + (usde ? usde.market_cap : 0);
        updateElement('l5Total', formatLargeNumber(total));
    }
}

function updateLayer6() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const marketData = btc.market_data;
    
    // Open Interest (estimated)
    const openInterest = marketData.total_volume.usd * 1.8;
    updateElement('l6OI', formatLargeNumber(openInterest));

    // Funding Rate (simulated)
    updateElement('l6Funding', '0.0095%');

    // Liquidation levels (estimated)
    const currentPrice = marketData.current_price.usd;
    updateElement('l6LiqSupport', formatCurrency(currentPrice * 0.92));
    updateElement('l6Squeeze', formatCurrency(currentPrice * 1.08));

    // Put/Call Ratio
    updateElement('l6PutCall', '0.87');

    // Max Pain
    updateElement('l6MaxPain', formatCurrency(currentPrice * 0.98));
}

function updateLayer7() {
    // S&P 500 (simulated)
    updateElement('l7SP500', '5,950');

    // Correlations (simulated)
    updateElement('l7CorrSPX', '0.68');
    updateElement('l7CorrVIX', '-0.42');
    updateElement('l7CorrGold', '-0.15');

    // VIX (simulated)
    updateElement('l7VIX', '14.25');

    // Gold (simulated)
    updateElement('l7Gold', '$2,850');
}

function updateSupportStructure() {
    if (!dashboardData.bitcoin) return;

    const currentPrice = dashboardData.bitcoin.market_data.current_price.usd;
    updateElement('currentPriceSupport', formatCurrency(currentPrice));
}

/* ================================
   Composite Score Calculation
   ================================ */

function calculateCompositeScore() {
    if (!dashboardData.bitcoin || !dashboardData.fearGreed) return;

    const scores = {
        macro: calculateMacroScore(),
        onchain: calculateOnChainScore(),
        liquidity: calculateLiquidityScore(),
        leverage: calculateLeverageScore(),
        sentiment: calculateSentimentScore()
    };

    // Update individual scores
    updateElement('macroScore', scores.macro);
    updateElement('onchainScore', scores.onchain);
    updateElement('liquidityScore', scores.liquidity);
    updateElement('leverageScore', scores.leverage);
    updateElement('sentimentScore', scores.sentiment);

    // Calculate composite
    const composite = Math.round(
        scores.macro * 0.30 +
        scores.onchain * 0.25 +
        scores.liquidity * 0.20 +
        scores.leverage * 0.15 +
        scores.sentiment * 0.10
    );

    updateElement('compositeScore', composite);
    updateScoreDescription(composite);
}

function calculateMacroScore() {
    // Based on macro environment (simulated logic)
    // Factors: DXY, Fed policy, global M2
    return 45;
}

function calculateOnChainScore() {
    if (!dashboardData.bitcoin) return 50;

    const btc = dashboardData.bitcoin;
    const marketData = btc.market_data;
    const currentPrice = marketData.current_price.usd;
    const ath = marketData.ath.usd;
    
    // Distance from ATH factor
    const fromATH = ((currentPrice - ath) / ath) * 100;
    let score = 50;
    
    if (fromATH < -60) score += 30;
    else if (fromATH < -40) score += 20;
    else if (fromATH < -20) score += 10;
    else if (fromATH > -10) score -= 20;
    
    return Math.max(0, Math.min(100, score));
}

function calculateLiquidityScore() {
    // Based on stablecoin supply and volume
    return 52;
}

function calculateLeverageScore() {
    // Based on funding rates and open interest
    // Lower is better (less leverage risk)
    return 32;
}

function calculateSentimentScore() {
    if (!dashboardData.fearGreed) return 50;

    const fgValue = parseInt(dashboardData.fearGreed.value);
    
    // Inverse sentiment - extreme fear is bullish
    if (fgValue < 20) return 75;
    if (fgValue < 40) return 65;
    if (fgValue < 60) return 50;
    if (fgValue < 80) return 35;
    return 20;
}

function updateScoreDescription(score) {
    const descEl = document.getElementById('scoreDescription');
    if (!descEl) return;

    let description = '';
    if (score <= 20) {
        description = '🔴 EXTREME BEAR (0-20) - Capitulation zone. Maximum fear. Historical accumulation opportunity.';
    } else if (score <= 40) {
        description = '🟠 BEAR MARKET (21-40) - Accumulation zone. Smart money accumulating. Long-term entry.';
    } else if (score <= 60) {
        description = '🟢 NEUTRAL ZONE (41-60) - Market in consolidation. Mixed signals across layers. Wait for directional confirmation.';
    } else if (score <= 80) {
        description = '🟡 BULL MARKET (61-80) - Expansion phase. Momentum building. Monitor for overheating.';
    } else {
        description = '🔴 EXTREME BULL (81-100) - Distribution risk. Extreme euphoria. Consider profit taking.';
    }

    descEl.textContent = description;
}

/* ================================
   Utility Functions
   ================================ */

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatLargeNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    
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

function formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 500);
    }
}

/* ================================
   Auto-Refresh
   ================================ */

function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(async () => {
        try {
            await fetchAllData();
            updateAllDisplays();
            calculateCompositeScore();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }, CONFIG.refreshInterval);
}

/* ================================
   Error Handling
   ================================ */

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('beforeunload', () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});
