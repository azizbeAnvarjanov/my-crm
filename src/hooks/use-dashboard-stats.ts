"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
    getCallParticipantValues,
    getEmployeeParticipantIds,
} from "@/hooks/use-calls";
import { createClient } from "@/lib/supabase/client";

// Dashboard statistikasi turlarini belgilaymiz
export interface DashboardStats {
    // Leads statistikasi (pipeline bo'yicha)
    total_leads: number;
    unassigned_leads: number; // employee_id = null
    leads_today: number;
    leads_week: number;
    leads_month: number;
    leads_year: number;

    // Leads o'zgarishlari (updated_at bo'yicha, pipeline bo'yicha)
    updated_today: number;
    updated_week: number;
    updated_month: number;

    // Tasks statistikasi (boolean status)
    total_tasks: number;
    completed_tasks: number; // status = true
    pending_tasks: number; // status = false
    overdue_tasks: number; // date < today
    today_tasks: number; // date = today
    upcoming_tasks: number; // date <= today + 3 days

    // Qo'ng'iroqlar
    total_calls: number;
    calls_today: number;
    calls_week: number;
}

export interface EmployeeConversion {
    employee_id: string;
    employee_name: string;
    total_leads: number;
    converted_leads: number; // "Guruhga qabul qilindi" stage'dagi lidlar
    conversion_rate: number; // foizda
}

export interface LeadsByStage {
    stage_id: string;
    stage_name: string;
    count: number;
    percentage: number;
}

export interface LeadsTrend {
    date: string;
    count: number;
    label: string;
}

export type DashboardTrendPeriod = "day" | "week" | "month" | "year";

export interface CallsTrendPoint {
    date: string;
    label: string;
    incoming: number;
    outgoing: number;
    total: number;
}

// Sana filtri turi
export interface DashboardDateRange {
    startDate: string; // ISO string yoki YYYY-MM-DD
    endDate: string;   // ISO string yoki YYYY-MM-DD
}

export interface DashboardEmployeeScope {
    employeeId?: string;
    participantIds?: string[];
    operatorIds?: string[];
}

type DateRangeQuery = {
    gte: (column: string, value: string) => unknown;
    lte: (column: string, value: string) => unknown;
};

type EmployeeScopeQuery = {
    eq: (column: string, value: string) => unknown;
};

type OperatorFilterQuery = {
    in: (column: string, values: Array<string | number>) => unknown;
};

const dashboardKeys = {
    all: ["dashboard-stats"] as const,
    stats: (
        pipelineId?: string,
        branchId?: string | null,
        dateRange?: DashboardDateRange,
        scope?: DashboardEmployeeScope,
    ) =>
        [
            ...dashboardKeys.all,
            "stats",
            pipelineId,
            branchId,
            dateRange?.startDate,
            dateRange?.endDate,
            scope?.employeeId,
            scope?.participantIds?.join(","),
            scope?.operatorIds?.join(","),
        ] as const,
    leadsByStage: (pipelineId?: string, employeeId?: string) =>
        [...dashboardKeys.all, "leads-by-stage", pipelineId, employeeId] as const,
    employeeConversion: (conversionStageId?: string, employeeId?: string) =>
        [...dashboardKeys.all, "employee-conversion", conversionStageId, employeeId] as const,
    leadsTrend: (period: DashboardTrendPeriod, pipelineId?: string, employeeId?: string) =>
        [...dashboardKeys.all, "leads-trend", period, pipelineId, employeeId] as const,
    callsTrend: (period: DashboardTrendPeriod, branchId?: string | null, participantKey?: string) =>
        [...dashboardKeys.all, "calls-trend", period, branchId, participantKey] as const,
};

function normalizeTextValues(values: Array<string | null | undefined>) {
    return Array.from(
        new Set(
            values
                .map((value) => (value == null ? "" : String(value).trim()))
                .filter(Boolean)
        )
    );
}

function normalizeFilterValues(values: Array<string | number | null | undefined>) {
    const seen = new Set<string>();
    const result: Array<string | number> = [];

    for (const value of values) {
        if (value == null) continue;

        const normalizedValue = String(value).trim();
        if (!normalizedValue || seen.has(normalizedValue)) continue;

        seen.add(normalizedValue);
        result.push(typeof value === "number" ? value : normalizedValue);
    }

    return result;
}

function intersectFilterValues(
    left: Array<string | number>,
    right: Array<string | number>,
) {
    const rightValues = new Set(right.map((value) => String(value).trim()));
    return left.filter((value) => rightValues.has(String(value).trim()));
}

