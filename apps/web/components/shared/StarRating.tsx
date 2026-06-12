import { Star } from 'lucide-react';

export function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted-foreground'
          }`}
        />
      ))}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground ml-0.5">({count})</span>
      )}
    </div>
  );
}
