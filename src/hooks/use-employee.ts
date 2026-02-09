"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Employee } from "@/types/employee";

async function fetchCurrentEmployee(): Promise<Employee | null> {
    const supabase = createClient();

    // Get current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return null;
    }

    // Get employee data by user_id (linked to auth user)
    const { data: employee, error: empError } = await supabase
        .from("xodimlar")
        .select(`
            *,
            department:departments(*),
            branch:branches(*)
        `)
        .eq("employee_id", user.id)
        .single();

    if (empError) {
        console.error("Error fetching employee:", empError);
        return null;
    }

    return employee;
}

export function useEmployee() {
    return useQuery({
        queryKey: ["currentEmployee"],
        queryFn: fetchCurrentEmployee,
        staleTime: 5 * 60 * 1000, // 5 daqiqa cache
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
}

// Get employee by ID
export function useEmployeeById(id: string) {
    return useQuery({
        queryKey: ["employee", id],
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("employees")
                .select(`
                    *,
                    department:departments(*),
                    branch:branches(*)
                `)
                .eq("id", id)
                .single();

            if (error) throw error;
            return data as Employee;
        },
        enabled: !!id,
    });
}

// Get all employees
export function useEmployees() {
    return useQuery({
        queryKey: ["employees"],
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("employees")
                .select(`
                    *,
                    department:departments(*),
                    branch:branches(*)
                `)
                .order("name");

            if (error) throw error;
            return data as Employee[];
        },
    });
}