// Sana filtri qo'llash helper
function applyDateRange<T extends DateRangeQuery>(query: T, dateRange?: DashboardDateRange, dateField = "created_at"): T {
    if (!dateRange) return query;
    query = query.gte(dateField, `${dateRange.startDate}T00:00:00.000Z`) as T;
    query = query.lte(dateField, `${dateRange.endDate}T23:59:59.999Z`) as T;
    return query;
}

function applyEmployeeScope<T extends EmployeeScopeQuery>(query: T, employeeId?: string): T {
    return employeeId ? query.eq("employee_id", employeeId) as T : query;
}

function applyCallOperatorFilter<T extends OperatorFilterQuery>(query: T, operatorIds: string[]): T {
    const normalizedOperatorIds = normalizeTextValues(operatorIds);
    return normalizedOperatorIds.length > 0 ? query.in("operator_id", normalizedOperatorIds) as T : query;
}

function applyTaskEmployeeFilter<T extends OperatorFilterQuery>(query: T, employeeIds: Array<string | number>): T {
    const normalizedEmployeeIds = normalizeFilterValues(employeeIds);
    return normalizedEmployeeIds.length > 0 ? query.in("employee_id", normalizedEmployeeIds) as T : query;
}

function getScopedOperatorIds(scope?: DashboardEmployeeScope) {
    if (!scope) return null;

    return normalizeTextValues(scope?.operatorIds ?? scope?.participantIds ?? []);
}

function getTrendConfig(period: DashboardTrendPeriod) {
    if (period === "day") {
        return {
            days: 7,
            format: { weekday: "short" } satisfies Intl.DateTimeFormatOptions,
        };
    }

    if (period === "week") {
        return {
            days: 12 * 7,
            format: { month: "short", day: "numeric" } satisfies Intl.DateTimeFormatOptions,
        };
    }

    if (period === "year") {
        return {
            days: 365,
            format: { month: "short" } satisfies Intl.DateTimeFormatOptions,
        };
    }

    return {
        days: 30,
        format: { month: "short", day: "numeric" } satisfies Intl.DateTimeFormatOptions,
    };
}

function buildTrendPoints(period: DashboardTrendPeriod, countsByDay: Map<string, number>) {
    const now = new Date();
    const { days, format } = getTrendConfig(period);
    const result: LeadsTrend[] = [];

    for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (days - 1 - i));

        const dateKey = date.toISOString().split("T")[0];
        result.push({
            date: dateKey,
            count: countsByDay.get(dateKey) ?? 0,
            label: date.toLocaleDateString("ru-RU", format),
        });
    }

    return result;
}

function buildCallsTrendPoints(
    period: DashboardTrendPeriod,
    countsByDay: Map<string, { incoming: number; outgoing: number }>
) {
    const now = new Date();
    const { days, format } = getTrendConfig(period);
    const result: CallsTrendPoint[] = [];

    for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (days - 1 - i));

        const dateKey = date.toISOString().split("T")[0];
        const counts = countsByDay.get(dateKey) ?? { incoming: 0, outgoing: 0 };
        result.push({
            date: dateKey,
            label: date.toLocaleDateString("ru-RU", format),
            incoming: counts.incoming,
            outgoing: counts.outgoing,
            total: counts.incoming + counts.outgoing,
        });
    }

    return result;
}

async function getBranchEmployeesWithParticipants(
    supabase: ReturnType<typeof createClient>,
    branchId: string,
) {
    const { data: employees, error: empError } = await supabase
        .from("xodimlar")
        .select("id, name, employee_id, user_id")
        .eq("branch_id", branchId);

    if (empError) throw empError;
    if (!employees?.length) return [];

    return employees
        .map((employee) => ({
            id: String(employee.id),
            name: employee.name,
            participantIds: getEmployeeParticipantIds({
                id: String(employee.id),
                user_id: employee.user_id ?? undefined,
                employee_id: employee.employee_id ?? undefined,
            }),
        }))
        .filter((employee) => employee.participantIds.length > 0);
}

async function getBranchEmployeeOperatorIds(
    supabase: ReturnType<typeof createClient>,
    branchId: string,
) {
    const { data: employees, error: empError } = await supabase
        .from("xodimlar")
        .select("user_id")
        .eq("branch_id", branchId);

    if (empError) throw empError;

    const rows = (employees ?? []) as Array<{ user_id: string | null }>;
    return normalizeTextValues(rows.map((employee) => employee.user_id));
}

async function getBranchEmployeeIds(
    supabase: ReturnType<typeof createClient>,
    branchId: string,
) {
    const { data: employees, error: empError } = await supabase
        .from("xodimlar")
        .select("id")
        .eq("branch_id", branchId);

    if (empError) throw empError;

    const rows = (employees ?? []) as Array<{ id: string | number | null }>;
    return normalizeFilterValues(rows.map((employee) => employee.id));
}

