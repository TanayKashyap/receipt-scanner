import React from "react";
import { DollarSign, Receipt, ShoppingBag, TrendingUp } from "lucide-react";

export default function StatsOverview({ receipts }) {
  const totalSpend = receipts.reduce((sum, r) => sum + (parseFloat(r.Amount) || 0), 0);
  const totalCount = receipts.length;
  const avgAmount = totalCount > 0 ? totalSpend / totalCount : 0;

  // Find top store by frequency or amount
  const storeTotals = {};
  receipts.forEach(r => {
    const s = r.Store || "Unknown";
    storeTotals[s] = (storeTotals[s] || 0) + (parseFloat(r.Amount) || 0);
  });

  let topStore = "None";
  let maxSpend = 0;
  for (const [store, spend] of Object.entries(storeTotals)) {
    if (spend > maxSpend) {
      maxSpend = spend;
      topStore = store;
    }
  }

  const formatUSD = (val) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(val);

  return (
    <div className="stats-grid">
      <div className="stat-card glass-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="stat-label">Total Spent</span>
          <DollarSign size={18} color="var(--accent-cyan)" />
        </div>
        <div className="stat-value">{formatUSD(totalSpend)}</div>
      </div>

      <div className="stat-card glass-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="stat-label">Receipts Scanned</span>
          <Receipt size={18} color="var(--accent-indigo)" />
        </div>
        <div className="stat-value">{totalCount}</div>
      </div>

      <div className="stat-card glass-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="stat-label">Top Merchant</span>
          <ShoppingBag size={18} color="var(--accent-purple)" />
        </div>
        <div className="stat-value" style={{ fontSize: "1.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {topStore}
        </div>
      </div>

      <div className="stat-card glass-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="stat-label">Avg / Receipt</span>
          <TrendingUp size={18} color="var(--accent-emerald)" />
        </div>
        <div className="stat-value">{formatUSD(avgAmount)}</div>
      </div>
    </div>
  );
}
