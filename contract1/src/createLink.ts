import 'dotenv/config';
import {
    Account,
    Args,
    Mas,
    SmartContract,
    JsonRpcProvider,
    bytesToStr,
} from '@massalabs/massa-web3';

const CONTRACT_ADDR = 'AS1iRAcZ97umpfGvgSn4x8xsusZf9yd2UwNZmkwbMWUaB4XhEvUk';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);
const contract = new SmartContract(provider, CONTRACT_ADDR);

const description = 'Coffee payment';
const amount = BigInt(0);

const args = new Args().addString(description).addU64(amount);

console.log(`Creating payment link for: ${description}...`);
const storageFee = Mas.fromString('0.02');
await contract.call('createPaymentLink', args, { coins: storageFee });

console.log('Payment link created! Check events for link ID.');
console.log('You can also use: npm run getMyLinks to see all your links');

