// "Featured on Product Hunt" badge, shown once the launch post exists. Set NEXT_PUBLIC_PRODUCTHUNT_POST_ID
// and NEXT_PUBLIC_PRODUCTHUNT_URL (both from the badge page Product Hunt gives the maker after posting).
const POST_ID = process.env.NEXT_PUBLIC_PRODUCTHUNT_POST_ID;
const URL = process.env.NEXT_PUBLIC_PRODUCTHUNT_URL;

export function ProductHuntBadge() {
  if (!POST_ID || !URL) return null;
  return (
    <a href={URL} target="_blank" rel="noopener" className="inline-block" aria-label="Sthiva on Product Hunt">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${POST_ID}&theme=dark`}
        alt="Sthiva - Featured on Product Hunt"
        width={250}
        height={54}
        loading="lazy"
      />
    </a>
  );
}
