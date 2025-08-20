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

  // Day start/end is fixed at 2:00 AM; no manual time inputs needed

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Daily Inventory</h3>
          <div className="text-muted small">The day starts/ends at 2:00 AM.</div>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <label className="mb-0">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <button className="btn btn-outline-primary" onClick={fetchDaily} disabled={loading}>Refresh</button>
        </div>
      </div>

      {!data ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="mb-4">
            <h5>Day Summary</h5>
            <div className="table-responsive">
              <table className="table table-sm table-bordered">
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
                    <tr key={`row-${row.ingredient}`}>
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
          </div>

          {data.transactions && (
            <div className="row">
              <div className="col-md-6 mb-4">
                <h6>Purchases</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Ingredient</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.transactions.purchases || []).map((t, i) => (
                        <tr key={`p-${i}`}>
                          <td>{new Date(t.date).toLocaleTimeString()}</td>
                          <td>{t.ingredient?.name}</td>
                          <td>{t.quantity} {t.ingredient?.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-md-6 mb-4">
                <h6>Disposals</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Ingredient</th>
                        <th>Qty</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.transactions.disposals || []).map((t, i) => (
                        <tr key={`d-${i}`}>
                          <td>{new Date(t.date).toLocaleTimeString()}</td>
                          <td>{t.ingredient?.name}</td>
                          <td>{t.quantity} {t.ingredient?.unit}</td>
                          <td>{t.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-md-6 mb-4">
                <h6>Usage</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Ingredient</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.transactions.usages || []).map((t, i) => (
                        <tr key={`u-${i}`}>
                          <td>{new Date(t.date).toLocaleTimeString()}</td>
                          <td>{t.ingredient?.name}</td>
                          <td>{t.quantity} {t.ingredient?.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-md-6 mb-4">
                <h6>Adjustments</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Ingredient</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.transactions.adjustments || []).map((t, i) => (
                        <tr key={`a-${i}`}>
                          <td>{new Date(t.date).toLocaleTimeString()}</td>
                          <td>{t.ingredient?.name}</td>
                          <td>{t.quantity} {t.ingredient?.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


