import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Wrench, ClipboardList, AlertTriangle, Package, CheckCircle, Clock } from 'lucide-react';
import './maintenance.css';

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");
const token = () => localStorage.getItem('token');

const COLORS = {
  pending:     '#f59e0b',
  approved:    '#3b82f6',
  'in-progress': '#8b5cf6',
  completed:   '#16a34a',
  rejected:    '#dc2626',
};

// Custom donut center label
const DonutCenter = ({ cx, cy, total, label }) => (
  <>
    <text x={cx} y={cy - 8}  textAnchor="middle" fill="#1e293b" fontSize={28} fontWeight={700}>{total}</text>
    <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize={12}>{label}</text>
  </>
);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e293b', color:'#fff', padding:'8px 14px', borderRadius:10, fontSize:13 }}>
      <strong>{payload[0].name}</strong>: {payload[0].value}
    </div>
  );
};

export default function MaintenanceDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]     = useState({ total:0, pending:0, inProgress:0, completed:0, lowStock:0, flagged:0, totalCost:0 });
  const [recent, setRecent]   = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = token();
    Promise.all([
      fetch(`${BASE}/maintenance/stats`,  { headers:{ Authorization:`Bearer ${t}` } }).then(r=>r.json()),
      fetch(`${BASE}/maintenance/issues`, { headers:{ Authorization:`Bearer ${t}` } }).then(r=>r.json()),
    ]).then(([s, issues]) => {
      if (s.total != null) setStats(s);
      if (Array.isArray(issues)) {
        setAllIssues(issues);
        setRecent(issues.slice(0, 5));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Donut data — issue status breakdown
  const statusData = [
    { name: 'Pending',     value: stats.pending,    fill: COLORS.pending },
    { name: 'Approved',    value: stats.approved || allIssues.filter(i=>i.status==='approved').length, fill: COLORS.approved },
    { name: 'In Progress', value: stats.inProgress, fill: COLORS['in-progress'] },
    { name: 'Completed',   value: stats.completed,  fill: COLORS.completed },
    { name: 'Rejected',    value: allIssues.filter(i=>i.status==='rejected').length, fill: COLORS.rejected },
  ].filter(d => d.value > 0);

  // Priority breakdown
  const priorityData = [
    { name: 'Low',      value: allIssues.filter(i=>i.priority==='Low').length,      fill: '#94a3b8' },
    { name: 'Medium',   value: allIssues.filter(i=>i.priority==='Medium').length,   fill: '#f59e0b' },
    { name: 'High',     value: allIssues.filter(i=>i.priority==='High').length,     fill: '#dc2626' },
    { name: 'Critical', value: allIssues.filter(i=>i.priority==='Critical').length, fill: '#9d174d' },
  ].filter(d => d.value > 0);

  // Monthly bar chart — last 6 months
  const monthlyData = (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const monthIssues = allIssues.filter(issue => {
        const created = new Date(issue.createdAt);
        return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
      });
      return {
        month: label,
        total:     monthIssues.length,
        completed: monthIssues.filter(i=>i.status==='completed').length,
        pending:   monthIssues.filter(i=>i.status==='pending').length,
      };
    });
  })();

  if (loading) return <div className="maint-empty">Loading dashboard...</div>;

  return (
    <div className="maint-page">
      <div className="maint-page-header">
        <h2>Maintenance Dashboard</h2>
        <p>Overview of all vehicle maintenance activities</p>
      </div>

      {/* Top KPI row */}
      <div className="maint-kpi-row">
        {[
          { label:'Total Issues',    value: stats.total,     color:'#3b82f6', icon:<ClipboardList size={20} />, to:'/maintenance/issues' },
          { label:'In Progress',     value: stats.inProgress,color:'#8b5cf6', icon:<Wrench size={20} />,       to:'/maintenance/repair' },
          { label:'Total Cost (ETB)',value: stats.totalCost?.toLocaleString(), color:'#16a34a', icon:<CheckCircle size={20} />, to:'/maintenance/reports' },
          { label:'Low Stock Items', value: stats.lowStock,  color:'#dc2626', icon:<Package size={20} />,      to:'/maintenance/inventory' },
          { label:'Flagged Issues',  value: stats.flagged,   color:'#f59e0b', icon:<AlertTriangle size={20} />,to:'/maintenance/issues' },
        ].map((k,i) => (
          <div key={i} className="maint-kpi-card" style={{ borderLeft:`4px solid ${k.color}`, cursor:'pointer' }} onClick={() => navigate(k.to)}>
            <div className="maint-kpi-icon" style={{ color: k.color }}>{k.icon}</div>
            <div>
              <div className="maint-kpi-value" style={{ color: k.color }}>{k.value}</div>
              <div className="maint-kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="maint-charts-row">

        {/* Status Donut */}
        <div className="maint-chart-card">
          <div className="maint-chart-title">Issue Status Breakdown</div>
          <p className="maint-chart-sub">Distribution by current status</p>
          {statusData.length === 0 ? (
            <div className="maint-empty">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                  paddingAngle={3} dataKey="value" labelLine={false}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.fill} stroke="none" />)}
                  <DonutCenter cx={0} cy={0} total={stats.total} label="Total" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize:13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Legend with values */}
          <div className="maint-donut-legend">
            {statusData.map(s => (
              <div key={s.name} className="maint-donut-legend-item">
                <span className="maint-donut-dot" style={{ background: s.fill }} />
                <span>{s.name}</span>
                <span className="maint-donut-val" style={{ color: s.fill }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Donut */}
        <div className="maint-chart-card">
          <div className="maint-chart-title">Priority Distribution</div>
          <p className="maint-chart-sub">Issues by urgency level</p>
          {priorityData.length === 0 ? (
            <div className="maint-empty">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                  paddingAngle={3} dataKey="value" labelLine={false}>
                  {priorityData.map((e, i) => <Cell key={i} fill={e.fill} stroke="none" />)}
                  <DonutCenter cx={0} cy={0} total={allIssues.length} label="Issues" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize:13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="maint-donut-legend">
            {priorityData.map(s => (
              <div key={s.name} className="maint-donut-legend-item">
                <span className="maint-donut-dot" style={{ background: s.fill }} />
                <span>{s.name}</span>
                <span className="maint-donut-val" style={{ color: s.fill }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="maint-chart-card maint-chart-wide">
          <div className="maint-chart-title">Monthly Activity</div>
          <p className="maint-chart-sub">Last 6 months — issues reported vs completed</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} barSize={14} margin={{ top:4, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize:12, fill:'#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:12, fill:'#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill:'rgba(0,0,0,0.04)' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }} />
              <Bar dataKey="total"     name="Total"     fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="completed" name="Completed" fill="#16a34a" radius={[4,4,0,0]} />
              <Bar dataKey="pending"   name="Pending"   fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="maint-quick-actions">
        <button className="maint-btn primary" onClick={() => navigate('/maintenance/issues')}>📋 Review Issues</button>
        <button className="maint-btn secondary" onClick={() => navigate('/maintenance/schedule')}>📅 Schedule</button>
        <button className="maint-btn secondary" onClick={() => navigate('/maintenance/inventory')}>📦 Inventory</button>
        <button className="maint-btn secondary" onClick={() => navigate('/maintenance/reports')}>📊 Reports</button>
      </div>

      {/* Recent Issues */}
      {recent.length > 0 && (
        <div className="maint-card" style={{ marginTop:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ margin:0, borderBottom:'none', paddingBottom:0 }}>Recent Issues</h3>
            <button className="maint-btn secondary" onClick={() => navigate('/maintenance/issues')}>View All</button>
          </div>
          <div className="maint-table-wrap">
            <table className="maint-table">
              <thead><tr><th>Vehicle</th><th>Issue</th><th>Priority</th><th>Status</th><th>Reporter</th><th>Date</th></tr></thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r._id}>
                    <td><strong>{r.vehiclePlate}</strong></td>
                    <td>{r.issue.slice(0,40)}{r.issue.length>40?'...':''}</td>
                    <td><span className={`badge ${r.priority}`}>{r.priority}</span></td>
                    <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                    <td>{r.reporterName||'—'}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
