import {TypeormDatabase} from '@subsquid/typeorm-store';
import {EvmBatchProcessor} from '@subsquid/evm-processor'
import {lookupArchive} from '@subsquid/archive-registry'
import {ABIManager} from '../utils/ABIManager'
import ERC721ABI from '../abi/ERC721ABI.json'
import {IABI} from '../types'
import LRU from 'lru-cache'
import {Transfer} from '../model';
import {createLogger} from '@subsquid/logger'
const l = createLogger('ERC721:processor')

const processedContracts = new LRU({max: 500 * 1000})
const filteredContracts = new LRU({max: 500 * 1000})

const ABI = ABIManager(ERC721ABI as IABI)

// todo we ignore safeTransferFrom event
const ERC721TransferEventSignature = ABI.getEntryByName('Transfer').signature

// todo read
// https://docs.subsquid.io/tutorials/parquet-file-store/#data-indexing

const storage = new TypeormDatabase()
const ERC721Processor = new EvmBatchProcessor()
    .setDataSource({
        // squid public archives
        // https://docs.subsquid.io/evm-indexing/supported-networks/
        archive: lookupArchive('eth-mainnet')
    }).addLog([], {
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

                transfers.push(new Transfer({
                    id: item.evmLog.id,
                    from: decodeLog.from.toLowerCase(),
                    to: decodeLog.to.toLowerCase(),
                    tokenId: BigInt(decodeLog.tokenId),
                    blockNumber: BigInt(block.header.height),
                    blockHash: block.header.hash,
                    transactionHash: item.transaction.hash,
                    contract: address.toLowerCase()
                }))

                if (processedContracts.get(address)) {
                    continue
                }

                // try to load
                // const r = await ctx.store.get(Transfer, '0000937821-000000-48b4a')
                // console.log(r)

                processedContracts.set(address, true)


            }
        }

        await ctx.store.save(transfers)
        const startBlock = ctx.blocks.at(0)?.header.height
        const endBlock = ctx.blocks.at(-1)?.header.height
        ctx.log.info(`ERC721 Transfers indexed from ${startBlock} to ${endBlock}`)
    })
}

