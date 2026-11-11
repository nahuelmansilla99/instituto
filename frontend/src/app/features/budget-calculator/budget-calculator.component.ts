import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { BudgetCalculatorService } from '../../core/services/budget-calculator.service';
import {
  BudgetCalculationResult,
  BudgetCurrency,
  BudgetFormValues,
  BudgetGroupInfo,
  BudgetGroupKey,
  BudgetItemRow,
  CommercialMode,
  DEFAULT_BUDGET_VALUES,
} from '../../core/models/budget-calculator.model';

export interface BudgetTourStep {
  targetId?: string;
  badge: string;
  title: string;
  description: string;
  hint?: string;
  icon: string;
}

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isDanger?: boolean;
  onConfirm: () => void;
}

export interface CompositionSegment {
  key: string;
  label: string;
  amount: number;
  pct: number;
  color: string;
}

@Component({
  selector: 'app-budget-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, NavbarComponent],
  templateUrl: './budget-calculator.component.html',
  styleUrl: './budget-calculator.component.css',
})
export class BudgetCalculatorComponent implements OnInit {
  readonly budgetService = inject(BudgetCalculatorService);

  @Input() isDrawer: boolean = false;
  @Output() closeDrawer = new EventEmitter<void>();

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  // Estado reactivo principal del presupuesto
  readonly values = signal<BudgetFormValues>({ ...DEFAULT_BUDGET_VALUES });
  readonly rows = signal<BudgetItemRow[]>(this.budgetService.createFreshRows());
  readonly simulation = signal<boolean>(false);

  // Feedback visual y notificaciones
  readonly copiedFeedback = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'error'>('success');

  // Modal de confirmación elegante
  readonly confirmModal = signal<ConfirmModalState | null>(null);

  // Estado para la Guía Interactiva (Onboarding Tour)
  readonly isTourActive = signal<boolean>(false);
  readonly tourStep = signal<number>(0);

  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly groups: BudgetGroupInfo[] = this.budgetService.getGroups();

  readonly tourSteps: BudgetTourStep[] = [
    {
      targetId: 'budget-intro',
      badge: 'Bienvenida',
      title: '¡Bienvenido a la Calculadora de Presupuesto FV!',
      description:
        'Esta herramienta práctica te permite estructurar el presupuesto completo de una obra fotovoltaica combinando costos en pesos (ARS) y dólares (USD).',
      hint: 'Podés comenzar cargando el "Ejemplo simulado" con un clic para explorar un caso completo de inmediato.',
      icon: '📋',
    },
    {
      targetId: 'budget-step-general',
      badge: 'Paso 1 de 5',
      title: 'Paso 1: Datos de la Obra y Cotización USD',
      description:
        'Definí el nombre del proyecto, la cotización manual de referencia (ARS por 1 USD) y el origen o acuerdo de ese tipo de cambio.',
      hint: 'Si varía el dólar, se actualizan en pesos los ítems cotizados en USD mientras los cargados en ARS mantienen su valor.',
      icon: '💱',
    },
    {
      targetId: 'budget-step-rubros',
      badge: 'Paso 2 de 5',
      title: 'Paso 2: Rubros de Costos e Ítems',
      description:
        'Los costos directos se organizan en 4 rubros: Materiales y equipos, Mano de obra propia, Adicionales/logística y Servicios profesionales externos.',
      hint: 'Podés activar o excluir cada concepto, cambiar su moneda (ARS/USD), editar cantidades o agregar nuevos conceptos.',
      icon: '🔧',
    },
    {
      targetId: 'budget-step-ajustes',
      badge: 'Paso 3 de 5',
      title: 'Paso 3: Ajustes Comerciales e Impositivos',
      description:
        'Configurá el porcentaje de contingencia sobre costos, el criterio comercial (Margen sobre precio de venta o Recargo sobre costo) y el ajuste impositivo.',
      hint: 'Recordá usar costos internos netos para no duplicar márgenes ni impuestos en la estructura.',
      icon: '📈',
    },
    {
      targetId: 'budget-step-alcance',
      badge: 'Paso 4 de 5',
      title: 'Paso 4: Alcance, Condiciones y Respaldo',
      description:
        'Documentá qué incluye la oferta, exclusiones, garantías, obra civil complementaria y condiciones de montaje estructural.',
      hint: 'Podés guardar tu presupuesto en un archivo JSON en tu dispositivo para retomarlo cuando quieras.',
      icon: '📝',
    },
    {
      targetId: 'budget-results-panel',
      badge: 'Resultado Final',
      title: 'Paso 5: Resumen Ejecutivo y Exportación PDF',
      description:
        'A la derecha verás en vivo el desglose por rubro, costo con contingencia, resultado comercial previsto y el precio final en ARS y USD.',
      hint: 'Usá "Imprimir / PDF" para generar una hoja de presupuesto limpia lista para entregar o archivar.',
      icon: '💰',
    },
  ];

