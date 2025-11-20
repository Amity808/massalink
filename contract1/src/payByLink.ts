import 'dotenv/config';
import {
    Account,
    Args,
    Mas,
    SmartContract,
    JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDR = 'AS1iRAcZ97umpfGvgSn4x8xsusZf9yd2UwNZmkwbMWUaB4XhEvUk';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);
const contract = new SmartContract(provider, CONTRACT_ADDR);

const linkId = '0';
const amount = Mas.fromString('2.0');

const args = new Args().addString(linkId);

console.log(`Sending ${amount.toString()} MAS using link ${linkId}...`);
await contract.call('payToLink', args, { coins: amount });
console.log(`Payment sent!`);

