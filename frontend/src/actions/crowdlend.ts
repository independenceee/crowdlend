"use server";

import { APP_NETWORK_ID, APP_MNEMONIC, APP_WALLET_ADDRESS } from "@/constants/enviroments";
import { MeshWallet } from "@meshsdk/core";
import { MeshTxBuilder } from "@/txbuilders/mesh.txbuilder";
import { blockfrostProvider } from "@/providers/cardano/blockfrost";

export const getPolicyId = async ({ address }: { address: string }) => {
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
            name: "",
            issuer: address,
        });
        await meshTxBuilder.initalize();

        return meshTxBuilder.policyId;
    } catch (error) {
        throw error;
    }
};

export const getLoans = async () => {
    const meshWallet = new MeshWallet({
        accountIndex: 0,
        networkId: APP_NETWORK_ID,
        fetcher: blockfrostProvider,
        submitter: blockfrostProvider,
        key: {
            type: "mnemonic",
            words: APP_MNEMONIC?.split(" ") || [],
        },
    });

    const meshTxBuilder: MeshTxBuilder = new MeshTxBuilder({
        meshWallet: meshWallet,
        name: "",
        issuer: APP_WALLET_ADDRESS,
    });
    await meshTxBuilder.initalize();

    const utxos = await blockfrostProvider.fetchAddressUTxOs(meshTxBuilder.spendAddress);
    return utxos.map((utxo) => {
        const datum = meshTxBuilder.convertDatum({ plutusData: utxo.output.plutusData as string });
        return {
            ...datum,
            txHash: utxo.input.txHash,
        };
    });
};

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

export const fund = async ({ address, name }: { address: string; name: string }) => {
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

        return await meshTxBuilder.fund();
    } catch (error) {
        throw error;
    }
};

export const repay = async ({ address, name }: { address: string; name: string }) => {
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

        return await meshTxBuilder.repay();
    } catch (error) {
        throw error;
    }
};

export const cancel = async ({ address, name }: { address: string; name: string }) => {
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

        return await meshTxBuilder.cancel();
    } catch (error) {
        throw error;
    }
};

export const liquidate = async ({ address, name }: { address: string; name: string }) => {
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

        return await meshTxBuilder.liquidate();
    } catch (error) {
        throw error;
    }
};
