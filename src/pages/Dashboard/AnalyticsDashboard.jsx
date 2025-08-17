import React, { useRef, useState, useMemo } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import jsPDF from "jspdf";
import moment from "moment";
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

export default function AnalyticsDashboard({ orders }) {
  const lineChartRef = useRef();
  const pieChartRef = useRef();
  const peakHoursRef = useRef();

  const [period, setPeriod] = useState("daily"); // daily / weekly / monthly
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));

  // --- Sales Aggregation ---
  const salesDataByPeriod = useMemo(() => {
    const result = {};
    orders.forEach(order => {
      let key;
      if (period === "daily") {
        key = moment(order.date).format("YYYY-MM-DD");
        if (selectedDate && key !== selectedDate) return; // filter for chosen date
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

  // --- Revenue Forecast (Next 7 periods) ---
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
        pointBackgroundColor: "rgba(75,192,192,1)",
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

  // --- Best-Selling Dishes ---
  const itemCounts = useMemo(() => {
    const counts = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + item.quantity;
      });
    });
    return counts;
  }, [orders]);

  const totalItems = Object.values(itemCounts).reduce((a, b) => a + b, 0);

  const pieData = {
    labels: Object.keys(itemCounts),
    datasets: [
      {
        data: Object.values(itemCounts),
        backgroundColor: [
          "#FF6B6B",
          "#4ECDC4",
          "#FFD93D",
          "#6A4C93",
          "#FF7F50",
          "#00CED1",
          "#C71585",
        ],
        borderWidth: 1,
        borderColor: "#fff",
        hoverOffset: 10,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.raw;
            const percent = ((value / totalItems) * 100).toFixed(1);
            return `${context.label}: ${value} (${percent}%)`;
          },
        },
      },
    },
  };

  // --- Peak Hours ---
  const hourCounts = {};
  orders.forEach(order => {
    const hour = moment(order.date).hour();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHoursData = {
    labels: Object.keys(hourCounts).map(h => `${h}:00`),
    datasets: [
      {
        label: "Orders per Hour",
        data: Object.values(hourCounts),
        backgroundColor: "rgba(54,162,235,0.6)",
      },
    ],
  };

  // --- Customer Insights ---
  const totalOrders = orders.length;
  const avgOrderValue =
    totalOrders === 0 ? 0 : orders.reduce((a, o) => a + o.totalPrice, 0) / totalOrders;

  // --- Export PDF ---
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Analytics Report", 14, 20);
    let yPos = 30;
    [lineChartRef, pieChartRef, peakHoursRef].forEach(ref => {
      if (ref.current) {
        const img = ref.current.toBase64Image();
        doc.addImage(img, "PNG", 15, yPos, 180, 90);
        yPos += 100;
      }
    });
    doc.save("Analytics_Report.pdf");
  };

  return (
    <div>
      <h3 className="mb-4">Restaurant Analytics Dashboard</h3>

      {/* Select Period */}
      <div className="mb-4 d-flex align-items-center">
        <label className="me-2">Select Period:</label>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="form-select"
          style={{ width: "200px" }}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        {period === "daily" && (
          <input
            type="date"
            className="form-control ms-3"
            style={{ width: "200px" }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        )}

        <button className="btn btn-primary ms-3" onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      {/* Revenue Chart */}
      <div className="mb-5">
        <h5>Revenue ({period === "daily" ? selectedDate : period})</h5>
        <Line ref={lineChartRef} data={lineDataWithForecast} />
      </div>

      {/* Best-Selling Dishes */}
      <div className="mb-5" style={{ maxWidth: "350px", margin: "auto" }}>
        <h5>Best-Selling Dishes</h5>
        <Pie ref={pieChartRef} data={pieData} options={pieOptions} />
      </div>

      {/* Peak Hours */}
      <div className="mb-5">
        <h5>Peak Hours</h5>
        <Bar ref={peakHoursRef} data={peakHoursData} />
      </div>

      {/* Customer Insights */}
      <div className="mb-5">
        <h5>Customer Insights</h5>
        <p>Total Orders: {totalOrders}</p>
        <p>Average Order Value: ${avgOrderValue.toFixed(2)}</p>
      </div>
    </div>
  );
}
