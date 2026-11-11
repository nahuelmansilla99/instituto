import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MergedStudentRow } from '../../features/admin/admin-course-editor/admin-course-editor.component';

export interface PdfExportColumnsConfig {
  includeSummaryStats: boolean;
  includeActiveFiltersInfo: boolean;
  indexNumber: boolean;
  name: boolean;
  email: boolean;
  status: boolean;
  enrolledAt: boolean;
  registeredAt: boolean;
  progressPercentage: boolean;
  completedLessons: boolean;
  averageScore: boolean;
}

export interface PdfExportOptions {
  courseTitle: string;
  students: MergedStudentRow[];
  excludedCount: number;
  activeFilterLabels: string[];
  columns: PdfExportColumnsConfig;
}

@Injectable({
  providedIn: 'root',
})
export class PdfReportService {
  generateStudentsReportPdf(options: PdfExportOptions): void {
    const { courseTitle, students, excludedCount, activeFilterLabels, columns } = options;

    // Count how many table columns are active to decide portrait vs landscape
    const activeColCount = [
      columns.indexNumber,
      columns.name,
      columns.email,
      columns.status,
      columns.enrolledAt,
      columns.registeredAt,
      columns.progressPercentage,
      columns.completedLessons,
      columns.averageScore,
    ].filter(Boolean).length;

    const orientation = activeColCount > 6 ? 'landscape' : 'portrait';
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    let currentY = 16;

    // 1. Header Banner
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setTextColor(48, 163, 216); // Primary cyan accent
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('REPORTE DE ALUMNOS', marginX, 11);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const truncatedCourseTitle =
      courseTitle.length > 65 ? courseTitle.substring(0, 62) + '...' : courseTitle;
    doc.text(truncatedCourseTitle, marginX, 19);

    const nowStr = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Fecha de emisión: ${nowStr}`, marginX, 26);
    doc.text(
      `Total exportados: ${students.length} alumno(s)${excludedCount > 0 ? ` (${excludedCount} excluido/s)` : ''}`,
      pageWidth - marginX,
      26,
      { align: 'right' },
    );

    currentY = 38;

    // 2. Active Filters Info (if enabled)
    if (columns.includeActiveFiltersInfo && activeFilterLabels.length > 0) {
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.setDrawColor(203, 213, 225); // Slate 300
      doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 10, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('Filtros aplicados:', marginX + 3, currentY + 6.3);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const filtersText = activeFilterLabels.join('  •  ');
      doc.text(filtersText, marginX + 29, currentY + 6.3);

      currentY += 14;
    }

    // 3. Summary KPIs Box (calculated over the included students)
    if (columns.includeSummaryStats) {
      const enrolledIncluded = students.filter((s) => s.isEnrolled);
      const avgProgress =
        enrolledIncluded.length > 0
          ? Math.round(
              enrolledIncluded.reduce((acc, s) => acc + (s.progressPercentage || 0), 0) /
                enrolledIncluded.length,
            )
          : 0;

      const withScores = enrolledIncluded.filter(
        (s) => s.averageScore !== null && s.averageScore !== undefined,
      );
      const avgScore =
        withScores.length > 0
          ? Math.round(
              withScores.reduce((acc, s) => acc + (s.averageScore || 0), 0) / withScores.length,
            )
          : null;

      const boxWidth = (pageWidth - marginX * 2 - 8) / 3;
      const boxHeight = 16;

      // Card 1: Alumnos en el reporte
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, currentY, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('ALUMNOS EN REPORTE', marginX + 4, currentY + 5.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`${students.length}`, marginX + 4, currentY + 12.5);

      // Card 2: Avance Promedio
      const card2X = marginX + boxWidth + 4;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(card2X, currentY, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('AVANCE PROMEDIO (MATRICULADOS)', card2X + 4, currentY + 5.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(2, 132, 199);
      doc.text(`${avgProgress}%`, card2X + 4, currentY + 12.5);

      // Card 3: Promedio en Quizes
      const card3X = marginX + (boxWidth + 4) * 2;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(card3X, currentY, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('PROMEDIO EN QUIZES', card3X + 4, currentY + 5.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text(avgScore !== null ? `${avgScore}%` : 'Sin notas', card3X + 4, currentY + 12.5);

      currentY += boxHeight + 6;
    }

    // 4. Build Table Headers & Rows dynamically based on selected columns
    const headRow: string[] = [];
    if (columns.indexNumber) headRow.push('#');
    if (columns.name) headRow.push('Nombre Completo');
    if (columns.email) headRow.push('Email');
    if (columns.status) headRow.push('Estado');
    if (columns.enrolledAt) headRow.push('Fecha Matrícula');
    if (columns.registeredAt) headRow.push('Fecha Registro');
    if (columns.progressPercentage) headRow.push('Avance');
    if (columns.completedLessons) headRow.push('Clases Aprobadas');
    if (columns.averageScore) headRow.push('Promedio Quiz');

    const bodyRows: (string | number)[][] = students.map((student, idx) => {
      const row: (string | number)[] = [];

      if (columns.indexNumber) {
        row.push(idx + 1);
      }
      if (columns.name) {
        row.push(student.name || '-');
      }
      if (columns.email) {
        row.push(student.email || '-');
      }
      if (columns.status) {
        row.push(this.formatStatus(student));
      }
      if (columns.enrolledAt) {
        row.push(this.formatDate(student.enrolledAt));
      }
      if (columns.registeredAt) {
        row.push(this.formatDate(student.createdAt));
      }
      if (columns.progressPercentage) {
        row.push(student.isEnrolled ? `${student.progressPercentage ?? 0}%` : '-');
      }
      if (columns.completedLessons) {
        row.push(
          student.isEnrolled
            ? `${student.completedLessons ?? 0} / ${student.totalLessons ?? 0}`
            : '-',
        );
      }
      if (columns.averageScore) {
        row.push(
          student.isEnrolled && student.averageScore !== null && student.averageScore !== undefined
            ? `${student.averageScore}%`
            : '-',
        );
      }

      return row;
    });

    if (headRow.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [headRow],
        body: bodyRows,
        margin: { left: marginX, right: marginX, bottom: 16 },
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 3,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: () => {
          // Footer on each page
          const totalPages = (doc as any).internal.getNumberOfPages();
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Página ${currentPage} de ${totalPages}`,
            pageWidth - marginX,
            pageHeight - 8,
            { align: 'right' },
          );
          doc.text(
            `${courseTitle} — Listado de Alumnos`,
            marginX,
            pageHeight - 8,
          );
        },
      });
    }

    // 5. Save file with clean slugified name
    const safeCourseSlug = courseTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 40);
    const dateStamp = new Date().toISOString().slice(0, 10);

    doc.save(`alumnos-${safeCourseSlug || 'curso'}-${dateStamp}.pdf`);
  }

  private formatStatus(student: MergedStudentRow): string {
    if (student.isEnrolled) return 'Matriculado';
    if (student.isDropped) return 'Dado de baja';
    return 'No Matriculado';
  }

  private formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
