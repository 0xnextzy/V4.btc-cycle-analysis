/**
 * BTC Intelligence Terminal - Professional Edition
 * Multi-Factor Cycle Analysis with Robust Data Pipeline
 */

// ===================================
// Configuration & Constants
// ===================================

const CONFIG = {
    UPDATE_INTERVAL: 60000, // 60 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    HALVING_DATE: new Date('2024-04-20'),
    CYCLE_BOTTOM_DATE: new Date('2022-11-21'), // Approx FTX bottom
    
    // API Endpoints
    APIS: {
        BITCOIN_PRICE: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true',
        BITCOIN_DATA: 'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false',
        GLOBAL_DATA: 'https://api.coingecko.com/api/v3/global',
        FEAR_GREED: 'https://api.alternative.me/fng/',
        USDT: 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd&include_market_cap=true',
        USDC: 'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd&include_market_cap=true'
    }
};

// ===================================
// State Management
// ===================================

const state = {
    bitcoin: null,
    bitcoinData: null,
    global: null,
    fearGreed: null,
    stablecoins: { usdt: null, usdc: null },
    
    // Computed metrics
    computed: {
        cyclePosition: 0,
        topProbability: 0,
        crashRisk: 0,
        healthScore: 0,
        fairValue: 0,
        predictedTop: 0,
        predictedBottom: 0
    },
    
    // Historical data for smoothing
    history: {
        prices: [],
        riskScores: [],
        cyclePositions: []
    },
    
    // EMA smoothers
    smoothers: {
        price: null,
        risk: null
    },
    
    // Charts
    charts: {
        price: null,
        radar: null,
        recession: null
    },
    
    // Status
    lastUpdate: null,
    updateCount: 0,
    errors: 0
};

// ===================================
// Robust Fetch Engine
// ===================================

/**
 * Fetch JSON with retry logic and timeout protection
 */
