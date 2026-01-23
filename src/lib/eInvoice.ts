// E-Fakture Generator for Bosnia and Herzegovina
// Supports UBL 2.1 XML format for CPF (Centralna Platforma za Fiskalizaciju)
// ESET compliance ready

export interface EInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  seller: {
    name: string;
    taxId: string; // JIB (13 digits)
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  buyer: {
    name: string;
    taxId: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatAmount: number;
    lineTotal: number;
  }[];
  totals: {
    subtotal: number;
    vatAmount: number;
    total: number;
  };
  currency: string;
  note?: string;
}

export interface DeliveryNoteData {
  documentNumber: string;
  documentDate: string;
  sender: {
    name: string;
    taxId: string;
    address: string;
  };
  receiver: {
    name: string;
    taxId: string;
    address: string;
  };
  lines: {
    itemCode: string;
    description: string;
    quantity: number;
    unit: string;
  }[];
}

// Generate UBL 2.1 Invoice XML
export function generateUBLInvoiceXML(data: EInvoiceData): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>${escapeXml(data.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${data.invoiceDate}</cbc:IssueDate>
  <cbc:DueDate>${data.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${data.currency}</cbc:DocumentCurrencyCode>
  ${data.note ? `<cbc:Note>${escapeXml(data.note)}</cbc:Note>` : ''}
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.seller.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.seller.address)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.seller.city)}</cbc:CityName>
        <cbc:PostalZone>${data.seller.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${data.seller.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${data.seller.taxId}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.buyer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.buyer.address)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.buyer.city)}</cbc:CityName>
        <cbc:PostalZone>${data.buyer.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${data.buyer.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${data.buyer.taxId}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${data.currency}">${data.totals.vatAmount.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${data.currency}">${data.totals.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${data.currency}">${data.totals.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${data.currency}">${data.totals.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${data.currency}">${data.totals.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
${data.lines.map((line, index) => `  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${data.currency}">${line.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${escapeXml(line.description)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${data.currency}">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`).join('\n')}
</Invoice>`;

  return xml;
}

// Generate Delivery Note XML (Otpremnica)
export function generateDeliveryNoteXML(data: DeliveryNoteData): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"
                xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>${escapeXml(data.documentNumber)}</cbc:ID>
  <cbc:IssueDate>${data.documentDate}</cbc:IssueDate>
  
  <cac:DespatchSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.sender.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${data.sender.taxId}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:DespatchSupplierParty>
  
  <cac:DeliveryCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.receiver.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${data.receiver.taxId}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:DeliveryCustomerParty>
  
${data.lines.map((line, index) => `  <cac:DespatchLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:DeliveredQuantity unitCode="${line.unit}">${line.quantity}</cbc:DeliveredQuantity>
    <cac:Item>
      <cbc:Name>${escapeXml(line.description)}</cbc:Name>
      <cac:SellersItemIdentification>
        <cbc:ID>${escapeXml(line.itemCode)}</cbc:ID>
      </cac:SellersItemIdentification>
    </cac:Item>
  </cac:DespatchLine>`).join('\n')}
</DespatchAdvice>`;

  return xml;
}

// ESET Fiscalization Request structure
export interface ESETFiscalRequest {
  receiptNumber: string;
  receiptDate: string;
  operatorCode: string;
  businessUnitCode: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    vatCategory: 'A' | 'E' | 'J' | 'K' | 'M'; // BiH VAT categories
    total: number;
  }[];
  paymentType: 'CASH' | 'CARD' | 'TRANSFER';
  totalAmount: number;
}

// Generate ESET fiscal receipt XML
export function generateESETReceiptXML(data: ESETFiscalRequest): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<FiscalReceipt>
  <Header>
    <ReceiptNumber>${data.receiptNumber}</ReceiptNumber>
    <DateTime>${data.receiptDate}</DateTime>
    <OperatorCode>${data.operatorCode}</OperatorCode>
    <BusinessUnitCode>${data.businessUnitCode}</BusinessUnitCode>
  </Header>
  <Items>
${data.items.map((item, i) => `    <Item>
      <LineNumber>${i + 1}</LineNumber>
      <Name>${escapeXml(item.name)}</Name>
      <Quantity>${item.quantity}</Quantity>
      <UnitPrice>${item.unitPrice.toFixed(2)}</UnitPrice>
      <VATCategory>${item.vatCategory}</VATCategory>
      <Total>${item.total.toFixed(2)}</Total>
    </Item>`).join('\n')}
  </Items>
  <Payment>
    <Type>${data.paymentType}</Type>
    <Amount>${data.totalAmount.toFixed(2)}</Amount>
  </Payment>
</FiscalReceipt>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Download XML file
export function downloadXML(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
