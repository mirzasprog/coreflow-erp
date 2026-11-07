# Prijedlog ispravki nakon audita ERP aplikacije

## Što je provjereno
Pregledani su prikazi, poveznice, poslovne operacije i veze između Financija, POS-a, Skladišta, Nabave, Proizvodnje, Pricinga, Hotela, E-commercea, HR-a, HSE-a, Osnovnih sredstava i chatbota. Ovo je pregled izvornog koda i spremljenih pravila baze, ne potvrda da je svaki poslovni postupak uspješno proveden uživo.

**Lovable Cloud baza trenutno je pauzirana.** Upit i pokušaj pripreme prijave nisu uspjeli. Nije moguće potvrditi stvarne duple zapise, aktivna pravila pristupa, instalirani dnevni raspored ni potpune poslovne tokove. Nisu mijenjani aplikacija ni poslovni podaci; ovaj dokument je prijedlog za odobrenje.

## 1. Prvo: pristup podacima i privatnost
- Odvojiti ovlasti javnih kupaca od zaposlenika ERP-a. Spremljena pravila dopuštaju prijavljenim kupcima pristup tuđim kupcima i narudžbama; hotelska pravila ne zahtijevaju ni prijavu. Testna široka prava nisu primjerena javnom web shopu.
- Za hotel, chatbot i HSE podsjetnike provjeravati prijavu i ovlasti prije čitanja ili mijenjanja podataka. Identitet za chatbot uzimati iz stvarne prijave, ne iz poslanog identifikatora.
- Hotelske pristupne ključeve ukloniti iz podataka dostupnih pregledniku; provjeriti treba li ih zamijeniti.
- Zaposleniku slati samo njegove zdravstvene podsjetnike, a zajednički pregled samo ovlaštenoj HSE osobi. Sada jedna poruka sadrži podatke više zaposlenika i šalje se svima.

## 2. Financije i POS: jednom izvršeno knjiženje i ispravan storno
- Stornirani GL zapis trenutno se isključuje iz izvještaja, a protuknjiženje ostaje: saldo može postati obrnut umjesto nula. Zadržati oba u obračunu uz jasan trag storniranja.
- Otkazivanje knjižene fakture sada mijenja samo status, bez poništenja pripadajućih GL/PDV stavki. Povezati otkazivanje s protuknjiženjem; plaćene fakture zaštititi dok se povezane uplate kontrolirano ne razriješe.
- Knjiženje fakture, evidentiranje uplate i zatvaranje POS smjene učiniti nedjeljivim operacijama koje se ne mogu ponoviti za isti poslovni događaj.
- Ukloniti odabir proizvoljnog konta kada nedostaje konfiguracija. Zaustaviti knjiženje i navesti što nedostaje; obavezno provjeriti duguje = potražuje.
- Bankovno usklađivanje povezati s jednom uplatom i njezinim GL zapisom. Sada zasebno mijenja plaćeni iznos pa ponovno povezivanje može udvostručiti uplatu.
- POS račun, stavke, razduženje robe i promet smjene spremati zajedno ili ništa.

## 3. Skladište: nacrt ne smije mijenjati poslovno stanje
- Knjiženje skladišnog dokumenta zaštititi od ponavljanja, istovremenih izmjena i djelomičnog transfera. Tip dokumenta provjeravati iz spremljenog dokumenta, ne prihvaćati ga od pozivatelja.
- Primka iz narudžbenice sada već pri spremanju nacrta povećava zaprimljenu količinu i može zatvoriti narudžbenicu. To premjestiti na knjiženje primke i vezati svaku stavku uz točnu stavku narudžbenice.
- Povezati komisioniranje s kontroliranim otpremanjem i zaprimanjem: završeno komisioniranje sada samo mijenja svoj status, a zaliha se mijenja zasebno.
- Provjeravati raspoloživu zalihu i dopuštene količine; ne prihvaćati prekoračenje komisionirane količine bez kontroliranog postupka.

