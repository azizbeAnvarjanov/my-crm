"use client";

import { useState, useEffect, useMemo } from "react"
import { X, Save, Loader2, User, Phone, MapPin, Calendar, Hash, Plus, Edit2, Trash2, PhoneCall, Play, Pause, StickyNote, PhoneIncoming, PhoneOutgoing, Check, Clock, AlertCircle, History, MessageSquare, GitBranch, UserCog, ListChecks, CheckCircle2, RotateCcw, FileText, GitMerge, Search, ChevronsUpDown, GraduationCap, IdCard, Wallet, type LucideIcon } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Lead, Stage } from "@/hooks/use-pipeline";
import { useTasksByLead, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus, TASK_TYPES, type Task, type TaskType } from "@/hooks/use-tasks";
import { useEmployee } from "@/hooks/use-employee";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FACULTY_OPTIONS, UZBEKISTAN_REGIONS } from "@/lib/lead-options";
import { getLeadDuplicateFieldLabels } from "@/lib/lead-duplicates";
import { Call, getCallStatusLabel, normalizeCallRow } from "@/hooks/use-calls";
import { useCreateLeadTimelineNote, useLeadTimelineEvents, type LeadTimelineEvent, type LeadTimelineMetadata } from "@/hooks/use-lead-timeline";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface LeadSheetProps {
    lead: Lead | null;
    isOpen: boolean;
    onClose: () => void;
    stages: Stage[];
    onUpdateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
    employees?: LeadSheetEmployee[];
    mergeCandidates?: Lead[];
    onMergeLeads?: (input: LeadMergeInput) => Promise<void>;
    isUpdating?: boolean;
    isMerging?: boolean;
}

type LeadSheetEmployee = {
    id: string;
    name: string;
    email?: string;
};

type LeadUpdate = Partial<Omit<Lead, "date_of_year">> & {
    date_of_year?: string | null;
};

export type LeadMergeInput = {
    primaryLead: Lead;
    secondaryLead: Lead;
    primaryUpdates: Partial<Lead>;
};

type TimelineComposerMode = "note" | "task";

type TimelineItem = {
    id: string;
    eventType: string;
    title: string;
    body: string | null;
    occurredAt: string;
    actorName?: string | null;
    employeeName?: string | null;
    metadata?: LeadTimelineMetadata;
    call?: Call;
};

type TimelineFieldChange = {
    field?: unknown;
    label?: unknown;
    old?: unknown;
    new?: unknown;
};

function formatTimelineDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return `${date.toLocaleDateString("uz-UZ")} ${date.toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
    })}`;
}

