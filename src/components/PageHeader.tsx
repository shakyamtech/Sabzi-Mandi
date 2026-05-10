export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4 md:mb-6">
    <div className="min-w-0">
      <h1 className="font-display text-2xl md:text-3xl text-foreground truncate">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-xs md:text-sm mt-0.5 line-clamp-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
  </div>
);
