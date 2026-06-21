import {
    TonConnectUIProvider,
    TonConnectButton,
    useTonWallet,
    useTonConnectUI
} from '@tonconnect/ui-react';

import { beginCell } from '@ton/core';
import { useState, useRef } from 'react';
import { createOrder, getOrderStatus } from './api.js';

const MANIFEST_URL = import.meta.env.VITE_MANIFEST_URL ||
    'https://CHANGE-ME.vercel.app/tonconnect-manifest.json';

const PRICE_LABEL = `${import.meta.env.VITE_MINT_PRICE_TON || 5} Gram (TON)`;

// ─── Build a plain "comment" payload — no opcode needed, the contract
//     just needs to accept the transfer; the backend reads the comment
//     via TonAPI to match it to the order. ──────────────────────────────────
function buildCommentPayload(comment) {
    return beginCell()
        .storeUint(0, 32)            // text-comment opcode
        .storeStringTail(comment)
        .endCell()
        .toBoc()
        .toString('base64');
}

function InnerApp() {
    const wallet         = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    const [status, setStatus]   = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult]   = useState(null);
    const pollRef = useRef(null);

    function stopPolling() {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }

    async function mint() {
        if (!wallet) { alert('Сначала подключи кошелёк'); return; }
        setLoading(true);
        setStatus('Создаём заказ…');
        setResult(null);

        try {
            const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'dev-user';

            // Step 1 — backend creates a pending order
            const order = await createOrder({ tgId, walletAddress: wallet.account.address });

            // Step 2 — send a plain payment with the order's comment
            setStatus(`Подтверди оплату ${order.amountTon} Gram (TON) в кошельке…`);
            const payload = buildCommentPayload(order.comment);

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 600,
                messages: [{
                    address: order.collectionAddress,
                    amount:  order.amountNano,
                    payload,
                }]
            });

            setStatus('Оплата отправлена. Ждём подтверждения сети и минт…');

            // Step 3 — poll backend until status becomes "confirmed"
            pollRef.current = setInterval(async () => {
                try {
                    const { order: o } = await getOrderStatus(order.orderId);

                    if (o.status === 'paid') {
                        setStatus('Оплата найдена в блокчейне. Загружаем метаданные и минтим NFT…');
                    } else if (o.status === 'confirmed') {
                        stopPolling();
                        setLoading(false);
                        setStatus('✅ Готово!');
                        setResult(o);
                    } else if (o.status === 'mint_failed') {
                        stopPolling();
                        setLoading(false);
                        setStatus('❌ Минт не удался. Напиши в поддержку — оплата сохранена в заказе.');
                    }
                } catch (e) {
                    console.error('poll error:', e);
                }
            }, 4000);

        } catch (e) {
            console.error('MINT ERROR:', e);
            setStatus('❌ ' + (e.message || 'Неизвестная ошибка'));
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
            <h1 style={{ fontSize: 24 }}>Mint your number NFT</h1>
            <p style={{ color: '#666' }}>Цена минта: {PRICE_LABEL}</p>

            <TonConnectButton />
            <br />

            <button
                onClick={mint}
                disabled={loading || !wallet}
                style={{
                    marginTop: 16, padding: '12px 24px', fontSize: 16,
                    background: wallet ? '#0088cc' : '#ccc', color: '#fff',
                    border: 'none', borderRadius: 8,
                    cursor: wallet && !loading ? 'pointer' : 'not-allowed',
                }}
            >
                {loading ? 'Обработка…' : `Mint NFT (${PRICE_LABEL})`}
            </button>

            {status && <p style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{status}</p>}

            {result && (
                <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
                    <strong>Номер: {result.number}</strong>
                    <div>NFT адрес: {result.nftAddress}</div>
                    <a
                        href={`https://getgems.io/nft/${result.nftAddress}`}
                        target="_blank" rel="noreferrer"
                    >
                        Открыть в GetGems →
                    </a>
                </div>
            )}
        </div>
    );
}

export default function App() {
    return (
        <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
            <InnerApp />
        </TonConnectUIProvider>
    );
}