// Asosiy dashboard statistikasi (pipeline + sana filtri bo'yicha)
export function useDashboardStats(
    pipelineId?: string,
    dateRange?: DashboardDateRange,
    branchId?: string | null,
    scope?: DashboardEmployeeScope,
) {
    const supabase = createClient();
    const scopedEmployeeId = scope?.employeeId;
    const scopedOperatorIds = getScopedOperatorIds(scope);

    return useQuery({
        queryKey: dashboardKeys.stats(pipelineId, branchId, dateRange, scope),
        queryFn: async () => {
            if (!pipelineId) {
                return {
                    total_leads: 0,
                    unassigned_leads: 0,
                    leads_today: 0,
                    leads_week: 0,
                    leads_month: 0,
                    leads_year: 0,
                    updated_today: 0,
                    updated_week: 0,
                    updated_month: 0,
                    total_tasks: 0,
                    completed_tasks: 0,
                    pending_tasks: 0,
                    overdue_tasks: 0,
                    today_tasks: 0,
                    upcoming_tasks: 0,
                    total_calls: 0,
                    calls_today: 0,
                    calls_week: 0,
                } as DashboardStats;
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            const threeDaysLater = new Date(today);
            threeDaysLater.setDate(threeDaysLater.getDate() + 3);
            const [branchEmployeeIds, branchOperatorIds] = branchId
                ? await Promise.all([
                    getBranchEmployeeIds(supabase, branchId),
                    getBranchEmployeeOperatorIds(supabase, branchId),
                ])
                : [null, null] as const;

            // Leads statistikasi (pipeline bo'yicha — jami soni sana filtrisiz)
            let totalLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true });
            let todayLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString());
            let weekLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString());
            let monthLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString());
            let yearLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", yearAgo.toISOString());

            // Agar dateRange bo'lsa, sub-period so'rovlarni ham dateRange ichida filter qilamiz
            if (dateRange) {
                todayLeadsQuery = applyDateRange(todayLeadsQuery, dateRange);
                weekLeadsQuery = applyDateRange(weekLeadsQuery, dateRange);
                monthLeadsQuery = applyDateRange(monthLeadsQuery, dateRange);
                yearLeadsQuery = applyDateRange(yearLeadsQuery, dateRange);
            }

            // Updated_at bo'yicha (pipeline bo'yicha)
            let updatedTodayQuery = applyDateRange(supabase.from("leads").select("*", { count: "exact", head: true }).gte("updated_at", today.toISOString()), dateRange);
            let updatedWeekQuery = applyDateRange(supabase.from("leads").select("*", { count: "exact", head: true }).gte("updated_at", weekAgo.toISOString()), dateRange);
            let updatedMonthQuery = applyDateRange(supabase.from("leads").select("*", { count: "exact", head: true }).gte("updated_at", monthAgo.toISOString()), dateRange);

            // Pipeline filter qo'shamiz
            if (pipelineId) {
                totalLeadsQuery = totalLeadsQuery.eq("pipeline_id", pipelineId);
                todayLeadsQuery = todayLeadsQuery.eq("pipeline_id", pipelineId);
                weekLeadsQuery = weekLeadsQuery.eq("pipeline_id", pipelineId);
                monthLeadsQuery = monthLeadsQuery.eq("pipeline_id", pipelineId);
                yearLeadsQuery = yearLeadsQuery.eq("pipeline_id", pipelineId);
                updatedTodayQuery = updatedTodayQuery.eq("pipeline_id", pipelineId);
                updatedWeekQuery = updatedWeekQuery.eq("pipeline_id", pipelineId);
                updatedMonthQuery = updatedMonthQuery.eq("pipeline_id", pipelineId);
            }

            if (scopedEmployeeId) {
                totalLeadsQuery = applyEmployeeScope(totalLeadsQuery, scopedEmployeeId);
                todayLeadsQuery = applyEmployeeScope(todayLeadsQuery, scopedEmployeeId);
                weekLeadsQuery = applyEmployeeScope(weekLeadsQuery, scopedEmployeeId);
                monthLeadsQuery = applyEmployeeScope(monthLeadsQuery, scopedEmployeeId);
                yearLeadsQuery = applyEmployeeScope(yearLeadsQuery, scopedEmployeeId);
                updatedTodayQuery = applyEmployeeScope(updatedTodayQuery, scopedEmployeeId);
                updatedWeekQuery = applyEmployeeScope(updatedWeekQuery, scopedEmployeeId);
                updatedMonthQuery = applyEmployeeScope(updatedMonthQuery, scopedEmployeeId);
            }

            // Tasks statistikasi (count bilan — dateRange bilan filtrlanadi)
            let totalTasksQ = supabase.from("tasks").select("*", { count: "exact", head: true });
            let completedTasksQ = supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", true);
            let pendingTasksQ = supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", false);
            let overdueTasksQ = supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", false).lt("date", today.toISOString().split("T")[0]);
            let todayTasksQ = supabase.from("tasks").select("*", { count: "exact", head: true }).eq("date", today.toISOString().split("T")[0]);
            let upcomingTasksQ = supabase.from("tasks").select("*", { count: "exact", head: true }).gt("date", today.toISOString().split("T")[0]).lte("date", threeDaysLater.toISOString().split("T")[0]);

            if (dateRange) {
                totalTasksQ = totalTasksQ.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
                completedTasksQ = completedTasksQ.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
                pendingTasksQ = pendingTasksQ.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
                overdueTasksQ = overdueTasksQ.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
                todayTasksQ = todayTasksQ.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
                upcomingTasksQ = upcomingTasksQ.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
            }

            let activeTaskEmployeeIds = branchEmployeeIds;
            if (scopedEmployeeId) {
                activeTaskEmployeeIds = activeTaskEmployeeIds
                    ? intersectFilterValues(activeTaskEmployeeIds, [scopedEmployeeId])
                    : [scopedEmployeeId];
            }

            const hasEmptyBranchTaskScope = Boolean(branchId && activeTaskEmployeeIds?.length === 0);
            if (!hasEmptyBranchTaskScope && activeTaskEmployeeIds?.length) {
                totalTasksQ = applyTaskEmployeeFilter(totalTasksQ, activeTaskEmployeeIds);
                completedTasksQ = applyTaskEmployeeFilter(completedTasksQ, activeTaskEmployeeIds);
                pendingTasksQ = applyTaskEmployeeFilter(pendingTasksQ, activeTaskEmployeeIds);
                overdueTasksQ = applyTaskEmployeeFilter(overdueTasksQ, activeTaskEmployeeIds);
                todayTasksQ = applyTaskEmployeeFilter(todayTasksQ, activeTaskEmployeeIds);
                upcomingTasksQ = applyTaskEmployeeFilter(upcomingTasksQ, activeTaskEmployeeIds);
            }

            if (scopedEmployeeId) {
                totalTasksQ = applyEmployeeScope(totalTasksQ, scopedEmployeeId);
                completedTasksQ = applyEmployeeScope(completedTasksQ, scopedEmployeeId);
                pendingTasksQ = applyEmployeeScope(pendingTasksQ, scopedEmployeeId);
                overdueTasksQ = applyEmployeeScope(overdueTasksQ, scopedEmployeeId);
                todayTasksQ = applyEmployeeScope(todayTasksQ, scopedEmployeeId);
                upcomingTasksQ = applyEmployeeScope(upcomingTasksQ, scopedEmployeeId);
            }

            // Qo'ng'iroqlar (dateRange bilan)
            let totalCallsQ = supabase.from("calls").select("*", { count: "exact", head: true });
            let callsTodayQ = supabase.from("calls").select("*", { count: "exact", head: true }).gte("called_at", today.toISOString());
            let callsWeekQ = supabase.from("calls").select("*", { count: "exact", head: true }).gte("called_at", weekAgo.toISOString());

            if (dateRange) {
                totalCallsQ = applyDateRange(totalCallsQ, dateRange, "called_at");
                callsTodayQ = applyDateRange(callsTodayQ, dateRange, "called_at");
                callsWeekQ = applyDateRange(callsWeekQ, dateRange, "called_at");
            }

            let activeCallOperatorIds = branchOperatorIds;
            if (scopedOperatorIds) {
                activeCallOperatorIds = activeCallOperatorIds
                    ? intersectFilterValues(activeCallOperatorIds, scopedOperatorIds) as string[]
                    : scopedOperatorIds;
            }

            const hasEmptyBranchCallScope = Boolean(branchId && activeCallOperatorIds?.length === 0);
            if (!hasEmptyBranchCallScope && activeCallOperatorIds?.length) {
                totalCallsQ = applyCallOperatorFilter(totalCallsQ, activeCallOperatorIds.map(String));
                callsTodayQ = applyCallOperatorFilter(callsTodayQ, activeCallOperatorIds.map(String));
                callsWeekQ = applyCallOperatorFilter(callsWeekQ, activeCallOperatorIds.map(String));
            }

            let unassignedLeadsQuery = supabase
                .from("leads")
                .select("*", { count: "exact", head: true })
                .eq("pipeline_id", pipelineId);

            unassignedLeadsQuery = scopedEmployeeId
                ? unassignedLeadsQuery.eq("employee_id", scopedEmployeeId).is("employee_id", null)
                : unassignedLeadsQuery.is("employee_id", null);

            const [
                { count: total_leads },
                { count: leads_today },
                { count: leads_week },
                { count: leads_month },
                { count: leads_year },
                { count: updated_today },
                { count: updated_week },
                { count: updated_month },
                { count: total_tasks },
                { count: completed_tasks },
                { count: pending_tasks },
                { count: overdue_tasks },
                { count: today_tasks },
                { count: upcoming_tasks },
                { count: total_calls },
                { count: calls_today },
                { count: calls_week },
                { count: unassigned_leads },
            ] = await Promise.all([
                totalLeadsQuery,
                todayLeadsQuery,
                weekLeadsQuery,
                monthLeadsQuery,
                yearLeadsQuery,
                updatedTodayQuery,
                updatedWeekQuery,
                updatedMonthQuery,
                hasEmptyBranchTaskScope ? Promise.resolve({ count: 0 }) : totalTasksQ,
                hasEmptyBranchTaskScope ? Promise.resolve({ count: 0 }) : completedTasksQ,
                hasEmptyBranchTaskScope ? Promise.resolve({ count: 0 }) : pendingTasksQ,
                hasEmptyBranchTaskScope ? Promise.resolve({ count: 0 }) : overdueTasksQ,
                hasEmptyBranchTaskScope ? Promise.resolve({ count: 0 }) : todayTasksQ,
                hasEmptyBranchTaskScope ? Promise.resolve({ count: 0 }) : upcomingTasksQ,
                hasEmptyBranchCallScope ? Promise.resolve({ count: 0 }) : totalCallsQ,
                hasEmptyBranchCallScope ? Promise.resolve({ count: 0 }) : callsTodayQ,
                hasEmptyBranchCallScope ? Promise.resolve({ count: 0 }) : callsWeekQ,
                unassignedLeadsQuery,
            ]);

            return {
                total_leads: total_leads || 0,
                unassigned_leads: unassigned_leads || 0,
                leads_today: leads_today || 0,
                leads_week: leads_week || 0,
                leads_month: leads_month || 0,
                leads_year: leads_year || 0,
                updated_today: updated_today || 0,
                updated_week: updated_week || 0,
                updated_month: updated_month || 0,
                total_tasks: total_tasks || 0,
                completed_tasks: completed_tasks || 0,
                pending_tasks: pending_tasks || 0,
                overdue_tasks: overdue_tasks || 0,
                today_tasks: today_tasks || 0,
                upcoming_tasks: upcoming_tasks || 0,
                total_calls: total_calls || 0,
                calls_today: calls_today || 0,
                calls_week: calls_week || 0,
            } as DashboardStats;
        },
        enabled: !!pipelineId,
        placeholderData: keepPreviousData,
    });
}

