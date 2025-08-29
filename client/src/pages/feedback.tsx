import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Plus, MessageSquare, Bug, Lightbulb, Star, ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";

const feedbackFormSchema = insertFeedbackSchema.extend({
  category: z.string().optional(),
  tags: z.array(z.string()).optional()
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

const typeIcons = {
  bug: Bug,
  suggestion: Lightbulb,
  feature_request: Star,
  complaint: MessageSquare,
  compliment: ThumbsUp
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  in_review: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800", 
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800"
};

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

export default function FeedbackPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "suggestion",
      priority: "medium",
      category: "",
      tags: []
    }
  });

  // Query feedbacks
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["/api/feedbacks"],
    queryFn: async () => {
      const response = await fetch("/api/feedbacks", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch feedbacks");
      return response.json();
    }
  });

  // Create feedback mutation
  const createFeedbackMutation = useMutation({
    mutationFn: (data: FeedbackFormData) => apiRequest("/api/feedbacks", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Feedback enviado",
        description: "Seu feedback foi enviado com sucesso!"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao enviar feedback",
        variant: "destructive"
      });
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: number }) => 
      apiRequest(`/api/feedbacks/${id}/vote`, {
        method: "POST",
        body: JSON.stringify({ vote })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
      toast({
        title: "Voto registrado",
        description: "Seu voto foi registrado com sucesso!"
      });
    }
  });

  const onSubmit = (data: FeedbackFormData) => {
    createFeedbackMutation.mutate(data);
  };

  const myFeedbacks = feedbacks.filter((f: any) => f.submittedById === user?.id);
  const allFeedbacks = feedbacks;

  const renderFeedbackCard = (feedback: any, showActions = false) => {
    const TypeIcon = typeIcons[feedback.type as keyof typeof typeIcons];
    
    return (
      <Card key={feedback.id} className="mb-4" data-testid={`card-feedback-${feedback.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-4 w-4" />
              <CardTitle className="text-base">{feedback.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFeedback(feedback);
                setViewDialogOpen(true);
              }}
              data-testid={`button-view-${feedback.id}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge className={statusColors[feedback.status as keyof typeof statusColors]}>
              {feedback.status}
            </Badge>
            <Badge className={priorityColors[feedback.priority as keyof typeof priorityColors]}>
              {feedback.priority}
            </Badge>
            <Badge variant="outline">
              {feedback.type.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {feedback.description}
          </p>
          {(feedback.type === 'suggestion' || feedback.type === 'feature_request') && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Votos: {feedback.votes || 0}
              </span>
              {showActions && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => voteMutation.mutate({ id: feedback.id, vote: 1 })}
                    data-testid={`button-upvote-${feedback.id}`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => voteMutation.mutate({ id: feedback.id, vote: -1 })}
                    data-testid={`button-downvote-${feedback.id}`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
          {feedback.response && (
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Resposta:</p>
              <p className="text-sm">{feedback.response}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Feedback & Sugestões</h1>
          <p className="text-muted-foreground">
            Compartilhe suas ideias e nos ajude a melhorar a plataforma
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-feedback">
              <Plus className="mr-2 h-4 w-4" />
              Novo Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar Feedback</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bug">Bug</SelectItem>
                            <SelectItem value="suggestion">Sugestão</SelectItem>
                            <SelectItem value="feature_request">Nova Funcionalidade</SelectItem>
                            <SelectItem value="complaint">Reclamação</SelectItem>
                            <SelectItem value="compliment">Elogio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: UI/UX, Performance, Segurança" data-testid="input-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createFeedbackMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createFeedbackMutation.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="my-feedback" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-feedback" data-testid="tab-my-feedback">
            Meus Feedbacks ({myFeedbacks.length})
          </TabsTrigger>
          <TabsTrigger value="all-feedback" data-testid="tab-all-feedback">
            Todos ({allFeedbacks.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-feedback" className="mt-6">
          {myFeedbacks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum feedback enviado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece compartilhando suas ideias e sugestões!
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Enviar Primeiro Feedback
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myFeedbacks.map((feedback: any) => renderFeedbackCard(feedback, false))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all-feedback" className="mt-6">
          <div className="space-y-4">
            {allFeedbacks.map((feedback: any) => renderFeedbackCard(feedback, true))}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Feedback Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Feedback</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{selectedFeedback.title}</h3>
                <div className="flex gap-2 mt-2">
                  <Badge className={statusColors[selectedFeedback.status as keyof typeof statusColors]}>
                    {selectedFeedback.status}
                  </Badge>
                  <Badge className={priorityColors[selectedFeedback.priority as keyof typeof priorityColors]}>
                    {selectedFeedback.priority}
                  </Badge>
                  <Badge variant="outline">
                    {selectedFeedback.type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Descrição</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFeedback.description}
                </p>
              </div>

              {selectedFeedback.category && (
                <div>
                  <Label>Categoria</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFeedback.category}
                  </p>
                </div>
              )}

              {(selectedFeedback.type === 'suggestion' || selectedFeedback.type === 'feature_request') && (
                <div>
                  <Label>Votos</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">{selectedFeedback.votes || 0}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => voteMutation.mutate({ id: selectedFeedback.id, vote: 1 })}
                        data-testid="button-upvote-detail"
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => voteMutation.mutate({ id: selectedFeedback.id, vote: -1 })}
                        data-testid="button-downvote-detail"
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {selectedFeedback.response && (
                <div>
                  <Label>Resposta da Equipe</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedFeedback.response}</p>
                    {selectedFeedback.respondedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Respondido em {new Date(selectedFeedback.respondedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Enviado em {new Date(selectedFeedback.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}