## 4. Nabava i automatika: stvarno jedan izračun, bez novih duplih prijedloga
- Objediniti interaktivni AI izračun i dnevni generator. Trenutno postoje dvije implementacije s različitim pravilima uključivanja artikala.
- U raspoloživu buduću zalihu uključiti otvorene zahtjeve i transfere, ne samo narudžbenice. Postojeća zaštita prepoznaje samo današnje nacrte, pa sutra može ponovno predložiti istu potrebu.
- Ažurirati isti otvoreni prijedlog kroz stabilnu vezu na potrebu; korisnikove ručne korekcije sačuvati i odvojiti od novog preporučenog izračuna.
- Izvore robe ograničiti na istu kompaniju. Raspoloživu količinu centralnog skladišta raspodijeliti među objektima, umjesto da svaki objekt dobije istu punu količinu.
- Pretvaranje odobrenog zahtjeva u narudžbenicu zaštititi od ponavljanja i djelomičnog spremanja.
- Provjeriti postoji li dnevni raspored na aktivnoj bazi. U spremljenim migracijama nema njegove registracije; ako nedostaje, dodati ponovljivo postavljanje i pregled uspjeha/neuspjeha.
- Ujednačiti ambulantnu opskrbu kao nabavu ili transfer na lokaciju vozila. Planiranje dostavnih ruta ostaje zasebna funkcionalnost, ne prikazivati ga kao već izvedenu automatiku.

## 5. Proizvodnja: stvarne količine i vrijednost robe
- Utrošak materijala i proizvedenu količinu vezati uz radni nalog preko stvarne veze, ne tek napomene dokumenta.
- Proizvedena količina sada raste pri izradi nacrta primke, dok knjiženje izdatnice ne ažurira utrošak: prebaciti stvarne količine na knjiženje i ispravno ih poništavati kod storna.
- Dodati dosljedan obračun vrijednosti materijala i proizvoda. Sada se generiraju dokumenti s nultom vrijednošću, bez odgovarajućeg vrijednosnog knjiženja.

## 6. Promo cijene: po objektu i datumu, bez pogrešnog vraćanja
- Primjena promocije sada mijenja globalnu cijenu artikla; POS ne koristi odabrane lokacije ni cjenike.
- Uvesti jedinstveni izbor važeće cijene za artikl, lokaciju i vrijeme prodaje te ga koristiti u POS-u i ostalim prodajnim tokovima.
- Valjanost provjeravati pri prodaji, ne tek kada se otvori Pricing stranica.
- Za preklopljene promocije u istom objektu onemogućiti aktivaciju bez jasnog prioriteta; završetak jedne ne smije prepisati drugu.
- Ako nema druge važeće promocije, koristiti redovnu cijenu. Sačuvati zaključavanje aktivnih promocija i trag promjena.

## 7. Hotel: ukloniti izmišljene poslovne zapise
- Booking.com/Airbnb sinkronizacija trenutno stvara izmišljene rezervacije i nacrte faktura s novim identifikatorima pri svakom pozivu. Zaustaviti te upise i jasno označiti nepovezane kanale.
- Stvarnu integraciju uključiti tek uz raspoloživ pristup kanalu ili odgovarajući uvoz kalendara. Uvoz kalendara nije puna sinkronizacija cijena i raspoloživosti.
- Za stvarni uvoz dodati stabilnu vanjsku oznaku, mapiranje soba, provjeru zauzetosti, izmjene i otkazivanja bez ponovnog stvaranja zapisa. Uspjeh sinkronizacije prikazati samo kada je stvarno uspjela.
- Popraviti poveznicu „Nova rezervacija”, koja vodi na nepostojeću stranicu, i zamijeniti fiksnu nulu za održavanje stvarnim brojem soba.

## 8. Web shop: sigurna kupnja i dosljedni dokumenti
- Narudžbu i stavke spremati zajedno; cijene, PDV, popuste, dostavu i početni status računati i provjeravati na poslužiteljskoj strani. Sada se prihvaćaju vrijednosti koje šalje preglednik.
- Registriranog kupca povezati s narudžbom i blokadu stvarno provjeravati pri kupnji. Trenutno je blokada samo spremljena oznaka.
- Ispraviti sukob javnog checkouta/registracije s pravilima čitanja rezultata spremanja, bez otvaranja tuđih narudžbi javnosti.
- Za narudžbu vezati jednu odgovarajuću otpremnicu i fakturu, s provjerenim prijelazima i brojevima dokumenata.
- Dostavu i popuste prenijeti i na stavke fakture tako da zbroj stavki odgovara ukupnom iznosu.

