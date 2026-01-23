import { useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrderView() {
  const { id } = useParams();

  return (
    <div>
      <Header title={`Narudžba #${id}`} subtitle="Detalji online narudžbe" />

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalji narudžbe</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Narudžba nije pronađena.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
