const express = require('express');
const router = express.Router();

let prisma = null;
try { ({ prisma } = require('../db')); } catch {}

const { mintNft } = require('../services/mintOnChain');

// Помощник: превращает BigInt в обычные строки, чтобы JSON не ломался
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

function checkAdmin(req, res, next) {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ ok: false, error: 'forbidden', detail: 'Неверный пароль' });
    }
    next();
}

// 1. Статистика (с понятными названиями)
router.get('/stats', checkAdmin, async (req, res) => {
    try {
        const totalMints = await prisma.mint.count();
        const confirmedMints = await prisma.mint.count({ where: { status: 'confirmed' } });
        const totalUsers = await prisma.mint.groupBy({ by: ['walletAddress'] });
        
        const allWithdrawals = await prisma.withdrawal.findMany({ where: { status: 'sent' } });
        const totalPaidNano = allWithdrawals.reduce((sum, w) => sum + BigInt(w.amountNano), 0n);

        res.json({
            ok: true,
            stats: {
                "Всего попыток (включая неоплаченные)": totalMints,
                "УСПЕШНО СМИЧЕННЫХ НОМЕРОВ": confirmedMints,
                "Уникальных кошельков-покупателей": totalUsers.length,
                "Выплачено по рефералке (TON)": Number(totalPaidNano) / 1e9
            }
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// 2. Минт (с фиксом BigInt)
router.post('/custom-mint', checkAdmin, async (req, res) => {
    try {
        const { walletAddress, number } = req.body;
        if (!walletAddress || !number) {
            return res.status(400).json({ ok: false, error: 'Нужен кошелек и номер' });
        }

        console.log(`[ADMIN MINT] Запуск минта для номера ${number}`);

        const backendUrl = process.env.BACKEND_PUBLIC_URL || 'https://api.mintsim.uk';
        const metaUri = `${backendUrl}/api/mint/meta/${number}`;

        // Вызываем блокчейн
        const blockchainResult = await mintNft({ 
            ownerAddress: walletAddress, 
            metaUri: metaUri 
        });

        console.log('[ADMIN MINT] Блокчейн подтвердил минт:', safeJson(blockchainResult));

        // Записываем в базу
        const rec = await prisma.mint.create({
            data: {
                tgId: 'admin',
                walletAddress,
                number: String(number),
                comment: 'admin-mint-' + Date.now(),
                amountNano: '0', 
                status: 'confirmed',
                nftIndex: blockchainResult.index !== undefined ? String(blockchainResult.index) : null,
                nftAddress: blockchainResult.nftAddress || null
            }
        });

        // Отдаем ответ, пропустив blockchainResult через safeJson
        res.json({ 
            ok: true, 
            message: `✅ Номер ${number} успешно отправлен в блокчейн!`, 
            blockchain: safeJson(blockchainResult),
            record: rec 
        });

    } catch (e) {
        console.error('[ADMIN MINT] ОШИБКА:', e.message);
        res.status(500).json({ ok: false, error: 'blockchain_error', detail: e.message });
    }
});

module.exports = router;