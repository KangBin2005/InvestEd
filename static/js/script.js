/* ========================================
   INVESTED APP - MAIN JAVASCRIPT
   ======================================== */

// ---------- GLOBAL CONSTANTS ----------
const INVESTMENT_TYPES = [
    { name: "Bank Savings", rate: 0.001, color: "#94a3b8", risk: "Very Low", icon: "🏦" },
    { name: "Fixed Deposit", rate: 0.01, color: "#60a5fa", risk: "Low", icon: "📀" },
    { name: "CPF OA", rate: 0.025, color: "#34d399", risk: "Very Low", icon: "🏛️" },
    { name: "Bond Funds", rate: 0.04, color: "#fbbf24", risk: "Low-Med", icon: "📜" },
    { name: "Index Funds", rate: 0.06, color: "#f97316", risk: "Medium", icon: "📊" },
    { name: "Stocks", rate: 0.08, color: "#f43f5e", risk: "High", icon: "⚡" }
];

const SCENARIOS = {
    student: { start: 1000, monthly: 200, income: 25000 },
    professional: { start: 10000, monthly: 1000, income: 50000 },
    family: { start: 50000, monthly: 1500, income: 70000 },
    high_earner: { start: 100000, monthly: 3000, income: 100000 }
};

// ---------- UTILITY FUNCTIONS ----------
function fmtMoney(v) {
    if (!isFinite(v) || v === null || v < 0) return '$0';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(v);
}

function formatYears(y) {
    if (!isFinite(y) || y === null) return 'Never';
    if (y > 100) return '100+';
    if (y < 0) return 'Never';
    return Math.ceil(y);
}

function portfolioValue(pv, pmt, rate, n) {
    if (rate === 0) return pv + pmt * n;
    return pv * Math.pow(1 + rate, n) + pmt * (Math.pow(1 + rate, n) - 1) / rate;
}

function yearsToTarget(pv, pmt, rate, target) {
    if (target <= pv) return 0;
    if (rate === 0) {
        if (pmt <= 0) return 999;
        return (target - pv) / pmt;
    }
    const A = target + pmt / rate;
    const B = pv + pmt / rate;
    if (B <= 0 || A <= 0 || A / B <= 0) return 999;
    const years = Math.log(A / B) / Math.log(1 + rate);
    if (!isFinite(years) || years < 0) return 999;
    return Math.min(years, 150);
}

// ---------- CALCULATOR PAGE LOGIC ----------
let calculatorChart = null;
let currentCalculatorData = {};

function calculateCalculator() {
    const start = parseFloat(document.getElementById('start-amount')?.value || 5000);
    const monthly = parseFloat(document.getElementById('monthly-invest')?.value || 500);
    const income = parseFloat(document.getElementById('income-goal')?.value || 50000);
    const horizon = parseFloat(document.getElementById('time-horizon')?.value || 30);
    const annualPmt = monthly * 12;

    const results = [];

    INVESTMENT_TYPES.forEach(inv => {
        const r = inv.rate;
        const curve = [];
        for (let y = 0; y <= horizon; y++) {
            curve.push({ year: y, value: portfolioValue(start, annualPmt, r, y) });
        }

        const q1_years = yearsToTarget(start, annualPmt, r, 100000);
        const q2_years = yearsToTarget(start, annualPmt, r, 500000);
        const q3_years = yearsToTarget(start, annualPmt, r, 2500000);
        const fv5 = r > 0.001 ? income / r : income / 0.001;
        let q5_years = yearsToTarget(start, annualPmt, r, fv5);
        
        if (q5_years >= 150 || !isFinite(q5_years)) {
            q5_years = 999;
        }
        
        const finalValue = curve[curve.length - 1].value;
        const totalInvested = start + annualPmt * horizon;
        const multiplier = totalInvested > 0 ? finalValue / totalInvested : 1;

        results.push({
            ...inv,
            curve: curve,
            q1_years: q1_years,
            q2_years: q2_years,
            q3_years: q3_years,
            q5_years: q5_years,
            q5_target: fv5,
            finalValue: finalValue,
            multiplier: multiplier,
            rate_pct: (r * 100).toFixed(1) + '%'
        });
    });

    currentCalculatorData = { results, horizon, annualPmt, start, income };
    renderCalculatorAll();
}

