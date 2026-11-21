import { Injectable } from '@angular/core';
import {
  PvAssignment,
  PvCable,
  PvCalculationResult,
  PvCalculationSuccess,
  PvCheckItem,
  PvCheckStatus,
  PvExampleType,
  PvFieldDescriptor,
  PvHourlyData,
  PvHourlySimResult,
  PvInverter,
  PvInverterBlock,
  PvLimits,
  PvModule,
  PvMonthlyPoint,
  PvNasaPowerResult,
  PvPhotoCalibration,
  PvProjectChecks,
  PvProjectState,
  PvZone,
  PvZoneLayout,
} from '../models/pv-designer.model';

export const PV_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
export const PV_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;
export const PV_ZONE_COLORS = ['#087ab5', '#9b58ad', '#1a927f', '#d97a20', '#4c69b9', '#c14964'] as const;

export const PV_MODULE_FIELDS: PvFieldDescriptor<Exclude<keyof PvModule, 'name' | 'source' | 'verified'>>[] = [
  { label: 'Potencia STC (W)', key: 'p' },
  { label: 'Voc · circuito abierto (V)', key: 'voc' },
  { label: 'Vmp · máxima potencia (V)', key: 'vmp' },
  { label: 'Isc · cortocircuito (A)', key: 'isc' },
  { label: 'Imp · máxima potencia (A)', key: 'imp' },
  { label: 'Coeficiente Voc (%/°C)', key: 'bvoc' },
  { label: 'Coeficiente Vmp (%/°C)', key: 'bvmp' },
  { label: 'Coeficiente potencia (%/°C)', key: 'bp' },
  { label: 'Coeficiente Isc (%/°C)', key: 'aisc' },
  { label: 'Tolerancia positiva Voc (%)', key: 'tolerance' },
  { label: 'Tensión máxima de sistema (V)', key: 'maxv' },
  { label: 'Fusible serie máximo (A)', key: 'fuse' },
  { label: 'Ancho (m)', key: 'width' },
  { label: 'Largo (m)', key: 'height' },
  { label: 'NMOT (°C)', key: 'nmot' },
  { label: 'Peso unitario (kg)', key: 'weight' },
  { label: 'Corriente de conector (A)', key: 'connectorA' },
  { label: 'Tensión de conector (V)', key: 'connectorV' },
];

export const PV_INVERTER_FIELDS: PvFieldDescriptor<Exclude<keyof PvInverter, 'name' | 'source' | 'verified'>>[] = [
  { label: 'Potencia nominal CA (kW)', key: 'ac' },
  { label: 'Potencia CC máxima admitida (kWp)', key: 'maxdc' },
  { label: 'Tensión CC máxima absoluta (V)', key: 'maxv' },
  {
    label: 'Mínima MPPT de diseño (V)',
    key: 'min',
    hint: 'Usar el límite aplicable a la potencia requerida, no sólo el rango extendido.',
  },
  { label: 'Máxima MPPT de diseño (V)', key: 'max' },
  { label: 'Tensión de arranque (V)', key: 'start' },
  { label: 'MPPT independientes por equipo', key: 'mppts' },
  { label: 'Entradas físicas por MPPT', key: 'inputs' },
  { label: 'Corriente máxima por entrada (A)', key: 'inputA' },
  { label: 'Isc máxima por entrada (A)', key: 'inputIsc' },
  { label: 'Corriente máxima por MPPT (A)', key: 'mpptA' },
  { label: 'Isc máxima por MPPT (A)', key: 'mpptIsc' },
  { label: 'Potencia admitida por MPPT (kWp)', key: 'mpptKW' },
  { label: 'Eficiencia utilizada (%)', key: 'eff' },
  { label: 'Potencia de carga batería (kW)', key: 'chargeKW' },
  { label: 'Mínima batería (V)', key: 'batteryMin' },
  { label: 'Máxima batería (V)', key: 'batteryMax' },
];

export const PV_CABLE_FIELDS: PvFieldDescriptor<keyof PvCable>[] = [
  { label: 'Longitud CC de ida del string (m)', key: 'lengthDC' },
  { label: 'Sección conductor CC (mm²)', key: 'sectionDC' },
  { label: 'Ampacidad CC de tabla, antes de corrección (A)', key: 'ampacityDC' },
  { label: 'Temperatura del conductor (°C)', key: 'temp' },
  { label: 'Resistividad a 20 °C (Ω·mm²/m)', key: 'rho' },
  { label: 'Factor total de corrección ampacidad (0–1)', key: 'derating' },
  { label: 'Caída máxima CC (%)', key: 'dropDC' },
  { label: 'Factor de dimensionamiento sobre Isc diseño', key: 'iscFactor' },
  { label: 'Longitud CA de ida por inversor (m)', key: 'lengthAC' },
  { label: 'Sección CA (mm²)', key: 'sectionAC' },
  { label: 'Ampacidad CA de tabla, antes de corrección (A)', key: 'ampacityAC' },
  { label: 'Caída máxima CA (%)', key: 'dropAC' },
  { label: 'Corriente nominal protección CA (A)', key: 'breaker' },
  { label: 'Tensión nominal equipo de seccionamiento CC (V)', key: 'ratingV' },
  { label: 'DPS CC · Ucpv (V)', key: 'spdV' },
];

export const PV_REVIEW_CHECKS: { key: keyof PvProjectChecks; label: string }[] = [
  { key: 'survey', label: 'Relevamiento y temperaturas' },
  { key: 'structure', label: 'Estructura, viento y cargas' },
  { key: 'earthing', label: 'Puesta a tierra y equipotencialidad' },
  { key: 'protection', label: 'Protecciones y cortocircuito' },
  { key: 'utility', label: 'Condiciones de distribuidora' },
  { key: 'commission', label: 'Ensayos y puesta en servicio' },
  { key: 'mt', label: 'Red colectora, transformadores y MT' },
];

export const PV_CHECK_LABELS: Record<PvCheckStatus, string> = {
  pass: 'CUMPLE',
  fail: 'NO CUMPLE',
  warn: 'REVISAR',
  pending: 'PENDIENTE',
  info: 'CRITERIO',
  declared: 'DECLARADO',
};

const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

@Injectable({
  providedIn: 'root',
})
export class PvDesignerService {
  readonly days = PV_DAYS;
  readonly months = PV_MONTHS;
  readonly zoneColors = PV_ZONE_COLORS;

  createDefaultZone(id = 1, name = 'Cubierta norte'): PvZone {
    return {
      id,
      name,
      width: 12,
      height: 8,
      tilt: 25,
      azimuth: 0,
      edge: 0.4,
      gap: 0.03,
      rowGap: 0.15,
      portrait: true,
      shade: 0,
      poaFactor: 0,
      roofType: 'coplanar',
      alpha: 20,
      obstacles: [],
      photoRect: null,
    };
  }

