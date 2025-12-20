export type WmsLineMeta = {
  lotNumber?: string;
  expiryDate?: string;
  productionDate?: string;
  binLocation?: string;
  binZone?: string;
};

export type WarehouseBinLocation = {
  id: string;
  code: string;
  description: string;
  aisle: string;
  rack: string;
  position: string;
  zone: string;
  temperature: string;
  storageType: string;
};

export type LotDashboardEntry = {
  id: string;
  itemCode: string;
  itemName: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  location: string;
};

export type WmsStat = {
  label: string;
  value: string;
  helper: string;
};

export type PickingOrderLine = {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  lotNumber: string;
  expiryDate: string;
  locationCode: string;
  zone: string;
};

export type PickingOrder = {
  id: string;
  reference: string;
  customer: string;
  status: "open" | "in_progress" | "completed";
  createdAt: string;
  pickerId?: string;
  lines: PickingOrderLine[];
};

const LOT_TRACKING_KEY = "coreflow.wms.lotTracking";

export const warehouseBinLocations: WarehouseBinLocation[] = [
  {
    id: "loc-ambient-01",
    code: "A-01-01",
    description: "Aisle A • Rack 1 • Level 1",
    aisle: "A",
    rack: "01",
    position: "01",
    zone: "Ambient",
    temperature: "15-25°C",
    storageType: "General",
  },
  {
    id: "loc-ambient-02",
    code: "A-01-02",
    description: "Aisle A • Rack 1 • Level 2",
    aisle: "A",
    rack: "01",
    position: "02",
    zone: "Ambient",
    temperature: "15-25°C",
    storageType: "General",
  },
  {
    id: "loc-bulk-01",
    code: "B-02-01",
    description: "Aisle B • Rack 2 • Bulk Zone",
    aisle: "B",
    rack: "02",
    position: "01",
    zone: "Bulk",
    temperature: "15-25°C",
    storageType: "Pallet",
  },
  {
    id: "loc-cold-01",
    code: "C-01-01",
    description: "Cold Zone • Rack 1 • Level 1",
    aisle: "C",
    rack: "01",
    position: "01",
    zone: "Cold",
    temperature: "2-8°C",
    storageType: "Cold",
  },
  {
    id: "loc-cold-02",
    code: "C-01-02",
    description: "Cold Zone • Rack 1 • Level 2",
    aisle: "C",
    rack: "01",
    position: "02",
    zone: "Cold",
    temperature: "2-8°C",
    storageType: "Cold",
  },
  {
    id: "loc-hazard-01",
    code: "H-01-01",
    description: "Hazmat • Rack 1 • Level 1",
    aisle: "H",
    rack: "01",
    position: "01",
    zone: "Hazmat",
    temperature: "15-25°C",
    storageType: "Hazardous",
  },
];

export const lotDashboardEntries: LotDashboardEntry[] = [
  {
    id: "lot-001",
    itemCode: "ART-102",
    itemName: "Energy Drink 500ml",
    lotNumber: "LOT-2024-08A",
    expiryDate: "2024-09-15",
    quantity: 240,
    location: "C-01-01",
  },
  {
    id: "lot-002",
    itemCode: "ART-215",
    itemName: "Printer Toner Black",
    lotNumber: "LOT-2023-11B",
    expiryDate: "2024-03-20",
    quantity: 12,
    location: "A-01-02",
  },
  {
    id: "lot-003",
    itemCode: "ART-330",
    itemName: "Medical Gloves Medium",
    lotNumber: "LOT-2024-05C",
    expiryDate: "2024-10-10",
    quantity: 480,
    location: "C-01-02",
  },
  {
    id: "lot-004",
    itemCode: "ART-008",
    itemName: "Cleaning Solution 5L",
    lotNumber: "LOT-2024-01D",
    expiryDate: "2024-02-12",
    quantity: 18,
    location: "H-01-01",
  },
];

export const wmsStats: WmsStat[] = [
  { label: "Today's picks", value: "32", helper: "Orders completed" },
  { label: "Lines picked", value: "186", helper: "Last 24 hours" },
  { label: "Avg. pick time", value: "11 min", helper: "Per order" },
  { label: "Stock accuracy", value: "98.7%", helper: "Cycle counts" },
];