// Stage bo'yicha lidlar (pipeline bo'yicha)
export function useLeadsByStage(pipelineId?: string, employeeId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: dashboardKeys.leadsByStage(pipelineId, employeeId),
        queryFn: async () => {
            if (!pipelineId) return [];

            let leadsQuery = supabase
                .from("leads")
                .select("stage_id")
                .eq("pipeline_id", pipelineId)
                .order('created_at', { ascending: false })
            leadsQuery = applyEmployeeScope(leadsQuery, employeeId);

            const [{ data: stages, error: stagesError }, { data: leads, error: leadsError }] =
                await Promise.all([
                    supabase
                        .from("stages")
                        .select("id, name, created_at")
                        .eq("pipeline_id", pipelineId)
                        .order("created_at", { ascending: true }),
                    leadsQuery,
                ]);

            if (stagesError) throw stagesError;
            if (leadsError) throw leadsError;
            if (!stages?.length) return [];

            const stageCounts = new Map<string, number>();
            for (const lead of leads ?? []) {
                stageCounts.set(lead.stage_id, (stageCounts.get(lead.stage_id) ?? 0) + 1);
            }

            const results = stages.map((stage) => ({
                stage_id: stage.id,
                stage_name: stage.name,
                count: stageCounts.get(stage.id) ?? 0,
            }));

            const total = results.reduce((sum, r) => sum + r.count, 0);

            return results.map(item => ({
                ...item,
                percentage: total > 0 ? (item.count / total) * 100 : 0,
            })) as LeadsByStage[];
        },
        enabled: !!pipelineId,
        placeholderData: keepPreviousData,
    });
}