  createDefaults(): PvProjectState {
    return {
      version: 1,
      name: 'Proyecto residencial · ejemplo',
      site: 'La Plata',
      lat: -34.92,
      lon: -57.95,
      system: 'grid',
      mode: 'energy',
      demand: 450,
      coverage: 100,
      target: 6,
      peak: 5,
      voltage: 220,
      phases: 1,
      pf: 0.95,
      tmin: -5,
      tmax: 75,
      irrmax: 1200,
      margin: 3,
      resourceSource: 'Ejemplo editable; no corresponde a una medición del sitio',
      resourceVerified: false,
      resourceLat: null,
      resourceLon: null,
      hsp: [6.5, 5.8, 4.8, 3.5, 2.6, 2.1, 2.4, 3.2, 4.2, 5.1, 6, 6.5],
      ambient: [24, 23, 21, 17, 13, 10, 10, 12, 15, 18, 21, 23],
      losses: 14,
      albedo: 0.2,
      diffuse: 0.35,
      loadProfile: 'home',
      month: 0,
      critical: 8,
      autonomy: 1,
      battery: {
        voltage: 48,
        ah: 200,
        dod: 80,
        eff: 92,
        pcs: 5,
        charge: 100,
        discharge: 100,
      },
      module: {
        name: 'Panel genérico de ejemplo 550 W',
        source: 'Sin ficha verificada',
        verified: false,
        p: 550,
        voc: 49.9,
        vmp: 41.96,
        isc: 13.98,
        imp: 13.11,
        bvoc: -0.28,
        bvmp: -0.35,
        bp: -0.35,
        aisc: 0.05,
        tolerance: 3,
        maxv: 1500,
        fuse: 25,
        width: 1.134,
        height: 2.278,
        nmot: 45,
        weight: 28,
        connectorA: 30,
        connectorV: 1500,
      },
      inverter: {
        name: 'Inversor genérico de ejemplo 6 kW',
        source: 'Sin ficha verificada',
        verified: false,
        ac: 6,
        maxdc: 9,
        maxv: 600,
        min: 120,
        max: 550,
        start: 150,
        mppts: 2,
        inputs: 2,
        inputA: 16,
        inputIsc: 20,
        mpptA: 32,
        mpptIsc: 40,
        mpptKW: 4.5,
        eff: 97,
        chargeKW: 5,
        batteryMin: 40,
        batteryMax: 60,
      },
      zones: [this.createDefaultZone(1, 'Cubierta norte')],
      cable: {
        lengthDC: 25,
        sectionDC: 6,
        temp: 70,
        rho: 0.0175,
        ampacityDC: 40,
        derating: 0.8,
        dropDC: 1.5,
        lengthAC: 15,
        sectionAC: 6,
        ampacityAC: 45,
        dropAC: 2,
        breaker: 32,
        ratingV: 1000,
        spdV: 1000,
        iscFactor: 1.25,
      },
      manual: false,
      assignments: [],
      checks: {
        survey: false,
        structure: false,
        earthing: false,
        protection: false,
        utility: false,
        commission: false,
        mt: false,
      },
      notes: '',
      photo: null,
      hourly: null,
    };
  }

  createExample(type: PvExampleType): PvProjectState {
    const state = this.createDefaults();
    if (type === 'home') {
      state.mode = 'power';
      state.target = 6;
    } else if (type === 'mobile') {
      state.name = 'Casa rodante · ejemplo 1 kWp';
      state.system = 'offgrid';
      state.mode = 'power';
      state.target = 1;
      state.demand = 90;
      state.critical = 3;
      state.peak = 0.8;
      state.autonomy = 1;
      state.zones[0] = {
        ...state.zones[0],
        name: 'Techo casa rodante',
        width: 2.3,
        height: 5.8,
        edge: 0.15,
        tilt: 0,
        rowGap: 0.04,
      };
      Object.assign(state.module, {
        name: 'Panel genérico ejemplo 200 W',
        p: 200,
        voc: 24.3,
        vmp: 20.3,
        isc: 10.5,
        imp: 9.85,
        width: 0.7,
        height: 1.48,
        weight: 12,
        fuse: 20,
      });
      Object.assign(state.inverter, {
        name: 'Equipo híbrido genérico ejemplo 1 kW / 48 V',
        ac: 1,
        maxdc: 1.4,
        maxv: 150,
        min: 30,
        max: 130,
        start: 40,
        mppts: 1,
        inputs: 2,
        inputA: 16,
        inputIsc: 20,
        mpptA: 32,
        mpptIsc: 40,
        mpptKW: 1.4,
        chargeKW: 1,
        batteryMin: 40,
        batteryMax: 60,
      });
      state.battery.ah = 100;
      state.battery.pcs = 1;
      state.cable.lengthDC = 4;
      state.cable.lengthAC = 4;
      state.cable.breaker = 6;
    } else if (type === 'park') {
      state.name = 'Parque FV · ejemplo 10 MWp';
      state.system = 'grid';
      state.mode = 'power';
      state.target = 10000;
      state.demand = 1200000;
      state.peak = 10000;
      state.phases = 3;
      state.voltage = 800;
      state.zones[0] = {
        ...state.zones[0],
        name: 'Campo norte',
        width: 500,
        height: 350,
        edge: 5,
        tilt: 25,
        roofType: 'ground',
        alpha: 20,
        rowGap: 1,
      };
      Object.assign(state.inverter, {
        name: 'Inversor string genérico ejemplo 250 kW',
        ac: 250,
        maxdc: 375,
        maxv: 1500,
        min: 500,
        max: 1300,
        start: 550,
        mppts: 12,
        inputs: 2,
        inputA: 20,
        inputIsc: 25,
        mpptA: 40,
        mpptIsc: 50,
        mpptKW: 35,
      });
      state.cable.lengthDC = 60;
      state.cable.lengthAC = 50;
      state.cable.sectionAC = 185;
      state.cable.ampacityAC = 420;
      state.cable.breaker = 250;
      state.cable.ratingV = 1500;
      state.cable.spdV = 1500;
    }
    return state;
  }

