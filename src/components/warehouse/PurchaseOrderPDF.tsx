import { format } from 'date-fns';

interface PurchaseOrderLine {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
  items?: {
    code: string;
    name: string;
  } | null;
}

interface PurchaseOrderData {
  order_number: string;
  order_date: string;
  expected_date?: string | null;
  status: string;
  total_value?: number | null;
  notes?: string | null;
  partners?: {
    name: string;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    email?: string | null;
    phone?: string | null;
    tax_id?: string | null;
  } | null;
  locations?: {
    name: string;
    address?: string | null;
  } | null;
  lines?: PurchaseOrderLine[];
}

interface PurchaseOrderPDFProps {
  order: PurchaseOrderData;
}

export function PurchaseOrderPDF({ order }: PurchaseOrderPDFProps) {
  return (
    <div className="print-container bg-white text-black p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PURCHASE ORDER</h1>
          <p className="text-lg text-gray-600 mt-1">Narudžbenica</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{order.order_number}</p>
          <p className="text-gray-600">
            Date: {format(new Date(order.order_date), 'dd.MM.yyyy')}
          </p>
          <p className="mt-2 inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 capitalize">
            {order.status}
          </p>
        </div>
      </div>

      {/* Supplier & Delivery Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Supplier / Dobavljač</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold text-gray-900">{order.partners?.name || 'N/A'}</p>
            {order.partners?.address && (
              <p className="text-gray-600">{order.partners.address}</p>
            )}
            {(order.partners?.postal_code || order.partners?.city) && (
              <p className="text-gray-600">
                {order.partners.postal_code} {order.partners.city}
              </p>
            )}
            {order.partners?.tax_id && (
              <p className="text-gray-600 mt-2">Tax ID: {order.partners.tax_id}</p>
            )}
            {order.partners?.email && (
              <p className="text-gray-600">Email: {order.partners.email}</p>
            )}
            {order.partners?.phone && (
              <p className="text-gray-600">Phone: {order.partners.phone}</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Delivery To / Isporuka na</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold text-gray-900">{order.locations?.name || 'N/A'}</p>
            {order.locations?.address && (
              <p className="text-gray-600">{order.locations.address}</p>
            )}
            {order.expected_date && (
              <p className="text-gray-600 mt-2">
                <span className="font-medium">Expected Delivery:</span>{' '}
                {format(new Date(order.expected_date), 'dd.MM.yyyy')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Order Lines Table */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Order Items / Stavke narudžbe</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">#</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Code</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Item Name</th>
              <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Qty</th>
              <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Unit Price</th>
              <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.lines?.map((line, index) => (
              <tr key={line.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-3 py-2 text-sm">{index + 1}</td>
                <td className="border border-gray-300 px-3 py-2 text-sm font-medium">{line.items?.code}</td>
                <td className="border border-gray-300 px-3 py-2 text-sm">{line.items?.name}</td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right">{line.quantity}</td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right">€{line.unit_price.toFixed(2)}</td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">€{line.total_price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={5} className="border border-gray-300 px-3 py-3 text-right text-sm">
                Total / Ukupno:
              </td>
              <td className="border border-gray-300 px-3 py-3 text-right text-base">
                €{(order.total_value || 0).toLocaleString('en', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes / Napomene</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">{order.notes}</p>
          </div>
        </div>
      )}

      {/* Footer / Signatures */}
      <div className="mt-12 pt-8 border-t">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-gray-500 mb-12">Authorized Signature / Potpis</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">Date / Datum: _______________</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-12">Stamp / Pečat</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">&nbsp;</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
        <p>Generated on {format(new Date(), 'dd.MM.yyyy HH:mm')} • {order.order_number}</p>
      </div>
    </div>
  );
}
