import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { DensityCalc } from './density-calc';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'taf_oil.sqlite');
  dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  initSchema(dbInstance);
  seedInitialData(dbInstance);

  return dbInstance;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS truck_headers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_no TEXT NOT NULL UNIQUE,
      truck_no TEXT,
      trailer_plate_no TEXT,
      carrier_name TEXT,
      driver_name TEXT,
      driver_licence_no TEXT,
      compartment_count INTEGER NOT NULL DEFAULT 1,
      total_capacity REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS truck_calibrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_no TEXT NOT NULL,
      compartment_no INTEGER NOT NULL,
      dip_mm INTEGER NOT NULL,
      litres REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_truck_comp_dip ON truck_calibrations(plate_no, compartment_no, dip_mm);

    CREATE TABLE IF NOT EXISTS allowable_loss_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_number TEXT NOT NULL UNIQUE,
      product_name TEXT NOT NULL,
      allowable_loss_percent REAL NOT NULL DEFAULT 0.08,
      price_per_litre REAL NOT NULL DEFAULT 0.0,
      opening_balance REAL DEFAULT 0.0,
      adjustment REAL DEFAULT 0.0,
      pipeline_stock REAL DEFAULT 0.0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transfer_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_number TEXT NOT NULL UNIQUE,
      reference TEXT,
      order_date TEXT NOT NULL,
      plate_no TEXT NOT NULL,
      trailer_plate_no TEXT,
      carrier_name TEXT,
      driver_name TEXT,
      driver_licence_no TEXT,
      product_item_number TEXT NOT NULL,

      ship_from_storage_point TEXT,
      ship_from_date TEXT,
      ship_from_loc TEXT,
      ship_to_depot TEXT,
      ship_to_date TEXT,
      ship_to_loc TEXT,

      start_observed_density REAL NOT NULL,
      start_temperature REAL NOT NULL,
      start_density_20 REAL NOT NULL,
      start_factor REAL NOT NULL,
      start_observed_litres REAL NOT NULL,
      start_vol20 REAL NOT NULL,
      origin_vol20 REAL,

      use_metered INTEGER NOT NULL DEFAULT 1,
      meter_reading_from_1 REAL,
      meter_reading_to_1 REAL,
      drained_1 REAL,
      meter_reading_from_2 REAL,
      meter_reading_to_2 REAL,
      drained_2 REAL,
      metered_total REAL,

      final_observed_litres REAL,
      final_observed_density REAL,
      final_temperature REAL,
      final_density_20 REAL,
      final_factor REAL,
      final_vol20 REAL NOT NULL,

      loss_volume REAL NOT NULL DEFAULT 0,
      allowable_loss_percent REAL NOT NULL DEFAULT 0.08,
      allowed_loss_volume INTEGER NOT NULL DEFAULT 0,
      allowed_loss_2dp REAL NOT NULL DEFAULT 0,
      debit_volume REAL NOT NULL DEFAULT 0,
      price_per_litre REAL NOT NULL DEFAULT 0,
      debit_amount REAL NOT NULL DEFAULT 0,

      sg_15_dj_1 REAL,
      sg_15_dj_2 REAL,
      sg_15_diff REAL,
      insurance_status TEXT DEFAULT 'No',
      via TEXT,
      side_no TEXT,
      transhipment_order_no TEXT,
      delivery_order_no TEXT,

      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transfer_order_compartments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_order_id INTEGER NOT NULL,
      compartment_no INTEGER NOT NULL,
      dip_mm INTEGER NOT NULL,
      litres INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(transfer_order_id) REFERENCES transfer_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS density_correct_20 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      observed_density REAL NOT NULL,
      temperature REAL NOT NULL,
      density_20 REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_density_temp ON density_correct_20(observed_density, temperature);

    CREATE TABLE IF NOT EXISTS factor_correct_20 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temperature REAL NOT NULL,
      density_20 REAL NOT NULL,
      factor REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_factor_temp_dens ON factor_correct_20(temperature, density_20);
  `);
}

function seedInitialData(db: DatabaseSync): void {
  // 1. Products
  const productCount = (db.prepare('SELECT count(*) as count FROM allowable_loss_products').get() as any).count;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO allowable_loss_products (item_number, product_name, allowable_loss_percent, price_per_litre)
      VALUES (?, ?, ?, ?)
    `);

    insertProduct.run('P07-0001', 'JET-A1', 0.1200, 319.7600);
    insertProduct.run('P01-0001', 'Automotive Gas Oil (AGO)', 0.0800, 85.5000);
    insertProduct.run('P02-0001', 'Regular Gasoline (MGR)', 0.0800, 92.0000);
    insertProduct.run('P03-0001', 'Kerosene (KERO)', 0.0800, 78.0000);
  }

  // 2. Trucks & Calibrations
  const truckCount = (db.prepare('SELECT count(*) as count FROM truck_headers').get() as any).count;
  if (truckCount === 0) {
    const insertTruck = db.prepare(`
      INSERT INTO truck_headers (plate_no, truck_no, trailer_plate_no, carrier_name, driver_name, driver_licence_no, compartment_count, total_capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCalibration = db.prepare(`
      INSERT INTO truck_calibrations (plate_no, compartment_no, dip_mm, litres)
      VALUES (?, ?, ?, ?)
    `);

    const trucksData = [
      {
        plate_no: 'A40983/*41304',
        truck_no: 'A40983',
        trailer_plate_no: '41304',
        carrier_name: 'Third Party (Dekebo)',
        driver_name: 'Mohammed Ahmed',
        driver_licence_no: 'DL-ETH-88219',
        compartment_count: 5,
        total_capacity: 50293.0,
        calibrations: [
          { comp: 1, dip: 0, litres: 0 },
          { comp: 1, dip: 700, litres: 5700 },
          { comp: 1, dip: 1395, litres: 11395 },
          { comp: 2, dip: 0, litres: 0 },
          { comp: 2, dip: 900, litres: 5800 },
          { comp: 2, dip: 1850, litres: 11850 },
          { comp: 3, dip: 0, litres: 0 },
          { comp: 3, dip: 1300, litres: 6200 },
          { comp: 3, dip: 2667, litres: 12667 },
          { comp: 4, dip: 0, litres: 0 },
          { comp: 4, dip: 2000, litres: 6500 },
          { comp: 4, dip: 4381, litres: 14381 },
          { comp: 5, dip: 0, litres: 0 },
        ],
      },
      {
        plate_no: 'A03843/*29988',
        truck_no: 'A03843',
        trailer_plate_no: '29988',
        carrier_name: 'Third Party Logistics',
        driver_name: 'Kebede Tessema',
        driver_licence_no: 'DL-ETH-74312',
        compartment_count: 5,
        total_capacity: 49135.0,
        calibrations: [
          { comp: 1, dip: 0, litres: 0 },
          { comp: 1, dip: 1512, litres: 11395 },
          { comp: 2, dip: 0, litres: 0 },
          { comp: 2, dip: 1498, litres: 11850 },
          { comp: 3, dip: 0, litres: 0 },
          { comp: 3, dip: 1575, litres: 12667 },
          { comp: 4, dip: 0, litres: 0 },
          { comp: 4, dip: 1633, litres: 13223 },
          { comp: 5, dip: 0, litres: 0 },
        ],
      },
      {
        plate_no: '23417/*36454',
        truck_no: '23417',
        trailer_plate_no: '36454',
        carrier_name: 'TAF Oil Fleet',
        driver_name: 'Abebe Bekele',
        driver_licence_no: 'DL-ETH-65011',
        compartment_count: 5,
        total_capacity: 47062.0,
        calibrations: [],
      },
      {
        plate_no: '43401/*31600',
        truck_no: '43401',
        trailer_plate_no: '31600',
        carrier_name: 'TAF Oil Fleet',
        driver_name: 'Mulugeta Haile',
        driver_licence_no: 'DL-ETH-72109',
        compartment_count: 5,
        total_capacity: 47483.0,
        calibrations: [],
      },
      {
        plate_no: '4327/*32112',
        truck_no: '4327',
        trailer_plate_no: '32112',
        carrier_name: 'TAF Oil Fleet',
        driver_name: 'Dawit Yohannes',
        driver_licence_no: 'DL-ETH-59844',
        compartment_count: 5,
        total_capacity: 48802.0,
        calibrations: [],
      },
      {
        plate_no: '23190/*36439',
        truck_no: '23190',
        trailer_plate_no: '36439',
        carrier_name: 'TAF Oil Fleet',
        driver_name: 'Girma Wolde',
        driver_licence_no: 'DL-ETH-81203',
        compartment_count: 5,
        total_capacity: 47284.0,
        calibrations: [],
      },
      {
        plate_no: '27619/*38149',
        truck_no: '27619',
        trailer_plate_no: '38149',
        carrier_name: 'TAF Oil Fleet',
        driver_name: 'Solomon Tesfaye',
        driver_licence_no: 'DL-ETH-90231',
        compartment_count: 5,
        total_capacity: 46981.0,
        calibrations: [],
      },
      {
        plate_no: 'A42163/*42143',
        truck_no: 'A42163',
        trailer_plate_no: '42143',
        carrier_name: 'Dekebo Transport',
        driver_name: 'Berhanu Legesse',
        driver_licence_no: 'DL-ETH-61405',
        compartment_count: 5,
        total_capacity: 51026.0,
        calibrations: [],
      },
      {
        plate_no: 'A11621/*33405',
        truck_no: 'A11621',
        trailer_plate_no: '33405',
        carrier_name: 'Dekebo Transport',
        driver_name: 'Kassahun Desta',
        driver_licence_no: 'DL-ETH-77890',
        compartment_count: 5,
        total_capacity: 52018.0,
        calibrations: [],
      },
      {
        plate_no: 'A42171/*42145',
        truck_no: 'A42171',
        trailer_plate_no: '42145',
        carrier_name: 'Third Party Logistics',
        driver_name: 'Fikadu Negash',
        driver_licence_no: 'DL-ETH-44321',
        compartment_count: 5,
        total_capacity: 49633.0,
        calibrations: [],
      },
      {
        plate_no: 'A42168/*42144',
        truck_no: 'A42168',
        trailer_plate_no: '42144',
        carrier_name: 'Third Party Logistics',
        driver_name: 'Hailu Lemma',
        driver_licence_no: 'DL-ETH-55672',
        compartment_count: 5,
        total_capacity: 49868.0,
        calibrations: [],
      },
      {
        plate_no: 'A03864/*31836',
        truck_no: 'A03864',
        trailer_plate_no: '31836',
        carrier_name: 'Third Party Logistics',
        driver_name: 'Yonas Mekonnen',
        driver_licence_no: 'DL-ETH-33219',
        compartment_count: 5,
        total_capacity: 47200.0,
        calibrations: [],
      },
      {
        plate_no: 'A34811/*08620',
        truck_no: 'A34811',
        trailer_plate_no: '08620',
        carrier_name: 'Dekebo Transport',
        driver_name: 'Tekle Woldemariam',
        driver_licence_no: 'DL-ETH-99120',
        compartment_count: 5,
        total_capacity: 47570.0,
        calibrations: [],
      },
    ];

    db.exec('BEGIN');
    try {
      for (const t of trucksData) {
        insertTruck.run(
          t.plate_no,
          t.truck_no,
          t.trailer_plate_no,
          t.carrier_name,
          t.driver_name,
          t.driver_licence_no,
          t.compartment_count,
          t.total_capacity
        );

        for (const cal of t.calibrations) {
          insertCalibration.run(t.plate_no, cal.comp, cal.dip, cal.litres);
        }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }

  // 3. Lookup Grid Generation
  const densityCount = (db.prepare('SELECT count(*) as count FROM density_correct_20').get() as any).count;
  if (densityCount < 361) {
    const densities = [
      720.0, 725.0, 730.0, 735.0, 740.0, 745.0, 750.0, 755.0,
      760.0, 770.0, 780.0, 785.0, 790.0, 800.0, 810.0, 820.0,
      830.0, 840.0, 850.0,
    ];

    const temperatures = [
      12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 19.5, 20.0,
      20.5, 21.0, 22.0, 23.0, 24.0, 25.0, 26.0, 28.0, 30.0,
    ];

    const insertDensity = db.prepare(`
      INSERT INTO density_correct_20 (observed_density, temperature, density_20)
      VALUES (?, ?, ?)
    `);

    const insertFactor = db.prepare(`
      INSERT INTO factor_correct_20 (temperature, density_20, factor)
      VALUES (?, ?, ?)
    `);

    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM density_correct_20').run();
      db.prepare('DELETE FROM factor_correct_20').run();

      for (const obsDens of densities) {
        for (const temp of temperatures) {
          const d20 = DensityCalc.density20(obsDens, temp);
          const factor = DensityCalc.vcf20(d20, temp);

          insertDensity.run(obsDens, temp, d20);
          insertFactor.run(temp, d20, factor);
        }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

// ----------------- Typed Data Fetchers -----------------

export interface TruckHeader {
  id: number;
  plate_no: string;
  truck_no: string | null;
  trailer_plate_no: string | null;
  carrier_name: string | null;
  driver_name: string | null;
  driver_licence_no: string | null;
  compartment_count: number;
  total_capacity: number;
  calibrations?: TruckCalibration[];
}

export interface TruckCalibration {
  id: number;
  plate_no: string;
  compartment_no: number;
  dip_mm: number;
  litres: number;
}

export interface AllowableLossProduct {
  id: number;
  item_number: string;
  product_name: string;
  allowable_loss_percent: number;
  price_per_litre: number;
}

export interface TransferOrder {
  id: number;
  to_number: string;
  reference: string | null;
  order_date: string;
  plate_no: string;
  trailer_plate_no: string | null;
  carrier_name: string | null;
  driver_name: string | null;
  driver_licence_no: string | null;
  product_item_number: string;

  ship_from_storage_point: string | null;
  ship_from_date: string | null;
  ship_from_loc: string | null;
  ship_to_depot: string | null;
  ship_to_date: string | null;
  ship_to_loc: string | null;

  start_observed_density: number;
  start_temperature: number;
  start_density_20: number;
  start_factor: number;
  start_observed_litres: number;
  start_vol20: number;
  origin_vol20: number | null;

  use_metered: number;
  meter_reading_from_1: number | null;
  meter_reading_to_1: number | null;
  drained_1: number | null;
  meter_reading_from_2: number | null;
  meter_reading_to_2: number | null;
  drained_2: number | null;
  metered_total: number | null;

  final_observed_litres: number | null;
  final_observed_density: number | null;
  final_temperature: number | null;
  final_density_20: number | null;
  final_factor: number;
  final_vol20: number;

  loss_volume: number;
  allowable_loss_percent: number;
  allowed_loss_volume: number;
  allowed_loss_2dp: number;
  debit_volume: number;
  price_per_litre: number;
  debit_amount: number;

  sg_15_dj_1: number | null;
  sg_15_dj_2: number | null;
  sg_15_diff: number | null;
  insurance_status: string | null;
  via: string | null;
  side_no: string | null;
  transhipment_order_no: string | null;
  delivery_order_no: string | null;

  status: string;
  created_at: string;
  updated_at: string;
}

export function toPlain<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export function getAllTrucks(): TruckHeader[] {
  const db = getDb();
  const trucks = db.prepare('SELECT * FROM truck_headers ORDER BY plate_no ASC').all() as unknown as TruckHeader[];
  const calibs = db.prepare('SELECT * FROM truck_calibrations ORDER BY compartment_no, dip_mm ASC').all() as unknown as TruckCalibration[];

  const calibMap = new Map<string, TruckCalibration[]>();
  for (const c of calibs) {
    if (!calibMap.has(c.plate_no)) {
      calibMap.set(c.plate_no, []);
    }
    calibMap.get(c.plate_no)!.push(c);
  }

  const result = trucks.map((t) => ({
    ...t,
    calibrations: calibMap.get(t.plate_no) || [],
  }));

  return toPlain(result);
}

export function getTruckByPlate(plateNo: string): TruckHeader | null {
  const db = getDb();
  const truck = db.prepare('SELECT * FROM truck_headers WHERE plate_no = ?').get(plateNo) as unknown as TruckHeader | undefined;
  if (!truck) return null;

  const calibrations = db.prepare(
    'SELECT * FROM truck_calibrations WHERE plate_no = ? ORDER BY compartment_no, dip_mm ASC'
  ).all(plateNo) as unknown as TruckCalibration[];

  return toPlain({ ...truck, calibrations });
}

export function getAllProducts(): AllowableLossProduct[] {
  const db = getDb();
  const products = db.prepare('SELECT * FROM allowable_loss_products ORDER BY item_number ASC').all() as unknown as AllowableLossProduct[];
  return toPlain(products);
}

export function getAllTransferOrders(): TransferOrder[] {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM transfer_orders ORDER BY id DESC').all() as unknown as TransferOrder[];
  return toPlain(orders);
}

export function getDebitNotes(): TransferOrder[] {
  const db = getDb();
  const notes = db.prepare('SELECT * FROM transfer_orders WHERE debit_volume > 0 ORDER BY id DESC').all() as unknown as TransferOrder[];
  return toPlain(notes);
}

export function getTransferOrderByIdOrNumber(idOrNum: string | number): TransferOrder | null {
  const db = getDb();
  let order: TransferOrder | undefined;
  if (typeof idOrNum === 'number' || !isNaN(Number(idOrNum))) {
    order = db.prepare('SELECT * FROM transfer_orders WHERE id = ?').get(Number(idOrNum)) as unknown as TransferOrder | undefined;
  }
  if (!order) {
    order = db.prepare('SELECT * FROM transfer_orders WHERE to_number = ?').get(String(idOrNum)) as unknown as TransferOrder | undefined;
  }
  return order ? toPlain(order) : null;
}

export function getTableCounts(): Record<string, number> {
  const db = getDb();
  const getCount = (table: string): number => {
    return (db.prepare(`SELECT count(*) as count FROM ${table}`).get() as any).count;
  };

  const debitNotesCount = (
    db.prepare('SELECT count(*) as count FROM transfer_orders WHERE debit_volume > 0').get() as any
  ).count;

  return toPlain({
    truck_headers: getCount('truck_headers'),
    truck_calibrations: getCount('truck_calibrations'),
    allowable_loss_products: getCount('allowable_loss_products'),
    transfer_orders: getCount('transfer_orders'),
    debit_notes: debitNotesCount,
    density_correct_20: getCount('density_correct_20'),
    factor_correct_20: getCount('factor_correct_20'),
  });
}