export const pickingOrders: PickingOrder[] = [
  {
    id: "pick-001",
    reference: "SO-24058",
    customer: "Adriatic Retail Group",
    status: "open",
    createdAt: "2024-04-02T09:25:00Z",
    lines: [
      {
        id: "pick-001-line-1",
        itemCode: "ART-102",
        itemName: "Energy Drink 500ml",
        quantity: 48,
        unit: "pcs",
        lotNumber: "LOT-2024-08A",
        expiryDate: "2024-09-15",
        locationCode: "C-01-01",
        zone: "Cold",
      },
      {
        id: "pick-001-line-2",
        itemCode: "ART-330",
        itemName: "Medical Gloves Medium",
        quantity: 120,
        unit: "box",
        lotNumber: "LOT-2024-05C",
        expiryDate: "2024-10-10",
        locationCode: "C-01-02",
        zone: "Cold",
      },
      {
        id: "pick-001-line-3",
        itemCode: "ART-215",
        itemName: "Printer Toner Black",
        quantity: 6,
        unit: "pcs",
        lotNumber: "LOT-2023-11B",
        expiryDate: "2024-03-20",
        locationCode: "A-01-02",
        zone: "Ambient",
      },
    ],
  },
  {
    id: "pick-002",
    reference: "SO-24059",
    customer: "Bosna Medical",
    status: "in_progress",
    createdAt: "2024-04-02T10:05:00Z",
    pickerId: "emp-002",
    lines: [
      {
        id: "pick-002-line-1",
        itemCode: "ART-008",
        itemName: "Cleaning Solution 5L",
        quantity: 10,
        unit: "pcs",
        lotNumber: "LOT-2024-01D",
        expiryDate: "2024-02-12",
        locationCode: "H-01-01",
        zone: "Hazmat",
      },
      {
        id: "pick-002-line-2",
        itemCode: "ART-102",
        itemName: "Energy Drink 500ml",
        quantity: 36,
        unit: "pcs",
        lotNumber: "LOT-2024-08A",
        expiryDate: "2024-09-15",
        locationCode: "C-01-01",
        zone: "Cold",
      },
    ],
  },
];

export function parseWmsLineMeta(notes?: string | null): WmsLineMeta | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as { wms?: WmsLineMeta };
    if (parsed?.wms) {
      return parsed.wms;
    }
  } catch {
    return null;
  }
  return null;
}

export function serializeWmsLineMeta(meta: WmsLineMeta): string | null {
  if (!meta.lotNumber && !meta.expiryDate && !meta.productionDate && !meta.binLocation) {
    return null;
  }
  return JSON.stringify({ wms: meta });
}

export function getLotTrackingMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(LOT_TRACKING_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, boolean>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function setLotTracking(itemId: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  const map = getLotTrackingMap();
  map[itemId] = enabled;
  window.localStorage.setItem(LOT_TRACKING_KEY, JSON.stringify(map));
}

export function isLotTracked(itemId?: string) {
  if (!itemId) return false;
  const map = getLotTrackingMap();
  return Boolean(map[itemId]);
}

export function getExpiryStatus(dateString: string, warningDays = 30) {
  const today = new Date();
  const expiry = new Date(dateString);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "expired";
  if (diffDays <= warningDays) return "expiring";
  return "ok";
}

export function sortLocationsByRoute<T extends { locationCode: string; zone?: string; expiryDate?: string }>(lines: T[]) {
  const parseCode = (code: string) => {
    const [aisle = "", rack = "0", position = "0"] = code.split("-");
    return {
      aisle,
      rack: Number(rack),
      position: Number(position),
    };
  };

  return [...lines].sort((a, b) => {
    if (a.zone && b.zone && a.zone !== b.zone) {
      return a.zone.localeCompare(b.zone);
    }
    const parsedA = parseCode(a.locationCode);
    const parsedB = parseCode(b.locationCode);
    if (parsedA.aisle !== parsedB.aisle) {
      return parsedA.aisle.localeCompare(parsedB.aisle);
    }
    if (parsedA.rack !== parsedB.rack) {
      return parsedA.rack - parsedB.rack;
    }
    if (parsedA.position !== parsedB.position) {
      return parsedA.position - parsedB.position;
    }
    if (a.expiryDate && b.expiryDate) {
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    }
    return 0;
  });
}
