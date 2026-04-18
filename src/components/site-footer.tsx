export function SiteFooter() {
  return (
    <footer className="border-t border-black/8 bg-[#111111]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-neutral-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="font-medium text-white">
            MVP ticketing pentru Stadionul Municipal Orhei
          </p>
          <p>
            Experienta construita pentru bilete gratuite acum si pentru scalare spre
            fluxuri comerciale ulterior.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-neutral-300">
          <span>QR validare</span>
          <span>PDF printabil</span>
          <span>Moderare abuz</span>
          <span>Supabase RLS</span>
        </div>
      </div>
    </footer>
  );
}
