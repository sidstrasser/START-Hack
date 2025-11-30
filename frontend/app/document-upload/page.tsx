"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { UploadResponse } from "@/lib/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorAlert } from "@/components/ErrorAlert";

interface FileUploadSectionProps {
  id: string;
  title: string;
  description: string;
  required: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  borderColor: string;
}

function FileUploadSection({
  id,
  title,
  description,
  required,
  file,
  onFileChange,
  borderColor,
}: FileUploadSectionProps) {
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
    <div className={`bg-white rounded-lg shadow-lg p-6 mb-6 border-2 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            required
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {required ? "Required" : "Optional"}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
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
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-green-50 p-3 rounded border border-green-200">
              <div className="flex items-center gap-3">
                <svg
                  className="h-6 w-6 text-green-500"
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
                <span className="font-medium text-green-900">{file.name}</span>
              </div>
              <button
                onClick={() => onFileChange(null)}
                className="text-red-500 hover:text-red-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div>
              <label
                htmlFor={id}
                className="cursor-pointer text-blue-600 hover:underline text-sm"
              >
                Replace file
              </label>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
              />
            </svg>
            <div className="mt-4 flex text-sm text-gray-600 justify-center">
              <label
                htmlFor={id}
                className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500"
              >
                <span>Upload file</span>
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF up to 10MB</p>
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

      // Store document_id and extracted_data in sessionStorage for next page
      sessionStorage.setItem("documentId", response.document_id);
      sessionStorage.setItem(
        "extractedData",
        JSON.stringify(response.extracted_data)
      );

      router.push("/negotiation-input");
    } catch (err: any) {
      setError(err.message || "Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.removeItem("documentId");
    sessionStorage.removeItem("extractedData");
    router.push("/negotiation-input");
  };

  const canUpload = supplierOfferFile && initialRequestFile;

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Upload Documents
        </h1>

        {error && (
          <ErrorAlert message={error} onDismiss={() => setError(null)} />
        )}

        {/* 1. Supplier Offer (Required) */}
        <FileUploadSection
          id="supplier-offer-upload"
          title="Supplier Offer"
          description="The supplier's proposal with pricing. This price becomes your maximum price ceiling for negotiation."
          required={true}
          file={supplierOfferFile}
          onFileChange={setSupplierOfferFile}
          borderColor="border-blue-300"
        />

        {/* 2. Initial Request (Required) */}
        <FileUploadSection
          id="initial-request-upload"
          title="Initial Request"
          description="Your company's original request document describing what you're looking for, requirements, and specifications."
          required={true}
          file={initialRequestFile}
          onFileChange={setInitialRequestFile}
          borderColor="border-green-300"
        />

        {/* 3. Alternative Suppliers (Optional) */}
        <FileUploadSection
          id="alternatives-upload"
          title="Alternative Suppliers"
          description="List of potential alternative suppliers for comparison. Helps strengthen your negotiation position."
          required={false}
          file={alternativesFile}
          onFileChange={setAlternativesFile}
          borderColor="border-gray-200"
        />

        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            disabled={!canUpload || uploading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading && <LoadingSpinner size="sm" />}
            {uploading ? "Uploading..." : "Upload & Continue"}
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={handleSkip}
            className="text-gray-600 hover:text-gray-800 underline"
          >
            Skip - Enter details manually
          </button>
        </div>
      </div>
    </main>
  );
}
