import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export function useFeedbackNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lastFeedbackCount, setLastFeedbackCount] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Only admins and supervisors get notifications
  const shouldCheckNotifications = user?.role === 'admin' || user?.role === 'supervisor';

  const { data: feedbacks = [] } = useQuery({
    queryKey: ["/api/feedbacks"],
    queryFn: async () => {
      if (!shouldCheckNotifications) return [];
      
      const response = await fetch("/api/feedbacks", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: shouldCheckNotifications,
    refetchInterval: 30000, // Check every 30 seconds
    refetchIntervalInBackground: true
  });

  // Count pending feedbacks
  const pendingFeedbacks = feedbacks.filter((f: any) => f.status === 'pending');
  const pendingCount = pendingFeedbacks.length;

  useEffect(() => {
    if (!shouldCheckNotifications || !isInitialized) {
      if (feedbacks.length > 0 && !isInitialized) {
        setLastFeedbackCount(pendingCount);
        setIsInitialized(true);
      }
      return;
    }

    // Check for new pending feedbacks
    if (lastFeedbackCount !== null && pendingCount > lastFeedbackCount) {
      const newFeedbacksCount = pendingCount - lastFeedbackCount;
      
      toast({
        title: "Novo Feedback Recebido!",
        description: `${newFeedbacksCount} novo${newFeedbacksCount > 1 ? 's' : ''} feedback${newFeedbacksCount > 1 ? 's' : ''} pendente${newFeedbacksCount > 1 ? 's' : ''} de análise.`,
        duration: 5000,
      });
    }

    setLastFeedbackCount(pendingCount);
  }, [pendingCount, lastFeedbackCount, shouldCheckNotifications, isInitialized, toast]);

  return {
    pendingCount,
    totalCount: feedbacks.length,
    hasNewFeedbacks: shouldCheckNotifications && pendingCount > 0,
    shouldShowNotifications: shouldCheckNotifications
  };
}