async function fetchJSON(url, retries = CONFIG.RETRY_ATTEMPTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
        // Add cache busting
        const cacheBust = url.includes('?') ? '&' : '?';
        const finalUrl = `${url}${cacheBust}t=${Date.now()}`;
        
        const response = await fetch(finalUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        clearTimeout(timeout);
        
        if (retries > 0) {
            console.warn(`Fetch failed, retrying... (${retries} attempts left)`);
            await sleep(CONFIG.RETRY_DELAY);
            return fetchJSON(url, retries - 1);
        }
        
        console.error('Fetch failed after retries:', url, error);
        return null;
    }
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===================================
// EMA Smoother Class
// ===================================

class EMA {
    constructor(period) {
        this.period = period;
        this.multiplier = 2 / (period + 1);
        this.ema = null;
    }
    
    update(value) {
        if (this.ema === null) {
            this.ema = value;
        } else {
            this.ema = (value - this.ema) * this.multiplier + this.ema;
        }
        return this.ema;
    }
    
    getValue() {
        return this.ema;
    }
}

// Initialize smoothers
state.smoothers.price = new EMA(7);
state.smoothers.risk = new EMA(30);

// ===================================
// Data Fetching
// ===================================

/**
 * Fetch all data sources
 */
async function fetchAllData() {
    updateStatus('updating', 'UPDATING');
    
    try {
        const [bitcoin, bitcoinData, global, fearGreed, usdt, usdc] = await Promise.all([
            fetchJSON(CONFIG.APIS.BITCOIN_PRICE),
            fetchJSON(CONFIG.APIS.BITCOIN_DATA),
            fetchJSON(CONFIG.APIS.GLOBAL_DATA),
            fetchJSON(CONFIG.APIS.FEAR_GREED),
            fetchJSON(CONFIG.APIS.USDT),
            fetchJSON(CONFIG.APIS.USDC)
        ]);
        
        // Update state only if data is valid
        if (bitcoin && bitcoin.bitcoin) {
            state.bitcoin = bitcoin.bitcoin;
        }
        
        if (bitcoinData) {
            state.bitcoinData = bitcoinData;
        }
        
        if (global && global.data) {
            state.global = global.data;
        }
        
        if (fearGreed && fearGreed.data && fearGreed.data[0]) {
            state.fearGreed = fearGreed.data[0];
        }
        
        if (usdt && usdt.tether) {
            state.stablecoins.usdt = usdt.tether;
        }
        
        if (usdc && usdc['usd-coin']) {
            state.stablecoins.usdc = usdc['usd-coin'];
        }
        
        // Calculate derived metrics
        calculateMetrics();
        
        // Update UI
        updateAllUI();
        
        // Update status
        state.lastUpdate = Date.now();
        state.updateCount++;
        state.errors = 0;
        updateStatus('live', 'LIVE');
        
    } catch (error) {
        console.error('Data fetch error:', error);
        state.errors++;
        updateStatus('error', 'ERROR');
    }
}

// ===================================
// Advanced Cycle Analytics
// ===================================

/**
 * Calculate all derived metrics
 */
function calculateMetrics() {
    if (!state.bitcoin || !state.bitcoinData || !state.global) {
        return;
    }
    
    const price = state.bitcoin.usd;
    const ath = state.bitcoinData.market_data.ath.usd;
    const daysSinceHalving = Math.floor((Date.now() - CONFIG.HALVING_DATE) / (1000 * 60 * 60 * 24));
    const daysSinceBottom = Math.floor((Date.now() - CONFIG.CYCLE_BOTTOM_DATE) / (1000 * 60 * 60 * 24));
    
    // 1. Cycle Position (0-100)
    state.computed.cyclePosition = calculateCyclePosition(daysSinceHalving, price, ath);
    
    // 2. Top Probability (0-100)
    state.computed.topProbability = calculateTopProbability(
        state.computed.cyclePosition,
        price,
        ath,
        state.fearGreed ? parseInt(state.fearGreed.value) : 50
    );
    
    // 3. Crash Risk (0-100)
    state.computed.crashRisk = calculateCrashRisk(
        state.computed.topProbability,
        state.fearGreed ? parseInt(state.fearGreed.value) : 50,
        state.bitcoin.usd_24h_change || 0
    );
    
    // 4. Health Score (0-100)
    state.computed.healthScore = calculateHealthScore(
        state.computed.cyclePosition,
        state.computed.crashRisk
    );
    
    // 5. Fair Value
    state.computed.fairValue = calculateFairValue(daysSinceBottom, price);
    
    // 6. Predicted Top & Bottom
    const predictions = predictCycleLevels(daysSinceHalving, price);
    state.computed.predictedTop = predictions.top;
    state.computed.predictedBottom = predictions.bottom;
    
    // Apply smoothing to critical metrics
    if (state.history.prices.length > 0) {
        state.smoothers.price.update(price);
        state.smoothers.risk.update(state.computed.crashRisk);
    } else {
        state.smoothers.price = new EMA(7);
        state.smoothers.risk = new EMA(30);
        state.smoothers.price.update(price);
        state.smoothers.risk.update(state.computed.crashRisk);
    }
    
    // Store history (last 100 points)
    state.history.prices.push(price);
    state.history.riskScores.push(state.computed.crashRisk);
    state.history.cyclePositions.push(state.computed.cyclePosition);
    
    if (state.history.prices.length > 100) {
        state.history.prices.shift();
        state.history.riskScores.shift();
        state.history.cyclePositions.shift();
    }
}

/**
 * Calculate cycle position (0-100)
 * Based on: time since halving, price vs ATH, momentum
 */
function calculateCyclePosition(daysSinceHalving, price, ath) {
    // Time factor (0-1): 0-365 days = 0-1
    const timeFactor = Math.min(daysSinceHalving / 365, 1);
    
    // Price factor (0-1): % of ATH
    const priceFactor = price / ath;
    
    // Weighted average
    const position = (timeFactor * 0.4 + priceFactor * 0.6) * 100;
    
    return Math.min(100, Math.max(0, Math.round(position)));
}

/**
 * Calculate top probability (0-100)
 */
function calculateTopProbability(cyclePosition, price, ath, fearGreed) {
    // Factor 1: Cycle position (40% weight)
    const cycleFactor = cyclePosition;
    
    // Factor 2: Price vs ATH (30% weight)
    const athProximity = (price / ath) * 100;
    
    // Factor 3: Fear & Greed (30% weight)
    const sentimentFactor = fearGreed;
    
    // Weighted average
    const probability = (
        cycleFactor * 0.4 +
        athProximity * 0.3 +
        sentimentFactor * 0.3
    );
    
    return Math.min(100, Math.max(0, Math.round(probability)));
}

/**
 * Calculate crash risk (0-100)
 */
function calculateCrashRisk(topProbability, fearGreed, change24h) {
    // Higher top probability = higher crash risk
    let risk = topProbability * 0.5;
    
    // Extreme greed adds risk
    if (fearGreed > 75) {
        risk += (fearGreed - 75) * 1.5;
    }
    
    // Large negative moves reduce risk
    if (change24h < -10) {
        risk *= 0.7;
    }
    
    // Large positive moves increase risk
    if (change24h > 15) {
        risk += (change24h - 15) * 2;
    }
    
    return Math.min(100, Math.max(0, Math.round(risk)));
}

/**
 * Calculate health score (0-100)
 * Higher = healthier market
 */
function calculateHealthScore(cyclePosition, crashRisk) {
    // Early cycle = high health
    // Late cycle = low health
    
    let health = 100 - (cyclePosition * 0.5) - (crashRisk * 0.5);
    
    return Math.min(100, Math.max(0, Math.round(health)));
}

/**
 * Calculate fair value using power law
 */
function calculateFairValue(daysSinceBottom, currentPrice) {
    // Simple power law: Price = a * days^b
    // Using conservative parameters
    const a = 100;
    const b = 0.5;
    
    const fairValue = a * Math.pow(daysSinceBottom, b);
    
    return Math.round(fairValue);
}

/**
 * Predict cycle top and next bottom
 */
function predictCycleLevels(daysSinceHalving, currentPrice) {
    // Historical cycle tops occur ~1.5 years after halving
    // Returns diminish each cycle
    
    const cycleMultiplier = daysSinceHalving < 365 ? 3.5 : 2.5;
    const predictedTop = Math.round(currentPrice * cycleMultiplier);
    
    // Bottom typically 80-85% down from top
    const predictedBottom = Math.round(predictedTop * 0.2);
    
    return { top: predictedTop, bottom: predictedBottom };
}

// ===================================
// UI Updates
// ===================================

/**
 * Update all UI elements
 */
function updateAllUI() {
    updateHeader();
    updateCyclePanel();
    updateMacroPanel();
    updateRiskPanel();
    updateSmartTools();
    updateCharts();
    updateAlerts();
    updateTimestamp();
}

/**
 * Update header metrics
 */
function updateHeader() {
    if (!state.bitcoin) return;
    
    // Price
    setText('headerPrice', formatCurrency(state.bitcoin.usd, 0));
    
    // 24h Change
    const change = state.bitcoin.usd_24h_change || 0;
    const changeEl = document.getElementById('headerChange');
    if (changeEl) {
        changeEl.textContent = formatPercentage(change);
        changeEl.className = 'metric-change ' + (change >= 0 ? 'positive' : 'negative');
    }
    
    // Market Regime
    const regime = determineRegime();
    setText('marketRegime', regime);
    
    // Health Score
    setText('healthScore', state.computed.healthScore);
    setBarWidth('healthBarFill', state.computed.healthScore);
}

/**
 * Determine market regime
 */
function determineRegime() {
    const position = state.computed.cyclePosition;
    
    if (position < 25) return 'ACCUMULATION';
    if (position < 50) return 'EARLY BULL';
    if (position < 75) return 'LATE BULL';
    return 'DISTRIBUTION';
}

/**
 * Update cycle panel
 */
function updateCyclePanel() {
    if (!state.bitcoin || !state.bitcoinData) return;
    
    const price = state.bitcoin.usd;
    const ath = state.bitcoinData.market_data.ath.usd;
    const daysSinceHalving = Math.floor((Date.now() - CONFIG.HALVING_DATE) / (1000 * 60 * 60 * 24));
    
    setText('currentPrice', formatCurrency(price, 0));
    setText('athDistance', formatPercentage((price / ath - 1) * 100));
    setText('daysSinceHalving', daysSinceHalving);
    setText('cyclePosition', state.computed.cyclePosition + '%');
    
    setText('topProbability', state.computed.topProbability + '%');
    setBarWidth('topProbabilityFill', state.computed.topProbability);
    
    setText('predictedTop', formatCurrency(state.computed.predictedTop, 0));
    setText('predictedBottom', formatCurrency(state.computed.predictedBottom, 0));
}

/**
 * Update macro panel
 */
function updateMacroPanel() {
    // M2 (mock data - requires FRED API key)
    setText('m2Value', '$80 T');
    setText('m2Trend', '+5.2%');
    document.getElementById('m2Trend').className = 'macro-trend positive';
    
    // DXY (mock data - requires paid API)
    setText('dxyValue', '104.5');
    setText('dxyTrend', '-2.1%');
    document.getElementById('dxyTrend').className = 'macro-trend negative';
    
    // Stablecoins
    if (state.stablecoins.usdt && state.stablecoins.usdc) {
        const totalStable = (state.stablecoins.usdt.usd_market_cap || 0) + 
                           (state.stablecoins.usdc.usd_market_cap || 0);
        setText('stablecoinValue', '$' + formatLargeNumber(totalStable, 1));
        setText('stablecoinTrend', '+12.3%');
        document.getElementById('stablecoinTrend').className = 'macro-trend positive';
    }
    
    // Fear & Greed
    if (state.fearGreed) {
        setText('fearGreedValue', state.fearGreed.value);
        setText('fearGreedLabel', state.fearGreed.value_classification);
    }
}

/**
 * Update risk panel
 */
function updateRiskPanel() {
    // Crash probability gauge
    setText('crashProbability', state.computed.crashRisk + '%');
    setGaugeProgress('crashGaugeProgress', state.computed.crashRisk);
    
    // Update gauge color
    const gaugeProgress = document.getElementById('crashGaugeProgress');
    if (gaugeProgress) {
        if (state.computed.crashRisk > 70) {
            gaugeProgress.style.stroke = '#ff3366';
        } else if (state.computed.crashRisk > 40) {
            gaugeProgress.style.stroke = '#ffaa00';
        } else {
            gaugeProgress.style.stroke = '#00ff88';
        }
    }
    
    // Bubble detection
    const bubbleAlert = document.getElementById('bubbleAlert');
    const bubbleStatus = document.getElementById('bubbleStatus');
    if (bubbleAlert && bubbleStatus) {
        if (state.computed.topProbability > 80 && state.computed.crashRisk > 70) {
            bubbleAlert.className = 'alert-box warning';
            bubbleStatus.textContent = 'BUBBLE DETECTED';
        } else if (state.computed.topProbability > 60) {
            bubbleStatus.textContent = 'ELEVATED RISK';
        } else {
            bubbleStatus.textContent = 'MONITORING';
        }
    }
    
    // Risk breakdown
    const overvaluation = Math.min(100, state.computed.topProbability);
    const momentum = Math.min(100, state.computed.cyclePosition);
    const sentiment = state.fearGreed ? Math.min(100, parseInt(state.fearGreed.value)) : 50;
    
    setBarWidth('overvaluationRisk', overvaluation);
    setText('overvaluationValue', overvaluation + '%');
    
    setBarWidth('momentumRisk', momentum);
    setText('momentumValue', momentum + '%');
    
    setBarWidth('sentimentRisk', sentiment);
    setText('sentimentValue', sentiment + '%');
}

/**
 * Update smart tools
 */
function updateSmartTools() {
    if (!state.bitcoin) return;
    
    // Smart Buy Zone
    const buyZone = determineBuyZone();
    setText('buyZoneIndicator', `<div class="zone-status">${buyZone.status}</div><div class="zone-price">Entry: ${formatCurrency(buyZone.price, 0)}</div>`);
    
    // DCA Allocation
    const dcaAllocation = calculateDCAAllocation();
    setText('dcaAllocation', dcaAllocation + '%');
    
    // Fair Value
    setText('fairValue', formatCurrency(state.computed.fairValue, 0));
    const deviation = ((state.bitcoin.usd / state.computed.fairValue - 1) * 100).toFixed(1);
    setText('fairValueDev', (deviation > 0 ? '+' : '') + deviation + '% from fair value');
    
    // AI Cycle Meter
    setBarPosition('cycleMeterFill', state.computed.cyclePosition);
}

/**
 * Determine buy zone
 */
function determineBuyZone() {
    const risk = state.computed.crashRisk;
    const position = state.computed.cyclePosition;
    const price = state.bitcoin.usd;
    
    if (position < 30 && risk < 30) {
        return { status: 'STRONG BUY', price: price * 0.95 };
    } else if (position < 50 && risk < 50) {
        return { status: 'ACCUMULATE', price: price * 0.98 };
    } else if (position < 70) {
        return { status: 'HOLD', price: price };
    } else {
        return { status: 'CAUTION', price: price };
    }
}

/**
 * Calculate DCA allocation
 */
function calculateDCAAllocation() {
    const health = state.computed.healthScore;
    
    // Higher health = higher allocation
    if (health > 70) return 100;
    if (health > 50) return 75;
    if (health > 30) return 50;
    return 25;
}

/**
 * Update charts
 */
function updateCharts() {
    updatePriceChart();
    updateLiquidityRadar();
    updateRecessionChart();
}

/**
 * Update price chart
 */
function updatePriceChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (!state.charts.price) {
        state.charts.price = new Chart(ctx, {
            type: 'line',
            data: {
                labels: state.history.prices.map((_, i) => i),
                datasets: [{
                    label: 'BTC Price',
                    data: state.history.prices,
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { display: false },
                    y: {
                        ticks: { color: '#9aa0a6' },
                        grid: { color: '#2a3142' }
                    }
                }
            }
        });
    } else {
        state.charts.price.data.labels = state.history.prices.map((_, i) => i);
        state.charts.price.data.datasets[0].data = state.history.prices;
        state.charts.price.update('none');
    }
}

/**
 * Update liquidity radar
 */
function updateLiquidityRadar() {
    const canvas = document.getElementById('liquidityRadar');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (!state.charts.radar) {
        state.charts.radar = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['M2', 'Stablecoins', 'DXY', 'BTC Dominance', 'Fear & Greed'],
                datasets: [{
                    label: 'Liquidity Factors',
                    data: [65, 70, 45, 55, state.fearGreed ? parseInt(state.fearGreed.value) : 50],
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.2)',
                    pointBackgroundColor: '#00ff88'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        ticks: { color: '#9aa0a6', backdropColor: 'transparent' },
                        grid: { color: '#2a3142' },
                        pointLabels: { color: '#9aa0a6' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } else {
        state.charts.radar.data.datasets[0].data[4] = state.fearGreed ? parseInt(state.fearGreed.value) : 50;
        state.charts.radar.update('none');
    }
}

/**
 * Update recession chart
 */
function updateRecessionChart() {
    const canvas = document.getElementById('recessionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (!state.charts.recession) {
        state.charts.recession = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Recession Risk',
                    data: [25, 30, 28, 35, 32, 30],
                    borderColor: '#ffaa00',
                    backgroundColor: 'rgba(255, 170, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: '#9aa0a6' },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: '#9aa0a6' },
                        grid: { color: '#2a3142' }
                    }
                }
            }
        });
    }
}

