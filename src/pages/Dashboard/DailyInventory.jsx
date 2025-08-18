import React, { useEffect, useState } from 'react';

export default function DailyInventory() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDaily = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/inventory/daily?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const openDay = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/inventory/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ date })
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      fetchDaily();
    } catch (e) { alert(e.message); }
  };

  const closeDay = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/inventory/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ date })
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Daily Inventory</h3>
        <div className="d-flex gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button className="btn btn-outline-primary" onClick={fetchDaily} disabled={loading}>Refresh</button>
          <button className="btn btn-success" onClick={openDay} disabled={loading}>Open Day</button>
          <button className="btn btn-warning" onClick={closeDay} disabled={loading}>Close Day</button>
        </div>
      </div>

      {!data ? (
        <div>Loading...</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Unit</th>
                <th>Open</th>
                <th>Purchase</th>
                <th>Dispose</th>
                <th>Usage</th>
                <th>Close</th>
              </tr>
            </thead>
            <tbody>
              {data.ingredients?.map((row) => (
                <tr key={row.ingredient}>
                  <td>{row.name}</td>
                  <td>{row.unit}</td>
                  <td>{row.openQty}</td>
                  <td>{row.purchaseQty}</td>
                  <td>{row.disposeQty}</td>
                  <td>{row.usageQty}</td>
                  <td>{row.closeQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


