"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Types
export interface Call {
    id: string;
    phone: string;
    direction: number; // 1 = outgoing, 0 = incoming
    duration: number; // seconds
    created_at: string;
    user_id: string;
    answered: string; // "1" = answered, "0" = not answered
    record_url?: string; // URL to call recording
}

export interface Employee {
    id: string;
    name: string;
    role: string;
    user_id?: string; // This is what links to calls.user_id
    employee_id?: string;
    branch_id?: string;
}

export interface CallsFilter {
    startDate?: string;
    endDate?: string;
    employeeId?: string | null;
}

export interface CallStats {
    totalCalls: number;
    answeredCalls: number;
    unansweredCalls: number;
    totalDuration: number; // seconds
    avgDuration: number; // seconds
    incoming: {
        total: number;
        answered: number;
        unanswered: number;
        totalDuration: number;
    };
    outgoing: {
        total: number;
        answered: number;
        unanswered: number;
        totalDuration: number;
    };
}

export interface EmployeeCallStats extends CallStats {
    employeeId: string;
    employeeName: string;
    userId: string; // user_id for direct query
}

// Query keys
export const callsKeys = {
    all: ["calls"] as const,
    stats: (filter: CallsFilter) => [...callsKeys.all, "stats", filter] as const,
    byEmployee: (filter: CallsFilter) => [...callsKeys.all, "byEmployee", filter] as const,
    employees: ["callsEmployees"] as const,
};

