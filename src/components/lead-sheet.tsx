"use client";

import { useState, useEffect, useMemo } from "react"
import { X, Save, Loader2, User, Phone, MapPin, Calendar, Hash, Plus, Edit2, Trash2, PhoneCall, Play, Pause, StickyNote, PhoneIncoming, PhoneOutgoing, Check, Clock, AlertCircle } from "lucide-react";
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
import { Lead, Stage } from "@/hooks/use-pipeline";
import { useTasksByLead, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus, TASK_TYPES, type Task, type TaskType } from "@/hooks/use-tasks";
import { useEmployee } from "@/hooks/use-employee";
import { createClient } from "@/lib/supabase/client";
import { Call, getCallStatusLabel, normalizeCallRow } from "@/hooks/use-calls";
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
    isUpdating?: boolean;
}

type LeadUpdate = Partial<Omit<Lead, "date_of_year">> & {
    date_of_year?: string | null;
};

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

export function LeadSheet({
    lead,
    isOpen,
    onClose,
    stages,
    onUpdateLead,
    isUpdating = false,
}: LeadSheetProps) {
    const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
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

    const { data: employee } = useEmployee();
    const { data: tasks = [], isLoading: tasksLoading } = useTasksByLead(lead?.id || "");
    const createTaskMutation = useCreateTask();
    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();
    const toggleTaskMutation = useToggleTaskStatus();

    const today = new Date().toISOString().split("T")[0];
    const todayPendingTasks = useMemo(() => tasks.filter(t => !t.status && t.date === today), [tasks, today]);
    const pendingTasks = useMemo(() => tasks.filter(t => !t.status), [tasks]);
    const completedTasks = useMemo(() => tasks.filter(t => t.status), [tasks]);

    useEffect(() => {
        if (lead) {
            setEditedLead({
                name: lead.name,
                phone: formatUzPhone(lead.phone),
                phone_2: formatOptionalUzPhone(lead.phone_2),
                location: lead.location || "",
                age: lead.age,
                gender: lead.gender || "",
                date_of_year: lead.date_of_year || "",
                utm: lead.utm || "",
                stage_id: lead.stage_id,
            });
            setHasChanges(false);
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
        setHasChanges(true);
    };

    const handlePhoneFieldChange = (field: "phone" | "phone_2", value: string) => {
        handleFieldChange(field, formatUzPhone(value));
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

        if (cleanedData.date_of_year === "") {
            cleanedData.date_of_year = null;
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

    if (!lead) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-[97vw] overflow-y-auto p-0">
                <SheetHeader className="sr-only">
                    <SheetTitle>{lead.name ? `${lead.name} tafsilotlari` : "Lead tafsilotlari"}</SheetTitle>
                    <SheetDescription>Lead tafsilotlarini korish va tahrirlash</SheetDescription>
                </SheetHeader>
                <div className="flex h-full">
                    {/* left Side - Lead Details */}
                    <div className="w-[30%] p-4 overflow-y-auto border-r">
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
                            </div>
                        </SheetHeader>

                        <Separator className="my-2" />

                        <div className="space-y-6">
                            {/* Asosiy ma'lumotlar */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Asosiy ma&apos;lumotlar
                                </h3>

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Ism</Label>
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

                                    <div className="space-y-2">
                                        <Label htmlFor="location">Manzil</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="location"
                                                value={editedLead.location || ""}
                                                onChange={(e) => handleFieldChange("location", e.target.value)}
                                                className="pl-9"
                                                placeholder="Manzil"
                                            />
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
                                    <Label htmlFor="date_of_year">Tug&apos;ilgan sana</Label>
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

                    {/* right Side - Calls & Notes */}
                    <div className="w-[70%] border-r border-border p-6 overflow-y-auto">
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

                        <Tabs defaultValue="calls" className="h-full flex flex-col">
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

                            <TabsContent value="calls" className="flex-1 overflow-y-auto space-y-2">
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

                            <TabsContent value="notes" className="flex-1 overflow-y-auto space-y-3">
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
