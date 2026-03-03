import Link from "next/link";

export const revalidate = 0;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Construction Service Platform
          </h1>
          <p className="text-xl text-gray-600">
            Streamline your service requests and callbacks
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {/* Homeowner Card */}
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-blue-100 hover:border-blue-300 transition-colors flex flex-col">
            <div className="text-4xl mb-4">🏠</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Homeowners
            </h2>
            <p className="text-gray-600 mb-6 flex-1">
              Log in to view your service requests, track progress, approve schedules, and message your builder.
            </p>
            <div className="space-y-3">
              <Link
                href="/homeowner/login"
                className="block text-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Homeowner Portal
              </Link>
              <Link
                href="/demo-request"
                className="block text-center border-2 border-blue-200 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
              >
                Submit a Request (Demo)
              </Link>
            </div>
          </div>

          {/* Builder Card */}
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-green-100 hover:border-green-300 transition-colors flex flex-col">
            <div className="text-4xl mb-4">🏗️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Builders
            </h2>
            <p className="text-gray-600 mb-6 flex-1">
              Manage homes, subcontractors, and service requests all in one place.
            </p>
            <Link
              href="/dashboard"
              className="block text-center bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Builder Dashboard
            </Link>
          </div>

          {/* Subcontractor Card */}
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-purple-100 hover:border-purple-300 transition-colors flex flex-col">
            <div className="text-4xl mb-4">🔧</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Subcontractors
            </h2>
            <p className="text-gray-600 mb-6 flex-1">
              View your assigned service requests, update statuses, and upload completion photos.
            </p>
            <div className="block text-center bg-purple-200 text-purple-400 px-6 py-3 rounded-lg font-semibold cursor-not-allowed">
              Coming Soon
            </div>
          </div>
        </div>

        <div className="mt-16 text-center text-gray-500">
          <p>Database connected ✓ | Tables created ✓ | Dashboard ready ✓</p>
        </div>
      </div>
    </div>
  );
}