
import { CompletedService } from "../types";
import { supabase } from "@/integrations/supabase/client";

export async function getCompletedServices(): Promise<CompletedService[]> {
  const { data, error } = await supabase
    .from('completed_services')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching completed services:', error);
    return [];
  }
  
  // Mapping to the correct format
  return data.map(item => ({
    id: item.id,
    mechanicId: item.mechanic_id || "",
    serviceIds: item.service_ids,
    totalAmount: Number(item.total_amount),
    receivedAmount: Number(item.received_amount),
    completionDate: item.completion_date,
    createdAt: item.created_at
  }));
}

export async function addCompletedService(completedService: Omit<CompletedService, "id">): Promise<CompletedService[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('completed_services')
    .insert([{
      mechanic_id: completedService.mechanicId,
      service_ids: completedService.serviceIds,
      total_amount: completedService.totalAmount,
      received_amount: completedService.receivedAmount,
      completion_date: completedService.completionDate,
      created_at: completedService.createdAt,
      created_by: user?.id
    }]);

  if (error) {
    console.error('Error adding completed service:', error);
    return [];
  }

  return getCompletedServices();
}
