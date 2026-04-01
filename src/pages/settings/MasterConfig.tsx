import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LegalAreasTab } from '@/components/master-config/LegalAreasTab';
import { SpecialtiesTab } from '@/components/master-config/SpecialtiesTab';
import { GlobalRulesTab } from '@/components/master-config/GlobalRulesTab';
import { LawfirmCommissionsTab } from '@/components/master-config/LawfirmCommissionsTab';

export default function MasterConfig() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración Maestra</h1>
        <p className="text-muted-foreground text-sm">
          Fuente única de verdad para áreas legales, especialidades, reglas y comisiones.
        </p>
      </div>

      <Tabs defaultValue="areas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="areas">Áreas Legales</TabsTrigger>
          <TabsTrigger value="specialties">Especialidades</TabsTrigger>
          <TabsTrigger value="rules">Reglas Globales</TabsTrigger>
          <TabsTrigger value="commissions">Comisiones</TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="mt-4">
          <LegalAreasTab />
        </TabsContent>
        <TabsContent value="specialties" className="mt-4">
          <SpecialtiesTab />
        </TabsContent>
        <TabsContent value="rules" className="mt-4">
          <GlobalRulesTab />
        </TabsContent>
        <TabsContent value="commissions" className="mt-4">
          <LawfirmCommissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
