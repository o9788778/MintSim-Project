// Reads message opcodes straight from the compiled Tact ABI so we never
// have to hand-copy "magic numbers" into .env files.
//
// SETUP (one-time, after every contract rebuild):
//   1. cd contracts/ton-nft && npx blueprint build
//   2. cp build/Collection/Collection_Collection.abi backend/abi/Collection.abi.json
//
// If this file is missing, or the Tact compiler's ABI shape doesn't match
// what we expect below, set MINT_OPCODE explicitly in backend/.env as a
// fallback (open the copied .abi.json, search for "Mint", and copy the
// numeric "header" value).

const fs   = require('fs');
const path = require('path');

let cache = null;

function loadAbi() {
    if (cache) return cache;
    const abiPath = path.resolve(__dirname, '..', '..', 'abi', 'Collection.abi.json');
    if (!fs.existsSync(abiPath)) {
        throw new Error(
            'Missing backend/abi/Collection.abi.json. After `npx blueprint build` in ' +
            'contracts/ton-nft, copy build/Collection/Collection_Collection.abi to that path. ' +
            'Or set MINT_OPCODE manually in backend/.env.'
        );
    }
    cache = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return cache;
}

function getOpcode(messageName) {
    // Manual override always wins — useful if the ABI shape ever changes.
    if (process.env.MINT_OPCODE && messageName === 'Mint') {
        return Number(process.env.MINT_OPCODE);
    }

    const abi = loadAbi();
    const type = (abi.types || []).find(t => t.name === messageName);
    if (!type || type.header == null) {
        throw new Error(
            `Could not find opcode for "${messageName}" in Collection.abi.json. ` +
            `Open the file, search for "${messageName}", and set MINT_OPCODE in .env manually.`
        );
    }
    return type.header;
}

module.exports = { getOpcode };
