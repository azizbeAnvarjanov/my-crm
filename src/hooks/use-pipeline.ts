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
                .order("updated_at", { ascending: true }) // Oldest updated first
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
                .order("updated_at", { ascending: true }) // Oldest updated first
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
                limit,
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
                        hasMore: data.leads.length >= data.limit,
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

            // Add updated_at manually to ensure it changes
            const updatesWithTimestamp = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from("leads")
                .update(updatesWithTimestamp)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as Lead;
        },
        onMutate: async ({ id, ...updates }) => {
            // Optimistic update
            const updatesWithTimestamp = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            // 1. Update general leads list
            await queryClient.cancelQueries({ queryKey: leadKeys.all });

            // Iterate over all lead queries to find and update the lead
            const previousLeadsData = queryClient.getQueriesData<Lead[]>({ queryKey: leadKeys.all });
            queryClient.setQueriesData<Lead[]>({ queryKey: leadKeys.all }, (old) => {
                if (!old) return old;
                return old.map(lead => lead.id === id ? { ...lead, ...updatesWithTimestamp } : lead);
            });

            // 2. Update stage leads lists
            const previousStageLeadsData = queryClient.getQueriesData<StageLeadsResult>({ queryKey: stageLeadKeys.base });
            queryClient.setQueriesData<StageLeadsResult>({ queryKey: stageLeadKeys.base }, (old) => {
                if (!old) return old;
                const leadExists = old.leads.some(l => l.id === id);
                if (!leadExists) return old;

                return {
                    ...old,
                    leads: old.leads.map(l => l.id === id ? { ...l, ...updatesWithTimestamp } : l)
                };
            });

            return { previousLeadsData, previousStageLeadsData };
        },
        onError: (err, variables, context) => {
            // Revert changes
            if (context?.previousLeadsData) {
                context.previousLeadsData.forEach(([key, data]) => {
                    queryClient.setQueryData(key, data);
                });
            }
            if (context?.previousStageLeadsData) {
                context.previousStageLeadsData.forEach(([key, data]) => {
                    queryClient.setQueryData(key, data);
                });
            }
        },
        onSettled: (data) => {
            if (data?.pipeline_id) {
                queryClient.invalidateQueries({ queryKey: leadKeys.byPipeline(data.pipeline_id) });
            }
            queryClient.invalidateQueries({ queryKey: stageLeadKeys.base });
        },
    });
}

export function useMoveLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            leadId,
            newStageId,
            pipelineId
        }: {
            leadId: string;
            newStageId: string;
            oldStageId: string; // Used for optimistic update context
            pipelineId: string;
            // Additional context for optimistic updates
            employeeId?: string | null;
            searchQuery?: string;
        }) => {
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
        onMutate: async ({ leadId, newStageId, oldStageId, pipelineId, employeeId, searchQuery }) => {
            // Optimistic update

            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: leadKeys.byPipeline(pipelineId) });
            await queryClient.cancelQueries({ queryKey: stageLeadKeys.base });

            // Snapshot the previous value
            const previousLeads = queryClient.getQueryData<Lead[]>(leadKeys.byPipeline(pipelineId));

            // Get keys for source and destination stages
            const sourceKey = stageLeadKeys.byStage(oldStageId, employeeId, searchQuery);
            const destKey = stageLeadKeys.byStage(newStageId, employeeId, searchQuery);

            const previousSourceData = queryClient.getQueryData<StageLeadsResult>(sourceKey);
            const previousDestData = queryClient.getQueryData<StageLeadsResult>(destKey);

            let movedLead: Lead | undefined;

            // 1. Update source stage: remove lead
            queryClient.setQueryData<StageLeadsResult>(sourceKey, (old) => {
                if (!old) return old;
                movedLead = old.leads.find(l => l.id === leadId);
                if (!movedLead) return old;

                return {
                    ...old,
                    leads: old.leads.filter(l => l.id !== leadId),
                    totalCount: Math.max(0, old.totalCount - 1)
                };
            });

            // 2. Update destination stage: add lead
            if (movedLead) {
                const updatedLead = {
                    ...movedLead,
                    stage_id: newStageId,
                    updated_at: new Date().toISOString()
                };

                queryClient.setQueryData<StageLeadsResult>(destKey, (old) => {
                    // If dest stage hasn't been loaded yet, we might not have data. 
                    // But if it has, we prepend/append.
                    if (!old) return {
                        leads: [updatedLead],
                        hasMore: false,
                        totalCount: 1
                    };

                    return {
                        ...old,
                        leads: [updatedLead, ...old.leads],
                        totalCount: old.totalCount + 1
                    };
                });
            }

            // 3. Update global list (if used)
            if (previousLeads) {
                queryClient.setQueryData<Lead[]>(
                    leadKeys.byPipeline(pipelineId),
                    previousLeads.map((lead) =>
                        lead.id === leadId ? { ...lead, stage_id: newStageId, updated_at: new Date().toISOString() } : lead
                    )
                );
            }

            return { previousLeads, previousSourceData, previousDestData, sourceKey, destKey };
        },
        onError: (err, variables, context) => {
            if (context?.previousLeads) {
                queryClient.setQueryData(leadKeys.byPipeline(variables.pipelineId), context.previousLeads);
            }
            if (context?.previousSourceData) {
                queryClient.setQueryData(context.sourceKey, context.previousSourceData);
            }
            if (context?.previousDestData) {
                queryClient.setQueryData(context.destKey, context.previousDestData);
            }
        },
        onSettled: (data) => {
            if (data?.pipelineId) {
                queryClient.invalidateQueries({ queryKey: leadKeys.byPipeline(data.pipelineId) });
                queryClient.invalidateQueries({ queryKey: stageLeadKeys.base });
            }
        },
    });
}
