const express = require('express');
const crypto   = require('crypto');
const router   = express.Router();

const { generateNumber } = require('../utils/generateNumber');

let prisma = null;
try { ({ prisma } = require('../db')); } catch {}

function toDetail(e) {
    const ax = e?.response?.data;
    if (typeof ax === 'string') return ax;
    if (ax?.detail)  return ax.detail;
    if (ax?.message) return ax.message;
    if (ax)           return JSON.stringify(ax);
    return e?.message || String(e);
}

// ─── POST /api/mint/order ──────────────────────────────────────────────────
// Creates a pending order. The frontend must then send a PLAIN TON transfer
// of exactly `amountNano` nanoTON, with `comment` as the text comment,
// to `collectionAddress`. The backend watches for that payment and mints
// automatically once it's confirmed — see jobs/PaymentWatcher.js.
router.post('/order', async (req, res) => {
    try {
        const tgId = req.headers['x-tg-id'] || 'web-user';
        const { walletAddress } = req.body || {};

        if (!walletAddress) {
            return res.status(400).json({ ok: false, error: 'bad_request', detail: 'walletAddress required' });
        }

        const needEnv = ['GETGEMS_COLLECTION', 'MINT_PRICE_TON', 'TON_NETWORK'];
        const missing = needEnv.filter(k => !process.env[k]);
        if (missing.length) {
            return res.status(500).json({ ok: false, error: 'config', detail: `Missing ENV: ${missing.join(', ')}` });
        }

        if (!prisma?.mint?.create) {
            return res.status(500).json({ ok: false, error: 'config', detail: 'Database not available' });
        }

        const priceTon    = Number(process.env.MINT_PRICE_TON);
        const amountNano  = String(Math.round(priceTon * 1e9));
        const number      = generateNumber(9);                         // looks like a phone number
        const comment      = 'mint-' + crypto.randomBytes(4).toString('hex');

        const rec = await prisma.mint.create({
            data: {
                tgId: String(tgId),
                walletAddress,
                number,
                comment,
                amountNano,
                status: 'awaiting_payment',
            }
        });

        return res.json({
            ok: true,
            orderId: rec.id,
            number,
            comment,
            amountNano,
            amountTon: priceTon,
            collectionAddress: process.env.GETGEMS_COLLECTION,
        });

    } catch (e) {
        console.error('ORDER ERROR:', e);
        return res.status(500).json({ ok: false, error: 'internal', detail: toDetail(e) });
    }
});

// ─── GET /api/mint/order/:id ────────────────────────────────────────────────
// Frontend polls this to know when payment was detected and the NFT minted.
router.get('/order/:id', async (req, res) => {
    try {
        if (!prisma?.mint?.findUnique) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }
        const rec = await prisma.mint.findUnique({ where: { id: req.params.id } });
        if (!rec) return res.status(404).json({ ok: false, error: 'not_found' });
        return res.json({ ok: true, order: rec });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'internal', detail: toDetail(e) });
    }
});

// ─── GET /api/mint/my ───────────────────────────────────────────────────────
router.get('/my', async (req, res) => {
    try {
        const tgId = req.headers['x-tg-id'];
        if (!tgId) return res.status(401).json({ ok: false, error: 'bad_request', detail: 'x-tg-id required' });
        if (!prisma?.mint?.findMany) return res.json({ ok: true, items: [] });

        const items = await prisma.mint.findMany({
            where: { tgId: String(tgId) },
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ ok: true, items });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'internal', detail: toDetail(e) });
    }
});

// ─── GET /api/mint/meta/:number  (fallback TEP-64 metadata, pre-Pinata) ────
router.get('/meta/:number', (req, res) => {
    const number = req.params.number;
    const backendUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000';
    res.json({
        name: `Number ${number}`,
        description: 'Anonymous number NFT',
        image: `${backendUrl}/images/${number}.png`,
        attributes: [{ trait_type: 'number', value: number }]
    });
});

module.exports = router;
