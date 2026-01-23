import { useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkOrderView() {
  const { id } = useParams();

  return (
    <div>
      <Header title={`Radni nalog #${id}`} subtitle="Detalji proizvodnog naloga" />

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalji radnog naloga</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Radni nalog nije pronađen.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
