export default function Scoreboard({ scoreboard, highlight }) {
  if (!scoreboard || scoreboard.length === 0) return null;

  return (
    <div className="bg-card-black border border-card-border rounded-2xl p-4">
      <h3 className="text-lg font-secular mb-3 text-center">ניקוד</h3>
      <div className="flex flex-col gap-1.5">
        {scoreboard.map((entry, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
          const isHighlighted = highlight && entry.id === highlight;

          return (
            <div
              key={entry.id || index}
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                isHighlighted ? 'bg-gold/20 border border-gold/30' : 'bg-bg'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm min-w-[24px]">{medal || `${index + 1}.`}</span>
                <span className={`font-medium ${isHighlighted ? 'text-gold' : 'text-white'}`}>
                  {entry.name}
                </span>
              </div>
              <span className={`font-bold ${isHighlighted ? 'text-gold' : 'text-muted'}`}>
                {entry.score} נק׳
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
