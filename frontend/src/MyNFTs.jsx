import { useEffect, useState } from 'react';
import { useTonWallet }        from '@tonconnect/ui-react';
import { checkWalletNfts, getMyMints } from './api.js';

export default function MyNFTs() {
    const wallet = useTonWallet();
    const [nfts, setNfts]   = useState([]);
    const [mints, setMints] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!wallet?.account?.address) return;
        setLoading(true);

        const addr = wallet.account.address;
        const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'dev-user';

        Promise.all([checkWalletNfts(addr), getMyMints(tgId)])
            .then(([nftData, mintData]) => {
                setNfts(nftData.nfts || []);
                setMints(mintData.items || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [wallet]);

    if (!wallet) return <p style={{ padding: 20 }}>Подключи кошелёк, чтобы увидеть свои NFT.</p>;
    if (loading) return <p style={{ padding: 20 }}>Загрузка…</p>;

    return (
        <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
            <h2>Мои заказы ({mints.length})</h2>
            {mints.length === 0 && <p>Пока нет заказов.</p>}

            {mints.map(m => (
                <div key={m.id} style={{
                    border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8
                }}>
                    <strong>Номер: {m.number}</strong>
                    <div style={{ fontSize: 12, color: m.status === 'confirmed' ? 'green' : '#888' }}>
                        Статус: {m.status}
                    </div>
                    {m.nftAddress && (
                        <a href={`https://getgems.io/nft/${m.nftAddress}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                            Открыть в GetGems →
                        </a>
                    )}
                </div>
            ))}

            <h2 style={{ marginTop: 24 }}>NFT в кошельке ({nfts.length})</h2>
            {nfts.length === 0 && <p>NFT в этом кошельке не найдены.</p>}

            {nfts.map((nft, i) => (
                <div key={i} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <strong>{nft.metadata?.name || `NFT #${nft.index}`}</strong>
                    <div style={{ fontSize: 12, color: '#666' }}>{nft.address}</div>
                </div>
            ))}
        </div>
    );
}
