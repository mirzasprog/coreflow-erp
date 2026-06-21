
# Unified Replenishment Cockpit

Cilj: jedan ekran koji pokriva cijeli ciklus opskrbe — nabavka od dobavljača, interni transferi iz centralnog skladišta u prodavaonice, te ambulantna dostava. AI engine (već postoji) automatski raspoređuje svaku potrebu u ispravan tok.

## 1. Klasifikacija artikala (DB izmjene)

Dodati na `items` tabelu:
- `replenishment_source` ENUM: `supplier` (naručuje se od dobavljača), `central_warehouse` (vuče se iz centralnog skladišta), `auto` (sistem odlučuje – default).
- `central_warehouse_location_id` UUID (referenca na lokaciju koja služi kao matično skladište za taj artikal).

Dodati na `locations`:
- `location_type` ENUM: `warehouse`, `store`, `mobile` (ambulanta).
- `is_central` BOOLEAN – označava centralno skladište.

## 2. Logika rutiranja potreba

Za svaku stavku ispod min stanja AI engine donosi odluku:

```text
ako je location.type = store/mobile:
  ako item.replenishment_source = central_warehouse
     i centralno skladište ima zalihe → kreiraj TRANSFER
  inače → kreiraj PURCHASE REQUEST za dobavljača
ako je location.type = warehouse (centralno):
  → uvijek PURCHASE REQUEST za dobavljača
```

Ambulantna vozila (`mobile`) se tretiraju kao mini-skladišta: artikli koji idu „od dobavljača direktno na vozilo" → PR; artikli iz palete centralnog skladišta → transfer.

## 3. Automatski dnevni cron

`pg_cron` job 06:00 svaki dan poziva edge function `auto-replenishment`:
1. Učita sve aktivne lokacije.
2. Za svaku pokreće postojeći AI reorder algoritam.
3. Razvrstava prijedloge na: PO drafts (po dobavljaču) i Transfer drafts (po izvornom skladištu).
4. Kreira draft dokumente (status `draft`) i šalje notifikaciju nadležnima.

Korisnik ujutro otvori cockpit i samo potvrdi/koriguje.

## 4. Replenishment Cockpit UI

Nova stranica `/procurement/cockpit` (link iz Procurement i Warehouse indexa):

```text
+---------------------------------------------------+
| Replenishment Cockpit – 21.06.2026                |
+---------------------------------------------------+
| TAB 1: Nabavka od dobavljača (12 prijedloga)      |
|   grupisano po dobavljaču → dugme „Kreiraj PO"    |
+---------------------------------------------------+
| TAB 2: Transferi iz centralnog skladišta (8)      |
|   grupisano po odredišnoj lokaciji                |
|   dugme „Kreiraj transfer"                        |
+---------------------------------------------------+
| TAB 3: Ambulantna dostava (5)                     |
|   prikaz po vozilu/ruti                           |
+---------------------------------------------------+
| Filter: lokacija, urgency, kategorija             |
| Audit: zadnje pokretanje crona, ko je odobrio     |
+---------------------------------------------------+
```

Svaka stavka pokazuje: trenutno stanje, min/max, AI preporuku, izvor (transfer/dobavljač), urgency badge i polje za korekciju količine.

## 5. Auto-flow nakon odobrenja

- PO drafts → već postojeći flow (email Resend → primka → invoice).
- Transfer drafts → automatski generišu picking nalog na centralnom skladištu (već postoji „Goods Issue → Picking" automatika), nakon picka se kreira primka na odredišnoj lokaciji.
- Ambulanta → ako je iz centralnog: transfer na `mobile` lokaciju vozila; ako je od dobavljača: PO sa direktnom dostavom na rutu (delivery_address na PO).

## 6. Izmjene u postojećim ekranima

- `PurchaseRequests.tsx` i `PurchaseOrderForm.tsx`: AI dugme već postoji – proširiti da poštuje `replenishment_source` (preskače artikle označene kao `central_warehouse`).
- `TransferForm.tsx`: dodati AI dugme „Predloži transfer" koje koristi isti engine.
- `WarehouseIndex` i `ProcurementIndex`: nova kartica „Replenishment Cockpit".
- `ItemsList`: kolone za `replenishment_source` i centralno skladište (ured. u modal-u artikla).

## 7. Tehnička implementacija (redoslijed)

1. Migracija – kolone `replenishment_source`, `central_warehouse_location_id`, `location_type`, `is_central`.
2. Proširiti `useReorderRecommendations` da vraća `routing: 'supplier' | 'transfer'` po stavci.
3. Nova edge function `auto-replenishment` + pg_cron schedule.
4. UI – `ReplenishmentCockpit.tsx` sa 3 taba.
5. Akcioni handler-i: bulk create PO / Transfer iz cockpita.
6. Update `ItemForm` i `LocationForm` za nova polja.
7. Linkovi iz Procurement i Warehouse indexa.

## 8. Što ostaje ručno

- Ambulantne rute (koje vozilo ide gdje) – pretpostavka da je vozilo = lokacija tipa `mobile`.
- Korisnik uvijek može korigovati količine prije potvrde.
- Početna klasifikacija artikala (`supplier` / `central_warehouse`) – default `auto`, korisnik mijenja po potrebi.

Potvrdi planom da krenem s migracijom i implementacijom redom 1→7.
