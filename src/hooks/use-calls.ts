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

// Calculate stats from calls
function calculateStats(calls: Call[]): CallStats {
    const answeredCalls = calls.filter((c) => c.answered === "1");
    const unansweredCalls = calls.filter((c) => c.answered === "0");
    const incoming = calls.filter((c) => c.direction === 0);
    const outgoing = calls.filter((c) => c.direction === 1);
    const incomingAnswered = incoming.filter((c) => c.answered === "1");
    const outgoingAnswered = outgoing.filter((c) => c.answered === "1");

    const totalDuration = answeredCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const incomingDuration = incomingAnswered.reduce((sum, c) => sum + (c.duration || 0), 0);
    const outgoingDuration = outgoingAnswered.reduce((sum, c) => sum + (c.duration || 0), 0);

    return {
        totalCalls: calls.length,
        answeredCalls: answeredCalls.length,
        unansweredCalls: unansweredCalls.length,
        totalDuration,
        avgDuration: answeredCalls.length > 0 ? Math.round(totalDuration / answeredCalls.length) : 0,
        incoming: {
            total: incoming.length,
            answered: incomingAnswered.length,
            unanswered: incoming.length - incomingAnswered.length,
            totalDuration: incomingDuration,
        },
        outgoing: {
            total: outgoing.length,
            answered: outgoingAnswered.length,
            unanswered: outgoing.length - outgoingAnswered.length,
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
            let query = supabase.from("calls").select("*");

            if (filter.startDate) {
                query = query.gte("created_at", filter.startDate);
            }
            if (filter.endDate) {
                // Add one day to include the end date fully
                const endDate = new Date(filter.endDate);
                endDate.setDate(endDate.getDate() + 1);
                query = query.lt("created_at", endDate.toISOString());
            }

            if (filter.employeeId) {
                // Filter by specific employee using their user_id
                const selectedEmp = employees.find(e => e.id === filter.employeeId);
                if (selectedEmp?.user_id) {
                    query = query.eq("user_id", selectedEmp.user_id);
                } else {
                    query = query.eq("user_id", filter.employeeId);
                }
            } else if (employees.length > 0) {
                // Filter by all employees in the branch using their user_ids
                const allUserIds = employees
                    .map(e => e.user_id)
                    .filter(Boolean) as string[];
                if (allUserIds.length > 0) {
                    query = query.in("user_id", allUserIds);
                }
            }

            const { data, error } = await query;
            if (error) throw error;

            return calculateStats(data as Call[]);
        },
        enabled: employees.length > 0,
    });
}

// Get stats by each employee
export function useCallsStatsByEmployee(filter: CallsFilter, employees: Employee[]) {
    return useQuery({
        queryKey: [...callsKeys.byEmployee(filter), employees.map(e => e.user_id).join(",")],
        queryFn: async () => {
            const supabase = createClient();
            let query = supabase.from("calls").select("*");

            if (filter.startDate) {
                query = query.gte("created_at", filter.startDate);
            }
            if (filter.endDate) {
                const endDate = new Date(filter.endDate);
                endDate.setDate(endDate.getDate() + 1);
                query = query.lt("created_at", endDate.toISOString());
            }

            // Get calls for all managers using their user_ids
            const userIds = employees.map(e => e.user_id).filter(Boolean) as string[];
            if (userIds.length > 0) {
                query = query.in("user_id", userIds);
            }

            const { data, error } = await query;
            if (error) throw error;

            const calls = data as Call[];

            // Group by employee using user_id
            const statsByEmployee: EmployeeCallStats[] = employees.map((emp) => {
                const empCalls = calls.filter((c) => c.user_id === emp.user_id);
                const stats = calculateStats(empCalls);
                return {
                    ...stats,
                    employeeId: emp.id,
                    employeeName: emp.name,
                    userId: emp.user_id || "",
                };
            });

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

