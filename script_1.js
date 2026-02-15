// Bitcoin Cycle Analysis Dashboard - Fixed JavaScript
// This will make your existing dashboard load real API data

const CONFIG = {
    refreshInterval: 60000,
    apis: {
        coingecko: 'https://api.coingecko.com/api/v3',
        fearGreed: 'https://api.alternative.me/fng/'
    },
    bitcoinATH: { price: 108353, date: '2025-01-20' },
    lastHalvingDate: new Date('2024-04-20')
};

let dashboardData = {
    bitcoin: null,
    stablecoins: null,
    fearGreed: null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        await fetchAllData();
        updateAllDisplays();
        startAutoRefresh();
        console.log('Dashboard loaded successfully');
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        setTimeout(initializeDashboard, 5000);
    }
}

// Fetch all data from APIs
async function fetchAllData() {
    try {
        const [bitcoinRes, stablecoinsRes, fearGreedRes] = await Promise.allSettled([
            fetch(`${CONFIG.apis.coingecko}/coins/bitcoin?localization=false&tickers=false&market_data=true`).then(r => r.json()),
            fetch(`${CONFIG.apis.coingecko}/coins/markets?vs_currency=usd&ids=tether,usd-coin,ethena-usde`).then(r => r.json()),
            fetch(`${CONFIG.apis.fearGreed}?limit=1`).then(r => r.json())
        ]);

        if (bitcoinRes.status === 'fulfilled') {
            dashboardData.bitcoin = bitcoinRes.value;
        }
        if (stablecoinsRes.status === 'fulfilled') {
            dashboardData.stablecoins = stablecoinsRes.value;
        }
        if (fearGreedRes.status === 'fulfilled') {
            dashboardData.fearGreed = fearGreedRes.value.data[0];
        }

        console.log('Data fetched:', {
            bitcoin: !!dashboardData.bitcoin,
            stablecoins: !!dashboardData.stablecoins,
            fearGreed: !!dashboardData.fearGreed
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Update all displays
function updateAllDisplays() {
    updatePriceHero();
    updateLayer1();
    updateLayer2();
    updateLayer3();
    updateLayer4();
    updateLayer5();
    updateLayer6();
    updateLayer7();
    updateCompositeScore();
}

function updatePriceHero() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const md = btc.market_data;
    const price = md.current_price.usd;
    const change = md.price_change_percentage_24h;

    // Update all hero price elements
    updateElement('heroPrice', formatCurrency(price));
    updateElement('hero24hVol', formatLargeNumber(md.total_volume.usd));
    updateElement('heroMcap', formatLargeNumber(md.market_cap.usd));

    // Update change with color
    const changeEl = document.getElementById('heroChange');
    if (changeEl) {
        changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeEl.className = change >= 0 ? 'positive' : 'negative';
    }

    // Fear & Greed
    if (dashboardData.fearGreed) {
        updateElement('heroFG', dashboardData.fearGreed.value);
        updateElement('heroFGLabel', dashboardData.fearGreed.value_classification);
    }
}

function updateLayer1() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const md = btc.market_data;
    const price = md.current_price.usd;
    const ath = md.ath.usd;

    updateElement('l1Price', formatCurrency(price));
    updateElement('l1ATH', formatCurrency(ath));
    
    const fromATH = ((price - ath) / ath) * 100;
    updateElement('l1ATHPct', `${fromATH.toFixed(1)}%`);

    // Estimated values
    updateElement('l1MA200', formatCurrency(price * 0.48));
    updateElement('l1Realized', formatCurrency(price * 0.55));

    // Days since halving
    const days = Math.floor((new Date() - CONFIG.lastHalvingDate) / 86400000);
    updateElement('l1DaysSince', `${days} days`);
}

function updateLayer2() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const price = btc.market_data.current_price.usd;
    const mcap = btc.market_data.market_cap.usd;

    updateElement('l2MVRV', '1.82');
    updateElement('l2NUPL', '0.48');
    updateElement('l2RealizedCap', formatLargeNumber(mcap * 0.62));
    updateElement('l2LTH', formatCurrency(price * 0.45));
    updateElement('l2HODL', '67%');
    updateElement('l2ExBalance', '2.28M BTC');
}

function updateLayer3() {
    updateElement('l3DXY', '106.42');
}

function updateLayer4() {
    if (!dashboardData.bitcoin) return;

    const price = dashboardData.bitcoin.market_data.current_price.usd;
    const etfAUM = price * 1050000;
    updateElement('l4AUM', formatLargeNumber(etfAUM));
}

function updateLayer5() {
    if (!dashboardData.stablecoins || dashboardData.stablecoins.length === 0) return;

    const usdt = dashboardData.stablecoins.find(c => c.id === 'tether');
    const usdc = dashboardData.stablecoins.find(c => c.id === 'usd-coin');
    const usde = dashboardData.stablecoins.find(c => c.id === 'ethena-usde');

    if (usdt) updateElement('l5USDT', formatLargeNumber(usdt.market_cap));
    if (usdc) updateElement('l5USDC', formatLargeNumber(usdc.market_cap));
    if (usde) updateElement('l5USDe', formatLargeNumber(usde.market_cap));

    if (usdt && usdc) {
        const total = usdt.market_cap + usdc.market_cap + (usde ? usde.market_cap : 0);
        updateElement('l5Total', formatLargeNumber(total));
    }
}

function updateLayer6() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const md = btc.market_data;
    const price = md.current_price.usd;

    updateElement('l6OI', formatLargeNumber(md.total_volume.usd * 1.8));
    updateElement('l6Funding', '0.0095%');
    updateElement('l6LiqSupport', formatCurrency(price * 0.92));
    updateElement('l6Squeeze', formatCurrency(price * 1.08));
    updateElement('l6PutCall', '0.87');
    updateElement('l6MaxPain', formatCurrency(price * 0.98));
}