// Xodimlar konversiyasi (barcha xodimlar)
export function useEmployeeConversion(conversionStageId?: string, employeeId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: dashboardKeys.employeeConversion(conversionStageId, employeeId),
        queryFn: async () => {
            if (!conversionStageId) return [];

            let employeesQuery = supabase
                .from("xodimlar")
                .select("id, name, role");

            employeesQuery = employeeId
                ? employeesQuery.eq("id", employeeId)
                : employeesQuery.eq("role", "manager");

            const { data: employees, error: empError } = await employeesQuery;

            if (empError) throw empError;
            if (!employees?.length) return [];

            const employeeIds = employees.map((employee) => employee.id);
            const { data: leads, error: leadsError } = await supabase
                .from("leads")
                .select("employee_id, stage_id")
                .in("employee_id", employeeIds);

            if (leadsError) throw leadsError;

            const statsByEmployee = new Map<string, { total: number; converted: number }>();
            for (const employee of employees) {
                statsByEmployee.set(employee.id, { total: 0, converted: 0 });
            }

            for (const lead of leads ?? []) {
                const current = statsByEmployee.get(lead.employee_id);
                if (!current) continue;

                current.total += 1;
                if (lead.stage_id === conversionStageId) {
                    current.converted += 1;
                }
            }

            const results = employees.map((emp) => {
                const stats = statsByEmployee.get(emp.id) ?? { total: 0, converted: 0 };
                return {
                    employee_id: emp.id,
                    employee_name: emp.name,
                    total_leads: stats.total,
                    converted_leads: stats.converted,
                    conversion_rate: stats.total > 0
                        ? (stats.converted / stats.total) * 100
                        : 0,
                };
            });

            return results.sort((a, b) => b.total_leads - a.total_leads);
        },
        enabled: !!conversionStageId,
        placeholderData: keepPreviousData,
    });
}

