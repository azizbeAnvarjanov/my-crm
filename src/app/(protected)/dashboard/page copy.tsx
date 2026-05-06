"use client";

import { useState, useEffect, useMemo } from "react";
import { useBranch } from "@/components/app-sidebar";
import { usePipelines, useStages } from "@/hooks/use-pipeline";
import {
  useDashboardStats,
  useLeadsByStage,
  useEmployeeConversion,
  useLeadsTrend,
  useTopCallers,
  useUtmAnalytics,
  useLeadProcessingTime,
  DashboardDateRange,
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
  Loader2,
  BarChart3,
  TrendingUp,
  Trophy,
  PhoneCall,
  ListChecks,
  AlertTriangle,
  Clock,
  Calendar,
  CalendarDays,
  Globe,
  Zap,
  Timer,
  ArrowUpDown,
  Filter,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/providers/theme-provider";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#84cc16",
];

// UTM source colors mapping
const UTM_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  Facebook: "#1877F2",
  Telegram: "#26A5E4",
  Google: "#4285F4",
  Youtube: "#FF0000",
  Tiktok: "#000000",
  Website: "#10b981",
  "Noma'lum": "#6b7280",
};

const getUtmColor = (source: string, index: number) => {
  return UTM_COLORS[source] || COLORS[index % COLORS.length];
};

