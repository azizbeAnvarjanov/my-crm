"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type RawCallRow = {
    id: string;
    uuid?: string | null;
    event?: string | null;
    direction?: string | null;
    caller?: string | null;
    callee?: string | null;
    operator_id?: string | null;
    answered?: boolean | null;
    call_duration?: number | null;
    dialog_duration?: number | null;
    hangup_cause?: string | null;
    download_url?: string | null;
    gateway?: string | null;
    domain?: string | null;
    called_at?: string | null;
    created_at?: string | null;
    phone?: string | null;
};

export interface Call {
    id: string;
    uuid: string;
    event: string;
    direction: "incoming" | "outgoing" | "unknown";
    caller: string | null;
    callee: string | null;
    operator_id: string | null;
    answered: boolean;
    duration: number;
    call_duration: number;
    dialog_duration: number;
    hangup_cause: string | null;
    record_url: string | null;
    download_url: string | null;
    gateway: string | null;
    domain: string | null;
    called_at: string;
    created_at: string;
    phone: string;
}

export interface Employee {
    id: string;
    name: string;
    role: string;
    user_id?: string;
    employee_id?: string;
    branch_id?: string;
}

export interface CallsFilter {
    startDate?: string;
    endDate?: string;
    employeeId?: string | null;
    participantIds?: string[];
}

export interface CallStats {
    totalCalls: number;
    answeredCalls: number;
    unansweredCalls: number;
    totalDuration: number;
    avgDuration: number;
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
    participantIds: string[];
}

type BaseFilters = {
    startDate?: string;
    endDateIso?: string;
};

type DateFilterQuery = {
    gte: (column: string, value: string) => unknown;
    lt: (column: string, value: string) => unknown;
};

type ParticipantFilterQuery = {
    or: (filters: string) => unknown;
};

const CALL_DATE_FIELD = "called_at";
const INBOUND_DIRECTION = "inbound";
const OUTBOUND_DIRECTION = "outbound";

const EMPTY_STATS: CallStats = {
    totalCalls: 0,
    answeredCalls: 0,
    unansweredCalls: 0,
    totalDuration: 0,
    avgDuration: 0,
    incoming: {
        total: 0,
        answered: 0,
        unanswered: 0,
        totalDuration: 0,
    },
    outgoing: {
        total: 0,
        answered: 0,
        unanswered: 0,
        totalDuration: 0,
    },
};

export const callsKeys = {
    all: ["calls"] as const,
    stats: (filter: CallsFilter) => [...callsKeys.all, "stats", filter] as const,
    byEmployee: (filter: CallsFilter) => [...callsKeys.all, "byEmployee", filter] as const,
    employees: ["callsEmployees"] as const,
};

export function getEmployeeParticipantIds(employee: Pick<Employee, "id" | "user_id" | "employee_id">): string[] {
    return Array.from(
        new Set(
            [employee.user_id, employee.employee_id, employee.id]
                .filter((value): value is string => Boolean(value))
                .map((value) => value.trim())
                .filter(Boolean)
        )
    );
}

function getNormalizedDirection(direction?: string | null): Call["direction"] {
    if (direction === INBOUND_DIRECTION) return "incoming";
    if (direction === OUTBOUND_DIRECTION) return "outgoing";
    return "unknown";
}

function getDisplayDuration(call: Pick<RawCallRow, "call_duration" | "dialog_duration">): number {
    const dialogDuration = Number(call.dialog_duration ?? 0);
    if (dialogDuration > 0) {
        return dialogDuration;
    }

    return Number(call.call_duration ?? 0);
}

export function normalizeCallRow(call: RawCallRow): Call {
    const direction = getNormalizedDirection(call.direction);
    const calledAt = call.called_at ?? call.created_at ?? "";
    const createdAt = call.created_at ?? call.called_at ?? "";
    const phone =
        call.phone ??
        (direction === "incoming" ? call.caller : call.callee) ??
        call.callee ??
        call.caller ??
        "";

    return {
        id: call.id,
        uuid: call.uuid ?? "",
        event: call.event ?? "",
        direction,
        caller: call.caller ?? null,
        callee: call.callee ?? null,
        operator_id: call.operator_id ?? null,
        answered: Boolean(call.answered),
        duration: getDisplayDuration(call),
        call_duration: Number(call.call_duration ?? 0),
        dialog_duration: Number(call.dialog_duration ?? 0),
        hangup_cause: call.hangup_cause ?? null,
        record_url: call.download_url ?? null,
        download_url: call.download_url ?? null,
        gateway: call.gateway ?? null,
        domain: call.domain ?? null,
        called_at: calledAt,
        created_at: createdAt,
        phone,
    };
}

function applyDateFilter<T>(query: T, baseFilters: BaseFilters): T {
    let nextQuery = query as T & DateFilterQuery;

    if (baseFilters.startDate) {
        nextQuery = nextQuery.gte(CALL_DATE_FIELD, baseFilters.startDate) as T & DateFilterQuery;
    }

    if (baseFilters.endDateIso) {
        nextQuery = nextQuery.lt(CALL_DATE_FIELD, baseFilters.endDateIso) as T & DateFilterQuery;
    }

    return nextQuery as T;
}

