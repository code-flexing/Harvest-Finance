import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 bg-gray-50 text-center">
      <h1 className="text-xl font-bold text-gray-900">Sin conexión</h1>
      <p className="text-gray-600 max-w-md text-sm">
        No hay red. Las páginas que ya visitaste y los datos guardados en el
        dispositivo siguen disponibles.
      </p>
      <Link
        href="/dashboard"
        className="text-harvest-green-700 font-semibold underline min-h-[44px] inline-flex items-center"
      >
        Ir al panel
      </Link>
    </div>
  );
}