function renderCalculatorAll() {
    const { results, horizon } = currentCalculatorData;

    const growthRatesHtml = results.map(r => `
        <div class="rate-card" style="border-left-color: ${r.color}">
            <div class="rate-icon">${r.icon}</div>
            <div class="rate-info">
                <div class="rate-name">${r.name}</div>
                <div class="rate-value" style="color: ${r.color}">${r.rate_pct}</div>
                <div class="rate-detail">${r.risk} risk</div>
            </div>
            <div class="rate-stats">
                <div>📈 ${fmtMoney(r.finalValue)}</div>
                <div>⚡ ${r.multiplier.toFixed(1)}x</div>
            </div>
        </div>
    `).join('');
    
    const growthRatesDiv = document.getElementById('growth-rates');
    if (growthRatesDiv) growthRatesDiv.innerHTML = growthRatesHtml;

    renderCalculatorChart(results, horizon);

    const legendHtml = results.map(r => `
        <div class="legend-item" data-investment="${r.name}">
            <span class="legend-color" style="background: ${r.color}"></span>
            <span>${r.name} (${r.rate_pct})</span>
        </div>
    `).join('');
    
    const chartLegendDiv = document.getElementById('chart-legend');
    if (chartLegendDiv) chartLegendDiv.innerHTML = legendHtml;

    if (calculatorChart) {
        document.querySelectorAll('.legend-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.dataset.investment;
                const dataset = calculatorChart.data.datasets.find(d => d.label === name);
                if (dataset) {
                    dataset.hidden = !dataset.hidden;
                    calculatorChart.update();
                    item.classList.toggle('muted');
                }
            });
        });
    }

    renderCalculatorMilestoneTable(results);
    updateCalculatorTimelineVisual();
}