/**
 * Update alerts
 */
function updateAlerts() {
    const overlay = document.getElementById('alertOverlay');
    const icon = document.getElementById('alertIcon');
    const title = document.getElementById('alertTitle');
    const message = document.getElementById('alertMessage');
    
    if (state.computed.crashRisk > 80) {
        if (overlay) {
            icon.textContent = '🚨';
            title.textContent = 'CRITICAL CRASH RISK';
            message.textContent = 'Market showing extreme crash indicators. Consider reducing exposure.';
            overlay.style.display = 'flex';
            
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 5000);
        }
    }
}

/**
 * Update status indicator
 */
function updateStatus(status, text) {
    const dot = document.getElementById('statusDot');
    const textEl = document.getElementById('statusText');
    
    if (dot && textEl) {
        textEl.textContent = text;
        
        if (status === 'live') {
            dot.style.background = '#00ff88';
        } else if (status === 'updating') {
            dot.style.background = '#ffaa00';
        } else {
            dot.style.background = '#ff3366';
        }
    }
}

/**
 * Update timestamp
 */
function updateTimestamp() {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    setText('lastUpdate', time);
}

// ===================================
// Utility Functions
// ===================================

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = text;
}

function setBarWidth(id, percent) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min(100, Math.max(0, percent)) + '%';
}

