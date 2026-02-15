/**
 * Bitcoin Intelligence Dashboard - Main Application
 * Enhanced with Institutional-Grade Data Engine
 */

// Import data engine modules (using script type="module" in HTML)
import { dataPipeline } from './src/dataEngine/pipeline.js';
import { getConfidenceStatus } from './src/dataEngine/confidence.js';
import { globalCache } from './src/dataEngine/cache.js';

// Constants
const HALVING_DATE = new Date('2024-04-20');

// Application state
const app = {
    initialized: false,
    lastUIUpdate: null
};

// ===================================
// Initialization
// ===================================

/**
 * Initialize dashboard
 */
async function initDashboard() {
    console.log('Initializing Bitcoin Intelligence Dashboard (Enhanced)...');
    
    updateStatusIndicator('updating', 'Initializing...');
    
    try {
        // Initialize data pipeline
        await dataPipeline.initialize();
        
        // Setup UI update listeners
        setupPipelineListeners();
        
        // Perform initial UI update
        updateAllUI();
        
        // Mark as initialized
        app.initialized = true;
        updateStatusIndicator('live', 'Live');
        
        console.log('Dashboard initialized successfully');
        
    } catch (error) {
        console.error('Initialization error:', error);
        updateStatusIndicator('error', 'Initialization Failed');
    }
}

/**
 * Setup pipeline event listeners
 */
function setupPipelineListeners() {
    dataPipeline.coordinator.on('updateSuccess', (event) => {
        // Update UI when data updates
        if (['marketData', 'sentiment', 'stablecoins'].includes(event.name)) {
            updateAllUI();
        }
    });
    
    dataPipeline.coordinator.on('updateFailed', (event) => {
        console.warn(`Data update failed: ${event.name}`);
        updateDataHealthIndicator();
    });
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
 * Update all UI sections
 */
function updateAllUI() {
    const state = dataPipeline.getState();
    
    if (!state.bitcoin || !state.global) {
        console.warn('Insufficient data for UI update');
        return;
    }
    
    updateMarketOverview(state);
    updateLayer1(state);
    updateLayer5(state);
    updateLayer7(state);
    updateConfidenceIndicator(state);
    updateDataHealthIndicator(state);
    updateTimestamp();
    
    app.lastUIUpdate = Date.now();
}

/**
 * Update Market Overview section
 */
function updateMarketOverview(state) {
    const btc = state.bitcoin;
    const global = state.global;
    
    if (!btc || !global) return;
    
    const marketData = btc.market_data;
    
    // Current Price
    updateElement('currentPrice', formatCurrency(marketData.current_price.usd, 0));
    
    // 24h Change
    const change = marketData.price_change_percentage_24h;
    const changeElement = document.getElementById('priceChange');
    if (changeElement) {
        changeElement.textContent = formatPercentage(change);
        changeElement.className = 'card-change ' + (change >= 0 ? 'positive' : 'negative');
    }
    
    // Market Cap
    updateElement('marketCap', '$' + formatLargeNumber(marketData.market_cap.usd, 2));
    updateElement('marketCapRank', btc.market_cap_rank || '1');
    
    // 24h Volume
    updateElement('volume24h', '$' + formatLargeNumber(marketData.total_volume.usd, 2));
    
    // BTC Dominance
    const dominance = global.market_cap_percentage.btc;
    updateElement('btcDominance', dominance.toFixed(2) + '%');
}

/**
 * Update Layer 1: Price & Cycle
 */
function updateLayer1(state) {
    const btc = state.bitcoin;
    
    if (!btc) return;
    
    const marketData = btc.market_data;
    
    // Current Price
    updateElement('layer1Price', formatCurrency(marketData.current_price.usd, 0));
    
    // All-Time High
    updateElement('athPrice', formatCurrency(marketData.ath.usd, 0));
    
    if (marketData.ath_date.usd) {
        const athDate = new Date(marketData.ath_date.usd);
        updateElement('athDate', athDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        }));
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
    updateElement('daysSinceHalving', formatNumber(calculateDaysSinceHalving(), 0));
    
    // Circulating Supply
    const supply = marketData.circulating_supply;
    updateElement('circulatingSupply', formatNumber(supply / 1e6, 2) + ' M');
    
    // Composite Risk Score
    const riskScore = state.computed.riskScore;
    if (riskScore !== null) {
        updateElement('riskScore', riskScore);
        
        const riskBarFillElement = document.getElementById('riskBarFill');
        if (riskBarFillElement) {
            riskBarFillElement.style.width = riskScore + '%';
            
            const { zone, class: zoneClass } = getRiskZone(riskScore);
            riskBarFillElement.className = 'risk-bar-fill ' + zoneClass;
            
            updateElement('riskZone', zone);
        }
    }
}

