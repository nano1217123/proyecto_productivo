
import ReviewsPage from "@/src/features/reviews/views/ReviewsPage";

export const metadata = { title: "Reseñas" };

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <ReviewsPage gym={typeof gym === "string" ? gym : undefined} />;
}
