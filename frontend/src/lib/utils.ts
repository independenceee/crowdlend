import { deserializeDatum, pubKeyAddress, serializeAddressObj, hexToString } from "@meshsdk/core";
import { APP_NETWORK_ID } from "@/constants/enviroments";

export const convertDatum = ({
    plutusData,
}: {
    plutusData: string;
}): {
    borrower: string;
    lender: string;
    principal: number;
    interestRate: number;
    loanDuration: number;
    dueDate?: number;
    policyId: string;
    assetName: string;
    status: {
        type: "Active" | "Pending";
        fundedAt: number | undefined;
    };
} => {
    try {
        const datum = deserializeDatum(plutusData);
        console.dir(datum, { depth: null });

        const buildAddress = (paymentHex: string, stakeHex?: string): string => {
            if (typeof paymentHex !== "string" || paymentHex.length !== 56) {
                throw new Error(`Invalid payment hex length (expected 56): ${paymentHex}`);
            }
            if (stakeHex && stakeHex.length !== 56) {
                throw new Error(`Invalid stake hex length (expected 56): ${stakeHex}`);
            }
            return serializeAddressObj(pubKeyAddress(paymentHex, stakeHex || "", false), APP_NETWORK_ID);
        };
        const borrower = buildAddress(datum.fields[0].fields[0].fields[0].bytes, datum.fields[0].fields[1].fields[0].fields[0].fields[0].bytes);

        let lender = "";
        const lenderOption = datum.fields?.[1];
        if (lenderOption && lenderOption.constructor === 0 && lenderOption.fields?.[0]) {
            const lenderAddressWrap = lenderOption.fields[0];
            const lenderPayment = lenderAddressWrap.fields?.[0]?.fields?.[0]?.bytes;
            const lenderStake = lenderAddressWrap.fields?.[1]?.fields?.[0]?.fields?.[0]?.fields?.[0]?.bytes;
            lender = buildAddress(lenderPayment, lenderStake);
        }

        const principal = Number(datum.fields?.[2]?.int || 0);
        const interestRate = Number(datum.fields?.[3]?.int || 0);
        const loanDuration = Number(datum.fields?.[4]?.int || 0);

        const dueDateRaw = datum.fields?.[5];
        const dueDate = dueDateRaw && dueDateRaw.constructor === 0 && dueDateRaw.fields?.[0] ? Number(dueDateRaw.fields[0].int) : undefined;

        const policyId = String(datum.fields?.[6]?.bytes || "");

        const assetName = datum.fields?.[7]?.bytes ? hexToString(datum.fields[7].bytes) : "";

        const statusRaw = datum.fields?.[8];
        const status =
            statusRaw && statusRaw.constructor === 1 && statusRaw.fields?.[0]
                ? {
                      type: "Active" as const,
                      fundedAt: Number(statusRaw.fields[0].int),
                  }
                : {
                      type: "Pending" as const,
                      fundedAt: undefined,
                  };

        return {
            borrower,
            lender,
            principal,
            interestRate,
            loanDuration,
            dueDate,
            policyId,
            assetName,
            status,
        };
    } catch (err) {
        throw new Error(`Invalid Plutus datum: ${err instanceof Error ? err.message : String(err)}`);
    }
};
