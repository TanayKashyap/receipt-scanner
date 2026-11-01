import React, { useState, useMemo } from "react";
import ReceiptCard from "./ReceiptCard";
import { Search, FileSpreadsheet, Filter, Inbox, ArrowUpDown } from "lucide-react";

export default function ReceiptList({ receipts, onDelete, onExportClick }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("date-desc");

  // Unique stores for filter dropdown
  const storeOptions = useMemo(() => {
    const set = new Set(receipts.map(r => r.Store).filter(Boolean));
    return Array.from(set).sort();
  }, [receipts]);

  // Filtered and sorted receipts
  const filteredReceipts = useMemo(() => {
    return receipts
      .filter(r => {
        const matchesSearch = 
          (r.Store || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.notes || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.Date || "").includes(searchTerm);
        
        const matchesStore = selectedStore === "ALL" || r.Store === selectedStore;
        return matchesSearch && matchesStore;
      })
      .sort((a, b) => {
        if (sortOrder === "date-desc") return (b.Date || "").localeCompare(a.Date || "");
        if (sortOrder === "date-asc") return (a.Date || "").localeCompare(b.Date || "");
        if (sortOrder === "amount-desc") return (b.Amount || 0) - (a.Amount || 0);
        if (sortOrder === "amount-asc") return (a.Amount || 0) - (b.Amount || 0);
        return 0;
      });
  }, [receipts, searchTerm, selectedStore, sortOrder]);

  return (
    <div className="receipt-list-container">
      {/* Action Header: Search & Export */}
      <div className="receipts-header-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          {/* Search bar */}
          <div className="input-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-icon" />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search store, date, or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "38px", height: "42px" }}
            />
          </div>

          {/* Store Filter */}
          {storeOptions.length > 0 && (
            <select 
              className="form-input" 
              style={{ width: "auto", height: "42px", paddingLeft: "12px", paddingRight: "12px" }}
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              <option value="ALL">All Stores</option>
              {storeOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Sort Order */}
          <select 
            className="form-input" 
            style={{ width: "auto", height: "42px", paddingLeft: "12px", paddingRight: "12px" }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="date-desc">Newest Date</option>
            <option value="date-asc">Oldest Date</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
        </div>

        {/* Export to Sheets Button */}
        <button 
          className="btn btn-primary" 
          onClick={onExportClick}
          disabled={receipts.length === 0}
          title="Export all receipts to formatted Google Sheet"
        >
          <FileSpreadsheet size={17} />
          <span>Export to Google Sheets</span>
        </button>
      </div>

      {/* Receipts List */}
      {filteredReceipts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filteredReceipts.map(receipt => (
            <ReceiptCard 
              key={receipt.id || receipt.createdAt} 
              receipt={receipt} 
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ 
          padding: "48px 24px", 
          textAlign: "center", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          gap: "12px" 
        }}>
          <Inbox size={42} color="var(--text-dim)" />
          <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
            {receipts.length === 0 ? "No Receipts Scanned Yet" : "No Matching Receipts"}
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "340px" }}>
            {receipts.length === 0 
              ? "Tap 'Scan Receipt' above to take a photo and let Gemini AI automatically digitize your expense." 
              : "Try clearing your search query or store filter."}
          </p>
        </div>
      )}
    </div>
  );
}
