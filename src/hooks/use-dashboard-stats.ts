"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Dashboard statistikasi turlarini belgilaymiz
export interface DashboardStats {
    // Leads statistikasi (pipeline bo'yicha)
    total_leads: number;
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

const dashboardKeys = {
    all: ["dashboard-stats"] as const,
    stats: (pipelineId?: string) => [...dashboardKeys.all, "stats", pipelineId] as const,
    leadsByStage: (pipelineId?: string) =>
        [...dashboardKeys.all, "leads-by-stage", pipelineId] as const,
    employeeConversion: (pipelineId?: string) =>
        [...dashboardKeys.all, "employee-conversion", pipelineId] as const,
    leadsTrend: (period: "day" | "week" | "month" | "year", pipelineId?: string) =>
        [...dashboardKeys.all, "leads-trend", period, pipelineId] as const,
};

// Asosiy dashboard statistikasi (pipeline bo'yicha)
export function useDashboardStats(pipelineId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: dashboardKeys.stats(pipelineId),
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

            // Leads statistikasi (pipeline bo'yicha filter)
            let totalLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true });
            let todayLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString());
            let weekLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString());
            let monthLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString());
            let yearLeadsQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", yearAgo.toISOString());

            // Updated_at bo'yicha (pipeline bo'yicha)
            let updatedTodayQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("updated_at", today.toISOString());
            let updatedWeekQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("updated_at", weekAgo.toISOString());
            let updatedMonthQuery = supabase.from("leads").select("*", { count: "exact", head: true }).gte("updated_at", monthAgo.toISOString());

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

            // Tasks statistikasi (boolean status va date bo'yicha)
            const { data: allTasks } = await supabase.from("tasks").select("status, date");

            let total_tasks = 0;
            let completed_tasks = 0;
            let pending_tasks = 0;
            let overdue_tasks = 0;
            let today_tasks = 0;
            let upcoming_tasks = 0;

            (allTasks || []).forEach((task) => {
                total_tasks++;

                // Status bo'yicha (boolean)
                if (task.status === true) {
                    completed_tasks++;
                } else {
                    pending_tasks++;
                }

                // Date bo'yicha
                if (task.date) {
                    const taskDate = new Date(task.date);
                    taskDate.setHours(0, 0, 0, 0);

                    if (taskDate < today) {
                        overdue_tasks++;
                    } else if (taskDate.getTime() === today.getTime()) {
                        today_tasks++;
                    } else if (taskDate <= threeDaysLater) {
                        upcoming_tasks++;
                    }
                }
            });

            // Qo'ng'iroqlar
            const { count: total_calls } = await supabase
                .from("calls")
                .select("*", { count: "exact", head: true });

            const { count: calls_today } = await supabase
                .from("calls")
                .select("*", { count: "exact", head: true })
                .gte("created_at", today.toISOString());

            const { count: calls_week } = await supabase
                .from("calls")
                .select("*", { count: "exact", head: true })
                .gte("created_at", weekAgo.toISOString());

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

            return {
                total_leads: total_leads || 0,
                leads_today: leads_today || 0,
                leads_week: leads_week || 0,
                leads_month: leads_month || 0,
                leads_year: leads_year || 0,
                updated_today: updated_today || 0,
                updated_week: updated_week || 0,
                updated_month: updated_month || 0,
                total_tasks,
                completed_tasks,
                pending_tasks,
                overdue_tasks,
                today_tasks,
                upcoming_tasks,
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
            let query = supabase.from("leads").select("stage_id, stages(name)");

            if (pipelineId) query = query.eq("pipeline_id", pipelineId);

            const { data, error } = await query;
            if (error) throw error;

            const total = data?.length || 0;
            const grouped = (data || []).reduce((acc: any, lead: any) => {
                const stageId = lead.stage_id;
                const stageName = lead.stages?.name || "Unknown";

                if (!acc[stageId]) {
                    acc[stageId] = {
                        stage_id: stageId,
                        stage_name: stageName,
                        count: 0,
                    };
                }
                acc[stageId].count++;
                return acc;
            }, {});

            return Object.values(grouped).map((item: any) => ({
                ...item,
                percentage: total > 0 ? (item.count / total) * 100 : 0,
            })) as LeadsByStage[];
        },
    });
}

