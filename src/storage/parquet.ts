// https://docs.subsquid.io/tutorials/parquet-file-store/#data-indexing
// https://github.com/subsquid-labs/squid-parquet-storage/blob/main/src/db.ts
// https://docs.subsquid.io/basics/store/file-store/parquet-table/#columns
import {LogItem, TransactionItem} from '@subsquid/evm-processor/lib/interfaces/dataSelection'

import {Table, Column, Compression, Types} from '@subsquid/file-store-parquet'
import {Database, LocalDest} from '@subsquid/file-store'
import { Transfer, Contract, Holder } from '../model';
import {BatchHandlerContext, assertNotNull} from '@subsquid/evm-processor'
// 'UNCOMPRESSED' | 'GZIP' | 'LZO' | 'BROTLI' | 'LZ4'
const compression = 'UNCOMPRESSED'

export const HolderT = new Table(
    'holder.parquet',
    {
        id: Column(Types.String()),
        contract: Column(Types.String()),
    },
    {
        compression
    }
)

export const ContractT = new Table(
    'contract.parquet',
    {
        id: Column(Types.String()),
    },
    {
        compression
    }
)

export const TransferT = new Table(
    'transfer.parquet',
    {
        blockNumber: Column(Types.String()),
        timestamp: Column(Types.Timestamp()),
        from: Column(Types.String()),
        to: Column(Types.String()),
        contract: Column(Types.String()),
        tokenId: Column(Types.String()),
        sentETHValue: Column(Types.String()),
        transactionHash: Column(Types.String()),
        blockHash: Column(Types.String()),
    },
    {
        compression,
    }
)

const dbOptions = {
	tables: {
		TransferT,
        ContractT,
        HolderT
	},
	dest: new LocalDest('./data'),
	chunkSizeMb: 1,
	// Explicitly keeping the default value of syncIntervalBlocks (infinity).
	// Make sure to use a finite value here if your output data rate is low!
	syncIntervalBlocks: 10
}

// todo async?
export const processTransfers = async (ctx: BatchHandlerContext<any, any>, arr: Transfer[]) => {
    for (const t of arr) {

        const prepared = {
            ...t,
            timestamp: t.timestamp,
            blockNumber: t.toString(),
            tokenId: t.tokenId.toString(),
            sentETHValue: t.sentETHValue.toString()
        }
        console.log(prepared)

        ctx.store.TransferT.write(prepared)
    }
}

export const processHolders = async (ctx: BatchHandlerContext<any, any>, arr: Holder[]) => {
    for (const t of arr) {
        ctx.store.HolderT.write(t)
    }
}

export const processContracts = async (ctx: BatchHandlerContext<any, any>, arr: Contract[]) => {
    for (const t of arr) {
        ctx.store.ContractT.write(t)
    }
}

export const parquetDb = new Database(dbOptions)