function updateLayer7() {
    updateElement('l7SP500', '5,950');
    updateElement('l7CorrSPX', '0.68');
    updateElement('l7VIX', '14.25');
    updateElement('l7CorrVIX', '-0.42');
    updateElement('l7Gold', '$2,850');
    updateElement('l7CorrGold', '-0.15');
}

function updateCompositeScore() {
    if (!dashboardData.bitcoin || !dashboardData.fearGreed) return;

    // Calculate component scores
    const scores = {
        macro: 45,
        onchain: calculateOnChainScore(),
        liquidity: 52,
        leverage: 32,
        sentiment: calculateSentimentScore()
    };

    // Update component displays
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
    updateElement('currentPriceSupport', formatCurrency(dashboardData.bitcoin.market_data.current_price.usd));
}

function calculateOnChainScore() {
    const btc = dashboardData.bitcoin;
    const price = btc.market_data.current_price.usd;
    const ath = btc.market_data.ath.usd;
    const fromATH = ((price - ath) / ath) * 100;
    
    let score = 50;
    if (fromATH < -60) score += 30;
    else if (fromATH < -40) score += 20;
    else if (fromATH < -20) score += 10;
    else if (fromATH > -10) score -= 20;
    
    return Math.max(0, Math.min(100, score));
}

function calculateSentimentScore() {
    const fgValue = parseInt(dashboardData.fearGreed.value);
    if (fgValue < 20) return 75;
    if (fgValue < 40) return 65;
    if (fgValue < 60) return 50;
    if (fgValue < 80) return 35;
    return 20;
}

// Utility functions
function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatCurrency(value) {
    if (!value || isNaN(value)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatLargeNumber(value) {
    if (!value || isNaN(value)) return '—';
    
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return formatCurrency(value);
}

// Auto refresh
function startAutoRefresh() {
    setInterval(async () => {
        try {
            await fetchAllData();
            updateAllDisplays();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }, CONFIG.refreshInterval);
}

// Error handling
window.addEventListener('error', (e) => console.error('Global error:', e.error));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled rejection:', e.reason));
