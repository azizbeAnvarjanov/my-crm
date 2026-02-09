import type { ComponentType } from "react";

// Employee (Xodim) types
export interface Employee {
    id: string;
    employee_id: string; // Auth user UUID
    name: string;
    email: string;
    role: "super-admin" | "manager";
    access: string[]; // Array of page paths this user can access
    department_id: string | null;
    branch_id: string | null;
    user_id: string;
    created_at?: string;
    updated_at?: string;
    // Relations
    department?: Department;
    branch?: Branch;
}

export interface Department {
    id: string;
    name: string;
    created_at?: string;
}

export interface Branch {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    created_at?: string;
    updated_at?: string;
}

// Sidebar navigation item type
export interface NavItem {
    title: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    category: NavCategory;
}

export type NavCategory = "asosiy" | "crm" | "analitika" | "sozlamalar";

// All possible page paths for access control
export const ALL_PAGES = [
    "/",
    "/profile",
    "/pipelines",
    "/notes",
    "/calls",
    "/settings",
    "/employees",
    "/forms",
    "/leads",
    "/import",
    "/dashboard",
    "/calls-analytics",
] as const;

export type PagePath = (typeof ALL_PAGES)[number];

// Check if user has access to a page
export function hasAccess(employee: Employee | null, path: string): boolean {
    if (!employee) return false;
    if (employee.role === "super-admin") return true;
    return employee.access.includes(path);
}
