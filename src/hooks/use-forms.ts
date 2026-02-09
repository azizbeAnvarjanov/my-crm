"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Form type
export interface Form {
    id: string;
    name: string;
    branch_id: string;
    pipline_id: string;
    stage_id: string;
    status: boolean;
    utm: string | null;
    created_at?: string;
    updated_at?: string;
    // Relations - Using column references returns single objects
    branch?: {
        id: string;
        name: string;
    };
    pipeline?: {
        id: string;
        name: string;
    };
    stage?: {
        id: string;
        name: string;
    };
}

// Form submission from client
export interface FormSubmission {
    name: string;
    phone: string;
    location: string;
}

// Public form type (subset of Form)
export interface PublicForm {
    id: string;
    name: string;
    status: boolean;
    pipline_id: string;
    stage_id: string;
    utm: string | null;
    branch?: {
        id: string;
        name: string;
    };
}

// Query keys
export const formKeys = {
    all: ["forms"] as const,
    byBranch: (branchId: string) => [...formKeys.all, "branch", branchId] as const,
    detail: (id: string) => [...formKeys.all, id] as const,
};

// =========================
// Form Hooks
// =========================

// Get all forms by branch
export function useForms(branchId: string | null) {
    return useQuery({
        queryKey: branchId ? formKeys.byBranch(branchId) : formKeys.all,
        queryFn: async () => {
            const supabase = createClient();
            let query = supabase
                .from("forms")
                .select(`
                    *,
                    branch:branches!branch_id(id, name),
                    pipeline:piplines!pipline_id(id, name),
                    stage:stages!stage_id(id, name)
                `)
                .order("created_at", { ascending: false });

            if (branchId) {
                query = query.eq("branch_id", branchId);
            }

            const { data, error } = await query;
            if (error) throw error;
            // Normalize: convert arrays to single objects
            return (data || []).map(form => ({
                ...form,
                branch: Array.isArray(form.branch) ? form.branch[0] : form.branch,
                pipeline: Array.isArray(form.pipeline) ? form.pipeline[0] : form.pipeline,
                stage: Array.isArray(form.stage) ? form.stage[0] : form.stage,
            })) as Form[];
        },
        enabled: !!branchId,
    });
}

// Get single form by ID
export function useForm(id: string) {
    return useQuery({
        queryKey: formKeys.detail(id),
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("forms")
                .select(`
                    *,
                    branch:branches!branch_id(id, name),
                    pipeline:piplines!pipline_id(id, name),
                    stage:stages!stage_id(id, name)
                `)
                .eq("id", id)
                .single();

            if (error) throw error;
            // Normalize: convert arrays to single objects
            return {
                ...data,
                branch: Array.isArray(data.branch) ? data.branch[0] : data.branch,
                pipeline: Array.isArray(data.pipeline) ? data.pipeline[0] : data.pipeline,
                stage: Array.isArray(data.stage) ? data.stage[0] : data.stage,
            } as Form;
        },
        enabled: !!id,
    });
}

// Get form for public view (no auth required)
export function usePublicForm(id: string) {
    return useQuery<PublicForm>({
        queryKey: ["publicForm", id],
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("forms")
                .select(`
                    id,
                    name,
                    status,
                    pipline_id,
                    stage_id,
                    utm,
                    branch:branches!branch_id(id, name)
                `)
                .eq("id", id)
                .single();

            if (error) throw error;
            // PostgREST returns single object when using !inner join
            return {
                ...data,
                branch: Array.isArray(data.branch) ? data.branch[0] : data.branch
            } as PublicForm;
        },
        enabled: !!id,
    });
}

// Create form
export function useCreateForm() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (form: {
            name: string;
            branch_id: string;
            pipline_id: string;
            stage_id: string;
            status?: boolean;
            utm?: string;
        }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("forms")
                .insert({
                    ...form,
                    status: form.status ?? false,
                })
                .select()
                .single();

            if (error) throw error;
            return data as Form;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: formKeys.byBranch(data.branch_id) });
        },
    });
}

// Update form
export function useUpdateForm() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Form> & { id: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("forms")
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as Form;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: formKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: formKeys.byBranch(data.branch_id) });
        },
    });
}

// Delete form
export function useDeleteForm() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient();
            const { error } = await supabase
                .from("forms")
                .delete()
                .eq("id", id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: formKeys.all });
        },
    });
}

// Submit form (create lead from public form)
export function useSubmitForm() {
    return useMutation({
        mutationFn: async ({
            formId,
            submission,
        }: {
            formId: string;
            submission: FormSubmission;
        }) => {
            const supabase = createClient();

            // Get form details
            const { data: form, error: formError } = await supabase
                .from("forms")
                .select("pipline_id, stage_id, utm, status")
                .eq("id", formId)
                .single();

            if (formError) throw formError;
            if (!form.status) throw new Error("Form is not active");

            // Create lead
            const { data: lead, error: leadError } = await supabase
                .from("leads")
                .insert({
                    name: submission.name,
                    phone: submission.phone,
                    location: submission.location,
                    pipeline_id: form.pipline_id,
                    stage_id: form.stage_id,
                    utm: form.utm,
                    status: "new",
                })
                .select()
                .single();

            if (leadError) throw leadError;
            return lead;
        },
    });
}
