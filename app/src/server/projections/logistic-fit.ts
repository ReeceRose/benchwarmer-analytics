// Weighted logistic regression and calibration report for the model-fitting
// scripts (scripts/fit-*.ts). Not used at runtime.

// Weighted logistic regression by Newton-Raphson, with a little ridge for stability.
export function fit(rows: { x: number[]; n: number; wins: number }[], ridge = 1e-3): number[] {
  const k = rows[0].x.length;
  let beta = new Array<number>(k).fill(0);
  for (let iter = 0; iter < 50; iter++) {
    const grad = new Array<number>(k).fill(0);
    const hess = Array.from({ length: k }, () => new Array<number>(k).fill(0));
    for (const { x, n, wins } of rows) {
      const p = 1 / (1 + Math.exp(-x.reduce((s, v, i) => s + v * beta[i], 0)));
      const w = n * p * (1 - p);
      for (let i = 0; i < k; i++) {
        grad[i] += x[i] * (wins - n * p);
        for (let j = 0; j < k; j++) hess[i][j] += w * x[i] * x[j];
      }
    }
    for (let i = 0; i < k; i++) {
      grad[i] -= ridge * beta[i];
      hess[i][i] += ridge;
    }
    const step = solve(hess, grad);
    beta = beta.map((b, i) => b + step[i]);
    if (Math.max(...step.map(Math.abs)) < 1e-9) break;
  }
  return beta;
}

// Gaussian elimination with partial pivoting.
function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let j = c; j <= n; j++) m[r][j] -= f * m[c][j];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = m[r][n];
    for (let j = r + 1; j < n; j++) sum -= m[r][j] * x[j];
    x[r] = sum / m[r][r];
  }
  return x;
}

export function evaluate(label: string, rows: { p: number; n: number; wins: number }[]) {
  let n = 0, brier = 0, logLoss = 0;
  const bins = Array.from({ length: 10 }, () => ({ n: 0, p: 0, wins: 0 }));
  for (const r of rows) {
    const p = Math.min(Math.max(r.p, 1e-6), 1 - 1e-6);
    n += r.n;
    // Sum over the n states in the row: wins with outcome 1, the rest 0.
    brier += r.wins * (1 - p) ** 2 + (r.n - r.wins) * p ** 2;
    logLoss -= r.wins * Math.log(p) + (r.n - r.wins) * Math.log(1 - p);
    const b = bins[Math.min(9, Math.floor(p * 10))];
    b.n += r.n; b.p += p * r.n; b.wins += r.wins;
  }
  console.log(`\n${label}: ${n.toLocaleString()} states, Brier ${(brier / n).toFixed(4)}, log loss ${(logLoss / n).toFixed(4)}`);
  console.log("  predicted  actual   states");
  for (const b of bins) if (b.n) console.log(`  ${(b.p / b.n * 100).toFixed(1).padStart(8)}%  ${(b.wins / b.n * 100).toFixed(1).padStart(5)}%  ${b.n.toLocaleString().padStart(9)}`);
}