// Format time helper
const formatTime = (minutes: number): string => {
  if (minutes < 1) return "< 1 daq";
  if (minutes < 60) return `${Math.round(minutes)} daq`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return mins > 0 ? `${hours} soat ${mins} daq` : `${hours} soat`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days} kun ${remainHours} soat` : `${days} kun`;
};

export default function DashboardPage() {
  const { selectedBranch } = useBranch();
  const branchId = selectedBranch?.id;
  const { theme } = useTheme();

  // Theme-aware colors
  const axisTickColor = theme === "dark" ? "#a1a1a1" : "#6b7280";
  const tooltipLabelColor = theme === "dark" ? "#ededed" : "#171717";
  const gridStrokeColor =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  // Pipeline state
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [conversionStageId, setConversionStageId] = useState<string>("");
  const [excludedStageIds, setExcludedStageIds] = useState<string[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<
    "day" | "week" | "month" | "year"
  >("month");

  // Date filter state
  type DatePeriod = "all" | "last7" | "last30" | "current_month" | "last_month" | "custom";
  const [datePeriod, setDatePeriod] = useState<DatePeriod>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Compute dateRange from selected period
  const dateRange: DashboardDateRange | undefined = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    switch (datePeriod) {
      case "all":
        return undefined;
      case "last7": {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        return { startDate: d.toISOString().split("T")[0], endDate: todayStr };
      }
      case "last30": {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        return { startDate: d.toISOString().split("T")[0], endDate: todayStr };
      }
      case "current_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        };
      }
      case "last_month": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        };
      }
      case "custom": {
        if (customStartDate && customEndDate) {
          return { startDate: customStartDate, endDate: customEndDate };
        }
        return undefined;
      }
      default:
        return undefined;
    }
  }, [datePeriod, customStartDate, customEndDate]);

  // Fetch pipelines for the branch
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines(
    branchId ?? null,
  );

  // Reset pipeline when branch changes
  useEffect(() => {
    setSelectedPipelineId("");
    setExcludedStageIds([]);
  }, [branchId]);

  // Auto-select first pipeline when pipelines load or branch changes
  useEffect(() => {
    if (pipelines.length > 0) {
      const currentStillValid = pipelines.some(p => p.id === selectedPipelineId);
      if (!currentStillValid) {
        setSelectedPipelineId(pipelines[0].id);
        setExcludedStageIds([]);
      }
    }
  }, [pipelines]);

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } =
    useDashboardStats(selectedPipelineId, dateRange);
  const { data: leadsByStage, isLoading: stagesLoading } =
    useLeadsByStage(selectedPipelineId);
  const { data: employeeConversion, isLoading: employeesLoading } =
    useEmployeeConversion(conversionStageId);
  const { data: leadsTrend, isLoading: trendLoading } = useLeadsTrend(
    trendPeriod,
    selectedPipelineId,
  );
  const { data: topCallers, isLoading: callersLoading } = useTopCallers(
    branchId ?? null,
    dateRange,
  );
  const { data: utmData, isLoading: utmLoading } = useUtmAnalytics(
    selectedPipelineId,
    dateRange,
  );
  const { data: processingTime, isLoading: processingLoading } = useLeadProcessingTime(
    selectedPipelineId,
    dateRange,
    excludedStageIds,
  );

  // Stages for the processing time filter
  const { data: pipelineStages = [] } = useStages(selectedPipelineId || "");

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
    <div className="p-4 md:p-6 space-y-5">
      {/* Header with Pipeline Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {selectedBranch?.name || "Filial tanlanmagan"}
            </p>
          </div>
        </div>

        {/* Pipeline Selector */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Pipeline
            </Label>
            <Select
              value={selectedPipelineId}
              onValueChange={setSelectedPipelineId}
            >
              <SelectTrigger className="w-48">
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

          {/* Date Period Filter */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              <CalendarDays className="h-3 w-3 inline mr-1" />
              Davr
            </Label>
            <Select
              value={datePeriod}
              onValueChange={(v) => setDatePeriod(v as DatePeriod)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Doimiy</SelectItem>
                <SelectItem value="last7">Oxirgi 7 kun</SelectItem>
                <SelectItem value="last30">Oxirgi oylik</SelectItem>
                <SelectItem value="current_month">Joriy oy</SelectItem>
                <SelectItem value="last_month">O&apos;tgan oy</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Inputs */}
          {datePeriod === "custom" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Dan</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Gacha</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-36"
                />
              </div>
            </>
          )}

          {/* Active filter indicator */}
          {dateRange && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium self-end">
              <Calendar className="h-3.5 w-3.5" />
              {dateRange.startDate} — {dateRange.endDate}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Jami Lidlar */}
        <Card className="hover:shadow-lg transition-all duration-200 border-border/60">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Lidlar
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-blue-500">
              {stats?.total_leads.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <div>
                Bugun:{" "}
                <span className="font-medium text-foreground">
                  {stats?.leads_today}
                </span>
              </div>
              <div>
                Hafta:{" "}
                <span className="font-medium text-foreground">
                  {stats?.leads_week}
                </span>
              </div>
              <div>
                Oy:{" "}
                <span className="font-medium text-foreground">
                  {stats?.leads_month}
                </span>
              </div>
              <div>
                Yil:{" "}
                <span className="font-medium text-foreground">
                  {stats?.leads_year}
                </span>
              </div>
            </div>
            {(stats?.unassigned_leads ?? 0) > 0 && (
              <div className="mt-2.5 p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                <span className="text-xs font-medium text-red-500">
                  Biriktirilmagan
                </span>
                <span className="text-sm font-bold text-red-500">
                  {stats?.unassigned_leads}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="hover:shadow-lg transition-all duration-200 border-border/60">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Eslatmalar
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-green-500">
              {stats?.total_tasks.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" /> Bajarilgan
                </span>
                <span className="font-medium text-foreground">
                  {stats?.completed_tasks}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-500" /> Kutilmoqda
                </span>
                <span className="font-medium text-foreground">
                  {stats?.pending_tasks}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" /> Muddati
                  o&apos;tgan
                </span>
                <span className="font-medium text-foreground">
                  {stats?.overdue_tasks}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calls */}
        <Card className="hover:shadow-lg transition-all duration-200 border-border/60">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <PhoneCall className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Qo&apos;ng&apos;iroqlar
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-purple-500">
              {stats?.total_calls?.toLocaleString() ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Bugun</span>
                <span className="font-medium text-foreground">
                  {stats?.calls_today ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Hafta</span>
                <span className="font-medium text-foreground">
                  {stats?.calls_week ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Updated Leads */}
        <Card className="hover:shadow-lg transition-all duration-200 border-border/60">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Yangilangan
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-amber-500">
              {stats?.updated_today ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Bugun</span>
                <span className="font-medium text-foreground">
                  {stats?.updated_today ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Hafta</span>
                <span className="font-medium text-foreground">
                  {stats?.updated_week ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Oy</span>
                <span className="font-medium text-foreground">
                  {stats?.updated_month ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Callers Section */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base font-semibold text-foreground">
              Top Xodimlar (Qo&apos;ng&apos;iroqlar)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {callersLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : topCallers && topCallers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {topCallers.map((caller, index) => (
                <div
                  key={caller.employee_id}
                  className="relative flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  {/* Medal/rank badge */}
                  <div className="absolute -top-2 -right-2 text-lg">
                    {index === 0
                      ? "🥇"
                      : index === 1
                        ? "🥈"
                        : index === 2
                          ? "🥉"
                          : null}
                  </div>
                  <div className="text-2xl font-bold text-purple-500">
                    {caller.call_count}
                  </div>
                  <div
                    className="text-sm font-medium text-foreground text-center mt-1 w-full overflow-hidden"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                    title={caller.employee_name}
                  >
                    {caller.employee_name}
                  </div>
                  {index >= 3 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      #{index + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-muted mb-3">
                <Phone className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Hali qo&apos;ng&apos;iroqlar mavjud emas
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Qo&apos;ng&apos;iroqlar qo&apos;shilganda bu yerda
                ko&apos;rinadi
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads Trend Chart */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Lidlar Dinamikasi
            </CardTitle>
            <Tabs
              value={trendPeriod}
              onValueChange={(v) => setTrendPeriod(v as typeof trendPeriod)}
            >
              <TabsList className="h-8">
                <TabsTrigger value="day" className="text-xs px-3 h-7">
                  Kun
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3 h-7">
                  Hafta
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3 h-7">
                  Oy
                </TabsTrigger>
                <TabsTrigger value="year" className="text-xs px-3 h-7">
                  Yil
                </TabsTrigger>
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
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={leadsTrend}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisTickColor, fontSize: 12 }}
                  axisLine={{ stroke: gridStrokeColor }}
                  tickLine={{ stroke: gridStrokeColor }}
                />
                <YAxis
                  tick={{ fill: axisTickColor, fontSize: 12 }}
                  axisLine={{ stroke: gridStrokeColor }}
                  tickLine={{ stroke: gridStrokeColor }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: tooltipLabelColor,
                  }}
                  labelStyle={{ color: tooltipLabelColor }}
                  itemStyle={{ color: tooltipLabelColor }}
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

      {/* Charts Section - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Xodimlar Konversiyasi */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="space-y-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-blue-500" />
                Xodimlar Konversiyasi
              </CardTitle>
              <div className="w-full">
                <Label className="text-xs text-muted-foreground">
                  Konversiya stage
                </Label>
                <Select
                  value={conversionStageId}
                  onValueChange={setConversionStageId}
                >
                  <SelectTrigger className="mt-1 h-8 text-sm">
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
            ) : employeeConversion && employeeConversion.length > 0 ? (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {employeeConversion.slice(0, 10).map((emp, index) => (
                  <div
                    key={emp.employee_id}
                    className="p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                          #{index + 1}
                        </span>
                        <span
                          className="text-sm font-semibold text-foreground truncate"
                          title={emp.employee_name}
                        >
                          {emp.employee_name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0 ml-2">
                        {emp.conversion_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(emp.conversion_rate, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Ma&apos;lumot topilmadi
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Stage tanlang
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage bo'yicha lidlar (Horizontal Bar Chart) */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-500" />
              Stage bo&apos;yicha Taqsimot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stagesLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  layout="vertical"
                  data={leadsByStage}
                  margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke={gridStrokeColor}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="stage_name"
                    type="category"
                    width={90}
                    tick={{
                      fill: axisTickColor,
                      fontSize: 11,
                    }}
                    interval={0}
                    axisLine={{ stroke: gridStrokeColor }}
                    tickLine={{ stroke: gridStrokeColor }}
                  />
                  <Tooltip
                    cursor={{
                      fill:
                        theme === "dark"
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.05)",
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      color: tooltipLabelColor,
                    }}
                    labelStyle={{ color: tooltipLabelColor }}
                    itemStyle={{ color: tooltipLabelColor }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
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

        {/* Vazifalar (Donut Chart) */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Eslatmalar Taqsimoti
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px]">
            {statsLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : taskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
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
                      color: tooltipLabelColor,
                    }}
                    labelStyle={{ color: tooltipLabelColor }}
                    itemStyle={{ color: tooltipLabelColor }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
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
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <ListChecks className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Eslatmalar yo&apos;q
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Eslatmalar qo&apos;shilganda ko&apos;rinadi
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* UTM Analytics + Lead Processing Time - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* UTM Analytics (Pie Chart) */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5 text-pink-500" />
              UTM Manbalari bo&apos;yicha Lidlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {utmLoading ? (
              <div className="flex items-center justify-center h-72">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : utmData && utmData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={utmData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="utm_source"
                      stroke="none"
                    >
                      {utmData.map((entry, index) => (
                        <Cell
                          key={`utm-${index}`}
                          fill={getUtmColor(entry.utm_source, index)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: tooltipLabelColor,
                      }}
                      labelStyle={{ color: tooltipLabelColor }}
                      formatter={((value: any, name: any) => [
                        `${value ?? 0} ta lid`,
                        name ?? "",
                      ]) as any}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => (
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
                        fontSize="22"
                        fontWeight="bold"
                        fill="hsl(var(--foreground))"
                      >
                        {utmData.reduce((sum, item) => sum + item.count, 0)}
                      </tspan>
                      <tspan
                        x="50%"
                        dy="1.5em"
                        fontSize="11"
                        fill="hsl(var(--muted-foreground))"
                      >
                        Jami Lid
                      </tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>

                {/* UTM source breakdown list */}
                <div className="w-full mt-3 space-y-2">
                  {utmData.map((item, index) => (
                    <div
                      key={item.utm_source}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: getUtmColor(item.utm_source, index) }}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {item.utm_source}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground">
                          {item.count}
                        </span>
                        <span className="text-xs text-muted-foreground min-w-[45px] text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <Globe className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  UTM ma&apos;lumotlari topilmadi
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lidlarda UTM manba bo&apos;lganda ko&apos;rinadi
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Processing Time Analytics */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Timer className="h-5 w-5 text-cyan-500" />
                Lid Ishlash Vaqti Analitikasi
              </CardTitle>

              {/* Stage Exclude Filter */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 w-full justify-start"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      Ignore qilinadigan etaplar
                      {excludedStageIds.length > 0 && (
                        <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
                          {excludedStageIds.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Quyidagi etaplardagi lidlar hisobga olinmaydi:
                      </p>
                      {pipelineStages.length > 0 ? (
                        <div className="space-y-1.5 max-h-52 overflow-y-auto">
                          {pipelineStages.map((stage) => (
                            <label
                              key={stage.id}
                              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={excludedStageIds.includes(stage.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setExcludedStageIds(prev => [...prev, stage.id]);
                                  } else {
                                    setExcludedStageIds(prev => prev.filter(id => id !== stage.id));
                                  }
                                }}
                              />
                              <span className="text-sm text-foreground">{stage.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Etaplar topilmadi</p>
                      )}

                      {excludedStageIds.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs mt-2"
                          onClick={() => setExcludedStageIds([])}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Barchasini tozalash
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Show excluded stage names */}
                {excludedStageIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {excludedStageIds.map(stageId => {
                      const stage = pipelineStages.find(s => s.id === stageId);
                      return stage ? (
                        <Badge
                          key={stageId}
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0 h-5 gap-1 cursor-pointer"
                          onClick={() => setExcludedStageIds(prev => prev.filter(id => id !== stageId))}
                        >
                          {stage.name}
                          <X className="h-2.5 w-2.5" />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {processingLoading ? (
              <div className="flex items-center justify-center h-72">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : processingTime?.overall ? (
              <div className="space-y-5">
                {/* Overall Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                    <Zap className="h-4 w-4 text-green-500 mx-auto mb-1" />
                    <div className="text-xs text-muted-foreground mb-0.5">Eng tez</div>
                    <div className="text-sm font-bold text-green-500">
                      {formatTime(processingTime.overall.fastest_minutes)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <ArrowUpDown className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                    <div className="text-xs text-muted-foreground mb-0.5">O&apos;rtacha</div>
                    <div className="text-sm font-bold text-amber-500">
                      {formatTime(processingTime.overall.average_minutes)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <Clock className="h-4 w-4 text-red-500 mx-auto mb-1" />
                    <div className="text-xs text-muted-foreground mb-0.5">Eng sekin</div>
                    <div className="text-sm font-bold text-red-500">
                      {formatTime(processingTime.overall.slowest_minutes)}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Jami {processingTime.overall.total_processed} ta lid tahlil qilindi
                </div>

                {/* Employee Processing Times */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Xodimlar bo&apos;yicha
                  </h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {processingTime.employees.map((emp, index) => (
                      <div
                        key={emp.employee_id}
                        className="p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs font-medium text-muted-foreground shrink-0">
                              #{index + 1}
                            </span>
                            <span
                              className="text-sm font-semibold text-foreground truncate"
                              title={emp.employee_name}
                            >
                              {emp.employee_name}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {emp.total_leads} lid
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="px-2 py-1.5 rounded-md bg-green-500/5">
                            <div className="text-[10px] text-muted-foreground">Tez</div>
                            <div className="text-xs font-bold text-green-500">
                              {formatTime(emp.fastest_minutes)}
                            </div>
                          </div>
                          <div className="px-2 py-1.5 rounded-md bg-amber-500/5">
                            <div className="text-[10px] text-muted-foreground">O&apos;rtacha</div>
                            <div className="text-xs font-bold text-amber-500">
                              {formatTime(emp.average_minutes)}
                            </div>
                          </div>
                          <div className="px-2 py-1.5 rounded-md bg-red-500/5">
                            <div className="text-[10px] text-muted-foreground">Sekin</div>
                            <div className="text-xs font-bold text-red-500">
                              {formatTime(emp.slowest_minutes)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <Timer className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Ishlangan lidlar topilmadi
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lidlar yangilanganda bu yerda ko&apos;rinadi
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
