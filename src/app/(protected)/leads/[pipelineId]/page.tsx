"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
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
    Phone,
    User,
    MapPin,
    Loader2,
    GripVertical,
    X,
    Check,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    useCreateStage,
    useUpdateStage,
    useDeleteStage,
    useMoveLead,
    Stage,
    Lead,
    StageLeadsResult,
} from "@/hooks/use-pipeline";

// Sortable Lead Card Component
function LeadCard({ lead, isDragging }: { lead: Lead; isDragging?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: lead.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSortableDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors ${isDragging ? "shadow-lg ring-2 ring-primary" : ""
                }`}
            {...attributes}
            {...listeners}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                            {lead.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </div>
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="space-y-1.5">
                {lead.phone_2 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone_2}</span>
                    </div>
                )}
                {lead.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{lead.location}</span>
                    </div>
                )}
                {lead.employee && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{lead.employee.name}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                {lead.status && (
                    <Badge
                        variant="outline"
                        className={`text-xs ${lead.status === "new"
                            ? "border-blue-500/50 text-blue-500"
                            : lead.status === "contacted"
                                ? "border-yellow-500/50 text-yellow-500"
                                : lead.status === "qualified"
                                    ? "border-green-500/50 text-green-500"
                                    : lead.status === "lost"
                                        ? "border-red-500/50 text-red-500"
                                        : "border-muted-foreground/50 text-muted-foreground"
                            }`}
                    >
                        {lead.status}
                    </Badge>
                )}
                {lead.updated_at && (
                    <span className="text-xs text-muted-foreground">
                        {new Date(lead.updated_at).toLocaleDateString("uz-UZ")}
                    </span>
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
    onEditStage,
    onDeleteStage,
    allLeads,
    setAllLeads,
}: {
    stage: Stage;
    pipelineId: string;
    employeeId?: string | null;
    searchQuery?: string;
    isAdmin: boolean;
    onEditStage: (stage: Stage) => void;
    onDeleteStage: (stage: Stage) => void;
    allLeads: Lead[];
    setAllLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}) {
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: stageData, isLoading } = useStageLeads({
        stageId: stage.id,
        pipelineId,
        employeeId,
        searchQuery,
    });

    const loadMoreMutation = useLoadMoreStageLeads();

    // Track loaded leads for this stage
    const leads = stageData?.leads || [];
    const hasMore = stageData?.hasMore || false;
    const totalCount = stageData?.totalCount || 0;

    // Update allLeads when stageData changes
    useEffect(() => {
        if (stageData?.leads) {
            setAllLeads((prev) => {
                const otherLeads = prev.filter((l) => l.stage_id !== stage.id);
                return [...otherLeads, ...stageData.leads];
            });
        }
    }, [stageData, stage.id, setAllLeads]);

    // Handle scroll for infinite loading
    const handleScroll = useCallback(() => {
        if (!containerRef.current || !hasMore || loadMoreMutation.isPending) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

        if (isNearBottom) {
            loadMoreMutation.mutate({
                stageId: stage.id,
                pipelineId,
                employeeId,
                searchQuery,
                offset: leads.length,
            });
        }
    }, [hasMore, loadMoreMutation, stage.id, pipelineId, employeeId, searchQuery, leads.length]);

    const { setNodeRef, isOver } = useSortable({
        id: stage.id,
        data: { type: "stage", stage },
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex-shrink-0 w-80 bg-accent/30 rounded-xl flex flex-col max-h-[calc(100vh-200px)] transition-all ${isOver ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
        >
            {/* Stage Header */}
            <div
                className="p-3 border-b border-border flex items-center justify-between sticky top-0 bg-accent/50 backdrop-blur-sm rounded-t-xl"
                style={{ borderLeft: `4px solid ${stage.color || "#6366f1"}` }}
            >
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{stage.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                        {totalCount}
                    </Badge>
                </div>
                {isAdmin && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem onClick={() => onEditStage(stage)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDeleteStage(stage)}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                O'chirish
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                                <LeadCard key={lead.id} lead={lead} />
                            ))}
                        </SortableContext>

                        {leads.length === 0 && (
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
                            <div className="text-center py-2">
                                <span className="text-xs text-muted-foreground">
                                    {leads.length} / {totalCount} lid
                                </span>
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

    const { data: employee, isLoading: employeeLoading } = useEmployee();
    const { data: pipeline, isLoading: pipelineLoading } = usePipeline(pipelineId);
    const { data: stages = [], isLoading: stagesLoading } = useStages(pipelineId);

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
    const updateStageMutation = useUpdateStage();
    const deleteStageMutation = useDeleteStage();
    const moveLeadMutation = useMoveLead();

    const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
    const [isAddStageOpen, setIsAddStageOpen] = useState(false);
    const [newStageName, setNewStageName] = useState("");
    const [newStageColor, setNewStageColor] = useState("#6366f1");
    const [editingStage, setEditingStage] = useState<Stage | null>(null);

    // All leads from all stages (for drag and drop)
    const [allLeads, setAllLeads] = useState<Lead[]>([]);

    const isAdmin = employee?.role === "super-admin";
    // For regular users, filter leads by their employee_id
    const employeeId = isAdmin ? null : employee?.id;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    // Find active lead for drag overlay
    const activeLead = useMemo(() => {
        if (!activeLeadId) return null;
        return allLeads.find((l) => l.id === activeLeadId) || null;
    }, [activeLeadId, allLeads]);

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveLeadId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Handle drag over for visual feedback if needed
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveLeadId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find which stage the lead was dropped on
        const lead = allLeads.find((l) => l.id === activeId);
        if (!lead) return;

        // Check if dropped on a stage or another lead
        let targetStageId = overId;

        // If dropped on a lead, find its stage
        const targetLead = allLeads.find((l) => l.id === overId);
        if (targetLead) {
            targetStageId = targetLead.stage_id;
        }

        // Check if it's a valid stage
        const targetStage = stages.find((s) => s.id === targetStageId);
        if (!targetStage && !targetLead) return;

        // If dropped on itself or same stage, do nothing
        if (lead.stage_id === targetStageId) return;

        // Move the lead
        moveLeadMutation.mutate({
            leadId: activeId,
            newStageId: targetStageId,
            pipelineId,
        });

        // Optimistic update for allLeads
        setAllLeads((prev) =>
            prev.map((l) =>
                l.id === activeId ? { ...l, stage_id: targetStageId } : l
            )
        );
    };

    // Stage handlers
    const handleAddStage = async () => {
        if (!newStageName.trim()) return;

        await createStageMutation.mutateAsync({
            name: newStageName.trim(),
            pipeline_id: pipelineId,
            order_index: stages.length,
            color: newStageColor,
        });

        setNewStageName("");
        setNewStageColor("#6366f1");
        setIsAddStageOpen(false);
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
        const stageLeads = allLeads.filter((l) => l.stage_id === stage.id);
        if (stageLeads.length > 0) {
            alert("Bu stageda lidlar bor. Avval lidlarni boshqa stagega o'tkazing.");
            return;
        }

        await deleteStageMutation.mutateAsync({
            id: stage.id,
            pipelineId,
        });
    };

    const stageColors = [
        "#6366f1", // Indigo
        "#8b5cf6", // Purple
        "#ec4899", // Pink
        "#ef4444", // Red
        "#f97316", // Orange
        "#eab308", // Yellow
        "#22c55e", // Green
        "#14b8a6", // Teal
        "#3b82f6", // Blue
        "#6b7280", // Gray
    ];

    // Loading state
    if (employeeLoading || pipelineLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden">
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
                                {allLeads.length} ta lid • {stages.length} ta stage
                                {!isAdmin && " • Faqat mening lidlarim"}
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
                            <Button onClick={() => setIsAddStageOpen(true)} className="btn-primary">
                                <Plus className="h-4 w-4 mr-2" />
                                Stage qo'shish
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
                {stagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : stages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <p className="text-lg font-medium text-foreground mb-2">
                                Hali stage yo'q
                            </p>
                            <p className="text-muted-foreground mb-4">
                                Lidlarni boshqarish uchun stage yarating
                            </p>
                            {isAdmin && (
                                <Button onClick={() => setIsAddStageOpen(true)} className="btn-primary">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Birinchi stage yaratish
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
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex gap-4 h-full pb-4">
                            {stages.map((stage) => (
                                <StageColumn
                                    key={stage.id}
                                    stage={stage}
                                    pipelineId={pipelineId}
                                    employeeId={employeeId}
                                    searchQuery={debouncedSearch}
                                    isAdmin={isAdmin}
                                    onEditStage={setEditingStage}
                                    onDeleteStage={handleDeleteStage}
                                    allLeads={allLeads}
                                    setAllLeads={setAllLeads}
                                />
                            ))}
                        </div>

                        {/* Drag Overlay */}
                        <DragOverlay>
                            {activeLead && <LeadCard lead={activeLead} isDragging />}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            {/* Add Stage Dialog */}
            <Dialog open={isAddStageOpen} onOpenChange={setIsAddStageOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Yangi stage qo'shish</DialogTitle>
                        <DialogDescription>
                            Kanban taxtasi uchun yangi stage yarating
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Stage nomi <span className="text-destructive">*</span>
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
                                {stageColors.map((color) => (
                                    <button
                                        key={color}
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
                            Qo'shish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Stage Dialog */}
            <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Stage tahrirlash</DialogTitle>
                        <DialogDescription>Stage nomini va rangini o'zgartiring</DialogDescription>
                    </DialogHeader>
                    {editingStage && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Stage nomi <span className="text-destructive">*</span>
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
                                    {stageColors.map((color) => (
                                        <button
                                            key={color}
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
        </div>
    );
}
