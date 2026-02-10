"use client";

import { useState } from "react";
import { useBranch } from "@/components/app-sidebar";
import { usePipelines } from "@/hooks/use-pipeline";
import {
  useDashboardStats,
  useLeadsByStage,
  useEmployeeConversion,
  useLeadsTrend,
  useTopCallers,
} from "@/hooks/use-dashboard-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Phone,
  CheckCircle2,
  Clock,
  Edit,
  Loader2,
  BarChart3,
  AlertCircle,
  CalendarClock,
  TrendingUp,
} from "lucide-react";
import { Label } from "@/components/ui/label";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

export default function DashboardPage() {
  const { selectedBranch } = useBranch();
  const branchId = selectedBranch?.id;

  // Pipeline state
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [conversionStageId, setConversionStageId] = useState<string>("");
  const [trendPeriod, setTrendPeriod] = useState<
    "day" | "week" | "month" | "year"
  >("month");

  // Fetch pipelines for the branch
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines(
    branchId ?? null,
  );

  // Set default pipeline when pipelines load
  useState(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  });

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } =
    useDashboardStats(selectedPipelineId);
  const { data: leadsByStage, isLoading: stagesLoading } =
    useLeadsByStage(selectedPipelineId);
  const { data: employeeConversion, isLoading: employeesLoading } =
    useEmployeeConversion(branchId ?? null, conversionStageId);
  const { data: leadsTrend, isLoading: trendLoading } = useLeadsTrend(
    trendPeriod,
    selectedPipelineId,
  );
  const { data: topCallers, isLoading: callersLoading } = useTopCallers(
    branchId ?? null,
  );

  // Prepare Task Data for Donut Chart
  const taskData = [
    {
      name: "Bajarilgan",
      value: stats?.completed_tasks || 0,
      color: "#10b981",
    },
    { name: "Kutilmoqda", value: stats?.pending_tasks || 0, color: "#f59e0b" },
    {
      name: "Muddati o'tgan",
      value: stats?.overdue_tasks || 0,
      color: "#ef4444",
    },
  ].filter((item) => item.value > 0);

  if (pipelinesLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Pipeline Selector */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {selectedBranch?.name || "Filial tanlanmagan"}
            </p>
          </div>
        </div>

        {/* Pipeline Selector */}
        <div className="w-64">
          <Label className="text-sm text-muted-foreground mb-2 block">
            Pipeline
          </Label>
          <Select
            value={selectedPipelineId}
            onValueChange={setSelectedPipelineId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pipeline tanlang" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Jami Lidlar */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lidlar
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {stats?.total_leads.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-2 grid grid-cols-2 gap-1">
              <div>Bugun: {stats?.leads_today}</div>
              <div>Hafta: {stats?.leads_week}</div>
              <div>Oy: {stats?.leads_month}</div>
              <div>Yil: {stats?.leads_year}</div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vazifalar
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {stats?.total_tasks.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-green-600">✓ Bajarilgan:</span>
                <span className="font-medium">{stats?.completed_tasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">○ Kutilmoqda:</span>
                <span className="font-medium">{stats?.pending_tasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">! Muddati o'tgan:</span>
                <span className="font-medium">{stats?.overdue_tasks}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Callers (Calls Statistics) */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Top Xodimlar (Qo'ng'iroqlar)
          </CardTitle>
          <Phone className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          {callersLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {topCallers?.map((caller, index) => (
                <div
                  key={caller.employee_id}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-card border border-border"
                >
                  <div className="text-lg font-bold text-purple-500">
                    {caller.call_count}
                  </div>
                  <div
                    className="text-sm font-medium text-center truncate w-full"
                    title={caller.employee_name}
                  >
                    {caller.employee_name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {index === 0
                      ? "🥇"
                      : index === 1
                        ? "🥈"
                        : index === 2
                          ? "🥉"
                          : `#${index + 1}`}
                  </div>
                </div>
              ))}
              {(!topCallers || topCallers.length === 0) && (
                <div className="col-span-full text-center text-sm text-muted-foreground py-2">
                  Qo'ng'iroqlar topilmadi
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Lidlar Dinamikasi
            </CardTitle>
            <Tabs
              value={trendPeriod}
              onValueChange={(v) => setTrendPeriod(v as any)}
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="day">Kun</TabsTrigger>
                <TabsTrigger value="week">Hafta</TabsTrigger>
                <TabsTrigger value="month">Oy</TabsTrigger>
                <TabsTrigger value="year">Yil</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={leadsTrend}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#ffffff", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#ffffff", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                  name="Lidlar"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Xodimlar Konversiyasi */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="space-y-2">
              <CardTitle className="text-lg font-semibold">
                Xodimlar Konversiyasi
              </CardTitle>
              <div className="w-full">
                <Label className="text-xs text-muted-foreground">
                  Konversiya stage'ini tanlang
                </Label>
                <Select
                  value={conversionStageId}
                  onValueChange={setConversionStageId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Stage tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadsByStage?.map((stage) => (
                      <SelectItem key={stage.stage_id} value={stage.stage_id}>
                        {stage.stage_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {employeeConversion?.slice(0, 10).map((emp, index) => (
                  <div
                    key={emp.employee_id}
                    className="p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          #{index + 1}
                        </span>
                        <span
                          className="text-sm font-semibold truncate max-w-[120px]"
                          title={emp.employee_name}
                        >
                          {emp.employee_name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        {emp.conversion_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${emp.conversion_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage bo'yicha lidlar (Horizontal Bar Chart) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Stage bo'yicha Taqsimot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stagesLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  layout="vertical"
                  data={leadsByStage}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-muted/20"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="stage_name"
                    type="category"
                    width={100}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                    {leadsByStage?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Vazifalar (Donut Chart with Text) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Vazifalar Taqsimoti
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[320px]">
            {statsLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {taskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value, entry: any) => (
                      <span className="text-xs font-medium text-foreground ml-1">
                        {value}
                      </span>
                    )}
                  />
                  <text
                    x="50%"
                    y="45%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x="50%"
                      dy="-0.5em"
                      fontSize="24"
                      fontWeight="bold"
                      fill="hsl(var(--foreground))"
                    >
                      {stats?.total_tasks || 0}
                    </tspan>
                    <tspan
                      x="50%"
                      dy="1.5em"
                      fontSize="12"
                      fill="hsl(var(--muted-foreground))"
                    >
                      Jami Vazifa
                    </tspan>
                  </text>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
