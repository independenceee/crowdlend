"use client";

import { useState } from "react";
import type { LoanUtxo } from "@/lib/crowdlend";
import { fundLoan, repayLoan, liquidateLoan, cancelLoan } from "@/lib/crowdlend";
import { useWallet } from "@/context/WalletContext";
import { resolvePaymentKeyHash } from "@meshsdk/core-cst";
import { resolveSlotNo } from "@meshsdk/common";

interface Props {
    loan: LoanUtxo;
    onTxSuccess: (txHash: string) => void;
    onRefresh: () => void;
}

export default function LoanCard({ loan, onTxSuccess, onRefresh }: Props) {
    const { wallet, pkh } = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { datum } = loan;
    const principalAda = datum.principal / 1_000_000;
    const interest = Math.floor((datum.principal * datum.interest_rate) / 10000);
    const totalRepayment = (datum.principal + interest) / 1_000_000;
    const interestPct = (datum.interest_rate / 100).toFixed(2);
    const durationH = Math.round(datum.loan_duration / 3600000);
    // due_date stored as slot number; compare with current slot
    const currentSlot = Number(resolveSlotNo("preprod", Date.now()));
    const isOverdue = datum.due_date && currentSlot > datum.due_date;

    const isBorrower = pkh === datum.borrower;
    const isLender = pkh === datum.lender;

    const shortAddr = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

    const exec = async (fn: () => Promise<string>) => {
        setLoading(true);
        setError(null);
        try {
            const txHash = await fn();
            onTxSuccess(txHash);
            setTimeout(onRefresh, 5000);
        } catch (err: any) {
            setError(err?.message ?? "Transaction failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`glass-card p-6 space-y-4 ${isOverdue ? "border-red-500/30" : ""}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {datum.status.type === "Pending" ? (
                        <span className="badge-pending">Pending</span>
                    ) : (
                        <span className="badge-active">
                            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: "var(--color-accent)" }} />
                            Active
                        </span>
                    )}
                    {isOverdue && (
                        <span className="badge-pending" style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }}>
                            Overdue
                        </span>
                    )}
                </div>
                <span className="text-xs font-mono" style={{ color: "var(--color-body)" }}>
                    {loan.txHash.slice(0, 12)}...
                </span>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-3 gap-3 py-3 border-y" style={{ borderColor: "var(--color-accent-border)" }}>
                <div>
                    <p className="field-label">Principal</p>
                    <p className="text-lg font-bold" style={{ color: "var(--color-heading)" }}>
                        {principalAda} <span className="text-sm font-normal">ADA</span>
                    </p>
                </div>
                <div>
                    <p className="field-label">Interest</p>
                    <p className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                        {interestPct}%
                    </p>
                </div>
                <div>
                    <p className="field-label">Duration</p>
                    <p className="text-lg font-bold" style={{ color: "var(--color-heading)" }}>
                        {durationH}h
                    </p>
                </div>
            </div>

            {/* Details */}
            <div className="space-y-1 text-xs" style={{ color: "var(--color-body)" }}>
                <div className="flex justify-between">
                    <span>Borrower</span>
                    <span className="font-mono">{shortAddr(datum.borrower)}</span>
                </div>
                {datum.lender && (
                    <div className="flex justify-between">
                        <span>Lender</span>
                        <span className="font-mono">{shortAddr(datum.lender)}</span>
                    </div>
                )}
                {datum.due_date && (
                    <div className="flex justify-between">
                        <span>Deadline</span>
                        {/* due_date is slot number → convert to ms: (slot * 1000) + preprodZeroTime */}
                        <span>{new Date(datum.due_date * 1000 + 1666656000000).toLocaleString()}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>Total Repayment</span>
                    <span style={{ color: "var(--color-heading)" }}>{totalRepayment.toFixed(2)} ADA</span>
                </div>
            </div>

            {/* Error */}
            {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-2 py-1">{error}</p>}

            {/* Actions */}
            {wallet && (
                <div className="flex gap-2">
                    {/* Fund: visible if Pending and not borrower */}
                    {datum.status.type === "Pending" && !isBorrower && (
                        <button className="btn-primary flex-1 py-2 text-sm" disabled={loading} onClick={() => exec(() => fundLoan(wallet, loan))}>
                            {loading ? "..." : "Fund Loan"}
                        </button>
                    )}

                    {/* Cancel: visible if Pending and is borrower */}
                    {datum.status.type === "Pending" && isBorrower && (
                        <button className="btn-glass flex-1 py-2 text-sm" disabled={loading} onClick={() => exec(() => cancelLoan(wallet, loan))}>
                            {loading ? "..." : "Cancel Loan"}
                        </button>
                    )}

                    {/* Repay: visible if Active and is borrower and not overdue */}
                    {datum.status.type === "Active" && isBorrower && !isOverdue && (
                        <button className="btn-primary flex-1 py-2 text-sm" disabled={loading} onClick={() => exec(() => repayLoan(wallet, loan))}>
                            {loading ? "..." : `Repay ${totalRepayment.toFixed(2)} ADA`}
                        </button>
                    )}

                    {/* Liquidate: visible if Active, is lender, and overdue */}
                    {datum.status.type === "Active" && isLender && isOverdue && (
                        <button
                            className="btn-primary flex-1 py-2 text-sm"
                            disabled={loading}
                            onClick={() => exec(() => liquidateLoan(wallet, loan))}
                            style={{ backgroundColor: "#ef4444" }}
                        >
                            {loading ? "..." : "Liquidate"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
