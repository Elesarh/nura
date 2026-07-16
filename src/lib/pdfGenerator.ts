// PDF Generator stub — will be implemented with jsPDF
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function downloadInvoicePDF(data: any, fileName: string = 'invoice.pdf') {
  const doc = new jsPDF();
  doc.text('Invoice', 10, 10);
  doc.save(fileName);
}

export function directPrintElement(elementId: string) {
  const el = document.getElementById(elementId);
  if (el) window.print();
}