  ngOnInit(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const tourSeen = localStorage.getItem('budget_calc_tour_seen');
      if (!tourSeen) {
        setTimeout(() => {
          this.startTour();
        }, 500);
      }
    }
  }

  // Computed: evaluación reactiva del presupuesto o captura del mensaje de validación
  readonly calculationState = computed<{
    result: BudgetCalculationResult | null;
    error: string | null;
  }>(() => {
    const v = this.values();
    const r = this.rows();
    try {
      const res = this.budgetService.calculate(r, v.tc, v.cont, v.benef, v.tax, v.modo);
      return { result: res, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en los datos ingresados.';
      return { result: null, error: msg };
    }
  });

  // Computed: texto de estado inferior idéntico al requerimiento pedagógico
  readonly stateText = computed<string>(() => {
    const calc = this.calculationState();
    const v = this.values();
    if (!calc.result || calc.error || !v.tc) {
      return 'Completá los campos para obtener un resultado válido.';
    }
    const simPrefix = this.simulation() ? 'Ejemplo simulado. ' : '';
    const tcFormatted = this.budgetService.formatCurrency(v.tc, 'ARS');
    return `${simPrefix}Cotización utilizada: ${tcFormatted} por USD. ${calc.result.zeroCostIncludedCount} conceptos incluidos sin costo cargado.`;
  });

  // Computed: segmentos porcentuales para barra visual de composición del precio
  readonly compositionSegments = computed<CompositionSegment[]>(() => {
    const res = this.calculationState().result;
    if (!res || res.total <= 0) return [];

    const rawSegments = [
      { key: 'materiales', label: 'Materiales y equipos', amount: res.sums.materiales, color: '#30a3d8' },
      { key: 'mano', label: 'Mano de obra propia', amount: res.sums.mano, color: '#10b981' },
      { key: 'adicionales', label: 'Adicionales y logística', amount: res.sums.adicionales, color: '#f59e0b' },
      { key: 'externos', label: 'Servicios externos', amount: res.sums.externos, color: '#8b5cf6' },
      { key: 'reserve', label: 'Contingencia', amount: res.reserve, color: '#64748b' },
      { key: 'result', label: 'Resultado comercial', amount: res.result, color: '#059669' },
      { key: 'imp', label: 'Impuesto agregado', amount: res.imp, color: '#e11d48' },
    ];

    return rawSegments
      .filter((s) => s.amount > 0)
      .map((s) => ({
        ...s,
        pct: (s.amount / res.total) * 100,
      }));
  });

  /**
   * Filtra los conceptos pertenecientes a un rubro determinado.
   */
  getRowsByGroup(groupKey: BudgetGroupKey): BudgetItemRow[] {
    return this.rows().filter((r) => r.g === groupKey);
  }

  /**
   * Obtiene el subtotal formateado de un rubro si el cálculo es válido.
   */
  getGroupSubtotalFormatted(groupKey: BudgetGroupKey): string {
    const res = this.calculationState().result;
    if (!res) return '—';
    return this.budgetService.formatCurrency(res.sums[groupKey], 'ARS');
  }

  /**
   * Obtiene el texto de subtotal en ARS para una fila individual ('Excluido', '—' o moneda).
   */
  getRowSubtotalDisplay(row: BudgetItemRow): string {
    if (!row.on) return 'Excluido';
    const calc = this.calculationState();
    const tc = this.values().tc;
    if (calc.error || !tc || tc <= 0) return '—';
    const sub = this.budgetService.computeRowSubtotalArs(row, tc);
    if (!Number.isFinite(sub)) return '—';
    return this.budgetService.formatCurrency(sub, 'ARS');
  }

  // --- ACTUALIZACIÓN DE CAMPOS GENERALES Y AJUSTES ---
  updateObra(obra: string): void {
    this.values.update((prev) => ({ ...prev, obra }));
  }

  updateTc(rawVal: string | number | null): void {
    const parsed = rawVal === '' || rawVal === null ? null : Number(rawVal);
    this.values.update((prev) => ({ ...prev, tc: parsed }));
  }

  applyQuickTc(rate: number): void {
    this.values.update((prev) => ({
      ...prev,
      tc: rate,
      referencia: prev.referencia || 'Cotización manual de referencia',
    }));
  }

  updateReferencia(referencia: string): void {
    this.values.update((prev) => ({ ...prev, referencia }));
  }

  updateCont(rawVal: string | number | null): void {
    const parsed = rawVal === '' || rawVal === null ? null : Number(rawVal);
    this.values.update((prev) => ({ ...prev, cont: parsed }));
  }

  updateModo(modo: CommercialMode): void {
    this.values.update((prev) => ({ ...prev, modo }));
  }

  updateBenef(rawVal: string | number | null): void {
    const parsed = rawVal === '' || rawVal === null ? null : Number(rawVal);
    this.values.update((prev) => ({ ...prev, benef: parsed }));
  }

  updateTax(rawVal: string | number | null): void {
    const parsed = rawVal === '' || rawVal === null ? null : Number(rawVal);
    this.values.update((prev) => ({ ...prev, tax: parsed }));
  }

  updateAlcance(alcance: string): void {
    this.values.update((prev) => ({ ...prev, alcance }));
  }

  // --- GESTIÓN DE FILAS DE CONCEPTOS ---
  toggleRowIncluded(rowId: number, checked: boolean): void {
    this.rows.update((list) =>
      list.map((r) => (r.id === rowId ? { ...r, on: checked } : r)),
    );
  }

  updateRowName(rowId: number, name: string): void {
    this.rows.update((list) =>
      list.map((r) => (r.id === rowId ? { ...r, name } : r)),
    );
  }

  updateRowQuantity(rowId: number, rawVal: string | number | null): void {
    const q = rawVal === '' || rawVal === null ? null : Number(rawVal);
    this.rows.update((list) =>
      list.map((r) => (r.id === rowId ? { ...r, q } : r)),
    );
  }

  updateRowUnit(rowId: number, unit: string): void {
    this.rows.update((list) =>
      list.map((r) => (r.id === rowId ? { ...r, unit } : r)),
    );
  }

  updateRowUnitCost(rowId: number, rawVal: string | number | null): void {
    const v = rawVal === '' || rawVal === null ? null : Number(rawVal);
    this.rows.update((list) =>
      list.map((r) => (r.id === rowId ? { ...r, v } : r)),
    );
  }

  updateRowCurrency(rowId: number, cur: BudgetCurrency): void {
    this.rows.update((list) =>
      list.map((r) => (r.id === rowId ? { ...r, cur } : r)),
    );
  }

  addRow(groupKey: BudgetGroupKey): void {
    const newRow = this.budgetService.createNewRow(groupKey);
    this.rows.update((list) => [...list, newRow]);
  }

  removeRow(rowId: number): void {
    this.rows.update((list) => list.filter((r) => r.id !== rowId));
  }

  // --- EJEMPLO SIMULADO Y VACIADO ---
  promptLoadSimulatedExample(): void {
    this.confirmModal.set({
      isOpen: true,
      title: 'Cargar ejemplo simulado',
      message: 'Se reemplazarán los datos del ejercicio actual por un ejemplo simulado. ¿Continuar?',
      confirmLabel: 'Sí, cargar ejemplo',
      isDanger: false,
      onConfirm: () => {
        this.executeLoadSimulatedExample();
        this.closeConfirmModal();
      },
    });
  }

  executeLoadSimulatedExample(): void {
    const sim = this.budgetService.createSimulatedExample();
    this.values.set(sim.values);
    this.rows.set(sim.rows);
    this.simulation.set(sim.simulation);
    this.showToast('Ejemplo simulado cargado correctamente.', 'success');
  }

  promptClearAll(): void {
    this.confirmModal.set({
      isOpen: true,
      title: 'Vaciar importes',
      message: '¿Vaciar los importes y la cotización del ejercicio?',
      confirmLabel: 'Sí, vaciar datos',
      isDanger: true,
      onConfirm: () => {
        this.executeClearAll();
        this.closeConfirmModal();
      },
    });
  }

  executeClearAll(): void {
    this.rows.set(this.budgetService.createFreshRows());
    this.values.update((prev) => ({
      ...prev,
      tc: null,
      referencia: '',
      alcance: '',
      cont: 0,
      benef: 0,
      tax: 0,
    }));
    this.simulation.set(false);
    this.showToast('Se vaciaron los importes y la cotización del ejercicio.', 'success');
  }

  closeConfirmModal(): void {
    this.confirmModal.set(null);
  }

  // --- EXPORTAR E IMPORTAR JSON / IMPRIMIR / COMPARTIR ---
  saveJsonFile(): void {
    const jsonString = this.budgetService.serializeToJson(
      this.values(),
      this.rows(),
      this.simulation(),
    );
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Datos_presupuesto_fotovoltaico.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.showToast('Archivo JSON de presupuesto descargado.', 'success');
  }

  triggerOpenJsonFile(): void {
    this.fileInputRef?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    try {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 1_000_000) {
        throw new Error('Archivo demasiado grande.');
      }
      const text = await file.text();
      const parsed = this.budgetService.validateAndParseJson(text);

      this.confirmModal.set({
        isOpen: true,
        title: 'Abrir datos guardados',
        message: '¿Reemplazar el ejercicio actual por los datos del archivo?',
        confirmLabel: 'Sí, cargar archivo',
        isDanger: false,
        onConfirm: () => {
          this.values.set(parsed.values);
          this.rows.set(parsed.rows);
          this.simulation.set(parsed.simulation);
          this.closeConfirmModal();
          this.showToast('Datos del archivo cargados con éxito.', 'success');
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Formato desconocido.';
      this.showToast(`No se pudo abrir: ${msg}`, 'error');
    } finally {
      input.value = '';
    }
  }

  printBudget(): void {
    const err = this.calculationState().error;
    if (err) {
      this.showToast('Corregí los datos antes de imprimir: ' + err, 'error');
      return;
    }
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  async shareBudget(): Promise<void> {
    const calc = this.calculationState();
    if (!calc.result || calc.error) {
      this.showToast('Completá una cotización y datos válidos antes de compartir.', 'error');
      return;
    }

    const summary = this.budgetService.generateShareSummary(
      this.values(),
      calc.result,
      this.simulation(),
    );

    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ text: summary })
    ) {
      try {
        await navigator.share({
          title: `Presupuesto FV - ${this.values().obra}`,
          text: summary,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
        this.showToast('¡Resumen del presupuesto copiado al portapapeles!', 'success');
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = summary;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.showToast('¡Resumen del presupuesto copiado al portapapeles!', 'success');
      }
    } catch (e) {
      console.error('Error al copiar presupuesto:', e);
    }
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3800);
  }

  onCloseDrawerClick(): void {
    this.closeDrawer.emit();
  }

  // --- MÉTODOS DE LA GUÍA INTERACTIVA (TOUR) ---
  startTour(): void {
    this.tourStep.set(0);
    this.isTourActive.set(true);
    this.scrollToStepTarget(0);
  }

  nextTourStep(): void {
    const current = this.tourStep();
    if (current < this.tourSteps.length - 1) {
      const next = current + 1;
      this.tourStep.set(next);
      this.scrollToStepTarget(next);
    } else {
      this.finishTour();
    }
  }

  prevTourStep(): void {
    const current = this.tourStep();
    if (current > 0) {
      const prev = current - 1;
      this.tourStep.set(prev);
      this.scrollToStepTarget(prev);
    }
  }

  goToTourStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.tourSteps.length) {
      this.tourStep.set(stepIndex);
      this.scrollToStepTarget(stepIndex);
    }
  }

  skipTour(): void {
    this.finishTour();
  }

  finishTour(): void {
    this.isTourActive.set(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('budget_calc_tour_seen', 'true');
    }
  }

  private scrollToStepTarget(stepIndex: number): void {
    if (typeof document === 'undefined') return;
    const step = this.tourSteps[stepIndex];
    if (!step?.targetId) return;

    setTimeout(() => {
      const el = document.getElementById(step.targetId!);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  }
}
