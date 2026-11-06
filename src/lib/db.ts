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

  // 4. Seed Transfer Orders if empty or minimal
  const orderCount = (db.prepare('SELECT count(*) as count FROM transfer_orders').get() as any).count;
  if (orderCount < 5) {
    const insertOrder = db.prepare(`
      INSERT INTO transfer_orders (
        to_number, reference, order_date, plate_no, trailer_plate_no,
        carrier_name, driver_name, driver_licence_no, product_item_number,
        ship_from_storage_point, ship_from_date, ship_from_loc,
        ship_to_depot, ship_to_date, ship_to_loc,
        start_observed_density, start_temperature, start_density_20, start_factor,
        start_observed_litres, start_vol20, origin_vol20,
        use_metered, meter_reading_from_1, meter_reading_to_1, drained_1,
        metered_total, final_observed_litres, final_observed_density,
        final_temperature, final_density_20, final_factor, final_vol20,
        loss_volume, allowable_loss_percent, allowed_loss_volume, allowed_loss_2dp,
        debit_volume, price_per_litre, debit_amount, status
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const sampleOrders = [
      {
        to_number: 'TO-20261012-40983',
        ref: 'REF-HORIZON-9812',
        date: '2026-10-12',
        plate: 'A40983/*41304',
        trailer: '41304',
        carrier: 'Dekebo Transport',
        driver: 'Mohammed Ahmed',
        licence: 'DL-ETH-88219',
        product: 'P07-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'TAF ADDIS DEPOT',
        startDens: 789.0,
        startTemp: 19.5,
        startVol: 48000,
        originVol20: 48710,
        finalVol20: 48640,
        loss: 70.0,
        allowPct: 0.12,
        allowedVol: 58,
        allowed2dp: 58.45,
        debitVol: 11.55,
        price: 319.76,
        debitAmt: 3693.23,
      },
      {
        to_number: 'TO-20261016-03843',
        ref: 'REF-HORIZON-9844',
        date: '2026-10-16',
        plate: 'A03843/*29988',
        trailer: '29988',
        carrier: 'Third Party Logistics',
        driver: 'Kebede Tessema',
        licence: 'DL-ETH-74312',
        product: 'P01-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'TAF ADDIS DEPOT',
        startDens: 835.0,
        startTemp: 21.0,
        startVol: 49100,
        originVol20: 49100,
        finalVol20: 49045,
        loss: 55.0,
        allowPct: 0.08,
        allowedVol: 39,
        allowed2dp: 39.28,
        debitVol: 15.72,
        price: 85.50,
        debitAmt: 1344.06,
      },
      {
        to_number: 'TO-20261020-23417',
        ref: 'REF-HORIZON-9901',
        date: '2026-10-20',
        plate: '23417/*36454',
        trailer: '36454',
        carrier: 'TAF Oil Fleet',
        driver: 'Abebe Bekele',
        licence: 'DL-ETH-65011',
        product: 'P02-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'AWASH DEPOT',
        startDens: 735.0,
        startTemp: 22.0,
        startVol: 47000,
        originVol20: 47000,
        finalVol20: 46972,
        loss: 28.0,
        allowPct: 0.08,
        allowedVol: 38,
        allowed2dp: 37.60,
        debitVol: 0.0,
        price: 92.00,
        debitAmt: 0.0,
      },
      {
        to_number: 'TO-20261024-43401',
        ref: 'REF-HORIZON-9932',
        date: '2026-10-24',
        plate: '43401/*31600',
        trailer: '31600',
        carrier: 'TAF Oil Fleet',
        driver: 'Mulugeta Haile',
        licence: 'DL-ETH-72109',
        product: 'P07-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'KOMBOLCHA DEPOT',
        startDens: 788.5,
        startTemp: 19.8,
        startVol: 47400,
        originVol20: 47400,
        finalVol20: 47330,
        loss: 70.0,
        allowPct: 0.12,
        allowedVol: 57,
        allowed2dp: 56.88,
        debitVol: 13.12,
        price: 319.76,
        debitAmt: 4195.25,
      },
      {
        to_number: 'TO-20261027-04327',
        ref: 'REF-HORIZON-9965',
        date: '2026-10-27',
        plate: '4327/*32112',
        trailer: '32112',
        carrier: 'TAF Oil Fleet',
        driver: 'Dawit Yohannes',
        licence: 'DL-ETH-59844',
        product: 'P03-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'TAF ADDIS DEPOT',
        startDens: 800.0,
        startTemp: 20.0,
        startVol: 48800,
        originVol20: 48800,
        finalVol20: 48762,
        loss: 38.0,
        allowPct: 0.08,
        allowedVol: 39,
        allowed2dp: 39.04,
        debitVol: 0.0,
        price: 78.00,
        debitAmt: 0.0,
      },
      {
        to_number: 'TO-20261029-23190',
        ref: 'REF-HORIZON-9990',
        date: '2026-10-29',
        plate: '23190/*36439',
        trailer: '36439',
        carrier: 'TAF Oil Fleet',
        driver: 'Girma Wolde',
        licence: 'DL-ETH-81203',
        product: 'P01-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'TAF ADDIS DEPOT',
        startDens: 836.0,
        startTemp: 20.5,
        startVol: 47200,
        originVol20: 47200,
        finalVol20: 47142,
        loss: 58.0,
        allowPct: 0.08,
        allowedVol: 38,
        allowed2dp: 37.76,
        debitVol: 20.24,
        price: 85.50,
        debitAmt: 1730.52,
      },
      {
        to_number: 'TO-20261101-27619',
        ref: 'REF-HORIZON-10020',
        date: '2026-11-01',
        plate: '27619/*38149',
        trailer: '38149',
        carrier: 'TAF Oil Fleet',
        driver: 'Solomon Tesfaye',
        licence: 'DL-ETH-90231',
        product: 'P07-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'TAF ADDIS DEPOT',
        startDens: 789.2,
        startTemp: 19.2,
        startVol: 46900,
        originVol20: 46900,
        finalVol20: 46838,
        loss: 62.0,
        allowPct: 0.12,
        allowedVol: 56,
        allowed2dp: 56.28,
        debitVol: 5.72,
        price: 319.76,
        debitAmt: 1829.03,
      },
      {
        to_number: 'TO-20261102-42163',
        ref: 'REF-HORIZON-10045',
        date: '2026-11-02',
        plate: 'A42163/*42143',
        trailer: '42143',
        carrier: 'Dekebo Transport',
        driver: 'Berhanu Legesse',
        licence: 'DL-ETH-61405',
        product: 'P01-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'AWASH DEPOT',
        startDens: 834.0,
        startTemp: 22.5,
        startVol: 51000,
        originVol20: 51000,
        finalVol20: 50935,
        loss: 65.0,
        allowPct: 0.08,
        allowedVol: 41,
        allowed2dp: 40.80,
        debitVol: 24.20,
        price: 85.50,
        debitAmt: 2069.10,
      },
      {
        to_number: 'TO-20261103-11621',
        ref: 'REF-HORIZON-10072',
        date: '2026-11-03',
        plate: 'A11621/*33405',
        trailer: '33405',
        carrier: 'Dekebo Transport',
        driver: 'Kassahun Desta',
        licence: 'DL-ETH-77890',
        product: 'P02-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'TAF ADDIS DEPOT',
        startDens: 736.0,
        startTemp: 21.5,
        startVol: 51900,
        originVol20: 51900,
        finalVol20: 51865,
        loss: 35.0,
        allowPct: 0.08,
        allowedVol: 42,
        allowed2dp: 41.52,
        debitVol: 0.0,
        price: 92.00,
        debitAmt: 0.0,
      },
      {
        to_number: 'TO-20261104-42171',
        ref: 'REF-HORIZON-10098',
        date: '2026-11-04',
        plate: 'A42171/*42145',
        trailer: '42145',
        carrier: 'Third Party Logistics',
        driver: 'Fikadu Negash',
        licence: 'DL-ETH-44321',
        product: 'P07-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'TAF ADDIS DEPOT',
        startDens: 789.5,
        startTemp: 19.0,
        startVol: 49600,
        originVol20: 49600,
        finalVol20: 49515,
        loss: 85.0,
        allowPct: 0.12,
        allowedVol: 60,
        allowed2dp: 59.52,
        debitVol: 25.48,
        price: 319.76,
        debitAmt: 8147.48,
      },
      {
        to_number: 'TO-20261105-42168',
        ref: 'REF-HORIZON-10115',
        date: '2026-11-05',
        plate: 'A42168/*42144',
        trailer: '42144',
        carrier: 'Third Party Logistics',
        driver: 'Hailu Lemma',
        licence: 'DL-ETH-55672',
        product: 'P01-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'TAF ADDIS DEPOT',
        startDens: 835.5,
        startTemp: 21.0,
        startVol: 49800,
        originVol20: 49800,
        finalVol20: 49742,
        loss: 58.0,
        allowPct: 0.08,
        allowedVol: 40,
        allowed2dp: 39.84,
        debitVol: 18.16,
        price: 85.50,
        debitAmt: 1552.68,
      },
      {
        to_number: 'TO-20261106-03864',
        ref: 'REF-HORIZON-10140',
        date: '2026-11-06',
        plate: 'A03864/*31836',
        trailer: '31836',
        carrier: 'Third Party Logistics',
        driver: 'Yonas Mekonnen',
        licence: 'DL-ETH-33219',
        product: 'P07-0001',
        fromDepot: 'HORIZON DJIBOUTI TERMINAL',
        toDepot: 'TAF ADDIS DEPOT',
        startDens: 789.0,
        startTemp: 19.5,
        startVol: 47150,
        originVol20: 47150,
        finalVol20: 47080,
        loss: 70.0,
        allowPct: 0.12,
        allowedVol: 57,
        allowed2dp: 56.58,
        debitVol: 13.42,
        price: 319.76,
        debitAmt: 4291.18,
      },
    ];

    db.exec('BEGIN');
    try {
      for (const o of sampleOrders) {
        const sD20 = DensityCalc.density20(o.startDens, o.startTemp);
        const sFactor = DensityCalc.vcf20(sD20, o.startTemp);
        insertOrder.run(
          o.to_number,
          o.ref,
          o.date,
          o.plate,
          o.trailer,
          o.carrier,
          o.driver,
          o.licence,
          o.product,
          o.fromDepot,
          o.date,
          'DJIBOUTI',
          o.toDepot,
          o.date,
          'ADDIS ABABA',
          o.startDens,
          o.startTemp,
          sD20,
          sFactor,
          o.startVol,
          o.originVol20,
          o.originVol20,
          1, // use_metered
          100000,
          100000 + o.finalVol20,
          0,
          o.finalVol20,
          o.finalVol20,
          o.startDens,
          20.0,
          sD20,
          1.0,
          o.finalVol20,
          o.loss,
          o.allowPct,
          o.allowedVol,
          o.allowed2dp,
          o.debitVol,
          o.price,
          o.debitAmt,
          'completed'
        );
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
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
