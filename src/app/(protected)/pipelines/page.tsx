"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    GitBranch,
    Plus,
    Search,
    MoreHorizontal,
    Trash2,
    Edit2,
    Play,
    Pause,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    Building2,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    Users,
    Eye,
    Icon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useBranch } from "@/components/app-sidebar";
import { useEmployee } from "@/hooks/use-employee";
import { usePipelines } from "@/hooks/use-pipeline";
import { useQueryClient } from "@tanstack/react-query";

export default function PipelinesPage() {
    const router = useRouter();
    const { selectedBranch, loading: branchLoading } = useBranch();
    const { data: employee, isLoading: employeeLoading } = useEmployee();
    const queryClient = useQueryClient();
    const supabase = createClient();

    const { data: pipelines = [], isLoading: loading, refetch } = usePipelines(selectedBranch?.id || null);

    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newPipelineName, setNewPipelineName] = useState("");
    const [creating, setCreating] = useState(false);

    const isAdmin = employee?.role === "super-admin";

    // Create new pipeline
    const handleCreatePipeline = async () => {
        if (!selectedBranch || !newPipelineName.trim()) return;

        setCreating(true);
        try {
            const { error } = await supabase
                .from("piplines")
                .insert({
                    name: newPipelineName.trim(),
                    branch_id: selectedBranch.id,
                });

            if (error) {
                console.error("Error creating pipeline:", error);
            } else {
                setNewPipelineName("");
                setIsCreateDialogOpen(false);
                refetch();
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setCreating(false);
        }
    };

    // Delete pipeline
    const handleDeletePipeline = async (pipelineId: string) => {
        try {
            const { error } = await supabase.from("piplines").delete().eq("id", pipelineId);

            if (error) {
                console.error("Error deleting pipeline:", error);
            } else {
                refetch();
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    // Navigate to leads page
    const handleOpenPipeline = (pipelineId: string) => {
        router.push(`/leads/${pipelineId}`);
    };

    const filteredPipelines = pipelines.filter((pipeline) =>
        pipeline.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case "active":
                return (
                    <Badge className="bg-green-500/10 text-green-500 border-0">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Faol
                    </Badge>
                );
            case "paused":
                return (
                    <Badge className="bg-yellow-500/10 text-yellow-500 border-0">
                        <Pause className="mr-1 h-3 w-3" />
                        To'xtatilgan
                    </Badge>
                );
            case "error":
                return (
                    <Badge className="bg-red-500/10 text-red-400 border-0">
                        <XCircle className="mr-1 h-3 w-3" />
                        Xato
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-muted text-muted-foreground border-0">
                        <Clock className="mr-1 h-3 w-3" />
                        Kutilmoqda
                    </Badge>
                );
        }
    };

    // Show loading
    if (employeeLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Show message if no branch selected
    if (!branchLoading && !selectedBranch) {
        return (
            <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center">
                <Card className="max-w-md border-border bg-card">
                    <CardContent className="pt-6 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-yellow-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-card-foreground mb-2">
                            Filial tanlanmagan
                        </h2>
                        <p className="text-muted-foreground">
                            Voronka ko'rish uchun avval sidebar dan filial tanlang.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // MANAGER VIEW - Simple pipeline list
    if (!isAdmin) {
        return (
            <div className="min-h-screen p-6 lg:p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Building2 className="h-4 w-4" />
                        <span>{selectedBranch?.name || "Filial"}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-foreground"><span className="text-primary font-medium">{selectedBranch?.name}</span> Voronkalar</span>
                    </div>

                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Voronka qidirish..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {/* Simple Pipeline Grid */}
                {loading || branchLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredPipelines.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                            <GitBranch className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-1">
                            {searchQuery ? "Voronka topilmadi" : "Hozircha voronka yo'q"}
                        </h3>
                        <p className="text-muted-foreground">
                            {searchQuery
                                ? "Boshqa so'z bilan qidiring"
                                : `${selectedBranch?.name} filialida hali voronka yaratilmagan`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPipelines.map((pipeline) => (
                            <div
                                key={pipeline.id}
                                className="border-border bg-card hover:border-primary/30 transition-all cursor-pointer group py-4 rounded-lg border"
                                onClick={() => handleOpenPipeline(pipeline.id)}
                            >
                                <div className="px-4 flex items-center gap-4">
                                    <div className="p-2 rounded-md bg-accent group-hover:bg-primary/10 transition-colors">
                                        <GitBranch className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-card-foreground ">
                                        {pipeline.name}
                                    </h3>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // SUPER-ADMIN VIEW - Full management view
    return (
        <div className="min-h-screen p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Building2 className="h-4 w-4" />
                    <span>{selectedBranch?.name || "Filial"}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="text-foreground">voronkalar</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground"> <span className="text-primary font-medium">{selectedBranch?.name}</span> voronkalar</h1>

                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Voronka qidirish..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={loading}
                            className="border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="btn-primary text-primary-foreground">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Yangi voronka
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border">
                                <DialogHeader>
                                    <DialogTitle className="text-card-foreground">Yangi voronka yaratish</DialogTitle>
                                    <DialogDescription className="text-muted-foreground hidden"></DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-card-foreground">
                                            Nomi <span className="text-destructive">*</span>
                                        </label>
                                        <Input
                                            placeholder="Voronka nomi"
                                            value={newPipelineName}
                                            onChange={(e) => setNewPipelineName(e.target.value)}
                                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && newPipelineName.trim()) {
                                                    handleCreatePipeline();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsCreateDialogOpen(false)}
                                        className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                    >
                                        Bekor qilish
                                    </Button>
                                    <Button
                                        onClick={handleCreatePipeline}
                                        disabled={!newPipelineName.trim() || creating}
                                        className="btn-primary text-primary-foreground"
                                    >
                                        {creating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Yaratilmoqda...
                                            </>
                                        ) : (
                                            "Yaratish"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {/* <div className="grid gap-4 sm:grid-cols-4 mb-6">
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-primary/10">
                                <GitBranch className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-card-foreground">{pipelines.length}</p>
                                <p className="text-sm text-muted-foreground">Jami</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-green-500/10">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-card-foreground">
                                    {pipelines.filter((p) => p.status === "active").length}
                                </p>
                                <p className="text-sm text-muted-foreground">Faol</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-yellow-500/10">
                                <Pause className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-card-foreground">
                                    {pipelines.filter((p) => p.status === "paused").length}
                                </p>
                                <p className="text-sm text-muted-foreground">To'xtatilgan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-red-500/10">
                                <XCircle className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-card-foreground">
                                    {pipelines.filter((p) => p.status === "error").length}
                                </p>
                                <p className="text-sm text-muted-foreground">Xato</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div> */}

            {/* Search */}
            <div className="mb-6">

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPipelines.map((pipeline) => (
                    <div
                        key={pipeline.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors group"
                    >
                        <div
                            className="flex items-center gap-4 flex-1 cursor-pointer"
                            onClick={() => handleOpenPipeline(pipeline.id)}
                        >
                            <div className="p-2 rounded-md bg-accent group-hover:bg-primary/10 transition-colors">
                                <GitBranch className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-foreground">{pipeline.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-foreground hover:bg-accent"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-popover border-border">
                                    <DropdownMenuItem className="text-popover-foreground focus:bg-accent">
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        Tahrirlash
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-popover-foreground focus:bg-accent">
                                        <Play className="mr-2 h-4 w-4" />
                                        Faollashtirish
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border" />
                                    <DropdownMenuItem
                                        onClick={() => handleDeletePipeline(pipeline.id)}
                                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        O'chirish
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
