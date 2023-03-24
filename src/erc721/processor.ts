import {EvmBatchProcessor} from '@subsquid/evm-processor'
import {lookupArchive} from '@subsquid/archive-registry'
import {ABIManager} from '../utils/ABIManager'
import ERC721ABI from '../abis/ERC721ABI.json'
import {IABI} from '../types'
import LRU from 'lru-cache'
import {Transfer, Contract} from '../model';
import {createLogger} from '@subsquid/logger'
import {storage} from '../storage'
import {expectedMethodsAndEvents} from './erc721'

const l = createLogger('ERC721:processor')

const processedContracts = new LRU({max: 500 * 1000})
const filteredContracts = new LRU({max: 500 * 1000})

const ABI = ABIManager(ERC721ABI as IABI)
const ERC721TransferEventSignature = ABI.getEntryByName('Transfer').signature

const ERC721Processor = new EvmBatchProcessor()
    .setDataSource({
        // squid public archives
        // https://docs.subsquid.io/evm-indexing/supported-networks/
        archive: lookupArchive('eth-mainnet')
    })
    .setBlockRange({from: 5099649})
    .addLog([], {
        filter: [
            // topic0: 'Transfer(address,address,uint256)'
            [ERC721TransferEventSignature],
            [],
            []
        ],
        data: {
            evmLog: {id: true, data: true, topics: true},
            transaction: {hash: true}
        } as const
    })


const processERC721ContractJobs = new Map()

// @ts-ignore
const processERC721Contract = async (ctx, block, log) => {
    const {address} = log
    if (processedContracts.get(address)) {
        return
    }

    const alreadyProcessing = processERC721ContractJobs.get(address)
    if (alreadyProcessing) {
        // l.info('already map' + processERC721ContractJobs.size)
        return alreadyProcessing
    }

    // l.info('new map ' + processERC721ContractJobs.size)

    const job = new Promise(async (resolve, reject) => {
        try {
            // check if already in storage but not in memory
            const contractFromStorage = await ctx.store.get(Contract, address)
            if (contractFromStorage) {
                processedContracts.set(address, true)
                resolve(true)
                return
            }

            const byteCode = await ABI.getByteCode(address)
            if (!ABI.hasAllSignatures(expectedMethodsAndEvents, byteCode)) {
                throw new Error('ERC721 not implemented')
            }

            // todo multicall
            // todo validate name?
            const name = 'TODO' //await ABI.call('name', [], address)
            const symbol = 'TODO' //await ABI.call('symbol', [], address)
            l.info(`new ERC721 found: ${name} ${symbol} ${address}`)

            const c = new Contract({
                id: address,
                name,
                symbol
            })

            await ctx.store.save(c)
        } catch (e) {
            // likely not implemented ERC721
            // could also be an RPC network error. todo
            filteredContracts.set(address, true)
            resolve(false)
            return
        }

        processedContracts.set(address, true)
        resolve(true)
    }).finally(() => {
        processERC721ContractJobs.delete(address)
    })

    processERC721ContractJobs.set(address, job)

    await job
}

/*
1 iterate through all Transfer events
2 when find a new contract address, check if it is a valid erc721 and get meta
*/
export const run = async () => {
    l.info('starting')
    ERC721Processor.run(storage, async (ctx) => {
        const transfers: Transfer[] = []

        for (const block of ctx.blocks) {
            for (const item of block.items) {

                // https://docs.subsquid.io/evm-indexing/context-interfaces/#evmlog-items
                if (item.kind !== 'evmLog') continue

                const address = item.address

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

                transfers.push(new Transfer({
                    id: log.id,
                    from: decodeLog.from.toLowerCase(),
                    to: decodeLog.to.toLowerCase(),
                    tokenId: BigInt(decodeLog.tokenId),
                    blockNumber: BigInt(block.header.height),
                    blockHash: block.header.hash,
                    transactionHash: item.transaction.hash,
                    contract: address.toLowerCase(),
                    timestamp: BigInt(block.header.timestamp)
                }))
            }
        }

        await ctx.store.save(transfers)
        // const startBlock = ctx.blocks.at(0)?.header.height
        // const endBlock = ctx.blocks.at(-1)?.header.height
        // ctx.log.info(`ERC721 Transfers indexed from ${startBlock} to ${endBlock}`)
    })
}