function formatTimelineValue(value: unknown): string {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

function getTimelineChanges(metadata?: LeadTimelineMetadata): TimelineFieldChange[] {
    const changes = metadata?.changes;
    return Array.isArray(changes) ? changes : [];
}

function getTimelineItemStyle(eventType: string, call?: Call): {
    Icon: LucideIcon;
    iconClassName: string;
    badgeClassName: string;
} {
    if (call) {
        if (!call.answered) {
            return {
                Icon: PhoneCall,
                iconClassName: "border-red-500/40 bg-red-500/10 text-red-500",
                badgeClassName: "border-red-500/40 text-red-500",
            };
        }

        if (call.direction === "incoming") {
            return {
                Icon: PhoneIncoming,
                iconClassName: "border-blue-500/40 bg-blue-500/10 text-blue-500",
                badgeClassName: "border-blue-500/40 text-blue-500",
            };
        }

        return {
            Icon: PhoneOutgoing,
            iconClassName: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
            badgeClassName: "border-emerald-500/40 text-emerald-500",
        };
    }

    switch (eventType) {
        case "lead_created":
            return {
                Icon: History,
                iconClassName: "border-sky-500/40 bg-sky-500/10 text-sky-500",
                badgeClassName: "border-sky-500/40 text-sky-500",
            };
        case "stage_changed":
            return {
                Icon: GitBranch,
                iconClassName: "border-amber-500/40 bg-amber-500/10 text-amber-500",
                badgeClassName: "border-amber-500/40 text-amber-500",
            };
        case "responsible_changed":
            return {
                Icon: UserCog,
                iconClassName: "border-violet-500/40 bg-violet-500/10 text-violet-500",
                badgeClassName: "border-violet-500/40 text-violet-500",
            };
        case "task_created":
            return {
                Icon: ListChecks,
                iconClassName: "border-orange-500/40 bg-orange-500/10 text-orange-500",
                badgeClassName: "border-orange-500/40 text-orange-500",
            };
        case "task_completed":
            return {
                Icon: CheckCircle2,
                iconClassName: "border-green-500/40 bg-green-500/10 text-green-500",
                badgeClassName: "border-green-500/40 text-green-500",
            };
        case "task_reopened":
            return {
                Icon: RotateCcw,
                iconClassName: "border-yellow-500/40 bg-yellow-500/10 text-yellow-500",
                badgeClassName: "border-yellow-500/40 text-yellow-500",
            };
        case "note_added":
            return {
                Icon: MessageSquare,
                iconClassName: "border-cyan-500/40 bg-cyan-500/10 text-cyan-500",
                badgeClassName: "border-cyan-500/40 text-cyan-500",
            };
        default:
            return {
                Icon: FileText,
                iconClassName: "border-muted-foreground/30 bg-muted text-muted-foreground",
                badgeClassName: "border-muted-foreground/30 text-muted-foreground",
            };
    }
}

function LeadTimelineItemCard({ item }: { item: TimelineItem }) {
    const style = getTimelineItemStyle(item.eventType, item.call);
    const Icon = style.Icon;
    const changes = getTimelineChanges(item.metadata);
    const badgeText = item.call ? getCallStatusLabel(item.call) : item.eventType.replaceAll("_", " ");

    return (
        <div className="relative flex gap-3">
            <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${style.iconClassName}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="mt-2 h-full w-px bg-border" />
            </div>

            <div className="min-w-0 flex-1 rounded-md border border-border bg-card/70 p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatTimelineDateTime(item.occurredAt)}
                            {item.actorName ? ` dan ${item.actorName}` : ""}
                            {!item.actorName && item.employeeName ? ` uchun ${item.employeeName}` : ""}
                        </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${style.badgeClassName}`}>
                        {badgeText}
                    </Badge>
                </div>

                {item.body && (
                    <p className="mt-2 break-words text-sm text-foreground/90">{item.body}</p>
                )}

                {changes.length > 0 && (
                    <div className="mt-3 space-y-1.5 rounded-md bg-muted/40 p-2">
                        {changes.slice(0, 4).map((change, index) => (
                            <div key={`${formatTimelineValue(change.field)}-${index}`} className="text-xs">
                                <span className="font-medium">
                                    {formatTimelineValue(change.label || change.field)}
                                </span>
                                <span className="text-muted-foreground">
                                    {`: ${formatTimelineValue(change.old)} -> ${formatTimelineValue(change.new)}`}
                                </span>
                            </div>
                        ))}
                        {changes.length > 4 && (
                            <p className="text-xs text-muted-foreground">Yana {changes.length - 4} ta maydon</p>
                        )}
                    </div>
                )}

                {item.call && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.call.direction === "incoming" ? "Kiruvchi" : "Chiquvchi"}</span>
                        <span>{formatDuration(item.call.duration)}</span>
                        {item.call.record_url && <span>Yozuv bor</span>}
                    </div>
                )}
            </div>
        </div>
    );
}

function getCallPhoneVariants(phone: string): string[] {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return [];

    const variants = new Set<string>();
    variants.add(digits);

    if (digits.startsWith("998") && digits.length >= 12) {
        variants.add(digits.slice(3));
    }

    if (digits.length > 9) {
        variants.add(digits.slice(-9));
    }

    return Array.from(variants).filter(Boolean);
}

const UZ_PHONE_LOCAL_LENGTH = 9;

function getUzPhoneLocalDigits(value?: string | null): string {
    const digits = String(value ?? "").replace(/\D/g, "");
    const withoutCountryCode = digits.startsWith("998") ? digits.slice(3) : digits;

    return withoutCountryCode.slice(0, UZ_PHONE_LOCAL_LENGTH);
}

function formatUzPhone(value?: string | null): string {
    const localDigits = getUzPhoneLocalDigits(value);

    if (!localDigits) {
        return "+998 ";
    }

    const parts = [
        localDigits.slice(0, 2),
        localDigits.slice(2, 5),
        localDigits.slice(5, 7),
        localDigits.slice(7, 9),
    ].filter(Boolean);

    return `+998 ${parts.join(" ")}`;
}

function formatOptionalUzPhone(value?: string | null): string {
    const localDigits = getUzPhoneLocalDigits(value);
    if (localDigits) return formatUzPhone(value);

    const textValue = String(value ?? "");
    const digits = textValue.replace(/\D/g, "");

    return textValue.startsWith("+998") || digits === "998" ? "+998 " : "";
}

function getSavableUzPhone(value?: string | null): string {
    return getUzPhoneLocalDigits(value) ? formatUzPhone(value) : "";
}

function hasCompleteUzPhone(value?: string | null): boolean {
    return getUzPhoneLocalDigits(value).length === UZ_PHONE_LOCAL_LENGTH;
}

function getTodayDateValue(): string {
    return new Date().toISOString().split("T")[0];
}

type SearchableSelectOption = {
    value: string;
    label: string;
    description?: string;
};

const LOCATION_SELECT_OPTIONS = UZBEKISTAN_REGIONS.map((location) => ({
    value: location,
    label: location,
}));

const FACULTY_SELECT_OPTIONS = FACULTY_OPTIONS.map((faculty) => ({
    value: faculty,
    label: faculty,
}));

function SearchableSelect({
    id,
    value,
    options,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    onChange,
    disabled = false,
}: {
    id: string;
    value?: string | null;
    options: SearchableSelectOption[];
    placeholder: string;
    searchPlaceholder: string;
    emptyMessage: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const selectedOption = options.find((option) => option.value === value);
    const normalizedSearch = searchValue.trim().toLowerCase();
    const filteredOptions = normalizedSearch
        ? options.filter((option) => (
            option.label.toLowerCase().includes(normalizedSearch)
            || option.value.toLowerCase().includes(normalizedSearch)
            || option.description?.toLowerCase().includes(normalizedSearch)
        ))
        : options;

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setSearchValue("");
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between px-3 font-normal"
                >
                    <span className={cn("truncate", !selectedOption && !value && "text-muted-foreground")}>
                        {selectedOption?.label || value || placeholder}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                <div className="border-b p-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="h-9 pl-8"
                        />
                    </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                    {filteredOptions.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
                    ) : (
                        filteredOptions.map((option) => {
                            const isSelected = option.value === value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                        setSearchValue("");
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent",
                                        isSelected && "bg-accent"
                                    )}
                                >
                                    <Check className={cn("h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                    {option.description && (
                                        <span className="shrink-0 text-xs text-muted-foreground">{option.description}</span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

type FillableLeadField = "name" | "location" | "age" | "gender" | "date_of_year" | "utm" | "employee_id" | "status" | "budget" | "passport_series" | "jshshr" | "fakultet";

const FILLABLE_LEAD_FIELDS: FillableLeadField[] = [
    "name",
    "location",
    "age",
    "gender",
    "date_of_year",
    "utm",
    "employee_id",
    "status",
    "budget",
    "passport_series",
    "jshshr",
    "fakultet",
];

function isMissingLeadValue(value: unknown): boolean {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function normalizeComparablePhone(value?: string | null): string {
    const digits = String(value ?? "").replace(/\D/g, "");
    const withoutCountryCode = digits.startsWith("998") ? digits.slice(3) : digits;

    return withoutCountryCode.slice(-UZ_PHONE_LOCAL_LENGTH);
}

function isSamePhone(left?: string | null, right?: string | null): boolean {
    const leftPhone = normalizeComparablePhone(left);
    const rightPhone = normalizeComparablePhone(right);

    return Boolean(leftPhone && rightPhone && leftPhone === rightPhone);
}

function assignLeadUpdate(updates: Partial<Lead>, field: keyof Lead, value: unknown) {
    (updates as Record<string, unknown>)[field] = value;
}

function addMissingFieldUpdates(target: Lead, source: Lead, updates: Partial<Lead>) {
    FILLABLE_LEAD_FIELDS.forEach((field) => {
        const targetValue = target[field];
        const sourceValue = source[field];

        if (isMissingLeadValue(targetValue) && !isMissingLeadValue(sourceValue)) {
            assignLeadUpdate(updates, field, sourceValue);
        }
    });
}

function getPhoneMergeUpdates(target: Lead, source: Lead): Partial<Lead> {
    const updates: Partial<Lead> = {};
    const sourcePhones = [source.phone, source.phone_2].filter((phone) => !isMissingLeadValue(phone));

    if (isMissingLeadValue(target.phone)) {
        const nextPhone = sourcePhones[0];
        if (nextPhone) {
            updates.phone = nextPhone;
        }
    }

    const primaryPhone = updates.phone || target.phone;
    if (isMissingLeadValue(target.phone_2)) {
        const nextSecondaryPhone = sourcePhones.find((phone) => !isSamePhone(phone, primaryPhone));
        if (nextSecondaryPhone) {
            updates.phone_2 = nextSecondaryPhone;
        }
    }

    return updates;
}

function getLeadMergeUpdates(primaryLead: Lead, secondaryLead: Lead) {
    const primaryUpdates = getPhoneMergeUpdates(primaryLead, secondaryLead);

    addMissingFieldUpdates(primaryLead, secondaryLead, primaryUpdates);

    return primaryUpdates;
}

function getMergeLeadLabel(lead: Lead) {
    return lead.name || lead.phone || `#${lead.id}`;
}

export function LeadSheet({
    lead,
    isOpen,
    onClose,
    stages,
    onUpdateLead,
    employees = [],
    mergeCandidates = [],
    onMergeLeads,
    isUpdating = false,
    isMerging = false,
}: LeadSheetProps) {
    const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
    const [leadFieldErrors, setLeadFieldErrors] = useState<Record<string, string>>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [calls, setCalls] = useState<Call[]>([]);
    const [loadingCalls, setLoadingCalls] = useState(false);
    const [playingCallId, setPlayingCallId] = useState<string | null>(null);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [audioProgress, setAudioProgress] = useState<{ [key: string]: { current: number; duration: number } }>({});

    const [newTaskText, setNewTaskText] = useState("");
    const [newTaskDate, setNewTaskDate] = useState("");
    const [newTaskTime, setNewTaskTime] = useState("");
    const [newTaskType, setNewTaskType] = useState<TaskType>("qayta_aloqa");
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
    const [taskResult, setTaskResult] = useState("");
    const [timelineComposerMode, setTimelineComposerMode] = useState<TimelineComposerMode>("note");
    const [timelineNote, setTimelineNote] = useState("");
    const [timelineTaskType, setTimelineTaskType] = useState<TaskType>("qayta_aloqa");
    const [timelineTaskDate, setTimelineTaskDate] = useState(getTodayDateValue());
    const [timelineTaskTime, setTimelineTaskTime] = useState("");
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
    const [mergeSearch, setMergeSearch] = useState("");
    const [selectedMergeLeadId, setSelectedMergeLeadId] = useState("");
    const [mergeError, setMergeError] = useState("");

    const { data: employee } = useEmployee();
    const { data: tasks = [], isLoading: tasksLoading } = useTasksByLead(lead?.id || "");
    const { data: timelineEvents = [], isLoading: timelineLoading } = useLeadTimelineEvents(lead?.id);
    const createTaskMutation = useCreateTask();
    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();
    const toggleTaskMutation = useToggleTaskStatus();
    const createTimelineNoteMutation = useCreateLeadTimelineNote();

    const today = getTodayDateValue();
    const todayPendingTasks = useMemo(() => tasks.filter(t => !t.status && t.date === today), [tasks, today]);
    const pendingTasks = useMemo(() => tasks.filter(t => !t.status), [tasks]);
    const completedTasks = useMemo(() => tasks.filter(t => t.status), [tasks]);
    const timelineItems = useMemo(() => {
        const eventItems: TimelineItem[] = timelineEvents.map((event: LeadTimelineEvent) => ({
            id: `event-${event.id}`,
            eventType: event.event_type,
            title: event.title,
            body: event.body,
            occurredAt: event.occurred_at || event.created_at,
            actorName: event.actor?.name,
            employeeName: event.employee?.name,
            metadata: event.metadata,
        }));

        const callItems: TimelineItem[] = calls.map((call) => ({
            id: `call-${call.id}`,
            eventType: call.answered ? `call_${call.direction}` : "call_missed",
            title: call.direction === "incoming" ? "Kiruvchi qo'ng'iroq" : "Chiquvchi qo'ng'iroq",
            body: call.phone || null,
            occurredAt: call.called_at || call.created_at,
            call,
        }));

        return [...eventItems, ...callItems]
            .filter((item) => item.occurredAt)
            .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
    }, [calls, timelineEvents]);
    const availableMergeCandidates = useMemo(() => {
        const seen = new Set<string>();

        return mergeCandidates.filter((candidate) => {
            if (!candidate.id || candidate.id === lead?.id || seen.has(candidate.id)) return false;

            seen.add(candidate.id);
            return true;
        });
    }, [lead?.id, mergeCandidates]);
    const filteredMergeCandidates = useMemo(() => {
        const search = mergeSearch.trim().toLowerCase();

        if (!search) return availableMergeCandidates;

        return availableMergeCandidates.filter((candidate) => (
            candidate.name?.toLowerCase().includes(search)
            || candidate.phone?.toLowerCase().includes(search)
            || candidate.phone_2?.toLowerCase().includes(search)
            || candidate.location?.toLowerCase().includes(search)
        ));
    }, [availableMergeCandidates, mergeSearch]);
    const selectedMergeLead = useMemo(
        () => availableMergeCandidates.find((candidate) => candidate.id === selectedMergeLeadId) || null,
        [availableMergeCandidates, selectedMergeLeadId]
    );
    const duplicateFieldLabels = useMemo(
        () => getLeadDuplicateFieldLabels(lead?.duplicate_fields),
        [lead?.duplicate_fields]
    );
    const isMergeSubmitting = isMerging || createTimelineNoteMutation.isPending;
    const canOpenMergeDialog = Boolean(onMergeLeads && availableMergeCandidates.length > 0 && !hasChanges && !isUpdating && !isMergeSubmitting);
    const employeeSelectOptions = useMemo<SearchableSelectOption[]>(() => {
        const optionsById = new Map<string, SearchableSelectOption>();

        employees.forEach((item) => {
            if (!item.id) return;
            optionsById.set(item.id, {
                value: item.id,
                label: item.name,
                description: item.email,
            });
        });

        return Array.from(optionsById.values()).sort((left, right) => left.label.localeCompare(right.label));
    }, [employees]);

    useEffect(() => {
        if (lead) {
            setEditedLead({
                name: lead.name,
                phone: formatUzPhone(lead.phone),
                phone_2: formatOptionalUzPhone(lead.phone_2),
                budget: lead.budget ?? null,
                passport_series: lead.passport_series || "",
                jshshr: lead.jshshr ?? null,
                location: lead.location || "",
                fakultet: lead.fakultet || "",
                age: lead.age,
                gender: lead.gender || "",
                date_of_year: lead.date_of_year || "",
                utm: lead.utm || "",
                stage_id: lead.stage_id,
                employee_id: lead.employee_id || "",
            });
            setHasChanges(false);
            setLeadFieldErrors({});
            setTimelineNote("");
            setTimelineComposerMode("note");
            setTimelineTaskType("qayta_aloqa");
            setTimelineTaskDate(getTodayDateValue());
            setTimelineTaskTime("");
            setIsMergeDialogOpen(false);
            setMergeSearch("");
            setSelectedMergeLeadId("");
            setMergeError("");
        }
    }, [lead]);

    useEffect(() => {
        if (lead?.phone) {
            fetchCalls(lead.phone);
        } else {
            setCalls([]);
        }
    }, [lead?.phone]);

    useEffect(() => {
        return () => {
            if (audioElement) {
                audioElement.pause();
                audioElement.src = "";
            }
        };
    }, [audioElement]);

    const fetchCalls = async (phone: string) => {
        setLoadingCalls(true);
        try {
            const supabase = createClient();
            const phoneVariants = getCallPhoneVariants(phone);
            if (phoneVariants.length === 0) {
                setCalls([]);
                return;
            }

            const phoneFilters = phoneVariants.flatMap((value) => [
                `phone.eq.${value}`,
                `caller.eq.${value}`,
                `callee.eq.${value}`,
            ]);

            const { data, error } = await supabase
                .from("calls")
                .select("*")
                .or(phoneFilters.join(","))
                .order("called_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            setCalls((data || []).map(normalizeCallRow));
        } catch (error) {
            console.error("Error fetching calls:", error);
        } finally {
            setLoadingCalls(false);
        }
    };

    // MicroSIP orqali qo'ng'iroq qilish
    const handleCall = (phoneNumber: string) => {
        let clean = phoneNumber.replace(/[\s\-().]/g, "");
        if (clean.startsWith("+998")) {
            clean = clean.slice(4);
        } else if (clean.startsWith("998")) {
            clean = clean.slice(3);
        }
        window.location.href = `sip:${clean}`;
    };

    const handleFieldChange = <K extends keyof Lead>(field: K, value: Lead[K]) => {
        setEditedLead(prev => ({ ...prev, [field]: value }));
        setLeadFieldErrors((prev) => {
            const fieldName = String(field);
            if (!prev[fieldName]) return prev;

            const next = { ...prev };
            delete next[fieldName];
            return next;
        });
        setHasChanges(true);
    };

    const handlePhoneFieldChange = (field: "phone" | "phone_2", value: string) => {
        handleFieldChange(field, formatUzPhone(value));
    };

    const handleBudgetChange = (value: string) => {
        const normalizedValue = value.replace(",", ".");
        handleFieldChange("budget", normalizedValue === "" ? null : Number(normalizedValue));
    };

    const handlePassportSeriesChange = (value: string) => {
        const normalizedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
        handleFieldChange("passport_series", normalizedValue);
    };

    const handleJshshrChange = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, 14);
        handleFieldChange("jshshr", digits);
    };

    const handlePhoneFocus = (field: "phone" | "phone_2") => {
        const currentValue = editedLead[field];
        if (getUzPhoneLocalDigits(currentValue).length > 0) return;

        setEditedLead(prev => ({ ...prev, [field]: "+998 " }));
    };

    const handleSave = async () => {
        if (!lead || !hasChanges) return;

        const cleanedData: LeadUpdate = { ...editedLead };
        cleanedData.phone = getSavableUzPhone(cleanedData.phone);
        cleanedData.phone_2 = getSavableUzPhone(cleanedData.phone_2);
        cleanedData.passport_series = String(cleanedData.passport_series ?? "").trim().toUpperCase();

        if (cleanedData.date_of_year === "") {
            cleanedData.date_of_year = null;
        }

        if (cleanedData.location === "") {
            cleanedData.location = null;
        }

        if (cleanedData.fakultet === "") {
            cleanedData.fakultet = null;
        }

        const jshshrDigits = String(cleanedData.jshshr ?? "").replace(/\D/g, "");
        const nextErrors: Record<string, string> = {};

        if (!/^[A-Z]{2}[0-9]{7}$/.test(cleanedData.passport_series)) {
            nextErrors.passport_series = "Format: AD1234567";
        }

        if (jshshrDigits.length !== 14) {
            nextErrors.jshshr = "JSHSHR 14 ta raqam bo'lishi kerak";
        }

        if (
            cleanedData.budget !== null
            && cleanedData.budget !== undefined
            && (Number.isNaN(Number(cleanedData.budget)) || Number(cleanedData.budget) < 0)
        ) {
            nextErrors.budget = "Budjet 0 yoki undan katta son bo'lishi kerak";
        }

        if (Object.keys(nextErrors).length > 0) {
            setLeadFieldErrors(nextErrors);
            return;
        }

        cleanedData.jshshr = Number(jshshrDigits);
        if (cleanedData.budget !== null && cleanedData.budget !== undefined) {
            cleanedData.budget = Number(cleanedData.budget);
        }

        try {
            await onUpdateLead(lead.id, cleanedData as Partial<Lead>);
            setHasChanges(false);
            onClose();
        } catch (error) {
            console.error("Error updating lead:", error);
        }
    };

    const handlePlayAudio = (call: Call) => {
        if (!call.record_url) return;

        if (playingCallId === call.id) {
            if (audioElement) audioElement.pause();
            setPlayingCallId(null);
        } else {
            if (audioElement) audioElement.pause();

            const audio = new Audio(call.record_url);

            audio.ontimeupdate = () => {
                setAudioProgress(prev => ({
                    ...prev,
                    [call.id]: { current: audio.currentTime, duration: audio.duration || 0 }
                }));
            };

            audio.onloadedmetadata = () => {
                setAudioProgress(prev => ({
                    ...prev,
                    [call.id]: { current: 0, duration: audio.duration || 0 }
                }));
            };

            audio.onended = () => {
                setPlayingCallId(null);
                setAudioProgress(prev => ({
                    ...prev,
                    [call.id]: { current: 0, duration: prev[call.id]?.duration || 0 }
                }));
            };

            audio.play();
            setAudioElement(audio);
            setPlayingCallId(call.id);
        }
    };

    const handleSeek = (callId: string, value: number[]) => {
        if (audioElement && playingCallId === callId) {
            audioElement.currentTime = value[0];
        }
    };

    const handleAddTask = async () => {
        if (!newTaskText.trim() || !employee || !lead) return;

        try {
            await createTaskMutation.mutateAsync({
                text: newTaskText.trim(),
                lead_id: lead.id,
                employee_id: employee.id,
                date: newTaskDate || null,
                time: newTaskTime || null,
                status: false,
                task_type: newTaskType,
            });

            setNewTaskText("");
            setNewTaskDate("");
            setNewTaskTime("");
            setNewTaskType("qayta_aloqa");
        } catch (error) {
            console.error("Error creating task:", error);
        }
    };

    const handleCompleteTask = async () => {
        if (!completingTaskId || !taskResult.trim()) return;

        try {
            await toggleTaskMutation.mutateAsync({
                id: completingTaskId,
                status: true,
                result: taskResult.trim(),
            });
            setCompletingTaskId(null);
            setTaskResult("");
        } catch (error) {
            console.error("Error completing task:", error);
        }
    };

    const handleUncompleteTask = async (taskId: string) => {
        try {
            await toggleTaskMutation.mutateAsync({ id: taskId, status: false });
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const handleUpdateTask = async () => {
        if (!editingTask) return;

        try {
            await updateTaskMutation.mutateAsync({
                id: editingTask.id,
                text: editingTask.text,
                date: editingTask.date,
                time: editingTask.time,
                task_type: editingTask.task_type,
            });
            setEditingTask(null);
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Eslatmani o'chirmoqchimisiz?")) return;

        try {
            await deleteTaskMutation.mutateAsync(taskId);
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    const handleOpenMergeDialog = () => {
        if (!canOpenMergeDialog) {
            if (hasChanges) {
                setMergeError("Avval lead o'zgarishlarini saqlang.");
            }
            return;
        }

        setMergeError("");
        setSelectedMergeLeadId("");
        setMergeSearch("");
        setIsMergeDialogOpen(true);
    };

    const handleMergeLeads = async () => {
        if (!lead || !selectedMergeLead || !onMergeLeads) return;

        const primaryUpdates = getLeadMergeUpdates(lead, selectedMergeLead);

        try {
            await onMergeLeads({
                primaryLead: lead,
                secondaryLead: selectedMergeLead,
                primaryUpdates,
            });

            try {
                await createTimelineNoteMutation.mutateAsync({
                    lead_id: lead.id,
                    pipeline_id: lead.pipeline_id,
                    stage_id: primaryUpdates.stage_id || lead.stage_id,
                    employee_id: primaryUpdates.employee_id || lead.employee_id || null,
                    actor_employee_id: employee?.id || null,
                    body: `${getMergeLeadLabel(selectedMergeLead)} lidi shu lidga birlashtirildi. Duplicate lid o'chirildi.`,
                });
            } catch (timelineError) {
                console.error("Error writing merge timeline note:", timelineError);
            }

            setEditedLead((prev) => ({
                ...prev,
                ...primaryUpdates,
                phone: primaryUpdates.phone ? formatUzPhone(primaryUpdates.phone) : prev.phone,
                phone_2: primaryUpdates.phone_2 ? formatOptionalUzPhone(primaryUpdates.phone_2) : prev.phone_2,
                date_of_year: primaryUpdates.date_of_year || prev.date_of_year,
            }));
            setHasChanges(false);
            setIsMergeDialogOpen(false);
            setSelectedMergeLeadId("");
            setMergeSearch("");
            setMergeError("");
        } catch (error) {
            console.error("Error merging leads:", error);
            setMergeError("Leadlarni birlashtirib bo'lmadi. Qayta urinib ko'ring.");
        }
    };

    const handleAddTimelineEntry = async () => {
        if (!lead || !timelineNote.trim()) return;

        try {
            if (timelineComposerMode === "task") {
                const assignedEmployeeId = lead.employee_id || employee?.id;
                if (!assignedEmployeeId) return;

                await createTaskMutation.mutateAsync({
                    text: timelineNote.trim(),
                    lead_id: lead.id,
                    employee_id: assignedEmployeeId,
                    date: timelineTaskDate || null,
                    time: timelineTaskTime || null,
                    status: false,
                    task_type: timelineTaskType,
                });

                setTimelineNote("");
                setTimelineTaskType("qayta_aloqa");
                setTimelineTaskDate(getTodayDateValue());
                setTimelineTaskTime("");
                return;
            }

            await createTimelineNoteMutation.mutateAsync({
                lead_id: lead.id,
                pipeline_id: lead.pipeline_id,
                stage_id: lead.stage_id,
                employee_id: lead.employee_id || null,
                actor_employee_id: employee?.id || null,
                body: timelineNote.trim(),
            });
            setTimelineNote("");
        } catch (error) {
            console.error("Error creating timeline entry:", error);
        }
    };

    if (!lead) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-[97vw] overflow-hidden p-0">
                <SheetHeader className="sr-only">
                    <SheetTitle>{lead.name ? `${lead.name} tafsilotlari` : "Lead tafsilotlari"}</SheetTitle>
                    <SheetDescription>Lead tafsilotlarini korish va tahrirlash</SheetDescription>
                </SheetHeader>
                <div className="flex h-full min-w-0">
                    {/* left Side - Lead Details */}
                    <div className="w-[30%] min-w-0 border-r p-4 overflow-y-auto">
                        <SheetHeader className="">
                            <div className="space-y-4">
                                {/* <div className="flex-1">
                                    <SheetTitle className="text-2xl font-bold">
                                        {lead.name}
                                    </SheetTitle>
                                    <SheetDescription className="flex items-center gap-2 mt-2">
                                        <Phone className="h-4 w-4" />
                                        {lead.phone}
                                    </SheetDescription>
                                </div> */}
                                {/* <Badge
                                    style={{
                                        backgroundColor: currentStage?.color ? `${currentStage.color}20` : undefined,
                                        color: currentStage?.color,
                                        borderColor: currentStage?.color,
                                    }}
                                    className="ml-2"
                                >
                                    {currentStage?.name || "No Stage"}
                                </Badge> */}
                                {/* Stage Selection */}
                                <div className="flex gap-2">
                                    <Select
                                        value={editedLead.stage_id || lead.stage_id}
                                        onValueChange={(value) => handleFieldChange("stage_id", value)}
                                    >
                                        <SelectTrigger id="stage" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stages.map((stage) => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: stage.color || "#888" }}
                                                        />
                                                        {stage.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleOpenMergeDialog}
                                        disabled={!canOpenMergeDialog || isMergeSubmitting}
                                        className="w-fit"
                                        title={hasChanges ? "Avval o'zgarishlarni saqlang" : undefined}
                                    >
                                        {isMergeSubmitting ? (
                                            <Loader2 className=" h-4 w-4 animate-spin" />
                                        ) : (
                                            <GitMerge size={10} className="" />
                                        )}                                    </Button>
                                </div>
                                <div className="space-y-2 text-xs text-muted-foreground min-w-[150px]">
                                    <div className="flex justify-between">
                                        <span>Yaratilgan:</span>
                                        <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString("uz-UZ") : "-"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Yangilangan:</span>
                                        <span>{lead.updated_at ? new Date(lead.updated_at).toLocaleDateString("uz-UZ") : "-"}</span>
                                    </div>

                                    {lead.employee && (
                                        <div className="flex justify-between">
                                            <span>Mas&apos;ul xodim:</span>
                                            <span>{lead.employee.name}</span>
                                        </div>
                                    )}
                                </div>

                                {mergeError && !isMergeDialogOpen && (
                                    <p className="text-xs text-destructive">{mergeError}</p>
                                )}
                            </div>
                        </SheetHeader>

                        <Separator className="my-2" />

                        <div className="space-y-6">
                            {/* Asosiy ma'lumotlar */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Asosiy ma&apos;lumotlar
                                </h3>

                                {duplicateFieldLabels.length > 0 && (
                                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                                        <div className="flex items-center gap-2 font-medium">
                                            <AlertCircle className="h-4 w-4" />
                                            Dubl lead
                                        </div>
                                        <p className="mt-1 text-xs">
                                            Bir xil maydonlar: {duplicateFieldLabels.join(", ")}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="employee_id">Mas&apos;ul xodim</Label>
                                        <SearchableSelect
                                            id="employee_id"
                                            value={editedLead.employee_id || ""}
                                            options={employeeSelectOptions}
                                            placeholder="Xodim tanlang"
                                            searchPlaceholder="Xodim qidirish..."
                                            emptyMessage="Xodim topilmadi"
                                            onChange={(value) => handleFieldChange("employee_id", value)}
                                            disabled={employeeSelectOptions.length === 0}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="budget">Budjet</Label>
                                        <div className="relative">
                                            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="budget"
                                                type="number"
                                                min={0}
                                                step="any"
                                                value={editedLead.budget ?? ""}
                                                onChange={(e) => handleBudgetChange(e.target.value)}
                                                className={cn("pl-9", leadFieldErrors.budget && "border-destructive")}
                                                placeholder="0"
                                            />
                                        </div>
                                        {leadFieldErrors.budget && (
                                            <p className="text-xs text-destructive">{leadFieldErrors.budget}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="name"
                                                value={editedLead.name || ""}
                                                onChange={(e) => handleFieldChange("name", e.target.value)}
                                                className="pl-9"
                                                placeholder="Mijoz ismi"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="passport_series">Passport seriya</Label>
                                        <div className="relative">
                                            <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="passport_series"
                                                value={editedLead.passport_series || ""}
                                                onChange={(e) => handlePassportSeriesChange(e.target.value)}
                                                maxLength={9}
                                                className={cn("pl-9", leadFieldErrors.passport_series && "border-destructive")}
                                                placeholder="AD1234567"
                                            />
                                        </div>
                                        {leadFieldErrors.passport_series && (
                                            <p className="text-xs text-destructive">{leadFieldErrors.passport_series}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="jshshr">JSHSHR</Label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="jshshr"
                                                inputMode="numeric"
                                                maxLength={14}
                                                value={editedLead.jshshr ?? ""}
                                                onChange={(e) => handleJshshrChange(e.target.value)}
                                                className={cn("pl-9", leadFieldErrors.jshshr && "border-destructive")}
                                                placeholder="12345678901234"
                                            />
                                        </div>
                                        {leadFieldErrors.jshshr && (
                                            <p className="text-xs text-destructive">{leadFieldErrors.jshshr}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="date_of_year">Tug&apos;ilgan kun</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="date_of_year"
                                                type="date"
                                                value={editedLead.date_of_year || ""}
                                                onChange={(e) => handleFieldChange("date_of_year", e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="location" className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            Location
                                        </Label>
                                        <SearchableSelect
                                            id="location"
                                            value={editedLead.location || ""}
                                            options={LOCATION_SELECT_OPTIONS}
                                            placeholder="Viloyatni tanlang"
                                            searchPlaceholder="Viloyat qidirish..."
                                            emptyMessage="Viloyat topilmadi"
                                            onChange={(value) => handleFieldChange("location", value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="fakultet" className="flex items-center gap-2">
                                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                            Fakultet
                                        </Label>
                                        <SearchableSelect
                                            id="fakultet"
                                            value={editedLead.fakultet || ""}
                                            options={FACULTY_SELECT_OPTIONS}
                                            placeholder="Fakultetni tanlang"
                                            searchPlaceholder="Fakultet qidirish..."
                                            emptyMessage="Fakultet topilmadi"
                                            onChange={(value) => handleFieldChange("fakultet", value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Aloqa ma'lumotlari */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Aloqa
                                </h3>

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefon</Label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    maxLength={17}
                                                    value={formatUzPhone(editedLead.phone)}
                                                    onFocus={() => handlePhoneFocus("phone")}
                                                    onChange={(e) => handlePhoneFieldChange("phone", e.target.value)}
                                                    className="pl-9"
                                                    placeholder="+998 90 123 45 67"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                disabled={!hasCompleteUzPhone(editedLead.phone || lead?.phone)}
                                                className="flex-shrink-0"
                                                onClick={() => handleCall(editedLead.phone || lead?.phone || "")}
                                            >
                                                <Phone className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone_2">Qo&apos;shimcha telefon</Label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="phone_2"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    maxLength={17}
                                                    value={formatOptionalUzPhone(editedLead.phone_2)}
                                                    onFocus={() => handlePhoneFocus("phone_2")}
                                                    onChange={(e) => handlePhoneFieldChange("phone_2", e.target.value)}
                                                    className="pl-9"
                                                    placeholder="+998 90 123 45 67"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                disabled={!hasCompleteUzPhone(editedLead.phone_2 || lead?.phone_2)}
                                                className="flex-shrink-0"
                                                onClick={() => handleCall(editedLead.phone_2 || lead?.phone_2 || "")}
                                            >
                                                <Phone className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Qo'shimcha ma'lumotlar */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Qo&apos;shimcha
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="age">Yosh</Label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="age"
                                                type="number"
                                                value={editedLead.age || ""}
                                                onChange={(e) => handleFieldChange("age", parseInt(e.target.value) || undefined)}
                                                className="pl-9"
                                                placeholder="25"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Jinsi</Label>
                                        <Select
                                            value={editedLead.gender || ""}
                                            onValueChange={(value) => handleFieldChange("gender", value)}
                                        >
                                            <SelectTrigger id="gender">
                                                <SelectValue placeholder="Tanlang" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Erkak</SelectItem>
                                                <SelectItem value="female">Ayol</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="utm">UTM Source</Label>
                                    <Input
                                        id="utm"
                                        value={editedLead.utm || ""}
                                        onChange={(e) => handleFieldChange("utm", e.target.value)}
                                        placeholder="UTM"
                                    />
                                </div>
                            </div>


                        </div>

                        {/* Footer Actions */}
                        <div className="sticky bottom-0 bg-background pt-3 pb-0 border-t mt-8 flex items-center gap-3">
                            <Button variant="outline" onClick={onClose} className="flex-1">
                                <X className="h-4 w-4 mr-2" />
                                Bekor qilish
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!hasChanges || isUpdating}
                                className="flex-1"
                            >
                                {isUpdating ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Saqlash
                            </Button>
                        </div>
                    </div>

                    {/* Middle - Lead Timeline */}
                    <div className="flex w-[42%] min-w-0 flex-col border-r border-border bg-background p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                    Tarix
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Lid bo&apos;yicha harakatlar va qo&apos;ng&apos;iroqlar
                                </p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                                {timelineItems.length}
                            </Badge>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                            {timelineLoading || loadingCalls ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : timelineItems.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                                    <History className="mb-4 h-12 w-12 opacity-50" />
                                    <p>Tarix hali yo&apos;q</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {timelineItems.map((item) => (
                                        <LeadTimelineItemCard key={item.id} item={item} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 border-t pt-3">
                            <div className="mb-2 flex flex-wrap gap-2">
                                <Select
                                    value={timelineComposerMode}
                                    onValueChange={(value) => setTimelineComposerMode(value as TimelineComposerMode)}
                                >
                                    <SelectTrigger className="h-9 w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="note">
                                            <span className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4" />
                                                <span>Izoh</span>
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="task">
                                            <span className="flex items-center gap-2">
                                                <ListChecks className="h-4 w-4" />
                                                <span>Eslatma</span>
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {timelineComposerMode === "task" && (
                                    <Select
                                        value={timelineTaskType}
                                        onValueChange={(value) => setTimelineTaskType(value as TaskType)}
                                    >
                                        <SelectTrigger className="h-9 min-w-[150px] flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TASK_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    <span className="flex items-center gap-2">
                                                        <span>{type.icon}</span>
                                                        <span>{type.label}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {timelineComposerMode === "task" && (
                                <div className="mb-2 grid grid-cols-2 gap-2">
                                    <Input
                                        type="date"
                                        value={timelineTaskDate}
                                        onChange={(event) => setTimelineTaskDate(event.target.value)}
                                        className="h-9"
                                    />
                                    <Input
                                        type="time"
                                        value={timelineTaskTime}
                                        onChange={(event) => setTimelineTaskTime(event.target.value)}
                                        className="h-9"
                                    />
                                </div>
                            )}

                            <Textarea
                                placeholder={timelineComposerMode === "task" ? "Eslatma matni..." : "Izoh yozing..."}
                                value={timelineNote}
                                onChange={(event) => setTimelineNote(event.target.value)}
                                rows={timelineComposerMode === "task" ? 3 : 2}
                                className="resize-none"
                            />
                            <div className="mt-2 flex items-center justify-between gap-3">
                                {timelineComposerMode === "task" ? (
                                    <p className="min-w-0 truncate text-xs text-muted-foreground">
                                        Mas&apos;ul: {lead.employee?.name || employee?.name || "tanlanmagan"}
                                    </p>
                                ) : (
                                    <span />
                                )}
                                <Button
                                    size="sm"
                                    onClick={handleAddTimelineEntry}
                                    disabled={
                                        !timelineNote.trim()
                                        || (timelineComposerMode === "task"
                                            ? createTaskMutation.isPending || !(lead.employee_id || employee?.id)
                                            : createTimelineNoteMutation.isPending)
                                    }
                                >
                                    {(timelineComposerMode === "task" ? createTaskMutation.isPending : createTimelineNoteMutation.isPending) ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : timelineComposerMode === "task" ? (
                                        <ListChecks className="mr-2 h-4 w-4" />
                                    ) : (
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                    )}
                                    {timelineComposerMode === "task" ? "Eslatma qo'yish" : "Izoh qo'shish"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* right Side - Calls & Notes */}
                    <div className="flex w-[28%] min-w-0 flex-col overflow-hidden border-r border-border p-4">
                        {todayPendingTasks.length > 0 && (
                            <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-semibold text-orange-500">
                                        Bugungi eslatmalar ({todayPendingTasks.length})
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {todayPendingTasks.map((task) => {
                                        const typeInfo = TASK_TYPES.find(t => t.value === task.task_type);
                                        return (
                                            <div key={task.id} className="flex items-center justify-between bg-background/60 rounded-md p-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">{typeInfo?.icon}</span>
                                                    <div>
                                                        <p className="text-xs font-medium">{task.text}</p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {task.time || "Vaqt belgilanmagan"} • {typeInfo?.label}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs border-green-500/50 text-green-600 hover:bg-green-500/10"
                                                    onClick={() => {
                                                        setCompletingTaskId(task.id);
                                                        setTaskResult("");
                                                    }}
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Bajarildi
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <Tabs defaultValue="calls" className="flex min-h-0 flex-1 flex-col">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="calls">Qo&apos;ng&apos;iroqlar</TabsTrigger>
                                <TabsTrigger value="notes" className="relative">
                                    Eslatmalar
                                    {pendingTasks.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                                            {pendingTasks.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="calls" className="min-h-0 flex-1 overflow-y-auto space-y-2">
                                {loadingCalls ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : calls.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <PhoneCall className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Qo&apos;ng&apos;iroqlar topilmadi</p>
                                    </div>
                                ) : (
                                    calls.map((call) => {
                                        const isPlaying = playingCallId === call.id;
                                        const date = new Date(call.called_at);

                                        return (
                                            <div key={call.id} className="border border-border rounded-lg p-2 space-y-2 hover:bg-accent/30 transition-colors">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        {call.direction === "incoming" ? (
                                                            <PhoneIncoming className="h-3.5 w-3.5 text-blue-500" />
                                                        ) : (
                                                            <PhoneOutgoing className="h-3.5 w-3.5 text-emerald-500" />
                                                        )}
                                                        <span className={call.direction === "incoming" ? "text-blue-500" : "text-emerald-500"}>
                                                            {call.direction === "incoming" ? "Kiruvchi" : "Chiquvchi"}
                                                        </span>
                                                        {call.answered ? (
                                                            <div className="flex items-center gap-1 text-green-600">
                                                                <Check className="h-3 w-3" />
                                                                <span>{getCallStatusLabel(call)}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-red-500">
                                                                <X className="h-3 w-3" />
                                                                <span>{getCallStatusLabel(call)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground">
                                                            {date.toLocaleDateString("uz-UZ")}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {formatDuration(call.duration)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {call.record_url && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 flex-shrink-0"
                                                                onClick={() => handlePlayAudio(call)}
                                                            >
                                                                {isPlaying ? (
                                                                    <Pause className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <Play className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>
                                                            <Slider
                                                                value={[audioProgress[call.id]?.current || 0]}
                                                                max={audioProgress[call.id]?.duration || call.duration || 100}
                                                                step={0.1}
                                                                onValueChange={(value) => handleSeek(call.id, value)}
                                                                className="flex-1"
                                                            />
                                                        </div>
                                                        {audioProgress[call.id]?.duration > 0 && (
                                                            <div className="flex justify-between text-[10px] text-muted-foreground px-9">
                                                                <span>{Math.floor(audioProgress[call.id]?.current || 0)}s</span>
                                                                <span>{Math.floor(audioProgress[call.id]?.duration || 0)}s</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </TabsContent>

                            <TabsContent value="notes" className="min-h-0 flex-1 overflow-y-auto space-y-3">
                                <Card className="border-border">
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-sm">Yangi vazifa</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0 space-y-2">
                                        <Select
                                            value={newTaskType}
                                            onValueChange={(v) => setNewTaskType(v as TaskType)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TASK_TYPES.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        <span className="flex items-center gap-2">
                                                            <span>{type.icon}</span>
                                                            <span>{type.label}</span>
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Textarea
                                            placeholder="Vazifa matni..."
                                            value={newTaskText}
                                            onChange={(e) => setNewTaskText(e.target.value)}
                                            rows={2}
                                        />
                                        <div className="flex gap-2">
                                            <Input
                                                type="date"
                                                value={newTaskDate}
                                                onChange={(e) => setNewTaskDate(e.target.value)}
                                                className="flex-1"
                                            />
                                            <Input
                                                type="time"
                                                value={newTaskTime}
                                                onChange={(e) => setNewTaskTime(e.target.value)}
                                                className="flex-1"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleAddTask}
                                            disabled={!newTaskText.trim() || createTaskMutation.isPending}
                                            size="sm"
                                            className="w-full"
                                        >
                                            {createTaskMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Plus className="h-4 w-4 mr-2" />
                                            )}
                                            Qo&apos;shish
                                        </Button>
                                    </CardContent>
                                </Card>

                                {tasksLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Eslatmalar yo&apos;q</p>
                                    </div>
                                ) : (
                                    <>
                                        {pendingTasks.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jarayondagi ({pendingTasks.length})</p>
                                                {pendingTasks.map((task) => {
                                                    const typeInfo = TASK_TYPES.find(t => t.value === task.task_type);
                                                    return (
                                                        <Card key={task.id} className={`border-border ${task.date === today ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
                                                            {editingTask?.id === task.id ? (
                                                                <CardContent className="p-3 space-y-2">
                                                                    <Select
                                                                        value={editingTask.task_type || "qayta_aloqa"}
                                                                        onValueChange={(v) => setEditingTask({ ...editingTask, task_type: v as TaskType })}
                                                                    >
                                                                        <SelectTrigger className="h-9">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {TASK_TYPES.map((type) => (
                                                                                <SelectItem key={type.value} value={type.value}>
                                                                                    <span className="flex items-center gap-2">
                                                                                        <span>{type.icon}</span>
                                                                                        <span>{type.label}</span>
                                                                                    </span>
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Textarea
                                                                        value={editingTask.text}
                                                                        onChange={(e) => setEditingTask({ ...editingTask, text: e.target.value })}
                                                                        rows={2}
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <Input
                                                                            type="date"
                                                                            value={editingTask.date || ""}
                                                                            onChange={(e) => setEditingTask({ ...editingTask, date: e.target.value })}
                                                                            className="flex-1"
                                                                        />
                                                                        <Input
                                                                            type="time"
                                                                            value={editingTask.time || ""}
                                                                            onChange={(e) => setEditingTask({ ...editingTask, time: e.target.value })}
                                                                            className="flex-1"
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            onClick={handleUpdateTask}
                                                                            disabled={updateTaskMutation.isPending}
                                                                            size="sm"
                                                                            className="flex-1"
                                                                        >
                                                                            {updateTaskMutation.isPending ? (
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                            ) : (
                                                                                <Save className="h-4 w-4 mr-2" />
                                                                            )}
                                                                            Saqlash
                                                                        </Button>
                                                                        <Button onClick={() => setEditingTask(null)} variant="outline" size="sm">
                                                                            Bekor
                                                                        </Button>
                                                                    </div>
                                                                </CardContent>
                                                            ) : (
                                                                <CardHeader className="p-3 pb-2">
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                                <span className="text-sm">{typeInfo?.icon}</span>
                                                                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                                                    {typeInfo?.label}
                                                                                </Badge>
                                                                            </div>
                                                                            <p className="text-sm">{task.text}</p>
                                                                            {(task.date || task.time) && (
                                                                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                                                    <Clock className="h-3 w-3" />
                                                                                    {task.date && new Date(task.date).toLocaleDateString("uz-UZ")}
                                                                                    {task.date && task.time && " • "}
                                                                                    {task.time}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                onClick={() => { setCompletingTaskId(task.id); setTaskResult(""); }}
                                                                                className="h-7 w-7 text-green-600 hover:bg-green-500/10"
                                                                                title="Bajarildi"
                                                                            >
                                                                                <Check className="h-3 w-3" />
                                                                            </Button>
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                onClick={() => setEditingTask(task)}
                                                                                className="h-7 w-7"
                                                                            >
                                                                                <Edit2 className="h-3 w-3" />
                                                                            </Button>
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                onClick={() => handleDeleteTask(task.id)}
                                                                                className="h-7 w-7 text-destructive"
                                                                            >
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </CardHeader>
                                                            )}
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {completedTasks.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bajarilgan ({completedTasks.length})</p>
                                                {completedTasks.map((task) => {
                                                    const typeInfo = TASK_TYPES.find(t => t.value === task.task_type);
                                                    return (
                                                        <Card key={task.id} className="border-border opacity-70">
                                                            <CardHeader className="p-3 pb-2">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-1.5 mb-1">
                                                                            <span className="text-sm">{typeInfo?.icon}</span>
                                                                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-green-500/50 text-green-600">
                                                                                ✓ {typeInfo?.label}
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-sm line-through text-muted-foreground">{task.text}</p>
                                                                        {task.result && (
                                                                            <div className="mt-1.5 p-2 bg-green-500/10 rounded text-xs text-green-700 dark:text-green-400">
                                                                                <span className="font-medium">Natija:</span> {task.result}
                                                                            </div>
                                                                        )}
                                                                        {(task.date || task.time) && (
                                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                                {task.date && new Date(task.date).toLocaleDateString("uz-UZ")}
                                                                                {task.date && task.time && " • "}
                                                                                {task.time}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleUncompleteTask(task.id)}
                                                                        className="h-7 w-7"
                                                                        title="Qayta ochish"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </CardHeader>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Lead Merge Dialog */}
                <Dialog
                    open={isMergeDialogOpen}
                    onOpenChange={(open) => {
                        setIsMergeDialogOpen(open);
                        if (!open) {
                            setSelectedMergeLeadId("");
                            setMergeSearch("");
                            setMergeError("");
                        }
                    }}
                >
                    <DialogContent className="bg-card border-border sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Lidlarni birlashtirish</DialogTitle>
                            <DialogDescription>
                                Ochiq lid va tanlangan lid bir-biridagi bo&apos;sh ma&apos;lumotlarni to&apos;ldiradi.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="rounded-md border border-border bg-background p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Asosiy lid
                                </p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{lead.name || "-"}</p>
                                        <p className="text-xs text-muted-foreground">{lead.phone || "-"}</p>
                                    </div>
                                    <Badge variant="outline" className="shrink-0">
                                        {stages.find((stage) => stage.id === lead.stage_id)?.name || "Etap"}
                                    </Badge>
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={mergeSearch}
                                    onChange={(event) => setMergeSearch(event.target.value)}
                                    placeholder="Lid qidirish..."
                                    className="pl-9"
                                />
                            </div>

                            <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                                {filteredMergeCandidates.length === 0 ? (
                                    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                        Mos lid topilmadi
                                    </div>
                                ) : (
                                    filteredMergeCandidates.map((candidate) => {
                                        const isSelected = selectedMergeLeadId === candidate.id;
                                        const stageName = stages.find((stage) => stage.id === candidate.stage_id)?.name || "Etap";

                                        return (
                                            <button
                                                key={candidate.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMergeLeadId(candidate.id);
                                                    setMergeError("");
                                                }}
                                                className={`w-full rounded-md border p-3 text-left transition-colors ${isSelected
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border bg-background hover:border-primary/40 hover:bg-accent/50"
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">{candidate.name || "-"}</p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                            <span>{candidate.phone || "-"}</span>
                                                            {candidate.phone_2 && <span>{candidate.phone_2}</span>}
                                                            {candidate.location && <span>{candidate.location}</span>}
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                                        {stageName}
                                                    </Badge>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {mergeError && (
                                <p className="text-sm text-destructive">{mergeError}</p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsMergeDialogOpen(false)}
                                disabled={isMergeSubmitting}
                            >
                                Bekor qilish
                            </Button>
                            <Button
                                onClick={handleMergeLeads}
                                disabled={!selectedMergeLead || isMergeSubmitting}
                            >
                                {isMergeSubmitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <GitMerge className="mr-2 h-4 w-4" />
                                )}
                                Birlashtirish
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Task Complete Dialog */}
                <Dialog open={!!completingTaskId} onOpenChange={(open) => { if (!open) setCompletingTaskId(null); }}>
                    <DialogContent className="bg-card border-border">
                        <DialogHeader>
                            <DialogTitle>Vazifani bajarish</DialogTitle>
                            <DialogDescription>Vazifa natijasini yozing</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Textarea
                                placeholder="Natija: masalan, uchrashuv bo'ldi, kelishildi..."
                                value={taskResult}
                                onChange={(e) => setTaskResult(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCompletingTaskId(null)}>
                                Bekor qilish
                            </Button>
                            <Button
                                onClick={handleCompleteTask}
                                disabled={!taskResult.trim() || toggleTaskMutation.isPending}
                            >
                                {toggleTaskMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                Bajarildi
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SheetContent>
        </Sheet>
    );
}
