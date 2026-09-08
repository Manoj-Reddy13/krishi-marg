export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: string;
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div className="stat-info">
        <span>{title}</span>
        <strong>{value}</strong>

        {subtitle && (
          <small>{subtitle}</small>
        )}

        {trend && (
          <div className="stat-trend">
            {trend}
          </div>
        )}
      </div>

    </div>
  );
}