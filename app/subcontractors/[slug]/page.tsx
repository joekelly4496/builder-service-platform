import { db } from "@/lib/db";
import { subcontractors, reviews } from "@/lib/db/schema";
import { eq, and, desc, avg, count } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const tradeLabels: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  roofing: "Roofing",
  flooring: "Flooring",
  painting: "Painting",
  landscaping: "Landscaping",
  drywall: "Drywall",
  carpentry: "Carpentry",
  general: "General",
};

interface PricingRange {
  trade: string;
  min: number;
  max: number;
}

export default async function SubcontractorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [sub] = await db
    .select()
    .from(subcontractors)
    .where(eq(subcontractors.slug, slug))
    .limit(1);

  if (!sub || sub.status !== "active") {
    notFound();
  }

  // Fetch reviews
  const reviewList = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.subcontractorId, sub.id),
        eq(reviews.isPublic, true)
      )
    )
    .orderBy(desc(reviews.createdAt))
    .limit(20);

  const [reviewStats] = await db
    .select({
      avgRating: avg(reviews.rating),
      totalCount: count(),
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.subcontractorId, sub.id),
        eq(reviews.isPublic, true)
      )
    );

  const avgRating = reviewStats?.avgRating ? parseFloat(String(reviewStats.avgRating)) : 0;
  const totalReviews = Number(reviewStats?.totalCount ?? 0);

  const trades = (sub.tradeCategories as string[]) ?? [];
  const pricing = (sub.pricingRanges as PricingRange[]) ?? [];
  const hasLicense = !!sub.licenseNumber;
  const hasInsurance =
    !!sub.insuranceExpiresAt &&
    new Date(sub.insuranceExpiresAt) > new Date();
  const isVerified = sub.isVerified && hasLicense && hasInsurance;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-bold">
              {sub.companyName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{sub.companyName}</h1>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 bg-emerald-400/20 text-emerald-100 px-3 py-1 rounded-full text-sm font-semibold border border-emerald-400/30">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              <p className="text-purple-200 font-medium mt-1">
                {sub.contactName}
              </p>
              {totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-yellow-300 text-lg">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} style={{ color: s <= Math.round(avgRating) ? "#fbbf24" : "#ffffff40" }}>★</span>
                    ))}
                  </span>
                  <span className="text-purple-200 text-sm font-semibold">
                    {avgRating.toFixed(1)} ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
              {sub.serviceArea && (
                <p className="text-purple-200/80 text-sm mt-1">
                  Service Area: {sub.serviceArea}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Trade Categories */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Trades</h2>
          <div className="flex flex-wrap gap-2">
            {trades.map((trade) => (
              <span
                key={trade}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-semibold"
              >
                {tradeLabels[trade] ?? trade}
              </span>
            ))}
          </div>
        </div>

        {/* Bio */}
        {sub.bio && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">About</h2>
            <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
              {sub.bio}
            </p>
          </div>
        )}

        {/* Credentials */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Credentials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  hasLicense
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">License</p>
                <p className="text-xs font-medium text-slate-500">
                  {hasLicense
                    ? `#${sub.licenseNumber}`
                    : "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  hasInsurance
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Insurance</p>
                <p className="text-xs font-medium text-slate-500">
                  {hasInsurance
                    ? `Valid through ${new Date(
                        sub.insuranceExpiresAt!
                      ).toLocaleDateString()}`
                    : "Not provided"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Ranges */}
        {pricing.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Pricing Ranges
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pricing.map((p) => (
                <div
                  key={p.trade}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    {tradeLabels[p.trade] ?? p.trade}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    ${p.min.toLocaleString()} — ${p.max.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviewList.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Reviews ({totalReviews})
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-lg">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} style={{ color: s <= Math.round(avgRating) ? "#f59e0b" : "#e5e7eb" }}>★</span>
                  ))}
                </span>
                <span className="text-slate-600 font-semibold text-sm">
                  {avgRating.toFixed(1)} avg
                </span>
              </div>
            </div>
            <div className="space-y-4">
              {reviewList.map((review) => (
                <div key={review.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {review.reviewerName}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-200 text-slate-600">
                        {review.reviewerType}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-yellow-500 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} style={{ color: s <= review.rating ? "#f59e0b" : "#e5e7eb" }}>★</span>
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-slate-700 font-medium mt-1">
                      {review.comment}
                    </p>
                  )}
                  {review.tradeCategory && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-semibold">
                      {tradeLabels[review.tradeCategory] ?? review.tradeCategory}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Contact</h2>
          <div className="space-y-2">
            {sub.email && (
              <p className="text-sm font-medium text-slate-700">
                <span className="text-slate-500">Email:</span>{" "}
                <a
                  href={`mailto:${sub.email}`}
                  className="text-purple-600 hover:underline"
                >
                  {sub.email}
                </a>
              </p>
            )}
            {sub.phone && (
              <p className="text-sm font-medium text-slate-700">
                <span className="text-slate-500">Phone:</span>{" "}
                <a
                  href={`tel:${sub.phone}`}
                  className="text-purple-600 hover:underline"
                >
                  {sub.phone}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