// Eng ko'p qo'ng'iroq qilgan xodimlar (branch bo'yicha)
export interface TopCaller {
    employee_id: string;
    employee_name: string;
    call_count: number;
}

export function useTopCallers(branchId: string | null, dateRange?: DashboardDateRange) {
    const supabase = createClient();

    return useQuery({
        queryKey: ["top-callers", branchId, dateRange?.startDate, dateRange?.endDate],
        queryFn: async () => {
            if (!branchId) return [];

            const employeesWithParticipants = await getBranchEmployeesWithParticipants(
                supabase,
                branchId,
            );
            if (!employeesWithParticipants.length) return [];

            let callsQuery = supabase
                .from("calls")
                .select("caller, callee, operator_id");

            callsQuery = applyDateRange(callsQuery, dateRange, "called_at");

            const { data: calls, error: callsError } = await callsQuery;
            if (callsError) throw callsError;

            const participantToEmployeeIds = new Map<string, string[]>();
            for (const employee of employeesWithParticipants) {
                for (const participantId of employee.participantIds) {
                    const existingEmployeeIds = participantToEmployeeIds.get(participantId) ?? [];
                    existingEmployeeIds.push(employee.id);
                    participantToEmployeeIds.set(participantId, existingEmployeeIds);
                }
            }

            const callCounts = new Map<string, number>();
            for (const employee of employeesWithParticipants) {
                callCounts.set(employee.id, 0);
            }
            let unmatchedCalls = 0;

            for (const call of calls ?? []) {
                const matchedEmployeeIds = new Set<string>();

                for (const participantId of getCallParticipantValues(call)) {
                    const employeeIds = participantToEmployeeIds.get(participantId);
                    if (!employeeIds?.length) continue;

                    employeeIds.forEach((employeeId) => matchedEmployeeIds.add(employeeId));
                }

                if (matchedEmployeeIds.size === 0) {
                    unmatchedCalls += 1;
                }

                matchedEmployeeIds.forEach((employeeId) => {
                    callCounts.set(employeeId, (callCounts.get(employeeId) ?? 0) + 1);
                });
            }

            const results: TopCaller[] = employeesWithParticipants.map((employee) => ({
                employee_id: employee.id,
                employee_name: employee.name,
                call_count: callCounts.get(employee.id) ?? 0,
            }));

            if (unmatchedCalls > 0) {
                results.push({
                    employee_id: "__unknown__",
                    employee_name: "Noma'lum",
                    call_count: unmatchedCalls,
                });
            }

            return results
                .filter((result) => result.call_count > 0)
                .sort((left, right) => {
                    if (right.call_count !== left.call_count) {
                        return right.call_count - left.call_count;
                    }

                    return left.employee_name.localeCompare(right.employee_name);
                })
                .slice(0, 5);
        },
        enabled: !!branchId,
        placeholderData: keepPreviousData,
    });
}

