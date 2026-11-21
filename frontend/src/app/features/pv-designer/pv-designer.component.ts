import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import {
  PV_CABLE_FIELDS,
  PV_CHECK_LABELS,
  PV_INVERTER_FIELDS,
  PV_MODULE_FIELDS,
  PV_MONTHS,
  PV_REVIEW_CHECKS,
  PV_ZONE_COLORS,
  PvDesignerService,
} from '../../core/services/pv-designer.service';
import {
  PvAssignment,
  PvCable,
  PvCalculationResult,
  PvCalculationSuccess,
  PvCheckStatus,
  PvExampleType,
  PvInverter,
  PvModule,
  PvProjectChecks,
  PvProjectState,
  PvTourStep,
  PvView,
  PvZone,
} from '../../core/models/pv-designer.model';

interface SurfaceTransform {
  scale: number;
  ox: number;
  oy: number;
  z: PvZone;
}

interface PhotoTransform {
  scale: number;
  ox: number;
  oy: number;
}

interface Point2D {
  x: number;
  y: number;
}

@Component({
  selector: 'app-pv-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, NavbarComponent],
  templateUrl: './pv-designer.component.html',
  styleUrl: './pv-designer.component.css',
})
export class PvDesignerComponent implements OnInit, OnDestroy {
  readonly pvService = inject(PvDesignerService);
  private readonly elRef = inject(ElementRef<HTMLElement>);

  @Input() isDrawer = false;
  @Output() closeDrawer = new EventEmitter<void>();

  // Static metadata exposed to template
  readonly months = PV_MONTHS;
  readonly zoneColors = PV_ZONE_COLORS;
  readonly moduleFields = PV_MODULE_FIELDS;
  readonly inverterFields = PV_INVERTER_FIELDS;
  readonly cableFields = PV_CABLE_FIELDS;
  readonly reviewChecks = PV_REVIEW_CHECKS;
  readonly checkLabels = PV_CHECK_LABELS;

  readonly navItems: { view: PvView; code: string; label: string }[] = [
    { view: 'project', code: '01', label: 'Necesidad y recurso' },
    { view: 'surface', code: '02', label: 'Superficie y paneles' },
    { view: 'equipment', code: '03', label: 'Equipos y strings' },
    { view: 'energy', code: '04', label: 'Generación y reserva' },
    { view: 'electrical', code: '05', label: 'Cables y verificaciones' },
    { view: 'report', code: '06', label: 'Informe técnico' },
  ];

  readonly viewTitles: Record<PvView, string> = {
    project: 'Necesidad y recurso solar',
    surface: 'Superficie y distribución de paneles',
    equipment: 'Equipos, strings y MPPT',
    energy: 'Generación y reserva de energía',
    electrical: 'Cables y verificaciones',
    report: 'Informe técnico del anteproyecto',
  };

  // Core reactive state
  readonly state = signal<PvProjectState>(this.pvService.createDefaults());
  readonly activeView = signal<PvView>('project');
  readonly selectedZoneId = signal<number>(1);
  readonly selectedExample = signal<string>('');

  // Surface & Photo tools state
  readonly surfaceTool = signal<'inspect' | 'obstacle'>('inspect');
  readonly photoTool = signal<'reference' | 'sector'>('reference');
  readonly photoScale = signal<number>(0);
  readonly photoReference = signal<number>(10);
  readonly photoOrthographic = signal<boolean>(false);
  readonly photoPoints = signal<Point2D[]>([]);
  readonly hasPhoto = signal<boolean>(false);

  // UI feedback & modals
  readonly isLoadingNasa = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'info' | 'success' | 'error'>('info');
  readonly showMethodModal = signal<boolean>(false);
  readonly showResetModal = signal<boolean>(false);

  // Interactive Tour
  readonly isTourActive = signal<boolean>(false);
  readonly tourStep = signal<number>(0);
  readonly tourSteps: PvTourStep[] = [
    {
      targetId: 'pv-intro',
      badge: 'Bienvenida',
      title: '¡Bienvenido al Diseñador FV!',
      description:
        'Esta herramienta de anteproyecto fotovoltaico integra el relevamiento del sitio, la distribución geométrica de paneles, la configuración de strings y MPPT, la simulación energética, el cableado y un informe técnico imprimible.',
      hint: 'Podés cargar un ejemplo rápido desde el menú lateral (Vivienda 6 kW, Casa rodante 1 kW o Parque 10 MWp) para explorar todo su potencial.',
      icon: '⚡',
    },
    {
      targetId: 'pv-sidebar',
      view: 'project',
      badge: 'Paso 1 de 6',
      title: 'Navegación en 6 etapas',
      description:
        'Usá la barra lateral para avanzar por las 6 secciones del anteproyecto. En la parte superior verás siempre los indicadores clave (kWp, paneles, strings/inversores y MWh/año) actualizados en vivo.',
      hint: 'El indicador de estado te avisa al instante si hay incompatibilidades eléctricas o revisiones pendientes.',
      icon: '🧭',
    },
    {
      targetId: 'pv-content-area',
      view: 'surface',
      badge: 'Paso 2 de 6',
      title: 'Superficies, obstáculos y plano',
      description:
        'Definí uno o más sectores con su orientación e inclinación. Podés dibujar obstáculos directamente sobre el plano o calibrar una vista aérea ortogonal para tomar medidas.',
      hint: 'Elegí la herramienta "Dibujar obstáculo" y arrastrá sobre el plano para excluir zonas de sombra o chimeneas.',
      icon: '📐',
    },
    {
      targetId: 'pv-content-area',
      view: 'equipment',
      badge: 'Paso 3 de 6',
      title: 'Equipos, strings y MPPT',
      description:
        'Verificá automáticamente la ventana de tensión (Voc en frío y Vmp en caliente), las corrientes por entrada y MPPT, y la asignación por inversor. También podés pasar a edición manual.',
      hint: 'Cotejá los datos con las fichas técnicas reales del panel e inversor que vayas a utilizar.',
      icon: '🔌',
    },
    {
      targetId: 'pv-content-area',
      view: 'energy',
      badge: 'Paso 4 de 6',
      title: 'Generación, CSV horario y baterías',
      description:
        'Consultá la generación mensual o importá una serie horaria anual (8.760 h) en CSV para simular compra, inyección y estado de carga (SOC) del banco de baterías en sistemas híbridos o aislados.',
      hint: 'Descargá el archivo "Formato CSV" para ver la estructura exacta de columnas.',
      icon: '📊',
    },
    {
      targetId: 'pv-content-area',
      view: 'report',
      badge: 'Paso 5 de 6',
      title: 'Cables, verificaciones e Informe PDF',
      description:
        'En la sección 05 revisás caídas de tensión CC/CA y la lista de verificaciones. En la sección 06 obtenés el informe técnico completo con esquema unifilar, lista de materiales y exportación CSV/JSON/PDF.',
      hint: 'Guardá tu proyecto en JSON en cualquier momento para retomarlo más adelante sin conexión.',
      icon: '📄',
    },
  ];