  validate(s: PvProjectState): string[] {
    const e: string[] = [];
    const check = (n: unknown, min: number, max: number, label: string) => {
      if (!isFiniteNum(n) || n < min || n > max) {
        e.push(`${label} fuera de rango (${min}–${max}).`);
      }
    };

    check(s.demand, 0, 1e9, 'Consumo mensual');
    check(s.peak, 0, 1e9, 'Potencia pico simultánea');
    check(s.critical, 0, 1e9, 'Consumo crítico');
    check(s.coverage, 1, 100, 'Cobertura');
    check(s.target, 0.001, 10000, 'Potencia objetivo kWp');
    check(s.lat, -89, 89, 'Latitud');
    check(s.lon, -180, 180, 'Longitud');
    check(s.voltage, 12, 36000, 'Tensión CA');
    check(s.pf, 0.1, 1, 'Factor de potencia');
    check(s.tmin, -60, 40, 'Temperatura mínima');
    check(s.tmax, 25, 110, 'Temperatura máxima de celda');
    check(s.irrmax, 1000, 1600, 'Irradiancia de diseño');
    check(s.margin, 0, 20, 'Margen de tensión');
    check(s.losses, 0, 80, 'Pérdidas');
    check(s.diffuse, 0, 1, 'Fracción difusa');
    check(s.albedo, 0, 1, 'Albedo');

    if (!Array.isArray(s.hsp) || s.hsp.length !== 12) {
      e.push('Se requieren doce valores de recurso solar.');
    } else {
      s.hsp.forEach((n) => check(n, 0.01, 15, 'HSP'));
    }

    if (!Array.isArray(s.ambient) || s.ambient.length !== 12) {
      e.push('Se requieren doce temperaturas.');
    } else {
      s.ambient.forEach((n) => check(n, -60, 60, 'Temperatura ambiente'));
    }

    const m = s.module;
    const i = s.inverter;

    const modulePosKeys: (keyof PvModule)[] = [
      'p', 'voc', 'vmp', 'isc', 'imp', 'maxv', 'fuse', 'width', 'height', 'nmot', 'weight', 'connectorA', 'connectorV',
    ];
    for (const k of modulePosKeys) check(m[k], 0.001, 1e6, `Panel ${k}`);
    for (const k of ['bvoc', 'bvmp', 'bp'] as const) check(m[k], -2, 0, `Coeficiente ${k}`);
    check(m.aisc, 0, 1, 'Coeficiente Isc');
    check(m.tolerance, 0, 20, 'Tolerancia Voc');

    if (m.vmp >= m.voc || m.imp > m.isc) {
      e.push('Vmp debe ser menor que Voc e Imp no debe superar Isc.');
    }
    if (isFiniteNum(m.p) && m.p > 0 && Math.abs(m.p - m.vmp * m.imp) / m.p > 0.08) {
      e.push('Potencia de panel inconsistente con Vmp × Imp (>8%).');
    }

    const invPosKeys: (keyof PvInverter)[] = [
      'ac', 'maxdc', 'maxv', 'min', 'max', 'start', 'mpptA', 'mpptIsc', 'inputA', 'inputIsc', 'mpptKW', 'chargeKW', 'batteryMin', 'batteryMax',
    ];
    for (const k of invPosKeys) check(i[k], 0.001, 1e6, `Inversor ${k}`);
    for (const k of ['mppts', 'inputs'] as const) {
      check(i[k], 1, 100, `Inversor ${k}`);
      if (!Number.isInteger(i[k])) e.push(`${k} debe ser entero.`);
    }
    check(i.eff, 50, 100, 'Eficiencia');
    if (i.min >= i.max || i.max > i.maxv) {
      e.push('Rango MPPT inconsistente con tensión máxima CC.');
    }

    if (!Array.isArray(s.zones) || !s.zones.length || s.zones.length > 50) {
      e.push('Se requieren entre 1 y 50 sectores.');
    } else {
      for (const z of s.zones) {
        check(z.width, 0.1, 5000, 'Sector ancho');
        check(z.height, 0.1, 5000, 'Sector largo');
        check(z.tilt, 0, 90, 'Inclinación');
        check(z.azimuth, 0, 359.99, 'Azimut');
        check(z.edge, 0, 100, 'Retiro');
        check(z.gap, 0, 5, 'Separación de módulos');
        check(z.rowGap, 0, 100, 'Separación entre filas');
        check(z.shade, 0, 100, 'Pérdida por sombra');
        check(z.poaFactor, 0, 3, 'Factor POA');
        check(z.alpha, 1, 89, 'Altura solar de diseño');
      }
    }

    const cablePosKeys: (keyof PvCable)[] = [
      'lengthDC', 'sectionDC', 'ampacityDC', 'lengthAC', 'sectionAC', 'ampacityAC', 'breaker', 'ratingV', 'spdV', 'rho',
    ];
    for (const k of cablePosKeys) check(s.cable[k], 0.001, 1e6, `Cable ${k}`);
    check(s.cable.derating, 0.01, 1, 'Reducción de ampacidad');
    check(s.cable.iscFactor, 1, 2, 'Factor de corriente CC');
    check(s.cable.temp, -20, 120, 'Temperatura conductor');
    check(s.cable.dropDC, 0.1, 10, 'Caída admisible CC');
    check(s.cable.dropAC, 0.1, 10, 'Caída admisible CA');

    if (s.system !== 'grid') {
      for (const k of ['voltage', 'ah', 'pcs', 'charge', 'discharge'] as const) {
        check(s.battery[k], 0.01, 1e9, `Batería ${k}`);
      }
      for (const k of ['dod', 'eff'] as const) {
        check(s.battery[k], 1, 100, `Batería ${k}`);
      }
      check(s.autonomy, 0.01, 365, 'Autonomía');
      if (s.critical <= 0) e.push('Indicar consumo crítico diario para sistema con batería.');
    }

    if (
      isFiniteNum(m.width) &&
      isFiniteNum(m.height) &&
      m.width * m.height > 0 &&
      s.zones?.some((z) => (z.width * z.height) / (m.width * m.height) > 500000)
    ) {
      e.push('Superficie demasiado grande para la grilla de esta versión: reducir o dividir sectores.');
    }

    if (s.hourly) {
      const h = s.hourly;
      if (!Array.isArray(h.time) || ![8760, 8784].includes(h.time.length)) {
        e.push('La serie horaria debe tener 8760 o 8784 horas.');
      } else {
        if (!Array.isArray(h.temp) || h.temp.length !== h.time.length || !Array.isArray(h.load) || h.load.length !== h.time.length) {
          e.push('Temperatura o consumo horario incompletos.');
        } else if (
          h.temp.some((n) => !isFiniteNum(n) || n < -60 || n > 60) ||
          h.load.some((n) => !isFiniteNum(n) || n < 0 || n > 1e7)
        ) {
          e.push('Datos horarios fuera de rango.');
        }

        for (const z of s.zones) {
          const poaArr = h.poa?.[z.id];
          if (!Array.isArray(poaArr) || poaArr.length !== h.time.length || poaArr.some((n) => !isFiniteNum(n) || n < 0 || n > 1600)) {
            e.push(`Falta irradiancia horaria del sector ${z.name}`);
          }
        }

        let previous: number | null = null;
        for (const t of h.time) {
          const d = Date.parse(t);
          if (!Number.isFinite(d) || (previous !== null && d - previous !== 3600000)) {
            e.push('Tiempos horarios inválidos o discontinuos.');
            break;
          }
          previous = d;
        }
      }
    }

    const textChecks: [string, unknown][] = [
      ['Proyecto', s.name],
      ['Sitio', s.site],
      ['Modelo panel', m.name],
      ['Fuente panel', m.source],
      ['Modelo inversor', i.name],
      ['Fuente inversor', i.source],
      ['Fuente recurso', s.resourceSource],
      ['Notas', s.notes],
    ];
    for (const [n, v] of textChecks) {
      if (typeof v !== 'string') e.push(`${n} debe ser texto.`);
    }

    return e;
  }

