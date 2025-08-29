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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  Star, 
  ThumbsUp, 
  Eye, 
  Reply,
  Filter,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

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

export default function FeedbackManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Query feedbacks (admin can see all)
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

  // Update feedback mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/feedbacks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
      toast({
        title: "Feedback atualizado",
        description: "O status do feedback foi atualizado com sucesso!"
      });
    }
  });

  // Respond to feedback mutation
  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      apiRequest(`/api/feedbacks/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({ response })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
      setResponseDialogOpen(false);
      setResponseText("");
      toast({
        title: "Resposta enviada",
        description: "Sua resposta foi enviada com sucesso!"
      });
    }
  });

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter((feedback: any) => {
    const statusMatch = statusFilter === "all" || feedback.status === statusFilter;
    const typeMatch = typeFilter === "all" || feedback.type === typeFilter;
    return statusMatch && typeMatch;
  });

  // Get statistics
  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter((f: any) => f.status === "pending").length,
    inReview: feedbacks.filter((f: any) => f.status === "in_review").length,
    resolved: feedbacks.filter((f: any) => f.status === "resolved").length,
    bugs: feedbacks.filter((f: any) => f.type === "bug").length,
    suggestions: feedbacks.filter((f: any) => f.type === "suggestion").length,
    features: feedbacks.filter((f: any) => f.type === "feature_request").length
  };

  const handleStatusChange = (feedbackId: string, newStatus: string) => {
    updateFeedbackMutation.mutate({
      id: feedbackId,
      data: { status: newStatus }
    });
  };

  const handleAssign = (feedbackId: string, assignedToId: string) => {
    updateFeedbackMutation.mutate({
      id: feedbackId,
      data: { assignedToId }
    });
  };

  const handleRespond = (feedback: any) => {
    setSelectedFeedback(feedback);
    setResponseDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Análise</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inReview}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolvidos</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_review">Em Análise</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="suggestion">Sugestão</SelectItem>
                  <SelectItem value="feature_request">Nova Funcionalidade</SelectItem>
                  <SelectItem value="complaint">Reclamação</SelectItem>
                  <SelectItem value="compliment">Elogio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Feedbacks ({filteredFeedbacks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedbacks.map((feedback: any) => {
                const TypeIcon = typeIcons[feedback.type as keyof typeof typeIcons];
                return (
                  <TableRow key={feedback.id} data-testid={`row-feedback-${feedback.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        <span className="font-medium">{feedback.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {feedback.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={feedback.status}
                        onValueChange={(value) => handleStatusChange(feedback.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="in_review">Em Análise</SelectItem>
                          <SelectItem value="in_progress">Em Progresso</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                          <SelectItem value="closed">Fechado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[feedback.priority as keyof typeof priorityColors]}>
                        {feedback.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {feedback.submittedById || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(feedback.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRespond(feedback)}
                          data-testid={`button-respond-${feedback.id}`}
                        >
                          <Reply className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {filteredFeedbacks.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum feedback encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Responder Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFeedback && (
              <div>
                <Label>Feedback</Label>
                <p className="text-sm font-medium">{selectedFeedback.title}</p>
                <p className="text-sm text-muted-foreground">{selectedFeedback.description}</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="response">Sua Resposta</Label>
              <Textarea
                id="response"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Digite sua resposta..."
                rows={4}
                data-testid="textarea-response"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setResponseDialogOpen(false)}
                data-testid="button-cancel-response"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => selectedFeedback && respondMutation.mutate({
                  id: selectedFeedback.id,
                  response: responseText
                })}
                disabled={!responseText.trim() || respondMutation.isPending}
                data-testid="button-send-response"
              >
                {respondMutation.isPending ? "Enviando..." : "Enviar Resposta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}