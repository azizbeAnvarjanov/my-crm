"use client";

import { useQuery } from "@tanstack/react-query";
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

// Sana filtri turi
export interface DashboardDateRange {
    startDate: string; // ISO string yoki YYYY-MM-DD
    endDate: string;   // ISO string yoki YYYY-MM-DD
}

const dashboardKeys = {
    all: ["dashboard-stats"] as const,
    stats: (pipelineId?: string, dateRange?: DashboardDateRange) => [...dashboardKeys.all, "stats", pipelineId, dateRange?.startDate, dateRange?.endDate] as const,
    leadsByStage: (pipelineId?: string) =>
        [...dashboardKeys.all, "leads-by-stage", pipelineId] as const,
    employeeConversion: (pipelineId?: string) =>
        [...dashboardKeys.all, "employee-conversion", pipelineId] as const,
    leadsTrend: (period: "day" | "week" | "month" | "year", pipelineId?: string) =>
        [...dashboardKeys.all, "leads-trend", period, pipelineId] as const,
};

// Sana filtri qo'llash helper
function applyDateRange(query: any, dateRange?: DashboardDateRange, dateField = "created_at") {
    if (!dateRange) return query;
    query = query.gte(dateField, `${dateRange.startDate}T00:00:00.000Z`);
    query = query.lte(dateField, `${dateRange.endDate}T23:59:59.999Z`);
    return query;
}

// Asosiy dashboard statistikasi (pipeline + sana filtri bo'yicha)
export function useDashboardStats(pipelineId?: string, dateRange?: DashboardDateRange) {
    const supabase = createClient();

    return useQuery({
        queryKey: dashboardKeys.stats(pipelineId, dateRange),
        queryFn: async () => {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            const threeDaysLater = new Date(today);
            threeDaysLater.setDate(threeDaysLater.getDate() + 3);

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

            const { count: total_tasks } = await totalTasksQ;
            const { count: completed_tasks } = await completedTasksQ;
            const { count: pending_tasks } = await pendingTasksQ;
            const { count: overdue_tasks } = await overdueTasksQ;
            const { count: today_tasks } = await todayTasksQ;
            const { count: upcoming_tasks } = await upcomingTasksQ;

            // Qo'ng'iroqlar (dateRange bilan)
            let totalCallsQ = supabase.from("calls").select("*", { count: "exact", head: true });
            let callsTodayQ = supabase.from("calls").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString());
            let callsWeekQ = supabase.from("calls").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString());

            if (dateRange) {
                totalCallsQ = applyDateRange(totalCallsQ, dateRange);
                callsTodayQ = applyDateRange(callsTodayQ, dateRange);
                callsWeekQ = applyDateRange(callsWeekQ, dateRange);
            }

            const { count: total_calls } = await totalCallsQ;
            const { count: calls_today } = await callsTodayQ;
            const { count: calls_week } = await callsWeekQ;

            const [
                { count: total_leads },
                { count: leads_today },
                { count: leads_week },
                { count: leads_month },
                { count: leads_year },
                { count: updated_today },
                { count: updated_week },
                { count: updated_month },
            ] = await Promise.all([
                totalLeadsQuery,
                todayLeadsQuery,
                weekLeadsQuery,
                monthLeadsQuery,
                yearLeadsQuery,
                updatedTodayQuery,
                updatedWeekQuery,
                updatedMonthQuery,
            ]);

            // Biriktirilmagan lidlar (employee_id = null, pipeline bo'yicha)
            let unassignedQuery = supabase.from("leads").select("*", { count: "exact", head: true }).is("employee_id", null);
            if (pipelineId) {
                unassignedQuery = unassignedQuery.eq("pipeline_id", pipelineId);
            }
            const { count: unassigned_leads } = await unassignedQuery;

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
    });
}

// Stage bo'yicha lidlar (pipeline bo'yicha)
export function useLeadsByStage(pipelineId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: dashboardKeys.leadsByStage(pipelineId),
        queryFn: async () => {
            // 1. Avval pipelinedagi stage'larni olamiz
            let stagesQuery = supabase.from("stages").select("id, name");
            if (pipelineId) stagesQuery = stagesQuery.eq("pipeline_id", pipelineId);

            const { data: stages, error: stagesError } = await stagesQuery;
            if (stagesError) throw stagesError;
            if (!stages?.length) return [];

            // 2. Har bir stage uchun count olamiz (row emas!)
            const results = await Promise.all(
                stages.map(async (stage) => {
                    let countQuery = supabase
                        .from("leads")
                        .select("*", { count: "exact", head: true })
                        .eq("stage_id", stage.id);
                    if (pipelineId) countQuery = countQuery.eq("pipeline_id", pipelineId);

                    const { count } = await countQuery;
                    return {
                        stage_id: stage.id,
                        stage_name: stage.name,
                        count: count || 0,
                    };
                })
            );

            const total = results.reduce((sum, r) => sum + r.count, 0);

            return results.map(item => ({
                ...item,
                percentage: total > 0 ? (item.count / total) * 100 : 0,
            })) as LeadsByStage[];
        },
    });
}

