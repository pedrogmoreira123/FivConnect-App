import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export interface InstanceStatus {
  status: 'active' | 'suspended' | 'pending_payment';
  billingStatus: 'paid' | 'overdue';
  enabledFeatures: {
    chat: boolean;
    chatbot: boolean;
    ai_agent: boolean;
  };
  isLocked: boolean;
  needsPaymentNotification: boolean;
  lockMessage?: string;
  lastStatusCheck?: string;
  lastSuccessfulCheck?: string;
}

export function useInstanceStatus() {
  const [hasShownPaymentNotification, setHasShownPaymentNotification] = useState(false);

  const { data: instanceStatus, isLoading, error, refetch } = useQuery<InstanceStatus>({
    queryKey: ["/api/instance/status"],
    queryFn: async () => {
      const response = await fetch("/api/instance/status");
      if (!response.ok) {
        throw new Error(`Failed to fetch instance status: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Mark payment notification as shown
  const markPaymentNotificationShown = async () => {
    try {
      await fetch("/api/instance/mark-notification-shown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      setHasShownPaymentNotification(true);
      // Refetch status to update the needsPaymentNotification flag
      refetch();
    } catch (error) {
      console.error("Failed to mark payment notification as shown:", error);
    }
  };

  // Show payment notification automatically if needed
  useEffect(() => {
    if (
      instanceStatus?.needsPaymentNotification && 
      !hasShownPaymentNotification &&
      instanceStatus.status === 'pending_payment'
    ) {
      // We'll handle this in the component that uses this hook
    }
  }, [instanceStatus?.needsPaymentNotification, hasShownPaymentNotification, instanceStatus?.status]);

  return {
    instanceStatus: instanceStatus || {
      status: 'active' as const,
      billingStatus: 'paid' as const,
      enabledFeatures: { chat: true, chatbot: true, ai_agent: false },
      isLocked: false,
      needsPaymentNotification: false,
    },
    isLoading,
    error,
    refetch,
    markPaymentNotificationShown,
    hasShownPaymentNotification,
  };
}