// Get managers for filter dropdown - filtered by branch
export function useCallsEmployees(branchId: string | null) {
    return useQuery({
        queryKey: [...callsKeys.employees, branchId],
        queryFn: async () => {
            const supabase = createClient();
            let query = supabase
                .from("xodimlar")
                .select("id, name, role, user_id, employee_id, branch_id")
                .eq("role", "manager")
                .order("name");

            if (branchId) {
                query = query.eq("branch_id", branchId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Employee[];
        },
        enabled: !!branchId,
    });
}

// Count-based stats helper — har bir xodim uchun faqat count va duration olinadi, row emas!
// Bu Supabase 1000 row limitini chetlab o'tadi
async function fetchCountStats(
    supabase: ReturnType<typeof createClient>,
    baseFilters: { startDate?: string; endDate?: string; endDateIso?: string },
    userId: string
): Promise<CallStats> {
    const applyDateFilter = (q: any) => {
        if (baseFilters.startDate) q = q.gte("created_at", baseFilters.startDate);
        if (baseFilters.endDateIso) q = q.lt("created_at", baseFilters.endDateIso);
        return q;
    };

    // Barcha countlarni parallel olamiz
    const [totalRes, answeredRes, unansweredRes, inTotalRes, inAnsweredRes, outTotalRes, outAnsweredRes] =
        await Promise.all([
            // Jami
            applyDateFilter(supabase.from("calls").select("*", { count: "exact", head: true }).eq("user_id", userId)),
            // Javob berilgan
            applyDateFilter(supabase.from("calls").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("answered", "1")),
            // Javob berilmagan
            applyDateFilter(supabase.from("calls").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("answered", "0")),
            // Kiruvchi jami
            applyDateFilter(supabase.from("calls").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("direction", 0)),
            // Kiruvchi javob berilgan
            applyDateFilter(supabase.from("calls").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("direction", 0).eq("answered", "1")),
            // Chiquvchi jami
            applyDateFilter(supabase.from("calls").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("direction", 1)),
            // Chiquvchi javob berilgan
            applyDateFilter(supabase.from("calls").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("direction", 1).eq("answered", "1")),
        ]);

    const totalCalls = totalRes.count || 0;
    const answeredCalls = answeredRes.count || 0;
    const unansweredCalls = unansweredRes.count || 0;
    const inTotal = inTotalRes.count || 0;
    const inAnswered = inAnsweredRes.count || 0;
    const outTotal = outTotalRes.count || 0;
    const outAnswered = outAnsweredRes.count || 0;

    // Duration uchun faqat answered calllarning duration ustunini olamiz
    // (row kam — faqat javob berilganlar, va faqat duration ustuni)
    let totalDuration = 0;
    let incomingDuration = 0;
    let outgoingDuration = 0;

    if (answeredCalls > 0) {
        // Umumiy duration
        let durQuery = applyDateFilter(
            supabase.from("calls").select("duration").eq("user_id", userId).eq("answered", "1")
        );
        const { data: durData } = await durQuery;
        totalDuration = (durData || []).reduce((sum: number, c: { duration: number }) => sum + (c.duration || 0), 0);

        // Kiruvchi duration
        if (inAnswered > 0) {
            let inDurQuery = applyDateFilter(
                supabase.from("calls").select("duration").eq("user_id", userId).eq("answered", "1").eq("direction", 0)
            );
            const { data: inDurData } = await inDurQuery;
            incomingDuration = (inDurData || []).reduce((sum: number, c: { duration: number }) => sum + (c.duration || 0), 0);
        }

        // Chiquvchi duration
        if (outAnswered > 0) {
            let outDurQuery = applyDateFilter(
                supabase.from("calls").select("duration").eq("user_id", userId).eq("answered", "1").eq("direction", 1)
            );
            const { data: outDurData } = await outDurQuery;
            outgoingDuration = (outDurData || []).reduce((sum: number, c: { duration: number }) => sum + (c.duration || 0), 0);
        }
    }

    return {
        totalCalls,
        answeredCalls,
        unansweredCalls,
        totalDuration,
        avgDuration: answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0,
        incoming: {
            total: inTotal,
            answered: inAnswered,
            unanswered: inTotal - inAnswered,
            totalDuration: incomingDuration,
        },
        outgoing: {
            total: outTotal,
            answered: outAnswered,
            unanswered: outTotal - outAnswered,
            totalDuration: outgoingDuration,
        },
    };
}

// Get overall call stats - filtered by branch employees
export function useCallsStats(filter: CallsFilter, employees: Employee[] = []) {
    return useQuery({
        queryKey: [...callsKeys.stats(filter), employees.length],
        queryFn: async () => {
            const supabase = createClient();

            let endDateIso: string | undefined;
            if (filter.endDate) {
                const endDate = new Date(filter.endDate);
                endDate.setDate(endDate.getDate() + 1);
                endDateIso = endDate.toISOString();
            }

            const baseFilters = { startDate: filter.startDate, endDate: filter.endDate, endDateIso };

            if (filter.employeeId) {
                const selectedEmp = employees.find(e => e.id === filter.employeeId);
                const userId = selectedEmp?.user_id || filter.employeeId;
                return fetchCountStats(supabase, baseFilters, userId);
            }

            // Barcha xodimlar uchun count olamiz va yig'amiz
            const userIds = employees.map(e => e.user_id).filter(Boolean) as string[];
            if (userIds.length === 0) {
                return {
                    totalCalls: 0, answeredCalls: 0, unansweredCalls: 0,
                    totalDuration: 0, avgDuration: 0,
                    incoming: { total: 0, answered: 0, unanswered: 0, totalDuration: 0 },
                    outgoing: { total: 0, answered: 0, unanswered: 0, totalDuration: 0 },
                } as CallStats;
            }

            const allStats = await Promise.all(
                userIds.map(uid => fetchCountStats(supabase, baseFilters, uid))
            );

            // Yig'amiz
            const combined: CallStats = {
                totalCalls: 0, answeredCalls: 0, unansweredCalls: 0,
                totalDuration: 0, avgDuration: 0,
                incoming: { total: 0, answered: 0, unanswered: 0, totalDuration: 0 },
                outgoing: { total: 0, answered: 0, unanswered: 0, totalDuration: 0 },
            };

            allStats.forEach(s => {
                combined.totalCalls += s.totalCalls;
                combined.answeredCalls += s.answeredCalls;
                combined.unansweredCalls += s.unansweredCalls;
                combined.totalDuration += s.totalDuration;
                combined.incoming.total += s.incoming.total;
                combined.incoming.answered += s.incoming.answered;
                combined.incoming.unanswered += s.incoming.unanswered;
                combined.incoming.totalDuration += s.incoming.totalDuration;
                combined.outgoing.total += s.outgoing.total;
                combined.outgoing.answered += s.outgoing.answered;
                combined.outgoing.unanswered += s.outgoing.unanswered;
                combined.outgoing.totalDuration += s.outgoing.totalDuration;
            });

            combined.avgDuration = combined.answeredCalls > 0
                ? Math.round(combined.totalDuration / combined.answeredCalls)
                : 0;

            return combined;
        },
        enabled: employees.length > 0,
    });
}

// Get stats by each employee — count bilan, row emas!
export function useCallsStatsByEmployee(filter: CallsFilter, employees: Employee[]) {
    return useQuery({
        queryKey: [...callsKeys.byEmployee(filter), employees.map(e => e.user_id).join(",")],
        queryFn: async () => {
            const supabase = createClient();

            let endDateIso: string | undefined;
            if (filter.endDate) {
                const endDate = new Date(filter.endDate);
                endDate.setDate(endDate.getDate() + 1);
                endDateIso = endDate.toISOString();
            }

            const baseFilters = { startDate: filter.startDate, endDate: filter.endDate, endDateIso };

            // Har bir xodim uchun parallel count olamiz
            const statsByEmployee: EmployeeCallStats[] = await Promise.all(
                employees.map(async (emp) => {
                    if (!emp.user_id) {
                        return {
                            totalCalls: 0, answeredCalls: 0, unansweredCalls: 0,
                            totalDuration: 0, avgDuration: 0,
                            incoming: { total: 0, answered: 0, unanswered: 0, totalDuration: 0 },
                            outgoing: { total: 0, answered: 0, unanswered: 0, totalDuration: 0 },
                            employeeId: emp.id,
                            employeeName: emp.name,
                            userId: "",
                        };
                    }

                    const stats = await fetchCountStats(supabase, baseFilters, emp.user_id);
                    return {
                        ...stats,
                        employeeId: emp.id,
                        employeeName: emp.name,
                        userId: emp.user_id,
                    };
                })
            );

            // Sort by total calls descending
            return statsByEmployee.sort((a, b) => b.totalCalls - a.totalCalls);
        },
        enabled: employees.length > 0,
    });
}

// Get raw calls data for export
export function useCallsExport(filter: CallsFilter) {
    return useQuery({
        queryKey: [...callsKeys.all, "export", filter],
        queryFn: async () => {
            const supabase = createClient();
            let query = supabase
                .from("calls")
                .select("*")
                .order("created_at", { ascending: false });

            if (filter.startDate) {
                query = query.gte("created_at", filter.startDate);
            }
            if (filter.endDate) {
                const endDate = new Date(filter.endDate);
                endDate.setDate(endDate.getDate() + 1);
                query = query.lt("created_at", endDate.toISOString());
            }
            if (filter.employeeId) {
                query = query.eq("user_id", filter.employeeId);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data as Call[];
        },
        enabled: false, // Only fetch when export is triggered
    });
}

// Helper function to format duration
export function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `00:${seconds.toString().padStart(2, "0")}`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const mm = minutes.toString().padStart(2, "0");
    const ss = secs.toString().padStart(2, "0");

    if (hours > 0) {
        const hh = hours.toString().padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
}

// Helper function to format duration for display
export function formatDurationLong(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} soat`);
    if (minutes > 0) parts.push(`${minutes} daqiqa`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} sekund`);

    return parts.join(" ");
}

// Get call recordings for listening with pagination
export interface CallRecordingsFilter {
    startDate: string;
    endDate: string;
    userId: string | null; // Direct user_id for faster query
    page: number;
    pageSize: number;
}

export interface CallRecordingsResult {
    data: Call[];
    totalCount: number;
}

export function useCallRecordings(filter: CallRecordingsFilter) {
    return useQuery({
        queryKey: ["callRecordings", filter],
        queryFn: async (): Promise<CallRecordingsResult> => {
            const supabase = createClient();

            // Build base query for filtering
            let countQuery = supabase
                .from("calls")
                .select("*", { count: "exact", head: true });

            let dataQuery = supabase
                .from("calls")
                .select("*")
                .order("created_at", { ascending: false });

            // Apply filters to both queries
            if (filter.startDate) {
                countQuery = countQuery.gte("created_at", filter.startDate);
                dataQuery = dataQuery.gte("created_at", filter.startDate);
            }
            if (filter.endDate) {
                const endDate = new Date(filter.endDate);
                endDate.setDate(endDate.getDate() + 1);
                const endDateStr = endDate.toISOString();
                countQuery = countQuery.lt("created_at", endDateStr);
                dataQuery = dataQuery.lt("created_at", endDateStr);
            }

            if (filter.userId) {
                countQuery = countQuery.eq("user_id", filter.userId);
                dataQuery = dataQuery.eq("user_id", filter.userId);
            }

            // Only get calls with recordings
            countQuery = countQuery.not("record_url", "is", null);
            dataQuery = dataQuery.not("record_url", "is", null);

            // Apply pagination
            const from = (filter.page - 1) * filter.pageSize;
            const to = from + filter.pageSize - 1;
            dataQuery = dataQuery.range(from, to);

            // Execute both queries
            const [countResult, dataResult] = await Promise.all([
                countQuery,
                dataQuery
            ]);

            if (countResult.error) throw countResult.error;
            if (dataResult.error) throw dataResult.error;

            return {
                data: dataResult.data as Call[],
                totalCount: countResult.count || 0
            };
        },
        enabled: !!filter.userId,
    });
}

