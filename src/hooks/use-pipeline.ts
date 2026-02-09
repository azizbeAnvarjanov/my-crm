"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Pipeline type
export interface Pipeline {
    id: string;
    name: string;
    description?: string;
    branch_id: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
}

// Stage type
export interface Stage {
    id: string;
    name: string;
    pipeline_id: string;
    order_index: number;
    color?: string;
    created_at?: string;
}

// Lead type
export interface Lead {
    id: string;
    name: string;
    phone: string;
    phone_2?: string;
    utm?: string;
    date_of_year?: string;
    gender?: string;
    status?: string;
    stage_id: string;
    pipeline_id: string;
    employee_id?: string;
    age?: number;
    location?: string;
    created_at?: string;
    updated_at?: string;
    // Relations
    employee?: {
        id: string;
        name: string;
    };
}

// Query keys
export const pipelineKeys = {
    all: ["piplines"] as const,
    byBranch: (branchId: string) => [...pipelineKeys.all, "branch", branchId] as const,
    detail: (id: string) => [...pipelineKeys.all, id] as const,
};

export const stageKeys = {
    all: ["stages"] as const,
    byPipeline: (pipelineId: string) => [...stageKeys.all, "pipeline", pipelineId] as const,
};

export const leadKeys = {
    all: ["leads"] as const,
    byPipeline: (pipelineId: string) => [...leadKeys.all, "pipeline", pipelineId] as const,
    byStage: (stageId: string) => [...leadKeys.all, "stage", stageId] as const,
    search: (query: string, pipelineId: string) => [...leadKeys.all, "search", query, pipelineId] as const,
};

// =========================
// Pipeline Hooks
// =========================

export function usePipelines(branchId: string | null) {
    return useQuery({
        queryKey: branchId ? pipelineKeys.byBranch(branchId) : pipelineKeys.all,
        queryFn: async () => {
            const supabase = createClient();
            let query = supabase.from("piplines").select("*").order("created_at", { ascending: false });

            if (branchId) {
                query = query.eq("branch_id", branchId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Pipeline[];
        },
        enabled: !!branchId,
    });
}

export function usePipeline(id: string) {
    return useQuery({
        queryKey: pipelineKeys.detail(id),
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("piplines")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            return data as Pipeline;
        },
        enabled: !!id,
    });
}

// =========================
// Stage Hooks
// =========================

export function useStages(pipelineId: string) {
    return useQuery({
        queryKey: stageKeys.byPipeline(pipelineId),
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("stages")
                .select("*")
                .eq("pipeline_id", pipelineId)
                .order("id", { ascending: true });

            if (error) throw error;
            return data as Stage[];
        },
        enabled: !!pipelineId,
    });
}

export function useCreateStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (stage: { name: string; pipeline_id: string; order_index: number; color?: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("stages")
                .insert(stage)
                .select()
                .single();

            if (error) throw error;
            return data as Stage;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: stageKeys.byPipeline(data.pipeline_id) });
        },
    });
}

export function useUpdateStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Stage> & { id: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("stages")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as Stage;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: stageKeys.byPipeline(data.pipeline_id) });
        },
    });
}

export function useDeleteStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, pipelineId }: { id: string; pipelineId: string }) => {
            const supabase = createClient();
            const { error } = await supabase.from("stages").delete().eq("id", id);

            if (error) throw error;
            return { id, pipelineId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: stageKeys.byPipeline(data.pipelineId) });
        },
    });
}

// =========================
// Lead Hooks
// =========================