function applyParticipantFilter<T>(query: T, participantIds: string[]): T {
    if (participantIds.length === 0) {
        return query;
    }

    const filterableQuery = query as T & ParticipantFilterQuery;
    const filters = participantIds.flatMap((participantId) => [
        `caller.eq.${participantId}`,
        `callee.eq.${participantId}`,
    ]);

    return filterableQuery.or(filters.join(",")) as T;
}

function sumDurations(calls: Array<Pick<RawCallRow, "call_duration" | "dialog_duration">>) {
    return calls.reduce((sum, call) => sum + getDisplayDuration(call), 0);
}

function getDateRangeFilters(filter: Pick<CallsFilter | CallRecordingsFilter, "startDate" | "endDate">): BaseFilters {
    let endDateIso: string | undefined;

    if (filter.endDate) {
        const endDate = new Date(filter.endDate);
        endDate.setDate(endDate.getDate() + 1);
        endDateIso = endDate.toISOString();
    }

    return {
        startDate: filter.startDate,
        endDateIso,
    };
}

async function fetchCountStats(
    supabase: ReturnType<typeof createClient>,
    baseFilters: BaseFilters,
    participantIds: string[]
): Promise<CallStats> {
    if (participantIds.length === 0) {
        return { ...EMPTY_STATS };
    }

    const buildCountQuery = (direction?: string, answered?: boolean) => {
        let query = applyDateFilter(
            applyParticipantFilter(
                supabase.from("calls").select("*", { count: "exact", head: true }),
                participantIds
            ),
            baseFilters
        );

        if (direction) {
            query = query.eq("direction", direction);
        }

        if (typeof answered === "boolean") {
            query = query.eq("answered", answered);
        }

        return query;
    };

    const [
        totalRes,
        answeredRes,
        unansweredRes,
        incomingRes,
        incomingAnsweredRes,
        outgoingRes,
        outgoingAnsweredRes,
    ] = await Promise.all([
        buildCountQuery(),
        buildCountQuery(undefined, true),
        buildCountQuery(undefined, false),
        buildCountQuery(INBOUND_DIRECTION),
        buildCountQuery(INBOUND_DIRECTION, true),
        buildCountQuery(OUTBOUND_DIRECTION),
        buildCountQuery(OUTBOUND_DIRECTION, true),
    ]);

    const totalCalls = totalRes.count || 0;
    const answeredCalls = answeredRes.count || 0;
    const unansweredCalls = unansweredRes.count || 0;
    const incomingTotal = incomingRes.count || 0;
    const incomingAnswered = incomingAnsweredRes.count || 0;
    const outgoingTotal = outgoingRes.count || 0;
    const outgoingAnswered = outgoingAnsweredRes.count || 0;

    let totalDuration = 0;
    let incomingDuration = 0;
    let outgoingDuration = 0;

    if (answeredCalls > 0) {
        const totalDurationQuery = applyDateFilter(
            applyParticipantFilter(
                supabase
                    .from("calls")
                    .select("call_duration, dialog_duration")
                    .eq("answered", true),
                participantIds
            ),
            baseFilters
        );

        const { data: totalDurationRows } = await totalDurationQuery;
        totalDuration = sumDurations(totalDurationRows || []);

        if (incomingAnswered > 0) {
            const incomingDurationQuery = applyDateFilter(
                applyParticipantFilter(
                    supabase
                        .from("calls")
                        .select("call_duration, dialog_duration")
                        .eq("answered", true)
                        .eq("direction", INBOUND_DIRECTION),
                    participantIds
                ),
                baseFilters
            );

            const { data: incomingDurationRows } = await incomingDurationQuery;
            incomingDuration = sumDurations(incomingDurationRows || []);
        }

        if (outgoingAnswered > 0) {
            const outgoingDurationQuery = applyDateFilter(
                applyParticipantFilter(
                    supabase
                        .from("calls")
                        .select("call_duration, dialog_duration")
                        .eq("answered", true)
                        .eq("direction", OUTBOUND_DIRECTION),
                    participantIds
                ),
                baseFilters
            );

            const { data: outgoingDurationRows } = await outgoingDurationQuery;
            outgoingDuration = sumDurations(outgoingDurationRows || []);
        }
    }

    return {
        totalCalls,
        answeredCalls,
        unansweredCalls,
        totalDuration,
        avgDuration: answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0,
        incoming: {
            total: incomingTotal,
            answered: incomingAnswered,
            unanswered: incomingTotal - incomingAnswered,
            totalDuration: incomingDuration,
        },
        outgoing: {
            total: outgoingTotal,
            answered: outgoingAnswered,
            unanswered: outgoingTotal - outgoingAnswered,
            totalDuration: outgoingDuration,
        },
    };
}

