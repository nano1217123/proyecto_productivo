
import ReviewsPage from "@/features/reviews/views/ReviewsPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <ReviewsPage gym={gym} />;
}
