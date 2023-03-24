import {run as ERC721Run} from './erc721/processor'

// todo initiate scheme and api only for specific squid?
// pass database to use psql/csv
;(async function () {
    await ERC721Run()
}())