export function useCallsEmployees(branchId: string | null) {
    return useQuery({
        queryKey: [...callsKeys.employees, branchId],
        queryFn: async () => {
            const supabase = createClient();
            let query = supabase
                .from("xodimlar")
                .select("id, name, role, user_id, employee_id, branch_id")
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

export function useCallsStats(filter: CallsFilter, employees: Employee[] = []) {
    return useQuery({
        queryKey: [...callsKeys.stats(filter), employees.length],
        queryFn: async () => {
            const supabase = createClient();
            const baseFilters = getDateRangeFilters(filter);

            if (filter.employeeId) {
                const selectedEmployee = employees.find((employee) => employee.id === filter.employeeId);
                const participantIds = selectedEmployee
                    ? getEmployeeParticipantIds(selectedEmployee)
                    : [filter.employeeId];

                return fetchCountStats(supabase, baseFilters, participantIds);
            }

            const allStats = await Promise.all(
                employees.map((employee) =>
                    fetchCountStats(supabase, baseFilters, getEmployeeParticipantIds(employee))
                )
            );

            const combined: CallStats = {
                ...EMPTY_STATS,
                incoming: { ...EMPTY_STATS.incoming },
                outgoing: { ...EMPTY_STATS.outgoing },
            };

            allStats.forEach((stats) => {
                combined.totalCalls += stats.totalCalls;
                combined.answeredCalls += stats.answeredCalls;
                combined.unansweredCalls += stats.unansweredCalls;
                combined.totalDuration += stats.totalDuration;
                combined.incoming.total += stats.incoming.total;
                combined.incoming.answered += stats.incoming.answered;
                combined.incoming.unanswered += stats.incoming.unanswered;
                combined.incoming.totalDuration += stats.incoming.totalDuration;
                combined.outgoing.total += stats.outgoing.total;
                combined.outgoing.answered += stats.outgoing.answered;
                combined.outgoing.unanswered += stats.outgoing.unanswered;
                combined.outgoing.totalDuration += stats.outgoing.totalDuration;
            });

            combined.avgDuration = combined.answeredCalls > 0
                ? Math.round(combined.totalDuration / combined.answeredCalls)
                : 0;

            return combined;
        },
        enabled: employees.length > 0,
    });
}

export function useCallsStatsByEmployee(filter: CallsFilter, employees: Employee[]) {
    return useQuery({
        queryKey: [...callsKeys.byEmployee(filter), employees.map((employee) => employee.id).join(",")],
        queryFn: async () => {
            const supabase = createClient();
            const baseFilters = getDateRangeFilters(filter);

            const statsByEmployee: EmployeeCallStats[] = await Promise.all(
                employees.map(async (employee) => {
                    const participantIds = getEmployeeParticipantIds(employee);
                    const stats = await fetchCountStats(supabase, baseFilters, participantIds);

                    return {
                        ...stats,
                        employeeId: employee.id,
                        employeeName: employee.name,
                        participantIds,
                    };
                })
            );

            return statsByEmployee.sort((left, right) => right.totalCalls - left.totalCalls);
        },
        enabled: employees.length > 0,
    });
}

export function useCallsExport(filter: CallsFilter) {
    return useQuery({
        queryKey: [...callsKeys.all, "export", filter],
        queryFn: async () => {
            const supabase = createClient();
            let query = supabase
                .from("calls")
                .select("*")
                .order(CALL_DATE_FIELD, { ascending: false });

            query = applyDateFilter(query, getDateRangeFilters(filter));

            if (filter.participantIds?.length) {
                query = applyParticipantFilter(query, filter.participantIds);
            } else if (filter.employeeId) {
                query = applyParticipantFilter(query, [filter.employeeId]);
            }

            const { data, error } = await query;
            if (error) throw error;

            return (data || []).map(normalizeCallRow);
        },
        enabled: false,
    });
}

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

export interface CallRecordingsFilter {
    startDate: string;
    endDate: string;
    participantIds: string[];
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
            const baseFilters = getDateRangeFilters(filter);

            let countQuery = supabase
                .from("calls")
                .select("*", { count: "exact", head: true });

            let dataQuery = supabase
                .from("calls")
                .select("*")
                .order(CALL_DATE_FIELD, { ascending: false });

            countQuery = applyDateFilter(applyParticipantFilter(countQuery, filter.participantIds), baseFilters);
            dataQuery = applyDateFilter(applyParticipantFilter(dataQuery, filter.participantIds), baseFilters);

            countQuery = countQuery.not("download_url", "is", null);
            dataQuery = dataQuery.not("download_url", "is", null);

            const from = (filter.page - 1) * filter.pageSize;
            const to = from + filter.pageSize - 1;
            dataQuery = dataQuery.range(from, to);

            const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

            if (countResult.error) throw countResult.error;
            if (dataResult.error) throw dataResult.error;

            return {
                data: (dataResult.data || []).map(normalizeCallRow),
                totalCount: countResult.count || 0,
            };
        },
        enabled: filter.participantIds.length > 0,
    });
}