  layout(z: PvZone, m: PvModule): PvZoneLayout {
    const w = z.portrait ? m.width : m.height;
    const l = z.portrait ? m.height : m.width;
    const rad = (z.tilt * Math.PI) / 180;
    const depth = z.roofType === 'ground' ? l * Math.cos(rad) : l;
    const gap =
      z.roofType === 'ground'
        ? Math.max(z.rowGap, (l * Math.sin(rad)) / Math.tan((z.alpha * Math.PI) / 180))
        : z.rowGap;
    const cols = Math.max(0, Math.floor((z.width - 2 * z.edge + z.gap) / (w + z.gap)));
    const rows = Math.max(0, Math.floor((z.height - 2 * z.edge + gap) / (depth + gap)));

    let count = 0;
    const positions: PvZoneLayout['positions'] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = {
          x: z.edge + c * (w + z.gap),
          y: z.edge + r * (depth + gap),
          w,
          h: depth,
        };
        const collides = (z.obstacles || []).some(
          (o) => p.x < o.x + o.w && p.x + p.w > o.x && p.y < o.y + o.h && p.y + p.h > o.y,
        );
        if (!collides) {
          count++;
          if (positions.length < 5000) positions.push(p);
        }
      }
    }

    return { count, positions, rows, cols, rowGap: gap, depth, area: z.width * z.height };
  }

  poaFactor(z: PvZone, s: PvProjectState, month: number): number {
    if (z.poaFactor > 0) return z.poaFactor;
    // Isotropic sky, noon incidence ratio: screening approximation only.
    const d = 15 + PV_DAYS.slice(0, month).reduce((a, b) => a + b, 0);
    const dec = (23.45 * Math.sin((2 * Math.PI * (284 + d)) / 365) * Math.PI) / 180;
    const lat = (s.lat * Math.PI) / 180;
    const b = (z.tilt * Math.PI) / 180;
    const a = (z.azimuth * Math.PI) / 180;
    const sz = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec);
    const north = Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec);
    const beam = Math.max(0, sz * Math.cos(b) + north * Math.sin(b) * Math.cos(a)) / Math.max(0.12, sz);
    return Math.max(
      0.05,
      Math.min(2.5, (1 - s.diffuse) * beam + (s.diffuse * (1 + Math.cos(b))) / 2 + (s.albedo * (1 - Math.cos(b))) / 2),
    );
  }

  limits(s: PvProjectState): PvLimits {
    const m = s.module;
    const i = s.inverter;
    const vocCold = m.voc * (1 + (m.bvoc / 100) * (s.tmin - 25)) * (1 + m.tolerance / 100);
    const vmpHot = m.vmp * (1 + (m.bvmp / 100) * (s.tmax - 25));
    const vmpCold = m.vmp * (1 + (m.bvmp / 100) * (s.tmin - 25));
    const vocHot = m.voc * (1 + (m.bvoc / 100) * (s.tmax - 25));
    const maxV = Math.min(i.maxv, m.maxv, m.connectorV) * (1 - s.margin / 100);
    const minN = Math.max(1, Math.ceil(i.min / vmpHot), Math.ceil(i.start / vocHot));
    const maxN = Math.min(500, Math.floor(maxV / vocCold), Math.floor(i.max / vmpCold));
    const isc = m.isc * (s.irrmax / 1000) * (1 + (m.aisc / 100) * (s.tmax - 25));
    const imp = (m.imp * s.irrmax) / 1000;
    return { vocCold, vmpHot, vmpCold, vocHot, minN, maxN, isc, imp, maxV };
  }

  maxParallel(s: PvProjectState, l: PvLimits, n: number): number {
    const i = s.inverter;
    if (l.imp > i.inputA || l.isc > i.inputIsc || l.imp > s.module.connectorA) return 0;
    return Math.max(
      0,
      Math.min(
        i.inputs,
        Math.floor(i.mpptA / l.imp),
        Math.floor(i.mpptIsc / l.isc),
        Math.floor((i.mpptKW * 1000) / (n * s.module.p)),
        Math.floor((i.maxdc * 1000) / (n * s.module.p)),
      ),
    );
  }

  pack(s: PvProjectState, rows: PvAssignment[]): PvInverterBlock[] {
    const i = s.inverter;
    const slots: PvInverterBlock[] = [];
    if (rows.reduce((a, r) => a + r.quantity, 0) > 20000) {
      throw new Error('Máximo 20.000 bloques MPPT en esta versión.');
    }
    for (const row of rows) {
      if (row.quantity > 100000) {
        throw new Error('Cantidad de bloques excesiva.');
      }
      for (let q = 0; q < row.quantity; q++) {
        const kw = (row.series * row.parallel * s.module.p) / 1000;
        let b = slots.find((slot) => slot.used < i.mppts && slot.kw + kw <= i.maxdc + 1e-9);
        if (!b) {
          b = { used: 0, kw: 0, mppts: [], number: slots.length + 1 };
          slots.push(b);
        }
        b.used++;
        b.kw += kw;
        b.mppts.push({ ...row, quantity: 1, mppt: b.used, inverter: b.number });
      }
    }
    return slots;
  }

  private autoAssign(s: PvProjectState, layouts: PvZoneLayout[], l: PvLimits) {
    const area = layouts.reduce((a, b) => a + b.count, 0);
    const totalArea = layouts.reduce((a, b) => a + b.area, 0);
    let specific = 0;
    for (let z = 0; z < s.zones.length; z++) {
      let yieldZ = 0;
      for (let m = 0; m < 12; m++) {
        yieldZ +=
          s.hsp[m] *
          this.poaFactor(s.zones[z], s, m) *
          PV_DAYS[m] *
          (1 - s.losses / 100) *
          (1 - s.zones[z].shade / 100) *
          (s.inverter.eff / 100);
      }
      specific += (yieldZ * layouts[z].area) / totalArea;
    }

    const targetKW =
      s.mode === 'power'
        ? s.target
        : (s.system === 'offgrid' ? s.critical * 365 : (s.demand * 12 * s.coverage) / 100) / Math.max(1, specific);
    const targetN = Math.ceil((targetKW * 1000) / s.module.p);
    const rows: PvAssignment[] = [];
    let wantedRemaining = targetN;

    for (let j = 0; j < s.zones.length; j++) {
      const z = s.zones[j];
      const cap = layouts[j].count;
      const desired = j === s.zones.length - 1 ? wantedRemaining : Math.round((targetN * cap) / Math.max(1, area));
      wantedRemaining -= desired;
      if (desired <= 0 || cap <= 0) continue;

      let best: { series: number; parallel: number; strings: number; groups: number; score: number } | null = null;
      for (let n = l.minN; n <= l.maxN; n++) {
        const p = this.maxParallel(s, l, n);
        if (!p) continue;
        const strings = Math.min(Math.ceil(desired / n), Math.floor(cap / n));
        if (!strings) continue;
        const installed = strings * n;
        const groups = Math.ceil(strings / p);
        const score = Math.abs(installed - desired) + groups * 0.2 + (l.maxN - n) * 0.001 + (installed < desired ? 10000 : 0);
        if (!best || score < best.score) {
          best = { series: n, parallel: p, strings, groups, score };
        }
      }

      if (best) {
        const full = Math.floor(best.strings / best.parallel);
        const rest = best.strings % best.parallel;
        if (full) rows.push({ zone: z.id, series: best.series, parallel: best.parallel, quantity: full });
        if (rest) rows.push({ zone: z.id, series: best.series, parallel: rest, quantity: 1 });
      }
    }

    return { rows, targetN, targetKW, specific };
  }

  hourlySim(s: PvProjectState, blocks: PvInverterBlock[]): PvHourlySimResult {
    const h = s.hourly!;
    const m = s.module;
    const i = s.inverter;
    const len = h.time.length;
    const monthly: Required<PvMonthlyPoint>[] = Array.from({ length: 12 }, (_, month) => ({
      month,
      energy: 0,
      load: 0,
      hsp: s.hsp[month],
      import: 0,
      export: 0,
      unserved: 0,
      clipped: 0,
    }));

    const generation: number[] = [];
    const socSeries: number[] = [];
    const loadSeries: number[] = [];
    const imports: number[] = [];
    const exports: number[] = [];
    const unservedSeries: number[] = [];

    let soc = 0;
    let clipped = 0;
    let charged = 0;
    let discharged = 0;
    const cap = ((s.battery.voltage * s.battery.ah) / 1000) * (s.battery.dod / 100);
    const effDis = (s.battery.eff / 100) * (i.eff / 100);
    const effCharge = 0.95;

    for (let t = 0; t < len; t++) {
      let gen = 0;
      let clip = 0;
      for (const b of blocks) {
        let dc = 0;
        for (const r of b.mppts) {
          const z = s.zones.find((zone) => zone.id === r.zone)!;
          const g = h.poa[z.id][t];
          const temp = h.temp[t] + ((m.nmot - 20) / 800) * g;
          const p =
            ((r.series * r.parallel * m.p) / 1000) *
            (g / 1000) *
            Math.max(0, 1 + (m.bp / 100) * (temp - 25)) *
            (1 - s.losses / 100) *
            (1 - z.shade / 100);
          dc += Math.min(p, i.mpptKW);
        }
        const raw = (dc * i.eff) / 100;
        gen += Math.min(raw, i.ac);
        clip += Math.max(0, raw - i.ac);
      }

      const load = h.load[t];
      const surplus = Math.max(0, gen - load);
      const deficit = Math.max(0, load - gen);
      let charge = 0;
      let dis = 0;

      if (s.system !== 'grid') {
        const chargeLimit = Math.min(s.battery.pcs, i.chargeKW * blocks.length, (s.battery.voltage * s.battery.charge) / 1000);
        charge = Math.min(surplus, chargeLimit, Math.max(0, (cap - soc) / effCharge));
        soc += charge * effCharge;
        const disLimit = Math.min(
          s.battery.pcs,
          blocks.length * i.ac,
          ((s.battery.voltage * s.battery.discharge) / 1000) * (i.eff / 100),
        );
        dis = Math.min(deficit, disLimit, soc * effDis);
        soc -= dis / effDis;
      }

      const imp = s.system === 'offgrid' ? 0 : deficit - dis;
      const exp = s.system === 'offgrid' ? 0 : surplus - charge;
      const unserved = s.system === 'offgrid' ? deficit - dis : 0;
      const mon = new Date(h.time[t]).getUTCMonth();

      monthly[mon].energy += gen;
      monthly[mon].load += load;
      monthly[mon].import += imp;
      monthly[mon].export += exp;
      monthly[mon].unserved += unserved;
      monthly[mon].clipped += clip;

      generation.push(gen);
      socSeries.push(soc);
      loadSeries.push(load);
      imports.push(imp);
      exports.push(exp);
      unservedSeries.push(unserved);
      clipped += clip;
      charged += charge;
      discharged += dis;
    }

    const annual = monthly.reduce((a, b) => a + b.energy, 0);
    const load = monthly.reduce((a, b) => a + b.load, 0);
    const gridImport = imports.reduce((a, b) => a + b, 0);
    const gridExport = exports.reduce((a, b) => a + b, 0);
    const unserved = unservedSeries.reduce((a, b) => a + b, 0);

    return {
      monthly,
      annual,
      load,
      gridImport,
      gridExport,
      unserved,
      clipped,
      charged,
      discharged,
      generation,
      socSeries,
      loadSeries,
      imports,
      exports,
      unservedSeries,
      cap,
      initialSOC: 0,
      effCharge,
      source: h.source,
    };
  }

  calculate(s: PvProjectState): PvCalculationResult {
    const errors = this.validate(s);
    if (errors.length) return { errors };

    const m = s.module;
    const i = s.inverter;
    const l = this.limits(s);
    const layouts = s.zones.map((z) => this.layout(z, m));
    const proposal = this.autoAssign(s, layouts, l);
    const rows = s.manual ? s.assignments : proposal.rows;
    const checks: PvCheckItem[] = [];
    const add = (status: PvCheckStatus, title: string, detail: string) => checks.push({ status, title, detail });

    if (
      s.manual &&
      (rows.length > 100 ||
        rows.some(
          (r) =>
            !s.zones.some((z) => z.id === r.zone) ||
            !Number.isInteger(r.series) ||
            r.series < 1 ||
            r.series > 500 ||
            !Number.isInteger(r.parallel) ||
            r.parallel < 1 ||
            r.parallel > 100 ||
            !Number.isInteger(r.quantity) ||
            r.quantity < 1 ||
            r.quantity > 100000,
        ))
    ) {
      return {
        errors: ['Asignaciones inválidas: sector existente; serie 1–500, paralelo 1–100, cantidad 1–100000; valores enteros.'],
      };
    }

    if (l.minN > l.maxN) {
      add('fail', 'Ventana de tensión incompatible', 'No existe cantidad de paneles en serie que cumpla los límites ingresados.');
    }
    if (!rows.length) {
      add('fail', 'Sin configuración viable', 'Revisar superficie, panel e inversor.');
    }

    const usedByZone: Record<number, number> = {};
    for (const r of rows) {
      const z = s.zones.find((zone) => zone.id === r.zone)!;
      const total = r.series * r.parallel * r.quantity;
      usedByZone[r.zone] = (usedByZone[r.zone] || 0) + total;
      const id = `${z.name} · ${r.series}S × ${r.parallel}P`;
      add(
        r.series * l.vocCold <= l.maxV ? 'pass' : 'fail',
        `${id} · Voc en frío`,
        `${(r.series * l.vocCold).toFixed(1)} V ≤ ${l.maxV.toFixed(1)} V (con tolerancia y margen)`,
      );
      add(
        r.series * l.vmpHot >= i.min && r.series * l.vmpCold <= i.max ? 'pass' : 'fail',
        `${id} · seguimiento MPPT`,
        `${(r.series * l.vmpHot).toFixed(1)}–${(r.series * l.vmpCold).toFixed(1)} V; ventana ${i.min}–${i.max} V`,
      );
      add(
        r.series * l.vocHot >= i.start ? 'pass' : 'fail',
        `${id} · arranque en caliente`,
        `${(r.series * l.vocHot).toFixed(1)} V; umbral ${i.start} V; no verifica arranque con baja irradiancia`,
      );
      add(
        l.imp <= i.inputA && l.isc <= i.inputIsc ? 'pass' : 'fail',
        `${id} · entrada individual`,
        `Imp diseño ${l.imp.toFixed(2)} / ${i.inputA} A; Isc diseño ${l.isc.toFixed(2)} / ${i.inputIsc} A`,
      );
      add(
        r.parallel <= i.inputs && r.parallel * l.imp <= i.mpptA && r.parallel * l.isc <= i.mpptIsc ? 'pass' : 'fail',
        `${id} · MPPT`,
        `Imp ${(r.parallel * l.imp).toFixed(2)} / ${i.mpptA} A; Isc ${(r.parallel * l.isc).toFixed(2)} / ${i.mpptIsc} A; entradas ${r.parallel}/${i.inputs}`,
      );
      add(
        (r.series * r.parallel * m.p) / 1000 <= i.mpptKW ? 'pass' : 'fail',
        `${id} · potencia por MPPT`,
        `${((r.series * r.parallel * m.p) / 1000).toFixed(2)} / ${i.mpptKW} kWp`,
      );
    }

    let blocks: PvInverterBlock[];
    try {
      blocks = this.pack(s, rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { errors: [`No se pudo calcular este proyecto. Revisar magnitudes y cantidad de bloques. ${msg}`] };
    }

    const count = rows.reduce((a, r) => a + r.series * r.parallel * r.quantity, 0);
    const strings = rows.reduce((a, r) => a + r.parallel * r.quantity, 0);
    const mppts = rows.reduce((a, r) => a + r.quantity, 0);
    const kw = (count * m.p) / 1000;
    const ac = blocks.length * i.ac;

    s.zones.forEach((z, idx) => {
      const cap = layouts[idx].count;
      const used = usedByZone[z.id] || 0;
      add(used <= cap ? 'pass' : 'fail', `${z.name} · capacidad geométrica`, `${used} paneles / ${cap} posiciones; obstáculos y retiros incluidos`);
    });

    add(
      count >= proposal.targetN ? 'pass' : 'warn',
      'Objetivo energético o de potencia',
      `${count} paneles frente a ${proposal.targetN} preliminares; validar con la simulación mensual`,
    );
    add(
      blocks.every((b) => b.kw <= i.maxdc) ? 'pass' : 'fail',
      'Potencia CC por inversor',
      `Máxima ${Math.max(0, ...blocks.map((b) => b.kw)).toFixed(2)} / ${i.maxdc} kWp`,
    );
    add(
      'info',
      'Criterio de separación',
      'Cada sector se asigna a MPPT independientes; no se paralelizan strings de distinta longitud. Distribución conservadora, sin optimización económica.',
    );
    add(
      m.verified && i.verified ? 'pass' : 'pending',
      'Fichas técnicas',
      m.verified && i.verified
        ? `Datos declarados cotejados por el usuario: ${m.source}; ${i.source}`
        : 'Los equipos genéricos son ejemplos. Cotejar todos los campos con las fichas originales.',
    );
    add(s.resourceVerified ? 'pass' : 'pending', 'Recurso solar', s.resourceSource);

    if (s.resourceLat !== null && (s.resourceLat !== s.lat || s.resourceLon !== s.lon)) {
      add('fail', 'Coordenadas del recurso', 'Volver a obtener NASA POWER: cambiaron las coordenadas.');
    }

    add(
      'pending',
      'Sombras y modelo energético',
      s.hourly
        ? 'Serie POA horaria importada; modelo térmico NMOT y recorte por inversor. No resuelve sombras 3D, curvas I–V, límites instantáneos de tensión/corriente ni MPPT dinámico.'
        : 'Transposición isotrópica aproximada con incidencia al mediodía; no resuelve sombras 3D, mismatch, curvas I–V ni clipping horario.',
    );

    let monthly: PvMonthlyPoint[] = s.hsp.map((h, j) => {
      let energy = 0;
      for (const z of s.zones) {
        const zkw = ((usedByZone[z.id] || 0) * m.p) / 1000;
        const poa = h * this.poaFactor(z, s, j);
        const tcell = s.ambient[j] + ((m.nmot - 20) / 800) * 800;
        const thermal = Math.max(0.3, 1 + (m.bp / 100) * (tcell - 25));
        energy += zkw * poa * PV_DAYS[j] * (1 - s.losses / 100) * (1 - z.shade / 100) * (i.eff / 100) * thermal;
      }
      return { month: j, energy, load: ((s.demand * 12) / 365) * PV_DAYS[j], hsp: h };
    });

    const hourly = s.hourly ? this.hourlySim(s, blocks) : null;
    if (hourly) monthly = hourly.monthly;
    const annual = monthly.reduce((a, b) => a + b.energy, 0);

    const c = s.cable;
    const rho = c.rho * (1 + 0.00393 * (c.temp - 20));
    const longest = Math.max(1, ...rows.map((r) => r.series));
    const positiveVmp = rows.map((r) => r.series * l.vmpHot).filter((n) => n > 0);
    const lowest = positiveVmp.length ? Math.min(...positiveVmp) : 1;
    const idesign = l.isc * c.iscFactor;
    const deltaDC = (2 * c.lengthDC * rho * l.imp) / c.sectionDC;
    const dropDC = rows.length ? (deltaDC / lowest) * 100 : 0;
    const needDC = rows.length ? (2 * c.lengthDC * rho * l.imp) / (lowest * (c.dropDC / 100)) : 0;

    const currentAC = blocks.length ? (i.ac * 1000) / (s.voltage * (s.phases === 3 ? Math.sqrt(3) : 1) * s.pf) : 0;
    const kAC = s.phases === 3 ? Math.sqrt(3) : 2;
    const deltaAC = (kAC * c.lengthAC * rho * currentAC * s.pf) / c.sectionAC;
    const dropAC = (deltaAC / s.voltage) * 100;
    const needAC = (kAC * c.lengthAC * rho * currentAC * s.pf) / (s.voltage * (c.dropAC / 100));

    add(
      c.ampacityDC * c.derating >= idesign ? 'pass' : 'fail',
      'Cable CC · circuito de un string',
      `Iz corregida ${(c.ampacityDC * c.derating).toFixed(1)} A / corriente de dimensionamiento ${idesign.toFixed(1)} A`,
    );
    add(
      dropDC <= c.dropDC ? 'pass' : 'fail',
      'Cable CC · caída en string',
      `${dropDC.toFixed(2)} % / ${c.dropDC} %; sección mínima por caída ${needDC.toFixed(2)} mm²`,
    );
    add(
      c.ampacityAC * c.derating >= currentAC && c.breaker >= currentAC && c.breaker <= c.ampacityAC * c.derating ? 'pass' : 'fail',
      'Cable CA · salida de un inversor',
      `Ib ${currentAC.toFixed(1)} A ≤ In ${c.breaker} A ≤ Iz ${(c.ampacityAC * c.derating).toFixed(1)} A`,
    );
    add(
      dropAC <= c.dropAC ? 'pass' : 'fail',
      'Cable CA · caída resistiva',
      `${dropAC.toFixed(2)} % / ${c.dropAC} %; mínima por caída ${needAC.toFixed(2)} mm² (reactancia no incluida)`,
    );
    add(
      c.ratingV >= longest * l.vocCold && c.spdV > longest * l.vocCold ? 'pass' : 'fail',
      'Tensión de componentes CC',
      `Voc máximo ${(longest * l.vocCold).toFixed(1)} V; equipo ${c.ratingV} V; Ucpv DPS ${c.spdV} V. Falta coordinación de protección.`,
    );
    add(
      l.imp <= m.connectorA ? 'pass' : 'fail',
      'Conectores · corriente individual',
      `${l.imp.toFixed(2)} / ${m.connectorA} A; compatibilidad de fabricante y herramienta pendiente.`,
    );

    const maxP = Math.max(0, ...rows.map((r) => r.parallel));
    const reverse = Math.max(0, (maxP - 1) * l.isc);
    add(
      reverse <= m.fuse ? 'info' : 'warn',
      'Corriente inversa preliminar',
      `${reverse.toFixed(2)} A de otros strings; fusible serie máximo del panel ${m.fuse} A. La necesidad y calibre gPV requieren norma, fabricante y retornos del inversor.`,
    );
    add(
      'pending',
      'Colectores y protección final',
      'Los cálculos de cable son para string individual y salida de un inversor. Colectores CC/CA, cortocircuito, selectividad, diferencial, DPS y tierra requieren diseño específico.',
    );

    const batteryKWh = (s.battery.voltage * s.battery.ah) / 1000;
    const usable = batteryKWh * (s.battery.dod / 100) * (s.battery.eff / 100) * (i.eff / 100);
    const required = (s.critical * s.autonomy) / ((s.battery.dod / 100) * (s.battery.eff / 100) * (i.eff / 100));

    if (s.system !== 'grid') {
      add(
        batteryKWh >= required ? 'pass' : 'fail',
        'Reserva de batería',
        `${batteryKWh.toFixed(2)} kWh nominales / ${required.toFixed(2)} kWh necesarios para cargas críticas, sin aporte solar`,
      );
      add(
        s.battery.voltage >= i.batteryMin && s.battery.voltage <= i.batteryMax ? 'pass' : 'fail',
        'Tensión de batería',
        `${s.battery.voltage} V nominal / ventana ${i.batteryMin}–${i.batteryMax} V; rango real del BMS pendiente`,
      );
      add(
        s.peak <= s.battery.pcs && s.peak <= ac && (s.peak * 1000) / (s.battery.voltage * (i.eff / 100)) <= s.battery.discharge
          ? 'pass'
          : 'fail',
        'Potencia de respaldo',
        `Pico ${s.peak} kW; PCS ${s.battery.pcs} kW; descarga ${s.battery.discharge} A. Picos de arranque y cable batería pendientes.`,
      );
      add(
        'pending',
        'Sistema aislado / híbrido',
        'La autonomía calculada es reserva sin sol. La simulación SOC se habilita con datos horarios importados; arranques, BMS, transferencia y compatibilidad de firmware quedan pendientes.',
      );
    }

    const reviewEntries: [keyof PvProjectChecks, string][] = [
      ['survey', 'Relevamiento y temperaturas de diseño'],
      ['structure', 'Estructura, viento y cargas'],
      ['earthing', 'Puesta a tierra y equipotencialidad'],
      ['protection', 'Protecciones y cortocircuito'],
      ['utility', 'Requisitos de distribuidora / conexión'],
      ['commission', 'Ensayos y puesta en servicio'],
    ];
    for (const [k, title] of reviewEntries) {
      add(
        s.checks[k] ? 'declared' : 'pending',
        title,
        s.checks[k] ? 'Declarado revisado por el responsable; adjuntar evidencia en notas.' : 'Pendiente de revisión documentada.',
      );
    }

    if (kw >= 1000) {
      add(
        s.checks.mt ? 'declared' : 'pending',
        'Parque · red colectora / MT',
        'Transformadores, cortocircuito, flujo de potencia, protecciones MT, obra civil, accesos y permisos requieren ingeniería de proyecto.',
      );
    }

    if (s.mode === 'energy') {
      const targetAnnual = s.system === 'offgrid' ? s.critical * 365 : (s.demand * 12 * s.coverage) / 100;
      add(
        annual >= targetAnnual ? 'pass' : 'warn',
        'Cobertura energética anual calculada',
        `${annual.toFixed(0)} kWh generados frente a ${targetAnnual.toFixed(0)} kWh objetivo. No garantiza suministro hora a hora.`,
      );
    }

    if (hourly) {
      add(
        'info',
        'Simulación horaria · origen',
        `${hourly.source} · ${s.hourly!.time.length} horas · SOC inicial vacío · eficiencia de carga asumida 95%. Horas en UTC.`,
      );
      if (s.system === 'offgrid') {
        add(
          hourly.unserved < 0.01 ? 'pass' : 'fail',
          'Demanda aislada no abastecida',
          `${hourly.unserved.toFixed(2)} kWh en la serie importada. No extrapola a otros años.`,
        );
      }
      if (s.system !== 'grid') {
        add(
          s.inverter.chargeKW * blocks.length <= (s.battery.voltage * s.battery.charge) / 1000 ? 'info' : 'warn',
          'Límite de carga del banco',
          'La simulación limita carga por BMS y PCS; compatibilidad y reparto entre inversores pendientes.',
        );
      }
    }

    return {
      errors: [],
      layouts,
      limits: l,
      rows,
      blocks,
      count,
      strings,
      mppts,
      kw,
      ac,
      annual,
      monthly,
      hourly,
      checks,
      targetN: proposal.targetN,
      targetKW: proposal.targetKW,
      usedByZone,
      batteryKWh,
      usable,
      required,
      dcAc: ac ? kw / ac : 0,
      cables: { idesign, dropDC, needDC, currentAC, dropAC, needAC, reverse },
      area: layouts.reduce((a, b) => a + b.area, 0),
      moduleArea: count * m.width * m.height,
      weight: count * m.weight,
    };
  }

  async fetchNasaPower(lat: number, lon: number): Promise<PvNasaPowerResult> {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 89 || Math.abs(lon) > 180) {
      throw new Error('Coordenadas inválidas.');
    }
    const url = new URL('https://power.larc.nasa.gov/api/temporal/climatology/point');
    url.search = new URLSearchParams({
      parameters: 'ALLSKY_SFC_SW_DWN,T2M',
      community: 'RE',
      longitude: String(lon),
      latitude: String(lat),
      format: 'JSON',
    }).toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) throw new Error(`NASA respondió ${response.status}`);
    const data = await response.json();
    const p = data.properties?.parameter;
    const keys = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const hs = keys.map((k) => Number(p?.ALLSKY_SFC_SW_DWN?.[k]));
    const temps = keys.map((k) => Number(p?.T2M?.[k]));

    if (hs.some((n) => !Number.isFinite(n) || n <= 0 || n > 15) || temps.some((n) => !Number.isFinite(n) || n < -60 || n > 60)) {
      throw new Error('Respuesta incompleta o fuera de rango.');
    }
    const units = data.parameters?.ALLSKY_SFC_SW_DWN?.units;
    if (units && !/kW.*hr|kWh|kW-hr/i.test(units)) {
      throw new Error(`Unidad solar no reconocida: ${units}`);
    }

    const resourceSource = `NASA POWER · climatología · ${data.header?.range || 'período provisto por NASA'} · ${lat}, ${lon} · obtenido ${new Date().toISOString().slice(0, 10)}`;
    return { hsp: hs, ambient: temps, resourceSource };
  }

  parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    const row: string[] = [];
    let value = '';
    let quoted = false;
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    const sep = firstLine.includes(';') ? ';' : ',';

    for (let j = 0; j < text.length; j++) {
      const c = text[j];
      if (c === '"') {
        if (quoted && text[j + 1] === '"') {
          value += '"';
          j++;
        } else {
          quoted = !quoted;
        }
      } else if (c === sep && !quoted) {
        row.push(value);
        value = '';
      } else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && text[j + 1] === '\n') j++;
        row.push(value);
        if (row.some((s) => s.trim())) rows.push(row.splice(0));
        else row.length = 0;
        value = '';
      } else {
        value += c;
      }
    }
    if (quoted) throw new Error('CSV con comillas sin cerrar.');
    row.push(value);
    if (row.some((s) => s.trim())) rows.push(row);
    return rows;
  }

  parseHourlyCsv(text: string, fileName: string, state: PvProjectState): PvHourlyData {
    const rows = this.parseCSV(text.replace(/^\ufeff/, ''));
    const headerRow = rows.shift();
    if (!headerRow) throw new Error('Archivo CSV vacío.');
    const head = headerRow.map((s) => s.trim().toLowerCase());
    const required = ['time', 'temp_c', 'load_kw', ...state.zones.map((z) => `poa_${z.id}_wm2`)];

    for (const name of required) {
      if (!head.includes(name)) throw new Error(`Falta columna ${name}`);
    }
    if (![8760, 8784].includes(rows.length)) {
      throw new Error(`Se esperan 8760 o 8784 filas; recibidas ${rows.length}`);
    }

    const indexes: Record<string, number> = Object.fromEntries(required.map((k) => [k, head.indexOf(k)]));
    const hourly: PvHourlyData = { source: fileName, time: [], temp: [], load: [], poa: {} };
    state.zones.forEach((z) => (hourly.poa[z.id] = []));

    const parseNum = (r: string[], k: string) => {
      const v = r[indexes[k]]?.trim();
      if (!v || !Number.isFinite(Number(v))) throw new Error(`Dato vacío o inválido en ${k}`);
      return Number(v);
    };

    for (const r of rows) {
      const t = r[indexes['time']]?.trim();
      if (!t || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(t)) {
        throw new Error('Usar time en formato UTC AAAA-MM-DDTHH:00:00Z');
      }
      hourly.time.push(t);
      hourly.temp.push(parseNum(r, 'temp_c'));
      hourly.load.push(parseNum(r, 'load_kw'));
      state.zones.forEach((z) => hourly.poa[z.id].push(parseNum(r, `poa_${z.id}_wm2`)));
    }

    const end = Date.parse(hourly.time[hourly.time.length - 1]) + 3600000;
    const start = Date.parse(hourly.time[0]);
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (
      startDate.getUTCMonth() !== 0 ||
      startDate.getUTCDate() !== 1 ||
      startDate.getUTCHours() !== 0 ||
      endDate.getUTCMonth() !== 0 ||
      endDate.getUTCDate() !== 1 ||
      endDate.getUTCHours() !== 0 ||
      endDate.getUTCFullYear() !== startDate.getUTCFullYear() + 1
    ) {
      throw new Error('El CSV debe cubrir un año calendario completo en UTC.');
    }

    const errs = this.validate({ ...state, hourly });
    if (errs.length) throw new Error(errs.slice(0, 3).join(' '));
    return hourly;
  }

  buildHourlyTemplateCsv(zones: PvZone[]): string {
    const names = ['time', 'temp_c', 'load_kw', ...zones.map((z) => `poa_${z.id}_wm2`)];
    const zeros = zones.map(() => 0).join(',');
    return `${names.join(',')}\n2025-01-01T00:00:00Z,20,0.5,${zeros}\n2025-01-01T01:00:00Z,19,0.5,${zeros}\n`;
  }

  buildHourlyResultsCsv(state: PvProjectState, hourly: PvHourlySimResult): string {
    const headers = ['time', 'generation_kwh', 'load_kwh', 'soc_usable_kwh', 'grid_import_kwh', 'grid_export_kwh', 'unserved_kwh'];
    const lines = state.hourly!.time.map((t, j) =>
      [t, hourly.generation[j], hourly.loadSeries[j], hourly.socSeries[j], hourly.imports[j], hourly.exports[j], hourly.unservedSeries[j]]
        .map((v) => (typeof v === 'number' ? v.toFixed(6) : v))
        .join(','),
    );
    return [headers.join(','), ...lines].join('\r\n');
  }

  buildStringsCsv(state: PvProjectState, result: PvCalculationSuccess): string {
    const headers = [
      'Inversor',
      'MPPT',
      'Sector',
      'Paneles_en_serie',
      'Strings_en_paralelo',
      'Paneles_totales',
      'Potencia_CC_kWp',
      'Voc_frio_V',
      'Vmp_caliente_V',
      'Imp_diseno_MPPT_A',
      'Isc_diseno_MPPT_A',
    ];
    const vals = result.blocks.flatMap((b) =>
      b.mppts.map((r) => [
        b.number,
        r.mppt,
        state.zones.find((z) => z.id === r.zone)?.name || '',
        r.series,
        r.parallel,
        r.series * r.parallel,
        (r.series * r.parallel * state.module.p) / 1000,
        r.series * result.limits.vocCold,
        r.series * result.limits.vmpHot,
        r.parallel * result.limits.imp,
        r.parallel * result.limits.isc,
      ]),
    );
    const safe = (v: unknown) => {
      const str = typeof v === 'number' ? String(v) : String(v ?? '');
      const neutral = /^[=+\-@\t\r]/.test(str) && typeof v !== 'number' ? `'${str}` : str;
      return `"${neutral.replace(/"/g, '""')}"`;
    };
    return `\ufeff${[headers, ...vals].map((row) => row.map(safe).join(';')).join('\r\n')}`;
  }

  buildProjectJson(state: PvProjectState, photoCalibration: PvPhotoCalibration): string {
    return JSON.stringify({ ...state, photoCalibration }, null, 2);
  }

  buildResultsJson(state: PvProjectState, result: PvCalculationSuccess): string {
    return JSON.stringify({ app: 'Taller Flexible FV', version: 1, project: state, results: result }, null, 2);
  }

  private cleanMerge<T extends Record<string, unknown>>(base: T, obj: unknown): T {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return base;
    const source = obj as Record<string, unknown>;
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(base)) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const b = base[key];
      const v = source[key];
      if (b && typeof b === 'object' && !Array.isArray(b)) {
        out[key] = this.cleanMerge(b as Record<string, unknown>, v);
      } else if (Array.isArray(b)) {
        out[key] = Array.isArray(v) ? v.slice(0, 1000) : b;
      } else {
        out[key] = v;
      }
    }
    return out as T;
  }

  parseProjectJson(text: string): { state: PvProjectState; photoCalibration: PvPhotoCalibration } {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || obj.version !== 1) {
      throw new Error('Versión de proyecto no reconocida.');
    }

    const defaults = this.createDefaults();
    const next = this.cleanMerge(defaults as unknown as Record<string, unknown>, obj) as unknown as PvProjectState;
    const defaultZone = this.createDefaultZone();
    next.zones = next.zones.map((z) =>
      this.cleanMerge(defaultZone as unknown as Record<string, unknown>, z) as unknown as PvZone,
    );

    next.zones.forEach((z) => {
      if (
        !Array.isArray(z.obstacles) ||
        z.obstacles.length > 1000 ||
        z.obstacles.some((o) =>
          (['x', 'y', 'w', 'h'] as const).some((k) => !Number.isFinite(o[k]) || o[k] < 0),
        )
      ) {
        throw new Error('Obstáculos inválidos.');
      }
    });

    if (
      next.zones.some((z) => typeof z.id !== 'number' || !Number.isInteger(z.id)) ||
      new Set(next.zones.map((z) => z.id)).size !== next.zones.length
    ) {
      throw new Error('Identificadores de sector inválidos.');
    }

    // Preserve hourly if present in JSON (defaults.hourly is null so cleanMerge sets primitive/object directly)
    if (obj.hourly !== undefined && obj.hourly !== null && typeof obj.hourly === 'object') {
      next.hourly = obj.hourly;
    }

    const errors = this.validate(next);
    if (errors.length) {
      throw new Error(errors.slice(0, 3).join(' '));
    }

    if (next.photo !== null) {
      if (typeof next.photo !== 'string' || next.photo.length > 12e6 || !/^data:image\/(png|jpeg|webp);base64,/.test(next.photo)) {
        throw new Error('Foto inválida.');
      }
    }

    const photoCalibration: PvPhotoCalibration = {
      scale: Number(obj.photoCalibration?.scale) || 0,
      reference: Number(obj.photoCalibration?.reference) || 10,
      orthographic: !!obj.photoCalibration?.orthographic,
    };

    return { state: next, photoCalibration };
  }

  fmt(n: number | undefined | null, d = 1): string {
    return typeof n === 'number' && Number.isFinite(n)
      ? n.toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: d })
      : '—';
  }
}
