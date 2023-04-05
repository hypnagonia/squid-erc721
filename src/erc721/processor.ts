import { EvmBatchProcessor } from '@subsquid/evm-processor'
import { lookupArchive } from '@subsquid/archive-registry'
import { ABIManager } from '../utils/ABIManager'
import ERC721ABI from '../abis/ERC721ABI.json'
import { IABI } from '../types'
import LRU from 'lru-cache'
import { Transfer, Contract, Holder } from '../model';
import { createLogger } from '@subsquid/logger'
import { storage } from '../storage'
import { expectedMethodsAndEvents } from './erc721'
import { withRetry } from '../utils'
import { processTransfers, processHolders, processContracts } from '../storage/parquet'

const l = createLogger('ERC721:processor')

const processedContracts = new LRU({ max: 500 * 1000 })
const filteredContracts = new LRU({ max: 500 * 1000 })

const ABI = ABIManager(ERC721ABI as IABI)
const ERC721TransferEventSignature = ABI.getEntryByName('Transfer').signature

const startFromBlock = +(process.env.ERC721_FROM_BLOCK || 0) || 0

let newContractCounter = 0


const ERC721Processor = new EvmBatchProcessor()
    .setDataSource({
        // squid public archives
        // https://docs.subsquid.io/evm-indexing/supported-networks/
        archive: lookupArchive('eth-mainnet')
    })
    .setBlockRange({ from: startFromBlock })
    .addLog([], {
        filter: [
            // topic0: 'Transfer(address,address,uint256)'
            [ERC721TransferEventSignature],
            [],
            []
        ],
        data: {
            evmLog: { id: true, data: true, topics: true },
            transaction: { hash: true, value: true }
        } as const
    })


const processERC721ContractJobs = new Map()

// @ts-ignore
const processERC721Contract = async (ctx, block, log) => {
    const { address } = log
    if (processedContracts.get(address)) {
        return
    }

    const alreadyProcessing = processERC721ContractJobs.get(address)
    if (alreadyProcessing) {
        return alreadyProcessing
    }

    const job = new Promise(async (resolve, reject) => {

        try {
            const contractFromStorage = '' // await ctx.store.get(Contract, address)

            if (contractFromStorage) {
                processedContracts.set(address, true)
                resolve(false)
                return
            }

            // todo retries
            const byteCode = await withRetry(() => ABI.getByteCode(address))

            if (!ABI.hasAllSignatures(expectedMethodsAndEvents, byteCode)) {
                // erc721 is not implemented
                filteredContracts.set(address, true)
                resolve(false)
                return
            }

            // todo multicall
            // todo validate fields?
            const name = 'TODO' //await ABI.call('name', [], address)
            const symbol = 'TODO' //await ABI.call('symbol', [], address)
            // l.debug(`new ERC721 found: ${name} ${symbol} ${address}`)

            const c = new Contract({
                id: address,
                // name,
                // symbol
            })

            await processContracts(ctx, [c])
            // await ctx.store.save(c)
        } catch (e) {
            // likely not implemented ERC721
            // could also be an RPC network error. todo
            filteredContracts.set(address, true)
            console.log(e)
            l.error('Error ' + JSON.stringify(e))
            resolve(false)
            return
        }

        processedContracts.set(address, true)
        newContractCounter++
        resolve(true)
    }).finally(() => {
        processERC721ContractJobs.delete(address)
    })

    processERC721ContractJobs.set(address, job)

    return job
}

export const run = async () => {
    l.info('starting')
    ERC721Processor.run(storage, async (ctx) => {
        const transfers: Transfer[] = []
        const holdersMap = new Map()

        newContractCounter = 0
        // ctx.blocks.length = 11

        for (const block of ctx.blocks) {
            for (const item of block.items) {

                // https://docs.subsquid.io/evm-indexing/context-interfaces/#evmlog-items
                if (item.kind !== 'evmLog') continue

                const address = item.address.toLowerCase()

                if (filteredContracts.get(address)) {
                    continue
                }

                const log = item.evmLog

                // console.log({item})
                const [topic0, ...topics] = log.topics

                let decodeLog

                try {
                    decodeLog = ABI.decodeLog(ERC721TransferEventSignature, log.data, topics)
                } catch (e) {
                    // likely erc20 Transfer, topic sig is the same, but "value | tokenId" field
                    // of event params is set as NOT indexed
                    // ctx.log.debug(`Failed to parse Transfer log for ${item.address}, skipping`)
                    filteredContracts.set(address, true)
                    continue
                }

                await processERC721Contract(ctx, block, log)

                if (filteredContracts.get(address)) {
                    continue
                }

                const from = decodeLog.from.toLowerCase()
                const to = decodeLog.from.toLowerCase()

                transfers.push(new Transfer({
                    id: log.id,
                    from,
                    to,
                    // @ts-ignore
                    tokenId: decodeLog.tokenId,
                    blockNumber: BigInt(block.header.height),
                    blockHash: block.header.hash,
                    transactionHash: item.transaction.hash,
                    contract: address,
                    timestamp: BigInt(block.header.timestamp),
                    // set to string
                    sentETHValue: item.transaction.value
                }))

                holdersMap.set(from, address)
                holdersMap.set(to, address)
            }
        }

        const holders: Holder[] = []
        holdersMap.forEach((contract, holder) => {
            holders.push(new Holder({
                id: holder,
                contract
            }))
        })

        // todo to db index
        await processHolders(ctx, holders)
        await processTransfers(ctx, transfers)
        //await ctx.store.save(transfers)
        //await ctx.store.save(holders)

        const startBlock = ctx.blocks.at(0)?.header.height || 0
        const endBlock = ctx.blocks.at(-1)?.header.height || 0
        const blocksCount = endBlock - startBlock
        ctx.log.info(`${newContractCounter} new ERC721, ${transfers.length} transfer events, ${holders.length} holder entries, ${blocksCount} blocks`)
    })
}

