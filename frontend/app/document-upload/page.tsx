"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import type { UploadResponse } from "@/lib/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface FileUploadCardProps {
  id: string;
  title: string;
  description: string;
  required: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  icon: React.ReactNode;
}

function FileUploadCard({
  id,
  title,
  description,
  required,
  file,
  onFileChange,
  icon,
}: FileUploadCardProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        onFileChange(droppedFile);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFileChange(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-ds-xl p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-white/10 rounded-ds-md flex items-center justify-center text-white/80">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                required
                  ? "bg-ds-accent-2/30 text-ds-accent-2"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {required ? "Required" : "Optional"}
            </span>
          </div>
          <p className="text-sm text-white/60">{description}</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`flex-1 border-2 border-dashed rounded-ds-lg p-6 text-center transition-all flex flex-col items-center justify-center min-h-[180px] ${
          dragActive
            ? "border-ds-accent-2 bg-ds-accent-2/10"
            : file
            ? "border-green-400/50 bg-green-400/5"
            : "border-white/20 hover:border-white/40"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          id={id}
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        {file ? (
          <div className="space-y-3 w-full">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium text-white truncate px-2">{file.name}</p>
            <div className="flex items-center justify-center gap-4">
              <label
                htmlFor={id}
                className="cursor-pointer text-ds-accent-2 hover:underline text-sm"
              >
                Replace
              </label>
              <button
                onClick={() => onFileChange(null)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-10 w-10 text-white/30 mb-3"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <label
              htmlFor={id}
              className="cursor-pointer text-white font-medium hover:text-ds-accent-2 transition-colors"
            >
              Upload PDF
            </label>
            <p className="text-white/40 text-sm mt-1">or drag and drop</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentUpload() {
  const router = useRouter();
  const [supplierOfferFile, setSupplierOfferFile] = useState<File | null>(null);
  const [initialRequestFile, setInitialRequestFile] = useState<File | null>(null);
  const [alternativesFile, setAlternativesFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!supplierOfferFile) {
      setError("Please upload the Supplier Offer document");
      return;
    }
    if (!initialRequestFile) {
      setError("Please upload the Initial Request document");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response: UploadResponse = await api.uploadDocuments(
        supplierOfferFile,
        initialRequestFile,
        alternativesFile
      );

      sessionStorage.setItem("documentId", response.document_id);
      sessionStorage.setItem("extractedData", JSON.stringify(response.extracted_data));

      router.push("/negotiation-input");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload documents";
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const canUpload = supplierOfferFile && initialRequestFile;

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
        <Link href="/" className="inline-flex items-center gap-3 group">
          <Image
            src="/icon-logo.png"
            alt="Accordia"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
            unoptimized
          />
          <span className="text-white/60 group-hover:text-white transition-colors">← Back to Home</span>
        </Link>
      </header>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 pb-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Upload Your Documents
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Provide your negotiation documents for AI-powered analysis and strategic briefing generation.
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

        {/* Upload Cards - Horizontal Layout */}
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto mb-12">
          {/* Supplier Offer */}
          <FileUploadCard
            id="supplier-offer-upload"
            title="Supplier Offer"
            description="The supplier's proposal with pricing details"
            required={true}
            file={supplierOfferFile}
            onFileChange={setSupplierOfferFile}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />

          {/* Initial Request */}
          <FileUploadCard
            id="initial-request-upload"
            title="Initial Request"
            description="Your company's original requirements document"
            required={true}
            file={initialRequestFile}
            onFileChange={setInitialRequestFile}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          />

          {/* Alternative Suppliers */}
          <FileUploadCard
            id="alternatives-upload"
            title="Alternatives"
            description="List of potential alternative suppliers"
            required={false}
            file={alternativesFile}
            onFileChange={setAlternativesFile}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleUpload}
            disabled={!canUpload || uploading}
            className="cta-negotiate inline-flex items-center gap-3 px-10 py-5 text-lg font-semibold text-[#0F1A3D] bg-white rounded-ds-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 transition-transform duration-300"
          >
            {uploading && <LoadingSpinner size="sm" />}
            {uploading ? "Analyzing..." : "Continue with Analysis"}
            {!uploading && (
              <svg className="arrow-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            )}
          </button>

        </div>
      </div>
    </main>
  );
}
