// Bitcoin Cycle Analysis Dashboard - Enhanced Version
// All existing features + New AI Intelligence Engine

const CONFIG = {
    refreshInterval: 60000,
    apis: {
        coingecko: 'https://api.coingecko.com/api/v3',
        fearGreed: 'https://api.alternative.me/fng/',
        binance: 'https://fapi.binance.com/fapi/v1'
    },
    bitcoinATH: { price: 108353, date: '2025-01-20' },
    lastHalvingDate: new Date('2024-04-20')
};

let dashboardData = {
    bitcoin: null,
    stablecoins: null,
    fearGreed: null,
    binanceData: null,
    historicalPrices: [],
    historicalStables: null
};

// Data cache to prevent rate limits
let dataCache = {
    lastFetch: 0,
    cacheDuration: 60000, // 1 minute
    data: null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing with AI enhancements...');
    initializeDashboard();
    setupShareCardModal();
});

async function initializeDashboard() {
    try {
        await fetchAllData();
        updateAllDisplays();
        updateAIMetrics();
        generateMarketNarrative();
        startAutoRefresh();
        console.log('Dashboard loaded successfully with AI features');
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        setTimeout(initializeDashboard, 5000);
    }
}

// ===== DATA FETCHING =====

async function fetchAllData() {
    const now = Date.now();
    
    // Use cache if available and fresh
    if (dataCache.data && (now - dataCache.lastFetch) < dataCache.cacheDuration) {
        Object.assign(dashboardData, dataCache.data);
        console.log('Using cached data');
        return;
    }

    try {
        const [bitcoinRes, stablecoinsRes, fearGreedRes, binanceRes] = await Promise.allSettled([
            fetch(`${CONFIG.apis.coingecko}/coins/bitcoin?localization=false&tickers=false&market_data=true`).then(r => r.json()),
            fetch(`${CONFIG.apis.coingecko}/coins/markets?vs_currency=usd&ids=tether,usd-coin,ethena-usde`).then(r => r.json()),
            fetch(`${CONFIG.apis.fearGreed}?limit=1`).then(r => r.json()),
            fetchBinanceData()
        ]);

        if (bitcoinRes.status === 'fulfilled') {
            dashboardData.bitcoin = bitcoinRes.value;
            updateHistoricalPrices(bitcoinRes.value.market_data.current_price.usd);
        }
        if (stablecoinsRes.status === 'fulfilled') {
            dashboardData.stablecoins = stablecoinsRes.value;
            updateHistoricalStables(stablecoinsRes.value);
        }
        if (fearGreedRes.status === 'fulfilled') {
            dashboardData.fearGreed = fearGreedRes.value.data[0];
        }
        if (binanceRes.status === 'fulfilled') {
            dashboardData.binanceData = binanceRes.value;
        }

        // Update cache
        dataCache.lastFetch = now;
        dataCache.data = { ...dashboardData };

        console.log('Data fetched:', {
            bitcoin: !!dashboardData.bitcoin,
            stablecoins: !!dashboardData.stablecoins,
            fearGreed: !!dashboardData.fearGreed,
            binance: !!dashboardData.binanceData
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

async function fetchBinanceData() {
    try {
        const [fundingRes, oiRes] = await Promise.all([
            fetch(`${CONFIG.apis.binance}/premiumIndex?symbol=BTCUSDT`).then(r => r.json()),
            fetch(`${CONFIG.apis.binance}/openInterest?symbol=BTCUSDT`).then(r => r.json())
        ]);

        return {
            fundingRate: parseFloat(fundingRes.lastFundingRate) * 100,
            openInterest: parseFloat(oiRes.openInterest),
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Binance API error:', error);
        return null;
    }
}

function updateHistoricalPrices(currentPrice) {
    dashboardData.historicalPrices.push({
        price: currentPrice,
        timestamp: Date.now()
    });
    
    // Keep last 30 data points
    if (dashboardData.historicalPrices.length > 30) {
        dashboardData.historicalPrices.shift();
    }
}

function updateHistoricalStables(stables) {
    const total = stables.reduce((sum, s) => sum + s.market_cap, 0);
    
    if (!dashboardData.historicalStables) {
        dashboardData.historicalStables = [];
    }
    
    dashboardData.historicalStables.push({
        total: total,
        timestamp: Date.now()
    });
    
    // Keep last 7 days worth of data (at 60s intervals = 10080 points)
    if (dashboardData.historicalStables.length > 168) { // 7 days at hourly
        dashboardData.historicalStables.shift();
    }
}

// ===== UPDATE DISPLAYS (EXISTING) =====

function updateAllDisplays() {
    updatePriceHero();
    updateLayer1();
    updateLayer2();
    updateLayer3();
    updateLayer4();
    updateLayer5();
    updateLayer6Enhanced(); // Enhanced version
    updateLayer7();
    updateCompositeScore();
}

function updatePriceHero() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const md = btc.market_data;
    const price = md.current_price.usd;
    const change = md.price_change_percentage_24h;

    updateElement('heroPrice', formatCurrency(price));
    updateElement('hero24hVol', formatLargeNumber(md.total_volume.usd));
    updateElement('heroMcap', formatLargeNumber(md.market_cap.usd));

    const changeEl = document.getElementById('heroChange');
    if (changeEl) {
        changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeEl.className = change >= 0 ? 'positive' : 'negative';
    }

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

    updateElement('l1MA200', formatCurrency(price * 0.48));
    updateElement('l1Realized', formatCurrency(price * 0.55));

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

function updateLayer6Enhanced() {
    if (!dashboardData.bitcoin) return;

    const btc = dashboardData.bitcoin;
    const md = btc.market_data;
    const price = md.current_price.usd;

    // Use real Binance data if available
    if (dashboardData.binanceData) {
        const funding = dashboardData.binanceData.fundingRate;
        const oi = dashboardData.binanceData.openInterest;
        
        // Update with real data
        updateElement('l6OI', formatLargeNumber(oi * price));
        updateElement('l6Funding', `${funding.toFixed(4)}%`);
        
        // Update funding rate badge with color
        const fundingEl = document.getElementById('l6Funding');
        if (fundingEl) {
            if (Math.abs(funding) < 0.01) {
                fundingEl.style.color = '#10b981'; // Green - healthy
            } else if (Math.abs(funding) < 0.03) {
                fundingEl.style.color = '#f59e0b'; // Yellow - crowded
            } else {
                fundingEl.style.color = '#ef4444'; // Red - extreme
            }
        }
    } else {
        // Fallback to estimated values
        updateElement('l6OI', formatLargeNumber(md.total_volume.usd * 1.8));
        updateElement('l6Funding', '0.0095%');
    }

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

    const scores = {
        macro: 45,
        onchain: calculateOnChainScore(),
        liquidity: 52,
        leverage: 32,
        sentiment: calculateSentimentScore()
    };

    updateElement('macroScore', scores.macro);
    updateElement('onchainScore', scores.onchain);
    updateElement('liquidityScore', scores.liquidity);
    updateElement('leverageScore', scores.leverage);
    updateElement('sentimentScore', scores.sentiment);

    const composite = Math.round(
        scores.macro * 0.30 +
        scores.onchain * 0.25 +
        scores.liquidity * 0.20 +
        scores.leverage * 0.15 +
        scores.sentiment * 0.10
    );

    updateElement('compositeScore', composite);
    updateElement('currentPriceSupport', formatCurrency(dashboardData.bitcoin.market_data.current_price.usd));
    
    // Update AI confidence
    const confidence = calculateAIConfidence();
    updateElement('modelConfidence', `${confidence}%`);
    updateElement('aiConfidenceScore', `${confidence}%`);
}

// ===== AI-DERIVED METRICS =====

function updateAIMetrics() {
    if (!dashboardData.bitcoin) return;

    // On-Chain Strength Index
    const onChainStrength = calculateOnChainStrengthIndex();
    updateAIMetric('OnChainStrength', onChainStrength);

    // Liquidity Pressure Index
    const liquidityPressure = calculateLiquidityPressureIndex();
    updateAIMetric('LiquidityPressure', liquidityPressure);

    // Leverage Risk Index
    const leverageRisk = calculateLeverageRiskIndex();
    updateAIMetric('LeverageRisk', leverageRisk);
}

function calculateOnChainStrengthIndex() {
    const btc = dashboardData.bitcoin;
    const md = btc.market_data;
    const price = md.current_price.usd;
    const ath = md.ath.usd;
    
    // % from ATH (0-40 points)
    const fromATH = ((price - ath) / ath) * 100;
    let athScore = 0;
    if (fromATH > -10) athScore = 10;
    else if (fromATH > -30) athScore = 25;
    else if (fromATH > -50) athScore = 35;
    else athScore = 40;
    
    // 30-day momentum (0-35 points)
    const change30d = md.price_change_percentage_30d || 0;
    let momentumScore = 0;
    if (change30d > 20) momentumScore = 35;
    else if (change30d > 10) momentumScore = 25;
    else if (change30d > 0) momentumScore = 15;
    else if (change30d > -10) momentumScore = 10;
    
    // Volume expansion (0-25 points)
    const volumeRatio = md.total_volume.usd / md.market_cap.usd;
    let volumeScore = 0;
    if (volumeRatio > 0.05) volumeScore = 25;
    else if (volumeRatio > 0.03) volumeScore = 15;
    else if (volumeRatio > 0.02) volumeScore = 10;
    
    const total = athScore + momentumScore + volumeScore;
    
    return {
        score: Math.min(100, total),
        trend: change30d >= 0 ? '↑' : '↓',
        interpretation: total > 70 ? 'Strong accumulation phase' :
                       total > 50 ? 'Moderate strength building' :
                       total > 30 ? 'Consolidation zone' : 'Weak momentum'
    };
}

function calculateLiquidityPressureIndex() {
    if (!dashboardData.stablecoins) {
        return { score: 50, trend: '→', interpretation: 'Insufficient data' };
    }
    
    const btc = dashboardData.bitcoin;
    const md = btc.market_data;
    
    // Stablecoin cap change (0-40 points)
    let stableScore = 30; // Default if no historical
    if (dashboardData.historicalStables && dashboardData.historicalStables.length >= 2) {
        const current = dashboardData.historicalStables[dashboardData.historicalStables.length - 1].total;
        const week_ago = dashboardData.historicalStables[0].total;
        const change = ((current - week_ago) / week_ago) * 100;
        
        if (change > 3) stableScore = 40;
        else if (change > 1) stableScore = 30;
        else if (change > -1) stableScore = 20;
        else stableScore = 10;
    }
    
    // Volume spike (0-35 points)
    const volumeRatio = md.total_volume.usd / md.market_cap.usd;
    let volumeScore = volumeRatio > 0.05 ? 35 : volumeRatio > 0.03 ? 25 : 15;
    
    // Market cap growth (0-25 points)
    const mcapChange = md.market_cap_change_percentage_24h || 0;
    let mcapScore = mcapChange > 5 ? 25 : mcapChange > 2 ? 15 : mcapChange > 0 ? 10 : 5;
    
    const total = stableScore + volumeScore + mcapScore;
    
    return {
        score: Math.min(100, total),
        trend: total > 60 ? '↑' : total < 40 ? '↓' : '→',
        interpretation: total > 70 ? 'Strong capital inflow' :
                       total > 50 ? 'Healthy liquidity conditions' :
                       total > 30 ? 'Neutral liquidity' : 'Limited buying power'
    };
}

function calculateLeverageRiskIndex() {
    let fundingScore = 50;
    let oiScore = 50;
    
    if (dashboardData.binanceData) {
        const funding = Math.abs(dashboardData.binanceData.fundingRate);
        
        // Funding rate magnitude (0-60 points, higher = more risk)
        if (funding > 0.05) fundingScore = 90;
        else if (funding > 0.03) fundingScore = 70;
        else if (funding > 0.01) fundingScore = 50;
        else fundingScore = 30;
        
        // OI growth (estimated, 0-40 points)
        oiScore = 40; // Simplified for now
    }
    
    const total = (fundingScore * 0.6 + oiScore * 0.4);
    
    return {
        score: Math.round(total),
        trend: fundingScore > 60 ? '↑' : fundingScore < 40 ? '↓' : '→',
        interpretation: total > 70 ? 'Extreme leverage, caution' :
                       total > 50 ? 'Elevated leverage activity' :
                       total > 30 ? 'Moderate leverage' : 'Low leverage risk'
    };
}

function updateAIMetric(name, data) {
    updateElement(`ai${name}`, data.score);
    updateElement(`ai${name}Trend`, data.trend);
    updateElement(`ai${name}Interp`, data.interpretation);
    
    const bar = document.getElementById(`ai${name}Bar`);
    if (bar) {
        bar.style.width = `${data.score}%`;
        
        // Color based on score
        if (name === 'LeverageRisk') {
            // Inverted - lower is better
            if (data.score > 70) bar.style.background = '#ef4444';
            else if (data.score > 50) bar.style.background = '#f59e0b';
            else bar.style.background = '#10b981';
        } else {
            if (data.score > 70) bar.style.background = '#10b981';
            else if (data.score > 40) bar.style.background = '#f59e0b';
            else bar.style.background = '#ef4444';
        }
    }
}

function calculateAIConfidence() {
    if (!dashboardData.bitcoin) return 0;
    
    const md = dashboardData.bitcoin.market_data;
    
    // Volatility factor (lower vol = higher confidence)
    const volatility = Math.abs(md.price_change_percentage_24h || 0);
    let volScore = volatility < 2 ? 40 : volatility < 5 ? 30 : volatility < 10 ? 20 : 10;
    
    // Data availability
    let dataScore = 20;
    if (dashboardData.binanceData) dataScore += 15;
    if (dashboardData.fearGreed) dataScore += 15;
    if (dashboardData.stablecoins) dataScore += 10;
    
    // Funding stability
    let fundingScore = 20;
    if (dashboardData.binanceData) {
        const funding = Math.abs(dashboardData.binanceData.fundingRate);
        if (funding < 0.01) fundingScore = 30;
        else if (funding < 0.03) fundingScore = 20;
        else fundingScore = 10;
    }
    
    return Math.min(100, Math.round(volScore + dataScore + fundingScore));
}

// ===== MARKET NARRATIVE GENERATOR =====

function generateMarketNarrative() {
    if (!dashboardData.bitcoin || !dashboardData.fearGreed) return;
    
    const btc = dashboardData.bitcoin;
    const md = btc.market_data;
    const price = md.current_price.usd;
    const ath = md.ath.usd;
    const fromATH = ((price - ath) / ath) * 100;
    const fearGreed = parseInt(dashboardData.fearGreed.value);
    
    let phase = '';
    let liquidity = '';
    let leverage = '';
    let outlook = '';
    
    // Determine phase
    if (fromATH > -10) phase = 'near all-time highs';
    else if (fromATH > -30) phase = 'in moderate correction';
    else if (fromATH > -50) phase = 'in consolidation';
    else phase = 'in deep correction';
    
    // Liquidity conditions
    const liquidityIndex = calculateLiquidityPressureIndex();
    if (liquidityIndex.score > 70) liquidity = 'strong liquidity conditions';
    else if (liquidityIndex.score > 50) liquidity = 'improving liquidity conditions';
    else if (liquidityIndex.score > 30) liquidity = 'neutral liquidity';
    else liquidity = 'constrained liquidity';
    
    // Leverage assessment
    const leverageIndex = calculateLeverageRiskIndex();
    if (leverageIndex.score > 70) leverage = 'elevated leverage risk';
    else if (leverageIndex.score > 50) leverage = 'moderate leverage';
    else leverage = 'low leverage risk';
    
    // On-chain outlook
    const onChainIndex = calculateOnChainStrengthIndex();
    if (onChainIndex.score > 70) outlook = 'On-chain strength suggests underlying accumulation.';
    else if (onChainIndex.score > 50) outlook = 'On-chain metrics show moderate strength.';
    else if (onChainIndex.score > 30) outlook = 'On-chain activity remains subdued.';
    else outlook = 'On-chain metrics indicate weak momentum.';
    
    const narrative = `Bitcoin ${phase} with ${liquidity} and ${leverage}. ${outlook}`;
    
    updateElement('marketNarrative', narrative);
}

// ===== SHARE CARD FUNCTIONALITY =====

function setupShareCardModal() {
    const btn = document.getElementById('generateShareCard');
    const modal = document.getElementById('shareModal');
    const overlay = document.getElementById('shareModalOverlay');
    const closeBtn = document.getElementById('shareModalClose');
    const downloadBtn = document.getElementById('downloadShareCard');
    const copyBtn = document.getElementById('copyShareCard');
    
    if (btn) btn.addEventListener('click', openShareModal);
    if (closeBtn) closeBtn.addEventListener('click', closeShareModal);
    if (overlay) overlay.addEventListener('click', closeShareModal);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadShareCard);
    if (copyBtn) copyBtn.addEventListener('click', copyShareCard);
}

function openShareModal() {
    populateShareCard();
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.add('active');
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.remove('active');
}

function populateShareCard() {
    if (!dashboardData.bitcoin) return;
    
    const price = dashboardData.bitcoin.market_data.current_price.usd;
    const composite = document.getElementById('compositeScore').textContent;
    const confidence = calculateAIConfidence();
    const narrative = document.getElementById('marketNarrative').textContent;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    updateElement('shareCardDate', dateStr);
    updateElement('shareCardPrice', formatCurrency(price));
    updateElement('shareCardCycleScore', composite);
    updateElement('shareCardConfidence', `${confidence}%`);
    updateElement('shareCardSupport', '$55K - $58K');
    updateElement('shareCardNarrative', narrative);
}

async function downloadShareCard() {
    alert('Download feature requires html2canvas library. Image generation coming soon!');
}

async function copyShareCard() {
    const narrative = document.getElementById('marketNarrative').textContent;
    const price = document.getElementById('shareCardPrice').textContent;
    const score = document.getElementById('shareCardCycleScore').textContent;
    
    const text = `Bitcoin Cycle Analysis
${price} | Score: ${score}
${narrative}
0xnextzy Intelligence`;
    
    try {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    } catch (err) {
        console.error('Copy failed:', err);
    }
}

// ===== UTILITY FUNCTIONS =====

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

// ===== AUTO REFRESH =====

function startAutoRefresh() {
    setInterval(async () => {
        try {
            await fetchAllData();
            updateAllDisplays();
            updateAIMetrics();
            generateMarketNarrative();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }, CONFIG.refreshInterval);
}

// ===== ERROR HANDLING =====

window.addEventListener('error', (e) => console.error('Global error:', e.error));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled rejection:', e.reason));
