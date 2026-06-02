import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            {stat.trend && (
              <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {stat.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(stat.trend)}%
              </div>
            )}
          </div>
          <div className="text-2xl font-bold mb-1">{stat.value}</div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}