// Leads trend (pipeline bo'yicha)
export function useLeadsTrend(period: DashboardTrendPeriod, pipelineId?: string, employeeId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: dashboardKeys.leadsTrend(period, pipelineId, employeeId),
        queryFn: async () => {
            if (!pipelineId) return [];

            const now = new Date();
            const { days, format } = getTrendConfig(period);

            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - (days - 1));
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);

            let leadsQuery = supabase
                .from("leads")
                .select("created_at")
                .eq("pipeline_id", pipelineId)
                .gte("created_at", startDate.toISOString())
                .lte("created_at", endDate.toISOString());

            leadsQuery = applyEmployeeScope(leadsQuery, employeeId);

            const { data, error } = await leadsQuery;

            if (error) throw error;

            const countsByDay = new Map<string, number>();
            for (const lead of data ?? []) {
                const dateKey = lead.created_at.split("T")[0];
                countsByDay.set(dateKey, (countsByDay.get(dateKey) ?? 0) + 1);
            }

            // Har bir kun uchun count olamiz (row emas!)
            const result: LeadsTrend[] = [];

            // Parallel so'rovlar — har bir kun uchun count
            for (let i = 0; i < days; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - (days - 1 - i));
                const dateKey = date.toISOString().split("T")[0];
                result.push({
                    date: dateKey,
                    count: countsByDay.get(dateKey) ?? 0,
                    label: date.toLocaleDateString("ru-RU", format),
                });
            }

            return buildTrendPoints(period, countsByDay);
        },
        enabled: !!pipelineId,
        placeholderData: keepPreviousData,
    });
}

// Calls trend (branch/xodim bo'yicha)
export function useCallsTrend(
    period: DashboardTrendPeriod,
    branchId: string | null,
    operatorIds?: string[] | null,
) {
    const supabase = createClient();
    const operatorKey = operatorIds == null ? "branch" : normalizeTextValues(operatorIds).join(",");

    return useQuery({
        queryKey: dashboardKeys.callsTrend(period, branchId, operatorKey),
        queryFn: async () => {
            if (!branchId) return [];

            const now = new Date();
            const { days } = getTrendConfig(period);

            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - (days - 1));
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);

            const activeOperatorIds =
                operatorIds == null
                    ? await getBranchEmployeeOperatorIds(supabase, branchId)
                    : normalizeTextValues(operatorIds);

            if (activeOperatorIds.length === 0) {
                return buildCallsTrendPoints(period, new Map());
            }

            let callsQuery = supabase
                .from("calls")
                .select("called_at, created_at, direction");

            callsQuery = applyCallOperatorFilter(callsQuery, activeOperatorIds);

            callsQuery = callsQuery
                .gte("called_at", startDate.toISOString())
                .lte("called_at", endDate.toISOString());

            const { data, error } = await callsQuery;
            if (error) throw error;

            const countsByDay = new Map<string, { incoming: number; outgoing: number }>();
            for (const call of data ?? []) {
                const dateValue = call.called_at ?? call.created_at;
                if (!dateValue) continue;

                const dateKey = dateValue.split("T")[0];
                const dayCounts = countsByDay.get(dateKey) ?? { incoming: 0, outgoing: 0 };

                if (call.direction === "inbound") {
                    dayCounts.incoming += 1;
                } else if (call.direction === "outbound") {
                    dayCounts.outgoing += 1;
                }

                countsByDay.set(dateKey, dayCounts);
            }

            return buildCallsTrendPoints(period, countsByDay);
        },
        enabled: !!branchId,
        placeholderData: keepPreviousData,
    });
}

// =========================
// UTM Analytics
// =========================

export interface UtmAnalyticsItem {
    utm_source: string;
    count: number;
    percentage: number;
}

export function useUtmAnalytics(pipelineId?: string, dateRange?: DashboardDateRange) {
    const supabase = createClient();

    return useQuery({
        queryKey: ["utm-analytics", pipelineId, dateRange?.startDate, dateRange?.endDate],
        queryFn: async () => {
            // Fetch all leads with utm field for the pipeline
            let query = supabase
                .from("leads")
                .select("utm");

            if (pipelineId) {
                query = query.eq("pipeline_id", pipelineId);
            }

            query = applyDateRange(query, dateRange);

            const { data, error } = await query;
            if (error) throw error;
            if (!data?.length) return [];

            // Group by UTM source
            const utmMap: Record<string, number> = {};
            data.forEach((lead: { utm: string | null }) => {
                const source = (lead.utm || "").trim();
                if (!source) {
                    utmMap["Noma'lum"] = (utmMap["Noma'lum"] || 0) + 1;
                } else {
                    // Normalize: capitalize first letter
                    const normalized = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
                    utmMap[normalized] = (utmMap[normalized] || 0) + 1;
                }
            });

            const total = data.length;
            const result: UtmAnalyticsItem[] = Object.entries(utmMap)
                .map(([utm_source, count]) => ({
                    utm_source,
                    count,
                    percentage: total > 0 ? (count / total) * 100 : 0,
                }))
                .sort((a, b) => b.count - a.count);

            return result;
        },
        enabled: !!pipelineId,
    });
}

