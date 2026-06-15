"use client";

import { Fragment, useState, useMemo, useRef, useCallback, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    ArrowLeft,
    Search,
    Plus,
    MoreHorizontal,
    Edit2,
    Trash2,
    User,
    Loader2,
    GripVertical,
    X,
    Check,
    Users,
    CalendarDays,
    BellPlus,
    Settings2,
    Save,
    Clock3,
    ClipboardCheck,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useBranch } from "@/components/app-sidebar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmployee } from "@/hooks/use-employee";
import {
    usePipeline,
    useStages,
    useStageLeads,
    useLoadMoreStageLeads,
    useCreateLead,
    useCreateStage,
    useUpdateStage,
    useDeleteStage,
    useMoveLead,
    useUpdateLead,
    leadKeys,
    stageLeadKeys,
    Stage,
    Lead,
} from "@/hooks/use-pipeline";
import { taskKeys, useBranchEmployees } from "@/hooks/use-tasks";
import {
    useCreateStageAutomationTrigger,
    useDeleteStageAutomationTrigger,
    usePipelineStageAutomationTriggers,
    type StageAutomationTrigger,
    type StageAutomationActionType,
    type StageAutomationAssigneeMode,
    type StageAutomationTaskType,
} from "@/hooks/use-stage-automation";
import { LeadSheet, type LeadMergeInput } from "@/components/lead-sheet";
import { createClient } from "@/lib/supabase/client";
import { getLeadDuplicateFieldLabels } from "@/lib/lead-duplicates";

const DEFAULT_STAGE_COLOR = "#6366f1";
const STAGE_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#6b7280",
];

const DEFAULT_STAGE_TRIGGER_NAME = "Etapga o'tganda eslatma";
const DEFAULT_STAGE_TRIGGER_TEXT = "{{lead_name}} bilan qayta aloqa qilish";
const DEFAULT_RESPONSIBLE_TRIGGER_NAME = "Mas'ul shaxsni o'zgartirish";
const STAGE_TRIGGER_ACTION_TYPES: {
    value: StageAutomationActionType;
    label: string;
    icon: typeof ClipboardCheck;
}[] = [
        { value: "create_task", label: "Zadacha yaratish", icon: ClipboardCheck },
        { value: "change_responsible", label: "Mas'ulni o'zgartirish", icon: Users },
    ];
const STAGE_TRIGGER_TASK_TYPES: { value: StageAutomationTaskType; label: string }[] = [
    { value: "qayta_aloqa", label: "Qayta aloqa" },
    { value: "uchrashuv", label: "Uchrashuv" },
    { value: "eslatma", label: "Eslatma" },
    { value: "boshqa", label: "Boshqa" },
];
const STAGE_TRIGGER_ASSIGNEE_MODES: { value: StageAutomationAssigneeMode; label: string }[] = [
    { value: "lead_employee", label: "Lid mas'uli" },
    { value: "current_user", label: "Hozirgi foydalanuvchi" },
];

const UZBEK_PHONE_PREFIX = "+998";
type DropPlacement = "before" | "after";

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function getHorizontalScrollWidth(container: HTMLElement) {
    const content = container.firstElementChild;
    const contentScrollWidth = content instanceof HTMLElement
        ? Math.max(content.scrollWidth, content.getBoundingClientRect().width)
        : 0;

    return Math.max(container.scrollWidth, contentScrollWidth);
}

function getHorizontalMaxScroll(container: HTMLElement) {
    return Math.max(getHorizontalScrollWidth(container) - container.clientWidth, 0);
}

function formatUzbekPhone(value: string) {
    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("998")) {
        digits = digits.slice(3);
    }

    digits = digits.slice(0, 9);

    const parts = [
        digits.slice(0, 2),
        digits.slice(2, 5),
        digits.slice(5, 7),
        digits.slice(7, 9),
    ].filter(Boolean);

    return parts.length > 0 ? `${UZBEK_PHONE_PREFIX} ${parts.join(" ")}` : UZBEK_PHONE_PREFIX;
}

function getUzbekPhoneDigits(value: string) {
    const digits = value.replace(/\D/g, "");
    const normalizedDigits = digits.startsWith("998") ? digits.slice(3) : digits;
    return normalizedDigits.slice(0, 9);
}

function isValidUzbekPhone(value: string) {
    return getUzbekPhoneDigits(value).length === 9;
}

function getStoredUzbekPhone(value: string) {
    return `${UZBEK_PHONE_PREFIX}${getUzbekPhoneDigits(value)}`;
}

// Helper function to get time ago
function getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "hozir";
    if (diffMins < 60) return `${diffMins} daqiqa avval`;
    if (diffHours < 24) return `${diffHours} soat avval`;
    if (diffDays === 1) return "kecha";
    if (diffDays < 30) return `${diffDays} kun avval`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} oy avval`;
    return `${Math.floor(diffDays / 365)} yil avval`;
}

function getTaskTypeLabel(taskType: StageAutomationTaskType) {
    return STAGE_TRIGGER_TASK_TYPES.find((type) => type.value === taskType)?.label || "Zadacha";
}

function getAssigneeModeLabel(mode: StageAutomationAssigneeMode) {
    return STAGE_TRIGGER_ASSIGNEE_MODES.find((item) => item.value === mode)?.label || "Lid mas'uli";
}

function getActionTypeLabel(actionType: StageAutomationActionType) {
    return STAGE_TRIGGER_ACTION_TYPES.find((type) => type.value === actionType)?.label || "Trigger";
}

function getEmployeeName(employeeId: number | null | undefined, employees: { id: string; name: string }[]) {
    if (!employeeId) return "Xodim tanlanmagan";
    return employees.find((employee) => String(employee.id) === String(employeeId))?.name || `Xodim #${employeeId}`;
}

function formatDelayMinutes(delayMinutes: number) {
    if (delayMinutes <= 0) return "Darhol";
    if (delayMinutes < 60) return `${delayMinutes} daqiqa`;

    const hours = Math.floor(delayMinutes / 60);
    const minutes = delayMinutes % 60;

    return minutes > 0 ? `${hours} soat ${minutes} daqiqa` : `${hours} soat`;
}

function getStageTriggers(stageId: string, triggers: StageAutomationTrigger[]) {
    return triggers.filter((trigger) => String(trigger.stage_id) === String(stageId));
}

