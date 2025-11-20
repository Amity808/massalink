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

const recipientName = 'Alice';
const amount = Mas.fromString('1.5');

const args = new Args().addString(recipientName);

console.log(`Sending ${amount.toString()} MAS to ${recipientName}...`);
await contract.call('payToName', args, { coins: amount });
console.log(`Payment sent!`);

