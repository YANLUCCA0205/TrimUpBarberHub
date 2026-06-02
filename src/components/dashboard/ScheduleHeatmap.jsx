const HOURS = ["08","09","10","11","12","13","14","15","16","17","18","19","20"];
const DAYS = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const DAY_MAP = [1,2,3,4,5,6,0]; // Mon=1...Sun=0

function getIntensityClass(count) {
  if (count === 0) return "bg-muted/20 text-muted-foreground/20";
  if (count === 1) return "bg-primary/15 text-primary/50";
  if (count === 2) return "bg-primary/30 text-primary/70";
  if (count === 3) return "bg-primary/50 text-primary";
  if (count === 4) return "bg-primary/70 text-primary";
  return "bg-primary text-primary-foreground";
}

export default function ScheduleHeatmap({ appointments = [] }) {
  // Build a grid: day x hour => count of appointments
  const grid = {};
  DAYS.forEach((_, di) => {
    HOURS.forEach(h => {
      grid[`${di}-${h}`] = 0;
    });
  });

  appointments.forEach(a => {
    if (!a.date || !a.time || ["cancelado"].includes(a.status)) return;
    const d = new Date(a.date + "T12:00");
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon...
    const dayIdx = DAY_MAP.indexOf(dayOfWeek);
    if (dayIdx === -1) return;
    const hour = a.time.slice(0, 2);
    const key = `${dayIdx}-${hour}`;
    if (grid[key] !== undefined) grid[key]++;
  });

  const maxCount = Math.max(...Object.values(grid), 1);

  // Find peak hour and day
  let peakKey = "";
  let peakVal = 0;
  Object.entries(grid).forEach(([k, v]) => { if (v > peakVal) { peakVal = v; peakKey = k; } });
  const [peakDayIdx, peakHour] = peakKey.split("-");
  const peakDay = DAYS[parseInt(peakDayIdx)];

  // Find idle slots (0 count during business hours)
  const idleSlots = Object.values(grid).filter(v => v === 0).length;
  const totalSlots = DAYS.length * HOURS.length;
  const occupancyRate = Math.round(((totalSlots - idleSlots) / totalSlots) * 100);

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Heatmap de Horários</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted/20" /> Vazio
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/40" /> Médio
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary" /> Pico
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header */}
          <div className="flex gap-1 mb-1">
            <div className="w-8" />
            {DAYS.map(d => (
              <div key={d} className="flex-1 text-center text-[10px] font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>
          {/* Grid */}
          {HOURS.map(h => (
            <div key={h} className="flex gap-1 mb-1 items-center">
              <div className="w-8 text-[10px] text-muted-foreground text-right pr-1">{h}h</div>
              {DAYS.map((_, di) => {
                const count = grid[`${di}-${h}`];
                return (
                  <div
                    key={di}
                    className={`flex-1 h-6 rounded text-[10px] font-medium flex items-center justify-center transition-all cursor-default ${getIntensityClass(count)}`}
                    title={`${DAYS[di]} ${h}h — ${count} agendamento(s)`}
                  >
                    {count > 0 ? count : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/30">
        <div className="text-center">
          <p className="text-lg font-bold text-primary">{peakVal > 0 ? `${peakDay} ${peakHour}h` : "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pico de movimento</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{occupancyRate}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Taxa de ocupação</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-400">{idleSlots}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Slots ociosos</p>
        </div>
      </div>
    </div>
  );
}