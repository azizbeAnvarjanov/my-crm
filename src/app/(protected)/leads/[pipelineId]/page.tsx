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
    useCreateLead,
    useCreateStage,
    useUpdateStage,
    useDeleteStage,
    useMoveLead,
    useUpdateLead,
    Stage,
    Lead,
} from "@/hooks/use-pipeline";
import { LeadSheet } from "@/components/lead-sheet";

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

const UZBEK_PHONE_PREFIX = "+998";
const MINI_SCROLLBAR_TRACK_WIDTH = 208;
const MINI_SCROLLBAR_MIN_THUMB_WIDTH = 44;
const MINI_SCROLLBAR_EDGE_OFFSET = 6;
const MINI_SCROLLBAR_USABLE_WIDTH = MINI_SCROLLBAR_TRACK_WIDTH - MINI_SCROLLBAR_EDGE_OFFSET * 2;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
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
    onCreateLead,
    onEditStage,
    onDeleteStage,
    onLeadClick,
    movingLeadId,
    onTotalCountChange,
}: {
    stage: Stage;
    pipelineId: string;
    employeeId?: string | null;
    searchQuery?: string;
    isAdmin: boolean;
    onCreateLead: (stage: Stage) => void;
    onEditStage: (stage: Stage) => void;
    onDeleteStage: (stage: Stage) => void;
    onLeadClick: (lead: Lead) => void;
    movingLeadId: string | null;
    onTotalCountChange?: (stageId: string, totalCount: number) => void;
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

    useEffect(() => {
        onTotalCountChange?.(stage.id, totalCount);
    }, [onTotalCountChange, stage.id, totalCount]);

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

    return (
        <div
            ref={setNodeRef}
            className={`flex-shrink-0 w-80 bg-accent/30 rounded-xl flex flex-col transition-all ${isOver ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
        >
            {/* Stage Header */}
            <div className="sticky top-0 z-10 bg-accent/50 backdrop-blur-sm rounded-t-xl">
                <div
                    className="p-3 border-b border-border flex items-center justify-between"
                    style={{ borderLeft: `4px solid ${stage.color || DEFAULT_STAGE_COLOR}` }}
                >
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{stage.name}</h3>
                        <Badge variant="secondary" className="text-xs">
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

    const { data: employee, isLoading: employeeLoading, error: employeeError } = useEmployee();
    const { data: pipeline, isLoading: pipelineLoading, error: pipelineError } = usePipeline(pipelineId);
    const { data: stages = [], isLoading: stagesLoading, error: stagesError } = useStages(pipelineId);

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

    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [isAddStageOpen, setIsAddStageOpen] = useState(false);
    const [newStageName, setNewStageName] = useState("");
    const [newStageColor, setNewStageColor] = useState(DEFAULT_STAGE_COLOR);
    const [editingStage, setEditingStage] = useState<Stage | null>(null);
    const [creatingLeadStage, setCreatingLeadStage] = useState<Stage | null>(null);
    const [newLeadName, setNewLeadName] = useState("");
    const [newLeadPhone, setNewLeadPhone] = useState(UZBEK_PHONE_PREFIX);
    const [newLeadErrors, setNewLeadErrors] = useState<{ name?: string; phone?: string }>({});
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isLeadSheetOpen, setIsLeadSheetOpen] = useState(false);
    const [stageLeadCounts, setStageLeadCounts] = useState<Record<string, number>>({});
    const [horizontalScrollState, setHorizontalScrollState] = useState({
        scrollLeft: 0,
        clientWidth: 0,
        scrollWidth: 0,
        maxScroll: 0,
    });
    const [isMiniScrollbarDragging, setIsMiniScrollbarDragging] = useState(false);

    // Scroll container ref for horizontal scrolling
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const miniScrollbarTrackRef = useRef<HTMLDivElement>(null);
    const closeLeadSheetTimeoutRef = useRef<number | null>(null);
    const miniScrollbarDragRef = useRef<{
        startX: number;
        startScrollLeft: number;
    } | null>(null);

    const isAdmin = employee?.role === "super-admin";
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
    const miniScrollbarThumbWidth = useMemo(() => {
        const { clientWidth, scrollWidth } = horizontalScrollState;

        if (clientWidth <= 0 || scrollWidth <= 0) {
            return MINI_SCROLLBAR_USABLE_WIDTH;
        }

        return clamp(
            (clientWidth / scrollWidth) * MINI_SCROLLBAR_USABLE_WIDTH,
            MINI_SCROLLBAR_MIN_THUMB_WIDTH,
            MINI_SCROLLBAR_USABLE_WIDTH
        );
    }, [horizontalScrollState]);
    const miniScrollbarThumbOffset = useMemo(() => {
        const { maxScroll, scrollLeft } = horizontalScrollState;
        const maxThumbTravel = MINI_SCROLLBAR_USABLE_WIDTH - miniScrollbarThumbWidth;

        if (maxScroll <= 0 || maxThumbTravel <= 0) {
            return 0;
        }

        return (scrollLeft / maxScroll) * maxThumbTravel;
    }, [horizontalScrollState, miniScrollbarThumbWidth]);
    const canUseMiniScrollbar = horizontalScrollState.maxScroll > 0;
    const miniScrollbarSegments = useMemo(() => {
        if (stages.length === 0) {
            return Array.from({ length: 8 }, (_, index) => `placeholder-${index}`);
        }

        return stages.map((stage) => stage.id);
    }, [stages]);

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

        const nextState = {
            scrollLeft: container.scrollLeft,
            clientWidth: container.clientWidth,
            scrollWidth: container.scrollWidth,
            maxScroll: Math.max(container.scrollWidth - container.clientWidth, 0),
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

        container.addEventListener("scroll", handleScroll, { passive: true });
        resizeObserver.observe(container);

        const content = container.firstElementChild;
        if (content instanceof HTMLElement) {
            resizeObserver.observe(content);
        }

        updateHorizontalScrollState();

        return () => {
            container.removeEventListener("scroll", handleScroll);
            resizeObserver.disconnect();
        };
    }, [stages.length, updateHorizontalScrollState]);

    const handleStageTotalCountChange = useCallback((stageId: string, totalCount: number) => {
        setStageLeadCounts((prev) => (
            prev[stageId] === totalCount ? prev : { ...prev, [stageId]: totalCount }
        ));
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

    const scrollBoardToRatio = useCallback((ratio: number, behavior: ScrollBehavior = "smooth") => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
        container.scrollTo({
            left: clamp(ratio, 0, 1) * maxScroll,
            behavior,
        });
    }, []);

    const handleMiniScrollbarTrackPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).dataset.dragThumb === "true") {
            return;
        }

        const track = miniScrollbarTrackRef.current;
        if (!track) return;

        const trackBounds = track.getBoundingClientRect();
        const nextThumbLeft = clamp(
            event.clientX - trackBounds.left - MINI_SCROLLBAR_EDGE_OFFSET - miniScrollbarThumbWidth / 2,
            0,
            MINI_SCROLLBAR_USABLE_WIDTH - miniScrollbarThumbWidth
        );
        const ratio = MINI_SCROLLBAR_USABLE_WIDTH === miniScrollbarThumbWidth
            ? 0
            : nextThumbLeft / (MINI_SCROLLBAR_USABLE_WIDTH - miniScrollbarThumbWidth);

        scrollBoardToRatio(ratio);
    }, [miniScrollbarThumbWidth, scrollBoardToRatio]);

    const stopMiniScrollbarDragging = useCallback(() => {
        miniScrollbarDragRef.current = null;
        setIsMiniScrollbarDragging(false);
    }, []);

    useEffect(() => {
        if (!isMiniScrollbarDragging) return;

        const handlePointerMove = (event: PointerEvent) => {
            const container = scrollContainerRef.current;
            const dragState = miniScrollbarDragRef.current;
            const maxThumbTravel = MINI_SCROLLBAR_USABLE_WIDTH - miniScrollbarThumbWidth;

            if (!container || !dragState || horizontalScrollState.maxScroll <= 0 || maxThumbTravel <= 0) {
                return;
            }

            const deltaX = event.clientX - dragState.startX;
            const nextScrollLeft = clamp(
                dragState.startScrollLeft + (deltaX / maxThumbTravel) * horizontalScrollState.maxScroll,
                0,
                horizontalScrollState.maxScroll
            );

            container.scrollTo({ left: nextScrollLeft, behavior: "auto" });
        };

        const handlePointerUp = () => stopMiniScrollbarDragging();

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [horizontalScrollState.maxScroll, isMiniScrollbarDragging, miniScrollbarThumbWidth, stopMiniScrollbarDragging]);

    const handleMiniScrollbarThumbPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!canUseMiniScrollbar) return;

        event.preventDefault();
        event.stopPropagation();

        miniScrollbarDragRef.current = {
            startX: event.clientX,
            startScrollLeft: horizontalScrollState.scrollLeft,
        };
        setIsMiniScrollbarDragging(true);
    }, [canUseMiniScrollbar, horizontalScrollState.scrollLeft]);

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        const lead = event.active.data.current?.lead;
        setActiveLead(lead || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveLead(null);

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
                            <Button onClick={() => setIsAddStageOpen(true)} className="btn-primary">
                                <Plus className="h-4 w-4" />
                            </Button>
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
                                    onDeleteStage={handleDeleteStage}
                                    onLeadClick={handleLeadClick}
                                    movingLeadId={movingLeadId}
                                    onTotalCountChange={handleStageTotalCountChange}
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

            {/* Mini Horizontal Scrollbar */}
            {stages.length > 0 && (
                <div className="fixed bottom-6 right-6 z-50">
                    <div
                        ref={miniScrollbarTrackRef}
                        onPointerDown={handleMiniScrollbarTrackPointerDown}
                        className={`relative h-12 w-52 overflow-hidden rounded-lg border border-green-400/40 bg-[#1d1d1d] px-1.5 py-2 transition-colors ${canUseMiniScrollbar ? "cursor-pointer" : "cursor-default"
                            }`}
                    >
                        <div className="pointer-events-none absolute inset-[6px] flex gap-1">
                            {miniScrollbarSegments.map((segmentId, index) => (
                                <div
                                    key={`${segmentId}-${index}`}
                                    className="flex-1 rounded-[4px] bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                />
                            ))}
                        </div>
                        <div
                            data-drag-thumb="true"
                            onPointerDown={handleMiniScrollbarThumbPointerDown}
                            className={`absolute inset-y-1.5 left-1.5 border rounded border-white/5 bg-green-300/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_14px_rgba(15,23,42,0.3)] transition-[background-color,opacity] ${canUseMiniScrollbar ? "cursor-grab active:cursor-grabbing" : "opacity-50"
                                } ${isMiniScrollbarDragging ? "bg-green-300/50" : ""}`}
                            style={{
                                width: miniScrollbarThumbWidth,
                                transform: `translateX(${miniScrollbarThumbOffset}px)`,
                            }}
                        />
                    </div>
                </div>
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
                    isUpdating={updateLeadMutation.isPending}
                />
            )}
        </div>
    );
}
