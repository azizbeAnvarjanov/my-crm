"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Task {
    id: string;
    text: string;
    status: boolean;
    lead_id: string | null;
    date: string | null;
    time: string | null;
    employee_id: string;
    created_at?: string;
    // Joined data
    lead?: {
        id: string;
        name: string;
        phone: string;
    } | null;
    employee?: {
        id: string;
        name: string;
    } | null;
}

export interface CreateTaskInput {
    text: string;
    status?: boolean;
    lead_id?: string | null;
    date?: string | null;
    time?: string | null;
    employee_id: string;
}

export interface UpdateTaskInput {
    id: string;
    text?: string;
    status?: boolean;
    lead_id?: string | null;
    date?: string | null;
    time?: string | null;
}

// Query keys
export const taskKeys = {
    all: ["tasks"] as const,
    byEmployee: (employeeId: string) => [...taskKeys.all, "employee", employeeId] as const,
    byBranch: (branchId: string) => [...taskKeys.all, "branch", branchId] as const,
    byLead: (leadId: string) => [...taskKeys.all, "lead", leadId] as const,
    today: (employeeId: string) => [...taskKeys.all, "today", employeeId] as const,
    detail: (id: string) => [...taskKeys.all, id] as const,
};

interface UseTasksOptions {
    employeeId?: string;
    isAdmin?: boolean;
    branchId?: string | null;
    filterEmployeeId?: string | null; // For admin to filter by specific employee
}

// Fetch all tasks for current employee (or filtered tasks if admin)
export function useTasks(options: UseTasksOptions) {
    const { employeeId, isAdmin = false, branchId, filterEmployeeId } = options;

    return useQuery({
        queryKey: isAdmin
            ? [...taskKeys.all, "admin", branchId || "all", filterEmployeeId || "all"]
            : (employeeId ? taskKeys.byEmployee(employeeId) : taskKeys.all),
        queryFn: async () => {
            const supabase = createClient();

            // For admin: get tasks from employees in selected branch
            if (isAdmin && branchId) {
                // First get employee IDs from the selected branch
                const { data: branchEmployees, error: empError } = await supabase
                    .from("xodimlar")
                    .select("id")
                    .eq("branch_id", branchId);

                if (empError) throw empError;

                const employeeIds = branchEmployees?.map(e => e.id) || [];

                if (employeeIds.length === 0) {
                    return [] as Task[];
                }

                let query = supabase
                    .from("tasks")
                    .select(`
                        *,
                        lead:leads(id, name, phone),
                        employee:xodimlar(id, name)
                    `)
                    .in("employee_id", employeeIds)
                    .order("date", { ascending: true, nullsFirst: false })
                    .order("time", { ascending: true, nullsFirst: false });

                // Additional filter by specific employee
                if (filterEmployeeId) {
                    query = query.eq("employee_id", filterEmployeeId);
                }

                const { data, error } = await query;
                if (error) throw error;
                return data as Task[];
            }

            // For regular users: only their own tasks
            let query = supabase
                .from("tasks")
                .select(`
                    *,
                    lead:leads(id, name, phone),
                    employee:xodimlar(id, name)
                `)
                .order("date", { ascending: true, nullsFirst: false })
                .order("time", { ascending: true, nullsFirst: false });

            if (employeeId) {
                query = query.eq("employee_id", employeeId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Task[];
        },
        enabled: isAdmin ? !!branchId : !!employeeId,
    });
}

// Fetch employees by branch for filtering
export function useBranchEmployees(branchId: string | null | undefined) {
    return useQuery({
        queryKey: ["employees", "branch", branchId || "none"],
        queryFn: async () => {
            if (!branchId) return [];

            const supabase = createClient();
            const { data, error } = await supabase
                .from("xodimlar")
                .select("id, name, email")
                .eq("branch_id", branchId)
                .order("name", { ascending: true });

            if (error) throw error;
            return data as { id: string; name: string; email: string }[];
        },
        enabled: !!branchId,
    });
}

// Fetch today's tasks
export function useTodayTasks(employeeId: string | undefined) {
    const today = new Date().toISOString().split("T")[0];

    return useQuery({
        queryKey: employeeId ? taskKeys.today(employeeId) : taskKeys.all,
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("tasks")
                .select(`
                    *,
                    lead:leads(id, name, phone),
                    employee:xodimlar(id, name)
                `)
                .eq("employee_id", employeeId)
                .eq("date", today)
                .order("time", { ascending: true, nullsFirst: false });

            if (error) throw error;
            return data as Task[];
        },
        enabled: !!employeeId,
    });
}

// Fetch tasks by lead
export function useTasksByLead(leadId: string) {
    return useQuery({
        queryKey: taskKeys.byLead(leadId),
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("tasks")
                .select(`
                    *,
                    employee:xodimlar(id, name)
                `)
                .eq("lead_id", leadId)
                .order("date", { ascending: true })
                .order("time", { ascending: true });

            if (error) throw error;
            return data as Task[];
        },
        enabled: !!leadId,
    });
}

// Create task
export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateTaskInput) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("tasks")
                .insert({
                    text: input.text,
                    status: input.status ?? false,
                    lead_id: input.lead_id || null,
                    date: input.date || null,
                    time: input.time || null,
                    employee_id: input.employee_id,
                })
                .select(`
                    *,
                    lead:leads(id, name, phone),
                    employee:xodimlar(id, name)
                `)
                .single();

            if (error) throw error;
            return data as Task;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            if (data.employee_id) {
                queryClient.invalidateQueries({ queryKey: taskKeys.byEmployee(data.employee_id) });
                queryClient.invalidateQueries({ queryKey: taskKeys.today(data.employee_id) });
            }
            if (data.lead_id) {
                queryClient.invalidateQueries({ queryKey: taskKeys.byLead(data.lead_id) });
            }
        },
    });
}

// Update task
export function useUpdateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateTaskInput) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("tasks")
                .update({
                    ...(input.text !== undefined && { text: input.text }),
                    ...(input.status !== undefined && { status: input.status }),
                    ...(input.lead_id !== undefined && { lead_id: input.lead_id }),
                    ...(input.date !== undefined && { date: input.date }),
                    ...(input.time !== undefined && { time: input.time }),
                })
                .eq("id", input.id)
                .select(`
                    *,
                    lead:leads(id, name, phone),
                    employee:xodimlar(id, name)
                `)
                .single();

            if (error) throw error;
            return data as Task;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            if (data.employee_id) {
                queryClient.invalidateQueries({ queryKey: taskKeys.byEmployee(data.employee_id) });
                queryClient.invalidateQueries({ queryKey: taskKeys.today(data.employee_id) });
            }
        },
    });
}

// Toggle task status
export function useToggleTaskStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("tasks")
                .update({ status })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as Task;
        },
        onMutate: async ({ id, status }) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: taskKeys.all });

            // Update all task queries optimistically
            queryClient.setQueriesData<Task[]>(
                { queryKey: taskKeys.all },
                (old) => old?.map((task) => (task.id === id ? { ...task, status } : task))
            );
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
}

// Delete task
export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient();
            const { error } = await supabase.from("tasks").delete().eq("id", id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
}