function renderCalculatorChart(results, horizon) {
    const ctx = document.getElementById('growth-chart')?.getContext('2d');
    if (!ctx) return;

    const datasets = results.map(r => ({
        label: `${r.name} (${r.rate_pct})`,
        data: r.curve.map(p => ({ x: p.year, y: p.value })),
        borderColor: r.color,
        backgroundColor: r.color + '15',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: r.color,
        fill: false,
        tension: 0.3
    }));

    const milestoneLines = [
        { value: 100000, label: '$100K', color: 'rgba(255,255,255,0.25)' },
        { value: 500000, label: '$500K', color: 'rgba(255,255,255,0.2)' },
        { value: 2500000, label: '$2.5M', color: 'rgba(255,255,255,0.15)' }
    ];

    if (calculatorChart) {
        calculatorChart.data.datasets = datasets;
        calculatorChart.options.scales.x.max = horizon;
        calculatorChart.update();
        return;
    }

    calculatorChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                tooltip: {
                    backgroundColor: '#1a1a24',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: '#333',
                    borderWidth: 1,
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${fmtMoney(context.raw.y)}`
                    }
                },
                legend: { display: false }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: horizon,
                    title: { display: true, text: 'Years', color: '#aaa', font: { size: 14, weight: 'bold' } },
                    ticks: { color: '#aaa', stepSize: 5, callback: (val) => val + ' yrs', font: { size: 11 } },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    title: { display: true, text: 'Portfolio Value', color: '#aaa', font: { size: 14, weight: 'bold' } },
                    ticks: { color: '#aaa', callback: (val) => fmtMoney(val), font: { size: 11 } },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        },
        plugins: [{
            id: 'milestoneLines',
            afterDraw(chart) {
                const { ctx, chartArea: { left, right, top, bottom }, scales } = chart;
                milestoneLines.forEach(line => {
                    const yPos = scales.y.getPixelForValue(line.value);
                    if (yPos >= top && yPos <= bottom) {
                        ctx.save();
                        ctx.strokeStyle = line.color;
                        ctx.lineWidth = 1.5;
                        ctx.setLineDash([8, 6]);
                        ctx.beginPath();
                        ctx.moveTo(left, yPos);
                        ctx.lineTo(right, yPos);
                        ctx.stroke();
                        ctx.fillStyle = line.color;
                        ctx.font = 'bold 11px monospace';
                        ctx.fillText(line.label, left + 8, yPos - 5);
                        ctx.restore();
                    }
                });
            }
        }]
    });
}

function renderCalculatorMilestoneTable(results) {
    let tableHtml = `<table class="data-table"><thead>
        <tr><th>Investment</th><th>Return</th><th>Risk</th><th>→ $100K</th><th>→ $500K</th><th>→ $2.5M</th><th>🏁 Your Freedom</th><th>Portfolio Needed</th>
        </tr></thead><tbody>`;

    results.forEach(r => {
        const freedomDisplay = r.q5_years >= 100 ? 'Never' : formatYears(r.q5_years);
        tableHtml += `<tr style="border-left: 3px solid ${r.color}">
            <td><strong>${r.icon} ${r.name}</strong><br><small style="color:#666">${r.risk} risk</small></td>
            <td><span class="rate-badge" style="background:${r.color}20; color:${r.color}">${r.rate_pct}</span></td>
            <td><span class="risk-dot" style="background:${r.risk === 'High' ? '#ef4444' : r.risk === 'Medium' ? '#f59e0b' : '#10b981'}"></span> ${r.risk}</td>
            <td><strong>${formatYears(r.q1_years)} yrs</strong></td>
            <td>${formatYears(r.q2_years)} yrs</td>
            <td>${formatYears(r.q3_years)} yrs</td>
            <td><strong class="freedom-year" style="color:${r.color}">${freedomDisplay}</strong></td>
            <td>${fmtMoney(r.q5_target)}</td>
        </tr>`;
    });
    tableHtml += '</tbody></table>';

    const bestStocks = results.find(r => r.name === "Stocks");
    const worstSavings = results.find(r => r.name === "Bank Savings");

    if (bestStocks && worstSavings) {
        const stocksYears = bestStocks.q5_years;
        const savingsYears = worstSavings.q5_years;
        
        // Only show difference if both are valid numbers and savings isn't "Never"
        if (stocksYears < 100 && savingsYears < 100 && stocksYears > 0 && savingsYears > 0) {
            const diffYears = formatYears(savingsYears) - formatYears(stocksYears);
            if (diffYears > 0 && isFinite(diffYears)) {
                tableHtml += `
                    <div class="table-summary" style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-elevated); border-radius: 12px;">
                        <div class="summary-stat"><span>⚡ Fastest to freedom:</span> <strong style="color:#f43f5e">Stocks (${formatYears(stocksYears)} years)</strong></div>
                        <div class="summary-stat"><span>🐢 Slowest to freedom:</span> <strong style="color:#94a3b8">Savings (${formatYears(savingsYears)} years)</strong></div>
                        <div class="summary-stat"><span>📊 You could be free <strong style="color:var(--accent)">${diffYears} years sooner</strong> with stocks!</span></div>
                    </div>
                `;
            } else {
                tableHtml += `
                    <div class="table-summary" style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-elevated); border-radius: 12px;">
                        <div class="summary-stat"><span>⚡ Fastest to freedom:</span> <strong style="color:#f43f5e">Stocks (${formatYears(stocksYears)} years)</strong></div>
                        <div class="summary-stat"><span>🐢 Savings may never reach your freedom goal at this rate</span></div>
                        <div class="summary-stat"><span>💡 Try increasing your monthly savings or lowering your income goal!</span></div>
                    </div>
                `;
            }
        } else {
            tableHtml += `
                <div class="table-summary" style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-elevated); border-radius: 12px;">
                    <div class="summary-stat"><span>⚡ Fastest to freedom:</span> <strong style="color:#f43f5e">Stocks (${formatYears(stocksYears)} years)</strong></div>
                    <div class="summary-stat"><span>💡 Tip:</span> Higher returns = faster freedom. Try adjusting your savings rate!</div>
                </div>
            `;
        }
    }
    
    const milestoneTableDiv = document.getElementById('milestone-table');
    if (milestoneTableDiv) milestoneTableDiv.innerHTML = tableHtml;
}

function updateCalculatorTimelineVisual() {
    const results = currentCalculatorData.results;
    if (!results) return;

    const stocks = results.find(r => r.name === "Stocks");
    const savings = results.find(r => r.name === "Bank Savings");
    const horizon = currentCalculatorData.horizon;

    if (!stocks || !savings) return;

    let stocksFreedom = stocks.q5_years;
    let savingsFreedom = savings.q5_years;
    
    // Cap for display purposes
    if (stocksFreedom > 60) stocksFreedom = 60;
    if (savingsFreedom > 60) savingsFreedom = 60;
    
    const maxYear = Math.max(stocksFreedom, savingsFreedom, horizon, 30);

    let timelineHtml = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-size: 0.85rem; font-weight: 600; width: 70px;">⚡ STOCKS</span>
            <div style="flex: 1; background: var(--bg-dark); height: 40px; border-radius: 20px; position: relative; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #f43f5e, #f97316); width: ${Math.min(95, (stocksFreedom / maxYear) * 100)}%; height: 100%; border-radius: 20px; display: flex; align-items: center; justify-content: flex-end; padding-right: 12px;">
                    <span style="font-size: 0.85rem; color: white; font-weight: 700;">${stocks.q5_years >= 100 ? 'Never' : formatYears(stocksFreedom)}</span>
                </div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-size: 0.85rem; font-weight: 600; width: 70px;">🏦 SAVINGS</span>
            <div style="flex: 1; background: var(--bg-dark); height: 40px; border-radius: 20px; position: relative; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #94a3b8, #64748b); width: ${Math.min(95, (savingsFreedom / maxYear) * 100)}%; height: 100%; border-radius: 20px; display: flex; align-items: center; justify-content: flex-end; padding-right: 12px;">
                    <span style="font-size: 0.85rem; color: white; font-weight: 700;">${savings.q5_years >= 100 ? 'Never' : formatYears(savingsFreedom)}</span>
                </div>
            </div>
        </div>
        <div style="position: relative; margin-top: 0.5rem; padding-top: 0.5rem;">
            <div style="position: absolute; left: ${Math.min(95, (horizon / maxYear) * 100)}%; transform: translateX(-50%);">
                <div style="width: 3px; height: 24px; background: var(--accent); border-radius: 2px;"></div>
                <div style="font-size: 0.7rem; color: var(--accent); font-weight: 600; margin-top: 4px;">YOU ARE HERE</div>
            </div>
        </div>
    `;
    
    const timelineVisualDiv = document.getElementById('timeline-visual');
    if (timelineVisualDiv) timelineVisualDiv.innerHTML = timelineHtml;
}

