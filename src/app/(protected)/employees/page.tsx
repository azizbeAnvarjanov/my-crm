"use client";

import { useState, useEffect } from "react";
import { useEmployee } from "@/hooks/use-employee";
import { createClient } from "@/lib/supabase/client";
import {
    Users,
    Search,
    Plus,
    MoreHorizontal,
    Edit2,
    Shield,
    ShieldCheck,
    Loader2,
    Check,
    X,
    Save,
    Mail,
    Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";

interface Employee {
    id: string;
    employee_id: string;
    name: string;
    email: string;
    role: "super-admin" | "manager";
    access: string[];
    department_id: string | null;
    branch_id: string | null;
    created_at?: string;
    department?: { name: string };
    branch?: { name: string };
}

// All available pages with their labels
const ALL_PAGES = [
    { path: "/", label: "Asosiy sahifa", category: "Asosiy" },
    { path: "/profile", label: "Mening profilim", category: "Asosiy" },
    { path: "/pipelines", label: "Pipelines", category: "CRM" },
    { path: "/notes", label: "Mening eslatmalarim", category: "CRM" },
    { path: "/calls", label: "Qo'ng'iroqlar", category: "CRM" },
    { path: "/leads", label: "Yangi kelib tushgan lidlar", category: "CRM" },
    { path: "/forms", label: "Formalar", category: "CRM" },
    { path: "/import", label: "Import", category: "CRM" },
    { path: "/dashboard", label: "Dashboard", category: "Analitika" },
    { path: "/calls-analytics", label: "Qo'ng'iroqlar analitikasi", category: "Analitika" },
    { path: "/employees", label: "Xodimlar", category: "Sozlamalar" },
    { path: "/settings", label: "Sozlamalar", category: "Sozlamalar" },
];

export default function EmployeesPage() {
    const { data: currentEmployee, isLoading: currentLoading } = useEmployee();
    const supabase = createClient();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Edit access modal
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [selectedAccess, setSelectedAccess] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const isAdmin = currentEmployee?.role === "super-admin";

    // Fetch employees
    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("xodimlar")
                .select(`
                    *,
                    department:departments(name),
                    branch:branches(name)
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        } finally {
            setLoading(false);
        }
    };

    // Open edit access modal
    const handleEditAccess = (employee: Employee) => {
        setEditingEmployee(employee);
        setSelectedAccess(employee.access || []);
    };

    // Toggle page access
    const toggleAccess = (path: string) => {
        setSelectedAccess((prev) =>
            prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
        );
    };

    // Select all pages
    const selectAllPages = () => {
        setSelectedAccess(ALL_PAGES.map((p) => p.path));
    };

    // Clear all pages
    const clearAllPages = () => {
        setSelectedAccess([]);
    };

    // Save access changes
    const handleSaveAccess = async () => {
        if (!editingEmployee) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("xodimlar")
                .update({ access: selectedAccess })
                .eq("id", editingEmployee.id);

            if (error) throw error;

            // Update local state
            setEmployees((prev) =>
                prev.map((e) =>
                    e.id === editingEmployee.id ? { ...e, access: selectedAccess } : e
                )
            );
            setEditingEmployee(null);
        } catch (error) {
            console.error("Error updating access:", error);
        } finally {
            setSaving(false);
        }
    };

    // Change role
    const handleChangeRole = async (employee: Employee, newRole: "super-admin" | "manager") => {
        try {
            const updates: { role: "super-admin" | "manager"; access?: string[] } = { role: newRole };

            // If promoting to super-admin, give all access
            if (newRole === "super-admin") {
                updates.access = ALL_PAGES.map((p) => p.path);
            }

            const { error } = await supabase
                .from("xodimlar")
                .update(updates)
                .eq("id", employee.id);

            if (error) throw error;

            // Update local state
            setEmployees((prev) =>
                prev.map((e) =>
                    e.id === employee.id ? { ...e, ...updates } : e
                )
            );
        } catch (error) {
            console.error("Error changing role:", error);
        }
    };

    // Filter employees
    const filteredEmployees = employees.filter(
        (e) =>
            e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group pages by category
    const pagesByCategory = ALL_PAGES.reduce((acc, page) => {
        if (!acc[page.category]) {
            acc[page.category] = [];
        }
        acc[page.category].push(page);
        return acc;
    }, {} as Record<string, typeof ALL_PAGES>);

    // Loading
    if (currentLoading) {
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
                        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Xodimlar</h1>
                    <p className="text-muted-foreground mt-1">
                        Xodimlarni boshqarish va sahifa ruxsatlarini sozlash
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Ism yoki email bo'yicha qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{employees.length}</p>
                                <p className="text-sm text-muted-foreground">Jami xodimlar</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <ShieldCheck className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {employees.filter((e) => e.role === "super-admin").length}
                                </p>
                                <p className="text-sm text-muted-foreground">Super-adminlar</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Shield className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {employees.filter((e) => e.role === "manager").length}
                                </p>
                                <p className="text-sm text-muted-foreground">Managerlar</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employees List */}
            <Card>
                <CardHeader>
                    <CardTitle>Xodimlar ro'yxati</CardTitle>
                    <CardDescription>
                        Xodimning "Ruxsatlar" tugmasini bosib sahifa ruxsatlarini boshqaring
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-medium">Xodimlar topilmadi</p>
                            <p className="text-muted-foreground">
                                {searchQuery ? "Boshqa so'z bilan qidiring" : "Hali xodimlar yo'q"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredEmployees.map((employee) => (
                                <div
                                    key={employee.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-accent/30 border border-border hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-foreground">
                                                    {employee.name}
                                                </p>
                                                <Badge
                                                    variant={employee.role === "super-admin" ? "default" : "secondary"}
                                                    className={
                                                        employee.role === "super-admin"
                                                            ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                                            : ""
                                                    }
                                                >
                                                    {employee.role === "super-admin" ? "Super Admin" : "Manager"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {employee.email}
                                                </span>
                                                {employee.branch && (
                                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        {employee.branch.name}
                                                    </span>
                                                )}
                                            </div>
                                            {employee.role === "manager" && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    <span className="text-primary font-medium">{employee.access?.length || 0}</span> ta sahifaga ruxsat berilgan
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {employee.role === "manager" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditAccess(employee)}
                                            >
                                                <Edit2 className="h-4 w-4 mr-2" />
                                                Ruxsatlar
                                            </Button>
                                        )}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {employee.role === "manager" ? (
                                                    <DropdownMenuItem
                                                        onClick={() => handleChangeRole(employee, "super-admin")}
                                                    >
                                                        <ShieldCheck className="h-4 w-4 mr-2" />
                                                        Super-admin qilish
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => handleChangeRole(employee, "manager")}
                                                        disabled={employee.id === currentEmployee?.id}
                                                    >
                                                        <Shield className="h-4 w-4 mr-2" />
                                                        Manager qilish
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleEditAccess(employee)}
                                                >
                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                    Ruxsatlarni tahrirlash
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Access Dialog */}
            <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Sahifa ruxsatlarini boshqarish</DialogTitle>
                        <DialogDescription>
                            <span className="font-medium text-foreground">{editingEmployee?.name}</span> uchun
                            qaysi sahifalarga kirish mumkinligini belgilang
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {/* Quick actions */}
                        <div className="flex items-center gap-2 mb-4">
                            <Button variant="outline" size="sm" onClick={selectAllPages}>
                                <Check className="h-4 w-4 mr-2" />
                                Hammasini belgilash
                            </Button>
                            <Button variant="outline" size="sm" onClick={clearAllPages}>
                                <X className="h-4 w-4 mr-2" />
                                Hammasini olib tashlash
                            </Button>
                        </div>

                        {/* Pages by category */}
                        <div className="space-y-6">
                            {Object.entries(pagesByCategory).map(([category, pages]) => (
                                <div key={category}>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                                        {category}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {pages.map((page) => (
                                            <label
                                                key={page.path}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedAccess.includes(page.path)
                                                    ? "bg-primary/5 border-primary/30"
                                                    : "border-border hover:border-primary/20"
                                                    }`}
                                            >
                                                <Checkbox
                                                    checked={selectedAccess.includes(page.path)}
                                                    onCheckedChange={() => toggleAccess(page.path)}
                                                />
                                                <span className="text-sm">{page.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingEmployee(null)}>
                            Bekor qilish
                        </Button>
                        <Button onClick={handleSaveAccess} disabled={saving} className="btn-primary">
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Saqlash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
