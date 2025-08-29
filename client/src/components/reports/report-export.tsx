import { Button } from '@/components/ui/button';
import { Download, FileText, Table } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportExportProps {
  data: any;
  title: string;
  reportType: 'conversations' | 'agents' | 'clients' | 'queues';
}

export default function ReportExport({ data, title, reportType }: ReportExportProps) {
  const { t } = useT();

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    
    // Add generated date
    doc.setFontSize(10);
    doc.text(`${t('reports.generateReport')}: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
    
    // Prepare table data based on report type
    let tableData: any[] = [];
    let headers: string[] = [];
    
    switch (reportType) {
      case 'conversations':
        headers = ['Data', 'Conversas', 'Finalizadas', 'Tempo Médio'];
        tableData = data.map((item: any) => [
          item.date,
          item.total.toString(),
          item.completed.toString(),
          item.avgTime
        ]);
        break;
      case 'agents':
        headers = ['Agente', 'Tickets Resolvidos', 'Tempo Resposta', 'Taxa Finalização'];
        tableData = data.map((item: any) => [
          item.name,
          item.resolvedTickets.toString(),
          item.avgResponseTime,
          `${item.completionRate}%`
        ]);
        break;
      case 'clients':
        headers = ['Cliente', 'Tickets Abertos', 'Última Atividade', 'Status'];
        tableData = data.map((item: any) => [
          item.name,
          item.ticketsOpened.toString(),
          item.lastActivity,
          item.status
        ]);
        break;
      case 'queues':
        headers = ['Fila', 'Volume', 'Tempo Médio', 'Satisfação'];
        tableData = data.map((item: any) => [
          item.name,
          item.volume.toString(),
          item.avgTime,
          `${item.satisfaction}%`
        ]);
        break;
    }
    
    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    XLSX.writeFile(workbook, `${title.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToPDF}
        className="flex items-center space-x-2"
        data-testid="button-export-pdf"
      >
        <FileText className="h-4 w-4" />
        <span>{t('reports.exportPDF')}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToExcel}
        className="flex items-center space-x-2"
        data-testid="button-export-excel"
      >
        <Table className="h-4 w-4" />
        <span>{t('reports.exportExcel')}</span>
      </Button>
    </div>
  );
}