// Draggable Lead Card Component
function LeadCard({
    lead,
    isMoving,
    isDragOverlay,
    onClick,
}: {
    lead: Lead;
    isMoving?: boolean;
    isDragOverlay?: boolean;
    onClick?: (lead: Lead) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useSortable({
        id: lead.id,
        data: { type: "lead", lead },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        opacity: !isDragOverlay && (isDragging || isMoving) ? 0.45 : 1,
        zIndex: isDragging || isDragOverlay ? 1000 : 1,
    };
    const hasPendingTasks = (lead.pending_tasks?.length || 0) > 0;
    const duplicateFieldLabels = getLeadDuplicateFieldLabels(lead.duplicate_fields);
    const hasDuplicate = duplicateFieldLabels.length > 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group bg-card border border-border rounded-lg p-3 transition-[border-color,box-shadow,opacity,transform] relative ${isDragging || isDragOverlay
                ? "shadow-xl ring-2 ring-primary/70 cursor-grabbing"
                : "hover:border-primary/40 hover:shadow-sm cursor-pointer"
                }`}
        >
            {isMoving && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center rounded-lg z-10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
            )}
            {/* Drag Handle */}
            <div className="flex items-start justify-between mb-2">
                <div
                    className="flex items-center gap-2 flex-1"
                    onClick={() => onClick?.(lead)}
                >
                    <div className="relative h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                        {hasPendingTasks && (
                            <span
                                aria-label="Bajarilmagan zadacha bor"
                                title="Bajarilmagan zadacha bor"
                                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-card"
                            />
                        )}
                    </div>
                    <div>
                        <div className="flex min-w-0 items-center gap-1.5">
                            <p className="min-w-0 text-sm font-medium text-foreground line-clamp-1">
                                {lead.name}
                            </p>
                            {hasDuplicate && (
                                <Badge
                                    variant="outline"
                                    title={`Dubl: ${duplicateFieldLabels.join(", ")}`}
                                    className="h-5 shrink-0 gap-1 border-amber-500/50 bg-amber-500/10 px-1.5 text-[10px] text-amber-600 dark:text-amber-400"
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    Dubl
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </div>
                </div>
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    aria-label={`${lead.name} lidini ko'chirish`}
                    onClick={(event) => event.stopPropagation()}
                    className={`absolute h-[80%] right-1.5 top-1/2 z-20 flex h-8 w-7 -translate-y-1/2 items-center justify-center rounded-md border border-border/70 bg-background/95 text-muted-foreground shadow-sm transition-all duration-200 touch-none cursor-grab active:cursor-grabbing hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isDragging || isDragOverlay
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                        }`}
                >
                    <GripVertical className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-1.5" onClick={() => onClick?.(lead)}>
                <div className="w-full flex items-center justify-between">
                    {lead.employee && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{lead.employee.name}</span>
                        </div>
                    )}
                    {lead.updated_at && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span className="text-xs text-muted-foreground">
                                {getTimeAgo(lead.updated_at)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function LeadDropPreview({
    stageColor,
    leadName,
}: {
    stageColor?: string | null;
    leadName?: string;
}) {
    return (
        <div
            className="h-[78px] rounded-lg border-2 border-dashed bg-primary/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition-all duration-200 flex items-center justify-center"
            style={{ borderColor: stageColor || DEFAULT_STAGE_COLOR }}
        >
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stageColor || DEFAULT_STAGE_COLOR }} />
                <span>{leadName ? `${leadName} ko'chirish` : "Lid ko'chirish"}</span>
            </div>
        </div>
    );
}

function StageAutomationSettingsBoard({
    pipelineName,
    stages,
    triggers,
    employees,
    isLoading,
    onBack,
    onSave,
    onAddTrigger,
    onDeleteTrigger,
    deletingTriggerId,
}: {
    pipelineName?: string;
    stages: Stage[];
    triggers: StageAutomationTrigger[];
    employees: { id: string; name: string }[];
    isLoading: boolean;
    onBack: () => void;
    onSave: () => void;
    onAddTrigger: (stage: Stage) => void;
    onDeleteTrigger: (trigger: StageAutomationTrigger) => void;
    deletingTriggerId?: number | null;
}) {
    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#171717] text-white">
            <div className="flex-shrink-0 border-b border-white/10 bg-[#171717] px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-lg font-semibold truncate">
                            {pipelineName || "Voronka"} trigger sozlamalari
                        </h1>
                        <p className="text-sm text-sky-100/70">
                            Etaplar bo&apos;yicha avtomatik zadachalar
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="text-sky-100 hover:bg-white/10 hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Ortga
                        </Button>
                        <Button
                            onClick={onSave}
                            className="bg-white/10 text-white hover:bg-white/20 border border-white/10"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Saqlash
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-sky-200" />
                    </div>
                ) : stages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sky-100/70">
                        Hali etap yo&apos;q
                    </div>
                ) : (
                    <div className="flex h-full min-w-max">
                        {stages.map((stage) => {
                            const stageTriggers = getStageTriggers(stage.id, triggers);

                            return (
                                <div
                                    key={stage.id}
                                    className="flex h-full w-[340px] flex-shrink-0 flex-col border-r border-white/10"
                                >
                                    <div className="relative border-b border-white/10 bg-[#171717]">
                                        <div
                                            className="h-1"
                                            style={{ backgroundColor: stage.color || DEFAULT_STAGE_COLOR }}
                                        />
                                        <div className="flex min-h-14 items-center justify-between px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold uppercase tracking-normal">
                                                    {stage.name}
                                                </p>
                                                <p className="text-xs text-sky-100/60">
                                                    {stageTriggers.length} ta trigger
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onAddTrigger(stage)}
                                                className="h-9 w-9 rounded-full border border-sky-100/30 bg-[#171717] text-[#3cc788] hover:bg-sky-400/20 hover:text-green-500 border-[#3cc788] transition-colors focus-visible:ring-2 focus-visible:ring-green-500"
                                            >
                                                <Plus className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="border-b border-white/10 px-4 py-3 text-center">
                                        <Button
                                            variant="ghost"
                                            onClick={() => onAddTrigger(stage)}
                                            className="h-9 text-sky-200 hover:bg-white/10 hover:text-white"
                                        >
                                            <BellPlus className="h-4 w-4 mr-2" />
                                            Trigger qo&apos;shish
                                        </Button>
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
                                        {stageTriggers.length === 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => onAddTrigger(stage)}
                                                className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-sky-100/25 text-sm text-sky-100/60 transition-colors hover:border-[#3cc788] hover:bg-white/5 hover:text-[#3cc788]"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Birinchi trigger
                                            </button>
                                        ) : (
                                            stageTriggers.map((trigger) => (
                                                <div
                                                    key={trigger.id}
                                                    className="rounded-md border border-white/10 bg-[#171717] p-3 shadow-sm"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-teal-300/50  text-[#3cc788]">
                                                            {trigger.action_type === "change_responsible" ? (
                                                                <Users className="h-4 w-4" />
                                                            ) : (
                                                                <ClipboardCheck className="h-4 w-4" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs text-sky-100/70">
                                                                {getActionTypeLabel(trigger.action_type)}
                                                            </p>
                                                            <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5">
                                                                {trigger.name}
                                                            </p>
                                                            <p className="mt-1 line-clamp-2 text-xs text-sky-100/70">
                                                                {trigger.action_type === "change_responsible"
                                                                    ? `${getEmployeeName(trigger.target_employee_id, employees)} ga biriktiriladi`
                                                                    : trigger.task_text}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => onDeleteTrigger(trigger)}
                                                            disabled={deletingTriggerId === trigger.id}
                                                            aria-label={`${trigger.name} triggerini o'chirish`}
                                                            className="h-8 w-8 flex-shrink-0 rounded-full text-red-200 hover:bg-red-500/15 hover:text-red-100"
                                                        >
                                                            {deletingTriggerId === trigger.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-sky-100/70">
                                                        {trigger.action_type === "create_task" ? (
                                                            <>
                                                                <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-1">
                                                                    <Clock3 className="mr-1 h-3 w-3" />
                                                                    {formatDelayMinutes(trigger.delay_minutes)}
                                                                </span>
                                                                <span className="rounded-full bg-white/10 px-2 py-1">
                                                                    {getTaskTypeLabel(trigger.task_type)}
                                                                </span>
                                                                <span className="rounded-full bg-white/10 px-2 py-1">
                                                                    {getAssigneeModeLabel(trigger.assignee_mode)}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="rounded-full bg-white/10 px-2 py-1">
                                                                {getEmployeeName(trigger.target_employee_id, employees)}
                                                            </span>
                                                        )}
                                                        {!trigger.enabled && (
                                                            <span className="rounded-full bg-red-400/15 px-2 py-1 text-red-100">
                                                                O&apos;chiq
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// Stage Column Component with infinite scroll
function StageColumn({
    stage,
    pipelineId,
    employeeId,
    searchQuery,
    isAdmin,
    onCreateLead,
    onEditStage,
    onAddTrigger,
    onDeleteStage,
    onLeadClick,
    movingLeadId,
    activeLead,
    dragOverStageId,
    dragOverLeadId,
    dragOverPlacement,
    canDragStageHeader,
    isStageHeaderDragging,
    onStageHeaderPointerDown,
    onTotalCountChange,
    onVisibleLeadsChange,
}: {
    stage: Stage;
    pipelineId: string;
    employeeId?: string | null;
    searchQuery?: string;
    isAdmin: boolean;
    onCreateLead: (stage: Stage) => void;
    onEditStage: (stage: Stage) => void;
    onAddTrigger: (stage: Stage) => void;
    onDeleteStage: (stage: Stage) => void;
    onLeadClick: (lead: Lead) => void;
    movingLeadId: string | null;
    activeLead: Lead | null;
    dragOverStageId: string | null;
    dragOverLeadId: string | null;
    dragOverPlacement: DropPlacement | null;
    canDragStageHeader: boolean;
    isStageHeaderDragging: boolean;
    onStageHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onTotalCountChange?: (stageId: string, totalCount: number) => void;
    onVisibleLeadsChange?: (stageId: string, leads: Lead[]) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);

    const { data: stageData, isLoading } = useStageLeads({
        stageId: stage.id,
        pipelineId,
        employeeId,
        searchQuery,
    });

    const loadMoreMutation = useLoadMoreStageLeads();

    // Track loaded leads for this stage
    const leads = useMemo(() => stageData?.leads ?? [], [stageData?.leads]);
    const hasMore = stageData?.hasMore || false;
    const totalCount = stageData?.totalCount || 0;

    useEffect(() => {
        onTotalCountChange?.(stage.id, totalCount);
    }, [onTotalCountChange, stage.id, totalCount]);

    useEffect(() => {
        onVisibleLeadsChange?.(stage.id, leads);

        return () => {
            onVisibleLeadsChange?.(stage.id, []);
        };
    }, [leads, onVisibleLeadsChange, stage.id]);

    const handleLoadMore = useCallback(() => {
        if (!hasMore || loadMoreMutation.isPending) return;

        loadMoreMutation.mutate({
            stageId: stage.id,
            pipelineId,
            employeeId,
            searchQuery,
            offset: leads.length,
        });
    }, [employeeId, hasMore, leads.length, loadMoreMutation, pipelineId, searchQuery, stage.id]);

    // Handle scroll for infinite loading and progress tracking
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

        // Calculate scroll progress percentage
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll > 0) {
            const progress = (scrollTop / maxScroll) * 100;
            setScrollProgress(Math.min(progress, 100));
        } else {
            setScrollProgress(0);
        }

        // Load more when near bottom - slightly larger threshold (150px) for reliability
        if (!hasMore || loadMoreMutation.isPending) return;

        // Use a more robust check for bottom
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 150;

        if (isNearBottom) {
            handleLoadMore();
        }
    }, [handleLoadMore, hasMore, loadMoreMutation.isPending]);

    // Use droppable for stage (drop zone for leads)
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
        data: { type: "stage", stage },
    });
    const shouldShowDropPreview = Boolean(
        activeLead
        && activeLead.stage_id !== stage.id
        && dragOverStageId === stage.id
    );
    const isDropPreviewBeforeLead = (leadId: string) => shouldShowDropPreview && dragOverLeadId === leadId;
    const isDropPreviewAfterLead = (leadId: string) => (
        shouldShowDropPreview
        && dragOverLeadId === leadId
        && dragOverPlacement === "after"
    );
    const shouldAppendDropPreview = shouldShowDropPreview && (
        !dragOverLeadId || !leads.some((lead) => lead.id === dragOverLeadId)
    );

    return (
        <div
            ref={setNodeRef}
            className={`flex-shrink-0 w-80 bg-accent/30 rounded-xl flex flex-col transition-all ${isOver || shouldShowDropPreview ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
        >
            {/* Stage Header */}
            <div className="sticky top-0 z-10 bg-accent/50 backdrop-blur-sm rounded-t-xl">
                <div
                    className="p-3 border-b border-border flex items-center justify-between"
                    style={{ borderLeft: `4px solid ${stage.color || DEFAULT_STAGE_COLOR}` }}
                >
                    <div
                        onPointerDown={onStageHeaderPointerDown}
                        className={`-m-1 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 select-none ${canDragStageHeader
                            ? isStageHeaderDragging
                                ? "cursor-grabbing"
                                : "cursor-grab active:cursor-grabbing"
                            : ""
                            }`}
                        title={stage.name}
                    >
                        <GripVertical
                            aria-hidden="true"
                            className={`h-4 w-4 shrink-0 transition-colors ${canDragStageHeader ? "text-primary" : "text-muted-foreground/50"}`}
                        />
                        <h3 className="truncate font-medium text-foreground">{stage.name}</h3>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                            {totalCount}
                        </Badge>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                            {isAdmin && (
                                <DropdownMenuItem onClick={() => onEditStage(stage)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Tahrirlash
                                </DropdownMenuItem>
                            )}
                            {isAdmin && (
                                <DropdownMenuItem onClick={() => onAddTrigger(stage)}>
                                    <BellPlus className="h-4 w-4 mr-2" />
                                    Trigger qo&apos;shish
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onCreateLead(stage)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Yangi lid
                            </DropdownMenuItem>
                            {isAdmin && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => onDeleteStage(stage)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        O&apos;chirish
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {/* Scroll Progress Bar */}
                {scrollProgress > 0 && (
                    <div className="h-1 bg-accent/30 relative overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-150"
                            style={{
                                width: `${scrollProgress}%`,
                                backgroundColor: stage.color || DEFAULT_STAGE_COLOR,
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Leads List with scroll */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="p-2 flex-1 overflow-y-auto space-y-2 min-h-[100px]"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                            {leads.map((lead) => (
                                <Fragment key={lead.id}>
                                    {isDropPreviewBeforeLead(lead.id) && dragOverPlacement !== "after" && (
                                        <LeadDropPreview
                                            stageColor={stage.color}
                                            leadName={activeLead?.name}
                                        />
                                    )}
                                    <LeadCard
                                        lead={lead}
                                        isMoving={movingLeadId === lead.id}
                                        onClick={onLeadClick}
                                    />
                                    {isDropPreviewAfterLead(lead.id) && (
                                        <LeadDropPreview
                                            stageColor={stage.color}
                                            leadName={activeLead?.name}
                                        />
                                    )}
                                </Fragment>
                            ))}
                        </SortableContext>

                        {shouldAppendDropPreview && (
                            <LeadDropPreview
                                stageColor={stage.color}
                                leadName={activeLead?.name}
                            />
                        )}

                        {leads.length === 0 && !shouldShowDropPreview && (
                            <div className={`py-8 text-center border-2 border-dashed rounded-lg transition-colors ${isOver ? "border-primary bg-primary/5" : "border-transparent"
                                }`}>
                                <p className="text-sm text-muted-foreground">
                                    {isOver ? "Shu yerga tashlang" : "Lidlar yo'q"}
                                </p>
                            </div>
                        )}

                        {/* Load more indicator */}
                        {loadMoreMutation.isPending && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {hasMore && !loadMoreMutation.isPending && (
                            <div className="text-center py-4 border-t border-border/10 mt-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-muted-foreground hover:text-primary transition-colors text-xs gap-2"
                                    onClick={handleLoadMore}
                                >
                                    <Plus className="h-3 w-3" />
                                    Yuklash ({leads.length} / {totalCount})
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Main Page Component
export default function LeadsPage({ params }: { params: Promise<{ pipelineId: string }> }) {
    const { pipelineId } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: employee, isLoading: employeeLoading, error: employeeError } = useEmployee();
    const { data: pipeline, isLoading: pipelineLoading, error: pipelineError } = usePipeline(pipelineId);
    const { data: stages = [], isLoading: stagesLoading, error: stagesError } = useStages(pipelineId);
    const { selectedBranch } = useBranch();
    const selectedBranchId = selectedBranch?.id ?? null;

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const createStageMutation = useCreateStage();
    const createLeadMutation = useCreateLead();
    const updateStageMutation = useUpdateStage();
    const deleteStageMutation = useDeleteStage();
    const moveLeadMutation = useMoveLead();
    const updateLeadMutation = useUpdateLead();
    const createStageAutomationTriggerMutation = useCreateStageAutomationTrigger();
    const deleteStageAutomationTriggerMutation = useDeleteStageAutomationTrigger();

    const [isAutomationSettingsOpen, setIsAutomationSettingsOpen] = useState(false);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [isAddStageOpen, setIsAddStageOpen] = useState(false);
    const [newStageName, setNewStageName] = useState("");
    const [newStageColor, setNewStageColor] = useState(DEFAULT_STAGE_COLOR);
    const [editingStage, setEditingStage] = useState<Stage | null>(null);
    const [triggerStage, setTriggerStage] = useState<Stage | null>(null);
    const [stageTriggerActionType, setStageTriggerActionType] = useState<StageAutomationActionType>("create_task");
    const [stageTriggerName, setStageTriggerName] = useState(DEFAULT_STAGE_TRIGGER_NAME);
    const [stageTriggerText, setStageTriggerText] = useState(DEFAULT_STAGE_TRIGGER_TEXT);
    const [stageTriggerDelayMinutes, setStageTriggerDelayMinutes] = useState("0");
    const [stageTriggerTaskType, setStageTriggerTaskType] = useState<StageAutomationTaskType>("qayta_aloqa");
    const [stageTriggerAssigneeMode, setStageTriggerAssigneeMode] = useState<StageAutomationAssigneeMode>("lead_employee");
    const [stageTriggerTargetEmployeeId, setStageTriggerTargetEmployeeId] = useState("");
    const [stageTriggerEnabled, setStageTriggerEnabled] = useState(true);
    const [stageTriggerErrors, setStageTriggerErrors] = useState<{ name?: string; text?: string; delay?: string; targetEmployee?: string }>({});
    const [deletingTriggerId, setDeletingTriggerId] = useState<number | null>(null);
    const [creatingLeadStage, setCreatingLeadStage] = useState<Stage | null>(null);
    const [newLeadName, setNewLeadName] = useState("");
    const [newLeadPhone, setNewLeadPhone] = useState(UZBEK_PHONE_PREFIX);
    const [newLeadErrors, setNewLeadErrors] = useState<{ name?: string; phone?: string }>({});
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isLeadSheetOpen, setIsLeadSheetOpen] = useState(false);
    const [isMergingLeads, setIsMergingLeads] = useState(false);
    const [stageLeadCounts, setStageLeadCounts] = useState<Record<string, number>>({});
    const [visibleLeadsByStage, setVisibleLeadsByStage] = useState<Record<string, Lead[]>>({});
    const [horizontalScrollState, setHorizontalScrollState] = useState({
        scrollLeft: 0,
        clientWidth: 0,
        scrollWidth: 0,
        maxScroll: 0,
    });
    const [isStageHeaderDragging, setIsStageHeaderDragging] = useState(false);
    const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
    const [dragOverLeadId, setDragOverLeadId] = useState<string | null>(null);
    const [dragOverPlacement, setDragOverPlacement] = useState<DropPlacement | null>(null);
    const {
        data: pipelineAutomationTriggers = [],
        isLoading: pipelineAutomationTriggersLoading,
    } = usePipelineStageAutomationTriggers(isAutomationSettingsOpen ? pipelineId : null);

    // Scroll container ref for horizontal scrolling
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const closeLeadSheetTimeoutRef = useRef<number | null>(null);
    const stageHeaderDragRef = useRef<{
        pointerId: number;
        startX: number;
        startScrollLeft: number;
    } | null>(null);

    const isAdmin = employee?.role === "super-admin";
    const { data: triggerEmployees = [], isLoading: triggerEmployeesLoading } = useBranchEmployees(
        selectedBranchId,
        "manager"
    );
    const leadSheetEmployees = useMemo(() => {
        return triggerEmployees.map((item) => ({
            id: item.id,
            name: item.name,
            email: item.email,
        }));
    }, [triggerEmployees]);
    // For regular users, filter leads by their employee_id
    const employeeId = isAdmin ? null : employee?.id;
    const leadEmployeeId = employee?.id;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const totalLeadCount = useMemo(
        () => stages.reduce((sum, stage) => sum + (stageLeadCounts[stage.id] || 0), 0),
        [stageLeadCounts, stages]
    );
    const canUseMiniScrollbar = horizontalScrollState.maxScroll > 0;
    const miniScrollbarValue = Math.min(horizontalScrollState.scrollLeft, horizontalScrollState.maxScroll);
    const miniScrollbarSegments = useMemo(() => (
        stages.length > 0 ? stages.map((stage) => stage.id) : []
    ), [stages]);
    const miniScrollbarThumbWidthPercent = useMemo(() => {
        const { clientWidth, scrollWidth } = horizontalScrollState;

        if (clientWidth <= 0 || scrollWidth <= 0) return 100;

        return clamp((clientWidth / scrollWidth) * 100, 18, 100);
    }, [horizontalScrollState]);
    const miniScrollbarThumbLeftPercent = useMemo(() => {
        const { maxScroll } = horizontalScrollState;
        const maxThumbTravelPercent = 100 - miniScrollbarThumbWidthPercent;

        if (maxScroll <= 0 || maxThumbTravelPercent <= 0) return 0;

        return (miniScrollbarValue / maxScroll) * maxThumbTravelPercent;
    }, [horizontalScrollState, miniScrollbarThumbWidthPercent, miniScrollbarValue]);
    const visibleMergeCandidates = useMemo(() => {
        const leadsById = new Map<string, Lead>();

        Object.values(visibleLeadsByStage).forEach((leads) => {
            leads.forEach((lead) => {
                if (lead.id) {
                    leadsById.set(lead.id, lead);
                }
            });
        });

        return Array.from(leadsById.values());
    }, [visibleLeadsByStage]);

    const movingLeadId = moveLeadMutation.isPending ? moveLeadMutation.variables?.leadId || null : null;

    useEffect(() => {
        return () => {
            if (closeLeadSheetTimeoutRef.current) {
                window.clearTimeout(closeLeadSheetTimeoutRef.current);
            }
        };
    }, []);

    const updateHorizontalScrollState = useCallback(() => {
        const container = scrollContainerRef.current;

        if (!container) return;

        const scrollWidth = getHorizontalScrollWidth(container);
        const nextState = {
            scrollLeft: container.scrollLeft,
            clientWidth: container.clientWidth,
            scrollWidth,
            maxScroll: Math.max(scrollWidth - container.clientWidth, 0),
        };

        setHorizontalScrollState((prev) => (
            prev.scrollLeft === nextState.scrollLeft
                && prev.clientWidth === nextState.clientWidth
                && prev.scrollWidth === nextState.scrollWidth
                && prev.maxScroll === nextState.maxScroll
                ? prev
                : nextState
        ));
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => updateHorizontalScrollState();
        const resizeObserver = new ResizeObserver(() => updateHorizontalScrollState());
        const rafId = window.requestAnimationFrame(updateHorizontalScrollState);

        container.addEventListener("scroll", handleScroll, { passive: true });
        resizeObserver.observe(container);

        const content = container.firstElementChild;
        if (content instanceof HTMLElement) {
            resizeObserver.observe(content);
        }

        updateHorizontalScrollState();

        return () => {
            window.cancelAnimationFrame(rafId);
            container.removeEventListener("scroll", handleScroll);
            resizeObserver.disconnect();
        };
    }, [stages.length, updateHorizontalScrollState]);

    const handleStageTotalCountChange = useCallback((stageId: string, totalCount: number) => {
        setStageLeadCounts((prev) => (
            prev[stageId] === totalCount ? prev : { ...prev, [stageId]: totalCount }
        ));
    }, []);

    const handleVisibleLeadsChange = useCallback((stageId: string, leads: Lead[]) => {
        setVisibleLeadsByStage((prev) => {
            const previousLeads = prev[stageId] || [];
            const hasSameLeads = previousLeads.length === leads.length
                && previousLeads.every((previousLead, index) => previousLead === leads[index]);

            if (hasSameLeads) return prev;

            if (leads.length === 0) {
                const next = { ...prev };
                delete next[stageId];
                return next;
            }

            return { ...prev, [stageId]: leads };
        });
    }, []);

    const resetCreateLeadDialog = useCallback(() => {
        setCreatingLeadStage(null);
        setNewLeadName("");
        setNewLeadPhone(UZBEK_PHONE_PREFIX);
        setNewLeadErrors({});
    }, []);

    const handleCreateLeadPhoneChange = useCallback((value: string) => {
        setNewLeadPhone(formatUzbekPhone(value));
        setNewLeadErrors((prev) => (prev.phone ? { ...prev, phone: undefined } : prev));
    }, []);

    const stopStageHeaderDragging = useCallback(() => {
        stageHeaderDragRef.current = null;
        setIsStageHeaderDragging(false);
    }, []);

    useEffect(() => {
        if (!isStageHeaderDragging) return;

        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;
        const previousTouchAction = document.body.style.touchAction;

        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        document.body.style.touchAction = "none";

        return () => {
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            document.body.style.touchAction = previousTouchAction;
        };
    }, [isStageHeaderDragging]);

    useEffect(() => {
        if (!isStageHeaderDragging) return;

        const handlePointerMove = (event: PointerEvent) => {
            const container = scrollContainerRef.current;
            const dragState = stageHeaderDragRef.current;

            if (!container || !dragState || event.pointerId !== dragState.pointerId) {
                return;
            }

            const maxScroll = getHorizontalMaxScroll(container);
            const deltaX = event.clientX - dragState.startX;
            const nextScrollLeft = clamp(dragState.startScrollLeft - deltaX, 0, maxScroll);

            event.preventDefault();
            container.scrollTo({ left: nextScrollLeft, behavior: "auto" });
        };

        const handlePointerEnd = (event: PointerEvent) => {
            const dragState = stageHeaderDragRef.current;

            if (!dragState || event.pointerId === dragState.pointerId) {
                stopStageHeaderDragging();
            }
        };

        window.addEventListener("pointermove", handlePointerMove, { passive: false });
        window.addEventListener("pointerup", handlePointerEnd);
        window.addEventListener("pointercancel", handlePointerEnd);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerEnd);
            window.removeEventListener("pointercancel", handlePointerEnd);
        };
    }, [isStageHeaderDragging, stopStageHeaderDragging]);

    const handleStageHeaderPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const container = scrollContainerRef.current;
        if (!container || event.button !== 0) return;

        const maxScroll = getHorizontalMaxScroll(container);
        if (maxScroll <= 0) return;

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);

        stageHeaderDragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScrollLeft: container.scrollLeft,
        };
        setIsStageHeaderDragging(true);
    }, []);

    const handleMiniScrollbarChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        container.scrollTo({
            left: Number(event.target.value),
            behavior: "auto",
        });
    }, []);

    const getDragTarget = useCallback((over: DragOverEvent["over"]) => {
        if (!over) return null;

        const overData = over.data.current;

        if (overData?.type === "stage") {
            return {
                stageId: (overData.stage as Stage).id,
                leadId: null,
            };
        }

        if (overData?.type === "lead") {
            const overLead = overData.lead as Lead;

            return {
                stageId: overLead.stage_id,
                leadId: overLead.id,
            };
        }

        const overId = over.id as string;
        return stages.some((stage) => stage.id === overId)
            ? { stageId: overId, leadId: null }
            : null;
    }, [stages]);

    const resetDragPreview = useCallback(() => {
        setDragOverStageId(null);
        setDragOverLeadId(null);
        setDragOverPlacement(null);
    }, []);

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        const lead = event.active.data.current?.lead;
        setActiveLead(lead || null);
        resetDragPreview();
    };

    const handleDragOver = (event: DragOverEvent) => {
        const activeData = event.active.data.current;

        if (!activeData || activeData.type !== "lead") {
            resetDragPreview();
            return;
        }

        const lead = activeData.lead as Lead;
        const target = getDragTarget(event.over);

        if (!target || target.stageId === lead.stage_id) {
            resetDragPreview();
            return;
        }

        setDragOverStageId(target.stageId);
        setDragOverLeadId(target.leadId);
        setDragOverPlacement(() => {
            if (!target.leadId || !event.over) return null;

            const activeRect = event.active.rect.current.translated;
            const overRect = event.over.rect;

            if (!activeRect || !overRect) return "before";

            const activeMiddleY = activeRect.top + activeRect.height / 2;
            const overMiddleY = overRect.top + overRect.height / 2;

            return activeMiddleY > overMiddleY ? "after" : "before";
        });
    };

    const handleDragCancel = () => {
        setActiveLead(null);
        resetDragPreview();
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const target = getDragTarget(over);

        setActiveLead(null);
        resetDragPreview();

        if (!target) return;

        const activeData = active.data.current;

        // Check if we're dragging a lead
        if (!activeData || activeData.type !== "lead") return;
        const lead = activeData.lead as Lead;
        const activeId = active.id as string;

        // If no target stage or same stage, cancel
        if (lead.stage_id === target.stageId) return;

        // Execute move mutation
        moveLeadMutation.mutate({
            leadId: activeId,
            newStageId: target.stageId,
            oldStageId: lead.stage_id,
            pipelineId,
            employeeId,
            searchQuery: debouncedSearch,
        });
    };

    // Stage handlers
    const handleOpenCreateLead = (stage: Stage) => {
        setCreatingLeadStage(stage);
        setNewLeadName("");
        setNewLeadPhone(UZBEK_PHONE_PREFIX);
        setNewLeadErrors({});
    };

    const handleAddStage = async () => {
        if (!newStageName.trim()) return;

        await createStageMutation.mutateAsync({
            name: newStageName.trim(),
            pipeline_id: pipelineId,
            color: newStageColor,
        });

        setNewStageName("");
        setNewStageColor(DEFAULT_STAGE_COLOR);
        setIsAddStageOpen(false);
    };

    const resetStageTriggerDialog = () => {
        setTriggerStage(null);
        setStageTriggerActionType("create_task");
        setStageTriggerName(DEFAULT_STAGE_TRIGGER_NAME);
        setStageTriggerText(DEFAULT_STAGE_TRIGGER_TEXT);
        setStageTriggerDelayMinutes("0");
        setStageTriggerTaskType("qayta_aloqa");
        setStageTriggerAssigneeMode("lead_employee");
        setStageTriggerTargetEmployeeId("");
        setStageTriggerEnabled(true);
        setStageTriggerErrors({});
    };

    const handleOpenAddTrigger = (stage: Stage) => {
        setTriggerStage(stage);
        setStageTriggerActionType("create_task");
        setStageTriggerName(DEFAULT_STAGE_TRIGGER_NAME);
        setStageTriggerText(DEFAULT_STAGE_TRIGGER_TEXT);
        setStageTriggerDelayMinutes("0");
        setStageTriggerTaskType("qayta_aloqa");
        setStageTriggerAssigneeMode("lead_employee");
        setStageTriggerTargetEmployeeId("");
        setStageTriggerEnabled(true);
        setStageTriggerErrors({});
    };

    const handleStageTriggerActionChange = (actionType: StageAutomationActionType) => {
        setStageTriggerActionType(actionType);
        setStageTriggerErrors({});

        if (actionType === "change_responsible") {
            setStageTriggerName(DEFAULT_RESPONSIBLE_TRIGGER_NAME);
            setStageTriggerText("");
            setStageTriggerDelayMinutes("0");
            return;
        }

        setStageTriggerName(DEFAULT_STAGE_TRIGGER_NAME);
        setStageTriggerText(DEFAULT_STAGE_TRIGGER_TEXT);
    };

    const handleCreateStageTrigger = async () => {
        if (!triggerStage) return;

        const trimmedName = stageTriggerName.trim();
        const trimmedText = stageTriggerText.trim();
        const delayMinutes = Number(stageTriggerDelayMinutes);
        const errors: { name?: string; text?: string; delay?: string; targetEmployee?: string } = {};

        if (!trimmedName) {
            errors.name = "Trigger nomini kiriting";
        }

        if (stageTriggerActionType === "create_task" && !trimmedText) {
            errors.text = "Zadacha matnini kiriting";
        }

        if (stageTriggerActionType === "create_task" && (!Number.isInteger(delayMinutes) || delayMinutes < 0)) {
            errors.delay = "Kechikish 0 yoki undan katta butun son bo'lishi kerak";
        }

        if (stageTriggerActionType === "change_responsible" && !stageTriggerTargetEmployeeId) {
            errors.targetEmployee = "Mas'ul xodimni tanlang";
        }

        if (Object.keys(errors).length > 0) {
            setStageTriggerErrors(errors);
            return;
        }

        try {
            await createStageAutomationTriggerMutation.mutateAsync({
                pipeline_id: pipelineId,
                stage_id: triggerStage.id,
                action_type: stageTriggerActionType,
                name: trimmedName,
                delay_minutes: stageTriggerActionType === "create_task" ? delayMinutes : 0,
                task_text: stageTriggerActionType === "create_task" ? trimmedText : null,
                task_type: stageTriggerTaskType,
                assignee_mode: stageTriggerAssigneeMode,
                target_employee_id: stageTriggerActionType === "change_responsible" ? stageTriggerTargetEmployeeId : null,
                enabled: stageTriggerEnabled,
            });

            resetStageTriggerDialog();
        } catch (error) {
            console.error("Error creating stage trigger:", error);
            alert("Trigger yaratib bo'lmadi");
        }
    };

    const handleDeleteStageTrigger = async (trigger: StageAutomationTrigger) => {
        if (!confirm(`"${trigger.name}" triggerini o'chirishni xohlaysizmi?`)) return;

        setDeletingTriggerId(trigger.id);
        try {
            await deleteStageAutomationTriggerMutation.mutateAsync({
                id: trigger.id,
                stage_id: trigger.stage_id,
                pipeline_id: trigger.pipeline_id,
            });
        } catch (error) {
            console.error("Error deleting stage trigger:", error);
            alert("Triggerni o'chirib bo'lmadi");
        } finally {
            setDeletingTriggerId(null);
        }
    };

    const handleCreateLead = async () => {
        const trimmedName = newLeadName.trim();
        const errors: { name?: string; phone?: string } = {};

        if (!trimmedName) {
            errors.name = "Lid ismini kiriting";
        }

        if (!isValidUzbekPhone(newLeadPhone)) {
            errors.phone = "Telefon raqamni to'liq kiriting";
        }

        if (!creatingLeadStage) {
            errors.name = "Etap tanlanmagan";
        }

        if (!leadEmployeeId) {
            errors.name = "Xodim ma'lumoti topilmadi";
        }

        if (Object.keys(errors).length > 0) {
            setNewLeadErrors(errors);
            return;
        }

        try {
            await createLeadMutation.mutateAsync({
                name: trimmedName,
                phone: getStoredUzbekPhone(newLeadPhone),
                stage_id: creatingLeadStage!.id,
                pipeline_id: pipelineId,
                employee_id: leadEmployeeId,
            });

            resetCreateLeadDialog();
        } catch (error) {
            console.error("Error creating lead:", error);
            alert("Yangi lid yaratib bo'lmadi");
        }
    };

    const handleUpdateStage = async () => {
        if (!editingStage || !editingStage.name.trim()) return;

        await updateStageMutation.mutateAsync({
            id: editingStage.id,
            name: editingStage.name.trim(),
            color: editingStage.color,
        });

        setEditingStage(null);
    };

    const handleDeleteStage = async (stage: Stage) => {
        const stageLeadCount = stageLeadCounts[stage.id];
        if (stageLeadCount === undefined) {
            alert("Etap ma'lumotlari hali yuklanmoqda. Bir ozdan keyin qayta urinib ko'ring.");
            return;
        }

        if (stageLeadCount > 0) {
            alert("Bu etapda lidlar bor. Avval lidlarni boshqa etapga o'tkazing.");
            return;
        }

        await deleteStageMutation.mutateAsync({
            id: stage.id,
            pipelineId,
        });
    };

    // Lead sheet handlers
    const handleLeadClick = (lead: Lead) => {
        if (closeLeadSheetTimeoutRef.current) {
            window.clearTimeout(closeLeadSheetTimeoutRef.current);
            closeLeadSheetTimeoutRef.current = null;
        }
        setSelectedLead(lead);
        setIsLeadSheetOpen(true);
    };

    const handleCloseLeadSheet = () => {
        setIsLeadSheetOpen(false);
        if (closeLeadSheetTimeoutRef.current) {
            window.clearTimeout(closeLeadSheetTimeoutRef.current);
        }
        closeLeadSheetTimeoutRef.current = window.setTimeout(() => {
            setSelectedLead(null);
            closeLeadSheetTimeoutRef.current = null;
        }, 200);
    };

    const handleUpdateLead = async (leadId: string, updates: Partial<Lead>) => {
        await updateLeadMutation.mutateAsync({ id: leadId, ...updates });
        // Update selectedLead if still viewing
        if (selectedLead?.id === leadId) {
            setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
        }
    };

    const handleMergeLeads = async ({
        primaryLead,
        secondaryLead,
        primaryUpdates,
    }: LeadMergeInput) => {
        setIsMergingLeads(true);

        try {
            if (Object.keys(primaryUpdates).length > 0) {
                await updateLeadMutation.mutateAsync({ id: primaryLead.id, ...primaryUpdates });
            }

            const supabase = createClient();
            const { error: moveTasksError } = await supabase
                .from("tasks")
                .update({ lead_id: primaryLead.id })
                .eq("lead_id", secondaryLead.id);

            if (moveTasksError) {
                throw moveTasksError;
            }

            const { error: deleteLeadError } = await supabase
                .from("leads")
                .delete()
                .eq("id", secondaryLead.id)
                .select("id")
                .single();

            if (deleteLeadError) {
                throw deleteLeadError;
            }

            setSelectedLead((prev) => {
                if (!prev || prev.id !== primaryLead.id) return prev;

                const nextLead = { ...prev, ...primaryUpdates };
                if (primaryUpdates.employee_id && secondaryLead.employee) {
                    nextLead.employee = secondaryLead.employee;
                }

                return nextLead;
            });

            setVisibleLeadsByStage((prev) => {
                const next: Record<string, Lead[]> = {};

                Object.entries(prev).forEach(([stageId, leads]) => {
                    const nextLeads = leads
                        .filter((lead) => lead.id !== secondaryLead.id)
                        .map((lead) => {
                            if (lead.id !== primaryLead.id) return lead;

                            const nextLead = { ...lead, ...primaryUpdates };
                            if (primaryUpdates.employee_id && secondaryLead.employee) {
                                nextLead.employee = secondaryLead.employee;
                            }

                            return nextLead;
                        });

                    if (nextLeads.length > 0) {
                        next[stageId] = nextLeads;
                    }
                });

                return next;
            });

            setStageLeadCounts((prev) => {
                const currentCount = prev[secondaryLead.stage_id];

                if (currentCount === undefined) return prev;

                return {
                    ...prev,
                    [secondaryLead.stage_id]: Math.max(0, currentCount - 1),
                };
            });

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: leadKeys.byPipeline(primaryLead.pipeline_id) }),
                queryClient.invalidateQueries({ queryKey: stageLeadKeys.base }),
                queryClient.invalidateQueries({ queryKey: taskKeys.byLead(primaryLead.id) }),
                queryClient.invalidateQueries({ queryKey: taskKeys.byLead(secondaryLead.id) }),
            ]);
        } finally {
            setIsMergingLeads(false);
        }
    };

    // Loading state
    if (employeeLoading || pipelineLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (employeeError || pipelineError || stagesError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-6">
                <div className="max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
                    <p className="text-sm font-medium text-foreground">Sahifa ma&apos;lumotlarini yuklashda xato bo&apos;ldi</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {stagesError?.message || pipelineError?.message || employeeError?.message || "Noma&apos;lum xato"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {isAutomationSettingsOpen ? (
                <StageAutomationSettingsBoard
                    pipelineName={pipeline?.name}
                    stages={stages}
                    triggers={pipelineAutomationTriggers}
                    employees={triggerEmployees}
                    isLoading={stagesLoading || pipelineAutomationTriggersLoading || triggerEmployeesLoading}
                    onBack={() => setIsAutomationSettingsOpen(false)}
                    onSave={() => setIsAutomationSettingsOpen(false)}
                    onAddTrigger={handleOpenAddTrigger}
                    onDeleteTrigger={handleDeleteStageTrigger}
                    deletingTriggerId={deletingTriggerId}
                />
            ) : (
                <>
                    {/* Header */}
                    <div className="flex-shrink-0 p-4 border-b border-border bg-background">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push("/pipelines")}
                                    className="h-9 w-9"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h1 className="text-xl font-semibold text-foreground">
                                        {pipeline?.name || "Pipeline"}
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        {totalLeadCount} ta lid | {stages.length} ta etap
                                        {!isAdmin && " | Faqat mening lidlarim"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Ism, telefon bo'yicha qidirish..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-card border-border"
                                    />
                                    {searchQuery && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => setSearchQuery("")}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>

                                {/* Add Stage Button (Admin only) */}
                                {isAdmin && (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsAutomationSettingsOpen(true)}
                                            className="border-border bg-card text-foreground hover:bg-accent"
                                        >
                                            <Settings2 className="h-4 w-4 mr-2" />
                                            Sozlash
                                        </Button>
                                        <Button onClick={() => setIsAddStageOpen(true)} className="btn-primary">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Kanban Board */}
                    <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-hidden p-4">
                        {stagesLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : stages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <p className="text-lg font-medium text-foreground mb-2">
                                        Hali etap yo&apos;q
                                    </p>
                                    <p className="text-muted-foreground mb-4">
                                        Lidlarni boshqarish uchun etap yaratish
                                    </p>
                                    {isAdmin && (
                                        <Button onClick={() => setIsAddStageOpen(true)} className="btn-primary">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Birinchi etap yaratish
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCorners}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragCancel={handleDragCancel}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="flex gap-3 h-full pb-4">
                                    {stages.map((stage) => (
                                        <StageColumn
                                            key={stage.id}
                                            stage={stage}
                                            pipelineId={pipelineId}
                                            employeeId={employeeId}
                                            searchQuery={debouncedSearch}
                                            isAdmin={isAdmin}
                                            onCreateLead={handleOpenCreateLead}
                                            onEditStage={setEditingStage}
                                            onAddTrigger={handleOpenAddTrigger}
                                            onDeleteStage={handleDeleteStage}
                                            onLeadClick={handleLeadClick}
                                            movingLeadId={movingLeadId}
                                            activeLead={activeLead}
                                            dragOverStageId={dragOverStageId}
                                            dragOverLeadId={dragOverLeadId}
                                            dragOverPlacement={dragOverPlacement}
                                            canDragStageHeader={stages.length > 1}
                                            isStageHeaderDragging={isStageHeaderDragging}
                                            onStageHeaderPointerDown={handleStageHeaderPointerDown}
                                            onTotalCountChange={handleStageTotalCountChange}
                                            onVisibleLeadsChange={handleVisibleLeadsChange}
                                        />
                                    ))}
                                </div>

                                {/* Drag Overlay */}
                                <DragOverlay>
                                    {activeLead && <LeadCard lead={activeLead} isDragOverlay />}
                                </DragOverlay>
                            </DndContext>
                        )}
                    </div>

                    {/* Mini Horizontal Scrollbar */}
                    <div className="fixed bottom-6 right-6 z-50">
                        <div
                            className="relative h-10 w-40 select-none rounded-[4px] border border-emerald-400/70 bg-[#10211e] p-1 shadow-lg"
                            title="Etaplar bo'yicha surish"
                        >

                            <div className="absolute inset-1 flex gap-1">
                                {miniScrollbarSegments.map((segmentId, index) => (
                                    <div
                                        key={`${segmentId}-${index}`}
                                        className="min-w-1 flex-1 rounded-[2px] bg-emerald-200/20"
                                    />
                                ))}
                            </div>
                            <div
                                className="absolute inset-y-1 rounded-[3px] border border-emerald-300/70 bg-emerald-400/25 shadow-[0_0_10px_rgba(16,185,129,0.24)]"
                                style={{
                                    left: `${miniScrollbarThumbLeftPercent}2%`,
                                    width: `${miniScrollbarThumbWidthPercent}%`,
                                }}
                            />
                            <input
                                type="range"
                                min={0}
                                max={horizontalScrollState.maxScroll}
                                value={miniScrollbarValue}
                                onChange={handleMiniScrollbarChange}
                                onPointerDown={() => updateHorizontalScrollState()}
                                aria-label="Etaplar bo'yicha gorizontal surish"
                                className="absolute inset-0 h-full w-full cursor-grab opacity-0"
                                style={{ accentColor: "var(--primary)" }}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Add Stage Dialog */}
            <Dialog open={isAddStageOpen} onOpenChange={setIsAddStageOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Yangi etape qo&apos;shish</DialogTitle>
                        <DialogDescription>
                            Kanban taxtasi uchun yangi etap yaratish
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Etap nomi <span className="text-destructive">*</span>
                            </label>
                            <Input
                                placeholder="Masalan: Yangi, Jarayonda, Yakunlangan"
                                value={newStageName}
                                onChange={(e) => setNewStageName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddStage();
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rang</label>
                            <div className="flex gap-2 flex-wrap">
                                {STAGE_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setNewStageColor(color)}
                                        className={`h-8 w-8 rounded-full border-2 transition-all ${newStageColor === color
                                            ? "border-foreground scale-110"
                                            : "border-transparent"
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddStageOpen(false)}>
                            Bekor qilish
                        </Button>
                        <Button
                            onClick={handleAddStage}
                            disabled={!newStageName.trim() || createStageMutation.isPending}
                            className="btn-primary"
                        >
                            {createStageMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Plus className="h-4 w-4 mr-2" />
                            )}
                            Qo&apos;shish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Stage Trigger Dialog */}
            <Dialog
                open={!!triggerStage}
                onOpenChange={(open) => {
                    if (!open) resetStageTriggerDialog();
                }}
            >
                <DialogContent className="bg-card border-border sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Trigger qo&apos;shish{triggerStage ? `: ${triggerStage.name}` : ""}
                        </DialogTitle>
                        <DialogDescription className="hidden" />
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {STAGE_TRIGGER_ACTION_TYPES.map((action) => {
                                const Icon = action.icon;
                                const isSelected = stageTriggerActionType === action.value;

                                return (
                                    <button
                                        key={action.value}
                                        type="button"
                                        onClick={() => handleStageTriggerActionChange(action.value)}
                                        className={`rounded-md border p-4 text-left transition-colors ${isSelected
                                            ? "border-primary bg-primary/10 text-foreground"
                                            : "border-border bg-background hover:border-primary/40 hover:bg-accent/60"
                                            }`}
                                    >
                                        <Icon className={`mb-3 h-7 w-7 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                        <span className="text-sm font-medium">{action.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Trigger nomi <span className="text-destructive">*</span>
                            </label>
                            <Input
                                value={stageTriggerName}
                                onChange={(e) => {
                                    setStageTriggerName(e.target.value);
                                    setStageTriggerErrors((prev) => (prev.name ? { ...prev, name: undefined } : prev));
                                }}
                            />
                            {stageTriggerErrors.name && (
                                <p className="text-sm text-destructive">{stageTriggerErrors.name}</p>
                            )}
                        </div>

                        {stageTriggerActionType === "create_task" ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Zadacha matni <span className="text-destructive">*</span>
                                    </label>
                                    <Textarea
                                        value={stageTriggerText}
                                        onChange={(e) => {
                                            setStageTriggerText(e.target.value);
                                            setStageTriggerErrors((prev) => (prev.text ? { ...prev, text: undefined } : prev));
                                        }}
                                        className="min-h-24"
                                    />
                                    {stageTriggerErrors.text && (
                                        <p className="text-sm text-destructive">{stageTriggerErrors.text}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Kechikish (daqiqa)</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={stageTriggerDelayMinutes}
                                            onChange={(e) => {
                                                setStageTriggerDelayMinutes(e.target.value);
                                                setStageTriggerErrors((prev) => (prev.delay ? { ...prev, delay: undefined } : prev));
                                            }}
                                        />
                                        {stageTriggerErrors.delay && (
                                            <p className="text-sm text-destructive">{stageTriggerErrors.delay}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Zadacha turi</label>
                                        <Select
                                            value={stageTriggerTaskType}
                                            onValueChange={(value) => setStageTriggerTaskType(value as StageAutomationTaskType)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STAGE_TRIGGER_TASK_TYPES.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Biriktirish</label>
                                    <Select
                                        value={stageTriggerAssigneeMode}
                                        onValueChange={(value) => setStageTriggerAssigneeMode(value as StageAutomationAssigneeMode)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STAGE_TRIGGER_ASSIGNEE_MODES.map((mode) => (
                                                <SelectItem key={mode.value} value={mode.value}>
                                                    {mode.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Yangi mas&apos;ul <span className="text-destructive">*</span>
                                </label>
                                <Select
                                    value={stageTriggerTargetEmployeeId || undefined}
                                    onValueChange={(value) => {
                                        setStageTriggerTargetEmployeeId(value);
                                        setStageTriggerErrors((prev) => (
                                            prev.targetEmployee ? { ...prev, targetEmployee: undefined } : prev
                                        ));
                                    }}
                                    disabled={triggerEmployeesLoading}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={triggerEmployeesLoading ? "Yuklanmoqda..." : "Xodim tanlang"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {triggerEmployees.map((emp) => (
                                            <SelectItem key={emp.id} value={String(emp.id)}>
                                                {emp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {stageTriggerErrors.targetEmployee && (
                                    <p className="text-sm text-destructive">{stageTriggerErrors.targetEmployee}</p>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                            <label className="text-sm font-medium">Faol</label>
                            <Switch checked={stageTriggerEnabled} onCheckedChange={setStageTriggerEnabled} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={resetStageTriggerDialog}>
                            Bekor qilish
                        </Button>
                        <Button
                            onClick={handleCreateStageTrigger}
                            disabled={
                                createStageAutomationTriggerMutation.isPending
                                || !stageTriggerName.trim()
                                || (stageTriggerActionType === "create_task" && !stageTriggerText.trim())
                                || (stageTriggerActionType === "change_responsible" && !stageTriggerTargetEmployeeId)
                            }
                            className="btn-primary"
                        >
                            {createStageAutomationTriggerMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <BellPlus className="h-4 w-4 mr-2" />
                            )}
                            Saqlash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Stage Dialog */}
            <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Etap tahrirlash</DialogTitle>
                        <DialogDescription>Etap nomini va rangini o&apos;zgartiring</DialogDescription>
                    </DialogHeader>
                    {editingStage && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Etap nomi <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    value={editingStage.name}
                                    onChange={(e) =>
                                        setEditingStage({ ...editingStage, name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rang</label>
                                <div className="flex gap-2 flex-wrap">
                                    {STAGE_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() =>
                                                setEditingStage({ ...editingStage, color })
                                            }
                                            className={`h-8 w-8 rounded-full border-2 transition-all ${editingStage.color === color
                                                ? "border-foreground scale-110"
                                                : "border-transparent"
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingStage(null)}>
                            Bekor qilish
                        </Button>
                        <Button
                            onClick={handleUpdateStage}
                            disabled={
                                !editingStage?.name.trim() || updateStageMutation.isPending
                            }
                            className="btn-primary"
                        >
                            {updateStageMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            Saqlash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Lead Dialog */}
            <Dialog open={!!creatingLeadStage} onOpenChange={(open) => { if (!open) resetCreateLeadDialog(); }}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Yangi lid yaratish</DialogTitle>
                        <DialogDescription>
                            {creatingLeadStage
                                ? `${creatingLeadStage.name} etap uchun yangi lid qo'shing`
                                : "Yangi lid ma'lumotlarini kiriting"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Lid ismi <span className="text-destructive">*</span>
                            </label>
                            <Input
                                placeholder="Masalan: Ali Valiyev"
                                value={newLeadName}
                                onChange={(e) => {
                                    setNewLeadName(e.target.value);
                                    setNewLeadErrors((prev) => (prev.name ? { ...prev, name: undefined } : prev));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        void handleCreateLead();
                                    }
                                }}
                            />
                            {newLeadErrors.name && (
                                <p className="text-sm text-destructive">{newLeadErrors.name}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Telefon raqam <span className="text-destructive">*</span>
                            </label>
                            <Input
                                placeholder="+998 90 123 45 67"
                                value={newLeadPhone}
                                onChange={(e) => handleCreateLeadPhoneChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        void handleCreateLead();
                                    }
                                }}
                                inputMode="tel"
                            />
                            {newLeadErrors.phone && (
                                <p className="text-sm text-destructive">{newLeadErrors.phone}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={resetCreateLeadDialog}>
                            Bekor qilish
                        </Button>
                        <Button
                            onClick={() => void handleCreateLead()}
                            disabled={createLeadMutation.isPending}
                            className="btn-primary"
                        >
                            {createLeadMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Plus className="h-4 w-4 mr-2" />
                            )}
                            Yaratish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lead Details Sheet */}
            {selectedLead && (
                <LeadSheet
                    lead={selectedLead}
                    isOpen={isLeadSheetOpen}
                    onClose={handleCloseLeadSheet}
                    stages={stages}
                    onUpdateLead={handleUpdateLead}
                    employees={leadSheetEmployees}
                    mergeCandidates={visibleMergeCandidates}
                    onMergeLeads={handleMergeLeads}
                    isUpdating={updateLeadMutation.isPending}
                    isMerging={isMergingLeads}
                />
            )}
        </div>
    );
}
