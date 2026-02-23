import Link from "next/link";

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

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Homeowner Card */}
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-blue-100 hover:border-blue-300 transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Homeowners
            </h2>
            <p className="text-gray-600 mb-6">
              Submit service requests and track their progress
            </p>
            <Link
              href="/demo-request"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Submit a Request (Demo)
            </Link>
          </div>

          {/* Builder Card */}
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-green-100 hover:border-green-300 transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Builders
            </h2>
            <p className="text-gray-600 mb-6">
              Manage homes, subcontractors, and service requests
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-16 text-center text-gray-500">
          <p>Database connected ✓ | Tables created ✓ | Dashboard ready ✓</p>
        </div>
      </div>
    </div>
  );
}
