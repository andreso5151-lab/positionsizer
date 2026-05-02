// ─── POSITION SIZER LOGIC ────────────────────────────────────────────────
// All calculations happen client-side. No server needed for v1.

// Get all input elements
const inputs = {
    accountSize: document.getElementById('accountSize'),
    riskPercent: document.getElementById('riskPercent'),
    entryPrice: document.getElementById('entryPrice'),
    stopPrice: document.getElementById('stopPrice'),
    targetPrice: document.getElementById('targetPrice'),
};

// Get all output elements
const outputs = {
    positionSize: document.getElementById('positionSize'),
    positionValue: document.getElementById('positionValue'),
    riskAmount: document.getElementById('riskAmount'),
    stopDistance: document.getElementById('stopDistance'),
    leverageNeeded: document.getElementById('leverageNeeded'),
    rrRatio: document.getElementById('rrRatio'),
    rrHint: document.getElementById('rrHint'),
    warning: document.getElementById('warning'),
};

// Track current trade direction (long or short)
let direction = 'long';

// ─── FORMATTING HELPERS ─────────────────────────────────────────────────
function formatMoney(num) {
    return '$' + num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatNumber(num, decimals = 2) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function formatPercent(num) {
    return num.toFixed(2) + '%';
}

// ─── MAIN CALCULATION ───────────────────────────────────────────────────
function calculate() {
    const account = parseFloat(inputs.accountSize.value) || 0;
    const riskPct = parseFloat(inputs.riskPercent.value) || 0;
    const entry = parseFloat(inputs.entryPrice.value) || 0;
    const stop = parseFloat(inputs.stopPrice.value) || 0;
    const target = parseFloat(inputs.targetPrice.value) || 0;

    // Hide any previous warnings
    outputs.warning.classList.add('hidden');
    let warningMsg = '';

    // Validate basics
    if (account <= 0 || riskPct <= 0 || entry <= 0 || stop <= 0) {
        return;
    }

    // Validate stop direction
    if (direction === 'long' && stop >= entry) {
        warningMsg = '⚠️ For LONG trades, stop must be BELOW entry price.';
    } else if (direction === 'short' && stop <= entry) {
        warningMsg = '⚠️ For SHORT trades, stop must be ABOVE entry price.';
    }

    // Calculate stop distance (always positive)
    const stopDistanceDollars = Math.abs(entry - stop);
    const stopDistancePct = (stopDistanceDollars / entry) * 100;

    // Risk amount in dollars
    const riskAmount = account * (riskPct / 100);

    // Position size (number of units/shares/contracts)
    const positionSize = riskAmount / stopDistanceDollars;

    // Position value (notional, in dollars)
    const positionValue = positionSize * entry;

    // Leverage needed (positionValue / accountSize)
    const leverage = positionValue / account;

    // R:R ratio (if target provided)
    let rrRatio = null;
    let rrHint = '';

    if (target > 0) {
        const targetDistance = direction === 'long'
            ? target - entry
            : entry - target;

        if (targetDistance > 0) {
            rrRatio = targetDistance / stopDistanceDollars;

            // Generate hint
            if (rrRatio >= 3) {
                rrHint = `Excellent R:R — risk $1 to make $${rrRatio.toFixed(1)}`;
            } else if (rrRatio >= 2) {
                rrHint = `Good R:R — risk $1 to make $${rrRatio.toFixed(1)}`;
            } else if (rrRatio >= 1.5) {
                rrHint = `Decent R:R — risk $1 to make $${rrRatio.toFixed(1)}`;
            } else if (rrRatio >= 1) {
                rrHint = `Marginal R:R — need 60%+ win rate for this to work`;
            } else {
                rrHint = `⚠️ Bad R:R — risking more than you'll make`;
            }
        } else {
            rrHint = direction === 'long'
                ? '⚠️ Target must be ABOVE entry for longs'
                : '⚠️ Target must be BELOW entry for shorts';
        }
    } else {
        rrHint = 'Add a target price to see risk/reward ratio';
    }

    // Additional warnings
    if (leverage > 5 && !warningMsg) {
        warningMsg = `⚠️ Position requires ${leverage.toFixed(1)}x leverage — extremely risky for retail traders.`;
    } else if (leverage > 2 && !warningMsg) {
        warningMsg = `⚠️ Position requires ${leverage.toFixed(1)}x leverage — make sure your broker supports this.`;
    }

    if (riskPct > 3 && !warningMsg) {
        warningMsg = `⚠️ ${riskPct}% risk per trade is very aggressive. Pros use 1-2%.`;
    }

    // Update outputs
    outputs.positionSize.textContent = formatNumber(positionSize, positionSize < 1 ? 6 : 2);
    outputs.positionValue.textContent = formatMoney(positionValue);
    outputs.riskAmount.textContent = formatMoney(riskAmount);
    outputs.stopDistance.textContent = formatPercent(stopDistancePct);
    outputs.leverageNeeded.textContent = leverage.toFixed(2) + 'x';

    if (rrRatio !== null && rrRatio > 0) {
        outputs.rrRatio.textContent = rrRatio.toFixed(2) + 'R';
        outputs.rrRatio.style.color = rrRatio >= 2 ? 'var(--color-success)' : rrRatio >= 1 ? 'var(--color-accent)' : 'var(--color-danger)';
    } else {
        outputs.rrRatio.textContent = '—';
        outputs.rrRatio.style.color = 'var(--color-text-tertiary)';
    }
    outputs.rrHint.textContent = rrHint;

    // Show warning if needed
    if (warningMsg) {
        outputs.warning.textContent = warningMsg;
        outputs.warning.classList.remove('hidden');
    }
}

// ─── EVENT LISTENERS ────────────────────────────────────────────────────
// Recalculate on every input change
Object.values(inputs).forEach(input => {
    input.addEventListener('input', calculate);
});

// Risk preset buttons
document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        inputs.riskPercent.value = val;

        // Update active state
        document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        calculate();
    });
});

// Direction toggle
document.querySelectorAll('.direction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        direction = btn.dataset.side;

        // Update active state
        document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        calculate();
    });
});

// Sync risk percent input to preset highlight
inputs.riskPercent.addEventListener('input', () => {
    const val = inputs.riskPercent.value;
    document.querySelectorAll('.preset').forEach(btn => {
        if (btn.dataset.val === val) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
});

// ─── INITIAL CALCULATION ────────────────────────────────────────────────
calculate();