function setBarPosition(id, percent) {
    const el = document.getElementById(id);
    if (el) el.style.left = Math.min(100, Math.max(0, percent)) + '%';
}

function setGaugeProgress(id, percent) {
    const el = document.getElementById(id);
    if (el) {
        const circumference = 2 * Math.PI * 80;
        const offset = circumference - (percent / 100) * circumference;
        el.style.strokeDashoffset = offset;
    }
}

function formatCurrency(num, decimals = 0) {
    if (!num || isNaN(num)) return '$--';
    return '$' + num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatPercentage(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '--%';
    const sign = num >= 0 ? '+' : '';
    return sign + num.toFixed(decimals) + '%';
}

function formatLargeNumber(num, decimals = 1) {
    if (!num || isNaN(num)) return '--';
    if (num >= 1e12) return (num / 1e12).toFixed(decimals) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
    return num.toFixed(decimals);
}

// ===================================
// Initialization
// ===================================

async function init() {
    console.log('Initializing BTC Intelligence Terminal...');
    
    // Initial fetch
    await fetchAllData();
    
    // Set up update interval
    setInterval(fetchAllData, CONFIG.UPDATE_INTERVAL);
    
    console.log('Terminal initialized successfully');
}

// Start on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (state.charts.price) state.charts.price.destroy();
    if (state.charts.radar) state.charts.radar.destroy();
    if (state.charts.recession) state.charts.recession.destroy();
});
