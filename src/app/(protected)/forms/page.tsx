"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    FileText,
    Plus,
    Loader2,
    XCircle,
    ExternalLink,
    Pencil,
    Trash2,
    Copy,
    Check,
    ToggleLeft,
    ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmployee } from "@/hooks/use-employee";
import { useBranch } from "@/components/app-sidebar";
import { useForms, useCreateForm, useDeleteForm, Form } from "@/hooks/use-forms";
import { usePipelines, useStages, Pipeline, Stage } from "@/hooks/use-pipeline";

export default function FormsPage() {
    const router = useRouter();
    const { data: currentEmployee, isLoading: employeeLoading } = useEmployee();
    const { selectedBranch } = useBranch();
    const branchId = selectedBranch?.id || null;

    const isAdmin = currentEmployee?.role === "super-admin";

    // Forms data
    const { data: forms = [], isLoading: formsLoading } = useForms(branchId);
    const createForm = useCreateForm();
    const deleteForm = useDeleteForm();

    // Pipeline and stage data for create dialog
    const { data: pipelines = [] } = usePipelines(branchId);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
    const { data: stages = [] } = useStages(selectedPipelineId);

    // Create dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newForm, setNewForm] = useState({
        name: "",
        pipline_id: "",
        stage_id: "",
        utm: "",
        status: false,
    });

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [formToDelete, setFormToDelete] = useState<Form | null>(null);

    // Copy link state
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Handle pipeline change in create dialog
    const handlePipelineChange = (pipelineId: string) => {
        setSelectedPipelineId(pipelineId);
        setNewForm(prev => ({ ...prev, pipline_id: pipelineId, stage_id: "" }));
    };

    // Handle create form
    const handleCreateForm = async () => {
        if (!branchId || !newForm.name || !newForm.pipline_id || !newForm.stage_id) return;

        try {
            const created = await createForm.mutateAsync({
                name: newForm.name,
                branch_id: branchId,
                pipline_id: newForm.pipline_id,
                stage_id: newForm.stage_id,
                utm: newForm.utm || undefined,
                status: newForm.status,
            });

            setCreateDialogOpen(false);
            setNewForm({ name: "", pipline_id: "", stage_id: "", utm: "", status: false });
            setSelectedPipelineId("");

            // Navigate to edit page
            router.push(`/forms/${created.id}/edit`);
        } catch (error) {
            console.error("Error creating form:", error);
        }
    };

    // Handle delete form
    const handleDeleteForm = async () => {
        if (!formToDelete) return;

        try {
            await deleteForm.mutateAsync(formToDelete.id);
            setDeleteDialogOpen(false);
            setFormToDelete(null);
        } catch (error) {
            console.error("Error deleting form:", error);
        }
    };

    // Copy form link
    const copyFormLink = (formId: string) => {
        const form = forms.find(f => f.id === formId);
        let link = `${window.location.origin}/form/${formId}`;

        // Add utm_source parameter if UTM is set
        if (form?.utm) {
            link += `?utm_source=${encodeURIComponent(form.utm)}`;
        }

        navigator.clipboard.writeText(link);
        setCopiedId(formId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Loading
    if (employeeLoading || !branchId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Only admin can access
    if (!isAdmin) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <Card className="max-w-md border-border bg-card">
                    <CardContent className="pt-6 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                            <XCircle className="h-6 w-6 text-red-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-card-foreground mb-2">
                            Ruxsat yo'q
                        </h2>
                        <p className="text-muted-foreground">
                            Bu sahifaga faqat admin kirishga ruxsat etilgan.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Formalar</h1>
                        <p className="text-muted-foreground text-sm">
                            Klientlar uchun forma yaratish va boshqarish
                        </p>
                    </div>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Yangi forma
                </Button>
            </div>

            {/* Forms Table */}
            <Card className="border-border bg-card">
                <CardContent className="p-0">
                    {formsLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : forms.length === 0 ? (
                        <div className="py-16 text-center">
                            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                Formalar topilmadi
                            </h3>
                            <p className="text-muted-foreground max-w-md mx-auto mb-4">
                                Hali hech qanday forma yaratilmagan. "Yangi forma" tugmasini bosing.
                            </p>
                            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Yangi forma
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Nomi</TableHead>
                                    <TableHead>Pipeline</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>UTM</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amallar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {forms.map((form, index) => (
                                    <TableRow
                                        key={form.id}
                                        className="hover:bg-accent/50 cursor-pointer"
                                        onClick={() => router.push(`/forms/${form.id}/edit`)}
                                    >
                                        <TableCell className="font-medium text-muted-foreground">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">{form.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {form.pipeline?.name || "-"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {form.stage?.name || "-"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {form.utm || "-"}
                                        </TableCell>
                                        <TableCell>
                                            {form.status ? (
                                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                                    <ToggleRight className="h-3 w-3 mr-1" />
                                                    Faol
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-muted-foreground">
                                                    <ToggleLeft className="h-3 w-3 mr-1" />
                                                    Nofaol
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => copyFormLink(form.id)}
                                                    title="Havolani nusxalash"
                                                >
                                                    {copiedId === form.id ? (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => {
                                                        const previewUrl = form.utm
                                                            ? `/form/${form.id}?utm_source=${encodeURIComponent(form.utm)}`
                                                            : `/form/${form.id}`;
                                                        window.open(previewUrl, "_blank");
                                                    }}
                                                    title="Preview"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => router.push(`/forms/${form.id}/edit`)}
                                                    title="Tahrirlash"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                    onClick={() => {
                                                        setFormToDelete(form);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                    title="O'chirish"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Form Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Yangi forma yaratish</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Form Name */}
                        <div className="space-y-2">
                            <Label>Forma nomi *</Label>
                            <Input
                                placeholder="Masalan: Ro'yxatdan o'tish"
                                value={newForm.name}
                                onChange={(e) => setNewForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        {/* Pipeline Select */}
                        <div className="space-y-2">
                            <Label>Pipeline *</Label>
                            <Select
                                value={newForm.pipline_id}
                                onValueChange={handlePipelineChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pipeline tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pipelines.map((pipeline) => (
                                        <SelectItem key={pipeline.id} value={pipeline.id}>
                                            {pipeline.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Stage Select */}
                        <div className="space-y-2">
                            <Label>Stage *</Label>
                            <Select
                                value={newForm.stage_id}
                                onValueChange={(value) => setNewForm(prev => ({ ...prev, stage_id: value }))}
                                disabled={!newForm.pipline_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={newForm.pipline_id ? "Stage tanlang" : "Avval pipeline tanlang"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            {stage.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* UTM */}
                        <div className="space-y-2">
                            <Label>UTM</Label>
                            <Input
                                placeholder="Masalan: instagram_ad"
                                value={newForm.utm}
                                onChange={(e) => setNewForm(prev => ({ ...prev, utm: e.target.value }))}
                            />
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between">
                            <Label>Faol holat</Label>
                            <Switch
                                checked={newForm.status}
                                onCheckedChange={(checked) => setNewForm(prev => ({ ...prev, status: checked }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Bekor qilish
                        </Button>
                        <Button
                            onClick={handleCreateForm}
                            disabled={!newForm.name || !newForm.pipline_id || !newForm.stage_id || createForm.isPending}
                        >
                            {createForm.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Yaratish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Formani o'chirish</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{formToDelete?.name}" formasini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteForm}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {deleteForm.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            O'chirish
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