/**
 * Update Layer 5: Stablecoin Liquidity
 */
function updateLayer5(state) {
    const { usdt, usdc } = state.stablecoins;
    
    if (!usdt || !usdc) return;
    
    // USDT Market Cap
    const usdtMcap = usdt.market_data.market_cap.usd;
    updateElement('usdtMarketCap', '$' + formatLargeNumber(usdtMcap, 2));
    
    // USDC Market Cap
    const usdcMcap = usdc.market_data.market_cap.usd;
    updateElement('usdcMarketCap', '$' + formatLargeNumber(usdcMcap, 2));
    
    // Total Stablecoin
    const total = usdtMcap + usdcMcap;
    updateElement('totalStablecoin', '$' + formatLargeNumber(total, 2));
}

/**
 * Update Layer 7: Sentiment
 */
function updateLayer7(state) {
    const fearGreed = state.fearGreed;
    
    if (!fearGreed) return;
    
    const value = parseInt(fearGreed.value);
    
    // Fear & Greed Value
    updateElement('fearGreedValue', value);
    
    // Sentiment Bar
    const barElement = document.getElementById('sentimentBarFill');
    if (barElement) {
        barElement.style.width = value + '%';
    }
    
    // Classification
    updateElement('fearGreedClassification', fearGreed.value_classification);
    
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
    updateElement('sentimentInterpretation', getSentimentInterpretation(value));
}

/**
 * Update confidence indicator
 */
function updateConfidenceIndicator(state) {
    const confidence = state.computed.confidence;
    
    if (!confidence) return;
    
    const confidenceElement = document.getElementById('confidenceScore');
    const confidenceBarElement = document.getElementById('confidenceBar');
    const confidenceStatusElement = document.getElementById('confidenceStatus');
    
    if (confidenceElement) {
        confidenceElement.textContent = confidence.score;
    }
    
    if (confidenceBarElement) {
        confidenceBarElement.style.width = confidence.score + '%';
        
        const status = getConfidenceStatus(confidence.score);
        confidenceBarElement.style.background = status.color;
        
        if (confidenceStatusElement) {
            confidenceStatusElement.textContent = status.label;
            confidenceStatusElement.style.color = status.color;
        }
    }
}

/**
 * Update data health indicator
 */
function updateDataHealthIndicator(state) {
    const stats = dataPipeline.getStats();
    const apiHealth = stats.apiHealth;
    
    if (!apiHealth) return;
    
    const healthElement = document.getElementById('apiHealth');
    const healthDotElement = document.getElementById('healthDot');
    
    if (healthElement) {
        healthElement.textContent = apiHealth.overall.toUpperCase();
    }
    
    if (healthDotElement) {
        let color;
        switch (apiHealth.overall) {
            case 'healthy':
                color = 'var(--accent-green)';
                break;
            case 'degraded':
                color = 'var(--accent-yellow)';
                break;
            case 'critical':
                color = 'var(--accent-red)';
                break;
            default:
                color = 'var(--accent-primary)';
        }
        healthDotElement.style.background = color;
    }
}

/**
 * Update status indicator
 */
function updateStatusIndicator(status, text) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (!statusDot || !statusText) return;
    
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
    
    updateElement('lastUpdate', timeString);
}

// ===================================
// Utility Functions
// ===================================

/**
 * Update element text content safely
 */
function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

/**
 * Format number with commas
 */
function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Format currency
 */
function formatCurrency(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return '$--';
    return '$' + formatNumber(num, decimals);
}

/**
 * Format percentage
 */
function formatPercentage(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '--%';
    const sign = num >= 0 ? '+' : '';
    return sign + num.toFixed(decimals) + '%';
}

/**
 * Format large numbers (billions, millions)
 */
function formatLargeNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    
    if (num >= 1e9) {
        return formatNumber(num / 1e9, decimals) + ' B';
    } else if (num >= 1e6) {
        return formatNumber(num / 1e6, decimals) + ' M';
    }
    return formatNumber(num, decimals);
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
    if (dataPipeline) {
        dataPipeline.stop();
    }
});

// Export for debugging
window.dataPipeline = dataPipeline;
window.globalCache = globalCache;