  // Non-reactive canvas internals
  private photoImage: HTMLImageElement | null = null;
  private surfaceTransform: SurfaceTransform | null = null;
  private photoTransform: PhotoTransform | null = null;
  private dragState: { type: 'obstacle' | 'sector'; start: Point2D; current: Point2D } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private drawRafId: number | null = null;

  // Computed calculation result
  readonly result = computed<PvCalculationResult>(() => this.pvService.calculate(this.state()));

  readonly validResult = computed<PvCalculationSuccess | null>(() => {
    const res = this.result();
    return res.errors.length === 0 ? (res as PvCalculationSuccess) : null;
  });

  readonly statusInfo = computed<{ type: 'fail' | 'pending'; label: string }>(() => {
    const res = this.result();
    if (res.errors.length > 0) {
      return { type: 'fail', label: 'Datos a corregir' };
    }
    const ok = res as PvCalculationSuccess;
    const failed = ok.checks.filter((c) => c.status === 'fail').length;
    const pending = ok.checks.filter((c) => c.status === 'pending' || c.status === 'warn').length;
    return failed > 0
      ? { type: 'fail', label: `${failed} incompatibilidades` }
      : { type: 'pending', label: `${pending} revisiones pendientes` };
  });

  readonly selectedZone = computed<PvZone>(() => {
    const s = this.state();
    return s.zones.find((z) => z.id === this.selectedZoneId()) ?? s.zones[0];
  });

  readonly layoutCaption = computed<string>(() => {
    const ok = this.validResult();
    if (!ok) return '';
    const s = this.state();
    const z = this.selectedZone();
    const idx = s.zones.indexOf(z);
    const layout = ok.layouts[idx];
    if (!layout) return '';
    const tipo = z.roofType === 'ground' ? 'sobre plano horizontal' : 'en plano de cubierta';
    return `Retiro ${z.edge} m. ${layout.cols} columnas × ${layout.rows} filas antes de obstáculos. Disposición ${tipo}.`;
  });

  readonly todayLabel = new Date().toLocaleDateString('es-AR');

  constructor() {
    effect(() => {
      // Track reactive dependencies that affect canvas rendering
      this.activeView();
      this.state();
      this.result();
      this.selectedZoneId();
      this.photoPoints();
      this.hasPhoto();
      this.scheduleDraw();
    });
  }

