export default function BlackCard({ card, winningTexts }) {
  if (!card) return null;

  // If we have winning texts, replace blanks with golden text
  let display = card.text;
  if (winningTexts && winningTexts.length > 0) {
    let idx = 0;
    display = card.text.replace(/______/g, () => {
      const replacement = winningTexts[idx] || '______';
      idx++;
      return `«${replacement}»`;
    });
  }

  return (
    <div className="card-black">
      {winningTexts ? (
        <p>
          {display.split(/«|»/).map((part, i) =>
            i % 2 === 1 ? (
              <span key={i} className="golden-text">{part}</span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      ) : (
        <p>{card.text}</p>
      )}
      {card.pick === 2 && !winningTexts && (
        <div className="mt-3 flex items-center gap-2">
          <span className="bg-gold text-card-black text-xs font-bold px-2 py-0.5 rounded-md">
            בחר 2
          </span>
        </div>
      )}
    </div>
  );
}
