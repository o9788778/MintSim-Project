import { Address } from "@ton/core";
import { Collection } from "../build/Collection/Collection_Collection";
import { NetworkProvider } from "@ton/blueprint";

export async function run(provider: NetworkProvider, args: string[]) {
    const collection = provider.open(
        Collection.fromAddress(Address.parse(args[0]))
    );

    console.log((await collection.getOwner()).toString());
}