  ngOnInit(): void {
    this.scheduleDraw();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    if (this.drawRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.drawRafId);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.drawAll(), 150);
  }

  // =========================================================================
  // NAVIGATION & GENERAL ACTIONS
  // =========================================================================

  setView(view: PvView): void {
    this.activeView.set(view);
    this.scheduleDraw();
  }

  onExampleSelect(value: string): void {
    if (!value) return;
    this.loadExample(value as PvExampleType);
    this.selectedExample.set('');
  }

  loadExample(type: PvExampleType): void {
    const next = this.pvService.createExample(type);
    this.photoImage = null;
    this.hasPhoto.set(false);
    this.photoScale.set(0);
    this.photoReference.set(10);
    this.photoOrthographic.set(false);
    this.photoPoints.set([]);
    this.selectedZoneId.set(next.zones[0].id);
    this.state.set(next);
    this.activeView.set('project');
    this.showToast('Ejemplo cargado. Reemplazá los datos por los de tu proyecto.', 'success');
  }

  confirmReset(): void {
    this.showResetModal.set(true);
  }

  cancelReset(): void {
    this.showResetModal.set(false);
  }

  executeReset(): void {
    this.showResetModal.set(false);
    this.loadExample('home');
  }

  printReport(): void {
    this.activeView.set('report');
    if (this.result().errors.length > 0) {
      this.showToast('Corregir los datos antes de imprimir el informe.', 'error');
      return;
    }
    setTimeout(() => {
      this.drawAll();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (typeof window !== 'undefined') window.print();
        });
      });
    }, 60);
  }

  onCloseDrawerClick(): void {
    this.closeDrawer.emit();
  }

  showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 5000);
  }

  // =========================================================================
  // STATE UPDATERS (IMMUTABLE SIGNAL UPDATES)
  // =========================================================================

  private toNum(val: unknown): number {
    if (val === '' || val === null || val === undefined) return NaN;
    return Number(val);
  }

  updateRoot<K extends keyof PvProjectState>(key: K, rawValue: unknown, isNumber = false): void {
    const value = (isNumber ? this.toNum(rawValue) : rawValue) as PvProjectState[K];
    let clearedHourly = false;
    this.state.update((prev) => {
      const next: PvProjectState = { ...prev, [key]: value };
      if (prev.hourly && (key === 'lat' || key === 'lon')) {
        next.hourly = null;
        clearedHourly = true;
      }
      return next;
    });
    if (clearedHourly) {
      this.showToast('Orientación o sitio cambiado: importar una nueva serie POA horaria.', 'info');
    }
  }

  updatePhases(raw: unknown): void {
    const p = Number(raw) === 3 ? 3 : 1;
    this.state.update((prev) => ({ ...prev, phases: p }));
  }

  updateHsp(monthIndex: number, rawValue: unknown): void {
    const val = this.toNum(rawValue);
    this.state.update((prev) => {
      const hsp = [...prev.hsp];
      hsp[monthIndex] = val;
      return {
        ...prev,
        hsp,
        resourceVerified: false,
        resourceSource: 'Valores mensuales editados por el usuario',
        resourceLat: null,
        resourceLon: null,
      };
    });
  }

  updateAmbient(monthIndex: number, rawValue: unknown): void {
    const val = this.toNum(rawValue);
    this.state.update((prev) => {
      const ambient = [...prev.ambient];
      ambient[monthIndex] = val;
      return {
        ...prev,
        ambient,
        resourceVerified: false,
        resourceSource: 'Valores mensuales editados por el usuario',
        resourceLat: null,
        resourceLon: null,
      };
    });
  }

  updateZone<K extends keyof PvZone>(index: number, key: K, rawValue: unknown, isNumber = false): void {
    const value = (isNumber ? this.toNum(rawValue) : rawValue) as PvZone[K];
    let clearedHourly = false;
    let warnManual = false;
    this.state.update((prev) => {
      const zones = prev.zones.map((z, idx) => (idx === index ? { ...z, [key]: value } : z));
      const next: PvProjectState = { ...prev, zones };
      if (prev.hourly && (key === 'tilt' || key === 'azimuth' || key === 'poaFactor')) {
        next.hourly = null;
        clearedHourly = true;
      }
      if (prev.manual) warnManual = true;
      return next;
    });
    if (clearedHourly) {
      this.showToast('Orientación o sitio cambiado: importar una nueva serie POA horaria.', 'info');
    } else if (warnManual) {
      this.showToast('Revisá las asignaciones manuales después de cambiar sectores.', 'info');
    }
  }

  addZone(): void {
    const current = this.state();
    if (current.zones.length >= 50) {
      this.showToast('Máximo 50 sectores.', 'error');
      return;
    }
    const id = Math.max(0, ...current.zones.map((z) => z.id)) + 1;
    const newZone = this.pvService.createDefaultZone(id, `Sector ${id}`);
    this.state.update((prev) => ({
      ...prev,
      hourly: null,
      zones: [...prev.zones, newZone],
    }));
    this.selectedZoneId.set(id);
  }

  selectZone(id: number): void {
    this.selectedZoneId.set(id);
  }

  removeZone(id: number): void {
    const current = this.state();
    if (current.zones.length <= 1) return;
    const zones = current.zones.filter((z) => z.id !== id);
    const assignments = current.assignments.filter((a) => a.zone !== id);
    this.state.update((prev) => ({
      ...prev,
      hourly: null,
      zones,
      assignments,
    }));
    if (this.selectedZoneId() === id) {
      this.selectedZoneId.set(zones[0].id);
    }
  }

  clearObstacles(id: number): void {
    this.state.update((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === id ? { ...z, obstacles: [] } : z)),
    }));
  }

  updateModule<K extends keyof PvModule>(key: K, rawValue: unknown, isNumber = false): void {
    const value = (isNumber ? this.toNum(rawValue) : rawValue) as PvModule[K];
    this.state.update((prev) => ({
      ...prev,
      module: { ...prev.module, [key]: value },
    }));
  }

  updateInverter<K extends keyof PvInverter>(key: K, rawValue: unknown, isNumber = false): void {
    const value = (isNumber ? this.toNum(rawValue) : rawValue) as PvInverter[K];
    this.state.update((prev) => ({
      ...prev,
      inverter: { ...prev.inverter, [key]: value },
    }));
  }

  updateBattery<K extends keyof PvProjectState['battery']>(key: K, rawValue: unknown): void {
    const value = this.toNum(rawValue);
    this.state.update((prev) => ({
      ...prev,
      battery: { ...prev.battery, [key]: value },
    }));
  }

  updateCable<K extends keyof PvCable>(key: K, rawValue: unknown): void {
    const value = this.toNum(rawValue);
    this.state.update((prev) => ({
      ...prev,
      cable: { ...prev.cable, [key]: value },
    }));
  }

  updateCheck(key: keyof PvProjectChecks, checked: boolean): void {
    this.state.update((prev) => ({
      ...prev,
      checks: { ...prev.checks, [key]: checked },
    }));
  }

  toggleManualMode(): void {
    const prev = this.state();
    if (prev.manual) {
      this.state.update((s) => ({ ...s, manual: false, assignments: [] }));
    } else {
      const ok = this.validResult();
      if (!ok) return;
      this.state.update((s) => ({
        ...s,
        manual: true,
        assignments: ok.rows.map((r) => ({ ...r })),
      }));
    }
  }

  addAssignment(): void {
    const ok = this.validResult();
    const minN = Math.max(1, ok?.limits.minN ?? 1);
    const newRow: PvAssignment = {
      zone: this.selectedZoneId(),
      series: minN,
      parallel: 1,
      quantity: 1,
    };
    this.state.update((prev) => ({
      ...prev,
      assignments: [...prev.assignments, newRow],
    }));
  }

  updateAssignment(index: number, key: keyof PvAssignment, rawValue: unknown): void {
    const val = this.toNum(rawValue);
    this.state.update((prev) => ({
      ...prev,
      assignments: prev.assignments.map((r, idx) => (idx === index ? { ...r, [key]: val } : r)),
    }));
  }

  removeAssignment(index: number): void {
    this.state.update((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((_, idx) => idx !== index),
    }));
  }

  // =========================================================================
  // NASA POWER INTEGRATION
  // =========================================================================

  async loadNasaPower(): Promise<void> {
    if (this.isLoadingNasa()) return;
    const { lat, lon } = this.state();
    this.isLoadingNasa.set(true);
    try {
      const data = await this.pvService.fetchNasaPower(lat, lon);
      const current = this.state();
      if (current.lat !== lat || current.lon !== lon) {
        throw new Error('Las coordenadas cambiaron durante la consulta.');
      }
      this.state.update((prev) => ({
        ...prev,
        hsp: data.hsp,
        ambient: data.ambient,
        resourceLat: lat,
        resourceLon: lon,
        resourceSource: data.resourceSource,
        resourceVerified: true,
      }));
      this.showToast('Recurso horizontal y temperatura obtenidos. Verificá su aplicabilidad al sitio.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showToast(`No se pudo obtener NASA POWER. ${msg} Podés cargar valores mensuales manualmente.`, 'error');
    } finally {
      this.isLoadingNasa.set(false);
    }
  }

  // =========================================================================
  // PHOTO CALIBRATION & UPLOAD
  // =========================================================================

  async onPhotoFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 8e6) {
      this.showToast('Imagen demasiado grande; máximo 8 MB.', 'error');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.showToast('Usar JPG, PNG o WebP.', 'error');
      return;
    }
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsDataURL(file);
      });
      await this.loadPhotoElement(url);
      this.photoScale.set(0);
      this.photoPoints.set([]);
      this.state.update((prev) => ({
        ...prev,
        photo: url,
        zones: prev.zones.map((z) => ({ ...z, photoRect: null })),
      }));
      this.showToast('Imagen cargada. Calibrá dos puntos con una distancia conocida.', 'success');
    } catch {
      this.showToast('No se pudo abrir la imagen.', 'error');
    }
  }

  clearPhoto(): void {
    this.photoImage = null;
    this.hasPhoto.set(false);
    this.photoScale.set(0);
    this.photoPoints.set([]);
    this.state.update((prev) => ({
      ...prev,
      photo: null,
      zones: prev.zones.map((z) => ({ ...z, photoRect: null })),
    }));
  }

  onPhotoReferenceChange(val: unknown): void {
    this.photoReference.set(Number(val));
    this.photoScale.set(0);
    this.photoPoints.set([]);
  }

  setPhotoTool(tool: 'reference' | 'sector'): void {
    this.photoTool.set(tool);
    this.photoPoints.set([]);
  }

  private async loadPhotoElement(url: string): Promise<void> {
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(url)) {
      throw new Error('Imagen inválida');
    }
    this.photoImage = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = url;
    });
    this.hasPhoto.set(true);
  }

  // =========================================================================
  // HOURLY CSV & PROJECT IMPORT / EXPORT
  // =========================================================================

  downloadHourlyTemplate(): void {
    const csv = this.pvService.buildHourlyTemplateCsv(this.state().zones);
    this.downloadFile('Formato_datos_horarios_FV.csv', csv, 'text/csv');
    this.showToast('Formato de dos filas descargado. Completar un año continuo con datos del sitio.', 'success');
  }

  async onHourlyCsvSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 12e6) {
      this.showToast('CSV demasiado grande; máximo 12 MB.', 'error');
      return;
    }
    try {
      const text = await file.text();
      const hourly = this.pvService.parseHourlyCsv(text, file.name, this.state());
      this.state.update((prev) => ({ ...prev, hourly }));
      this.showToast('Serie horaria incorporada. Generación y balance recalculados.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showToast(`No se pudo importar: ${msg}`, 'error');
    }
  }

  removeHourlyData(): void {
    this.state.update((prev) => ({ ...prev, hourly: null }));
    this.showToast('Se volvió a la estimación mensual preliminar.', 'info');
  }

  exportHourlyResults(): void {
    const ok = this.validResult();
    if (!ok?.hourly) return;
    const csv = this.pvService.buildHourlyResultsCsv(this.state(), ok.hourly);
    this.downloadFile('Resultados_horarios_FV.csv', csv, 'text/csv');
  }

  saveProject(): void {
    const s = this.state();
    const safeName = s.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    const json = this.pvService.buildProjectJson(s, {
      scale: this.photoScale(),
      reference: this.photoReference(),
      orthographic: this.photoOrthographic(),
    });
    this.downloadFile(`Proyecto_FV_${safeName}.json`, json, 'application/json');
    this.showToast('Proyecto descargado con los datos y la foto.', 'success');
  }

  async onOpenProjectSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 20e6) {
      this.showToast('Proyecto demasiado grande: máximo 20 MB.', 'error');
      return;
    }
    try {
      const text = await file.text();
      const { state: next, photoCalibration } = this.pvService.parseProjectJson(text);
      if (next.photo) {
        await this.loadPhotoElement(next.photo);
      } else {
        this.photoImage = null;
        this.hasPhoto.set(false);
      }
      this.photoScale.set(photoCalibration.scale);
      this.photoReference.set(photoCalibration.reference);
      this.photoOrthographic.set(photoCalibration.orthographic);
      this.photoPoints.set([]);
      this.selectedZoneId.set(next.zones[0].id);
      this.state.set(next);
      this.showToast('Proyecto abierto correctamente.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showToast(`No se pudo abrir el proyecto: ${msg}`, 'error');
    }
  }

  exportStringsCsv(): void {
    const ok = this.validResult();
    if (!ok) return;
    const csv = this.pvService.buildStringsCsv(this.state(), ok);
    this.downloadFile('Strings_y_MPPT_FV.csv', csv, 'text/csv;charset=utf-8');
  }

  exportResultsJson(): void {
    const ok = this.validResult();
    if (!ok) return;
    const json = this.pvService.buildResultsJson(this.state(), ok);
    this.downloadFile('Resultados_FV.json', json, 'application/json');
  }

  private downloadFile(name: string, content: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // =========================================================================
  // CANVAS POINTER INTERACTIONS (SURFACE OBSTACLES & PHOTO CALIBRATION)
  // =========================================================================

  private getCanvasPoint(event: PointerEvent, canvas: HTMLCanvasElement): Point2D {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  onSurfacePointerDown(event: PointerEvent): void {
    const canvas = event.currentTarget as HTMLCanvasElement;
    if (this.surfaceTool() !== 'obstacle' || !this.surfaceTransform) return;
    canvas.setPointerCapture(event.pointerId);
    const pt = this.getCanvasPoint(event, canvas);
    this.dragState = { type: 'obstacle', start: pt, current: pt };
  }

  onSurfacePointerMove(event: PointerEvent): void {
    if (this.dragState?.type !== 'obstacle') return;
    const canvas = event.currentTarget as HTMLCanvasElement;
    this.dragState.current = this.getCanvasPoint(event, canvas);
    this.drawSurface();
  }

  onSurfacePointerUp(event: PointerEvent): void {
    if (this.dragState?.type !== 'obstacle' || !this.surfaceTransform) return;
    const canvas = event.currentTarget as HTMLCanvasElement;
    const t = this.surfaceTransform;
    const p = this.getCanvasPoint(event, canvas);
    const a = this.dragState.start;
    this.dragState = null;

    const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
    const x1 = clamp((Math.min(a.x, p.x) - t.ox) / t.scale, t.z.width);
    const y1 = clamp((Math.min(a.y, p.y) - t.oy) / t.scale, t.z.height);
    const x2 = clamp((Math.max(a.x, p.x) - t.ox) / t.scale, t.z.width);
    const y2 = clamp((Math.max(a.y, p.y) - t.oy) / t.scale, t.z.height);

    if (x2 - x1 > 0.05 && y2 - y1 > 0.05) {
      const targetId = t.z.id;
      this.state.update((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.id === targetId
            ? { ...z, obstacles: [...z.obstacles, { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }] }
            : z,
        ),
      }));
    } else {
      this.drawSurface();
    }
  }

  onPointerCancel(): void {
    if (this.dragState) {
      const kind = this.dragState.type;
      this.dragState = null;
      if (kind === 'obstacle') this.drawSurface();
      if (kind === 'sector') this.drawPhoto();
    }
  }

  private toPhotoImagePoint(event: PointerEvent, canvas: HTMLCanvasElement): Point2D {
    const p = this.getCanvasPoint(event, canvas);
    const t = this.photoTransform!;
    const img = this.photoImage!;
    return {
      x: Math.max(0, Math.min(img.width, (p.x - t.ox) / t.scale)),
      y: Math.max(0, Math.min(img.height, (p.y - t.oy) / t.scale)),
    };
  }

  onPhotoPointerDown(event: PointerEvent): void {
    const canvas = event.currentTarget as HTMLCanvasElement;
    if (!this.photoImage || !this.photoTransform) return;

    if (this.photoTool() === 'reference') {
      const currentPts = this.photoPoints().length >= 2 ? [] : [...this.photoPoints()];
      currentPts.push(this.toPhotoImagePoint(event, canvas));
      this.photoPoints.set(currentPts);
      if (currentPts.length === 2) {
        const d = Math.hypot(currentPts[0].x - currentPts[1].x, currentPts[0].y - currentPts[1].y);
        const ref = this.photoReference();
        if (d < 5 || !Number.isFinite(ref) || ref <= 0) {
          this.showToast('Referencia inválida: separar los puntos y usar una distancia positiva.', 'error');
          return;
        }
        this.photoScale.set(ref / d);
      }
      this.drawPhoto();
    } else {
      if (!this.photoScale() || !this.photoOrthographic()) {
        this.showToast('Calibrá la imagen y confirmá que es una vista ortogonal.', 'error');
        return;
      }
      canvas.setPointerCapture(event.pointerId);
      const pt = this.toPhotoImagePoint(event, canvas);
      this.dragState = { type: 'sector', start: pt, current: pt };
    }
  }

  onPhotoPointerMove(event: PointerEvent): void {
    if (this.dragState?.type !== 'sector' || !this.photoImage || !this.photoTransform) return;
    const canvas = event.currentTarget as HTMLCanvasElement;
    this.dragState.current = this.toPhotoImagePoint(event, canvas);
    this.drawPhoto();
  }

  onPhotoPointerUp(event: PointerEvent): void {
    if (this.dragState?.type !== 'sector' || !this.photoImage || !this.photoTransform) return;
    const canvas = event.currentTarget as HTMLCanvasElement;
    const p = this.toPhotoImagePoint(event, canvas);
    const a = this.dragState.start;
    this.dragState = null;

    const r = {
      x: Math.min(a.x, p.x),
      y: Math.min(a.y, p.y),
      w: Math.abs(a.x - p.x),
      h: Math.abs(a.y - p.y),
    };
    if (r.w < 5 || r.h < 5) {
      this.drawPhoto();
      return;
    }

    const scale = this.photoScale();
    const targetId = this.selectedZoneId();
    this.state.update((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.id === targetId
          ? {
              ...z,
              width: Number((r.w * scale).toFixed(3)),
              height: Number((r.h * scale).toFixed(3)),
              photoRect: r,
              obstacles: [],
            }
          : z,
      ),
    }));
    this.showToast('Medidas del sector actualizadas desde el plano calibrado.', 'success');
  }

  // =========================================================================
  // CANVAS DRAWING ENGINE
  // =========================================================================

  private scheduleDraw(): void {
    if (typeof requestAnimationFrame === 'undefined') return;
    if (this.drawRafId !== null) cancelAnimationFrame(this.drawRafId);
    this.drawRafId = requestAnimationFrame(() => {
      this.drawRafId = null;
      this.drawAll();
    });
  }

  drawAll(): void {
    this.drawSurface();
    this.drawPhoto();
    this.drawStrings('strings-canvas');
    this.drawStrings('report-strings-canvas');
    this.drawEnergy('energy-canvas');
    this.drawEnergy('report-energy-canvas');
    this.drawDaily();
    this.drawUnifilar();
  }

  private queryCanvas(id: string): HTMLCanvasElement | null {
    const host = this.elRef.nativeElement as HTMLElement;
    return host.querySelector(`#${id}`) as HTMLCanvasElement | null;
  }

  private setupCanvas(id: string, height: number) {
    const canvas = this.queryCanvas(id);
    if (!canvas) return null;
    const w = Math.max(280, canvas.clientWidth);
    const ratio = Math.min(2, (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1);
    canvas.width = w * ratio;
    canvas.height = height * ratio;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, w, height);
    ctx.font = '14px Inter, Arial, sans-serif';
    return { canvas, ctx, w, h: height };
  }

  private drawText(
    ctx: CanvasRenderingContext2D,
    t: string,
    x: number,
    y: number,
    color = '#183448',
    align: CanvasTextAlign = 'left',
    size = 14,
  ): void {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.font = `${size}px Inter, Arial, sans-serif`;
    ctx.fillText(t, x, y);
  }

  private drawLine(ctx: CanvasRenderingContext2D, points: [number, number][], color = '#167ab1', width = 2): void {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    points.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  private drawBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color = '#087ab5',
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    if (label) this.drawText(ctx, label, x + w / 2, y + h / 2 + 5, 'white', 'center', 13);
  }

  private drawSurface(): void {
    const c = this.setupCanvas('surface-canvas', 500);
    if (!c) return;
    const { ctx, w, h } = c;
    const ok = this.validResult();
    if (!ok) {
      this.surfaceTransform = null;
      this.drawText(ctx, 'Corregir datos para visualizar el plano.', 20, 40);
      return;
    }

    const s = this.state();
    const z = this.selectedZone();
    const j = s.zones.indexOf(z);
    const layout = ok.layouts[j];
    if (!layout) return;

    const scale = Math.min((w - 90) / z.width, (h - 100) / z.height);
    const ox = (w - z.width * scale) / 2;
    const oy = 50;
    this.surfaceTransform = { scale, ox, oy, z };

    ctx.fillStyle = '#eaf2f7';
    ctx.fillRect(ox, oy, z.width * scale, z.height * scale);
    ctx.strokeStyle = '#779db5';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, z.width * scale, z.height * scale);

    const used = ok.usedByZone[z.id] || 0;
    const pos = layout.positions;
    const zoneColor = this.zoneColors[j % this.zoneColors.length];

    for (let k = 0; k < pos.length; k++) {
      const p = pos[k];
      ctx.fillStyle = k < used ? zoneColor : '#becedc';
      ctx.fillRect(
        ox + p.x * scale + 0.8,
        oy + p.y * scale + 0.8,
        Math.max(1, p.w * scale - 1.6),
        Math.max(1, p.h * scale - 1.6),
      );
      if (scale > 24 && k < used) {
        for (let n = 1; n < 4; n++) {
          this.drawLine(
            ctx,
            [
              [ox + (p.x + (p.w * n) / 4) * scale, oy + p.y * scale],
              [ox + (p.x + (p.w * n) / 4) * scale, oy + (p.y + p.h) * scale],
            ],
            '#8fc3de',
            0.5,
          );
        }
        this.drawText(
          ctx,
          String(k + 1),
          ox + (p.x + p.w / 2) * scale,
          oy + (p.y + p.h / 2) * scale + 4,
          'white',
          'center',
          Math.min(14, (p.w * scale) / 3),
        );
      }
    }

    if (layout.count > pos.length) {
      ctx.fillStyle = '#ffffffdd';
      ctx.fillRect(ox + 10, oy + 10, Math.min(400, z.width * scale - 20), 55);
      this.drawText(ctx, `Vista parcial: primeras ${pos.length} posiciones`, ox + 20, oy + 32);
      this.drawText(
        ctx,
        `Total geométrico ${this.pvService.fmt(layout.count, 0)} · usados ${this.pvService.fmt(used, 0)}`,
        ox + 20,
        oy + 53,
      );
    }

    for (const o of z.obstacles) {
      ctx.fillStyle = '#e2635388';
      ctx.fillRect(ox + o.x * scale, oy + o.y * scale, o.w * scale, o.h * scale);
      ctx.strokeStyle = '#c34136';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox + o.x * scale, oy + o.y * scale, o.w * scale, o.h * scale);
    }

    // Live drag preview for obstacle drawing
    if (this.dragState?.type === 'obstacle') {
      const a = this.dragState.start;
      const b = this.dragState.current;
      ctx.fillStyle = 'rgba(226, 99, 83, 0.35)';
      ctx.strokeStyle = '#c34136';
      ctx.setLineDash([5, 4]);
      ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      ctx.setLineDash([]);
    }

    this.drawText(ctx, `${this.pvService.fmt(z.width, 2)} m`, ox + (z.width * scale) / 2, oy - 17, '#567082', 'center');
    this.drawText(ctx, `${this.pvService.fmt(z.height, 2)} m`, ox + z.width * scale + 5, oy + (z.height * scale) / 2, '#567082', 'left', 12);
    this.drawText(ctx, `${z.name} · azimut ${z.azimuth}° · inclinación ${z.tilt}°`, 20, h - 15);
  }

  private drawPhoto(): void {
    const c = this.setupCanvas('photo-canvas', 410);
    if (!c) return;
    const { ctx, w, h } = c;
    if (!this.photoImage) {
      this.photoTransform = null;
      this.drawText(ctx, 'Cargá una foto o un plano del sitio.', w / 2, h / 2, '#567082', 'center');
      return;
    }

    const scale = Math.min(w / this.photoImage.width, h / this.photoImage.height);
    const ox = (w - this.photoImage.width * scale) / 2;
    const oy = (h - this.photoImage.height * scale) / 2;
    this.photoTransform = { scale, ox, oy };

    ctx.drawImage(this.photoImage, ox, oy, this.photoImage.width * scale, this.photoImage.height * scale);

    this.state().zones.forEach((z, j) => {
      if (!z.photoRect) return;
      const r = z.photoRect;
      const col = this.zoneColors[j % this.zoneColors.length];
      ctx.fillStyle = `${col}55`;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.fillRect(ox + r.x * scale, oy + r.y * scale, r.w * scale, r.h * scale);
      ctx.strokeRect(ox + r.x * scale, oy + r.y * scale, r.w * scale, r.h * scale);
      this.drawText(ctx, z.name, ox + r.x * scale + 5, oy + r.y * scale + 19, '#073b59');
    });

    if (this.dragState?.type === 'sector') {
      const a = this.dragState.start;
      const b = this.dragState.current;
      const rx = ox + Math.min(a.x, b.x) * scale;
      const ry = oy + Math.min(a.y, b.y) * scale;
      const rw = Math.abs(b.x - a.x) * scale;
      const rh = Math.abs(b.y - a.y) * scale;
      ctx.fillStyle = 'rgba(48, 163, 216, 0.28)';
      ctx.strokeStyle = '#30a3d8';
      ctx.setLineDash([5, 4]);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }

    const pts = this.photoPoints();
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(ox + p.x * scale, oy + p.y * scale, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#e73e50';
      ctx.fill();
    }
    if (pts.length === 2) {
      this.drawLine(
        ctx,
        pts.map((p) => [ox + p.x * scale, oy + p.y * scale]),
        '#e73e50',
        3,
      );
    }
  }

  private drawStrings(canvasId: string): void {
    const ok = this.validResult();
    const rowCount = ok?.rows.length || 1;
    const height = Math.min(650, Math.max(320, Math.min(3, rowCount) * 160));
    const c = this.setupCanvas(canvasId, height);
    if (!c) return;
    const { ctx, w, h } = c;

    if (!ok || !ok.rows.length) {
      this.drawText(ctx, 'Sin strings calculados.', 20, 40);
      return;
    }

    const s = this.state();
    const rows = ok.rows.slice(0, 3);
    const left = 25;
    const trackerX = Math.max(190, w - 190);
    const moduleW = Math.max(24, Math.min(58, (trackerX - left - 65) / 5));

    rows.forEach((r, j) => {
      const y = 40 + (j * (h - 50)) / rows.length;
      const z = s.zones.find((zone) => zone.id === r.zone);
      const zIdx = z ? s.zones.indexOf(z) : 0;
      const color = this.zoneColors[zIdx % this.zoneColors.length];
      this.drawText(
        ctx,
        `${z?.name || '?'} · ${r.series}S × ${r.parallel}P · ${r.quantity} MPPT iguales`,
        left,
        y - 13,
        '#183448',
        'left',
        13,
      );
      const drawnP = Math.min(2, r.parallel);
      const step = 40;
      for (let p = 0; p < drawnP; p++) {
        const py = y + p * step;
        const show = r.series <= 4 ? r.series : 3;
        for (let n = 0; n < show; n++) {
          const x = left + n * (moduleW + 12);
          this.drawBox(ctx, x, py, moduleW, 27, String(n + 1), color);
          if (n < show - 1) {
            this.drawLine(
              ctx,
              [
                [x + moduleW, py + 13],
                [x + moduleW + 12, py + 13],
              ],
              color,
            );
          }
        }
        let end = left + show * (moduleW + 12) - 12;
        if (r.series > 4) {
          this.drawText(ctx, `… ${r.series}`, left + show * (moduleW + 12), py + 18, color, 'left', 13);
          end = left + (show + 1) * (moduleW + 12);
        }
        this.drawLine(
          ctx,
          [
            [end, py + 13],
            [trackerX - 20, py + 13],
            [trackerX - 20, y + (drawnP * step) / 2],
            [trackerX, y + (drawnP * step) / 2],
          ],
          color,
        );
        this.drawLine(
          ctx,
          [
            [left, py + 27],
            [left, py + 32],
            [trackerX - 30, py + 32],
            [trackerX - 30, y + (drawnP * step) / 2 + 20],
            [trackerX, y + (drawnP * step) / 2 + 20],
          ],
          '#c94d54',
          1.4,
        );
      }
      this.drawBox(ctx, trackerX, y + 15, Math.min(150, w - trackerX - 15), 66, 'MPPT independiente', '#073b59');
      this.drawText(ctx, `+ / − · ${r.parallel} entradas`, trackerX + 5, y + 104, '#567082', 'left', 12);
      if (r.parallel > 2) {
        this.drawText(ctx, `+ ${r.parallel - 2} strings iguales`, left, y + drawnP * step + 17, '#567082', 'left', 12);
      }
    });
  }

  private drawChart(
    id: string,
    series: { values: number[]; color: string; line?: boolean; unit?: string }[],
    labels: readonly string[],
    height: number,
  ): void {
    const c = this.setupCanvas(id, height);
    if (!c) return;
    const { ctx, w, h } = c;
    const ox = 65;
    const oy = 30;
    const cw = w - 95;
    const ch = h - 85;
    const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.15;

    for (let n = 0; n <= 4; n++) {
      const y = oy + ch - (ch * n) / 4;
      this.drawLine(
        ctx,
        [
          [ox, y],
          [ox + cw, y],
        ],
        '#dce7ef',
        1,
      );
      this.drawText(ctx, this.pvService.fmt((max * n) / 4, 0), ox - 8, y + 4, '#567082', 'right', 12);
    }

    const step = cw / Math.max(1, labels.length);
    series.forEach((s, k) => {
      if (s.line) {
        const pts: [number, number][] = s.values.map((v, j) => [ox + (j + 0.5) * step, oy + ch - (v / max) * ch]);
        this.drawLine(ctx, pts, s.color, 2.5);
      } else {
        s.values.forEach((v, j) => {
          const bw = step / 3;
          ctx.fillStyle = s.color;
          ctx.fillRect(ox + j * step + step * 0.1 + k * bw, oy + ch - (v / max) * ch, bw - 1, (v / max) * ch);
        });
      }
    });

    labels.forEach((l, j) => {
      if (labels.length <= 12 || j % 3 === 0) {
        this.drawText(ctx, l, ox + (j + 0.5) * step, oy + ch + 23, '#567082', 'center', 12);
      }
    });
    this.drawText(ctx, series[0]?.unit || 'kWh', ox, 18, '#567082', 'left', 12);
  }

  private drawEnergy(canvasId: string): void {
    const ok = this.validResult();
    if (!ok) return;
    this.drawChart(
      canvasId,
      [
        { values: ok.monthly.map((m) => m.energy), color: '#087ab5', unit: 'kWh/mes' },
        { values: ok.monthly.map((m) => m.load), color: '#e6a332' },
      ],
      this.months,
      360,
    );
  }

  private drawDaily(): void {
    const ok = this.validResult();
    if (!ok) return;
    const s = this.state();
    const month = s.month;

    if (ok.hourly && s.hourly) {
      const indices = s.hourly.time
        .map((t, j) => ({ d: new Date(t), j }))
        .filter((x) => x.d.getUTCMonth() === month && x.d.getUTCDate() === 15)
        .map((x) => x.j)
        .slice(0, 24);
      this.drawChart(
        'daily-canvas',
        [
          {
            values: indices.map((j) => ok.hourly!.generation[j]),
            color: '#087ab5',
            line: true,
            unit: 'kWh por hora · serie importada',
          },
          {
            values: indices.map((j) => ok.hourly!.loadSeries[j]),
            color: '#e6a332',
            line: true,
          },
        ],
        indices.map((j) => `${new Date(s.hourly!.time[j]).getUTCHours()}h`),
        310,
      );
      return;
    }

    const dayOfYear = 15 + this.pvService.days.slice(0, month).reduce((a, b) => a + b, 0);
    const dec = (23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) * Math.PI) / 180;
    const lat = (s.lat * Math.PI) / 180;
    const daylength = (24 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(dec))));
    const sunrise = 12 - daylength / 2;

    const solar = Array.from({ length: 24 }, (_, h) =>
      Math.max(0, Math.sin((Math.PI * (h + 0.5 - sunrise)) / daylength)) *
      (h + 0.5 >= sunrise && h + 0.5 <= sunrise + daylength ? 1 : 0),
    );
    const total = solar.reduce((a, b) => a + b, 0) || 1;
    const load = Array.from({ length: 24 }, (_, h) =>
      s.loadProfile === 'flat'
        ? 1
        : s.loadProfile === 'business'
          ? h >= 8 && h < 18
            ? 3
            : 0.25
          : h >= 18 && h <= 23
            ? 3
            : h >= 6 && h < 9
              ? 2
              : 0.5,
    );
    const lt = load.reduce((a, b) => a + b, 0) || 1;
    const monthDays = this.pvService.days[month];

    this.drawChart(
      'daily-canvas',
      [
        {
          values: solar.map((v) => (v / total) * (ok.monthly[month].energy / monthDays)),
          color: '#087ab5',
          line: true,
          unit: 'kWh por hora · ilustrativo',
        },
        {
          values: load.map((v) => (v / lt) * (ok.monthly[month].load / monthDays)),
          color: '#e6a332',
          line: true,
        },
      ],
      Array.from({ length: 24 }, (_, h) => `${h}h`),
      310,
    );
  }

  private drawUnifilar(): void {
    const c = this.setupCanvas('unifilar-canvas', 340);
    if (!c) return;
    const ok = this.validResult();
    if (!ok) return;
    const { ctx, w } = c;
    const s = this.state();

    const x = 25;
    const bw = Math.min(145, (w - 100) / 3);
    const middle = x + bw + 35;
    const right = middle + bw + 35;

    this.drawBox(ctx, x, 65, bw, 70, 'Campo FV', '#087ab5');
    this.drawBox(ctx, middle, 65, bw, 70, 'Inversor', '#073b59');
    this.drawBox(ctx, right, 65, bw, 70, s.system === 'offgrid' ? 'Cargas aisladas' : 'Tablero / red', '#1a927f');

    this.drawLine(
      ctx,
      [
        [x + bw, 100],
        [middle, 100],
      ],
      '#167ab1',
      2,
    );
    this.drawLine(
      ctx,
      [
        [middle + bw, 100],
        [right, 100],
      ],
      '#d49121',
      2,
    );

    this.drawText(ctx, 'CC', x + bw + 17, 85, '#087ab5', 'center', 13);
    this.drawText(ctx, 'CA', middle + bw + 17, 85, '#986a10', 'center', 13);
    this.drawText(ctx, `${ok.strings} strings`, x, 157);
    this.drawText(ctx, `${ok.blocks.length} equipos`, middle, 157);

    if (s.system !== 'grid') {
      this.drawBox(ctx, middle, 225, bw, 65, 'Banco batería', '#6650a1');
      this.drawLine(
        ctx,
        [
          [middle + bw / 2, 225],
          [middle + bw / 2, 135],
        ],
        '#6650a1',
        2,
      );
      this.drawText(
        ctx,
        `${s.battery.voltage} V · ${this.pvService.fmt(ok.batteryKWh, 1)} kWh`,
        middle + bw / 2,
        310,
        '#6650a1',
        'center',
        13,
      );
    }

    this.drawText(ctx, 'Seccionamiento, protección y PE: definir en plano ejecutivo', 25, 25, '#567082', 'left', 13);
  }

  // =========================================================================
  // TEMPLATE HELPERS
  // =========================================================================

  zoneName(zoneId: number): string {
    return this.state().zones.find((z) => z.id === zoneId)?.name ?? '?';
  }

  systemLabel(sys: PvProjectState['system']): string {
    return { grid: 'conectado a red', hybrid: 'híbrido', offgrid: 'aislado' }[sys];
  }

  hasFailedChecks(): boolean {
    const ok = this.validResult();
    return !!ok && ok.checks.some((c) => c.status === 'fail');
  }

  formatInverterCode(num: number): string {
    return `INV-${String(num).padStart(3, '0')}`;
  }

  getCheckLabel(status: PvCheckStatus): string {
    return this.checkLabels[status];
  }

  hourlyColumnsHint(): string {
    return this.state()
      .zones.map((z) => `poa_${z.id}_wm2`)
      .join(', ');
  }

  // =========================================================================
  // INTERACTIVE TOUR
  // =========================================================================

  startTour(): void {
    this.tourStep.set(0);
    this.isTourActive.set(true);
    this.applyTourStep(0);
  }

  nextTourStep(): void {
    const current = this.tourStep();
    if (current < this.tourSteps.length - 1) {
      const next = current + 1;
      this.tourStep.set(next);
      this.applyTourStep(next);
    } else {
      this.finishTour();
    }
  }

  prevTourStep(): void {
    const current = this.tourStep();
    if (current > 0) {
      const prev = current - 1;
      this.tourStep.set(prev);
      this.applyTourStep(prev);
    }
  }

  goToTourStep(idx: number): void {
    if (idx >= 0 && idx < this.tourSteps.length) {
      this.tourStep.set(idx);
      this.applyTourStep(idx);
    }
  }

  finishTour(): void {
    this.isTourActive.set(false);
  }

  private applyTourStep(idx: number): void {
    const step = this.tourSteps[idx];
    if (!step) return;
    if (step.view) {
      this.activeView.set(step.view);
    }
    if (step.targetId && typeof document !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById(step.targetId!);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 90);
    }
  }
}
