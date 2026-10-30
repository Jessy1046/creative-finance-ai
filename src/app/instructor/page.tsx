import { Card, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Panel del Instructor" };

const PLANNED = [
  "Crear y editar cursos, módulos y lecciones",
  "Publicar casos de práctica y retos para la comunidad",
  "Configurar ejemplos, tareas y reglas de evaluación",
  "Actualizar parámetros (supuestos de mercado por defecto)",
  "Consultar estadísticas educativas agregadas",
  "Administrar acceso por rol: administrador, instructor, estudiante, analista, invitado",
  "Administrar fuentes y advertencias legales",
];

export default function InstructorPage() {
  return (
    <>
      <PageHeader eyebrow="Panel del Instructor" title="Herramientas para los Hermanitos Cruz" description="Este módulo requiere autenticación, roles y base de datos, que forman parte de la fase 2." />
      <Notice tone="warning" title="Aún no disponible">
        Esta pantalla no tiene funciones activas todavía. El esquema de datos (usuarios, roles, cursos, lecciones, casos, progreso y auditoría) ya está definido en <code>prisma/schema.prisma</code> para conectarlo a PostgreSQL.
      </Notice>
      <Card className="mt-4" title="Lo que incluirá">
        <ul className="list-disc space-y-1 pl-5 text-sm">{PLANNED.map((p) => <li key={p}>{p}</li>)}</ul>
      </Card>
      <p className="mt-4 text-[13px] text-muted">Mientras tanto, el contenido educativo vive en <code>src/domain/academy/</code> y los casos en <code>src/domain/academy/cases.ts</code>.</p>
    </>
  );
}
