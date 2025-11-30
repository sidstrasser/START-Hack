"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import type { ExtractedData, FormDataInput } from "@/lib/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function NegotiationInput() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

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
    const storedDocId = sessionStorage.getItem("documentId");
    const storedData = sessionStorage.getItem("extractedData");

    if (storedDocId) {
      setDocumentId(storedDocId);
    }

    if (storedData) {
      try {
        const data: ExtractedData = JSON.parse(storedData);
        setSupplierName(data.supplier_name || "");
        setSupplierContact(data.supplier_contact || "");
        setProductDescription(data.product_description || "");
        setProductType(data.product_type || "software");
        setOfferPrice(data.offer_price || "");
        setPricingModel(data.pricing_model || "yearly");
        setMaxPrice(data.max_price || "");
        setTargetPrice(data.target_price || "");
        setValueAssessment(data.value_assessment || "medium_impact");
        
        // Show toast notification
        setToast({ message: "Data extracted from your documents", visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
      } catch (e) {
        console.error("Failed to parse extracted data:", e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentId) {
      setError("No document uploaded. Please upload a document first.");
      return;
    }

    if (!supplierName || !productDescription || !offerPrice || !targetPrice || !maxPrice) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

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

      sessionStorage.setItem("jobId", response.job_id);
      router.push("/briefing");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate briefing";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-ds-md text-white placeholder-white/40 focus:outline-none focus:border-ds-accent-2 focus:ring-1 focus:ring-ds-accent-2 transition-colors";
  const labelClasses = "block text-sm font-medium text-white/80 mb-2";
  const requiredStar = <span className="text-ds-accent-2">*</span>;

  return (
    <main className="min-h-screen bg-[#0F1A3D] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-ds-accent-1/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-ds-accent-2/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-ds-accent-1/15 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link href="/document-upload" className="inline-flex items-center gap-3 group">
          <Image
            src="/icon-logo.png"
            alt="Accordia"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
            unoptimized
          />
          <span className="text-white/60 group-hover:text-white transition-colors">← Back to Upload</span>
        </Link>
      </header>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 pb-12">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Negotiation Details
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Review and confirm the details for your negotiation briefing.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-red-500/20 border border-red-500/30 rounded-ds-lg p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
          {/* Row 1: Supplier Info + Product Details */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Supplier Information Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-ds-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-ds-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Supplier Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={labelClasses}>Supplier Name {requiredStar}</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    required
                    className={inputClasses}
                    placeholder="e.g., Acme Corporation"
                  />
                </div>
                <div>
                  <label className={labelClasses}>Contact Information</label>
                  <input
                    type="text"
                    value={supplierContact}
                    onChange={(e) => setSupplierContact(e.target.value)}
                    className={inputClasses}
                    placeholder="Email, phone, or website"
                  />
                </div>
              </div>
            </div>

            {/* Product Details Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-ds-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-ds-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Product / Service</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={labelClasses}>Description {requiredStar}</label>
                  <textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    required
                    rows={2}
                    className={inputClasses}
                    placeholder="Describe the product or service"
                  />
                </div>
                <div>
                  <label className={labelClasses}>Type {requiredStar}</label>
                  <div className="flex gap-3">
                    {[
                      { value: "software", icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      )},
                      { value: "hardware", icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      )},
                      { value: "service", icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )},
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-ds-lg cursor-pointer transition-all border ${
                          productType === option.value
                            ? "bg-ds-accent-2/20 border-ds-accent-2 text-white"
                            : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/70"
                        }`}
                      >
                        <input
                          type="radio"
                          name="productType"
                          value={option.value}
                          checked={productType === option.value}
                          onChange={(e) => setProductType(e.target.value as typeof productType)}
                          className="sr-only"
                        />
                        <div className={`transition-colors ${productType === option.value ? "text-ds-accent-2" : ""}`}>
                          {option.icon}
                        </div>
                        <span className="text-sm font-medium capitalize">{option.value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Pricing Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-ds-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-ds-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Pricing Strategy</h2>
              </div>
              
              {/* Pricing Model Toggle */}
              <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
                {[
                  { value: "monthly", label: "Monthly" },
                  { value: "yearly", label: "Yearly" },
                  { value: "one-time", label: "One-time" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPricingModel(option.value as typeof pricingModel)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      pricingModel === option.value
                        ? "bg-ds-accent-2 text-white shadow-lg"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Price Fields */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Offer Price */}
              <div className="space-y-2">
                <label className={labelClasses}>Supplier Offer {requiredStar}</label>
                <input
                  type="text"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder="e.g., €50,000"
                />
                <p className="text-xs text-white/40">Their starting price</p>
              </div>

              {/* Target Price */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className={labelClasses}>Your Target {requiredStar}</label>
                </div>
                <input
                  type="text"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder="e.g., €42,000"
                />
                <p className="text-xs text-white/40">Ideal negotiation outcome</p>
              </div>

              {/* Max Price */}
              <div className="space-y-2">
                <label className={labelClasses}>Walk-away Price {requiredStar}</label>
                <input
                  type="text"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder="e.g., €48,000"
                />
                <p className="text-xs text-white/40">Maximum you&apos;ll accept</p>
              </div>
            </div>
          </div>

          {/* Row 3: Business Value Assessment */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-ds-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/10 rounded-ds-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Business Value Assessment</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { value: "urgent", label: "Urgent", desc: "Time-sensitive need" },
                { value: "high_impact", label: "High Impact", desc: "Strategically important" },
                { value: "medium_impact", label: "Medium Impact", desc: "Moderately important" },
                { value: "low_impact", label: "Low Impact", desc: "Nice-to-have" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex flex-col p-4 border rounded-ds-lg cursor-pointer transition-all ${
                    valueAssessment === option.value
                      ? "bg-ds-accent-2/20 border-ds-accent-2"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="valueAssessment"
                    value={option.value}
                    checked={valueAssessment === option.value}
                    onChange={(e) => setValueAssessment(e.target.value as typeof valueAssessment)}
                    className="sr-only"
                  />
                  <span className="font-medium text-white mb-1">{option.label}</span>
                  <p className="text-xs text-white/50">{option.desc}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={loading || !documentId}
              className="cta-negotiate inline-flex items-center gap-3 px-10 py-5 text-lg font-semibold text-[#0F1A3D] bg-white rounded-ds-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 transition-transform duration-300"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? "Generating Briefing..." : "Generate Briefing"}
              {!loading && (
                <svg className="arrow-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-ds-accent-2/90 backdrop-blur-xl border border-ds-accent-2 rounded-ds-lg px-5 py-3 shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-white shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-white text-sm font-medium">{toast.message}</p>
            <button 
              onClick={() => setToast(prev => ({ ...prev, visible: false }))}
              className="text-white/70 hover:text-white ml-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
