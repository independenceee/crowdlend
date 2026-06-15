import { APP_NETWORK_ID } from "@/constants/enviroments";
import { MeshWallet } from "@meshsdk/core";
import { MeshTxBuilder } from "@/txbuilders/mesh.txbuilder";
import { blockfrostProvider } from "@/providers/cardano/blockfrost";

export const create = async ({
    address,
    name,
    principal,
    interestRate,
    loanDuration,
}: {
    address: string;
    name: string;
    principal: number;
    interestRate: number;
    loanDuration: number;
}) => {
    try {
        const meshWallet = new MeshWallet({
            accountIndex: 0,
            networkId: APP_NETWORK_ID,
            fetcher: blockfrostProvider,
            submitter: blockfrostProvider,
            key: {
                type: "address",
                address: address,
            },
        });

        const meshTxBuilder: MeshTxBuilder = new MeshTxBuilder({
            meshWallet: meshWallet,
            name: name,
            issuer: address,
        });
        await meshTxBuilder.initalize();

        return await meshTxBuilder.create({
            borrower: address,
            principal: principal,
            interestRate: interestRate,
            loanDuration: loanDuration,
        });
    } catch (error) {
        throw error;
    }
};
