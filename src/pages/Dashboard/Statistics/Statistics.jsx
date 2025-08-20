import React, { useRef, useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import jsPDF from "jspdf";
import moment from "moment";
import KpiCard from "./KpiCard";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Fake data (replace with real API/orders data)
const orders = [
  { date: "2025-08-01", totalPrice: 200 },
  { date: "2025-08-02", totalPrice: 350 },
  { date: "2025-08-03", totalPrice: 400 },
  { date: "2025-08-04", totalPrice: 220 },
  { date: "2025-08-05", totalPrice: 500 },
  { date: "2025-08-06", totalPrice: 300 },
  { date: "2025-08-07", totalPrice: 450 },
];

const COLORS = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6A4C93"];
const dataBestSelling = [
  { name: "Pizza", value: 450 },
  { name: "Burger", value: 300 },
  { name: "Fries", value: 150 },
  { name: "Drinks", value: 100 },
];

const ordersPerDay = [
  { day: "Mon", orders: 120 },
  { day: "Tue", orders: 210 },
  { day: "Wed", orders: 180 },
  { day: "Thu", orders: 260 },
  { day: "Fri", orders: 300 },
  { day: "Sat", orders: 320 },
  { day: "Sun", orders: 150 },
];

const glowStyle = {
  animation: "pulseGlow 2s infinite",
  borderRadius: "20px",
};

const styles = `
@keyframes pulseGlow {
  0% { box-shadow: 0 0 10px rgba(33, 150, 243, 0.6), 0 0 20px rgba(33, 150, 243, 0.4); }
  50% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.9), 0 0 40px rgba(33, 150, 243, 0.6); }
  100% { box-shadow: 0 0 10px rgba(33, 150, 243, 0.6), 0 0 20px rgba(33, 150, 243, 0.4); }
}
`;

const Statistics = () => {
  const lineChartRef = useRef();
  const [period, setPeriod] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));

  // --- Sales Aggregation ---
  const salesDataByPeriod = useMemo(() => {
    const result = {};
    orders.forEach((order) => {
      let key;
      if (period === "daily") {
        key = moment(order.date).format("YYYY-MM-DD");
        if (selectedDate && key !== selectedDate) return;
      } else if (period === "weekly") {
        key = moment(order.date).startOf("week").format("YYYY-[W]WW");
      } else {
        key = moment(order.date).format("YYYY-MM");
      }
      result[key] = (result[key] || 0) + order.totalPrice;
    });
    return result;
  }, [orders, period, selectedDate]);

  const salesLabels = Object.keys(salesDataByPeriod);
  const salesValues = Object.values(salesDataByPeriod);

  // --- Revenue Forecast ---
  const forecastData = useMemo(() => {
    const n = salesLabels.length;
    if (n < 2) return { labels: [], values: [] };

    const x = salesLabels.map((_, i) => i + 1);
    const y = salesValues;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, idx) => acc + xi * y[idx], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const b = (sumY - a * sumX) / n;

    const forecastLabels = [];
    const forecastValues = [];
    for (let i = 1; i <= 7; i++) {
      const nextX = n + i;
      const nextDate =
        period === "daily"
          ? moment(selectedDate).add(i, "days").format("YYYY-MM-DD")
          : period === "weekly"
          ? moment(salesLabels[salesLabels.length - 1])
              .add(i, "week")
              .startOf("week")
              .format("YYYY-[W]WW")
          : moment(salesLabels[salesLabels.length - 1])
              .add(i, "month")
              .format("YYYY-MM");
      forecastLabels.push(nextDate);
      forecastValues.push(a * nextX + b);
    }
    return { labels: forecastLabels, values: forecastValues };
  }, [salesLabels, salesValues, period, selectedDate]);

  const combinedLabels = [...salesLabels, ...forecastData.labels];
  const combinedData = [...salesValues, ...Array(forecastData.labels.length).fill(null)];
  const forecastLineData = [...Array(salesValues.length).fill(null), ...forecastData.values];

  const lineDataWithForecast = {
    labels: combinedLabels,
    datasets: [
      {
        label: "Actual Revenue",
        data: combinedData,
        borderColor: "rgba(75,192,192,1)",
        backgroundColor: "rgba(75,192,192,0.2)",
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: "Forecast Revenue",
        data: forecastLineData,
        borderColor: "rgba(255,99,132,1)",
        borderDash: [5, 5],
        backgroundColor: "rgba(255,99,132,0.1)",
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
      },
    ],
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Analytics Report", 14, 20);
    if (lineChartRef.current) {
      const img = lineChartRef.current.toBase64Image();
      doc.addImage(img, "PNG", 15, 30, 180, 90);
    }
    doc.save("Analytics_Report.pdf");
  };

  return (
    <div
      style={{
        padding: 30,
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >

      <h1 style={{ textAlign: "center", marginBottom: 40 }}>
        📊 Restaurant Statistics Dashboard
      </h1>
      <style>{styles}</style>
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>📊 Restaurant Statistics Dashboard</h1>


      {/* KPI */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 50 }}>
        <div style={{ transform: "scale(1.3)", ...glowStyle }}>
          <KpiCard title="Orders Today" value={320} color="#2196f3" />
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "center" }}>
        {/* Pie Chart */}
        <div style={{ background: "white", borderRadius: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: 20, flex: "1 1 350px", maxWidth: 450 }}>
          <h2 style={{ textAlign: "center", marginBottom: 20 }}>Best-Selling Dishes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={dataBestSelling} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {dataBestSelling.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip />
              <ReLegend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div style={{ background: "white", borderRadius: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: 20, flex: "1 1 350px", maxWidth: 450 }}>
          <h2 style={{ textAlign: "center", marginBottom: 20 }}>Orders Per Day</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ordersPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <ReTooltip />
              <Bar dataKey="orders" fill="#8884d8" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Line Chart */}
      <div style={{ background: "white", padding: 20, borderRadius: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", marginTop: 50 }}>
        <h2 style={{ color: "#2c3e50", marginBottom: 20 }}>Revenue Analysis</h2>
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="form-select" style={{ width: "200px" }}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          {period === "daily" && (
            <input type="date" className="form-control" style={{ width: "200px" }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          )}
          <button className="btn btn-primary" onClick={exportPDF}>Export PDF</button>
        </div>
        <Line ref={lineChartRef} data={lineDataWithForecast} />
      </div>
    </div>
  );
};

export default Statistics;