// ---------- COMPARE PAGE LOGIC ----------
let compareChart = null;

function calculateCompare() {
    const start = parseFloat(document.getElementById('compare-start')?.value || 10000);
    const monthly = parseFloat(document.getElementById('compare-monthly')?.value || 500);
    const years = parseInt(document.getElementById('compare-years')?.value || 20);
    const annualPmt = monthly * 12;

    const startValDiv = document.getElementById('compare-start-val');
    const monthlyValDiv = document.getElementById('compare-monthly-val');
    const yearsValDiv = document.getElementById('compare-years-val');
    
    if (startValDiv) startValDiv.innerHTML = fmtMoney(start);
    if (monthlyValDiv) monthlyValDiv.innerHTML = '$' + monthly.toLocaleString();
    if (yearsValDiv) yearsValDiv.innerHTML = years + ' years';

    const results = INVESTMENT_TYPES.map(inv => {
        const finalValue = portfolioValue(start, annualPmt, inv.rate, years);
        const totalContributions = start + (annualPmt * years);
        const totalEarnings = finalValue - totalContributions;
        return {
            ...inv,
            final_value: finalValue,
            total_contributions: totalContributions,
            total_earnings: totalEarnings,
            rate_pct: (inv.rate * 100).toFixed(1) + '%'
        };
    }).sort((a, b) => a.rate - b.rate);

    renderCompare(results, years);
    updateCompareGrowthBars(start, years);
}

