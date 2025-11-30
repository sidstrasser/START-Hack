"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ExtractedData, FormDataInput } from "@/lib/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorAlert } from "@/components/ErrorAlert";

export default function NegotiationInput() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [hasExtractedData, setHasExtractedData] = useState(false);

  // Form fields matching FormDataInput
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productType, setProductType] = useState<"software" | "hardware" | "service">("software");
  const [offerPrice, setOfferPrice] = useState("");
  const [pricingModel, setPricingModel] = useState<"yearly" | "monthly" | "one-time">("yearly");
  const [maxPrice, setMaxPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [valueAssessment, setValueAssessment] = useState<"urgent" | "high_impact" | "medium_impact" | "low_impact">("medium_impact");

  useEffect(() => {
    // Load extracted data if available
    const storedDocId = sessionStorage.getItem("documentId");
    const storedData = sessionStorage.getItem("extractedData");

    if (storedDocId) {
      setDocumentId(storedDocId);
    }

    if (storedData) {
      try {
        const data: ExtractedData = JSON.parse(storedData);

        // Pre-fill form with extracted data
        setSupplierName(data.supplier_name || "");
        setSupplierContact(data.supplier_contact || "");
        setProductDescription(data.product_description || "");
        setProductType(data.product_type || "software");
        setOfferPrice(data.offer_price || "");
        setPricingModel(data.pricing_model || "yearly");
        setMaxPrice(data.max_price || "");
        setTargetPrice(data.target_price || "");
        setValueAssessment(data.value_assessment || "medium_impact");

        setHasExtractedData(true);
      } catch (e) {
        console.error("Failed to parse extracted data:", e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentId) {
      setError("No document uploaded. Please upload a document first or go back.");
      return;
    }

    if (!supplierName || !productDescription || !offerPrice || !targetPrice || !maxPrice) {
      setError("Please fill in all required fields (marked with *)");
      return;
    }

    setLoading(true);
    setError(null);

    // Build form_data matching FormDataInput
    const formData: FormDataInput = {
      supplier_name: supplierName,
      supplier_contact: supplierContact || null,
      product_description: productDescription,
      product_type: productType,
      offer_price: offerPrice,
      pricing_model: pricingModel,
      max_price: maxPrice,
      target_price: targetPrice,
      value_assessment: valueAssessment,
    };

    try {
      const response = await api.generateBriefing({
        document_id: documentId,
        form_data: formData,
      });

      // Store job_id for briefing page
      sessionStorage.setItem("jobId", response.job_id);
      router.push("/briefing");
    } catch (err: any) {
      setError(err.message || "Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Negotiation Details
        </h1>

        {error && (
          <ErrorAlert message={error} onDismiss={() => setError(null)} />
        )}

        {hasExtractedData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-green-800 font-medium">
                Data automatically extracted from your PDF. Please review and edit as needed.
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-lg p-8 space-y-8"
        >
          {/* Supplier Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
              Supplier Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Information
                </label>
                <input
                  type="text"
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email, phone, or website"
                />
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
              Product / Service Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the product or service being offered"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="productType"
                      value="software"
                      checked={productType === "software"}
                      onChange={(e) => setProductType(e.target.value as "software")}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Software</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="productType"
                      value="hardware"
                      checked={productType === "hardware"}
                      onChange={(e) => setProductType(e.target.value as "hardware")}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Hardware</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="productType"
                      value="service"
                      checked={productType === "service"}
                      onChange={(e) => setProductType(e.target.value as "service")}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Service</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
              Pricing
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offer Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., €50,000 or $1,200/month"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pricing Model <span className="text-red-500">*</span>
                </label>
                <select
                  value={pricingModel}
                  onChange={(e) => setPricingModel(e.target.value as "yearly" | "monthly" | "one-time")}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ideal negotiation target"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Maximum acceptable price"
                />
              </div>
            </div>
          </div>

          {/* Business Value Assessment */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
              Business Value Assessment
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How would you assess this purchase? <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="valueAssessment"
                    value="urgent"
                    checked={valueAssessment === "urgent"}
                    onChange={(e) => setValueAssessment(e.target.value as "urgent")}
                    className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Urgent</span>
                    <p className="text-sm text-gray-600">Time-sensitive or critical business need</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="valueAssessment"
                    value="high_impact"
                    checked={valueAssessment === "high_impact"}
                    onChange={(e) => setValueAssessment(e.target.value as "high_impact")}
                    className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">High Impact</span>
                    <p className="text-sm text-gray-600">Strategically important for the business</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="valueAssessment"
                    value="medium_impact"
                    checked={valueAssessment === "medium_impact"}
                    onChange={(e) => setValueAssessment(e.target.value as "medium_impact")}
                    className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Medium Impact</span>
                    <p className="text-sm text-gray-600">Moderately important for operations</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="valueAssessment"
                    value="low_impact"
                    checked={valueAssessment === "low_impact"}
                    onChange={(e) => setValueAssessment(e.target.value as "low_impact")}
                    className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Low Impact</span>
                    <p className="text-sm text-gray-600">Low priority or nice-to-have</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !documentId}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            {loading ? "Generating Briefing..." : "Generate Briefing"}
          </button>
        </form>
      </div>
    </main>
  );
}
