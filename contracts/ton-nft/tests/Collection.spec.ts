import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, toNano }                              from '@ton/core';
import { Collection }                                     from '../build/Collection/Collection_Collection';
import '@ton/test-utils';

describe('Collection', () => {
    let blockchain:  Blockchain;
    let deployer:    SandboxContract<TreasuryContract>;
    let collection:  SandboxContract<Collection>;

    function makeContent(uri: string) {
        return beginCell().storeUint(0x01, 8).storeStringTail(uri).endCell();
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer   = await blockchain.treasury('deployer');

        const collectionContent = makeContent('https://example.com/collection.json');

        collection = blockchain.openContract(
            await Collection.fromInit(deployer.address, collectionContent)
        );

        const deployResult = await collection.send(
            deployer.getSender(),
            { value: toNano('0.15') },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address, to: collection.address, deploy: true, success: true,
        });
    });

    it('owner getter returns deployer', async () => {
        expect((await collection.getOwner()).toString()).toBe(deployer.address.toString());
    });

    it('nextItemIndex starts at 0', async () => {
        expect(await collection.getNextItemIndex()).toBe(0n);
    });

    it('accepts a plain comment payment without reverting', async () => {
        const buyer = await blockchain.treasury('buyer');

        const commentBody = beginCell()
            .storeUint(0, 32)                 // text comment opcode
            .storeStringTail('mint-abc123')
            .endCell();

        const result = await blockchain.sendMessage({
            info: {
                type: 'internal',
                ihrDisabled: true, bounce: true, bounced: false,
                src: buyer.address, dest: collection.address,
                value: { coins: toNano('5') },
                forwardFee: 0n, ihrFee: 0n, createdLt: 0n, createdAt: 0,
            },
            body: commentBody,
        } as any);

        expect(result.transactions).toHaveTransaction({
            to: collection.address, success: true,
        });
    });

    it('owner can mint and nextItemIndex increments', async () => {
        const recipient = await blockchain.treasury('recipient');
        const content    = makeContent('https://example.com/meta/0.json');

        const result = await collection.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            { $$type: 'Mint', queryId: 1n, index: 0n, owner: recipient.address, content }
        );

        expect(result.transactions).toHaveTransaction({
            from: deployer.address, to: collection.address, success: true,
        });
        expect(await collection.getNextItemIndex()).toBe(1n);
    });

    it('non-owner cannot mint', async () => {
        const attacker = await blockchain.treasury('attacker');
        const content   = makeContent('https://evil.com/meta/0.json');

        const result = await collection.send(
            attacker.getSender(),
            { value: toNano('0.1') },
            { $$type: 'Mint', queryId: 1n, index: 0n, owner: attacker.address, content }
        );

        expect(result.transactions).toHaveTransaction({
            from: attacker.address, to: collection.address, success: false,
        });
        expect(await collection.getNextItemIndex()).toBe(0n);
    });

    it('mint with wrong index is rejected', async () => {
        const recipient = await blockchain.treasury('recipient');
        const content    = makeContent('https://example.com/meta/5.json');

        const result = await collection.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            { $$type: 'Mint', queryId: 1n, index: 5n, owner: recipient.address, content } // should be 0
        );

        expect(result.transactions).toHaveTransaction({
            from: deployer.address, to: collection.address, success: false,
        });
    });
});
