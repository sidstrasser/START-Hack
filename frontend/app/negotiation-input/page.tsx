"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ExtractedData } from "@/lib/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorAlert } from "@/components/ErrorAlert";

export default function NegotiationInput() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  // General
  const [supplier, setSupplier] = useState("");
  const [goals, setGoals] = useState("");
  const [hasExtractedData, setHasExtractedData] = useState(false);

  // Cost & Savings
  const [offerPrice, setOfferPrice] = useState("");
  const [pricingModel, setPricingModel] = useState("");
  const [desiredPrice, setDesiredPrice] = useState("");
  const [isSubstitute, setIsSubstitute] = useState(false);
  const [currentPrice, setCurrentPrice] = useState("");

  // Value / Requirements (Scale 1-10)
  const [addedValue, setAddedValue] = useState(5);
  const [need, setNeed] = useState(5);

  // Risk / Contract (Scale 1-10)
  const [impactOfOutage, setImpactOfOutage] = useState(5);
  const [riskAversion, setRiskAversion] = useState(5);
  const [targetSupport, setTargetSupport] = useState(5);
  const [complianceRelevance, setComplianceRelevance] = useState(5);

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

        if (data.supplier) setSupplier(data.supplier);

        setOfferPrice(data.offer_price || "");
        setPricingModel(data.pricing_model || "");
        setDesiredPrice(data.desired_price || "");
        setIsSubstitute(data.is_substitute || false);
        setCurrentPrice(data.current_price || "");

        if (data.added_value) setAddedValue(data.added_value);
        if (data.need) setNeed(data.need);
        if (data.impact_of_outage) setImpactOfOutage(data.impact_of_outage);
        if (data.risk_aversion) setRiskAversion(data.risk_aversion);
        if (data.target_support_availability)
          setTargetSupport(data.target_support_availability);
        if (data.compliance_relevance)
          setComplianceRelevance(data.compliance_relevance);

        setHasExtractedData(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentId) {
      setError(
        "No document uploaded. Please upload a document first or go back."
      );
      return;
    }

    setLoading(true);
    setError(null);

    // Collect all form data into a structured object
    const negotiationFormData = {
      supplier,
      goals,
      // Cost & Savings
      offer_price: offerPrice,
      pricing_model: pricingModel,
      desired_price: desiredPrice,
      is_substitute: isSubstitute,
      current_price: isSubstitute ? currentPrice : null,
      // Value
      added_value: addedValue,
      need: need,
      // Risk
      impact_of_outage: impactOfOutage,
      risk_aversion: riskAversion,
      target_support_availability: targetSupport,
      compliance_relevance: complianceRelevance,
    };

    try {
      // Save the user's input to session storage for reference in the next step
      sessionStorage.setItem(
        "negotiationInput",
        JSON.stringify(negotiationFormData)
      );

      const response = await api.generateBriefing({
        document_id: documentId,
        additional_context: negotiationFormData,
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

  // Helper for Range Input
  const RangeInput = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (val: number) => void;
  }) => (
    <div>
      <div className="flex justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <span className="text-sm font-bold text-blue-600">{value}/10</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );

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
                Data automatically extracted from your PDF. Please review and
                edit as needed.
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-lg p-8 space-y-8"
        >
          {/* General Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier Name
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter supplier name"
            />
          </div>

          {/* Section 1: Cost & Savings */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
              Cost & Savings
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offer Price
                </label>
                <input
                  type="text"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. €50,000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pricing Model
                </label>
                <input
                  type="text"
                  value={pricingModel}
                  onChange={(e) => setPricingModel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Fixed Price"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desired Price
                </label>
                <input
                  type="text"
                  value={desiredPrice}
                  onChange={(e) => setDesiredPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Target price"
                />
              </div>

              <div className="flex flex-col justify-center pt-6">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="substitute"
                      checked={!isSubstitute}
                      onChange={() => setIsSubstitute(false)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">New Solution</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="substitute"
                      checked={isSubstitute}
                      onChange={() => setIsSubstitute(true)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Substitute</span>
                  </label>
                </div>
              </div>

              {isSubstitute && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Price (Is-Price)
                  </label>
                  <input
                    type="text"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Cost of current solution"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Value / Requirements */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
              Value / Requirements
            </h2>
            <div className="space-y-6">
              <RangeInput
                label="Added Value"
                value={addedValue}
                onChange={setAddedValue}
              />
              <RangeInput
                label="Need / Urgency"
                value={need}
                onChange={setNeed}
              />
            </div>
          </div>

          {/* Section 3: Risk / Contract */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
              Risk / Contract
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <RangeInput
                label="Impact of Outage"
                value={impactOfOutage}
                onChange={setImpactOfOutage}
              />
              <RangeInput
                label="Risk Aversion"
                value={riskAversion}
                onChange={setRiskAversion}
              />
              <RangeInput
                label="Target Support Availability"
                value={targetSupport}
                onChange={setTargetSupport}
              />
              <RangeInput
                label="Compliance Relevance"
                value={complianceRelevance}
                onChange={setComplianceRelevance}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Negotiation Goals (Optional)
            </label>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What do you want to achieve in this negotiation? (e.g., 10% price reduction, faster delivery)"
            />
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
