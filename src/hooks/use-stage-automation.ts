"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type StageAutomationTaskType = "qayta_aloqa" | "uchrashuv" | "eslatma" | "boshqa";
export type StageAutomationAssigneeMode = "lead_employee" | "current_user" | "specific_employee";

export interface StageAutomationTrigger {
    id: number;
    pipeline_id: string;
    stage_id: number;
    name: string;
    event_type: "lead_entered_stage";
    action_type: "create_task";
    enabled: boolean;
    delay_minutes: number;
    schedule_timezone: string;
    task_text: string;
    task_type: StageAutomationTaskType;
    assignee_mode: StageAutomationAssigneeMode;
    assignee_employee_id: number | null;
    created_by: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface CreateStageAutomationTriggerInput {
    pipeline_id: string;
    stage_id: string | number;
    name: string;
    delay_minutes: number;
    task_text: string;
    task_type?: StageAutomationTaskType;
    assignee_mode?: StageAutomationAssigneeMode;
    assignee_employee_id?: string | number | null;
    enabled?: boolean;
}

export const stageAutomationKeys = {
    all: ["stageAutomationTriggers"] as const,
    byStage: (stageId: string | number) => [...stageAutomationKeys.all, "stage", String(stageId)] as const,
    byPipeline: (pipelineId: string) => [...stageAutomationKeys.all, "pipeline", pipelineId] as const,
};

function normalizeBigintId(value: string | number, fieldName: string) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`${fieldName} noto'g'ri`);
    }

    return id;
}

export function useStageAutomationTriggers(stageId: string | number | null | undefined) {
    return useQuery({
        queryKey: stageId ? stageAutomationKeys.byStage(stageId) : stageAutomationKeys.all,
        queryFn: async () => {
            if (!stageId) return [] as StageAutomationTrigger[];

            const supabase = createClient();
            const { data, error } = await supabase
                .from("stage_automation_triggers")
                .select("*")
                .eq("stage_id", normalizeBigintId(stageId, "Etap"))
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as StageAutomationTrigger[];
        },
        enabled: !!stageId,
    });
}

export function usePipelineStageAutomationTriggers(pipelineId: string | null | undefined) {
    return useQuery({
        queryKey: pipelineId ? stageAutomationKeys.byPipeline(pipelineId) : stageAutomationKeys.all,
        queryFn: async () => {
            if (!pipelineId) return [] as StageAutomationTrigger[];

            const supabase = createClient();
            const { data, error } = await supabase
                .from("stage_automation_triggers")
                .select("*")
                .eq("pipeline_id", pipelineId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as StageAutomationTrigger[];
        },
        enabled: !!pipelineId,
    });
}

export function useCreateStageAutomationTrigger() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateStageAutomationTriggerInput) => {
            const supabase = createClient();
            const stageId = normalizeBigintId(input.stage_id, "Etap");
            const assigneeEmployeeId = input.assignee_employee_id
                ? normalizeBigintId(input.assignee_employee_id, "Xodim")
                : null;

            const { data, error } = await supabase
                .from("stage_automation_triggers")
                .insert({
                    pipeline_id: input.pipeline_id,
                    stage_id: stageId,
                    name: input.name,
                    event_type: "lead_entered_stage",
                    action_type: "create_task",
                    enabled: input.enabled ?? true,
                    delay_minutes: input.delay_minutes,
                    schedule_timezone: "Asia/Tashkent",
                    task_text: input.task_text,
                    task_type: input.task_type || "qayta_aloqa",
                    assignee_mode: input.assignee_mode || "lead_employee",
                    assignee_employee_id: assigneeEmployeeId,
                })
                .select()
                .single();

            if (error) throw error;
            return data as StageAutomationTrigger;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: stageAutomationKeys.all });
            queryClient.invalidateQueries({ queryKey: stageAutomationKeys.byStage(data.stage_id) });
            queryClient.invalidateQueries({ queryKey: stageAutomationKeys.byPipeline(data.pipeline_id) });
        },
    });
}
