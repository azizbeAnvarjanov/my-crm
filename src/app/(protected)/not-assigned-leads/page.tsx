"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBranch } from "@/components/app-sidebar";
import { useEmployee } from "@/hooks/use-employee";
import {
    Users,
    Loader2,
    ChevronLeft,
    ChevronRight,
    UserCheck,
    Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Lead {
    id: string;
    name: string;
    phone: string;
    phone_2?: string;
    utm?: string;
    age?: string;
    location?: string;
    employee_id: string | null;
    stage_id: string;
    pipeline_id: string;
    created_at: string;
    updated_at: string;
}

interface Manager {
    id: string;
    employee_id: string;
    name: string;
    email: string;
    role: string;
    branch_id: string;
}

const ITEMS_PER_PAGE = 20;

export default function NotAssignedLeadsPage() {
    const supabase = createClient();
    const { selectedBranch } = useBranch();
    const { data: currentEmployee, isLoading: employeeLoading } = useEmployee();

    const [leads, setLeads] = useState<Lead[]>([]);
    const [managers, setManagers] = useState<Manager[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    // Selection state
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

    // Assignment dialog state
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedManagerId, setSelectedManagerId] = useState<string>("");
    const [assigning, setAssigning] = useState(false);

    // Permissions
    const isAdmin = currentEmployee?.role === "super-admin";
    const branchId = selectedBranch?.id;

    // Fetch managers from the selected branch
    useEffect(() => {
        if (!branchId || !isAdmin) return;

        const fetchManagers = async () => {
            try {
                const { data, error } = await supabase
                    .from("xodimlar")
                    .select("id, employee_id, name, email, role, branch_id")
                    .eq("branch_id", branchId)
                    .eq("role", "manager")
                    .order("name");

                if (error) throw error;
                setManagers(data || []);
            } catch (error) {
                console.error("Error fetching managers:", error);
            }
        };

        fetchManagers();
    }, [branchId, isAdmin, supabase]);

    // Fetch leads with employee_id = null
    useEffect(() => {
        fetchLeads();
    }, [currentPage, searchQuery, branchId]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            // Build query
            let query = supabase
                .from("leads")
                .select("*", { count: "exact" })
                .is("employee_id", null)
                .order("created_at", { ascending: false });

            // Add search filter
            if (searchQuery.trim()) {
                query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
            }

            // Pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            setLeads(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle checkbox toggle
    const toggleLeadSelection = (leadId: string) => {
        setSelectedLeads((prev) =>
            prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
        );
    };

    // Select all leads on current page
    const toggleSelectAll = () => {
        if (selectedLeads.length === leads.length) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(leads.map((lead) => lead.id));
        }
    };

    // Open assignment dialog
    const handleOpenAssignDialog = () => {
        if (selectedLeads.length === 0) {
            alert("Iltimos, kamida bitta lidni tanlang!");
            return;
        }
        setIsAssignDialogOpen(true);
    };

    // Assign selected leads to manager
    const handleAssignToManager = async () => {
        if (!selectedManagerId) {
            alert("Iltimos, managerni tanlang!");
            return;
        }

        setAssigning(true);
        try {
            const { error } = await supabase
                .from("leads")
                .update({ employee_id: selectedManagerId })
                .in("id", selectedLeads);

            if (error) throw error;

            // Refresh leads
            await fetchLeads();

            // Reset selection and close dialog
            setSelectedLeads([]);
            setSelectedManagerId("");
            setIsAssignDialogOpen(false);

            alert(`${selectedLeads.length} ta lid muvaffaqiyatli biriktitildi!`);
        } catch (error) {
            console.error("Error assigning leads:", error);
            alert("Xatolik yuz berdi!");
        } finally {
            setAssigning(false);
        }
    };

    // Pagination
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    const handlePreviousPage = () => {
        if (canGoPrevious) {
            setCurrentPage((prev) => prev - 1);
            setSelectedLeads([]);
        }
    };

    const handleNextPage = () => {
        if (canGoNext) {
            setCurrentPage((prev) => prev + 1);
            setSelectedLeads([]);
        }
    };

    // Loading state
    if (employeeLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Not admin
    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Ruxsat yo'q</h2>
                        <p className="text-muted-foreground">
                            Bu sahifaga faqat super-admin kirishi mumkin.
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
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Biriktirilmagan Lidlar</h1>
                        <p className="text-muted-foreground text-sm">
                            Hali xodimga biriktirilmagan lidlar ro'yxati
                        </p>
                    </div>
                </div>

                {/* Assign button */}
                {selectedLeads.length > 0 && (
                    <Button onClick={handleOpenAssignDialog} size="lg" className="gap-2">
                        <UserCheck className="h-5 w-5" />
                        Managerga biriktirish ({selectedLeads.length})
                    </Button>
                )}
            </div>

            {/* Search and stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Ism yoki telefon bo'yicha qidirish..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <Badge variant="outline" className="text-base px-4 py-2">
                        Jami: <span className="font-bold ml-1">{totalCount}</span> ta lid
                    </Badge>
                </div>
            </div>

            {/* Content */}
            <Card className="border-border bg-card">
                <CardHeader>
                    <CardTitle>Lidlar ro'yxati</CardTitle>
                    <CardDescription>
                        Lidlarni checkbox bilan belgilab managerga biriktiring
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="text-center py-16">
                            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                Lidlar topilmadi
                            </h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                {searchQuery
                                    ? "Qidiruv bo'yicha natija topilmadi"
                                    : "Hozircha biriktirilmagan lidlar yo'q"}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-border overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-muted/50 border-b border-border">
                                            <th className="w-12 p-3 text-left">
                                                <Checkbox
                                                    checked={selectedLeads.length === leads.length}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </th>
                                            <th className="p-3 text-left text-sm font-semibold text-foreground">Ism</th>
                                            <th className="p-3 text-left text-sm font-semibold text-foreground">Telefon</th>
                                            <th className="p-3 text-left text-sm font-semibold text-foreground">Telefon 2</th>
                                            <th className="p-3 text-left text-sm font-semibold text-foreground">Yosh</th>
                                            <th className="p-3 text-left text-sm font-semibold text-foreground">Manzil</th>
                                            <th className="p-3 text-left text-sm font-semibold text-foreground">UTM</th>
                                            <th className="p-3 text-left text-sm font-semibold text-foreground">Sana</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leads.map((lead, index) => (
                                            <tr
                                                key={lead.id}
                                                className={`border-b border-border transition-colors ${selectedLeads.includes(lead.id)
                                                    ? "bg-primary/5"
                                                    : index % 2 === 0
                                                        ? "bg-background"
                                                        : "bg-muted/20"
                                                    } hover:bg-accent/50`}
                                            >
                                                <td className="p-3">
                                                    <Checkbox
                                                        checked={selectedLeads.includes(lead.id)}
                                                        onCheckedChange={() => toggleLeadSelection(lead.id)}
                                                    />
                                                </td>
                                                <td className="p-3 text-sm font-medium text-foreground">
                                                    {lead.name || <span className="text-muted-foreground italic">-</span>}
                                                </td>
                                                <td className="p-3 text-sm text-foreground">
                                                    {lead.phone || <span className="text-muted-foreground">-</span>}
                                                </td>
                                                <td className="p-3 text-sm text-muted-foreground">
                                                    {lead.phone_2 || "-"}
                                                </td>
                                                <td className="p-3 text-sm text-muted-foreground">
                                                    {lead.age || "-"}
                                                </td>
                                                <td className="p-3 text-sm text-muted-foreground">
                                                    {lead.location || "-"}
                                                </td>
                                                <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                                                    {lead.utm || "-"}
                                                </td>
                                                <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                                                    {new Date(lead.created_at).toLocaleDateString("uz-UZ", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                    })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                            <div className="text-sm text-muted-foreground">
                                Sahifa {currentPage} / {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreviousPage}
                                    disabled={!canGoPrevious}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Orqaga
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextPage}
                                    disabled={!canGoNext}
                                >
                                    Keyingi
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Assignment Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-card-foreground">
                            Lidlarni managerga biriktirish
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            <span className="font-medium text-primary">{selectedLeads.length}</span> ta
                            tanlangan lidni qaysi managerga biriktirishni tanlang
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* Manager selector */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-card-foreground">
                                Manager tanlang <span className="text-destructive">*</span>
                            </label>
                            {managers.length === 0 ? (
                                <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                                    Bu filialda hali managerlar yo'q
                                </p>
                            ) : (
                                <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Manager tanlang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {managers.map((manager) => (
                                            <SelectItem key={manager.id} value={manager.employee_id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{manager.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({manager.email})
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Selected leads preview */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-card-foreground">
                                Tanlangan lidlar
                            </label>
                            <div className="max-h-48 overflow-y-auto space-y-1 p-3 bg-muted/30 rounded-lg">
                                {leads
                                    .filter((lead) => selectedLeads.includes(lead.id))
                                    .map((lead) => (
                                        <div
                                            key={lead.id}
                                            className="text-sm flex items-center justify-between py-1"
                                        >
                                            <span className="font-medium">{lead.name}</span>
                                            <span className="text-muted-foreground">{lead.phone}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAssignDialogOpen(false)}
                            disabled={assigning}
                        >
                            Bekor qilish
                        </Button>
                        <Button
                            onClick={handleAssignToManager}
                            disabled={!selectedManagerId || assigning || managers.length === 0}
                            className="btn-primary"
                        >
                            {assigning ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Biriktirilmoqda...
                                </>
                            ) : (
                                <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Biriktirish
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