// Xodimlar konversiyasi (barcha xodimlar)
export function useEmployeeConversion(conversionStageId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ["employee-conversion", conversionStageId],
        queryFn: async () => {
            // 1. Barcha xodimlarni olamiz
            const { data: employees, error: empError } = await supabase
                .from("xodimlar")
                .select("id, name");

            if (empError) throw empError;
            if (!employees?.length) return [];

            // 2. Har bir xodim uchun total_leads va converted_leads count olamiz (row emas!)
            const results = await Promise.all(
                employees.map(async (emp) => {
                    // Jami lidlar
                    const { count: total_leads } = await supabase
                        .from("leads")
                        .select("*", { count: "exact", head: true })
                        .eq("employee_id", emp.id);

                    // Konversiya qilingan lidlar
                    let converted_leads = 0;
                    if (conversionStageId) {
                        const { count } = await supabase
                            .from("leads")
                            .select("*", { count: "exact", head: true })
                            .eq("employee_id", emp.id)
                            .eq("stage_id", conversionStageId);
                        converted_leads = count || 0;
                    }

                    const totalCount = total_leads || 0;
                    return {
                        employee_id: emp.id,
                        employee_name: emp.name,
                        total_leads: totalCount,
                        converted_leads,
                        conversion_rate: totalCount > 0
                            ? (converted_leads / totalCount) * 100
                            : 0,
                    };
                })
            );

            return results.sort((a, b) => b.total_leads - a.total_leads);
        },
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

            // 1. Branchdagi xodimlarni olamiz
            const { data: employees, error: empError } = await supabase
                .from("xodimlar")
                .select("id, name, employee_id, user_id")
                .eq("branch_id", branchId)
                .not("employee_id", "is", null);

            if (empError) throw empError;
            if (!employees?.length) return [];

            // 2. Har bir xodim uchun qo'ng'iroqlar sonini olamiz (dateRange bilan)
            const results: TopCaller[] = await Promise.all(
                employees.map(async (e) => {
                    let q = supabase
                        .from("calls")
                        .select("*", { count: "exact", head: true })
                        .eq("user_id", e.user_id);
                    q = applyDateRange(q, dateRange);

                    const { count } = await q;
                    return {
                        employee_id: e.user_id,
                        employee_name: e.name,
                        call_count: count || 0,
                    };
                })
            );

            // 3. Formatlash — faqat qo'ng'iroq qilganlarni ko'rsatamiz
            return results
                .filter(r => r.call_count > 0)
                .sort((a, b) => b.call_count - a.call_count)
                .slice(0, 5); // Top 5
        },
        enabled: !!branchId,
    });
}

// Leads trend (pipeline bo'yicha)
export function useLeadsTrend(period: "day" | "week" | "month" | "year", pipelineId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: dashboardKeys.leadsTrend(period, pipelineId),
        queryFn: async () => {
            const now = new Date();
            let days = 30;
            let format: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

            if (period === "day") {
                days = 7;
                format = { weekday: "short" };
            } else if (period === "week") {
                days = 12 * 7;
                format = { month: "short", day: "numeric" };
            } else if (period === "year") {
                days = 365;
                format = { month: "short" };
            }

            // Har bir kun uchun count olamiz (row emas!)
            const result: LeadsTrend[] = [];

            // Parallel so'rovlar — har bir kun uchun count
            const queries = [];
            for (let i = 0; i < days; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - (days - 1 - i));
                const dateKey = date.toISOString().split("T")[0];
                const dayStart = `${dateKey}T00:00:00.000Z`;
                const dayEnd = `${dateKey}T23:59:59.999Z`;

                queries.push({
                    date: dateKey,
                    label: date.toLocaleDateString("ru-RU", format),
                    queryFn: async () => {
                        let q = supabase
                            .from("leads")
                            .select("*", { count: "exact", head: true })
                            .gte("created_at", dayStart)
                            .lte("created_at", dayEnd);
                        if (pipelineId) q = q.eq("pipeline_id", pipelineId);
                        const { count } = await q;
                        return count || 0;
                    }
                });
            }

            // Parallel bajaramiz (lekin juda ko'p bo'lmasligi uchun batch qilamiz)
            const batchSize = 30;
            for (let i = 0; i < queries.length; i += batchSize) {
                const batch = queries.slice(i, i + batchSize);
                const counts = await Promise.all(batch.map(q => q.queryFn()));
                batch.forEach((q, idx) => {
                    result.push({
                        date: q.date,
                        count: counts[idx],
                        label: q.label,
                    });
                });
            }

            return result;
        },
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

            // Ignore qilingan stage'lardagi lidlarni filter qilamiz
            const filteredData = excludedStageIds && excludedStageIds.length > 0
                ? data.filter((lead: any) => !excludedStageIds.includes(lead.stage_id))
                : data;

            if (!filteredData.length) return { overall: null, employees: [] };

            // Calculate processing times (updated_at - created_at in minutes)
            const processedLeads = filteredData
                .filter((lead: any) => lead.created_at)
                .map((lead: any) => {
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
            const allTimes = processedLeads.map((l: any) => l.processing_minutes);
            const overall: LeadProcessingTimeStats = {
                fastest_minutes: Math.min(...allTimes),
                slowest_minutes: Math.max(...allTimes),
                average_minutes: allTimes.reduce((a: number, b: number) => a + b, 0) / allTimes.length,
                total_processed: processedLeads.length,
            };

            // Per-employee stats
            const employeeMap: Record<string, { name: string; times: number[] }> = {};
            processedLeads.forEach((lead: any) => {
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
