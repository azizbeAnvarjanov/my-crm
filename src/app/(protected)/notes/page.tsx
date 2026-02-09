"use client";

import { useState, useMemo } from "react";
import { useEmployee } from "@/hooks/use-employee";
import { useBranch } from "@/components/app-sidebar";
import {
    useTasks,
    useBranchEmployees,
    useCreateTask,
    useUpdateTask,
    useToggleTaskStatus,
    useDeleteTask,
    Task,
} from "@/hooks/use-tasks";
import {
    StickyNote,
    Plus,
    Search,
    Calendar,
    Clock,
    User,
    Phone,
    Check,
    Circle,
    Trash2,
    Edit2,
    MoreHorizontal,
    Loader2,
    CheckCircle2,
    ListTodo,
    CalendarDays,
    Filter,
    X,
    Users,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type FilterType = "all" | "pending" | "completed" | "today" | "upcoming" | "overdue";

const ITEMS_PER_PAGE = 20;

export default function NotesPage() {
    const { data: employee, isLoading: employeeLoading } = useEmployee();
    const { selectedBranch } = useBranch();
    const selectedBranchId = selectedBranch?.id ?? null;
    const isAdmin = employee?.role === "super-admin";

    // Fetch employees for admin filter
    const { data: branchEmployees = [] } = useBranchEmployees(isAdmin ? selectedBranchId : null);

    // Employee filter state (for admin)
    const [filterEmployeeId, setFilterEmployeeId] = useState<string | null>(null);

    // Fetch tasks
    const { data: tasks = [], isLoading: tasksLoading } = useTasks({
        employeeId: employee?.id,
        isAdmin,
        branchId: selectedBranchId,
        filterEmployeeId,
    });

    const createTaskMutation = useCreateTask();
    const updateTaskMutation = useUpdateTask();
    const toggleStatusMutation = useToggleTaskStatus();
    const deleteTaskMutation = useDeleteTask();

    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // Form state
    const [formText, setFormText] = useState("");
    const [formDate, setFormDate] = useState("");
    const [formTime, setFormTime] = useState("");

    // Get today's date for comparison
    const today = new Date().toISOString().split("T")[0];

    // Filter and search tasks
    const filteredTasks = useMemo(() => {
        let result = tasks;

        // Apply filter
        switch (filter) {
            case "pending":
                result = result.filter((t) => !t.status);
                break;
            case "completed":
                result = result.filter((t) => t.status);
                break;
            case "today":
                result = result.filter((t) => t.date === today);
                break;
            case "upcoming":
                result = result.filter((t) => t.date && t.date > today && !t.status);
                break;
            case "overdue":
                result = result.filter((t) => t.date && t.date < today && !t.status);
                break;
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (t) =>
                    t.text.toLowerCase().includes(query) ||
                    t.lead?.name?.toLowerCase().includes(query) ||
                    t.lead?.phone?.includes(query) ||
                    t.employee?.name?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [tasks, filter, searchQuery, today]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
    const paginatedTasks = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTasks.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTasks, currentPage]);

    // Reset page when filter changes
    useMemo(() => {
        setCurrentPage(1);
    }, [filter, searchQuery, filterEmployeeId]);

    // Group tasks by date
    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = {};

        paginatedTasks.forEach((task) => {
            const dateKey = task.date || "no-date";
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(task);
        });

        // Sort groups by date
        return Object.entries(groups).sort(([a], [b]) => {
            if (a === "no-date") return 1;
            if (b === "no-date") return -1;
            return a.localeCompare(b);
        });
    }, [paginatedTasks]);

    // Stats
    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter((t) => t.status).length;
        const pending = total - completed;
        const todayTasks = tasks.filter((t) => t.date === today).length;
        const overdue = tasks.filter((t) => t.date && t.date < today && !t.status).length;

        return { total, completed, pending, todayTasks, overdue };
    }, [tasks, today]);

    // Format date for display
    const formatDate = (dateStr: string | null) => {
        if (!dateStr || dateStr === "no-date") return "Sanasiz";

        const date = new Date(dateStr);
        const isToday = dateStr === today;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = dateStr === tomorrow.toISOString().split("T")[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = dateStr === yesterday.toISOString().split("T")[0];

        if (isToday) return "Bugun";
        if (isTomorrow) return "Ertaga";
        if (isYesterday) return "Kecha";

        return date.toLocaleDateString("uz-UZ", {
            weekday: "short",
            day: "numeric",
            month: "short",
        });
    };

    // Format time
    const formatTime = (timeStr: string | null) => {
        if (!timeStr) return null;
        return timeStr.substring(0, 5); // HH:MM
    };

    // Reset form
    const resetForm = () => {
        setFormText("");
        setFormDate("");
        setFormTime("");
    };

    // Handle create
    const handleCreate = async () => {
        if (!formText.trim() || !employee) return;

        await createTaskMutation.mutateAsync({
            text: formText.trim(),
            date: formDate || null,
            time: formTime || null,
            employee_id: employee.id,
        });

        resetForm();
        setIsCreateOpen(false);
    };

    // Handle update
    const handleUpdate = async () => {
        if (!editingTask || !formText.trim()) return;

        await updateTaskMutation.mutateAsync({
            id: editingTask.id,
            text: formText.trim(),
            date: formDate || null,
            time: formTime || null,
        });

        resetForm();
        setEditingTask(null);
    };

    // Handle toggle status
    const handleToggleStatus = (task: Task) => {
        toggleStatusMutation.mutate({ id: task.id, status: !task.status });
    };

    // Handle delete
    const handleDelete = (taskId: string) => {
        if (confirm("Bu eslatmani o'chirmoqchimisiz?")) {
            deleteTaskMutation.mutate(taskId);
        }
    };

    // Open edit dialog
    const openEditDialog = (task: Task) => {
        setEditingTask(task);
        setFormText(task.text);
        setFormDate(task.date || "");
        setFormTime(task.time || "");
    };

    // Loading
    if (employeeLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {isAdmin ? "Barcha eslatmalar" : "Mening eslatmalarim"}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isAdmin
                            ? "Barcha xodimlarning vazifalar va eslatmalari"
                            : "Kunlik vazifalar va eslatmalar"}
                    </p>
                </div>
                {/* Hide add button for admin */}
                {!isAdmin && (
                    <Button onClick={() => setIsCreateOpen(true)} className="btn-primary">
                        <Plus className="h-4 w-4 mr-2" />
                        Yangi eslatma
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card
                    className={`cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setFilter("all")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <ListTodo className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">Jami</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer transition-all ${filter === "pending" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setFilter("pending")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/10">
                                <Circle className="h-4 w-4 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-xl font-bold">{stats.pending}</p>
                                <p className="text-xs text-muted-foreground">Kutilmoqda</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer transition-all ${filter === "completed" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setFilter("completed")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </div>
                            <div>
                                <p className="text-xl font-bold">{stats.completed}</p>
                                <p className="text-xs text-muted-foreground">Bajarildi</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer transition-all ${filter === "today" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setFilter("today")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <CalendarDays className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xl font-bold">{stats.todayTasks}</p>
                                <p className="text-xs text-muted-foreground">Bugun</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer transition-all ${filter === "overdue" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setFilter("overdue")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <Clock className="h-4 w-4 text-red-500" />
                            </div>
                            <div>
                                <p className="text-xl font-bold">{stats.overdue}</p>
                                <p className="text-xs text-muted-foreground">O'tib ketgan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Eslatmalarni qidirish..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
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

                <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                    <SelectTrigger className="w-40">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Barchasi</SelectItem>
                        <SelectItem value="pending">Kutilmoqda</SelectItem>
                        <SelectItem value="completed">Bajarildi</SelectItem>
                        <SelectItem value="today">Bugun</SelectItem>
                        <SelectItem value="upcoming">Kelayotgan</SelectItem>
                        <SelectItem value="overdue">O'tib ketgan</SelectItem>
                    </SelectContent>
                </Select>

                {/* Employee filter for admin */}
                {isAdmin && branchEmployees.length > 0 && (
                    <Select
                        value={filterEmployeeId || "all"}
                        onValueChange={(v) => setFilterEmployeeId(v === "all" ? null : v)}
                    >
                        <SelectTrigger className="w-52">
                            <Users className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Barcha xodimlar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barcha xodimlar</SelectItem>
                            {branchEmployees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                    {emp.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Tasks List */}
            {tasksLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredTasks.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                            {searchQuery || filter !== "all" || filterEmployeeId
                                ? "Eslatma topilmadi"
                                : "Hozircha eslatmalar yo'q"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {searchQuery
                                ? "Boshqa so'z bilan qidiring"
                                : filterEmployeeId
                                    ? "Bu xodimda eslatmalar yo'q"
                                    : "Yangi eslatma qo'shing"}
                        </p>
                        {!searchQuery && filter === "all" && !isAdmin && !filterEmployeeId && (
                            <Button onClick={() => setIsCreateOpen(true)} className="btn-primary">
                                <Plus className="h-4 w-4 mr-2" />
                                Birinchi eslatma
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {groupedTasks.map(([dateKey, dateTasks]) => (
                        <div key={dateKey}>
                            {/* Date header */}
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <h3
                                    className={`text-sm font-semibold ${dateKey === today
                                        ? "text-primary"
                                        : dateKey < today && dateKey !== "no-date"
                                            ? "text-red-500"
                                            : "text-muted-foreground"
                                        }`}
                                >
                                    {formatDate(dateKey)}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                    {dateTasks.length}
                                </Badge>
                            </div>

                            {/* Tasks */}
                            <div className="space-y-2">
                                {dateTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${task.status
                                            ? "bg-accent/30 border-border opacity-60"
                                            : "bg-card border-border hover:border-primary/30"
                                            }`}
                                    >
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => handleToggleStatus(task)}
                                            className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status
                                                ? "bg-green-500 border-green-500 text-white"
                                                : "border-muted-foreground hover:border-primary"
                                                }`}
                                        >
                                            {task.status && <Check className="h-3 w-3" />}
                                        </button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={`text-sm ${task.status
                                                    ? "line-through text-muted-foreground"
                                                    : "text-foreground"
                                                    }`}
                                            >
                                                {task.text}
                                            </p>

                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                {/* Time */}
                                                {task.time && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTime(task.time)}
                                                    </span>
                                                )}

                                                {/* Lead */}
                                                {task.lead && (
                                                    <span className="flex items-center gap-1 text-xs text-primary">
                                                        <User className="h-3 w-3" />
                                                        {task.lead.name}
                                                        <Phone className="h-3 w-3 ml-1" />
                                                        {task.lead.phone}
                                                    </span>
                                                )}

                                                {/* Employee (shown for admin) */}
                                                {isAdmin && task.employee && (
                                                    <span className="flex items-center gap-1 text-xs bg-accent px-2 py-0.5 rounded-full">
                                                        <Users className="h-3 w-3" />
                                                        {task.employee.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                    Tahrirlash
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleToggleStatus(task)}
                                                >
                                                    {task.status ? (
                                                        <>
                                                            <Circle className="h-4 w-4 mr-2" />
                                                            Bajarilmagan
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="h-4 w-4 mr-2" />
                                                            Bajarildi
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(task.id)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    O'chirish
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            <p className="text-sm text-muted-foreground">
                                {filteredTasks.length} ta eslatmadan{" "}
                                {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                                {Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length)} ko'rsatilmoqda
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Dialog - Only for non-admin */}
            {!isAdmin && (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Yangi eslatma</DialogTitle>
                            <DialogDescription>
                                Yangi vazifa yoki eslatma qo'shing
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Matn <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                    placeholder="Eslatma matni..."
                                    value={formText}
                                    onChange={(e) => setFormText(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Sana</label>
                                    <Input
                                        type="date"
                                        value={formDate}
                                        onChange={(e) => setFormDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Vaqt</label>
                                    <Input
                                        type="time"
                                        value={formTime}
                                        onChange={(e) => setFormTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    resetForm();
                                    setIsCreateOpen(false);
                                }}
                            >
                                Bekor qilish
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={!formText.trim() || createTaskMutation.isPending}
                                className="btn-primary"
                            >
                                {createTaskMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                Qo'shish
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eslatmani tahrirlash</DialogTitle>
                        <DialogDescription>
                            Vazifa ma'lumotlarini o'zgartiring
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Matn <span className="text-destructive">*</span>
                            </label>
                            <Textarea
                                placeholder="Eslatma matni..."
                                value={formText}
                                onChange={(e) => setFormText(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sana</label>
                                <Input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Vaqt</label>
                                <Input
                                    type="time"
                                    value={formTime}
                                    onChange={(e) => setFormTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                setEditingTask(null);
                            }}
                        >
                            Bekor qilish
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={!formText.trim() || updateTaskMutation.isPending}
                            className="btn-primary"
                        >
                            {updateTaskMutation.isPending ? (
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
