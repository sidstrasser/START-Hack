"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { UploadResponse } from "@/lib/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorAlert } from "@/components/ErrorAlert";

export default function DocumentUpload() {
  const router = useRouter();
  const [offerFile, setOfferFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerDragActive, setOfferDragActive] = useState(false);
  const [additionalDragActive, setAdditionalDragActive] = useState(false);

  const handleOfferDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setOfferDragActive(true);
    } else if (e.type === "dragleave") {
      setOfferDragActive(false);
    }
  };

  const handleOfferDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOfferDragActive(false);

    if (e.dataTransfer.files?.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setOfferFile(file);
        setError(null);
      }
    }
  };

  const handleOfferFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setOfferFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleAdditionalDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setAdditionalDragActive(true);
    } else if (e.type === "dragleave") {
      setAdditionalDragActive(false);
    }
  };

  const handleAdditionalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdditionalDragActive(false);

    if (e.dataTransfer.files?.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "application/pdf"
      );
      setAdditionalFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleAdditionalFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files?.length) {
      const newFiles = Array.from(e.target.files).filter(
        (f) => f.type === "application/pdf"
      );
      setAdditionalFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleUpload = async () => {
    if (!offerFile) {
      setError("Please upload the offer document (mandatory)");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload all files together
      const allFiles = [offerFile, ...additionalFiles];
      const response: UploadResponse = await api.uploadPDF(allFiles);

      // Store document_id and extracted_data in sessionStorage for next page
      sessionStorage.setItem("documentId", response.document_id);
      sessionStorage.setItem(
        "extractedData",
        JSON.stringify(response.extracted_data)
      );

      router.push("/negotiation-input");
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.removeItem("documentId");
    sessionStorage.removeItem("extractedData");
    router.push("/negotiation-input");
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Upload Documents
        </h1>

        {error && (
          <ErrorAlert message={error} onDismiss={() => setError(null)} />
        )}

        {/* Mandatory Offer Document */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-300">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Offer Document
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Required
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Upload the supplier's offer document (PDF)
          </p>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              offerDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onDragEnter={handleOfferDrag}
            onDragLeave={handleOfferDrag}
            onDragOver={handleOfferDrag}
            onDrop={handleOfferDrop}
          >
            <input
              id="offer-upload"
              type="file"
              accept=".pdf"
              onChange={handleOfferFileChange}
              className="hidden"
            />

            {offerFile ? (
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
                    <span className="font-medium text-green-900">
                      {offerFile.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setOfferFile(null)}
                    className="text-red-500 hover:text-red-700 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <div>
                  <label
                    htmlFor="offer-upload"
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
                    htmlFor="offer-upload"
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

        {/* Optional Additional Documents */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Additional Documents
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              Optional
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Upload supporting documents like market analysis, competitor offers,
            etc. (PDF)
          </p>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              additionalDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300"
            }`}
            onDragEnter={handleAdditionalDrag}
            onDragLeave={handleAdditionalDrag}
            onDragOver={handleAdditionalDrag}
            onDrop={handleAdditionalDrop}
          >
            <input
              id="additional-upload"
              type="file"
              accept=".pdf"
              multiple
              onChange={handleAdditionalFileChange}
              className="hidden"
            />

            {additionalFiles.length > 0 ? (
              <div className="space-y-4">
                {additionalFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="h-6 w-6 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="font-medium">{file.name}</span>
                    </div>
                    <button
                      onClick={() =>
                        setAdditionalFiles(
                          additionalFiles.filter((_, i) => i !== idx)
                        )
                      }
                      className="text-red-500 hover:text-red-700 text-xl font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="pt-4">
                  <label
                    htmlFor="additional-upload"
                    className="cursor-pointer text-blue-600 hover:underline text-sm"
                  >
                    Add more files
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
                    htmlFor="additional-upload"
                    className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500"
                  >
                    <span>Upload files</span>
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            disabled={!offerFile || uploading}
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
