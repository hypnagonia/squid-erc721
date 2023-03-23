import {TypeormDatabase} from '@subsquid/typeorm-store';
import {EvmBatchProcessor} from '@subsquid/evm-processor'
import {lookupArchive} from '@subsquid/archive-registry'

import {ABIManager} from './ABIManager'
import ERC721ABI from './abi/ERC721ABI.json'
import {IABI} from './types'

export const ABI = ABIManager(ERC721ABI as IABI)

import assert from 'assert';
import {Burn} from './model';

// generated ABI is broken somehow
// import * as ERC721ABI from './abi/ERC721ABI'
// we also ignore safeTransferFrom event

const ERC721TransferEventSignature = ABI.getEntryByName('Transfer')?.signature || ''


const storage = new TypeormDatabase()
const processor = new EvmBatchProcessor()
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

function formatID(height: any, hash: string) {
    return `${String(height).padStart(10, '0')}-${hash}`
}

processor.run(storage, async (ctx) => {

    for (let block of ctx.blocks) {
        for (let item of block.items) {
            if (item.kind !== 'evmLog') continue

            const log = item.evmLog

            console.log({item})
            const [topic0, ...topics] = log.topics

            let decodeLog

            try {
                decodeLog = ABI.decodeLog(ERC721TransferEventSignature, log.data, topics)
            } catch (e) {
                // likely erc20 Transfer with same signature but not indexed value
                ctx.log.debug(`Failed to parse Transfer log for ${item.address}, skipping`)
                continue
            }
            console.log({decodeLog})

            // const data = ctx.blocks[0].items[0].evmLog.data
            // console.log({data})
            process.exit(0)
        }
    }

    /*
    const burns: Burn[] = []
    for (let c of ctx.blocks) {
      for (let i of c.items) {
        assert(i.kind == 'transaction')
        // decode and normalize the tx data
        burns.push(new Burn({
          id: formatID(c.header.height, i.transaction.hash),
          block: c.header.height,
          address: i.transaction.from,
          value: i.transaction.value,
          txHash: i.transaction.hash
        }))
      }
     }
     // apply vectorized transformations and aggregations
     const burned = burns.reduce((acc, b) => acc + b.value, 0n)/1_000_000_000n
     const startBlock = ctx.blocks.at(0)?.header.height
     const endBlock = ctx.blocks.at(-1)?.header.height
     ctx.log.info(`Burned ${burned} Gwei from ${startBlock} to ${endBlock}`)

     // upsert batches of entities with batch-optimized ctx.store.save
     await ctx.store.save(burns)

     */
});

