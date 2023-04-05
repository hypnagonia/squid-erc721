import { run as ERC721Run } from './erc721/processor'
import { createLogger } from '@subsquid/logger'

// todo initiate scheme and api only for specific squid?
// pass database to use psql/csv
const l = createLogger('main')

l.info([
    process.env.DB_NAME,
    process.env.DB_PORT,
    process.env.GQL_PORT,
    process.env.DB_USER,
    // process.env.DB_PASS,
    process.env.DB_HOST,
].join(' '))

    ; (async function () {
        await ERC721Run()
    }())
