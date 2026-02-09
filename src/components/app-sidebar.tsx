"use client";

import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    User,
    GitBranch,
    StickyNote,
    Phone,
    Settings,
    Users,
    FileText,
    UserPlus,
    Upload,
    BarChart3,
    PhoneCall,
    Headphones,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Moon,
    Sun,
    ChevronsUpDown,
    Plus,
    Check,
    Building2,
    Loader2,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/lib/providers/theme-provider";
import { useEmployee } from "@/hooks/use-employee";
import { hasAccess, type NavItem, type NavCategory } from "@/types/employee";

// Types
export interface Branch {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    created_at?: string;
}

interface AuthUser {
    email?: string;
    user_metadata?: {
        full_name?: string;
        avatar_url?: string;
    };
}

// Navigation items - grouped by category
const navItems: NavItem[] = [
    // Asosiy
    { title: "Asosiy sahifa", href: "/", icon: LayoutDashboard, category: "asosiy" },
    { title: "Mening profilim", href: "/profile", icon: User, category: "asosiy" },

    // CRM
    { title: "Pipelines", href: "/pipelines", icon: GitBranch, category: "crm" },
    { title: "Mening eslatmalarim", href: "/notes", icon: StickyNote, category: "crm" },
    { title: "Yangi kelib tushgan lidlar", href: "/leads", icon: UserPlus, category: "crm" },
    { title: "Formalar", href: "/forms", icon: FileText, category: "crm" },
    { title: "Import", href: "/import", icon: Upload, category: "crm" },

    // Analitika
    { title: "Dashboard", href: "/dashboard", icon: BarChart3, category: "analitika" },
    { title: "Qo'ng'iroqlar analitikasi", href: "/calls", icon: PhoneCall, category: "analitika" },
    { title: "Qo'ng'iroq yozuvlari", href: "/calls/recordings", icon: Headphones, category: "analitika" },

    // Sozlamalar
    { title: "Xodimlar", href: "/employees", icon: Users, category: "sozlamalar" },
    { title: "Sozlamalar", href: "/settings", icon: Settings, category: "sozlamalar" },
];

const categoryLabels: Record<NavCategory, string> = {
    asosiy: "Asosiy",
    crm: "CRM",
    analitika: "Analitika",
    sozlamalar: "Sozlamalar",
};

// Branch colors for visual distinction
const branchColors = [
    "#3ecf8e",
    "#eab308",
    "#8b5cf6",
    "#ef4444",
    "#06b6d4",
    "#f97316",
    "#ec4899",
    "#14b8a6",
];

const getBranchColor = (index: number) => branchColors[index % branchColors.length];

// Branch Context
export const BranchContext = React.createContext<{
    selectedBranch: Branch | null;
    setSelectedBranch: (branch: Branch) => void;
    branches: Branch[];
    loading: boolean;
    refreshBranches: () => Promise<void>;
    addBranch: (branch: Branch) => void;
}>({
    selectedBranch: null,
    setSelectedBranch: () => { },
    branches: [],
    loading: true,
    refreshBranches: async () => { },
    addBranch: () => { },
});

export const useBranch = () => React.useContext(BranchContext);

function SidebarToggleButton() {
    const { toggleSidebar, state } = useSidebar();
    const isExpanded = state === "expanded";

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border border-border bg-card shadow-lg hover:bg-accent transition-all duration-200"
        >
            {isExpanded ? (
                <ChevronLeft className="h-3 w-3 text-foreground" />
            ) : (
                <ChevronRight className="h-3 w-3 text-foreground" />
            )}
        </Button>
    );
}