function renderCompare(results, years) {
    const ctx = document.getElementById('compare-chart')?.getContext('2d');
    if (!ctx) return;

    const chartData = {
        labels: results.map(r => `${r.icon} ${r.name.split(' ')[0]}`),
        datasets: [{
            label: `Final Value after ${years} years`,
            data: results.map(r => r.final_value),
            backgroundColor: results.map(r => r.color + '99'),
            borderColor: results.map(r => r.color),
            borderWidth: 2,
            borderRadius: 10,
            barPercentage: 0.7,
            categoryPercentage: 0.8
        }]
    };

    if (compareChart) {
        compareChart.data = chartData;
        compareChart.update();
    } else {
        compareChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1a1a24',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${fmtMoney(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Portfolio Value', color: '#aaa', font: { size: 13, weight: 'bold' } },
                        ticks: { callback: v => fmtMoney(v), color: '#aaa', font: { size: 11 } },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#ccc', font: { weight: 'bold', size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    let tableHtml = `<table class="data-table"><thead>
        <tr><th>Investment</th><th>Return</th><th>Risk</th><th>Final Value</th><th>You Put In</th><th>You Earned</th><th>Growth</th>
        </tr></thead><tbody>`;
    results.forEach(r => {
        const growthPct = ((r.final_value - r.total_contributions) / r.total_contributions * 100).toFixed(0);
        tableHtml += `<tr style="border-left: 3px solid ${r.color}">
            <td><strong>${r.icon} ${r.name}</strong></td>
            <td><span class="rate-badge" style="background:${r.color}20;color:${r.color}">${r.rate_pct}</span></td>
            <td><span class="risk-badge ${r.risk.toLowerCase().replace(' ', '-')}">${r.risk}</span></td>
            <td><strong>${fmtMoney(r.final_value)}</strong></td>
            <td>${fmtMoney(r.total_contributions)}</td>
            <td>${fmtMoney(r.total_earnings)}</td>
            <td style="color:${r.color}; font-weight:700;">+${growthPct}%</td>
        </tr>`;
    });
    tableHtml += '</tbody></table>';
    
    const compareTableDiv = document.getElementById('compare-table');
    if (compareTableDiv) compareTableDiv.innerHTML = tableHtml;

    const best = results[results.length - 1];
    const worst = results[0];
    const diff = best.final_value - worst.final_value;
    const insightsHtml = `
        <div class="insight-card"><div class="insight-icon">💡</div><div class="insight-text"><strong>Big difference!</strong> Investing in ${best.name} instead of ${worst.name} gives you <strong>${fmtMoney(diff)} more</strong> over ${years} years — with the exact same monthly savings.</div></div>
        <div class="insight-card"><div class="insight-icon">⚠️</div><div class="insight-text"><strong>Risk reminder:</strong> Higher returns = higher ups and downs. ${best.name} can drop 30-50% in bad years, while ${worst.name} stays steady. Choose based on when you need the money!</div></div>
        <div class="insight-card"><div class="insight-icon">⏰</div><div class="insight-text"><strong>Time is powerful:</strong> Try increasing the years above — the gap gets MUCH bigger over time. That's compound interest!</div></div>
    `;
    
    const compareInsightsDiv = document.getElementById('compare-insights');
    if (compareInsightsDiv) compareInsightsDiv.innerHTML = insightsHtml;
}

function updateCompareGrowthBars(start, years) {
    const rates = [0.01, 0.025, 0.04, 0.06, 0.08];
    const values = rates.map(r => start * Math.pow(1 + r, years));
    const maxValue = Math.max(...values);

    values.forEach((v, i) => {
        const heightPercent = (v / maxValue) * 100;
        const bar = document.getElementById(`growth-bar-${i + 1}`);
        if (bar) {
            bar.style.height = Math.max(40, heightPercent) + 'px';
            bar.style.width = '100%';
            bar.style.minHeight = '40px';
        }
    });

    const valuesHtml = values.map(v => `<span style="font-weight:600;">${fmtMoney(v)}</span>`).join('');
    const growthValuesDiv = document.getElementById('growth-values');
    if (growthValuesDiv) growthValuesDiv.innerHTML = valuesHtml;
}

// ---------- BASICS PAGE LOGIC ----------
function initBasicsPage() {
    // Compound interest demo
    const principalInput = document.getElementById('demo-principal');
    const rateInput = document.getElementById('demo-rate');
    const yearsInput = document.getElementById('demo-years');

    function updateCompound() {
        const P = parseFloat(principalInput?.value || 100);
        const r = parseFloat(rateInput?.value || 10) / 100;
        const n = parseInt(yearsInput?.value || 3);
        const final = P * Math.pow(1 + r, n);
        const earned = final - P;

        const principalVal = document.getElementById('demo-principal-val');
        const rateVal = document.getElementById('demo-rate-val');
        const yearsVal = document.getElementById('demo-years-val');
        const yearsDisplay = document.getElementById('demo-years-display');
        const resultDiv = document.getElementById('demo-result');
        const investedSpan = document.getElementById('demo-invested');
        const earnedSpan = document.getElementById('demo-earned');

        if (principalVal) principalVal.textContent = P.toLocaleString();
        if (rateVal) rateVal.textContent = rateInput?.value;
        if (yearsVal) yearsVal.textContent = n;
        if (yearsDisplay) yearsDisplay.textContent = n;
        if (resultDiv) resultDiv.textContent = '$' + final.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (investedSpan) investedSpan.innerHTML = '$' + P.toLocaleString();
        if (earnedSpan) earnedSpan.innerHTML = '$' + earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    principalInput?.addEventListener('input', updateCompound);
    rateInput?.addEventListener('input', updateCompound);
    yearsInput?.addEventListener('input', updateCompound);
    updateCompound();

    // Rate comparison demo
    const ratePrincipal = document.getElementById('rate-principal');
    const rateYears = document.getElementById('rate-years');

    function updateRateCompare() {
        const P = parseFloat(ratePrincipal?.value || 1000);
        const n = parseInt(rateYears?.value || 20);
        const savings = P * Math.pow(1 + 0.01, n);
        const bonds = P * Math.pow(1 + 0.04, n);
        const stocks = P * Math.pow(1 + 0.08, n);

        const ratePrincipalVal = document.getElementById('rate-principal-val');
        const rateYearsVal = document.getElementById('rate-years-val');
        const savingsResult = document.getElementById('savings-result');
        const bondsResult = document.getElementById('bonds-result');
        const stocksResult = document.getElementById('stocks-result');

        if (ratePrincipalVal) ratePrincipalVal.textContent = P.toLocaleString();
        if (rateYearsVal) rateYearsVal.textContent = n;
        if (savingsResult) savingsResult.innerHTML = '$' + Math.round(savings).toLocaleString();
        if (bondsResult) bondsResult.innerHTML = '$' + Math.round(bonds).toLocaleString();
        if (stocksResult) stocksResult.innerHTML = '$' + Math.round(stocks).toLocaleString();
    }

    ratePrincipal?.addEventListener('input', updateRateCompare);
    rateYears?.addEventListener('input', updateRateCompare);
    updateRateCompare();

    // Risk simulator
    const safeBtn = document.getElementById('safe-btn');
    const mediumBtn = document.getElementById('medium-btn');
    const riskyBtn = document.getElementById('risky-btn');

    function updateRisk(type) {
        const riskReturn = document.getElementById('risk-return');
        const riskWarning = document.getElementById('risk-warning');
        if (!riskReturn || !riskWarning) return;
        
        if (type === 'safe') {
            riskReturn.innerHTML = '+3% per year';
            riskReturn.style.color = '#10b981';
            riskWarning.innerHTML = 'Almost never loses money. Safe and steady.';
        } else if (type === 'medium') {
            riskReturn.innerHTML = '+6% per year';
            riskReturn.style.color = '#f59e0b';
            riskWarning.innerHTML = 'Some down years (-10% to -20%), but recovers.';
        } else {
            riskReturn.innerHTML = '+9% per year';
            riskReturn.style.color = '#ef4444';
            riskWarning.innerHTML = 'Expect big drops (-30% to -50%) but also big gains!';
        }
    }

    safeBtn?.addEventListener('click', () => updateRisk('safe'));
    mediumBtn?.addEventListener('click', () => updateRisk('medium'));
    riskyBtn?.addEventListener('click', () => updateRisk('risky'));

    // Freedom calculator
    const spendingSlider = document.getElementById('spending');
    const freedomRate = document.getElementById('freedom-rate');

    function updateFreedom() {
        const spending = parseFloat(spendingSlider?.value || 50000);
        const rate = parseFloat(freedomRate?.value || 5) / 100;
        const freedomNum = spending / rate;

        const spendingVal = document.getElementById('spending-val');
        const freedomRateVal = document.getElementById('freedom-rate-val');
        const freedomNumber = document.getElementById('freedom-number');

        if (spendingVal) spendingVal.textContent = spending.toLocaleString();
        if (freedomRateVal) freedomRateVal.textContent = (rate * 100).toFixed(1);
        if (freedomNumber) freedomNumber.innerHTML = '$' + Math.round(freedomNum).toLocaleString();
    }

    spendingSlider?.addEventListener('input', updateFreedom);
    freedomRate?.addEventListener('input', updateFreedom);
    updateFreedom();

    // Compound growth chart
    const chartCtx = document.getElementById('compoundChart')?.getContext('2d');
    if (chartCtx) {
        new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: [0, 5, 10, 15, 20, 25, 30],
                datasets: [
                    { label: 'Savings (1%)', data: [100, 105, 110, 116, 122, 128, 135], borderColor: '#94a3b8', borderWidth: 2, fill: false, pointRadius: 0 },
                    { label: 'Bonds (4%)', data: [100, 122, 148, 180, 219, 267, 324], borderColor: '#fbbf24', borderWidth: 2, fill: false, pointRadius: 0 },
                    { label: 'Stocks (8%)', data: [100, 147, 216, 317, 466, 685, 1006], borderColor: '#f43f5e', borderWidth: 2.5, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom', labels: { color: '#aaa', font: { size: 9 } } } },
                scales: { y: { ticks: { callback: v => '$' + v, color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
            }
        });
    }
}

// ---------- SCENARIO HANDLER ----------
function setupScenarioButtons() {
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scenario = SCENARIOS[btn.dataset.scenario];
            if (scenario) {
                const startAmount = document.getElementById('start-amount');
                const monthlyInvest = document.getElementById('monthly-invest');
                const incomeGoal = document.getElementById('income-goal');
                const startVal = document.getElementById('start-val');
                const monthlyVal = document.getElementById('monthly-val');
                const incomeVal = document.getElementById('income-val');
                
                if (startAmount) startAmount.value = scenario.start;
                if (monthlyInvest) monthlyInvest.value = scenario.monthly;
                if (incomeGoal) incomeGoal.value = scenario.income;
                if (startVal) startVal.innerHTML = fmtMoney(scenario.start);
                if (monthlyVal) monthlyVal.innerHTML = fmtMoney(scenario.monthly);
                if (incomeVal) incomeVal.innerHTML = fmtMoney(scenario.income);
                
                calculateCalculator();
            }
        });
    });
}

// ---------- PAGE INITIALIZATION ----------
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('calculator')) {
        const startAmount = document.getElementById('start-amount');
        const monthlyInvest = document.getElementById('monthly-invest');
        const incomeGoal = document.getElementById('income-goal');
        const timeHorizon = document.getElementById('time-horizon');
        
        startAmount?.addEventListener('input', function() {
            const startVal = document.getElementById('start-val');
            if (startVal) startVal.innerHTML = fmtMoney(this.value);
            calculateCalculator();
        });
        monthlyInvest?.addEventListener('input', function() {
            const monthlyVal = document.getElementById('monthly-val');
            if (monthlyVal) monthlyVal.innerHTML = fmtMoney(this.value);
            calculateCalculator();
        });
        incomeGoal?.addEventListener('input', function() {
            const incomeVal = document.getElementById('income-val');
            if (incomeVal) incomeVal.innerHTML = fmtMoney(this.value);
            calculateCalculator();
        });
        timeHorizon?.addEventListener('input', function() {
            const yearsVal = document.getElementById('years-val');
            if (yearsVal) yearsVal.innerHTML = this.value + ' years';
            calculateCalculator();
        });
        
        setupScenarioButtons();
        calculateCalculator();
    }
    
    else if (currentPage.includes('compare')) {
        const compareStart = document.getElementById('compare-start');
        const compareMonthly = document.getElementById('compare-monthly');
        const compareYears = document.getElementById('compare-years');
        
        compareStart?.addEventListener('input', () => calculateCompare());
        compareMonthly?.addEventListener('input', () => calculateCompare());
        compareYears?.addEventListener('input', () => calculateCompare());
        
        calculateCompare();
    }
    
    else if (currentPage.includes('basics')) {
        initBasicsPage();
    }
});