// Xodimlar konversiyasi (branch bo'yicha)
export function useEmployeeConversion(branchId: string | null, conversionStageId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ["employee-conversion", branchId, conversionStageId],
        queryFn: async () => {
            if (!branchId) return [];

            // 1. Branchdagi barcha xodimlarni olamiz
            const { data: employees, error: empError } = await supabase
                .from("xodimlar")
                .select("id, name")
                .eq("branch_id", branchId);

            if (empError) throw empError;
            if (!employees?.length) return [];

            const employeeIds = employees.map(e => e.id);
            const employeeMap = new Map(employees.map(e => [e.id, e.name]));

            // 2. Shu xodimlarga tegishli lidlarni olamiz
            const { data: leads, error: leadsError } = await supabase
                .from("leads")
                .select("employee_id, stage_id")
                .in("employee_id", employeeIds);

            if (leadsError) throw leadsError;

            // 3. Statistikani hisoblaymiz
            const stats = employeeIds.map(id => ({
                employee_id: id,
                employee_name: employeeMap.get(id) || "Unknown",
                total_leads: 0,
                converted_leads: 0,
                conversion_rate: 0
            }));

            const statsMap = new Map(stats.map(s => [s.employee_id, s]));

            (leads || []).forEach(lead => {
                const stat = statsMap.get(lead.employee_id);
                if (stat) {
                    stat.total_leads++;
                    if (conversionStageId && lead.stage_id === conversionStageId) {
                        stat.converted_leads++;
                    }
                }
            });

            // Foizlarni hisoblash va saralash
            return stats.map(stat => ({
                ...stat,
                conversion_rate: stat.total_leads > 0
                    ? (stat.converted_leads / stat.total_leads) * 100
                    : 0
            })).sort((a, b) => b.total_leads - a.total_leads);
        },
        enabled: !!branchId,
    });
}

// Eng ko'p qo'ng'iroq qilgan xodimlar (branch bo'yicha)
export interface TopCaller {
    employee_id: string;
    employee_name: string;
    call_count: number;
}

export function useTopCallers(branchId: string | null) {
    const supabase = createClient();

    return useQuery({
        queryKey: ["top-callers", branchId],
        queryFn: async () => {
            if (!branchId) return [];

            // 1. Branchdagi xodimlarni olamiz (user_id kerak calls uchun)
            // xodimlar jadvalida employee_id (auth id) bor deb faraz qilamiz (use-employee.ts asosida)
            const { data: employees, error: empError } = await supabase
                .from("xodimlar")
                .select("id, name, employee_id")
                .eq("branch_id", branchId)
                .not("employee_id", "is", null);

            if (empError) throw empError;
            if (!employees?.length) return [];

            // user_id -> name map
            const userMap = new Map(employees.map(e => [e.employee_id, e.name]));
            const userIds = employees.map(e => e.employee_id);

            // 2. Calls jadvalidan shu userlarning qo'ng'iroqlarini olamiz
            const { data: calls, error: callsError } = await supabase
                .from("calls")
                .select("user_id") // user_id bo'yicha guruhlaymiz
                .in("user_id", userIds);

            if (callsError) throw callsError;

            // 3. Guruhlash
            const counts: { [key: string]: number } = {};
            (calls || []).forEach(call => {
                if (call.user_id) {
                    counts[call.user_id] = (counts[call.user_id] || 0) + 1;
                }
            });

            // 4. Formatlash
            return Object.entries(counts)
                .map(([userId, count]) => ({
                    employee_id: userId,
                    employee_name: userMap.get(userId) || "Unknown",
                    call_count: count
                }))
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

            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - days);

            let query = supabase
                .from("leads")
                .select("created_at")
                .gte("created_at", startDate.toISOString());

            if (pipelineId) query = query.eq("pipeline_id", pipelineId);

            const { data, error } = await query;
            if (error) throw error;

            const grouped: { [key: string]: number } = {};

            (data || []).forEach((lead) => {
                const date = new Date(lead.created_at);
                const dateKey = date.toISOString().split("T")[0];
                grouped[dateKey] = (grouped[dateKey] || 0) + 1;
            });

            const result: LeadsTrend[] = [];
            for (let i = 0; i < days; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - (days - 1 - i));
                const dateKey = date.toISOString().split("T")[0];

                result.push({
                    date: dateKey,
                    count: grouped[dateKey] || 0,
                    label: date.toLocaleDateString("ru-RU", format),
                });
            }

            return result;
        },
    });
}
