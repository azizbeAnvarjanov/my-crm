"use client";

import { useState, useEffect } from "react"
import { X, Save, Loader2, User, Phone, MapPin, Calendar, Hash, Plus, Edit2, Trash2, PhoneCall, Volume2, Play, Pause, StickyNote, PhoneIncoming, PhoneOutgoing, Check } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Lead, Stage } from "@/hooks/use-pipeline";
import { useTasksByLead, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useEmployee } from "@/hooks/use-employee";
import { createClient } from "@/lib/supabase/client";
import { Call } from "@/hooks/use-calls";

// Helper function to format duration
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
    const [loading, setLoading] = useState(false);
    const [calls, setCalls] = useState<Call[]>([]);
    const [loadingCalls, setLoadingCalls] = useState(false);
    const [playingCallId, setPlayingCallId] = useState<string | null>(null);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [audioProgress, setAudioProgress] = useState<{ [key: string]: { current: number; duration: number } }>({});

    // Task management
    const [newTaskText, setNewTaskText] = useState("");
    const [newTaskDate, setNewTaskDate] = useState("");
    const [newTaskTime, setNewTaskTime] = useState("");
    const [editingTask, setEditingTask] = useState<any | null>(null);

    const { data: employee } = useEmployee();
    const { data: tasks = [], isLoading: tasksLoading } = useTasksByLead(lead?.id || "");
    const createTaskMutation = useCreateTask();
    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();

    // Reset edited lead when lead changes
    useEffect(() => {
        if (lead) {
            setEditedLead({
                name: lead.name,
                phone: lead.phone,
                phone_2: lead.phone_2 || "",
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

    // Fetch calls when lead changes
    useEffect(() => {
        if (lead?.phone) {
            fetchCalls(lead.phone);
        }
    }, [lead?.phone]);

    // Cleanup audio on close
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
            const { data, error } = await supabase
                .from("calls")
                .select("*")
                .eq("phone", phone)
                .not("record_url", "is", null)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            setCalls(data || []);
        } catch (error) {
            console.error("Error fetching calls:", error);
        } finally {
            setLoadingCalls(false);
        }
    };

    const handleCall = (phoneNumber: string) => {
        alert(`Qo'ng'iroq qilish test rejimda: ${phoneNumber}`);
    };

    const handleFieldChange = (field: keyof Lead, value: any) => {
        setEditedLead(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!lead || !hasChanges) return;

        const cleanedData = { ...editedLead };
        if (cleanedData.date_of_year === "") {
            cleanedData.date_of_year = null as any;
        }

        try {
            await onUpdateLead(lead.id, cleanedData);
            setHasChanges(false);
            onClose();
        } catch (error) {
            console.error("Error updating lead:", error);
        }
    };

    const handlePlayAudio = (call: Call) => {
        if (!call.record_url) return;

        if (playingCallId === call.id) {
            // Pause
            if (audioElement) {
                audioElement.pause();
            }
            setPlayingCallId(null);
        } else {
            // Play new audio
            if (audioElement) {
                audioElement.pause();
            }

            const audio = new Audio(call.record_url);

            // Track progress
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
            });

            setNewTaskText("");
            setNewTaskDate("");
            setNewTaskTime("");
        } catch (error) {
            console.error("Error creating task:", error);
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

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (!lead) return null;

    const currentStage = stages.find(s => s.id === (editedLead.stage_id || lead.stage_id));

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-[80vw] overflow-y-auto p-0">
                <div className="flex h-full">
                    {/* Right Side - Lead Details */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <SheetHeader className="mb-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <SheetTitle className="text-2xl font-bold">
                                        {lead.name}
                                    </SheetTitle>
                                    <SheetDescription className="flex items-center gap-2 mt-2">
                                        <Phone className="h-4 w-4" />
                                        {lead.phone}
                                    </SheetDescription>
                                </div>
                                <Badge
                                    style={{
                                        backgroundColor: currentStage?.color ? `${currentStage.color}20` : undefined,
                                        color: currentStage?.color,
                                        borderColor: currentStage?.color,
                                    }}
                                    className="ml-2"
                                >
                                    {currentStage?.name || "No Stage"}
                                </Badge>
                            </div>
                        </SheetHeader>

                        <Separator className="my-6" />

                        <div className="space-y-6">
                            {/* Asosiy ma'lumotlar */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Asosiy ma'lumotlar
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
                                                    value={editedLead.phone || ""}
                                                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                                                    className="pl-9"
                                                    placeholder="+998 90 123 45 67"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                disabled={!editedLead.phone && !lead?.phone}
                                                className="flex-shrink-0"
                                                onClick={async () => {
                                                    const phone = editedLead.phone || lead?.phone;
                                                    if (!phone) return;

                                                    try {
                                                        setLoading(true);

                                                        const res = await fetch("/api/moizvonki/call", {
                                                            method: "POST",
                                                            headers: {
                                                                "Content-Type": "application/json",
                                                            },
                                                            body: JSON.stringify({
                                                                phone: phone,
                                                            }),
                                                        });

                                                        const data = await res.json().catch(() => ({}));

                                                        if (!res.ok || data?.ok === false) {
                                                            console.error(data);
                                                            alert("Qo‘ng‘iroq yuborilmadi");
                                                            return;
                                                        }

                                                        alert("📞 Qo‘ng‘iroq yuborildi");
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Server xatosi");
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                            >
                                                <Phone className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone_2">Qo'shimcha telefon</Label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="phone_2"
                                                    value={editedLead.phone_2 || ""}
                                                    onChange={(e) => handleFieldChange("phone_2", e.target.value)}
                                                    className="pl-9"
                                                    placeholder="+998 90 123 45 67"
                                                />
                                            </div>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                disabled={!editedLead.phone && !lead?.phone}
                                                className="flex-shrink-0"
                                                onClick={async () => {
                                                    const phone = editedLead.phone || lead?.phone;
                                                    if (!phone) return;

                                                    try {
                                                        setLoading(true);

                                                        const res = await fetch("/api/moizvonki/call", {
                                                            method: "POST",
                                                            headers: {
                                                                "Content-Type": "application/json",
                                                            },
                                                            body: JSON.stringify({
                                                                phone: phone,
                                                            }),
                                                        });

                                                        const data = await res.json().catch(() => ({}));

                                                        if (!res.ok || data?.ok === false) {
                                                            console.error(data);
                                                            alert("Qo‘ng‘iroq yuborilmadi");
                                                            return;
                                                        }

                                                        alert("📞 Qo‘ng‘iroq yuborildi");
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Server xatosi");
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
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
                                    Qo'shimcha
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
                                    <Label htmlFor="date_of_year">Tug'ilgan sana</Label>
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

                            <Separator />

                            {/* Stage Selection */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Bosqich
                                </h3>

                                <div className="space-y-2">
                                    <Label htmlFor="stage">Joriy bosqich</Label>
                                    <Select
                                        value={editedLead.stage_id || lead.stage_id}
                                        onValueChange={(value) => handleFieldChange("stage_id", value)}
                                    >
                                        <SelectTrigger id="stage">
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
                                </div>
                            </div>

                            {/* Metadata */}
                            <Separator />
                            <div className="space-y-2 text-xs text-muted-foreground">
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
                                        <span>Mas'ul xodim:</span>
                                        <span>{lead.employee.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="sticky bottom-0 bg-background pt-6 pb-2 border-t mt-8 flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                            >
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
                    {/* Left Side - Calls & Notes */}
                    <div className="w-2/5 border-r border-border p-6 overflow-y-auto">
                        <Tabs defaultValue="calls" className="h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="calls">Qo'ng'iroqlar</TabsTrigger>
                                <TabsTrigger value="notes">Eslatmalar</TabsTrigger>
                            </TabsList>

                            <TabsContent value="calls" className="flex-1 overflow-y-auto space-y-2">
                                {loadingCalls ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : calls.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <PhoneCall className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Qo'ng'iroqlar topilmadi</p>
                                    </div>
                                ) : (
                                    calls.map((call) => {
                                        const isPlaying = playingCallId === call.id;
                                        const date = new Date(call.created_at);

                                        return (
                                            <div key={call.id} className="border border-border rounded-lg p-2 space-y-2 hover:bg-accent/30 transition-colors">
                                                {/* Call Info */}
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        {/* Direction Icon */}
                                                        {call.direction === 0 ? (
                                                            <PhoneIncoming className="h-3.5 w-3.5 text-blue-500" />
                                                        ) : (
                                                            <PhoneOutgoing className="h-3.5 w-3.5 text-emerald-500" />
                                                        )}

                                                        {/* Direction Text */}
                                                        <span className={call.direction === 0 ? "text-blue-500" : "text-emerald-500"}>
                                                            {call.direction === 0 ? "Kiruvchi" : "Chiquvchi"}
                                                        </span>

                                                        {/* Answered Status */}
                                                        {call.answered === "1" ? (
                                                            <div className="flex items-center gap-1 text-green-600">
                                                                <Check className="h-3 w-3" />
                                                                <span>Javob berildi</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-red-500">
                                                                <X className="h-3 w-3" />
                                                                <span>Javobsiz</span>
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

                                                {/* Audio Player - Simple Inline */}
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
                                {/* Add New Task */}
                                <Card className="border-border">
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-sm">Yangi eslatma</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0 space-y-2">
                                        <Textarea
                                            placeholder="Eslatma matni..."
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
                                            Qo'shish
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Task List */}
                                {tasksLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Eslatmalar yo'q</p>
                                    </div>
                                ) : (
                                    tasks.map((task) => (
                                        <Card key={task.id} className="border-border">
                                            {editingTask?.id === task.id ? (
                                                <CardContent className="p-3 space-y-2">
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
                                                        <Button
                                                            onClick={() => setEditingTask(null)}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Bekor
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            ) : (
                                                <>
                                                    <CardHeader className="p-3 pb-2">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <p className="text-sm">{task.text}</p>
                                                                {(task.date || task.time) && (
                                                                    <p className="text-xs text-muted-foreground mt-1">
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
                                                </>
                                            )}
                                        </Card>
                                    ))
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>


                </div>
            </SheetContent>
        </Sheet>
    );
}