export function useLeads(pipelineId: string, searchQuery?: string, employeeId?: string | null) {
    return useQuery({
        queryKey: searchQuery ? leadKeys.search(searchQuery, pipelineId) : leadKeys.byPipeline(pipelineId),
        queryFn: async () => {
            const supabase = createClient();
            let query = supabase
                .from("leads")
                .select(`
                    *,
                    employee:xodimlar(id, name)
                `)
                .eq("pipeline_id", pipelineId)
                .order("created_at", { ascending: false });

            // Filter by employee_id for regular users
            if (employeeId) {
                query = query.eq("employee_id", employeeId);
            }

            if (searchQuery && searchQuery.trim()) {
                const search = searchQuery.trim().toLowerCase();
                query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,phone_2.ilike.%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Lead[];
        },
        enabled: !!pipelineId,
    });
}

// Paginated leads per stage with infinite scroll support
export interface UseStageLeadsOptions {
    stageId: string;
    pipelineId: string;
    employeeId?: string | null;
    searchQuery?: string;
    limit?: number;
}

export interface StageLeadsResult {
    leads: Lead[];
    hasMore: boolean;
    totalCount: number;
}

export const stageLeadKeys = {
    base: ["stageLeads"] as const,
    byStage: (stageId: string, employeeId?: string | null, searchQuery?: string) =>
        [...stageLeadKeys.base, stageId, employeeId || "all", searchQuery || ""] as const,
    page: (stageId: string, page: number, employeeId?: string | null, searchQuery?: string) =>
        [...stageLeadKeys.byStage(stageId, employeeId, searchQuery), "page", page] as const,
};

export function useStageLeads({
    stageId,
    pipelineId,
    employeeId,
    searchQuery,
    limit = 50,
}: UseStageLeadsOptions) {
    return useQuery({
        queryKey: stageLeadKeys.byStage(stageId, employeeId, searchQuery),
        queryFn: async () => {
            const supabase = createClient();

            // First, get total count
            let countQuery = supabase
                .from("leads")
                .select("id", { count: "exact", head: true })
                .eq("stage_id", stageId)
                .eq("pipeline_id", pipelineId);

            if (employeeId) {
                countQuery = countQuery.eq("employee_id", employeeId);
            }

            if (searchQuery && searchQuery.trim()) {
                const search = searchQuery.trim().toLowerCase();
                countQuery = countQuery.or(`name.ilike.%${search}%,phone.ilike.%${search}%,phone_2.ilike.%${search}%`);
            }

            const { count } = await countQuery;

            // Then get first page of leads
            let query = supabase
                .from("leads")
                .select(`
                    *,
                    employee:xodimlar(id, name)
                `)
                .eq("stage_id", stageId)
                .eq("pipeline_id", pipelineId)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (employeeId) {
                query = query.eq("employee_id", employeeId);
            }

            if (searchQuery && searchQuery.trim()) {
                const search = searchQuery.trim().toLowerCase();
                query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,phone_2.ilike.%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            return {
                leads: data as Lead[],
                hasMore: (count || 0) > limit,
                totalCount: count || 0,
            } as StageLeadsResult;
        },
        enabled: !!stageId && !!pipelineId,
    });
}

// Load more leads for a stage (pagination)
export function useLoadMoreStageLeads() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            stageId,
            pipelineId,
            employeeId,
            searchQuery,
            offset,
            limit = 50,
        }: UseStageLeadsOptions & { offset: number }) => {
            const supabase = createClient();

            let query = supabase
                .from("leads")
                .select(`
                    *,
                    employee:xodimlar(id, name)
                `)
                .eq("stage_id", stageId)
                .eq("pipeline_id", pipelineId)
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (employeeId) {
                query = query.eq("employee_id", employeeId);
            }

            if (searchQuery && searchQuery.trim()) {
                const search = searchQuery.trim().toLowerCase();
                query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,phone_2.ilike.%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            return {
                leads: data as Lead[],
                stageId,
                employeeId,
                searchQuery,
            };
        },
        onSuccess: (data) => {
            // Update the existing query data by appending new leads
            queryClient.setQueryData<StageLeadsResult>(
                stageLeadKeys.byStage(data.stageId, data.employeeId, data.searchQuery),
                (old) => {
                    if (!old) return old;
                    const existingIds = new Set(old.leads.map((l) => l.id));
                    const newLeads = data.leads.filter((l) => !existingIds.has(l.id));
                    return {
                        ...old,
                        leads: [...old.leads, ...newLeads],
                        hasMore: data.leads.length === 50,
                    };
                }
            );
        },
    });
}

export function useCreateLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (lead: Partial<Lead>) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("leads")
                .insert(lead)
                .select()
                .single();

            if (error) throw error;
            return data as Lead;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: leadKeys.byPipeline(data.pipeline_id) });
        },
    });
}

export function useUpdateLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("leads")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as Lead;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: leadKeys.byPipeline(data.pipeline_id) });
        },
    });
}

export function useMoveLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ leadId, newStageId, pipelineId }: { leadId: string; newStageId: string; pipelineId: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("leads")
                .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
                .eq("id", leadId)
                .select()
                .single();

            if (error) throw error;
            return { ...data, pipelineId } as Lead & { pipelineId: string };
        },
        onMutate: async ({ leadId, newStageId, pipelineId }) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: leadKeys.byPipeline(pipelineId) });

            const previousLeads = queryClient.getQueryData<Lead[]>(leadKeys.byPipeline(pipelineId));

            if (previousLeads) {
                queryClient.setQueryData<Lead[]>(
                    leadKeys.byPipeline(pipelineId),
                    previousLeads.map((lead) =>
                        lead.id === leadId ? { ...lead, stage_id: newStageId } : lead
                    )
                );
            }

            return { previousLeads };
        },
        onError: (err, variables, context) => {
            if (context?.previousLeads) {
                queryClient.setQueryData(leadKeys.byPipeline(variables.pipelineId), context.previousLeads);
            }
        },
        onSettled: (data) => {
            if (data?.pipelineId) {
                queryClient.invalidateQueries({ queryKey: leadKeys.byPipeline(data.pipelineId) });
            }
        },
    });
}
