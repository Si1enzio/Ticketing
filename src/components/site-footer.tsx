export function SiteFooter() {
  return (
    <footer className="border-t border-[#d5a021]/15 bg-[#08140f]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-white/60 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="font-medium text-white/80">
            MVP ticketing pentru Stadionul Municipal „Orhei”
          </p>
          <p>
            Arhitectură pregătită pentru bilete gratuite acum și plăți ulterior.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <span>QR validare</span>
          <span>PDF printabil</span>
          <span>Moderare abuz</span>
          <span>Supabase RLS</span>
        </div>
      </div>
    </footer>
  );
}