## 9. Prikazi, dupliranja i chatbot
- Ukloniti stvarno trostruko registriranu stranicu uređivanja GL zapisa. Prečaci na istu nabavu iz Skladišta i Nabave nisu duplikati i ostaju.
- Grešku dohvaćanja podataka prikazati kao „Podaci nisu dostupni”, ne kao nulu ili „Sve uredno”. To osobito vrijedi za financijske pokazatelje i HSE upozorenja.
- Nedostupne postavke jasno onemogućiti umjesto prikazivanja gumba koji ništa ne rade; ne dodavati nove funkcionalnosti postavki u ovaj paket.
- Nakon prijave vratiti korisnika na dokument koji je prethodno pokušao otvoriti.
- Chatbotu davati potpune, ovlaštene agregate i prijaviti nedostupne podatke. Trenutno vrijednost prvih 500 zapisa može predstaviti kao ukupnu zalihu. Provjeriti dostupnost AI usluge nakon aktivacije baze; prijašnji manjak kredita nije potvrđen kao trenutačno stanje.

## Predloženi redoslijed
1. Aktivacija baze i provjera stvarno postavljenih pravila; sigurnost javnog pristupa i zaustavljanje lažnog hotel uvoza.
2. Financije/POS, skladište i proizvodnja: pouzdano knjiženje i storno.
3. Jedinstvena nabava/automatika i lokacijske promo cijene.
4. Web shop, stvarni hotel uvoz kada postoje pristupi, te prikazi/chatbot.

Nijedan postojeći poslovni zapis ne brisati automatski. Moguće duple dokumente prvo popisati s njihovim vezama i ponuditi odvojen, kontroliran plan razrješenja.

## Tehnički dokazi i način provjere
Nalazi su potvrđeni u izvoru; stvarno postavljena baza može odstupati:
- Financije/POS: `src/hooks/useGLEntries.ts:309–345`, `useInvoices.ts:233–450,490–620`, `useBankReconciliation.ts:256–347`, `usePOS.ts:374–444,629–804`.
- Skladište/proizvodnja: `src/hooks/useWarehouseDocuments.ts:478–759,825–843`, `src/pages/warehouse/GoodsReceiptFromPO.tsx:171–239`, `src/hooks/useProduction.ts:330–399`, `usePickingOrders.ts:250–305`.
- Nabava: `src/hooks/useReorderRecommendations.ts:263–318`, `src/hooks/usePurchaseRequests.ts:162–218`, `supabase/functions/auto-replenishment/index.ts:59–72,163–292`.
- Cijene: `src/hooks/usePriceManagement.ts:232–289,344–449`, `src/hooks/usePOS.ts:79–111`.
- Hotel/chatbot/HSE: `supabase/functions/hotel-channel-sync/index.ts:29–147`, `management-chat/index.ts:15–123,650–653`, `send-hse-reminders/index.ts:71–161` i odgovarajuća spremljena pravila pristupa.
- E-commerce: `src/hooks/useEcommerce.ts:102–145,181–321`, `useEcommerceCustomers.ts:87–105`, `src/pages/ecommerce/Storefront.tsx:50–92` i migracije `20260502…` / `20260504…`.
- Prikazi: `src/App.tsx:173–179,218–222`, `src/hooks/useDashboardStats.ts:28–146`, `src/pages/hotel/HotelIndex.tsx:30–32,150–155`, `src/pages/settings/SettingsIndex.tsx:30–68`.

Implementaciju poslovnih promjena provesti kroz transakcijske operacije, zaključavanje, jedinstvene veze na izvor i provjeru stanja. Dodati male automatizirane testove za konkretna pravila: nacrt ne mijenja stanje, dvostruki poziv ne knjiži dvaput, storno daje nulti neto učinak, kupac ne vidi tuđe podatke, blokirani kupac ne može naručiti, promo ne utječe na drugi objekt, prijedlozi ne prelaze raspoloživu zalihu. Zatim proći stvarne tokove s odobrenim testnim podacima u aktivnoj bazi i provjeriti rezultat u prikazima.

**Za odobrenje:** odobriti cijeli paket ili označiti brojeve skupina koje želite prvo; implementacija počinje tek nakon odobrenja.