// =========================
// Lead Processing Time Analytics
// =========================

export interface LeadProcessingTimeStats {
    fastest_minutes: number;
    slowest_minutes: number;
    average_minutes: number;
    total_processed: number;
}

export interface EmployeeProcessingTime {
    employee_id: string;
    employee_name: string;
    fastest_minutes: number;
    slowest_minutes: number;
    average_minutes: number;
    total_leads: number;
}

interface LeadProcessingLead {
    created_at: string | null;
    updated_at: string | null;
    employee_id: string;
    stage_id: string;
    employee: {
        name: string | null;
    } | null;
}

interface ProcessedLead extends LeadProcessingLead {
    processing_minutes: number;
}

export function useLeadProcessingTime(pipelineId?: string, dateRange?: DashboardDateRange, excludedStageIds?: string[]) {
    const supabase = createClient();

    return useQuery({
        queryKey: ["lead-processing-time", pipelineId, dateRange?.startDate, dateRange?.endDate, excludedStageIds],
        queryFn: async () => {
            // Fetch leads with created_at, updated_at, and employee info
            let query = supabase
                .from("leads")
                .select("created_at, updated_at, employee_id, stage_id, employee:xodimlar(id, name)")
                .not("employee_id", "is", null);

            if (pipelineId) {
                query = query.eq("pipeline_id", pipelineId);
            }

            query = applyDateRange(query, dateRange);

            const { data, error } = await query;
            if (error) throw error;
            if (!data?.length) return { overall: null, employees: [] };

            // Supabase relation may come back as an array even for a single employee relation.
            const typedData: LeadProcessingLead[] = (data ?? []).map((lead) => {
                const employeeRecord = Array.isArray(lead.employee)
                    ? lead.employee[0] ?? null
                    : lead.employee ?? null;

                return {
                    created_at: lead.created_at,
                    updated_at: lead.updated_at,
                    employee_id: lead.employee_id,
                    stage_id: lead.stage_id,
                    employee: employeeRecord
                        ? { name: employeeRecord.name ?? null }
                        : null,
                };
            });

            // Ignore qilingan stage'lardagi lidlarni filter qilamiz
            const filteredData = excludedStageIds && excludedStageIds.length > 0
                ? typedData.filter((lead) => !excludedStageIds.includes(lead.stage_id))
                : typedData;

            if (!filteredData.length) return { overall: null, employees: [] };

            // Calculate processing times (updated_at - created_at in minutes)
            const processedLeads: ProcessedLead[] = filteredData
                .filter((lead): lead is LeadProcessingLead & { created_at: string } => Boolean(lead.created_at))
                .map((lead) => {
                    const created = new Date(lead.created_at).getTime();
                    const updated = lead.updated_at ? new Date(lead.updated_at).getTime() : created;
                    const diffMinutes = Math.max(0, (updated - created) / (1000 * 60));
                    return {
                        ...lead,
                        processing_minutes: diffMinutes,
                    };
                });

            if (processedLeads.length === 0) return { overall: null, employees: [] };

            // Overall stats
            const allTimes = processedLeads.map((lead) => lead.processing_minutes);
            const overall: LeadProcessingTimeStats = {
                fastest_minutes: Math.min(...allTimes),
                slowest_minutes: Math.max(...allTimes),
                average_minutes: allTimes.reduce((a: number, b: number) => a + b, 0) / allTimes.length,
                total_processed: processedLeads.length,
            };

            // Per-employee stats
            const employeeMap: Record<string, { name: string; times: number[] }> = {};
            processedLeads.forEach((lead) => {
                const empId = lead.employee_id;
                const empName = lead.employee?.name || "Noma'lum";
                if (!employeeMap[empId]) {
                    employeeMap[empId] = { name: empName, times: [] };
                }
                employeeMap[empId].times.push(lead.processing_minutes);
            });

            const employees: EmployeeProcessingTime[] = Object.entries(employeeMap)
                .map(([empId, data]) => ({
                    employee_id: empId,
                    employee_name: data.name,
                    fastest_minutes: Math.min(...data.times),
                    slowest_minutes: Math.max(...data.times),
                    average_minutes: data.times.reduce((a, b) => a + b, 0) / data.times.length,
                    total_leads: data.times.length,
                }))
                .sort((a, b) => a.average_minutes - b.average_minutes); // Fastest first

            return { overall, employees };
        },
        enabled: !!pipelineId,
    });
}
