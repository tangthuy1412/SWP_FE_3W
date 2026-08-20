import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { documentService } from "../../services/documentService";
import type {
  DocumentShareApproval,
  DocumentShareApprovalPage,
  DocumentShareApprovalType,
  ShareApprovalStatus,
} from "../../services/documentService";

interface ShareApprovalsViewProps {
  isAdmin: boolean;
}

const statusOptions: Array<ShareApprovalStatus | "ALL"> = [
  "ALL",
  "UNREVIEWED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
];

const shareTypeOptions: Array<DocumentShareApprovalType | "ALL"> = [
  "ALL",
  "PUBLIC",
  "LINK",
  "DIRECT",
];

const statusVariant = (status: ShareApprovalStatus): "success" | "warning" | "error" | "neutral" => {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "error";
  if (status === "PENDING_APPROVAL") return "warning";
  return "neutral";
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const emptyPage: DocumentShareApprovalPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  empty: true,
};

export const ShareApprovalsView: React.FC<ShareApprovalsViewProps> = ({ isAdmin }) => {
  const [statusFilter, setStatusFilter] = useState<ShareApprovalStatus | "ALL">(
    isAdmin ? "PENDING_APPROVAL" : "ALL",
  );
  const [shareTypeFilter, setShareTypeFilter] = useState<DocumentShareApprovalType | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<DocumentShareApprovalPage>(emptyPage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadApprovals = async () => {
      setIsLoading(true);
      setError(null);
      const query = {
        ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
        ...(shareTypeFilter === "ALL" ? {} : { shareType: shareTypeFilter }),
        page,
      };
      const response = isAdmin
        ? await documentService.getAdminDocumentShareApprovals(query)
        : await documentService.getMyDocumentShareApprovals(query);

      if (cancelled) return;
      if (response.data?.success && response.data.data) {
        setResult({ ...emptyPage, ...response.data.data, content: response.data.data.content || [] });
      } else {
        setResult(emptyPage);
        setError(response.error || response.data?.message || "Could not load share approvals.");
      }
      setIsLoading(false);
    };

    loadApprovals().catch(() => {
      if (!cancelled) {
        setResult(emptyPage);
        setError("Could not load share approvals.");
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, page, refreshToken, shareTypeFilter, statusFilter]);

  const handleStatusChange = (value: ShareApprovalStatus | "ALL") => {
    setPage(0);
    setStatusFilter(value);
  };

  const handleShareTypeChange = (value: DocumentShareApprovalType | "ALL") => {
    setPage(0);
    setShareTypeFilter(value);
  };

  const handleReview = async (approval: DocumentShareApproval, status: "APPROVED" | "REJECTED") => {
    setActionId(approval.documentId);
    try {
      const response = await documentService.reviewDocumentShareApproval(approval.documentId, status);
      if (response.data?.success) {
        toast.success(`Share request ${status === "APPROVED" ? "approved" : "rejected"}.`);
        setRefreshToken((value) => value + 1);
      } else {
        toast.error(response.error || response.data?.message || "Could not review this share request.");
      }
    } catch {
      toast.error("Could not review this share request.");
    } finally {
      setActionId(null);
    }
  };

  const pageCount = result.totalPages || (result.totalElements > 0 ? 1 : 0);
  const canGoBack = page > 0 && !isLoading;
  const canGoNext = pageCount > 0 && page + 1 < pageCount && !isLoading;

  return (
    <section className="rounded-[22px] border border-outline-variant/70 bg-surface p-4 md:p-6 shadow-[0_18px_60px_rgba(35,48,38,0.06)] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-secondary font-semibold mb-1">Workspace</p>
          <h2 className="text-[26px] leading-8 font-bold tracking-[-0.035em] text-on-surface">
            {isAdmin ? "Review Approvals" : "My Approvals"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="approval-status">Approval status</label>
          <select
            id="approval-status"
            value={statusFilter}
            onChange={(event) => handleStatusChange(event.target.value as ShareApprovalStatus | "ALL")}
            className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface"
          >
            {statusOptions.filter((status) => !isAdmin || status !== "ALL").map((status) => (
              <option key={status} value={status}>{status === "ALL" ? "All statuses" : status.replace("_", " ")}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="approval-share-type">Share type</label>
          <select
            id="approval-share-type"
            value={shareTypeFilter}
            onChange={(event) => handleShareTypeChange(event.target.value as DocumentShareApprovalType | "ALL")}
            className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface"
          >
            {shareTypeOptions.map((type) => (
              <option key={type} value={type}>{type === "ALL" ? "All share types" : type}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-error/20 bg-error-container/20 px-3 py-2.5 text-sm text-error">
          <span>{error}</span>
          <Button variant="ghost" size="sm" leftIcon="refresh" onClick={() => setRefreshToken((value) => value + 1)}>Retry</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-secondary">
          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
          Loading approvals...
        </div>
      ) : result.content.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-secondary">
          <span className="material-symbols-outlined text-[30px]">task_alt</span>
          <p className="text-sm">No share approvals found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/70">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Document</th>
                {isAdmin && <th className="px-4 py-3 font-semibold">Owner</th>}
                <th className="px-4 py-3 font-semibold">Share type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                {isAdmin && <th className="px-4 py-3 text-right font-semibold">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {result.content.map((approval) => (
                <tr key={approval.approvalId} className="hover:bg-surface-container-low/60">
                  <td className="max-w-[250px] px-4 py-3">
                    <p className="truncate font-semibold text-on-surface">{approval.documentName || `Document #${approval.documentId}`}</p>
                    <p className="mt-0.5 text-xs text-secondary">ID {approval.documentId}</p>
                  </td>
                  {isAdmin && (
                    <td className="max-w-[190px] truncate px-4 py-3 text-secondary">{approval.ownerEmail || `User #${approval.ownerId ?? "-"}`}</td>
                  )}
                  <td className="px-4 py-3 text-secondary">{approval.shareType}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(approval.status)}>{approval.status.replace("_", " ")}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-secondary">{formatDate(approval.createdAt)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon="check"
                          disabled={approval.status !== "PENDING_APPROVAL" || actionId === approval.documentId}
                          isLoading={actionId === approval.documentId}
                          onClick={() => handleReview(approval, "APPROVED")}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon="close"
                          disabled={approval.status !== "PENDING_APPROVAL" || actionId === approval.documentId}
                          onClick={() => handleReview(approval, "REJECTED")}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-outline-variant/60 pt-4 text-sm text-secondary">
        <span>{result.totalElements} request{result.totalElements === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon="chevron_left" disabled={!canGoBack} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span className="min-w-20 text-center">{pageCount === 0 ? 0 : page + 1} / {pageCount}</span>
          <Button variant="outline" size="sm" rightIcon="chevron_right" disabled={!canGoNext} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      </div>
    </section>
  );
};

export default ShareApprovalsView;
