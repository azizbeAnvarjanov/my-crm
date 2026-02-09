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
    useDroppable,
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
    useUpdateLead,
    Stage,
    Lead,
    StageLeadsResult,
} from "@/hooks/use-pipeline";
import { LeadSheet } from "@/components/lead-sheet";

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

// Draggable Lead Card Component
function LeadCard({ lead, isMoving, onClick }: { lead: Lead; isMoving?: boolean; onClick?: (lead: Lead) => void }) {
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
        opacity: isDragging || isMoving ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-card border border-border rounded-lg p-3 transition-colors relative ${isDragging ? "shadow-lg ring-2 ring-primary cursor-grabbing" : "hover:border-primary/30 cursor-pointer"
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
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>

            <div className="space-y-1.5" onClick={() => onClick?.(lead)}>
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

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border" onClick={() => onClick?.(lead)}>
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
                        {getTimeAgo(lead.updated_at)}
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
    onLeadClick,
    movingLeadId,
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
    onLeadClick: (lead: Lead) => void;
    movingLeadId: string | null;
    allLeads: Lead[];
    setAllLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
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

        if (isNearBottom && !loadMoreMutation.isPending) {
            loadMoreMutation.mutate({
                stageId: stage.id,
                pipelineId,
                employeeId,
                searchQuery,
                offset: leads.length,
            });
        }
    }, [hasMore, loadMoreMutation, stage.id, pipelineId, employeeId, searchQuery, leads.length]);

    // Use droppable for stage (drop zone for leads)
    const { setNodeRef, isOver } = useDroppable({
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
            <div className="sticky top-0 z-10 bg-accent/50 backdrop-blur-sm rounded-t-xl">
                <div
                    className="p-3 border-b border-border flex items-center justify-between"
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
                {/* Scroll Progress Bar */}
                {scrollProgress > 0 && (
                    <div className="h-1 bg-accent/30 relative overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-150"
                            style={{
                                width: `${scrollProgress}%`,
                                backgroundColor: stage.color || "#6366f1",
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
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    isMoving={movingLeadId === lead.id}
                                    onClick={onLeadClick}
                                />
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
                            <div className="text-center py-4 border-t border-border/10 mt-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-muted-foreground hover:text-primary transition-colors text-xs gap-2"
                                    onClick={() => {
                                        loadMoreMutation.mutate({
                                            stageId: stage.id,
                                            pipelineId,
                                            employeeId,
                                            searchQuery,
                                            offset: leads.length,
                                        });
                                    }}
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
    const updateLeadMutation = useUpdateLead();

    const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
    const [isAddStageOpen, setIsAddStageOpen] = useState(false);
    const [newStageName, setNewStageName] = useState("");
    const [newStageColor, setNewStageColor] = useState("#6366f1");
    const [editingStage, setEditingStage] = useState<Stage | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isLeadSheetOpen, setIsLeadSheetOpen] = useState(false);

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
        // Search in allLeads which is aggregated from all stages
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

        const activeData = active.data.current;
        const overData = over.data.current;

        // Check if we're dragging a lead
        if (!activeData || activeData.type !== "lead") return;
        const lead = activeData.lead as Lead;
        const activeId = active.id as string;

        // Determine target stage ID
        let targetStageId: string | null = null;

        if (overData?.type === "stage") {
            targetStageId = overData.stage.id;
        } else if (overData?.type === "lead") {
            targetStageId = (overData.lead as Lead).stage_id;
        } else {
            // Fallback: if overId is one of the stage IDs
            const overId = over.id as string;
            if (stages.some(s => s.id === overId)) {
                targetStageId = overId;
            }
        }

        // If no target stage or same stage, cancel
        if (!targetStageId || lead.stage_id === targetStageId) return;

        // Execute move mutation
        moveLeadMutation.mutate({
            leadId: activeId,
            newStageId: targetStageId,
            oldStageId: lead.stage_id,
            pipelineId,
            employeeId,
            searchQuery: debouncedSearch,
        });

        // Optimistic update for allLeads to reflect change immediately
        // We set updated_at to now so it stays at the bottom (oldest first logic)
        // or moves according to the user's sorting preference.
        setAllLeads((prev) =>
            prev.map((l) =>
                l.id === activeId ? { ...l, stage_id: targetStageId!, updated_at: new Date().toISOString() } : l
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

    // Lead sheet handlers
    const handleLeadClick = (lead: Lead) => {
        setSelectedLead(lead);
        setIsLeadSheetOpen(true);
    };

    const handleCloseLeadSheet = () => {
        setIsLeadSheetOpen(false);
        setTimeout(() => setSelectedLead(null), 200);
    };

    const handleUpdateLead = async (leadId: string, updates: Partial<Lead>) => {
        await updateLeadMutation.mutateAsync({ id: leadId, ...updates });
        // Update selectedLead if still viewing
        if (selectedLead?.id === leadId) {
            setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
        }
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
                                    onLeadClick={handleLeadClick}
                                    movingLeadId={moveLeadMutation.isPending && moveLeadMutation.variables ? (moveLeadMutation.variables as any).leadId : null}
                                    allLeads={allLeads}
                                    setAllLeads={setAllLeads}
                                />
                            ))}
                        </div>

                        {/* Drag Overlay */}
                        <DragOverlay>
                            {activeLead && <LeadCard lead={activeLead} />}
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

            {/* Lead Details Sheet */}
            <LeadSheet
                lead={selectedLead}
                isOpen={isLeadSheetOpen}
                onClose={handleCloseLeadSheet}
                stages={stages}
                onUpdateLead={handleUpdateLead}
                isUpdating={updateLeadMutation.isPending}
            />
        </div>
    );
}
