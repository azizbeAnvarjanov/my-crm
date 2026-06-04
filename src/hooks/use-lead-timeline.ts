"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type LeadTimelineEventType =
    | "lead_created"
    | "stage_changed"
    | "responsible_changed"
    | "fields_changed"
    | "task_created"
    | "task_completed"
    | "task_reopened"
    | "note_added";

export type LeadTimelineMetadata = Record<string, unknown>;

export interface LeadTimelineEvent {
    id: string;
    lead_id: string;
    pipeline_id: string | null;
    stage_id: string | null;
    employee_id: string | null;
    actor_employee_id: string | null;
    event_type: LeadTimelineEventType;
    title: string;
    body: string | null;
    metadata: LeadTimelineMetadata;
    occurred_at: string;
    created_at: string;
    actor?: {
        id: string;
        name: string;
    } | null;
    employee?: {
        id: string;
        name: string;
    } | null;
    stage?: {
        id: string;
        name: string;
        color?: string | null;
    } | null;
}

export const leadTimelineKeys = {
    all: ["leadTimelineEvents"] as const,
    byLead: (leadId: string) => [...leadTimelineKeys.all, leadId] as const,
};

export function useLeadTimelineEvents(leadId?: string | null) {
    return useQuery({
        queryKey: leadId ? leadTimelineKeys.byLead(leadId) : leadTimelineKeys.all,
        queryFn: async () => {
            if (!leadId) return [] as LeadTimelineEvent[];

            const supabase = createClient();
            const { data, error } = await supabase
                .from("lead_timeline_events")
                .select(`
                    *,
                    actor:xodimlar!lead_timeline_events_actor_employee_id_fkey(id, name),
                    employee:xodimlar!lead_timeline_events_employee_id_fkey(id, name),
                    stage:stages(id, name, color)
                `)
                .eq("lead_id", leadId)
                .order("occurred_at", { ascending: false })
                .limit(100);

            if (error) throw error;
            return (data || []) as LeadTimelineEvent[];
        },
        enabled: !!leadId,
    });
}

export interface CreateLeadTimelineNoteInput {
    lead_id: string;
    pipeline_id?: string | null;
    stage_id?: string | null;
    employee_id?: string | null;
    actor_employee_id?: string | null;
    body: string;
}

export function useCreateLeadTimelineNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateLeadTimelineNoteInput) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("lead_timeline_events")
                .insert({
                    lead_id: input.lead_id,
                    pipeline_id: input.pipeline_id || null,
                    stage_id: input.stage_id || null,
                    employee_id: input.employee_id || null,
                    actor_employee_id: input.actor_employee_id || null,
                    event_type: "note_added",
                    title: "Izoh qo'shildi",
                    body: input.body,
                    metadata: {},
                })
                .select()
                .single();

            if (error) throw error;
            return data as LeadTimelineEvent;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: leadTimelineKeys.byLead(data.lead_id) });
        },
    });
}