function NavItemComponent({
    item,
    isActive,
}: {
    item: NavItem;
    isActive: boolean;
}) {
    const { state } = useSidebar();
    const isExpanded = state === "expanded";
    const Icon = item.icon;

    return (
        <SidebarMenuItem>
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={`
                                group relative transition-all duration-200 h-9
                                ${isActive
                                    ? "bg-accent text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }
                            `}
                        >
                            <Link href={item.href} className="flex items-center gap-3">
                                <Icon
                                    className={`h-4 w-4 shrink-0 transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                        }`}
                                />
                                <span className="text-sm font-medium">{item.title}</span>
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                                )}
                            </Link>
                        </SidebarMenuButton>
                    </TooltipTrigger>
                    {!isExpanded && (
                        <TooltipContent side="right" className="bg-popover border-border text-popover-foreground">
                            {item.title}
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
        </SidebarMenuItem>
    );
}

function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                        {theme === "dark" ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover border-border text-popover-foreground">
                    {theme === "dark" ? "Yorug' rejim" : "Qorong'i rejim"}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function AppSidebarContent({
    user,
    branches,
    selectedBranch,
    setSelectedBranch,
    loading,
    onAddBranch,
}: {
    user: AuthUser | null;
    branches: Branch[];
    selectedBranch: Branch | null;
    setSelectedBranch: (branch: Branch) => void;
    loading: boolean;
    onAddBranch: (branch: Branch) => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { state } = useSidebar();
    const isExpanded = state === "expanded";
    const { data: employee, isLoading: employeeLoading } = useEmployee();

    // New branch dialog state
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const [newBranchName, setNewBranchName] = React.useState("");
    const [creating, setCreating] = React.useState(false);

    // Initialize queryClient
    const queryClient = useQueryClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // Clear all React Query cache to remove previous user data
        queryClient.clear();
        router.push("/login");
        router.refresh();
    };

    const handleCreateBranch = async () => {
        if (!newBranchName.trim()) return;

        setCreating(true);
        try {
            const { data, error } = await supabase
                .from("branches")
                .insert({ name: newBranchName.trim() })
                .select()
                .single();

            if (error) {
                console.error("Error creating branch:", error);
            } else if (data) {
                onAddBranch(data);
                setSelectedBranch(data);
                setNewBranchName("");
                setIsCreateDialogOpen(false);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setCreating(false);
        }
    };

    // Filter nav items based on employee role and access
    const filteredNavItems = React.useMemo(() => {
        if (employeeLoading) return [];
        return navItems.filter((item) => hasAccess(employee ?? null, item.href));
    }, [employee, employeeLoading]);

    // Group filtered items by category
    const groupedItems = React.useMemo(() => {
        const groups: Record<NavCategory, NavItem[]> = {
            asosiy: [],
            crm: [],
            analitika: [],
            sozlamalar: [],
        };

        filteredNavItems.forEach((item) => {
            groups[item.category].push(item);
        });

        return groups;
    }, [filteredNavItems]);

    const userInitials = user?.user_metadata?.full_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || user?.email?.substring(0, 2).toUpperCase() || "U";

    const selectedBranchIndex = branches.findIndex((b) => b.id === selectedBranch?.id);
    const selectedColor = selectedBranchIndex >= 0 ? getBranchColor(selectedBranchIndex) : "#3ecf8e";

    return (
        <>
            <Sidebar
                collapsible="icon"
                className="border-r border-sidebar-border bg-sidebar transition-all duration-200"
            >
                <SidebarToggleButton />

                {/* Header - Branch Selector */}
                <SidebarHeader className="border-b border-sidebar-border p-3">
                    {/* Super-admin: Full branch selector dropdown */}
                    {employee?.role === "super-admin" ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    disabled={loading}
                                    suppressHydrationWarning
                                    className={`w-full gap-2 hover:bg-sidebar-accent ${isExpanded ? "justify-between px-2" : "justify-center px-0"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-6 w-6 rounded flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: selectedColor + "20" }}
                                        >
                                            {loading ? (
                                                <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                                            ) : (
                                                <Building2 className="h-3.5 w-3.5" style={{ color: selectedColor }} />
                                            )}
                                        </div>
                                        {isExpanded && (
                                            <span className="text-sm font-medium text-sidebar-foreground truncate">
                                                {loading ? "Yuklanmoqda..." : selectedBranch?.name || "Filial tanlang"}
                                            </span>
                                        )}
                                    </div>
                                    {isExpanded && !loading && (
                                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 bg-popover border-border">
                                <DropdownMenuLabel className="text-muted-foreground text-xs flex items-center gap-2">
                                    <Building2 className="h-3 w-3" />
                                    Filial tanlang
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border" />
                                {branches.length === 0 ? (
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                        Filiallar topilmadi
                                    </DropdownMenuItem>
                                ) : (
                                    branches.map((branch, index) => (
                                        <DropdownMenuItem
                                            key={branch.id}
                                            onClick={() => setSelectedBranch(branch)}
                                            className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                                        >
                                            <div
                                                className="h-4 w-4 rounded mr-2 flex items-center justify-center"
                                                style={{ backgroundColor: getBranchColor(index) + "20" }}
                                            >
                                                <div
                                                    className="h-2 w-2 rounded-sm"
                                                    style={{ backgroundColor: getBranchColor(index) }}
                                                />
                                            </div>
                                            <span className="flex-1 truncate">{branch.name}</span>
                                            {selectedBranch?.id === branch.id && (
                                                <Check className="ml-2 h-4 w-4 text-primary" />
                                            )}
                                        </DropdownMenuItem>
                                    ))
                                )}
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem
                                    onClick={() => setIsCreateDialogOpen(true)}
                                    className="text-primary focus:bg-primary/10 focus:text-primary"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Yangi filial qo'shish
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        /* Regular user: Show only their branch (non-clickable) */
                        <div
                            className={`w-full gap-2 flex items-center ${isExpanded ? "justify-start px-2" : "justify-center px-0"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-6 w-6 rounded flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: "#3ecf8e20" }}
                                >
                                    {employeeLoading ? (
                                        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                                    ) : (
                                        <Building2 className="h-3.5 w-3.5" style={{ color: "#3ecf8e" }} />
                                    )}
                                </div>
                                {isExpanded && (
                                    <span className="text-sm font-medium text-sidebar-foreground truncate">
                                        {employeeLoading
                                            ? "Yuklanmoqda..."
                                            : employee?.branch?.name || "Filial yo'q"}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </SidebarHeader>

                {/* Main Content */}
                <SidebarContent className="px-2 py-3">
                    {(Object.keys(groupedItems) as NavCategory[]).map((category) => {
                        const items = groupedItems[category];
                        if (items.length === 0) return null;

                        return (
                            <React.Fragment key={category}>
                                <SidebarGroup>
                                    <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                                        {isExpanded ? categoryLabels[category] : ""}
                                    </SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu className="space-y-0.5">
                                            {items.map((item) => (
                                                <NavItemComponent
                                                    key={item.href}
                                                    item={item}
                                                    isActive={pathname === item.href}
                                                />
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                                <Separator className="my-3 bg-sidebar-border" />
                            </React.Fragment>
                        );
                    })}
                </SidebarContent>

                {/* Footer */}
                <SidebarFooter className="border-t border-sidebar-border p-2">
                    {/* Theme Toggle */}
                    <div className="mb-2 flex justify-center">
                        <ThemeToggle />
                    </div>

                    {/* User Profile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                suppressHydrationWarning
                                className={`w-full gap-2 hover:bg-sidebar-accent ${isExpanded ? "justify-start px-2" : "justify-center px-0"
                                    }`}
                            >
                                <Avatar className="h-7 w-7 shrink-0">
                                    <AvatarImage src={user?.user_metadata?.avatar_url} alt="User" />
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                                        {userInitials}
                                    </AvatarFallback>
                                </Avatar>
                                {isExpanded && (
                                    <div className="flex flex-col items-start overflow-hidden">
                                        <span className="truncate text-sm font-medium text-sidebar-foreground">
                                            {employee?.name || user?.user_metadata?.full_name || "Foydalanuvchi"}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {employee?.role === "super-admin" ? "Super Admin" : "Manager"}
                                        </span>
                                    </div>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                            <DropdownMenuLabel className="text-popover-foreground">
                                Mening hisobim
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem asChild className="text-muted-foreground focus:bg-accent focus:text-accent-foreground">
                                <Link href="/profile">
                                    <User className="mr-2 h-4 w-4" />
                                    Profil
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-muted-foreground focus:bg-accent focus:text-accent-foreground">
                                <Link href="/settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Sozlamalar
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Chiqish
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarFooter>
            </Sidebar>

            {/* Create Branch Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-card-foreground">Yangi filial qo'shish</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Yangi filial ma'lumotlarini kiriting
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-card-foreground">
                                Filial nomi <span className="text-destructive">*</span>
                            </label>
                            <Input
                                placeholder="Masalan: Toshkent Markaziy"
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
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
                            onClick={handleCreateBranch}
                            disabled={!newBranchName.trim() || creating}
                            className="btn-primary text-primary-foreground"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Qo'shilmoqda...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Qo'shish
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function AppSidebar({
    children,
    user,
}: {
    children: React.ReactNode;
    user: AuthUser | null;
}) {
    const [branches, setBranches] = React.useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
    const [loading, setLoading] = React.useState(true);
    const supabase = createClient();
    const { data: employee, isLoading: employeeLoading } = useEmployee();

    const isAdmin = employee?.role === "super-admin";

    // Fetch branches (only needed for super-admin)
    const fetchBranches = React.useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("branches")
                .select("*")
                .order("name", { ascending: true });

            if (error) {
                console.error("Error fetching branches:", error);
            } else if (data) {
                setBranches(data);
                return data;
            }
        } catch (error) {
            console.error("Error:", error);
        }
        return [];
    }, [supabase]);

    // Initialize branches and selected branch
    React.useEffect(() => {
        const init = async () => {
            // Wait for employee data to load
            if (employeeLoading) return;

            if (isAdmin) {
                // Super-admin: Fetch all branches and allow selection
                const data = await fetchBranches();
                if (data && data.length > 0) {
                    const savedBranchId = localStorage.getItem("selectedBranchId");
                    const savedBranch = data.find((b) => b.id === savedBranchId);
                    setSelectedBranch(savedBranch || data[0]);
                }
            } else {
                // Regular user: Use their assigned branch
                if (employee?.branch) {
                    setSelectedBranch(employee.branch as Branch);
                    setBranches([employee.branch as Branch]);
                }
            }
            setLoading(false);
        };

        init();
    }, [fetchBranches, isAdmin, employee, employeeLoading]);

    // Save selected branch to localStorage (only for super-admin)
    React.useEffect(() => {
        if (selectedBranch && isAdmin) {
            localStorage.setItem("selectedBranchId", selectedBranch.id);
        }
    }, [selectedBranch, isAdmin]);

    const addBranch = (branch: Branch) => {
        setBranches((prev) => [...prev, branch].sort((a, b) => a.name.localeCompare(b.name)));
    };

    return (
        <BranchContext.Provider
            value={{
                selectedBranch,
                setSelectedBranch,
                branches,
                loading,
                refreshBranches: async () => { await fetchBranches(); },
                addBranch,
            }}
        >
            <SidebarProvider>
                <AppSidebarContent
                    user={user}
                    branches={branches}
                    selectedBranch={selectedBranch}
                    setSelectedBranch={setSelectedBranch}
                    loading={loading}
                    onAddBranch={addBranch}
                />
                <main className="flex-1 overflow-auto bg-background">
                    <div className="page-transition">{children}</div>
                </main>
            </SidebarProvider>
        </BranchContext.Provider>
    );
}
