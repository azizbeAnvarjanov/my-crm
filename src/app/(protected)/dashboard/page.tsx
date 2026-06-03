"use client";

import { useState, useMemo } from "react";
import { useBranch } from "@/components/app-sidebar";
import { usePipelines } from "@/hooks/use-pipeline";
import { useEmployee } from "@/hooks/use-employee";
import {
  useDashboardStats,
  useLeadsByStage,
  useEmployeeConversion,
  useLeadsTrend,
  useCallsTrend,
  useTopCallers,
  CallsTrendPoint,
  DashboardDateRange,
} from "@/hooks/use-dashboard-stats";
import { getEmployeeParticipantIds, useCallsEmployees } from "@/hooks/use-calls";
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
  type LucideIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

function StatsCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-9 w-24" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function SectionPlaceholder({
  icon: Icon,
  title,
  description,
  loading = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Icon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { selectedBranch } = useBranch();
  const branchId = selectedBranch?.id;
  const { theme } = useTheme();
  const { data: currentEmployee, isLoading: employeeLoading } = useEmployee();
  const isAdmin = currentEmployee?.role === "super-admin";
  const scopedEmployeeId = !employeeLoading && currentEmployee && !isAdmin ? currentEmployee.id : undefined;
  const dashboardReady = !employeeLoading && (isAdmin || Boolean(scopedEmployeeId));
  const dashboardScope = useMemo(() => {
    if (!scopedEmployeeId || !currentEmployee) return undefined;

    return {
      employeeId: scopedEmployeeId,
      participantIds: getEmployeeParticipantIds({
        id: currentEmployee.id,
        user_id: currentEmployee.user_id,
        employee_id: currentEmployee.employee_id,
      }),
    };
  }, [currentEmployee, scopedEmployeeId]);

  // Theme-aware colors
  const axisTickColor = theme === "dark" ? "#a1a1a1" : "#6b7280";
  const tooltipLabelColor = theme === "dark" ? "#ededed" : "#171717";
  const gridStrokeColor =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  // Pipeline state
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [conversionStageId, setConversionStageId] = useState<string>("");
  const [trendPeriod, setTrendPeriod] = useState<
    "day" | "week" | "month" | "year"
  >("month");
  const [callsTrendPeriod, setCallsTrendPeriod] = useState<
    "day" | "week" | "month" | "year"
  >("month");
  const [selectedCallsEmployeeId, setSelectedCallsEmployeeId] = useState("all");

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

  const activePipelineId = useMemo(() => {
    if (selectedPipelineId && pipelines.some((pipeline) => pipeline.id === selectedPipelineId)) {
      return selectedPipelineId;
    }

    return pipelines[0]?.id ?? "";
  }, [pipelines, selectedPipelineId]);
  const scopedActivePipelineId = dashboardReady ? activePipelineId : "";

  const hasPipelines = pipelines.length > 0;
  const hasActivePipeline = scopedActivePipelineId.length > 0;
  const showPipelineEmptyState = !!branchId && !pipelinesLoading && !hasPipelines;
  const pipelinePending = !branchId || pipelinesLoading;
  const { data: callsEmployees = [], isLoading: callsEmployeesLoading } = useCallsEmployees(branchId ?? null);
  const currentCallsEmployee = useMemo(() => {
    if (!currentEmployee) return null;

    return {
      id: currentEmployee.id,
      name: currentEmployee.name,
      role: currentEmployee.role,
      user_id: currentEmployee.user_id,
      employee_id: currentEmployee.employee_id,
      branch_id: currentEmployee.branch_id ?? undefined,
    };
  }, [currentEmployee]);
  const selectedCallsEmployee = useMemo(
    () =>
      dashboardScope
        ? currentCallsEmployee
        : callsEmployees.find((employee) => employee.id === selectedCallsEmployeeId) ?? null,
    [callsEmployees, currentCallsEmployee, dashboardScope, selectedCallsEmployeeId]
  );
  const activeCallsEmployeeId = useMemo(
    () =>
      dashboardScope
        ? scopedEmployeeId ?? "all"
        : selectedCallsEmployeeId === "all" || selectedCallsEmployee
          ? selectedCallsEmployeeId
          : "all",
    [dashboardScope, scopedEmployeeId, selectedCallsEmployee, selectedCallsEmployeeId]
  );
  const selectedCallsOperatorIds = useMemo(() => {
    if (dashboardScope) {
      return currentEmployee?.user_id ? [String(currentEmployee.user_id)] : [];
    }

    if (!selectedCallsEmployee) {
      return undefined;
    }

    return selectedCallsEmployee.user_id ? [selectedCallsEmployee.user_id] : [];
  }, [currentEmployee, dashboardScope, selectedCallsEmployee]);

  // Fetch dashboard data
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
  } = useDashboardStats(scopedActivePipelineId, dateRange, branchId ?? null, dashboardScope);
  const {
    data: leadsByStage,
    isLoading: stagesLoading,
    isFetching: stagesFetching,
  } = useLeadsByStage(scopedActivePipelineId, dashboardScope?.employeeId);
  const activeConversionStageId = useMemo(() => {
    if (!conversionStageId) return "";
    if (!leadsByStage?.length) return conversionStageId;

    return leadsByStage.some((stage) => stage.stage_id === conversionStageId)
      ? conversionStageId
      : "";
  }, [conversionStageId, leadsByStage]);
  const {
    data: employeeConversion,
    isLoading: employeesLoading,
    isFetching: employeesFetching,
  } =
    useEmployeeConversion(activeConversionStageId, dashboardScope?.employeeId);
  const {
    data: leadsTrend,
    isLoading: trendLoading,
    isFetching: trendFetching,
  } = useLeadsTrend(
    trendPeriod,
    scopedActivePipelineId,
    dashboardScope?.employeeId,
  );
  const {
    data: callsTrend,
    isLoading: callsTrendLoading,
    isFetching: callsTrendFetching,
  } = useCallsTrend(
    callsTrendPeriod,
    branchId ?? null,
    selectedCallsOperatorIds,
  );
  const {
    data: topCallers,
    isLoading: callersLoading,
    isFetching: callersFetching,
  } = useTopCallers(
    branchId ?? null,
    dateRange,
  );
  const isRefreshing =
    statsFetching ||
    stagesFetching ||
    employeesFetching ||
    trendFetching ||
    callsTrendFetching ||
    callersFetching;

  const showStatsSkeleton =
    !showPipelineEmptyState &&
    (!hasActivePipeline || (statsLoading && !stats));
  const showTrendLoader =
    !showPipelineEmptyState &&
    (!hasActivePipeline || (trendLoading && !leadsTrend));
  const callsEmployeeSelectorLoading = isAdmin && callsEmployeesLoading;
  const showCallsTrendLoader = (!branchId || callsTrendLoading || callsEmployeeSelectorLoading) && !callsTrend;
  const showStagesLoader =
    !showPipelineEmptyState &&
    (!hasActivePipeline || (stagesLoading && !leadsByStage));
  const showConversionLoader =
    hasActivePipeline &&
    !!activeConversionStageId &&
    employeesLoading &&
    !employeeConversion;
  const showTopCallersLoader = (!branchId || callersLoading) && !topCallers;
  const hasCallsTrendData = Boolean(
    callsTrend?.some((point: CallsTrendPoint) => point.total > 0)
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

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header with Pipeline Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              {isRefreshing && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
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
              value={activePipelineId}
              onValueChange={setSelectedPipelineId}
            >
              <SelectTrigger
                className="w-48"
                disabled={pipelinePending || showPipelineEmptyState}
              >
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

      <div className="flex w-full gap-4">

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4 w-[40%]">
          {showStatsSkeleton ? (
            Array.from({ length: 4 }).map((_, index) => (
              <StatsCardSkeleton key={index} />
            ))
          ) : showPipelineEmptyState ? (
            <Card className="col-span-full border-border/60">
              <CardContent className="p-6">
                <SectionPlaceholder
                  icon={BarChart3}
                  title="Pipeline topilmadi"
                  description="Tanlangan filialda hali pipeline yaratilmagan."
                />
              </CardContent>
            </Card>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Top Employees by Calls */}
        <Card className="border-border/60 w-[60%]">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-2">
              <Trophy className="mt-0.5 h-5 w-5 text-amber-500" />
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Top xodimlar
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Qo&apos;ng&apos;iroqlar soni bo&apos;yicha
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showTopCallersLoader ? (
              <SectionPlaceholder
                icon={Phone}
                title="Top xodimlar yuklanmoqda"
                description="Qo&apos;ng&apos;iroqlar bo&apos;yicha reyting tayyorlanmoqda."
                loading
              />
            ) : topCallers && topCallers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
                {topCallers.map((caller, index) => (
                  <div
                    key={caller.employee_id}
                    className="relative flex flex-row-reverse items-center justify-center rounded-xl border border-border/60 bg-card px-2 py-2 text-center transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="text-2xl font-bold text-purple-500 border w-12 h-10 flex items-center justify-center rounded-lg">
                      {caller.call_count}
                    </div>
                    <div
                      className={`absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${index === 0
                        ? "bg-amber-500 text-white"
                        : index === 1
                          ? "bg-slate-400 text-white"
                          : index === 2
                            ? "bg-orange-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {index + 1}
                    </div>

                    <div
                      className="w-full overflow-hidden text-sm font-medium text-foreground"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                      title={caller.employee_name}
                    >
                      {caller.employee_name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <Phone className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Hali faol xodimlar topilmadi
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Qo&apos;ng&apos;iroqlar paydo bo&apos;lgach, top xodimlar shu yerda ko&apos;rinadi
                </p>
              </div>
            )}
          </CardContent>
        </Card>


      </div>

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
          {showPipelineEmptyState ? (
            <SectionPlaceholder
              icon={TrendingUp}
              title="Pipeline topilmadi"
              description="Trend ko'rish uchun avval pipeline yarating."
            />
          ) : showTrendLoader ? (
            <SectionPlaceholder
              icon={TrendingUp}
              title="Trend yuklanmoqda"
              description="Lidlar dinamikasi tayyorlanmoqda."
              loading
            />
          ) : leadsTrend && leadsTrend.length > 0 ? (
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
          ) : (
            <SectionPlaceholder
              icon={TrendingUp}
              title="Trend ma'lumoti topilmadi"
              description="Tanlangan pipeline uchun hali lidlar dinamikasi yo'q."
            />
          )}
        </CardContent>
      </Card>

      {/* Calls Trend Chart */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-violet-500" />
                Calls Dinamikasi
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {selectedCallsEmployee ? `${selectedCallsEmployee.name} bo'yicha` : "Filial bo'yicha"} kiruvchi va chiquvchi qo&apos;ng&apos;iroqlar
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              {isAdmin && (
                <div className="w-full sm:w-52">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Xodim
                  </Label>
                  <Select
                    value={activeCallsEmployeeId}
                    onValueChange={setSelectedCallsEmployeeId}
                    disabled={!branchId || callsEmployeesLoading}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Xodim tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barcha xodimlar</SelectItem>
                      {callsEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Tabs
                value={callsTrendPeriod}
                onValueChange={(v) => setCallsTrendPeriod(v as typeof callsTrendPeriod)}
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
          </div>
        </CardHeader>
        <CardContent>
          {!branchId ? (
            <SectionPlaceholder
              icon={PhoneCall}
              title="Filial tanlanmagan"
              description="Calls dinamikasini ko'rish uchun filial tanlang."
            />
          ) : showCallsTrendLoader ? (
            <SectionPlaceholder
              icon={PhoneCall}
              title="Calls dinamikasi yuklanmoqda"
              description="Qo'ng'iroqlar oqimi tayyorlanmoqda."
              loading
            />
          ) : hasCallsTrendData ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={callsTrend}>
                <defs>
                  <linearGradient id="colorInboundCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="colorOutboundCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
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
                  dataKey="incoming"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInboundCalls)"
                  name="Kiruvchi"
                />
                <Area
                  type="monotone"
                  dataKey="outgoing"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOutboundCalls)"
                  name="Chiquvchi"
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <SectionPlaceholder
              icon={PhoneCall}
              title="Calls ma'lumoti topilmadi"
              description="Tanlangan xodim yoki filial uchun hali qo'ng'iroqlar dinamikasi yo'q."
            />
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
                  value={activeConversionStageId}
                  onValueChange={setConversionStageId}
                >
                  <SelectTrigger
                    className="mt-1 h-8 text-sm"
                    disabled={!hasActivePipeline || showPipelineEmptyState || showStagesLoader}
                  >
                    <SelectValue placeholder="Etap tanlang" />
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
            {showPipelineEmptyState ? (
              <SectionPlaceholder
                icon={ListChecks}
                title="Pipeline topilmadi"
                description="Konversiyani ko'rish uchun avval pipeline yarating."
              />
            ) : !activeConversionStageId ? (
              <SectionPlaceholder
                icon={Users}
                title="Etap tanlang"
                description="Konversiyani hisoblash uchun etap tanlang."
              />
            ) : showConversionLoader ? (
              <SectionPlaceholder
                icon={Users}
                title="Konversiya yuklanmoqda"
                description="Xodimlar statistikasi tayyorlanmoqda."
                loading
              />
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
              <SectionPlaceholder
                icon={Users}
                title="Ma'lumot topilmadi"
                description="Tanlangan stage uchun konversiya ma'lumoti yo'q."
              />
            )}
          </CardContent>
        </Card>

        {/* Stage bo'yicha lidlar (Horizontal Bar Chart) */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-500" />
              Etap bo&apos;yicha Taqsimot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showPipelineEmptyState ? (
              <SectionPlaceholder
                icon={BarChart3}
                title="Pipeline topilmadi"
                description="Taqsimotni ko'rish uchun avval pipeline yarating."
              />
            ) : showStagesLoader ? (
              <SectionPlaceholder
                icon={BarChart3}
                title="Stage ma'lumotlari yuklanmoqda"
                description="Pipeline bo'yicha taqsimot tayyorlanmoqda."
                loading
              />
            ) : leadsByStage && leadsByStage.length > 0 ? (
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
                    {leadsByStage.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <SectionPlaceholder
                icon={BarChart3}
                title="Stage ma'lumoti topilmadi"
                description="Tanlangan pipeline uchun stage statistikasi yo'q."
              />
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
            {showPipelineEmptyState ? (
              <SectionPlaceholder
                icon={CheckCircle2}
                title="Pipeline topilmadi"
                description="Vazifa taqsimotini ko'rish uchun avval pipeline yarating."
              />
            ) : showStatsSkeleton ? (
              <SectionPlaceholder
                icon={CheckCircle2}
                title="Vazifalar yuklanmoqda"
                description="Taqsimot ma'lumotlari tayyorlanmoqda."
                loading
              />
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
              <SectionPlaceholder
                icon={ListChecks}
                title="Eslatmalar yo'q"
                description="Eslatmalar qo'shilganda bu yerda ko'rinadi."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
