export default function WhiteCard({ text, selected, selectionOrder, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`card-white relative ${selected ? 'selected' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <p>{text}</p>
      {selected && selectionOrder != null && (
        <span className="absolute top-1 left-1 bg-gold text-card-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {selectionOrder + 1}
        </span>
      )}
    </div>
  );
}
